-- Create Landing Pages Table
CREATE TABLE IF NOT EXISTS public."SITE_LandingPages" (
    "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "course_id" UUID REFERENCES public."SITE_Courses"("id") ON DELETE CASCADE,
    "slug" TEXT UNIQUE,
    "title" TEXT,
    "subtitle" TEXT,
    "hero_image" TEXT,
    "video_url" TEXT,
    "benefits" JSONB, -- Array of {title, description, icon}
    "instructor_name" TEXT,
    "instructor_bio" TEXT,
    "instructor_image" TEXT,
    "testimonials" JSONB, -- Array of {name, text, image}
    "whatsapp_number" TEXT,
    "pixel_id" TEXT,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public."SITE_LandingPages" ENABLE ROW LEVEL SECURITY;

-- Allow public read access (for rendering the pages)
CREATE POLICY "Public Read Access" ON public."SITE_LandingPages"
    FOR SELECT USING (true);

-- Allow admins (all authenticated users for now) to manage
CREATE POLICY "Admin All Access" ON public."SITE_LandingPages"
    FOR ALL USING (auth.role() = 'authenticated');

-- Grant permissions
GRANT SELECT ON public."SITE_LandingPages" TO anon;
GRANT ALL ON public."SITE_LandingPages" TO authenticated;
GRANT ALL ON public."SITE_LandingPages" TO service_role;
