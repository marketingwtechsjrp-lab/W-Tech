import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, ShoppingCart, Plus, Trash2, UserPlus, AlertTriangle, Truck, CreditCard, Calendar, Check, Tag, ArrowRight, Shield, ArrowLeft, MapPin, RefreshCw } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { Sale, SaleItem, Product } from '../../../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FileDown, Printer, Receipt, Zap, Loader2, CheckCircle2, Copy, ExternalLink } from 'lucide-react';
import { useSettings } from '../../../context/SettingsContext';
import { createStripePaymentLink } from '../../../lib/stripe';
import { getExchangeRates, convertBRLTo, ExchangeRates } from '../../../lib/currency';
import { TrendingUp } from 'lucide-react';

interface NewOrderModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    onDelete?: (id: string) => void;
    editingSale: Partial<Sale> | null;
    user: any;
    permissions?: any;
    initialItems?: (SaleItem & { product?: Product })[];
}

export const NewOrderModal: React.FC<NewOrderModalProps> = ({ isOpen, onClose, onSave, onDelete, editingSale, user, permissions, initialItems = [] }) => {
    // ---- State ----
    const [currentSale, setCurrentSale] = useState<Partial<any>>({}); // using any for flexibility with new fields for now
    const [saleItems, setSaleItems] = useState<(SaleItem & { product?: Product })[]>([]);
    const [loading, setLoading] = useState(false);

    // Data Sources
    const [products, setProducts] = useState<Product[]>([]);
    const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
    const [potentialClients, setPotentialClients] = useState<any[]>([]);
    const [filteredClients, setFilteredClients] = useState<any[]>([]);

    // Search/UI State
    const [isSearchingClient, setIsSearchingClient] = useState(false);
    const [clientSearchTerm, setClientSearchTerm] = useState('');
    const [isAddingItem, setIsAddingItem] = useState(false);
    const [productSearchTerm, setProductSearchTerm] = useState('');
    const [discountCode, setDiscountCode] = useState('');
    const [activeStep, setActiveStep] = useState<'items' | 'checkout'>('items');
    const [manualItem, setManualItem] = useState({ name: '', quantity: 1, price: 0 });
    const [isManualMode, setIsManualMode] = useState(false);
    const [isChangingAddress, setIsChangingAddress] = useState(false);
    const [showClientResults, setShowClientResults] = useState(false);
    const [isGeneratingStripeLink, setIsGeneratingStripeLink] = useState(false);
    const [stripePaymentUrl, setStripePaymentUrl] = useState<string | null>(null);
    const [stripeLinkCopied, setStripeLinkCopied] = useState(false);
    const [exchangeRates, setExchangeRates] = useState<ExchangeRates | null>(null);
    const [targetCurrency, setTargetCurrency] = useState<'BRL' | 'USD' | 'EUR'>('BRL');
    const [linkAmount, setLinkAmount] = useState(0);

    const subtotal = saleItems.reduce((acc, item) => acc + (item.unitPrice * item.quantity), 0);
    const shippingCost = currentSale.shipping_cost || 0;
    const insuranceCost = (currentSale.shipping_method === 'sedex' || currentSale.shipping_method === 'pac') ? (subtotal * 0.01) : 0;
    const discountAmount = currentSale.discount_amount || 0;
    const total = subtotal + shippingCost + insuranceCost - discountAmount;

    // Freight Calculation Logic
    const calculateFreight = (destCep: string, items: any[]) => {
        if (!destCep || items.length === 0) return 0;
        
        const cleanDest = destCep.replace(/\D/g, '');
        const cleanOrig = '12242000'; // Wtech - São José dos Campos
        
        // Mock distance calculation based on ZIP code regions
        const origRegion = parseInt(cleanOrig.substring(0, 2));
        const destRegion = parseInt(cleanDest.substring(0, 2));
        const distanceFactor = Math.abs(origRegion - destRegion) + 1;
        
        // Total Weight calculation
        const totalWeight = items.reduce((acc, item) => {
            const weight = item.product?.weight || 0.5; // Default 500g if missing
            return acc + (weight * item.quantity);
        }, 0);

        const basePrice = 18.50;
        const weightPrice = totalWeight * 4.20; // R$ 4,20 per kg
        const distanceMarkup = distanceFactor * 2.50; // Distance multiplier

        return Number((basePrice + weightPrice + distanceMarkup).toFixed(2));
    };

    const handleCEPLookup = async (cep: string) => {
        const cleanCEP = cep.replace(/\D/g, '');
        if (cleanCEP.length !== 8) return;

        try {
            const response = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);
            const data = await response.json();

            if (data.erro) return;

            setCurrentSale(prev => ({
                ...prev,
                delivery_cep: cleanCEP,
                delivery_street: data.logradouro,
                delivery_neighborhood: data.bairro,
                delivery_city: data.localidade,
                delivery_state: data.uf,
                shipping_cost: calculateFreight(cleanCEP, saleItems)
            }));
        } catch (error) {
            console.error('CEP Lookup error:', error);
        }
    };

    const handleGenerateStripeLink = async () => {
        if (!currentSale.clientName || total <= 0) return;
        
        setIsGeneratingStripeLink(true);
        try {
            // If target currency is not BRL, we need to ensure we have the correct link amount
            let finalPrice = total;
            let finalCurrency = targetCurrency;

            if (targetCurrency !== 'BRL' && exchangeRates) {
                const conv = await convertBRLTo(total, targetCurrency as any, exchangeRates);
                finalPrice = conv.value;
            }

            const result = await createStripePaymentLink({
                title: `Pedido ${currentSale.order_number || 'Novo'} - W-Tech`,
                price: finalPrice,
                currency: finalCurrency,
                email: currentSale.clientEmail,
                orderId: currentSale.id // If editing, we have an ID
            });

            if (result.success && result.url) {
                setStripePaymentUrl(result.url);
                
                // Update the sale with the Stripe link and session ID
                if (currentSale.id) {
                    await supabase
                        .from('SITE_Sales')
                        .update({ 
                            stripe_payment_url: result.url,
                            stripe_session_id: result.sessionId,
                            payment_method: 'Stripe'
                        })
                        .eq('id', currentSale.id);
                }
                
                setCurrentSale(prev => ({ 
                    ...prev, 
                    stripe_payment_url: result.url,
                    stripe_session_id: result.sessionId,
                    payment_method: 'Stripe'
                }));
            } else {
                alert('Erro ao gerar link do Stripe: ' + result.error);
            }
        } catch (error: any) {
            alert('Erro: ' + error.message);
        } finally {
            setIsGeneratingStripeLink(false);
        }
    };

    const handleCopyStripeLink = () => {
        if (!stripePaymentUrl) return;
        navigator.clipboard.writeText(stripePaymentUrl);
        setStripeLinkCopied(true);
        setTimeout(() => setStripeLinkCopied(false), 2000);
    };

    // Locking Logic
    const isLocked = ['paid', 'producing', 'shipped', 'delivered'].includes(currentSale.status || '');
    const canBypassLock = user?.role === 'Admin' || user?.role === 'Super Admin' || permissions?.orders_edit_paid ||
                          (typeof user?.role === 'object' && (user.role.name === 'Admin' || user.role.name === 'Super Admin' || user.role.level >= 10 || user.role.permissions?.orders_edit_paid));

    useEffect(() => {
        if (isOpen) {
            loadInitialData();
            const fetchRates = async () => {
                const rates = await getExchangeRates();
                setExchangeRates(rates);
            };
            fetchRates();
            setSaleItems(initialItems);
            // Default State
            setCurrentSale(editingSale || { 
                channel: 'Admin', 
                status: 'pending', 
                shipping_method: '',
                shipping_cost: 0,
                insurance_cost: 0,
                discount_amount: 0,
                order_number: `WT-${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 100)}`
            });
            if (editingSale?.clientId) setClientSearchTerm(editingSale.clientName || '');
            if (editingSale?.discount_code) setDiscountCode(editingSale.discount_code);
        }
    }, [isOpen, editingSale?.id]); // Use editingSale.id to avoid unnecessary re-triggers from deep objects


    // ---- Data Loading ----
    const loadInitialData = async () => {
        // 1. Products
        const { data: prods } = await supabase.from('SITE_Products').select('*').eq('type', 'product');
        if (prods) setProducts(prods.map((p: any) => ({ 
            ...p, 
            currentStock: p.current_stock, 
            salePrice: Number(p.sale_price),
            priceRetail: Number(p.price_retail || p.sale_price),
            pricePartner: Number(p.price_partner || p.sale_price),
            priceMechanic: Number(p.price_mechanic || (p.price_retail || p.sale_price) * 0.9),
            priceDistributor: Number(p.price_distributor || p.sale_price)
        })));

        // 2. Payment Methods
        const { data: pays } = await supabase.from('SITE_PaymentMethods').select('*').eq('is_active', true);
        if (pays) setPaymentMethods(pays);

        // 3. Clients (Initial load - recent or alphabetical)
        const { data: leads } = await supabase.from('SITE_Leads').select('id, name, phone, email, address, zip_code, address_street, address_number, address_neighborhood, address_city, address_state, pricing_level').order('name').limit(20);
        const { data: mechanics } = await supabase.from('SITE_Mechanics').select('id, name, phone, email, zip_code, address_street, address_number, address_neighborhood, address_city, address_state, pricing_level').order('name').limit(20);
        
        const initialClients = [
            ...(leads || []).map((l: any) => ({ ...l, type: 'Lead' })), 
            ...(mechanics || []).map((m: any) => ({ ...m, type: 'Credenciado' }))
        ];
        setPotentialClients(initialClients);
        setFilteredClients(initialClients);
    };

    const handleClientSearch = async (term: string) => {
        setClientSearchTerm(term);
        if (term.length <= 1) {
            setFilteredClients(potentialClients);
            return;
        }

        setIsSearchingClient(true);
        setShowClientResults(true);
        try {
            // Search in both tables
            const [leadsRes, mechanicsRes] = await Promise.all([
                supabase.from('SITE_Leads').select('id, name, phone, email, address, zip_code, address_street, address_number, address_neighborhood, address_city, address_state, pricing_level').ilike('name', `%${term}%`).limit(20),
                supabase.from('SITE_Mechanics').select('id, name, phone, email, zip_code, address_street, address_number, address_neighborhood, address_city, address_state, pricing_level').ilike('name', `%${term}%`).limit(20)
            ]);

            const searchResults = [
                ...(leadsRes.data || []).map((l: any) => ({ ...l, type: 'Lead' })),
                ...(mechanicsRes.data || []).map((m: any) => ({ ...m, type: 'Credenciado' }))
            ].sort((a, b) => a.name.localeCompare(b.name));

            setFilteredClients(searchResults);
        } catch (error) {
            console.error('Error searching clients:', error);
        } finally {
            setIsSearchingClient(false);
        }
    };

    // ---- Handlers ----
    const handleUpdatePricingLevel = (level: 'retail' | 'partner' | 'distributor' | 'mechanic') => {
        setCurrentSale(prev => ({ ...prev, pricing_level: level }));
        
        // Update prices of all items already in the cart
        setSaleItems(prevItems => prevItems.map(item => {
            if (item.productId === 'manual') return item;
            
            const product = item.product;
            if (!product) return item;

            let newPrice = product.salePrice;
            if (level === 'partner') newPrice = product.pricePartner || product.salePrice;
            else if (level === 'mechanic') newPrice = product.priceMechanic || product.salePrice;
            else if (level === 'distributor') newPrice = product.priceDistributor || product.salePrice;
            else if (level === 'retail') newPrice = product.priceRetail || product.salePrice;

            return { ...item, unitPrice: newPrice };
        }));
    };

    const handleAddProduct = (product: Product) => {
        // Determine correct price based on client's pricing level
        let selectedPrice = product.salePrice;
        const level = currentSale.pricing_level;
        
        if (level === 'partner') selectedPrice = product.pricePartner || product.salePrice;
        else if (level === 'mechanic') selectedPrice = product.priceMechanic || product.salePrice;
        else if (level === 'distributor') selectedPrice = product.priceDistributor || product.salePrice;
        else if (level === 'retail') selectedPrice = product.priceRetail || product.salePrice;

        setSaleItems(prev => [...prev, {
            id: Math.random().toString(),
            saleId: '',
            productId: product.id,
            quantity: 1,
            unitPrice: selectedPrice,
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

    // Helper for Disabled State
    const isDisabled = isLocked && !canBypassLock;

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
                delivery_cep: currentSale.delivery_cep || null,
                delivery_street: currentSale.delivery_street || null,
                delivery_number: currentSale.delivery_number || null,
                delivery_neighborhood: currentSale.delivery_neighborhood || null,
                delivery_city: currentSale.delivery_city || null,
                delivery_state: currentSale.delivery_state || null,
                pricing_level: currentSale.pricing_level || null,
                order_number: currentSale.order_number || null
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

    const { settings } = useSettings();

    const handleExportPDF = () => {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        
        // Styling Constants
        const primaryColor = [184, 21, 21]; // WTech Red
        const darkColor = [26, 26, 26];

        // --- HEADER ---
        doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.rect(0, 0, pageWidth, 40, 'F');
        
        // Logo / Title
        if (settings.logo_url) {
             try {
                 // Try to use logo if format is supported (JPEG/PNG)
                 // Note: jsPDF addImage requires base64 or raw data usually, passing URL usually works if CORS allows
                 // For now, we'll assume the URL implies the brand, but we'll stick to text if image fails or for safety
                 // We will prioritize Text for reliability unless we implement image fetching
             } catch (e) {}
        }
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.text(settings.site_title?.toUpperCase() || 'W-TECH', 15, 25);
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('PERFORMANCE & TECNOLOGIA', 15, 32);

        // Order Info Header
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        const orderLabel = currentSale.order_number 
            ? `PEDIDO: ${currentSale.order_number}` 
            : `ORÇAMENTO ${currentSale.id ? '#' + currentSale.id.slice(0, 6).toUpperCase() : ''}`;
        doc.text(orderLabel, pageWidth - 15, 20, { align: 'right' });
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, pageWidth - 15, 28, { align: 'right' });
        doc.text(`Atendente: ${user?.name || 'Equipe W-Tech'}`, pageWidth - 15, 33, { align: 'right' });

        // --- COMPANY INFO (Top Left below header) ---
        // Optional: If we want to show company info at the very top, we can. 
        // But design typically puts it in footer or main block.
        // Let's stick to user request: "Logo, Endereço, Telefone"
        
        // --- CLIENT & DELIVERY SECTION ---
        let yPos = 55;
        
        doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('DADOS DO CLIENTE', 15, yPos);
        doc.text('ENDEREÇO DE ENTREGA', 110, yPos);
        
        yPos += 7;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        
        // Client Data
        doc.text(`Nome: ${currentSale.clientName || 'N/A'}`, 15, yPos);
        doc.text(`E-mail: ${currentSale.clientEmail || 'N/A'}`, 15, yPos + 5);
        doc.text(`WhatsApp: ${currentSale.clientPhone || 'N/A'}`, 15, yPos + 10);
        
        // Delivery Data
        const addressText = currentSale.delivery_street 
            ? `${currentSale.delivery_street}, ${currentSale.delivery_number || 'SN'}\n${currentSale.delivery_neighborhood || ''}\n${currentSale.delivery_city || ''} - ${currentSale.delivery_state || ''}\nCEP: ${currentSale.delivery_cep || ''}`
            : 'Endereço não informado / Retirada';
            
        const addrLines = doc.splitTextToSize(addressText, 85);
        doc.text(addrLines, 110, yPos);

        // --- ITEMS TABLE ---
        const tableBody = saleItems.map(item => [
            { content: item.product?.sku || '-', styles: { fontStyle: 'bold' } },
            item.product?.name || 'Item Manual',
            `${item.quantity}`,
            new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.unitPrice),
            new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.unitPrice * item.quantity)
        ]);

        autoTable(doc, {
            startY: 85,
            head: [['SKU', 'PRODUTO', 'QTD', 'VALOR UN', 'SUBTOTAL']],
            body: tableBody,
            headStyles: { fillColor: primaryColor as [number, number, number], textColor: 255, fontStyle: 'bold', fontSize: 9, halign: 'center' },
            bodyStyles: { fontSize: 8, textColor: 50, halign: 'center' },
            columnStyles: {
                1: { halign: 'left' } // Product name left aligned
            },
            alternateRowStyles: { fillColor: [250, 250, 250] },
            margin: { left: 15, right: 15 }
        });

        // --- SUMMARY ---
        const finalY = (doc as any).lastAutoTable.finalY + 10;
        const summaryX = pageWidth - 90;
        let summaryY = finalY;

        // Gray Box for Numbers
        doc.setFillColor(248, 248, 248);
        doc.rect(pageWidth - 95, summaryY - 5, 80, 60, 'F');

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(80);
        
        const addSummaryLine = (label: string, value: number, isBold = false, color: any = null) => {
            if (color) doc.setTextColor(color[0], color[1], color[2]);
            else doc.setTextColor(80);
            
            if (isBold) doc.setFont('helvetica', 'bold');
            else doc.setFont('helvetica', 'normal');
            
            doc.text(label, summaryX, summaryY);
            doc.text(new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value), pageWidth - 20, summaryY, { align: 'right' });
            summaryY += 6;
        };

        addSummaryLine('Subtotal:', subtotal);
        addSummaryLine(`Frete (${currentSale.shipping_method || '-'}):`, shippingCost);
        if (insuranceCost > 0) addSummaryLine('Seguro:', insuranceCost);
        if (discountAmount > 0) addSummaryLine('Descontos:', discountAmount, false, primaryColor);

        // Divider
        summaryY += 2;
        doc.setDrawColor(200);
        doc.line(summaryX, summaryY - 4, pageWidth - 20, summaryY - 4);
        summaryY += 2;

        // Total
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
        doc.text('TOTAL:', summaryX, summaryY);
        doc.text(new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total), pageWidth - 20, summaryY, { align: 'right' });

        // --- PARTNERSHIP SAVINGS ---
        const subtotalRetail = saleItems.reduce((acc, i) => acc + ((i.product?.priceRetail || i.unitPrice) * i.quantity), 0);
        const totalSavings = subtotalRetail - subtotal;
        
        if (totalSavings > 0) {
            doc.setFillColor(34, 197, 94, 0.1); 
            doc.rect(15, finalY - 5, 80, 25, 'F');
            doc.setTextColor(21, 128, 61); // Green-700
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.text('ECONOMIA DA PARCERIA', 20, finalY + 5);
            doc.setFontSize(12);
            doc.text(new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalSavings), 20, finalY + 15);
        }

        // --- FOOTER ---
        const footerY = pageHeight - 30;
        doc.setDrawColor(230);
        doc.line(15, footerY, pageWidth - 15, footerY);
        
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.setFont('helvetica', 'normal');
        
        // Company Data from Config
        const companyInfo = [];
        if (settings.address) companyInfo.push(settings.address);
        if (settings.phone) companyInfo.push(`Tel: ${settings.phone}`);
        if (settings.email) companyInfo.push(settings.email);
        if (settings.website_url) companyInfo.push(settings.website_url);

        const footerText = companyInfo.join(' | ');
        const brandText = `${settings.site_title || 'W-TECH'} - ${settings.site_description || 'Performance & Tecnologia'}`;
        
        doc.text(brandText, pageWidth / 2, footerY + 8, { align: 'center' });
        doc.text(footerText, pageWidth / 2, footerY + 14, { align: 'center' });

        doc.save(`${currentSale.order_number || 'Orcamento'}_${currentSale.clientName || 'Cliente'}.pdf`);
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
        <div className="h-full w-full flex flex-col bg-[#F8F9FC] dark:bg-[var(--admin-surface-1)] overflow-hidden">
            {/* Top Navigation Bar */}
            <div className="bg-[var(--admin-surface-1)] border-b border-[var(--admin-border)] px-6 py-4 flex items-center justify-between shrink-0">
                <button 
                    onClick={onClose}
                    className="flex items-center gap-2 px-4 py-2 text-[var(--admin-text-secondary)] hover:text-gray-900 dark:hover:text-white transition-colors font-bold"
                >
                    <ArrowLeft size={20} />
                    <span className="hidden sm:inline">Voltar ao Kanban</span>
                </button>
                
                <div className="text-center">
                    <h2 className="text-xl font-black text-[var(--admin-text-primary)] tracking-tight uppercase italic">
                        {currentSale.id ? 'Editar Pedido' : 'Novo Pedido'}
                    </h2>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">
                        Módulo de Gestão Logística v3.0.2
                    </p>
                </div>
                
                <div className="flex items-center gap-3">
                    {currentSale.id && (
                        <button 
                            onClick={handleExportPDF}
                            className="px-4 py-2 border border-blue-100 dark:border-blue-900/30 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/10 rounded-xl transition-all font-bold flex items-center gap-2"
                            title="Exportar Orçamento / Pedido"
                        >
                            <FileDown size={18} />
                            <span className="hidden sm:inline">Exportar PDF</span>
                        </button>
                    )}
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
            <div className="bg-[var(--admin-surface-1)] px-8 py-3 border-b border-[var(--admin-border)] flex items-center justify-center gap-8 shrink-0">
                <button 
                    onClick={() => setActiveStep('items')}
                    className={`flex items-center gap-2 py-2 border-b-2 transition-all font-black text-xs uppercase tracking-widest ${activeStep === 'items' ? 'border-wtech-red text-wtech-red' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                >
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] ${activeStep === 'items' ? 'bg-wtech-red text-white' : 'bg-[var(--admin-surface-3)] text-[var(--admin-text-tertiary)]'}`}>1</span>
                    Carrinho
                </button>
                <div className="w-8 h-[1px] bg-[var(--admin-border)]" />
                <button 
                    onClick={() => { if (currentSale.clientId && saleItems.length > 0) setActiveStep('checkout'); }}
                    disabled={!currentSale.clientId || saleItems.length === 0}
                    className={`flex items-center gap-2 py-2 border-b-2 transition-all font-black text-xs uppercase tracking-widest ${activeStep === 'checkout' ? 'border-wtech-red text-wtech-red' : 'border-transparent text-gray-400 hover:text-gray-600'} disabled:opacity-30`}
                >
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] ${activeStep === 'checkout' ? 'bg-wtech-red text-white' : 'bg-[var(--admin-surface-3)] text-[var(--admin-text-tertiary)]'}`}>2</span>
                    Finalizar
                </button>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-hidden">
                            {activeStep === 'items' ? (
                                <div className="h-full flex flex-col lg:flex-row bg-[var(--admin-surface-1)] min-h-0">
                                    {/* Sidebar: Client Search */}
                                    <div className="lg:w-1/3 p-4 md:p-8 border-r border-[var(--admin-border)] space-y-6 overflow-y-auto shrink-0">
                                        <section>
                                            <h3 className="flex items-center gap-2 text-sm font-black text-[var(--admin-text-primary)] mb-4 uppercase tracking-wider">
                                                <UserPlus size={18} className="text-blue-600" /> Cliente
                                            </h3>
                                            <div className="relative mb-4">
                                                <Search className="absolute left-4 top-3 text-gray-400" size={16} />
                                                    <input 
                                                        className="w-full bg-[var(--admin-surface-2)] border-none rounded-xl py-2.5 pl-11 pr-4 text-sm font-medium text-[var(--admin-text-primary)] outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                                        placeholder="Buscar cliente..."
                                                        value={clientSearchTerm}
                                                        onChange={(e) => handleClientSearch(e.target.value)}
                                                        onFocus={() => clientSearchTerm.length > 1 && setShowClientResults(true)}
                                                    />
                                                    {showClientResults && clientSearchTerm.length > 1 && (
                                                        <div className="absolute top-12 left-0 w-full bg-[var(--admin-surface-2)] rounded-xl shadow-2xl border border-[var(--admin-border)] z-50 max-h-60 overflow-y-auto font-sans">
                                                            {filteredClients.length > 0 ? (
                                                                filteredClients.map(c => (
                                                                <div 
                                                                    key={c.id} 
                                                                    onClick={() => {
                                                                        setCurrentSale({
                                                                            ...currentSale, 
                                                                            clientId: c.id, 
                                                                            clientName: c.name, 
                                                                            clientPhone: c.phone, 
                                                                            clientEmail: c.email,
                                                                            delivery_cep: c.zip_code,
                                                                            delivery_street: c.address_street,
                                                                            delivery_number: c.address_number,
                                                                            delivery_neighborhood: c.address_neighborhood,
                                                                            delivery_city: c.address_city,
                                                                            delivery_state: c.address_state,
                                                                            pricing_level: (c.pricing_level && c.pricing_level !== 'retail') ? c.pricing_level : (c.type === 'Credenciado' ? 'partner' : 'retail')
                                                                        });
                                                                        setIsChangingAddress(false);
                                                                        setClientSearchTerm(c.name);
                                                                        setIsSearchingClient(false);
                                                                        setShowClientResults(false);
                                                                    }}
                                                                    className="p-3 hover:bg-[var(--admin-surface-2)] cursor-pointer border-b border-[var(--admin-border)] last:border-0"
                                                                >
                                                                    <div className="flex justify-between items-center">
                                                                        <p className="font-bold text-[var(--admin-text-primary)] text-xs">{c.name}</p>
                                                                        <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-black uppercase ${c.type === 'Credenciado' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                                                                            {c.type}
                                                                        </span>
                                                                    </div>
                                                                    <p className="text-[10px] text-gray-500">{c.phone}</p>
                                                                </div>
                                                            ))
                                                            ) : (
                                                                <div className="p-4 text-center text-xs text-gray-400">
                                                                    {isSearchingClient ? 'Buscando...' : 'Nenhum cliente encontrado'}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                            </div>

                                            {currentSale.clientId && (
                                                <motion.div 
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    className="p-6 bg-[var(--admin-surface-1)] rounded-[2rem] border-2 border-blue-500/20 shadow-xl space-y-5 relative overflow-hidden group"
                                                >
                                                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 blur-3xl rounded-full translate-x-12 -translate-y-12"></div>
                                                    
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Selecionado</p>
                                                            <div className="flex items-center gap-3">
                                                                <p className="text-xl font-black text-[var(--admin-text-primary)] italic tracking-tighter uppercase">{currentSale.clientName}</p>
                                                                {currentSale.pricing_level && (
                                                                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest italic border ${
                                                                        currentSale.pricing_level === 'retail' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                                                        currentSale.pricing_level === 'partner' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                                                                        'bg-purple-50 text-purple-600 border-purple-100'
                                                                    }`}>
                                                                        {currentSale.pricing_level === 'retail' ? 'Final' : 
                                                                         currentSale.pricing_level === 'partner' ? 'Credenciados' : 
                                                                         currentSale.pricing_level === 'mechanic' ? 'Mec sem curso' : 'Distribuidor'}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-500 border border-blue-200 dark:border-blue-800">
                                                            <Check size={16} />
                                                        </div>
                                                    </div>

                                                    <div className="space-y-4">
                                                        {/* Nível de Preço Selector */}
                                                        <div className="p-4 bg-gray-50/50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5 space-y-3">
                                                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                                                <Tag size={12} className="text-blue-500" /> Tabela de Preços Ativa:
                                                            </p>
                                                            <div className="grid grid-cols-2 gap-2">
                                                                {[
                                                                    { id: 'retail', label: 'Final', color: 'blue', activeClass: 'bg-blue-600 border-blue-600 shadow-blue-500/20' },
                                                                    { id: 'partner', label: 'Credenc.', color: 'orange', activeClass: 'bg-orange-600 border-orange-600 shadow-orange-500/20' },
                                                                    { id: 'mechanic', label: 'Mec sem curso', color: 'cyan', activeClass: 'bg-cyan-600 border-cyan-600 shadow-cyan-500/20' },
                                                                    { id: 'distributor', label: 'Distrib.', color: 'purple', activeClass: 'bg-purple-600 border-purple-600 shadow-purple-500/20' }
                                                                ].map(lvl => (
                                                                    <button
                                                                        key={lvl.id}
                                                                        onClick={() => handleUpdatePricingLevel(lvl.id as any)}
                                                                        className={`py-2 px-1 rounded-lg text-[9px] font-black uppercase tracking-tight transition-all border ${currentSale.pricing_level === lvl.id ? `${lvl.activeClass} text-white shadow-lg` : 'bg-[var(--admin-surface-2)] border-[var(--admin-border)] text-gray-400 hover:border-gray-200'}`}
                                                                    >
                                                                        {lvl.label}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        {!isChangingAddress ? (
                                                            <div className="space-y-3 p-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900/20">
                                                                <div className="flex justify-between items-start">
                                                                    <div className="space-y-1">
                                                                        <label className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest block">Endereço de Entrega</label>
                                                                        <p className="text-xs font-bold leading-relaxed text-[var(--admin-text-secondary)]">
                                                                            {currentSale.delivery_street ? (
                                                                                <>
                                                                                    {currentSale.delivery_street}, {currentSale.delivery_number || 'SN'}<br/>
                                                                                    {currentSale.delivery_neighborhood} — {currentSale.delivery_city}/{currentSale.delivery_state}
                                                                                </>
                                                                            ) : (
                                                                                <span className="italic text-gray-400">Endereço não cadastrado</span>
                                                                            )}
                                                                        </p>
                                                                    </div>
                                                                    <button 
                                                                        onClick={() => setIsChangingAddress(true)}
                                                                        className="p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-xl transition-all"
                                                                        title="Mudar Endereço"
                                                                    >
                                                                        <RefreshCw size={16} />
                                                                    </button>
                                                                </div>

                                                                <button 
                                                                    onClick={() => setActiveStep('checkout')}
                                                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black text-[10px] uppercase tracking-[0.2em] py-3.5 rounded-xl shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-3 active:scale-95 mt-2"
                                                                >
                                                                    <MapPin size={16} /> Confirmar Endereço
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                                                <div className="flex justify-between items-center px-1">
                                                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Novo Endereço (CEP)</label>
                                                                    <button 
                                                                        onClick={() => setIsChangingAddress(false)}
                                                                        className="text-[9px] font-black text-blue-500 hover:underline uppercase"
                                                                    >
                                                                        Cancelar
                                                                    </button>
                                                                </div>
                                                                <div className="grid grid-cols-3 gap-3">
                                                                    <div className="col-span-2 space-y-1.5">
                                                                        <div className="relative">
                                                                            <input 
                                                                                className="w-full bg-[var(--admin-surface-2)] border border-[var(--admin-border)] rounded-xl py-3 px-4 text-sm font-black text-[var(--admin-text-primary)] outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-gray-300"
                                                                                value={currentSale.delivery_cep || ''}
                                                                                placeholder="00000-000"
                                                                                autoFocus
                                                                                onChange={e => {
                                                                                    const val = e.target.value;
                                                                                    setCurrentSale({...currentSale, delivery_cep: val});
                                                                                    if (val.replace(/\D/g, '').length === 8) handleCEPLookup(val);
                                                                                }}
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                    <div className="space-y-1.5">
                                                                        <input 
                                                                            className="w-full bg-[var(--admin-surface-2)] border border-[var(--admin-border)] rounded-xl py-3 px-2 text-sm font-black text-[var(--admin-text-primary)] outline-none focus:ring-2 focus:ring-blue-500 transition-all text-center"
                                                                            value={currentSale.delivery_number || ''}
                                                                            placeholder="Nº"
                                                                            onChange={e => setCurrentSale({...currentSale, delivery_number: e.target.value})}
                                                                        />
                                                                    </div>
                                                                </div>

                                                                <div className="space-y-1.5">
                                                                    <textarea 
                                                                        rows={2}
                                                                        className="w-full bg-[var(--admin-surface-2)] border border-[var(--admin-border)] rounded-2xl py-3 px-4 text-xs font-bold leading-relaxed text-[var(--admin-text-secondary)] outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
                                                                        placeholder="Rua, Bairro, Cidade..."
                                                                        value={`${currentSale.delivery_street || ''}${currentSale.delivery_neighborhood ? ' - ' + currentSale.delivery_neighborhood : ''}${currentSale.delivery_city ? '\n' + currentSale.delivery_city : ''}${currentSale.delivery_state ? ' / ' + currentSale.delivery_state : ''}`}
                                                                        readOnly
                                                                    />
                                                                </div>

                                                                <button 
                                                                    onClick={() => {
                                                                        setIsChangingAddress(false);
                                                                        setActiveStep('checkout');
                                                                    }}
                                                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black text-[10px] uppercase tracking-[0.2em] py-4 rounded-xl shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-3 active:scale-95"
                                                                >
                                                                    <Check size={16} /> Usar Este Endereço
                                                                </button>
                                                            </div>
                                                        )}

                                                        <div className="pt-4 border-t border-[var(--admin-border)] grid grid-cols-2 gap-4">
                                                                <div>
                                                                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Fone</p>
                                                                    <p className="text-[11px] font-black text-[var(--admin-text-primary)] tracking-tight">{currentSale.clientPhone || 'N/A'}</p>
                                                                </div>
                                                                <div className="text-right">
                                                                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">E-mail</p>
                                                                    <p className="text-[11px] font-black text-[var(--admin-text-primary)] tracking-tight truncate lowercase">{currentSale.clientEmail || 'N/A'}</p>
                                                                </div>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </section>

                                        <section className="pt-4">
                                            <div className="flex justify-between items-center mb-4">
                                                <h3 className="flex items-center gap-2 text-sm font-black text-[var(--admin-text-primary)] uppercase tracking-wider">
                                                    <ShoppingCart size={18} className="text-gray-400" /> Catálogo
                                                </h3>
                                                <button 
                                                    onClick={() => setIsManualMode(!isManualMode)}
                                                    disabled={isDisabled}
                                                    className={`text-[9px] font-black uppercase px-2 py-1 rounded-md border transition-all ${isManualMode ? 'bg-wtech-red border-wtech-red text-white' : 'border-gray-200 text-gray-400 hover:border-gray-400'} ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                >
                                                    {isManualMode ? 'Voltar para Busca' : '+ Item Manual'}
                                                </button>
                                            </div>

                                            {isManualMode ? (
                                                <div className="p-4 bg-[var(--admin-surface-2)] rounded-2xl border border-dashed border-[var(--admin-border)] space-y-4 animate-in fade-in slide-in-from-top-2">
                                                    <div>
                                                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Nome do Item</label>
                                                        <input 
                                                            className="w-full bg-[var(--admin-surface-1)] border border-[var(--admin-border)] rounded-xl py-2 px-3 text-xs font-bold text-[var(--admin-text-primary)] outline-none focus:ring-2 focus:ring-wtech-red"
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
                                                                className="w-full bg-[var(--admin-surface-1)] border border-[var(--admin-border)] rounded-xl py-2 px-3 text-xs font-bold text-[var(--admin-text-primary)] outline-none focus:ring-2 focus:ring-wtech-red"
                                                                value={manualItem.quantity}
                                                                onChange={e => setManualItem({...manualItem, quantity: Number(e.target.value)})}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Valor Unit.</label>
                                                            <input 
                                                                type="number"
                                                                className="w-full bg-[var(--admin-surface-1)] border border-[var(--admin-border)] rounded-xl py-2 px-3 text-xs font-bold outline-none focus:ring-2 focus:ring-wtech-red"
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
                                                        className="w-full bg-[var(--admin-surface-2)] border-none rounded-xl py-2.5 pl-11 pr-4 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 transition-all font-sans"
                                                        placeholder="Buscar produto no estoque..."
                                                        value={productSearchTerm}
                                                        onChange={e => setProductSearchTerm(e.target.value)}
                                                        onFocus={() => setIsAddingItem(true)}
                                                        disabled={isDisabled}
                                                    />
                                                    {isAddingItem && productSearchTerm && !isLocked && (
                                                         <div className="absolute top-12 left-0 w-full bg-[var(--admin-surface-2)] rounded-xl shadow-2xl border border-[var(--admin-border)] z-40 max-h-80 overflow-y-auto font-sans">
                                                             {products
                                                                .filter(p => p.name.toLowerCase().includes(productSearchTerm.toLowerCase()))
                                                                .map(p => (
                                                                    <div 
                                                                        key={p.id} 
                                                                        onClick={() => handleAddProduct(p)}
                                                                        className="flex justify-between items-center p-3 hover:bg-[var(--admin-surface-2)] cursor-pointer border-b border-gray-50  last:border-0"
                                                                    >
                                                                        <div className="min-w-0">
                                                                            <p className="font-bold text-xs truncate">{p.name}</p>
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
                                                <span className="text-sm font-black text-[var(--admin-text-primary)]">{saleItems.length}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs font-bold text-gray-400 uppercase">Subtotal</span>
                                                <span className="text-sm font-black text-[var(--admin-text-primary)] italic">R$ {subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
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
                                                    <h3 className="text-xl md:text-2xl font-black text-[var(--admin-text-primary)] tracking-tight italic uppercase">Carrinho do Cliente</h3>
                                                    <p className="text-[10px] md:text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Gerencie a lista de produtos selecionados</p>
                                                </div>
                                                {saleItems.length > 0 && (
                                                    <button onClick={() => setSaleItems([])} className="text-[10px] font-black text-red-500 uppercase hover:underline">Limpar Tudo</button>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                                                {saleItems.length === 0 ? (
                                                    <div className="md:col-span-2 py-20 text-center opacity-40 border-2 border-dashed border-gray-200  rounded-3xl">
                                                        <ShoppingCart className="mx-auto mb-4" size={48} />
                                                        <p className="text-lg font-black uppercase italic">Nenhum produto adicionado</p>
                                                        <p className="text-sm">Use o campo de busca à esquerda para adicionar itens.</p>
                                                    </div>
                                                ) : (
                                                    saleItems.map((item, index) => (
                                                        <motion.div 
                                                            layout 
                                                            key={index}
                                                            className="bg-[var(--admin-surface-1)] p-5 rounded-3xl border border-[var(--admin-border)] shadow-sm flex items-center justify-between group hover:border-blue-500/30 transition-all"
                                                        >
                                                            <div className="flex items-center gap-4 overflow-hidden">
                                                                <div className="w-14 h-14 rounded-2xl bg-gray-50 dark:bg-black flex items-center justify-center overflow-hidden shrink-0 border border-[var(--admin-border)]">
                                                                    {item.product?.imageUrl ? (
                                                                        <img src={item.product.imageUrl} className="w-full h-full object-cover" />
                                                                    ) : (
                                                                        <ShoppingCart className="text-gray-300" size={24} />
                                                                    )}
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <p className="font-black text-[var(--admin-text-primary)] italic uppercase truncate">{item.product?.name}</p>
                                                                    <p className="text-xs font-bold text-gray-400 mt-0.5">UN: R$ {item.unitPrice.toLocaleString('pt-BR')}</p>
                                                                </div>
                                                            </div>
                                                            
                                                            <div className="flex flex-col items-end gap-2">
                                                                <div className="flex items-center bg-gray-100 dark:bg-black rounded-xl p-1 shadow-inner border border-gray-200 ">
                                                                    <button onClick={() => !isDisabled && handleUpdateQuantity(index, -1)} className={`px-2 py-1 hover:bg-white dark:hover:bg-white/10 rounded-lg text-lg font-bold transition-all ${isDisabled ? 'opacity-30 cursor-not-allowed' : ''}`}>-</button>
                                                                    <span className="text-sm font-black px-3 min-w-[32px] text-center">{item.quantity}</span>
                                                                    <button onClick={() => !isDisabled && handleUpdateQuantity(index, 1)} className={`px-2 py-1 hover:bg-white dark:hover:bg-white/10 rounded-lg text-lg font-bold transition-all ${isDisabled ? 'opacity-30 cursor-not-allowed' : ''}`}>+</button>
                                                                </div>
                                                                <button onClick={() => !isDisabled && handleRemoveItem(index)} className={`text-[10px] font-black text-gray-300 hover:text-red-500 uppercase transition-colors ${isDisabled ? 'hidden' : ''}`}>Remover</button>
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
                                    <div className="lg:w-1/2 p-6 md:p-10 overflow-y-auto space-y-8 md:space-y-10 border-r border-[var(--admin-border)]">
                                        <section>
                                            <h3 className="flex items-center gap-3 text-lg md:text-xl font-black text-[var(--admin-text-primary)] mb-6 md:mb-8 italic uppercase text-blue-600">
                                                <Truck size={24} /> Logística e Entrega
                                            </h3>
                                            
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Método de Envio</label>
                                                    <select 
                                                        className="w-full bg-[var(--admin-surface-1)] border border-gray-200  rounded-2xl py-4 px-5 font-black text-sm outline-none focus:ring-4 focus:ring-blue-500/10 transition-all appearance-none cursor-pointer"
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
                                                            className="w-full bg-[var(--admin-surface-1)] border border-gray-200  rounded-2xl py-4 pl-14 pr-5 font-black text-sm outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-sans"
                                                            value={currentSale.estimated_delivery_date || ''}
                                                            onChange={e => setCurrentSale({...currentSale, estimated_delivery_date: e.target.value})}
                                                         />
                                                    </div>
                                                </div>

                                                <div className="md:col-span-2 space-y-2">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Condição de Pagamento</label>
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                        {/* Stripe option — always visible */}
                                                        <button
                                                            onClick={() => setCurrentSale({...currentSale, payment_method: 'Stripe'})}
                                                            className={`py-3 px-4 rounded-xl font-bold text-xs transition-all border flex items-center justify-center gap-1.5 ${currentSale.payment_method === 'Stripe' ? 'bg-violet-600 border-violet-600 text-white shadow-lg shadow-violet-500/30' : 'bg-[var(--admin-surface-1)] border-gray-200  text-gray-500 hover:border-violet-400 hover:text-violet-600'}`}
                                                        >
                                                            <Zap size={12} /> Stripe
                                                        </button>
                                                        {paymentMethods.map(pm => (
                                                            <button
                                                                key={pm.id}
                                                                onClick={() => {
                                                                    setCurrentSale({...currentSale, payment_method: pm.name});
                                                                    setStripePaymentUrl(null); // clear Stripe link if switching away
                                                                }}
                                                                className={`py-3 px-4 rounded-xl font-bold text-xs transition-all border ${currentSale.payment_method === pm.name ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-[var(--admin-surface-1)] border-gray-200  text-gray-500 hover:border-gray-400'}`}
                                                            >
                                                                {pm.name}
                                                            </button>
                                                        ))}
                                                    </div>

                                                    {/* Stripe Link Generator — shown when Stripe is selected */}
                                                    {currentSale.payment_method === 'Stripe' && (
                                                        <motion.div
                                                            initial={{ opacity: 0, y: -8 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            className="mt-4 p-5 bg-violet-50 dark:bg-violet-900/10 border border-violet-200 dark:border-violet-800/40 rounded-2xl space-y-4"
                                                        >
                                                            <div className="flex items-center justify-between">
                                                                <div>
                                                                    <p className="text-xs font-black text-violet-700 dark:text-violet-400 uppercase tracking-widest flex items-center gap-2">
                                                                        <Zap size={14} /> Link de Pagamento Stripe
                                                                    </p>
                                                                    <p className="text-[10px] text-gray-500 mt-0.5">Gere um link seguro e envie ao cliente para ele pagar online.</p>
                                                                </div>
                                                                <div className="text-right">
                                                                    <p className="text-[9px] text-gray-400 uppercase font-bold">Total (BRL)</p>
                                                                    <p className="text-lg font-black text-violet-600 dark:text-violet-400">R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                                                </div>
                                                            </div>

                                                            <div className="flex flex-col gap-4">
                                                                <div className="p-4 bg-violet-500/5 dark:bg-violet-500/10 border border-violet-500/20 rounded-2xl space-y-3">
                                                                    <label className="block text-[10px] font-black uppercase text-violet-500 tracking-widest italic">Câmbio Seguro Stripe</label>
                                                                    <div className="flex gap-2">
                                                                        {['BRL', 'USD', 'EUR'].map((curr) => (
                                                                            <button
                                                                                key={curr}
                                                                                onClick={async () => {
                                                                                    setTargetCurrency(curr as any);
                                                                                    if (curr !== 'BRL' && exchangeRates) {
                                                                                        const conv = await convertBRLTo(total, curr as any, exchangeRates);
                                                                                        setLinkAmount(conv.value);
                                                                                    } else {
                                                                                        setLinkAmount(total);
                                                                                    }
                                                                                }}
                                                                                className={`flex-1 py-2 rounded-lg font-black text-[10px] border transition-all ${
                                                                                    targetCurrency === curr 
                                                                                    ? 'bg-violet-600 border-violet-600 text-white shadow-lg' 
                                                                                    : 'bg-[var(--admin-surface-2)] border-[var(--admin-border)] text-[var(--admin-text-tertiary)]'
                                                                                }`}
                                                                            >
                                                                                {curr}
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                    {targetCurrency !== 'BRL' && exchangeRates && (
                                                                        <div className="flex items-center justify-between pt-1">
                                                                            <p className="text-[9px] text-violet-500/80 italic flex items-center gap-1">
                                                                                <TrendingUp size={10} /> 
                                                                                Cotação: R$ {(targetCurrency === 'USD' ? exchangeRates.USD : exchangeRates.EUR).toFixed(2)}
                                                                            </p>
                                                                            <p className="text-[10px] font-black text-violet-600 whitespace-nowrap">
                                                                                Total: {targetCurrency === 'EUR' ? '€' : '$'} {linkAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                                            </p>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {!stripePaymentUrl ? (
                                                                <button
                                                                    onClick={handleGenerateStripeLink}
                                                                    disabled={isGeneratingStripeLink || total <= 0}
                                                                    className="w-full bg-violet-600 hover:bg-violet-700 text-white py-4 rounded-xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all shadow-xl shadow-violet-500/20 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-95"
                                                                >
                                                                    {isGeneratingStripeLink ? (
                                                                        <><Loader2 size={16} className="animate-spin" /> Gerando Link...</>
                                                                    ) : (
                                                                        <><Zap size={16} /> Gerar Link de Pagamento</>
                                                                    )}
                                                                </button>
                                                            ) : (
                                                                <motion.div
                                                                    initial={{ opacity: 0, scale: 0.95 }}
                                                                    animate={{ opacity: 1, scale: 1 }}
                                                                    className="space-y-3"
                                                                >
                                                                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                                                                        <CheckCircle2 size={16} />
                                                                        <span className="text-xs font-black uppercase tracking-wide">Link gerado com sucesso!</span>
                                                                    </div>
                                                                    <div className="flex gap-2">
                                                                        <input
                                                                            readOnly
                                                                            value={stripePaymentUrl}
                                                                            className="flex-1 bg-white dark:bg-black/30 border border-violet-200 dark:border-violet-800 rounded-xl px-3 py-2.5 text-xs font-mono text-[var(--admin-text-secondary)] outline-none truncate"
                                                                        />
                                                                        <button
                                                                            onClick={handleCopyStripeLink}
                                                                            className={`px-4 py-2.5 rounded-xl font-black text-xs flex items-center gap-1.5 transition-all ${
                                                                                stripeLinkCopied
                                                                                    ? 'bg-emerald-500 text-white'
                                                                                    : 'bg-violet-100 dark:bg-violet-900/30 text-violet-600 hover:bg-violet-200'
                                                                            }`}
                                                                            title="Copiar link"
                                                                        >
                                                                            {stripeLinkCopied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                                                                            {stripeLinkCopied ? 'Copiado!' : 'Copiar'}
                                                                        </button>
                                                                        <a
                                                                            href={stripePaymentUrl}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="px-3 py-2.5 rounded-xl bg-gray-100 dark:bg-white/10 text-gray-500 hover:text-violet-600 transition-colors"
                                                                            title="Abrir link"
                                                                        >
                                                                            <ExternalLink size={14} />
                                                                        </a>
                                                                    </div>
                                                                    <p className="text-[10px] text-gray-400">
                                                                        O pedido será atualizado automaticamente para <strong>"Pago"</strong> quando o cliente concluir o pagamento.
                                                                    </p>
                                                                </motion.div>
                                                            )}
                                                        </motion.div>
                                                    )}
                                                </div>
                                                
                                                {(currentSale.status === 'shipped' || currentSale.status === 'delivered') && (
                                                    <div className="md:col-span-2 p-6 bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-900/30 rounded-3xl space-y-3">
                                                        <label className="text-[10px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest block">Código de Rastreio</label>
                                                        <div className="relative">
                                                            <Truck className="absolute left-5 top-4.5 text-orange-400" size={20} />
                                                            <input 
                                                                className="w-full bg-[var(--admin-surface-1)] border-2 border-orange-200 dark:border-orange-900/30 rounded-2xl py-4 pl-14 pr-6 font-black tracking-widest text-lg focus:ring-8 focus:ring-orange-500/10 outline-none transition-all placeholder:text-gray-300"
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
                                            <h3 className="flex items-center gap-3 text-xl font-black text-[var(--admin-text-primary)] mb-6 italic uppercase text-gray-400">
                                                <ShoppingCart size={24} /> Itens do Pedido
                                            </h3>
                                            <div className="space-y-2">
                                                {saleItems.map((item, i) => (
                                                    <div key={i} className="flex justify-between items-center text-sm py-2 border-b border-[var(--admin-border)] last:border-0 opacity-60">
                                                        <div className="flex gap-4">
                                                            <span className="font-black text-gray-400 w-8">x{item.quantity}</span>
                                                            <span className="font-bold text-gray-700 uppercase italic truncate max-w-[200px]">{item.product?.name}</span>
                                                        </div>
                                                        <span className="font-black text-[var(--admin-text-primary)] italic">R$ {(item.unitPrice * item.quantity).toLocaleString('pt-BR')}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </section>
                                    </div>

                                    {/* Checkout Step: Right Summary */}
                                    <div className="lg:w-1/2 p-6 md:p-10 bg-[var(--admin-surface-1)] flex flex-col justify-center overflow-y-auto">
                                        <div className="max-w-md mx-auto w-full space-y-6 md:space-y-8">
                                            <div>
                                                <h3 className="text-2xl md:text-3xl font-black text-[var(--admin-text-primary)] italic uppercase tracking-tighter">Resumo Financeiro</h3>
                                                <p className="text-[10px] md:text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Conferência final de valores</p>
                                            </div>

                                            <div className="space-y-4">
                                                <div className="bg-gray-50 dark:bg-black/20 p-6 rounded-3xl border border-[var(--admin-border)]">
                                                    <div className="flex items-center gap-2 text-[11px] font-black text-gray-400 uppercase tracking-widest mb-4">
                                                        <Tag size={14} className="text-vibrant-blue" /> Ajuste de Desconto
                                                    </div>
                                                    <div className="relative">
                                                        <span className="absolute left-5 top-4.5 text-gray-400 font-black text-sm italic">R$</span>
                                                        <input 
                                                            type="number"
                                                            className="w-full pl-12 pr-6 py-4 bg-[var(--admin-surface-1)] border border-gray-200  rounded-2xl text-xl font-black focus:ring-8 focus:ring-blue-500/10 outline-none transition-all placeholder:text-gray-300 italic"
                                                            placeholder="0,00"
                                                            value={currentSale.discount_amount || ''}
                                                            onChange={e => setCurrentSale({...currentSale, discount_amount: Number(e.target.value)})}
                                                        />
                                                    </div>
                                                </div>

                                                <div className="space-y-4 px-2">
                                                    <div className="flex justify-between items-center text-gray-500 font-bold uppercase text-xs tracking-widest">
                                                        <span>Subtotal</span>
                                                        <span className="text-sm font-black text-gray-700 italic">R$ {subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center text-gray-500 font-bold uppercase text-xs tracking-widest">
                                                        <span>Frete ({currentSale.shipping_method || 'Não sel.'})</span>
                                                        <span className="text-sm font-black text-gray-700 italic">R$ {shippingCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
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

                                                <div className="bg-black bg-[var(--admin-surface-1)] p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-2xl space-y-6 relative overflow-hidden group">
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
