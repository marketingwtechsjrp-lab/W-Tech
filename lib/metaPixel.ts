/**
 * Meta Pixel do funil do Curso Online de Suspensao.
 *
 * O carregamento do SDK e a PageView inicial pertencem exclusivamente ao
 * container Stape/GTM do index.html. Este modulo envia apenas eventos de funil
 * para o pixel correto, evitando reinicializar o SDK ou duplicar PageView.
 */
export const COURSE_META_PIXEL_ID = '1287422246429098';
export const SITE_META_PIXEL_ID = '1109519607249858';
let configuredSitePixelId = SITE_META_PIXEL_ID;

export type MetaStandardEvent =
  | 'PageView'
  | 'ViewContent'
  | 'Lead'
  | 'CompleteRegistration';

type MetaEventValue = string | number | boolean | string[];
export type MetaEventParams = Record<string, MetaEventValue | undefined>;

interface MetaEventOptions {
  /** Usa o pixel do curso quando omitido. */
  pixelId?: string | null;
  /** Impede repeticao causada por remount/effects do React. */
  onceKey?: string;
}

interface PendingMetaEvent {
  command: 'trackSingle' | 'trackSingleCustom';
  eventId: string;
  eventName: string;
  params: Record<string, MetaEventValue>;
  pixelId: string;
  onceKey?: string;
}

type Fbq = (command: string, ...args: unknown[]) => void;

const PIXEL_ID_PATTERN = /^\d{8,20}$/;
const initializedPixels = new Set<string>([COURSE_META_PIXEL_ID]);
const emittedOnceKeys = new Set<string>();
const pendingEvents = new Map<string, PendingMetaEvent>();

let retryTimer: number | null = null;
let retryAttempts = 0;

const normalizePixelId = (candidate?: string | null): string | null => {
  const value = candidate?.trim() || COURSE_META_PIXEL_ID;
  return PIXEL_ID_PATTERN.test(value) ? value : null;
};

export const landingPagePixelId = (candidate?: string | null): string =>
  candidate?.trim() || configuredSitePixelId;

/** Preserva o pixel geral, sem retransmitir PageView ao pixel do GTM. */
export const configureSitePixel = (candidate?: string | null): void => {
  if (!candidate?.trim()) return;
  const pixelId = normalizePixelId(candidate);
  if (!pixelId) return;
  configuredSitePixelId = pixelId;
  if (pixelId !== COURSE_META_PIXEL_ID) {
    trackMetaStandardEvent('PageView', {}, { pixelId, onceKey: `base-page-view:${pixelId}` });
  }
};

/** Chamado somente quando muda a rota real, nao na limpeza de UTMs. */
export const trackMetaNavigationPageView = (previousRoute?: string, nextRoute?: string): void => {
  // A V2 internacional redireciona antes de exibir conteudo. O GTM ja mede
  // essa visita inicial; contar o replace como navegacao criaria outra visita.
  if (previousRoute?.split('?')[0] === '/curso-suspensao-piloto-v2' &&
      nextRoute?.split('?')[0] === '/curso-suspensao-piloto-completa') return;
  trackMetaStandardEvent('PageView');
  if (configuredSitePixelId !== COURSE_META_PIXEL_ID) {
    trackMetaStandardEvent('PageView', {}, { pixelId: configuredSitePixelId });
  }
};

const compactParams = (params: MetaEventParams): Record<string, MetaEventValue> =>
  Object.fromEntries(
    Object.entries(params).filter((entry): entry is [string, MetaEventValue] => entry[1] !== undefined),
  );

const createEventId = (eventName: string): string => {
  const random = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  return `wtech_${eventName.toLowerCase()}_${random}`;
};

const getFbq = (): Fbq | null => {
  if (typeof window === 'undefined') return null;
  const candidate = (window as unknown as { fbq?: Fbq }).fbq;
  return typeof candidate === 'function' ? candidate : null;
};

const deliver = (event: PendingMetaEvent): boolean => {
  const fbq = getFbq();
  if (!fbq) return false;

  try {
    // O SDK pode existir antes de o GTM inicializar o pixel do curso.
    if (event.pixelId === COURSE_META_PIXEL_ID &&
        !(window as unknown as { _meta_gtm_ids?: string[] })._meta_gtm_ids?.includes(event.pixelId)) {
      return false;
    }
    if (!initializedPixels.has(event.pixelId)) {
      fbq('init', event.pixelId);
      initializedPixels.add(event.pixelId);
    }

    fbq(event.command, event.pixelId, event.eventName, event.params, { eventID: event.eventId });
    return true;
  } catch {
    // Rastreamento nunca deve interromper um formulario ou checkout.
    return false;
  }
};

const flushPending = () => {
  retryTimer = null;
  for (const [eventId, event] of pendingEvents) {
    if (deliver(event)) pendingEvents.delete(eventId);
  }

  if (!pendingEvents.size) {
    retryAttempts = 0;
    return;
  }

  retryAttempts += 1;
  if (retryAttempts >= 40) {
    for (const event of pendingEvents.values()) {
      if (event.onceKey) emittedOnceKeys.delete(event.onceKey);
    }
    pendingEvents.clear();
    retryAttempts = 0;
    return;
  }

  retryTimer = window.setTimeout(flushPending, 250);
};

const enqueueOrDeliver = (event: PendingMetaEvent) => {
  if (deliver(event)) return;
  pendingEvents.set(event.eventId, event);
  if (retryTimer === null) retryTimer = window.setTimeout(flushPending, 250);
};

const trackMetaEvent = (
  command: PendingMetaEvent['command'],
  eventName: string,
  params: MetaEventParams = {},
  options: MetaEventOptions = {},
): string | null => {
  if (typeof window === 'undefined') return null;
  const pixelId = normalizePixelId(options.pixelId);
  if (!pixelId) return null;
  const onceKey = options.onceKey ? `${pixelId}:${eventName}:${options.onceKey}` : undefined;
  if (onceKey && emittedOnceKeys.has(onceKey)) return null;

  if (onceKey) emittedOnceKeys.add(onceKey);
  const eventId = createEventId(eventName);
  enqueueOrDeliver({
    command,
    eventId,
    eventName,
    params: compactParams(params),
    pixelId,
    onceKey,
  });
  return eventId;
};

export const trackMetaStandardEvent = (
  eventName: MetaStandardEvent,
  params: MetaEventParams = {},
  options: MetaEventOptions = {},
): string | null => trackMetaEvent('trackSingle', eventName, params, options);

export const trackMetaCustomEvent = (
  eventName: string,
  params: MetaEventParams = {},
  options: MetaEventOptions = {},
): string | null => trackMetaEvent('trackSingleCustom', eventName, params, options);

export const courseContentParams = (
  pageVariant: string,
  currency?: 'BRL' | 'EUR',
  value?: number,
): MetaEventParams => ({
  content_name: 'Curso Online de Regulagem de Suspensao para Pilotos',
  content_category: 'Curso Online',
  content_ids: ['8355309'],
  content_type: 'product',
  currency,
  value,
  page_variant: pageVariant,
});

interface LandingPageMetaData {
  pixelId?: string | null;
  slug?: string | null;
  title?: string | null;
  template?: string | null;
}

/**
 * Ativa o pixel especifico salvo na LP, quando houver, e registra a oferta.
 * A PageView extra so e enviada quando o pixel da LP difere do pixel global
 * do curso, evitando a duplicidade que existia anteriormente.
 */
export const trackConfiguredLandingPageView = (lp: LandingPageMetaData): void => {
  if (typeof window === 'undefined') return;
  const pixelId = normalizePixelId(landingPagePixelId(lp.pixelId));
  if (!pixelId) return;
  const identity = lp.slug || lp.title || window.location.pathname;
  const params: MetaEventParams = {
    content_name: lp.title || identity,
    content_category: 'Landing Page',
    content_type: 'product',
    page_variant: lp.template || undefined,
  };

  if (lp.pixelId && pixelId !== COURSE_META_PIXEL_ID) {
    trackMetaStandardEvent('PageView', {}, {
      pixelId,
      onceKey: `base-page-view:${pixelId}`,
    });
  }

  trackMetaStandardEvent('ViewContent', params, {
    pixelId,
    onceKey: `configured-lp-view-content:${pixelId}:${identity}`,
  });
};

export const trackConfiguredLandingPageRegistration = (lp: LandingPageMetaData): void => {
  if (typeof window === 'undefined') return;
  const pixelId = normalizePixelId(landingPagePixelId(lp.pixelId));
  if (!pixelId) return;
  const identity = lp.slug || lp.title || window.location.pathname;
  trackMetaStandardEvent('CompleteRegistration', {
    content_name: lp.title || identity,
    content_category: 'Landing Page',
    status: 'completed',
  }, {
    pixelId,
    onceKey: `configured-lp-registration:${pixelId}:${identity}`,
  });
};
