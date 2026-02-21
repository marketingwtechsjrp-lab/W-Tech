-- Seeding Mock Data for W-Tech Platform (Sales, Stock & Logistics)

-- 1. Insert Raw Materials (Supplies)
INSERT INTO "SITE_Products" (sku, name, description, category, type, unit, sale_price, average_cost, current_stock, min_stock, weight, length, width, height)
VALUES 
('OIL-5WT', 'Fluido de Suspensão 5wt (1L)', 'Óleo de alta performance para suspensões dianteiras.', 'Insumos', 'raw_material', 'un', 120.00, 85.00, 25, 5, 950, 10, 10, 25),
('SEAL-35MM', 'Retentores 35mm (Par)', 'Kit de retentores de baixa fricção para bengalas 35mm.', 'Insumos', 'raw_material', 'un', 250.00, 180.00, 40, 10, 50, 5, 5, 2),
('AIR-SHAFT-160', 'Eixo de Ar 160mm', 'Eixo interno para upgrade de curso.', 'Componentes', 'raw_material', 'un', 450.00, 320.00, 12, 3, 150, 30, 3, 3);

-- 2. Insert Finished Products
INSERT INTO "SITE_Products" (sku, name, description, category, type, unit, sale_price, average_cost, current_stock, min_stock, weight, length, width, height)
VALUES 
('FOX36-2024', 'Fox 36 Factory Grip2 (29" 160mm)', 'Suspensão de alta performance com revestimento Kashima.', 'Suspensões', 'product', 'un', 8500.00, 6200.00, 5, 2, 2100, 85, 15, 10),
('RS-LYRIK-ULT', 'RockShox Lyrik Ultimate RC2', 'Suspensão Trail/Enduro com tecnologia ButterCups.', 'Suspensões', 'product', 'un', 7800.00, 5600.00, 8, 2, 2050, 85, 15, 10),
('DHX2-COIL', 'Fox DHX2 Factory Coil', 'Shock traseiro de mola para Downhill/Enduro.', 'Shocks', 'product', 'un', 4200.00, 2900.00, 4, 1, 850, 25, 10, 10);

-- 3. Define BOM (Bill of Materials) for Fox 36
-- Assuming we want to track components for a 'Full Service' or 'Custom Build'
INSERT INTO "SITE_ProductBOM" (product_id, component_id, quantity)
SELECT 
    (SELECT id FROM "SITE_Products" WHERE sku = 'FOX36-2024'),
    (SELECT id FROM "SITE_Products" WHERE sku = 'OIL-5WT'),
    0.5 -- 500ml of oil per fork
ON CONFLICT DO NOTHING;

INSERT INTO "SITE_ProductBOM" (product_id, component_id, quantity)
SELECT 
    (SELECT id FROM "SITE_Products" WHERE sku = 'FOX36-2024'),
    (SELECT id FROM "SITE_Products" WHERE sku = 'SEAL-35MM'),
    1 -- 1 kit per fork
ON CONFLICT DO NOTHING;

-- 4. Create Mock Sales
INSERT INTO "SITE_Sales" (customer_name, customer_whatsapp, total_amount, status, payment_status, channel, shipping_method, created_at)
VALUES 
('Ricardo Silva', '5511999999999', 8750.00, 'pending', 'pending', 'Whatsapp', 'Transportadora', NOW() - INTERVAL '2 days'),
('Oficina Pro Bike', '5521888888888', 12500.00, 'shipped', 'paid', 'Website', 'Retirada', NOW() - INTERVAL '1 day'),
('Daniel Campos', '5531777777777', 4200.00, 'processing', 'paid', 'Oficina', 'SEDEX', NOW());

-- 5. Create Mock Sale Items
-- Ricardo's order: 1 Fox 36 + 1 Seal Kit extra
INSERT INTO "SITE_SaleItems" (sale_id, product_id, quantity, unit_price, total_price)
SELECT 
    (SELECT id FROM "SITE_Sales" WHERE customer_name = 'Ricardo Silva' LIMIT 1),
    (SELECT id FROM "SITE_Products" WHERE sku = 'FOX36-2024'),
    1, 8500.00, 8500.00;

INSERT INTO "SITE_SaleItems" (sale_id, product_id, quantity, unit_price, total_price)
SELECT 
    (SELECT id FROM "SITE_Sales" WHERE customer_name = 'Ricardo Silva' LIMIT 1),
    (SELECT id FROM "SITE_Products" WHERE sku = 'SEAL-35MM'),
    1, 250.00, 250.00;

-- Daniel's order: 1 DHX2 Coil
INSERT INTO "SITE_SaleItems" (sale_id, product_id, quantity, unit_price, total_price)
SELECT 
    (SELECT id FROM "SITE_Sales" WHERE customer_name = 'Daniel Campos' LIMIT 1),
    (SELECT id FROM "SITE_Products" WHERE sku = 'DHX2-COIL'),
    1, 4200.00, 4200.00;

-- 6. Mock Stock Movements
-- Initial stock movements for Ricardo (Reserved)
INSERT INTO "SITE_StockMovements" (product_id, type, quantity, reason, sale_id)
SELECT 
    (SELECT id FROM "SITE_Products" WHERE sku = 'FOX36-2024'),
    'RESERVED', 1, 'Venda Pendente: Ricardo Silva',
    (SELECT id FROM "SITE_Sales" WHERE customer_name = 'Ricardo Silva' LIMIT 1);
