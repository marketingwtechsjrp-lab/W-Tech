-- ============================================================================
-- WhatsApp Cloud API (Meta / Business Platform) — Módulo de Atendimento
-- ----------------------------------------------------------------------------
-- Tabelas DEDICADAS e ISOLADAS do módulo de automação via Evolution API.
-- Aqui ficam as conversas e mensagens trocadas pela API oficial da Meta
-- (número +55 17 3231-2858 / Phone Number ID 561199070419888).
--
-- Rode no Supabase: SQL Editor > New query > cole tudo > Run.
-- ============================================================================

-- ─── Conversas (1 por contato / wa_id) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS "SITE_WhatsAppCloudConversations" (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    wa_id           text NOT NULL UNIQUE,          -- telefone do contato no formato WhatsApp (ex: 5511999998888)
    profile_name    text,                          -- nome do perfil do contato (vem no webhook)
    last_message    text,                          -- preview da última mensagem
    last_message_at timestamptz,
    last_direction  text,                          -- 'in' (recebida) | 'out' (enviada)
    unread_count    integer NOT NULL DEFAULT 0,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wa_cloud_conv_last_msg
    ON "SITE_WhatsAppCloudConversations" (last_message_at DESC NULLS LAST);

-- ─── Mensagens ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "SITE_WhatsAppCloudMessages" (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id uuid REFERENCES "SITE_WhatsAppCloudConversations"(id) ON DELETE CASCADE,
    wa_id           text NOT NULL,                 -- telefone do contato (denormalizado)
    wa_message_id   text UNIQUE,                   -- id da mensagem na Meta (dedup + atualização de status)
    direction       text NOT NULL,                 -- 'in' | 'out'
    type            text NOT NULL DEFAULT 'text',  -- text|image|audio|video|document|sticker|unsupported
    body            text,                          -- texto da mensagem OU legenda da mídia
    media_data      text,                          -- mídia em base64 data URL (data:<mime>;base64,...)
    media_mime      text,
    media_filename  text,
    status          text,                          -- received|sent|delivered|read|failed
    error           text,                          -- detalhe de erro quando status = failed
    "timestamp"     timestamptz NOT NULL DEFAULT now(),
    created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wa_cloud_msg_conv
    ON "SITE_WhatsAppCloudMessages" (conversation_id, "timestamp");
CREATE INDEX IF NOT EXISTS idx_wa_cloud_msg_waid
    ON "SITE_WhatsAppCloudMessages" (wa_id);

-- ─── RLS (leitura pelo painel via anon; escrita só via service role no backend) ──
ALTER TABLE "SITE_WhatsAppCloudConversations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SITE_WhatsAppCloudMessages"      ENABLE ROW LEVEL SECURITY;

-- Leitura liberada (o painel /admin já é protegido por autenticação de app).
DROP POLICY IF EXISTS wa_cloud_conv_read ON "SITE_WhatsAppCloudConversations";
CREATE POLICY wa_cloud_conv_read ON "SITE_WhatsAppCloudConversations"
    FOR SELECT USING (true);

DROP POLICY IF EXISTS wa_cloud_msg_read ON "SITE_WhatsAppCloudMessages";
CREATE POLICY wa_cloud_msg_read ON "SITE_WhatsAppCloudMessages"
    FOR SELECT USING (true);

-- Atualização do contador de não-lidas a partir do painel (marcar como lida).
DROP POLICY IF EXISTS wa_cloud_conv_update ON "SITE_WhatsAppCloudConversations";
CREATE POLICY wa_cloud_conv_update ON "SITE_WhatsAppCloudConversations"
    FOR UPDATE USING (true) WITH CHECK (true);

-- ─── Realtime (atualização ao vivo do inbox) ────────────────────────────────
-- Adiciona as tabelas à publicação do Supabase Realtime (ignora se já existir).
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE "SITE_WhatsAppCloudConversations";
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE "SITE_WhatsAppCloudMessages";
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
END $$;
