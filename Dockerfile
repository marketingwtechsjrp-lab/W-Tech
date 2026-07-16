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
# Sem os args, valem os fallbacks hardcoded de lib/supabaseClient.ts (instância cloud).
# Nota: o buildkit alerta "SecretsUsedInArgOrEnv" para a ANON key — falso positivo:
# a anon key é PÚBLICA por design (vai dentro do bundle JS do navegador de qualquer
# forma). Segredos de verdade (service role, Stripe etc.) só entram em RUNTIME.
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

# SPA (dist/) + servidor bundlado (dist-server/index.mjs, autocontido)
RUN npm run build && npm run build:server

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
