
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

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const enrollmentId = session.metadata?.enrollmentId
    const amountPaid = session.amount_total / 100 // Stripe matches decimals by cents
    const currency = session.currency?.toUpperCase() || 'BRL'

    if (enrollmentId) {
      console.log(`Processing payment for enrollment ${enrollmentId}...`)

      // 1. Get existing enrollment to calculate new total
      const { data: enrollment, error: fetchError } = await supabase
        .from('SITE_Enrollments')
        .select('*')
        .eq('id', enrollmentId)
        .single()

      if (fetchError || !enrollment) {
          console.error('Enrollment not found', fetchError)
          return new Response('Enrollment not found', { status: 404 })
      }

      const newTotalPaid = (enrollment.amount_paid || 0) + amountPaid

      // 2. Update Enrollment
      const { error: updateError } = await supabase
        .from('SITE_Enrollments')
        .update({
          amount_paid: newTotalPaid,
          status: 'Confirmed'
        })
        .eq('id', enrollmentId)

      if (updateError) {
          console.error('Update enrollment error', updateError)
          return new Response('Update error', { status: 500 })
      }

      // 3. Insert Transaction
      const { error: transError } = await supabase
        .from('SITE_Transactions')
        .insert([{
          description: `Pagamento Stripe: Session ${session.id.slice(-8)}`,
          amount: amountPaid,
          type: 'Income',
          category: 'Sales',
          status: 'Completed',
          payment_method: 'Stripe',
          enrollment_id: enrollmentId,
          currency: currency,
          date: new Date().toISOString()
        }])

      if (transError) console.error('Transaction insert error', transError)

      console.log(`Payment confirmed for ${enrollment.student_name}!`)
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
    status: 200,
  })
})
