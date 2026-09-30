import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { runInNewContext } from 'node:vm';
import { fileURLToPath } from 'node:url';
const { outputFiles } = await build({
  entryPoints: [fileURLToPath(new URL('../lib/blogImages.ts', import.meta.url))],
  bundle: true, write: false, platform: 'node', format: 'cjs', logLevel: 'silent',
});
const module = { exports: {} };
runInNewContext(outputFiles[0].text, { module, exports: module.exports });
const { normalizeBlogContentImages, resolveBlogImage } = module.exports;

test('capa malformada no banco usa uma imagem válida da biblioteca', () => {
  assert.equal(resolveBlogImage({ title: 'Manutenção de suspensão', image: "/images/blog/fork-service.webp'" }), '/images/blog/fork-service.webp');
});

test('normaliza aspas em imagens importadas e remove srcset legado', () => {
  const result = normalizeBlogContentImages('<img src="old.jpg\'" alt="Foto" srcset="old-small.jpg 300w">', { title: 'Manutenção' });
  assert.equal(result, '<img src="/images/blog/fork-service.webp" alt="Foto">');
});

test('mantém a imagem editorial válida escolhida no banco', () => {
  assert.equal(resolveBlogImage({ title: 'Manutenção', image: '/images/blog/enduro-trail.webp' }), '/images/blog/enduro-trail.webp');
});

test('corrige src sem aspas de abertura em artigo real importado', () => {
  const result = normalizeBlogContentImages("<img src=/images/blog/fork-service.webp' alt='Foto' />", { title: 'Manutenção' });
  assert.equal(result, '<img src="/images/blog/fork-service.webp" alt=\'Foto\' />');
});
