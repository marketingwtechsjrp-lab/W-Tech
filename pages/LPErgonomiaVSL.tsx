import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
    ArrowRight,
    CheckCircle2,
    Clock3,
    Headphones,
    LockKeyhole,
    Pause,
    Play,
    RotateCcw,
    ShieldCheck,
    Volume2,
} from 'lucide-react';
import { captureTrackingParams } from '../lib/tracking';

const VIDEO_URL = 'https://niesvylxwfaffgnmdoql.supabase.co/storage/v1/object/public/site-assets/vsl-suspensao.mp4';
const UNLOCK_KEY = 'wtech_suspensao_vsl_completed';

const formatTime = (seconds: number) => {
    if (!Number.isFinite(seconds) || seconds <= 0) return '00:00';
    const minutes = Math.floor(seconds / 60);
    const remaining = Math.floor(seconds % 60);
    return `${String(minutes).padStart(2, '0')}:${String(remaining).padStart(2, '0')}`;
};

const LPErgonomiaVSL: React.FC = () => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const furthestWatchedRef = useRef(0);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isUnlocked, setIsUnlocked] = useState(false);

    const landingUrl = useMemo(() => {
        if (typeof window === 'undefined') return '/curso-suspensao-piloto-completa';
        const params = new URLSearchParams(window.location.search);
        params.set('src', 'vsl_obrigatoria');
        if (!params.has('utm_source')) params.set('utm_source', 'vsl_obrigatoria');
        const query = params.toString();
        return `/curso-suspensao-piloto-completa${query ? `?${query}` : ''}`;
    }, []);

    useEffect(() => {
        captureTrackingParams();
        try {
            setIsUnlocked(sessionStorage.getItem(UNLOCK_KEY) === 'true');
        } catch {
            // A experiência continua normalmente se o armazenamento estiver indisponível.
        }

        const previousTitle = document.title;
        document.title = 'Aula de Acerto de Suspensão Off-Road — W-Tech';
        let robots = document.head.querySelector<HTMLMetaElement>('meta[name="robots"]');
        const createdRobots = !robots;
        const previousRobots = robots?.content;
        if (!robots) {
            robots = document.createElement('meta');
            robots.name = 'robots';
            document.head.appendChild(robots);
        }
        robots.content = 'noindex,follow';

        return () => {
            document.title = previousTitle;
            if (createdRobots) {
                robots?.remove();
            } else if (robots && previousRobots) {
                robots.content = previousRobots;
            }
        };
    }, []);

    const togglePlay = async () => {
        const video = videoRef.current;
        if (!video) return;
        if (video.paused) {
            await video.play().catch(() => undefined);
        } else {
            video.pause();
        }
    };

    const restartVideo = async () => {
        const video = videoRef.current;
        if (!video) return;
        video.currentTime = 0;
        furthestWatchedRef.current = 0;
        setCurrentTime(0);
        await video.play().catch(() => undefined);
    };

    const handleTimeUpdate = () => {
        const video = videoRef.current;
        if (!video) return;
        const watched = video.currentTime;
        setCurrentTime(watched);
        if (!video.seeking) {
            furthestWatchedRef.current = Math.max(furthestWatchedRef.current, watched);
        }
    };

    const handleSeeking = () => {
        const video = videoRef.current;
        if (!video || isUnlocked) return;
        if (video.currentTime > furthestWatchedRef.current + 1) {
            video.currentTime = furthestWatchedRef.current;
        }
    };

    const handleEnded = () => {
        setIsPlaying(false);
        setIsUnlocked(true);
        try {
            sessionStorage.setItem(UNLOCK_KEY, 'true');
        } catch {
            // A liberação permanece válida durante a renderização atual.
        }
    };

    const progress = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

    return (
        <main className="min-h-screen overflow-x-hidden bg-[#050505] text-white selection:bg-[#d7ad4f] selection:text-black">
            <div className="border-b border-white/10 bg-[#b5211f] px-4 py-2.5 text-center text-[11px] font-black uppercase tracking-[0.18em] text-white sm:text-xs">
                Aula exclusiva para pilotos Off-Road
            </div>

            <section className="relative isolate min-h-[calc(100vh-38px)] overflow-hidden px-5 py-10 sm:px-8 lg:py-14">
                <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_50%_0%,rgba(181,33,31,0.25),transparent_38%),radial-gradient(circle_at_20%_70%,rgba(215,173,79,0.12),transparent_32%),#050505]" />
                <div className="absolute inset-0 -z-10 opacity-25 [background-image:linear-gradient(rgba(255,255,255,.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.04)_1px,transparent_1px)] [background-size:44px_44px]" />

                <div className="mx-auto flex w-full max-w-5xl flex-col items-center">
                    <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#d7ad4f]/35 bg-[#d7ad4f]/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-[#e5c879] sm:text-xs">
                        <Headphones size={15} aria-hidden="true" />
                        Assista até o final para liberar sua inscrição
                    </div>

                    <motion.h1
                        initial={{ opacity: 0, y: 18 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="max-w-4xl text-center text-3xl font-black uppercase leading-[1.02] tracking-[-0.035em] sm:text-5xl lg:text-6xl"
                    >
                        Descubra por que sua moto cansa você — e como{' '}
                        <span className="bg-gradient-to-r from-[#f2da93] via-[#d7ad4f] to-[#f08a36] bg-clip-text text-transparent">
                            acertar a suspensão
                        </span>
                    </motion.h1>

                    <p className="mt-5 max-w-2xl text-center text-sm font-medium leading-relaxed text-zinc-300 sm:text-lg">
                        Alex Crepaldi mostra o caminho do SAG aos cliques para você ganhar tração,
                        controle e confiança sem depender de tentativa e erro.
                    </p>

                    <div className="mt-8 w-full overflow-hidden rounded-2xl border border-[#d7ad4f]/35 bg-black shadow-[0_30px_100px_rgba(0,0,0,.65)] sm:rounded-3xl">
                        <div className="flex items-center justify-between border-b border-white/10 bg-zinc-950 px-4 py-3 text-[10px] font-black uppercase tracking-[0.15em] text-zinc-300 sm:px-6 sm:text-xs">
                            <span className="inline-flex items-center gap-2">
                                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
                                Aula de acerto ao vivo
                            </span>
                            <span className="inline-flex items-center gap-2 text-[#d7ad4f]">
                                <Clock3 size={14} />
                                {formatTime(currentTime)} / {formatTime(duration)}
                            </span>
                        </div>

                        <div className="relative aspect-video bg-black">
                            <video
                                ref={videoRef}
                                src={VIDEO_URL}
                                poster="/images/vsl-thumbnail.webp"
                                playsInline
                                preload="metadata"
                                controls={false}
                                muted={isMuted}
                                onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
                                onTimeUpdate={handleTimeUpdate}
                                onSeeking={handleSeeking}
                                onPlay={() => setIsPlaying(true)}
                                onPause={() => setIsPlaying(false)}
                                onEnded={handleEnded}
                                className="h-full w-full object-cover"
                            />

                            {!isPlaying && currentTime === 0 && (
                                <button
                                    type="button"
                                    onClick={togglePlay}
                                    className="absolute inset-0 flex cursor-pointer flex-col items-center justify-center gap-4 bg-black/35 transition-colors hover:bg-black/25"
                                    aria-label="Iniciar aula"
                                >
                                    <span className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#f0ce6f] to-[#c99022] text-black shadow-[0_0_55px_rgba(215,173,79,.55)] transition-transform hover:scale-105">
                                        <Play size={32} fill="currentColor" className="ml-1" />
                                    </span>
                                    <span className="text-xs font-black uppercase tracking-[0.2em]">
                                        Iniciar aula
                                    </span>
                                </button>
                            )}
                        </div>

                        <div className="h-1.5 bg-zinc-800">
                            <div
                                className="h-full bg-gradient-to-r from-[#b5211f] via-[#e4582f] to-[#d7ad4f] transition-[width] duration-300"
                                style={{ width: `${progress}%` }}
                            />
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-950 px-4 py-3 sm:px-6">
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={togglePlay}
                                    className="flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 text-xs font-bold text-white transition-colors hover:border-[#d7ad4f]/50 hover:text-[#e5c879]"
                                >
                                    {isPlaying ? <Pause size={17} /> : <Play size={17} />}
                                    {isPlaying ? 'Pausar' : 'Continuar'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsMuted((value) => !value)}
                                    className="flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 text-xs font-bold text-white transition-colors hover:border-[#d7ad4f]/50"
                                >
                                    <Volume2 size={17} />
                                    {isMuted ? 'Ativar som' : 'Som ativo'}
                                </button>
                            </div>
                            <button
                                type="button"
                                onClick={restartVideo}
                                className="flex min-h-11 items-center gap-2 px-2 text-xs font-bold text-zinc-400 transition-colors hover:text-white"
                            >
                                <RotateCcw size={16} />
                                Recomeçar
                            </button>
                        </div>
                    </div>

                    <motion.div
                        layout
                        className={`mt-6 w-full rounded-2xl border p-5 text-center sm:p-7 ${
                            isUnlocked
                                ? 'border-emerald-400/35 bg-emerald-400/10'
                                : 'border-white/10 bg-white/[0.035]'
                        }`}
                    >
                        {isUnlocked ? (
                            <>
                                <div className="mb-4 flex items-center justify-center gap-2 text-sm font-black uppercase tracking-[0.14em] text-emerald-300">
                                    <CheckCircle2 size={20} />
                                    Inscrição liberada
                                </div>
                                <a
                                    href={landingUrl}
                                    className="mx-auto flex min-h-14 w-full max-w-xl items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-[#f0ce6f] to-[#d7ad4f] px-6 text-sm font-black uppercase tracking-[0.12em] text-black shadow-[0_16px_45px_rgba(215,173,79,.22)] transition-transform hover:scale-[1.015] sm:text-base"
                                >
                                    Continuar para a inscrição
                                    <ArrowRight size={20} strokeWidth={3} />
                                </a>
                                <p className="mt-3 text-xs text-zinc-400">
                                    Você será encaminhado para os detalhes completos do curso e da oferta.
                                </p>
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center gap-2 text-zinc-400">
                                <LockKeyhole size={24} className="text-[#d7ad4f]" />
                                <p className="text-sm font-black uppercase tracking-[0.12em] text-zinc-200">
                                    O botão de inscrição será liberado ao final da aula
                                </p>
                                <p className="text-xs">O avanço do vídeo acompanha apenas o conteúdo já assistido.</p>
                            </div>
                        )}
                    </motion.div>

                    <div className="mt-7 grid w-full grid-cols-1 gap-3 text-xs font-bold text-zinc-300 sm:grid-cols-3">
                        {[
                            ['Acesso por 12 meses', Clock3],
                            ['Garantia de 7 dias', ShieldCheck],
                            ['Certificado W-Tech', CheckCircle2],
                        ].map(([label, Icon]) => (
                            <div
                                key={label as string}
                                className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/10 bg-black/30 px-4"
                            >
                                <Icon size={17} className="text-[#d7ad4f]" />
                                {label as string}
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </main>
    );
};

export default LPErgonomiaVSL;
