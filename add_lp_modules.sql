-- Add columns for Landing Page Modules and Secondary Hero Image
-- We use a default JSON structure for new rows
ALTER TABLE "SITE_LandingPages" ADD COLUMN IF NOT EXISTS modules JSONB DEFAULT '[
    {"image": "https://lp.w-techbrasil.com.br/wp-content/uploads/2025/09/SUSPENSOES-E-SEUS-MODELOS-VARIADOS.jpg.webp", "title": "SUSPENSÕES E SEUS MODELOS VARIADOS", "description": "Neste módulo introdutório, você aprenderá sobre os diferentes tipos de suspensão aplicados a motos off-road e de alta velocidade. Entenda como cada sistema funciona e qual é o mais adequado para cada terreno ou estilo de pilotagem"},
    {"image": "https://lp.w-techbrasil.com.br/wp-content/uploads/2025/09/MOLAS-E-SUAS-PARTICULARIDAS-768x512.jpg.webp", "title": "MOLAS E SUAS PROPRIEDADES", "description": "As molas são componentes fundamentais na suspensão. Neste módulo, você vai se aprofundar nas propriedades das molas e como elas impactam o desempenho e a estabilidade da moto em diferentes situações"},
    {"image": "https://lp.w-techbrasil.com.br/wp-content/uploads/2025/09/MECANICA-DOS-FLUIDOS-PARA-SUSPENSAO-768x512.jpg.webp", "title": "MECÂNICA DOS FLUIDOS PARA SUSPENSÃO", "description": "A suspensão hidráulica utiliza fluido para amortecer impactos. Neste módulo, você vai entender os princípios da mecânica dos fluidos e como eles influenciam o desempenho do sistema de suspensão"},
    {"image": "https://lp.w-techbrasil.com.br/wp-content/uploads/2025/09/SUSPENSOES-E-SEUS-MODELOS-VARIADOS.jpg.webp", "title": "PARAMETRIZAÇÃO DA SUSPENSÃO", "description": "Neste módulo, você aprenderá a parametrizar a suspensão de forma precisa, ajustando configurações para obter o melhor desempenho em diferentes condições e terrenos"},
    {"image": "https://lp.w-techbrasil.com.br/wp-content/uploads/2025/09/MOLAS-E-SUAS-PARTICULARIDAS-768x512.jpg.webp", "title": "ÓLEO E SUAS VISCOSIDADES", "description": "A escolha do óleo correto é fundamental para o bom funcionamento do sistema hidráulico. Neste módulo, você aprenderá sobre as diferentes viscosidades e como elas afetam o desempenho da suspensão"},
    {"image": "https://lp.w-techbrasil.com.br/wp-content/uploads/2025/09/MECANICA-DOS-FLUIDOS-PARA-SUSPENSAO-768x512.jpg.webp", "title": "FLUXOGRAMA DA VÁLVULA", "description": "Entender o funcionamento das válvulas no sistema de suspensão é crucial para ajustar corretamente o fluxo hidráulico. Neste módulo, você aprenderá sobre o fluxo de óleo e como ele é controlado pelas válvulas"}
]'::jsonb;

ALTER TABLE "SITE_LandingPages" ADD COLUMN IF NOT EXISTS hero_secondary_image TEXT DEFAULT 'https://lp.w-techbrasil.com.br/wp-content/webp-express/webp-images/uploads/2025/09/boas-vindas-2.png.webp';

-- Update existing rows that have NULL or empty modules to use the default content
UPDATE "SITE_LandingPages" 
SET modules = '[
    {"image": "https://lp.w-techbrasil.com.br/wp-content/uploads/2025/09/SUSPENSOES-E-SEUS-MODELOS-VARIADOS.jpg.webp", "title": "SUSPENSÕES E SEUS MODELOS VARIADOS", "description": "Neste módulo introdutório, você aprenderá sobre os diferentes tipos de suspensão aplicados a motos off-road e de alta velocidade. Entenda como cada sistema funciona e qual é o mais adequado para cada terreno ou estilo de pilotagem"},
    {"image": "https://lp.w-techbrasil.com.br/wp-content/uploads/2025/09/MOLAS-E-SUAS-PARTICULARIDAS-768x512.jpg.webp", "title": "MOLAS E SUAS PROPRIEDADES", "description": "As molas são componentes fundamentais na suspensão. Neste módulo, você vai se aprofundar nas propriedades das molas e como elas impactam o desempenho e a estabilidade da moto em diferentes situações"},
    {"image": "https://lp.w-techbrasil.com.br/wp-content/uploads/2025/09/MECANICA-DOS-FLUIDOS-PARA-SUSPENSAO-768x512.jpg.webp", "title": "MECÂNICA DOS FLUIDOS PARA SUSPENSÃO", "description": "A suspensão hidráulica utiliza fluido para amortecer impactos. Neste módulo, você vai entender os princípios da mecânica dos fluidos e como eles influenciam o desempenho do sistema de suspensão"},
    {"image": "https://lp.w-techbrasil.com.br/wp-content/uploads/2025/09/SUSPENSOES-E-SEUS-MODELOS-VARIADOS.jpg.webp", "title": "PARAMETRIZAÇÃO DA SUSPENSÃO", "description": "Neste módulo, você aprenderá a parametrizar a suspensão de forma precisa, ajustando configurações para obter o melhor desempenho em diferentes condições e terrenos"},
    {"image": "https://lp.w-techbrasil.com.br/wp-content/uploads/2025/09/MOLAS-E-SUAS-PARTICULARIDAS-768x512.jpg.webp", "title": "ÓLEO E SUAS VISCOSIDADES", "description": "A escolha do óleo correto é fundamental para o bom funcionamento do sistema hidráulico. Neste módulo, você aprenderá sobre as diferentes viscosidades e como elas afetam o desempenho da suspensão"},
    {"image": "https://lp.w-techbrasil.com.br/wp-content/uploads/2025/09/MECANICA-DOS-FLUIDOS-PARA-SUSPENSAO-768x512.jpg.webp", "title": "FLUXOGRAMA DA VÁLVULA", "description": "Entender o funcionamento das válvulas no sistema de suspensão é crucial para ajustar corretamente o fluxo hidráulico. Neste módulo, você aprenderá sobre o fluxo de óleo e como ele é controlado pelas válvulas"}
]'::jsonb 
WHERE modules IS NULL OR modules = '[]'::jsonb;

-- Update existing rows that have NULL hero_secondary_image
UPDATE "SITE_LandingPages" 
SET hero_secondary_image = 'https://lp.w-techbrasil.com.br/wp-content/webp-express/webp-images/uploads/2025/09/boas-vindas-2.png.webp' 
WHERE hero_secondary_image IS NULL;
