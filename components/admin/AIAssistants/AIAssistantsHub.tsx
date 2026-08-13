import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Send, Eye, X, Loader2 } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import TerminalBootOverlay from './TerminalBootOverlay';
import AgentWorkspace, { type AgentId } from './AgentWorkspace';
import GroupBotPanel from './GroupBotPanel';

interface AgentMeta {
    id: AgentId;
    name: string;
    role: string;
    emoji: string;
    reportsTo?: string;
}

const AGENTS: AgentMeta[] = [
    { id: 'sofia', name: 'Sofia', role: 'Gerência Geral', emoji: '👑' },
    { id: 'bia', name: 'Bia', role: 'Atendimento & CRM', emoji: '💬', reportsTo: 'Sofia' },
    { id: 'rita', name: 'Rita', role: 'Financeiro', emoji: '💰', reportsTo: 'Sofia' },
    { id: 'leo', name: 'Léo', role: 'Estagiário — Inscrições', emoji: '🧑‍💻', reportsTo: 'Bia' },
];

const AgentCard: React.FC<{ agent: AgentMeta; active: boolean; onClick: () => void }> = ({ agent, active, onClick }) => (
    <button
        onClick={onClick}
        className={
            'w-full text-left rounded-2xl p-4 border transition-all group ' +
            (active
                ? 'bg-gradient-to-br from-wtech-gold to-yellow-600 border-wtech-gold text-black shadow-lg shadow-yellow-500/20 scale-[1.02]'
                : 'bg-[var(--admin-surface-2)] border-[var(--admin-border)] hover:border-wtech-gold/50 hover:-translate-y-0.5')
        }
    >
        <div className="flex items-center gap-3">
            <div className={'w-11 h-11 rounded-xl flex items-center justify-center text-2xl shrink-0 ' + (active ? 'bg-black/10' : 'bg-wtech-gold/10')}>
                {agent.emoji}
            </div>
            <div className="min-w-0">
                <div className={'font-black truncate ' + (active ? 'text-black' : 'text-[var(--admin-text-primary)]')}>{agent.name}</div>
                <div className={'text-xs font-medium truncate ' + (active ? 'text-black/70' : 'text-[var(--admin-text-secondary)]')}>
                    {agent.role}
                </div>
            </div>
        </div>
        {agent.reportsTo && (
            <div className={'mt-2 text-[10px] font-bold uppercase tracking-wider ' + (active ? 'text-black/60' : 'text-[var(--admin-text-secondary)]')}>
                reporta a {agent.reportsTo}
            </div>
        )}
    </button>
);

const AIAssistantsHub: React.FC = () => {
    const { user } = useAuth();
    const [booting, setBooting] = useState(true);
    const [selected, setSelected] = useState<AgentId>('sofia');
    const [busy, setBusy] = useState<'preview' | 'send' | null>(null);
    const [preview, setPreview] = useState<string | null>(null);

    const callReport = async (mode: 'preview' | 'send') => {
        setBusy(mode);
        if (mode === 'preview') setPreview(null);
        try {
            const res = await fetch('/api/notify-students', {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'ai-agents-report', mode: mode === 'preview' ? 'preview' : undefined, force: mode === 'send' }),
            });
            const data = await res.json();
            if (mode === 'preview') {
                if (res.ok && data.text) setPreview(data.text);
                else alert('Falha ao gerar prévia: ' + (data.error || `HTTP ${res.status}`));
            } else {
                if (res.ok && data.ok) alert('Relatório enviado para o grupo! ✅');
                else alert('Falha no envio: ' + (data.error || data.skipped || `HTTP ${res.status}`));
            }
        } catch (e: any) {
            alert('Erro: ' + e.message);
        } finally {
            setBusy(null);
        }
    };

    const selectedMeta = AGENTS.find((a) => a.id === selected)!;

    return (
        <div className="h-full overflow-y-auto p-6 space-y-6">
            {booting && <TerminalBootOverlay onDone={() => setBooting(false)} />}

            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black text-[var(--admin-text-primary)] tracking-tight flex items-center gap-3">
                        <Sparkles className="text-wtech-gold" size={26} />
                        Assistentes de IA
                    </h2>
                    <p className="text-[var(--admin-text-secondary)] font-medium mt-1 text-sm">
                        Cada agente cuida de um setor real do sistema — dados ao vivo do banco, sem simulação.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => callReport('preview')}
                        disabled={busy !== null}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[var(--admin-border)] text-[var(--admin-text-primary)] font-bold text-sm hover:bg-[var(--admin-surface-2)] transition-colors disabled:opacity-50"
                    >
                        {busy === 'preview' ? <Loader2 size={16} className="animate-spin" /> : <Eye size={16} />}
                        Prévia
                    </button>
                    <button
                        onClick={() => {
                            if (confirm('Enviar o relatório consolidado agora para o grupo do WhatsApp configurado?')) callReport('send');
                        }}
                        disabled={busy !== null}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-wtech-gold to-yellow-600 text-black font-bold text-sm shadow-lg shadow-yellow-500/20 hover:scale-105 transition-transform disabled:opacity-50"
                    >
                        {busy === 'send' ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                        Testar Envio Agora
                    </button>
                </div>
            </div>

            {/* Organograma */}
            <div className="space-y-3">
                <div className="max-w-xs mx-auto">
                    <AgentCard agent={AGENTS[0]} active={selected === 'sofia'} onClick={() => setSelected('sofia')} />
                </div>
                <div className="grid grid-cols-2 gap-3 max-w-lg mx-auto">
                    <AgentCard agent={AGENTS[1]} active={selected === 'bia'} onClick={() => setSelected('bia')} />
                    <AgentCard agent={AGENTS[2]} active={selected === 'rita'} onClick={() => setSelected('rita')} />
                </div>
                <div className="max-w-xs mx-auto ml-[calc(50%-8rem)]">
                    <AgentCard agent={AGENTS[3]} active={selected === 'leo'} onClick={() => setSelected('leo')} />
                </div>
            </div>

            {/* Painel de detalhe do agente selecionado */}
            <div className="bg-[var(--admin-surface-1)] border border-[var(--admin-border)] rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                    <span className="text-xl">{selectedMeta.emoji}</span>
                    <h3 className="text-lg font-black text-[var(--admin-text-primary)]">{selectedMeta.name}</h3>
                    <span className="text-xs font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider">
                        {selectedMeta.role}
                    </span>
                </div>
                <AgentWorkspace agent={selected} />
            </div>

            {/* Bot de perguntas do grupo do WhatsApp */}
            <GroupBotPanel />

            <AnimatePresence>
                {preview && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-6"
                        onClick={() => setPreview(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-[var(--admin-surface-1)] border border-[var(--admin-border)] rounded-2xl p-5 max-w-lg w-full max-h-[80vh] overflow-y-auto"
                        >
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="font-black text-[var(--admin-text-primary)]">Prévia do relatório</h3>
                                <button onClick={() => setPreview(null)} className="text-[var(--admin-text-secondary)] hover:text-red-500">
                                    <X size={18} />
                                </button>
                            </div>
                            <pre className="whitespace-pre-wrap text-sm font-mono text-[var(--admin-text-primary)]">{preview}</pre>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AIAssistantsHub;
