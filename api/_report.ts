import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { sendTransactional } from './_waDispatch.js';

/**
 * Relatório diário do sistema para o dono (grupo WhatsApp).
 * Arquivo com prefixo "_" — helper compartilhado (não vira rota na Vercel).
 *
 * Padrão portado da skill whatsapp-evolution (systemReports.ts do MotoFix):
 *   gatherSystemReport() → métricas agregadas do dia (Supabase)
 *   buildReportText()    → texto formatado para WhatsApp
 *   sendSystemReport()   → envia via categoria 'report' do dispatcher
 *                          (motor/instância configurados em Admin → Integrações)
 *
 * Config em SITE_Config:
 *   wa_report_enabled     'true' | 'false'  — toggle do envio automático
 *   wa_report_group_jid   JID do grupo (…@g.us) escolhido no painel
 *   wa_report_group_name  nome do grupo (só exibição)
 *
 * Best-effort: cada métrica falha isolada (try/catch por bloco) — uma tabela
 * indisponível não derruba o relatório inteiro.
 */

const TZ_OFFSET_MS = 3 * 60 * 60 * 1000; // America/Sao_Paulo = UTC-3 (sem horário de verão)

export interface SystemReportData {
    dateLabel: string;
    leadsToday: number | null;
    leadsPaid: number | null;      // com utm_source (tráfego pago/rastreado)
    enrollmentsToday: number | null;
    confirmedToday: number | null;
    salesToday: Array<{ currency: string; total: number; count: number }>;
    pendingBalance: { total: number; count: number } | null; // BRL
    campaignsRunning: number | null;
    campaignQueuePending: number | null;
    inboundMessagesToday: number | null;
}

export interface ReportSendResult {
    sent: boolean;
    skipped?: string;
    error?: string;
    groupJid?: string;
}

export function getServiceClient(): SupabaseClient {
    const url = process.env.VITE_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) throw new Error('Supabase env vars ausentes');
    return createClient(url, serviceKey);
}

/** Início do dia atual em America/Sao_Paulo, como ISO UTC (para filtros created_at). */
export function startOfTodayBRT(): { iso: string; label: string } {
    const nowBRT = new Date(Date.now() - TZ_OFFSET_MS);
    const y = nowBRT.getUTCFullYear();
    const m = nowBRT.getUTCMonth();
    const d = nowBRT.getUTCDate();
    const startUTC = new Date(Date.UTC(y, m, d) + TZ_OFFSET_MS);
    const label = `${String(d).padStart(2, '0')}/${String(m + 1).padStart(2, '0')}/${y}`;
    return { iso: startUTC.toISOString(), label };
}

export const fmtMoney = (n: number) =>
    Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const symbolOf = (cur: string) => {
    const c = (cur || 'BRL').toUpperCase();
    return c === 'EUR' ? '€' : c === 'USD' ? '$' : 'R$';
};

/** Coleta as métricas do dia. Cada bloco falha isolado (métrica vira null). */
export async function gatherSystemReport(supabase?: SupabaseClient): Promise<SystemReportData> {
    const client = supabase || getServiceClient();
    const { iso: dayStart, label } = startOfTodayBRT();

    const data: SystemReportData = {
        dateLabel: label,
        leadsToday: null,
        leadsPaid: null,
        enrollmentsToday: null,
        confirmedToday: null,
        salesToday: [],
        pendingBalance: null,
        campaignsRunning: null,
        campaignQueuePending: null,
        inboundMessagesToday: null,
    };

    // Leads criados hoje
    try {
        const { count } = await client
            .from('SITE_Leads')
            .select('id', { count: 'exact', head: true })
            .gte('created_at', dayStart);
        data.leadsToday = count ?? 0;
    } catch (e: any) {
        console.error('[report] leads:', e?.message);
    }

    // Leads de tráfego rastreado (colunas utm_* podem não existir — falha isolada)
    try {
        const { count, error } = await client
            .from('SITE_Leads')
            .select('id', { count: 'exact', head: true })
            .gte('created_at', dayStart)
            .not('utm_source', 'is', null);
        if (!error) data.leadsPaid = count ?? 0;
    } catch {
        /* migração de UTM ainda não aplicada — omite a linha */
    }

    // Inscrições de hoje (novas e confirmadas)
    try {
        const { count: created } = await client
            .from('SITE_Enrollments')
            .select('id', { count: 'exact', head: true })
            .gte('created_at', dayStart);
        data.enrollmentsToday = created ?? 0;

        const { count: confirmed } = await client
            .from('SITE_Enrollments')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'Confirmed')
            .gte('created_at', dayStart);
        data.confirmedToday = confirmed ?? 0;
    } catch (e: any) {
        console.error('[report] enrollments:', e?.message);
    }

    // Vendas de hoje (SITE_Transactions Income), agrupadas por moeda
    try {
        const { data: txs } = await client
            .from('SITE_Transactions')
            .select('amount, currency')
            .eq('type', 'Income')
            .gte('date', dayStart);
        const byCur = new Map<string, { total: number; count: number }>();
        (txs || []).forEach((t: any) => {
            const cur = (t.currency || 'BRL').toUpperCase();
            const acc = byCur.get(cur) || { total: 0, count: 0 };
            acc.total += Number(t.amount || 0);
            acc.count += 1;
            byCur.set(cur, acc);
        });
        data.salesToday = Array.from(byCur.entries()).map(([currency, v]) => ({ currency, ...v }));
    } catch (e: any) {
        console.error('[report] sales:', e?.message);
    }

    // Saldo a receber (inscrições confirmadas com pagamento parcial, BRL)
    try {
        const { data: enrs } = await client
            .from('SITE_Enrollments')
            .select('amount_paid, total_amount, currency')
            .eq('status', 'Confirmed')
            .gt('total_amount', 0)
            .limit(1000);
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
        data.pendingBalance = { total, count };
    } catch (e: any) {
        console.error('[report] pending balance:', e?.message);
    }

    // Campanhas em andamento + fila pendente
    try {
        const { count: running } = await client
            .from('SITE_MarketingCampaigns')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'Processing');
        data.campaignsRunning = running ?? 0;

        const { count: pending } = await client
            .from('SITE_CampaignQueue')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'Pending');
        data.campaignQueuePending = pending ?? 0;
    } catch (e: any) {
        console.error('[report] campaigns:', e?.message);
    }

    // Atendimento: mensagens recebidas hoje no WhatsApp oficial
    try {
        const { count } = await client
            .from('SITE_WhatsAppCloudMessages')
            .select('id', { count: 'exact', head: true })
            .eq('direction', 'in')
            .gte('timestamp', dayStart);
        data.inboundMessagesToday = count ?? 0;
    } catch (e: any) {
        console.error('[report] inbound messages:', e?.message);
    }

    return data;
}

/** Monta o texto do relatório no formato legível do WhatsApp. */
export function buildReportText(d: SystemReportData): string {
    const lines: string[] = [];
    lines.push('🤖 *Relatório diário — W-Tech Brasil*');
    lines.push(`📅 ${d.dateLabel}`);
    lines.push('');

    if (d.leadsToday !== null) {
        lines.push('📈 *Leads*');
        lines.push(`  • Novos hoje: ${d.leadsToday}`);
        if (d.leadsPaid !== null && d.leadsToday > 0) {
            lines.push(`  • De tráfego rastreado (UTM): ${d.leadsPaid}`);
        }
        lines.push('');
    }

    if (d.enrollmentsToday !== null) {
        lines.push('🎓 *Inscrições*');
        lines.push(`  • Novas hoje: ${d.enrollmentsToday}`);
        lines.push(`  • Confirmadas (pagas) hoje: ${d.confirmedToday ?? 0}`);
        lines.push('');
    }

    if (d.salesToday.length > 0) {
        const parts = d.salesToday.map(
            (s) => `${symbolOf(s.currency)} ${fmtMoney(s.total)} (${s.count} pgto${s.count === 1 ? '' : 's'})`
        );
        lines.push(`💰 *Vendas de hoje:* ${parts.join(' + ')}`);
        lines.push('');
    } else {
        lines.push('💰 *Vendas de hoje:* nenhum pagamento registrado');
        lines.push('');
    }

    if (d.pendingBalance) {
        lines.push(
            `⏳ *Saldo a receber (alunos):* R$ ${fmtMoney(d.pendingBalance.total)} em ${d.pendingBalance.count} inscrição${d.pendingBalance.count === 1 ? '' : 'ões'}`
        );
        lines.push('');
    }

    if (d.campaignsRunning !== null) {
        lines.push('📣 *Campanhas*');
        lines.push(`  • Em andamento: ${d.campaignsRunning}`);
        lines.push(`  • Fila pendente: ${d.campaignQueuePending ?? 0}`);
        lines.push('');
    }

    if (d.inboundMessagesToday !== null) {
        lines.push('💬 *Atendimento (WhatsApp oficial)*');
        lines.push(`  • Mensagens recebidas hoje: ${d.inboundMessagesToday}`);
        lines.push('');
    }

    lines.push('_Enviado automaticamente pelo sistema W-Tech._');
    return lines.join('\n');
}

/** Prévia do relatório (sem enviar). */
export async function previewSystemReport(): Promise<{ text: string }> {
    const data = await gatherSystemReport();
    return { text: buildReportText(data) };
}

/**
 * Gera e envia o relatório para o grupo do dono.
 * `force: true` ignora o toggle wa_report_enabled (botão "Enviar teste agora"),
 * mas ainda exige grupo configurado.
 */
export async function sendSystemReport(opts: { force?: boolean } = {}): Promise<ReportSendResult> {
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

    const data = await gatherSystemReport(supabase);
    const text = buildReportText(data);

    const result = await sendTransactional({ to: groupJid, category: 'report', text });
    return { sent: result.sent, skipped: result.skipped, error: result.error, groupJid };
}
