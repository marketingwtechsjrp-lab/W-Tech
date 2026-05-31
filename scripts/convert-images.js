/**
 * ─────────────────────────────────────────────────────────────────────────────
 * CONVERSOR AUTOMÁTICO DE IMAGENS → WebP (+ AVIF opcional)
 * ─────────────────────────────────────────────────────────────────────────────
 * Converte PNG/JPG/JPEG para WebP redimensionando para um tamanho máximo,
 * comprimindo e (opcionalmente) gerando AVIF. Mantém o original.
 *
 * USO:
 *   node scripts/convert-images.js [pasta] [opções]
 *
 * EXEMPLOS:
 *   node scripts/convert-images.js public                 # converte tudo em /public
 *   node scripts/convert-images.js public/images --max=1400
 *   node scripts/convert-images.js public --quality=82 --avif
 *   node scripts/convert-images.js public/paschoalin.jpg  # arquivo único
 *
 * OPÇÕES:
 *   --max=<px>       largura máxima (default 1600; não amplia imagens menores)
 *   --quality=<n>    qualidade WebP 1-100 (default 80)
 *   --avif           também gera .avif (mais leve, mais lento)
 *   --force          regera mesmo se o .webp já existir e for mais novo
 *   --delete         remove o original após converter (use com cuidado)
 *   --dry            apenas mostra o que faria, sem escrever
 * ─────────────────────────────────────────────────────────────────────────────
 */
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const args = process.argv.slice(2);
const positional = args.filter((a) => !a.startsWith('--'));
const flags = Object.fromEntries(
  args
    .filter((a) => a.startsWith('--'))
    .map((a) => {
      const [k, v] = a.replace(/^--/, '').split('=');
      return [k, v === undefined ? true : v];
    }),
);

const TARGET = positional[0] || 'public';
const MAX_WIDTH = parseInt(flags.max || '1600', 10);
const QUALITY = parseInt(flags.quality || '80', 10);
const MAKE_AVIF = !!flags.avif;
const FORCE = !!flags.force;
const DELETE_ORIGINAL = !!flags.delete;
const DRY = !!flags.dry;

const EXT = /\.(png|jpe?g)$/i;
let converted = 0;
let skipped = 0;
let savedBytes = 0;

const kb = (b) => (b / 1024).toFixed(1) + ' KB';

/** Coleta recursivamente os arquivos de imagem alvo. */
function collect(target) {
  const stat = fs.statSync(target);
  if (stat.isFile()) return EXT.test(target) ? [target] : [];
  const out = [];
  for (const entry of fs.readdirSync(target, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const full = path.join(target, entry.name);
    if (entry.isDirectory()) out.push(...collect(full));
    else if (EXT.test(entry.name)) out.push(full);
  }
  return out;
}

async function convertOne(file) {
  const webpPath = file.replace(EXT, '.webp');

  // Pula se o webp já existe e é mais recente que o original (a menos que --force)
  if (!FORCE && fs.existsSync(webpPath)) {
    if (fs.statSync(webpPath).mtimeMs >= fs.statSync(file).mtimeMs) {
      skipped++;
      return;
    }
  }

  const srcBytes = fs.statSync(file).size;
  const img = sharp(file, { failOn: 'none' });
  const meta = await img.metadata();

  // Só redimensiona se for maior que o limite (nunca amplia)
  const pipeline = meta.width && meta.width > MAX_WIDTH ? img.resize({ width: MAX_WIDTH }) : img;

  if (DRY) {
    console.log(`  [dry] ${path.relative(process.cwd(), file)} (${meta.width}px) → .webp`);
    converted++;
    return;
  }

  const webpBuf = await pipeline.clone().webp({ quality: QUALITY, effort: 5 }).toBuffer();
  fs.writeFileSync(webpPath, webpBuf);

  let avifNote = '';
  if (MAKE_AVIF) {
    const avifBuf = await pipeline.clone().avif({ quality: Math.max(40, QUALITY - 20) }).toBuffer();
    fs.writeFileSync(file.replace(EXT, '.avif'), avifBuf);
    avifNote = ` (+avif ${kb(avifBuf.length)})`;
  }

  const saved = srcBytes - webpBuf.length;
  savedBytes += saved;
  converted++;
  console.log(
    `  ✓ ${path.relative(process.cwd(), file)}  ${kb(srcBytes)} → ${kb(webpBuf.length)}` +
      ` (-${((saved / srcBytes) * 100).toFixed(0)}%)${avifNote}`,
  );

  if (DELETE_ORIGINAL) fs.unlinkSync(file);
}

async function main() {
  if (!fs.existsSync(TARGET)) {
    console.error(`✗ Alvo não encontrado: ${TARGET}`);
    process.exit(1);
  }
  const files = collect(TARGET);
  console.log(
    `\n🖼️  Conversor WebP — alvo: ${TARGET} | max ${MAX_WIDTH}px | q${QUALITY}` +
      `${MAKE_AVIF ? ' | +avif' : ''}${DRY ? ' | DRY-RUN' : ''}`,
  );
  console.log(`   ${files.length} imagem(ns) encontrada(s)\n`);

  for (const file of files) {
    try {
      await convertOne(file);
    } catch (err) {
      console.error(`  ✗ Falha em ${file}: ${err.message}`);
    }
  }

  console.log(
    `\n✅ Concluído: ${converted} convertida(s), ${skipped} já atualizada(s).` +
      `${savedBytes > 0 ? ` Economia total: ${kb(savedBytes)} (${(savedBytes / 1024 / 1024).toFixed(2)} MB).` : ''}\n`,
  );
}

main();
