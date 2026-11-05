-- Tira as chaves de IA do alcance do painel: só o servidor lê e grava (05/11/2026).
--
-- O painel lia openai_api_key, gemini_api_key e openrouter_api_key com o passe da equipe e chamava
-- o provedor pelo navegador, então qualquer pessoa logada as via na aba Network. Agora a IA passa
-- por /api/ai-generate e a tela de configurações grava por /api/staff/config/ai-keys.
--
-- ORDEM: publicar ANTES o site com esses dois endpoints. O bundle anterior lê a chave pela tabela e
-- passa a responder "API Key não configurada" em toda tela de IA do painel assim que isto entrar.
--
-- Quem continua lendo:
--   site, loja e app    service_role   BYPASSRLS (api/_aiGenerate.ts, api/_aiReply.ts, chat da gerência)
--   gestão              gestao_app     BYPASSRLS
--   anon e hermes_ro    nada mudou: a policy deles já não inclui estas chaves
-- O resto de SITE_SystemSettings segue igual para o painel. email_smtp_pass e meli_secret ficam de
-- fora desta migração: a tela ainda os lê (ver SEGURANCA_RLS_PENDENTE.md).
--
-- Aplicar (PostgREST não precisa recarregar):
--   docker exec -i $(docker ps -qf name=wtechdb_supadb) psql -U supabase_admin -d postgres -v ON_ERROR_STOP=1 < migrations/2026-11-05_chaves_ia_so_no_servidor.sql
--
-- Desfazer (a equipe volta a ver as chaves; só em emergência, com o bundle anterior no ar):
--   BEGIN;
--   DROP POLICY "Equipe gerencia" ON public."SITE_SystemSettings";
--   CREATE POLICY "Equipe gerencia" ON public."SITE_SystemSettings" FOR ALL TO authenticated USING (true) WITH CHECK (true);
--   COMMIT;

BEGIN;

SET LOCAL lock_timeout = '5s';

DROP POLICY IF EXISTS "Equipe gerencia" ON public."SITE_SystemSettings";
CREATE POLICY "Equipe gerencia" ON public."SITE_SystemSettings"
    FOR ALL TO authenticated
    USING (key <> ALL (ARRAY['openai_api_key', 'gemini_api_key', 'openrouter_api_key']))
    WITH CHECK (key <> ALL (ARRAY['openai_api_key', 'gemini_api_key', 'openrouter_api_key']));

COMMIT;
