import { processBalanceReminders } from './_balance.js';
import { isCronAuthorized, denyCron } from './_cron.js';

/**
 * Vercel Serverless Function — Lembretes de saldo pendente (e-mail + WhatsApp).
 * URL: /api/balance-reminders
 *
 * O disparo automático acontece via cron de /api/process-email-flows (o plano
 * Hobby limita a 2 crons). Esta rota existe para:
 *   - Teste manual:   POST /api/balance-reminders
 *   - Prévia (dry run): GET/POST /api/balance-reminders?dryRun=1
 */
export default async function handler(req: any, res: any) {
    if (req.method !== 'GET' && req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Só cron da Vercel ou chamada com CRON_SECRET — bloqueia disparo público.
    if (!isCronAuthorized(req)) return denyCron(res);

    const dryRun = req.query?.dryRun === '1' || req.body?.dryRun === true;

    try {
        const result = await processBalanceReminders(30, dryRun);
        console.log(`[Saldo] dryRun=${dryRun} escopo=${result.scope || 'auto'} elegíveis=${result.eligible} emails=${result.emailsSent} whatsapp=${result.whatsappSent} erros=${result.errors}`);
        return res.status(200).json({ ok: true, dryRun, ...result, ts: new Date().toISOString() });
    } catch (e: any) {
        console.error('[Saldo] Erro no processamento:', e?.message);
        return res.status(500).json({ ok: false, error: e?.message });
    }
}
