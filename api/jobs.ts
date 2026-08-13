import { processDueFlowEnrollments } from './_flows.js';
import { processBalanceReminders } from './_balance.js';
import { processActiveCampaigns } from './_campaigns.js';
import { sendEmail, sendTemplate } from './_email.js';
import { isCronAuthorized, denyCron } from './_cron.js';
import { getServiceClient, requireSameOrigin, UUID_RE } from './_auth.js';
import { requireStaffOrS2SPermission } from './_s2s.js';
import glossary from './_glossary.js';

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
 *   /api/glossary            → /api/jobs?task=glossary
 *   /api/jobs?task=rh-email  → e-mail de RH disparado pelo ERP (cron, sem ator)
 */
export default async function handler(req: any, res: any) {
    const task = String(req.query?.task || '');
    switch (task) {
        case 'process-email-flows': return processEmailFlows(req, res);
        case 'balance-reminders': return balanceReminders(req, res);
        case 'process-campaigns': return processCampaigns(req, res);
        case 'send-test-email': return sendTestEmail(req, res);
        case 'glossary': return glossary(req, res);
        case 'rh-email': return rhEmail(req, res);
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

    // Só Bearer CRON_SECRET (ver api/_cron.ts) — bloqueia disparo público.
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

    // Só Bearer CRON_SECRET (ver api/_cron.ts) — bloqueia disparo público.
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

    // Só Bearer CRON_SECRET (ver api/_cron.ts) — bloqueia disparo público.
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

    // Antes deste corte, esta tarefa era pública — qualquer um conseguia
    // disparar e-mail pra endereço arbitrário usando a infra de Brevo do
    // site (abuso de relay/spam). Agora exige staff (browser, CSRF) ou S2S,
    // com a permissão de configurações (é o botão "Testar" de Integrações).
    const svcHeader = String(req.headers?.['x-wtech-svc'] || '');
    if (!svcHeader && !requireSameOrigin(req, res)) return;
    if (!(await requireStaffOrS2SPermission(req, res, 'manage_settings'))) return;

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

const MAX_SUBJECT_LENGTH = 250;
const MAX_HTML_LENGTH = 200_000;
const IDEMPOTENCY_CHECK_TIMEOUT_MS = 8_000;

function withTimeout<T>(p: PromiseLike<T>, ms: number, label: string): Promise<T> {
    return Promise.race([
        Promise.resolve(p),
        new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`${label} excedeu ${ms}ms`)), ms)),
    ]);
}

/**
 * E-mail de RH disparado pelo ERP/Gestão — cron (Bearer CRON_SECRET), SEM
 * ator (não é uma ação de um usuário específico do site, é o ERP mandando
 * enviar um e-mail já decidido do lado dele).
 *
 * POST { idempotencia: string (UUID), destinatario: string, assunto: string, html: string }
 * Aliases aceitos (mesma validação, sem enfraquecer): `to` por `destinatario`,
 * `subject` por `assunto` — só pra compatibilidade de transição do lado ERP.
 *
 * Idempotência ATÔMICA via claim (migration 0092, RPCs `site_email_claim` /
 * `site_email_claim_concluir` — SECURITY DEFINER, exclusivas de service_role,
 * sobre `gestao.site_email_claims`, nunca lida direto). Fluxo:
 *   1. `site_email_claim('rh:'+idempotencia)` — ANTES de qualquer SMTP.
 *      - 'concluido'      → já enviado antes; responde sucesso SEM chamar SMTP.
 *      - 'em_processamento' → outro processo detém o lease agora; responde
 *        409 (retryable — NÃO é falha definitiva, o ERP deve tentar de novo).
 *      - 'ganhou'         → detém o claim (claim_id + claim_versao, um
 *        fencing token); segue pro SMTP.
 *   2. SMTP via `sendEmail` (nunca lança — sempre volta {sent,error?}).
 *   3. SEMPRE (sucesso OU exceção — `finally`) conclui o claim:
 *      `site_email_claim_concluir(claim_id, claim_versao, 'sent'|'failed', erro?)`.
 *      'sent' trava a chave pra sempre; 'failed' libera retry imediato (sem
 *      esperar o TTL de 15min). Se o próprio `concluir` falhar (banco fora
 *      no meio da chamada), loga como CRÍTICO — a chave só destrava quando o
 *      lease vencer; a resposta ao ERP já reflete o resultado real do SMTP
 *      (nunca inventamos sucesso só porque concluir falhou).
 *
 * A chamada de claim em si é FAIL-CLOSED: erro/timeout nela nega o envio
 * (503, SMTP nunca é chamado) — nunca manda às cegas sem saber se já foi
 * enviado ou se outro processo já está enviando.
 */
const RH_EMAIL_CLAIM_PREFIX = 'rh:';

interface EmailClaimRow {
    resultado: 'ganhou' | 'concluido' | 'em_processamento' | string;
    claim_id: string;
    claim_versao: number;
    status_atual: string;
}

async function rhEmail(req: any, res: any) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    if (!isCronAuthorized(req)) return denyCron(res);

    const idempotencia = String(req.body?.idempotencia || '').trim();
    const destinatario = String(req.body?.destinatario ?? req.body?.to ?? '').trim();
    const assunto = String(req.body?.assunto ?? req.body?.subject ?? '').trim();
    const html = String(req.body?.html || '');

    if (!UUID_RE.test(idempotencia)) {
        return res.status(400).json({ sent: false, error: 'idempotencia inválida (precisa ser UUID)' });
    }
    if (!destinatario || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(destinatario)) {
        return res.status(400).json({ sent: false, error: 'Destinatário inválido.' });
    }
    if (!assunto || assunto.length > MAX_SUBJECT_LENGTH) {
        return res.status(400).json({ sent: false, error: 'Assunto inválido.' });
    }
    if (!html || html.length > MAX_HTML_LENGTH) {
        return res.status(400).json({ sent: false, error: 'Corpo do e-mail inválido.' });
    }

    const claimKey = `${RH_EMAIL_CLAIM_PREFIX}${idempotencia}`;
    const supabase = getServiceClient();
    if (!supabase) {
        console.error('[rh-email] Supabase indisponível.');
        return res.status(503).json({ sent: false, error: 'supabase_unavailable' });
    }

    let claim: EmailClaimRow;
    try {
        const { data, error } = await withTimeout(
            supabase.rpc('site_email_claim', { p_chave: claimKey }),
            IDEMPOTENCY_CHECK_TIMEOUT_MS,
            'site_email_claim'
        );
        if (error) throw error;
        const rows: EmailClaimRow[] = Array.isArray(data) ? data : data ? [data] : [];
        if (!rows[0]?.resultado) throw new Error('site_email_claim retornou vazio/sem resultado');
        claim = rows[0];
    } catch (e: any) {
        // Fail-closed: erro/timeout no claim nunca deixa passar pro envio.
        console.error('[rh-email] Falha ao reivindicar claim — negando envio (fail-closed):', e?.message);
        return res.status(503).json({ sent: false, error: 'claim_check_failed' });
    }

    if (claim.resultado === 'concluido') {
        return res.status(200).json({ sent: false, skipped: 'already sent' });
    }
    if (claim.resultado === 'em_processamento') {
        // 409 (Conflict): lease ativa de outro processo — sinaliza "tente de
        // novo mais tarde", não uma falha definitiva. Corpo replica a mesma
        // semântica (retry:true) pra clientes que não diferenciam por status.
        return res.status(409).json({ sent: false, retry: true, error: 'processing' });
    }
    if (claim.resultado !== 'ganhou') {
        console.error(`[rh-email] site_email_claim devolveu resultado inesperado: ${claim.resultado}`);
        return res.status(503).json({ sent: false, error: 'claim_unexpected_result' });
    }

    // 'ganhou' — detém o claim (claim_id/claim_versao = fencing token). SMTP
    // e SEMPRE conclui (sent/failed), mesmo em exceção — nunca deixa o claim
    // pendurado em 'processando' por um caminho que "esqueceu" de concluir.
    let result: { sent: boolean; error?: string; skipped?: string } = { sent: false, error: 'not_attempted' };
    try {
        result = await sendEmail({ to: destinatario, subject: assunto, html, type: claimKey });
    } catch (e: any) {
        result = { sent: false, error: e?.message || 'erro desconhecido no envio' };
    } finally {
        try {
            const { data: concluded, error: concludeError } = await supabase.rpc('site_email_claim_concluir', {
                p_claim_id: claim.claim_id,
                p_claim_versao: claim.claim_versao,
                p_status: result.sent ? 'sent' : 'failed',
                p_erro: result.sent ? null : result.error || result.skipped || 'falha desconhecida',
            });
            if (concludeError) throw concludeError;
            if (concluded === false) {
                // Fencing não bateu (outro processo já retomou o lease) ou o
                // claim já não estava 'processando' — NÃO é erro (contrato
                // explícito da RPC): só loga pra observabilidade, não reenvia,
                // não muda a resposta já computada a partir do resultado real do SMTP.
                console.log(`[rh-email] site_email_claim_concluir devolveu false (fencing) pra ${claimKey} — claim já não era mais nosso.`);
            }
        } catch (concludeErr: any) {
            // Não pode ser silenciado: se concluir falhar, a chave só destrava
            // quando o lease de 15min vencer — resposta ao ERP já reflete o
            // resultado real do SMTP, não inventa sucesso por causa disso.
            console.error(
                '[rh-email] CRÍTICO: falha ao concluir claim após SMTP — chave trava até o TTL vencer:',
                concludeErr?.message,
                { claimKey, claim_id: claim.claim_id }
            );
        }
    }

    return res.status(result.sent || result.skipped ? 200 : 502).json(result);
}
