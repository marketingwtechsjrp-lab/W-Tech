import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { Filter, Download, ArrowUpCircle, ArrowDownCircle, Wallet, Calendar, User } from 'lucide-react';

const CashFlowView = () => {
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState<any[]>([]);

    const [attendantFilter, setAttendantFilter] = useState('');
    const [dateFilter, setDateFilter] = useState('30_days');

    useEffect(() => {
        fetchUsers();
        fetchTransactions();
    }, [attendantFilter, dateFilter]);

    const fetchUsers = async () => {
        const { data } = await supabase.from('profiles').select('id, name');
        if (data) setUsers(data);
    };

    const fetchTransactions = async () => {
        setLoading(true);
        let query = supabase
            .from('SITE_Transactions')
            .select('*')
            .order('created_at', { ascending: false });

        if (attendantFilter) query = query.eq('attendant_id', attendantFilter);

        const now = new Date();
        if (dateFilter === '30_days') {
            const date = new Date();
            date.setDate(date.getDate() - 30);
            query = query.gte('created_at', date.toISOString());
        } else if (dateFilter === 'this_month') {
            const startStats = new Date(now.getFullYear(), now.getMonth(), 1);
            query = query.gte('created_at', startStats.toISOString());
        }

        const { data } = await query;
        if (data) setTransactions(data);
        setLoading(false);
    };

    const totalsByCurrency = transactions.reduce((acc, curr) => {
        const currency = curr.currency || 'BRL';
        if (!acc[currency]) acc[currency] = { income: 0, expense: 0 };
        if (curr.type === 'income') acc[currency].income += (curr.amount || 0);
        else acc[currency].expense += (curr.amount || 0);
        return acc;
    }, {} as Record<string, { income: number; expense: number }>);

    const formatValue = (val: number, cur: string) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: cur, minimumFractionDigits: 2 }).format(val);

    const mainBRL = totalsByCurrency['BRL'] || { income: 0, expense: 0 };

    return (
        <div className="p-6 space-y-6 pb-20">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-black text-[var(--admin-text-primary)] tracking-tight flex items-center gap-3">
                    <Wallet className="text-wtech-gold" size={28} />
                    Fluxo de Caixa
                </h2>
                <p className="text-[var(--admin-text-secondary)] font-medium mt-1 text-sm">
                    Gestão financeira e relatórios de vendas.
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-[var(--admin-surface-1)] p-5 rounded-2xl border border-[var(--admin-border)]">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="bg-emerald-500/10 text-emerald-500 p-2 rounded-xl">
                            <ArrowUpCircle size={22} />
                        </div>
                        <p className="text-xs font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider">Entradas</p>
                    </div>
                    <h3 className="text-2xl font-black text-[var(--admin-text-primary)]">
                        {formatValue(mainBRL.income, 'BRL')}
                    </h3>
                    {Object.keys(totalsByCurrency).filter(c => c !== 'BRL').map(c => (
                        <p key={c} className="text-xs font-bold text-emerald-500 mt-1">
                            + {formatValue(totalsByCurrency[c].income, c)}
                        </p>
                    ))}
                </div>

                <div className="bg-[var(--admin-surface-1)] p-5 rounded-2xl border border-[var(--admin-border)]">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="bg-red-500/10 text-red-500 p-2 rounded-xl">
                            <ArrowDownCircle size={22} />
                        </div>
                        <p className="text-xs font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider">Saídas</p>
                    </div>
                    <h3 className="text-2xl font-black text-[var(--admin-text-primary)]">
                        {formatValue(mainBRL.expense, 'BRL')}
                    </h3>
                    {Object.keys(totalsByCurrency).filter(c => c !== 'BRL').map(c => (
                        <p key={c} className="text-xs font-bold text-red-500 mt-1">
                            - {formatValue(totalsByCurrency[c].expense, c)}
                        </p>
                    ))}
                </div>

                <div className="bg-wtech-black p-5 rounded-2xl shadow-lg shadow-black/20 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-wtech-gold/10 rounded-full -mr-10 -mt-10 blur-2xl"></div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 relative z-10">Saldo Atual</p>
                    <h3 className="text-3xl font-black relative z-10">
                        {formatValue(mainBRL.income - mainBRL.expense, 'BRL')}
                    </h3>
                    {Object.keys(totalsByCurrency).filter(c => c !== 'BRL').map(c => (
                        <p key={c} className="text-sm font-bold text-wtech-gold mt-1 relative z-10">
                            {formatValue(totalsByCurrency[c].income - totalsByCurrency[c].expense, c)}
                        </p>
                    ))}
                </div>
            </div>

            {/* Filters Bar */}
            <div className="bg-[var(--admin-surface-1)] p-4 rounded-xl border border-[var(--admin-border)] flex flex-wrap gap-3 items-center">
                <div className="flex items-center gap-2 text-[var(--admin-text-tertiary)] font-bold text-xs uppercase">
                    <Filter size={14} /> Filtros:
                </div>

                <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--admin-text-tertiary)]" size={14} />
                    <select
                        className="pl-8 pr-4 py-2 bg-[var(--admin-surface-2)] border border-[var(--admin-border)] rounded-xl text-sm font-bold text-[var(--admin-text-primary)] outline-none focus:border-wtech-gold appearance-none min-w-[180px] transition-all"
                        value={attendantFilter}
                        onChange={(e) => setAttendantFilter(e.target.value)}
                    >
                        <option value="">Todos os Atendentes</option>
                        {users.map(u => (
                            <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                    </select>
                </div>

                <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--admin-text-tertiary)]" size={14} />
                    <select
                        className="pl-8 pr-4 py-2 bg-[var(--admin-surface-2)] border border-[var(--admin-border)] rounded-xl text-sm font-bold text-[var(--admin-text-primary)] outline-none focus:border-wtech-gold appearance-none transition-all"
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                    >
                        <option value="30_days">Últimos 30 Dias</option>
                        <option value="this_month">Este Mês</option>
                        <option value="all">Todo o Período</option>
                    </select>
                </div>

                <div className="ml-auto">
                    <button className="flex items-center gap-2 text-xs font-bold text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] transition-colors">
                        <Download size={14} /> Exportar
                    </button>
                </div>
            </div>

            {/* Transactions Table */}
            <div className="bg-[var(--admin-surface-1)] rounded-2xl border border-[var(--admin-border)] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-[var(--admin-surface-2)] border-b border-[var(--admin-border)]">
                            <tr>
                                {['Data', 'Descrição', 'Categoria', 'Atendente', 'Valor'].map((h, i) => (
                                    <th key={h} className={`px-5 py-4 text-[10px] font-black text-[var(--admin-text-tertiary)] uppercase tracking-widest ${i === 4 ? 'text-right' : 'text-left'}`}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--admin-border)]">
                            {loading ? (
                                <tr><td colSpan={5} className="px-5 py-16 text-center text-[var(--admin-text-tertiary)] italic animate-pulse">Carregando movimentações...</td></tr>
                            ) : transactions.length === 0 ? (
                                <tr><td colSpan={5} className="px-5 py-16 text-center text-[var(--admin-text-tertiary)] font-bold">Nenhuma transação encontrada.</td></tr>
                            ) : transactions.map((t) => (
                                <tr key={t.id} className="hover:bg-[var(--admin-surface-2)] transition-colors">
                                    <td className="px-5 py-4 text-sm text-[var(--admin-text-tertiary)] whitespace-nowrap">
                                        {new Date(t.created_at).toLocaleDateString('pt-BR')}
                                        <span className="text-xs opacity-50 ml-1">{new Date(t.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                                    </td>
                                    <td className="px-5 py-4">
                                        <p className="text-sm font-bold text-[var(--admin-text-primary)]">{t.title}</p>
                                        <p className="text-xs text-[var(--admin-text-tertiary)]">{t.description}</p>
                                    </td>
                                    <td className="px-5 py-4">
                                        <span className="px-2 py-1 rounded-lg text-[10px] font-bold uppercase bg-[var(--admin-surface-3)] text-[var(--admin-text-secondary)] border border-[var(--admin-border)]">
                                            {t.category || 'Geral'}
                                        </span>
                                    </td>
                                    <td className="px-5 py-4 text-sm text-[var(--admin-text-secondary)]">
                                        {t.attendant_name || users.find(u => u.id === t.attendant_id)?.name || '—'}
                                    </td>
                                    <td className={`px-5 py-4 text-right text-sm font-black ${t.type === 'income' ? 'text-emerald-500' : 'text-red-500'}`}>
                                        {t.type === 'expense' ? '− ' : '+ '}
                                        {formatValue(t.amount, t.currency || 'BRL')}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default CashFlowView;
