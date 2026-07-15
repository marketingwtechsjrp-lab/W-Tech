-- ============================================================================
-- 2026-07-15 · Destrava o "Salvar" da config do admin (SITE_Config)
-- ----------------------------------------------------------------------------
-- SINTOMA (desde 04/07/2026, notado em 15/07)
--   Admin → Configurações → Salvar dispara:
--     "Erro ao salvar: new row violates row-level security policy
--      'deny_anon_read_server_secrets' for table 'SITE_Config'"
--
-- CAUSA RAIZ (confirmada empiricamente em 15/07 com testes A/B/C via REST)
--   A policy RESTRICTIVE FOR SELECT (migração 2026-07-04) está correta e igual
--   ao repositório. O problema é um comportamento documentado do Postgres:
--   INSERT ... ON CONFLICT DO UPDATE SET col = EXCLUDED.col  (o upsert do
--   supabase-js) LÊ colunas da tabela (EXCLUDED.*), o que exige privilégio de
--   SELECT — então as policies de SELECT são aplicadas à linha do caminho de
--   UPDATE. Como as 13 chaves secretas são invisíveis para `anon`, o upsert
--   delas falha com 42501 nomeando a policy de leitura. Provas:
--     A) INSERT puro da chave secreta → 23505 duplicate (RLS não barra INSERT)
--     B) UPSERT de chave não-secreta   → OK
--     C) UPSERT de chave secreta       → 42501 nomeando a policy de SELECT
--
-- CORREÇÃO
--   O plano de 04/07 dizia "Não mexe em INSERT/UPDATE (admin continua salvando
--   config normalmente)" — esta função restaura exatamente isso: uma RPC
--   SECURITY DEFINER (roda como owner, ignora RLS) usada SÓ para gravar.
--   A leitura anônima dos segredos CONTINUA bloqueada pela policy.
--   O cliente (lib/siteConfig.ts) chama supabase.rpc('upsert_site_config').
--
-- ROLLBACK
--   DROP FUNCTION public.upsert_site_config(jsonb);
--
-- RISCO RESIDUAL (igual ao anterior a 04/07, deliberado)
--   Qualquer portador da anon key pode ESCREVER config (antes já podia, via
--   policy permissiva da tabela). Proteção real de escrita = mover o save para
--   o servidor (service_role atrás do login) — pendente do "Lote 2".
-- ============================================================================

-- (Referência) Policy de leitura vigente — já aplicada, mantida como está:
--   CREATE POLICY "deny_anon_read_server_secrets" ON "SITE_Config"
--       AS RESTRICTIVE FOR SELECT TO anon
--       USING (key NOT IN ('stripe_api_key','stripe_api_key_live',
--         'stripe_api_key_test','mercadopago_access_token',
--         'whatsapp_cloud_app_secret','whatsapp_cloud_access_token',
--         'whatsapp_cloud_webhook_verify_token','brevo_smtp_key',
--         'brevo_smtp_login','evolution_api_key','kiwify_client_secret',
--         'kiwify_client_id','ai_group_webhook_token'));

CREATE OR REPLACE FUNCTION public.upsert_site_config(entries jsonb)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    INSERT INTO "SITE_Config" (key, value)
    SELECT e->>'key', e->>'value'
    FROM jsonb_array_elements(entries) AS e
    WHERE COALESCE(e->>'key', '') <> ''
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
$$;

REVOKE ALL ON FUNCTION public.upsert_site_config(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_site_config(jsonb) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
