-- Painel de vendas ao vivo da Vacuum Pump.
--
-- Uma função só, chamada pelo servidor a cada poucos segundos: junta visitas, cliques,
-- carrinhos e vendas em uma consulta, sem expor nenhuma tabela ao navegador. Devolve
-- só o primeiro nome e a cidade de quem comprou, porque o painel fica em uma TV.
--
-- Aditiva: não altera dado nem tabela. Rodar com o dono das tabelas:
--   docker exec -i $(docker ps -qf name=wtechdb_supadb) psql -U supabase_admin -d postgres < este_arquivo
-- Depois recarregar o PostgREST (o NOTIFY não surte efeito nesta VPS):
--   docker service update --force wtechdb_suparest
--
-- p_from: início do período pedido (campanha ou hoje), para visitas, cliques e carrinhos.
-- p_sales_from: início para as vendas do período; nulo conta a campanha inteira, inclusive
-- o que for vendido antes da abertura oficial com o soft_open ligado.

CREATE OR REPLACE FUNCTION site_vacuum_dashboard(
    p_campaign text,
    p_from timestamptz,
    p_to timestamptz,
    p_sales_from timestamptz DEFAULT NULL
) RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
WITH
tz AS (
    SELECT
        now() - interval '24 hours' AS last_24h,
        now() - interval '5 minutes' AS last_5m,
        (date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo')) AT TIME ZONE 'America/Sao_Paulo' AS today
),
pv_all AS (
    SELECT p.visitor_id, p.session_id, p.device_type, p.path, p.referrer, p.created_at
    FROM "SITE_Analytics_PageViews" p, tz
    WHERE p.created_at >= LEAST(p_from, tz.last_24h, tz.today)
      AND p.created_at < GREATEST(p_to, now())
      AND p.path LIKE '/maquina-de-vacuo%'
      -- Testes locais gravam aqui também: não contam como visita.
      AND COALESCE(p.referrer, '') NOT LIKE '%localhost%'
),
pv AS (SELECT * FROM pv_all WHERE created_at >= p_from AND created_at < p_to),
ev_all AS (
    SELECT e.action, e.visitor_id, e.created_at
    FROM "SITE_Analytics_Events" e, tz
    WHERE e.created_at >= LEAST(p_from, tz.last_24h, tz.today)
      AND e.created_at < GREATEST(p_to, now())
      AND e.category = 'Vacuum Pump'
),
ev AS (SELECT * FROM ev_all WHERE created_at >= p_from AND created_at < p_to),
ck AS (
    SELECT stage, payment_attempts, amount, pix_expires_at
    FROM "SITE_CampaignCheckouts"
    WHERE campaign = p_campaign AND created_at >= p_from AND created_at < p_to
),
ck_open AS (
    SELECT stage, amount, pix_expires_at, updated_at
    FROM "SITE_CampaignCheckouts"
    WHERE campaign = p_campaign
),
sales_all AS (
    SELECT id, order_number, total_value, payment_method, items, customer_name, delivery_city, delivery_state, seller_name, created_at
    FROM "SITE_Sales"
    WHERE campaign = p_campaign AND status IN ('paid', 'approved', 'producing', 'shipped', 'delivered')
),
sales AS (
    SELECT * FROM sales_all WHERE p_sales_from IS NULL OR created_at >= p_sales_from
),
sale_items AS (
    SELECT s.id AS sale_id, item->>'id' AS item_id, item->>'name' AS item_name, COALESCE((item->>'price')::numeric, 0) AS price
    FROM sales s, jsonb_array_elements(CASE WHEN jsonb_typeof(s.items::jsonb) = 'array' THEN s.items::jsonb ELSE '[]'::jsonb END) AS item
),
sources AS (
    SELECT
        CASE
            WHEN path ~ 'utm_source=' THEN lower(substring(path FROM 'utm_source=([^&#]+)'))
            WHEN path ~ 'fbclid=' THEN 'facebook'
            WHEN path ~ 'gclid=' THEN 'google_ads'
            WHEN referrer IS NULL OR referrer IN ('', 'direct') THEN 'direto'
            ELSE regexp_replace(lower(COALESCE(substring(referrer FROM '^https?://([^/]+)'), 'direto')), '^www\.', '')
        END AS source,
        visitor_id
    FROM pv
)
SELECT jsonb_build_object(
    'visits', jsonb_build_object(
        'views', (SELECT count(*) FROM pv),
        'visitors', (SELECT count(DISTINCT visitor_id) FROM pv),
        'sessions', (SELECT count(DISTINCT session_id) FROM pv),
        'mobile', (SELECT count(DISTINCT visitor_id) FROM pv WHERE device_type = 'mobile'),
        'desktop', (SELECT count(DISTINCT visitor_id) FROM pv WHERE device_type IS DISTINCT FROM 'mobile'),
        'active_5m', (
            SELECT count(DISTINCT visitor_id) FROM (
                SELECT visitor_id FROM pv_all, tz WHERE pv_all.created_at >= tz.last_5m
                UNION ALL
                SELECT visitor_id FROM ev_all, tz WHERE ev_all.created_at >= tz.last_5m
            ) recent
        ),
        'today_views', (SELECT count(*) FROM pv_all, tz WHERE pv_all.created_at >= tz.today),
        'today_visitors', (SELECT count(DISTINCT visitor_id) FROM pv_all, tz WHERE pv_all.created_at >= tz.today)
    ),
    'clicks', jsonb_build_object(
        'total', (SELECT count(*) FROM ev),
        'buy', (SELECT count(*) FROM ev WHERE action ~ '^vacuum_(cta|add)_'),
        'by_action', COALESCE((
            SELECT jsonb_agg(row_to_json(a) ORDER BY a.clicks DESC)
            FROM (SELECT action, count(*) AS clicks, count(DISTINCT visitor_id) AS visitors FROM ev GROUP BY action ORDER BY clicks DESC LIMIT 40) a
        ), '[]'::jsonb)
    ),
    'funnel', jsonb_build_object(
        'visitors', (SELECT count(DISTINCT visitor_id) FROM pv),
        'buy_click', (SELECT count(DISTINCT visitor_id) FROM ev WHERE action ~ '^vacuum_(cta|add)_'),
        'checkout', (SELECT count(*) FROM ck WHERE stage NOT IN ('waitlist', 'contact')),
        'payment', (SELECT count(*) FROM ck WHERE payment_attempts > 0 OR stage IN ('payment', 'pix_pending', 'review', 'rejected', 'expired', 'paid')),
        'paid', (SELECT count(*) FROM sales_all WHERE created_at >= p_from AND created_at < p_to)
    ),
    'open', jsonb_build_object(
        'pix_pending', (SELECT count(*) FROM ck_open WHERE stage = 'pix_pending' AND (pix_expires_at IS NULL OR pix_expires_at > now())),
        'pix_pending_value', (SELECT COALESCE(sum(amount), 0) FROM ck_open WHERE stage = 'pix_pending' AND (pix_expires_at IS NULL OR pix_expires_at > now())),
        'review', (SELECT count(*) FROM ck_open WHERE stage = 'review'),
        'rejected', (SELECT count(*) FROM ck_open WHERE stage = 'rejected'),
        'in_cart', (SELECT count(*) FROM ck_open WHERE stage IN ('lead', 'address', 'payment')),
        'contact', (SELECT count(*) FROM ck_open WHERE stage = 'contact'),
        'waitlist', (SELECT count(*) FROM ck_open WHERE stage = 'waitlist')
    ),
    'sales_total', jsonb_build_object(
        'count', (SELECT count(*) FROM sales_all),
        'revenue', (SELECT COALESCE(sum(total_value), 0) FROM sales_all),
        'today_count', (SELECT count(*) FROM sales_all, tz WHERE sales_all.created_at >= tz.today),
        'today_revenue', (SELECT COALESCE(sum(total_value), 0) FROM sales_all, tz WHERE sales_all.created_at >= tz.today)
    ),
    'sales', jsonb_build_object(
        'count', (SELECT count(*) FROM sales),
        'revenue', (SELECT COALESCE(sum(total_value), 0) FROM sales),
        'with_accessory', (SELECT count(DISTINCT sale_id) FROM sale_items WHERE item_id IS DISTINCT FROM 'vacuum_pump_standard'),
        'by_method', COALESCE((
            SELECT jsonb_agg(row_to_json(m) ORDER BY m.sales DESC)
            FROM (SELECT COALESCE(payment_method, 'Outro') AS method, count(*) AS sales, COALESCE(sum(total_value), 0) AS revenue FROM sales GROUP BY 1) m
        ), '[]'::jsonb),
        'by_item', COALESCE((
            SELECT jsonb_agg(row_to_json(i) ORDER BY i.units DESC)
            FROM (SELECT item_id AS id, max(item_name) AS name, count(*) AS units, sum(price) AS revenue FROM sale_items GROUP BY item_id) i
        ), '[]'::jsonb),
        'by_seller', COALESCE((
            SELECT jsonb_agg(row_to_json(v) ORDER BY v.sales DESC)
            FROM (SELECT seller_name AS seller, count(*) AS sales, COALESCE(sum(total_value), 0) AS revenue FROM sales WHERE seller_name IS NOT NULL GROUP BY seller_name) v
        ), '[]'::jsonb)
    ),
    'recent', COALESCE((
        SELECT jsonb_agg(row_to_json(r) ORDER BY r.created_at DESC)
        FROM (
            SELECT
                s.id,
                s.order_number,
                split_part(COALESCE(s.customer_name, 'Cliente'), ' ', 1) AS first_name,
                s.delivery_city AS city,
                s.delivery_state AS state,
                s.total_value AS total,
                s.payment_method AS method,
                s.seller_name AS seller,
                s.created_at,
                (SELECT count(*) FROM sales_all earlier WHERE earlier.created_at <= s.created_at) AS position,
                COALESCE((SELECT jsonb_agg(si.item_name) FROM sale_items si WHERE si.sale_id = s.id), '[]'::jsonb) AS items
            FROM sales_all s
            ORDER BY s.created_at DESC
            LIMIT 30
        ) r
    ), '[]'::jsonb),
    'hourly', COALESCE((
        -- Últimas 24 horas, hora a hora, no horário de São Paulo, sem buracos no gráfico.
        SELECT jsonb_agg(row_to_json(h) ORDER BY h.bucket)
        FROM (
            SELECT
                to_char(slot AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD"T"HH24:00') AS bucket,
                (SELECT count(DISTINCT visitor_id) FROM pv_all WHERE created_at >= slot AND created_at < slot + interval '1 hour') AS visitors,
                (SELECT count(*) FROM ev_all WHERE created_at >= slot AND created_at < slot + interval '1 hour') AS clicks,
                (SELECT count(*) FROM sales_all WHERE created_at >= slot AND created_at < slot + interval '1 hour') AS sales
            FROM generate_series(date_trunc('hour', now()) - interval '23 hours', date_trunc('hour', now()), interval '1 hour') AS slot
        ) h
    ), '[]'::jsonb),
    'sources', COALESCE((
        SELECT jsonb_agg(row_to_json(o) ORDER BY o.visitors DESC)
        FROM (SELECT source, count(DISTINCT visitor_id) AS visitors FROM sources GROUP BY source ORDER BY visitors DESC LIMIT 8) o
    ), '[]'::jsonb)
);
$$;

REVOKE ALL ON FUNCTION site_vacuum_dashboard(text, timestamptz, timestamptz, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION site_vacuum_dashboard(text, timestamptz, timestamptz, timestamptz) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION site_vacuum_dashboard(text, timestamptz, timestamptz, timestamptz) TO service_role;
