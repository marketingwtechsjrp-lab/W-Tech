const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://niesvylxwfaffgnmdoql.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pZXN2eWx4d2ZhZmZnbm1kb3FsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxNzI2MjMsImV4cCI6MjA3MDc0ODYyM30.KkhyL5Qu57c_5YCm3GBmhCkx4kT8giHOm1QnWGzdy4g';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
    const { data, error } = await supabase.from('SITE_Sales').select('*').limit(5);
    if (error) {
        console.error(error);
        return;
    }
    if (data.length === 0) {
        console.log("No data found in SITE_Sales");
        return;
    }
    console.log("First record keys:", Object.keys(data[0]));
    console.log("Values for interesting columns:", data.map(r => ({
        id: r.id,
        client_id: r.client_id,
        lead_id: r.lead_id,
        client_email: r.client_email,
        customer_email: r.customer_email,
        created_at: r.created_at,
        sale_date: r.sale_date
    })));
}

run();
