-- Add missing columns to SITE_Leads to fix form submissions and CRM logic

-- 1. Add 'origin' column (required for tracking lead source URL)
ALTER TABLE "public"."SITE_Leads" ADD COLUMN IF NOT EXISTS "origin" text;

-- 2. Add 'assigned_to' column (required by CRM distribution triggers and logic)
ALTER TABLE "public"."SITE_Leads" ADD COLUMN IF NOT EXISTS "assigned_to" uuid REFERENCES auth.users(id);

-- 3. Add 'tags' column if it doesn't exist (used for classification)
ALTER TABLE "public"."SITE_Leads" ADD COLUMN IF NOT EXISTS "tags" text[] DEFAULT '{}';

-- 4. Add 'internal_notes' column if it doesn't exist (used for CRM notes)
ALTER TABLE "public"."SITE_Leads" ADD COLUMN IF NOT EXISTS "internal_notes" text;

-- 5. Ensure context_id exists
ALTER TABLE "public"."SITE_Leads" ADD COLUMN IF NOT EXISTS "context_id" text;

-- 6. Grant permissions to anonymous users to insert into SITE_Leads (for public forms)
-- Note: You might want to restrict this further, but for a public contact form, this is needed.
GRANT INSERT ON TABLE "public"."SITE_Leads" TO anon;
GRANT INSERT ON TABLE "public"."SITE_Leads" TO authenticated;

-- 7. Fix RLS Policy for Inserting
-- Ensure there is a policy allowing anon inserts.
DROP POLICY IF EXISTS "Enable insert for everyone" ON "public"."SITE_Leads";
CREATE POLICY "Enable insert for everyone" ON "public"."SITE_Leads" FOR INSERT WITH CHECK (true);

-- 8. Fix RLS Policy for Selecting (so Admins can see)
-- This assumes you have an admin check function or similar. For now, we ensure authenticated can read.
-- (Adjust strictly if needed, but this unblocks the CRM)
CREATE POLICY "Enable read access for authenticated users" ON "public"."SITE_Leads" FOR SELECT USING (auth.role() = 'authenticated');
