import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import { build } from 'esbuild';

// Mesmo método do pixel-unit.test.mjs: o esbuild compila o TypeScript e o código
// roda isolado no vm, com window/sessionStorage de mentira. Aqui é `build` com
// bundle, e não `transform`, porque coursePricing importa outros módulos do lib/.
const { outputFiles } = await build({
  stdin: {
    contents: "export * from './lib/coursePricing.ts';\nexport * from './lib/courseOffers.ts';",
    resolveDir: fileURLToPath(new URL('..', import.meta.url)),
    loader: 'ts',
  },
  bundle: true,
  write: false,
  format: 'cjs',
  platform: 'neutral',
  logLevel: 'silent',
});
const code = outputFiles[0].text;

function load({ search = '', stored = null, storageThrows = false } = {}) {
  const storage = new Map(stored === null ? [] : [['wtech_course_offer', stored]]);
  const sessionStorage = {
    getItem(key) {
      if (storageThrows) throw new Error('storage bloqueado');
      return storage.has(key) ? storage.get(key) : null;
    },
    setItem(key, value) {
      if (storageThrows) throw new Error('storage bloqueado');
      storage.set(key, String(value));
    },
    removeItem(key) {
      storage.delete(key);
    },
  };
  const window = { location: { search, hash: '', pathname: '/curso-suspensao-piloto' }, sessionStorage };
  const module = { exports: {} };
  runInNewContext(code, { module, window, sessionStorage, URL, URLSearchParams });
  return { api: module.exports, storage, window };
}

const OFFER = Object.freeze({
  checkoutUrl: 'https://pay.kiwify.com.br/TESTE197',
  integer: '197',
  cents: ',00',
  full: 'R$ 197,00',
  installments: '12x de R$ 20,38 no cartão',
  installmentsShort: '12x R$ 20,38',
  validUntil: '2026-10-31',
  label: 'Condição especial de retorno',
});
const OFFERS = { retorno197: OFFER };
const NOW = new Date('2026-10-01T12:00:00-03:00');
const brasilia = (localTime) => new Date(`${localTime}-03:00`);
const ANNUAL_PT_BR = 'Plano anual com renovação automática. Cancele quando quiser. Pague no cartão em até 12x ou no Pix Automático.';

const { api } = load();
const resolve = (offers, now = NOW, slug = 'retorno197', region = 'br') =>
  api.resolveCourseSpecialOffer(slug, region, offers, now);
const withOffer = (changes) => ({ retorno197: { ...OFFER, ...changes } });

test('sem entrada na lista ninguem ve condicao especial', () => {
  assert.equal(resolve({}), null);
  assert.equal(resolve(OFFERS, NOW, null), null);
});

test('slug desconhecido, invalido ou do prototipo nao ativa nada', () => {
  for (const slug of ['outra', '', '   ', 'retorno 197', '__proto__', 'constructor', 'toString', 'hasOwnProperty']) {
    assert.equal(resolve(OFFERS, NOW, slug), null, slug);
  }
});

test('condicao e so do Brasil: internacional segue 59 euros na Hotmart', () => {
  assert.equal(resolve(OFFERS, NOW, 'retorno197', 'intl'), null);
  // Mesmo recebendo a condição direto, preço e checkout internacionais não mudam.
  assert.equal(api.getCheckoutUrl('intl', undefined, OFFER), api.HOTMART_CHECKOUT_FALLBACK_URL);
  const price = api.getCoursePrice('intl', 'pt-BR', undefined, OFFER);
  assert.equal(price.currency, 'EUR');
  assert.equal(price.full, '59 €');
  assert.equal(price.schemaPrice, '59.00');
});

test('checkout fora do Kiwify oficial, ou o proprio checkout cheio, derruba a condicao', () => {
  const invalid = [
    'http://pay.kiwify.com.br/TESTE197',
    'https://pay.kiwify.com.br.evil.test/TESTE197',
    'https://evil.test/pay.kiwify.com.br/TESTE197',
    'https://kiwify.com.br/TESTE197',
    'https://user:senha@pay.kiwify.com.br/TESTE197',
    'https://pay.kiwify.com.br:8443/TESTE197',
    'https://pay.kiwify.com.br/#TESTE197',
    'https://pay.kiwify.com.br/',
    'pay.kiwify.com.br/TESTE197',
    'javascript:alert(1)',
    '',
    // Anunciar o preço menor e mandar para o checkout de R$ 347 é o pior erro possível.
    api.KIWIFY_CHECKOUT_URL,
    `${api.KIWIFY_CHECKOUT_URL}?afid=123`,
    `${api.KIWIFY_CHECKOUT_URL}/`,
  ];
  for (const checkoutUrl of invalid) {
    assert.equal(resolve(withOffer({ checkoutUrl })), null, checkoutUrl);
  }
});

test('link com espaco ou host em maiusculas e normalizado antes de virar botao', () => {
  const resolved = resolve(withOffer({ checkoutUrl: '  https://PAY.KIWIFY.COM.BR/TESTE197  ' }));
  assert.equal(resolved.checkoutUrl, 'https://pay.kiwify.com.br/TESTE197');
  assert.equal(resolved.full, 'R$ 197,00');
});

test('valor a vista precisa ser positivo', () => {
  for (const integer of ['0', '', 'R$']) {
    assert.equal(resolve(withOffer({ integer, cents: ',00' })), null, integer);
  }
});

test('validUntil so com data vale ate 23:59 de Brasilia e expira a meia-noite', () => {
  assert.equal(resolve(OFFERS, brasilia('2026-10-31T23:59:59')), OFFER);
  assert.equal(resolve(OFFERS, brasilia('2026-11-01T00:00:00')), null);
  assert.equal(resolve(withOffer({ validUntil: '2026-09-01' })), null);
});

test('validUntil com hora corta no minuto, lido em Brasilia quando nao tem fuso', () => {
  const at = (validUntil, now) => resolve(withOffer({ validUntil }), now);
  assert.notEqual(at('2026-10-31T12:00', brasilia('2026-10-31T11:59:59')), null);
  assert.equal(at('2026-10-31T12:00', brasilia('2026-10-31T12:00:01')), null);
  assert.notEqual(at('2026-10-31T15:00:00Z', brasilia('2026-10-31T11:59:59')), null);
  assert.equal(at('2026-10-31T15:00:00Z', brasilia('2026-10-31T12:00:01')), null);
});

test('validUntil ilegivel desliga a condicao em vez de deixa-la para sempre', () => {
  // '2026-11-31' não existe; o Date.parse o levaria a 1º de dezembro, ainda no futuro.
  for (const validUntil of ['31/10/2026', '2026-11-31', '2026-13-01', '2026-10-31T24:00', 'amanha', '']) {
    assert.equal(resolve(withOffer({ validUntil })), null, validUntil);
  }
});

test('condicao valida volta intacta, inclusive sem validade e com slug em maiusculas', () => {
  assert.equal(resolve(OFFERS), OFFER);
  assert.equal(resolve(OFFERS, NOW, ' Retorno197 '), OFFER);
  const { validUntil: _semData, ...perpetual } = OFFER;
  assert.equal(resolve({ retorno197: perpetual }, new Date('2099-01-01T00:00:00Z')), perpetual);
});

test('sem condicao, preco e checkout do Brasil continuam os de sempre', () => {
  for (const offer of [undefined, null]) {
    const price = api.getCoursePrice('br', 'pt-BR', undefined, offer);
    assert.equal(price.integer, '347');
    assert.equal(price.full, 'R$ 347,00');
    assert.equal(price.installments, '12x de R$ 35,89 no cartão');
    assert.equal(price.installmentsShort, '12x R$ 35,89');
    assert.equal(price.anchor, 'R$ 997,00');
    assert.equal(price.strikeLabel, 'De R$ 997,00 por');
    assert.equal(price.cashLabel, 'ou apenas R$ 347,00 à vista');
    assert.equal(price.schemaPrice, '347.00');
    assert.equal(api.getCheckoutUrl('br', undefined, offer), api.KIWIFY_CHECKOUT_URL);
  }
  // Chamadas antigas, sem o parâmetro novo, seguem funcionando.
  assert.equal(api.getCoursePrice('br', 'pt-BR').full, 'R$ 347,00');
  assert.equal(api.getCheckoutUrl('br'), api.KIWIFY_CHECKOUT_URL);
});

test('com condicao, preco e checkout trocam juntos; bonus e aviso anual ficam', () => {
  const price = api.getCoursePrice('br', 'pt-BR', undefined, OFFER);
  assert.equal(price.integer, '197');
  assert.equal(price.cents, ',00');
  assert.equal(price.full, 'R$ 197,00');
  assert.equal(price.installments, '12x de R$ 20,38 no cartão');
  assert.equal(price.installmentsShort, '12x R$ 20,38');
  assert.equal(price.cashLabel, 'ou apenas R$ 197,00 à vista');
  assert.equal(price.strikeLabel, 'De R$ 997,00 por');
  assert.equal(price.anchor, 'R$ 997,00');
  assert.equal(price.schemaPrice, '197.00');
  assert.equal(price.schemaCurrency, 'BRL');
  assert.equal(price.bonusValue, 'R$ 997,00');
  assert.equal(price.billingNote, ANNUAL_PT_BR);
  assert.equal(api.getCheckoutUrl('br', undefined, OFFER), 'https://pay.kiwify.com.br/TESTE197');

  const withAnchor = api.getCoursePrice('br', 'pt-BR', undefined, { ...OFFER, anchor: 'R$ 347,00' });
  assert.equal(withAnchor.anchor, 'R$ 347,00');
  assert.equal(withAnchor.strikeLabel, 'De R$ 347,00 por');
  assert.equal(withAnchor.bonusValue, 'R$ 997,00');
});

test('aviso de plano anual no real, em todos os idiomas, e nenhum no euro', () => {
  assert.equal(api.getCoursePrice('br', 'pt-BR').billingNote, ANNUAL_PT_BR);
  for (const language of ['pt-BR', 'pt-PT', 'es', 'en']) {
    assert.match(api.getCoursePrice('br', language).billingNote, /(renovação|renovación|renewal).*Pix Automático/, language);
    assert.equal(api.getCoursePrice('intl', language).billingNote, null, language);
  }
});

test('begin_checkout leva o valor da condicao quando ela esta ativa', () => {
  const { api: browser, window, storage } = load();
  browser.trackCourseCheckoutStart('br', 'pt-BR', OFFER);
  browser.trackCourseCheckoutStart('br', 'pt-BR');
  browser.trackCourseCheckoutStart('intl', 'pt-BR', OFFER);
  const checkouts = window.dataLayer.filter((entry) => entry.event === 'begin_checkout');
  assert.equal(checkouts.length, 3);
  assert.equal(checkouts[0].value, 197);
  assert.equal(checkouts[0].currency, 'BRL');
  assert.equal(checkouts[0].provider, 'kiwify');
  assert.equal(checkouts[1].value, 347);
  assert.equal(checkouts[2].value, 59);
  assert.equal(checkouts[2].provider, 'hotmart');
  assert.equal(storage.get(browser.COURSE_CHECKOUT_FLAG), 'hotmart');
});

test('?oferta= na URL vence o que esta guardado e chega normalizado', () => {
  const { api: browser } = load({ search: '?utm_source=meta&oferta=Retorno197', stored: 'antiga' });
  assert.equal(browser.readCourseOfferSlug(), 'retorno197');
});

test('sem parametro, a condicao guardada sobrevive a navegacao na aba', () => {
  const first = load({ search: '?oferta=retorno197' });
  first.api.rememberCourseOfferSlug(first.api.readCourseOfferSlug());
  assert.equal(first.storage.get(first.api.COURSE_OFFER_STORAGE_KEY), 'retorno197');

  const next = load({ search: '?utm_source=meta', stored: first.storage.get('wtech_course_offer') });
  assert.equal(next.api.readCourseOfferSlug(), 'retorno197');
  // Lixo na URL não substitui a condição guardada, e lixo guardado não vira slug.
  assert.equal(load({ search: '?oferta=%3Cscript%3E', stored: 'retorno197' }).api.readCourseOfferSlug(), 'retorno197');
  assert.equal(load({ stored: '<script>' }).api.readCourseOfferSlug(), null);
});

test('storage bloqueado ou pagina sem navegador nunca derrubam a LP', () => {
  const blocked = load({ search: '?oferta=retorno197', storageThrows: true });
  assert.equal(blocked.api.readCourseOfferSlug(), 'retorno197');
  assert.doesNotThrow(() => blocked.api.rememberCourseOfferSlug('retorno197'));
  assert.equal(load({ storageThrows: true }).api.readCourseOfferSlug(), null);

  const module = { exports: {} };
  runInNewContext(code, { module, URL, URLSearchParams });
  assert.equal(module.exports.readCourseOfferSlug(), null);
  assert.doesNotThrow(() => module.exports.rememberCourseOfferSlug('retorno197'));
});

test('condicoes publicadas estao bem formadas (vale para cada entrada nova)', () => {
  for (const [slug, offer] of Object.entries(api.COURSE_SPECIAL_OFFERS)) {
    assert.equal(api.normalizeCourseOfferSlug(slug), slug, `chave "${slug}": use slug em minúsculas`);
    // Relógio em 1970: aqui importa se link, valor e data são legíveis, não se já expirou.
    assert.notEqual(
      api.resolveCourseSpecialOffer(slug, 'br', api.COURSE_SPECIAL_OFFERS, new Date(0)),
      null,
      `"${slug}": link Kiwify, valor ou validUntil inválido`,
    );
    assert.ok(offer.full.includes(`${offer.integer}${offer.cents}`), `"${slug}": full diverge de integer + cents`);
  }
});
