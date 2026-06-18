import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search, Wrench, Shield, Check, Info } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { cn } from '../../lib/utils';

const STATIC_BRANDS = [
  'KTM', 'Kawasaki', 'Husaberg', 'Suzuki', 'Honda', 
  'Fantic', 'Husqvarna', 'Triumph', 'Yamaha', 'GASGAS'
];

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


export default function SpringSelector() {
  const [loading, setLoading] = useState(false);

  // Selections
  const [selectedBrand, setSelectedBrand] = useState('KTM');
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedType, setSelectedType] = useState<'Front' | 'Rear'>('Front');
  const [selectedWeight, setSelectedWeight] = useState('');
  const [modelSearch, setModelSearch] = useState('');

  // Data lists
  const [models, setModels] = useState<string[]>([]);
  const [modelData, setModelData] = useState<any[]>([]);

  // Refs for scroll container reset
  const modelListRef = useRef<HTMLDivElement>(null);
  const weightListRef = useRef<HTMLDivElement>(null);

  // 1. Fetch models when brand changes
  useEffect(() => {
    if (!selectedBrand) return;
    async function loadModels() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('SITE_SpringRecommendations')
          .select('model')
          .eq('brand', selectedBrand);
        
        if (error) throw error;
        if (data) {
          const uniqueModels = Array.from(new Set(data.map(item => item.model))).sort();
          setModels(uniqueModels);
          
          // Auto-select first model
          if (uniqueModels.length > 0) {
            setSelectedModel(uniqueModels[0]);
          } else {
            setSelectedModel('');
          }
          
          // Reset scroll
          if (modelListRef.current) modelListRef.current.scrollTop = 0;
        }
      } catch (err) {
        console.error('Error fetching models:', err);
      } finally {
        setLoading(false);
      }
    }
    loadModels();
  }, [selectedBrand]);

  // 2. Fetch all data for the selected model when brand & model change
  useEffect(() => {
    if (!selectedBrand || !selectedModel) {
      setModelData([]);
      return;
    }
    async function loadModelData() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('SITE_SpringRecommendations')
          .select('part_type, weight_range, spring_code, standard_code')
          .eq('brand', selectedBrand)
          .eq('model', selectedModel);
        
        if (error) throw error;
        if (data) {
          setModelData(data);
        }
      } catch (err) {
        console.error('Error fetching model data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadModelData();
  }, [selectedBrand, selectedModel]);

  // Derive availability of suspension types
  const hasFront = useMemo(() => {
    return modelData.some(item => item.part_type === 'Front' && (item.spring_code !== null || item.standard_code !== null));
  }, [modelData]);

  const hasRear = useMemo(() => {
    return modelData.some(item => item.part_type === 'Rear' && (item.spring_code !== null || item.standard_code !== null));
  }, [modelData]);

  // Auto-switch suspension type if currently selected one is unavailable
  useEffect(() => {
    if (modelData.length === 0) return;
    if (selectedType === 'Front' && !hasFront && hasRear) {
      setSelectedType('Rear');
    } else if (selectedType === 'Rear' && !hasRear && hasFront) {
      setSelectedType('Front');
    }
  }, [modelData, selectedType, hasFront, hasRear]);

  // Derive weights list for this model (across both types)
  const allModelWeights = useMemo(() => {
    const weightsSet = new Set<string>();
    modelData.forEach(item => {
      if (item.weight_range && (item.spring_code !== null || item.standard_code !== null)) {
        weightsSet.add(item.weight_range);
      }
    });
    return Array.from(weightsSet).sort((a, b) => {
      const numA = parseInt(a) || 0;
      const numB = parseInt(b) || 0;
      return numA - numB;
    });
  }, [modelData]);

  // Derive active weights for the selected suspension type
  const activeWeightsForType = useMemo(() => {
    const active = new Set<string>();
    modelData.forEach(item => {
      if (item.part_type === selectedType && (item.spring_code !== null || item.standard_code !== null)) {
        active.add(item.weight_range);
      }
    });
    return active;
  }, [modelData, selectedType]);

  // Auto-select first active weight if current selectedWeight is inactive or empty
  useEffect(() => {
    if (allModelWeights.length === 0) {
      setSelectedWeight('');
      return;
    }
    if (!selectedWeight || !activeWeightsForType.has(selectedWeight)) {
      const firstActive = allModelWeights.find(w => activeWeightsForType.has(w));
      if (firstActive) {
        setSelectedWeight(firstActive);
      } else {
        setSelectedWeight(allModelWeights[0] || '');
      }
    }
  }, [allModelWeights, activeWeightsForType, selectedWeight]);

  // Get recommendation from modelData
  const recommendation = useMemo(() => {
    if (!selectedType || !selectedWeight) return null;
    return modelData.find(item => 
      item.part_type === selectedType && 
      item.weight_range === selectedWeight
    ) || null;
  }, [modelData, selectedType, selectedWeight]);

  // Filter models
  const filteredModels = useMemo(() => {
    return models.filter(m => m.toLowerCase().includes(modelSearch.toLowerCase()));
  }, [models, modelSearch]);

  return (
    <div className="w-full flex flex-col justify-between bg-white dark:bg-[#161616] border border-gray-200 dark:border-white/10 rounded-3xl p-4 sm:p-6 md:p-8 shadow-2xl transition-all duration-300">
      <div className="space-y-4 md:space-y-6">

        {/* 1. Brands Row */}
        <div className="space-y-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 block">
            1. Marcas (Fabricantes)
          </span>
          <div className="grid grid-cols-5 md:grid-cols-10 gap-2 md:gap-3">
            {STATIC_BRANDS.map(brand => (
              <button
                key={brand}
                onClick={() => setSelectedBrand(brand)}
                className={cn(
                  'h-12 sm:h-14 md:h-16 flex items-center justify-center p-2 md:p-3 rounded-xl md:rounded-2xl border transition-all active:scale-95 md:hover:scale-[1.03] duration-200 bg-white dark:bg-white',
                  selectedBrand === brand
                    ? 'border-wtech-gold shadow-[0_0_15px_rgba(212,163,89,0.3)] ring-2 ring-wtech-gold/30'
                    : 'border-gray-200 dark:border-white/10 opacity-60 md:opacity-100 hover:border-gray-300 dark:hover:border-white/20'
                )}
                title={brand}
              >
                <img
                  src={BRAND_LOGOS[brand]}
                  alt={brand}
                  className="max-h-6 sm:max-h-8 md:max-h-10 w-auto object-contain transition-all"
                />
              </button>
            ))}
          </div>
        </div>

        {/* 3 Columns Layout (Model, Type, Weights) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-6">

          {/* Column 2: Model Search and List */}
          <div className="flex flex-col space-y-2 bg-gray-50 dark:bg-white/5 p-3 md:p-5 rounded-2xl border border-gray-200 dark:border-white/10">
            <div className="flex justify-between items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 shrink-0">
                2. Modelo
              </span>
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

            <div
              ref={modelListRef}
              className="flex flex-col gap-1.5 h-[200px] md:h-[300px] overflow-y-auto pr-1"
            >
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

          {/* Column 3: Suspensão Dianteira/Traseira */}
          <div className="flex flex-col space-y-3 bg-gray-50 dark:bg-white/5 p-3 md:p-5 rounded-2xl border border-gray-200 dark:border-white/10 justify-between">
            <div className="space-y-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">
                3. Tipo de Suspensão
              </span>
              <div className="grid grid-cols-2 md:grid-cols-1 gap-2.5">
                <button
                  onClick={() => hasFront && setSelectedType('Front')}
                  disabled={!hasFront}
                  className={cn(
                    'p-3.5 md:p-4 rounded-xl flex items-center justify-between gap-1 border transition-all text-[11px] md:text-xs font-black uppercase tracking-wider',
                    !hasFront && 'opacity-30 cursor-not-allowed bg-gray-100 dark:bg-black/10 border-transparent text-gray-400 dark:text-gray-600',
                    hasFront && selectedType === 'Front' && 'bg-wtech-gold text-black border-wtech-gold shadow-lg shadow-yellow-500/10',
                    hasFront && selectedType !== 'Front' && 'bg-white dark:bg-black/20 hover:bg-gray-100 dark:hover:bg-white/10 border-gray-200 dark:border-white/5 text-gray-700 dark:text-gray-300'
                  )}
                >
                  <span className="flex items-center gap-2">
                    <Wrench size={14} /> Dianteira (Garfo)
                  </span>
                  {hasFront && selectedType === 'Front' && <Check size={14} />}
                </button>
                <button
                  onClick={() => hasRear && setSelectedType('Rear')}
                  disabled={!hasRear}
                  className={cn(
                    'p-3.5 md:p-4 rounded-xl flex items-center justify-between gap-1 border transition-all text-[11px] md:text-xs font-black uppercase tracking-wider',
                    !hasRear && 'opacity-30 cursor-not-allowed bg-gray-100 dark:bg-black/10 border-transparent text-gray-400 dark:text-gray-600',
                    hasRear && selectedType === 'Rear' && 'bg-wtech-gold text-black border-wtech-gold shadow-lg shadow-yellow-500/10',
                    hasRear && selectedType !== 'Rear' && 'bg-white dark:bg-black/20 hover:bg-gray-100 dark:hover:bg-white/10 border-gray-200 dark:border-white/5 text-gray-700 dark:text-gray-300'
                  )}
                >
                  <span className="flex items-center gap-2">
                    <Shield size={14} /> Traseira (Shock)
                  </span>
                  {hasRear && selectedType === 'Rear' && <Check size={14} />}
                </button>
              </div>
            </div>

            <div className="hidden md:flex bg-white dark:bg-black/30 p-4 rounded-xl border border-gray-100 dark:border-white/5 gap-2.5 items-start">
              <Info size={16} className="text-wtech-gold shrink-0 mt-0.5" />
              <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-relaxed">
                As molas dianteiras calibram o garfo dianteiro (Front Fork) e as traseiras calibram o amortecedor central (Shock Absorber).
              </p>
            </div>
          </div>

          {/* Column 4: Weights Selection */}
          <div className="flex flex-col space-y-2 bg-gray-50 dark:bg-white/5 p-3 md:p-5 rounded-2xl border border-gray-200 dark:border-white/10">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">
              4. Peso do Piloto (Equipado)
            </span>
            <div
              ref={weightListRef}
              className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-2 gap-2 h-[180px] md:h-[300px] overflow-y-auto pr-1 align-content-start"
            >
              {loading && allModelWeights.length === 0 ? (
                <div className="col-span-full flex items-center justify-center h-full text-xs text-gray-500 italic">Carregando...</div>
              ) : allModelWeights.length === 0 ? (
                <div className="col-span-full flex items-center justify-center h-full text-xs text-gray-500 italic">Indisponível</div>
              ) : (
                allModelWeights.map(w => {
                  const isActive = activeWeightsForType.has(w);
                  return (
                    <button
                      key={w}
                      disabled={!isActive}
                      onClick={() => isActive && setSelectedWeight(w)}
                      className={cn(
                        'py-2.5 text-center rounded-xl text-xs font-mono font-bold transition-all border',
                        !isActive && 'opacity-30 cursor-not-allowed bg-gray-100 dark:bg-black/10 border-transparent text-gray-400 dark:text-gray-600',
                        isActive && selectedWeight === w && 'bg-wtech-gold/20 text-wtech-gold border-wtech-gold/30',
                        isActive && selectedWeight !== w && 'bg-white dark:bg-black/20 hover:bg-gray-100 dark:hover:bg-white/10 border-gray-200 dark:border-white/5 text-gray-700 dark:text-gray-300'
                      )}
                    >
                      {w}
                    </button>
                  );
                })
              )}
            </div>
          </div>

        </div>

        {/* Results Bar — Desktop (inline, informative) */}
        {selectedWeight && (
          <div className="hidden md:flex bg-gradient-to-r from-wtech-gold/10 to-yellow-600/5 border border-wtech-gold/20 rounded-2xl p-5 flex-col md:flex-row justify-between items-center gap-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full text-center md:text-left">
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest text-wtech-gold block">Código Recomendado</span>
                {recommendation?.spring_code ? (
                  <span className="text-lg lg:text-xl font-black font-mono text-white tracking-wide bg-wtech-gold/20 px-4 py-1.5 rounded-xl border border-wtech-gold/30 inline-block mt-1 whitespace-nowrap">
                    {recommendation.spring_code}
                  </span>
                ) : (
                  <span className="text-xs font-bold text-red-400 block mt-1">Apenas sob encomenda especial</span>
                )}
              </div>
              <div className="hidden sm:block border-r border-white/10 h-10 my-auto"></div>
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 block">Mola de Fábrica (Standard)</span>
                <span className="text-base font-bold font-mono text-gray-300 block mt-1.5">
                  {recommendation?.standard_code || 'Não especificada'}
                </span>
              </div>
            </div>

            <div className="bg-black/40 px-4 py-2.5 rounded-xl border border-white/5 text-[10px] text-gray-400 max-w-xs text-center md:text-right shrink-0">
              Consulte seu mecânico credenciado W-Tech para realizar a montagem e o acerto hidráulico correto da suspensão.
            </div>
          </div>
        )}

      </div>

      {/* Results Bar — Mobile (fixed bottom, always visible while selecting) */}
      {selectedWeight && (
        <div className="md:hidden fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 bg-gradient-to-t from-black via-black/95 to-transparent animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="bg-[#161616] border border-wtech-gold/30 rounded-2xl shadow-2xl shadow-black/60 p-3.5">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <span className="text-[8px] font-black uppercase tracking-widest text-wtech-gold block leading-none">
                  Mola Recomendada
                </span>
                <span className="text-[10px] text-gray-400 truncate block mt-0.5">
                  {selectedBrand} · {selectedModel} · {selectedType === 'Front' ? 'Dianteira' : 'Traseira'} · {selectedWeight}
                </span>
              </div>
              {recommendation?.spring_code ? (
                <span className="text-lg font-black font-mono text-white tracking-wide bg-wtech-gold/20 px-3.5 py-1.5 rounded-xl border border-wtech-gold/40 shrink-0">
                  {recommendation.spring_code}
                </span>
              ) : (
                <span className="text-[11px] font-bold text-red-400 text-right shrink-0 max-w-[40%] leading-tight">
                  Sob encomenda especial
                </span>
              )}
            </div>
            <div className="flex items-center justify-between gap-2 mt-2.5 pt-2.5 border-t border-white/10">
              <span className="text-[10px] text-gray-400">
                Fábrica:{' '}
                <span className="font-mono font-bold text-gray-200">
                  {recommendation?.standard_code || '—'}
                </span>
              </span>
              <span className="text-[9px] text-gray-500 flex items-center gap-1">
                <Info size={11} className="text-wtech-gold shrink-0" /> Consulte um mecânico W-Tech
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
