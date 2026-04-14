import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const supabaseUrl = Deno.env.get('SUPABASE_URL')
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const supabase = createClient(supabaseUrl!, supabaseServiceKey!)

serve(async (req) => {
  // MP envia POST com { action, data: { id } }
  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  console.log(`MP Webhook received: action=${body.action}, id=${body.data?.id}`);

  // Processar apenas eventos de pagamento
  if (body.action !== 'payment.updated' && body.action !== 'payment.created') {
    return new Response(JSON.stringify({ received: true, skipped: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    });
  }

  const paymentId = body.data?.id;
  if (!paymentId) {
    return new Response('Missing payment ID', { status: 400 });
  }

  // 1. Busca token MP da SITE_Config (configurável pelo admin, não deploy-time secret)
  const { data: configRow } = await supabase
    .from('SITE_Config')
    .select('value')
    .eq('key', 'mercadopago_access_token')
    .single();

  const mpToken = configRow?.value;
  if (!mpToken) {
    console.error('MP token not configured in SITE_Config');
    return new Response('MP token not configured', { status: 500 });
  }

  // 2. Busca detalhes do pagamento na API do Mercado Pago
  const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: { 'Authorization': `Bearer ${mpToken}` }
  });

  if (!mpRes.ok) {
    console.error(`MP API error: ${mpRes.status}`);
    return new Response('MP API error', { status: 502 });
  }

  const payment = await mpRes.json();
  console.log(`Payment ${paymentId} status: ${payment.status}`);

  // Apenas processar pagamentos aprovados
  if (payment.status !== 'approved') {
    return new Response(
      JSON.stringify({ received: true, status: payment.status, message: 'Not approved, skipping.' }),
      { headers: { 'Content-Type': 'application/json' }, status: 200 }
    );
  }

  const enrollmentId = payment.external_reference;
  const amountPaid = payment.transaction_amount as number;
  const currency = (payment.currency_id || 'BRL').toUpperCase();

  if (!enrollmentId) {
    console.error('No external_reference (enrollmentId) in payment');
    return new Response('No enrollment reference', { status: 400 });
  }

  // 3. Busca o enrollment para ter o student_email
  const { data: enrollment, error: fetchError } = await supabase
    .from('SITE_Enrollments')
    .select('*')
    .eq('id', enrollmentId)
    .single();

  if (fetchError || !enrollment) {
    console.error('Enrollment not found', fetchError);
    return new Response('Enrollment not found', { status: 404 });
  }

  // Se já confirmado, responde 200 sem duplicar (idempotência)
  if (enrollment.status === 'Confirmed') {
    console.log(`Enrollment ${enrollmentId} already confirmed. Skipping.`);
    return new Response(JSON.stringify({ received: true, already_confirmed: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    });
  }

  // 4. Atualiza SITE_Enrollments para Confirmed
  const { error: updateError } = await supabase
    .from('SITE_Enrollments')
    .update({
      status: 'Confirmed',
      amount_paid: amountPaid,
      payment_method: 'Mercado Pago'
    })
    .eq('id', enrollmentId);

  if (updateError) {
    console.error('Update enrollment error', updateError);
    return new Response('Update error', { status: 500 });
  }

  // 5. Atualiza SITE_Leads para 'Converted' (coluna "Ganho" no CRM)
  //    com tags de venda automática (sem intervenção humana = sem comissão)
  if (enrollment.student_email) {
    // Busca o lead atual para mesclar as tags existentes
    const { data: existingLead } = await supabase
      .from('SITE_Leads')
      .select('id, tags, conversion_value')
      .eq('email', enrollment.student_email)
      .single();

    // Tags automáticas que identificam esta venda como sem comissão
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
        updated_at: new Date().toISOString()
      })
      .eq('email', enrollment.student_email);

    if (leadError) {
      console.error('Lead update error (non-fatal):', leadError);
    } else {
      console.log(`Lead ${enrollment.student_email} → Converted (Ganho) | Tags: ${autoTags.join(', ')}`);
    }
  }

  // 6. Registra transação financeira em SITE_Transactions
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
      currency: currency,
      date: new Date().toISOString()
    }]);

  if (transError) {
    console.error('Transaction insert error (non-fatal):', transError);
  }

  console.log(`Enrollment ${enrollmentId} confirmed via MP payment ${paymentId}. Amount: ${amountPaid} ${currency}`);

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
    status: 200,
  });
})
