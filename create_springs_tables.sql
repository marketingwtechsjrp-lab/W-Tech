-- Tabela de Recomendações de Molas
CREATE TABLE IF NOT EXISTS "SITE_SpringRecommendations" (
    "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "part_type" TEXT NOT NULL, -- 'Front' ou 'Rear'
    "weight_range" TEXT NOT NULL,
    "spring_code" TEXT,
    "standard_code" TEXT,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE "SITE_SpringRecommendations" ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
CREATE POLICY "Allow public select access" ON "SITE_SpringRecommendations"
    FOR SELECT TO public
    USING (true);

CREATE POLICY "Allow authenticated full access" ON "SITE_SpringRecommendations"
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

-- Índices para otimização de busca
CREATE INDEX IF NOT EXISTS idx_springs_brand ON "SITE_SpringRecommendations"("brand");
CREATE INDEX IF NOT EXISTS idx_springs_model ON "SITE_SpringRecommendations"("model");
CREATE INDEX IF NOT EXISTS idx_springs_part_type ON "SITE_SpringRecommendations"("part_type");
