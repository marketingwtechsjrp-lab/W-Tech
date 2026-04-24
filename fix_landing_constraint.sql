-- Fix the "ON CONFLICT" error by adding a UNIQUE constraint to course_id
ALTER TABLE public."SITE_LandingPages"
ADD CONSTRAINT "SITE_LandingPages_course_id_key" UNIQUE (course_id);
