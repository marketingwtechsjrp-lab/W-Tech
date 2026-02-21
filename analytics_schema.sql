-- Create Page Views Table
CREATE TABLE IF NOT EXISTS "SITE_Analytics_PageViews" (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    path TEXT NOT NULL,
    visitor_id TEXT, -- Anonymous persistent ID (localStorage)
    session_id TEXT, -- Session ID (sessionStorage)
    referrer TEXT,
    user_agent TEXT,
    device_type TEXT, -- 'mobile', 'desktop', 'tablet'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Create Events Table (Clicks, Actions)
CREATE TABLE IF NOT EXISTS "SITE_Analytics_Events" (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    category TEXT NOT NULL, -- e.g., 'Contact', 'Navigation'
    action TEXT NOT NULL,   -- e.g., 'Click WhatsApp', 'View Course'
    label TEXT,             -- e.g., 'Header Button', 'Course ID 123'
    visitor_id TEXT,
    session_id TEXT,
    path TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Create Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_analytics_pageviews_created_at ON "SITE_Analytics_PageViews" (created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_pageviews_path ON "SITE_Analytics_PageViews" (path);
CREATE INDEX IF NOT EXISTS idx_analytics_pageviews_visitor ON "SITE_Analytics_PageViews" (visitor_id);

CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON "SITE_Analytics_Events" (created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_category ON "SITE_Analytics_Events" (category);

-- RLS Policies (Allow Insert Public, Read Admin Only)
ALTER TABLE "SITE_Analytics_PageViews" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SITE_Analytics_Events" ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (tracking)
CREATE POLICY "Public Insert PageViews" ON "SITE_Analytics_PageViews" FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Insert Events" ON "SITE_Analytics_Events" FOR INSERT WITH CHECK (true);

-- Allow Admins to read
CREATE POLICY "Admin Read PageViews" ON "SITE_Analytics_PageViews" FOR SELECT USING (
  auth.role() = 'authenticated' AND (
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (role = 'ADMIN' OR role = 'Super Admin' OR (role::jsonb->>'name')::text IN ('ADMIN', 'Super Admin')))
  )
);

CREATE POLICY "Admin Read Events" ON "SITE_Analytics_Events" FOR SELECT USING (
  auth.role() = 'authenticated' AND (
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (role = 'ADMIN' OR role = 'Super Admin' OR (role::jsonb->>'name')::text IN ('ADMIN', 'Super Admin')))
  )
);
