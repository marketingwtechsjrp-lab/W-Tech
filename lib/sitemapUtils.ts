import { supabase } from './supabaseClient';

export const generateSitemapXml = async () => {
    const baseUrl = "https://w-techbrasil.com.br";
    const staticPages = ['', 'courses', 'mechanics-map', 'blog', 'contact', 'about', 'glossary'];
    
    // Helper to escape XML special characters
    const escapeXml = (unsafe: string) => {
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

    const { data: lpData } = await supabase.from('SITE_LandingPages').select('slug');
    const { data: courseData } = await supabase.from('SITE_Courses').select('id, slug').eq('status', 'Published');
    const { data: blogData } = await supabase.from('SITE_BlogPosts').select('slug').eq('status', 'Published');

    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
    
    // Static Pages
    staticPages.forEach(p => {
        const priority = p === '' ? '1.0' : '0.8';
        sitemap += `  <url>\n    <loc>${baseUrl}/#/${p}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>${priority}</priority>\n  </url>\n`;
    });

    // Landing Pages
    lpData?.forEach(lp => {
        if (lp.slug) {
            sitemap += `  <url>\n    <loc>${baseUrl}/#/lp/${escapeXml(lp.slug)}</loc>\n    <priority>0.7</priority>\n  </url>\n`;
        }
    });

    // Courses
    courseData?.forEach(c => {
        const identifier = c.slug || c.id;
        sitemap += `  <url>\n    <loc>${baseUrl}/#/lp/${escapeXml(identifier)}</loc>\n    <priority>0.7</priority>\n  </url>\n`;
    });

    // Blog Posts
    blogData?.forEach(b => {
        if (b.slug) {
            sitemap += `  <url>\n    <loc>${baseUrl}/#/blog/${escapeXml(b.slug)}</loc>\n    <priority>0.6</priority>\n  </url>\n`;
        }
    });

    sitemap += `</urlset>`;
    return sitemap;
};

/**
 * Note: In a client-side React app, we cannot write directly to the server's /public/sitemap.xml.
 * However, we can use this utility to trigger updates if we have a backend or 
 * to generate the string for manual saving. 
 * For development, the AI agent can use this to keep the file updated.
 */
