import { test, expect } from '@playwright/test';
import { createHash, createHmac, randomBytes } from 'node:crypto';

/**
 * Prova dirigida das camadas de segurança que não dependem de um servidor
 * HTTP vivo nem de dados reais no Supabase: HMAC S2S (api/_s2s.ts), guard de
 * cron (api/_cron.ts) e normalização de Origin/loopback (api/_auth.ts).
 *
 * Diferente de teste/staff-auth.spec.ts (que sobe o servidor Express e faz
 * requisições HTTP reais), estes testes importam as funções diretamente e
 * chamam com objetos `req` forjados — necessário porque, vistas de fora
 * (só o status HTTP), assinatura inválida / replay / timestamp velho /
 * ator inexistente são TODAS indistinguíveis (401 genérico, de propósito —
 * não vazar qual camada rejeitou). Só testando a função em isolamento dá pra
 * prover CADA motivo de rejeição especificamente.
 */

const TEST_S2S_SECRET = 'unit-test-s2s-secret-at-least-32-characters-long-xxxx';
const TEST_CRON_SECRET = 'unit-test-cron-secret-at-least-32-characters-xxxxxx';
const VALID_ACTOR = '11111111-1111-1111-1111-111111111111';
const S2S_METHOD = 'POST';
const S2S_PATH = '/api/test-s2s-route';

function buildCanonical(opts: {
  method?: string;
  path?: string;
  timestamp: string;
  nonce: string;
  actor: string;
  rawBody: Buffer;
}): string {
  const bodyHashHex = createHash('sha256').update(opts.rawBody).digest('hex');
  return [opts.method || S2S_METHOD, opts.path || S2S_PATH, opts.timestamp, opts.nonce, opts.actor, bodyHashHex].join(
    '\n'
  );
}

function signCanonical(canonical: string, secret: string): string {
  return createHmac('sha256', secret).update(canonical, 'utf8').digest('hex');
}

/** Monta um `req` fake mínimo — só o que verifyS2SRequest lê. */
function buildReq(opts: {
  method?: string;
  path?: string;
  timestamp?: string;
  nonce?: string;
  actor?: string;
  rawBody?: Buffer;
  signature?: string;
  secretForSignature?: string;
  omitSignature?: boolean;
}) {
  const method = opts.method || S2S_METHOD;
  const path = opts.path || S2S_PATH;
  const timestamp = opts.timestamp || Math.floor(Date.now() / 1000).toString();
  const nonce = opts.nonce || randomBytes(16).toString('hex');
  const actor = opts.actor || VALID_ACTOR;
  const rawBody = opts.rawBody || Buffer.from(JSON.stringify({ foo: 'bar' }));
  const canonical = buildCanonical({ method, path, timestamp, nonce, actor, rawBody });
  const signature =
    opts.signature !== undefined ? opts.signature : signCanonical(canonical, opts.secretForSignature || TEST_S2S_SECRET);

  const headers: Record<string, string> = {
    'x-wtech-svc': 'gestao',
    'x-wtech-timestamp': timestamp,
    'x-wtech-nonce': nonce,
    'x-wtech-actor': actor,
  };
  if (!opts.omitSignature) headers['x-wtech-signature'] = signature;

  return { method, originalUrl: path, url: path, headers, rawBody, body: {} };
}

test.describe('api/_s2s.ts — verifyS2SRequest (unitário, sem servidor)', () => {
  test.beforeEach(() => {
    process.env.SITE_API_SECRET = TEST_S2S_SECRET;
  });

  test('assinatura válida, dentro da janela, nonce inédito → ok:true com o actorId declarado', async () => {
    const { verifyS2SRequest } = await import('../api/_s2s.js');
    const req = buildReq({ nonce: randomBytes(16).toString('hex') });
    const result = await verifyS2SRequest(req);
    expect(result.ok).toBe(true);
    expect(result.actorId).toBe(VALID_ACTOR);
  });

  test('assinatura errada (1 char alterado) → invalid_signature', async () => {
    const { verifyS2SRequest } = await import('../api/_s2s.js');
    const req = buildReq({ nonce: randomBytes(16).toString('hex') });
    req.headers['x-wtech-signature'] = req.headers['x-wtech-signature'].replace(/^./, (c) => (c === 'a' ? 'b' : 'a'));
    const result = await verifyS2SRequest(req);
    expect(result.ok).toBe(false);
    expect(result.error).toBe('invalid_signature');
  });

  test('corpo alterado depois de assinado (tamper) → invalid_signature (hash do body muda o canonical)', async () => {
    const { verifyS2SRequest } = await import('../api/_s2s.js');
    const req = buildReq({ nonce: randomBytes(16).toString('hex') });
    req.rawBody = Buffer.from(JSON.stringify({ foo: 'TAMPERED' }));
    const result = await verifyS2SRequest(req);
    expect(result.ok).toBe(false);
    expect(result.error).toBe('invalid_signature');
  });

  test('replay: mesmo nonce usado 2x → 1ª ok:true, 2ª replayed_nonce', async () => {
    const { verifyS2SRequest } = await import('../api/_s2s.js');
    const nonce = randomBytes(16).toString('hex');
    const req = buildReq({ nonce });
    const first = await verifyS2SRequest(req);
    expect(first.ok).toBe(true);
    const second = await verifyS2SRequest(req);
    expect(second.ok).toBe(false);
    expect(second.error).toBe('replayed_nonce');
  });

  test('timestamp fora da janela (±300s) → stale_timestamp', async () => {
    const { verifyS2SRequest } = await import('../api/_s2s.js');
    const oldTimestamp = String(Math.floor(Date.now() / 1000) - 10_000);
    const req = buildReq({ timestamp: oldTimestamp, nonce: randomBytes(16).toString('hex') });
    const result = await verifyS2SRequest(req);
    expect(result.ok).toBe(false);
    expect(result.error).toBe('stale_timestamp');
  });

  test('nonce fora do contrato v1 (não é hex de 32 chars exatos) → invalid_nonce', async () => {
    const { verifyS2SRequest } = await import('../api/_s2s.js');
    const req = buildReq({ nonce: 'ab12' }); // curto demais
    const result = await verifyS2SRequest(req);
    expect(result.ok).toBe(false);
    expect(result.error).toBe('invalid_nonce');
  });

  test('ator declarado não é UUID → invalid_actor', async () => {
    const { verifyS2SRequest } = await import('../api/_s2s.js');
    const req = buildReq({ actor: 'not-a-uuid', nonce: randomBytes(16).toString('hex') });
    const result = await verifyS2SRequest(req);
    expect(result.ok).toBe(false);
    expect(result.error).toBe('invalid_actor');
  });

  test('assinatura ausente → missing_signature', async () => {
    const { verifyS2SRequest } = await import('../api/_s2s.js');
    const req = buildReq({ nonce: randomBytes(16).toString('hex'), omitSignature: true });
    const result = await verifyS2SRequest(req);
    expect(result.ok).toBe(false);
    expect(result.error).toBe('missing_signature');
  });

  test('POST sem rawBody (Buffer) capturado → raw_body_unavailable (fail-closed, nunca Buffer.alloc(0))', async () => {
    const { verifyS2SRequest } = await import('../api/_s2s.js');
    const req = buildReq({ nonce: randomBytes(16).toString('hex') });
    // @ts-expect-error — simula um entrypoint que não populou req.rawBody
    delete (req as any).rawBody;
    const result = await verifyS2SRequest(req);
    expect(result.ok).toBe(false);
    expect(result.error).toBe('raw_body_unavailable');
  });

  test('SITE_API_SECRET ausente → s2s_not_configured (nega toda chamada, não cai pra aceitar sem segredo)', async () => {
    const { verifyS2SRequest } = await import('../api/_s2s.js');
    delete process.env.SITE_API_SECRET;
    const req = buildReq({ nonce: randomBytes(16).toString('hex') });
    const result = await verifyS2SRequest(req);
    expect(result.ok).toBe(false);
    expect(result.error).toBe('s2s_not_configured');
  });

  test('SITE_API_SECRET curto demais (<32) → s2s_not_configured', async () => {
    const { verifyS2SRequest } = await import('../api/_s2s.js');
    process.env.SITE_API_SECRET = 'curto-demais';
    const req = buildReq({ nonce: randomBytes(16).toString('hex'), secretForSignature: 'curto-demais' });
    const result = await verifyS2SRequest(req);
    expect(result.ok).toBe(false);
    expect(result.error).toBe('s2s_not_configured');
  });
});

test.describe('api/_cron.ts — isCronAuthorized (unitário)', () => {
  test('sem CRON_SECRET configurado → nega mesmo com Bearer presente (fail-closed)', async () => {
    const { isCronAuthorized } = await import('../api/_cron.js');
    delete process.env.CRON_SECRET;
    const req = { headers: { authorization: 'Bearer qualquer-coisa' } };
    expect(isCronAuthorized(req)).toBe(false);
  });

  test('x-vercel-cron sozinho, sem Authorization → nega (atalho removido — forjável fora do roteamento nativo Vercel)', async () => {
    process.env.CRON_SECRET = TEST_CRON_SECRET;
    const { isCronAuthorized } = await import('../api/_cron.js');
    const req = { headers: { 'x-vercel-cron': '1' } };
    expect(isCronAuthorized(req)).toBe(false);
  });

  test('Bearer com o CRON_SECRET errado → nega', async () => {
    process.env.CRON_SECRET = TEST_CRON_SECRET;
    const { isCronAuthorized } = await import('../api/_cron.js');
    const req = { headers: { authorization: 'Bearer valor-errado-0000000000000000' } };
    expect(isCronAuthorized(req)).toBe(false);
  });

  test('Bearer com o CRON_SECRET correto (bytes exatos) → autoriza', async () => {
    process.env.CRON_SECRET = TEST_CRON_SECRET;
    const { isCronAuthorized } = await import('../api/_cron.js');
    const req = { headers: { authorization: `Bearer ${TEST_CRON_SECRET}` } };
    expect(isCronAuthorized(req)).toBe(true);
  });

  test('CRON_SECRET com espaço nas pontas: Bearer com o segredo TRIMADO não autoriza (sem .trim() — bytes exatos)', async () => {
    const secretWithSpaces = `  ${TEST_CRON_SECRET}  `;
    process.env.CRON_SECRET = secretWithSpaces;
    const { isCronAuthorized } = await import('../api/_cron.js');
    // Bearer com o valor SEM os espaços — não bate byte a byte contra o configurado.
    const reqTrimmed = { headers: { authorization: `Bearer ${TEST_CRON_SECRET}` } };
    expect(isCronAuthorized(reqTrimmed)).toBe(false);
    // Bearer com os bytes EXATOS (espaços inclusos) — bate.
    const reqExact = { headers: { authorization: `Bearer ${secretWithSpaces}` } };
    expect(isCronAuthorized(reqExact)).toBe(true);
    process.env.CRON_SECRET = TEST_CRON_SECRET;
  });

  test('CRON_SECRET curto demais (<32) → nega mesmo com Bearer idêntico', async () => {
    const shortSecret = 'curto-demais-16c';
    process.env.CRON_SECRET = shortSecret;
    const { isCronAuthorized } = await import('../api/_cron.js');
    const req = { headers: { authorization: `Bearer ${shortSecret}` } };
    expect(isCronAuthorized(req)).toBe(false);
    process.env.CRON_SECRET = TEST_CRON_SECRET;
  });
});

test.describe('api/_auth.ts — isLoopbackHostname / normalizeOriginEntry (unitário)', () => {
  test('isLoopbackHostname reconhece todas as variantes conhecidas de loopback', async () => {
    const { isLoopbackHostname } = await import('../api/_auth.js');
    expect(isLoopbackHostname('localhost')).toBe(true);
    expect(isLoopbackHostname('sub.localhost')).toBe(true);
    expect(isLoopbackHostname('localhost.')).toBe(true);
    expect(isLoopbackHostname('127.0.0.1')).toBe(true);
    expect(isLoopbackHostname('127.0.0.2')).toBe(true);
    expect(isLoopbackHostname('127.255.0.9')).toBe(true);
    expect(isLoopbackHostname('0.0.0.0')).toBe(true);
    expect(isLoopbackHostname('[::1]')).toBe(true);
    expect(isLoopbackHostname('::1')).toBe(true);
    // Forma que o parser de URL do Node realmente produz para
    // `https://[::ffff:127.0.0.1]` — ver new URL(...).hostname.
    expect(isLoopbackHostname('[::ffff:7f00:1]')).toBe(true);
    expect(isLoopbackHostname('::ffff:127.0.0.1')).toBe(true);
    expect(isLoopbackHostname('example.com')).toBe(false);
    expect(isLoopbackHostname('w-techbrasil.com.br')).toBe(false);
    expect(isLoopbackHostname('notlocalhost.com')).toBe(false);
  });

  test('normalizeOriginEntry em produção: rejeita http, localhost, 127.*, IPv6 loopback (bracketed e mapeado)', async () => {
    const { normalizeOriginEntry } = await import('../api/_auth.js');
    const prevEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      expect(normalizeOriginEntry('http://example.com')).toBeNull();
      expect(normalizeOriginEntry('https://localhost')).toBeNull();
      expect(normalizeOriginEntry('https://127.0.0.1')).toBeNull();
      expect(normalizeOriginEntry('https://127.0.0.2')).toBeNull();
      expect(normalizeOriginEntry('https://[::1]')).toBeNull();
      expect(normalizeOriginEntry('https://[::ffff:127.0.0.1]')).toBeNull();
      expect(normalizeOriginEntry('https://example.com')).toBe('https://example.com');
      // Barra final tolerada e normalizada — mesmo par usado no header Origin real do browser.
      expect(normalizeOriginEntry('https://example.com/')).toBe('https://example.com');
    } finally {
      process.env.NODE_ENV = prevEnv;
    }
  });

  test('normalizeOriginEntry fora de produção: permite http (fallback local)', async () => {
    const { normalizeOriginEntry } = await import('../api/_auth.js');
    const prevEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'test';
    try {
      expect(normalizeOriginEntry('http://127.0.0.1:5173')).toBe('http://127.0.0.1:5173');
    } finally {
      process.env.NODE_ENV = prevEnv;
    }
  });

  test('normalizeOriginEntry rejeita path/query/hash/userinfo em qualquer ambiente', async () => {
    const { normalizeOriginEntry } = await import('../api/_auth.js');
    expect(normalizeOriginEntry('https://example.com/algum-path')).toBeNull();
    expect(normalizeOriginEntry('https://example.com?x=1')).toBeNull();
    expect(normalizeOriginEntry('https://example.com#frag')).toBeNull();
    expect(normalizeOriginEntry('https://user:pass@example.com')).toBeNull();
  });
});

test.describe('api/_auth.ts — isPermissionGranted (unitário) — override false é terminal', () => {
  test('override individual false NÃO é ressuscitado pelo master manage_marketing (contraexemplo do review)', async () => {
    const { isPermissionGranted } = await import('../api/_auth.js');
    // Cargo concede manage_marketing:true; usuário tem override explícito
    // marketing_manage_campaigns:false — merge já preservado corretamente
    // antes desta função (rehydrateActor/enrichWithRole); o bug estava aqui.
    const perms = { manage_marketing: true, marketing_manage_campaigns: false };
    expect(isPermissionGranted(perms, 'marketing_manage_campaigns')).toBe(false);
  });

  test('sem override individual, o master ainda concede normalmente (não regrediu)', async () => {
    const { isPermissionGranted } = await import('../api/_auth.js');
    const perms = { manage_marketing: true };
    expect(isPermissionGranted(perms, 'marketing_manage_campaigns')).toBe(true);
  });

  test('override individual true concede mesmo sem o master', async () => {
    const { isPermissionGranted } = await import('../api/_auth.js');
    const perms = { manage_marketing: false, marketing_manage_campaigns: true };
    expect(isPermissionGranted(perms, 'marketing_manage_campaigns')).toBe(true);
  });

  test('admin_access:true concede tudo, inclusive por cima de um false individual', async () => {
    // Único caso em que um false individual NÃO é terminal — admin_access é
    // o bypass deliberado de nível mais alto, checado antes de tudo.
    const { isPermissionGranted } = await import('../api/_auth.js');
    const perms = { admin_access: true, marketing_manage_campaigns: false };
    expect(isPermissionGranted(perms, 'marketing_manage_campaigns')).toBe(true);
  });

  test('chave sem relação com marketing_ nunca é afetada pelo master', async () => {
    const { isPermissionGranted } = await import('../api/_auth.js');
    const perms = { manage_marketing: true };
    expect(isPermissionGranted(perms, 'financial_add_transaction')).toBe(false);
  });
});

test.describe('api/_auth.ts — isSameOriginRequest (unitário) — Sec-Fetch-Site nunca substitui a allowlist', () => {
  test('Origin forjado + Sec-Fetch-Site:same-origin forjado → nega (contraexemplo do review)', async () => {
    const { isSameOriginRequest } = await import('../api/_auth.js');
    const prevEnv = process.env.NODE_ENV;
    const prevOrigins = process.env.STAFF_TRUSTED_ORIGINS;
    process.env.NODE_ENV = 'production';
    process.env.STAFF_TRUSTED_ORIGINS = 'https://w-techbrasil.com.br';
    try {
      const req = {
        headers: {
          origin: 'https://evil.example',
          'sec-fetch-site': 'same-origin',
        },
      };
      expect(isSameOriginRequest(req)).toBe(false);
    } finally {
      process.env.NODE_ENV = prevEnv;
      process.env.STAFF_TRUSTED_ORIGINS = prevOrigins;
    }
  });

  test('Origin na allowlist + Sec-Fetch-Site:same-origin → concede (caminho legítimo intacto)', async () => {
    const { isSameOriginRequest } = await import('../api/_auth.js');
    const prevEnv = process.env.NODE_ENV;
    const prevOrigins = process.env.STAFF_TRUSTED_ORIGINS;
    process.env.NODE_ENV = 'production';
    process.env.STAFF_TRUSTED_ORIGINS = 'https://w-techbrasil.com.br';
    try {
      const req = {
        headers: {
          origin: 'https://w-techbrasil.com.br',
          'sec-fetch-site': 'same-origin',
        },
      };
      expect(isSameOriginRequest(req)).toBe(true);
    } finally {
      process.env.NODE_ENV = prevEnv;
      process.env.STAFF_TRUSTED_ORIGINS = prevOrigins;
    }
  });

  test('Sec-Fetch-Site:cross-site (sinal real de browser) → nega mesmo sem checar Origin', async () => {
    const { isSameOriginRequest } = await import('../api/_auth.js');
    const req = { headers: { 'sec-fetch-site': 'cross-site', origin: 'https://qualquer.com' } };
    expect(isSameOriginRequest(req)).toBe(false);
  });

  test('sem Origin nenhum, mesmo com Sec-Fetch-Site:same-origin → nega (não há allowlist pra checar)', async () => {
    const { isSameOriginRequest } = await import('../api/_auth.js');
    const req = { headers: { 'sec-fetch-site': 'same-origin' } };
    expect(isSameOriginRequest(req)).toBe(false);
  });

  test('Origin ausente e Sec-Fetch-Site ausente → nega (sem sinal nenhum)', async () => {
    const { isSameOriginRequest } = await import('../api/_auth.js');
    const req = { headers: {} };
    expect(isSameOriginRequest(req)).toBe(false);
  });
});
