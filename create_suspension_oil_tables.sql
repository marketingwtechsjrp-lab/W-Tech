-- ============================================================================
-- Tabela de Níveis de Óleo de Suspensão (W-Tech)
-- Espelha o padrão de SITE_SpringRecommendations, focada em óleo:
-- nível de óleo, viscosidade e modelo de suspensão (dianteira/traseira) por moto.
--
-- SEGURANÇA DE DADOS: nível de óleo e viscosidade são especificações técnicas.
-- A coluna "source" guarda a fonte de cada valor e "is_validated" controla o que
-- pode aparecer no site público. A RLS pública só expõe linhas já validadas pela
-- equipe W-Tech; o painel admin (autenticado) enxerga tudo, inclusive rascunhos.
-- ============================================================================

CREATE TABLE IF NOT EXISTS "SITE_SuspensionOil" (
    "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "category" TEXT NOT NULL,                 -- 'On Road' | 'Off Road' | 'Speed' | 'Motocross'
    "moto_brand" TEXT NOT NULL,               -- Marca da moto (KTM, Yamaha, Honda...)
    "moto_model" TEXT NOT NULL,               -- Modelo / ano da moto
    "part_type" TEXT NOT NULL,                -- 'Front' (garfo) | 'Rear' (amortecedor)
    "suspension_brand" TEXT,                  -- Fabricante da suspensão (WP, Showa, KYB, Sachs, Öhlins...)
    "suspension_model" TEXT,                  -- Modelo da suspensão (ex: WP XACT 48, Showa SFF-Air)
    "oil_level_mm" TEXT,                       -- Nível de óleo / folga de ar do garfo em mm (ex: '100', '95-105')
    "oil_volume_ml" TEXT,                      -- Volume total de óleo em ml (alternativa/amortecedor)
    "viscosity" TEXT,                          -- Viscosidade indicada (ex: 'SAE 5W', '7.5W', 'Motorex 2.5W')
    "oil_product" TEXT,                        -- Produto/óleo recomendado (ex: 'Motorex Racing Fork Oil 5W')
    "source" TEXT,                             -- Fonte do dado (manual, página, URL) — obrigatório no fluxo de revisão
    "is_validated" BOOLEAN NOT NULL DEFAULT FALSE, -- TRUE = revisado pela W-Tech e liberado para o site
    "notes" TEXT,                              -- Observações técnicas (procedimento, ressalvas)
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE "SITE_SuspensionOil" ENABLE ROW LEVEL SECURITY;

-- IMPORTANTE: o app roda com a chave anônima (papel `anon`) e usa auth próprio
-- (SITE_Users), não o Auth do Supabase — então NÃO há papel `authenticated` em
-- runtime. Por isso liberamos leitura/escrita ao papel `public` (inclui `anon`),
-- igual à tabela SITE_SpringRecommendations. A regra "o site só mostra validados"
-- é aplicada no app (components/ui/OilSelector.tsx filtra is_validated = true).
CREATE POLICY "susp_oil_public_read" ON "SITE_SuspensionOil"
    FOR SELECT TO public
    USING (true);

CREATE POLICY "susp_oil_public_write" ON "SITE_SuspensionOil"
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON "SITE_SuspensionOil" TO anon;

-- Índices para otimização de busca/filtros
CREATE INDEX IF NOT EXISTS idx_susp_oil_category ON "SITE_SuspensionOil"("category");
CREATE INDEX IF NOT EXISTS idx_susp_oil_brand ON "SITE_SuspensionOil"("moto_brand");
CREATE INDEX IF NOT EXISTS idx_susp_oil_model ON "SITE_SuspensionOil"("moto_model");
CREATE INDEX IF NOT EXISTS idx_susp_oil_part_type ON "SITE_SuspensionOil"("part_type");
CREATE INDEX IF NOT EXISTS idx_susp_oil_validated ON "SITE_SuspensionOil"("is_validated");

-- Atualiza updated_at automaticamente em cada UPDATE
CREATE OR REPLACE FUNCTION set_suspension_oil_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_suspension_oil_updated_at ON "SITE_SuspensionOil";
CREATE TRIGGER trg_suspension_oil_updated_at
    BEFORE UPDATE ON "SITE_SuspensionOil"
    FOR EACH ROW
    EXECUTE FUNCTION set_suspension_oil_updated_at();
