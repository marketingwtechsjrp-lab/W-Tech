import type { LPLanguage } from './lpErgonomiaTranslations';
import type { CourseSpecialOffer } from './courseOffers';
import { detectBrowserLandingLanguage, fetchGeoLookup } from './geoLanguage';
import { normalizeHotmartCheckoutUrl } from './hotmartCheckout';
import { pushBeginCheckout } from './dataLayer';

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
 *
 * `offer` é a condição especial de remarketing já validada por
 * `resolveCourseSpecialOffer` (ver courseOffers.ts). Ela troca só o checkout do
 * Brasil — e precisa ser a MESMA passada a `getCoursePrice`, para o botão levar
 * ao preço que a página anuncia.
 */
export const getCheckoutUrl = (
    region: BillingRegion,
    hotmartCheckoutUrl?: unknown,
    offer?: CourseSpecialOffer | null,
): string => {
    if (region === 'br') return offer ? offer.checkoutUrl : KIWIFY_CHECKOUT_URL;
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
    /** Aviso de cobrança recorrente, logo abaixo do preço. No Brasil o curso é
     *  um plano anual do Kiwify que renova todo ano, e quem compra precisa saber
     *  disso na página — não descobrir o "/ano" só na tela do checkout. `null`
     *  no internacional: lá `installments`/`cashLabel` já dizem que são 59 € uma
     *  única vez, sem renovação. */
    billingNote: string | null;
    /** Aviso de que a cobrança sai em outra moeda. `null` quando exibição e
     *  cobrança coincidem — inclusive assim que a Hotmart entrar no ar. */
    chargedNotice: string | null;
    /** Valor cru para schema.org. */
    schemaPrice: string;
    schemaCurrency: 'BRL' | 'EUR';
}

/**
 * Valor cru (schema.org e eventos de conversão) a partir das partes exibidas:
 * '197' + ',00' → '197.00'. Ponto de milhar some ('1.297' → '1297.00') e
 * centavos ausentes viram '00'.
 */
export const schemaPriceFromParts = (integer: string, cents: string): string => {
    const reais = integer.replace(/\D/g, '') || '0';
    const centavos = cents.replace(/\D/g, '').padEnd(2, '0').slice(0, 2);
    return `${reais}.${centavos}`;
};

/**
 * Preço em real. Com uma condição especial de remarketing (courseOffers.ts),
 * mudam só os números que o visitante paga agora — valor, parcelamento e, se a
 * condição definir, o preço riscado. Bônus continuam os do produto: o checkout
 * especial vende o mesmo curso, por menos. O aviso do plano anual só muda se a
 * condição trouxer o próprio `billingNote` (1ª cobrança com desconto e
 * renovação pelo preço cheio precisa dizer isso na página).
 */
const brl = (language: LPLanguage, offer?: CourseSpecialOffer | null): CoursePrice => {
    const labels = LABELS[language] || LABELS['pt-BR'];
    const full = offer ? offer.full : 'R$ 347,00';
    const anchor = offer?.anchor ?? 'R$ 997,00';

    return {
        currency: 'BRL',
        symbol: 'R$',
        integer: offer ? offer.integer : '347',
        cents: offer ? offer.cents : ',00',
        full,
        anchor,
        bonusValue: 'R$ 997,00',
        bonusItems: ['R$ 397,00', 'R$ 257,00', 'R$ 197,00', 'R$ 146,00'],
        installments: offer ? offer.installments : '12x de R$ 35,89 no cartão',
        installmentsShort: offer ? offer.installmentsShort : '12x R$ 35,89',
        strikeLabel: labels.strike(anchor),
        cashLabel: labels.cash(full),
        bonusSubLabel: labels.bonusSub('R$ 997,00'),
        billingNote: offer?.billingNote ?? labels.annualPlan,
        chargedNotice: null,
        schemaPrice: offer ? schemaPriceFromParts(offer.integer, offer.cents) : '347.00',
        schemaCurrency: 'BRL',
    };
};

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
    /** Aviso do plano anual renovável do Kiwify — só existe na cobrança em real.
     *  Sem "renovação automática": desde 28/09/2026 o Pix Automático está
     *  desligado no produto, e quem paga por Pix renova com um novo pagamento. */
    annualPlan: string;
}> = {
    'pt-BR': {
        strike: (v) => `De ${v} por`,
        cash: (v) => `ou apenas ${v} à vista`,
        singlePayment: (v) => `Pagamento único de ${v} · sem renovação`,
        singlePaymentShort: 'Pagamento único · sem renovação',
        bonusSub: (v) => `Mais de ${v} em Planilhas e Material Complementar Grátis.`,
        annualPlan: 'Plano anual: renova todo ano até você cancelar. Pague no cartão em até 12x ou no Pix.',
    },
    'pt-PT': {
        strike: (v) => `De ${v} por`,
        cash: (v) => `ou apenas ${v} a pronto`,
        singlePayment: (v) => `Pagamento único de ${v} · sem renovação`,
        singlePaymentShort: 'Pagamento único · sem renovação',
        bonusSub: (v) => `Mais de ${v} em Planilhas e Material Complementar Grátis.`,
        annualPlan: 'Plano anual: renova todos os anos até cancelar. Pague com cartão em até 12x ou com Pix.',
    },
    es: {
        strike: (v) => `De ${v} por`,
        cash: (v) => `o solo ${v} pago único`,
        singlePayment: (v) => `Pago único de ${v} · sin renovación`,
        singlePaymentShort: 'Pago único · sin renovación',
        bonusSub: (v) => `Más de ${v} en Materiales Complementarios Gratis.`,
        annualPlan: 'Plan anual: se renueva cada año hasta que lo canceles. Paga con tarjeta en hasta 12 cuotas o con Pix.',
    },
    en: {
        strike: (v) => `Regular price ${v}`,
        cash: (v) => `or a single payment of ${v}`,
        singlePayment: (v) => `One-time payment of ${v} · no renewal`,
        singlePaymentShort: 'One-time payment · no renewal',
        bonusSub: (v) => `Over ${v} in Free Worksheets and Complementary Tools.`,
        annualPlan: 'Annual plan: renews every year until you cancel. Pay by card in up to 12 installments or with Pix.',
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
        billingNote: null,
        chargedNotice: null,
        schemaPrice: '59.00',
        schemaCurrency: 'EUR',
    };
};

/**
 * `region` manda na moeda; `language` só escolhe o idioma dos textos. O checkout
 * internacional tem um fallback oficial da Hotmart, então preço e destino já
 * nascem em euro mesmo durante a leitura assíncrona da configuração.
 *
 * `offer` (condição especial validada, ver courseOffers.ts) só afeta o real: um
 * visitante internacional continua vendo 59 € mesmo com `?oferta=` na URL.
 */
export const getCoursePrice = (
    region: BillingRegion,
    language: LPLanguage,
    _hotmartCheckoutUrl?: unknown,
    offer?: CourseSpecialOffer | null,
): CoursePrice => {
    if (region === 'br') return brl(language, offer);
    return eur(language);
};

/** Nome do produto nos eventos de conversão (GA4 `item_name`, Google Ads, Meta). */
export const COURSE_CONVERSION_ITEM = 'Curso Online de Suspensão para Piloto';

/**
 * Publica `begin_checkout` no dataLayer ao sair para o Kiwify/Hotmart. Uma única
 * função para as cinco variantes da LP e para a VSL — valor e moeda saem da
 * mesma tabela de preço que a página exibe, nunca de um número cravado no JSX.
 * Com condição especial ativa, o valor é o da condição: é o que o checkout vai
 * cobrar, e é esse número que segue para GA4, Google Ads e Meta.
 */
export const trackCourseCheckoutStart = (
    region: BillingRegion,
    language: LPLanguage = 'pt-BR',
    offer?: CourseSpecialOffer | null,
): void => {
    const price = getCoursePrice(region, language, undefined, offer);
    const provider = region === 'br' ? 'kiwify' : 'hotmart';
    pushBeginCheckout({
        funnel: 'curso_online_piloto',
        item_name: COURSE_CONVERSION_ITEM,
        value: Number(price.schemaPrice),
        currency: price.schemaCurrency,
        provider,
    });
    // A página de obrigado (/obrigado-suspensao) só conta a compra se a sessão
    // passou por aqui — visita direta ou robô não vira conversão.
    try {
        sessionStorage.setItem(COURSE_CHECKOUT_FLAG, provider);
    } catch {
        /* sem storage: a página de obrigado ainda aceita o referrer do checkout */
    }
};

export const COURSE_CHECKOUT_FLAG = 'wtech_course_checkout_started';

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
