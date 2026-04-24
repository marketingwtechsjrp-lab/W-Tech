-- 1. Create a "Europian Tour" Course (or placeholder)
-- We use a fixed ID so we can reference it easily
INSERT INTO public."SITE_Courses" (
    id, title, description, date, date_end, location, city, state, location_type, price, status, capacity, registered_count, instructor, image, zip_code, address, address_number, address_neighborhood
) VALUES (
    'e1100e11-0000-4000-a000-europa000001', 
    'W-TECH EUROPA TOUR 2025',
    'A maior formação de suspensões do mundo, agora na Europa. Domine a técnica que revoluciona oficinas.',
    '2025-10-10', -- Future date
    '2025-10-15',
    'Lisboa - Portugal',
    'Lisboa',
    'Portugal',
    'Presencial',
    3500.00,
    'Active',
    30,
    12,
    'Polaco',
    'https://images.unsplash.com/photo-1471341971476-ae15ff5dd4ea?q=80&w=2600&auto=format&fit=crop', -- Cool bike/euro vibe
    '1000-001',
    'Centro de Convenções Lisboa',
    '100',
    'Centro'
) ON CONFLICT (id) DO UPDATE SET 
    title = EXCLUDED.title,
    location = EXCLUDED.location,
    image = EXCLUDED.image;

-- 2. Create the Landing Page 'lp-europa'
INSERT INTO public."SITE_LandingPages" (
    slug,
    course_id,
    title,
    subtitle,
    hero_image,
    hero_secondary_image,
    video_url,
    instructor_name,
    instructor_bio,
    instructor_image,
    whatsapp_number,
    benefits,
    modules
) VALUES (
    'lp-europa',
    'e1100e11-0000-4000-a000-europa000001',
    'W-TECH EUROPA: O NÍVEL MUNDIAL CHEGOU',
    'Da teoria à prática extrema: A metodologia que formou a elite do Brasil desembarca na Europa para uma edição histórica.',
    'https://images.unsplash.com/photo-1515777315835-281b94c9589f?q=80&w=2700&auto=format&fit=crop', -- Premium dark mechanics vibe
    'https://lp.w-techbrasil.com.br/wp-content/webp-express/webp-images/uploads/2025/09/boas-vindas-2.png.webp',
    'https://www.youtube.com/watch?v=sB1q0Twx4NE',
    'Polaco',
    'Referência internacional em preparação de suspensões. Desenvolvedor de metodologias únicas aplicadas em competições de alto nível.',
    'https://ui-avatars.com/api/?name=Polaco+Wtech&background=random&size=300',
    '5511999999999',
    '[
        {"title": "Certificação Internacional", "description": "Seu conhecimento validado globalmente. Um diploma que abre portas em qualquer oficina do mundo."},
        {"title": "Networking de Elite", "description": "Conecte-se com os melhores profissionais do mercado europeu e brasileiro em um ambiente exclusivo."},
        {"title": "Tecnologia de Ponta", "description": "Acesso às ferramentas e equipamentos mais modernos do setor de suspensões."},
        {"title": "Suporte Vitalício", "description": "Entre para a comunidade W-Tech e tenha acompanhamento contínuo pós-curso."}
    ]'::jsonb,
    '[
        {"image": "https://lp.w-techbrasil.com.br/wp-content/uploads/2025/09/SUSPENSOES-E-SEUS-MODELOS-VARIADOS.jpg.webp", "title": "1. FUNDAMENTOS GLOBAIS", "description": "Adaptação técnica para diferentes terrenos e marcas globais (WP, Showa, Kayaba, Öhlins)."},
        {"image": "https://lp.w-techbrasil.com.br/wp-content/uploads/2025/09/MOLAS-E-SUAS-PARTICULARIDAS-768x512.jpg.webp", "title": "2. FÍSICA APLICADA", "description": "Dominando a ciência das molas e hidráulica em nível de competição internacional."},
        {"image": "https://lp.w-techbrasil.com.br/wp-content/uploads/2025/09/MECANICA-DOS-FLUIDOS-PARA-SUSPENSAO-768x512.jpg.webp", "title": "3. FLUIDODINÂMICA AVANÇADA", "description": "Estudo profundo do comportamento de óleos sintéticos de alta performance."},
        {"image": "https://lp.w-techbrasil.com.br/wp-content/uploads/2025/09/SUSPENSOES-E-SEUS-MODELOS-VARIADOS.jpg.webp", "title": "4. TELEMETRIA E AJUSTE", "description": "Como ler o terreno e traduzir em cliques precisos para o piloto."},
        {"image": "https://lp.w-techbrasil.com.br/wp-content/uploads/2025/09/MOLAS-E-SUAS-PARTICULARIDAS-768x512.jpg.webp", "title": "5. LABORATORIO PRÁTICO", "description": "Revalvulamento real em bancadas de última geração."},
        {"image": "https://lp.w-techbrasil.com.br/wp-content/uploads/2025/09/MECANICA-DOS-FLUIDOS-PARA-SUSPENSAO-768x512.jpg.webp", "title": "6. BUSINESS & OFICINA", "description": "Como vender serviço de suspensão com alta lucratividade no mercado atual."}
    ]'::jsonb
) ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    subtitle = EXCLUDED.subtitle,
    modules = EXCLUDED.modules,
    hero_image = EXCLUDED.hero_image,
    benefits = EXCLUDED.benefits;
