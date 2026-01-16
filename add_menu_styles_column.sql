/* Add to SITE_Config table */

-- Create a new column 'menu_styles' as JSONB if it doesn't exist
-- We can't use IF NOT EXISTS on columns in standard SQL directly in one line usually, but for Postgres:

ALTER TABLE "SITE_Config" ADD COLUMN IF NOT EXISTS menu_styles JSONB DEFAULT '{}'::jsonb;

-- Optional: Comments to explain what goes in there
COMMENT ON COLUMN "SITE_Config".menu_styles IS 'Stores custom menu styling preferences like font size, padding, etc.';
