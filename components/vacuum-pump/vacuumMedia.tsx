import React from 'react';

const BASE = '/images/vacuum-pump';

/** Imagens tiradas do modelo 3D do projeto, até chegarem as fotos da máquina. */
export const VACUUM_IMAGES = {
    front: `${BASE}/machine-front.webp`,
    frontSm: `${BASE}/machine-front-sm.webp`,
    rear: `${BASE}/machine-rear.webp`,
    rearSm: `${BASE}/machine-rear-sm.webp`,
    inside: `${BASE}/machine-inside.webp`,
    insideSm: `${BASE}/machine-inside-sm.webp`,
};

/** Ilustração até chegar a foto real: não vamos publicar imagem fingindo ser o produto. */
export const BubbleChamber: React.FC = () => (
    <div className="relative mx-auto h-full w-full max-w-[110px]" role="img" aria-label="Ilustração da câmara borbulhadora">
        <svg viewBox="0 0 160 224" className="absolute inset-0 h-full w-full p-1" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
            <rect x="38" y="6" width="84" height="16" />
            <path d="M46 22h68v186a12 12 0 0 1-12 12H58a12 12 0 0 1-12-12z" />
            <path d="M46 92h68" stroke="#e60000" />
            <path d="M120 200h26M120 180h14" opacity=".45" />
        </svg>
        {[{ l: '38%', s: 9, d: '0s' }, { l: '52%', s: 6, d: '.8s' }, { l: '60%', s: 10, d: '1.6s' }, { l: '44%', s: 5, d: '2.2s' }].map((b) => (
            <span key={b.d} className="vp-bubble" style={{ left: b.l, width: b.s, height: b.s, animationDelay: b.d }} />
        ))}
    </div>
);
