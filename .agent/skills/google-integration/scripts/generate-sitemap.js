import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Supabase URL or Key missing in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function generateSitemap() {
  console.log('📡 Fetching data from Supabase for Sitemap...');
  
  const baseUrl = "https://w-techbrasil.com.br";
  const staticPages = ['', 'courses', 'mechanics-map', 'blog', 'contact', 'about', 'glossary'];
  
  const { data: lpData } = await supabase.from('SITE_LandingPages').select('slug');
  const { data: courseData } = await supabase.from('SITE_Courses').select('id, slug, type').eq('status', 'Published');
  const { data: blogData } = await supabase.from('SITE_BlogPosts').select('slug').eq('status', 'Published');
  const { data: eventData } = await supabase.from('SITE_Events').select('id'); // Just in case separate table exists

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

  let sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
  
  // Static Pages
  staticPages.forEach(p => {
    sitemap += `  <url>\n    <loc>${baseUrl}/#/${p}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>${p === '' ? '1.0' : '0.8'}</priority>\n  </url>\n`;
  });

  // Landing Pages
  const slugsSeen = new Set();
  lpData?.forEach(lp => {
    if (lp.slug && !slugsSeen.has(lp.slug)) {
      sitemap += `  <url>\n    <loc>${baseUrl}/#/lp/${escapeXml(lp.slug)}</loc>\n    <priority>0.7</priority>\n  </url>\n`;
      slugsSeen.add(lp.slug);
    }
  });

  // Courses & Events (from SITE_Courses)
  courseData?.forEach(c => {
    const identifier = c.slug || c.id;
    if (identifier && !slugsSeen.has(identifier)) {
      // Both courses and events use the /lp/ prefix or similar based on existing logic
      sitemap += `  <url>\n    <loc>${baseUrl}/#/lp/${escapeXml(identifier)}</loc>\n    <priority>0.7</priority>\n  </url>\n`;
      slugsSeen.add(identifier);
    }
  });

  // Blog Posts
  blogData?.forEach(b => {
    if (b.slug) {
      sitemap += `  <url>\n    <loc>${baseUrl}/#/blog/${escapeXml(b.slug)}</loc>\n    <priority>0.6</priority>\n  </url>\n`;
    }
  });

  sitemap += `</urlset>`;

  const outputPath = path.resolve(__dirname, '../public/sitemap.xml');
  fs.writeFileSync(outputPath, sitemap);
  console.log(`✅ Sitemap updated successfully at: ${outputPath}`);
}

generateSitemap().catch(err => {
  console.error('❌ Error generating sitemap:', err);
  process.exit(1);
});
