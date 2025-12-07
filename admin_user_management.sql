-- Enable pgcrypto for password hashing if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Function to update user details including password and auth email
CREATE OR REPLACE FUNCTION admin_update_user(
    target_user_id UUID,
    new_email TEXT,
    new_password TEXT,
    new_name TEXT,
    new_role_id UUID,
    new_status TEXT
)
RETURNS VOID AS $$
BEGIN
    -- Update public.SITE_Users
    UPDATE "SITE_Users"
    SET 
        name = new_name,
        email = new_email,
        role_id = new_role_id,
        status = new_status
    WHERE id = target_user_id;

    -- Update auth.users (Email)
    UPDATE auth.users
    SET email = new_email
    WHERE id = target_user_id;

    -- Update auth.users (Password) - Only if provided
    IF new_password IS NOT NULL AND new_password <> '' THEN
        UPDATE auth.users
        SET encrypted_password = crypt(new_password, gen_salt('bf'))
        WHERE id = target_user_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to delete a user
CREATE OR REPLACE FUNCTION admin_delete_user(
    target_user_id UUID
)
RETURNS VOID AS $$
BEGIN
    -- Delete from auth.users (Cascades to SITE_Users usually, but let's be safe)
    DELETE FROM auth.users WHERE id = target_user_id;
    
    -- If no cascade, manually delete from public table (optional, depends on FK)
    -- DELETE FROM "SITE_Users" WHERE id = target_user_id; 
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create a new user (Auth + Public)
CREATE OR REPLACE FUNCTION admin_create_user(
    new_email TEXT,
    new_password TEXT,
    new_name TEXT,
    new_role_id UUID,
    new_status TEXT,
    new_receives_leads BOOLEAN DEFAULT FALSE
)
RETURNS UUID AS $$
DECLARE
    new_user_id UUID;
BEGIN
    -- 1. Insert into auth.users
    INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        recovery_sent_at,
        last_sign_in_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        email_change,
        email_change_token_new,
        recovery_token
    ) VALUES (
        '00000000-0000-0000-0000-000000000000', -- Default instance_id
        gen_random_uuid(),
        'authenticated',
        'authenticated',
        new_email,
        crypt(new_password, gen_salt('bf')),
        NOW(), -- Auto-confirm email
        NULL,
        NULL,
        '{"provider": "email", "providers": ["email"]}',
        jsonb_build_object('name', new_name),
        NOW(),
        NOW(),
        '',
        '',
        '',
        ''
    ) RETURNING id INTO new_user_id;

    -- 2. Insert into public.SITE_Users
    INSERT INTO "SITE_Users" (
        id,
        name,
        email,
        role_id,
        status,
        receives_leads,
        created_at
    ) VALUES (
        new_user_id,
        new_name,
        new_email,
        new_role_id,
        new_status,
        new_receives_leads,
        NOW()
    );

    RETURN new_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
