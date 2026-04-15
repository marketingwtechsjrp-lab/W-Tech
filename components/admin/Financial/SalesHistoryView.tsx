import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { Filter, TrendingUp, User, RotateCcw, Calendar, Phone } from 'lucide-react';
import { motion } from 'framer-motion';

interface Sale {
    id: string;
    client_id: string | null;
    seller_id: string | null;
    client_name: string;
    client_email: string | null;
    client_phone: string | null;
    notes: string;
    total_value: number;
    payment_method: string;
    created_at: string;
}

const SalesHistoryView: React.FC = () => {
    const [sales, setSales] = useState<Sale[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSeller, setSelectedSeller] = useState<string>('all');
    const [usersMap, setUsersMap] = useState<Record<string, string>>({});

    useEffect(() => { fetchUsers(); }, []);

    const fetchUsers = async () => {
        try {
            const { data: users } = await supabase.from('SITE_Users').select('id, name');
            const map: Record<string, string> = {};
            users?.forEach(user => { map[user.id] = user.name; });
            setUsersMap(map);
        } catch (error) {
            console.error('Error fetching users:', error);
        }
    };

    useEffect(() => { fetchSales(); }, []);

    const fetchSales = async () => {
        setLoading(true);
        try {
            const { data } = await supabase
                .from('SITE_Sales')
                .select('*')
                .order('created_at', { ascending: false });
            setSales(data || []);
        } catch (error) {
            console.error('Error fetching sales:', error);
        } finally {
            setLoading(false);
        }
    };

    const sellers = useMemo(() => Array.from(new Set(sales.map(s => s.seller_id).filter(Boolean))), [sales]);

    const filteredSales = useMemo(() =>
        selectedSeller === 'all' ? sales : sales.filter(s => s.seller_id === selectedSeller),
        [sales, selectedSeller]
    );

    const totalSales = useMemo(() =>
        filteredSales.reduce((sum, sale) => sum + Number(sale.total_value || 0), 0),
        [filteredSales]
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-wtech-gold"></div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-5">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-black text-[var(--admin-text-primary)]">Histórico de Vendas</h2>
                    <p className="text-sm text-[var(--admin-text-secondary)]">Vendas fechadas no CRM</p>
                </div>
                <div className="bg-emerald-500/10 px-5 py-3 rounded-xl border border-emerald-500/20">
                    <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Total</div>
                    <div className="text-xl font-black text-emerald-500">
                        {totalSales.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </div>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-[var(--admin-surface-1)] p-4 rounded-xl border border-[var(--admin-border)] flex items-center gap-3">
                <Filter size={14} className="text-[var(--admin-text-tertiary)] shrink-0" />
                <select
                    value={selectedSeller}
                    onChange={(e) => setSelectedSeller(e.target.value)}
                    className="flex-1 px-3 py-2 bg-[var(--admin-surface-2)] border border-[var(--admin-border)] rounded-xl text-sm font-bold text-[var(--admin-text-primary)] focus:outline-none focus:border-wtech-gold transition-all"
                >
                    <option value="all">Todos os Atendentes</option>
                    {sellers.map(sellerId => (
                        <option key={sellerId} value={sellerId!}>
                            {usersMap[sellerId!] || `Usuário ${sellerId?.substring(0, 8)}`}
                        </option>
                    ))}
                </select>
                <button
                    onClick={fetchSales}
                    className="p-2 hover:bg-[var(--admin-surface-3)] rounded-xl transition-colors text-[var(--admin-text-tertiary)]"
                    title="Atualizar"
                >
                    <RotateCcw size={16} className={loading ? 'animate-spin' : ''} />
                </button>
                <span className="text-xs font-bold text-[var(--admin-text-tertiary)] shrink-0">
                    {filteredSales.length} {filteredSales.length === 1 ? 'venda' : 'vendas'}
                </span>
            </div>

            {/* Sales Table */}
            <div className="bg-[var(--admin-surface-1)] rounded-2xl border border-[var(--admin-border)] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-[var(--admin-surface-2)] border-b border-[var(--admin-border)]">
                            <tr>
                                {['Data', 'Cliente', 'Atendente', 'Resumo', 'Método', 'Valor'].map((h, i) => (
                                    <th key={h} className={`px-5 py-4 text-[10px] font-black text-[var(--admin-text-tertiary)] uppercase tracking-widest ${i === 5 ? 'text-right' : 'text-left'}`}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--admin-border)]">
                            {filteredSales.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-5 py-16 text-center text-[var(--admin-text-tertiary)]">
                                        <div className="flex flex-col items-center gap-2">
                                            <TrendingUp size={40} className="opacity-20" />
                                            <p className="text-sm font-bold">Nenhuma venda encontrada</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredSales.map((sale) => (
                                <motion.tr
                                    key={sale.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="hover:bg-[var(--admin-surface-2)] transition-colors"
                                >
                                    <td className="px-5 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-1.5 text-sm font-bold text-[var(--admin-text-primary)]">
                                            <Calendar size={12} className="text-[var(--admin-text-tertiary)]" />
                                            {new Date(sale.created_at).toLocaleDateString('pt-BR')}
                                        </div>
                                        <div className="text-[10px] text-[var(--admin-text-tertiary)]">
                                            {new Date(sale.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </td>
                                    <td className="px-5 py-4">
                                        <div className="text-sm font-bold text-[var(--admin-text-primary)]">{sale.client_name}</div>
                                        {sale.client_email && (
                                            <div className="text-[11px] text-[var(--admin-text-tertiary)] truncate max-w-[200px]">{sale.client_email}</div>
                                        )}
                                    </td>
                                    <td className="px-5 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-lg bg-wtech-gold/10 flex items-center justify-center shrink-0">
                                                <User size={12} className="text-wtech-gold" />
                                            </div>
                                            <span className="text-sm font-bold text-[var(--admin-text-primary)]">
                                                {sale.seller_id ? (usersMap[sale.seller_id] || 'Desconhecido') : '—'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-5 py-4">
                                        <div className="text-sm text-[var(--admin-text-secondary)] max-w-[250px] truncate">
                                            {sale.notes}
                                        </div>
                                    </td>
                                    <td className="px-5 py-4">
                                        <span className="inline-flex px-2 py-1 text-[10px] font-bold rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20">
                                            {sale.payment_method}
                                        </span>
                                    </td>
                                    <td className="px-5 py-4 text-right">
                                        <div className="text-base font-black text-emerald-500">
                                            {Number(sale.total_value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </div>
                                    </td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default SalesHistoryView;
