import { getServiceClient } from '../api/_auth.js';

/**
 * Herança do WordPress.
 *
 * O site antigo publicava os posts na RAIZ do domínio (`/amortecedor-remanufaturado/`).
 * A migração não deixou redirect: o Search Console lista 54 dessas URLs como 404 e
 * boa parte tem equivalente exato hoje sob `/blog/<slug>`. Sem o 301, toda a
 * autoridade que essas páginas acumularam foi jogada fora.
 *
 * O glossário antigo é o caso oposto: milhares de `/glossario/o-que-e-*` que não
 * têm equivalente nenhum. Esses saem com 410, que remove do índice mais rápido
 * que 404 e sinaliza que a remoção é permanente.
 */

const TTL_MS = 10 * 60 * 1000;
const cache = new Map<string, { destino: string | null; expiraEm: number }>();

/** Slugs do WordPress antigo no glossário. Nunca tiveram equivalente no site novo. */
const GLOSSARIO_WORDPRESS = /^\/glossario\/(o-que-e-|uso-de-|como-)/;

/** `true` quando a URL deve sair com 410 Gone em vez de 404. */
export function ehRemocaoPermanente(pathname: string): boolean {
  return GLOSSARIO_WORDPRESS.test(pathname);
}

/**
 * Caminho de raiz (`/slug` ou `/slug/`) que hoje é um post do blog.
 * Devolve `/blog/<slug>` para 301, ou `null` se não houver equivalente.
 */
export async function destinoLegado(pathname: string): Promise<string | null> {
  const encontrado = /^\/([a-z0-9][a-z0-9-]*)\/?$/i.exec(pathname);
  if (!encontrado) return null;
  const slug = encontrado[1].toLowerCase();

  const registro = cache.get(slug);
  if (registro && Date.now() <= registro.expiraEm) return registro.destino;

  const supabase = getServiceClient();
  if (!supabase) return null;

  const { count, error } = await supabase
    .from('SITE_BlogPosts')
    .select('slug', { count: 'exact', head: true })
    .eq('slug', slug)
    .eq('status', 'Published');

  // Erro de consulta não pode virar redirect nem 404 apressado: deixa seguir o
  // fluxo normal, que já falha para o lado de servir a página.
  if (error) {
    console.warn(`[301] consulta de slug legado falhou: ${error.message}`);
    return null;
  }

  const destino = (count ?? 0) > 0 ? `/blog/${slug}` : null;
  if (cache.size > 5000) cache.clear();
  cache.set(slug, { destino, expiraEm: Date.now() + TTL_MS });
  return destino;
}
