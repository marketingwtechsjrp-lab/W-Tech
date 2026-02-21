-- 1. Sequences (Automations)
CREATE TABLE IF NOT EXISTS "SITE_EmailSequences" (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    trigger_type TEXT DEFAULT 'Manual', -- 'OnSignup', 'Manual'
    status TEXT DEFAULT 'Draft', -- 'Active', 'Draft', 'Paused'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Steps within a Sequence
CREATE TABLE IF NOT EXISTS "SITE_SequenceSteps" (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    sequence_id UUID REFERENCES "SITE_EmailSequences"(id) ON DELETE CASCADE,
    step_order INT NOT NULL,
    type TEXT NOT NULL, -- 'Email', 'Delay'
    
    -- For Delay
    delay_value INT DEFAULT 0,
    delay_unit TEXT DEFAULT 'Days', -- 'Hours', 'Days'
    
    -- For Email
    email_subject TEXT,
    email_content TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Enrollments (Who is in the sequence and where)
CREATE TABLE IF NOT EXISTS "SITE_SequenceEnrollments" (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    sequence_id UUID REFERENCES "SITE_EmailSequences"(id) ON DELETE CASCADE,
    user_email TEXT NOT NULL,
    current_step_order INT DEFAULT 0, -- Points to the step they just finished or are waiting on
    next_execution_at TIMESTAMP WITH TIME ZONE, -- When the next step should run
    status TEXT DEFAULT 'Active', -- 'Active', 'Completed', 'Cancelled'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. RLS
ALTER TABLE "SITE_EmailSequences" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Read Sequences" ON "SITE_EmailSequences" FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE "SITE_SequenceSteps" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Read Steps" ON "SITE_SequenceSteps" FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE "SITE_SequenceEnrollments" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Read Enrollments" ON "SITE_SequenceEnrollments" FOR ALL USING (true) WITH CHECK (true);
