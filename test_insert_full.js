import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://niesvylxwfaffgnmdoql.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pZXN2eWx4d2ZhZmZnbm1kb3FsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxNzI2MjMsImV4cCI6MjA3MDc0ODYyM30.KkhyL5Qu57c_5YCm3GBmhCkx4kT8giHOm1QnWGzdy4g';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testFullInsert() {
    console.log('Testing full insert into SITE_Sales...');
    const payload = {
        client_name: 'TEST_AGENT_FULL',
        total_value: 100,
        status: 'pending',
        channel: 'Admin',
        insurance_cost: 1.0,
        discount_amount: 5.0,
        discount_code: 'TEST',
        shipping_method: 'pac',
        shipping_cost: 20.0,
        tracking_code: 'TEST123BR',
        estimated_delivery_date: '2026-02-10'
    };
    
    const { data, error } = await supabase.from('SITE_Sales').insert([payload]).select();
    
    if (error) {
        console.error('Insert failed:', error.message);
    } else {
        console.log('Insert successful! ID:', data[0].id);
        await supabase.from('SITE_Sales').delete().eq('id', data[0].id);
    }
}

testFullInsert();
