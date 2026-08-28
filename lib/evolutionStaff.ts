/**
 * Cliente do boundary server-side da Evolution API.
 *
 * Este modulo nunca recebe URL nem API key e nao oferece um proxy generico. As
 * funcoes abaixo correspondem exatamente as operacoes permitidas pelo servidor.
 */

export type EvolutionStaffScope = 'admin' | 'attendant' | 'ai' | 'self';
export type EvolutionLifecycleScope = 'admin' | 'attendant' | 'self';
export type EvolutionStatusScope = EvolutionLifecycleScope;
export type EvolutionGroupsScope = 'admin' | 'attendant' | 'ai';
export type EvolutionInfoScope = EvolutionLifecycleScope;

export interface EvolutionGroup {
  jid: string;
  subject: string;
}

export interface EvolutionStateResult {
  success: true;
  state: string;
  instance?: string;
}

export interface EvolutionQrResult extends EvolutionStateResult {
  qr?: string;
}

export interface EvolutionGroupsResult {
  success: true;
  groups: EvolutionGroup[];
}

export interface EvolutionInstanceInfoResult extends EvolutionStateResult {
  phone: string | null;
}

export interface EvolutionWebhookResult {
  success: true;
  pointsHere: boolean;
}

export interface EvolutionLinkedInstancesResult {
  success: true;
  instances: string[];
}

type EvolutionClientAction =
  | 'list_linked_instances'
  | 'status'
  | 'create'
  | 'connect'
  | 'delete'
  | 'logout'
  | 'groups'
  | 'instance_info'
  | 'register_attendant_webhook'
  | 'check_attendant_webhook'
  | 'register_ai_webhook';

const INSTANCE_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
const GROUP_JID_RE = /^[A-Za-z0-9._:-]{1,128}@g\.us$/;

export class EvolutionStaffError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, status: number) {
    super(code);
    this.name = 'EvolutionStaffError';
    this.code = code;
    this.status = status;
  }
}

function validInstance(instance: string | undefined): boolean {
  return instance === undefined || INSTANCE_RE.test(instance.trim());
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function safeState(value: unknown): string {
  return typeof value === 'string' && value.length <= 32 ? value : 'unknown';
}

function safeInstance(value: unknown): string | undefined {
  return typeof value === 'string' && INSTANCE_RE.test(value) ? value : undefined;
}

function safeQr(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.length > 1_500_000) return undefined;
  if (/^data:image\/(?:png|jpeg);base64,[A-Za-z0-9+/=\r\n]+$/i.test(value)) return value;
  if (value.length >= 100 && /^[A-Za-z0-9+/=\r\n]+$/.test(value)) return value;
  return undefined;
}

async function requestEvolution(
  action: EvolutionClientAction,
  scope: EvolutionStaffScope,
  instance?: string,
): Promise<Record<string, unknown>> {
  if (!validInstance(instance)) throw new EvolutionStaffError('invalid_instance', 400);

  let response: Response;
  try {
    response = await fetch('/api/staff/evolution', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action,
        scope,
        ...(instance?.trim() ? { instance: instance.trim() } : {}),
      }),
    });
  } catch {
    throw new EvolutionStaffError('network_error', 0);
  }

  const data = record(await response.json().catch(() => null));
  if (!response.ok || data.success !== true) {
    const code = typeof data.error === 'string' && data.error.length <= 80
      ? data.error
      : `http_${response.status}`;
    throw new EvolutionStaffError(code, response.status);
  }
  return data;
}

export async function evolutionStatus(
  scope: EvolutionStatusScope,
  instance?: string,
): Promise<EvolutionStateResult> {
  const data = await requestEvolution('status', scope, instance);
  const resolvedInstance = safeInstance(data.instance);
  return { success: true, state: safeState(data.state), ...(resolvedInstance ? { instance: resolvedInstance } : {}) };
}

export async function evolutionCreate(
  scope: EvolutionLifecycleScope,
  instance?: string,
): Promise<EvolutionQrResult> {
  const data = await requestEvolution('create', scope, instance);
  const qr = safeQr(data.qr);
  const resolvedInstance = safeInstance(data.instance);
  return {
    success: true,
    state: safeState(data.state),
    ...(resolvedInstance ? { instance: resolvedInstance } : {}),
    ...(qr ? { qr } : {}),
  };
}

export async function evolutionConnect(
  scope: EvolutionLifecycleScope,
  instance?: string,
): Promise<EvolutionQrResult> {
  const data = await requestEvolution('connect', scope, instance);
  const qr = safeQr(data.qr);
  const resolvedInstance = safeInstance(data.instance);
  return {
    success: true,
    state: safeState(data.state),
    ...(resolvedInstance ? { instance: resolvedInstance } : {}),
    ...(qr ? { qr } : {}),
  };
}

export async function evolutionDelete(
  scope: EvolutionLifecycleScope,
  instance?: string,
): Promise<EvolutionStateResult> {
  const data = await requestEvolution('delete', scope, instance);
  const resolvedInstance = safeInstance(data.instance);
  return { success: true, state: safeState(data.state), ...(resolvedInstance ? { instance: resolvedInstance } : {}) };
}

export async function evolutionLogout(
  scope: EvolutionLifecycleScope,
  instance?: string,
): Promise<EvolutionStateResult> {
  const data = await requestEvolution('logout', scope, instance);
  const resolvedInstance = safeInstance(data.instance);
  return { success: true, state: safeState(data.state), ...(resolvedInstance ? { instance: resolvedInstance } : {}) };
}

export async function evolutionGroups(
  scope: EvolutionGroupsScope,
  instance: string,
): Promise<EvolutionGroupsResult> {
  const data = await requestEvolution('groups', scope, instance);
  const groups = Array.isArray(data.groups)
    ? data.groups.flatMap((candidate): EvolutionGroup[] => {
      const group = record(candidate);
      const jid = typeof group.jid === 'string' ? group.jid : '';
      const subject = typeof group.subject === 'string' ? group.subject.slice(0, 160) : '';
      return GROUP_JID_RE.test(jid) && subject ? [{ jid, subject }] : [];
    })
    : [];
  return { success: true, groups };
}

export async function evolutionLinkedInstances(): Promise<EvolutionLinkedInstancesResult> {
  const data = await requestEvolution('list_linked_instances', 'admin');
  const instances = Array.isArray(data.instances)
    ? Array.from(new Set(data.instances.filter(
      (candidate): candidate is string => typeof candidate === 'string' && INSTANCE_RE.test(candidate),
    ))).slice(0, 500)
    : [];
  return { success: true, instances };
}

export async function evolutionInstanceInfo(
  scope: EvolutionInfoScope,
  instance?: string,
): Promise<EvolutionInstanceInfoResult> {
  const data = await requestEvolution('instance_info', scope, instance);
  const phone = typeof data.phone === 'string' && /^\d{7,15}$/.test(data.phone) ? data.phone : null;
  const resolvedInstance = safeInstance(data.instance);
  return {
    success: true,
    state: safeState(data.state),
    phone,
    ...(resolvedInstance ? { instance: resolvedInstance } : {}),
  };
}

export async function evolutionRegisterAttendantWebhook(
  instance: string,
): Promise<EvolutionWebhookResult> {
  const data = await requestEvolution('register_attendant_webhook', 'attendant', instance);
  return { success: true, pointsHere: data.pointsHere === true };
}

export async function evolutionCheckAttendantWebhook(
  instance: string,
): Promise<EvolutionWebhookResult> {
  const data = await requestEvolution('check_attendant_webhook', 'attendant', instance);
  return { success: true, pointsHere: data.pointsHere === true };
}

export async function evolutionRegisterAiWebhook(
  instance: string,
): Promise<EvolutionWebhookResult> {
  const data = await requestEvolution('register_ai_webhook', 'ai', instance);
  return { success: true, pointsHere: data.pointsHere === true };
}
