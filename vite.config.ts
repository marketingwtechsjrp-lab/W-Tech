import fs from 'fs';
import path from 'path';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { SURVEYS } from './lib/surveys';

const SITE_URL = 'https://w-techbrasil.com.br';

/**
 * WhatsApp/Facebook leem as tags Open Graph do HTML cru (sem JS). Cada avaliação ganha
 * a sua cópia do index.html com título, descrição e imagem próprios em
 * dist/avaliacao/<slug>/index.html — o servidor entrega esse arquivo antes do fallback
 * da SPA (server/index.ts), e o React monta o quiz normalmente por cima.
 */
function surveySharePages(): Plugin {
  const setMeta = (html: string, key: string, value: string) =>
    html.replace(
      new RegExp(`(<meta\\s+(?:name|property)="${key}"\\s+content=")[^"]*(")`, 'g'),
      `$1${value}$2`
    );

  return {
    name: 'survey-share-pages',
    apply: 'build',
    closeBundle() {
      const indexPath = path.resolve(__dirname, 'dist/index.html');
      if (!fs.existsSync(indexPath)) return;
      const base = fs.readFileSync(indexPath, 'utf8');

      for (const survey of SURVEYS) {
        const url = `${SITE_URL}/avaliacao/${survey.slug}`;
        const title = 'Como foi o seu curso? · Avaliação W-Tech';
        const description = `${survey.course} · ${survey.dates}. Avaliação rápida — menos de 1 minuto.`;
        const imageFile = `og/avaliacao-${survey.slug}.jpg`;
        const hasImage = fs.existsSync(path.resolve(__dirname, 'public', imageFile));

        let html = base
          .replace('<html lang="pt-BR">', '<html lang="pt-PT">')
          .replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`)
          .replace(/(<link[^>]+rel="canonical"[^>]+href=")[^"]*(")/, `$1${url}$2`)
          .replace('</head>', '<meta name="robots" content="noindex, nofollow" />\n</head>');
        for (const key of ['title', 'og:title', 'twitter:title']) html = setMeta(html, key, title);
        for (const key of ['description', 'og:description', 'twitter:description'])
          html = setMeta(html, key, description);
        for (const key of ['og:url', 'twitter:url']) html = setMeta(html, key, url);
        html = setMeta(html, 'og:locale', 'pt_PT');
        if (hasImage) {
          for (const key of ['og:image', 'twitter:image']) html = setMeta(html, key, `${SITE_URL}/${imageFile}`);
          html = setMeta(html, 'og:image:width', '1200');
          html = setMeta(html, 'og:image:height', '630');
        }

        const outDir = path.resolve(__dirname, 'dist/avaliacao', survey.slug);
        fs.mkdirSync(outDir, { recursive: true });
        fs.writeFileSync(path.join(outDir, 'index.html'), html);
      }

      // Página da Vacuum Pump: o link vai por WhatsApp, a prévia precisa mostrar a oferta.
      const vacuumUrl = `${SITE_URL}/maquina-de-vacuo`;
      const vacuumTitle = 'Vacuum Pump W-Tech: 10x de R$ 799 sem juros';
      const vacuumDescription = 'Black Friday W-Tech. Pré-venda da máquina de vácuo por 7 dias: de R$ 9.990 por R$ 7.990 em 10x sem juros.';
      let vacuumHtml = base
        .replace(/<title>[^<]*<\/title>/, `<title>${vacuumTitle}</title>`)
        .replace(/(<link[^>]+rel="canonical"[^>]+href=")[^"]*(")/, `$1${vacuumUrl}$2`)
        .replace('</head>', '<meta name="robots" content="noindex, follow" />\n</head>');
      for (const key of ['title', 'og:title', 'twitter:title']) vacuumHtml = setMeta(vacuumHtml, key, vacuumTitle);
      for (const key of ['description', 'og:description', 'twitter:description']) vacuumHtml = setMeta(vacuumHtml, key, vacuumDescription);
      for (const key of ['og:url', 'twitter:url']) vacuumHtml = setMeta(vacuumHtml, key, vacuumUrl);
      for (const key of ['og:image', 'twitter:image']) vacuumHtml = setMeta(vacuumHtml, key, `${SITE_URL}/og/maquina-de-vacuo.jpg`);
      vacuumHtml = setMeta(vacuumHtml, 'og:image:width', '1200');
      vacuumHtml = setMeta(vacuumHtml, 'og:image:height', '630');

      // Quem chega pelo Instagram ou pelo WhatsApp abre esta página de frio. Sem isto, o navegador só
      // descobre o código, o preço e a foto depois de baixar e rodar o bundle principal.
      const assetsDir = path.resolve(__dirname, 'dist/assets');
      const pageChunk = fs.readdirSync(assetsDir).find((name) => /^LPVacuumPump-[\w-]+\.js$/.test(name));
      if (pageChunk) {
        const code = fs.readFileSync(path.join(assetsDir, pageChunk), 'utf8');
        const imports = [...code.matchAll(/(?:from|import)\s*"\.\/([\w.-]+\.js)"/g)].map((match) => match[1]);
        const modules = [pageChunk, ...new Set(imports)].filter((name) => !base.includes(`/assets/${name}`));
        const preloads = [
          ...modules.map((name) => `<link rel="modulepreload" crossorigin href="/assets/${name}">`),
          '<link rel="preload" as="fetch" crossorigin="anonymous" href="/api/vacuum-pump?action=offer">',
          // Mesmo srcset e sizes da primeira foto em pages/LPVacuumPump.tsx: se mudar lá, muda aqui.
          '<link rel="preload" as="image" fetchpriority="high" imagesrcset="/images/vacuum-pump/fotos/frente-sm.webp 640w, /images/vacuum-pump/fotos/frente.webp 1300w" imagesizes="(min-width: 1024px) 600px, 92vw">',
        ].join('\n');
        vacuumHtml = vacuumHtml.replace('</head>', `${preloads}\n</head>`);
      }
      const vacuumDir = path.resolve(__dirname, 'dist/maquina-de-vacuo');
      fs.mkdirSync(vacuumDir, { recursive: true });
      fs.writeFileSync(path.join(vacuumDir, 'index.html'), vacuumHtml);
    },
  };
}

export default defineConfig(({ mode, command }) => {
    const env = loadEnv(mode, '.', '');

    // As VITE_* são gravadas no bundle em TEMPO DE BUILD. Se faltarem, o app cai num
    // banco de fallback e passa a gravar leads/matrículas no lugar errado — sem erro
    // visível. Em 14/08/2026 isso dividiu a base entre dois Supabase por 3 dias.
    // Build sem essas variáveis agora falha aqui, antes de qualquer coisa subir.
    if (command === 'build') {
      const faltando = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'].filter(k => !env[k]);
      if (faltando.length) {
        throw new Error(
          `\n\n[BUILD ABORTADO] Variáveis ausentes: ${faltando.join(', ')}\n` +
          `Elas entram no bundle em tempo de build. Sem elas o site grava no banco errado.\n` +
          `Docker:  docker build --build-arg VITE_SUPABASE_URL=... --build-arg VITE_SUPABASE_ANON_KEY=...\n` +
          `Local:   defina no .env antes de rodar npm run build\n`
        );
      }
      console.log(`[build] Supabase alvo: ${env.VITE_SUPABASE_URL}`);
    }

    return {
      server: {
        port: 5173,
        host: '127.0.0.1',
      },
      plugins: [react(), surveySharePages()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
