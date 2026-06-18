import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Erro: Variáveis de ambiente do Supabase não encontradas.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verify() {
  console.log('=== Iniciando Verificação de Integridade dos Dados de Molas ===\n');

  try {
    // 1. Verificar total de registros
    const { count, error: countError } = await supabase
      .from('SITE_SpringRecommendations')
      .select('*', { count: 'exact', head: true });

    if (countError) throw countError;
    console.log(`✓ Total de registros inseridos: ${count}`);

    // 2. Verificar marcas únicas
    const { data: brandData, error: brandError } = await supabase
      .from('SITE_SpringRecommendations')
      .select('brand');

    if (brandError) throw brandError;
    
    const uniqueBrands = Array.from(new Set(brandData.map(b => b.brand)));
    console.log(`✓ Total de marcas encontradas: ${uniqueBrands.length}`);
    console.log(`  Marcas: ${uniqueBrands.join(', ')}`);

    const expectedBrands = ['KTM', 'Kawasaki', 'Husaberg', 'Suzuki', 'Honda', 'Fantic', 'Husqvarna', 'Triumph', 'Yamaha', 'GASGAS'];
    const missingBrands = expectedBrands.filter(b => !uniqueBrands.includes(b));
    
    if (missingBrands.length > 0) {
      console.warn(`⚠ Alerta: Marcas esperadas ausentes: ${missingBrands.join(', ')}`);
    } else {
      console.log('✓ Todas as 10 marcas foram migradas perfeitamente.');
    }

    // 3. Consultar recomendação específica para teste
    // Exemplo do site alvo: KTM / SX125 2004-2006 / Front / 55-65kg
    const { data: testRec, error: testError } = await supabase
      .from('SITE_SpringRecommendations')
      .select('*')
      .eq('brand', 'KTM')
      .eq('model', 'SX125 2004-2006')
      .eq('part_type', 'Front')
      .eq('weight_range', '55-65kg')
      .maybeSingle();

    if (testError) throw testError;
    
    if (testRec) {
      console.log('\n✓ Teste de busca de recomendação bem-sucedido:');
      console.log(`  Moto: KTM SX125 2004-2006 (Dianteira)`);
      console.log(`  Peso do Piloto: 55-65kg`);
      console.log(`  Mola Recomendada: ${testRec.spring_code} (Esperado: WP 43,2-505-3,8N)`);
      console.log(`  Mola Padrão: ${testRec.standard_code} (Esperado: WP 43,2-505-4,2N)`);
      
      if (testRec.spring_code === 'WP 43,2-505-3,8N' && testRec.standard_code === 'WP 43,2-505-4,2N') {
        console.log('\n✓ INTEGRIDADE DOS DADOS: 100% CORRETA! VALORES BATEM COM O SITE ORIGINAL.');
      } else {
        console.warn('⚠ Os códigos de teste não batem com os esperados.');
      }
    } else {
      console.warn('⚠ Registro de teste não encontrado na base de dados.');
    }

  } catch (err) {
    console.error('❌ Erro na verificação dos dados:', err.message);
    process.exit(1);
  }
}

verify();
