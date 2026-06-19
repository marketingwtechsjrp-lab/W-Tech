import { loadCloudConfig } from './_whatsappCloud.js';

/**
 * Vercel Serverless Function — Status da WhatsApp Cloud API.
 * URL: /api/whatsapp-cloud-config  (GET)
 *
 * Devolve APENAS dados não-sensíveis (booleans + número de exibição),
 * para o painel mostrar se a integração está conectada. Nunca retorna
 * o access token nem o app secret. A config vem de SITE_Config (+ .env).
 */
export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const cfg = await loadCloudConfig();
    return res.status(200).json({
      configured: !!cfg.accessToken && !!cfg.phoneNumberId,
      hasWebhookToken: !!cfg.verifyToken,
      displayNumber: cfg.displayNumber || null,
      apiVersion: cfg.apiVersion,
    });
  } catch (e: any) {
    return res.status(200).json({ configured: false, hasWebhookToken: false, displayNumber: null, apiVersion: 'v20.0', error: e?.message });
  }
}
