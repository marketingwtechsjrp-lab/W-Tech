import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search, Wrench, Shield, Check, Info, Droplets, Gauge } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { cn } from '../../lib/utils';

const CATEGORIES = ['Off Road', 'Motocross', 'On Road', 'Speed'];

// Logos reaproveitados do seletor de molas — fallback para texto quando não houver logo.
const BRAND_LOGOS: Record<string, string> = {
  KTM: '/images/brands/ktm.png',
  Kawasaki: '/images/brands/kawasaki.png',
  Husaberg: '/images/brands/husaberg-1.png',
  Suzuki: '/images/brands/suzuki.png',
  Honda: '/images/brands/honda-2.png',
  Fantic: '/images/brands/Fantic_Nederland_logo-d23-67aa3e32.jpeg',
  Husqvarna: '/images/brands/husqvarna-1.png',
  Triumph: '/images/brands/triunph.jpg',
  Yamaha: '/images/brands/yamaha-1.png',
  GASGAS: '/images/brands/GASGAS-logo.png',
};

interface OilRow {
  part_type: string;
  suspension_brand: string | null;
  suspension_model: string | null;
  oil_level_mm: string | null;
  oil_volume_ml: string | null;
  viscosity: string | null;
  oil_product: string | null;
  source: string | null;
  notes: string | null;
}

export default function OilSelector() {
  const [loading, setLoading] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState('Off Road');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedType, setSelectedType] = useState<'Front' | 'Rear'>('Front');
  const [modelSearch, setModelSearch] = useState('');

  const [brands, setBrands] = useState<string[]>([]);
  const [models, setModels] = useState<string[]>([]);
  const [modelData, setModelData] = useState<OilRow[]>([]);

  const modelListRef = useRef<HTMLDivElement>(null);

  // 1. Marcas com dados validados na categoria escolhida
  useEffect(() => {
    async function loadBrands() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('SITE_SuspensionOil')
          .select('moto_brand')
          .eq('category', selectedCategory)
          .eq('is_validated', true);
        if (error) throw error;
        const unique = Array.from(new Set((data || []).map(d => d.moto_brand))).sort();
        setBrands(unique);
        setSelectedBrand(unique[0] || '');
      } catch (err) {
        console.error('Erro ao carregar marcas:', err);
        setBrands([]);
        setSelectedBrand('');
      } finally {
        setLoading(false);
      }
    }
    loadBrands();
  }, [selectedCategory]);

  // 2. Modelos da marca + categoria
  useEffect(() => {
    if (!selectedBrand) {
      setModels([]);
      setSelectedModel('');
      return;
    }
    async function loadModels() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('SITE_SuspensionOil')
          .select('moto_model')
          .eq('category', selectedCategory)
          .eq('moto_brand', selectedBrand)
          .eq('is_validated', true);
        if (error) throw error;
        const unique = Array.from(new Set((data || []).map(d => d.moto_model))).sort();
        setModels(unique);
        setSelectedModel(unique[0] || '');
        if (modelListRef.current) modelListRef.current.scrollTop = 0;
      } catch (err) {
        console.error('Erro ao carregar modelos:', err);
      } finally {
        setLoading(false);
      }
    }
    loadModels();
  }, [selectedCategory, selectedBrand]);

  // 3. Dados de óleo do modelo selecionado
  useEffect(() => {
    if (!selectedBrand || !selectedModel) {
      setModelData([]);
      return;
    }
    async function loadModelData() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('SITE_SuspensionOil')
          .select('part_type, suspension_brand, suspension_model, oil_level_mm, oil_volume_ml, viscosity, oil_product, source, notes')
          .eq('category', selectedCategory)
          .eq('moto_brand', selectedBrand)
          .eq('moto_model', selectedModel)
          .eq('is_validated', true);
        if (error) throw error;
        setModelData(data || []);
      } catch (err) {
        console.error('Erro ao carregar dados do modelo:', err);
      } finally {
        setLoading(false);
      }
    }
    loadModelData();
  }, [selectedCategory, selectedBrand, selectedModel]);

  const hasFront = useMemo(() => modelData.some(i => i.part_type === 'Front'), [modelData]);
  const hasRear = useMemo(() => modelData.some(i => i.part_type === 'Rear'), [modelData]);

  useEffect(() => {
    if (modelData.length === 0) return;
    if (selectedType === 'Front' && !hasFront && hasRear) setSelectedType('Rear');
    else if (selectedType === 'Rear' && !hasRear && hasFront) setSelectedType('Front');
  }, [modelData, selectedType, hasFront, hasRear]);

  const result = useMemo(
    () => modelData.find(i => i.part_type === selectedType) || null,
    [modelData, selectedType]
  );

  const filteredModels = useMemo(
    () => models.filter(m => m.toLowerCase().includes(modelSearch.toLowerCase())),
    [models, modelSearch]
  );

  const levelLabel = result?.oil_level_mm
    ? `${result.oil_level_mm} mm`
    : result?.oil_volume_ml
      ? `${result.oil_volume_ml} ml`
      : null;

  return (
    <div className="w-full flex flex-col bg-white dark:bg-[#161616] border border-gray-200 dark:border-white/10 rounded-3xl p-4 sm:p-6 md:p-8 shadow-2xl transition-all duration-300">
      <div className="space-y-4 md:space-y-6">

        {/* 1. Categorias */}
        <div className="space-y-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 block">
            1. Categoria de Pilotagem
          </span>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  'h-12 md:h-14 flex items-center justify-center rounded-xl md:rounded-2xl border text-xs md:text-sm font-black uppercase tracking-wider transition-all active:scale-95',
                  selectedCategory === cat
                    ? 'bg-wtech-gold text-black border-wtech-gold shadow-[0_0_15px_rgba(212,163,89,0.3)]'
                    : 'bg-white dark:bg-black/20 border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-white/20'
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {brands.length === 0 && !loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
            <Droplets size={32} className="text-wtech-gold/60" />
            <p className="text-sm font-bold text-gray-600 dark:text-gray-300">
              Tabelas de óleo desta categoria em revisão técnica.
            </p>
            <p className="text-xs text-gray-400 max-w-md">
              Estamos validando os dados de nível e viscosidade junto aos manuais. Fale com um mecânico credenciado W-Tech para a especificação da sua moto.
            </p>
          </div>
        ) : (
          <>
            {/* Marca + Modelo + Posição */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-6">

              {/* Marca */}
              <div className="flex flex-col space-y-2 bg-gray-50 dark:bg-white/5 p-3 md:p-5 rounded-2xl border border-gray-200 dark:border-white/10">
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">2. Marca</span>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 h-[200px] md:h-[clamp(180px,38vh,300px)] overflow-y-auto pr-1 content-start">
                  {brands.map(brand => (
                    <button
                      key={brand}
                      onClick={() => setSelectedBrand(brand)}
                      title={brand}
                      className={cn(
                        'h-12 md:h-14 flex items-center justify-center p-2 rounded-xl border transition-all active:scale-95 bg-white',
                        selectedBrand === brand
                          ? 'border-wtech-gold ring-2 ring-wtech-gold/30 shadow-[0_0_12px_rgba(212,163,89,0.3)]'
                          : 'border-gray-200 dark:border-white/10 hover:border-gray-300'
                      )}
                    >
                      {BRAND_LOGOS[brand] ? (
                        <img src={BRAND_LOGOS[brand]} alt={brand} className="max-h-7 w-auto object-contain" />
                      ) : (
                        <span className="text-[10px] font-black text-gray-700 uppercase text-center leading-tight">{brand}</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Modelo */}
              <div className="flex flex-col space-y-2 bg-gray-50 dark:bg-white/5 p-3 md:p-5 rounded-2xl border border-gray-200 dark:border-white/10">
                <div className="flex justify-between items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 shrink-0">3. Modelo</span>
                  <div className="relative flex-1 max-w-[160px] md:w-36 md:flex-none">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
                    <input
                      type="text"
                      placeholder="Buscar..."
                      className="w-full bg-white dark:bg-black/40 border border-gray-300 dark:border-white/10 rounded-lg py-1.5 pl-8 pr-2 text-xs text-black dark:text-white outline-none focus:border-wtech-gold transition-colors"
                      value={modelSearch}
                      onChange={e => setModelSearch(e.target.value)}
                    />
                  </div>
                </div>
                <div ref={modelListRef} className="flex flex-col gap-1.5 h-[200px] md:h-[clamp(180px,38vh,300px)] overflow-y-auto pr-1">
                  {loading && models.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-xs text-gray-500 italic">Carregando...</div>
                  ) : filteredModels.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-xs text-gray-500 italic">Nenhum modelo</div>
                  ) : (
                    filteredModels.map(m => (
                      <button
                        key={m}
                        onClick={() => setSelectedModel(m)}
                        className={cn(
                          'px-3.5 py-2.5 rounded-xl text-left text-xs transition-all font-bold border',
                          selectedModel === m
                            ? 'bg-wtech-gold/15 text-wtech-gold border-wtech-gold/30'
                            : 'bg-white dark:bg-black/20 hover:bg-gray-100 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 border-transparent'
                        )}
                      >
                        {m}
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Posição */}
              <div className="flex flex-col space-y-3 bg-gray-50 dark:bg-white/5 p-3 md:p-5 rounded-2xl border border-gray-200 dark:border-white/10 justify-between">
                <div className="space-y-3">
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">4. Posição da Suspensão</span>
                  <div className="grid grid-cols-2 md:grid-cols-1 gap-2.5">
                    <button
                      onClick={() => hasFront && setSelectedType('Front')}
                      disabled={!hasFront}
                      className={cn(
                        'p-3.5 md:p-4 rounded-xl flex items-center justify-between gap-1 border transition-all text-[11px] md:text-xs font-black uppercase tracking-wider',
                        !hasFront && 'opacity-30 cursor-not-allowed bg-gray-100 dark:bg-black/10 border-transparent text-gray-400',
                        hasFront && selectedType === 'Front' && 'bg-wtech-gold text-black border-wtech-gold shadow-lg shadow-yellow-500/10',
                        hasFront && selectedType !== 'Front' && 'bg-white dark:bg-black/20 hover:bg-gray-100 dark:hover:bg-white/10 border-gray-200 dark:border-white/5 text-gray-700 dark:text-gray-300'
                      )}
                    >
                      <span className="flex items-center gap-2"><Wrench size={14} /> Dianteira (Garfo)</span>
                      {hasFront && selectedType === 'Front' && <Check size={14} />}
                    </button>
                    <button
                      onClick={() => hasRear && setSelectedType('Rear')}
                      disabled={!hasRear}
                      className={cn(
                        'p-3.5 md:p-4 rounded-xl flex items-center justify-between gap-1 border transition-all text-[11px] md:text-xs font-black uppercase tracking-wider',
                        !hasRear && 'opacity-30 cursor-not-allowed bg-gray-100 dark:bg-black/10 border-transparent text-gray-400',
                        hasRear && selectedType === 'Rear' && 'bg-wtech-gold text-black border-wtech-gold shadow-lg shadow-yellow-500/10',
                        hasRear && selectedType !== 'Rear' && 'bg-white dark:bg-black/20 hover:bg-gray-100 dark:hover:bg-white/10 border-gray-200 dark:border-white/5 text-gray-700 dark:text-gray-300'
                      )}
                    >
                      <span className="flex items-center gap-2"><Shield size={14} /> Traseira (Amortecedor)</span>
                      {hasRear && selectedType === 'Rear' && <Check size={14} />}
                    </button>
                  </div>
                </div>
                <div className="hidden md:flex bg-white dark:bg-black/30 p-4 rounded-xl border border-gray-100 dark:border-white/5 gap-2.5 items-start">
                  <Info size={16} className="text-wtech-gold shrink-0 mt-0.5" />
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-relaxed">
                    O nível de óleo do garfo geralmente é medido como folga de ar (mm). O amortecedor traseiro usa volume total (ml).
                  </p>
                </div>
              </div>
            </div>

            {/* Resultado */}
            {result && (
              <div className="bg-gradient-to-r from-wtech-gold/10 to-yellow-600/5 border border-wtech-gold/20 rounded-2xl p-5 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center md:text-left">
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-wtech-gold block flex items-center gap-1 justify-center md:justify-start"><Droplets size={11} /> Nível de Óleo</span>
                    <span className="text-lg md:text-xl font-black font-mono text-black dark:text-white block mt-1">{levelLabel || '—'}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-wtech-gold block flex items-center gap-1 justify-center md:justify-start"><Gauge size={11} /> Viscosidade</span>
                    <span className="text-lg md:text-xl font-black font-mono text-black dark:text-white block mt-1">{result.viscosity || '—'}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 block">Suspensão</span>
                    <span className="text-sm font-bold text-gray-700 dark:text-gray-200 block mt-1.5">
                      {[result.suspension_brand, result.suspension_model].filter(Boolean).join(' ') || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 block">Óleo Recomendado</span>
                    <span className="text-sm font-bold text-gray-700 dark:text-gray-200 block mt-1.5">{result.oil_product || '—'}</span>
                  </div>
                </div>

                {result.notes && (
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed border-t border-wtech-gold/15 pt-3">{result.notes}</p>
                )}

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-wtech-gold/15 pt-3">
                  {result.source && (
                    <span className="text-[10px] text-gray-400 italic">Fonte: {result.source}</span>
                  )}
                  <span className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                    <Info size={12} className="text-wtech-gold shrink-0" />
                    Confirme com seu mecânico W-Tech antes do serviço.
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
