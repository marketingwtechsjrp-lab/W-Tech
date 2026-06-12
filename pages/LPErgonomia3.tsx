import React, { useState, useEffect, useRef } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { Marquee } from '../components/ui/marquee';
import {
    CheckCircle, ArrowRight, ChevronDown, ChevronRight,
    Play, Monitor, Clock, ShieldCheck, Settings, Zap, Award,
    Users, Target, Bike, Wrench, Mountain, Star, Quote,
    Crosshair, Activity, Gauge, Move, CircleDot, Disc,
    BookOpen, CalendarDays, AlertTriangle, TrendingUp, Flame,
} from 'lucide-react';

/* ─── Google Fonts Injection ─── */
if (typeof document !== 'undefined') {
    const existing = document.querySelector('#lp3-fonts');
    if (!existing) {
        const link = document.createElement('link');
        link.id = 'lp3-fonts';
        link.rel = 'stylesheet';
        link.href = 'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800;900&family=DM+Sans:wght@300;400;500;600;700&display=swap';
        document.head.appendChild(link);
    }
}

/* ─── Inline styles for V3 ─── */
const v3Styles = `
    .lp3 { font-family: 'DM Sans', sans-serif; }
    .lp3 h1, .lp3 h2, .lp3 h3, .lp3 .display { font-family: 'Barlow Condensed', sans-serif; }
    .lp3-hero-glow {
        background: radial-gradient(ellipse 80% 60% at 50% 0%, rgba(245,158,11,0.18) 0%, transparent 70%),
                    radial-gradient(ellipse 60% 50% at 20% 50%, rgba(234,88,12,0.10) 0%, transparent 60%),
                    radial-gradient(ellipse 50% 60% at 80% 30%, rgba(239,68,68,0.08) 0%, transparent 60%);
    }
    .lp3-light-section {
        background: linear-gradient(180deg, #0c1117 0%, #111827 20%, #1a2332 50%, #111827 80%, #0c1117 100%);
    }
    .lp3-glass {
        background: rgba(255,255,255,0.04);
        backdrop-filter: blur(16px);
        border: 1px solid rgba(255,255,255,0.08);
    }
    .lp3-glass-amber {
        background: rgba(245,158,11,0.06);
        backdrop-filter: blur(20px);
        border: 1px solid rgba(245,158,11,0.15);
    }
    .lp3-light-ray {
        position: absolute;
        background: linear-gradient(180deg, rgba(245,158,11,0.15) 0%, transparent 100%);
        transform-origin: top center;
        pointer-events: none;
    }
    .lp3-glow-text {
        text-shadow: 0 0 40px rgba(245,158,11,0.5), 0 0 80px rgba(245,158,11,0.25);
    }
    .lp3-glow-red {
        text-shadow: 0 0 30px rgba(239,68,68,0.4);
    }
    .lp3-btn-primary {
        background: linear-gradient(135deg, #f59e0b, #ea580c);
        box-shadow: 0 0 40px rgba(245,158,11,0.35), inset 0 1px 0 rgba(255,255,255,0.15);
    }
    .lp3-btn-primary:hover {
        box-shadow: 0 0 60px rgba(245,158,11,0.55), inset 0 1px 0 rgba(255,255,255,0.2);
    }
    .lp3-card-hover:hover {
        transform: translateY(-4px);
        box-shadow: 0 20px 60px rgba(0,0,0,0.4), 0 0 0 1px rgba(245,158,11,0.2);
    }
    .lp3-grain::before {
        content: '';
        position: absolute;
        inset: 0;
        background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
        opacity: 0.4;
        pointer-events: none;
        border-radius: inherit;
        z-index: 1;
    }
    @keyframes lp3-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
    @keyframes lp3-pulse-glow { 0%,100%{opacity:0.6} 50%{opacity:1} }
    @keyframes lp3-spin-slow { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
    @keyframes lp3-shimmer { 0%{transform:translateX(-100%)} 100%{transform:translateX(200%)} }
    .lp3-float { animation: lp3-float 4s ease-in-out infinite; }
    .lp3-pulse-glow { animation: lp3-pulse-glow 2s ease-in-out infinite; }
    .lp3-shimmer-sweep::after {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.08) 50%, transparent 60%);
        animation: lp3-shimmer 3s linear infinite;
    }
    .lp3-section-light {
        background: linear-gradient(180deg, #0c1117 0%, #f8f4ef 5%, #fef3e2 50%, #f8f4ef 95%, #0c1117 100%);
    }
`;

/* ─── Animated Light Rays ─── */
const LightRays: React.FC = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        {[
            { left: '15%', rotate: '-25deg', width: '240px', height: '70vh', opacity: 0.12, delay: 0 },
            { left: '35%', rotate: '-10deg', width: '180px', height: '80vh', opacity: 0.08, delay: 0.5 },
            { left: '55%', rotate: '5deg', width: '200px', height: '75vh', opacity: 0.1, delay: 1 },
            { left: '75%', rotate: '20deg', width: '160px', height: '65vh', opacity: 0.07, delay: 1.5 },
        ].map((ray, i) => (
            <motion.div
                key={i}
                initial={{ opacity: 0, scaleY: 0 }}
                animate={{ opacity: ray.opacity, scaleY: 1 }}
                transition={{ duration: 2, delay: ray.delay, ease: 'easeOut' }}
                style={{
                    position: 'absolute',
                    top: 0,
                    left: ray.left,
                    width: ray.width,
                    height: ray.height,
                    background: `linear-gradient(180deg, rgba(245,158,11,0.9) 0%, transparent 100%)`,
                    transformOrigin: 'top center',
                    transform: `rotate(${ray.rotate})`,
                }}
            />
        ))}
    </div>
);

/* ─── Floating Dust Particles ─── */
const DustParticles: React.FC = () => {
    const particles = Array.from({ length: 18 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 3 + 1,
        delay: Math.random() * 4,
        duration: Math.random() * 6 + 4,
    }));
    return (
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
            {particles.map(p => (
                <motion.div
                    key={p.id}
                    className="absolute rounded-full"
                    style={{
                        left: `${p.x}%`,
                        top: `${p.y}%`,
                        width: p.size,
                        height: p.size,
                        background: `rgba(245,158,11,${0.2 + Math.random() * 0.3})`,
                        boxShadow: `0 0 ${p.size * 3}px rgba(245,158,11,0.4)`,
                    }}
                    animate={{
                        y: [-15, 15, -15],
                        x: [-8, 8, -8],
                        opacity: [0.2, 0.7, 0.2],
                    }}
                    transition={{
                        duration: p.duration,
                        delay: p.delay,
                        repeat: Infinity,
                        ease: 'easeInOut',
                    }}
                />
            ))}
        </div>
    );
};

/* ─── Radial Glow Orb ─── */
const GlowOrb: React.FC<{ color?: string; size?: number; className?: string; pulse?: boolean }> = ({
    color = 'rgba(245,158,11,0.15)',
    size = 600,
    className = '',
    pulse = false,
}) => (
    <motion.div
        className={`absolute rounded-full pointer-events-none ${className}`}
        style={{
            width: size,
            height: size,
            background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
            filter: 'blur(40px)',
        }}
        animate={pulse ? { opacity: [0.5, 1, 0.5], scale: [0.95, 1.05, 0.95] } : {}}
        transition={pulse ? { duration: 3, repeat: Infinity, ease: 'easeInOut' } : {}}
    />
);

/* ─── FAQ Item ─── */
const FAQItem: React.FC<{ q: string; a: string }> = ({ q, a }) => {
    const [open, setOpen] = useState(false);
    return (
        <div
            className="lp3-glass rounded-2xl overflow-hidden lp3-card-hover transition-all duration-300 cursor-pointer"
            onClick={() => setOpen(!open)}
        >
            <div className="flex items-center justify-between gap-4 p-6">
                <span className="font-semibold text-gray-100 text-sm md:text-base leading-snug">{q}</span>
                <motion.div
                    animate={{ rotate: open ? 180 : 0 }}
                    transition={{ duration: 0.25 }}
                    className="shrink-0"
                >
                    <ChevronDown size={20} className={open ? 'text-amber-400' : 'text-gray-500'} />
                </motion.div>
            </div>
            <motion.div
                initial={false}
                animate={{ height: open ? 'auto' : 0, opacity: open ? 1 : 0 }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
                className="overflow-hidden"
            >
                <div className="px-6 pb-6 text-gray-400 text-sm leading-relaxed border-t border-white/5 pt-4">{a}</div>
            </motion.div>
        </div>
    );
};

/* ─── Section Label ─── */
const SectionLabel: React.FC<{ children: React.ReactNode; color?: string }> = ({ children, color = 'text-amber-400' }) => (
    <div className={`inline-flex items-center gap-2 mb-4`}>
        <div className={`w-6 h-px ${color === 'text-amber-400' ? 'bg-amber-400' : 'bg-red-500'}`} />
        <span className={`${color} font-bold uppercase tracking-[0.3em] text-[10px] md:text-xs`}>{children}</span>
        <div className={`w-6 h-px ${color === 'text-amber-400' ? 'bg-amber-400' : 'bg-red-500'}`} />
    </div>
);

/* ─── Main Component ─── */
const LPErgonomia3: React.FC = () => {
    const prefersReduced = useReducedMotion();
    const [timeLeft, setTimeLeft] = useState(7 * 60);

    const [checkoutUrl, setCheckoutUrl] = useState("https://pay.kiwify.com.br/19v4nIa");

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const hashQuery = window.location.hash.includes('?') ? window.location.hash.split('?')[1] : '';
            const sp = new URLSearchParams(window.location.search || hashQuery);
            const paramsString = sp.toString();
            if (paramsString) {
                setCheckoutUrl(`https://pay.kiwify.com.br/19v4nIa?${paramsString}`);
            }
        }
    }, []);
    const [showBuyer, setShowBuyer] = useState(false);
    const [currentBuyer, setCurrentBuyer] = useState<{ name: string; role: string; city: string } | null>(null);

    useEffect(() => {
        if (timeLeft <= 0) return;
        const t = setInterval(() => setTimeLeft(p => p - 1), 1000);
        return () => clearInterval(t);
    }, [timeLeft]);

    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;

    const buyers = [
        { name: 'Roberto S.', role: 'Piloto Amador', city: 'São Paulo, SP' },
        { name: 'Daniel M.', role: 'Mecânico', city: 'Belo Horizonte, MG' },
        { name: 'Thiago F.', role: 'Piloto de Trilha', city: 'Curitiba, PR' },
        { name: 'Lucas A.', role: 'Dono de Oficina', city: 'Goiânia, GO' },
        { name: 'Marcelo K.', role: 'Piloto de Enduro', city: 'Caxias do Sul, RS' },
        { name: 'Fábio J.', role: 'Mecânico Preparador', city: 'Ribeirão Preto, SP' },
    ];

    useEffect(() => {
        const i = setInterval(() => {
            setCurrentBuyer(buyers[Math.floor(Math.random() * buyers.length)]);
            setShowBuyer(true);
            setTimeout(() => setShowBuyer(false), 5000);
        }, 18000);
        return () => clearInterval(i);
    }, []);

    const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

    /* ── Data ── */
    const profiles = [
        {
            icon: <Bike size={26} />,
            tag: 'Para Todo Piloto',
            title: 'Piloto',
            accentColor: '#f59e0b',
            pain: 'Seus braços cansam rápido, sente falta de performance, tração e equilíbrio. Isso não é normal. Este curso é o guia definitivo do zero ao acerto da sua moto.',
            img: '/images/lp-curso/1.jpg',
        },
        {
            icon: <Mountain size={26} />,
            tag: 'Trilha - Off Road',
            title: 'Trilha / Off-Road',
            accentColor: '#ea580c',
            pain: 'Sua moto perde tração em subidas ou falta nos buracos? Não é falta de preparo físico — a suspensão está ajustada de forma incorreta.',
            img: '/images/lp-curso/2.jpg',
        },
        {
            icon: <Wrench size={26} />,
            tag: 'Serviço Nobre',
            title: 'Mecânico / Preparador',
            accentColor: '#f59e0b',
            pain: 'Este curso vai elevar seu nível com informações técnicas para realizar o acerto completo nas motos de todos seus clientes — melhorando seu nível de entrega.',
            img: '/images/lp-curso/3.jpg',
        },
        {
            icon: <Settings size={26} />,
            tag: 'Diferencial',
            title: 'Dono de Oficina',
            accentColor: '#ea580c',
            pain: 'Seus clientes pedem ajustes que a equipe não sabe resolver. Dê esse diferencial e melhore o nível de entrega para todos os seus clientes.',
            img: '/images/lp-curso/4.jpg',
        },
    ];

    const concepts = [
        { icon: <CircleDot size={22} />, title: 'O SAG', desc: 'Ajuste da folga da suspensão. Com o primeiro terço preservado, você garante equilíbrio e segurança — ponto de partida obrigatório.' },
        { icon: <Activity size={22} />, title: 'Molas', desc: 'Sustenta o peso do piloto e da moto. O item mais importante — equilíbrio perfeito entre absorção e retorno.' },
        { icon: <Move size={22} />, title: 'Ergonomia', desc: 'Adequa toda a estrutura ao piloto. Altura, ângulo de guidão, pedaleiras — sua integração perfeita à moto.' },
        { icon: <Disc size={22} />, title: 'Pneus e Tração', desc: 'Onde tudo começa. A escolha e calibragem corretas são a ponte entre o chão e a válvula de suspensão.' },
    ];

    const modules = [
        { num: '01', title: 'Boas-Vindas ao Curso', desc: 'Visão geral e método', aulas: 4 },
        { num: '02', title: 'Ergonomia', desc: 'Guidão, manetes, pedal e câmbio', aulas: 5 },
        { num: '03', title: 'Equilíbrio', desc: 'Verificação antes de todo ajuste', aulas: 1 },
        { num: '04', title: 'Molas', desc: 'Rigidez, taxa e escolha certa', aulas: 1 },
        { num: '05', title: 'O SAG', desc: 'Medição e ajuste do zero', aulas: 2 },
        { num: '06', title: 'Óleo e Viscosidades', desc: 'Controle da dinâmica da suspensão', aulas: 1 },
        { num: '07', title: 'Os Cliques', desc: 'Compressão, retorno: o que fazem', aulas: 2 },
        { num: '08', title: 'Suspensão e Eixo Dianteiro', desc: 'Bengalas, instalação da roda e porque a frente para de funcionar', aulas: 2 },
        { num: '09', title: 'Pneus e Tração', desc: 'Pressão correta e PSI ideal', aulas: 2 },
        { num: '10', title: 'Relação e Corrente', desc: 'Ajustes que afetam potência', aulas: 2 },
        { num: '11', title: 'Kits e Ferramentas', desc: 'Setup profissional da bancada', aulas: 1 },
    ];

    const paschoalinLessons = [
        'Apresentação: Quem é Rafa Paschoalin',
        'Introdução ao módulo prático',
        'Ergonomia na moto real',
        'Ajuste do guidão na prática',
        'Ajuste das manetes no campo',
        'Ajuste preciso do freio',
        'Ajuste e posicionamento do câmbio',
        'Check Down: verificação completa',
        'Desregulando a moto (para sentir a diferença)',
        'Moto regulada — comparação final',
    ];

    const testimonials = [
        { name: 'Ricardo F.', role: 'Piloto Amador — SP', text: 'Depois do curso, finalmente ajustei os cliques e o SAG para o meu peso. Chega de solavanco. Moto grudada no chão!' },
        { name: 'Marcos S.', role: 'Mecânico — MG', text: 'Comecei a oferecer setup de suspensão na oficina. Ganhei novos clientes que antes iam buscar fora.' },
        { name: 'Tiago L.', role: 'Piloto de Enduro — PR', text: 'A dianteira agora me dá confiança nas curvas e a tração é constante. Mudou minha pilotagem.' },
        { name: 'Juliana M.', role: 'Pilota Hard Enduro — RJ', text: 'Entender o casamento das molas com a hidráulica virou a chave completa de tudo na minha pilotagem.' },
    ];

    const faqData = [
        { q: 'Preciso ter experiência para fazer o curso?', a: 'Não. O curso é para iniciantes e avançados. Você vai aprender do zero.' },
        { q: 'Como funciona o acesso às aulas?', a: 'Acesso imediato à área de membros. Aulas gravadas, assista quando e onde quiser.' },
        { q: 'Recebo certificado?', a: 'Sim. Certificado digital oficial da W-Tech Brasil ao concluir todos os módulos.' },
        { q: 'Posso assistir no celular?', a: 'Sim. Funciona em qualquer dispositivo — celular, tablet ou computador.' },
        { q: 'O curso serve para qual tipo de moto?', a: 'Enduro, Motocross, Big Trail e Hard Enduro. Os fundamentos de SAG, molas e hidráulica são universais.' },
        { q: 'Por quanto tempo tenho acesso?', a: '12 meses (1 Ano). Reassista quando quiser durante este período.' },
        { q: 'Tem garantia?', a: 'Garantia incondicional de 7 dias. Não gostou? 100% do valor devolvido.' },
    ];

    /* ── CTA Button shared ── */
    const CTAButton: React.FC<{ label?: string; className?: string }> = ({
        label = 'Quero Regular Minha Suspensão',
        className = '',
    }) => (
        <motion.button
            onClick={() => scrollTo('cta-final')}
            whileHover={!prefersReduced ? { scale: 1.03 } : undefined}
            whileTap={!prefersReduced ? { scale: 0.97 } : undefined}
            className={`lp3-btn-primary relative overflow-hidden text-black font-bold text-sm uppercase tracking-widest px-8 py-4 rounded-xl flex items-center gap-3 transition-all lp3-shimmer-sweep ${className}`}
        >
            <span className="relative z-10 flex items-center gap-2">{label} <ArrowRight strokeWidth={2.5} size={16} /></span>
        </motion.button>
    );

    return (
        <>
            {/* Inject Styles */}
            <style dangerouslySetInnerHTML={{ __html: v3Styles }} />

            <div className="lp3 min-h-screen bg-[#0c1117] text-white overflow-x-hidden selection:bg-amber-400 selection:text-black">

                {/* ══════════════════════════════════════════ */}
                {/* STICKY BANNER                             */}
                {/* ══════════════════════════════════════════ */}
                <div className="sticky top-0 z-50 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 py-2.5 px-4 text-center shadow-[0_2px_20px_rgba(245,158,11,0.4)]">
                    <div className="container mx-auto flex items-center justify-center gap-3 text-xs font-bold uppercase tracking-[.18em] text-black">
                        <Flame size={14} className="animate-pulse" />
                        Últimas vagas do lote atual — valor promocional expira em breve
                        <Flame size={14} className="animate-pulse" />
                    </div>
                </div>

                {/* ══════════════════════════════════════════ */}
                {/* HERO                                       */}
                {/* ══════════════════════════════════════════ */}
                <section className="relative min-h-[95vh] flex items-center justify-center overflow-hidden pt-8">
                    {/* Background image */}
                    <div className="absolute inset-0 z-0">
                        <div className="absolute inset-0 bg-cover bg-top lg:bg-center bg-no-repeat bg-[url('/hero-mobile-alex.jpg')] md:bg-[url('/hero-desktop-alex.jpg')]" />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0c1117] via-[#0c1117]/75 to-[#0c1117]/50" />
                        <div className="absolute inset-0 lp3-hero-glow" />
                    </div>

                    {/* Light Rays */}
                    <LightRays />

                    {/* Particles */}
                    <DustParticles />

                    {/* Hero Glow Orbs */}
                    <GlowOrb color="rgba(245,158,11,0.12)" size={700} className="-top-40 left-1/2 -translate-x-1/2" pulse />
                    <GlowOrb color="rgba(234,88,12,0.10)" size={500} className="top-1/3 -left-20" />
                    <GlowOrb color="rgba(239,68,68,0.08)" size={400} className="top-1/4 -right-20" />

                    <div className="container mx-auto px-6 relative z-10 pt-8 pb-20">
                        <div className="grid lg:grid-cols-2 gap-12 lg:gap-10 items-center max-w-7xl mx-auto">

                            {/* Left: Copy */}
                            <motion.div
                                initial="hidden"
                                animate="visible"
                                variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
                            >
                                {/* Badge */}
                                <motion.div
                                    variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}
                                    className="inline-flex items-center gap-2 lp3-glass-amber px-4 py-2 rounded-full mb-8"
                                >
                                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400 lp3-pulse-glow" />
                                    <span className="text-amber-300 font-bold text-[10px] uppercase tracking-[0.22em]">Curso Online — W-Tech</span>
                                </motion.div>

                                {/* H1 */}
                                <motion.h1
                                    variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
                                    className="text-4xl md:text-5xl lg:text-[3.5rem] font-black uppercase tracking-tight leading-[1.08] mb-6 drop-shadow-2xl"
                                >
                                    O único curso<br />
                                    que ensina o<br />
                                    <span className="lp3-glow-text text-amber-400">piloto a regular</span><br />
                                    <span className="text-white/90 text-3xl md:text-4xl lg:text-5xl">a suspensão do zero</span>
                                </motion.h1>

                                {/* Subheadline */}
                                <motion.p
                                    variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}
                                    className="text-base md:text-lg text-gray-200 leading-relaxed mb-4 max-w-lg font-medium"
                                >
                                    Chega de falta de desempenho e desconforto — perda de tração, insegurança e cansaço não fazem parte de uma moto bem ajustada.
                                </motion.p>

                                <motion.div
                                    variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
                                    className="flex items-start gap-3 mb-4 max-w-lg"
                                >
                                    <div className="w-0.5 h-12 bg-gradient-to-b from-amber-400 to-transparent rounded-full shrink-0 mt-1" />
                                    <p className="text-sm text-gray-400">
                                        Tudo que você precisa para sua moto performar bem. Sinta a diferença já na <strong className="text-amber-300">primeira volta com a moto.</strong>
                                    </p>
                                </motion.div>

                                <motion.p
                                    variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
                                    className="text-xs text-amber-400/80 font-bold uppercase tracking-widest mb-8 flex items-center gap-2"
                                >
                                    <CheckCircle size={14} className="text-amber-400" />
                                    Não importa o conhecimento — você aprende do zero.
                                </motion.p>

                                {/* CTAs */}
                                <motion.div
                                    variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
                                    className="flex flex-col sm:flex-row gap-4"
                                >
                                    <CTAButton label="Quero Regular Minha Suspensão" />
                                    <button
                                        onClick={() => scrollTo('modulos')}
                                        className="border border-white/15 hover:border-amber-400/40 text-gray-300 hover:text-amber-300 px-8 py-4 rounded-xl font-semibold text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-2 lp3-glass"
                                    >
                                        Ver Conteúdo <ChevronDown size={16} />
                                    </button>
                                </motion.div>
                            </motion.div>

                            {/* Right: VSL */}
                            <motion.div
                                initial={{ opacity: 0, scale: 0.93 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.7, delay: 0.3, ease: 'easeOut' }}
                                className="relative"
                            >
                                {/* Glow behind video */}
                                <div className="absolute -inset-4 bg-amber-500/10 rounded-3xl blur-2xl" />
                                <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-amber-400/20 shadow-[0_0_60px_rgba(245,158,11,0.2),0_20px_60px_rgba(0,0,0,0.5)]">
                                    <iframe
                                        width="100%"
                                        height="100%"
                                        src="https://www.youtube.com/embed/rbslvR27uT0?autoplay=1&mute=1&controls=1&rel=0&loop=1"
                                        title="W-Tech Suspensão"
                                        frameBorder="0"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                        className="absolute inset-0 w-full h-full"
                                    />
                                </div>
                                {/* Badge floating */}
                                <motion.div
                                    animate={!prefersReduced ? { y: [-6, 6, -6] } : {}}
                                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                                    className="absolute -bottom-5 -left-5 lp3-glass-amber px-4 py-3 rounded-xl shadow-xl"
                                >
                                    <p className="text-amber-300 font-bold text-xs uppercase tracking-widest">+3.000 Alunos</p>
                                    <p className="text-white/70 text-[10px]">formados pela W-Tech</p>
                                </motion.div>
                                <motion.div
                                    animate={!prefersReduced ? { y: [6, -6, 6] } : {}}
                                    transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
                                    className="absolute -top-5 -right-5 lp3-glass-amber px-4 py-3 rounded-xl shadow-xl"
                                >
                                    <div className="flex items-center gap-1">
                                        {[...Array(5)].map((_, i) => <Star key={i} size={10} className="fill-amber-400 text-amber-400" />)}
                                    </div>
                                    <p className="text-white/70 text-[10px] mt-0.5">4.9 — Nota dos alunos</p>
                                </motion.div>
                            </motion.div>
                        </div>
                    </div>

                    {/* Scroll indicator */}
                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2">
                        <motion.div animate={{ y: [0, 6, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>
                            <ChevronDown size={20} className="text-amber-400/50" />
                        </motion.div>
                    </div>
                </section>

                {/* ══════════════════════════════════════════ */}
                {/* 2 · PARA QUEM É — CARDS LIGHT            */}
                {/* ══════════════════════════════════════════ */}
                <section className="py-24 relative overflow-hidden bg-[#131b26] border-t border-white/5">
                    <GlowOrb color="rgba(245,158,11,0.07)" size={800} className="top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                    <div className="absolute top-0 w-full h-px bg-gradient-to-r from-transparent via-amber-400/30 to-transparent" />

                    <div className="container mx-auto px-6 relative z-10">
                        <motion.div
                            initial={{ opacity: 0, y: 24 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5 }}
                            className="text-center mb-16"
                        >
                            <SectionLabel>Este Curso É Para Você</SectionLabel>
                            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tight leading-[1.1] mt-4 mb-4">
                                Não importa se você <span className="text-amber-400">não sabe nada</span>
                            </h2>
                            <p className="text-gray-400 max-w-xl mx-auto">Neste curso você vai aprender cada detalhe do zero.</p>
                        </motion.div>

                        {/* 2×2 Grid */}
                        <div className="grid md:grid-cols-2 gap-5 max-w-5xl mx-auto">
                            {profiles.map((p, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 28 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true, margin: '-40px' }}
                                    transition={{ duration: 0.45, delay: i * 0.1 }}
                                    className="group relative rounded-3xl overflow-hidden lp3-card-hover transition-all duration-300"
                                    style={{ border: `1px solid rgba(255,255,255,0.06)` }}
                                >
                                    {/* BG image */}
                                    <div
                                        className="absolute inset-0 bg-cover bg-center"
                                        style={{ backgroundImage: `url('${p.img}')` }}
                                    />
                                    <div className="absolute inset-0" style={{
                                        background: 'linear-gradient(160deg, rgba(12,17,23,0.82) 0%, rgba(12,17,23,0.92) 100%)',
                                    }} />
                                    {/* Accent glow on hover */}
                                    <div
                                        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                                        style={{ background: `radial-gradient(ellipse at top left, ${p.accentColor}18, transparent 60%)` }}
                                    />

                                    <div className="relative z-10 p-8">
                                        {/* Icon */}
                                        <div
                                            className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-200"
                                            style={{
                                                background: `${p.accentColor}15`,
                                                border: `1px solid ${p.accentColor}30`,
                                                color: p.accentColor,
                                                boxShadow: `0 0 20px ${p.accentColor}20`,
                                            }}
                                        >
                                            {p.icon}
                                        </div>
                                        <span
                                            className="text-[9px] font-black uppercase tracking-[0.2em] px-2 py-1 rounded mb-3 inline-block"
                                            style={{ color: p.accentColor, border: `1px solid ${p.accentColor}30`, background: `${p.accentColor}10` }}
                                        >
                                            {p.tag}
                                        </span>
                                        <h3 className="text-2xl font-black uppercase tracking-tight text-white mb-3">{p.title}</h3>
                                        <p className="text-gray-300 text-sm leading-relaxed">{p.pain}</p>
                                    </div>

                                    {/* Bottom accent line */}
                                    <div
                                        className="absolute bottom-0 left-0 right-0 h-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                        style={{ background: `linear-gradient(90deg, transparent, ${p.accentColor}, transparent)` }}
                                    />
                                </motion.div>
                            ))}
                        </div>

                        {/* CTA */}
                        <div className="flex justify-center mt-16">
                            <CTAButton label="Quero Garantir Minha Vaga" />
                        </div>
                    </div>
                </section>

                {/* ══════════════════════════════════════════ */}
                {/* 3 · CONCEITO — SEÇÃO MAIS CLARA          */}
                {/* ══════════════════════════════════════════ */}
                <section className="py-24 relative overflow-hidden bg-[#0c1117] border-y border-amber-500/20 shadow-[0_-20px_60px_rgba(245,158,11,0.03)]">
                    <GlowOrb color="rgba(245,158,11,0.09)" size={900} className="-top-20 left-1/2 -translate-x-1/2" />
                    <GlowOrb color="rgba(234,88,12,0.07)" size={600} className="bottom-0 right-0" />

                    <div className="absolute top-0 w-full h-px bg-gradient-to-r from-transparent via-amber-400/20 to-transparent" />

                    <div className="container mx-auto px-6 relative z-10">
                        <div className="grid lg:grid-cols-2 gap-16 items-center max-w-6xl mx-auto">

                            {/* Left: Concept Blocks */}
                            <motion.div
                                initial={{ opacity: 0, x: -30 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.55 }}
                            >
                                <SectionLabel>Entenda o Conceito</SectionLabel>
                                <h2 className="text-3xl md:text-4xl lg:text-5xl font-black uppercase tracking-tight leading-[1.1] mb-8">
                                    Qual o Segredo do <span className="text-amber-400 lp3-glow-text">Acerto Perfeito?</span>
                                </h2>
                                <p className="text-gray-300 text-lg leading-relaxed mb-4">
                                    Não importa o quanto o motor é forte se a suspensão não consegue colocar a potência no chão.
                                </p>
                                <p className="text-gray-500 leading-relaxed mb-8">
                                    Quando molas, óleo, cliques, SAG e pneus estão ajustados para o seu nível Off-Road, <strong className="text-white">a moto não espalha, a tração é constante e o desgaste físico cai drasticamente.</strong>
                                </p>

                                {/* Highlight */}
                                <div className="relative p-5 rounded-2xl overflow-hidden" style={{
                                    background: 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(234,88,12,0.05))',
                                    border: '1px solid rgba(245,158,11,0.15)',
                                }}>
                                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-400/40 to-transparent" />
                                    <Zap size={18} className="text-amber-400 mb-2" />
                                    <p className="text-amber-200 font-semibold text-sm leading-relaxed">
                                        O ajuste correto da suspensão eleva o nível de performance. É um investimento necessário para obter mais desempenho e segurança.
                                    </p>
                                </div>
                            </motion.div>

                            {/* Right: 4 concept cards */}
                            <motion.div
                                initial={{ opacity: 0, x: 30 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.55, delay: 0.15 }}
                                className="space-y-4"
                            >
                                {concepts.map((c, i) => (
                                    <motion.div
                                        key={i}
                                        whileHover={!prefersReduced ? { x: 6 } : undefined}
                                        className="flex items-start gap-5 p-5 rounded-2xl lp3-card-hover transition-all duration-300 group"
                                        style={{
                                            background: 'rgba(255,255,255,0.03)',
                                            border: '1px solid rgba(255,255,255,0.06)',
                                        }}
                                    >
                                        <div
                                            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-200"
                                            style={{
                                                background: 'rgba(245,158,11,0.10)',
                                                border: '1px solid rgba(245,158,11,0.20)',
                                                color: '#f59e0b',
                                                boxShadow: '0 0 15px rgba(245,158,11,0.15)',
                                            }}
                                        >
                                            {c.icon}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-white mb-1 group-hover:text-amber-300 transition-colors">{c.title}</h3>
                                            <p className="text-gray-500 text-sm leading-relaxed">{c.desc}</p>
                                        </div>
                                    </motion.div>
                                ))}
                            </motion.div>
                        </div>
                    </div>
                </section>

                {/* ══════════════════════════════════════════ */}
                {/* 4 · MÓDULOS                               */}
                {/* ══════════════════════════════════════════ */}
                <section id="modulos" className="py-24 relative overflow-hidden bg-[#111827] border-t border-white/5">
                    <div className="absolute top-0 w-full h-px bg-gradient-to-r from-transparent via-orange-500/25 to-transparent" />
                    <GlowOrb color="rgba(234,88,12,0.06)" size={700} className="top-1/2 -translate-y-1/2 -left-32" />

                    <div className="container mx-auto px-6 relative z-10">
                        <motion.div
                            initial={{ opacity: 0, y: 24 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="text-center mb-12"
                        >
                            <SectionLabel color="text-orange-400">Conteúdo Completo</SectionLabel>
                            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tight leading-[1.1] mt-4 mb-4">
                                11 Módulos + <span className="text-amber-400">Bônus</span>
                            </h2>
                        </motion.div>

                        {/* Features bar */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-4xl mx-auto mb-14">
                            {[
                                { icon: <Monitor size={18} />, t: '100% Online' },
                                { icon: <Play size={18} />, t: 'Aulas Gravadas' },
                                { icon: <CalendarDays size={18} />, t: '12 Meses de Acesso' },
                                { icon: <BookOpen size={18} />, t: '+30 Aulas' },
                            ].map((f, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 12 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.08 }}
                                    className="flex items-center justify-center gap-2 p-4 rounded-xl lp3-glass"
                                >
                                    <span className="text-amber-400">{f.icon}</span>
                                    <span className="text-sm font-semibold text-gray-200">{f.t}</span>
                                </motion.div>
                            ))}
                        </div>

                        {/* Modules Grid */}
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 max-w-6xl mx-auto mb-14">
                            {modules.map((m, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 16 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true, margin: '-30px' }}
                                    transition={{ delay: i * 0.04 }}
                                    whileHover={!prefersReduced ? { y: -3 } : undefined}
                                    className="group flex gap-4 p-5 rounded-2xl lp3-glass transition-all duration-250 cursor-default"
                                    style={{ borderColor: 'rgba(245,158,11,0.0)' }}
                                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(245,158,11,0.15)')}
                                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(245,158,11,0.0)')}
                                >
                                    <div
                                        className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm group-hover:scale-110 transition-transform"
                                        style={{
                                            background: 'rgba(245,158,11,0.10)',
                                            border: '1px solid rgba(245,158,11,0.20)',
                                            color: '#f59e0b',
                                        }}
                                    >
                                        {m.num}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white text-sm leading-snug mb-1 group-hover:text-amber-300 transition-colors">{m.title}</h3>
                                        <p className="text-gray-500 text-xs leading-relaxed">{m.desc}</p>
                                        <span className="text-[10px] text-gray-600 uppercase tracking-wider mt-1.5 block">{m.aulas} {m.aulas === 1 ? 'aula' : 'aulas'}</span>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        {/* Carousel */}
                        <div className="relative w-full overflow-hidden mb-10">
                            <Marquee pauseOnHover className="[--duration:60s]">
                                {[
                                    "http://w-techbrasil.com.br/wp-content/uploads/2026/02/CARDS-KWIFY-CURSO-AVANCADO.png",
                                    "http://w-techbrasil.com.br/wp-content/uploads/2026/02/CARDS-KWIFY-CURSO-AVANCADO-1.png",
                                    "http://w-techbrasil.com.br/wp-content/uploads/2026/02/CARDS-KWIFY-CURSO-AVANCADO-2.png",
                                    "http://w-techbrasil.com.br/wp-content/uploads/2026/02/CARDS-KWIFY-CURSO-AVANCADO-3.png",
                                    "http://w-techbrasil.com.br/wp-content/uploads/2026/02/CARDS-KWIFY-CURSO-AVANCADO-4.png",
                                    "/images/lp-curso/oleo-e-viscosidades.png",
                                    "http://w-techbrasil.com.br/wp-content/uploads/2026/02/CARDS-KWIFY-CURSO-AVANCADO-2-1.png",
                                ].map((src, idx) => (
                                    <img key={idx} src={src} alt={`M${idx + 1}`}
                                        className="h-[240px] md:h-[290px] w-auto rounded-2xl border border-amber-400/10 shadow-[0_0_20px_rgba(245,158,11,0.08)] object-contain hover:scale-105 transition-transform duration-300"
                                    />
                                ))}
                            </Marquee>
                            <div className="pointer-events-none absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-[#0c1117]"></div>
                            <div className="pointer-events-none absolute inset-y-0 right-0 w-1/4 bg-gradient-to-l from-[#0c1117]"></div>
                        </div>

                        <div className="flex justify-center">
                            <CTAButton label="Quero Acesso a Todo Conteúdo" />
                        </div>
                    </div>
                </section>

                {/* ══════════════════════════════════════════ */}
                {/* 4B · PASCHOALIN — MÓDULO BÔNUS           */}
                {/* ══════════════════════════════════════════ */}
                <section className="py-20 relative overflow-hidden bg-[#1a0f12] border-t border-red-500/20 shadow-[0_-20px_60px_rgba(239,68,68,0.02)]">
                    <GlowOrb color="rgba(168,85,247,0.08)" size={700} className="-right-32 top-1/4" pulse />
                    <GlowOrb color="rgba(245,158,11,0.06)" size={500} className="-left-20 bottom-0" />
                    <div className="absolute top-0 w-full h-px bg-gradient-to-r from-transparent via-purple-500/25 to-transparent" />

                    <div className="container mx-auto px-6 relative z-10">
                        <motion.div
                            initial={{ opacity: 0, y: 24 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="text-center mb-12"
                        >
                            <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-400/20 px-5 py-2 rounded-full mb-6">
                                <Star size={12} className="text-purple-400 fill-purple-400" />
                                <span className="text-purple-300 font-bold uppercase tracking-widest text-[10px]">Módulo Bônus Exclusivo</span>
                            </div>
                            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tight leading-[1.1] mb-4">
                                Rafa <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">Paschoalin</span>
                            </h2>
                            <h3 className="text-lg md:text-xl font-bold text-gray-300 mb-5 uppercase tracking-tight">
                                O Piloto Que Testou Tudo Na Prática — Para Você Ver A Diferença
                            </h3>
                            <p className="text-gray-400 max-w-2xl mx-auto text-sm leading-relaxed">
                                Rafa testou a moto nos 2 ambientes, <strong className="text-white">regulada e desregulada</strong>, e sentiu toda a diferença. Isso é o que transforma conhecimento em resultado real.
                            </p>
                        </motion.div>

                        {/* Card */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5 }}
                            className="max-w-5xl mx-auto rounded-3xl overflow-hidden"
                            style={{
                                background: 'rgba(24,20,40,0.8)',
                                border: '1px solid rgba(168,85,247,0.15)',
                                boxShadow: '0 0 80px rgba(168,85,247,0.10)',
                            }}
                        >
                            <div className="h-1 bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500" />
                            <div className="grid lg:grid-cols-2 gap-0">
                                <div className="relative h-64 lg:h-auto overflow-hidden">
                                    <img src="/paschoalin.jpg" alt="Rafa Paschoalin"
                                        className="w-full h-full object-cover object-top" />
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#18142880] hidden lg:block" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-[#181428cc] to-transparent lg:hidden" />
                                    <div className="absolute bottom-4 left-4 bg-purple-600/90 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                                        <Star size={9} className="fill-white" /> Participação Especial
                                    </div>
                                </div>
                                <div className="p-8 md:p-10">
                                    <p className="text-amber-400 font-bold uppercase tracking-widest text-xs mb-2">Piloto de Alta Performance</p>
                                    <p className="text-gray-400 text-sm leading-relaxed mb-6">
                                        Rafa testou a moto dos 2 ambientes — <strong className="text-white">regulada e desregulada</strong> — e sentiu toda a diferença. A combinação perfeita: técnica sólida + performance real.
                                    </p>
                                    <p className="text-xs font-black uppercase tracking-widest text-purple-400 mb-4">10 Aulas Exclusivas:</p>
                                    <div className="space-y-2">
                                        {paschoalinLessons.map((l, i) => (
                                            <div key={i} className="flex items-center gap-3">
                                                <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                                                    style={{ background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.3)' }}>
                                                    <CheckCircle size={10} className="text-purple-400" />
                                                </div>
                                                <span className="text-gray-300 text-sm">{l}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </section>

                {/* ══════════════════════════════════════════ */}
                {/* 5 · INSTRUTORES                           */}
                {/* ══════════════════════════════════════════ */}
                <section className="py-24 bg-[#0c1117] border-t border-white/5">
                    <div className="container mx-auto px-6">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="text-center mb-16"
                        >
                            <SectionLabel>Autoridade Técnica</SectionLabel>
                            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tight leading-[1.1] mt-4">
                                Seus <span className="text-amber-400">Instrutores</span>
                            </h2>
                        </motion.div>

                        <div className="grid lg:grid-cols-2 gap-6 max-w-5xl mx-auto">
                            {[
                                {
                                    src: '/images/alex-webp.webp',
                                    badge: 'Instrutor Principal', badgeColor: '#f59e0b', badgeBg: '#f59e0b',
                                    name: 'Alex Crepaldi', role: 'Fundador W-Tech Suspensões',
                                    roleColor: '#f59e0b',
                                    desc: 'Referência nacional no acerto, preparação e revalvulação de suspensões Off-Road. Mais de 3.000 mecânicos e pilotos capacitados.',
                                    note: '👉 Domínio técnico: simples manutenção à personalização profunda.',
                                    accentColor: '#f59e0b',
                                },
                                {
                                    src: '/paschoalin.jpg',
                                    badge: 'Participação Especial', badgeColor: '#ffffff', badgeBg: '#ea580c',
                                    name: 'Paschoalin', role: 'Piloto de Alta Performance',
                                    roleColor: '#ea580c',
                                    desc: 'Piloto com vasta experiência em competições de alto nível. Valida na prática toda a teoria do curso.',
                                    note: '👉 Foco: reação do motor e suspensão quando exigidos ao extremo.',
                                    accentColor: '#ea580c',
                                },
                            ].map((ins, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 24 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.15 }}
                                    className="lp3-glass rounded-3xl overflow-hidden lp3-card-hover transition-all duration-300 group"
                                >
                                    <div className="h-60 relative overflow-hidden">
                                        <img src={ins.src} alt={ins.name}
                                            className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-[#0c1117] via-[#0c1117]/20 to-transparent" />
                                        {/* Top accent */}
                                        <div className="absolute top-0 left-0 right-0 h-0.5"
                                            style={{ background: `linear-gradient(90deg, ${ins.accentColor}, transparent)` }} />
                                    </div>
                                    <div className="p-8">
                                        <span className="text-[10px] font-black uppercase px-3 py-1 rounded mb-4 inline-block"
                                            style={{ background: ins.badgeBg, color: ins.badgeColor }}>
                                            {ins.badge}
                                        </span>
                                        <h3 className="text-2xl font-black uppercase text-white mb-1">{ins.name}</h3>
                                        <p className="text-sm font-medium mb-4" style={{ color: ins.roleColor }}>{ins.role}</p>
                                        <p className="text-gray-400 text-sm leading-relaxed mb-5">{ins.desc}</p>
                                        <div className="p-4 rounded-xl text-sm text-gray-400"
                                            style={{ background: `${ins.accentColor}08`, borderLeft: `3px solid ${ins.accentColor}` }}>
                                            {ins.note}
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        {/* Combo */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            whileInView={{ opacity: 1 }}
                            viewport={{ once: true }}
                            className="max-w-3xl mx-auto mt-10 p-6 rounded-2xl text-center lp3-glass-amber"
                        >
                            <p className="text-sm font-semibold text-gray-300">
                                <span className="text-amber-400">Teoria técnica com Alex Crepaldi</span> +{' '}
                                <span className="text-purple-400">Validação prática com Paschoalin</span>{' '}
                                = A fórmula completa para dominar suspensão Off-Road.
                            </p>
                        </motion.div>

                        <div className="flex justify-center mt-10">
                            <CTAButton label="Quero Aprender com os Melhores" />
                        </div>
                    </div>
                </section>

                {/* ══════════════════════════════════════════ */}
                {/* 6 · BÔNUS                                 */}
                {/* ══════════════════════════════════════════ */}
                <section className="py-24 relative overflow-hidden bg-[#16130b] border-t border-amber-500/20 shadow-[0_-20px_60px_rgba(245,158,11,0.02)]">
                    <div className="absolute top-0 w-full h-px bg-gradient-to-r from-transparent via-red-500/20 to-transparent" />
                    <GlowOrb color="rgba(239,68,68,0.07)" size={700} className="-right-20 top-0" />

                    <div className="container mx-auto px-6 relative z-10">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="text-center mb-14"
                        >
                            <SectionLabel color="text-orange-400">Material de Apoio Oficial</SectionLabel>
                            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tight leading-[1.1] mt-4 mb-3">
                                Mais de <span className="text-orange-400">R$ 997</span> em Bônus
                            </h2>
                            <p className="text-gray-400 max-w-xl mx-auto">Ferramentas complementares que nossa equipe usa — incluídas na sua matrícula.</p>
                        </motion.div>

                        <div className="grid md:grid-cols-2 gap-5 max-w-4xl mx-auto">
                            {[
                                { t: 'Planilha de Regulagem de SAG', v: '397,00', icon: <Activity size={22} /> },
                                { t: 'Planilha de Regulagem de PSI', v: '257,00', icon: <Gauge size={22} /> },
                                { t: 'Comparativo de Óleos', v: '197,00', icon: <Move size={22} /> },
                                { t: 'Comparativo de Molas', v: '146,00', icon: <CheckCircle size={22} /> },
                            ].map((b, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true, margin: '-30px' }}
                                    transition={{ delay: i * 0.1 }}
                                    className="group relative p-7 rounded-2xl lp3-glass lp3-card-hover transition-all duration-300 overflow-hidden"
                                >
                                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-orange-500/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <div className="flex items-center gap-4 mb-5">
                                        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-orange-400 shrink-0"
                                            style={{ background: 'rgba(234,88,12,0.10)', border: '1px solid rgba(234,88,12,0.20)' }}>
                                            {b.icon}
                                        </div>
                                        <h3 className="font-bold text-white text-base leading-snug">{b.t}</h3>
                                    </div>
                                    <div className="flex items-end justify-between border-t border-white/5 pt-4">
                                        <span className="text-gray-600 text-xs font-bold line-through">De R$ {b.v}</span>
                                        <span className="text-2xl font-black text-amber-400">GRÁTIS</span>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ══════════════════════════════════════════ */}
                {/* 7 · DEPOIMENTOS                           */}
                {/* ══════════════════════════════════════════ */}
                <section className="py-24 bg-[#050505] border-t border-white/5">
                    <div className="container mx-auto px-6">
                        <motion.div
                            initial={{ opacity: 0, y: 16 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="text-center mb-14"
                        >
                            <SectionLabel>Prova Social</SectionLabel>
                            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tight leading-[1.1] mt-4">
                                O Que Dizem <span className="text-amber-400">Nossos Alunos</span>
                            </h2>
                        </motion.div>

                        {/* Stats */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto mb-14">
                            {[
                                { v: '3.000+', l: 'Profissionais treinados' },
                                { v: '15+', l: 'Anos de experiência' },
                                { v: '100%', l: 'Online e prático' },
                                { v: '4.9★', l: 'Nota dos alunos' },
                            ].map((s, i) => (
                                <motion.div key={i}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    whileInView={{ opacity: 1, scale: 1 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.1 }}
                                    className="text-center p-6 rounded-2xl lp3-glass-amber"
                                >
                                    <div className="text-3xl font-black text-amber-400 mb-1">{s.v}</div>
                                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{s.l}</div>
                                </motion.div>
                            ))}
                        </div>

                        {/* Testimonials Marquee */}
                        <div className="w-full relative overflow-hidden">
                            <Marquee pauseOnHover className="[--duration:40s] py-4">
                                {[...testimonials, ...testimonials].map((t, i) => (
                                    <div
                                        key={i}
                                        className="relative w-[280px] md:w-[360px] shrink-0 p-6 rounded-2xl lp3-glass mx-3 flex flex-col justify-between"
                                        style={{ border: '1px solid rgba(245,158,11,0.10)', minHeight: '180px' }}
                                    >
                                        {/* Quote icon — static, top-right corner inside relative card */}
                                        <Quote size={24} className="absolute top-4 right-4 text-amber-400/10 pointer-events-none" />
                                        <div>
                                            <div className="flex items-center gap-1 mb-3">
                                                {[...Array(5)].map((_, j) => <Star key={j} size={11} className="fill-amber-400 text-amber-400" />)}
                                            </div>
                                            <p className="text-gray-300 text-sm leading-relaxed italic pr-6">"{t.text}"</p>
                                        </div>
                                        <div className="flex items-center gap-3 mt-4 pt-4 border-t border-white/5">
                                            <div
                                                className="w-8 h-8 rounded-full flex items-center justify-center font-black text-xs text-black shrink-0"
                                                style={{ background: 'linear-gradient(135deg, #f59e0b, #ea580c)' }}
                                            >
                                                {t.name[0]}
                                            </div>
                                            <div>
                                                <p className="font-bold text-white text-sm leading-tight">{t.name}</p>
                                                <p className="text-gray-500 text-xs">{t.role}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </Marquee>
                        </div>

                        <div className="flex justify-center mt-12">
                            <CTAButton label="Quero Ser o Próximo" />
                        </div>
                    </div>
                </section>

                {/* ══════════════════════════════════════════ */}
                {/* 8 · CTA FINAL — OFERTA                   */}
                {/* ══════════════════════════════════════════ */}
                <section id="cta-final" className="py-24 md:py-32 relative overflow-hidden flex items-center justify-center min-h-[85vh] bg-[#0c1410] border-t border-green-500/10 shadow-[0_-20px_60px_rgba(34,197,94,0.02)]">
                    <GlowOrb color="rgba(245,158,11,0.12)" size={800} className="top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" pulse />
                    <GlowOrb color="rgba(234,88,12,0.08)" size={500} className="top-0 right-0" />
                    <DustParticles />

                    <div className="container mx-auto px-6 relative z-10 flex justify-center">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            whileInView={{ opacity: 1, scale: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.55 }}
                            className="w-full max-w-4xl text-center relative lp3-grain"
                            style={{
                                background: 'rgba(12,17,23,0.95)',
                                border: '1px solid rgba(245,158,11,0.15)',
                                borderRadius: '2rem',
                                boxShadow: '0 0 120px rgba(245,158,11,0.12), 0 40px 80px rgba(0,0,0,0.5)',
                                padding: 'clamp(2rem, 5vw, 4rem)',
                            }}
                        >
                            {/* Top glow line */}
                            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400 to-transparent rounded-t-3xl" />
                            {/* Top center flash */}
                            <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-64 h-32 bg-amber-400/15 blur-3xl pointer-events-none" />

                            {/* Logo */}
                            <div className="flex justify-center mb-8">
                                <img src="http://w-techbrasil.com.br/wp-content/uploads/2026/02/logo-branca.png" alt="W-Tech" className="h-10 md:h-12 object-contain" />
                            </div>

                            <span className="text-amber-400 font-bold uppercase tracking-[0.22em] text-[10px] block mb-4">
                                Lançamento — Valor Especial por Tempo Limitado
                            </span>

                            <h2 className="text-2xl md:text-4xl font-black text-white mb-3 tracking-tight">
                                Garanta Sua Vaga <span className="text-amber-400 lp3-glow-text">Agora</span>
                            </h2>
                            <p className="text-gray-400 text-sm mb-10 max-w-lg mx-auto">
                                11 módulos técnicos + Módulo Bônus Paschoalin + Planilhas de Regulagem.
                            </p>

                            {/* Price */}
                            <div className="text-gray-500 font-bold text-sm tracking-wider mb-3 line-through">
                                De R$ 997,00 por
                            </div>
                            <div className="text-5xl md:text-6xl font-black text-white tracking-tight leading-[1.1] mb-2">
                                12x <span className="text-amber-400 lp3-glow-text">R$ 34,70</span>
                            </div>
                            <p className="text-orange-400 text-sm mb-10">ou R$ 347,00 à vista no Pix/Cartão</p>

                            {/* Timer */}
                            <div className="flex items-center justify-center gap-4 mb-10">
                                {[
                                    { val: String(minutes).padStart(2, '0'), label: 'Minutos' },
                                    { val: String(seconds).padStart(2, '0'), label: 'Segundos' },
                                ].reduce((acc: React.ReactNode[], item, i, arr) => {
                                    acc.push(
                                        <div key={i} className="flex flex-col items-center">
                                            <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl flex items-center justify-center text-3xl md:text-4xl font-black text-amber-400"
                                                style={{
                                                    background: 'rgba(245,158,11,0.08)',
                                                    border: '1px solid rgba(245,158,11,0.20)',
                                                    boxShadow: '0 0 20px rgba(245,158,11,0.10), inset 0 1px 0 rgba(255,255,255,0.05)',
                                                }}>
                                                {item.val}
                                            </div>
                                            <span className="text-[10px] text-gray-500 uppercase tracking-widest mt-2 font-bold">{item.label}</span>
                                        </div>
                                    );
                                    if (i < arr.length - 1) {
                                        acc.push(<span key={`sep-${i}`} className="text-amber-400/40 text-3xl font-black -mt-6">:</span>);
                                    }
                                    return acc;
                                }, [])}
                            </div>

                            {/* Checklist */}
                            <div className="grid sm:grid-cols-2 gap-4 max-w-2xl mx-auto mb-12 text-left">
                                {[
                                    '1 Ano de Acesso ao Curso',
                                    'Conteúdo 100% em Vídeo',
                                    'Certificado de Conclusão W-Tech',
                                    'Suporte Técnico na Plataforma',
                                    'BÔNUS: Planilha de Regulagem de SAG',
                                    'BÔNUS: Planilha de Regulagem de PSI',
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center gap-3">
                                        <CheckCircle size={16} className={i >= 4 ? 'text-amber-400 shrink-0' : 'text-orange-400 shrink-0'} />
                                        <span className={`text-xs sm:text-sm ${i >= 4 ? 'font-bold text-gray-200' : 'text-gray-300'}`}>{item}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Main CTA */}
                            <motion.a
                                href={checkoutUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                id="kiwify-checkout-btn-lp-ergonomia3"
                                whileHover={!prefersReduced ? { scale: 1.03 } : undefined}
                                whileTap={!prefersReduced ? { scale: 0.97 } : undefined}
                                className="lp3-btn-primary w-full max-w-xl mx-auto text-black font-black text-sm uppercase tracking-widest px-8 py-6 rounded-2xl flex items-center justify-center gap-3 transition-all relative overflow-hidden lp3-shimmer-sweep flex justify-center items-center"
                            >
                                <span className="relative z-10 flex items-center gap-2">
                                    Quero Regular Minha Suspensão Agora <ArrowRight strokeWidth={2.5} size={18} />
                                </span>
                            </motion.a>
                            <p className="text-gray-600 text-xs mt-4 mb-8">Acesso imediato após confirmação do pagamento</p>

                            {/* Trust row */}
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-6 border-t border-white/5">
                                <div className="flex items-center gap-2 text-gray-500 text-xs font-semibold uppercase tracking-wider">
                                    <ShieldCheck size={16} className="text-amber-400/60" /> Garantia Incondicional de 7 Dias
                                </div>
                                <div className="flex items-center gap-2 text-gray-500 text-xs font-semibold uppercase tracking-wider">
                                    <Users size={16} className="text-amber-400/60" /> +3.000 Alunos Formados
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </section>

                {/* ══════════════════════════════════════════ */}
                {/* 9 · MENTOR                                */}
                {/* ══════════════════════════════════════════ */}
                <section className="relative overflow-hidden bg-[#0c1117] border-t border-white/10">
                    <div className="hidden lg:block absolute inset-0 bg-cover bg-left-top bg-no-repeat scale-105"
                        style={{ backgroundImage: `url('/images/alex-webp.webp')`, backgroundPosition: 'left top' }}>
                        <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, transparent 30%, #0c1117 100%)' }} />
                    </div>

                    <div className="container mx-auto max-w-7xl pt-16 pb-0 lg:py-24 relative z-10 flex flex-col lg:flex-row lg:justify-end">
                        <div className="lg:hidden w-full h-[380px] relative px-6 mb-0">
                            <img src="/images/alex-webp.webp"
                                alt="Alex Crepaldi" loading="lazy"
                                className="w-full h-full object-cover object-left-top rounded-t-3xl" />
                            <div className="absolute inset-x-6 bottom-0 top-1/2 bg-gradient-to-t from-[#0c1117] to-transparent" />
                        </div>

                        <motion.div
                            initial={{ opacity: 0, x: 30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.55 }}
                            className="w-full lg:w-[48%] xl:w-[42%] relative px-8 pt-0 pb-16 lg:p-12"
                            style={{
                                background: 'rgba(12,17,23,0.92)',
                                borderLeft: '1px solid rgba(255,255,255,0.05)',
                            }}
                        >
                            {/* Amber accent line left */}
                            <div className="absolute top-0 bottom-0 left-0 w-0.5"
                                style={{ background: 'linear-gradient(180deg, transparent, #f59e0b, transparent)' }} />

                            <span className="text-gray-500 font-bold uppercase tracking-[0.2em] text-[10px] mb-2 block">O Mentor</span>
                            <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tight leading-[1.1] mb-8">
                                <span className="text-white">Alex</span><br />
                                <span className="text-amber-400 lp3-glow-text">Crepaldi</span>
                            </h2>

                            <div className="space-y-6 text-gray-400 text-sm leading-relaxed mb-10">
                                <p>Reconhecido como uma das maiores autoridades brasileiras em mecânica e diagnóstico de <strong className="text-white">suspensões de alta performance</strong> Off-Road.</p>
                                <p>Criador da <strong className="text-white">W-Tech Brasil</strong>, onde aplica um método de imersão de excelência e formação sem igual.</p>
                                <p>Forja mecânicos autônomos e pilotos que buscam a mais pura precisão no acerto Off-Road.</p>
                            </div>

                            <div className="space-y-4 mb-12">
                                {[
                                    { icon: <Wrench size={18} />, t: 'Especialista em Suspensões' },
                                    { icon: <Users size={18} />, t: 'Instrutor de +3.000 Alunos' },
                                    { icon: <ShieldCheck size={18} />, t: 'Consultor Técnico W-Tech' },
                                    { icon: <Star size={18} />, t: 'Referência Nacional' },
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center gap-3">
                                        <div className="text-amber-400">{item.icon}</div>
                                        <span className="text-gray-300 text-sm">{item.t}</span>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </div>
                </section>

                {/* ══════════════════════════════════════════ */}
                {/* 10 · FAQ                                  */}
                {/* ══════════════════════════════════════════ */}
                <section className="py-24 bg-[#111827] border-t border-white/5">
                    <div className="container mx-auto px-6">
                        <motion.div
                            initial={{ opacity: 0, y: 16 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="text-center mb-14"
                        >
                            <SectionLabel>Dúvidas Frequentes</SectionLabel>
                            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tight leading-[1.1] mt-4">
                                Perguntas <span className="text-amber-400">Frequentes</span>
                            </h2>
                        </motion.div>

                        <div className="max-w-3xl mx-auto space-y-3">
                            {faqData.map((f, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 12 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true, margin: '-30px' }}
                                    transition={{ delay: i * 0.06 }}
                                >
                                    <FAQItem q={f.q} a={f.a} />
                                </motion.div>
                            ))}
                        </div>

                        <div className="flex justify-center mt-14">
                            <CTAButton label="Garantir Minha Vaga Agora" />
                        </div>
                    </div>
                </section>

                {/* ══════════════════════════════════════════ */}
                {/* FOOTER                                    */}
                {/* ══════════════════════════════════════════ */}
                <footer className="py-12 border-t border-white/5 text-center" style={{ background: '#080c10' }}>
                    <div className="container mx-auto px-6">
                        <img
                            src="https://w-techstore.com.br/wp-content/uploads/2025/11/logo-w-tech-branca.png"
                            alt="W-Tech"
                            className="h-8 mx-auto mb-5 opacity-30 hover:opacity-60 transition-opacity"
                        />
                        <p className="text-gray-600 text-[10px] font-bold uppercase tracking-[0.4em] mb-1">
                            W-Tech Brasil | Curso Online Suspensão para Pilotos Off-Road
                        </p>
                        <p className="text-gray-700 text-[10px] uppercase tracking-widest">
                            Todos os direitos reservados © {new Date().getFullYear()}
                        </p>
                    </div>
                </footer>

                {/* ══════════════════════════════════════════ */}
                {/* BUYER POPUP                               */}
                {/* ══════════════════════════════════════════ */}
                <motion.div
                    initial={{ opacity: 0, y: 50, scale: 0.9 }}
                    animate={{ opacity: showBuyer ? 1 : 0, y: showBuyer ? 0 : 50, scale: showBuyer ? 1 : 0.9 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    className="fixed bottom-6 left-6 z-[100] p-4 flex items-center gap-4 max-w-sm pointer-events-none rounded-2xl"
                    style={{
                        background: 'rgba(12,17,23,0.95)',
                        border: '1px solid rgba(245,158,11,0.25)',
                        boxShadow: '0 10px 40px rgba(0,0,0,0.5), 0 0 20px rgba(245,158,11,0.10)',
                        backdropFilter: 'blur(16px)',
                    }}
                >
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-black shrink-0"
                        style={{ background: 'linear-gradient(135deg, #f59e0b, #ea580c)' }}>
                        <CheckCircle size={20} strokeWidth={2.5} />
                    </div>
                    <div>
                        <p className="text-xs text-gray-400 mb-0.5">Nova inscrição confirmada</p>
                        <p className="text-sm font-bold text-white leading-tight">
                            {currentBuyer?.name} <span className="font-normal text-amber-400">({currentBuyer?.role})</span>
                        </p>
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">de {currentBuyer?.city}</p>
                    </div>
                </motion.div>

            </div>
        </>
    );
};

export default LPErgonomia3;
