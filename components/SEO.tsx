import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext';

interface SEOProps {
    title: string;
    description?: string;
    image?: string;
    url?: string;
    type?: 'website' | 'article' | 'product' | 'organization';
    schema?: object;
}

const SEO: React.FC<SEOProps> = ({ title, description, image, url, type = 'website', schema }) => {
    const { settings } = useSettings();
    const location = useLocation();

    const siteTitle = settings.site_title || 'W-TECH Brasil';
    const fullTitle = `${title} | ${siteTitle}`;
    const currentUrl = url || window.location.href;
    const metaDescription = description || settings.site_description || 'W-TECH - Treinamento Automotivo Especializado e Rede de Oficinas Credenciadas.';
    const metaImage = image || settings.logo_url || 'https://wtech.com.br/og-image.jpg'; // Fallback

    useEffect(() => {
        // Update Title
        document.title = fullTitle;

        // Update Meta Tags
        const updateMeta = (name: string, content: string) => {
            let element = document.querySelector(`meta[name="${name}"]`);
            if (!element) {
                element = document.createElement('meta');
                element.setAttribute('name', name);
                document.head.appendChild(element);
            }
            element.setAttribute('content', content);
        };

        const updateOg = (property: string, content: string) => {
            let element = document.querySelector(`meta[property="${property}"]`);
            if (!element) {
                element = document.createElement('meta');
                element.setAttribute('property', property);
                document.head.appendChild(element);
            }
            element.setAttribute('content', content);
        };

        updateMeta('description', metaDescription);

        // Open Graph
        updateOg('og:title', fullTitle);
        updateOg('og:description', metaDescription);
        updateOg('og:image', metaImage);
        updateOg('og:url', currentUrl);
        updateOg('og:type', type);
        updateOg('og:site_name', siteTitle);

        // Twitter Card
        updateMeta('twitter:card', 'summary_large_image');
        updateMeta('twitter:title', fullTitle);
        updateMeta('twitter:description', metaDescription);
        updateMeta('twitter:image', metaImage);

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

    }, [title, description, image, url, type, schema, settings, location]);

    return null; // This component doesn't render anything visible
};

export default SEO;
