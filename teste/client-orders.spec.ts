import { expect, test, type Page } from '@playwright/test';

// As telas públicas de pedido não podem mais encostar em SITE_Sales: com a RLS
// fechada (migrations/2026-11-04_fechar_vendas_anon.sql) qualquer leitura direta
// com a chave anônima falha. Os endpoints têm teste próprio (client-orders-unit).
// O banco é simulado, mas sem estas variáveis o app nem sobe (lib/supabaseClient.ts):
//   VITE_SUPABASE_URL=http://127.0.0.1:54321 VITE_SUPABASE_ANON_KEY=teste npx playwright test teste/client-orders.spec.ts
test.skip(!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_ANON_KEY, 'VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY ausentes no ambiente de teste.');

const CLIENTE = {
  name: 'Cliente Teste',
  email: 'cliente@teste.com',
  phone: '11999990000',
  client_code: 'CLI-12ABC',
};
const PRODUTO = { id: '22222222-2222-4222-8222-222222222222', name: 'Vacuum Pump', sku: 'VP-1', sale_price: 1500.5, type: 'product' };
const CURSO_ID = '33333333-3333-4333-8333-333333333333';

/** As tabelas fechadas falham e ficam registradas; o resto responde vazio. */
async function bancoFechado(page: Page) {
  const leiturasDiretas: string[] = [];
  await page.route('**/rest/v1/**', async (route) => {
    const url = route.request().url();
    if (url.includes('SITE_Products')) return route.fulfill({ json: [PRODUTO] });
    if (/SITE_(Sale|Leads|Enrollments)/.test(url)) {
      leiturasDiretas.push(`${route.request().method()} ${url}`);
      return route.fulfill({ status: 401, json: { code: '42501', message: 'permission denied' } });
    }
    return route.fulfill({ json: [] });
  });
  return leiturasDiretas;
}

test.describe('Rastreio', () => {
  test('mostra o pedido vindo do endpoint, sem tocar no banco', async ({ page }) => {
    const leiturasDiretas = await bancoFechado(page);
    const pedidos: unknown[] = [];
    await page.route('**/api/order-tracking', (route) => {
      pedidos.push(route.request().postDataJSON());
      return route.fulfill({
        json: {
          order: {
            reference: 'AAAAAAAA',
            status: 'shipped',
            created_at: '2026-11-01T10:00:00+00:00',
            shipping_method: 'PAC',
            total_value: 3001,
            items: [{ name: 'Vacuum Pump', quantity: 2, price: 1500.5 }],
          },
        },
      });
    });

    await page.goto('/rastreio');
    await page.getByPlaceholder('Ex: TRK-123456').fill('aa123456789br');
    await page.getByRole('button', { name: 'Rastrear Agora' }).click();

    await expect(page.getByText('#AAAAAAAA')).toBeVisible();
    await expect(page.getByText('Via PAC')).toBeVisible();
    await expect(page.getByText('2x Vacuum Pump')).toBeVisible();
    await expect(page.getByText('Endereço de Entrega')).toHaveCount(0);
    expect(pedidos).toEqual([{ code: 'AA123456789BR' }]);
    expect(leiturasDiretas).toEqual([]);
  });

  test('mostra o aviso do servidor quando não acha', async ({ page }) => {
    await bancoFechado(page);
    await page.route('**/api/order-tracking', (route) =>
      route.fulfill({ status: 404, json: { error: 'Pedido não encontrado. Verifique o código e tente novamente.' } }),
    );

    await page.goto('/rastreio');
    await page.getByPlaceholder('Ex: TRK-123456').fill('BB000000000BR');
    await page.getByRole('button', { name: 'Rastrear Agora' }).click();

    await expect(page.getByText('Pedido não encontrado. Verifique o código e tente novamente.')).toBeVisible();
  });
});

test.describe('Meus pedidos', () => {
  test('lista e cria pedido pelo endpoint, sem tocar em SITE_Sales', async ({ page }) => {
    const leiturasDiretas = await bancoFechado(page);
    const chamadas: Array<Record<string, unknown>> = [];
    await page.route('**/api/client-orders', (route) => {
      const corpo = route.request().postDataJSON();
      chamadas.push(corpo);
      if (corpo.action === 'login') return route.fulfill({ json: { client: CLIENTE } });
      if (corpo.action === 'enrollments') {
        return route.fulfill({ json: { enrollments: [{ status: 'Confirmed', SITE_Courses: { title: 'Curso de Suspensão', date: '2026-12-01' } }] } });
      }
      if (corpo.action !== 'list') return route.fulfill({ status: 201, json: { ok: true } });
      return route.fulfill({
        json: {
          orders: [{
            id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
            status: 'paid',
            created_at: '2026-11-01T10:00:00+00:00',
            tracking_code: 'AA123456789BR',
            total_value: 1500.5,
            shipping_cost: 30,
            insurance_cost: 0,
            discount_amount: 0,
            payment_method: 'Pix',
            items: [{ name: 'Vacuum Pump', quantity: 1, price: 1500.5 }],
          }],
        },
      });
    });

    await page.goto('/meus-pedidos?code=CLI-12ABC');

    await expect(page.getByText('ID #aaaaaaaa')).toBeVisible();
    await expect(page.getByText('RASTREIO: AA123456789BR')).toBeVisible();
    await expect(page.getByText('Pago', { exact: true })).toBeVisible();
    await expect(page.getByText('+ R$ 30,00')).toBeVisible();
    await expect(page.getByText('Curso de Suspensão')).toBeVisible();
    expect(chamadas[0]).toEqual({ code: 'CLI-12ABC', action: 'login' });

    await page.getByRole('button', { name: 'Novo Pedido' }).first().click();
    await page.locator('div.group', { hasText: 'Vacuum Pump' }).getByRole('button').last().click();
    await page.getByRole('button', { name: 'Concluir (1)' }).click();
    const aviso = page.waitForEvent('dialog');
    await page.getByRole('button', { name: 'FINALIZAR E ENVIAR' }).click();
    const dialogo = await aviso;
    expect(dialogo.message()).toContain('Pedido enviado com sucesso');
    await dialogo.accept();

    // Do navegador sai só o código e o que ele quer comprar; depois a lista recarrega.
    await expect(page.getByText('ID #aaaaaaaa')).toBeVisible();
    expect(chamadas.find((c) => c.action === 'order')).toEqual({
      code: 'CLI-12ABC',
      action: 'order',
      items: [{ productId: PRODUTO.id, quantity: 1 }],
    });
    await expect
      .poll(() => chamadas.slice(chamadas.findIndex((c) => c.action === 'order') + 1).map((c) => c.action))
      .toEqual(['list']);
    expect(leiturasDiretas).toEqual([]);
  });

  test('pede matrícula pelo endpoint, sem gravar no CRM pelo navegador', async ({ page }) => {
    const leiturasDiretas = await bancoFechado(page);
    await page.route('**/rest/v1/SITE_Courses*', (route) => route.fulfill({
      json: [{ id: CURSO_ID, title: 'Curso de Suspensão', date: '2030-12-01T10:00:00+00:00', location: 'São Paulo', location_type: 'Presencial', status: 'Published' }],
    }));
    const chamadas: Array<Record<string, unknown>> = [];
    await page.route('**/api/client-orders', (route) => {
      const corpo = route.request().postDataJSON();
      chamadas.push(corpo);
      if (corpo.action === 'login') return route.fulfill({ json: { client: CLIENTE } });
      if (corpo.action === 'enrollments') return route.fulfill({ json: { enrollments: [] } });
      if (corpo.action === 'list') return route.fulfill({ json: { orders: [] } });
      return route.fulfill({ status: 201, json: { ok: true } });
    });
    const avisos: string[] = [];
    page.on('dialog', (dialogo) => {
      avisos.push(dialogo.message());
      void dialogo.accept();
    });

    await page.goto('/meus-pedidos?code=CLI-12ABC');
    await page.getByRole('button', { name: 'Cursos' }).first().click();
    await page.getByRole('button', { name: 'MATRICULAR AGORA' }).click();

    await expect.poll(() => avisos.at(-1)).toContain('pedido de matrícula foi recebido');
    expect(chamadas.find((c) => c.action === 'enroll')).toEqual({ code: 'CLI-12ABC', action: 'enroll', courseId: CURSO_ID });
    expect(leiturasDiretas).toEqual([]);
  });
});
