import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import {
  clearStaffSessionCookie,
  clientIp,
  denyAuth,
  enrichWithRole,
  filterKnownPermissions,
  getServiceClient,
  getStaffSessionDigest,
  requireSameOriginMiddleware,
  requireStaffPermissionMiddleware,
  requireStaffSession,
  setNoStoreHeaders,
  setStaffSessionCookie,
  sha256Hex,
  type StaffSessionUser,
} from '../api/_auth.js';

/**
 * Rotas /api/staff — identidade e sessão do painel administrativo.
 *
 * Substitui o modelo anterior (localStorage `wtech_user` como fonte de
 * verdade + header `x-wtech-user-id` auto-declarado pelo browser). Agora:
 *   - o login grava um cookie httpOnly com um token opaco;
 *   - toda leitura/mutação valida esse cookie no servidor (SHA-256 do token
 *     vira o "digest" que os RPCs recebem — nunca um UUID declarado pelo
 *     cliente);
 *   - mutações e leituras de PII exigem a permissão exata (allowlist de
 *     `lib/permissions.ts`), não só "qualquer staff logado";
 *   - o React só guarda um CACHE derivado de GET /api/staff/me — nunca é a
 *     autoridade.
 *
 * Contrato SQL 0091 (ERP) — fechado, 26/26 em dois PG16 fresh:
 *   site_staff_session_criar(p_email, p_password, p_origem default 'site')
 *     → linha única { token, id, name, email, role_id, role?, permissions,
 *       status, avatar_url, phone, theme }. `token` é o segredo cru,
 *       devolvido só nesta chamada. Throttle por e-mail é atômico dentro
 *       dela — o rate limit local aqui é só defesa por IP.
 *   site_staff_session_validar(p_token_sha256) → mesma linha, sem `token`.
 *   site_staff_session_revogar(p_token_sha256) → void/boolean.
 *   site_staff_usuario_salvar(p_ator_token_sha256, p_usuario_id, p_nome,
 *     p_email, p_telefone, p_avatar, p_role_id, p_status, p_permissoes,
 *     p_password, p_receives_leads default null) — 11 args. UPDATE
 *     (p_usuario_id != null): p_permissoes=NULL preserva os overrides
 *     existentes (nunca mandar {} pra "não mexer" — isso apagaria tudo).
 *     CREATE (p_usuario_id = null): sem permissões explícitas usa {}.
 *   site_staff_usuario_excluir(p_ator_token_sha256, p_usuario_id) → void.
 *   site_staff_papel_salvar(p_ator_token_sha256, p_papel_id, p_nome,
 *     p_permissoes, p_descricao default null, p_nivel default null) — 6 args.
 *     Mesma regra NULL-preserva/{}-cria do usuario_salvar, por p_papel_id.
 *   site_staff_papel_excluir(p_ator_token_sha256, p_papel_id) → void.
 *   site_staff_tema_definir(p_token_sha256, p_tema) → void/DTO atualizado.
 *   site_staff_perfil_definir(p_token_sha256, p_name, p_phone, p_avatar_url)
 *     → DTO seguro atualizado (autoatendimento — name/phone/avatar; único
 *     ponto do contrato em inglês, os demais usam nomes em português).
 *
 * A autorização de QUEM pode criar/editar/excluir usuário ou cargo continua
 * decidida dentro dessas RPCs a partir do digest (defesa em profundidade no
 * SQL) — o `manage_users` aplicado aqui é o gate do ENDPOINT em si, pra
 * negar antes de sequer tentar a RPC ou devolver PII no GET.
 */

// ─── Rate limit do login (em memória — processo único na VPS) ───────────────
// O throttle por e-mail agora é atômico dentro da própria RPC
// site_staff_session_criar (contrato 0091) — este limiter local vira só
// defesa por IP. Chave = hash do IP (nunca o IP cru em memória). Map com
// teto absoluto de entradas + poda de expiradas: nunca cresce sem limite
// mesmo sob varredura de IPs distintos.
const LOGIN_WINDOW_MS = 10 * 60 * 1000; // 10 min
const LOGIN_MAX_ATTEMPTS = 8;
const LOGIN_MAP_MAX_ENTRIES = 5000;
const MAX_EMAIL_LENGTH = 254; // RFC 5321
const loginAttemptsByIpHash = new Map<string, { count: number; resetAt: number }>();

function pruneExpiredLoginAttempts(now: number) {
  for (const [key, entry] of loginAttemptsByIpHash) {
    if (entry.resetAt <= now) loginAttemptsByIpHash.delete(key);
  }
}

/** true = IP (com hash) já estourou o limite de tentativas na janela atual. */
function loginRateLimitedByIp(ipHash: string): boolean {
  const now = Date.now();
  const existing = loginAttemptsByIpHash.get(ipHash);
  if (existing && existing.resetAt > now) {
    existing.count += 1;
    return existing.count > LOGIN_MAX_ATTEMPTS;
  }

  // Entrada nova ou expirada: poda o que já venceu e, se mesmo assim o Map
  // estiver no teto absoluto, derruba a mais antiga (FIFO) — teto real, não
  // só "na prática não deveria crescer".
  pruneExpiredLoginAttempts(now);
  if (loginAttemptsByIpHash.size >= LOGIN_MAP_MAX_ENTRIES) {
    const oldestKey = loginAttemptsByIpHash.keys().next().value;
    if (oldestKey !== undefined) loginAttemptsByIpHash.delete(oldestKey);
  }
  loginAttemptsByIpHash.set(ipHash, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
  return false;
}

// ─── Helpers (mesmo padrão de server/approvals.ts) ───────────────────────────

function h(fn: (req: Request, res: Response) => Promise<unknown>) {
  return async (req: Request, res: Response) => {
    try {
      await fn(req, res);
    } catch (e: any) {
      console.error(`[staff] Erro não tratado em ${req.method} ${req.originalUrl}:`, e);
      if (!res.headersSent) res.status(500).json({ error: 'Internal server error' });
    }
  };
}

function requireSupabase(res: Response) {
  const supabase = getServiceClient();
  if (!supabase) {
    res.status(503).json({ error: 'supabase_unavailable' });
    return null;
  }
  return supabase;
}

/** Qualquer sessão de staff válida (sem exigir permissão específica). */
async function requireUser(req: Request, res: Response, next: NextFunction) {
  const staff = await requireStaffSession(req);
  if (!staff) return denyAuth(res);
  (req as Request & { staffUser?: StaffSessionUser }).staffUser = staff;
  next();
}

/** Sessão + permissão de gerenciar equipe (usuários e cargos). */
const requireManageUsers = requireStaffPermissionMiddleware('manage_users');

/** Extrai a primeira linha de uma resposta RPC (Supabase pode devolver array). */
function firstRow(data: unknown): any {
  return Array.isArray(data) ? data[0] : data;
}

/**
 * Resolve o valor de `p_permissoes` pra mandar à RPC — SEMPRE passando pela
 * allowlist (`filterKnownPermissions`) antes, nunca repassando o body bruto
 * do cliente: sem isso, um cliente conseguiria injetar uma chave desconhecida
 * (ERP ou qualquer coisa fora do catálogo) direto na coluna `permissions`.
 *
 * Distingue três estados do campo no body:
 *   - campo AUSENTE (undefined): CREATE usa {} (nada a herdar ainda); UPDATE
 *     usa NULL (não mexe nos overrides existentes — nunca compensar com {},
 *     isso apagaria tudo).
 *   - campo presente (mesmo `{}` vazio): filtra pela allowlist e usa o
 *     resultado, seja CREATE ou UPDATE.
 */
function permissionsForRpc(rawPermissions: unknown, isCreate: boolean): Record<string, boolean> | null {
  if (rawPermissions === undefined) {
    return isCreate ? {} : null;
  }
  return filterKnownPermissions(rawPermissions);
}

export const staffAuthRouter = Router();

// Respostas de sessão/PII nunca cacheadas — evita identidade/permissões
// stale no browser (ou em qualquer cache intermediário) após logout/revogação.
staffAuthRouter.use((req, res, next) => {
  setNoStoreHeaders(res);
  next();
});

// Gate CSRF fail-closed: qualquer método que muta estado (tudo aqui, exceto
// GET /me, /users, /roles, /directory) precisa vir same-origin (Sec-Fetch-Site
// ou Origin == host do request). Aplica também ao /login — impede que outro
// site force o login da vítima na sessão do atacante.
staffAuthRouter.use(requireSameOriginMiddleware);

// ─── POST /api/staff/login ───────────────────────────────────────────────────
staffAuthRouter.post('/login', h(async (req, res) => {
  const supabase = requireSupabase(res);
  if (!supabase) return;

  // IP bloqueado retorna cedo — nem chega a validar e-mail/senha nem a tocar
  // no banco (o throttle por e-mail é responsabilidade da RPC agora).
  const ipHash = sha256Hex(clientIp(req));
  if (loginRateLimitedByIp(ipHash)) {
    return res.status(429).json({ success: false, error: 'Muitas tentativas. Tente novamente em alguns minutos.' });
  }

  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'E-mail e senha são obrigatórios.' });
  }
  if (email.length > MAX_EMAIL_LENGTH) {
    return res.status(400).json({ success: false, error: 'E-mail inválido.' });
  }

  const { data, error } = await supabase.rpc('site_staff_session_criar', {
    p_email: email,
    p_password: password,
    p_origem: 'site',
  });

  if (error) {
    console.error('[staff] site_staff_session_criar falhou:', error.message);
    return res.status(500).json({ success: false, error: 'Erro de conexão.' });
  }

  const row = firstRow(data);
  const rawToken = row?.token;
  if (!row || !rawToken) {
    return res.status(401).json({ success: false, error: 'Credenciais inválidas.' });
  }

  const user = await enrichWithRole(supabase, row);

  setStaffSessionCookie(res, String(rawToken));
  return res.status(200).json({ success: true, user });
}));

// ─── GET /api/staff/me — sessão atual (fonte de verdade do React) ──────────
staffAuthRouter.get('/me', h(async (req, res) => {
  const staff = await requireStaffSession(req);
  if (!staff) return res.status(401).json({ success: false, error: 'Não autenticado' });
  return res.status(200).json({ success: true, user: staff });
}));

// ─── POST /api/staff/logout ──────────────────────────────────────────────────
staffAuthRouter.post('/logout', h(async (req, res) => {
  const digest = getStaffSessionDigest(req);

  // O cookie SEMPRE é limpo no browser do usuário atual — mas se a revogação
  // no banco falhar, um cookie roubado (cópia fora deste browser) continua
  // válido lá. Por isso não respondemos success:true nesse caso: o cliente
  // precisa saber que o logout não foi garantido do lado do servidor.
  let revoked = true;
  if (digest) {
    const supabase = getServiceClient();
    if (!supabase) {
      revoked = false;
    } else {
      try {
        const { error } = await supabase.rpc('site_staff_session_revogar', { p_token_sha256: digest });
        if (error) {
          console.error('[staff] site_staff_session_revogar falhou:', error.message);
          revoked = false;
        }
      } catch (err: any) {
        console.error('[staff] site_staff_session_revogar lançou exceção:', err?.message || err);
        revoked = false;
      }
    }
  }

  clearStaffSessionCookie(res);

  if (!revoked) {
    return res.status(503).json({ success: false, error: 'logout_incomplete' });
  }
  return res.status(200).json({ success: true });
}));

// ─── POST /api/staff/theme — tema do usuário logado ──────────────────────────
staffAuthRouter.post('/theme', requireUser, h(async (req, res) => {
  const supabase = requireSupabase(res);
  if (!supabase) return;
  const digest = getStaffSessionDigest(req)!;

  const theme = String(req.body?.theme || '').trim();
  if (!['light', 'dark', 'system'].includes(theme)) {
    return res.status(400).json({ success: false, error: 'invalid_theme' });
  }

  const { error } = await supabase.rpc('site_staff_tema_definir', {
    p_token_sha256: digest,
    p_tema: theme,
  });
  if (error) {
    console.error('[staff] site_staff_tema_definir falhou:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
  return res.status(200).json({ success: true });
}));

// ─── POST /api/staff/profile — autoatendimento (name/phone/avatar) ──────────
staffAuthRouter.post('/profile', requireUser, h(async (req, res) => {
  const supabase = requireSupabase(res);
  if (!supabase) return;
  const digest = getStaffSessionDigest(req)!;
  const staff = (req as Request & { staffUser?: StaffSessionUser }).staffUser!;

  // p_name é obrigatório na RPC (não aceita vazio/nulo) — em updates parciais
  // (ex.: só avatar, do upload de foto), completa com o nome ATUAL da sessão
  // já autenticada, nunca com algo declarado sem validação.
  const nameInput = req.body?.name !== undefined ? String(req.body.name).trim() : '';
  const name = nameInput || staff.name;
  const phone = req.body?.phone !== undefined ? String(req.body.phone).trim() : null;
  const avatarUrl = req.body?.avatar_url !== undefined ? String(req.body.avatar_url).trim() : null;

  const { data, error } = await supabase.rpc('site_staff_perfil_definir', {
    p_token_sha256: digest,
    p_name: name,
    p_phone: phone,
    p_avatar_url: avatarUrl,
  });
  if (error) {
    console.error('[staff] site_staff_perfil_definir falhou:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
  const row = firstRow(data);
  return res.status(200).json({ success: true, user: row || null });
}));

// ─── POST /api/staff/password — troca de senha (autoatendimento) ────────────
// RPC site_staff_senha_trocar(p_token_sha256, p_senha_atual, p_senha_nova) →
// boolean. Sucesso REVOGA TODAS as sessões do usuário (inclusive a atual) —
// por isso limpamos o cookie aqui mesmo em caso de sucesso, forçando novo
// login. `false` = senha atual errada OU nova inválida — mensagem genérica
// de propósito, nunca diferenciamos qual foi (evita enumeração).
staffAuthRouter.post('/password', requireUser, h(async (req, res) => {
  const supabase = requireSupabase(res);
  if (!supabase) return;
  const digest = getStaffSessionDigest(req)!;

  const currentPassword = String(req.body?.currentPassword || '');
  const newPassword = String(req.body?.newPassword || '');
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ success: false, error: 'Senha atual e nova senha são obrigatórias.' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ success: false, error: 'A nova senha deve ter pelo menos 8 caracteres.' });
  }

  let ok = false;
  try {
    const { data, error } = await supabase.rpc('site_staff_senha_trocar', {
      p_token_sha256: digest,
      p_senha_atual: currentPassword,
      p_senha_nova: newPassword,
    });
    if (error) {
      // Nunca logar senha/digest — só a mensagem do Postgres.
      console.error('[staff] site_staff_senha_trocar falhou:', error.message);
      return res.status(503).json({ success: false, error: 'Erro ao trocar a senha. Tente novamente.' });
    }
    ok = data === true || firstRow(data) === true;
  } catch (err: any) {
    console.error('[staff] site_staff_senha_trocar lançou exceção:', err?.message || err);
    return res.status(503).json({ success: false, error: 'Erro ao trocar a senha. Tente novamente.' });
  }

  if (!ok) {
    // Mensagem genérica — não diz se foi a senha atual ou a nova que falhou.
    return res.status(400).json({ success: false, error: 'Não foi possível trocar a senha. Verifique os dados e tente novamente.' });
  }

  // Sucesso revoga TODAS as sessões (a RPC já fez isso no banco) — o cookie
  // deste browser também precisa ser limpo, senão o cliente segue mandando
  // um token que o servidor já invalidou.
  clearStaffSessionCookie(res);
  return res.status(200).json({ success: true });
}));

// ─── GET /api/staff/directory — diretório mínimo (id + name) ────────────────
// Substitui as leituras diretas de SITE_Users espalhadas pelo browser (dropdown
// de atendente/responsável em CRM, Tarefas, Vendas, etc.). Qualquer sessão de
// staff válida pode ler — não expõe nada além de id/name, então não precisa
// de `manage_users` (isso quebraria dropdowns pra staff sem esse gerencial).
staffAuthRouter.get('/directory', requireUser, h(async (req, res) => {
  const supabase = requireSupabase(res);
  if (!supabase) return;
  const { data, error } = await supabase.from('SITE_Users').select('id, name').order('name');
  if (error) return res.status(500).json({ success: false, error: error.message });
  return res.status(200).json({ success: true, users: data || [] });
}));

// ─── Usuários (equipe) — GET e mutações exigem manage_users ─────────────────

// DTO explícito — nunca password/password_hash/face_descriptor. `permissions`
// vai filtrado por allowlist (filterKnownPermissions) antes de sair daqui.
const SAFE_USER_COLUMNS = 'id, name, email, role_id, role, status, receives_leads, avatar_url, phone, theme, permissions';

staffAuthRouter.get('/users', requireManageUsers, h(async (req, res) => {
  const supabase = requireSupabase(res);
  if (!supabase) return;
  const { data, error } = await supabase.from('SITE_Users').select(SAFE_USER_COLUMNS).order('name');
  if (error) return res.status(500).json({ success: false, error: error.message });
  const users = (data || []).map((u: any) => ({ ...u, permissions: filterKnownPermissions(u.permissions) }));
  return res.status(200).json({ success: true, users });
}));

staffAuthRouter.post('/users', requireManageUsers, h(async (req, res) => {
  const supabase = requireSupabase(res);
  if (!supabase) return;
  const digest = getStaffSessionDigest(req)!;

  const { name, email, password, phone, avatar_url, role_id, status, receives_leads, permissions } = req.body || {};
  if (!name || !email || !password) {
    return res.status(400).json({ success: false, error: 'Nome, e-mail e senha são obrigatórios.' });
  }

  const { data, error } = await supabase.rpc('site_staff_usuario_salvar', {
    p_ator_token_sha256: digest,
    p_usuario_id: null,
    p_nome: String(name).trim(),
    p_email: String(email).trim().toLowerCase(),
    p_telefone: phone ?? null,
    p_avatar: avatar_url ?? null,
    p_role_id: role_id || null,
    p_status: status || 'Active',
    p_permissoes: permissionsForRpc(permissions, true),
    p_password: String(password),
    p_receives_leads: receives_leads === undefined ? null : Boolean(receives_leads),
  });
  if (error) {
    console.error('[staff] site_staff_usuario_salvar (criar) falhou:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
  return res.status(200).json({ success: true, user: firstRow(data) || null });
}));

staffAuthRouter.put('/users/:id', requireManageUsers, h(async (req, res) => {
  const supabase = requireSupabase(res);
  if (!supabase) return;
  const digest = getStaffSessionDigest(req)!;

  const targetId = String(req.params.id || '').trim();
  if (!targetId) return res.status(400).json({ success: false, error: 'invalid_id' });

  const { name, email, password, phone, avatar_url, role_id, status, permissions, receives_leads } = req.body || {};
  if (!name || !email) {
    return res.status(400).json({ success: false, error: 'Nome e e-mail são obrigatórios.' });
  }

  // Update: NULL em p_permissoes significa NÃO ALTERAR (preserva overrides
  // existentes) — nunca compensar mandando {} aqui, isso apagaria overrides.
  const { data, error } = await supabase.rpc('site_staff_usuario_salvar', {
    p_ator_token_sha256: digest,
    p_usuario_id: targetId,
    p_nome: String(name).trim(),
    p_email: String(email).trim().toLowerCase(),
    p_telefone: phone ?? null,
    p_avatar: avatar_url ?? null,
    p_role_id: role_id || null,
    p_status: status || 'Active',
    p_permissoes: permissionsForRpc(permissions, false),
    p_password: password ? String(password) : null,
    p_receives_leads: receives_leads === undefined ? null : Boolean(receives_leads),
  });
  if (error) {
    console.error('[staff] site_staff_usuario_salvar (editar) falhou:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
  return res.status(200).json({ success: true, user: firstRow(data) || null });
}));

staffAuthRouter.delete('/users/:id', requireManageUsers, h(async (req, res) => {
  const supabase = requireSupabase(res);
  if (!supabase) return;
  const digest = getStaffSessionDigest(req)!;

  const targetId = String(req.params.id || '').trim();
  if (!targetId) return res.status(400).json({ success: false, error: 'invalid_id' });

  const { error } = await supabase.rpc('site_staff_usuario_excluir', {
    p_ator_token_sha256: digest,
    p_usuario_id: targetId,
  });
  if (error) {
    console.error('[staff] site_staff_usuario_excluir falhou:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
  return res.status(200).json({ success: true });
}));

// ─── Cargos (roles) — GET e mutações exigem manage_users ────────────────────

staffAuthRouter.get('/roles', requireManageUsers, h(async (req, res) => {
  const supabase = requireSupabase(res);
  if (!supabase) return;
  const { data, error } = await supabase
    .from('SITE_Roles')
    .select('id, name, description, permissions, level')
    .order('level', { ascending: false });
  if (error) return res.status(500).json({ success: false, error: error.message });
  // Allowlist aqui também — mesma cautela de nunca vazar chave fora de
  // PERMISSION_CATALOG (ERP ou qualquer outra coisa) num DTO administrativo.
  const roles = (data || []).map((r: any) => ({ ...r, permissions: filterKnownPermissions(r.permissions) }));
  return res.status(200).json({ success: true, roles });
}));

staffAuthRouter.post('/roles', requireManageUsers, h(async (req, res) => {
  const supabase = requireSupabase(res);
  if (!supabase) return;
  const digest = getStaffSessionDigest(req)!;

  const { name, permissions, description, level } = req.body || {};
  if (!name) return res.status(400).json({ success: false, error: 'Nome do cargo é obrigatório.' });

  const { data, error } = await supabase.rpc('site_staff_papel_salvar', {
    p_ator_token_sha256: digest,
    p_papel_id: null,
    p_nome: String(name).trim(),
    p_permissoes: permissionsForRpc(permissions, true),
    p_descricao: description ?? null,
    p_nivel: Number.isFinite(Number(level)) ? Number(level) : null,
  });
  if (error) {
    console.error('[staff] site_staff_papel_salvar (criar) falhou:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
  return res.status(200).json({ success: true, role: firstRow(data) || null });
}));

staffAuthRouter.put('/roles/:id', requireManageUsers, h(async (req, res) => {
  const supabase = requireSupabase(res);
  if (!supabase) return;
  const digest = getStaffSessionDigest(req)!;

  const roleId = String(req.params.id || '').trim();
  if (!roleId) return res.status(400).json({ success: false, error: 'invalid_id' });

  const { name, permissions, description, level } = req.body || {};
  if (!name) return res.status(400).json({ success: false, error: 'Nome do cargo é obrigatório.' });

  // Update: NULL em p_permissoes significa NÃO ALTERAR — mesma regra do
  // usuario_salvar; nunca compensar mandando {} aqui.
  const { data, error } = await supabase.rpc('site_staff_papel_salvar', {
    p_ator_token_sha256: digest,
    p_papel_id: roleId,
    p_nome: String(name).trim(),
    p_permissoes: permissionsForRpc(permissions, false),
    p_descricao: description ?? null,
    p_nivel: Number.isFinite(Number(level)) ? Number(level) : null,
  });
  if (error) {
    console.error('[staff] site_staff_papel_salvar (editar) falhou:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
  return res.status(200).json({ success: true, role: firstRow(data) || null });
}));

staffAuthRouter.delete('/roles/:id', requireManageUsers, h(async (req, res) => {
  const supabase = requireSupabase(res);
  if (!supabase) return;
  const digest = getStaffSessionDigest(req)!;

  const roleId = String(req.params.id || '').trim();
  if (!roleId) return res.status(400).json({ success: false, error: 'invalid_id' });

  const { error } = await supabase.rpc('site_staff_papel_excluir', {
    p_ator_token_sha256: digest,
    p_papel_id: roleId,
  });
  if (error) {
    console.error('[staff] site_staff_papel_excluir falhou:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
  return res.status(200).json({ success: true });
}));

// Nunca logar cookie/token/digest/senha — nem em erro (mensagens acima só
// repassam error.message do Postgres, que não inclui esses valores).
