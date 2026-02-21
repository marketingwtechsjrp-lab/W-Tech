-- Create SITE_Events Table
CREATE TABLE IF NOT EXISTS "SITE_Events" (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    date TIMESTAMP WITH TIME ZONE,
    location TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Enable RLS for SITE_Events
ALTER TABLE "SITE_Events" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON "SITE_Events";
CREATE POLICY "Enable all access for authenticated users" ON "SITE_Events"
    FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Update SITE_Transactions Table
DO $$
BEGIN
    -- Add course_id if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'SITE_Transactions' AND column_name = 'course_id') THEN
        ALTER TABLE "SITE_Transactions" ADD COLUMN course_id UUID REFERENCES "SITE_Courses"(id) ON DELETE SET NULL;
    END IF;

    -- Add event_id if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'SITE_Transactions' AND column_name = 'event_id') THEN
        ALTER TABLE "SITE_Transactions" ADD COLUMN event_id UUID REFERENCES "SITE_Events"(id) ON DELETE SET NULL;
    END IF;
END $$;
