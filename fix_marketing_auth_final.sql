-- SCRIPT DE CORREÇÃO FINAL DE PERMISSÕES - MARKETING & CRM
-- Execute este script no SQL Editor do Supabase

-- 1. Desativar RLS temporariamente para as tabelas críticas
ALTER TABLE "SITE_MarketingCampaigns" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "SITE_MessageTemplates" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "SITE_MarketingLists" DISABLE ROW LEVEL SECURITY;

-- 2. Garantir permissões de SELECT na tabela SITE_Users
GRANT SELECT ON "SITE_Users" TO authenticated;
GRANT SELECT ON "SITE_Users" TO anon;

-- 3. Remover constraints que apontam para auth.users (Tabela Privada)
DO $$ 
DECLARE 
    tbl text;
    cons text;
BEGIN
    FOR tbl IN SELECT table_name FROM information_schema.tables WHERE table_name IN ('SITE_MarketingCampaigns', 'SITE_MessageTemplates', 'SITE_MarketingLists', 'SITE_Leads')
    LOOP
        FOR cons IN 
            SELECT conname 
            FROM pg_constraint 
            WHERE conrelid = (quote_ident(tbl))::regclass 
            AND confrelid = 'auth.users'::regclass
        LOOP
            EXECUTE 'ALTER TABLE ' || quote_ident(tbl) || ' DROP CONSTRAINT ' || quote_ident(cons);
        END LOOP;
    END LOOP;
END $$;

-- 4. Recriar vínculos corretos com SITE_Users (Tabela Pública)
DO $$ BEGIN
    ALTER TABLE "SITE_MarketingCampaigns" ADD CONSTRAINT "SITE_MarketingCampaigns_created_by_site_fk" 
    FOREIGN KEY ("created_by") REFERENCES "SITE_Users"("id") ON DELETE SET NULL;
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "SITE_MessageTemplates" ADD CONSTRAINT "SITE_MessageTemplates_created_by_site_fk" 
    FOREIGN KEY ("created_by") REFERENCES "SITE_Users"("id") ON DELETE SET NULL;
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "SITE_MarketingLists" ADD CONSTRAINT "SITE_MarketingLists_owner_id_site_fk" 
    FOREIGN KEY ("owner_id") REFERENCES "SITE_Users"("id") ON DELETE SET NULL;
EXCEPTION WHEN others THEN NULL; END $$;

-- 5. Reativar o RLS e Adicionar Políticas Robustas
ALTER TABLE "SITE_MarketingCampaigns" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SITE_MessageTemplates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SITE_MarketingLists" ENABLE ROW LEVEL SECURITY;

-- Políticas para SITE_MarketingCampaigns
DROP POLICY IF EXISTS "Users can handle own campaigns" ON "SITE_MarketingCampaigns";
CREATE POLICY "Users can handle own campaigns" ON "SITE_MarketingCampaigns"
FOR ALL TO authenticated
USING (
    created_by = auth.uid() 
    OR 
    EXISTS (SELECT 1 FROM "SITE_Users" WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

DROP POLICY IF EXISTS "Users can insert own campaigns" ON "SITE_MarketingCampaigns";
CREATE POLICY "Users can insert own campaigns" ON "SITE_MarketingCampaigns"
FOR INSERT TO authenticated
WITH CHECK (
    created_by = auth.uid() 
    OR 
    EXISTS (SELECT 1 FROM "SITE_Users" WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- Políticas para SITE_MarketingLists
DROP POLICY IF EXISTS "Users can handle own lists" ON "SITE_MarketingLists";
CREATE POLICY "Users can handle own lists" ON "SITE_MarketingLists"
FOR ALL TO authenticated
USING (
    owner_id = auth.uid() 
    OR 
    EXISTS (SELECT 1 FROM "SITE_Users" WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);
