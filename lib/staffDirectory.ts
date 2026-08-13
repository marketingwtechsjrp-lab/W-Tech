/**
 * Diretório mínimo de staff (id + name) — via endpoint autenticado
 * (GET /api/staff/directory, sessão httpOnly), nunca SITE_Users direto do
 * browser. Usado nos módulos que só precisam de um mapa id→nome para
 * dropdowns/labels (CRM, Tarefas, Vendas, Financeiro, WhatsApp, etc.).
 */
export interface StaffDirectoryEntry {
  id: string;
  name: string;
}

export async function fetchStaffDirectory(): Promise<StaffDirectoryEntry[]> {
  try {
    const res = await fetch('/api/staff/directory', { credentials: 'same-origin', cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json().catch(() => ({}));
    return Array.isArray(data?.users) ? data.users : [];
  } catch (err) {
    console.error('Error fetching staff directory:', err);
    return [];
  }
}
