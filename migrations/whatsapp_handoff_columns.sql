-- ============================================================================
-- whatsapp_handoff_columns.sql  (Fase 2 — Multiatendimento + Assumir)
-- ----------------------------------------------------------------------------
-- Estado por conversa para o handoff humano e tag de quem enviou cada mensagem.
-- Rode no Supabase: SQL Editor > New query > cole tudo > Run. Idempotente.
-- ============================================================================

-- ── Conversas: controle de IA x humano ──────────────────────────────────────
ALTER TABLE "SITE_WhatsAppCloudConversations"
  ADD COLUMN IF NOT EXISTS bot_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES "SITE_Users"(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'bot', -- bot | pendente | humano | encerrado
  ADD COLUMN IF NOT EXISTS handoff_at timestamptz,
  ADD COLUMN IF NOT EXISTS handoff_by uuid;

CREATE INDEX IF NOT EXISTS idx_wa_cloud_conv_assigned
  ON "SITE_WhatsAppCloudConversations" (assigned_to);
CREATE INDEX IF NOT EXISTS idx_wa_cloud_conv_status
  ON "SITE_WhatsAppCloudConversations" (status);

-- ── Mensagens: quem enviou (humano / IA / rascunho / sistema / cliente) ──────
ALTER TABLE "SITE_WhatsAppCloudMessages"
  ADD COLUMN IF NOT EXISTS sent_by text; -- human | ai | ai_draft | system | customer

-- Mensagens recebidas são do cliente; enviadas antigas, do humano (retro-fill leve).
UPDATE "SITE_WhatsAppCloudMessages"
  SET sent_by = CASE WHEN direction = 'in' THEN 'customer' ELSE 'human' END
  WHERE sent_by IS NULL;

NOTIFY pgrst, 'reload config';
