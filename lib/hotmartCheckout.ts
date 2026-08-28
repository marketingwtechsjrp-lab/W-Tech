const HOTMART_CHECKOUT_HOSTS = new Set(['pay.hotmart.com', 'go.hotmart.com']);

/**
 * Validador único dos links públicos da Hotmart, compartilhado pelo painel,
 * landing pages e webhook. Query string é permitida; credenciais, porta,
 * fragmento, host aproximado e URL sem identificador são recusados.
 */
export function normalizeHotmartCheckoutUrl(candidate: unknown): string | null {
    if (typeof candidate !== 'string') return null;
    const trimmed = candidate.trim();
    if (!trimmed) return null;

    try {
        const url = new URL(trimmed);
        const hasCheckoutId = url.pathname.split('/').some(Boolean);
        if (
            url.protocol !== 'https:'
            || !HOTMART_CHECKOUT_HOSTS.has(url.hostname.toLowerCase())
            || url.port
            || url.username
            || url.password
            || url.hash
            || !hasCheckoutId
        ) return null;
        return url.href;
    } catch {
        return null;
    }
}
