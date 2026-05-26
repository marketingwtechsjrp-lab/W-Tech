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
    const existing = document.querySelector('#lp4-fonts');
    if (!existing) {
        const link = document.createElement('link');
        link.id = 'lp4-fonts';
        link.rel = 'stylesheet';
        link.href = 'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Inter:wght@300;400;500;600;700&display=swap';
        document.head.appendChild(link);
    }
}

/* ─── Inline styles for V4 ─── */
const v4Styles = `
    .lp4 { font-family: 'Inter', sans-serif; }
    .lp4 h1, .lp4 h2, .lp4 h3, .lp4 .display { font-family: 'Outfit', sans-serif; letter-spacing: -0.02em; }
    
    /* Core Backgrounds */
    .lp4-dark { background-color: #0a0a0a; color: #ffffff; }
    .lp4-light { background-color: #ffffff; color: #171717; }
    .lp4-gray { background-color: #f8f9fa; color: #171717; }
    .lp4-gray-darker { background-color: #f1f3f5; color: #171717; }

    /* Cards */
    .lp4-card-light {
        background: #ffffff;
        border: 1px solid #e5e7eb;
        box-shadow: 0 4px 20px rgba(0,0,0,0.03);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .lp4-card-light:hover {
        transform: translateY(-4px);
        box-shadow: 0 12px 30px rgba(0,0,0,0.08);
        border-color: #f59e0b;
    }

    .lp4-card-dark {
        background: #121212;
        border: 1px solid #262626;
        box-shadow: 0 4px 20px rgba(0,0,0,0.2);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .lp4-card-dark:hover {
        transform: translateY(-4px);
        box-shadow: 0 12px 40px rgba(0,0,0,0.4);
        border-color: #f59e0b;
    }

    /* Primary Button */
    .lp4-btn-primary {
        background: linear-gradient(135deg, #f59e0b, #ea580c);
        box-shadow: 0 8px 25px rgba(245,158,11,0.25), inset 0 1px 0 rgba(255,255,255,0.2);
        color: #ffffff !important;
        text-shadow: 0 1px 2px rgba(0,0,0,0.2);
    }
    .lp4-btn-primary:hover {
        box-shadow: 0 12px 30px rgba(245,158,11,0.35), inset 0 1px 0 rgba(255,255,255,0.25);
    }

    /* Gradients and Glows */
    .lp4-hero-glow {
        background: radial-gradient(ellipse 60% 50% at 50% -20%, rgba(245,158,11,0.15) 0%, transparent 70%);
    }
    .lp4-text-gradient {
        background: linear-gradient(to right, #f59e0b, #ea580c);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
    }
    .lp4-divider-light { border-top: 1px solid #e5e7eb; }
    .lp4-divider-dark { border-top: 1px solid #262626; }
`;

/* ─── Animated Hero Glow ─── */
const HeroGlow: React.FC = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 2 }}
            className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[500px] lp4-hero-glow"
        />
    </div>
);

/* ─── Section Label (Theme Aware) ─── */
const SectionLabel: React.FC<{ children: React.ReactNode; isDark?: boolean }> = ({ children, isDark = false }) => (
    <div className="inline-flex items-center justify-center gap-2 mb-4 w-full">
        <div className={`w-8 h-px ${isDark ? 'bg-amber-500/50' : 'bg-amber-500/50'}`} />
        <span className={`font-bold uppercase tracking-[0.25em] text-[10px] sm:text-xs ${isDark ? 'text-amber-400' : 'text-orange-600'}`}>
            {children}
        </span>
        <div className={`w-8 h-px ${isDark ? 'bg-amber-500/50' : 'bg-amber-500/50'}`} />
    </div>
);

/* ─── FAQ Item (Theme Aware) ─── */
const FAQItem: React.FC<{ q: string; a: string; isDark?: boolean }> = ({ q, a, isDark = false }) => {
    const [open, setOpen] = useState(false);
    return (
        <div
            className={`rounded-2xl overflow-hidden transition-all duration-300 cursor-pointer ${isDark ? 'lp4-card-dark' : 'lp4-card-light'}`}
            onClick={() => setOpen(!open)}
        >
            <div className="flex items-center justify-between gap-4 p-6">
                <span className={`font-bold text-sm md:text-base ${isDark ? 'text-white' : 'text-gray-900'}`}>{q}</span>
                <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }} className="shrink-0">
                    <ChevronDown size={20} className={isDark ? (open ? 'text-amber-400' : 'text-gray-500') : (open ? 'text-orange-600' : 'text-gray-400')} />
                </motion.div>
            </div>
            <motion.div initial={false} animate={{ height: open ? 'auto' : 0, opacity: open ? 1 : 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                <div className={`px-6 pb-6 text-sm leading-relaxed border-t pt-4 ${isDark ? 'text-gray-400 border-white/5' : 'text-gray-600 border-gray-100'}`}>
                    {a}
                </div>
            </motion.div>
        </div>
    );
};

/* ─── Main Component ─── */
const LPErgonomia4: React.FC = () => {
    const prefersReduced = useReducedMotion();
    const [timeLeft, setTimeLeft] = useState(7 * 60);
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
    ];

    useEffect(() => {
        const i = setInterval(() => {
            setCurrentBuyer(buyers[Math.floor(Math.random() * buyers.length)]);
            setShowBuyer(true);
            setTimeout(() => setShowBuyer(false), 5000);
        }, 25000);
        return () => clearInterval(i);
    }, []);

    const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

    /* ── Content Data ── */
    const profiles = [
        {
            icon: <Bike size={24} />, tag: 'Para Todo Piloto', title: 'Piloto',
            pain: 'Seus braços cansam rápido, sente falta de performance, tração e equilíbrio. Isso te cansa rápido — não é normal. Este curso é o guia definitivo para o acerto da sua moto.',
        },
        {
            icon: <Mountain size={24} />, tag: 'Trilha - Off Road', title: 'Trilha / Off-Road',
            pain: 'Sua moto perde tração em subidas ou pula nos buracos? Não é falta de preparo físico — a suspensão está ajustada incorretamente para o seu nível.',
        },
        {
            icon: <Wrench size={24} />, tag: 'Serviço Nobre', title: 'Mecânico / Preparador',
            pain: 'Eleve seu nível com informações técnicas para realizar o acerto completo nas motos de seus clientes, cobrando mais pelo serviço diferenciado.',
        },
        {
            icon: <Settings size={24} />, tag: 'Diferencial', title: 'Dono de Oficina',
            pain: 'Seus clientes pedem ajustes que a equipe não sabe resolver. Pare de perder serviço para oficinas especializadas em Off-Road.',
        },
    ];

    const concepts = [
        { icon: <CircleDot size={22} />, title: 'O SAG', desc: 'Ajuste da folga da suspensão. Com o primeiro terço preservado, você garante equilíbrio e segurança — o ponto de partida obrigatório.' },
        { icon: <Activity size={22} />, title: 'Molas', desc: 'O item mais importante. Sustenta o peso equilibrando perfeitamente a absorção e o retorno na trilha.' },
        { icon: <Move size={22} />, title: 'Ergonomia', desc: 'A moto moldada ao seu corpo. Altura do guidão, manetes e pedaleiras — sua integração perfeita à máquina.' },
        { icon: <Disc size={22} />, title: 'Pneus e Tração', desc: 'Onde a suspensão começa. A calibragem e a escolha do pneu são essenciais para ditar todo o comportamento da frente e da traseira.' },
    ];

    const modules = [
        { num: '01', title: 'Boas-Vindas ao Curso', desc: 'Apresentação e visão geral do método', aulas: 4 },
        { num: '02', title: 'Ergonomia', desc: 'Guidão, manetes, pedal e câmbio', aulas: 5 },
        { num: '03', title: 'Equilíbrio', desc: 'Verificação antes de todo o ajuste', aulas: 1 },
        { num: '04', title: 'Molas', desc: 'Rigidez, taxa e escolha correta', aulas: 1 },
        { num: '05', title: 'O SAG', desc: 'Medição e ajuste do zero', aulas: 2 },
        { num: '06', title: 'Óleo e Viscosidades', desc: 'A hidráulica que controla a dinâmica', aulas: 1 },
        { num: '07', title: 'Os Cliques', desc: 'Compressão e retorno: o que fazem', aulas: 2 },
        { num: '08', title: 'Eixo Dianteiro', desc: 'Bengalas e a montagem livre de torção', aulas: 2 },
        { num: '09', title: 'Pneus e Tração', desc: 'Pressão correta e PSI ideal', aulas: 2 },
        { num: '10', title: 'Relação e Corrente', desc: 'Ajustes que multiplicam a sua força', aulas: 2 },
        { num: '11', title: 'Kits e Ferramentas', desc: 'O setup da sua bancada profissional', aulas: 1 },
    ];

    const faqData = [
        { q: 'Preciso ter experiência avançada para iniciar o curso?', a: 'Não. O curso foi estruturado desenhando desde a teoria básica até os cliques avançados. Você vai aprender tudo do mais absoluto zero.' },
        { q: 'Como terei acesso após o pagamento?', a: 'Seu acesso é imediato logo após a aprovação no cartão ou Pix. O link chegará diretamente no seu e-mail.' },
        { q: 'O curso oferece algum tipo de certificado?', a: 'Sim. Você terá um certificado oficial de conclusão da W-Tech documentando sua capacidade de regular suspensões Off-Road.' },
        { q: 'Isso serve para motos Nacionais e Importadas?', a: 'Sim. As teorias de SAG, molas, hidráulica e retorno aplicam-se a 100% das motos off-road, independentemente se são antigas ou lançamentos.' },
    ];

    /* ── Shared CTA Component ── */
    const CTAButton: React.FC<{ label?: string; className?: string }> = ({
        label = 'Garantir Minha Vaga Agora', className = ''
    }) => (
        <motion.button
            onClick={() => scrollTo('cta-final')}
            whileHover={!prefersReduced ? { scale: 1.02 } : undefined}
            whileTap={!prefersReduced ? { scale: 0.98 } : undefined}
            className={`lp4-btn-primary font-bold text-[13px] md:text-[15px] uppercase tracking-widest px-8 md:px-10 py-4 md:py-5 rounded-full flex items-center justify-center gap-3 transition-transform ${className}`}
        >
            {label} <ArrowRight strokeWidth={2.5} size={18} />
        </motion.button>
    );

    return (
        <>
            <style dangerouslySetInnerHTML={{ __html: v4Styles }} />

            <div className="lp4 min-h-screen text-gray-900 bg-white overflow-x-hidden selection:bg-amber-400 selection:text-black">

                {/* ══════════════════════════════════════════ */}
                {/* STICKY BANNER                              */}
                {/* ══════════════════════════════════════════ */}
                <div className="sticky top-0 z-[100] bg-zinc-950 py-2.5 px-4 text-center border-b border-white/10">
                    <div className="container mx-auto flex flex-col md:flex-row items-center justify-center gap-2 md:gap-4 text-[10px] md:text-sm font-bold uppercase tracking-widest text-amber-500">
                        <span className="flex items-center gap-2">
                            <Flame size={14} className="text-orange-500 animate-pulse" />
                            Preço de Lançamento Ativo
                        </span>
                        <span className="hidden md:inline text-white/30">•</span>
                        <span className="text-gray-300">Válido por tempo limitado</span>
                    </div>
                </div>

                {/* ══════════════════════════════════════════ */}
                {/* 1 · HERO (DARK)                           */}
                {/* ══════════════════════════════════════════ */}
                <section className="relative lp4-dark min-h-[90vh] flex items-center pt-10 pb-20">
                    <HeroGlow />
                    <div className="absolute inset-0 bg-[url('/hero-desktop-alex.jpg')] bg-cover bg-center opacity-30 mix-blend-luminosity" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/80 to-transparent" />
                    
                    <div className="container mx-auto px-6 relative z-10 flex flex-col items-center text-center max-w-4xl pt-10 mt-10">
                        
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-6">
                            <span className="inline-block border border-amber-500/30 bg-amber-500/10 text-amber-400 text-[10px] sm:text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full">
                                Novo Curso W-Tech Suspensões
                            </span>
                        </motion.div>

                        <motion.h1 
                            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
                            className="text-4xl md:text-6xl lg:text-[4.5rem] font-black uppercase leading-[1.05] tracking-tight mb-6"
                        >
                            O Único Curso Que Você<br />
                            Precisa Para <span className="lp4-text-gradient">Acertar Sua Moto</span>
                        </motion.h1>

                        <motion.p 
                            initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
                            className="text-gray-300 text-lg md:text-xl leading-relaxed mb-6 max-w-2xl font-light"
                        >
                            Chega de braços pesados e falta de performance. Aprenda do zero a regular SAG, clicks, geometria e hidráulica de qualquer moto Off-Road.
                        </motion.p>

                        <motion.div 
                            initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }}
                            className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto"
                        >
                            <CTAButton label="Garantir Minha Vaga Agora" className="w-full sm:w-auto" />
                            <button onClick={() => scrollTo('quem-somos')} className="w-full sm:w-auto border border-white/20 text-white font-semibold text-sm tracking-widest uppercase px-8 py-4 sm:py-5 rounded-full hover:bg-white/5 transition-colors flex items-center justify-center gap-2">
                                Ver Detalhes <ChevronDown size={18} />
                            </button>
                        </motion.div>

                        {/* Social Proof Badges under CTA */}
                        <motion.div 
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
                            className="mt-12 flex flex-wrap items-center justify-center gap-6 sm:gap-12 text-sm text-gray-500 font-medium"
                        >
                            <div className="flex items-center gap-2">
                                <Users size={18} className="text-amber-500" />
                                <span>+3.000 Alunos Treinados</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Star size={18} className="text-amber-500" />
                                <span>4.9/5 Nota Geral</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <ShieldCheck size={18} className="text-amber-500" />
                                <span>100% Online e Prático</span>
                            </div>
                        </motion.div>
                    </div>
                </section>

                {/* ══════════════════════════════════════════ */}
                {/* 2 · VSL VIDEO / PRESENTATION (LIGHT)      */}
                {/* ══════════════════════════════════════════ */}
                <section id="quem-somos" className="py-20 lp4-light relative z-20 -mt-8 rounded-t-[3rem] shadow-[0_-15px_40px_rgba(0,0,0,0.1)] border-t border-gray-100">
                    <div className="container mx-auto px-6 max-w-5xl">
                        <div className="text-center mb-10">
                            <SectionLabel isDark={false}>Confira Clicando Abaixo</SectionLabel>
                            <h2 className="text-3xl md:text-5xl font-black uppercase text-gray-900 tracking-tight">
                                Entenda Como o <span className="text-orange-600">Curso Funciona</span>
                            </h2>
                        </div>
                        
                        <motion.div 
                            initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                            className="relative w-full aspect-video rounded-3xl overflow-hidden bg-gray-900 shadow-2xl border border-gray-200"
                        >
                            <iframe
                                width="100%" height="100%"
                                src="https://www.youtube.com/embed/rbslvR27uT0?autoplay=0&mute=0&controls=1&rel=0"
                                title="W-Tech Suspensão" frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen className="absolute inset-0 w-full h-full"
                            />
                        </motion.div>
                    </div>
                </section>

                {/* ══════════════════════════════════════════ */}
                {/* 3 · PARA QUEM É (GRAY)                    */}
                {/* ══════════════════════════════════════════ */}
                <section className="py-24 lp4-gray border-y border-gray-200">
                    <div className="container mx-auto px-6">
                        <div className="text-center mb-16 max-w-2xl mx-auto">
                            <SectionLabel isDark={false}>Seu Perfil</SectionLabel>
                            <h2 className="text-3xl md:text-5xl font-black uppercase text-gray-900 tracking-tight mb-4">
                                Não importa se você <span className="text-orange-600">é iniciante</span>
                            </h2>
                            <p className="text-gray-600 text-lg">
                                Desenhamos metodologias precisas para você aprender o básico até os ajustes avançados da forma certa.
                            </p>
                        </div>

                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
                            {profiles.map((p, i) => (
                                <motion.div 
                                    key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                                    className="lp4-card-light p-8 rounded-3xl relative overflow-hidden group"
                                >
                                    <div className="w-14 h-14 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center mb-6 group-hover:bg-orange-600 group-hover:text-white transition-colors duration-300">
                                        {p.icon}
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 mb-2">{p.title}</h3>
                                    <p className="text-gray-600 text-sm leading-relaxed">{p.pain}</p>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ══════════════════════════════════════════ */}
                {/* 4 · CONCEITO (DARK)                       */}
                {/* ══════════════════════════════════════════ */}
                <section className="py-24 lp4-dark relative overflow-hidden">
                    <HeroGlow />
                    <div className="container mx-auto px-6 relative z-10">
                        <div className="grid lg:grid-cols-2 gap-16 items-center max-w-6xl mx-auto">
                            <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
                                <div className="inline-flex items-center gap-2 mb-4">
                                    <div className="w-8 h-px bg-amber-500/50" />
                                    <span className="font-bold uppercase tracking-[0.25em] text-xs text-amber-400">O Segredo</span>
                                </div>
                                <h2 className="text-3xl md:text-5xl font-black uppercase text-white tracking-tight mb-6 leading-tight">
                                    O que faz o <span className="lp4-text-gradient">Acerto Perfeito?</span>
                                </h2>
                                <p className="text-gray-400 text-lg mb-6 leading-relaxed">
                                    Não adianta gastar com motor se a suspensão não copia o terreno, tirando a sua tração e aumentando a sua fadiga no guidão.
                                </p>
                                <div className="bg-amber-500/10 border border-amber-500/20 p-5 rounded-2xl">
                                    <p className="text-amber-200 text-sm font-medium">
                                        <Zap size={16} className="inline mr-2 text-amber-400 -mt-0.5" />
                                        Quando molas, SAG, cliques e pneus trabalham em conjunto, a moto não espalha. Você ganha confiança e usa todo o potencial da moto sem apanhar.
                                    </p>
                                </div>
                            </motion.div>

                            <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="space-y-4">
                                {concepts.map((c, i) => (
                                    <div key={i} className="lp4-card-dark p-5 rounded-2xl flex items-start gap-5">
                                        <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 text-gray-300">
                                            {c.icon}
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-white mb-1">{c.title}</h3>
                                            <p className="text-gray-400 text-sm leading-relaxed">{c.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </motion.div>
                        </div>
                    </div>
                </section>

                {/* ══════════════════════════════════════════ */}
                {/* 5 · MÓDULOS O CURSO (LIGHT)               */}
                {/* ══════════════════════════════════════════ */}
                <section id="modulos" className="py-24 lp4-light">
                    <div className="container mx-auto px-6">
                        <div className="text-center mb-16">
                            <SectionLabel isDark={false}>Conteúdo do Curso</SectionLabel>
                            <h2 className="text-3xl md:text-5xl font-black uppercase text-gray-900 tracking-tight">
                                11 Módulos <span className="text-orange-600">+ Bônus</span>
                            </h2>
                        </div>

                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto mb-16">
                            {modules.map((m, i) => (
                                <motion.div 
                                    key={i} initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}
                                    className="lp4-card-light p-6 rounded-3xl"
                                >
                                    <div className="w-10 h-10 rounded-lg bg-orange-50 text-orange-600 font-black flex items-center justify-center mb-4 text-sm">
                                        {m.num}
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-900 mb-2">{m.title}</h3>
                                    <p className="text-gray-600 text-sm mb-4 leading-relaxed">{m.desc}</p>
                                    <span className="bg-gray-100 text-gray-500 px-3 py-1 text-[10px] uppercase font-bold tracking-widest rounded-full">
                                        {m.aulas} {m.aulas === 1 ? 'Aula' : 'Aulas'}
                                    </span>
                                </motion.div>
                            ))}
                        </div>

                        <div className="relative w-full overflow-hidden mb-12">
                            <Marquee pauseOnHover className="[--duration:50s]">
                                {[
                                    "http://w-techbrasil.com.br/wp-content/uploads/2026/02/CARDS-KWIFY-CURSO-AVANCADO.png",
                                    "http://w-techbrasil.com.br/wp-content/uploads/2026/02/CARDS-KWIFY-CURSO-AVANCADO-1.png",
                                    "http://w-techbrasil.com.br/wp-content/uploads/2026/02/CARDS-KWIFY-CURSO-AVANCADO-2.png",
                                    "http://w-techbrasil.com.br/wp-content/uploads/2026/02/CARDS-KWIFY-CURSO-AVANCADO-3.png",
                                    "/images/lp-curso/oleo-e-viscosidades.png",
                                    "http://w-techbrasil.com.br/wp-content/uploads/2026/02/CARDS-KWIFY-CURSO-AVANCADO-2-1.png",
                                ].map((src, idx) => (
                                    <img key={idx} src={src} alt="Preview do Módulo" className="h-[260px] w-auto mx-4 rounded-xl shadow-lg border border-gray-200" />
                                ))}
                            </Marquee>
                        </div>

                        <div className="flex justify-center">
                            <CTAButton label="Ver Todos os Módulos Agora" />
                        </div>
                    </div>
                </section>

                {/* ══════════════════════════════════════════ */}
                {/* 6 · INSTRUTOR (GRAY/DARK MIX)             */}
                {/* ══════════════════════════════════════════ */}
                <section className="lp4-gray-darker relative overflow-hidden flex items-center lg:min-h-[600px] border-y border-gray-200">
                    <div className="lg:absolute lg:inset-y-0 lg:left-0 lg:w-1/2 w-full h-[400px] lg:h-auto">
                        <img src="/images/alex-webp.webp" alt="Alex Crepaldi" className="w-full h-full object-cover object-top" />
                    </div>
                    <div className="container mx-auto px-6 relative z-10 flex lg:justify-end py-16 lg:py-0">
                        <motion.div 
                            initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
                            className="lp4-card-light lg:w-[48%] xl:w-[42%] p-10 md:p-14 rounded-3xl"
                        >
                            <span className="text-orange-600 font-bold uppercase tracking-widest text-[10px] mb-2 block">Instrutor Principal</span>
                            <h2 className="text-4xl lg:text-5xl font-black uppercase text-gray-900 tracking-tight leading-none mb-6">
                                Alex <span className="text-orange-600">Crepaldi</span>
                            </h2>
                            <p className="text-gray-600 mb-6 leading-relaxed">
                                Fundador da W-Tech Suspensões, é a maior referência nacional em diagnósticos de suspensão Off-Road. 
                                Durante anos forjou metodologia técnica e agora disponibiliza para você tudo de forma enxuta e prática.
                            </p>
                            <ul className="space-y-3 mt-8">
                                <li className="flex items-center gap-3 text-sm font-semibold text-gray-800">
                                    <CheckCircle size={18} className="text-orange-600" /> Consultor Dinâmico de Competições
                                </li>
                                <li className="flex items-center gap-3 text-sm font-semibold text-gray-800">
                                    <CheckCircle size={18} className="text-orange-600" /> Mais de 3.000 profissionais treinados
                                </li>
                                <li className="flex items-center gap-3 text-sm font-semibold text-gray-800">
                                    <CheckCircle size={18} className="text-orange-600" /> Eleva sua técnica de manutenção para alta performance
                                </li>
                            </ul>
                        </motion.div>
                    </div>
                </section>

                {/* ══════════════════════════════════════════ */}
                {/* 7 · ACORDEON FAQ E CTA FINAL (DARK)       */}
                {/* ══════════════════════════════════════════ */}
                <section id="cta-final" className="py-24 lp4-dark relative overflow-hidden">
                    <HeroGlow />
                    <div className="container mx-auto px-6 relative z-10">
                        <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 max-w-7xl mx-auto">
                            
                            {/* FAQ Section */}
                            <div>
                                <SectionLabel isDark={true}>Dúvidas Frequentes</SectionLabel>
                                <h2 className="text-3xl md:text-5xl font-black uppercase text-white tracking-tight mb-8">
                                    Você tem<br />alguma <span className="lp4-text-gradient">dúvida?</span>
                                </h2>
                                <div className="space-y-4">
                                    {faqData.map((faq, i) => (
                                        <FAQItem key={i} q={faq.q} a={faq.a} isDark={true} />
                                    ))}
                                </div>
                            </div>

                            {/* Offer Block */}
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
                                className="lp4-card-dark rounded-3xl p-8 md:p-12 relative overflow-hidden border border-amber-500/30"
                            >
                                {/* Subtle top gradient */}
                                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-600" />

                                <div className="text-center">
                                    <div className="inline-block bg-amber-500/10 text-amber-500 text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full mb-6">
                                        Oferta Especial de Lançamento
                                    </div>
                                    <h3 className="text-2xl font-black text-white mb-2 uppercase tracking-tight">O Curso Completo + Bônus</h3>
                                    <p className="text-gray-400 text-sm mb-8">Mais de R$ 997 em Planilhas e Material Complementar Grátis.</p>

                                    <div className="text-gray-500 font-medium text-sm line-through mb-2">De R$ 1.697,00 por</div>
                                    <div className="text-5xl md:text-6xl font-black text-white mb-2 tracking-tight">
                                        12x <span className="lp4-text-gradient">R$ 34,70</span>
                                    </div>
                                    <p className="text-amber-500 text-sm font-semibold mb-10">ou apenas R$ 347,00 à vista</p>

                                    <button 
                                        onClick={() => window.open('https://pay.kiwify.com.br/19v4nIa', '_blank')}
                                        className="lp4-btn-primary w-full py-5 rounded-2xl font-black text-[15px] uppercase tracking-widest flex items-center justify-center gap-3 transition-transform hover:scale-[1.02]"
                                    >
                                        Quero Minha Vaga Agora <ArrowRight size={20} />
                                    </button>
                                    <p className="text-gray-500 text-xs mt-4">Acesso liberado automaticamente em seu e-mail.</p>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </section>

                {/* ══════════════════════════════════════════ */}
                {/* FOOTER (LIGHT/GRAY)                       */}
                {/* ══════════════════════════════════════════ */}
                <footer className="py-12 lp4-gray border-t border-gray-200 text-center">
                    <div className="container mx-auto px-6">
                        <img 
                            src="https://w-techstore.com.br/wp-content/uploads/2025/11/logo-w-tech-branca.png" 
                            alt="W-Tech" 
                            className="h-8 mx-auto mb-6 invert opacity-50 contrast-200" 
                        />
                        <p className="text-gray-500 text-[10px] font-bold uppercase tracking-[0.3em] mb-2">
                            W-Tech Brasil | Curso Online Suspensão
                        </p>
                        <p className="text-gray-400 text-[10px] tracking-widest">
                            Todos os direitos reservados © {new Date().getFullYear()}
                        </p>
                    </div>
                </footer>

                {/* ══════════════════════════════════════════ */}
                {/* BUYER POPUP (THEME AWARE / LIGHT)         */}
                {/* ══════════════════════════════════════════ */}
                <motion.div
                    initial={{ opacity: 0, y: 50, scale: 0.9 }}
                    animate={{ opacity: showBuyer ? 1 : 0, y: showBuyer ? 0 : 50, scale: showBuyer ? 1 : 0.9 }}
                    className="fixed bottom-6 left-6 z-[100] lp4-card-light p-4 rounded-2xl flex items-center gap-4 max-w-sm pointer-events-none"
                >
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white shrink-0 bg-gradient-to-br from-amber-500 to-orange-600">
                        <CheckCircle size={20} strokeWidth={2.5} />
                    </div>
                    <div>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">Inscrição Efetuada</p>
                        <p className="text-sm font-bold text-gray-900 leading-tight">
                            {currentBuyer?.name} <span className="font-normal text-orange-600">({currentBuyer?.role})</span>
                        </p>
                        <p className="text-[10px] text-gray-500 mt-1">de {currentBuyer?.city}</p>
                    </div>
                </motion.div>

            </div>
        </>
    );
};

export default LPErgonomia4;
