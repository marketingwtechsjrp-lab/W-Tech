-- Up Migration: Add owner_id to SITE_MarketingLists

DO $$ 
BEGIN
    -- Check if column exists, if not add it
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'SITE_MarketingLists' 
        AND column_name = 'owner_id'
    ) THEN
        ALTER TABLE "SITE_MarketingLists" 
        ADD COLUMN "owner_id" UUID REFERENCES "auth"."users"("id");
    END IF;
END $$;

-- Update RLS Policies to respect owner_id

-- Enable RLS
ALTER TABLE "SITE_MarketingLists" ENABLE ROW LEVEL SECURITY;

-- 1. All users can read their own lists OR lists without owner (public/system lists)
DROP POLICY IF EXISTS "Users can view own lists" ON "SITE_MarketingLists";
CREATE POLICY "Users can view own lists" ON "SITE_MarketingLists"
FOR SELECT
USING (
    owner_id = auth.uid() 
    OR 
    owner_id IS NULL 
    OR
    (SELECT role FROM "SITE_Users" WHERE id = auth.uid()) IN ('admin', 'super_admin')
);

-- 2. Users can insert lists they own
DROP POLICY IF EXISTS "Users can insert own lists" ON "SITE_MarketingLists";
CREATE POLICY "Users can insert own lists" ON "SITE_MarketingLists"
FOR INSERT
WITH CHECK (
    auth.uid() = owner_id 
    OR 
    (SELECT role FROM "SITE_Users" WHERE id = auth.uid()) IN ('admin', 'super_admin')
);

-- 3. Users can update own lists
DROP POLICY IF EXISTS "Users can update own lists" ON "SITE_MarketingLists";
CREATE POLICY "Users can update own lists" ON "SITE_MarketingLists"
FOR UPDATE
USING (
    owner_id = auth.uid()
    OR 
    (SELECT role FROM "SITE_Users" WHERE id = auth.uid()) IN ('admin', 'super_admin')
);

-- 4. Users can delete own lists
DROP POLICY IF EXISTS "Users can delete own lists" ON "SITE_MarketingLists";
CREATE POLICY "Users can delete own lists" ON "SITE_MarketingLists"
FOR DELETE
USING (
    owner_id = auth.uid()
    OR 
    (SELECT role FROM "SITE_Users" WHERE id = auth.uid()) IN ('admin', 'super_admin')
);
