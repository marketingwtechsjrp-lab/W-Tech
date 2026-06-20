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

// ─── Orquestrador ────────────────────────────────────────────────────────────

export interface ResponderArgs {
  conversationId: string;
  waId: string;
  incomingText: string;
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

  // Teto de mensagens da IA antes de passar para humano.
  const { count: aiCount } = await supabase
    .from('SITE_WhatsAppCloudMessages')
    .select('id', { count: 'exact', head: true })
    .eq('conversation_id', conversationId)
    .eq('sent_by', 'ai');

  if (hitKeyword || (aiCount || 0) >= config.max_msgs_before_handoff) {
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
    (knowledge ? `O QUE VOCÊ PODE DIZER (base de conhecimento):\n${knowledge}\n\n` : '') +
    (memory ? `ATENDIMENTOS ANTERIORES PARECIDOS (use como referência do que funcionou):\n${memory}\n\n` : '') +
    (rules ? `REGRAS OBRIGATÓRIAS:\n${rules}\n\n` : '') +
    `Responda em português do Brasil, de forma curta e objetiva (no máximo 2 parágrafos). ` +
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
    const msgId = await sendCloudText(cloudCfg, waId, reply);
    await storeOutMessage(supabase, conversationId, waId, reply, 'ai', msgId ? 'sent' : 'failed', msgId);
    await setStatus(supabase, conversationId, 'bot');
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
