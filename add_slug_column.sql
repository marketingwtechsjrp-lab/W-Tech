
-- Adicionar coluna SLUG na tabela de CURSOS para URLs amigáveis
ALTER TABLE "SITE_Courses" ADD COLUMN IF NOT EXISTS "slug" TEXT;
