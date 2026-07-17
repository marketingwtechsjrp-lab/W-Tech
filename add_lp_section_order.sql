-- Ordem/visibilidade das seções da LP (template V9+).
-- Array jsonb de objetos { "id": "benefits", "enabled": true } na ordem de exibição.
-- NULL = ordem padrão do template (lib/lpSections.ts).
ALTER TABLE public."SITE_LandingPages"
    ADD COLUMN IF NOT EXISTS section_order jsonb DEFAULT NULL;

COMMENT ON COLUMN public."SITE_LandingPages".section_order IS
    'Ordem e visibilidade das seções reordenáveis da LP (V9+): [{id, enabled}]. NULL = padrão do template.';
