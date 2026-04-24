-- EXTENDED SEED DATA FOR W-TECH PLATFORM
-- Run this script to fully populate your system with test data.

-- ==========================================
-- 1. PRODUCTS & RAW MATERIALS
-- ==========================================

-- Raw Materials (Insumos)
INSERT INTO "SITE_Products" (sku, name, description, category, type, unit, sale_price, average_cost, current_stock, min_stock, weight, length, width, height, image_url)
VALUES 
('OIL-GOLD', 'Óleo Ohlins Gold Fluid (1L)', 'Fluido de alta performance para amortecedores.', 'Insumos', 'raw_material', 'l', 180.00, 120.00, 15, 5, 950, 10, 8, 25, 'https://images.unsplash.com/photo-1635334839845-7407511b0e27?auto=format&fit=crop&q=80&w=800'),
('SEAL-32', 'Retentores 32mm Fox/RockShox', 'Kit de vedação para garfos de 32mm.', 'Insumos', 'raw_material', 'un', 150.00, 80.00, 50, 10, 50, 10, 10, 2, 'https://images.unsplash.com/photo-1616406432452-07bc592fabde?auto=format&fit=crop&q=80&w=800'),
('GREASE-SLICK', 'Graxa Slick Honey (Pote)', 'Graxa especial para suspensões.', 'Insumos', 'raw_material', 'un', 120.00, 70.00, 20, 3, 250, 8, 8, 5, 'https://images.unsplash.com/photo-1627483298606-1d935ee286ea?auto=format&fit=crop&q=80&w=800');

-- Finished Products (Produtos Finais)
INSERT INTO "SITE_Products" (sku, name, description, category, type, unit, sale_price, average_cost, current_stock, min_stock, weight, length, width, height, image_url)
VALUES 
('FOX-40-WC', 'Fox 40 Factory Float Kashima 29"', 'A lenda do Downhill. Curso de 203mm.', 'Suspensões', 'product', 'un', 12500.00, 9000.00, 2, 1, 2800, 90, 20, 15, 'https://images.unsplash.com/photo-1576435728678-68d01da11e31?auto=format&fit=crop&q=80&w=800'),
('RS-ZEB-ULT', 'RockShox ZEB Ultimate 170mm', 'Rigidez para Enduro agressivo. Hastes de 38mm.', 'Suspensões', 'product', 'un', 6800.00, 4800.00, 6, 2, 2300, 85, 18, 12, 'https://images.unsplash.com/photo-1534149620352-95724578b97e?auto=format&fit=crop&q=80&w=800'),
('CANE-DB-COIL', 'Cane Creek DB Coil IL', 'Amortecedor de mola Twin-Tube.', 'Shocks', 'product', 'un', 3500.00, 2400.00, 3, 1, 750, 25, 10, 10, 'https://images.unsplash.com/photo-1519564619946-0b89aa20869a?auto=format&fit=crop&q=80&w=800'),
('MAGURA-MT7', 'Freio Magura MT7 Pro Ha', 'Poder de frenagem absurdo. 4 pistões.', 'Freios', 'product', 'un', 2200.00, 1500.00, 12, 4, 600, 20, 20, 5, 'https://images.unsplash.com/photo-1563297621-e78119420042?auto=format&fit=crop&q=80&w=800');

-- ==========================================
-- 2. BILL OF MATERIALS (BOM)
-- ==========================================

-- Insert a "Services" product
INSERT INTO "SITE_Products" (sku, name, description, category, type, unit, sale_price, average_cost, current_stock, min_stock, weight)
VALUES ('SERV-FULL-40', 'Revisão Completa Fox 40', 'Serviço de revisão geral com troca de retentores.', 'Serviços', 'product', 'sv', 850.00, 150.00, 999, 0, 0);

-- Link raw materials to the Service
INSERT INTO "SITE_ProductBOM" (product_id, component_id, quantity)
SELECT 
    (SELECT id FROM "SITE_Products" WHERE sku = 'SERV-FULL-40'),
    (SELECT id FROM "SITE_Products" WHERE sku = 'OIL-GOLD'),
    0.2 -- 200ml
ON CONFLICT DO NOTHING;

INSERT INTO "SITE_ProductBOM" (product_id, component_id, quantity)
SELECT 
    (SELECT id FROM "SITE_Products" WHERE sku = 'SERV-FULL-40'),
    (SELECT id FROM "SITE_Products" WHERE sku = 'SEAL-32'), 
    1
ON CONFLICT DO NOTHING;

-- ==========================================
-- 3. SALES & ORDERS
-- ==========================================
-- Corrected Columns: client_name, client_phone, total_value
-- Removed invalid columns: shipping_method

-- Order 1: Pending (Payable)
INSERT INTO "SITE_Sales" (client_name, client_phone, total_value, status, payment_status, channel, created_at, updated_at)
VALUES 
('João da Silva', '5511988776655', 7650.00, 'pending', 'pending', 'Admin', NOW(), NOW());

-- Items for Order 1 (Corrected: Removed total_price, Added cost_snapshot)
INSERT INTO "SITE_SaleItems" (sale_id, product_id, quantity, unit_price, cost_snapshot)
SELECT 
    (SELECT id FROM "SITE_Sales" WHERE client_name = 'João da Silva' LIMIT 1),
    (SELECT id FROM "SITE_Products" WHERE sku = 'RS-ZEB-ULT'),
    1, 6800.00, 4800.00;

INSERT INTO "SITE_SaleItems" (sale_id, product_id, quantity, unit_price, cost_snapshot)
SELECT 
    (SELECT id FROM "SITE_Sales" WHERE client_name = 'João da Silva' LIMIT 1),
    (SELECT id FROM "SITE_Products" WHERE sku = 'SERV-FULL-40'), -- Includes Service
    1, 850.00, 150.00;

-- Stock Reservation for Order 1
-- Note: 'origin' field in SITE_StockMovements is TEXT, 'reference_id' is UUID
INSERT INTO "SITE_StockMovements" (product_id, type, quantity, origin, reference_id, notes)
SELECT 
    (SELECT id FROM "SITE_Products" WHERE sku = 'RS-ZEB-ULT'),
    'RESERVED', 1, 'Venda',
    (SELECT id FROM "SITE_Sales" WHERE client_name = 'João da Silva' LIMIT 1),
    'Reserva: João da Silva';

-- Order 2: Completed/Shipped
INSERT INTO "SITE_Sales" (client_name, client_phone, total_value, status, payment_status, channel, created_at, updated_at)
VALUES 
('Ciclo Adventure', '5541999887766', 15700.00, 'shipped', 'paid', 'Store', NOW() - INTERVAL '5 days', NOW() - INTERVAL '1 day');

-- Items for Order 2
INSERT INTO "SITE_SaleItems" (sale_id, product_id, quantity, unit_price, cost_snapshot)
SELECT 
    (SELECT id FROM "SITE_Sales" WHERE client_name = 'Ciclo Adventure' LIMIT 1),
    (SELECT id FROM "SITE_Products" WHERE sku = 'FOX-40-WC'),
    1, 12500.00, 9000.00;

INSERT INTO "SITE_SaleItems" (sale_id, product_id, quantity, unit_price, cost_snapshot)
SELECT 
    (SELECT id FROM "SITE_Sales" WHERE client_name = 'Ciclo Adventure' LIMIT 1),
    (SELECT id FROM "SITE_Products" WHERE sku = 'MAGURA-MT7'),
    1, 2200.00, 1500.00;

INSERT INTO "SITE_SaleItems" (sale_id, product_id, quantity, unit_price, cost_snapshot)
SELECT 
    (SELECT id FROM "SITE_Sales" WHERE client_name = 'Ciclo Adventure' LIMIT 1),
    (SELECT id FROM "SITE_Products" WHERE sku = 'GREASE-SLICK'), 
    10, 100.00, 70.00;

-- Movements for Clean History (Already Shipped)
INSERT INTO "SITE_StockMovements" (product_id, type, quantity, origin, reference_id, notes)
SELECT (SELECT id FROM "SITE_Products" WHERE sku = 'FOX-40-WC'), 'OUT', 1, 'Venda', (SELECT id FROM "SITE_Sales" WHERE client_name = 'Ciclo Adventure'), 'Venda #2';

INSERT INTO "SITE_StockMovements" (product_id, type, quantity, origin, reference_id, notes)
SELECT (SELECT id FROM "SITE_Products" WHERE sku = 'MAGURA-MT7'), 'OUT', 1, 'Venda', (SELECT id FROM "SITE_Sales" WHERE client_name = 'Ciclo Adventure'), 'Venda #2';

INSERT INTO "SITE_StockMovements" (product_id, type, quantity, origin, reference_id, notes)
SELECT (SELECT id FROM "SITE_Products" WHERE sku = 'GREASE-SLICK'), 'OUT', 10, 'Venda', (SELECT id FROM "SITE_Sales" WHERE client_name = 'Ciclo Adventure'), 'Venda #2';

-- ==========================================
-- 4. TASKS (To-Do)
-- ==========================================
INSERT INTO "SITE_Tasks" (title, description, priority, status, due_date, created_by)
VALUES 
('Despachar Pedido João', 'Preparar a ZEB e agendar revisão.', 'HIGH', 'TODO', NOW() + INTERVAL '1 day', 'system'),
('Cotação Novos Pneus', 'Verificar estoque da Maxxis que está baixo.', 'MEDIUM', 'DOING', NOW() + INTERVAL '3 days', 'system'),
('Ligar p/ Ciclo Adventure', 'Confirmar recebimento da Fox 40.', 'LOW', 'DONE', NOW() - INTERVAL '1 day', 'system');
