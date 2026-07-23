import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://niesvylxwfaffgnmdoql.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pZXN2eWx4d2ZhZmZnbm1kb3FsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxNzI2MjMsImV4cCI6MjA3MDc0ODYyM30.KkhyL5Qu57c_5YCm3GBmhCkx4kT8giHOm1QnWGzdy4g';

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
    console.log("=== SITE_Config ===");
    const { data, error } = await supabase.from('SITE_Config').select('*');
    if (error) console.error("Error:", error);
    else console.log(JSON.stringify(data, null, 2));

    console.log("\n=== SITE_UserIntegrations ===");
    const { data: ui, error: uiErr } = await supabase.from('SITE_UserIntegrations').select('*');
    if (uiErr) console.error("Error:", uiErr);
    else console.log(JSON.stringify(ui, null, 2));
}

inspect();
