-- FIX TASKS PERMISSIONS & CONSTRAINTS
-- Resolver problema de botão de excluir não funcionando (Delete RLS)
-- Resolver problema de atribuição (Foreign Keys)

BEGIN;

-- 1. Habilitar RLS mas garantir permissões
ALTER TABLE IF EXISTS "SITE_Tasks" ENABLE ROW LEVEL SECURITY;

-- 2. Criar política de exclusão (DELETE)
DROP POLICY IF EXISTS "Enable delete for authenticated" ON "SITE_Tasks";
CREATE POLICY "Enable delete for authenticated" ON "SITE_Tasks"
    FOR DELETE
    TO authenticated
    USING (true);

-- 3. Criar política de atualização (UPDATE) para mover cards
DROP POLICY IF EXISTS "Enable update for authenticated" ON "SITE_Tasks";
CREATE POLICY "Enable update for authenticated" ON "SITE_Tasks"
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 4. Criar política de inserção (INSERT)
DROP POLICY IF EXISTS "Enable insert for authenticated" ON "SITE_Tasks";
CREATE POLICY "Enable insert for authenticated" ON "SITE_Tasks"
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- 5. Criar política de leitura (SELECT)
DROP POLICY IF EXISTS "Enable select for authenticated" ON "SITE_Tasks";
CREATE POLICY "Enable select for authenticated" ON "SITE_Tasks"
    FOR SELECT
    TO authenticated
    USING (true);

-- 6. Corrigir Foreign Keys que podem estar apontando para auth.users (causa erro de permissão)
-- Vamos apontar para SITE_Users ou remover a constraint estrita

DO $$ BEGIN
    -- Remover FK antiga de assigned_to se existir
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SITE_Tasks_assigned_to_fkey') THEN
        ALTER TABLE "SITE_Tasks" DROP CONSTRAINT "SITE_Tasks_assigned_to_fkey";
    END IF;

    -- Tentar adicionar FK para SITE_Users (Tabela Pública)
    -- Se falhar (por dados inconsistentes), apenas deixa sem FK por enquanto
    BEGIN
        ALTER TABLE "SITE_Tasks" 
        ADD CONSTRAINT "SITE_Tasks_assigned_to_fkey" 
        FOREIGN KEY ("assigned_to") REFERENCES "SITE_Users"("id") ON DELETE SET NULL;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Não foi possível vincular assigned_to a SITE_Users (dados inconsistentes?)';
    END;
END $$;

DO $$ BEGIN
    -- Remover FK antiga de created_by se existir
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SITE_Tasks_created_by_fkey') THEN
        ALTER TABLE "SITE_Tasks" DROP CONSTRAINT "SITE_Tasks_created_by_fkey";
    END IF;

    BEGIN
        ALTER TABLE "SITE_Tasks" 
        ADD CONSTRAINT "SITE_Tasks_created_by_fkey" 
        FOREIGN KEY ("created_by") REFERENCES "SITE_Users"("id") ON DELETE SET NULL;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Não foi possível vincular created_by a SITE_Users';
    END;
END $$;

COMMIT;
