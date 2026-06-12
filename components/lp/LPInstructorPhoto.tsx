import React, { useState } from 'react';

type Props = {
    src?: string | null;
    name?: string | null;
    theme: 'dark' | 'light';
};

/**
 * Foto do instrutor com fallback elegante: se a URL estiver vazia ou quebrada
 * (404 em uploads antigos é comum no banco), mostra as iniciais sobre fundo
 * da marca em vez do ícone de imagem quebrada do navegador.
 */
export function LPInstructorPhoto({ src, name, theme }: Props) {
    const [failed, setFailed] = useState(false);

    const initials = (name || 'W-Tech')
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(w => w[0].toUpperCase())
        .join('');

    if (!src || failed) {
        const palette =
            theme === 'dark'
                ? 'bg-gradient-to-br from-[#1A1A1A] to-black text-wtech-gold'
                : 'bg-gradient-to-br from-[#F3EFE6] to-[#E5DECF] text-black';
        return (
            <div className={`w-full h-full flex items-center justify-center ${palette}`}>
                <span className="text-6xl font-black tracking-tighter select-none">{initials}</span>
            </div>
        );
    }

    return (
        <img
            src={src}
            alt={name || 'Instrutor'}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={() => setFailed(true)}
        />
    );
}
