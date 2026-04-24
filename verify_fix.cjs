const { createClient } = require('@supabase/supabase-js');

// Config from your project
const supabaseUrl = 'https://niesvylxwfaffgnmdoql.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pZXN2eWx4d2ZhZmZnbm1kb3FsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxNzI2MjMsImV4cCI6MjA3MDc0ODYyM30.KkhyL5Qu57c_5YCm3GBmhCkx4kT8giHOm1QnWGzdy4g';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function verifyFix() {
    console.log("--- TESTE DE INSERÇÃO NO CRM ---");
    console.log("Tentando salvar um lead de teste...");

    const testLead = {
        name: 'Lead Teste Pós-Correção',
        email: `teste_${Date.now()}@exemplo.com`,
        phone: '11999990000',
        status: 'New',
        origin: 'Script de Verificação',
        assigned_to: null, // Testando NULL explicitamente
        tags: ['teste_verificacao']
    };

    const { data, error } = await supabase
        .from('SITE_Leads')
        .insert([testLead])
        .select();

    if (error) {
        console.error("❌ FALHA AO INSERIR:");
        console.error(error);
        if (error.code === '23503') {
            console.error("\nERRO CRÍTICO: A restrição de chave estrangeira ainda existe!");
            console.error("Por favor, execute o script 'repair_crm_database.sql' no Supabase.");
        }
    } else {
        console.log("✅ SUCESSO! Lead inserido corretamente.");
        console.log("ID do Lead:", data[0].id);
        console.log("Se você vê esta mensagem, o CRM está consertado.");
    }
}

verifyFix();
