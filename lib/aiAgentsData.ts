import { supabase } from './supabaseClient';

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

export async function getRitaStats(): Promise<RitaStats> {
    const monthStart = startOfMonthISO();

    const { data: txs } = await supabase
        .from('SITE_Transactions')
        .select('amount, type, currency, course_id')
        .gte('date', monthStart);

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

    return { incomeMonth, expenseMonth, byCourse };
}

export async function getSofiaStats(): Promise<SofiaStats> {
    const monthStart = startOfMonthISO();

    const [{ data: auditLogs }, { data: leads }, { data: enrollments }, { data: txs }, { data: users }, rita] =
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
            supabase.from('SITE_Users').select('id, name'),
            getRitaStats(),
        ]);

    const nameById = new Map((users || []).map((u: any) => [u.id, u.name]));
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

    const [{ count: leadsTotal }, { count: enrollmentsTotal }] = await Promise.all([
        supabase.from('SITE_Leads').select('id', { count: 'exact', head: true }),
        supabase.from('SITE_Enrollments').select('id', { count: 'exact', head: true }),
    ]);

    return {
        staffActivity,
        leadsTotal: leadsTotal ?? 0,
        enrollmentsTotal: enrollmentsTotal ?? 0,
        incomeMonth: rita.incomeMonth,
    };
}
