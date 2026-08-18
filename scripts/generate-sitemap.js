import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from .env.local if exists
const envPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

// Fallback to project values if env is missing
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://niesvylxwfaffgnmdoql.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pZXN2eWx4d2ZhZmZnbm1kb3FsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxNzI2MjMsImV4cCI6MjA3MDc0ODYyM30.KkhyL5Qu57c_5YCm3GBmhCkx4kT8giHOm1QnWGzdy4g';

const supabase = createClient(supabaseUrl, supabaseKey);

async function generateSitemap() {
  console.log('📡 Fetching data from Supabase for Sitemap...');

  // Domínio canônico único — ver lib/publicUrl.ts (PUBLIC_BASE_URL).
  // site.w-techbrasil.com.br responde 308: listá-lo aqui fazia com que TODAS as
  // URLs do sitemap fossem redirect, servidas a partir de outro host.
  const baseUrl = "https://w-techbrasil.com.br";

  // Rotas estáticas públicas. Toda entrada aqui PRECISA existir em App.tsx e ser
  // indexável — URL que não existe vira soft 404 e queima orçamento de rastreamento.
  // Removidos: 'sobre' (não há rota em App.tsx) e 'meus-pedidos' (portal privado).
  const staticPages = [
    '',
    'cursos',
    'mapa',
    'molas',
    'oleo',
    'blog',
    'contato',
    'glossario',
    'sou-mecanico',
    'termos',
    'privacidade',
    'cancelamento',
    'suporte',
    'bio',
    'rastreio',
    'wtech-lisboa',
    'lp-lisboa-fev-2026',
    'lp-wtech-lisboa',
    'lp-proriders-lisboa',
    'curso-suspensao-piloto'
  ];

  const { data: lpData } = await supabase.from('SITE_LandingPages').select('slug, updated_at');
  const { data: courseData } = await supabase.from('SITE_Courses').select('id, slug, type, date, updated_at').eq('status', 'Published');
  const { data: blogData } = await supabase.from('SITE_BlogPosts').select('slug, updated_at').eq('status', 'Published');
  const { data: glossaryData, error: glossaryError } = await supabase
    .from('SITE_GlossaryTerms')
    .select('slug, updated_at')
    .eq('published', true);

  // A primeira build pode ocorrer antes da migração do glossário. Nesse caso,
  // mantém o sitemap estático e passa a incluir os verbetes automaticamente
  // assim que a tabela estiver disponível.
  if (glossaryError && glossaryError.code !== '42P01') {
    console.warn('⚠️ Glossário não incluído no sitemap:', glossaryError.message);
  }

  const escapeXml = (unsafe) => {
    if (!unsafe) return '';
    return unsafe.replace(/[<>&'"]/g, (c) => {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '\'': return '&apos;';
        case '"': return '&quot;';
        default: return c;
      }
    });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    try {
      return new Date(dateStr).toISOString().split('T')[0];
    } catch (e) {
      return null;
    }
  };

  let sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

  // Static Pages
  staticPages.forEach(p => {
    sitemap += `  <url>\n    <loc>${baseUrl}/${p}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>${p === '' ? '1.0' : '0.8'}</priority>\n  </url>\n`;
  });

  // Landing Pages
  const slugsSeen = new Set();
  // Add explicitly defined routes in App.tsx to slugsSeen to avoid duplicates
  slugsSeen.add('europa');
  slugsSeen.add('lisboa-fev-2026');
  slugsSeen.add('wtech-lisboa');
  slugsSeen.add('proriders-lisboa');
  slugsSeen.add('curso-suspensao-piloto');

  lpData?.forEach(lp => {
    if (lp.slug && !slugsSeen.has(lp.slug)) {
      const lastmod = formatDate(lp.updated_at);
      sitemap += `  <url>\n    <loc>${baseUrl}/lp/${escapeXml(lp.slug)}</loc>\n    ${lastmod ? `<lastmod>${lastmod}</lastmod>\n    ` : ''}<priority>0.7</priority>\n  </url>\n`;
      slugsSeen.add(lp.slug);
    }
  });

  // Courses
  courseData?.forEach(c => {
    const identifier = c.slug || c.id;
    if (identifier && !slugsSeen.has(identifier)) {
      const lastmod = formatDate(c.updated_at || c.date);
      sitemap += `  <url>\n    <loc>${baseUrl}/lp/${escapeXml(identifier)}</loc>\n    ${lastmod ? `<lastmod>${lastmod}</lastmod>\n    ` : ''}<priority>0.7</priority>\n  </url>\n`;
      slugsSeen.add(identifier);
    }
  });

  // Blog Posts
  blogData?.forEach(b => {
    if (b.slug) {
      const lastmod = formatDate(b.updated_at);
      sitemap += `  <url>\n    <loc>${baseUrl}/blog/${escapeXml(b.slug)}</loc>\n    ${lastmod ? `<lastmod>${lastmod}</lastmod>\n    ` : ''}<priority>0.6</priority>\n  </url>\n`;
    }
  });

  // Glossary Terms
  glossaryData?.forEach(term => {
    if (term.slug) {
      const lastmod = formatDate(term.updated_at);
      sitemap += `  <url>\n    <loc>${baseUrl}/glossario/${escapeXml(term.slug)}</loc>\n    ${lastmod ? `<lastmod>${lastmod}</lastmod>\n    ` : ''}<changefreq>monthly</changefreq>\n    <priority>0.6</priority>\n  </url>\n`;
    }
  });

  sitemap += `</urlset>`;

  // ── Validação: um sitemap inválido é pior que sitemap ausente ──────────────
  // Falha o build em vez de publicar URLs duplicadas ou de outro host.
  const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

  const foreign = locs.filter((l) => !l.startsWith(`${baseUrl}/`) && l !== baseUrl + '/');
  if (foreign.length) {
    throw new Error(`Sitemap contém ${foreign.length} URLs fora de ${baseUrl}: ${foreign.slice(0, 3).join(', ')}`);
  }

  const seen = new Set();
  const duplicates = locs.filter((l) => (seen.has(l) ? true : (seen.add(l), false)));
  if (duplicates.length) {
    throw new Error(`Sitemap contém URLs duplicadas: ${[...new Set(duplicates)].slice(0, 5).join(', ')}`);
  }

  if (locs.length > 50000) {
    throw new Error(`Sitemap com ${locs.length} URLs excede o limite de 50.000 — dividir em índice de sitemaps.`);
  }

  // Save to public/sitemap.xml (standard for Vite)
  const publicPath = path.resolve(__dirname, '../public/sitemap.xml');
  fs.writeFileSync(publicPath, sitemap);

  // Save to root sitemap.xml (as requested by user)
  const rootPath = path.resolve(__dirname, '../sitemap.xml');
  fs.writeFileSync(rootPath, sitemap);

  const withLastmod = (sitemap.match(/<lastmod>/g) || []).length;
  console.log(`✅ Sitemap updated successfully!`);
  console.log(`📊 ${locs.length} URLs (${withLastmod} com lastmod) em ${baseUrl}`);
  console.log(`📍 Public: ${publicPath}`);
  console.log(`📍 Root: ${rootPath}`);
}

generateSitemap().catch(err => {
  console.error('❌ Error generating sitemap:', err);
  process.exit(1);
});
