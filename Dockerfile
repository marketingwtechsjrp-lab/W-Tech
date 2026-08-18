# syntax=docker/dockerfile:1

# ─────────────────────────────────────────────────────────────────────────────
# Stage 1 — build: SPA (Vite) + bundle do servidor Express (esbuild)
# ─────────────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS build

WORKDIR /app

# Dependências primeiro (camada cacheável). O .npmrc traz legacy-peer-deps.
COPY package.json package-lock.json .npmrc ./
RUN npm ci

# Código-fonte
COPY . .

# Envs VITE_* entram no bundle da SPA em TEMPO DE BUILD (não em runtime):
#   docker build --build-arg VITE_SUPABASE_URL=... --build-arg VITE_SUPABASE_ANON_KEY=...
#
# SEM DEFAULT DE PROPÓSITO. Havia um default apontando para a instância cloud aqui:
# um build feito sem os args gerava um bundle que gravava leads e matrículas em OUTRO
# banco, sem erro nenhum. Foi o que rachou a base em 14/08/2026 (329 leads e 22 alunos
# invisíveis no CRM por 3 dias). Agora o build falha em vite.config.ts se faltarem.
#
# Nota: o buildkit alerta "SecretsUsedInArgOrEnv" para a ANON key — falso positivo:
# a anon key é PÚBLICA por design (vai dentro do bundle JS do navegador de qualquer
# forma). Segredos de verdade (service role, Stripe etc.) só entram em RUNTIME.
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

# Chromium do sistema para o prerender (scripts/prerender.mjs).
# A imagem oficial do Playwright pesa ~2 GB; o pacote do Alpine resolve em ~150 MB e
# só existe NESTE stage — a imagem final continua sendo node:22-alpine puro.
RUN apk add --no-cache chromium nss freetype harfbuzz ca-certificates ttf-freefont
ENV PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium-browser

# SPA (dist/) + HTML prerenderizado + servidor bundlado (dist-server/index.mjs)
#
# O prerender grava dist/<rota>/index.html com o DOM já montado. Sem ele, TODAS as
# rotas entregam a mesma casca de 6,7 KB sem H1 — invisível para os crawlers de
# assistentes de IA, que não executam JavaScript.
RUN npm run build && npm run prerender && npm run build:server

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2 — runtime mínimo: só Node + dist/ + dist-server/
# O bundle do esbuild é autocontido → NÃO precisa de node_modules.
# ─────────────────────────────────────────────────────────────────────────────
FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/dist ./dist
COPY --from=build /app/dist-server ./dist-server

# Envs de RUNTIME (Supabase service role, Stripe, Evolution, Brevo etc.)
# entram via -e/--env-file no docker run ou pelo compose — nunca na imagem.

EXPOSE 3000
CMD ["node", "dist-server/index.mjs"]
