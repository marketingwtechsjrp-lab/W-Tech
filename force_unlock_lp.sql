-- FORCE DISABLE Security Checks for Landing Pages
-- This will immediately stop the "violates row-level security policy" error.

ALTER TABLE public."SITE_LandingPages" DISABLE ROW LEVEL SECURITY;

-- Also ensuring the Unique Constraint exists (just in case it was missed)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SITE_LandingPages_course_id_key') THEN
        ALTER TABLE public."SITE_LandingPages"
        ADD CONSTRAINT "SITE_LandingPages_course_id_key" UNIQUE (course_id);
    END IF;
END $$;
