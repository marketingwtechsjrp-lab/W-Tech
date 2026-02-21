-- 1. Ensure SITE_Users has the correct structure and FK
DO $$ 
BEGIN 
    -- Add role_id if it doesn't exist (it should, but safety first)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'SITE_Users' AND column_name = 'role_id') THEN
        ALTER TABLE "SITE_Users" ADD COLUMN role_id UUID;
    END IF;

    -- Add Foreign Key Constraint if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_site_users_role') THEN
        ALTER TABLE "SITE_Users" 
        ADD CONSTRAINT fk_site_users_role 
        FOREIGN KEY (role_id) 
        REFERENCES "SITE_Roles"(id) 
        ON DELETE SET NULL;
    END IF;
END $$;

-- 2. Ensure Super Admin Role exists (Idempotent)
INSERT INTO "SITE_Roles" (name, description, permissions, level)
SELECT 'Super Admin', 'Acesso Total', '{"admin_access": true}', 10
WHERE NOT EXISTS (SELECT 1 FROM "SITE_Roles" WHERE name = 'Super Admin');

-- 3. Update the specific user (admin@w-tech.com) to have Super Admin role
-- First get the role ID
WITH super_admin_role AS (
    SELECT id FROM "SITE_Roles" WHERE name = 'Super Admin' LIMIT 1
)
UPDATE "SITE_Users"
SET role_id = (SELECT id FROM super_admin_role)
WHERE email = 'admin@w-tech.com';

-- 4. Create a default admin user if it doesn't exist (Backdoor/Recovery)
INSERT INTO "SITE_Users" (name, email, password, role_id, status)
SELECT 
    'Admin Master', 
    'admin@w-tech.com', 
    'admin123', -- Plain text as per original context, usually hashed
    (SELECT id FROM "SITE_Roles" WHERE name = 'Super Admin' LIMIT 1),
    'Active'
WHERE NOT EXISTS (SELECT 1 FROM "SITE_Users" WHERE email = 'admin@w-tech.com');

-- Force schema reload
NOTIFY pgrst, 'reload config';
