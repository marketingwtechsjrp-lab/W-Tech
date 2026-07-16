import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Request, Response } from 'express';
import { processApprovalGroupMessage } from '../approvalsCore.js';

/**
 * Rota Express — Webhook de SINCRONIZAÇÃO dos WhatsApps dos atendentes
 * (Evolution API), portada da Supabase Edge Function
 * `supabase/functions/wa-atendentes-webhook`. URL: /api/wa-atendentes-webhook
 *
 * Recebe MESSAGES_UPSERT / SEND_MESSAGE / CONNECTION_UPDATE das instâncias
 * w-tech-atendente-* e espelha TODAS as mensagens (enviadas E recebidas) em
 * SITE_WaAtendenteMensagens. Não responde nada no WhatsApp — é escuta pura;
 * a análise por IA roda no painel admin, sob demanda.
 *
 * Segurança:
 *  - ?token= deve bater com SITE_Config.wa_atendentes_webhook_token
 *  - a instância do payload precisa existir em SITE_WaAtendentes
 *  - dedupe garantido pelo UNIQUE (instance_name, message_id)
 *
 * Regras herdadas do padrão validado (skill whatsapp-evolution):
 *  - NUNCA ignorar fromMe (as mensagens enviadas pelo atendente chegam assim)
 *  - processar ANTES de responder; responder SEMPRE 200 por último
 *  - payload defensivo (shape varia entre versões da Evolution)
 */

let cachedClient: SupabaseClient | null = null;
function getSupabase(): SupabaseClient | null {
  if (cachedClient) return cachedClient;
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!url || !key) return null;
  cachedClient = createClient(url, key);
  return cachedClient;
}

// ─── Caches em memória (TTL curto; num server persistente duram ainda mais) ──
const CACHE_TTL_MS = 60_000;
let tokenCache: { value: string; at: number } | null = null;
let atendentesCache: { map: Map<string, string>; at: number } | null = null;

async function getWebhookToken(supabase: SupabaseClient): Promise<string> {
  if (tokenCache && Date.now() - tokenCache.at < CACHE_TTL_MS) return tokenCache.value;
  const { data } = await supabase
    .from('SITE_Config')
    .select('value')
    .eq('key', 'wa_atendentes_webhook_token')
    .maybeSingle();
  const value = String(data?.value || '').trim();
  tokenCache = { value, at: Date.now() };
  return value;
}

/** Mapa instance_name → atendente_id (só instâncias registradas sincronizam). */
async function getAtendenteId(supabase: SupabaseClient, instance: string): Promise<string | null> {
  if (!atendentesCache || Date.now() - atendentesCache.at >= CACHE_TTL_MS) {
    const { data } = await supabase
      .from('SITE_WaAtendentes')
      .select('id, instance_name');
    const map = new Map<string, string>();
    (data || []).forEach((a: any) => {
      if (a.instance_name) map.set(String(a.instance_name), String(a.id));
    });
    atendentesCache = { map, at: Date.now() };
  }
  return atendentesCache.map.get(instance) || null;
}

// ─── Normalização do payload ────────────────────────────────────────────────

/** Desembrulha wrappers (efêmera, visualização única, documento com legenda). */
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

/** Classifica o tipo e extrai o texto/legenda. Retorna null p/ eventos de protocolo. */
function classifyMessage(rawMessage: any): { tipo: string; body: string | null } | null {
  const m = unwrapMessage(rawMessage);
  if (!m) return null;

  const text = String(m.conversation || m.extendedTextMessage?.text || '').trim();
  if (text) return { tipo: 'text', body: text };

  if (m.imageMessage) return { tipo: 'image', body: String(m.imageMessage.caption || '').trim() || null };
  if (m.videoMessage) return { tipo: 'video', body: String(m.videoMessage.caption || '').trim() || null };
  if (m.audioMessage) return { tipo: 'audio', body: null };
  if (m.documentMessage) {
    const label = String(m.documentMessage.caption || m.documentMessage.fileName || '').trim();
    return { tipo: 'document', body: label || null };
  }
  if (m.stickerMessage) return { tipo: 'sticker', body: null };
  if (m.locationMessage || m.liveLocationMessage) {
    const loc = m.locationMessage || m.liveLocationMessage;
    const coords = [loc.degreesLatitude, loc.degreesLongitude].filter((v: any) => v != null).join(', ');
    return { tipo: 'location', body: coords || null };
  }
  if (m.contactMessage) return { tipo: 'contact', body: String(m.contactMessage.displayName || '').trim() || null };
  if (m.contactsArrayMessage) return { tipo: 'contact', body: null };
  if (m.reactionMessage) return { tipo: 'reaction', body: String(m.reactionMessage.text || '').trim() || null };
  if (m.pollCreationMessage || m.pollCreationMessageV3) {
    const poll = m.pollCreationMessage || m.pollCreationMessageV3;
    return { tipo: 'poll', body: String(poll.name || '').trim() || null };
  }

  // Eventos de protocolo (revogação, sincronização etc.) não são mensagens.
  if (m.protocolMessage || m.senderKeyDistributionMessage) return null;

  return { tipo: 'other', body: null };
}

interface MsgRow {
  atendente_id: string;
  instance_name: string;
  chat_jid: string;
  chat_name: string | null;
  message_id: string;
  from_me: boolean;
  participant: string | null;
  tipo: string;
  body: string | null;
  timestamp: string;
}

/** Converte um item de MESSAGES_UPSERT/SEND_MESSAGE em linha da tabela. */
function toRow(item: any, instance: string, atendenteId: string): MsgRow | null {
  const key = item?.key || {};
  const chatJid = String(key.remoteJid || '').trim();
  const messageId = String(key.id || '').trim();
  if (!chatJid || !messageId) return null;
  if (chatJid === 'status@broadcast') return null; // stories não são atendimento

  const classified = classifyMessage(item?.message);
  if (!classified) return null;

  const fromMe = Boolean(key.fromMe);
  const tsRaw = Number(item?.messageTimestamp ?? item?.message?.messageTimestamp ?? 0);
  const tsMs = tsRaw > 0 ? tsRaw * 1000 : Date.now();

  // pushName é de QUEM ENVIOU: só serve de nome do chat quando veio do contato.
  const pushName = String(item?.pushName || '').trim();
  const chatName = !fromMe && pushName ? pushName : null;

  return {
    atendente_id: atendenteId,
    instance_name: instance,
    chat_jid: chatJid,
    chat_name: chatName,
    message_id: messageId,
    from_me: fromMe,
    participant: key.participant ? String(key.participant) : null,
    tipo: classified.tipo,
    body: classified.body,
    timestamp: new Date(tsMs).toISOString(),
  };
}

// ─── Handlers por evento ────────────────────────────────────────────────────

async function handleMessages(supabase: SupabaseClient, payload: any, instance: string, atendenteId: string): Promise<number> {
  const raw = payload?.data;
  const items = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const rows: MsgRow[] = [];
  for (const item of items) {
    const row = toRow(item, instance, atendenteId);
    if (row) rows.push(row);
  }
  if (!rows.length) return 0;

  const { error } = await supabase
    .from('SITE_WaAtendenteMensagens')
    .upsert(rows, { onConflict: 'instance_name,message_id', ignoreDuplicates: true });
  if (error) {
    console.error('[wa-atendentes] erro ao gravar mensagens:', error.message);
    return 0;
  }

  await supabase
    .from('SITE_WaAtendentes')
    .update({ last_event_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', atendenteId);

  return rows.length;
}

async function handleConnectionUpdate(supabase: SupabaseClient, payload: any, atendenteId: string): Promise<void> {
  const data = payload?.data || {};
  const stateRaw = String(data.state || data.connection || data.status || '').toLowerCase();
  if (!stateRaw) return;

  const status =
    stateRaw === 'open' ? 'open' :
    stateRaw === 'connecting' ? 'connecting' :
    'disconnected';

  const update: Record<string, string> = { status, updated_at: new Date().toISOString() };
  const wuid = String(data.wuid || data.ownerJid || '').split('@')[0];
  if (status === 'open' && wuid) update.phone = wuid;

  await supabase.from('SITE_WaAtendentes').update(update).eq('id', atendenteId);
}

// ─── Entrypoint ─────────────────────────────────────────────────────────────

export default async function waAtendentesWebhookHandler(req: Request, res: Response) {
  // Processa ANTES de responder; responde SEMPRE 200 no final (evita retry storm).
  try {
    if (req.method !== 'POST') {
      return res.status(200).json({ ok: true });
    }

    const supabase = getSupabase();
    if (!supabase) {
      console.error('[wa-atendentes] Envs ausentes: SUPABASE_URL/VITE_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY');
      // 200 mesmo assim — a Evolution só re-tenta em 5xx e não há o que reprocessar.
      return res.status(200).json({ ok: false });
    }

    const token = String(req.query.token || '');
    const expected = await getWebhookToken(supabase);
    if (!expected || token !== expected) {
      // 401 aqui é seguro: a Evolution só re-tenta em 5xx.
      return res.status(401).json({ error: 'unauthorized' });
    }

    const payload = (req.body as any) || null;
    const instance = String(payload?.instance || payload?.instanceName || '').trim();
    const event = String(payload?.event || '').toLowerCase().replace(/_/g, '.');

    if (!payload || !instance) {
      return res.status(200).json({ ok: true, skipped: 'payload' });
    }

    // ── Aprovações de Marketing (roteamento ANTES do fluxo de atendentes) ──
    // Mensagens cujo remoteJid é o GRUPO de aprovação (SITE_Config →
    // approval_settings.group_jid) são decisões/comentários de material:
    // são processadas em server/approvalsCore.ts e NÃO entram no espelho de
    // atendentes. Qualquer outro chat segue o fluxo atual, intacto.
    if (event === 'messages.upsert' || event === 'send.message') {
      const consumido = await processApprovalGroupMessage(supabase, payload);
      if (consumido) {
        return res.status(200).json({ ok: true, routed: 'approvals' });
      }
    }

    const atendenteId = await getAtendenteId(supabase, instance);
    if (!atendenteId) {
      // Instância não é de atendente — ignora silenciosamente (200).
      return res.status(200).json({ ok: true, skipped: 'instance' });
    }

    let saved = 0;
    if (event === 'messages.upsert' || event === 'send.message') {
      saved = await handleMessages(supabase, payload, instance, atendenteId);
    } else if (event === 'connection.update') {
      await handleConnectionUpdate(supabase, payload, atendenteId);
    }

    return res.status(200).json({ ok: true, event, saved });
  } catch (e) {
    console.error('[wa-atendentes] erro inesperado:', e);
    // 200 mesmo em erro interno — reprocessos duplicados morrem no UNIQUE.
    return res.status(200).json({ ok: false });
  }
}
