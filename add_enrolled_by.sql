-- Adiciona coluna para registrar o nome do atendente que fez a inscrição
ALTER TABLE "SITE_Enrollments"
ADD COLUMN IF NOT EXISTS enrolled_by_name TEXT DEFAULT NULL;

COMMENT ON COLUMN "SITE_Enrollments".enrolled_by_name IS 'Nome do atendente/usuário que realizou a inscrição do aluno';
