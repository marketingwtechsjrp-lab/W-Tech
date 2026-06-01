import React, { forwardRef } from 'react';
import { Search, X } from 'lucide-react';
import { Kbd } from './Kbd';

interface SearchInputProps {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    /** Mostra a dica de tecla "/" à direita. */
    showSlashHint?: boolean;
    className?: string;
    autoFocus?: boolean;
}

/**
 * Campo de busca padrão do Admin. Use ref para permitir foco via atalho "/".
 *   const ref = useRef<HTMLInputElement>(null);
 *   useRegisterPage({ onFocusSearch: () => ref.current?.focus() });
 */
export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
    ({ value, onChange, placeholder = 'Buscar…', showSlashHint = true, className = '', autoFocus }, ref) => (
        <div className={'relative flex items-center w-full ' + className}>
            <Search size={16} className="absolute left-3 text-[var(--admin-text-tertiary)] pointer-events-none" />
            <input
                ref={ref}
                value={value}
                autoFocus={autoFocus}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full h-10 pl-9 pr-16 rounded-xl bg-[var(--admin-surface-1)] border border-[var(--admin-border)] text-sm text-[var(--admin-text-primary)] placeholder:text-[var(--admin-text-tertiary)] outline-none focus:border-[var(--admin-accent-gold)] focus:ring-2 focus:ring-[var(--admin-accent-gold-muted)] transition-all"
            />
            <div className="absolute right-2.5 flex items-center gap-1">
                {value ? (
                    <button
                        onClick={() => onChange('')}
                        className="text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)] transition-colors"
                        aria-label="Limpar busca"
                    >
                        <X size={15} />
                    </button>
                ) : showSlashHint ? (
                    <Kbd className="hidden md:inline-flex">/</Kbd>
                ) : null}
            </div>
        </div>
    )
);

SearchInput.displayName = 'SearchInput';

export default SearchInput;
