-- ============================================================================
-- Permissão `orders_payment_link` — gerar link de cobrança sem poder lançar
-- dinheiro no fluxo de caixa.
--
-- MOTIVO
-- Os endpoints /api/create-stripe-checkout, /api/asaas-payment-link e
-- /api/mercadopago-balance-link exigiam `financial_add_transaction`. Os cargos
-- Atendente e Marketing não têm essa chave e o Gerente Atendimento a tem
-- explicitamente `false` — então todo atendente tomava 403 "forbidden" ao
-- tentar gerar o link do Stripe de uma matrícula (só Super Admin e Financeiro
-- conseguiam).
--
-- Conceder `financial_add_transaction` resolveria, mas essa mesma chave libera
-- "Novo Lançamento" no Fluxo de Caixa — poder demais para quem só precisa
-- cobrar o cliente. Daí a chave nova e estreita.
--
-- Os endpoints agora aceitam UMA das duas (lib/permissions.ts →
-- PAYMENT_LINK_PERMISSIONS). A revogação deliberada de
-- `financial_add_transaction` no Gerente Atendimento é PRESERVADA.
-- ============================================================================

UPDATE "SITE_Roles"
SET permissions = COALESCE(permissions, '{}'::jsonb) || '{"orders_payment_link": true}'::jsonb
WHERE name IN ('Atendente', 'Gerente Atendimento', 'Financeiro');

-- Conferência: as três linhas devem sair com orders_payment_link = true e o
-- Gerente Atendimento deve continuar com financial_add_transaction = false.
-- SELECT name,
--        permissions -> 'orders_payment_link'      AS pode_gerar_link,
--        permissions -> 'financial_add_transaction' AS pode_lancar_caixa
-- FROM "SITE_Roles"
-- ORDER BY level DESC;
