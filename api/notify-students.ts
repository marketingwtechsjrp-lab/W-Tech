import { isSameOriginRequest } from './_auth.js';
import { requireStaffOrS2SPermission } from './_s2s.js';
import { isCronAuthorized } from './_cron.js';
import { processNotify, type NotifyAction, type NotifyChannel } from './_notify.js';
import { previewSystemReport, sendSystemReport } from './_report.js';
import { previewAgentsReport, sendAgentsReport } from './_agentsReport.js';
import { answerGroupQuestion } from './_aiGroupBot.js';

/**
 * Vercel Serverless Function — Disparo manual de mensagens para alunos
 * e relatório diário do sistema (compartilham a rota por causa do limite
 * de 12 funções serverless do plano Hobby da Vercel).
 * URL: /api/notify-students
 *
 * POST {
 *   courseId: string,
 *   action: 'balance' | 'course-info',
 *   channel: 'whatsapp' | 'email' | 'both',
 *   enrollmentId?: string   // ausente = todos os alunos elegíveis do curso
 * }
 *
 * POST { action: 'system-report', mode?: 'preview' | 'send', force?: boolean }
 *   → relatório diário para o grupo do dono (categoria 'report' do dispatcher).
 *   Auth: Authorization: Bearer <CRON_SECRET> (cron do GitHub Actions)
 *         OU sessão de staff httpOnly válida (painel admin — ver api/_auth.ts).
 *   mode 'preview' devolve { text } sem enviar; force ignora o toggle.
 *
 * POST { action: 'ai-agents-report', mode?: 'preview' | 'send', force?: boolean }
 *   → relatório consolidado dos Assistentes de IA (Léo/Bia/Rita/Sofia), mesmo
 *     grupo e mesmo toggle wa_report_*. Usado pelo cron diário (GitHub Actions)
 *     e pelo botão "Testar Envio Agora" do módulo Assistentes de IA (admin).
 *
 * POST { action: 'ai-group-ask', question: string, send?: boolean }
 *   → sandbox do bot do grupo: roteia a pergunta para a persona certa e devolve
 *     { agent, answer } SEM enviar no WhatsApp (send: true envia no grupo).
 *
 * Acionado pelo painel admin (lista de inscritos): cobrança individual,
 * cobrança de todos os devedores e envio de informações do curso em massa.
 * Reaproveita os motores de e-mail (Brevo) e WhatsApp (instância de automação).
 *
 * Auth de todas as ações (exceto o bypass de cron nas duas de relatório):
 * sessão de staff httpOnly same-origin OU chamada S2S assinada do ERP
 * (x-wtech-svc + HMAC — ver api/_s2s.ts), ambas exigindo a permissão
 * `courses_view_reports`.
 */
const VALID_ACTIONS: NotifyAction[] = ['balance', 'course-info'];
const VALID_CHANNELS: NotifyChannel[] = ['whatsapp', 'email', 'both'];

/**
 * Cron (Bearer CRON_SECRET — imune a CSRF, não depende de cookie) autoriza
 * direto (só as ações de relatório usam isso, chamadas pelo GitHub Actions).
 * S2S (x-wtech-svc) pula o gate CSRF — não é um browser, não tem Origin/
 * Sec-Fetch-Site, é autorizado pela assinatura HMAC dentro de
 * requireStaffOrS2SPermission. Chamada de browser exige gate CSRF same-origin
 * (fail-closed: o cookie sozinho não basta) + sessão de staff. Nos dois
 * casos (staff ou S2S) a mesma permissão `courses_view_reports` é exigida.
 * Já responde 401/403/origin_not_allowed — o caller só precisa checar
 * `if (!(await authorize(req, res))) return;`.
 */
async function authorize(req: any, res: any): Promise<boolean> {
    // Mesmo guard fail-closed/timing-safe/sem-trim de todas as rotas de
    // automação — ver api/_cron.ts (evita duplicar a lógica e divergir dela).
    if (isCronAuthorized(req)) return true;

    const svcHeader = String(req.headers?.['x-wtech-svc'] || '');
    if (!svcHeader && !isSameOriginRequest(req)) {
        res.status(403).json({ ok: false, error: 'origin_not_allowed' });
        return false;
    }
    const staff = await requireStaffOrS2SPermission(req, res, 'courses_view_reports');
    return Boolean(staff);
}

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const action = req.body?.action as string | undefined;

    // ── Relatório diário do sistema (grupo do dono) ──────────────────────────
    if (action === 'system-report') {
        if (!(await authorize(req, res))) return;
        try {
            if (req.body?.mode === 'preview') {
                const { text } = await previewSystemReport();
                return res.status(200).json({ ok: true, text });
            }
            const result = await sendSystemReport({ force: req.body?.force === true });
            return res.status(result.sent || result.skipped ? 200 : 500).json({ ok: result.sent, ...result });
        } catch (e: any) {
            console.error('[notify-students] system-report erro:', e?.message);
            return res.status(500).json({ ok: false, error: e?.message });
        }
    }

    // ── Relatório consolidado dos Assistentes de IA (Léo/Bia/Rita/Sofia) ─────
    if (action === 'ai-agents-report') {
        if (!(await authorize(req, res))) return;
        try {
            if (req.body?.mode === 'preview') {
                const { text } = await previewAgentsReport();
                return res.status(200).json({ ok: true, text });
            }
            const result = await sendAgentsReport({ force: req.body?.force === true });
            return res.status(result.sent || result.skipped ? 200 : 500).json({ ok: result.sent, ...result });
        } catch (e: any) {
            console.error('[notify-students] ai-agents-report erro:', e?.message);
            return res.status(500).json({ ok: false, error: e?.message });
        }
    }

    // ── Sandbox do bot do grupo (Assistentes de IA) ──────────────────────────
    if (action === 'ai-group-ask') {
        if (!(await authorize(req, res))) return;
        const question = String(req.body?.question || '').trim();
        if (!question) return res.status(400).json({ ok: false, error: 'question é obrigatório' });
        try {
            const result = await answerGroupQuestion(question, 'Sandbox (painel admin)', {
                dryRun: req.body?.send !== true,
            });
            return res.status(result.error ? 500 : 200).json({ ok: !result.error, ...result });
        } catch (e: any) {
            console.error('[notify-students] ai-group-ask erro:', e?.message);
            return res.status(500).json({ ok: false, error: e?.message });
        }
    }

    // ── Disparo manual para alunos de um curso ───────────────────────────────
    // Antes deste corte, este caminho não tinha auth nenhuma — qualquer um
    // conseguia disparar cobrança/aviso em massa pra alunos de qualquer curso.
    if (!(await authorize(req, res))) return;

    const courseId = (req.body?.courseId as string | undefined)?.trim();
    const channel = req.body?.channel as NotifyChannel | undefined;
    const enrollmentId = (req.body?.enrollmentId as string | undefined)?.trim() || undefined;

    if (!courseId) return res.status(400).json({ error: 'courseId é obrigatório' });
    if (!action || !VALID_ACTIONS.includes(action as NotifyAction)) return res.status(400).json({ error: 'action inválido' });
    if (!channel || !VALID_CHANNELS.includes(channel)) return res.status(400).json({ error: 'channel inválido' });

    try {
        const result = await processNotify({ courseId, action: action as NotifyAction, channel, enrollmentId });
        return res.status(result.ok ? 200 : 400).json(result);
    } catch (e: any) {
        console.error('[notify-students] erro:', e?.message);
        return res.status(500).json({ ok: false, error: e?.message });
    }
}
