-- SCRIPT DE ATUALIZAÇÃO DA TABELA DE USUÁRIOS
-- Adiciona colunas faltantes para o perfil funcionar corretamente

ALTER TABLE "SITE_Users" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "SITE_Users" ADD COLUMN IF NOT EXISTS "avatar_url" TEXT;
