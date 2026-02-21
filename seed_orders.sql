-- SEED MOCK ORDERS (Dados de Teste para Vendas & Pedidos)
-- Execute este script para preencher a tela "Vendas & Pedidos" com dados de exemplo.

-- 1. Pedido Pendente (Loja Virtual)
-- Cliente novo aguardando pagamento
INSERT INTO "SITE_Sales" (client_name, client_phone, total_value, status, payment_status, channel, created_at)
VALUES ('Ricardo Oliveira', '11999887766', 458.90, 'pending', 'pending', 'Store', NOW() - INTERVAL '2 hours');

-- Itens do Pedido 1
INSERT INTO "SITE_SaleItems" (sale_id, product_id, quantity, unit_price, cost_snapshot)
SELECT 
    (SELECT id FROM "SITE_Sales" WHERE client_name = 'Ricardo Oliveira' LIMIT 1),
    (SELECT id FROM "SITE_Products" LIMIT 1), -- Pega qualquer produto que existir
    2, 229.45, 100.00;


-- 2. Pedido em Produção (WhatsApp)
-- Cliente recorrente, pedido já pago
INSERT INTO "SITE_Sales" (client_name, client_phone, total_value, status, payment_status, channel, created_at)
VALUES ('Motocross Clube SP', '11988887777', 1250.00, 'production', 'paid', 'WhatsApp', NOW() - INTERVAL '1 day');

-- Itens do Pedido 2
INSERT INTO "SITE_SaleItems" (sale_id, product_id, quantity, unit_price, cost_snapshot)
SELECT 
    (SELECT id FROM "SITE_Sales" WHERE client_name = 'Motocross Clube SP' LIMIT 1),
    (SELECT id FROM "SITE_Products" OFFSET 1 LIMIT 1), -- Pega outro produto
    5, 250.00, 150.00;


-- 3. Pedido Enviado (B2B / Parceiro)
-- Pedido grande enviado semana passada
INSERT INTO "SITE_Sales" (client_name, client_phone, total_value, status, payment_status, channel, created_at)
VALUES ('Oficina do João', '41999995555', 3400.50, 'shipped', 'paid', 'B2B', NOW() - INTERVAL '5 days');

-- Itens do Pedido 3
INSERT INTO "SITE_SaleItems" (sale_id, product_id, quantity, unit_price, cost_snapshot)
SELECT 
    (SELECT id FROM "SITE_Sales" WHERE client_name = 'Oficina do João' LIMIT 1),
    (SELECT id FROM "SITE_Products" OFFSET 2 LIMIT 1), -- Pega outro produto
    10, 340.05, 200.00;


-- 4. Pedido Cancelado (Teste)
INSERT INTO "SITE_Sales" (client_name, client_phone, total_value, status, payment_status, channel, created_at)
VALUES ('Teste Cancelamento', '00000000000', 150.00, 'canceled', 'refunded', 'Store', NOW() - INTERVAL '1 week');

-- Itens do Pedido 4
INSERT INTO "SITE_SaleItems" (sale_id, product_id, quantity, unit_price, cost_snapshot)
SELECT 
    (SELECT id FROM "SITE_Sales" WHERE client_name = 'Teste Cancelamento' LIMIT 1),
    (SELECT id FROM "SITE_Products" LIMIT 1),
    1, 150.00, 50.00;
