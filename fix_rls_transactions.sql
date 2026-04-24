-- Enable RLS
ALTER TABLE "SITE_Transactions" ENABLE ROW LEVEL SECURITY;

-- Re-create Policy
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON "SITE_Transactions";
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON "SITE_Transactions";
DROP POLICY IF EXISTS "Enable select for authenticated users" ON "SITE_Transactions";
DROP POLICY IF EXISTS "Enable update for authenticated users" ON "SITE_Transactions";
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON "SITE_Transactions";

CREATE POLICY "Enable all access for authenticated users" ON "SITE_Transactions"
    FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Grant permissions to authenticated role just in case
GRANT ALL ON "SITE_Transactions" TO authenticated;
GRANT ALL ON "SITE_Transactions" TO service_role;
