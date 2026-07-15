-- ============================================================================
-- 2026-07-15 · Tira SÓ a evolution_api_key do bloqueio de leitura anônima
-- ----------------------------------------------------------------------------
-- MOTIVO
--   O lock de 04/07 incluiu 'evolution_api_key' na lista de segredos com
--   leitura anônima negada — CONTRARIANDO o próprio plano daquela entrega
--   (comentário em lib/whatsapp.ts: "NÃO aplicar o lock de RLS sobre
--   evolution_api_key (senão a conexão/QR do admin quebra). Ver plano, Fase 3").
--   Consequências observadas (04→15/07): campo GLOBAL API KEY carrega vazio,
--   QR/status/teste de instâncias falham após F5, TypeError 'trim' no console
--   (lib/whatsapp.ts lia a chave sem fallback).
--
-- O QUE FAZ
--   Recria a policy com a MESMA lista de 04/07, menos 'evolution_api_key'.
--   As outras 12 chaves continuam com leitura anônima bloqueada.
--
-- TRADE-OFF (deliberado, igual ao pré-04/07)
--   A chave da Evolution volta a ser legível por qualquer portador da anon key.
--   Proteção real = mover os fluxos de instância/QR do admin para o servidor
--   (Fase 3 / Lote 2). Manter lib/siteConfig.ts (SECRET_CONFIG_KEYS) em sincronia.
--
-- ROLLBACK: reaplicar migrations/2026-07-04_lock_site_config_secrets.sql
-- ============================================================================

DROP POLICY IF EXISTS "deny_anon_read_server_secrets" ON "SITE_Config";

CREATE POLICY "deny_anon_read_server_secrets" ON "SITE_Config"
    AS RESTRICTIVE
    FOR SELECT
    TO anon
    USING (
        key NOT IN (
            'stripe_api_key',
            'stripe_api_key_live',
            'stripe_api_key_test',
            'mercadopago_access_token',
            'whatsapp_cloud_app_secret',
            'whatsapp_cloud_access_token',
            'whatsapp_cloud_webhook_verify_token',
            'brevo_smtp_key',
            'brevo_smtp_login',
            'kiwify_client_secret',
            'kiwify_client_id',
            'ai_group_webhook_token'
        )
    );
