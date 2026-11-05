import React from 'react';
import { Plus } from 'lucide-react';

const BASE = '/images/vacuum-pump';
const FOTOS = `${BASE}/fotos`;

/** Fotos reais da máquina, com fundo de estúdio. Só a vista interna ainda vem do modelo 3D. */
export const VACUUM_IMAGES = {
    front: `${FOTOS}/frente.webp`,
    frontSm: `${FOTOS}/frente-sm.webp`,
    rear: `${FOTOS}/traseira.webp`,
    rearSm: `${FOTOS}/traseira-sm.webp`,
    sideAir: `${FOTOS}/lateral-ar.webp`,
    sideAirSm: `${FOTOS}/lateral-ar-sm.webp`,
    sideVent: `${FOTOS}/lateral-grade.webp`,
    sideVentSm: `${FOTOS}/lateral-grade-sm.webp`,
    inside: `${BASE}/machine-inside.webp?v=2`,
    insideSm: `${BASE}/machine-inside-sm.webp?v=2`,
    square: `${FOTOS}/quadrada.webp`,
    band: `${FOTOS}/faixa.webp`,
    bandMobile: `${FOTOS}/faixa-mobile.webp`,
};

/** Closes das fotos reais: `tall` ocupa duas linhas da grade. */
export const VACUUM_DETAILS = [
    { src: `${FOTOS}/visor.webp`, title: 'Visor de nível', text: 'MAX e MIN à vista, sem abrir o gabinete.', tall: true },
    { src: `${FOTOS}/manometro.webp`, title: 'Medidor com glicerina', text: 'Pressão positiva e vácuo, com ponteiro estável.', tall: false },
    { src: `${FOTOS}/seletor.webp`, title: 'Seletor de pressão e vácuo', text: 'Um comando só, com ajuste de estabilização.', tall: false },
    { src: `${FOTOS}/filtro.webp`, title: 'Filtragem externa', text: 'O filtro fica por fora, na traseira.', tall: true },
    { src: `${FOTOS}/cooler.webp`, title: 'Arrefecimento por cooler', text: 'Cooler na traseira para refrigerar a máquina.', tall: false },
    { src: `${FOTOS}/medidor-ar.webp`, title: 'Medidor de entrada de ar', text: 'Na lateral, junto da entrada de ar.', tall: false },
];

export const VACUUM_VIDEO = {
    src: '/videos/vacuum-pump/vacuum-pump-bf.mp4?v=2',
    srcSm: '/videos/vacuum-pump/vacuum-pump-bf-720.mp4?v=2',
    poster: '/videos/vacuum-pump/poster.webp?v=2',
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

/** Máquina + acessório, como no "compre junto" das lojas: mostra o que entra na compra. */
export const ComboImage: React.FC<{ items: { name: string; image: string | null }[]; small?: boolean }> = ({ items, small }) => (
    <span className={`vp-combo ${small ? 'vp-combo-sm' : ''}`}>
        <span className="vp-combo-item vp-combo-photo">
            <img src={VACUUM_IMAGES.square} alt="Vacuum Pump Standard" width={240} height={240} loading="lazy" />
        </span>
        {items.map((item) => (
            <React.Fragment key={item.name}>
                <span className="vp-combo-plus" aria-label="mais"><Plus size={small ? 14 : 17} strokeWidth={3} aria-hidden /></span>
                <span className="vp-combo-item">
                    {item.image ? <img src={item.image} alt={item.name} width={160} height={160} loading="lazy" /> : <BubbleChamber />}
                </span>
            </React.Fragment>
        ))}
    </span>
);
