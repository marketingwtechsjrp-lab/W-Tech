-- =============================================================================
-- Glossário técnico nativo + gerador por IA
--
-- Persistência usada pela página pública /glossario e pelo painel
-- Admin > Marketing > Glossário.
--
-- A leitura pública enxerga somente verbetes publicados. Todas as mutações do
-- painel passam pela API autenticada e pelo service_role do servidor.
-- =============================================================================

CREATE TABLE IF NOT EXISTS "SITE_GlossaryTerms" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    term TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    letter TEXT NOT NULL,
    niche TEXT,
    category TEXT,
    content TEXT NOT NULL DEFAULT '',
    summary TEXT,
    seo_title TEXT,
    image TEXT,
    author TEXT NOT NULL DEFAULT 'Equipe W-Tech',
    origin TEXT NOT NULL DEFAULT 'MANUAL'
        CHECK (origin IN ('MANUAL', 'AI_GEMINI', 'AI_OPENAI', 'AI_OPENROUTER', 'CSV_IMPORT')),
    published BOOLEAN NOT NULL DEFAULT FALSE,
    reviewed BOOLEAN NOT NULL DEFAULT FALSE,
    views INTEGER NOT NULL DEFAULT 0 CHECK (views >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS site_glossary_letter_published_idx
    ON "SITE_GlossaryTerms" (letter, published);

CREATE INDEX IF NOT EXISTS site_glossary_category_published_idx
    ON "SITE_GlossaryTerms" (category, published);

CREATE INDEX IF NOT EXISTS site_glossary_updated_at_idx
    ON "SITE_GlossaryTerms" (updated_at DESC);

CREATE OR REPLACE FUNCTION set_site_glossary_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS site_glossary_updated_at_trigger ON "SITE_GlossaryTerms";
CREATE TRIGGER site_glossary_updated_at_trigger
    BEFORE UPDATE ON "SITE_GlossaryTerms"
    FOR EACH ROW
    EXECUTE FUNCTION set_site_glossary_updated_at();

ALTER TABLE "SITE_GlossaryTerms" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read published glossary terms" ON "SITE_GlossaryTerms";
CREATE POLICY "Public read published glossary terms"
    ON "SITE_GlossaryTerms"
    FOR SELECT
    USING (published = TRUE);

GRANT SELECT ON "SITE_GlossaryTerms" TO anon, authenticated;
GRANT ALL ON "SITE_GlossaryTerms" TO service_role;

-- Mantém os três conceitos que já apareciam na página estática anterior.
INSERT INTO "SITE_GlossaryTerms"
    (term, slug, letter, niche, category, content, summary, origin, published, reviewed)
VALUES
    (
        'Rebound (Retorno)',
        'rebound-retorno',
        'R',
        'suspensão de motocicletas',
        'Dinâmica',
        '<p>Controle da velocidade com que a suspensão se estende após ser comprimida.</p>',
        'Controle da velocidade com que a suspensão se estende após ser comprimida.',
        'MANUAL',
        TRUE,
        TRUE
    ),
    (
        'Compression (Compressão)',
        'compression-compressao',
        'C',
        'suspensão de motocicletas',
        'Dinâmica',
        '<p>Controle da velocidade com que a suspensão se contrai ao atingir um obstáculo.</p>',
        'Controle da velocidade com que a suspensão se contrai ao atingir um obstáculo.',
        'MANUAL',
        TRUE,
        TRUE
    ),
    (
        'Preload (Pré-carga)',
        'preload-pre-carga',
        'P',
        'suspensão de motocicletas',
        'Ajustes',
        '<p>Ajuste inicial da mola que determina a altura do veículo e o sag.</p>',
        'Ajuste inicial da mola que determina a altura do veículo e o sag.',
        'MANUAL',
        TRUE,
        TRUE
    )
ON CONFLICT (slug) DO NOTHING;

NOTIFY pgrst, 'reload schema';
