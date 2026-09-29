-- Glossário antigo do WordPress de volta (29/09/2026).
--
-- Os verbetes /glossario/o-que-e-… do WordPress traziam ~76% dos cliques
-- orgânicos do site até a migração de abril/2026, quando passaram a dar
-- soft 404 e depois 410. Eles voltam a partir das cópias do Internet Archive,
-- nos MESMOS slugs, com origem própria para o painel separar o legado do que
-- foi escrito ou gerado depois (e para a revisão seguir por ordem de tráfego).
alter table public."SITE_GlossaryTerms" drop constraint if exists "SITE_GlossaryTerms_origin_check";
alter table public."SITE_GlossaryTerms" add constraint "SITE_GlossaryTerms_origin_check"
  check (origin = any (array['MANUAL', 'AI_GEMINI', 'AI_OPENAI', 'AI_OPENROUTER', 'CSV_IMPORT', 'WORDPRESS_LEGADO']));
