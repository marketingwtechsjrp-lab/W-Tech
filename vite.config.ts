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
