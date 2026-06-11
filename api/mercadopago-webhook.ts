import { createClient } from '@supabase/supabase-js';
import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Valida a assinatura HMAC do webhook do Mercado Pago.
 */
function validarAssinaturaMP(input: {
  xSignature: string | null;
  xRequestId: string | null;
  dataId: string;
}): boolean {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!secret) {
    console.warn(
      '[MP Webhook] MERCADOPAGO_WEBHOOK_SECRET não configurado — assinatura do webhook NÃO validada.'
    );
    return true;
  }

  if (!input.xSignature) return false;

  let ts = '';
  let v1 = '';
  for (const parte of input.xSignature.split(',')) {
    const [chave, valor] = parte.split('=').map((s) => s?.trim());
    if (chave === 'ts') ts = valor ?? '';
    if (chave === 'v1') v1 = valor ?? '';
  }
  if (!ts || !v1) return false;

  let manifesto = `id:${input.dataId.toLowerCase()};`;
  if (input.xRequestId) manifesto += `request-id:${input.xRequestId};`;
  manifesto += `ts:${ts};`;

  // Suporta múltiplos segredos separados por vírgula (ex: segredo_teste,segredo_producao)
  const secrets = secret.split(',').map((s) => s.trim()).filter(Boolean);
  if (secrets.length === 0) {
    console.warn(
      '[MP Webhook] MERCADOPAGO_WEBHOOK_SECRET está vazio após processamento — assinatura não validada.'
    );
    return true;
  }

  for (const s of secrets) {
    const esperado = createHmac('sha256', s).update(manifesto).digest('hex');
    try {
      const a = Buffer.from(esperado, 'hex');
      const b = Buffer.from(v1, 'hex');
      if (a.length === b.length && timingSafeEqual(a, b)) {
        return true;
      }
    } catch {
      // Ignora erro neste segredo e tenta o próximo
    }
  }

  return false;
}

/**
 * Vercel Serverless Function — Mercado Pago Webhook
 * URL: /api/mercadopago-webhook
 *
 * Variáveis de ambiente obrigatórias no Vercel Dashboard:
 *   VITE_SUPABASE_URL        → URL do projeto Supabase
 *   SUPABASE_SERVICE_ROLE_KEY → Service Role Key (Settings > API)
 */
export default async function handler(req: any, res: any) {
  // Aceitar GET para teste manual + POST para notificações reais
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Health check simples
  if (req.method === 'GET') {
    return res.status(200).json({ status: 'Webhook endpoint online', ts: new Date().toISOString() });
  }

  // ── Variáveis de ambiente ──────────────────────────────────────────────────
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('[MP Webhook] Missing env vars: VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    return res.status(500).json({ error: 'System configuration error' });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // ── Parse do payload ────────────────────────────────────────────────────────
  // MP envia duas formas:
  //   1. IPN antigo: GET/POST com query params ?topic=payment&id=12345
  //   2. Webhooks novos: POST body { action: "payment.updated", data: { id: "12345" } }
  const body = (req.body as any) || {};
  const queryId = req.query?.id as string | undefined;
  const queryTopic = req.query?.topic as string | undefined;

  const paymentId: string | undefined =
    queryId || body?.data?.id || body?.resource || undefined;

  const action: string | null =
    queryTopic === 'payment'
      ? 'payment.updated'
      : (body?.action as string) || null;

  console.log(`[MP Webhook] Received: action=${action}, paymentId=${paymentId}`);

  // Ignorar notificações de teste ou sem ID de pagamento
  if (!paymentId || action === 'test') {
    return res.status(200).json({ received: true, skipped: 'test or missing id' });
  }

  // Processar apenas eventos de pagamento
  const validActions = ['payment.updated', 'payment.created'];
  if (action && !validActions.includes(action)) {
    return res.status(200).json({ received: true, skipped: `action not tracked: ${action}` });
  }

  // Validação da assinatura do webhook do Mercado Pago (anti-spoofing)
  const xSignature = req.headers['x-signature'] as string | undefined;
  const xRequestId = req.headers['x-request-id'] as string | undefined;

  const assinaturaOk = validarAssinaturaMP({
    xSignature: xSignature || null,
    xRequestId: xRequestId || null,
    dataId: String(paymentId)
  });

  if (!assinaturaOk) {
    console.warn(`[MP Webhook] Assinatura inválida para o paymentId ${paymentId} — requisição rejeitada.`);
    return res.status(401).json({ error: 'Assinatura inválida' });
  }

  try {
    // ── 1. Busca token MP da SITE_Config ────────────────────────────────────
    const { data: configRow } = await supabase
      .from('SITE_Config')
      .select('value')
      .eq('key', 'mercadopago_access_token')
      .single();

    const mpToken = configRow?.value as string | undefined;
    if (!mpToken) {
      console.error('[MP Webhook] mercadopago_access_token not found in SITE_Config');
      return res.status(500).json({ error: 'MP token not configured' });
    }

    // ── 2. Consulta pagamento no MP ─────────────────────────────────────────
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${mpToken}` }
    });

    if (!mpRes.ok) {
      console.error(`[MP Webhook] MP API error: ${mpRes.status} ${mpRes.statusText}`);
      return res.status(502).json({ error: `MP API error: ${mpRes.status}` });
    }

    const payment = await mpRes.json();
    console.log(`[MP Webhook] Payment ${paymentId} → status: ${payment.status}`);

    // Apenas processar pagamentos aprovados
    if (payment.status !== 'approved') {
      return res.status(200).json({
        received: true,
        status: payment.status,
        message: 'Not approved, skipping.'
      });
    }

    const enrollmentId = payment.external_reference as string | undefined;
    const amountPaid = payment.transaction_amount as number;
    const currency = ((payment.currency_id as string) || 'BRL').toUpperCase();

    if (!enrollmentId) {
      console.error('[MP Webhook] No external_reference in payment');
      return res.status(400).json({ error: 'No enrollment reference in payment' });
    }

    // ── 3. Busca o enrollment ───────────────────────────────────────────────
    const { data: enrollment, error: fetchError } = await supabase
      .from('SITE_Enrollments')
      .select('*')
      .eq('id', enrollmentId)
      .single();

    if (fetchError || !enrollment) {
      console.error('[MP Webhook] Enrollment not found:', fetchError);
      return res.status(404).json({ error: 'Enrollment not found' });
    }

    // Idempotência: já confirmado → não duplicar
    if (enrollment.status === 'Confirmed') {
      console.log(`[MP Webhook] Enrollment ${enrollmentId} already confirmed. Skipping.`);
      return res.status(200).json({ received: true, already_confirmed: true });
    }

    // ── 4. Atualiza SITE_Enrollments → Confirmed ────────────────────────────
    const { error: updateError } = await supabase
      .from('SITE_Enrollments')
      .update({
        status: 'Confirmed',
        amount_paid: amountPaid,
        payment_id: String(paymentId),
        payment_method: 'Mercado Pago',
        enrolled_by_name: 'Automático',
        updated_at: new Date().toISOString()
      })
      .eq('id', enrollmentId);

    if (updateError) {
      console.error('[MP Webhook] Failed to update enrollment:', updateError);
      return res.status(500).json({ error: 'Failed to update enrollment' });
    }
    console.log(`[MP Webhook] Enrollment ${enrollmentId} → Confirmed ✓`);

    // ── 5. Atualiza SITE_Leads → Converted (não-fatal) ──────────────────────
    const leadIdFromMeta = payment.metadata?.lead_id;
    let leadQuery = supabase.from('SITE_Leads').select('id, tags, conversion_value');
    
    if (leadIdFromMeta) {
      leadQuery = leadQuery.eq('id', leadIdFromMeta);
    } else if (enrollment.student_email) {
      leadQuery = leadQuery.eq('email', enrollment.student_email);
    } else {
      leadQuery = null;
    }

    if (leadQuery) {
      const { data: existingLead } = await leadQuery.maybeSingle();
      const leadIdToUpdate = existingLead?.id || leadIdFromMeta;

      if (leadIdToUpdate) {
        const autoTags = ['checkout_automatico', 'sem_comissao', 'venda_mp', 'checkout_direto'];
        const existingTags: string[] = existingLead?.tags || [];
        const mergedTags = Array.from(new Set([...existingTags, ...autoTags]));

        const { error: leadError } = await supabase
          .from('SITE_Leads')
          .update({
            status: 'Converted',
            tags: mergedTags,
            conversion_value: amountPaid,
            conversion_summary: `Venda automática via Checkout Direto (Mercado Pago). Curso: ${enrollment.course_id}. Sem atendimento humano.`,
            conversion_type: 'Course_Purchase',
            assigned_to: 'Automático',
            updated_at: new Date().toISOString()
          })
          .eq('id', leadIdToUpdate);

        if (leadError) {
          console.error('[MP Webhook] Lead update error (non-fatal):', leadError);
        } else {
          console.log(`[MP Webhook] Lead ${leadIdToUpdate} → Converted & assigned to Automático ✓`);
        }
      }
    }

    // ── 6. Registra em SITE_Transactions (não-fatal) ────────────────────────
    const { error: transError } = await supabase
      .from('SITE_Transactions')
      .insert([{
        description: `Pagamento Mercado Pago: ${String(paymentId).slice(-12)}`,
        amount: amountPaid,
        type: 'Income',
        category: 'Sales',
        status: 'Completed',
        payment_method: 'Mercado Pago',
        enrollment_id: enrollmentId,
        currency,
        date: new Date().toISOString()
      }]);

    if (transError) {
      console.error('[MP Webhook] Transaction insert error (non-fatal):', transError);
    }

    console.log(`[MP Webhook] Done. Enrollment ${enrollmentId} confirmed. Amount: ${amountPaid} ${currency}`);
    return res.status(200).json({ received: true, enrollment_id: enrollmentId, status: 'Confirmed' });

  } catch (error: any) {
    console.error('[MP Webhook] Unexpected error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
