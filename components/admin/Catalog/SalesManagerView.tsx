import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
    Search, Plus, Filter, Edit, Trash2, Package, 
    ArrowUpRight, ArrowDownRight, History, Settings, 
    PackageCheck, AlertTriangle, Layers, Wrench, X, Save,
    ShoppingCart, User, Calendar, CreditCard, Truck, 
    CheckCircle2, Clock, Ban, MoreVertical, Eye, UserPlus
} from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { Product, StockMovement, ProductBOM, Sale, SaleItem, Shipment } from '../../../types';
import { motion, AnimatePresence } from 'framer-motion';

const SalesManagerView: React.FC = () => {
    const [sales, setSales] = useState<Sale[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    
    const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
    const [editingSale, setEditingSale] = useState<Partial<Sale> | null>(null);
    const [saleItems, setSaleItems] = useState<(SaleItem & { product?: Product })[]>([]);
    const [isAddingItem, setIsAddingItem] = useState(false);
    const [itemSearch, setItemSearch] = useState('');
    const [products, setProducts] = useState<Product[]>([]);
    
    // Client Search
    const [potentialClients, setPotentialClients] = useState<{id: string, name: string, type: string, phone: string, email?: string}[]>([]);
    const [clientSearchTerm, setClientSearchTerm] = useState('');
    const [showClientResults, setShowClientResults] = useState(false);

    // Portal Menu State
    const [activeMenu, setActiveMenu] = useState<{top: number, left: number, saleId: string} | null>(null);

    const handleOpenMenu = (e: React.MouseEvent, saleId: string) => {
        e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        setActiveMenu({
            top: rect.bottom + 5 + window.scrollY,
            left: rect.right - 192 + window.scrollX, // Align right edge (w-48 is approx 192px)
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
        fetchProducts();
        fetchClients();
    }, []);

    const fetchClients = async () => {
        const { data: leads } = await supabase.from('SITE_Leads').select('id, name, phone, email').limit(100);
        const { data: mechanics } = await supabase.from('SITE_Mechanics').select('id, name, phone, email').limit(100);
        
        const combined = [
            ...(leads || []).map((l: any) => ({ ...l, type: 'Lead' })),
            ...(mechanics || []).map((m: any) => ({ ...m, type: 'Credenciado' }))
        ];
        setPotentialClients(combined);
    };

    const fetchSales = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('SITE_Sales')
            .select('*')
            .order('created_at', { ascending: false });

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
                paymentStatus: s.payment_status,
                shippingStatus: s.shipping_status,
                notes: s.notes,
                createdAt: s.created_at
            }));
            setSales(mappedSales);
        }
        setLoading(false);
    };

    const fetchProducts = async () => {
        const { data, error } = await supabase
            .from('SITE_Products')
            .select('*')
            .eq('type', 'product');

        if (!error && data) {
            const mapped = data.map((p: any) => ({
                id: p.id,
                sku: p.sku,
                name: p.name,
                type: p.type,
                unit: p.unit,
                currentStock: p.current_stock,
                salePrice: p.sale_price
            })) as Product[];
            setProducts(mapped);
        }
    };

    const handleCreateSale = () => {
        setEditingSale({
            channel: 'Admin',
            status: 'pending',
            totalValue: 0
        });
        setSaleItems([]);
        setIsSaleModalOpen(true);
    };

    const handleUpdateStatus = async (saleId: string, newStatus: Sale['status']) => {
        setLoading(true);
        try {
            const { data: sale } = await supabase.from('SITE_Sales').select('status').eq('id', saleId).single();
            const shouldDeduct = newStatus === 'shipped' && (sale?.status !== 'shipped' && sale?.status !== 'delivered');
            
            const { error } = await supabase
                .from('SITE_Sales')
                .update({ status: newStatus })
                .eq('id', saleId);

            if (error) throw error;

            if (shouldDeduct) {
                await processStockDeduction(saleId);
            }

            fetchSales();
        } catch (error: any) {
            alert('Erro ao atualizar status: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const processStockDeduction = async (saleId: string) => {
        const { data: movements } = await supabase
            .from('SITE_StockMovements')
            .select('*')
            .eq('reference_id', saleId)
            .eq('type', 'RESERVED');

        if (movements && movements.length > 0) {
            for (const mov of movements) {
                await supabase.from('SITE_StockMovements').insert([{
                    product_id: mov.product_id,
                    type: 'OUT',
                    quantity: mov.quantity,
                    origin: 'Venda (Enviada)',
                    reference_id: saleId,
                    notes: `Baixa automática de estoque para Venda #${saleId.slice(0,8)}`
                }]);

                const { data: product } = await supabase
                    .from('SITE_Products')
                    .select('current_stock')
                    .eq('id', mov.product_id)
                    .single();
                
                if (product) {
                    await supabase
                        .from('SITE_Products')
                        .update({ current_stock: (product.current_stock || 0) - mov.quantity })
                        .eq('id', mov.product_id);
                }
            }
        }
    };

    const handleSaveSale = async () => {
        if (saleItems.length === 0) return alert('Adicione pelo menos um item.');
        
        setLoading(true);
        try {
            const totalValue = saleItems.reduce((acc, i) => acc + (i.unitPrice * i.quantity), 0);
            const { data: saleData, error: saleError } = await supabase
                .from('SITE_Sales')
                .insert([{
                    client_name: editingSale?.clientName || 'Cliente Balcão',
                    client_phone: editingSale?.clientPhone,
                    channel: editingSale?.channel || 'Admin',
                    status: editingSale?.status || 'pending',
                    total_value: totalValue,
                    created_at: new Date().toISOString()
                }])
                .select()
                .single();

            if (saleError) throw saleError;

            const itemsToInsert = saleItems.map(item => ({
                sale_id: saleData.id,
                product_id: item.productId,
                quantity: item.quantity,
                unit_price: item.unitPrice
            }));

            const { error: itemsError } = await supabase
                .from('SITE_SaleItems')
                .insert(itemsToInsert);

            if (itemsError) throw itemsError;

            for (const item of saleItems) {
                const { data: bomData } = await supabase
                    .from('SITE_ProductBOM')
                    .select('*')
                    .eq('parent_product_id', item.productId);

                if (bomData && bomData.length > 0) {
                    for (const component of bomData) {
                        await supabase.from('SITE_StockMovements').insert([{
                            product_id: component.component_id,
                            type: 'RESERVED',
                            quantity: component.quantity * item.quantity,
                            origin: 'Venda',
                            reference_id: saleData.id,
                            notes: `Reserva p/ Pedido #${saleData.id.slice(0,8)} (Comp. de ${item.product?.name})`
                        }]);
                    }
                } else {
                    await supabase.from('SITE_StockMovements').insert([{
                        product_id: item.productId,
                        type: 'RESERVED',
                        quantity: item.quantity,
                        origin: 'Venda',
                        reference_id: saleData.id,
                        notes: `Reserva p/ Pedido #${saleData.id.slice(0,8)}`
                    }]);
                }
            }

            setIsSaleModalOpen(false);
            fetchSales();
            alert('Pedido realizado com sucesso! Estoque reservado.');
        } catch (error: any) {
            alert('Erro ao salvar pedido: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const filteredSales = sales.filter(s => {
        const matchesSearch = s.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             s.id.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const getStatusColor = (status: Sale['status']) => {
        switch (status) {
            case 'pending': return 'bg-yellow-100 text-yellow-700';
            case 'paid': return 'bg-green-100 text-green-700';
            case 'producing': return 'bg-blue-100 text-blue-700';
            case 'shipped': return 'bg-purple-100 text-purple-700';
            case 'delivered': return 'bg-emerald-100 text-emerald-700';
            case 'cancelled': return 'bg-red-100 text-red-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    const getStatusLabel = (status: Sale['status']) => {
        switch (status) {
            case 'pending': return 'Pendente';
            case 'paid': return 'Pago';
            case 'producing': return 'Em Produção';
            case 'shipped': return 'Enviado';
            case 'delivered': return 'Entregue';
            case 'cancelled': return 'Cancelado';
            default: return status;
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-black text-gray-900 tracking-tight">Vendas & Pedidos</h2>
                    <p className="text-gray-500 font-medium">Gerencie suas vendas multicanal e acompanhe o status dos pedidos.</p>
                </div>
                <button 
                    onClick={handleCreateSale}
                    className="bg-wtech-black text-white px-6 py-3 rounded-2xl font-black flex items-center gap-2 hover:bg-gray-800 transition-all shadow-xl active:scale-95"
                >
                    <Plus size={20} /> Novo Pedido
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-yellow-50 text-yellow-600 rounded-xl">
                            <Clock size={20} />
                        </div>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pendentes</span>
                    </div>
                    <p className="text-2xl font-black text-gray-900">{sales.filter(s => s.status === 'pending').length}</p>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                            <Layers size={20} />
                        </div>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Em Produção</span>
                    </div>
                    <p className="text-2xl font-black text-gray-900">{sales.filter(s => s.status === 'producing').length}</p>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                            <Truck size={20} />
                        </div>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Enviados</span>
                    </div>
                    <p className="text-2xl font-black text-gray-900">{sales.filter(s => s.status === 'shipped').length}</p>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-green-50 text-green-600 rounded-xl">
                            <CheckCircle2 size={20} />
                        </div>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Faturamento Total</span>
                    </div>
                    <p className="text-2xl font-black text-gray-900">R$ {sales.reduce((acc, s) => acc + s.totalValue, 0).toLocaleString('pt-BR')}</p>
                </div>
            </div>

            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-4 top-3 text-gray-400" size={20} />
                        <input 
                            type="text"
                            placeholder="Buscar por cliente ou ID..."
                            className="w-full bg-gray-50 border-none rounded-2xl py-3 pl-12 pr-4 text-sm font-bold focus:ring-2 focus:ring-wtech-gold transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <select 
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="bg-gray-50 border-none rounded-2xl py-3 px-4 text-sm font-bold focus:ring-2 focus:ring-wtech-gold transition-all"
                        >
                            <option value="all">Todos os Status</option>
                            <option value="pending">Pendente</option>
                            <option value="paid">Pago</option>
                            <option value="producing">Em Produção</option>
                            <option value="shipped">Enviado</option>
                            <option value="delivered">Entregue</option>
                            <option value="cancelled">Cancelado</option>
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-50/50">
                                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">ID / Data</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Cliente</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Canal</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Valor</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                                <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400 font-bold italic">Carregando pedidos...</td></tr>
                            ) : filteredSales.length === 0 ? (
                                <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400 font-bold italic">Nenhum pedido encontrado.</td></tr>
                            ) : filteredSales.map((sale) => (
                                <tr key={sale.id} className="hover:bg-gray-50/50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">#{sale.id.slice(0, 8)}</span>
                                            <span className="text-xs font-bold text-gray-900">{new Date(sale.createdAt).toLocaleDateString('pt-BR')}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                                                <User size={14} className="text-gray-400" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-gray-900">{sale.clientName || 'Cliente Direto'}</span>
                                                <span className="text-[10px] text-gray-400 font-bold uppercase">{sale.clientPhone || 'Sem telefone'}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md bg-gray-100 text-gray-500`}>
                                            {sale.channel}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-sm font-black text-gray-900">R$ {sale.totalValue.toLocaleString('pt-BR')}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full ${getStatusColor(sale.status)}`}>
                                            {getStatusLabel(sale.status)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {/* Quick Status Actions */}
                                            {sale.status === 'pending' && (
                                                <button onClick={() => handleUpdateStatus(sale.id, 'paid')} className="p-1.5 text-green-600 bg-green-50 hover:bg-green-100 rounded-lg" title="Marcar Pago">
                                                    <CreditCard size={16} />
                                                </button>
                                            )}
                                            {sale.status === 'paid' && (
                                                <button onClick={() => handleUpdateStatus(sale.id, 'producing')} className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg" title="Iniciar Produção">
                                                    <Wrench size={16} />
                                                </button>
                                            )}
                                            {sale.status === 'producing' && (
                                                <button onClick={() => handleUpdateStatus(sale.id, 'shipped')} className="p-1.5 text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg" title="Despachar">
                                                    <Truck size={16} />
                                                </button>
                                            )}
                                            
                                            <button 
                                                onClick={(e) => handleOpenMenu(e, sale.id)}
                                                className={`p-2 transition-colors duration-200 rounded-lg ${activeMenu?.saleId === sale.id ? 'text-black bg-gray-200' : 'text-gray-400 hover:text-black hover:bg-gray-100'}`}
                                            >
                                                <MoreVertical size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <AnimatePresence>
                {isSaleModalOpen && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden border border-gray-100"
                        >
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                <div>
                                    <h3 className="text-xl font-black text-gray-900">{editingSale?.id ? 'Editar Pedido' : 'Lançar Novo Pedido'}</h3>
                                    <p className="text-xs text-gray-500 font-medium tracking-tight">Venda Balcão / Administrativa</p>
                                </div>
                                <button onClick={() => setIsSaleModalOpen(false)} className="p-2 hover:bg-white rounded-full transition-colors text-gray-400 hover:text-red-500">
                                    <X size={24} />
                                </button>
                            </div>
                            
                            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 max-h-[80vh] overflow-y-auto">
                                <div className="md:col-span-2 space-y-6">
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Itens do Pedido</h4>
                                            <button 
                                                onClick={() => setIsAddingItem(!isAddingItem)}
                                                className="text-xs font-bold text-wtech-gold hover:underline flex items-center gap-1"
                                            >
                                                {isAddingItem ? <X size={14} /> : <Plus size={14} />} Adicionar Item
                                            </button>
                                        </div>

                                        {isAddingItem && (
                                            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 animate-in fade-in slide-in-from-top-2">
                                                <div className="relative mb-4">
                                                    <Search className="absolute left-4 top-2.5 text-gray-400" size={18} />
                                                    <input 
                                                        type="text" 
                                                        placeholder="Buscar produto pelo nome ou SKU..." 
                                                        className="w-full bg-white border border-gray-200 rounded-xl py-2 pl-12 pr-4 text-sm font-bold focus:ring-2 focus:ring-wtech-gold transition-all outline-none"
                                                        value={itemSearch}
                                                        onChange={(e) => setItemSearch(e.target.value)}
                                                    />
                                                </div>
                                                <div className="max-h-48 overflow-y-auto space-y-2">
                                                    {products
                                                        .filter(p => !saleItems.find(si => si.productId === p.id) && (p.name.toLowerCase().includes(itemSearch.toLowerCase()) || p.sku.toLowerCase().includes(itemSearch.toLowerCase())))
                                                        .map(p => (
                                                            <button 
                                                                key={p.id}
                                                                onClick={() => {
                                                                    setSaleItems([...saleItems, {
                                                                        id: Math.random().toString(),
                                                                        saleId: '',
                                                                        productId: p.id,
                                                                        quantity: 1,
                                                                        unitPrice: p.salePrice,
                                                                        product: p
                                                                    }]);
                                                                    setIsAddingItem(false);
                                                                    setItemSearch('');
                                                                }}
                                                                className="w-full text-left p-3 hover:bg-white rounded-xl flex justify-between items-center group transition-all"
                                                            >
                                                                <div>
                                                                    <p className="text-sm font-bold text-gray-900">{p.name}</p>
                                                                    <p className="text-[10px] text-gray-400 font-bold uppercase">{p.sku} | Estoque: {p.currentStock} {p.unit}</p>
                                                                </div>
                                                                <div className="text-right">
                                                                    <p className="text-sm font-black text-gray-900">R$ {p.salePrice.toLocaleString('pt-BR')}</p>
                                                                    <Plus size={16} className="text-wtech-gold ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                                                                </div>
                                                            </button>
                                                        ))
                                                    }
                                                </div>
                                            </div>
                                        )}

                                        <div className="space-y-2">
                                            {saleItems.length === 0 ? (
                                                <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                                                    <ShoppingCart className="mx-auto text-gray-300 mb-2" size={32} />
                                                    <p className="text-gray-400 font-bold text-sm">Nenhum item adicionado ao pedido.</p>
                                                </div>
                                            ) : (
                                                saleItems.map((item, idx) => (
                                                    <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                                        <div className="flex-1">
                                                            <p className="text-sm font-black text-gray-900">{item.product?.name}</p>
                                                            <p className="text-[10px] text-gray-400 font-bold uppercase">{item.product?.sku}</p>
                                                        </div>
                                                        <div className="flex items-center gap-4">
                                                            <div className="flex items-center gap-2 bg-white rounded-xl border border-gray-200 p-1">
                                                                <button 
                                                                    onClick={() => {
                                                                        const newItems = [...saleItems];
                                                                        if (newItems[idx].quantity > 1) {
                                                                            newItems[idx].quantity--;
                                                                            setSaleItems(newItems);
                                                                        }
                                                                    }}
                                                                    className="w-8 h-8 flex items-center justify-center"
                                                                >
                                                                    <X size={14} className="text-gray-400" />
                                                                </button>
                                                                <input 
                                                                    type="number" 
                                                                    className="w-12 text-center text-sm font-black border-none focus:ring-0 p-0"
                                                                    value={item.quantity}
                                                                    onChange={(e) => {
                                                                        const newItems = [...saleItems];
                                                                        newItems[idx].quantity = parseInt(e.target.value) || 1;
                                                                        setSaleItems(newItems);
                                                                    }}
                                                                />
                                                                <button 
                                                                    onClick={() => {
                                                                        const newItems = [...saleItems];
                                                                        newItems[idx].quantity++;
                                                                        setSaleItems(newItems);
                                                                    }}
                                                                    className="w-8 h-8 flex items-center justify-center"
                                                                >
                                                                    <Plus size={14} className="text-wtech-gold" />
                                                                </button>
                                                            </div>
                                                            <div className="w-24 text-right">
                                                                <p className="text-sm font-black text-gray-900">R$ {(item.unitPrice * item.quantity).toLocaleString('pt-BR')}</p>
                                                            </div>
                                                            <button 
                                                                onClick={() => setSaleItems(saleItems.filter((_, i) => i !== idx))}
                                                                className="text-red-400 hover:text-red-600"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="bg-gray-50/50 p-6 rounded-3xl border border-gray-100 space-y-4 relative">
                                        <div className="flex justify-between items-center">
                                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Informações do Cliente</h4>
                                            <button onClick={() => setShowClientResults(!showClientResults)} className="text-xs font-bold text-wtech-gold flex items-center gap-1">
                                                <Search size={12} /> Buscar Cliente
                                            </button>
                                        </div>
                                        
                                        {/* Client Search Dropdown */}
                                        {showClientResults && (
                                            <div className="absolute top-12 left-0 w-full bg-white rounded-xl shadow-xl border border-gray-200 z-10 p-2 space-y-2">
                                                <input 
                                                    className="w-full p-2 text-xs bg-gray-50 rounded-lg border border-gray-200 outline-none focus:border-wtech-gold"
                                                    placeholder="Digite o nome..."
                                                    value={clientSearchTerm}
                                                    onChange={e => setClientSearchTerm(e.target.value)}
                                                    autoFocus
                                                />
                                                <div className="max-h-40 overflow-y-auto">
                                                    {potentialClients
                                                        .filter(c => c.name.toLowerCase().includes(clientSearchTerm.toLowerCase()))
                                                        .map(client => (
                                                            <div 
                                                                key={client.id}
                                                                onClick={() => {
                                                                    setEditingSale({
                                                                        ...editingSale, 
                                                                        clientId: client.id,
                                                                        clientName: client.name,
                                                                        clientPhone: client.phone,
                                                                        clientEmail: client.email
                                                                    });
                                                                    setShowClientResults(false);
                                                                }}
                                                                className="p-2 hover:bg-blue-50 rounded-lg cursor-pointer flex justify-between items-center"
                                                            >
                                                                <div>
                                                                    <p className="text-xs font-bold text-gray-900">{client.name}</p>
                                                                    <p className="text-[10px] text-gray-400">{client.type}</p>
                                                                </div>
                                                                <UserPlus size={14} className="text-gray-400" />
                                                            </div>
                                                        ))
                                                    }
                                                    {clientSearchTerm && (
                                                        <div 
                                                            className="p-2 hover:bg-green-50 rounded-lg cursor-pointer text-center text-xs font-bold text-green-600"
                                                            onClick={() => {
                                                                setEditingSale({
                                                                    ...editingSale,
                                                                    clientName: clientSearchTerm,
                                                                    clientId: undefined
                                                                });
                                                                setShowClientResults(false);
                                                            }}
                                                        >
                                                            Usar "{clientSearchTerm}" (Novo)
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        <div className="space-y-3">
                                            <div>
                                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Nome Completo</label>
                                                <input 
                                                    className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm font-bold outline-none focus:border-wtech-gold"
                                                    value={editingSale?.clientName || ''}
                                                    onChange={e => setEditingSale({...editingSale, clientName: e.target.value})}
                                                    placeholder="Cliente Balcão"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Telefone (WhatsApp)</label>
                                                <input 
                                                    className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm font-bold outline-none focus:border-wtech-gold"
                                                    value={editingSale?.clientPhone || ''}
                                                    onChange={e => setEditingSale({...editingSale, clientPhone: e.target.value})}
                                                    placeholder="11 99999-9999"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-wtech-black p-6 rounded-3xl shadow-xl space-y-4 text-white">
                                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Resumo Financeiro</h4>
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-xs text-gray-400 font-bold">
                                                <span>Subtotal</span>
                                                <span>R$ {saleItems.reduce((acc, i) => acc + (i.unitPrice * i.quantity), 0).toLocaleString('pt-BR')}</span>
                                            </div>
                                            <div className="flex justify-between items-center py-2 border-t border-gray-800 mt-2">
                                                <span className="text-sm font-black">TOTAL</span>
                                                <span className="text-xl font-black text-wtech-gold">R$ {saleItems.reduce((acc, i) => acc + (i.unitPrice * i.quantity), 0).toLocaleString('pt-BR')}</span>
                                            </div>
                                        </div>
                                        
                                        <button 
                                            className="w-full py-4 bg-wtech-gold text-black rounded-2xl font-black text-sm uppercase tracking-wider hover:bg-yellow-500 disabled:opacity-50"
                                            onClick={handleSaveSale}
                                            disabled={loading}
                                        >
                                            {loading ? 'Processando...' : 'Finalizar Pedido'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {activeMenu && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-start justify-start" onClick={() => setActiveMenu(null)}>
                    {/* Backdrop is the div itself */}
                    <div 
                        className="fixed bg-white rounded-xl shadow-2xl border border-gray-100 py-2 w-48 animate-in fade-in zoom-in-95 duration-200"
                        style={{ top: activeMenu.top, left: activeMenu.left }}
                        onClick={e => e.stopPropagation()} // Prevent close when clicking inside menu
                    >
                        <button onClick={() => { handleUpdateStatus(activeMenu.saleId, 'paid'); setActiveMenu(null); }} className="w-full text-left px-4 py-2 text-xs font-bold hover:bg-gray-50 text-green-600 flex items-center gap-2 transition-colors">
                            <CreditCard size={14}/> Marcar Pago
                        </button>
                        <button onClick={() => { handleUpdateStatus(activeMenu.saleId, 'producing'); setActiveMenu(null); }} className="w-full text-left px-4 py-2 text-xs font-bold hover:bg-gray-50 text-blue-600 flex items-center gap-2 transition-colors">
                            <Wrench size={14}/> Em Produção
                        </button>
                        <button onClick={() => { handleUpdateStatus(activeMenu.saleId, 'shipped'); setActiveMenu(null); }} className="w-full text-left px-4 py-2 text-xs font-bold hover:bg-gray-50 text-purple-600 flex items-center gap-2 transition-colors">
                            <Truck size={14}/> Despachar
                        </button>
                        <button onClick={() => { handleUpdateStatus(activeMenu.saleId, 'delivered'); setActiveMenu(null); }} className="w-full text-left px-4 py-2 text-xs font-bold hover:bg-gray-50 text-emerald-600 flex items-center gap-2 transition-colors">
                            <CheckCircle2 size={14}/> Entregue
                        </button>
                        <div className="h-px bg-gray-100 my-1"></div>
                        <button onClick={() => { handleUpdateStatus(activeMenu.saleId, 'cancelled'); setActiveMenu(null); }} className="w-full text-left px-4 py-2 text-xs font-bold hover:bg-gray-50 text-red-600 flex items-center gap-2 transition-colors">
                            <Ban size={14}/> Cancelar
                        </button>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default SalesManagerView;
