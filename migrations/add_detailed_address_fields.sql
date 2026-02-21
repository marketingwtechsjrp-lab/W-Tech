-- Migration: Detailed Address Fields and History Fix
-- Date: 2026-02-01

-- 1. Add detailed address fields to SITE_Leads
ALTER TABLE public."SITE_Leads" 
ADD COLUMN IF NOT EXISTS "zip_code" TEXT,
ADD COLUMN IF NOT EXISTS "address_street" TEXT,
ADD COLUMN IF NOT EXISTS "address_number" TEXT,
ADD COLUMN IF NOT EXISTS "address_neighborhood" TEXT,
ADD COLUMN IF NOT EXISTS "address_city" TEXT,
ADD COLUMN IF NOT EXISTS "address_state" TEXT;

-- 2. Add detailed address fields to SITE_Mechanics
-- Note: Some might exist but we use IF NOT EXISTS for safety
ALTER TABLE public."SITE_Mechanics" 
ADD COLUMN IF NOT EXISTS "zip_code" TEXT,
ADD COLUMN IF NOT EXISTS "address_street" TEXT,
ADD COLUMN IF NOT EXISTS "address_number" TEXT,
ADD COLUMN IF NOT EXISTS "address_neighborhood" TEXT,
ADD COLUMN IF NOT EXISTS "address_city" TEXT,
ADD COLUMN IF NOT EXISTS "address_state" TEXT;

-- 3. Add detailed delivery address fields to SITE_Sales
ALTER TABLE public."SITE_Sales" 
ADD COLUMN IF NOT EXISTS "delivery_cep" TEXT,
ADD COLUMN IF NOT EXISTS "delivery_street" TEXT,
ADD COLUMN IF NOT EXISTS "delivery_number" TEXT,
ADD COLUMN IF NOT EXISTS "delivery_neighborhood" TEXT,
ADD COLUMN IF NOT EXISTS "delivery_city" TEXT,
ADD COLUMN IF NOT EXISTS "delivery_state" TEXT;

-- 4. Fix history query performance (Indexes)
CREATE INDEX IF NOT EXISTS idx_sales_client_email ON public."SITE_Sales"(client_email);
CREATE INDEX IF NOT EXISTS idx_sales_client_id ON public."SITE_Sales"(client_id);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON public."SITE_Sales"(created_at DESC);
