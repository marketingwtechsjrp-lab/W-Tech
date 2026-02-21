-- Add recycling_price column to SITE_Courses table
ALTER TABLE "SITE_Courses" ADD COLUMN IF NOT EXISTS "recycling_price" DECIMAL(10,2);
