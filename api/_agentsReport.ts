import type { SupabaseClient } from '@supabase/supabase-js';
import { sendTransactional } from './_waDispatch.js';
import {
    gatherSystemReport,
    getServiceClient,
    startOfTodayBRT,
    fmtMoney,
    symbolOf,
    type SystemReportData,
    type ReportSendResult,
} from './_report.js';
import { loadAIKeys, loadAIConfig, callLLM } from './_aiReply.js';
import { AI_AGENTS, DEFAULT_AGENT_PROMPTS, AGENT_GUARDRAILS, type AIAgentId } from '../lib/aiAgentDefaults.js';

/**
 * Relatório diário "com personas" — Léo, Bia, Rita e Sofia.
 * Arquivo com prefixo "_" — helper compartilhado (não vira rota na Vercel).
 *
 * Reaproveita gatherSystemReport() de _report.ts como base e adiciona os
 * recortes por setor pedidos por Daniel para o módulo "Assistentes de IA":
 *   Léo   → atendimento/CRM/inscrições (leads não atendidos, alunos pendentes, saldo)
 *   Bia   → WhatsApp/tarefas/funil de CRM
 *   Rita  → financeiro (receita/despesa do mês, faturamento por curso)
 *   Sofia → consolidado + ranking de atividade por funcionário (SITE_AuditLogs +
 *           SITE_Leads.assigned_to + SITE_Enrollments.enrolled_by_name +
 *           SITE_Transactions.attendant_id)
 *
 * Best-effort: cada bloco falha isolado — uma tabela indisponível não derruba
 * o relatório inteiro (mesmo padrão de _report.ts).
 */

export interface StaffActivity {
    userName: string;
    auditActions: number;
    leadsAssigned: number;
    enrollmentsHandled: number;
    transactionsHandled: number;
    lastSeen: string | null;
}

export interface AgentsReportData {
    base: SystemReportData;
    leo: {
        leadsNotAttended: number | null;
        pendingEnrollments: number | null;
        pendingBalance: { total: number; count: number } | null;
    };
    bia: {
        inboundToday: number | null;
        openTasks: number | null;
        leadsByStage: Record<string, number>;
    };
    rita: {
        incomeMonth: number | null;
        expenseMonth: number | null;
        byCourse: Array<{ course: string; total: number }>;
    };
    sofia: {
        staffActivity: StaffActivity[];
    };
}

/** Início do mês corrente em America/Sao_Paulo, como ISO UTC. */
function startOfMonthBRT(): string {
    const TZ_OFFSET_MS = 3 * 60 * 60 * 1000;
    const nowBRT = new Date(Date.now() - TZ_OFFSET_MS);
    const y = nowBRT.getUTCFullYear();
    const m = nowBRT.getUTCMonth();
    return new Date(Date.UTC(y, m, 1) + TZ_OFFSET_MS).toISOString();
}

/** Coleta as métricas por agente. Cada bloco falha isolado (métrica vira null/vazio). */
export async function gatherAgentsReport(): Promise<AgentsReportData> {
    const client = getServiceClient();
    const base = await gatherSystemReport(client);
    const { iso: dayStart } = startOfTodayBRT();
    const monthStart = startOfMonthBRT();

    const data: AgentsReportData = {
        base,
        leo: { leadsNotAttended: null, pendingEnrollments: null, pendingBalance: null },
        bia: { inboundToday: null, openTasks: null, leadsByStage: {} },
        rita: { incomeMonth: null, expenseMonth: null, byCourse: [] },
        sofia: { staffActivity: [] },
    };

    // ── Léo: leads não atendidos, alunos pendentes, saldo a pagar ───────────
    try {
        const { count } = await client
            .from('SITE_Leads')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'New');
        data.leo.leadsNotAttended = count ?? 0;
    } catch (e: any) {
        console.error('[agentsReport] leo.leadsNotAttended:', e?.message);
    }

    try {
        const { count } = await client
            .from('SITE_Enrollments')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'Pending');
        data.leo.pendingEnrollments = count ?? 0;
    } catch (e: any) {
        console.error('[agentsReport] leo.pendingEnrollments:', e?.message);
    }

    data.leo.pendingBalance = base.pendingBalance;

    // ── Bia: WhatsApp de hoje, tarefas abertas, funil de leads ──────────────
    data.bia.inboundToday = base.inboundMessagesToday;

    try {
        const { count } = await client
            .from('SITE_Tasks')
            .select('id', { count: 'exact', head: true })
            .neq('status', 'DONE');
        data.bia.openTasks = count ?? 0;
    } catch (e: any) {
        console.error('[agentsReport] bia.openTasks:', e?.message);
    }

    try {
        const { data: leads } = await client.from('SITE_Leads').select('status').limit(5000);
        const byStage: Record<string, number> = {};
        (leads || []).forEach((l: any) => {
            const s = l.status || 'New';
            byStage[s] = (byStage[s] || 0) + 1;
        });
        data.bia.leadsByStage = byStage;
    } catch (e: any) {
        console.error('[agentsReport] bia.leadsByStage:', e?.message);
    }

    // ── Rita: receita/despesa do mês + faturamento por curso ───────────────
    try {
        const { data: txs } = await client
            .from('SITE_Transactions')
            .select('amount, type, currency, course_id')
            .gte('date', monthStart);
        let income = 0;
        let expense = 0;
        const byCourseId = new Map<string, number>();
        (txs || []).forEach((t: any) => {
            if ((t.currency || 'BRL').toUpperCase() !== 'BRL') return;
            const amt = Number(t.amount || 0);
            if (t.type === 'Income') {
                income += amt;
                if (t.course_id) byCourseId.set(t.course_id, (byCourseId.get(t.course_id) || 0) + amt);
            } else if (t.type === 'Expense') {
                expense += amt;
            }
        });
        data.rita.incomeMonth = income;
        data.rita.expenseMonth = expense;

        if (byCourseId.size > 0) {
            const { data: courses } = await client
                .from('SITE_Courses')
                .select('id, title')
                .in('id', Array.from(byCourseId.keys()));
            const titleById = new Map((courses || []).map((c: any) => [c.id, c.title]));
            data.rita.byCourse = Array.from(byCourseId.entries())
                .map(([id, total]) => ({ course: titleById.get(id) || 'Curso sem título', total }))
                .sort((a, b) => b.total - a.total)
                .slice(0, 5);
        }
    } catch (e: any) {
        console.error('[agentsReport] rita.financeiro:', e?.message);
    }

    // ── Sofia: ranking de atividade por funcionário ─────────────────────────
    try {
        const [{ data: auditLogs }, { data: leads }, { data: enrollments }, { data: txs }] = await Promise.all([
            client.from('SITE_AuditLogs').select('user_name, created_at').gte('created_at', monthStart).limit(5000),
            client.from('SITE_Leads').select('assigned_to').gte('created_at', monthStart).not('assigned_to', 'is', null).limit(5000),
            client.from('SITE_Enrollments').select('enrolled_by_name').gte('created_at', monthStart).not('enrolled_by_name', 'is', null).limit(5000),
            client.from('SITE_Transactions').select('attendant_id').gte('date', monthStart).not('attendant_id', 'is', null).limit(5000),
        ]);

        const { data: users } = await client.from('SITE_Users').select('id, name');
        const nameById = new Map((users || []).map((u: any) => [u.id, u.name]));

        const stats = new Map<string, StaffActivity>();
        const bump = (name: string | null | undefined, field: keyof Omit<StaffActivity, 'userName' | 'lastSeen'>, when?: string) => {
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

        data.sofia.staffActivity = Array.from(stats.values()).sort(
            (a, b) => (b.auditActions + b.leadsAssigned + b.enrollmentsHandled + b.transactionsHandled) -
                      (a.auditActions + a.leadsAssigned + a.enrollmentsHandled + a.transactionsHandled)
        );
    } catch (e: any) {
        console.error('[agentsReport] sofia.staffActivity:', e?.message);
    }

    return data;
}

/** Monta o texto do relatório com uma seção por persona. */
export function buildAgentsReportText(d: AgentsReportData): string {
    const lines: string[] = [];
    lines.push('🤖 *Assistentes de IA W-Tech — Relatório do dia*');
    lines.push(`📅 ${d.base.dateLabel}`);
    lines.push('');

    // Léo
    lines.push('🧑‍💻 *Léo — Atendimento & Inscrições*');
    if (d.leo.leadsNotAttended !== null) lines.push(`  • Leads não atendidos: ${d.leo.leadsNotAttended}`);
    if (d.leo.pendingEnrollments !== null) lines.push(`  • Alunos pendentes (inscrição): ${d.leo.pendingEnrollments}`);
    if (d.leo.pendingBalance) {
        lines.push(`  • Saldo a pagar de alunos: R$ ${fmtMoney(d.leo.pendingBalance.total)} (${d.leo.pendingBalance.count})`);
    }
    lines.push('');

    // Bia
    lines.push('💬 *Bia — CRM & WhatsApp*');
    if (d.bia.inboundToday !== null) lines.push(`  • Mensagens recebidas hoje: ${d.bia.inboundToday}`);
    if (d.bia.openTasks !== null) lines.push(`  • Tarefas em aberto: ${d.bia.openTasks}`);
    const stageEntries = Object.entries(d.bia.leadsByStage);
    if (stageEntries.length > 0) {
        const parts = stageEntries.map(([stage, n]) => `${stage}: ${n}`);
        lines.push(`  • Funil de leads: ${parts.join(' · ')}`);
    }
    lines.push('');

    // Rita
    lines.push('💰 *Rita — Financeiro*');
    if (d.rita.incomeMonth !== null) lines.push(`  • Receita do mês: R$ ${fmtMoney(d.rita.incomeMonth)}`);
    if (d.rita.expenseMonth !== null) lines.push(`  • Custos do mês: R$ ${fmtMoney(d.rita.expenseMonth)}`);
    if (d.rita.byCourse.length > 0) {
        lines.push('  • Faturamento por curso:');
        d.rita.byCourse.forEach((c) => lines.push(`     - ${c.course}: R$ ${fmtMoney(c.total)}`));
    }
    lines.push('');

    // Sofia
    lines.push('👑 *Sofia — Gerência Geral*');
    if (d.base.salesToday.length > 0) {
        const parts = d.base.salesToday.map((s) => `${symbolOf(s.currency)} ${fmtMoney(s.total)} (${s.count})`);
        lines.push(`  • Vendas de hoje: ${parts.join(' + ')}`);
    }
    if (d.sofia.staffActivity.length > 0) {
        lines.push('  • Atividade por funcionário (mês):');
        d.sofia.staffActivity.slice(0, 8).forEach((s) => {
            const total = s.auditActions + s.leadsAssigned + s.enrollmentsHandled + s.transactionsHandled;
            lines.push(`     - ${s.userName}: ${total} ações (${s.auditActions} acessos, ${s.leadsAssigned} leads, ${s.enrollmentsHandled} matrículas, ${s.transactionsHandled} lançamentos)`);
        });
    } else {
        lines.push('  • Sem atividade registrada de funcionários neste mês.');
    }
    lines.push('');

    lines.push('_Enviado automaticamente pelos Assistentes de IA W-Tech._');
    return lines.join('\n');
}

/**
 * Versão "inteligente": o LLM reescreve o relatório na voz de cada persona,
 * usando os prompts editáveis do módulo (SITE_Config.ai_agent_prompt_*).
 * Best-effort: sem chave de IA / erro / timeout → cai no texto determinístico.
 */
async function buildAgentsReportTextSmart(data: AgentsReportData, supabase: SupabaseClient): Promise<string> {
    const fallback = buildAgentsReportText(data);
    try {
        const { data: rows } = await supabase
            .from('SITE_Config')
            .select('key, value')
            .in('key', AI_AGENTS.map((a) => a.promptKey));
        const map: Record<string, string> = {};
        (rows || []).forEach((r: any) => (map[r.key] = r.value));
        const personas = AI_AGENTS.map((a) => {
            const prompt = (map[a.promptKey] || '').trim() || DEFAULT_AGENT_PROMPTS[a.id as AIAgentId];
            return `### ${a.emoji} ${a.name} — ${a.role}\n${prompt}`;
        }).join('\n\n');

        const aiCfg = await loadAIConfig(supabase).catch(() => null);
        const keys = await loadAIKeys(supabase, aiCfg?.provider || null);

        const system = `Você escreve o relatório diário da equipe de Assistentes de IA da W-Tech Brasil para um grupo de WhatsApp da gestão.

${personas}

${AGENT_GUARDRAILS}

FORMATO DO RELATÓRIO (obrigatório):
- Título: "🤖 *Assistentes de IA W-Tech — Relatório do dia*" + linha com a data.
- Uma seção por integrante (emoji + *Nome — Cargo*), cada um relatando SEUS números na própria voz/persona, em bullets curtos ("  • ...").
- Use TODOS os números relevantes do JSON, EXATAMENTE como estão — não recalcule nem arredonde.
- Feche com a linha "_Enviado automaticamente pelos Assistentes de IA W-Tech._".
- Formato WhatsApp puro (sem markdown de cabeçalho #, sem tabelas).`;

        const user = `Dados do dia (JSON):\n${JSON.stringify(data)}`;
        const raw = await Promise.race([
            callLLM(keys, system, user, aiCfg?.model || null),
            new Promise<string>((_, reject) => setTimeout(() => reject(new Error('timeout LLM relatório')), 25000)),
        ]);
        const text = (raw || '').trim();
        // Sanidade mínima: precisa citar os 4 agentes; senão, determinístico.
        const mentionsAll = AI_AGENTS.every((a) => text.includes(a.name));
        return text && mentionsAll ? text : fallback;
    } catch (e: any) {
        console.error('[agentsReport] LLM indisponível, usando texto padrão:', e?.message);
        return fallback;
    }
}

/** Prévia do relatório (sem enviar). */
export async function previewAgentsReport(): Promise<{ text: string }> {
    const data = await gatherAgentsReport();
    const text = await buildAgentsReportTextSmart(data, getServiceClient());
    return { text };
}

/**
 * Gera e envia o relatório consolidado para o grupo do dono.
 * Mesmo guard de `sendSystemReport`: respeita wa_report_enabled (a menos que
 * force=true) e exige wa_report_group_jid configurado.
 */
export async function sendAgentsReport(opts: { force?: boolean } = {}): Promise<ReportSendResult> {
    const supabase = getServiceClient();

    const { data: cfgRows } = await supabase
        .from('SITE_Config')
        .select('key, value')
        .in('key', ['wa_report_enabled', 'wa_report_group_jid']);
    const cfg: Record<string, string> = {};
    (cfgRows || []).forEach((c: any) => (cfg[c.key] = c.value));

    if (!opts.force && cfg['wa_report_enabled'] !== 'true') {
        return { sent: false, skipped: 'relatório desativado (wa_report_enabled)' };
    }
    const groupJid = (cfg['wa_report_group_jid'] || '').trim();
    if (!groupJid) {
        return { sent: false, skipped: 'grupo do relatório não configurado (wa_report_group_jid)' };
    }

    const data = await gatherAgentsReport();
    const text = await buildAgentsReportTextSmart(data, supabase);

    const result = await sendTransactional({ to: groupJid, category: 'report', text });
    return { sent: result.sent, skipped: result.skipped, error: result.error, groupJid };
}
