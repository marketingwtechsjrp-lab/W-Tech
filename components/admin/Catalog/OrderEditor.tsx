import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, ShoppingCart, Plus, Trash2, UserPlus, AlertTriangle, Truck, CreditCard, Calendar, Check, Tag, ArrowRight, Shield, ArrowLeft, MapPin } from 'lucide-react';
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
    const [activeStep, setActiveStep] = useState<'items' | 'checkout'>('items');
    const [manualItem, setManualItem] = useState({ name: '', quantity: 1, price: 0 });
    const [isManualMode, setIsManualMode] = useState(false);

    const subtotal = saleItems.reduce((acc, item) => acc + (item.unitPrice * item.quantity), 0);
    const shippingCost = currentSale.shipping_cost || 0;
    const insuranceCost = (currentSale.shipping_method === 'sedex' || currentSale.shipping_method === 'pac') ? (subtotal * 0.01) : 0;
    const discountAmount = currentSale.discount_amount || 0;
    const total = subtotal + shippingCost + insuranceCost - discountAmount;

    // Freight Calculation Logic
    const calculateFreight = (cep: string, items: any[]) => {
        if (!cep || items.length === 0) return 0;
        // Mock logic: Base R$ 15 + R$ 2 per item + small random for ZIP variation
        const base = 15.00;
        const perItem = items.reduce((acc, i) => acc + i.quantity, 0) * 2.5;
        const regionFactor = parseInt(cep.substring(0, 2)) / 5; // Variation based on state code
        return Number((base + perItem + regionFactor).toFixed(2));
    };

    const handleCEPBlur = async () => {
        const cep = currentSale.delivery_cep?.replace(/\D/g, '');
        if (cep?.length === 8) {
            try {
                const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
                const data = await res.json();
                if (!data.erro) {
                    const fullAddress = `${data.logradouro}, ${data.bairro}, ${data.localidade} - ${data.uf}`;
                    const freight = calculateFreight(cep, saleItems);
                    setCurrentSale(prev => ({ 
                        ...prev, 
                        delivery_address: fullAddress,
                        shipping_cost: freight,
                        shipping_method: 'Correios (Auto)'
                    }));
                }
            } catch (e) {
                console.error('Error fetching CEP:', e);
            }
        }
    };

    // Locking Logic
    const isLocked = ['paid', 'producing', 'shipped', 'delivered'].includes(currentSale.status || '');
    const canBypassLock = user?.role === 'Admin' || user?.role === 'Super Admin' || user?.role === 'Manager' || 
                          (typeof user?.role === 'object' && (user.role.name === 'Admin' || user.role.name === 'Super Admin' || user.role.level >= 10));

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
            if (editingSale?.discount_code) setDiscountCode(editingSale.discount_code);
        }
    }, [isOpen, editingSale?.id]); // Use editingSale.id to avoid unnecessary re-triggers from deep objects


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

    const handleAddManualItem = () => {
        if (!manualItem.name || manualItem.price <= 0) return alert('Preencha nome e valor corretamente.');
        
        setSaleItems(prev => [...prev, {
            id: Math.random().toString(),
            saleId: '',
            productId: 'manual-' + Date.now(),
            quantity: manualItem.quantity,
            unitPrice: manualItem.price,
            product: { 
                id: 'manual', 
                name: manualItem.name + ' (Item Manual)', 
                type: 'product',
                salePrice: manualItem.price,
                currentStock: 0
            } as any
        }]);
        
        setManualItem({ name: '', quantity: 1, price: 0 });
        setIsManualMode(false);
    };

    const handleUpdateQuantity = (index: number, delta: number) => {
        const newItems = [...saleItems];
        newItems[index].quantity = Math.max(1, newItems[index].quantity + delta);
        setSaleItems(newItems);
    };

    const handleUpdateStatus = (index: number, delta: number) => {
        handleUpdateQuantity(index, delta);
    };

    // Auto-recalculate freight when items change
    useEffect(() => {
        if (currentSale.delivery_cep?.replace(/\D/g, '').length === 8) {
            const newFreight = calculateFreight(currentSale.delivery_cep, saleItems);
            if (newFreight !== currentSale.shipping_cost) {
                setCurrentSale(prev => ({ ...prev, shipping_cost: newFreight }));
            }
        }
    }, [saleItems.length, saleItems.reduce((acc, i) => acc + i.quantity, 0)]);

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
        console.log('🔵 handleSaveOrder CHAMADO');
        console.log('Cliente ID:', currentSale.clientId);
        console.log('Itens:', saleItems.length);
        console.log('Loading:', loading);
        
        if (!currentSale.clientId) {
            console.log('❌ ERRO: Cliente não selecionado');
            return alert('Selecione um cliente.');
        }
        if (saleItems.length === 0) {
            console.log('❌ ERRO: Nenhum item no pedido');
            return alert('Adicione produtos ao pedido.');
        }
        if (loading) {
            console.log('❌ ERRO: Já está salvando');
            return;
        }
        
        console.log('✅ Validações OK - Iniciando salvamento...');
        setLoading(true);
        try {
            // Sanitize Payload
            console.log('📦 Montando payload...');
            const salePayload = {
                client_id: currentSale.clientId,
                client_name: currentSale.clientName || '',
                client_email: currentSale.clientEmail || null,
                client_phone: currentSale.clientPhone || null,
                channel: currentSale.channel || 'Admin',
                status: currentSale.status || 'pending',
                total_value: Number(total.toFixed(2)),
                payment_method: currentSale.payment_method || null, 
                notes: currentSale.notes || '',
                seller_id: user?.id,
                // A COLUNA 'items' (JSON) É A FONTE DA VERDADE PARA ITENS MANUAIS
                items: JSON.stringify(saleItems.map(i => ({ 
                    productId: i.productId, 
                    name: i.product?.name, 
                    quantity: i.quantity, 
                    price: i.unitPrice 
                }))),
                shipping_method: currentSale.shipping_method || null,
                shipping_cost: Number(Number(shippingCost).toFixed(2)),
                insurance_cost: Number(Number(insuranceCost).toFixed(2)),
                discount_code: discountCode || null,
                discount_amount: Number(Number(discountAmount).toFixed(2)),
                estimated_delivery_date: currentSale.estimated_delivery_date ? currentSale.estimated_delivery_date : null,
                tracking_code: currentSale.tracking_code || null,
                delivery_address: currentSale.delivery_address || null,
                delivery_cep: currentSale.delivery_cep || null
            };
            
            console.log('📦 Payload montado:', salePayload);

            let saleId = currentSale.id;

            if (saleId) {
                console.log('📝 Atualizando pedido existente:', saleId);
                const { error: updateError } = await supabase.from('SITE_Sales').update(salePayload).eq('id', saleId);
                if (updateError) throw updateError;
                console.log('✅ Pedido atualizado');
                
                // Wipe relational items
                await supabase.from('SITE_SaleItems').delete().eq('sale_id', saleId);
                await supabase.from('SITE_StockMovements').delete().eq('reference_id', saleId);
            } else {
                console.log('➕ Criando novo pedido...');
                const { data, error: insertError } = await supabase.from('SITE_Sales').insert([salePayload]).select().single();
                if (insertError) {
                    console.error('❌ Erro ao inserir:', insertError);
                    throw insertError;
                }
                saleId = data.id;
                console.log('✅ Pedido criado com ID:', saleId);
            }

            // FILTER MANUAL ITEMS to prevent UUID errors in relational tables
            // Manuais são salvos apenas no JSON 'items' da tabela SITE_Sales por enquanto
            const validItems = saleItems.filter(item => !item.productId.toString().startsWith('manual-'));

            // Insert Items (Batch)
            const itemsToInsert = validItems.map(item => ({
                sale_id: saleId,
                product_id: item.productId,
                quantity: item.quantity,
                unit_price: item.unitPrice
            }));
            
            if (itemsToInsert.length > 0) {
                const { error: itemsError } = await supabase.from('SITE_SaleItems').insert(itemsToInsert);
                if (itemsError) throw itemsError;
            }

            // Stock Reservation Logic (Batch Optimized)
            const stockMovementsToInsert = validItems.map(item => ({
                product_id: item.productId,
                type: 'RESERVED',
                quantity: item.quantity,
                origin: 'Venda',
                reference_id: saleId,
                notes: `Pedido #${saleId?.slice(0,8)}`
            }));

            if (stockMovementsToInsert.length > 0) {
                const { error: stockError } = await supabase.from('SITE_StockMovements').insert(stockMovementsToInsert);
                if (stockError) throw stockError;
            }
            
            // Save successful
            console.log('🔄 Chamando onSave()...');
            // We call onSave which typically unmounts this component
            await onSave();
            console.log('✅ Pedido salvo e refresh disparado');

        } catch (error: any) {
            console.error('Erro ao salvar pedido:', error);
            const msg = error.message || error.error_description || 'Erro desconhecido';
            const details = error.details || error.hint || '';
            alert(`Erro ao processar pedido: ${msg} ${details}`);
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
        <div className="h-full w-full flex flex-col bg-[#F8F9FC] dark:bg-[#0A0A0A] overflow-hidden">
            {/* Top Navigation Bar */}
            <div className="bg-white dark:bg-[#1A1A1A] border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between shrink-0">
                <button 
                    onClick={onClose}
                    className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors font-bold"
                >
                    <ArrowLeft size={20} />
                    <span className="hidden sm:inline">Voltar ao Kanban</span>
                </button>
                
                <div className="text-center">
                    <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight uppercase italic">
                        {currentSale.id ? 'Editar Pedido' : 'Novo Pedido'}
                    </h2>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">
                        Módulo de Gestão Logística v2.0
                    </p>
                </div>
                
                <div className="flex items-center gap-3">
                    {currentSale.id && (
                        <button 
                            onClick={handleDelete}
                            disabled={loading}
                            className="px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-all font-bold flex items-center gap-2"
                        >
                            <Trash2 size={18} />
                            <span className="hidden sm:inline">Deletar</span>
                        </button>
                    )}
                    <button 
                        onClick={handleSaveOrder}
                        disabled={loading || !currentSale.clientId || saleItems.length === 0}
                        className="px-6 py-2 bg-wtech-red hover:bg-black text-white rounded-xl font-black transition-all flex items-center gap-2 disabled:opacity-30"
                    >
                        <Check size={18} />
                        {loading ? 'Salvando...' : 'Salvar Pedido'}
                    </button>
                </div>
            </div>

            {/* Step Indicator */}
            <div className="bg-white dark:bg-[#1A1A1A] px-8 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-center gap-8 shrink-0">
                <button 
                    onClick={() => setActiveStep('items')}
                    className={`flex items-center gap-2 py-2 border-b-2 transition-all font-black text-xs uppercase tracking-widest ${activeStep === 'items' ? 'border-wtech-red text-wtech-red' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                >
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] ${activeStep === 'items' ? 'bg-wtech-red text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>1</span>
                    Carrinho
                </button>
                <div className="w-8 h-[1px] bg-gray-200 dark:bg-gray-800" />
                <button 
                    onClick={() => { if (currentSale.clientId && saleItems.length > 0) setActiveStep('checkout'); }}
                    disabled={!currentSale.clientId || saleItems.length === 0}
                    className={`flex items-center gap-2 py-2 border-b-2 transition-all font-black text-xs uppercase tracking-widest ${activeStep === 'checkout' ? 'border-wtech-red text-wtech-red' : 'border-transparent text-gray-400 hover:text-gray-600'} disabled:opacity-30`}
                >
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] ${activeStep === 'checkout' ? 'bg-wtech-red text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>2</span>
                    Finalizar
                </button>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-hidden">
                            {activeStep === 'items' ? (
                                <div className="h-full flex flex-col lg:flex-row bg-white dark:bg-[#1A1A1A] min-h-0">
                                    {/* Sidebar: Client Search */}
                                    <div className="lg:w-1/3 p-4 md:p-8 border-r border-gray-100 dark:border-gray-800 space-y-6 overflow-y-auto shrink-0">
                                        <section>
                                            <h3 className="flex items-center gap-2 text-sm font-black text-gray-900 dark:text-white mb-4 uppercase tracking-wider">
                                                <UserPlus size={18} className="text-blue-600" /> Cliente
                                            </h3>
                                            <div className="relative mb-4">
                                                <Search className="absolute left-4 top-3 text-gray-400" size={16} />
                                                <input 
                                                    className="w-full bg-gray-50 dark:bg-[#111] border-none rounded-xl py-2.5 pl-11 pr-4 text-sm font-medium dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                                    placeholder="Buscar cliente..."
                                                    value={clientSearchTerm}
                                                    onChange={(e) => {
                                                        setClientSearchTerm(e.target.value);
                                                        setIsSearchingClient(true);
                                                    }}
                                                />
                                                {isSearchingClient && clientSearchTerm.length > 1 && (
                                                    <div className="absolute top-12 left-0 w-full bg-white dark:bg-[#222] rounded-xl shadow-2xl border border-gray-100 dark:border-gray-800 z-50 max-h-60 overflow-y-auto font-sans">
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
                                                                    <p className="font-bold text-gray-900 dark:text-white text-xs">{c.name}</p>
                                                                    <p className="text-[10px] text-gray-500">{c.phone}</p>
                                                                </div>
                                                            ))
                                                        }
                                                    </div>
                                                )}
                                            </div>

                                                    {currentSale.clientId && (
                                                        <div className="p-4 bg-gray-50 dark:bg-black/20 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-4">
                                                            <div className="flex justify-between items-start">
                                                                <div className="flex-1">
                                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Selecionado</p>
                                                                    <p className="text-sm font-black text-gray-800 dark:text-white leading-tight">{currentSale.clientName}</p>
                                                                </div>
                                                                <div className="bg-blue-500/10 text-blue-500 p-1.5 rounded-lg">
                                                                    <Check size={14} />
                                                                </div>
                                                            </div>
                                                            
                                                            <div className="space-y-3 pt-2 border-t border-gray-200 dark:border-gray-800/50">
                                                                <div>
                                                                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">CEP de Entrega</label>
                                                                    <input 
                                                                        type="text"
                                                                        placeholder="00000-000"
                                                                        className="w-full bg-white dark:bg-[#111] border border-gray-200 dark:border-gray-800 rounded-xl py-2 px-3 text-xs font-bold dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                                                                        value={currentSale.delivery_cep || ''}
                                                                        onChange={e => setCurrentSale({...currentSale, delivery_cep: e.target.value})}
                                                                        onBlur={handleCEPBlur}
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Endereço Confirmado</label>
                                                                    <textarea 
                                                                        className="w-full bg-white dark:bg-[#111] border border-gray-200 dark:border-gray-800 rounded-xl py-2 px-3 text-[10px] font-bold dark:text-white outline-none focus:ring-2 focus:ring-blue-500 h-16 resize-none"
                                                                        placeholder="Rua, Número, Bairro, Cidade..."
                                                                        value={currentSale.delivery_address || ''}
                                                                        onChange={e => setCurrentSale({...currentSale, delivery_address: e.target.value})}
                                                                    />
                                                                </div>
                                                                <button 
                                                                    onClick={() => alert('Endereço confirmado para este pedido!')}
                                                                    className="w-full bg-blue-600 text-white py-2 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                                                                >
                                                                    <MapPin size={12} /> Confirmar Endereço
                                                                </button>
                                                            </div>

                                                            <div className="flex gap-4 pt-2 border-t border-gray-200 dark:border-gray-800/50">
                                                                <div className="flex-1">
                                                                    <p className="text-[9px] font-bold text-gray-400 uppercase">Fone</p>
                                                                    <p className="text-xs font-bold dark:text-gray-300">{currentSale.clientPhone || '-'}</p>
                                                                </div>
                                                                <div className="flex-1">
                                                                    <p className="text-[9px] font-bold text-gray-400 uppercase">E-mail</p>
                                                                    <p className="text-xs font-bold dark:text-gray-300 truncate w-32">{currentSale.clientEmail || '-'}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                        </section>

                                        <section className="pt-4">
                                            <div className="flex justify-between items-center mb-4">
                                                <h3 className="flex items-center gap-2 text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider">
                                                    <ShoppingCart size={18} className="text-gray-400" /> Catálogo
                                                </h3>
                                                <button 
                                                    onClick={() => setIsManualMode(!isManualMode)}
                                                    className={`text-[9px] font-black uppercase px-2 py-1 rounded-md border transition-all ${isManualMode ? 'bg-wtech-red border-wtech-red text-white' : 'border-gray-200 text-gray-400 hover:border-gray-400'}`}
                                                >
                                                    {isManualMode ? 'Voltar para Busca' : '+ Item Manual'}
                                                </button>
                                            </div>

                                            {isManualMode ? (
                                                <div className="p-4 bg-gray-50 dark:bg-black/20 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 space-y-4 animate-in fade-in slide-in-from-top-2">
                                                    <div>
                                                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Nome do Item</label>
                                                        <input 
                                                            className="w-full bg-white dark:bg-[#111] border border-gray-100 dark:border-gray-800 rounded-xl py-2 px-3 text-xs font-bold dark:text-white outline-none focus:ring-2 focus:ring-wtech-red"
                                                            placeholder="Ex: Serviço de Instalação especial..."
                                                            value={manualItem.name}
                                                            onChange={e => setManualItem({...manualItem, name: e.target.value})}
                                                        />
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div>
                                                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Qtd</label>
                                                            <input 
                                                                type="number"
                                                                className="w-full bg-white dark:bg-[#111] border border-gray-100 dark:border-gray-800 rounded-xl py-2 px-3 text-xs font-bold dark:text-white outline-none focus:ring-2 focus:ring-wtech-red"
                                                                value={manualItem.quantity}
                                                                onChange={e => setManualItem({...manualItem, quantity: Number(e.target.value)})}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Valor Unit.</label>
                                                            <input 
                                                                type="number"
                                                                className="w-full bg-white dark:bg-[#111] border border-gray-100 dark:border-gray-800 rounded-xl py-2 px-3 text-xs font-bold dark:text-white outline-none focus:ring-2 focus:ring-wtech-red"
                                                                placeholder="0,00"
                                                                value={manualItem.price || ''}
                                                                onChange={e => setManualItem({...manualItem, price: Number(e.target.value)})}
                                                            />
                                                        </div>
                                                    </div>
                                                    <button 
                                                        onClick={handleAddManualItem}
                                                        className="w-full bg-gray-900 dark:bg-white dark:text-black text-white py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all"
                                                    >
                                                        Adicionar ao Carrinho
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="relative mb-4">
                                                    <Search className="absolute left-4 top-3 text-gray-400" size={16} />
                                                    <input 
                                                        className="w-full bg-gray-50 dark:bg-[#111] border-none rounded-xl py-2.5 pl-11 pr-4 text-sm font-medium dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all font-sans"
                                                        placeholder="Buscar produto no estoque..."
                                                        value={productSearchTerm}
                                                        onChange={e => setProductSearchTerm(e.target.value)}
                                                        onFocus={() => setIsAddingItem(true)}
                                                        disabled={isLocked && !canBypassLock}
                                                    />
                                                    {isAddingItem && productSearchTerm && !isLocked && (
                                                         <div className="absolute top-12 left-0 w-full bg-white dark:bg-[#222] rounded-xl shadow-2xl border border-gray-100 dark:border-gray-800 z-40 max-h-80 overflow-y-auto font-sans">
                                                             {products
                                                                .filter(p => p.name.toLowerCase().includes(productSearchTerm.toLowerCase()))
                                                                .map(p => (
                                                                    <div 
                                                                        key={p.id} 
                                                                        onClick={() => handleAddProduct(p)}
                                                                        className="flex justify-between items-center p-3 hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer border-b border-gray-50 dark:border-gray-800 last:border-0"
                                                                    >
                                                                        <div className="min-w-0">
                                                                            <p className="font-bold text-xs dark:text-white truncate">{p.name}</p>
                                                                            <p className="text-[9px] text-gray-400 uppercase">Estoque: {p.currentStock}</p>
                                                                        </div>
                                                                        <span className="font-black text-green-600 text-xs ml-2">R$ {p.salePrice.toLocaleString('pt-BR')}</span>
                                                                    </div>
                                                                ))}
                                                         </div>
                                                    )}
                                                </div>
                                            )}
                                        </section>
                                        
                                        <div className="pt-8 space-y-3">
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs font-bold text-gray-400 uppercase">Itens no Carrinho</span>
                                                <span className="text-sm font-black text-gray-900 dark:text-white">{saleItems.length}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs font-bold text-gray-400 uppercase">Subtotal</span>
                                                <span className="text-sm font-black text-gray-900 dark:text-white italic">R$ {subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                            </div>
                                            <button 
                                                onClick={() => setActiveStep('checkout')}
                                                disabled={saleItems.length === 0 || !currentSale.clientId}
                                                className="w-full bg-wtech-red hover:bg-black text-white py-4 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-20 shadow-xl shadow-red-600/10 italic"
                                            >
                                                Próximo: Logística <ArrowRight size={18} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Main Content: Full Product List */}
                                    <div className="flex-1 p-4 md:p-8 overflow-y-auto bg-gray-50 dark:bg-black/30 min-h-0">
                                        <div className="max-w-4xl mx-auto space-y-6">
                                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                                                <div>
                                                    <h3 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white tracking-tight italic uppercase">Carrinho do Cliente</h3>
                                                    <p className="text-[10px] md:text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Gerencie a lista de produtos selecionados</p>
                                                </div>
                                                {saleItems.length > 0 && (
                                                    <button onClick={() => setSaleItems([])} className="text-[10px] font-black text-red-500 uppercase hover:underline">Limpar Tudo</button>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                                                {saleItems.length === 0 ? (
                                                    <div className="md:col-span-2 py-20 text-center opacity-40 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-3xl">
                                                        <ShoppingCart className="mx-auto mb-4" size={48} />
                                                        <p className="text-lg font-black uppercase italic">Nenhum produto adicionado</p>
                                                        <p className="text-sm">Use o campo de busca à esquerda para adicionar itens.</p>
                                                    </div>
                                                ) : (
                                                    saleItems.map((item, index) => (
                                                        <motion.div 
                                                            layout 
                                                            key={index}
                                                            className="bg-white dark:bg-[#1A1A1A] p-5 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center justify-between group hover:border-blue-500/30 transition-all"
                                                        >
                                                            <div className="flex items-center gap-4 overflow-hidden">
                                                                <div className="w-14 h-14 rounded-2xl bg-gray-50 dark:bg-black flex items-center justify-center overflow-hidden shrink-0 border border-gray-100 dark:border-gray-800">
                                                                    {item.product?.imageUrl ? (
                                                                        <img src={item.product.imageUrl} className="w-full h-full object-cover" />
                                                                    ) : (
                                                                        <ShoppingCart className="text-gray-300" size={24} />
                                                                    )}
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <p className="font-black text-gray-900 dark:text-white italic uppercase truncate">{item.product?.name}</p>
                                                                    <p className="text-xs font-bold text-gray-400 mt-0.5">UN: R$ {item.unitPrice.toLocaleString('pt-BR')}</p>
                                                                </div>
                                                            </div>
                                                            
                                                            <div className="flex flex-col items-end gap-2">
                                                                <div className="flex items-center bg-gray-100 dark:bg-black rounded-xl p-1 shadow-inner border border-gray-200 dark:border-gray-800">
                                                                    <button onClick={() => handleUpdateQuantity(index, -1)} className="px-2 py-1 hover:bg-white dark:hover:bg-white/10 rounded-lg text-lg font-bold transition-all">-</button>
                                                                    <span className="text-sm font-black px-3 min-w-[32px] text-center">{item.quantity}</span>
                                                                    <button onClick={() => handleUpdateQuantity(index, 1)} className="px-2 py-1 hover:bg-white dark:hover:bg-white/10 rounded-lg text-lg font-bold transition-all">+</button>
                                                                </div>
                                                                <button onClick={() => handleRemoveItem(index)} className="text-[10px] font-black text-gray-300 hover:text-red-500 uppercase transition-colors">Remover</button>
                                                            </div>
                                                        </motion.div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="h-full flex flex-col lg:flex-row bg-[#F8F9FC] dark:bg-black/40 min-h-0">
                                    {/* Checkout Step: Left Info */}
                                    <div className="lg:w-1/2 p-6 md:p-10 overflow-y-auto space-y-8 md:space-y-10 border-r border-gray-100 dark:border-gray-800">
                                        <section>
                                            <h3 className="flex items-center gap-3 text-lg md:text-xl font-black text-gray-900 dark:text-white mb-6 md:mb-8 italic uppercase text-blue-600">
                                                <Truck size={24} /> Logística e Entrega
                                            </h3>
                                            
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Método de Envio</label>
                                                    <select 
                                                        className="w-full bg-white dark:bg-[#111] border border-gray-200 dark:border-gray-800 rounded-2xl py-4 px-5 font-black text-sm dark:text-white outline-none focus:ring-4 focus:ring-blue-500/10 transition-all appearance-none cursor-pointer"
                                                        value={currentSale.shipping_method || ''}
                                                        onChange={e => {
                                                            const method = e.target.value;
                                                            let cost = 0;
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

                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Data Estimada</label>
                                                    <div className="relative">
                                                         <Calendar className="absolute left-5 top-4 text-gray-400" size={18} />
                                                         <input 
                                                            type="date"
                                                            className="w-full bg-white dark:bg-[#111] border border-gray-200 dark:border-gray-800 rounded-2xl py-4 pl-14 pr-5 font-black text-sm dark:text-white outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-sans"
                                                            value={currentSale.estimated_delivery_date || ''}
                                                            onChange={e => setCurrentSale({...currentSale, estimated_delivery_date: e.target.value})}
                                                         />
                                                    </div>
                                                </div>

                                                <div className="md:col-span-2 space-y-2">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Condição de Pagamento</label>
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                        {paymentMethods.map(pm => (
                                                            <button
                                                                key={pm.id}
                                                                onClick={() => setCurrentSale({...currentSale, payment_method: pm.name})}
                                                                className={`py-3 px-4 rounded-xl font-bold text-xs transition-all border ${currentSale.payment_method === pm.name ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white dark:bg-[#111] border-gray-200 dark:border-gray-800 text-gray-500 hover:border-gray-400'}`}
                                                            >
                                                                {pm.name}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                                
                                                {(currentSale.status === 'shipped' || currentSale.status === 'delivered') && (
                                                    <div className="md:col-span-2 p-6 bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-900/30 rounded-3xl space-y-3">
                                                        <label className="text-[10px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest block">Código de Rastreio</label>
                                                        <div className="relative">
                                                            <Truck className="absolute left-5 top-4.5 text-orange-400" size={20} />
                                                            <input 
                                                                className="w-full bg-white dark:bg-[#111] border-2 border-orange-200 dark:border-orange-900/30 rounded-2xl py-4 pl-14 pr-6 font-black tracking-widest text-lg dark:text-white focus:ring-8 focus:ring-orange-500/10 outline-none transition-all placeholder:text-gray-300"
                                                                placeholder="DIGITE O CÓDIGO"
                                                                value={currentSale.tracking_code || ''}
                                                                onChange={e => setCurrentSale({...currentSale, tracking_code: e.target.value.toUpperCase()})}
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </section>

                                        <section>
                                            <h3 className="flex items-center gap-3 text-xl font-black text-gray-900 dark:text-white mb-6 italic uppercase text-gray-400">
                                                <ShoppingCart size={24} /> Itens do Pedido
                                            </h3>
                                            <div className="space-y-2">
                                                {saleItems.map((item, i) => (
                                                    <div key={i} className="flex justify-between items-center text-sm py-2 border-b border-gray-100 dark:border-gray-800 last:border-0 opacity-60">
                                                        <div className="flex gap-4">
                                                            <span className="font-black text-gray-400 w-8">x{item.quantity}</span>
                                                            <span className="font-bold text-gray-700 dark:text-gray-300 uppercase italic truncate max-w-[200px]">{item.product?.name}</span>
                                                        </div>
                                                        <span className="font-black text-gray-900 dark:text-white italic">R$ {(item.unitPrice * item.quantity).toLocaleString('pt-BR')}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </section>
                                    </div>

                                    {/* Checkout Step: Right Summary */}
                                    <div className="lg:w-1/2 p-6 md:p-10 bg-white dark:bg-[#1A1A1A] flex flex-col justify-center overflow-y-auto">
                                        <div className="max-w-md mx-auto w-full space-y-6 md:space-y-8">
                                            <div>
                                                <h3 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white italic uppercase tracking-tighter">Resumo Financeiro</h3>
                                                <p className="text-[10px] md:text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Conferência final de valores</p>
                                            </div>

                                            <div className="space-y-4">
                                                <div className="bg-gray-50 dark:bg-black/20 p-6 rounded-3xl border border-gray-100 dark:border-gray-800">
                                                    <div className="flex items-center gap-2 text-[11px] font-black text-gray-400 uppercase tracking-widest mb-4">
                                                        <Tag size={14} className="text-vibrant-blue" /> Ajuste de Desconto
                                                    </div>
                                                    <div className="relative">
                                                        <span className="absolute left-5 top-4.5 text-gray-400 font-black text-sm italic">R$</span>
                                                        <input 
                                                            type="number"
                                                            className="w-full pl-12 pr-6 py-4 bg-white dark:bg-[#111] border border-gray-200 dark:border-gray-800 rounded-2xl text-xl font-black dark:text-white focus:ring-8 focus:ring-blue-500/10 outline-none transition-all placeholder:text-gray-300 italic"
                                                            placeholder="0,00"
                                                            value={currentSale.discount_amount || ''}
                                                            onChange={e => setCurrentSale({...currentSale, discount_amount: Number(e.target.value)})}
                                                        />
                                                    </div>
                                                </div>

                                                <div className="space-y-4 px-2">
                                                    <div className="flex justify-between items-center text-gray-500 font-bold uppercase text-xs tracking-widest">
                                                        <span>Subtotal</span>
                                                        <span className="text-sm font-black text-gray-700 dark:text-gray-300 italic">R$ {subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center text-gray-500 font-bold uppercase text-xs tracking-widest">
                                                        <span>Frete ({currentSale.shipping_method || 'Não sel.'})</span>
                                                        <span className="text-sm font-black text-gray-700 dark:text-gray-300 italic">R$ {shippingCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                                    </div>
                                                    {insuranceCost > 0 && (
                                                        <div className="flex justify-between items-center text-blue-500 font-bold uppercase text-xs tracking-widest italic">
                                                            <span className="flex items-center gap-1"><Shield size={12} /> Seguro Correios (1%)</span>
                                                            <span className="text-sm font-black italic">R$ {insuranceCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                                        </div>
                                                    )}
                                                    {discountAmount > 0 && (
                                                        <div className="flex justify-between items-center text-wtech-red font-bold uppercase text-xs tracking-widest italic animate-pulse">
                                                            <span>Desconto Aplicado</span>
                                                            <span className="text-sm font-black italic">- R$ {discountAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="bg-black dark:bg-[#111] p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-2xl space-y-6 relative overflow-hidden group">
                                                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-wtech-red via-blue-500 to-wtech-red group-hover:h-2 transition-all duration-700 opacity-50" />
                                                    <div className="flex justify-between items-center relative z-10">
                                                        <span className="text-gray-400 font-black uppercase text-[10px] md:text-sm tracking-widest italic">Total Final</span>
                                                        <span className="text-3xl md:text-4xl font-black text-white italic tracking-tighter">R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                                    </div>
                                                    
                                                    <button 
                                                        onClick={handleSaveOrder}
                                                        disabled={loading}
                                                        className="w-full bg-wtech-red hover:bg-white hover:text-black py-4 md:py-6 rounded-xl md:rounded-[1.5rem] font-black text-lg md:text-2xl shadow-2xl hover:scale-[1.03] active:scale-95 transition-all flex justify-center items-center gap-4 border border-white/5 italic uppercase tracking-tighter"
                                                    >
                                                        {loading ? 'Processando...' : (
                                                            <>
                                                                <Check size={28} strokeWidth={3} /> Finalizar Pedido
                                                            </>
                                                        )}
                                                    </button>
                                                    
                                                    <div className="flex justify-center gap-6 opacity-20 group-hover:opacity-40 transition-opacity">
                                                        <Truck size={20} className="text-white" />
                                                        <CreditCard size={20} className="text-white" />
                                                        <Shield size={20} className="text-white" />
                                                    </div>
                                                </div>
                                                
                                                <button 
                                                    onClick={() => setActiveStep('items')}
                                                    className="w-full text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] py-2 hover:text-gray-600 transition-colors"
                                                >
                                                    ← Voltar para edição de itens
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
    );
};

// Simple icon placeholder
const CheckCheck = ({size}: {size: number}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
        <path d="m9 12 2 2 4-4"/>
    </svg>
);
