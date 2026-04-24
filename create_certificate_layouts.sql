-- Create Certificate Layouts Table
CREATE TABLE IF NOT EXISTS "SITE_CertificateLayouts" (
    "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'Certificate', -- 'Certificate' or 'Badge'
    "background_url" TEXT,
    "elements" JSONB DEFAULT '[]'::jsonb, -- Array of objects: { id, type (text/image/qr), x, y, fontSize, color, content (static or {{variable}}) }
    "dimensions" JSONB DEFAULT '{"width": 842, "height": 595}'::jsonb, -- Default A4 Landscape (in points/pixels approx)
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add Foreign Keys to Courses
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'SITE_Courses' AND column_name = 'certificate_layout_id') THEN
        ALTER TABLE "SITE_Courses" ADD COLUMN "certificate_layout_id" UUID REFERENCES "SITE_CertificateLayouts"("id");
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'SITE_Courses' AND column_name = 'badge_layout_id') THEN
        ALTER TABLE "SITE_Courses" ADD COLUMN "badge_layout_id" UUID REFERENCES "SITE_CertificateLayouts"("id");
    END IF;
END $$;
