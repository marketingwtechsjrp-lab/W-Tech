import type { SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';

/**
 * Núcleo do módulo de Aprovações de Marketing (server-side).
 *
 * Fluxo: o admin cria um item de aprovação (mídias já no Storage), o servidor
 * envia as mídias ao GRUPO de aprovação no WhatsApp (Evolution API) e o time
 * decide respondendo "APROVAR"/"REPROVAR" no próprio grupo (ou pelo painel).
 * A decisão via WhatsApp chega pelo webhook já existente da Evolution
 * (/api/wa-atendentes-webhook) — ver `processApprovalGroupMessage`.
 *
 * Este arquivo NÃO conhece Express: recebe o SupabaseClient por parâmetro
 * (mesmo padrão do wa-atendentes-webhook), o que facilita teste isolado.
 *
 * EVOLUTION_DRY_RUN=1 → nenhuma chamada real à Evolution: `evoRequest` loga a
 * requisição e devolve uma resposta sintética (ids "DRYRUN-…"). Usado nos
 * testes locais com curl.
 */

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface ApprovalMedia {
  url: string;
  type: 'image' | 'video' | 'document';
  name?: string;
  size?: number;
}

export interface ApprovalSettings {
  instance: string;
  group_jid: string;
  group_name: string | null;
  /** Fase 2 — grupo interno do time (relatórios, planejamentos e alertas de turma). */
  team_group_jid: string | null;
  team_group_name: string | null;
  /** Fase 2 — alerta de ocupação: olhar turmas nos próximos N dias. */
  course_alert_days: number;
  /** Fase 2 — alerta de ocupação: % mínimo de inscritos para não alertar. */
  course_alert_min_pct: number;
}

export const DEFAULT_COURSE_ALERT_DAYS = 45;
export const DEFAULT_COURSE_ALERT_MIN_PCT = 50;

/** Inteiro dentro de [min, max]; qualquer valor inválido cai no fallback. */
export function clampInt(raw: unknown, min: number, max: number, fallback: number): number {
  const n = Math.round(Number(raw));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(n, min), max);
}

export interface EvolutionBase {
  serverUrl: string;
  apiKey: string;
}

export type ApprovalDecision = 'Aprovado' | 'Reprovado' | 'Ajustes';

/** Linha de SITE_ApprovalItems (campos usados aqui). */
export interface ApprovalItem {
  id: number;
  title: string;
  description: string | null;
  media: ApprovalMedia[] | null;
  status: string;
  wa_instance: string | null;
  wa_group_jid: string | null;
  wa_message_ids: string[] | null;
  request_id: string | null;
  version: number | null;
}

const SETTINGS_KEY = 'approval_settings';
const WEBHOOK_TOKEN_KEY = 'wa_atendentes_webhook_token';
const CACHE_TTL_MS = 60_000;

// ─── Config: settings de aprovação (SITE_Config.approval_settings) ──────────

let settingsCache: { value: ApprovalSettings | null; at: number } | null = null;

/** Invalida o cache (chamar após salvar as settings). */
export function invalidateApprovalSettingsCache(): void {
  settingsCache = null;
}

/**
 * Lê as settings de SITE_Config (JSON), com cache de 60s.
 * Fase 2: além de {instance, group_jid, group_name}, carrega os campos do
 * grupo do time e do alerta de ocupação (com defaults) — retrocompatível com
 * JSONs antigos que só têm os 3 campos da Fase 1.
 */
export async function loadApprovalSettings(supabase: SupabaseClient): Promise<ApprovalSettings | null> {
  if (settingsCache && Date.now() - settingsCache.at < CACHE_TTL_MS) return settingsCache.value;

  let parsed: ApprovalSettings | null = null;
  try {
    const { data } = await supabase
      .from('SITE_Config')
      .select('value')
      .eq('key', SETTINGS_KEY)
      .maybeSingle();
    const raw = data?.value ? JSON.parse(String(data.value)) : null;
    if (raw?.instance && raw?.group_jid) {
      parsed = {
        instance: String(raw.instance),
        group_jid: String(raw.group_jid),
        group_name: raw.group_name ? String(raw.group_name) : null,
        team_group_jid: raw.team_group_jid ? String(raw.team_group_jid) : null,
        team_group_name: raw.team_group_name ? String(raw.team_group_name) : null,
        course_alert_days: clampInt(raw.course_alert_days, 1, 365, DEFAULT_COURSE_ALERT_DAYS),
        course_alert_min_pct: clampInt(raw.course_alert_min_pct, 0, 100, DEFAULT_COURSE_ALERT_MIN_PCT),
      };
    }
  } catch (e: any) {
    console.error('[approvals] Falha ao ler approval_settings:', e?.message);
  }

  settingsCache = { value: parsed, at: Date.now() };
  return parsed;
}

/** Salva as settings (upsert em SITE_Config) e invalida o cache. */
export async function saveApprovalSettings(supabase: SupabaseClient, s: ApprovalSettings): Promise<void> {
  const { error } = await supabase
    .from('SITE_Config')
    .upsert({ key: SETTINGS_KEY, value: JSON.stringify(s) }, { onConflict: 'key' });
  if (error) throw new Error('Falha ao salvar approval_settings: ' + error.message);
  invalidateApprovalSettingsCache();
}

// ─── Config: Evolution API (mesmo mecanismo de api/_whatsapp.ts) ─────────────

let evoCache: { value: EvolutionBase | null; at: number } | null = null;

/**
 * URL + apikey da Evolution lidas de SITE_Config (evolution_api_url /
 * evolution_api_key), com fallback para env — idêntico ao kiwify-webhook.
 * Em DRY_RUN devolve uma config sintética para os testes locais.
 */
export async function loadEvolutionBase(supabase: SupabaseClient): Promise<EvolutionBase | null> {
  if (evoCache && Date.now() - evoCache.at < CACHE_TTL_MS) return evoCache.value;

  let value: EvolutionBase | null = null;
  try {
    const { data } = await supabase.from('SITE_Config').select('key, value');
    const map: Record<string, string> = {};
    (data || []).forEach((c: any) => (map[c.key] = c.value));

    const serverUrl =
      (map['evolution_api_url'] || '').trim().replace(/\/$/, '') ||
      (process.env.EVOLUTION_API_URL || '').replace(/\/$/, '');
    const apiKey = (map['evolution_api_key'] || '').trim() || (process.env.EVOLUTION_API_KEY || '');
    if (serverUrl && apiKey) value = { serverUrl, apiKey };
  } catch (e: any) {
    console.error('[approvals] Falha ao carregar config da Evolution:', e?.message);
  }

  if (!value && process.env.EVOLUTION_DRY_RUN === '1') {
    value = { serverUrl: 'https://evolution.dry-run.local', apiKey: 'dry-run' };
  }

  evoCache = { value, at: Date.now() };
  return value;
}

// ─── HTTP para a Evolution (com modo DRY_RUN) ────────────────────────────────

/**
 * Chamada à Evolution API. Retorna o JSON da resposta ou null em falha
 * (nunca lança — envio é best-effort, o chamador decide o que fazer).
 */
async function evoRequest(
  evo: EvolutionBase,
  path: string,
  init?: { method?: string; body?: unknown; timeoutMs?: number },
): Promise<any | null> {
  const method = init?.method || 'GET';

  // Modo de teste: loga e fabrica a resposta sem tocar na Evolution real.
  if (process.env.EVOLUTION_DRY_RUN === '1') {
    const preview = init?.body ? JSON.stringify(init.body).slice(0, 300) : '';
    console.log(`[approvals] DRY_RUN ${method} ${path} ${preview}`);
    if (path.includes('/message/send')) return { key: { id: `DRYRUN-${randomUUID().slice(0, 8)}` } };
    if (path.includes('/group/fetchAllGroups')) return [];
    return {};
  }

  try {
    const res = await fetch(`${evo.serverUrl}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', apikey: evo.apiKey },
      body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
      signal: AbortSignal.timeout(init?.timeoutMs ?? 15_000),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      console.error(`[approvals] Evolution ${method} ${path} → HTTP ${res.status}:`,
        JSON.stringify(data)?.slice(0, 200));
      return null;
    }
    return data;
  } catch (e: any) {
    console.error(`[approvals] Evolution ${method} ${path} falhou:`, e?.message);
    return null;
  }
}

/** Envia texto ao grupo. Retorna true se a Evolution aceitou. */
export async function sendApprovalText(
  evo: EvolutionBase,
  instance: string,
  groupJid: string,
  text: string,
): Promise<boolean> {
  const data = await evoRequest(evo, `/message/sendText/${encodeURIComponent(instance)}`, {
    method: 'POST',
    body: { number: groupJid, text },
    timeoutMs: 15_000,
  });
  return data !== null;
}

/** Legenda da 1ª mídia do item (formato combinado com o time no WhatsApp). */
export function buildApprovalCaption(
  itemId: number,
  title: string,
  description: string | null | undefined,
  version?: number | null,
): string {
  const v = version && version > 1 ? ` (v${version})` : '';
  let caption = `📋 *APROVAÇÃO #${itemId}*${v}\n*${title}*`;
  if (description?.trim()) caption += `\n${description.trim()}`;
  caption += `\n\n👉 Responda esta mensagem com *APROVAR* ou *REPROVAR* (pode adicionar observação)`;
  return caption;
}

/**
 * Envia todas as mídias do item ao grupo (a primeira com a legenda) e coleta
 * os ids das mensagens (resp.key.id — defensivo: nem toda versão retorna).
 */
export async function sendItemMedia(
  evo: EvolutionBase,
  instance: string,
  groupJid: string,
  item: { id: number; title: string; description?: string | null },
  media: ApprovalMedia[],
  version?: number | null,
): Promise<{ sentCount: number; messageIds: string[] }> {
  const messageIds: string[] = [];
  let sentCount = 0;

  for (let i = 0; i < media.length; i++) {
    const m = media[i];
    if (!m?.url) continue;
    const mediatype: ApprovalMedia['type'] =
      m.type === 'video' || m.type === 'document' ? m.type : 'image';

    const body: Record<string, unknown> = {
      number: groupJid,
      mediatype,
      media: m.url,
      fileName: m.name || m.url.split('/').pop() || 'arquivo',
    };
    // Só a primeira mídia leva a legenda com o cabeçalho da aprovação.
    if (i === 0) body.caption = buildApprovalCaption(item.id, item.title, item.description, version);

    const data = await evoRequest(evo, `/message/sendMedia/${encodeURIComponent(instance)}`, {
      method: 'POST',
      body,
      timeoutMs: 30_000, // vídeos: a Evolution baixa a URL antes de responder
    });
    if (data !== null) {
      sentCount++;
      const mid = data?.key?.id || data?.messageId;
      if (mid) messageIds.push(String(mid));
    }
  }

  return { sentCount, messageIds };
}

// ─── Webhook da instância (registro idempotente e conservador) ───────────────

/** Garante o token do webhook em SITE_Config (mesma chave do wa-atendentes). */
export async function ensureWebhookToken(supabase: SupabaseClient): Promise<string> {
  const { data } = await supabase
    .from('SITE_Config')
    .select('value')
    .eq('key', WEBHOOK_TOKEN_KEY)
    .maybeSingle();
  const existing = String(data?.value || '').trim();
  if (existing) return existing;

  const token = randomUUID().replace(/-/g, '');
  const { error } = await supabase
    .from('SITE_Config')
    .upsert({ key: WEBHOOK_TOKEN_KEY, value: token }, { onConflict: 'key' });
  if (error) throw new Error('Falha ao salvar token do webhook: ' + error.message);
  return token;
}

export type WebhookRegisterStatus = 'kept_existing' | 'registered' | 'existing_other' | 'error';

/**
 * Registra o webhook na instância SÓ se ela ainda não tiver nenhum.
 *
 * Regra validada em produção: se já existe webhook apontando para
 * /api/wa-atendentes-webhook, NÃO substituir — as decisões de aprovação são
 * roteadas pelo MESMO webhook (o handler diferencia pelo remoteJid do grupo).
 * Se existir webhook de OUTRO sistema, também não mexemos (devolvemos aviso).
 * Chave `webhookByEvents` tem esse nome EXATO (gotcha da Evolution).
 */
export async function registerApprovalWebhookIfNeeded(
  evo: EvolutionBase,
  instance: string,
  publicOrigin: string,
  token: string,
): Promise<{ status: WebhookRegisterStatus; existingUrl?: string; error?: string }> {
  const found = await evoRequest(evo, `/webhook/find/${encodeURIComponent(instance)}`, {
    method: 'GET',
    timeoutMs: 10_000,
  });
  const existingUrl = String(found?.url || found?.webhook?.url || '').trim();

  let result: { status: WebhookRegisterStatus; existingUrl?: string; error?: string };
  if (existingUrl.includes('/api/wa-atendentes-webhook')) {
    // Já aponta para o nosso handler — o roteamento por grupo resolve o resto.
    result = { status: 'kept_existing', existingUrl };
  } else if (existingUrl) {
    // Webhook de outro sistema: não substituímos (regra: só registrar se não houver nenhum).
    result = { status: 'existing_other', existingUrl };
  } else {
    const url = `${publicOrigin.replace(/\/$/, '')}/api/wa-atendentes-webhook?token=${token}`;
    const set = await evoRequest(evo, `/webhook/set/${encodeURIComponent(instance)}`, {
      method: 'POST',
      body: {
        webhook: {
          enabled: true,
          url,
          webhookByEvents: false, // nome EXATO da chave — validado em produção
          base64: true,
          events: ['MESSAGES_UPSERT'],
        },
      },
      timeoutMs: 10_000,
    });
    result = set !== null
      ? { status: 'registered' }
      : { status: 'error', error: 'Falha ao registrar webhook na Evolution.' };
  }

  // Settings da instância — SEM groupsIgnore (senão as mensagens do grupo de
  // aprovação nunca chegam). Formato varia entre versões → defensivo.
  await evoRequest(evo, `/settings/set/${encodeURIComponent(instance)}`, {
    method: 'POST',
    body: {
      rejectCall: false,
      groupsIgnore: false,
      alwaysOnline: false,
      readMessages: false,
      readStatus: false,
      syncFullHistory: false,
    },
    timeoutMs: 10_000,
  }).catch(() => { /* best-effort */ });

  return result;
}

/** Lista os grupos da instância (resposta pode ser array direto ou {groups}). */
export async function fetchInstanceGroups(
  evo: EvolutionBase,
  instance: string,
): Promise<Array<{ jid: string; name: string }>> {
  const data = await evoRequest(
    evo,
    `/group/fetchAllGroups/${encodeURIComponent(instance)}?getParticipants=false`,
    { method: 'GET', timeoutMs: 30_000 },
  );
  const list = Array.isArray(data) ? data : Array.isArray(data?.groups) ? data.groups : [];
  return list
    .map((g: any) => ({
      jid: String(g?.id || g?.jid || g?.remoteJid || '').trim(),
      name: String(g?.subject || g?.name || '').trim() || String(g?.id || ''),
    }))
    .filter((g: { jid: string }) => g.jid.endsWith('@g.us'));
}

// ─── Eventos (SITE_ApprovalEvents) ───────────────────────────────────────────

/** Grava um evento de auditoria. Best-effort: falha só loga, nunca propaga. */
export async function logApprovalEvent(
  supabase: SupabaseClient,
  row: {
    item_id?: number | null;
    request_id?: string | null;
    event: string;
    actor?: string | null;
    payload?: Record<string, unknown> | null;
  },
): Promise<void> {
  try {
    const { error } = await supabase.from('SITE_ApprovalEvents').insert({
      item_id: row.item_id ?? null,
      request_id: row.request_id ?? null,
      event: row.event,
      actor: row.actor ?? null,
      payload: row.payload ?? null,
    });
    if (error) console.error('[approvals] Falha ao gravar evento:', error.message);
  } catch (e: any) {
    console.error('[approvals] Falha ao gravar evento:', e?.message);
  }
}

// ─── Decisão (compartilhada entre a rota /decide e o webhook) ────────────────

function buildDecisionMessage(
  itemId: number,
  decision: ApprovalDecision,
  actor: string,
  note: string | null,
  via: 'sistema' | 'whatsapp',
): string {
  if (decision === 'Aprovado') {
    return `✅ *Aprovação #${itemId}* — APROVADO por ${actor} (via ${via === 'whatsapp' ? 'WhatsApp' : 'sistema'})`;
  }
  const label = decision === 'Reprovado' ? 'REPROVADO' : 'AJUSTES SOLICITADOS';
  let msg = `🔄 *Aprovação #${itemId}* — ${label} por ${actor} — material volta para produção.`;
  if (note?.trim()) msg += `\nMotivo: ${note.trim()}`;
  return msg;
}

/**
 * Aplica uma decisão a um item: atualiza SITE_ApprovalItems (decided_*),
 * grava evento, atualiza o pedido vinculado (SITE_CampaignRequests) e envia
 * a confirmação de TEXTO ao grupo (prefixo ✅/🔄 — o webhook ignora esses
 * prefixos, evitando loop já que fromMe NÃO é ignorado).
 *
 * `onlyIfEnviado` (webhook): a atualização só acontece se o item ainda estiver
 * "Enviado" — segunda decisão simultânea perde a corrida e é ignorada.
 */
export async function decideItem(
  supabase: SupabaseClient,
  item: ApprovalItem,
  opts: {
    decision: ApprovalDecision;
    note?: string | null;
    actor: string;
    via: 'sistema' | 'whatsapp';
    onlyIfEnviado?: boolean;
  },
): Promise<{ ok: boolean; item?: any; error?: string }> {
  const note = opts.note?.trim() || null;
  const patch = {
    status: opts.decision,
    decided_at: new Date().toISOString(),
    decided_by: opts.actor,
    decision_note: note,
  };

  let query = supabase.from('SITE_ApprovalItems').update(patch).eq('id', item.id);
  if (opts.onlyIfEnviado) query = query.eq('status', 'Enviado');
  const { data: rows, error } = await query.select();
  if (error) return { ok: false, error: error.message };

  const updated = Array.isArray(rows) ? rows[0] : rows;
  if (!updated) {
    // Corrida: outra decisão chegou antes (ou o item mudou de status). Ignora.
    return { ok: false, error: 'not_updated' };
  }

  await logApprovalEvent(supabase, {
    item_id: item.id,
    request_id: item.request_id,
    event: 'decisao',
    actor: opts.actor,
    payload: { decision: opts.decision, note, via: opts.via },
  });

  // Pedido vinculado: Aprovado → 'Aprovado'; Reprovado/Ajustes → volta a 'Producao'.
  if (item.request_id) {
    const requestStatus = opts.decision === 'Aprovado' ? 'Aprovado' : 'Producao';
    const { error: reqError } = await supabase
      .from('SITE_CampaignRequests')
      .update({ status: requestStatus })
      .eq('id', item.request_id);
    if (reqError) {
      console.error('[approvals] Falha ao atualizar pedido vinculado:', reqError.message);
    } else {
      await logApprovalEvent(supabase, {
        item_id: item.id,
        request_id: item.request_id,
        event: 'pedido_status',
        actor: opts.actor,
        payload: { status: requestStatus },
      });
    }
  }

  // Confirmação no grupo — usa instância/grupo gravados no item (fallback settings).
  try {
    const evo = await loadEvolutionBase(supabase);
    const settings = await loadApprovalSettings(supabase);
    const groupJid = item.wa_group_jid || settings?.group_jid;
    const instance = item.wa_instance || settings?.instance;
    if (evo && groupJid && instance) {
      await sendApprovalText(
        evo,
        instance,
        groupJid,
        buildDecisionMessage(item.id, opts.decision, opts.actor, note, opts.via),
      );
    }
  } catch (e: any) {
    console.error('[approvals] Falha ao enviar confirmação ao grupo:', e?.message);
  }

  return { ok: true, item: updated };
}

// ─── Parser das mensagens do grupo (puro — exportado para teste) ─────────────

/** Remove acentos e baixa a caixa (comparações insensíveis a caso/acento). */
function normalizeText(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Classifica o texto como decisão. Palavras com fronteira (\b) sobre o texto
 * normalizado; radicais (ajust/corrig/refaz/muda) casam prefixo. Se casar os
 * DOIS lados ("aprovar ou reprovar?") → ambíguo → null (ignorar).
 * Obs.: "aprovacao"/"aprovação" NÃO casa (não está na lista — evita falso
 * positivo em conversa sobre a aprovação #N).
 */
export function matchDecision(text: string): 'Aprovado' | 'Reprovado' | null {
  const norm = normalizeText(text);
  const approve =
    /\b(aprovar|aprovado|aprovada|aprova|ok|liberado)\b/.test(norm) ||
    text.includes('👍') || text.includes('✅');
  const reprove =
    /\b(reprovar|reprovado|reprovada|reprova)\b/.test(norm) ||
    /\b(ajust|corrig|refaz|muda)/.test(norm) ||
    text.includes('👎') || text.includes('❌');

  if (approve && reprove) return null; // ambíguo — conversa normal
  if (approve) return 'Aprovado';
  if (reprove) return 'Reprovado';
  return null;
}

/** Desembrulha wrappers (efêmera / visualização única) — igual ao wa-atendentes. */
function unwrapMessage(message: any): any {
  if (!message) return null;
  return (
    message.ephemeralMessage?.message ||
    message.viewOnceMessage?.message ||
    message.viewOnceMessageV2?.message ||
    message.documentWithCaptionMessage?.message ||
    message
  );
}

/** Extrai o texto com os fallbacks obrigatórios (texto, reply, legendas). */
export function extractMessageText(rawMessage: any): string {
  const m = unwrapMessage(rawMessage);
  if (!m) return '';
  return String(
    m.conversation ||
    m.extendedTextMessage?.text ||
    m.imageMessage?.caption ||
    m.videoMessage?.caption ||
    '',
  ).trim();
}

/** stanzaId do reply (contextInfo pode vir dentro do tipo OU no nível do data). */
export function extractStanzaId(item: any): string | null {
  const m = unwrapMessage(item?.message);
  const ctx =
    m?.extendedTextMessage?.contextInfo ||
    m?.imageMessage?.contextInfo ||
    m?.videoMessage?.contextInfo ||
    m?.documentMessage?.contextInfo ||
    item?.contextInfo ||
    null;
  const stanza = String(ctx?.stanzaId || '').trim();
  return stanza || null;
}

/** Referências "#123" citadas no texto. */
export function extractItemRefs(text: string): number[] {
  const refs: number[] = [];
  for (const m of text.matchAll(/#(\d{1,12})/g)) {
    const n = Number(m[1]);
    if (Number.isFinite(n)) refs.push(n);
  }
  return refs;
}

// ─── Processamento das mensagens do grupo de aprovação (via webhook) ─────────

// Dedupe por id de mensagem — a Evolution pode entregar o mesmo evento mais de
// uma vez (MESSAGES_UPSERT + SEND_MESSAGE, retries). TTL de 10 minutos.
const DEDUPE_TTL_MS = 10 * 60_000;
const MAX_MESSAGE_AGE_MS = 5 * 60_000;
const seenMessages = new Map<string, number>();

function isDuplicate(messageId: string): boolean {
  const now = Date.now();
  // Limpeza oportunista para o Map não crescer sem limite.
  if (seenMessages.size > 500) {
    for (const [id, at] of seenMessages) {
      if (now - at > DEDUPE_TTL_MS) seenMessages.delete(id);
    }
  }
  const at = seenMessages.get(messageId);
  if (at && now - at < DEDUPE_TTL_MS) return true;
  seenMessages.set(messageId, now);
  return false;
}

/** Timestamp da mensagem em ms (segundos, ms ou objeto Long — defensivo). */
function messageTimestampMs(item: any): number {
  const raw: any = item?.messageTimestamp ?? item?.message?.messageTimestamp ?? 0;
  const n = typeof raw === 'object' && raw !== null
    ? Number(raw.low ?? raw.toString?.() ?? 0)
    : Number(raw || 0);
  if (!n || !Number.isFinite(n)) return Date.now();
  return n > 1e12 ? n : n * 1000;
}

/** Status em que um item ainda aceita interação no grupo (decisão/comentário). */
const CANDIDATE_STATUSES = ['Enviado', 'Aprovado', 'Reprovado', 'Ajustes'];

/**
 * Processa UMA mensagem do grupo de aprovação.
 *
 * Identificação do item: (a) reply — stanzaId ∈ wa_message_ids de item
 * Enviado; (b) texto contém "#<id>" de item Enviado. Reply sem palavra de
 * decisão vira evento 'comentario'. Sem match → silêncio (conversa do grupo).
 */
async function handleGroupMessage(supabase: SupabaseClient, item: any): Promise<void> {
  const key = item?.key || {};
  const messageId = String(key.id || '').trim();
  if (!messageId || isDuplicate(messageId)) return;

  // Mensagens velhas (reconexão / sync de histórico) não geram decisão.
  if (Date.now() - messageTimestampMs(item) > MAX_MESSAGE_AGE_MS) return;

  const text = extractMessageText(item?.message);
  if (!text) return; // mídia sem legenda / evento de protocolo — nada a interpretar

  // NÃO ignoramos fromMe (o dono pode decidir do próprio aparelho), mas
  // ignoramos os prefixos das NOSSAS respostas para não entrar em loop.
  if (/^\s*(✅|🔄|📋|⚠)/u.test(text)) return;

  const actor =
    String(item?.pushName || '').trim() ||
    String(key.participant || '').split('@')[0] ||
    'grupo';

  const decision = matchDecision(text);
  const stanzaId = extractStanzaId(item);
  const refs = extractItemRefs(text);
  if (!stanzaId && refs.length === 0) return; // sem vínculo com item — conversa normal

  // Busca única dos itens recentes; o match (stanza/#id) acontece em memória.
  const { data, error } = await supabase
    .from('SITE_ApprovalItems')
    .select('*')
    .in('status', CANDIDATE_STATUSES)
    .order('sent_at', { ascending: false, nullsFirst: false })
    .limit(100);
  if (error) {
    console.error('[approvals] Falha ao buscar itens para decisão:', error.message);
    return;
  }
  const candidates = (data || []) as ApprovalItem[];

  // (a) Reply à mensagem de um item
  const byReply = stanzaId
    ? candidates.find(c => Array.isArray(c.wa_message_ids) && c.wa_message_ids.includes(stanzaId))
    : undefined;

  if (byReply) {
    if (decision && byReply.status === 'Enviado') {
      await decideItem(supabase, byReply, {
        decision,
        note: text,
        actor,
        via: 'whatsapp',
        onlyIfEnviado: true,
      });
    } else if (!decision) {
      // Reply sem palavra de decisão → comentário (não muda status).
      await logApprovalEvent(supabase, {
        item_id: byReply.id,
        request_id: byReply.request_id,
        event: 'comentario',
        actor,
        payload: { texto: text, message_id: messageId },
      });
    }
    // decisão sobre item já decidido → ignorar silenciosamente
    return;
  }

  // (b) Texto cita "#<id>" de item Enviado
  if (decision && refs.length > 0) {
    const byRef = candidates.find(c => c.status === 'Enviado' && refs.includes(Number(c.id)));
    if (byRef) {
      await decideItem(supabase, byRef, {
        decision,
        note: text,
        actor,
        via: 'whatsapp',
        onlyIfEnviado: true,
      });
    }
  }
  // Ambíguo/sem match → silêncio (é conversa normal do grupo).
}

/**
 * Ponto de entrada chamado pelo webhook /api/wa-atendentes-webhook ANTES do
 * fluxo de atendentes. Retorna true quando o payload pertence ao grupo de
 * aprovação (ou seja: já foi consumido aqui e NÃO deve seguir para o espelho
 * de atendentes). Payloads de outros chats retornam false (fluxo atual intacto).
 */
export async function processApprovalGroupMessage(
  supabase: SupabaseClient,
  payload: any,
): Promise<boolean> {
  try {
    const settings = await loadApprovalSettings(supabase);
    if (!settings?.group_jid) return false;

    const raw = payload?.data;
    const items = Array.isArray(raw) ? raw : raw ? [raw] : [];
    if (!items.length) return false;

    const ofGroup = items.filter(
      (i: any) => String(i?.key?.remoteJid || '').trim() === settings.group_jid,
    );
    if (!ofGroup.length) return false;

    for (const item of ofGroup) {
      await handleGroupMessage(supabase, item);
    }

    // Só "consome" o payload quando TODAS as mensagens são do grupo de
    // aprovação (caso normal: 1 mensagem por evento). Num lote misto, as
    // demais seguem para o fluxo de atendentes (o dedupe evita reprocesso).
    return ofGroup.length === items.length;
  } catch (e: any) {
    console.error('[approvals] Erro ao processar mensagem do grupo:', e?.message);
    // Em erro interno tratamos como consumido se era do grupo? Não — deixamos
    // o fluxo atual seguir apenas quando NADA era do grupo; aqui não sabemos,
    // então devolvemos false para não engolir mensagens de atendentes.
    return false;
  }
}
