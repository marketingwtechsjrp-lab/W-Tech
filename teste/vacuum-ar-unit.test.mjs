import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

// Realidade aumentada no Android: a máquina precisa aparecer mesmo quando o celular não acha superfície.
const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pasta = mkdtempSync(path.join(tmpdir(), 'vacuum-ar-'));
const arquivo = path.join(pasta, 'placement.mjs');
await build({ entryPoints: [path.join(raiz, 'components/vacuum-pump/vacuumArPlacement.ts')], outfile: arquivo, format: 'esm', bundle: true, platform: 'node', logLevel: 'silent' });
const { arStageOf, estimatedSpot, isUpFacing } = await import(pathToFileURL(arquivo).href);
test.after(() => rmSync(pasta, { recursive: true, force: true }));

// Câmera em (0, 1.3, 0): colunas X, Y, Z e posição, olhando para -Z e inclinada pelo ângulo pedido.
const viewer = (pitch) => {
    const c = Math.cos(pitch);
    const s = Math.sin(pitch);
    return [1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 1.3, 0, 1];
};

test('câmera começando não é referência perdida', () => {
    assert.equal(arStageOf({ tracking: false, everTracked: false, placement: 'none', surface: false }), 'searching');
    assert.equal(arStageOf({ tracking: false, everTracked: true, placement: 'estimated', surface: false }), 'lost');
});

test('cada situação tem o seu aviso', () => {
    const state = { tracking: true, everTracked: true, surface: false };
    assert.equal(arStageOf({ ...state, placement: 'none' }), 'searching');
    assert.equal(arStageOf({ ...state, placement: 'none', surface: true }), 'ready');
    assert.equal(arStageOf({ ...state, placement: 'estimated' }), 'estimated');
    assert.equal(arStageOf({ ...state, placement: 'surface' }), 'placed');
});

test('parede e teto não contam como superfície', () => {
    assert.equal(isUpFacing([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]), true);
    assert.equal(isUpFacing([1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1]), false);
    assert.equal(isUpFacing([1, 0, 0, 0, 0, -1, 0, 0, 0, 0, -1, 0, 0, 0, 0, 1]), false);
});

test('com o celular em pé, a máquina fica à frente e abaixo da câmera', () => {
    const spot = estimatedSpot(viewer(0), 0.31);
    assert.ok(Math.abs(spot.x) < 1e-9);
    assert.ok(Math.abs(spot.z + 1) < 1e-9);
    assert.ok(Math.abs(spot.y - 0.95) < 1e-9);
});

test('com o celular inclinado para baixo, o corpo da máquina fica no centro da tela', () => {
    const pitch = -Math.PI / 4;
    const spot = estimatedSpot(viewer(pitch), 0.31);
    assert.ok(Math.abs(spot.y + 0.155 - (1.3 + Math.sin(pitch))) < 1e-9);
    assert.ok(Math.abs(spot.z + Math.cos(pitch)) < 1e-9);
});

test('olhando para cima, os pés continuam abaixo da câmera', () => {
    assert.ok(estimatedSpot(viewer(Math.PI / 4), 0.31).y < 0.96);
});
