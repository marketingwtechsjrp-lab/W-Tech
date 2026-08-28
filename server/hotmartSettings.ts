import { Router } from 'express';
import type { Request, Response } from 'express';
import {
  getServiceClient,
  requireSameOriginMiddleware,
  requireStaffPermissionMiddleware,
  setNoStoreHeaders,
} from '../api/_auth.js';
import { normalizeHotmartCheckoutUrl } from '../lib/hotmartCheckout.js';

const HOTMART_KEYS = {
  checkoutUrl: 'hotmart_checkout_url',
  productId: 'hotmart_product_id',
  webhookToken: 'hotmart_webhook_token',
  clientId: 'hotmart_client_id',
  clientSecret: 'hotmart_client_secret',
  evolutionApiUrl: 'evolution_api_url',
  evolutionApiKey: 'evolution_api_key',
  courseWhatsAppInstance: 'wa_instance_curso_online',
  automationEnabled: 'wa_automation_enabled',
  courseSalesEnabled: 'wa_enabled_course_sales',
} as const;

const ALL_HOTMART_KEYS = Object.values(HOTMART_KEYS);
const PRODUCT_ID_RE = /^[1-9]\d{0,19}$/;
const WHATSAPP_INSTANCE_RE = /^[A-Za-z0-9._-]{1,128}$/;

interface HotmartSettingsBody {
  checkoutUrl?: unknown;
  productId?: unknown;
  webhookToken?: unknown;
  clientId?: unknown;
  clientSecret?: unknown;
  evolutionApiUrl?: unknown;
  evolutionApiKey?: unknown;
  courseWhatsAppInstance?: unknown;
  automationEnabled?: unknown;
  courseSalesEnabled?: unknown;
}

interface HotmartSettingsDto {
  success: true;
  checkoutUrl: string;
  productId: string;
  evolutionApiUrl: string;
  courseWhatsAppInstance: string;
  automationEnabled: boolean;
  courseSalesEnabled: boolean;
  webhookTokenConfigured: boolean;
  clientIdConfigured: boolean;
  clientSecretConfigured: boolean;
  evolutionApiKeyConfigured: boolean;
}

function h(fn: (req: Request, res: Response) => Promise<unknown>) {
  return async (req: Request, res: Response) => {
    try {
      await fn(req, res);
    } catch {
      // O corpo pode conter credenciais; nunca anexar a exceção ou o request ao log.
      console.error(`[hotmart-settings] Erro não tratado em ${req.method} ${req.originalUrl}.`);
      if (!res.headersSent) res.status(500).json({ success: false, error: 'internal_error' });
    }
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function stringField(
  body: HotmartSettingsBody,
  field: keyof HotmartSettingsBody,
  maxLength: number,
): { present: false } | { present: true; value: string } | { error: string } {
  if (!Object.prototype.hasOwnProperty.call(body, field)) return { present: false };
  const raw = body[field];
  if (typeof raw !== 'string') return { error: `${String(field)}_must_be_string` };
  const value = raw.trim();
  if (value.length > maxLength) return { error: `${String(field)}_too_long` };
  return { present: true, value };
}

function optionalSecret(
  body: HotmartSettingsBody,
  field: 'webhookToken' | 'clientId' | 'clientSecret' | 'evolutionApiKey',
  maxLength: number,
): { value?: string; error?: string } {
  if (!Object.prototype.hasOwnProperty.call(body, field)) return {};
  const raw = body[field];
  if (raw === null || raw === undefined) return {};
  if (typeof raw !== 'string') return { error: `${field}_must_be_string` };
  const value = raw.trim();
  if (!value) return {};
  if (value.length > maxLength) return { error: `${field}_too_long` };
  return { value };
}

export function isValidHotmartCheckoutUrl(value: string): boolean {
  return value === '' || normalizeHotmartCheckoutUrl(value) !== null;
}

export function isValidHotmartProductId(value: string): boolean {
  return value === '' || PRODUCT_ID_RE.test(value);
}

export function isValidEvolutionApiUrl(value: string): boolean {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'https:'
      && url.username === ''
      && url.password === ''
      && url.port === ''
      && url.search === ''
      && url.hash === '';
  } catch {
    return false;
  }
}

function httpsOrigin(value: string): string {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.origin : '';
  } catch {
    return '';
  }
}

/**
 * A API key da Evolution é enviada ao host configurado. Para impedir que um
 * operador redirecione a chave e dados de compradores a um domínio próprio, a
 * origem só pode permanecer na atual ou estar previamente autorizada no
 * servidor (EVOLUTION_API_URL / EVOLUTION_API_ALLOWED_ORIGINS).
 */
export function isAllowedEvolutionApiUrl(
  value: string,
  currentValue: string,
  environmentUrl = '',
  allowedOrigins = '',
): boolean {
  if (!value) return true;
  const requestedOrigin = httpsOrigin(value);
  if (!requestedOrigin) return false;

  const trustedOrigins = new Set<string>();
  for (const candidate of [currentValue, environmentUrl, ...allowedOrigins.split(',')]) {
    const origin = httpsOrigin(candidate.trim());
    if (origin) trustedOrigins.add(origin);
  }
  return trustedOrigins.has(requestedOrigin);
}

export function isValidWhatsAppInstance(value: string): boolean {
  return value === '' || WHATSAPP_INSTANCE_RE.test(value);
}

async function readSettings(res: Response): Promise<HotmartSettingsDto | null> {
  const supabase = getServiceClient();
  if (!supabase) {
    res.status(503).json({ success: false, error: 'supabase_unavailable' });
    return null;
  }

  const { data, error } = await supabase
    .from('SITE_Config')
    .select('key, value')
    .in('key', ALL_HOTMART_KEYS);

  if (error) {
    // Não inclui a mensagem do PostgREST: ela pode conter detalhes do registro.
    console.error('[hotmart-settings] Falha ao ler configuração:', error.code || 'database_error');
    res.status(500).json({ success: false, error: 'settings_read_failed' });
    return null;
  }

  const config = new Map(
    (data || []).map((entry: { key: string; value: unknown }) => [entry.key, String(entry.value ?? '')]),
  );
  const configured = (key: string) => Boolean(config.get(key)?.trim());

  return {
    success: true,
    checkoutUrl: config.get(HOTMART_KEYS.checkoutUrl)?.trim() || '',
    productId: config.get(HOTMART_KEYS.productId)?.trim() || '',
    evolutionApiUrl: config.get(HOTMART_KEYS.evolutionApiUrl)?.trim() || '',
    courseWhatsAppInstance: config.get(HOTMART_KEYS.courseWhatsAppInstance)?.trim() || '',
    automationEnabled: config.get(HOTMART_KEYS.automationEnabled)?.trim() !== 'false',
    courseSalesEnabled: config.get(HOTMART_KEYS.courseSalesEnabled)?.trim() !== 'false',
    webhookTokenConfigured: configured(HOTMART_KEYS.webhookToken),
    clientIdConfigured: configured(HOTMART_KEYS.clientId),
    clientSecretConfigured: configured(HOTMART_KEYS.clientSecret),
    evolutionApiKeyConfigured: configured(HOTMART_KEYS.evolutionApiKey),
  };
}

export const hotmartSettingsRouter = Router();

hotmartSettingsRouter.use((_req, res, next) => {
  setNoStoreHeaders(res);
  next();
});
hotmartSettingsRouter.use(requireSameOriginMiddleware);
hotmartSettingsRouter.use(requireStaffPermissionMiddleware('manage_settings'));

// Nunca devolve os valores secretos. O painel recebe apenas indicadores booleanos.
hotmartSettingsRouter.get('/', h(async (_req, res) => {
  const settings = await readSettings(res);
  if (settings) return res.status(200).json(settings);
}));

hotmartSettingsRouter.put('/', h(async (req, res) => {
  if (!isPlainObject(req.body)) {
    return res.status(400).json({ success: false, error: 'invalid_body' });
  }
  const body = req.body as HotmartSettingsBody;

  const checkoutUrl = stringField(body, 'checkoutUrl', 2_048);
  if ('error' in checkoutUrl) {
    return res.status(400).json({ success: false, error: checkoutUrl.error });
  }
  if (checkoutUrl.present && !isValidHotmartCheckoutUrl(checkoutUrl.value)) {
    return res.status(400).json({
      success: false,
      error: 'O checkout precisa ser um link HTTPS de pay.hotmart.com ou go.hotmart.com, sem fragmento.',
    });
  }

  const productId = stringField(body, 'productId', 20);
  if ('error' in productId) {
    return res.status(400).json({ success: false, error: productId.error });
  }
  if (productId.present && !isValidHotmartProductId(productId.value)) {
    return res.status(400).json({
      success: false,
      error: 'O ID do produto deve conter somente números, como 8355309.',
    });
  }

  const webhookToken = optionalSecret(body, 'webhookToken', 2_048);
  const clientId = optionalSecret(body, 'clientId', 512);
  const clientSecret = optionalSecret(body, 'clientSecret', 2_048);
  const evolutionApiKey = optionalSecret(body, 'evolutionApiKey', 2_048);
  const secretError = webhookToken.error || clientId.error || clientSecret.error || evolutionApiKey.error;
  if (secretError) {
    return res.status(400).json({ success: false, error: secretError });
  }

  const evolutionApiUrl = stringField(body, 'evolutionApiUrl', 2_048);
  if ('error' in evolutionApiUrl) {
    return res.status(400).json({ success: false, error: evolutionApiUrl.error });
  }
  if (evolutionApiUrl.present && !isValidEvolutionApiUrl(evolutionApiUrl.value)) {
    return res.status(400).json({
      success: false,
      error: 'A URL da Evolution precisa ser HTTPS, sem credenciais, porta, query ou fragmento.',
    });
  }

  const courseWhatsAppInstance = stringField(body, 'courseWhatsAppInstance', 128);
  if ('error' in courseWhatsAppInstance) {
    return res.status(400).json({ success: false, error: courseWhatsAppInstance.error });
  }
  if (courseWhatsAppInstance.present && !isValidWhatsAppInstance(courseWhatsAppInstance.value)) {
    return res.status(400).json({
      success: false,
      error: 'A instância do curso contém caracteres inválidos.',
    });
  }

  for (const field of ['automationEnabled', 'courseSalesEnabled'] as const) {
    if (Object.prototype.hasOwnProperty.call(body, field) && typeof body[field] !== 'boolean') {
      return res.status(400).json({ success: false, error: `${field}_must_be_boolean` });
    }
  }

  const supabase = getServiceClient();
  if (!supabase) {
    return res.status(503).json({ success: false, error: 'supabase_unavailable' });
  }

  // Leia apenas a origem já confiada. Novos domínios precisam ser
  // autorizados previamente no ambiente do servidor.
  const { data: currentRows, error: currentError } = await supabase
    .from('SITE_Config')
    .select('key, value')
    .in('key', [HOTMART_KEYS.evolutionApiUrl]);
  if (currentError) {
    console.error('[hotmart-settings] Falha ao validar a origem Evolution:', currentError.code || 'database_error');
    return res.status(500).json({ success: false, error: 'settings_read_failed' });
  }
  const currentEvolutionApiUrl = String(currentRows?.[0]?.value ?? '').trim();
  if (
    evolutionApiUrl.present
    && !isAllowedEvolutionApiUrl(
      evolutionApiUrl.value,
      currentEvolutionApiUrl,
      process.env.EVOLUTION_API_URL || '',
      process.env.EVOLUTION_API_ALLOWED_ORIGINS || '',
    )
  ) {
    return res.status(400).json({
      success: false,
      error: 'A origem da Evolution não está autorizada no servidor.',
    });
  }

  const rows: Array<{ key: string; value: string }> = [];
  if (checkoutUrl.present) rows.push({ key: HOTMART_KEYS.checkoutUrl, value: checkoutUrl.value });
  if (productId.present) rows.push({ key: HOTMART_KEYS.productId, value: productId.value });
  if (webhookToken.value) rows.push({ key: HOTMART_KEYS.webhookToken, value: webhookToken.value });
  if (clientId.value) rows.push({ key: HOTMART_KEYS.clientId, value: clientId.value });
  if (clientSecret.value) rows.push({ key: HOTMART_KEYS.clientSecret, value: clientSecret.value });
  if (evolutionApiUrl.present) rows.push({ key: HOTMART_KEYS.evolutionApiUrl, value: evolutionApiUrl.value });
  if (evolutionApiKey.value) rows.push({ key: HOTMART_KEYS.evolutionApiKey, value: evolutionApiKey.value });
  if (courseWhatsAppInstance.present) {
    rows.push({ key: HOTMART_KEYS.courseWhatsAppInstance, value: courseWhatsAppInstance.value });
  }
  if (typeof body.automationEnabled === 'boolean') {
    rows.push({ key: HOTMART_KEYS.automationEnabled, value: String(body.automationEnabled) });
  }
  if (typeof body.courseSalesEnabled === 'boolean') {
    rows.push({ key: HOTMART_KEYS.courseSalesEnabled, value: String(body.courseSalesEnabled) });
  }

  if (rows.length > 0) {
    const { error } = await supabase.from('SITE_Config').upsert(rows, { onConflict: 'key' });
    if (error) {
      // Nunca logar os valores enviados: este lote pode conter três segredos.
      console.error('[hotmart-settings] Falha ao salvar configuração:', error.code || 'database_error');
      return res.status(500).json({ success: false, error: 'settings_write_failed' });
    }
  }

  const settings = await readSettings(res);
  if (settings) return res.status(200).json(settings);
}));
