import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { findNavByGoKey } from '../nav';

// ─────────────────────────────────────────────────────────────────────────────
// Sistema de controle por teclado do Admin.
//
// Atalhos globais:
//   Cmd/Ctrl + K   → abre o Command Palette (busca tudo)
//   g + <tecla>    → navega direto (g d = Visão Geral, g l = CRM, etc.)
//   /              → foca a busca da página atual
//   n              → ação "Novo" da página atual (novo lead/pedido/curso/cliente…)
//   ?              → abre a ajuda de atalhos
//   Esc            → fecha overlays
//
// Views registram suas ações de contexto via useRegisterPage({ onNew, onFocusSearch, ... }).
// ─────────────────────────────────────────────────────────────────────────────

export type PageAction = {
    id: string;
    label: string;
    run: () => void;
    /** Tecla única (sem prefixo) que dispara a ação quando a página está ativa. */
    key?: string;
    icon?: React.ComponentType<{ size?: number; className?: string }>;
};

export type PageContext = {
    /** Título curto da seção atual (ex.: "Clientes"). */
    title?: string;
    /** Handler do "Novo" (tecla n). */
    onNew?: () => void;
    newLabel?: string;
    /** Foca o campo de busca da página (tecla /). */
    onFocusSearch?: () => void;
    /** Ações extras exibidas no palette / ajuda. */
    actions?: PageAction[];
};

type KeyboardContextValue = {
    paletteOpen: boolean;
    openPalette: () => void;
    closePalette: () => void;
    helpOpen: boolean;
    setHelpOpen: (v: boolean) => void;
    navigate: (view: string) => void;
    hasPermission: (key: string) => boolean;
    urgentTasksCount: number;
    page: PageContext;
    registerPage: (ctx: PageContext) => void;
    clearPage: () => void;
};

const KeyboardContext = createContext<KeyboardContextValue | null>(null);

export const useAdminKeyboard = () => {
    const ctx = useContext(KeyboardContext);
    if (!ctx) throw new Error('useAdminKeyboard precisa estar dentro de AdminKeyboardProvider');
    return ctx;
};

/** Hook para uma view registrar suas ações de contexto enquanto estiver montada.
 *  Seguro: se a view for renderizada fora do provider, simplesmente não faz nada. */
export const useRegisterPage = (ctx: PageContext, deps: React.DependencyList = []) => {
    const kb = useContext(KeyboardContext);
    useEffect(() => {
        if (!kb) return;
        kb.registerPage(ctx);
        return () => kb.clearPage();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);
};

/** Detecta se o foco está num campo editável (para não sequestrar a digitação). */
const isEditable = (el: EventTarget | null): boolean => {
    const node = el as HTMLElement | null;
    if (!node) return false;
    const tag = node.tagName;
    return (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        node.isContentEditable === true
    );
};

export const AdminKeyboardProvider: React.FC<{
    children: React.ReactNode;
    onNavigate: (view: string) => void;
    hasPermission: (key: string) => boolean;
    urgentTasksCount?: number;
}> = ({ children, onNavigate, hasPermission, urgentTasksCount = 0, }) => {
    const [paletteOpen, setPaletteOpen] = useState(false);
    const [helpOpen, setHelpOpen] = useState(false);
    const [page, setPage] = useState<PageContext>({});
    const goPrefixRef = useRef(false);
    const goTimerRef = useRef<number | null>(null);

    const openPalette = useCallback(() => setPaletteOpen(true), []);
    const closePalette = useCallback(() => setPaletteOpen(false), []);

    const navigate = useCallback((view: string) => {
        onNavigate(view);
        setPaletteOpen(false);
    }, [onNavigate]);

    const registerPage = useCallback((ctx: PageContext) => setPage(ctx), []);
    const clearPage = useCallback(() => setPage({}), []);

    // Mantém o page atual acessível ao listener sem recriá-lo a cada mudança
    const pageRef = useRef(page);
    pageRef.current = page;

    useEffect(() => {
        const cancelGo = () => {
            goPrefixRef.current = false;
            if (goTimerRef.current) { window.clearTimeout(goTimerRef.current); goTimerRef.current = null; }
        };

        const onKeyDown = (e: KeyboardEvent) => {
            const mod = e.metaKey || e.ctrlKey;

            // Cmd/Ctrl + K → palette (funciona mesmo digitando)
            if (mod && (e.key === 'k' || e.key === 'K')) {
                e.preventDefault();
                setPaletteOpen(v => !v);
                return;
            }

            // Esc encerra a sequência "g"
            if (e.key === 'Escape') { cancelGo(); return; }

            // A partir daqui: ignora quando digitando ou com modificadores
            if (isEditable(e.target) || mod || e.altKey) { return; }

            // Sequência de navegação: "g" e depois a tecla do destino
            if (goPrefixRef.current) {
                const nav = findNavByGoKey(e.key);
                cancelGo();
                if (nav && hasPermission(nav.permission)) {
                    e.preventDefault();
                    navigate(nav.view);
                }
                return;
            }

            if (e.key === 'g' || e.key === 'G') {
                goPrefixRef.current = true;
                goTimerRef.current = window.setTimeout(cancelGo, 1200);
                return;
            }

            // ? → ajuda
            if (e.key === '?') { e.preventDefault(); setHelpOpen(v => !v); return; }

            // / → foca busca da página
            if (e.key === '/') {
                if (pageRef.current.onFocusSearch) { e.preventDefault(); pageRef.current.onFocusSearch(); }
                return;
            }

            // n → novo
            if (e.key === 'n' || e.key === 'N') {
                if (pageRef.current.onNew) { e.preventDefault(); pageRef.current.onNew(); }
                return;
            }

            // teclas únicas registradas pela página
            const action = pageRef.current.actions?.find(a => a.key && a.key === e.key);
            if (action) { e.preventDefault(); action.run(); }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => { window.removeEventListener('keydown', onKeyDown); cancelGo(); };
    }, [navigate, hasPermission]);

    return (
        <KeyboardContext.Provider value={{
            paletteOpen, openPalette, closePalette,
            helpOpen, setHelpOpen,
            navigate, hasPermission, urgentTasksCount,
            page, registerPage, clearPage,
        }}>
            {children}
        </KeyboardContext.Provider>
    );
};
