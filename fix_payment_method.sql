-- Add payment_method column if it does not exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'SITE_Transactions' AND column_name = 'payment_method') THEN
        ALTER TABLE "SITE_Transactions" ADD COLUMN payment_method TEXT;
    END IF;
END $$;
