import type { SupabaseClient } from '@supabase/supabase-js';
import {
  GRAPH,
  normalizePhone,
  previewFor,
  upsertConversation,
  type CloudConfig,
} from './_whatsappCloud.js';

/**
 * Cérebro da IA de atendimento (server-side). Prefixo "_" → não vira rota.
 * Chamado pelo webhook depois de gravar uma mensagem recebida.
 *
 * Decisão híbrida por intenção:
 *   - support / general → AUTOPILOT (envia a resposta sozinho)
 *   - sales / billing   → RASCUNHO (salva sem enviar; atendente aprova)
 * Handoff por palavra-chave, regra de escalonamento ou teto de mensagens.
 */

export type Intent = 'course' | 'sales' | 'support' | 'general';

interface AIConfig {
  enabled: boolean;
  persona: string;
  business_info: string;
  fallback_message: string;
  handoff_keywords: string[];
  working_hours: { start?: number; end?: number; days?: number[] } | null;
  max_msgs_before_handoff: number;
  autopilot_intents: string[];
  provider: string | null;
  model: string | null;
  // Humanização do envio (divide em balões + delay + "digitando...").
  humanizeEnabled: boolean;
  humanizeTyping: boolean;
  humanizeMaxBubbles: number;
  humanizeSpeed: 'slow' | 'normal' | 'fast';
  // Dados vivos: deixa a IA consultar os cursos publicados no banco.
  useLiveCourses: boolean;
}

interface AIKeys {
  provider: 'openai' | 'gemini' | 'openrouter';
  openai?: string;
  gemini?: string;
  openrouter?: string;
  openrouterModel?: string;
}

// ─── Carregamento de config/keys ─────────────────────────────────────────────

export async function loadAIConfig(supabase: SupabaseClient): Promise<AIConfig | null> {
  const { data } = await supabase.from('SITE_WhatsAppAIConfig').select('*').limit(1).maybeSingle();
  if (!data) return null;
  return {
    enabled: !!data.enabled,
    persona: data.persona || '',
    business_info: data.business_info || '',
    fallback_message: data.fallback_message || 'Um momento, vou te transferir para um atendente.',
    handoff_keywords: data.handoff_keywords || [],
    working_hours: data.working_hours || null,
    max_msgs_before_handoff: Number(data.max_msgs_before_handoff ?? 6),
    autopilot_intents: data.autopilot_intents || ['support', 'general'],
    provider: data.provider || null,
    model: data.model || null,
    humanizeEnabled: data.humanize_enabled ?? true,
    humanizeTyping: data.humanize_typing ?? true,
    humanizeMaxBubbles: Number(data.humanize_max_bubbles ?? 4),
    humanizeSpeed: (data.humanize_speed || 'normal') as AIConfig['humanizeSpeed'],
    useLiveCourses: data.use_live_courses ?? true,
  };
}

async function loadAIKeys(supabase: SupabaseClient, override?: string | null): Promise<AIKeys> {
  const { data } = await supabase
    .from('SITE_SystemSettings')
    .select('key, value')
    .in('key', ['preferred_ai_provider', 'openai_api_key', 'gemini_api_key', 'openrouter_api_key', 'openrouter_model']);
  const map: Record<string, string> = {};
  (data || []).forEach((r: any) => { map[r.key] = r.value; });
  const provider = (override || map['preferred_ai_provider'] || 'gemini') as AIKeys['provider'];
  return {
    provider,
    openai: map['openai_api_key'],
    gemini: map['gemini_api_key'],
    openrouter: map['openrouter_api_key'],
    openrouterModel: map['openrouter_model'] || 'google/gemini-2.0-flash-001',
  };
}

// ─── Chamada ao LLM (REST, sem SDK — leve no serverless) ─────────────────────

async function callLLM(keys: AIKeys, system: string, user: string, modelOverride?: string | null): Promise<string> {
  if (keys.provider === 'openai') {
    if (!keys.openai) throw new Error('OpenAI key ausente');
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${keys.openai}` },
      body: JSON.stringify({
        model: modelOverride || 'gpt-4o-mini',
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
        temperature: 0.5,
      }),
    });
    const d = await r.json();
    if (d.error) throw new Error(d.error.message);
    return d.choices?.[0]?.message?.content?.trim() || '';
  }

  if (keys.provider === 'openrouter') {
    if (!keys.openrouter) throw new Error('OpenRouter key ausente');
    const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${keys.openrouter}`, 'X-Title': 'W-Tech Atendimento' },
      body: JSON.stringify({
        model: modelOverride || keys.openrouterModel,
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
        temperature: 0.5,
      }),
    });
    const d = await r.json();
    if (d.error) throw new Error(d.error.message || 'Erro OpenRouter');
    return d.choices?.[0]?.message?.content?.trim() || '';
  }

  // gemini (default) — flash por custo
  if (!keys.gemini) throw new Error('Gemini key ausente');
  const model = modelOverride || 'gemini-1.5-flash';
  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${keys.gemini}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: user }] }],
        generationConfig: { temperature: 0.5 },
      }),
    }
  );
  const d = await r.json();
  if (d.error) throw new Error(d.error.message || 'Erro Gemini');
  return (d.candidates?.[0]?.content?.parts?.[0]?.text || '').trim();
}

// ─── Embeddings (Gemini text-embedding-004, 768 dims) para a RAG ─────────────

export async function embed(geminiKey: string, text: string): Promise<number[] | null> {
  if (!geminiKey || !text) return null;
  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: { parts: [{ text: text.slice(0, 8000) }] } }),
      }
    );
    const d = await r.json();
    const values = d?.embedding?.values;
    return Array.isArray(values) ? values : null;
  } catch (e: any) {
    console.error('[aiReply] embed falhou:', e?.message);
    return null;
  }
}

/** Busca na memória RAG os atendimentos anteriores mais parecidos. */
async function retrieveMemory(
  supabase: SupabaseClient,
  geminiKey: string,
  query: string
): Promise<string> {
  const emb = await embed(geminiKey, query);
  if (!emb) return '';
  try {
    const { data } = await supabase.rpc('match_wa_memory', {
      query_embedding: emb,
      match_count: 4,
      min_similarity: 0.72,
    });
    if (!data || !data.length) return '';
    return (data as any[])
      .map((m) => `• Cliente perguntou: ${m.question}\n  Resposta que resolveu: ${m.answer}`)
      .join('\n');
  } catch (e: any) {
    console.error('[aiReply] retrieveMemory falhou:', e?.message);
    return '';
  }
}

// ─── Dados vivos: cursos publicados (preço/datas/local/link reais) ───────────

const SITE_BASE = 'https://site.w-techbrasil.com.br';

function fmtMoney(v: any, currency?: string | null): string {
  const n = Number(v || 0);
  const cur = (currency || 'BRL').toUpperCase();
  const locale = cur === 'BRL' ? 'pt-BR' : cur === 'EUR' ? 'pt-PT' : 'en-US';
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency: cur }).format(n);
  } catch {
    return `${cur} ${n.toFixed(2)}`;
  }
}

function fmtDate(s: any): string {
  if (!s) return '';
  try {
    const d = new Date(s);
    if (isNaN(d.getTime())) return String(s);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return String(s);
  }
}

function fmtDateRange(a: any, b: any): string {
  const da = fmtDate(a);
  const db = fmtDate(b);
  if (da && db && db !== da) return `${da} a ${db}`;
  return da;
}

/** Monta um bloco compacto com os cursos publicados, pra IA nunca inventar dado. */
async function loadCourseContext(supabase: SupabaseClient): Promise<string> {
  try {
    const { data } = await supabase
      .from('SITE_Courses')
      .select(
        'id, title, price, currency, date, date_end, location, location_type, city, state, status, custom_link, capacity, registered_count'
      )
      .in('status', ['Published', 'Full'])
      .order('date', { ascending: true })
      .limit(15);
    if (!data || !data.length) return '';
    return (data as any[])
      .map((c) => {
        const url = (c.custom_link && String(c.custom_link).trim()) || `${SITE_BASE}/checkout-curso/${c.id}`;
        const local =
          c.location_type === 'Online'
            ? 'Online'
            : [c.city, c.state].filter(Boolean).join('/') || c.location || 'Presencial';
        const when = fmtDateRange(c.date, c.date_end);
        const price = fmtMoney(c.price, c.currency);
        const vagas =
          c.status === 'Full'
            ? 'ESGOTADO (oferecer lista de espera)'
            : Number(c.capacity) > 0
            ? `${Math.max(0, Number(c.capacity) - Number(c.registered_count || 0))} vaga(s)`
            : 'vagas abertas';
        return `• ${c.title} — ${local}${when ? `, ${when}` : ''}. Investimento: ${price}. ${vagas}. Inscrição: ${url}`;
      })
      .join('\n');
  } catch (e: any) {
    console.error('[aiReply] loadCourseContext falhou:', e?.message);
    return '';
  }
}

// ─── Classificação de intenção ───────────────────────────────────────────────

async function classifyIntent(keys: AIKeys, text: string): Promise<Intent> {
  try {
    const out = await callLLM(
      keys,
      'Classifique a mensagem do cliente em UMA palavra entre: course, sales, support, general. Responda só a palavra.',
      text
    );
    const v = out.toLowerCase().replace(/[^a-z]/g, '');
    if (v.includes('course')) return 'course';
    if (v.includes('sales')) return 'sales';
    if (v.includes('support')) return 'support';
    return 'general';
  } catch {
    return 'general';
  }
}

// ─── Helpers de conhecimento/regras/horário ──────────────────────────────────

async function loadKnowledge(supabase: SupabaseClient, intent: Intent): Promise<string> {
  const { data } = await supabase
    .from('SITE_WhatsAppAIKnowledge')
    .select('title, content')
    .eq('enabled', true)
    .in('intent', [intent, 'general']);
  return (data || []).map((k: any) => `• ${k.title}: ${k.content}`).join('\n');
}

async function loadRules(supabase: SupabaseClient): Promise<string> {
  const { data } = await supabase.from('SITE_WhatsAppAIRules').select('type, value').eq('enabled', true);
  return (data || []).map((r: any) => `[${r.type}] ${r.value}`).join('\n');
}

function withinWorkingHours(wh: AIConfig['working_hours']): boolean {
  if (!wh || (wh.start == null && wh.end == null)) return true;
  const now = new Date(Date.now() - 3 * 60 * 60 * 1000); // BRT ≈ UTC-3
  const hour = now.getUTCHours();
  const day = now.getUTCDay();
  if (wh.days && wh.days.length && !wh.days.includes(day)) return false;
  if (wh.start != null && hour < wh.start) return false;
  if (wh.end != null && hour >= wh.end) return false;
  return true;
}

// ─── Envio de texto via API oficial (resposta dentro da janela de 24h) ───────

async function sendCloudText(cfg: CloudConfig, to: string, text: string): Promise<string | null> {
  const phone = normalizePhone(to);
  if (!phone) return null;
  const res = await fetch(`${GRAPH}/${cfg.apiVersion}/${cfg.phoneNumberId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.accessToken}` },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: phone,
      type: 'text',
      text: { body: text, preview_url: true },
    }),
  });
  const d = await res.json();
  if (!res.ok) {
    console.error('[aiReply] Falha ao enviar:', d?.error?.message || JSON.stringify(d));
    return null;
  }
  return d.messages?.[0]?.id ?? null;
}

async function setStatus(supabase: SupabaseClient, conversationId: string, status: string): Promise<void> {
  await supabase.from('SITE_WhatsAppCloudConversations').update({ status }).eq('id', conversationId);
}

// ─── Humanização: "digitando...", divisão em balões e delay natural ──────────

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/**
 * Mostra "digitando..." e marca a mensagem como lida (ticks azuis).
 * A Cloud API só permite isso referenciando uma mensagem recebida ainda não
 * respondida — por isso só dá pra disparar uma vez (antes do 1º balão).
 * O indicador some sozinho quando o próximo texto é enviado ou após ~25s.
 */
async function sendTypingIndicator(cfg: CloudConfig, incomingMessageId?: string | null): Promise<void> {
  if (!incomingMessageId) return;
  try {
    await fetch(`${GRAPH}/${cfg.apiVersion}/${cfg.phoneNumberId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.accessToken}` },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: incomingMessageId,
        typing_indicator: { type: 'text' },
      }),
    });
  } catch (e: any) {
    console.error('[aiReply] typing indicator falhou:', e?.message);
  }
}

/**
 * Divide a resposta em balões curtos, como uma pessoa digitando no WhatsApp.
 * Quebra primeiro pelas linhas em branco (a IA já é instruída a separar ideias
 * com linha em branco); blocos muito longos são repartidos por frase.
 */
export function splitIntoBubbles(text: string, maxBubbles: number): string[] {
  const MAX = 220;
  const clean = (text || '').replace(/\r/g, '').trim();
  if (!clean) return [];

  const segments = clean.split(/\n{2,}/).map((s) => s.trim()).filter(Boolean);
  const chunks: string[] = [];
  for (const seg of segments) {
    if (seg.length <= MAX) {
      chunks.push(seg);
      continue;
    }
    const sentences = seg.split(/(?<=[.!?…])\s+/).map((s) => s.trim()).filter(Boolean);
    let cur = '';
    for (const s of sentences) {
      if (!cur) cur = s;
      else if (cur.length + 1 + s.length <= MAX) cur += ' ' + s;
      else { chunks.push(cur); cur = s; }
    }
    if (cur) chunks.push(cur);
  }

  const cap = Math.max(1, maxBubbles);
  if (chunks.length <= cap) return chunks;
  // Junta o excedente no último balão permitido pra não estourar o teto.
  return [...chunks.slice(0, cap - 1), chunks.slice(cap - 1).join('\n')];
}

function bubbleDelayMs(chars: number, speed: AIConfig['humanizeSpeed']): number {
  const perChar = speed === 'slow' ? 55 : speed === 'fast' ? 22 : 35;
  return Math.min(3500, Math.max(700, Math.round(chars * perChar)));
}

/**
 * Envia a resposta da IA de forma humanizada: vários balões, com "digitando..."
 * antes do primeiro e um delay proporcional ao tamanho entre eles. O tempo
 * total é limitado pra não segurar o webhook (a Meta reentrega se demorar).
 */
async function humanizedSend(
  supabase: SupabaseClient,
  cfg: CloudConfig,
  conversationId: string,
  waId: string,
  reply: string,
  config: AIConfig,
  incomingMessageId?: string | null
): Promise<void> {
  const bubbles = config.humanizeEnabled
    ? splitIntoBubbles(reply, config.humanizeMaxBubbles)
    : [reply.trim()].filter(Boolean);
  if (!bubbles.length) return;

  const TOTAL_CAP = 8000;
  let spent = 0;

  for (let i = 0; i < bubbles.length; i++) {
    const body = bubbles[i];
    if (config.humanizeEnabled) {
      if (config.humanizeTyping && i === 0) await sendTypingIndicator(cfg, incomingMessageId);
      let d = bubbleDelayMs(body.length, config.humanizeSpeed);
      if (spent + d > TOTAL_CAP) d = Math.max(0, TOTAL_CAP - spent);
      spent += d;
      if (d > 0) await sleep(d);
    }
    const msgId = await sendCloudText(cfg, waId, body);
    await storeOutMessage(supabase, conversationId, waId, body, 'ai', msgId ? 'sent' : 'failed', msgId);
  }
  await setStatus(supabase, conversationId, 'bot');
}

// ─── Orquestrador ────────────────────────────────────────────────────────────

export interface ResponderArgs {
  conversationId: string;
  waId: string;
  incomingText: string;
  incomingMessageId?: string | null;
}

export async function runAIResponder(
  supabase: SupabaseClient,
  cloudCfg: CloudConfig,
  args: ResponderArgs
): Promise<void> {
  const { conversationId, waId, incomingText } = args;
  if (!incomingText || !incomingText.trim()) return;

  const config = await loadAIConfig(supabase);
  if (!config || !config.enabled) return;

  // Estado da conversa: respeita handoff humano.
  const { data: conv } = await supabase
    .from('SITE_WhatsAppCloudConversations')
    .select('bot_enabled, status')
    .eq('id', conversationId)
    .maybeSingle();
  if (!conv || conv.bot_enabled === false) return;
  if (conv.status === 'humano' || conv.status === 'encerrado') return;

  if (!withinWorkingHours(config.working_hours)) {
    await setStatus(supabase, conversationId, 'pendente');
    return;
  }

  const lower = incomingText.toLowerCase();
  const hitKeyword = (config.handoff_keywords || []).some((k) => k && lower.includes(k.toLowerCase()));

  // Teto de turnos antes de passar para humano. Contamos as mensagens do CLIENTE
  // (não as da IA): com a humanização cada resposta vira vários balões 'ai', então
  // contar 'ai' estouraria o limite cedo demais. 1 mensagem do cliente ≈ 1 turno.
  const { count: turnCount } = await supabase
    .from('SITE_WhatsAppCloudMessages')
    .select('id', { count: 'exact', head: true })
    .eq('conversation_id', conversationId)
    .eq('direction', 'in');

  if (hitKeyword || (turnCount || 0) >= config.max_msgs_before_handoff) {
    await setStatus(supabase, conversationId, 'pendente');
    // Avisa o cliente que um humano vai assumir (uma vez).
    const msgId = await sendCloudText(cloudCfg, waId, config.fallback_message);
    if (msgId) await storeOutMessage(supabase, conversationId, waId, config.fallback_message, 'ai', 'sent', msgId);
    return;
  }

  const keys = await loadAIKeys(supabase, config.provider);
  const intent = await classifyIntent(keys, incomingText);
  const knowledge = await loadKnowledge(supabase, intent);
  const rules = await loadRules(supabase);
  // RAG: aprende com atendimentos anteriores (requer chave Gemini para embeddings).
  const memory = await retrieveMemory(supabase, keys.gemini || '', incomingText);
  // Dados vivos: cursos reais do banco (só quando a dúvida é sobre curso/venda).
  const liveCourses =
    config.useLiveCourses && (intent === 'course' || intent === 'sales')
      ? await loadCourseContext(supabase)
      : '';

  // Últimas mensagens para dar contexto.
  const { data: history } = await supabase
    .from('SITE_WhatsAppCloudMessages')
    .select('direction, body')
    .eq('conversation_id', conversationId)
    .order('timestamp', { ascending: false })
    .limit(10);
  const historyText = (history || [])
    .reverse()
    .filter((m: any) => m.body)
    .map((m: any) => `${m.direction === 'in' ? 'Cliente' : 'Atendente'}: ${m.body}`)
    .join('\n');

  const systemPrompt =
    `${config.persona}\n\n` +
    `INFORMAÇÕES DO NEGÓCIO:\n${config.business_info}\n\n` +
    (liveCourses
      ? `CURSOS DISPONÍVEIS AGORA (dados reais do sistema — use SEMPRE estes valores e este link de inscrição; NUNCA invente preço, data ou vaga):\n${liveCourses}\n\n`
      : '') +
    (knowledge ? `O QUE VOCÊ PODE DIZER (base de conhecimento):\n${knowledge}\n\n` : '') +
    (memory ? `ATENDIMENTOS ANTERIORES PARECIDOS (use como referência do que funcionou):\n${memory}\n\n` : '') +
    (rules ? `REGRAS OBRIGATÓRIAS:\n${rules}\n\n` : '') +
    `Responda em português do Brasil com tom natural e conversacional, como uma pessoa de verdade digitando no WhatsApp. ` +
    `Use mensagens curtas. Quando a resposta tiver mais de uma ideia, separe em blocos curtos com UMA LINHA EM BRANCO entre eles — cada bloco vira uma mensagem. ` +
    `Evite textão e não use markdown, asteriscos ou listas numeradas. ` +
    `Se não tiver certeza ou a regra exigir, diga que vai transferir para um atendente.`;

  let reply = '';
  try {
    reply = await callLLM(keys, systemPrompt, `Histórico:\n${historyText}\n\nNova mensagem do cliente: ${incomingText}`, config.model);
  } catch (e: any) {
    console.error('[aiReply] LLM falhou:', e?.message);
    return;
  }
  if (!reply) return;

  const autopilot = (config.autopilot_intents || []).includes(intent);

  if (autopilot) {
    // Envio humanizado: vários balões curtos, com "digitando..." e delay natural.
    await humanizedSend(supabase, cloudCfg, conversationId, waId, reply, config, args.incomingMessageId);
  } else {
    // Rascunho para o atendente aprovar (não envia ao cliente).
    await storeOutMessage(supabase, conversationId, waId, reply, 'ai_draft', 'draft', null);
    await setStatus(supabase, conversationId, 'pendente');
  }
}

async function storeOutMessage(
  supabase: SupabaseClient,
  conversationId: string,
  waId: string,
  body: string,
  sentBy: 'ai' | 'ai_draft',
  status: string,
  waMessageId: string | null
): Promise<void> {
  const whenISO = new Date().toISOString();
  // Só atualiza o preview da conversa quando realmente enviou.
  if (sentBy === 'ai') {
    await upsertConversation(supabase, {
      waId,
      preview: previewFor('text', body),
      whenISO,
      direction: 'out',
    });
  }
  await supabase.from('SITE_WhatsAppCloudMessages').insert({
    conversation_id: conversationId,
    wa_id: waId,
    wa_message_id: waMessageId,
    direction: 'out',
    type: 'text',
    body,
    status,
    sent_by: sentBy,
    timestamp: whenISO,
  });
}
