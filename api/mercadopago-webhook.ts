
import { createClient } from '@supabase/supabase-js';

// Vercel Serverless Function
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing environment variables');
    return res.status(500).json({ error: 'System configuration error' });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Mercado Pago envia dados via query params ou body
  const { topic, id } = req.query;
  const body = req.body || {};
  
  const paymentId = id || body.data?.id || body.resource;
  const action = topic === 'payment' ? 'payment.created' : (body.action || null);

  console.log(`Webhook received: ID=${paymentId}, Action=${action}`);

  if (!paymentId || action === 'test') {
    return res.status(200).send('OK');
  }

  try {
    // 1. Busca token MP da SITE_Config
    const { data: configRow } = await supabase
      .from('SITE_Config')
      .select('value')
      .eq('key', 'mercadopago_access_token')
      .single();

    const mpToken = configRow?.value;
    if (!mpToken) throw new Error('MP Token not found in SITE_Config');

    // 2. Busca detalhes do pagamento no Mercado Pago
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${mpToken}` }
    });

    if (!mpRes.ok) {
      throw new Error(`Failed to fetch payment ${paymentId}: ${mpRes.statusText}`);
    }

    const payment = await mpRes.json();
    const enrollmentId = payment.external_reference;
    const status = payment.status;

    console.log(`Payment ${paymentId} for Enrollment ${enrollmentId}: Status=${status}`);

    if (enrollmentId && status === 'approved') {
      // 3. Atualiza Enrollment
      const { error: updateError } = await supabase
        .from('SITE_Enrollments')
        .update({
          status: 'Confirmed',
          amount_paid: payment.transaction_amount,
          payment_id: paymentId,
          updated_at: new Date().toISOString()
        })
        .eq('id', enrollmentId);

      if (updateError) throw updateError;
      console.log(`Enrollment ${enrollmentId} confirmed!`);
    }

    return res.status(200).json({ success: true });

  } catch (error: any) {
    console.error('Webhook error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
