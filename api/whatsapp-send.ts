import { sendWhatsAppText, sendWhatsAppMedia, resolveInstanceFromArg } from './_whatsapp.js';

/**
 * Vercel Serverless Function — Envio de WhatsApp (Evolution) SERVER-SIDE.
 * URL: /api/whatsapp-send
 *
 * SEGURANÇA: substitui o envio que antes acontecia no NAVEGADOR (lib/whatsapp.ts),
 * onde `evolution_api_key` era lida de SITE_Config e usada direto no cliente —
 * ou seja, a chave da API do WhatsApp era exposta a QUALQUER visitante das
 * landing pages. Agora a chave nunca sai do servidor.
 *
 * É público de propósito: as landing pages (sem login) disparam a mensagem de
 * boas-vindas para o próprio lead. Mitigações: cap de tamanho, telefone
 * normalizado/validado no primitivo, e o atacante não tem mais a chave da API
 * (só consegue disparar por este endpoint, que pode ganhar rate-limit via
 * KV/Upstash como próximo passo). Ainda assim é MUITO melhor que expor a chave.
 *
 * POST {
 *   to: string,                 // telefone (55DDD...) ou JID de grupo
 *   message?: string,           // texto (quando não é mídia)
 *   mediaUrl?: string,          // se presente, envia mídia
 *   caption?: string,
 *   mediaType?: 'image' | 'video' | 'document',
 *   instance?: string           // UUID (instância do usuário) ou nome direto; vazio = padrão
 * }
 */

const MAX_TEXT = 4096;

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { to, message, mediaUrl, caption, mediaType, instance } = req.body || {};

  if (!to || typeof to !== 'string') {
    return res.status(400).json({ success: false, error: 'Destinatário ausente.' });
  }

  try {
    const resolvedInstance = await resolveInstanceFromArg(typeof instance === 'string' ? instance : undefined);

    // ── Mídia ────────────────────────────────────────────────────────────────
    if (mediaUrl && typeof mediaUrl === 'string') {
      const type: 'image' | 'video' | 'document' =
        mediaType === 'video' || mediaType === 'document' ? mediaType : 'image';
      const r = await sendWhatsAppMedia(to, mediaUrl, String(caption || ''), resolvedInstance, type);
      return res.status(200).json({ success: r.sent, sent: r.sent, skipped: r.skipped, error: r.error });
    }

    // ── Texto ────────────────────────────────────────────────────────────────
    const text = String(message ?? '');
    if (!text.trim()) {
      return res.status(400).json({ success: false, error: 'Mensagem vazia.' });
    }
    if (text.length > MAX_TEXT) {
      return res.status(400).json({ success: false, error: 'Mensagem muito longa.' });
    }

    const r = await sendWhatsAppText(to, text, resolvedInstance);
    return res.status(200).json({ success: r.sent, sent: r.sent, skipped: r.skipped, error: r.error });
  } catch (err: any) {
    console.error('[whatsapp-send] Falha:', err?.message);
    return res.status(500).json({ success: false, error: 'Falha ao enviar.' });
  }
}
