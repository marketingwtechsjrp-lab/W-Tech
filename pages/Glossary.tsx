import React, { useState } from 'react';
import { MOCK_GLOSSARY } from '../constants';
import { Search } from 'lucide-react';

const Glossary: React.FC = () => {
  const [term, setTerm] = useState('');

  const filtered = MOCK_GLOSSARY.filter(g => 
    g.term.toLowerCase().includes(term.toLowerCase()) || 
    g.definition.toLowerCase().includes(term.toLowerCase())
  );

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-wtech-black mb-4">Glossário Técnico</h1>
      <p className="text-gray-600 mb-8 max-w-2xl">
        Entenda os termos técnicos utilizados na engenharia de suspensão. 
        Uma base de conhecimento para auxiliar em seus estudos e diagnósticos.
      </p>

      <div className="relative max-w-lg mb-12">
        <input 
          type="text" 
          placeholder="Pesquisar termo..." 
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded shadow-sm focus:outline-none focus:border-wtech-gold"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
        />
        <Search className="absolute left-3 top-3.5 text-gray-400" size={20} />
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(item => (
          <div key={item.id} className="bg-white p-6 rounded shadow-sm hover:shadow-md transition-shadow border-t-4 border-wtech-black">
            <span className="text-xs font-bold text-wtech-gold uppercase tracking-wider">{item.category}</span>
            <h3 className="text-xl font-bold text-gray-900 mt-2 mb-3">{item.term}</h3>
            <p className="text-gray-600 leading-relaxed text-sm">{item.definition}</p>
          </div>
        ))}
      </div>
      
      {filtered.length === 0 && (
        <p className="text-center text-gray-500">Nenhum termo encontrado.</p>
      )}
    </div>
  );
};

export default Glossary;