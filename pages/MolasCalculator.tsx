import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import SpringSelector from '../components/ui/SpringSelector';
import { useLanguage } from '../context/LanguageContext';
import SEO from '../components/SEO';
import { supabase } from '../lib/supabaseClient';

type ModeloDoCatalogo = { brand: string; model: string; model_slug: string };

const MolasCalculator: React.FC = () => {
  const { t } = useLanguage();
  const [modelos, setModelos] = useState<ModeloDoCatalogo[]>([]);

  // Índice do catálogo em HTML: a calculadora só mostra a mola depois dos cliques,
  // e é por estes links que o robô chega à página de cada modelo.
  useEffect(() => {
    let ativo = true;
    supabase
      .from('SITE_SpringModels')
      .select('brand, model, model_slug')
      .order('brand', { ascending: true })
      .order('model', { ascending: true })
      .then(({ data, error }) => {
        if (error) console.warn('[Molas] lista de modelos indisponível:', error.message);
        if (ativo) setModelos((data as ModeloDoCatalogo[] | null) || []);
      });
    return () => { ativo = false; };
  }, []);

  const porMarca = useMemo(() => {
    const grupos = new Map<string, ModeloDoCatalogo[]>();
    for (const m of modelos) grupos.set(m.brand, [...(grupos.get(m.brand) || []), m]);
    return [...grupos.entries()];
  }, [modelos]);

  return (
    <div className="bg-gray-50 dark:bg-black min-h-screen md:min-h-[calc(100vh-80px)] pt-6 pb-32 md:py-6 px-3 sm:px-4 flex flex-col md:justify-center transition-colors duration-300 mt-16 md:mt-20">
      <SEO
        title="Calculadora de Molas de Suspensão"
        description="Calcule a mola ideal para a suspensão da sua moto a partir do peso do piloto, do modelo e do tipo de uso. Ferramenta gratuita da W-Tech Brasil."
      />
      <div className="max-w-6xl mx-auto w-full space-y-4 flex flex-col">

        {/* Intro Section */}
        <div className="text-center space-y-2 shrink-0">
          <span className="text-[10px] font-black uppercase text-wtech-gold tracking-widest bg-yellow-500/10 border border-yellow-500/25 px-3 py-1 rounded-full">
            Catálogo & Especificações
          </span>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-black dark:text-white uppercase tracking-tight leading-tight">
            {t.calculators.molasTitle}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-xs max-w-xl mx-auto leading-relaxed">
            {t.calculators.molasSubtitle}
          </p>
        </div>

        {/* The Calculator Component */}
        <div className="flex-1 flex items-center justify-center min-h-0">
          <SpringSelector />
        </div>

        {/* Informational Notes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 max-w-5xl mx-auto w-full shrink-0 text-center md:text-left md:pt-2">
          <div className="bg-white dark:bg-[#161616] p-4 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm">
            <h4 className="font-black text-[10px] text-black dark:text-white uppercase tracking-wider mb-1">Mola Sob Medida</h4>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-relaxed">
              Molas calibradas para o peso do piloto corrigem o SAG da moto, garantindo a tração, resposta de curvas e estabilidade ideais.
            </p>
          </div>
          <div className="bg-white dark:bg-[#161616] p-4 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm">
            <h4 className="font-black text-[10px] text-black dark:text-white uppercase tracking-wider mb-1">Mola Standard</h4>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-relaxed">
              Representa a calibração de fábrica (padrão) da moto, recomendada para pilotos com peso entre 75kg e 85kg equipados.
            </p>
          </div>
          <div className="bg-white dark:bg-[#161616] p-4 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm">
            <h4 className="font-black text-[10px] text-black dark:text-white uppercase tracking-wider mb-1">Carga Adicional</h4>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-relaxed">
              Caso transporte garupa ou bagagens frequentes na mota, recomendamos subir +1 nível na taxa de mola (k).
            </p>
          </div>
        </div>

        {porMarca.length > 0 && (
          <section aria-labelledby="molas-por-modelo" className="max-w-5xl mx-auto w-full pt-8">
            <h2 id="molas-por-modelo" className="text-lg sm:text-xl font-black text-black dark:text-white uppercase tracking-tight">
              Tabela de molas por modelo
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-xs mt-1 mb-5 max-w-2xl">
              Escolha a moto para ver a tabela completa de molas da bengala e do amortecedor por peso do piloto equipado.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {porMarca.map(([marca, lista]) => (
                <div key={marca} className="bg-white dark:bg-[#161616] p-4 rounded-2xl border border-gray-200 dark:border-white/10">
                  <h3 className="font-black text-xs text-black dark:text-white uppercase tracking-wider mb-2">{marca}</h3>
                  <ul className="space-y-1">
                    {lista.map((m) => (
                      <li key={m.model_slug}>
                        <Link to={`/molas/${m.model_slug}`} className="text-xs text-gray-600 dark:text-gray-300 hover:text-wtech-red">
                          {m.model}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        )}

      </div>
    </div>
  );
};

export default MolasCalculator;
