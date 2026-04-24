-- Create Roles Table
CREATE TABLE IF NOT EXISTS "SITE_Roles" (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    permissions JSONB DEFAULT '{}'::jsonb,
    level INTEGER DEFAULT 1, -- 0: Super Admin, 1: Manager, 2: Staff, 3: Viewer
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert Default Roles
INSERT INTO "SITE_Roles" (name, description, permissions, level) VALUES
('Super Admin', 'Acesso total ao sistema', '{"all": true}', 0),
('Gerente', 'Gestão completa, exceto configurações críticas', '{"view_crm": true, "edit_crm": true, "view_finance": true, "manage_orders": true, "manage_content": true, "manage_team": true}', 1),
('Vendedor', 'Acesso ao CRM e Pedidos', '{"view_crm": true, "edit_crm": true, "manage_orders": true}', 2),
('Editor', 'Gestão de Conteúdo e Blog', '{"manage_content": true}', 2)
ON CONFLICT (name) DO NOTHING;

-- Ensure Users have role_id
ALTER TABLE "SITE_Users" ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES "SITE_Roles"(id);

-- Update System Settings with Defaults
-- Insert default keys if they don't exist
INSERT INTO "SITE_SystemSettings" (key, value) VALUES
('site_name', '"W-Tech Suspensões"'),
('site_title', '"W-Tech | Especialistas em Suspensão"'),
('logo_url', '"/logo-wtech.png"'),
('primary_color', '"#d4af37"'), -- W-Tech Gold
('secondary_color', '"#000000"'), -- Black
('whatsapp_phone', '""'),
('whatsapp_enabled', 'false'),
('pixel_id', '""'),
('ga_id', '""'),
('gtm_id', '""'),
('crm_distribution_mode', '"Manual"')
ON CONFLICT (key) DO NOTHING;
