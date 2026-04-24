-- Add international support to courses
ALTER TABLE "SITE_Courses" ADD COLUMN IF NOT EXISTS "is_international" BOOLEAN DEFAULT false;
ALTER TABLE "SITE_Courses" ADD COLUMN IF NOT EXISTS "currency" TEXT DEFAULT 'BRL'; -- BRL, USD, EUR

-- Add currency support to enrollments and transactions for history
ALTER TABLE "SITE_Enrollments" ADD COLUMN IF NOT EXISTS "currency" TEXT DEFAULT 'BRL';
ALTER TABLE "SITE_Transactions" ADD COLUMN IF NOT EXISTS "currency" TEXT DEFAULT 'BRL';

-- Optional: Update existing courses to BRL if they are null
UPDATE "SITE_Courses" SET "currency" = 'BRL' WHERE "currency" IS NULL;
UPDATE "SITE_Enrollments" SET "currency" = 'BRL' WHERE "currency" IS NULL;
UPDATE "SITE_Transactions" SET "currency" = 'BRL' WHERE "currency" IS NULL;
