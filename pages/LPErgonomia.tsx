import React, { useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Marquee } from '../components/ui/marquee';
import { GridVignetteBackground } from '../components/ui/vignette-grid-background';
import AnimatedShaderBackground from '../components/ui/animated-shader-background';
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
const LPErgonomia: React.FC = () => {
    const { shouldAnimate } = useMotionConfig();
    const v = shouldAnimate ? fadeUp : fadeUpReduced;

    const scrollTo = (id: string) => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    };

    /* ━━━ SECTION DATA ━━━ */

    const profiles = [
        {
            icon: <Bike size={28} />,
            title: 'Piloto Amador',
            pain: 'Sente dor nas costas, braços travando e cansaço excessivo após poucas horas na moto. Sabe que algo está errado, mas não sabe o quê.',
        },
        {
            icon: <Mountain size={28} />,
            title: 'Piloto de Trilha / Enduro',
            pain: 'Perde confiança nas descidas, não consegue manter o controle em terrenos técnicos e termina cada trilha exausto.',
        },
        {
            icon: <Wrench size={28} />,
            title: 'Mecânico / Preparador',
            pain: 'Quer agregar valor ao serviço, mas não domina ergonomia. Ajusta peças sem entender o impacto na posição do piloto.',
        },
        {
            icon: <Settings size={28} />,
            title: 'Dono de Oficina',
            pain: 'Precisa de um diferencial competitivo. Clientes pedem ajustes ergonômicos e a equipe não sabe entregar.',
        },
    ];

    const ergoBlocks = [
        { icon: <Move size={24} />, title: 'Relação Corpo–Moto', desc: 'Como o piloto interage com a moto em cada situação: posição do tronco, braços, pernas e distribuição de peso.' },
        { icon: <Settings size={24} />, title: 'Guidão e Comandos', desc: 'Altura, ângulo e recuo do guidão impactam diretamente no controle e no cansaço dos braços e punhos.' },
        { icon: <CircleDot size={24} />, title: 'Pedaleiras e Apoio', desc: 'Posição das pedaleiras define o ângulo dos joelhos e a capacidade de absorção de impactos em pé.' },
        { icon: <Activity size={24} />, title: 'Suspensão e SAG', desc: 'A suspensão não é só conforto — é a base que permite que todos os outros ajustes funcionem de verdade.' },
        { icon: <Disc size={24} />, title: 'Pneus e Tração', desc: 'A escolha e pressão dos pneus alteram a geometria dinâmica da moto e o comportamento em curva.' },
    ];

    const modules = [
        { num: '01', title: 'Introdução à Ergonomia', desc: 'O que é, por que importa e como muda sua pilotagem.' },
        { num: '02', title: 'Análise de Posição', desc: 'Como avaliar sua postura atual e identificar erros.' },
        { num: '03', title: 'Ajustes de Guidão e Comandos', desc: 'Altura, ângulo, manoplas e alavancas — o impacto direto.' },
        { num: '04', title: 'Pedaleiras e Apoio dos Pés', desc: 'Posicionamento correto para cada estilo de pilotagem.' },
        { num: '05', title: 'SAG e Suspensão Aplicada', desc: 'O acerto de SAG que realmente funciona na prática.' },
        { num: '06', title: 'Pneus, Tração e Geometria', desc: 'Como a escolha de pneu afeta a posição e o controle.' },
        { num: '07', title: 'Equilíbrio e Confiança', desc: 'Exercícios práticos para ganhar controle e segurança.' },
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
        { name: 'Ricardo F.', role: 'Piloto Amador — SP', text: 'Depois do curso, consegui rodar 300km sem dor nas costas pela primeira vez. A diferença nos ajustes é absurda.' },
        { name: 'Marcos S.', role: 'Mecânico — MG', text: 'Comecei a oferecer ajuste ergonômico na oficina e ganhei clientes que antes iam para concessionária. Agregou muito valor.' },
        { name: 'Tiago L.', role: 'Piloto de Enduro — PR', text: 'Minha confiança nas descidas mudou completamente. O SAG correto e a posição certa fizeram eu evoluir muito.' },
        { name: 'Juliana M.', role: 'Pilota Street — RJ', text: 'Eu achava que a moto era desconfortável. Na verdade, eu estava toda errada na posição. Curso essencial!' },
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
        { q: 'O curso serve para motocross, enduro e street?', a: 'Sim. Os princípios de ergonomia são universais. O curso aborda aplicações específicas para cada modalidade.' },
        { q: 'Tem suporte para dúvidas?', a: 'Sim. Você terá acesso a um canal exclusivo para tirar dúvidas diretamente com a equipe W-Tech.' },
        { q: 'Por quanto tempo tenho acesso?', a: 'Acesso vitalício. Você pode reassistir as aulas quantas vezes quiser, para sempre.' },
        { q: 'Tem garantia?', a: 'Sim. Garantia incondicional de 7 dias. Se não gostar, devolvemos 100% do seu investimento.' },
    ];

    return (
        <div className="min-h-screen bg-[#050505] text-white selection:bg-wtech-gold selection:text-black font-sans overflow-x-hidden">

            {/* ═══════════════════════════════════════════ */}
            {/* 0 · BANNER DE ESCASSEZ                     */}
            {/* ═══════════════════════════════════════════ */}
            <div className="bg-gradient-to-r from-wtech-red to-red-900 text-white py-2.5 px-4 text-center sticky top-0 z-50 shadow-md">
                <div className="container mx-auto flex flex-col md:flex-row items-center justify-center gap-2 md:gap-4 text-xs md:text-sm font-bold uppercase tracking-widest">
                    <span className="flex items-center gap-2">
                        <Zap size={16} className="text-yellow-300 animate-pulse" />
                        Últimas vagas do lote atual!
                    </span>
                    <span className="hidden md:inline text-white/50">•</span>
                    <span>O valor promocional expira em breve</span>
                </div>
            </div>

            {/* ═══════════════════════════════════════════ */}
            {/* 1 · HERO COMPLETO COM VSL                  */}
            {/* ═══════════════════════════════════════════ */}
            <section className="relative min-h-[95vh] flex items-center justify-center overflow-hidden pt-12 md:pt-0">
                {/* BG */}
                <div className="absolute inset-0 z-0">
                    <motion.div
                        initial={{ scale: 1.05 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: shouldAnimate ? 1.2 : 0, ease: 'easeOut' }}
                        className="absolute inset-0 bg-cover bg-top lg:bg-center bg-no-repeat bg-[url('/hero-mobile-alex.jpg')] md:bg-[url('/hero-desktop-alex.jpg')]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-black/80 to-black/60 z-10" />
                    {/* Stronger overlay requested by user */}
                    <div className="absolute inset-0 bg-black/40 z-10" />
                </div>

                <div className="container mx-auto px-6 relative z-20 pt-10 pb-20">
                    <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center max-w-7xl mx-auto">

                        {/* Text (Left) */}
                        <motion.div initial="hidden" animate="visible" variants={stagger}>
                            <motion.div variants={v} className="inline-flex items-center gap-2 border border-wtech-gold/30 bg-wtech-gold/10 backdrop-blur-md px-4 py-1.5 rounded-full mb-6 max-w-fit">
                                <Zap size={14} className="text-wtech-gold animate-pulse" />
                                <span className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-wtech-gold">Curso Online Premium — W-Tech</span>
                            </motion.div>

                            <motion.h1 variants={v} className="text-4xl md:text-6xl lg:text-7xl font-black uppercase tracking-tighter leading-[0.9] mb-6 drop-shadow-2xl">
                                Pilote com<br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-wtech-gold via-yellow-400 to-amber-600 drop-shadow-none">Conforto, Controle</span><br />
                                e Performance Total
                            </motion.h1>

                            <motion.p variants={v} className="text-base md:text-xl text-gray-200 leading-relaxed mb-6 max-w-lg">
                                Curso online de <strong className="text-white">Ergonomia para Pilotagem e Preparação</strong> com Alex Crepaldi e participação especial de Paschoalin.
                            </motion.p>

                            <motion.p variants={v} className="text-sm text-gray-400 mb-8 max-w-lg border-l-2 border-wtech-gold pl-4 hidden md:block">
                                Descubra como o ajuste correto da posição, guidão, pedaleiras e suspensão transforma sua pilotagem — menos dor, mais controle, mais segurança.
                            </motion.p>

                            <motion.div variants={v} className="flex flex-col sm:flex-row gap-4">
                                <motion.button
                                    onClick={() => scrollTo('cta-final')}
                                    whileHover={shouldAnimate ? { scale: 1.02, boxShadow: '0 0 40px rgba(212,175,55,0.4)' } : undefined}
                                    whileTap={shouldAnimate ? ctaTap : undefined}
                                    className="bg-gradient-to-r from-wtech-gold to-yellow-600 text-black px-8 py-4 rounded-xl font-black text-sm uppercase tracking-widest transition-all shadow-[0_0_30px_rgba(212,175,55,0.25)] flex items-center justify-center gap-3 w-full sm:w-auto hover:brightness-110 relative overflow-hidden group"
                                >
                                    <div className="absolute inset-0 w-full h-full bg-white/20 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                                    <span className="relative z-10 flex items-center gap-2">Garantir Minha Vaga <ArrowRight strokeWidth={3} size={18} /></span>
                                </motion.button>
                            </motion.div>
                        </motion.div>

                        {/* Video / VSL (Right) */}
                        <motion.div
                            initial="hidden"
                            animate="visible"
                            variants={v}
                            className="relative w-full aspect-video rounded-2xl overflow-hidden border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.6)] group bg-zinc-900"
                        >
                            <iframe
                                width="100%"
                                height="100%"
                                src="https://www.youtube.com/embed/rbslvR27uT0?autoplay=1&mute=1&controls=1&rel=0&loop=1"
                                title="Apresentação W-Tech"
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                className="absolute inset-0 w-full h-full"
                            ></iframe>
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
                    <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-600">Scrolle</span>
                    <div className="w-5 h-8 border-2 border-gray-600 rounded-full flex items-start justify-center p-1 overflow-hidden">
                        <div className="w-1 h-2 bg-wtech-gold rounded-full animate-scrolldown" />
                    </div>
                </motion.div>
            </section >

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
                        <motion.span variants={v} className="text-wtech-gold font-black uppercase tracking-[0.3em] text-[10px] md:text-xs">Identifique-se</motion.span>
                        <motion.h2 variants={v} className="text-4xl md:text-6xl font-black uppercase mt-4 mb-6 tracking-tighter drop-shadow-lg">
                            Para Quem é <span className="text-transparent bg-clip-text bg-gradient-to-r from-wtech-gold to-yellow-500">Este Curso</span>
                        </motion.h2>
                        <motion.p variants={v} className="text-gray-400 max-w-2xl mx-auto">
                            Se você se encaixa em algum desses perfis, esse curso mudará sua forma de pilotar e trabalhar.
                        </motion.p>
                    </motion.div>

                    <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-40px' }} variants={stagger} className="grid grid-cols-1 md:grid-cols-12 auto-rows-[minmax(200px,auto)] gap-4 md:gap-6 max-w-6xl mx-auto">

                        {/* Box 1 - Amador (Large) */}
                        <motion.div
                            variants={v}
                            style={{ backgroundImage: `url('/moto-amador.jpg')` }}
                            className="md:col-span-7 bg-zinc-900/80 bg-blend-overlay bg-cover bg-center border border-white/10 rounded-3xl p-8 md:p-10 transition-all hover:bg-zinc-800/80 group overflow-hidden relative shadow-lg"
                        >
                            <div className="absolute -right-10 -top-10 w-40 h-40 bg-wtech-gold/30 rounded-full blur-[50px] group-hover:bg-wtech-gold/40 transition-colors" />
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-wtech-gold to-amber-600 flex items-center justify-center text-black mb-6 shadow-[0_0_20px_rgba(212,175,55,0.3)] relative z-10">
                                <Bike size={28} />
                            </div>
                            <h3 className="text-2xl lg:text-3xl font-black uppercase text-white mb-4 tracking-tight relative z-10">Piloto Amador</h3>
                            <p className="text-gray-300 text-sm md:text-base leading-relaxed relative z-10">
                                Sente dor nas costas, braços travando e cansaço excessivo após poucas horas na moto. Sabe que algo está errado, mas não sabe como ajustar. Este curso é o seu guia definitivo.
                            </p>
                        </motion.div>

                        {/* Box 2 - Enduro (Medium) */}
                        <motion.div
                            variants={v}
                            style={{ backgroundImage: `url('/moto-enduro.jpg')` }}
                            className="md:col-span-5 bg-zinc-900/80 bg-blend-overlay bg-cover bg-center border border-white/10 rounded-3xl p-8 md:p-10 transition-all hover:bg-zinc-800/80 group overflow-hidden relative shadow-lg"
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-wtech-gold mb-6 group-hover:scale-110 transition-transform relative z-10">
                                <Mountain size={24} />
                            </div>
                            <h3 className="text-xl font-black uppercase text-white mb-3 tracking-tight relative z-10">Trilha / Enduro</h3>
                            <p className="text-gray-300 text-sm leading-relaxed relative z-10">
                                Perde confiança nas descidas, não consegue manter o controle em terrenos técnicos e termina cada trilha exausto.
                            </p>
                        </motion.div>

                        {/* Box 3 - Mecânico (Medium) */}
                        <motion.div
                            variants={v}
                            style={{ backgroundImage: `url('/moto-mecanico.jpg')` }}
                            className="md:col-span-5 bg-zinc-900/80 bg-blend-overlay bg-cover bg-center border border-white/10 rounded-3xl p-8 md:p-10 transition-all hover:bg-zinc-800/80 group overflow-hidden relative shadow-lg"
                        >
                            <div className="absolute inset-0 bg-gradient-to-bl from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-wtech-red mb-6 group-hover:scale-110 transition-transform relative z-10">
                                <Wrench size={24} />
                            </div>
                            <h3 className="text-xl font-black uppercase text-white mb-3 tracking-tight relative z-10">Mecânico / Preparador</h3>
                            <p className="text-gray-300 text-sm leading-relaxed relative z-10">
                                Quer agregar valor ao serviço, mas não domina ergonomia. Ajusta peças sem entender o impacto real na pilotagem.
                            </p>
                        </motion.div>

                        {/* Box 4 - Dono de Oficina (Large) */}
                        <motion.div
                            variants={v}
                            style={{ backgroundImage: `url('/moto-oficina.jpg')` }}
                            className="md:col-span-7 bg-zinc-900/80 bg-blend-overlay bg-cover bg-center border border-white/10 rounded-3xl p-8 md:p-10 transition-all hover:bg-zinc-800/80 group overflow-hidden relative shadow-lg"
                        >
                            <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-wtech-red/30 rounded-full blur-[50px] group-hover:bg-wtech-red/40 transition-colors" />
                            <div className="w-14 h-14 flex items-center justify-center text-white mb-6 border border-white/30 rounded-2xl bg-white/10 backdrop-blur shadow-inner relative z-10">
                                <Settings size={28} />
                            </div>
                            <h3 className="text-2xl lg:text-3xl font-black uppercase text-white mb-4 tracking-tight relative z-10">Dono de Oficina</h3>
                            <p className="text-gray-300 text-sm md:text-base leading-relaxed relative z-10">
                                Precisa de um diferencial competitivo. Clientes pedem ajustes ergonômicos e a equipe não sabe entregar um trabalho de classe mundial. Destaque-se da concorrência local.
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
                            Quero Transformar Minha Pilotagem <ArrowRight strokeWidth={3} size={18} />
                        </motion.button>
                    </motion.div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════ */}
            {/* 3 · O QUE É ERGONOMIA NA MOTO              */}
            {/* ═══════════════════════════════════════════ */}
            <section className="py-24 bg-black relative overflow-hidden">
                <div className="absolute inset-0 bg-cover bg-center bg-no-repeat bg-[url('/blueprint-moto.jpg')] opacity-40" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-black/60 pointer-events-none" />
                <div className="container mx-auto px-6 relative z-10">
                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                        {/* Text */}
                        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }} variants={stagger}>
                            <motion.span variants={v} className="text-wtech-red font-black uppercase tracking-[0.3em] text-[10px] md:text-xs">Entenda o conceito</motion.span>
                            <motion.h2 variants={v} className="text-4xl md:text-6xl font-black uppercase mt-4 mb-8 tracking-tighter">
                                O que é <span className="text-wtech-gold">Ergonomia</span> na Moto?
                            </motion.h2>
                            <motion.p variants={v} className="text-gray-300 text-lg leading-relaxed mb-4">
                                Ergonomia é a ciência de adaptar a moto ao corpo do piloto — e não o contrário.
                            </motion.p>
                            <motion.p variants={v} className="text-gray-500 leading-relaxed mb-8">
                                Quando guidão, pedaleiras, banco, suspensão e pneus estão ajustados para o <strong className="text-white">seu corpo e estilo de pilotagem</strong>, tudo muda:
                                você pilota com menos esforço, mais controle e mais confiança. A dor vai embora, a fadiga diminui e a performance aparece de forma natural.
                            </motion.p>
                            <motion.div
                                variants={v}
                                whileHover={shouldAnimate ? { scale: 1.02 } : undefined}
                                className="inline-flex items-center gap-3 bg-wtech-gold/10 border border-wtech-gold/20 px-5 py-3 rounded-lg transition-colors"
                            >
                                <Zap size={18} className="text-wtech-gold" />
                                <span className="text-sm font-bold text-wtech-gold">A moto ajustada para você rende mais do que qualquer peça cara.</span>
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
            {/* 4 · SOBRE O CURSO ONLINE                    */}
            {/* ═══════════════════════════════════════════ */}
            <section id="modulos" className="py-24 bg-zinc-950 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-wtech-red/40 to-transparent" />
                <div className="container mx-auto px-6 relative z-10 mb-12">
                    <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }} variants={stagger} className="text-center mb-8">
                        <motion.span variants={v} className="text-wtech-red font-black uppercase tracking-[0.3em] text-[10px] md:text-xs">Plataforma Exclusiva</motion.span>
                        <motion.h2 variants={v} className="text-4xl md:text-6xl font-black uppercase mt-4 mb-6 tracking-tighter">
                            O conteúdo que você <br className="hidden md:block" /> acessará na nossa <span className="text-wtech-gold">Área de Membros</span>
                        </motion.h2>
                    </motion.div>

                    {/* Online features bar */}
                    <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="grid sm:grid-cols-3 gap-4 max-w-3xl mx-auto mb-16">
                        {[
                            { icon: <Monitor size={20} />, text: '100% Online' },
                            { icon: <Play size={20} />, text: 'Aulas Gravadas' },
                            { icon: <Infinity size={20} />, text: 'Acesso Vitalício' },
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

                    <Reveal>
                        <p className="text-center text-gray-400 max-w-2xl mx-auto mb-16 leading-relaxed">
                            Acesso imediato a todos os módulos abaixo na nossa <strong className="text-white">plataforma online exclusiva</strong>, <br className="hidden md:block" /> onde as aulas gravadas em estúdio com a qualidade W-Tech estarão sempre à sua disposição.
                        </p>
                    </Reveal>
                </div>

                {/* Modules Carousel */}
                <div className="relative w-full overflow-hidden flex flex-col gap-6">
                    <Marquee pauseOnHover className="[--duration:60s]">
                        {[
                            "http://w-techbrasil.com.br/wp-content/uploads/2026/02/CARDS-KWIFY-CURSO-AVANCADO.png",
                            "http://w-techbrasil.com.br/wp-content/uploads/2026/02/CARDS-KWIFY-CURSO-AVANCADO-1.png",
                            "http://w-techbrasil.com.br/wp-content/uploads/2026/02/CARDS-KWIFY-CURSO-AVANCADO-2.png",
                            "http://w-techbrasil.com.br/wp-content/uploads/2026/02/CARDS-KWIFY-CURSO-AVANCADO-3.png",
                            "http://w-techbrasil.com.br/wp-content/uploads/2026/02/CARDS-KWIFY-CURSO-AVANCADO-4.png",
                            "http://w-techbrasil.com.br/wp-content/uploads/2026/02/CARDS-KWIFY-CURSO-AVANCADO-2-1.png",
                            "http://w-techbrasil.com.br/wp-content/uploads/2026/02/CARDS-KWIFY-CURSO-AVANCADO-3-1.png",
                            "http://w-techbrasil.com.br/wp-content/uploads/2026/02/CARDS-KWIFY-CURSO-AVANCADO-4-1.png",
                        ].map((src, idx) => (
                            <img
                                key={`row1-${idx}`}
                                src={src}
                                alt={`Módulo ${idx + 1}`}
                                className="h-[250px] md:h-[300px] w-auto rounded-2xl border border-white/10 shadow-xl object-contain hover:scale-105 transition-transform duration-300"
                            />
                        ))}
                    </Marquee>

                    <div className="pointer-events-none absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-zinc-950 to-transparent"></div>
                    <div className="pointer-events-none absolute inset-y-0 right-0 w-1/4 bg-gradient-to-l from-zinc-950 to-transparent"></div>
                </div>

                {/* CTA Intermediário 2 */}
                <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="container mx-auto px-6 flex justify-center mt-12 pb-4 relative z-10">
                    <motion.button
                        onClick={() => scrollTo('cta-final')}
                        variants={v}
                        whileHover={shouldAnimate ? { scale: 1.02, boxShadow: '0 0 30px rgba(230,36,29,0.4)' } : undefined}
                        whileTap={shouldAnimate ? ctaTap : undefined}
                        className="bg-gradient-to-r from-[#ba1d18] to-[#E6241D] text-white px-8 py-4 rounded-xl font-black text-sm uppercase tracking-widest hover:from-[#d1221c] hover:to-[#ff2820] transition-all shadow-[0_0_20px_rgba(230,36,29,0.3)] flex items-center justify-center gap-3"
                    >
                        Quero Acesso a Todo o Conteúdo <ArrowRight strokeWidth={3} size={18} />
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
                                        src="http://w-techbrasil.com.br/wp-content/uploads/2026/02/foto-alex-crepaldi.png"
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
                                        Referência em ergonomia aplicada, preparação de motos e suspensões on-road e off-road. Mais de <strong className="text-white">3.000 profissionais capacitados</strong> e 15+ anos de experiência em cursos técnicos no Brasil.
                                    </p>
                                    <div className="p-4 bg-black/50 border-l-4 border-wtech-gold text-sm text-gray-400 rounded-r-lg">
                                        👉 Domínio técnico: ergonomia, ajuste de posição, SAG, suspensão e preparação completa.
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
                                        src="/paschoalin.jpg"
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
                                        Piloto com vasta experiência em competições e provas de alto nível. Traz a <strong className="text-white">validação prática</strong> de quem aplica ergonomia em situações reais de alta performance e exigência máxima.
                                    </p>
                                    <div className="p-4 bg-black/50 border-l-4 border-wtech-red text-sm text-gray-400 rounded-r-lg">
                                        👉 Foco em performance: aplicação real dos ajustes em pista, trilha e provas.
                                    </div>
                                </div>
                            </motion.div>
                        </Reveal>
                    </div>

                    {/* Combo callout */}
                    <Reveal variant="scaleIn" delay={1}>
                        <div className="max-w-3xl mx-auto mt-10 bg-gradient-to-r from-wtech-gold/10 via-black to-wtech-red/10 border border-white/5 rounded-xl p-6 text-center">
                            <p className="text-sm font-bold text-gray-300">
                                <span className="text-wtech-gold">Teoria sólida</span> + <span className="text-wtech-red">Prática real</span> = A combinação perfeita para você dominar ergonomia de verdade.
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
                            Aprender com os Melhores <ArrowRight strokeWidth={3} size={18} />
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
                                <div className="pt-4 border-t border-white/5 flex flex-col md:flex-row md:items-end justify-between gap-1 relative z-10 mt-2">
                                    <span className="text-gray-500 font-bold uppercase text-[10px] tracking-widest line-through decoration-red-500/50">
                                        De R$ {bonus.value}
                                    </span>
                                    <span className="text-2xl font-black text-wtech-gold tracking-tighter">
                                        POR R$ 0,00
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
                            {testimonials.map((t, i) => (
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
                                    <p className="text-gray-300 text-sm leading-relaxed mb-6 italic whitespace-normal">"{t.text}"</p>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-wtech-gold/10 flex items-center justify-center text-wtech-gold font-black text-sm shrink-0">
                                            {t.name[0]}
                                        </div>
                                        <div className="whitespace-normal">
                                            <p className="font-bold text-white text-sm">{t.name}</p>
                                            <p className="text-gray-600 text-xs">{t.role}</p>
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
            <section id="cta-final" className="py-24 md:py-32 relative overflow-hidden bg-black flex items-center justify-center min-h-[90vh]">
                <AnimatedShaderBackground />

                <div className="container mx-auto px-6 relative z-10 flex justify-center">
                    {/* Pricing Card - Reference Layout */}
                    <div className="w-full max-w-4xl bg-[#0a0a0a]/90 backdrop-blur-xl border border-[#E6241D]/20 rounded-2xl relative shadow-[0_0_120px_rgba(230,36,29,0.15)] overflow-hidden p-8 md:p-14 text-center transition-all duration-500 hover:shadow-[0_0_150px_rgba(230,36,29,0.25)]">
                        {/* Inner Red Glow Spotlight */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#E6241D]/15 blur-[100px] rounded-full pointer-events-none" />

                        {/* Top Line */}
                        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-red-600 via-[#E6241D] to-orange-500 z-10" />

                        {/* Logo */}
                        <div className="flex justify-center mb-8">
                            <img src="http://w-techbrasil.com.br/wp-content/uploads/2026/02/logo-branca.png" alt="W-Tech Work Suspension" loading="lazy" className="h-10 md:h-12 object-contain" />
                        </div>

                        <span className="text-wtech-gold font-bold uppercase tracking-[0.2em] text-[10px] md:text-xs block mb-4">
                            Oferta Especial da Turma Atual
                        </span>

                        <h2 className="text-2xl md:text-4xl font-black text-white mb-8 tracking-tight">
                            Garanta Condições Especiais
                        </h2>

                        <div className="text-gray-400 font-bold uppercase text-xs md:text-sm tracking-[0.15em] mb-2 line-through decoration-red-500/70 decoration-2">
                            De R$ 1.697,00 por
                        </div>

                        <div className="mb-2 flex flex-col items-center justify-center">
                            <span className="text-4xl md:text-6xl font-black text-white tracking-tighter drop-shadow-lg">12x R$ 34,70</span>
                        </div>
                        <div className="text-wtech-red/90 font-bold text-xs md:text-sm mb-10">
                            ou R$ 347,00 à vista no Pix/Cartão
                        </div>

                        {/* Timer Mockup */}
                        <div className="flex items-center justify-center gap-3 sm:gap-4 mb-8">
                            <div className="flex flex-col items-center">
                                <div className="bg-[#111] border border-white/10 rounded-xl w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center text-2xl font-black text-white shadow-inner">11</div>
                                <span className="text-[8px] sm:text-[10px] text-gray-500 uppercase tracking-widest mt-2">Horas</span>
                            </div>
                            <span className="text-xl sm:text-2xl font-black text-gray-700 -mt-6">:</span>
                            <div className="flex flex-col items-center">
                                <div className="bg-[#111] border border-white/10 rounded-xl w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center text-2xl font-black text-white shadow-inner">58</div>
                                <span className="text-[8px] sm:text-[10px] text-gray-500 uppercase tracking-widest mt-2">Minutos</span>
                            </div>
                            <span className="text-xl sm:text-2xl font-black text-gray-700 -mt-6">:</span>
                            <div className="flex flex-col items-center">
                                <div className="bg-[#111] border border-white/10 rounded-xl w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center text-2xl font-black text-white shadow-inner">55</div>
                                <span className="text-[8px] sm:text-[10px] text-gray-500 uppercase tracking-widest mt-2">Segundos</span>
                            </div>
                        </div>

                        <p className="text-gray-400 text-sm md:text-base mb-10 max-w-xl mx-auto leading-relaxed">
                            Enquanto esta página estiver no ar, você garante acesso por 1 Ano com todos os bônus inclusos.
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

                        <motion.button
                            onClick={() => window.open('#', '_blank')}
                            whileHover={shouldAnimate ? { scale: 1.02, boxShadow: '0 0 40px rgba(230,36,29,0.3)' } : undefined}
                            whileTap={shouldAnimate ? { scale: 0.98 } : undefined}
                            className="w-full max-w-xl mx-auto bg-gradient-to-r from-[#ba1d18] to-[#E6241D] hover:from-[#d1221c] hover:to-[#ff2820] text-white px-8 py-5 sm:py-6 rounded-2xl font-black text-sm md:text-[15px] uppercase tracking-widest transition-all mb-8 shadow-xl"
                        >
                            Quero minha vaga com essas condições
                        </motion.button>

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
                    style={{ backgroundImage: `url('http://w-techbrasil.com.br/wp-content/uploads/2026/02/backgound-alex-crepaldi.png')`, backgroundPosition: 'left top' }}
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-zinc-950/40 to-zinc-950 z-0" />
                </div>

                <div className="container mx-auto max-w-7xl pt-16 pb-0 lg:py-24 relative z-10 flex flex-col lg:flex-row lg:justify-end">

                    {/* Imagem Mobile (Escondida no Desktop) */}
                    <div className="lg:hidden w-full h-[400px] sm:h-[500px] relative -mx-0 mb-0 px-6">
                        <img src="http://w-techbrasil.com.br/wp-content/uploads/2026/02/backgound-alex-crepaldi.png" alt="Alex Crepaldi" loading="lazy" className="w-full h-full object-cover object-left-top rounded-t-3xl" />
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
                        src="https://w-techstore.com.br/wp-content/uploads/2025/11/logo-w-tech-branca.png"
                        alt="W-Tech"
                        className="h-8 md:h-10 mx-auto mb-6"
                    />
                    <p className="text-gray-600 text-[10px] font-bold uppercase tracking-[0.4em] mb-2">W-Tech Brasil | Curso Online de Ergonomia</p>
                    <p className="text-gray-700 text-[10px] uppercase tracking-widest">
                        Todos os direitos reservados © {new Date().getFullYear()}
                    </p>
                </div>
            </footer>
        </div >
    );
};

export default LPErgonomia;
