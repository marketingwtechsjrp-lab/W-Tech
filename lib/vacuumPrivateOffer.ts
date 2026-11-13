import { roundCents, type VacuumOfferState } from './vacuumOffer.js';

/**
 * Condições privadas da Vacuum Pump: link `/maquina-de-vacuo?condicao=<token>`. Cada condição tem o
 * próprio token em `SITE_Config.<token_key>` (o padrão `_token` deixa a chave só para o servidor), e
 * o servidor descobre qual é pela chave que bate. Apagar a chave desliga aquele link.
 *
 * É venda de verdade, na mesma campanha: lead, vendedor, lote, financeiro e avisos funcionam como
 * no site. O preço é fechado, por isso não há desconto no Pix nem adicionais para escolher.
 */

export interface VacuumPrivateOffer {
    id: string;
    token_key: string;
    /** Valor cobrado no site. */
    total: number;
    installments: number;
    /** Preço cheio do conjunto, riscado na tela. */
    reference: number;
    item_name: string;
    /** Só cartão: sem Pix e sem pagamento combinado. */
    card_only?: boolean;
    /** Entrada já paga por fora (Pix), mostrada ao cliente e descontada do valor fechado. */
    prepaid?: number;
    /** Frase de destaque na página da oferta. */
    headline: string;
}

/** Preço cheio do conjunto fora da promoção: R$ 9.990 + R$ 1.040 + R$ 699. */
const FULL_SET_REFERENCE = 11729;
const FULL_SET = 'Vacuum Pump Standard W-Tech + Kit Adaptador + Engate Rápido + Câmara Borbulhadora W-Tech';

export const VACUUM_PRIVATE_OFFERS: readonly VacuumPrivateOffer[] = [
    {
        // Pedido do dono em 11/11/2026, para um cliente a quem essa condição foi prometida.
        id: 'condicao_12x',
        token_key: 'vacuum_condicao_12x_token',
        total: 9328.8,
        installments: 12,
        reference: FULL_SET_REFERENCE,
        item_name: `${FULL_SET} (condição 12x)`,
        headline: 'Condição especial para você: máquina + Kit Adaptador com Engate Rápido + Câmara Borbulhadora, em até 12x sem juros.',
    },
    {
        // Pedido do dono em 13/11/2026: conjunto fechado em R$ 9.729,00, entrada de R$ 1.945,80 já
        // recebida no Pix, saldo de R$ 7.783,20 em até 10x no cartão.
        id: 'saldo_entrada_pix',
        token_key: 'vacuum_saldo_entrada_token',
        total: 7783.2,
        installments: 10,
        reference: FULL_SET_REFERENCE,
        item_name: `${FULL_SET} (saldo após entrada Pix de R$ 1.945,80; total R$ 9.729,00)`,
        card_only: true,
        prepaid: 1945.8,
        headline: 'Condição especial para você: máquina + Kit Adaptador com Engate Rápido + Câmara Borbulhadora por R$ 9.729,00. Entrada de R$ 1.945,80 no Pix já recebida: falta o saldo de R$ 7.783,20 em até 10x sem juros no cartão.',
    },
];

export function findVacuumPrivateOffer(id: unknown): VacuumPrivateOffer | null {
    return VACUUM_PRIVATE_OFFERS.find((offer) => offer.id === id) ?? null;
}

/** Condição gravada no checkout, ou null se for compra normal. */
export function checkoutPrivateOffer(checkout: { browser_context?: { private_offer?: unknown } | null } | null | undefined): VacuumPrivateOffer | null {
    return findVacuumPrivateOffer(checkout?.browser_context?.private_offer);
}

export interface VacuumPrivateOfferState extends VacuumOfferState {
    private_offer: true;
    private_headline: string;
    card_only?: boolean;
    prepaid?: number;
}

export function vacuumPrivateOfferState(state: VacuumOfferState, offer: VacuumPrivateOffer): VacuumPrivateOfferState {
    // O preço riscado é o do conjunto menos a entrada, para comparar com o que falta pagar.
    const reference = roundCents(offer.reference - (offer.prepaid ?? 0));
    return {
        ...state,
        // A condição foi prometida ao cliente: vale mesmo se a pré-venda do site encerrar.
        phase: 'presale',
        end_reason: null,
        price: offer.total,
        compare_at: reference,
        regular_price: reference,
        installments: offer.installments,
        installment_value: roundCents(offer.total / offer.installments),
        regular_installment_value: roundCents(reference / offer.installments),
        pix_discount_pct: 0,
        pix_price: offer.total,
        bumps: [],
        item_name: offer.item_name,
        private_offer: true,
        private_headline: offer.headline,
        ...(offer.card_only ? { card_only: true } : {}),
        ...(offer.prepaid ? { prepaid: offer.prepaid } : {}),
    };
}
