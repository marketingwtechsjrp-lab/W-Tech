
-- Fix Foreign Key on SITE_Tasks to allow cascading delete of leads
-- This ensures that when a lead is deleted, all its associated tasks are also deleted,
-- preventing foreign key violation errors.

DO $$
BEGIN
    -- Check if the constraint exists (assuming standard naming convention)
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SITE_Tasks_lead_id_fkey') THEN
        ALTER TABLE "SITE_Tasks" DROP CONSTRAINT "SITE_Tasks_lead_id_fkey";
    END IF;

    -- Also check for other potential names just in case (e.g. if it was named manually unrelatedly)
    -- But for now we assume standard naming from the previous ALTER TABLE

    -- Add the constraint with ON DELETE CASCADE
    ALTER TABLE "SITE_Tasks" 
    ADD CONSTRAINT "SITE_Tasks_lead_id_fkey" 
    FOREIGN KEY ("lead_id") 
    REFERENCES "SITE_Leads"("id") 
    ON DELETE CASCADE;
END $$;
