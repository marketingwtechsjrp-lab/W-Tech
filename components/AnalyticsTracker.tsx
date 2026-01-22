import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useSettings } from '../context/SettingsContext';

// Helper to generate IDs
const generateId = () => Math.random().toString(36).substring(2) + Date.now().toString(36);

export const AnalyticsTracker = () => {
    const location = useLocation();
    const { get } = useSettings();
    const gaId = get('ga_id');

    // GA Injection
    useEffect(() => {
        if (gaId && !window.hasInjectedScripts) {
            const script = document.createElement('script');
            script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
            script.async = true;
            document.head.appendChild(script);

            (window as any).dataLayer = (window as any).dataLayer || [];
            function gtag() { (window as any).dataLayer.push(arguments); }
            (window as any).gtag = gtag;
            (window as any).gtag('js', new Date());
            (window as any).gtag('config', gaId);

            window.hasInjectedScripts = true;
        }
    }, [gaId]);

    useEffect(() => {
        const trackPageView = async () => {
            try {
                // GA Pageview
                if (gaId && (window as any).gtag) {
                    (window as any).gtag('config', gaId, {
                        page_path: location.pathname + location.search
                    });
                }

                // 1. Get/Set Visitor ID (Persistent)
                let visitorId = localStorage.getItem('wtech_visitor_id');
                if (!visitorId) {
                    visitorId = generateId();
                    localStorage.setItem('wtech_visitor_id', visitorId);
                }

                // 2. Get/Set Session ID (Per Tab/Session)
                let sessionId = sessionStorage.getItem('wtech_session_id');
                if (!sessionId) {
                    sessionId = generateId();
                    sessionStorage.setItem('wtech_session_id', sessionId);
                }

                // 3. Determine Device Type (Simple check)
                const ua = navigator.userAgent.toLowerCase();
                const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua);
                const deviceType = isMobile ? 'mobile' : 'desktop';

                // 4. Track
                await supabase.from('SITE_Analytics_PageViews').insert({
                    path: location.pathname + location.search,
                    referrer: document.referrer || 'direct',
                    user_agent: navigator.userAgent,
                    visitor_id: visitorId,
                    session_id: sessionId,
                    device_type: deviceType
                });

            } catch (error) {
                console.error("Analytics Error:", error); // Silent fail in prod usually
            }
        };

        trackPageView();
    }, [location, gaId]); // Run on route change + gaId load

    return null; // Invisible component
};

// Exportable Event Tracker
export const trackEvent = async (category: string, action: string, label?: string) => {
    try {
        const visitorId = localStorage.getItem('wtech_visitor_id');
        const sessionId = sessionStorage.getItem('wtech_session_id');

        await supabase.from('SITE_Analytics_Events').insert({
            category,
            action,
            label,
            path: window.location.pathname,
            visitor_id: visitorId,
            session_id: sessionId
        });
    } catch (e) {
        console.error("Event Track Error", e);
    }
};
