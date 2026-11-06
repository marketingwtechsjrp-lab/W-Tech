import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Flame, X } from 'lucide-react';
import { VacuumARFallback } from './VacuumARFallback';
import { trackEvent } from '../AnalyticsTracker';

const AR_GLB_URL = '/models/vacuum-pump/maquina-ar.glb?v=6';
const AR_USDZ_URL = '/models/vacuum-pump/maquina.usdz?v=3';
const TRANSPARENT_PIXEL = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';

/** Marca no endereço de volta: o navegador só troca o hash, em vez de recarregar a página. */
const AR_FAILED_HASH = '#ra-nao-abriu';
/** Tocou e a página continua na frente: o Android não abriu nada. */
const NOT_OPENED_MS = 3500;
/** Saiu e voltou em menos que isto: é a piscada preta, a câmera fechou sozinha. */
const QUICK_RETURN_MS = 8000;

/** Por quanto tempo ainda vale perceber que o app do Google abriu depois do aviso. */
const LATE_OPEN_WATCH_MS = 30000;

type ArFailure = 'not_opened' | 'quick_return' | 'no_app';

/** Sem o app, tentar de novo só faria o toque parecer quebrado. A piscada pode ter sido a pessoa saindo. */
let sceneViewerUnavailable = false;

type ArPlatform = 'ios' | 'android' | 'other';

function detectPlatform(): ArPlatform {
    if (typeof navigator === 'undefined') return 'other';
    const agent = navigator.userAgent;
    if (/iPad|iPhone|iPod/.test(agent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'ios';
    return /Android/.test(agent) ? 'android' : 'other';
}

/** Navegador interno de aplicativo: o tráfego de anúncio cai aqui, e nele a realidade aumentada não abre. */
function isInAppBrowser(): boolean {
    return typeof navigator !== 'undefined' && /FBAN|FBAV|FB_IAB|FBIOS|Instagram|TikTok|musical_ly|Snapchat|LinkedInApp|Pinterest|Line\//.test(navigator.userAgent);
}

function sceneViewerHref(): string {
    const file = encodeURIComponent(`${window.location.origin}${AR_GLB_URL}`);
    const title = encodeURIComponent('Vacuum Pump Standard W-Tech');
    // Voltar para o mesmo endereço recarregava a página: era o "carrega, pisca e volta" no Android.
    const { origin, pathname, search } = window.location;
    const fallback = encodeURIComponent(`${origin}${pathname}${search}${AR_FAILED_HASH}`);
    return `intent://arvr.google.com/scene-viewer/1.2?file=${file}&mode=ar_preferred&disable_occlusion=true&title=${title}#Intent;scheme=https;package=com.google.android.googlequicksearchbox;action=android.intent.action.VIEW;S.browser_fallback_url=${fallback};end;`;
}

/** O app do Google pode só estar lento: se a página sair da frente depois do aviso, foi alarme falso. */
function reportLateOpen() {
    const startedAt = Date.now();
    const onVisibility = () => {
        if (!document.hidden) return;
        stop();
        void trackEvent('Vacuum Pump', 'vacuum_ar_android_opened_late', `${Date.now() - startedAt}ms`);
    };
    const timer = window.setTimeout(() => stop(), LATE_OPEN_WATCH_MS);
    function stop() {
        window.clearTimeout(timer);
        document.removeEventListener('visibilitychange', onVisibility);
    }
    document.addEventListener('visibilitychange', onVisibility);
}

/** Botão vermelho da realidade aumentada: abre a máquina na bancada, direto na câmera do celular. */
export const VacuumARButton: React.FC<{ placement: 'hero' | 'stage' }> = ({ placement }) => {
    const [platform] = useState<ArPlatform>(detectPlatform);
    const [inApp] = useState(isInAppBrowser);
    const [qr, setQr] = useState<string | null>(null);
    const [openInBrowser, setOpenInBrowser] = useState(false);
    const [copied, setCopied] = useState(false);
    const [arFallback, setArFallback] = useState(false);
    const stopWatching = useRef<(() => void) | null>(null);
    const closeRef = useRef<HTMLButtonElement>(null);
    const track = `vacuum_ar_cta_${placement}`;
    const dialogOpen = !!qr || openInBrowser || arFallback;

    const openQr = useCallback(async () => {
        const { default: QRCode } = await import('qrcode');
        setQr(await QRCode.toDataURL(`${window.location.origin}/maquina-de-vacuo#maquina-3d`, { width: 320, margin: 1 }));
    }, []);

    const closeDialog = useCallback(() => {
        setQr(null);
        setOpenInBrowser(false);
        setArFallback(false);
    }, []);

    const showArFallback = useCallback((reason: ArFailure) => {
        if (reason !== 'quick_return') sceneViewerUnavailable = true;
        trackEvent('Vacuum Pump', `vacuum_ar_android_${reason}`, navigator.userAgent.slice(0, 120));
        if (reason === 'not_opened') reportLateOpen();
        setArFallback(true);
    }, []);

    const clearFailedHash = useCallback(() => {
        window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}`);
    }, []);

    /** O Android não avisa se a câmera abriu: a pista é a página sair da frente, e por quanto tempo. */
    const watchSceneViewer = useCallback(() => {
        stopWatching.current?.();
        let hiddenAt = 0;
        let timer = 0;
        const stop = () => {
            window.clearTimeout(timer);
            document.removeEventListener('visibilitychange', onVisibility);
            window.removeEventListener('hashchange', onHash);
            window.removeEventListener('blur', onBlur);
            window.removeEventListener('focus', onFocus);
            stopWatching.current = null;
        };
        const fail = (reason: ArFailure) => {
            stop();
            showArFallback(reason);
        };
        function onVisibility() {
            if (document.hidden) {
                hiddenAt = Date.now();
                window.clearTimeout(timer);
                return;
            }
            const quick = Date.now() - hiddenAt < QUICK_RETURN_MS;
            stop();
            if (quick) showArFallback('quick_return');
        }
        function onHash() {
            if (window.location.hash !== AR_FAILED_HASH) return;
            clearFailedHash();
            fail('no_app');
        }
        // Janela "abrir com qual app?": o tempo só conta de novo se a pessoa voltar sem escolher.
        function onBlur() {
            window.clearTimeout(timer);
        }
        function onFocus() {
            if (!hiddenAt) timer = window.setTimeout(() => fail('not_opened'), 600);
        }
        document.addEventListener('visibilitychange', onVisibility);
        window.addEventListener('hashchange', onHash);
        window.addEventListener('blur', onBlur);
        window.addEventListener('focus', onFocus);
        timer = window.setTimeout(() => fail('not_opened'), NOT_OPENED_MS);
        stopWatching.current = stop;
    }, [clearFailedHash, showArFallback]);

    useEffect(() => () => stopWatching.current?.(), []);

    // Navegador que recarregou mesmo assim: um botão só cuida disso, ou abririam duas janelas.
    useEffect(() => {
        if (placement !== 'hero' || platform !== 'android' || window.location.hash !== AR_FAILED_HASH) return;
        clearFailedHash();
        showArFallback('no_app');
    }, [placement, platform, clearFailedHash, showArFallback]);

    useEffect(() => {
        if (!dialogOpen) return;
        closeRef.current?.focus();
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') closeDialog();
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [dialogOpen, closeDialog]);

    const copyLink = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(`${window.location.origin}/maquina-de-vacuo#maquina-3d`);
            setCopied(true);
        } catch {
            setCopied(false);
        }
    }, []);

    // Fora da moldura da galeria: o recorte dela cortaria uma janela sobre a página.
    const dialog = (label: string, content: React.ReactNode) => createPortal(
        <div className="fixed inset-0 z-[95] grid place-items-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-label={label} onClick={(event) => { if (event.target === event.currentTarget) closeDialog(); }}>
            <div className="vp-plate relative w-full max-w-sm p-6 text-center">
                <button ref={closeRef} type="button" className="absolute right-3 top-3 grid h-10 w-10 place-items-center hover:bg-black/5" onClick={closeDialog} aria-label="Fechar"><X size={20} aria-hidden /></button>
                <h2 className="vp-display pr-8 text-3xl">Veja na sua própria bancada</h2>
                {content}
            </div>
        </div>,
        document.querySelector('.vp-root') ?? document.body
    );

    const label = (subtitle: string) => (
        <>
            <span className="vp-ar-flame"><Flame size={26} fill="currentColor" aria-hidden /></span>
            <span className="min-w-0">
                <b className="vp-display block text-xl leading-none sm:text-2xl">Veja na sua própria bancada</b>
                <small className="mt-1 block text-[.8rem] font-medium leading-tight">{subtitle}</small>
            </span>
        </>
    );
    const realLine = 'Como se fosse uma experiência real, em tamanho real.';

    if (inApp && platform !== 'other') {
        return (
            <>
                <button type="button" className="vp-ar-cta" onClick={() => setOpenInBrowser(true)} data-track={`${track}_in_app`} data-track-category="Vacuum Pump">
                    {label(realLine)}
                </button>
                {openInBrowser && dialog('Abrir no navegador para ver na bancada', (
                    <>
                        <p className="mb-4 mt-2 text-sm vp-muted">Este aplicativo não abre a realidade aumentada. Toque no menu (⋯) e escolha abrir no navegador, ou copie o link e cole no {platform === 'ios' ? 'Safari' : 'Chrome'}.</p>
                        <button type="button" className="vp-btn w-full" onClick={copyLink} data-track="vacuum_ar_copy_link" data-track-category="Vacuum Pump">{copied ? 'Link copiado' : 'Copiar o link'}</button>
                    </>
                ))}
            </>
        );
    }

    if (platform === 'ios') {
        // O Safari só abre direto na câmera se o link tiver uma imagem como primeiro elemento e no
        // máximo 2 elementos. Com mais, ele abre a tela branca do objeto. O link cobre o botão por cima.
        return (
            <div className="vp-ar-cta">
                {label(realLine)}
                <a className="vp-ar-link" href={AR_USDZ_URL} rel="ar" aria-label="Veja na sua própria bancada, em realidade aumentada" data-track={track} data-track-category="Vacuum Pump">
                    <img src={TRANSPARENT_PIXEL} alt="" width={1} height={1} />
                </a>
            </div>
        );
    }

    if (platform === 'android') {
        return (
            <>
                <a
                    className="vp-ar-cta"
                    href={sceneViewerHref()}
                    data-track={track}
                    data-track-category="Vacuum Pump"
                    onClick={(event) => {
                        if (sceneViewerUnavailable) {
                            event.preventDefault();
                            setArFallback(true);
                        } else {
                            watchSceneViewer();
                        }
                    }}
                >
                    {label(realLine)}
                </a>
                {arFallback && dialog('Ver a máquina na sua bancada', <VacuumARFallback glbUrl={AR_GLB_URL} />)}
            </>
        );
    }

    return (
        <>
            <button type="button" className="vp-ar-cta" onClick={openQr} data-track={track} data-track-category="Vacuum Pump">
                {label('Abra no celular, como se fosse uma experiência real.')}
            </button>
            {qr && dialog('Abrir a realidade aumentada no celular', (
                <>
                    <p className="mb-3 mt-1 text-sm vp-muted">Aponte a câmera do celular para o código e abra a página.</p>
                    <img src={qr} alt="Código QR que abre a página da Vacuum Pump no celular" width={320} height={320} className="mx-auto h-auto w-full max-w-[280px]" />
                </>
            ))}
        </>
    );
};
