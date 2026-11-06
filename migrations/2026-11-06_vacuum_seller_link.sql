-- Link de venda de cada vendedor na Vacuum Pump.
--
-- referred_by guarda de quem é o link pelo qual a pessoa se cadastrou. É o que dá o crédito da
-- venda a quem fechou por ligação, que não deixa rastro no WhatsApp oficial.
--
-- Aditiva: a coluna nasce vazia e nenhum dado existente muda de sentido.
-- Rodar com o dono das tabelas:
--   docker exec -i $(docker ps -qf name=wtechdb_supadb) psql -U supabase_admin -d postgres < este_arquivo
-- Depois recarregar o schema do PostgREST sem derrubar a API:
--   docker kill -s SIGUSR1 $(docker ps -qf name=wtechdb_suparest)

ALTER TABLE "SITE_CampaignCheckouts" ADD COLUMN IF NOT EXISTS referred_by uuid;
CREATE INDEX IF NOT EXISTS site_campaign_checkouts_referred_idx
    ON "SITE_CampaignCheckouts" (campaign, referred_by) WHERE referred_by IS NOT NULL;

-- Cada vendedor precisa abrir o painel para pegar o link dele.
UPDATE "SITE_Roles"
SET permissions = COALESCE(permissions, '{}'::jsonb) || '{"campaign_live_view": true}'::jsonb
WHERE name IN ('Atendente', 'Gerente Atendimento');
