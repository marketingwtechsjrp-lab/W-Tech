-- Add quiz_enabled column to SITE_LandingPages
ALTER TABLE "public"."SITE_LandingPages" ADD COLUMN IF NOT EXISTS "quiz_enabled" boolean DEFAULT false;

-- Add quiz_data column to SITE_Leads to store detailed results if needed (optional but good practice)
ALTER TABLE "public"."SITE_Leads" ADD COLUMN IF NOT EXISTS "quiz_data" jsonb;
