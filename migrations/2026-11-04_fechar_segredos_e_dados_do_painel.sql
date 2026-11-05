-- Fecha para a chave anônima os segredos e as tabelas que só o painel e o servidor usam (04/11/2026).
-- Etapa 1 de 4 (ver SEGURANCA_RLS_PENDENTE.md). NÃO depende de publicar o site: nenhuma destas
-- tabelas é lida ou gravada por rota pública. Conferido no grafo de imports a partir do App.tsx,
-- no pg_stat_statements por papel desde 23/10 (sem descarte) e nos bundles da loja, do app e do
-- gestão, que falam com elas por service_role ou gestao_app.
--
-- A anon key vai no bundle público. Sem isto, qualquer visitante lê openai_api_key,
-- openrouter_api_key, gemini_api_key, email_smtp_pass e meli_secret, 101 mil mensagens de
-- WhatsApp, 3.518 contatos de lista, 2.334 envios de campanha e o caixa, e pode trocar o gtm_id,
-- que roda script em todas as páginas.
--
-- O que fica para o visitante:
--   SITE_SystemSettings  leitura só das chaves públicas (lista abaixo), sem gravar nada
--   SITE_Config          o que já lia, menos relatório de IA, log de push e bloqueados
--   o resto              nada
--
-- Quem continua lendo e gravando:
--   painel /admin       authenticated  passe da equipe (api/_dbToken.ts). Nas tabelas que já tinham
--                                      RLS, mantém os mesmos comandos de antes; nas que estavam
--                                      sem RLS, acesso total, como já era
--   site, loja e app    service_role   BYPASSRLS
--   gestão              gestao_app     BYPASSRLS
--   backup e pg_dump    postgres       BYPASSRLS
--   hermes_ro           leitura        SEM BYPASSRLS: ganha policy para não passar a ver 0 linhas.
--                                      Em SITE_SystemSettings vê só as chaves públicas
--
-- As policies antigas das tabelas sem RLS saem: nunca valeram, e as que leem auth.users dariam
-- 42501 para o painel no momento em que a RLS fosse ligada.
--
-- Chave nova em SITE_SystemSettings que o site público precise ler tem de entrar na lista da
-- policy "Visitante le configuracoes publicas"; sem isso o visitante simplesmente não a recebe.
--
-- Aplicar (PostgREST não precisa recarregar: RLS e GRANT valem na hora):
--   docker exec -i $(docker ps -qf name=wtechdb_supadb) psql -U supabase_admin -d postgres -v ON_ERROR_STOP=1 < migrations/2026-11-04_fechar_segredos_e_dados_do_painel.sql
--
-- Desfazer (volta a expor os dados, só em emergência). As policies sem efeito das tabelas que
-- estavam sem RLS não voltam:
--   BEGIN;
--   DO $$
--   DECLARE t text; p record;
--   BEGIN
--     FOREACH t IN ARRAY ARRAY['SITE_ApprovalEvents','SITE_ApprovalItems','SITE_Automacao_Fila','SITE_CampaignQueue','SITE_CampaignRequests','SITE_CampaignResults','SITE_LeadHistory','SITE_MarketingCampaigns','SITE_MarketingListMembers','SITE_MarketingLists','SITE_MeetingNotes','SITE_MessageTemplates','SITE_Notifications','SITE_PaymentMethods','SITE_ProductBOM','SITE_Purchases','SITE_Shipments','SITE_StockMovements','SITE_SupportMessages','SITE_SupportTickets','SITE_Tasks','SITE_TrafficPlanItems','SITE_TrafficPlans','SITE_Transactions','chats','course_alerts_state','dados_cliente','documents','n8n_chat_histories','SITE_Settings','SITE_SystemSettings','config_crm'] LOOP
--       EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY', t);
--       EXECUTE format('GRANT ALL ON public.%I TO anon', t);
--       EXECUTE format('DROP POLICY IF EXISTS "Equipe gerencia" ON public.%I', t);
--       EXECUTE format('DROP POLICY IF EXISTS "Hermes le" ON public.%I', t);
--     END LOOP;
--     FOREACH t IN ARRAY ARRAY['SITE_AIGroupLog','SITE_ChecklistTemplate','SITE_CourseChecklists','SITE_EmailCampaigns','SITE_EmailLogs','SITE_FlowSteps','SITE_Pix_Recovery_Stats','SITE_PopNotifyConfig','SITE_TaskCategories','SITE_WaAtendenteAnalises','SITE_WaAtendenteEvolucao','SITE_WaAtendenteMensagens','SITE_WaAtendentes','SITE_WhatsAppAIConfig','SITE_WhatsAppAIKnowledge','SITE_WhatsAppAIMemory','SITE_WhatsAppAIRules','SITE_WhatsAppCloudConversations','SITE_WhatsAppCloudMessages'] LOOP
--       EXECUTE format('GRANT ALL ON public.%I TO anon', t);
--       EXECUTE format('DROP POLICY IF EXISTS "Hermes le" ON public.%I', t);
--       FOR p IN SELECT polname FROM pg_policy WHERE polrelid = format('public.%I', t)::regclass LOOP
--         EXECUTE format('ALTER POLICY %I ON public.%I TO public', p.polname, t);
--       END LOOP;
--     END LOOP;
--     FOREACH t IN ARRAY ARRAY['SITE_AgentSuggestions','SITE_BomItems','SITE_Boms','SITE_Customers','SITE_DemandForecasts','SITE_Events','SITE_FlowUpActivities','SITE_FlowUpLeads','SITE_FlowUpSegments','SITE_GraphBreakpoints','SITE_GraphEffectLog','SITE_GraphEvents','SITE_GraphExecutions','SITE_GraphNodeRuns','SITE_GraphOutbox','SITE_GraphSecrets','SITE_GraphVersions','SITE_Graphs','SITE_KnowledgeEdges','SITE_KnowledgeNodes','SITE_OrderEvents','SITE_PopAlertState','SITE_ProductionConsumption','SITE_ProductionOrders','SITE_PurchaseOrderItems','SITE_PurchaseOrders','SITE_StockParams','SITE_SupplierProducts','SITE_Suppliers','SITE_VSLRetention','auctions','leads','manuals','products','profiles','service_order_items','service_orders','task_steps','task_template_steps','task_templates','tasks','trainings','transactions','user_training_progress','view_sales_by_attendant','workshop_clients','workshop_inventory'] LOOP
--       EXECUTE format('GRANT ALL ON public.%I TO anon', t);
--     END LOOP;
--   END $$;
--   DROP POLICY IF EXISTS "Visitante le configuracoes publicas" ON public."SITE_SystemSettings";
--   DROP POLICY IF EXISTS config_anon_sem_dados_internos ON public."SITE_Config";
--   COMMIT;

BEGIN;

-- Uma consulta longa não pode segurar o site inteiro na fila atrás desta migração.
SET LOCAL lock_timeout = '5s';

-- ─── Segredos ────────────────────────────────────────────────────────────────
REVOKE ALL ON public."SITE_SystemSettings" FROM anon;
GRANT SELECT ON public."SITE_SystemSettings" TO anon;

DROP POLICY IF EXISTS "Admin access settings anon" ON public."SITE_SystemSettings";
DROP POLICY IF EXISTS site_settings_admin_delete ON public."SITE_SystemSettings";
DROP POLICY IF EXISTS site_settings_admin_insert ON public."SITE_SystemSettings";
DROP POLICY IF EXISTS site_settings_admin_update ON public."SITE_SystemSettings";
DROP POLICY IF EXISTS v6_admin_write ON public."SITE_SystemSettings";
DROP POLICY IF EXISTS v6_public_read ON public."SITE_SystemSettings";

DROP POLICY IF EXISTS "Equipe gerencia" ON public."SITE_SystemSettings";
CREATE POLICY "Equipe gerencia" ON public."SITE_SystemSettings"
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Lista de permissão, não de bloqueio: chave nova nasce fechada.
-- webhook_* continua aqui porque os formulários públicos disparam o webhook pelo navegador
-- (lib/webhooks.ts). A URL dá para descobrir, mas não dá mais para trocar.
DROP POLICY IF EXISTS "Visitante le configuracoes publicas" ON public."SITE_SystemSettings";
CREATE POLICY "Visitante le configuracoes publicas" ON public."SITE_SystemSettings"
    FOR SELECT TO anon, hermes_ro
    USING (
        key = ANY (ARRAY[
            'address', 'bio_config', 'cnpj', 'email_contato', 'facebook', 'favicon_url', 'ga_id', 'gtm_id',
            'hero_headline', 'hero_subheadline', 'hero_video_url', 'instagram', 'linkedin',
            'logo_dark_url', 'logo_url', 'menu_styles', 'partner_brands', 'phone_main', 'pixel_id',
            'primary_color', 'secondary_color', 'site_title', 'system_webhooks',
            'webhook_lead', 'webhook_lead_completed', 'webhook_lead_started', 'webhook_mechanic', 'webhook_order',
            'whatsapp_enabled', 'whatsapp_phone'
        ])
        OR key LIKE 'seo\_%'
    );

ALTER TABLE public."SITE_SystemSettings" ENABLE ROW LEVEL SECURITY;

-- Ninguém usa estas duas (SITE_Settings ainda guarda gemini_api_key): só quem ignora RLS enxerga.
REVOKE ALL ON public."SITE_Settings", public.config_crm FROM anon;
ALTER TABLE public."SITE_Settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.config_crm ENABLE ROW LEVEL SECURITY;

-- Lidas só pelo servidor, com service_role (site, loja e app).
DROP POLICY IF EXISTS config_anon_sem_dados_internos ON public."SITE_Config";
CREATE POLICY config_anon_sem_dados_internos ON public."SITE_Config"
    AS RESTRICTIVE FOR SELECT TO anon
    USING (key <> ALL (ARRAY['ai_last_report', 'ai_last_scan', 'app_blocked_users', 'crm_roleta_pointer', 'push_send_log']));

-- ─── Tabelas que estavam sem RLS ─────────────────────────────────────────────
DO $fechar$
DECLARE
    t text;
    p record;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        -- Marketing e contatos
        'SITE_ApprovalEvents', 'SITE_ApprovalItems', 'SITE_Automacao_Fila', 'SITE_CampaignQueue',
        'SITE_CampaignRequests', 'SITE_CampaignResults', 'SITE_MarketingCampaigns',
        'SITE_MarketingListMembers', 'SITE_MarketingLists', 'SITE_MessageTemplates',
        -- CRM, tarefas e suporte
        'SITE_LeadHistory', 'SITE_MeetingNotes', 'SITE_Notifications', 'SITE_Shipments',
        'SITE_SupportMessages', 'SITE_SupportTickets', 'SITE_Tasks',
        -- Financeiro e estoque
        'SITE_PaymentMethods', 'SITE_ProductBOM', 'SITE_Purchases', 'SITE_StockMovements',
        'SITE_TrafficPlanItems', 'SITE_TrafficPlans', 'SITE_Transactions',
        -- Sobras do n8n e do gestão antigo
        'chats', 'course_alerts_state', 'dados_cliente', 'documents', 'n8n_chat_histories'
    ] LOOP
        EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
        FOR p IN SELECT polname FROM pg_policy WHERE polrelid = format('public.%I', t)::regclass LOOP
            EXECUTE format('DROP POLICY %I ON public.%I', p.polname, t);
        END LOOP;
        EXECUTE format('CREATE POLICY "Equipe gerencia" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)', t);
        EXECUTE format('CREATE POLICY "Hermes le" ON public.%I FOR SELECT TO hermes_ro USING (true)', t);
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    END LOOP;
END
$fechar$;

-- ─── Tabelas com RLS ligada e policy aberta para todos ───────────────────────
-- A equipe segue com os mesmos comandos de antes; só o público da policy muda.
DO $fechar$
DECLARE
    t text;
    p record;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        -- Conversas e IA de WhatsApp
        'SITE_AIGroupLog', 'SITE_WaAtendenteAnalises', 'SITE_WaAtendenteEvolucao', 'SITE_WaAtendenteMensagens',
        'SITE_WaAtendentes', 'SITE_WhatsAppAIConfig', 'SITE_WhatsAppAIKnowledge', 'SITE_WhatsAppAIMemory',
        'SITE_WhatsAppAIRules', 'SITE_WhatsAppCloudConversations', 'SITE_WhatsAppCloudMessages',
        -- Marketing e operação
        'SITE_ChecklistTemplate', 'SITE_CourseChecklists', 'SITE_EmailCampaigns', 'SITE_EmailLogs', 'SITE_FlowSteps',
        'SITE_Pix_Recovery_Stats', 'SITE_PopNotifyConfig', 'SITE_TaskCategories'
    ] LOOP
        EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
        FOR p IN SELECT polname FROM pg_policy WHERE polrelid = format('public.%I', t)::regclass AND polname <> 'Hermes le' LOOP
            EXECUTE format('ALTER POLICY %I ON public.%I TO authenticated', p.polname, t);
        END LOOP;
        EXECUTE format('DROP POLICY IF EXISTS "Hermes le" ON public.%I', t);
        EXECUTE format('CREATE POLICY "Hermes le" ON public.%I FOR SELECT TO hermes_ro USING (true)', t);
    END LOOP;
END
$fechar$;

-- ─── Sem uso pelo visitante, sobras e visões ─────────────────────────────────
-- Só tira o privilégio: papéis e policies dos outros seguem como estão. Parte já devolvia 0 linhas
-- para a anon por RLS (SITE_Customers, com password_hash), e sai para não depender só disso.
-- As duas visões rodam com os direitos do dono: fechar a tabela de baixo não as fecha.
REVOKE ALL ON
    public."SITE_AgentSuggestions", public."SITE_BomItems", public."SITE_Boms", public."SITE_Customers",
    public."SITE_DemandForecasts", public."SITE_Events", public."SITE_FlowUpActivities",
    public."SITE_FlowUpLeads", public."SITE_FlowUpSegments", public."SITE_GraphBreakpoints",
    public."SITE_GraphEffectLog", public."SITE_GraphEvents", public."SITE_GraphExecutions",
    public."SITE_GraphNodeRuns", public."SITE_GraphOutbox", public."SITE_GraphSecrets",
    public."SITE_GraphVersions", public."SITE_Graphs", public."SITE_KnowledgeEdges",
    public."SITE_KnowledgeNodes", public."SITE_OrderEvents", public."SITE_PopAlertState",
    public."SITE_ProductionConsumption", public."SITE_ProductionOrders", public."SITE_PurchaseOrderItems",
    public."SITE_PurchaseOrders", public."SITE_StockParams", public."SITE_SupplierProducts",
    public."SITE_Suppliers", public."SITE_VSLRetention",
    public.auctions, public.leads, public.manuals, public.products, public.profiles,
    public.service_order_items, public.service_orders, public.task_steps, public.task_template_steps,
    public.task_templates, public.tasks, public.trainings, public.transactions,
    public.user_training_progress, public.view_sales_by_attendant, public.workshop_clients,
    public.workshop_inventory
FROM anon;

COMMIT;
