-- SOLUÇÃO DE SEGURANÇA FINAL E CORRETA
-- O problema anterior era: A tabela de Configurações tentava ler a tabela de Usuários para ver seu cargo.
-- Mas a tabela de Usuários TAMBÉM é bloqueada, então o banco travava (Deadlock de permissão).

-- A solução é usar uma função "SECURITY DEFINER".
-- Ela funciona como um "Crachá Mestre": roda com permissão máxima do sistema,
-- permitindo ler o seu cargo sem ser bloqueada pelas regras de segurança normais.

BEGIN;

-- 1. Reativar a Segurança (RLS) que desligamos para testar
ALTER TABLE "public"."SITE_SystemSettings" ENABLE ROW LEVEL SECURITY;

-- 2. Criar a Função Mestra de Verificação (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.verify_admin_access()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER -- <--- O SEGREDO: Roda com permissões do dono do banco, ignorando RLS
SET search_path = public -- Prática de segurança para evitar injeção
AS $$
BEGIN
    -- Verifica se o usuário atual tem cargo de Admin
    -- Usa ILIKE para aceitar 'ADMIN', 'Admin', 'prefeito', etc, se contiver a palavra.
    RETURN EXISTS (
        SELECT 1 
        FROM "SITE_Users" 
        WHERE id = auth.uid() 
        AND (
            role ILIKE '%ADMIN%' OR 
            role ILIKE '%SUPER%'
        )
    );
END;
$$;

-- 3. Limpar políticas antigas
DROP POLICY IF EXISTS "leitura_publica_final" ON "public"."SITE_SystemSettings";
DROP POLICY IF EXISTS "escrita_admin_final" ON "public"."SITE_SystemSettings";
DROP POLICY IF EXISTS "Allow public read-only" ON "public"."SITE_SystemSettings";
DROP POLICY IF EXISTS "Allow write for authenticated only" ON "public"."SITE_SystemSettings";
DROP POLICY IF EXISTS "settings_admin_v4" ON "public"."SITE_SystemSettings";
DROP POLICY IF EXISTS "settings_select_v4" ON "public"."SITE_SystemSettings";
-- (Adicionei drops extras para garantir limpeza total)

-- 4. Criar Política de Leitura Pública (Site precisa ver logo/cores)
CREATE POLICY "settings_public_read_secure" 
ON "public"."SITE_SystemSettings" 
FOR SELECT 
USING (true);

-- 5. Criar Política de Escrita Segura (Apenas Admins via Função Mestra)
CREATE POLICY "settings_admin_write_secure" 
ON "public"."SITE_SystemSettings" 
FOR ALL 
TO authenticated
USING (public.verify_admin_access())
WITH CHECK (public.verify_admin_access());

-- 6. Garantir permissões
GRANT EXECUTE ON FUNCTION public.verify_admin_access TO authenticated;
GRANT ALL ON "public"."SITE_SystemSettings" TO authenticated;
GRANT SELECT ON "public"."SITE_SystemSettings" TO anon;

COMMIT;

-- 7. Atualizar cache
NOTIFY pgrst, 'reload config';
