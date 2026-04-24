-- REAL DATA SEED FOR W-TECH (Mapped to SITE_Products)
-- Contains real tools, parts, and accessories from the user's list.

-- 1. CLEANUP (Optional - comment out if you want to keep existing)
-- DELETE FROM "SITE_Products";
-- DELETE FROM "SITE_Sales";

-- 2. PRODUCTS
INSERT INTO "SITE_Products" (sku, name, description, category, type, unit, sale_price, current_stock, weight, image_url)
VALUES
('197', 'FIXADOR BENGALA 47/48/49MM', 'FIXADOR DE BENGALA W‑TECH — POM Ø47 / Ø48 / Ø49 mm. Peça de bancada em Poliacetal (POM) para proteção durante manutenção.', 'Ferramentas > Fixadores', 'product', 'un', 232.63, 3, 208, 'https://w-techstore.com.br/wp-content/uploads/2024/04/197.jpg'),
('001473', 'VÁLVULA TRASEIRA W-TECH KXF450/CRF450/2020 ED', 'Válvula traseira para modelos KXF450 e CRF450.', 'Peças > Valvulas', 'product', 'un', 1302.96, 0, 130, 'https://w-techstore.com.br/wp-content/uploads/2024/05/1473-e1715368815583.jpg'),
('233', 'RETENTOR DIANTEIRO NOK 38X50X10,5', 'Retentor dianteiro NOK de alta durabilidade.', 'Peças > Retentores', 'product', 'un', 127.34, 2, 40, 'https://w-techstore.com.br/wp-content/uploads/2024/04/233-scaled-e1715367704241.jpg'),
('001385', 'TAMPA SUSPENSAO DIANTEIRA ALONGADA CRF230 VERMELHA', 'Tampa alongada 20mm para CRF230, alumínio anodizado vermelho.', 'Peças > Tampas', 'product', 'un', 389.04, 10, 277, 'https://w-techstore.com.br/wp-content/uploads/2024/04/1385-scaled-e1715354221251.jpg'),
('305', 'BUCHA HASTE 12,5 X 14,5 X 8', 'Bucha guia com liner de PTFE para amortecedores traseiros.', 'Peças > Buchas', 'product', 'un', 47.81, 30, 3, 'https://w-techstore.com.br/wp-content/uploads/2024/04/305-scaled-e1715349738960.jpg'),
('188', 'KIT MID VALVE 6mm', 'Kit Mid Valve 6mm para suspensões.', 'Peças > Mid Valve', 'product', 'un', 131.50, 0, 6, 'https://w-techstore.com.br/wp-content/uploads/2024/04/188-scaled-e1715366425375.jpg'),
('235', 'RETENTOR DIANTEIRO NOK 37X49X8/9,5', 'Retentor dianteiro NOK 37mm.', 'Peças > Retentores', 'product', 'un', 127.34, 2, 33, 'https://w-techstore.com.br/wp-content/uploads/2024/04/235-scaled-e1715367411134.jpg'),
('001354', 'BONE W-TECH ABA RETA', 'Boné W-Tech Aba Reta exclusivo.', 'Linha Souvenir', 'product', 'un', 148.53, 0, 100, 'https://w-techstore.com.br/wp-content/uploads/2024/04/1354-e1715356168858.jpg'),
('109', 'FIXADOR HASTE 12,5MM', 'Fixador de haste 12.5mm para manutenção.', 'Ferramentas > Fixadores', 'product', 'un', 176.30, 0, 92, 'https://w-techstore.com.br/wp-content/uploads/2024/04/109-scaled-e1715365278998.jpg'),
('001540', 'CHAVE SUSPENSÃO DIANTEIRA CARTUCHO CAMARA DUPLA WP', 'Chave para cartucho câmara dupla WP Ø46mm.', 'Ferramentas > Chaves', 'product', 'un', 404.61, 0, 70, 'https://w-techstore.com.br/wp-content/uploads/2024/04/1540-e1715353034431.jpg'),
('127', 'INSTALADOR RETENTOR 37mm', 'Instalador de retentor 37mm em Poliacetal.', 'Ferramentas > Instaladores', 'product', 'un', 316.09, 1, 150, 'https://w-techstore.com.br/wp-content/uploads/2024/04/127.jpg'),
('518', 'BATENTE EXTERNA 16MM SHOWA W-TECH', 'Batente externo 16mm para Showa.', 'Peças > Batentes', 'product', 'un', 152.25, 1, 45, 'https://w-techstore.com.br/wp-content/uploads/2024/04/518-e1715348669801.jpg'),
('8', 'RETENTOR DIANTEIRO NOK 47X58X10/KXF 250', 'Retentor 47mm para KXF 250.', 'Peças > Retentores', 'product', 'un', 169.78, 5, 41, 'https://w-techstore.com.br/wp-content/uploads/2024/04/8-scaled-e1715368216414.jpg'),
('329', 'FIXADOR HASTE 18MM', 'Fixador para haste de 18mm em alumínio.', 'Ferramentas > Fixadores', 'product', 'un', 176.30, 0, 82, 'https://w-techstore.com.br/wp-content/uploads/2024/04/329-scaled-e1715365428893.jpg'),
('306', 'BUCHA HASTE 14 X 16 X 10', 'Bucha de haste 14x16x10.', 'Peças > Buchas', 'product', 'un', 47.81, 20, 4, 'https://w-techstore.com.br/wp-content/uploads/2024/04/306-scaled-e1715350243142.jpg'),
('244', 'RETENTOR DIANTEIRO NOK 41X54X11', 'Retentor NOK 41mm.', 'Peças > Retentores', 'product', 'un', 127.34, 0, 49, 'https://w-techstore.com.br/wp-content/uploads/2024/04/244-scaled-e1715367820667.jpg'),
('321', 'FIXADOR BENGALA 41MM', 'Fixador de bengala 41mm em Poliacetal.', 'Ferramentas > Fixadores', 'product', 'un', 232.63, 0, 123, 'https://w-techstore.com.br/wp-content/uploads/2024/04/321.jpg'),
('123', 'VALVULA DIANTEIRA WR', 'Válvula dianteira para WR.', 'Peças > Valvulas', 'product', 'un', 1228.77, 0, 60, 'https://w-techstore.com.br/wp-content/uploads/2024/05/1177-scaled-e1715368918119.jpg'),
('001972', 'CHAVE SUSPENSAO DIANTEIRA BETA 50MM', 'Chave para suspensão dianteira Beta 50mm.', 'Ferramentas > Chaves', 'product', 'un', 382.61, 1, 120, 'https://w-techstore.com.br/wp-content/uploads/2024/04/1972-e1715352829782.jpg'),
('245', 'RETENTOR TRASEIRO W-TECH 16X28X5 CRF IMPORTADA', 'Retentor traseiro 16x28x5.', 'Peças > Retentores', 'product', 'un', 107.59, 10, 5, 'https://w-techstore.com.br/wp-content/uploads/2024/04/245-scaled-e1715368549606.jpg'),
('002148', 'CHAVE SUSPENSÃO TRASEIRA RESERVATORIO NITRO XACT', 'Chave para reservatório Nitro XACT Ø60mm.', 'Ferramentas > Chaves', 'product', 'un', 497.39, 0, 110, 'https://w-techstore.com.br/wp-content/uploads/2024/04/2148-1-e1715369019764.jpg'),
('28', 'BICO NITROGENIO 1/8 NPT', 'Bico de nitrogênio 1/8 NPT niquelado.', 'Peças > Bicos', 'product', 'un', 58.08, 2, 12, 'https://w-techstore.com.br/wp-content/uploads/2024/04/28-e1715349336937.jpg'),
('313', 'BUCHA HASTE 18 X 20 X 15', 'Bucha haste 18x20x15.', 'Peças > Buchas', 'product', 'un', 47.81, 20, 6, 'https://w-techstore.com.br/wp-content/uploads/2024/04/313-scaled-e1715350496594.jpg'),
('238', 'RETENTOR DIANTEIRO NOK 33X46X11', 'Retentor NOK 33mm.', 'Peças > Retentores', 'product', 'un', 169.78, 2, 49, 'https://w-techstore.com.br/wp-content/uploads/2024/04/238-scaled-e1715366926510.jpg'),
('002022', 'PARAFUSO PLUG SILICONE M5 W-TECH', 'Parafuso M5 com vedação em silicone.', 'Peças > Parafusos', 'product', 'un', 124.09, 0, 4, 'https://w-techstore.com.br/wp-content/uploads/2024/04/2022-1-e1715366594845.jpg'),
('239', 'RETENTOR DIANTEIRO NOK 35X47X10', 'Retentor NOK 35mm.', 'Peças > Retentores', 'product', 'un', 127.34, 2, 39, 'https://w-techstore.com.br/wp-content/uploads/2024/04/239-scaled-e1715367001596.jpg'),
('927', 'HASTE SUSPENSAO DT200', 'Haste de suspensão para DT200, 178mm comprimento.', 'Peças > Hastes', 'product', 'un', 175.34, 1, 170, 'https://w-techstore.com.br/wp-content/uploads/2024/04/927-e1715354425224.jpg')
ON CONFLICT (sku) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    sale_price = EXCLUDED.sale_price,
    image_url = EXCLUDED.image_url,
    weight = EXCLUDED.weight,
    current_stock = EXCLUDED.current_stock;


-- 3. SAMPLE ORDERS (Using Real Products)

-- Order A: Joao (Pending) - Buying a Haste DT200 and a Retentor
INSERT INTO "SITE_Sales" (client_name, client_phone, total_value, status, payment_status, channel, created_at)
VALUES ('Marcos Motocross', '5511999998888', 302.68, 'pending', 'pending', 'Store', NOW());

INSERT INTO "SITE_SaleItems" (sale_id, product_id, quantity, unit_price, cost_snapshot)
SELECT 
    (SELECT id FROM "SITE_Sales" WHERE client_name = 'Marcos Motocross' LIMIT 1),
    (SELECT id FROM "SITE_Products" WHERE sku = '927'), -- Haste DT200
    1, 175.34, 100.00;

INSERT INTO "SITE_SaleItems" (sale_id, product_id, quantity, unit_price, cost_snapshot)
SELECT 
    (SELECT id FROM "SITE_Sales" WHERE client_name = 'Marcos Motocross' LIMIT 1),
    (SELECT id FROM "SITE_Products" WHERE sku = '233'), -- Retentor
    1, 127.34, 80.00;

-- Order B: Oficina Beta (Shipped) - Bought Tools
INSERT INTO "SITE_Sales" (client_name, client_phone, total_value, status, payment_status, channel, created_at)
VALUES ('Oficina Beta Racing', '5541988887777', 621.67, 'shipped', 'paid', 'B2B', NOW() - INTERVAL '2 days');

INSERT INTO "SITE_SaleItems" (sale_id, product_id, quantity, unit_price, cost_snapshot)
SELECT 
    (SELECT id FROM "SITE_Sales" WHERE client_name = 'Oficina Beta Racing' LIMIT 1),
    (SELECT id FROM "SITE_Products" WHERE sku = '197'), -- Fixador Bengala
    1, 232.63, 150.00;

INSERT INTO "SITE_SaleItems" (sale_id, product_id, quantity, unit_price, cost_snapshot)
SELECT 
    (SELECT id FROM "SITE_Sales" WHERE client_name = 'Oficina Beta Racing' LIMIT 1),
    (SELECT id FROM "SITE_Products" WHERE sku = '001385'), -- Tampa alongada
    1, 389.04, 250.00;

-- Stock Movements for Real Items
INSERT INTO "SITE_StockMovements" (product_id, type, quantity, origin, reference_id, notes)
SELECT (SELECT id FROM "SITE_Products" WHERE sku = '197'), 'OUT', 1, 'Venda', (SELECT id FROM "SITE_Sales" WHERE client_name = 'Oficina Beta Racing'), 'Saiu para Oficina Beta';
