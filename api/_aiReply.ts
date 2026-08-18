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

export type Intent = 'course' | 'sales' | 'parts' | 'support' | 'general';

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

export async function loadAIKeys(supabase: SupabaseClient, override?: string | null): Promise<AIKeys> {
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

export async function callLLM(keys: AIKeys, system: string, user: string, modelOverride?: string | null): Promise<string> {
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

// Domínio canônico: site.w-techbrasil.com.br responde 308 (ver lib/publicUrl.ts).
const SITE_BASE = 'https://w-techbrasil.com.br';

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

/**
 * Agenda REAL de cursos, com estado explícito. A distinção importa para o prompt:
 *   - ok    → lista fechada; a IA só pode citar o que está nela.
 *   - empty → não há turma aberta; a IA deve dizer isso e NUNCA citar curso.
 *   - error → consulta falhou; a IA não pode afirmar nada de agenda de memória.
 * Sem essa distinção, agenda vazia/erro sumia do prompt em silêncio e a IA
 * preenchia o buraco com dado inventado.
 */
type CourseAgenda = { state: 'ok'; block: string } | { state: 'empty' } | { state: 'error' };

async function loadCourseAgenda(supabase: SupabaseClient): Promise<CourseAgenda> {
  try {
    // Hoje em BRT (UTC-3) no formato YYYY-MM-DD — mesma convenção da coluna `date`.
    const todayYMD = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from('SITE_Courses')
      .select(
        'id, title, price, currency, date, date_end, location, location_type, city, state, status, custom_link, capacity, registered_count'
      )
      .in('status', ['Published', 'Full'])
      // Só cursos de HOJE pra frente: mantém quem ainda não terminou (date_end >=
      // hoje) OU cuja data de início é hoje/futura. Evita disparar cronograma de
      // turma cuja data já passou (ex.: curso de março ainda marcado Published).
      .or(`date_end.gte.${todayYMD},and(date_end.is.null,date.gte.${todayYMD})`)
      .order('date', { ascending: true })
      .limit(30);
    if (error) {
      console.error('[aiReply] loadCourseAgenda falhou:', error.message);
      return { state: 'error' };
    }
    if (!data || !data.length) return { state: 'empty' };
    const block = (data as any[])
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
    return { state: 'ok', block };
  } catch (e: any) {
    console.error('[aiReply] loadCourseAgenda falhou:', e?.message);
    return { state: 'error' };
  }
}

// ─── Classificação de intenção ───────────────────────────────────────────────

async function classifyIntent(keys: AIKeys, text: string): Promise<Intent> {
  try {
    const out = await callLLM(
      keys,
      'Classifique a mensagem do cliente em UMA palavra entre: course, sales, parts, support, general. ' +
        'parts = cliente quer comprar ou orçar peça, ferramenta, mola, óleo ou outro produto físico (NÃO curso). ' +
        'course = dúvida ou interesse em curso/treinamento. Responda só a palavra.',
      text
    );
    const v = out.toLowerCase().replace(/[^a-z]/g, '');
    if (v.includes('parts')) return 'parts';
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

type WorkingHours = { start?: number; end?: number; days?: number[] } | null;

function withinWorkingHours(wh: WorkingHours, nowMs: number = Date.now()): boolean {
  if (!wh || (wh.start == null && wh.end == null)) return true;
  const now = new Date(nowMs - 3 * 60 * 60 * 1000); // BRT ≈ UTC-3
  const hour = now.getUTCHours();
  const day = now.getUTCDay();
  if (wh.days && wh.days.length && !wh.days.includes(day)) return false;
  if (wh.start != null && hour < wh.start) return false;
  if (wh.end != null && hour >= wh.end) return false;
  return true;
}

/**
 * Horário comercial padrão (BRT), usado quando o painel não configurou
 * working_hours em SITE_WhatsAppAIConfig — hoje o campo está vazio, e sem esse
 * padrão TODA mensagem cairia como "dentro do horário".
 */
const DEFAULT_BUSINESS_HOURS = {
  weekday: { start: 8, end: 18 }, // seg–sex
  saturday: { start: 8, end: 12 }, // sáb
} as const;

const DEFAULT_BUSINESS_HOURS_LABEL = 'de segunda a sexta, das 8h às 18h, e sábado das 8h às 12h';

/** Painel configurou horário? Respeita. Senão, padrão da W-Tech (domingo fechado). */
export function withinBusinessHours(wh: WorkingHours, nowMs: number = Date.now()): boolean {
  if (wh && (wh.start != null || wh.end != null)) return withinWorkingHours(wh, nowMs);
  const now = new Date(nowMs - 3 * 60 * 60 * 1000); // BRT ≈ UTC-3
  const hour = now.getUTCHours();
  const day = now.getUTCDay(); // 0 = domingo
  if (day === 0) return false;
  const win = day === 6 ? DEFAULT_BUSINESS_HOURS.saturday : DEFAULT_BUSINESS_HOURS.weekday;
  return hour >= win.start && hour < win.end;
}

/** Frase do horário para a mensagem de fora do expediente. */
function businessHoursLabel(wh: WorkingHours): string {
  if (wh && (wh.start != null || wh.end != null)) return 'no nosso horário de atendimento';
  return DEFAULT_BUSINESS_HOURS_LABEL;
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

// ─── Handoff → CRM: cria/atualiza o lead e define o dono ─────────────────────

const stripAccents = (s: string): string => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

interface AttendantRow {
  id: string;
  name: string;
  status?: string | null;
  role?: any;
}

/** Papéis fora da roleta aleatória (citação nominal continua valendo p/ todos). */
const ROLETA_EXCLUDED_ROLES = ['super admin', 'financeiro'];

// ─── MODO SOMENTE TRANSFERÊNCIA (atendimento por IA suspenso) ────────────────
// A Bia NÃO responde nem gera rascunho: toda mensagem recebida vira handoff
// imediato para um atendente humano. Para reativar a IA, mude para false.
const TRANSFER_ONLY = true;

/** Saudação da W-Tech — abre toda mensagem do modo transferência. */
const GREETING = 'Olá! Aqui é a Bia, da W-Tech Brasil. 😊';

/**
 * Pool de atendentes do modo transferência (primeiro nome, sem acento,
 * minúsculo). Variantes de grafia cobrem diferenças entre o pedido e o
 * cadastro em SITE_Users.
 */
const TRANSFER_POOL_FIRST_NAMES: string[][] = [
  ['emerson'],
  ['michael', 'michel', 'mikael'],
  ['christofer', 'christopher', 'cristofer', 'cristopher', 'kristofer'],
  ['andre'],
];

function isInTransferPool(user: AttendantRow): boolean {
  const first = stripAccents(String(user.name).trim().split(/\s+/)[0].toLowerCase());
  return TRANSFER_POOL_FIRST_NAMES.some((variants) => variants.includes(first));
}

async function loadActiveUsers(supabase: SupabaseClient): Promise<AttendantRow[]> {
  const { data } = await supabase.from('SITE_Users').select('id, name, status, role');
  return ((data || []) as AttendantRow[]).filter(
    (u) => u.name && String(u.status || 'Active').toLowerCase() === 'active'
  );
}

/** Atendente citado pelo cliente na mensagem (primeiro nome, sem acento, palavra inteira). */
function findMentionedAttendant(users: AttendantRow[], text: string): AttendantRow | null {
  const normalized = stripAccents((text || '').toLowerCase());
  for (const u of users) {
    const first = stripAccents(String(u.name).trim().split(/\s+/)[0].toLowerCase());
    if (first.length >= 3 && new RegExp(`(^|[^a-z])${first}([^a-z]|$)`).test(normalized)) return u;
  }
  return null;
}

/**
 * Transferência da Bia → CRM: garante que o contato exista em SITE_Leads e
 * define o dono do atendimento.
 *   - `preferred` (atendente citado pelo cliente) SEMPRE vira o dono.
 *   - Sem citação: roleta aleatória entre a equipe (exceto Super Admin/Financeiro),
 *     respeitando o dono atual quando o lead já tem um.
 * Nunca lança — falha aqui não pode derrubar a resposta ao cliente.
 */
async function routeHandoffToCRM(
  supabase: SupabaseClient,
  waId: string,
  incomingText: string,
  reason: string,
  users: AttendantRow[],
  preferred: AttendantRow | null
): Promise<{ chosenFirstName: string | null; byName: boolean }> {
  try {
    let chosen = preferred;
    let via = preferred ? 'citação do cliente' : 'roleta aleatória';
    if (!chosen) {
      const pool = users.filter((u) => {
        const role = stripAccents(String(typeof u.role === 'string' ? u.role : u.role?.name || '').toLowerCase());
        return !ROLETA_EXCLUDED_ROLES.includes(role);
      });
      const list = pool.length ? pool : users;
      chosen = list.length ? list[Math.floor(Math.random() * list.length)] : null;
    }

    const digits = (waId || '').replace(/\D/g, '');
    const last8 = digits.slice(-8);
    const { data: convRow } = await supabase
      .from('SITE_WhatsAppCloudConversations')
      .select('profile_name')
      .eq('wa_id', waId)
      .maybeSingle();
    const displayName = convRow?.profile_name || `WhatsApp +${digits}`;

    const stamp = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const note =
      `[Bia → atendente] ${reason}. Última mensagem: "${(incomingText || '').slice(0, 180)}". ` +
      `Dono por ${via}${chosen ? `: ${chosen.name}` : ' (nenhum atendente ativo)'} — ${stamp}`;

    const { data: matches } = await supabase
      .from('SITE_Leads')
      .select('id, status, assigned_to, internal_notes')
      .ilike('phone', `%${last8}%`)
      .limit(1);
    const existing = matches?.[0];

    if (existing) {
      const patch: Record<string, any> = {
        internal_notes: [existing.internal_notes, note].filter(Boolean).join('\n'),
        updated_at: new Date().toISOString(),
      };
      // Citação nominal força o dono; roleta só assume lead sem dono.
      if (chosen && (preferred || !existing.assigned_to)) patch.assigned_to = chosen.id;
      // Lead frio/perdido volta pro board como novo.
      if (['Cold', 'Rejected', 'Lost'].includes(existing.status)) patch.status = 'New';
      await supabase.from('SITE_Leads').update(patch).eq('id', existing.id);
    } else {
      await supabase.from('SITE_Leads').insert([
        {
          name: displayName,
          phone: digits,
          type: 'Contact_Form',
          status: 'New',
          context_id: 'WhatsApp',
          assigned_to: chosen?.id || null,
          internal_notes: note,
          tags: ['bia-handoff'],
        },
      ]);
    }

    return {
      chosenFirstName: chosen ? String(chosen.name).trim().split(/\s+/)[0] : null,
      byName: !!preferred,
    };
  } catch (e: any) {
    console.error('[aiReply] routeHandoffToCRM falhou:', e?.message);
    return { chosenFirstName: null, byName: false };
  }
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

  // Atendimento por IA suspenso: a Bia só transfere para um humano.
  // Não classifica intenção, não consulta agenda, não chama LLM, não responde
  // pergunta nenhuma — apenas garante o lead no CRM com o dono certo e avisa
  // o cliente UMA vez que um atendente vai assumir.
  if (TRANSFER_ONLY) {
    const activeUsers = await loadActiveUsers(supabase);
    const pool = activeUsers.filter(isInTransferPool);
    if (!pool.length) {
      console.warn('[aiReply] Nenhum atendente do pool de transferência ativo — usando roleta geral.');
    }
    const users = pool.length ? pool : activeUsers;
    // Citação nominal só força o dono quando vem com palavra de atendimento
    // ("falar com o Emerson"); "aqui é o André" não rouba o lead de ninguém.
    const wantsAttendant = /(^|[^a-z])(falar|atendente|atendimento|transferir|chama(r)?|passa(r)?|humano)([^a-z]|$)/.test(
      stripAccents(incomingText.toLowerCase())
    );
    const mentioned = wantsAttendant ? findMentionedAttendant(users, incomingText) : null;
    const open = withinBusinessHours(config.working_hours);
    const routed = await routeHandoffToCRM(
      supabase,
      waId,
      incomingText,
      open
        ? 'Atendimento por IA suspenso — transferência automática para atendente'
        : 'Atendimento por IA suspenso — mensagem recebida FORA do horário comercial',
      users,
      mentioned
    );

    const alreadyPending = conv.status === 'pendente';
    await setStatus(supabase, conversationId, 'pendente');
    if (!alreadyPending) {
      const msg = open
        ? `${GREETING}\n\n${
            routed.chosenFirstName
              ? `Já estou chamando ${routed.chosenFirstName}, da nossa equipe, para te atender.`
              : 'Já estou chamando um atendente da nossa equipe para te atender.'
          } É só um instante! 😉`
        : `${GREETING}\n\nNossos atendentes não estão online agora — o atendimento funciona ${businessHoursLabel(
            config.working_hours
          )}.\n\nJá registrei sua mensagem aqui e, assim que a equipe voltar, alguém te responde por este WhatsApp. 👍`;
      const msgId = await sendCloudText(cloudCfg, waId, msg);
      if (msgId) await storeOutMessage(supabase, conversationId, waId, msg, 'ai', 'sent', msgId);
    }
    return;
  }

  if (!withinWorkingHours(config.working_hours)) {
    await setStatus(supabase, conversationId, 'pendente');
    return;
  }

  const lower = incomingText.toLowerCase();
  const hitKeyword = (config.handoff_keywords || []).some((k) => k && lower.includes(k.toLowerCase()));

  // Teto de turnos antes de passar para humano. Contamos as mensagens do CLIENTE
  // (não as da IA): com a humanização cada resposta vira vários balões 'ai', então
  // contar 'ai' estouraria o limite cedo demais. 1 mensagem do cliente ≈ 1 turno.
  //
  // IMPORTANTE: o teto vale por SESSÃO (últimas 24h), não pela conversa inteira.
  // Sem essa janela, qualquer contato antigo (>N mensagens na vida) caía no
  // fallback "vou te transferir" para sempre — inclusive num simples "oi".
  const sessionStartISO = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count: turnCount } = await supabase
    .from('SITE_WhatsAppCloudMessages')
    .select('id', { count: 'exact', head: true })
    .eq('conversation_id', conversationId)
    .eq('direction', 'in')
    .gte('timestamp', sessionStartISO);

  const keys = await loadAIKeys(supabase, config.provider);
  const intent = await classifyIntent(keys, incomingText);

  // Transferência por citação de nome: "quero falar com o Emerson" → Emerson.
  // Exige palavra de atendimento junto do nome pra não transferir quando o
  // cliente só se apresenta ("sou o Alex").
  const activeUsers = await loadActiveUsers(supabase);
  const mentioned = findMentionedAttendant(activeUsers, incomingText);
  const asksToTalk = /(^|[^a-z])(falar|atendente|atendimento|transferir|chama(r)?|passa(r)?|humano)([^a-z]|$)/.test(
    stripAccents(lower)
  );
  const handoffByName = !!mentioned && asksToTalk;

  // Compra de peça/ferramenta/produto físico: por enquanto SEMPRE vai para um
  // atendente humano (regra de negócio), com o lead roteado no CRM.
  const wantsParts = intent === 'parts';

  if (hitKeyword || handoffByName || wantsParts || (turnCount || 0) >= config.max_msgs_before_handoff) {
    const reason = handoffByName
      ? `Cliente pediu para falar com ${mentioned!.name}`
      : hitKeyword
      ? 'Cliente pediu atendimento humano (palavra-chave)'
      : wantsParts
      ? 'Cliente quer comprar/orçar peça ou ferramenta'
      : 'Limite de mensagens da sessão atingido';

    // Garante o lead no CRM com o dono certo (citação > roleta aleatória).
    const routed = await routeHandoffToCRM(supabase, waId, incomingText, reason, activeUsers, handoffByName ? mentioned : null);

    // Avisa o cliente que um humano vai assumir (UMA vez por handoff — se a
    // conversa já está pendente, não repete o fallback a cada nova mensagem).
    const alreadyPending = conv.status === 'pendente';
    await setStatus(supabase, conversationId, 'pendente');
    // Citação nominal é pedido explícito: confirma mesmo se já estava pendente.
    if (!alreadyPending || routed.byName) {
      const farewell = routed.byName && routed.chosenFirstName
        ? `Perfeito! Já estou te passando para ${routed.chosenFirstName}, só um instante. 😉`
        : config.fallback_message;
      const msgId = await sendCloudText(cloudCfg, waId, farewell);
      if (msgId) await storeOutMessage(supabase, conversationId, waId, farewell, 'ai', 'sent', msgId);
    }
    return;
  }
  const knowledge = await loadKnowledge(supabase, intent);
  const rules = await loadRules(supabase);
  // RAG: aprende com atendimentos anteriores (requer chave Gemini para embeddings).
  const memory = await retrieveMemory(supabase, keys.gemini || '', incomingText);
  // Dados vivos: agenda REAL de cursos do banco. Entra SEMPRE que habilitado —
  // a conversa pode desviar para curso a qualquer momento, e condicionar ao
  // classificador de intenção deixava a IA sem dados quando ele errava
  // (era exatamente aí que ela inventava curso/preço/data).
  const agenda = config.useLiveCourses ? await loadCourseAgenda(supabase) : null;

  let agendaBlock = '';
  if (agenda) {
    if (agenda.state === 'ok') {
      agendaBlock =
        `AGENDA OFICIAL DE CURSOS (fonte ÚNICA da verdade, ao vivo do sistema — se não está aqui, NÃO existe turma aberta):\n${agenda.block}\n\n` +
        `REGRAS DA AGENDA (OBRIGATÓRIAS):\n` +
        `- Só cite curso, data, cidade, preço, vaga e link que estejam EXATAMENTE na agenda acima.\n` +
        `- Se o cliente perguntar por curso, cidade ou data que NÃO está na agenda, diga com honestidade que não há turma aberta disso no momento e ofereça as turmas listadas ou anotar o interesse para avisar quando abrir.\n` +
        `- Preço, data ou link de curso vindo da base de conhecimento, de atendimentos anteriores ou do histórico está DESATUALIZADO: ignore e use somente a agenda acima.\n\n`;
    } else if (agenda.state === 'empty') {
      agendaBlock =
        `AGENDA OFICIAL DE CURSOS (fonte ÚNICA da verdade, ao vivo do sistema): NENHUMA turma com inscrições abertas no momento.\n` +
        `- Se perguntarem de curso, diga isso com honestidade. NUNCA cite nome de curso, data, cidade, preço ou link de inscrição — qualquer dado desses vindo de outra fonte está desatualizado.\n` +
        `- Ofereça anotar o interesse do cliente para avisar assim que abrir nova turma e indique o site ${SITE_BASE}.\n\n`;
    } else {
      agendaBlock =
        `ATENÇÃO — AGENDA DE CURSOS INDISPONÍVEL AGORA (falha temporária na consulta):\n` +
        `- NÃO afirme curso, data, cidade, preço ou vaga de memória.\n` +
        `- Se perguntarem de curso, diga que vai confirmar a agenda certinho e ofereça passar para um atendente, ou indique o site ${SITE_BASE}.\n\n`;
    }
  }

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
    agendaBlock +
    (knowledge
      ? `O QUE VOCÊ PODE DIZER (base de conhecimento${agendaBlock ? ' — para curso, data, preço e link vale SEMPRE a agenda oficial acima' : ''}):\n${knowledge}\n\n`
      : '') +
    (memory
      ? `ATENDIMENTOS ANTERIORES PARECIDOS (referência de tom e abordagem; preços, datas e links citados aqui podem estar vencidos — não os repita):\n${memory}\n\n`
      : '') +
    (rules ? `REGRAS OBRIGATÓRIAS:\n${rules}\n\n` : '') +
    `COMO CONVERSAR:\n` +
    `- Responda em português do Brasil com tom natural e conversacional, como uma pessoa de verdade digitando no WhatsApp.\n` +
    `- Se o cliente só cumprimentou ("oi", "bom dia", "boa noite"), responda o cumprimento com simpatia, se apresente em uma frase e pergunte como pode ajudar. NUNCA transfira nem fique em silêncio diante de um cumprimento.\n` +
    `- Faça UMA pergunta por vez. Não despeje todas as informações de uma vez: descubra primeiro o que o cliente precisa (qual curso, qual cidade, se já é mecânico).\n` +
    (!agenda
      ? `- Quando falar de curso, conduza para a inscrição: informe valor, data e cidade reais e envie o link de inscrição. Mencione que dá para parcelar no cartão.\n`
      : agenda.state === 'ok'
      ? `- Quando falar de curso, conduza para a inscrição usando SOMENTE a agenda oficial acima: informe valor, data e cidade listados e envie o link de inscrição listado. Mencione que dá para parcelar no cartão.\n`
      : '') +
    `- Use mensagens curtas. Quando a resposta tiver mais de uma ideia, separe em blocos curtos com UMA LINHA EM BRANCO entre eles — cada bloco vira uma mensagem.\n` +
    `- Evite textão e não use markdown, asteriscos ou listas numeradas.\n` +
    `- Só fale em transferir para um atendente se: (a) o cliente pedir explicitamente, (b) for reclamação/cancelamento/reembolso, ou (c) você realmente não tiver a informação nem na agenda nem na base de conhecimento. Nesses casos, avise com educação e pare de responder.\n` +
    `- NUNCA invente curso, preço, data, cidade, vaga ou condição de pagamento. Se a informação não está nos dados acima, diga que não tem essa informação no momento e ofereça confirmar com um atendente.`;

  let reply = '';
  try {
    // Sem acesso à web: remove variantes ':online' (OpenRouter) do modelo.
    const model = (config.model || '').trim().replace(/:online$/i, '') || null;
    reply = await callLLM(keys, systemPrompt, `Histórico:\n${historyText}\n\nNova mensagem do cliente: ${incomingText}`, model);
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
