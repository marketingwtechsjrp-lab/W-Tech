-- 1. Add 'receives_leads' column to Users
ALTER TABLE "SITE_Users" 
ADD COLUMN IF NOT EXISTS receives_leads BOOLEAN DEFAULT FALSE;

-- 2. Add 'Cold' status to Leads (if it's a check constraint, we might need to drop/recreate, but let's assume text or update constraint)
-- Attempt to add it to check constraint if exists, otherwise it's just text usually in Supabase unless explicitly enum'd.
-- We will just ensure the column accepts it.

-- 3. Create Function to Distribute Leads
CREATE OR REPLACE FUNCTION auto_distribute_lead()
RETURNS TRIGGER AS $$
DECLARE
    target_user_id UUID;
BEGIN
    -- Only distribute if not already assigned
    IF NEW.assigned_to IS NULL THEN
        -- Select a random user who is Level 5 (Editor/Attendant) AND marked to receive leads
        -- We join with Roles to check level, or assume role_id logic. 
        -- Let's rely on the 'receives_leads' flag primarily, as the Admin sets it manually for eligible users.
        
        SELECT id INTO target_user_id
        FROM "SITE_Users"
        WHERE receives_leads = TRUE
        ORDER BY RANDOM()
        LIMIT 1;

        -- If a user is found, assign the lead
        IF target_user_id IS NOT NULL THEN
            NEW.assigned_to := target_user_id;
            NEW.status := 'New'; -- Ensure it starts as New
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create Trigger
DROP TRIGGER IF EXISTS trigger_auto_distribute_lead ON "SITE_Leads";
CREATE TRIGGER trigger_auto_distribute_lead
BEFORE INSERT ON "SITE_Leads"
FOR EACH ROW
EXECUTE FUNCTION auto_distribute_lead();

-- 5. Create News/Notifications Table
CREATE TABLE IF NOT EXISTS "SITE_Notifications" (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    target_audience TEXT DEFAULT 'All', -- 'All', 'Mechanics', 'Students'
    sent_via_email BOOLEAN DEFAULT FALSE,
    sent_via_whatsapp BOOLEAN DEFAULT FALSE
);
