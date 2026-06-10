-- Migration: Add student experience and workshop columns to SITE_Enrollments
-- Purpose: Support post-payment detailed questionnaire for Lisboa II (and other courses)

ALTER TABLE "SITE_Enrollments" ADD COLUMN IF NOT EXISTS "has_workshop" BOOLEAN DEFAULT FALSE;
ALTER TABLE "SITE_Enrollments" ADD COLUMN IF NOT EXISTS "workshop_name" TEXT;
ALTER TABLE "SITE_Enrollments" ADD COLUMN IF NOT EXISTS "works_with_suspensions" BOOLEAN DEFAULT FALSE;
ALTER TABLE "SITE_Enrollments" ADD COLUMN IF NOT EXISTS "took_suspension_course" BOOLEAN DEFAULT FALSE;
ALTER TABLE "SITE_Enrollments" ADD COLUMN IF NOT EXISTS "experience_years" TEXT;

-- Reload postgrest schema cache
NOTIFY pgrst, 'reload config';
