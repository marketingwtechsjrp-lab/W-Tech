-- EMERGENCY UNBLOCK FOR TASKS (Nuclear Fix)
-- Use this if the previous scripts failed.
-- This script gives full access to 'authenticated' users and ensures RLS doesn't block them.

BEGIN;

-- 1. Ensure RLS is ON (Disabling it is dangerous, better to have a wide-open policy)
ALTER TABLE "SITE_Tasks" ENABLE ROW LEVEL SECURITY;

-- 2. DROP ALL EXISTING POLICIES (Brute Force Clean)
DO $$ 
DECLARE 
    r RECORD; 
BEGIN 
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'SITE_Tasks') LOOP 
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON "SITE_Tasks"'; 
    END LOOP; 
END $$;

-- 3. CREATE A SINGLE "OPEN" POLICY FOR LOGGED IN USERS
CREATE POLICY "Allow_All_Authenticated" ON "SITE_Tasks"
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 4. GRANT PERMISSIONS
GRANT ALL ON TABLE "SITE_Tasks" TO authenticated;
GRANT ALL ON TABLE "SITE_Tasks" TO service_role;
GRANT ALL ON SEQUENCE "SITE_Tasks_id_seq" TO authenticated; -- If auto-increment ID exists

-- 5. REMOVE FOREIGN KEY CONSTRAINTS (Common Source of Errors)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SITE_Tasks_assigned_to_fkey') THEN
        ALTER TABLE "SITE_Tasks" DROP CONSTRAINT "SITE_Tasks_assigned_to_fkey";
    END IF;
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SITE_Tasks_created_by_fkey') THEN
        ALTER TABLE "SITE_Tasks" DROP CONSTRAINT "SITE_Tasks_created_by_fkey";
    END IF;
     IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SITE_Tasks_lead_id_fkey') THEN
        -- Optional: Removing lead constraint if that is causing issues (orphaned leads)
        -- ALTER TABLE "SITE_Tasks" DROP CONSTRAINT "SITE_Tasks_lead_id_fkey";
    END IF;
END $$;

COMMIT;
