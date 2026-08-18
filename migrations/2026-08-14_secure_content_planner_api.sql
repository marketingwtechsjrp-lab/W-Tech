-- Planejador de Conteúdo: acesso exclusivo pela API autenticada do painel.
-- Preserva os dados existentes e remove a exposição direta pela chave anon.

BEGIN;

ALTER TABLE public."SITE_ContentPosts"
    ADD COLUMN IF NOT EXISTS ai_detail JSONB;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'site_content_posts_status_check'
          AND conrelid = 'public."SITE_ContentPosts"'::regclass
    ) THEN
        ALTER TABLE public."SITE_ContentPosts"
            ADD CONSTRAINT site_content_posts_status_check
            CHECK (status IN ('nao_iniciado', 'gravado', 'publicado', 'nao_realizado', 'excluido'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'site_content_posts_category_check'
          AND conrelid = 'public."SITE_ContentPosts"'::regclass
    ) THEN
        ALTER TABLE public."SITE_ContentPosts"
            ADD CONSTRAINT site_content_posts_category_check
            CHECK (category IN ('ENDOMARKETING', 'PAUTA FRIA', 'PAUTA QUENTE', 'REAL TIME'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'site_content_posts_format_check'
          AND conrelid = 'public."SITE_ContentPosts"'::regclass
    ) THEN
        ALTER TABLE public."SITE_ContentPosts"
            ADD CONSTRAINT site_content_posts_format_check
            CHECK (format IN ('video', 'stories', 'carrossel', 'estatico', 'youtube'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'site_content_posts_networks_check'
          AND conrelid = 'public."SITE_ContentPosts"'::regclass
    ) THEN
        ALTER TABLE public."SITE_ContentPosts"
            ADD CONSTRAINT site_content_posts_networks_check
            CHECK (jsonb_typeof(networks) = 'array');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'site_content_radar_kind_check'
          AND conrelid = 'public."SITE_ContentRadar"'::regclass
    ) THEN
        ALTER TABLE public."SITE_ContentRadar"
            ADD CONSTRAINT site_content_radar_kind_check
            CHECK (kind IN ('corrida', 'concorrente', 'ideia'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'site_content_inbox_kind_check'
          AND conrelid = 'public."SITE_ContentInbox"'::regclass
    ) THEN
        ALTER TABLE public."SITE_ContentInbox"
            ADD CONSTRAINT site_content_inbox_kind_check
            CHECK (kind IN ('duvida', 'ideia', 'conhecimento'));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_content_posts_date
    ON public."SITE_ContentPosts" (post_date);
CREATE INDEX IF NOT EXISTS idx_content_radar_week
    ON public."SITE_ContentRadar" (radar_week);
CREATE INDEX IF NOT EXISTS idx_content_inbox_pending
    ON public."SITE_ContentInbox" (processed, created_at);
CREATE INDEX IF NOT EXISTS idx_ig_metrics_posted
    ON public."SITE_InstagramMetrics" (posted_at);

ALTER TABLE public."SITE_ContentPosts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."SITE_ContentRadar" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."SITE_ContentInbox" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."SITE_InstagramMetrics" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS content_posts_all ON public."SITE_ContentPosts";
DROP POLICY IF EXISTS content_radar_all ON public."SITE_ContentRadar";
DROP POLICY IF EXISTS content_inbox_all ON public."SITE_ContentInbox";
DROP POLICY IF EXISTS ig_metrics_all ON public."SITE_InstagramMetrics";

DROP POLICY IF EXISTS content_posts_service_only ON public."SITE_ContentPosts";
DROP POLICY IF EXISTS content_radar_service_only ON public."SITE_ContentRadar";
DROP POLICY IF EXISTS content_inbox_service_only ON public."SITE_ContentInbox";
DROP POLICY IF EXISTS ig_metrics_service_only ON public."SITE_InstagramMetrics";

REVOKE ALL ON TABLE public."SITE_ContentPosts" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public."SITE_ContentRadar" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public."SITE_ContentInbox" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public."SITE_InstagramMetrics" FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public."SITE_ContentPosts" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public."SITE_ContentRadar" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public."SITE_ContentInbox" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public."SITE_InstagramMetrics" TO service_role;

CREATE POLICY content_posts_service_only ON public."SITE_ContentPosts"
    FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY content_radar_service_only ON public."SITE_ContentRadar"
    FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY content_inbox_service_only ON public."SITE_ContentInbox"
    FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY ig_metrics_service_only ON public."SITE_InstagramMetrics"
    FOR ALL TO service_role USING (true) WITH CHECK (true);

COMMIT;
