import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { Filter, Download, ArrowUpCircle, ArrowDownCircle, Wallet, Calendar, User, Search } from 'lucide-react';

const CashFlowView = () => {
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState<any[]>([]);
    
    // Filters
    const [attendantFilter, setAttendantFilter] = useState('');
    const [dateFilter, setDateFilter] = useState('30_days'); // 30_days, this_month, all
    
    useEffect(() => {
        fetchUsers();
        fetchTransactions();
    }, [attendantFilter, dateFilter]);

    const fetchUsers = async () => {
        const { data } = await supabase.from('profiles').select('id, name');
        if(data) setUsers(data);
    };

    const fetchTransactions = async () => {
        setLoading(true);
        let query = supabase
            .from('SITE_Transactions')
            .select('*')
            .order('created_at', { ascending: false });

        // Apply Attendant Filter
        if (attendantFilter) {
            query = query.eq('attendant_id', attendantFilter);
        }

        // Apply Date Filter
        const now = new Date();
        if (dateFilter === '30_days') {
            const date = new Date();
            date.setDate(date.getDate() - 30);
            query = query.gte('created_at', date.toISOString());
        } else if (dateFilter === 'this_month') {
             const startStats = new Date(now.getFullYear(), now.getMonth(), 1);
             query = query.gte('created_at', startStats.toISOString());
        }

        const { data, error } = await query;
        
        if (data) {
            setTransactions(data);
        }
        setLoading(false);
    };

    // Calculate Totals grouped by currency
    const totalsByCurrency = transactions.reduce((acc, curr) => {
        const currency = curr.currency || 'BRL';
        if (!acc[currency]) acc[currency] = { income: 0, expense: 0 };
        if (curr.type === 'income') acc[currency].income += (curr.amount || 0);
        else acc[currency].expense += (curr.amount || 0);
        return acc;
    }, {} as Record<string, { income: number, expense: number }>);

    const formatValue = (val: number, cur: string) => {
        return new Intl.NumberFormat('pt-BR', { 
            style: 'currency', 
            currency: cur,
            minimumFractionDigits: 2
        }).format(val);
    };

    // For the main cards, we show BRL as primary, but list others if present
    const mainBRL = totalsByCurrency['BRL'] || { income: 0, expense: 0 };

    return (
        <div className="p-6 space-y-8 animate-fade-in pb-20">
            {/* Header */}
            <div>
                <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
                    <Wallet className="text-wtech-gold" size={32} />
                    Fluxo de Caixa
                </h2>
                <p className="text-gray-500 dark:text-gray-400 font-medium mt-1">
                    Gestão financeira e relatórios de vendas.
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-[#1A1A1A] p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 p-2 rounded-full">
                            <ArrowUpCircle size={24} />
                        </div>
                        <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">Entradas</p>
                    </div>
                    <div>
                        <h3 className="text-3xl font-black text-gray-900 dark:text-white">
                            {formatValue(mainBRL.income, 'BRL')}
                        </h3>
                        {Object.keys(totalsByCurrency).filter(c => c !== 'BRL').map(c => (
                            <p key={c} className="text-xs font-bold text-green-600 dark:text-green-400 mt-1">
                                + {formatValue(totalsByCurrency[c].income, c)}
                            </p>
                        ))}
                    </div>
                </div>

                <div className="bg-white dark:bg-[#1A1A1A] p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-2 rounded-full">
                            <ArrowDownCircle size={24} />
                        </div>
                        <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">Saídas</p>
                    </div>
                    <div>
                        <h3 className="text-3xl font-black text-gray-900 dark:text-white">
                            {formatValue(mainBRL.expense, 'BRL')}
                        </h3>
                        {Object.keys(totalsByCurrency).filter(c => c !== 'BRL').map(c => (
                            <p key={c} className="text-xs font-bold text-red-600 dark:text-red-400 mt-1">
                                - {formatValue(totalsByCurrency[c].expense, c)}
                            </p>
                        ))}
                    </div>
                </div>

                <div className="bg-wtech-black p-6 rounded-2xl shadow-lg shadow-black/20 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-wtech-gold/10 rounded-full -mr-10 -mt-10 blur-2xl"></div>
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2 relative z-10">Saldo Atual</p>
                    <h3 className="text-4xl font-black relative z-10">
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
            <div className="bg-white dark:bg-[#1A1A1A] p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2 text-gray-500 font-bold text-sm uppercase mr-2">
                    <Filter size={16} /> Filtros:
                </div>

                {/* Attendant Filter */}
                <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <select 
                        className="pl-9 pr-4 py-2 bg-gray-50 dark:bg-[#333] rounded-lg text-sm font-bold text-gray-700 dark:text-white outline-none border border-transparent focus:border-wtech-gold appearance-none min-w-[200px]"
                        value={attendantFilter}
                        onChange={(e) => setAttendantFilter(e.target.value)}
                    >
                        <option value="">Todos os Atendentes</option>
                        {users.map(u => (
                            <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                    </select>
                </div>

                {/* Date Filter */}
                <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <select 
                        className="pl-9 pr-4 py-2 bg-gray-50 dark:bg-[#333] rounded-lg text-sm font-bold text-gray-700 dark:text-white outline-none border border-transparent focus:border-wtech-gold appearance-none"
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                    >
                        <option value="30_days">Últimos 30 Dias</option>
                        <option value="this_month">Este Mês</option>
                        <option value="all">Todo o Período</option>
                    </select>
                </div>

                <div className="ml-auto">
                    <button className="flex items-center gap-2 text-sm font-bold text-gray-600 hover:text-black dark:text-gray-400 dark:hover:text-white transition-colors">
                        <Download size={16} /> Exportar Relatório
                    </button>
                </div>
            </div>

            {/* Transactions Table */}
            <div className="bg-white dark:bg-[#1A1A1A] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-[#222]">
                            <tr>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Data</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Descrição</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Categoria</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Atendente</th>
                                <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Valor</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                            {loading ? (
                                <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500 italic">Carregando movimentações...</td></tr>
                            ) : transactions.length === 0 ? (
                                <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500">Nenhuma transação encontrada para este filtro.</td></tr>
                            ) : transactions.map((t) => (
                                <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-[#222] transition-colors">
                                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                        {new Date(t.created_at).toLocaleDateString('pt-BR')} <span className="text-xs opacity-50">{new Date(t.created_at).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-sm font-bold text-gray-900 dark:text-white">{t.title}</p>
                                        <p className="text-xs text-gray-400">{t.description}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="px-2 py-1 rounded text-[10px] font-bold uppercase bg-gray-100 dark:bg-[#333] text-gray-600 dark:text-gray-300">
                                            {t.category || 'Geral'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                                        {t.attendant_name || users.find(u => u.id === t.attendant_id)?.name || '-'}
                                    </td>
                                    <td className={`px-6 py-4 text-right text-sm font-black ${t.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                        {t.type === 'expense' ? '- ' : '+ '}
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
