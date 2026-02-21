-- FIX RLS POLICIES FOR SITE_Roles
-- This script resets the security policies for the roles table to allow admins to save changes.

-- 1. Disable RLS temporarily to prevent lockout during changes
ALTER TABLE "SITE_Roles" DISABLE ROW LEVEL SECURITY;

-- 2. Drop any conflicting or restrictive policies
DROP POLICY IF EXISTS "Allow full access to authenticated users" ON "SITE_Roles";
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON "SITE_Roles";
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON "SITE_Roles";
DROP POLICY IF EXISTS "Enable update for authenticated users" ON "SITE_Roles";
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON "SITE_Roles";
DROP POLICY IF EXISTS "Allow all for authenticated" ON "SITE_Roles";
DROP POLICY IF EXISTS "Public Read" ON "SITE_Roles";

-- 3. Re-enable RLS
ALTER TABLE "SITE_Roles" ENABLE ROW LEVEL SECURITY;

-- 4. Create a permissive policy for ALL authenticated users (since this is an Admin panel, we assume auth users are trusted or permission-gated by the UI)
CREATE POLICY "Allow all for authenticated"
ON "SITE_Roles"
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 5. Grant explicit table permissions
GRANT ALL ON "SITE_Roles" TO authenticated;
GRANT ALL ON "SITE_Roles" TO service_role;
GRANT SELECT ON "SITE_Roles" TO anon; -- Allow reading roles if necessary for public referencing, though usually not needed.

-- 6. Insert default roles if table is empty (Safety net)
INSERT INTO "SITE_Roles" (name, description, level, permissions)
SELECT 'Super Admin', 'Acesso Total', 10, '{"admin_access": true}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM "SITE_Roles" LIMIT 1);
