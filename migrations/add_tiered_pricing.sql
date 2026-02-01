-- Migration to add tiered pricing
-- Tables: SITE_Products, SITE_Leads, SITE_Mechanics

-- 1. Add price columns to SITE_Products
ALTER TABLE "SITE_Products" ADD COLUMN IF NOT EXISTS "price_retail" NUMERIC DEFAULT 0;
ALTER TABLE "SITE_Products" ADD COLUMN IF NOT EXISTS "price_partner" NUMERIC DEFAULT 0;
ALTER TABLE "SITE_Products" ADD COLUMN IF NOT EXISTS "price_distributor" NUMERIC DEFAULT 0;

-- 2. Add pricing_level column to SITE_Leads and SITE_Mechanics
-- Levels: 'retail' (venda final), 'partner' (credenciado), 'distributor' (distribuidor)
ALTER TABLE "SITE_Leads" ADD COLUMN IF NOT EXISTS "pricing_level" TEXT DEFAULT 'retail';
ALTER TABLE "SITE_Mechanics" ADD COLUMN IF NOT EXISTS "pricing_level" TEXT DEFAULT 'partner';

-- 3. Initial sync (optional but helpful): Set price_retail as the current sale_price
UPDATE "SITE_Products" SET "price_retail" = "sale_price" WHERE "price_retail" = 0 OR "price_retail" IS NULL;
UPDATE "SITE_Products" SET "price_partner" = "sale_price" * 0.9 WHERE "price_partner" = 0 OR "price_partner" IS NULL; -- Default 10% off for partners
UPDATE "SITE_Products" SET "price_distributor" = "sale_price" * 0.8 WHERE "price_distributor" = 0 OR "price_distributor" IS NULL; -- Default 20% off for distributors
