import React, { useEffect, useState } from 'react';
import { Loader2, Users, Wallet, MessageCircle, ClipboardList, TrendingUp, TrendingDown, Crown, Brain, Save, RotateCcw } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import {
    getLeoStats, getBiaStats, getRitaStats, getSofiaStats,
    type LeoStats, type BiaStats, type RitaStats, type SofiaStats,
} from '../../../lib/aiAgentsData';
import { AI_AGENT_BY_ID, DEFAULT_AGENT_PROMPTS, type AIAgentId } from '../../../lib/aiAgentDefaults';
import CourseInsightsPanel from './CourseInsightsPanel';

export type AgentId = AIAgentId;

const fmtBRL = (n: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 }).format(n || 0);

const StatCard: React.FC<{ icon: React.ElementType; label: string; value: React.ReactNode; tone?: 'default' | 'warn' | 'good' }> = ({
    icon: Icon, label, value, tone = 'default',
}) => (
    <div className="bg-[var(--admin-surface-2)] border border-[var(--admin-border)] rounded-xl p-4 flex items-start gap-3">
        <div
            className={
                'w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ' +
                (tone === 'warn' ? 'bg-red-500/10 text-red-500' : tone === 'good' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-wtech-gold/10 text-wtech-gold')
            }
        >
            <Icon size={18} />
        </div>
        <div className="min-w-0">
            <div className="text-xs font-medium text-[var(--admin-text-secondary)] truncate">{label}</div>
            <div className="text-xl font-black text-[var(--admin-text-primary)] leading-tight">{value}</div>
        </div>
    </div>
);

const Loading = () => (
    <div className="flex items-center justify-center py-16 text-[var(--admin-text-secondary)] gap-2">
        <Loader2 className="animate-spin" size={18} />
        <span className="text-sm">Carregando dados reais...</span>
    </div>
);

const LeoPanel: React.FC = () => {
    const [stats, setStats] = useState<LeoStats | null>(null);
    useEffect(() => { getLeoStats().then(setStats).catch(() => setStats(null)); }, []);
    if (!stats) return <Loading />;
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <StatCard icon={Users} label="Leads não atendidos" value={stats.leadsNotAttended} tone={stats.leadsNotAttended > 0 ? 'warn' : 'good'} />
            <StatCard icon={ClipboardList} label="Alunos com inscrição pendente" value={stats.pendingEnrollments} tone={stats.pendingEnrollments > 0 ? 'warn' : 'good'} />
            <StatCard
                icon={Wallet}
                label="Saldo a pagar de alunos"
                value={`${fmtBRL(stats.pendingBalance.total)} (${stats.pendingBalance.count})`}
                tone={stats.pendingBalance.total > 0 ? 'warn' : 'good'}
            />
            <StatCard icon={TrendingUp} label="Novos leads no mês" value={stats.newLeadsThisMonth} tone="good" />
        </div>
    );
};

const BiaPanel: React.FC = () => {
    const [stats, setStats] = useState<BiaStats | null>(null);
    useEffect(() => { getBiaStats().then(setStats).catch(() => setStats(null)); }, []);
    if (!stats) return <Loading />;
    const stageEntries = Object.entries(stats.leadsByStage);
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <StatCard icon={MessageCircle} label="Mensagens recebidas hoje" value={stats.inboundToday} tone="good" />
                <StatCard icon={ClipboardList} label="Tarefas em aberto" value={stats.openTasks} tone={stats.openTasks > 0 ? 'warn' : 'good'} />
            </div>
            {stageEntries.length > 0 && (
                <div className="bg-[var(--admin-surface-2)] border border-[var(--admin-border)] rounded-xl p-4">
                    <div className="text-xs font-bold uppercase tracking-wider text-[var(--admin-text-secondary)] mb-3">
                        Funil de CRM
                    </div>
                    <div className="space-y-2">
                        {stageEntries.map(([stage, n]) => (
                            <div key={stage} className="flex items-center justify-between text-sm">
                                <span className="text-[var(--admin-text-primary)] font-medium">{stage}</span>
                                <span className="text-[var(--admin-text-secondary)] font-bold">{n}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const RitaPanel: React.FC = () => {
    const [stats, setStats] = useState<RitaStats | null>(null);
    useEffect(() => { getRitaStats().then(setStats).catch(() => setStats(null)); }, []);
    if (!stats) return <Loading />;
    const saldo = stats.incomeMonth - stats.expenseMonth;
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard icon={TrendingUp} label="Arrecadado dos alunos (total)" value={fmtBRL(stats.arrecadadoTotal)} tone="good" />
                <StatCard icon={Wallet} label="Negociado com alunos (total)" value={fmtBRL(stats.negociadoTotal)} />
                <StatCard icon={Wallet} label="Saldo a receber de alunos" value={fmtBRL(stats.saldoAReceber)} tone={stats.saldoAReceber > 0 ? 'warn' : 'good'} />
                <StatCard icon={TrendingUp} label="Receita do mês (lançamentos)" value={fmtBRL(stats.incomeMonth)} tone="good" />
                <StatCard icon={TrendingDown} label="Custos do mês" value={fmtBRL(stats.expenseMonth)} tone={stats.expenseMonth > 0 ? 'warn' : 'good'} />
                <StatCard icon={Wallet} label="Saldo do mês" value={fmtBRL(saldo)} tone={saldo >= 0 ? 'good' : 'warn'} />
            </div>
            {stats.byCourse.length > 0 && (
                <div className="bg-[var(--admin-surface-2)] border border-[var(--admin-border)] rounded-xl p-4">
                    <div className="text-xs font-bold uppercase tracking-wider text-[var(--admin-text-secondary)] mb-3">
                        Faturamento por curso (mês)
                    </div>
                    <div className="space-y-2">
                        {stats.byCourse.map((c) => (
                            <div key={c.course} className="flex items-center justify-between text-sm">
                                <span className="text-[var(--admin-text-primary)] font-medium truncate pr-2">{c.course}</span>
                                <span className="text-[var(--admin-text-secondary)] font-bold shrink-0">{fmtBRL(c.total)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const SofiaPanel: React.FC = () => {
    const [stats, setStats] = useState<SofiaStats | null>(null);
    useEffect(() => { getSofiaStats().then(setStats).catch(() => setStats(null)); }, []);
    if (!stats) return <Loading />;
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <StatCard icon={Users} label="Leads (total)" value={stats.leadsTotal} />
                <StatCard
                    icon={ClipboardList}
                    label="Alunos inscritos (confirmados + check-in)"
                    value={
                        <>
                            {stats.studentsEnrolled}
                            <span className="block text-[11px] font-medium text-[var(--admin-text-secondary)]">
                                {stats.enrollmentsByStatus.confirmadas} confirmadas · {stats.enrollmentsByStatus.checkin} check-in · {stats.enrollmentsByStatus.pendentes} pendentes
                            </span>
                        </>
                    }
                />
                <StatCard icon={Wallet} label="Arrecadado dos alunos (total)" value={fmtBRL(stats.arrecadadoTotal)} tone="good" />
                <StatCard icon={Wallet} label="Receita do mês (lançamentos)" value={fmtBRL(stats.incomeMonth)} />
            </div>
            <div className="bg-[var(--admin-surface-2)] border border-[var(--admin-border)] rounded-xl p-4">
                <div className="text-xs font-bold uppercase tracking-wider text-[var(--admin-text-secondary)] mb-3 flex items-center gap-2">
                    <Crown size={14} className="text-wtech-gold" /> Atividade por funcionário (mês)
                </div>
                {stats.staffActivity.length === 0 ? (
                    <p className="text-sm text-[var(--admin-text-secondary)]">Sem atividade registrada neste mês.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-[var(--admin-text-secondary)] text-xs uppercase tracking-wider">
                                    <th className="pb-2 pr-4">Funcionário</th>
                                    <th className="pb-2 pr-4">Acessos</th>
                                    <th className="pb-2 pr-4">Leads</th>
                                    <th className="pb-2 pr-4">Matrículas</th>
                                    <th className="pb-2 pr-4">Lançamentos</th>
                                    <th className="pb-2">Último acesso</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.staffActivity.map((s) => (
                                    <tr key={s.userName} className="border-t border-[var(--admin-border)]">
                                        <td className="py-2 pr-4 font-bold text-[var(--admin-text-primary)]">{s.userName}</td>
                                        <td className="py-2 pr-4 text-[var(--admin-text-secondary)]">{s.auditActions}</td>
                                        <td className="py-2 pr-4 text-[var(--admin-text-secondary)]">{s.leadsAssigned}</td>
                                        <td className="py-2 pr-4 text-[var(--admin-text-secondary)]">{s.enrollmentsHandled}</td>
                                        <td className="py-2 pr-4 text-[var(--admin-text-secondary)]">{s.transactionsHandled}</td>
                                        <td className="py-2 text-[var(--admin-text-secondary)]">
                                            {s.lastSeen ? new Date(s.lastSeen).toLocaleString('pt-BR') : '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

/**
 * Editor do prompt do agente ("cérebro"): o texto salvo em
 * SITE_Config.ai_agent_prompt_<id> muda como o agente responde no grupo do
 * WhatsApp e como escreve a parte dele no relatório diário.
 */
const PromptEditor: React.FC<{ agent: AgentId }> = ({ agent }) => {
    const meta = AI_AGENT_BY_ID[agent];
    const [prompt, setPrompt] = useState('');
    const [loaded, setLoaded] = useState(false);
    const [saving, setSaving] = useState(false);
    const [savedAt, setSavedAt] = useState<number | null>(null);

    useEffect(() => {
        setLoaded(false);
        setSavedAt(null);
        supabase
            .from('SITE_Config')
            .select('value')
            .eq('key', meta.promptKey)
            .maybeSingle()
            .then(({ data }) => {
                setPrompt(data?.value || '');
                setLoaded(true);
            });
    }, [agent, meta.promptKey]);

    const save = async (value: string) => {
        setSaving(true);
        try {
            const { error } = await supabase
                .from('SITE_Config')
                .upsert({ key: meta.promptKey, value }, { onConflict: 'key' });
            if (error) throw error;
            setPrompt(value);
            setSavedAt(Date.now());
        } catch (e: any) {
            alert('Erro ao salvar o prompt: ' + e.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="bg-[var(--admin-surface-2)] border border-[var(--admin-border)] rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-bold uppercase tracking-wider text-[var(--admin-text-secondary)] flex items-center gap-2">
                    <Brain size={14} className="text-wtech-gold" /> Cérebro d{agent === 'leo' ? 'o' : 'a'} {meta.name}
                </div>
                {savedAt && <span className="text-[10px] font-bold text-emerald-500">Salvo ✓</span>}
            </div>
            <p className="text-xs text-[var(--admin-text-secondary)] mb-3">
                Este prompt define a persona, o tom e as prioridades — vale para as respostas no grupo do WhatsApp e para o relatório diário. Vazio = usa o padrão abaixo.
            </p>
            {!loaded ? (
                <div className="flex items-center gap-2 text-[var(--admin-text-secondary)] text-sm py-4">
                    <Loader2 className="animate-spin" size={14} /> Carregando prompt...
                </div>
            ) : (
                <>
                    <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder={DEFAULT_AGENT_PROMPTS[agent]}
                        rows={7}
                        className="w-full rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-1)] text-[var(--admin-text-primary)] text-sm p-3 font-mono focus:outline-none focus:border-wtech-gold resize-y"
                    />
                    <div className="flex items-center gap-2 mt-3">
                        <button
                            onClick={() => save(prompt)}
                            disabled={saving}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-wtech-gold to-yellow-600 text-black font-bold text-xs shadow hover:scale-105 transition-transform disabled:opacity-50"
                        >
                            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                            Salvar prompt
                        </button>
                        <button
                            onClick={() => {
                                if (confirm(`Restaurar o prompt padrão de ${meta.name}? O texto editado será apagado.`)) save('');
                            }}
                            disabled={saving}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--admin-border)] text-[var(--admin-text-secondary)] font-bold text-xs hover:bg-[var(--admin-surface-1)] transition-colors disabled:opacity-50"
                        >
                            <RotateCcw size={14} /> Restaurar padrão
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};

const AgentWorkspace: React.FC<{ agent: AgentId }> = ({ agent }) => {
    return (
        <div className="space-y-4">
            {agent === 'leo' && <LeoPanel />}
            {agent === 'bia' && <BiaPanel />}
            {agent === 'rita' && <RitaPanel />}
            {agent === 'sofia' && <SofiaPanel />}
            {/* Filtro por curso com dados reais (mesma fonte que a IA usa no grupo) */}
            {agent !== 'bia' && <CourseInsightsPanel />}
            <PromptEditor agent={agent} />
        </div>
    );
};

export default AgentWorkspace;
