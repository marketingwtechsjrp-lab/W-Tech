DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'SITE_Leads' AND column_name = 'tags') THEN
        ALTER TABLE "SITE_Leads" ADD COLUMN "tags" text[] DEFAULT '{}';
    END IF;
END $$;
