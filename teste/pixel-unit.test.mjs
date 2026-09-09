import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { transform } from 'esbuild';

const source = await readFile(new URL('../lib/metaPixel.ts', import.meta.url), 'utf8');
const { code } = await transform(source, { loader: 'ts', format: 'cjs' });
const googleSource = await readFile(new URL('../lib/googleTracking.ts', import.meta.url), 'utf8');
const google = await transform(googleSource, { loader: 'ts', format: 'cjs' });

function fixture({ sdk = true, initialized = true, throwing = false } = {}) {
  const calls = [];
  const timers = [];
  const window = {
    location: { pathname: '/lp/test' },
    setTimeout: (fn) => { timers.push(fn); return timers.length; },
    _meta_gtm_ids: initialized ? ['1287422246429098'] : [],
  };
  const fbq = (...args) => { if (throwing) throw new Error('SDK indisponivel'); calls.push(args); };
  if (sdk) window.fbq = fbq;
  const module = { exports: {} };
  runInNewContext(code, { window, module, crypto: { randomUUID: () => String(Math.random()) } });
  return { api: module.exports, calls, window, fbq, flush: () => { while (timers.length) timers.shift()(); } };
}

test('eventos de curso sao exclusivos do pixel do curso, com ID e sem PageView extra', () => {
  const { api, calls } = fixture();
  api.trackMetaStandardEvent('ViewContent', api.courseContentParams('vsl'), { onceKey: 'view' });
  api.trackMetaStandardEvent('ViewContent', {}, { onceKey: 'view' });
  assert.equal(calls.length, 1);
  assert.deepEqual(Array.from(calls[0].slice(0, 3)), ['trackSingle', api.COURSE_META_PIXEL_ID, 'ViewContent']);
  assert.match(calls[0][4].eventID, /^wtech_viewcontent_/);
  assert.equal(Object.hasOwn(calls[0][3], 'value'), false);
});

test('SDK lento: preserva o evento e o ID ate a inicializacao do pixel pelo GTM', () => {
  const f = fixture({ sdk: false, initialized: false });
  const id = f.api.trackMetaCustomEvent('QuizStart', {}, { onceKey: 'start' });
  f.api.trackMetaCustomEvent('QuizStart', {}, { onceKey: 'start' });
  assert.equal(f.calls.length, 0);
  f.window.fbq = f.fbq;
  f.window._meta_gtm_ids.push(f.api.COURSE_META_PIXEL_ID);
  f.flush();
  assert.equal(f.calls.length, 1);
  assert.equal(f.calls[0][0], 'trackSingleCustom');
  assert.equal(f.calls[0][4].eventID, id);
});

test('existencia do SDK sem inicializacao do curso nao perde evento', () => {
  const f = fixture({ initialized: false });
  f.api.trackMetaCustomEvent('QuizCompleted');
  assert.equal(f.calls.length, 0);
  f.window._meta_gtm_ids.push(f.api.COURSE_META_PIXEL_ID);
  f.flush();
  assert.equal(f.calls.length, 1);
});

test('pixel geral preservado, sem broadcast ou reinjecao de SDK', () => {
  const { api, calls } = fixture();
  api.configureSitePixel(api.SITE_META_PIXEL_ID);
  api.configureSitePixel(api.SITE_META_PIXEL_ID);
  assert.equal(calls.filter(c => c[0] === 'init').length, 1);
  assert.equal(calls.filter(c => c[2] === 'PageView').length, 1);
  assert.equal(calls[1][1], api.SITE_META_PIXEL_ID);
  assert.equal(calls.some(c => c[0] === 'track'), false);
});

test('LP configurada usa seu pixel e nao duplica a PageView global', () => {
  const { api, calls } = fixture();
  api.trackConfiguredLandingPageView({ pixelId: api.SITE_META_PIXEL_ID, slug: 'fisico' });
  api.configureSitePixel(api.SITE_META_PIXEL_ID);
  api.trackConfiguredLandingPageRegistration({ pixelId: api.SITE_META_PIXEL_ID, slug: 'fisico' });
  assert.equal(calls.filter(c => c[2] === 'PageView').length, 1);
  assert.equal(calls.find(c => c[2] === 'CompleteRegistration')[1], api.SITE_META_PIXEL_ID);
});

test('LP generica sem pixel nao envia conversao ao curso online', () => {
  const { api, calls } = fixture();
  api.trackConfiguredLandingPageView({ slug: 'presencial' });
  api.trackConfiguredLandingPageRegistration({ slug: 'presencial' });
  assert.equal(calls.every(c => c[1] === api.SITE_META_PIXEL_ID), true);
});

test('pixel invalido e ignorado, nunca redirecionado silenciosamente ao curso', () => {
  const { api, calls } = fixture();
  assert.equal(api.trackMetaStandardEvent('Lead', {}, { pixelId: 'invalido' }), null);
  api.trackConfiguredLandingPageView({ pixelId: 'invalido' });
  assert.equal(calls.length, 0);
});

test('falha do fornecedor nao interrompe formulario e permite nova tentativa apos timeout', () => {
  const f = fixture({ throwing: true });
  assert.doesNotThrow(() => f.api.trackMetaStandardEvent('Lead', {}, { onceKey: 'lead' }));
  f.flush();
  f.window.fbq = (...args) => f.calls.push(args);
  f.api.trackMetaStandardEvent('Lead', {}, { onceKey: 'lead' });
  assert.equal(f.calls.length, 1);
});

test('deduplicacao separa eventos e pixels mesmo com a mesma chave', () => {
  const { api, calls } = fixture();
  api.trackMetaStandardEvent('Lead', {}, { onceKey: 'same' });
  api.trackMetaCustomEvent('QuizCompleted', {}, { onceKey: 'same' });
  api.trackMetaStandardEvent('Lead', {}, { onceKey: 'same', pixelId: api.SITE_META_PIXEL_ID });
  assert.equal(calls.filter(c => c[0] !== 'init').length, 3);
});

test('GA usa comando event na fila existente, sem novo config/SDK', () => {
  const window = { dataLayer: [{ event: 'gtm.js' }] };
  const module = { exports: {} };
  runInNewContext(google.code, { window, module });
  module.exports.trackGoogleEvent('start', { event_category: 'Quiz' });
  assert.equal(window.dataLayer.length, 2);
  assert.equal(window.dataLayer[1][0], 'event');
  assert.equal(window.dataLayer[1][1], 'start');
  assert.equal(window.dataLayer[1][2].send_to, 'G-T4WSVZ57J0');
  assert.equal(Object.prototype.toString.call(window.dataLayer[1]), '[object Arguments]');
  module.exports.configureGoogleTracking('G-TEST123');
  module.exports.trackGoogleEvent('result_view');
  assert.equal(window.dataLayer[2][2].send_to, 'G-TEST123');
});

test('renderizacao sem navegador nao falha', () => {
  const module = { exports: {} };
  runInNewContext(code, { module });
  assert.equal(module.exports.trackMetaStandardEvent('ViewContent'), null);
  assert.doesNotThrow(() => module.exports.trackConfiguredLandingPageView({}));
});

test('navegacao real registra ambos os pixels sem broadcast', () => {
  const { api, calls } = fixture();
  api.trackMetaNavigationPageView();
  assert.equal(calls.filter(c => c[2] === 'PageView').length, 2);
  assert.equal(calls.some(c => c[0] === 'track'), false);
});

test('redirecionamento geografico da V2 nao conta uma segunda visita', () => {
  const { api, calls } = fixture();
  api.trackMetaNavigationPageView('/curso-suspensao-piloto-v2?lang=pt-PT', '/curso-suspensao-piloto-completa?lang=pt-PT&src=v2_geo_redirect');
  assert.equal(calls.length, 0);
  api.trackMetaNavigationPageView('/curso-suspensao-piloto-completa?lang=pt-PT', '/quiz-suspensao?lang=pt-PT');
  assert.equal(calls.filter(c => c[2] === 'PageView').length, 2);
});

test('fila anterior ao GTM desativa PageView automatico sem carregar SDK', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  const window = {};
  runInNewContext(script, { window });
  assert.equal(window.fbq.disablePushState, true);
  window.fbq('init', '123456789');
  assert.equal(window.fbq.queue.length, 1);
  assert.equal(script.includes('createElement'), false);
});
