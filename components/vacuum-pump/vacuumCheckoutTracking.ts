import { trackEvent } from '../AnalyticsTracker';
import { isVacuumTest } from './vacuumTestMode';

/**
 * Acompanhamento do checkout da Vacuum Pump, lido no painel ao vivo (`site_vacuum_checkout_health`).
 *
 * Usa categoria própria porque o painel conta tudo de 'Vacuum Pump' como clique. Os eventos saem
 * direto daqui, e não por `data-track`: o React troca o botão de cada etapa antes de o rastreador
 * ler o clique, e o "Continuar" do carrinho quase nunca era registrado. Nunca mandar dado pessoal.
 */
const CATEGORY = 'Vacuum Pump Checkout';
const IN_PROGRESS_KEY = 'vp_checkout_in_progress';
/** Depois disso, voltar à página é uma visita nova, e não uma compra interrompida. */
const IN_PROGRESS_MAX_AGE_MS = 2 * 60 * 60 * 1000;

export type CheckoutStepName = 'cart' | 'contact' | 'delivery' | 'payment';

export type CheckoutProblem =
    | 'screen_error'
    | 'interrupted'
    | 'contact_invalid'
    | 'contact_failed'
    | 'address_invalid'
    | 'address_no_checkout'
    | 'save_failed'
    | 'shipping_failed'
    | 'brick_failed'
    | 'brick_error'
    | 'brick_slow'
    | 'pix_failed'
    | 'combo_failed'
    | 'combo_brick_error'
    | 'combo_brick_failed'
    | 'card_rejected'
    | 'card_failed';

export function trackCheckoutStep(step: CheckoutStepName): void {
    if (isVacuumTest()) return;
    void trackEvent(CATEGORY, `vacuum_step_${step}`);
}

export function trackCheckoutProblem(problem: CheckoutProblem, detail?: unknown): void {
    if (isVacuumTest()) return;
    void trackEvent(CATEGORY, `vacuum_problem_${problem}`, detail ? String(detail).slice(0, 180) : undefined);
}

/** Como a pessoa saiu: fechou o carrinho, saiu da página (outro aplicativo, aba fechada) ou voltou para ela. */
export type CheckoutExit = 'closed' | 'hidden' | 'back';

export interface CheckoutExitInfo {
    step: CheckoutStepName;
    /** Só o nome dos campos completos: quem manda a lista é `vacuumFilledFields`. */
    filled: string[];
    /** O frete que a pessoa viu: gratis, combinar, cotado:350 ou vazio. */
    shipping: string;
}

/** O painel separa o rótulo por `|`, em `site_vacuum_checkout_health`. */
export function trackCheckoutExit(how: CheckoutExit, info: CheckoutExitInfo): void {
    if (isVacuumTest()) return;
    void trackEvent(CATEGORY, `vacuum_exit_${how}`, [info.step, info.filled.join(','), info.shipping].join('|'));
}

/** Guarda a etapa fora da sessão: o navegador do Instagram abre uma sessão nova quando a pessoa sai e volta. */
export function markCheckoutInProgress(step: CheckoutStepName): void {
    try {
        localStorage.setItem(IN_PROGRESS_KEY, JSON.stringify({ step, at: Date.now() }));
    } catch {
        /* sem storage: só deixa de medir a interrupção */
    }
}

export function clearCheckoutInProgress(): void {
    try {
        localStorage.removeItem(IN_PROGRESS_KEY);
    } catch {
        /* sem storage: nada a limpar */
    }
}

/** Ao abrir a página: diz se o carrinho ficou aberto, porque a pessoa saiu ou recarregou no meio da compra. */
export function reportInterruptedCheckout(): boolean {
    try {
        const saved = JSON.parse(localStorage.getItem(IN_PROGRESS_KEY) || 'null') as { step?: string; at?: number } | null;
        if (!saved) return false;
        localStorage.removeItem(IN_PROGRESS_KEY);
        if (Date.now() - Number(saved.at) > IN_PROGRESS_MAX_AGE_MS) return false;
        trackCheckoutProblem('interrupted', saved.step);
        return true;
    } catch {
        /* sem storage ou dado inválido: só deixa de medir a interrupção */
        return false;
    }
}
