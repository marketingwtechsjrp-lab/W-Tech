
import React, { useState, useEffect } from 'react';
import { 
    Plus, Search, Filter, Edit, Trash2, Package, 
    ArrowUpRight, ArrowDownRight, History, Settings,
    PackageCheck, AlertTriangle, Layers, Wrench, X, Save,
    ShoppingCart, Upload, Download
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
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div>
                    <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                        <Package className="text-wtech-gold" /> Catálogo & Estoque
                    </h2>
                    <p className="text-sm text-gray-500 font-medium">Gerencie seus produtos, insumos e movimentações de estoque.</p>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <label className={`cursor-pointer px-6 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-50 transition-all shadow-sm ${isImporting ? 'opacity-50 pointer-events-none' : ''}`}>
                        <Upload size={20} /> 
                        {isImporting ? 'Processando...' : 'Importar CSV'}
                        <input type="file" accept=".csv" className="hidden" onChange={handleImportCSV} />
                    </label>
                    <button 
                        onClick={() => { setEditingProduct({ type: 'product', unit: 'un' }); setIsProductModalOpen(true); }}
                        className="flex-1 md:flex-none px-6 py-3 bg-wtech-black text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-800 transition-all shadow-lg active:scale-95"
                    >
                        <Plus size={20} /> Novo Item
                    </button>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                    <p className="text-xs font-bold text-gray-400 uppercase">Total de Itens</p>
                    <h3 className="text-2xl font-black">{products.length}</h3>
                </div>
                <div className="bg-red-50 p-4 rounded-xl border border-red-100 shadow-sm">
                    <p className="text-xs font-bold text-red-400 uppercase">Estoque Crítico</p>
                    <h3 className="text-2xl font-black text-red-600">{products.filter(p => p.currentStock <= p.minStock).length}</h3>
                </div>
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 shadow-sm">
                    <p className="text-xs font-bold text-blue-400 uppercase">Produtos Finais</p>
                    <h3 className="text-2xl font-black text-blue-600">{products.filter(p => p.type === 'product').length}</h3>
                </div>
                <div className="bg-green-50 p-4 rounded-xl border border-green-100 shadow-sm">
                    <p className="text-xs font-bold text-green-400 uppercase">Valor em Estoque</p>
                    <h3 className="text-2xl font-black text-green-600">
                        R$ {products.reduce((acc, p) => acc + (p.currentStock * p.averageCost), 0).toLocaleString('pt-BR')}
                    </h3>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="Buscar por nome ou SKU..." 
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 ring-wtech-gold/20 outline-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <select 
                    className="px-4 py-2 border border-gray-200 rounded-lg bg-white outline-none"
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
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase">
                        <tr>
                            <th className="px-6 py-4 w-[50px]">
                                <input 
                                    type="checkbox" 
                                    className="rounded border-gray-300"
                                    onChange={(e) => handleSelectAll(e.target.checked)}
                                    checked={selectedProducts.length === filteredProducts.length && filteredProducts.length > 0}
                                />
                            </th>
                            <th className="px-6 py-4">Item</th>
                            <th className="px-6 py-4">Status Estoque</th>
                            <th className="px-6 py-4 text-right">Custo / Venda</th>
                            <th className="px-6 py-4 text-center">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {loading ? (
                             <tr>
                                <td colSpan={5} className="px-6 py-12 text-center">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="w-8 h-8 border-4 border-wtech-gold border-t-transparent rounded-full animate-spin"></div>
                                        <p className="text-sm text-gray-400 font-medium">Carregando catálogo...</p>
                                    </div>
                                </td>
                            </tr>
                        ) : filteredProducts.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-gray-400 italic">
                                    Nenhum item encontrado.
                                </td>
                            </tr>
                        ) : filteredProducts.map((product) => {
                            const isSelected = selectedProducts.includes(product.id);
                            return (
                            <tr key={product.id} className={`hover:bg-gray-50/50 transition-colors group ${isSelected ? 'bg-indigo-50/30' : ''}`}>
                                <td className="px-6 py-4 align-top">
                                    <input 
                                        type="checkbox" 
                                        className="rounded border-gray-300"
                                        checked={isSelected}
                                        onChange={(e) => handleSelectProduct(product.id, e.target.checked)}
                                    />
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 rounded-lg bg-gray-100 flex-shrink-0 flex items-center justify-center text-gray-400 border border-gray-200 overflow-hidden shadow-sm">
                                            {product.imageUrl ? <img src={product.imageUrl} alt="" className="w-full h-full object-cover" /> : <Package size={20} />}
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-900 leading-tight text-sm line-clamp-2 max-w-[300px]" title={product.name}>
                                                {product.name}
                                            </p>
                                            
                                            <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                                <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-500 font-bold border border-gray-200">
                                                    {product.sku || 'S/ SKU'}
                                                </span>
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase border ${
                                                    product.type === 'product' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                                    product.type === 'raw_material' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                                                    'bg-purple-50 text-purple-600 border-purple-100'
                                                }`}>
                                                    {product.type === 'product' ? 'Produto' : product.type === 'raw_material' ? 'Insumo' : 'Serviço'}
                                                </span>
                                                {product.category && (
                                                     <span className="text-[10px] bg-white px-1.5 py-0.5 rounded text-gray-400 font-medium border border-gray-100 truncate max-w-[100px]">
                                                        {product.category}
                                                    </span>
                                                )}
                                            </div>
                                            
                                            {(product.weight || product.length) > 0 && (
                                                <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-400">
                                                    {product.weight > 0 && <span>{product.weight}g</span>}
                                                    {product.length > 0 && <span>{product.length}x{product.width}x{product.height}cm</span>}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <div className="flex flex-col items-start gap-1">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-sm font-black ${product.currentStock <= product.minStock ? 'text-red-600' : 'text-green-600'}`}>
                                                {product.currentStock} {product.unit}
                                            </span>
                                            {product.currentStock <= product.minStock && <AlertTriangle size={14} className="text-red-500 animate-pulse" />}
                                        </div>
                                        <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden border border-gray-200">
                                            <div 
                                                className={`h-full transition-all ${product.currentStock <= product.minStock ? 'bg-red-500' : 'bg-green-500'}`} 
                                                style={{ width: `${Math.min(100, (product.currentStock / (product.minStock * 2 || 1)) * 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <p className="text-xs text-gray-400 font-medium">Custo: R$ {product.averageCost.toLocaleString('pt-BR')}</p>
                                    <p className="text-sm font-bold text-gray-900 mt-0.5">Venda: R$ {product.salePrice.toLocaleString('pt-BR')}</p>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button 
                                            onClick={() => { setEditingProduct(product); setActiveModalTab('general'); setIsProductModalOpen(true); }}
                                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Editar"
                                        >
                                            <Edit size={18} />
                                        </button>
                                        <button 
                                            onClick={() => { setEditingProduct(product); setActiveModalTab('history'); setIsProductModalOpen(true); }}
                                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Movimentar Estoque"
                                        >
                                            <Layers size={18} />
                                        </button>
                                        <button 
                                            onClick={async () => {
                                                if (confirm("Deseja realmente excluir este item?")) {
                                                    await supabase.from('SITE_Products').delete().eq('id', product.id);
                                                    fetchProducts();
                                                }
                                            }}
                                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Excluir"
                                        >
                                            <Trash2 size={18} />
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
                            className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-gray-100"
                        >
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                <div>
                                    <h3 className="text-xl font-black text-gray-900">{editingProduct?.id ? 'Editar Item' : 'Novo Item no Catálogo'}</h3>
                                    <div className="flex gap-4 mt-2">
                                        <button 
                                            onClick={() => setActiveModalTab('general')}
                                            className={`text-[10px] font-black uppercase tracking-widest pb-1 border-b-2 transition-all ${activeModalTab === 'general' ? 'border-wtech-gold text-wtech-gold' : 'border-transparent text-gray-400'}`}
                                        >
                                            Geral
                                        </button>
                                        {editingProduct?.id && editingProduct.type === 'product' && (
                                            <button 
                                                onClick={() => setActiveModalTab('bom')}
                                                className={`text-[10px] font-black uppercase tracking-widest pb-1 border-b-2 transition-all ${activeModalTab === 'bom' ? 'border-wtech-gold text-wtech-gold' : 'border-transparent text-gray-400'}`}
                                            >
                                                Composição (BOM)
                                            </button>
                                        )}
                                        {editingProduct?.id && (
                                            <button 
                                                onClick={() => setActiveModalTab('history')}
                                                className={`text-[10px] font-black uppercase tracking-widest pb-1 border-b-2 transition-all ${activeModalTab === 'history' ? 'border-wtech-gold text-wtech-gold' : 'border-transparent text-gray-400'}`}
                                            >
                                                Movimentações
                                            </button>
                                        )}
                                        {editingProduct?.id && (
                                            <button 
                                                onClick={() => setActiveModalTab('reservations')}
                                                className={`text-[10px] font-black uppercase tracking-widest pb-1 border-b-2 transition-all ${activeModalTab === 'reservations' ? 'border-wtech-gold text-wtech-gold' : 'border-transparent text-gray-400'}`}
                                            >
                                                Reservas
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <button onClick={() => setIsProductModalOpen(false)} className="p-2 hover:bg-white rounded-full transition-colors text-gray-400 hover:text-red-500">
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="p-6 max-h-[70vh] overflow-y-auto space-y-4">
                                {activeModalTab === 'general' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="md:col-span-2">
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Nome do Item</label>
                                            <input 
                                                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm font-bold focus:bg-white focus:border-wtech-gold outline-none transition-all"
                                                value={editingProduct?.name || ''}
                                                onChange={e => setEditingProduct({...editingProduct, name: e.target.value})}
                                                placeholder="Ex: Kit de Suspensão Hércules"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">SKU / Código</label>
                                            <input 
                                                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm font-bold focus:bg-white focus:border-wtech-gold outline-none transition-all uppercase"
                                                value={editingProduct?.sku || ''}
                                                onChange={e => setEditingProduct({...editingProduct, sku: e.target.value.toUpperCase()})}
                                                placeholder="WT-KIT-001"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Tipo de Item</label>
                                            <select 
                                                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm font-bold focus:bg-white focus:border-wtech-gold outline-none transition-all"
                                                value={editingProduct?.type || 'product'}
                                                onChange={e => setEditingProduct({...editingProduct, type: e.target.value as any})}
                                            >
                                                <option value="product">📦 Produto Final</option>
                                                <option value="raw_material">🧱 Insumo / Matéria-prima</option>
                                                <option value="service" disabled>🛠️ Serviço (Em breve)</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Unidade</label>
                                            <select 
                                                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm font-bold focus:bg-white focus:border-wtech-gold outline-none transition-all"
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
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Estoque Mínimo</label>
                                            <input 
                                                type="number"
                                                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm font-bold focus:bg-white focus:border-wtech-gold outline-none transition-all"
                                                value={editingProduct?.minStock || 0}
                                                onChange={e => setEditingProduct({...editingProduct, minStock: parseInt(e.target.value)})}
                                            />
                                        </div>

                                        <div className="bg-green-50/50 p-4 rounded-2xl border border-green-100 flex flex-col gap-4 md:col-span-2">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-[10px] font-black text-green-600 uppercase tracking-widest mb-1 ml-1">Custo Médio (R$)</label>
                                                    <input 
                                                        type="number"
                                                        step="0.01"
                                                        className="w-full bg-white border border-green-200 rounded-xl p-3 text-sm font-bold focus:border-green-400 outline-none transition-all"
                                                        value={editingProduct?.averageCost || 0}
                                                        onChange={e => setEditingProduct({...editingProduct, averageCost: parseFloat(e.target.value)})}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-black text-green-600 uppercase tracking-widest mb-1 ml-1">Preço de Venda (R$)</label>
                                                    <input 
                                                        type="number"
                                                        step="0.01"
                                                        className="w-full bg-white border border-green-200 rounded-xl p-3 text-sm font-bold focus:border-green-400 outline-none transition-all"
                                                        value={editingProduct?.salePrice || 0}
                                                        onChange={e => setEditingProduct({...editingProduct, salePrice: parseFloat(e.target.value)})}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 flex flex-col gap-4 md:col-span-2">
                                            <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest ml-1">Logística & Dimensões</p>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                <div>
                                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Peso (g)</label>
                                                    <input 
                                                        type="number"
                                                        className="w-full bg-white border border-blue-200 rounded-xl p-3 text-sm font-bold focus:border-blue-400 outline-none transition-all"
                                                        value={editingProduct?.weight || 0}
                                                        onChange={e => setEditingProduct({...editingProduct, weight: parseFloat(e.target.value)})}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Comp. (cm)</label>
                                                    <input 
                                                        type="number"
                                                        className="w-full bg-white border border-blue-200 rounded-xl p-3 text-sm font-bold focus:border-blue-400 outline-none transition-all"
                                                        value={editingProduct?.length || 0}
                                                        onChange={e => setEditingProduct({...editingProduct, length: parseFloat(e.target.value)})}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Larg. (cm)</label>
                                                    <input 
                                                        type="number"
                                                        className="w-full bg-white border border-blue-200 rounded-xl p-3 text-sm font-bold focus:border-blue-400 outline-none transition-all"
                                                        value={editingProduct?.width || 0}
                                                        onChange={e => setEditingProduct({...editingProduct, width: parseFloat(e.target.value)})}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Alt. (cm)</label>
                                                    <input 
                                                        type="number"
                                                        className="w-full bg-white border border-blue-200 rounded-xl p-3 text-sm font-bold focus:border-blue-400 outline-none transition-all"
                                                        value={editingProduct?.height || 0}
                                                        onChange={e => setEditingProduct({...editingProduct, height: parseFloat(e.target.value)})}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="md:col-span-2">
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">URL da Imagem</label>
                                            <input 
                                                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm font-bold focus:bg-white focus:border-wtech-gold outline-none transition-all"
                                                value={editingProduct?.imageUrl || ''}
                                                onChange={e => setEditingProduct({...editingProduct, imageUrl: e.target.value})}
                                                placeholder="https://exemplo.com/imagem.jpg"
                                            />
                                        </div>

                                        <div className="md:col-span-2">
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Descrição Curta</label>
                                            <textarea 
                                                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm font-bold focus:bg-white focus:border-wtech-gold outline-none transition-all h-24"
                                                value={editingProduct?.description || ''}
                                                onChange={e => setEditingProduct({...editingProduct, description: e.target.value})}
                                                placeholder="Detalhes do produto para o catálogo..."
                                            />
                                        </div>
                                    </div>
                                )}

                                {activeModalTab === 'bom' && (
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center text-gray-700">
                                            <h4 className="text-sm font-black uppercase">Matérias-primas / Componentes</h4>
                                            <button 
                                                onClick={() => setIsAddingBOM(!isAddingBOM)}
                                                className="text-xs bg-wtech-gold text-black px-3 py-1.5 rounded-lg font-bold hover:bg-yellow-500 transition-all flex items-center gap-1"
                                            >
                                                {isAddingBOM ? <X size={14} /> : <Plus size={14} />} 
                                                {isAddingBOM ? 'Voltar' : 'Adicionar Componente'}
                                            </button>
                                        </div>

                                        {isAddingBOM && (
                                            <div className="bg-gray-50 p-4 rounded-xl border border-dashed border-gray-300 space-y-3">
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Buscar Insumo</p>
                                                <div className="flex gap-2">
                                                    <div className="relative flex-1">
                                                        <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                                                        <input 
                                                            type="text" 
                                                            placeholder="Nome ou SKU..." 
                                                            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-wtech-gold"
                                                            value={bomSearch}
                                                            onChange={(e) => setBomSearch(e.target.value)}
                                                        />
                                                    </div>
                                                    <div className="w-24">
                                                        <input 
                                                            type="number" 
                                                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-wtech-gold"
                                                            value={bomQuantity}
                                                            onChange={(e) => setBomQuantity(Number(e.target.value))}
                                                        />
                                                    </div>
                                                </div>
                                                
                                                {bomSearch.length > 2 && (
                                                    <div className="bg-white rounded-lg border border-gray-100 shadow-sm max-h-40 overflow-y-auto divide-y divide-gray-50">
                                                        {products
                                                            .filter(p => p.id !== editingProduct?.id && (p.name.toLowerCase().includes(bomSearch.toLowerCase()) || p.sku?.toLowerCase().includes(bomSearch.toLowerCase())))
                                                            .map(p => (
                                                                <button 
                                                                    key={p.id}
                                                                    onClick={() => handleAddBOMItem(p.id)}
                                                                    className="w-full text-left px-4 py-2 hover:bg-gray-50 flex justify-between items-center group transition-colors"
                                                                >
                                                                    <div className="flex flex-col">
                                                                        <span className="text-sm font-bold text-gray-900">{p.name}</span>
                                                                        <span className="text-[10px] text-gray-400 uppercase font-bold">{p.sku} | {p.unit}</span>
                                                                    </div>
                                                                    <Plus size={16} className="text-gray-300 group-hover:text-wtech-gold" />
                                                                </button>
                                                            ))
                                                        }
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        <div className="bg-gray-50 rounded-xl border border-gray-100 overflow-hidden">
                                            <table className="w-full text-xs">
                                                <thead className="bg-gray-100 text-gray-500 uppercase font-black">
                                                    <tr>
                                                        <th className="px-4 py-3 text-left">Item</th>
                                                        <th className="px-4 py-3 text-center">Quantidade</th>
                                                        <th className="px-4 py-3 text-center">Ações</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {loadingBOM ? (
                                                        <tr><td colSpan={3} className="px-4 py-6 text-center text-gray-400">Carregando BOM...</td></tr>
                                                    ) : bomItems.length === 0 ? (
                                                        <tr><td colSpan={3} className="px-4 py-6 text-center text-gray-400 italic">Nenhum componente definido.</td></tr>
                                                    ) : bomItems.map(item => (
                                                        <tr key={item.id} className="hover:bg-white transition-colors">
                                                            <td className="px-4 py-3 font-bold">{item.name}</td>
                                                            <td className="px-4 py-3 text-center text-blue-600 font-black">{item.quantity} {item.unit}</td>
                                                            <td className="px-4 py-3 text-center">
                                                                <button 
                                                                    onClick={() => handleRemoveBOMItem(item.id)}
                                                                    className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
                                                                >
                                                                    <Trash2 size={14} />
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
                                        <div className="flex justify-between items-center text-gray-700">
                                            <h4 className="text-sm font-black uppercase">Histórico de Movimentações</h4>
                                            <button 
                                                onClick={() => setIsMovementModalOpen(true)}
                                                className="text-[10px] bg-black text-white px-3 py-1.5 rounded-lg font-black hover:bg-gray-800 transition-all flex items-center gap-1 uppercase tracking-wider"
                                            >
                                                <Layers size={14} /> Lançar Movimento
                                            </button>
                                        </div>
                                        <div className="space-y-2">
                                            {loadingHistory ? (
                                                <div className="text-center py-6 text-gray-400 italic">Carregando histórico...</div>
                                            ) : stockHistory.length === 0 ? (
                                                <div className="text-center py-6 text-gray-400 italic">Nenhuma movimentação registrada.</div>
                                            ) : stockHistory.map(entry => (
                                                <div key={entry.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`p-2 rounded-lg ${
                                                            entry.type === 'IN' ? 'bg-green-100 text-green-600' :
                                                            entry.type === 'OUT' ? 'bg-red-100 text-red-600' :
                                                            entry.type === 'RESERVED' ? 'bg-blue-100 text-blue-600' :
                                                            'bg-gray-100 text-gray-600'
                                                        }`}>
                                                            {entry.type === 'IN' ? <ArrowUpRight size={16} /> : 
                                                             entry.type === 'OUT' ? <ArrowDownRight size={16} /> :
                                                             entry.type === 'RESERVED' ? <PackageCheck size={16} /> :
                                                             <Edit size={16} />}
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-black text-gray-900 leading-tight">
                                                                {entry.type === 'IN' ? 'Entrada' : 
                                                                 entry.type === 'OUT' ? 'Saída' :
                                                                 entry.type === 'RESERVED' ? 'Reserva' :
                                                                 'Ajuste'} - {entry.quantity} {editingProduct?.unit}
                                                            </p>
                                                            <p className="text-[10px] text-gray-400 font-medium">Origem: {entry.origin || 'Manual'} | {new Date(entry.createdAt).toLocaleString('pt-BR')}</p>
                                                        </div>
                                                    </div>
                                                    <p className="text-[10px] text-gray-400 italic">{entry.notes}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {activeModalTab === 'reservations' && (
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center text-gray-700">
                                            <h4 className="text-sm font-black uppercase">Reservas Ativas</h4>
                                        </div>
                                        <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 flex items-center gap-3">
                                            <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
                                                <ShoppingCart size={18} />
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-orange-900">Total Reservado: {stockHistory.filter(h => h.type === 'RESERVED').reduce((acc, h) => acc + h.quantity, 0)} {editingProduct?.unit}</p>
                                                <p className="text-[10px] text-orange-700">Estoque bloqueado para pedidos pendentes.</p>
                                            </div>
                                        </div>
                                        <div className="bg-gray-50 rounded-xl border border-gray-100 overflow-hidden divide-y divide-gray-200 h-[250px] overflow-y-auto">
                                            {stockHistory.filter(h => h.type === 'RESERVED').length === 0 ? (
                                                <div className="p-12 text-center text-gray-400 font-bold italic">Nenhuma reserva ativa para este item.</div>
                                            ) : stockHistory.filter(h => h.type === 'RESERVED').map(item => (
                                                <div key={item.id} className="flex items-center justify-between p-4 bg-white hover:bg-gray-50 transition-colors">
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-black text-gray-900">{item.origin || 'Venda'}</span>
                                                        <span className="text-[10px] text-gray-400 font-bold uppercase">Ref: {item.referenceId?.slice(0,8) || '-'}</span>
                                                        <span className="text-[10px] text-gray-400">{new Date(item.createdAt).toLocaleDateString('pt-BR')}</span>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-sm font-black text-orange-600">-{item.quantity} {editingProduct?.unit}</p>
                                                        <p className="text-[10px] text-gray-400 font-bold italic">{item.notes}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="p-6 bg-gray-50 border-t border-gray-100 flex gap-3">
                                <button 
                                    onClick={() => setIsProductModalOpen(false)}
                                    className="flex-1 py-3 px-6 border border-gray-200 text-gray-500 rounded-xl font-bold hover:bg-white transition-all outline-none"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    onClick={handleSaveProduct}
                                    className="flex-[2] py-3 px-6 bg-wtech-black text-white rounded-xl font-black hover:bg-gray-800 shadow-xl transition-all active:scale-95 outline-none flex items-center justify-center gap-2"
                                >
                                    <Save size={20} /> Salvar no Catálogo
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
                            className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
                        >
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                <h3 className="text-lg font-black text-gray-900">Lançar Movimento Manual</h3>
                                <button onClick={() => setIsMovementModalOpen(false)} className="p-2 text-gray-400 hover:text-red-500">
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="p-6 space-y-4">
                                <div className="p-4 bg-wtech-gold/10 rounded-2xl border border-wtech-gold/20 flex gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-sm">
                                        <Package className="text-wtech-gold" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-wtech-gold uppercase tracking-widest">Ajustando Estoque de:</p>
                                        <p className="text-sm font-black text-gray-900">{editingProduct?.name}</p>
                                        <p className="text-xs text-gray-500">Saldo Atual: {editingProduct?.currentStock} {editingProduct?.unit}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Tipo de Movimento</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button 
                                                onClick={() => setMovementData({...movementData, type: 'IN'})}
                                                className={`py-2 rounded-xl border font-bold text-sm transition-all ${movementData.type === 'IN' ? 'bg-green-600 border-green-600 text-white shadow-lg' : 'bg-gray-50 border-gray-200 text-gray-400'}`}
                                            >
                                                Entrada (+)
                                            </button>
                                            <button 
                                                onClick={() => setMovementData({...movementData, type: 'OUT'})}
                                                className={`py-2 rounded-xl border font-bold text-sm transition-all ${movementData.type === 'OUT' ? 'bg-red-600 border-red-600 text-white shadow-lg' : 'bg-gray-50 border-gray-200 text-gray-400'}`}
                                            >
                                                Saída (-)
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Quantidade</label>
                                        <input 
                                            type="number"
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 font-black text-lg focus:bg-white outline-none"
                                            value={movementData.quantity}
                                            onChange={e => setMovementData({...movementData, quantity: Number(e.target.value)})}
                                        />
                                    </div>

                                    <div className="flex items-end pb-1">
                                         <p className="text-xs font-bold text-gray-400">Novo Saldo: <span className="text-gray-900 font-black">
                                            {movementData.type === 'IN' 
                                                ? (editingProduct?.currentStock || 0) + movementData.quantity 
                                                : (editingProduct?.currentStock || 0) - movementData.quantity}
                                         </span></p>
                                    </div>

                                    <div className="col-span-2">
                                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Observações / Motivo</label>
                                        <textarea 
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm font-medium focus:bg-white outline-none"
                                            rows={2}
                                            placeholder="Ex: Ajuste de inventário mensal..."
                                            value={movementData.notes}
                                            onChange={e => setMovementData({...movementData, notes: e.target.value})}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="p-6 bg-gray-50 border-t border-gray-100 flex gap-3">
                                <button onClick={() => setIsMovementModalOpen(false)} className="flex-1 py-3 text-sm font-bold text-gray-400">Cancelar</button>
                                <button 
                                    onClick={handleRecordMovement}
                                    className="flex-[2] py-3 bg-wtech-black text-white rounded-xl font-black shadow-xl hover:bg-gray-800 transition-all active:scale-95"
                                >
                                    Confirmar Lançamento
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
