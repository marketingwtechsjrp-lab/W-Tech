-- Fix for "permission denied for table users" in Marketing Campaigns
-- The error occurs because non-admins don't have permission to check references in "auth"."users".
-- We must repoint the foreign keys to the public "SITE_Users" table.

BEGIN;

-- 1. SITE_MarketingCampaigns
DO $$
BEGIN
    -- Drop existing FK to auth.users if it exists
    ALTER TABLE "SITE_MarketingCampaigns" DROP CONSTRAINT IF EXISTS "SITE_MarketingCampaigns_created_by_fkey";
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

ALTER TABLE "SITE_MarketingCampaigns" 
    ADD CONSTRAINT "SITE_MarketingCampaigns_created_by_site_fkey" 
    FOREIGN KEY (created_by) REFERENCES "SITE_Users"(id) ON DELETE SET NULL;


-- 2. SITE_MessageTemplates (Just in case)
DO $$
BEGIN
    ALTER TABLE "SITE_MessageTemplates" DROP CONSTRAINT IF EXISTS "SITE_MessageTemplates_created_by_fkey";
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

ALTER TABLE "SITE_MessageTemplates" 
    ADD CONSTRAINT "SITE_MessageTemplates_created_by_site_fkey" 
    FOREIGN KEY (created_by) REFERENCES "SITE_Users"(id) ON DELETE SET NULL;


-- 3. SITE_MarketingLists (Owner FK)
DO $$
BEGIN
    ALTER TABLE "SITE_MarketingLists" DROP CONSTRAINT IF EXISTS "SITE_MarketingLists_owner_id_fkey";
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

ALTER TABLE "SITE_MarketingLists" 
    ADD CONSTRAINT "SITE_MarketingLists_owner_site_fk" 
    FOREIGN KEY (owner_id) REFERENCES "SITE_Users"(id) ON DELETE SET NULL;


-- 4. Ensure proper permissions on SITE_Users for RLS subqueries
GRANT SELECT ON "SITE_Users" TO authenticated;

-- 4. Update RLS policies to be more permissive for non-admins
-- We already have the policies, but let's ensure they don't break if the subquery returns null
-- (Optional: disable RLS for a moment if still failing, but repointing FK usually fixes it)

COMMIT;
