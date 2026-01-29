import React, { useState, useEffect } from 'react';
import { 
    Search, Plus, Filter, Edit, Trash2, Truck, CreditCard,
    CheckCircle2, Clock, Wrench, Ban, MoreVertical, LayoutGrid, List, RefreshCcw, ShoppingCart
} from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { Sale, SaleItem, Product } from '../../../types';
import { useAuth } from '../../../context/AuthContext';
import { OrdersKanbanBoard } from './OrdersKanbanBoard';
import { NewOrderModal } from './NewOrderModal';

const SalesManagerView: React.FC<{ permissions?: any }> = ({ permissions }) => {
    const { user } = useAuth();
    const [sales, setSales] = useState<Sale[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [attendantFilter, setAttendantFilter] = useState<string>('all');
    const [dateFilter, setDateFilter] = useState<'all' | 'today' | '7days' | '30days' | 'custom'>('all');
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');
    const [usersList, setUsersList] = useState<{id: string, name: string}[]>([]);
    const [viewMode, setViewMode] = useState<'list' | 'kanban'>('kanban');
    
    // Modal State
    const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
    const [editingSale, setEditingSale] = useState<Partial<Sale> | null>(null);
    const [currentSaleItems, setCurrentSaleItems] = useState<(SaleItem & { product?: Product })[]>([]);
    
    // Portal Menu State
    const [activeMenu, setActiveMenu] = useState<{top: number, left: number, saleId: string} | null>(null);

    const handleOpenMenu = (e: React.MouseEvent, saleId: string) => {
        e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        setActiveMenu({
            top: rect.bottom + 5 + window.scrollY,
            left: rect.right - 192 + window.scrollX,
            saleId
        });
    };

    useEffect(() => {
        const handleScroll = () => setActiveMenu(null);
        window.addEventListener('scroll', handleScroll, true);
        window.addEventListener('resize', handleScroll);
        return () => {
             window.removeEventListener('scroll', handleScroll, true);
             window.removeEventListener('resize', handleScroll);
        };
    }, []);

    useEffect(() => {
        fetchSales();
        fetchUsers();
    }, [attendantFilter]);

    const fetchUsers = async () => {
        const { data } = await supabase.from('SITE_Users').select('id, name');
        if (data) setUsersList(data);
    };

    const fetchSales = async () => {
        setLoading(true);
        let query = supabase.from('SITE_Sales').select('*');

        if (permissions && !permissions.orders_view_all && user) {
            query = query.eq('seller_id', user.id);
        } else if (attendantFilter !== 'all') {
            query = query.eq('seller_id', attendantFilter);
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching sales:', error);
        } else {
            const mappedSales = (data || []).map((s: any) => ({
                id: s.id,
                clientId: s.client_id,
                clientName: s.client_name,
                clientEmail: s.client_email,
                clientPhone: s.client_phone,
                channel: s.channel,
                status: s.status,
                totalValue: s.total_value,
                paymentMethod: s.payment_method,
                itemsJson: s.items, // Keep raw items just in case
                notes: s.notes,
                createdAt: s.created_at
            }));
            setSales(mappedSales);
        }
        setLoading(false);
    };

    const handleCreateSale = () => {
        setEditingSale(null);
        setCurrentSaleItems([]);
        setIsSaleModalOpen(true);
    };

    const handleEditSale = async (saleId: string) => {
        setLoading(true);
        try {
            const { data: saleData } = await supabase.from('SITE_Sales').select('*').eq('id', saleId).single();
            const { data: itemsData } = await supabase.from('SITE_SaleItems').select('*, product:SITE_Products(*)').eq('sale_id', saleId);

            if (saleData) {
                setEditingSale({
                    id: saleData.id,
                    clientId: saleData.client_id,
                    clientName: saleData.client_name,
                    clientEmail: saleData.client_email,
                    clientPhone: saleData.client_phone,
                    channel: saleData.channel,
                    status: saleData.status,
                    totalValue: saleData.total_value,
                    notes: saleData.notes
                });

                let mappedItems = [];
                
                if (itemsData && itemsData.length > 0) {
                    mappedItems = itemsData.map((item: any) => ({
                        id: item.id,
                        saleId: item.sale_id,
                        productId: item.product_id,
                        quantity: item.quantity,
                        unitPrice: item.unit_price,
                        product: item.product ? {
                            id: item.product.id,
                            sku: item.product.sku,
                            name: item.product.name,
                            salePrice: item.product.sale_price,
                            unit: item.product.unit,
                            currentStock: item.product.current_stock
                        } : undefined
                    }));
                } else if (saleData.items) {
                    // Fallback to JSON items if SITE_SaleItems is empty
                    const jsonItems = typeof saleData.items === 'string' ? JSON.parse(saleData.items) : saleData.items;
                    mappedItems = jsonItems.map((item: any) => ({
                        id: Math.random().toString(),
                        saleId: saleData.id,
                        productId: item.productId,
                        quantity: item.quantity,
                        unitPrice: item.price || item.unitPrice || 0,
                        name: item.name, // Explicit name for display
                        product: {
                            id: item.productId,
                            name: item.name,
                            salePrice: item.price || item.unitPrice || 0,
                        }
                    }));
                }
                
                setCurrentSaleItems(mappedItems);
                setIsSaleModalOpen(true);
            }
        } catch (error: any) {
            alert('Erro ao carregar pedido: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (saleId: string, newStatus: Sale['status']) => {
        setLoading(true);
        try {
             // Logic to handle stock deduction if moving to SHIPPED
            const { data: sale } = await supabase.from('SITE_Sales').select('status').eq('id', saleId).single();
            const shouldDeduct = newStatus === 'shipped' && (sale?.status !== 'shipped' && sale?.status !== 'delivered');
            
            const { error } = await supabase.from('SITE_Sales').update({ status: newStatus }).eq('id', saleId);
            if (error) throw error;

            if (shouldDeduct) {
                // Fetch reserved movements and convert to OUT
                const { data: movements } = await supabase.from('SITE_StockMovements').select('*').eq('reference_id', saleId).eq('type', 'RESERVED');
                if (movements) {
                    for (const mov of movements) {
                        await supabase.from('SITE_StockMovements').insert([{
                            product_id: mov.product_id,
                            type: 'OUT',
                            quantity: mov.quantity,
                            origin: 'Venda (Enviada)',
                            reference_id: saleId,
                            notes: `Baixa automática Venda #${saleId.slice(0,8)}`
                        }]);
                        // Deduct actual stock
                        // Note: Current stock logic usually deducts available stock. 
                        // If we implement 'Available' vs 'Physical', this changes.
                        // For now, simple deduction from current_stock.
                         const { data: p } = await supabase.from('SITE_Products').select('current_stock').eq('id', mov.product_id).single();
                         if(p) {
                             await supabase.from('SITE_Products').update({ current_stock: p.current_stock - mov.quantity }).eq('id', mov.product_id);
                         }
                    }
                }
            }

            fetchSales();
        } catch (error: any) {
            alert('Erro ao atualizar status: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteSale = async (saleId: string) => {
        if (!confirm('Tem certeza? Isso excluirá permanentemente o histórico.')) return;
        setLoading(true);
        try {
            await supabase.from('SITE_SaleItems').delete().eq('sale_id', saleId);
            await supabase.from('SITE_StockMovements').delete().eq('reference_id', saleId);
            await supabase.from('SITE_Sales').delete().eq('id', saleId);
            fetchSales();
        } catch(e) { console.error(e); }
        setLoading(false);
    };

    const filteredSales = sales.filter(s => {
        const matchesSearch = s.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             s.id.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
        
        // Date filtering
        let matchesDate = true;
        if (dateFilter !== 'all') {
            const saleDate = new Date(s.createdAt);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            if (dateFilter === 'today') {
                matchesDate = saleDate >= today;
            } else if (dateFilter === '7days') {
                const sevenDaysAgo = new Date(today);
                sevenDaysAgo.setDate(today.getDate() - 7);
                matchesDate = saleDate >= sevenDaysAgo;
            } else if (dateFilter === '30days') {
                const thirtyDaysAgo = new Date(today);
                thirtyDaysAgo.setDate(today.getDate() - 30);
                matchesDate = saleDate >= thirtyDaysAgo;
            } else if (dateFilter === 'custom' && customStartDate && customEndDate) {
                const start = new Date(customStartDate);
                const end = new Date(customEndDate);
                end.setHours(23, 59, 59, 999);
                matchesDate = saleDate >= start && saleDate <= end;
            }
        }
        
        return matchesSearch && matchesStatus && matchesDate;
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'negotiation': return 'bg-purple-100 text-purple-700';
            case 'approved': return 'bg-indigo-100 text-indigo-700';
            case 'pending': return 'bg-yellow-100 text-yellow-700';
            case 'paid': return 'bg-green-100 text-green-700';
            case 'producing': return 'bg-blue-100 text-blue-700';
            case 'shipped': return 'bg-orange-100 text-orange-700';
            case 'delivered': return 'bg-emerald-100 text-emerald-700';
            case 'cancelled': return 'bg-red-100 text-red-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    const getStatusLabel = (status: string) => {
        const map: any = { 
            negotiation: 'Negociação',
            approved: 'Aprovado',
            pending: 'Pendente', 
            paid: 'Pago', 
            producing: 'Em Produção', 
            shipped: 'Enviado', 
            delivered: 'Entregue', 
            cancelled: 'Cancelado' 
        };
        return map[status] || status;
    };


    return (
        <div className="p-6 space-y-6">
            {/* Header & Controls */}
            {/* Futuristic Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 mt-4">
                <div className="flex items-center gap-5">
                    <div className="relative group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-wtech-red to-red-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                        <div className="relative p-4 bg-wtech-red shadow-2xl rounded-2xl">
                            <ShoppingCart className="text-white" size={32} />
                        </div>
                    </div>
                    <div>
                        <h2 className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter uppercase italic flex items-center gap-3">
                            Vendas & <span className="text-wtech-red">Fluxo</span>
                        </h2>
                        <div className="flex items-center gap-2 mt-1 px-2 py-0.5 bg-gray-100 dark:bg-white/5 rounded-full w-fit border border-gray-200 dark:border-gray-800">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                            <span className="text-gray-500 dark:text-gray-400 font-black text-[9px] uppercase tracking-widest">{sales.length} Pedidos Ativos</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* View Switcher - Futuristic Style */}
                    <div className="bg-gray-100 dark:bg-[#111] p-1.5 rounded-2xl flex gap-1 border border-gray-200 dark:border-gray-800 shadow-inner">
                        <button 
                            onClick={() => setViewMode('kanban')}
                            className={`p-3 rounded-xl transition-all duration-300 ${viewMode === 'kanban' ? 'bg-white dark:bg-[#222] text-wtech-red shadow-xl scale-105' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`}
                        >
                            <LayoutGrid size={20} />
                        </button>
                        <button 
                            onClick={() => setViewMode('list')}
                            className={`p-3 rounded-xl transition-all duration-300 ${viewMode === 'list' ? 'bg-white dark:bg-[#222] text-wtech-red shadow-xl scale-105' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`}
                        >
                            <List size={20} />
                        </button>
                    </div>

                    <button 
                        onClick={fetchSales}
                        disabled={loading}
                        className="bg-white dark:bg-[#111] text-gray-700 dark:text-white border border-gray-200 dark:border-gray-800 p-4 rounded-2xl hover:bg-gray-50 dark:hover:bg-[#222] transition-all shadow-sm active:scale-90 group relative"
                        title="Sincronizar Pedidos"
                    >
                        <RefreshCcw size={20} className={`${loading ? 'animate-spin text-wtech-red' : 'group-hover:rotate-180 transition-transform duration-700'}`} />
                        {loading && <span className="absolute -top-1 -right-1 flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span></span>}
                    </button>

                    <button 
                        onClick={handleCreateSale}
                        className="bg-wtech-red text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] flex items-center gap-3 hover:bg-black transition-all shadow-2xl shadow-red-600/20 active:scale-95 group relative overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                        <Plus size={20} className="group-hover:rotate-90 transition-transform duration-500" /> 
                        <span>Novo Pedido</span>
                    </button>
                </div>
            </div>

            {/* Comprehensive Status Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                {[
                    { id: 'pending', label: 'Pendente', color: 'yellow', icon: Clock },
                    { id: 'negotiation', label: 'Negociação', color: 'purple', icon: Clock },
                    { id: 'approved', label: 'Aprovado', color: 'indigo', icon: CheckCircle2 },
                    { id: 'paid', label: 'Pago', color: 'green', icon: CreditCard },
                    { id: 'producing', label: 'Produção', color: 'blue', icon: Wrench },
                    { id: 'shipped', label: 'Enviado', color: 'orange', icon: Truck },
                    { id: 'delivered', label: 'Entregue', color: 'emerald', icon: CheckCircle2 }
                ].map(status => {
                    const Icon = status.icon;
                    const statusSales = sales.filter(s => s.status === status.id);
                    const count = statusSales.length;
                    const total = statusSales.reduce((acc, s) => acc + s.totalValue, 0);
                    
                    return (
                        <div 
                            key={status.id}
                            className="bg-white dark:bg-[#1A1A1A] p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-all group cursor-pointer"
                            onClick={() => setStatusFilter(status.id)}
                        >
                            <div className="flex items-center justify-between mb-3">
                                <div className={`p-2 bg-${status.color}-50 dark:bg-${status.color}-900/20 text-${status.color}-600 rounded-xl group-hover:scale-110 transition-transform`}>
                                    <Icon size={16} />
                                </div>
                                <span className="text-2xl font-black text-gray-900 dark:text-white">{count}</span>
                            </div>
                            <div>
                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">{status.label}</p>
                                <p className="text-sm font-black text-gray-900 dark:text-white">
                                    R$ {(total / 1000).toFixed(1)}k
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 p-4 bg-white dark:bg-[#1A1A1A] rounded-2xl border border-gray-100 dark:border-gray-800">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-3 text-gray-400" size={20} />
                    <input 
                        type="text"
                        placeholder="Buscar por cliente ou ID..."
                        className="w-full bg-gray-50 dark:bg-[#111] border-none rounded-xl py-3 pl-12 pr-4 text-sm font-bold dark:text-white focus:ring-2 focus:ring-wtech-gold transition-all outline-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex flex-wrap gap-2">
                    {/* Date Filter */}
                    <select 
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value as any)}
                        className="bg-gray-50 dark:bg-[#111] border-none rounded-xl py-3 px-4 text-sm font-bold dark:text-white outline-none"
                    >
                        <option value="all">Todos os Períodos</option>
                        <option value="today">Hoje</option>
                        <option value="7days">Últimos 7 dias</option>
                        <option value="30days">Últimos 30 dias</option>
                        <option value="custom">Período Customizado</option>
                    </select>
                    
                    {dateFilter === 'custom' && (
                        <>
                            <input 
                                type="date"
                                value={customStartDate}
                                onChange={(e) => setCustomStartDate(e.target.value)}
                                className="bg-gray-50 dark:bg-[#111] border-none rounded-xl py-3 px-4 text-sm font-bold dark:text-white outline-none"
                            />
                            <input 
                                type="date"
                                value={customEndDate}
                                onChange={(e) => setCustomEndDate(e.target.value)}
                                className="bg-gray-50 dark:bg-[#111] border-none rounded-xl py-3 px-4 text-sm font-bold dark:text-white outline-none"
                            />
                        </>
                    )}
                    
                    {permissions?.orders_view_all && (
                        <select 
                            value={attendantFilter}
                            onChange={(e) => setAttendantFilter(e.target.value)}
                            className="bg-gray-50 dark:bg-[#111] border-none rounded-xl py-3 px-4 text-sm font-bold dark:text-white outline-none"
                        >
                            <option value="all">Todos os Atendentes</option>
                            {usersList.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                        </select>
                    )}
                    <select 
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="bg-gray-50 dark:bg-[#111] border-none rounded-xl py-3 px-4 text-sm font-bold dark:text-white outline-none"
                    >
                        <option value="all">Todos os Status</option>
                        <option value="negotiation">Negociação</option>
                        <option value="approved">Aprovado</option>
                        <option value="pending">Pendente</option>
                        <option value="paid">Pago</option>
                        <option value="producing">Em Produção</option>
                        <option value="shipped">Enviado</option>
                        <option value="delivered">Entregue</option>
                    </select>
                </div>
            </div>

            {/* Content Area */}
            {viewMode === 'kanban' ? (
                <OrdersKanbanBoard 
                    sales={filteredSales} 
                    onUpdateStatus={handleUpdateStatus} 
                    onEditSale={handleEditSale} 
                />
            ) : (
                <div className="bg-white dark:bg-[#1A1A1A] rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50/50 dark:bg-white/5">
                                <tr>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">ID / Data</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Cliente</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Canal</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Valor</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                                    <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                                {loading ? (
                                    <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400 italic">Carregando...</td></tr>
                                ) : filteredSales.length === 0 ? (
                                    <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400 italic">Nenhum pedido encontrado.</td></tr>
                                ) : filteredSales.map((sale) => (
                                    <tr key={sale.id} className="hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">#{sale.id.slice(0, 8)}</span>
                                                <span className="text-xs font-bold text-gray-900 dark:text-white">{new Date(sale.createdAt).toLocaleDateString('pt-BR')}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm font-bold text-gray-900 dark:text-white">{sale.clientName || 'Cliente Direto'}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-500">
                                                {sale.channel}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm font-black text-gray-900 dark:text-white">R$ {sale.totalValue.toLocaleString('pt-BR')}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full ${getStatusColor(sale.status)}`}>
                                                {getStatusLabel(sale.status)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right relative">
                                            <button 
                                                onClick={(e) => handleOpenMenu(e, sale.id)}
                                                className="p-2 text-gray-400 hover:text-black dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-white/10"
                                            >
                                                <MoreVertical size={18} />
                                            </button>
                                            
                                            {/* Action Menu Protal logic would go here, implemented simpler for now */}
                                            {activeMenu && activeMenu.saleId === sale.id && (
                                                <div 
                                                    className="fixed z-50 bg-white dark:bg-[#222] rounded-xl shadow-xl border border-gray-100 dark:border-gray-800 py-1 w-48"
                                                    style={{ top: activeMenu.top, left: activeMenu.left }}
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <button onClick={() => handleEditSale(sale.id)} className="w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-white/5 text-sm font-bold flex items-center gap-2">
                                                        <Edit size={14} /> Editar
                                                    </button>
                                                    {['negotiation', 'approved', 'pending', 'paid', 'producing', 'shipped', 'delivered'].map(s => (
                                                        <button 
                                                            key={s}
                                                            onClick={() => { handleUpdateStatus(sale.id, s as any); setActiveMenu(null); }}
                                                            className="w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-white/5 text-xs text-gray-500 uppercase font-bold"
                                                        >
                                                            Marcar {getStatusLabel(s)}
                                                        </button>
                                                    ))}
                                                    <div className="h-px bg-gray-100 dark:bg-gray-800 my-1"></div>
                                                    {(user?.role === 'Admin' || user?.role === 'Super Admin' || user?.role === 'Manager' || 
                                                      (typeof user?.role === 'object' && (user.role.name === 'Admin' || user.role.name === 'Super Admin' || user.role.level >= 10)) ||
                                                      permissions?.admin_access) && (
                                                        <button onClick={() => { handleDeleteSale(sale.id); setActiveMenu(null); }} className="w-full text-left px-4 py-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 text-sm font-bold flex items-center gap-2">
                                                            <Trash2 size={14} /> Excluir
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <NewOrderModal 
                isOpen={isSaleModalOpen}
                onClose={() => setIsSaleModalOpen(false)}
                onSave={fetchSales}
                onDelete={handleDeleteSale}
                editingSale={editingSale}
                user={user}
                initialItems={currentSaleItems}
            />
        </div>
    );
};

export default SalesManagerView;
