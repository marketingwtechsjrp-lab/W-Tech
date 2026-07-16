import { build } from 'esbuild';

/**
 * Bundle do servidor Express (server/index.ts + handlers de /api + edge
 * functions portadas) em UM arquivo autocontido: dist-server/index.mjs.
 *
 * - platform=node / format=esm / bundle: sai um único .mjs, sem precisar de
 *   node_modules em produção (imagem Docker final fica mínima).
 * - banner: shim de require/__dirname/__filename — dependências CJS
 *   (express, nodemailer, stripe) referenciam esses globais que não existem
 *   em ESM puro.
 * - external: só os addons NATIVOS OPCIONAIS do `ws` (bufferutil,
 *   utf-8-validate), que o próprio ws carrega em try/catch — não podem ser
 *   bundlados e não são necessários.
 */
const resultado = await build({
  entryPoints: ['server/index.ts'],
  outfile: 'dist-server/index.mjs',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  sourcemap: false,
  logLevel: 'info',
  external: ['bufferutil', 'utf-8-validate'],
  banner: {
    js: [
      "import { createRequire as __wtechCreateRequire } from 'node:module';",
      "import { fileURLToPath as __wtechFileURLToPath } from 'node:url';",
      "import { dirname as __wtechDirname } from 'node:path';",
      'const require = __wtechCreateRequire(import.meta.url);',
      'const __filename = __wtechFileURLToPath(import.meta.url);',
      'const __dirname = __wtechDirname(__filename);',
    ].join('\n'),
  },
});

if (resultado.errors.length > 0) {
  process.exit(1);
}
