export interface StaffConfigEntry {
  key: string;
  value: string;
}

interface StaffConfigErrorResponse {
  success?: false;
  error?: string;
}

async function saveSiteConfigBatch(
  endpoint: '/global' | '/ai-group',
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
