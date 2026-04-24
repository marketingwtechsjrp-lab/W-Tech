-- Migration: Enhance SITE_Leads with Ownership and Details
-- Author: Antigravity
-- Date: 2026-01-28

-- 1. Add assigned_to column (Attendant)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'SITE_Leads' AND column_name = 'assigned_to') THEN
        ALTER TABLE "SITE_Leads" ADD COLUMN assigned_to UUID REFERENCES auth.users(id);
    END IF;
END $$;

-- 2. Add Client Details
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'SITE_Leads' AND column_name = 'address') THEN
        ALTER TABLE "SITE_Leads" ADD COLUMN address TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'SITE_Leads' AND column_name = 'birth_date') THEN
        ALTER TABLE "SITE_Leads" ADD COLUMN birth_date DATE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'SITE_Leads' AND column_name = 't_shirt_size') THEN
        ALTER TABLE "SITE_Leads" ADD COLUMN t_shirt_size TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'SITE_Leads' AND column_name = 'workshop_details') THEN
        ALTER TABLE "SITE_Leads" ADD COLUMN workshop_details JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- 3. Create Index for faster filtering by attendant
CREATE INDEX IF NOT EXISTS idx_site_leads_assigned_to ON "SITE_Leads"(assigned_to);

-- Note: RLS policies are handled in secure_leads_rls.sql
