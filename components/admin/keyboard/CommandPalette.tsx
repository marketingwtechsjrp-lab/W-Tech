import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, CornerDownLeft, ArrowUp, ArrowDown, Plus } from 'lucide-react';
import { NAV_GROUPS, type AdminNavItem } from '../nav';
import { useAdminKeyboard } from './AdminKeyboardProvider';
import { Kbd } from '../ui/Kbd';

// Normaliza string para busca (remove acentos, caixa baixa)
const norm = (s: string) =>
    s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

type Cmd = {
    id: string;
    label: string;
    hint?: string;
    group: string;
    keywords: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    run: () => void;
    goKey?: string;
};

export const CommandPalette: React.FC = () => {
    const { paletteOpen, closePalette, navigate, hasPermission, page } = useAdminKeyboard();
    const [query, setQuery] = useState('');
    const [active, setActive] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    // Monta a lista de comandos: ações da página atual + navegação
    const commands = useMemo<Cmd[]>(() => {
        const list: Cmd[] = [];

        if (page.onNew) {
            list.push({
                id: 'page-new', label: page.newLabel || `Novo em ${page.title || 'página'}`,
                hint: 'n', group: page.title || 'Página', keywords: 'novo criar adicionar new',
                icon: Plus, run: () => page.onNew?.(),
            });
        }
        page.actions?.forEach(a => list.push({
            id: a.id, label: a.label, hint: a.key, group: page.title || 'Página',
            keywords: norm(a.label), icon: a.icon || Plus, run: a.run,
        }));

        NAV_GROUPS.forEach(g => {
            g.items.forEach((item: AdminNavItem) => {
                if (!hasPermission(item.permission)) return;
                list.push({
                    id: `nav-${item.view}`, label: item.label, hint: item.goKey ? `g ${item.goKey}` : undefined,
                    group: g.label, keywords: norm(`${item.label} ${item.keywords || ''}`),
                    icon: item.icon, goKey: item.goKey, run: () => navigate(item.view),
                });
            });
        });
        return list;
    }, [page, hasPermission, navigate]);

    const filtered = useMemo(() => {
        const q = norm(query.trim());
        if (!q) return commands;
        return commands.filter(c => norm(c.label).includes(q) || c.keywords.includes(q));
    }, [commands, query]);

    // Reset ao abrir/fechar
    useEffect(() => {
        if (paletteOpen) {
            setQuery(''); setActive(0);
            setTimeout(() => inputRef.current?.focus(), 30);
        }
    }, [paletteOpen]);

    useEffect(() => { setActive(0); }, [query]);

    // Garante que o item ativo fique visível
    useEffect(() => {
        const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`);
        el?.scrollIntoView({ block: 'nearest' });
    }, [active]);

    const onKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, filtered.length - 1)); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(a - 1, 0)); }
        else if (e.key === 'Enter') { e.preventDefault(); filtered[active]?.run(); }
        else if (e.key === 'Escape') { e.preventDefault(); closePalette(); }
    };

    // Agrupa visualmente
    const groups = useMemo(() => {
        const map = new Map<string, { cmd: Cmd; idx: number }[]>();
        filtered.forEach((cmd, idx) => {
            const arr = map.get(cmd.group) || [];
            arr.push({ cmd, idx });
            map.set(cmd.group, arr);
        });
        return Array.from(map.entries());
    }, [filtered]);

    return (
        <AnimatePresence>
            {paletteOpen && (
                <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    transition={{ duration: 0.12 }}
                    className="fixed inset-0 z-[200] flex items-start justify-center pt-[12vh] px-4 bg-black/50 backdrop-blur-sm"
                    onMouseDown={closePalette}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.97, y: -8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.97, y: -8 }}
                        transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
                        className="w-full max-w-xl bg-[var(--admin-surface-1)] rounded-2xl border border-[var(--admin-border)] shadow-2xl overflow-hidden"
                        onMouseDown={e => e.stopPropagation()}
                        onKeyDown={onKeyDown}
                    >
                        {/* Campo de busca */}
                        <div className="flex items-center gap-3 px-4 h-14 border-b border-[var(--admin-border)]">
                            <Search size={18} className="text-[var(--admin-text-tertiary)] shrink-0" />
                            <input
                                ref={inputRef}
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                placeholder="Buscar páginas e ações…"
                                className="flex-1 bg-transparent outline-none text-[15px] text-[var(--admin-text-primary)] placeholder:text-[var(--admin-text-tertiary)]"
                            />
                            <Kbd>Esc</Kbd>
                        </div>

                        {/* Resultados */}
                        <div ref={listRef} className="max-h-[52vh] overflow-y-auto py-2 custom-scrollbar">
                            {filtered.length === 0 && (
                                <div className="px-4 py-10 text-center text-sm text-[var(--admin-text-tertiary)]">
                                    Nenhum resultado para “{query}”.
                                </div>
                            )}
                            {groups.map(([groupLabel, items]) => (
                                <div key={groupLabel} className="mb-1">
                                    <div className="px-4 pt-2 pb-1 text-[10px] font-black uppercase tracking-[0.15em] text-[var(--admin-text-tertiary)]">
                                        {groupLabel}
                                    </div>
                                    {items.map(({ cmd, idx }) => {
                                        const Icon = cmd.icon;
                                        const isActive = idx === active;
                                        return (
                                            <button
                                                key={cmd.id}
                                                data-idx={idx}
                                                onMouseMove={() => setActive(idx)}
                                                onClick={() => cmd.run()}
                                                className={
                                                    'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ' +
                                                    (isActive ? 'bg-[var(--admin-accent-gold-muted)]' : 'hover:bg-[var(--admin-surface-2)]')
                                                }
                                            >
                                                <div className={
                                                    'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ' +
                                                    (isActive ? 'bg-[var(--admin-accent-gold)] text-black' : 'bg-[var(--admin-surface-2)] text-[var(--admin-text-secondary)]')
                                                }>
                                                    <Icon size={15} />
                                                </div>
                                                <span className={'flex-1 text-sm font-medium ' + (isActive ? 'text-[var(--admin-text-primary)]' : 'text-[var(--admin-text-secondary)]')}>
                                                    {cmd.label}
                                                </span>
                                                {cmd.hint && (
                                                    <span className="flex items-center gap-1">
                                                        {cmd.hint.split(' ').map((k, i) => <Kbd key={i}>{k}</Kbd>)}
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>

                        {/* Rodapé com dicas */}
                        <div className="flex items-center gap-4 px-4 h-10 border-t border-[var(--admin-border)] text-[11px] text-[var(--admin-text-tertiary)]">
                            <span className="flex items-center gap-1.5"><Kbd><ArrowUp size={9} /></Kbd><Kbd><ArrowDown size={9} /></Kbd> navegar</span>
                            <span className="flex items-center gap-1.5"><Kbd><CornerDownLeft size={9} /></Kbd> abrir</span>
                            <span className="ml-auto flex items-center gap-1.5"><Kbd>?</Kbd> atalhos</span>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default CommandPalette;
