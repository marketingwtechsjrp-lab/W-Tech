import { isIP } from 'node:net';

/**
 * País do visitante a partir do IP, compartilhado por /api/geo-language e
 * /api/vsl-progress.
 *
 * Atrás do Traefik não existe header de edge (`cf-ipcountry` e afins), então a
 * resolução é por IP mesmo. O cache é o que torna isso barato: a telemetria da
 * VSL bate a cada 5s e sem ele cada batida viraria uma chamada externa.
 */

const GEO_CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const geoCountryCache = new Map<string, { country: string; expiresAt: number }>();

export function normalizeClientIp(value?: string | null): string | null {
    if (!value) return null;
    const trimmed = value.trim().replace(/^\[|\]$/g, '').replace(/^::ffff:/, '');
    if (!isIP(trimmed)) return null;

    // Nunca envia endereços locais/privados ao serviço de geolocalização.
    if (
        trimmed === '::1'
        || trimmed === '127.0.0.1'
        || /^10\./.test(trimmed)
        || /^192\.168\./.test(trimmed)
        || /^172\.(1[6-9]|2\d|3[01])\./.test(trimmed)
        || /^fc/i.test(trimmed)
        || /^fd/i.test(trimmed)
    ) return null;

    return trimmed;
}

const header = (req: any, nome: string): string | null => {
    const valor = typeof req?.get === 'function' ? req.get(nome) : req?.headers?.[nome];
    return typeof valor === 'string' ? valor : null;
};

export function getRequestClientIp(req: any): string | null {
    const forwarded = header(req, 'x-forwarded-for')
        ?.split(',')
        .map((part) => normalizeClientIp(part))
        .filter((part): part is string => Boolean(part));

    // O Traefik acrescenta o endereço recebido ao final da cadeia X-Forwarded-For.
    return normalizeClientIp(header(req, 'cf-connecting-ip'))
        || normalizeClientIp(header(req, 'x-real-ip'))
        || forwarded?.at(-1)
        || normalizeClientIp(req?.socket?.remoteAddress);
}

export async function lookupCountryByIp(ip: string): Promise<string | null> {
    const cached = geoCountryCache.get(ip);
    if (cached && cached.expiresAt > Date.now()) return cached.country;

    try {
        const response = await fetch(`https://api.country.is/${encodeURIComponent(ip)}`, {
            headers: { Accept: 'application/json' },
            signal: AbortSignal.timeout(1800),
        });
        if (!response.ok) return null;

        const data = await response.json() as { country?: string };
        const country = data.country?.trim().toUpperCase() || '';
        if (!/^[A-Z]{2}$/.test(country)) return null;

        geoCountryCache.set(ip, { country, expiresAt: Date.now() + GEO_CACHE_TTL_MS });
        return country;
    } catch {
        return null;
    }
}

/** Header de edge primeiro (se algum dia existir), IP depois. */
export async function resolveCountry(req: any): Promise<string | null> {
    const bruto = header(req, 'cf-ipcountry')
        || header(req, 'x-vercel-ip-country')
        || header(req, 'x-country-code')
        || '';
    const doHeader = bruto.split(',')[0].trim().toUpperCase();
    if (/^[A-Z]{2}$/.test(doHeader)) return doHeader;

    const ip = getRequestClientIp(req);
    return ip ? lookupCountryByIp(ip) : null;
}
