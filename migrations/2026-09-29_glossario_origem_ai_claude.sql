-- Reescritas do glossário antigo (29/09/2026).
--
-- Os endereços do glossário antigo que tinham busca, mas cujo texto o Internet
-- Archive não guardou (ou estava errado demais para corrigir), ganham texto novo,
-- escrito com o Claude e revisado antes de publicar. Origem própria para o painel
-- separar esse texto do legado do WordPress e do gerado pelas outras IAs.
alter table public."SITE_GlossaryTerms" drop constraint if exists "SITE_GlossaryTerms_origin_check";
alter table public."SITE_GlossaryTerms" add constraint "SITE_GlossaryTerms_origin_check"
  check (origin = any (array['MANUAL', 'AI_GEMINI', 'AI_OPENAI', 'AI_OPENROUTER', 'CSV_IMPORT', 'WORDPRESS_LEGADO', 'AI_CLAUDE']));
