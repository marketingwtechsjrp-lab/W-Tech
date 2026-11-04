-- Black Friday da Vacuum Pump Standard: checkout transparente, lote real e
-- recuperação de quem entrou e não comprou.
--
-- Aditiva: só cria tabela e coluna, não altera dado existente.
-- Rodar com o dono das tabelas (a SITE_Sales é do supabase_admin):
--   docker exec -i $(docker ps -qf name=wtechdb_supadb) psql -U supabase_admin -d postgres < este_arquivo
-- Depois recarregar o PostgREST (o NOTIFY não surte efeito nesta VPS):
--   docker service update --force wtechdb_suparest

-- Pedido pago fica no mesmo lugar dos outros (SITE_Sales), para aparecer no painel.
-- O índice único é a trava de idempotência: resposta síncrona e webhook do Mercado
-- Pago podem chegar juntos e só um deles consegue gravar a venda.
ALTER TABLE "SITE_Sales" ADD COLUMN IF NOT EXISTS campaign text;
ALTER TABLE "SITE_Sales" ADD COLUMN IF NOT EXISTS mp_payment_id text;
CREATE UNIQUE INDEX IF NOT EXISTS site_sales_mp_payment_id_key
    ON "SITE_Sales" (mp_payment_id) WHERE mp_payment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS site_sales_campaign_idx
    ON "SITE_Sales" (campaign) WHERE campaign IS NOT NULL;

-- Cada pessoa que começou o checkout. É daqui que a varredura tira quem não
-- comprou para entregar ao vendedor. Guarda CPF e endereço, por isso a RLS fica
-- ligada sem política nenhuma: só o servidor (service_role) lê e grava.
CREATE TABLE IF NOT EXISTS "SITE_CampaignCheckouts" (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign text NOT NULL,
    lead_id uuid,
    name text NOT NULL,
    phone text NOT NULL,
    email text,
    document text,
    address jsonb,
    -- waitlist: pediu aviso antes de abrir; contact: pediu para ser chamado;
    -- lead/address/payment: etapa em que parou; pix_pending/review: pagamento em
    -- andamento; rejected: cartão recusado; expired: Pix venceu; paid: comprou.
    stage text NOT NULL DEFAULT 'lead',
    bumps jsonb NOT NULL DEFAULT '[]'::jsonb,
    -- Foto do carrinho no momento do pagamento: preço não muda depois de cobrado.
    items jsonb,
    -- Frete cobrado: método, nome, valor e prazo.
    shipping jsonb,
    amount numeric,
    installments integer,
    payment_attempts integer NOT NULL DEFAULT 0,
    mp_payment_id text,
    payment_status text,
    payment_status_detail text,
    pix_qr_code text,
    pix_qr_code_base64 text,
    pix_expires_at timestamptz,
    sale_id uuid REFERENCES "SITE_Sales"(id) ON DELETE SET NULL,
    followup_at timestamptz,
    followup_assigned_to uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    paid_at timestamptz
);

CREATE INDEX IF NOT EXISTS site_campaign_checkouts_followup_idx
    ON "SITE_CampaignCheckouts" (campaign, stage, updated_at) WHERE followup_at IS NULL;

ALTER TABLE "SITE_CampaignCheckouts" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "SITE_CampaignCheckouts" FROM anon, authenticated;
GRANT ALL ON "SITE_CampaignCheckouts" TO service_role;
