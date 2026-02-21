-- Add fake_alerts_enabled column to SITE_LandingPages
ALTER TABLE "SITE_LandingPages" ADD COLUMN IF NOT EXISTS fake_alerts_enabled BOOLEAN DEFAULT FALSE;
