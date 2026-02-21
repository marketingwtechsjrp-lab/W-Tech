-- Add new columns to SITE_Leads for CRM enhancement
ALTER TABLE "SITE_Leads" ADD COLUMN IF NOT EXISTS assigned_to TEXT;
ALTER TABLE "SITE_Leads" ADD COLUMN IF NOT EXISTS internal_notes TEXT;

-- Verify columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'SITE_Leads';
