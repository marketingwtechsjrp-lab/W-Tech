import { Router } from 'express';
import type { Request, Response } from 'express';
import {
  getServiceClient,
  requireSameOriginMiddleware,
  requireStaffPermissionMiddleware,
  setNoStoreHeaders,
} from '../api/_auth.js';

/**
 * Chaves gravadas pela aba Admin > Integrações. A allowlist fica no servidor:
 * o navegador não pode transformar esta rota em um gravador genérico de
 * SITE_Config.
 */
export const GLOBAL_SITE_CONFIG_KEYS: ReadonlySet<string> = new Set([
  'automation_whatsapp_instance',
  'saldo_reminders_enabled',
  'saldo_reminders_scope',
  'asaas_api_key',
  'stripe_api_key_live',
  'stripe_api_key_test',
  'stripe_mode',
  'stripe_api_key',
  'mercadopago_access_token',
  'checkout_direto_habilitado',
  'google_oauth_client_id',
  'google_oauth_client_secret',
  'ga4_property_id',
  'kiwify_client_id',
  'kiwify_client_secret',
  'kiwify_account_id',
  'affiliates_drive_url',
  'brevo_enabled',
  'brevo_smtp_host',
  'brevo_smtp_port',
  'brevo_smtp_login',
  'brevo_smtp_key',
  'brevo_sender_email',
  'brevo_sender_name',
  'whatsapp_cloud_phone_number_id',
  'whatsapp_cloud_waba_id',
  'whatsapp_cloud_app_id',
  'whatsapp_cloud_app_secret',
  'whatsapp_cloud_access_token',
  'whatsapp_cloud_api_version',
  'whatsapp_cloud_webhook_verify_token',
  'whatsapp_cloud_display_number',
  'wa_engine_course_sales',
  'wa_engine_billing',
  'wa_engine_schedule',
  'wa_engine_report',
  'wa_enabled_billing',
  'wa_enabled_schedule',
  'wa_enabled_report',
  'wa_instance_course_sales',
  'wa_instance_billing',
  'wa_instance_schedule',
  'wa_instance_report',
  'wa_instance_campaign',
  'wa_instance_crm',
  'wa_instance_recovery',
  'ai_group_bot_instance',
  'wa_report_enabled',
  'wa_report_group_jid',
  'wa_report_group_name',
  'evolution_managed_instances',
]);

/** Configuração editável pelo painel dos assistentes de IA. */
export const AI_GROUP_SITE_CONFIG_KEYS: ReadonlySet<string> = new Set([
  'ai_group_bot_enabled',
  'ai_group_bot_group_jid',
  'ai_group_bot_group_name',
  'ai_agent_prompt_sofia',
  'ai_agent_prompt_bia',
  'ai_agent_prompt_rita',
  'ai_agent_prompt_leo',
]);

/**
 * Campo secreto vazio significa "preservar". Limpeza intencional deve ser
 * feita por uma operação administrativa explícita, não por um formulário que
 * nunca recebe de volta o valor atual.
 */
const SECRET_SITE_CONFIG_KEYS: ReadonlySet<string> = new Set([
  'asaas_api_key',
  'stripe_api_key',
  'stripe_api_key_live',
  'stripe_api_key_test',
  'mercadopago_access_token',
  'google_oauth_client_secret',
  'kiwify_client_id',
  'kiwify_client_secret',
  'brevo_smtp_login',
  'brevo_smtp_key',
  'whatsapp_cloud_app_secret',
  'whatsapp_cloud_access_token',
  'whatsapp_cloud_webhook_verify_token',
]);

const MAX_BATCH_ENTRIES = 64;
const MAX_VALUE_BYTES = 64 * 1024;
const MAX_BATCH_BYTES = 256 * 1024;

interface ConfigRow {
  key: string;
  value: string;
}

type ParseResult =
  | { rows: ConfigRow[] }
  | { error: string };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

/** Validação compartilhada pelos dois endpoints; nenhuma coerção implícita. */
function parseConfigBatch(body: unknown, allowedKeys: ReadonlySet<string>): ParseResult {
  if (!isPlainObject(body) || !Array.isArray(body.entries)) {
    return { error: 'invalid_body' };
  }
  if (body.entries.length > MAX_BATCH_ENTRIES) {
    return { error: 'batch_too_large' };
  }

  const rows: ConfigRow[] = [];
  const seen = new Set<string>();
  let totalBytes = 0;

  for (const rawEntry of body.entries) {
    if (!isPlainObject(rawEntry)) return { error: 'invalid_entry' };
    if (typeof rawEntry.key !== 'string' || typeof rawEntry.value !== 'string') {
      return { error: 'entry_fields_must_be_strings' };
    }

    const key = rawEntry.key;
    const value = rawEntry.value;
    if (!allowedKeys.has(key)) return { error: 'key_not_allowed' };
    if (seen.has(key)) return { error: 'duplicate_key' };
    seen.add(key);

    const valueBytes = Buffer.byteLength(value, 'utf8');
    if (valueBytes > MAX_VALUE_BYTES) return { error: 'value_too_large' };
    totalBytes += Buffer.byteLength(key, 'utf8') + valueBytes;
    if (totalBytes > MAX_BATCH_BYTES) return { error: 'batch_too_large' };

    // O campo veio vazio porque o cliente não pode reler segredos. Não grave
    // uma string vazia por cima de uma credencial já configurada.
    if (SECRET_SITE_CONFIG_KEYS.has(key) && value.trim() === '') continue;
    rows.push({ key, value });
  }

  return { rows };
}

function h(fn: (req: Request, res: Response) => Promise<unknown>) {
  return async (req: Request, res: Response) => {
    try {
      await fn(req, res);
    } catch {
      // O corpo pode conter credenciais ou prompts internos; nunca logá-lo.
      console.error(`[staff-config] Erro não tratado em ${req.method} ${req.originalUrl}.`);
      if (!res.headersSent) res.status(500).json({ success: false, error: 'internal_error' });
    }
  };
}

async function saveBatch(req: Request, res: Response, allowedKeys: ReadonlySet<string>) {
  const parsed = parseConfigBatch(req.body, allowedKeys);
  if ('error' in parsed) {
    return res.status(400).json({ success: false, error: parsed.error });
  }

  const supabase = getServiceClient();
  if (!supabase) {
    return res.status(503).json({ success: false, error: 'supabase_unavailable' });
  }

  if (parsed.rows.length > 0) {
    // Uma única operação atômica de UPSERT evita o ciclo SELECT-then-write e
    // mantém a service role exclusivamente no backend.
    const { error } = await supabase
      .from('SITE_Config')
      .upsert(parsed.rows, { onConflict: 'key' });
    if (error) {
      // Nem valores nem a mensagem completa do PostgREST entram no log.
      console.error('[staff-config] Falha ao salvar configuração:', error.code || 'database_error');
      return res.status(500).json({ success: false, error: 'settings_write_failed' });
    }
  }

  // Confirma somente o resultado da operação; nunca ecoa chaves ou valores.
  return res.status(200).json({ success: true });
}

export const staffConfigRouter = Router();

staffConfigRouter.use((_req, res, next) => {
  setNoStoreHeaders(res);
  next();
});
staffConfigRouter.use(requireSameOriginMiddleware);

staffConfigRouter.put(
  '/global',
  requireStaffPermissionMiddleware('manage_settings'),
  h(async (req, res) => saveBatch(req, res, GLOBAL_SITE_CONFIG_KEYS)),
);

staffConfigRouter.put(
  '/ai-group',
  requireStaffPermissionMiddleware('whatsapp_ai_manage'),
  h(async (req, res) => saveBatch(req, res, AI_GROUP_SITE_CONFIG_KEYS)),
);
