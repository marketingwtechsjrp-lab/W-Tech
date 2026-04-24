-- REVERT/FIX FOR SECURITY HARDENING:
-- Since the application manages authentication internally (localStorage + SITE_Users) 
-- without using Supabase Auth JWTs, all queries naturally execute under the 'anon' Postgres role.
-- These tables must allow 'anon' to read/write for the Admin Panel to be able to save data.

BEGIN;

-- 1. FIX SITE_LandingPages
DROP POLICY IF EXISTS "Admin access LPs" ON "public"."SITE_LandingPages";
CREATE POLICY "Admin access LPs anon" ON "public"."SITE_LandingPages"
    FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- 2. FIX SITE_Transactions
DROP POLICY IF EXISTS "Only authenticated can access transactions" ON "public"."SITE_Transactions";
CREATE POLICY "Admin access transactions anon" ON "public"."SITE_Transactions"
    FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- 3. FIX SITE_SystemSettings
DROP POLICY IF EXISTS "Allow write for authenticated only" ON "public"."SITE_SystemSettings";
CREATE POLICY "Admin access settings anon" ON "public"."SITE_SystemSettings"
    FOR ALL 
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- 4. FIX SITE_Courses
DROP POLICY IF EXISTS "Admin access Courses anon" ON "public"."SITE_Courses";
CREATE POLICY "Admin access Courses anon" ON "public"."SITE_Courses"
    FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

COMMIT;
