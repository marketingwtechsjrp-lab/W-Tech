import { SupabaseClient } from '@supabase/supabase-js';
import {
  getServiceClient,
  loadCloudConfig,
  downloadMediaAsDataUrl,
  upsertConversation,
  previewFor,
  type CloudConfig,
} from './_whatsappCloud.js';
import { runAIResponder } from './_aiReply.js';

/**
 * Vercel Serverless Function — Webhook da WhatsApp Cloud API (Meta).
 * URL: /api/whatsapp-cloud-webhook
 *
 * Configurado no painel do app "wtech" em developers.facebook.com →
 * WhatsApp → Configuration → Webhook.
 *
 *   GET  → verificação do webhook (hub.challenge) ao assinar.
 *   POST → recebe mensagens e status (entregue/lida) dos contatos.
 *
 * Variáveis de ambiente (Vercel + .env):
 *   WHATSAPP_CLOUD_ACCESS_TOKEN, WHATSAPP_CLOUD_API_VERSION,
 *   WHATSAPP_CLOUD_WEBHOOK_VERIFY_TOKEN,
 *   VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * 100% independente da automação via Evolution API.
 */

async function handleIncomingMessage(
  supabase: SupabaseClient,
  cfg: CloudConfig,
  value: any,
  message: any
): Promise<void> {
  const waId: string = message.from;
  const contact = (value.contacts || [])[0];
  const profileName: string | null = contact?.profile?.name ?? null;
  const whenISO = new Date(
    (parseInt(message.timestamp, 10) || Date.now() / 1000) * 1000
  ).toISOString();
  const type: string = message.type;

  let body: string | null = null;
  let mediaData: string | null = null;
  let mediaMime: string | null = null;
  let mediaFilename: string | null = null;
  let storedType = type;

  if (type === 'text') {
    body = message.text?.body ?? '';
  } else if (['image', 'audio', 'video', 'document', 'sticker'].includes(type)) {
    const node = message[type] || {};
    body = node.caption ?? null;
    mediaFilename = node.filename ?? null;
    const dl = await downloadMediaAsDataUrl(node.id, node.mime_type || '', cfg.accessToken, cfg.apiVersion);
    if (dl) {
      mediaData = dl.dataUrl;
      mediaMime = dl.mime;
    }
  } else {
    storedType = 'unsupported';
    body = `[Tipo não suportado: ${type}]`;
  }

  const preview = previewFor(storedType, body);
  const conversationId = await upsertConversation(supabase, {
    waId,
    profileName,
    preview,
    whenISO,
    direction: 'in',
  });

  // Dedup por wa_message_id (a Meta reentrega o webhook em caso de falha).
  // ignoreDuplicates + select: 'inserted' só vem preenchido quando é mensagem NOVA,
  // então a IA nunca responde duas vezes à mesma mensagem reentregue.
  const { data: inserted } = await supabase.from('SITE_WhatsAppCloudMessages').upsert(
    {
      conversation_id: conversationId,
      wa_id: waId,
      wa_message_id: message.id,
      direction: 'in',
      type: storedType,
      body,
      media_data: mediaData,
      media_mime: mediaMime,
      media_filename: mediaFilename,
      status: 'received',
      sent_by: 'customer',
      timestamp: whenISO,
    },
    { onConflict: 'wa_message_id', ignoreDuplicates: true }
  ).select('id');

  const isNewMessage = Array.isArray(inserted) && inserted.length > 0;

  // IA de atendimento (best-effort). Só para texto e mensagem nova (não reentrega).
  if (isNewMessage && conversationId && storedType === 'text' && body && body.trim()) {
    try {
      await runAIResponder(supabase, cfg, { conversationId, waId, incomingText: body, incomingMessageId: message.id });
    } catch (e: any) {
      console.error('[WA Cloud Webhook] IA falhou:', e?.message);
    }
  }
}

async function handleStatus(supabase: SupabaseClient, status: any): Promise<void> {
  const errorDetail =
    status.errors && status.errors.length
      ? `${status.errors[0].code}: ${status.errors[0].title || status.errors[0].message || ''}`
      : null;

  await supabase
    .from('SITE_WhatsAppCloudMessages')
    .update({ status: status.status, error: errorDetail })
    .eq('wa_message_id', status.id);
}

export default async function handler(req: any, res: any) {
  // ── Verificação do webhook (GET) ──────────────────────────────────────────
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    let expected = '';
    try {
      expected = (await loadCloudConfig()).verifyToken;
    } catch (e: any) {
      console.error('[WA Cloud Webhook] Falha ao carregar config:', e?.message);
    }

    if (mode === 'subscribe' && token === expected && expected) {
      console.log('[WA Cloud Webhook] Verificação OK.');
      return res.status(200).send(challenge);
    }
    console.warn('[WA Cloud Webhook] Verificação falhou (token incorreto).');
    return res.status(403).send('Forbidden');
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ── Eventos (POST) — responde 200 sempre que possível ─────────────────────
  try {
    const supabase = getServiceClient();
    const cfg = await loadCloudConfig(supabase);
    const entries = (req.body || {}).entry || [];

    for (const entry of entries) {
      for (const change of entry.changes || []) {
        const value = change.value || {};
        for (const message of value.messages || []) {
          await handleIncomingMessage(supabase, cfg, value, message);
        }
        for (const status of value.statuses || []) {
          await handleStatus(supabase, status);
        }
      }
    }

    return res.status(200).json({ received: true });
  } catch (e: any) {
    console.error('[WA Cloud Webhook] Erro ao processar evento:', e?.message);
    // Mesmo em erro devolve 200, evitando loop de reentrega da Meta.
    return res.status(200).json({ received: true, error: e?.message });
  }
}
