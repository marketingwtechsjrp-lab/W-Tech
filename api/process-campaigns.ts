import { processActiveCampaigns } from './_campaigns.js';
import { isCronAuthorized, denyCron } from './_cron.js';

/**
 * Vercel Serverless Function — Disparo de campanhas de marketing.
 * URL: /api/process-campaigns
 *
 * O disparo automático acontece no cron de /api/process-email-flows. Esta rota
 * existe para acionar o processamento manualmente (ex.: botão "Disparar agora"
 * no admin) sem precisar manter a aba do navegador aberta.
 */
export default async function handler(req: any, res: any) {
    if (req.method !== 'GET' && req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Só cron da Vercel ou chamada com CRON_SECRET — bloqueia disparo público.
    if (!isCronAuthorized(req)) return denyCron(res);

    try {
        const result = await processActiveCampaigns();
        console.log(`[Campanhas] processadas=${result.campaignsProcessed} emails=${result.emailsSent} whatsapp=${result.whatsappSent} falhas=${result.failed}`);
        return res.status(200).json({ ok: true, ...result, ts: new Date().toISOString() });
    } catch (e: any) {
        console.error('[Campanhas] Erro:', e?.message);
        return res.status(500).json({ ok: false, error: e?.message });
    }
}
