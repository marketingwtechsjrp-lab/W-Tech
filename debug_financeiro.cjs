
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Ler .env.local manualmente para evitar dependências extras
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) env[key.trim()] = value.trim();
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTransactions() {
    const { data, error } = await supabase
        .from('SITE_Transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error('Erro:', error);
    } else {
        console.table(data.map(t => ({
            id: t.id,
            description: t.description?.substring(0, 30),
            amount: t.amount,
            currency: t.currency,
            type: t.type
        })));
    }
}

checkTransactions();
