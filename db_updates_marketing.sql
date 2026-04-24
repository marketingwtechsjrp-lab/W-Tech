-- Marketing Module Database Migration
-- Includes Support for WhatsApp & Email, Dynamic Lists, and Throttling Queue

-- 1. Marketing Lists (Groups of Leads/Users)
CREATE TABLE IF NOT EXISTS "SITE_MarketingLists" (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    owner_id UUID REFERENCES "SITE_Users"(id), -- Link to custom auth table
    type TEXT DEFAULT 'Static', -- 'Static' (Manual add), 'Dynamic' (Filtered by rules)
    rules JSONB DEFAULT '{}'::jsonb, -- dynamic filters e.g. { "status": "Converted", "course_id": "..." }
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Marketing List Members (Linking Leads to Lists)
CREATE TABLE IF NOT EXISTS "SITE_MarketingListMembers" (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    list_id UUID REFERENCES "SITE_MarketingLists"(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES "SITE_Leads"(id) ON DELETE SET NULL, -- specific lead link
    name TEXT, -- cache name for speed
    phone TEXT, -- cache phone for WhatsApp
    email TEXT, -- cache email
    custom_data JSONB DEFAULT '{}'::jsonb, -- extra vars for templates
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(list_id, lead_id),
    UNIQUE(list_id, email), -- avoid dups in same list by email
    UNIQUE(list_id, phone) -- avoid dups by phone
);

-- 3. Unified Marketing Campaigns (Replaces SITE_EmailCampaigns concepts)
CREATE TABLE IF NOT EXISTS "SITE_MarketingCampaigns" (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    channel TEXT NOT NULL, -- 'WhatsApp', 'Email', 'SMS'
    status TEXT DEFAULT 'Draft', -- 'Draft', 'Scheduled', 'Processing', 'Completed', 'Paused'
    
    -- Content
    template_id UUID REFERENCES "SITE_MessageTemplates"(id),
    subject TEXT, -- For Email (or WhatsApp Summary)
    content TEXT, -- Overrides template if set
    
    -- Target
    list_id UUID REFERENCES "SITE_MarketingLists"(id),
    target_audience_summary TEXT, -- e.g. "All Leads from SP"
    
    -- Scheduling & Throttling
    scheduled_for TIMESTAMP WITH TIME ZONE,
    throttling_settings JSONB DEFAULT '{"delay_seconds": 180, "batch_size": 1}'::jsonb,
    
    -- Stats
    total_recipients INT DEFAULT 0,
    stats_sent INT DEFAULT 0,
    stats_failed INT DEFAULT 0,
    stats_read INT DEFAULT 0,
    
    created_by UUID REFERENCES "SITE_Users"(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Campaign Queue (The "Outbox" for throttling)
CREATE TABLE IF NOT EXISTS "SITE_CampaignQueue" (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id UUID REFERENCES "SITE_MarketingCampaigns"(id) ON DELETE CASCADE,
    
    -- Recipient Info (Snapshot)
    recipient_name TEXT,
    recipient_phone TEXT,
    recipient_email TEXT,
    recipient_data JSONB, -- Context variables for template replacement
    
    status TEXT DEFAULT 'Pending', -- 'Pending', 'Sent', 'Failed', 'Skipped'
    error_message TEXT,
    
    scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- When this specific msg should fly (customizable per user if needed)
    sent_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Update Message Templates to support more metadata (Optional, mostly frontend handled)
ALTER TABLE "SITE_MessageTemplates" ADD COLUMN IF NOT EXISTS variables TEXT[]; -- Array of expected vars e.g. ['name', 'course']

-- 6. Permissions (Disable RLS for Custom Auth)
ALTER TABLE "SITE_MarketingLists" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "SITE_MarketingListMembers" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "SITE_MarketingCampaigns" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "SITE_CampaignQueue" DISABLE ROW LEVEL SECURITY;

-- Grants
GRANT ALL ON "SITE_MarketingLists" TO anon, authenticated, service_role;
GRANT ALL ON "SITE_MarketingListMembers" TO anon, authenticated, service_role;
GRANT ALL ON "SITE_MarketingCampaigns" TO anon, authenticated, service_role;
GRANT ALL ON "SITE_CampaignQueue" TO anon, authenticated, service_role;

-- Indexes for Speed
CREATE INDEX IF NOT EXISTS idx_campaign_status ON "SITE_MarketingCampaigns"(status);
CREATE INDEX IF NOT EXISTS idx_queue_campaign ON "SITE_CampaignQueue"(campaign_id);
CREATE INDEX IF NOT EXISTS idx_queue_status ON "SITE_CampaignQueue"(status);
CREATE INDEX IF NOT EXISTS idx_list_members_list ON "SITE_MarketingListMembers"(list_id);
