-- Fix permission error by changing Foreign Key to point to SITE_Users instead of auth.users
-- This avoids the "permission denied for table users" error which happens when accessing auth schema directly

DO $$ 
BEGIN
    -- 1. Drop existing constraint if it exists (it might be named differently, so we try standard names)
    -- Checking constraint name usually: table_column_fkey
    BEGIN
        ALTER TABLE "SITE_MarketingLists" DROP CONSTRAINT "SITE_MarketingLists_owner_id_fkey";
    EXCEPTION
        WHEN undefined_object THEN NULL;
    END;
END $$;

-- 2. Add Foreign Key referencing the public SITE_Users table
ALTER TABLE "SITE_MarketingLists" 
ADD CONSTRAINT "SITE_MarketingLists_owner_id_fkey" 
FOREIGN KEY ("owner_id") 
REFERENCES "SITE_Users"("id") 
ON DELETE SET NULL;

-- 3. Ensure Policies are correct and permissive enough
ALTER TABLE "SITE_MarketingLists" ENABLE ROW LEVEL SECURITY;

-- Re-apply Insert Policy
DROP POLICY IF EXISTS "Users can insert own lists" ON "SITE_MarketingLists";
CREATE POLICY "Users can insert own lists" ON "SITE_MarketingLists"
FOR INSERT
WITH CHECK (
    -- User can insert if they are the owner
    auth.uid() = owner_id 
    OR 
    -- Or if they are admin
    (SELECT role FROM "SITE_Users" WHERE id = auth.uid()) IN ('admin', 'super_admin')
);

-- Re-apply Select Policy
DROP POLICY IF EXISTS "Users can view own lists" ON "SITE_MarketingLists";
CREATE POLICY "Users can view own lists" ON "SITE_MarketingLists"
FOR SELECT
USING (
    owner_id = auth.uid() 
    OR 
    owner_id IS NULL 
    OR
    (SELECT role FROM "SITE_Users" WHERE id = auth.uid()) IN ('admin', 'super_admin')
);
