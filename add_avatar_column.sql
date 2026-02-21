-- ADICIONAR COLUNA DE AVATAR À TABELA DE USUÁRIOS
-- Execute este script no SQL Editor do Supabase para permitir o salvamento da foto de perfil

ALTER TABLE "SITE_Users" ADD COLUMN IF NOT EXISTS "avatar_url" TEXT;

-- Garantir que a coluna seja visível para usuários autenticados (opcional, dependendo das suas políticas de RLS)
-- Se você tiver RLS na SITE_Users, certifique-se de que a política de SELECT inclui a nova coluna.
