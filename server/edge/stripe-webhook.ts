import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import type { Request, Response } from 'express';

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

let cachedStripe: Stripe | null = null;
function getStripe(): Stripe | null {
  if (cachedStripe) return cachedStripe;
  const key = process.env.STRIPE_API_KEY || '';
  if (!key) return null;
  cachedStripe = new Stripe(key, { apiVersion: '2022-11-15' });
  return cachedStripe;
}

let cachedSupabase: SupabaseClient | null = null;
function getSupabase(): SupabaseClient | null {
  if (cachedSupabase) return cachedSupabase;
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!url || !key) return null;
  cachedSupabase = createClient(url, key);
  return cachedSupabase;
}

export default async function stripeWebhookHandler(req: Request, res: Response) {
  const signature = req.headers['stripe-signature'] as string | undefined;

  if (!signature) {
    return res.status(400).send('Missing signature');
  }

  const stripe = getStripe();
  const supabase = getSupabase();
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !supabase || !endpointSecret) {
    console.error('[Stripe Webhook] Envs ausentes: STRIPE_API_KEY, STRIPE_WEBHOOK_SECRET ou SUPABASE_*');
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
    const enrollmentId = session.metadata?.enrollmentId;
    const orderId = session.metadata?.orderId;

    // session.amount_total is in cents
    const amountPaidRaw = (session.amount_total || session.amount || 0) / 100;
    const currency = (session.currency || 'brl').toUpperCase();

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

      const newTotalPaid = (enrollment.amount_paid || 0) + amountPaidRaw;

      const { error: updateError } = await supabase
        .from('SITE_Enrollments')
        .update({ amount_paid: newTotalPaid, status: 'Confirmed', enrolled_by_name: 'Automático' })
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
          currency: currency,
          date: new Date().toISOString()
        }]);

      if (transError) console.error('Transaction insert error', transError);
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
