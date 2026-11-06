-- Dados do navegador de quem começou o checkout, para o Meta reconhecer a compra enviada pelo
-- servidor: cookies _fbp e _fbc, IP e navegador. O pagamento pode ser confirmado depois, pelo
-- webhook, quando a pessoa já saiu da página.
--
-- Aditiva. A tabela tem RLS sem política: só o servidor lê, e por isso isto fica aqui, não em
-- SITE_Leads, que tem leitura pública.
ALTER TABLE "SITE_CampaignCheckouts" ADD COLUMN IF NOT EXISTS browser_context jsonb;
