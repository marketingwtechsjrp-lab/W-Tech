-- Remove unique constraint to allow multiple members with same email in same list
-- This happens when different clients (Leads/Mechanics) share an email address

DO $$ 
BEGIN
    -- 1. Try to drop the specific constraint if it exists
    BEGIN
        ALTER TABLE "SITE_MarketingListMembers" DROP CONSTRAINT IF EXISTS "SITE_MarketingListMembers_list_id_email_key";
    EXCEPTION
        WHEN others THEN NULL;
    END;

    -- 2. Also drop any other unique index on email if it exists
    BEGIN
        DROP INDEX IF EXISTS "SITE_MarketingListMembers_list_id_email_idx";
    EXCEPTION
        WHEN others THEN NULL;
    END;
END $$;
