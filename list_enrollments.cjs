
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://niesvylxwfaffgnmdoql.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pZXN2eWx4d2ZhZmZnbm1kb3FsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxNzI2MjMsImV4cCI6MjA3MDc0ODYyM30.KkhyL5Qu57c_5YCm3GBmhCkx4kT8giHOm1QnWGzdy4g';
const supabase = createClient(supabaseUrl, supabaseKey);

async function listAll() {
    const { data, error } = await supabase
        .from('SITE_Enrollments')
        .select('id, student_name, amount_paid');
    
    if (error) console.error(error);
    else console.log(JSON.stringify(data, null, 2));
}

listAll();
