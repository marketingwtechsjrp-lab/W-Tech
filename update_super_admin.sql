-- Ensure Super Admin role has the master key 'admin_access'
UPDATE "SITE_Roles"
SET permissions = jsonb_set(
    permissions,
    '{admin_access}',
    'true'
)
WHERE name = 'Super Admin';

-- Also ensure level is 10 (highest)
UPDATE "SITE_Roles"
SET level = 10
WHERE name = 'Super Admin';

-- If you want to force a specific user to be Super Admin, you would typically run:
-- UPDATE "SITE_Users" SET role_id = (SELECT id FROM "SITE_Roles" WHERE name = 'Super Admin') WHERE email = 'YOUR_EMAIL';
