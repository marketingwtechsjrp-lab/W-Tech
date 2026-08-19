import type { LPLanguage } from './lpErgonomiaTranslations';

/**
 * Fonte única de verdade do preço do Curso Online de Suspensão.
 *
 * Antes deste módulo cada landing page carregava o próprio número cravado no
 * JSX — foi assim que a V2 acabou no ar a R$ 267 enquanto as outras vendiam a
 * R$ 347, apontando inclusive para outro produto do Kiwify. Qualquer reajuste
 * agora acontece só aqui.
 *
 * ATENÇÃO — o checkout do Kiwify cobra SEMPRE em real e exige CPF/CNPJ. Os
 * valores em euro são conversão de referência para o público europeu, por isso
 * vêm sempre acompanhados de `chargedNotice`, que avisa em que moeda a cobrança
 * realmente acontece. Enquanto não existir um checkout em euro, nenhuma página
 * deve exibir preço em euro sem esse aviso.
 */

export const COURSE_CHECKOUT_URL = 'https://pay.kiwify.com.br/19v4nIa';

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
    /** Parcelamento por extenso — ex.: '12x de R$ 34,70 no cartão'. */
    installments: string;
    /** Parcelamento compacto para barra fixa — ex.: '12x R$ 34,70'. */
    installmentsShort: string;
    /** Aviso da moeda de cobrança. `null` quando exibição e cobrança coincidem. */
    chargedNotice: string | null;
    /** Valor cru para schema.org. */
    schemaPrice: string;
    /** Moeda cobrada de fato — sempre BRL enquanto o checkout for o Kiwify BR. */
    schemaCurrency: 'BRL';
}

const BRL: CoursePrice = {
    currency: 'BRL',
    symbol: 'R$',
    integer: '347',
    cents: ',00',
    full: 'R$ 347,00',
    anchor: 'R$ 997,00',
    bonusValue: 'R$ 997,00',
    bonusItems: ['R$ 397,00', 'R$ 257,00', 'R$ 197,00', 'R$ 146,00'],
    installments: '12x de R$ 34,70 no cartão',
    installmentsShort: '12x R$ 34,70',
    chargedNotice: null,
    schemaPrice: '347.00',
    schemaCurrency: 'BRL',
};

/**
 * Preço europeu de referência. O `chargedNotice` é obrigatório aqui: o pagamento
 * cai no mesmo checkout brasileiro, em real.
 */
const eur = (chargedNotice: string): CoursePrice => ({
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
    chargedNotice,
    schemaPrice: '347.00',
    schemaCurrency: 'BRL',
});

const PRICES: Record<LPLanguage, CoursePrice> = {
    'pt-BR': BRL,
    'pt-PT': eur('Valor de referência. A cobrança é processada em reais (R$ 347,00) pelo checkout Kiwify.'),
    es: eur('Importe de referencia. El cobro se procesa en reales (R$ 347,00) en el checkout de Kiwify.'),
    en: eur('Reference amount. Payment is charged in Brazilian reais (R$ 347.00) at the Kiwify checkout.'),
};

export const getCoursePrice = (language: LPLanguage): CoursePrice => PRICES[language] || BRL;
