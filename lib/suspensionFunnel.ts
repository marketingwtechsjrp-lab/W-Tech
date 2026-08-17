import type { LPLanguage } from './lpErgonomiaTranslations';

export type SuspensionFunnelAngle = 'controle' | 'ergonomia' | 'tracao';
export type SuspensionFunnelTheme = 'dark' | 'light';
export type SuspensionFunnelFlow = 'vsl_lp' | 'quiz_checkout' | 'direct_lp';

export interface SuspensionFunnelContext {
    angle: SuspensionFunnelAngle;
    theme: SuspensionFunnelTheme;
    flow: SuspensionFunnelFlow;
    isQuiz: boolean;
    profile: string;
    personalized: boolean;
}

export interface SuspensionFunnelCopy {
    label: string;
    titlePart1: string;
    titleHighlight: string;
    subtitle: string;
    vslSubtitle: string;
    continuity: string;
}

const copies: Record<LPLanguage, Record<SuspensionFunnelAngle, SuspensionFunnelCopy>> = {
    'pt-BR': {
        controle: {
            label: 'Controle e confiança Off-Road',
            titlePart1: 'Faça a moto',
            titleHighlight: 'trabalhar com você.',
            subtitle: 'Aprenda a regular SAG, compressão, retorno e ergonomia para ter uma moto previsível em curvas, impactos e mudanças de terreno.',
            vslSubtitle: 'Nesta apresentação, você vai entender por que uma moto imprevisível quase sempre começa por uma base de acerto errada — e como corrigir isso.',
            continuity: 'Etapa 2 de 2 · Seu plano para uma moto previsível',
        },
        ergonomia: {
            label: 'Ergonomia e menos fadiga',
            titlePart1: 'Talvez o seu braço',
            titleHighlight: 'não seja o problema.',
            subtitle: 'Ajuste cockpit, postura e suspensão para reduzir arm pump, absorver menos impacto e pilotar solto por mais tempo.',
            vslSubtitle: 'Nesta apresentação, você vai descobrir como ergonomia e suspensão trabalham juntas para reduzir fadiga sem sacrificar controle.',
            continuity: 'Etapa 2 de 2 · Seu plano para pilotar mais solto',
        },
        tracao: {
            label: 'SAG, cliques e tração',
            titlePart1: 'Potência sem regulagem',
            titleHighlight: 'não vira tração.',
            subtitle: 'Entenda SAG, compressão e retorno para manter a roda no chão e acelerar com controle em areia, pedras e saídas de curva.',
            vslSubtitle: 'Nesta apresentação, você vai ver como SAG e cliques mudam a leitura do terreno, a tração e a confiança para acelerar.',
            continuity: 'Etapa 2 de 2 · Seu plano para ganhar tração',
        },
    },
    'pt-PT': {
        controle: {
            label: 'Controlo e confiança Off-Road',
            titlePart1: 'Faz a mota',
            titleHighlight: 'trabalhar contigo.',
            subtitle: 'Aprende a afinar SAG, compressão, retorno e ergonomia para ter uma mota previsível em curvas, impactos e mudanças de terreno.',
            vslSubtitle: 'Nesta apresentação, vais perceber por que uma mota imprevisível começa quase sempre numa base de afinação errada — e como corrigi-la.',
            continuity: 'Etapa 2 de 2 · O teu plano para uma mota previsível',
        },
        ergonomia: {
            label: 'Ergonomia e menos fadiga',
            titlePart1: 'Talvez o teu braço',
            titleHighlight: 'não seja o problema.',
            subtitle: 'Afina cockpit, postura e suspensão para reduzir arm pump, absorver menos impacto e pilotar solto durante mais tempo.',
            vslSubtitle: 'Nesta apresentação, vais descobrir como ergonomia e suspensão trabalham juntas para reduzir fadiga sem perder controlo.',
            continuity: 'Etapa 2 de 2 · O teu plano para pilotar mais solto',
        },
        tracao: {
            label: 'SAG, cliques e tração',
            titlePart1: 'Potência sem afinação',
            titleHighlight: 'não vira tração.',
            subtitle: 'Entende SAG, compressão e retorno para manter a roda no chão e acelerar com controlo em areia, pedras e saídas de curva.',
            vslSubtitle: 'Nesta apresentação, vais ver como SAG e cliques mudam a leitura do terreno, a tração e a confiança para acelerar.',
            continuity: 'Etapa 2 de 2 · O teu plano para ganhar tração',
        },
    },
    es: {
        controle: {
            label: 'Control y confianza Off-Road',
            titlePart1: 'Haz que la moto',
            titleHighlight: 'trabaje contigo.',
            subtitle: 'Aprende a ajustar SAG, compresión, rebote y ergonomía para lograr una moto predecible en curvas, impactos y cambios de terreno.',
            vslSubtitle: 'En esta presentación entenderás por qué una moto impredecible casi siempre comienza con una mala base de ajuste y cómo corregirla.',
            continuity: 'Etapa 2 de 2 · Tu plan para una moto predecible',
        },
        ergonomia: {
            label: 'Ergonomía y menos fatiga',
            titlePart1: 'Tal vez tu brazo',
            titleHighlight: 'no sea el problema.',
            subtitle: 'Ajusta cockpit, postura y suspensión para reducir arm pump, absorber menos impacto y pilotar suelto durante más tiempo.',
            vslSubtitle: 'En esta presentación descubrirás cómo ergonomía y suspensión trabajan juntas para reducir la fatiga sin perder control.',
            continuity: 'Etapa 2 de 2 · Tu plan para pilotar más suelto',
        },
        tracao: {
            label: 'SAG, clics y tracción',
            titlePart1: 'Potencia sin ajuste',
            titleHighlight: 'no se convierte en tracción.',
            subtitle: 'Entiende SAG, compresión y rebote para mantener la rueda en el suelo y acelerar con control en arena, piedras y salidas de curva.',
            vslSubtitle: 'En esta presentación verás cómo el SAG y los clics cambian la lectura del terreno, la tracción y la confianza para acelerar.',
            continuity: 'Etapa 2 de 2 · Tu plan para ganar tracción',
        },
    },
    en: {
        controle: {
            label: 'Off-Road control and confidence',
            titlePart1: 'Make the bike',
            titleHighlight: 'work with you.',
            subtitle: 'Learn to set sag, compression, rebound and ergonomics for a predictable bike through corners, impacts and changing terrain.',
            vslSubtitle: 'In this presentation, you will learn why an unpredictable bike usually starts with the wrong setup baseline — and how to fix it.',
            continuity: 'Step 2 of 2 · Your plan for a predictable bike',
        },
        ergonomia: {
            label: 'Ergonomics and less fatigue',
            titlePart1: 'Maybe your arms',
            titleHighlight: 'are not the problem.',
            subtitle: 'Set up your cockpit, posture and suspension to reduce arm pump, absorb less impact and ride loose for longer.',
            vslSubtitle: 'In this presentation, you will see how ergonomics and suspension work together to reduce fatigue without giving up control.',
            continuity: 'Step 2 of 2 · Your plan to ride looser',
        },
        tracao: {
            label: 'Sag, clickers and traction',
            titlePart1: 'Power without setup',
            titleHighlight: 'does not become traction.',
            subtitle: 'Understand sag, compression and rebound to keep the wheel planted and accelerate with control in sand, rocks and corner exits.',
            vslSubtitle: 'In this presentation, you will see how sag and clickers change terrain feedback, traction and the confidence to accelerate.',
            continuity: 'Step 2 of 2 · Your plan to gain traction',
        },
    },
};

export const normalizeSuspensionAngle = (value?: string | null): SuspensionFunnelAngle | null => {
    if (value === 'controle' || value === 'ergonomia' || value === 'tracao') return value;
    return null;
};

export const inferSuspensionAngle = (profile?: string | null): SuspensionFunnelAngle => {
    if (profile === 'ergonomia') return 'ergonomia';
    if (profile === 'tracao') return 'tracao';
    return 'controle';
};

export const readSuspensionFunnelContext = (
    theme: SuspensionFunnelTheme,
    search = typeof window === 'undefined' ? '' : window.location.search,
): SuspensionFunnelContext => {
    const params = new URLSearchParams(search);
    const profile = params.get('quiz_profile') || '';
    const isQuiz = params.get('from') === 'quiz';
    const explicitAngle = normalizeSuspensionAngle(params.get('angle'));
    const angle = explicitAngle || inferSuspensionAngle(profile);
    const requestedFlow = params.get('funnel');
    const flow: SuspensionFunnelFlow = isQuiz
        ? 'quiz_checkout'
        : requestedFlow === 'vsl_lp'
            ? 'vsl_lp'
            : 'direct_lp';

    return { angle, theme, flow, isQuiz, profile, personalized: Boolean(explicitAngle || profile) };
};

export const getSuspensionFunnelCopy = (
    language: LPLanguage,
    angle: SuspensionFunnelAngle,
) => copies[language]?.[angle] || copies['pt-BR'][angle];

export const suspensionFunnelEventLabel = (context: SuspensionFunnelContext) =>
    `${context.flow}_${context.angle}_${context.theme}`;

export const buildSuspensionLandingUrl = (
    context: SuspensionFunnelContext,
    search = typeof window === 'undefined' ? '' : window.location.search,
) => {
    const destination = context.theme === 'light'
        ? '/curso-suspensao-piloto-clara'
        : '/curso-suspensao-piloto-completa';
    const params = new URLSearchParams(search);
    const source = context.personalized
        ? `vsl_${context.angle}_${context.theme}`
        : context.theme === 'light'
            ? 'vsl_clara_isolada'
            : 'vsl_obrigatoria';

    params.set('funnel', 'vsl_lp');
    params.set('angle', context.angle);
    params.set('theme', context.theme);
    params.set('src', source);
    if (!params.has('utm_source')) params.set('utm_source', source);

    return `${destination}?${params.toString()}`;
};
