-- Create Task Categories Table
CREATE TABLE IF NOT EXISTS "SITE_TaskCategories" (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#ffffff', -- Hex Color for card background
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Turn on RLS
ALTER TABLE "SITE_TaskCategories" ENABLE ROW LEVEL SECURITY;

-- Policy (Open for now, similar to other tables)
CREATE POLICY "Public Access Task Categories" ON "SITE_TaskCategories"
FOR ALL USING (true) WITH CHECK (true);

-- Add category_id to Tasks table
ALTER TABLE "SITE_Tasks" 
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES "SITE_TaskCategories"(id);

-- Insert Default Categories
INSERT INTO "SITE_TaskCategories" (name, color) VALUES
('Cursos', '#e0f2fe'), -- Light Blue
('Peças/Ferramentas', '#fef3c7'), -- Light Amber
('Serviços', '#dcfce7'), -- Light Green
('Geral', '#f3f4f6'); -- Light Gray
