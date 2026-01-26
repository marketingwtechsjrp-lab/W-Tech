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

    // GA Intection & Global Click Listener
    useEffect(() => {
        // 1. GA Injection
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

        // 2. Global Click Listener for data-track attributes
        const handleGlobalClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            const trackable = target.closest('[data-track]');
            
            if (trackable) {
                const action = trackable.getAttribute('data-track');
                const label = trackable.getAttribute('data-track-label') || target.innerText || 'No Label';
                const category = trackable.getAttribute('data-track-category') || 'UI Interaction';
                
                trackEvent(category, action || 'click', label);
            }
        };

        document.addEventListener('click', handleGlobalClick);
        return () => document.removeEventListener('click', handleGlobalClick);

    }, [gaId]);

    // Page View Tracking
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

                // 3. Determine Device Type
                const ua = navigator.userAgent.toLowerCase();
                const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua);
                const deviceType = isMobile ? 'mobile' : 'desktop';

                // 4. Track to Supabase
                await supabase.from('SITE_Analytics_PageViews').insert({
                    path: location.pathname + location.search,
                    referrer: document.referrer || 'direct',
                    user_agent: navigator.userAgent,
                    visitor_id: visitorId,
                    session_id: sessionId,
                    device_type: deviceType
                });

            } catch (error) {
                // Silent fail in prod
                // console.error("Analytics Error:", error); 
            }
        };

        trackPageView();
    }, [location, gaId]);

    return null;
};

// Exportable Event Tracker
export const trackEvent = async (category: string, action: string, label?: string) => {
    try {
        const visitorId = localStorage.getItem('wtech_visitor_id');
        const sessionId = sessionStorage.getItem('wtech_session_id');

        // 1. Send to Supabase
        await supabase.from('SITE_Analytics_Events').insert({
            category,
            action,
            label,
            path: window.location.pathname,
            visitor_id: visitorId,
            session_id: sessionId
        });

        // 2. Send to GA4 (if available)
        if ((window as any).gtag) {
            (window as any).gtag('event', action, {
                'event_category': category,
                'event_label': label
            });
        }
    } catch (e) {
        console.error("Event Track Error", e);
    }
};
