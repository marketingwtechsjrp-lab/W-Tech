
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://niesvylxwfaffgnmdoql.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pZXN2eWx4d2ZhZmZnbm1kb3FsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxNzI2MjMsImV4cCI6MjA3MDc0ODYyM30.KkhyL5Qu57c_5YCm3GBmhCkx4kT8giHOm1QnWGzdy4g';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function migrate() {
    console.log("Running migrations...");
    const queries = [
        `ALTER TABLE IF EXISTS "SITE_MessageTemplates" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;`,
        `ALTER TABLE IF EXISTS "SITE_MessageTemplates" ADD COLUMN IF NOT EXISTS "content2" TEXT;`,
        `ALTER TABLE IF EXISTS "SITE_MarketingCampaigns" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;`,
        `ALTER TABLE IF EXISTS "SITE_MarketingCampaigns" ADD COLUMN IF NOT EXISTS "content2" TEXT;`
    ];

    for (const q of queries) {
        const { error } = await supabase.rpc('run_sql', { sql: q }).catch(() => ({ error: { message: 'RPC run_sql not found, try manual' } }));
        if (error) {
            console.log(`Query failed or RPC missing: ${q}. Error: ${error.message}`);
            // If RPC is missing, we can't do much from here except ask user.
        } else {
            console.log(`Success: ${q}`);
        }
    }
}

migrate();
