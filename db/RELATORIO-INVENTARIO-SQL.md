# Relatório — Inventário de arquivos .sql soltos (Missão 1, Task #5)

> Autor: agente 2 · Data: 2026-08-18 · Status: **CONFORME** (números auditados pela Qualidade)
> Escopo: read-only. Nenhum arquivo foi movido, renomeado ou apagado. Este documento é insumo
> para uma missão futura de reorganização, com aprovação própria.

## 1. Contagem geral

Evidência: `git ls-files '*.sql'` (nenhum .sql untracked — `git ls-files --others --exclude-standard` vazio).

| Localização | Qtde |
|---|---|
| Raiz do repo (soltos) | **142** |
| `migrations/` (estrutura existente, nomenclatura mista) | 38 |
| Bundles de export (`marketing-wtech-export/database/` 8 + `export_certificados_cracha/sql/` 1) | 9 |
| Fixture de skill (`.agent/skills/loki-mode/...`) | 1 |
| **Total** | **190** |

Nenhum .sql é carregado em runtime pela aplicação — apenas 2 comentários citam arquivos de
`migrations/` (`server/edge/stripe-webhook.ts:41`, `server/marketingCore.ts:17`). Reorganizar é seguro.

## 2. Classificação dos 142 soltos na raiz

Soma: 27+20+12+17 (=76) + 35 + 16 + 8 + 7 = **142** ✓

| Categoria | Qtde | Conteúdo |
|---|---|---|
| **Migração real** | **76** | `add_*` (27 colunas pontuais), `create_*` (20 tabelas de features), `update_*` (12 evoluções de schema), misc (17: `admin_user_management`, `analytics_schema`, `config_hierarchy`, `crm_automation`, `db_updates_*`, `email_flows_migration`, `ensure_*`, `flowup_migration`, `pop_sla_gestor`, `pop_whatsapp_notifications`, `remove_marketing_members_unique`, `supabase_quiz_migration`, `supabase_run`, `task_categories_migration`, `whatsapp_automation_migration`) |
| **Fix pontual já aplicado** | **35** | Família `fix_*`/`force_*`/`repair_*`/`total_unblock_*`/segurança avulsa, excluindo RLS. Cadeias superadas: `fix_lead_deletion→v2`, `fix_analytics_permissions→v2`, `fix_marketing_auth_error→final`, `fix_marketing_permissions→v3→force_fix→total_unblock`, `fix_permission_users_error→fix_permissions_v2`. ⚠️ `disable_rls.sql` desliga RLS de `SITE_Transactions` — descarte prioritário. |
| **RLS (análise com o agente 1)** | **16** | `fix_*_rls*.sql` — incluídos aqui só na contagem e na proposta de estrutura. |
| **Diagnóstico** | **8** | `check_blog`, `check_leads_schema`, `check_schema`, `check_schema_crm`, `check_users_columns`, `list_tables`, `reload_schema`, `force_schema_reload` |
| **Seed / teste** | **7** | `seed_mock_data`, `seed_orders`, `seed_real_data`, `extended_seed_data`, `generate_test_data`, `recreate_and_seed_lp` (destrutivo: limpa e re-semeia), `cleanup_bad_data` (one-off) |

Os 9 arquivos dos bundles de export são **duplicados byte-idênticos** de arquivos da raiz (`diff -q` 9/9).

`seed_real_data.sql`: catálogo de produtos W-Tech (SKU, preço, estoque, URLs de imagem), **sem PII**.
Recomendação de remoção mantida por higiene comercial (preços/estoque no repo público), não LGPD.

## 3. Estrutura proposta (aprovada pelo CTO, com guarda-corpos)

Estratégia **baseline + arquivo** — sem backfill de migrações históricas.

```
supabase/migrations/                  ← migrações ATIVAS daqui pra frente (convenção Supabase CLI)
  <YYYYMMDDHHMMSS>_baseline.sql       ← dump do schema atual de prod = marco zero
db/
  archive/legacy-root/                ← os 142 da raiz (histórico; git preserva)
  archive/legacy-migrations/          ← os 38 do migrations/ atual (decisão CTO: sem backfill)
  seeds/                              ← seeds úteis (se mantidos)
  maintenance/                        ← reload_schema.sql (utilitário recorrente)
```

Convenção de nomes: `YYYYMMDDHHMMSS_verbo_alvo.sql` (ordenação lexicográfica = cronológica).
Justificativa Supabase CLI: `supabase/config.toml` e `supabase/functions/` já existem — o projeto já
usa o CLI; `supabase/migrations/` é a peça faltante e dá rastreio de aplicadas via `schema_migrations`.

**Guarda-corpos obrigatórios (CTO):**
1. Baseline marcado como aplicado via `supabase migration repair --status applied <version>` **antes**
   de qualquer push — sem isso o primeiro `db push` tenta recriar o schema em produção.
2. Os 38 de `migrations/` vão para archive junto com os 142 (sem backfill).
3. `db push` só pelo Daniel, após `db diff` revisado pelo CTO.
4. `db reset` **proibido**.

## 4. Regras de fluxo (anti-reincidência, KISS)

Adicionar ao CLAUDE.md do projeto quando a missão de execução for aprovada:
1. Proibido criar `.sql` na raiz do repo.
2. Todo SQL novo nasce via `supabase migration new <nome>` em `supabase/migrations/`.
3. SQL de diagnóstico não é commitado; se recorrente, vai em `db/maintenance/`.
4. Seed vai em `db/seeds/`.
5. Fix de emergência aplicado direto em prod deve virar migração no mesmo dia.

## 5. Candidatos a descarte (~20 diretos)

`disable_rls.sql` (perigoso), 7 diagnósticos (todos exceto `reload_schema.sql` → maintenance),
5 seeds de mock (`seed_mock_data`, `seed_orders`, `extended_seed_data`, `generate_test_data`,
`recreate_and_seed_lp`), `cleanup_bad_data`, versões superadas das cadeias de fix (7 não-RLS;
cadeias RLS com o agente 1), `seed_real_data.sql` (higiene comercial). Duplicados de export (9):
decisão de produto sobre os bundles inteiros.

## 6. Ressalvas

- Status "já aplicado no banco" é **suposição** (inferida do import em massa de 2026-04-24 e das
  features operando em prod). A execução deve validar via `information_schema` antes de descartar —
  ou preferir arquivar, que dispensa a validação.
- Divergência de régua: Qualidade citou 39 em `migrations/`; medição local deu 38 por dois métodos.
- Existe worktree antigo em `.claude/worktrees/ecstatic-kowalevski-5808e4/` espelhando a raiz suja —
  limpeza à parte, fora deste escopo.
