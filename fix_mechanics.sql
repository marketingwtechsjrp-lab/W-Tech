-- 1. Ensure Table Exists
CREATE TABLE IF NOT EXISTS "SITE_Mechanics" (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    name TEXT,
    description TEXT
);

-- 2. Add Missing Columns (Idempotent)
ALTER TABLE "SITE_Mechanics" ADD COLUMN IF NOT EXISTS workshop_name TEXT;
ALTER TABLE "SITE_Mechanics" ADD COLUMN IF NOT EXISTS cpf_cnpj TEXT;
ALTER TABLE "SITE_Mechanics" ADD COLUMN IF NOT EXISTS "group" TEXT;
ALTER TABLE "SITE_Mechanics" ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE "SITE_Mechanics" ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE "SITE_Mechanics" ADD COLUMN IF NOT EXISTS photo TEXT;
ALTER TABLE "SITE_Mechanics" ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Pending';
ALTER TABLE "SITE_Mechanics" ADD COLUMN IF NOT EXISTS specialty TEXT[];
ALTER TABLE "SITE_Mechanics" ADD COLUMN IF NOT EXISTS joined_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE "SITE_Mechanics" ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Address Fields
ALTER TABLE "SITE_Mechanics" ADD COLUMN IF NOT EXISTS street TEXT;
ALTER TABLE "SITE_Mechanics" ADD COLUMN IF NOT EXISTS number TEXT;
ALTER TABLE "SITE_Mechanics" ADD COLUMN IF NOT EXISTS zip_code TEXT;
ALTER TABLE "SITE_Mechanics" ADD COLUMN IF NOT EXISTS district TEXT;
ALTER TABLE "SITE_Mechanics" ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE "SITE_Mechanics" ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE "SITE_Mechanics" ADD COLUMN IF NOT EXISTS latitude DECIMAL;
ALTER TABLE "SITE_Mechanics" ADD COLUMN IF NOT EXISTS longitude DECIMAL;

-- 3. Fix RLS Policies (The likely culprit)
ALTER TABLE "SITE_Mechanics" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Read Mechanics" ON "SITE_Mechanics";
DROP POLICY IF EXISTS "Admin Manage Mechanics" ON "SITE_Mechanics";
DROP POLICY IF EXISTS "Enable all for everyone" ON "SITE_Mechanics";

CREATE POLICY "Enable all for everyone" ON "SITE_Mechanics"
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- 4. Insert Test Data (Only if table is empty)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM "SITE_Mechanics") THEN
        INSERT INTO "SITE_Mechanics" (
            name, 
            workshop_name, 
            city, 
            state, 
            phone, 
            status, 
            specialty, 
            street, 
            number, 
            district, 
            zip_code, 
            latitude, 
            longitude
        ) VALUES (
            'João da Silva',
            'Oficina do João (Teste)',
            'São Paulo',
            'SP',
            '(11) 99999-9999',
            'Approved',
            ARRAY['Suspensão', 'Motor'],
            'Av. Paulista',
            '1000',
            'Bela Vista',
            '01310-100',
            -23.561684, 
            -46.655981
        );
    END IF;
END $$;
