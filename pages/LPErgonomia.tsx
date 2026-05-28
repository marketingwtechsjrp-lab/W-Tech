import React, { useState, useEffect, useRef } from 'react';
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
const LPErgonomia: React.FC = () => {
    const { shouldAnimate } = useMotionConfig();
    const v = shouldAnimate ? fadeUp : fadeUpReduced;

    const scrollTo = (id: string) => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    };

    /* ─── SALES HOOKS HOOKS ─── */
    const [videoPlaying, setVideoPlaying] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);

    const handlePlayVideo = () => {
        if (videoRef.current) {
            videoRef.current.play();
            setVideoPlaying(true);
        }
    };

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
        { q: 'Tem suporte para dúvidas?', a: 'Sim. Você terá acesso a um canal exclusivo para tirar dúvidas de regulagens de suspensão diretamente com a equipe W-Tech.' },
        { q: 'Por quanto tempo tenho acesso?', a: 'O seu acesso é válido por 12 meses (1 Ano). Você pode reassistir as aulas quantas vezes quiser durante este período.' },
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

                            <motion.p variants={v} className="text-sm text-gray-400 mb-8 max-w-lg border-l-2 border-wtech-gold pl-4 hidden md:block">
                                Seus braços cansam rápido, sente falta de performance ou tração, desempenho e equilíbrio. E isso te cansa rápido — isso não é normal. Quer melhorar e não sabe por onde começar? Este curso é o guia definitivo do zero para o acerto da sua moto.
                            </motion.p>
                        </motion.div>

                        <motion.div initial="hidden" animate="visible" variants={stagger} className="flex flex-col gap-6 order-2 lg:col-start-2 lg:row-start-1 lg:row-span-2">
                            <motion.div
                                variants={v}
                                className="relative w-full aspect-video rounded-2xl overflow-hidden border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.6)] bg-black group cursor-pointer"
                                onClick={handlePlayVideo}
                            >
                                <video
                                    ref={videoRef}
                                    poster="/images/vsl-thumbnail.jpg"
                                    controls={videoPlaying}
                                    playsInline
                                    className="w-full h-full object-cover"
                                    onPlay={() => setVideoPlaying(true)}
                                    onPause={() => setVideoPlaying(false)}
                                >
                                    <source src="https://niesvylxwfaffgnmdoql.supabase.co/storage/v1/object/public/site-assets/vsl-suspensao.mp4" type="video/mp4" />
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
                                className="bg-gradient-to-r from-wtech-gold to-yellow-600 text-black px-8 py-5 rounded-xl font-black text-sm md:text-base uppercase tracking-[0.15em] transition-all shadow-[0_0_40px_rgba(212,175,55,0.2)] flex items-center justify-center gap-3 w-full hover:brightness-110 relative overflow-hidden group"
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
                        <motion.span variants={v} className="text-wtech-gold font-black uppercase tracking-[0.3em] text-[10px] md:text-xs">Você se identifica?</motion.span>
                        <motion.h2 variants={v} className="text-4xl md:text-6xl font-black uppercase mt-4 mb-6 tracking-tighter drop-shadow-lg">
                            Este Curso é <span className="text-transparent bg-clip-text bg-gradient-to-r from-wtech-gold to-yellow-500">Para Você</span>
                        </motion.h2>
                        <motion.p variants={v} className="text-gray-400 max-w-2xl mx-auto text-base">
                            Não importa se você é piloto, trilheiro, mecânico ou dono de oficina.<br className="hidden md:block" /> Se você já sentiu que a sua moto pode dar mais — este curso é a resposta.
                        </motion.p>
                    </motion.div>

                    <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-40px' }} variants={stagger} className="grid grid-cols-1 md:grid-cols-12 auto-rows-[minmax(220px,auto)] gap-4 md:gap-6 max-w-6xl mx-auto">

                        {/* Box 1 - Piloto (qualquer nível) - Large */}
                        <motion.div
                            variants={v}
                            style={{ backgroundImage: `url('/images/lp-curso/1.jpg')` }}
                            className="md:col-span-7 bg-zinc-900/80 bg-blend-overlay bg-cover bg-center border border-white/10 rounded-3xl p-8 md:p-10 transition-all hover:bg-zinc-800/80 group overflow-hidden relative shadow-lg cursor-default"
                        >
                            <div className="absolute inset-0 bg-black/65 pointer-events-none z-0" />
                            <div className="absolute -right-10 -top-10 w-40 h-40 bg-wtech-gold/30 rounded-full blur-[50px] group-hover:bg-wtech-gold/50 transition-colors duration-300 z-0" />
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-wtech-gold to-amber-600 flex items-center justify-center text-black mb-5 shadow-[0_0_20px_rgba(212,175,55,0.3)] relative z-10 group-hover:scale-110 transition-transform duration-200">
                                <Bike size={28} />
                            </div>
                            <div className="inline-block text-[9px] font-black uppercase tracking-widest text-wtech-gold/80 border border-wtech-gold/30 px-2 py-1 rounded mb-3 relative z-10">Para Todo Piloto</div>
                            <h3 className="text-2xl lg:text-3xl font-black uppercase text-white mb-4 tracking-tight relative z-10">Piloto</h3>
                            <p className="text-gray-300 text-sm md:text-base leading-relaxed relative z-10">
                                Sente a moto "quicar" demais e os braços cansarem rápido. Sabe que algo está errado na suspensão, <strong className="text-white">mas não sabe por onde começar — nem quantos cliques dar.</strong> Este curso é o seu guia definitivo do zero ao acerto.
                            </p>
                        </motion.div>

                        {/* Box 2 - Enduro (Medium) */}
                        <motion.div
                            variants={v}
                            style={{ backgroundImage: `url('/images/lp-curso/2.jpg')` }}
                            className="md:col-span-5 bg-zinc-900/80 bg-blend-overlay bg-cover bg-center border border-white/10 rounded-3xl p-8 md:p-10 transition-all hover:bg-zinc-800/80 group overflow-hidden relative shadow-lg cursor-default"
                        >
                            <div className="absolute inset-0 bg-black/65 pointer-events-none z-0" />
                            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity z-0" />
                            <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-wtech-gold mb-4 group-hover:scale-110 transition-transform relative z-10">
                                <Mountain size={24} />
                            </div>
                            <div className="inline-block text-[9px] font-black uppercase tracking-widest text-gray-400 border border-white/10 px-2 py-1 rounded mb-3 relative z-10">Trilha & Enduro</div>
                            <h3 className="text-xl font-black uppercase text-white mb-3 tracking-tight relative z-10">Trilha / Enduro</h3>
                            <p className="text-gray-300 text-sm leading-relaxed relative z-10">
                                Perde tração em subidas, sofre com fim de curso em saltos e buracos. Termina a trilha <strong className="text-white">exausto antes do tempo</strong> — não é falta de preparo físico. É a suspensão errada.
                            </p>
                        </motion.div>

                        {/* Box 3 - Mecânico (Medium) */}
                        <motion.div
                            variants={v}
                            style={{ backgroundImage: `url('/images/lp-curso/3.jpg')` }}
                            className="md:col-span-5 bg-zinc-900/80 bg-blend-overlay bg-cover bg-center border border-white/10 rounded-3xl p-8 md:p-10 transition-all hover:bg-zinc-800/80 group overflow-hidden relative shadow-lg cursor-default"
                        >
                            <div className="absolute inset-0 bg-black/65 pointer-events-none z-0" />
                            <div className="absolute inset-0 bg-gradient-to-bl from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity z-0" />
                            <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-wtech-red mb-4 group-hover:scale-110 transition-transform relative z-10">
                                <Wrench size={24} />
                            </div>
                            <div className="inline-block text-[9px] font-black uppercase tracking-widest text-gray-400 border border-white/10 px-2 py-1 rounded mb-3 relative z-10">Serviço Nobre</div>
                            <h3 className="text-xl font-black uppercase text-white mb-3 tracking-tight relative z-10">Mecânico / Preparador</h3>
                            <p className="text-gray-300 text-sm leading-relaxed relative z-10">
                                Quer agregar o serviço mais lucrativo da oficina: o acerto de suspensão. Saia das revisões básicas e <strong className="text-white">entre no mundo das bengalas, amortecedores e preparações</strong> — e ainda ensine seus clientes.
                            </p>
                        </motion.div>

                        {/* Box 4 - Dono de Oficina (Large) */}
                        <motion.div
                            variants={v}
                            style={{ backgroundImage: `url('/images/lp-curso/4.jpg')` }}
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
                <div className="absolute inset-0 bg-cover bg-center bg-no-repeat bg-[url('/blueprint-moto.jpg')] opacity-40" />
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
                            "http://w-techbrasil.com.br/wp-content/uploads/2026/02/CARDS-KWIFY-CURSO-AVANCADO.png",
                            "http://w-techbrasil.com.br/wp-content/uploads/2026/02/CARDS-KWIFY-CURSO-AVANCADO-1.png",
                            "http://w-techbrasil.com.br/wp-content/uploads/2026/02/CARDS-KWIFY-CURSO-AVANCADO-2.png",
                            "http://w-techbrasil.com.br/wp-content/uploads/2026/02/CARDS-KWIFY-CURSO-AVANCADO-3.png",
                            "http://w-techbrasil.com.br/wp-content/uploads/2026/02/CARDS-KWIFY-CURSO-AVANCADO-4.png",
                            "/images/lp-curso/oleo-e-viscosidades.png",
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
                <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="container mx-auto px-6 flex justify-center mt-8 pb-4 relative z-10">
                    <motion.button
                        onClick={() => scrollTo('cta-final')}
                        variants={v}
                        whileHover={shouldAnimate ? { scale: 1.02, boxShadow: '0 0 30px rgba(230,36,29,0.4)' } : undefined}
                        whileTap={shouldAnimate ? ctaTap : undefined}
                        className="bg-gradient-to-r from-[#ba1d18] to-[#E6241D] text-white px-8 py-4 rounded-xl font-black text-sm uppercase tracking-widest hover:from-[#d1221c] hover:to-[#ff2820] transition-all shadow-[0_0_20px_rgba(230,36,29,0.3)] flex items-center justify-center gap-3"
                    >
                        Quero Acesso a Todo Este Conteúdo <ArrowRight strokeWidth={3} size={18} />
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
                                        src="/paschoalin.jpg"
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
                            Lançamento — Valor Especial por Tempo Limitado
                        </span>

                        <h2 className="text-2xl md:text-4xl font-black text-white mb-3 tracking-tight">
                            Garanta Sua Vaga <span className="text-wtech-gold">Agora</span>
                        </h2>
                        <p className="text-gray-400 text-sm mb-8 max-w-lg mx-auto">
                            11 módulos técnicos + Módulo Bônus com Paschoalin + Planilhas de Regulagem. Tudo por um investimento de lançamento.
                        </p>

                        <div className="text-gray-400 font-bold uppercase text-xs md:text-sm tracking-[0.15em] mb-2 line-through decoration-red-500/70 decoration-2">
                            De R$ 997,00 por
                        </div>

                        <div className="mb-2 flex flex-col items-center justify-center">
                            <span className="text-4xl md:text-6xl font-black text-white tracking-tighter drop-shadow-lg">12x R$ 34,70</span>
                        </div>
                        <div className="text-wtech-red/90 font-bold text-xs md:text-sm mb-10">
                            ou R$ 347,00 à vista no Pix/Cartão
                        </div>

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

                        <motion.button
                            onClick={() => window.open('https://pay.kiwify.com.br/19v4nIa', '_blank')}
                            whileHover={shouldAnimate ? { scale: 1.02, boxShadow: '0 0 40px rgba(230,36,29,0.5)' } : undefined}
                            whileTap={shouldAnimate ? { scale: 0.98 } : undefined}
                            className="w-full max-w-xl mx-auto bg-gradient-to-r from-[#ba1d18] to-[#E6241D] hover:from-[#d1221c] hover:to-[#ff2820] text-white px-8 py-5 sm:py-6 rounded-2xl font-black text-sm md:text-[15px] uppercase tracking-widest transition-all mb-4 shadow-xl relative overflow-hidden group"
                        >
                            <div className="absolute inset-0 w-full h-full bg-white/10 -translate-x-full group-hover:translate-x-0 transition-transform duration-500" />
                            <span className="relative z-10">Quero Regular Minha Suspensão Agora</span>
                        </motion.button>
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
                    <p className="text-gray-600 text-[10px] font-bold uppercase tracking-[0.4em] mb-2">W-Tech Brasil | Curso Online Suspensão para Pilotos Off-Road</p>
                    <p className="text-gray-700 text-[10px] uppercase tracking-widest">
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

        </div >
    );
};

export default LPErgonomia;
