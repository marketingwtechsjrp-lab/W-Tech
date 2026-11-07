-- Saída do carrinho da Vacuum Pump, para o painel ao vivo: em que etapa a pessoa parou, se fechou
-- o carrinho ou trocou de aplicativo, e até onde preencheu. O rótulo traz só o nome dos campos.
--
-- Só conta como saída o que foi a última ação da pessoa: quem voltou ou abriu o carrinho de novo
-- não saiu, e quem chegou à página de obrigado comprou.
--
-- Substitui a função de 2026-11-06_vacuum_checkout_health.sql, com o resto igual. Aditiva: só
-- acrescenta a chave `exits`. Rodar com o dono das tabelas:
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
),
last_action AS (
    SELECT DISTINCT ON (visitor_id) visitor_id, action, label, created_at
    FROM ev
    WHERE visitor_id IS NOT NULL AND (action LIKE 'vacuum_step_%' OR action LIKE 'vacuum_exit_%')
    ORDER BY visitor_id, created_at DESC
),
exits AS (
    SELECT
        l.visitor_id,
        regexp_replace(l.action, '^vacuum_exit_', '') AS how,
        split_part(l.label, '|', 1) AS step,
        split_part(l.label, '|', 2) AS filled,
        split_part(l.label, '|', 3) AS shipping,
        l.created_at
    FROM last_action l
    WHERE l.action IN ('vacuum_exit_closed', 'vacuum_exit_hidden')
      AND NOT EXISTS (
          SELECT 1 FROM "SITE_Analytics_PageViews" v
          WHERE v.visitor_id = l.visitor_id
            AND v.path LIKE '/maquina-de-vacuo/obrigado%'
            AND v.created_at >= l.created_at
      )
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
    ), '[]'::jsonb),
    'exits', jsonb_build_object(
        'by_step', COALESCE((
            SELECT jsonb_agg(row_to_json(s))
            FROM (
                SELECT step, count(*) AS visitors, count(*) FILTER (WHERE how = 'closed') AS closed, count(*) FILTER (WHERE how = 'hidden') AS hidden
                FROM exits GROUP BY step
            ) s
        ), '[]'::jsonb),
        'fields', COALESCE((
            SELECT jsonb_agg(row_to_json(f))
            FROM (
                SELECT e.step, field, count(*) AS visitors
                FROM exits e, unnest(string_to_array(NULLIF(e.filled, ''), ',')) AS field
                GROUP BY e.step, field
            ) f
        ), '[]'::jsonb),
        'recent', COALESCE((
            SELECT jsonb_agg(row_to_json(r) ORDER BY r.at DESC)
            FROM (
                SELECT
                    e.how, e.step, e.filled, e.shipping, e.created_at AS at,
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
                        WHERE v.visitor_id = e.visitor_id
                        ORDER BY v.created_at DESC
                        LIMIT 1
                    ) AS device
                FROM exits e
                ORDER BY e.created_at DESC
                LIMIT 6
            ) r
        ), '[]'::jsonb)
    )
);
$$;

REVOKE ALL ON FUNCTION site_vacuum_checkout_health(text, timestamptz, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION site_vacuum_checkout_health(text, timestamptz, timestamptz) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION site_vacuum_checkout_health(text, timestamptz, timestamptz) TO service_role;
