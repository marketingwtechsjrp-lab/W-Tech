-- 1. Products and Raw Materials
CREATE TABLE IF NOT EXISTS "SITE_Products" (
    "id" UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    "sku" TEXT UNIQUE NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "type" TEXT NOT NULL CHECK ("type" IN ('product', 'raw_material', 'service')),
    "unit" TEXT DEFAULT 'un',
    "average_cost" NUMERIC DEFAULT 0,
    "sale_price" NUMERIC DEFAULT 0,
    "min_stock" INTEGER DEFAULT 0,
    "current_stock" INTEGER DEFAULT 0,
    "production_time" INTEGER DEFAULT 0, -- in minutes
    "image_url" TEXT,
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Bill of Materials (BOM)
CREATE TABLE IF NOT EXISTS "SITE_ProductBOM" (
    "id" UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    "parent_product_id" UUID REFERENCES "SITE_Products"("id") ON DELETE CASCADE,
    "component_id" UUID REFERENCES "SITE_Products"("id") ON DELETE CASCADE,
    "quantity" NUMERIC NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE("parent_product_id", "component_id")
);

-- 3. Sales / Orders
CREATE TABLE IF NOT EXISTS "SITE_Sales" (
    "id" UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    "client_id" UUID, -- Can link to SITE_Leads or SITE_Users if needed
    "client_name" TEXT,
    "client_email" TEXT,
    "client_phone" TEXT,
    "channel" TEXT DEFAULT 'Admin' CHECK ("channel" IN ('Store', 'Admin', 'Course', 'Workshop')),
    "status" TEXT DEFAULT 'pending' CHECK ("status" IN ('pending', 'paid', 'producing', 'shipped', 'delivered', 'cancelled')),
    "total_value" NUMERIC DEFAULT 0,
    "payment_method" TEXT,
    "payment_status" TEXT DEFAULT 'pending',
    "shipping_status" TEXT DEFAULT 'pending',
    "notes" TEXT,
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Sale Items
CREATE TABLE IF NOT EXISTS "SITE_SaleItems" (
    "id" UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    "sale_id" UUID REFERENCES "SITE_Sales"("id") ON DELETE CASCADE,
    "product_id" UUID REFERENCES "SITE_Products"("id"),
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit_price" NUMERIC NOT NULL,
    "cost_snapshot" NUMERIC, -- Cost at the time of sale for profit calculation
    "created_at" TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Stock Movements (The Ledger)
CREATE TABLE IF NOT EXISTS "SITE_StockMovements" (
    "id" UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    "product_id" UUID REFERENCES "SITE_Products"("id") ON DELETE CASCADE,
    "type" TEXT NOT NULL CHECK ("type" IN ('IN', 'OUT', 'RESERVED', 'ADJUST')),
    "quantity" NUMERIC NOT NULL,
    "origin" TEXT, -- 'Venda', 'Curso', 'Produção', 'Manual'
    "reference_id" UUID, -- ID of the Sale, Course, or Production Order
    "user_id" UUID, -- Admin who made the move
    "notes" TEXT,
    "created_at" TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Shipments / Logistics
CREATE TABLE IF NOT EXISTS "SITE_Shipments" (
    "id" UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    "sale_id" UUID REFERENCES "SITE_Sales"("id") ON DELETE CASCADE,
    "carrier" TEXT, -- Correios, Jadlog, etc
    "tracking_code" TEXT,
    "shipping_cost" NUMERIC DEFAULT 0,
    "shipped_at" TIMESTAMPTZ,
    "delivered_at" TIMESTAMPTZ,
    "status" TEXT DEFAULT 'posted',
    "created_at" TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Suppliers
CREATE TABLE IF NOT EXISTS "SITE_Suppliers" (
    "id" UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    "name" TEXT NOT NULL,
    "contact_name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "category" TEXT,
    "created_at" TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Purchase Orders (Insumos)
CREATE TABLE IF NOT EXISTS "SITE_Purchases" (
    "id" UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    "supplier_id" UUID REFERENCES "SITE_Suppliers"("id"),
    "status" TEXT DEFAULT 'ordered' CHECK ("status" IN ('ordered', 'received', 'cancelled')),
    "total_value" NUMERIC DEFAULT 0,
    "received_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS (Optional, depending on user preferences, but setting basics)
ALTER TABLE "SITE_Products" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SITE_StockMovements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SITE_Sales" ENABLE ROW LEVEL SECURITY;

-- Simple Policy for authenticated users (can be refined)
CREATE POLICY "Allow all for authenticated users" ON "SITE_Products" FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON "SITE_StockMovements" FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON "SITE_Sales" FOR ALL USING (auth.role() = 'authenticated');
