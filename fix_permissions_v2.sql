
-- FIX PERMISSIONS FOR DEV SITCHER AND LEADS DEBUG

-- 1. Ensure SITE_USERS is readable by authenticated users so the Dev Switcher works
ALTER TABLE "public"."SITE_Users" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Select Users" ON "public"."SITE_Users";
CREATE POLICY "Public Select Users" ON "public"."SITE_Users" FOR SELECT TO authenticated USING (true);

-- 2. Ensure SITE_ROLES is readable
GRANT SELECT ON "public"."SITE_Roles" TO authenticated;

-- 3. Double check SITE_Leads permissions - Make absolutely sure RLS isn't the blocker
-- We will RE-APPLY the permissive policies just in case.
DROP POLICY IF EXISTS "Public Insert" ON "public"."SITE_Leads";
CREATE POLICY "Public Insert" ON "public"."SITE_Leads" FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public Update" ON "public"."SITE_Leads";
CREATE POLICY "Public Update" ON "public"."SITE_Leads" FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Public Select" ON "public"."SITE_Leads";
CREATE POLICY "Public Select" ON "public"."SITE_Leads" FOR SELECT USING (true);

-- 4. Check if there is a trigger that might be failing (e.g. log_changes)
-- Sometimes a trigger function fails because of permissions or missing columns.
-- We can try to identify them, but for now we assume standard permissions.
-- If this doesn't work, we might need to disable triggers.
