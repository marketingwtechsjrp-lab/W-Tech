-- 1. DROP Existing Table (Cleanup Schema Issues)
DROP TABLE IF EXISTS public."SITE_LandingPages";

-- 2. CREATE Table (Fresh & Correct Schema)
CREATE TABLE public."SITE_LandingPages" (
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

-- 3. RLS Policies
ALTER TABLE public."SITE_LandingPages" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public Read Access" ON public."SITE_LandingPages"
    FOR SELECT USING (true);

CREATE POLICY "Admin All Access" ON public."SITE_LandingPages"
    FOR ALL USING (auth.role() = 'authenticated');

GRANT SELECT ON public."SITE_LandingPages" TO anon;
GRANT ALL ON public."SITE_LandingPages" TO authenticated;
GRANT ALL ON public."SITE_LandingPages" TO service_role;

-- 4. SEED TEST DATA (The 'lpteste' requested)

-- Ensure we have a Course to link to. We'll insert a specific Test Course first.
INSERT INTO public."SITE_Courses" (id, title, description, date, location, price, status, capacity, registered_count, instructor, image)
VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', -- Specific ID for stability
    'Imersão Suspensão Pro (Teste)',
    'Curso completo para teste de Landing Page.',
    '2024-12-20',
    'São Paulo - SP',
    2500.00,
    'Active',
    20,
    0,
    'Polaco',
    'https://images.unsplash.com/photo-1549520887-b95cb189d531?auto=format&fit=crop&q=80&w=1500'
)
ON CONFLICT (id) DO NOTHING; -- Skip if already exists

-- Insert the Landing Page 'lpteste' linked to this course
INSERT INTO public."SITE_LandingPages" (
    slug,
    course_id,
    title,
    subtitle,
    hero_image,
    video_url,
    instructor_name,
    instructor_bio,
    instructor_image,
    benefits
)
VALUES (
    'lpteste',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', -- Must match the course ID above
    'Domine a Arte das Suspensões',
    'O treinamento mais completo do Brasil agora em versão digital e presencial.',
    'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&q=80&w=2000',
    'https://www.youtube.com/watch?v=sB1q0Twx4NE', -- Example Video
    'Polaco (Mestre das Suspensões)',
    'Com mais de 20 anos de experiência, Polaco é referência nacional em preparação e revalvulamento de suspensões off-road. Já formou mais de 500 alunos.',
    'https://ui-avatars.com/api/?name=Polaco+Wtech&background=random&size=200',
    '[
        {"title": "Teoria Avançada", "description": "Entenda a física e a hidráulica por trás de cada clique."},
        {"title": "Prática Real", "description": "Desmontagem e montagem completa de suspensões WP, Kayaba e Showa."},
        {"title": "Certificado Incluso", "description": "Receba um certificado reconhecido em todo o território nacional."}
    ]'::jsonb
)
ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    benefits = EXCLUDED.benefits,
    video_url = EXCLUDED.video_url;

