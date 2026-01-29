import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://niesvylxwfaffgnmdoql.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pZXN2eWx4d2ZhZmZnbm1kb3FsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxNzI2MjMsImV4cCI6MjA3MDc0ODYyM30.KkhyL5Qu57c_5YCm3GBmhCkx4kT8giHOm1QnWGzdy4g';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function migrate() {
    const queries = [
        `ALTER TABLE "SITE_Leads" ADD COLUMN IF NOT EXISTS "completed_courses" JSONB DEFAULT '[]';`,
        `ALTER TABLE "SITE_Mechanics" ADD COLUMN IF NOT EXISTS "completed_courses" JSONB DEFAULT '[]';`,
        `ALTER TABLE "SITE_Courses" ADD COLUMN IF NOT EXISTS "location_type" TEXT DEFAULT 'Presencial';`
    ];

    for (const q of queries) {
        console.log(`Running: ${q}`);
        try {
            const { error } = await supabase.rpc('run_sql', { sql: q });
            if (error) {
                console.error(`Failed: ${q}. Error:`, error.message);
            } else {
                console.log(`Success: ${q}`);
            }
        } catch (e) {
            console.error(`Catch: ${q}. Error:`, e);
        }
    }
}

migrate();
