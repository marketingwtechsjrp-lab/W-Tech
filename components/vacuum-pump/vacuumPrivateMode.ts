/**
 * Link da condição privada em 12x (`?condicao=<token>`, ver lib/vacuumPrivateOffer.ts). O token fica
 * na aba (sessionStorage) para valer também no carrinho e na página de obrigado. Quem decide o preço
 * é o servidor: aqui ele só é repassado.
 */
const KEY = 'vp_condicao_token';

export function vacuumPrivateToken(): string | null {
    if (typeof window === 'undefined') return null;
    let fromUrl: string | null = null;
    try {
        fromUrl = new URLSearchParams(window.location.search).get('condicao');
    } catch {
        fromUrl = null;
    }
    try {
        if (fromUrl) window.sessionStorage.setItem(KEY, fromUrl);
        return fromUrl || window.sessionStorage.getItem(KEY);
    } catch {
        return fromUrl;
    }
}
