-- Add RLS to SITE_MarketingCampaigns to restrict access by user
ALTER TABLE "SITE_MarketingCampaigns" ENABLE ROW LEVEL SECURITY;

-- 1. Users can view their own campaigns OR all campaigns if admin
DROP POLICY IF EXISTS "Users can view own campaigns" ON "SITE_MarketingCampaigns";
CREATE POLICY "Users can view own campaigns" ON "SITE_MarketingCampaigns"
FOR SELECT
USING (
    created_by = auth.uid() 
    OR 
    (SELECT role FROM "SITE_Users" WHERE id = auth.uid()) IN ('admin', 'super_admin')
);

-- 2. Users can insert their own campaigns
DROP POLICY IF EXISTS "Users can insert own campaigns" ON "SITE_MarketingCampaigns";
CREATE POLICY "Users can insert own campaigns" ON "SITE_MarketingCampaigns"
FOR INSERT
WITH CHECK (
    auth.uid() = created_by 
    OR 
    (SELECT role FROM "SITE_Users" WHERE id = auth.uid()) IN ('admin', 'super_admin')
);

-- 3. Users can update their own campaigns
DROP POLICY IF EXISTS "Users can update own campaigns" ON "SITE_MarketingCampaigns";
CREATE POLICY "Users can update own campaigns" ON "SITE_MarketingCampaigns"
FOR UPDATE
USING (
    created_by = auth.uid()
    OR 
    (SELECT role FROM "SITE_Users" WHERE id = auth.uid()) IN ('admin', 'super_admin')
);

-- 4. Users can delete their own campaigns
DROP POLICY IF EXISTS "Users can delete own campaigns" ON "SITE_MarketingCampaigns";
CREATE POLICY "Users can delete own campaigns" ON "SITE_MarketingCampaigns"
FOR DELETE
USING (
    created_by = auth.uid()
    OR 
    (SELECT role FROM "SITE_Users" WHERE id = auth.uid()) IN ('admin', 'super_admin')
);
