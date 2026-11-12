import { formatBRL, roundCents, type VacuumCart } from './vacuumOffer.js';

/**
 * Pagamento combinado da Vacuum Pump: parte no Pix (opcional) e de 1 a 3 cartões.
 * Mesma regra no navegador e no servidor, que recalcula tudo antes de cobrar.
 *
 * A pessoa escolhe quanto do pedido o Pix cobre (`pixValue`) e os cartões cobrem o resto.
 * Sem desconto em nenhuma parte: o desconto do Pix vale só quando o pedido inteiro é pago no Pix,
 * pela opção Pix do checkout (regra do dono, 12/11/2026).
 */

export const COMBO_MAX_CARDS = 3;
/** Parte mínima de cada forma de pagamento: abaixo disso não compensa mais um cartão. */
export const COMBO_MIN_PART = 100;
/** O Mercado Pago pede parcela de pelo menos R$ 5. */
export const COMBO_MIN_INSTALLMENT_VALUE = 5;

export interface ComboCardPlan {
    amount: number;
    installments: number;
}

export interface ComboPlan {
    pixValue: number;
    pixCharge: number;
    pixDiscount: number;
    cards: ComboCardPlan[];
    /** O que a pessoa paga no total: cartões + Pix já com desconto. */
    total: number;
}

/** O projeto compila sem strictNullChecks, então a união discriminada não estreita: plano ou erro. */
export interface ComboCheck {
    plan: ComboPlan | null;
    error: string | null;
}

export function maxInstallmentsFor(amount: number, offerInstallments: number): number {
    return Math.max(1, Math.min(offerInstallments, Math.floor(amount / COMBO_MIN_INSTALLMENT_VALUE)));
}

/** Desconto do Pix na parte que ele cobre. */
/** Sempre zero desde 12/11/2026: o desconto do Pix é só para o pedido inteiro no Pix. */
export function comboPixDiscount(_cart: VacuumCart, _pixValue: number): number {
    return 0;
}

export function checkComboPlan(cart: VacuumCart, offerInstallments: number, pixValueRaw: unknown, cardsRaw: unknown, minPart = COMBO_MIN_PART): ComboCheck {
    const pixValue = roundCents(Math.max(0, Number(pixValueRaw) || 0));
    if (!Array.isArray(cardsRaw) || cardsRaw.length < 1 || cardsRaw.length > COMBO_MAX_CARDS) {
        return { plan: null, error: `Use de 1 a ${COMBO_MAX_CARDS} cartões.` };
    }
    const cards = cardsRaw.map((card: any) => ({
        amount: roundCents(Number(card?.amount) || 0),
        installments: Math.floor(Number(card?.installments) || 0),
    }));
    if (pixValue > 0 ? cards.length < 1 : cards.length < 2) {
        return { plan: null, error: 'Com um cartão só, escolha "Cartão de crédito". Aqui são 2 ou 3 cartões, ou Pix + cartão.' };
    }
    if (pixValue > 0 && pixValue < minPart) {
        return { plan: null, error: `A parte no Pix precisa ser de pelo menos ${formatBRL(minPart)}.` };
    }
    for (const [index, card] of cards.entries()) {
        const label = `Cartão ${index + 1}`;
        if (card.amount < minPart) return { plan: null, error: `${label}: o valor mínimo é ${formatBRL(minPart)}.` };
        const max = maxInstallmentsFor(card.amount, offerInstallments);
        if (card.installments < 1 || card.installments > max) return { plan: null, error: `${label}: até ${max}x para este valor.` };
    }
    const covered = roundCents(pixValue + cards.reduce((sum, card) => sum + card.amount, 0));
    if (Math.abs(covered - cart.total) > 0.009) {
        return { plan: null, error: 'A soma das partes precisa fechar o valor do pedido.' };
    }
    const pixDiscount = comboPixDiscount(cart, pixValue);
    const pixCharge = roundCents(pixValue - pixDiscount);
    return { plan: { pixValue, pixCharge, pixDiscount, cards, total: roundCents(cart.total - pixDiscount) }, error: null };
}

interface DescribablePart {
    id: string | null;
    amount: number;
    installments?: number;
}

/** Texto do pedido e do financeiro: cada parte com valor, parcelas e o id no Mercado Pago. */
export function describeComboParts(record: { pix: DescribablePart | null; cards: DescribablePart[] }): string {
    return [
        ...(record.pix ? [`Pix ${formatBRL(record.pix.amount)} (MP ${record.pix.id})`] : []),
        ...record.cards.map((card, index) => `Cartão ${index + 1} ${formatBRL(card.amount)} em ${card.installments}x (MP ${card.id})`),
    ].join(' + ');
}
