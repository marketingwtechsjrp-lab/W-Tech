-- Migration: Add Stripe payment fields to SITE_Sales
-- Run this in the Supabase SQL editor

ALTER TABLE "SITE_Sales"
  ADD COLUMN IF NOT EXISTS stripe_payment_url TEXT,
  ADD COLUMN IF NOT EXISTS stripe_session_id TEXT;

-- Index for faster webhook lookup by session ID
CREATE INDEX IF NOT EXISTS idx_site_sales_stripe_session ON "SITE_Sales"(stripe_session_id);

-- Comment the columns for documentation
COMMENT ON COLUMN "SITE_Sales".stripe_payment_url IS 'Stripe hosted checkout URL sent to the customer';
COMMENT ON COLUMN "SITE_Sales".stripe_session_id IS 'Stripe Checkout Session ID used to verify payment via webhook';
