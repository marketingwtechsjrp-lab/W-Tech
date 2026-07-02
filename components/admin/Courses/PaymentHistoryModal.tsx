import React, { useState, useEffect } from 'react';
import { History, X, Loader2, CheckCircle2, CircleDollarSign, FileText, AlertTriangle } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import type { Enrollment } from '../../../types';

/**
 * Histórico de Pagamentos da inscrição (botão "Histórico" na lista de alunos
 * do curso). Mostra o resumo financeiro e a linha do tempo: inscrição criada →
 * entrada → pagamentos parciais → quitação, cada um com data e forma de
 * pagamento, a partir de SITE_Transactions.enrollment_id.
 *
 * Fidelidade acima de tudo: pagamentos antigos sem transação vinculada (antes
 * da migração add_enrollment_payment_history.sql) aparecem como um item
 * "registrado na inscrição" com a diferença exata — nada é inventado.
 */

type Props = {
    enrollment: Enrollment;
    courseTitle: string;
    coursePrice?: number;
    currency?: string;
    onClose: () => void;
};

interface PaymentTx {
    id: string;
    date: string | null;
    amount: number;
    payment_method: string | null;
    description: string | null;
}

interface TimelineItem {
    label: string;
    date: string | null;
    dateNote?: string;
    amount: number;
    method: string | null;
    description?: string | null;
    isSettlement: boolean;
}

const symbolOf = (cur?: string) => {
    const c = (cur || 'BRL').toUpperCase();
    return c === 'EUR' ? '€' : c === 'USD' ? '$' : 'R$';
};

const fmtMoney = (n: number) =>
    Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (iso?: string | null) => {
    if (!iso) return null;
    const d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

export function PaymentHistoryModal({ enrollment, courseTitle, coursePrice, currency, onClose }: Props) {
    const [isLoading, setIsLoading] = useState(true);
    const [transactions, setTransactions] = useState<PaymentTx[]>([]);
    const [isColumnMissing, setIsColumnMissing] = useState(false);

    const sym = symbolOf(currency);
    const total = enrollment.totalAmount ?? coursePrice ?? 0;
    const paid = enrollment.amountPaid || 0;
    const balance = Math.max(0, total - paid);

    useEffect(() => {
        let cancelled = false;
        const fetchHistory = async () => {
            setIsLoading(true);
            const { data, error } = await supabase
                .from('SITE_Transactions')
                .select('id, date, amount, type, payment_method, description')
                .eq('enrollment_id', enrollment.id)
                .eq('type', 'Income')
                .order('date', { ascending: true });
            if (cancelled) return;
            if (error) {
                // Coluna enrollment_id ainda não existe (migração pendente)
                if (String(error.message || '').includes('enrollment_id')) setIsColumnMissing(true);
                else console.error('[Histórico] Erro ao buscar transações:', error);
                setTransactions([]);
            } else {
                setTransactions((data || []).map((t: any) => ({
                    id: t.id,
                    date: t.date || null,
                    amount: Number(t.amount || 0),
                    payment_method: t.payment_method || null,
                    description: t.description || null,
                })));
            }
            setIsLoading(false);
        };
        fetchHistory();
        return () => { cancelled = true; };
    }, [enrollment.id]);

    // ── Linha do tempo: entrada → parciais → quitação ────────────────────────
    const trackedSum = transactions.reduce((acc, t) => acc + t.amount, 0);
    const untracked = paid - trackedSum;

    const payments: TimelineItem[] = [];
    // Pagamento(s) antigos sem transação vinculada — mostra a diferença exata.
    if (untracked > 0.009) {
        payments.push({
            label: '',
            date: enrollment.createdAt || null,
            dateNote: 'registrado na inscrição (sem transação detalhada)',
            amount: untracked,
            method: enrollment.paymentMethod || null,
            isSettlement: false,
        });
    }
    transactions.forEach((t) => {
        payments.push({
            label: '',
            date: t.date,
            amount: t.amount,
            method: t.payment_method,
            description: t.description,
            isSettlement: false,
        });
    });

    // Rótulos: primeiro = Entrada; o que zera o saldo = Quitação; resto = Parcial.
    let cumulative = 0;
    payments.forEach((p, idx) => {
        cumulative += p.amount;
        const settles = total > 0 && cumulative >= total - 0.009;
        p.isSettlement = settles;
        if (settles && idx === 0) p.label = 'Pagamento integral';
        else if (settles) p.label = 'Quitação (pagamento final)';
        else if (idx === 0) p.label = 'Entrada';
        else p.label = 'Pagamento parcial';
    });

    const entrada = payments[0] || null;
    const quitacao = payments.length > 0 && payments[payments.length - 1].isSettlement
        ? payments[payments.length - 1]
        : null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[var(--admin-surface-1)] w-full max-w-lg rounded-2xl shadow-2xl p-8 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
                <div className="flex items-start justify-between mb-1">
                    <div className="flex items-center gap-2">
                        <History size={22} className="text-wtech-gold" />
                        <h3 className="text-2xl font-black text-[var(--admin-text-primary)]">Histórico de Pagamentos</h3>
                    </div>
                    <button onClick={onClose} className="p-1.5 -mr-2 -mt-1 hover:bg-[var(--admin-surface-3)] rounded-lg text-[var(--admin-text-secondary)] hover:text-red-500 transition-colors">
                        <X size={18} />
                    </button>
                </div>
                <p className="text-[var(--admin-text-secondary)] text-sm mb-5">
                    <span className="font-bold text-[var(--admin-text-primary)]">{enrollment.studentName}</span> — {courseTitle}
                </p>

                {/* Resumo financeiro */}
                <div className="grid grid-cols-3 gap-2 mb-6">
                    <div className="bg-[var(--admin-surface-2)] border border-[var(--admin-border)] rounded-lg px-3 py-2.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--admin-text-tertiary)]">Total negociado</span>
                        <p className="font-black text-[var(--admin-text-primary)]">{sym} {fmtMoney(total)}</p>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg px-3 py-2.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-green-700 dark:text-green-400">Pago</span>
                        <p className="font-black text-green-700 dark:text-green-400">{sym} {fmtMoney(paid)}</p>
                    </div>
                    {balance > 0.009 ? (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-red-700 dark:text-red-400">Restante</span>
                            <p className="font-black text-red-700 dark:text-red-400">{sym} {fmtMoney(balance)}</p>
                        </div>
                    ) : (
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg px-3 py-2.5 flex flex-col justify-center">
                            <p className="font-black text-blue-700 dark:text-blue-400 flex items-center gap-1"><CheckCircle2 size={15} /> QUITADO</p>
                        </div>
                    )}
                </div>

                {/* Entrada e quitação em destaque */}
                {(entrada || quitacao) && !isLoading && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-6">
                        {entrada && (
                            <div className="border border-[var(--admin-border)] rounded-lg px-3 py-2 bg-[var(--admin-surface-2)]">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--admin-text-tertiary)]">Entrada</span>
                                <p className="text-sm font-bold text-[var(--admin-text-primary)]">{sym} {fmtMoney(entrada.amount)} · {entrada.method || 'forma não registrada'}</p>
                                <p className="text-[11px] text-[var(--admin-text-secondary)]">{fmtDate(entrada.date) || 'data não registrada'}</p>
                            </div>
                        )}
                        {quitacao && quitacao !== entrada && (
                            <div className="border border-blue-200 dark:border-blue-800 rounded-lg px-3 py-2 bg-blue-50 dark:bg-blue-900/20">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">Pagamento final</span>
                                <p className="text-sm font-bold text-[var(--admin-text-primary)]">{sym} {fmtMoney(quitacao.amount)} · {quitacao.method || 'forma não registrada'}</p>
                                <p className="text-[11px] text-[var(--admin-text-secondary)]">{fmtDate(quitacao.date) || 'data não registrada'}</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Linha do tempo */}
                <label className="block text-xs font-black uppercase text-[var(--admin-text-tertiary)] mb-3 tracking-widest">Linha do tempo</label>
                {isLoading ? (
                    <p className="flex items-center gap-2 text-sm text-[var(--admin-text-secondary)] py-4">
                        <Loader2 size={15} className="animate-spin" /> Buscando pagamentos…
                    </p>
                ) : (
                    <div className="space-y-0">
                        {/* Inscrição criada */}
                        <div className="flex gap-3 pb-4 relative">
                            <div className="flex flex-col items-center">
                                <div className="w-8 h-8 rounded-full bg-[var(--admin-surface-2)] border border-[var(--admin-border)] flex items-center justify-center shrink-0">
                                    <FileText size={14} className="text-[var(--admin-text-secondary)]" />
                                </div>
                                {payments.length > 0 && <div className="w-px flex-1 bg-[var(--admin-border)]" />}
                            </div>
                            <div className="pb-1">
                                <p className="text-sm font-bold text-[var(--admin-text-primary)]">Inscrição criada</p>
                                <p className="text-[11px] text-[var(--admin-text-secondary)]">
                                    {fmtDate(enrollment.createdAt) || 'data não registrada'}
                                    {enrollment.paymentMethod ? ` · forma prevista: ${enrollment.paymentMethod}` : ''}
                                </p>
                                <p className="text-[11px] text-[var(--admin-text-tertiary)]">Valor negociado: {sym} {fmtMoney(total)}</p>
                            </div>
                        </div>

                        {payments.map((p, idx) => (
                            <div key={idx} className="flex gap-3 pb-4 relative">
                                <div className="flex flex-col items-center">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${p.isSettlement ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700' : 'bg-green-50 dark:bg-green-900/30 border-green-300 dark:border-green-700'}`}>
                                        {p.isSettlement
                                            ? <CheckCircle2 size={14} className="text-blue-600 dark:text-blue-400" />
                                            : <CircleDollarSign size={14} className="text-green-600 dark:text-green-400" />}
                                    </div>
                                    {idx < payments.length - 1 && <div className="w-px flex-1 bg-[var(--admin-border)]" />}
                                </div>
                                <div className="pb-1">
                                    <p className="text-sm font-bold text-[var(--admin-text-primary)]">
                                        {p.label} — <span className={p.isSettlement ? 'text-blue-600 dark:text-blue-400' : 'text-green-700 dark:text-green-400'}>{sym} {fmtMoney(p.amount)}</span>
                                    </p>
                                    <p className="text-[11px] text-[var(--admin-text-secondary)]">
                                        {p.dateNote ? `${fmtDate(p.date) || ''} · ${p.dateNote}` : (fmtDate(p.date) || 'data não registrada')}
                                        {p.method ? ` · ${p.method}` : ' · forma não registrada'}
                                    </p>
                                    {p.description && <p className="text-[11px] text-[var(--admin-text-tertiary)]">{p.description}</p>}
                                </div>
                            </div>
                        ))}

                        {payments.length === 0 && (
                            <p className="text-sm text-[var(--admin-text-secondary)] py-2">Nenhum pagamento registrado até agora.</p>
                        )}
                    </div>
                )}

                {isColumnMissing && (
                    <p className="flex items-start gap-2 text-[11px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2 mt-4 leading-relaxed">
                        <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                        <span>O detalhamento por transação será ativado após rodar a migração <code>add_enrollment_payment_history.sql</code> no Supabase. Por enquanto o histórico mostra o consolidado da inscrição.</span>
                    </p>
                )}

                <button onClick={onClose} className="w-full mt-6 py-3 border border-[var(--admin-border)] rounded-lg font-bold text-[var(--admin-text-secondary)] hover:bg-[var(--admin-surface-2)] transition-colors">
                    Fechar
                </button>
            </div>
        </div>
    );
}
