
-- 1. ADICIONA PERMISSÃO DE EXCLUSÃO (RLS)
-- O Supabase bloqueia exclusões se não houver uma política específica para isso.
ALTER TABLE "public"."SITE_Leads" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Delete" ON "public"."SITE_Leads";
CREATE POLICY "Public Delete" ON "public"."SITE_Leads" FOR DELETE USING (true);

-- 2. CORRIGE VÍNCULOS (CASCATA)
-- Se o lead estiver em uma lista de marketing ou tiver tarefas, a exclusão seria bloqueada por erro de "Foreign Key".
-- Vamos garantir que ao apagar o lead, tudo que é dele suma junto.

-- Para Tarefas
DO $$ BEGIN
    ALTER TABLE "SITE_Tasks" DROP CONSTRAINT IF EXISTS "SITE_Tasks_lead_id_fkey";
    ALTER TABLE "SITE_Tasks" ADD CONSTRAINT "SITE_Tasks_lead_id_fkey" 
    FOREIGN KEY ("lead_id") REFERENCES "SITE_Leads"("id") ON DELETE CASCADE;
EXCEPTION WHEN OTHERS THEN END $$;

-- Para Membros de Listas de Marketing
DO $$ BEGIN
    ALTER TABLE "SITE_MarketingListMembers" DROP CONSTRAINT IF EXISTS "SITE_MarketingListMembers_lead_id_fkey";
    ALTER TABLE "SITE_MarketingListMembers" ADD CONSTRAINT "SITE_MarketingListMembers_lead_id_fkey" 
    FOREIGN KEY ("lead_id") REFERENCES "SITE_Leads"("id") ON DELETE CASCADE;
EXCEPTION WHEN OTHERS THEN END $$;

-- Para Fila de Campanhas
DO $$ BEGIN
    ALTER TABLE "SITE_CampaignQueue" DROP CONSTRAINT IF EXISTS "SITE_CampaignQueue_lead_id_fkey";
    ALTER TABLE "SITE_CampaignQueue" ADD CONSTRAINT "SITE_CampaignQueue_lead_id_fkey" 
    FOREIGN KEY ("lead_id") REFERENCES "SITE_Leads"("id") ON DELETE CASCADE;
EXCEPTION WHEN OTHERS THEN END $$;

-- 3. GARANTE PERMISSÕES DE TABELA
GRANT ALL ON TABLE "public"."SITE_Leads" TO anon;
GRANT ALL ON TABLE "public"."SITE_Leads" TO authenticated;
GRANT ALL ON TABLE "public"."SITE_Leads" TO service_role;
