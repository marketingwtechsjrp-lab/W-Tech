#!/usr/bin/env node
/**
 * prerender.mjs — grava HTML já renderizado para as rotas públicas.
 *
 *   npm run build && npm run prerender
 *
 * PROBLEMA QUE ISTO RESOLVE
 * A SPA entrega 6,7 KB de casca (`<div id="root"></div>`) para TODAS as rotas.
 * Googlebot renderiza JavaScript; os crawlers dos assistentes de IA (ChatGPT Search,
 * Perplexity, Claude) em geral NÃO renderizam. Sem prerender eles leem uma página vazia
 * e o site não pode ser citado.
 *
 * COMO FUNCIONA
 * 1. Sobe um servidor estático local sobre dist/ com fallback SPA.
 * 2. Abre cada rota num Chromium headless, rola a página inteira (para disparar as
 *    animações de scroll) e captura o DOM final.
 * 3. Grava em dist/<rota>/index.html. O server Express serve esse arquivo antes do
 *    fallback (ver server/index.ts).
 *
 * NÃO é cloaking: o HTML gravado é exatamente o que o visitante vê. A diferença é
 * apenas o momento em que o HTML foi montado.
 *
 * As rotas vêm do sitemap (public/sitemap.xml) — mesma fonte de verdade, então nunca
 * há divergência entre "o que está no sitemap" e "o que está prerenderizado".
 */

import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync, writeFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const SITEMAP = path.join(ROOT, 'public', 'sitemap.xml');

const PORT = Number(process.env.PRERENDER_PORT) || 4183;
const NAV_TIMEOUT = 45_000;
const SETTLE_MS = 1_200;
const PRERENDER_LOCALE = process.env.PRERENDER_LOCALE || 'pt-BR';

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif',
  '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf',
  '.mp4': 'video/mp4', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8',
};

// ── Rotas ───────────────────────────────────────────────────────────────────
function routesFromSitemap() {
  if (!existsSync(SITEMAP)) {
    throw new Error(`Sitemap não encontrado em ${SITEMAP}. Rode "npm run sitemap" antes.`);
  }
  const xml = readFileSync(SITEMAP, 'utf8');
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const paths = locs.map((l) => { try { return new URL(l).pathname; } catch { return null; } }).filter(Boolean);
  return [...new Set(paths)];
}

// ── Servidor estático local com fallback SPA ────────────────────────────────
function serveDist() {
  const indexHtml = path.join(DIST, 'index.html');
  const server = createServer((req, res) => {
    const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
    const candidate = path.join(DIST, path.normalize(urlPath));

    if (candidate.startsWith(DIST) && existsSync(candidate) && statSync(candidate).isFile()) {
      res.writeHead(200, { 'content-type': MIME[path.extname(candidate)] ?? 'application/octet-stream' });
      res.end(readFileSync(candidate));
      return;
    }
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(readFileSync(indexHtml));
  });
  return new Promise((resolve) => server.listen(PORT, '127.0.0.1', () => resolve(server)));
}

// ── Captura ─────────────────────────────────────────────────────────────────
/**
 * Rola a página inteira antes de capturar. Sem isso, as seções animadas por scroll
 * (framer-motion `whileInView`) ficam congeladas em opacity:0 no HTML gravado — o
 * texto existiria no DOM, mas visualmente oculto, o que o Google desconta.
 */
async function scrollThrough(page) {
  await page.evaluate(async () => {
    const step = Math.round(window.innerHeight * 0.8);
    const height = () => document.body.scrollHeight;
    for (let y = 0; y < height(); y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
    window.scrollTo(0, height());
    await new Promise((r) => setTimeout(r, 300));
    window.scrollTo(0, 0);
    await new Promise((r) => setTimeout(r, 200));
  });
}

function outPathFor(route) {
  const clean = route.replace(/^\/+|\/+$/g, '');
  return clean ? path.join(DIST, clean, 'index.html') : path.join(DIST, 'index.html');
}

async function main() {
  let chromium;
  try {
    ({ chromium } = await import('playwright'));
  } catch {
    try {
      ({ chromium } = await import('@playwright/test'));
    } catch {
      console.error('✖ Playwright não disponível. Instale com: npx playwright install --with-deps chromium');
      process.exit(1);
    }
  }

  const routes = routesFromSitemap();
  console.log(`▸ Prerender de ${routes.length} rotas do sitemap (locale ${PRERENDER_LOCALE})\n`);

  // A casca original precisa sobreviver: dist/index.html vira a HOME prerenderizada e
  // o fallback do Express não pode servir a home para toda rota desconhecida.
  //
  // A tag canonical sai da casca: ela aponta para a home e o fallback atende rotas que
  // NÃO são a home (/blog/:slug, /admin, 404). Canonical errado é pior que ausente —
  // manda o mecanismo descartar a página. O React grava a canonical certa ao montar.
  const shellSrc = path.join(DIST, 'index.html');
  const shellDst = path.join(DIST, 'app-shell.html');
  if (!existsSync(shellDst)) {
    const shell = readFileSync(shellSrc, 'utf8').replace(/\s*<link[^>]+rel="canonical"[^>]*>/i, '');
    writeFileSync(shellDst, shell);
  }

  const server = await serveDist();

  // Em Docker (node:22-alpine) usamos o Chromium do sistema — `apk add chromium` pesa
  // ~150 MB contra ~2 GB da imagem oficial do Playwright. Fora do container, o
  // Playwright acha o browser dele sozinho.
  const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined;
  const browser = await chromium.launch({
    executablePath,
    // Sem --no-sandbox o Chromium não sobe como root dentro do container.
    args: executablePath ? ['--no-sandbox', '--disable-dev-shm-usage'] : [],
  });
  const context = await browser.newContext({
    viewport: { width: 1366, height: 900 },
    // UA de navegador real: o app não deve receber tratamento diferente por ser bot.
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 W-TechPrerender',
    // O idioma TEM que ser fixado. LanguageContext cai em detectBrowserLandingLanguage(),
    // que lê o locale do navegador — dentro do container o Chromium sobe em en-US e o
    // prerender saía com H1 em inglês ("Master your motorcycle suspension") dentro de um
    // documento marcado como lang="pt-BR". O site canônico é pt-BR.
    locale: PRERENDER_LOCALE,
    extraHTTPHeaders: { 'accept-language': `${PRERENDER_LOCALE},${PRERENDER_LOCALE.split('-')[0]};q=0.9` },
  });

  const results = [];
  for (const route of routes) {
    const page = await context.newPage();
    try {
      // `networkidle` não serve como critério de navegação: páginas com vídeo em loop
      // ou polling nunca ficam ociosas e a rota estoura o timeout (foi o que aconteceu
      // com /wtech-lisboa). O sinal confiável é o conteúdo aparecer dentro de #root.
      await page.goto(`http://127.0.0.1:${PORT}${route}`, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT });

      await page.waitForFunction(
        () => (document.querySelector('#root')?.textContent ?? '').trim().length > 200,
        { timeout: NAV_TIMEOUT },
      );

      // Silêncio de rede é desejável (dados do Supabase chegaram), mas opcional.
      await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => {});

      await scrollThrough(page);
      await page.waitForTimeout(SETTLE_MS);

      const html = await page.evaluate(() => `<!DOCTYPE html>\n${document.documentElement.outerHTML}`);
      const h1 = await page.evaluate(() => document.querySelector('h1')?.textContent?.trim() ?? null);
      const title = await page.title();

      const out = outPathFor(route);
      mkdirSync(path.dirname(out), { recursive: true });
      writeFileSync(out, html);

      results.push({ route, ok: true, bytes: html.length, h1, title });
      console.log(`  ✓ ${route.padEnd(42)} ${String(html.length).padStart(7)} bytes${h1 ? '' : '   ⚠ sem H1'}`);
    } catch (err) {
      results.push({ route, ok: false, error: String(err.message || err).split('\n')[0] });
      console.warn(`  ✖ ${route.padEnd(42)} ${String(err.message || err).split('\n')[0]}`);
    } finally {
      await page.close();
    }
  }

  await browser.close();
  server.close();

  const ok = results.filter((r) => r.ok);
  const noH1 = ok.filter((r) => !r.h1);

  writeFileSync(
    path.join(DIST, 'prerender-manifest.json'),
    JSON.stringify({ generatedAt: new Date().toISOString(), routes: results }, null, 2),
  );

  console.log(`\n▸ ${ok.length}/${routes.length} rotas prerenderizadas`);
  if (noH1.length) console.log(`⚠ ${noH1.length} sem H1: ${noH1.map((r) => r.route).join(', ')}`);

  // Falhas isoladas não quebram o deploy — essas rotas continuam servidas pelo
  // fallback SPA. Zero rotas geradas, porém, significa que o prerender não funcionou.
  if (!ok.length) {
    console.error('✖ Nenhuma rota foi prerenderizada.');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('✖ Prerender falhou:', err);
  process.exit(1);
});
