/** Eventos do navegador; separado de googleAnalytics.ts (relatorios do admin). */
let measurementId = 'G-T4WSVZ57J0';

export const configureGoogleTracking = (candidate?: string): void => {
  if (candidate && /^G-[A-Z0-9]+$/.test(candidate)) measurementId = candidate;
};

export const trackGoogleEvent = (name: string, params: Record<string, unknown> = {}): void => {
  if (typeof window === 'undefined') return;
  try {
    const target = window as unknown as {
      dataLayer?: unknown[];
      gtag?: (...args: unknown[]) => void;
    };
    target.dataLayer = target.dataLayer || [];
    // gtag utiliza Arguments, nao um objeto de gatilho customizado do GTM.
    const gtag = target.gtag || function (..._args: unknown[]) {
      target.dataLayer!.push(arguments);
    };
    // A tag carregada pelo GTM usa noTargetGroup: destino explicito e necessario
    // para eventos da aplicacao, sem reinjetar gtag/config e duplicar PageView.
    gtag('event', name, { ...params, send_to: measurementId });
  } catch {
    // Analytics nao interfere na navegacao nem no salvamento do contato.
  }
};
