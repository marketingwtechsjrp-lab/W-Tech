import { createClient } from '@supabase/supabase-js';
import { processNotify, type NotifyAction, type NotifyChannel } from './_notify.js';
import { previewSystemReport, sendSystemReport } from './_report.js';

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
 *         OU header x-wtech-user-id de um usuário existente (painel admin).
 *   mode 'preview' devolve { text } sem enviar; force ignora o toggle.
 *
 * Acionado pelo painel admin (lista de inscritos): cobrança individual,
 * cobrança de todos os devedores e envio de informações do curso em massa.
 * Reaproveita os motores de e-mail (Brevo) e WhatsApp (instância de automação).
 */
const VALID_ACTIONS: NotifyAction[] = ['balance', 'course-info'];
const VALID_CHANNELS: NotifyChannel[] = ['whatsapp', 'email', 'both'];

/** Cron (Bearer CRON_SECRET) ou usuário existente do painel (SITE_Users). */
async function isAuthorized(req: any): Promise<boolean> {
    const secret = (process.env.CRON_SECRET || '').trim();
    const auth = String(req.headers?.['authorization'] || '');
    if (secret && auth === `Bearer ${secret}`) return true;

    try {
        const userId = String(req.headers?.['x-wtech-user-id'] || '').trim();
        if (!userId) return false;
        const url = process.env.VITE_SUPABASE_URL;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!url || !serviceKey) return false;
        const supabase = createClient(url, serviceKey);
        const { data, error } = await supabase
            .from('SITE_Users')
            .select('id, status')
            .eq('id', userId)
            .maybeSingle();
        if (error || !data) return false;
        if (data.status && String(data.status).toLowerCase() === 'inactive') return false;
        return true;
    } catch {
        return false;
    }
}

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const action = req.body?.action as string | undefined;

    // ── Relatório diário do sistema (grupo do dono) ──────────────────────────
    if (action === 'system-report') {
        if (!(await isAuthorized(req))) {
            return res.status(401).json({ ok: false, error: 'Não autorizado' });
        }
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

    // ── Disparo manual para alunos de um curso ───────────────────────────────
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
