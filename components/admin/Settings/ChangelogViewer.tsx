import React from 'react';
import { motion } from 'framer-motion';
import { GitCommit, Calendar, Tag, CheckCircle } from 'lucide-react';
import changelogData from '../../../CHANGELOG.json';

const ChangelogViewer = () => {
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-gray-900 to-black p-6 text-white">
                <h2 className="text-xl font-black uppercase tracking-wider flex items-center gap-3">
                    <GitCommit className="text-wtech-gold" />
                    Histórico de Versões
                </h2>
                <p className="text-sm text-gray-400 mt-2">
                    Acompanhe as evoluções e correções realizadas na plataforma.
                </p>
            </div>

            <div className="p-6 max-h-[500px] overflow-y-auto custom-scrollbar space-y-8">
                {changelogData.map((release: any, index: number) => (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        key={index} 
                        className="relative pl-8 border-l-2 border-gray-100 last:border-0"
                    >
                        {/* Timeline Dot */}
                        <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 ${index === 0 ? 'bg-wtech-gold border-wtech-gold' : 'bg-white border-gray-300'}`}></div>

                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-2">
                            <span className={`px-2 py-1 rounded text-xs font-black uppercase tracking-widest ${index === 0 ? 'bg-wtech-black text-wtech-gold' : 'bg-gray-100 text-gray-500'}`}>
                                v{release.version}
                            </span>
                            <span className="flex items-center gap-1 text-xs font-bold text-gray-400">
                                <Calendar size={12} />
                                {new Date(release.date).toLocaleDateString('pt-BR')}
                            </span>
                        </div>

                        <h3 className="font-bold text-gray-800 text-lg mb-2">{release.title}</h3>

                        <ul className="space-y-2">
                            {release.changes.map((change: string, i: number) => {
                                // Detect type
                                const isFix = change.startsWith('FIX:');
                                const isFeat = change.startsWith('FEAT:');
                                const cleanText = change.replace(/^(FIX:|FEAT:)\s*/, '');

                                return (
                                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                                        {isFix && <span className="mt-0.5 px-1.5 py-0.5 bg-red-50 text-red-600 text-[9px] font-bold rounded uppercase">FIX</span>}
                                        {isFeat && <span className="mt-0.5 px-1.5 py-0.5 bg-green-50 text-green-600 text-[9px] font-bold rounded uppercase">NEW</span>}
                                        {!isFix && !isFeat && <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-gray-300 shrink-0"></span>}
                                        <span className={isFix || isFeat ? 'font-medium' : ''}>{cleanText}</span>
                                    </li>
                                );
                            })}
                        </ul>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

export default ChangelogViewer;
