#!/usr/bin/env node
/**
 * juntar-prerender.mjs — etapa do deploy rápido (Dockerfile.rapido).
 *
 *   node scripts/juntar-prerender.mjs <dist da imagem anterior> <dist novo>
 *
 * O prerender completo abre quase 1.800 rotas e leva 45 minutos. No deploy rápido só as rotas
 * alteradas são refeitas, e as demais reaproveitam o HTML da imagem que está no ar:
 *
 * 1. Copia as páginas que o build novo não gerou, sem sobrescrever nenhuma.
 * 2. Nelas, troca o JS e o CSS de entrada pelos do build novo: o React remonta a página, então
 *    o visitante recebe o código atual. O HTML antigo vale para crawler e primeira pintura.
 * 3. Tira os modulepreload de arquivos que não existem mais no build novo, para não baixar à toa.
 * 4. Mantém os assets antigos: quem está com a página aberta ainda pede os chunks anteriores.
 *
 * O conteúdo das páginas reaproveitadas só se atualiza no próximo deploy completo.
 */

import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

/** Página de rota: index.html em subpasta. O da raiz é a home, que o build novo sempre refaz. */
function listRoutePages(dist) {
  const pages = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (!(dir === dist && entry.name === 'assets')) walk(path.join(dir, entry.name));
      } else if (entry.name === 'index.html' && dir !== dist) {
        pages.push(path.relative(dist, path.join(dir, entry.name)));
      }
    }
  };
  walk(dist);
  return pages;
}

/** JS e CSS de entrada da casca da SPA, que é igual em toda rota. */
function entryAssets(shellHtml) {
  const script = shellHtml.match(/<script[^>]+type="module"[^>]+src="(\/assets\/[^"]+\.js)"/)?.[1];
  const style = shellHtml.match(/<link[^>]+rel="stylesheet"[^>]+href="(\/assets\/[^"]+\.css)"/)?.[1];
  if (!script) throw new Error('Casca da SPA sem o script de entrada.');
  return { script, style };
}

export function rewritePage(html, previous, current, currentAssets) {
  let out = html.split(previous.script).join(current.script);
  if (previous.style && current.style) out = out.split(previous.style).join(current.style);
  return out.replace(/\s*<link\b[^>]*rel="modulepreload"[^>]*>/g, (tag) => {
    const href = tag.match(/href="\/assets\/([^"]+)"/)?.[1];
    return href && !currentAssets.has(href) ? '' : tag;
  });
}

export function joinPrerender(previousDist, currentDist) {
  const previous = entryAssets(readFileSync(path.join(previousDist, 'app-shell.html'), 'utf8'));
  const current = entryAssets(readFileSync(path.join(currentDist, 'app-shell.html'), 'utf8'));
  const currentAssets = new Set(readdirSync(path.join(currentDist, 'assets')));

  let reused = 0;
  for (const page of listRoutePages(previousDist)) {
    const target = path.join(currentDist, page);
    if (existsSync(target)) continue;
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, rewritePage(readFileSync(path.join(previousDist, page), 'utf8'), previous, current, currentAssets));
    reused += 1;
  }

  let keptAssets = 0;
  for (const asset of readdirSync(path.join(previousDist, 'assets'))) {
    const target = path.join(currentDist, 'assets', asset);
    if (existsSync(target)) continue;
    copyFileSync(path.join(previousDist, 'assets', asset), target);
    keptAssets += 1;
  }

  // O manifesto do deploy rápido só listaria as rotas refeitas: junta com o anterior.
  const manifestPath = path.join(currentDist, 'prerender-manifest.json');
  const previousManifestPath = path.join(previousDist, 'prerender-manifest.json');
  if (existsSync(manifestPath) && existsSync(previousManifestPath)) {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    const remade = new Set(manifest.routes.map((entry) => entry.route));
    const kept = JSON.parse(readFileSync(previousManifestPath, 'utf8')).routes.filter((entry) => !remade.has(entry.route));
    writeFileSync(manifestPath, JSON.stringify({ ...manifest, routes: [...manifest.routes, ...kept] }, null, 2));
  }

  return { reused, keptAssets };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  const [previousDist, currentDist] = process.argv.slice(2);
  if (!previousDist || !currentDist) {
    console.error('Uso: node scripts/juntar-prerender.mjs <dist anterior> <dist novo>');
    process.exit(1);
  }
  const { reused, keptAssets } = joinPrerender(path.resolve(previousDist), path.resolve(currentDist));
  console.log(`▸ ${reused} páginas reaproveitadas e ${keptAssets} assets anteriores mantidos`);
  if (!reused) {
    console.error('✖ Nenhuma página reaproveitada: a imagem anterior não tem o prerender. Rode o deploy completo.');
    process.exit(1);
  }
}
