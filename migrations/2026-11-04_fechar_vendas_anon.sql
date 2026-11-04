-- Fecha SITE_Sales e SITE_SaleItems para a chave anônima (04/11/2026).
--
-- A anon key vai no bundle público. Com RLS desligada e GRANT ALL, qualquer visitante
-- lia nome, telefone, e-mail, endereço e notas dos pedidos (CPF nos de campanha), e
-- podia gravar e apagar. Ver SEGURANCA_RLS_PENDENTE.md.
--
-- ORDEM: publicar ANTES o site com /api/order-tracking e /api/client-orders.
-- O bundle anterior de /rastreio e /meus-pedidos lê a tabela com a chave anônima e para
-- de funcionar assim que isto for aplicado.
--
-- Quem continua lendo e gravando, conferido em 04/11/2026:
--   painel /admin       authenticated  passe da equipe (api/_dbToken.ts), policy abaixo
--   site, loja e app    service_role   BYPASSRLS (webhooks, api/_clientOrders.ts)
--   gestão              gestao_app     BYPASSRLS
--   backup e pg_dump    postgres       BYPASSRLS
--   hermes_ro           leitura        SEM BYPASSRLS: sem policy veria 0 linhas, sem erro
--
-- Aplicar (PostgREST não precisa recarregar: RLS e GRANT valem na hora):
--   docker exec -i $(docker ps -qf name=wtechdb_supadb) psql -U supabase_admin -d postgres -v ON_ERROR_STOP=1 < migrations/2026-11-04_fechar_vendas_anon.sql
--
-- Desfazer (volta a expor os dados, só em emergência):
--   BEGIN;
--   ALTER TABLE public."SITE_Sales" DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE public."SITE_SaleItems" DISABLE ROW LEVEL SECURITY;
--   GRANT ALL ON public."SITE_Sales", public."SITE_SaleItems" TO anon;
--   COMMIT;

BEGIN;

REVOKE ALL ON public."SITE_Sales", public."SITE_SaleItems" FROM anon;

-- Sobra de fix_sales_rls*.sql, sem efeito até hoje porque a RLS estava desligada.
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public."SITE_Sales";
DROP POLICY IF EXISTS "Allow authenticated users to insert sales" ON public."SITE_Sales";
DROP POLICY IF EXISTS "Allow authenticated users to read sales" ON public."SITE_Sales";

DROP POLICY IF EXISTS "Equipe gerencia vendas" ON public."SITE_Sales";
CREATE POLICY "Equipe gerencia vendas" ON public."SITE_Sales"
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Equipe gerencia itens de venda" ON public."SITE_SaleItems";
CREATE POLICY "Equipe gerencia itens de venda" ON public."SITE_SaleItems"
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Hermes le vendas" ON public."SITE_Sales";
CREATE POLICY "Hermes le vendas" ON public."SITE_Sales"
    FOR SELECT TO hermes_ro USING (true);

DROP POLICY IF EXISTS "Hermes le itens de venda" ON public."SITE_SaleItems";
CREATE POLICY "Hermes le itens de venda" ON public."SITE_SaleItems"
    FOR SELECT TO hermes_ro USING (true);

ALTER TABLE public."SITE_Sales" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."SITE_SaleItems" ENABLE ROW LEVEL SECURITY;

COMMIT;
