import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext';
import { PUBLIC_BASE_URL, canonicalUrl } from '../lib/publicUrl';

/**
 * O app usa BrowserRouter, então a rota vive em location.pathname. A versão anterior
 * montava `${baseUrl}${window.location.hash}` — com BrowserRouter o hash é sempre
 * vazio, então TODA página do site canonicalizava para a home e instruía o Google a
 * descartar as páginas internas. O cálculo vive em lib/publicUrl.ts porque
 * SettingsContext também escreve a tag canonical e precisa do mesmo valor.
 */
interface SEOProps {
    title: string;
    description?: string;
    image?: string;
    /** Sobrescreve a canônica calculada. Use apenas para consolidar duplicatas. */
    url?: string;
    keywords?: string;
    robots?: string;
    /** Atalho para `robots="noindex, follow"` em páginas privadas ou de campanha. */
    noindex?: boolean;
    type?: 'website' | 'article' | 'product' | 'organization';
    /** JSON-LD. Aceita um objeto único ou um @graph já montado. */
    schema?: object;
}

const SEO: React.FC<SEOProps> = ({ title, description, image, url, keywords, robots, noindex, type = 'website', schema }) => {
    const { settings } = useSettings();
    const location = useLocation();

    const siteTitle = settings.seo_title || settings.site_title || 'W-TECH Brasil';
    const fullTitle = `${title} | ${siteTitle}`;
    const currentUrl = url || canonicalUrl(location.pathname, location.search);
    const metaDescription = description || settings.seo_description || 'W-TECH - Treinamento Automotivo Especializado e Rede de Oficinas Credenciadas.';
    const metaImage = image || settings.seo_og_image || settings.logo_url || `${PUBLIC_BASE_URL}/og-cover.jpg`;
    const metaKeywords = keywords || settings.seo_keywords || '';
    const metaRobots = noindex ? 'noindex, follow' : (robots || settings.seo_robots || 'index, follow');
    const siteName = settings.seo_site_name || settings.site_title || 'W-TECH Brasil';

    useEffect(() => {
        document.title = fullTitle;

        const updateMeta = (name: string, content: string) => {
            if (!content) return;
            let element = document.querySelector(`meta[name="${name}"]`);
            if (!element) {
                element = document.createElement('meta');
                element.setAttribute('name', name);
                document.head.appendChild(element);
            }
            element.setAttribute('content', content);
        };

        const updateOg = (property: string, content: string) => {
            if (!content) return;
            let element = document.querySelector(`meta[property="${property}"]`);
            if (!element) {
                element = document.createElement('meta');
                element.setAttribute('property', property);
                document.head.appendChild(element);
            }
            element.setAttribute('content', content);
        };

        updateMeta('description', metaDescription);
        updateMeta('keywords', metaKeywords);
        updateMeta('robots', metaRobots);

        // Open Graph
        updateOg('og:title', fullTitle);
        updateOg('og:description', metaDescription);
        updateOg('og:image', metaImage);
        updateOg('og:url', currentUrl);
        updateOg('og:type', type);
        updateOg('og:site_name', siteName);
        updateOg('og:locale', 'pt_BR');

        // Twitter Card
        updateMeta('twitter:card', 'summary_large_image');
        updateMeta('twitter:title', fullTitle);
        updateMeta('twitter:description', metaDescription);
        updateMeta('twitter:image', metaImage);
        if (settings.seo_twitter_handle) {
            updateMeta('twitter:site', settings.seo_twitter_handle);
        }

        // Canonical
        let canonical: HTMLLinkElement | null = document.querySelector("link[rel='canonical']");
        if (!canonical) {
            canonical = document.createElement('link');
            canonical.rel = 'canonical';
            document.head.appendChild(canonical);
        }
        canonical.href = currentUrl;

        // JSON-LD da página. O bloco estático de Organization/WebSite do index.html
        // fica intacto: este script tem id próprio e só substitui a si mesmo.
        const pageSchema = document.querySelector('#json-ld-schema');
        if (schema) {
            let script = pageSchema;
            if (!script) {
                script = document.createElement('script');
                script.id = 'json-ld-schema';
                script.setAttribute('type', 'application/ld+json');
                document.head.appendChild(script);
            }
            script.textContent = JSON.stringify(schema);
        } else if (pageSchema) {
            pageSchema.textContent = '';
        }

    }, [fullTitle, metaDescription, metaImage, currentUrl, metaKeywords, metaRobots, siteName, type, schema, settings]);

    return null; // This component doesn't render anything visible
};

export default SEO;
