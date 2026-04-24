-- Fix for "permission denied for table users" error
-- This script explicitly repoints the foreign key to the public SITE_Users table
-- instead of the internal auth.users table which causes permission issues.

DO $$
BEGIN
    -- 1. Drop the existing foreign key constraint (if it exists)
    ALTER TABLE "SITE_MarketingLists" DROP CONSTRAINT IF EXISTS "SITE_MarketingLists_owner_id_fkey";
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

-- 2. Create the new correct foreign key constraint linked to SITE_Users
ALTER TABLE "SITE_MarketingLists" 
    ADD CONSTRAINT "SITE_MarketingLists_owner_id_fkey" 
    FOREIGN KEY (owner_id) REFERENCES "SITE_Users"(id) ON DELETE SET NULL;
