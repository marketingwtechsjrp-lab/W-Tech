-- ============================================================================
-- 2026-07-04 · Fecha a leitura ANÔNIMA dos segredos em SITE_Config
-- ----------------------------------------------------------------------------
-- CONTEXTO
--   Hoje SITE_Config tem RLS permissiva (USING(true)) e é lida com a anon key
--   direto do navegador. Prova empírica (04/07/2026): a anon key lê os VALORES
--   de stripe_api_key_live, mercadopago_access_token, etc.
--
-- ESTRATÉGIA (zero downtime)
--   Em vez de remover a política permissiva existente (o que exigiria mapear
--   todas as leituras públicas), adicionamos UMA política RESTRICTIVE só para o
--   papel `anon` no SELECT. No Postgres, políticas RESTRICTIVE são AND-adas ao
--   resultado das permissivas: o anon continua lendo tudo que já lia, MENOS as
--   chaves de segredo listadas abaixo. Não mexe em INSERT/UPDATE (admin continua
--   salvando config normalmente).
--
-- ORDEM DE EXECUÇÃO (importante)
--   1. Fazer o DEPLOY do código que move o Stripe para o servidor
--      (api/create-stripe-checkout.ts + lib/stripe.ts) — já feito nesta entrega.
--   2. Confirmar que o checkout gera pagamento normalmente em produção.
--   3. SÓ ENTÃO rodar este SQL no Supabase (SQL Editor).
--
-- ESTE LOTE só bloqueia segredos CONSUMIDOS PELO SERVIDOR (as funções /api usam
-- service_role e IGNORAM RLS, então nada quebra). Asaas e Google OAuth são lidos
-- por telas de ADMIN no cliente — ficam para o Lote 2, depois de movê-los ao
-- servidor (ver migração seguinte). Rotacione TODAS as chaves de qualquer forma.
-- ============================================================================

ALTER TABLE "SITE_Config" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "deny_anon_read_server_secrets" ON "SITE_Config";

CREATE POLICY "deny_anon_read_server_secrets" ON "SITE_Config"
    AS RESTRICTIVE
    FOR SELECT
    TO anon
    USING (
        key NOT IN (
            -- Pagamentos (agora usados só via /api no servidor)
            'stripe_api_key',
            'stripe_api_key_live',
            'stripe_api_key_test',
            'mercadopago_access_token',
            -- Mensageria / e-mail (usados só no servidor)
            'whatsapp_cloud_app_secret',
            'whatsapp_cloud_access_token',
            'whatsapp_cloud_webhook_verify_token',
            'brevo_smtp_key',
            'brevo_smtp_login',
            'evolution_api_key',
            -- Afiliados / bots (usados só no servidor)
            'kiwify_client_secret',
            'kiwify_client_id',
            'ai_group_webhook_token'
        )
    );

-- ----------------------------------------------------------------------------
-- VERIFICAÇÃO (rode como anon, ex.: via REST com a anon key)
--   SELECT key, value FROM "SITE_Config" WHERE key = 'stripe_api_key_live';
--   -> deve voltar VAZIO após aplicar esta política.
-- ROLLBACK, se necessário:
--   DROP POLICY "deny_anon_read_server_secrets" ON "SITE_Config";
-- ============================================================================
