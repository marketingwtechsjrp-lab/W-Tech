import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  denyAuth,
  denyForbidden,
  getServiceClient,
  isPermissionGranted,
  rehydrateActor,
  requireStaffPermission,
  type StaffSessionUser,
} from './_auth.js';

/**
 * Boundary server-to-server ERP → Site — fronteira `fronteira-erp-site-server-to-server`.
 *
 * Endpoints hoje usados pelo painel admin (staff via cookie) precisam TAMBÉM
 * aceitar chamadas do ERP (Gestão), que não tem cookie de browser nenhum.
 * Em vez de reabrir a rota pra "qualquer chamador com um id", cada request
 * S2S precisa provar posse de um segredo compartilhado (`SITE_API_SECRET`,
 * HMAC-SHA256) sobre um payload canônico que amarra método+path+corpo+tempo,
 * e declara um ATOR (UUID de SITE_Users) cujas permissões são relidas no
 * banco no momento da chamada — o ERP nunca decide sozinho o que o ator pode.
 *
 * Headers exigidos em toda chamada S2S:
 *   x-wtech-svc:       "gestao" (fixo — identifica o serviço chamador)
 *   x-wtech-timestamp: unix seconds — janela de ±300s (replay antigo expira)
 *   x-wtech-nonce:     hex de 16+ bytes (32+ chars), único por chamada —
 *                      cache de replay local barra reuso. Contrato v1: ERP
 *                      manda exatamente 32 chars hex (16 bytes = 128 bits).
 *   x-wtech-actor:     UUID de SITE_Users — rehidratado no banco, nunca
 *                      confiado como está (ver rehydrateActor em _auth.ts)
 *   x-wtech-signature: hex de HMAC-SHA256(SITE_API_SECRET, canonical)
 *
 * canonical = METHOD "\n" PATH(+query canônico) "\n" TIMESTAMP "\n" NONCE
 *             "\n" ACTOR "\n" SHA256(rawBody)-hex
 *
 * O nonce entra CRU na string canônica (faz parte do que é assinado) — nunca
 * normalizamos o case dele antes de montar `canonical`, só na validação de
 * formato (regex case-insensitive). Mudar o case mudaria a assinatura
 * esperada e toda chamada legítima do ERP falharia.
 *
 * PATH usa `req.originalUrl` (path completo tal como recebido, incluindo o
 * prefixo de montagem de qualquer Router — ex.: `/api/marketing/share`, não
 * só `/share`, que é o que `req.path` devolveria dentro do Router montado em
 * `/api/marketing`). Query reordenada por CODE POINT Unicode (chave e, em
 * empate, valor — não por code unit UTF-16, que trata pares substitutos
 * errado) e reserializada via `URLSearchParams` (espaço vira `+`, igual ao
 * padrão x-www-form-urlencoded). Isso precisa bater exatamente com o
 * comparador do lado ERP — hoje as rotas usam só chaves ASCII, então a
 * divergência de code point não se manifesta nos testes de contrato atuais,
 * mas o algoritmo abaixo é o que deve ser espelhado.
 *
 * Cache de replay: em memória, bounded + TTL — válido para UMA réplica do
 * processo (documentado; se o deploy for multi-réplica sem afinidade, cada
 * instância tem seu próprio cache e o replay só é barrado dentro da mesma
 * réplica — risco residual conhecido, não uma falha silenciosa). TTL =
 * 2× a janela de timestamp: um timestamp aceito no limite futuro (+janela)
 * ainda pode ser replayado até (+janela) além disso, então o nonce precisa
 * sobreviver no cache até `agora_da_verificação + 2×janela` pra cobrir esse
 * pior caso — `agora + janela` sozinho reabriria a janela de replay se o
 * relógio do ERP estivesse adiantado.
 */

const S2S_SERVICE_HEADER = 'x-wtech-svc';
const S2S_TIMESTAMP_HEADER = 'x-wtech-timestamp';
const S2S_NONCE_HEADER = 'x-wtech-nonce';
const S2S_ACTOR_HEADER = 'x-wtech-actor';
const S2S_SIGNATURE_HEADER = 'x-wtech-signature';
const S2S_EXPECTED_SERVICE = 'gestao';
const S2S_TIMESTAMP_WINDOW_SECONDS = 300;
const S2S_MIN_SECRET_LENGTH = 32;
// Contrato v1: hex de EXATAMENTE 16 bytes (32 chars) — casa com o que o ERP
// manda. Case-insensitive na validação — o valor usado na assinatura
// continua o que veio, sem transformar case.
const S2S_NONCE_RE = /^[0-9a-f]{32}$/i;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BODY_BEARING_METHODS = new Set(['POST', 'PUT', 'PATCH']);

export interface S2SVerifyResult {
  ok: boolean;
  error?: string;
  actorId?: string;
}

/** Comparador de code point Unicode (não code unit UTF-16) — ver nota no topo do arquivo. */
function compareCodePoints(a: string, b: string): number {
  const ai = [...a];
  const bi = [...b];
  const len = Math.max(ai.length, bi.length);
  for (let i = 0; i < len; i++) {
    const ca = ai[i] !== undefined ? (ai[i] as string).codePointAt(0)! : -1;
    const cb = bi[i] !== undefined ? (bi[i] as string).codePointAt(0)! : -1;
    if (ca !== cb) return ca - cb;
  }
  return 0;
}

/**
 * PATH(+query canônico): `req.originalUrl` (path completo, sobrevive a
 * montagem em sub-Router) + query parseada via `URLSearchParams` do texto
 * bruto (não `req.query`, que é um objeto já reinterpretado pelo Express e
 * perde a representação exata de repetição/encoding), ordenada por chave e,
 * em empate, por valor (code point), reserializada via `URLSearchParams`.
 */
function canonicalPathWithQuery(req: any): string {
  const rawUrl = String(req.originalUrl || req.url || '/');
  const qIndex = rawUrl.indexOf('?');
  const path = qIndex === -1 ? rawUrl : rawUrl.slice(0, qIndex);
  const queryString = qIndex === -1 ? '' : rawUrl.slice(qIndex + 1);
  if (!queryString) return path;

  const entries = Array.from(new URLSearchParams(queryString).entries());
  entries.sort(([ka, va], [kb, vb]) => {
    const keyCmp = compareCodePoints(ka, kb);
    return keyCmp !== 0 ? keyCmp : compareCodePoints(va, vb);
  });

  const sorted = new URLSearchParams();
  for (const [k, v] of entries) sorted.append(k, v);
  return `${path}?${sorted.toString()}`;
}

/** Comparação em tempo constante — comprimento primeiro (hex de HMAC-SHA256 é sempre 64, tamanho público). */
function constantTimeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
  } catch {
    return false;
  }
}

// ─── Cache de replay de nonce — em memória, bounded + TTL (réplica única) ───
//
// RESTRIÇÃO OPERACIONAL DOCUMENTADA (não é bug, é escopo aceito): este cache
// vive na memória do processo Node — válido pra UMA réplica. Se o deploy
// escalar pra múltiplas réplicas sem afinidade de sessão (sticky routing) OU
// migrar pra um runtime serverless (cada invocação podendo cair numa
// instância fria/diferente), cada réplica/invocação tem seu PRÓPRIO cache:
// um nonce reproduzido contra uma réplica diferente da que já o viu passaria
// sem ser barrado — o replay só é impedido dentro da MESMA réplica. Antes de
// qualquer uma dessas duas mudanças de topologia, este cache precisa virar
// um store compartilhado (Redis, ou a própria tabela do Postgres com um
// UNIQUE + janela de expiração, no mesmo espírito de `usedNonces` mas
// visível entre processos). Enquanto o deploy for de réplica única
// (ver server/index.ts / Dockerfile), a proteção de replay é real.
const NONCE_CACHE_MAX_ENTRIES = 50_000;
const usedNonces = new Map<string, number>(); // nonce -> expiresAt (ms)

function pruneExpiredNonces(now: number) {
  for (const [nonce, expiresAt] of usedNonces) {
    if (expiresAt <= now) usedNonces.delete(nonce);
  }
}

/** true = nonce já visto (replay); caso contrário, registra e devolve false. */
function isNonceReplayed(nonce: string): boolean {
  const now = Date.now();
  if (usedNonces.has(nonce)) return true;
  pruneExpiredNonces(now);
  if (usedNonces.size >= NONCE_CACHE_MAX_ENTRIES) {
    const oldestKey = usedNonces.keys().next().value;
    if (oldestKey !== undefined) usedNonces.delete(oldestKey);
  }
  // TTL = 2x a janela — ver nota no cabeçalho do arquivo (cobre o pior caso
  // de um timestamp aceito no limite futuro da janela).
  usedNonces.set(nonce, now + 2 * S2S_TIMESTAMP_WINDOW_SECONDS * 1000);
  return false;
}

/**
 * Valida a assinatura HMAC de uma chamada S2S. NÃO checa permissão — só
 * prova "esta chamada veio do serviço gestao, íntegra, dentro da janela,
 * sem replay, alegando este ator". Autorização real é `requireStaffOrS2SPermission`.
 */
export async function verifyS2SRequest(req: any): Promise<S2SVerifyResult> {
  const secret = process.env.SITE_API_SECRET;
  // Checagem própria de força do segredo — não depende só do gate de
  // startup do Express (server/index.ts), que entrypoints serverless/outros
  // adapters poderiam pular.
  if (!secret || secret.length < S2S_MIN_SECRET_LENGTH) {
    console.error('[s2s] SITE_API_SECRET ausente ou curto demais — toda chamada S2S nega.');
    return { ok: false, error: 's2s_not_configured' };
  }

  const svc = String(req.headers?.[S2S_SERVICE_HEADER] || '');
  if (svc !== S2S_EXPECTED_SERVICE) return { ok: false, error: 'invalid_service' };

  const timestampRaw = String(req.headers?.[S2S_TIMESTAMP_HEADER] || '');
  if (!/^\d+$/.test(timestampRaw)) return { ok: false, error: 'invalid_timestamp' };
  const timestamp = Number(timestampRaw);
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSeconds - timestamp) > S2S_TIMESTAMP_WINDOW_SECONDS) {
    return { ok: false, error: 'stale_timestamp' };
  }

  const nonce = String(req.headers?.[S2S_NONCE_HEADER] || '');
  if (!S2S_NONCE_RE.test(nonce)) return { ok: false, error: 'invalid_nonce' };

  const actorId = String(req.headers?.[S2S_ACTOR_HEADER] || '').trim();
  if (!UUID_RE.test(actorId)) return { ok: false, error: 'invalid_actor' };

  const signatureHeader = String(req.headers?.[S2S_SIGNATURE_HEADER] || '');
  if (!signatureHeader) return { ok: false, error: 'missing_signature' };

  // Fail-closed: método com corpo esperado (POST/PUT/PATCH) SEM rawBody
  // capturado (ex.: entrypoint serverless que não passou pelo middleware
  // `verify` do Express) nunca vira corpo vazio silencioso — nega.
  const method = String(req.method || '').toUpperCase();
  let rawBody: Buffer;
  if (Buffer.isBuffer(req.rawBody)) {
    rawBody = req.rawBody;
  } else if (BODY_BEARING_METHODS.has(method)) {
    return { ok: false, error: 'raw_body_unavailable' };
  } else {
    rawBody = Buffer.alloc(0);
  }
  const bodyHashHex = createHash('sha256').update(rawBody).digest('hex');

  const canonical = [
    method,
    canonicalPathWithQuery(req),
    timestampRaw,
    nonce,
    actorId,
    bodyHashHex,
  ].join('\n');

  const expectedSignature = createHmac('sha256', secret).update(canonical, 'utf8').digest('hex');

  // Checagem de assinatura ANTES da checagem de replay — um pedido com
  // assinatura inválida nunca deve "gastar" um slot do cache de nonce.
  if (!constantTimeEqualHex(signatureHeader, expectedSignature)) {
    return { ok: false, error: 'invalid_signature' };
  }

  if (isNonceReplayed(nonce)) {
    return { ok: false, error: 'replayed_nonce' };
  }

  return { ok: true, actorId };
}

/**
 * Autoriza uma rota que aceita staff (cookie httpOnly) OU S2S (HMAC +
 * ator rehidratado) — mesma permissão exigida nos dois caminhos. 401 sem
 * sessão/assinatura válida, 403 com sessão/assinatura válida mas sem a
 * permissão. Nunca aceita x-wtech-user-id nem qualquer id declarado sem
 * prova (cookie validado no banco, ou assinatura HMAC + ator rehidratado).
 */
export async function requireStaffOrS2SPermission(
  req: any,
  res: any,
  permission: string,
): Promise<StaffSessionUser | null> {
  const svcHeader = String(req.headers?.[S2S_SERVICE_HEADER] || '');

  if (svcHeader) {
    const verification = await verifyS2SRequest(req);
    if (!verification.ok) {
      denyAuth(res);
      return null;
    }
    const supabase: SupabaseClient | null = getServiceClient();
    if (!supabase) {
      res.status(503).json({ success: false, error: 'supabase_unavailable' });
      return null;
    }
    const actor = await rehydrateActor(supabase, verification.actorId!);
    if (!actor) {
      denyAuth(res);
      return null;
    }
    if (!isPermissionGranted(actor.permissions, permission)) {
      denyForbidden(res);
      return null;
    }
    return actor;
  }

  // Sem header de serviço: caminho normal do browser (cookie httpOnly).
  return requireStaffPermission(req, res, permission);
}
