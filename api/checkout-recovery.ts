import { createClient } from '@supabase/supabase-js';
import { recoverLeadToRoulette } from './_roleta.js';

/**
 * Vercel Serverless Function — Recuperação de Checkout Abandonado/Falho
 * URL: /api/checkout-recovery
 *
 * POST { enrollmentId } → devolve o lead daquela inscrição para a roleta de atendentes
 *                         (chamado pela página de checkout quando o pagamento falha).
 * GET                   → varredura (cron diário): inscrições Mercado Pago paradas em
 *                         Pending há mais de 1h (e menos de 7 dias) voltam para a roleta.
 */

const SWEEP_MIN_AGE_MS = 60 * 60 * 1000; // 1 hora
const SWEEP_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias

export default async function handler(req: any, res: any) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('[Checkout Recovery] Missing env vars');
    return res.status(500).json({ error: 'System configuration error' });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // ── POST: recuperação pontual (falha de pagamento no retorno do MP) ──────
    if (req.method === 'POST') {
      const { enrollmentId } = req.body || {};
      if (!enrollmentId) {
        return res.status(400).json({ error: 'enrollmentId obrigatório' });
      }

      const { data: enrollment, error } = await supabase
        .from('SITE_Enrollments')
        .select('id, status, student_email, student_phone, student_name')
        .eq('id', enrollmentId)
        .single();

      if (error || !enrollment) {
        return res.status(404).json({ error: 'Inscrição não encontrada' });
      }

      const result = await recoverLeadToRoulette(supabase, enrollment, 'Pagamento falhou no Mercado Pago (retorno de erro do checkout)');
      return res.status(200).json({ ok: true, ...result });
    }

    // ── GET: varredura de abandonos (cron) ────────────────────────────────────
    if (req.method === 'GET') {
      const now = Date.now();
      const minCreated = new Date(now - SWEEP_MAX_AGE_MS).toISOString();
      const maxCreated = new Date(now - SWEEP_MIN_AGE_MS).toISOString();

      const { data: stale, error } = await supabase
        .from('SITE_Enrollments')
        .select('id, status, student_email, student_phone, student_name, created_at')
        .eq('status', 'Pending')
        .eq('payment_method', 'Mercado Pago')
        .gte('created_at', minCreated)
        .lte('created_at', maxCreated)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('[Checkout Recovery] Sweep query error:', error);
        return res.status(500).json({ error: error.message });
      }

      const results: any[] = [];
      for (const enrollment of stale || []) {
        const result = await recoverLeadToRoulette(
          supabase,
          enrollment,
          `Checkout abandonado — inscrição Pending desde ${enrollment.created_at}`
        );
        results.push({ enrollment_id: enrollment.id, ...result });
      }

      const recoveredCount = results.filter(r => r.recovered).length;
      console.log(`[Checkout Recovery] Sweep: ${stale?.length || 0} pendentes analisados, ${recoveredCount} leads devolvidos à roleta.`);
      return res.status(200).json({ ok: true, analyzed: stale?.length || 0, recovered: recoveredCount, results });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    console.error('[Checkout Recovery] Unexpected error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
