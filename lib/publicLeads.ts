/**
 * Cadastro público de leads: o que o navegador pode mandar a /api/public-leads.
 *
 * SITE_Leads não é mais legível com a chave anônima (ver
 * migrations/2026-11-04_fechar_leads_matriculas_mecanicos.sql). Formulário que só
 * grava continua gravando direto; quem precisa do id de volta, de dedupe ou de
 * atualizar a ficha passa pelo servidor. Campo fora desta lista não chega ao banco,
 * e por isso o navegador nunca define client_code, pricing_level ou conversão.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const TEXT_LIMITS: Record<string, number> = {
  name: 200,
  email: 254,
  phone: 40,
  type: 100,
  context_id: 500,
  origin: 1000,
  notes: 5000,
  utm_source: 300,
  utm_medium: 300,
  utm_campaign: 300,
  utm_content: 300,
  utm_term: 300,
  gclid: 200,
  gbraid: 200,
  wbraid: 200,
  fbclid: 200,
  gad_source: 200,
  landing_page: 1000,
  referrer: 1000,
};
const MAX_TAGS = 30;
const MAX_TAG_LENGTH = 100;
const MAX_QUIZ_BYTES = 20_000;
const MAX_CPF_LENGTH = 20;

export type LeadFields = Record<string, unknown> & { name: string; email?: string | null; phone?: string | null };

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}

function sanitizeTags(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  return raw
    .filter((tag): tag is string => typeof tag === 'string' && tag.length > 0)
    .slice(0, MAX_TAGS)
    .map((tag) => tag.slice(0, MAX_TAG_LENGTH));
}

function sanitizeQuizData(raw: unknown): Record<string, unknown> | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  return JSON.stringify(raw).length <= MAX_QUIZ_BYTES ? (raw as Record<string, unknown>) : undefined;
}

/** Só os campos conhecidos, com tamanho limitado. Sem nome e sem contato não vira lead. */
export function sanitizeLeadFields(raw: unknown): LeadFields | null {
  if (!raw || typeof raw !== 'object') return null;
  const input = raw as Record<string, unknown>;

  const fields: Record<string, unknown> = {};
  for (const [key, limit] of Object.entries(TEXT_LIMITS)) {
    const value = input[key];
    if (typeof value === 'string' && value.trim()) fields[key] = value.trim().slice(0, limit);
  }

  if (!fields.name || (!fields.email && !fields.phone)) return null;

  const tags = sanitizeTags(input.tags);
  if (tags) fields.tags = tags;
  const quizData = sanitizeQuizData(input.quiz_data);
  if (quizData) fields.quiz_data = quizData;
  if (isUuid(input.assigned_to)) fields.assigned_to = input.assigned_to;

  return fields as LeadFields;
}

/** Resultado do quiz gravado na ficha que a pessoa acabou de criar. */
export function sanitizeQuizResult(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== 'object') return null;
  const input = raw as Record<string, unknown>;

  const fields: Record<string, unknown> = {};
  if (typeof input.type === 'string') fields.type = input.type.slice(0, TEXT_LIMITS.type);
  if (typeof input.context_id === 'string') fields.context_id = input.context_id.slice(0, TEXT_LIMITS.context_id);
  const tags = sanitizeTags(input.tags);
  if (tags) fields.tags = tags;
  const quizData = sanitizeQuizData(input.quiz_data);
  if (quizData) fields.quiz_data = quizData;

  return Object.keys(fields).length > 0 ? fields : null;
}

export function sanitizeCpf(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const cpf = raw.trim().slice(0, MAX_CPF_LENGTH);
  return cpf || null;
}

export async function postPublicApi<T>(url: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || 'Não foi possível concluir. Tente novamente.');
  return data as T;
}

export interface PublicUpsertResult {
  action: 'created' | 'updated';
  id: string;
}

export function upsertPublicLead(lead: Record<string, unknown>): Promise<PublicUpsertResult> {
  return postPublicApi('/api/public-leads', { action: 'upsert', lead });
}

/** Insert simples (sem dedupe) de quem precisa do id de volta. */
export async function createPublicLead(lead: Record<string, unknown>): Promise<{ id: string }> {
  const created = await postPublicApi<{ id: string }>('/api/public-leads', { action: 'create', lead });
  rememberLeadContact({ id: created.id, name: lead.name, email: lead.email, phone: lead.phone });
  return created;
}

export async function savePublicQuizResult(id: string, result: Record<string, unknown>): Promise<boolean> {
  try {
    await postPublicApi('/api/public-leads', { action: 'quiz', id, result });
    return true;
  } catch {
    return false;
  }
}

export function saveCheckoutLead(
  id: string | null,
  lead: Record<string, unknown>,
  cpf: string | null,
): Promise<{ id: string; created: boolean }> {
  return postPublicApi('/api/public-leads', { action: 'checkout', id, lead, cpf });
}

/**
 * Da landing page ao checkout: o navegador guarda o que a própria pessoa digitou, e o
 * checkout preenche a partir daí. Antes o checkout lia nome, e-mail e telefone do banco
 * pelo ?lid=, o que hoje seria entregar o contato de quem quer que tenha aquele id.
 */
const PREFILL_KEY = 'wtech_lead_contact';

export interface LeadContactMemory {
  id: string;
  name: string;
  email: string;
  phone: string;
}

const asText = (value: unknown) => (typeof value === 'string' ? value : '');

export function rememberLeadContact(contact: { id: string; name?: unknown; email?: unknown; phone?: unknown }): void {
  try {
    sessionStorage.setItem(PREFILL_KEY, JSON.stringify({
      id: contact.id,
      name: asText(contact.name),
      email: asText(contact.email),
      phone: asText(contact.phone),
    }));
  } catch {
    // Armazenamento bloqueado: a pessoa só digita de novo.
  }
}

export function recallLeadContact(id: string | null): LeadContactMemory | null {
  if (!id) return null;
  try {
    const stored = JSON.parse(sessionStorage.getItem(PREFILL_KEY) || 'null');
    return stored?.id === id ? (stored as LeadContactMemory) : null;
  } catch {
    return null;
  }
}
