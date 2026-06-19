import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Droplets,
  Plus,
  Edit,
  Trash2,
  X,
  AlertCircle,
  CheckCircle2,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { cn } from '../../../lib/utils';

interface SuspensionOil {
  id: string;
  category: string;
  moto_brand: string;
  moto_model: string;
  part_type: string;
  suspension_brand: string | null;
  suspension_model: string | null;
  oil_level_mm: string | null;
  oil_volume_ml: string | null;
  viscosity: string | null;
  oil_product: string | null;
  source: string | null;
  is_validated: boolean;
  notes: string | null;
  created_at?: string;
}

const CATEGORIES = ['On Road', 'Off Road', 'Speed', 'Motocross'];

const emptyItem = (): Partial<SuspensionOil> => ({
  category: 'Off Road',
  moto_brand: '',
  moto_model: '',
  part_type: 'Front',
  suspension_brand: '',
  suspension_model: '',
  oil_level_mm: '',
  oil_volume_ml: '',
  viscosity: '',
  oil_product: '',
  source: '',
  is_validated: false,
  notes: '',
});

export default function SuspensionOilManagerView() {
  // Data State
  const [records, setRecords] = useState<SuspensionOil[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [validatedCount, setValidatedCount] = useState(0);

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedBrand, setSelectedBrand] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all'); // all | validated | pending
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [availableBrands, setAvailableBrands] = useState<string[]>([]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<SuspensionOil> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchUniqueBrands();
    fetchStats();
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [currentPage, selectedCategory, selectedBrand, selectedType, selectedStatus, searchTerm]);

  const fetchUniqueBrands = async () => {
    try {
      const PAGE_SIZE = 1000;
      const brandSet = new Set<string>();
      let fromIdx = 0;

      while (true) {
        const { data, error } = await supabase
          .from('SITE_SuspensionOil')
          .select('moto_brand')
          .order('moto_brand', { ascending: true })
          .range(fromIdx, fromIdx + PAGE_SIZE - 1);

        if (error) throw error;
        if (!data || data.length === 0) break;

        data.forEach(item => {
          if (item.moto_brand) brandSet.add(item.moto_brand);
        });

        if (data.length < PAGE_SIZE) break;
        fromIdx += PAGE_SIZE;
      }

      setAvailableBrands(Array.from(brandSet).sort());
    } catch (err: any) {
      console.error('Erro ao buscar marcas únicas:', err.message);
    }
  };

  const fetchStats = async () => {
    try {
      const { count, error } = await supabase
        .from('SITE_SuspensionOil')
        .select('id', { count: 'exact', head: true })
        .eq('is_validated', true);
      if (error) throw error;
      setValidatedCount(count || 0);
    } catch (err: any) {
      console.error('Erro ao buscar estatísticas:', err.message);
    }
  };

  const fetchRecords = async () => {
    setLoading(true);
    try {
      let query = supabase.from('SITE_SuspensionOil').select('*', { count: 'exact' });

      if (selectedCategory !== 'all') query = query.eq('category', selectedCategory);
      if (selectedBrand !== 'all') query = query.eq('moto_brand', selectedBrand);
      if (selectedType !== 'all') query = query.eq('part_type', selectedType);
      if (selectedStatus === 'validated') query = query.eq('is_validated', true);
      if (selectedStatus === 'pending') query = query.eq('is_validated', false);

      if (searchTerm) {
        query = query.or(
          `moto_brand.ilike.%${searchTerm}%,moto_model.ilike.%${searchTerm}%,suspension_brand.ilike.%${searchTerm}%,suspension_model.ilike.%${searchTerm}%,viscosity.ilike.%${searchTerm}%`
        );
      }

      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      query = query
        .order('category', { ascending: true })
        .order('moto_brand', { ascending: true })
        .order('moto_model', { ascending: true })
        .order('part_type', { ascending: true })
        .range(from, to);

      const { data, error, count } = await query;
      if (error) throw error;

      setRecords(data || []);
      setTotalCount(count || 0);
    } catch (err: any) {
      console.error('Erro ao carregar níveis de óleo:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingItem(emptyItem());
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: SuspensionOil) => {
    setEditingItem({ ...item });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir este registro de óleo?')) return;
    try {
      const { error } = await supabase.from('SITE_SuspensionOil').delete().eq('id', id);
      if (error) throw error;
      setRecords(prev => prev.filter(item => item.id !== id));
      setTotalCount(prev => prev - 1);
      fetchStats();
    } catch (err: any) {
      alert('Erro ao deletar registro: ' + err.message);
    }
  };

  const handleToggleValidated = async (item: SuspensionOil) => {
    const next = !item.is_validated;
    if (next && !confirm('Validar e PUBLICAR este registro no site? Confirme que os dados de óleo conferem com o manual.')) return;
    try {
      const { error } = await supabase
        .from('SITE_SuspensionOil')
        .update({ is_validated: next })
        .eq('id', item.id);
      if (error) throw error;
      setRecords(prev => prev.map(r => (r.id === item.id ? { ...r, is_validated: next } : r)));
      fetchStats();
    } catch (err: any) {
      alert('Erro ao atualizar status: ' + err.message);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem?.category || !editingItem?.moto_brand || !editingItem?.moto_model) {
      setErrorMsg('Preencha os campos obrigatórios: Categoria, Marca e Modelo.');
      return;
    }
    if (editingItem.is_validated && !editingItem.source?.trim()) {
      setErrorMsg('Para validar um registro, informe a Fonte do dado (manual/URL).');
      return;
    }

    setIsSaving(true);
    setErrorMsg('');

    const t = (v?: string | null) => (v?.trim() ? v.trim() : null);
    const payload = {
      category: editingItem.category!.trim(),
      moto_brand: editingItem.moto_brand!.trim(),
      moto_model: editingItem.moto_model!.trim(),
      part_type: editingItem.part_type || 'Front',
      suspension_brand: t(editingItem.suspension_brand),
      suspension_model: t(editingItem.suspension_model),
      oil_level_mm: t(editingItem.oil_level_mm),
      oil_volume_ml: t(editingItem.oil_volume_ml),
      viscosity: t(editingItem.viscosity),
      oil_product: t(editingItem.oil_product),
      source: t(editingItem.source),
      is_validated: !!editingItem.is_validated,
      notes: t(editingItem.notes),
    };

    try {
      if (editingItem.id) {
        const { error } = await supabase
          .from('SITE_SuspensionOil')
          .update(payload)
          .eq('id', editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('SITE_SuspensionOil').insert([payload]);
        if (error) throw error;
      }
      setIsModalOpen(false);
      fetchRecords();
      fetchUniqueBrands();
      fetchStats();
    } catch (err: any) {
      setErrorMsg('Erro ao salvar no banco: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const pendingCount = Math.max(0, totalCount - validatedCount);

  const inputCls =
    'w-full bg-[var(--admin-surface-2)] border border-[var(--admin-border)] rounded-xl py-2 px-3 text-sm text-[var(--admin-text-primary)] outline-none focus:border-wtech-gold transition-colors';
  const labelCls =
    'block text-[10px] font-black uppercase text-[var(--admin-text-secondary)] tracking-widest mb-1.5';

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-[var(--admin-text-primary)] tracking-tight flex items-center gap-2">
            <Droplets size={22} className="text-wtech-gold" /> Óleo & Suspensão
          </h2>
          <p className="text-[11px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-widest mt-0.5">
            Níveis de óleo e viscosidades por moto, suspensão e categoria
          </p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="bg-gradient-to-r from-wtech-gold to-yellow-600 text-black px-4 py-2.5 rounded-xl font-black text-sm flex items-center gap-2 shadow-md shadow-yellow-500/20 hover:scale-105 active:scale-95 transition-all"
        >
          <Plus size={16} /> Novo Registro
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[var(--admin-surface-1)] border border-[var(--admin-border)] rounded-2xl p-5">
          <p className="text-3xl font-black text-wtech-gold tracking-tight">{totalCount.toLocaleString()}</p>
          <p className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider mt-1">Registros no banco</p>
        </div>
        <div className="bg-[var(--admin-surface-1)] border border-[var(--admin-border)] rounded-2xl p-5">
          <p className="text-3xl font-black text-green-500 tracking-tight">{validatedCount.toLocaleString()}</p>
          <p className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider mt-1">Validados (no site)</p>
        </div>
        <div className="bg-[var(--admin-surface-1)] border border-[var(--admin-border)] rounded-2xl p-5">
          <p className="text-3xl font-black text-amber-500 tracking-tight">{pendingCount.toLocaleString()}</p>
          <p className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider mt-1">Aguardando revisão</p>
        </div>
        <div className="bg-[var(--admin-surface-1)] border border-[var(--admin-border)] rounded-2xl p-5">
          <p className="text-3xl font-black text-blue-500 tracking-tight">{availableBrands.length}</p>
          <p className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider mt-1">Marcas catalogadas</p>
        </div>
      </div>

      {/* Safety note */}
      <div className="flex gap-2.5 p-3.5 bg-amber-500/10 border border-amber-500/25 rounded-xl text-xs text-amber-600 dark:text-amber-400 items-start">
        <ShieldCheck size={16} className="shrink-0 mt-0.5" />
        <span>
          Dados de nível de óleo e viscosidade só aparecem no site quando marcados como <strong>Validados</strong>. Sempre confira o valor com o manual e preencha a <strong>Fonte</strong> antes de validar.
        </span>
      </div>

      {/* Filters & Table */}
      <div className="bg-[var(--admin-surface-1)] rounded-2xl border border-[var(--admin-border)] overflow-hidden">
        <div className="p-4 border-b border-[var(--admin-border)] flex flex-col md:flex-row gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-2.5 text-[var(--admin-text-tertiary)]" size={16} />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Buscar por moto, suspensão, viscosidade..."
              className="w-full bg-[var(--admin-surface-2)] border border-[var(--admin-border)] rounded-xl py-2.5 pl-9 pr-4 text-sm text-[var(--admin-text-primary)] placeholder:text-[var(--admin-text-tertiary)] outline-none focus:border-wtech-gold transition-colors"
              value={searchTerm}
              onChange={e => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
          <select className={inputCls + ' md:w-auto'} value={selectedCategory} onChange={e => { setSelectedCategory(e.target.value); setCurrentPage(1); }}>
            <option value="all">Todas as Categorias</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className={inputCls + ' md:w-auto'} value={selectedBrand} onChange={e => { setSelectedBrand(e.target.value); setCurrentPage(1); }}>
            <option value="all">Todas as Marcas</option>
            {availableBrands.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          <select className={inputCls + ' md:w-auto'} value={selectedType} onChange={e => { setSelectedType(e.target.value); setCurrentPage(1); }}>
            <option value="all">Dianteira + Traseira</option>
            <option value="Front">Dianteira (Garfo)</option>
            <option value="Rear">Traseira (Amortecedor)</option>
          </select>
          <select className={inputCls + ' md:w-auto'} value={selectedStatus} onChange={e => { setSelectedStatus(e.target.value); setCurrentPage(1); }}>
            <option value="all">Todos os status</option>
            <option value="validated">Validados</option>
            <option value="pending">Aguardando revisão</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[var(--admin-surface-2)] border-b border-[var(--admin-border)]">
              <tr>
                <th className="px-4 py-3.5 text-xs font-black uppercase text-[var(--admin-text-secondary)] tracking-widest">Categoria</th>
                <th className="px-4 py-3.5 text-xs font-black uppercase text-[var(--admin-text-secondary)] tracking-widest">Moto</th>
                <th className="px-4 py-3.5 text-xs font-black uppercase text-[var(--admin-text-secondary)] tracking-widest text-center">Posição</th>
                <th className="px-4 py-3.5 text-xs font-black uppercase text-[var(--admin-text-secondary)] tracking-widest">Suspensão</th>
                <th className="px-4 py-3.5 text-xs font-black uppercase text-[var(--admin-text-secondary)] tracking-widest text-center">Nível</th>
                <th className="px-4 py-3.5 text-xs font-black uppercase text-[var(--admin-text-secondary)] tracking-widest text-center">Viscosidade</th>
                <th className="px-4 py-3.5 text-xs font-black uppercase text-[var(--admin-text-secondary)] tracking-widest text-center">Status</th>
                <th className="px-4 py-3.5 text-xs font-black uppercase text-[var(--admin-text-secondary)] tracking-widest text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--admin-border)]">
              {loading ? (
                <tr><td colSpan={8} className="px-5 py-12 text-center text-sm text-[var(--admin-text-secondary)]">Carregando registros de óleo...</td></tr>
              ) : records.length === 0 ? (
                <tr><td colSpan={8} className="px-5 py-12 text-center text-sm text-[var(--admin-text-secondary)]">Nenhum registro encontrado para os filtros selecionados.</td></tr>
              ) : (
                records.map(item => (
                  <tr key={item.id} className="hover:bg-[var(--admin-surface-2)] transition-colors">
                    <td className="px-4 py-3 text-xs font-bold text-[var(--admin-text-secondary)]">{item.category}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className="font-black text-[var(--admin-text-primary)]">{item.moto_brand}</span>
                      <span className="block text-xs text-[var(--admin-text-secondary)]">{item.moto_model}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn('px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider', item.part_type === 'Front' ? 'bg-blue-500/10 text-blue-500' : 'bg-indigo-500/10 text-indigo-500')}>
                        {item.part_type === 'Front' ? 'Dianteira' : 'Traseira'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--admin-text-secondary)]">
                      {item.suspension_brand || '—'}
                      {item.suspension_model && <span className="block text-[var(--admin-text-tertiary)]">{item.suspension_model}</span>}
                    </td>
                    <td className="px-4 py-3 text-center text-xs font-mono text-[var(--admin-text-primary)]">
                      {item.oil_level_mm ? `${item.oil_level_mm} mm` : item.oil_volume_ml ? `${item.oil_volume_ml} ml` : <span className="text-[var(--admin-text-tertiary)]">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center text-xs">
                      {item.viscosity ? (
                        <span className="font-mono font-bold bg-yellow-500/10 text-wtech-gold px-2 py-1 rounded border border-yellow-500/20">{item.viscosity}</span>
                      ) : <span className="text-[var(--admin-text-tertiary)]">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleToggleValidated(item)}
                        title={item.is_validated ? 'Validado — clique para despublicar' : 'Aguardando revisão — clique para validar'}
                        className={cn('inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-all hover:scale-105', item.is_validated ? 'bg-green-500/10 text-green-500' : 'bg-amber-500/10 text-amber-500')}
                      >
                        {item.is_validated ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                        {item.is_validated ? 'Validado' : 'Revisar'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center gap-2">
                        <button onClick={() => handleOpenEditModal(item)} className="p-1.5 text-[var(--admin-text-secondary)] hover:text-wtech-gold hover:bg-[var(--admin-surface-3)] rounded-lg transition-colors" title="Editar"><Edit size={15} /></button>
                        <button onClick={() => handleDelete(item.id)} className="p-1.5 text-[var(--admin-text-secondary)] hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors" title="Excluir"><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && totalPages > 1 && (
          <div className="p-4 border-t border-[var(--admin-border)] flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider">Página {currentPage} de {totalPages} ({totalCount} registros)</span>
            <div className="flex gap-2">
              <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))} className="px-3.5 py-1.5 bg-[var(--admin-surface-2)] border border-[var(--admin-border)] rounded-xl text-xs font-bold text-[var(--admin-text-secondary)] hover:bg-[var(--admin-surface-3)] transition-all disabled:opacity-50 disabled:pointer-events-none">Anterior</button>
              <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} className="px-3.5 py-1.5 bg-[var(--admin-surface-2)] border border-[var(--admin-border)] rounded-xl text-xs font-bold text-[var(--admin-text-secondary)] hover:bg-[var(--admin-surface-3)] transition-all disabled:opacity-50 disabled:pointer-events-none">Próximo</button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Add/Edit */}
      {isModalOpen && editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-[var(--admin-surface-1)] border border-[var(--admin-border)] rounded-2xl shadow-xl animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-[var(--admin-border)] flex justify-between items-center bg-[var(--admin-surface-2)] sticky top-0 z-10">
              <h3 className="font-black text-base text-[var(--admin-text-primary)] uppercase tracking-tight flex items-center gap-2">
                <Droplets size={18} className="text-wtech-gold" />
                {editingItem.id ? 'Editar Registro de Óleo' : 'Novo Registro de Óleo'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] transition-colors p-1 hover:bg-[var(--admin-surface-3)] rounded-lg"><X size={18} /></button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              {errorMsg && (
                <div className="flex gap-2 p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-xs font-bold items-start">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className={labelCls}>Categoria *</label>
                  <select className={inputCls} value={editingItem.category || ''} onChange={e => setEditingItem(p => ({ ...p, category: e.target.value }))}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Marca *</label>
                  <input type="text" required placeholder="Ex: KTM, Yamaha" className={inputCls} value={editingItem.moto_brand || ''} onChange={e => setEditingItem(p => ({ ...p, moto_brand: e.target.value }))} />
                </div>
                <div>
                  <label className={labelCls}>Posição *</label>
                  <select className={inputCls} value={editingItem.part_type || 'Front'} onChange={e => setEditingItem(p => ({ ...p, part_type: e.target.value }))}>
                    <option value="Front">Dianteira (Garfo)</option>
                    <option value="Rear">Traseira (Amortecedor)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className={labelCls}>Modelo / Ano da Moto *</label>
                <input type="text" required placeholder="Ex: 250 SX-F 2016-2023" className={inputCls} value={editingItem.moto_model || ''} onChange={e => setEditingItem(p => ({ ...p, moto_model: e.target.value }))} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Fabricante da Suspensão</label>
                  <input type="text" placeholder="Ex: WP, Showa, KYB, Sachs" className={inputCls} value={editingItem.suspension_brand || ''} onChange={e => setEditingItem(p => ({ ...p, suspension_brand: e.target.value }))} />
                </div>
                <div>
                  <label className={labelCls}>Modelo da Suspensão</label>
                  <input type="text" placeholder="Ex: WP XACT 48, Showa SFF" className={inputCls} value={editingItem.suspension_model || ''} onChange={e => setEditingItem(p => ({ ...p, suspension_model: e.target.value }))} />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className={labelCls}>Nível de óleo (mm)</label>
                  <input type="text" placeholder="Ex: 100" className={inputCls} value={editingItem.oil_level_mm || ''} onChange={e => setEditingItem(p => ({ ...p, oil_level_mm: e.target.value }))} />
                </div>
                <div>
                  <label className={labelCls}>Volume (ml)</label>
                  <input type="text" placeholder="Ex: 380" className={inputCls} value={editingItem.oil_volume_ml || ''} onChange={e => setEditingItem(p => ({ ...p, oil_volume_ml: e.target.value }))} />
                </div>
                <div>
                  <label className={labelCls}>Viscosidade</label>
                  <input type="text" placeholder="Ex: SAE 5W" className={inputCls} value={editingItem.viscosity || ''} onChange={e => setEditingItem(p => ({ ...p, viscosity: e.target.value }))} />
                </div>
                <div>
                  <label className={labelCls}>Óleo recomendado</label>
                  <input type="text" placeholder="Ex: Motorex 5W" className={inputCls} value={editingItem.oil_product || ''} onChange={e => setEditingItem(p => ({ ...p, oil_product: e.target.value }))} />
                </div>
              </div>

              <div>
                <label className={labelCls}>Fonte do dado (manual / URL) — obrigatória para validar</label>
                <input type="text" placeholder="Ex: Manual de Serviço WP XACT 48 (2018), pág. 42" className={inputCls} value={editingItem.source || ''} onChange={e => setEditingItem(p => ({ ...p, source: e.target.value }))} />
              </div>

              <div>
                <label className={labelCls}>Observações</label>
                <textarea rows={2} placeholder="Procedimento, ressalvas, faixa de ajuste..." className={inputCls} value={editingItem.notes || ''} onChange={e => setEditingItem(p => ({ ...p, notes: e.target.value }))} />
              </div>

              <label className="flex items-center gap-2.5 p-3 bg-[var(--admin-surface-2)] border border-[var(--admin-border)] rounded-xl cursor-pointer">
                <input type="checkbox" checked={!!editingItem.is_validated} onChange={e => setEditingItem(p => ({ ...p, is_validated: e.target.checked }))} className="w-4 h-4 accent-green-500" />
                <span className="text-xs font-bold text-[var(--admin-text-primary)]">Validado — liberar para exibição no site público</span>
              </label>

              <div className="flex justify-end gap-2 pt-4 border-t border-[var(--admin-border)]">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-[var(--admin-surface-2)] border border-[var(--admin-border)] rounded-xl text-xs font-bold text-[var(--admin-text-secondary)] hover:bg-[var(--admin-surface-3)] transition-all">Cancelar</button>
                <button type="submit" disabled={isSaving} className="bg-gradient-to-r from-wtech-gold to-yellow-600 text-black px-5 py-2 rounded-xl font-black text-xs shadow-md shadow-yellow-500/20 hover:scale-105 active:scale-95 disabled:opacity-50 transition-all flex items-center gap-1.5">{isSaving ? 'Salvando...' : 'Salvar Registro'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
