-- Allow manual items in sale items
ALTER TABLE "SITE_SaleItems" ADD COLUMN IF NOT EXISTS "item_name" TEXT;
ALTER TABLE "SITE_SaleItems" ALTER COLUMN "product_id" DROP NOT NULL;

-- Make sure we don't have invalid UUIDs
-- (No data migration needed if the table was just failing insert)
