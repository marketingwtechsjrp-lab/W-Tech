-- ═══════════════════════════════════════════════════════════════════════════
-- Métricas de retenção da VSL — Super Admin → Funil de Suspensão
--
-- Uma linha por sessão de visualização. O player manda batidas periódicas para
-- /api/vsl-progress, que faz upsert aqui pela chave (visitor_id, session_id,
-- video_id). Guardamos o ponto MAIS DISTANTE já assistido (max_watched_seconds)
-- e a última posição, para responder as duas perguntas do negócio:
--
--   • até onde o público costuma assistir  → curva de retenção
--   • onde ele desiste                     → maior queda entre faixas
--
-- `video_id` é o nome do arquivo da VSL. Ao trocar o vídeo, as métricas do
-- vídeo novo não se misturam com as do antigo — dá para comparar versões.
--
-- Escrita só por service_role: o navegador nunca fala direto com esta tabela.
--
-- Rodar no Postgres da VPS (container wtechdb_supadb) e reiniciar o
-- PostgREST (wtechdb_suparest) para recarregar o schema cache.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS "SITE_VSLProgress" (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visitor_id           TEXT NOT NULL,            -- wtech_visitor_id (localStorage)
    session_id           TEXT NOT NULL,            -- wtech_session_id (sessionStorage)
    video_id             TEXT NOT NULL,            -- arquivo da VSL em exibição
    page                 TEXT NOT NULL,            -- vsl_dark | vsl_light | lp_v2 | ...
    theme                TEXT,                     -- dark | light
    language             TEXT,                     -- pt-BR | pt-PT | es | en
    country              TEXT,                     -- resolvido por IP no servidor

    duration_seconds     NUMERIC(10,2),            -- duração total do vídeo
    max_watched_seconds  NUMERIC(10,2) NOT NULL DEFAULT 0,  -- ponto mais distante assistido
    last_position_seconds NUMERIC(10,2),           -- onde estava na última batida
    watched_ratio        NUMERIC(5,4),             -- max_watched / duration (0..1)
    completed            BOOLEAN NOT NULL DEFAULT false,
    reached_unlock       BOOLEAN NOT NULL DEFAULT false,    -- cruzou os 50s do gate

    -- Atribuição, para cruzar retenção com origem de tráfego
    quiz_profile         TEXT,
    utm_source           TEXT,
    utm_medium           TEXT,
    utm_campaign         TEXT,
    utm_content          TEXT,

    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT site_vsl_progress_session_unique
        UNIQUE (visitor_id, session_id, video_id)
);

CREATE INDEX IF NOT EXISTS idx_vsl_progress_video   ON "SITE_VSLProgress"(video_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vsl_progress_page    ON "SITE_VSLProgress"(page, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vsl_progress_created ON "SITE_VSLProgress"(created_at DESC);

ALTER TABLE "SITE_VSLProgress" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS vsl_progress_service_only ON "SITE_VSLProgress";
REVOKE ALL ON TABLE "SITE_VSLProgress" FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "SITE_VSLProgress" TO service_role;
CREATE POLICY vsl_progress_service_only ON "SITE_VSLProgress"
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ───────────────────────────────────────────────────────────────────────────
-- Curva de retenção pronta: para cada faixa de 5% do vídeo, quantas sessões
-- chegaram até lá. A queda entre uma faixa e a seguinte é o ponto de abandono.
-- ───────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW "SITE_VSLRetention" AS
WITH faixas AS (
    SELECT generate_series(0, 100, 5) AS pct
),
sessoes AS (
    SELECT video_id, page, watched_ratio, created_at
    FROM "SITE_VSLProgress"
    WHERE watched_ratio IS NOT NULL
)
SELECT
    s.video_id,
    s.page,
    f.pct                                                   AS percentual,
    COUNT(*) FILTER (WHERE s.watched_ratio * 100 >= f.pct)  AS sessoes_que_chegaram,
    COUNT(*)                                                AS sessoes_totais
FROM sessoes s
CROSS JOIN faixas f
GROUP BY s.video_id, s.page, f.pct
ORDER BY s.video_id, s.page, f.pct;

GRANT SELECT ON "SITE_VSLRetention" TO service_role;
