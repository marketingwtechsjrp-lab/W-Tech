-- ============================================================================
-- whatsapp_ai_humanize.sql  (Fase 4 — Humanização + dados vivos)
-- ----------------------------------------------------------------------------
-- Acrescenta à config da IA:
--   1) Humanização do envio: divide a resposta em vários balões curtos, com
--      delay natural entre eles e indicador "digitando..." (Cloud API).
--   2) Dados vivos: deixa a IA consultar os cursos publicados (preço, datas,
--      local, link de inscrição) direto do banco, em vez de só texto fixo.
-- Rode no Supabase: SQL Editor > New query > cole tudo > Run. Idempotente.
-- Pré-requisito: whatsapp_ai_tables.sql já rodado.
-- ============================================================================

ALTER TABLE "SITE_WhatsAppAIConfig"
  ADD COLUMN IF NOT EXISTS humanize_enabled     boolean NOT NULL DEFAULT true,   -- divide em balões + delay
  ADD COLUMN IF NOT EXISTS humanize_typing      boolean NOT NULL DEFAULT true,   -- mostra "digitando..."
  ADD COLUMN IF NOT EXISTS humanize_max_bubbles integer NOT NULL DEFAULT 4,      -- teto de balões por resposta
  ADD COLUMN IF NOT EXISTS humanize_speed        text   NOT NULL DEFAULT 'normal', -- slow | normal | fast
  ADD COLUMN IF NOT EXISTS use_live_courses     boolean NOT NULL DEFAULT true;   -- injeta cursos reais no prompt

NOTIFY pgrst, 'reload config';
