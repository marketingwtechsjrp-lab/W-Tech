import React from 'react';
import SpringSelector from '../components/ui/SpringSelector';

const MolasCalculator: React.FC = () => {
  return (
    <div className="bg-gray-50 dark:bg-black min-h-screen md:min-h-[calc(100vh-80px)] pt-6 pb-32 md:py-6 px-3 sm:px-4 flex flex-col md:justify-center transition-colors duration-300 mt-16 md:mt-20">
      <div className="max-w-6xl mx-auto w-full space-y-4 flex flex-col">

        {/* Intro Section */}
        <div className="text-center space-y-2 shrink-0">
          <span className="text-[10px] font-black uppercase text-wtech-gold tracking-widest bg-yellow-500/10 border border-yellow-500/25 px-3 py-1 rounded-full">
            Catálogo & Especificações
          </span>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-black dark:text-white uppercase tracking-tight leading-tight">
            Banco de Dados de Molas W-Tech
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-xs max-w-xl mx-auto leading-relaxed">
            Consulte as molas calibradas (dianteira e traseira) para o seu peso e modelo de motocicleta. Esta área é meramente informativa.
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
            <h4 className="font-black text-[10px] text-black dark:text-white uppercase tracking-wider mb-1">Consulta Técnica</h4>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-relaxed">
              As constantes elásticas e especificações contidas nesta base seguem rigorosamente as tabelas de referência internacional.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default MolasCalculator;
