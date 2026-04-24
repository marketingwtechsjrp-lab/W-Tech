
-- Enable RLS
ALTER TABLE "public"."SITE_SystemSettings" ENABLE ROW LEVEL SECURITY;

-- Allow read for everyone (so public site can load settings)
DROP POLICY IF EXISTS "Enable read access for all users" ON "public"."SITE_SystemSettings";
CREATE POLICY "Enable read access for all users" ON "public"."SITE_SystemSettings" FOR SELECT USING (true);

-- Allow all actions for admin/authenticated users (simplifying for now to solve the bug)
--Ideally we check for role, but let's first ensure it works for auth users
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON "public"."SITE_SystemSettings";
CREATE POLICY "Enable all access for authenticated users" ON "public"."SITE_SystemSettings" FOR ALL USING (auth.role() = 'authenticated');
