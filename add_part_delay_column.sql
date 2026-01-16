-- Add part_delay column to SITE_MarketingCampaigns and SITE_MessageTemplates
ALTER TABLE "SITE_MarketingCampaigns" ADD COLUMN IF NOT EXISTS part_delay INTEGER DEFAULT 0;
ALTER TABLE "SITE_MessageTemplates" ADD COLUMN IF NOT EXISTS part_delay INTEGER DEFAULT 0;

COMMENT ON COLUMN "SITE_MarketingCampaigns".part_delay IS 'Interval in seconds between message parts (Text -> Image -> Text)';
COMMENT ON COLUMN "SITE_MessageTemplates".part_delay IS 'Interval in seconds between message parts (Text -> Image -> Text)';
