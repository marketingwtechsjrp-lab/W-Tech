const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://niesvylxwfaffgnmdoql.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pZXN2eWx4d2ZhZmZnbm1kb3FsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxNzI2MjMsImV4cCI6MjA3MDc0ODYyM30.KkhyL5Qu57c_5YCm3GBmhCkx4kT8giHOm1QnWGzdy4g';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function debugConnect() {
    console.log("1. Starting Debug Insert...");

    const testEmail = `debug_${Date.now()}@test.com`;
    console.log(`2. Testing with unique email: ${testEmail}`);

    // Try Insert with Explicit NULL assigned_to
    const { data, error } = await supabase.from('SITE_Leads').insert([{
        name: 'Debug Script User',
        email: testEmail,
        phone: '123456789',
        status: 'New',
        origin: 'Debug Script',
        assigned_to: null, // Force Null
        tags: ['debug']
    }]).select();

    if (error) {
        console.error("❌ INSERT FAILED!");
        console.error("Code:", error.code);
        console.error("Msg:", error.message);
        console.error("Details:", error.details);
        console.error("Hint:", error.hint);
    } else {
        console.log("✅ INSERT SUCCESS!");
        console.log("New Lead ID:", data[0]?.id);
    }

    console.log("3. Finished.");
}

debugConnect();
