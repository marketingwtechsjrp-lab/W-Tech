import React from 'react';

/** Tecla estilizada (keycap) para dicas de atalho. */
export const Kbd: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
    <kbd
        className={
            'inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-[5px] ' +
            'border border-[var(--admin-border)] bg-[var(--admin-surface-2)] ' +
            'text-[10px] font-bold font-mono text-[var(--admin-text-secondary)] leading-none ' +
            'shadow-[0_1px_0_var(--admin-border)] ' + className
        }
    >
        {children}
    </kbd>
);

export default Kbd;
