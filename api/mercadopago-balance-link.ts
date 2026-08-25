import { createClient } from '@supabase/supabase-js';
import { requireSameOrigin } from './_auth.js';
import { requireStaffOrS2SPermission } from './_s2s.js';
import { PAYMENT_LINK_PERMISSIONS } from '../lib/permissions.js';

/**
 * Vercel Serverless Function — Link de pagamento do SALDO de uma inscrição.
 * URL: /api/mercadopago-balance-link
 *
 * POST { enrollmentId: string, amount: number }
 *
 * Diferente de /api/mercadopago-checkout (que CRIA uma inscrição nova com o
 * preço cheio), aqui usamos uma inscrição JÁ EXISTENTE e cobramos apenas o
 * valor informado (o saldo restante). Não cria inscrição nem lead.
 *
 * A preferência sai com external_reference = enrollmentId e
 * metadata.payment_type = 'balance' — o webhook credita o valor (soma ao
 * amount_paid) quando o pagamento é aprovado.
 *
 * Uso: o atendente gera o link no painel (modal "Quitar Saldo"), copia e envia
 * manualmente pelo WhatsApp. Exige sessão de staff (browser, CSRF) OU S2S do
 * ERP, nos dois casos com PAYMENT_LINK_PERMISSIONS — antes deste corte a
 * rota era pública e qualquer um conseguia gerar cobrança pra qualquer
 * inscrição.
 */
export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const svcHeader = String(req.headers?.['x-wtech-svc'] || '');
    if (!svcHeader && !requireSameOrigin(req, res)) return;
    if (!(await requireStaffOrS2SPermission(req, res, PAYMENT_LINK_PERMISSIONS))) return;

    const enrollmentId = (req.body?.enrollmentId as string | undefined)?.trim();
    const amount = Number(req.body?.amount);

    if (!enrollmentId) return res.status(400).json({ error: 'enrollmentId é obrigatório.' });
    if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ error: 'Valor do saldo inválido.' });

    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseServiceKey) {
        console.error('[MP Balance] Missing env vars');
        return res.status(500).json({ error: 'System configuration error' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    try {
        // 1. Inscrição existente + curso
        const { data: enr, error: enrErr } = await supabase
            .from('SITE_Enrollments')
            .select('id, student_name, student_email, student_cpf, student_phone, course_id, currency, course:SITE_Courses(title)')
            .eq('id', enrollmentId)
            .single();

        if (enrErr || !enr) {
            console.error('[MP Balance] Enrollment not found:', enrErr);
            return res.status(404).json({ error: 'Inscrição não encontrada.' });
        }
        if (!enr.student_email) {
            return res.status(400).json({ error: 'Aluno sem e-mail cadastrado — necessário para gerar o link.' });
        }

        const courseTitle = (enr as any).course?.title || 'Curso W-Tech';

        // 2. Token MP
        const { data: configRow } = await supabase
            .from('SITE_Config')
            .select('value')
            .eq('key', 'mercadopago_access_token')
            .single();
        const mpToken = configRow?.value as string | undefined;
        if (!mpToken) {
            console.error('[MP Balance] mercadopago_access_token ausente');
            return res.status(500).json({ error: 'Gateway de pagamento não configurado no painel.' });
        }

        // 3. URLs de retorno
        const protocol = req.headers['x-forwarded-proto'] || 'http';
        const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
        const origin = `${protocol}://${host}`;
        const successUrl = `${origin}/mp-redirect.html?eid=${enrollmentId}&status=approved&type=balance`;
        const pendingUrl = `${origin}/mp-redirect.html?eid=${enrollmentId}&status=pending&type=balance`;
        const failureUrl = `${origin}/mp-redirect.html?eid=${enrollmentId}&status=failed&type=balance`;

        const phoneDigits = (enr.student_phone || '').replace(/\D/g, '');
        const areaCode = phoneDigits.slice(0, 2);
        const phoneNumber = phoneDigits.slice(2);
        const cpfDigits = (enr.student_cpf || '').replace(/\D/g, '');
        const roundedAmount = Math.round(amount * 100) / 100;

        const payload: any = {
            items: [{
                id: enr.course_id,
                title: `${courseTitle} — Saldo restante`,
                unit_price: roundedAmount,
                quantity: 1,
                currency_id: 'BRL'
            }],
            payer: {
                name: enr.student_name || 'Aluno',
                email: enr.student_email,
                ...(phoneDigits.length >= 10 && { phone: { area_code: areaCode, number: phoneNumber } }),
                ...(cpfDigits.length === 11 && { identification: { type: 'CPF', number: cpfDigits } })
            },
            back_urls: { success: successUrl, failure: failureUrl, pending: pendingUrl },
            notification_url: `${origin}/api/mercadopago-webhook`,
            external_reference: enrollmentId,
            metadata: { enrollment_id: enrollmentId, payment_type: 'balance' },
            statement_descriptor: 'WTECH'
        };

        const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${mpToken}` },
            body: JSON.stringify(payload)
        });

        const data = await mpRes.json();
        if (!mpRes.ok || !data.id) {
            const errMsg = data.message || data.error || JSON.stringify(data);
            console.error('[MP Balance] MP API error:', errMsg);
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
        console.error('[MP Balance] Unexpected error:', error?.message);
        return res.status(500).json({ error: error?.message });
    }
}
