-- FIX: RLS for SITE_SystemSettings - ROBUST ADMIN VERSION
-- Purpose: Force allow Admin updates for SITE_SystemSettings

-- 1. Ensure RLS is active
ALTER TABLE "public"."SITE_SystemSettings" ENABLE ROW LEVEL SECURITY;

-- 2. Clear all previous policies to avoid conflicts
DROP POLICY IF EXISTS "Public select settings" ON "public"."SITE_SystemSettings";
DROP POLICY IF EXISTS "Public Read Settings" ON "public"."SITE_SystemSettings";
DROP POLICY IF EXISTS "Admin full access settings" ON "public"."SITE_SystemSettings";
DROP POLICY IF EXISTS "Admin Full Access Settings" ON "public"."SITE_SystemSettings";
DROP POLICY IF EXISTS "Allow all to authenticated" ON "public"."SITE_SystemSettings";
DROP POLICY IF EXISTS "Enable read for all" ON "public"."SITE_SystemSettings";
DROP POLICY IF EXISTS "Enable all for authenticated" ON "public"."SITE_SystemSettings";
DROP POLICY IF EXISTS "settings_select_policy" ON "public"."SITE_SystemSettings";
DROP POLICY IF EXISTS "settings_all_policy" ON "public"."SITE_SystemSettings";
DROP POLICY IF EXISTS "settings_insert_policy" ON "public"."SITE_SystemSettings";
DROP POLICY IF EXISTS "settings_update_policy" ON "public"."SITE_SystemSettings";
DROP POLICY IF EXISTS "settings_modify_policy" ON "public"."SITE_SystemSettings";

-- 3. SELECT: Everyone can read (essential for the site to work)
CREATE POLICY "settings_select" 
ON "public"."SITE_SystemSettings" 
FOR SELECT 
USING (true);

-- 4. ALL (INSERT/UPDATE/DELETE): Restricted to Admins
-- We use a simplified check first, then fallback to complex check
CREATE POLICY "settings_admin_manage" 
ON "public"."SITE_SystemSettings" 
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM "public"."SITE_Users" u
        LEFT JOIN "public"."SITE_Roles" r ON u.role_id = r.id
        WHERE u.id = auth.uid()
        AND (
            -- Check string role (case insensitive + trimmed)
            trim(u.role) ILIKE 'admin' OR 
            trim(u.role) ILIKE 'super admin' OR
            -- Check linked role name
            r.name ILIKE 'admin' OR 
            r.name ILIKE 'super admin' OR
            -- Check specific permissions
            (u.permissions->>'admin_access')::boolean = true OR
            (r.permissions->>'admin_access')::boolean = true
        )
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM "public"."SITE_Users" u
        LEFT JOIN "public"."SITE_Roles" r ON u.role_id = r.id
        WHERE u.id = auth.uid()
        AND (
            trim(u.role) ILIKE 'admin' OR 
            trim(u.role) ILIKE 'super admin' OR
            r.name ILIKE 'admin' OR 
            r.name ILIKE 'super admin' OR
            (u.permissions->>'admin_access')::boolean = true OR
            (r.permissions->>'admin_access')::boolean = true
        )
    )
);

-- 5. Additional Grant Safety
GRANT ALL ON "public"."SITE_SystemSettings" TO authenticated;
GRANT SELECT ON "public"."SITE_SystemSettings" TO anon;
GRANT ALL ON "public"."SITE_SystemSettings" TO service_role;

-- Notify change
NOTIFY pgrst, 'reload config';
