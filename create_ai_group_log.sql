-- ============================================================================
-- Assistentes de IA — Bot de perguntas no grupo do WhatsApp (Evolution)
-- ----------------------------------------------------------------------------
-- Log das perguntas respondidas pelos agentes (Léo/Bia/Rita/Sofia) no grupo.
-- Dupla função:
--   1. DEDUPE: message_id UNIQUE impede reprocessar reentregas do webhook.
--   2. HISTÓRICO: exibido no módulo Admin → Assistentes de IA.
--
-- Rode no Supabase: SQL Editor > New query > cole tudo > Run.
-- ============================================================================

CREATE TABLE IF NOT EXISTS "SITE_AIGroupLog" (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id  text UNIQUE,                    -- id da mensagem na Evolution (dedupe de reentrega)
    group_jid   text,                           -- JID do grupo (…@g.us)
    sender_name text,                           -- pushName de quem perguntou
    question    text,                           -- texto recebido
    agent       text,                           -- leo | bia | rita | sofia | silencio
    answer      text,                           -- resposta enviada (null = silêncio/erro)
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_group_log_created
    ON "SITE_AIGroupLog" (created_at DESC);

-- ─── RLS (leitura pelo painel via anon; escrita só via service role no backend) ──
ALTER TABLE "SITE_AIGroupLog" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ai_group_log_read ON "SITE_AIGroupLog";
CREATE POLICY ai_group_log_read ON "SITE_AIGroupLog"
    FOR SELECT USING (true);
