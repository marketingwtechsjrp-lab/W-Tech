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

/**
 * O link Hotmart vem da chave pública `hotmart_checkout_url` em SITE_Config.
 * Ausência, falha de leitura ou valor inválido preservam o fallback Kiwify.
 */
export const getCheckoutUrl = (region: BillingRegion, hotmartCheckoutUrl?: unknown): string => {
    const validatedHotmartUrl = normalizeHotmartCheckoutUrl(hotmartCheckoutUrl);
    return region === 'intl' && validatedHotmartUrl ? validatedHotmartUrl : KIWIFY_CHECKOUT_URL;
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
    /** Parcelamento por extenso, exatamente como o checkout cobra — ex.:
     *  '12x de R$ 35,89 no cartão'. O total parcelado é maior que o à vista
     *  porque o Kiwify aplica juros; anunciar 347/12 seria propaganda enganosa. */
    installments: string;
    /** Parcelamento compacto para barra fixa — ex.: '12x R$ 35,89'. */
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
const LABELS: Record<LPLanguage, { strike: (v: string) => string; cash: (v: string) => string; bonusSub: (v: string) => string }> = {
    'pt-BR': {
        strike: (v) => `De ${v} por`,
        cash: (v) => `ou apenas ${v} à vista`,
        bonusSub: (v) => `Mais de ${v} em Planilhas e Material Complementar Grátis.`,
    },
    'pt-PT': {
        strike: (v) => `De ${v} por`,
        cash: (v) => `ou apenas ${v} a pronto`,
        bonusSub: (v) => `Mais de ${v} em Planilhas e Material Complementar Grátis.`,
    },
    es: {
        strike: (v) => `De ${v} por`,
        cash: (v) => `o solo ${v} pago único`,
        bonusSub: (v) => `Más de ${v} en Materiales Complementarios Gratis.`,
    },
    en: {
        strike: (v) => `Regular price ${v}`,
        cash: (v) => `or a single payment of ${v}`,
        bonusSub: (v) => `Over ${v} in Free Worksheets and Complementary Tools.`,
    },
};

/** Aviso exibido só enquanto o checkout internacional ainda for o Kiwify. */
const FALLBACK_NOTICE: Record<LPLanguage, string> = {
    'pt-BR': 'Valor de referência. A cobrança é processada em reais (R$ 347,00) pelo checkout Kiwify.',
    'pt-PT': 'Valor de referência. A cobrança é processada em reais (R$ 347,00) pelo checkout Kiwify.',
    es: 'Importe de referencia. El cobro se procesa en reales (R$ 347,00) en el checkout de Kiwify.',
    en: 'Reference amount. Payment is charged in Brazilian reais (R$ 347.00) at the Kiwify checkout.',
};

const eur = (language: LPLanguage, internationalCheckoutReady: boolean): CoursePrice => ({
    currency: 'EUR',
    symbol: '€',
    integer: '59',
    cents: ',00',
    full: '59 €',
    anchor: '179 €',
    bonusValue: '150 €',
    bonusItems: ['60 €', '39 €', '30 €', '21 €'],
    installments: '12x de 5,90 € no cartão',
    installmentsShort: '12x 5,90 €',
    strikeLabel: (LABELS[language] || LABELS.en).strike('179 €'),
    cashLabel: (LABELS[language] || LABELS.en).cash('59 €'),
    bonusSubLabel: (LABELS[language] || LABELS.en).bonusSub('150 €'),
    chargedNotice: internationalCheckoutReady ? null : (FALLBACK_NOTICE[language] || FALLBACK_NOTICE.en),
    schemaPrice: internationalCheckoutReady ? '59.00' : '347.00',
    schemaCurrency: internationalCheckoutReady ? 'EUR' : 'BRL',
});

/**
 * `region` manda na moeda; `language` só escolhe o idioma dos avisos. O mesmo
 * link validado que define o CTA define a moeda estruturada, evitando que preço
 * e destino entrem em estados diferentes durante a leitura assíncrona.
 */
export const getCoursePrice = (
    region: BillingRegion,
    language: LPLanguage,
    hotmartCheckoutUrl?: unknown,
): CoursePrice => {
    if (region === 'br') return brl(language);
    return eur(language, normalizeHotmartCheckoutUrl(hotmartCheckoutUrl) !== null);
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
