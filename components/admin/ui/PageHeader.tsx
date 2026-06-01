import React from 'react';
import { type LucideIcon, Plus } from 'lucide-react';
import { Kbd } from './Kbd';

interface PageHeaderProps {
    icon?: LucideIcon;
    title: string;
    subtitle?: string;
    /** Conteúdo extra à direita (filtros, toggles…). */
    children?: React.ReactNode;
    /** Botão de ação primária (ex.: "Novo cliente"). */
    primaryAction?: {
        label: string;
        onClick: () => void;
        icon?: LucideIcon;
        /** Dica de atalho (ex.: "n"). */
        kbd?: string;
    };
}

/**
 * Cabeçalho de página padrão do Admin — visual clean/empresarial e responsivo.
 * Mobile: título em cima, ações abaixo (largura total). Desktop: lado a lado.
 */
export const PageHeader: React.FC<PageHeaderProps> = ({ icon: Icon, title, subtitle, children, primaryAction }) => {
    const ActionIcon = primaryAction?.icon || Plus;
    return (
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-5">
            <div className="flex items-center gap-3 min-w-0">
                {Icon && (
                    <div className="w-10 h-10 rounded-xl bg-[var(--admin-accent-gold-muted)] flex items-center justify-center text-[var(--admin-accent-gold)] shrink-0">
                        <Icon size={20} />
                    </div>
                )}
                <div className="min-w-0">
                    <h1 className="text-lg md:text-xl font-black tracking-tight text-[var(--admin-text-primary)] leading-tight truncate">
                        {title}
                    </h1>
                    {subtitle && (
                        <p className="text-xs text-[var(--admin-text-tertiary)] font-medium truncate">{subtitle}</p>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
                {children}
                {primaryAction && (
                    <button
                        onClick={primaryAction.onClick}
                        className="group flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-[var(--admin-accent-gold)] text-black font-bold text-sm hover:brightness-105 active:scale-[0.98] transition-all shadow-sm shrink-0"
                    >
                        <ActionIcon size={16} strokeWidth={2.5} />
                        <span className="whitespace-nowrap">{primaryAction.label}</span>
                        {primaryAction.kbd && (
                            <Kbd className="hidden md:inline-flex !bg-black/10 !border-black/10 !text-black/60 !shadow-none">{primaryAction.kbd}</Kbd>
                        )}
                    </button>
                )}
            </div>
        </div>
    );
};

export default PageHeader;
