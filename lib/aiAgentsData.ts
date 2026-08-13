import { supabase } from './supabaseClient';
import { fetchStaffDirectory } from './staffDirectory';

/**
 * Consultas client-side para o dashboard "Assistentes de IA" (super admin).
 * Mesmos critérios de status/coluna usados no relatório server-side
 * (api/_agentsReport.ts) — mantidos em arquivos separados porque um roda com
 * a service role key (servidor) e o outro com a sessão do usuário (browser).
 */

export interface LeoStats {
    leadsNotAttended: number;
    pendingEnrollments: number;
    pendingBalance: { total: number; count: number };
    newLeadsThisMonth: number;
}

export interface BiaStats {
    inboundToday: number;
    openTasks: number;
    leadsByStage: Record<string, number>;
}

export interface RitaStats {
    incomeMonth: number;
    expenseMonth: number;
    byCourse: Array<{ course: string; total: number }>;
    /** Dinheiro REAL das matrículas (BRL): Σ amount_paid de todas as inscrições. */
    arrecadadoTotal: number;
    /** Σ total_amount negociado (BRL) das inscrições com valor definido. */
    negociadoTotal: number;
    /** Negociado − arrecadado (BRL): o que ainda falta entrar dos alunos. */
    saldoAReceber: number;
}

export interface StaffActivityRow {
    userName: string;
    auditActions: number;
    leadsAssigned: number;
    enrollmentsHandled: number;
    transactionsHandled: number;
    lastSeen: string | null;
}

export interface SofiaStats {
    staffActivity: StaffActivityRow[];
    leadsTotal: number;
    enrollmentsTotal: number;
    /** Alunos inscritos de verdade: matrículas Confirmed + CheckedIn. */
    studentsEnrolled: number;
    enrollmentsByStatus: { confirmadas: number; checkin: number; pendentes: number };
    /** Dinheiro REAL das matrículas (BRL): Σ amount_paid. */
    arrecadadoTotal: number;
    incomeMonth: number;
}

function startOfMonthISO(): string {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

function startOfTodayISO(): string {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
}

export async function getLeoStats(): Promise<LeoStats> {
    const monthStart = startOfMonthISO();

    const [{ count: leadsNotAttended }, { count: pendingEnrollments }, { count: newLeadsThisMonth }, { data: enrs }] =
        await Promise.all([
            supabase.from('SITE_Leads').select('id', { count: 'exact', head: true }).eq('status', 'New'),
            supabase.from('SITE_Enrollments').select('id', { count: 'exact', head: true }).eq('status', 'Pending'),
            supabase.from('SITE_Leads').select('id', { count: 'exact', head: true }).gte('created_at', monthStart),
            supabase
                .from('SITE_Enrollments')
                .select('amount_paid, total_amount, currency')
                .eq('status', 'Confirmed')
                .gt('total_amount', 0)
                .limit(1000),
        ]);

    let total = 0;
    let count = 0;
    (enrs || []).forEach((e: any) => {
        if ((e.currency || 'BRL').toUpperCase() !== 'BRL') return;
        const remaining = Number(e.total_amount || 0) - Number(e.amount_paid || 0);
        if (remaining > 0.009) {
            total += remaining;
            count += 1;
        }
    });

    return {
        leadsNotAttended: leadsNotAttended ?? 0,
        pendingEnrollments: pendingEnrollments ?? 0,
        pendingBalance: { total, count },
        newLeadsThisMonth: newLeadsThisMonth ?? 0,
    };
}

export async function getBiaStats(): Promise<BiaStats> {
    const dayStart = startOfTodayISO();

    const [{ count: inboundToday }, { count: openTasks }, { data: leads }] = await Promise.all([
        supabase
            .from('SITE_WhatsAppCloudMessages')
            .select('id', { count: 'exact', head: true })
            .eq('direction', 'in')
            .gte('timestamp', dayStart),
        supabase.from('SITE_Tasks').select('id', { count: 'exact', head: true }).neq('status', 'DONE'),
        supabase.from('SITE_Leads').select('status').limit(5000),
    ]);

    const leadsByStage: Record<string, number> = {};
    (leads || []).forEach((l: any) => {
        const s = l.status || 'New';
        leadsByStage[s] = (leadsByStage[s] || 0) + 1;
    });

    return { inboundToday: inboundToday ?? 0, openTasks: openTasks ?? 0, leadsByStage };
}

/**
 * Consolidado REAL das matrículas (fonte da verdade do dinheiro dos alunos):
 * Σ amount_paid (arrecadado), Σ total_amount (negociado) e a diferença (saldo
 * a receber). Só BRL — cursos internacionais (EUR/USD) ficam de fora do
 * consolidado global e aparecem no detalhe por curso com a moeda deles.
 */
async function getEnrollmentMoneyTotals(): Promise<{ arrecadadoTotal: number; negociadoTotal: number; saldoAReceber: number }> {
    const { data: enrs } = await supabase
        .from('SITE_Enrollments')
        .select('amount_paid, total_amount, currency')
        .limit(5000);
    let arrecadadoTotal = 0;
    let negociadoTotal = 0;
    let saldoAReceber = 0;
    (enrs || []).forEach((e: any) => {
        if ((e.currency || 'BRL').toUpperCase() !== 'BRL') return;
        const paid = Number(e.amount_paid || 0);
        const negotiated = Number(e.total_amount || 0);
        arrecadadoTotal += paid;
        negociadoTotal += negotiated;
        const remaining = negotiated - paid;
        if (remaining > 0.009) saldoAReceber += remaining;
    });
    return { arrecadadoTotal, negociadoTotal, saldoAReceber };
}

export async function getRitaStats(): Promise<RitaStats> {
    const monthStart = startOfMonthISO();

    const [{ data: txs }, money] = await Promise.all([
        supabase
            .from('SITE_Transactions')
            .select('amount, type, currency, course_id')
            .gte('date', monthStart),
        getEnrollmentMoneyTotals(),
    ]);

    let incomeMonth = 0;
    let expenseMonth = 0;
    const byCourseId = new Map<string, number>();
    (txs || []).forEach((t: any) => {
        if ((t.currency || 'BRL').toUpperCase() !== 'BRL') return;
        const amt = Number(t.amount || 0);
        if (t.type === 'Income') {
            incomeMonth += amt;
            if (t.course_id) byCourseId.set(t.course_id, (byCourseId.get(t.course_id) || 0) + amt);
        } else if (t.type === 'Expense') {
            expenseMonth += amt;
        }
    });

    let byCourse: Array<{ course: string; total: number }> = [];
    if (byCourseId.size > 0) {
        const { data: courses } = await supabase
            .from('SITE_Courses')
            .select('id, title')
            .in('id', Array.from(byCourseId.keys()));
        const titleById = new Map((courses || []).map((c: any) => [c.id, c.title]));
        byCourse = Array.from(byCourseId.entries())
            .map(([id, total]) => ({ course: titleById.get(id) || 'Curso sem título', total }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 5);
    }

    return { incomeMonth, expenseMonth, byCourse, ...money };
}

export async function getSofiaStats(): Promise<SofiaStats> {
    const monthStart = startOfMonthISO();

    const [{ data: auditLogs }, { data: leads }, { data: enrollments }, { data: txs }, users, rita] =
        await Promise.all([
            supabase.from('SITE_AuditLogs').select('user_name, created_at').gte('created_at', monthStart).limit(5000),
            supabase.from('SITE_Leads').select('assigned_to').not('assigned_to', 'is', null).limit(5000),
            supabase
                .from('SITE_Enrollments')
                .select('enrolled_by_name')
                .gte('created_at', monthStart)
                .not('enrolled_by_name', 'is', null)
                .limit(5000),
            supabase
                .from('SITE_Transactions')
                .select('attendant_id')
                .gte('date', monthStart)
                .not('attendant_id', 'is', null)
                .limit(5000),
            fetchStaffDirectory(),
            getRitaStats(),
        ]);

    const nameById = new Map((users || []).map((u) => [u.id, u.name]));
    const stats = new Map<string, StaffActivityRow>();
    const bump = (name: string | null | undefined, field: keyof Omit<StaffActivityRow, 'userName' | 'lastSeen'>, when?: string) => {
        const key = (name || '').trim();
        if (!key) return;
        const current = stats.get(key) || {
            userName: key,
            auditActions: 0,
            leadsAssigned: 0,
            enrollmentsHandled: 0,
            transactionsHandled: 0,
            lastSeen: null,
        };
        current[field] += 1;
        if (when && (!current.lastSeen || when > current.lastSeen)) current.lastSeen = when;
        stats.set(key, current);
    };

    (auditLogs || []).forEach((l: any) => bump(l.user_name, 'auditActions', l.created_at));
    (leads || []).forEach((l: any) => bump(nameById.get(l.assigned_to) || l.assigned_to, 'leadsAssigned'));
    (enrollments || []).forEach((e: any) => bump(e.enrolled_by_name, 'enrollmentsHandled'));
    (txs || []).forEach((t: any) => bump(nameById.get(t.attendant_id) || t.attendant_id, 'transactionsHandled'));

    const staffActivity = Array.from(stats.values()).sort(
        (a, b) =>
            b.auditActions + b.leadsAssigned + b.enrollmentsHandled + b.transactionsHandled -
            (a.auditActions + a.leadsAssigned + a.enrollmentsHandled + a.transactionsHandled)
    );

    const [{ count: leadsTotal }, { data: allEnrs }] = await Promise.all([
        supabase.from('SITE_Leads').select('id', { count: 'exact', head: true }),
        supabase.from('SITE_Enrollments').select('status, amount_paid, currency').limit(5000),
    ]);

    const enrollmentsByStatus = { confirmadas: 0, checkin: 0, pendentes: 0 };
    let arrecadadoTotal = 0;
    (allEnrs || []).forEach((e: any) => {
        if (e.status === 'Confirmed') enrollmentsByStatus.confirmadas += 1;
        else if (e.status === 'CheckedIn') enrollmentsByStatus.checkin += 1;
        else enrollmentsByStatus.pendentes += 1;
        if ((e.currency || 'BRL').toUpperCase() === 'BRL') arrecadadoTotal += Number(e.amount_paid || 0);
    });

    return {
        staffActivity,
        leadsTotal: leadsTotal ?? 0,
        enrollmentsTotal: (allEnrs || []).length,
        studentsEnrolled: enrollmentsByStatus.confirmadas + enrollmentsByStatus.checkin,
        enrollmentsByStatus,
        arrecadadoTotal,
        incomeMonth: rita.incomeMonth,
    };
}

// ─── Consulta por curso: dados reais de inscritos e dinheiro ─────────────────

export interface CourseOption {
    id: string;
    title: string;
    place: string | null;
    date: string | null;
    price: number;
    currency: string;
    status: string | null;
}

export interface CourseStudentRow {
    enrollmentId: string;
    nome: string;
    status: string;
    negociado: number;
    pago: number;
    saldo: number;
    quitado: boolean;
    paymentMethod: string | null;
    createdAt: string | null;
    currency: string;
}

export interface CourseInsights {
    currency: string;
    inscritos: { total: number; confirmadas: number; checkin: number; pendentes: number };
    tabelaTotal: number;
    negociadoTotal: number;
    arrecadadoTotal: number;
    /** Defasagem = desconto concedido: Σ (preço de tabela − negociado). */
    defasagemTotal: number;
    saldoAReceber: number;
    quitados: number;
    devendo: number;
    alunos: CourseStudentRow[];
}

/** Normaliza para busca sem acento — "joao" encontra "João". */
export const normalizeSearch = (s: string) =>
    (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export async function listCourseOptions(): Promise<CourseOption[]> {
    const { data } = await supabase
        .from('SITE_Courses')
        .select('id, title, city, state, location, date, price, currency, status')
        .order('date', { ascending: false })
        .limit(200);
    return (data || []).map((c: any) => ({
        id: c.id,
        title: c.title,
        place: [c.city, c.state].filter(Boolean).join('/') || c.location || null,
        date: c.date ? String(c.date).slice(0, 10) : null,
        price: Number(c.price || 0),
        currency: (c.currency || 'BRL').toUpperCase(),
        status: c.status || null,
    }));
}

/**
 * Insights REAIS de um curso, direto de SITE_Enrollments (fonte da verdade):
 * inscritos por status, tabela vs negociado vs arrecadado, defasagem
 * (desconto), saldo a receber e a lista completa de alunos com o dinheiro de
 * cada um. Somas monetárias na moeda do curso (matrículas em outra moeda
 * entram na contagem, mas não nas somas).
 */
export async function getCourseInsights(course: CourseOption): Promise<CourseInsights> {
    const { data: enrs } = await supabase
        .from('SITE_Enrollments')
        .select('id, student_name, status, total_amount, amount_paid, currency, payment_method, created_at')
        .eq('course_id', course.id)
        .order('created_at', { ascending: true })
        .limit(2000);

    const inscritos = { total: 0, confirmadas: 0, checkin: 0, pendentes: 0 };
    let tabelaTotal = 0;
    let negociadoTotal = 0;
    let arrecadadoTotal = 0;
    let defasagemTotal = 0;
    let saldoAReceber = 0;
    let quitados = 0;
    let devendo = 0;
    const alunos: CourseStudentRow[] = [];

    (enrs || []).forEach((e: any) => {
        inscritos.total += 1;
        if (e.status === 'Confirmed') inscritos.confirmadas += 1;
        else if (e.status === 'CheckedIn') inscritos.checkin += 1;
        else inscritos.pendentes += 1;

        const cur = (e.currency || 'BRL').toUpperCase();
        const negociado = Number(e.total_amount || 0);
        const pago = Number(e.amount_paid || 0);
        const saldo = Math.max(0, negociado - pago);
        const quitado = negociado > 0 && negociado - pago <= 0.009;

        alunos.push({
            enrollmentId: e.id,
            nome: e.student_name,
            status: e.status || 'Pending',
            negociado,
            pago,
            saldo,
            quitado,
            paymentMethod: e.payment_method || null,
            createdAt: e.created_at || null,
            currency: cur,
        });

        // Somas apenas na moeda do curso.
        if (cur !== course.currency) return;
        // Dinheiro que entrou é real SEMPRE — mesmo sem valor negociado definido.
        arrecadadoTotal += pago;
        // Tabela/negociado/defasagem/saldo só fazem sentido com valor negociado.
        if (negociado <= 0) return;
        tabelaTotal += course.price > 0 ? course.price : negociado;
        negociadoTotal += negociado;
        if (course.price > negociado) defasagemTotal += course.price - negociado;
        if (negociado - pago > 0.009) {
            saldoAReceber += negociado - pago;
            devendo += 1;
        } else {
            quitados += 1;
        }
    });

    return {
        currency: course.currency,
        inscritos,
        tabelaTotal,
        negociadoTotal,
        arrecadadoTotal,
        defasagemTotal,
        saldoAReceber,
        quitados,
        devendo,
        alunos,
    };
}
