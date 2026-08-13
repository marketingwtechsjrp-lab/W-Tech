import { test, expect, request } from '@playwright/test';

/**
 * Prova dirigida (E2E, contra o servidor Express real) de três frentes do
 * changeset atual:
 *   1. api/create-stripe-checkout.ts — os dois formatos públicos (b88/b4) só
 *      aceitam o payload exato esperado; qualquer desvio (UUID malformado,
 *      campos cruzados entre os dois formatos, oferta não reconhecida) é
 *      rejeitado ANTES de qualquer chamada ao Stripe.
 *   2. server/marketing.ts — o atalho de CSRF por x-wtech-svc vale só pra
 *      /share (a única rota S2S do router), não pro router inteiro.
 *   3. api/jobs.ts (cron) — Bearer CRON_SECRET correto autoriza uma rota
 *      real; sem ele, nega.
 *
 * Precisa do servidor rodando com STAFF_TRUSTED_ORIGINS incluindo o próprio
 * STAFF_API_BASE_URL (senão os testes "same-origin" tomam 403 em vez de
 * prosseguir pra validação de negócio) e, pro bloco de cron, com o mesmo
 * CRON_SECRET usado aqui.
 */
const API_BASE_URL = process.env.STAFF_API_BASE_URL || 'http://127.0.0.1:3131';
const CRON_SECRET = process.env.TEST_CRON_SECRET || 'unit-test-cron-secret-at-least-32-characters-xxxxxx';

test.describe('create-stripe-checkout — formatos públicos b88/b4 são estritos', () => {
  test('sem Origin/Sec-Fetch-Site (S2S ausente) → 403 origin_not_allowed antes de tocar no body', async () => {
    const api = await request.newContext({ baseURL: API_BASE_URL });
    const res = await api.post('/api/create-stripe-checkout', { data: { courseId: 'x' } });
    expect(res.status()).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('origin_not_allowed');
    await api.dispose();
  });

  test('courseId aleatório (não b88, sem enrollmentId) → 403 checkout_offer_not_recognized', async () => {
    const api = await request.newContext({ baseURL: API_BASE_URL, extraHTTPHeaders: { Origin: API_BASE_URL } });
    const res = await api.post('/api/create-stripe-checkout', {
      data: { courseId: '99999999-9999-4999-8999-999999999999' },
    });
    expect(res.status()).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('checkout_offer_not_recognized');
    await api.dispose();
  });

  test('enrollmentId malformado (não UUID) → 400 invalid_enrollment_id', async () => {
    const api = await request.newContext({ baseURL: API_BASE_URL, extraHTTPHeaders: { Origin: API_BASE_URL } });
    const res = await api.post('/api/create-stripe-checkout', { data: { enrollmentId: 'not-a-uuid' } });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('invalid_enrollment_id');
    await api.dispose();
  });

  test('formato b4 (enrollmentId válido) + courseId também presente → 403 checkout_offer_not_recognized (formato cruzado rejeitado)', async () => {
    const api = await request.newContext({ baseURL: API_BASE_URL, extraHTTPHeaders: { Origin: API_BASE_URL } });
    const res = await api.post('/api/create-stripe-checkout', {
      data: {
        enrollmentId: '11111111-1111-4111-8111-111111111111',
        courseId: '99999999-9999-4999-8999-999999999999',
      },
    });
    expect(res.status()).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('checkout_offer_not_recognized');
    await api.dispose();
  });

  test('formato b4 (enrollmentId válido) + leadId também presente → 403 checkout_offer_not_recognized', async () => {
    const api = await request.newContext({ baseURL: API_BASE_URL, extraHTTPHeaders: { Origin: API_BASE_URL } });
    const res = await api.post('/api/create-stripe-checkout', {
      data: {
        enrollmentId: '11111111-1111-4111-8111-111111111111',
        leadId: '22222222-2222-4222-8222-222222222222',
      },
    });
    expect(res.status()).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('checkout_offer_not_recognized');
    await api.dispose();
  });

  test('formato b4 (enrollmentId válido) + paymentType também presente → 403 checkout_offer_not_recognized', async () => {
    const api = await request.newContext({ baseURL: API_BASE_URL, extraHTTPHeaders: { Origin: API_BASE_URL } });
    const res = await api.post('/api/create-stripe-checkout', {
      data: { enrollmentId: '11111111-1111-4111-8111-111111111111', paymentType: 'full' },
    });
    expect(res.status()).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('checkout_offer_not_recognized');
    await api.dispose();
  });

  test('formato b88 (courseId correto) sem leadId → 400 lead_required (nunca aceita sem lead associável)', async () => {
    const api = await request.newContext({ baseURL: API_BASE_URL, extraHTTPHeaders: { Origin: API_BASE_URL } });
    const res = await api.post('/api/create-stripe-checkout', {
      data: { courseId: 'b88e8979-520a-4c37-8cb8-1128e7e5dffc', paymentType: 'deposit' },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('lead_required');
    await api.dispose();
  });

  test('formato b88 (courseId correto) com leadId malformado → 400 invalid_lead_id', async () => {
    const api = await request.newContext({ baseURL: API_BASE_URL, extraHTTPHeaders: { Origin: API_BASE_URL } });
    const res = await api.post('/api/create-stripe-checkout', {
      data: { courseId: 'b88e8979-520a-4c37-8cb8-1128e7e5dffc', paymentType: 'deposit', leadId: 'not-a-uuid' },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('invalid_lead_id');
    await api.dispose();
  });

  test('formato b88 (courseId correto) com paymentType fora de deposit/full → 400 invalid_payment_type', async () => {
    const api = await request.newContext({ baseURL: API_BASE_URL, extraHTTPHeaders: { Origin: API_BASE_URL } });
    const res = await api.post('/api/create-stripe-checkout', {
      data: {
        courseId: 'b88e8979-520a-4c37-8cb8-1128e7e5dffc',
        paymentType: 'meio-a-meio',
        leadId: '22222222-2222-4222-8222-222222222222',
      },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('invalid_payment_type');
    await api.dispose();
  });

  test('preço/moeda/título do body são ignorados no formato público (não mudam a rejeição por leadId ausente)', async () => {
    // Não dá pra observar o valor cobrado sem chave Stripe real configurada,
    // mas dá pra provar que a rota AVALIA o formato público (courseId b88) e
    // não desvia pro caminho staff/S2S só porque o body tem price/currency —
    // continua exigindo leadId, prova que ela ainda está no branch público.
    const api = await request.newContext({ baseURL: API_BASE_URL, extraHTTPHeaders: { Origin: API_BASE_URL } });
    const res = await api.post('/api/create-stripe-checkout', {
      data: {
        courseId: 'b88e8979-520a-4c37-8cb8-1128e7e5dffc',
        paymentType: 'full',
        price: 1,
        currency: 'brl',
        title: 'forjado',
      },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('lead_required');
    await api.dispose();
  });
});

test.describe('server/marketing.ts — bypass de CSRF por x-wtech-svc restrito a /share', () => {
  test('POST /api/marketing/course-occupancy (método mutável, sem handler) com x-wtech-svc mas sem Origin → 403 (gate CSRF do router roda ANTES do 404, e não bypassa fora de /share)', async () => {
    // O gate é `router.use(...)`, montado na raiz do router — roda pra
    // QUALQUER path sob /api/marketing antes do Express decidir se existe
    // handler pro método. Método mutável (POST) aqui prova que o bypass por
    // x-wtech-svc não vaza pra fora de /share: em vez de vazar (o que daria
    // 404, provando que passou do CSRF), o teste vê 403 do gate.
    const api = await request.newContext({
      baseURL: API_BASE_URL,
      extraHTTPHeaders: { 'x-wtech-svc': 'gestao' },
    });
    const res = await api.post('/api/marketing/course-occupancy');
    expect(res.status()).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('origin_not_allowed');
    await api.dispose();
  });

  test('POST /api/marketing/share com x-wtech-svc mas assinatura ausente → 401 (chega no handler, HMAC nega)', async () => {
    // Prova o inverso do teste acima: /share É a rota que aceita o atalho —
    // passa do gate CSRF do router e cai no requireStaffOrS2SPermission, que
    // nega por falta de assinatura (não por CSRF).
    const api = await request.newContext({
      baseURL: API_BASE_URL,
      extraHTTPHeaders: { 'x-wtech-svc': 'gestao' },
    });
    const res = await api.post('/api/marketing/share', { data: { type: 'meeting_note', id: 'x' } });
    expect(res.status()).toBe(401);
    await api.dispose();
  });
});

test.describe('api/jobs.ts — cron real (Bearer CRON_SECRET, sem atalho x-vercel-cron)', () => {
  test('POST /api/jobs?task=process-email-flows sem Authorization → 401', async () => {
    const api = await request.newContext({ baseURL: API_BASE_URL });
    const res = await api.post('/api/jobs?task=process-email-flows');
    expect(res.status()).toBe(401);
    await api.dispose();
  });

  test('POST /api/jobs?task=process-email-flows com x-vercel-cron sozinho, sem Bearer → 401', async () => {
    const api = await request.newContext({
      baseURL: API_BASE_URL,
      extraHTTPHeaders: { 'x-vercel-cron': '1' },
    });
    const res = await api.post('/api/jobs?task=process-email-flows');
    expect(res.status()).toBe(401);
    await api.dispose();
  });

  test('POST /api/jobs?task=process-email-flows com Bearer CRON_SECRET errado → 401', async () => {
    const api = await request.newContext({
      baseURL: API_BASE_URL,
      extraHTTPHeaders: { Authorization: 'Bearer valor-errado' },
    });
    const res = await api.post('/api/jobs?task=process-email-flows');
    expect(res.status()).toBe(401);
    await api.dispose();
  });

  test('POST /api/jobs?task=balance-reminders&dryRun=1 com Bearer CRON_SECRET correto → autoriza (200, não 401)', async () => {
    // dryRun=1 evita o envio real de e-mail/WhatsApp; ainda assim toca o
    // Supabase real, então este teste sozinho recebe mais tempo que os
    // demais (auth aqui é só a PRIMEIRA checagem do handler — provar "não é
    // 401" já é suficiente pra provar que o Bearer correto passou do gate).
    test.setTimeout(60_000);
    const api = await request.newContext({
      baseURL: API_BASE_URL,
      extraHTTPHeaders: { Authorization: `Bearer ${CRON_SECRET}` },
    });
    const res = await api.post('/api/jobs?task=balance-reminders&dryRun=1');
    expect(res.status()).not.toBe(401);
    await api.dispose();
  });

  test('POST /api/jobs?task=rh-email com Bearer correto mas idempotencia malformada → 400 (passou do gate de cron)', async () => {
    const api = await request.newContext({
      baseURL: API_BASE_URL,
      extraHTTPHeaders: { Authorization: `Bearer ${CRON_SECRET}` },
    });
    const res = await api.post('/api/jobs?task=rh-email', {
      data: { idempotencia: 'not-a-uuid', destinatario: 'a@b.com', assunto: 'x', html: '<p>x</p>' },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('idempotencia');
    await api.dispose();
  });

  test('POST /api/jobs?task=rh-email sem Bearer → 401 (nunca chega na validação de campos)', async () => {
    const api = await request.newContext({ baseURL: API_BASE_URL });
    const res = await api.post('/api/jobs?task=rh-email', {
      data: { idempotencia: '11111111-1111-4111-8111-111111111111', destinatario: 'a@b.com', assunto: 'x', html: '<p>x</p>' },
    });
    expect(res.status()).toBe(401);
    await api.dispose();
  });
});
