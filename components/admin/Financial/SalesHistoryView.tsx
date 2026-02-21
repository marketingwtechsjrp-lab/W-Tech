import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { Users, DollarSign, Calendar, Filter, TrendingUp, User, RotateCcw } from 'lucide-react';
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

    // Fetch users for mapping
    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const { data: users, error } = await supabase
                .from('SITE_Users')
                .select('id, name');

            if (error) throw error;

            const map: Record<string, string> = {};
            users?.forEach(user => {
                map[user.id] = user.name;
            });
            setUsersMap(map);
        } catch (error) {
            console.error('Error fetching users:', error);
        }
    };

    // Fetch sales data
    useEffect(() => {
        fetchSales();
    }, []);

    const fetchSales = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('SITE_Sales')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setSales(data || []);
        } catch (error) {
            console.error('Error fetching sales:', error);
        } finally {
            setLoading(false);
        }
    };

    // Get unique sellers for filter
    const sellers = useMemo(() => {
        const uniqueSellers = new Set(sales.map(s => s.seller_id).filter(Boolean));
        return Array.from(uniqueSellers);
    }, [sales]);

    // Filter sales by selected seller
    const filteredSales = useMemo(() => {
        if (selectedSeller === 'all') return sales;
        return sales.filter(s => s.seller_id === selectedSeller);
    }, [sales, selectedSeller]);

    // Calculate total
    const totalSales = useMemo(() => {
        return filteredSales.reduce((sum, sale) => sum + Number(sale.total_value || 0), 0);
    }, [filteredSales]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-wtech-gold"></div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white">Histórico de Vendas</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Vendas fechadas no CRM</p>
                </div>
                
                {/* Total Badge */}
                <div className="bg-green-50 dark:bg-green-900/20 px-6 py-3 rounded-xl border border-green-200 dark:border-green-800">
                    <div className="text-xs font-bold text-green-600 dark:text-green-400 uppercase">Total</div>
                    <div className="text-2xl font-black text-green-700 dark:text-green-300">
                        {totalSales.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </div>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white dark:bg-[#1A1A1A] p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-4">
                    <Filter size={18} className="text-gray-400" />
                    <select
                        value={selectedSeller}
                        onChange={(e) => setSelectedSeller(e.target.value)}
                        className="flex-1 px-4 py-2 bg-gray-50 dark:bg-[#222] border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-bold text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-wtech-gold"
                    >
                        <option value="all">Todos os Atendentes</option>
                        {sellers.map(sellerId => (
                            <option key={sellerId} value={sellerId}>
                                {usersMap[sellerId!] || `Usuário ${sellerId?.substring(0, 8)}`}
                            </option>
                        ))}
                    </select>
                    <button 
                        onClick={fetchSales}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors text-gray-500"
                        title="Atualizar"
                    >
                        <RotateCcw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <div className="text-sm font-bold text-gray-500">
                        {filteredSales.length} {filteredSales.length === 1 ? 'venda' : 'vendas'}
                    </div>
                </div>
            </div>

            {/* Sales Table */}
            <div className="bg-white dark:bg-[#1A1A1A] rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-[#111] border-b border-gray-100 dark:border-gray-800">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Data</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Cliente</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Atendente</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Resumo</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Método</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Valor</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {filteredSales.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400 dark:text-gray-600">
                                        <div className="flex flex-col items-center gap-2">
                                            <TrendingUp size={48} className="opacity-20" />
                                            <p className="text-sm font-bold">Nenhuma venda encontrada</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredSales.map((sale) => (
                                    <motion.tr
                                        key={sale.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300">
                                                <Calendar size={14} className="text-gray-400" />
                                                {new Date(sale.created_at).toLocaleDateString('pt-BR')}
                                            </div>
                                            <div className="text-xs text-gray-400">
                                                {new Date(sale.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-bold text-gray-900 dark:text-white">{sale.client_name}</div>
                                            {sale.client_email && (
                                                <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[200px]">{sale.client_email}</div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-wtech-gold/10 flex items-center justify-center">
                                                    <User size={14} className="text-wtech-gold" />
                                                </div>
                                                <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                                                    {sale.seller_id ? (usersMap[sale.seller_id] || 'Desconhecido') : 'Não atribuído'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-600 dark:text-gray-400 max-w-[300px] truncate">
                                                {sale.notes}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex px-2 py-1 text-xs font-bold rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300">
                                                {sale.payment_method}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="text-lg font-black text-green-600 dark:text-green-400">
                                                {Number(sale.total_value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default SalesHistoryView;
