-- Contagem de vagas sem ler SITE_Enrollments (04/11/2026). Etapa 1 de 2.
--
-- As páginas de curso mostram vagas com `SITE_Enrollments(count)`, e o PostgREST
-- transforma isso em count() sobre a linha inteira. Fechar a tabela para `anon` quebraria
-- essas páginas, e GRANT por coluna não resolve: a referência à linha inteira exige SELECT
-- em todas as colunas. `enrollment_count` entrega só o número, como campo calculado:
--   SITE_Courses?select=*,enrollment_count
--
-- ORDEM: esta migração, depois recarregar o PostgREST, depois publicar o site, e só então
-- migrations/2026-11-04_fechar_leads_matriculas_mecanicos.sql. O build do site já usa este
-- campo no prerender. Recarregar (o NOTIFY não surte efeito nesta instalação):
--   docker service update --force wtechdb_suparest
--
-- Aplicar:
--   docker exec -i $(docker ps -qf name=wtechdb_supadb) psql -U supabase_admin -d postgres -v ON_ERROR_STOP=1 < migrations/2026-11-04_contagem_matriculas_publica.sql
--
-- Desfazer:
--   DROP FUNCTION public.enrollment_count(public."SITE_Courses");

BEGIN;

CREATE OR REPLACE FUNCTION public.enrollment_count(curso public."SITE_Courses")
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT count(*) FROM public."SITE_Enrollments" e WHERE e.course_id = curso.id;
$$;

REVOKE ALL ON FUNCTION public.enrollment_count(public."SITE_Courses") FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enrollment_count(public."SITE_Courses") TO anon, authenticated, service_role;

COMMIT;
