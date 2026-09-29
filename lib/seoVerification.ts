/**
 * Token de verificação do Google (google-site-verification) ou do Bing
 * (msvalidate.01): só letras, números, `-` e `_`, sem aspas, `=` ou vírgula.
 * O banco já guardou `"vc-domain-verify=site.w-techbrasil.com.br,…"`, de outro
 * serviço, e o site sobrescrevia com isso o token real do index.html.
 */
export const isVerificationToken = (value: unknown): value is string =>
    typeof value === 'string' && /^[A-Za-z0-9_-]{20,100}$/.test(value.trim());
