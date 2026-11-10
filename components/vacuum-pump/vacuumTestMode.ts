/**
 * Link privado de teste (`?teste=<token>`, ver lib/vacuumTest.ts). O token fica na aba
 * (sessionStorage) para valer também no carrinho e na página de obrigado. Quem decide o preço é o
 * servidor: aqui ele só é repassado, e o navegador deixa de mandar Pixel, GTM e telemetria do painel.
 */
const KEY = 'vp_test_token';

export function vacuumTestToken(): string | null {
    if (typeof window === 'undefined') return null;
    let fromUrl: string | null = null;
    try {
        fromUrl = new URLSearchParams(window.location.search).get('teste');
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

export function isVacuumTest(): boolean {
    return !!vacuumTestToken();
}
