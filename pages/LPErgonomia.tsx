import React, { useState, useEffect, useRef, Suspense, lazy, useMemo } from 'react';
import { motion, useReducedMotion, useInView } from 'framer-motion';
import { Marquee } from '../components/ui/marquee';
import { GridVignetteBackground } from '../components/ui/vignette-grid-background';
import { captureTrackingParams, buildCheckoutUrl } from '../lib/tracking';
import { PUBLIC_BASE_URL } from '../lib/publicUrl';
import { getCoursePrice } from '../lib/coursePricing';
import { lpTranslations, LPLanguage } from '../lib/lpErgonomiaTranslations';
import { useLanguage } from '../context/LanguageContext';
import { trackEvent } from '../components/AnalyticsTracker';
import { WhatsAppLeadCapture } from '../components/WhatsAppLeadCapture';
import {
    getSuspensionFunnelCopy,
    readSuspensionFunnelContext,
    suspensionFunnelEventLabel,
} from '../lib/suspensionFunnel';
import { Globe, Flame } from 'lucide-react';
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
    Quote,
    Crosshair,
    Activity,
    Gauge,
    Move,
    CircleDot,
    Disc,
    BookOpen,
    Lock,
    Unlock,
    Sparkles,
    X,
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
const LPErgonomia: React.FC<{ forceFullContent?: boolean }> = ({ forceFullContent = false }) => {
    const { currentLang, setLanguage } = useLanguage();

    const handleLanguageChange = (lang: LPLanguage) => {
        setLanguage(lang);
    };

    const t = lpTranslations[currentLang] || lpTranslations['pt-PT'];
    const price = getCoursePrice(currentLang);
    const funnel = useMemo(() => readSuspensionFunnelContext('dark'), []);
    const funnelCopy = getSuspensionFunnelCopy(currentLang, funnel.angle);
    const funnelEventLabel = suspensionFunnelEventLabel(funnel);

    const { shouldAnimate } = useMotionConfig();
    const v = shouldAnimate ? fadeUp : fadeUpReduced;

    const KIWIFY_BASE = "https://pay.kiwify.com.br/19v4nIa";
    const [checkoutUrl, setCheckoutUrl] = useState(KIWIFY_BASE);

    useEffect(() => {
        // Persiste as UTMs/IDs de clique da campanha e monta o link com toda a atribuição.
        captureTrackingParams();
        setCheckoutUrl(buildCheckoutUrl(KIWIFY_BASE));
        trackEvent('Funil Suspensão', 'lp_view', funnelEventLabel);
    }, [funnelEventLabel]);

    const scrollTo = (id: string) => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    };

    /* ─── VSL SALES FUNNEL HOOKS ─── */
    const PITCH_DELAY_SECONDS = 150; // 2 minutos e 30 segundos
    const [videoPlaying, setVideoPlaying] = useState(false);
    const [videoActivated, setVideoActivated] = useState(false);
    const [isMuted, setIsMuted] = useState(true);
    const [videoProgress, setVideoProgress] = useState(0);
    const [videoCurrentTime, setVideoCurrentTime] = useState(0);
    const [isPitchRevealed, setIsPitchRevealed] = useState<boolean>(() => {
        if (forceFullContent) return true;
        if (typeof window === 'undefined') return false;
        const sp = new URLSearchParams(window.location.search);
        if (sp.get('reveal') === 'true' || sp.get('reveal') === '1' || sp.get('preview') === 'true') return true;
        return false; // Sempre obriga a passar pela VSL por padrão
    });

    const [showExitIntent, setShowExitIntent] = useState(false);
    const [exitIntentDismissed, setExitIntentDismissed] = useState(false);

    const videoRef = useRef<HTMLVideoElement>(null);
    const milestonesRef = useRef<Set<number>>(new Set());

    // CTA final: só monta o shader pesado quando a seção se aproxima da viewport
    const ctaRef = useRef<HTMLElement>(null);
    const ctaInView = useInView(ctaRef, { once: true, margin: '300px' });

    const forceRevealPitch = () => {
        setIsPitchRevealed(true);
        try {
            localStorage.setItem('wtech_vsl_pitch_revealed', 'true');
        } catch {}
        trackEvent('VSL', 'pitch_force_reveal', 'Curso Piloto');
    };

    const handlePlayVideo = () => {
        setVideoActivated(true);
        requestAnimationFrame(() => {
            if (videoRef.current) {
                videoRef.current.load();
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
        setVideoCurrentTime(current);
        const progressPercent = Math.floor((current / duration) * 100);
        setVideoProgress(progressPercent);

        if (!isPitchRevealed && (current >= PITCH_DELAY_SECONDS || current >= duration * 0.5)) {
            setIsPitchRevealed(true);
            try {
                localStorage.setItem('wtech_vsl_pitch_revealed', 'true');
            } catch {}
            trackEvent('VSL', 'pitch_reveal', 'Curso Piloto');
        }

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

    // Exit Intent Handler
    useEffect(() => {
        const handleMouseLeave = (e: MouseEvent) => {
            if (e.clientY <= 0 && !showExitIntent && !exitIntentDismissed) {
                setShowExitIntent(true);
                trackEvent('VSL', 'exit_intent_trigger', 'Curso Piloto');
            }
        };
        document.addEventListener('mouseleave', handleMouseLeave);
        return () => document.removeEventListener('mouseleave', handleMouseLeave);
    }, [showExitIntent, exitIntentDismissed]);

    const [timeLeft, setTimeLeft] = useState(7 * 60); // 7 minutes in seconds
    const [showBuyer, setShowBuyer] = useState(false);
    const [currentBuyer, setCurrentBuyer] = useState<{ name: string, role: string, city: string } | null>(null);

    // Countdown Timer logic
    useEffect(() => {
        if (timeLeft <= 0) return;
        const timer = setInterval(() => {
            setTimeLeft(prev => prev - 1);
        }, 1000);
        return () => clearInterval(timer);
    }, [timeLeft]);

    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;

    // Fake Buyers Notification Logic (Men, amateur pilots, and mechanics only)
    const buyers = [
        { name: 'Roberto S.', role: 'Piloto Amador', city: 'São Paulo, SP' },
        { name: 'Daniel M.', role: 'Mecânico', city: 'Belo Horizonte, MG' },
        { name: 'Thiago F.', role: 'Piloto de Trilha', city: 'Curitiba, PR' },
        { name: 'Lucas A.', role: 'Dono de Oficina', city: 'Goiânia, GO' },
        { name: 'Marcelo K.', role: 'Piloto de Enduro', city: 'Caxias do Sul, RS' },
        { name: 'Fábio J.', role: 'Mecânico Preparador', city: 'Ribeirão Preto, SP' },
    ];

    useEffect(() => {
        const interval = setInterval(() => {
            const buyersList = t.buyers || buyers;
            const randomBuyer = buyersList[Math.floor(Math.random() * buyersList.length)];
            setCurrentBuyer(randomBuyer);
            setShowBuyer(true);

            // Hide after 5 seconds
            setTimeout(() => {
                setShowBuyer(false);
            }, 5000);
        }, 18000); // 18 seconds between each popup

        return () => clearInterval(interval);
    }, []);

    /* ─── SEO: canonical próprio + Open Graph específicos do curso ─── */
    /* (SPA: Google executa JS e lê isto; para preview garantido no WhatsApp seria
        necessário SSR/prerender — mantemos as tags corretas mesmo assim.) */
    useEffect(() => {
        // Domínio canônico: site.w-techbrasil.com.br responde 308 e não pode ser
        // canonical nem og:image (ver lib/publicUrl.ts).
        const COURSE_URL = `${PUBLIC_BASE_URL}/curso-suspensao-piloto`;
        const OG_IMAGE = `${PUBLIC_BASE_URL}/hero-desktop-alex.webp`;
        const prevTitle = document.title;
        document.title = 'Curso de Suspensão Off-Road | Regule a Suspensão da Sua Moto — W-Tech';

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
        upsertMeta('meta[name="description"]', 'name', 'description', 'Curso online de regulagem de suspensão Off-Road: SAG, molas, cliques, óleo e ergonomia. Do zero ao acerto, com prática real na moto. Acesso por 12 meses + bônus.');
        upsertMeta('meta[property="og:title"]', 'property', 'og:title', 'Curso de Suspensão Off-Road — W-Tech Brasil');
        upsertMeta('meta[property="og:description"]', 'property', 'og:description', 'Aprenda a regular a suspensão da sua moto do zero: SAG, molas, cliques e ergonomia, com prática real. 11 módulos + bônus Paschoalin.');
        upsertMeta('meta[property="og:url"]', 'property', 'og:url', COURSE_URL);
        upsertMeta('meta[property="og:image"]', 'property', 'og:image', OG_IMAGE);
        upsertMeta('meta[property="twitter:title"]', 'property', 'twitter:title', 'Curso de Suspensão Off-Road — W-Tech Brasil');
        upsertMeta('meta[property="twitter:url"]', 'property', 'twitter:url', COURSE_URL);
        upsertMeta('meta[property="twitter:image"]', 'property', 'twitter:image', OG_IMAGE);

        return () => {
            document.title = prevTitle;
            setCanonical(prevCanonical || 'https://w-techbrasil.com.br/');
        };
    }, []);

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
            tag: 'Diferencial Competitivo',
            title: 'Dono de Oficina',
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
        'Ergonomia com Paschoalin (na moto real)',
        'Ajuste do guidão na prática',
        'Ajuste das manetes no campo',
        'Ajuste preciso do freio',
        'Ajuste e posicionamento do câmbio',
        'Check Down: verificação completa',
        'Desregulando a moto (para sentir a diferença)',
        'Moto regulada — Teste e comparação final',
    ];

    const benefits = [
        { icon: <ShieldCheck size={22} />, text: 'Menos dor e fadiga na pilotagem' },
        { icon: <Crosshair size={22} />, text: 'Mais controle e precisão nas manobras' },
        { icon: <Zap size={22} />, text: 'Mais confiança em qualquer terreno' },
        { icon: <Target size={22} />, text: 'Maior segurança para você e sua moto' },
        { icon: <Gauge size={22} />, text: 'Performance real sem forçar o corpo' },
        { icon: <Award size={22} />, text: 'Conhecimento técnico aplicável imediatamente' },
    ];

    const testimonials = [
        { name: 'Ricardo F.', role: 'Piloto Amador — SP', text: 'Depois do curso, finalmente ajustei os cliques e o SAG para o meu peso. Chega de tomar solavanco e ceder nas trilhas. Moto grudada no chão!' },
        { name: 'Marcos S.', role: 'Mecânico — MG', text: 'Comecei a oferecer regulagem e setup de suspensão na oficina. Ganhei novos clientes que antes iam buscar fora. O retorno foi imenso.' },
        { name: 'Tiago L.', role: 'Piloto de Enduro — PR', text: 'As ladeiras com cavas não são mais um problema. A dianteira da roda da moto agora me dá confiança nas curvas abertas e a tração é constante.' },
        { name: 'Juliana M.', role: 'Pilota Hard Enduro — RJ', text: 'Eu achava minhas molas macias demais, mas na verdade a hidráulica estava zerada. Entender esse casamento através do curso virou a chave da minha tocada.' },
    ];

    const stats = [
        { value: '3.000+', label: 'Profissionais treinados' },
        { value: '15+', label: 'Anos de experiência' },
        { value: '100%', label: 'Online e prático' },
        { value: '4.9★', label: 'Nota dos alunos' },
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
        <div className="min-h-screen bg-[#050505] text-white selection:bg-wtech-gold selection:text-black font-sans overflow-x-hidden">

            {/* ═══════════════════════════════════════════ */}
            {/* 0 · BANNER DE ESCASSEZ                     */}
            {/* ═══════════════════════════════════════════ */}
            {/* Mecanismo único de escassez: vagas do lote (sem misturar com "preço sobe") */}
            <div className="bg-gradient-to-r from-wtech-red to-red-900 text-white py-2.5 px-4 text-center sticky top-0 z-50 shadow-md">
                <div className="container mx-auto flex items-center justify-center gap-2 md:gap-3 text-xs md:text-sm font-bold uppercase tracking-widest">
                    <Zap size={16} className="text-yellow-300 animate-pulse shrink-0" />
                    <span>Últimas vagas do lote atual</span>
                </div>
            </div>

            {/* ── STICKY BARRA DE OFERTA E IDIOMA ── */}
            <div className="sticky top-0 z-[100] bg-black/90 backdrop-blur-md border-b border-wtech-gold/20 py-2.5 px-4 text-center">
                <div className="container mx-auto flex flex-wrap items-center justify-between gap-2 text-[10px] sm:text-xs font-bold uppercase tracking-widest text-wtech-gold">
                    <div className="flex items-center gap-2">
                        <Flame size={14} className="text-orange-500 animate-pulse" />
                        <span>{t.topBanner.badge}</span>
                        <span className="hidden md:inline text-white/30">•</span>
                        <span className="text-gray-300 hidden sm:inline">{t.topBanner.text}</span>
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
                                alt="Alex Crepaldi ajustando a suspensão de uma moto Off-Road"
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
                                        : 'APRESENTAÇÃO EXCLUSIVA PARA PILOTOS & MECÂNICOS'}
                            </span>
                        </motion.div>

                        {/* VSL Main Headline */}
                        <motion.h1 initial="hidden" animate="visible" variants={v} className="text-3xl sm:text-5xl lg:text-6xl font-black uppercase tracking-tighter leading-[0.95] mb-4 text-white drop-shadow-2xl max-w-3xl">
                            {funnel.personalized ? funnelCopy.titlePart1 : t.hero.titlePart1} <span className="text-transparent bg-clip-text bg-gradient-to-r from-wtech-gold via-yellow-400 to-amber-600">{funnel.personalized ? funnelCopy.titleHighlight : t.hero.titleHighlight}</span>
                        </motion.h1>

                        <motion.p initial="hidden" animate="visible" variants={v} className="text-sm sm:text-lg text-gray-300 mb-8 max-w-2xl font-medium">
                            {funnel.personalized ? funnelCopy.subtitle : `${t.hero.subtitle} — Assista ao vídeo curto abaixo para entender como eliminar o cansaço nos braços e dominar qualquer terreno.`}
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
                                            <VolumeX size={14} /> Ativar Som
                                        </button>
                                    ) : (
                                        <button onClick={() => setIsMuted(true)} className="flex items-center gap-1 text-[10px] text-gray-400 font-bold hover:underline cursor-pointer">
                                            <Volume2 size={14} className="text-wtech-gold" /> Áudio Ligado
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
                                    <span>SEU ÁUDIO ESTÁ DESLIGADO — CLIQUE PARA OUVIR</span>
                                </div>
                            )}

                            {/* Video Element */}
                            <video
                                ref={videoRef}
                                poster="/images/vsl-thumbnail.webp"
                                controls={videoPlaying}
                                playsInline
                                preload="metadata"
                                onTimeUpdate={handleTimeUpdate}
                                onEnded={() => {
                                    setVideoPlaying(false);
                                    setIsPitchRevealed(true);
                                }}
                                className="w-full h-full object-cover pt-8 sm:pt-0"
                                onPlay={() => setVideoPlaying(true)}
                                onPause={() => setVideoPlaying(false)}
                            >
                                {videoActivated && (
                                    <source src="https://niesvylxwfaffgnmdoql.supabase.co/storage/v1/object/public/site-assets/vsl-suspensao.mp4" type="video/mp4" />
                                )}
                                Seu navegador não suporta vídeos.
                            </video>

                            {/* Initial Play Overlay */}
                            {!videoPlaying && (
                                <div
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
                                        CLIQUE PARA INICIAR A VSL
                                    </span>
                                </div>
                            )}

                            {/* Progress bar at the bottom */}
                            <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-zinc-800 z-30">
                                <div
                                    className="h-full bg-gradient-to-r from-wtech-gold via-yellow-400 to-amber-500 transition-all duration-300"
                                    style={{ width: `${videoProgress}%` }}
                                />
                            </div>
                        </motion.div>

                        {/* PITCH REVEAL / OFFER SECTION BELOW VSL */}
                        <div className="w-full mt-6">
                            {isPitchRevealed ? (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.5 }}
                                    className="flex flex-col items-center gap-4 bg-gradient-to-b from-zinc-900/90 to-black p-6 sm:p-8 rounded-2xl border-2 border-wtech-gold/50 shadow-[0_0_50px_rgba(212,175,55,0.3)] backdrop-blur-xl"
                                >
                                    <div className="inline-flex items-center gap-2 text-wtech-gold font-extrabold text-xs uppercase tracking-widest bg-wtech-gold/10 px-4 py-1 rounded-full border border-wtech-gold/30">
                                        <Unlock size={14} /> PLANO PREMIUM · OFERTA ESPECIAL REVELADA
                                    </div>

                                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 text-center sm:text-left">
                                        <span className="text-xs uppercase tracking-widest text-gray-400 font-bold">Investimento com desconto:</span>
                                        <div className="text-3xl sm:text-4xl font-black text-wtech-gold tracking-tight">
                                            {t.offer.priceMain}
                                        </div>
                                        <span className="text-xs text-gray-400 font-semibold">(Acesso por 12 meses + Bônus)</span>
                                    </div>

                                    <a
                                        href={checkoutUrl}
                                        onClick={() => trackEvent('Funil Suspensão', 'checkout_click_hero', funnelEventLabel)}
                                        className="bg-gradient-to-r from-wtech-gold via-yellow-400 to-amber-600 text-black px-8 py-5 rounded-xl font-black text-base sm:text-xl uppercase tracking-[0.15em] transition-all shadow-[0_0_50px_rgba(212,175,55,0.5)] flex items-center justify-center gap-3 w-full max-w-lg hover:brightness-110 hover:scale-[1.02] active:scale-95 relative overflow-hidden group cursor-pointer"
                                    >
                                        <div className="absolute inset-0 w-full h-full bg-white/20 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                                        <span className="relative z-10 flex items-center gap-3">
                                            {t.hero.ctaPrimary} <ArrowRight strokeWidth={3} size={22} />
                                        </span>
                                    </a>

                                    <div className="flex flex-wrap items-center justify-center gap-4 text-gray-300 text-xs font-bold pt-2">
                                        <span className="inline-flex items-center gap-1.5"><ShieldCheck size={16} className="text-wtech-gold" /> Garantia Incondicional de 7 Dias</span>
                                        <span className="inline-flex items-center gap-1.5"><CheckCircle size={16} className="text-wtech-gold" /> Acesso Imediato</span>
                                        <span className="inline-flex items-center gap-1.5"><Award size={16} className="text-wtech-gold" /> Certificado Incluso</span>
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="flex flex-col items-center gap-3 p-5 rounded-xl bg-zinc-900/60 border border-white/10 text-center backdrop-blur-md"
                                >
                                    <div className="flex items-center gap-2 text-gray-300 text-xs sm:text-sm font-semibold">
                                        <Lock size={16} className="text-wtech-gold" />
                                        <span>A oferta exclusiva e a liberação de vagas serão apresentadas no vídeo acima.</span>
                                    </div>

                                    <button
                                        onClick={forceRevealPitch}
                                        className="text-[11px] text-gray-400 hover:text-wtech-gold underline transition-colors cursor-pointer"
                                    >
                                        Já assistiu? Clique aqui para ver a oferta imediatamente
                                    </button>
                                </motion.div>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════ */}
            {/* CONTEÚDO REVELADO APÓS A VSL (SEÇÕES 2 A 10) */}
            {/* ═══════════════════════════════════════════ */}
            {isPitchRevealed && (
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                >

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
                            <div className="inline-block text-[9px] font-black uppercase tracking-widest text-gray-400 border border-white/10 px-2 py-1 rounded mb-3 relative z-10">Diferencial Competitivo</div>
                            <h3 className="text-2xl lg:text-3xl font-black uppercase text-white mb-4 tracking-tight relative z-10">Dono de Oficina</h3>
                            <p className="text-gray-300 text-sm md:text-base leading-relaxed relative z-10">
                                Seus clientes pedem ajustes de cliques que a equipe não sabe resolver, <strong className="text-white">perdendo serviço e fidelidade</strong> para oficinas especializadas de Off-Road. Dê esse diferencial à sua equipe.
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
                            Quero Garantir Minha Vaga <ArrowRight strokeWidth={3} size={18} />
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
                            <motion.span variants={v} className="text-wtech-red font-black uppercase tracking-[0.3em] text-[10px] md:text-xs">Entenda o conceito</motion.span>
                            <motion.h2 variants={v} className="text-4xl md:text-6xl font-black uppercase mt-4 mb-8 tracking-tighter">
                                Qual o Segredo do <span className="text-wtech-gold">Acerto Perfeito</span>?
                            </motion.h2>
                            <motion.p variants={v} className="text-gray-300 text-lg leading-relaxed mb-4">
                                Não importa o quanto o motor da sua moto é forte se a suspensão não consegue colocar a potência no chão.
                            </motion.p>
                            <motion.p variants={v} className="text-gray-500 leading-relaxed mb-8">
                                Quando molas, óleo, cliques (retorno/compressão), SAG e pneus estão finamente ajustados para o <strong className="text-white">seu nível e modalidade Off-Road</strong>, tudo muda:
                                a moto não espalha, a tração é constante nas subidas e os impactos param de moer os seus braços e sua lombar.
                            </motion.p>
                            <motion.div
                                variants={v}
                                whileHover={shouldAnimate ? { scale: 1.02 } : undefined}
                                className="inline-flex items-center gap-3 bg-wtech-gold/10 border border-wtech-gold/20 px-5 py-3 rounded-lg transition-colors"
                            >
                                <Zap size={18} className="text-wtech-gold flex-shrink-0" />
                                <span className="text-sm font-bold text-wtech-gold">O acerto da suspensão muda a moto da água para o vinho. É investimento em performance e segurança.</span>
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
                        <motion.span variants={v} className="text-wtech-red font-black uppercase tracking-[0.3em] text-[10px] md:text-xs">Conteúdo Completo</motion.span>
                        <motion.h2 variants={v} className="text-4xl md:text-6xl font-black uppercase mt-4 mb-6 tracking-tighter">
                            11 Módulos +<br className="hidden md:block" /> <span className="text-wtech-gold">Bônus Exclusivo</span>
                        </motion.h2>
                        <motion.p variants={v} className="text-gray-400 max-w-2xl mx-auto text-base">
                            Tudo o que você precisa saber sobre suspensão Off-Road, do SAG ao clique, em aulas gravadas em estúdio com qualidade W-Tech.
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
                            <span className="text-purple-300 font-black uppercase tracking-widest text-[10px] md:text-xs">Módulo Bônus Exclusivo</span>
                        </motion.div>
                        <motion.h2 variants={v} className="text-4xl md:text-6xl font-black uppercase mt-2 mb-4 tracking-tighter">
                            Rafa <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-red-500">Paschoalin</span>
                        </motion.h2>
                        <motion.h3 variants={v} className="text-xl md:text-2xl font-black text-gray-300 mb-6 uppercase tracking-tight">
                            O Piloto Que Testou Tudo Na Prática — Para Você Ver A Diferença
                        </motion.h3>
                        <motion.p variants={v} className="text-gray-400 max-w-3xl mx-auto text-base leading-relaxed">
                            Não basta entender a teoria. Rafa Paschoalin — piloto de alta performance — pegou a moto, <strong className="text-white">desregulou e regulou cada componente ao vivo</strong>, para que você veja, na prática, o que muda com cada ajuste. Este é o tipo de conteúdo que você não encontra em nenhum outro lugar.
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
                                            Rafa pega a moto regulada, <strong className="text-white">desregula ela ao vivo</strong> — e você sente a diferença. Isso é o que transforma conhecimento em resultado real.
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
                            Seus <span className="text-wtech-gold">Instrutores</span>
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
                                        Referência nacional no acerto, preparação e revalvulação de <strong className="text-white">suspensões Off-Road</strong>. Mais de <strong className="text-white">3.000 mecânicos e pilotos capacitados</strong> pela escola técnica W-Tech em cursos online e presenciais.
                                    </p>
                                    <div className="p-4 bg-black/50 border-l-4 border-wtech-gold text-sm text-gray-400 rounded-r-lg">
                                        👉 Domínio técnico em suspensão: da simples manutenção à personalização profunda com shims, fluídos e kits de revalvulação.
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
                                        Piloto com vasta experiência em competições e provas de alto nível. Traz a <strong className="text-white">validação prática da pilotagem</strong> da teoria para as trilhas de performance e exigência máxima.
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
                            Quero Aprender com os Melhores <ArrowRight strokeWidth={3} size={18} />
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
                            Mais de <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#E6241D] to-orange-500">{price.bonusValue}</span> em Bônus
                        </motion.h2>
                        <motion.p variants={v} className="text-gray-400 text-lg max-w-2xl mx-auto leading-relaxed">
                            Ao garantir sua vaga agora, você leva ferramentas complementares que nossa própria equipe usa.
                        </motion.p>
                    </motion.div>

                    <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-40px' }} variants={stagger} className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-16">
                        {[
                            { title: 'Planilha de Regulagem de SAG', value: price.bonusItems[0], icon: <Activity size={24} /> },
                            { title: 'Planilha de Regulagem de PSI', value: price.bonusItems[1], icon: <Gauge size={24} /> },
                            { title: 'Comparativo de Óleos', value: price.bonusItems[2], icon: <Move size={24} /> },
                            { title: 'Comparativo de Molas', value: price.bonusItems[3], icon: <CheckCircle size={24} /> },
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
                                    <span className="text-gray-400 font-black text-lg tracking-tight line-through decoration-red-500/60 decoration-2">
                                        {bonus.value}
                                    </span>
                                    <span className="inline-flex items-center gap-1.5 bg-wtech-gold/15 border border-wtech-gold/40 text-wtech-gold font-black uppercase text-[11px] tracking-widest px-3 py-1.5 rounded-lg">
                                        <CheckCircle size={13} /> Incluso hoje
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
            <section className="py-24 bg-black">
                <div className="container mx-auto px-6">
                    <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }} variants={stagger} className="text-center mb-16">
                        <motion.span variants={v} className="text-wtech-gold font-black uppercase tracking-[0.3em] text-[10px] md:text-xs">Prova Social</motion.span>
                        <motion.h2 variants={v} className="text-4xl md:text-6xl font-black uppercase mt-4 tracking-tighter">
                            O Que Dizem <span className="text-wtech-gold">Nossos Alunos</span>
                        </motion.h2>
                    </motion.div>

                    {/* Stats */}
                    <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto mb-16">
                        {stats.map((s, i) => (
                            <motion.div
                                key={i}
                                variants={scaleIn}
                                whileHover={shouldAnimate ? { y: -4, boxShadow: '0 12px 32px rgba(0,0,0,0.3)' } : undefined}
                                className="text-center p-6 bg-zinc-900/50 border border-white/5 rounded-xl cursor-default"
                            >
                                <div className="text-3xl md:text-4xl font-black text-wtech-gold mb-1">{s.value}</div>
                                <div className="text-xs font-bold uppercase tracking-widest text-gray-500">{s.label}</div>
                            </motion.div>
                        ))}
                    </motion.div>

                    {/* Testimonials */}
                    <div className="w-full max-w-6xl mx-auto relative cursor-grab active:cursor-grabbing">
                        <Marquee speed={40} className="py-4">
                            {testimonials.map((item, i) => (
                                <div
                                    key={i}
                                    className="bg-zinc-900/40 backdrop-blur-sm border border-white/5 rounded-2xl p-8 relative w-[300px] md:w-[400px] shrink-0 hover:bg-zinc-800/50 transition-colors"
                                >
                                    <Quote size={32} className="text-wtech-gold/10 absolute top-6 right-6" />
                                    <div className="flex items-center gap-1 mb-4">
                                        {[...Array(5)].map((_, j) => (
                                            <Star key={j} size={14} className="text-wtech-gold fill-wtech-gold" />
                                        ))}
                                    </div>
                                    <p className="text-gray-300 text-sm leading-relaxed mb-6 italic whitespace-normal">"{item.text}"</p>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-wtech-gold/10 flex items-center justify-center text-wtech-gold font-black text-sm shrink-0">
                                            {item.name[0]}
                                        </div>
                                        <div className="whitespace-normal">
                                            <p className="font-bold text-white text-sm">{item.name}</p>
                                            <p className="text-gray-400 text-xs">{item.role}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </Marquee>
                    </div>

                    {/* CTA Intermediário 4 */}
                    <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="flex justify-center mt-12 pb-6">
                        <motion.button
                            onClick={() => scrollTo('cta-final')}
                            variants={v}
                            whileHover={shouldAnimate ? { scale: 1.02, boxShadow: '0 0 30px rgba(230,36,29,0.4)' } : undefined}
                            whileTap={shouldAnimate ? ctaTap : undefined}
                            className="bg-gradient-to-r from-[#ba1d18] to-[#E6241D] text-white px-8 py-4 rounded-xl font-black text-sm uppercase tracking-widest hover:from-[#d1221c] hover:to-[#ff2820] transition-all shadow-[0_0_20px_rgba(230,36,29,0.3)] flex items-center justify-center gap-3"
                        >
                            Quero Ser o Próximo <ArrowRight strokeWidth={3} size={18} />
                        </motion.button>
                    </motion.div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════ */}
            {/* 8 · OFERTA IRRECUSÁVEL E CTA FINAL         */}
            {/* ═══════════════════════════════════════════ */}
            <section ref={ctaRef} id="cta-final" className="py-24 md:py-32 relative overflow-hidden bg-black flex items-center justify-center min-h-[90vh]">
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
                            {t.offer.sub}
                        </p>

                        <div className="text-gray-400 font-bold uppercase text-xs md:text-sm tracking-[0.15em] mb-2 line-through decoration-red-500/70 decoration-2">
                            {t.offer.strike}
                        </div>

                        <div className="mb-2 flex flex-col items-center justify-center">
                            <span className="text-4xl md:text-6xl font-black text-white tracking-tighter drop-shadow-lg">{t.offer.priceMain}</span>
                        </div>
                        <div className="text-wtech-red/90 font-bold text-xs md:text-sm mb-2">
                            {t.offer.priceAlt} no Pix/Cartão
                        </div>
                        {price.chargedNotice && (
                            <div className="mb-8 max-w-md text-[11px] font-medium text-zinc-400">
                                {price.chargedNotice}
                            </div>
                        )}

                        {/* Real Timer */}
                        <div className="flex items-center justify-center gap-3 sm:gap-4 mb-8">
                            <div className="flex flex-col items-center">
                                <div className="bg-[#111] border border-[#E6241D]/30 rounded-xl w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center text-3xl font-black text-[#E6241D] shadow-[inset_0_0_15px_rgba(230,36,29,0.2)]">
                                    {String(minutes).padStart(2, '0')}
                                </div>
                                <span className="text-[9px] sm:text-[10px] text-gray-500 uppercase tracking-widest mt-2 font-bold">Minutos</span>
                            </div>
                            <span className="text-xl sm:text-2xl font-black text-[#E6241D]/50 -mt-6 animate-pulse">:</span>
                            <div className="flex flex-col items-center">
                                <div className="bg-[#111] border border-[#E6241D]/30 rounded-xl w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center text-3xl font-black text-[#E6241D] shadow-[inset_0_0_15px_rgba(230,36,29,0.2)]">
                                    {String(seconds).padStart(2, '0')}
                                </div>
                                <span className="text-[9px] sm:text-[10px] text-gray-500 uppercase tracking-widest mt-2 font-bold">Segundos</span>
                            </div>
                        </div>

                        <p className="text-gray-400 text-sm md:text-base mb-10 max-w-xl mx-auto leading-relaxed">
                            Ao finalizar o contador acima as matrículas da turma atual podem encerrar. Oportunidade com 1 Ano de acesso e bônus inclusos.
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
                                <span className="text-gray-300 text-xs sm:text-sm font-medium">Suporte Técnico na Plataforma</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <CheckCircle size={16} className="text-wtech-gold shrink-0" />
                                <span className="text-gray-300 text-xs sm:text-sm font-bold shadow-wtech-gold/20">BÔNUS: Planilha de Regulagem de SAG</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <CheckCircle size={16} className="text-wtech-gold shrink-0" />
                                <span className="text-gray-300 text-xs sm:text-sm font-bold shadow-wtech-gold/20">BÔNUS: Planilha de Regulagem de PSI</span>
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
                            <span className="relative z-10">Quero Regular Minha Suspensão Agora</span>
                        </motion.a>
                        <p className="text-gray-600 text-xs mb-8">Acesso imediato após a confirmação do pagamento</p>

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
                                Vagas sujeitas à disponibilidade
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
                                    Mas sua maior conquista não foi apenas o conhecimento técnico, foi a criação da <strong className="text-white">W-Tech Brasil</strong>, onde aplica um método de imersão de excelência e formação presencial sem igual.
                                </p>
                                <p>
                                    Hoje, como instrutor e especialista, Alex usa o método que desenvolveu trabalhando nos bastidores das corridas para forjar mecânicos autônomos e pilotos que buscam a mais pura precisão.
                                </p>
                            </div>

                            <motion.div variants={stagger} className="space-y-4 mb-12">
                                {[
                                    { icon: <Wrench size={18} />, text: 'Especialista em Suspensões' },
                                    { icon: <Users size={18} />, text: 'Instrutor de +3.000 Alunos' },
                                    { icon: <ShieldCheck size={18} />, text: 'Consultor Técnico W-Tech' },
                                    { icon: <Star size={18} />, text: 'Referência Nacional em Customização' },
                                ].map((item, i) => (
                                    <motion.div variants={v} key={i} className="flex items-center gap-4">
                                        <div className="text-wtech-gold">{item.icon}</div>
                                        <span className="font-semibold text-gray-300 text-sm md:text-[15px]">{item.text}</span>
                                    </motion.div>
                                ))}
                            </motion.div>

                            <motion.a
                                variants={v}
                                href="#comprar"
                                className="inline-flex items-center gap-2 text-white font-black text-[11px] md:text-xs tracking-[0.15em] uppercase transition-colors group"
                            >
                                <span className="group-hover:text-wtech-red transition-colors duration-300">Conheça a história</span>
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
            </motion.div>
            )}

            {/* ═══════════════════════════════════════════ */}
            {/* BUYERS POPUP FLOAT COMPONENT                 */}
            {/* ═══════════════════════════════════════════ */}
            <motion.div
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                animate={{ opacity: showBuyer ? 1 : 0, y: showBuyer ? 0 : 50, scale: showBuyer ? 1 : 0.9 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="fixed bottom-6 left-6 z-[100] bg-zinc-900 border border-wtech-gold/30 rounded-xl shadow-2xl p-4 flex items-center gap-4 max-w-sm pointer-events-none"
            >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#E6241D] to-orange-500 flex items-center justify-center text-white shrink-0 shadow-lg">
                    <CheckCircle size={20} strokeWidth={2.5} />
                </div>
                <div>
                    <p className="text-xs text-gray-400 mb-0.5">Nova inscrição confirmada</p>
                    <p className="text-sm font-bold text-white leading-tight">
                        {currentBuyer?.name} <span className="font-normal text-wtech-gold">({currentBuyer?.role})</span>
                    </p>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">de {currentBuyer?.city}</p>
                </div>
            </motion.div>

            {/* ═══════════════════════════════════════════ */}
            {/* STICKY BOTTOM CTA BAR (AFTER PITCH REVEAL)  */}
            {/* ═══════════════════════════════════════════ */}
            {isPitchRevealed && (
                <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className="fixed bottom-0 left-0 right-0 z-[90] bg-zinc-950/95 backdrop-blur-xl border-t border-wtech-gold/40 px-4 py-3 shadow-[0_-10px_30px_rgba(0,0,0,0.8)]"
                >
                    <div className="container mx-auto max-w-5xl flex items-center justify-between gap-4">
                        <div className="hidden sm:flex flex-col">
                            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Curso Online de Suspensão</span>
                            <span className="text-sm font-black text-white">Do Zero ao Acerto com Alex Crepaldi</span>
                        </div>

                        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                            <div className="flex flex-col text-left sm:text-right">
                                <span className="text-[10px] text-gray-400 font-bold uppercase">{t.offer.strike}</span>
                                <span className="text-lg sm:text-xl font-black text-wtech-gold leading-none">{t.offer.priceMain}</span>
                            </div>

                            <a
                                href={checkoutUrl}
                                onClick={() => trackEvent('Funil Suspensão', 'checkout_click_sticky', funnelEventLabel)}
                                className="bg-gradient-to-r from-wtech-gold to-amber-600 text-black px-5 py-3 rounded-lg font-black text-xs sm:text-sm uppercase tracking-wider shadow-lg hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 shrink-0 cursor-pointer"
                            >
                                <span>GARANTIR VAGA</span>
                                <ArrowRight size={16} strokeWidth={3} />
                            </a>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* ═══════════════════════════════════════════ */}
            {/* EXIT INTENT RETENTION MODAL                */}
            {/* ═══════════════════════════════════════════ */}
            {showExitIntent && (
                <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-zinc-900 border-2 border-wtech-gold/60 rounded-2xl p-6 sm:p-8 max-w-lg w-full relative shadow-[0_0_80px_rgba(212,175,55,0.4)] text-center"
                    >
                        <button
                            onClick={() => {
                                setShowExitIntent(false);
                                setExitIntentDismissed(true);
                            }}
                            className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-full bg-white/5 cursor-pointer"
                        >
                            <X size={20} />
                        </button>

                        <div className="w-14 h-14 bg-wtech-gold/20 border border-wtech-gold rounded-full flex items-center justify-center text-wtech-gold mx-auto mb-4 animate-pulse">
                            <Sparkles size={28} />
                        </div>

                        <h3 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight mb-2">
                            ESPERA! NÃO SAIA SEM VER ISSO
                        </h3>

                        <p className="text-gray-300 text-sm mb-6 leading-relaxed">
                            Você quer mesmo continuar andando com a moto dura, braços cansados e sem tração nas trilhas e pistas?
                        </p>

                        <div className="flex flex-col gap-3">
                            <button
                                onClick={() => {
                                    setShowExitIntent(false);
                                    setExitIntentDismissed(true);
                                    forceRevealPitch();
                                    scrollTo('cta-final');
                                }}
                                className="w-full bg-gradient-to-r from-wtech-gold to-amber-600 text-black py-3.5 px-4 rounded-xl font-black text-xs sm:text-sm uppercase tracking-wider shadow-lg hover:brightness-110 cursor-pointer"
                            >
                                QUERO VER A OFERTA AGORA
                            </button>

                            <a
                                href="/quiz-suspensao"
                                onClick={() => trackEvent('VSL', 'exit_intent_quiz_click', 'Curso Piloto')}
                                className="w-full bg-zinc-800 hover:bg-zinc-700 text-gray-200 border border-white/10 py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
                            >
                                Fazer Quiz de Diagnóstico da Minha Moto
                            </a>
                        </div>
                    </motion.div>
                </div>
            )}

            <WhatsAppLeadCapture pageLabel="Landing completa escura · Curso Online de Suspensão" floating />

        </div >
    );
};

export default LPErgonomia;
