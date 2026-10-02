import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import { build } from 'esbuild';

// Mesmo método do course-offers-unit.test.mjs: o esbuild compila o TypeScript e o
// código roda isolado no vm.
const raiz = fileURLToPath(new URL('..', import.meta.url));
const { outputFiles } = await build({
  stdin: {
    contents: [
      "export * from './lib/courseSchema.ts';",
      "export * from './lib/seoVerification.ts';",
      "export { getCoursePrice } from './lib/coursePricing.ts';",
    ].join('\n'),
    resolveDir: raiz,
    loader: 'ts',
  },
  bundle: true,
  write: false,
  format: 'cjs',
  platform: 'neutral',
  logLevel: 'silent',
});

function load() {
  const module = { exports: {} };
  runInNewContext(outputFiles[0].text, { module, exports: module.exports, console, URL, URLSearchParams });
  return module.exports;
}

const lib = load();
const FAQ = [
  { q: 'Preciso ter experiência avançada?', a: 'Não. Você aprende do zero.' },
  { q: '  ', a: 'pergunta vazia não entra' },
];

function porTipo(schema, tipo) {
  return schema['@graph'].find((no) => no['@type'] === tipo);
}

test('Course usa o plano anual padrão quando a página não passa uma oferta', () => {
  const course = porTipo(lib.buildCourseSchema(FAQ), 'Course');
  const precoPadrao = lib.getCoursePrice('br', 'pt-BR', null, null);
  assert.equal(course.offers.price, precoPadrao.schemaPrice);
  assert.equal(course.offers.price, '347.00');
  assert.equal(course.offers.priceCurrency, 'BRL');
  assert.equal(course.offers.category, 'Subscription');
});

test('Course acompanha o preço e o checkout promocionais exibidos na página', () => {
  const offer = { price: '167.00', priceCurrency: 'BRL', url: 'https://pay.kiwify.com.br/VlPY2o6' };
  const course = porTipo(lib.buildCourseSchema(FAQ, offer), 'Course');
  assert.equal(course.offers.price, offer.price);
  assert.equal(course.offers.priceCurrency, offer.priceCurrency);
  assert.equal(course.offers.url, offer.url);
  assert.equal(course.offers.category, 'Subscription');
});

test('Course aponta para a organização e o instrutor do grafo estático', () => {
  const course = porTipo(lib.buildCourseSchema(FAQ), 'Course');
  assert.equal(course.provider['@id'], 'https://w-techbrasil.com.br/#organization');
  assert.equal(course.instructor[0]['@id'], 'https://w-techbrasil.com.br/#/schema/person/alex-crepaldi');
  assert.equal(course.url, 'https://w-techbrasil.com.br/curso-suspensao-piloto');
  assert.equal(course.name, lib.COURSE_NAME);
  assert.equal(course.hasCourseInstance.courseMode, 'Online');
});

test('FAQPage só leva perguntas visíveis e com resposta', () => {
  const faq = porTipo(lib.buildCourseSchema(FAQ), 'FAQPage');
  assert.equal(faq.mainEntity.length, 1);
  assert.equal(faq.mainEntity[0].name, 'Preciso ter experiência avançada?');
  assert.equal(faq.mainEntity[0].acceptedAnswer.text, 'Não. Você aprende do zero.');
  assert.equal(porTipo(lib.buildCourseSchema([]), 'FAQPage'), undefined);
});

test('breadcrumb termina na página do curso', () => {
  const trilha = porTipo(lib.buildCourseSchema(FAQ), 'BreadcrumbList').itemListElement;
  // Array.from: o array nasce no contexto do vm, com outro protótipo.
  assert.deepEqual(Array.from(trilha, (item) => item.position), [1, 2, 3]);
  assert.equal(trilha.at(-1).item, 'https://w-techbrasil.com.br/curso-suspensao-piloto');
});

test('verificação do Google/Bing aceita só token de verdade', () => {
  assert.equal(lib.isVerificationToken('0i-mmxA30nyMMbDqHvSwePNljm0E_wOCx06ZxvAOLwo'), true);
  assert.equal(lib.isVerificationToken('0123456789ABCDEF0123456789ABCDEF'), true);
  assert.equal(lib.isVerificationToken('"vc-domain-verify=site.w-techbrasil.com.br,676c9ea4c1e7e5a02991"'), false);
  assert.equal(lib.isVerificationToken(''), false);
  assert.equal(lib.isVerificationToken(undefined), false);
});

test('robots.txt libera os robôs de busca e de IA e não bloqueia /assets', () => {
  const robots = readFileSync(new URL('../public/robots.txt', import.meta.url), 'utf8');
  for (const robo of ['OAI-SearchBot', 'GPTBot', 'ClaudeBot', 'PerplexityBot', 'Google-Extended', 'Bingbot']) {
    assert.match(robots, new RegExp(`^User-agent: ${robo}$`, 'm'), robo);
  }
  assert.doesNotMatch(robots, /^Disallow: \/$/m);
  assert.doesNotMatch(robots, /^Disallow: \/assets/m);
  assert.match(robots, /^Sitemap: https:\/\/w-techbrasil\.com\.br\/sitemap\.xml$/m);
});

test('llms.txt usa o nome único do curso e o preço público', () => {
  const llms = readFileSync(new URL('../public/llms.txt', import.meta.url), 'utf8');
  assert.ok(llms.includes(lib.COURSE_NAME));
  assert.ok(llms.includes('R$ 347,00'));
  assert.ok(llms.includes('12x de R$ 35,89'));
  assert.doesNotMatch(llms, /20 anos/);
});

test('há exatamente uma chave IndexNow e o conteúdo bate com o nome', () => {
  const chaves = readdirSync(new URL('../public/', import.meta.url)).filter((nome) => /^[0-9a-f]{32}\.txt$/.test(nome));
  assert.equal(chaves.length, 1);
  const conteudo = readFileSync(new URL(`../public/${chaves[0]}`, import.meta.url), 'utf8').trim();
  assert.equal(`${conteudo}.txt`, chaves[0]);
});
