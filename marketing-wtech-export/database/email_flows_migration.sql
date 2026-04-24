-- =====================================================
-- Email Automation Flows - Migration
-- Run in Supabase SQL Editor
-- =====================================================

-- 1. Email Flows (Main Flow Definition)
CREATE TABLE IF NOT EXISTS "SITE_EmailFlows" (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    trigger_type TEXT NOT NULL DEFAULT 'Manual',
    -- trigger_type options:
    -- 'NovoCadastro', 'Inatividade', 'CompraRecente', 
    -- 'CliqueLinkEspecifico', 'Tag', 'Segmento', 'Manual'
    trigger_config JSONB DEFAULT '{}',
    -- Example: { "inactivity_days": 30, "tag": "BMW", "link_url": "..." }
    exit_conditions JSONB DEFAULT '[]',
    -- Example: [{"type": "converted"}, {"type": "clicked_any"}]
    status TEXT DEFAULT 'Draft',
    -- 'Active', 'Paused', 'Draft'
    tags TEXT[] DEFAULT '{}',
    stats JSONB DEFAULT '{"enrolled": 0, "active": 0, "completed": 0, "exited": 0, "open_rate": 0, "click_rate": 0}',
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Flow Steps (Each step in a flow)
CREATE TABLE IF NOT EXISTS "SITE_FlowSteps" (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    flow_id UUID NOT NULL REFERENCES "SITE_EmailFlows"(id) ON DELETE CASCADE,
    step_order INT NOT NULL,
    type TEXT NOT NULL,
    -- 'Email', 'Delay', 'Condition', 'Exit'
    config JSONB DEFAULT '{}',
    -- For Email: { "subject": "...", "preview_text": "...", "body": "...", "from_name": "...", "from_email": "..." }
    -- For Delay: { "value": 2, "unit": "days" }  -- unit: "hours" | "days"
    -- For Condition: { "condition_type": "opened_email" | "clicked_link" | "has_tag", "branch_yes_label": "Sim", "branch_no_label": "Não" }
    -- For Exit: { "reason": "Converteu" }
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Flow Enrollments (Contact tracking per flow)
CREATE TABLE IF NOT EXISTS "SITE_FlowEnrollments" (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    flow_id UUID NOT NULL REFERENCES "SITE_EmailFlows"(id) ON DELETE CASCADE,
    contact_email TEXT NOT NULL,
    contact_name TEXT,
    current_step_order INT DEFAULT 0,
    status TEXT DEFAULT 'Active',
    -- 'Active', 'Completed', 'Exited', 'Failed'
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    next_run_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    -- Stores: { "opened_steps": [1,2], "clicked_steps": [2], "exit_reason": "..." }
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_flow_steps_flow_id ON "SITE_FlowSteps"(flow_id, step_order);
CREATE INDEX IF NOT EXISTS idx_flow_enrollments_flow_id ON "SITE_FlowEnrollments"(flow_id);
CREATE INDEX IF NOT EXISTS idx_flow_enrollments_status ON "SITE_FlowEnrollments"(status);
CREATE INDEX IF NOT EXISTS idx_flow_enrollments_next_run ON "SITE_FlowEnrollments"(next_run_at) WHERE status = 'Active';

-- 5. RLS Policies
ALTER TABLE "SITE_EmailFlows" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on EmailFlows" ON "SITE_EmailFlows";
CREATE POLICY "Allow all on EmailFlows" ON "SITE_EmailFlows" FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE "SITE_FlowSteps" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on FlowSteps" ON "SITE_FlowSteps";
CREATE POLICY "Allow all on FlowSteps" ON "SITE_FlowSteps" FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE "SITE_FlowEnrollments" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on FlowEnrollments" ON "SITE_FlowEnrollments";
CREATE POLICY "Allow all on FlowEnrollments" ON "SITE_FlowEnrollments" FOR ALL USING (true) WITH CHECK (true);

-- 6. Updated_at trigger function (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 7. Apply trigger
DROP TRIGGER IF EXISTS update_email_flows_updated_at ON "SITE_EmailFlows";
CREATE TRIGGER update_email_flows_updated_at
    BEFORE UPDATE ON "SITE_EmailFlows"
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_flow_enrollments_updated_at ON "SITE_FlowEnrollments";
CREATE TRIGGER update_flow_enrollments_updated_at
    BEFORE UPDATE ON "SITE_FlowEnrollments"
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
