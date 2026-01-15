
-- Update Message Templates
ALTER TABLE IF EXISTS "SITE_MessageTemplates" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;
ALTER TABLE IF EXISTS "SITE_MessageTemplates" ADD COLUMN IF NOT EXISTS "content2" TEXT;

-- Update Marketing Campaigns
ALTER TABLE IF EXISTS "SITE_MarketingCampaigns" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;
ALTER TABLE IF EXISTS "SITE_MarketingCampaigns" ADD COLUMN IF NOT EXISTS "content2" TEXT;
