import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext';

interface SEOProps {
    title: string;
    description?: string;
    image?: string;
    url?: string;
    keywords?: string;
    robots?: string;
    type?: 'website' | 'article' | 'product' | 'organization';
    schema?: object;
}

const SEO: React.FC<SEOProps> = ({ title, description, image, url, keywords, robots, type = 'website', schema }) => {
    const { settings } = useSettings();
    const location = useLocation();

    const siteTitle = settings.seo_title || settings.site_title || 'W-TECH Brasil';
    const fullTitle = `${title} | ${siteTitle}`;
    const baseUrl = settings.seo_canonical_url || 'https://w-techbrasil.com.br';
    const currentUrl = url || `${baseUrl}${window.location.hash}`;
    const metaDescription = description || settings.seo_description || 'W-TECH - Treinamento Automotivo Especializado e Rede de Oficinas Credenciadas.';
    const metaImage = image || settings.seo_og_image || settings.logo_url || 'https://w-techbrasil.com.br/og-cover.jpg';
    const metaKeywords = keywords || settings.seo_keywords || '';
    const metaRobots = robots || settings.seo_robots || 'index, follow';
    const siteName = settings.seo_site_name || settings.site_title || 'W-TECH Brasil';

    useEffect(() => {
        // Update Title
        document.title = fullTitle;

        // Update Meta Tags
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

        // JSON-LD Schema Injection
        if (schema) {
            let script = document.querySelector('#json-ld-schema');
            if (!script) {
                script = document.createElement('script');
                script.id = 'json-ld-schema';
                script.setAttribute('type', 'application/ld+json');
                document.head.appendChild(script);
            }
            script.textContent = JSON.stringify(schema);
        } else {
            // Cleanup schema if not present on this page
            const script = document.querySelector('#json-ld-schema');
            if (script) script.textContent = '';
        }

    }, [title, description, image, url, keywords, robots, type, schema, settings, location]);

    return null; // This component doesn't render anything visible
};

export default SEO;

