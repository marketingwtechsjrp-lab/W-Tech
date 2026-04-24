-- 1. FIX KANBAN STATUS CONSTRAINT
-- Check if the constraint exists and drop it to update
ALTER TABLE "SITE_Sales" DROP CONSTRAINT IF EXISTS "SITE_Sales_status_check";

-- Re-add with ALL statuses including the new ones
ALTER TABLE "SITE_Sales" ADD CONSTRAINT "SITE_Sales_status_check" 
CHECK (status IN ('negotiation', 'approved', 'pending', 'paid', 'producing', 'shipped', 'delivered', 'cancelled'));


-- 2. ENHANCE MECHANICS TABLE (CREDENCIADOS)
-- Ensure SITE_Mechanics also has assigned_to to maintain the link from CRM
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'SITE_Mechanics' AND column_name = 'assigned_to') THEN
        ALTER TABLE "SITE_Mechanics" ADD COLUMN assigned_to UUID REFERENCES auth.users(id);
    END IF;
END $$;

-- 3. ENSURE SITE_LEADS HAS THE COLUMN (JUST IN CASE)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'SITE_Leads' AND column_name = 'assigned_to') THEN
        ALTER TABLE "SITE_Leads" ADD COLUMN assigned_to UUID REFERENCES auth.users(id);
    END IF;
END $$;
