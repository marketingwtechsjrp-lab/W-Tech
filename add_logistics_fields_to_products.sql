-- FIX: DISABLE RLS FOR CUSTOM AUTH ARCHITECTURE
-- The application uses a custom 'SITE_Users' table for login and does not use Supabase Auth sessions.
-- Therefore, all requests come as 'anon'. We must DISABLE RLS to allow these requests to succeed.

-- 1. Disable RLS on Products to allow manual creation and CSV Import
ALTER TABLE "SITE_Products" DISABLE ROW LEVEL SECURITY;

-- 2. Disable RLS on Stock Movements (used in sales/adjustments)
ALTER TABLE "SITE_StockMovements" DISABLE ROW LEVEL SECURITY;

-- 3. Ensure permissions are granted to 'anon' and 'service_role' just in case
GRANT ALL ON "SITE_Products" TO anon, service_role;
GRANT ALL ON "SITE_StockMovements" TO anon, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, service_role;

-- 4. (Optional) Re-add logistics columns if they are missing (Safe to run multiple times)
ALTER TABLE "SITE_Products" ADD COLUMN IF NOT EXISTS "weight" NUMERIC DEFAULT 0;
ALTER TABLE "SITE_Products" ADD COLUMN IF NOT EXISTS "length" NUMERIC DEFAULT 0;
ALTER TABLE "SITE_Products" ADD COLUMN IF NOT EXISTS "width" NUMERIC DEFAULT 0;
ALTER TABLE "SITE_Products" ADD COLUMN IF NOT EXISTS "height" NUMERIC DEFAULT 0;
