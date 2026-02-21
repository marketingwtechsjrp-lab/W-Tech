import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://niesvylxwfaffgnmdoql.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pZXN2eWx4d2ZhZmZnbm1kb3FsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxNzI2MjMsImV4cCI6MjA3MDc0ODYyM30.KkhyL5Qu57c_5YCm3GBmhCkx4kT8giHOm1QnWGzdy4g';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function inspect() {
    // Tenta pegar um item qualquer, ou inserir e falhar para ver erro, ou melhor:
    // Tentar selecionar colunas que não existem não adianta.
    // O jeito mais fácil via client-side é pegar 1 registro e ver as chaves.
    // Se estiver vazia, insert dummy e delete.
    
    const table = process.argv[2] || 'SITE_SaleItems';
    console.log(`Inspecting ${table}...`);
    
    const { data, error } = await supabase.from(table).select('*').limit(1);
    
    if (error) {
        console.error("Error:", error);
    } else if (data && data.length > 0) {
        console.log("Columns found:", Object.keys(data[0]));
    } else {
        console.log("Table is empty. Cannot infer columns easily.");
    }
}

inspect();
