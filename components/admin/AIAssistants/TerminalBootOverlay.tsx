import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Encenação de terminal (npm + Claude Code "carregando") ao abrir o módulo
 * Assistentes de IA. Puramente visual — nenhum dado real é buscado aqui.
 * Roda toda vez que o hub é montado (sem gate de sessionStorage) para manter
 * o efeito de abertura a cada visita. Clicável para pular.
 */

type LineKind = 'command' | 'output' | 'success' | 'blank';

interface TerminalLine {
    kind: LineKind;
    text: string;
    delayMs: number;
}

const SCRIPT: TerminalLine[] = [
    { kind: 'command', text: 'npm install -g @anthropic-ai/claude-code', delayMs: 550 },
    { kind: 'output', text: 'added 1 package in 1.2s', delayMs: 350 },
    { kind: 'blank', text: '', delayMs: 120 },
    { kind: 'command', text: 'claude --workspace w-tech-brasil', delayMs: 550 },
    { kind: 'output', text: 'Carregando Assistentes de IA W-Tech...', delayMs: 500 },
    { kind: 'success', text: '✓ Léo   — Atendimento & Inscrições', delayMs: 380 },
    { kind: 'success', text: '✓ Bia   — CRM & WhatsApp', delayMs: 380 },
    { kind: 'success', text: '✓ Rita  — Financeiro', delayMs: 380 },
    { kind: 'success', text: '✓ Sofia — Gerência Geral', delayMs: 380 },
    { kind: 'blank', text: '', delayMs: 150 },
    { kind: 'output', text: 'Pronto.', delayMs: 500 },
];

const lineClass: Record<LineKind, string> = {
    command: 'text-emerald-400',
    output: 'text-gray-400',
    success: 'text-wtech-gold font-semibold',
    blank: '',
};

interface TerminalBootOverlayProps {
    onDone: () => void;
}

const TerminalBootOverlay: React.FC<TerminalBootOverlayProps> = ({ onDone }) => {
    const [visibleCount, setVisibleCount] = useState(0);
    const [closing, setClosing] = useState(false);

    useEffect(() => {
        if (visibleCount >= SCRIPT.length) {
            const finish = setTimeout(() => setClosing(true), 450);
            return () => clearTimeout(finish);
        }
        const next = SCRIPT[visibleCount];
        const timer = setTimeout(() => setVisibleCount((c) => c + 1), next.delayMs);
        return () => clearTimeout(timer);
    }, [visibleCount]);

    useEffect(() => {
        if (!closing) return;
        const timer = setTimeout(onDone, 400);
        return () => clearTimeout(timer);
    }, [closing, onDone]);

    const handleSkip = () => setClosing(true);

    return (
        <AnimatePresence>
            {!closing && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4 }}
                    onClick={handleSkip}
                    className="fixed inset-0 z-[100] bg-black flex items-center justify-center cursor-pointer p-6"
                >
                    <motion.div
                        initial={{ scale: 0.96, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.3 }}
                        className="w-full max-w-2xl rounded-xl border border-gray-800 bg-[#0b0b0b] shadow-2xl shadow-black/50 overflow-hidden"
                    >
                        <div className="flex items-center gap-2 px-4 py-2.5 bg-[#161616] border-b border-gray-800">
                            <span className="w-3 h-3 rounded-full bg-red-500/80" />
                            <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
                            <span className="w-3 h-3 rounded-full bg-green-500/80" />
                            <span className="ml-3 text-[11px] text-gray-500 font-mono tracking-wide">
                                zsh — assistentes-de-ia
                            </span>
                        </div>
                        <div className="p-5 font-mono text-[13px] leading-relaxed min-h-[260px]">
                            {SCRIPT.slice(0, visibleCount).map((line, i) => (
                                <div key={i} className={lineClass[line.kind]}>
                                    {line.kind === 'command' ? <span className="text-gray-600">$ </span> : null}
                                    {line.text}
                                </div>
                            ))}
                            {visibleCount < SCRIPT.length && (
                                <span className="inline-block w-2 h-4 bg-wtech-gold align-middle animate-pulse" />
                            )}
                        </div>
                        <div className="px-5 pb-4 text-[10px] text-gray-600 font-mono">
                            clique para pular
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default TerminalBootOverlay;
