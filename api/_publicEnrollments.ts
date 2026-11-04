import type { SupabaseClient } from '@supabase/supabase-js';
import { createIpRateLimiter, getServiceClient, requireSameOrigin, setNoStoreHeaders } from './_auth.js';
import { findExistingLead } from '../lib/leadMatch.js';
import { syncStudentToLeadsWith } from '../lib/leadSync.js';
import { isUuid } from '../lib/publicLeads.js';
import {
  canSeeContact,
  DIRECT_ENROLLMENT_COURSES,
  ENROLLMENT_COURSE_COLUMNS,
  isQuestionnaireComplete,
  sanitizeQuestionnaire,
  toCertificateView,
  toEnrollmentView,
  toLeadEnrollmentView,
} from '../lib/publicEnrollments.js';

/**
 * Matrículas fora do painel — POST /api/public-enrollments { action, ... }.
 *
 *   'view'          → andamento para as telas de obrigado { id } ou { leadId, courseId }
 *   'questionnaire' → cadastro complementar depois do pagamento { id | leadId+courseId, answers }
 *   'certificate'   → validação pública de certificado { id }
 *   'create'        → inscrição direta de /wtech-lisboa { courseId, name, email, phone }
 *
 * O limite é folgado porque as telas de obrigado consultam a cada 3 s até o webhook de
 * pagamento confirmar. O que protege os dados é o recorte de lib/publicEnrollments.ts:
 * adivinhar uuid não é viável, e o id não dá acesso a CPF.
 */

const limitador = createIpRateLimiter({ windowMs: 60_000, maxAttempts: 60 });
const NAO_ENCONTRADA = 'Inscrição não encontrada.';
const ERRO_GENERICO = 'Não foi possível concluir agora. Tente novamente.';

type Row = Record<string, any>;

async function porId(supabase: SupabaseClient, id: string): Promise<Row | null> {
  const { data, error } = await supabase
    .from('SITE_Enrollments')
    .select(`*, SITE_Courses(${ENROLLMENT_COURSE_COLUMNS})`)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Matrícula mais recente da pessoa no curso, achada pelo e-mail do lead. */
async function porLead(supabase: SupabaseClient, leadId: string, courseId: string): Promise<Row | null> {
  const { data: lead, error: leadError } = await supabase.from('SITE_Leads').select('email').eq('id', leadId).maybeSingle();
  if (leadError) throw leadError;

  const email = String(lead?.email || '').trim().toLowerCase();
  if (!email) return null;

  // ilike porque o webhook grava em minúsculas mas registros antigos podem ter maiúsculas.
  const { data, error } = await supabase
    .from('SITE_Enrollments')
    .select(`*, SITE_Courses(${ENROLLMENT_COURSE_COLUMNS})`)
    .eq('course_id', courseId)
    .ilike('student_email', email.replace(/[%_\\]/g, '\\$&'))
    .order('created_at', { ascending: false })
    .limit(1);
  if (error) throw error;
  return data?.[0] ?? null;
}

async function resolver(supabase: SupabaseClient, body: Row): Promise<{ row: Row | null; viaLead: boolean }> {
  if (isUuid(body.id)) return { row: await porId(supabase, body.id), viaLead: false };
  if (isUuid(body.leadId) && isUuid(body.courseId)) {
    return { row: await porLead(supabase, body.leadId, body.courseId), viaLead: true };
  }
  return { row: null, viaLead: false };
}

async function codigoDoCliente(supabase: SupabaseClient, row: Row): Promise<string | null> {
  if (!row.student_email) return null;
  const lead = await findExistingLead<Row>(supabase, { email: row.student_email });
  return lead?.client_code ?? null;
}

async function acaoView(supabase: SupabaseClient, req: any, res: any) {
  const { row, viaLead } = await resolver(supabase, req.body);
  if (!row) return res.status(404).json({ error: NAO_ENCONTRADA });
  if (viaLead) return res.status(200).json({ enrollment: toLeadEnrollmentView(row) });

  // O código dá acesso ao portal do cliente: segue a mesma regra do contato.
  const liberarCodigo = canSeeContact(row) && row.status === 'Confirmed';
  const codigo = liberarCodigo ? await codigoDoCliente(supabase, row) : null;
  return res.status(200).json({ enrollment: toEnrollmentView(row, codigo) });
}

async function acaoQuestionnaire(supabase: SupabaseClient, req: any, res: any) {
  const { row, viaLead } = await resolver(supabase, req.body);
  if (!row) return res.status(404).json({ error: NAO_ENCONTRADA });

  const respostas = sanitizeQuestionnaire(req.body?.answers);
  if (!respostas) return res.status(400).json({ error: 'Preencha o formulário e tente novamente.' });

  // Depois de preenchido, o id (que está no QR do certificado) não reescreve o cadastro.
  if (isQuestionnaireComplete(row)) return res.status(409).json({ error: 'Este cadastro já foi concluído.' });

  const { data, error } = await supabase.from('SITE_Enrollments').update(respostas).eq('id', row.id).select('*').single();
  if (error) throw error;

  await syncStudentToLeadsWith(supabase, data);

  const liberarCodigo = !viaLead && row.status === 'Confirmed';
  return res.status(200).json({ ok: true, client_code: liberarCodigo ? await codigoDoCliente(supabase, data) : null });
}

async function acaoCertificate(supabase: SupabaseClient, req: any, res: any) {
  const certificado = isUuid(req.body?.id) ? await porId(supabase, req.body.id) : null;
  const view = certificado && toCertificateView(certificado);
  if (!view) return res.status(404).json({ error: NAO_ENCONTRADA });
  return res.status(200).json({ certificate: view });
}

async function acaoCreate(supabase: SupabaseClient, req: any, res: any) {
  const { courseId, name, email, phone } = req.body ?? {};
  const textoValido = (valor: unknown, limite: number) => typeof valor === 'string' && valor.trim().length > 0 && valor.length <= limite;
  if (!DIRECT_ENROLLMENT_COURSES.includes(courseId) || !textoValido(name, 200) || !textoValido(email, 254) || !textoValido(phone, 40)) {
    return res.status(400).json({ error: 'Confira nome, e-mail e telefone e tente novamente.' });
  }

  const { data, error } = await supabase
    .from('SITE_Enrollments')
    .insert([{
      course_id: courseId,
      student_name: name.trim(),
      student_email: email.trim(),
      student_phone: phone.trim(),
      status: 'Pending',
      amount_paid: 0,
      payment_method: 'Stripe',
    }])
    .select('id')
    .single();
  if (error) throw error;
  return res.status(201).json({ id: data.id });
}

// Map e não objeto: a ação vem do navegador, e 'constructor' acharia um método herdado.
const ACOES = new Map<string, (supabase: SupabaseClient, req: any, res: any) => Promise<unknown>>([
  ['view', acaoView],
  ['questionnaire', acaoQuestionnaire],
  ['certificate', acaoCertificate],
  ['create', acaoCreate],
]);

export default async function publicEnrollments(req: any, res: any) {
  setNoStoreHeaders(res);
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'metodo_nao_permitido' });
  }
  if (!requireSameOrigin(req, res)) return;
  if (limitador.isLimited(req)) {
    return res.status(429).json({ error: 'Muitas tentativas. Aguarde um minuto e tente novamente.' });
  }

  const acao = ACOES.get(String(req.body?.action));
  if (!acao) return res.status(400).json({ error: 'acao_invalida' });

  const supabase = getServiceClient();
  if (!supabase) return res.status(503).json({ error: ERRO_GENERICO });

  try {
    return await acao(supabase, req, res);
  } catch (erro) {
    console.error('[public-enrollments] Falha:', { acao: req.body?.action, erro: (erro as Error).message });
    return res.status(500).json({ error: ERRO_GENERICO });
  }
}
