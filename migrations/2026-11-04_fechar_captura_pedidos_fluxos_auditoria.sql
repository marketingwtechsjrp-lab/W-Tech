-- Fecha o que ainda tinha caminho público pelo navegador (04/11/2026).
-- Etapa 4 de 4 (ver SEGURANCA_RLS_PENDENTE.md).
--
-- ORDEM: publicar ANTES o site v3.57.0. O bundle anterior usa a chave anônima nestas tabelas e
-- para de funcionar assim que isto for aplicado:
--   SITE_CaptureLeads                         /captura/:slug grava o lead e soma votos
--   SITE_EmailFlows, SITE_FlowEnrollments     lead novo entra no fluxo de boas-vindas
--   SITE_AuditLogs                            login e logout fora de /admin
--   SITE_Orders                               /checkout/:planId (0 visitas em 90 dias)
--
-- A anon lia 8 leads de captura, 699 inscrições em fluxo com e-mail, 19 mil linhas de auditoria
-- e 3 pedidos com CPF, e podia alterar e apagar. A trilha de auditoria apagável por qualquer um
-- era o pior caso: encobria o resto.
--
-- O que fica para o visitante:
--   SITE_CaptureCampaigns  leitura de campanha que não seja rascunho (a tela já tratava igual)
--   o resto                nada: passa por /api/public-capture e /api/public-leads
--
-- Quem continua lendo e gravando:
--   painel /admin       authenticated  mesmos comandos, exceto SITE_AuditLogs: só lê e inclui
--   site, loja e app    service_role   BYPASSRLS
--   gestão              gestao_app     BYPASSRLS
--   hermes_ro           leitura        SEM BYPASSRLS: ganha policy
--
-- Aplicar (PostgREST não precisa recarregar):
--   docker exec -i $(docker ps -qf name=wtechdb_supadb) psql -U supabase_admin -d postgres -v ON_ERROR_STOP=1 < migrations/2026-11-04_fechar_captura_pedidos_fluxos_auditoria.sql
--
-- Desfazer (volta a expor os dados, só em emergência; as policies novas podem ficar):
--   BEGIN;
--   GRANT ALL ON public."SITE_AuditLogs", public."SITE_CaptureCampaigns", public."SITE_CaptureLeads", public."SITE_EmailFlows", public."SITE_FlowEnrollments", public."SITE_Orders" TO anon;
--   ALTER TABLE public."SITE_Orders" DISABLE ROW LEVEL SECURITY;
--   CREATE POLICY "Enable all for everyone" ON public."SITE_AuditLogs" USING (true) WITH CHECK (true);
--   ALTER POLICY capture_campaigns_all ON public."SITE_CaptureCampaigns" TO public;
--   ALTER POLICY capture_leads_all ON public."SITE_CaptureLeads" TO public;
--   ALTER POLICY "Allow all on EmailFlows" ON public."SITE_EmailFlows" TO public;
--   ALTER POLICY "Allow all on FlowEnrollments" ON public."SITE_FlowEnrollments" TO public;
--   COMMIT;

BEGIN;

SET LOCAL lock_timeout = '5s';

REVOKE ALL ON
    public."SITE_AuditLogs", public."SITE_CaptureCampaigns", public."SITE_CaptureLeads",
    public."SITE_EmailFlows", public."SITE_FlowEnrollments", public."SITE_Orders"
FROM anon;

-- ─── Captura ─────────────────────────────────────────────────────────────────
GRANT SELECT ON public."SITE_CaptureCampaigns" TO anon;
ALTER POLICY capture_campaigns_all ON public."SITE_CaptureCampaigns" TO authenticated;
ALTER POLICY capture_leads_all ON public."SITE_CaptureLeads" TO authenticated;

DROP POLICY IF EXISTS "Visitante ve campanha publicada" ON public."SITE_CaptureCampaigns";
CREATE POLICY "Visitante ve campanha publicada" ON public."SITE_CaptureCampaigns"
    FOR SELECT TO anon USING (status <> 'draft');

-- ─── Fluxos de e-mail ────────────────────────────────────────────────────────
ALTER POLICY "Allow all on EmailFlows" ON public."SITE_EmailFlows" TO authenticated;
ALTER POLICY "Allow all on FlowEnrollments" ON public."SITE_FlowEnrollments" TO authenticated;

-- ─── Pedidos antigos da loja ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "Equipe gerencia" ON public."SITE_Orders";
CREATE POLICY "Equipe gerencia" ON public."SITE_Orders"
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
ALTER TABLE public."SITE_Orders" ENABLE ROW LEVEL SECURITY;

-- ─── Auditoria ───────────────────────────────────────────────────────────────
-- O painel só lista e inclui. Sem UPDATE e DELETE, nem a equipe altera a própria trilha.
DROP POLICY IF EXISTS "Enable all for everyone" ON public."SITE_AuditLogs";

DROP POLICY IF EXISTS "Equipe le auditoria" ON public."SITE_AuditLogs";
CREATE POLICY "Equipe le auditoria" ON public."SITE_AuditLogs"
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Equipe registra auditoria" ON public."SITE_AuditLogs";
CREATE POLICY "Equipe registra auditoria" ON public."SITE_AuditLogs"
    FOR INSERT TO authenticated WITH CHECK (true);

-- ─── Hermes ──────────────────────────────────────────────────────────────────
DO $hermes$
DECLARE
    t text;
BEGIN
    FOREACH t IN ARRAY ARRAY['SITE_AuditLogs', 'SITE_CaptureCampaigns', 'SITE_CaptureLeads', 'SITE_EmailFlows', 'SITE_FlowEnrollments', 'SITE_Orders'] LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Hermes le" ON public.%I', t);
        EXECUTE format('CREATE POLICY "Hermes le" ON public.%I FOR SELECT TO hermes_ro USING (true)', t);
    END LOOP;
END
$hermes$;

COMMIT;
