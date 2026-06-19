import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// ============================================================================
// SEED DEFINITIVO — Óleo de Suspensão (W-Tech)
// Fonte: levantamento NotebookLM do Daniel (Motorcycle Suspension Specifications
// and Maintenance Guide). IDEMPOTENTE: apaga TUDO e recarrega — nunca duplica.
//
// Tudo entra como RASCUNHO (is_validated = false). Viscosidade = cinemática (cSt @40°C).
// Categoria é palpite editável. Garfos assimétricos trazem Esq./Dir.
// Traseiras: onde a fonte deu dados (óleo/sag/nitrogênio) há uma linha part_type='Rear'.
//
// Uso:  node scripts/seed_suspension_oil.js
// ============================================================================

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Erro: defina VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env');
  process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const SRC = 'NotebookLM — Motorcycle Suspension Specifications and Maintenance Guide (Daniel/W-Tech)';

// Dianteira (garfo)
const f = (category, moto_brand, moto_model, suspension_brand, oil_level_mm, oil_volume_ml, viscosity, oil_product, notes = null, suspension_model = null) => ({
  category, moto_brand, moto_model, part_type: 'Front',
  suspension_brand, suspension_model, oil_level_mm, oil_volume_ml, viscosity, oil_product,
  source: SRC, is_validated: false, notes,
});

// Traseira (amortecedor) — normalmente sem nível/volume publicado; guardamos óleo + sag + nitrogênio
const rear = (category, moto_brand, moto_model, viscosity, oil_product, notes) => ({
  category, moto_brand, moto_model, part_type: 'Rear',
  suspension_brand: null, suspension_model: null, oil_level_mm: null, oil_volume_ml: null,
  viscosity, oil_product, source: SRC, is_validated: false, notes,
});

const rows = [
  // ───────────────── HONDA ─────────────────
  f('Motocross','Honda','CRF450R (2022)','Showa',null,'350','15,65–15,88 cSt @40°C','Showa SAE 5 (SS-05) ou Pro Honda A15-00'),
  rear('Motocross','Honda','CRF450R (2022)','SAE 2.5W','Óleo de amortecedor 2.5W','Sag padrão 40 mm · Pressão 145 psi de nitrogênio.'),
  f('Motocross','Honda','CRF250R (2019)','Showa',null,'343','15,88 cSt @40°C','Pro Honda A15-00 (Showa)'),
  f('Off Road','Honda','CRF250RX (2019)','Showa',null,'356','15,88 cSt @40°C','Pro Honda A15-00 (Showa)','Versão RX (cross-country).'),
  f('Off Road','Honda','CRF250X (2008)','Showa',null,'348','15,65 cSt @40°C','Showa SAE 5 (SS-05)'),
  f('Motocross','Honda','CRF150R (2008)','Showa','124','356','15,65 cSt @40°C','Showa SAE 5 (SS-05)'),
  f('On Road','Honda','XR150L (2020)','Showa','179','180','34,88 cSt @40°C','Showa SS47'),
  f('Off Road','Honda','CRF300L Rally (2019)','Showa','Esq. 54 / Dir. 182','Esq. 696 / Dir. 626','34,88 cSt @40°C','Showa SS47','Garfo assimétrico.'),
  f('Off Road','Honda','CRF300L (2019)','Showa','Esq. 54 / Dir. 171','Esq. 638 / Dir. 626','34,88 cSt @40°C','Showa SS47','Garfo assimétrico.'),
  f('On Road','Honda','CB500X (2020)','Showa','160','451','36,80 cSt @40°C','Pro Honda SS-47 (10W) ou Showa SS8'),
  f('On Road','Honda','Hornet 600 (2007)','Showa','70','495','35,90 cSt @40°C','Motul Fork Oil Expert 10W'),
  f('Speed','Honda','CBR 600RR (2003-2004)','Showa','110','531','36,80 cSt @40°C','Showa SS8'),
  f('Speed','Honda','CBR 600RR (2005-2006)','Showa','120','362',null,'Showa SS-55'),
  f('Speed','Honda','CBR 1000RR (2004)','Showa','90','466',null,'Showa SS-55'),
  f('Speed','Honda','CBR 1000RR (2008)','Showa','93','517','34,88 cSt @40°C','Showa SS47'),
  f('On Road','Honda','Africa Twin CRF1000 (2015)','Showa','95','721','34,88 cSt @40°C','Showa SS47'),
  f('On Road','Honda','CB250N Super Dream (1981)',null,null,'140',null,'Óleo de garfo SAE 10W'),

  // ───────────────── YAMAHA ─────────────────
  f('Motocross','Yamaha','YZ250F (2021-2022)','KYB',null,'350','15,60 cSt @40°C','Yamalube S1 / Kayaba 01','Apenas câmara externa.'),
  rear('Motocross','Yamaha','YZ250F (2021-2022)','SAE 2.5W','Óleo de amortecedor 2.5W','Sag padrão 103 mm · Pressão 142 psi de nitrogênio.'),
  f('Motocross','Yamaha','YZ450F (2022)','KYB',null,'450','15,60 cSt @40°C','Yamalube S1 / Kayaba 01','Apenas câmara externa.'),
  f('On Road','Yamaha','Teneré 700 (2020)','KYB','85','624','33,20 cSt (G10) / 17,90 cSt (Motul) @40°C','KYB G10 / Motul Expert 5W / Kayaba 02M'),
  f('On Road','Yamaha','MT-07 (2024)','KYB','160','405','33,20 cSt @40°C','Yamalube Fork Oil 10W'),
  f('Speed','Yamaha','YZF-R1 (2004)','KYB','76','530','15,60 cSt @40°C','KYB 01M'),
  f('Speed','Yamaha','YZF-R1 (2015)','KYB','114','368','15,60 cSt @40°C','KYB 01M'),
  f('Speed','Yamaha','YZF-R1M (2015)',null,'220','405','15,60 cSt @40°C','KYB 01M','R1M de fábrica usa Öhlins ERS — óleo conforme fonte; confirmar componente.'),
  f('Speed','Yamaha','YZF-R6 (2006-2007)','KYB','108','465','19,00 cSt @40°C','Öhlins 1309'),
  f('On Road','Yamaha','TMAX 500 (2009)','KYB','87','517','33,20 cSt @40°C','KYB G10','Maxi-scooter.'),

  // ───────────────── HUSQVARNA ─────────────────
  f('Off Road','Husqvarna','FE 350 (2022)','WP','120','590','16,00 cSt @40°C','Motorex Racing Fork Oil 4W'),
  rear('Off Road','Husqvarna','FE 350 (2022)','SAE 5W','Óleo de amortecedor 5W','Sag padrão 105–115 mm · Pressão 150 psi de nitrogênio.'),
  f('On Road','Husqvarna','Vitpilen 701 (2020)','WP',null,'485','16,00 cSt @40°C','Motorex Racing Fork Oil 4W'),
  f('On Road','Husqvarna','Norden 901 / Expedition (2024)','WP',null,'630','16,00 cSt @40°C','Motorex Racing Fork Oil 4W'),
  f('Off Road','Husqvarna','TE 300 (2019)','WP','110','642','16,00 cSt @40°C','Motorex Racing Fork Oil 4W'),
  f('Off Road','Husqvarna','TE 300 (2014)','WP',null,'630','16,00 cSt @40°C','WP SAE 4W (Bel-Ray OEM)'),
  f('Motocross','Husqvarna','FC 250 / FC 450 (2024)','WP','Esq. — / Dir. —','Esq. 200 (lubrificação) / Dir. ~700','23,00 cSt @40°C','Motorex Racing Fork Oil 5W','Garfo pneumático WP XACT AER (assimétrico).','WP XACT AER'),

  // ───────────────── KAWASAKI ─────────────────
  f('Speed','Kawasaki','Ninja ZX-6R (2007-2008)','Showa','97','430',null,'Showa SS47'),
  f('Speed','Kawasaki','Ninja ZX-6R (2009-2016)','Showa','80','370',null,'Showa SS19'),
  f('Speed','Kawasaki','Ninja ZX-6R 636cc (2013-2016)','Showa','Esq. 80 / Dir. 90','Esq. 480 / Dir. 460',null,'Showa SS47','Garfo assimétrico.'),
  f('Speed','Kawasaki','Ninja ZX-6R 636cc (2019)','Showa','Esq. 82 / Dir. 93','Esq. 480 / Dir. 455',null,'Showa SS47','Garfo assimétrico.'),
  f('On Road','Kawasaki','Z900 (2017-2019)','KYB','99','Esq. 370 / Dir. 440',null,'KYB KHL-15-10','Volumes diferentes por perna; ambos nível 99 mm.'),
  f('On Road','Kawasaki','Z900 (2020-2022)','KYB','99','Esq. 380 / Dir. 445',null,'KYB KHL-15-10','Volumes diferentes por perna; ambos nível 99 mm.'),
  f('Speed','Kawasaki','Ninja ZX-10R (2008-2010)','KYB','107','490',null,'KYB KHL-15-10'),

  // ───────────────── KTM ─────────────────
  f('On Road','KTM','690 Duke (2018)','WP',null,'480',null,'Motorex Racing Fork Oil 4W'),
  f('On Road','KTM','890 Adventure R (2019)','WP',null,'630',null,'Motorex Racing Fork Oil 4W'),
  f('On Road','KTM','990 Duke (2024)','WP',null,'490',null,'Motorex Racing Fork Oil 5W'),
  f('On Road','KTM','1290 Super Adventure S (2018)','WP',null,'Esq. 430 / Dir. 680',null,'Motorex Racing Fork Oil 4W','Garfo assimétrico.'),

  // ───────────────── BETA ─────────────────
  f('Off Road','Beta','RR 300 Standard 2T (2014-2016 e 2022)',null,'130','~533 (510 g)','18,00 cSt @40°C','Motul Factory Line 5W'),
  f('Off Road','Beta','RR 350 Standard 4T (2014-2016)',null,'110','~555',null,'Motul Factory Line 5W'),
  f('Off Road','Beta','RR 350 Race Edition (2018)',null,null,'Cartucho 200 / Câmara ext. 350','18,00 cSt @40°C','Motul Factory Line 5W'),
  f('Off Road','Beta','RR 350 Race Edition (2022)',null,null,'325','18,00 cSt @40°C','Motul Factory Line 5W','Apenas câmara externa.'),
  f('Off Road','Beta','RR 300 X-PRO (2025)',null,null,'Esq. 625 / Dir. 710',null,'Liqui Moly SAE 5W Light','Garfo assimétrico.'),

  // ───────────────── OUTRAS (SUZUKI, DUCATI, APRILIA, GASGAS) ─────────────────
  f('Speed','Suzuki','GSX-R 750 (2000-2002)','Showa','103','473',null,'Showa SS-08'),
  f('Speed','Suzuki','GSX-R1000 (2007)','Showa','124','512',null,'Suzuki Fork Oil L01'),
  f('Speed','Ducati','Panigale 959 (2016)','Showa','95','563',null,'Showa SS19'),
  f('On Road','Aprilia','Scarabeo 200 (2014)',null,null,'130',null,'Motul Factory Line 5W','Scooter.'),
  f('Motocross','GasGas','MC 125 (2022)','WP',null,'230',null,'Motorex Racing Fork Oil 4W','Apenas câmara externa.'),
];

async function run() {
  console.log('Limpando SITE_SuspensionOil (evita duplicatas)...');
  const del = await supabase.from('SITE_SuspensionOil').delete().not('id', 'is', null);
  if (del.error) { console.error('Erro ao limpar:', del.error.message); process.exit(1); }

  console.log(`Inserindo ${rows.length} registros (rascunho)...`);
  const { error } = await supabase.from('SITE_SuspensionOil').insert(rows);
  if (error) { console.error('Erro ao inserir:', error.message); process.exit(1); }

  console.log(`OK — base recarregada com ${rows.length} registros (sem duplicatas).`);
}

run();
