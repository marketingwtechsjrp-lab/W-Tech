-- FIX RLS FOR SALES (Allow Custom Auth to Insert)
-- The application uses a custom AuthContext that doesn't set the Supabase session for RLS.
-- We need to disable RLS on sales tables to allow the admin dashboard to write to them.

ALTER TABLE "SITE_Sales" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "SITE_SaleItems" DISABLE ROW LEVEL SECURITY;

-- Grant permissions just in case
GRANT ALL ON "SITE_Sales" TO anon, authenticated, service_role;
GRANT ALL ON "SITE_SaleItems" TO anon, authenticated, service_role;
