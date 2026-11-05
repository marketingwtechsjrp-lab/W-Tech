import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Maximize2, Play, RotateCcw, Volume2, VolumeX, X } from 'lucide-react';
import { pushEvent } from '../../lib/dataLayer';
import { VACUUM_VIDEO } from './vacuumMedia';

export interface VacuumVideoHandle {
    watch: () => void;
}

interface Props {
    /** Carrinho aberto: o vídeo para e o mini player some. */
    hidden: boolean;
    ctaLabel: string;
    onBuy: () => void;
}

interface NetworkInformationLike {
    saveData?: boolean;
    effectiveType?: string;
}

/** Quem pediu menos movimento ou economia de dados decide quando o vídeo toca. */
function allowsAutoplay(): boolean {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
    const connection = (navigator as Navigator & { connection?: NetworkInformationLike }).connection;
    return !connection || (connection.saveData !== true && !/(^|-)2g$/.test(connection.effectiveType ?? ''));
}

const VIEW_RATIO = 0.55;
const AWAY_RATIO = 0.15;

/**
 * O navegador só deixa iniciar sozinho sem som: o vídeo começa mudo ao chegar na tela, com o
 * botão de ativar o som à vista. O mini player é da página porque o picture-in-picture nativo
 * só abre com clique; o mesmo <video> muda de lugar, sem recarregar nem perder o ponto.
 */
const VacuumVideo = forwardRef<VacuumVideoHandle, Props>(({ hidden, ctaLabel, onBuy }, ref) => {
    const boxRef = useRef<HTMLDivElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const started = useRef(false);
    const soundOn = useRef(false);
    const dismissed = useRef(false);
    const hiddenRef = useRef(hidden);
    hiddenRef.current = hidden;
    const [src] = useState(() => (window.matchMedia('(max-width: 767px)').matches ? VACUUM_VIDEO.srcSm : VACUUM_VIDEO.src));
    const [muted, setMuted] = useState(true);
    const [playing, setPlaying] = useState(false);
    const [everPlayed, setEverPlayed] = useState(false);
    const [docked, setDocked] = useState(false);
    const [ended, setEnded] = useState(false);

    useEffect(() => {
        const box = boxRef.current;
        const video = videoRef.current;
        if (!box || !video || typeof IntersectionObserver === 'undefined') return;
        const autoplay = allowsAutoplay();
        const observer = new IntersectionObserver(
            ([entry]) => {
                const ratio = entry.intersectionRatio;
                if (ratio >= VIEW_RATIO) {
                    setDocked(false);
                    dismissed.current = false;
                    if (autoplay && !started.current && !hiddenRef.current) {
                        video.muted = true;
                        void video.play().catch(() => undefined);
                    }
                } else if (ratio < AWAY_RATIO) {
                    if (!video.paused && !video.ended && !dismissed.current && !hiddenRef.current) setDocked(true);
                } else {
                    setDocked(false);
                }
            },
            { threshold: [0, AWAY_RATIO, VIEW_RATIO, 1] }
        );
        observer.observe(box);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (!hidden) return;
        videoRef.current?.pause();
        setDocked(false);
    }, [hidden]);

    const enableSound = useCallback((video: HTMLVideoElement) => {
        video.muted = false;
        setMuted(false);
        // Quem ativa o som quer ouvir do começo: a narração abre com a pergunta da bancada.
        if (!soundOn.current) {
            soundOn.current = true;
            video.currentTime = 0;
            pushEvent('Vacuum Pump', 'vacuum_video_sound');
        }
        void video.play().catch(() => undefined);
    }, []);

    useImperativeHandle(ref, () => ({
        watch() {
            const video = videoRef.current;
            if (!video) return;
            boxRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setEnded(false);
            enableSound(video);
        },
    }), [enableSound]);

    const handlePlay = () => {
        setPlaying(true);
        setEverPlayed(true);
        setEnded(false);
        if (!started.current) {
            started.current = true;
            pushEvent('Vacuum Pump', 'vacuum_video_play');
        }
    };

    const replay = () => {
        const video = videoRef.current;
        if (!video) return;
        video.currentTime = 0;
        setEnded(false);
        void video.play().catch(() => undefined);
    };

    const closeDock = () => {
        dismissed.current = true;
        videoRef.current?.pause();
        setDocked(false);
    };

    return (
        <div ref={boxRef} className="vp-video-box">
            <div className={`vp-video-frame ${docked ? 'vp-video-docked' : ''}`}>
                <video
                    ref={videoRef}
                    src={src}
                    poster={VACUUM_VIDEO.poster}
                    preload="none"
                    muted
                    playsInline
                    controls={!docked && everPlayed}
                    onPlay={handlePlay}
                    onPause={() => setPlaying(false)}
                    onEnded={() => {
                        setEnded(true);
                        setDocked(false);
                    }}
                    onVolumeChange={(event) => setMuted(event.currentTarget.muted)}
                    onClick={(event) => {
                        if (!docked) return;
                        const video = event.currentTarget;
                        if (video.paused) void video.play().catch(() => undefined);
                        else video.pause();
                    }}
                />

                {!everPlayed && !ended && (
                    <button type="button" className="vp-video-start" onClick={() => videoRef.current && enableSound(videoRef.current)} aria-label="Assistir ao vídeo com som" data-track="vacuum_video_start" data-track-category="Vacuum Pump">
                        <span className="vp-video-start-icon"><Play size={30} fill="currentColor" aria-hidden /></span>
                    </button>
                )}

                {everPlayed && playing && muted && !ended && (
                    <button type="button" className="vp-video-sound" onClick={() => videoRef.current && enableSound(videoRef.current)} data-track="vacuum_video_unmute" data-track-category="Vacuum Pump">
                        <VolumeX size={docked ? 15 : 20} aria-hidden /> Ativar som
                    </button>
                )}

                {docked && (
                    <>
                        <button type="button" className="vp-video-mini vp-video-mini-open" onClick={() => boxRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })} aria-label="Voltar ao vídeo"><Maximize2 size={15} aria-hidden /></button>
                        <button type="button" className="vp-video-mini vp-video-mini-close" onClick={closeDock} aria-label="Fechar o vídeo"><X size={16} aria-hidden /></button>
                        {!muted && (
                            <button
                                type="button"
                                className="vp-video-mini vp-video-mini-mute"
                                onClick={() => {
                                    const video = videoRef.current;
                                    if (video) video.muted = true;
                                }}
                                aria-label="Tirar o som"
                            >
                                <Volume2 size={15} aria-hidden />
                            </button>
                        )}
                    </>
                )}

                {ended && (
                    <div className="vp-video-end">
                        <button type="button" className="vp-btn !min-h-[50px] !text-lg" onClick={onBuy} data-track="vacuum_video_cta" data-track-category="Vacuum Pump">{ctaLabel}</button>
                        <button type="button" className="vp-link text-sm" onClick={replay}><RotateCcw size={14} className="mr-1 inline" aria-hidden />Ver de novo</button>
                    </div>
                )}
            </div>
        </div>
    );
});

VacuumVideo.displayName = 'VacuumVideo';

export default VacuumVideo;
