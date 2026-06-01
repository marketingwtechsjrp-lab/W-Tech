import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Command } from 'lucide-react';
import { NAV_ITEMS } from '../nav';
import { useAdminKeyboard } from './AdminKeyboardProvider';
import { Kbd } from '../ui/Kbd';

const Row: React.FC<{ keys: React.ReactNode; label: string }> = ({ keys, label }) => (
    <div className="flex items-center justify-between py-2 border-b border-[var(--admin-border-subtle)] last:border-0">
        <span className="text-sm text-[var(--admin-text-secondary)]">{label}</span>
        <span className="flex items-center gap-1">{keys}</span>
    </div>
);

export const ShortcutsHelp: React.FC = () => {
    const { helpOpen, setHelpOpen, hasPermission, page } = useAdminKeyboard();
    const navItems = NAV_ITEMS.filter(i => i.goKey && hasPermission(i.permission));

    return (
        <AnimatePresence>
            {helpOpen && (
                <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    transition={{ duration: 0.12 }}
                    className="fixed inset-0 z-[210] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                    onMouseDown={() => setHelpOpen(false)}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.96, y: 8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, y: 8 }}
                        transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                        className="w-full max-w-2xl bg-[var(--admin-surface-1)] rounded-2xl border border-[var(--admin-border)] shadow-2xl overflow-hidden"
                        onMouseDown={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 h-14 border-b border-[var(--admin-border)]">
                            <h2 className="flex items-center gap-2 font-black text-[var(--admin-text-primary)] uppercase tracking-tight text-sm">
                                <Command size={16} className="text-[var(--admin-accent-gold)]" /> Atalhos de Teclado
                            </h2>
                            <button onClick={() => setHelpOpen(false)} className="text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)] transition-colors">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="grid md:grid-cols-2 gap-x-8 gap-y-1 p-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                            {/* Coluna 1 — Geral */}
                            <div>
                                <h3 className="text-[10px] font-black uppercase tracking-[0.15em] text-[var(--admin-text-tertiary)] mb-2">Geral</h3>
                                <Row label="Abrir busca de comandos" keys={<><Kbd>⌘</Kbd><Kbd>K</Kbd></>} />
                                <Row label="Ajuda de atalhos" keys={<Kbd>?</Kbd>} />
                                <Row label="Fechar / cancelar" keys={<Kbd>Esc</Kbd>} />
                                {page.onFocusSearch && <Row label="Focar busca da página" keys={<Kbd>/</Kbd>} />}
                                {page.onNew && <Row label={page.newLabel || 'Novo item'} keys={<Kbd>n</Kbd>} />}
                                {page.actions?.filter(a => a.key).map(a => (
                                    <Row key={a.id} label={a.label} keys={<Kbd>{a.key}</Kbd>} />
                                ))}

                                <h3 className="text-[10px] font-black uppercase tracking-[0.15em] text-[var(--admin-text-tertiary)] mt-5 mb-2">Dica</h3>
                                <p className="text-xs text-[var(--admin-text-tertiary)] leading-relaxed">
                                    Pressione <Kbd>g</Kbd> e em seguida a tecla do destino para navegar sem o mouse.
                                </p>
                            </div>

                            {/* Coluna 2 — Navegação */}
                            <div>
                                <h3 className="text-[10px] font-black uppercase tracking-[0.15em] text-[var(--admin-text-tertiary)] mb-2">Ir para…</h3>
                                {navItems.map(item => (
                                    <Row key={item.view} label={item.label} keys={<><Kbd>g</Kbd><Kbd>{item.goKey}</Kbd></>} />
                                ))}
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default ShortcutsHelp;
