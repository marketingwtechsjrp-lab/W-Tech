import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://niesvylxwfaffgnmdoql.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pZXN2eWx4d2ZhZmZnbm1kb3FsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxNzI2MjMsImV4cCI6MjA3MDc0ODYyM30.KkhyL5Qu57c_5YCm3GBmhCkx4kT8giHOm1QnWGzdy4g';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testInsert() {
    console.log('Testing insert into SITE_Sales...');
    const payload = {
        client_name: 'TEST_AGENT',
        total_value: 100,
        status: 'pending',
        channel: 'Admin',
        insurance_cost: 1.0
    };
    
    const { data, error } = await supabase.from('SITE_Sales').insert([payload]).select();
    
    if (error) {
        console.error('Insert failed:', error.message);
        if (error.message.includes('schema cache')) {
            console.log('Schema cache issue detected!');
        }
    } else {
        console.log('Insert successful! ID:', data[0].id);
        // Clean up
        await supabase.from('SITE_Sales').delete().eq('id', data[0].id);
    }
}

testInsert();
