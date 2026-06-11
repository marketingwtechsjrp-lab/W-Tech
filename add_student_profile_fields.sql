-- Campos complementares da ficha do aluno (preenchidos na página de Inscrição Confirmada)
ALTER TABLE "SITE_Enrollments" ADD COLUMN IF NOT EXISTS is_mechanic BOOLEAN DEFAULT NULL;
ALTER TABLE "SITE_Enrollments" ADD COLUMN IF NOT EXISTS workshop_address TEXT DEFAULT NULL;
ALTER TABLE "SITE_Enrollments" ADD COLUMN IF NOT EXISTS took_wtech_course BOOLEAN DEFAULT NULL;

COMMENT ON COLUMN "SITE_Enrollments".is_mechanic IS 'Se o aluno já atua como mecânico';
COMMENT ON COLUMN "SITE_Enrollments".workshop_address IS 'Endereço da mecânica/oficina onde o aluno trabalha';
COMMENT ON COLUMN "SITE_Enrollments".took_wtech_course IS 'Se o aluno já fez outro curso da W-Tech';
-- took_suspension_course (já existente) passa a significar: curso de suspensão FORA da W-Tech

-- Força a API do Supabase (PostgREST) a recarregar o cache de schema
NOTIFY pgrst, 'reload config';
NOTIFY pgrst, 'reload schema';
