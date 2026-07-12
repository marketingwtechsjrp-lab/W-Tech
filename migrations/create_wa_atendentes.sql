-- ============================================================================
-- Atendentes WhatsApp (Evolution API) — Espelho de conversas + Análise por IA
-- ----------------------------------------------------------------------------
-- 5 conexões de WhatsApp (uma instância Evolution por atendente). O webhook
-- (Supabase Edge Function `wa-atendentes-webhook`) grava TODAS as mensagens
-- enviadas e recebidas de cada número. A IA (lib/ai.ts) analisa os atendimentos
-- sob demanda e o relatório fica em SITE_WaAtendenteAnalises.
--
-- Módulo ISOLADO: não toca nas tabelas do inbox oficial (WhatsAppCloud*) nem
-- nas instâncias de automação/marketing existentes.
-- ============================================================================

-- ─── Atendentes (5 slots fixos) ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "SITE_WaAtendentes" (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    slot           integer NOT NULL UNIQUE CHECK (slot BETWEEN 1 AND 5),
    nome           text NOT NULL DEFAULT '',
    instance_name  text UNIQUE,                       -- instância na Evolution (w-tech-atendente-N)
    phone          text,                              -- número conectado (preenchido ao conectar)
    status         text NOT NULL DEFAULT 'disconnected', -- disconnected | connecting | open | error
    last_event_at  timestamptz,                       -- última mensagem sincronizada pelo webhook
    created_at     timestamptz NOT NULL DEFAULT now(),
    updated_at     timestamptz NOT NULL DEFAULT now()
);

INSERT INTO "SITE_WaAtendentes" (slot, nome, instance_name)
VALUES
    (1, 'Atendente 1', 'w-tech-atendente-1'),
    (2, 'Atendente 2', 'w-tech-atendente-2'),
    (3, 'Atendente 3', 'w-tech-atendente-3'),
    (4, 'Atendente 4', 'w-tech-atendente-4'),
    (5, 'Atendente 5', 'w-tech-atendente-5')
ON CONFLICT (slot) DO NOTHING;

-- ─── Mensagens espelhadas (enviadas E recebidas) ────────────────────────────
CREATE TABLE IF NOT EXISTS "SITE_WaAtendenteMensagens" (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    atendente_id   uuid NOT NULL REFERENCES "SITE_WaAtendentes"(id) ON DELETE CASCADE,
    instance_name  text NOT NULL,
    chat_jid       text NOT NULL,                     -- remoteJid do contato (ou grupo @g.us)
    chat_name      text,                              -- pushName do contato (só em mensagens recebidas)
    message_id     text NOT NULL,                     -- key.id da Evolution (dedupe)
    from_me        boolean NOT NULL DEFAULT false,    -- true = enviada pelo atendente
    participant    text,                              -- autor da mensagem em grupos
    tipo           text NOT NULL DEFAULT 'text',      -- text|image|audio|video|document|sticker|location|contact|reaction|other
    body           text,                              -- texto da mensagem OU legenda da mídia
    "timestamp"    timestamptz NOT NULL,
    created_at     timestamptz NOT NULL DEFAULT now(),
    UNIQUE (instance_name, message_id)
);

CREATE INDEX IF NOT EXISTS idx_wa_atd_msg_chat
    ON "SITE_WaAtendenteMensagens" (atendente_id, chat_jid, "timestamp");
CREATE INDEX IF NOT EXISTS idx_wa_atd_msg_periodo
    ON "SITE_WaAtendenteMensagens" (atendente_id, "timestamp" DESC);

-- ─── Relatórios da IA (análise sob demanda) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS "SITE_WaAtendenteAnalises" (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    atendente_id    uuid REFERENCES "SITE_WaAtendentes"(id) ON DELETE SET NULL,
    atendente_nome  text,                             -- snapshot (ou 'Todos os atendentes')
    periodo_inicio  timestamptz NOT NULL,
    periodo_fim     timestamptz NOT NULL,
    stats           jsonb,                            -- métricas determinísticas (contagens, tempos)
    relatorio       text NOT NULL,                    -- relatório gerado pela IA
    created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wa_atd_analise_created
    ON "SITE_WaAtendenteAnalises" (created_at DESC);

-- ─── Lista de conversas derivada das mensagens (sem estado duplicado) ───────
CREATE OR REPLACE FUNCTION wa_atendente_chats(p_atendente uuid)
RETURNS TABLE (
    chat_jid     text,
    chat_name    text,
    last_body    text,
    last_tipo    text,
    last_from_me boolean,
    last_ts      timestamptz,
    msg_count    bigint
)
LANGUAGE sql STABLE AS $$
    SELECT
        m.chat_jid,
        (array_agg(m.chat_name ORDER BY m."timestamp" DESC)
            FILTER (WHERE m.chat_name IS NOT NULL AND m.chat_name <> ''))[1] AS chat_name,
        (array_agg(m.body ORDER BY m."timestamp" DESC))[1]     AS last_body,
        (array_agg(m.tipo ORDER BY m."timestamp" DESC))[1]     AS last_tipo,
        (array_agg(m.from_me ORDER BY m."timestamp" DESC))[1]  AS last_from_me,
        max(m."timestamp")                                     AS last_ts,
        count(*)                                               AS msg_count
    FROM "SITE_WaAtendenteMensagens" m
    WHERE m.atendente_id = p_atendente
    GROUP BY m.chat_jid
    ORDER BY last_ts DESC
    LIMIT 300;
$$;

-- ─── RLS (mesmo padrão do módulo WhatsApp Cloud) ────────────────────────────
-- Leitura pelo painel /admin (protegido por autenticação de app); escrita de
-- mensagens SÓ via service role (webhook). Atendentes/análises são gerenciados
-- pelo painel.
ALTER TABLE "SITE_WaAtendentes"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SITE_WaAtendenteMensagens"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SITE_WaAtendenteAnalises"   ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS wa_atd_read ON "SITE_WaAtendentes";
CREATE POLICY wa_atd_read ON "SITE_WaAtendentes"
    FOR SELECT USING (true);

DROP POLICY IF EXISTS wa_atd_write ON "SITE_WaAtendentes";
CREATE POLICY wa_atd_write ON "SITE_WaAtendentes"
    FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS wa_atd_msg_read ON "SITE_WaAtendenteMensagens";
CREATE POLICY wa_atd_msg_read ON "SITE_WaAtendenteMensagens"
    FOR SELECT USING (true);
-- (sem policy de INSERT/UPDATE/DELETE: só o service role do webhook escreve)

DROP POLICY IF EXISTS wa_atd_analise_read ON "SITE_WaAtendenteAnalises";
CREATE POLICY wa_atd_analise_read ON "SITE_WaAtendenteAnalises"
    FOR SELECT USING (true);

DROP POLICY IF EXISTS wa_atd_analise_insert ON "SITE_WaAtendenteAnalises";
CREATE POLICY wa_atd_analise_insert ON "SITE_WaAtendenteAnalises"
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS wa_atd_analise_delete ON "SITE_WaAtendenteAnalises";
CREATE POLICY wa_atd_analise_delete ON "SITE_WaAtendenteAnalises"
    FOR DELETE USING (true);

-- ─── Realtime (monitor ao vivo no painel) ───────────────────────────────────
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE "SITE_WaAtendenteMensagens";
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE "SITE_WaAtendentes";
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
END $$;
