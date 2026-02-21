import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://niesvylxwfaffgnmdoql.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pZXN2eWx4d2ZhZmZnbm1kb3FsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxNzI2MjMsImV4cCI6MjA3MDc0ODYyM30.KkhyL5Qu57c_5YCm3GBmhCkx4kT8giHOm1QnWGzdy4g';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkAndFix() {
    console.log('Checking SITE_Sales columns...');
    
    // Using a query that works in Supabase run_sql RPC
    const sql = `
    DO $$ 
    BEGIN 
        -- Add insurance_cost
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'SITE_Sales' AND column_name = 'insurance_cost') THEN
            ALTER TABLE "SITE_Sales" ADD COLUMN "insurance_cost" DECIMAL(10,2) DEFAULT 0;
        END IF;

        -- Add discount_amount
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'SITE_Sales' AND column_name = 'discount_amount') THEN
            ALTER TABLE "SITE_Sales" ADD COLUMN "discount_amount" DECIMAL(10,2) DEFAULT 0;
        END IF;

        -- Add discount_code
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'SITE_Sales' AND column_name = 'discount_code') THEN
            ALTER TABLE "SITE_Sales" ADD COLUMN "discount_code" TEXT;
        END IF;

        -- Add estimated_delivery_date
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'SITE_Sales' AND column_name = 'estimated_delivery_date') THEN
            ALTER TABLE "SITE_Sales" ADD COLUMN "estimated_delivery_date" DATE;
        END IF;

        -- Add tracking_code
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'SITE_Sales' AND column_name = 'tracking_code') THEN
            ALTER TABLE "SITE_Sales" ADD COLUMN "tracking_code" TEXT;
        END IF;

        -- Reload PostgREST schema cache
        NOTIFY pgrst, 'reload config';
    END $$;
    `;

    try {
        const { error } = await supabase.rpc('run_sql', { sql });
        if (error) {
            console.error('Migration failed:', error.message);
        } else {
            console.log('Migration and reload successful!');
        }
    } catch (e) {
        console.error('Error executing migration:', e);
    }
}

checkAndFix();
