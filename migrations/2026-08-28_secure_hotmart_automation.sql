-- ============================================================================
-- 2026-08-28 · Automacao Hotmart: segredos, escrita e idempotencia
-- ----------------------------------------------------------------------------
-- Mantem checkout_url e product_id legiveis pelo site publico, mas impede que
-- qualquer portador da anon key altere as chaves da integracao e do transporte
-- WhatsApp que ela consome. Token e
-- credenciais ficam invisiveis para anon e authenticated. A gravacao passa a
-- ser feita somente pela API de staff, usando service_role.
--
-- A tabela de eventos nao armazena nome, telefone, e-mail ou payload bruto.
-- Ela existe apenas para impedir que retries concorrentes da Hotmart enviem a
-- mesma mensagem de WhatsApp mais de uma vez.
-- ============================================================================

BEGIN;

ALTER TABLE public."SITE_Config" ENABLE ROW LEVEL SECURITY;

-- Lista cumulativa da policy vigente (2026-07-30), agora com Hotmart.
DROP POLICY IF EXISTS "deny_anon_read_server_secrets" ON public."SITE_Config";

CREATE POLICY "deny_anon_read_server_secrets" ON public."SITE_Config"
    AS RESTRICTIVE
    FOR SELECT
    TO anon, authenticated
    USING (
        key NOT IN (
            'stripe_api_key',
            'stripe_api_key_live',
            'stripe_api_key_test',
            'stripe_webhook_secret',
            'mercadopago_access_token',
            'whatsapp_cloud_app_secret',
            'whatsapp_cloud_access_token',
            'whatsapp_cloud_webhook_verify_token',
            'wa_atendentes_webhook_token',
            'brevo_smtp_key',
            'brevo_smtp_login',
            'evolution_api_key',
            'kiwify_client_secret',
            'kiwify_client_id',
            'ai_group_webhook_token',
            'hotmart_webhook_token',
            'hotmart_client_id',
            'hotmart_client_secret'
        )
    );

-- Uma única allowlist negativa protege tudo que passou a ser gerenciado pelas
-- rotas staff. A função evita que as quatro policies e a RPC tenham listas
-- divergentes; ela não expõe valores, apenas classifica o nome da chave.
CREATE OR REPLACE FUNCTION public.site_config_key_is_server_managed(p_key text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = pg_catalog
AS $$
    SELECT COALESCE(p_key, '') = ANY (ARRAY[
        'automation_whatsapp_instance',
        'saldo_reminders_enabled',
        'saldo_reminders_scope',
        'asaas_api_key',
        'stripe_api_key_live',
        'stripe_api_key_test',
        'stripe_mode',
        'stripe_api_key',
        'mercadopago_access_token',
        'checkout_direto_habilitado',
        'google_oauth_client_id',
        'google_oauth_client_secret',
        'ga4_property_id',
        'kiwify_client_id',
        'kiwify_client_secret',
        'kiwify_account_id',
        'affiliates_drive_url',
        'brevo_enabled',
        'brevo_smtp_host',
        'brevo_smtp_port',
        'brevo_smtp_login',
        'brevo_smtp_key',
        'brevo_sender_email',
        'brevo_sender_name',
        'whatsapp_cloud_phone_number_id',
        'whatsapp_cloud_waba_id',
        'whatsapp_cloud_app_id',
        'whatsapp_cloud_app_secret',
        'whatsapp_cloud_access_token',
        'whatsapp_cloud_api_version',
        'whatsapp_cloud_webhook_verify_token',
        'whatsapp_cloud_display_number',
        'wa_engine_course_sales',
        'wa_engine_billing',
        'wa_engine_schedule',
        'wa_engine_report',
        'wa_enabled_billing',
        'wa_enabled_schedule',
        'wa_enabled_report',
        'wa_instance_course_sales',
        'wa_instance_billing',
        'wa_instance_schedule',
        'wa_instance_report',
        'wa_instance_campaign',
        'wa_instance_crm',
        'wa_instance_recovery',
        'ai_group_bot_instance',
        'wa_report_enabled',
        'wa_report_group_jid',
        'wa_report_group_name',
        'evolution_managed_instances',
        'ai_group_bot_enabled',
        'ai_group_bot_group_jid',
        'ai_group_bot_group_name',
        'ai_agent_prompt_sofia',
        'ai_agent_prompt_bia',
        'ai_agent_prompt_rita',
        'ai_agent_prompt_leo',
        'ai_group_webhook_token',
        'hotmart_checkout_url',
        'hotmart_product_id',
        'hotmart_webhook_token',
        'hotmart_client_id',
        'hotmart_client_secret',
        'evolution_api_url',
        'evolution_api_key',
        'evolution_instance_name',
        'wa_instance_curso_online',
        'wa_automation_enabled',
        'wa_enabled_course_sales',
        'wa_atendentes_webhook_token'
    ]::text[]);
$$;

REVOKE ALL ON FUNCTION public.site_config_key_is_server_managed(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.site_config_key_is_server_managed(text)
    TO anon, authenticated, service_role;

-- Defesa em profundidade para acessos diretos a SITE_Config. Leitura de
-- configurações públicas continua possível, mas toda escrita operacional deve
-- passar por uma rota staff autenticada e por uma allowlist específica.
DROP POLICY IF EXISTS "deny_client_insert_hotmart_config" ON public."SITE_Config";
DROP POLICY IF EXISTS "deny_client_insert_course_automation_config" ON public."SITE_Config";
CREATE POLICY "deny_client_insert_course_automation_config" ON public."SITE_Config"
    AS RESTRICTIVE
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (NOT public.site_config_key_is_server_managed(key));

DROP POLICY IF EXISTS "deny_client_update_hotmart_config" ON public."SITE_Config";
DROP POLICY IF EXISTS "deny_client_update_course_automation_config" ON public."SITE_Config";
CREATE POLICY "deny_client_update_course_automation_config" ON public."SITE_Config"
    AS RESTRICTIVE
    FOR UPDATE
    TO anon, authenticated
    USING (NOT public.site_config_key_is_server_managed(key))
    WITH CHECK (NOT public.site_config_key_is_server_managed(key));

DROP POLICY IF EXISTS "deny_client_delete_hotmart_config" ON public."SITE_Config";
DROP POLICY IF EXISTS "deny_client_delete_course_automation_config" ON public."SITE_Config";
CREATE POLICY "deny_client_delete_course_automation_config" ON public."SITE_Config"
    AS RESTRICTIVE
    FOR DELETE
    TO anon, authenticated
    USING (NOT public.site_config_key_is_server_managed(key));

-- A RPC legada e SECURITY DEFINER; por isso RLS nao basta. Ela permanece
-- restrita ao service_role e rejeita o lote inteiro quando recebe uma chave
-- protegida, mantendo as gravacoes sensiveis nos endpoints dedicados.
CREATE OR REPLACE FUNCTION public.upsert_site_config(entries jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    protected_keys text[];
BEGIN
    SELECT array_agg(DISTINCT item->>'key' ORDER BY item->>'key')
    INTO protected_keys
    FROM jsonb_array_elements(COALESCE(entries, '[]'::jsonb)) AS item
    WHERE public.site_config_key_is_server_managed(item->>'key');

    IF protected_keys IS NOT NULL THEN
        RAISE EXCEPTION 'Chave protegida nao pode ser gravada por aqui: %.',
            array_to_string(protected_keys, ', ')
            USING ERRCODE = '42501';
    END IF;

    INSERT INTO public."SITE_Config" (key, value)
    SELECT item->>'key', item->>'value'
    FROM jsonb_array_elements(COALESCE(entries, '[]'::jsonb)) AS item
    WHERE COALESCE(item->>'key', '') <> ''
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_site_config(jsonb)
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_site_config(jsonb) TO service_role;

-- SITE_UserIntegrations contem credenciais de provedores por usuario. Em
-- instalacoes que possuem essa tabela, todo acesso direto fica restrito ao
-- backend service_role; ambientes sem a tabela continuam aplicando a migration.
DO $$
DECLARE
    existing_policy record;
BEGIN
    IF to_regclass('public."SITE_UserIntegrations"') IS NOT NULL THEN
        ALTER TABLE public."SITE_UserIntegrations" ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public."SITE_UserIntegrations" FORCE ROW LEVEL SECURITY;

        REVOKE ALL ON TABLE public."SITE_UserIntegrations"
            FROM PUBLIC, anon, authenticated;
        GRANT SELECT, INSERT, UPDATE, DELETE
            ON TABLE public."SITE_UserIntegrations"
            TO service_role;

        FOR existing_policy IN
            SELECT policyname
            FROM pg_policies
            WHERE schemaname = 'public'
              AND tablename = 'SITE_UserIntegrations'
        LOOP
            EXECUTE format(
                'DROP POLICY IF EXISTS %I ON public."SITE_UserIntegrations"',
                existing_policy.policyname
            );
        END LOOP;

        CREATE POLICY "site_user_integrations_service_only"
            ON public."SITE_UserIntegrations"
            FOR ALL
            TO service_role
            USING (true)
            WITH CHECK (true);
    END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS public."SITE_Hotmart_Webhook_Events" (
    event_id text,
    event_type text NOT NULL,
    transaction_ref_hash text,
    product_id text,
    lease_id uuid NOT NULL DEFAULT gen_random_uuid(),
    status text NOT NULL DEFAULT 'processing',
    attempt_count integer NOT NULL DEFAULT 1,
    last_error text,
    provider_message_id text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    processed_at timestamptz
);

-- Mantem a migration segura para ambientes em que a tabela tenha sido criada
-- por uma tentativa anterior desta entrega. Todas as colunas sao declaradas
-- novamente para convergir tabelas parciais sem depender da ordem das tentativas.
ALTER TABLE public."SITE_Hotmart_Webhook_Events"
    ADD COLUMN IF NOT EXISTS event_id text,
    ADD COLUMN IF NOT EXISTS event_type text,
    ADD COLUMN IF NOT EXISTS transaction_ref_hash text,
    ADD COLUMN IF NOT EXISTS product_id text,
    ADD COLUMN IF NOT EXISTS lease_id uuid,
    ADD COLUMN IF NOT EXISTS status text,
    ADD COLUMN IF NOT EXISTS attempt_count integer,
    ADD COLUMN IF NOT EXISTS last_error text,
    ADD COLUMN IF NOT EXISTS provider_message_id text,
    ADD COLUMN IF NOT EXISTS created_at timestamptz,
    ADD COLUMN IF NOT EXISTS updated_at timestamptz,
    ADD COLUMN IF NOT EXISTS processed_at timestamptz;

-- Nao preserva o identificador de transacao cru. O servidor grava somente uma
-- referencia pseudonimizada com HMAC em transaction_ref_hash.
DROP INDEX IF EXISTS public.idx_site_hotmart_events_transaction;
ALTER TABLE public."SITE_Hotmart_Webhook_Events"
    DROP COLUMN IF EXISTS transaction_id;

-- A constraint da versao anterior ainda aceita "sent" e rejeita o novo
-- "submitted"; remova-a antes de converter as linhas legadas.
ALTER TABLE public."SITE_Hotmart_Webhook_Events"
    DROP CONSTRAINT IF EXISTS site_hotmart_event_status_check;

-- Backfills precedem defaults, NOT NULL e constraints para que a migration
-- tambem seja segura sobre uma tabela parcial com linhas legadas.
UPDATE public."SITE_Hotmart_Webhook_Events"
SET event_id = gen_random_uuid()::text
WHERE event_id IS NULL OR btrim(event_id) = '';

WITH duplicate_event_ids AS (
    SELECT
        ctid,
        row_number() OVER (PARTITION BY event_id ORDER BY ctid) AS occurrence
    FROM public."SITE_Hotmart_Webhook_Events"
)
UPDATE public."SITE_Hotmart_Webhook_Events" AS event
SET event_id = gen_random_uuid()::text
FROM duplicate_event_ids AS duplicate
WHERE event.ctid = duplicate.ctid
  AND duplicate.occurrence > 1;

UPDATE public."SITE_Hotmart_Webhook_Events"
SET event_type = 'UNKNOWN'
WHERE event_type IS NULL OR btrim(event_type) = '';

UPDATE public."SITE_Hotmart_Webhook_Events"
SET lease_id = gen_random_uuid()
WHERE lease_id IS NULL;

UPDATE public."SITE_Hotmart_Webhook_Events"
SET status = 'submitted'
WHERE status = 'sent';

UPDATE public."SITE_Hotmart_Webhook_Events"
SET status = 'processing'
WHERE status IS NULL OR btrim(status) = '';

UPDATE public."SITE_Hotmart_Webhook_Events"
SET
    last_error = COALESCE(last_error, 'legacy_invalid_status:' || status),
    status = 'failed'
WHERE status NOT IN (
    'processing',
    'sending',
    'submitted',
    'failed',
    'delivery_unknown',
    'ignored'
);

UPDATE public."SITE_Hotmart_Webhook_Events"
SET attempt_count = 1
WHERE attempt_count IS NULL OR attempt_count <= 0;

UPDATE public."SITE_Hotmart_Webhook_Events"
SET created_at = now()
WHERE created_at IS NULL;

UPDATE public."SITE_Hotmart_Webhook_Events"
SET updated_at = COALESCE(created_at, now())
WHERE updated_at IS NULL;

ALTER TABLE public."SITE_Hotmart_Webhook_Events"
    ALTER COLUMN event_id SET NOT NULL,
    ALTER COLUMN event_type SET NOT NULL,
    ALTER COLUMN lease_id SET DEFAULT gen_random_uuid(),
    ALTER COLUMN lease_id SET NOT NULL,
    ALTER COLUMN status SET DEFAULT 'processing',
    ALTER COLUMN status SET NOT NULL,
    ALTER COLUMN attempt_count SET DEFAULT 1,
    ALTER COLUMN attempt_count SET NOT NULL,
    ALTER COLUMN created_at SET DEFAULT now(),
    ALTER COLUMN created_at SET NOT NULL,
    ALTER COLUMN updated_at SET DEFAULT now(),
    ALTER COLUMN updated_at SET NOT NULL;

-- Garante uma chave unica para o ON CONFLICT(event_id), preservando um PK
-- legado valido quando ele ja existir.
DO $$
DECLARE
    event_id_attnum smallint;
    has_event_id_key boolean;
    has_primary_key boolean;
BEGIN
    SELECT attnum
    INTO event_id_attnum
    FROM pg_attribute
    WHERE attrelid = 'public."SITE_Hotmart_Webhook_Events"'::regclass
      AND attname = 'event_id'
      AND NOT attisdropped;

    SELECT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'public."SITE_Hotmart_Webhook_Events"'::regclass
          AND contype IN ('p', 'u')
          AND conkey = ARRAY[event_id_attnum]::smallint[]
    )
    INTO has_event_id_key;

    SELECT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'public."SITE_Hotmart_Webhook_Events"'::regclass
          AND contype = 'p'
    )
    INTO has_primary_key;

    IF NOT has_event_id_key AND NOT has_primary_key THEN
        ALTER TABLE public."SITE_Hotmart_Webhook_Events"
            ADD CONSTRAINT site_hotmart_events_pkey PRIMARY KEY (event_id);
    ELSIF NOT has_event_id_key THEN
        ALTER TABLE public."SITE_Hotmart_Webhook_Events"
            ADD CONSTRAINT site_hotmart_event_id_key UNIQUE (event_id);
    END IF;
END;
$$;

ALTER TABLE public."SITE_Hotmart_Webhook_Events"
    DROP CONSTRAINT IF EXISTS site_hotmart_event_id_not_blank,
    DROP CONSTRAINT IF EXISTS site_hotmart_event_type_not_blank;
ALTER TABLE public."SITE_Hotmart_Webhook_Events"
    DROP CONSTRAINT IF EXISTS site_hotmart_attempt_count_check;
ALTER TABLE public."SITE_Hotmart_Webhook_Events"
    ADD CONSTRAINT site_hotmart_event_id_not_blank
        CHECK (btrim(event_id) <> ''),
    ADD CONSTRAINT site_hotmart_event_type_not_blank
        CHECK (btrim(event_type) <> ''),
    ADD CONSTRAINT site_hotmart_event_status_check
        CHECK (status IN (
            'processing',
            'sending',
            'submitted',
            'failed',
            'delivery_unknown',
            'ignored'
        )),
    ADD CONSTRAINT site_hotmart_attempt_count_check
        CHECK (attempt_count > 0);

CREATE INDEX IF NOT EXISTS idx_site_hotmart_events_transaction_ref_hash
    ON public."SITE_Hotmart_Webhook_Events" (transaction_ref_hash);

CREATE INDEX IF NOT EXISTS idx_site_hotmart_events_status_updated
    ON public."SITE_Hotmart_Webhook_Events" (status, updated_at);

CREATE INDEX IF NOT EXISTS idx_site_hotmart_events_created_at
    ON public."SITE_Hotmart_Webhook_Events" (created_at);

ALTER TABLE public."SITE_Hotmart_Webhook_Events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."SITE_Hotmart_Webhook_Events" FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."SITE_Hotmart_Webhook_Events"
    FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public."SITE_Hotmart_Webhook_Events"
    TO service_role;

-- Remove qualquer policy deixada por uma tentativa parcial; esta tabela
-- dedicada deve possuir exclusivamente a policy do backend service_role.
DO $$
DECLARE
    existing_policy record;
BEGIN
    FOR existing_policy IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'SITE_Hotmart_Webhook_Events'
    LOOP
        EXECUTE format(
            'DROP POLICY IF EXISTS %I ON public."SITE_Hotmart_Webhook_Events"',
            existing_policy.policyname
        );
    END LOOP;
END;
$$;

CREATE POLICY "site_hotmart_events_service_only"
    ON public."SITE_Hotmart_Webhook_Events"
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

NOTIFY pgrst, 'reload schema';

COMMIT;

-- Verificacao apos aplicar:
--   1. anon nao le Hotmart, Evolution ou wa_atendentes_webhook_token;
--   2. anon nao grava nenhuma chave hotmart_* protegida, nem pela RPC;
--   3. SITE_UserIntegrations, quando existir, aceita somente service_role;
--   4. service_role consegue gravar config e eventos normalmente.
