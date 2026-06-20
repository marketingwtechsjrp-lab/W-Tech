-- =============================================================================
-- realign_roles_permissions.sql
-- Fase 4 da revisão de Permissões & Cargos.
--
-- Objetivos:
--   1) Migrar chaves RENOMEADAS para que cargos existentes continuem funcionando:
--        crm_manage_leads -> crm_manage_all
--        crm_distribute   -> crm_config_dist
--      (a UI antiga expunha essas chaves, mas o código sempre verificou as novas.)
--   2) Aposentar o vocabulário OBSOLETO de config_hierarchy.sql
--        (view_crm / edit_crm / manage_content / manage_team / manage_orders-legacy)
--      mapeando-o para as chaves reais usadas pelo app.
--   3) Semear/garantir cargos padrão coerentes alinhados a lib/permissions.ts.
--
-- Seguro: aditivo e idempotente. NÃO apaga cargos personalizados nem zera
-- permissões existentes — apenas acrescenta as chaves equivalentes.
-- Rode no SQL Editor do Supabase.
-- =============================================================================

-- ── 1) Rename de chaves (CRM) ────────────────────────────────────────────────
-- Quem tinha crm_manage_leads = true passa a ter crm_manage_all = true.
UPDATE "SITE_Roles"
SET permissions = (permissions - 'crm_manage_leads')
                  || jsonb_build_object('crm_manage_all', true)
WHERE permissions ? 'crm_manage_leads'
  AND (permissions->>'crm_manage_leads')::boolean IS TRUE;

-- Apenas remove a chave morta quando estava false.
UPDATE "SITE_Roles"
SET permissions = permissions - 'crm_manage_leads'
WHERE permissions ? 'crm_manage_leads';

-- crm_distribute -> crm_config_dist
UPDATE "SITE_Roles"
SET permissions = (permissions - 'crm_distribute')
                  || jsonb_build_object('crm_config_dist', true)
WHERE permissions ? 'crm_distribute'
  AND (permissions->>'crm_distribute')::boolean IS TRUE;

UPDATE "SITE_Roles"
SET permissions = permissions - 'crm_distribute'
WHERE permissions ? 'crm_distribute';

-- ── 2) Vocabulário obsoleto -> chaves reais ──────────────────────────────────
-- view_crm  -> crm_view
UPDATE "SITE_Roles"
SET permissions = (permissions - 'view_crm') || jsonb_build_object('crm_view', true)
WHERE (permissions->>'view_crm')::boolean IS TRUE;

-- edit_crm  -> crm_manage_all
UPDATE "SITE_Roles"
SET permissions = (permissions - 'edit_crm') || jsonb_build_object('crm_manage_all', true)
WHERE (permissions->>'edit_crm')::boolean IS TRUE;

-- manage_content -> blog_view/blog_create/blog_edit + landing_pages_view/manage
UPDATE "SITE_Roles"
SET permissions = (permissions - 'manage_content')
    || jsonb_build_object('blog_view', true, 'blog_create', true, 'blog_edit', true,
                          'landing_pages_view', true, 'landing_pages_manage', true,
                          'marketing_view', true)
WHERE (permissions->>'manage_content')::boolean IS TRUE;

-- manage_team -> manage_users
UPDATE "SITE_Roles"
SET permissions = (permissions - 'manage_team') || jsonb_build_object('manage_users', true)
WHERE (permissions->>'manage_team')::boolean IS TRUE;

-- view_finance (legado) -> financial_view + financial_view_all
UPDATE "SITE_Roles"
SET permissions = (permissions - 'view_finance')
    || jsonb_build_object('financial_view', true, 'financial_view_all', true)
WHERE (permissions->>'view_finance')::boolean IS TRUE;

-- Remove restos de chaves obsoletas quando estavam false.
UPDATE "SITE_Roles"
SET permissions = permissions - 'view_crm' - 'edit_crm' - 'manage_content'
                              - 'manage_team' - 'view_finance'
WHERE permissions ?| array['view_crm','edit_crm','manage_content','manage_team','view_finance'];

-- ── 3) Cargos padrão coerentes (idempotente: só cria se não existir) ──────────
-- Espelham ROLE_PRESETS de lib/permissions.ts.

-- Super Admin
INSERT INTO "SITE_Roles" (name, description, permissions, level)
SELECT 'Super Admin', 'Acesso total ao sistema', '{"admin_access": true}'::jsonb, 10
WHERE NOT EXISTS (SELECT 1 FROM "SITE_Roles" WHERE name = 'Super Admin');

-- Gerente Atendimento
INSERT INTO "SITE_Roles" (name, description, permissions, level)
SELECT 'Gerente Atendimento', 'Gestão de cursos, CRM, pedidos e clientes',
       '{"dashboard_view":true,"courses_view":true,"courses_add":true,"courses_edit":true,
         "courses_edit_lp":true,"courses_add_student":true,"courses_edit_attendant":true,
         "courses_print_list":true,"certificates_view":true,"courses_view_reports":true,
         "crm_view":true,"crm_manage_all":true,"crm_move_back":true,"crm_view_team":true,
         "crm_view_all":true,"crm_config_dist":true,"crm_export":true,"orders_view":true,
         "orders_view_all":true,"manage_orders":true,"clients_view":true,
         "clients_view_all":true,"clients_manage":true,"tasks_view":true,
         "tasks_view_team":true}'::jsonb, 9
WHERE NOT EXISTS (SELECT 1 FROM "SITE_Roles" WHERE name = 'Gerente Atendimento');

-- Financeiro
INSERT INTO "SITE_Roles" (name, description, permissions, level)
SELECT 'Financeiro', 'Fluxo de caixa, notas fiscais e pedidos',
       '{"dashboard_view":true,"financial_view":true,"financial_view_all":true,
         "invoices_view":true,"financial_add_transaction":true,"financial_export":true,
         "orders_view":true,"orders_view_all":true,"clients_view":true,
         "clients_view_all":true}'::jsonb, 8
WHERE NOT EXISTS (SELECT 1 FROM "SITE_Roles" WHERE name = 'Financeiro');

-- Marketing
INSERT INTO "SITE_Roles" (name, description, permissions, level)
SELECT 'Marketing', 'Marketing, campanhas, blog e landing pages',
       '{"dashboard_view":true,"marketing_view":true,"manage_marketing":true,
         "campaigns_view":true,"marketing_manage_campaigns":true,
         "marketing_manage_lists":true,"marketing_manage_templates":true,"blog_view":true,
         "blog_create":true,"blog_edit":true,"blog_ai":true,"landing_pages_view":true,
         "landing_pages_manage":true,"analytics_view":true}'::jsonb, 7
WHERE NOT EXISTS (SELECT 1 FROM "SITE_Roles" WHERE name = 'Marketing');

-- Atendente
INSERT INTO "SITE_Roles" (name, description, permissions, level)
SELECT 'Atendente', 'Pode editar conteúdo mas não configurações',
       '{"crm_view":true,"crm_manage_all":true,"courses_view":true,
         "courses_add_student":true,"orders_view":true,"clients_view":true,
         "tasks_view":true}'::jsonb, 2
WHERE NOT EXISTS (SELECT 1 FROM "SITE_Roles" WHERE name = 'Atendente');

-- Recarrega o cache de schema do PostgREST.
NOTIFY pgrst, 'reload config';
