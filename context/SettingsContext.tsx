
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { canonicalUrl } from '../lib/publicUrl';
import { configureSitePixel } from '../lib/metaPixel';
import { configureGoogleTracking } from '../lib/googleTracking';
import { isVerificationToken } from '../lib/seoVerification';

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
                //
                // `document.title` NÃO é escrito aqui. Este contexto resolve depois do
                // primeiro render, então gravar o site_title do banco sobrescrevia o
                // título que o componente SEO tinha acabado de definir. Nas páginas sem
                // <SEO> ele ficava de pé — e foi assim que 23 das 33 URLs do sitemap
                // passaram a servir o mesmo título. O título tem um dono só: SEO.tsx;
                // quem não o usa herda o do index.html, que é um título de marca válido.
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
                // Só entra valor com cara de token. O banco guardava
                // `"vc-domain-verify=site.w-techbrasil.com.br,…"` (de outro serviço, com
                // aspas) e o prerender congelava isso nas 350 páginas no lugar do token
                // real do index.html — o que derruba a verificação por meta tag.
                if (isVerificationToken(config.seo_google_verification)) setMeta('name', 'google-site-verification', config.seo_google_verification);
                if (isVerificationToken(config.seo_bing_verification)) setMeta('name', 'msvalidate.01', config.seo_bing_verification);

                // Organization: a fonte única é o grafo estático do index.html (endereço
                // real em São José do Rio Preto, logo e redes). O bloco que era montado
                // aqui a partir do banco usava o MESMO @id e trazia telefone, endereço e
                // logo gerados por IA ("Rua da Inovação, 123"), então Google e Bing
                // fundiam a entidade com dados falsos. Não é mais injetado; o que sobrou
                // de uma versão antiga em cache sai daqui.
                document.querySelector('#global-org-schema')?.remove();

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
