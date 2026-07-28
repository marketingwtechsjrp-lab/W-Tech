import type { BlogPost } from '../types';

export type BlogImageKey =
  | 'motocross'
  | 'enduro'
  | 'fork'
  | 'shock'
  | 'rally'
  | 'training'
  | 'workshop';

export const BLOG_IMAGE_LIBRARY: Record<BlogImageKey, { src: string; label: string }> = {
  motocross: {
    src: '/images/blog/motocross-action.webp',
    label: 'Motocross em ação',
  },
  enduro: {
    src: '/images/blog/enduro-trail.webp',
    label: 'Enduro em trilha técnica',
  },
  fork: {
    src: '/images/blog/front-fork-closeup.webp',
    label: 'Garfo de suspensão off-road',
  },
  shock: {
    src: '/images/blog/shock-tuning.webp',
    label: 'Preparação de amortecedor',
  },
  rally: {
    src: '/images/blog/rally-offroad.webp',
    label: 'Rally off-road',
  },
  training: {
    src: '/images/blog/suspension-training.webp',
    label: 'Treinamento de suspensão',
  },
  workshop: {
    src: '/images/blog/fork-service.webp',
    label: 'Manutenção de garfo em oficina',
  },
};

const normalize = (value: unknown) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

/**
 * Classifica a capa editorial pelo assunto do artigo. A biblioteca é local,
 * evitando dependência de WordPress, Unsplash ou geradores de imagem externos.
 */
export function getBlogImage(post: Partial<BlogPost> | string): string {
  const source = typeof post === 'string'
    ? post
    : [post.title, post.slug, post.category, post.excerpt, post.keywords?.join(' ')].join(' ');
  const text = normalize(source);

  if (/\b(curso|aula|treinamento|formacao|certificacao|aprender|escola|instrutor)\b/.test(text)) {
    return BLOG_IMAGE_LIBRARY.training.src;
  }

  if (/\b(amortecedor|monoshock|shock|mola|preload|pre-carga|sag)\b/.test(text)) {
    return BLOG_IMAGE_LIBRARY.shock.src;
  }

  if (/\b(manutencao|oficina|oleo|valvula|retentor|ferramenta|reparo|revisao|instalacao|instalar|pecas?)\b/.test(text)) {
    return BLOG_IMAGE_LIBRARY.workshop.src;
  }

  if (/\b(rally|rali|viagem|aventura|estrada de terra|cerrado|deserto)\b/.test(text)) {
    return BLOG_IMAGE_LIBRARY.rally.src;
  }

  if (/\b(enduro|trilha|trilhas|hard enduro|mata|barro|pedra|off-road|off road)\b/.test(text)) {
    return BLOG_IMAGE_LIBRARY.enduro.src;
  }

  if (/\b(suspensao|garfo|fork|dianteira|compressao|retorno|rebound)\b/.test(text)) {
    return BLOG_IMAGE_LIBRARY.fork.src;
  }

  return BLOG_IMAGE_LIBRARY.motocross.src;
}

export function resolveBlogImage(post: Partial<BlogPost>): string {
  const currentImage = String(post.image || '');
  if (currentImage.startsWith('/images/blog/')) return currentImage;
  return getBlogImage(post);
}

/**
 * O acervo importado possui no máximo uma imagem interna por artigo. Esta
 * normalização troca fontes legadas também no corpo do texto e remove srcsets
 * antigos para o navegador não voltar a carregar o WordPress.
 */
export function normalizeBlogContentImages(content: string, post: Partial<BlogPost>): string {
  if (!content) return '';

  const image = resolveBlogImage(post);
  return content
    .replace(/\s(?:srcset|data-src|data-lazy-src)=("[^"]*"|'[^']*')/gi, '')
    .replace(/(<img\b[^>]*\bsrc\s*=\s*)(["'])[^"']*\2/gi, (_match, prefix, quote) => (
      `${prefix}${quote}${image}${quote}`
    ));
}
