import { postPublicApi } from './publicLeads';

/**
 * Matrículas vistas de fora do painel: obrigado, confirmação, certificado.
 *
 * O navegador não lê mais SITE_Enrollments (migrations/2026-11-04_fechar_leads_matriculas_mecanicos.sql)
 * e passa por api/_publicEnrollments.ts. O id da matrícula funciona como link de acesso,
 * mas é fraco: ele também vai no QR code do certificado, que o aluno mostra para quem quiser.
 * Por isso CPF nunca sai daqui, e contato só sai enquanto o questionário está em aberto e o
 * aluno ainda não fez o curso (certificado só existe depois do check-in).
 */

export const ENROLLMENT_COURSE_COLUMNS =
  'title, date, date_end, city, state, start_time, what_to_bring, currency, whatsapp_group_link, location, location_type';

/** Curso aceito na inscrição direta de /wtech-lisboa. Outro id não cria matrícula. */
export const DIRECT_ENROLLMENT_COURSES = ['b4a2f0be-2c70-44ce-b2ba-06773e89a0b8'];

const QUESTIONNAIRE_TEXT_FIELDS: Record<string, number> = {
  student_name: 200,
  student_email: 254,
  student_phone: 40,
  student_cpf: 20,
  t_shirt_size: 10,
  zip_code: 20,
  address: 300,
  address_number: 30,
  address_neighborhood: 150,
  city: 150,
  state: 60,
  workshop_name: 200,
  workshop_address: 300,
  experience_years: 50,
};
const QUESTIONNAIRE_BOOLEAN_FIELDS = [
  'is_mechanic',
  'has_workshop',
  'works_with_suspensions',
  'took_wtech_course',
  'took_suspension_course',
];

export interface EnrollmentCourseView {
  title?: string | null;
  date?: string | null;
  date_end?: string | null;
  city?: string | null;
  state?: string | null;
  start_time?: string | null;
  what_to_bring?: string | null;
  currency?: string | null;
  whatsapp_group_link?: string | null;
}

export interface EnrollmentView {
  id?: string;
  status: string;
  amount_paid: number;
  total_amount: number;
  currency: string | null;
  payment_method: string | null;
  payment_id: string | null;
  t_shirt_size: string | null;
  has_cpf: boolean;
  student_name?: string | null;
  student_email?: string | null;
  student_phone?: string | null;
  zip_code?: string | null;
  address?: string | null;
  address_number?: string | null;
  address_neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  client_code?: string | null;
  SITE_Courses: EnrollmentCourseView | null;
}

export interface CertificateView {
  reference: string;
  student_name: string | null;
  course: { title: string | null; location: string | null; location_type: string | null; date: string | null };
}

type Row = Record<string, any>;

const PAID_STATUSES = ['Confirmed', 'CheckedIn'];

const text = (value: unknown) => (typeof value === 'string' && value ? value : null);

export function isQuestionnaireComplete(row: Row): boolean {
  return Boolean(row.t_shirt_size && row.student_cpf);
}

function baseView(row: Row): Omit<EnrollmentView, 'SITE_Courses'> {
  return {
    status: String(row.status ?? ''),
    amount_paid: Number(row.amount_paid) || 0,
    total_amount: Number(row.total_amount) || 0,
    currency: text(row.currency),
    payment_method: text(row.payment_method),
    payment_id: text(row.payment_id),
    t_shirt_size: text(row.t_shirt_size),
    has_cpf: Boolean(row.student_cpf),
  };
}

/** Enquanto o aluno ainda precisa do formulário preenchido e o certificado não existe. */
export function canSeeContact(row: Row): boolean {
  return !isQuestionnaireComplete(row) && row.status !== 'CheckedIn';
}

/** Consulta pelo id da matrícula: /inscricao-confirmada, /pagamento-sucesso, /obrigado-lisboa?eid=. */
export function toEnrollmentView(row: Row, clientCode: string | null = null): EnrollmentView {
  const course: Row | null = row.SITE_Courses ?? null;
  const contact = canSeeContact(row)
    ? {
        student_email: text(row.student_email),
        student_phone: text(row.student_phone),
        zip_code: text(row.zip_code),
        address: text(row.address),
        address_number: text(row.address_number),
        address_neighborhood: text(row.address_neighborhood),
        city: text(row.city),
        state: text(row.state),
        client_code: clientCode,
      }
    : {};

  return {
    ...baseView(row),
    ...contact,
    id: String(row.id),
    student_name: text(row.student_name),
    SITE_Courses: course && {
      title: text(course.title),
      date: text(course.date),
      date_end: text(course.date_end),
      city: text(course.city),
      state: text(course.state),
      start_time: text(course.start_time),
      what_to_bring: text(course.what_to_bring),
      currency: text(course.currency),
      // Link do grupo da turma é para quem pagou.
      whatsapp_group_link: PAID_STATUSES.includes(row.status) ? text(course.whatsapp_group_link) : null,
    },
  };
}

/**
 * Consulta pelo lead (/obrigado-lisboa?lid=). O id do lead sai do recadastro para quem
 * digitar o e-mail de alguém, então aqui só vai o andamento: nem nome, nem contato,
 * nem o id da matrícula. O nome na tela vem do que a própria pessoa digitou no checkout.
 */
export function toLeadEnrollmentView(row: Row): EnrollmentView {
  const course: Row | null = row.SITE_Courses ?? null;
  return {
    ...baseView(row),
    SITE_Courses: course && { title: text(course.title), currency: text(course.currency) },
  };
}

export function toCertificateView(row: Row): CertificateView | null {
  if (!PAID_STATUSES.includes(row.status)) return null;
  const course: Row = row.SITE_Courses ?? {};
  return {
    reference: String(row.id).split('-')[0],
    student_name: text(row.student_name),
    course: {
      title: text(course.title),
      location: text(course.location),
      location_type: text(course.location_type),
      date: text(course.date),
    },
  };
}

/** Só os campos do questionário. Vazio não apaga o que já está gravado. */
export function sanitizeQuestionnaire(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== 'object') return null;
  const input = raw as Row;

  const fields: Record<string, unknown> = {};
  for (const [key, limit] of Object.entries(QUESTIONNAIRE_TEXT_FIELDS)) {
    const value = input[key];
    if (typeof value === 'string' && value.trim()) fields[key] = value.trim().slice(0, limit);
  }
  for (const key of QUESTIONNAIRE_BOOLEAN_FIELDS) {
    if (typeof input[key] === 'boolean') fields[key] = input[key];
  }
  return Object.keys(fields).length > 0 ? fields : null;
}

/** Quem pergunta: o id da matrícula ou o lead + curso (fluxo sem matrícula prévia). */
export type EnrollmentRef = { id: string } | { leadId: string; courseId: string };

export async function fetchEnrollmentView(ref: EnrollmentRef): Promise<EnrollmentView> {
  const { enrollment } = await postPublicApi<{ enrollment: EnrollmentView }>('/api/public-enrollments', { action: 'view', ...ref });
  return enrollment;
}

export async function submitQuestionnaire(ref: EnrollmentRef, answers: Record<string, unknown>): Promise<{ clientCode: string | null }> {
  const { client_code: clientCode } = await postPublicApi<{ client_code: string | null }>(
    '/api/public-enrollments',
    { action: 'questionnaire', ...ref, answers },
  );
  return { clientCode };
}

export async function fetchCertificate(id: string): Promise<CertificateView> {
  const { certificate } = await postPublicApi<{ certificate: CertificateView }>('/api/public-enrollments', { action: 'certificate', id });
  return certificate;
}

export async function createDirectEnrollment(input: { courseId: string; name: string; email: string; phone: string }): Promise<{ id: string }> {
  return postPublicApi('/api/public-enrollments', { action: 'create', ...input });
}
