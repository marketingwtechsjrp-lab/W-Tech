-- Comprehensive Fix for Transactions Table RLS
BEGIN;

-- 1. Ensure RLS is enabled
ALTER TABLE "SITE_Transactions" ENABLE ROW LEVEL SECURITY;

-- 2. Drop ALL potential policies to avoid conflicts
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON "SITE_Transactions";
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON "SITE_Transactions";
DROP POLICY IF EXISTS "Enable select for authenticated users" ON "SITE_Transactions";
DROP POLICY IF EXISTS "Enable update for authenticated users" ON "SITE_Transactions";
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON "SITE_Transactions";
DROP POLICY IF EXISTS "Allow All Authenticated" ON "SITE_Transactions";
DROP POLICY IF EXISTS "Allow Service Role" ON "SITE_Transactions";

-- 3. Create a permissive policy for ALL operations for AUTHENTICATED users
-- This essentially disables RLS checks for anyone logged in, for this table.
CREATE POLICY "Allow All Authenticated" ON "SITE_Transactions"
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 4. Also allow access to service_role (for server-side operations)
CREATE POLICY "Allow Service Role" ON "SITE_Transactions"
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

COMMIT;
