import {
  GRAPH,
  getServiceClient,
  loadCloudConfig,
  normalizePhone,
  previewFor,
  upsertConversation,
  type CloudConfig,
} from './_whatsappCloud.js';
import { requireStaffPermission, requireSameOrigin } from './_auth.js';

/**
 * Vercel Serverless Function — WhatsApp Cloud API (Meta): status + envio.
 * URL: /api/whatsapp-cloud-send
 *
 *   GET  → status da integração (config/webhook/displayNumber/apiVersion —
 *          exige permissão `whatsapp_engine_config`, sessão de staff válida).
 *   POST → envia mensagem (texto/imagem/áudio/vídeo/documento) — exige
 *          `whatsapp_send`.
 *
 * GET e POST ficam no mesmo arquivo para respeitar o limite de 12 funções
 * serverless do plano Hobby da Vercel. O webhook continua separado.
 *
 * O app usa autenticação própria (tabela SITE_Users, sem Supabase Auth), então
 * as duas rotas exigem sessão de staff httpOnly válida + a permissão exata
 * (cookie + digest — ver api/_auth.ts) para não ficar aberto ao público.
 *
 * Body do POST (JSON):
 *   { to, type, text?, mediaBase64?, mediaMime?, filename?, caption? }
 *   - type: 'text' | 'image' | 'audio' | 'video' | 'document'
 *   - mediaBase64: data URL ("data:<mime>;base64,...") ou base64 puro
 *
 * Config vem de SITE_Config (painel → Integrações) com fallback para .env.
 *
 * Regra da Meta: mensagens livres só são permitidas dentro de 24h após a
 * última mensagem do contato. Fora disso, é preciso usar template aprovado.
 */

const MEDIA_TYPES = ['image', 'audio', 'video', 'document'];

/** Separa o mime e os bytes de um data URL ou base64 puro. */
function decodeMedia(mediaBase64: string, fallbackMime: string): { buffer: Buffer; mime: string } {
  const match = /^data:([^;]+);base64,(.*)$/s.exec(mediaBase64);
  if (match) {
    return { mime: match[1], buffer: Buffer.from(match[2], 'base64') };
  }
  return { mime: fallbackMime || 'application/octet-stream', buffer: Buffer.from(mediaBase64, 'base64') };
}

/** Sobe a mídia para a Meta e devolve o media id. */
async function uploadMedia(cfg: CloudConfig, buffer: Buffer, mime: string, filename: string): Promise<string> {
  const form = new FormData();
  form.append('messaging_product', 'whatsapp');
  form.append('type', mime);
  form.append('file', new Blob([buffer], { type: mime }), filename);

  const res = await fetch(`${GRAPH}/${cfg.apiVersion}/${cfg.phoneNumberId}/media`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${cfg.accessToken}` },
    body: form as any,
  });
  const data = await res.json();
  if (!res.ok || !data.id) {
    throw new Error(`Upload de mídia falhou: ${JSON.stringify(data)}`);
  }
  return data.id as string;
}

export default async function handler(req: any, res: any) {
  // ── Status (GET) — dados não-sensíveis para o painel ──────────────────────
  // "configured" = credenciais preenchidas. "live" = o token REALMENTE tem
  // acesso ao número na Meta (testa de verdade, pra não mostrar falso positivo).
  if (req.method === 'GET') {
    if (!(await requireStaffPermission(req, res, 'whatsapp_engine_config'))) return;
    try {
      const cfg = await loadCloudConfig();
      const configured = !!cfg.accessToken && !!cfg.phoneNumberId;
      let live = false;
      let liveError: string | null = null;

      if (configured) {
        try {
          const r = await fetch(
            `${GRAPH}/${cfg.apiVersion}/${cfg.phoneNumberId}?fields=display_phone_number,verified_name`,
            { headers: { Authorization: `Bearer ${cfg.accessToken}` } }
          );
          const d = await r.json();
          if (r.ok && d?.id) live = true;
          else liveError = d?.error?.message || `Sem acesso ao número (HTTP ${r.status}).`;
        } catch (e: any) {
          liveError = e?.message || 'Falha ao validar o token na Meta.';
        }
      }

      return res.status(200).json({
        configured,
        live,
        liveError,
        hasWebhookToken: !!cfg.verifyToken,
        displayNumber: cfg.displayNumber || null,
        apiVersion: cfg.apiVersion,
      });
    } catch (e: any) {
      return res.status(200).json({
        configured: false,
        live: false,
        liveError: e?.message || null,
        hasWebhookToken: false,
        displayNumber: null,
        apiVersion: 'v20.0',
      });
    }
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!requireSameOrigin(req, res)) return;
  if (!(await requireStaffPermission(req, res, 'whatsapp_send'))) return;

  const supabase = getServiceClient();
  const cfg = await loadCloudConfig(supabase);

  if (!cfg.accessToken || !cfg.phoneNumberId) {
    return res.status(500).json({
      error:
        'WhatsApp Cloud não configurado. Preencha o Access Token e o Phone Number ID em Configurações → Integrações.',
    });
  }

  const { to, type = 'text', text, mediaBase64, mediaMime, filename, caption } = req.body || {};

  const phone = normalizePhone(to);
  if (!phone) return res.status(400).json({ error: 'Telefone inválido.' });

  try {
    // ── Monta o payload (e sobe a mídia, se houver) ─────────────────────────
    const payload: Record<string, any> = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: phone,
      type,
    };

    let storedMediaData: string | null = null;
    let storedMediaMime: string | null = null;

    if (type === 'text') {
      if (!text || !String(text).trim()) {
        return res.status(400).json({ error: 'Mensagem de texto vazia.' });
      }
      payload.text = { body: String(text), preview_url: true };
    } else if (MEDIA_TYPES.includes(type)) {
      if (!mediaBase64) return res.status(400).json({ error: 'Mídia ausente.' });
      const { buffer, mime } = decodeMedia(mediaBase64, mediaMime);
      const name = filename || `arquivo.${(mime.split('/')[1] || 'bin').split(';')[0]}`;
      const mediaId = await uploadMedia(cfg, buffer, mime, name);

      const node: Record<string, any> = { id: mediaId };
      if (caption && type !== 'audio') node.caption = String(caption);
      if (type === 'document') node.filename = name;
      payload[type] = node;

      storedMediaData = mediaBase64.startsWith('data:')
        ? mediaBase64
        : `data:${mime};base64,${mediaBase64}`;
      storedMediaMime = mime;
    } else {
      return res.status(400).json({ error: `Tipo não suportado: ${type}` });
    }

    // ── Envia para a Meta ───────────────────────────────────────────────────
    const sendRes = await fetch(`${GRAPH}/${cfg.apiVersion}/${cfg.phoneNumberId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.accessToken}` },
      body: JSON.stringify(payload),
    });
    const sendData = await sendRes.json();

    if (!sendRes.ok) {
      const detail = sendData?.error?.message || JSON.stringify(sendData);
      console.error('[WA Cloud Send] Erro da Meta:', detail);
      return res.status(400).json({ error: detail });
    }

    const waMessageId: string | undefined = sendData.messages?.[0]?.id;
    const whenISO = new Date().toISOString();
    const bodyText = type === 'text' ? String(text) : caption ? String(caption) : null;

    // ── Persiste a mensagem enviada + atualiza a conversa ───────────────────
    const conversationId = await upsertConversation(supabase, {
      waId: phone,
      preview: previewFor(type, bodyText),
      whenISO,
      direction: 'out',
    });

    await supabase.from('SITE_WhatsAppCloudMessages').insert({
      conversation_id: conversationId,
      wa_id: phone,
      wa_message_id: waMessageId ?? null,
      direction: 'out',
      type,
      body: bodyText,
      media_data: storedMediaData,
      media_mime: storedMediaMime,
      media_filename: type === 'document' ? filename ?? null : null,
      status: 'sent',
      timestamp: whenISO,
    });

    return res.status(200).json({ success: true, wa_message_id: waMessageId, conversation_id: conversationId });
  } catch (e: any) {
    console.error('[WA Cloud Send] Falha:', e?.message);
    return res.status(500).json({ error: e?.message || 'Falha ao enviar.' });
  }
}
