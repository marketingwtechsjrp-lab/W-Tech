import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

// Metas do painel de vendas: valor ruim nunca pode quebrar a tela nem zerar o placar da TV.
const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pasta = mkdtempSync(path.join(tmpdir(), 'vacuum-goals-'));
const arquivo = path.join(pasta, 'goals.mjs');
await build({ entryPoints: [path.join(raiz, 'lib/vacuumGoals.ts')], outfile: arquivo, format: 'esm', bundle: true, platform: 'node', logLevel: 'silent' });
const { VACUUM_DEFAULT_GOALS, normalizeVacuumGoals, parseVacuumGoals } = await import(pathToFileURL(arquivo).href);
test.after(() => rmSync(pasta, { recursive: true, force: true }));

test('sem configuração, valem as metas da reunião de lançamento', () => {
    assert.deepEqual(parseVacuumGoals(null), { machines: 30, stretch: 50, revenue: 239700, daily: 5 });
});

test('JSON quebrado cai no padrão em vez de derrubar o painel', () => {
    assert.deepEqual(parseVacuumGoals('{nao é json'), VACUUM_DEFAULT_GOALS);
});

test('metas salvas são lidas de volta', () => {
    assert.deepEqual(parseVacuumGoals(JSON.stringify({ machines: 40, stretch: 80, revenue: 500000, daily: 8 })), { machines: 40, stretch: 80, revenue: 500000, daily: 8 });
});

test('zero, negativo e texto caem no padrão, campo a campo', () => {
    assert.deepEqual(normalizeVacuumGoals({ machines: 0, stretch: -5, revenue: 'muito', daily: null }), VACUUM_DEFAULT_GOALS);
});

test('a meta máxima nunca fica abaixo da meta', () => {
    const goals = normalizeVacuumGoals({ machines: 80, stretch: 50 });
    assert.equal(goals.machines, 80);
    assert.equal(goals.stretch, 80);
});

test('máquina é número inteiro', () => {
    assert.equal(normalizeVacuumGoals({ machines: 12.9 }).machines, 12);
});
