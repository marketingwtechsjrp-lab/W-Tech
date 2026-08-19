/**
 * Vídeo de apresentação (VSL) do Curso Online de Suspensão.
 *
 * Fonte única: antes a URL estava cravada em cinco arquivos, todos apontando
 * para um projeto Supabase **cloud** que sequer pertence a esta conta — se
 * aquele projeto pausasse, as VSLs ficavam sem vídeo e ninguém saberia por quê.
 * Agora o arquivo vive no Storage self-hosted da própria VPS.
 *
 * `VSL_VIDEO_ID` acompanha a troca de vídeo e é gravado em cada sessão de
 * `SITE_VSLProgress`, para que a retenção de uma versão não se misture com a da
 * outra. Ao publicar uma VSL nova, suba o arquivo e mude as duas constantes
 * juntas — o histórico da versão anterior continua consultável no painel.
 */

export const VSL_VIDEO_ID = 'vsl-suspensao-2026';

export const VSL_VIDEO_URL =
    'https://supabase.w-techbrasil.com.br/storage/v1/object/public/site-assets/vsl/vsl-suspensao-2026.mp4';

/** Duração nominal, usada só como palpite antes de o metadata carregar. */
export const VSL_VIDEO_DURATION_SECONDS = 182;
