/** SDK do Mercado Pago no navegador: carregado uma vez e compartilhado pelos formulários de cartão. */

export interface MercadoPagoBrick {
    unmount: () => void;
    update?: (data: { amount: number }) => boolean;
}

declare global {
    interface Window {
        /** Device ID do antifraude: o SDK v2 cria ao instanciar o MercadoPago. */
        MP_DEVICE_SESSION_ID?: string;
        MercadoPago?: new (publicKey: string, options?: { locale: string }) => {
            bricks: () => {
                create: (type: 'payment' | 'cardPayment', containerId: string, settings: unknown) => Promise<MercadoPagoBrick>;
            };
        };
    }
}

let sdkLoading: Promise<void> | null = null;
let mercadoPagoWarmed = false;

export function loadMercadoPagoSdk(): Promise<void> {
    if (window.MercadoPago) return Promise.resolve();
    if (!sdkLoading) {
        sdkLoading = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://sdk.mercadopago.com/js/v2';
            script.onload = () => resolve();
            script.onerror = () => {
                // Falhou: a próxima chamada tenta de novo, em vez de repetir a mesma falha.
                sdkLoading = null;
                script.remove();
                reject(new Error('Falha ao carregar o Mercado Pago.'));
            };
            document.head.appendChild(script);
        });
    }
    return sdkLoading;
}

/** O pagamento é a etapa mais lenta: já abre as conexões e baixa o SDK antes de a pessoa chegar nela. */
export function warmUpMercadoPago(): void {
    if (mercadoPagoWarmed) return;
    mercadoPagoWarmed = true;
    for (const [href, crossOrigin] of [['https://http2.mlstatic.com', null], ['https://api.mercadopago.com', 'anonymous']] as const) {
        const link = document.createElement('link');
        link.rel = 'preconnect';
        link.href = href;
        if (crossOrigin) link.crossOrigin = crossOrigin;
        document.head.appendChild(link);
    }
    void loadMercadoPagoSdk().catch(() => undefined);
}

/** Device ID do aparelho para o antifraude do Mercado Pago (vai no header X-meli-session-id). */
export function mercadoPagoDeviceId(): string | undefined {
    const id = window.MP_DEVICE_SESSION_ID;
    return typeof id === 'string' && id ? id : undefined;
}
