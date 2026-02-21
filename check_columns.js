import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://niesvylxwfaffgnmdoql.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pZXN2eWx4d2ZhZmZnbm1kb3FsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxNzI2MjMsImV4cCI6MjA3MDc0ODYyM30.KkhyL5Qu57c_5YCm3GBmhCkx4kT8giHOm1QnWGzdy4g';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
    console.log("Checking SITE_Leads...");
    const { data: lData, error: lError } = await supabase.from('SITE_Leads').select('*').limit(1);
    if (lError) console.error("Leads error:", lError.message);
    else if (lData.length > 0) console.log("Leads columns:", Object.keys(lData[0]));
    else console.log("Leads is empty.");

    console.log("Checking SITE_Mechanics...");
    const { data: mData, error: mError } = await supabase.from('SITE_Mechanics').select('*').limit(1);
    if (mError) console.error("Mechanics error:", mError.message);
    else if (mData.length > 0) console.log("Mechanics columns:", Object.keys(mData[0]));
     else console.log("Mechanics is empty.");
}

check();
