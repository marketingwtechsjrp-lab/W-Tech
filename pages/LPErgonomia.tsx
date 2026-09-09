import React, { useState, useEffect, useRef, Suspense, lazy, useMemo } from 'react';
import { motion, useReducedMotion, useInView } from 'framer-motion';
import { Marquee } from '../components/ui/marquee';
import { CourseTestimonials } from '../components/lp/CourseTestimonials';
import { GridVignetteBackground } from '../components/ui/vignette-grid-background';
import { captureTrackingParams, buildCheckoutUrl } from '../lib/tracking';
import { PUBLIC_BASE_URL } from '../lib/publicUrl';
import { getCheckoutUrl, getCoursePrice } from '../lib/coursePricing';
import { useBillingRegion } from '../hooks/useBillingRegion';
import { useHotmartCheckoutUrl } from '../hooks/useHotmartCheckoutUrl';
import { VSL_VIDEO_URL } from '../lib/vslVideo';
import { getPilotLandingTranslation, localizePilotCopy } from '../lib/pilotLandingPortugal';
import { lpTranslations, LPLanguage } from '../lib/lpErgonomiaTranslations';
import { useLanguage } from '../context/LanguageContext';
import { trackEvent } from '../components/AnalyticsTracker';
import { courseContentParams, trackMetaStandardEvent } from '../lib/metaPixel';
import { WhatsAppLeadCapture } from '../components/WhatsAppLeadCapture';
import {
    getSuspensionFunnelCopy,
    readSuspensionFunnelContext,
    suspensionFunnelEventLabel,
} from '../lib/suspensionFunnel';
import { Globe } from 'lucide-react';
// Shader pesado (~124KB gzip): carregado sob demanda só quando o CTA final entra em tela
const AnimatedShaderBackground = lazy(() => import('../components/ui/animated-shader-background'));
import {
    CheckCircle,
    ArrowRight,
    ArrowDown,
    ChevronDown,
    ChevronUp,
    ChevronRight,
    Play,
    Pause,
    Volume2,
    VolumeX,
    Monitor,
    Clock,
    ShieldCheck,
    Settings,
    Zap,
    Award,
    Users,
    Target,
    Bike,
    Wrench,
    Mountain,
    Star,
    Crosshair,
    Activity,
    Gauge,
    Move,
    CircleDot,
    Disc,
    BookOpen,
    Infinity,
    Clock4,
    CalendarDays,
} from 'lucide-react';

/* ─── Reduced Motion Hook ─── */
const useMotionConfig = () => {
    const prefersReduced = useReducedMotion();
    return {
        shouldAnimate: !prefersReduced,
        duration: prefersReduced ? 0 : 0.2,
        staggerDelay: prefersReduced ? 0 : 0.08,
    };
};

/* ─── Animation Variants (respecting prefers-reduced-motion via hook) ─── */
const fadeUp = {
    hidden: { opacity: 0, y: 24 },
    visible: (i: number = 0) => ({
        opacity: 1,
        y: 0,
        transition: { duration: 0.22, delay: i * 0.08, ease: [0.25, 0.46, 0.45, 0.94] },
    }),
};

const fadeUpReduced = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.01 } },
};

const stagger = {
    visible: { transition: { staggerChildren: 0.08 } },
};

const scaleIn = {
    hidden: { opacity: 0, scale: 0.96 },
    visible: {
        opacity: 1,
        scale: 1,
        transition: { duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] },
    },
};

const slideFromLeft = {
    hidden: { opacity: 0, x: -30 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.25, ease: 'easeOut' } },
};

const slideFromRight = {
    hidden: { opacity: 0, x: 30 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.25, ease: 'easeOut' } },
};

/* ─── Hover configs ─── */
const cardHover = {
    y: -6,
    transition: { duration: 0.18, ease: 'easeOut' },
};

const cardTap = {
    scale: 0.98,
    transition: { duration: 0.1 },
};

const ctaHover = {
    scale: 1.04,
    transition: { duration: 0.15, ease: 'easeOut' },
};

const ctaTap = {
    scale: 0.97,
    transition: { duration: 0.08 },
};

/* ─── FAQ Accordion Item ─── */
const FAQItem: React.FC<{ q: string; a: string }> = ({ q, a }) => {
    const [open, setOpen] = useState(false);
    const { shouldAnimate } = useMotionConfig();
    return (
        <motion.div
            className="border border-white/10 bg-zinc-900/50 rounded-xl overflow-hidden hover:border-wtech-gold/40 transition-colors"
            whileHover={shouldAnimate ? { borderColor: 'rgba(212,175,55,0.4)' } : undefined}
        >
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between gap-4 p-6 text-left group"
            >
                <span className="font-bold text-gray-200 text-sm md:text-base group-hover:text-white transition-colors duration-150">{q}</span>
                <motion.div
                    animate={{ rotate: open ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                >
                    <ChevronDown size={20} className={`shrink-0 transition-colors duration-150 ${open ? 'text-wtech-gold' : 'text-gray-500'}`} />
                </motion.div>
            </button>
            <motion.div
                initial={false}
                animate={{
                    height: open ? 'auto' : 0,
                    opacity: open ? 1 : 0,
                }}
                transition={{ duration: shouldAnimate ? 0.2 : 0, ease: 'easeInOut' }}
                className="overflow-hidden"
            >
                <div className="px-6 pb-6 text-gray-400 text-sm leading-relaxed">{a}</div>
            </motion.div>
        </motion.div>
    );
};

/* ─── Scroll Reveal Wrapper ─── */
const Reveal: React.FC<{
    children: React.ReactNode;
    variant?: 'fadeUp' | 'scaleIn' | 'left' | 'right';
    delay?: number;
    className?: string;
}> = ({ children, variant = 'fadeUp', delay = 0, className }) => {
    const { shouldAnimate } = useMotionConfig();
    const variants = {
        fadeUp: shouldAnimate ? fadeUp : fadeUpReduced,
        scaleIn,
        left: slideFromLeft,
        right: slideFromRight,
    };
    return (
        <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={variants[variant]}
            custom={delay}
            className={className}
        >
            {children}
        </motion.div>
    );
};

/* ─── Main Component ─── */
const LPErgonomia: React.FC<{ forceFullContent?: boolean }> = () => {
    const { currentLang, setLanguage } = useLanguage();

    const handleLanguageChange = (lang: LPLanguage) => {
        setLanguage(lang);
    };

    const t = getPilotLandingTranslation(currentLang);
    const localize = (text: string) => localizePilotCopy(currentLang, text);
    const billingRegion = useBillingRegion();
    const hotmartCheckoutUrl = useHotmartCheckoutUrl(billingRegion === 'intl');
    const price = getCoursePrice(billingRegion, currentLang, hotmartCheckoutUrl);
    const checkoutBaseUrl = getCheckoutUrl(billingRegion, hotmartCheckoutUrl);
    const checkoutUrl = useMemo(
        () => buildCheckoutUrl(checkoutBaseUrl),
        [checkoutBaseUrl],
    );
    const funnel = useMemo(() => readSuspensionFunnelContext('dark'), []);
    const funnelCopy = getSuspensionFunnelCopy(currentLang, funnel.angle);
    const funnelEventLabel = suspensionFunnelEventLabel(funnel);

    const { shouldAnimate } = useMotionConfig();
    const v = shouldAnimate ? fadeUp : fadeUpReduced;

    useEffect(() => {
        // Persiste as UTMs/IDs de clique; o link é derivado no mesmo render do preço.
        captureTrackingParams();
        trackEvent('Funil Suspensão', 'lp_view', funnelEventLabel);
        trackMetaStandardEvent('ViewContent', courseContentParams('lp_dark'), {
            onceKey: `course-view-content:lp-dark:${window.location.pathname}`,
        });
    }, [funnelEventLabel]);

    const scrollTo = (id: string) => {
        document.getElementById(id)?.scrollIntoView({ behavior: shouldAnimate ? 'smooth' : 'auto' });
        if (id === 'cta-final') trackEvent('Funil Suspensão', 'offer_section_click', funnelEventLabel);
    };

    /* Apresentação opcional: todas as seções ficam disponíveis desde a entrada. */
    const [videoPlaying, setVideoPlaying] = useState(false);
    const [videoActivated, setVideoActivated] = useState(false);
    const [isMuted, setIsMuted] = useState(true);
    const [videoProgress, setVideoProgress] = useState(0);
    const videoRef = useRef<HTMLVideoElement>(null);
    const milestonesRef = useRef<Set<number>>(new Set());

    // CTA final: só monta o shader pesado quando a seção se aproxima da viewport
    const ctaRef = useRef<HTMLElement>(null);
    const ctaInView = useInView(ctaRef, { once: true, margin: '300px' });

    const handlePlayVideo = () => {
        setVideoActivated(true);
        requestAnimationFrame(() => {
            if (videoRef.current) {
                if (!videoRef.current.currentSrc) videoRef.current.load();
                videoRef.current.muted = isMuted;
                videoRef.current.play().catch(() => {});
                setVideoPlaying(true);
                trackEvent('VSL', 'vsl_play', 'Curso Piloto');
            }
        });
    };

    const handleUnmuteAudio = () => {
        setIsMuted(false);
        if (!videoActivated) {
            setVideoActivated(true);
        }
        requestAnimationFrame(() => {
            if (videoRef.current) {
                videoRef.current.muted = false;
                videoRef.current.play().catch(() => {});
                setVideoPlaying(true);
                trackEvent('VSL', 'vsl_unmute', 'Curso Piloto');
            }
        });
    };

    const handleTimeUpdate = () => {
        if (!videoRef.current) return;
        const current = videoRef.current.currentTime;
        const duration = videoRef.current.duration || 1;
        const progressPercent = Math.floor((current / duration) * 100);
        setVideoProgress(progressPercent);

        if (progressPercent >= 25 && !milestonesRef.current.has(25)) {
            milestonesRef.current.add(25);
            trackEvent('VSL', 'vsl_25', 'Curso Piloto');
        }
        if (progressPercent >= 50 && !milestonesRef.current.has(50)) {
            milestonesRef.current.add(50);
            trackEvent('VSL', 'vsl_50', 'Curso Piloto');
        }
        if (progressPercent >= 75 && !milestonesRef.current.has(75)) {
            milestonesRef.current.add(75);
            trackEvent('VSL', 'vsl_75', 'Curso Piloto');
        }
        if (progressPercent >= 100 && !milestonesRef.current.has(100)) {
            milestonesRef.current.add(100);
            trackEvent('VSL', 'vsl_100', 'Curso Piloto');
        }
    };

    /* ─── SEO: canonical próprio + Open Graph específicos do curso ─── */
    /* (SPA: Google executa JS e lê isto; para preview garantido no WhatsApp seria
        necessário SSR/prerender — mantemos as tags corretas mesmo assim.) */
    useEffect(() => {
        // Domínio canônico: site.w-techbrasil.com.br responde 308 e não pode ser
        // canonical nem og:image (ver lib/publicUrl.ts).
        const COURSE_URL = `${PUBLIC_BASE_URL}/curso-suspensao-piloto`;
        const OG_IMAGE = `${PUBLIC_BASE_URL}/hero-desktop-alex.webp`;
        const prevTitle = document.title;
        document.title = localize("Curso de Suspensão Off-Road | Regule a Suspensão da Sua Moto — W-Tech");

        const upsertMeta = (selector: string, attr: string, key: string, content: string) => {
            let el = document.head.querySelector<HTMLMetaElement>(selector);
            if (!el) { el = document.createElement('meta'); el.setAttribute(attr, key); document.head.appendChild(el); }
            el.setAttribute('content', content);
        };
        const setCanonical = (href: string) => {
            let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
            if (!el) { el = document.createElement('link'); el.rel = 'canonical'; document.head.appendChild(el); }
            const prev = el.href; el.href = href; return prev;
        };

        const prevCanonical = setCanonical(COURSE_URL);
        upsertMeta('meta[name="description"]', 'name', 'description', localize("Curso online de regulagem de suspensão Off-Road: SAG, molas, cliques, óleo e ergonomia. Do zero ao acerto, com prática real na moto. Acesso por 12 meses + bônus."));
        upsertMeta('meta[property="og:title"]', 'property', 'og:title', localize("Curso de Suspensão Off-Road — W-Tech Brasil"));
        upsertMeta('meta[property="og:description"]', 'property', 'og:description', localize("Aprenda a regular a suspensão da sua moto do zero: SAG, molas, cliques e ergonomia, com prática real. 11 módulos + bônus Paschoalin."));
        upsertMeta('meta[property="og:url"]', 'property', 'og:url', COURSE_URL);
        upsertMeta('meta[property="og:image"]', 'property', 'og:image', OG_IMAGE);
        upsertMeta('meta[property="twitter:title"]', 'property', 'twitter:title', localize("Curso de Suspensão Off-Road — W-Tech Brasil"));
        upsertMeta('meta[property="twitter:url"]', 'property', 'twitter:url', COURSE_URL);
        upsertMeta('meta[property="twitter:image"]', 'property', 'twitter:image', OG_IMAGE);

        return () => {
            document.title = prevTitle;
            setCanonical(prevCanonical || 'https://w-techbrasil.com.br/');
        };
    }, [currentLang]);

    /* ━━━ SECTION DATA ━━━ */

    const profiles = [
        {
            icon: <Bike size={28} />,
            tag: 'Para Todo Piloto',
            title: 'Piloto Amador',
            pain: 'Sente a moto "quicar" demais e os braços cansarem rápido. Sabe que algo está errado na suspensão, mas não sabe por onde começar — nem quantos cliques dar. Este curso é o seu guia definitivo do zero ao acerto.',
        },
        {
            icon: <Mountain size={28} />,
            tag: 'Trilha & Enduro',
            title: 'Trilha / Enduro',
            pain: 'Perde tração em subidas, sofre com fim de curso em saltos e buracos, ou sente a frente "espalhar" nas curvas. Termina a trilha exausto antes do tempo — não é falta de preparo físico, é a suspensão errada.',
        },
        {
            icon: <Wrench size={28} />,
            tag: 'Serviço Nobre',
            title: 'Mecânico / Preparador',
            pain: 'Quer agregar o serviço mais lucrativo da oficina: o acerto de suspensão. Saia das revisões básicas e entre no mundo das bengalas, amortecedores e preparações — e ainda ensine seus clientes a regular a ergonomia.',
        },
        {
            icon: <Settings size={28} />,
            tag: localize("Diferencial Competitivo"),
            title: localize("Dono de Oficina"),
            pain: 'Seus clientes pedem ajustes de cliques que sua equipe não sabe resolver, perdendo serviço — e fidelidade — para oficinas especializadas. Mostre aos seus clientes como regular a ergonomia e dê dicas de suspensão que os farão voltar sempre.',
        },
    ];

    const ergoBlocks = t.concepts.items.map((item, idx) => {
        const icons = [<CircleDot key={0} size={24} />, <Activity key={1} size={24} />, <Move key={2} size={24} />, <Disc key={3} size={24} />];
        return { icon: icons[idx % icons.length], title: item.title, desc: item.desc };
    });

    const modules = t.modules.items;

    const paschoalinLessons = [
        'Apresentação: Quem é Rafa Paschoalin',
        'Introdução ao módulo prático',
        localize("Ergonomia com Paschoalin (na moto real)"),
        localize("Ajuste do guidão na prática"),
        localize("Ajuste das manetes no campo"),
        localize("Ajuste preciso do freio"),
        localize("Ajuste e posicionamento do câmbio"),
        localize("Check Down: verificação completa"),
        localize("Desregulando a moto (para sentir a diferença)"),
        localize("Moto regulada — Teste e comparação final"),
    ];

    const benefits = [
        { icon: <ShieldCheck size={22} />, text: localize("Menos dor e fadiga na pilotagem") },
        { icon: <Crosshair size={22} />, text: localize("Mais controle e precisão nas manobras") },
        { icon: <Zap size={22} />, text: 'Mais confiança em qualquer terreno' },
        { icon: <Target size={22} />, text: localize("Maior segurança para você e sua moto") },
        { icon: <Gauge size={22} />, text: 'Performance real sem forçar o corpo' },
        { icon: <Award size={22} />, text: 'Conhecimento técnico aplicável imediatamente' },
    ];

    const faqData = [
        { q: 'Preciso ter experiência para fazer o curso?', a: 'Não. O curso é para iniciantes e avançados. Você vai aprender do zero e pode aplicar no seu nível de pilotagem ou trabalho.' },
        { q: 'Como funciona o acesso às aulas?', a: 'Após a inscrição, você recebe acesso imediato à área de membros. As aulas são gravadas e você assiste quando e onde quiser.' },
        { q: 'Recebo certificado?', a: 'Sim. Ao completar todos os módulos, você recebe o certificado digital oficial da W-Tech Brasil.' },
        { q: 'Posso assistir no celular?', a: 'Sim. A plataforma funciona em qualquer dispositivo — celular, tablet ou computador.' },
        { q: 'O curso serve para qual tipo de moto?', a: 'Os princípios ensinados se aplicam a Enduro, Motocross, Big Trail e até mesmo Hard Enduro. As teorias de molas, hidráulica e SAG são fundamentos universais para o Off-Road.' },
        { q: 'Por quanto tempo tenho acesso?', a: 'O seu acesso é válido por 12 meses (1 Ano). Você pode reassistir as aulas quantas vezes quiser durante este período.' },
        { q: 'Tem garantia?', a: 'Sim. Garantia incondicional de 7 dias. Se não gostar, devolvemos 100% do seu investimento.' },
    ];

    return (
        <div className="min-h-screen bg-[#050505] text-white selection:bg-wtech-gold selection:text-black font-sans overflow-x-hidden pb-24">

            {/* ── STICKY BARRA DE OFERTA E IDIOMA ── */}
            <div className="sticky top-0 z-[100] bg-black/90 backdrop-blur-md border-b border-wtech-gold/20 py-2.5 px-4 text-center">
                <div className="container mx-auto flex flex-wrap items-center justify-between gap-2 text-[10px] sm:text-xs font-bold uppercase tracking-widest text-wtech-gold">
                    <div className="flex items-center gap-2">
                        <img src="/logo-wtech-branca.webp" alt="W-Tech" className="h-6 w-auto mr-2" />
                        <span>FORMAÇÃO ONLINE</span>
                        <span className="hidden md:inline text-white/30">•</span>
                        <span className="text-gray-300 hidden sm:inline">Suspensão & ergonomia Off-Road</span>
                    </div>

                    {/* Interactive Language Selector */}
                    <div className="flex items-center gap-1 bg-zinc-900/90 p-1 rounded-full border border-wtech-gold/30">
                        <Globe size={13} className="text-wtech-gold ml-1.5 shrink-0" />
                        {(['pt-PT', 'es', 'en', 'pt-BR'] as LPLanguage[]).map((langKey) => {
                            const item = lpTranslations[langKey];
                            const active = currentLang === langKey;
                            return (
                                <button
                                    key={langKey}
                                    onClick={() => handleLanguageChange(langKey)}
                                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                                        active
                                            ? 'bg-gradient-to-r from-wtech-gold to-amber-600 text-black font-extrabold shadow-sm'
                                            : 'text-gray-400 hover:text-white hover:bg-white/10'
                                    }`}
                                    title={item.langName}
                                >
                                    <span>{item.flag}</span>
                                    <span>{langKey === 'pt-PT' ? 'PT' : langKey === 'pt-BR' ? 'BR' : langKey.toUpperCase()}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* ═══════════════════════════════════════════ */}
            {/* 1 · HERO COMPLETO COM VSL VENDAS          */}
            {/* ═══════════════════════════════════════════ */}
            <section className="relative min-h-[95vh] flex items-center justify-center overflow-hidden pt-12 md:pt-6 pb-16">
                {/* BG */}
                <div className="absolute inset-0 z-0">
                    <motion.div
                        initial={{ scale: 1.05 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: shouldAnimate ? 1.2 : 0, ease: 'easeOut' }}
                        className="absolute inset-0"
                    >
                        <picture>
                            <source media="(min-width: 768px)" srcSet="/hero-desktop-alex.webp" type="image/webp" />
                            <img
                                src="/hero-mobile-alex.webp"
                                alt={localize("Alex Crepaldi ajustando a suspensão de uma moto Off-Road")}
                                fetchPriority="high"
                                decoding="async"
                                width={1920}
                                height={1280}
                                className="absolute inset-0 w-full h-full object-cover object-top lg:object-center opacity-40 blur-sm scale-105"
                            />
                        </picture>
                    </motion.div>
                    <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-black/90 to-black/80 z-10" />
                </div>

                <div className="container mx-auto px-4 sm:px-6 relative z-20 pt-6 pb-12">
                    <div className="max-w-4xl mx-auto text-center flex flex-col items-center">

                        {/* Top Badge */}
                        <motion.div initial="hidden" animate="visible" variants={v} className="inline-flex items-center gap-2 border border-wtech-gold/40 bg-wtech-gold/10 backdrop-blur-md px-4 py-1.5 rounded-full mb-6">
                            <Zap size={14} className="text-wtech-gold animate-pulse" />
                            <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] text-wtech-gold">
                                {funnel.flow === 'vsl_lp'
                                    ? funnelCopy.continuity
                                    : funnel.personalized
                                        ? funnelCopy.label
                                        : localize("APRESENTAÇÃO EXCLUSIVA PARA PILOTOS & MECÂNICOS")}
                            </span>
                        </motion.div>

                        {/* VSL Main Headline */}
                        <motion.h1 initial="hidden" animate="visible" variants={v} className="text-3xl sm:text-5xl lg:text-6xl font-black uppercase tracking-tighter leading-[0.95] mb-4 text-white drop-shadow-2xl max-w-3xl">
                            {funnel.personalized ? funnelCopy.titlePart1 : t.hero.titlePart1} <span className="text-transparent bg-clip-text bg-gradient-to-r from-wtech-gold via-yellow-400 to-amber-600">{funnel.personalized ? funnelCopy.titleHighlight : t.hero.titleHighlight}</span>
                        </motion.h1>

                        <motion.p initial="hidden" animate="visible" variants={v} className="text-sm sm:text-lg text-gray-300 mb-8 max-w-2xl font-medium">
                            {funnel.personalized ? funnelCopy.subtitle : t.hero.subtitle}
                        </motion.p>

                        {/* VSL VIDEO PLAYER CONTAINER (DOMINANT CENTRAL FOCUS) */}
                        <motion.div
                            initial="hidden"
                            animate="visible"
                            variants={scaleIn}
                            className="relative w-full aspect-video rounded-2xl overflow-hidden border-2 border-wtech-gold/30 shadow-[0_0_80px_rgba(212,175,55,0.25)] bg-black group my-2"
                        >
                            {/* Status Header Bar */}
                            <div className="absolute top-0 left-0 right-0 z-30 bg-black/80 backdrop-blur-md px-4 py-2 flex items-center justify-between border-b border-white/10">
                                <div className="flex items-center gap-2">
                                    <span className="relative flex h-2.5 w-2.5">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600"></span>
                                    </span>
                                    <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-gray-200">APRESENTAÇÃO DO MÉTODO W-TECH</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    {isMuted ? (
                                        <button onClick={handleUnmuteAudio} className="flex items-center gap-1 text-[10px] text-amber-400 font-bold hover:underline cursor-pointer">
                                            <VolumeX size={14} /> {localize("Ativar Som")}
                                        </button>
                                    ) : (
                                        <button onClick={() => setIsMuted(true)} className="flex items-center gap-1 text-[10px] text-gray-400 font-bold hover:underline cursor-pointer">
                                            <Volume2 size={14} className="text-wtech-gold" /> {localize("Áudio Ligado")}
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Unmute Alert Overlay (If muted or paused) */}
                            {isMuted && videoPlaying && (
                                <div
                                    onClick={handleUnmuteAudio}
                                    className="absolute top-12 left-1/2 -translate-x-1/2 z-40 bg-gradient-to-r from-red-600 to-amber-600 text-white font-black text-xs sm:text-sm px-6 py-2.5 rounded-full shadow-2xl flex items-center gap-2 animate-bounce cursor-pointer hover:scale-105 transition-transform border border-white/30"
                                >
                                    <VolumeX size={18} />
                                    <span>{localize("SEU ÁUDIO ESTÁ DESLIGADO — CLIQUE PARA OUVIR")}</span>
                                </div>
                            )}

                            {/* Video Element */}
                            <video
                                ref={videoRef}
                                poster="/images/vsl-thumbnail.webp"
                                controls={videoActivated}
                                playsInline
                                preload="none"
                                muted={isMuted}
                                onTimeUpdate={handleTimeUpdate}
                                onEnded={() => {
                                    setVideoPlaying(false);
                                }}
                                className="w-full h-full object-cover pt-8 sm:pt-0"
                                onPlay={() => setVideoPlaying(true)}
                                onPause={() => setVideoPlaying(false)}
                            >
                                {videoActivated && (
                                    <source src={VSL_VIDEO_URL} type="video/mp4" />
                                )}
                                {localize("Seu navegador não suporta vídeos.")}
                            </video>

                            {/* Initial Play Overlay */}
                            {!videoActivated && (
                                <button
                                    type="button"
                                    aria-label={localize("Assistir à apresentação do curso")}
                                    onClick={handlePlayVideo}
                                    className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 group-hover:bg-black/40 transition-colors z-20 cursor-pointer pt-6"
                                >
                                    <div className="relative mb-3">
                                        <div className="absolute inset-0 bg-wtech-gold/40 rounded-full animate-ping scale-150 opacity-30" />
                                        <div className="relative w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-tr from-wtech-gold to-yellow-400 rounded-full flex items-center justify-center shadow-[0_0_60px_rgba(212,175,55,0.8)] group-hover:scale-110 transition-transform">
                                            <Play fill="black" size={36} className="text-black ml-1" />
                                        </div>
                                    </div>
                                    <span className="text-xs sm:text-sm font-black uppercase tracking-widest text-white drop-shadow-md bg-black/60 px-4 py-1.5 rounded-full border border-wtech-gold/40">
                                        {localize("CONHEÇA O MÉTODO W-TECH")}
                                    </span>
                                </button>
                            )}

                            {/* Progress bar at the bottom */}
                            <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-zinc-800 z-30">
                                <div
                                    className="h-full bg-gradient-to-r from-wtech-gold via-yellow-400 to-amber-500 transition-all duration-300"
                                    style={{ width: `${videoProgress}%` }}
                                />
                            </div>
                        </motion.div>

                        <div className="w-full mt-8 flex flex-col items-center gap-5">
                            <button
                                type="button"
                                data-offer-cta="hero"
                                onClick={() => scrollTo('cta-final')}
                                className="w-full max-w-lg min-h-14 bg-gradient-to-r from-wtech-gold via-yellow-400 to-amber-600 text-black px-7 py-5 rounded-xl font-black text-sm sm:text-base uppercase tracking-wider shadow-[0_12px_40px_rgba(212,175,55,0.18)] hover:brightness-110 transition flex items-center justify-center gap-3"
                            >
                                {localize("Quero dominar os ajustes da minha moto")} <ArrowRight size={20} className="shrink-0" />
                            </button>
                            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-3 text-gray-300 text-xs">
                                <span className="inline-flex items-center gap-1.5"><Clock size={15} className="text-wtech-gold" /> 12 meses de acesso</span>
                                <span className="inline-flex items-center gap-1.5"><ShieldCheck size={15} className="text-wtech-gold" /> Garantia de 7 dias</span>
                                <span className="inline-flex items-center gap-1.5"><Award size={15} className="text-wtech-gold" /> {localize("Certificado incluso")}</span>
                            </div>
                            <a href="#conteudo" className="min-h-11 inline-flex items-center gap-2 text-xs text-gray-400 hover:text-white transition-colors">
                                {localize("Explore o curso no seu ritmo")} <ArrowDown size={14} />
                            </a>
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════ */}
            {/* Conteúdo completo, independente da reprodução do vídeo. */}
            <div id="conteudo" className="scroll-mt-24">

            {/* ═══════════════════════════════════════════ */}
            {/* 2 · PARA QUEM É (BENTO GRID)              */}
            {/* ═══════════════════════════════════════════ */}
            <section className="py-24 bg-[#050505] relative overflow-hidden">
                <GridVignetteBackground className="opacity-80" x={50} y={50} intensity={100} horizontalVignetteSize={50} verticalVignetteSize={30} />
                <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-wtech-gold/40 to-transparent" />

                {/* Background glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl h-[400px] bg-wtech-gold/5 blur-[100px] rounded-full z-0" />

                <div className="container mx-auto px-6 relative z-10">
                    <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }} variants={stagger} className="text-center mb-16">
                        <motion.span variants={v} className="text-wtech-gold font-black uppercase tracking-[0.3em] text-[10px] md:text-xs">{t.profiles.label}</motion.span>
                        <motion.h2 variants={v} className="text-4xl md:text-6xl font-black uppercase mt-4 mb-6 tracking-tighter drop-shadow-lg">
                            {t.profiles.titlePart1} <span className="text-transparent bg-clip-text bg-gradient-to-r from-wtech-gold to-yellow-500">{t.profiles.titleHighlight}</span>
                        </motion.h2>
                        <motion.p variants={v} className="text-gray-400 max-w-2xl mx-auto text-base">
                            {t.profiles.desc}
                        </motion.p>
                    </motion.div>

                    <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-40px' }} variants={stagger} className="grid grid-cols-1 md:grid-cols-12 auto-rows-[minmax(220px,auto)] gap-4 md:gap-6 max-w-6xl mx-auto">

                        {/* Box 1 - Piloto (qualquer nível) - Large */}
                        <motion.div
                            variants={v}
                            style={{ backgroundImage: `url('/images/lp-curso/1.webp')` }}
                            className="md:col-span-7 bg-zinc-900/80 bg-blend-overlay bg-cover bg-center border border-white/10 rounded-3xl p-8 md:p-10 transition-all hover:bg-zinc-800/80 group overflow-hidden relative shadow-lg cursor-default"
                        >
                            <div className="absolute inset-0 bg-black/65 pointer-events-none z-0" />
                            <div className="absolute -right-10 -top-10 w-40 h-40 bg-wtech-gold/30 rounded-full blur-[50px] group-hover:bg-wtech-gold/50 transition-colors duration-300 z-0" />
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-wtech-gold to-amber-600 flex items-center justify-center text-black mb-5 shadow-[0_0_20px_rgba(212,175,55,0.3)] relative z-10 group-hover:scale-110 transition-transform duration-200">
                                <Bike size={28} />
                            </div>
                            <div className="inline-block text-[9px] font-black uppercase tracking-widest text-wtech-gold/80 border border-wtech-gold/30 px-2 py-1 rounded mb-3 relative z-10">{t.profiles.items[0].tag}</div>
                            <h3 className="text-2xl lg:text-3xl font-black uppercase text-white mb-4 tracking-tight relative z-10">{t.profiles.items[0].title}</h3>
                            <p className="text-gray-300 text-sm md:text-base leading-relaxed relative z-10">{t.profiles.items[0].pain}</p>
                        </motion.div>

                        {/* Box 2 - Enduro (Medium) */}
                        <motion.div
                            variants={v}
                            style={{ backgroundImage: `url('/images/lp-curso/2.webp')` }}
                            className="md:col-span-5 bg-zinc-900/80 bg-blend-overlay bg-cover bg-center border border-white/10 rounded-3xl p-8 md:p-10 transition-all hover:bg-zinc-800/80 group overflow-hidden relative shadow-lg cursor-default"
                        >
                            <div className="absolute inset-0 bg-black/65 pointer-events-none z-0" />
                            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity z-0" />
                            <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-wtech-gold mb-4 group-hover:scale-110 transition-transform relative z-10">
                                <Mountain size={24} />
                            </div>
                            <div className="inline-block text-[9px] font-black uppercase tracking-widest text-gray-400 border border-white/10 px-2 py-1 rounded mb-3 relative z-10">{t.profiles.items[1].tag}</div>
                            <h3 className="text-xl font-black uppercase text-white mb-3 tracking-tight relative z-10">{t.profiles.items[1].title}</h3>
                            <p className="text-gray-300 text-sm leading-relaxed relative z-10">{t.profiles.items[1].pain}</p>
                        </motion.div>

                        {/* Box 3 - Mecânico (Medium) */}
                        <motion.div
                            variants={v}
                            style={{ backgroundImage: `url('/images/lp-curso/3.webp')` }}
                            className="md:col-span-5 bg-zinc-900/80 bg-blend-overlay bg-cover bg-center border border-white/10 rounded-3xl p-8 md:p-10 transition-all hover:bg-zinc-800/80 group overflow-hidden relative shadow-lg cursor-default"
                        >
                            <div className="absolute inset-0 bg-black/65 pointer-events-none z-0" />
                            <div className="absolute inset-0 bg-gradient-to-bl from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity z-0" />
                            <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-wtech-red mb-4 group-hover:scale-110 transition-transform relative z-10">
                                <Wrench size={24} />
                            </div>
                            <div className="inline-block text-[9px] font-black uppercase tracking-widest text-gray-400 border border-white/10 px-2 py-1 rounded mb-3 relative z-10">{t.profiles.items[2].tag}</div>
                            <h3 className="text-xl font-black uppercase text-white mb-3 tracking-tight relative z-10">{t.profiles.items[2].title}</h3>
                            <p className="text-gray-300 text-sm leading-relaxed relative z-10">{t.profiles.items[2].pain}</p>
                        </motion.div>

                        {/* Box 4 - Dono de Oficina (Large) */}
                        <motion.div
                            variants={v}
                            style={{ backgroundImage: `url('/images/lp-curso/4.webp')` }}
                            className="md:col-span-7 bg-zinc-900/80 bg-blend-overlay bg-cover bg-center border border-white/10 rounded-3xl p-8 md:p-10 transition-all hover:bg-zinc-800/80 group overflow-hidden relative shadow-lg cursor-default"
                        >
                            <div className="absolute inset-0 bg-black/65 pointer-events-none z-0" />
                            <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-wtech-red/30 rounded-full blur-[50px] group-hover:bg-wtech-red/50 transition-colors duration-300 z-0" />
                            <div className="w-14 h-14 flex items-center justify-center text-white mb-5 border border-white/30 rounded-2xl bg-white/10 backdrop-blur shadow-inner relative z-10 group-hover:scale-110 transition-transform duration-200">
                                <Settings size={28} />
                            </div>
                            <div className="inline-block text-[9px] font-black uppercase tracking-widest text-gray-400 border border-white/10 px-2 py-1 rounded mb-3 relative z-10">{localize("Diferencial Competitivo")}</div>
                            <h3 className="text-2xl lg:text-3xl font-black uppercase text-white mb-4 tracking-tight relative z-10">{localize("Dono de Oficina")}</h3>
                            <p className="text-gray-300 text-sm md:text-base leading-relaxed relative z-10">
                                {localize("Seus clientes pedem ajustes de cliques que a equipe não sabe resolver,")} <strong className="text-white">{localize("perdendo serviço e fidelidade")}</strong> {localize("para oficinas especializadas de Off-Road. Dê esse diferencial à sua equipe.")}
                            </p>
                        </motion.div>
                    </motion.div>

                    {/* CTA Intermediário 1 */}
                    <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-40px' }} variants={stagger} className="flex justify-center mt-16">
                        <motion.button
                            onClick={() => scrollTo('cta-final')}
                            variants={v}
                            whileHover={shouldAnimate ? { scale: 1.02, boxShadow: '0 0 30px rgba(230,36,29,0.4)' } : undefined}
                            whileTap={shouldAnimate ? ctaTap : undefined}
                            className="bg-gradient-to-r from-[#ba1d18] to-[#E6241D] text-white px-8 py-4 rounded-xl font-black text-sm uppercase tracking-widest hover:from-[#d1221c] hover:to-[#ff2820] transition-all shadow-[0_0_20px_rgba(230,36,29,0.3)] flex items-center justify-center gap-3"
                        >
                            {localize("Quero Garantir Minha Vaga")} <ArrowRight strokeWidth={3} size={18} />
                        </motion.button>
                    </motion.div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════ */}
            {/* 3 · O QUE É ERGONOMIA NA MOTO              */}
            {/* ═══════════════════════════════════════════ */}
            <section className="py-24 bg-black relative overflow-hidden">
                <div className="absolute inset-0 bg-cover bg-center bg-no-repeat bg-[url('/blueprint-moto.webp')] opacity-40" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-black/60 pointer-events-none" />
                <div className="container mx-auto px-6 relative z-10">
                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                        {/* Text */}
                        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }} variants={stagger}>
                            <motion.span variants={v} className="text-wtech-red font-black uppercase tracking-[0.3em] text-[10px] md:text-xs">{localize("Entenda o conceito")}</motion.span>
                            <motion.h2 variants={v} className="text-4xl md:text-6xl font-black uppercase mt-4 mb-8 tracking-tighter">
                                {localize("Qual o Segredo do")} <span className="text-wtech-gold">{localize("Acerto Perfeito")}</span>?
                            </motion.h2>
                            <motion.p variants={v} className="text-gray-300 text-lg leading-relaxed mb-4">
                                {localize("Não importa o quanto o motor da sua moto é forte se a suspensão não consegue colocar a potência no chão.")}
                            </motion.p>
                            <motion.p variants={v} className="text-gray-500 leading-relaxed mb-8">
                                {localize("Quando molas, óleo, cliques (retorno/compressão), SAG e pneus estão finamente ajustados para o")} <strong className="text-white">{localize("seu nível e modalidade Off-Road")}</strong>{localize(", tudo muda: a moto não espalha, a tração é constante nas subidas e os impactos param de moer os seus braços e sua lombar.")}
                            </motion.p>
                            <motion.div
                                variants={v}
                                whileHover={shouldAnimate ? { scale: 1.02 } : undefined}
                                className="inline-flex items-center gap-3 bg-wtech-gold/10 border border-wtech-gold/20 px-5 py-3 rounded-lg transition-colors"
                            >
                                <Zap size={18} className="text-wtech-gold flex-shrink-0" />
                                <span className="text-sm font-bold text-wtech-gold">{localize("O acerto da suspensão muda a moto da água para o vinho. É investimento em performance e segurança.")}</span>
                            </motion.div>
                        </motion.div>

                        {/* Blocks */}
                        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-40px' }} variants={stagger} className="space-y-4">
                            {ergoBlocks.map((b, i) => (
                                <motion.div
                                    key={i}
                                    variants={v}
                                    custom={i}
                                    whileHover={shouldAnimate ? { ...cardHover, boxShadow: '0 12px 32px rgba(0,0,0,0.3)' } : undefined}
                                    className="flex items-start gap-5 p-5 bg-zinc-900/50 border border-white/5 rounded-xl transition-colors group cursor-default"
                                >
                                    <div className="w-12 h-12 rounded-lg bg-wtech-gold/10 flex items-center justify-center text-wtech-gold shrink-0 group-hover:scale-110 transition-transform duration-200">
                                        {b.icon}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white mb-1">{b.title}</h3>
                                        <p className="text-gray-500 text-sm leading-relaxed">{b.desc}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════ */}
            {/* 4 · MÓDULOS DO CURSO                       */}
            {/* ═══════════════════════════════════════════ */}
            <section id="modulos" className="py-24 bg-zinc-950 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-wtech-red/40 to-transparent" />
                <div className="container mx-auto px-6 relative z-10 mb-12">
                    <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }} variants={stagger} className="text-center mb-8">
                        <motion.span variants={v} className="text-wtech-red font-black uppercase tracking-[0.3em] text-[10px] md:text-xs">{localize("Conteúdo Completo")}</motion.span>
                        <motion.h2 variants={v} className="text-4xl md:text-6xl font-black uppercase mt-4 mb-6 tracking-tighter">
                            11 Módulos +<br className="hidden md:block" /> <span className="text-wtech-gold">{localize("Bônus Exclusivo")}</span>
                        </motion.h2>
                        <motion.p variants={v} className="text-gray-400 max-w-2xl mx-auto text-base">
                            {localize("Tudo o que você precisa saber sobre suspensão Off-Road, do SAG ao clique, em aulas gravadas em estúdio com qualidade W-Tech.")}
                        </motion.p>
                    </motion.div>

                    {/* Online features bar */}
                    <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="grid sm:grid-cols-4 gap-4 max-w-4xl mx-auto mb-16">
                        {[
                            { icon: <Monitor size={20} />, text: '100% Online' },
                            { icon: <Play size={20} />, text: 'Aulas Gravadas' },
                            { icon: <CalendarDays size={20} />, text: 'Acesso 12 Meses' },
                            { icon: <BookOpen size={20} />, text: '+30 Aulas' },
                        ].map((f, i) => (
                            <motion.div
                                key={i}
                                variants={v}
                                custom={i}
                                whileHover={shouldAnimate ? { y: -3, boxShadow: '0 8px 24px rgba(0,0,0,0.3)' } : undefined}
                                className="flex items-center justify-center gap-3 bg-black border border-white/10 rounded-xl p-4 transition-colors cursor-default"
                            >
                                <div className="text-wtech-gold">{f.icon}</div>
                                <span className="font-bold text-sm uppercase tracking-wide">{f.text}</span>
                            </motion.div>
                        ))}
                    </motion.div>

                    {/* Module Grid */}
                    <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-40px' }} variants={stagger} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl mx-auto mb-14">
                        {modules.map((mod, i) => (
                            <motion.div
                                key={i}
                                variants={v}
                                custom={i}
                                whileHover={shouldAnimate ? { y: -4, boxShadow: '0 12px 32px rgba(0,0,0,0.4)' } : undefined}
                                className="group flex gap-4 p-5 bg-black/60 border border-white/5 hover:border-wtech-gold/20 rounded-2xl transition-all cursor-default relative overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-wtech-gold/0 to-wtech-gold/0 group-hover:from-wtech-gold/5 group-hover:to-transparent transition-all duration-300" />
                                <div className="shrink-0 w-10 h-10 rounded-xl bg-wtech-gold/10 border border-wtech-gold/20 flex items-center justify-center text-wtech-gold font-black text-sm group-hover:bg-wtech-gold/20 transition-colors">
                                    {mod.num}
                                </div>
                                <div className="relative z-10">
                                    <h3 className="font-black text-white text-sm leading-snug mb-1 group-hover:text-wtech-gold transition-colors duration-200">{mod.title}</h3>
                                    <p className="text-gray-500 text-xs leading-relaxed">{mod.desc}</p>
                                    <span className="text-[10px] text-gray-600 uppercase tracking-wider mt-2 block">{mod.aulas} {mod.aulas === 1 ? 'aula' : 'aulas'}</span>
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>

                {/* Modules Carousel */}
                <div className="relative w-full overflow-hidden flex flex-col gap-6 mb-6">
                    <Marquee pauseOnHover className="[--duration:60s]">
                        {[
                            // Assets locais em HTTPS/WebP (antes: HTTP externo = mixed content + ~300KB cada)
                            "/images/modulos/CARDS-KWIFY-CURSO-AVANCADO.webp",
                            "/images/modulos/CARDS-KWIFY-CURSO-AVANCADO-1.webp",
                            "/images/modulos/CARDS-KWIFY-CURSO-AVANCADO-2.webp",
                            "/images/modulos/CARDS-KWIFY-CURSO-AVANCADO-3.webp",
                            "/images/modulos/CARDS-KWIFY-CURSO-AVANCADO-4.webp",
                            "/images/lp-curso/oleo-e-viscosidades.webp",
                            "/images/modulos/CARDS-KWIFY-CURSO-AVANCADO-3-1.webp",
                            "/images/modulos/CARDS-KWIFY-CURSO-AVANCADO-4-1.webp",
                        ].map((src, idx) => (
                            <img
                                key={`row1-${idx}`}
                                src={src}
                                alt={`Módulo ${idx + 1}`}
                                loading="lazy"
                                decoding="async"
                                width={320}
                                height={480}
                                className="h-[250px] md:h-[300px] w-auto rounded-2xl border border-white/10 shadow-xl object-contain hover:scale-105 transition-transform duration-300"
                            />
                        ))}
                    </Marquee>

                    <div className="pointer-events-none absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-zinc-950 to-transparent"></div>
                    <div className="pointer-events-none absolute inset-y-0 right-0 w-1/4 bg-gradient-to-l from-zinc-950 to-transparent"></div>
                </div>

                {/* CTA Intermediário 2 */}
                <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="container mx-auto px-6 flex justify-center mt-8 pb-4 relative z-10">
                    <motion.button
                        onClick={() => scrollTo('cta-final')}
                        variants={v}
                        whileHover={shouldAnimate ? { scale: 1.02, boxShadow: '0 0 30px rgba(230,36,29,0.4)' } : undefined}
                        whileTap={shouldAnimate ? ctaTap : undefined}
                        className="bg-gradient-to-r from-[#ba1d18] to-[#E6241D] text-white px-8 py-4 rounded-xl font-black text-sm uppercase tracking-widest hover:from-[#d1221c] hover:to-[#ff2820] transition-all shadow-[0_0_20px_rgba(230,36,29,0.3)] flex items-center justify-center gap-3"
                    >
                        {t.modules.cta} <ArrowRight strokeWidth={3} size={18} />
                    </motion.button>
                </motion.div>
            </section>

            {/* ═══════════════════════════════════════════ */}
            {/* 4B · MÓDULO BÔNUS PASCHOALIN (DESTAQUE)   */}
            {/* ═══════════════════════════════════════════ */}
            <section className="py-20 relative overflow-hidden bg-[#06010a]">
                {/* Background glow */}
                <div className="absolute -right-[15%] top-[10%] w-[50%] h-[70%] bg-[#7c3aed]/20 blur-[120px] rounded-full z-0 pointer-events-none" />
                <div className="absolute -left-[10%] bottom-[10%] w-[40%] h-[50%] bg-[#ba1d18]/15 blur-[100px] rounded-full z-0 pointer-events-none" />
                <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-purple-500/40 to-transparent" />

                <div className="container mx-auto px-6 relative z-10">
                    {/* Header */}
                    <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }} variants={stagger} className="text-center mb-12">
                        <motion.div variants={v} className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/30 px-5 py-2 rounded-full mb-6">
                            <Star size={14} className="text-purple-400 fill-purple-400" />
                            <span className="text-purple-300 font-black uppercase tracking-widest text-[10px] md:text-xs">{localize("Módulo Bônus Exclusivo")}</span>
                        </motion.div>
                        <motion.h2 variants={v} className="text-4xl md:text-6xl font-black uppercase mt-2 mb-4 tracking-tighter">
                            Rafa <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-red-500">Paschoalin</span>
                        </motion.h2>
                        <motion.h3 variants={v} className="text-xl md:text-2xl font-black text-gray-300 mb-6 uppercase tracking-tight">
                            {localize("O Piloto Que Testou Tudo Na Prática — Para Você Ver A Diferença")}
                        </motion.h3>
                        <motion.p variants={v} className="text-gray-400 max-w-3xl mx-auto text-base leading-relaxed">
                            {localize("Não basta entender a teoria. Rafa Paschoalin — piloto de alta performance — pegou a moto,")} <strong className="text-white">{localize("desregulou e regulou cada componente ao vivo")}</strong>{localize(", para que você veja, na prática, o que muda com cada ajuste. Este é o tipo de conteúdo que você não encontra em nenhum outro lugar.")}
                        </motion.p>
                    </motion.div>

                    {/* Paschoalin Hero Card */}
                    <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-40px' }} variants={stagger} className="max-w-5xl mx-auto">
                        <motion.div variants={scaleIn} className="bg-zinc-900/60 backdrop-blur-sm border border-purple-500/20 rounded-3xl overflow-hidden shadow-[0_0_80px_rgba(124,58,237,0.15)] relative">
                            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-purple-600 via-pink-500 to-red-500" />

                            <div className="grid lg:grid-cols-2 gap-0">
                                {/* Photo side */}
                                <div className="relative h-64 lg:h-auto overflow-hidden">
                                    <img
                                        src="/paschoalin.webp"
                                        alt="Rafael Paschoalin — Piloto de Alta Performance"
                                        className="w-full h-full object-cover object-top"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent to-zinc-900/80 hidden lg:block" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/80 to-transparent lg:hidden" />
                                    {/* Badge */}
                                    <div className="absolute bottom-4 left-4 bg-purple-600/90 backdrop-blur-sm text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg flex items-center gap-2">
                                        <Star size={10} className="fill-white" /> Participação Especial
                                    </div>
                                </div>

                                {/* Content side */}
                                <div className="p-8 md:p-10 relative z-10">
                                    <div className="mb-6">
                                        <p className="text-wtech-gold font-bold uppercase tracking-widest text-xs mb-1">Piloto de Alta Performance</p>
                                        <p className="text-gray-400 text-sm leading-relaxed">
                                            Com experiência em competições de alto nível, Rafa traz a <strong className="text-white">validação 100% prática</strong> da teoria ensinada por Alex Crepaldi. A combinação perfeita: técnica sólida + performance real.
                                        </p>
                                    </div>

                                    <div className="mb-6">
                                        <p className="text-xs font-black uppercase tracking-widest text-purple-400 mb-4">10 Aulas Exclusivas neste Módulo:</p>
                                        <div className="space-y-2">
                                            {paschoalinLessons.map((lesson, i) => (
                                                <motion.div
                                                    key={i}
                                                    variants={v}
                                                    custom={i * 0.5}
                                                    className="flex items-center gap-3"
                                                >
                                                    <div className="w-5 h-5 rounded-full bg-purple-500/20 border border-purple-500/40 flex items-center justify-center shrink-0">
                                                        <CheckCircle size={10} className="text-purple-400" />
                                                    </div>
                                                    <span className="text-gray-300 text-sm">{lesson}</span>
                                                </motion.div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                                        <p className="text-sm font-bold text-purple-300 leading-relaxed">
                                            {localize("Rafa pega a moto regulada,")} <strong className="text-white">{localize("desregula ela ao vivo")}</strong> {localize("— e você sente a diferença. Isso é o que transforma conhecimento em resultado real.")}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════ */}
            {/* 5 · INSTRUTORES                            */}
            {/* ═══════════════════════════════════════════ */}
            <section className="py-24 bg-black border-t border-white/5">
                <div className="container mx-auto px-6">
                    <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }} variants={stagger} className="text-center mb-16">
                        <motion.span variants={v} className="text-wtech-gold font-black uppercase tracking-[0.3em] text-[10px] md:text-xs">Autoridade Técnica</motion.span>
                        <motion.h2 variants={v} className="text-4xl md:text-6xl font-black uppercase mt-4 tracking-tighter">
                            {localize("Seus")} <span className="text-wtech-gold">Instrutores</span>
                        </motion.h2>
                    </motion.div>

                    <div className="grid lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
                        {/* Alex Crepaldi */}
                        <Reveal variant="left">
                            <motion.div
                                whileHover={shouldAnimate ? { y: -6, boxShadow: '0 20px 50px rgba(0,0,0,0.5)' } : undefined}
                                transition={{ duration: 0.2 }}
                                className="bg-zinc-900/50 border border-white/5 rounded-2xl overflow-hidden group cursor-default h-full"
                            >
                                <div className="h-64 bg-gradient-to-br from-zinc-800 to-black flex items-center justify-center relative overflow-hidden">
                                    <img
                                        src="/images/alex-webp.webp"
                                        alt="Alex Crepaldi"
                                        className="w-full h-full object-cover object-top opacity-90 group-hover:scale-105 transition-transform duration-500"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-transparent" />
                                </div>
                                <div className="p-8">
                                    <div className="inline-block bg-wtech-gold text-black text-[10px] font-black uppercase px-3 py-1 rounded mb-4">Instrutor Principal</div>
                                    <h3 className="text-2xl font-black uppercase text-white mb-1">Alex Crepaldi</h3>
                                    <p className="text-wtech-gold text-sm font-medium mb-4">Fundador W-Tech Suspensões</p>
                                    <p className="text-gray-400 text-sm leading-relaxed mb-6">
                                        {localize("Referência nacional no acerto, preparação e revalvulação de")} <strong className="text-white">suspensões Off-Road</strong>. Mais de <strong className="text-white">{localize("3.000 mecânicos e pilotos capacitados")}</strong> pela escola técnica W-Tech em cursos online e presenciais.
                                    </p>
                                    <div className="p-4 bg-black/50 border-l-4 border-wtech-gold text-sm text-gray-400 rounded-r-lg">
                                        {localize("👉 Domínio técnico em suspensão: da simples manutenção à personalização profunda com shims, fluídos e kits de revalvulação.")}
                                    </div>
                                </div>
                            </motion.div>
                        </Reveal>

                        {/* Paschoalin */}
                        <Reveal variant="right">
                            <motion.div
                                whileHover={shouldAnimate ? { y: -6, boxShadow: '0 20px 50px rgba(0,0,0,0.5)' } : undefined}
                                transition={{ duration: 0.2 }}
                                className="bg-zinc-900/50 border border-white/5 rounded-2xl overflow-hidden group cursor-default h-full"
                            >
                                <div className="h-64 bg-gradient-to-br from-zinc-800 to-black flex items-center justify-center relative overflow-hidden">
                                    <img
                                        src="/paschoalin.webp"
                                        alt="Rafael Paschoalin"
                                        loading="lazy"
                                        className="w-full h-full object-cover object-top opacity-90 group-hover:scale-105 transition-transform duration-500"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-transparent" />
                                </div>
                                <div className="p-8">
                                    <div className="inline-block bg-wtech-red text-white text-[10px] font-black uppercase px-3 py-1 rounded mb-4">Participação Especial</div>
                                    <h3 className="text-2xl font-black uppercase text-white mb-1">Paschoalin</h3>
                                    <p className="text-wtech-red text-sm font-medium mb-4">Piloto de Alta Performance</p>
                                    <p className="text-gray-400 text-sm leading-relaxed mb-6">
                                        Piloto com vasta experiência em competições e provas de alto nível. Traz a <strong className="text-white">validação prática da pilotagem</strong> {localize("da teoria para as trilhas de performance e exigência máxima.")}
                                    </p>
                                    <div className="p-4 bg-black/50 border-l-4 border-wtech-red text-sm text-gray-400 rounded-r-lg">
                                        👉 Foco: a reação do motor e suspensão quando exigidos ao extremo.
                                    </div>
                                </div>
                            </motion.div>
                        </Reveal>
                    </div>

                    {/* Combo callout */}
                    <Reveal variant="scaleIn" delay={1}>
                        <div className="max-w-3xl mx-auto mt-10 bg-gradient-to-r from-wtech-gold/10 via-black to-purple-500/10 border border-white/5 rounded-xl p-6 text-center">
                            <p className="text-sm font-bold text-gray-300">
                                <span className="text-wtech-gold">Teoria técnica com Alex Crepaldi</span> + <span className="text-purple-400">Validação prática com Paschoalin</span> = A fórmula completa para dominar suspensão Off-Road.
                            </p>
                        </div>
                    </Reveal>

                    {/* CTA Intermediário 3 */}
                    <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="flex justify-center mt-12">
                        <motion.button
                            onClick={() => scrollTo('cta-final')}
                            variants={v}
                            whileHover={shouldAnimate ? { scale: 1.02, boxShadow: '0 0 30px rgba(230,36,29,0.4)' } : undefined}
                            whileTap={shouldAnimate ? ctaTap : undefined}
                            className="bg-gradient-to-r from-[#ba1d18] to-[#E6241D] text-white px-8 py-4 rounded-xl font-black text-sm uppercase tracking-widest hover:from-[#d1221c] hover:to-[#ff2820] transition-all shadow-[0_0_20px_rgba(230,36,29,0.3)] flex items-center justify-center gap-3"
                        >
                            {localize("Quero Aprender com os Melhores")} <ArrowRight strokeWidth={3} size={18} />
                        </motion.button>
                    </motion.div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════ */}

            {/* ═══════════════════════════════════════════ */}
            {/* 6 · BÔNUS / EMPILHAMENTO DE VALOR           */}
            {/* ═══════════════════════════════════════════ */}
            <section className="py-24 bg-[#0a0202] relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#E6241D]/40 to-transparent" />
                <div className="absolute -left-[20%] top-[20%] w-[50%] h-[50%] bg-[#E6241D]/10 blur-[120px] rounded-full z-0 pointer-events-none" />

                <div className="container mx-auto px-6 relative z-10">
                    <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }} variants={stagger} className="text-center mb-16">
                        <motion.span variants={v} className="text-[#E6241D] font-black uppercase tracking-[0.3em] text-[10px] md:text-xs">Material de Apoio Oficial</motion.span>
                        <motion.h2 variants={v} className="text-4xl md:text-6xl font-black uppercase mt-4 mb-6 tracking-tighter">
                            {localize("Da aula para")} <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#E6241D] to-orange-500">{localize("a sua moto")}</span>
                        </motion.h2>
                        <motion.p variants={v} className="text-gray-400 text-lg max-w-2xl mx-auto leading-relaxed">
                            {localize("Ao garantir sua vaga agora, você leva ferramentas complementares que nossa própria equipe usa.")}
                        </motion.p>
                    </motion.div>

                    <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-40px' }} variants={stagger} className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-16">
                        {[
                            { title: localize("Planilha de Regulagem de SAG"), icon: <Activity size={24} /> },
                            { title: localize("Planilha de Regulagem de PSI"), icon: <Gauge size={24} /> },
                            { title: localize("Comparativo de Óleos"), icon: <Move size={24} /> },
                            { title: localize("Comparativo de Molas"), icon: <CheckCircle size={24} /> },
                        ].map((bonus, i) => (
                            <motion.div
                                key={i}
                                variants={v}
                                custom={i}
                                whileHover={shouldAnimate ? { y: -5, boxShadow: '0 15px 40px rgba(230,36,29,0.2)' } : undefined}
                                className="flex flex-col gap-4 p-8 bg-zinc-950/80 border border-white/5 hover:border-[#E6241D]/30 rounded-2xl transition-all cursor-default relative overflow-hidden group shadow-lg"
                            >
                                <div className="absolute right-0 top-0 w-32 h-32 bg-[#E6241D]/10 rounded-full blur-[30px] group-hover:bg-[#E6241D]/20 transition-colors" />

                                <div className="flex items-center gap-4 mb-2 relative z-10">
                                    <div className="w-14 h-14 rounded-xl bg-[#E6241D]/10 flex items-center justify-center text-[#E6241D] shrink-0 border border-[#E6241D]/20 group-hover:scale-110 transition-transform">
                                        {bonus.icon}
                                    </div>
                                    <h3 className="font-black text-white text-lg md:text-xl uppercase tracking-wide leading-snug">{bonus.title}</h3>
                                </div>
                                <div className="pt-4 border-t border-white/5 flex items-center justify-between gap-2 relative z-10 mt-2">
                                    <span className="text-gray-400 text-xs">Material de consulta</span>
                                    <span className="inline-flex items-center gap-1.5 bg-wtech-gold/15 border border-wtech-gold/40 text-wtech-gold font-black uppercase text-[11px] tracking-widest px-3 py-1.5 rounded-lg">
                                        <CheckCircle size={13} /> {localize("Incluso no curso")}
                                    </span>
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════ */}
            {/* 7 · DEPOIMENTOS / PROVAS                   */}
            {/* ═══════════════════════════════════════════ */}
            <CourseTestimonials language={currentLang} onOfferClick={() => scrollTo('cta-final')} onMediaOpen={() => videoRef.current?.pause()} />

            {/* ═══════════════════════════════════════════ */}
            {/* 8 · OFERTA IRRECUSÁVEL E CTA FINAL         */}
            {/* ═══════════════════════════════════════════ */}
            <section ref={ctaRef} id="cta-final" className="scroll-mt-20 py-24 md:py-32 relative overflow-hidden bg-black flex items-center justify-center min-h-[90vh]">
                {ctaInView && (
                    <Suspense fallback={null}>
                        <AnimatedShaderBackground />
                    </Suspense>
                )}

                <div className="container mx-auto px-6 relative z-10 flex justify-center">
                    {/* Pricing Card - Reference Layout */}
                    <div className="w-full max-w-4xl bg-[#0a0a0a]/90 backdrop-blur-xl border border-[#E6241D]/20 rounded-2xl relative shadow-[0_0_120px_rgba(230,36,29,0.15)] overflow-hidden p-8 md:p-14 text-center transition-all duration-500 hover:shadow-[0_0_150px_rgba(230,36,29,0.25)]">
                        {/* Inner Red Glow Spotlight */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#E6241D]/15 blur-[100px] rounded-full pointer-events-none" />

                        {/* Top Line */}
                        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-red-600 via-[#E6241D] to-orange-500 z-10" />

                        {/* Logo */}
                        <div className="flex justify-center mb-8">
                            <img src="/images/modulos/logo-branca.webp" alt="W-Tech Work Suspension" loading="lazy" width={180} height={48} className="h-10 md:h-12 object-contain" />
                        </div>

                        <span className="text-wtech-gold font-bold uppercase tracking-[0.2em] text-[10px] md:text-xs block mb-4">
                            Plano Premium · {t.offer.badge}
                        </span>

                        <h2 className="text-2xl md:text-4xl font-black text-white mb-3 tracking-tight">
                            {t.offer.title}
                        </h2>
                        <p className="text-gray-400 text-sm mb-8 max-w-lg mx-auto">
                            {currentLang === 'pt-PT' ? `Mais de ${price.bonusValue} em folhas de cálculo e materiais de apoio incluídos.` : price.bonusSubLabel}
                        </p>

                        <div className="text-gray-400 font-bold uppercase text-xs md:text-sm tracking-[0.15em] mb-2 line-through decoration-red-500/70 decoration-2">
                            {price.strikeLabel}
                        </div>

                        <div className="mb-2 flex flex-col items-center justify-center">
                            <span className="text-4xl md:text-6xl font-black text-white tracking-tighter drop-shadow-lg">{price.installmentsShort}</span>
                        </div>
                        <div className="text-wtech-red/90 font-bold text-xs md:text-sm mb-2">
                            {price.cashLabel}
                        </div>
                        {price.chargedNotice && (
                            <div className="mb-8 max-w-md text-[11px] font-medium text-zinc-400">
                                {price.chargedNotice}
                            </div>
                        )}

                        <p className="text-gray-400 text-sm md:text-base mt-6 mb-10 max-w-xl mx-auto leading-relaxed">
                            {localize("Um ano para assistir, revisar e aplicar cada ajuste. Aulas em vídeo, materiais de apoio e certificado em uma única formação.")}
                        </p>

                        <div className="grid sm:grid-cols-2 gap-y-5 gap-x-2 max-w-2xl mx-auto mb-12 text-left">
                            <div className="flex items-center gap-3">
                                <CheckCircle size={16} className="text-[#E6241D] shrink-0" />
                                <span className="text-gray-300 text-xs sm:text-sm font-medium">1 Ano de Acesso ao Curso</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <CheckCircle size={16} className="text-[#E6241D] shrink-0" />
                                <span className="text-gray-300 text-xs sm:text-sm font-medium">Conteúdo 100% em Vídeo</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <CheckCircle size={16} className="text-[#E6241D] shrink-0" />
                                <span className="text-gray-300 text-xs sm:text-sm font-medium">Certificado de Conclusão W-Tech</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <CheckCircle size={16} className="text-[#E6241D] shrink-0" />
                                <span className="text-gray-300 text-xs sm:text-sm font-medium">{localize("Suporte Técnico na Plataforma")}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <CheckCircle size={16} className="text-wtech-gold shrink-0" />
                                <span className="text-gray-300 text-xs sm:text-sm font-bold shadow-wtech-gold/20">{localize("BÔNUS: Planilha de Regulagem de SAG")}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <CheckCircle size={16} className="text-wtech-gold shrink-0" />
                                <span className="text-gray-300 text-xs sm:text-sm font-bold shadow-wtech-gold/20">{localize("BÔNUS: Planilha de Regulagem de PSI")}</span>
                            </div>
                        </div>

                        {/* Selo de garantia visível no momento da decisão (ao lado do preço/CTA) */}
                        <div className="inline-flex items-center gap-2.5 bg-wtech-gold/10 border border-wtech-gold/40 rounded-full px-5 py-2.5 mb-6 mx-auto">
                            <ShieldCheck size={18} className="text-wtech-gold shrink-0" />
                            <span className="text-wtech-gold font-black uppercase text-[11px] sm:text-xs tracking-widest">Garantia Incondicional de 7 Dias</span>
                        </div>

                        <motion.a
                            href={checkoutUrl}
                            id="kiwify-checkout-btn-lp-ergonomia"
                            onClick={() => trackEvent('Funil Suspensão', 'checkout_click_offer', funnelEventLabel)}
                            whileHover={shouldAnimate ? { scale: 1.02, boxShadow: '0 0 40px rgba(230,36,29,0.5)' } : undefined}
                            whileTap={shouldAnimate ? { scale: 0.98 } : undefined}
                            className="w-full max-w-xl mx-auto bg-gradient-to-r from-[#ba1d18] to-[#E6241D] hover:from-[#d1221c] hover:to-[#ff2820] text-white px-8 py-5 sm:py-6 rounded-2xl font-black text-sm md:text-[15px] uppercase tracking-widest transition-all mb-4 shadow-xl relative overflow-hidden group flex justify-center items-center"
                        >
                            <div className="absolute inset-0 w-full h-full bg-white/10 -translate-x-full group-hover:translate-x-0 transition-transform duration-500" />
                            <span className="relative z-10">{localize("Quero Regular Minha Suspensão Agora")}</span>
                        </motion.a>
                        <p className="text-gray-400 text-xs mb-5">Acesso imediato após a confirmação do pagamento</p>
                        <WhatsAppLeadCapture
                            language={currentLang}
                            ariaLabel={currentLang === 'pt-PT' ? 'Falar com a equipa no WhatsApp' : undefined}
                            pageLabel="Landing completa escura · Curso Online de Suspensão"
                            className="mx-auto inline-flex min-h-11 items-center justify-center gap-2 text-sm text-gray-300 underline underline-offset-4 hover:text-white"
                        >
                            {localize("Tenho uma dúvida. Falar com a equipe")}
                        </WhatsAppLeadCapture>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 mt-10 pt-8 border-t border-white/5">
                            <div className="flex items-center gap-2 text-gray-500 text-[11px] font-semibold uppercase tracking-wider">
                                <ShieldCheck size={16} className="text-gray-400" /> Garantia Incondicional de 7 Dias
                            </div>
                            <div className="flex items-center gap-3 text-gray-500 text-[11px] font-semibold uppercase tracking-wider">
                                <div className="flex -space-x-2">
                                    <div className="w-5 h-5 rounded-full bg-zinc-700 border border-[#0a0a0a]" />
                                    <div className="w-5 h-5 rounded-full bg-zinc-600 border border-[#0a0a0a]" />
                                    <div className="w-5 h-5 rounded-full bg-zinc-500 border border-[#0a0a0a]" />
                                </div>
                                {localize("Vagas sujeitas à disponibilidade")}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════ */}
            {/* 9 · O MENTOR (ALEX CREPALDI)               */}
            {/* ═══════════════════════════════════════════ */}
            <section className="relative overflow-hidden bg-zinc-950 font-sans">
                {/* Background da Seção (Apenas Desktop) */}
                <div
                    className="hidden lg:block absolute inset-0 bg-cover bg-left-top bg-no-repeat z-0 scale-105"
                    style={{ backgroundImage: `url('/images/alex-webp.webp')`, backgroundPosition: 'left top' }}
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-zinc-950/40 to-zinc-950 z-0" />
                </div>

                <div className="container mx-auto max-w-7xl pt-16 pb-0 lg:py-24 relative z-10 flex flex-col lg:flex-row lg:justify-end">

                    {/* Imagem Mobile (Escondida no Desktop) */}
                    <div className="lg:hidden w-full h-[400px] sm:h-[500px] relative -mx-0 mb-0 px-6">
                        <img src="/images/alex-webp.webp" alt="Alex Crepaldi" loading="lazy" className="w-full h-full object-cover object-left-top rounded-t-3xl" />
                        <div className="absolute inset-x-6 bottom-0 top-1/2 bg-gradient-to-t from-zinc-950 to-transparent" />
                    </div>

                    {/* Content Card (Macedo Reference Layout) */}
                    <motion.div
                        initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
                        className="w-full lg:w-[50%] xl:w-[45%] bg-[#0B0B0C] lg:bg-zinc-950/80 backdrop-blur-sm lg:rounded-l-2xl border-t border-b lg:border-l border-white/5 px-8 pt-0 pb-16 lg:p-12 relative shadow-2xl overflow-hidden"
                    >
                        {/* Red Accent Line */}
                        <div className="absolute top-0 bottom-0 right-0 w-1.5 bg-[#E6241D] shadow-[-5px_0_20px_rgba(230,36,29,0.3)] z-20" />

                        <motion.div variants={v} className="relative z-10">
                            <span className="text-gray-400 font-bold uppercase tracking-[0.2em] text-[10px] md:text-xs mb-2 block">
                                O Mentor
                            </span>
                            <h2 className="text-4xl sm:text-5xl md:text-6xl font-black uppercase mb-8 tracking-tighter leading-[0.9]">
                                <span className="text-white block">Alex</span>
                                <span className="text-[#E6241D] block">Crepaldi</span>
                            </h2>

                            <div className="space-y-6 text-gray-400 text-sm sm:text-base leading-relaxed mb-10">
                                <p>
                                    Reconhecido como uma das maiores autoridades brasileiras em mecânica e diagnóstico de <strong className="text-white">suspensões de alta performance</strong>, especialmente para a linha Off-Road e street.
                                </p>
                                <p>
                                    {localize("Mas sua maior conquista não foi apenas o conhecimento técnico, foi a criação da")} <strong className="text-white">W-Tech Brasil</strong>, onde aplica um método de imersão de excelência e formação presencial sem igual.
                                </p>
                                <p>
                                    {localize("Hoje, como instrutor e especialista, Alex usa o método que desenvolveu trabalhando nos bastidores das corridas para forjar mecânicos autônomos e pilotos que buscam a mais pura precisão.")}
                                </p>
                            </div>

                            <motion.div variants={stagger} className="space-y-4 mb-12">
                                {[
                                    { icon: <Wrench size={18} />, text: 'Especialista em Suspensões' },
                                    { icon: <Users size={18} />, text: localize("Instrutor de +3.000 Alunos") },
                                    { icon: <ShieldCheck size={18} />, text: 'Consultor Técnico W-Tech' },
                                    { icon: <Star size={18} />, text: localize("Referência Nacional em Customização") },
                                ].map((item, i) => (
                                    <motion.div variants={v} key={i} className="flex items-center gap-4">
                                        <div className="text-wtech-gold">{item.icon}</div>
                                        <span className="font-semibold text-gray-300 text-sm md:text-[15px]">{item.text}</span>
                                    </motion.div>
                                ))}
                            </motion.div>

                            <motion.a
                                variants={v}
                                href="#cta-final"
                                className="inline-flex items-center gap-2 text-white font-black text-[11px] md:text-xs tracking-[0.15em] uppercase transition-colors group"
                            >
                                <span className="group-hover:text-wtech-red transition-colors duration-300">{localize("Conheça a história")}</span>
                                <ChevronRight size={14} className="group-hover:translate-x-1 group-hover:text-wtech-red transition-all duration-300" />
                            </motion.a>
                        </motion.div>
                    </motion.div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════ */}
            {/* 10 · FAQ                                     */}
            {/* ═══════════════════════════════════════════ */}
            <section className="py-24 bg-zinc-950 border-t border-white/5">
                <div className="container mx-auto px-6">
                    <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }} variants={stagger} className="text-center mb-16">
                        <motion.span variants={v} className="text-wtech-gold font-black uppercase tracking-[0.3em] text-[10px] md:text-xs">{t.faq.label}</motion.span>
                        <motion.h2 variants={v} className="text-4xl md:text-6xl font-black uppercase mt-4 tracking-tighter">
                            {t.faq.titlePart1} <span className="text-wtech-gold">{t.faq.titleHighlight}</span>
                        </motion.h2>
                    </motion.div>

                    <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-40px' }} variants={stagger} className="max-w-3xl mx-auto space-y-3">
                        {t.faq.items.map((faq, i) => (
                            <motion.div key={i} variants={v} custom={i}>
                                <FAQItem q={faq.q} a={faq.a} />
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════ */}
            {/* FOOTER                                      */}
            {/* ═══════════════════════════════════════════ */}
            <footer className="py-12 bg-[#050505] text-white border-t border-white/5">
                <div className="container mx-auto px-6 text-center">
                    <motion.img
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 0.5 }}
                        viewport={{ once: true }}
                        whileHover={shouldAnimate ? { opacity: 1 } : undefined}
                        transition={{ duration: 0.2 }}
                        src="/logo-wtech-branca.webp"
                        alt="W-Tech"
                        className="h-8 md:h-10 mx-auto mb-6"
                    />
                    <p className="text-gray-400 text-[10px] font-bold uppercase tracking-[0.4em] mb-2">W-Tech Brasil | Curso Online Suspensão para Pilotos Off-Road</p>
                    <p className="text-gray-500 text-[10px] uppercase tracking-widest">
                        Todos os direitos reservados © {new Date().getFullYear()}
                    </p>
                </div>
            </footer>
            </div>

            <div className="fixed bottom-0 inset-x-0 z-[90] border-t border-wtech-gold/20 bg-zinc-950/95 backdrop-blur-xl px-4 py-3 pb-[max(12px,env(safe-area-inset-bottom))]">
                <div className="mx-auto max-w-5xl flex items-center justify-between gap-4">
                    <div className="hidden sm:block">
                        <p className="text-[10px] uppercase tracking-[0.18em] text-wtech-gold">Curso Online de Suspensão</p>
                        <p className="text-sm font-semibold text-white mt-1">{localize("O próximo ajuste começa com você.")}</p>
                    </div>
                    <button
                        type="button"
                        data-offer-cta="sticky"
                        onClick={() => scrollTo('cta-final')}
                        className="w-full sm:w-auto min-h-12 flex items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-wtech-gold to-amber-600 px-6 py-3 text-xs sm:text-sm font-black uppercase tracking-wider text-black hover:brightness-110 transition"
                    >
                        Conhecer a formação <ArrowRight size={17} />
                    </button>
                </div>
            </div>



        </div >
    );
};

export default LPErgonomia;
