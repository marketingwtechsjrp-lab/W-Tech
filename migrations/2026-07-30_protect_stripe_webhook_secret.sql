-- ============================================================================
-- 2026-07-30 · Segredo do webhook do Stripe na SITE_Config (protegido)
-- ----------------------------------------------------------------------------
-- CONTEXTO
--   Depois da migração Vercel → VPS, o webhook do Stripe passou a responder
--   HTTP 500 "System configuration error" em 100% das entregas: o segredo de
--   assinatura (whsec_...) vivia como env na Supabase Edge Function e nunca foi
--   recriado no VPS. Sem ele o handler não valida a assinatura HMAC, o
--   SITE_Enrollments.amount_paid nunca é atualizado e a tela de sucesso mostra
--   "€ 0.00 · Aguardando confirmação final da rede bancária".
--
-- POR QUE NO BANCO E NÃO SÓ NO .env
--   O .env está no .dockerignore — nunca entra na imagem. Guardar o segredo
--   aqui permite configurar o webhook SEM acesso ao shell do VPS, pelo mesmo
--   caminho que a chave da API do Stripe já usa (server lê com service_role).
--   O .env continua tendo prioridade quando existir (ver loadStripeCreds()).
--
-- ⚠️ ORDEM IMPORTA
--   O passo 1 (policy) vem ANTES do passo 2 (valor). Se o segredo for gravado
--   com a policy antiga, ele fica LEGÍVEL por qualquer portador da anon key —
--   que é pública, vai no bundle JS — e quem o tiver pode FORJAR eventos de
--   pagamento e marcar inscrições como pagas sem pagar. Rode o arquivo inteiro
--   de uma vez no SQL Editor do Supabase.
--
-- ROLLBACK
--   DELETE FROM "SITE_Config" WHERE key = 'stripe_webhook_secret';
--   (e recriar a policy sem a chave, como estava em 2026-07-04)
-- ============================================================================

-- ── 1. Bloqueia a leitura anônima do novo segredo ───────────────────────────
-- Mesma policy de 2026-07-04, agora com 'stripe_webhook_secret' na lista.
DROP POLICY IF EXISTS "deny_anon_read_server_secrets" ON "SITE_Config";

CREATE POLICY "deny_anon_read_server_secrets" ON "SITE_Config"
    AS RESTRICTIVE
    FOR SELECT
    TO anon
    USING (
        key NOT IN (
            -- Pagamentos (usados só via /api no servidor)
            'stripe_api_key',
            'stripe_api_key_live',
            'stripe_api_key_test',
            'stripe_webhook_secret',   -- ← NOVO
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

-- ── 2. Grava o segredo ──────────────────────────────────────────────────────
-- Troque COLE_AQUI_O_WHSEC pelo valor do dashboard do Stripe:
--   Workbench → Webhooks → destino "webhook-stripe" → Segredo da assinatura
--   (botão do olho para revelar). Formato: whsec_...
-- O valor NÃO fica versionado neste arquivo de propósito.
INSERT INTO "SITE_Config" (key, value)
VALUES ('stripe_webhook_secret', 'COLE_AQUI_O_WHSEC')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- ── 3. Verificação ──────────────────────────────────────────────────────────
-- Deve retornar 1 linha com o valor começando em "whsec_":
--   SELECT key, left(value, 6) || '...' AS preview
--   FROM "SITE_Config" WHERE key = 'stripe_webhook_secret';
--
-- E, como anon (REST com a anon key), a MESMA consulta deve retornar 0 linhas.
--
-- Depois, no navegador:
--   curl -s https://w-techbrasil.com.br/api/stripe-webhook
--   → {"config":{"stripe_key":true,"webhook_secret":true,"supabase":true}}
