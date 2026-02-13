import React, { useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
    CheckCircle,
    ArrowRight,
    ArrowDown,
    ChevronDown,
    ChevronUp,
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
            {/* 1 · HERO                                    */}
            {/* ═══════════════════════════════════════════ */}
            <section className="relative min-h-[100vh] flex items-center justify-center overflow-hidden">
                {/* BG */}
                <div className="absolute inset-0 z-0">
                    <motion.div
                        initial={{ scale: 1.08 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: shouldAnimate ? 1.2 : 0, ease: 'easeOut' }}
                        className="absolute inset-0 bg-cover bg-center bg-no-repeat bg-[url('/images/hero-ergonomia-mobile.png')] md:bg-[url('/images/hero-ergonomia.png')]"
                    />
                    {/* Stronger overlay requested by user */}
                    <div className="absolute inset-0 bg-black/70 z-10" />
                </div>

                <div className="container mx-auto px-6 relative z-20 pt-20 pb-16">
                    <div className="max-w-4xl">
                        {/* Text */}
                        <motion.div initial="hidden" animate="visible" variants={stagger}>
                            <motion.div variants={v} className="inline-flex items-center gap-2 border border-wtech-gold/30 bg-wtech-gold/10 backdrop-blur-md px-4 py-1.5 rounded-full mb-6">
                                <Zap size={14} className="text-wtech-gold" />
                                <span className="text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] text-wtech-gold">Curso Online — W-Tech Brasil</span>
                            </motion.div>

                            <motion.h1 variants={v} className="text-4xl md:text-5xl lg:text-7xl font-black uppercase tracking-tighter leading-[0.95] mb-6 drop-shadow-lg">
                                Pilote com<br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-wtech-gold via-yellow-500 to-amber-600 drop-shadow-none">Conforto, Controle</span><br />
                                e Performance
                            </motion.h1>

                            <motion.p variants={v} className="text-lg md:text-2xl text-gray-100 leading-relaxed mb-8 max-w-2xl drop-shadow-md">
                                Curso online de <strong className="text-white">Ergonomia para Pilotagem e Preparação de Motos</strong> com Alex Crepaldi e participação especial do piloto Paschoalin.
                            </motion.p>

                            <motion.p variants={v} className="text-sm md:text-base text-gray-300 mb-10 max-w-xl drop-shadow-sm">
                                Descubra como o ajuste correto da posição, guidão, pedaleiras e suspensão transforma sua pilotagem — menos dor, mais controle, mais segurança.
                            </motion.p>

                            <motion.div variants={v} className="flex flex-col sm:flex-row gap-4 justify-start">
                                <motion.button
                                    onClick={() => scrollTo('cta-final')}
                                    whileHover={shouldAnimate ? ctaHover : undefined}
                                    whileTap={shouldAnimate ? ctaTap : undefined}
                                    className="bg-wtech-gold hover:bg-yellow-600 text-black px-10 py-5 rounded-lg font-black text-sm md:text-base uppercase tracking-widest transition-colors flex items-center justify-center gap-3 shadow-[0_0_40px_rgba(212,175,55,0.25)]"
                                >
                                    Quero Ajustar Minha Posição <ArrowRight strokeWidth={3} size={18} />
                                </motion.button>
                                <motion.button
                                    onClick={() => scrollTo('modulos')}
                                    whileHover={shouldAnimate ? { scale: 1.02, borderColor: 'rgba(212,175,55,0.5)' } : undefined}
                                    whileTap={shouldAnimate ? ctaTap : undefined}
                                    className="border border-white/20 text-white px-8 py-5 rounded-lg font-bold text-sm md:text-base uppercase tracking-widest transition-colors flex items-center justify-center gap-3 hover:bg-white/5 backdrop-blur-sm"
                                >
                                    Ver o Que Vou Aprender <ArrowDown size={18} />
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
                    <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-600">Scrolle</span>
                    <div className="w-5 h-8 border-2 border-gray-600 rounded-full flex items-start justify-center p-1 overflow-hidden">
                        <div className="w-1 h-2 bg-wtech-gold rounded-full animate-scrolldown" />
                    </div>
                </motion.div>
            </section>

            {/* ═══════════════════════════════════════════ */}
            {/* 2 · PARA QUEM É                            */}
            {/* ═══════════════════════════════════════════ */}
            <section className="py-24 bg-zinc-950 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-wtech-gold/40 to-transparent" />
                <div className="container mx-auto px-6 relative z-10">
                    <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }} variants={stagger} className="text-center mb-16">
                        <motion.span variants={v} className="text-wtech-gold font-black uppercase tracking-[0.2em] text-xs">Identifique-se</motion.span>
                        <motion.h2 variants={v} className="text-3xl md:text-5xl font-black uppercase mt-4 mb-4">
                            Para Quem é <span className="text-wtech-gold">Este Curso</span>
                        </motion.h2>
                        <motion.p variants={v} className="text-gray-500 max-w-2xl mx-auto">
                            Se você se encaixa em algum desses perfis, esse curso foi feito para você.
                        </motion.p>
                    </motion.div>

                    <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-40px' }} variants={stagger} className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
                        {profiles.map((p, i) => (
                            <motion.div
                                key={i}
                                variants={v}
                                custom={i}
                                whileHover={shouldAnimate ? { ...cardHover, boxShadow: '0 16px 40px rgba(0,0,0,0.4)' } : undefined}
                                whileTap={shouldAnimate ? cardTap : undefined}
                                className="bg-black border border-white/5 rounded-2xl p-8 transition-colors group relative overflow-hidden cursor-default"
                            >
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-wtech-gold to-amber-600 scale-x-0 group-hover:scale-x-100 transition-transform duration-200 origin-left" />
                                <div className="w-14 h-14 rounded-xl bg-wtech-gold/10 flex items-center justify-center text-wtech-gold mb-6 group-hover:scale-110 transition-transform duration-200">
                                    {p.icon}
                                </div>
                                <h3 className="text-lg font-black uppercase text-white mb-3">{p.title}</h3>
                                <p className="text-gray-500 text-sm leading-relaxed">{p.pain}</p>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════ */}
            {/* 3 · O QUE É ERGONOMIA NA MOTO              */}
            {/* ═══════════════════════════════════════════ */}
            <section className="py-24 bg-black relative">
                <div className="container mx-auto px-6">
                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                        {/* Text */}
                        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }} variants={stagger}>
                            <motion.span variants={v} className="text-wtech-red font-black uppercase tracking-[0.2em] text-xs">Entenda o conceito</motion.span>
                            <motion.h2 variants={v} className="text-3xl md:text-5xl font-black uppercase mt-4 mb-8">
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
                <div className="container mx-auto px-6 relative z-10">
                    <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }} variants={stagger} className="text-center mb-8">
                        <motion.span variants={v} className="text-wtech-red font-black uppercase tracking-[0.2em] text-xs">O Curso</motion.span>
                        <motion.h2 variants={v} className="text-3xl md:text-5xl font-black uppercase mt-4 mb-4">
                            Sobre o Curso <span className="text-wtech-gold">Online</span>
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
                            Desenvolvido pela <strong className="text-white">W-Tech Brasil</strong> — referência em cursos técnicos e suspensões — com mais de 15 anos de experiência formando profissionais em todo o Brasil.
                        </p>
                    </Reveal>

                    {/* Modules Timeline */}
                    <div className="relative max-w-3xl mx-auto">
                        {/* Line */}
                        <div className="absolute left-6 md:left-8 top-0 bottom-0 w-px bg-gradient-to-b from-wtech-gold via-wtech-gold/30 to-transparent" />

                        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-40px' }} variants={stagger} className="space-y-6">
                            {modules.map((m, i) => (
                                <motion.div key={i} variants={v} custom={i} className="flex items-start gap-6 pl-1">
                                    <motion.div
                                        whileHover={shouldAnimate ? { scale: 1.12, rotate: 4 } : undefined}
                                        transition={{ duration: 0.15 }}
                                        className="relative z-10 w-12 h-12 md:w-16 md:h-16 rounded-xl bg-black border-2 border-wtech-gold/30 flex items-center justify-center font-black text-wtech-gold text-sm md:text-lg shrink-0 shadow-lg shadow-wtech-gold/5"
                                    >
                                        {m.num}
                                    </motion.div>
                                    <motion.div
                                        whileHover={shouldAnimate ? { ...cardHover, boxShadow: '0 12px 32px rgba(0,0,0,0.3)' } : undefined}
                                        className="bg-zinc-900/50 border border-white/5 rounded-xl p-5 flex-1 transition-colors cursor-default"
                                    >
                                        <h3 className="font-black text-white uppercase text-sm md:text-base mb-1">{m.title}</h3>
                                        <p className="text-gray-500 text-sm">{m.desc}</p>
                                    </motion.div>
                                </motion.div>
                            ))}
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════ */}
            {/* 5 · INSTRUTORES                            */}
            {/* ═══════════════════════════════════════════ */}
            <section className="py-24 bg-black border-t border-white/5">
                <div className="container mx-auto px-6">
                    <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }} variants={stagger} className="text-center mb-16">
                        <motion.span variants={v} className="text-wtech-gold font-black uppercase tracking-[0.2em] text-xs">Quem ensina</motion.span>
                        <motion.h2 variants={v} className="text-3xl md:text-5xl font-black uppercase mt-4">
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
                                        src="https://w-techstore.com.br/wp-content/uploads/2025/12/1.png"
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
                                    <div className="w-full h-full bg-gradient-to-br from-wtech-red/20 to-black flex items-center justify-center">
                                        <div className="text-center">
                                            <Bike size={64} className="text-wtech-red/40 mx-auto mb-4" />
                                            <span className="text-xs text-gray-600 uppercase tracking-widest font-bold">Piloto Convidado</span>
                                        </div>
                                    </div>
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
                </div>
            </section>

            {/* ═══════════════════════════════════════════ */}
            {/* 6 · BENEFÍCIOS E RESULTADOS                */}
            {/* ═══════════════════════════════════════════ */}
            <section className="py-24 bg-zinc-950 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-wtech-gold/40 to-transparent" />
                <div className="container mx-auto px-6 relative z-10">
                    <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }} variants={stagger} className="text-center mb-16">
                        <motion.span variants={v} className="text-wtech-gold font-black uppercase tracking-[0.2em] text-xs">Resultados</motion.span>
                        <motion.h2 variants={v} className="text-3xl md:text-5xl font-black uppercase mt-4 mb-4">
                            O Que Você Vai <span className="text-wtech-gold">Conquistar</span>
                        </motion.h2>
                    </motion.div>

                    <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-40px' }} variants={stagger} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto mb-12">
                        {benefits.map((b, i) => (
                            <motion.div
                                key={i}
                                variants={v}
                                custom={i}
                                whileHover={shouldAnimate ? { ...cardHover, boxShadow: '0 12px 32px rgba(0,0,0,0.3)' } : undefined}
                                whileTap={shouldAnimate ? cardTap : undefined}
                                className="flex items-center gap-4 p-5 bg-black border border-white/5 rounded-xl transition-colors cursor-default"
                            >
                                <div className="text-wtech-gold shrink-0">{b.icon}</div>
                                <span className="font-bold text-sm text-gray-200">{b.text}</span>
                            </motion.div>
                        ))}
                    </motion.div>

                    {/* Tags */}
                    <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="flex flex-wrap justify-center gap-3">
                        {['Motocross', 'Enduro', 'Street', 'Trail', 'Adventure'].map((tag, i) => (
                            <motion.span
                                key={i}
                                variants={v}
                                custom={i}
                                whileHover={shouldAnimate ? { scale: 1.08, y: -2 } : undefined}
                                className="bg-wtech-gold/10 text-wtech-gold border border-wtech-gold/20 px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest cursor-default"
                            >
                                {tag}
                            </motion.span>
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
                        <motion.span variants={v} className="text-wtech-gold font-black uppercase tracking-[0.2em] text-xs">Prova social</motion.span>
                        <motion.h2 variants={v} className="text-3xl md:text-5xl font-black uppercase mt-4">
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
                    <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-40px' }} variants={stagger} className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                        {testimonials.map((t, i) => (
                            <motion.div
                                key={i}
                                variants={v}
                                custom={i}
                                whileHover={shouldAnimate ? { y: -6, boxShadow: '0 16px 40px rgba(0,0,0,0.4)' } : undefined}
                                transition={{ duration: 0.18 }}
                                className="bg-zinc-900/30 border border-white/5 rounded-2xl p-8 relative cursor-default"
                            >
                                <Quote size={32} className="text-wtech-gold/10 absolute top-6 right-6" />
                                <div className="flex items-center gap-1 mb-4">
                                    {[...Array(5)].map((_, j) => (
                                        <Star key={j} size={14} className="text-wtech-gold fill-wtech-gold" />
                                    ))}
                                </div>
                                <p className="text-gray-300 text-sm leading-relaxed mb-6 italic">"{t.text}"</p>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-wtech-gold/10 flex items-center justify-center text-wtech-gold font-black text-sm">
                                        {t.name[0]}
                                    </div>
                                    <div>
                                        <p className="font-bold text-white text-sm">{t.name}</p>
                                        <p className="text-gray-600 text-xs">{t.role}</p>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════ */}
            {/* 8 · FAQ                                     */}
            {/* ═══════════════════════════════════════════ */}
            <section className="py-24 bg-zinc-950 border-t border-white/5">
                <div className="container mx-auto px-6">
                    <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }} variants={stagger} className="text-center mb-16">
                        <motion.span variants={v} className="text-wtech-gold font-black uppercase tracking-[0.2em] text-xs">Dúvidas</motion.span>
                        <motion.h2 variants={v} className="text-3xl md:text-5xl font-black uppercase mt-4">
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
            {/* 9 · CTA FINAL                              */}
            {/* ═══════════════════════════════════════════ */}
            <section id="cta-final" className="py-24 relative overflow-hidden">
                <div className="absolute inset-0 z-0">
                    <div className="absolute inset-0 bg-gradient-to-b from-black via-[#0a0800] to-black z-10" />
                    <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1558981806-ec527fa84c39?q=80&w=1920')] bg-cover bg-center opacity-10" />
                </div>

                {/* Glow */}
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    whileInView={{ scale: 1, opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: shouldAnimate ? 0.8 : 0 }}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-wtech-gold/5 rounded-full blur-[120px] z-0"
                />

                <div className="container mx-auto px-6 relative z-10">
                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: '-60px' }}
                        variants={stagger}
                        className="max-w-3xl mx-auto text-center"
                    >
                        <motion.div variants={scaleIn} className="inline-flex items-center gap-2 border border-wtech-gold/30 bg-wtech-gold/10 backdrop-blur-md px-4 py-1.5 rounded-full mb-8">
                            <Zap size={14} className="text-wtech-gold" />
                            <span className="text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] text-wtech-gold">Transforme sua Pilotagem</span>
                        </motion.div>

                        <motion.h2 variants={v} className="text-3xl md:text-5xl lg:text-6xl font-black uppercase tracking-tighter leading-[0.95] mb-6">
                            Chega de pilotar com <span className="text-wtech-red">dor</span>.<br />
                            Comece a pilotar com <span className="text-transparent bg-clip-text bg-gradient-to-r from-wtech-gold via-yellow-500 to-amber-600">inteligência</span>.
                        </motion.h2>

                        <motion.p variants={v} className="text-gray-400 text-lg mb-10 max-w-xl mx-auto leading-relaxed">
                            Ajuste sua posição, evolua sua técnica e descubra como a ergonomia correta transforma cada quilômetro na moto.
                        </motion.p>

                        <motion.div variants={v}>
                            <motion.button
                                onClick={() => window.open('#', '_blank')}
                                whileHover={shouldAnimate ? { scale: 1.05, boxShadow: '0 0 80px rgba(212,175,55,0.4)' } : undefined}
                                whileTap={shouldAnimate ? ctaTap : undefined}
                                className="bg-wtech-gold hover:bg-yellow-600 text-black px-12 py-5 rounded-lg font-black text-lg uppercase tracking-widest transition-colors inline-flex items-center gap-3 shadow-[0_0_60px_rgba(212,175,55,0.3)]"
                            >
                                Quero Minha Vaga Agora <ArrowRight strokeWidth={3} size={22} />
                            </motion.button>
                        </motion.div>

                        <motion.div variants={v} className="flex flex-wrap justify-center gap-6 mt-10 text-[10px] md:text-xs font-bold uppercase tracking-widest text-gray-600">
                            <span className="flex items-center gap-2"><ShieldCheck size={14} className="text-green-500" /> Pagamento Seguro</span>
                            <span className="flex items-center gap-2"><Clock size={14} className="text-wtech-gold" /> Acesso Imediato</span>
                            <span className="flex items-center gap-2"><Lock size={14} className="text-wtech-gold" /> Garantia de 7 dias</span>
                        </motion.div>
                    </motion.div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════ */}
            {/* FOOTER                                      */}
            {/* ═══════════════════════════════════════════ */}
            <footer className="py-12 bg-stone-950 text-white border-t border-white/10">
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
        </div>
    );
};

export default LPErgonomia;
