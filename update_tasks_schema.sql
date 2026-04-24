-- Add lead_id and tags to SITE_Tasks
ALTER TABLE "SITE_Tasks" ADD COLUMN IF NOT EXISTS "lead_id" UUID REFERENCES "SITE_Leads"("id");
ALTER TABLE "SITE_Tasks" ADD COLUMN IF NOT EXISTS "tags" TEXT[] DEFAULT '{}';
