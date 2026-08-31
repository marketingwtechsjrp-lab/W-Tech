import type { LPLanguage } from './lpErgonomiaTranslations';
import { detectBrowserLandingLanguage, fetchGeoLookup } from './geoLanguage';
import { normalizeHotmartCheckoutUrl } from './hotmartCheckout';

export { normalizeHotmartCheckoutUrl } from './hotmartCheckout';

/**
 * Fonte única de verdade do preço e do checkout do Curso Online de Suspensão.
 *
 * Duas decisões independentes vivem aqui, e misturá-las já custou dinheiro:
 *
 *  - **Idioma do texto** vem do seletor PT/ES/EN/BR (preferência de leitura).
 *  - **Região de cobrança** vem do país por IP (`/api/geo-language`), porque
 *    moeda e meio de pagamento dependem de onde a pessoa está, não do idioma
 *    que ela escolheu ler. Um brasileiro lendo em inglês paga em real; um
 *    português lendo em português do Brasil paga em euro.
 *
 * Antes deste módulo cada landing page carregava o próprio número cravado no
 * JSX — foi assim que a V2 acabou no ar a R$ 267 enquanto as outras vendiam a
 * R$ 347, apontando inclusive para outro produto do Kiwify.
 */

/** Brasil cobra em real pelo Kiwify; o resto do mundo, em euro pela Hotmart. */
export type BillingRegion = 'br' | 'intl';

export const KIWIFY_CHECKOUT_URL = 'https://pay.kiwify.com.br/19v4nIa';
export const HOTMART_CHECKOUT_FALLBACK_URL = 'https://pay.hotmart.com/Q107251292B?off=l2pjqk7m';
const LEGACY_HOTMART_ANNUAL_CHECKOUT_URL = 'https://pay.hotmart.com/Q107251292B';

/**
 * O link Hotmart vem da chave pública `hotmart_checkout_url` em SITE_Config.
 * O checkout oficial conhecido fica como fallback público para que um visitante
 * internacional nunca seja enviado à oferta brasileira enquanto a leitura
 * assíncrona da configuração termina ou falha.
 */
export const getCheckoutUrl = (region: BillingRegion, hotmartCheckoutUrl?: unknown): string => {
    if (region === 'br') return KIWIFY_CHECKOUT_URL;
    const validatedHotmartUrl = normalizeHotmartCheckoutUrl(hotmartCheckoutUrl);
    // Migração defensiva: a configuração antiga aponta para uma assinatura
    // anual renovável. Mesmo que o cache do banco ainda a devolva, visitantes
    // internacionais seguem para a nova oferta de cobrança única.
    if (validatedHotmartUrl === LEGACY_HOTMART_ANNUAL_CHECKOUT_URL) {
        return HOTMART_CHECKOUT_FALLBACK_URL;
    }
    return validatedHotmartUrl || HOTMART_CHECKOUT_FALLBACK_URL;
};

/** Base legada para chamadas que ainda não conhecem região. */
export const COURSE_CHECKOUT_URL = KIWIFY_CHECKOUT_URL;

export interface CoursePrice {
    currency: 'BRL' | 'EUR';
    /** Símbolo isolado, para layouts que o renderizam em tamanho próprio. */
    symbol: string;
    /** Parte inteira do valor à vista — ex.: '347'. */
    integer: string;
    /** Centavos já com separador — ex.: ',00'. */
    cents: string;
    /** Valor à vista completo — ex.: 'R$ 347,00'. */
    full: string;
    /** Preço de ancoragem riscado — ex.: 'R$ 997,00'. */
    anchor: string;
    /** Valor declarado do material bônus. NÃO confundir com `anchor`: em real
     *  os dois coincidem (997), em euro não (179 de âncora, 150 de bônus). */
    bonusValue: string;
    /** Valor riscado de cada item do material bônus, na ordem em que a página os
     *  lista (SAG, PSI, Óleos, Molas). A soma bate com `bonusValue`. */
    bonusItems: [string, string, string, string];
    /** Condição de pagamento por extenso. No Brasil descreve o parcelamento;
     *  no internacional deixa explícito que são 59 € uma única vez. */
    installments: string;
    /** Condição compacta para destaques e barra fixa — ex.: '12x R$ 35,89'. */
    installmentsShort: string;
    /** 'De R$ 997,00 por' / 'De 179 € por' — texto no idioma, número na região. */
    strikeLabel: string;
    /** 'ou apenas R$ 347,00 à vista' */
    cashLabel: string;
    /** 'Mais de R$ 997,00 em Planilhas e Material Complementar Grátis.' */
    bonusSubLabel: string;
    /** Aviso de que a cobrança sai em outra moeda. `null` quando exibição e
     *  cobrança coincidem — inclusive assim que a Hotmart entrar no ar. */
    chargedNotice: string | null;
    /** Valor cru para schema.org. */
    schemaPrice: string;
    schemaCurrency: 'BRL' | 'EUR';
}

const brl = (language: LPLanguage): CoursePrice => ({
    currency: 'BRL',
    symbol: 'R$',
    integer: '347',
    cents: ',00',
    full: 'R$ 347,00',
    anchor: 'R$ 997,00',
    bonusValue: 'R$ 997,00',
    bonusItems: ['R$ 397,00', 'R$ 257,00', 'R$ 197,00', 'R$ 146,00'],
    installments: '12x de R$ 35,89 no cartão',
    installmentsShort: '12x R$ 35,89',
    strikeLabel: (LABELS[language] || LABELS['pt-BR']).strike('R$ 997,00'),
    cashLabel: (LABELS[language] || LABELS['pt-BR']).cash('R$ 347,00'),
    bonusSubLabel: (LABELS[language] || LABELS['pt-BR']).bonusSub('R$ 997,00'),
    chargedNotice: null,
    schemaPrice: '347.00',
    schemaCurrency: 'BRL',
});

/**
 * Textos que emolduram os números. O idioma escolhe a frase; a região escolhe o
 * valor que entra nela. É a separação que impede um português lendo em pt-BR de
 * ver "12x R$ 35,89" ao lado de bônus em euro.
 */
const LABELS: Record<LPLanguage, {
    strike: (v: string) => string;
    cash: (v: string) => string;
    singlePayment: (v: string) => string;
    singlePaymentShort: string;
    bonusSub: (v: string) => string;
}> = {
    'pt-BR': {
        strike: (v) => `De ${v} por`,
        cash: (v) => `ou apenas ${v} à vista`,
        singlePayment: (v) => `Pagamento único de ${v} · sem renovação`,
        singlePaymentShort: 'Pagamento único · sem renovação',
        bonusSub: (v) => `Mais de ${v} em Planilhas e Material Complementar Grátis.`,
    },
    'pt-PT': {
        strike: (v) => `De ${v} por`,
        cash: (v) => `ou apenas ${v} a pronto`,
        singlePayment: (v) => `Pagamento único de ${v} · sem renovação`,
        singlePaymentShort: 'Pagamento único · sem renovação',
        bonusSub: (v) => `Mais de ${v} em Planilhas e Material Complementar Grátis.`,
    },
    es: {
        strike: (v) => `De ${v} por`,
        cash: (v) => `o solo ${v} pago único`,
        singlePayment: (v) => `Pago único de ${v} · sin renovación`,
        singlePaymentShort: 'Pago único · sin renovación',
        bonusSub: (v) => `Más de ${v} en Materiales Complementarios Gratis.`,
    },
    en: {
        strike: (v) => `Regular price ${v}`,
        cash: (v) => `or a single payment of ${v}`,
        singlePayment: (v) => `One-time payment of ${v} · no renewal`,
        singlePaymentShort: 'One-time payment · no renewal',
        bonusSub: (v) => `Over ${v} in Free Worksheets and Complementary Tools.`,
    },
};

const eur = (language: LPLanguage): CoursePrice => {
    const labels = LABELS[language] || LABELS.en;

    return {
        currency: 'EUR',
        symbol: '€',
        integer: '59',
        cents: ',00',
        full: '59 €',
        anchor: '179 €',
        bonusValue: '150 €',
        bonusItems: ['60 €', '39 €', '30 €', '21 €'],
        installments: labels.singlePaymentShort,
        installmentsShort: '59 €',
        strikeLabel: labels.strike('179 €'),
        cashLabel: labels.singlePayment('59 €'),
        bonusSubLabel: labels.bonusSub('150 €'),
        chargedNotice: null,
        schemaPrice: '59.00',
        schemaCurrency: 'EUR',
    };
};

/**
 * `region` manda na moeda; `language` só escolhe o idioma dos textos. O checkout
 * internacional tem um fallback oficial da Hotmart, então preço e destino já
 * nascem em euro mesmo durante a leitura assíncrona da configuração.
 */
export const getCoursePrice = (
    region: BillingRegion,
    language: LPLanguage,
    _hotmartCheckoutUrl?: unknown,
): CoursePrice => {
    if (region === 'br') return brl(language);
    return eur(language);
};

export const regionFromCountry = (country?: string | null): BillingRegion =>
    country?.trim().toUpperCase() === 'BR' ? 'br' : 'intl';

/** Permite forçar a região em QA e em teste automatizado: ?regiao=br | ?regiao=intl */
export const getExplicitBillingRegion = (): BillingRegion | null => {
    if (typeof window === 'undefined') return null;
    const value = new URLSearchParams(window.location.search).get('regiao');
    return value === 'br' || value === 'intl' ? value : null;
};

/**
 * Palpite síncrono para a primeira renderização, antes de o IP responder.
 * Usa fuso horário e idioma do navegador — o seletor manual não entra aqui,
 * porque ele diz o que a pessoa quer ler, não onde ela está.
 */
export const guessBillingRegion = (): BillingRegion =>
    getExplicitBillingRegion() ?? (detectBrowserLandingLanguage() === 'pt-BR' ? 'br' : 'intl');

/**
 * Região definitiva, por IP. Cai no palpite do navegador se a consulta falhar
 * (bloqueador, API fora do ar), então o checkout nunca fica sem destino.
 */
export const detectBillingRegion = async (): Promise<BillingRegion> => {
    const explicit = getExplicitBillingRegion();
    if (explicit) return explicit;

    const { country } = await fetchGeoLookup();
    return country ? regionFromCountry(country) : guessBillingRegion();
};
