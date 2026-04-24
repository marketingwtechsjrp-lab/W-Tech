
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://niesvylxwfaffgnmdoql.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pZXN2eWx4d2ZhZmZnbm1kb3FsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxNzI2MjMsImV4cCI6MjA3MDc0ODYyM30.KkhyL5Qu57c_5YCm3GBmhCkx4kT8giHOm1QnWGzdy4g';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function debug() {
    console.log("--- FAILED QUEUE ERRORS ---");
    const { data: failed } = await supabase.from('SITE_CampaignQueue').select('recipient_name, error_message').eq('status', 'Failed').limit(10);
    failed.forEach(f => {
        console.log(`- Recipient: ${f.recipient_name} | Error: ${f.error_message}`);
    });

    console.log("\n--- CONFIG CHECK ---");
    const { data: config } = await supabase.from('SITE_Config').select('key, value');
    config.forEach(c => {
        if (c.key.includes('evolution')) console.log(`${c.key}: ${c.value}`);
    });
}

debug();
