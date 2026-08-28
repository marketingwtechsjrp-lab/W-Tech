import { createClient } from '@supabase/supabase-js';
import { findExistingLead, preserveWonStatus } from '../lib/leadMatch.js';

/**
 * Vercel Serverless Function — Mercado Pago Create Preference
 * URL: /api/mercadopago-checkout
 *
 * Variáveis de ambiente obrigatórias no Vercel Dashboard:
 *   VITE_SUPABASE_URL        → URL do projeto Supabase
 *   SUPABASE_SERVICE_ROLE_KEY → Service Role Key (Settings > API)
 */
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { courseId, customer, leadId, paymentType = 'full' } = req.body || {};

  if (!courseId || !customer || !customer.name || !customer.email || !customer.cpf || !customer.phone) {
    return res.status(400).json({ error: 'Dados insuficientes para criar checkout.' });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('[MP Checkout] Missing env vars: VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    return res.status(500).json({ error: 'System configuration error' });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // 1. Busca dados do curso de forma segura no backend
    const { data: course, error: courseError } = await supabase
      .from('SITE_Courses')
      .select('id, title, price, currency, deposit_price')
      .eq('id', courseId)
      .single();

    if (courseError || !course) {
      console.error('[MP Checkout] Course not found:', courseError);
      return res.status(404).json({ error: 'Curso não encontrado.' });
    }

    let itemPrice = course.price;
    if (paymentType === 'deposit') {
      const depPrice = course.deposit_price != null ? Number(course.deposit_price) : 0;
      itemPrice = depPrice > 0 ? depPrice : 400.00;
    }

    // 2. Insere a inscrição (Enrollment) com status 'Pending'
    const { data: enrollment, error: enrollError } = await supabase
      .from('SITE_Enrollments')
      .insert([{
        course_id: courseId,
        student_name: customer.name.trim(),
        student_email: customer.email.trim().toLowerCase(),
        student_cpf: customer.cpf.replace(/\D/g, ''),
        student_phone: customer.phone.replace(/\D/g, ''),
        birth_date: customer.birthDate || null,
        status: 'Pending',
        payment_method: 'Mercado Pago',
        total_amount: course.price,
        amount_paid: 0,
        currency: course.currency || 'BRL',
        enrolled_by_name: 'Automático'
      }])
      .select('id')
      .single();

    if (enrollError || !enrollment) {
      console.error('[MP Checkout] Failed to create enrollment:', enrollError);
      return res.status(500).json({ error: 'Falha ao registrar inscrição no banco.' });
    }

    const enrollmentId = enrollment.id;

    // 3. Garante a ficha do lead no CRM (sem duplicar e sem rebaixar quem já é cliente)
    let finalLeadId = leadId;
    const cleanEmail = customer.email.trim().toLowerCase();
    const cleanPhone = customer.phone.replace(/\D/g, '');

    // Busca tolerante (e-mail sem case-sensitive / últimos 8 dígitos do telefone).
    // O match exato de antes errava sempre que o lead tinha sido gravado com
    // máscara pela landing page, e o checkout criava uma ficha duplicada.
    let existingLead: any = null;
    if (!finalLeadId) {
      existingLead = await findExistingLead<any>(supabase, { email: cleanEmail, phone: cleanPhone });
      if (existingLead) finalLeadId = existingLead.id;
    } else {
      const { data } = await supabase
        .from('SITE_Leads')
        .select('id, status, tags')
        .eq('id', finalLeadId)
        .maybeSingle();
      existingLead = data;
    }

    const leadPayload: any = {
      name: customer.name.trim(),
      email: cleanEmail,
      phone: cleanPhone,
      // Abrir um checkout não desfaz uma venda anterior: quem já está ganho
      // permanece ganho. NÃO gravar nome em assigned_to — a coluna é UUID e
      // gravar texto ali fazia o INSERT/UPDATE inteiro falhar (erro 22P02),
      // por isso este bloco nunca chegava a criar/atualizar lead nenhum.
      status: preserveWonStatus(existingLead?.status, 'New'),
      origin: 'Checkout Automatizado',
      updated_at: new Date().toISOString()
    };

    if (finalLeadId) {
      const existingTags = existingLead?.tags || [];
      const mergedTags = Array.from(new Set([...existingTags, 'checkout_automatico', 'checkout_direto']));
      
      const { error: leadError } = await supabase
        .from('SITE_Leads')
        .update({
          ...leadPayload,
          tags: mergedTags
        })
        .eq('id', finalLeadId);

      if (leadError) {
        console.warn('[MP Checkout] Lead update failed (non-fatal):', leadError);
      }
    } else {
      const { data: newLead, error: leadError } = await supabase
        .from('SITE_Leads')
        .insert([{
          ...leadPayload,
          type: 'Course_Registration',
          tags: ['checkout_automatico', 'checkout_direto'],
          created_at: new Date().toISOString()
        }])
        .select('id')
        .single();

      if (leadError) {
        console.warn('[MP Checkout] Lead creation failed (non-fatal):', leadError);
      } else if (newLead) {
        finalLeadId = newLead.id;
      }
    }

    // 4. Busca token MP da SITE_Config
    const { data: configRow } = await supabase
      .from('SITE_Config')
      .select('value')
      .eq('key', 'mercadopago_access_token')
      .single();

    const mpToken = configRow?.value as string | undefined;
    if (!mpToken) {
      console.error('[MP Checkout] mercadopago_access_token not found in SITE_Config');
      return res.status(500).json({ error: 'Gateway de pagamento não configurado no painel.' });
    }

    // 5. Gera as URLs de redirecionamento dinamicamente baseando-se no host requisitado
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
    const origin = `${protocol}://${host}`;

    const successUrl = `${origin}/mp-redirect.html?eid=${enrollmentId}&status=approved&type=${paymentType}`;
    const pendingUrl = `${origin}/mp-redirect.html?eid=${enrollmentId}&status=pending&type=${paymentType}`;
    const failureUrl = `${origin}/mp-redirect.html?eid=${enrollmentId}&status=failed&cid=${course.id}&type=${paymentType}`;

    const phoneDigits = (customer.phone || '').replace(/\D/g, '');
    const areaCode = phoneDigits.slice(0, 2);
    const phoneNumber = phoneDigits.slice(2);
    const cpfDigits = (customer.cpf || '').replace(/\D/g, '');

    const payload: any = {
      items: [
        {
          id: course.id,
          title: paymentType === 'deposit' ? `${course.title} (Reserva de Vaga)` : course.title,
          unit_price: itemPrice,
          quantity: 1,
          currency_id: 'BRL'
        }
      ],
      payer: {
        name: customer.name,
        email: customer.email,
        ...(phoneDigits.length >= 10 && { phone: { area_code: areaCode, number: phoneNumber } }),
        ...(cpfDigits.length === 11 && { identification: { type: 'CPF', number: cpfDigits } }),
      },
      back_urls: {
        success: successUrl,
        failure: failureUrl,
        pending: pendingUrl
      },
      payment_methods: {
        installments: 10
      },
      notification_url: `${origin}/api/mercadopago-webhook`,
      external_reference: enrollmentId,
      metadata: {
        enrollment_id: enrollmentId,
        lead_id: finalLeadId || null,
        payment_type: paymentType
      },
      statement_descriptor: 'WTECH'
    };

    // 6. Faz requisição à API do Mercado Pago
    const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${mpToken}`
      },
      body: JSON.stringify(payload)
    });

    const data = await mpRes.json();

    if (!mpRes.ok || !data.id) {
      const errMsg = data.message || data.error || JSON.stringify(data);
      console.error('[MP Checkout] MP API error:', errMsg);
      return res.status(502).json({ error: `Mercado Pago erro: ${errMsg}` });
    }

    const isSandbox = mpToken.startsWith('TEST-');
    const redirectUrl = isSandbox ? data.sandbox_init_point : data.init_point;

    return res.status(200).json({
      success: true,
      init_point: redirectUrl,
      sandbox_init_point: data.sandbox_init_point,
      id: data.id,
      enrollmentId
    });

  } catch (error: any) {
    console.error('[MP Checkout] Unexpected error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
