-- FIX: Permissions & Foreign Keys for Marketing Module
-- 1. Disables RLS (since we use custom Auth and not Supabase Auth)
-- 2. Changes Foreign Keys to point to 'SITE_Users' instead of 'auth.users' (fixing "permission denied for table users")

-- A. Disable RLS
ALTER TABLE "SITE_MarketingLists" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "SITE_MarketingListMembers" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "SITE_MarketingCampaigns" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "SITE_CampaignQueue" DISABLE ROW LEVEL SECURITY;

-- B. Fix Foreign Keys (Point to SITE_Users, not auth.users)

-- 1. MarketingLists: owner_id
DO $$ 
BEGIN 
  -- Try to drop the old constraint if it exists (standard naming)
  ALTER TABLE "SITE_MarketingLists" DROP CONSTRAINT IF EXISTS "SITE_MarketingLists_owner_id_fkey";
EXCEPTION 
  WHEN undefined_object THEN NULL; 
END $$;

-- Add new constraint to SITE_Users
ALTER TABLE "SITE_MarketingLists" 
  ADD CONSTRAINT "SITE_MarketingLists_owner_id_fkey" 
  FOREIGN KEY (owner_id) REFERENCES "SITE_Users"(id) ON DELETE SET NULL;


-- 2. MarketingCampaigns: created_by
DO $$ 
BEGIN 
  ALTER TABLE "SITE_MarketingCampaigns" DROP CONSTRAINT IF EXISTS "SITE_MarketingCampaigns_created_by_fkey";
EXCEPTION 
  WHEN undefined_object THEN NULL; 
END $$;

ALTER TABLE "SITE_MarketingCampaigns" 
  ADD CONSTRAINT "SITE_MarketingCampaigns_created_by_fkey" 
  FOREIGN KEY (created_by) REFERENCES "SITE_Users"(id) ON DELETE SET NULL;


-- C. Grants (Ensure Anonymous/Service Role can access)
GRANT ALL ON "SITE_MarketingLists" TO anon, authenticated, service_role;
GRANT ALL ON "SITE_MarketingListMembers" TO anon, authenticated, service_role;
GRANT ALL ON "SITE_MarketingCampaigns" TO anon, authenticated, service_role;
GRANT ALL ON "SITE_CampaignQueue" TO anon, authenticated, service_role;
