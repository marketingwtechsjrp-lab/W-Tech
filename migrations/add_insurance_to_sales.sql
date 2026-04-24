-- Migration: Add insurance_cost to SITE_Sales
-- Author: System
-- Date: 2026-01-29

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'SITE_Sales' 
                   AND column_name = 'insurance_cost') THEN
        ALTER TABLE public."SITE_Sales" ADD COLUMN insurance_cost DECIMAL(10,2) DEFAULT 0;
    END IF;
END $$;
