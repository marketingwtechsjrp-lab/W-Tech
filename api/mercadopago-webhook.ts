import { createClient } from '@supabase/supabase-js';
import { createHmac, timingSafeEqual } from 'crypto';
import { recoverLeadToRoulette } from './_roleta.js';
import { sendTemplate, alreadySent } from './_email.js';
import { enrollContactInFlows } from './_flows.js';

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
    console.warn(
      `[MP Webhook] Assinatura inválida para o paymentId ${paymentId}. Prosseguindo com a validação direta na API do Mercado Pago para resiliência.`
    );
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

    // ── 2. Consulta pagamento no MP (com timeout para nunca pendurar) ───────
    const mpController = new AbortController();
    const mpTimeout = setTimeout(() => mpController.abort(), 10000);
    let mpRes: Response;
    try {
      mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { Authorization: `Bearer ${mpToken}` },
        signal: mpController.signal
      });
    } finally {
      clearTimeout(mpTimeout);
    }

    if (mpRes.status === 404) {
      // Pagamento inexistente: notificação de simulação do painel MP ou ID inválido.
      // Responde 200 para o MP não marcar o webhook como falho nem reenviar.
      console.log(`[MP Webhook] Payment ${paymentId} not found on MP (simulation/test). Acknowledged.`);
      return res.status(200).json({ received: true, skipped: 'payment not found (simulation or invalid id)' });
    }

    if (!mpRes.ok) {
      console.error(`[MP Webhook] MP API error: ${mpRes.status} ${mpRes.statusText}`);
      return res.status(502).json({ error: `MP API error: ${mpRes.status}` });
    }

    const payment = await mpRes.json();
    console.log(`[MP Webhook] Payment ${paymentId} → status: ${payment.status}`);

    // Pagamento recusado/cancelado → devolve o lead para a roleta de atendentes
    if (payment.status === 'rejected' || payment.status === 'cancelled') {
      const refId = payment.external_reference as string | undefined;
      if (refId) {
        const { data: failedEnrollment } = await supabase
          .from('SITE_Enrollments')
          .select('id, status, student_email, student_phone, student_name')
          .eq('id', refId)
          .maybeSingle();

        if (failedEnrollment) {
          const result = await recoverLeadToRoulette(
            supabase,
            failedEnrollment,
            `Pagamento ${payment.status} no Mercado Pago (payment ${paymentId})`
          );
          console.log(`[MP Webhook] Payment ${payment.status} → recovery: ${result.detail}`);
        }
      }
      return res.status(200).json({ received: true, status: payment.status, recovery: 'attempted' });
    }

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
    // OBS: SITE_Enrollments NÃO possui coluna updated_at — não incluir aqui,
    // senão o PostgREST rejeita o UPDATE inteiro e a inscrição nunca confirma.
    const { error: updateError } = await supabase
      .from('SITE_Enrollments')
      .update({
        status: 'Confirmed',
        amount_paid: amountPaid,
        payment_id: String(paymentId),
        payment_method: 'Mercado Pago',
        enrolled_by_name: 'Automático'
      })
      .eq('id', enrollmentId);

    if (updateError) {
      console.error('[MP Webhook] Failed to update enrollment:', updateError);
      return res.status(500).json({ error: 'Failed to update enrollment' });
    }
    console.log(`[MP Webhook] Enrollment ${enrollmentId} → Confirmed ✓`);

    // ── 5 & 6. Tarefas secundárias (não-fatais) ─────────────────────────────
    // A inscrição já está confirmada. Estas etapas (lead + transação) são
    // best-effort e cada uma é limitada por timeout para NUNCA pendurar a
    // resposta ao Mercado Pago — uma etapa lenta/travada não pode impedir o ack.
    const withTimeout = <T,>(p: PromiseLike<T>, ms: number, label: string): Promise<T | null> =>
      Promise.race([
        Promise.resolve(p),
        new Promise<null>((resolve) =>
          setTimeout(() => {
            console.error(`[MP Webhook] ${label} excedeu ${ms}ms — ignorado (não-fatal).`);
            resolve(null);
          }, ms)
        )
      ]) as Promise<T | null>;

    try {
      // ── 5. Atualiza SITE_Leads → Converted ───────────────────────────────
      // OBS: assigned_to é UUID — NÃO gravar string ('Automático') ali.
      const leadIdFromMeta = payment.metadata?.lead_id;
      let leadQuery = supabase.from('SITE_Leads').select('id, tags');

      if (leadIdFromMeta) {
        leadQuery = leadQuery.eq('id', leadIdFromMeta);
      } else if (enrollment.student_email) {
        leadQuery = leadQuery.eq('email', enrollment.student_email);
      } else {
        leadQuery = null;
      }

      if (leadQuery) {
        const leadRes = await withTimeout(leadQuery.maybeSingle(), 5000, 'SELECT lead');
        const existingLead = leadRes?.data as { id: string; tags?: string[] } | undefined;
        const leadIdToUpdate = existingLead?.id || leadIdFromMeta;

        if (leadIdToUpdate) {
          const autoTags = ['checkout_automatico', 'sem_comissao', 'venda_mp', 'checkout_direto'];
          const existingTags: string[] = existingLead?.tags || [];
          const mergedTags = Array.from(new Set([...existingTags, ...autoTags]));

          const upd = await withTimeout(
            supabase
              .from('SITE_Leads')
              .update({
                status: 'Converted',
                tags: mergedTags,
                conversion_value: amountPaid,
                conversion_summary: `Venda automática via Checkout Direto (Mercado Pago). Curso: ${enrollment.course_id}. Sem atendimento humano.`,
                conversion_type: 'Course_Purchase',
                updated_at: new Date().toISOString()
              })
              .eq('id', leadIdToUpdate),
            5000,
            'UPDATE lead'
          );
          if (upd?.error) {
            console.error('[MP Webhook] Lead update error (non-fatal):', upd.error);
          } else if (upd) {
            console.log(`[MP Webhook] Lead ${leadIdToUpdate} → Converted ✓`);
          }
        }
      }

      // ── 6. Registra em SITE_Transactions ─────────────────────────────────
      // OBS: a tabela NÃO tem coluna enrollment_id — usar course_id/lead_id.
      const transRes = await withTimeout(
        supabase.from('SITE_Transactions').insert([{
          description: `Pagamento Mercado Pago: ${String(paymentId).slice(-12)}`,
          amount: amountPaid,
          type: 'Income',
          category: 'Sales',
          status: 'Completed',
          payment_method: 'Mercado Pago',
          course_id: enrollment.course_id,
          lead_id: payment.metadata?.lead_id || null,
          currency,
          date: new Date().toISOString()
        }]),
        5000,
        'INSERT transaction'
      );
      if (transRes?.error) {
        console.error('[MP Webhook] Transaction insert error (non-fatal):', transRes.error);
      }

      // ── 7. E-mail de confirmação ao aluno (transacional, não-fatal) ──────
      if (enrollment.student_email && !(await alreadySent(enrollmentId, 'confirmacao_inscricao'))) {
        const courseRes = await withTimeout(
          supabase
            .from('SITE_Courses')
            .select('title, date, date_end, city, state, start_time, what_to_bring, whatsapp_group_link, currency')
            .eq('id', enrollment.course_id)
            .maybeSingle(),
          5000,
          'SELECT course (email)'
        );
        const course: any = courseRes?.data || {};

        const codeRes = await withTimeout(
          supabase.from('SITE_Leads').select('client_code').eq('email', enrollment.student_email).maybeSingle(),
          5000,
          'SELECT client_code (email)'
        );
        const clientCode = (codeRes?.data as any)?.client_code || '';

        const cur = (course.currency || enrollment.currency || 'BRL').toUpperCase();
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
        const remaining = Math.max(0, total - amountPaid);
        const baseUrl = `https://${req.headers['x-forwarded-host'] || req.headers.host || 'site.w-techbrasil.com.br'}`;

        const emailRes = await withTimeout(
          sendTemplate(
            enrollment.student_email,
            'confirmacao_inscricao',
            {
              studentName: (enrollment.student_name || '').split(' ')[0] || enrollment.student_name || 'Aluno',
              courseTitle: course.title || 'Curso W-Tech',
              courseDate: dateStr,
              courseLocation: location,
              amountPaid: fmt(amountPaid),
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
        if ((emailRes as any)?.sent) {
          console.log(`[MP Webhook] E-mail de confirmação enviado para ${enrollment.student_email} ✓`);
        }

        // ── 8. Inscreve o comprador em fluxos de follow-up (gatilho CompraRecente) ──
        await withTimeout(
          enrollContactInFlows({
            email: enrollment.student_email,
            name: enrollment.student_name,
            triggerType: 'CompraRecente',
            client: supabase
          }),
          5000,
          'Enroll em fluxos CompraRecente'
        );
      }
    } catch (sideError: any) {
      console.error('[MP Webhook] Erro em tarefa secundária (não-fatal):', sideError?.message);
    }

    console.log(`[MP Webhook] Done. Enrollment ${enrollmentId} confirmed. Amount: ${amountPaid} ${currency}`);
    return res.status(200).json({ received: true, enrollment_id: enrollmentId, status: 'Confirmed' });

  } catch (error: any) {
    console.error('[MP Webhook] Unexpected error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
