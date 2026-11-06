-- Saúde do checkout da Vacuum Pump, para o painel ao vivo: por qual etapa as pessoas passam
-- e o que deu errado no caminho até pagar.
--
-- Função separada de site_vacuum_dashboard de propósito: se esta falhar, o painel de vendas
-- continua no ar. A medição por etapa começou com a v3.63.0, então o funil só conta o que
-- veio depois do primeiro evento de etapa do período, para não comparar coisas diferentes.
--
-- Aditiva: não altera dado nem tabela. Rodar com o dono das tabelas:
--   docker exec -i $(docker ps -qf name=wtechdb_supadb) psql -U supabase_admin -d postgres < este_arquivo
-- Depois recarregar o cache do PostgREST:
--   docker kill -s SIGUSR1 $(docker ps -qf name=wtechdb_suparest)

CREATE OR REPLACE FUNCTION site_vacuum_checkout_health(
    p_campaign text,
    p_from timestamptz,
    p_to timestamptz
) RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
WITH
ev AS (
    SELECT e.action, e.label, e.visitor_id, e.created_at
    FROM "SITE_Analytics_Events" e
    WHERE e.created_at >= p_from AND e.created_at < p_to
      AND (
          e.category = 'Vacuum Pump Checkout'
          -- O erro de arquivo que não chega vem da proteção geral do site, antes de a página existir.
          OR (e.action = 'page_render_error' AND e.path LIKE '/maquina-de-vacuo%')
      )
),
start_at AS (
    SELECT min(created_at) AS since FROM ev WHERE action LIKE 'vacuum_step_%'
),
problems AS (
    SELECT
        CASE WHEN action = 'page_render_error' THEN 'page_not_opened' ELSE regexp_replace(action, '^vacuum_problem_', '') END AS problem,
        label, visitor_id, created_at
    FROM ev
    WHERE action LIKE 'vacuum_problem_%' OR action = 'page_render_error'
),
ck AS (
    SELECT c.stage, c.payment_attempts
    FROM "SITE_CampaignCheckouts" c, start_at
    WHERE c.campaign = p_campaign AND c.created_at >= start_at.since AND c.created_at < p_to
),
last_problems AS (
    SELECT problem, label, visitor_id, created_at FROM problems ORDER BY created_at DESC LIMIT 6
)
SELECT jsonb_build_object(
    'since', (SELECT since FROM start_at),
    'buy_click', (
        SELECT count(DISTINCT e.visitor_id)
        FROM "SITE_Analytics_Events" e, start_at
        WHERE e.category = 'Vacuum Pump' AND e.action ~ '^vacuum_(cta|add)_'
          AND e.created_at >= start_at.since AND e.created_at < p_to
    ),
    'steps', jsonb_build_object(
        'cart', (SELECT count(DISTINCT visitor_id) FROM ev WHERE action = 'vacuum_step_cart'),
        'contact', (SELECT count(DISTINCT visitor_id) FROM ev WHERE action = 'vacuum_step_contact'),
        'delivery', (SELECT count(DISTINCT visitor_id) FROM ev WHERE action = 'vacuum_step_delivery'),
        'payment', (SELECT count(DISTINCT visitor_id) FROM ev WHERE action = 'vacuum_step_payment')
    ),
    'attempted', (SELECT count(*) FROM ck WHERE payment_attempts > 0),
    'pix_expired', (SELECT count(*) FROM ck WHERE stage = 'expired'),
    'paid', (
        SELECT count(*)
        FROM "SITE_Sales" s, start_at
        WHERE s.campaign = p_campaign AND s.channel = 'Site'
          AND s.status IN ('paid', 'approved', 'producing', 'shipped', 'delivered')
          AND s.created_at >= start_at.since AND s.created_at < p_to
    ),
    'problems', COALESCE((
        SELECT jsonb_agg(row_to_json(a) ORDER BY a.visitors DESC, a.last_at DESC)
        FROM (
            -- Erro antes de a pessoa ter identificação ainda é uma pessoa: conta o evento como uma.
            SELECT problem, count(*) AS total, count(DISTINCT COALESCE(visitor_id, created_at::text)) AS visitors, max(created_at) AS last_at
            FROM problems GROUP BY problem
        ) a
    ), '[]'::jsonb),
    'recent', COALESCE((
        SELECT jsonb_agg(row_to_json(r) ORDER BY r.at DESC)
        FROM (
            SELECT
                p.problem,
                left(p.label, 120) AS detail,
                p.created_at AS at,
                (
                    SELECT CASE
                        WHEN v.user_agent ~* 'Instagram' THEN 'Instagram'
                        WHEN v.user_agent ~* 'FBAN|FBAV|FB_IAB|FBIOS' OR v.user_agent ~ '; wv\)' THEN 'Facebook'
                        WHEN v.user_agent ~* 'Android' THEN 'Android'
                        WHEN v.user_agent ~* 'iPhone|iPad' THEN 'iPhone'
                        WHEN v.user_agent IS NULL THEN NULL
                        ELSE 'Computador'
                    END
                    FROM "SITE_Analytics_PageViews" v
                    WHERE v.visitor_id = p.visitor_id
                    ORDER BY v.created_at DESC
                    LIMIT 1
                ) AS device
            FROM last_problems p
        ) r
    ), '[]'::jsonb)
);
$$;

REVOKE ALL ON FUNCTION site_vacuum_checkout_health(text, timestamptz, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION site_vacuum_checkout_health(text, timestamptz, timestamptz) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION site_vacuum_checkout_health(text, timestamptz, timestamptz) TO service_role;
