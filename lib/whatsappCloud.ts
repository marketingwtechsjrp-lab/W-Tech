import { supabase } from './supabaseClient';

/**
 * Cliente do módulo WhatsApp Cloud API (Meta) — usado pelo inbox do /admin.
 * Leitura: direto do Supabase (anon + RLS). Envio: via /api/whatsapp-cloud-send
 * (server-side, com o token de sessão do Supabase no header).
 *
 * Independente da Evolution API (lib/whatsapp.ts).
 */

export type CloudDirection = 'in' | 'out';
export type CloudMessageType =
  | 'text'
  | 'image'
  | 'audio'
  | 'video'
  | 'document'
  | 'sticker'
  | 'unsupported';

export interface CloudConversation {
  id: string;
  wa_id: string;
  profile_name: string | null;
  last_message: string | null;
  last_message_at: string | null;
  last_direction: CloudDirection | null;
  unread_count: number;
  created_at: string;
  updated_at: string;
}

export interface CloudMessage {
  id: string;
  conversation_id: string;
  wa_id: string;
  wa_message_id: string | null;
  direction: CloudDirection;
  type: CloudMessageType;
  body: string | null;
  media_data: string | null;
  media_mime: string | null;
  media_filename: string | null;
  status: string | null;
  error: string | null;
  timestamp: string;
  created_at: string;
}

const CONV_TABLE = 'SITE_WhatsAppCloudConversations';
const MSG_TABLE = 'SITE_WhatsAppCloudMessages';

// ─── Leitura ────────────────────────────────────────────────────────────────

export async function fetchConversations(): Promise<CloudConversation[]> {
  const { data, error } = await supabase
    .from(CONV_TABLE)
    .select('*')
    .order('last_message_at', { ascending: false, nullsFirst: false });
  if (error) {
    console.error('[WA Cloud] fetchConversations:', error.message);
    return [];
  }
  return (data || []) as CloudConversation[];
}

export async function fetchMessages(conversationId: string): Promise<CloudMessage[]> {
  const { data, error } = await supabase
    .from(MSG_TABLE)
    .select('*')
    .eq('conversation_id', conversationId)
    .order('timestamp', { ascending: true });
  if (error) {
    console.error('[WA Cloud] fetchMessages:', error.message);
    return [];
  }
  return (data || []) as CloudMessage[];
}

export async function markConversationRead(conversationId: string): Promise<void> {
  const { error } = await supabase
    .from(CONV_TABLE)
    .update({ unread_count: 0 })
    .eq('id', conversationId);
  if (error) console.error('[WA Cloud] markConversationRead:', error.message);
}

// ─── Realtime ────────────────────────────────────────────────────────────────

/** Assina mudanças em conversas e mensagens. Retorna uma função de cleanup. */
export function subscribeToChanges(onChange: () => void): () => void {
  const channel = supabase
    .channel('wa-cloud-inbox')
    .on('postgres_changes', { event: '*', schema: 'public', table: CONV_TABLE }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: MSG_TABLE }, onChange)
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// ─── Envio ───────────────────────────────────────────────────────────────────

interface SendResult {
  success: boolean;
  wa_message_id?: string;
  error?: string;
}

/**
 * O app usa autenticação própria (tabela SITE_Users, sem Supabase Auth), então
 * identificamos quem envia pelo id do usuário logado, validado no servidor.
 */
async function postSend(payload: Record<string, unknown>, actorId?: string): Promise<SendResult> {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (actorId) headers['x-wtech-user-id'] = actorId;
    const res = await fetch('/api/whatsapp-cloud-send', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) return { success: false, error: data.error || `Erro ${res.status}` };
    return { success: true, wa_message_id: data.wa_message_id };
  } catch (e: any) {
    return { success: false, error: e?.message || 'Falha de rede.' };
  }
}

export function sendCloudText(to: string, text: string, actorId?: string): Promise<SendResult> {
  return postSend({ to, type: 'text', text }, actorId);
}

export function sendCloudMedia(
  args: {
    to: string;
    type: 'image' | 'audio' | 'video' | 'document';
    mediaBase64: string;
    mediaMime?: string;
    filename?: string;
    caption?: string;
  },
  actorId?: string
): Promise<SendResult> {
  return postSend(args, actorId);
}

export interface CloudStatus {
  configured: boolean;
  hasWebhookToken: boolean;
  displayNumber: string | null;
  apiVersion: string;
}

export async function getCloudStatus(): Promise<CloudStatus | null> {
  try {
    // GET no mesmo endpoint do envio (status). POST = enviar mensagem.
    const res = await fetch('/api/whatsapp-cloud-send');
    if (!res.ok) return null;
    return (await res.json()) as CloudStatus;
  } catch {
    return null;
  }
}

// ─── Conversão de mídia (cliente) ────────────────────────────────────────────

/** Lê um arquivo como data URL base64 (sem rede). */
export function fileToDataUrl(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Falha ao ler arquivo.'));
    reader.readAsDataURL(file);
  });
}

/**
 * Converte uma imagem para JPEG e redimensiona (máx. 1600px).
 * A Cloud API só aceita JPEG/PNG em mensagens de imagem (WebP é só figurinha),
 * por isso aqui usamos JPEG — desvio intencional do padrão WebP do projeto.
 */
export function imageToJpegDataUrl(file: File, maxWidth = 1600, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const ratio = Math.min(1, maxWidth / img.width);
      const w = Math.round(img.width * ratio);
      const h = Math.round(img.height * ratio);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas indisponível.'));
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Falha ao carregar imagem.'));
    };
    img.src = objectUrl;
  });
}

/** Verdadeiro se a última mensagem do contato foi há mais de 24h (janela da Meta). */
export function isOutsideServiceWindow(lastInboundAt: string | null): boolean {
  if (!lastInboundAt) return true;
  return Date.now() - new Date(lastInboundAt).getTime() > 24 * 60 * 60 * 1000;
}
