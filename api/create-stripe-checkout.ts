import { createClient } from '@supabase/supabase-js';

/**
 * Vercel Serverless Function — Stripe Create Checkout Session (SERVER-SIDE)
 * URL: /api/create-stripe-checkout
 *
 * Substitui a criação de sessão do Stripe que antes era feita no NAVEGADOR
 * (lib/stripe.ts) usando a chave secreta lida de SITE_Config. Agora a chave
 * secreta NUNCA sai do servidor.
 *
 * Ordem de obtenção da chave (a primeira que existir vence):
 *   1. process.env.STRIPE_SECRET_KEY_LIVE / _TEST  (conforme STRIPE_MODE)
 *   2. process.env.STRIPE_SECRET_KEY               (chave única)
 *   3. SITE_Config via service_role                (compatível com o setup atual —
 *      funciona mesmo depois de fecharmos a leitura anônima de SITE_Config)
 *
 * Env vars no Vercel Dashboard:
 *   VITE_SUPABASE_URL          → URL do projeto Supabase
 *   SUPABASE_SERVICE_ROLE_KEY  → Service Role Key
 *   (opcional) STRIPE_SECRET_KEY_LIVE / STRIPE_SECRET_KEY_TEST / STRIPE_MODE
 */

const STRIPE_URL = 'https://api.stripe.com/v1';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Só deixa virar metadata o que tem forma de id do nosso banco — o corpo vem do navegador. */
const isUuid = (v: unknown): v is string => typeof v === 'string' && UUID_RE.test(v);

type StripeMode = 'live' | 'test';

async function resolveStripeKey(): Promise<string | null> {
  const mode: StripeMode = process.env.STRIPE_MODE === 'test' ? 'test' : 'live';

  // 1 & 2 — variáveis de ambiente (padrão recomendado)
  const envKey =
    (mode === 'test' ? process.env.STRIPE_SECRET_KEY_TEST : process.env.STRIPE_SECRET_KEY_LIVE) ||
    process.env.STRIPE_SECRET_KEY;
  if (envKey) return envKey;

  // 3 — fallback: SITE_Config lido com service_role (bypassa RLS, server-only)
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

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const {
    title,
    price,
    currency = 'brl',
    email,
    enrollmentId,
    orderId,
    leadId,
    courseId,
    paymentType,
    successUrl,
    origin: bodyOrigin,
  } = req.body || {};

  // Validação básica de entrada (o valor NUNCA vem do cliente para o Stripe sem checagem de tipo)
  const numericPrice = Number(price);
  if (!title || typeof title !== 'string' || title.length > 250) {
    return res.status(400).json({ success: false, error: 'Título inválido.' });
  }
  if (!Number.isFinite(numericPrice) || numericPrice <= 0 || numericPrice > 1_000_000) {
    return res.status(400).json({ success: false, error: 'Valor inválido.' });
  }

  const origin =
    (typeof bodyOrigin === 'string' && /^https?:\/\//.test(bodyOrigin) ? bodyOrigin : '') ||
    (req.headers?.origin as string) ||
    'https://site.w-techbrasil.com.br';

  try {
    const apiKey = await resolveStripeKey();
    if (!apiKey) {
      console.error('[Stripe Checkout] Chave do Stripe não configurada.');
      return res.status(500).json({ success: false, error: 'Stripe não configurado.' });
    }

    const unitAmount = Math.round(numericPrice * 100);

    const params = new URLSearchParams();
    params.append('payment_method_types[]', 'card');
    params.append('line_items[0][price_data][currency]', String(currency).toLowerCase());
    params.append('line_items[0][price_data][product_data][name]', title);
    params.append('line_items[0][price_data][unit_amount]', unitAmount.toString());
    params.append('line_items[0][quantity]', '1');
    params.append('mode', 'payment');

    // Mesma lógica de success/cancel do antigo lib/stripe.ts (comportamento preservado)
    let finalSuccessUrl: string;
    if (successUrl) {
      finalSuccessUrl = successUrl;
    } else if (orderId) {
      finalSuccessUrl = `${origin}/pagamento-sucesso?session_id={CHECKOUT_SESSION_ID}&oid=${orderId}`;
    } else {
      finalSuccessUrl = `${origin}/pagamento-sucesso?session_id={CHECKOUT_SESSION_ID}${enrollmentId ? `&eid=${enrollmentId}` : ''}`;
    }

    params.append('success_url', finalSuccessUrl);
    params.append('cancel_url', `${origin}/admin/dashboard?payment=cancel`);
    if (email) params.append('customer_email', email);
    if (enrollmentId) params.append('metadata[enrollmentId]', enrollmentId);
    if (orderId) params.append('metadata[orderId]', orderId);

    // Fluxo sem inscrição prévia (/checkout-lisboa): o webhook usa o leadId para
    // criar/confirmar a inscrição. Sessão sem NENHUMA metadata é recebida, validada
    // e ignorada pelo webhook — o pagamento entra no Stripe e some do sistema.
    if (isUuid(leadId)) params.append('metadata[leadId]', leadId);
    if (isUuid(courseId)) params.append('metadata[courseId]', courseId);
    if (paymentType === 'deposit' || paymentType === 'full') {
      params.append('metadata[paymentType]', paymentType);
    }

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
