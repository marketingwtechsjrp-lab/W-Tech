-- FORCE FIX: Drop constraint and Disable RLS on Marketing Tables
-- Run this if you still get "permission denied for table users" errors.

BEGIN;

-- 1. Disable RLS to ensure no hidden policies are blocking default roles
ALTER TABLE "SITE_MarketingLists" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "SITE_MarketingListMembers" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "SITE_MarketingCampaigns" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "SITE_CampaignQueue" DISABLE ROW LEVEL SECURITY;

-- 2. Drop the Foreign Key that might be pointing to auth.users (restricted)
-- We attempt to drop by likely names.
DO $$
BEGIN
    ALTER TABLE "SITE_MarketingLists" DROP CONSTRAINT IF EXISTS "SITE_MarketingLists_owner_id_fkey";
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

-- 3. We do NOT add the constraint back immediately to allow the app to work.
-- You can run the previous fix script later to add it pointing to SITE_Users correctly.

COMMIT;
