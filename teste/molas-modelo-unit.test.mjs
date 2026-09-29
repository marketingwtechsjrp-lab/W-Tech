import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import { build } from 'esbuild';

// Mesmo método do seo-base-unit.test.mjs: o esbuild compila o TypeScript e o código
// roda isolado no vm.
const raiz = fileURLToPath(new URL('..', import.meta.url));
const { outputFiles } = await build({
  stdin: { contents: "export * from './lib/springModels.ts';", resolveDir: raiz, loader: 'ts' },
  bundle: true,
  write: false,
  format: 'cjs',
  platform: 'neutral',
  logLevel: 'silent',
});
const module = { exports: {} };
runInNewContext(outputFiles[0].text, { module, exports: module.exports, console, Intl });
const molas = module.exports;

// Linhas reais do catálogo (KTM SX-F 450/505 2007): faixas de 5 kg só com a mola de
// fábrica, faixas de 10 kg com recomendação, e o " N" com espaço do banco.
const LINHAS = [
  { brand: 'KTM', model: 'SX-F 450/ SX-F 505 2007', part_type: 'Rear', weight_range: '70-75kg', spring_code: null, standard_code: 'WP 63-250-66 N' },
  { brand: 'KTM', model: 'SX-F 450/ SX-F 505 2007', part_type: 'Rear', weight_range: '75-85kg', spring_code: 'WP 63-250-66N', standard_code: 'WP 63-250-66 N' },
  { brand: 'KTM', model: 'SX-F 450/ SX-F 505 2007', part_type: 'Rear', weight_range: '65-75kg', spring_code: 'WP 63-250-63N', standard_code: 'WP 63-250-66 N' },
  { brand: 'KTM', model: 'SX-F 450/ SX-F 505 2007', part_type: 'Rear', weight_range: '85-95kg', spring_code: 'WP 63-250-69N', standard_code: 'WP 63-250-66 N' },
  { brand: 'KTM', model: 'SX-F 450/ SX-F 505 2007', part_type: 'Front', weight_range: '85-95kg', spring_code: 'WP 48-495-4,8N', standard_code: 'WP 48-495-4,6N' },
  { brand: 'KTM', model: 'SX-F 450/ SX-F 505 2007', part_type: 'Front', weight_range: '75-85kg', spring_code: 'WP 48-495-4,6N', standard_code: 'WP 48-495-4,6N' },
  { brand: 'KTM', model: 'SX-F 450/ SX-F 505 2007', part_type: 'Front', weight_range: '115-125kg', spring_code: 'N/A', standard_code: 'WP 48-495-4,6N' },
];

test('slug do modelo segue a regra da coluna model_slug', () => {
  assert.equal(molas.slugDoModelo('KTM', 'SX-F 450/ SX-F 505 2007'), 'ktm-sx-f-450-sx-f-505-2007');
  assert.equal(molas.slugDoModelo('Honda', 'CRF450R 2009-2011'), 'honda-crf450r-2009-2011');
  assert.equal(molas.slugDoModelo('Fantic', 'XEF 450-2020-2024'), 'fantic-xef-450-2020-2024');
});

test('lê a taxa do código da mola e ignora o que não é mola', () => {
  assert.equal(molas.lerMola('SH 42,75-495-4,8N').taxa, 4.8);
  assert.equal(molas.lerMola('WP 63-250-66 N').taxa, 66);
  assert.equal(molas.lerMola('WP 63-250-66 N').codigo, 'WP 63-250-66N');
  assert.equal(molas.lerMola('WP 43.2-485- N').taxa, null);
  assert.equal(molas.lerMola('N/A'), null);
  assert.equal(molas.lerMola(''), null);
  assert.equal(molas.lerMola(null), null);
});

test('monta a tabela só com faixas recomendadas, em ordem de peso', () => {
  const tabela = molas.montarTabela(LINHAS);
  assert.deepEqual(Array.from(tabela.faixas, (f) => f.rotulo), ['65 a 75 kg', '75 a 85 kg', '85 a 95 kg']);
  const faixa90 = molas.faixaDoPeso(tabela, 90);
  assert.equal(faixa90.rotulo, '85 a 95 kg');
  assert.equal(faixa90.bengala.taxa, 4.8);
  assert.equal(faixa90.amortecedor.taxa, 69);
  assert.equal(molas.faixaDoPeso(tabela, 150), null);
});

test('marca a mola de fábrica mesmo com o espaço antes do N', () => {
  const tabela = molas.montarTabela(LINHAS);
  assert.equal(tabela.fabricaAmortecedor.taxa, 66);
  assert.equal(tabela.fabricaBengala.taxa, 4.6);
  assert.deepEqual(Array.from(tabela.faixasDeFabricaAmortecedor), ['75 a 85 kg']);
  assert.deepEqual(Array.from(tabela.faixasDeFabricaBengala), ['75 a 85 kg']);
});

test('formata a taxa em N/mm com vírgula', () => {
  assert.equal(molas.formatarTaxa(4.8), '4,8 N/mm');
  assert.equal(molas.formatarTaxa(null), '—');
});
