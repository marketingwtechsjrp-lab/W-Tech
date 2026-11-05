import type { SupabaseClient } from '@supabase/supabase-js';
import {
  createIpRateLimiter,
  getServiceClient,
  requireSameOrigin,
  requireStaffAnyPermission,
  setNoStoreHeaders,
} from './_auth.js';
import { callLLM, embed, loadAIKeys } from './_aiReply.js';

/**
 * IA do painel, pelo servidor — POST /api/ai-generate { action, ... }.
 *
 *   'generate' → { prompt, systemPrompt? } devolve { text }
 *   'embed'    → { text } devolve { embedding }, null sem chave do Gemini
 *
 * As chaves ficam em SITE_SystemSettings e só o service_role as lê (ver
 * migrations/2026-11-05_chaves_ia_so_no_servidor.sql). Antes o navegador as lia e montava
 * o Authorization, e qualquer pessoa da equipe as via na aba Network. A chave não pode
 * aparecer em resposta nem em log, e a mensagem do provedor não sai daqui porque às vezes
 * repete parte dela.
 */

/**
 * Uma permissão de cada tela que usa IA: Blog, SEO e relatórios de atendente, Inteligência,
 * Planejador de conteúdo, inbox do WhatsApp (análise ao encerrar) e treino e métricas da IA.
 * Quem não usa nenhuma delas não gasta crédito do provedor.
 */
const PERMISSOES = [
  'blog_ai',
  'manage_settings',
  'intelligence_view',
  'marketing_view',
  'whatsapp_inbox_view',
  'crm_view',
  'whatsapp_ai_train',
  'whatsapp_ai_manage',
  'whatsapp_view_metrics',
];

const limitador = createIpRateLimiter({ windowMs: 60_000, maxAttempts: 60 });
const MAX_CARACTERES = 1_000_000;
const TIMEOUT_MS = 180_000;

// Os mesmos modelos que o painel usava quando chamava o provedor pelo navegador. O da
// OpenRouter vem de openrouter_model, por isso não está aqui.
const MODELO = { openai: 'gpt-4o', gemini: 'gemini-1.5-pro' } as const;

const NAO_CONFIGURADA = 'A chave deste provedor de IA não está configurada. Cadastre em Configurações.';
const SEM_SALDO = 'A conta do provedor de IA está sem saldo.';
const FALHOU = 'A IA não respondeu agora. Tente novamente.';

type Chaves = Awaited<ReturnType<typeof loadAIKeys>>;

function chaveDoProvedor(chaves: Chaves): string | undefined {
  if (chaves.provider === 'openai') return chaves.openai;
  if (chaves.provider === 'openrouter') return chaves.openrouter;
  return chaves.gemini;
}

function modeloDoProvedor(chaves: Chaves): string | null {
  if (chaves.provider === 'openai') return MODELO.openai;
  if (chaves.provider === 'openrouter') return null;
  return MODELO.gemini;
}

const semChaves = (texto: string, chaves: Chaves) =>
  [chaves.openai, chaves.gemini, chaves.openrouter].reduce(
    (seguro, chave) => (chave ? seguro.split(chave).join('[chave]') : seguro),
    texto,
  );

async function acaoGenerate(supabase: SupabaseClient, req: any, res: any) {
  const prompt = req.body?.prompt;
  const systemPrompt = req.body?.systemPrompt ?? '';
  if (typeof prompt !== 'string' || !prompt.trim() || typeof systemPrompt !== 'string') {
    return res.status(400).json({ error: 'Pedido inválido para a IA.' });
  }
  if (prompt.length + systemPrompt.length > MAX_CARACTERES) {
    return res.status(413).json({ error: 'Texto grande demais para a IA. Reduza o período ou a quantidade de dados.' });
  }

  const chaves = await loadAIKeys(supabase);
  if (!chaveDoProvedor(chaves)) return res.status(503).json({ error: NAO_CONFIGURADA });

  try {
    const text = await callLLM(chaves, systemPrompt, prompt, modeloDoProvedor(chaves), {
      temperature: 0.7,
      timeoutMs: TIMEOUT_MS,
      titulo: 'W-Tech Admin',
    });
    return res.status(200).json({ text });
  } catch (erro) {
    const detalhe = semChaves((erro as Error).message || '', chaves);
    console.error('[ai-generate] Provedor falhou:', { provedor: chaves.provider, erro: detalhe.slice(0, 300) });
    if (/credit|crédito|insufficient|saldo|quota|balance/i.test(detalhe)) {
      return res.status(402).json({ error: SEM_SALDO });
    }
    return res.status(502).json({ error: FALHOU });
  }
}

async function acaoEmbed(supabase: SupabaseClient, req: any, res: any) {
  const texto = req.body?.text;
  if (typeof texto !== 'string' || !texto.trim()) return res.status(400).json({ error: 'Pedido inválido para a IA.' });

  const chaves = await loadAIKeys(supabase);
  return res.status(200).json({ embedding: await embed(chaves.gemini || '', texto) });
}

// Map e não objeto: a ação vem do navegador, e 'constructor' acharia um método herdado.
const ACOES = new Map<string, (supabase: SupabaseClient, req: any, res: any) => Promise<unknown>>([
  ['generate', acaoGenerate],
  ['embed', acaoEmbed],
]);

export default async function aiGenerate(req: any, res: any) {
  setNoStoreHeaders(res);
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'metodo_nao_permitido' });
  }
  if (!requireSameOrigin(req, res)) return;

  const staff = await requireStaffAnyPermission(req, res, PERMISSOES);
  if (!staff) return;

  if (limitador.isLimited(req)) {
    return res.status(429).json({ error: 'Muitos pedidos à IA. Aguarde um minuto e tente novamente.' });
  }

  const acao = ACOES.get(String(req.body?.action));
  if (!acao) return res.status(400).json({ error: 'acao_invalida' });

  const supabase = getServiceClient();
  if (!supabase) return res.status(503).json({ error: FALHOU });

  try {
    return await acao(supabase, req, res);
  } catch (erro) {
    // A resposta e o log não levam o motivo: pode vir do banco, e o pedido traz conversa de cliente.
    console.error('[ai-generate] Falha:', { acao: req.body?.action, erro: (erro as Error).name });
    return res.status(500).json({ error: FALHOU });
  }
}
