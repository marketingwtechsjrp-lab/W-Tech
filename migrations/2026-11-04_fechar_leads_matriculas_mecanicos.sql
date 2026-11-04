-- Fecha SITE_Leads, SITE_Enrollments e SITE_Mechanics para a chave anônima (04/11/2026).
-- Etapa 2 de 2: antes vem migrations/2026-11-04_contagem_matriculas_publica.sql.
--
-- As três tinham RLS ligada, mas com policies `USING (true)`: a anon key, que vai no bundle
-- público, lia 3.309 leads (166 com CPF), 258 matrículas e 390 mecânicos, e podia alterar e
-- apagar. Ver SEGURANCA_RLS_PENDENTE.md.
--
-- ORDEM: publicar ANTES o site com /api/public-leads, /api/public-enrollments e o login do
-- portal em /api/client-orders. O bundle anterior lê estas tabelas direto e para de
-- funcionar assim que isto for aplicado (landing page, curso, checkout, portal).
--
-- O que fica para o visitante:
--   SITE_Leads        INSERT nas colunas de formulário. client_code fica de fora de propósito:
--                     quem escolhesse o próprio código com o e-mail de outra pessoa entraria no
--                     portal e veria os pedidos dela.
--   SITE_Mechanics    leitura das colunas do mapa, só de credenciado aprovado; INSERT do cadastro,
--                     só como Pending.
--   SITE_Enrollments  nada. Vagas saem de enrollment_count; o resto passa pelo servidor.
--
-- Quem continua lendo e gravando, conferido em 04/11/2026:
--   painel /admin       authenticated  passe da equipe (api/_dbToken.ts), policies abaixo
--   site, loja e app    service_role   BYPASSRLS (webhooks e endpoints)
--   gestão              gestao_app     BYPASSRLS
--   backup e pg_dump    postgres       BYPASSRLS
--   hermes_ro           leitura        SEM BYPASSRLS: sem policy veria 0 linhas, sem erro
--
-- Aplicar (PostgREST não precisa recarregar: RLS e GRANT valem na hora):
--   docker exec -i $(docker ps -qf name=wtechdb_supadb) psql -U supabase_admin -d postgres -v ON_ERROR_STOP=1 < migrations/2026-11-04_fechar_leads_matriculas_mecanicos.sql
--
-- Desfazer (volta a expor os dados, só em emergência; as policies novas podem ficar):
--   BEGIN;
--   GRANT ALL ON public."SITE_Leads", public."SITE_Enrollments", public."SITE_Mechanics" TO anon;
--   CREATE POLICY "Public Select" ON public."SITE_Leads" FOR SELECT USING (true);
--   CREATE POLICY "Public Update" ON public."SITE_Leads" FOR UPDATE USING (true);
--   CREATE POLICY "Public Delete" ON public."SITE_Leads" FOR DELETE USING (true);
--   CREATE POLICY "Enable all for everyone" ON public."SITE_Enrollments" USING (true) WITH CHECK (true);
--   CREATE POLICY "Enable all for everyone" ON public."SITE_Mechanics" USING (true) WITH CHECK (true);
--   COMMIT;

BEGIN;

REVOKE ALL ON public."SITE_Leads", public."SITE_Enrollments", public."SITE_Mechanics" FROM anon;

-- ─── Leads ───────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins_Manage_All" ON public."SITE_Leads";
DROP POLICY IF EXISTS "Attendants_View_Manage_Own" ON public."SITE_Leads";
DROP POLICY IF EXISTS "Public Delete" ON public."SITE_Leads";
DROP POLICY IF EXISTS "Public Insert" ON public."SITE_Leads";
DROP POLICY IF EXISTS "Public Select" ON public."SITE_Leads";
DROP POLICY IF EXISTS "Public Update" ON public."SITE_Leads";
DROP POLICY IF EXISTS "Public can only insert" ON public."SITE_Leads";
DROP POLICY IF EXISTS "Public_Insert_Leads" ON public."SITE_Leads";
DROP POLICY IF EXISTS "Self lead update via ID" ON public."SITE_Leads";

GRANT INSERT (
    name, email, phone, cpf, type, status, context_id, tags, origin, assigned_to, notes,
    utm_source, utm_medium, utm_campaign, utm_content, utm_term,
    gclid, gbraid, wbraid, fbclid, gad_source, landing_page, referrer
) ON public."SITE_Leads" TO anon;

DROP POLICY IF EXISTS "Visitante cria lead" ON public."SITE_Leads";
CREATE POLICY "Visitante cria lead" ON public."SITE_Leads"
    FOR INSERT TO anon WITH CHECK (true);

-- "Authenticated full access" já existe e continua sendo a do painel.

DROP POLICY IF EXISTS "Hermes le leads" ON public."SITE_Leads";
CREATE POLICY "Hermes le leads" ON public."SITE_Leads"
    FOR SELECT TO hermes_ro USING (true);

-- ─── Matrículas ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Enable all for everyone" ON public."SITE_Enrollments";

DROP POLICY IF EXISTS "Equipe gerencia matriculas" ON public."SITE_Enrollments";
CREATE POLICY "Equipe gerencia matriculas" ON public."SITE_Enrollments"
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Hermes le matriculas" ON public."SITE_Enrollments";
CREATE POLICY "Hermes le matriculas" ON public."SITE_Enrollments"
    FOR SELECT TO hermes_ro USING (true);

-- ─── Mecânicos ───────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Enable all for everyone" ON public."SITE_Mechanics";

GRANT SELECT (id, name, workshop_name, city, state, phone, status, specialty, latitude, longitude)
    ON public."SITE_Mechanics" TO anon;
GRANT INSERT (name, email, phone, workshop_name, city, state, specialty, status)
    ON public."SITE_Mechanics" TO anon;

DROP POLICY IF EXISTS "Visitante ve credenciados" ON public."SITE_Mechanics";
CREATE POLICY "Visitante ve credenciados" ON public."SITE_Mechanics"
    FOR SELECT TO anon USING (status = 'Approved');

DROP POLICY IF EXISTS "Visitante se candidata" ON public."SITE_Mechanics";
CREATE POLICY "Visitante se candidata" ON public."SITE_Mechanics"
    FOR INSERT TO anon WITH CHECK (status = 'Pending');

DROP POLICY IF EXISTS "Equipe gerencia mecanicos" ON public."SITE_Mechanics";
CREATE POLICY "Equipe gerencia mecanicos" ON public."SITE_Mechanics"
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Hermes le mecanicos" ON public."SITE_Mechanics";
CREATE POLICY "Hermes le mecanicos" ON public."SITE_Mechanics"
    FOR SELECT TO hermes_ro USING (true);

COMMIT;
