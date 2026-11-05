import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Flame, X } from 'lucide-react';

const AR_GLB_URL = '/models/vacuum-pump/maquina-ar.glb?v=3';
const AR_USDZ_URL = '/models/vacuum-pump/maquina.usdz?v=3';
const TRANSPARENT_PIXEL = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';

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
    const fallback = encodeURIComponent(window.location.href);
    return `intent://arvr.google.com/scene-viewer/1.2?file=${file}&mode=ar_preferred&title=${title}#Intent;scheme=https;package=com.google.android.googlequicksearchbox;action=android.intent.action.VIEW;S.browser_fallback_url=${fallback};end;`;
}

/** Botão vermelho da realidade aumentada: abre a máquina na bancada, direto na câmera do celular. */
export const VacuumARButton: React.FC<{ placement: 'hero' | 'stage' }> = ({ placement }) => {
    const [platform] = useState<ArPlatform>(detectPlatform);
    const [inApp] = useState(isInAppBrowser);
    const [qr, setQr] = useState<string | null>(null);
    const [openInBrowser, setOpenInBrowser] = useState(false);
    const [copied, setCopied] = useState(false);
    const closeRef = useRef<HTMLButtonElement>(null);
    const track = `vacuum_ar_cta_${placement}`;
    const dialogOpen = !!qr || openInBrowser;

    const openQr = useCallback(async () => {
        const { default: QRCode } = await import('qrcode');
        setQr(await QRCode.toDataURL(`${window.location.origin}/maquina-de-vacuo#maquina-3d`, { width: 320, margin: 1 }));
    }, []);

    const closeDialog = useCallback(() => {
        setQr(null);
        setOpenInBrowser(false);
    }, []);

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
        <div className="fixed inset-0 z-[95] grid place-items-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-label={label} onClick={closeDialog}>
            <div className="vp-plate relative w-full max-w-sm p-6 text-center" onClick={(event) => event.stopPropagation()}>
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
            <a className="vp-ar-cta" href={sceneViewerHref()} data-track={track} data-track-category="Vacuum Pump">
                {label(realLine)}
            </a>
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
