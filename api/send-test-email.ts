import { sendTemplate } from './_email.js';

/**
 * Vercel Serverless Function — Envio de e-mail de teste do Brevo.
 * URL: /api/send-test-email
 * POST { to: "destino@email.com" }
 *
 * Usada pelo botão "Testar" no painel admin (AdminIntegrations).
 */
export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const to = (req.body?.to as string | undefined)?.trim();
    if (!to || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) {
        return res.status(400).json({ error: 'E-mail de destino inválido.' });
    }

    try {
        const result = await sendTemplate(
            to,
            'teste',
            { sentAt: new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) },
            { type: 'test' }
        );

        if (result.sent) {
            return res.status(200).json({ sent: true });
        }
        return res.status(result.skipped ? 200 : 502).json({
            sent: false,
            error: result.error || result.skipped || 'Falha no envio'
        });
    } catch (e: any) {
        console.error('[send-test-email] erro:', e?.message);
        return res.status(500).json({ sent: false, error: e?.message });
    }
}
