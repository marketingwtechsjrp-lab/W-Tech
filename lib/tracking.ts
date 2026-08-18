/**
 * Tracking de campanha — captura e propagação de UTMs / IDs de clique para o checkout.
 *
 * Problema que resolve:
 *  - O Facebook envia UTMs no URL de destino (utm_source, utm_medium, utm_campaign,
 *    utm_content, utm_term) além de `fbclid`. O Google envia `gclid`.
 *  - Numa SPA (BrowserRouter), a query string pode se perder ao navegar entre seções,
 *    e os cookies `_fbp`/`_fbc` (Meta) e `_ga` (Google Analytics) ficam presos no
 *    domínio do site — não chegam ao checkout da Kiwify (domínio separado).
 *
 * Estratégia:
 *  1. Ao carregar a LP, capturamos TODOS os parâmetros do URL e persistimos em
 *     sessionStorage (sobrevive à navegação interna da SPA, expira ao fechar a aba).
 *  2. Ao montar o link do checkout, mesclamos: params persistidos + params atuais do
 *     URL + cookies relevantes de Meta/GA. Assim toda a atribuição segue para a Kiwify.
 */

const STORAGE_KEY = 'wtech_tracking_params';

/** Parâmetros de atribuição que queremos preservar e repassar. */
const TRACKED_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'fbclid',
  'gclid',
  'gad_source',
  'gbraid',
  'wbraid',
  'src',
  'sck',
] as const;

type TrackingParams = Record<string, string>;

const CAMPAIGN_SIGNAL_KEYS = [
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'fbclid',
  'gclid',
  'gad_source',
  'gbraid',
  'wbraid',
] as const;

/**
 * O decorador do GTM cria estes três parâmetros ao abrir qualquer URL limpa:
 *   utm_source=direto&src=direto|...&sck=...
 *
 * Eles são úteis internamente para correlacionar a sessão com o checkout, mas
 * não devem virar parte permanente da URL pública nem ser copiados para todos
 * os links internos. UTMs reais de campanha nunca são removidas.
 */
export function stripAutoDirectTracking(search: string): string {
  const sp = new URLSearchParams(search);
  const source = sp.get('utm_source')?.toLowerCase();
  const src = sp.get('src')?.toLowerCase() || '';
  const sck = sp.get('sck');
  const hasCampaignSignal = CAMPAIGN_SIGNAL_KEYS.some((key) => sp.has(key));
  const hasAutoDecoratorSrc = Boolean(sck) && src.includes('|');
  const isAutoDirect = source === 'direto'
    && (!src || src === 'direto' || src.startsWith('direto|'))
    && !hasCampaignSignal;

  // `sck` identifica a sessão e continua salvo internamente para o checkout,
  // mas não deve fazer parte de uma URL que será copiada ou compartilhada.
  if (sck) sp.delete('sck');

  // O `src` comprimido com barras verticais também é criado pelo decorador.
  // Fontes explícitas do funil (quiz_dark, vsl_obrigatoria etc.) permanecem.
  if (hasAutoDecoratorSrc) sp.delete('src');

  if (isAutoDirect) {
    sp.delete('utm_source');
    sp.delete('src');
  }

  const clean = sp.toString();
  const normalized = clean ? `?${clean}` : '';
  return normalized === search ? search : normalized;
}

/** Lê um cookie pelo nome (cookies não-httpOnly, acessíveis via JS). */
function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()[\]\\/+^])/g, '\\$1') + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

/** Extrai os parâmetros do URL atual (search + fallback para query dentro do hash). */
function readUrlParams(): TrackingParams {
  if (typeof window === 'undefined') return {};
  const hashQuery = window.location.hash.includes('?') ? window.location.hash.split('?')[1] : '';
  const sp = new URLSearchParams(window.location.search || hashQuery);
  const params: TrackingParams = {};
  sp.forEach((value, key) => {
    if (value) params[key] = value;
  });
  return params;
}

function readStored(): TrackingParams {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as TrackingParams) : {};
  } catch {
    return {};
  }
}

/**
 * Captura os parâmetros do URL atual e os funde com o que já estava persistido.
 * Chame uma vez ao carregar a landing page. Idempotente.
 */
export function captureTrackingParams(): TrackingParams {
  if (typeof window === 'undefined') return {};
  const merged = { ...readStored(), ...readUrlParams() };
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  } catch {
    /* sessionStorage indisponível (modo privado, etc.) — segue sem persistir */
  }
  return merged;
}

/** Chaves de UTM persistidas no próprio lead (tabela SITE_Leads). */
const LEAD_UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const;

export type LeadTrackingFields = Partial<Record<(typeof LEAD_UTM_KEYS)[number], string>>;

/**
 * Retorna os campos de UTM para gravar no lead, mesclando o que foi persistido na
 * sessão (captureTrackingParams) com os params atuais do URL. Pensado para ser
 * espalhado direto no payload do insert em SITE_Leads:
 *
 *   const payload = { name, email, ...getLeadTrackingFields() };
 *
 * Só inclui chaves preenchidas — leads sem UTM ficam com as colunas NULL e
 * aparecem como "Não informado" no filtro do CRM. Defensivo: nunca lança.
 */
export function getLeadTrackingFields(): LeadTrackingFields {
  if (typeof window === 'undefined') return {};
  const collected: TrackingParams = { ...readStored(), ...readUrlParams() };
  const fields: LeadTrackingFields = {};
  for (const key of LEAD_UTM_KEYS) {
    const value = collected[key];
    if (value) fields[key] = value;
  }
  return fields;
}

/**
 * Monta o URL final do checkout com toda a atribuição anexada:
 * params persistidos + params atuais do URL + cookies de Meta (_fbp/_fbc) e GA (_ga).
 * Reconstrói _fbc a partir de fbclid quando o cookie ainda não existe.
 */
export function buildCheckoutUrl(baseUrl: string): string {
  if (typeof window === 'undefined') return baseUrl;

  const collected: TrackingParams = { ...readStored(), ...readUrlParams() };

  // Cookies do Meta Pixel — elevam o match quality na CAPI da Kiwify.
  const fbp = readCookie('_fbp');
  const fbc = readCookie('_fbc');
  if (fbp) collected.fbp = fbp;
  if (fbc) collected.fbc = fbc;
  // Sem cookie _fbc mas com fbclid: reconstrói no formato esperado pelo Meta.
  if (!fbc && collected.fbclid) {
    collected.fbc = `fb.1.${Date.now()}.${collected.fbclid}`;
  }

  // Cookie do Google Analytics — mantém continuidade do client_id no GA4.
  const ga = readCookie('_ga');
  if (ga) collected._ga = ga;

  const params = new URLSearchParams();
  // UTMs e IDs de clique primeiro (ordem previsível), depois o resto.
  for (const key of TRACKED_KEYS) {
    if (collected[key]) {
      params.set(key, collected[key]);
      delete collected[key];
    }
  }
  for (const [key, value] of Object.entries(collected)) {
    if (value) params.set(key, value);
  }

  const query = params.toString();
  if (!query) return baseUrl;
  return baseUrl.includes('?') ? `${baseUrl}&${query}` : `${baseUrl}?${query}`;
}
