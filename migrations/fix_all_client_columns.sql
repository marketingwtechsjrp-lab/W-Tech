-- COMPREHENSIVE FIX for Client Tables (Leads & Mechanics)
-- This ensures both tables have all fields required by the Client Detail Modal.

-- 1. Ensure SITE_Mechanics has ALL required columns
ALTER TABLE "SITE_Mechanics" ADD COLUMN IF NOT EXISTS "t_shirt_size" TEXT;
ALTER TABLE "SITE_Mechanics" ADD COLUMN IF NOT EXISTS "workshop_details" JSONB DEFAULT '{}'::jsonb;
ALTER TABLE "SITE_Mechanics" ADD COLUMN IF NOT EXISTS "assigned_to" UUID REFERENCES "SITE_Users"(id);
ALTER TABLE "SITE_Mechanics" ADD COLUMN IF NOT EXISTS "client_code" TEXT UNIQUE;
ALTER TABLE "SITE_Mechanics" ADD COLUMN IF NOT EXISTS "cpf" TEXT;
ALTER TABLE "SITE_Mechanics" ADD COLUMN IF NOT EXISTS "rg" TEXT;
ALTER TABLE "SITE_Mechanics" ADD COLUMN IF NOT EXISTS "birth_date" DATE;
ALTER TABLE "SITE_Mechanics" ADD COLUMN IF NOT EXISTS "is_accredited" BOOLEAN DEFAULT TRUE;
ALTER TABLE "SITE_Mechanics" ADD COLUMN IF NOT EXISTS "delivery_address" JSONB DEFAULT '{}'::jsonb;
ALTER TABLE "SITE_Mechanics" ADD COLUMN IF NOT EXISTS "address" TEXT; -- Ensure base address exists too

-- 2. Ensure SITE_Leads has ALL required columns (just in case)
ALTER TABLE "SITE_Leads" ADD COLUMN IF NOT EXISTS "t_shirt_size" TEXT;
ALTER TABLE "SITE_Leads" ADD COLUMN IF NOT EXISTS "workshop_details" JSONB DEFAULT '{}'::jsonb;
ALTER TABLE "SITE_Leads" ADD COLUMN IF NOT EXISTS "assigned_to" UUID REFERENCES "SITE_Users"(id);
ALTER TABLE "SITE_Leads" ADD COLUMN IF NOT EXISTS "client_code" TEXT UNIQUE;
ALTER TABLE "SITE_Leads" ADD COLUMN IF NOT EXISTS "cpf" TEXT;
ALTER TABLE "SITE_Leads" ADD COLUMN IF NOT EXISTS "rg" TEXT;
ALTER TABLE "SITE_Leads" ADD COLUMN IF NOT EXISTS "birth_date" DATE;
ALTER TABLE "SITE_Leads" ADD COLUMN IF NOT EXISTS "is_accredited" BOOLEAN DEFAULT FALSE;
ALTER TABLE "SITE_Leads" ADD COLUMN IF NOT EXISTS "delivery_address" JSONB DEFAULT '{}'::jsonb;

-- 3. Code Generation Logic (Updated Format: DAN-17ESP)
CREATE OR REPLACE FUNCTION generate_client_code_v2() 
RETURNS TRIGGER AS $$
DECLARE
    name_part TEXT;
    num_part TEXT;
    let_part TEXT;
    final_code TEXT;
BEGIN
    IF NEW.client_code IS NULL OR NEW.client_code = '' THEN
        -- Get first 3 letters of name, padded with X if too short
        IF LENGTH(COALESCE(NEW.name, 'XXX')) >= 3 THEN
             name_part := UPPER(SUBSTRING(NEW.name, 1, 3));
        ELSE
             name_part := UPPER(RPAD(COALESCE(NEW.name, 'XXX'), 3, 'X'));
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

-- 4. Apply Triggers
DROP TRIGGER IF EXISTS trg_client_code_mechanics_v2 ON "SITE_Mechanics";
CREATE TRIGGER trg_client_code_mechanics_v2
BEFORE INSERT ON "SITE_Mechanics"
FOR EACH ROW
EXECUTE FUNCTION generate_client_code_v2();

DROP TRIGGER IF EXISTS trg_client_code_leads_v2 ON "SITE_Leads";
CREATE TRIGGER trg_client_code_leads_v2
BEFORE INSERT ON "SITE_Leads"
FOR EACH ROW
EXECUTE FUNCTION generate_client_code_v2();

-- 5. Backfill NULL codes
DO $$
DECLARE 
    r RECORD;
    name_part TEXT;
    num_part TEXT;
    let_part TEXT;
BEGIN
    -- Backfill Mechanics
    FOR r IN SELECT id, name FROM "SITE_Mechanics" WHERE client_code IS NULL OR client_code = '' LOOP
        IF LENGTH(COALESCE(r.name, 'XXX')) >= 3 THEN
             name_part := UPPER(SUBSTRING(r.name, 1, 3));
        ELSE
             name_part := UPPER(RPAD(COALESCE(r.name, 'XXX'), 3, 'X'));
        END IF;
        
        num_part := (FLOOR(RANDOM() * 90 + 10)::TEXT);
        let_part := CHR(FLOOR(65 + RANDOM() * 26)::INT) || 
                    CHR(FLOOR(65 + RANDOM() * 26)::INT) || 
                    CHR(FLOOR(65 + RANDOM() * 26)::INT);
                    
        UPDATE "SITE_Mechanics"
        SET client_code = name_part || '-' || num_part || let_part
        WHERE id = r.id;
    END LOOP;

    -- Backfill Leads
    FOR r IN SELECT id, name FROM "SITE_Leads" WHERE client_code IS NULL OR client_code = '' LOOP
         IF LENGTH(COALESCE(r.name, 'XXX')) >= 3 THEN
             name_part := UPPER(SUBSTRING(r.name, 1, 3));
        ELSE
             name_part := UPPER(RPAD(COALESCE(r.name, 'XXX'), 3, 'X'));
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
