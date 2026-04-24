
-- Ensure table exists directly
CREATE TABLE IF NOT EXISTS "SITE_SystemSettings" (
    key TEXT PRIMARY KEY,
    value TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE "SITE_SystemSettings" ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Public Read Settings" ON "SITE_SystemSettings";
CREATE POLICY "Public Read Settings" ON "SITE_SystemSettings" FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin Full Access Settings" ON "SITE_SystemSettings";
CREATE POLICY "Admin Full Access Settings" ON "SITE_SystemSettings" FOR ALL USING (true) WITH CHECK (true);

-- Insert Defaults (including new contact fields)
INSERT INTO "SITE_SystemSettings" (key, value) VALUES
('site_title', 'W-TECH Brasil'),
('primary_color', '#D4AF37'),
('secondary_color', '#111111'),
('whatsapp_enabled', 'false'),
('whatsapp_phone', ''),
('cnpj', ''),
('address', ''),
('phone_main', ''),
('email_contato', ''),
('instagram', ''),
('facebook', ''),
('linkedin', ''),
('logo_url', '')
ON CONFLICT (key) DO NOTHING;

-- Force Schema Reload
NOTIFY pgrst, 'reload config';
