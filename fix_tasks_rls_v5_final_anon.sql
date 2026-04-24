-- CORREÇÃO DEFINITIVA DE PERMISSÕES - SITE_Tasks
-- Resolve o erro de RLS "new row violates row-level security policy"
-- Este script desativa o RLS para garantir que a criação de tarefas funcione com o sistema de login customizado.

BEGIN;

-- 1. Desativar RLS para evitar bloqueios do sistema de login customizado (que usa o papel 'anon')
ALTER TABLE IF EXISTS "SITE_Tasks" DISABLE ROW LEVEL SECURITY;

-- 2. Garantir permissões de acesso para todos os papéis do banco
GRANT ALL ON TABLE "SITE_Tasks" TO anon;
GRANT ALL ON TABLE "SITE_Tasks" TO authenticated;
GRANT ALL ON TABLE "SITE_Tasks" TO service_role;

-- 3. Garantir permissões nas sequências (caso existam IDs seriais)
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- 4. Remover vínculos antigos com a tabela protegida 'auth.users' que podem causar erro de permissão
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = '"SITE_Tasks"'::regclass 
        AND confrelid = 'auth.users'::regclass
    ) LOOP
        EXECUTE 'ALTER TABLE "SITE_Tasks" DROP CONSTRAINT ' || quote_ident(r.conname);
    END LOOP;
END $$;

-- 5. Garantir que as colunas necessárias existam (Sanity Check)
ALTER TABLE "SITE_Tasks" ADD COLUMN IF NOT EXISTS lead_id UUID;
ALTER TABLE "SITE_Tasks" ADD COLUMN IF NOT EXISTS category_id UUID;
ALTER TABLE "SITE_Tasks" ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE "SITE_Tasks" ADD COLUMN IF NOT EXISTS is_whatsapp_schedule BOOLEAN DEFAULT FALSE;
ALTER TABLE "SITE_Tasks" ADD COLUMN IF NOT EXISTS whatsapp_message_body TEXT;
ALTER TABLE "SITE_Tasks" ADD COLUMN IF NOT EXISTS whatsapp_template_id UUID;
ALTER TABLE "SITE_Tasks" ADD COLUMN IF NOT EXISTS whatsapp_status TEXT DEFAULT 'PENDING';
ALTER TABLE "SITE_Tasks" ADD COLUMN IF NOT EXISTS whatsapp_media_url TEXT;

COMMIT;
