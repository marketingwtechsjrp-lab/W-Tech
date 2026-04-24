-- Add reminder configuration to courses
ALTER TABLE "SITE_Courses" 
ADD COLUMN IF NOT EXISTS "reminder_5d_enabled" BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS "reminder_1d_enabled" BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS "reminder_5d_days" INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS "reminder_1d_days" INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS "what_to_bring" TEXT;

-- Add tracking for sent reminders to enrollments
ALTER TABLE "SITE_Enrollments"
ADD COLUMN IF NOT EXISTS "reminder_5d_sent" BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS "reminder_1d_sent" BOOLEAN DEFAULT false;
