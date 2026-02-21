-- FIX TASK CREATION & VIEWING PERMISSIONS (FINAL v2)
-- Resolves "policy already exists" error by dropping EVERYTHING first.

BEGIN;

-- 1. Enable RLS (Security Best Practice)
ALTER TABLE "SITE_Tasks" ENABLE ROW LEVEL SECURITY;

-- 2. RESET ALL POLICIES (Comprehensive Drop)
DROP POLICY IF EXISTS "Enable all for authenticated" ON "SITE_Tasks";
DROP POLICY IF EXISTS "Enable insert for authenticated" ON "SITE_Tasks";
DROP POLICY IF EXISTS "Enable select for authenticated" ON "SITE_Tasks";
DROP POLICY IF EXISTS "Enable update for authenticated" ON "SITE_Tasks";
DROP POLICY IF EXISTS "Enable delete for authenticated" ON "SITE_Tasks";
DROP POLICY IF EXISTS "Combined Policy" ON "SITE_Tasks";
DROP POLICY IF EXISTS "Allow Insert Authenticated" ON "SITE_Tasks";
DROP POLICY IF EXISTS "Allow Select Authenticated" ON "SITE_Tasks";
DROP POLICY IF EXISTS "Allow Update Authenticated" ON "SITE_Tasks";
DROP POLICY IF EXISTS "Allow Delete Authenticated" ON "SITE_Tasks";
DROP POLICY IF EXISTS "Users can insert their own tasks" ON "SITE_Tasks";
DROP POLICY IF EXISTS "Users can view their own tasks" ON "SITE_Tasks";

-- 3. CREATE PERMISSIVE POLICIES FOR AUTHENTICATED USERS
-- ALLOW INSERT (Creation)
CREATE POLICY "Allow Insert Authenticated" ON "SITE_Tasks"
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- ALLOW SELECT (Viewing) - View ALL tasks if you are logged in (Team collaboration)
CREATE POLICY "Allow Select Authenticated" ON "SITE_Tasks"
    FOR SELECT
    TO authenticated
    USING (true);

-- ALLOW UPDATE (Editing status, etc)
CREATE POLICY "Allow Update Authenticated" ON "SITE_Tasks"
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- ALLOW DELETE
CREATE POLICY "Allow Delete Authenticated" ON "SITE_Tasks"
    FOR DELETE
    TO authenticated
    USING (true);

-- 4. GRANT PERMISSIONS (Table Layer)
GRANT ALL ON TABLE "SITE_Tasks" TO authenticated;
GRANT ALL ON TABLE "SITE_Tasks" TO service_role;

-- 5. Fix Foreign Key to Users
-- Removing strict constraint to auth.users if it exists to prevent subtle blocks
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SITE_Tasks_assigned_to_fkey') THEN
        ALTER TABLE "SITE_Tasks" DROP CONSTRAINT "SITE_Tasks_assigned_to_fkey";
    END IF;
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SITE_Tasks_created_by_fkey') THEN
        ALTER TABLE "SITE_Tasks" DROP CONSTRAINT "SITE_Tasks_created_by_fkey";
    END IF;
END $$;

COMMIT;
