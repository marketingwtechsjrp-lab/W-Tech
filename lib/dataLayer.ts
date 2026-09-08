import { stripAutoDirectTracking } from './tracking';
import { PUBLIC_BASE_URL } from './publicUrl';

/**
 * Ponte única entre o app e o Google Tag Manager.
 *
 * O GA4 (G-T4WSVZ57J0) sobe DENTRO do sandbox do GTM, servido pelo domínio
 * first-party. Isso significa que `window.gtag` não existe na página — e o
 * código que dependia dele (`if (window.gtag) …`) nunca rodou:
 *
 *   - nenhum evento de clique `data-track` chegou ao GA4;
 *   - navegação entre rotas não gerava `page_view`, então o GA4 registrava
 *     UMA página por sessão, por mais que o visitante navegasse.
 *
 * O caminho que funciona é o dataLayer: o GTM escuta, e as tags do container
 * traduzem para GA4. Aqui só publicamos os eventos — a tradução é configuração
 * do container, não código do site.
 */

type Registro = Record<string, unknown>;

declare global {
  interface Window {
    dataLayer?: Registro[];
  }
}

/** Publica no dataLayer. Nunca lança: telemetria não pode derrubar a página. */
export function pushDataLayer(evento: Registro): void {
  if (typeof window === 'undefined') return;
  try {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(evento);
  } catch {
    /* modo privado / sandbox — segue o jogo */
  }
}

/**
 * URL da página sem a decoração automática de visita direta.
 *
 * O decorador do GTM carimba `utm_source=direto&src=direto|…&sck=<id da sessão>`
 * antes do React iniciar. O `sck` é único por sessão: deixá-lo no `page_location`
 * fragmenta qualquer relatório por URL, e o `utm_source=direto` faz o tráfego
 * direto aparecer como campanha. Os dois saem daqui; a atribuição real de
 * campanha (Meta, Google, WhatsApp) permanece intacta.
 */
export function paginaLimpa(pathname: string, search: string) {
  const query = stripAutoDirectTracking(search);
  return {
    page_path: `${pathname}${query}`,
    page_location: `${PUBLIC_BASE_URL}${pathname}${query}`,
    page_title: typeof document !== 'undefined' ? document.title : '',
  };
}

/**
 * Mudança de rota na SPA. O container precisa de um acionador de evento
 * personalizado `spa_page_view` disparando a tag de configuração do GA4 —
 * sem ele, o GA4 continua contando só a primeira tela da sessão.
 */
export function pushPageView(pathname: string, search: string): void {
  pushDataLayer({ event: 'spa_page_view', ...paginaLimpa(pathname, search) });
}

/** Evento de interação (`data-track`), traduzido para GA4 pelo container. */
export function pushEvent(category: string, action: string, label?: string): void {
  pushDataLayer({
    event: 'spa_event',
    event_category: category,
    event_action: action,
    event_label: label ?? '',
  });
}
