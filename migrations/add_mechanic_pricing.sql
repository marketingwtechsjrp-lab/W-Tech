-- Migration to add "Mecânico sem curso" pricing level
-- Table: SITE_Products, SITE_Leads, SITE_Mechanics

-- 1. Add price_mechanic column to SITE_Products
ALTER TABLE "SITE_Products" ADD COLUMN IF NOT EXISTS "price_mechanic" NUMERIC DEFAULT 0;

-- 2. Initial sync: Set price_mechanic as 10% off retail
UPDATE "SITE_Products" 
SET "price_mechanic" = "price_retail" * 0.9 
WHERE "price_mechanic" = 0 OR "price_mechanic" IS NULL;

-- 3. Add 'mechanic' level to pricing_level if needed (as it is a TEXT field with no fixed enum yet)
-- This allows assigning specific users to this pricing level.
