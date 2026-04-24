-- Enable UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Table: Email Campaigns
CREATE TABLE IF NOT EXISTS "SITE_EmailCampaigns" (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    name TEXT NOT NULL, -- Internal Name
    subject TEXT NOT NULL,
    content TEXT, -- HTML Body
    type TEXT, -- 'Newsletter', 'Course_Announcement', 'Post_Notification', 'Custom'
    target_audience TEXT, -- 'All', 'Students', 'Leads', 'Subscribers'
    status TEXT DEFAULT 'Draft', -- 'Draft', 'Scheduled', 'Sending', 'Sent', 'Failed'
    scheduled_at TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    stats_sent INT DEFAULT 0,
    stats_opened INT DEFAULT 0,
    stats_clicked INT DEFAULT 0
);

-- 2. Table: Email Logs (Individual sends)
CREATE TABLE IF NOT EXISTS "SITE_EmailLogs" (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    campaign_id UUID REFERENCES "SITE_EmailCampaigns"(id),
    recipient_email TEXT,
    status TEXT, -- 'Sent', 'Failed', 'Opened'
    error_message TEXT
);

-- 3. Add Settings for Email (Insert if not exist)
-- Ensure columns exist first
ALTER TABLE "SITE_SystemSettings" ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE "SITE_SystemSettings" ADD COLUMN IF NOT EXISTS category TEXT;

-- We use unique constraints to avoid duplicates if re-run
INSERT INTO "SITE_SystemSettings" (key, value, description, category) 
VALUES 
    ('email_smtp_host', 'smtp.example.com', 'Servidor SMTP', 'Email'),
    ('email_smtp_port', '587', 'Porta SMTP', 'Email'),
    ('email_smtp_user', 'user@example.com', 'Usuário SMTP', 'Email'),
    ('email_smtp_pass', '', 'Senha SMTP', 'Email'),
    ('email_sender_name', 'W-Tech Brasil', 'Nome do Remetente', 'Email'),
    ('email_sender_email', 'contato@wtech.com', 'Email do Remetente', 'Email')
ON CONFLICT (key) DO NOTHING;

-- 4. RLS Policies
ALTER TABLE "SITE_EmailCampaigns" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Read Campaigns" ON "SITE_EmailCampaigns" FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE "SITE_EmailLogs" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Read Logs" ON "SITE_EmailLogs" FOR ALL USING (true) WITH CHECK (true);
