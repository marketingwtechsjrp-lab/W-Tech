export interface StaffConfigEntry {
  key: string;
  value: string;
}

interface StaffConfigErrorResponse {
  success?: false;
  error?: string;
}

async function saveSiteConfigBatch(
  endpoint: '/global' | '/ai-group' | '/ai-keys',
  entries: StaffConfigEntry[] | StaffConfigEntry,
): Promise<void> {
  const list = Array.isArray(entries) ? entries : [entries];
  const response = await fetch(`/api/staff/config${endpoint}`, {
    method: 'PUT',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ entries: list }),
  });

  if (response.ok) return;

  const payload = await response.json().catch(() => null) as StaffConfigErrorResponse | null;
  throw new Error(payload?.error || `Falha ao salvar configurações (HTTP ${response.status}).`);
}

/** Salva somente as chaves globais aceitas pela allowlist do servidor. */
export function saveGlobalSiteConfig(
  entries: StaffConfigEntry[] | StaffConfigEntry,
): Promise<void> {
  return saveSiteConfigBatch('/global', entries);
}

/** Salva somente as chaves do bot de grupo e prompts dos agentes. */
export function saveAiGroupSiteConfig(
  entries: StaffConfigEntry[] | StaffConfigEntry,
): Promise<void> {
  return saveSiteConfigBatch('/ai-group', entries);
}

export type AiKeyName = 'openai_api_key' | 'gemini_api_key' | 'openrouter_api_key';

/** Só grava: campo em branco mantém a chave atual, e nenhuma volta ao navegador. */
export function saveAiKeys(keys: Partial<Record<AiKeyName, string>>): Promise<void> {
  const entries = Object.entries(keys).map(([key, value]) => ({ key, value: (value ?? '').trim() }));
  return saveSiteConfigBatch('/ai-keys', entries);
}

export async function fetchAiKeyStatus(): Promise<Record<AiKeyName, boolean> | null> {
  const response = await fetch('/api/staff/config/ai-keys', { credentials: 'same-origin', cache: 'no-store' });
  if (!response.ok) return null;
  const data = await response.json().catch(() => null);
  return data?.configured ?? null;
}
