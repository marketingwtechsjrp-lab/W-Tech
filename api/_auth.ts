import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createHash } from 'node:crypto';
import { isIP } from 'node:net';
import { ALL_PERMISSION_KEYS } from '../lib/permissions.js';

/**
 * Autorização server-side (helper compartilhado) — sessão opaca httpOnly.
 *
 * Modelo (substitui a FASE 1 interina baseada no header `x-wtech-user-id`):
 *   1. POST /api/staff/login chama a RPC `site_staff_session_criar` com
 *      service_role. A RPC devolve o token cru (uma única vez) + o DTO seguro
 *      do usuário. O token cru vira cookie httpOnly — nunca chega ao corpo
 *      da resposta nem é logado.
 *   2. Toda chamada seguinte manda o cookie de volta. O servidor calcula
 *      SHA-256 do token e passa só o digest para `site_staff_session_validar`
 *      (leitura) ou para as RPCs de mutação (`site_staff_usuario_salvar/excluir`,
 *      `site_staff_papel_salvar/excluir`, `site_staff_tema_definir`,
 *      `site_staff_perfil_definir`) — nunca o token cru, nunca um actor UUID
 *      auto-declarado pelo browser.
 *   3. Autorização por ação: `requireStaffPermission` checa a chave exata em
 *      `permissions` (allowlist de `lib/permissions.ts` — fonte única) — 401
 *      se não há sessão válida, 403 se a sessão é válida mas falta a permissão.
 *      `admin_access` só autoriza se vier `true` no DTO da sessão; nunca por
 *      nome/texto de role. RLS/SQL continua como defesa em profundidade, não
 *      substitui o gate do endpoint.
 *
 * Contrato SQL 0091 (ERP) — nomes de parâmetro reais, confirmados pelo dono
 * do schema (fechado + 26/26 em dois PG16 fresh):
 *   site_staff_session_validar(p_token_sha256)
 *   site_staff_session_revogar(p_token_sha256)
 *   site_staff_perfil_definir(p_token_sha256, p_name, p_phone, p_avatar_url)
 *     — único ponto do contrato com nomes em inglês; os demais são em português.
 *   site_staff_tema_definir(p_token_sha256, p_tema)
 *   site_staff_usuario_salvar(p_ator_token_sha256, p_usuario_id, p_nome,
 *     p_email, p_telefone, p_avatar, p_role_id, p_status, p_permissoes,
 *     p_password, p_receives_leads default null) — 11 args. UPDATE
 *     (p_usuario_id != null): p_permissoes=NULL preserva os overrides
 *     existentes (nunca mandar {} pra "não mexer" — isso apagaria tudo).
 *     CREATE (p_usuario_id = null): sem permissões explícitas usa {}.
 *   site_staff_usuario_excluir(p_ator_token_sha256, p_usuario_id)
 *   site_staff_papel_salvar(p_ator_token_sha256, p_papel_id, p_nome,
 *     p_permissoes, p_descricao default null, p_nivel default null) — 6 args.
 *     Mesma regra NULL-preserva/{}-cria do usuario_salvar, por p_papel_id.
 *   site_staff_papel_excluir(p_ator_token_sha256, p_papel_id)
 * `site_staff_session_criar(p_email, p_password, p_origem)` não foi corrigida
 * pelo dono do schema — mantida como estava. Throttle por e-mail agora é
 * atômico dentro dela (0091) — o rate limit local aqui é só defesa por IP.
 */

const STAFF_SESSION_COOKIE = 'wtech_staff_session';
const SESSION_MAX_AGE_SECONDS = 12 * 60 * 60; // 12h — mesmo prazo do cookie.

let cached: SupabaseClient | null = null;

/** Cliente service_role (bypassa RLS) — só no servidor. */
export function getServiceClient(): SupabaseClient | null {
  if (cached) return cached;
  const url = process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  cached = createClient(url, serviceKey);
  return cached;
}

/** SHA-256 hex — usado tanto pro digest do token quanto pra chave de rate-limit por IP. */
export function sha256Hex(raw: string): string {
  return createHash('sha256').update(raw, 'utf8').digest('hex');
}

/** Parser mínimo de cookies (sem dependência extra — só lê, nunca escreve por aqui). */
function parseCookies(req: any): Record<string, string> {
  const header = String(req.headers?.cookie || '');
  const out: Record<string, string> = {};
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    if (!key) continue;
    try {
      out[key] = decodeURIComponent(part.slice(idx + 1).trim());
    } catch {
      out[key] = part.slice(idx + 1).trim();
    }
  }
  return out;
}

/** Token cru da sessão de staff, se o cookie estiver presente. */
export function getStaffSessionToken(req: any): string | null {
  const token = parseCookies(req)[STAFF_SESSION_COOKIE];
  return token || null;
}

/** SHA-256 do token da sessão atual — o que as RPCs de mutação recebem. */
export function getStaffSessionDigest(req: any): string | null {
  const token = getStaffSessionToken(req);
  return token ? sha256Hex(token) : null;
}

/** Grava o cookie httpOnly com o token cru (só chamado uma vez, no login). */
export function setStaffSessionCookie(res: any, rawToken: string) {
  const isProd = process.env.NODE_ENV === 'production';
  const attrs = [
    `${STAFF_SESSION_COOKIE}=${encodeURIComponent(rawToken)}`,
    'HttpOnly',
    'Path=/',
    'SameSite=Lax',
    `Max-Age=${SESSION_MAX_AGE_SECONDS}`,
  ];
  if (isProd) attrs.push('Secure');
  res.setHeader('Set-Cookie', attrs.join('; '));
}

/** Remove o cookie de sessão (logout). */
export function clearStaffSessionCookie(res: any) {
  const isProd = process.env.NODE_ENV === 'production';
  const attrs = [`${STAFF_SESSION_COOKIE}=`, 'HttpOnly', 'Path=/', 'SameSite=Lax', 'Max-Age=0'];
  if (isProd) attrs.push('Secure');
  res.setHeader('Set-Cookie', attrs.join('; '));
}

/** Respostas de sessão/PII nunca podem ser cacheadas (identidade/permissões stale pós-logout/revogação). */
export function setNoStoreHeaders(res: any) {
  res.setHeader('Cache-Control', 'private, no-store');
}

/** DTO seguro devolvido pelas RPCs de staff — nunca inclui password/hash/token. */
export interface StaffSessionUser {
  id: string;
  name: string;
  email: string;
  role_id: string | null;
  role: { id: string; name: string; description?: string; level?: number } | string | null;
  permissions: Record<string, boolean> | any;
  status: string;
  avatar_url?: string | null;
  phone?: string | null;
  theme?: string | null;
  receives_leads?: boolean;
}

/**
 * Completa o DTO com metadados do cargo (SITE_Roles) quando a RPC devolveu só
 * role_id — busca APENAS id/name/description/level, nunca `permissions`: as
 * permissões efetivas já vêm filtradas da RPC (contrato 0091). Fazer merge/
 * fallback com SITE_Roles.permissions aqui reintroduziria chaves fora do
 * conjunto pretendido e semântica errada (permissão "de cargo" ≠ "efetiva").
 */
export async function enrichWithRole(supabase: SupabaseClient, row: any): Promise<StaffSessionUser> {
  let role = row.role ?? null;
  if (row.role_id && (!role || typeof role === 'string')) {
    const { data: roleData } = await supabase
      .from('SITE_Roles')
      .select('id, name, description, level')
      .eq('id', row.role_id)
      .maybeSingle();
    if (roleData) role = roleData;
  }
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role_id: row.role_id ?? null,
    role: role ?? row.role ?? null,
    permissions: row.permissions ?? {},
    status: row.status,
    avatar_url: row.avatar_url ?? null,
    phone: row.phone ?? null,
    theme: row.theme ?? null,
    receives_leads: Boolean(row.receives_leads),
  };
}

/**
 * Valida o cookie da requisição contra `site_staff_session_validar` (RPC
 * recebe só o digest — nunca o token cru, nunca um id declarado pelo cliente).
 * Devolve o DTO seguro do usuário logado, ou null se não houver sessão válida.
 */
export async function requireStaffSession(req: any): Promise<StaffSessionUser | null> {
  const digest = getStaffSessionDigest(req);
  if (!digest) return null;
  const supabase = getServiceClient();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.rpc('site_staff_session_validar', { p_token_sha256: digest });
    if (error) {
      console.error('[auth] site_staff_session_validar falhou:', error.message);
      return null;
    }
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return null;
    return await enrichWithRole(supabase, row);
  } catch (err) {
    console.error('[auth] Erro inesperado validando sessão:', err);
    return null;
  }
}

/** Resposta padrão de bloqueio (sessão ausente/inválida). */
export function denyAuth(res: any) {
  return res.status(401).json({ success: false, error: 'Não autorizado' });
}

/** Resposta de permissão insuficiente (sessão válida, mas sem a permissão exigida). */
export function denyForbidden(res: any) {
  return res.status(403).json({ success: false, error: 'forbidden' });
}

// ─── Allowlist de permissões (nunca repassar o JSONB bruto do banco) ────────
const KNOWN_PERMISSION_KEYS = new Set(ALL_PERMISSION_KEYS);

/**
 * Filtra um objeto de permissões pra só as chaves reconhecidas em
 * `PERMISSION_CATALOG` (lib/permissions.ts, fonte única). Usado tanto nos
 * DTOs administrativos (`GET /api/staff/users|roles`, nunca vazar uma chave
 * ERP ou fora do vocabulário do site) quanto na ENTRADA de `POST/PUT
 * /api/staff/users|roles` (nunca encaminhar pra RPC uma chave desconhecida
 * que o cliente tenha mandado).
 *
 * Preserva `true` E `false` explícitos pra chaves conhecidas — um `false`
 * explícito é um override que precisa VENCER o `true` do cargo (mesma regra
 * "explícito vence" de `createPermissionResolver`); se este filtro só
 * mantivesse `true`, o override de desligar uma permissão desapareceria e o
 * fallback do cargo voltaria a conceder o que foi negado.
 */
export function filterKnownPermissions(raw: unknown): Record<string, boolean> {
  if (!raw || typeof raw !== 'object') return {};
  const source = raw as Record<string, unknown>;
  const out: Record<string, boolean> = {};
  for (const key of KNOWN_PERMISSION_KEYS) {
    if (typeof source[key] === 'boolean') out[key] = source[key] as boolean;
  }
  return out;
}

/**
 * admin_access só autoriza se vier `true` no DTO — nunca por nome/texto de
 * role. Exportada porque `_s2s.ts` precisa da mesma checagem pro ator
 * rehidratado (mesma regra de autorização, venha a sessão de cookie ou de
 * uma chamada S2S).
 */
export function isPermissionGranted(perms: Record<string, boolean> | undefined | null, permission: string): boolean {
  if (!perms) return false;
  if (perms.admin_access === true) return true;
  // Override individual na chave EXATA é TERMINAL — checado antes de
  // qualquer expansão por master switch. Um `false` explícito é uma
  // revogação deliberada (ex.: override de usuário sobre um papel que
  // concede `manage_marketing:true`); nenhum master pode ressuscitá-la, e um
  // `true` explícito já basta por si só, sem precisar do master. Só quando
  // NÃO há override pra essa chave exata (`undefined`) é que o master entra
  // em jogo abaixo.
  if (typeof perms[permission] === 'boolean') return perms[permission] === true;
  // Master switch do módulo de marketing (mesma regra de lib/permissions.ts) —
  // só se aplica na ausência de override individual pra essa chave.
  if (permission.startsWith('marketing_') && perms.manage_marketing === true) return true;
  return false;
}

/**
 * Exige sessão válida (401 se não houver) E a permissão exata (403 se a
 * sessão é válida mas falta a chave). Devolve o DTO quando autorizado, ou
 * null quando já respondeu (o caller só precisa checar `if (!staff) return;`).
 */
export async function requireStaffPermission(
  req: any,
  res: any,
  permission: string,
): Promise<StaffSessionUser | null> {
  const staff = await requireStaffSession(req);
  if (!staff) {
    denyAuth(res);
    return null;
  }
  if (!isPermissionGranted(staff.permissions, permission)) {
    denyForbidden(res);
    return null;
  }
  return staff;
}

/**
 * Igual a `requireStaffPermission`, mas basta UMA das chaves da lista. Para
 * leituras que servem a papéis diferentes pelo mesmo endpoint — ex.: o status
 * da conexão do WhatsApp, que o admin lê para configurar o motor e o atendente
 * lê só para saber se pode enviar. Sem isso o atendente (que tem
 * `whatsapp_send` mas não `whatsapp_engine_config`) tomaria 403 e ficaria com
 * o compositor travado.
 */
export async function requireStaffAnyPermission(
  req: any,
  res: any,
  permissions: readonly string[],
): Promise<StaffSessionUser | null> {
  const staff = await requireStaffSession(req);
  if (!staff) {
    denyAuth(res);
    return null;
  }
  if (!permissions.some((p) => isPermissionGranted(staff.permissions, p))) {
    denyForbidden(res);
    return null;
  }
  return staff;
}

/** Middleware Express: aplica requireStaffPermission antes do handler da rota. */
export function requireStaffPermissionMiddleware(permission: string) {
  return async (req: any, res: any, next: any) => {
    const staff = await requireStaffPermission(req, res, permission);
    if (!staff) return;
    (req as any).staffUser = staff;
    next();
  };
}

// ─── CSRF: gate same-origin fail-closed para rotas mutáveis ─────────────────
// O cookie de sessão é enviado automaticamente pelo browser em qualquer
// request, inclusive disparado por outro site — por isso toda rota que MUTA
// estado a partir da sessão (POST/PUT/PATCH/DELETE) precisa confirmar que o
// pedido partiu do próprio site antes de sequer olhar o cookie. Sem sinal
// algum (nem Sec-Fetch-Site nem Origin) o pedido é BLOQUEADO — fail-closed,
// não fail-open — porque isso é exatamente o padrão de um POST forjado fora
// do browser (curl, <form> cross-site sem JS) ou de um browser antigo.

// Origens confiáveis usadas SÓ pra dev/test quando STAFF_TRUSTED_ORIGINS não
// está configurada — nunca usadas em produção (ver canonicalTrustedOrigins).
const DEV_FALLBACK_ORIGINS = ['http://127.0.0.1:5173', 'http://localhost:5173'];

/**
 * true se `rawHostname` (como devolvido por `URL.hostname`, ou equivalente)
 * é uma variante conhecida de localhost/loopback. Usado tanto por
 * `normalizeOriginEntry` (abaixo) quanto pelo gate de startup
 * (`validateProductionConfig` em server/index.ts) — centralizado aqui pra
 * nunca divergir entre os dois. Cobre: 'localhost' exato ou como FQDN com
 * ponto final, subdomínios de localhost, todo o bloco 127.0.0.0/8 (não só
 * 127.0.0.1), 0.0.0.0, e IPv6 loopback — com e sem colchetes (`URL.hostname`
 * devolve `[::1]` pra literais IPv6), forma completa `::1`/expandida, e a
 * forma IPv4-mapeada `::ffff:127.x.x.x`. Essa última quase nunca sobrevive
 * como texto decimal: o parser de URL do Node canonicaliza
 * `::ffff:127.0.0.1` pra `::ffff:7f00:1` (0x7f = 127, os dois últimos
 * octetos viram o segundo grupo hex) — por isso checa as DUAS formas,
 * decimal (defensivo, caso outro parser não canonicalize) e hex (o que o
 * Node realmente produz).
 */
export function isLoopbackHostname(rawHostname: string): boolean {
  const hostname = String(rawHostname || '')
    .toLowerCase()
    .replace(/^\[|\]$/g, '') // colchetes de literal IPv6 em URL.hostname
    .replace(/\.$/, ''); // ponto final de FQDN
  if (hostname === 'localhost' || hostname.endsWith('.localhost')) return true;
  if (hostname === '0.0.0.0') return true;
  if (/^127\.\d+\.\d+\.\d+$/.test(hostname)) return true;
  if (hostname === '::1' || hostname === '0:0:0:0:0:0:0:1') return true;
  // IPv4-mapeado: forma decimal (defensiva) e forma hex (o que o Node
  // efetivamente canonicaliza pra endereços em 127.0.0.0/8 — 0x7f é 127).
  if (/^::ffff:127\.\d+\.\d+\.\d+$/.test(hostname)) return true;
  if (/^::ffff:7f[0-9a-f]{2}:[0-9a-f]{1,4}$/.test(hostname)) return true;
  return false;
}

/**
 * Normaliza uma origem (entrada de STAFF_TRUSTED_ORIGINS OU header `Origin`
 * recebido) via `URL.origin` — aceita barra final (`https://dominio.com/`
 * vira `https://dominio.com`, igual ao que um browser manda no header
 * Origin, que nunca tem barra/path), mas rejeita path real, query, hash e
 * userinfo. Sem essa normalização nos DOIS lados, uma config com barra final
 * (que passa na validação de startup) nunca bateria contra o Origin real do
 * browser — allowlist tecnicamente "configurada" mas bloqueando tudo em
 * silêncio. Devolve null se a entrada não for uma URL válida.
 *
 * Em NODE_ENV=production, também rejeita protocolo != https e hostnames
 * localhost/loopback (`isLoopbackHostname`) — direto aqui dentro, não só no
 * startup do Express (`validateProductionConfig` em server/index.ts).
 * Entrypoints serverless (api/*.ts na Vercel) não passam por esse startup e
 * chamam esta função diretamente tanto pra normalizar STAFF_TRUSTED_ORIGINS
 * quanto o Origin recebido — sem o gate aqui dentro, um valor http/localhost
 * colado em produção (config errada ou, do lado do Origin, um cenário
 * não-browser) passaria batido. Fora de produção, http é permitido pros
 * fallbacks locais.
 */
export function normalizeOriginEntry(raw: string): string | null {
  try {
    const u = new URL(raw);
    if (u.pathname !== '/' && u.pathname !== '') return null;
    if (u.search || u.hash) return null;
    if (u.username || u.password) return null;
    if (process.env.NODE_ENV === 'production') {
      if (u.protocol !== 'https:') return null;
      if (isLoopbackHostname(u.hostname)) return null;
    }
    return u.origin;
  } catch {
    return null;
  }
}

/**
 * Allowlist CANÔNICA de origens confiáveis — nunca derivada de headers do
 * próprio request (Host/X-Forwarded-Host são controlados pelo cliente: um
 * atacante que manda `Origin: https://evil.com` também consegue mandar
 * `Host: evil.com` ou `X-Forwarded-Host: evil.com`, e comparar Origin contra
 * um valor tirado desses headers vira uma checagem que sempre bate sozinha —
 * não valida nada).
 *
 * Fonte única: `STAFF_TRUSTED_ORIGINS` (lista separada por vírgula, cada
 * entrada normalizada por `normalizeOriginEntry`). Em produção, sem essa env
 * configurada, a allowlist fica VAZIA — fail-closed (todo POST/PUT/DELETE é
 * bloqueado até um operador configurar, nunca cai pra confiar em algo que o
 * cliente controla). Fora de produção, sem a env, cai pros origins de dev
 * conhecidos (Vite local) — só por conveniência de ambiente local/test,
 * nunca em produção.
 */
export function canonicalTrustedOrigins(): Set<string> {
  const configured = String(process.env.STAFF_TRUSTED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => normalizeOriginEntry(s))
    .filter((s): s is string => s !== null);
  if (configured.length > 0) return new Set(configured);

  const isProd = process.env.NODE_ENV === 'production';
  return isProd ? new Set() : new Set(DEV_FALLBACK_ORIGINS);
}

/**
 * true só quando o Origin da requisição bate contra a allowlist canônica
 * (`STAFF_TRUSTED_ORIGINS`, via `canonicalTrustedOrigins()`) — a ÚNICA fonte
 * de confiança pra conceder acesso. `Sec-Fetch-Site` é um header que só um
 * NAVEGADOR real define de forma confiável; fora de um navegador (curl,
 * qualquer cliente HTTP arbitrário) é só mais um valor que o próprio
 * chamador escolhe mandar — não prova nada sozinho. Um request forjado com
 * `Origin: https://evil.example` + `Sec-Fetch-Site: same-origin` bypassava
 * a allowlist por completo (o atalho de Sec-Fetch-Site decidia ANTES de
 * sequer olhar o Origin) — corrigido: agora Sec-Fetch-Site só pode REFORÇAR
 * uma rejeição mais cedo quando sinaliza explicitamente `cross-site`
 * (sinal que um browser real não mentiria a favor de um atacante), nunca
 * conceder acesso por si só. Conceder sempre passa pelo Origin+allowlist.
 */
export function isSameOriginRequest(req: any): boolean {
  const secFetchSite = String(req.headers?.['sec-fetch-site'] || '').toLowerCase();
  if (secFetchSite && secFetchSite !== 'same-origin' && secFetchSite !== 'none') {
    return false;
  }

  const originHeader = String(req.headers?.origin || '').trim();
  if (!originHeader) return false;
  const normalized = normalizeOriginEntry(originHeader);
  if (!normalized) return false;
  return canonicalTrustedOrigins().has(normalized);
}

/**
 * Checagem ESTRITA — sem o atalho de Sec-Fetch-Site (que é confiável só
 * quando um browser real o define; uma ferramenta fora do browser, tipo
 * curl, consegue mandar qualquer valor nesse header). Usada em rotas
 * públicas de alto valor (ex.: criação de checkout) onde não há cookie de
 * sessão nenhum pra servir de segunda camada — o Origin explícito e validado
 * contra a allowlist é a ÚNICA prova aceita de que o pedido partiu do site.
 */
export function requireExplicitTrustedOrigin(req: any, res: any): boolean {
  const originHeader = String(req.headers?.origin || '').trim();
  const normalized = originHeader ? normalizeOriginEntry(originHeader) : null;
  if (normalized && canonicalTrustedOrigins().has(normalized)) return true;
  res.status(403).json({ success: false, error: 'origin_not_allowed' });
  return false;
}

/** 403 se o pedido não for same-origin; devolve true quando pode prosseguir. */
export function requireSameOrigin(req: any, res: any): boolean {
  if (isSameOriginRequest(req)) return true;
  res.status(403).json({ success: false, error: 'origin_not_allowed' });
  return false;
}

/** Middleware Express: aplica requireSameOrigin em métodos que mutam estado. */
export function requireSameOriginMiddleware(req: any, res: any, next: any) {
  const method = String(req.method || 'GET').toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return next();
  if (!requireSameOrigin(req, res)) return;
  next();
}

/**
 * Atalho para handlers estilo Vercel (req, res): valida a sessão e já
 * responde 401 se não houver uma. Devolve null quando bloqueou (o caller só
 * precisa checar `if (!staff) return;`). Sem checagem de permissão — usar
 * `requireStaffPermission` quando a rota precisar de uma chave específica.
 */
export async function requireStaff(req: any, res: any): Promise<StaffSessionUser | null> {
  const staff = await requireStaffSession(req);
  if (!staff) {
    denyAuth(res);
    return null;
  }
  return staff;
}

// ─── IP do cliente — só pra rate-limit, nunca pra autorização ───────────────
// Atrás de proxy (Traefik/nginx), req.socket.remoteAddress é o IP do PRÓPRIO
// PROXY, não do cliente — usá-lo como chave individualizaria rate-limit em
// UM balde só (ok como fallback deliberado, não por engano). x-forwarded-for
// pode ter vários hops; só o ÚLTIMO é o que o proxy confiável anexou — hops
// anteriores são o que o cliente mandou e podem ser forjados.
export function clientIp(req: any): string {
  const xff = String(req.headers?.['x-forwarded-for'] || '');
  if (xff) {
    const hops = xff.split(',').map((h) => h.trim()).filter(Boolean);
    const last = hops[hops.length - 1];
    if (last && isIP(last)) return last;
  }
  const real = String(req.headers?.['x-real-ip'] || '').trim();
  if (real && isIP(real)) return real;
  // Sem sinal confiável na topologia — balde compartilhado (nunca o IP do
  // proxy tratado como se fosse individual).
  return 'unknown';
}

// ─── Rate limiter genérico por IP (hash), bounded + TTL ─────────────────────
// Fábrica reutilizada pelo login de staff e por endpoints públicos (ex.:
// create-stripe-checkout) que precisam de defesa por IP sem sessão nenhuma.
// Chave = hash do IP (nunca o IP cru em memória). Map com teto absoluto +
// poda de expirados — nunca cresce sem limite.
export interface RateLimiter {
  /** true = este IP já estourou o limite de tentativas na janela atual. */
  isLimited(req: any): boolean;
}

export function createIpRateLimiter(opts: { windowMs: number; maxAttempts: number; maxEntries?: number }): RateLimiter {
  const { windowMs, maxAttempts, maxEntries = 5000 } = opts;
  const attempts = new Map<string, { count: number; resetAt: number }>();

  function pruneExpired(now: number) {
    for (const [key, entry] of attempts) {
      if (entry.resetAt <= now) attempts.delete(key);
    }
  }

  return {
    isLimited(req: any): boolean {
      const key = sha256Hex(clientIp(req));
      const now = Date.now();
      const existing = attempts.get(key);
      if (existing && existing.resetAt > now) {
        existing.count += 1;
        return existing.count > maxAttempts;
      }
      pruneExpired(now);
      if (attempts.size >= maxEntries) {
        const oldestKey = attempts.keys().next().value;
        if (oldestKey !== undefined) attempts.delete(oldestKey);
      }
      attempts.set(key, { count: 1, resetAt: now + windowMs });
      return false;
    },
  };
}

// ─── Rehidratação de ator (usada pelo boundary S2S em _s2s.ts) ──────────────
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Busca o usuário/permissões ATUAIS de um ator declarado por UUID (chamada
 * S2S) — NUNCA confia nas permissões que o ERP alega ter, sempre relê
 * SITE_Users/SITE_Roles no momento da chamada. Exige o usuário Active;
 * inativo/inexistente devolve null.
 *
 * Diferente de `enrichWithRole` (usado no fluxo de cookie, onde a RPC 0091
 * já devolve `permissions` EFETIVAS prontas): aqui a leitura é direta da
 * tabela, então `row.permissions` é só o override pessoal do usuário — um
 * ator que herda permissão inteiramente do CARGO (sem override próprio)
 * ficaria com `permissions: {}` e seria negado em tudo se eu só repassasse
 * essa coluna crua. Por isso o merge (papel como base, override do usuário
 * vencendo explicitamente — inclusive `false` — mesma regra de
 * `createPermissionResolver` em lib/permissions.ts) acontece aqui, e só
 * então passa pela allowlist.
 */
export async function rehydrateActor(supabase: SupabaseClient, actorId: string): Promise<StaffSessionUser | null> {
  if (!UUID_RE.test(actorId)) return null;
  const { data: row, error } = await supabase
    .from('SITE_Users')
    .select('id, name, email, role_id, status, permissions')
    .eq('id', actorId)
    .maybeSingle();
  if (error || !row) return null;
  if (row.status && String(row.status).toLowerCase() === 'inactive') return null;

  let roleMeta: StaffSessionUser['role'] = null;
  let rolePermissions: Record<string, unknown> = {};
  if (row.role_id) {
    const { data: roleData } = await supabase
      .from('SITE_Roles')
      .select('id, name, description, level, permissions')
      .eq('id', row.role_id)
      .maybeSingle();
    if (roleData) {
      roleMeta = { id: roleData.id, name: roleData.name, description: roleData.description, level: roleData.level };
      rolePermissions = roleData.permissions || {};
    }
  }
  const merged = { ...rolePermissions, ...(row.permissions || {}) };

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role_id: row.role_id ?? null,
    role: roleMeta,
    permissions: filterKnownPermissions(merged),
    status: row.status,
    avatar_url: null,
    phone: null,
    theme: null,
    receives_leads: false,
  };
}
