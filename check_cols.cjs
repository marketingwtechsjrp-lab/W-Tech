const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://niesvylxwfaffgnmdoql.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pZXN2eWx4d2ZhZmZnbm1kb3FsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxNzI2MjMsImV4cCI6MjA3MDc0ODYyM30.KkhyL5Qu57c_5YCm3GBmhCkx4kT8giHOm1QnWGzdy4g';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
    const { data: leads } = await supabase.from('SITE_Leads').select('*').limit(1);
    if (leads && leads[0]) console.log('Leads Columns:', JSON.stringify(Object.keys(leads[0])));
    
    const { data: mechanics } = await supabase.from('SITE_Mechanics').select('*').limit(1);
    if (mechanics && mechanics[0]) console.log('Mechanics Columns:', JSON.stringify(Object.keys(mechanics[0])));

}

run();
