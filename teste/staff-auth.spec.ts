import { test, expect, request } from '@playwright/test';

/**
 * Prova dirigida: sessão de staff é validada 100% no servidor.
 *
 * Um cookie arbitrário/plausível (ou nenhum cookie) NUNCA pode devolver dado
 * privilegiado — /api/staff/me e /api/staff/users precisam responder 401 sem
 * expor `user`/`users` no corpo. Mutações precisam ter o gate CSRF
 * fail-closed: sem sinal de same-origin (Origin/Sec-Fetch-Site), o servidor
 * bloqueia ANTES de sequer olhar o cookie.
 *
 * Roda contra o servidor Express (server/index.ts), não o dev server do
 * Vite — por isso usa uma baseURL própria em vez da baseURL padrão do
 * playwright.config.ts (que aponta pro Vite). Ajuste STAFF_API_BASE_URL se o
 * servidor local estiver em outra porta.
 */
const API_BASE_URL = process.env.STAFF_API_BASE_URL || 'http://127.0.0.1:3131';

test.describe('Sessão de staff — cookie forjado nunca renderiza dado privilegiado', () => {
  test('GET /api/staff/me sem cookie algum → 401, sem user', async () => {
    const api = await request.newContext({ baseURL: API_BASE_URL });
    const res = await api.get('/api/staff/me');
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.user).toBeUndefined();
    expect(body.success).toBe(false);
    await api.dispose();
  });

  test('GET /api/staff/me com cookie forjado/plausível → 401, sem user', async () => {
    const api = await request.newContext({
      baseURL: API_BASE_URL,
      extraHTTPHeaders: { Cookie: 'wtech_staff_session=forged-plausible-token-0000000000' },
    });
    const res = await api.get('/api/staff/me');
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.user).toBeUndefined();
    await api.dispose();
  });

  test('GET /api/staff/users com cookie forjado → 401, sem lista de usuários', async () => {
    const api = await request.newContext({
      baseURL: API_BASE_URL,
      extraHTTPHeaders: { Cookie: 'wtech_staff_session=forged-plausible-token-0000000000' },
    });
    const res = await api.get('/api/staff/users');
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.users).toBeUndefined();
    await api.dispose();
  });

  test('GET /api/staff/roles com cookie forjado → 401, sem lista de cargos', async () => {
    const api = await request.newContext({
      baseURL: API_BASE_URL,
      extraHTTPHeaders: { Cookie: 'wtech_staff_session=forged-plausible-token-0000000000' },
    });
    const res = await api.get('/api/staff/roles');
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.roles).toBeUndefined();
    await api.dispose();
  });

  test('POST /api/staff/login sem Origin/Sec-Fetch-Site (fora do browser) → 403 fail-closed', async () => {
    // Playwright's APIRequestContext não simula um browser real: não manda
    // Origin nem Sec-Fetch-Site por padrão — exatamente o cenário de um POST
    // forjado fora do browser (curl, script). O gate tem que bloquear ANTES
    // de olhar credenciais, então mesmo credenciais corretas seriam rejeitadas.
    const api = await request.newContext({ baseURL: API_BASE_URL });
    const res = await api.post('/api/staff/login', {
      data: { email: 'qualquer@exemplo.com', password: 'qualquer' },
    });
    expect(res.status()).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('origin_not_allowed');
    await api.dispose();
  });

  test('POST /api/staff/theme com cookie forjado e sem Origin → 403 antes de validar sessão', async () => {
    const api = await request.newContext({
      baseURL: API_BASE_URL,
      extraHTTPHeaders: { Cookie: 'wtech_staff_session=forged-plausible-token-0000000000' },
    });
    const res = await api.post('/api/staff/theme', { data: { theme: 'dark' } });
    expect(res.status()).toBe(403);
    await api.dispose();
  });

  test('GET /api/staff/directory com cookie forjado → 401, sem diretório', async () => {
    const api = await request.newContext({
      baseURL: API_BASE_URL,
      extraHTTPHeaders: { Cookie: 'wtech_staff_session=forged-plausible-token-0000000000' },
    });
    const res = await api.get('/api/staff/directory');
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.users).toBeUndefined();
    await api.dispose();
  });

  test('POST /api/staff/users (CRUD) com Origin same-origin + cookie forjado → 401, não 500/CSRF', async () => {
    // Mesmo passando o gate CSRF (Origin bate com o host), a mutação continua
    // bloqueada: o digest do cookie forjado não valida contra
    // site_staff_session_validar, então nunca chega a chamar
    // site_staff_usuario_salvar. Prova que o CRUD depende da sessão real, não
    // só do gate same-origin.
    const api = await request.newContext({
      baseURL: API_BASE_URL,
      extraHTTPHeaders: {
        Cookie: 'wtech_staff_session=forged-plausible-token-0000000000',
        Origin: API_BASE_URL,
      },
    });
    const res = await api.post('/api/staff/users', {
      data: { name: 'Forjado', email: 'forjado@exemplo.com', password: 'qualquercoisa123' },
    });
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.user).toBeUndefined();
    await api.dispose();
  });

  test('DELETE /api/staff/users/:id (CRUD) com Origin same-origin + cookie forjado → 401', async () => {
    const api = await request.newContext({
      baseURL: API_BASE_URL,
      extraHTTPHeaders: {
        Cookie: 'wtech_staff_session=forged-plausible-token-0000000000',
        Origin: API_BASE_URL,
      },
    });
    const res = await api.delete('/api/staff/users/00000000-0000-0000-0000-000000000000');
    expect(res.status()).toBe(401);
    await api.dispose();
  });

  test('GET /api/whatsapp-cloud-send (config, permissão whatsapp_engine_config) com cookie forjado → 401', async () => {
    const api = await request.newContext({
      baseURL: API_BASE_URL,
      extraHTTPHeaders: { Cookie: 'wtech_staff_session=forged-plausible-token-0000000000' },
    });
    const res = await api.get('/api/whatsapp-cloud-send');
    expect(res.status()).toBe(401);
    await api.dispose();
  });

  test('POST /api/whatsapp-cloud-send (permissão whatsapp_send) com Origin same-origin + cookie forjado → 401', async () => {
    const api = await request.newContext({
      baseURL: API_BASE_URL,
      extraHTTPHeaders: {
        Cookie: 'wtech_staff_session=forged-plausible-token-0000000000',
        Origin: API_BASE_URL,
      },
    });
    const res = await api.post('/api/whatsapp-cloud-send', { data: { to: '5511999999999', type: 'text', text: 'x' } });
    expect(res.status()).toBe(401);
    await api.dispose();
  });

  test('POST /api/asaas-payment-link (permissão financial_add_transaction) com Origin same-origin + cookie forjado → 401', async () => {
    const api = await request.newContext({
      baseURL: API_BASE_URL,
      extraHTTPHeaders: {
        Cookie: 'wtech_staff_session=forged-plausible-token-0000000000',
        Origin: API_BASE_URL,
      },
    });
    const res = await api.post('/api/asaas-payment-link', { data: { value: 100, lead: { name: 'x', email: 'x@x.com' } } });
    expect(res.status()).toBe(401);
    await api.dispose();
  });

  test('POST /api/notify-students (permissão courses_view_reports) com Origin same-origin + cookie forjado → 401', async () => {
    // Prova que o caminho de disparo manual (balance/course-info) — que antes
    // deste corte não tinha auth nenhuma — agora exige sessão válida.
    const api = await request.newContext({
      baseURL: API_BASE_URL,
      extraHTTPHeaders: {
        Cookie: 'wtech_staff_session=forged-plausible-token-0000000000',
        Origin: API_BASE_URL,
      },
    });
    const res = await api.post('/api/notify-students', { data: { courseId: 'x', action: 'balance', channel: 'email' } });
    expect(res.status()).toBe(401);
    await api.dispose();
  });

  test('POST /api/staff/logout same-origin sem cookie algum → limpa e responde sucesso (nada a revogar)', async () => {
    const api = await request.newContext({ baseURL: API_BASE_URL, extraHTTPHeaders: { Origin: API_BASE_URL } });
    const res = await api.post('/api/staff/logout');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    await api.dispose();
  });

  test('respostas de /api/staff/* têm Cache-Control: private, no-store', async () => {
    const api = await request.newContext({ baseURL: API_BASE_URL });
    const res = await api.get('/api/staff/me');
    expect(res.headers()['cache-control']).toContain('no-store');
    await api.dispose();
  });
});
