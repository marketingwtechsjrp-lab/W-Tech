import { applyPixDiscount, roundCents, type VacuumOfferState } from './vacuumOffer.js';

/**
 * Modo de teste da Vacuum Pump: link privado (`/maquina-de-vacuo?teste=<token>`, token em
 * `SITE_Config.vacuum_test_token`, lido só pelo servidor) com a máquina a R$ 10, sem adicionais
 * e sem frete, para testar o pagamento de verdade, inclusive o combinado.
 *
 * O checkout de teste usa outra campanha (VACUUM_TEST_CAMPAIGN). Por isso não conta no placar, no
 * lote nem no painel, a varredura não o entrega a vendedor, e a venda não manda WhatsApp, CAPI do
 * Meta nem lançamento no Financeiro. O pedido fica em SITE_Sales com "[TESTE]".
 */

export const VACUUM_TEST_CAMPAIGN = 'vacuum_pump_bf_teste';
export const VACUUM_TEST_PRICE = 10;
/** Com R$ 10 o mínimo normal de R$ 100 por parte não deixaria dividir. */
export const VACUUM_TEST_MIN_PART = 2;

export function isVacuumTestCampaign(campaign: unknown): boolean {
    return campaign === VACUUM_TEST_CAMPAIGN;
}

export function vacuumTestOfferState(state: VacuumOfferState): VacuumOfferState {
    const installments = 2;
    return {
        ...state,
        price: VACUUM_TEST_PRICE,
        compare_at: null,
        regular_price: VACUUM_TEST_PRICE,
        installments,
        installment_value: roundCents(VACUUM_TEST_PRICE / installments),
        regular_installment_value: roundCents(VACUUM_TEST_PRICE / installments),
        pix_price: applyPixDiscount(VACUUM_TEST_PRICE, state.pix_discount_pct),
        bumps: [],
    };
}
