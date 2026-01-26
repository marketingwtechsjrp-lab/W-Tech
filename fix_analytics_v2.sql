-- FIX ANALYTICS PERMISSIONS v2
-- Garante que o tracking funcione para usuários anônimos e autenticados

BEGIN;

-- 1. Habilitar RLS (Segurança)
ALTER TABLE "SITE_Analytics_PageViews" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SITE_Analytics_Events" ENABLE ROW LEVEL SECURITY;

-- 2. Limpar Políticas Antigas
DROP POLICY IF EXISTS "Public Insert PageViews" ON "SITE_Analytics_PageViews";
DROP POLICY IF EXISTS "Public Insert Events" ON "SITE_Analytics_Events";
DROP POLICY IF EXISTS "Authenticated Read PageViews" ON "SITE_Analytics_PageViews";
DROP POLICY IF EXISTS "Authenticated Read Events" ON "SITE_Analytics_Events";
DROP POLICY IF EXISTS "Admin Read PageViews" ON "SITE_Analytics_PageViews";
DROP POLICY IF EXISTS "Admin Read Events" ON "SITE_Analytics_Events";

-- 3. Criar Políticas de Inserção (Públicas - Todos podem trackear)
CREATE POLICY "Public Insert PageViews" ON "SITE_Analytics_PageViews" 
    FOR INSERT 
    TO public 
    WITH CHECK (true);

CREATE POLICY "Public Insert Events" ON "SITE_Analytics_Events" 
    FOR INSERT 
    TO public 
    WITH CHECK (true);

-- 4. Criar Políticas de Leitura (Apenas Admin/Autenticado)
-- Permitir que qualquer usuário logado veja os dados (simplificado para o dashboard interno)
CREATE POLICY "Auth Read PageViews" ON "SITE_Analytics_PageViews" 
    FOR SELECT 
    TO authenticated 
    USING (true);

CREATE POLICY "Auth Read Events" ON "SITE_Analytics_Events" 
    FOR SELECT 
    TO authenticated 
    USING (true);

-- 5. Conceder Permissões de Tabela
GRANT INSERT ON "SITE_Analytics_PageViews" TO anon, authenticated, service_role;
GRANT INSERT ON "SITE_Analytics_Events" TO anon, authenticated, service_role;

GRANT SELECT ON "SITE_Analytics_PageViews" TO authenticated, service_role;
GRANT SELECT ON "SITE_Analytics_Events" TO authenticated, service_role;

COMMIT;
