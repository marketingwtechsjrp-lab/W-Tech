import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import {
    Plus, Trash2, Edit, GripVertical, ChevronDown, ChevronUp,
    Save, X, CheckSquare, Users, Hash, Info, ClipboardList
} from 'lucide-react';

export interface ChecklistTemplateItem {
    id: string;
    name: string;
    category: string;
    quantity_type: 'per_student' | 'fixed';
    quantity_value: number;
    unit: string;
    notes: string;
    sort_order: number;
    is_active: boolean;
}

const CATEGORIES = [
    'Material do Aluno',
    'Documentos',
    'Alimentação',
    'Marketing & Sinalização',
    'Equipamentos',
    'Ferramentas',
    'Logística',
    'Outro',
];

const CATEGORY_COLORS: Record<string, string> = {
    'Material do Aluno':       'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    'Documentos':              'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    'Alimentação':             'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    'Marketing & Sinalização': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    'Equipamentos':            'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
    'Ferramentas':             'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    'Logística':               'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    'Outro':                   'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

const inputCls = 'w-full px-3 py-2 bg-[var(--admin-surface-2)] border border-[var(--admin-border)] text-[var(--admin-text-primary)] rounded-lg text-sm outline-none focus:border-wtech-gold transition-all placeholder:text-[var(--admin-text-tertiary)]';
const labelCls = 'block text-[10px] font-black text-[var(--admin-text-tertiary)] uppercase tracking-widest mb-1';

const emptyItem = (): Partial<ChecklistTemplateItem> => ({
    name: '',
    category: 'Material do Aluno',
    quantity_type: 'per_student',
    quantity_value: 1,
    unit: 'un',
    notes: '',
    sort_order: 999,
    is_active: true,
});

export const CourseChecklistConfig: React.FC = () => {
    const [items, setItems] = useState<ChecklistTemplateItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState<Partial<ChecklistTemplateItem> | null>(null);
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(CATEGORIES));
    const [savingId, setSavingId] = useState<string | null>(null);

    useEffect(() => { fetchItems(); }, []);

    const fetchItems = async () => {
        setLoading(true);
        const { data } = await supabase
            .from('SITE_ChecklistTemplate')
            .select('*')
            .order('sort_order', { ascending: true });
        if (data) setItems(data as ChecklistTemplateItem[]);
        setLoading(false);
    };

    const handleSave = async () => {
        if (!editing?.name?.trim() || !editing.category) {
            alert('Nome e categoria são obrigatórios.');
            return;
        }
        setSavingId(editing.id || 'new');

        const payload = {
            name: editing.name.trim(),
            category: editing.category,
            quantity_type: editing.quantity_type || 'per_student',
            quantity_value: Number(editing.quantity_value) || 1,
            unit: editing.unit?.trim() || 'un',
            notes: editing.notes?.trim() || '',
            sort_order: Number(editing.sort_order) || 999,
            is_active: editing.is_active ?? true,
        };

        let error;
        if (editing.id) {
            ({ error } = await supabase.from('SITE_ChecklistTemplate').update(payload).eq('id', editing.id));
        } else {
            ({ error } = await supabase.from('SITE_ChecklistTemplate').insert([payload]));
        }

        if (error) alert('Erro ao salvar: ' + error.message);
        else { setEditing(null); fetchItems(); }
        setSavingId(null);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Remover este item do template?')) return;
        await supabase.from('SITE_ChecklistTemplate').delete().eq('id', id);
        fetchItems();
    };

    const handleToggleActive = async (item: ChecklistTemplateItem) => {
        await supabase.from('SITE_ChecklistTemplate').update({ is_active: !item.is_active }).eq('id', item.id);
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_active: !i.is_active } : i));
    };

    const groupedItems = CATEGORIES.reduce<Record<string, ChecklistTemplateItem[]>>((acc, cat) => {
        acc[cat] = items.filter(i => i.category === cat);
        return acc;
    }, {});

    const toggleCategory = (cat: string) => {
        setExpandedCategories(prev => {
            const next = new Set(prev);
            next.has(cat) ? next.delete(cat) : next.add(cat);
            return next;
        });
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-sm text-[var(--admin-text-secondary)] max-w-lg">
                        Configure os itens que aparecerão no <strong>Checklist Final</strong> de cada curso presencial.
                        Itens <em>por aluno</em> têm a quantidade calculada automaticamente com base nas inscrições confirmadas.
                    </p>
                </div>
                <button
                    onClick={() => setEditing(emptyItem())}
                    className="shrink-0 flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-wtech-gold to-yellow-600 text-black rounded-xl font-black text-xs uppercase shadow-md shadow-yellow-500/20 hover:scale-105 active:scale-95 transition-all"
                >
                    <Plus size={14} /> Novo Item
                </button>
            </div>

            {/* Form de edição */}
            {editing && (
                <div className="bg-[var(--admin-surface-2)] border border-wtech-gold/30 rounded-2xl p-6 shadow-lg shadow-yellow-500/5">
                    <div className="flex justify-between items-center mb-5">
                        <h4 className="font-black text-[var(--admin-text-primary)] text-sm uppercase tracking-wide">
                            {editing.id ? 'Editar Item' : 'Novo Item'}
                        </h4>
                        <button onClick={() => setEditing(null)} className="p-1.5 text-[var(--admin-text-tertiary)] hover:text-red-500 transition-colors">
                            <X size={16} />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* Nome */}
                        <div className="lg:col-span-2">
                            <label className={labelCls}>Nome do item *</label>
                            <input
                                className={inputCls}
                                value={editing.name || ''}
                                onChange={e => setEditing({ ...editing, name: e.target.value })}
                                placeholder="Ex: Apostilas, Camisetas, Banner..."
                                autoFocus
                            />
                        </div>

                        {/* Categoria */}
                        <div>
                            <label className={labelCls}>Categoria *</label>
                            <select
                                className={inputCls}
                                value={editing.category}
                                onChange={e => setEditing({ ...editing, category: e.target.value })}
                            >
                                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>

                        {/* Tipo de quantidade */}
                        <div>
                            <label className={labelCls}>Tipo de quantidade</label>
                            <div className="flex rounded-xl overflow-hidden border border-[var(--admin-border)]">
                                <button
                                    type="button"
                                    onClick={() => setEditing({ ...editing, quantity_type: 'per_student' })}
                                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-black transition-all ${editing.quantity_type === 'per_student' ? 'bg-wtech-gold text-black' : 'bg-[var(--admin-surface-2)] text-[var(--admin-text-secondary)]'}`}
                                >
                                    <Users size={12} /> Por Aluno
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setEditing({ ...editing, quantity_type: 'fixed' })}
                                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-black transition-all ${editing.quantity_type === 'fixed' ? 'bg-wtech-gold text-black' : 'bg-[var(--admin-surface-2)] text-[var(--admin-text-secondary)]'}`}
                                >
                                    <Hash size={12} /> Fixo
                                </button>
                            </div>
                        </div>

                        {/* Quantidade / multiplicador */}
                        <div>
                            <label className={labelCls}>
                                {editing.quantity_type === 'per_student' ? 'Multiplicador por aluno' : 'Quantidade fixa'}
                            </label>
                            <input
                                type="number"
                                min={1}
                                step={1}
                                className={inputCls}
                                value={editing.quantity_value ?? 1}
                                onChange={e => setEditing({ ...editing, quantity_value: Number(e.target.value) })}
                            />
                        </div>

                        {/* Unidade */}
                        <div>
                            <label className={labelCls}>Unidade</label>
                            <input
                                className={inputCls}
                                value={editing.unit || ''}
                                onChange={e => setEditing({ ...editing, unit: e.target.value })}
                                placeholder="un, kit, via, porção..."
                            />
                        </div>

                        {/* Ordem */}
                        <div>
                            <label className={labelCls}>Ordem na lista</label>
                            <input
                                type="number"
                                min={0}
                                step={10}
                                className={inputCls}
                                value={editing.sort_order ?? 999}
                                onChange={e => setEditing({ ...editing, sort_order: Number(e.target.value) })}
                            />
                        </div>

                        {/* Observações */}
                        <div className="sm:col-span-2">
                            <label className={labelCls}>Observações (opcional)</label>
                            <input
                                className={inputCls}
                                value={editing.notes || ''}
                                onChange={e => setEditing({ ...editing, notes: e.target.value })}
                                placeholder="Instruções adicionais, dicas de embalagem..."
                            />
                        </div>

                        {/* Ativo */}
                        <div className="flex items-center gap-2 pt-5">
                            <input
                                type="checkbox"
                                id="item-active"
                                checked={editing.is_active ?? true}
                                onChange={e => setEditing({ ...editing, is_active: e.target.checked })}
                                className="w-4 h-4 accent-wtech-gold"
                            />
                            <label htmlFor="item-active" className="text-sm font-bold text-[var(--admin-text-secondary)]">
                                Ativo
                            </label>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 mt-5 pt-5 border-t border-[var(--admin-border)]">
                        <button
                            onClick={() => setEditing(null)}
                            className="px-4 py-2 text-sm font-bold text-[var(--admin-text-secondary)] hover:bg-[var(--admin-surface-3)] rounded-xl transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={!!savingId}
                            className="px-5 py-2 bg-emerald-600 text-white rounded-xl font-black text-sm hover:bg-emerald-700 transition-all active:scale-95 flex items-center gap-2 disabled:opacity-60"
                        >
                            <Save size={14} /> Salvar Item
                        </button>
                    </div>
                </div>
            )}

            {/* Info box */}
            <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/30">
                <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                    <strong>Por Aluno:</strong> a quantidade é multiplicada pelo nº de inscritos confirmados no curso.
                    <strong className="ml-2">Fixo:</strong> vai sempre com a quantidade definida aqui, independente do nº de alunos.
                </p>
            </div>

            {/* Lista agrupada por categoria */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="w-8 h-8 border-4 border-wtech-gold border-t-transparent rounded-full animate-spin" />
                </div>
            ) : (
                <div className="space-y-3">
                    {CATEGORIES.map(cat => {
                        const catItems = groupedItems[cat] || [];
                        if (catItems.length === 0 && !editing) return null;
                        const isOpen = expandedCategories.has(cat);

                        return (
                            <div key={cat} className="bg-[var(--admin-surface-1)] rounded-xl border border-[var(--admin-border)] overflow-hidden">
                                {/* Category header */}
                                <button
                                    onClick={() => toggleCategory(cat)}
                                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-[var(--admin-surface-2)] transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${CATEGORY_COLORS[cat] || CATEGORY_COLORS['Outro']}`}>
                                            {cat}
                                        </span>
                                        <span className="text-xs text-[var(--admin-text-tertiary)] font-bold">
                                            {catItems.length} {catItems.length === 1 ? 'item' : 'itens'}
                                            {catItems.filter(i => !i.is_active).length > 0 &&
                                                <span className="ml-1 text-red-400">({catItems.filter(i => !i.is_active).length} inativo{catItems.filter(i => !i.is_active).length > 1 ? 's' : ''})</span>
                                            }
                                        </span>
                                    </div>
                                    {isOpen ? <ChevronUp size={14} className="text-[var(--admin-text-tertiary)]" /> : <ChevronDown size={14} className="text-[var(--admin-text-tertiary)]" />}
                                </button>

                                {isOpen && (
                                    <div className="divide-y divide-[var(--admin-border)]">
                                        {catItems.length === 0 && (
                                            <p className="px-4 py-3 text-xs text-[var(--admin-text-tertiary)] italic">Nenhum item nesta categoria.</p>
                                        )}
                                        {catItems.map(item => (
                                            <div
                                                key={item.id}
                                                className={`flex items-center gap-3 px-4 py-3 transition-colors ${item.is_active ? '' : 'opacity-40'}`}
                                            >
                                                <GripVertical size={14} className="text-[var(--admin-text-tertiary)] shrink-0 cursor-grab" />

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="text-sm font-bold text-[var(--admin-text-primary)]">{item.name}</span>
                                                        {!item.is_active && (
                                                            <span className="text-[10px] font-black text-red-500 uppercase">inativo</span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-3 mt-0.5">
                                                        <span className="text-xs text-[var(--admin-text-secondary)]">
                                                            {item.quantity_type === 'per_student'
                                                                ? <span className="flex items-center gap-1"><Users size={10} /> {item.quantity_value}× por aluno — {item.unit}</span>
                                                                : <span className="flex items-center gap-1"><Hash size={10} /> {item.quantity_value} {item.unit} (fixo)</span>
                                                            }
                                                        </span>
                                                        {item.notes && (
                                                            <span className="text-[10px] text-[var(--admin-text-tertiary)] italic truncate max-w-xs">{item.notes}</span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-1 shrink-0">
                                                    <button
                                                        onClick={() => handleToggleActive(item)}
                                                        title={item.is_active ? 'Desativar' : 'Ativar'}
                                                        className={`p-1.5 rounded-lg transition-colors text-xs font-black ${item.is_active ? 'text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20' : 'text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'}`}
                                                    >
                                                        <CheckSquare size={13} />
                                                    </button>
                                                    <button
                                                        onClick={() => setEditing(item)}
                                                        className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                                    >
                                                        <Edit size={13} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(item.id)}
                                                        className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                    >
                                                        <Trash2 size={13} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {items.length > 0 && (
                <p className="text-xs text-[var(--admin-text-tertiary)] text-center font-bold uppercase tracking-widest">
                    {items.filter(i => i.is_active).length} itens ativos · {items.length} total
                </p>
            )}
        </div>
    );
};

export default CourseChecklistConfig;
