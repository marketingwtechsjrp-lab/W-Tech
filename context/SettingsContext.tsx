
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { PUBLIC_BASE_URL, ORGANIZATION_ID, canonicalUrl } from '../lib/publicUrl';
import { configureSitePixel } from '../lib/metaPixel';
import { configureGoogleTracking } from '../lib/googleTracking';

interface SettingsContextType {
    settings: any;
    loading: boolean;
    get: (key: string, defaultValue?: string) => string;
}

const SettingsContext = createContext<SettingsContextType>({
    settings: {},
    loading: true,
    get: () => ''
});

export const useSettings = () => useContext(SettingsContext);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [settings, setSettings] = useState<any>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSettings();

        // Canal realtime removido: no Supabase self-hosted o Realtime não está
        // habilitado e o WebSocket só geraria erros de conexão. Settings são
        // lidos no carregamento e atualizados num reload da página.
    }, []);

    const fetchSettings = async () => {
        try {
            const { data } = await supabase.from('SITE_SystemSettings').select('*');
            if (data) {
                const config: any = {};
                data.forEach((item: any) => config[item.key] = item.value);

                // Parse standard JSON fields
                try { if (config.menu_styles && typeof config.menu_styles === 'string') config.menu_styles = JSON.parse(config.menu_styles); } catch (e) { config.menu_styles = {}; }
                try { if (config.system_webhooks && typeof config.system_webhooks === 'string') config.system_webhooks = JSON.parse(config.system_webhooks); } catch (e) { }
                try { if (config.partner_brands && typeof config.partner_brands === 'string') config.partner_brands = JSON.parse(config.partner_brands); } catch (e) { }

                setSettings(config);

                // Apply Global Styles/Meta
                if (config.site_title) document.title = config.site_title;
                const root = document.documentElement;
                if (config.primary_color) root.style.setProperty('--color-primary', config.primary_color);
                if (config.secondary_color) root.style.setProperty('--color-secondary', config.secondary_color);

                // Set Icon (Favicon)
                if (config.favicon_url) {
                    let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
                    if (!link) {
                        link = document.createElement('link');
                        link.rel = 'icon';
                        document.head.appendChild(link);
                    }
                    link.href = config.favicon_url;
                } else if (config.logo_url) {
                    // Fallback to logo if no specific favicon
                    let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
                    if (link) link.href = config.logo_url;
                }

                // --- SEO Meta Injection ---
                const setMeta = (attr: string, attrValue: string, content: string) => {
                    if (!content) return;
                    let el = document.querySelector(`meta[${attr}="${attrValue}"]`);
                    if (!el) {
                        el = document.createElement('meta');
                        el.setAttribute(attr, attrValue);
                        document.head.appendChild(el);
                    }
                    el.setAttribute('content', content);
                };

                // Global description & keywords
                if (config.seo_description) setMeta('name', 'description', config.seo_description);
                if (config.seo_keywords) setMeta('name', 'keywords', config.seo_keywords);
                if (config.seo_robots) setMeta('name', 'robots', config.seo_robots);

                // Open Graph
                if (config.seo_og_image) setMeta('property', 'og:image', config.seo_og_image);
                if (config.seo_site_name || config.site_title) setMeta('property', 'og:site_name', config.seo_site_name || config.site_title);
                if (config.seo_og_type) setMeta('property', 'og:type', config.seo_og_type);

                // Canonical da ROTA ATUAL.
                // Antes gravava `config.seo_canonical_url` cru — um único valor do banco
                // para o site inteiro. Como este provider fica ACIMA do Router e roda em
                // toda página, ele sobrescrevia o canonical correto do componente SEO e
                // apontava /molas, /cursos, /blog etc. todos para a mesma URL. Agora usa o
                // mesmo cálculo do SEO.tsx, então os dois escrevem o mesmo valor.
                {
                    let canonical: HTMLLinkElement | null = document.querySelector("link[rel='canonical']");
                    if (!canonical) {
                        canonical = document.createElement('link');
                        canonical.rel = 'canonical';
                        document.head.appendChild(canonical);
                    }
                    canonical.href = canonicalUrl(window.location.pathname, window.location.search);
                }

                // Google / Bing Verification
                if (config.seo_google_verification) setMeta('name', 'google-site-verification', config.seo_google_verification);
                if (config.seo_bing_verification) setMeta('name', 'msvalidate.01', config.seo_bing_verification);

                // JSON-LD Organization Schema
                if (config.seo_schema_name || config.site_title) {
                    let schemaScript: HTMLScriptElement | null = document.querySelector('#global-org-schema');
                    if (!schemaScript) {
                        schemaScript = document.createElement('script');
                        schemaScript.id = 'global-org-schema';
                        schemaScript.type = 'application/ld+json';
                        document.head.appendChild(schemaScript);
                    }
                    // O @id é o mesmo do grafo estático do index.html, então os dois blocos
                    // descrevem UMA entidade em vez de duas Organizations concorrentes.
                    // Campos vazios são removidos: schema com string vazia é pior que ausente.
                    const orgNode: Record<string, unknown> = {
                        "@context": "https://schema.org",
                        "@type": config.seo_schema_type || "EducationalOrganization",
                        "@id": ORGANIZATION_ID,
                        "name": config.seo_schema_name || config.site_title || "W-TECH Brasil",
                        "url": PUBLIC_BASE_URL,
                        "logo": config.seo_schema_logo || config.logo_url,
                        "telephone": config.seo_schema_phone,
                        "email": config.seo_schema_email,
                        "address": config.seo_schema_address,
                        "sameAs": [config.instagram, config.facebook, config.linkedin].filter(Boolean),
                    };
                    for (const [k, v] of Object.entries(orgNode)) {
                        if (!v || (Array.isArray(v) && !v.length)) delete orgNode[k];
                    }
                    schemaScript.textContent = JSON.stringify(orgNode);
                }

                // Analytics tem uma unica origem: o Custom Loader Stape/GTM no
                // index.html. Reinjetar Pixel, GA4 ou GTM depois de carregar as
                // configuracoes duplicava PageView e fragmentava as conversoes
                // entre dois pixels. Os eventos da aplicacao sao enviados pelo
                // AnalyticsTracker e pelo helper lib/metaPixel.ts.
                configureSitePixel(config.pixel_id);
                configureGoogleTracking(config.ga_id);
            }
        } catch (e) {
            console.error("Error loading settings:", e);
        } finally {
            setLoading(false);
        }
    };

    const get = (key: string, defaultValue = '') => {
        // Return blank string if key doesn't exist to prevent undefined issues
        return settings[key] || defaultValue;
    };

    return (
        <SettingsContext.Provider value={{ settings, loading, get }}>
            {children}
        </SettingsContext.Provider>
    );
};
