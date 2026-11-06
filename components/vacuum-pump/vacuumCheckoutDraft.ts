/**
 * Rascunho do carrinho, para a pessoa continuar de onde parou.
 *
 * Fica no `localStorage` porque o navegador do Instagram abre uma sessão nova quando a pessoa sai
 * para outro app e volta: quem foi buscar o cartão perdia tudo o que tinha preenchido. Cartão e
 * CPF nunca são guardados aqui. Some na compra e depois de um dia.
 */
const DRAFT_KEY = 'vp_checkout_draft';
const DRAFT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export interface CheckoutDraft {
    checkoutId: string | null;
    contact: { name: string; phone: string; email: string };
    address: { cep: string; street: string; number: string; complement: string; neighborhood: string; city: string; state: string };
    bumps: string[];
    step: 0 | 1 | 2 | 3;
    shippingCode: string | null;
    payMethod: 'card' | 'pix';
}

export function readCheckoutDraft(): CheckoutDraft | null {
    try {
        const saved = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null') as (CheckoutDraft & { at?: number }) | null;
        if (!saved) return null;
        if (Date.now() - Number(saved.at) > DRAFT_MAX_AGE_MS) {
            localStorage.removeItem(DRAFT_KEY);
            return null;
        }
        return saved;
    } catch {
        return null;
    }
}

export function saveCheckoutDraft(draft: CheckoutDraft): void {
    try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...draft, at: Date.now() }));
    } catch {
        /* sem storage: só não continua de onde parou */
    }
}

export function clearCheckoutDraft(): void {
    try {
        localStorage.removeItem(DRAFT_KEY);
    } catch {
        /* sem storage: nada a limpar */
    }
}
