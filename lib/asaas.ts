/**
 * Cliente fino do Asaas — NÃO usa mais a chave secreta no navegador.
 *
 * SEGURANÇA: a criação de cliente + cobrança acontece 100% no servidor
 * (api/asaas-payment-link.ts). A `asaas_api_key` nunca sai do backend, e o valor
 * é validado no servidor. Antes, esta lib lia a chave de SITE_Config e chamava
 * a API do Asaas direto do navegador (chave exposta no DevTools).
 */

/** Id do usuário logado (auth interina da FASE 1: header x-wtech-user-id). */
function currentUserId(): string {
  try {
    const raw = localStorage.getItem('wtech_user');
    if (!raw) return '';
    const u = JSON.parse(raw);
    return String(u?.id || '');
  } catch {
    return '';
  }
}

export const createPaymentLink = async ({
  lead,
  value,
  description,
  dueDate,
  enrollmentId,
}: {
  lead: any;
  value: number;
  description: string;
  dueDate?: string;
  enrollmentId?: string;
}) => {
  try {
    const res = await fetch('/api/asaas-payment-link', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-wtech-user-id': currentUserId(),
      },
      body: JSON.stringify({ lead, value, description, dueDate, enrollmentId }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.success) {
      return { success: false, error: data?.error || `HTTP ${res.status}` };
    }
    return { success: true, invoiceUrl: data.invoiceUrl, id: data.id };
  } catch (error: any) {
    console.error('Asaas Error:', error?.message);
    return { success: false, error: error?.message || 'Falha ao gerar a cobrança.' };
  }
};
