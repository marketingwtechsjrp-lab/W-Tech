
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://niesvylxwfaffgnmdoql.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pZXN2eWx4d2ZhZmZnbm1kb3FsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxNzI2MjMsImV4cCI6MjA3MDc0ODYyM30.KkhyL5Qu57c_5YCm3GBmhCkx4kT8giHOm1QnWGzdy4g';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function debug() {
    console.log("--- FAILED QUEUE ITEMS ---");
    const { data: failed } = await supabase.from('SITE_CampaignQueue').select('*').eq('status', 'Failed').limit(5);
    console.log(JSON.stringify(failed, null, 2));

    console.log("--- CONFIG ---");
    const { data: config } = await supabase.from('SITE_Config').select('*');
    console.log(config);

    console.log("--- INTEGRATIONS ---");
    const { data: integrations } = await supabase.from('SITE_UserIntegrations').select('*');
    console.log(integrations);
}

debug();
