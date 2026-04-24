-- Create Settings Table if not exists
CREATE TABLE IF NOT EXISTS "SITE_SystemSettings" (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    key TEXT UNIQUE,
    value JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert Default Distribution Mode if not exists
INSERT INTO "SITE_SystemSettings" (key, value)
VALUES ('crm_distribution_mode', '"Manual"')
ON CONFLICT (key) DO NOTHING;

-- Ensure Leads have assigned_to
ALTER TABLE "SITE_Leads" ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id);
