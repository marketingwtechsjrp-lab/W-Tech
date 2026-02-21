
-- Garantir que as colunas de estatísticas e imagens existam
ALTER TABLE IF EXISTS "SITE_MarketingCampaigns" ADD COLUMN IF NOT EXISTS "total_recipients" INTEGER DEFAULT 0;
ALTER TABLE IF EXISTS "SITE_MarketingCampaigns" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;
ALTER TABLE IF EXISTS "SITE_MarketingCampaigns" ADD COLUMN IF NOT EXISTS "content2" TEXT;
ALTER TABLE IF EXISTS "SITE_MarketingCampaigns" ADD COLUMN IF NOT EXISTS "stats" JSONB DEFAULT '{"sent": 0, "failed": 0, "total": 0}'::jsonb;

ALTER TABLE IF EXISTS "SITE_MessageTemplates" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;
ALTER TABLE IF EXISTS "SITE_MessageTemplates" ADD COLUMN IF NOT EXISTS "content2" TEXT;

-- Garantir que a fila tenha os campos necessários
ALTER TABLE IF EXISTS "SITE_CampaignQueue" ADD COLUMN IF NOT EXISTS "sent_at" TIMESTAMP WITH TIME ZONE;
ALTER TABLE IF EXISTS "SITE_CampaignQueue" ADD COLUMN IF NOT EXISTS "error_message" TEXT;
ALTER TABLE IF EXISTS "SITE_CampaignQueue" ADD COLUMN IF NOT EXISTS "recipient_data" JSONB DEFAULT '{}'::jsonb;
