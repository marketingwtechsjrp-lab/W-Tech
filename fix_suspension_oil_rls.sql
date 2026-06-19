-- ============================================================================
-- FIX RLS — SITE_SuspensionOil
--
-- MOTIVO: o app W-Tech roda 100% com a chave anônima (papel `anon`) e faz login
-- próprio na tabela SITE_Users — NÃO usa o Auth do Supabase. Logo o papel
-- `authenticated` nunca existe em runtime, e a política original (que só liberava
-- leitura quando is_validated = true e escrita só para `authenticated`) escondia
-- TODOS os rascunhos do painel admin e bloqueava o cadastro pelo painel.
--
-- SOLUÇÃO: alinhar com o resto do projeto — liberar leitura/escrita ao papel
-- `public` (inclui `anon`), como na tabela SITE_SpringRecommendations. A regra
-- "o site público só mostra registros validados" passa a ser aplicada no app
-- (components/ui/OilSelector.tsx filtra .eq('is_validated', true)).
--
-- Rode este arquivo UMA vez no SQL Editor do Supabase.
-- ============================================================================

ALTER TABLE "SITE_SuspensionOil" ENABLE ROW LEVEL SECURITY;

-- Remove as políticas antigas (restritivas para este modelo de auth)
DROP POLICY IF EXISTS "Allow public select validated" ON "SITE_SuspensionOil";
DROP POLICY IF EXISTS "Allow authenticated full access" ON "SITE_SuspensionOil";

-- Políticas alinhadas ao app (anon)
DROP POLICY IF EXISTS "susp_oil_public_read" ON "SITE_SuspensionOil";
CREATE POLICY "susp_oil_public_read" ON "SITE_SuspensionOil"
    FOR SELECT TO public
    USING (true);

DROP POLICY IF EXISTS "susp_oil_public_write" ON "SITE_SuspensionOil";
CREATE POLICY "susp_oil_public_write" ON "SITE_SuspensionOil"
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);

-- Garante os privilégios de tabela para o papel anon (CRUD pelo painel)
GRANT SELECT, INSERT, UPDATE, DELETE ON "SITE_SuspensionOil" TO anon;
