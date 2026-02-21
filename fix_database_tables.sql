-- 1. Create Task Categories Table
CREATE TABLE IF NOT EXISTS "SITE_TaskCategories" (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#ffffff', -- Hex Color for card background
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for Categories
ALTER TABLE "SITE_TaskCategories" ENABLE ROW LEVEL SECURITY;

-- Allow public access (simplifies frontend logic for now)
DROP POLICY IF EXISTS "Public Access Task Categories" ON "SITE_TaskCategories";
CREATE POLICY "Public Access Task Categories" ON "SITE_TaskCategories"
FOR ALL USING (true) WITH CHECK (true);

-- 2. Add category_id to SITE_Tasks
ALTER TABLE "SITE_Tasks" 
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES "SITE_TaskCategories"(id);

-- 3. Insert Default Categories (if they don't exist)
INSERT INTO "SITE_TaskCategories" (name, color)
SELECT 'Cursos', '#e0f2fe'
WHERE NOT EXISTS (SELECT 1 FROM "SITE_TaskCategories" WHERE name = 'Cursos');

INSERT INTO "SITE_TaskCategories" (name, color)
SELECT 'Peças/Ferramentas', '#fef3c7'
WHERE NOT EXISTS (SELECT 1 FROM "SITE_TaskCategories" WHERE name = 'Peças/Ferramentas');

INSERT INTO "SITE_TaskCategories" (name, color)
SELECT 'Serviços', '#dcfce7'
WHERE NOT EXISTS (SELECT 1 FROM "SITE_TaskCategories" WHERE name = 'Serviços');

INSERT INTO "SITE_TaskCategories" (name, color)
SELECT 'Geral', '#f3f4f6'
WHERE NOT EXISTS (SELECT 1 FROM "SITE_TaskCategories" WHERE name = 'Geral');


-- 4. Create SITE_Config Table (For WhatsApp & Integrations)
CREATE TABLE IF NOT EXISTS "SITE_Config" (
    key TEXT PRIMARY KEY,
    value TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for Config
ALTER TABLE "SITE_Config" ENABLE ROW LEVEL SECURITY;

-- Allow public access for Config
DROP POLICY IF EXISTS "Public Access Config" ON "SITE_Config";
CREATE POLICY "Public Access Config" ON "SITE_Config"
FOR ALL USING (true) WITH CHECK (true);
