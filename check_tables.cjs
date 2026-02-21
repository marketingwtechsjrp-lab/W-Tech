
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://niesvylxwfaffgnmdoql.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pZXN2eWx4d2ZhZmZnbm1kb3FsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxNzI2MjMsImV4cCI6MjA3MDc0ODYyM30.KkhyL5Qu57c_5YCm3GBmhCkx4kT8giHOm1QnWGzdy4g';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
    console.log('--- Checking SITE_Enrollments ---');
    const { data, error, count } = await supabase
        .from('SITE_Enrollments')
        .select('*', { count: 'exact' })
        .limit(5);
    
    if (error) {
        console.error('Error fetching SITE_Enrollments:', error);
    } else {
        console.log('SITE_Enrollments exists! Count:', count);
        console.log('Sample Data:', data);
    }

    console.log('--- Checking SITE_Courses ---');
    const { data: courses, error: cError } = await supabase
        .from('SITE_Courses')
        .select('*')
        .limit(1);

    if (cError) {
        console.error('Error fetching SITE_Courses:', cError);
    } else {
        console.log('SITE_Courses exists!');
        console.log('Sample Course:', courses);
    }
}

checkTables();
