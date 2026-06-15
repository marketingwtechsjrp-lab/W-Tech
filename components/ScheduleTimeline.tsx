import React from 'react';
import { motion } from 'framer-motion';
import { Target, Check, Trophy } from 'lucide-react';
import { ScheduleModule } from '../lib/schedule';

interface ScheduleTimelineProps {
    modules: ScheduleModule[];
    /** dark: LPs escuras (v1, v2, v5, v6) · light: LPs claras (v3, v4, v7, v8) */
    variant?: 'dark' | 'light';
}

/**
 * Cronograma do curso renderizado de forma visual e separado por módulo
 * (badge numerado, título, objetivo, tópicos e resultado), substituindo o
 * antigo bloco de texto cru. Compartilhado por todos os 8 templates de LP.
 */
export const ScheduleTimeline: React.FC<ScheduleTimelineProps> = ({ modules, variant = 'dark' }) => {
    const dark = variant === 'dark';

    const card = dark
        ? 'bg-white/[0.03] border-white/10 hover:border-wtech-gold/40'
        : 'bg-white border-gray-200 hover:border-wtech-gold/50 shadow-sm';
    const titleColor = dark ? 'text-white' : 'text-gray-900';
    const objColor = dark ? 'text-white/60' : 'text-gray-500';
    const topicColor = dark ? 'text-white/80' : 'text-gray-700';
    const resultBox = dark
        ? 'bg-wtech-gold/10 border-wtech-gold/30 text-wtech-gold'
        : 'bg-wtech-gold/10 border-wtech-gold/40 text-amber-700';
    const lineColor = dark ? 'bg-white/10' : 'bg-gray-200';

    return (
        <div className="relative max-w-3xl mx-auto">
            <div className="space-y-5">
                {modules.map((m, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 18 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-60px' }}
                        transition={{ duration: 0.45, delay: Math.min(i * 0.06, 0.3) }}
                        className="relative flex gap-4 md:gap-5"
                    >
                        {/* Coluna do número + linha conectora */}
                        <div className="flex flex-col items-center shrink-0">
                            <div className="w-11 h-11 rounded-xl bg-wtech-gold text-black flex items-center justify-center font-black text-base shadow-lg shadow-wtech-gold/20">
                                {String(i + 1).padStart(2, '0')}
                            </div>
                            {i < modules.length - 1 && <div className={`w-px flex-1 mt-2 ${lineColor}`} />}
                        </div>

                        {/* Card do módulo */}
                        <div className={`flex-1 rounded-2xl border p-5 md:p-6 mb-1 transition-colors ${card}`}>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-wtech-gold">
                                Módulo {i + 1}
                            </span>
                            <h3 className={`text-lg md:text-xl font-black mt-1 leading-tight ${titleColor}`}>
                                {m.title}
                            </h3>

                            {m.objective && (
                                <p className={`flex gap-2 mt-3 text-sm leading-relaxed ${objColor}`}>
                                    <Target size={15} className="text-wtech-gold shrink-0 mt-0.5" />
                                    <span><strong className="font-semibold">Objetivo:</strong> {m.objective}</span>
                                </p>
                            )}

                            {m.topics && m.topics.length > 0 && (
                                <ul className="mt-4 space-y-2">
                                    {m.topics.filter(t => t && t.trim()).map((t, j) => (
                                        <li key={j} className={`flex gap-2.5 text-sm leading-relaxed ${topicColor}`}>
                                            <Check size={15} className="text-wtech-gold shrink-0 mt-0.5" strokeWidth={3} />
                                            <span>{t}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}

                            {m.result && (
                                <div className={`flex gap-2 mt-4 rounded-xl border px-3.5 py-2.5 text-sm font-medium ${resultBox}`}>
                                    <Trophy size={15} className="shrink-0 mt-0.5" />
                                    <span>{m.result}</span>
                                </div>
                            )}
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

export default ScheduleTimeline;
