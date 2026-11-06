import { readFileSync } from 'node:fs';
import { expect as baseExpect, test as base, type Page } from '@playwright/test';

// Tela de aviso de components/PageErrorBoundary.tsx.
//
// O erro é forçado de fora: o arquivo da página é trocado, na rede, por um módulo que lança
// ao renderizar. O site não precisa de gancho de teste e o bundle exercitado é o real.
//
// Nada sai da máquina: toda requisição ao banco é respondida aqui, em qualquer host, e todo
// outro host é abortado, GTM incluído. SITE_Analytics nunca é alcançado.
//
// Com AGENT_BROWSER_CDP (saída de `agent-browser get cdp-url`), o Chromium é o Chrome já aberto
// pelo agent-browser. O WebKit só existe como navegador do próprio Playwright.
//
// Limites maiores que o padrão: a primeira abertura do /admin passa de 30 s em modo dev.
const expect = baseExpect.configure({ timeout: 15_000 });
base.describe.configure({ timeout: 60_000 });

const test = base.extend({
  browser: [
    async ({ playwright, browserName }, use) => {
      const cdp = process.env.AGENT_BROWSER_CDP;
      const browser = cdp && browserName === 'chromium'
        ? await playwright.chromium.connectOverCDP(cdp)
        : await playwright[browserName].launch();
      await use(browser);
      await browser.close();
    },
    { scope: 'worker' },
  ],
});

type Evento = { category: string; action: string; label: string; path: string };

const MENSAGEM_LONGA = `Erro forçado no teste ${'x'.repeat(300)}`;
const MODULO_QUE_QUEBRA = `export default function ErroForcado() { throw new Error(${JSON.stringify(MENSAGEM_LONGA)}); }`;
const TELEFONE_CONFIGURADO = '55 (11) 98888-7777';

/** Arquivo da página no build (assets/Nome-hash.js) ou no modo dev (Nome.tsx). */
const arquivoDaPagina = (nome: string) => new RegExp(`/(?:assets/${nome}-[\\w-]+\\.js|${nome}\\.tsx)(?:\\?|$)`);

/** Rotas de App.tsx com o arquivo de cada página, para que rota nova já entre no teste. */
function rotasDoSite() {
  const app = readFileSync('App.tsx', 'utf8');
  const paginas = new Map(
    [...app.matchAll(/const (\w+) = lazy\(\(\) => import\('[^']*\/([^/']+)'\)\)/g)].map(([, componente, arquivo]) => [componente, arquivo]),
  );
  return [...app.matchAll(/<Route path="([^"]+)" element=\{(.*)\} \/>/g)].flatMap(([, rota, elemento]) => {
    const componente = [...elemento.matchAll(/<(\w+)/g)].map(([, nome]) => nome).find((nome) => paginas.has(nome));
    if (!componente) return []; // Redirecionamento: não tem página própria.
    return [{
      caminho: rota === '*' ? '/pagina-que-nao-existe' : rota.replace(/:\w+/g, 'teste'),
      arquivo: paginas.get(componente) as string,
    }];
  });
}

async function isolar(page: Page, baseURL: string | undefined, { bancoNoAr = true } = {}) {
  const rede = {
    eventos: [] as Evento[],
    pageViews: [] as string[],
    externos: [] as string[],
    quebrada: null as RegExp | null,
    indisponivel: null as RegExp | null,
  };
  const origem = new URL(baseURL as string).origin;

  await page.route('**/*', (route) => {
    const pedido = route.request();
    const url = new URL(pedido.url());

    if (url.pathname.includes('/rest/v1/')) {
      if (url.pathname.endsWith('/SITE_Analytics_Events')) {
        rede.eventos.push(pedido.postDataJSON());
        return route.fulfill({ status: 201, body: '' });
      }
      if (url.pathname.endsWith('/SITE_Analytics_PageViews')) {
        rede.pageViews.push(pedido.postDataJSON().path);
        return route.fulfill({ status: 201, body: '' });
      }
      if (!bancoNoAr) return route.fulfill({ status: 500, json: { message: 'fora do ar' } });
      if (url.pathname.endsWith('/SITE_SystemSettings')) {
        return route.fulfill({ json: [{ key: 'whatsapp_phone', value: TELEFONE_CONFIGURADO }] });
      }
      return route.fulfill({ json: [] });
    }

    if (url.origin !== origem) {
      rede.externos.push(url.host);
      return route.abort();
    }
    if (rede.quebrada?.test(url.pathname)) {
      return route.fulfill({ contentType: 'text/javascript', body: MODULO_QUE_QUEBRA });
    }
    if (rede.indisponivel?.test(url.pathname)) return route.abort();
    return route.continue();
  });

  return rede;
}

const errosDeTela = (eventos: Evento[]) => eventos.filter((evento) => evento.action === 'page_render_error');
const tela = (page: Page) => page.getByRole('heading', { name: 'Não conseguimos abrir esta página' });
const linkVisivel = (page: Page, href: string) => page.locator(`a[href="${href}"]:visible`).first();

/** Navegação interna vinda de fora da tela de aviso, que não tem links para o site. */
async function trocarDeRota(page: Page, caminho: string) {
  await page.evaluate((destino) => {
    history.pushState({}, '', destino);
    dispatchEvent(new PopStateEvent('popstate'));
  }, caminho);
}

for (const { caminho, arquivo } of rotasDoSite()) {
  test(`erro em ${caminho} mostra a tela de aviso`, async ({ page, baseURL }) => {
    const rede = await isolar(page, baseURL);
    rede.quebrada = arquivoDaPagina(arquivo);

    await page.goto(caminho);

    await expect(tela(page)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Recarregar a página' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Falar no WhatsApp' })).toBeVisible();

    // A prévia do painel não conta como visita; as demais rotas registram o erro.
    if (caminho !== '/lp-preview') {
      await expect.poll(() => errosDeTela(rede.eventos).length).toBe(1);
      expect(errosDeTela(rede.eventos)[0].label.startsWith(`${caminho} | `)).toBe(true);
    }
  });
}

test('registra a rota e a mensagem cortada em 200 caracteres, sem a query', async ({ page, baseURL }) => {
  const rede = await isolar(page, baseURL);
  rede.quebrada = arquivoDaPagina('Courses');

  await page.goto('/cursos?utm_source=instagram&email=pessoa%40exemplo.com');

  await expect(tela(page)).toBeVisible();
  await expect.poll(() => errosDeTela(rede.eventos).length).toBe(1);
  const [evento] = errosDeTela(rede.eventos);
  expect(evento.label).toBe(`/cursos | ${MENSAGEM_LONGA.slice(0, 200)}`);
  expect(evento.path).toBe('/cursos');
  expect(JSON.stringify(evento)).not.toContain('pessoa');
});

test('o link usa o número configurado e diz qual página falhou', async ({ page, baseURL }) => {
  const rede = await isolar(page, baseURL);
  rede.quebrada = arquivoDaPagina('Courses');

  await page.goto('/cursos');

  const whatsapp = page.getByRole('link', { name: 'Falar no WhatsApp' });
  await expect(whatsapp).toHaveAttribute('href', /^https:\/\/wa\.me\/5511988887777\?text=.*%2Fcursos/);
  await expect(whatsapp).toHaveAttribute('target', '_blank');
});

test('sem banco, a tela aparece com o número de reserva', async ({ page, baseURL }) => {
  const rede = await isolar(page, baseURL, { bancoNoAr: false });
  rede.quebrada = arquivoDaPagina('Courses');

  await page.goto('/cursos');

  await expect(tela(page)).toBeVisible();
  await expect(page.getByRole('link', { name: 'Falar no WhatsApp' })).toHaveAttribute('href', /^https:\/\/wa\.me\/551732312858\?/);
});

test('o rastreio continua vivo depois do erro e o GTM fica bloqueado', async ({ page, baseURL }) => {
  const rede = await isolar(page, baseURL);
  rede.quebrada = arquivoDaPagina('Courses');

  await page.goto('/cursos');
  await expect(tela(page)).toBeVisible();

  await expect.poll(() => rede.pageViews, { timeout: 8_000 }).toContain('/cursos');

  // Foi o que se perdeu em 06/11: com o AnalyticsTracker desmontado, o clique não chegava ao painel.
  await page.evaluate(() => {
    const botao = document.createElement('button');
    botao.dataset.track = 'clique_depois_do_erro';
    document.body.append(botao);
    botao.click();
  });
  await expect.poll(() => rede.eventos.map((evento) => evento.action)).toContain('clique_depois_do_erro');

  expect(rede.externos.some((host) => /w-techbrasil|googletagmanager/.test(host))).toBe(true);
  expect(await page.evaluate(() => 'google_tag_manager' in window)).toBe(false);
});

test('trocar de rota volta ao normal sem recarregar', async ({ page, baseURL }) => {
  const rede = await isolar(page, baseURL);
  rede.quebrada = arquivoDaPagina('Courses');

  await page.goto('/');
  await expect(linkVisivel(page, '/cursos')).toBeVisible();
  await page.evaluate(() => { document.documentElement.dataset.semRecarregar = 'sim'; });

  await linkVisivel(page, '/cursos').click();
  await expect(tela(page)).toBeVisible();

  await page.goBack();
  await expect(tela(page)).toBeHidden();
  await expect(linkVisivel(page, '/cursos')).toBeVisible();

  await page.goForward();
  await expect(tela(page)).toBeVisible();

  await trocarDeRota(page, '/contato');
  await expect(tela(page)).toBeHidden();
  await expect(page.locator('h1:visible').first()).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-sem-recarregar', 'sim');
  expect(errosDeTela(rede.eventos).length).toBe(2);
});

test('a limpeza da query não refaz a página que quebrou', async ({ page, baseURL }) => {
  const rede = await isolar(page, baseURL);
  rede.quebrada = arquivoDaPagina('Courses');

  await page.goto('/cursos?sck=abc123');

  await expect(tela(page)).toBeVisible();
  await expect(page).toHaveURL(/\/cursos$/);
  // O AnalyticsTracker repete a limpeza até 1,2 s depois de carregar.
  await page.waitForTimeout(1_500);
  await expect(tela(page)).toBeVisible();
  expect(errosDeTela(rede.eventos).length).toBe(1);
});

// No WebKit, um reload simples não sai daqui: ver recarregarPagina em PageErrorBoundary.tsx.
test('arquivo da página indisponível mostra o aviso e recarregar resolve', async ({ page, baseURL }) => {
  const rede = await isolar(page, baseURL);
  rede.indisponivel = arquivoDaPagina('Courses');

  await page.goto('/cursos');
  await expect(tela(page)).toBeVisible();
  await expect.poll(() => errosDeTela(rede.eventos).length).toBe(1);

  rede.indisponivel = null;
  await page.getByRole('button', { name: 'Recarregar a página' }).click();

  await expect(page.locator('header').first()).toBeVisible();
  await expect(tela(page)).toBeHidden();
  expect(errosDeTela(rede.eventos).length).toBe(1);
});

test('sem rede, o botão recarrega mesmo assim', async ({ page, baseURL }) => {
  const rede = await isolar(page, baseURL);
  rede.quebrada = arquivoDaPagina('Courses');

  await page.goto('/cursos');
  await expect(tela(page)).toBeVisible();
  await page.evaluate(() => { document.documentElement.dataset.antesDoReload = 'sim'; });

  // Pedidos que nunca respondem: o limite de 3 s precisa liberar o reload.
  await page.route(/\/assets\/.*\.js$/, () => {});
  const carregamento = page.waitForEvent('framenavigated');
  await page.getByRole('button', { name: 'Recarregar a página' }).click();
  await expect(page.getByRole('button', { name: 'Recarregar a página' })).toBeDisabled();
  await carregamento;
  await expect(page.locator('html')).not.toHaveAttribute('data-antes-do-reload', 'sim');
});

test('a prévia do painel mostra o aviso sem registrar', async ({ page, baseURL }) => {
  const rede = await isolar(page, baseURL);
  rede.quebrada = arquivoDaPagina('Courses');

  await page.goto('/cursos?preview=1');

  await expect(tela(page)).toBeVisible();
  await page.waitForTimeout(500);
  expect(errosDeTela(rede.eventos)).toEqual([]);
});

test('o aviso aparece na tela mesmo com a página rolada até o fim', async ({ page, baseURL }) => {
  const rede = await isolar(page, baseURL);
  rede.quebrada = arquivoDaPagina('Courses');

  await page.goto('/');
  await expect(linkVisivel(page, '/cursos')).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

  await trocarDeRota(page, '/cursos');

  await expect(tela(page)).toBeInViewport();
  await expect(page.getByRole('button', { name: 'Recarregar a página' })).toBeInViewport();
});

test('navegação sem erro não remonta o Layout', async ({ page, baseURL }) => {
  await isolar(page, baseURL);

  await page.goto('/');
  const cabecalho = page.locator('header').first();
  await expect(cabecalho).toBeVisible();
  await cabecalho.evaluate((elemento) => { elemento.dataset.mesmoElemento = 'sim'; });

  await linkVisivel(page, '/cursos').click();

  await expect(page).toHaveURL(/\/cursos$/);
  await expect(page.locator('header[data-mesmo-elemento="sim"]')).toBeVisible();
  await expect(tela(page)).toBeHidden();
});
