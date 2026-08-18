#!/usr/bin/env bash
# =============================================================================
# Backup verificado do Postgres self-hosted (Supabase) — W-Tech
# Task #22 (Missão 2) — dono: agente 2 · validador: testador
#
# O QUE FAZ (nesta ordem):
#   1. pg_dumpall --globals-only  → roles/grants (globals_<TS>.sql)
#   2. pg_dump -Fc                → dump custom comprimido (wtech_<TS>.dump)
#   3. pg_restore --list          → prova que o arquivo é legível (integridade)
#   4. Manifesto                  → contagem exata das tabelas críticas + sha256
#   5. Retenção local             → diários por RETENTION_DAILY_DAYS; cópia
#                                   mensal no dia 01, mantida RETENTION_MONTHLY_MONTHS
#   6. Off-site                   → rclone copy (nunca deleta remoto) + retenção remota
#
# EXECUÇÃO: no VPS onde roda o Postgres (cron diário sugerido: 30 3 * * *).
# Credenciais NUNCA neste arquivo — ver /root/.wtech-backup.env (chmod 600).
#
# Config esperada em $ENV_FILE (ou já exportada no ambiente):
#   PGHOST=127.0.0.1            # ou vazio se usar DOCKER_CONTAINER
#   PGPORT=5432
#   PGUSER=postgres
#   PGPASSWORD=...              # ou PGPASSFILE apontando para ~/.pgpass
#   PGDATABASE=postgres
#   DOCKER_CONTAINER=supabase-db  # se Postgres roda em Docker; vazio = cliente local
#   BACKUP_DIR=/var/backups/wtech-postgres
#   RCLONE_REMOTE=b2:wtech-backups/postgres   # vazio = pula off-site (avisa e sai 3)
#   RETENTION_DAILY_DAYS=14
#   RETENTION_MONTHLY_MONTHS=6
#   REMOTE_RETENTION_DAILY_DAYS=45
# =============================================================================
set -euo pipefail

ENV_FILE="${ENV_FILE:-/root/.wtech-backup.env}"
[ -f "$ENV_FILE" ] && . "$ENV_FILE"

: "${PGUSER:=postgres}"
: "${PGDATABASE:=postgres}"
: "${DOCKER_CONTAINER:=}"
: "${BACKUP_DIR:=/var/backups/wtech-postgres}"
: "${RCLONE_REMOTE:=}"
: "${RETENTION_DAILY_DAYS:=14}"
: "${RETENTION_MONTHLY_MONTHS:=6}"
: "${REMOTE_RETENTION_DAILY_DAYS:=45}"

TS="$(date +%Y%m%d_%H%M%S)"
DAILY_DIR="$BACKUP_DIR/daily"
MONTHLY_DIR="$BACKUP_DIR/monthly"
mkdir -p "$DAILY_DIR" "$MONTHLY_DIR"

DUMP="$DAILY_DIR/wtech_${TS}.dump"
GLOBALS="$DAILY_DIR/globals_${TS}.sql"
MANIFEST="$DAILY_DIR/manifest_${TS}.txt"

# Tabelas críticas — o testador compara estas contagens antes/depois do restore.
CRITICAL_TABLES=(SITE_Leads SITE_Sales SITE_Transactions SITE_Users SITE_Enrollments)

log() { echo "[$(date +%H:%M:%S)] $*"; }

# Executa cliente postgres local ou dentro do container, conforme config.
pg() {
  if [ -n "$DOCKER_CONTAINER" ]; then
    docker exec -i -e PGPASSWORD="${PGPASSWORD:-}" "$DOCKER_CONTAINER" "$@"
  else
    "$@"
  fi
}

log "1/6 Dump de globals (roles/grants)"
pg pg_dumpall -U "$PGUSER" --globals-only > "$GLOBALS"

log "2/6 pg_dump formato custom de $PGDATABASE"
pg pg_dump -U "$PGUSER" -Fc "$PGDATABASE" > "$DUMP"

log "3/6 Verificando integridade do arquivo (pg_restore --list)"
if [ -n "$DOCKER_CONTAINER" ]; then
  docker exec -i "$DOCKER_CONTAINER" pg_restore --list < "$DUMP" > /dev/null
else
  pg_restore --list "$DUMP" > /dev/null
fi

log "4/6 Gerando manifesto (contagens exatas das tabelas críticas + sha256)"
{
  echo "# Manifesto de backup W-Tech"
  echo "timestamp=$TS"
  echo "database=$PGDATABASE"
  echo "dump_file=$(basename "$DUMP")"
  echo "dump_bytes=$(stat -c %s "$DUMP" 2>/dev/null || stat -f %z "$DUMP")"
  echo ""
  echo "## Contagens exatas (comparar após restore de teste)"
  for t in "${CRITICAL_TABLES[@]}"; do
    n=$(pg psql -U "$PGUSER" -d "$PGDATABASE" -Atc "SELECT count(*) FROM \"$t\";")
    echo "count.$t=$n"
  done
  echo ""
  echo "## Estimativas de todas as tabelas (contexto, não critério)"
  pg psql -U "$PGUSER" -d "$PGDATABASE" -Atc \
    "SELECT relname||'='||n_live_tup FROM pg_stat_user_tables ORDER BY relname;"
  echo ""
  echo "## Checksums"
  sha256sum "$DUMP" "$GLOBALS" | sed "s|$DAILY_DIR/||"
} > "$MANIFEST"

# Sanidade: dump vazio ou minúsculo = falha (ajustar limite após o primeiro dump real).
MIN_BYTES="${MIN_DUMP_BYTES:-1000000}"
ACTUAL=$(stat -c %s "$DUMP" 2>/dev/null || stat -f %z "$DUMP")
if [ "$ACTUAL" -lt "$MIN_BYTES" ]; then
  log "ERRO: dump com apenas ${ACTUAL} bytes (< ${MIN_BYTES}). Abortando antes da retenção."
  exit 2
fi

log "5/6 Retenção: diários > ${RETENTION_DAILY_DAYS}d; mensal no dia 01 (${RETENTION_MONTHLY_MONTHS} meses)"
if [ "$(date +%d)" = "01" ]; then
  cp "$DUMP" "$GLOBALS" "$MANIFEST" "$MONTHLY_DIR/"
fi
find "$DAILY_DIR"   -type f -mtime +"$RETENTION_DAILY_DAYS" -delete
find "$MONTHLY_DIR" -type f -mtime +$(( RETENTION_MONTHLY_MONTHS * 31 )) -delete

log "6/6 Off-site"
if [ -z "$RCLONE_REMOTE" ]; then
  log "AVISO: RCLONE_REMOTE não configurado — backup ficou APENAS local. Off-site pendente."
  exit 3
fi
# copy (nunca deleta no remoto) — um atacante que apague o local não apaga o off-site.
rclone copy "$DAILY_DIR"   "$RCLONE_REMOTE/daily"   --include "*_${TS}.*"
if [ "$(date +%d)" = "01" ]; then
  rclone copy "$MONTHLY_DIR" "$RCLONE_REMOTE/monthly" --include "*_${TS}.*"
fi
# Confirma que os 3 arquivos do dia chegaram íntegros ao remoto (tamanho+hash quando suportado).
rclone check "$DAILY_DIR" "$RCLONE_REMOTE/daily" --include "*_${TS}.*"
# Retenção remota apenas dos diários; mensais permanecem pelo prazo longo.
rclone delete "$RCLONE_REMOTE/daily" --min-age "${REMOTE_RETENTION_DAILY_DAYS}d"

log "OK: backup ${TS} concluído, verificado e replicado off-site."
