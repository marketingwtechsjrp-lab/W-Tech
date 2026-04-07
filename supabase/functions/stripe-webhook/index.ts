
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import Stripe from "https://esm.sh/stripe@11.1.0?target=deno"

const stripe = new Stripe(Deno.env.get('STRIPE_API_KEY') as string, {
  apiVersion: '2022-11-15',
  httpClient: Stripe.createFetchHttpClient(),
})

const supabaseUrl = Deno.env.get('SUPABASE_URL')
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const supabase = createClient(supabaseUrl!, supabaseServiceKey!)

const endpointSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')

serve(async (req) => {
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return new Response('Missing signature', { status: 400 })
  }

  const body = await req.text()
  let event

  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      endpointSecret!,
      undefined
    )
  } catch (err) {
    return new Response(`Webhook Error: ${err.message}`, { status: 400 })
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
        .single()

      if (fetchError || !enrollment) {
        console.error('Enrollment not found', fetchError)
        return new Response('Enrollment not found', { status: 404 })
      }

      const newTotalPaid = (enrollment.amount_paid || 0) + amountPaidRaw;

      const { error: updateError } = await supabase
        .from('SITE_Enrollments')
        .update({ amount_paid: newTotalPaid, status: 'Confirmed' })
        .eq('id', enrollmentId)

      if (updateError) {
        console.error('Update enrollment error', updateError)
        return new Response('Update error', { status: 500 })
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
        }])

      if (transError) console.error('Transaction insert error', transError)
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
        .single()

      if (fetchOrderError || !order) {
        console.error('Order not found', fetchOrderError)
        return new Response('Order not found', { status: 404 })
      }

      // 2. Update order status to 'paid' and store Stripe session ID
      const { error: updateOrderError } = await supabase
        .from('SITE_Sales')
        .update({
          status: 'paid',
          payment_method: 'Stripe',
          stripe_session_id: session.id,
        })
        .eq('id', orderId)

      if (updateOrderError) {
        // Non-fatal: try-update might fail if column doesn't exist yet, log and continue
        console.error('Update order error (may need migration):', updateOrderError)
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
        }])

      if (orderTransError) {
        console.error('Order transaction insert error', orderTransError)
      }

      console.log(`Order payment confirmed! Order ID: ${orderId} | Client: ${order.client_name}`);
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
    status: 200,
  })
})
