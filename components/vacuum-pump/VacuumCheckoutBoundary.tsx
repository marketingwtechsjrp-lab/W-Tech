import React from 'react';
import { trackEvent } from '../AnalyticsTracker';

interface Props {
    sellerHref: string;
    onClose: () => void;
    children: React.ReactNode;
}

/**
 * O site não tem outra proteção contra erro de tela: sem esta, uma falha dentro do carrinho apaga
 * a página inteira, e o clique nem chega ao painel. Aqui a pessoa continua com um caminho para
 * comprar, e o erro fica registrado no painel.
 */
class VacuumCheckoutBoundary extends React.Component<Props, { failed: boolean }> {
    state = { failed: false };

    static getDerivedStateFromError() {
        return { failed: true };
    }

    componentDidCatch(error: Error) {
        console.error('[Vacuum] Erro no carrinho:', error);
        void trackEvent('Vacuum Pump', 'vacuum_checkout_error', String(error?.message).slice(0, 200));
    }

    render() {
        if (!this.state.failed) return this.props.children;
        return (
            <div className="vp-root fixed inset-0 z-[100] grid place-items-center overflow-y-auto p-4" role="alertdialog" aria-modal="true" aria-labelledby="vp-cart-failed">
                <div className="vp-plate w-full max-w-md p-5 text-center">
                    <h2 id="vp-cart-failed" className="vp-display text-3xl">Não foi possível abrir o carrinho</h2>
                    <p className="mt-2 text-sm vp-muted">Um vendedor conclui a sua compra pelo WhatsApp.</p>
                    <a className="vp-btn mt-4 w-full" href={this.props.sellerHref} target="_blank" rel="noreferrer" data-track="vacuum_checkout_error_whatsapp" data-track-category="Vacuum Pump">Comprar pelo WhatsApp</a>
                    <button type="button" className="vp-link mt-3 text-sm" onClick={this.props.onClose}>Voltar para a página</button>
                </div>
            </div>
        );
    }
}

export default VacuumCheckoutBoundary;
