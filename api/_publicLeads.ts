import type { SupabaseClient } from '@supabase/supabase-js';
import { createIpRateLimiter, getServiceClient, requireSameOrigin, setNoStoreHeaders } from './_auth.js';
import { enrollContactInFlows } from './_flows.js';
import { findExistingLead, upsertLead } from '../lib/leadMatch.js';
import { isUuid, sanitizeCpf, sanitizeLeadFields, sanitizeQuizResult } from '../lib/publicLeads.js';

/**
 * Leads vindos das páginas públicas — POST /api/public-leads { action, ... }.
 *
 *   'upsert'   → recadastro com dedupe (LPs, quiz): devolve só o id e o que aconteceu
 *   'create'   → insert simples de quem precisa do id para seguir o fluxo
 *   'quiz'     → resultado do quiz na ficha já criada { id, result }
 *   'checkout' → dados do checkout Lisboa { id?, lead, cpf }
 *
 * A resposta nunca traz dado da ficha: quem manda o e-mail de outra pessoa aqui não
 * recebe telefone, tags nem dono. O id só serve para seguir o fluxo (ver a consulta de
 * matrícula por lead em api/_publicEnrollments.ts, que também não devolve contato).
 */

const limitador = createIpRateLimiter({ windowMs: 60_000, maxAttempts: 30 });
const ERRO_GENERICO = 'Não foi possível registrar seus dados. Tente novamente.';
const DADOS_INVALIDOS = 'Confira nome e contato e tente novamente.';

/**
 * O webhook de lead (automações do CRM) sai daqui e não do navegador: no recadastro ele
 * leva tags e dono da ficha existente, que o visitante não pode ver.
 */
async function dispararWebhookLead(supabase: SupabaseClient, dados: Record<string, unknown>): Promise<void> {
  try {
    const { data } = await supabase.from('SITE_SystemSettings').select('value').eq('key', 'webhook_lead').maybeSingle();
    const url = data?.value;
    if (typeof url !== 'string' || !url.startsWith('http')) return;
    // text/plain: mesmo formato que os webhooks já recebiam do navegador (lib/webhooks.ts).
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ timestamp: new Date().toISOString(), event: 'webhook_lead', data: dados }),
      signal: AbortSignal.timeout(5000),
    });
  } catch (erro) {
    console.error('[public-leads] Webhook de lead falhou (não-fatal):', (erro as Error).message);
  }
}

/** Lead novo entra nos fluxos de boas-vindas. Falha aqui não atrapalha o cadastro. */
async function inscreverNosFluxos(supabase: SupabaseClient, lead: { name: string; email?: string | null }): Promise<void> {
  if (!lead.email) return;
  try {
    await enrollContactInFlows({ email: lead.email, name: lead.name, triggerType: 'NovoCadastro', client: supabase });
  } catch (erro) {
    console.error('[public-leads] Inscrição em fluxo falhou (não-fatal):', (erro as Error).message);
  }
}

async function acaoUpsert(supabase: SupabaseClient, req: any, res: any) {
  const lead = sanitizeLeadFields(req.body?.lead);
  if (!lead) return res.status(400).json({ error: DADOS_INVALIDOS });

  const { action, id, written } = await upsertLead(supabase, { ...lead, status: 'New' }, {});
  void dispararWebhookLead(supabase, written);
  if (action === 'created') void inscreverNosFluxos(supabase, lead);
  return res.status(200).json({ action, id });
}

async function acaoCreate(supabase: SupabaseClient, req: any, res: any) {
  const lead = sanitizeLeadFields(req.body?.lead);
  if (!lead) return res.status(400).json({ error: DADOS_INVALIDOS });

  const { data, error } = await supabase
    .from('SITE_Leads')
    .insert([{ ...lead, status: 'New' }])
    .select('id')
    .single();
  if (error) throw error;
  return res.status(201).json({ id: data.id });
}

async function acaoQuiz(supabase: SupabaseClient, req: any, res: any) {
  const id = req.body?.id;
  const resultado = sanitizeQuizResult(req.body?.result);
  if (!isUuid(id) || !resultado) return res.status(400).json({ error: DADOS_INVALIDOS });

  const { data, error } = await supabase
    .from('SITE_Leads')
    .update(resultado)
    .eq('id', id)
    .select('id')
    .maybeSingle();
  if (error) throw error;
  if (!data) return res.status(404).json({ error: DADOS_INVALIDOS });
  return res.status(200).json({ ok: true });
}

async function acaoCheckout(supabase: SupabaseClient, req: any, res: any) {
  const lead = sanitizeLeadFields(req.body?.lead);
  if (!lead) return res.status(400).json({ error: DADOS_INVALIDOS });
  const cpf = sanitizeCpf(req.body?.cpf);

  // Sem CPF no formulário não apaga o que a ficha já tem.
  const atualizacao = {
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    tags: lead.tags,
    ...(cpf ? { cpf } : {}),
  };

  const idInformado = isUuid(req.body?.id) ? (req.body.id as string) : null;
  const alvo = idInformado ?? (await findExistingLead<{ id: string }>(supabase, { email: lead.email, phone: lead.phone }))?.id;

  if (alvo) {
    const { data, error } = await supabase.from('SITE_Leads').update(atualizacao).eq('id', alvo).select('id').maybeSingle();
    if (error) throw error;
    if (data) return res.status(200).json({ id: data.id, created: false });
  }

  const { data, error } = await supabase
    .from('SITE_Leads')
    .insert([{ ...lead, ...(cpf ? { cpf } : {}), status: 'New' }])
    .select('id')
    .single();
  if (error) throw error;
  return res.status(201).json({ id: data.id, created: true });
}

// Map e não objeto: a ação vem do navegador, e 'constructor' acharia um método herdado.
const ACOES = new Map<string, (supabase: SupabaseClient, req: any, res: any) => Promise<unknown>>([
  ['upsert', acaoUpsert],
  ['create', acaoCreate],
  ['quiz', acaoQuiz],
  ['checkout', acaoCheckout],
]);

export default async function publicLeads(req: any, res: any) {
  setNoStoreHeaders(res);
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'metodo_nao_permitido' });
  }
  if (!requireSameOrigin(req, res)) return;
  if (limitador.isLimited(req)) {
    return res.status(429).json({ error: 'Muitas tentativas. Aguarde um minuto e tente novamente.' });
  }

  const acao = ACOES.get(String(req.body?.action));
  if (!acao) return res.status(400).json({ error: 'acao_invalida' });

  const supabase = getServiceClient();
  if (!supabase) return res.status(503).json({ error: ERRO_GENERICO });

  try {
    return await acao(supabase, req, res);
  } catch (erro) {
    console.error('[public-leads] Falha:', { acao: req.body?.action, erro: (erro as Error).message });
    return res.status(500).json({ error: ERRO_GENERICO });
  }
}
