-- FIX LEAD DELETION PERMISSIONS AND CASCADING
-- This script fixes the issue where leads disappear from the UI but reappar after refresh.

-- 1. ADICIONA PERMISSÃO DE EXCLUSÃO (RLS)
-- O Supabase bloqueia exclusões se não houver uma política específica para isso.
ALTER TABLE "public"."SITE_Leads" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Delete" ON "public"."SITE_Leads";
CREATE POLICY "Public Delete" ON "public"."SITE_Leads" FOR DELETE USING (true);

-- 2. CORRIGE VÍNCULOS (CASCATA)
-- Garante que ao apagar o lead, tudo que é dele suma junto, evitando erros de FK.

-- Para Tarefas (SITE_Tasks)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SITE_Tasks_lead_id_fkey') THEN
        ALTER TABLE "SITE_Tasks" DROP CONSTRAINT "SITE_Tasks_lead_id_fkey";
    END IF;
    
    ALTER TABLE "SITE_Tasks" 
    ADD CONSTRAINT "SITE_Tasks_lead_id_fkey" 
    FOREIGN KEY ("lead_id") REFERENCES "SITE_Leads"("id") ON DELETE CASCADE;
EXCEPTION WHEN OTHERS THEN 
    -- Se a tabela não tiver a coluna lead_id ainda, ignoramos ou logamos
    RAISE NOTICE 'Não foi possível aplicar cascade em SITE_Tasks';
END $$;

-- Para Membros de Listas de Marketing
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SITE_MarketingListMembers_lead_id_fkey') THEN
        ALTER TABLE "SITE_MarketingListMembers" DROP CONSTRAINT "SITE_MarketingListMembers_lead_id_fkey";
    END IF;

    ALTER TABLE "SITE_MarketingListMembers" 
    ADD CONSTRAINT "SITE_MarketingListMembers_lead_id_fkey" 
    FOREIGN KEY ("lead_id") REFERENCES "SITE_Leads"("id") ON DELETE CASCADE;
EXCEPTION WHEN OTHERS THEN 
    RAISE NOTICE 'Não foi possível aplicar cascade em SITE_MarketingListMembers';
END $$;

-- 3. GARANTE QUE O USUÁRIO AUTENTICADO E ANON TENHAM ACESSO
GRANT ALL ON TABLE "public"."SITE_Leads" TO anon;
GRANT ALL ON TABLE "public"."SITE_Leads" TO authenticated;
GRANT ALL ON TABLE "public"."SITE_Leads" TO service_role;

-- 4. VERIFICAÇÃO DE OUTRAS TABELAS QUE PODEM BLOQUEAR
-- Se houver tabelas de 'Inscrições' ou 'Vendas' vinculadas ao lead, elas também precisam de CASCADE.
-- No momento, 'SITE_Enrollments' e 'SITE_Sales' parecem usar vinculação por email ou CPF, 
-- mas se usarem lead_id, precisam ser tratadas.
