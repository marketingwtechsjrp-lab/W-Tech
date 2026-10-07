import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { transform } from 'esbuild';

const source = await readFile(new URL('../lib/checkoutReturn.ts', import.meta.url), 'utf8');
const { code } = await transform(source, { loader: 'ts', format: 'cjs' });
const module = { exports: {} };
runInNewContext(code, { module, exports: module.exports, URLSearchParams });
const { pedidoDaUrl } = module.exports;

test('retorno real da Kiwify: lê order_code em vez de cair no id genérico do dia', () => {
  const search = '?utm_source=meta&order_code=CwZQnif&amount=NaN&payment_version=kiwipay&payment_type=cartao&sck=1791333089980_17913332437124';
  assert.equal(pedidoDaUrl(search), 'CwZQnif');
});

test('order_code tem prioridade sobre um id genérico que venha junto', () => {
  assert.equal(pedidoDaUrl('?id=123&order_code=Qn1VL1T'), 'Qn1VL1T');
});

test('nomes antigos continuam valendo (Hotmart e retornos manuais)', () => {
  assert.equal(pedidoDaUrl('?transaction=HP123456'), 'HP123456');
  assert.equal(pedidoDaUrl('?order_id=abc-1'), 'abc-1');
});

test('sem pedido na URL, ou só espaços, devolve null', () => {
  assert.equal(pedidoDaUrl(''), null);
  assert.equal(pedidoDaUrl('?utm_source=direto&sck=1'), null);
  assert.equal(pedidoDaUrl('?order_code=%20%20'), null);
});

test('remove espaços nas pontas do código', () => {
  assert.equal(pedidoDaUrl('?order_code=%20CwZQnif%20'), 'CwZQnif');
});
