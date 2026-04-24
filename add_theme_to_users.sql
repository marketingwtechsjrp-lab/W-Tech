-- Add theme column to SITE_Users table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'SITE_Users' AND column_name = 'theme') THEN
        ALTER TABLE "SITE_Users" ADD COLUMN "theme" TEXT DEFAULT 'system';
    END IF;
END $$;
