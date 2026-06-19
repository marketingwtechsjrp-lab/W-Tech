import React from 'react';
import OilSelector from '../components/ui/OilSelector';

const OleoCalculator: React.FC = () => {
  return (
    <div className="bg-gray-50 dark:bg-black min-h-screen md:min-h-[calc(100vh-80px)] pt-6 pb-32 md:py-6 px-3 sm:px-4 flex flex-col md:justify-center transition-colors duration-300 mt-16 md:mt-20">
      <div className="max-w-6xl mx-auto w-full space-y-4 flex flex-col">

        {/* Intro */}
        <div className="text-center space-y-2 shrink-0">
          <span className="text-[10px] font-black uppercase text-wtech-gold tracking-widest bg-yellow-500/10 border border-yellow-500/25 px-3 py-1 rounded-full">
            Catálogo & Especificações
          </span>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-black dark:text-white uppercase tracking-tight leading-tight">
            Níveis de Óleo de Suspensão W-Tech
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-xs max-w-xl mx-auto leading-relaxed">
            Consulte o nível de óleo, a viscosidade indicada e o modelo de suspensão (dianteira e traseira) para a sua moto. Esta área é meramente informativa.
          </p>
        </div>

        {/* Selector */}
        <div className="flex-1 flex items-center justify-center min-h-0">
          <OilSelector />
        </div>

        {/* Notas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 max-w-5xl mx-auto w-full shrink-0 text-center md:text-left md:pt-2">
          <div className="bg-white dark:bg-[#161616] p-4 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm">
            <h4 className="font-black text-[10px] text-black dark:text-white uppercase tracking-wider mb-1">Nível de Óleo</h4>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-relaxed">
              No garfo, o nível é a folga de ar (mm) que define a progressão da suspensão no fim do curso. No amortecedor, mede-se o volume total (ml).
            </p>
          </div>
          <div className="bg-white dark:bg-[#161616] p-4 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm">
            <h4 className="font-black text-[10px] text-black dark:text-white uppercase tracking-wider mb-1">Viscosidade Correta</h4>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-relaxed">
              A viscosidade do óleo influencia diretamente a resposta hidráulica de compressão e retorno. Use sempre a especificação do fabricante da suspensão.
            </p>
          </div>
          <div className="bg-white dark:bg-[#161616] p-4 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm">
            <h4 className="font-black text-[10px] text-black dark:text-white uppercase tracking-wider mb-1">Dados Verificados</h4>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-relaxed">
              Os valores exibidos são revisados pela equipe técnica W-Tech com base nos manuais de cada suspensão. Em caso de dúvida, consulte um mecânico credenciado.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default OleoCalculator;
