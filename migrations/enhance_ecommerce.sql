-- Migration: Enhance Sales and Financials
-- Date: 2024-01-29

-- 1. Fix Missing 'items' column in SITE_Sales (Redundancy/Cache)
ALTER TABLE "SITE_Sales" ADD COLUMN IF NOT EXISTS "items" JSONB;

-- 2. Add Tracking Code for Public Access
ALTER TABLE "SITE_Sales" ADD COLUMN IF NOT EXISTS "tracking_code" TEXT UNIQUE;

-- 3. Add Shipping/Dispatch Fields
ALTER TABLE "SITE_Sales" ADD COLUMN IF NOT EXISTS "shipping_method" TEXT;
ALTER TABLE "SITE_Sales" ADD COLUMN IF NOT EXISTS "shipping_cost" NUMERIC(10,2) DEFAULT 0;
ALTER TABLE "SITE_Sales" ADD COLUMN IF NOT EXISTS "shipping_address" JSONB;
ALTER TABLE "SITE_Sales" ADD COLUMN IF NOT EXISTS "estimated_delivery_date" DATE;

-- 4. Create Payment Methods Table
CREATE TABLE IF NOT EXISTS "SITE_PaymentMethods" (
    "id" UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL CHECK ("type" IN ('cash', 'credit_card', 'debit_card', 'boleto', 'pix', 'term', 'other')),
    "installments_config" JSONB DEFAULT '{"max": 1, "interest": 0}', -- e.g., { max: 12, interest: 2.5 }
    "is_active" BOOLEAN DEFAULT TRUE,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Seed Basic Payment Methods
INSERT INTO "SITE_PaymentMethods" (name, type, installments_config) VALUES
('Dinheiro', 'cash', '{"max": 1}'),
('PIX', 'pix', '{"max": 1}'),
('Cartão de Crédito (até 12x)', 'credit_card', '{"max": 12, "interest": 0}'),
('Boleto à Vista', 'boleto', '{"max": 1}'),
('Boleto 30 Dias', 'term', '{"max": 1, "days": [30]}'),
('Boleto 30/60/90', 'term', '{"max": 3, "days": [30, 60, 90]}')
ON CONFLICT DO NOTHING;

-- 6. Add Discount Field
ALTER TABLE "SITE_Sales" ADD COLUMN IF NOT EXISTS "discount_code" TEXT;
ALTER TABLE "SITE_Sales" ADD COLUMN IF NOT EXISTS "discount_amount" NUMERIC(10,2) DEFAULT 0;
