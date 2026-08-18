-- ═══════════════════════════════════════════════════════════════════════════
-- Radar de Pauta — Planejador de Conteúdo (Marketing Hub → aba "Planejador")
--
-- Tabela SITE_ContentRadar: resultado da varredura semanal automática que
-- substitui o "scrolling ocioso" da social media. Toda segunda de manhã a
-- rotina pesquisa e grava aqui:
--   kind='corrida'      → provas do fim de semana (calendário de corridas,
--                         participação dos pilotos patrocinados/Moto Gerais)
--   kind='concorrente'  → movimento relevante de concorrentes e marcas
--                         (MC Center, Mesa, KYB, Showa, Husqvarna, Honda…)
--   kind='ideia'        → ideias de post prontas, calibradas pelas métricas
--
-- Rodar no Postgres da VPS (container wtechdb_supadb) e reiniciar o
-- PostgREST (wtechdb_suparest) para recarregar o schema cache.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS "SITE_ContentRadar" (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    radar_week       DATE NOT NULL,               -- segunda-feira da semana do radar
    kind             TEXT NOT NULL,               -- corrida | concorrente | ideia
    title            TEXT NOT NULL,
    summary          TEXT,                        -- resumo/detalhe do achado ou da ideia
    event_date       DATE,                        -- corridas: data da prova
    source           TEXT,                        -- link/perfil de origem, quando houver
    has_pilots       BOOLEAN NOT NULL DEFAULT false, -- pilotos patrocinados envolvidos
    suggested_format TEXT,                        -- ideias: video | carrossel | estatico | stories
    used             BOOLEAN NOT NULL DEFAULT false, -- já virou card no calendário
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT site_content_radar_kind_check
        CHECK (kind IN ('corrida', 'concorrente', 'ideia'))
);

CREATE INDEX IF NOT EXISTS idx_content_radar_week ON "SITE_ContentRadar"(radar_week);

ALTER TABLE "SITE_ContentRadar" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS content_radar_all ON "SITE_ContentRadar";
DROP POLICY IF EXISTS content_radar_service_only ON "SITE_ContentRadar";
REVOKE ALL ON TABLE "SITE_ContentRadar" FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "SITE_ContentRadar" TO service_role;
CREATE POLICY content_radar_service_only ON "SITE_ContentRadar"
    FOR ALL TO service_role USING (true) WITH CHECK (true);
