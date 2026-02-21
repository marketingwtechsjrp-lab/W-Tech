-- Ensure SITE_Roles table exists
CREATE TABLE IF NOT EXISTS "SITE_Roles" (
    "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "permissions" JSONB DEFAULT '{}',
    "level" INTEGER DEFAULT 1,
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE "SITE_Roles" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON "SITE_Roles";
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON "SITE_Roles";
DROP POLICY IF EXISTS "Enable update for authenticated users" ON "SITE_Roles";
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON "SITE_Roles";
DROP POLICY IF EXISTS "Allow full access to authenticated users" ON "SITE_Roles";

-- Create permissive policy for authenticated users (Use with caution in production, but suitable for Admin-only apps where Auth is handled at app level)
CREATE POLICY "Allow full access to authenticated users"
ON "SITE_Roles"
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Insert Default Roles if they don't exist
INSERT INTO "SITE_Roles" (name, description, level, permissions)
SELECT 'Super Admin', 'Acesso total ao sistema', 10, '{"admin_access": true}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM "SITE_Roles" WHERE name = 'Super Admin');

INSERT INTO "SITE_Roles" (name, description, level, permissions)
SELECT 'Editor', 'Pode editar conteúdo mas não configurações', 5, '{"blog_create": true, "blog_edit": true}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM "SITE_Roles" WHERE name = 'Editor');
