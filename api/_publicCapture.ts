import type { SupabaseClient } from '@supabase/supabase-js';
import { createIpRateLimiter, getServiceClient, requireSameOrigin, setNoStoreHeaders } from './_auth.js';
import { isUuid } from '../lib/publicLeads.js';

/**
 * Campanhas de captura — POST /api/public-capture { action, ... }.
 *
 *   'submit'  → grava o lead e o voto; o mesmo telefone na mesma campanha só atualiza a resposta
 *   'results' → votos por opção da campanha
 *
 * SITE_CaptureLeads não é mais legível com a chave anônima (ver
 * migrations/2026-11-04_fechar_captura_pedidos_fluxos_auditoria.sql). A resposta nunca traz quem
 * votou, e só os campos desta lista chegam ao banco: o navegador não marca sent_to_crm.
 */

const limitador = createIpRateLimiter({ windowMs: 60_000, maxAttempts: 30 });
const ERRO_GENERICO = 'Não foi possível registrar. Tente novamente.';
const DADOS_INVALIDOS = 'Confira nome, WhatsApp e a autorização de contato.';
const INDISPONIVEL = 'Esta campanha não está disponível.';
const UTMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];

interface Campanha {
  id: string;
  status: string;
  ends_at: string | null;
  config: { options?: unknown } | null;
}

const texto = (valor: unknown, limite: number) => (typeof valor === 'string' ? valor.trim().slice(0, limite) : '');

function opcoesDa(campanha: Campanha): string[] {
  const opcoes = campanha.config?.options;
  return Array.isArray(opcoes) ? opcoes.filter((opcao): opcao is string => typeof opcao === 'string') : [];
}

async function buscarCampanha(supabase: SupabaseClient, id: unknown): Promise<Campanha | null> {
  if (!isUuid(id)) return null;
  const { data, error } = await supabase
    .from('SITE_CaptureCampaigns')
    .select('id, status, ends_at, config')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function acaoSubmit(supabase: SupabaseClient, req: any, res: any) {
  const campanha = await buscarCampanha(supabase, req.body?.campaignId);
  const encerrada = campanha?.status === 'ended' || (!!campanha?.ends_at && new Date(campanha.ends_at).getTime() < Date.now());
  if (!campanha || campanha.status === 'draft' || encerrada) return res.status(404).json({ error: INDISPONIVEL });

  const name = texto(req.body?.name, 200);
  const phone = texto(req.body?.phone, 40);
  const vote = texto(req.body?.vote, 200);
  if (!name || !phone || req.body?.consent !== true || (vote && !opcoesDa(campanha).includes(vote))) {
    return res.status(400).json({ error: DADOS_INVALIDOS });
  }

  const utms = Object.fromEntries(
    UTMS.map((campo) => [campo, texto(req.body?.tracking?.[campo], 300)]).filter(([, valor]) => valor),
  );

  const { error } = await supabase.from('SITE_CaptureLeads').upsert(
    [{
      campaign_id: campanha.id,
      name,
      email: texto(req.body?.email, 254) || null,
      phone,
      answer: vote ? { vote } : {},
      consent: true,
      ...utms,
    }],
    { onConflict: 'campaign_id,phone' },
  );
  if (error) throw error;
  return res.status(200).json({ ok: true });
}

async function acaoResults(supabase: SupabaseClient, req: any, res: any) {
  const campanha = await buscarCampanha(supabase, req.body?.campaignId);
  if (!campanha) return res.status(404).json({ error: INDISPONIVEL });
  // O painel abre o resultado de rascunho: não é erro, só não tem o que mostrar.
  if (campanha.status === 'draft') return res.status(200).json({ votes: {} });

  const { data, error } = await supabase.from('SITE_CaptureLeads').select('answer').eq('campaign_id', campanha.id);
  if (error) throw error;

  // Só o que é opção da campanha: texto digitado num voto antigo não pode sair daqui.
  const votos = new Map(opcoesDa(campanha).map((opcao): [string, number] => [opcao, 0]));
  for (const linha of data ?? []) {
    const voto = (linha.answer as { vote?: unknown } | null)?.vote;
    if (typeof voto === 'string' && votos.has(voto)) votos.set(voto, votos.get(voto)! + 1);
  }
  return res.status(200).json({ votes: Object.fromEntries(votos) });
}

// Map e não objeto: a ação vem do navegador, e 'constructor' acharia um método herdado.
const ACOES = new Map<string, (supabase: SupabaseClient, req: any, res: any) => Promise<unknown>>([
  ['submit', acaoSubmit],
  ['results', acaoResults],
]);

export default async function publicCapture(req: any, res: any) {
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
    console.error('[public-capture] Falha:', { acao: req.body?.action, erro: (erro as Error).message });
    return res.status(500).json({ error: ERRO_GENERICO });
  }
}
