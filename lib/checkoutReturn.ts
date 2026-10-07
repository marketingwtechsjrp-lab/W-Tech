/**
 * Código do pedido na URL de retorno do checkout (página de obrigado).
 *
 * A Kiwify redireciona com `order_code` — o mesmo `order_ref` do webhook,
 * ex.: `/obrigado-suspensao?order_code=CwZQnif&payment_type=cartao…`. Sem ler
 * esse parâmetro, a página caía no id genérico `kiwify_<dia>_sessao`, e duas
 * vendas no mesmo dia viravam a mesma transação para o Google Ads, que
 * descarta a segunda. Os demais nomes cobrem Hotmart e retornos antigos.
 */
const PARAMETROS_DO_PEDIDO = [
    'order_code',
    'order_ref',
    'order_id',
    'orderId',
    'transaction_id',
    'transaction',
    'pedido',
    'purchase_id',
    'id',
] as const;

/** Código do pedido presente na query string, sem espaços, ou `null`. */
export function pedidoDaUrl(search: string): string | null {
    const params = new URLSearchParams(search);
    for (const nome of PARAMETROS_DO_PEDIDO) {
        const valor = params.get(nome)?.trim();
        if (valor) return valor;
    }
    return null;
}
