/**
 * Fonte ÚNICA da oferta pública "W-Tech Lisboa 2026" (CheckoutLisboa) —
 * preço exibido ao cliente (aqui) e preço cobrado no servidor
 * (api/create-stripe-checkout.ts) TÊM que vir do mesmo lugar. Antes deste
 * módulo, os dois números (150/480) e o courseId viviam duplicados nos dois
 * arquivos — qualquer ajuste de preço feito em só um lado gerava divergência
 * entre o que a página mostra e o que o Stripe cobra.
 *
 * Módulo puro (sem lógica, sem import de framework) — pode ser importado
 * tanto pelo bundle do cliente (Vite) quanto pelo servidor (esbuild).
 */
export const LISBOA_COURSE_ID = 'b88e8979-520a-4c37-8cb8-1128e7e5dffc';
export const LISBOA_DEPOSIT_PRICE = 150;
export const LISBOA_FULL_PRICE = 480;
export const LISBOA_CURRENCY = 'eur';
