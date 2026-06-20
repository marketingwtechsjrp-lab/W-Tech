-- ============================================================================
-- whatsapp_permissions_grant.sql  (Fase 5 — Permissões do módulo WhatsApp)
-- ----------------------------------------------------------------------------
-- Concede as novas permissões de Atendimento WhatsApp aos cargos existentes,
-- para que ninguém perca acesso ao adotar o controle granular. Idempotente.
-- ============================================================================

-- Quem já acessa o CRM passa a poder usar o inbox, enviar e assumir conversas.
UPDATE "SITE_Roles"
SET permissions = permissions
  || jsonb_build_object('whatsapp_inbox_view', true, 'whatsapp_send', true, 'whatsapp_assume', true)
WHERE (permissions->>'crm_view')::boolean IS TRUE
  AND NOT (permissions ? 'whatsapp_inbox_view');

-- Quem gerencia configurações pode treinar/ligar a IA e configurar o motor.
UPDATE "SITE_Roles"
SET permissions = permissions
  || jsonb_build_object('whatsapp_ai_manage', true, 'whatsapp_ai_train', true, 'whatsapp_engine_config', true)
WHERE (permissions->>'manage_settings')::boolean IS TRUE
  AND NOT (permissions ? 'whatsapp_ai_manage');

NOTIFY pgrst, 'reload config';
