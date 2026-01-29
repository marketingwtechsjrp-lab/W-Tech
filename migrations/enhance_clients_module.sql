-- Migration: Add fields for Client Portal and Accreditation
-- Date: 2024-01-29

-- 1. Add Accredited Status (Fixes user error)
ALTER TABLE "SITE_Leads" ADD COLUMN IF NOT EXISTS "is_accredited" BOOLEAN DEFAULT FALSE;

-- 2. Add Personal Data Fields
ALTER TABLE "SITE_Leads" ADD COLUMN IF NOT EXISTS "cpf" TEXT;
ALTER TABLE "SITE_Leads" ADD COLUMN IF NOT EXISTS "rg" TEXT;
ALTER TABLE "SITE_Leads" ADD COLUMN IF NOT EXISTS "birth_date" DATE;

-- 3. Add Client Access Code (Unique)
-- Generated as Name + Random Chars, used for public portal access
ALTER TABLE "SITE_Leads" ADD COLUMN IF NOT EXISTS "client_code" TEXT UNIQUE;

-- 4. Add Delivery Address specific field (if different from main address)
ALTER TABLE "SITE_Leads" ADD COLUMN IF NOT EXISTS "delivery_address" JSONB;

-- 5. Create function to generate client code if null
CREATE OR REPLACE FUNCTION generate_client_code() 
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.client_code IS NULL THEN
        -- Create a code like: BENITO-X82 (First name + Random 3 chars)
        NEW.client_code := UPPER(SPLIT_PART(NEW.name, ' ', 1) || '-' || SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 3));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Trigger to auto-generate client code on insert
DROP TRIGGER IF EXISTS trg_generate_client_code ON "SITE_Leads";
CREATE TRIGGER trg_generate_client_code
BEFORE INSERT ON "SITE_Leads"
FOR EACH ROW
EXECUTE FUNCTION generate_client_code();
