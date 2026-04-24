
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

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

        // Realtime Subscription
        const channel = supabase
            .channel('settings_changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'SITE_SystemSettings' },
                () => {
                    console.log('Settings updated via Realtime');
                    fetchSettings();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
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

                // Canonical
                if (config.seo_canonical_url) {
                    let canonical: HTMLLinkElement | null = document.querySelector("link[rel='canonical']");
                    if (!canonical) {
                        canonical = document.createElement('link');
                        canonical.rel = 'canonical';
                        document.head.appendChild(canonical);
                    }
                    canonical.href = config.seo_canonical_url;
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
                    schemaScript.textContent = JSON.stringify({
                        "@context": "https://schema.org",
                        "@type": config.seo_schema_type || "EducationalOrganization",
                        "name": config.seo_schema_name || config.site_title || "W-TECH Brasil",
                        "url": config.seo_canonical_url || "https://w-techbrasil.com.br",
                        "logo": config.seo_schema_logo || config.logo_url || "",
                        "telephone": config.seo_schema_phone || "",
                        "email": config.seo_schema_email || "",
                        "address": config.seo_schema_address || "",
                        "sameAs": [config.instagram, config.facebook, config.linkedin].filter(Boolean)
                    });
                }

                // Inject Analytics (Facebook Pixel)
                if (config.pixel_id && !window.hasInjectedScripts) {
                    const script = document.createElement('script');
                    script.innerHTML = `
                        !function(f,b,e,v,n,t,s)
                        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                        n.queue=[];t=b.createElement(e);t.async=!0;
                        t.src=v;s=b.getElementsByTagName(e)[0];
                        s.parentNode.insertBefore(t,s)}(window, document,'script',
                        'https://connect.facebook.net/en_US/fbevents.js');
                        fbq('init', '${config.pixel_id}');
                        fbq('track', 'PageView');
                    `;
                    document.head.appendChild(script);
                }

                // Inject GA4
                if (config.ga_id && !window.hasInjectedScripts) {
                    const scriptSrc = document.createElement('script');
                    scriptSrc.async = true;
                    scriptSrc.src = `https://www.googletagmanager.com/gtag/js?id=${config.ga_id}`;
                    document.head.appendChild(scriptSrc);

                    const scriptInline = document.createElement('script');
                    scriptInline.innerHTML = `
                        window.dataLayer = window.dataLayer || [];
                        function gtag(){dataLayer.push(arguments);}
                        gtag('js', new Date());
                        gtag('config', '${config.ga_id}');
                    `;
                    document.head.appendChild(scriptInline);
                }

                // Inject GTM
                if (config.gtm_id && !window.hasInjectedScripts) {
                    const script = document.createElement('script');
                    script.innerHTML = `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
                    new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
                    j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
                    'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
                    })(window,document,'script','dataLayer','${config.gtm_id}');`;
                    document.head.appendChild(script);
                }

                window.hasInjectedScripts = true;
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
