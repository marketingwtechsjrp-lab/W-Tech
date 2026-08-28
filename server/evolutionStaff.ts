import { randomBytes } from 'node:crypto';
import { Router } from 'express';
import type { Request, Response } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  denyAuth,
  getServiceClient,
  requireSameOriginMiddleware,
  requireStaffAnyPermission,
  requireStaffPermission,
  requireStaffSession,
  setNoStoreHeaders,
  type StaffSessionUser,
} from '../api/_auth.js';
import { PUBLIC_BASE_URL, publicApiUrl } from '../lib/publicUrl.js';

/**
 * Boundary seguro para a gestao de instancias da Evolution API.
 *
 * A chave global fica exclusivamente no servidor. O browser escolhe apenas uma
 * acao de uma allowlist fechada; caminho, metodo e payload enviados a Evolution
 * sao montados aqui. Respostas tambem sao reduzidas a campos necessarios para a
 * interface (QR, estado, grupos, telefone e verificacao do webhook).
 */

export const EVOLUTION_STAFF_ACTIONS = [
  'list_linked_instances',
  'status',
  'create',
  'connect',
  'delete',
  'logout',
  'groups',
  'instance_info',
  'register_attendant_webhook',
  'check_attendant_webhook',
  'register_ai_webhook',
] as const;

export type EvolutionStaffAction = (typeof EVOLUTION_STAFF_ACTIONS)[number];
export type EvolutionStaffScope = 'admin' | 'attendant' | 'ai' | 'self';

const ACTIONS = new Set<string>(EVOLUTION_STAFF_ACTIONS);
const SCOPES = new Set<EvolutionStaffScope>(['admin', 'attendant', 'ai', 'self']);
const INSTANCE_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
const GROUP_JID_RE = /^[A-Za-z0-9._:-]{1,128}@g\.us$/;
const MAX_UPSTREAM_BODY_BYTES = 2 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 12_000;

const ATTENDANT_WEBHOOK_TOKEN_KEY = 'wa_atendentes_webhook_token';
const AI_WEBHOOK_TOKEN_KEY = 'ai_group_webhook_token';

const SCOPE_ACTIONS: Record<EvolutionStaffScope, ReadonlySet<EvolutionStaffAction>> = {
  admin: new Set([
    'list_linked_instances',
    'status',
    'create',
    'connect',
    'delete',
    'logout',
    'groups',
    'instance_info',
  ]),
  attendant: new Set([
    'status',
    'create',
    'connect',
    'delete',
    'logout',
    'groups',
    'instance_info',
    'register_attendant_webhook',
    'check_attendant_webhook',
  ]),
  ai: new Set(['groups', 'register_ai_webhook']),
  self: new Set(['status', 'create', 'connect', 'delete', 'logout', 'instance_info']),
};

interface EvolutionConfig {
  serverUrl: string;
  apiKey: string;
}

interface EvolutionRequestBody {
  action?: unknown;
  scope?: unknown;
  instance?: unknown;
}

interface EvolutionUpstreamResult {
  ok: boolean;
  status: number;
  data: unknown;
  timedOut?: boolean;
}

interface SafeGroup {
  jid: string;
  subject: string;
}

function h(fn: (req: Request, res: Response) => Promise<unknown>) {
  return async (req: Request, res: Response) => {
    try {
      await fn(req, res);
    } catch {
      // Nao logar excecoes da Evolution: algumas versoes incluem URL, token ou
      // payload completo na mensagem do erro.
      console.error(`[evolution-staff] Erro nao tratado em ${req.method} ${req.originalUrl}.`);
      if (!res.headersSent) res.status(500).json({ success: false, error: 'internal_error' });
    }
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function isValidEvolutionInstance(value: string): boolean {
  return INSTANCE_RE.test(value);
}

function normalizeEvolutionServerUrl(raw: string): string | null {
  try {
    const url = new URL(raw.trim());
    if (
      url.protocol !== 'https:'
      || url.username
      || url.password
      || url.port
      || url.search
      || url.hash
    ) return null;
    url.pathname = url.pathname.replace(/\/+$/, '');
    return url.toString().replace(/\/$/, '');
  } catch {
    return null;
  }
}

async function loadEvolutionConfig(supabase: SupabaseClient): Promise<EvolutionConfig | null> {
  let databaseUrl = '';
  let databaseKey = '';

  try {
    const { data, error } = await supabase
      .from('SITE_Config')
      .select('key, value')
      .in('key', ['evolution_api_url', 'evolution_api_key']);
    if (!error) {
      for (const row of data || []) {
        if (row.key === 'evolution_api_url') databaseUrl = String(row.value ?? '').trim();
        if (row.key === 'evolution_api_key') databaseKey = String(row.value ?? '').trim();
      }
    } else {
      console.error('[evolution-staff] Falha ao ler a configuracao da Evolution.');
    }
  } catch {
    console.error('[evolution-staff] Falha ao ler a configuracao da Evolution.');
  }

  const environmentUrl = String(process.env.EVOLUTION_API_URL || '').trim();
  const environmentKey = String(process.env.EVOLUTION_API_KEY || '').trim();
  const serverUrl = normalizeEvolutionServerUrl(databaseUrl)
    || normalizeEvolutionServerUrl(environmentUrl);
  const apiKey = databaseKey && databaseKey.length <= 4_096 ? databaseKey : environmentKey;
  if (!serverUrl || !apiKey || apiKey.length > 4_096) return null;
  return { serverUrl, apiKey };
}

async function readUpstreamJson(response: globalThis.Response): Promise<unknown> {
  const declaredLength = Number(response.headers.get('content-length') || '0');
  if (Number.isFinite(declaredLength) && declaredLength > MAX_UPSTREAM_BODY_BYTES) return null;
  const text = await response.text().catch(() => '');
  if (!text || text.length > MAX_UPSTREAM_BODY_BYTES) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

async function evolutionRequest(
  config: EvolutionConfig,
  path: string,
  init: { method?: 'GET' | 'POST' | 'DELETE'; body?: unknown } = {},
): Promise<EvolutionUpstreamResult> {
  try {
    const response = await fetch(`${config.serverUrl}${path}`, {
      method: init.method || 'GET',
      redirect: 'error',
      headers: {
        Accept: 'application/json',
        apikey: config.apiKey,
        ...(init.body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    return {
      ok: response.ok,
      status: response.status,
      data: await readUpstreamJson(response),
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      data: null,
      timedOut: error instanceof Error && error.name === 'TimeoutError',
    };
  }
}

function upstreamFailure(res: Response, result: EvolutionUpstreamResult) {
  return res.status(result.timedOut ? 504 : 502).json({
    success: false,
    error: result.timedOut ? 'evolution_timeout' : 'evolution_rejected',
    ...(result.status > 0 ? { status: result.status } : {}),
  });
}

function dataRecord(value: unknown): Record<string, any> {
  return isPlainObject(value) ? value : {};
}

function sanitizeState(raw: unknown): string {
  const state = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  if (state === 'open' || state === 'connected') return 'open';
  if (state === 'connecting') return 'connecting';
  if (state === 'close' || state === 'closed' || state === 'disconnected') return 'disconnected';
  return 'unknown';
}

function extractState(data: unknown): string {
  const root = dataRecord(data);
  return sanitizeState(
    dataRecord(root.instance).state
      ?? root.state
      ?? dataRecord(root.connectionStatus).state,
  );
}

function sanitizeQr(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const qr = raw.trim();
  if (!qr || qr.length > 1_500_000) return null;
  if (/^data:image\/(?:png|jpeg);base64,[A-Za-z0-9+/=\r\n]+$/i.test(qr)) return qr;
  if (qr.length >= 100 && /^[A-Za-z0-9+/=\r\n]+$/.test(qr)) return qr;
  return null;
}

function extractQr(data: unknown): string | null {
  const root = dataRecord(data);
  const qrcode = dataRecord(root.qrcode);
  return sanitizeQr(root.base64 ?? qrcode.base64);
}

function containsAlreadyExists(data: unknown): boolean {
  try {
    return JSON.stringify(data).toLowerCase().includes('already');
  } catch {
    return false;
  }
}

function sanitizeText(raw: unknown, maxLength: number): string {
  if (typeof raw !== 'string') return '';
  return raw.replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function extractGroups(data: unknown): SafeGroup[] {
  const root = dataRecord(data);
  const rawGroups = Array.isArray(data) ? data : Array.isArray(root.groups) ? root.groups : [];
  const seen = new Set<string>();
  const groups: SafeGroup[] = [];

  for (const candidate of rawGroups.slice(0, 1_000)) {
    const group = dataRecord(candidate);
    const jid = sanitizeText(group.id ?? group.jid, 160);
    if (!GROUP_JID_RE.test(jid) || seen.has(jid)) continue;
    seen.add(jid);
    groups.push({
      jid,
      subject: sanitizeText(group.subject ?? group.name, 160) || 'Grupo sem nome',
    });
  }
  return groups;
}

function extractInstanceEntries(data: unknown): Record<string, any>[] {
  const root = dataRecord(data);
  const entries = Array.isArray(data) ? data : Array.isArray(root.instances) ? root.instances : [];
  return entries.filter(isPlainObject);
}

function entryInstanceName(entry: Record<string, any>): string {
  const nested = dataRecord(entry.instance);
  return sanitizeText(nested.instanceName ?? entry.instanceName ?? entry.name, 128);
}

export function extractPhone(data: unknown, instance: string): string | null {
  const entries = extractInstanceEntries(data);
  const found = entries.find((entry) => entryInstanceName(entry) === instance);
  if (!found) return null;
  const nested = dataRecord(found.instance);
  const owner = sanitizeText(nested.owner ?? found.owner ?? found.ownerJid, 128);
  const phone = owner.split('@')[0].replace(/\D/g, '');
  return /^\d{7,15}$/.test(phone) ? phone : null;
}

export function extractInstanceInfoState(data: unknown, instance: string): string {
  const entries = extractInstanceEntries(data);
  const found = entries.find((entry) => entryInstanceName(entry) === instance);
  if (!found) return 'unknown';
  const nested = dataRecord(found.instance);
  return sanitizeState(nested.state ?? found.state ?? nested.status ?? found.connectionStatus);
}

function derivedSelfInstance(staff: StaffSessionUser): string {
  const name = String(staff.name || 'usuario')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24) || 'usuario';
  const suffix = String(staff.id).replace(/[^A-Za-z0-9]/g, '').slice(0, 12).toLowerCase() || 'self';
  return `wtech-${name}-${suffix}`.slice(0, 64);
}

async function resolveSelfInstance(
  supabase: SupabaseClient,
  staff: StaffSessionUser,
  requestedInstance: string,
): Promise<{ instance: string; linked: boolean } | null> {
  const { data, error } = await supabase
    .from('SITE_UserIntegrations')
    .select('instance_name')
    .eq('user_id', staff.id)
    .maybeSingle();
  if (error) return null;

  const linkedName = typeof data?.instance_name === 'string' ? data.instance_name.trim() : '';
  const instance = isValidEvolutionInstance(linkedName) ? linkedName : derivedSelfInstance(staff);

  // O nome recebido serve apenas como confirmacao do alvo que a tela ja
  // conhece; jamais permite escolher outra instancia.
  if (requestedInstance && requestedInstance !== instance) return null;
  return { instance, linked: Boolean(linkedName) };
}

async function listLinkedInstances(supabase: SupabaseClient): Promise<string[] | null> {
  const { data, error } = await supabase
    .from('SITE_UserIntegrations')
    .select('instance_name')
    .not('instance_name', 'is', null)
    .limit(500);
  if (error) return null;

  return Array.from(new Set(
    (data || [])
      .map((row) => typeof row.instance_name === 'string' ? row.instance_name.trim() : '')
      .filter(isValidEvolutionInstance),
  )).sort((a, b) => a.localeCompare(b)).slice(0, 500);
}

async function isAllowedAiInstance(
  supabase: SupabaseClient,
  instance: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from('SITE_Config')
    .select('key, value')
    .in('key', [
      'wa_instance_report',
      'automation_whatsapp_instance',
      'evolution_instance_name',
      'evolution_managed_instances',
    ]);
  if (error) return false;

  const approved = new Set<string>();
  for (const row of data || []) {
    if (row.key === 'evolution_managed_instances') {
      try {
        const managed = JSON.parse(typeof row.value === 'string' ? row.value : '[]');
        if (!Array.isArray(managed)) continue;
        for (const candidate of managed.slice(0, 500)) {
          const name = isPlainObject(candidate) && typeof candidate.name === 'string'
            ? candidate.name.trim()
            : '';
          if (isValidEvolutionInstance(name)) approved.add(name);
        }
      } catch {
        // JSON inválido não amplia autorização.
      }
      continue;
    }

    const name = typeof row.value === 'string' ? row.value.trim() : '';
    if (isValidEvolutionInstance(name)) approved.add(name);
  }
  return approved.has(instance);
}

async function updateSelfIntegration(
  supabase: SupabaseClient,
  staff: StaffSessionUser,
  instance: string,
  state: string,
): Promise<boolean> {
  const { error } = await supabase
    .from('SITE_UserIntegrations')
    .upsert({
      user_id: staff.id,
      instance_name: instance,
      instance_status: state,
      instance_token: null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
  return !error;
}

async function authorizeScope(
  req: Request,
  res: Response,
  scope: EvolutionStaffScope,
): Promise<StaffSessionUser | null> {
  if (scope === 'self') {
    const staff = await requireStaffSession(req);
    if (!staff) denyAuth(res);
    return staff;
  }
  if (scope === 'ai') return requireStaffPermission(req, res, 'whatsapp_ai_manage');
  // Admin e gestao de atendentes compartilham o mesmo boundary operacional:
  // basta uma das duas permissoes reconhecidas pelo painel de integracoes.
  return requireStaffAnyPermission(req, res, ['manage_settings', 'whatsapp_engine_config']);
}

async function readWebhookToken(supabase: SupabaseClient, key: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('SITE_Config')
    .select('value')
    .eq('key', key)
    .maybeSingle();
  if (error) return null;
  const token = typeof data?.value === 'string' ? data.value.trim() : '';
  return token && token.length <= 4_096 ? token : null;
}

async function ensureWebhookToken(supabase: SupabaseClient, key: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('SITE_Config')
    .select('value')
    .eq('key', key)
    .maybeSingle();
  if (error) return null;
  const existing = typeof data?.value === 'string' ? data.value.trim() : '';
  if (existing) return existing.length <= 4_096 ? existing : null;

  const token = randomBytes(32).toString('hex');

  // Uma linha legada pode existir com valor vazio. Faça compare-and-swap no
  // valor exato observado: só uma requisição consegue reivindicá-la; as demais
  // releem o token vencedor e nunca o sobrescrevem.
  if (data) {
    const rawValue = typeof data.value === 'string' ? data.value : null;
    let update = supabase
      .from('SITE_Config')
      .update({ value: token })
      .eq('key', key);
    update = rawValue === null ? update.is('value', null) : update.eq('value', rawValue);
    const { data: claimed, error: claimError } = await update
      .select('value')
      .maybeSingle();
    if (claimError) return null;
    if (claimed?.value === token) return token;
    return readWebhookToken(supabase, key);
  }

  const { error: insertError } = await supabase
    .from('SITE_Config')
    .insert({ key, value: token });
  if (!insertError) return token;
  if (insertError.code !== '23505') return null;

  // Outra requisição venceu a corrida. Releia o único token persistido para
  // que todas registrem exatamente a mesma URL na Evolution.
  return readWebhookToken(supabase, key);
}

function isExpectedWebhook(raw: unknown, expectedPath: string, expectedToken: string, source?: string): boolean {
  if (typeof raw !== 'string' || raw.length > 4_096) return false;
  try {
    const url = new URL(raw);
    if (url.origin !== PUBLIC_BASE_URL || url.pathname !== expectedPath || url.hash) return false;
    if (url.searchParams.get('token') !== expectedToken) return false;
    if (source) {
      if (url.searchParams.get('source') !== source || Array.from(url.searchParams.keys()).length !== 2) {
        return false;
      }
    } else if (Array.from(url.searchParams.keys()).length !== 1) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function extractWebhookUrl(data: unknown): unknown {
  const root = dataRecord(data);
  return root.url ?? dataRecord(root.webhook).url;
}

async function setWebhook(
  config: EvolutionConfig,
  instance: string,
  url: string,
  events: string[],
): Promise<EvolutionUpstreamResult> {
  const path = `/webhook/set/${encodeURIComponent(instance)}`;
  const v2 = await evolutionRequest(config, path, {
    method: 'POST',
    body: {
      webhook: {
        enabled: true,
        url,
        events,
        webhookByEvents: false,
        base64: false,
      },
    },
  });
  if (v2.ok || v2.timedOut || v2.status === 0) return v2;

  // Compatibilidade com instalacoes Evolution v1. O segundo formato continua
  // fixo e nao contem qualquer campo controlado pelo browser.
  return evolutionRequest(config, path, {
    method: 'POST',
    body: {
      enabled: true,
      url,
      events,
      webhook_by_events: false,
      base64: false,
    },
  });
}

async function registerAttendantWebhook(
  supabase: SupabaseClient,
  config: EvolutionConfig,
  instance: string,
): Promise<EvolutionUpstreamResult | null> {
  const token = await ensureWebhookToken(supabase, ATTENDANT_WEBHOOK_TOKEN_KEY);
  if (!token) return null;
  const url = publicApiUrl(`/api/wa-atendentes-webhook?token=${encodeURIComponent(token)}`);
  const result = await setWebhook(config, instance, url, [
    'MESSAGES_UPSERT',
    'SEND_MESSAGE',
    'CONNECTION_UPDATE',
  ]);

  if (result.ok) {
    // Espelho passivo: nunca marca como lida, muda presenca ou sincroniza todo
    // o historico. A compatibilidade dessa rota varia entre versoes, portanto
    // e deliberadamente best-effort.
    await evolutionRequest(config, `/settings/set/${encodeURIComponent(instance)}`, {
      method: 'POST',
      body: {
        rejectCall: false,
        groupsIgnore: false,
        alwaysOnline: false,
        readMessages: false,
        readStatus: false,
        syncFullHistory: false,
      },
    });
  }
  return result;
}

async function registerAiWebhook(
  supabase: SupabaseClient,
  config: EvolutionConfig,
  instance: string,
): Promise<EvolutionUpstreamResult | null> {
  const token = await ensureWebhookToken(supabase, AI_WEBHOOK_TOKEN_KEY);
  if (!token) return null;
  const url = publicApiUrl(
    `/api/whatsapp-cloud-webhook?source=evolution&token=${encodeURIComponent(token)}`,
  );
  return setWebhook(config, instance, url, ['MESSAGES_UPSERT']);
}

async function checkAttendantWebhook(
  supabase: SupabaseClient,
  config: EvolutionConfig,
  instance: string,
): Promise<{ result: EvolutionUpstreamResult; pointsHere: boolean } | null> {
  const token = await ensureWebhookToken(supabase, ATTENDANT_WEBHOOK_TOKEN_KEY);
  if (!token) return null;
  const result = await evolutionRequest(
    config,
    `/webhook/find/${encodeURIComponent(instance)}`,
  );
  return {
    result,
    pointsHere: result.ok && isExpectedWebhook(
      extractWebhookUrl(result.data),
      '/api/wa-atendentes-webhook',
      token,
    ),
  };
}

export const evolutionStaffRouter = Router();

evolutionStaffRouter.use((_req, res, next) => {
  setNoStoreHeaders(res);
  next();
});
evolutionStaffRouter.use(requireSameOriginMiddleware);

// Um endpoint deliberadamente fechado: nao aceita path, metodo ou payload de
// proxy. Cada acao abaixo constroi sua propria requisicao para a Evolution.
evolutionStaffRouter.post('/', h(async (req, res) => {
  if (!isPlainObject(req.body)) {
    return res.status(400).json({ success: false, error: 'invalid_body' });
  }

  const body = req.body as EvolutionRequestBody;
  const action = typeof body.action === 'string' ? body.action : '';
  const scope = typeof body.scope === 'string' ? body.scope : '';
  if (!ACTIONS.has(action) || !SCOPES.has(scope as EvolutionStaffScope)) {
    return res.status(400).json({ success: false, error: 'invalid_action_or_scope' });
  }

  const typedAction = action as EvolutionStaffAction;
  const typedScope = scope as EvolutionStaffScope;
  if (!SCOPE_ACTIONS[typedScope].has(typedAction)) {
    return res.status(403).json({ success: false, error: 'action_not_allowed_for_scope' });
  }

  const staff = await authorizeScope(req, res, typedScope);
  if (!staff) return;

  const supabase = getServiceClient();
  if (!supabase) {
    return res.status(503).json({ success: false, error: 'supabase_unavailable' });
  }

  if (typedAction === 'list_linked_instances') {
    const instances = await listLinkedInstances(supabase);
    if (!instances) {
      return res.status(500).json({ success: false, error: 'integrations_read_failed' });
    }
    return res.status(200).json({ success: true, instances });
  }

  const rawInstance = body.instance === undefined ? '' : body.instance;
  if (typeof rawInstance !== 'string') {
    return res.status(400).json({ success: false, error: 'instance_must_be_string' });
  }
  const requestedInstance = rawInstance.trim();
  if (requestedInstance && !isValidEvolutionInstance(requestedInstance)) {
    return res.status(400).json({ success: false, error: 'invalid_instance' });
  }

  let instance = requestedInstance;
  if (typedScope === 'self') {
    const selfTarget = await resolveSelfInstance(supabase, staff, requestedInstance);
    if (!selfTarget) {
      return res.status(403).json({ success: false, error: 'self_instance_not_allowed' });
    }
    instance = selfTarget.instance;
  }
  if (!instance) {
    return res.status(400).json({ success: false, error: 'instance_required' });
  }
  if (typedScope === 'ai' && !(await isAllowedAiInstance(supabase, instance))) {
    return res.status(403).json({ success: false, error: 'ai_instance_not_allowed' });
  }

  const selfInstance = typedScope === 'self' ? { instance } : {};

  const config = await loadEvolutionConfig(supabase);
  if (!config) {
    return res.status(503).json({ success: false, error: 'evolution_not_configured' });
  }

  if (typedAction === 'status') {
    const result = await evolutionRequest(
      config,
      `/instance/connectionState/${encodeURIComponent(instance)}`,
    );
    if (!result.ok) return upstreamFailure(res, result);
    const state = extractState(result.data);
    if (typedScope === 'self' && !(await updateSelfIntegration(supabase, staff, instance, state))) {
      return res.status(500).json({ success: false, error: 'integration_update_failed' });
    }
    return res.status(200).json({ success: true, state, ...selfInstance });
  }

  if (typedAction === 'create') {
    const result = await evolutionRequest(config, '/instance/create', {
      method: 'POST',
      body: { instanceName: instance, qrcode: true, integration: 'WHATSAPP-BAILEYS' },
    });
    const alreadyExists = containsAlreadyExists(result.data);
    if (!result.ok && !alreadyExists) return upstreamFailure(res, result);
    const qr = extractQr(result.data);
    const state = qr ? 'connecting' : extractState(result.data);
    if (typedScope === 'self' && !(await updateSelfIntegration(supabase, staff, instance, state))) {
      return res.status(500).json({ success: false, error: 'integration_update_failed' });
    }
    return res.status(200).json({ success: true, state, ...selfInstance, ...(qr ? { qr } : {}) });
  }

  if (typedAction === 'connect') {
    const result = await evolutionRequest(
      config,
      `/instance/connect/${encodeURIComponent(instance)}`,
    );
    if (!result.ok) return upstreamFailure(res, result);
    const qr = extractQr(result.data);
    const state = qr ? 'connecting' : extractState(result.data);
    if (typedScope === 'self' && !(await updateSelfIntegration(supabase, staff, instance, state))) {
      return res.status(500).json({ success: false, error: 'integration_update_failed' });
    }
    return res.status(200).json({ success: true, state, ...selfInstance, ...(qr ? { qr } : {}) });
  }

  if (typedAction === 'delete' || typedAction === 'logout') {
    const result = await evolutionRequest(
      config,
      `/instance/${typedAction}/${encodeURIComponent(instance)}`,
      { method: 'DELETE' },
    );
    if (!result.ok) return upstreamFailure(res, result);
    if (typedScope === 'self' && !(await updateSelfIntegration(supabase, staff, instance, 'disconnected'))) {
      return res.status(500).json({ success: false, error: 'integration_update_failed' });
    }
    return res.status(200).json({ success: true, state: 'disconnected', ...selfInstance });
  }

  if (typedAction === 'groups') {
    const result = await evolutionRequest(
      config,
      `/group/fetchAllGroups/${encodeURIComponent(instance)}?getParticipants=false`,
    );
    if (!result.ok) return upstreamFailure(res, result);
    return res.status(200).json({ success: true, groups: extractGroups(result.data) });
  }

  if (typedAction === 'instance_info') {
    const result = await evolutionRequest(
      config,
      `/instance/fetchInstances?instanceName=${encodeURIComponent(instance)}`,
    );
    if (!result.ok) return upstreamFailure(res, result);
    const state = extractInstanceInfoState(result.data, instance);
    if (typedScope === 'self' && !(await updateSelfIntegration(supabase, staff, instance, state))) {
      return res.status(500).json({ success: false, error: 'integration_update_failed' });
    }
    return res.status(200).json({
      success: true,
      state,
      phone: extractPhone(result.data, instance),
      ...selfInstance,
    });
  }

  if (typedAction === 'register_attendant_webhook') {
    const result = await registerAttendantWebhook(supabase, config, instance);
    if (!result) return res.status(500).json({ success: false, error: 'webhook_token_unavailable' });
    if (!result.ok) return upstreamFailure(res, result);
    return res.status(200).json({ success: true, pointsHere: true });
  }

  if (typedAction === 'check_attendant_webhook') {
    const checked = await checkAttendantWebhook(supabase, config, instance);
    if (!checked) return res.status(500).json({ success: false, error: 'webhook_token_unavailable' });
    if (!checked.result.ok) return upstreamFailure(res, checked.result);
    return res.status(200).json({ success: true, pointsHere: checked.pointsHere });
  }

  if (typedAction === 'register_ai_webhook') {
    const result = await registerAiWebhook(supabase, config, instance);
    if (!result) return res.status(500).json({ success: false, error: 'webhook_token_unavailable' });
    if (!result.ok) return upstreamFailure(res, result);
    return res.status(200).json({ success: true, pointsHere: true });
  }

  return res.status(400).json({ success: false, error: 'invalid_action' });
}));
