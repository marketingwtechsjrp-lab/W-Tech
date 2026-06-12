-- Migration: Integração Brevo (e-mail) + extensão de logs
-- Date: 2026-06-11
-- Rodar no SQL Editor do Supabase. Idempotente.

-- 1. Chaves de configuração do Brevo em SITE_Config (segredos, lidos no servidor)
INSERT INTO "SITE_Config" (key, value) VALUES
    ('brevo_enabled',      'false'),
    ('brevo_smtp_host',    'smtp-relay.brevo.com'),
    ('brevo_smtp_port',    '587'),
    ('brevo_smtp_login',   ''),
    ('brevo_smtp_key',     ''),
    ('brevo_sender_email', ''),
    ('brevo_sender_name',  'W-Tech Brasil')
ON CONFLICT (key) DO NOTHING;

-- 2. Extensão da tabela de logs de e-mail (para transacional + fluxos)
ALTER TABLE "SITE_EmailLogs" ADD COLUMN IF NOT EXISTS "type" TEXT;          -- ex: 'confirmacao_inscricao', 'flow', 'test'
ALTER TABLE "SITE_EmailLogs" ADD COLUMN IF NOT EXISTS "subject" TEXT;
ALTER TABLE "SITE_EmailLogs" ADD COLUMN IF NOT EXISTS "enrollment_id" UUID; -- vínculo opcional com a inscrição

-- Índice para checagem de idempotência (não reenviar confirmação)
CREATE INDEX IF NOT EXISTS idx_emaillogs_enrollment_type
    ON "SITE_EmailLogs" ("enrollment_id", "type");

-- 3. Recarrega o cache de schema do PostgREST (senão writes nas novas colunas falham)
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';
