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
import { buildCheckoutUrl, captureTrackingParams } from '../lib/tracking';
import { lpTranslations } from '../lib/lpErgonomiaTranslations';
import { useLanguage } from '../context/LanguageContext';
import { LanguageSwitcher } from '../components/ui/LanguageSwitcher';
import { trackEvent } from '../components/AnalyticsTracker';
import { WhatsAppLeadCapture } from '../components/WhatsAppLeadCapture';
import {
    buildSuspensionLandingUrl,
    getSuspensionFunnelCopy,
    readSuspensionFunnelContext,
    suspensionFunnelEventLabel,
} from '../lib/suspensionFunnel';

const VIDEO_URL = 'https://niesvylxwfaffgnmdoql.supabase.co/storage/v1/object/public/site-assets/vsl-suspensao.mp4';
const CHECKOUT_URL = 'https://pay.kiwify.com.br/19v4nIa';
const UNLOCK_KEY = 'wtech_suspensao_vsl_completed';
// Segundos de conteúdo efetivamente assistido para liberar a inscrição. Conta o
// avanço real do vídeo (furthestWatchedRef), então adiantar não abre o botão.
const UNLOCK_AFTER_SECONDS = 50;

const vslUi = {
    'pt-BR': {
        exclusive: 'Apresentação exclusiva para pilotos Off-Road',
        step: 'Etapa 1 de 2',
        watch: 'Assista aos primeiros 50 segundos para liberar sua inscrição',
        privateClass: 'Apresentação em vídeo',
        start: 'Começar agora',
        pause: 'Pausar',
        continue: 'Continuar',
        soundOn: 'Ativar som',
        soundActive: 'Som ativo',
        restart: 'Recomeçar',
        protected: 'Conteúdo protegido · avanço progressivo',
        unlocked: 'Inscrição liberada',
        continueEnrollment: 'Continuar para a inscrição',
        destination: 'Você será encaminhado para os detalhes completos do curso e da oferta.',
        locked: 'O botão de inscrição libera após 50 segundos de apresentação',
        tracking: 'O avanço do vídeo acompanha apenas o conteúdo já assistido.',
        benefits: ['Acesso por 12 meses', 'Garantia de 7 dias', 'Certificado W-Tech'],
        released: 'Ver inscrição liberada',
        playing: 'Apresentação em andamento',
        resume: 'Continue de onde parou',
        ready: 'Sua apresentação está pronta',
        remaining: 'restantes',
        startExclusive: 'Começar apresentação',
        quizStep: 'Etapa 2 de 2',
        checkoutAction: 'Ir para a inscrição segura',
        checkoutReleased: 'Inscrição liberada',
        checkoutDestination: 'Você seguirá direto para o checkout seguro, sem outra página de venda.',
        profile: 'Diagnóstico recebido',
        premium: 'Plano Premium',
    },
    'pt-PT': {
        exclusive: 'Apresentação exclusiva para pilotos Off-Road',
        step: 'Etapa 1 de 2',
        watch: 'Vê os primeiros 50 segundos para libertar a tua inscrição',
        privateClass: 'Apresentação em vídeo',
        start: 'Começar agora',
        pause: 'Pausar',
        continue: 'Continuar',
        soundOn: 'Ativar som',
        soundActive: 'Som ativo',
        restart: 'Recomeçar',
        protected: 'Conteúdo protegido · avanço progressivo',
        unlocked: 'Inscrição libertada',
        continueEnrollment: 'Continuar para a inscrição',
        destination: 'Serás encaminhado para os detalhes completos do curso e da oferta.',
        locked: 'O botão de inscrição liberta após 50 segundos de apresentação',
        tracking: 'O avanço do vídeo acompanha apenas o conteúdo já visto.',
        benefits: ['Acesso por 12 meses', 'Garantia de 7 dias', 'Certificado W-Tech'],
        released: 'Ver inscrição libertada',
        playing: 'Apresentação em curso',
        resume: 'Continua de onde paraste',
        ready: 'A tua apresentação está pronta',
        remaining: 'restantes',
        startExclusive: 'Começar apresentação',
        quizStep: 'Etapa 2 de 2',
        checkoutAction: 'Ir para a inscrição segura',
        checkoutReleased: 'Inscrição libertada',
        checkoutDestination: 'Seguirás diretamente para o checkout seguro, sem outra página de venda.',
        profile: 'Diagnóstico recebido',
        premium: 'Plano Premium',
    },
    es: {
        exclusive: 'Presentación exclusiva para pilotos Off-Road',
        step: 'Etapa 1 de 2',
        watch: 'Mira los primeros 50 segundos para desbloquear tu inscripción',
        privateClass: 'Presentación en vídeo',
        start: 'Empezar ahora',
        pause: 'Pausar',
        continue: 'Continuar',
        soundOn: 'Activar sonido',
        soundActive: 'Sonido activo',
        restart: 'Reiniciar',
        protected: 'Contenido protegido · avance progresivo',
        unlocked: 'Inscripción desbloqueada',
        continueEnrollment: 'Continuar a la inscripción',
        destination: 'Accederás a todos los detalles del curso y de la oferta.',
        locked: 'El botón de inscripción se desbloquea tras 50 segundos de presentación',
        tracking: 'El avance solo permite recorrer el contenido ya visto.',
        benefits: ['Acceso por 12 meses', 'Garantía de 7 días', 'Certificado W-Tech'],
        released: 'Ver inscripción desbloqueada',
        playing: 'Presentación en curso',
        resume: 'Continúa donde lo dejaste',
        ready: 'Tu presentación está lista',
        remaining: 'restantes',
        startExclusive: 'Empezar presentación',
        quizStep: 'Etapa 2 de 2',
        checkoutAction: 'Ir a la inscripción segura',
        checkoutReleased: 'Inscripción desbloqueada',
        checkoutDestination: 'Irás directamente al checkout seguro, sin otra página de venta.',
        profile: 'Diagnóstico recibido',
        premium: 'Plan Premium',
    },
    en: {
        exclusive: 'Exclusive presentation for Off-Road riders',
        step: 'Step 1 of 2',
        watch: 'Watch the first 50 seconds to unlock enrollment',
        privateClass: 'Video presentation',
        start: 'Start now',
        pause: 'Pause',
        continue: 'Continue',
        soundOn: 'Turn sound on',
        soundActive: 'Sound on',
        restart: 'Restart',
        protected: 'Protected content · progressive viewing',
        unlocked: 'Enrollment unlocked',
        continueEnrollment: 'Continue to enrollment',
        destination: 'You will continue to the complete course and offer details.',
        locked: 'The enrollment button unlocks after 50 seconds of the presentation',
        tracking: 'You can only seek through content you have already watched.',
        benefits: ['12-month access', '7-day guarantee', 'W-Tech certificate'],
        released: 'View unlocked enrollment',
        playing: 'Presentation in progress',
        resume: 'Continue where you left off',
        ready: 'Your presentation is ready',
        remaining: 'remaining',
        startExclusive: 'Start presentation',
        quizStep: 'Step 2 of 2',
        checkoutAction: 'Go to secure enrollment',
        checkoutReleased: 'Enrollment unlocked',
        checkoutDestination: 'You will go straight to secure checkout, with no additional sales page.',
        profile: 'Diagnosis received',
        premium: 'Premium Plan',
    },
} as const;

const vslProfileLabels = {
    'pt-BR': {
        equilibrio: 'equilíbrio dinâmico',
        tracao: 'tração traseira',
        dianteira: 'confiança na dianteira',
        ergonomia: 'ergonomia e fadiga',
    },
    'pt-PT': {
        equilibrio: 'equilíbrio dinâmico',
        tracao: 'tração traseira',
        dianteira: 'confiança na dianteira',
        ergonomia: 'ergonomia e fadiga',
    },
    es: {
        equilibrio: 'equilibrio dinámico',
        tracao: 'tracción trasera',
        dianteira: 'confianza delantera',
        ergonomia: 'ergonomía y fatiga',
    },
    en: {
        equilibrio: 'dynamic balance',
        tracao: 'rear traction',
        dianteira: 'front-end confidence',
        ergonomia: 'ergonomics and fatigue',
    },
} as const;

const formatTime = (seconds: number) => {
    if (!Number.isFinite(seconds) || seconds <= 0) return '00:00';
    const minutes = Math.floor(seconds / 60);
    const remaining = Math.floor(seconds % 60);
    return `${String(minutes).padStart(2, '0')}:${String(remaining).padStart(2, '0')}`;
};

const LPErgonomiaVSL: React.FC<{ theme?: 'dark' | 'light' }> = ({ theme = 'dark' }) => {
    const isLight = theme === 'light';
    const { currentLang } = useLanguage();
    const t = lpTranslations[currentLang];
    const ui = vslUi[currentLang];
    const videoRef = useRef<HTMLVideoElement>(null);
    const furthestWatchedRef = useRef(0);
    const milestonesRef = useRef<Set<number>>(new Set());
    const playTrackedRef = useRef(false);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isUnlocked, setIsUnlocked] = useState(false);
    const funnel = useMemo(() => readSuspensionFunnelContext(theme), [theme]);
    const funnelCopy = getSuspensionFunnelCopy(currentLang, funnel.angle);
    const eventLabel = suspensionFunnelEventLabel(funnel);

    const landingUrl = useMemo(() => {
        if (funnel.isQuiz) return buildCheckoutUrl(CHECKOUT_URL);
        return buildSuspensionLandingUrl(funnel);
    }, [funnel]);

    const enrollmentAction = funnel.isQuiz ? ui.checkoutAction : ui.continueEnrollment;
    const enrollmentDestination = funnel.isQuiz ? ui.checkoutDestination : ui.destination;
    const releasedAction = funnel.isQuiz ? ui.checkoutReleased : ui.released;
    const profileLabel = funnel.profile in vslProfileLabels[currentLang]
        ? vslProfileLabels[currentLang][funnel.profile as keyof typeof vslProfileLabels[typeof currentLang]]
        : funnel.profile;

    useEffect(() => {
        captureTrackingParams();
        trackEvent('Funil Suspensão', 'vsl_view', eventLabel);
        try {
            setIsUnlocked(sessionStorage.getItem(UNLOCK_KEY) === 'true');
        } catch {
            // A experiência continua normalmente se o armazenamento estiver indisponível.
        }

        const previousTitle = document.title;
        document.title = funnel.personalized
            ? `${funnelCopy.label} — Apresentação W-Tech`
            : isLight
                ? 'Apresentação Clara do Curso de Suspensão Off-Road — W-Tech'
                : 'Apresentação do Curso de Suspensão Off-Road — W-Tech';
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
    }, [eventLabel, funnel.personalized, funnelCopy.label, isLight]);

    const togglePlay = async () => {
        const video = videoRef.current;
        if (!video) return;
        if (video.paused) {
            if (!playTrackedRef.current) {
                playTrackedRef.current = true;
                trackEvent('Funil Suspensão', 'vsl_play', eventLabel);
            }
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

    const releaseEnrollment = (reason: 'tempo_minimo' | 'video_completo') => {
        setIsUnlocked((alreadyUnlocked) => {
            if (!alreadyUnlocked) trackEvent('Funil Suspensão', `vsl_unlock_${reason}`, eventLabel);
            return true;
        });
        try {
            sessionStorage.setItem(UNLOCK_KEY, 'true');
        } catch {
            // A liberação permanece válida durante a renderização atual.
        }
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
        if (!isUnlocked && furthestWatchedRef.current >= UNLOCK_AFTER_SECONDS) {
            releaseEnrollment('tempo_minimo');
        }
        if (video.duration > 0) {
            const percentage = (watched / video.duration) * 100;
            [25, 50, 75].forEach((milestone) => {
                if (percentage >= milestone && !milestonesRef.current.has(milestone)) {
                    milestonesRef.current.add(milestone);
                    trackEvent('Funil Suspensão', `vsl_${milestone}`, eventLabel);
                }
            });
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
        trackEvent('Funil Suspensão', 'vsl_100', eventLabel);
        releaseEnrollment('video_completo');
    };

    const progress = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
    const remainingTime = duration > 0 ? Math.max(0, duration - currentTime) : 0;

    return (
        <main className={`min-h-screen overflow-x-hidden pb-[calc(6.5rem+env(safe-area-inset-bottom))] selection:bg-[#d7ad4f] selection:text-black sm:pb-0 ${isLight ? 'bg-[#f6f4ee] text-[#171714]' : 'bg-[#050505] text-white'}`}>
            <div className={`border-b bg-[#b5211f] px-3 py-2 text-center text-[10px] font-black uppercase tracking-[0.16em] text-white sm:px-4 sm:py-2.5 sm:text-xs sm:tracking-[0.18em] ${isLight ? 'border-[#9c1c1a]' : 'border-white/10'}`}>
                {ui.exclusive}
            </div>

            <section className="relative isolate min-h-[calc(100svh-34px)] overflow-hidden px-4 py-6 sm:min-h-[calc(100vh-38px)] sm:px-8 sm:py-10 lg:py-14">
                {isLight ? (
                    <>
                        <img
                            src="/images/lp-curso/hero-light-vsl-rider.webp"
                            alt=""
                            aria-hidden="true"
                            width={1600}
                            height={900}
                            fetchPriority="high"
                            className="absolute inset-0 -z-30 h-full w-full object-cover object-[70%_center]"
                        />
                        <div className="absolute inset-0 -z-20 bg-gradient-to-b from-[#fbfaf6]/95 via-[#f7f1e5]/88 to-[#f6f4ee]/97" />
                        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_5%,rgba(255,255,255,.95),transparent_34%),linear-gradient(90deg,rgba(255,255,255,.28),transparent_62%,rgba(181,33,31,.08))]" />
                    </>
                ) : (
                    <>
                        <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_50%_0%,rgba(181,33,31,0.25),transparent_38%),radial-gradient(circle_at_20%_70%,rgba(215,173,79,0.12),transparent_32%),#050505]" />
                        <div className="absolute inset-0 -z-10 opacity-25 [background-image:linear-gradient(rgba(255,255,255,.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.04)_1px,transparent_1px)] [background-size:44px_44px]" />
                        <div className="absolute left-1/2 top-40 -z-10 h-72 w-72 -translate-x-1/2 rounded-full bg-[#d7ad4f]/10 blur-[90px] sm:hidden" />
                    </>
                )}

                <div className="mx-auto flex w-full max-w-5xl flex-col items-center">
                    <div className="mb-6 hidden w-full items-center justify-between sm:flex">
                        <img
                            src="/logo-wtech-branca.webp"
                            alt="W-Tech"
                            className={`h-7 w-auto ${isLight ? 'brightness-0' : ''}`}
                        />
                        <LanguageSwitcher variant={isLight ? 'light' : 'dark'} />
                    </div>
                    <div className="mb-4 flex w-full items-center justify-between sm:hidden">
                        <img src="/logo-wtech-branca.webp" alt="W-Tech" className={`h-5 w-auto ${isLight ? 'brightness-0' : ''}`} />
                        <span className={`rounded-full border px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] ${isLight ? 'border-[#cec5b4] bg-white/70 text-[#6d685f]' : 'border-white/10 bg-white/5 text-zinc-400'}`}>
                            {funnel.isQuiz ? ui.quizStep : ui.step}
                        </span>
                    </div>

                    <div className={`mb-4 inline-flex items-center gap-2 rounded-full border border-[#d7ad4f]/35 px-3 py-2 text-center text-[9px] font-black uppercase tracking-[0.16em] shadow-[0_0_35px_rgba(215,173,79,.08)] sm:mb-6 sm:px-4 sm:text-xs sm:tracking-[0.2em] ${isLight ? 'bg-white/80 text-[#875d0f] backdrop-blur' : 'bg-[#d7ad4f]/10 text-[#e5c879]'}`}>
                        <Headphones size={15} aria-hidden="true" />
                        {funnel.personalized ? `${funnelCopy.label} · ${ui.watch}` : ui.watch}
                    </div>

                    {funnel.isQuiz && funnel.profile && (
                        <div className={`mb-4 rounded-full border px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.14em] sm:mb-5 sm:text-[10px] ${isLight ? 'border-[#b77d16]/25 bg-white/75 text-[#875d0f]' : 'border-[#d7ad4f]/25 bg-[#d7ad4f]/10 text-[#e5c879]'}`}>
                            {ui.profile}: {profileLabel}
                        </div>
                    )}

                    <motion.h1
                        initial={{ opacity: 0, y: 18 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="max-w-4xl text-center text-[2rem] font-black uppercase leading-[.98] tracking-[-0.04em] sm:text-5xl sm:leading-[1.02] lg:text-6xl"
                    >
                        {funnel.personalized ? funnelCopy.titlePart1 : t.hero.titlePart1}{' '}
                        <span className={`bg-gradient-to-r bg-clip-text text-transparent ${isLight ? 'from-[#875d0f] via-[#b77d16] to-[#b5211f]' : 'from-[#f2da93] via-[#d7ad4f] to-[#f08a36]'}`}>
                            {funnel.personalized ? funnelCopy.titleHighlight : t.hero.titleHighlight}
                        </span>
                    </motion.h1>

                    <p className={`mt-4 max-w-2xl text-center text-[15px] font-medium leading-relaxed sm:mt-5 sm:text-lg ${isLight ? 'text-[#555149]' : 'text-zinc-300'}`}>
                        {funnel.personalized ? funnelCopy.vslSubtitle : t.hero.subtitle}
                    </p>

                    <div className="relative mt-6 w-full sm:mt-8">
                        <div className={`absolute -inset-2 -z-10 rounded-[1.8rem] bg-gradient-to-br from-[#d7ad4f]/20 via-transparent to-[#b5211f]/20 blur-xl sm:-inset-4 sm:rounded-[2.4rem] sm:blur-2xl ${isLight ? 'opacity-90' : ''}`} />
                        <div className={`w-full overflow-hidden rounded-[1.35rem] border bg-black sm:rounded-3xl ${isLight ? 'border-white shadow-[0_24px_80px_rgba(48,38,18,.28)] sm:border-[6px]' : 'border-[#d7ad4f]/35 shadow-[0_24px_80px_rgba(0,0,0,.75)]'}`}>
                        <div className="flex items-center justify-between border-b border-white/10 bg-zinc-950 px-3 py-2.5 text-[9px] font-black uppercase tracking-[0.12em] text-zinc-300 sm:px-6 sm:py-3 sm:text-xs sm:tracking-[0.15em]">
                            <span className="inline-flex items-center gap-2">
                                <span className="h-2 w-2 animate-pulse rounded-full bg-red-500 sm:h-2.5 sm:w-2.5" />
                                {ui.privateClass}
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
                                    aria-label={ui.start}
                                >
                                    <span className="flex h-16 w-16 items-center justify-center rounded-full border border-white/50 bg-gradient-to-br from-[#f0ce6f] to-[#c99022] text-black shadow-[0_0_55px_rgba(215,173,79,.55)] transition-transform hover:scale-105 sm:h-20 sm:w-20">
                                        <Play size={28} fill="currentColor" className="ml-1 sm:h-8 sm:w-8" />
                                    </span>
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] sm:text-xs">
                                        {ui.start}
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
                                    {isPlaying ? ui.pause : ui.continue}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsMuted((value) => !value)}
                                    className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-bold text-white transition-colors hover:border-[#d7ad4f]/50 sm:min-h-11 sm:justify-start sm:px-4"
                                >
                                    <Volume2 size={17} />
                                    {isMuted ? ui.soundOn : ui.soundActive}
                                </button>
                            </div>
                            {currentTime > 0 ? (
                                <button
                                    type="button"
                                    onClick={restartVideo}
                                    className="mx-auto mt-2 flex min-h-11 items-center gap-2 px-2 text-xs font-bold text-zinc-400 transition-colors hover:text-white sm:mx-0 sm:mt-0"
                                >
                                    <RotateCcw size={16} />
                                    {ui.restart}
                                </button>
                            ) : (
                                <p className="mt-2 text-center text-[9px] font-black uppercase tracking-[0.14em] text-zinc-600 sm:hidden">
                                    {ui.protected}
                                </p>
                            )}
                        </div>
                        </div>
                    </div>

                    <motion.div
                        layout
                        className={`mt-4 w-full rounded-2xl border p-4 text-center shadow-sm sm:mt-6 sm:p-7 ${
                            isUnlocked
                                ? isLight
                                    ? 'border-emerald-600/30 bg-emerald-50/90'
                                    : 'border-emerald-400/35 bg-emerald-400/10'
                                : isLight
                                    ? 'border-[#d9d1c1] bg-white/80 backdrop-blur'
                                    : 'border-white/10 bg-white/[0.035]'
                        }`}
                    >
                        {isUnlocked ? (
                            <>
                                <div className={`mb-4 flex items-center justify-center gap-2 text-sm font-black uppercase tracking-[0.14em] ${isLight ? 'text-emerald-700' : 'text-emerald-300'}`}>
                                    <CheckCircle2 size={20} />
                                    {ui.premium} · {ui.unlocked}
                                </div>
                                <a
                                    href={landingUrl}
                                    target={funnel.isQuiz ? '_blank' : undefined}
                                    rel={funnel.isQuiz ? 'noopener noreferrer' : undefined}
                                    onClick={() => trackEvent('Funil Suspensão', funnel.isQuiz ? 'checkout_click' : 'landing_click', eventLabel)}
                                    className="mx-auto flex min-h-14 w-full max-w-xl items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-[#f0ce6f] to-[#d7ad4f] px-6 text-sm font-black uppercase tracking-[0.12em] text-black shadow-[0_16px_45px_rgba(215,173,79,.22)] transition-transform hover:scale-[1.015] sm:text-base"
                                >
                                    {enrollmentAction}
                                    <ArrowRight size={20} strokeWidth={3} />
                                </a>
                                <p className={`mt-3 text-xs ${isLight ? 'text-[#6f695f]' : 'text-zinc-400'}`}>
                                    {enrollmentDestination}
                                </p>
                            </>
                        ) : (
                            <div className={`flex flex-col items-center justify-center gap-2 ${isLight ? 'text-[#716c63]' : 'text-zinc-400'}`}>
                                <LockKeyhole size={24} className="text-[#d7ad4f]" />
                                <p className={`text-xs font-black uppercase tracking-[0.11em] sm:text-sm sm:tracking-[0.12em] ${isLight ? 'text-[#282620]' : 'text-zinc-200'}`}>
                                    {ui.locked}
                                </p>
                                <p className="text-xs">{ui.tracking}</p>
                            </div>
                        )}
                    </motion.div>

                    <div className={`mt-4 grid w-full grid-cols-3 gap-2 text-[9px] font-bold leading-tight sm:mt-7 sm:gap-3 sm:text-xs ${isLight ? 'text-[#4f4b43]' : 'text-zinc-300'}`}>
                        {([
                            [ui.benefits[0], Clock3],
                            [ui.benefits[1], ShieldCheck],
                            [ui.benefits[2], CheckCircle2],
                        ] as Array<[string, typeof Clock3]>).map(([label, Icon]) => (
                            <div
                                key={label}
                                className={`flex min-h-16 flex-col items-center justify-center gap-1.5 rounded-xl border px-2 text-center sm:min-h-12 sm:flex-row sm:gap-2 sm:px-4 ${isLight ? 'border-[#d8d0c0] bg-white/75 backdrop-blur' : 'border-white/10 bg-black/30'}`}
                            >
                                <Icon size={16} className="text-[#d7ad4f] sm:h-[17px] sm:w-[17px]" />
                                {label}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <div className={`fixed inset-x-0 bottom-0 z-50 border-t px-3 pt-3 backdrop-blur-xl sm:hidden [padding-bottom:max(12px,env(safe-area-inset-bottom))] ${isLight ? 'border-[#d8d0c0] bg-white/95 shadow-[0_-18px_55px_rgba(38,32,20,.15)]' : 'border-[#d7ad4f]/20 bg-[#090909]/95 shadow-[0_-18px_55px_rgba(0,0,0,.7)]'}`}>
                {isUnlocked ? (
                    <a
                        href={landingUrl}
                        target={funnel.isQuiz ? '_blank' : undefined}
                        rel={funnel.isQuiz ? 'noopener noreferrer' : undefined}
                        onClick={() => trackEvent('Funil Suspensão', funnel.isQuiz ? 'checkout_click_mobile' : 'landing_click_mobile', eventLabel)}
                        className="flex min-h-14 w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-[#f0ce6f] to-[#d7ad4f] px-5 text-xs font-black uppercase tracking-[0.11em] text-black shadow-[0_12px_35px_rgba(215,173,79,.25)]"
                    >
                        {releasedAction}
                        <ArrowRight size={19} strokeWidth={3} />
                    </a>
                ) : (
                    <button
                        type="button"
                        onClick={togglePlay}
                        className={`relative flex min-h-14 w-full items-center gap-3 overflow-hidden rounded-xl border px-4 text-left ${isLight ? 'border-[#25221c]/15 bg-[#171714] shadow-lg' : 'border-white/10 bg-white/[0.06]'}`}
                    >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#d7ad4f] text-black">
                            {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-0.5" />}
                        </span>
                        <span className="min-w-0 flex-1">
                            <span className="block text-[9px] font-black uppercase tracking-[0.16em] text-[#d7ad4f]">
                                {isPlaying ? ui.playing : currentTime > 0 ? ui.resume : ui.ready}
                            </span>
                            <span className="mt-0.5 block truncate text-sm font-black text-white">
                                {duration > 0 ? `${formatTime(remainingTime)} ${ui.remaining}` : ui.startExclusive}
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
            <WhatsAppLeadCapture pageLabel={`${isLight ? 'VSL clara' : 'VSL escura'} · Curso Online de Suspensão`} floating />
        </main>
    );
};

export default LPErgonomiaVSL;
