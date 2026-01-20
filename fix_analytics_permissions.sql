-- FIX ANALYTICS PERMISSIONS & RLS
-- Allows public tracking (INSERT) and admin viewing (SELECT)

BEGIN;

-- 1. Ensure RLS is enabled
ALTER TABLE "SITE_Analytics_PageViews" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SITE_Analytics_Events" ENABLE ROW LEVEL SECURITY;

-- 2. Allow PUBLIC INSERT (Tracking needs to work for everyone, even unauthenticated)
DROP POLICY IF EXISTS "Public Insert PageViews" ON "SITE_Analytics_PageViews";
CREATE POLICY "Public Insert PageViews" ON "SITE_Analytics_PageViews" 
    FOR INSERT 
    TO public 
    WITH CHECK (true);

DROP POLICY IF EXISTS "Public Insert Events" ON "SITE_Analytics_Events";
CREATE POLICY "Public Insert Events" ON "SITE_Analytics_Events" 
    FOR INSERT 
    TO public 
    WITH CHECK (true);

-- 3. Allow ADMIN SELECT (Viewing reports)
-- We'll allow 'authenticated' users to view for simplicity in the panel, 
-- or you can restrict further if needed.
DROP POLICY IF EXISTS "Authenticated Read PageViews" ON "SITE_Analytics_PageViews";
CREATE POLICY "Authenticated Read PageViews" ON "SITE_Analytics_PageViews" 
    FOR SELECT 
    TO authenticated 
    USING (true);

DROP POLICY IF EXISTS "Authenticated Read Events" ON "SITE_Analytics_Events";
CREATE POLICY "Authenticated Read Events" ON "SITE_Analytics_Events" 
    FOR SELECT 
    TO authenticated 
    USING (true);

-- 4. Grant Permissions on Table Level (Crucial step often missed)
GRANT INSERT ON "SITE_Analytics_PageViews" TO anon, authenticated, public;
GRANT INSERT ON "SITE_Analytics_Events" TO anon, authenticated, public;

GRANT SELECT ON "SITE_Analytics_PageViews" TO authenticated;
GRANT SELECT ON "SITE_Analytics_Events" TO authenticated;

COMMIT;
