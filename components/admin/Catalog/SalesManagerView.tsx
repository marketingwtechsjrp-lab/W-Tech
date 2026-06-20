import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
    Search, Plus, CreditCard, CheckCircle2, Clock, Wrench, Truck,
    LayoutGrid, List, RefreshCcw, ShoppingCart, MessageCircle, BadgeCheck, Ban
} from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { Sale, SaleItem, Product } from '../../../types';
import { useAuth } from '../../../context/AuthContext';
import { createHasPermission } from '../../../lib/permissions';
import { OrdersKanbanBoard } from './OrdersKanbanBoard';
import { NewOrderModal } from './OrderEditor';
import { cn } from '../../../lib/utils';
import type { Lead } from '../../../types';
import { useRegisterPage } from '../keyboard/AdminKeyboardProvider';

// ── Status config (explicit classes — Tailwind purge safe) ─────────────────

const STATUS_CFG: Record<string, {
    label: string;
    icon: React.ElementType;
    iconBg: string;
    iconText: string;
    badge: string;
}> = {
    pending:     { label: 'Pendente',    icon: Clock,         iconBg: 'bg-yellow-500/10',  iconText: 'text-yellow-500',  badge: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' },
    negotiation: { label: 'Negociação',  icon: MessageCircle, iconBg: 'bg-purple-500/10',  iconText: 'text-purple-500',  badge: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
    approved:    { label: 'Aprovado',    icon: BadgeCheck,    iconBg: 'bg-indigo-500/10',  iconText: 'text-indigo-500',  badge: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20' },
    paid:        { label: 'Pago',        icon: CreditCard,    iconBg: 'bg-green-500/10',   iconText: 'text-green-500',   badge: 'bg-green-500/10 text-green-600 border-green-500/20' },
    producing:   { label: 'Em Produção', icon: Wrench,        iconBg: 'bg-blue-500/10',    iconText: 'text-blue-500',    badge: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
    shipped:     { label: 'Enviado',     icon: Truck,         iconBg: 'bg-orange-500/10',  iconText: 'text-orange-500',  badge: 'bg-orange-500/10 text-orange-600 border-orange-500/20' },
    delivered:   { label: 'Entregue',   icon: CheckCircle2,  iconBg: 'bg-emerald-500/10', iconText: 'text-emerald-500', badge: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
    cancelled:   { label: 'Cancelado',  icon: Ban,           iconBg: 'bg-red-500/10',     iconText: 'text-red-500',     badge: 'bg-red-500/10 text-red-600 border-red-500/20' },
};

const inputCls = 'bg-[var(--admin-surface-2)] border border-[var(--admin-border)] text-[var(--admin-text-primary)] placeholder:text-[var(--admin-text-tertiary)] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-wtech-gold transition-colors';

// ── Main Component ─────────────────────────────────────────────────────────

const SalesManagerView: React.FC<{
    permissions?: any;
    initialLead?: Lead | null;
    onConsumeInitialLead?: () => void;
}> = ({ permissions, initialLead, onConsumeInitialLead }) => {
    const { user } = useAuth();
    const can = createHasPermission(user, permissions);
    const [sales, setSales]             = useState<Sale[]>([]);
    const [loading, setLoading]         = useState(true);
    const [searchTerm, setSearchTerm]   = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [attendantFilter, setAttendantFilter] = useState<string>('all');
    const [dateFilter, setDateFilter]   = useState<'all' | 'today' | '7days' | '30days' | 'custom'>('all');
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate]     = useState('');
    const searchRef = useRef<HTMLInputElement>(null);
    const [usersList, setUsersList]     = useState<{ id: string; name: string }[]>([]);
    const [viewMode, setViewMode]       = useState<'list' | 'kanban'>('kanban');

    const [isEditMode, setIsEditMode]         = useState(false);
    const [editingSale, setEditingSale]       = useState<Partial<Sale> | null>(null);
    const [currentSaleItems, setCurrentSaleItems] = useState<(SaleItem & { product?: Product })[]>([]);

    // ── scroll closes menu (not needed anymore but kept for compat) ──
    useEffect(() => {
        const close = () => {};
        window.addEventListener('scroll', close, true);
        return () => window.removeEventListener('scroll', close, true);
    }, []);

    useEffect(() => {
        fetchSales();
        fetchUsers();
    }, [attendantFilter]);

    useEffect(() => {
        if (initialLead) {
            setIsEditMode(true);
            setEditingSale({
                clientName: initialLead.name,
                clientEmail: initialLead.email,
                clientPhone: initialLead.phone,
                clientId: initialLead.id,
                channel: 'CRM',
                status: 'negotiation'
            });
            setCurrentSaleItems([]);
            onConsumeInitialLead?.();
        }
    }, [initialLead]);

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
        if (!error) {
            setSales((data || []).map((s: any) => ({
                id: s.id, clientId: s.client_id, clientName: s.client_name,
                clientEmail: s.client_email, clientPhone: s.client_phone,
                channel: s.channel, status: s.status, totalValue: s.total_value,
                paymentMethod: s.payment_method, itemsJson: s.items, notes: s.notes,
                seller_id: s.seller_id, createdAt: s.created_at
            })));
        }
        setLoading(false);
    };

    const handleCreateSale = () => {
        setEditingSale(null);
        setCurrentSaleItems([]);
        setIsEditMode(true);
    };

    // Contexto de teclado: n = novo pedido, / = focar busca, r = atualizar
    useRegisterPage({
        title: 'Pedidos',
        newLabel: 'Novo pedido',
        onNew: handleCreateSale,
        onFocusSearch: () => searchRef.current?.focus(),
        actions: [{ id: 'orders-refresh', label: 'Atualizar pedidos', key: 'r', run: () => fetchSales() }],
    }, []);

    const handleEditSale = async (saleId: string) => {
        setLoading(true);
        try {
            const { data: saleData } = await supabase.from('SITE_Sales').select('*').eq('id', saleId).single();
            const { data: itemsData } = await supabase.from('SITE_SaleItems').select('*, product:SITE_Products(*)').eq('sale_id', saleId);

            if (saleData) {
                setEditingSale({
                    id: saleData.id, clientId: saleData.client_id,
                    clientName: saleData.client_name, clientEmail: saleData.client_email,
                    clientPhone: saleData.client_phone, channel: saleData.channel,
                    status: saleData.status, totalValue: saleData.total_value,
                    notes: saleData.notes, payment_method: saleData.payment_method,
                    shipping_method: saleData.shipping_method, shipping_cost: saleData.shipping_cost,
                    insurance_cost: saleData.insurance_cost,
                    estimated_delivery_date: saleData.estimated_delivery_date,
                    tracking_code: saleData.tracking_code, discount_code: saleData.discount_code,
                    discount_amount: saleData.discount_amount, delivery_cep: saleData.delivery_cep,
                    delivery_street: saleData.delivery_street, delivery_number: saleData.delivery_number,
                    delivery_neighborhood: saleData.delivery_neighborhood,
                    delivery_city: saleData.delivery_city, delivery_state: saleData.delivery_state
                });

                let mappedItems: any[] = [];
                if (itemsData && itemsData.length > 0) {
                    mappedItems = itemsData.map((item: any) => ({
                        id: item.id, saleId: item.sale_id, productId: item.product_id,
                        quantity: item.quantity, unitPrice: item.unit_price,
                        product: item.product ? {
                            id: item.product.id, sku: item.product.sku,
                            name: item.product.name, salePrice: item.product.sale_price,
                            unit: item.product.unit, currentStock: item.product.current_stock
                        } : undefined
                    }));
                } else if (saleData.items) {
                    const jsonItems = typeof saleData.items === 'string' ? JSON.parse(saleData.items) : saleData.items;
                    mappedItems = jsonItems.map((item: any) => ({
                        id: Math.random().toString(), saleId: saleData.id,
                        productId: item.productId, quantity: item.quantity,
                        unitPrice: item.price || item.unitPrice || 0, name: item.name,
                        product: { id: item.productId, name: item.name, salePrice: item.price || item.unitPrice || 0 }
                    }));
                }

                setCurrentSaleItems(mappedItems);
                setIsEditMode(true);
            }
        } catch (error: any) {
            alert('Erro ao carregar pedido: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (saleId: string, newStatus: Sale['status'], trackingCode?: string) => {
        setLoading(true);
        try {
            const { data: sale } = await supabase.from('SITE_Sales').select('status').eq('id', saleId).single();
            const wasDeducted = ['paid', 'shipped', 'delivered', 'producing'].includes(sale?.status || '');
            const targetIsDeducted = ['paid', 'shipped', 'delivered', 'producing'].includes(newStatus);
            const shouldDeduct = targetIsDeducted && !wasDeducted;

            const updatePayload: any = { status: newStatus };
            if (trackingCode) updatePayload.tracking_code = trackingCode;

            const { error } = await supabase.from('SITE_Sales').update(updatePayload).eq('id', saleId);
            if (error) throw error;

            if (shouldDeduct) {
                const { data: movements } = await supabase.from('SITE_StockMovements').select('*').eq('reference_id', saleId).eq('type', 'RESERVED');
                if (movements) {
                    for (const mov of movements) {
                        await supabase.from('SITE_StockMovements').insert([{
                            product_id: mov.product_id, type: 'OUT', quantity: mov.quantity,
                            origin: `Venda (${STATUS_CFG[newStatus]?.label || newStatus})`,
                            reference_id: saleId,
                            notes: `Baixa automática Venda #${saleId.slice(0, 8)}`
                        }]);
                        const { data: p } = await supabase.from('SITE_Products').select('current_stock').eq('id', mov.product_id).single();
                        if (p) await supabase.from('SITE_Products').update({ current_stock: p.current_stock - mov.quantity }).eq('id', mov.product_id);
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
        if (!can('orders_delete')) { alert('Você não tem permissão para excluir pedidos.'); return; }
        if (!confirm('Excluir permanentemente este pedido?')) return;
        setLoading(true);
        try {
            await supabase.from('SITE_SaleItems').delete().eq('sale_id', saleId);
            await supabase.from('SITE_StockMovements').delete().eq('reference_id', saleId);
            await supabase.from('SITE_Sales').delete().eq('id', saleId);
            fetchSales();
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    // ── Filtered + metrics ─────────────────────────────────────────────────

    const applyDateFilter = (s: Sale) => {
        if (dateFilter === 'all') return true;
        const saleDate = new Date(s.createdAt);
        const today = new Date(); today.setHours(0, 0, 0, 0);
        if (dateFilter === 'today') return saleDate >= today;
        if (dateFilter === '7days')  { const d = new Date(today); d.setDate(today.getDate() - 7); return saleDate >= d; }
        if (dateFilter === '30days') { const d = new Date(today); d.setDate(today.getDate() - 30); return saleDate >= d; }
        if (dateFilter === 'custom' && customStartDate && customEndDate) {
            const end = new Date(customEndDate); end.setHours(23, 59, 59, 999);
            return saleDate >= new Date(customStartDate) && saleDate <= end;
        }
        return true;
    };

    const filteredSales = useMemo(() => sales.filter(s => {
        const matchesSearch = s.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) || s.id.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
        return matchesSearch && matchesStatus && applyDateFilter(s);
    }), [sales, searchTerm, statusFilter, dateFilter, customStartDate, customEndDate]);

    const metricSales = useMemo(() => sales.filter(s => {
        const matchesAttendant = attendantFilter === 'all' || s.seller_id === attendantFilter;
        return matchesAttendant && applyDateFilter(s);
    }), [sales, attendantFilter, dateFilter, customStartDate, customEndDate]);

    const totalRevenue = metricSales.filter(s => s.status !== 'cancelled').reduce((acc, s) => acc + (s.totalValue || 0), 0);

    // ── Render ─────────────────────────────────────────────────────────────

    return (
        <div className="w-full h-full flex flex-col relative">
            {isEditMode ? (
                <div className="fixed inset-0 z-[9999] bg-[var(--admin-surface-1)] flex flex-col overflow-hidden">
                    <NewOrderModal
                        isOpen={true}
                        onClose={() => { setIsEditMode(false); setEditingSale(null); setCurrentSaleItems([]); }}
                        onSave={() => { fetchSales(); setIsEditMode(false); setEditingSale(null); setCurrentSaleItems([]); }}
                        onDelete={handleDeleteSale}
                        editingSale={editingSale}
                        user={user}
                        permissions={permissions}
                        initialItems={currentSaleItems}
                    />
                </div>
            ) : (
                <div className="p-6 space-y-5 overflow-auto flex-1">

                    {/* ── Header ── */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h2 className="text-xl font-black text-[var(--admin-text-primary)] tracking-tight flex items-center gap-2">
                                <ShoppingCart size={20} className="text-wtech-gold" /> Pedidos
                            </h2>
                            <div className="flex items-center gap-1.5 mt-1">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[10px] font-black text-[var(--admin-text-tertiary)] uppercase tracking-widest">{sales.length} pedidos · R$ {(totalRevenue / 1000).toFixed(1)}k</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {/* View switcher */}
                            <div className="flex bg-[var(--admin-surface-3)] border border-[var(--admin-border)] p-1 rounded-xl gap-1">
                                {([['kanban', LayoutGrid], ['list', List]] as const).map(([mode, Icon]) => (
                                    <button
                                        key={mode}
                                        onClick={() => setViewMode(mode)}
                                        className={cn(
                                            'p-2 rounded-lg transition-all',
                                            viewMode === mode
                                                ? 'bg-[var(--admin-surface-1)] text-wtech-gold shadow-sm'
                                                : 'text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)]'
                                        )}
                                    >
                                        <Icon size={16} />
                                    </button>
                                ))}
                            </div>

                            <button
                                onClick={fetchSales}
                                disabled={loading}
                                className="p-2.5 rounded-xl bg-[var(--admin-surface-1)] border border-[var(--admin-border)] text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)] hover:bg-[var(--admin-surface-3)] transition-colors"
                                title="Atualizar"
                            >
                                <RefreshCcw size={16} className={loading ? 'animate-spin text-wtech-gold' : ''} />
                            </button>

                            {can('manage_orders') && (
                            <button
                                onClick={handleCreateSale}
                                className="bg-gradient-to-r from-wtech-gold to-yellow-600 text-black px-4 py-2.5 rounded-xl font-black text-sm flex items-center gap-2 shadow-md shadow-yellow-500/20 hover:scale-105 active:scale-95 transition-all"
                            >
                                <Plus size={16} strokeWidth={3} /> Novo Pedido
                            </button>
                            )}
                        </div>
                    </div>

                    {/* ── Status Metrics ── */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                        {(Object.entries(STATUS_CFG).filter(([k]) => k !== 'cancelled')).map(([id, cfg]) => {
                            const Icon = cfg.icon;
                            const statusSales = metricSales.filter(s => s.status === id);
                            const count = statusSales.length;
                            const total = statusSales.reduce((acc, s) => acc + (s.totalValue || 0), 0);
                            const isActive = statusFilter === id;
                            return (
                                <button
                                    key={id}
                                    onClick={() => setStatusFilter(isActive ? 'all' : id)}
                                    className={cn(
                                        'bg-[var(--admin-surface-1)] border rounded-2xl p-3 text-left transition-all hover:-translate-y-0.5 hover:shadow-md',
                                        isActive
                                            ? 'border-wtech-gold ring-1 ring-wtech-gold/30'
                                            : 'border-[var(--admin-border)]'
                                    )}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className={cn('p-1.5 rounded-lg', cfg.iconBg)}>
                                            <Icon size={13} className={cfg.iconText} />
                                        </div>
                                        <span className={cn('text-xl font-black', cfg.iconText)}>{count}</span>
                                    </div>
                                    <p className="text-[9px] font-black text-[var(--admin-text-tertiary)] uppercase tracking-widest mb-0.5">{cfg.label}</p>
                                    <p className="text-xs font-black text-[var(--admin-text-primary)]">
                                        R$ {total >= 1000 ? (total / 1000).toFixed(1) + 'k' : total.toLocaleString('pt-BR')}
                                    </p>
                                </button>
                            );
                        })}
                    </div>

                    {/* ── Filters ── */}
                    <div className="flex flex-col md:flex-row gap-3 p-4 bg-[var(--admin-surface-1)] rounded-2xl border border-[var(--admin-border)]">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-2.5 text-[var(--admin-text-tertiary)]" size={16} />
                            <input
                                ref={searchRef}
                                type="text"
                                placeholder="Buscar por cliente ou ID...   ( / )"
                                className={cn(inputCls, 'pl-9 w-full')}
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <select value={dateFilter} onChange={e => setDateFilter(e.target.value as any)} className={inputCls}>
                                <option value="all">Todos os Períodos</option>
                                <option value="today">Hoje</option>
                                <option value="7days">Últimos 7 dias</option>
                                <option value="30days">Últimos 30 dias</option>
                                <option value="custom">Personalizado</option>
                            </select>
                            {dateFilter === 'custom' && (
                                <>
                                    <input type="date" value={customStartDate} onChange={e => setCustomStartDate(e.target.value)} className={inputCls} />
                                    <input type="date" value={customEndDate} onChange={e => setCustomEndDate(e.target.value)} className={inputCls} />
                                </>
                            )}
                            {permissions?.orders_view_all && (
                                <select value={attendantFilter} onChange={e => setAttendantFilter(e.target.value)} className={inputCls}>
                                    <option value="all">Todos os Atendentes</option>
                                    {usersList.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                </select>
                            )}
                            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={inputCls}>
                                <option value="all">Todos os Status</option>
                                {Object.entries(STATUS_CFG).map(([id, cfg]) => (
                                    <option key={id} value={id}>{cfg.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* ── Content ── */}
                    {viewMode === 'kanban' ? (
                        <OrdersKanbanBoard
                            sales={filteredSales}
                            onEditSale={handleEditSale}
                            onUpdateStatus={handleUpdateStatus}
                            onDeleteSale={handleDeleteSale}
                        />
                    ) : (
                        <div className="bg-[var(--admin-surface-1)] border border-[var(--admin-border)] rounded-2xl overflow-hidden">
                            <table className="w-full">
                                <thead className="bg-[var(--admin-surface-2)] border-b border-[var(--admin-border)]">
                                    <tr>
                                        {['Cliente', 'Status', 'Canal', 'Valor', 'Data', 'Ações'].map(h => (
                                            <th key={h} className={cn('px-5 py-3 text-[10px] font-black text-[var(--admin-text-tertiary)] uppercase tracking-widest', h === 'Ações' ? 'text-right' : 'text-left')}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--admin-border)]">
                                    {loading ? (
                                        <tr><td colSpan={6} className="px-5 py-10 text-center text-[var(--admin-text-tertiary)] font-bold">Carregando...</td></tr>
                                    ) : filteredSales.length === 0 ? (
                                        <tr><td colSpan={6} className="px-5 py-10 text-center text-[var(--admin-text-tertiary)] font-bold">Nenhum pedido encontrado.</td></tr>
                                    ) : filteredSales.map(sale => {
                                        const cfg = STATUS_CFG[sale.status] ?? STATUS_CFG.pending;
                                        return (
                                            <tr key={sale.id} className="hover:bg-[var(--admin-surface-2)] transition-colors cursor-pointer" onClick={() => handleEditSale(sale.id)}>
                                                <td className="px-5 py-3">
                                                    <p className="font-bold text-[var(--admin-text-primary)] text-sm">{sale.clientName || 'Balcão'}</p>
                                                    <p className="text-[10px] text-[var(--admin-text-tertiary)] font-mono">{sale.id.slice(0, 8)}</p>
                                                </td>
                                                <td className="px-5 py-3">
                                                    <span className={cn('text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md border', cfg.badge)}>
                                                        {cfg.label}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3">
                                                    <span className="text-xs text-[var(--admin-text-secondary)]">{sale.channel || 'Admin'}</span>
                                                </td>
                                                <td className="px-5 py-3 font-black text-[var(--admin-text-primary)]">
                                                    R$ {sale.totalValue?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </td>
                                                <td className="px-5 py-3 text-xs text-[var(--admin-text-secondary)]">
                                                    {new Date(sale.createdAt).toLocaleDateString('pt-BR')}
                                                </td>
                                                <td className="px-5 py-3 text-right">
                                                    <button
                                                        onClick={e => { e.stopPropagation(); handleEditSale(sale.id); }}
                                                        className="text-xs font-bold text-wtech-gold hover:underline"
                                                    >
                                                        Abrir
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default SalesManagerView;
