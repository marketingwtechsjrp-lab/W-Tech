-- SCRIPT DE DESBLOQUEIO TOTAL - MARKETING LISTS
-- Execute este script no SQL Editor do Supabase para resolver o erro "permission denied for table users"

-- 1. Desativar RLS temporariamente para garantir o funcionamento
ALTER TABLE "SITE_MarketingLists" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "SITE_MarketingListMembers" DISABLE ROW LEVEL SECURITY;

-- 2. Garantir que os papéis do banco tenham acesso à tabela
GRANT ALL ON "SITE_MarketingLists" TO authenticated;
GRANT ALL ON "SITE_MarketingLists" TO anon;
GRANT ALL ON "SITE_MarketingLists" TO service_role;

GRANT ALL ON "SITE_MarketingListMembers" TO authenticated;
GRANT ALL ON "SITE_MarketingListMembers" TO anon;
GRANT ALL ON "SITE_MarketingListMembers" TO service_role;

-- 3. Remover qualquer vínculo restritivo com a tabela interna 'auth.users'
-- Isso é o que geralmente causa o erro "permission denied"
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = '"SITE_MarketingLists"'::regclass 
        AND confrelid = 'auth.users'::regclass
    ) LOOP
        EXECUTE 'ALTER TABLE "SITE_MarketingLists" DROP CONSTRAINT ' || quote_ident(r.conname);
    END LOOP;
END $$;

-- 4. Criar o vínculo correto com a tabela pública SITE_Users
DO $$ 
BEGIN
    -- Tenta adicionar a FK para SITE_Users, se falhar (ex: já existe), ignora.
    BEGIN
        ALTER TABLE "SITE_MarketingLists" 
        ADD CONSTRAINT "SITE_MarketingLists_owner_site_fk" 
        FOREIGN KEY ("owner_id") REFERENCES "SITE_Users"("id") ON DELETE SET NULL;
    EXCEPTION
        WHEN others THEN NULL;
    END;
END $$;

-- 5. Se desejar reativar o RLS de forma simplificada depois:
-- ALTER TABLE "SITE_MarketingLists" ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Acesso Total Autenticado" ON "SITE_MarketingLists" FOR ALL TO authenticated USING (true);
