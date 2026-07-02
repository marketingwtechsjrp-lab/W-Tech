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

/** Instância Evolution específica por categoria (vazio = instância padrão do sistema). */
const INSTANCE_KEY: Record<WaCategory, string> = {
  course_sales: 'wa_instance_course_sales',
  billing: 'wa_instance_billing',
  schedule: 'wa_instance_schedule',
  report: 'wa_instance_report',
};

const DEFAULT_ENGINE: Record<WaCategory, WaEngine> = {
  course_sales: 'cloud',
  billing: 'cloud',
  schedule: 'cloud',
  report: 'evolution',
};

/** Liga/desliga por categoria (painel Motor de Envio). Ausente = ligado. */
const ENABLED_KEY: Record<WaCategory, string> = {
  course_sales: 'wa_enabled_course_sales',
  billing: 'wa_enabled_billing',
  schedule: 'wa_enabled_schedule',
  report: 'wa_enabled_report',
};

/** Interruptor GERAL da automação de mensagens. Ausente = ligado. */
const MASTER_ENABLED_KEY = 'wa_automation_enabled';

/**
 * Verifica se a automação está ligada (interruptor geral E categoria).
 * Best-effort: falha na LEITURA não bloqueia envio — só o valor explícito
 * 'false' desliga.
 */
export async function isAutomationEnabled(
  category: WaCategory,
  supabase?: SupabaseClient
): Promise<{ enabled: boolean; reason?: string }> {
  try {
    const client = supabase || getServiceClient();
    const { data } = await client
      .from('SITE_Config')
      .select('key, value')
      .in('key', [MASTER_ENABLED_KEY, ENABLED_KEY[category]]);
    const map: Record<string, string> = {};
    (data || []).forEach((r: any) => (map[r.key] = r.value));
    if ((map[MASTER_ENABLED_KEY] || '').trim() === 'false') {
      return { enabled: false, reason: 'automação de mensagens desligada (interruptor geral)' };
    }
    if ((map[ENABLED_KEY[category]] || '').trim() === 'false') {
      return { enabled: false, reason: `categoria "${category}" desativada no Motor de Envio` };
    }
    return { enabled: true };
  } catch (e: any) {
    console.error('[waDispatch] Falha ao ler liga/desliga:', e?.message);
    return { enabled: true };
  }
}

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

/** Lê a instância Evolution configurada para a categoria (undefined = padrão). */
export async function resolveInstance(
  category: WaCategory,
  supabase?: SupabaseClient
): Promise<string | undefined> {
  try {
    const client = supabase || getServiceClient();
    const { data } = await client
      .from('SITE_Config')
      .select('value')
      .eq('key', INSTANCE_KEY[category])
      .maybeSingle();
    const v = (data?.value || '').trim();
    return v || undefined;
  } catch {
    return undefined;
  }
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
 * Ponto único de envio transacional. Lê o motor (e a instância, no caso da
 * Evolution) configurados para a categoria e roteia.
 *
 * IMPORTANTE: NÃO há fallback automático entre motores. Cada categoria sai
 * SEMPRE pela saída escolhida — se ela falhar, devolve { sent:false } e a
 * mensagem é registrada como falha. Isso evita que cobrança/cronograma/boas-
 * vindas "vazem" por um número diferente do configurado.
 */
export async function sendTransactional(input: DispatchInput): Promise<DispatchResult> {
  const supabase = getServiceClient();

  // Liga/desliga da automação (interruptor geral + por categoria): quando
  // desligado, NENHUMA mensagem automática desta categoria sai — registrado
  // como skipped (não é erro).
  const gate = await isAutomationEnabled(input.category, supabase);
  if (!gate.enabled) {
    console.log(`[waDispatch] envio pulado (${input.category}): ${gate.reason}`);
    return { sent: false, engine: null, skipped: gate.reason };
  }

  const engine = await resolveEngine(input.category, supabase);

  if (engine === 'cloud') {
    return sendCloudTemplate(supabase, input);
  }

  const instance = await resolveInstance(input.category, supabase);
  const ev: SendWhatsAppResult = await sendWhatsAppText(input.to, input.text, instance);
  return { sent: ev.sent, engine: 'evolution', skipped: ev.skipped, error: ev.error };
}
