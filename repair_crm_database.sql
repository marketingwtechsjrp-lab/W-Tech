-- FIX CRM DATABASE - UNBLOCK LEADS
-- Run this script in your Supabase SQL Editor to fix the "Foreign Key Violation" error.

-- 1. Drop the strict Foreign Key constraint that blocks leads with no owner ("assigned_to" = null)
--    The error previously seen was: violates foreign key constraint "SITE_Leads_assigned_to_fkey"
ALTER TABLE "public"."SITE_Leads" DROP CONSTRAINT IF EXISTS "SITE_Leads_assigned_to_fkey";

-- 2. Ensure the "assigned_to" column allows NULL values (just in case it was set to NOT NULL)
ALTER TABLE "public"."SITE_Leads" ALTER COLUMN "assigned_to" DROP NOT NULL;

-- 3. Ensure the ID column generates a UUID automatically if not provided
--    (Safe to run even if already set)
ALTER TABLE "public"."SITE_Leads" ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- 4. FORCE OPEN PERMISSIONS for "SITE_Leads"
--    This ensures that guest users (anonymous) can Insert rows.
ALTER TABLE "public"."SITE_Leads" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts/duplicates
DROP POLICY IF EXISTS "Public Insert" ON "public"."SITE_Leads";
DROP POLICY IF EXISTS "Public Update" ON "public"."SITE_Leads";
DROP POLICY IF EXISTS "Public Select" ON "public"."SITE_Leads";
DROP POLICY IF EXISTS "Enable insert for everyone" ON "public"."SITE_Leads";
DROP POLICY IF EXISTS "Enable update for everyone" ON "public"."SITE_Leads";

-- Create permissive policies
CREATE POLICY "Public Insert" ON "public"."SITE_Leads" FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update" ON "public"."SITE_Leads" FOR UPDATE USING (true);
CREATE POLICY "Public Select" ON "public"."SITE_Leads" FOR SELECT USING (true);

-- Grant Table Permissions
GRANT ALL ON TABLE "public"."SITE_Leads" TO anon;
GRANT ALL ON TABLE "public"."SITE_Leads" TO authenticated;
GRANT ALL ON TABLE "public"."SITE_Leads" TO service_role;
