import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

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
      plugins: [react()],
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
