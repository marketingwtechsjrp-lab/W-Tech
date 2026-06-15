import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { motion, useReducedMotion, useInView } from 'framer-motion';
import { Marquee } from '../components/ui/marquee';
import { GridVignetteBackground } from '../components/ui/vignette-grid-background';
import { captureTrackingParams, buildCheckoutUrl } from '../lib/tracking';
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
// Depoimentos reais em vídeo (YouTube Shorts) — substituem os depoimentos de texto
const SHORT_TESTIMONIALS = [
    '_K7qfx_hC-k',
    'mYoN-gxpnq0',
    'rY3M9H6qE4M',
    '8TaJ_e8o14Q',
    'w12XvhV3RzY',
    'PWwnU8Fm0TM',
    'jH9fOJHQfls',
    'GM1SYm02Haw'
];

// Fachada leve: mostra a thumbnail do YouTube e só carrega o iframe ao clicar (performance)
const YoutubeShort: React.FC<{ id: string }> = ({ id }) => {
    const [playing, setPlaying] = useState(false);
    return (
        <div className="relative aspect-[9/16] w-full overflow-hidden rounded-2xl border border-white/10 bg-black shadow-xl">
            {playing ? (
                <iframe
                    src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&playsinline=1&rel=0`}
                    title="Depoimento de aluno W-Tech"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="absolute inset-0 h-full w-full"
                />
            ) : (
                <button
                    type="button"
                    onClick={() => setPlaying(true)}
                    aria-label="Assistir depoimento"
                    className="group absolute inset-0 h-full w-full"
                >
                    <img
                        src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`}
                        alt="Depoimento de aluno do curso de suspensão W-Tech"
                        loading="lazy"
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/30 transition-colors group-hover:bg-black/20" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-wtech-gold shadow-[0_0_40px_rgba(212,175,55,0.5)] transition-transform group-hover:scale-110">
                            <Play fill="black" size={26} className="ml-1 text-black" />
                        </div>
                    </div>
                    <div className="absolute bottom-3 left-3 flex items-center gap-1">
                        {[...Array(5)].map((_, j) => (
                            <Star key={j} size={12} className="text-wtech-gold fill-wtech-gold drop-shadow" />
                        ))}
                    </div>
                </button>
            )}
        </div>
    );
};

const LPErgonomia2: React.FC = () => {
    const { shouldAnimate } = useMotionConfig();
    const v = shouldAnimate ? fadeUp : fadeUpReduced;

    const KIWIFY_BASE = "https://pay.kiwify.com.br/5zdsgcS";
    const [checkoutUrl, setCheckoutUrl] = useState(KIWIFY_BASE);

    useEffect(() => {
        // Persiste as UTMs/IDs de clique da campanha e monta o link com toda a atribuição.
        captureTrackingParams();
        setCheckoutUrl(buildCheckoutUrl(KIWIFY_BASE));
    }, []);

    const scrollTo = (id: string) => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    };

    /* ─── SALES HOOKS HOOKS ─── */
    const [videoPlaying, setVideoPlaying] = useState(false);
    const [videoActivated, setVideoActivated] = useState(false); // o MP4 só é anexado após o clique
    const videoRef = useRef<HTMLVideoElement>(null);
    const [europeVideoPlaying, setEuropeVideoPlaying] = useState(false);

    // CTA final: só monta o shader pesado quando a seção se aproxima da viewport
    const ctaRef = useRef<HTMLElement>(null);
    const ctaInView = useInView(ctaRef, { once: true, margin: '300px' });

    const handlePlayVideo = () => {
        setVideoActivated(true);
        // aguarda o <source> ser injetado no DOM antes de carregar/dar play
        requestAnimationFrame(() => {
            if (videoRef.current) {
                videoRef.current.load();
                videoRef.current.play().catch(() => { });
                setVideoPlaying(true);
            }
        });
    };

    const [showBuyer, setShowBuyer] = useState(false);
    const [currentBuyer, setCurrentBuyer] = useState<{ name: string, role: string, city: string } | null>(null);

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
            const randomBuyer = buyers[Math.floor(Math.random() * buyers.length)];
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
        const COURSE_URL = 'https://site.w-techbrasil.com.br/curso-suspensao-piloto';
        const OG_IMAGE = 'https://site.w-techbrasil.com.br/hero-desktop-alex.webp';
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

    const ergoBlocks = [
        { icon: <CircleDot size={24} />, title: 'O SAG', desc: 'A geometria sagrada da moto. O ponto de partida obrigatório antes de encostar na chave de fenda.' },
        { icon: <Activity size={24} />, title: 'Molas', desc: 'O equilíbrio exato entre absorção e retorno (os famosos "cliques") para cada tipo de peso e nível.' },
        { icon: <Move size={24} />, title: 'Ergonomia (Cockpit)', desc: 'Como você se integra à suspensão ajustada: altura e ângulo de guidão e pedaleira.' },
        { icon: <Disc size={24} />, title: 'Pneus e Tração', desc: 'A escolha correta e a calibragem - a ponte final entre o chão e a sua válvula de suspensão.' },
    ];

    const modules = [
        { num: '01', title: 'Boas-Vindas ao Curso', desc: 'Visão geral, método e como aproveitar ao máximo cada módulo', aulas: 4 },
        { num: '02', title: 'Ergonomia — O "Cockpit" do Piloto', desc: 'Guidão, manetes, pedal de freio e câmbio: o seu encaixe correto na moto', aulas: 5 },
        { num: '03', title: 'Equilíbrio', desc: 'Verifique se sua moto está realmente equilibrada antes de qualquer acerto', aulas: 1 },
        { num: '04', title: 'Molas e suas Particularidades', desc: 'Rigidez, taxa de mola e como escolher a certa para o seu peso', aulas: 1 },
        { num: '05', title: 'O SAG — A Geometria Sagrada', desc: 'Medição e ajuste prático do SAG estático e dinâmico, do zero', aulas: 2 },
        { num: '06', title: 'Óleo e Viscosidades', desc: 'Como o fluido controla a dinâmica da suspensão e quando substituir', aulas: 1 },
        { num: '07', title: 'Desmistificando os "Cliques"', desc: 'Compressão, retorno: o que cada clique faz e como ajustar na prática', aulas: 2 },
        { num: '08', title: 'Suspensão do Eixo Dianteiro', desc: 'As bengalas, o ritual de instalação da roda e por que a frente dura te machuca', aulas: 2 },
        { num: '09', title: 'Pneus e Tração', desc: 'Pressão correta, regulagem de PSI e como o pneu determina a tração', aulas: 2 },
        { num: '10', title: 'Relação e Corrente', desc: 'Ajustes de relação que impactam diretamente a entrega de potência', aulas: 2 },
        { num: '11', title: 'Kits e Ferramentas', desc: 'O setup ideal da sua bancada para regular suspensão como um profissional', aulas: 1 },
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
        { q: 'Tem garantia?', a: 'Sim. Garantia incondicional de 30 dias. Se não gostar, devolvemos 100% do seu investimento.' },
    ];

    return (
        <div className="min-h-screen bg-[#050505] text-white selection:bg-wtech-gold selection:text-black font-sans overflow-x-hidden pb-20 lg:pb-0">

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

            {/* ═══════════════════════════════════════════ */}
            {/* 1 · HERO COMPLETO COM VSL                  */}
            {/* ═══════════════════════════════════════════ */}
            <section className="relative min-h-[95vh] flex items-center justify-center overflow-hidden pt-12 md:pt-0">
                {/* BG — imagem LCP real (detectável pelo browser) com prioridade alta. */}
                {/* Sem lazy-load: é o maior elemento above-the-fold. */}
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
                                className="absolute inset-0 w-full h-full object-cover object-top lg:object-center"
                            />
                        </picture>
                    </motion.div>
                    <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-black/80 to-black/60 z-10" />
                    {/* Overlay reforçado — mais forte no mobile p/ contraste do título */}
                    <div className="absolute inset-0 bg-black/60 md:bg-black/40 z-10" />
                    {/* Reforço lateral esquerdo no mobile (onde fica o texto) */}
                    <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-transparent md:hidden z-10" />
                </div>

                <div className="container mx-auto px-6 relative z-20 pt-10 pb-20">
                    <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center max-w-7xl mx-auto">

                        {/* Text (Left Column) */}
                        <motion.div initial="hidden" animate="visible" variants={stagger} className="order-1 lg:col-start-1 lg:row-start-1">
                            <motion.div variants={v} className="inline-flex items-center gap-2 border border-wtech-gold/30 bg-wtech-gold/10 backdrop-blur-md px-4 py-1.5 rounded-full mb-6 max-w-fit">
                                <Zap size={14} className="text-wtech-gold animate-pulse" />
                                <span className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-wtech-gold">Curso Online — W-Tech</span>
                            </motion.div>

                            <motion.h1 variants={v} className="text-4xl md:text-5xl lg:text-6xl font-black uppercase tracking-tighter leading-[0.9] mb-6 drop-shadow-2xl">
                                Regule a <span className="text-transparent bg-clip-text bg-gradient-to-r from-wtech-gold via-yellow-400 to-amber-600 drop-shadow-none">Suspensão<br className="hidden lg:block" /></span><br className="lg:hidden" />
                                <span className="text-3xl md:text-4xl lg:text-5xl">da Sua Moto. Do Zero.</span>
                            </motion.h1>

                            <motion.p variants={v} className="text-base md:text-xl text-gray-200 leading-relaxed mb-6 max-w-lg font-bold">
                                O único curso que transforma piloto, trilheiro, mecânico e dono de oficina em especialista de suspensão Off-Road — <strong className="text-wtech-gold">com prática real, na moto real.</strong>
                            </motion.p>

                            <motion.p variants={v} className="text-sm text-gray-400 mb-6 max-w-lg border-l-2 border-wtech-gold pl-4 hidden md:block">
                                Se a sua moto quica, espalha nas curvas e cansa os seus braços antes da hora, o problema não é você — é a suspensão fora do ponto. Aqui você aprende a acertar do zero: SAG, molas, óleo, cliques e ergonomia.
                            </motion.p>

                            {/* Âncora de preço logo no topo (não só no rodapé) */}
                            <motion.div variants={v} className="flex flex-wrap items-center gap-3">
                                <div className="inline-flex items-center gap-2 bg-black/40 border border-wtech-gold/30 rounded-xl px-4 py-2.5 backdrop-blur-md">
                                    <span className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">A partir de</span>
                                    <span className="text-wtech-gold font-black text-lg leading-none tracking-tight">10x R$ 32,00</span>
                                </div>
                                <div className="inline-flex items-center gap-2 text-gray-200 text-xs font-semibold">
                                    <ShieldCheck size={15} className="text-wtech-gold" /> Garantia de 30 dias
                                </div>
                            </motion.div>
                        </motion.div>

                        <motion.div initial="hidden" animate="visible" variants={stagger} className="flex flex-col gap-6 order-2 lg:col-start-2 lg:row-start-1 lg:row-span-2">
                            <motion.div
                                variants={v}
                                className="relative w-full aspect-video rounded-2xl overflow-hidden border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.6)] bg-black group cursor-pointer"
                                onClick={handlePlayVideo}
                            >
                                <video
                                    ref={videoRef}
                                    poster="/images/vsl-thumbnail.webp"
                                    controls={videoPlaying}
                                    playsInline
                                    preload="none"
                                    className="w-full h-full object-cover"
                                    onPlay={() => setVideoPlaying(true)}
                                    onPause={() => setVideoPlaying(false)}
                                >
                                    {/* Fonte anexada só após o clique → evita request falho no carregamento da página */}
                                    {videoActivated && (
                                        <source src="https://niesvylxwfaffgnmdoql.supabase.co/storage/v1/object/public/site-assets/vsl-suspensao.mp4" type="video/mp4" />
                                    )}
                                    Seu navegador não suporta vídeos.
                                </video>

                                {!videoPlaying && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/20 transition-colors z-20">
                                        <div className="relative">
                                            {/* Pulse Rings */}
                                            <div className="absolute inset-0 bg-wtech-gold/40 rounded-full animate-ping scale-150 opacity-20" />
                                            <div className="absolute inset-0 bg-wtech-gold/30 rounded-full animate-pulse scale-125 opacity-40" />
                                            
                                            {/* Play Button */}
                                            <div className="relative w-20 h-20 bg-wtech-gold rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(212,175,55,0.6)] group-hover:scale-110 transition-transform">
                                                <Play fill="black" size={32} className="text-black ml-1" />
                                            </div>
                                        </div>
                                    </div>
                                )}
                                
                                <div className="absolute inset-0 pointer-events-none border-2 border-wtech-gold/20 rounded-2xl z-10" />
                            </motion.div>

                            <motion.button
                                onClick={() => scrollTo('cta-final')}
                                variants={v}
                                whileHover={shouldAnimate ? { scale: 1.02, boxShadow: '0 0 30px rgba(212,175,55,0.4)' } : undefined}
                                whileTap={shouldAnimate ? ctaTap : undefined}
                                className="cta-attention cta-gold bg-gradient-to-r from-wtech-gold to-yellow-600 text-black px-8 py-5 rounded-xl font-black text-sm md:text-base uppercase tracking-[0.15em] transition-all shadow-[0_0_40px_rgba(212,175,55,0.2)] flex items-center justify-center gap-3 w-full hover:brightness-110 relative overflow-hidden group"
                            >
                                <div className="absolute inset-0 w-full h-full bg-white/20 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                                <span className="relative z-10 flex items-center gap-3">
                                    Quero Regular Minha Suspensão Agora <ArrowRight strokeWidth={3} size={20} />
                                </span>
                            </motion.button>
                        </motion.div>

                        {/* Secondary Button (Below Text on Desktop, Bottom on Mobile) */}
                        <motion.div initial="hidden" animate="visible" variants={stagger} className="order-3 lg:col-start-1 lg:row-start-2 lg:-mt-4">
                            <motion.div variants={v}>
                                <motion.button
                                    onClick={() => scrollTo('modulos')}
                                    whileHover={shouldAnimate ? { scale: 1.02 } : undefined}
                                    whileTap={shouldAnimate ? ctaTap : undefined}
                                    className="border border-white/20 text-white px-8 py-4 rounded-xl font-bold text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-2 w-full hover:border-wtech-gold/50 hover:text-wtech-gold"
                                >
                                    Ver o Conteúdo <ChevronDown size={16} />
                                </motion.button>
                            </motion.div>
                        </motion.div>
                    </div>
                </div>

                {/* Scroll indicator */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: shouldAnimate ? 1 : 0, duration: 0.5 }}
                    className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2"
                >
                    <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-600">Role</span>
                    <div className="w-5 h-8 border-2 border-gray-600 rounded-full flex items-start justify-center p-1 overflow-hidden">
                        <div className="w-1 h-2 bg-wtech-gold rounded-full animate-scrolldown" />
                    </div>
                </motion.div>
            </section >

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

                    {/* Depoimentos em vídeo (reais) */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 max-w-5xl mx-auto">
                        {SHORT_TESTIMONIALS.map((vid) => (
                            <YoutubeShort key={vid} id={vid} />
                        ))}
                    </div>

                    {/* CTA Intermediário 4 */}
                    <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="flex justify-center mt-12 pb-6">
                        <motion.button
                            onClick={() => scrollTo('cta-final')}
                            variants={v}
                            whileHover={shouldAnimate ? { scale: 1.02, boxShadow: '0 0 30px rgba(230,36,29,0.4)' } : undefined}
                            whileTap={shouldAnimate ? ctaTap : undefined}
                            className="cta-attention cta-red bg-gradient-to-r from-[#ba1d18] to-[#E6241D] text-white px-8 py-4 rounded-xl font-black text-sm uppercase tracking-widest hover:from-[#d1221c] hover:to-[#ff2820] transition-all shadow-[0_0_20px_rgba(230,36,29,0.3)] flex items-center justify-center gap-3"
                        >
                            Quero Ser o Próximo <ArrowRight strokeWidth={3} size={18} />
                        </motion.button>
                    </motion.div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════ */}
            {/* NEW · W-TECH INTERNACIONAL (EUROPA)        */}
            {/* ═══════════════════════════════════════════ */}
            <section className="py-24 bg-[#0a0a0c] relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-wtech-gold/30 to-transparent" />
                <div className="absolute -left-[10%] top-[20%] w-[45%] h-[60%] bg-wtech-gold/5 blur-[120px] rounded-full pointer-events-none" />
                <div className="absolute -right-[15%] bottom-[10%] w-[50%] h-[70%] bg-wtech-red/5 blur-[150px] rounded-full pointer-events-none" />
                
                <div className="container mx-auto px-6 relative z-10">
                    <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center max-w-6xl mx-auto">
                        
                        {/* Text Content */}
                        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }} variants={stagger}>
                            <motion.div variants={v} className="inline-flex items-center gap-2 border border-wtech-gold/20 bg-wtech-gold/5 px-4 py-1.5 rounded-full mb-6">
                                <Zap size={14} className="text-wtech-gold" />
                                <span className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-wtech-gold">Autoridade Sem Fronteiras</span>
                            </motion.div>
                            
                            <motion.h2 variants={v} className="text-3xl md:text-5xl font-black uppercase tracking-tighter leading-none mb-6">
                                W-Tech no Mundo:<br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-wtech-gold to-yellow-500">Referência em Suspensões</span>
                            </motion.h2>
                            
                            <motion.div variants={v} className="space-y-4 text-gray-300 text-sm md:text-base leading-relaxed mb-8">
                                <p>
                                    A W-Tech é a maior autoridade nacional e uma referência internacional no mercado de suspensões de alta performance. Nosso compromisso com a excelência técnica nos levou a cruzar oceanos.
                                </p>
                                <p>
                                    Em <strong className="text-white">Abril de 2026</strong>, realizamos uma imersão histórica na <strong className="text-white">Europa</strong>, ministrando treinamentos de alta performance e aplicando nosso método consagrado a pilotos e preparadores internacionais.
                                </p>
                                <p>
                                    Quando você escolhe a W-Tech, você aprende com quem dita os padrões do mercado. Nossa metodologia é comprovada nas pistas mais exigentes e agora está disponível na tela do seu dispositivo.
                                </p>
                            </motion.div>

                            <motion.div variants={stagger} className="grid grid-cols-2 gap-4">
                                <motion.div variants={v} className="p-4 bg-white/5 border border-white/10 rounded-2xl">
                                    <div className="text-2xl md:text-3xl font-black text-wtech-gold mb-1">EUROPA 2026</div>
                                    <div className="text-[10px] uppercase font-bold tracking-widest text-gray-400">Expansão Internacional</div>
                                </motion.div>
                                <motion.div variants={v} className="p-4 bg-white/5 border border-white/10 rounded-2xl">
                                    <div className="text-2xl md:text-3xl font-black text-wtech-gold mb-1">+3.000</div>
                                    <div className="text-[10px] uppercase font-bold tracking-widest text-gray-400">Profissionais Formados</div>
                                </motion.div>
                            </motion.div>
                        </motion.div>

                        {/* Video Content */}
                        <motion.div 
                            initial="hidden" 
                            whileInView="visible" 
                            viewport={{ once: true, margin: '-40px' }} 
                            variants={scaleIn}
                            className="flex flex-col gap-4"
                        >
                            <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] bg-black group">
                                {europeVideoPlaying ? (
                                    <iframe
                                        src="https://www.youtube.com/embed/ZSH_xwj0GH4?autoplay=1&rel=0"
                                        title="W-Tech na Europa — Treinamento de Suspensão"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                        className="absolute inset-0 h-full w-full border-0"
                                    />
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => setEuropeVideoPlaying(true)}
                                        className="absolute inset-0 w-full h-full text-left group cursor-pointer block"
                                    >
                                        <img
                                            src="https://img.youtube.com/vi/ZSH_xwj0GH4/maxresdefault.jpg"
                                            onError={(e) => {
                                                e.currentTarget.src = "https://img.youtube.com/vi/ZSH_xwj0GH4/hqdefault.jpg";
                                            }}
                                            alt="W-Tech na Europa — Treinamento de Suspensão"
                                            loading="lazy"
                                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                        />
                                        <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors" />
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="relative">
                                                <div className="absolute inset-0 bg-wtech-gold/40 rounded-full animate-ping scale-150 opacity-20" />
                                                <div className="absolute inset-0 bg-wtech-gold/30 rounded-full animate-pulse scale-125 opacity-40" />
                                                <div className="relative w-16 h-16 bg-wtech-gold rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(212,175,55,0.5)] group-hover:scale-110 transition-transform duration-200">
                                                    <Play fill="black" size={24} className="text-black ml-1" />
                                                </div>
                                            </div>
                                        </div>
                                    </button>
                                )}
                                <div className="absolute inset-0 pointer-events-none border border-wtech-gold/20 rounded-2xl" />
                            </div>
                            <p className="text-center text-xs text-gray-500 italic">
                                Registro oficial do curso ministrado na Europa em Abril de 2026.
                            </p>
                        </motion.div>

                    </div>
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
                        className="cta-attention cta-red bg-gradient-to-r from-[#ba1d18] to-[#E6241D] text-white px-8 py-4 rounded-xl font-black text-sm uppercase tracking-widest hover:from-[#d1221c] hover:to-[#ff2820] transition-all shadow-[0_0_20px_rgba(230,36,29,0.3)] flex items-center justify-center gap-3"
                    >
                        Quero Acesso a Todo Este Conteúdo <ArrowRight strokeWidth={3} size={18} />
                    </motion.button>
                </motion.div>
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
                            className="cta-attention cta-red bg-gradient-to-r from-[#ba1d18] to-[#E6241D] text-white px-8 py-4 rounded-xl font-black text-sm uppercase tracking-widest hover:from-[#d1221c] hover:to-[#ff2820] transition-all shadow-[0_0_20px_rgba(230,36,29,0.3)] flex items-center justify-center gap-3"
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
                            Mais de <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#E6241D] to-orange-500">R$ 997,00</span> em Bônus
                        </motion.h2>
                        <motion.p variants={v} className="text-gray-400 text-lg max-w-2xl mx-auto leading-relaxed">
                            Ao garantir sua vaga agora, você leva ferramentas complementares que nossa própria equipe usa.
                        </motion.p>
                    </motion.div>

                    <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-40px' }} variants={stagger} className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-16">
                        {[
                            { title: 'Planilha de Regulagem de SAG', value: '397,00', icon: <Activity size={24} /> },
                            { title: 'Planilha de Regulagem de PSI', value: '257,00', icon: <Gauge size={24} /> },
                            { title: 'Comparativo de Óleos', value: '197,00', icon: <Move size={24} /> },
                            { title: 'Comparativo de Molas', value: '146,00', icon: <CheckCircle size={24} /> },
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
                                        R$ {bonus.value}
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
                            Lançamento — Valor Especial por Tempo Limitado
                        </span>

                        <h2 className="text-2xl md:text-4xl font-black text-white mb-3 tracking-tight">
                            Garanta Sua Vaga <span className="text-wtech-gold">Agora</span>
                        </h2>
                        <p className="text-gray-400 text-sm mb-8 max-w-lg mx-auto">
                            11 módulos técnicos + Módulo Bônus com Paschoalin + Planilhas de Regulagem. Tudo por um investimento de lançamento.
                        </p>

                        <div className="text-gray-400 font-bold uppercase text-xs md:text-sm tracking-[0.15em] mb-6 line-through decoration-red-500/70 decoration-2">
                            De R$ 997,00 por apenas
                        </div>

                        <div className="mb-10 flex flex-col sm:flex-row items-stretch justify-center gap-4 md:gap-6 max-w-2xl mx-auto">
                            <div className="bg-zinc-950/60 border border-white/5 rounded-2xl p-6 flex-1 flex flex-col justify-center items-center">
                                <span className="text-[10px] uppercase font-bold tracking-widest text-gray-500 block mb-1">Parcelado</span>
                                <span className="text-3xl md:text-4xl font-black text-white tracking-tighter drop-shadow-lg block">10x R$ 32,00</span>
                                <span className="text-xs text-gray-500 block mt-2">no cartão de crédito</span>
                            </div>
                            <div className="bg-wtech-gold/15 border border-wtech-gold/40 rounded-2xl p-6 flex-1 flex flex-col justify-center items-center relative shadow-[0_0_30px_rgba(212,175,55,0.1)]">
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-wtech-gold text-black text-[9px] font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-md">
                                    Melhor Opção à Vista
                                </div>
                                <span className="text-[10px] uppercase font-bold tracking-widest text-wtech-gold block mb-1">Pagamento no PIX/Cartão</span>
                                <span className="text-4xl md:text-5xl font-black text-wtech-gold tracking-tighter drop-shadow-lg block">R$ 267,00</span>
                                <span className="text-xs text-wtech-gold/80 block mt-2">economize R$ 53,00 pagando à vista</span>
                            </div>
                        </div>

                        <p className="text-gray-400 text-sm md:text-base mb-10 max-w-xl mx-auto leading-relaxed">
                            Oportunidade por tempo limitado com 1 Ano de acesso completo e todos os bônus inclusos.
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
                            <span className="text-wtech-gold font-black uppercase text-[11px] sm:text-xs tracking-widest">Garantia Incondicional de 30 Dias</span>
                        </div>

                        <motion.a
                            href={checkoutUrl}
                            id="kiwify-checkout-btn-lp-ergonomia-v2"
                            whileHover={shouldAnimate ? { scale: 1.02, boxShadow: '0 0 40px rgba(230,36,29,0.5)' } : undefined}
                            whileTap={shouldAnimate ? { scale: 0.98 } : undefined}
                            className="cta-attention cta-red w-full max-w-xl mx-auto bg-gradient-to-r from-[#ba1d18] to-[#E6241D] hover:from-[#d1221c] hover:to-[#ff2820] text-white px-8 py-5 sm:py-6 rounded-2xl font-black text-sm md:text-[15px] uppercase tracking-widest transition-all mb-4 shadow-xl relative overflow-hidden group flex justify-center items-center"
                        >
                            <div className="absolute inset-0 w-full h-full bg-white/10 -translate-x-full group-hover:translate-x-0 transition-transform duration-500" />
                            <span className="relative z-10">Quero Regular Minha Suspensão Agora</span>
                        </motion.a>
                        <p className="text-gray-600 text-xs mb-8">Acesso imediato após a confirmação do pagamento</p>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 mt-10 pt-8 border-t border-white/5">
                            <div className="flex items-center gap-2 text-gray-500 text-[11px] font-semibold uppercase tracking-wider">
                                <ShieldCheck size={16} className="text-gray-400" /> Garantia Incondicional de 30 Dias
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
            {/* 10 · FAQ                                     */}
            {/* ═══════════════════════════════════════════ */}
            <section className="py-24 bg-zinc-950 border-t border-white/5">
                <div className="container mx-auto px-6">
                    <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }} variants={stagger} className="text-center mb-16">
                        <motion.span variants={v} className="text-wtech-gold font-black uppercase tracking-[0.3em] text-[10px] md:text-xs">Dúvidas Frequentes</motion.span>
                        <motion.h2 variants={v} className="text-4xl md:text-6xl font-black uppercase mt-4 tracking-tighter">
                            Perguntas <span className="text-wtech-gold">Frequentes</span>
                        </motion.h2>
                    </motion.div>

                    <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-40px' }} variants={stagger} className="max-w-3xl mx-auto space-y-3">
                        {faqData.map((faq, i) => (
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

            {/* ═══════════════════════════════════════════ */}
            {/* BUYERS POPUP FLOAT COMPONENT                 */}
            {/* ═══════════════════════════════════════════ */}
            <motion.div
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                animate={{ opacity: showBuyer ? 1 : 0, y: showBuyer ? 0 : 50, scale: showBuyer ? 1 : 0.9 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="fixed bottom-28 left-4 sm:bottom-6 sm:left-6 z-[80] bg-zinc-900 border border-wtech-gold/30 rounded-xl shadow-2xl p-4 flex items-center gap-4 max-w-[72vw] sm:max-w-sm pointer-events-none"
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
            {/* WHATSAPP FLUTUANTE                          */}
            {/* ═══════════════════════════════════════════ */}
            <a
                href="https://wa.me/5512982976468?text=Ol%C3%A1%21%20Vim%20da%20p%C3%A1gina%20do%20Curso%20Online%20de%20Suspens%C3%A3o%20e%20quero%20tirar%20uma%20d%C3%BAvida."
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Falar no WhatsApp"
                className="fixed right-4 bottom-24 lg:right-6 lg:bottom-6 z-[110] flex items-center justify-center w-14 h-14 rounded-full bg-[#25D366] shadow-[0_8px_30px_rgba(37,211,102,0.45)] hover:scale-110 transition-transform"
            >
                <svg viewBox="0 0 24 24" className="w-7 h-7 fill-white" aria-hidden="true"><path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 0 1 8.413 3.488 11.824 11.824 0 0 1 3.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 0 0 1.51 5.26l-.999 3.648 3.978-1.043zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.096 3.2 5.077 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.247-.694.247-1.289.173-1.413z"/></svg>
            </a>

            {/* ═══════════════════════════════════════════ */}
            {/* CTA FIXO (MOBILE)                           */}
            {/* ═══════════════════════════════════════════ */}
            <div className="lg:hidden fixed inset-x-0 bottom-0 z-[100] bg-[#0a0a0a]/95 backdrop-blur-md border-t border-wtech-gold/30 px-4 py-3 flex items-center gap-3">
                <div className="leading-tight shrink-0">
                    <p className="text-[9px] uppercase tracking-widest text-gray-400 font-bold">A partir de</p>
                    <p className="text-wtech-gold font-black text-base leading-none">10x R$ 32,00</p>
                </div>
                <a
                    href={checkoutUrl}
                    id="kiwify-checkout-btn-lp-ergonomia-v2-sticky"
                    className="cta-attention cta-red flex-1 bg-gradient-to-r from-[#ba1d18] to-[#E6241D] text-white text-center px-4 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg"
                >
                    Garantir minha vaga
                </a>
            </div>

        </div >
    );
};

export default LPErgonomia2;
