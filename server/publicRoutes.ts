import { getServiceClient } from '../api/_auth.js';

/**
 * Existe esta URL pública?
 *
 * MOTIVO: o fallback da SPA devolvia `index.html` com HTTP 200 para QUALQUER
 * caminho. O Google leu isso como "página existe, mas está vazia" e marcou
 * 3.924 URLs como soft 404 — a maior fatia das páginas não indexadas do site,
 * em tendência de alta. A massa vem do WordPress antigo (`/glossario/o-que-e-*`
 * e posts na raiz do domínio) que hoje não existe mais.
 *
 * Um 404 real é o que tira essas URLs do índice. Mas 404 em página legítima é
 * pior ainda: por isso este módulo só nega o que sabe não existir e, diante de
 * qualquer incerteza (Supabase fora do ar, tabela nova, erro de consulta),
 * responde `true`. Falha para o lado de servir a página.
 */

/**
 * Rotas fixas declaradas em App.tsx. TEM que ser mantida em sincronia: rota nova
 * lá sem entrada aqui passa a devolver 404. O teste de fumaça do deploy cobre as
 * do sitemap; as demais são transacionais e não têm valor de busca.
 */
const ROTAS_EXATAS = new Set<string>([
  '/',
  '/home5',
  '/home-legacy',
  '/home-p2',
  '/cursos',
  '/glossario',
  '/admin',
  '/sou-mecanico',
  '/mapa',
  '/molas',
  '/oleo',
  '/contato',
  '/blog',
  '/lp/europa',
  '/lp-preview',
  '/lp-lisboa-fev-2026',
  '/lp-wtech-lisboa',
  '/wtech-lisboa',
  '/lp-wtech-lisboa-nov',
  '/wtech-lisboa-nov',
  '/lp-proriders-lisboa',
  '/obrigado-lisboa',
  '/checkout-lisboa',
  '/curso-suspensao-piloto',
  '/curso-suspensao-piloto-v2',
  '/curso-suspensao-piloto-completa',
  '/curso-suspensao-piloto-vsl',
  '/curso-suspensao-piloto-vsl-clara',
  '/curso-suspensao-piloto-clara',
  '/imersao-pronello',
  '/chao-de-oficina',
  '/obrigado-suspensao',
  '/espera-suspensao-piloto',
  '/quiz-suspensao',
  '/quiz-suspensao-escuro',
  '/quiz-suspensao-clara',
  '/termos',
  '/privacidade',
  '/cancelamento',
  '/suporte',
  '/bio',
  '/pagamento-sucesso',
  '/inscricao-confirmada',
  '/afiliados',
  '/portal-afiliados',
  '/meus-pedidos',
  '/rastreio',
  '/auth/google/callback',
]);

/**
 * Rotas com parâmetro que NÃO consultam o banco: são transacionais (checkout,
 * validação de certificado, painel). Ninguém as rastreia — o robots.txt já as
 * bloqueia — e negá-las quebraria fluxo de pagamento por causa de um id novo.
 */
const PREFIXOS_LIVRES = [
  '/checkout/',
  '/checkout-curso/',
  '/validar/',
  '/admin/',
  '/auth/',
];

type Verificador = (slug: string) => Promise<boolean>;

/** Cache do resultado por caminho. Sem ele, cada rastreamento vira uma consulta. */
const TTL_EXISTE_MS = 10 * 60 * 1000;
const TTL_NAO_EXISTE_MS = 60 * 1000;
const cache = new Map<string, { existe: boolean; expiraEm: number }>();

function lerCache(chave: string): boolean | null {
  const registro = cache.get(chave);
  if (!registro) return null;
  if (Date.now() > registro.expiraEm) {
    cache.delete(chave);
    return null;
  }
  return registro.existe;
}

function gravarCache(chave: string, existe: boolean) {
  // O cache não pode crescer sem limite: um rastreador pedindo milhares de URLs
  // inexistentes encheria a memória do processo.
  if (cache.size > 5000) cache.clear();
  cache.set(chave, { existe, expiraEm: Date.now() + (existe ? TTL_EXISTE_MS : TTL_NAO_EXISTE_MS) });
}

/** `true` se a consulta achou pelo menos uma linha. Erro ⇒ `null` (indeciso). */
async function existeLinha(
  tabela: string,
  coluna: string,
  valor: string,
  filtro?: { coluna: string; valor: unknown },
): Promise<boolean | null> {
  const supabase = getServiceClient();
  if (!supabase) return null;

  let query = supabase.from(tabela).select(coluna, { count: 'exact', head: true }).eq(coluna, valor);
  if (filtro) query = query.eq(filtro.coluna, filtro.valor);

  const { count, error } = await query;
  if (error) {
    console.warn(`[404] consulta ${tabela}.${coluna} falhou: ${error.message}`);
    return null;
  }
  return (count ?? 0) > 0;
}

/** Qualquer verificador que responda `true` basta; `null` de todos ⇒ indeciso. */
async function algumConfirma(checagens: Array<Promise<boolean | null>>): Promise<boolean | null> {
  const respostas = await Promise.all(checagens);
  if (respostas.some((r) => r === true)) return true;
  if (respostas.some((r) => r === null)) return null;
  return false;
}

const VERIFICADORES: Array<{ padrao: RegExp; verificar: Verificador }> = [
  {
    // O glossário antigo do WordPress vivia aqui. É a origem da maior parte dos
    // soft 404, e o glossário novo tem poucos verbetes publicados.
    padrao: /^\/glossario\/([^/]+)$/,
    verificar: async (slug) =>
      (await existeLinha('SITE_GlossaryTerms', 'slug', slug, { coluna: 'published', valor: true })) ?? true,
  },
  {
    padrao: /^\/blog\/([^/]+)$/,
    verificar: async (slug) =>
      (await existeLinha('SITE_BlogPosts', 'slug', slug, { coluna: 'status', valor: 'Published' })) ?? true,
  },
  {
    // LandingPageViewer resolve o parâmetro por três caminhos distintos: slug da
    // landing page, course_id da landing page, ou id do curso direto.
    padrao: /^\/lp(?:[2-9]|1[0-2])?\/([^/]+)$/,
    verificar: async (slug) =>
      (await algumConfirma([
        existeLinha('SITE_LandingPages', 'slug', slug),
        existeLinha('SITE_LandingPages', 'course_id', slug),
        existeLinha('SITE_Courses', 'id', slug),
      ])) ?? true,
  },
  {
    padrao: /^\/cursos\/([^/]+)$/,
    verificar: async (slug) =>
      (await algumConfirma([
        existeLinha('SITE_Courses', 'id', slug),
        existeLinha('SITE_Courses', 'slug', slug),
      ])) ?? true,
  },
  {
    padrao: /^\/captura\/([^/]+)$/,
    verificar: async (slug) => (await existeLinha('SITE_CaptureCampaigns', 'slug', slug)) ?? true,
  },
];

/**
 * `true` ⇒ servir a SPA com 200. `false` ⇒ 404 real.
 * `rotaPrerenderizada` já foi atendida antes daqui e nem chega a esta função.
 */
export async function caminhoPublicoExiste(pathname: string): Promise<boolean> {
  // `/cursos/` e `/cursos` são a mesma rota para o React Router.
  const caminho = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;

  if (ROTAS_EXATAS.has(caminho)) return true;
  if (PREFIXOS_LIVRES.some((prefixo) => caminho.startsWith(prefixo))) return true;

  const emCache = lerCache(caminho);
  if (emCache !== null) return emCache;

  for (const { padrao, verificar } of VERIFICADORES) {
    const encontrado = padrao.exec(caminho);
    if (!encontrado) continue;
    const existe = await verificar(decodeURIComponent(encontrado[1]));
    gravarCache(caminho, existe);
    return existe;
  }

  // Não bate com rota nenhuma do App.tsx: é 404 de verdade.
  gravarCache(caminho, false);
  return false;
}
