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
