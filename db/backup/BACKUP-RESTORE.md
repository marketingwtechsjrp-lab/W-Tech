# Backup off-site verificado — Postgres self-hosted (Task #22, Missão 2)

> Dono: agente 2 · Validador: testador · Status: **PLANO — nada foi executado**
> Item bloqueante da Missão 2: a Fase 1 (remediação de RLS) só começa após restore testado.
> Execução e credenciais são do Daniel; este documento entrega o plano pronto para rodar/autorizar.

## Visão geral

```
VPS (supabase.w-techbrasil.com.br)
  cron diário 03:30
    └─ db/backup/backup-postgres.sh
         ├─ pg_dumpall --globals-only  (roles)
         ├─ pg_dump -Fc                (dump custom comprimido)
         ├─ pg_restore --list          (integridade do arquivo)
         ├─ manifesto: count(*) exato de SITE_Leads, SITE_Sales, SITE_Transactions,
         │             SITE_Users, SITE_Enrollments + sha256 dos arquivos
         ├─ retenção local: 14 diários + 6 mensais (cópia no dia 01)
         └─ rclone copy → off-site (nunca deleta remoto) + rclone check
```

Decisões de projeto:
- **`pg_dump -Fc`** (formato custom): comprimido, restore seletivo/paralelo, `--list` audita o conteúdo.
- **`rclone copy` (não `sync`)**: sync espelharia deleções — um atacante/erro que apague o local
  apagaria o off-site. `copy` só adiciona; retenção remota é feita à parte com `--min-age`.
- **Manifesto com contagens exatas**: prova de fidelidade, não só de existência do arquivo.
- **Restore de teste em banco scratch** (`restore_test`) no mesmo cluster: valida o dump de ponta a
  ponta sem tocar no banco de produção.

## Procedimento de restore (teste de fidelidade — sem impacto em prod)

Executar no VPS (ajustar `docker exec -i supabase-db` se Postgres estiver em container):

```bash
# 0. Escolher o dump a testar — DEVE ser baixado do OFF-SITE, não o arquivo local
#    (prova que a cópia remota é utilizável de ponta a ponta):
rclone copy "$RCLONE_REMOTE/daily" /tmp/restore-test/ --include "*_<TS>.*"
sha256sum -c <(grep -E '\.dump|\.sql' /tmp/restore-test/manifest_<TS>.txt | tail -2)  # bate com o manifesto?

# 1. Criar banco scratch
psql -U postgres -c 'CREATE DATABASE restore_test;'

# 2. Restaurar
pg_restore -U postgres --no-owner --role=postgres -d restore_test /tmp/restore-test/wtech_<TS>.dump
# exit code 0 esperado; warnings de "already exists" de extensões são aceitáveis, erros não.

# 3. Recontar as tabelas críticas no banco restaurado
for t in SITE_Leads SITE_Sales SITE_Transactions SITE_Users SITE_Enrollments; do
  echo "count.$t=$(psql -U postgres -d restore_test -Atc "SELECT count(*) FROM \"$t\";")"
done

# 4. Comparar com as linhas count.* do manifest_<TS>.txt  → 5/5 idênticas = APROVADO

# 5. Limpar
psql -U postgres -c 'DROP DATABASE restore_test;'
rm -rf /tmp/restore-test/
```

Restore de desastre real (VPS perdido): provisionar stack Supabase self-hosted nova →
aplicar `globals_<TS>.sql` (roles) → `pg_restore -d postgres wtech_<TS>.dump` → apontar DNS.
Documentar o drill completo é etapa futura; o teste acima cobre a fidelidade do dado.

## O que o testador valida (critérios objetivos)

| # | Critério | Evidência exigida |
|---|---|---|
| V1 | Script executa fim a fim | exit code 0; os 3 arquivos do dia existem em `daily/` |
| V2 | Dump legível | `pg_restore --list` exit 0 (já embutido no script) |
| V3 | Manifesto completo | 5 linhas `count.*` presentes, nenhuma vazia ou com erro |
| V4 | Restore funciona | `pg_restore` no `restore_test` exit 0 |
| V5 | **Fidelidade** | 5/5 contagens pós-restore idênticas às do manifesto |
| V6 | Off-site íntegro | `rclone check` sem diffs; sha256 do arquivo baixado bate com o manifesto |
| V7 | Off-site utilizável | o restore do teste partiu do arquivo **baixado do remoto** (passo 0) |
| V8 | Retenção ativa | após 2ª execução, arquivos antigos além da janela são removidos localmente |

Aprovação = V1–V7 obrigatórios (V8 verifica-se na segunda execução do cron).
Contagem igual com conteúdo diferente é teoricamente possível; se o testador quiser endurecer,
adicionar `max(id)`/`max(created_at)` por tabela ao manifesto é mudança de 3 linhas no script.

## O que falta do Daniel para EXECUTAR (nada roda sem isto)

1. **Onde roda o Postgres**: confirmar o host/alias SSH do VPS do `supabase.w-techbrasil.com.br`
   e, se em Docker, o nome do container (ex.: `supabase-db` — `docker ps | grep -i db` resolve).
2. **Credencial do banco**: senha do usuário `postgres` do self-hosted, colocada pelo Daniel em
   `/root/.wtech-backup.env` no VPS com `chmod 600`. **Nunca no repo.**
3. **Destino off-site** (escolher um):
   - a) Bucket S3/Backblaze B2 + chaves, configurado via `rclone config` no VPS **(recomendado —
     fora da infraestrutura dos VPS atuais)**;
   - b) Segundo VPS já existente (motofix-vps / twix-vps) via rclone sftp — aceitável, mas mesmo
     provedor ≠ off-site de verdade;
   - c) Outro (Google Drive via rclone etc.).
4. **Autorização do cron**: instalar `30 3 * * * /caminho/backup-postgres.sh >> /var/log/wtech-backup.log 2>&1`
   no crontab root do VPS.
5. **Janela do teste de restore** (~15 min, sem impacto em prod) com o testador acompanhando.

## Riscos declarados

- Backup lógico (pg_dump) = RPO de até 24h. Suficiente como bloqueante da Fase 1; WAL/PITR é
  evolução futura se o negócio exigir RPO menor.
- `pg_dump` em produção gera carga de leitura; janela 03:30 minimiza impacto.
- Storage: dump custom já é comprimido; monitorar tamanho no manifesto (`dump_bytes`) e ajustar
  `MIN_DUMP_BYTES` após o primeiro dump real (sanidade contra dump vazio).
- Retenção mensal usa `-mtime` (aproximação por dias); simples e suficiente aqui (KISS).
