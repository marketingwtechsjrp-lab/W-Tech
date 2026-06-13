import { processDueFlowEnrollments } from './_flows.js';
import { processBalanceReminders } from './_balance.js';
import { processActiveCampaigns } from './_campaigns.js';

/**
 * Vercel Serverless Function — Processador diário de automações de e-mail.
 * URL: /api/process-email-flows
 *
 * Acionado pelo cron da Vercel (ver vercel.json). Também pode ser chamado
 * manualmente (GET/POST). Executa, em sequência:
 *   1. Fluxos de follow-up (SITE_EmailFlows / SITE_FlowEnrollments)
 *   2. Lembretes de saldo pendente (e-mail + WhatsApp) — ver api/_balance.ts
 *   3. Campanhas de marketing em andamento (e-mail + WhatsApp) — ver api/_campaigns.ts
 * (O plano Hobby da Vercel limita a 2 crons, por isso compartilham o horário.)
 */
export default async function handler(req: any, res: any) {
    if (req.method !== 'GET' && req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const result = await processDueFlowEnrollments(50);
        console.log(`[Flows] Processadas=${result.processed} enviadas=${result.sent} erros=${result.errors}`);

        // Lembretes de saldo pendente — não-fatal: erro aqui não derruba os fluxos
        let balance: Record<string, unknown> = {};
        try {
            const b = await processBalanceReminders(30);
            console.log(`[Saldo] elegíveis=${b.eligible} emails=${b.emailsSent} whatsapp=${b.whatsappSent} erros=${b.errors}`);
            balance = { eligible: b.eligible, emailsSent: b.emailsSent, whatsappSent: b.whatsappSent, errors: b.errors, skipped: b.skipped };
        } catch (e: any) {
            console.error('[Saldo] Erro nos lembretes de saldo (não-fatal):', e?.message);
            balance = { error: e?.message };
        }

        // Campanhas de marketing em andamento — não-fatal
        let campaigns: Record<string, unknown> = {};
        try {
            const c = await processActiveCampaigns();
            console.log(`[Campanhas] processadas=${c.campaignsProcessed} emails=${c.emailsSent} whatsapp=${c.whatsappSent} falhas=${c.failed}`);
            campaigns = { campaignsProcessed: c.campaignsProcessed, emailsSent: c.emailsSent, whatsappSent: c.whatsappSent, failed: c.failed, skipped: c.skipped };
        } catch (e: any) {
            console.error('[Campanhas] Erro no processamento (não-fatal):', e?.message);
            campaigns = { error: e?.message };
        }

        return res.status(200).json({ ok: true, ...result, balanceReminders: balance, campaigns, ts: new Date().toISOString() });
    } catch (e: any) {
        console.error('[Flows] Erro no processamento:', e?.message);
        return res.status(500).json({ ok: false, error: e?.message });
    }
}
