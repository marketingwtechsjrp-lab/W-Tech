/** Acervo original W-Tech. Não usar imagens geradas, stock ou ilustrações de pessoas.
 * Os frames são extraídos, sem retoque, do vídeo já utilizado na LP de Lisboa:
 * public/videos/como_foi.mp4 (38s e 24s). Os demais arquivos já compõem as LPs da marca.
 */
export const ORIGINAL_LANDING_MEDIA = [
  {
    src: "/images/landing-studio/turma-lisboa-original.webp",
    label: "Turma real · Lisboa",
    source: "/videos/como_foi.mp4 · 00:38",
  },
  {
    src: "/images/landing-studio/estrutura-lisboa-original.webp",
    label: "Estrutura real · Lisboa",
    source: "/videos/como_foi.mp4 · 00:24",
  },
  {
    src: "/images/lp-curso/3.webp",
    label: "Alex na oficina",
    source: "Foto original já usada em LPErgonomia",
  },
  {
    src: "/images/alex-webp.webp",
    label: "Alex · retrato premium de estúdio",
    source: "Arte oficial já usada em LPErgonomia",
  },
  {
    src: "/images/Alex.webp",
    label: "Alex · arte oficial vermelha",
    source: "Arte oficial já usada na LP de Lisboa",
  },
] as const;

export const ORIGINAL_COURSE_IMAGE = ORIGINAL_LANDING_MEDIA[0].src;

/** Evita reintroduzir o acervo ilustrativo do blog nas novas páginas e nas miniaturas. */
export function originalLandingImage(
  src?: string | null,
  fallback: string = ORIGINAL_COURSE_IMAGE,
): string {
  if (!src?.trim()) return fallback;
  if (
    /\/images\/(blog|hero-piloto)\/|\/images\/lp-curso\/(hero-light|light-vsl)|images\.unsplash\.com/i.test(
      src,
    )
  )
    return fallback;
  return src;
}
