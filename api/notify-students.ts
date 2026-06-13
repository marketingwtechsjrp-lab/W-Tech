import { processNotify, type NotifyAction, type NotifyChannel } from './_notify.js';

/**
 * Vercel Serverless Function — Disparo manual de mensagens para alunos.
 * URL: /api/notify-students
 *
 * POST {
 *   courseId: string,
 *   action: 'balance' | 'course-info',
 *   channel: 'whatsapp' | 'email' | 'both',
 *   enrollmentId?: string   // ausente = todos os alunos elegíveis do curso
 * }
 *
 * Acionado pelo painel admin (lista de inscritos): cobrança individual,
 * cobrança de todos os devedores e envio de informações do curso em massa.
 * Reaproveita os motores de e-mail (Brevo) e WhatsApp (instância de automação).
 */
const VALID_ACTIONS: NotifyAction[] = ['balance', 'course-info'];
const VALID_CHANNELS: NotifyChannel[] = ['whatsapp', 'email', 'both'];

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const courseId = (req.body?.courseId as string | undefined)?.trim();
    const action = req.body?.action as NotifyAction | undefined;
    const channel = req.body?.channel as NotifyChannel | undefined;
    const enrollmentId = (req.body?.enrollmentId as string | undefined)?.trim() || undefined;

    if (!courseId) return res.status(400).json({ error: 'courseId é obrigatório' });
    if (!action || !VALID_ACTIONS.includes(action)) return res.status(400).json({ error: 'action inválido' });
    if (!channel || !VALID_CHANNELS.includes(channel)) return res.status(400).json({ error: 'channel inválido' });

    try {
        const result = await processNotify({ courseId, action, channel, enrollmentId });
        return res.status(result.ok ? 200 : 400).json(result);
    } catch (e: any) {
        console.error('[notify-students] erro:', e?.message);
        return res.status(500).json({ ok: false, error: e?.message });
    }
}
