import { createClient } from '@supabase/supabase-js';
import {
  canonicalTrustedOrigins,
  createIpRateLimiter,
  denyForbidden,
  getServiceClient,
  isPermissionGranted,
  normalizeOriginEntry,
  requireExplicitTrustedOrigin,
  requireStaffSession,
} from './_auth.js';
import { requireStaffOrS2SPermission } from './_s2s.js';
import { LISBOA_COURSE_ID, LISBOA_CURRENCY, LISBOA_DEPOSIT_PRICE, LISBOA_FULL_PRICE } from '../lib/lisboaOffer.js';
import { PAYMENT_LINK_PERMISSIONS } from '../lib/permissions.js';

/**
 * Vercel Serverless Function — Stripe Create Checkout Session (SERVER-SIDE)
 * URL: /api/create-stripe-checkout
 *
 * Substitui a criação de sessão do Stripe que antes era feita no NAVEGADOR
 * (lib/stripe.ts) usando a chave secreta lida de SITE_Config. Agora a chave
 * secreta NUNCA sai do servidor.
 *
 * Três caminhos distintos (cada um com seu próprio limite do que confia do
 * body):
 *   1. PÚBLICO (sem cookie de staff, sem header S2S) — só as duas ofertas
 *      fixas reconhecidas por formato de payload, nunca por título/preço
 *      vindos do body:
 *      1a. CheckoutLisboa (courseId fixo b88e8979-..., SEM enrollmentId/
 *          orderId, paymentType 'deposit'|'full'). title/price/currency
 *          vêm de PUBLIC_OFFER_B88 (lib/lisboaOffer.ts); email vem do
 *          SITE_Leads.leadId informado (nunca do body).
 *      1b. WTechLisboa (enrollmentId presente, SEM courseId/orderId no
 *          body — a página não manda courseId). A inscrição
 *          (SITE_Enrollments) precisa existir, ter course_id=b4a2f0be-...,
 *          status Pending, amount_paid=0 e payment_method=Stripe — só essa
 *          combinação identifica com segurança "é a matrícula pública
 *          recém-criada", distinguindo de um checkout admin negociado sobre
 *          a mesma inscrição (que passa por staff/S2S, não por aqui).
 *          title/price/currency vêm do SITE_Courses (autoritativo, ao vivo
 *          — não hardcoded, pois este curso não tem valor fixo replicado em
 *          nenhum módulo compartilhado); email/nome vêm da própria
 *          inscrição. Qualquer combinação fora desses dois formatos é
 *          REJEITADA (403).
 *   2. STAFF (cookie httpOnly válido) — valor negociado/dinâmico (pedidos,
 *      vendas manuais). Exige UMA das permissões de PAYMENT_LINK_PERMISSIONS
 *      (`orders_payment_link` OU `financial_add_transaction`) E gate
 *      CSRF same-origin (é um POST vindo de browser).
 *   3. S2S (header x-wtech-svc + assinatura HMAC — wrapper `checkoutStripe`
 *      do ERP/Gestão) — mesmas permissões, mas
 *      autorizado por ator rehidratado (api/_s2s.ts), não por cookie. NÃO
 *      passa pelo gate CSRF (não é um browser — Origin/Sec-Fetch-Site não
 *      fazem sentido pra uma chamada servidor-a-servidor).
 *
 * Em qualquer caminho: `successUrl`/`origin` do body NUNCA são usados pra
 * montar o redirect — sempre construídos a partir da Origin validada da
 * própria requisição (ou de um default canônico fixo pro caminho S2S, que
 * não tem Origin de browser).
 *
 * Ordem de obtenção da chave Stripe (a primeira que existir vence):
 *   1. process.env.STRIPE_SECRET_KEY_LIVE / _TEST  (conforme STRIPE_MODE)
 *   2. process.env.STRIPE_SECRET_KEY               (chave única)
 *   3. SITE_Config via service_role                (compatível com o setup atual)
 */

const STRIPE_URL = 'https://api.stripe.com/v1';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (v: unknown): v is string => typeof v === 'string' && UUID_RE.test(v);

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const MAX_EMAIL_LENGTH = 254;
/** Formato + limite — nunca repassa uma string arbitrária pro Stripe como customer_email. */
const isValidEmailInput = (v: unknown): v is string =>
  typeof v === 'string' && v.length <= MAX_EMAIL_LENGTH && EMAIL_RE.test(v);

// Rate limit por IP (hash), independente de modo — defesa básica contra
// varredura/abuso de criação de sessão (a rota fica pública em modo 1).
const checkoutRateLimiter = createIpRateLimiter({ windowMs: 60_000, maxAttempts: 30 });

// ─── Oferta pública autoritativa (CheckoutLisboa) ───────────────────────────
// Preço/courseId vêm de lib/lisboaOffer.ts — mesma fonte que a página usa
// pra EXIBIR o preço, nunca reintroduzir o número duplicado aqui.
const PUBLIC_COURSE_ID = LISBOA_COURSE_ID;
const PUBLIC_OFFER_B88: Record<string, { amount: number; currency: string; title: string }> = {
  deposit: { amount: LISBOA_DEPOSIT_PRICE, currency: LISBOA_CURRENCY, title: 'W-Tech Lisboa 2026 — Sinal (Depósito)' },
  full: { amount: LISBOA_FULL_PRICE, currency: LISBOA_CURRENCY, title: 'W-Tech Lisboa 2026 — Matrícula Completa' },
};

// Curso "W-Tech Europa Lisboa 2026" (WTechLisboa) — preço/currency/title são
// autoritativos no SITE_Courses (não hardcoded aqui, ao contrário da oferta
// b88 acima), só o ID do curso precisa ser fixo pra validar a inscrição.
const WTECH_LISBOA_COURSE_ID = 'b4a2f0be-2c70-44ce-b2ba-06773e89a0b8';

// Moedas aceitas quando o valor é negociado/dinâmico (staff/S2S) — nunca uma
// string arbitrária direto pro Stripe.
const ALLOWED_CURRENCIES = new Set(['brl', 'usd', 'eur']);

type StripeMode = 'live' | 'test';

async function resolveStripeKey(): Promise<string | null> {
  const mode: StripeMode = process.env.STRIPE_MODE === 'test' ? 'test' : 'live';

  const envKey =
    (mode === 'test' ? process.env.STRIPE_SECRET_KEY_TEST : process.env.STRIPE_SECRET_KEY_LIVE) ||
    process.env.STRIPE_SECRET_KEY;
  if (envKey) return envKey;

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) return null;

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const { data } = await supabase
    .from('SITE_Config')
    .select('key, value')
    .in('key', ['stripe_mode', 'stripe_api_key_live', 'stripe_api_key_test', 'stripe_api_key']);

  const map = (data || []).reduce<Record<string, string>>((acc, row: any) => {
    if (row?.key) acc[row.key] = row.value;
    return acc;
  }, {});

  const cfgMode: StripeMode = map['stripe_mode'] === 'test' ? 'test' : 'live';
  const modeKey = cfgMode === 'test' ? map['stripe_api_key_test'] : map['stripe_api_key_live'];
  return modeKey || map['stripe_api_key'] || null;
}

/**
 * Origin confiável da própria requisição — nunca de req.body, nunca o header
 * cru. Normaliza (`normalizeOriginEntry`) e devolve APENAS se o resultado
 * bater contra a allowlist canônica — mesmo par normalização+allowlist usado
 * pra autorizar a requisição (`requireExplicitTrustedOrigin`), pra nunca
 * divergir em representação (barra final, etc.) e pra nunca redirecionar pra
 * um Origin tecnicamente válido mas não confiável caso algum caminho futuro
 * chame esta função sem ter validado o Origin antes. Sem Origin
 * validável (S2S, que não é browser) cai no default canônico fixo.
 */
function trustedRequestOrigin(req: any): string {
  const originHeader = String(req.headers?.origin || '').trim();
  if (originHeader) {
    const normalized = normalizeOriginEntry(originHeader);
    if (normalized && canonicalTrustedOrigins().has(normalized)) return normalized;
  }
  return 'https://w-techbrasil.com.br';
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  if (checkoutRateLimiter.isLimited(req)) {
    return res.status(429).json({ success: false, error: 'Muitas tentativas. Tente novamente em instantes.' });
  }

  const svcHeader = String(req.headers?.['x-wtech-svc'] || '');
  const isS2S = Boolean(svcHeader);

  // Gate de origem: só pra caminhos de browser (público ou staff). S2S não
  // tem Origin/Sec-Fetch-Site — é autorizado por assinatura HMAC, não por
  // isso. Checagem ESTRITA (requireExplicitTrustedOrigin, não
  // requireSameOrigin): esta rota fica pública em modo 1, sem cookie de
  // sessão como segunda camada, então não aceita o atalho de Sec-Fetch-Site
  // sozinho (forjável fora de um browser real) — exige Origin explícito na
  // allowlist canônica.
  if (!isS2S && !requireExplicitTrustedOrigin(req, res)) return;

  const {
    title: bodyTitle,
    price: bodyPrice,
    currency: bodyCurrency,
    email,
    enrollmentId,
    orderId,
    leadId,
    courseId,
    paymentType,
  } = req.body || {};

  // Identificadores (qualquer caminho) precisam ser UUID válido QUANDO
  // presentes — nunca usados em metadata/redirect sem essa checagem, e nunca
  // silenciosamente descartados se malformados (isso esconderia um erro do
  // caller atrás de um checkout "funcionando" sem o identificador esperado).
  if (enrollmentId !== undefined && enrollmentId !== null && !isUuid(enrollmentId)) {
    return res.status(400).json({ success: false, error: 'invalid_enrollment_id' });
  }
  if (orderId !== undefined && orderId !== null && !isUuid(orderId)) {
    return res.status(400).json({ success: false, error: 'invalid_order_id' });
  }
  if (leadId !== undefined && leadId !== null && !isUuid(leadId)) {
    return res.status(400).json({ success: false, error: 'invalid_lead_id' });
  }
  if (courseId !== undefined && courseId !== null && !isUuid(courseId)) {
    return res.status(400).json({ success: false, error: 'invalid_course_id' });
  }

  let resolvedTitle: string;
  let resolvedAmount: number;
  let resolvedCurrency: string;
  let resolvedEmail: string | undefined;
  // Metadata[courseId]/[leadId] efetivamente gravados — SEMPRE resolvidos
  // dentro de cada caminho (nunca o `courseId`/`leadId` cru do body
  // repassado direto), pra nunca deixar uma oferta pública com identidade
  // server-resolved (ex.: b4 por enrollmentId) aceitar um courseId/leadId
  // arbitrário do body só porque batia o formato UUID.
  let metadataCourseId: string | null = null;
  let metadataLeadId: string | null = null;
  // Só setado no ramo b88 (único com contrato de paymentType) — evita
  // repassar um `paymentType` cru do body em staff/S2S/b4, que não fazem
  // parte desse contrato.
  let metadataPaymentType: string | null = null;
  // Só setados no caminho público (b88/b4) — sobrepõem os padrões
  // genéricos de success/cancel mais abaixo, pra não deixar o pagamento
  // órfão (o webhook dessa oferta espera `/obrigado-lisboa?lid=...`) nem
  // mandar o cliente pra uma URL de admin que ele não acessa.
  let successUrlOverridePath: string | null = null;
  let cancelUrlOverridePath: string | null = null;

  if (isS2S) {
    // Caminho 3 — S2S (wrapper checkoutStripe do ERP): ator rehidratado,
    // mesma permissão do staff, valor negociado confiado (mesmo nível de
    // confiança que já existia pro staff autenticado).
    const actor = await requireStaffOrS2SPermission(req, res, PAYMENT_LINK_PERMISSIONS);
    if (!actor) return;

    const numericPrice = Number(bodyPrice);
    if (!bodyTitle || typeof bodyTitle !== 'string' || bodyTitle.length > 250) {
      return res.status(400).json({ success: false, error: 'Título inválido.' });
    }
    if (!Number.isFinite(numericPrice) || numericPrice <= 0 || numericPrice > 1_000_000) {
      return res.status(400).json({ success: false, error: 'Valor inválido.' });
    }
    const currencyInput = String(bodyCurrency || 'brl').toLowerCase();
    if (!ALLOWED_CURRENCIES.has(currencyInput)) {
      return res.status(400).json({ success: false, error: 'invalid_currency' });
    }
    if (email !== undefined && email !== null && email !== '' && !isValidEmailInput(email)) {
      return res.status(400).json({ success: false, error: 'invalid_email' });
    }
    resolvedTitle = bodyTitle;
    resolvedAmount = numericPrice;
    resolvedCurrency = currencyInput;
    resolvedEmail = isValidEmailInput(email) ? email : undefined;
    metadataCourseId = isUuid(courseId) ? courseId : null;
    metadataLeadId = isUuid(leadId) ? leadId : null;
    // S2S não tem browser/sessão admin pra voltar — destino canônico não
    // privilegiado, nunca um path de admin.
    cancelUrlOverridePath = '/?payment=cancel';
  } else {
    const staff = await requireStaffSession(req);
    if (staff) {
      // Caminho 2 — staff via cookie: valor negociado, exige a mesma permissão.
      if (!PAYMENT_LINK_PERMISSIONS.some((p) => isPermissionGranted(staff.permissions, p))) {
        return denyForbidden(res);
      }
      const numericPrice = Number(bodyPrice);
      if (!bodyTitle || typeof bodyTitle !== 'string' || bodyTitle.length > 250) {
        return res.status(400).json({ success: false, error: 'Título inválido.' });
      }
      if (!Number.isFinite(numericPrice) || numericPrice <= 0 || numericPrice > 1_000_000) {
        return res.status(400).json({ success: false, error: 'Valor inválido.' });
      }
      const currencyInput = String(bodyCurrency || 'brl').toLowerCase();
      if (!ALLOWED_CURRENCIES.has(currencyInput)) {
        return res.status(400).json({ success: false, error: 'invalid_currency' });
      }
      if (email !== undefined && email !== null && email !== '' && !isValidEmailInput(email)) {
        return res.status(400).json({ success: false, error: 'invalid_email' });
      }
      resolvedTitle = bodyTitle;
      resolvedAmount = numericPrice;
      resolvedCurrency = currencyInput;
      resolvedEmail = isValidEmailInput(email) ? email : undefined;
      metadataCourseId = isUuid(courseId) ? courseId : null;
      metadataLeadId = isUuid(leadId) ? leadId : null;
      // Staff: cancel volta pro dashboard admin (comportamento preservado).
    } else if (enrollmentId) {
      // Caminho 1b — público, oferta fixa "W-Tech Europa Lisboa 2026"
      // (WTechLisboa) por enrollmentId. Formato ESTRITO: a página não manda
      // orderId/courseId/leadId/paymentType — qualquer um presente (mesmo
      // que UUID válido) não é o formato da matrícula pública e é
      // rejeitado, nunca silenciosamente ignorado nem repassado adiante
      // (identidade/curso/preço deste caminho são 100% server-resolved a
      // partir da própria inscrição, nunca do body).
      if (orderId || courseId || leadId || paymentType) {
        return res.status(403).json({ success: false, error: 'checkout_offer_not_recognized' });
      }
      const supabase = getServiceClient();
      if (!supabase) {
        console.error('[Stripe Checkout] Supabase indisponível pra validar enrollmentId.');
        return res.status(503).json({ success: false, error: 'supabase_unavailable' });
      }
      const { data: enrollmentRow, error: enrollmentError } = await supabase
        .from('SITE_Enrollments')
        .select('id, course_id, status, amount_paid, payment_method, student_email, student_name')
        .eq('id', enrollmentId)
        .maybeSingle();
      if (enrollmentError || !enrollmentRow) {
        return res.status(400).json({ success: false, error: 'enrollment_not_found' });
      }
      // Só essa combinação identifica com segurança "é a matrícula pública
      // recém-criada, ainda não paga" — qualquer desvio (curso errado, já
      // paga, outro método) não é a oferta fixa e é rejeitado.
      const enrollment: any = enrollmentRow;
      if (
        enrollment.course_id !== WTECH_LISBOA_COURSE_ID ||
        enrollment.status !== 'Pending' ||
        Number(enrollment.amount_paid || 0) !== 0 ||
        enrollment.payment_method !== 'Stripe'
      ) {
        return res.status(403).json({ success: false, error: 'checkout_offer_not_available' });
      }

      const { data: courseRow, error: courseError } = await supabase
        .from('SITE_Courses')
        .select('price, currency, title')
        .eq('id', WTECH_LISBOA_COURSE_ID)
        .maybeSingle();
      const course: any = courseRow;
      const coursePrice = Number(course?.price);
      if (courseError || !course || !Number.isFinite(coursePrice) || coursePrice <= 0) {
        console.error('[Stripe Checkout] Curso W-Tech Europa Lisboa sem preço configurado no SITE_Courses.');
        return res.status(503).json({ success: false, error: 'course_unavailable' });
      }

      const coursePriceCurrency = String(course.currency || 'eur').toLowerCase();
      if (!ALLOWED_CURRENCIES.has(coursePriceCurrency)) {
        // Moeda cadastrada no SITE_Courses fora da allowlist — falha fechado
        // em vez de repassar uma string arbitrária pro Stripe (mesma regra
        // do valor negociado staff/S2S, aqui aplicada ao dado autoritativo).
        console.error(`[Stripe Checkout] Moeda inválida cadastrada pro curso W-Tech Europa Lisboa: ${coursePriceCurrency}`);
        return res.status(503).json({ success: false, error: 'course_currency_invalid' });
      }

      if (!isValidEmailInput(enrollment.student_email)) {
        // A inscrição já existe no banco, mas sem um e-mail válido pra
        // identificar o cliente no Stripe — mesmo padrão de rejeição
        // explícita usado em staff/S2S (nunca repassa string arbitrária/
        // vazia, nem segue em silêncio sem customer_email).
        console.error(`[Stripe Checkout] Inscrição ${enrollmentId} sem e-mail válido.`);
        return res.status(400).json({ success: false, error: 'invalid_enrollment_email' });
      }

      resolvedTitle = course.title || 'W-Tech Europa Lisboa 2026';
      resolvedAmount = coursePrice;
      resolvedCurrency = coursePriceCurrency;
      resolvedEmail = enrollment.student_email;
      // courseId de metadata SEMPRE de enrollment.course_id (canônico, já
      // validado == WTECH_LISBOA_COURSE_ID acima) — nunca do body, que este
      // caminho nem aceita mais (ver rejeição estrita logo acima).
      metadataCourseId = enrollment.course_id;
      successUrlOverridePath = `/obrigado-lisboa?eid=${encodeURIComponent(enrollmentId)}&session_id={CHECKOUT_SESSION_ID}`;
      cancelUrlOverridePath = '/wtech-lisboa';
    } else if (courseId === PUBLIC_COURSE_ID && !orderId) {
      // Caminho 1a — público, oferta fixa CheckoutLisboa (b88e8979). title/
      // price/currency/email do body são ignorados por completo a partir
      // daqui.
      const offer = PUBLIC_OFFER_B88[String(paymentType || '')];
      if (!offer) {
        return res.status(400).json({ success: false, error: 'invalid_payment_type' });
      }
      // A oferta pública precisa de um lead EXISTENTE/associável — sem isso o
      // webhook não tem a quem atribuir o pagamento e ele fica órfão. O
      // e-mail do cliente Stripe vem do LEAD (server-side), nunca do body.
      if (!isUuid(leadId)) {
        return res.status(400).json({ success: false, error: 'lead_required' });
      }
      const supabase = getServiceClient();
      if (!supabase) {
        console.error('[Stripe Checkout] Supabase indisponível pra validar leadId.');
        return res.status(503).json({ success: false, error: 'supabase_unavailable' });
      }
      const { data: leadRow, error: leadError } = await supabase
        .from('SITE_Leads')
        .select('id, email')
        .eq('id', leadId)
        .maybeSingle();
      if (leadError || !leadRow) {
        return res.status(400).json({ success: false, error: 'lead_not_found' });
      }
      if (!isValidEmailInput(leadRow.email)) {
        // Lead existe mas sem e-mail válido — mesmo padrão de rejeição
        // explícita da oferta b4 (nunca segue com customer_email vazio/
        // arbitrário só porque o lead foi encontrado).
        console.error(`[Stripe Checkout] Lead ${leadId} sem e-mail válido.`);
        return res.status(400).json({ success: false, error: 'invalid_lead_email' });
      }

      resolvedTitle = offer.title;
      resolvedAmount = offer.amount;
      resolvedCurrency = offer.currency;
      resolvedEmail = leadRow.email;
      // courseId/leadId de metadata SEMPRE server-resolved (PUBLIC_COURSE_ID
      // fixo e o leadId já validado/existente acima) — nunca o `courseId`
      // cru do body, ainda que aqui ele já tenha sido comparado === PUBLIC_COURSE_ID.
      metadataCourseId = PUBLIC_COURSE_ID;
      metadataLeadId = leadId;
      metadataPaymentType = paymentType;
      successUrlOverridePath =
        `/obrigado-lisboa?lid=${encodeURIComponent(leadId)}&session_id={CHECKOUT_SESSION_ID}&type=${encodeURIComponent(paymentType)}`;
      cancelUrlOverridePath =
        `/checkout-lisboa?lid=${encodeURIComponent(leadId)}&type=${encodeURIComponent(paymentType)}`;
    } else {
      return res.status(403).json({ success: false, error: 'checkout_offer_not_recognized' });
    }
  }

  const origin = trustedRequestOrigin(req);

  try {
    const apiKey = await resolveStripeKey();
    if (!apiKey) {
      console.error('[Stripe Checkout] Chave do Stripe não configurada.');
      return res.status(500).json({ success: false, error: 'Stripe não configurado.' });
    }

    const unitAmount = Math.round(resolvedAmount * 100);

    const params = new URLSearchParams();
    params.append('payment_method_types[]', 'card');
    params.append('line_items[0][price_data][currency]', resolvedCurrency);
    params.append('line_items[0][price_data][product_data][name]', resolvedTitle);
    params.append('line_items[0][price_data][unit_amount]', unitAmount.toString());
    params.append('line_items[0][quantity]', '1');
    params.append('mode', 'payment');

    // success/cancel SEMPRE construídos aqui — nunca a partir de
    // req.body.successUrl/origin (evita redirect pra domínio arbitrário).
    let finalSuccessUrl: string;
    if (successUrlOverridePath) {
      // Ofertas públicas (b88/b4) — destino fixo, resolvido no servidor (nunca do body).
      finalSuccessUrl = `${origin}${successUrlOverridePath}`;
    } else if (orderId) {
      finalSuccessUrl = `${origin}/pagamento-sucesso?session_id={CHECKOUT_SESSION_ID}&oid=${encodeURIComponent(orderId)}`;
    } else {
      finalSuccessUrl = `${origin}/pagamento-sucesso?session_id={CHECKOUT_SESSION_ID}${enrollmentId ? `&eid=${encodeURIComponent(enrollmentId)}` : ''}`;
    }
    // cancel: override por caminho quando definido (públicas voltam pra
    // página de origem, S2S vai pra um destino não privilegiado); staff cai
    // no default do dashboard admin (comportamento preservado).
    const finalCancelUrl = cancelUrlOverridePath
      ? `${origin}${cancelUrlOverridePath}`
      : `${origin}/admin/dashboard?payment=cancel`;

    params.append('success_url', finalSuccessUrl);
    params.append('cancel_url', finalCancelUrl);
    // customer_email vem SEMPRE de resolvedEmail (lead/inscrição/staff-input
    // já validado acima) — nunca do body bruto (`email`), que nos caminhos
    // públicos é ignorado de propósito.
    if (resolvedEmail) params.append('customer_email', resolvedEmail);
    if (enrollmentId) params.append('metadata[enrollmentId]', enrollmentId);
    if (orderId) params.append('metadata[orderId]', orderId);

    // Fluxo sem inscrição prévia (/checkout-lisboa): o webhook usa o leadId para
    // criar/confirmar a inscrição. Sessão sem NENHUMA metadata é recebida, validada
    // e ignorada pelo webhook — o pagamento entra no Stripe e some do sistema.
    // SEMPRE as variáveis metadata* resolvidas por caminho — nunca leadId/
    // courseId/paymentType crus do body (que nos caminhos públicos podem já
    // ter sido rejeitados, mas nunca devem vazar pra metadata mesmo assim).
    if (metadataLeadId) params.append('metadata[leadId]', metadataLeadId);
    if (metadataCourseId) params.append('metadata[courseId]', metadataCourseId);
    if (metadataPaymentType) params.append('metadata[paymentType]', metadataPaymentType);

    const stripeRes = await fetch(`${STRIPE_URL}/checkout/sessions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    });

    const data = await stripeRes.json();
    if (data.error) {
      console.error('[Stripe Checkout] Stripe error:', data.error?.type || 'unknown');
      return res.status(502).json({ success: false, error: data.error.message });
    }

    return res.status(200).json({ success: true, url: data.url, sessionId: data.id });
  } catch (err: any) {
    console.error('[Stripe Checkout] Falha:', err?.message);
    return res.status(500).json({ success: false, error: 'Falha ao gerar o pagamento.' });
  }
}
