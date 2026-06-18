import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Carregar variáveis de ambiente
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Erro: VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY devem estar definidos no arquivo .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const jsonPath = '/Users/daniel/.gemini/antigravity-ide/brain/608a1ff9-d5f0-4200-8522-0039ee9b7d5e/scratch/qsprings_clean.json';

async function run() {
  console.log('Lendo dados limpos de:', jsonPath);
  if (!fs.existsSync(jsonPath)) {
    console.error('Arquivo JSON não encontrado!');
    process.exit(1);
  }

  const fileContent = fs.readFileSync(jsonPath, 'utf8');
  const rawData = JSON.parse(fileContent);
  const springsData = rawData.springs;

  const rows = [];

  const brands = Object.keys(springsData);
  console.log(`Processando marcas: ${brands.join(', ')}`);

  for (const brand of brands) {
    const models = Object.keys(springsData[brand]);
    for (const model of models) {
      const types = Object.keys(springsData[brand][model]); // Front, Rear
      for (const type of types) {
        const typeData = springsData[brand][model][type];
        if (!typeData) continue;

        const standardCode = typeData['Standard spring'] || typeData['Standard spring '] || null;

        const weightKeys = Object.keys(typeData).filter(
          k => k !== 'Standard spring' && k !== 'Standard spring '
        );

        for (const weight of weightKeys) {
          const springCode = typeData[weight];
          
          // Apenas inserimos se houver uma mola recomendada específica ou uma mola padrão
          if (springCode || standardCode) {
            rows.push({
              brand: brand,
              model: model,
              part_type: type,
              weight_range: weight,
              spring_code: springCode || null,
              standard_code: standardCode || null
            });
          }
        }
      }
    }
  }

  console.log(`Total de linhas geradas para inserção: ${rows.length}`);

  // Limpar a tabela antes de inserir para evitar duplicatas em re-execução
  console.log('Limpando tabela SITE_SpringRecommendations...');
  const { error: deleteError } = await supabase
    .from('SITE_SpringRecommendations')
    .delete()
    .neq('brand', 'VALOR_IMPOSSIVEL_QUALQUER_COISA'); // Deleta tudo de forma segura

  if (deleteError) {
    console.error('Erro ao limpar a tabela:', deleteError.message);
    process.exit(1);
  }
  console.log('Tabela limpa com sucesso.');

  // Inserir dados em lotes (chunks) de 500 registros
  const chunkSize = 500;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    console.log(`Inserindo lote ${i / chunkSize + 1} de ${Math.ceil(rows.length / chunkSize)} (${chunk.length} registros)...`);
    
    const { error } = await supabase
      .from('SITE_SpringRecommendations')
      .insert(chunk);

    if (error) {
      console.error(`Erro ao inserir lote no índice ${i}:`, error.message);
      process.exit(1);
    }
  }

  console.log('Carga de dados de molas finalizada com sucesso!');
}

run();
