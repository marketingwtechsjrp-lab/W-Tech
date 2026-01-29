-- SECURE LEADS RLS (STRICT OWNER VISIBILITY)
-- This script enables RLS on SITE_Leads and restricts access so:
-- 1. Attendants can ONLY view/edit their own leads (assigned_to = auth.uid())
-- 2. Admins/Managers can view/edit ALL leads

-- 1. Enable RLS
ALTER TABLE "SITE_Leads" ENABLE ROW LEVEL SECURITY;

-- 2. Clean up old permissive policies
DROP POLICY IF EXISTS "Enable read access for all users" ON "SITE_Leads";
DROP POLICY IF EXISTS "Enable insert for all users" ON "SITE_Leads";
DROP POLICY IF EXISTS "Enable update for everyone" ON "SITE_Leads";
DROP POLICY IF EXISTS "Enable delete for administrators" ON "SITE_Leads";
-- Drop specific policies named in previous scripts just in case
DROP POLICY IF EXISTS "Public leads insert" ON "SITE_Leads";
DROP POLICY IF EXISTS "Leads View Own" ON "SITE_Leads";

-- 3. Create Admin/Manager Policy (Full Access)
-- Checks for "admin_access" in app_metadata or role claims
CREATE POLICY "Admins_Manage_All" ON "SITE_Leads"
FOR ALL
USING (
  (auth.jwt() ->> 'role' = 'service_role') OR
  (auth.jwt() -> 'app_metadata' ->> 'role' IN ('admin', 'super_admin', 'manager')) OR
  ((auth.jwt() -> 'user_metadata' ->> 'role_level')::int >= 10) OR
  (EXISTS (
    SELECT 1 FROM "SITE_Users" 
    WHERE id = auth.uid() 
    AND (
      role::text IN ('ADMIN', 'Super Admin', 'Admin') 
      OR (role::jsonb ->> 'level')::int >= 10
      OR (role::jsonb -> 'permissions' ->> 'admin_access')::boolean = true
    )
  ))
);

-- 4. Create Attendant Policy (Own Data Only)
-- Allows viewing and updating only rows assigned to them OR created by them (if assigned_to is null initially)
CREATE POLICY "Attendants_View_Manage_Own" ON "SITE_Leads"
FOR ALL
USING (
  assigned_to = auth.uid() 
  OR
  (auth.uid() = id) -- Unlikely for leads table, but standard pattern
);

-- 5. Allow Public Insert (For Landing Pages/Forms)
-- Anonymous users must be able to insert new leads
CREATE POLICY "Public_Insert_Leads" ON "SITE_Leads"
FOR INSERT
WITH CHECK (true);

-- 6. Allow Public Update (For Quiz/Post-Conversion)
-- Logic: If I just created it (in current session), maybe I can update it? 
-- Since we can't easily track "just created" row without ID in session, 
-- we typically allow Anon Update for specific flows or keep it restricted.
-- Re-applying the logic from 'fix_lead_permissions.sql' but correctly this time.
-- Note: 'Public_Insert_Leads' handles the creation. 
-- For Quiz updates, we usually need a specialized function or open update for Anon if security model permits.
-- STRICT MODE: We will NOT allow generic Anon UPDATE. 
-- If the quiz needs to update, it should likely use the 'update_quiz_lead' RPC function defined in 'fix_lead_permissions.sql'.
