import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Helper compartilhado da WhatsApp Cloud API (Meta).
 * Prefixo "_" → NÃO vira rota na Vercel; usado pelo webhook e pelo envio.
 * Totalmente independente do helper da Evolution API (api/_whatsapp.ts).
 *
 * A configuração é lida da tabela SITE_Config (painel → Configurações →
 * Integrações), com fallback para variáveis de ambiente. Assim o Daniel
 * gerencia tudo pelo sistema, sem depender só do .env.
 */

export const GRAPH = 'https://graph.facebook.com';

/** Chaves usadas em SITE_Config. */
const KEYS = {
  phoneNumberId: 'whatsapp_cloud_phone_number_id',
  wabaId: 'whatsapp_cloud_waba_id',
  appId: 'whatsapp_cloud_app_id',
  appSecret: 'whatsapp_cloud_app_secret',
  accessToken: 'whatsapp_cloud_access_token',
  apiVersion: 'whatsapp_cloud_api_version',
  verifyToken: 'whatsapp_cloud_webhook_verify_token',
  displayNumber: 'whatsapp_cloud_display_number',
} as const;

export interface CloudConfig {
  phoneNumberId: string;
  wabaId: string;
  appId: string;
  appSecret: string;
  accessToken: string;
  apiVersion: string;
  verifyToken: string;
  displayNumber: string;
}

export function getServiceClient(): SupabaseClient {
  const url = process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error('Supabase env vars ausentes');
  return createClient(url, serviceKey);
}

/**
 * Carrega a config: SITE_Config (prioridade) → variável de ambiente → default.
 * Lê com a service role (ignora RLS), então roda só no servidor.
 */
export async function loadCloudConfig(supabase?: SupabaseClient): Promise<CloudConfig> {
  const client = supabase || getServiceClient();
  const map: Record<string, string> = {};
  try {
    const { data } = await client.from('SITE_Config').select('key, value');
    (data || []).forEach((c: any) => {
      map[c.key] = c.value;
    });
  } catch (e: any) {
    console.error('[WA Cloud] Falha ao ler SITE_Config:', e?.message);
  }

  const pick = (key: string, envName: string, dflt = ''): string =>
    (map[key] || '').trim() || (process.env[envName] || '').trim() || dflt;

  return {
    phoneNumberId: pick(KEYS.phoneNumberId, 'WHATSAPP_CLOUD_PHONE_NUMBER_ID'),
    wabaId: pick(KEYS.wabaId, 'WHATSAPP_CLOUD_WABA_ID'),
    appId: pick(KEYS.appId, 'WHATSAPP_CLOUD_APP_ID'),
    appSecret: pick(KEYS.appSecret, 'WHATSAPP_CLOUD_APP_SECRET'),
    accessToken: pick(KEYS.accessToken, 'WHATSAPP_CLOUD_ACCESS_TOKEN'),
    apiVersion: pick(KEYS.apiVersion, 'WHATSAPP_CLOUD_API_VERSION', 'v20.0'),
    verifyToken: pick(KEYS.verifyToken, 'WHATSAPP_CLOUD_WEBHOOK_VERIFY_TOKEN'),
    displayNumber: pick(KEYS.displayNumber, 'WHATSAPP_CLOUD_DISPLAY_NUMBER'),
  };
}

/** Normaliza telefone BR para o formato da Meta (apenas dígitos, com DDI 55). */
export function normalizePhone(raw: string): string | null {
  const digits = (raw || '').replace(/\D/g, '');
  if (digits.length < 10) return null;
  return digits.length <= 11 ? `55${digits}` : digits;
}

/** Texto de preview para a lista de conversas. */
export function previewFor(type: string, text: string | null): string {
  if (type === 'text') return text || '';
  const labels: Record<string, string> = {
    image: '📷 Imagem',
    audio: '🎤 Áudio',
    video: '🎬 Vídeo',
    document: '📄 Documento',
    sticker: '💟 Figurinha',
  };
  return labels[type] || text || 'Mensagem';
}

/** Baixa a mídia da Meta (2 passos) e devolve um data URL base64. */
export async function downloadMediaAsDataUrl(
  mediaId: string,
  fallbackMime: string,
  accessToken: string,
  apiVersion: string
): Promise<{ dataUrl: string; mime: string } | null> {
  if (!accessToken || !mediaId) return null;
  try {
    const metaRes = await fetch(`${GRAPH}/${apiVersion}/${mediaId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!metaRes.ok) return null;
    const meta = (await metaRes.json()) as { url?: string; mime_type?: string };
    if (!meta.url) return null;

    const binRes = await fetch(meta.url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!binRes.ok) return null;
    const buf = Buffer.from(await binRes.arrayBuffer());
    const mime = meta.mime_type || fallbackMime || 'application/octet-stream';
    return { dataUrl: `data:${mime};base64,${buf.toString('base64')}`, mime };
  } catch (e: any) {
    console.error('[WA Cloud] Falha ao baixar mídia:', e?.message);
    return null;
  }
}

/** Garante a conversa e devolve o id; atualiza preview, direção e não-lidas. */
export async function upsertConversation(
  supabase: SupabaseClient,
  args: {
    waId: string;
    profileName?: string | null;
    preview: string;
    whenISO: string;
    direction: 'in' | 'out';
  }
): Promise<string | null> {
  const { waId, profileName, preview, whenISO, direction } = args;

  const { data: existing } = await supabase
    .from('SITE_WhatsAppCloudConversations')
    .select('id, unread_count')
    .eq('wa_id', waId)
    .maybeSingle();

  if (!existing) {
    const { data: inserted } = await supabase
      .from('SITE_WhatsAppCloudConversations')
      .insert({
        wa_id: waId,
        profile_name: profileName ?? null,
        last_message: preview,
        last_message_at: whenISO,
        last_direction: direction,
        unread_count: direction === 'in' ? 1 : 0,
      })
      .select('id')
      .single();
    return inserted?.id ?? null;
  }

  const newUnread =
    direction === 'in'
      ? (Number(existing.unread_count) || 0) + 1
      : Number(existing.unread_count) || 0;

  const patch: Record<string, any> = {
    last_message: preview,
    last_message_at: whenISO,
    last_direction: direction,
    unread_count: newUnread,
    updated_at: new Date().toISOString(),
  };
  if (profileName) patch.profile_name = profileName;

  await supabase
    .from('SITE_WhatsAppCloudConversations')
    .update(patch)
    .eq('id', existing.id as string);

  return existing.id as string;
}
