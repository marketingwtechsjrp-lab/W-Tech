-- Migration: Update SITE_Sales table for CRM sales tracking
-- Author: System
-- Date: 2026-01-26
-- Note: Table already exists, adding missing columns if needed

-- Add columns if they don't exist (safe for existing table)
DO $$ 
BEGIN
    -- Add customer_name if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'SITE_Sales' 
                   AND column_name = 'customer_name') THEN
        ALTER TABLE public."SITE_Sales" ADD COLUMN customer_name TEXT NOT NULL DEFAULT 'Cliente';
    END IF;

    -- Add customer_email if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'SITE_Sales' 
                   AND column_name = 'customer_email') THEN
        ALTER TABLE public."SITE_Sales" ADD COLUMN customer_email TEXT;
    END IF;

    -- Add customer_phone if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'SITE_Sales' 
                   AND column_name = 'customer_phone') THEN
        ALTER TABLE public."SITE_Sales" ADD COLUMN customer_phone TEXT;
    END IF;

    -- Add sale_summary if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'SITE_Sales' 
                   AND column_name = 'sale_summary') THEN
        ALTER TABLE public."SITE_Sales" ADD COLUMN sale_summary TEXT NOT NULL DEFAULT 'Venda';
    END IF;

    -- Add payment_method if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'SITE_Sales' 
                   AND column_name = 'payment_method') THEN
        ALTER TABLE public."SITE_Sales" ADD COLUMN payment_method TEXT DEFAULT 'Não especificado';
    END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_sales_seller_id ON public."SITE_Sales"(seller_id);
CREATE INDEX IF NOT EXISTS idx_sales_lead_id ON public."SITE_Sales"(lead_id);
CREATE INDEX IF NOT EXISTS idx_sales_sale_date ON public."SITE_Sales"(sale_date DESC);

-- Enable RLS if not already enabled
ALTER TABLE public."SITE_Sales" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Allow authenticated users to read sales" ON public."SITE_Sales";
DROP POLICY IF EXISTS "Allow authenticated users to insert sales" ON public."SITE_Sales";

-- Policy: Allow authenticated users to read all sales
CREATE POLICY "Allow authenticated users to read sales"
    ON public."SITE_Sales"
    FOR SELECT
    TO authenticated
    USING (true);

-- Policy: Allow authenticated users to insert sales
CREATE POLICY "Allow authenticated users to insert sales"
    ON public."SITE_Sales"
    FOR INSERT
    TO authenticated
    WITH CHECK (true);
