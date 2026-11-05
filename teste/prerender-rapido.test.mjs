import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { joinPrerender, rewritePage } from '../scripts/juntar-prerender.mjs';

const shell = (js, css) => `<!doctype html><head><script type="module" crossorigin src="/assets/${js}"></script><link rel="stylesheet" crossorigin href="/assets/${css}"></head><body><div id="root"></div></body>`;

function fakeDist(root, name, { js, css, assets, pages }) {
  const dist = path.join(root, name);
  mkdirSync(path.join(dist, 'assets'), { recursive: true });
  writeFileSync(path.join(dist, 'app-shell.html'), shell(js, css));
  writeFileSync(path.join(dist, 'index.html'), `home ${name}`);
  for (const asset of assets) writeFileSync(path.join(dist, 'assets', asset), `${name}:${asset}`);
  for (const [route, html] of Object.entries(pages)) {
    mkdirSync(path.join(dist, route), { recursive: true });
    writeFileSync(path.join(dist, route, 'index.html'), html);
  }
  return dist;
}

test('reaproveita as páginas antigas com o código novo e sem sobrescrever as refeitas', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'prerender-'));
  try {
    const oldPage = (titulo) => `<head><script type="module" crossorigin src="/assets/index-OLD.js"></script><link rel="stylesheet" crossorigin href="/assets/index-OLD.css"><link rel="modulepreload" crossorigin href="/assets/Blog-OLD.js"><link rel="modulepreload" crossorigin href="/assets/vendor-SAME.js"></head><h1>${titulo}</h1>`;
    const previous = fakeDist(root, 'anterior', {
      js: 'index-OLD.js',
      css: 'index-OLD.css',
      assets: ['index-OLD.js', 'index-OLD.css', 'Blog-OLD.js', 'vendor-SAME.js'],
      pages: { 'blog/post-a': oldPage('Post A'), 'maquina-de-vacuo': 'pagina antiga' },
    });
    const current = fakeDist(root, 'novo', {
      js: 'index-NEW.js',
      css: 'index-NEW.css',
      assets: ['index-NEW.js', 'index-NEW.css', 'vendor-SAME.js'],
      pages: { 'maquina-de-vacuo': 'pagina refeita' },
    });
    writeFileSync(path.join(previous, 'prerender-manifest.json'), JSON.stringify({ routes: [{ route: '/blog/post-a', ok: true }, { route: '/maquina-de-vacuo', ok: true, old: true }] }));
    writeFileSync(path.join(current, 'prerender-manifest.json'), JSON.stringify({ routes: [{ route: '/maquina-de-vacuo', ok: true }] }));

    const result = joinPrerender(previous, current);
    assert.deepEqual(result, { reused: 1, keptAssets: 3 });

    const reused = readFileSync(path.join(current, 'blog/post-a/index.html'), 'utf8');
    assert.match(reused, /<h1>Post A<\/h1>/);
    assert.match(reused, /src="\/assets\/index-NEW\.js"/);
    assert.match(reused, /href="\/assets\/index-NEW\.css"/);
    assert.doesNotMatch(reused, /index-OLD/);
    assert.doesNotMatch(reused, /Blog-OLD/, 'pré-carregamento de arquivo que saiu do build');
    assert.match(reused, /vendor-SAME\.js/, 'pré-carregamento de arquivo que continua existindo');

    assert.equal(readFileSync(path.join(current, 'maquina-de-vacuo/index.html'), 'utf8'), 'pagina refeita');
    assert.equal(readFileSync(path.join(current, 'index.html'), 'utf8'), 'home novo');
    assert.equal(readFileSync(path.join(current, 'assets/vendor-SAME.js'), 'utf8'), 'novo:vendor-SAME.js');
    assert.ok(existsSync(path.join(current, 'assets/Blog-OLD.js')), 'quem está com a página aberta ainda pede o chunk antigo');

    const manifest = JSON.parse(readFileSync(path.join(current, 'prerender-manifest.json'), 'utf8'));
    assert.deepEqual(manifest.routes.map((entry) => entry.route).sort(), ['/blog/post-a', '/maquina-de-vacuo']);
    assert.equal(manifest.routes.find((entry) => entry.route === '/maquina-de-vacuo').old, undefined);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('falha cedo se a imagem anterior não tiver a casca da SPA', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'prerender-'));
  try {
    mkdirSync(path.join(root, 'anterior'));
    const current = fakeDist(root, 'novo', { js: 'index-NEW.js', css: 'index-NEW.css', assets: ['index-NEW.js'], pages: {} });
    assert.throws(() => joinPrerender(path.join(root, 'anterior'), current));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('reescrever a página não mexe em texto que só parece um asset', () => {
  const html = '<script type="module" src="/assets/index-OLD.js"></script><p>modulepreload não é tag aqui</p>';
  const out = rewritePage(html, { script: '/assets/index-OLD.js' }, { script: '/assets/index-NEW.js' }, new Set(['index-NEW.js']));
  assert.equal(out, '<script type="module" src="/assets/index-NEW.js"></script><p>modulepreload não é tag aqui</p>');
});
