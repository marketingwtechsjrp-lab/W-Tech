-- FIX PERMISSIONS FOR ANONYMOUS UPDATE ON LEADS
-- This is required for the Quiz flow to update the lead with results after initial capture.

-- 1. Grant UPDATE to Anon (Required for updating the lead after quiz completion)
GRANT UPDATE ON TABLE "public"."SITE_Leads" TO anon;

-- 2. Create RLS Policy to allow anon to update rows they just created (based on ID match)
--    Note: Since anon doesn't have a user ID, we rely on the client having the UUID.
--    This is a permissive policy for UPDATE. For higher security, use the RPC function below.
DROP POLICY IF EXISTS "Enable update for everyone" ON "public"."SITE_Leads";
CREATE POLICY "Enable update for everyone" ON "public"."SITE_Leads" FOR UPDATE USING (true);


-- OPTIONAL: Secure RPC Function (Recommended if you want to disable direct UPDATE later)
CREATE OR REPLACE FUNCTION update_quiz_lead(
  lead_id uuid,
  new_context text,
  new_tags text[],
  quiz_result jsonb
) RETURNS void AS $$
BEGIN
  UPDATE "SITE_Leads"
  SET 
    type = 'Quiz_Completed',
    context_id = new_context,
    tags = new_tags,
    quiz_data = quiz_result
  WHERE id = lead_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
