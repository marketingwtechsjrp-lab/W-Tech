
-- Check columns for SITE_Leads
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'SITE_Leads';

-- Add updated_at if it does not exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'SITE_Leads' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE "public"."SITE_Leads" ADD COLUMN "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());
    END IF;
END
$$;

-- Force schema cache reload (usually happens on DDL, but good to ensure permissions too)
GRANT ALL ON TABLE "public"."SITE_Leads" TO postgres, anon, authenticated, service_role;
