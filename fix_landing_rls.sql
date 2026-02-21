-- FIX RLS Policies for Landing Pages
-- This acts as a "reset" for permissions on this table to ensure Admins can save changes.

ALTER TABLE public."SITE_LandingPages" ENABLE ROW LEVEL SECURITY;

-- 1. Drop old policies to avoid conflicts
DROP POLICY IF EXISTS "Public Read Access" ON public."SITE_LandingPages";
DROP POLICY IF EXISTS "Admin All Access" ON public."SITE_LandingPages";
DROP POLICY IF EXISTS "Admin Full Permit" ON public."SITE_LandingPages";
DROP POLICY IF EXISTS "Public View" ON public."SITE_LandingPages";

-- 2. Allow ANYONE to VIEW pages (essential for them to work publicly)
CREATE POLICY "Public View LP" ON public."SITE_LandingPages"
    FOR SELECT 
    USING (true);

-- 3. Allow AUTHENTICATED users (Admins) to DO EVERYTHING (Insert, Update, Delete)
-- We use USING(true) and WITH CHECK(true) to be maximally permissive for logged-in users.
CREATE POLICY "Admin Manage LP" ON public."SITE_LandingPages"
    FOR ALL 
    TO authenticated
    USING (true) 
    WITH CHECK (true);
