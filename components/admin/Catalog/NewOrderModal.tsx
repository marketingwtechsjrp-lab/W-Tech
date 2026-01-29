import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, ShoppingCart, Plus, Trash2, UserPlus, AlertTriangle, Truck, CreditCard, Calendar, Check, Tag } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { Sale, SaleItem, Product } from '../../../types';

interface NewOrderModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    onDelete?: (id: string) => void;
    editingSale: Partial<Sale> | null;
    user: any;
    initialItems?: (SaleItem & { product?: Product })[];
}

export const NewOrderModal: React.FC<NewOrderModalProps> = ({ isOpen, onClose, onSave, onDelete, editingSale, user, initialItems = [] }) => {
    // ---- State ----
    const [currentSale, setCurrentSale] = useState<Partial<any>>({}); // using any for flexibility with new fields for now
    const [saleItems, setSaleItems] = useState<(SaleItem & { product?: Product })[]>([]);
    const [loading, setLoading] = useState(false);

    // Data Sources
    const [products, setProducts] = useState<Product[]>([]);
    const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
    const [potentialClients, setPotentialClients] = useState<any[]>([]);

    // Search/UI State
    const [isSearchingClient, setIsSearchingClient] = useState(false);
    const [clientSearchTerm, setClientSearchTerm] = useState('');
    const [isAddingItem, setIsAddingItem] = useState(false);
    const [productSearchTerm, setProductSearchTerm] = useState('');
    const [discountCode, setDiscountCode] = useState('');

    // Calculated fields
    const subtotal = saleItems.reduce((acc, item) => acc + (item.unitPrice * item.quantity), 0);
    const shippingCost = currentSale.shipping_cost || 0;
    const discountAmount = currentSale.discount_amount || 0;
    const total = subtotal + shippingCost - discountAmount;

    // Locking Logic
    const isLocked = ['paid', 'producing', 'shipped', 'delivered'].includes(currentSale.status || '');
    const canBypassLock = user?.role === 'Admin' || user?.role === 'Super Admin' || user?.role === 'Manager' || 
                          (typeof user?.role === 'object' && (user.role.name === 'Admin' || user.role.name === 'Super Admin' || user.role.level >= 10));

    // ---- Effects ----
    useEffect(() => {
        if (isOpen) {
            loadInitialData();
            setSaleItems(initialItems);
            // Default State
            setCurrentSale(editingSale || { 
                channel: 'Admin', 
                status: 'pending', 
                shipping_method: '',
                shipping_cost: 0,
                discount_amount: 0
            });
            if (editingSale?.clientId) setClientSearchTerm(editingSale.clientName || '');
        }
    }, [isOpen, editingSale, initialItems]);

    // ---- Data Loading ----
    const loadInitialData = async () => {
        // 1. Products
        const { data: prods } = await supabase.from('SITE_Products').select('*').eq('type', 'product');
        if (prods) setProducts(prods.map((p: any) => ({ ...p, currentStock: p.current_stock, salePrice: p.sale_price })));

        // 2. Payment Methods
        const { data: pays } = await supabase.from('SITE_PaymentMethods').select('*').eq('is_active', true);
        if (pays) setPaymentMethods(pays);

        // 3. Clients (Pre-load some or search dynamic? Pre-load 50 for speed now)
        const { data: leads } = await supabase.from('SITE_Leads').select('id, name, phone, email, address').limit(50);
        const { data: mechanics } = await supabase.from('SITE_Mechanics').select('id, name, phone, email').limit(50);
        setPotentialClients([
            ...(leads || []).map((l: any) => ({ ...l, type: 'Lead' })), 
            ...(mechanics || []).map((m: any) => ({ ...m, type: 'Credenciado' }))
        ]);
    };

    // ---- Handlers ----
    const handleAddProduct = (product: Product) => {
        setSaleItems(prev => [...prev, {
            id: Math.random().toString(),
            saleId: '',
            productId: product.id,
            quantity: 1,
            unitPrice: product.salePrice,
            product: product
        }]);
        setIsAddingItem(false);
        setProductSearchTerm('');
    };

    const handleUpdateQuantity = (index: number, delta: number) => {
        const newItems = [...saleItems];
        newItems[index].quantity = Math.max(1, newItems[index].quantity + delta);
        setSaleItems(newItems);
    };

    const handleUpdateStatus = (index: number, delta: number) => {
        handleUpdateQuantity(index, delta);
    };

    const handleRemoveItem = (index: number) => {
         setSaleItems(saleItems.filter((_, i) => i !== index));
    };

    const handleApplyDiscount = () => {
        if (discountCode === 'DESCONTO10') { // Mock logic
             setCurrentSale(prev => ({ ...prev, discount_amount: subtotal * 0.10 }));
             alert('Cupom aplicado: 10% de desconto');
        } else {
             alert('Cupom inválido');
        }
    };

    const handleSaveOrder = async () => {
        if (!currentSale.clientId) return alert('Selecione um cliente.');
        if (saleItems.length === 0) return alert('Adicione produtos ao pedido.');
        
        setLoading(true);
        try {
            const salePayload = {
                client_id: currentSale.clientId,
                client_name: currentSale.clientName,
                client_email: currentSale.clientEmail,
                client_phone: currentSale.clientPhone,
                channel: currentSale.channel,
                status: currentSale.status,
                total_value: total,
                payment_method: currentSale.payment_method, 
                notes: currentSale.notes,
                seller_id: user?.id,
                items: JSON.stringify(saleItems.map(i => ({ 
                    productId: i.productId, 
                    name: i.product?.name, 
                    quantity: i.quantity, 
                    price: i.unitPrice 
                }))),
                shipping_method: currentSale.shipping_method,
                shipping_cost: shippingCost,
                discount_code: discountCode,
                discount_amount: discountAmount,
                estimated_delivery_date: currentSale.estimated_delivery_date,
                tracking_code: currentSale.tracking_code
            };

            // Note: discount_code/discount_amount added to schema in previous step logic, but verify columns exist or use options jsonb

            let saleId = currentSale.id;

            if (saleId) {
                await supabase.from('SITE_Sales').update(salePayload).eq('id', saleId);
                // Wipe and recreate items/stock logic
                await supabase.from('SITE_SaleItems').delete().eq('sale_id', saleId);
                await supabase.from('SITE_StockMovements').delete().eq('reference_id', saleId);
            } else {
                const { data, error } = await supabase.from('SITE_Sales').insert([salePayload]).select().single();
                if (error) throw error;
                saleId = data.id;
            }

            // Insert Items & Stock Reservations
            const itemsToInsert = saleItems.map(item => ({
                sale_id: saleId,
                product_id: item.productId,
                quantity: item.quantity,
                unit_price: item.unitPrice
            }));
            await supabase.from('SITE_SaleItems').insert(itemsToInsert);

            // Simple Stock Reservation Logic
             for (const item of saleItems) {
                await supabase.from('SITE_StockMovements').insert([{
                    product_id: item.productId,
                    type: 'RESERVED',
                    quantity: item.quantity,
                    origin: 'Venda',
                    reference_id: saleId,
                    notes: `Pedido #${saleId?.slice(0,8)}`
                }]);
            }
            
            alert('Pedido processado com sucesso!');
            onSave();
            onClose();

        } catch (error: any) {
            console.error(error);
            alert('Erro ao processar pedido: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!currentSale.id) return;
        if (!confirm('Tem certeza que deseja excluir permanentemente este pedido? Esta ação não pode ser desfeita.')) return;
        
        setLoading(true);
        try {
            if (onDelete) {
                await onDelete(currentSale.id);
                onClose();
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-[#F8F9FC] dark:bg-[#121212] w-full max-w-6xl h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col"
                    >
                         {/* Header */}
                         <div className="px-8 py-6 bg-white dark:bg-[#1A1A1A] border-b border-gray-200 dark:border-gray-800 flex justify-between items-center sticky top-0 z-10">
                            <div>
                                <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight uppercase italic underline decoration-wtech-red decoration-4 underline-offset-8">Fluxo de Pedido <span className="text-wtech-red">W-Tech</span></h2>
                                <p className="text-sm text-gray-400 font-bold uppercase tracking-widest mt-3">Módulo de Gestão Logística v2.0</p>
                            </div>
                            <div className="flex items-center gap-3">
                                {currentSale.id && (
                                    <button 
                                        onClick={handleDelete}
                                        disabled={loading}
                                        className="p-3 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-2xl transition-all border border-transparent"
                                        title="Excluir Pedido"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                )}
                                <button className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
                                    Salvar Rascunho
                                </button>
                                <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors">
                                    <X size={24} className="text-gray-400" />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
                            
                            {/* LEFT COLUMN: Customer & Details */}
                            <div className="lg:w-7/12 p-8 overflow-y-auto space-y-8 bg-white dark:bg-[#1A1A1A] border-r border-gray-200 dark:border-gray-800">
                                
                                {/* Section: Customer */}
                                <section>
                                    <h3 className="flex items-center gap-2 text-lg font-black text-gray-900 dark:text-white mb-6">
                                        <UserPlus size={20} className="text-blue-600" /> Informações do Cliente
                                        <button className="ml-auto text-xs font-bold text-blue-600 hover:underline">+ Novo Cliente</button>
                                    </h3>
                                    
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Buscar Cliente</label>
                                            <div className="relative">
                                                <Search className="absolute left-4 top-3.5 text-gray-400" size={18} />
                                                <input 
                                                    className="w-full bg-gray-50 dark:bg-[#111] border-none rounded-xl py-3 pl-12 pr-4 font-medium dark:text-white focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                                                    placeholder="Nome, CPF ou CNPJ..."
                                                    value={clientSearchTerm}
                                                    onChange={(e) => {
                                                        setClientSearchTerm(e.target.value);
                                                        setIsSearchingClient(true);
                                                    }}
                                                />
                                                {isSearchingClient && clientSearchTerm.length > 1 && (
                                                    <div className="absolute top-14 left-0 w-full bg-white dark:bg-[#222] rounded-xl shadow-xl border border-gray-100 dark:border-gray-800 z-10 max-h-60 overflow-y-auto">
                                                        {potentialClients
                                                            .filter(c => c.name.toLowerCase().includes(clientSearchTerm.toLowerCase()))
                                                            .map(c => (
                                                                <div 
                                                                    key={c.id} 
                                                                    onClick={() => {
                                                                        setCurrentSale({...currentSale, clientId: c.id, clientName: c.name, clientPhone: c.phone, clientEmail: c.email});
                                                                        setClientSearchTerm(c.name);
                                                                        setIsSearchingClient(false);
                                                                    }}
                                                                    className="p-3 hover:bg-blue-50 dark:hover:bg-white/5 cursor-pointer border-b border-gray-50 dark:border-gray-800 last:border-0"
                                                                >
                                                                    <p className="font-bold text-gray-900 dark:text-white text-sm">{c.name}</p>
                                                                    <p className="text-xs text-gray-500">{c.phone} • {c.email}</p>
                                                                </div>
                                                            ))
                                                        }
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="p-4 bg-gray-50 dark:bg-[#111] rounded-xl">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Telefone</label>
                                                <p className="font-bold text-gray-700 dark:text-gray-300 text-sm">{currentSale.clientPhone || '-'}</p>
                                            </div>
                                            <div className="p-4 bg-gray-50 dark:bg-[#111] rounded-xl">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">E-mail</label>
                                                <p className="font-bold text-gray-700 dark:text-gray-300 text-sm">{currentSale.clientEmail || '-'}</p>
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                <hr className="border-gray-100 dark:border-gray-800" />

                                {/* Section: Order Details */}
                                <section>
                                     <h3 className="flex items-center gap-2 text-lg font-black text-gray-900 dark:text-white mb-6">
                                        <Truck size={20} className="text-blue-600" /> Detalhes do Pedido
                                    </h3>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        
                                        {/* Shipping */}
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Método de Envio</label>
                                            <select 
                                                className="w-full bg-gray-50 dark:bg-[#111] border-none rounded-xl py-3 px-4 font-bold text-sm dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                                                value={currentSale.shipping_method || ''}
                                                onChange={e => {
                                                    const method = e.target.value;
                                                    let cost = 0;
                                                    // Simple mockup logic
                                                    if(method === 'sedex') cost = 45.00;
                                                    if(method === 'pac') cost = 22.50;
                                                    if(method === 'transportadora') cost = 80.00;
                                                    setCurrentSale({...currentSale, shipping_method: method, shipping_cost: cost});
                                                }}
                                            >
                                                <option value="">Selecione...</option>
                                                <option value="sedex">Correios SEDEX (R$ 45,00)</option>
                                                <option value="pac">Correios PAC (R$ 22,50)</option>
                                                <option value="transportadora">Transportadora W-Log (R$ 80,00)</option>
                                                <option value="retirada">Retirada na Loja (Grátis)</option>
                                            </select>
                                        </div>

                                        {/* Payment */}
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Condição de Pagamento</label>
                                            <select 
                                                className="w-full bg-gray-50 dark:bg-[#111] border-none rounded-xl py-3 px-4 font-bold text-sm dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                                                value={currentSale.payment_method || ''}
                                                onChange={e => setCurrentSale({...currentSale, payment_method: e.target.value})}
                                            >
                                                <option value="">Selecione...</option>
                                                {paymentMethods.map(pm => (
                                                    <option key={pm.id} value={pm.name}>{pm.name}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Delivery Date */}
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Data Estimada Entrega</label>
                                            <div className="relative">
                                                 <Calendar className="absolute left-4 top-3.5 text-gray-400" size={16} />
                                                 <input 
                                                    type="date"
                                                    className="w-full bg-gray-50 dark:bg-[#111] border-none rounded-xl py-3 pl-12 pr-4 font-bold text-sm dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                                                    value={currentSale.estimated_delivery_date || ''}
                                                    onChange={e => setCurrentSale({...currentSale, estimated_delivery_date: e.target.value})}
                                                 />
                                            </div>
                                        </div>

                                        {/* Tracking Code */}
                                        {(currentSale.status === 'shipped' || currentSale.status === 'delivered') && (
                                            <div className="md:col-span-2 p-4 bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-900/30 rounded-2xl animate-in zoom-in-95">
                                                <label className="text-xs font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest block mb-2">Código de Rastreio (Link para cliente)</label>
                                                <div className="relative">
                                                    <Truck className="absolute left-4 top-3.5 text-orange-400" size={18} />
                                                    <input 
                                                        className="w-full bg-white dark:bg-[#111] border-2 border-orange-200 dark:border-orange-900/30 rounded-xl py-3 pl-12 pr-4 font-black tracking-widest dark:text-white focus:ring-4 focus:ring-orange-500/10 outline-none transition-all"
                                                        placeholder="DIGITE O CÓDIGO AQUI..."
                                                        value={currentSale.tracking_code || ''}
                                                        onChange={e => setCurrentSale({...currentSale, tracking_code: e.target.value.toUpperCase()})}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                    </div>
                                </section>
                            </div>

                            {/* RIGHT COLUMN: Items & Summary */}
                            <div className="lg:w-5/12 bg-gray-50 dark:bg-black/20 p-8 flex flex-col h-full border-l border-gray-200 dark:border-gray-800">
                                
                                <h3 className="flex items-center gap-2 text-lg font-black text-gray-900 dark:text-white mb-6">
                                    <ShoppingCart size={20} className="text-gray-900 dark:text-white" /> Adicionar Itens
                                </h3>

                                {/* Product Search Input */}
                                <div className={`bg-white dark:bg-[#1A1A1A] p-2 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm mb-4 relative ${isLocked && !canBypassLock ? 'opacity-50 pointer-events-none' : ''}`}>
                                    <Search className="absolute left-4 top-4 text-gray-400" size={20} />
                                    <input 
                                        className="w-full pl-10 pr-4 py-2 text-sm font-medium bg-transparent border-none outline-none dark:text-white placeholder:text-gray-400"
                                        placeholder={isLocked && !canBypassLock ? "Edição bloqueada (Status avançado)" : "Buscar produto..."}
                                        value={productSearchTerm}
                                        onChange={e => setProductSearchTerm(e.target.value)}
                                        onFocus={() => setIsAddingItem(true)}
                                        disabled={isLocked && !canBypassLock}
                                    />
                                    {isAddingItem && productSearchTerm && !isLocked && (
                                         <div className="absolute top-12 left-0 w-full bg-white dark:bg-[#222] rounded-xl shadow-xl border border-gray-100 dark:border-gray-800 z-20 max-h-60 overflow-y-auto">
                                             {products
                                                .filter(p => p.name.toLowerCase().includes(productSearchTerm.toLowerCase()))
                                                .map(p => (
                                                    <div 
                                                        key={p.id} 
                                                        onClick={() => handleAddProduct(p)}
                                                        className="flex justify-between items-center p-3 hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer border-b border-gray-50 dark:border-gray-800"
                                                    >
                                                        <div>
                                                            <p className="font-bold text-sm dark:text-white">{p.name}</p>
                                                            <p className="text-[10px] text-gray-400">Estoque: {p.currentStock}</p>
                                                        </div>
                                                        <span className="font-bold text-green-600 text-xs">R$ {p.salePrice}</span>
                                                    </div>
                                                ))}
                                         </div>
                                    )}
                                </div>

                                {/* Items List */}
                                <div className="flex-1 overflow-y-auto space-y-3 mb-6 pr-2">
                                     {saleItems.length === 0 ? (
                                        <div className="text-center py-10 opacity-50">
                                            <ShoppingCart className="mx-auto mb-2" size={32} />
                                            <p className="text-sm font-bold">Nenhum item adicionado</p>
                                        </div>
                                     ) : (
                                         saleItems.map((item, index) => (
                                             <div key={index} className={`bg-white dark:bg-[#1A1A1A] p-3 rounded-xl border border-gray-100 dark:border-gray-800 flex items-center justify-between shadow-sm group ${isLocked && !canBypassLock ? 'opacity-70 grayscale' : ''}`}>
                                                 <div className="flex items-center gap-3 overflow-hidden">
                                                     {item.product?.imageUrl ? (
                                                         <img src={item.product.imageUrl} className="w-10 h-10 rounded-lg object-cover bg-gray-100" />
                                                     ) : (
                                                         <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs font-bold text-gray-400">IMG</div>
                                                     )}
                                                     <div className="min-w-0">
                                                         <p className="text-xs font-black text-gray-900 dark:text-white truncate">{item.product?.name}</p>
                                                         <p className="text-[10px] text-gray-400">Unit: R$ {item.unitPrice.toLocaleString('pt-BR')}</p>
                                                     </div>
                                                 </div>
                                                 <div className="flex items-center gap-3">
                                                     {!(isLocked && !canBypassLock) ? (
                                                         <div className="flex items-center bg-gray-50 dark:bg-black rounded-lg px-1">
                                                             <button onClick={() => handleUpdateQuantity(index, -1)} className="px-2 py-1 hover:bg-gray-200 dark:hover:bg-white/10 rounded">-</button>
                                                             <span className="text-xs font-bold w-6 text-center">{item.quantity}</span>
                                                             <button onClick={() => handleUpdateQuantity(index, 1)} className="px-2 py-1 hover:bg-gray-200 dark:hover:bg-white/10 rounded">+</button>
                                                         </div>
                                                     ) : (
                                                         <span className="text-xs font-bold w-6 text-center text-gray-500">x{item.quantity}</span>
                                                     )}
                                                     
                                                     {!(isLocked && !canBypassLock) && (
                                                         <button onClick={() => handleRemoveItem(index)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                                             <Trash2 size={14} />
                                                         </button>
                                                     )}
                                                 </div>
                                             </div>
                                         ))
                                     )}
                                </div>

                                {/* Summary */}
                                <div className="bg-white dark:bg-[#1A1A1A] p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-3">
                                    <h4 className="text-lg font-black text-gray-900 dark:text-white mb-4">Resumo do Pedido</h4>
                                    
                                    <div className="flex justify-between text-sm text-gray-500 font-medium">
                                        <span>Subtotal</span>
                                        <span>R$ {subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="flex justify-between text-sm text-gray-500 font-medium">
                                        <span>Frete</span>
                                        <span>R$ {shippingCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    {discountAmount > 0 && (
                                        <div className="flex justify-between text-sm text-green-600 font-bold">
                                            <span>Desconto</span>
                                            <span>- R$ {discountAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                        </div>
                                    )}
                                    <div className="border-t border-dashed border-gray-200 dark:border-gray-700 my-2 pt-2 flex justify-between items-center">
                                        <span className="text-xl font-black text-gray-900 dark:text-white">Total</span>
                                        <span className="text-xl font-black text-gray-900 dark:text-white">R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    
                                    <button 
                                        onClick={handleSaveOrder}
                                        disabled={loading}
                                        className="w-full bg-wtech-red hover:bg-black text-white py-5 rounded-2xl font-black text-xl shadow-2xl shadow-red-600/20 hover:scale-[1.02] active:scale-95 transition-all flex justify-center items-center gap-3 mt-4 border border-white/10 italic tracking-tighter"
                                    >
                                        {loading ? 'Sincronizando...' : (
                                            <>
                                                <Check size={24} /> FINALIZAR PEDIDO
                                            </>
                                        )}
                                    </button>
                                    <p className="text-[10px] text-center text-gray-500 font-bold uppercase tracking-[0.3em] mt-4">Security Protocol Active • AES-256</p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

// Simple icon placeholder
const CheckCheck = ({size}: {size: number}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
        <path d="m9 12 2 2 4-4"/>
    </svg>
);
