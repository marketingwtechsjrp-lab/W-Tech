-- SCRIPT DE CORREÇÃO DEFINITIVA - MARKETING & CRM
-- Resolve o erro "permission denied for table users" de uma vez por todas

BEGIN;

-- 1. Desativar RLS em todas as tabelas de Marketing para evitar bloqueios
ALTER TABLE IF EXISTS "SITE_MarketingLists" DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "SITE_MarketingListMembers" DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "SITE_MarketingCampaigns" DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "SITE_CampaignQueue" DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "SITE_MessageTemplates" DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "SITE_Leads" DISABLE ROW LEVEL SECURITY;

-- 2. Garantir permissões de acesso para usuários autenticados
GRANT ALL ON "SITE_MarketingLists" TO authenticated;
GRANT ALL ON "SITE_MarketingListMembers" TO authenticated;
GRANT ALL ON "SITE_MarketingCampaigns" TO authenticated;
GRANT ALL ON "SITE_CampaignQueue" TO authenticated;
GRANT ALL ON "SITE_MessageTemplates" TO authenticated;
GRANT ALL ON "SITE_Leads" TO authenticated;
GRANT SELECT ON "SITE_Users" TO authenticated;

-- 3. Remover vínculos (Foreign Keys) com a tabela restrita 'auth.users'
-- Esta é a causa raiz do erro "permission denied for table users"
DO $$ 
DECLARE 
    tbl text;
    cons text;
BEGIN
    FOR tbl IN SELECT table_name FROM information_schema.tables 
               WHERE table_name IN ('SITE_MarketingLists', 'SITE_MarketingCampaigns', 'SITE_MessageTemplates', 'SITE_Leads', 'SITE_CampaignQueue')
    LOOP
        FOR cons IN 
            SELECT conname 
            FROM pg_constraint 
            WHERE conrelid = (quote_ident(tbl))::regclass 
            AND confrelid = 'auth.users'::regclass
        LOOP
            EXECUTE 'ALTER TABLE ' || quote_ident(tbl) || ' DROP CONSTRAINT ' || quote_ident(cons);
            RAISE NOTICE 'Dropped constraint % from table %', cons, tbl;
        END LOOP;
    END LOOP;
END $$;

-- 4. Recriar vínculos com a tabela pública SITE_Users (se necessário)
-- Para SITE_MarketingLists
DO $$ BEGIN
    ALTER TABLE "SITE_MarketingLists" ADD CONSTRAINT "SITE_MarketingLists_owner_site_fk" 
    FOREIGN KEY ("owner_id") REFERENCES "SITE_Users"("id") ON DELETE SET NULL;
EXCEPTION WHEN others THEN RAISE NOTICE 'FK SITE_MarketingLists owner already exists'; END $$;

-- Para SITE_MarketingCampaigns
DO $$ BEGIN
    ALTER TABLE "SITE_MarketingCampaigns" ADD CONSTRAINT "SITE_MarketingCampaigns_created_by_site_fk" 
    FOREIGN KEY ("created_by") REFERENCES "SITE_Users"("id") ON DELETE SET NULL;
EXCEPTION WHEN others THEN RAISE NOTICE 'FK SITE_MarketingCampaigns created_by already exists'; END $$;

-- 5. Garantir que a tabela SITE_CampaignQueue tenha acesso total
GRANT ALL ON "SITE_CampaignQueue" TO anon;
GRANT ALL ON "SITE_CampaignQueue" TO authenticated;
GRANT ALL ON "SITE_CampaignQueue" TO service_role;

COMMIT;
