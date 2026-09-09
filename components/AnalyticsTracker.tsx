import { useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { captureTrackingParams, stripAutoDirectTracking } from '../lib/tracking';
import { trackGoogleEvent } from '../lib/googleTracking';
import { trackMetaNavigationPageView } from '../lib/metaPixel';

// Helper to generate IDs
const generateId = () => Math.random().toString(36).substring(2) + Date.now().toString(36);

export const AnalyticsTracker = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const cleanSearch = useMemo(() => stripAutoDirectTracking(location.search), [location.search]);
    const shouldCleanAutoTracking = cleanSearch !== location.search;
    const routePath = location.pathname + cleanSearch;
    const lastMetaRoute = useRef(routePath);

    useEffect(() => {
        if (shouldCleanAutoTracking || lastMetaRoute.current === routePath) return;
        const previousRoute = lastMetaRoute.current;
        lastMetaRoute.current = routePath;
        trackMetaNavigationPageView(previousRoute, routePath);
    }, [routePath, shouldCleanAutoTracking]);

    // O GTM decora visitas diretas antes do React iniciar. Guardamos os dados
    // para o checkout e retiramos somente a decoração automática da URL pública.
    // UTMs reais de Meta/Google/WhatsApp permanecem visíveis e propagadas.
    useEffect(() => {
        const cleanAndReplace = () => {
            const currentSearch = window.location.search;
            const nextSearch = stripAutoDirectTracking(currentSearch);
            if (nextSearch === currentSearch) return;

            // Captura antes da limpeza: o checkout ainda recebe o identificador
            // individual da sessão, embora ele não apareça na URL compartilhável.
            captureTrackingParams();
            navigate(
                { pathname: window.location.pathname, search: nextSearch, hash: window.location.hash },
                { replace: true },
            );
        };

        cleanAndReplace();

        // O GTM pode decorar a URL depois do primeiro render/gtm.dom.
        const timers = [100, 500, 1200].map((delay) => window.setTimeout(cleanAndReplace, delay));
        return () => timers.forEach((timer) => window.clearTimeout(timer));
    }, [cleanSearch, location.hash, location.pathname, navigate, shouldCleanAutoTracking]);

    // Global Click Listener. O SDK/contêiner é carregado uma única vez pelo
    // Custom Loader no index.html; este componente não reinjeta fornecedores.
    useEffect(() => {
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

    }, []);

    // Page View Tracking
    useEffect(() => {
        if (shouldCleanAutoTracking) return;

        const trackPageView = async () => {
            try {
                // A PageView do fornecedor pertence ao GTM. Aqui registramos
                // somente a visita no painel interno, sem reenviar config/SDK.

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

        // Analytics nunca deve bloquear o render: roda quando a thread estiver ociosa.
        const ric = (window as any).requestIdleCallback as undefined | ((cb: () => void, opts?: any) => number);
        if (ric) {
            const id = ric(() => trackPageView(), { timeout: 4000 });
            return () => (window as any).cancelIdleCallback?.(id);
        } else {
            const t = setTimeout(trackPageView, 1500);
            return () => clearTimeout(t);
        }
    }, [location, shouldCleanAutoTracking]);

    return null;
};

// Exportable Event Tracker
export const trackEvent = async (category: string, action: string, label?: string) => {
    // Independente do banco: atraso/falha no painel nao deve perder o evento GA4.
    trackGoogleEvent(action, { event_category: category, event_label: label });
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

    } catch (e) {
        console.error("Event Track Error", e);
    }
};
