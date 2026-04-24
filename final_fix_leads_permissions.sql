-- FINAL PERMISSION FIX FOR LEADS
-- Run this to allow ANYONE to insert and update leads.

-- 1. Grant permissions to standard roles
GRANT ALL ON TABLE "public"."SITE_Leads" TO postgres;
GRANT ALL ON TABLE "public"."SITE_Leads" TO anon;
GRANT ALL ON TABLE "public"."SITE_Leads" TO authenticated;
GRANT ALL ON TABLE "public"."SITE_Leads" TO service_role;

-- 2. Reset RLS Policies
ALTER TABLE "public"."SITE_Leads" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Insert" ON "public"."SITE_Leads";
CREATE POLICY "Public Insert" ON "public"."SITE_Leads" FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public Update" ON "public"."SITE_Leads";
CREATE POLICY "Public Update" ON "public"."SITE_Leads" FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Public Select" ON "public"."SITE_Leads";
CREATE POLICY "Public Select" ON "public"."SITE_Leads" FOR SELECT USING (true);

-- 3. Fix potential sequence issues (if ID is not auto-generating)
-- Ensure id column has a default value (usually uuid_generate_v4() or gen_random_uuid())
ALTER TABLE "public"."SITE_Leads" ALTER COLUMN id SET DEFAULT gen_random_uuid();
