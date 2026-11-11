import { roundCents, type VacuumOfferState } from './vacuumOffer.js';

/**
 * Condição privada da Vacuum Pump: link `/maquina-de-vacuo?condicao=<token>`, com o token em
 * `SITE_Config.vacuum_condicao_12x_token` (o padrão `_token` deixa a chave só para o servidor).
 * Máquina + kit adaptador + câmara borbulhadora por R$ 9.328,80 em até 12x sem juros. Pedido do
 * dono em 11/11/2026 para um cliente a quem essa condição foi prometida: o site continua em 10x.
 *
 * É venda de verdade, na mesma campanha: lead, vendedor, lote, financeiro e avisos funcionam como
 * no site. O preço é fechado, por isso não há desconto no Pix nem adicionais para escolher.
 * Apagar a chave desliga o link.
 */

export const VACUUM_PRIVATE_OFFER = 'condicao_12x';
export const VACUUM_PRIVATE_TOKEN_KEY = 'vacuum_condicao_12x_token';
export const VACUUM_PRIVATE_TOTAL = 9328.8;
export const VACUUM_PRIVATE_INSTALLMENTS = 12;
/** Preço cheio do conjunto fora da promoção: R$ 9.990 + R$ 1.040 + R$ 699. */
export const VACUUM_PRIVATE_REFERENCE = 11729;
export const VACUUM_PRIVATE_ITEM_NAME = 'Vacuum Pump Standard W-Tech + Kit Adaptador + Engate Rápido + Câmara Borbulhadora W-Tech (condição 12x)';

export function isVacuumPrivateOffer(checkout: { browser_context?: { private_offer?: unknown } | null } | null | undefined): boolean {
    return checkout?.browser_context?.private_offer === VACUUM_PRIVATE_OFFER;
}

export function vacuumPrivateOfferState(state: VacuumOfferState): VacuumOfferState {
    const installments = VACUUM_PRIVATE_INSTALLMENTS;
    return {
        ...state,
        // A condição foi prometida ao cliente: vale mesmo se a pré-venda do site encerrar.
        phase: 'presale',
        end_reason: null,
        price: VACUUM_PRIVATE_TOTAL,
        compare_at: VACUUM_PRIVATE_REFERENCE,
        regular_price: VACUUM_PRIVATE_REFERENCE,
        installments,
        installment_value: roundCents(VACUUM_PRIVATE_TOTAL / installments),
        regular_installment_value: roundCents(VACUUM_PRIVATE_REFERENCE / installments),
        pix_discount_pct: 0,
        pix_price: VACUUM_PRIVATE_TOTAL,
        bumps: [],
        item_name: VACUUM_PRIVATE_ITEM_NAME,
    };
}
