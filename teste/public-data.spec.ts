import { expect, test, type Page } from '@playwright/test';

// As telas públicas sem ler SITE_Leads e SITE_Enrollments, e pedindo do mapa só as colunas
// públicas: com migrations/2026-11-04_fechar_leads_matriculas_mecanicos.sql, o resto falha.
// O banco é simulado, mas sem estas variáveis o app nem sobe (lib/supabaseClient.ts):
//   VITE_SUPABASE_URL=http://127.0.0.1:54321 VITE_SUPABASE_ANON_KEY=teste npx playwright test teste/public-data.spec.ts
test.skip(!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_ANON_KEY, 'VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY ausentes no ambiente de teste.');

const ENROLLMENT_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const LEAD_ID = '11111111-1111-4111-8111-111111111111';
const CURSO_ID = '33333333-3333-4333-8333-333333333333';

/** Registra os pedidos ao banco. Tabela fechada responde como a RLS vai responder. */
async function bancoFechado(page: Page, respostas: Record<string, unknown> = {}) {
  const pedidos: string[] = [];
  await page.route('**/rest/v1/**', (route) => {
    const url = decodeURIComponent(route.request().url());
    pedidos.push(`${route.request().method()} ${url}`);
    if (/rest\/v1\/SITE_(Leads|Enrollments|CaptureLeads|EmailFlows|FlowEnrollments)/.test(url) && route.request().method() !== 'POST') {
      return route.fulfill({ status: 401, json: { code: '42501', message: 'permission denied' } });
    }
    for (const [tabela, json] of Object.entries(respostas)) {
      if (url.includes(`rest/v1/${tabela}`)) return route.fulfill({ json });
    }
    return route.fulfill({ json: [] });
  });
  return pedidos;
}

const leituras = (pedidos: string[], tabela: string) => pedidos.filter((p) => p.startsWith('GET') && p.includes(`rest/v1/${tabela}`));

test('certificado valida pelo endpoint e não mostra e-mail do aluno', async ({ page }) => {
  const pedidos = await bancoFechado(page);
  const enviados: unknown[] = [];
  await page.route('**/api/public-enrollments', (route) => {
    enviados.push(route.request().postDataJSON());
    return route.fulfill({
      json: {
        certificate: {
          reference: 'aaaaaaaa',
          student_name: 'Aluno Teste',
          course: { title: 'Curso de Suspensão', location: 'Sede', location_type: 'Presencial', date: '2026-12-01' },
        },
      },
    });
  });

  await page.goto(`/validar/${ENROLLMENT_ID}`);

  await expect(page.getByText('Certificado Válido')).toBeVisible();
  await expect(page.getByText('Aluno Teste')).toBeVisible();
  await expect(page.getByText('Curso de Suspensão')).toBeVisible();
  await expect(page.getByText('ID: aaaaaaaa')).toBeVisible();
  expect(enviados[0]).toEqual({ action: 'certificate', id: ENROLLMENT_ID });
  expect(leituras(pedidos, 'SITE_Enrollments')).toEqual([]);
});

test('certificado inexistente aparece como inválido', async ({ page }) => {
  await bancoFechado(page);
  await page.route('**/api/public-enrollments', (route) => route.fulfill({ status: 404, json: { error: 'Inscrição não encontrada.' } }));

  await page.goto(`/validar/${ENROLLMENT_ID}`);

  await expect(page.getByText('Documento Inválido')).toBeVisible();
});

test('inscrição confirmada mostra a matrícula e envia o questionário pelo endpoint', async ({ page }) => {
  const pedidos = await bancoFechado(page);
  const enviados: Array<Record<string, any>> = [];
  await page.route('**/api/public-enrollments', (route) => {
    const corpo = route.request().postDataJSON();
    enviados.push(corpo);
    if (corpo.action === 'questionnaire') return route.fulfill({ json: { ok: true, client_code: 'ALU-12ABC' } });
    return route.fulfill({
      json: {
        enrollment: {
          id: ENROLLMENT_ID,
          status: 'Confirmed',
          amount_paid: 150,
          total_amount: 480,
          currency: 'BRL',
          payment_method: 'Pix',
          payment_id: 'pay_1',
          t_shirt_size: null,
          has_cpf: false,
          student_name: 'Aluno Teste',
          student_email: 'aluno@teste.com',
          student_phone: '11999998888',
          client_code: 'ALU-12ABC',
          SITE_Courses: { title: 'Curso de Suspensão', date: '2026-12-01', currency: 'BRL' },
        },
      },
    });
  });

  await page.goto(`/inscricao-confirmada?eid=${ENROLLMENT_ID}&status=approved`);

  await expect(page.getByText('Parabéns, Aluno!')).toBeVisible();
  await expect(page.getByText('ALU-12ABC')).toBeVisible();
  expect(enviados[0]).toEqual({ action: 'view', id: ENROLLMENT_ID });
  expect(leituras(pedidos, 'SITE_Enrollments')).toEqual([]);
  expect(leituras(pedidos, 'SITE_Leads')).toEqual([]);
});

test('checkout de curso preenche com o que a pessoa digitou e conta vagas sem ler matrículas', async ({ page }) => {
  const pedidos = await bancoFechado(page, {
    SITE_Courses: {
      id: CURSO_ID,
      title: 'Curso de Suspensão',
      date: '2030-12-01',
      city: 'São Paulo',
      state: 'SP',
      location_type: 'Presencial',
      price: 1000,
      currency: 'BRL',
      capacity: 10,
      enrollment_count: 4,
    },
  });
  await page.addInitScript(([id]) => {
    sessionStorage.setItem('wtech_lead_contact', JSON.stringify({ id, name: 'Fulano de Tal', email: 'fulano@teste.com', phone: '11999998888' }));
  }, [LEAD_ID]);

  await page.goto(`/checkout-curso/${CURSO_ID}?lid=${LEAD_ID}`);

  await expect(page.locator('input[value="Fulano de Tal"]')).toBeVisible();
  await expect(page.locator('input[value="fulano@teste.com"]')).toBeVisible();
  expect(leituras(pedidos, 'SITE_Leads')).toEqual([]);
  const consultaDoCurso = leituras(pedidos, 'SITE_Courses')[0];
  expect(consultaDoCurso).toContain('enrollment_count');
  expect(consultaDoCurso).not.toContain('SITE_Enrollments');
});

test('checkout sem contato guardado não busca o lead no banco', async ({ page }) => {
  const pedidos = await bancoFechado(page, {
    SITE_Courses: { id: CURSO_ID, title: 'Curso', date: '2030-12-01', location_type: 'Presencial', price: 1000, currency: 'BRL', capacity: 10, enrollment_count: 0 },
  });

  await page.goto(`/checkout-curso/${CURSO_ID}?lid=${LEAD_ID}`);

  await expect(page.getByText('Curso', { exact: true }).first()).toBeVisible();
  expect(leituras(pedidos, 'SITE_Leads')).toEqual([]);
});

test('mapa de credenciados pede só as colunas públicas', async ({ page }) => {
  const pedidos = await bancoFechado(page, {
    SITE_Mechanics: [{
      id: 'm1',
      name: 'Fulano',
      workshop_name: 'Oficina Teste',
      city: 'Campinas',
      state: 'SP',
      phone: '19999998888',
      status: 'Approved',
      specialty: ['Suspensão'],
      latitude: -22.9,
      longitude: -47.06,
    }],
  });

  await page.goto('/mapa');

  await expect(page.getByText('Oficina Teste').first()).toBeVisible();
  const [consulta] = leituras(pedidos, 'SITE_Mechanics');
  expect(consulta).toContain('select=id,name,workshop_name,city,state,phone,status,specialty,latitude,longitude');
  expect(consulta).not.toMatch(/cpf|email|client_code|rg|birth/);
});

test('lista de cursos conta vagas pelo campo calculado', async ({ page }) => {
  const pedidos = await bancoFechado(page);

  await page.goto('/cursos');

  await expect.poll(() => leituras(pedidos, 'SITE_Courses').length).toBeGreaterThan(0);
  const consultas = leituras(pedidos, 'SITE_Courses').filter((p) => p.includes('enrollment_count'));
  expect(consultas.length).toBeGreaterThan(0);
  expect(leituras(pedidos, 'SITE_Courses').join()).not.toContain('SITE_Enrollments');
});

test('obrigado pelo lead: nome vem do que a pessoa digitou, e o questionário segue pelo lead', async ({ page }) => {
  const pedidos = await bancoFechado(page);
  const enviados: Array<Record<string, any>> = [];
  await page.route('**/api/public-enrollments', (route) => {
    const corpo = route.request().postDataJSON();
    enviados.push(corpo);
    return route.fulfill({
      json: {
        enrollment: {
          status: 'Confirmed',
          amount_paid: 150,
          total_amount: 480,
          currency: 'EUR',
          payment_method: 'Stripe',
          payment_id: 'pi_1',
          t_shirt_size: null,
          has_cpf: false,
          SITE_Courses: { title: 'W-Tech Lisboa', currency: 'EUR' },
        },
      },
    });
  });
  await page.addInitScript(([id]) => {
    sessionStorage.setItem('wtech_lead_contact', JSON.stringify({ id, name: 'Fulano de Tal', email: 'fulano@teste.com', phone: '351962030640' }));
  }, [LEAD_ID]);

  await page.goto(`/obrigado-lisboa?lid=${LEAD_ID}&session_id=cs_1`);

  await expect(page.getByText('Fulano de Tal')).toBeVisible();
  expect(enviados[0].action).toBe('view');
  expect(enviados[0].leadId).toBe(LEAD_ID);
  expect(enviados[0].id).toBeUndefined();
  expect(leituras(pedidos, 'SITE_Leads')).toEqual([]);
  expect(leituras(pedidos, 'SITE_Enrollments')).toEqual([]);
});

test('recadastro de página pública passa pelo servidor, com a atribuição junto', async ({ page }) => {
  const pedidos = await bancoFechado(page);
  const enviados: Array<Record<string, any>> = [];
  await page.route('**/api/public-leads', (route) => {
    enviados.push(route.request().postDataJSON());
    return route.fulfill({ json: { action: 'created', id: LEAD_ID } });
  });
  await page.route('**/api/whatsapp-send', (route) => route.fulfill({ json: { success: true } }));

  await page.goto('/espera-suspensao-piloto?utm_source=meta');
  await page.getByPlaceholder('Ex: João da Silva').fill('Fulano de Tal');
  await page.getByPlaceholder('(00) 00000-0000').fill('11999998888');
  await page.locator('button[type="submit"]').click();

  await expect.poll(() => enviados.length).toBeGreaterThan(0);
  expect(enviados[0].action).toBe('upsert');
  expect(enviados[0].lead).toMatchObject({
    name: 'Fulano de Tal',
    phone: '11999998888',
    type: 'Suspension_Waitlist',
    assigned_to: '96702eb3-a930-41de-872b-ca179cc3944c',
    utm_source: 'meta',
  });
  expect(pedidos.filter((p) => p.includes('rest/v1/SITE_Leads'))).toEqual([]);

  // Lead novo entra no fluxo de boas-vindas pelo servidor: o navegador não lê os fluxos.
  await page.waitForTimeout(300);
  expect(pedidos.filter((p) => /rest\/v1\/SITE_(EmailFlows|FlowEnrollments)/.test(p))).toEqual([]);
});

test('checkout Lisboa grava o lead pelo servidor e reaproveita o id que já tinha', async ({ page }) => {
  const pedidos = await bancoFechado(page, {
    SITE_Courses: { id: CURSO_ID, title: 'W-Tech Lisboa', date: '2030-10-01', location_type: 'Presencial', price: 480, capacity: 10, enrollment_count: 1, deposit_price: 150 },
  });
  const enviados: Array<Record<string, any>> = [];
  await page.route('**/api/public-leads', (route) => {
    enviados.push(route.request().postDataJSON());
    return route.fulfill({ json: { id: LEAD_ID, created: false } });
  });
  await page.route('**/api/create-stripe-checkout', (route) => route.fulfill({ status: 500, json: { success: false, error: 'teste' } }));

  await page.goto(`/checkout-lisboa?lid=${LEAD_ID}`);
  await page.getByPlaceholder('Seu nome completo').fill('Fulano de Tal');
  await page.getByPlaceholder('seu@email.com').fill('FULANO@teste.com');
  await page.getByPlaceholder('+351 ...').fill('+351 962 030 640');
  await page.getByPlaceholder('Seu documento').fill('123456789');
  await page.locator('button[type="submit"]').click();

  await expect.poll(() => enviados.length).toBeGreaterThan(0);
  expect(enviados[0]).toMatchObject({ action: 'checkout', id: LEAD_ID, cpf: '123456789' });
  expect(enviados[0].lead).toMatchObject({ name: 'Fulano de Tal', email: 'fulano@teste.com', phone: '+351 962 030 640' });
  expect(pedidos.filter((p) => p.includes('rest/v1/SITE_Leads'))).toEqual([]);
});

test('campanha de captura vota e soma pelo servidor, sem tocar nos leads da campanha', async ({ page }) => {
  const CAMPANHA_ID = '55555555-5555-4555-8555-555555555555';
  const pedidos = await bancoFechado(page, {
    SITE_CaptureCampaigns: [{
      id: CAMPANHA_ID,
      name: 'Etapa da pista',
      slug: 'etapa-da-pista',
      type: 'enquete',
      template: 'ferramenta',
      status: 'active',
      ends_at: null,
      config: { options: ['Interlagos', 'Goiania'], question: 'Onde correr?', cta: 'Registrar voto' },
    }],
  });
  const enviados: Array<Record<string, any>> = [];
  await page.route('**/api/public-capture', (route) => {
    const corpo = route.request().postDataJSON();
    enviados.push(corpo);
    return route.fulfill({ json: corpo.action === 'results' ? { votes: { Interlagos: 3, Goiania: 1 } } : { ok: true } });
  });

  await page.goto('/captura/etapa-da-pista?utm_source=meta');
  await page.getByRole('button', { name: /Interlagos/ }).click();
  await page.getByPlaceholder('Seu nome').fill('Fulano de Tal');
  await page.getByPlaceholder('WhatsApp com DDD').fill('11999998888');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Registrar voto' }).click();

  await expect.poll(() => enviados.filter((e) => e.action === 'submit').length).toBe(1);
  const envio = enviados.find((e) => e.action === 'submit')!;
  expect(envio).toMatchObject({
    campaignId: CAMPANHA_ID,
    name: 'Fulano de Tal',
    phone: '11999998888',
    vote: 'Interlagos',
    consent: true,
  });
  expect(envio.tracking.utm_source).toBe('meta');
  expect(enviados[0]).toEqual({ action: 'results', campaignId: CAMPANHA_ID });

  // Os percentuais vêm da contagem do servidor: 3 de 4 votos.
  await expect(page.getByText('75%').first()).toBeVisible();
  expect(pedidos.filter((p) => p.includes('rest/v1/SITE_CaptureLeads'))).toEqual([]);
});
