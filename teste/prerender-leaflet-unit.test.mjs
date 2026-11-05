import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// O prerender rola a página inteira, e isso aciona o mapa sob demanda das homes. Se a Leaflet
// entrar no HTML gravado, o CSS que travava a renderização volta para toda visita (commit 284bb26b).
// Rodar o prerender de verdade pede um build; aqui fica a trava contra alguém tirar a proteção.
const fonte = readFileSync(fileURLToPath(new URL('../scripts/prerender.mjs', import.meta.url)), 'utf8');

test('o prerender não baixa a Leaflet', () => {
  assert.match(fonte, /context\.route\(\/[^\n]*unpkg\\\.com\\\/leaflet[^\n]*route\.abort\(\)/);
});

test('o prerender tira do HTML gravado as tags que o carregador da Leaflet cria', () => {
  assert.match(fonte, /script\[src\][\s\S]*?unpkg\\\.com\\\/leaflet[\s\S]*?script\.remove\(\)/);
  assert.match(fonte, /querySelector\('link\[data-leaflet\]'\)\?\.remove\(\)/);
});
