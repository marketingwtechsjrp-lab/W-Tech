
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
