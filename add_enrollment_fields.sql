-- Add CPF and T-shirt size to SITE_Enrollments
ALTER TABLE "SITE_Enrollments" ADD COLUMN IF NOT EXISTS "student_cpf" TEXT;
ALTER TABLE "SITE_Enrollments" ADD COLUMN IF NOT EXISTS "t_shirt_size" TEXT;
