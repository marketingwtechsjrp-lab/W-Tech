import { processDueFlowEnrollments } from './_flows.js';
import { processBalanceReminders } from './_balance.js';
import { processActiveCampaigns } from './_campaigns.js';
import { sendTemplate } from './_email.js';
import { isCronAuthorized, denyCron } from './_cron.js';

/**
 * Vercel Serverless Function — Despachante de tarefas de cron/admin.
 * URL: /api/jobs?task=<nome>
 *
 * Consolida 4 rotas finas em uma única função por causa do limite de
 * 12 funções serverless por deploy no plano Hobby da Vercel (a v3.23.1
 * estourou o limite e os deploys passaram a falhar). As URLs antigas
 * continuam funcionando via rewrites no vercel.json:
 *   /api/process-email-flows → /api/jobs?task=process-email-flows
 *   /api/balance-reminders   → /api/jobs?task=balance-reminders
 *   /api/process-campaigns   → /api/jobs?task=process-campaigns
 *   /api/send-test-email     → /api/jobs?task=send-test-email
 */
export default async function handler(req: any, res: any) {
    const task = String(req.query?.task || '');
    switch (task) {
        case 'process-email-flows': return processEmailFlows(req, res);
        case 'balance-reminders': return balanceReminders(req, res);
        case 'process-campaigns': return processCampaigns(req, res);
        case 'send-test-email': return sendTestEmail(req, res);
        default: return res.status(404).json({ error: 'Tarefa desconhecida' });
    }
}

/**
 * Processador diário de automações de e-mail (cron da Vercel — ver vercel.json).
 * Também pode ser chamado manualmente (GET/POST). Executa, em sequência:
 *   1. Fluxos de follow-up (SITE_EmailFlows / SITE_FlowEnrollments)
 *   2. Lembretes de saldo pendente (e-mail + WhatsApp) — ver api/_balance.ts
 *   3. Campanhas de marketing em andamento (e-mail + WhatsApp) — ver api/_campaigns.ts
 */
async function processEmailFlows(req: any, res: any) {
    if (req.method !== 'GET' && req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Só cron da Vercel ou chamada com CRON_SECRET — bloqueia disparo público.
    if (!isCronAuthorized(req)) return denyCron(res);

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

/**
 * Lembretes de saldo pendente (e-mail + WhatsApp).
 * O disparo automático acontece via cron de process-email-flows. Esta rota existe para:
 *   - Teste manual:    POST /api/balance-reminders
 *   - Prévia (dry run): GET/POST /api/balance-reminders?dryRun=1
 */
async function balanceReminders(req: any, res: any) {
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

/**
 * Disparo de campanhas de marketing (manual — ex.: botão "Disparar agora" no admin).
 * O disparo automático acontece no cron de process-email-flows.
 */
async function processCampaigns(req: any, res: any) {
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

/**
 * Envio de e-mail de teste do Brevo.
 * POST { to: "destino@email.com" } — usada pelo botão "Testar" no admin (AdminIntegrations).
 */
async function sendTestEmail(req: any, res: any) {
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
