import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, Wrench, Plus, Edit, Trash2, X, AlertCircle, Sparkles, LayoutGrid, Check, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../context/AuthContext';
import { cn } from '../../../lib/utils';

interface SpringRecommendation {
  id: string;
  brand: string;
  model: string;
  part_type: string;
  weight_range: string;
  spring_code: string | null;
  standard_code: string | null;
  created_at?: string;
}

export default function SpringsManagerView() {
  const { user } = useAuth();
  
  // Data State
  const [recommendations, setRecommendations] = useState<SpringRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  
  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Unique Lists for Filters
  const [availableBrands, setAvailableBrands] = useState<string[]>([]);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<SpringRecommendation> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Fetch unique brands list once
  useEffect(() => {
    fetchUniqueBrands();
  }, []);

  // Fetch paginated data when query, page or filters change
  useEffect(() => {
    fetchRecommendations();
  }, [currentPage, selectedBrand, selectedType, searchTerm]);

  const fetchUniqueBrands = async () => {
    try {
      // Query distinct brands from database
      const { data, error } = await supabase
        .from('SITE_SpringRecommendations')
        .select('brand');
      
      if (error) throw error;
      
      if (data) {
        const brands = Array.from(new Set(data.map(item => item.brand))).sort();
        setAvailableBrands(brands);
      }
    } catch (err: any) {
      console.error('Erro ao buscar marcas únicas:', err.message);
    }
  };

  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('SITE_SpringRecommendations')
        .select('*', { count: 'exact' });

      // Filters
      if (selectedBrand !== 'all') {
        query = query.eq('brand', selectedBrand);
      }
      
      if (selectedType !== 'all') {
        query = query.eq('part_type', selectedType);
      }

      if (searchTerm) {
        // Search matches brand OR model OR spring_code OR standard_code
        query = query.or(
          `brand.ilike.%${searchTerm}%,model.ilike.%${searchTerm}%,spring_code.ilike.%${searchTerm}%,standard_code.ilike.%${searchTerm}%`
        );
      }

      // Pagination
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      
      query = query
        .order('brand', { ascending: true })
        .order('model', { ascending: true })
        .order('part_type', { ascending: true })
        .order('weight_range', { ascending: true })
        .range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      setRecommendations(data || []);
      setTotalCount(count || 0);
    } catch (err: any) {
      console.error('Erro ao carregar recomendações de molas:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingItem({
      brand: '',
      model: '',
      part_type: 'Front',
      weight_range: '75-85kg',
      spring_code: '',
      standard_code: ''
    });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: SpringRecommendation) => {
    setEditingItem({ ...item });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir esta recomendação de mola?')) return;
    
    try {
      const { error } = await supabase
        .from('SITE_SpringRecommendations')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Update state locally
      setRecommendations(prev => prev.filter(item => item.id !== id));
      setTotalCount(prev => prev - 1);
    } catch (err: any) {
      alert('Erro ao deletar registro: ' + err.message);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem?.brand || !editingItem?.model || !editingItem?.weight_range) {
      setErrorMsg('Por favor, preencha os campos obrigatórios (Marca, Modelo e Peso).');
      return;
    }

    setIsSaving(true);
    setErrorMsg('');

    const payload = {
      brand: editingItem.brand.trim(),
      model: editingItem.model.trim(),
      part_type: editingItem.part_type || 'Front',
      weight_range: editingItem.weight_range.trim(),
      spring_code: editingItem.spring_code?.trim() || null,
      standard_code: editingItem.standard_code?.trim() || null
    };

    try {
      if (editingItem.id) {
        // Update
        const { error } = await supabase
          .from('SITE_SpringRecommendations')
          .update(payload)
          .eq('id', editingItem.id);

        if (error) throw error;
      } else {
        // Insert
        const { error } = await supabase
          .from('SITE_SpringRecommendations')
          .insert([payload]);

        if (error) throw error;
      }

      setIsModalOpen(false);
      fetchRecommendations();
      fetchUniqueBrands();
    } catch (err: any) {
      setErrorMsg('Erro ao salvar no banco: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-[var(--admin-text-primary)] tracking-tight flex items-center gap-2">
            <Wrench size={22} className="text-wtech-gold" /> Molas & Motos
          </h2>
          <p className="text-[11px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-widest mt-0.5">
            Gerencie o banco de dados de molas e motocicletas recomendadas
          </p>
        </div>
        <div>
          <button
            onClick={handleOpenAddModal}
            className="bg-gradient-to-r from-wtech-gold to-yellow-600 text-black px-4 py-2.5 rounded-xl font-black text-sm flex items-center gap-2 shadow-md shadow-yellow-500/20 hover:scale-105 active:scale-95 transition-all"
          >
            <Plus size={16} /> Nova Recomendação
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[var(--admin-surface-1)] border border-[var(--admin-border)] rounded-2xl p-5 hover:shadow-md transition-all">
          <p className="text-3xl font-black text-wtech-gold tracking-tight">{totalCount.toLocaleString()}</p>
          <p className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider mt-1">Recomendações Ativas</p>
        </div>
        <div className="bg-[var(--admin-surface-1)] border border-[var(--admin-border)] rounded-2xl p-5 hover:shadow-md transition-all">
          <p className="text-3xl font-black text-blue-500 tracking-tight">{availableBrands.length}</p>
          <p className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider mt-1">Marcas Catalogadas</p>
        </div>
        <div className="bg-[var(--admin-surface-1)] border border-[var(--admin-border)] rounded-2xl p-5 hover:shadow-md transition-all">
          <p className="text-3xl font-black text-indigo-500 tracking-tight">338</p>
          <p className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider mt-1">Modelos de Motos</p>
        </div>
        <div className="bg-[var(--admin-surface-1)] border border-[var(--admin-border)] rounded-2xl p-5 hover:shadow-md transition-all">
          <p className="text-3xl font-black text-green-500 tracking-tight">18</p>
          <p className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider mt-1">Faixas de Pesagem (Kg)</p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-[var(--admin-surface-1)] rounded-2xl border border-[var(--admin-border)] overflow-hidden">
        <div className="p-4 border-b border-[var(--admin-border)] flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 text-[var(--admin-text-tertiary)]" size={16} />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Buscar por marca, modelo, código de mola..."
              className="w-full bg-[var(--admin-surface-2)] border border-[var(--admin-border)] rounded-xl py-2.5 pl-9 pr-4 text-sm text-[var(--admin-text-primary)] placeholder:text-[var(--admin-text-tertiary)] outline-none focus:border-wtech-gold transition-colors"
              value={searchTerm}
              onChange={e => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
          <select
            className="px-4 py-2.5 bg-[var(--admin-surface-2)] border border-[var(--admin-border)] rounded-xl text-sm text-[var(--admin-text-primary)] outline-none focus:border-wtech-gold transition-colors"
            value={selectedBrand}
            onChange={e => {
              setSelectedBrand(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="all">Todas as Marcas</option>
            {availableBrands.map(brand => (
              <option key={brand} value={brand}>{brand}</option>
            ))}
          </select>
          <select
            className="px-4 py-2.5 bg-[var(--admin-surface-2)] border border-[var(--admin-border)] rounded-xl text-sm text-[var(--admin-text-primary)] outline-none focus:border-wtech-gold transition-colors"
            value={selectedType}
            onChange={e => {
              setSelectedType(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="all">Todas as Suspensões</option>
            <option value="Front">Dianteira (Front)</option>
            <option value="Rear">Traseira (Rear)</option>
          </select>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[var(--admin-surface-2)] border-b border-[var(--admin-border)]">
              <tr>
                <th className="px-5 py-3.5 text-xs font-black uppercase text-[var(--admin-text-secondary)] tracking-widest">Marca</th>
                <th className="px-5 py-3.5 text-xs font-black uppercase text-[var(--admin-text-secondary)] tracking-widest">Modelo / Moto</th>
                <th className="px-5 py-3.5 text-xs font-black uppercase text-[var(--admin-text-secondary)] tracking-widest text-center">Suspensão</th>
                <th className="px-5 py-3.5 text-xs font-black uppercase text-[var(--admin-text-secondary)] tracking-widest text-center">Peso</th>
                <th className="px-5 py-3.5 text-xs font-black uppercase text-[var(--admin-text-secondary)] tracking-widest">Mola Recomendada</th>
                <th className="px-5 py-3.5 text-xs font-black uppercase text-[var(--admin-text-secondary)] tracking-widest">Mola Padrão (Standard)</th>
                <th className="px-5 py-3.5 text-xs font-black uppercase text-[var(--admin-text-secondary)] tracking-widest text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--admin-border)]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-sm text-[var(--admin-text-secondary)]">
                    Carregando registros de molas...
                  </td>
                </tr>
              ) : recommendations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-sm text-[var(--admin-text-secondary)]">
                    Nenhuma recomendação encontrada para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                recommendations.map(item => (
                  <tr key={item.id} className="hover:bg-[var(--admin-surface-2)] transition-colors">
                    <td className="px-5 py-3 text-sm font-black text-[var(--admin-text-primary)]">{item.brand}</td>
                    <td className="px-5 py-3 text-sm font-bold text-[var(--admin-text-secondary)]">{item.model}</td>
                    <td className="px-5 py-3 text-sm text-center">
                      <span className={cn(
                        'px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider',
                        item.part_type === 'Front' 
                          ? 'bg-blue-500/10 text-blue-500' 
                          : 'bg-indigo-500/10 text-indigo-500'
                      )}>
                        {item.part_type === 'Front' ? 'Dianteira' : 'Traseira'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm font-mono text-center text-[var(--admin-text-primary)]">{item.weight_range}</td>
                    <td className="px-5 py-3 text-sm">
                      {item.spring_code ? (
                        <span className="font-mono text-xs bg-yellow-500/10 text-wtech-gold px-2 py-1 rounded border border-yellow-500/20 font-bold">
                          {item.spring_code}
                        </span>
                      ) : (
                        <span className="text-xs text-[var(--admin-text-tertiary)] italic">Nenhuma</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-sm font-mono text-xs text-[var(--admin-text-secondary)]">
                      {item.standard_code || <span className="italic text-gray-400">-</span>}
                    </td>
                    <td className="px-5 py-3 text-sm text-center">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => handleOpenEditModal(item)}
                          className="p-1.5 text-[var(--admin-text-secondary)] hover:text-wtech-gold hover:bg-[var(--admin-surface-3)] rounded-lg transition-colors"
                          title="Editar recomendação"
                        >
                          <Edit size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 text-[var(--admin-text-secondary)] hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Excluir"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {!loading && totalPages > 1 && (
          <div className="p-4 border-t border-[var(--admin-border)] flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider">
              Página {currentPage} de {totalPages} ({totalCount} registros)
            </span>
            <div className="flex gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className="px-3.5 py-1.5 bg-[var(--admin-surface-2)] border border-[var(--admin-border)] rounded-xl text-xs font-bold text-[var(--admin-text-secondary)] hover:bg-[var(--admin-surface-3)] transition-all disabled:opacity-50 disabled:pointer-events-none"
              >
                Anterior
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                className="px-3.5 py-1.5 bg-[var(--admin-surface-2)] border border-[var(--admin-border)] rounded-xl text-xs font-bold text-[var(--admin-text-secondary)] hover:bg-[var(--admin-surface-3)] transition-all disabled:opacity-50 disabled:pointer-events-none"
              >
                Próximo
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Add/Edit */}
      {isModalOpen && editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[var(--admin-surface-1)] border border-[var(--admin-border)] rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-[var(--admin-border)] flex justify-between items-center bg-[var(--admin-surface-2)]">
              <h3 className="font-black text-base text-[var(--admin-text-primary)] uppercase tracking-tight flex items-center gap-2">
                <Wrench size={18} className="text-wtech-gold" />
                {editingItem.id ? 'Editar Recomendação' : 'Nova Recomendação'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] transition-colors p-1 hover:bg-[var(--admin-surface-3)] rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              {errorMsg && (
                <div className="flex gap-2 p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-xs font-bold items-start">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-[var(--admin-text-secondary)] tracking-widest mb-1.5">Marca *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: KTM, Yamaha"
                    className="w-full bg-[var(--admin-surface-2)] border border-[var(--admin-border)] rounded-xl py-2 px-3 text-sm text-[var(--admin-text-primary)] outline-none focus:border-wtech-gold transition-colors"
                    value={editingItem.brand || ''}
                    onChange={e => setEditingItem(prev => ({ ...prev, brand: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-[var(--admin-text-secondary)] tracking-widest mb-1.5">Modelo / Moto *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: SX125 2004-2006"
                    className="w-full bg-[var(--admin-surface-2)] border border-[var(--admin-border)] rounded-xl py-2 px-3 text-sm text-[var(--admin-text-primary)] outline-none focus:border-wtech-gold transition-colors"
                    value={editingItem.model || ''}
                    onChange={e => setEditingItem(prev => ({ ...prev, model: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-[var(--admin-text-secondary)] tracking-widest mb-1.5">Suspensão *</label>
                  <select
                    className="w-full bg-[var(--admin-surface-2)] border border-[var(--admin-border)] rounded-xl py-2 px-3 text-sm text-[var(--admin-text-primary)] outline-none focus:border-wtech-gold transition-colors"
                    value={editingItem.part_type || 'Front'}
                    onChange={e => setEditingItem(prev => ({ ...prev, part_type: e.target.value }))}
                  >
                    <option value="Front">Dianteira (Front)</option>
                    <option value="Rear">Traseira (Rear)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-[var(--admin-text-secondary)] tracking-widest mb-1.5">Faixa de Peso (Piloto) *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 75-85kg"
                    className="w-full bg-[var(--admin-surface-2)] border border-[var(--admin-border)] rounded-xl py-2 px-3 text-sm text-[var(--admin-text-primary)] outline-none focus:border-wtech-gold transition-colors"
                    value={editingItem.weight_range || ''}
                    onChange={e => setEditingItem(prev => ({ ...prev, weight_range: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-[var(--admin-text-secondary)] tracking-widest mb-1.5">Mola Recomendada</label>
                  <input
                    type="text"
                    placeholder="Ex: WP 63-260-42N"
                    className="w-full bg-[var(--admin-surface-2)] border border-[var(--admin-border)] rounded-xl py-2 px-3 text-sm text-[var(--admin-text-primary)] outline-none focus:border-wtech-gold transition-colors"
                    value={editingItem.spring_code || ''}
                    onChange={e => setEditingItem(prev => ({ ...prev, spring_code: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-[var(--admin-text-secondary)] tracking-widest mb-1.5">Mola Padrão (Standard)</label>
                  <input
                    type="text"
                    placeholder="Ex: WP 63-260-40N"
                    className="w-full bg-[var(--admin-surface-2)] border border-[var(--admin-border)] rounded-xl py-2 px-3 text-sm text-[var(--admin-text-primary)] outline-none focus:border-wtech-gold transition-colors"
                    value={editingItem.standard_code || ''}
                    onChange={e => setEditingItem(prev => ({ ...prev, standard_code: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-[var(--admin-border)]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-[var(--admin-surface-2)] border border-[var(--admin-border)] rounded-xl text-xs font-bold text-[var(--admin-text-secondary)] hover:bg-[var(--admin-surface-3)] transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="bg-gradient-to-r from-wtech-gold to-yellow-600 text-black px-5 py-2 rounded-xl font-black text-xs shadow-md shadow-yellow-500/20 hover:scale-105 active:scale-95 disabled:opacity-50 transition-all flex items-center gap-1.5"
                >
                  {isSaving ? 'Salvando...' : 'Salvar Registro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
