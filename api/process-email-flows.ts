import { processDueFlowEnrollments } from './_flows.js';

/**
 * Vercel Serverless Function — Processador de fluxos de e-mail (follow-up).
 * URL: /api/process-email-flows
 *
 * Acionado pelo cron da Vercel (ver vercel.json). Também pode ser chamado
 * manualmente (GET/POST) para processar a fila de inscrições devidas.
 */
export default async function handler(req: any, res: any) {
    if (req.method !== 'GET' && req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const result = await processDueFlowEnrollments(50);
        console.log(`[Flows] Processadas=${result.processed} enviadas=${result.sent} erros=${result.errors}`);
        return res.status(200).json({ ok: true, ...result, ts: new Date().toISOString() });
    } catch (e: any) {
        console.error('[Flows] Erro no processamento:', e?.message);
        return res.status(500).json({ ok: false, error: e?.message });
    }
}
