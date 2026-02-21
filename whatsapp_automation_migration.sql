-- 1. Create table for User Integrations (Individual WhatsApp Connections)
CREATE TABLE IF NOT EXISTS "SITE_UserIntegrations" (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL, -- Link to Supabase Auth User (using text ID usually stored as UUID in auth.users, but here we can just store the string ID from public.users if custom, or auth.users)
    instance_name TEXT NOT NULL,
    instance_id TEXT, -- Optional, Evolution API ID
    instance_token TEXT, -- Optional
    instance_status TEXT DEFAULT 'disconnected', -- 'connecting', 'open', 'disconnected'
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id) -- One integration per user for now
);

-- Enable RLS for Integrations
ALTER TABLE "SITE_UserIntegrations" ENABLE ROW LEVEL SECURITY;
-- Allow public access for now (Simplifies development, refine later)
DROP POLICY IF EXISTS "Public Access UserIntegrations" ON "SITE_UserIntegrations";
CREATE POLICY "Public Access UserIntegrations" ON "SITE_UserIntegrations" FOR ALL USING (true) WITH CHECK (true);


-- 2. Create table for Message Templates
CREATE TABLE IF NOT EXISTS "SITE_MessageTemplates" (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_by TEXT, -- Stores user ID/Email
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for Templates
ALTER TABLE "SITE_MessageTemplates" ENABLE ROW LEVEL SECURITY;
-- Allow public access
DROP POLICY IF EXISTS "Public Access Templates" ON "SITE_MessageTemplates";
CREATE POLICY "Public Access Templates" ON "SITE_MessageTemplates" FOR ALL USING (true) WITH CHECK (true);


-- 3. Update Tasks table to support Automation/Scheduling
ALTER TABLE "SITE_Tasks"
ADD COLUMN IF NOT EXISTS is_whatsapp_schedule BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS whatsapp_message_body TEXT,
ADD COLUMN IF NOT EXISTS whatsapp_template_id UUID REFERENCES "SITE_MessageTemplates"(id),
ADD COLUMN IF NOT EXISTS whatsapp_status TEXT DEFAULT 'PENDING', -- 'PENDING', 'SENT', 'FAILED'
ADD COLUMN IF NOT EXISTS whatsapp_media_url TEXT;
