-- Migration: Add missing 'options' column
ALTER TABLE "SITE_Sales" ADD COLUMN IF NOT EXISTS "options" JSONB;
