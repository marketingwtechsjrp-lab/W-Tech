import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Núcleo da Fase 2 do POP de Marketing (server-side, sem Express):
 *
 *  - Formatação das mensagens de WhatsApp (resumo de reunião 8.7, resultado
 *    de campanha 8.8 e planejamento de tráfego 8.6) — funções puras.
 *  - Ocupação de turmas (POP 8.4): getCourseOccupancy() cruza SITE_Courses
 *    (capacity) com SITE_Enrollments (status Confirmed/CheckedIn) e sinaliza
 *    turmas em risco (% abaixo do mínimo configurado).
 *  - Estado de dedupe dos alertas de turma em SITE_Config (course_alerts_state).
 *
 * Mesmo padrão do approvalsCore: recebe o SupabaseClient por parâmetro e não
 * conhece Express — o router (server/marketing.ts) só orquestra.
 */

// ─── Tipos (espelham migrations/2026-07-15_pop_marketing_fase2.sql) ──────────

export interface MeetingNoteRow {
  id: string;
  meeting_date: string | null;
  with_whom: string | null;
  participants: string | null;
  summary: string | null;
  decisions: string | null;
  shared_at: string | null;
}

export interface CampaignRequestLite {
  id: string;
  title: string;
  requester_contact: string | null;
  expected_result: string | null;
}

export interface CampaignResultRow {
  request_id: string;
  invested: number | null;
  leads: number | null;
  sales: number | null;
  revenue: number | null;
  reach: number | null;
  compared_to_goal: string | null;
  learnings: string | null;
  shared_at: string | null;
}

export interface TrafficPlanRow {
  id: string;
  month: string; // primeiro dia do mês (date)
  status: string;
  notes: string | null;
}

export interface TrafficPlanItemRow {
  id: number;
  plan_id: string;
  ad_name: string;
  campaign_name: string | null;
  channel: string;
  audience: string | null;
  region: string | null;
  budget: number | null;
  expected_result: string | null;
  sort: number;
}

export interface CourseOccupancy {
  id: string;
  title: string;
  date: string | null;
  location: string;
  capacity: number;
  enrolled: number;
  pct: number;
  at_risk: boolean;
  /** true quando capacity era nula/0 e assumimos a capacidade padrão. */
  assumed_capacity: boolean;
}

// ─── Formatação pt-BR (WhatsApp) ─────────────────────────────────────────────

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const INT_BR = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });

/** "R$ 1.234,56" — valores nulos/inválidos viram "—". */
export function formatBRL(v: unknown): string {
  const n = Number(v);
  if (v === null || v === undefined || !Number.isFinite(n)) return '—';
  return BRL.format(n);
}

/** "98.000" — valores nulos/inválidos viram "—". */
export function formatIntBR(v: unknown): string {
  const n = Number(v);
  if (v === null || v === undefined || !Number.isFinite(n)) return '—';
  return INT_BR.format(n);
}

/**
 * "17/07/2026" — datas do banco são date/timestamptz à meia-noite UTC, então
 * formatamos em UTC (formatar em America/Sao_Paulo voltaria um dia).
 */
export function formatDateBR(iso: string | null | undefined): string {
  if (!iso) return 'data a definir';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(d);
}

/** "Agosto/2026" a partir do month do plano ('2026-08-01'). */
export function formatMonthYearBR(iso: string | null | undefined): string {
  if (!iso) return 'mês a definir';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  const mes = new Intl.DateTimeFormat('pt-BR', { month: 'long', timeZone: 'UTC' }).format(d);
  return `${mes.charAt(0).toUpperCase()}${mes.slice(1)}/${d.getUTCFullYear()}`;
}

/**
 * Normaliza o contato do solicitante para envio via Evolution: só dígitos,
 * prefixo 55 quando faltar. Retorna null quando vazio ou não parece telefone
 * (menos de 10 dígitos — DDD + número — ou mais de 15, limite E.164).
 */
export function normalizeRequesterPhone(raw: string | null | undefined): string | null {
  const digits = String(raw || '').replace(/\D+/g, '');
  if (digits.length < 10 || digits.length > 15) return null;
  // 10–11 dígitos = número BR sem país (DDD + 8/9 dígitos) → prefixa 55.
  if (digits.length <= 11) return `55${digits}`;
  // 12+ dígitos: já veio com código de país; se não for 55, mantemos como está
  // (contato internacional explícito).
  return digits;
}

// ─── Mensagens (formato WhatsApp: *negrito*, emojis sóbrios) ─────────────────

/** 📝 Resumo de reunião (POP 8.7) para o grupo do time. */
export function buildMeetingNoteMessage(note: MeetingNoteRow): string {
  const quem = String(note.with_whom || 'Reunião').trim() || 'Reunião';
  const linhas = [`📝 *Resumo de Reunião — ${quem} (${formatDateBR(note.meeting_date)})*`];
  if (note.participants?.trim()) linhas.push(`Participantes: ${note.participants.trim()}`);
  linhas.push('', String(note.summary || '').trim() || '(sem resumo)');
  if (note.decisions?.trim()) linhas.push('', '*Decisões e prazos:*', note.decisions.trim());
  return linhas.join('\n');
}

/** 📊 Resultado de campanha (POP 8.8) — para o time ou para o solicitante. */
export function buildCampaignResultMessage(
  request: CampaignRequestLite,
  result: CampaignResultRow,
): string {
  const linhas = [
    `📊 *Resultado de Campanha — ${request.title}*`,
    `Investido: ${formatBRL(result.invested)} | Leads: ${formatIntBR(result.leads)} | ` +
      `Vendas: ${formatIntBR(result.sales)} | Receita: ${formatBRL(result.revenue)}`,
  ];
  if (result.reach !== null && result.reach !== undefined) {
    linhas.push(`Alcance: ${formatIntBR(result.reach)}`);
  }
  if (request.expected_result?.trim()) linhas.push(`Meta do pedido: ${request.expected_result.trim()}`);
  if (result.compared_to_goal?.trim()) linhas.push(`Resultado vs meta: ${result.compared_to_goal.trim()}`);
  if (result.learnings?.trim()) linhas.push('', `*Aprendizados:* ${result.learnings.trim()}`);
  return linhas.join('\n');
}

/** 🎯 Planejamento de tráfego do mês (POP 8.6) com uma linha por anúncio + total. */
export function buildTrafficPlanMessage(plan: TrafficPlanRow, items: TrafficPlanItemRow[]): string {
  const linhas = [`🎯 *Planejamento de Tráfego — ${formatMonthYearBR(plan.month)}*`];
  if (plan.notes?.trim()) linhas.push(plan.notes.trim());
  linhas.push('');

  let total = 0;
  if (!items.length) {
    linhas.push('(nenhum anúncio cadastrado ainda)');
  }
  for (const item of items) {
    const budget = Number(item.budget);
    if (Number.isFinite(budget)) total += budget;

    let linha = `• ${item.ad_name} (${item.channel}) — ${formatBRL(item.budget)}`;
    if (item.region?.trim()) linha += ` — ${item.region.trim()}`;
    linhas.push(linha);

    const detalhes: string[] = [];
    if (item.audience?.trim()) detalhes.push(`Público: ${item.audience.trim()}`);
    if (item.expected_result?.trim()) detalhes.push(`Esperado: ${item.expected_result.trim()}`);
    if (detalhes.length) linhas.push(`  ${detalhes.join(' | ')}`);
  }

  linhas.push('', `*Total:* ${formatBRL(total)}`);
  return linhas.join('\n');
}

/** ⚠️ Alerta de turma com baixa adesão (POP 8.4) para o grupo do time. */
export function buildCourseAlertMessage(c: CourseOccupancy): string {
  const estimada = c.assumed_capacity ? ' — capacidade estimada' : '';
  return [
    `⚠️ *Turma com baixa adesão* — ${c.title} (${formatDateBR(c.date)}, ${c.location})`,
    `Inscritos: ${c.enrolled}/${c.capacity} (${c.pct}%)${estimada}`,
    '👉 Avaliar campanha de reforço antes da data-limite de adiamento (POP 8.4)',
  ].join('\n');
}

// ─── Ocupação de turmas (POP 8.4) ────────────────────────────────────────────

/** Capacidade assumida quando a turma não tem capacity definida (padrão do site). */
export const DEFAULT_COURSE_CAPACITY = 20;

/**
 * Statuses de inscrição que contam como vaga ocupada — mesma regra do app
 * (lib/leads.ts considera pago quem está Confirmed/CheckedIn; Pending fica fora).
 */
export const CONFIRMED_ENROLLMENT_STATUSES = ['Confirmed', 'CheckedIn'];

/** Turmas nesses statuses não geram alerta (já encerradas/canceladas). */
const EXCLUDED_COURSE_STATUSES = ['Cancelled', 'Completed', 'Archived'];

/**
 * Turmas com data de hoje até `days` dias à frente, com contagem de inscritos
 * confirmados e % de ocupação. `at_risk` = pct abaixo de `minPct`.
 *
 * Obs.: o app calcula a ocupação contando SITE_Enrollments (a coluna
 * registered_count de SITE_Courses existe mas é legado de seed — as telas usam
 * SITE_Enrollments(count)). Aqui contamos só Confirmed/CheckedIn.
 */
export async function getCourseOccupancy(
  supabase: SupabaseClient,
  opts: { days: number; minPct: number },
): Promise<CourseOccupancy[]> {
  const hoje = new Date();
  const inicio = hoje.toISOString().slice(0, 10);
  const fim = new Date(hoje.getTime() + opts.days * 86_400_000).toISOString().slice(0, 10);

  const { data: cursos, error } = await supabase
    .from('SITE_Courses')
    .select('id, title, date, city, state, location, capacity, status')
    .gte('date', inicio)
    .lte('date', fim)
    .order('date', { ascending: true })
    .limit(100);
  if (error) throw new Error('Falha ao listar turmas: ' + error.message);

  const ativos = (cursos || []).filter(
    (c: any) => !EXCLUDED_COURSE_STATUSES.includes(String(c.status || '')),
  );
  if (!ativos.length) return [];

  // Contagem de inscritos confirmados por turma (uma query só, agregada em memória).
  const ids = ativos.map((c: any) => String(c.id));
  const { data: inscricoes, error: enrError } = await supabase
    .from('SITE_Enrollments')
    .select('course_id, status')
    .in('course_id', ids)
    .in('status', CONFIRMED_ENROLLMENT_STATUSES)
    .limit(10_000);
  if (enrError) throw new Error('Falha ao contar inscrições: ' + enrError.message);

  const porCurso: Record<string, number> = {};
  for (const e of inscricoes || []) {
    const cid = String((e as any).course_id || '');
    if (cid) porCurso[cid] = (porCurso[cid] || 0) + 1;
  }

  return ativos.map((c: any): CourseOccupancy => {
    const capacityRaw = Number(c.capacity);
    const assumed = !Number.isFinite(capacityRaw) || capacityRaw <= 0;
    const capacity = assumed ? DEFAULT_COURSE_CAPACITY : capacityRaw;
    const enrolled = porCurso[String(c.id)] || 0;
    const pct = Math.round((enrolled / capacity) * 100);

    // Exibição do local: cidade - UF > location livre > placeholder.
    const cidade = String(c.city || '').trim();
    const uf = String(c.state || '').trim();
    const location = cidade
      ? (uf ? `${cidade} - ${uf}` : cidade)
      : (String(c.location || '').trim() || 'Local a definir');

    return {
      id: String(c.id),
      title: String(c.title || 'Turma sem título'),
      date: c.date ? String(c.date) : null,
      location,
      capacity,
      enrolled,
      pct,
      at_risk: pct < opts.minPct,
      assumed_capacity: assumed,
    };
  });
}

// ─── Dedupe dos alertas (SITE_Config.course_alerts_state) ────────────────────

const ALERT_STATE_KEY = 'course_alerts_state';

/** Não repetir alerta da mesma turma dentro desta janela. */
export const COURSE_ALERT_DEDUPE_DAYS = 7;

/** Estado {course_id: 'YYYY-MM-DD' do último alerta}. Falha de leitura → {}. */
export async function loadCourseAlertState(supabase: SupabaseClient): Promise<Record<string, string>> {
  try {
    const { data } = await supabase
      .from('SITE_Config')
      .select('value')
      .eq('key', ALERT_STATE_KEY)
      .maybeSingle();
    const raw = data?.value ? JSON.parse(String(data.value)) : null;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(raw)) {
      if (typeof v === 'string' && v) out[k] = v;
    }
    return out;
  } catch (e: any) {
    console.error('[marketing] Falha ao ler course_alerts_state:', e?.message);
    return {};
  }
}

/** Persiste o estado de dedupe. Best-effort: falha só loga (alerta já foi enviado). */
export async function saveCourseAlertState(
  supabase: SupabaseClient,
  state: Record<string, string>,
): Promise<void> {
  try {
    const { error } = await supabase
      .from('SITE_Config')
      .upsert({ key: ALERT_STATE_KEY, value: JSON.stringify(state) }, { onConflict: 'key' });
    if (error) console.error('[marketing] Falha ao salvar course_alerts_state:', error.message);
  } catch (e: any) {
    console.error('[marketing] Falha ao salvar course_alerts_state:', e?.message);
  }
}

/** Dias corridos desde uma data 'YYYY-MM-DD' (inválida → Infinity = nunca alertou). */
export function daysSinceDateOnly(dateOnly: string | undefined): number {
  if (!dateOnly) return Number.POSITIVE_INFINITY;
  const t = Date.parse(`${dateOnly}T00:00:00Z`);
  if (!Number.isFinite(t)) return Number.POSITIVE_INFINITY;
  return Math.floor((Date.now() - t) / 86_400_000);
}
