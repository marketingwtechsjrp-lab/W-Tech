-- Add recycling_price to SITE_Courses
ALTER TABLE "SITE_Courses" ADD COLUMN IF NOT EXISTS "recycling_price" NUMERIC DEFAULT 0;

-- Add address and credential fields to SITE_Enrollments
ALTER TABLE "SITE_Enrollments" ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE "SITE_Enrollments" ADD COLUMN IF NOT EXISTS "address_number" TEXT;
ALTER TABLE "SITE_Enrollments" ADD COLUMN IF NOT EXISTS "address_neighborhood" TEXT;
ALTER TABLE "SITE_Enrollments" ADD COLUMN IF NOT EXISTS "city" TEXT;
ALTER TABLE "SITE_Enrollments" ADD COLUMN IF NOT EXISTS "state" TEXT;
ALTER TABLE "SITE_Enrollments" ADD COLUMN IF NOT EXISTS "zip_code" TEXT;
ALTER TABLE "SITE_Enrollments" ADD COLUMN IF NOT EXISTS "is_credentialed" BOOLEAN DEFAULT FALSE;

-- Create SITE_Logs table
CREATE TABLE IF NOT EXISTS "SITE_Logs" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" UUID REFERENCES auth.users(id),
    "action" TEXT NOT NULL,
    "details" JSONB,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for Logs (optional but good practice)
ALTER TABLE "SITE_Logs" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view all logs" ON "SITE_Logs" FOR SELECT USING (
    EXISTS (SELECT 1 FROM "SITE_Users" WHERE id = auth.uid() AND (role_id IS NOT NULL OR permissions->>'admin_access' = 'true'))
);
