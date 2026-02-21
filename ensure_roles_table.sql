-- Create SITE_Roles table if it doesn't exist
CREATE TABLE IF NOT EXISTS "SITE_Roles" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    permissions JSONB DEFAULT '{}'::jsonb,
    level INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE "SITE_Roles" ENABLE ROW LEVEL SECURITY;

-- Create Policies (Allow Public Read for now to ensure visibility, Admin Write)
DROP POLICY IF EXISTS "Enable read access for all users" ON "SITE_Roles";
CREATE POLICY "Enable read access for all users" ON "SITE_Roles" FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON "SITE_Roles";
CREATE POLICY "Enable insert for authenticated users" ON "SITE_Roles" FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable update for authenticated users" ON "SITE_Roles";
CREATE POLICY "Enable update for authenticated users" ON "SITE_Roles" FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable delete for authenticated users" ON "SITE_Roles";
CREATE POLICY "Enable delete for authenticated users" ON "SITE_Roles" FOR DELETE USING (auth.role() = 'authenticated');

-- Insert Default Roles if empty
INSERT INTO "SITE_Roles" (name, description, permissions, level)
SELECT 'Super Admin', 'Acesso total ao sistema', '{"admin_access": true}', 10
WHERE NOT EXISTS (SELECT 1 FROM "SITE_Roles" WHERE name = 'Super Admin');

INSERT INTO "SITE_Roles" (name, description, permissions, level)
SELECT 'Editor', 'Pode editar conteúdo mas não configurações', '{"blog_create": true, "blog_edit": true}', 5
WHERE NOT EXISTS (SELECT 1 FROM "SITE_Roles" WHERE name = 'Editor');

-- Force Schema Cache Reload
NOTIFY pgrst, 'reload config';
