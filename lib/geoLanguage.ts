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

export const detectGeoLandingLanguage = async (signal?: AbortSignal): Promise<SiteLanguage> => {
    const explicit = getExplicitLanguage();
    if (explicit) return explicit;

    try {
        const response = await fetch('/api/geo-language', {
            headers: { Accept: 'application/json' },
            cache: 'no-store',
            signal,
        });
        if (response.ok) {
            const data = await response.json() as { language?: string };
            if (isSupported(data.language)) return data.language;
        }
    } catch {
        // A detecção local continua sendo um fallback confiável.
    }

    return detectBrowserLandingLanguage();
};
