-- ============================================================================
-- grant_springs_oleo_permissions.sql
-- ----------------------------------------------------------------------------
-- Os módulos "Molas & Motos" (springs) e "Óleo & Suspensão" (oleo) passaram a
-- ter permissão PRÓPRIA (springs_view / oleo_view) em vez de herdar de
-- catalog_view. Para não tirar acesso de quem já via esses módulos, concede as
-- novas chaves a todo cargo que já tem catalog_view. Idempotente.
--
-- Depois disso, em Equipe & Acesso → cargo → "Ferramentas Técnicas (Molas &
-- Óleo)", o admin pode ligar/desligar cada módulo por cargo.
-- ============================================================================

UPDATE "SITE_Roles"
SET permissions = permissions
  || jsonb_build_object('springs_view', true, 'oleo_view', true)
WHERE (permissions->>'catalog_view')::boolean IS TRUE
  AND NOT (permissions ? 'springs_view');

NOTIFY pgrst, 'reload config';
