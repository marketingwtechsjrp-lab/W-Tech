-- Ensure SITE_Leads has the columns
ALTER TABLE "SITE_Leads" ADD COLUMN IF NOT EXISTS "assigned_to" UUID REFERENCES "SITE_Users"(id);
ALTER TABLE "SITE_Leads" ADD COLUMN IF NOT EXISTS "client_code" TEXT UNIQUE;
ALTER TABLE "SITE_Leads" ADD COLUMN IF NOT EXISTS "cpf" TEXT;
ALTER TABLE "SITE_Leads" ADD COLUMN IF NOT EXISTS "rg" TEXT;
ALTER TABLE "SITE_Leads" ADD COLUMN IF NOT EXISTS "birth_date" DATE;
ALTER TABLE "SITE_Leads" ADD COLUMN IF NOT EXISTS "is_accredited" BOOLEAN DEFAULT FALSE;
ALTER TABLE "SITE_Leads" ADD COLUMN IF NOT EXISTS "delivery_address" JSONB;

-- Ensure SITE_Mechanics has the columns
ALTER TABLE "SITE_Mechanics" ADD COLUMN IF NOT EXISTS "assigned_to" UUID REFERENCES "SITE_Users"(id);
ALTER TABLE "SITE_Mechanics" ADD COLUMN IF NOT EXISTS "client_code" TEXT UNIQUE;
ALTER TABLE "SITE_Mechanics" ADD COLUMN IF NOT EXISTS "cpf" TEXT;
ALTER TABLE "SITE_Mechanics" ADD COLUMN IF NOT EXISTS "rg" TEXT;
ALTER TABLE "SITE_Mechanics" ADD COLUMN IF NOT EXISTS "birth_date" DATE;
ALTER TABLE "SITE_Mechanics" ADD COLUMN IF NOT EXISTS "is_accredited" BOOLEAN DEFAULT TRUE; 
ALTER TABLE "SITE_Mechanics" ADD COLUMN IF NOT EXISTS "delivery_address" JSONB;

-- Function to generate code: Name(3) + '-' + Num(2) + Letters(3) -> AAA-99AAA
CREATE OR REPLACE FUNCTION generate_client_code_generic() 
RETURNS TRIGGER AS $$
DECLARE
    name_part TEXT;
    num_part TEXT;
    let_part TEXT;
    final_code TEXT;
BEGIN
    IF NEW.client_code IS NULL OR NEW.client_code = '' THEN
        -- Safely handle short names
        IF LENGTH(NEW.name) >= 3 THEN
             name_part := UPPER(SUBSTRING(NEW.name, 1, 3));
        ELSE
             name_part := UPPER(RPAD(NEW.name, 3, 'X'));
        END IF;

        -- Loop to ensure uniqueness
        LOOP
            -- 2 Random Numbers (10-99)
            num_part := (FLOOR(RANDOM() * 90 + 10)::TEXT);
            
            -- 3 Random Letters (A-Z)
            let_part := CHR(FLOOR(65 + RANDOM() * 26)::INT) || 
                        CHR(FLOOR(65 + RANDOM() * 26)::INT) || 
                        CHR(FLOOR(65 + RANDOM() * 26)::INT);
            
            final_code := name_part || '-' || num_part || let_part;
            
            NEW.client_code := final_code;
            EXIT; 
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for Mechanics
DROP TRIGGER IF EXISTS trg_generate_client_code_mechanics ON "SITE_Mechanics";
CREATE TRIGGER trg_generate_client_code_mechanics
BEFORE INSERT ON "SITE_Mechanics"
FOR EACH ROW
EXECUTE FUNCTION generate_client_code_generic();

-- Trigger for Leads
DROP TRIGGER IF EXISTS trg_generate_client_code_leads ON "SITE_Leads";
CREATE TRIGGER trg_generate_client_code_leads
BEFORE INSERT ON "SITE_Leads"
FOR EACH ROW
EXECUTE FUNCTION generate_client_code_generic();

-- Backfill Mechanics
DO $$
DECLARE 
    r RECORD;
    name_part TEXT;
    num_part TEXT;
    let_part TEXT;
BEGIN
    FOR r IN SELECT id, name FROM "SITE_Mechanics" WHERE client_code IS NULL OR client_code = '' LOOP
        IF LENGTH(r.name) >= 3 THEN
             name_part := UPPER(SUBSTRING(r.name, 1, 3));
        ELSE
             name_part := UPPER(RPAD(r.name, 3, 'X'));
        END IF;
        
        num_part := (FLOOR(RANDOM() * 90 + 10)::TEXT);
        let_part := CHR(FLOOR(65 + RANDOM() * 26)::INT) || 
                    CHR(FLOOR(65 + RANDOM() * 26)::INT) || 
                    CHR(FLOOR(65 + RANDOM() * 26)::INT);
                    
        UPDATE "SITE_Mechanics"
        SET client_code = name_part || '-' || num_part || let_part
        WHERE id = r.id;
    END LOOP;
END $$;

-- Backfill Leads
DO $$
DECLARE 
    r RECORD;
    name_part TEXT;
    num_part TEXT;
    let_part TEXT;
BEGIN
    FOR r IN SELECT id, name FROM "SITE_Leads" WHERE client_code IS NULL OR client_code = '' LOOP
         IF LENGTH(r.name) >= 3 THEN
             name_part := UPPER(SUBSTRING(r.name, 1, 3));
        ELSE
             name_part := UPPER(RPAD(r.name, 3, 'X'));
        END IF;

        num_part := (FLOOR(RANDOM() * 90 + 10)::TEXT);
        let_part := CHR(FLOOR(65 + RANDOM() * 26)::INT) || 
                    CHR(FLOOR(65 + RANDOM() * 26)::INT) || 
                    CHR(FLOOR(65 + RANDOM() * 26)::INT);
                    
        UPDATE "SITE_Leads"
        SET client_code = name_part || '-' || num_part || let_part
        WHERE id = r.id;
    END LOOP;
END $$;
