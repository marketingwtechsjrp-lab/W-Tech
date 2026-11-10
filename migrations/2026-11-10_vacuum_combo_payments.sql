-- Pagamento combinado da Vacuum Pump: parte no Pix e/ou de 1 a 3 cartões.
-- Guarda o andamento (cartões reservados, Pix da parte, captura) e os ids de cada pagamento
-- no Mercado Pago. Formato em api/_vacuumCombo.ts (ComboRecord).
--
-- Aditiva. A tabela tem RLS sem política: só o servidor lê.
ALTER TABLE "SITE_CampaignCheckouts" ADD COLUMN IF NOT EXISTS split_payments jsonb;

NOTIFY pgrst, 'reload schema';
