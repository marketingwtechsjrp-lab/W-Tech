import React, { useEffect, useMemo, useState } from 'react';
import { GraduationCap, Loader2, Search, History, Users, Wallet, TrendingDown, TrendingUp, CheckCircle2, AlertCircle } from 'lucide-react';
import {
    listCourseOptions, getCourseInsights, normalizeSearch,
    type CourseOption, type CourseInsights, type CourseStudentRow,
} from '../../../lib/aiAgentsData';
import { PaymentHistoryModal } from '../Courses/PaymentHistoryModal';
import type { Enrollment } from '../../../types';

/**
 * Consulta por curso (dados REAIS do banco): escolha o curso e veja inscritos
 * por status, tabela vs negociado vs arrecadado, defasagem (desconto), saldo a
 * receber e a lista completa de alunos — pesquisável por nome (sem acento) e
 * com o histórico de pagamentos de cada um (entrada → parcelas → quitação).
 *
 * Mesma fonte e mesmos critérios que os Assistentes de IA usam para responder
 * no grupo do WhatsApp (SITE_Enrollments = verdade do dinheiro dos alunos).
 */

const symbolOf = (cur?: string) => {
    const c = (cur || 'BRL').toUpperCase();
    return c === 'EUR' ? '€' : c === 'USD' ? '$' : 'R$';
};

const fmtMoney = (n: number) =>
    Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const STATUS_LABEL: Record<string, string> = {
    Confirmed: 'Confirmada',
    CheckedIn: 'Check-in',
    Pending: 'Pendente',
};

const MoneyCard: React.FC<{ icon: React.ElementType; label: string; value: string; tone?: 'default' | 'warn' | 'good' }> = ({
    icon: Icon, label, value, tone = 'default',
}) => (
    <div className="bg-[var(--admin-surface-1)] border border-[var(--admin-border)] rounded-xl p-3 flex items-start gap-2.5">
        <div
            className={
                'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ' +
                (tone === 'warn' ? 'bg-red-500/10 text-red-500' : tone === 'good' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-wtech-gold/10 text-wtech-gold')
            }
        >
            <Icon size={15} />
        </div>
        <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--admin-text-secondary)] truncate">{label}</div>
            <div className="text-base font-black text-[var(--admin-text-primary)] leading-tight truncate">{value}</div>
        </div>
    </div>
);

const CourseInsightsPanel: React.FC = () => {
    const [courses, setCourses] = useState<CourseOption[]>([]);
    const [selectedId, setSelectedId] = useState('');
    const [insights, setInsights] = useState<CourseInsights | null>(null);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [onlyDebtors, setOnlyDebtors] = useState(false);
    const [historyOf, setHistoryOf] = useState<CourseStudentRow | null>(null);

    const selected = courses.find((c) => c.id === selectedId) || null;

    useEffect(() => {
        listCourseOptions().then(setCourses).catch(() => setCourses([]));
    }, []);

    useEffect(() => {
        if (!selected) { setInsights(null); return; }
        let cancelled = false;
        setLoading(true);
        setSearch('');
        setOnlyDebtors(false);
        getCourseInsights(selected)
            .then((i) => { if (!cancelled) setInsights(i); })
            .catch(() => { if (!cancelled) setInsights(null); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

    const filteredStudents = useMemo(() => {
        if (!insights) return [];
        const term = normalizeSearch(search.trim());
        return insights.alunos.filter((a) => {
            if (onlyDebtors && a.saldo <= 0.009) return false;
            if (term && !normalizeSearch(a.nome).includes(term)) return false;
            return true;
        });
    }, [insights, search, onlyDebtors]);

    const sym = symbolOf(insights?.currency);

    return (
        <div className="bg-[var(--admin-surface-2)] border border-[var(--admin-border)] rounded-xl p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs font-bold uppercase tracking-wider text-[var(--admin-text-secondary)] flex items-center gap-2">
                    <GraduationCap size={14} className="text-wtech-gold" /> Consulta por curso (dados reais do banco)
                </div>
                <select
                    value={selectedId}
                    onChange={(e) => setSelectedId(e.target.value)}
                    className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-1)] text-sm text-[var(--admin-text-primary)] p-2 max-w-full md:max-w-md"
                >
                    <option value="">Escolha o curso…</option>
                    {courses.map((c) => (
                        <option key={c.id} value={c.id}>
                            {c.title}{c.place ? ` — ${c.place}` : ''}{c.date ? ` (${c.date.split('-').reverse().join('/')})` : ''}
                        </option>
                    ))}
                </select>
            </div>

            {!selected && (
                <p className="text-sm text-[var(--admin-text-secondary)]">
                    Escolha um curso para ver inscritos, arrecadado, defasagem (desconto), saldo a receber e quem falta pagar — os mesmos números que a IA usa no grupo.
                </p>
            )}

            {loading && (
                <div className="flex items-center gap-2 text-sm text-[var(--admin-text-secondary)] py-6 justify-center">
                    <Loader2 size={16} className="animate-spin" /> Buscando dados reais do curso…
                </div>
            )}

            {selected && insights && !loading && (
                <>
                    {/* Cards financeiros reais */}
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2">
                        <MoneyCard
                            icon={Users}
                            label="Inscritos"
                            value={`${insights.inscritos.total}`}
                        />
                        <MoneyCard icon={Wallet} label={`Tabela (${sym})`} value={`${sym} ${fmtMoney(insights.tabelaTotal)}`} />
                        <MoneyCard icon={Wallet} label="Negociado" value={`${sym} ${fmtMoney(insights.negociadoTotal)}`} />
                        <MoneyCard icon={TrendingUp} label="Arrecadado" value={`${sym} ${fmtMoney(insights.arrecadadoTotal)}`} tone="good" />
                        <MoneyCard icon={TrendingDown} label="Defasagem (desconto)" value={`${sym} ${fmtMoney(insights.defasagemTotal)}`} tone={insights.defasagemTotal > 0 ? 'warn' : 'default'} />
                        <MoneyCard icon={AlertCircle} label="Saldo a receber" value={`${sym} ${fmtMoney(insights.saldoAReceber)}`} tone={insights.saldoAReceber > 0 ? 'warn' : 'good'} />
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--admin-text-secondary)]">
                        <span>✅ {insights.inscritos.confirmadas} confirmadas</span>
                        <span>🎫 {insights.inscritos.checkin} check-in</span>
                        <span>⏳ {insights.inscritos.pendentes} pendentes</span>
                        <span className="font-bold text-emerald-500">{insights.quitados} quitados</span>
                        <span className="font-bold text-red-500">{insights.devendo} ainda devendo</span>
                    </div>

                    {/* Busca de aluno dentro do curso */}
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="relative flex-1 min-w-[220px]">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--admin-text-secondary)]" />
                            <input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Buscar aluno pelo nome (ignora acento)…"
                                className="w-full rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-1)] text-sm text-[var(--admin-text-primary)] pl-9 pr-3 py-2 focus:outline-none focus:border-wtech-gold"
                            />
                        </div>
                        <label className="flex items-center gap-2 text-xs font-bold text-[var(--admin-text-secondary)] cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={onlyDebtors}
                                onChange={(e) => setOnlyDebtors(e.target.checked)}
                                className="accent-red-500"
                            />
                            Só quem falta pagar
                        </label>
                    </div>

                    {/* Lista de alunos */}
                    {filteredStudents.length === 0 ? (
                        <p className="text-sm text-[var(--admin-text-secondary)] py-2">
                            {insights.alunos.length === 0 ? 'Nenhuma inscrição neste curso ainda.' : 'Nenhum aluno encontrado com esse filtro.'}
                        </p>
                    ) : (
                        <div className="overflow-x-auto max-h-96 overflow-y-auto rounded-lg border border-[var(--admin-border)]">
                            <table className="w-full text-sm">
                                <thead className="sticky top-0 bg-[var(--admin-surface-1)]">
                                    <tr className="text-left text-[var(--admin-text-secondary)] text-[10px] uppercase tracking-wider">
                                        <th className="px-3 py-2">Aluno</th>
                                        <th className="px-3 py-2">Status</th>
                                        <th className="px-3 py-2">Negociado</th>
                                        <th className="px-3 py-2">Pago</th>
                                        <th className="px-3 py-2">Saldo</th>
                                        <th className="px-3 py-2"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredStudents.map((a) => {
                                        const s = symbolOf(a.currency);
                                        return (
                                            <tr key={a.enrollmentId} className="border-t border-[var(--admin-border)]">
                                                <td className="px-3 py-2 font-bold text-[var(--admin-text-primary)]">{a.nome}</td>
                                                <td className="px-3 py-2 text-[var(--admin-text-secondary)]">{STATUS_LABEL[a.status] || a.status}</td>
                                                <td className="px-3 py-2 text-[var(--admin-text-secondary)]">{s} {fmtMoney(a.negociado)}</td>
                                                <td className="px-3 py-2 text-emerald-600 dark:text-emerald-400 font-bold">{s} {fmtMoney(a.pago)}</td>
                                                <td className="px-3 py-2">
                                                    {a.quitado ? (
                                                        <span className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 font-bold text-xs">
                                                            <CheckCircle2 size={13} /> QUITADO
                                                        </span>
                                                    ) : a.saldo > 0.009 ? (
                                                        <span className="text-red-600 dark:text-red-400 font-bold">{s} {fmtMoney(a.saldo)}</span>
                                                    ) : (
                                                        <span className="text-[var(--admin-text-secondary)]">—</span>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2 text-right">
                                                    <button
                                                        onClick={() => setHistoryOf(a)}
                                                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[var(--admin-border)] text-[11px] font-bold text-[var(--admin-text-primary)] hover:bg-[var(--admin-surface-1)] hover:border-wtech-gold/60 transition-colors"
                                                        title="Histórico de pagamentos (entrada, parcelas e quitação)"
                                                    >
                                                        <History size={12} /> Histórico
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}

            {historyOf && selected && (
                <PaymentHistoryModal
                    enrollment={{
                        id: historyOf.enrollmentId,
                        courseId: selected.id,
                        studentName: historyOf.nome,
                        studentEmail: '',
                        studentPhone: '',
                        status: (historyOf.status as Enrollment['status']) || 'Pending',
                        amountPaid: historyOf.pago,
                        totalAmount: historyOf.negociado,
                        paymentMethod: historyOf.paymentMethod || undefined,
                        createdAt: historyOf.createdAt || '',
                    }}
                    courseTitle={selected.title}
                    coursePrice={selected.price}
                    currency={historyOf.currency}
                    onClose={() => setHistoryOf(null)}
                />
            )}
        </div>
    );
};

export default CourseInsightsPanel;
