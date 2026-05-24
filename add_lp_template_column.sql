-- ============================================================
--  LP Template Column — rode no Supabase SQL Editor
-- ============================================================
-- Adiciona o campo 'template' na tabela de Landing Pages
-- Valores possíveis: 'v1' (Classic dark) | 'v2' (Premium cinematic)

ALTER TABLE "SITE_LandingPages"
  ADD COLUMN IF NOT EXISTS template text NOT NULL DEFAULT 'v1';

-- Recarrega o schema cache do PostgREST
NOTIFY pgrst, 'reload schema';
