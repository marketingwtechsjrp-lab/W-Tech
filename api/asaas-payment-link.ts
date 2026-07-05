import { isKnownUser, denyAuth, getServiceClient } from './_auth.js';

/**
 * Vercel Serverless Function — Gera link de cobrança Asaas (SERVER-SIDE).
 * URL: /api/asaas-payment-link
 *
 * Substitui a criação que antes acontecia no NAVEGADOR (lib/asaas.ts), onde a
 * chave `asaas_api_key` era lida de SITE_Config e usada direto no cliente.
 * Agora a chave NUNCA sai do servidor.
 *
 * Auth (interina — FASE 1): header `x-wtech-user-id` de um usuário existente.
 * Na FASE 2 passa a exigir token de sessão admin.
 *
 * POST {
 *   enrollmentId?: string,                       // se informado, resolve o contato pela inscrição
 *   lead?: { name, email, phone, cpf? },         // fallback para cobrança avulsa
 *   value: number,                               // valor da cobrança (BRL)
 *   description?: string,
 *   dueDate?: string                             // YYYY-MM-DD (default +3 dias)
 * }
 *
 * Env: ASAAS_API_KEY (recomendado) — senão cai para SITE_Config via service_role.
 *      ASAAS_API_URL (opcional) — default produção.
 */

const ASAAS_URL = process.env.ASAAS_API_URL || 'https://www.asaas.com/api/v3';

async function resolveAsaasKey(): Promise<string | null> {
  const envKey = process.env.ASAAS_API_KEY;
  if (envKey) return envKey;
  const supabase = getServiceClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from('SITE_Config')
    .select('value')
    .eq('key', 'asaas_api_key')
    .maybeSingle();
  return data?.value || null;
}

async function findOrCreateCustomer(
  apiKey: string,
  lead: { name?: string; email?: string; phone?: string; cpf?: string; cnpj?: string }
): Promise<string> {
  // 1. Procura por e-mail
  if (lead.email) {
    const searchRes = await fetch(`${ASAAS_URL}/customers?email=${encodeURIComponent(lead.email)}`, {
      method: 'GET',
      headers: { access_token: apiKey },
    });
    const searchData = await searchRes.json();
    if (searchData?.data?.length > 0) return searchData.data[0].id;
  }

  // 2. Cria se não existir
  const createRes = await fetch(`${ASAAS_URL}/customers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', access_token: apiKey },
    body: JSON.stringify({
      name: lead.name,
      email: lead.email,
      mobilePhone: lead.phone,
      cpfCnpj: lead.cpf || lead.cnpj || undefined,
    }),
  });
  const createData = await createRes.json();
  if (createData?.errors) throw new Error('ASAAS_CUSTOMER_FAILED');
  return createData.id;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  // Auth interina — bloqueia chamada pública.
  if (!(await isKnownUser(req))) return denyAuth(res);

  const { enrollmentId, lead: leadInput, value, description, dueDate } = req.body || {};

  // Validação do valor (o valor é definido pelo admin, mas nunca confiamos no tipo/faixa).
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue <= 0 || numericValue > 1_000_000) {
    return res.status(400).json({ success: false, error: 'Valor inválido.' });
  }

  try {
    const apiKey = await resolveAsaasKey();
    if (!apiKey) {
      console.error('[Asaas] Chave não configurada.');
      return res.status(500).json({ success: false, error: 'Asaas não configurado.' });
    }

    // Resolve o contato: preferir a inscrição (fonte confiável no servidor).
    let lead = leadInput as { name?: string; email?: string; phone?: string; cpf?: string } | undefined;
    if (enrollmentId) {
      const supabase = getServiceClient();
      if (supabase) {
        const { data: enr } = await supabase
          .from('SITE_Enrollments')
          .select('student_name, student_email, student_phone')
          .eq('id', enrollmentId)
          .maybeSingle();
        if (enr) {
          lead = { name: enr.student_name, email: enr.student_email, phone: enr.student_phone };
        }
      }
    }

    if (!lead || (!lead.email && !lead.phone)) {
      return res.status(400).json({ success: false, error: 'Contato do cliente ausente.' });
    }

    const customerId = await findOrCreateCustomer(apiKey, lead);

    const due = new Date();
    due.setDate(due.getDate() + 3);
    const dueDateStr = dueDate || due.toISOString().split('T')[0];

    const payRes = await fetch(`${ASAAS_URL}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', access_token: apiKey },
      body: JSON.stringify({
        customer: customerId,
        billingType: 'UNDEFINED', // deixa o cliente escolher (Pix, cartão, boleto)
        value: numericValue,
        dueDate: dueDateStr,
        description: description || 'Cobrança',
        postalService: false,
      }),
    });
    const data = await payRes.json();
    if (data?.errors) {
      console.error('[Asaas] Erro ao criar cobrança:', data.errors?.[0]?.description);
      return res.status(502).json({ success: false, error: 'Falha ao gerar a cobrança.' });
    }

    return res.status(200).json({ success: true, invoiceUrl: data.invoiceUrl, id: data.id });
  } catch (err: any) {
    console.error('[Asaas] Falha:', err?.message);
    return res.status(500).json({ success: false, error: 'Falha ao gerar a cobrança.' });
  }
}
