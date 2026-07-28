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
        if (duration <= 0 && Number.isFinite(video.duration) && video.duration > 0) {
            setDuration(video.duration);
        }
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
    const remainingTime = duration > 0 ? Math.max(0, duration - currentTime) : 0;

    return (
        <main className="min-h-screen overflow-x-hidden bg-[#050505] pb-[calc(6.5rem+env(safe-area-inset-bottom))] text-white selection:bg-[#d7ad4f] selection:text-black sm:pb-0">
            <div className="border-b border-white/10 bg-[#b5211f] px-3 py-2 text-center text-[10px] font-black uppercase tracking-[0.16em] text-white sm:px-4 sm:py-2.5 sm:text-xs sm:tracking-[0.18em]">
                Aula exclusiva para pilotos Off-Road
            </div>

            <section className="relative isolate min-h-[calc(100svh-34px)] overflow-hidden px-4 py-6 sm:min-h-[calc(100vh-38px)] sm:px-8 sm:py-10 lg:py-14">
                <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_50%_0%,rgba(181,33,31,0.25),transparent_38%),radial-gradient(circle_at_20%_70%,rgba(215,173,79,0.12),transparent_32%),#050505]" />
                <div className="absolute inset-0 -z-10 opacity-25 [background-image:linear-gradient(rgba(255,255,255,.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.04)_1px,transparent_1px)] [background-size:44px_44px]" />
                <div className="absolute left-1/2 top-40 -z-10 h-72 w-72 -translate-x-1/2 rounded-full bg-[#d7ad4f]/10 blur-[90px] sm:hidden" />

                <div className="mx-auto flex w-full max-w-5xl flex-col items-center">
                    <div className="mb-4 flex w-full items-center justify-between sm:hidden">
                        <img src="/logo-wtech-branca.webp" alt="W-Tech" className="h-5 w-auto opacity-90" />
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-zinc-400">
                            Etapa 1 de 2
                        </span>
                    </div>

                    <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#d7ad4f]/35 bg-[#d7ad4f]/10 px-3 py-2 text-center text-[9px] font-black uppercase tracking-[0.16em] text-[#e5c879] shadow-[0_0_35px_rgba(215,173,79,.08)] sm:mb-6 sm:px-4 sm:text-xs sm:tracking-[0.2em]">
                        <Headphones size={15} aria-hidden="true" />
                        Assista até o final para liberar sua inscrição
                    </div>

                    <motion.h1
                        initial={{ opacity: 0, y: 18 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="max-w-4xl text-center text-[2rem] font-black uppercase leading-[.98] tracking-[-0.04em] sm:text-5xl sm:leading-[1.02] lg:text-6xl"
                    >
                        Descubra por que sua moto cansa você — e como{' '}
                        <span className="bg-gradient-to-r from-[#f2da93] via-[#d7ad4f] to-[#f08a36] bg-clip-text text-transparent">
                            acertar a suspensão
                        </span>
                    </motion.h1>

                    <p className="mt-4 max-w-2xl text-center text-[15px] font-medium leading-relaxed text-zinc-300 sm:mt-5 sm:text-lg">
                        Alex Crepaldi mostra o caminho do SAG aos cliques para você ganhar tração,
                        controle e confiança sem depender de tentativa e erro.
                    </p>

                    <div className="relative mt-6 w-full sm:mt-8">
                        <div className="absolute -inset-2 -z-10 rounded-[1.8rem] bg-gradient-to-br from-[#d7ad4f]/15 via-transparent to-[#b5211f]/20 blur-xl sm:-inset-4 sm:rounded-[2.4rem] sm:blur-2xl" />
                        <div className="w-full overflow-hidden rounded-[1.35rem] border border-[#d7ad4f]/35 bg-black shadow-[0_24px_80px_rgba(0,0,0,.75)] sm:rounded-3xl">
                        <div className="flex items-center justify-between border-b border-white/10 bg-zinc-950 px-3 py-2.5 text-[9px] font-black uppercase tracking-[0.12em] text-zinc-300 sm:px-6 sm:py-3 sm:text-xs sm:tracking-[0.15em]">
                            <span className="inline-flex items-center gap-2">
                                <span className="h-2 w-2 animate-pulse rounded-full bg-red-500 sm:h-2.5 sm:w-2.5" />
                                Aula privada
                            </span>
                            <span className="inline-flex items-center gap-2 text-[#d7ad4f]">
                                <Clock3 size={13} />
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
                                onDurationChange={(event) => {
                                    if (Number.isFinite(event.currentTarget.duration) && event.currentTarget.duration > 0) {
                                        setDuration(event.currentTarget.duration);
                                    }
                                }}
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
                                    className="absolute inset-0 flex cursor-pointer flex-col items-center justify-center gap-3 bg-gradient-to-t from-black/60 via-black/20 to-black/20 transition-colors hover:from-black/50"
                                    aria-label="Iniciar aula"
                                >
                                    <span className="flex h-16 w-16 items-center justify-center rounded-full border border-white/50 bg-gradient-to-br from-[#f0ce6f] to-[#c99022] text-black shadow-[0_0_55px_rgba(215,173,79,.55)] transition-transform hover:scale-105 sm:h-20 sm:w-20">
                                        <Play size={28} fill="currentColor" className="ml-1 sm:h-8 sm:w-8" />
                                    </span>
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] sm:text-xs">
                                        Começar agora
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

                        <div className="bg-zinc-950 px-3 py-3 sm:flex sm:flex-wrap sm:items-center sm:justify-between sm:gap-3 sm:px-6">
                            <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
                                <button
                                    type="button"
                                    onClick={togglePlay}
                                    className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-bold text-white transition-colors hover:border-[#d7ad4f]/50 hover:text-[#e5c879] sm:min-h-11 sm:justify-start sm:px-4"
                                >
                                    {isPlaying ? <Pause size={17} /> : <Play size={17} />}
                                    {isPlaying ? 'Pausar' : 'Continuar'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsMuted((value) => !value)}
                                    className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-bold text-white transition-colors hover:border-[#d7ad4f]/50 sm:min-h-11 sm:justify-start sm:px-4"
                                >
                                    <Volume2 size={17} />
                                    {isMuted ? 'Ativar som' : 'Som ativo'}
                                </button>
                            </div>
                            {currentTime > 0 ? (
                                <button
                                    type="button"
                                    onClick={restartVideo}
                                    className="mx-auto mt-2 flex min-h-11 items-center gap-2 px-2 text-xs font-bold text-zinc-400 transition-colors hover:text-white sm:mx-0 sm:mt-0"
                                >
                                    <RotateCcw size={16} />
                                    Recomeçar
                                </button>
                            ) : (
                                <p className="mt-2 text-center text-[9px] font-black uppercase tracking-[0.14em] text-zinc-600 sm:hidden">
                                    Conteúdo protegido · avanço progressivo
                                </p>
                            )}
                        </div>
                        </div>
                    </div>

                    <motion.div
                        layout
                        className={`mt-4 w-full rounded-2xl border p-4 text-center sm:mt-6 sm:p-7 ${
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
                                <p className="text-xs font-black uppercase tracking-[0.11em] text-zinc-200 sm:text-sm sm:tracking-[0.12em]">
                                    O botão de inscrição será liberado ao final da aula
                                </p>
                                <p className="text-xs">O avanço do vídeo acompanha apenas o conteúdo já assistido.</p>
                            </div>
                        )}
                    </motion.div>

                    <div className="mt-4 grid w-full grid-cols-3 gap-2 text-[9px] font-bold leading-tight text-zinc-300 sm:mt-7 sm:gap-3 sm:text-xs">
                        {[
                            ['Acesso por 12 meses', Clock3],
                            ['Garantia de 7 dias', ShieldCheck],
                            ['Certificado W-Tech', CheckCircle2],
                        ].map(([label, Icon]) => (
                            <div
                                key={label as string}
                                className="flex min-h-16 flex-col items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-black/30 px-2 text-center sm:min-h-12 sm:flex-row sm:gap-2 sm:px-4"
                            >
                                <Icon size={16} className="text-[#d7ad4f] sm:h-[17px] sm:w-[17px]" />
                                {label as string}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <div className="fixed inset-x-0 bottom-0 z-50 border-t border-[#d7ad4f]/20 bg-[#090909]/95 px-3 pt-3 shadow-[0_-18px_55px_rgba(0,0,0,.7)] backdrop-blur-xl sm:hidden [padding-bottom:max(12px,env(safe-area-inset-bottom))]">
                {isUnlocked ? (
                    <a
                        href={landingUrl}
                        className="flex min-h-14 w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-[#f0ce6f] to-[#d7ad4f] px-5 text-xs font-black uppercase tracking-[0.11em] text-black shadow-[0_12px_35px_rgba(215,173,79,.25)]"
                    >
                        Ver inscrição liberada
                        <ArrowRight size={19} strokeWidth={3} />
                    </a>
                ) : (
                    <button
                        type="button"
                        onClick={togglePlay}
                        className="relative flex min-h-14 w-full items-center gap-3 overflow-hidden rounded-xl border border-white/10 bg-white/[0.06] px-4 text-left"
                    >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#d7ad4f] text-black">
                            {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-0.5" />}
                        </span>
                        <span className="min-w-0 flex-1">
                            <span className="block text-[9px] font-black uppercase tracking-[0.16em] text-[#d7ad4f]">
                                {isPlaying ? 'Aula em andamento' : currentTime > 0 ? 'Continue de onde parou' : 'Sua aula está pronta'}
                            </span>
                            <span className="mt-0.5 block truncate text-sm font-black text-white">
                                {duration > 0 ? `${formatTime(remainingTime)} restantes` : 'Começar aula exclusiva'}
                            </span>
                        </span>
                        <span className="text-[9px] font-black uppercase tracking-[0.12em] text-zinc-500">
                            {Math.round(progress)}%
                        </span>
                        <span
                            className="absolute inset-x-0 bottom-0 h-1 origin-left bg-gradient-to-r from-[#b5211f] via-[#e4582f] to-[#d7ad4f]"
                            style={{ transform: `scaleX(${progress / 100})` }}
                        />
                    </button>
                )}
            </div>
        </main>
    );
};

export default LPErgonomiaVSL;
