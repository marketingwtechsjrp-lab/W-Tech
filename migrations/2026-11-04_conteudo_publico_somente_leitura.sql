-- Conteúdo público: o visitante lê, mas não grava mais (04/11/2026).
-- Etapa 2 de 4 (ver SEGURANCA_RLS_PENDENTE.md). NÃO depende de publicar o site: nenhuma rota
-- pública grava nestas tabelas. A única linha de código que tenta é o contador de views de
-- pages/BlogPost.tsx, que monta o .update() mas nunca o executa.
--
-- Sem isto, qualquer visitante com a anon key pode trocar preço de curso e de produto,
-- custom_link de checkout, texto de post e pixel de landing page.
--
-- As leituras continuam iguais, inclusive as com a chave pública pelo servidor da loja
-- (SITE_Products) e do app (SITE_Products e SITE_Courses), que usam select('*'). Por isso a
-- leitura de SITE_Products segue a linha inteira, com average_cost e preço de parceiro e de
-- distribuidor: cortar colunas depende de mudar a loja e o app antes (ver a próxima leva em
-- SEGURANCA_RLS_PENDENTE.md).
--
-- Quem continua gravando: painel (authenticated), site, loja e app (service_role), gestão
-- (gestao_app). hermes_ro segue lendo.
--
-- Aplicar (PostgREST não precisa recarregar):
--   docker exec -i $(docker ps -qf name=wtechdb_supadb) psql -U supabase_admin -d postgres -v ON_ERROR_STOP=1 < migrations/2026-11-04_conteudo_publico_somente_leitura.sql
--
-- Desfazer (visitante volta a gravar, só em emergência; as policies novas podem ficar):
--   BEGIN;
--   GRANT ALL ON public."SITE_BlogPosts", public."SITE_CertificateLayouts", public."SITE_Courses", public."SITE_GlossaryTerms", public."SITE_LandingPages", public."SITE_Products", public."SITE_SpringModels", public."SITE_SpringRecommendations", public."SITE_SuspensionOil" TO anon;
--   ALTER TABLE public."SITE_CertificateLayouts" DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE public."SITE_Products" DISABLE ROW LEVEL SECURITY;
--   CREATE POLICY "Enable all for everyone" ON public."SITE_BlogPosts" USING (true) WITH CHECK (true);
--   CREATE POLICY "Enable all for everyone" ON public."SITE_Courses" USING (true) WITH CHECK (true);
--   CREATE POLICY "Admin access Courses anon" ON public."SITE_Courses" TO authenticated, anon USING (true) WITH CHECK (true);
--   CREATE POLICY "Admin access LPs anon" ON public."SITE_LandingPages" TO authenticated, anon USING (true) WITH CHECK (true);
--   CREATE POLICY "Public view LPs" ON public."SITE_LandingPages" FOR SELECT USING (status = 'Published' OR status = 'Active');
--   CREATE POLICY susp_oil_public_write ON public."SITE_SuspensionOil" USING (true) WITH CHECK (true);
--   COMMIT;

BEGIN;

SET LOCAL lock_timeout = '5s';

REVOKE ALL ON
    public."SITE_BlogPosts", public."SITE_CertificateLayouts", public."SITE_Courses", public."SITE_GlossaryTerms",
    public."SITE_LandingPages", public."SITE_Products", public."SITE_SpringModels",
    public."SITE_SpringRecommendations", public."SITE_SuspensionOil"
FROM anon;
GRANT SELECT ON
    public."SITE_BlogPosts", public."SITE_CertificateLayouts", public."SITE_Courses", public."SITE_GlossaryTerms",
    public."SITE_LandingPages", public."SITE_Products", public."SITE_SpringModels",
    public."SITE_SpringRecommendations", public."SITE_SuspensionOil"
TO anon;

-- ─── Posts ───────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Enable all for everyone" ON public."SITE_BlogPosts";

-- ─── Cursos ──────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admin access Courses anon" ON public."SITE_Courses";
DROP POLICY IF EXISTS "Enable all for everyone" ON public."SITE_Courses";

-- ─── Landing pages ───────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admin access LPs anon" ON public."SITE_LandingPages";
DROP POLICY IF EXISTS "Public view LPs" ON public."SITE_LandingPages";

-- ─── Calculadora de óleo ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS susp_oil_public_write ON public."SITE_SuspensionOil";
DROP POLICY IF EXISTS susp_oil_public_read ON public."SITE_SuspensionOil";

-- ─── O mesmo trio para todas ─────────────────────────────────────────────────
-- SITE_Products e SITE_CertificateLayouts estavam sem RLS; a policy antiga de SITE_Products
-- (SITE_Products_Authenticated_All) já dava tudo à equipe e fica.
DO $conteudo$
DECLARE
    t text;
BEGIN
    FOREACH t IN ARRAY ARRAY['SITE_BlogPosts', 'SITE_CertificateLayouts', 'SITE_Courses', 'SITE_LandingPages', 'SITE_Products', 'SITE_SuspensionOil'] LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Visitante le" ON public.%I', t);
        EXECUTE format('CREATE POLICY "Visitante le" ON public.%I FOR SELECT TO anon USING (true)', t);
        EXECUTE format('DROP POLICY IF EXISTS "Hermes le" ON public.%I', t);
        EXECUTE format('CREATE POLICY "Hermes le" ON public.%I FOR SELECT TO hermes_ro USING (true)', t);
        IF t <> 'SITE_Products' THEN
            EXECUTE format('DROP POLICY IF EXISTS "Equipe gerencia" ON public.%I', t);
            EXECUTE format('CREATE POLICY "Equipe gerencia" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)', t);
        END IF;
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    END LOOP;
END
$conteudo$;

COMMIT;
