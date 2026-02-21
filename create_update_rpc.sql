
-- Create a function to bypass potential schema cache issues in the API layer
CREATE OR REPLACE FUNCTION update_user_role_admin(
    target_user_id UUID,
    new_role_id UUID,
    new_status TEXT,
    new_name TEXT,
    new_email TEXT
)
RETURNS VOID AS $$
BEGIN
    UPDATE "SITE_Users"
    SET 
        role_id = new_role_id,
        status = new_status,
        name = new_name,
        email = new_email
    WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql;
