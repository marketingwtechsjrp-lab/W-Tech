
import React, { useState, useEffect } from 'react';
import { 
    Plus, Search, Filter, Edit, Trash2, Package, 
    ArrowUpRight, ArrowDownRight, History, Settings,
    PackageCheck, AlertTriangle, Layers, Wrench, X, Save,
    ShoppingCart, Upload, Download, RefreshCcw
} from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../context/AuthContext';
import type { Product, StockMovement, ProductBOM } from '../../../types';
import { motion, AnimatePresence } from 'framer-motion';

const CatalogManagerView = () => {
    const { user } = useAuth();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<string>('all');
    
    // Modal states
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
    const [activeModalTab, setActiveModalTab] = useState<'general' | 'bom' | 'history' | 'reservations'>('general');
    
    // BOM states
    const [bomItems, setBomItems] = useState<(ProductBOM & { name: string, unit: string })[]>([]);
    const [loadingBOM, setLoadingBOM] = useState(false);
    const [isAddingBOM, setIsAddingBOM] = useState(false);
    const [bomSearch, setBomSearch] = useState('');
    const [bomQuantity, setBomQuantity] = useState(1);

    // History & Movement states
    const [stockHistory, setStockHistory] = useState<StockMovement[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
    const [movementData, setMovementData] = useState({
        type: 'IN' as StockMovement['type'],
        quantity: 1,
        notes: ''
    });
    const [isImporting, setIsImporting] = useState(false);
    const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
    
    // Mass pricing states
    const [isMassAdjusting, setIsMassAdjusting] = useState(false);
    const [massAdjustData, setMassAdjustData] = useState({
        level: 'retail',
        type: 'percentage',
        value: 0,
        direction: 'increase'
    });

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('SITE_Products')
            .select('*')
            .order('name');
        
        if (data) {
            setProducts(data.map((p: any) => ({
                ...p,
                averageCost: Number(p.average_cost),
                salePrice: Number(p.sale_price),
                priceRetail: Number(p.price_retail || p.sale_price),
                pricePartner: Number(p.price_partner || p.sale_price),
                priceMechanic: Number(p.price_mechanic || (p.price_retail || p.sale_price) * 0.9),
                priceDistributor: Number(p.price_distributor || p.sale_price),
                minStock: p.min_stock,
                currentStock: p.current_stock,
                productionTime: p.production_time,
                imageUrl: p.image_url,
                weight: Number(p.weight) || 0,
                length: Number(p.length) || 0,
                width: Number(p.width) || 0,
                height: Number(p.height) || 0,
                createdAt: p.created_at
            })));
        }
        setLoading(false);
    };

    const fetchBOM = async (productId: string) => {
        setLoadingBOM(true);
        const { data, error } = await supabase
            .from('SITE_ProductBOM')
            .select(`
                *,
                component:SITE_Products(name, unit)
            `)
            .eq('parent_product_id', productId);
        
        if (data) {
            setBomItems(data.map((item: any) => ({
                id: item.id,
                parentProductId: item.parent_product_id,
                componentId: item.component_id,
                quantity: Number(item.quantity),
                name: item.component.name,
                unit: item.component.unit
            })));
        }
        setLoadingBOM(false);
    };

    const fetchHistory = async (productId: string) => {
        setLoadingHistory(true);
        const { data, error } = await supabase
            .from('SITE_StockMovements')
            .select('*')
            .eq('product_id', productId)
            .order('created_at', { ascending: false });
        
        if (data) {
            setStockHistory(data.map((m: any) => ({
                ...m,
                productId: m.product_id,
                referenceId: m.reference_id,
                userId: m.user_id,
                createdAt: m.created_at
            })));
        }
        setLoadingHistory(false);
    };

    useEffect(() => {
        if (editingProduct?.id) {
            if (activeModalTab === 'bom') fetchBOM(editingProduct.id);
            if (activeModalTab === 'history') fetchHistory(editingProduct.id);
        }
    }, [activeModalTab, editingProduct?.id]);

    const handleSaveProduct = async () => {
        if (!editingProduct?.name || !editingProduct?.sku) {
            alert("Preencha o nome e o SKU!");
            return;
        }

        const payload = {
            sku: editingProduct.sku,
            name: editingProduct.name,
            description: editingProduct.description || '',
            category: editingProduct.category || '',
            type: editingProduct.type || 'product',
            unit: editingProduct.unit || 'un',
            min_stock: editingProduct.minStock || 0,
            average_cost: editingProduct.averageCost || 0,
            sale_price: editingProduct.salePrice || 0,
            price_retail: editingProduct.priceRetail || editingProduct.salePrice || 0,
            price_partner: editingProduct.pricePartner || 0,
            price_mechanic: editingProduct.priceMechanic || 0,
            price_distributor: editingProduct.priceDistributor || 0,
            production_time: editingProduct.productionTime || 0,
            image_url: editingProduct.imageUrl || '',
            weight: editingProduct.weight || 0,
            length: editingProduct.length || 0,
            width: editingProduct.width || 0,
            height: editingProduct.height || 0
        };

        let result;
        if (editingProduct.id) {
            result = await supabase.from('SITE_Products').update(payload).eq('id', editingProduct.id);
        } else {
            result = await supabase.from('SITE_Products').insert([payload]);
        }

        if (result.error) {
            alert("Erro ao salvar: " + result.error.message);
        } else {
            setIsProductModalOpen(false);
            fetchProducts();
        }
    };

    const handleAddBOMItem = async (componentId: string) => {
        if (!editingProduct?.id) return;
        
        const { error } = await supabase.from('SITE_ProductBOM').insert([{
            parent_product_id: editingProduct.id,
            component_id: componentId,
            quantity: bomQuantity
        }]);

        if (error) {
            alert("Erro ao adicionar componente: " + error.message);
        } else {
            setIsAddingBOM(false);
            setBomSearch('');
            setBomQuantity(1);
            fetchBOM(editingProduct.id);
        }
    };

    const handleRemoveBOMItem = async (id: string) => {
        if (!confirm("Remover este componente?")) return;
        const { error } = await supabase.from('SITE_ProductBOM').delete().eq('id', id);
        if (!error && editingProduct?.id) fetchBOM(editingProduct.id);
    };

    const handleRecordMovement = async () => {
        if (!editingProduct?.id) return;

        const newStock = movementData.type === 'IN' 
            ? (editingProduct.currentStock || 0) + movementData.quantity
            : (editingProduct.currentStock || 0) - movementData.quantity;

        const { error: moveError } = await supabase.from('SITE_StockMovements').insert([{
            product_id: editingProduct.id,
            type: movementData.type,
            quantity: movementData.quantity,
            origin: 'Manual',
            notes: movementData.notes,
            user_id: (await supabase.auth.getUser()).data.user?.id
        }]);

        if (moveError) {
            alert("Erro ao registrar movimento: " + moveError.message);
            return;
        }

        const { error: prodError } = await supabase.from('SITE_Products')
            .update({ current_stock: newStock })
            .eq('id', editingProduct.id);

        if (prodError) {
            alert("Erro ao atualizar estoque: " + prodError.message);
        } else {
            setIsMovementModalOpen(false);
            setMovementData({ type: 'IN', quantity: 1, notes: '' });
            fetchProducts();
            if (activeModalTab === 'history') fetchHistory(editingProduct.id);
        }
    };

    const handleMassAdjust = async () => {
        if (massAdjustData.value <= 0) return alert("Insira um valor válido.");
        const levelLabel = massAdjustData.level === 'retail' ? 'Final' : 
                           massAdjustData.level === 'partner' ? 'Credenciados' : 
                           massAdjustData.level === 'mechanic' ? 'Mec sem curso' : 'Distribuidor';
        
        if (!confirm(`Deseja realmente aplicar o reajuste de ${massAdjustData.value}% (${massAdjustData.direction === 'increase' ? 'Aumento' : 'Desconto'}) para o nível ${levelLabel}?`)) return;

        setLoading(true);
        try {
            const field = massAdjustData.level === 'retail' ? 'price_retail' : 
                          massAdjustData.level === 'partner' ? 'price_partner' : 
                          massAdjustData.level === 'mechanic' ? 'price_mechanic' : 'price_distributor';
            
            const multiplier = massAdjustData.direction === 'increase' 
                ? (1 + massAdjustData.value / 100) 
                : (1 - massAdjustData.value / 100);

            // Using raw SQL via RPC if available, or fetch and update batch (safer for small-mid sets)
            // Since we don't have a reliable RPC here, we do it via update with a calculated value
            // but Supabase JS doesn't support relative updates easily without RPC.
            // Let's use a simple loop or a single update if we had an RPC.
            // Actually, we can use a single update if we are setting a fixed value, but here it's relative.
            
            // Fetch all columns to ensure we don't violate not-null constraints on upsert
            const { data: prods } = await supabase.from('SITE_Products').select('*');
            if (prods) {
                const updates = prods.map(p => ({
                    ...p,
                    [field]: Number((p[field] * multiplier).toFixed(2))
                }));

                // Batch update (Supabase upsert with ID works as update)
                const { error } = await supabase.from('SITE_Products').upsert(updates);
                if (error) throw error;
            }

            alert("Reajuste concluído com sucesso!");
            setIsMassAdjusting(false);
            fetchProducts();
        } catch (error: any) {
            alert("Erro ao aplicar reajuste: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleImportCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsImporting(true);
        const reader = new FileReader();
        reader.onload = async (e) => {
            const text = e.target?.result as string;
            if (!text) return;

            // Robust CSV Parsing handling multi-line quoted fields
            const parseCSV = (input: string) => {
                const rows: string[][] = [];
                let currentRow: string[] = [];
                let currentVal = '';
                let inQuotes = false;
                
                for (let i = 0; i < input.length; i++) {
                    const char = input[i];
                    const nextChar = input[i + 1];

                    // Handle Quotes
                    if (char === '"') {
                        if (inQuotes && nextChar === '"') {
                            currentVal += '"';
                            i++; // skip escaped quote
                        } else {
                            inQuotes = !inQuotes;
                        }
                    } 
                    // Handle Separator
                    else if (char === ',' && !inQuotes) {
                        currentRow.push(currentVal.trim());
                        currentVal = '';
                    } 
                    // Handle Newlines
                    else if ((char === '\r' || char === '\n') && !inQuotes) {
                        if (char === '\r' && nextChar === '\n') i++; // skip \n
                        // End of row
                        currentRow.push(currentVal.trim());
                        rows.push(currentRow);
                        currentRow = [];
                        currentVal = '';
                    } 
                    // Handle Data
                    else {
                        currentVal += char;
                    }
                }
                // Push last row if exists
                if (currentRow.length > 0 || currentVal) {
                    currentRow.push(currentVal.trim());
                    rows.push(currentRow);
                }
                return rows;
            };

            const allRows = parseCSV(text);
            if (allRows.length === 0) { setIsImporting(false); return; }

            const headers = allRows[0]; // First row is headers
            const productsToImport: any[] = [];

            for (let i = 1; i < allRows.length; i++) {
                const values = allRows[i];
                if (values.length < 2) continue; // Skip empty or malformed rows

                const row: any = {};
                headers.forEach((h, idx) => {
                    row[h] = values[idx];
                });

                if (!row['Nome'] || !row['SKU']) continue;

                // Helper to strip HTML tags
                const stripHtml = (html: string) => {
                    if (!html) return '';
                    return html.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' ').trim();
                };

                // Helper for numeric parsing (handles commas)
                const parseNum = (val: string) => {
                    if (!val) return 0;
                    return parseFloat(val.toString().replace(',', '.')) || 0;
                };

                // Mapping
                const productData = {
                    sku: row['SKU'],
                    name: stripHtml(row['Nome']),
                    description: stripHtml(row['Descrição'] || ''),
                    category: row['Categorias'] || '',
                    type: (row['Tipo'] === 'simple' || !row['Tipo']) ? 'product' : 'raw_material',
                    unit: 'un',
                    sale_price: parseNum(row['Preço']),
                    current_stock: parseInt(row['Estoque']) || 0,
                    weight: parseNum(row['Peso (g)']),
                    length: parseNum(row['Comprimento (cm)']),
                    width: parseNum(row['Width (cm)'] || row['Largura (cm)']),
                    height: parseNum(row['Altura (cm)']),
                    image_url: row['Imagens']?.split(',')[0]?.trim() || ''
                };
                productsToImport.push(productData);
            }

            if (productsToImport.length > 0) {
                // Check if user is logged in via AuthContext
                if (!user) {
                    alert("Usuário não identificado. Por favor, faça login novamente.");
                    setIsImporting(false);
                    return;
                }

                // Upsert by SKU
                const { error } = await supabase
                    .from('SITE_Products')
                    .upsert(productsToImport, { onConflict: 'sku' });

                if (error) {
                    console.error("Erro no upsert:", error);
                    alert("Erro ao importar: " + error.message);
                } else {
                    alert(`${productsToImport.length} produtos importados com sucesso!`);
                    fetchProducts();
                }
            }
            setIsImporting(false);
        };
        reader.readAsText(file);
    };

    const filteredProducts = products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             p.sku?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = filterType === 'all' || p.type === filterType;
        return matchesSearch && matchesType;
    });

    const handleSelectAll = (checked: boolean) => {
        setSelectedProducts(checked ? filteredProducts.map(p => p.id) : []);
    };

    const handleSelectProduct = (id: string, checked: boolean) => {
        if (checked) {
            setSelectedProducts(prev => [...prev, id]);
        } else {
            setSelectedProducts(prev => prev.filter(pId => pId !== id));
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[var(--admin-surface-1)] p-6 rounded-2xl border border-[var(--admin-border)]">
                <div>
                    <h2 className="text-2xl font-black text-[var(--admin-text-primary)] flex items-center gap-2">
                        <Package className="text-wtech-gold" /> Catálogo & Estoque
                    </h2>
                    <p className="text-sm text-[var(--admin-text-secondary)] font-medium">Gerencie seus produtos, insumos e movimentações de estoque.</p>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <label className={`cursor-pointer px-4 py-2.5 bg-[var(--admin-surface-1)] border border-[var(--admin-border)] text-[var(--admin-text-secondary)] rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[var(--admin-surface-3)] transition-all text-sm ${isImporting ? 'opacity-50 pointer-events-none' : ''}`}>
                        <Upload size={16} />
                        {isImporting ? 'Processando...' : 'Importar CSV'}
                        <input type="file" accept=".csv" className="hidden" onChange={handleImportCSV} />
                    </label>
                    <button
                        onClick={() => setIsMassAdjusting(true)}
                        className="flex-1 md:flex-none px-4 py-2.5 bg-[var(--admin-surface-1)] border border-[var(--admin-border)] text-[var(--admin-text-secondary)] rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[var(--admin-surface-3)] transition-all text-sm"
                    >
                        <RefreshCcw size={16} className="text-blue-500" /> Reajuste em Massa
                    </button>
                    <button
                        onClick={() => { setEditingProduct({ type: 'product', unit: 'un' }); setIsProductModalOpen(true); }}
                        className="flex-1 md:flex-none px-4 py-2.5 bg-gradient-to-r from-wtech-gold to-yellow-600 text-black rounded-xl font-black flex items-center justify-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-md shadow-yellow-500/20 text-sm"
                    >
                        <Plus size={16} /> Novo Item
                    </button>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-[var(--admin-surface-1)] p-4 rounded-xl border border-[var(--admin-border)] transition-colors">
                    <p className="text-xs font-bold text-[var(--admin-text-tertiary)] uppercase">Total de Itens</p>
                    <h3 className="text-2xl font-black text-[var(--admin-text-primary)]">{products.length}</h3>
                </div>
                <div className="bg-red-500/10 p-4 rounded-xl border border-red-500/20 transition-colors">
                    <p className="text-xs font-bold text-red-400 uppercase">Estoque Crítico</p>
                    <h3 className="text-2xl font-black text-red-500">{products.filter(p => p.currentStock <= p.minStock).length}</h3>
                </div>
                <div className="bg-blue-500/10 p-4 rounded-xl border border-blue-500/20 transition-colors">
                    <p className="text-xs font-bold text-blue-400 uppercase">Produtos Finais</p>
                    <h3 className="text-2xl font-black text-blue-500">{products.filter(p => p.type === 'product').length}</h3>
                </div>
                <div className="bg-emerald-500/10 p-4 rounded-xl border border-emerald-500/20 transition-colors">
                    <p className="text-xs font-bold text-emerald-400 uppercase">Valor em Estoque</p>
                    <h3 className="text-xl font-black text-emerald-500">
                        R$ {products.reduce((acc, p) => acc + (p.currentStock * p.averageCost), 0).toLocaleString('pt-BR')}
                    </h3>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-[var(--admin-surface-1)] p-4 rounded-xl border border-[var(--admin-border)] flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 text-[var(--admin-text-tertiary)]" size={16} />
                    <input
                        type="text"
                        placeholder="Buscar por nome ou SKU..."
                        className="w-full pl-9 pr-4 py-2.5 bg-[var(--admin-surface-2)] border border-[var(--admin-border)] text-[var(--admin-text-primary)] placeholder:text-[var(--admin-text-tertiary)] rounded-xl text-sm focus:border-wtech-gold outline-none transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <select
                    className="px-4 py-2.5 border border-[var(--admin-border)] rounded-xl bg-[var(--admin-surface-2)] text-[var(--admin-text-primary)] text-sm outline-none focus:border-wtech-gold transition-all"
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                >
                    <option value="all">Todos os Tipos</option>
                    <option value="product">Produtos Finais</option>
                    <option value="raw_material">Insumos/Matéria-prima</option>
                    <option value="service">Serviços</option>
                </select>
            </div>

            {/* Products Table */}
            <div className="bg-[var(--admin-surface-1)] rounded-2xl border border-[var(--admin-border)] overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-[var(--admin-surface-2)] border-b border-[var(--admin-border)] text-[10px] font-black text-[var(--admin-text-tertiary)] uppercase tracking-widest">
                        <tr>
                            <th className="px-5 py-4 w-[50px]">
                                <input
                                    type="checkbox"
                                    className="rounded border-[var(--admin-border)] bg-transparent"
                                    onChange={(e) => handleSelectAll(e.target.checked)}
                                    checked={selectedProducts.length === filteredProducts.length && filteredProducts.length > 0}
                                />
                            </th>
                            <th className="px-5 py-4">Item</th>
                            <th className="px-5 py-4">Status Estoque</th>
                            <th className="px-5 py-4 text-right">Custo / Venda</th>
                            <th className="px-5 py-4 text-center">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--admin-border)]">
                        {loading ? (
                            <tr>
                                <td colSpan={5} className="px-5 py-16 text-center">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="w-8 h-8 border-4 border-wtech-gold border-t-transparent rounded-full animate-spin"></div>
                                        <p className="text-sm text-[var(--admin-text-tertiary)] font-medium">Carregando catálogo...</p>
                                    </div>
                                </td>
                            </tr>
                        ) : filteredProducts.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-5 py-16 text-center text-[var(--admin-text-tertiary)] font-bold">
                                    Nenhum item encontrado.
                                </td>
                            </tr>
                        ) : filteredProducts.map((product) => {
                            const isSelected = selectedProducts.includes(product.id);
                            return (
                            <tr key={product.id} className={`hover:bg-[var(--admin-surface-2)] transition-colors group ${isSelected ? 'bg-indigo-500/5' : ''}`}>
                                <td className="px-5 py-4 align-top">
                                    <input
                                        type="checkbox"
                                        className="rounded border-[var(--admin-border)] bg-transparent"
                                        checked={isSelected}
                                        onChange={(e) => handleSelectProduct(product.id, e.target.checked)}
                                    />
                                </td>
                                <td className="px-5 py-4">
                                    <div className="flex items-start gap-3">
                                        <div className="w-11 h-11 rounded-xl bg-[var(--admin-surface-2)] flex-shrink-0 flex items-center justify-center text-[var(--admin-text-tertiary)] border border-[var(--admin-border)] overflow-hidden">
                                            {product.imageUrl ? <img src={product.imageUrl} alt="" className="w-full h-full object-cover" /> : <Package size={18} />}
                                        </div>
                                        <div>
                                            <p className="font-bold text-[var(--admin-text-primary)] leading-tight text-sm line-clamp-2 max-w-[300px]" title={product.name}>
                                                {product.name}
                                            </p>
                                            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                                <span className="text-[10px] bg-[var(--admin-surface-3)] px-1.5 py-0.5 rounded text-[var(--admin-text-tertiary)] font-bold border border-[var(--admin-border)]">
                                                    {product.sku || 'S/ SKU'}
                                                </span>
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase border ${
                                                    product.type === 'product' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                                                    product.type === 'raw_material' ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' :
                                                    'bg-purple-500/10 text-purple-500 border-purple-500/20'
                                                }`}>
                                                    {product.type === 'product' ? 'Produto' : product.type === 'raw_material' ? 'Insumo' : 'Serviço'}
                                                </span>
                                                {product.category && (
                                                    <span className="text-[10px] bg-[var(--admin-surface-3)] px-1.5 py-0.5 rounded text-[var(--admin-text-tertiary)] font-medium border border-[var(--admin-border)] truncate max-w-[100px]">
                                                        {product.category}
                                                    </span>
                                                )}
                                            </div>
                                            {(product.weight || product.length) > 0 && (
                                                <div className="flex items-center gap-2 mt-1 text-[10px] text-[var(--admin-text-tertiary)]">
                                                    {product.weight > 0 && <span>{product.weight}g</span>}
                                                    {product.length > 0 && <span>{product.length}x{product.width}x{product.height}cm</span>}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-5 py-4">
                                    <div className="flex flex-col items-start gap-1">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-sm font-black ${product.currentStock <= product.minStock ? 'text-red-500' : 'text-emerald-500'}`}>
                                                {product.currentStock} {product.unit}
                                            </span>
                                            {product.currentStock <= product.minStock && <AlertTriangle size={13} className="text-red-500 animate-pulse" />}
                                        </div>
                                        <div className="w-24 h-1.5 bg-[var(--admin-surface-3)] rounded-full overflow-hidden">
                                            <div
                                                className={`h-full transition-all ${product.currentStock <= product.minStock ? 'bg-red-500' : 'bg-emerald-500'}`}
                                                style={{ width: `${Math.min(100, (product.currentStock / (product.minStock * 2 || 1)) * 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                </td>
                                <td className="px-5 py-4 text-right">
                                    <p className="text-[11px] text-[var(--admin-text-tertiary)] font-medium">Custo: R$ {product.averageCost.toLocaleString('pt-BR')}</p>
                                    <p className="text-sm font-bold text-[var(--admin-text-primary)] mt-0.5">Venda: R$ {product.salePrice.toLocaleString('pt-BR')}</p>
                                </td>
                                <td className="px-5 py-4 text-center">
                                    <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => { setEditingProduct(product); setActiveModalTab('general'); setIsProductModalOpen(true); }}
                                            className="p-2 text-blue-500 hover:bg-blue-500/10 rounded-lg transition-colors" title="Editar"
                                        >
                                            <Edit size={16} />
                                        </button>
                                        <button
                                            onClick={() => { setEditingProduct(product); setActiveModalTab('history'); setIsProductModalOpen(true); }}
                                            className="p-2 text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-colors" title="Movimentar Estoque"
                                        >
                                            <Layers size={16} />
                                        </button>
                                        <button
                                            onClick={async () => {
                                                if (confirm("Deseja realmente excluir este item?")) {
                                                    await supabase.from('SITE_Products').delete().eq('id', product.id);
                                                    fetchProducts();
                                                }
                                            }}
                                            className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors" title="Excluir"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        )})
                        }
                    </tbody>
                </table>
            </div>

            {/* Product Modal */}
            <AnimatePresence>
                {isProductModalOpen && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-[var(--admin-surface-1)] w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-[var(--admin-border)]"
                        >
                            <div className="px-6 pt-5 pb-4 border-b border-[var(--admin-border)] flex justify-between items-start bg-[var(--admin-surface-2)]">
                                <div>
                                    <h3 className="text-lg font-black text-[var(--admin-text-primary)]">{editingProduct?.id ? 'Editar Item' : 'Novo Item no Catálogo'}</h3>
                                    <div className="flex gap-4 mt-2">
                                        {(['general', ...(editingProduct?.id && editingProduct.type === 'product' ? ['bom'] : []), ...(editingProduct?.id ? ['history', 'reservations'] : [])] as const).map(tab => (
                                            <button
                                                key={tab}
                                                onClick={() => setActiveModalTab(tab as any)}
                                                className={`text-[10px] font-black uppercase tracking-widest pb-1 border-b-2 transition-all ${activeModalTab === tab ? 'border-wtech-gold text-wtech-gold' : 'border-transparent text-[var(--admin-text-tertiary)]'}`}
                                            >
                                                {tab === 'general' ? 'Geral' : tab === 'bom' ? 'Composição (BOM)' : tab === 'history' ? 'Movimentações' : 'Reservas'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <button onClick={() => setIsProductModalOpen(false)} className="p-2 hover:bg-[var(--admin-surface-3)] rounded-xl transition-colors text-[var(--admin-text-tertiary)] hover:text-red-500 shrink-0">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-6 max-h-[70vh] overflow-y-auto space-y-4 custom-scrollbar">
                                {activeModalTab === 'general' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="md:col-span-2">
                                            <label className="block text-[10px] font-black text-[var(--admin-text-tertiary)] uppercase tracking-widest mb-1.5">Nome do Item</label>
                                            <input
                                                className="w-full bg-[var(--admin-surface-2)] border border-[var(--admin-border)] rounded-xl px-3 py-2.5 text-sm font-bold text-[var(--admin-text-primary)] focus:border-wtech-gold outline-none transition-all placeholder:text-[var(--admin-text-tertiary)]"
                                                value={editingProduct?.name || ''}
                                                onChange={e => setEditingProduct({...editingProduct, name: e.target.value})}
                                                placeholder="Ex: Kit de Suspensão Hércules"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[10px] font-black text-[var(--admin-text-tertiary)] uppercase tracking-widest mb-1.5">SKU / Código</label>
                                            <input
                                                className="w-full bg-[var(--admin-surface-2)] border border-[var(--admin-border)] rounded-xl px-3 py-2.5 text-sm font-bold text-[var(--admin-text-primary)] focus:border-wtech-gold outline-none transition-all uppercase placeholder:text-[var(--admin-text-tertiary)]"
                                                value={editingProduct?.sku || ''}
                                                onChange={e => setEditingProduct({...editingProduct, sku: e.target.value.toUpperCase()})}
                                                placeholder="WT-KIT-001"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[10px] font-black text-[var(--admin-text-tertiary)] uppercase tracking-widest mb-1.5">Tipo de Item</label>
                                            <select
                                                className="w-full bg-[var(--admin-surface-2)] border border-[var(--admin-border)] rounded-xl px-3 py-2.5 text-sm font-bold text-[var(--admin-text-primary)] focus:border-wtech-gold outline-none transition-all"
                                                value={editingProduct?.type || 'product'}
                                                onChange={e => setEditingProduct({...editingProduct, type: e.target.value as any})}
                                            >
                                                <option value="product">Produto Final</option>
                                                <option value="raw_material">Insumo / Matéria-prima</option>
                                                <option value="service" disabled>Serviço (Em breve)</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-[10px] font-black text-[var(--admin-text-tertiary)] uppercase tracking-widest mb-1.5">Unidade</label>
                                            <select
                                                className="w-full bg-[var(--admin-surface-2)] border border-[var(--admin-border)] rounded-xl px-3 py-2.5 text-sm font-bold text-[var(--admin-text-primary)] focus:border-wtech-gold outline-none transition-all"
                                                value={editingProduct?.unit || 'un'}
                                                onChange={e => setEditingProduct({...editingProduct, unit: e.target.value})}
                                            >
                                                <option value="un">Unidade (un)</option>
                                                <option value="par">Par</option>
                                                <option value="litro">Litro (L)</option>
                                                <option value="kg">Quilo (kg)</option>
                                                <option value="grama">Grama (g)</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-[10px] font-black text-[var(--admin-text-tertiary)] uppercase tracking-widest mb-1.5">Estoque Mínimo</label>
                                            <input
                                                type="number"
                                                className="w-full bg-[var(--admin-surface-2)] border border-[var(--admin-border)] rounded-xl px-3 py-2.5 text-sm font-bold text-[var(--admin-text-primary)] focus:border-wtech-gold outline-none transition-all"
                                                value={editingProduct?.minStock || 0}
                                                onChange={e => setEditingProduct({...editingProduct, minStock: parseInt(e.target.value)})}
                                            />
                                        </div>

                                        <div className="bg-emerald-500/5 p-5 rounded-2xl border border-emerald-500/15 flex flex-col gap-5 md:col-span-2">
                                            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em]">Configuração de Preços & Níveis</p>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-[10px] font-black text-[var(--admin-text-tertiary)] uppercase tracking-widest mb-1.5">Custo Médio</label>
                                                    <div className="relative">
                                                        <span className="absolute left-3 top-2.5 text-xs font-bold text-[var(--admin-text-tertiary)]">R$</span>
                                                        <input type="number" step="0.01"
                                                            className="w-full bg-[var(--admin-surface-1)] border border-[var(--admin-border)] rounded-xl py-2.5 pl-9 pr-3 text-sm font-bold text-[var(--admin-text-primary)] focus:border-emerald-500 outline-none transition-all"
                                                            value={editingProduct?.averageCost || 0}
                                                            onChange={e => setEditingProduct({...editingProduct, averageCost: parseFloat(e.target.value)})}
                                                        />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1.5">Preço Final</label>
                                                    <div className="relative">
                                                        <span className="absolute left-3 top-2.5 text-xs font-bold text-blue-400">R$</span>
                                                        <input type="number" step="0.01"
                                                            className="w-full bg-[var(--admin-surface-1)] border border-blue-500/30 rounded-xl py-2.5 pl-9 pr-3 text-sm font-black text-[var(--admin-text-primary)] focus:border-blue-500 outline-none transition-all"
                                                            value={editingProduct?.priceRetail || editingProduct?.salePrice || 0}
                                                            onChange={e => {
                                                                const val = parseFloat(e.target.value);
                                                                setEditingProduct({...editingProduct, priceRetail: val, salePrice: val});
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-emerald-500/15">
                                                <div>
                                                    <label className="block text-[10px] font-black text-orange-500 uppercase tracking-widest mb-1.5">Credenciados</label>
                                                    <div className="relative">
                                                        <span className="absolute left-3 top-2.5 text-xs font-bold text-orange-400">R$</span>
                                                        <input type="number" step="0.01"
                                                            className="w-full bg-[var(--admin-surface-1)] border border-orange-500/30 rounded-xl py-2.5 pl-9 pr-3 text-sm font-bold text-[var(--admin-text-primary)] focus:border-orange-500 outline-none transition-all"
                                                            value={editingProduct?.pricePartner || 0}
                                                            onChange={e => setEditingProduct({...editingProduct, pricePartner: parseFloat(e.target.value)})}
                                                        />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-black text-purple-500 uppercase tracking-widest mb-1.5">Distribuidor</label>
                                                    <div className="relative">
                                                        <span className="absolute left-3 top-2.5 text-xs font-bold text-purple-400">R$</span>
                                                        <input type="number" step="0.01"
                                                            className="w-full bg-[var(--admin-surface-1)] border border-purple-500/30 rounded-xl py-2.5 pl-9 pr-3 text-sm font-bold text-[var(--admin-text-primary)] focus:border-purple-500 outline-none transition-all"
                                                            value={editingProduct?.priceDistributor || 0}
                                                            onChange={e => setEditingProduct({...editingProduct, priceDistributor: parseFloat(e.target.value)})}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="md:col-span-2">
                                                    <label className="block text-[10px] font-black text-cyan-500 uppercase tracking-widest mb-1.5">Mecânico sem curso</label>
                                                    <div className="relative">
                                                        <span className="absolute left-3 top-2.5 text-xs font-bold text-cyan-400">R$</span>
                                                        <input type="number" step="0.01"
                                                            className="w-full bg-[var(--admin-surface-1)] border border-cyan-500/30 rounded-xl py-2.5 pl-9 pr-3 text-sm font-bold text-[var(--admin-text-primary)] focus:border-cyan-500 outline-none transition-all"
                                                            value={editingProduct?.priceMechanic || 0}
                                                            onChange={e => setEditingProduct({...editingProduct, priceMechanic: parseFloat(e.target.value)})}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-blue-500/5 p-4 rounded-2xl border border-blue-500/15 flex flex-col gap-4 md:col-span-2">
                                            <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Logística & Dimensões</p>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                {[
                                                    { label: 'Peso (g)', field: 'weight' },
                                                    { label: 'Comp. (cm)', field: 'length' },
                                                    { label: 'Larg. (cm)', field: 'width' },
                                                    { label: 'Alt. (cm)', field: 'height' },
                                                ].map(({ label, field }) => (
                                                    <div key={field}>
                                                        <label className="block text-[10px] font-black text-[var(--admin-text-tertiary)] uppercase tracking-widest mb-1.5">{label}</label>
                                                        <input type="number"
                                                            className="w-full bg-[var(--admin-surface-1)] border border-blue-500/30 rounded-xl px-3 py-2.5 text-sm font-bold text-[var(--admin-text-primary)] focus:border-blue-400 outline-none transition-all"
                                                            value={(editingProduct as any)?.[field] || 0}
                                                            onChange={e => setEditingProduct({...editingProduct, [field]: parseFloat(e.target.value)})}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="md:col-span-2">
                                            <label className="block text-[10px] font-black text-[var(--admin-text-tertiary)] uppercase tracking-widest mb-1.5">URL da Imagem</label>
                                            <input
                                                className="w-full bg-[var(--admin-surface-2)] border border-[var(--admin-border)] rounded-xl px-3 py-2.5 text-sm font-bold text-[var(--admin-text-primary)] focus:border-wtech-gold outline-none transition-all placeholder:text-[var(--admin-text-tertiary)]"
                                                value={editingProduct?.imageUrl || ''}
                                                onChange={e => setEditingProduct({...editingProduct, imageUrl: e.target.value})}
                                                placeholder="https://exemplo.com/imagem.jpg"
                                            />
                                        </div>

                                        <div className="md:col-span-2">
                                            <label className="block text-[10px] font-black text-[var(--admin-text-tertiary)] uppercase tracking-widest mb-1.5">Descrição Curta</label>
                                            <textarea
                                                className="w-full bg-[var(--admin-surface-2)] border border-[var(--admin-border)] rounded-xl px-3 py-2.5 text-sm font-bold text-[var(--admin-text-primary)] focus:border-wtech-gold outline-none transition-all h-24 placeholder:text-[var(--admin-text-tertiary)]"
                                                value={editingProduct?.description || ''}
                                                onChange={e => setEditingProduct({...editingProduct, description: e.target.value})}
                                                placeholder="Detalhes do produto para o catálogo..."
                                            />
                                        </div>
                                    </div>
                                )}

                                {activeModalTab === 'bom' && (
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <h4 className="text-sm font-black text-[var(--admin-text-primary)] uppercase">Matérias-primas / Componentes</h4>
                                            <button
                                                onClick={() => setIsAddingBOM(!isAddingBOM)}
                                                className="text-xs bg-wtech-gold text-black px-3 py-1.5 rounded-lg font-bold hover:bg-yellow-500 transition-all flex items-center gap-1"
                                            >
                                                {isAddingBOM ? <X size={13} /> : <Plus size={13} />}
                                                {isAddingBOM ? 'Voltar' : 'Adicionar Componente'}
                                            </button>
                                        </div>
                                        {isAddingBOM && (
                                            <div className="bg-[var(--admin-surface-2)] p-4 rounded-xl border border-dashed border-[var(--admin-border)] space-y-3">
                                                <p className="text-[10px] font-black text-[var(--admin-text-tertiary)] uppercase tracking-widest">Buscar Insumo</p>
                                                <div className="flex gap-2">
                                                    <div className="relative flex-1">
                                                        <Search className="absolute left-3 top-2.5 text-[var(--admin-text-tertiary)]" size={14} />
                                                        <input type="text" placeholder="Nome ou SKU..."
                                                            className="w-full pl-9 pr-3 py-2 text-sm bg-[var(--admin-surface-1)] border border-[var(--admin-border)] text-[var(--admin-text-primary)] rounded-lg outline-none focus:border-wtech-gold transition-all placeholder:text-[var(--admin-text-tertiary)]"
                                                            value={bomSearch}
                                                            onChange={(e) => setBomSearch(e.target.value)}
                                                        />
                                                    </div>
                                                    <input type="number"
                                                        className="w-20 px-3 py-2 text-sm bg-[var(--admin-surface-1)] border border-[var(--admin-border)] text-[var(--admin-text-primary)] rounded-lg outline-none focus:border-wtech-gold transition-all"
                                                        value={bomQuantity}
                                                        onChange={(e) => setBomQuantity(Number(e.target.value))}
                                                    />
                                                </div>
                                                {bomSearch.length > 2 && (
                                                    <div className="bg-[var(--admin-surface-1)] rounded-lg border border-[var(--admin-border)] max-h-40 overflow-y-auto divide-y divide-[var(--admin-border)]">
                                                        {products
                                                            .filter(p => p.id !== editingProduct?.id && (p.name.toLowerCase().includes(bomSearch.toLowerCase()) || p.sku?.toLowerCase().includes(bomSearch.toLowerCase())))
                                                            .map(p => (
                                                                <button key={p.id} onClick={() => handleAddBOMItem(p.id)}
                                                                    className="w-full text-left px-4 py-2.5 hover:bg-[var(--admin-surface-2)] flex justify-between items-center group transition-colors"
                                                                >
                                                                    <div>
                                                                        <p className="text-sm font-bold text-[var(--admin-text-primary)]">{p.name}</p>
                                                                        <p className="text-[10px] text-[var(--admin-text-tertiary)] uppercase font-bold">{p.sku} | {p.unit}</p>
                                                                    </div>
                                                                    <Plus size={14} className="text-[var(--admin-text-tertiary)] group-hover:text-wtech-gold" />
                                                                </button>
                                                            ))
                                                        }
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        <div className="bg-[var(--admin-surface-2)] rounded-xl border border-[var(--admin-border)] overflow-hidden">
                                            <table className="w-full text-xs">
                                                <thead className="bg-[var(--admin-surface-3)] text-[var(--admin-text-tertiary)] uppercase font-black border-b border-[var(--admin-border)]">
                                                    <tr>
                                                        <th className="px-4 py-3 text-left">Item</th>
                                                        <th className="px-4 py-3 text-center">Quantidade</th>
                                                        <th className="px-4 py-3 text-center">Ações</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-[var(--admin-border)]">
                                                    {loadingBOM ? (
                                                        <tr><td colSpan={3} className="px-4 py-6 text-center text-[var(--admin-text-tertiary)]">Carregando BOM...</td></tr>
                                                    ) : bomItems.length === 0 ? (
                                                        <tr><td colSpan={3} className="px-4 py-6 text-center text-[var(--admin-text-tertiary)] italic">Nenhum componente definido.</td></tr>
                                                    ) : bomItems.map(item => (
                                                        <tr key={item.id} className="hover:bg-[var(--admin-surface-1)] transition-colors">
                                                            <td className="px-4 py-3 font-bold text-[var(--admin-text-primary)]">{item.name}</td>
                                                            <td className="px-4 py-3 text-center text-blue-500 font-black">{item.quantity} {item.unit}</td>
                                                            <td className="px-4 py-3 text-center">
                                                                <button onClick={() => handleRemoveBOMItem(item.id)} className="p-1.5 text-red-500 hover:bg-red-500/10 rounded transition-colors">
                                                                    <Trash2 size={13} />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {activeModalTab === 'history' && (
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <h4 className="text-sm font-black text-[var(--admin-text-primary)] uppercase">Histórico de Movimentações</h4>
                                            <button
                                                onClick={() => setIsMovementModalOpen(true)}
                                                className="text-[10px] bg-[var(--admin-text-primary)] text-[var(--admin-surface-1)] px-3 py-1.5 rounded-lg font-black hover:opacity-80 transition-all flex items-center gap-1 uppercase tracking-wider"
                                            >
                                                <Layers size={13} /> Lançar Movimento
                                            </button>
                                        </div>
                                        <div className="space-y-2">
                                            {loadingHistory ? (
                                                <div className="text-center py-8 text-[var(--admin-text-tertiary)] italic">Carregando histórico...</div>
                                            ) : stockHistory.length === 0 ? (
                                                <div className="text-center py-8 text-[var(--admin-text-tertiary)] italic">Nenhuma movimentação registrada.</div>
                                            ) : stockHistory.map(entry => (
                                                <div key={entry.id} className="flex items-center justify-between p-3 bg-[var(--admin-surface-2)] rounded-xl border border-[var(--admin-border)]">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`p-2 rounded-lg ${
                                                            entry.type === 'IN' ? 'bg-emerald-500/10 text-emerald-500' :
                                                            entry.type === 'OUT' ? 'bg-red-500/10 text-red-500' :
                                                            entry.type === 'RESERVED' ? 'bg-blue-500/10 text-blue-500' :
                                                            'bg-[var(--admin-surface-3)] text-[var(--admin-text-tertiary)]'
                                                        }`}>
                                                            {entry.type === 'IN' ? <ArrowUpRight size={15} /> :
                                                             entry.type === 'OUT' ? <ArrowDownRight size={15} /> :
                                                             entry.type === 'RESERVED' ? <PackageCheck size={15} /> :
                                                             <Edit size={15} />}
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-black text-[var(--admin-text-primary)] leading-tight">
                                                                {entry.type === 'IN' ? 'Entrada' :
                                                                 entry.type === 'OUT' ? 'Saída' :
                                                                 entry.type === 'RESERVED' ? 'Reserva' : 'Ajuste'} — {entry.quantity} {editingProduct?.unit}
                                                            </p>
                                                            <p className="text-[10px] text-[var(--admin-text-tertiary)] font-medium">Origem: {entry.origin || 'Manual'} · {new Date(entry.createdAt).toLocaleString('pt-BR')}</p>
                                                        </div>
                                                    </div>
                                                    <p className="text-[10px] text-[var(--admin-text-tertiary)] italic max-w-[120px] text-right">{entry.notes}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {activeModalTab === 'reservations' && (
                                    <div className="space-y-4">
                                        <h4 className="text-sm font-black text-[var(--admin-text-primary)] uppercase">Reservas Ativas</h4>
                                        <div className="bg-orange-500/10 p-4 rounded-xl border border-orange-500/20 flex items-center gap-3">
                                            <div className="p-2 bg-orange-500/20 text-orange-500 rounded-lg">
                                                <ShoppingCart size={16} />
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-[var(--admin-text-primary)]">Total Reservado: {stockHistory.filter(h => h.type === 'RESERVED').reduce((acc, h) => acc + h.quantity, 0)} {editingProduct?.unit}</p>
                                                <p className="text-[10px] text-orange-500 font-medium">Estoque bloqueado para pedidos pendentes.</p>
                                            </div>
                                        </div>
                                        <div className="bg-[var(--admin-surface-2)] rounded-xl border border-[var(--admin-border)] overflow-hidden divide-y divide-[var(--admin-border)] h-[250px] overflow-y-auto custom-scrollbar">
                                            {stockHistory.filter(h => h.type === 'RESERVED').length === 0 ? (
                                                <div className="p-12 text-center text-[var(--admin-text-tertiary)] font-bold italic">Nenhuma reserva ativa para este item.</div>
                                            ) : stockHistory.filter(h => h.type === 'RESERVED').map(item => (
                                                <div key={item.id} className="flex items-center justify-between p-4 hover:bg-[var(--admin-surface-1)] transition-colors">
                                                    <div>
                                                        <p className="text-xs font-black text-[var(--admin-text-primary)]">{item.origin || 'Venda'}</p>
                                                        <p className="text-[10px] text-[var(--admin-text-tertiary)] font-bold uppercase">Ref: {item.referenceId?.slice(0,8) || '-'}</p>
                                                        <p className="text-[10px] text-[var(--admin-text-tertiary)]">{new Date(item.createdAt).toLocaleDateString('pt-BR')}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-sm font-black text-orange-500">-{item.quantity} {editingProduct?.unit}</p>
                                                        <p className="text-[10px] text-[var(--admin-text-tertiary)] italic">{item.notes}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="px-6 py-4 bg-[var(--admin-surface-2)] border-t border-[var(--admin-border)] flex gap-3">
                                <button
                                    onClick={() => setIsProductModalOpen(false)}
                                    className="flex-1 py-2.5 border border-[var(--admin-border)] text-[var(--admin-text-secondary)] rounded-xl font-bold hover:bg-[var(--admin-surface-3)] transition-all text-sm"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleSaveProduct}
                                    className="flex-[2] py-2.5 bg-gradient-to-r from-wtech-gold to-yellow-600 text-black rounded-xl font-black hover:scale-105 active:scale-95 transition-all shadow-md shadow-yellow-500/20 flex items-center justify-center gap-2 text-sm"
                                >
                                    <Save size={16} /> Salvar no Catálogo
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Manual Movement Modal */}
            <AnimatePresence>
                {isMovementModalOpen && (
                    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="bg-[var(--admin-surface-1)] w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-[var(--admin-border)]"
                        >
                            <div className="px-6 py-4 border-b border-[var(--admin-border)] flex justify-between items-center bg-[var(--admin-surface-2)]">
                                <h3 className="text-base font-black text-[var(--admin-text-primary)]">Lançar Movimento Manual</h3>
                                <button onClick={() => setIsMovementModalOpen(false)} className="p-2 text-[var(--admin-text-tertiary)] hover:text-red-500 transition-colors">
                                    <X size={18} />
                                </button>
                            </div>
                            <div className="p-6 space-y-4">
                                <div className="p-4 bg-wtech-gold/10 rounded-2xl border border-wtech-gold/20 flex gap-3 items-center">
                                    <div className="w-10 h-10 rounded-xl bg-[var(--admin-surface-1)] flex items-center justify-center border border-[var(--admin-border)] shrink-0">
                                        <Package size={16} className="text-wtech-gold" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-wtech-gold uppercase tracking-widest">Ajustando Estoque de:</p>
                                        <p className="text-sm font-black text-[var(--admin-text-primary)] leading-tight">{editingProduct?.name}</p>
                                        <p className="text-[11px] text-[var(--admin-text-tertiary)]">Saldo Atual: {editingProduct?.currentStock} {editingProduct?.unit}</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <label className="block text-[10px] font-black text-[var(--admin-text-tertiary)] uppercase tracking-wider mb-1.5">Tipo de Movimento</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button
                                                onClick={() => setMovementData({...movementData, type: 'IN'})}
                                                className={`py-2.5 rounded-xl border font-bold text-sm transition-all ${movementData.type === 'IN' ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-500/20' : 'bg-[var(--admin-surface-2)] border-[var(--admin-border)] text-[var(--admin-text-tertiary)]'}`}
                                            >
                                                Entrada (+)
                                            </button>
                                            <button
                                                onClick={() => setMovementData({...movementData, type: 'OUT'})}
                                                className={`py-2.5 rounded-xl border font-bold text-sm transition-all ${movementData.type === 'OUT' ? 'bg-red-600 border-red-600 text-white shadow-lg shadow-red-500/20' : 'bg-[var(--admin-surface-2)] border-[var(--admin-border)] text-[var(--admin-text-tertiary)]'}`}
                                            >
                                                Saída (-)
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-[var(--admin-text-tertiary)] uppercase tracking-wider mb-1.5">Quantidade</label>
                                        <input type="number"
                                            className="w-full bg-[var(--admin-surface-2)] border border-[var(--admin-border)] rounded-xl px-3 py-2.5 font-black text-lg text-[var(--admin-text-primary)] focus:border-wtech-gold outline-none transition-all"
                                            value={movementData.quantity}
                                            onChange={e => setMovementData({...movementData, quantity: Number(e.target.value)})}
                                        />
                                    </div>
                                    <div className="flex items-end pb-1">
                                        <p className="text-xs font-bold text-[var(--admin-text-tertiary)]">Novo Saldo: <span className="text-[var(--admin-text-primary)] font-black">
                                            {movementData.type === 'IN'
                                                ? (editingProduct?.currentStock || 0) + movementData.quantity
                                                : (editingProduct?.currentStock || 0) - movementData.quantity}
                                        </span></p>
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-[10px] font-black text-[var(--admin-text-tertiary)] uppercase tracking-wider mb-1.5">Observações / Motivo</label>
                                        <textarea
                                            className="w-full bg-[var(--admin-surface-2)] border border-[var(--admin-border)] rounded-xl px-3 py-2.5 text-sm text-[var(--admin-text-primary)] focus:border-wtech-gold outline-none transition-all placeholder:text-[var(--admin-text-tertiary)]"
                                            rows={2}
                                            placeholder="Ex: Ajuste de inventário mensal..."
                                            value={movementData.notes}
                                            onChange={e => setMovementData({...movementData, notes: e.target.value})}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="px-6 py-4 bg-[var(--admin-surface-2)] border-t border-[var(--admin-border)] flex gap-3">
                                <button onClick={() => setIsMovementModalOpen(false)} className="flex-1 py-2.5 text-sm font-bold text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-secondary)] transition-colors">Cancelar</button>
                                <button
                                    onClick={handleRecordMovement}
                                    className="flex-[2] py-2.5 bg-gradient-to-r from-wtech-gold to-yellow-600 text-black rounded-xl font-black hover:scale-105 active:scale-95 transition-all shadow-md shadow-yellow-500/20"
                                >
                                    Confirmar Lançamento
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Mass Adjustment Modal */}
            <AnimatePresence>
                {isMassAdjusting && (
                    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="bg-[var(--admin-surface-1)] w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden border border-[var(--admin-border)]"
                        >
                            <div className="p-6 border-b border-[var(--admin-border)] flex justify-between items-center bg-[var(--admin-surface-2)]">
                                <div>
                                    <h3 className="text-xl font-black text-[var(--admin-text-primary)] italic uppercase tracking-tight">Reajuste em Massa</h3>
                                    <p className="text-[10px] text-[var(--admin-text-tertiary)] font-bold uppercase tracking-widest mt-0.5">Atualize valores de múltiplos produtos</p>
                                </div>
                                <button onClick={() => setIsMassAdjusting(false)} className="p-2.5 bg-[var(--admin-surface-3)] rounded-2xl text-[var(--admin-text-tertiary)] hover:text-red-500 transition-all">
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="p-6 space-y-6">
                                <div className="space-y-3">
                                    <label className="block text-[10px] font-black text-[var(--admin-text-tertiary)] uppercase tracking-[0.2em]">1. Nível de Preço</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {[
                                            { id: 'retail',      label: 'Final',         activeClass: 'bg-blue-600 border-blue-600 shadow-blue-500/30' },
                                            { id: 'partner',     label: 'Credenciados',  activeClass: 'bg-orange-600 border-orange-600 shadow-orange-500/30' },
                                            { id: 'mechanic',    label: 'Mec sem curso', activeClass: 'bg-cyan-600 border-cyan-600 shadow-cyan-500/30' },
                                            { id: 'distributor', label: 'Distribuidor',  activeClass: 'bg-purple-600 border-purple-600 shadow-purple-500/30' }
                                        ].map(level => (
                                            <button key={level.id}
                                                onClick={() => setMassAdjustData({...massAdjustData, level: level.id})}
                                                className={`py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-sm transition-all border-2 ${massAdjustData.level === level.id ? `${level.activeClass} text-white shadow-lg` : 'bg-[var(--admin-surface-2)] border-transparent text-[var(--admin-text-tertiary)] hover:border-[var(--admin-border)]'}`}
                                            >
                                                {level.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <label className="block text-[10px] font-black text-[var(--admin-text-tertiary)] uppercase tracking-[0.2em]">2. Tipo de Ajuste</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            onClick={() => setMassAdjustData({...massAdjustData, direction: 'increase'})}
                                            className={`p-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all border-2 flex items-center justify-center gap-2 ${massAdjustData.direction === 'increase' ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-500/20' : 'bg-[var(--admin-surface-2)] border-transparent text-[var(--admin-text-tertiary)] hover:border-[var(--admin-border)]'}`}
                                        >
                                            <ArrowUpRight size={16} /> Aumento
                                        </button>
                                        <button
                                            onClick={() => setMassAdjustData({...massAdjustData, direction: 'decrease'})}
                                            className={`p-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all border-2 flex items-center justify-center gap-2 ${massAdjustData.direction === 'decrease' ? 'bg-red-600 border-red-600 text-white shadow-lg shadow-red-500/20' : 'bg-[var(--admin-surface-2)] border-transparent text-[var(--admin-text-tertiary)] hover:border-[var(--admin-border)]'}`}
                                        >
                                            <ArrowDownRight size={16} /> Desconto
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <label className="block text-[10px] font-black text-[var(--admin-text-tertiary)] uppercase tracking-[0.2em]">3. Valor do Reajuste (%)</label>
                                    <div className="relative">
                                        <input type="number"
                                            className="w-full bg-[var(--admin-surface-2)] border-2 border-transparent focus:border-wtech-gold rounded-2xl py-5 px-6 text-3xl font-black text-center text-[var(--admin-text-primary)] outline-none transition-all placeholder:text-[var(--admin-text-tertiary)]"
                                            placeholder="0"
                                            value={massAdjustData.value || ''}
                                            onChange={e => setMassAdjustData({...massAdjustData, value: parseFloat(e.target.value)})}
                                        />
                                        <span className="absolute right-6 top-1/2 -translate-y-1/2 text-2xl font-black text-[var(--admin-text-tertiary)]">%</span>
                                    </div>
                                    <p className="text-[10px] text-[var(--admin-text-tertiary)] font-bold uppercase tracking-widest text-center italic">
                                        O reajuste será aplicado sobre o valor atual de cada produto.
                                    </p>
                                </div>
                            </div>
                            <div className="p-6 bg-[var(--admin-surface-2)] border-t border-[var(--admin-border)] flex gap-3">
                                <button
                                    onClick={() => setIsMassAdjusting(false)}
                                    className="flex-1 py-3 text-xs font-black uppercase tracking-widest text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-secondary)] transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleMassAdjust}
                                    disabled={loading || massAdjustData.value <= 0}
                                    className="flex-[2] py-3.5 bg-gradient-to-r from-wtech-gold to-yellow-600 text-black rounded-2xl font-black uppercase tracking-widest text-sm hover:scale-[1.02] transition-all active:scale-95 disabled:opacity-30 flex items-center justify-center gap-2 italic shadow-md shadow-yellow-500/20"
                                >
                                    {loading ? 'Processando...' : <><Save size={18} /> Aplicar Reajuste Agora</>}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default CatalogManagerView;
