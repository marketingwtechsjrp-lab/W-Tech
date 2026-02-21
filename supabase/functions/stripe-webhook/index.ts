
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

// Helper for currency conversion with error protection
async function getExchangeRate(from: string, to: string = 'BRL'): Promise<number> {
    if (from.toUpperCase() === to.toUpperCase()) return 1.0;
    
    try {
        console.log(`Fetching exchange rate for ${from}-${to}...`);
        const res = await fetch(`https://economia.awesomeapi.com.br/last/${from}-${to}`);
        const data = await res.json();
        const pair = `${from}${to}`;
        
        if (data && data[pair] && data[pair].bid) {
            return parseFloat(data[pair].bid);
        }
        throw new Error(`Invalid API response for ${pair}`);
    } catch (err) {
        console.error(`Erro ao converter moeda (${from}->${to}), usando valor original:`, err.message);
        return 1.0; // Fallback to 1:1 if API fails
    }
}

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
    // Note: Stripe sends different objects for different events. 
    // We handle session (checkout) or intent (direct API)
    const session = event.data.object as any;
    const enrollmentId = session.metadata?.enrollmentId;
    
    // session.amount_total is in cents
    const amountPaidRaw = (session.amount_total || session.amount || 0) / 100;
    const currency = (session.currency || 'eur').toUpperCase();

    if (enrollmentId) {
      console.log(`Processing ${currency} payment for enrollment ${enrollmentId}...`);

      // 1. Get existing enrollment
      const { data: enrollment, error: fetchError } = await supabase
        .from('SITE_Enrollments')
        .select('*')
        .eq('id', enrollmentId)
        .single()

      if (fetchError || !enrollment) {
          console.error('Enrollment not found', fetchError)
          return new Response('Enrollment not found', { status: 404 })
      }

      // 2. Conversion logic (Safe)
      // If payment is EUR and course is BRL, we might want to convert for the financial dashboard
      // But usually we store the paid amount in the currency of the course.
      const rate = await getExchangeRate(currency, 'EUR'); // Example: normalizing to EUR if needed, adjust as per your business logic
      const amountInCourseCurrency = amountPaidRaw; // For now keeping raw, since multi-currency is supported in DB

      const newTotalPaid = (enrollment.amount_paid || 0) + amountInCourseCurrency;

      // 3. Update Enrollment
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

      // 4. Insert Transaction
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

      console.log(`Payment confirmed for ${enrollment.student_name}!`);
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
    status: 200,
  })
})
