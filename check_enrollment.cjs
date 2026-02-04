
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://niesvylxwfaffgnmdoql.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pZXN2eWx4d2ZhZmZnbm1kb3FsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxNzI2MjMsImV4cCI6MjA3MDc0ODYyM30.KkhyL5Qu57c_5YCm3GBmhCkx4kT8giHOm1QnWGzdy4g';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkEnrollment() {
    const eid = 'fd98e671-dc80-4bd1-8f8a-5fe0040f55eb';
    console.log(`--- Checking Enrollment ${eid} ---`);
    const { data, error } = await supabase
        .from('SITE_Enrollments')
        .select('*, SITE_Courses(title, currency)')
        .eq('id', eid)
        .maybeSingle(); // Use maybeSingle to avoid error if empty
    
    if (error) {
        console.error('Error fetching enrollment:', error);
    } else if (!data) {
        console.error('Enrollment NOT FOUND in database!');
    } else {
        console.log('Enrollment found!', data);
    }
}

checkEnrollment();
