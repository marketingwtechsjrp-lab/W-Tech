import React, { useCallback, useEffect, useState } from 'react';

/**
 * Plano B da realidade aumentada no Android, quando o app do Google não abriu a câmera ou fechou
 * sozinho. O model-viewer abre a câmera dentro do próprio navegador (WebXR), sem depender daquele
 * app. Onde nem isso existe, como no Firefox, a pessoa ainda gira a máquina em 3D com o dedo.
 * A biblioteca é pesada e só carrega aqui: quem abre a câmera de primeira nunca a baixa.
 */

const ARCORE_STORE = 'https://play.google.com/store/apps/details?id=com.google.ar.core';

interface XrNavigator {
    xr?: { isSessionSupported: (mode: string) => Promise<boolean> };
}

/** Caminho direto pelos Serviços do Google Play para RA. Sem eles instalados, cai na loja. */
function arCoreHref(fileUrl: string): string {
    const file = encodeURIComponent(fileUrl);
    return `intent://arvr.google.com/scene-viewer/1.0?file=${file}&mode=ar_only#Intent;scheme=https;package=com.google.ar.core;action=android.intent.action.VIEW;S.browser_fallback_url=${encodeURIComponent(ARCORE_STORE)};end;`;
}

export const VacuumARFallback: React.FC<{ glbUrl: string }> = ({ glbUrl }) => {
    const [viewer, setViewer] = useState<'loading' | 'ready' | 'error'>('loading');
    const [webxr, setWebxr] = useState<boolean | null>(null);
    const [webxrFailed, setWebxrFailed] = useState(false);

    useEffect(() => {
        let active = true;
        import('@google/model-viewer')
            .then(() => { if (active) setViewer('ready'); })
            .catch((err) => {
                console.error('[Vacuum] Falha ao carregar o visualizador 3D:', err);
                if (active) setViewer('error');
            });
        const xr = (navigator as unknown as XrNavigator).xr;
        if (xr) xr.isSessionSupported('immersive-ar').then((ok) => { if (active) setWebxr(ok); }).catch(() => { if (active) setWebxr(false); });
        else setWebxr(false);
        return () => { active = false; };
    }, []);

    const viewerRef = useCallback((element: HTMLElement | null) => {
        element?.addEventListener('ar-status', (event) => {
            if ((event as CustomEvent<{ status: string }>).detail?.status === 'failed') setWebxrFailed(true);
        });
    }, []);

    const canOpenHere = webxr === true && !webxrFailed;

    return (
        <>
            <p className="mb-3 mt-2 text-sm vp-muted">
                {canOpenHere
                    ? 'Se a câmera não abriu no seu celular, abra aqui mesmo pelo navegador.'
                    : 'Gire a máquina com o dedo. Para ver na sua bancada, use o botão abaixo: ele abre a câmera pelos Serviços do Google Play para RA ou leva até a instalação.'}
            </p>

            {viewer === 'ready' && React.createElement(
                'model-viewer',
                {
                    ref: viewerRef,
                    src: glbUrl,
                    alt: 'Vacuum Pump Standard W-Tech em 3D',
                    ar: true,
                    'ar-modes': 'webxr',
                    'camera-controls': true,
                    'touch-action': 'pan-y',
                    // Celular fraco: sem sombra e sem animação de dica, o aparelho sobra para a câmera.
                    'shadow-intensity': 0,
                    'interaction-prompt': 'none',
                    style: { width: '100%', height: '46vh', minHeight: 240, background: '#f1f2f4' },
                },
                <button slot="ar-button" type="button" className="vp-btn" style={{ position: 'absolute', left: 12, right: 12, bottom: 12 }} data-track="vacuum_ar_android_webxr" data-track-category="Vacuum Pump">
                    Abrir na câmera
                </button>
            )}
            {viewer === 'loading' && <p role="status" className="grid h-40 place-items-center text-sm vp-muted">Carregando a máquina em 3D...</p>}
            {viewer === 'error' && <p role="alert" className="py-4 text-sm vp-muted">Não foi possível carregar o 3D aqui. Atualize a página e tente de novo.</p>}

            {webxrFailed && <p role="alert" className="mt-3 text-sm vp-muted">A câmera não abriu por este navegador. Tente pelo botão abaixo.</p>}
            {!canOpenHere && webxr !== null && (
                <a className="vp-btn mt-3 w-full" href={arCoreHref(`${window.location.origin}${glbUrl}`)} data-track="vacuum_ar_android_arcore" data-track-category="Vacuum Pump">
                    Abrir pelo Google Play para RA
                </a>
            )}
        </>
    );
};
