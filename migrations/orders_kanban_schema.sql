-- Migration: Orders Kanban & Client Classification
-- Author: Antigravity
-- Date: 2026-01-28

-- 1. Enhance SITE_Sales with Status and Items (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'SITE_Sales' AND column_name = 'status') THEN
        ALTER TABLE "SITE_Sales" ADD COLUMN status TEXT DEFAULT 'pending';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'SITE_Sales' AND column_name = 'items') THEN
        ALTER TABLE "SITE_Sales" ADD COLUMN items JSONB DEFAULT '[]'::jsonb;
    END IF;
    
    -- Ensure channel exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'SITE_Sales' AND column_name = 'channel') THEN
         ALTER TABLE "SITE_Sales" ADD COLUMN channel TEXT DEFAULT 'Admin';
    END IF;
END $$;

-- 2. Enhance SITE_Leads with Classification and Dates
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'SITE_Leads' AND column_name = 'last_purchase_date') THEN
        ALTER TABLE "SITE_Leads" ADD COLUMN last_purchase_date TIMESTAMP WITH TIME ZONE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'SITE_Leads' AND column_name = 'classification') THEN
        ALTER TABLE "SITE_Leads" ADD COLUMN classification TEXT DEFAULT 'Novato'; -- Novato, Bronze, Prata, Ouro, VIP
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'SITE_Leads' AND column_name = 'is_accredited') THEN
        ALTER TABLE "SITE_Leads" ADD COLUMN is_accredited BOOLEAN DEFAULT false;
    END IF;
END $$;

-- 3. Trigger Function to Update Last Purchase Date
CREATE OR REPLACE FUNCTION update_last_purchase_date()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.client_id IS NOT NULL THEN
        UPDATE "SITE_Leads"
        SET last_purchase_date = NOW(),
            classification = CASE 
                WHEN classification = 'Novato' THEN 'Ativo' 
                ELSE classification 
            END
        WHERE id = NEW.client_id::uuid;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Trigger
DROP TRIGGER IF EXISTS trg_update_last_purchase ON "SITE_Sales";
CREATE TRIGGER trg_update_last_purchase
AFTER INSERT ON "SITE_Sales"
FOR EACH ROW
EXECUTE FUNCTION update_last_purchase_date();

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_leads_last_purchase ON "SITE_Leads"(last_purchase_date DESC);
CREATE INDEX IF NOT EXISTS idx_sales_status ON "SITE_Sales"(status);
