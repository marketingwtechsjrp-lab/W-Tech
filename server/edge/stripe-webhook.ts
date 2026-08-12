import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import type { Request, Response } from 'express';
import { sendTemplate, alreadySent } from '../../api/_email.js';

/**
 * Rota Express — Webhook do Stripe (portada da Supabase Edge Function
 * `supabase/functions/stripe-webhook`). URL: /api/stripe-webhook
 *
 * ATENÇÃO: esta rota EXIGE o corpo RAW (Buffer) para validar a assinatura
 * (stripe.webhooks.constructEventAsync). No server/index.ts ela é registrada
 * com express.raw() ANTES do express.json().
 *
 * Conversões de runtime (lógica preservada 1:1):
 *   - Deno.env.get('X') → process.env.X
 *   - import de esm.sh   → pacote npm `stripe` (mesma major 11 / apiVersion)
 *   - Stripe.createFetchHttpClient() removido (era só p/ Deno; Node usa o
 *     http client padrão do SDK)
 *   - clientes criados sob demanda (lazy) p/ não crashar o boot sem envs
 */

let cachedSupabase: SupabaseClient | null = null;
function getSupabase(): SupabaseClient | null {
  if (cachedSupabase) return cachedSupabase;
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!url || !key) return null;
  cachedSupabase = createClient(url, key);
  return cachedSupabase;
}

/**
 * Credenciais do Stripe — env primeiro, SITE_Config depois (MESMA ordem de
 * api/create-stripe-checkout.ts). Antes daqui só se lia a env STRIPE_API_KEY: o
 * checkout funcionava pela SITE_Config e o webhook morria em 500, porque cada um
 * procurava a chave num lugar diferente.
 *
 * O fallback pela SITE_Config existe para o webhook poder ser configurado SEM
 * acesso ao VPS (o .env está no .dockerignore e nunca entra na imagem).
 * As duas chaves ficam protegidas de leitura anônima pela policy
 * `deny_anon_read_server_secrets` — ver migrations/2026-07-30_protect_stripe_webhook_secret.sql.
 */
interface StripeCreds {
  apiKey: string | null;
  webhookSecret: string | null;
}

async function loadStripeCreds(supabase: SupabaseClient | null): Promise<StripeCreds> {
  const mode = process.env.STRIPE_MODE === 'test' ? 'test' : 'live';
  const envKey =
    process.env.STRIPE_API_KEY ||
    (mode === 'test' ? process.env.STRIPE_SECRET_KEY_TEST : process.env.STRIPE_SECRET_KEY_LIVE) ||
    process.env.STRIPE_SECRET_KEY ||
    null;
  const envSecret = process.env.STRIPE_WEBHOOK_SECRET || null;

  // Só vai ao banco se algo estiver faltando — o caminho feliz (envs completas) não paga I/O.
  if ((envKey && envSecret) || !supabase) {
    return { apiKey: envKey, webhookSecret: envSecret };
  }

  const { data } = await supabase
    .from('SITE_Config')
    .select('key, value')
    .in('key', [
      'stripe_mode',
      'stripe_api_key_live',
      'stripe_api_key_test',
      'stripe_api_key',
      'stripe_webhook_secret',
    ]);

  const map = (data || []).reduce<Record<string, string>>((acc, row: any) => {
    if (row?.key) acc[row.key] = row.value;
    return acc;
  }, {});

  const cfgMode = map['stripe_mode'] === 'test' ? 'test' : 'live';
  const modeKey = cfgMode === 'test' ? map['stripe_api_key_test'] : map['stripe_api_key_live'];

  return {
    apiKey: envKey || modeKey || map['stripe_api_key'] || null,
    webhookSecret: envSecret || map['stripe_webhook_secret'] || null,
  };
}

let cachedStripe: Stripe | null = null;
function buildStripe(apiKey: string | null): Stripe | null {
  if (cachedStripe) return cachedStripe;
  if (!apiKey) return null;
  cachedStripe = new Stripe(apiKey, { apiVersion: '2022-11-15' });
  return cachedStripe;
}

/**
 * Fluxo "inscrição só depois do pagamento" (/checkout-lisboa): no checkout existe
 * apenas o lead — de propósito, para checkout abandonado não virar inscrição
 * fantasma ocupando vaga. A inscrição nasce AQUI, com o valor e a moeda que o
 * Stripe confirmou, nunca com um valor vindo da URL do navegador.
 *
 * Devolve o id da inscrição para o fluxo normal seguir igual, ou null se não der
 * para resolver (o pagamento então fica só no Stripe, e o log diz por quê).
 */
async function resolveEnrollmentFromLead(
  supabase: SupabaseClient,
  leadId: string,
  courseId: string | undefined,
  currency: string
): Promise<string | null> {
  if (!courseId) {
    console.error(`[Stripe Webhook] metadata.courseId ausente (lead ${leadId}) — inscrição não criada.`);
    return null;
  }

  const { data: lead } = await supabase
    .from('SITE_Leads')
    .select('id, name, email, phone, cpf')
    .eq('id', leadId)
    .maybeSingle();

  if (!lead) {
    console.error(`[Stripe Webhook] Lead ${leadId} não encontrado — inscrição não criada.`);
    return null;
  }

  const email = ((lead as any).email || '').trim().toLowerCase();

  // Dedupe: retentativa de pagamento (ou 2ª parcela) não pode gerar uma segunda
  // inscrição do mesmo aluno no mesmo curso. `_` e `%` escapados porque ilike
  // trata o valor como padrão, e e-mail pode conter os dois.
  if (email) {
    const { data: existing } = await supabase
      .from('SITE_Enrollments')
      .select('id')
      .eq('course_id', courseId)
      .ilike('student_email', email.replace(/[%_\\]/g, '\\$&'))
      .order('created_at', { ascending: false })
      .limit(1);

    if (existing?.[0]) return (existing[0] as any).id;
  }

  const { data: course } = await supabase
    .from('SITE_Courses')
    .select('price, currency')
    .eq('id', courseId)
    .maybeSingle();

  const { data: created, error } = await supabase
    .from('SITE_Enrollments')
    .insert([{
      course_id: courseId,
      student_name: (lead as any).name,
      student_email: email,
      student_phone: (lead as any).phone,
      student_cpf: (lead as any).cpf || null,
      // Nasce Pending/0 de propósito: quem confirma e soma é o fluxo abaixo,
      // com o valor real da sessão — mesmo caminho do checkout com inscrição prévia.
      status: 'Pending',
      amount_paid: 0,
      total_amount: (course as any)?.price ?? null,
      currency: ((course as any)?.currency || currency || 'BRL').toUpperCase(),
      payment_method: 'Stripe',
      enrolled_by_name: 'Automático',
    }])
    .select('id')
    .single();

  if (error || !created) {
    console.error('[Stripe Webhook] Falha ao criar inscrição a partir do lead:', error);
    return null;
  }

  console.log(`[Stripe Webhook] Inscrição ${(created as any).id} criada a partir do lead ${leadId}.`);
  return (created as any).id;
}

/** Corre um best-effort sem deixar o webhook pendurado (o Stripe expira em 20s). */
function withTimeout<T>(p: PromiseLike<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    Promise.resolve(p),
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`${label} excedeu ${ms}ms`)), ms)),
  ]);
}

export default async function stripeWebhookHandler(req: Request, res: Response) {
  const supabase = getSupabase();

  // Health check (GET) — mesmo padrão do /api/mercadopago-webhook, mas dizendo QUAL
  // peça de configuração falta (só booleanos, nenhum valor de segredo). Sem isso o
  // 500 do Stripe é cego: a resposta é a mesma para chave, segredo ou Supabase ausente.
  if (req.method === 'GET') {
    const creds = await loadStripeCreds(supabase);
    return res.status(200).json({
      status: 'Webhook endpoint online',
      config: {
        stripe_key: Boolean(creds.apiKey),
        webhook_secret: Boolean(creds.webhookSecret),
        supabase: Boolean(supabase),
      },
      ts: new Date().toISOString(),
    });
  }

  const signature = req.headers['stripe-signature'] as string | undefined;

  if (!signature) {
    return res.status(400).send('Missing signature');
  }

  const creds = await loadStripeCreds(supabase);
  const stripe = buildStripe(creds.apiKey);
  const endpointSecret = creds.webhookSecret;
  if (!stripe || !supabase || !endpointSecret) {
    const faltando = [
      !stripe && 'chave do Stripe (env STRIPE_API_KEY ou SITE_Config.stripe_api_key_live)',
      !endpointSecret && 'segredo do webhook (env STRIPE_WEBHOOK_SECRET ou SITE_Config.stripe_webhook_secret)',
      !supabase && 'envs SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY',
    ].filter(Boolean).join(' | ');
    console.error(`[Stripe Webhook] Configuração ausente → ${faltando}`);
    return res.status(500).send('System configuration error');
  }

  // req.body aqui é Buffer (express.raw) — obrigatório para a verificação HMAC.
  const body = req.body as Buffer;
  let event: Stripe.Event;

  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      endpointSecret,
      undefined
    );
  } catch (err: any) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed' || event.type === 'payment_intent.succeeded') {
    const session = event.data.object as any;
    let enrollmentId = session.metadata?.enrollmentId;
    const orderId = session.metadata?.orderId;
    const leadId = session.metadata?.leadId;
    const courseId = session.metadata?.courseId;

    // session.amount_total is in cents
    const amountPaidRaw = (session.amount_total || session.amount || 0) / 100;
    const currency = (session.currency || 'brl').toUpperCase();

    // Checkout que não cria inscrição antes de pagar manda o lead. Resolvido aqui,
    // o resto do fluxo é idêntico ao do checkout com inscrição prévia.
    if (!enrollmentId && !orderId && leadId) {
      enrollmentId = await resolveEnrollmentFromLead(supabase, leadId, courseId, currency);
    }

    // ── ENROLLMENT PAYMENT ────────────────────────────────────────────────
    if (enrollmentId) {
      console.log(`Processing ${currency} payment for enrollment ${enrollmentId}...`);

      const { data: enrollment, error: fetchError } = await supabase
        .from('SITE_Enrollments')
        .select('*')
        .eq('id', enrollmentId)
        .single();

      if (fetchError || !enrollment) {
        console.error('Enrollment not found', fetchError);
        return res.status(404).send('Enrollment not found');
      }

      // IDEMPOTÊNCIA: amount_paid é SOMADO, então a mesma sessão entregue duas vezes
      // (retry automático do Stripe ou "Reenviar" no dashboard) dobraria o valor pago.
      // O payment_id guarda a última sessão processada — se bater, não soma de novo.
      if (enrollment.payment_id === session.id) {
        console.log(`Enrollment ${enrollmentId} já processado para a sessão ${session.id} — ignorado.`);
        return res.status(200).json({ received: true, already_processed: true });
      }

      const newTotalPaid = (enrollment.amount_paid || 0) + amountPaidRaw;

      // A moeda da inscrição segue o CURSO — é nele que total_amount está denominado.
      // NÃO segue a moeda da sessão de propósito: o admin pode gerar link em outra
      // moeda via conversão, e isso não muda a moeda da matrícula. Sem este patch a
      // inscrição fica no default 'BRL' da coluna e Lisboa aparece como R$ no admin.
      const { data: courseCurrencyRow } = await supabase
        .from('SITE_Courses')
        .select('currency')
        .eq('id', enrollment.course_id)
        .maybeSingle();

      const courseCurrency = ((courseCurrencyRow as any)?.currency || '').toUpperCase();
      const currencyPatch =
        courseCurrency && courseCurrency !== (enrollment.currency || '').toUpperCase()
          ? { currency: courseCurrency }
          : {};

      const { error: updateError } = await supabase
        .from('SITE_Enrollments')
        .update({
          amount_paid: newTotalPaid,
          status: 'Confirmed',
          enrolled_by_name: 'Automático',
          payment_method: 'Stripe',
          payment_id: session.id,
          ...currencyPatch
        })
        .eq('id', enrollmentId);

      if (updateError) {
        console.error('Update enrollment error', updateError);
        return res.status(500).send('Update error');
      }

      // Also update lead status to 'Converted' (Approved/Won) in CRM
      if (enrollment.student_email) {
        try {
          const { data: existingLead } = await supabase
            .from('SITE_Leads')
            .select('id, tags')
            .eq('email', enrollment.student_email)
            .maybeSingle();

          const autoTags = ['checkout_automatico', 'sem_comissao', 'venda_stripe', 'checkout_direto'];
          const existingTags = existingLead?.tags || [];
          const mergedTags = Array.from(new Set([...existingTags, ...autoTags]));

          await supabase
            .from('SITE_Leads')
            .update({
              status: 'Converted',
              tags: mergedTags,
              conversion_value: newTotalPaid,
              conversion_summary: `Venda automática via Checkout Direto (Stripe). Curso: ${enrollment.course_id}. Sem atendimento humano.`,
              conversion_type: 'Course_Purchase',
              updated_at: new Date().toISOString()
            })
            .eq('email', enrollment.student_email);
          console.log(`Lead status updated to Converted for ${enrollment.student_email}`);
        } catch (leadErr) {
          console.error('Non-fatal: Error updating lead status in Stripe webhook:', leadErr);
        }
      }

      const { error: transError } = await supabase
        .from('SITE_Transactions')
        .insert([{
          description: `Pagamento Stripe: ${session.id.slice(-12)}`,
          amount: amountPaidRaw,
          type: 'Income',
          category: 'Sales',
          status: 'Completed',
          payment_method: 'Stripe',
          enrollment_id: enrollmentId,
          course_id: enrollment.course_id,
          currency: currency,
          date: new Date().toISOString()
        }]);

      if (transError) console.error('Transaction insert error', transError);

      // ── E-mail de confirmação ao aluno (transacional, não-fatal) ──────────
      // Mesmo template e variáveis do webhook do MP (api/mercadopago-webhook.ts),
      // para o aluno receber a mesma confirmação pagando por qualquer gateway.
      // alreadySent() consulta SITE_EmailLogs → reenvio do evento não duplica e-mail.
      if (enrollment.student_email && !(await alreadySent(enrollmentId, 'confirmacao_inscricao'))) {
        try {
          const { data: courseRow } = await withTimeout(
            supabase
              .from('SITE_Courses')
              .select('title, date, date_end, city, state, start_time, what_to_bring, whatsapp_group_link, currency')
              .eq('id', enrollment.course_id)
              .maybeSingle(),
            5000,
            'SELECT course (email)'
          );
          const course: any = courseRow || {};

          const { data: leadRow } = await withTimeout(
            supabase.from('SITE_Leads').select('client_code').eq('email', enrollment.student_email).maybeSingle(),
            5000,
            'SELECT client_code (email)'
          );
          const clientCode = (leadRow as any)?.client_code || '';

          const cur = (course.currency || currency || 'BRL').toUpperCase();
          const symbol = cur === 'EUR' ? '€' : cur === 'USD' ? '$' : 'R$';
          const fmt = (n: number) => Number(n || 0).toFixed(2).replace('.', ',');
          const fmtDate = (d?: string) => {
            if (!d) return '';
            const [y, m, day] = String(d).slice(0, 10).split('-');
            return `${day}/${m}/${y}`;
          };
          const dateStr = course.date
            ? (course.date_end && course.date_end !== course.date
                ? `${fmtDate(course.date)} a ${fmtDate(course.date_end)}`
                : fmtDate(course.date)) + (course.start_time ? ` · ${course.start_time}` : '')
            : 'A definir';
          const location = [course.city, course.state].filter(Boolean).join(', ') || 'A definir';
          const total = enrollment.total_amount || 0;
          const remaining = Math.max(0, total - newTotalPaid);
          const baseUrl = `https://${req.headers['x-forwarded-host'] || req.headers.host || 'w-techbrasil.com.br'}`;

          const emailRes = await withTimeout(
            sendTemplate(
              enrollment.student_email,
              'confirmacao_inscricao',
              {
                studentName: (enrollment.student_name || '').split(' ')[0] || enrollment.student_name || 'Aluno',
                courseTitle: course.title || 'Curso W-Tech',
                courseDate: dateStr,
                courseLocation: location,
                amountPaid: fmt(newTotalPaid),
                totalAmount: fmt(total),
                remainingBalance: fmt(remaining),
                showBalance: remaining > 0,
                currencySymbol: symbol,
                clientCode,
                portalUrl: clientCode ? `${baseUrl}/meus-pedidos?code=${clientCode}` : '',
                whatsappGroupLink: course.whatsapp_group_link || '',
                whatToBring: course.what_to_bring || ''
              },
              { type: 'confirmacao_inscricao', enrollmentId }
            ),
            14000,
            'Envio e-mail de confirmação'
          );

          if (emailRes?.sent) {
            console.log(`[Stripe Webhook] E-mail de confirmação enviado para ${enrollment.student_email} ✓`);
          } else {
            console.error('[Stripe Webhook] E-mail não enviado:', emailRes?.error || emailRes?.skipped);
          }
        } catch (mailErr: any) {
          console.error('[Stripe Webhook] Falha no e-mail de confirmação (não-fatal):', mailErr?.message);
        }
      }

      console.log(`Enrollment payment confirmed for ID ${enrollmentId}!`);
    }

    // ── ORDER PAYMENT ─────────────────────────────────────────────────────
    if (orderId) {
      console.log(`Processing ${currency} payment for order ${orderId}...`);

      // 1. Fetch the order
      const { data: order, error: fetchOrderError } = await supabase
        .from('SITE_Sales')
        .select('*')
        .eq('id', orderId)
        .single();

      if (fetchOrderError || !order) {
        console.error('Order not found', fetchOrderError);
        return res.status(404).send('Order not found');
      }

      // IDEMPOTÊNCIA: sem isto, uma reentrega da mesma sessão insere a receita
      // duas vezes em SITE_Transactions (o UPDATE do pedido é inofensivo, o insert não).
      if (order.stripe_session_id === session.id) {
        console.log(`Pedido ${orderId} já processado para a sessão ${session.id} — ignorado.`);
        return res.status(200).json({ received: true, already_processed: true });
      }

      // 2. Update order status to 'paid' and store Stripe session ID
      const { error: updateOrderError } = await supabase
        .from('SITE_Sales')
        .update({
          status: 'paid',
          payment_method: 'Stripe',
          stripe_session_id: session.id,
        })
        .eq('id', orderId);

      if (updateOrderError) {
        // Non-fatal: try-update might fail if column doesn't exist yet, log and continue
        console.error('Update order error (may need migration):', updateOrderError);
      }

      // 3. Insert financial transaction record for orders
      const { error: orderTransError } = await supabase
        .from('SITE_Transactions')
        .insert([{
          description: `Pedido #${orderId.slice(-8)} via Stripe — ${session.id.slice(-12)}`,
          amount: amountPaidRaw,
          type: 'Income',
          category: 'Sales',
          status: 'Completed',
          payment_method: 'Stripe',
          currency: currency,
          date: new Date().toISOString(),
          notes: `Pedido: ${orderId} | Stripe Session: ${session.id}`
        }]);

      if (orderTransError) {
        console.error('Order transaction insert error', orderTransError);
      }

      console.log(`Order payment confirmed! Order ID: ${orderId} | Client: ${order.client_name}`);
    }
  }

  return res.status(200).json({ received: true });
}
