#!/usr/bin/env bash
# Deploy rápido do site W-Tech: refaz só as rotas alteradas e reaproveita o resto da imagem no ar.
#
# Na VPS, rode uma cópia fora do repositório, porque o git pull pode alterar este arquivo no meio:
#   cp /root/W-Tech/scripts/deploy-rapido.sh /root/deploy-rapido.sh
#   bash /root/deploy-rapido.sh                          # refaz só a home
#   bash /root/deploy-rapido.sh "/,/cursos,/blog/um-post"  # home e as páginas cujo texto mudou
#   SO_TESTE=1 bash /root/deploy-rapido.sh               # só gera wtech-site:rapido-teste
#
# Passe só rotas do sitemap. /maquina-de-vacuo fica de fora de propósito: ela não tem prerender
# e sai da casca, então a mudança nela já vai ao ar sem refazer nenhuma página.
#
# As páginas reaproveitadas recebem o código novo, mas o HTML só se atualiza no próximo
# deploy completo (/root/deploy-site.sh): rode um quando mudar conteúdo de muitas páginas.
set -euo pipefail
cd /root/W-Tech

if pgrep -f 'bash /root/[d]eploy-site.sh' >/dev/null; then
  echo "Há um deploy completo rodando. Espere terminar." >&2
  exit 1
fi
exec 9>/root/.deploy-rapido.lock
if ! flock -n 9; then
  echo "Há outro deploy rápido rodando. Espere terminar." >&2
  exit 1
fi

ROTAS="${1:-/}"
TAG=wtech-site:prod
[ "${SO_TESTE:-}" = "1" ] && TAG=wtech-site:rapido-teste

echo "==> Atualizando codigo (git pull)..."
git pull

ENVS=$(docker service inspect wtechprod_psite --format "{{range .Spec.TaskTemplate.ContainerSpec.Env}}{{println .}}{{end}}")
VURL=$(printf '%s\n' "$ENVS" | grep "^VITE_SUPABASE_URL=" | cut -d= -f2-)
VKEY=$(printf '%s\n' "$ENVS" | grep "^VITE_SUPABASE_ANON_KEY=" | cut -d= -f2-)

STAMP=$(date +%Y%m%d-%H%M)
if [ "$TAG" = "wtech-site:prod" ]; then
  echo "==> Backup da imagem atual → wtech-site:prod-backup-$STAMP"
  docker tag wtech-site:prod "wtech-site:prod-backup-$STAMP"
fi

echo "==> Build rapido, rotas: $ROTAS"
docker build -f Dockerfile.rapido --build-arg VITE_SUPABASE_URL="$VURL" --build-arg VITE_SUPABASE_ANON_KEY="$VKEY" --build-arg PRERENDER_ROUTES="$ROTAS" -t "$TAG" .

if [ "$TAG" != "wtech-site:prod" ]; then
  echo "==> Imagem de teste pronta: $TAG. O site nao foi alterado."
  exit 0
fi

echo "==> Atualizando servico wtechprod_psite..."
docker service update --image wtech-site:prod --force wtechprod_psite
echo "==> ✅ Site atualizado! Rollback: docker tag wtech-site:prod-backup-$STAMP wtech-site:prod && docker service update --force wtechprod_psite"
