
const { createClient } = require('@supabase/supabase-js');

// REPLACE THESE WITH YOUR ACTUAL SUPABASE URL AND ANON KEY
// I will try to read them from your env file logic if possible, but for now I'll use placeholders 
// requesting you to fill them or ensuring the client file is used.
// To make this easier, I'll read the client file directly or just assume the env vars are available if I run with dotenv? 
// No, simpler to just use the hardcoded values if I can find them in the code. I found them in previous turns?
// Actually, I'll use the existing supabaseClient.ts file but treating it as a module is hard with TS.
// I'll just write a script that assumes the user can run it with `node`.

// I will try to read the supabaseUrl and Key from the supabaseClient file first.
const fs = require('fs');
const path = require('path');

async function testConnection() {
    // 1. Read config
    const clientPath = path.join(__dirname, 'lib', 'supabaseClient.ts');
    let content = fs.readFileSync(clientPath, 'utf8');
    
    const urlMatch = content.match(/supabaseUrl\s*=\s*['"]([^'"]+)['"]/);
    const keyMatch = content.match(/supabaseAnonKey\s*=\s*['"]([^'"]+)['"]/);
    
    if (!urlMatch || !keyMatch) {
        console.error("Could not find Supabase URL or Key in lib/supabaseClient.ts");
        return;
    }
    
    const supabaseUrl = urlMatch[1];
    const supabaseKey = keyMatch[1];
    
    console.log("Testing Connection to:", supabaseUrl);
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // 2. Try Insert
    const testLead = {
        name: 'TEST LEAD SCRIPT',
        email: 'test_script@example.com',
        phone: '11999999999',
        status: 'New',
        origin: 'Direct Script Test',
        assigned_to: null
    };
    
    console.log("Attempting to INSERT lead...");
    const { data: insertData, error: insertError } = await supabase
        .from('SITE_Leads')
        .insert([testLead])
        .select();
        
    if (insertError) {
        console.error("❌ INSERT FAILED:", insertError.message);
        console.error("Details:", insertError);
    } else {
        console.log("✅ INSERT SUCCESS!", insertData);
    }
    
    // 3. Try Select All
    console.log("Attempting to SELECT (Read) leads...");
    const { data: selectData, error: selectError } = await supabase
        .from('SITE_Leads')
        .select('*')
        .limit(5);
        
    if (selectError) {
        console.error("❌ SELECT FAILED:", selectError.message);
    } else {
        console.log(`✅ SELECT SUCCESS! Found ${selectData.length} leads.`);
        console.log("Recent Leads:", selectData.map(l => `${l.name} (${l.status})`));
    }
}

testConnection();
