import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Flame, X } from 'lucide-react';

const AR_GLB_URL = '/models/vacuum-pump/maquina-ar.glb?v=2';
const AR_USDZ_URL = '/models/vacuum-pump/maquina.usdz?v=2';
const AR_USDZ_INTERACTIVE_URL = '/models/vacuum-pump/maquina-interativa.usdz?v=1';
const POSTER = '/images/vacuum-pump/machine-front.webp?v=2';

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

/** Realidade aumentada nativa do Android, sem os comandos: é o caminho seguro quando a interativa falha. */
export function sceneViewerHref(): string {
    const file = encodeURIComponent(`${window.location.origin}${AR_GLB_URL}`);
    const title = encodeURIComponent('Vacuum Pump Standard W-Tech');
    const fallback = encodeURIComponent(window.location.href);
    return `intent://arvr.google.com/scene-viewer/1.2?file=${file}&mode=ar_preferred&resizable=false&title=${title}#Intent;scheme=https;package=com.google.android.googlequicksearchbox;action=android.intent.action.VIEW;S.browser_fallback_url=${fallback};end;`;
}

interface VacuumARButtonProps {
    placement: 'hero' | 'stage';
    /** A realidade aumentada com comandos está liberada para este visitante. */
    interactive: boolean;
    /** Abre a sessão interativa. Só existe no bloco 3D, onde o modelo já está na memória. */
    onStartInteractive?: () => void;
    interactiveBusy?: boolean;
    /** Leva até o bloco 3D, que é de onde a sessão interativa parte. */
    onGoToStage?: () => void;
    /** Faixa de compra na realidade aumentada do iPhone. */
    offerLine: string;
    onBuy: () => void;
}

export const VacuumARButton: React.FC<VacuumARButtonProps> = ({ placement, interactive, onStartInteractive, interactiveBusy, onGoToStage, offerLine, onBuy }) => {
    const [platform] = useState<ArPlatform>(detectPlatform);
    const [inApp] = useState(isInAppBrowser);
    const [webxr, setWebxr] = useState(false);
    const [qr, setQr] = useState<string | null>(null);
    const [openInBrowser, setOpenInBrowser] = useState(false);
    const [copied, setCopied] = useState(false);
    const closeRef = useRef<HTMLButtonElement>(null);
    const iosLink = useRef<HTMLAnchorElement>(null);
    const track = `vacuum_ar_cta_${placement}`;
    const dialogOpen = !!qr || openInBrowser;

    // Toque em "Comprar" na faixa do Quick Look volta como mensagem para este link.
    useEffect(() => {
        const link = iosLink.current;
        if (!link) return;
        const onMessage = (event: Event) => {
            if ((event as MessageEvent).data === '_apple_ar_quicklook_button_tapped') onBuy();
        };
        link.addEventListener('message', onMessage);
        return () => link.removeEventListener('message', onMessage);
    }, [onBuy]);

    useEffect(() => {
        if (platform !== 'android' || !interactive || !navigator.xr) return;
        let active = true;
        navigator.xr
            .isSessionSupported('immersive-ar')
            .then((supported) => {
                if (active) setWebxr(supported);
            })
            .catch(() => undefined);
        return () => {
            active = false;
        };
    }, [platform, interactive]);

    const openQr = useCallback(async () => {
        const flag = new URLSearchParams(window.location.search).get('ra') === 'interativa' ? '?ra=interativa' : '';
        const { default: QRCode } = await import('qrcode');
        setQr(await QRCode.toDataURL(`${window.location.origin}/maquina-de-vacuo${flag}#maquina-3d`, { width: 320, margin: 1 }));
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

    const interactiveLine = 'Em tamanho real, com tutorial: ligue e use a máquina.';

    if (inApp && platform !== 'other') {
        return (
            <>
                <button type="button" className="vp-ar-cta" onClick={() => setOpenInBrowser(true)} data-track={`${track}_in_app`} data-track-category="Vacuum Pump">
                    {label(interactive ? interactiveLine : 'Como se fosse uma experiência real, em tamanho real.')}
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
        const banner = `callToAction=${encodeURIComponent('Comprar')}&checkoutTitle=${encodeURIComponent('Vacuum Pump Standard')}&checkoutSubtitle=${encodeURIComponent(offerLine)}`;
        return (
            <a ref={iosLink} className="vp-ar-cta" href={`${interactive ? AR_USDZ_INTERACTIVE_URL : AR_USDZ_URL}#allowsContentScaling=0&${banner}`} rel="ar" data-track={track} data-track-category="Vacuum Pump">
                {/* O Safari só abre a realidade aumentada se o link começar por uma imagem. */}
                <img src={POSTER} alt="" width={1} height={1} className="absolute h-px w-px opacity-0" />
                {label(interactive ? interactiveLine : 'Como se fosse uma experiência real, em tamanho real.')}
            </a>
        );
    }

    if (platform === 'android') {
        if (interactive && webxr) {
            const inStage = placement === 'stage';
            return (
                <button
                    type="button"
                    className="vp-ar-cta"
                    disabled={inStage && interactiveBusy}
                    onClick={inStage ? onStartInteractive : onGoToStage}
                    data-track={track}
                    data-track-category="Vacuum Pump"
                >
                    {label(inStage && interactiveBusy ? 'Preparando a máquina...' : interactiveLine)}
                </button>
            );
        }
        return (
            <a className="vp-ar-cta" href={sceneViewerHref()} data-track={track} data-track-category="Vacuum Pump">
                {label('Como se fosse uma experiência real, em tamanho real.')}
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
