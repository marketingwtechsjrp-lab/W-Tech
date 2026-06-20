import { sendWhatsAppText, type SendWhatsAppResult } from './_whatsapp.js';
import {
  GRAPH,
  getServiceClient,
  loadCloudConfig,
  normalizePhone,
  previewFor,
  upsertConversation,
} from './_whatsappCloud.js';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Dispatcher unificado de mensagens transacionais do WhatsApp.
 * Arquivo com prefixo "_" → NÃO vira rota na Vercel; é helper compartilhado.
 *
 * Roteia cada categoria de mensagem (venda/cobrança/cronograma/relatório) para
 * o motor escolhido em Configurações → Motor de Envio:
 *   - 'cloud'     → API Oficial da Meta (exige TEMPLATE aprovado p/ disparo proativo)
 *   - 'evolution' → Evolution API (texto livre)
 *
 * Best-effort: nunca lança; devolve { sent:false } se não configurado/falhar.
 */

export type WaCategory = 'course_sales' | 'billing' | 'schedule' | 'report';
export type WaEngine = 'cloud' | 'evolution';

export interface DispatchInput {
  to: string;
  category: WaCategory;
  /** Texto livre — usado quando o motor é 'evolution'. */
  text: string;
  /** Nome do template aprovado na Meta — usado quando o motor é 'cloud'. */
  templateName?: string;
  /** Variáveis do corpo do template, na ordem {{1}}, {{2}}, ... */
  vars?: string[];
  /** Código de idioma do template (default pt_BR). */
  languageCode?: string;
}

export interface DispatchResult {
  sent: boolean;
  engine: WaEngine | null;
  skipped?: string;
  error?: string;
}

const CATEGORY_KEY: Record<WaCategory, string> = {
  course_sales: 'wa_engine_course_sales',
  billing: 'wa_engine_billing',
  schedule: 'wa_engine_schedule',
  report: 'wa_engine_report',
};

const DEFAULT_ENGINE: Record<WaCategory, WaEngine> = {
  course_sales: 'cloud',
  billing: 'cloud',
  schedule: 'cloud',
  report: 'evolution',
};

/** Lê o motor configurado para a categoria a partir de SITE_Config. */
export async function resolveEngine(
  category: WaCategory,
  supabase?: SupabaseClient
): Promise<WaEngine> {
  try {
    const client = supabase || getServiceClient();
    const { data } = await client
      .from('SITE_Config')
      .select('value')
      .eq('key', CATEGORY_KEY[category])
      .maybeSingle();
    const v = (data?.value || '').trim();
    if (v === 'cloud' || v === 'evolution') return v;
  } catch (e: any) {
    console.error('[waDispatch] Falha ao ler motor:', e?.message);
  }
  return DEFAULT_ENGINE[category];
}

/** Envia um template aprovado via API oficial da Meta e persiste no inbox. */
async function sendCloudTemplate(
  supabase: SupabaseClient,
  input: DispatchInput
): Promise<DispatchResult> {
  const cfg = await loadCloudConfig(supabase);
  if (!cfg.accessToken || !cfg.phoneNumberId) {
    return { sent: false, engine: 'cloud', skipped: 'WhatsApp Cloud não configurado.' };
  }
  if (!input.templateName) {
    return { sent: false, engine: 'cloud', error: 'templateName ausente para envio via API oficial.' };
  }

  const phone = normalizePhone(input.to);
  if (!phone) return { sent: false, engine: 'cloud', error: 'Telefone inválido.' };

  const components = (input.vars && input.vars.length)
    ? [{ type: 'body', parameters: input.vars.map((t) => ({ type: 'text', text: String(t ?? '') })) }]
    : [];

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: phone,
    type: 'template',
    template: {
      name: input.templateName,
      language: { code: input.languageCode || 'pt_BR' },
      ...(components.length ? { components } : {}),
    },
  };

  try {
    const res = await fetch(`${GRAPH}/${cfg.apiVersion}/${cfg.phoneNumberId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.accessToken}` },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      const detail = data?.error?.message || JSON.stringify(data);
      console.error('[waDispatch] Erro template Meta:', detail);
      return { sent: false, engine: 'cloud', error: detail };
    }

    // Persiste no inbox para visibilidade do atendente.
    const whenISO = new Date().toISOString();
    const conversationId = await upsertConversation(supabase, {
      waId: phone,
      preview: previewFor('text', input.text),
      whenISO,
      direction: 'out',
    });
    await supabase.from('SITE_WhatsAppCloudMessages').insert({
      conversation_id: conversationId,
      wa_id: phone,
      wa_message_id: data.messages?.[0]?.id ?? null,
      direction: 'out',
      type: 'template',
      body: input.text,
      status: 'sent',
      timestamp: whenISO,
    });

    return { sent: true, engine: 'cloud' };
  } catch (e: any) {
    console.error('[waDispatch] Falha envio cloud:', e?.message);
    return { sent: false, engine: 'cloud', error: e?.message };
  }
}

/**
 * Ponto único de envio transacional. Lê o motor da categoria e roteia.
 */
export async function sendTransactional(input: DispatchInput): Promise<DispatchResult> {
  const supabase = getServiceClient();
  const engine = await resolveEngine(input.category, supabase);

  if (engine === 'cloud') {
    const result = await sendCloudTemplate(supabase, input);
    // Se a Cloud falhar por falta de config/template, cai para Evolution (não perde a msg).
    if (!result.sent && (result.skipped || result.error) && input.text) {
      const ev = await sendWhatsAppText(input.to, input.text);
      if (ev.sent) return { sent: true, engine: 'evolution', skipped: `fallback (${result.skipped || result.error})` };
    }
    return result;
  }

  const ev: SendWhatsAppResult = await sendWhatsAppText(input.to, input.text);
  return { sent: ev.sent, engine: 'evolution', skipped: ev.skipped, error: ev.error };
}
