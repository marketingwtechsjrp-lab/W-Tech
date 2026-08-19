import type { SiteLanguage } from './siteTranslations';

export const SUPPORTED_LANDING_LANGUAGES: SiteLanguage[] = ['pt-PT', 'es', 'en', 'pt-BR'];

const SPANISH_COUNTRIES = new Set([
    'AR', 'BO', 'CL', 'CO', 'CR', 'CU', 'DO', 'EC', 'ES', 'GQ', 'GT',
    'HN', 'MX', 'NI', 'PA', 'PE', 'PR', 'PY', 'SV', 'UY', 'VE',
]);

export const countryToLandingLanguage = (country?: string | null): SiteLanguage => {
    const code = country?.trim().toUpperCase();
    if (code === 'BR') return 'pt-BR';
    if (code === 'PT') return 'pt-PT';
    if (code && SPANISH_COUNTRIES.has(code)) return 'es';
    return 'en';
};

const isSupported = (value?: string | null): value is SiteLanguage =>
    Boolean(value && SUPPORTED_LANDING_LANGUAGES.includes(value as SiteLanguage));

export const getExplicitLanguage = (): SiteLanguage | null => {
    if (typeof window === 'undefined') return null;

    const queryLanguage = new URLSearchParams(window.location.search).get('lang');
    if (isSupported(queryLanguage)) return queryLanguage;

    try {
        const saved = localStorage.getItem('wtech_global_lang')
            || localStorage.getItem('wtech_lp4_lang');
        return isSupported(saved) ? saved : null;
    } catch {
        return null;
    }
};

export const detectBrowserLandingLanguage = (): SiteLanguage => {
    if (typeof window === 'undefined') return 'pt-PT';

    const explicit = getExplicitLanguage();
    if (explicit) return explicit;

    try {
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
        if (/Sao_Paulo|Fortaleza|Manaus|Recife|Belem|Cuiaba|Campo_Grande|Bahia/i.test(timezone)) return 'pt-BR';
        if (/Lisbon|Madeira|Azores/i.test(timezone)) return 'pt-PT';
        if (/Madrid|Canary|Buenos_Aires|Santiago|Bogota|Mexico|Lima/i.test(timezone)) return 'es';
    } catch {
        // Continua para a preferência do navegador.
    }

    try {
        for (const language of navigator.languages || [navigator.language || '']) {
            const normalized = language.toLowerCase();
            if (normalized === 'pt-br') return 'pt-BR';
            if (normalized.startsWith('pt')) return 'pt-PT';
            if (normalized.startsWith('es')) return 'es';
            if (normalized.startsWith('en')) return 'en';
        }
    } catch {
        // Usa o padrão internacional abaixo.
    }

    return 'en';
};

export interface GeoLookup {
    country: string | null;
    language: string | null;
}

/**
 * Uma consulta por carregamento de página, compartilhada entre a escolha de
 * idioma e a de checkout. Sem isto, cada consumidor dispararia o próprio fetch
 * de /api/geo-language.
 */
let geoLookupPromise: Promise<GeoLookup> | null = null;

/**
 * Deliberadamente sem AbortSignal: a promessa é compartilhada, então um
 * consumidor que desmonta cancelaria a consulta dos outros. Quem não precisa
 * mais do resultado simplesmente o ignora.
 */
export const fetchGeoLookup = (): Promise<GeoLookup> => {
    if (geoLookupPromise) return geoLookupPromise;

    geoLookupPromise = (async () => {
        try {
            const response = await fetch('/api/geo-language', {
                headers: { Accept: 'application/json' },
                cache: 'no-store',
            });
            if (response.ok) {
                const data = await response.json() as { country?: string; language?: string };
                return { country: data.country ?? null, language: data.language ?? null };
            }
        } catch {
            // A detecção local continua sendo um fallback confiável.
        }
        return { country: null, language: null };
    })();

    return geoLookupPromise;
};

export const detectGeoLandingLanguage = async (_signal?: AbortSignal): Promise<SiteLanguage> => {
    const explicit = getExplicitLanguage();
    if (explicit) return explicit;

    const { language } = await fetchGeoLookup();
    if (isSupported(language)) return language;

    return detectBrowserLandingLanguage();
};
