import { expect, test, type Page } from '@playwright/test';

// Os mapas que ficaram sem a Leaflet quando ela saiu do index.html (commit 284bb26b).
// O banco é simulado, mas a Leaflet vem da CDN de verdade: é ela que dá os erros que estes
// testes pegam, e o hash de integridade em lib/loadLeaflet.ts só se prova contra o arquivo real.
//   VITE_SUPABASE_URL=http://127.0.0.1:54321 VITE_SUPABASE_ANON_KEY=teste npx playwright test teste/mapas-leaflet.spec.ts
test.skip(!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_ANON_KEY, 'VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY ausentes no ambiente de teste.');

const NOME_MALICIOSO = '<img src=x onerror="window.__invadido=1">Oficina Dois';

const credenciado = (id: string, oficina: string, latitude: number | null, longitude: number | null) => ({
  id,
  name: `Dono ${id}`,
  workshop_name: oficina,
  workshopName: oficina,
  cpf_cnpj: null,
  city: 'São Paulo',
  state: 'SP',
  status: 'Approved',
  latitude,
  longitude,
});

const CREDENCIADOS = [
  credenciado('m1', 'Oficina Um', -23.55, -46.63),
  credenciado('m2', NOME_MALICIOSO, -22.9, -43.2),
  credenciado('m3', 'Oficina Sem GPS', null, null),
];

const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

/** Banco simulado, blocos de mapa locais, e o registro do que a página pediu. */
async function prepararRede(page: Page, mecanicos: unknown[] = CREDENCIADOS) {
  const pedidos = { leaflet: [] as string[], mecanicos: [] as string[], blocos: [] as string[], carto: [] as string[] };
  await page.route('**/rest/v1/**', (route) => {
    const url = decodeURIComponent(route.request().url());
    if (!url.includes('rest/v1/SITE_Mechanics')) return route.fulfill({ json: [] });
    pedidos.mecanicos.push(url);
    return route.fulfill({ json: mecanicos });
  });
  await page.route('**://*.tile.openstreetmap.org/**', (route) => {
    pedidos.blocos.push(route.request().url());
    return route.fulfill({ contentType: 'image/png', body: PNG_1X1 });
  });
  await page.route('**://*.basemaps.cartocdn.com/**', (route) => {
    pedidos.carto.push(route.request().url());
    return route.fulfill({ contentType: 'image/png', body: PNG_1X1 });
  });
  page.on('request', (pedido) => {
    if (pedido.url().includes('unpkg.com/leaflet')) pedidos.leaflet.push(pedido.url());
  });
  return pedidos;
}

function vigiarErros(page: Page) {
  const erros: string[] = [];
  page.on('pageerror', (erro) => erros.push(erro.message));
  return erros;
}

/** Sessão de staff simulada: o painel só pergunta ao servidor quem está logado. */
async function logarNoPainel(page: Page) {
  await page.route('**/api/**', (route) => route.fulfill({ status: 404, json: { success: false } }));
  await page.route('**/api/staff/db-token', (route) => route.fulfill({ status: 401, json: { success: false } }));
  await page.route('**/api/staff/me', (route) => route.fulfill({
    json: {
      success: true,
      user: {
        id: '44444444-4444-4444-8444-444444444444',
        name: 'Equipe Teste',
        email: 'equipe@teste.com',
        role: 'Super Admin',
        status: 'Active',
        permissions: { admin_access: true },
      },
    },
  }));
}

/** Abre o formulário de um credenciado pelo botão de editar da tabela. */
async function abrirCredenciado(page: Page, oficina: string) {
  await page.goto('/admin?view=mechanics', { waitUntil: 'domcontentloaded' });
  const linha = page.locator('tr', { hasText: oficina });
  // Na última coluna: revogar, editar e excluir (o botão de editar não tem texto).
  await linha.locator('td').last().locator('button').nth(1).click();
  await expect(page.getByText('Pré-visualização do Mapa')).toBeVisible();
}

for (const { rota, titulo } of [
  { rota: '/', titulo: 'home' },
  { rota: '/home-legacy', titulo: 'home antiga' },
]) {
  test.describe(titulo, () => {
    test('só busca mapa e credenciados quando o bloco chega perto da tela', async ({ page }) => {
      const erros = vigiarErros(page);
      const pedidos = await prepararRede(page);

      await page.goto(rota);
      const botaoDoMapa = page.getByRole('button', { name: /mapa/i });
      await expect(botaoDoMapa).toBeAttached();
      await page.waitForTimeout(1000);

      // A Leaflet saiu do index.html porque travava a renderização de todas as páginas.
      expect(pedidos.leaflet).toEqual([]);
      expect(pedidos.mecanicos).toEqual([]);
      await expect(page.locator('link[data-leaflet]')).toHaveCount(0);

      await botaoDoMapa.scrollIntoViewIfNeeded();

      await expect(page.locator('.leaflet-container')).toHaveCount(1);
      // Sem GPS não ganha pino: posição inventada mandaria o cliente para o lugar errado.
      await expect(page.locator('.custom-div-icon')).toHaveCount(2);
      expect(erros).toEqual([]);
    });

    test('usa os blocos da OpenStreetMap e mostra o nome da oficina como texto', async ({ page }) => {
      const pedidos = await prepararRede(page);

      await page.goto(rota);
      await page.getByRole('button', { name: /mapa/i }).scrollIntoViewIfNeeded();
      await expect(page.locator('.custom-div-icon')).toHaveCount(2);

      await expect.poll(() => pedidos.blocos.length).toBeGreaterThan(0);
      // A CARTO devolve os blocos carimbados "API KEY REQUIRED" para qualquer origem.
      expect(pedidos.carto).toEqual([]);
      await expect(page.locator('.leaflet-top.leaflet-right .leaflet-control-attribution')).toContainText('OpenStreetMap');

      await page.locator('.custom-div-icon').first().dispatchEvent('click');
      await expect(page.locator('.leaflet-popup-content', { hasText: 'Oficina Um' })).toBeVisible();

      // Filtra pelo texto: o popup anterior ainda está sumindo quando este abre.
      await page.locator('.custom-div-icon').nth(1).dispatchEvent('click');
      await expect(page.locator('.leaflet-popup-content', { hasText: 'Oficina Dois' })).toHaveText(NOME_MALICIOSO);
      await expect(page.locator('.leaflet-popup-content img')).toHaveCount(0);
      expect(await page.evaluate(() => (window as any).__invadido)).toBeUndefined();
    });

    test('rolar por cima do mapa continua rolando a página', async ({ page }) => {
      await prepararRede(page);

      await page.goto(rota);
      await page.getByRole('button', { name: /mapa/i }).scrollIntoViewIfNeeded();
      await expect(page.locator('.custom-div-icon')).toHaveCount(2);

      const mapa = page.locator('.leaflet-container');
      await mapa.hover();
      const antes = await page.evaluate(() => window.scrollY);
      await page.mouse.wheel(0, 300);

      await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(antes);
    });

    test('os pinos entram mesmo com os credenciados chegando depois da Leaflet', async ({ page }) => {
      await prepararRede(page);
      let liberar = () => {};
      const liberado = new Promise<void>((resolve) => { liberar = resolve; });
      await page.route('**/rest/v1/SITE_Mechanics**', async (route) => {
        await liberado;
        await route.fulfill({ json: CREDENCIADOS });
      });

      await page.goto(rota);
      await page.getByRole('button', { name: /mapa/i }).scrollIntoViewIfNeeded();

      await expect(page.locator('.leaflet-container')).toHaveCount(1);
      await expect(page.locator('.custom-div-icon')).toHaveCount(0);
      liberar();
      await expect(page.locator('.custom-div-icon')).toHaveCount(2);
    });

    test('sem credenciados não inventa pinos de exemplo', async ({ page }) => {
      const pedidos = await prepararRede(page, []);

      await page.goto(rota);
      await page.getByRole('button', { name: /mapa/i }).scrollIntoViewIfNeeded();

      await expect(page.locator('.leaflet-container')).toHaveCount(1);
      await expect.poll(() => pedidos.mecanicos.length).toBeGreaterThan(0);
      await page.waitForTimeout(500);
      await expect(page.locator('.leaflet-marker-pane > *')).toHaveCount(0);
    });

    test('sem a CDN da Leaflet a página continua de pé, só sem o mapa', async ({ page }) => {
      const erros = vigiarErros(page);
      const pedidos = await prepararRede(page);
      await page.route('**/leaflet.js', (route) => route.abort());

      await page.goto(rota);
      const botaoDoMapa = page.getByRole('button', { name: /mapa/i });
      await botaoDoMapa.scrollIntoViewIfNeeded();

      await expect.poll(() => pedidos.leaflet.length).toBeGreaterThan(0);
      await page.waitForTimeout(500);
      await expect(botaoDoMapa).toBeVisible();
      await expect(page.locator('.leaflet-container')).toHaveCount(0);
      expect(erros).toEqual([]);
    });
  });
}

test.describe('painel: credenciado com coordenadas', () => {
  // Em modo dev o painel carrega centenas de módulos: a primeira abertura passa de 30 s.
  test.describe.configure({ timeout: 120_000 });

  test('abre o formulário com a pré-visualização, em vez de derrubar o painel', async ({ page }) => {
    const erros = vigiarErros(page);
    await prepararRede(page);
    await logarNoPainel(page);

    await abrirCredenciado(page, 'Oficina Um');

    await expect(page.locator('.leaflet-container')).toHaveCount(1);
    await expect(page.locator('.leaflet-marker-icon')).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'Salvar' })).toBeVisible();
    expect(erros).toEqual([]);
  });

  test('buscar coordenadas novas troca o pino, sem acumular', async ({ page }) => {
    const pedidos = await prepararRede(page);
    await logarNoPainel(page);
    await page.route('**://nominatim.openstreetmap.org/**', (route) => route.fulfill({ json: [{ lat: '-20.5', lon: '-49.4' }] }));
    page.on('dialog', (aviso) => aviso.accept());

    await abrirCredenciado(page, 'Oficina Um');
    await expect(page.locator('.leaflet-marker-icon')).toHaveCount(1);

    await page.getByRole('button', { name: 'Buscar Coordenadas Real' }).click();

    // No zoom 15, longitude -49,4 fica na coluna 11887 de blocos (a de antes era a 12139).
    await expect.poll(() => pedidos.blocos.some((url) => url.includes('/15/11887/'))).toBe(true);
    await expect(page.locator('.leaflet-marker-icon')).toHaveCount(1);
  });

  test('o ícone do pino não depende de o CSS da Leaflet chegar primeiro', async ({ page }) => {
    await prepararRede(page);
    await logarNoPainel(page);
    await page.route('**/leaflet.css', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await route.continue();
    });

    await abrirCredenciado(page, 'Oficina Um');

    await expect(page.locator('.leaflet-marker-icon')).toHaveCount(1);
    await expect(page.locator('.leaflet-marker-icon')).toHaveAttribute('src', 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png');
  });

  test('fechar o formulário e abrir de novo redesenha o mapa', async ({ page }) => {
    const erros = vigiarErros(page);
    await prepararRede(page);
    await logarNoPainel(page);

    await abrirCredenciado(page, 'Oficina Um');
    await expect(page.locator('.leaflet-container')).toHaveCount(1);

    await page.getByRole('button', { name: 'Cancelar' }).click();
    await expect(page.locator('.leaflet-container')).toHaveCount(0);

    const linha = page.locator('tr', { hasText: 'Oficina Um' });
    await linha.locator('td').last().locator('button').nth(1).click();
    await expect(page.locator('.leaflet-marker-icon')).toHaveCount(1);
    expect(erros).toEqual([]);
  });

  test('sem a CDN da Leaflet o formulário continua utilizável', async ({ page }) => {
    const erros = vigiarErros(page);
    const pedidos = await prepararRede(page);
    await logarNoPainel(page);
    await page.route('**/leaflet.js', (route) => route.abort());

    await abrirCredenciado(page, 'Oficina Um');

    await expect.poll(() => pedidos.leaflet.length).toBeGreaterThan(0);
    await page.waitForTimeout(500);
    await expect(page.getByRole('button', { name: 'Salvar' })).toBeVisible();
    await expect(page.locator('.leaflet-container')).toHaveCount(0);
    expect(erros).toEqual([]);
  });
});
