/**
 * Base pública do site para URLs que serviços EXTERNOS chamam de volta
 * (webhooks da Evolution API, Meta, gateways de pagamento).
 *
 * NÃO use window.location.origin para montar essas URLs: o endereço fica gravado
 * no provedor com o domínio de onde o admin estava aberto naquele momento. Foi
 * exatamente assim que os webhooks dos 4 atendentes ficaram apontando para o
 * Supabase antigo depois da migração para o VPS — o espelho do WhatsApp parou de
 * sincronizar em 15/07/2026 e só foi notado em 31/07, com 20.298 mensagens presas
 * no banco velho.
 *
 * site.w-techbrasil.com.br NÃO serve: responde 308 (redirect) e webhook não segue
 * redirect — a entrega falha silenciosamente.
 */
export const PUBLIC_BASE_URL = 'https://w-techbrasil.com.br';

/** URL absoluta de um endpoint público (webhooks e callbacks de terceiros). */
export function publicApiUrl(path: string): string {
    return `${PUBLIC_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

/** @id da organização no grafo schema.org. Definido no index.html e referenciado
 *  pelo JSON-LD das páginas — se mudar aqui, o grafo se parte em duas entidades. */
export const ORGANIZATION_ID = `${PUBLIC_BASE_URL}/#organization`;
export const WEBSITE_ID = `${PUBLIC_BASE_URL}/#website`;

/**
 * Parâmetros de campanha e de clique nunca entram no canonical: cada variação de UTM
 * criaria uma "página" diferente aos olhos do mecanismo de busca.
 */
const TRACKING_PARAMS = [
    'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
    'fbclid', 'gclid', 'gad_source', 'gbraid', 'wbraid', 'src', 'sck',
    'fbp', 'fbc', '_ga', 'ref',
];

/**
 * URL canônica absoluta de uma rota.
 *
 * Fica aqui — e não no componente SEO — porque há DOIS lugares que escrevem a tag
 * canonical (components/SEO.tsx e context/SettingsContext.tsx) e eles precisam
 * produzir exatamente o mesmo valor, senão brigam entre si a cada render.
 *
 * A origem é sempre PUBLIC_BASE_URL: site.w-techbrasil.com.br responde 308 e www.
 * duplica o conteúdo — só w-techbrasil.com.br é indexável.
 */
export function canonicalUrl(pathname: string, search = ''): string {
    const path = pathname === '/' ? '/' : pathname.replace(/\/+$/, '');
    const params = new URLSearchParams(search);
    TRACKING_PARAMS.forEach((p) => params.delete(p));
    const query = params.toString();
    return `${PUBLIC_BASE_URL}${path}${query ? `?${query}` : ''}`;
}

/**
 * A URL de webhook gravada no provedor aponta para este site?
 * Usado no painel para avisar quando uma instância ficou apontando para fora
 * (domínio antigo, preview, localhost) — o sintoma é "parou de sincronizar".
 */
export function isOwnWebhookUrl(url: string | null | undefined): boolean {
    if (!url) return false;
    try {
        return new URL(url).origin === PUBLIC_BASE_URL;
    } catch {
        return false;
    }
}
