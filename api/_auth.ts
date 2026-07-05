import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Autorização server-side (helper compartilhado).
 *
 * FASE 1 (interina): `isKnownUser` valida o header `x-wtech-user-id` contra a
 * tabela SITE_Users (mesmo padrão já usado em notify-students). É fraco (um ID
 * é adivinhável), mas fecha o acesso público a ações administrativas enquanto a
 * FASE 2 não substitui por token de sessão (Authorization: Bearer + SITE_Sessions).
 *
 * Quando a FASE 2 chegar, `requireAdmin`/`requireUser` passam a validar o token
 * aqui, e os endpoints não precisam mudar de assinatura.
 */

let cached: SupabaseClient | null = null;

/** Cliente service_role (bypassa RLS) — só no servidor. */
export function getServiceClient(): SupabaseClient | null {
  if (cached) return cached;
  const url = process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  cached = createClient(url, serviceKey);
  return cached;
}

/**
 * Interina: confirma que o header `x-wtech-user-id` corresponde a um usuário
 * existente e ativo em SITE_Users. Devolve o id do usuário, ou null.
 */
export async function isKnownUser(req: any): Promise<string | null> {
  try {
    const userId = String(req.headers?.['x-wtech-user-id'] || '').trim();
    if (!userId) return null;
    const supabase = getServiceClient();
    if (!supabase) return null;
    const { data, error } = await supabase
      .from('SITE_Users')
      .select('id, status')
      .eq('id', userId)
      .maybeSingle();
    if (error || !data) return null;
    if (data.status && String(data.status).toLowerCase() === 'inactive') return null;
    return String(data.id);
  } catch {
    return null;
  }
}

/** Resposta padrão de bloqueio. */
export function denyAuth(res: any) {
  return res.status(401).json({ success: false, error: 'Não autorizado' });
}
