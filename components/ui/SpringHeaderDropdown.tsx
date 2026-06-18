import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { Search, ChevronRight, MessageSquare, Wrench, Shield, X, Check } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { cn } from '../../lib/utils';

interface SpringHeaderDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

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


export default function SpringHeaderDropdown({ isOpen, onClose }: SpringHeaderDropdownProps) {
  const [loading, setLoading] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState('KTM'); // Default to KTM to show list initially
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedType, setSelectedType] = useState<'Front' | 'Rear'>('Front');
  const [selectedWeight, setSelectedWeight] = useState('');
  const [modelSearch, setModelSearch] = useState('');

  // Database lists
  const [models, setModels] = useState<string[]>([]);
  const [modelData, setModelData] = useState<any[]>([]);

  // Refs for scroll reset
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
          
          // Auto-select first model to populate weight ranges
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

  // Filtered models by search input
  const filteredModels = useMemo(() => {
    return models.filter(m => m.toLowerCase().includes(modelSearch.toLowerCase()));
  }, [models, modelSearch]);

  const sendWhatsAppOrder = () => {
    const phone = '5517997321200';
    const text = `Olá, gostaria de encomendar a mola de recomendação calculada no painel de busca W-Tech:
- Moto: ${selectedBrand} ${selectedModel}
- Posição: ${selectedType === 'Front' ? 'Dianteira (Front Fork)' : 'Traseira (Shock)'}
- Peso: ${selectedWeight}
- Mola Recomendada: ${recommendation?.spring_code || 'Não disponível'}
- Mola Padrão (Standard): ${recommendation?.standard_code || 'Não especificada'}`;

    window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(text)}`, '_blank');
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="absolute left-0 right-0 md:left-4 md:right-4 top-[102%] bg-black/95 md:rounded-3xl border border-white/10 backdrop-blur-xl shadow-2xl z-[99] text-white p-6 max-h-[80vh] overflow-y-auto"
      onMouseLeave={onClose}
    >
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header Title */}
        <div className="flex justify-between items-center border-b border-white/5 pb-3">
          <div className="flex items-center gap-2">
            <Wrench className="text-wtech-gold" size={16} />
            <h4 className="text-xs font-black uppercase tracking-widest text-wtech-gold">Busca Rápida de Molas</h4>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* 1. Brands Header Selection */}
        <div className="space-y-2">
          <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">1. Escolha a Fabricante</span>
          <div className="grid grid-cols-2 sm:grid-cols-5 md:grid-cols-10 gap-2">
            {STATIC_BRANDS.map(brand => (
              <button
                key={brand}
                onClick={() => setSelectedBrand(brand)}
                className={cn(
                  'h-12 flex items-center justify-center p-2 rounded-xl border transition-all hover:scale-[1.03] bg-white',
                  selectedBrand === brand
                    ? 'border-wtech-gold shadow-[0_0_12px_rgba(212,163,89,0.3)] ring-2 ring-wtech-gold/30'
                    : 'border-white/10 hover:border-white/20'
                )}
                title={brand}
              >
                <img 
                  src={BRAND_LOGOS[brand]} 
                  alt={brand} 
                  className="max-h-7 w-auto object-contain" 
                />
              </button>
            ))}
          </div>
        </div>

        {/* 3 Columns Selector (Model, Type, Weight) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Column 2. Model Selection */}
          <div className="flex flex-col space-y-2 bg-white/5 p-4 rounded-2xl border border-white/10">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">2. Modelo da Moto</span>
              <div className="relative w-36">
                <Search className="absolute left-2 top-2 text-gray-500" size={12} />
                <input
                  type="text"
                  placeholder="Filtrar..."
                  className="w-full bg-black/40 border border-white/10 rounded-lg py-1 pl-7 pr-2 text-[10px] text-white outline-none focus:border-wtech-gold transition-colors"
                  value={modelSearch}
                  onChange={e => setModelSearch(e.target.value)}
                />
              </div>
            </div>
            
            <div 
              ref={modelListRef}
              className="flex flex-col gap-1 max-h-[180px] overflow-y-auto pr-1"
            >
              {loading && models.length === 0 ? (
                <span className="text-xs text-gray-500 italic py-4 text-center">Buscando modelos...</span>
              ) : filteredModels.length === 0 ? (
                <span className="text-xs text-gray-500 italic py-4 text-center">Nenhum modelo</span>
              ) : (
                filteredModels.map(m => (
                  <button
                    key={m}
                    onClick={() => setSelectedModel(m)}
                    className={cn(
                      'px-3 py-2 rounded-lg text-left text-xs transition-all font-bold',
                      selectedModel === m
                        ? 'bg-wtech-gold/15 text-wtech-gold border border-wtech-gold/30'
                        : 'hover:bg-white/5 text-gray-300 border border-transparent'
                    )}
                  >
                    {m}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Column 3. Fork or Shock Position */}
          <div className="flex flex-col space-y-2 bg-white/5 p-4 rounded-2xl border border-white/10 justify-between">
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">3. Tipo de Suspensão</span>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => hasFront && setSelectedType('Front')}
                  disabled={!hasFront}
                  className={cn(
                    'p-4 rounded-xl flex items-center justify-between border transition-all text-xs font-black uppercase tracking-wider',
                    !hasFront && 'opacity-30 cursor-not-allowed bg-black/10 border-transparent text-gray-500',
                    hasFront && selectedType === 'Front' && 'bg-wtech-gold text-black border-wtech-gold font-black shadow-lg shadow-yellow-500/15',
                    hasFront && selectedType !== 'Front' && 'bg-black/20 hover:bg-white/5 border-white/10 text-white'
                  )}
                >
                  <span className="flex items-center gap-2">
                    <Wrench size={14} /> Dianteira (Front Fork)
                  </span>
                  {hasFront && selectedType === 'Front' && <Check size={14} />}
                </button>
                <button
                  onClick={() => hasRear && setSelectedType('Rear')}
                  disabled={!hasRear}
                  className={cn(
                    'p-4 rounded-xl flex items-center justify-between border transition-all text-xs font-black uppercase tracking-wider',
                    !hasRear && 'opacity-30 cursor-not-allowed bg-black/10 border-transparent text-gray-500',
                    hasRear && selectedType === 'Rear' && 'bg-wtech-gold text-black border-wtech-gold font-black shadow-lg shadow-yellow-500/15',
                    hasRear && selectedType !== 'Rear' && 'bg-black/20 hover:bg-white/5 border-white/10 text-white'
                  )}
                >
                  <span className="flex items-center gap-2">
                    <Shield size={14} /> Traseira (Rear Shock)
                  </span>
                  {hasRear && selectedType === 'Rear' && <Check size={14} />}
                </button>
              </div>
            </div>

            <div className="bg-black/30 p-3 rounded-xl border border-white/5">
              <p className="text-[10px] text-gray-400 leading-relaxed">
                As molas dianteiras ajustam o garfo e a traseira calibra o amortecedor central. Selecione a posição desejada para ver a recomendação.
              </p>
            </div>
          </div>

          {/* Column 4. Weights Selection */}
          <div className="flex flex-col space-y-2 bg-white/5 p-4 rounded-2xl border border-white/10">
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">4. Peso do Piloto (Equipado)</span>
            <div 
              ref={weightListRef}
              className="grid grid-cols-2 gap-1.5 max-h-[180px] overflow-y-auto pr-1"
            >
              {loading && allModelWeights.length === 0 ? (
                <span className="col-span-2 text-xs text-gray-500 italic py-4 text-center">Buscando pesos...</span>
              ) : allModelWeights.length === 0 ? (
                <span className="col-span-2 text-xs text-gray-500 italic py-4 text-center">Indisponível para esta seleção</span>
              ) : (
                allModelWeights.map(w => {
                  const isActive = activeWeightsForType.has(w);
                  return (
                    <button
                      key={w}
                      disabled={!isActive}
                      onClick={() => isActive && setSelectedWeight(w)}
                      className={cn(
                        'py-2 px-1 text-center rounded-lg text-xs font-mono font-bold transition-all border',
                        !isActive && 'opacity-30 cursor-not-allowed bg-black/10 border-transparent text-gray-500',
                        isActive && selectedWeight === w && 'bg-wtech-gold/20 text-wtech-gold border-wtech-gold/30',
                        isActive && selectedWeight !== w && 'bg-black/20 hover:bg-white/5 border-white/10 text-gray-300'
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

        {/* Result Area */}
        {selectedWeight && (
          <div className="bg-gradient-to-r from-wtech-gold/10 to-yellow-600/5 border border-wtech-gold/20 rounded-2xl p-5 flex flex-col sm:flex-row justify-between items-center gap-4 animate-in fade-in slide-in-from-bottom-3 duration-200">
            <div className="flex flex-col sm:flex-row gap-6 text-center sm:text-left">
              <div>
                <span className="text-[9px] font-black uppercase tracking-wider text-wtech-gold block">Mola Recomendada</span>
                {recommendation?.spring_code ? (
                  <span className="text-xl font-black font-mono text-white tracking-wide bg-wtech-gold/20 px-3 py-1 rounded border border-wtech-gold/30 inline-block mt-1">
                    {recommendation.spring_code}
                  </span>
                ) : (
                  <span className="text-xs font-bold text-red-400 block mt-1">Sob consulta ou ajuste especial</span>
                )}
              </div>
              <div className="w-[1px] bg-white/10 hidden sm:block h-10 align-middle"></div>
              <div>
                <span className="text-[9px] font-black uppercase tracking-wider text-gray-400 block">Mola de Fábrica (Standard)</span>
                <span className="text-base font-bold font-mono text-gray-300 block mt-1.5">
                  {recommendation?.standard_code || 'Não informada'}
                </span>
              </div>
              <div className="w-[1px] bg-white/10 hidden sm:block h-10 align-middle"></div>
              <div>
                <span className="text-[9px] font-black uppercase tracking-wider text-gray-400 block">Configuração Selecionada</span>
                <span className="text-xs font-bold text-gray-300 uppercase block mt-1.5">
                  {selectedBrand} {selectedModel} ({selectedType === 'Front' ? 'Frente' : 'Traseira'}) • {selectedWeight}
                </span>
              </div>
            </div>
            
            <div className="flex gap-2 w-full sm:w-auto shrink-0">
              <button
                onClick={sendWhatsAppOrder}
                className="w-full sm:w-auto bg-gradient-to-r from-green-500 to-emerald-600 text-white px-5 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:scale-[1.03] active:scale-95 transition-all shadow-lg shadow-green-500/15"
              >
                <MessageSquare size={13} /> Pedir no WhatsApp
              </button>
            </div>
          </div>
        )}

      </div>
    </motion.div>
  );
}
