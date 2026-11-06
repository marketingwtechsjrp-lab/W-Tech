import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { trackEvent } from '../AnalyticsTracker';
import type { ArStage } from './vacuumArPlacement';
import type { ArReport, PreparedVacuumAr, VacuumArSession } from './vacuumWebAR';

/**
 * Plano B da realidade aumentada no Android, quando o app do Google não abriu a câmera ou fechou
 * sozinho. A câmera abre dentro do próprio navegador (WebXR, em vacuumWebAR.ts), sem depender
 * daquele app. Onde nem isso existe, como no Firefox, a pessoa ainda gira a máquina em 3D.
 * As bibliotecas são pesadas e só carregam aqui: quem abre a câmera de primeira nunca as baixa.
 */

// Aqui, e não em vacuumWebAR.ts: importar de lá puxaria o three para todo visitante da página.
const AR_HINTS: Record<ArStage, string> = {
    searching: 'Aponte para o chão e mova o celular devagar.',
    estimated: 'Mova o celular devagar para a máquina assentar no chão ou na bancada.',
    ready: 'Toque na tela para colocar a máquina.',
    placed: 'Pronto. Ande em volta da máquina.',
    lost: 'A câmera perdeu a referência. Mova o celular devagar, com boa luz.',
};

const ARCORE_STORE = 'https://play.google.com/store/apps/details?id=com.google.ar.core';

const reportAr: ArReport = (event, detail) => {
    void trackEvent('Vacuum Pump', `vacuum_ar_webxr_${event}`, detail);
};

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
    const [prepared, setPrepared] = useState<PreparedVacuumAr | null>(null);
    const [stage, setStage] = useState<ArStage | null>(null);
    const overlayRef = useRef<HTMLDivElement>(null);
    const sessionRef = useRef<VacuumArSession | null>(null);

    useEffect(() => {
        let active = true;
        import('@google/model-viewer')
            .then(() => { if (active) setViewer('ready'); })
            .catch((err) => {
                console.error('[Vacuum] Falha ao carregar o visualizador 3D:', err);
                if (active) setViewer('error');
            });
        const xr = (navigator as unknown as XrNavigator).xr;
        if (!xr) {
            setWebxr(false);
        } else {
            xr.isSessionSupported('immersive-ar')
                .then((ok) => {
                    if (!active) return;
                    setWebxr(ok);
                    // Já deixa o modelo baixado: o toque precisa abrir a câmera na hora.
                    if (ok) {
                        import('./vacuumWebAR')
                            .then(({ prepareVacuumAr }) => prepareVacuumAr(glbUrl))
                            .then((ready) => { if (active) setPrepared(ready); })
                            .catch((err) => {
                                console.error('[Vacuum] Falha ao preparar a câmera:', err);
                                reportAr('error', `preparar: ${String(err).slice(0, 110)}`);
                                if (active) setWebxrFailed(true);
                            });
                    }
                })
                .catch(() => { if (active) setWebxr(false); });
        }
        return () => {
            active = false;
            sessionRef.current?.end();
        };
    }, [glbUrl]);

    const openCamera = useCallback(() => {
        if (!prepared || !overlayRef.current) return;
        setStage('searching');
        prepared.start(overlayRef.current, setStage, () => {
            sessionRef.current = null;
            setStage(null);
        }, reportAr)
            .then((session) => { sessionRef.current = session; })
            .catch((err) => {
                console.error('[Vacuum] A câmera não abriu pelo navegador:', err);
                reportAr('error', `abrir: ${String(err).slice(0, 110)}`);
                setStage(null);
                setWebxrFailed(true);
            });
    }, [prepared]);

    const canOpenHere = webxr === true && !webxrFailed;
    const running = stage !== null;
    const overlayButton = 'min-h-[48px] flex-1 rounded-md border-0 px-3 text-base font-bold';

    return (
        <>
            <p className="mb-3 mt-2 text-sm vp-muted">
                {canOpenHere
                    ? 'Se a câmera não abriu no seu celular, abra aqui mesmo pelo navegador.'
                    : 'Gire a máquina com o dedo. Para ver na sua bancada, use o botão abaixo: ele abre a câmera pelos Serviços do Google Play para RA ou leva até a instalação.'}
            </p>

            {/* Desligado com a câmera aberta: dois desenhos 3D ao mesmo tempo travariam celular fraco. */}
            {viewer === 'ready' && !running && React.createElement('model-viewer', {
                src: glbUrl,
                alt: 'Vacuum Pump Standard W-Tech em 3D',
                'camera-controls': true,
                'touch-action': 'pan-y',
                'shadow-intensity': 0,
                'interaction-prompt': 'none',
                style: { width: '100%', height: '42vh', minHeight: 220, background: '#f1f2f4' },
            })}
            {viewer === 'loading' && <p role="status" className="grid h-40 place-items-center text-sm vp-muted">Carregando a máquina em 3D...</p>}
            {viewer === 'error' && <p role="alert" className="py-4 text-sm vp-muted">Não foi possível carregar o 3D aqui. Atualize a página e tente de novo.</p>}

            {canOpenHere && (
                <button type="button" className="vp-btn mt-3 w-full" disabled={!prepared} onClick={openCamera} data-track="vacuum_ar_android_webxr" data-track-category="Vacuum Pump">
                    {prepared ? 'Abrir na câmera' : 'Preparando a câmera...'}
                </button>
            )}
            {canOpenHere && (
                <a className="mt-3 block text-center text-sm underline vp-muted" href={arCoreHref(`${window.location.origin}${glbUrl}`)} data-track="vacuum_ar_android_arcore" data-track-category="Vacuum Pump">
                    Não funcionou? Abrir pelo Google Play para RA
                </a>
            )}
            {webxrFailed && <p role="alert" className="mt-3 text-sm vp-muted">A câmera não abriu por este navegador. Tente pelo botão abaixo.</p>}
            {!canOpenHere && webxr !== null && (
                <a className="vp-btn mt-3 w-full" href={arCoreHref(`${window.location.origin}${glbUrl}`)} data-track="vacuum_ar_android_arcore" data-track-category="Vacuum Pump">
                    Abrir pelo Google Play para RA
                </a>
            )}

            {createPortal(
                <div ref={overlayRef} style={{ display: running ? 'flex' : 'none', position: 'fixed', inset: 0, zIndex: 100, flexDirection: 'column', justifyContent: 'space-between', pointerEvents: 'none', fontFamily: 'system-ui, sans-serif' }}>
                    <p role="status" style={{ margin: 16, padding: '12px 14px', borderRadius: 8, background: 'rgba(0,0,0,.72)', color: '#fff', fontSize: 16, fontWeight: 600, textAlign: 'center' }}>
                        {stage ? AR_HINTS[stage] : ''}
                    </p>
                    {/* beforexrselect: tocar nestes botões não pode contar como "colocar a máquina aqui". */}
                    <div
                        ref={(element) => { element?.addEventListener('beforexrselect', (event) => event.preventDefault()); }}
                        style={{ display: 'flex', gap: 8, padding: 16, pointerEvents: 'auto' }}
                    >
                        {(stage === 'placed' || stage === 'estimated') && (
                            <button type="button" className={overlayButton} style={{ background: '#fff', color: '#111' }} onClick={() => sessionRef.current?.replace()}>
                                Mudar de lugar
                            </button>
                        )}
                        <button type="button" className={overlayButton} style={{ background: '#d40000', color: '#fff' }} onClick={() => sessionRef.current?.end()}>
                            Sair da câmera
                        </button>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
};
