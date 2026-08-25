import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import { distributeLead } from '../lib/leadDistribution';
import { getLeadTrackingFields } from '../lib/tracking';
import { triggerWebhook } from '../lib/webhooks';
import { GridVignetteBackground } from '../components/ui/vignette-grid-background';
import {
    CheckCircle,
    ArrowRight,
    MapPin,
    Calendar,
    Award,
    Settings,
    Zap,
    AlertOctagon,
    Globe,
    Phone,
    ShieldCheck,
    Cpu,
    Target,
    Activity,
    Clock
} from 'lucide-react';

/* ─── Reduced Motion Hook ─── */
const useMotionConfig = () => {
    const prefersReduced = useReducedMotion();
    return {
        shouldAnimate: !prefersReduced,
        duration: prefersReduced ? 0 : 0.4,
        staggerDelay: prefersReduced ? 0 : 0.1,
    };
};

/* ─── Animation Variants ─── */
const fadeUp = {
    hidden: { opacity: 0, y: 30 },
    visible: (i: number = 0) => ({
        opacity: 1,
        y: 0,
        transition: { duration: 0.5, delay: i * 0.1, ease: "easeOut" },
    }),
};

const stagger = {
    visible: { transition: { staggerChildren: 0.1 } },
};

/* ─── Reusable Premium Video Player with Ambient Glow, Overlays & Pulse Play ─── */
const PremiumVideoPlayer: React.FC<{ src: string; aspect?: 'video' | 'portrait'; rotate?: boolean }> = ({ src, aspect = 'video', rotate = false }) => {
    const videoRef = React.useRef<HTMLVideoElement>(null);
    const ambientRef = React.useRef<HTMLVideoElement>(null);
    const [isPlaying, setIsPlaying] = React.useState(false);

    const togglePlay = () => {
        if (!videoRef.current) return;
        if (isPlaying) {
            videoRef.current.pause();
        } else {
            setIsPlaying(true);
            videoRef.current.muted = false;
            videoRef.current.currentTime = 0;
            videoRef.current.play().catch(() => { });
            if (ambientRef.current) {
                ambientRef.current.currentTime = 0;
                ambientRef.current.play().catch(() => { });
            }
        }
    };

    const handleContainerClick = (e: React.MouseEvent) => {
        if (isPlaying) return;
        togglePlay();
    };

    React.useEffect(() => {
        const mainVideo = videoRef.current;
        const ambientVideo = ambientRef.current;
        if (!mainVideo || !ambientVideo) return;

        const handlePause = () => {
            setIsPlaying(false);
            mainVideo.muted = true;
            mainVideo.play().catch(() => { });
            ambientVideo.play().catch(() => { });
        };

        const handleEnded = () => {
            setIsPlaying(false);
            mainVideo.muted = true;
            mainVideo.currentTime = 0;
            mainVideo.play().catch(() => { });
            ambientVideo.currentTime = 0;
            ambientVideo.play().catch(() => { });
        };

        const handleTimeUpdate = () => {
            if (!isPlaying) {
                if (mainVideo.currentTime >= 3) {
                    mainVideo.currentTime = 0;
                    ambientVideo.currentTime = 0;
                }
            }
        };

        mainVideo.addEventListener('pause', handlePause);
        mainVideo.addEventListener('ended', handleEnded);
        mainVideo.addEventListener('timeupdate', handleTimeUpdate);

        // Start preview mode initially (muted play)
        if (!isPlaying) {
            mainVideo.muted = true;
            ambientVideo.muted = true;
            mainVideo.play().catch(() => { });
            ambientVideo.play().catch(() => { });
        }

        return () => {
            mainVideo.removeEventListener('pause', handlePause);
            mainVideo.removeEventListener('ended', handleEnded);
            mainVideo.removeEventListener('timeupdate', handleTimeUpdate);
        };
    }, [isPlaying]);

    if (aspect === 'video') {
        return (
            <div
                onClick={handleContainerClick}
                className="relative aspect-video w-full max-w-4xl mx-auto rounded-3xl overflow-hidden border border-white/10 shadow-[0_30px_60px_rgba(0,0,0,0.8)] bg-black group cursor-pointer"
            >
                {/* Ambient Glow */}
                <video
                    ref={ambientRef}
                    src={src}
                    className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-35 scale-110 pointer-events-none"
                    style={{ transform: rotate ? 'rotate(90deg)' : 'none', width: rotate ? '56.25%' : '100%', height: rotate ? '177.77%' : '100%', top: rotate ? '-38.885%' : '0', left: rotate ? '21.875%' : '0' }}
                    muted
                    loop
                    playsInline
                    preload="auto"
                />
                {/* Main Video */}
                <video
                    ref={videoRef}
                    src={src}
                    className="relative z-10"
                    style={{ transform: rotate ? 'rotate(90deg)' : 'none', width: rotate ? '56.25%' : '100%', height: rotate ? '177.77%' : '100%', top: rotate ? '-38.885%' : '0', left: rotate ? '21.875%' : '0', objectFit: rotate ? 'contain' : 'contain' }}
                    controls={isPlaying}
                    playsInline
                    preload="auto"
                />
                {/* Pulsing Play Button */}
                {!isPlaying && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 transition-opacity duration-300">
                        <div className="w-20 h-20 bg-[#E6241D] text-white rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(230,36,29,0.8)] animate-pulse">
                            <svg className="w-8 h-8 fill-white translate-x-0.5" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z" />
                            </svg>
                        </div>
                    </div>
                )}
            </div>
        );
    } else {
        return (
            <div
                onClick={handleContainerClick}
                className="relative aspect-[9/16] w-full rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-black group cursor-pointer"
            >
                {/* Ambient Glow */}
                <video
                    ref={ambientRef}
                    src={src}
                    className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-35 scale-110 pointer-events-none"
                    muted
                    loop
                    playsInline
                    preload="auto"
                />
                {/* Main Video */}
                <video
                    ref={videoRef}
                    src={src}
                    className="relative z-10 w-full h-full object-cover rounded-2xl"
                    controls={isPlaying}
                    playsInline
                    preload="auto"
                />
                {/* Pulsing Play Button */}
                {!isPlaying && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 transition-opacity duration-300">
                        <div className="w-16 h-16 bg-[#E6241D] text-white rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(230,36,29,0.8)] animate-pulse">
                            <svg className="w-6 h-6 fill-white translate-x-0.5" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z" />
                            </svg>
                        </div>
                    </div>
                )}
            </div>
        );
    }
};

const LPWTechLisboaNov2026: React.FC = () => {
    const { shouldAnimate } = useMotionConfig();
    const navigate = useNavigate();
    const [form, setForm] = useState({ name: '', email: '', phone: '', reason: '' });
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const assignedTo = await distributeLead(); // Rodizio automatico: Christopher, Michael ou Emerson

            // 1. Cria o Lead no CRM (SITE_Leads) — fica "pretendido" mesmo que não conclua o pagamento
            const leadPayload = {
                name: form.name,
                email: form.email,
                phone: form.phone,
                type: 'Course_Registration',
                status: 'New',
                context_id: `WTECH EUROPA LISBOA OUTUBRO 2026 (INSCRIÇÃO)`,
                tags: ['WTECH_LISBOA_OUT_2026', 'INSCRICAO_LP'],
                assigned_to: assignedTo,
                notes: form.reason,
                ...getLeadTrackingFields()
            };

            const { data: leadData, error: leadError } = await supabase
                .from('SITE_Leads')
                .insert([leadPayload])
                .select()
                .single();

            if (leadError) throw leadError;

            // 2. Dispara Webhook de lead (automações de CRM)
            await triggerWebhook('webhook_lead', { lead_id: leadData.id, name: form.name, email: form.email, phone: form.phone });

            // 3. Segue para o checkout (escolha de valor + pagamento Stripe), preservando as UTMs da URL
            setSubmitted(true);
            const params = new URLSearchParams(window.location.search);
            params.set('lid', leadData.id);
            navigate(`/checkout-lisboa?${params.toString()}`);
        } catch (err: any) {
            console.error('Error submitting pre-registration:', err);
            alert('Erro ao processar sua inscrição: ' + err.message);
            setSubmitted(false);
        }
        setLoading(false);
    };

    const scrollToForm = () => {
        document.getElementById('registration-form')?.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <div className="min-h-screen bg-[#050505] text-white selection:bg-wtech-red selection:text-white font-sans overflow-x-hidden">

            {/* TOP BAR / URGENCY */}
            <div className="bg-gradient-to-r from-wtech-red to-red-800 text-white text-[10px] md:text-xs font-black uppercase tracking-[0.3em] text-center py-2.5 px-4 sticky top-0 z-50 shadow-2xl">
                🔥 VAGAS LIMITADAS: GARANTA SUA RESERVA DE VAGA PARA A 2ª EDIÇÃO (LISBOA – 23, 24 E 25 DE OUTUBRO)
            </div>

            {/* NAVIGATION / LOGOS */}
            <nav className="absolute top-12 left-0 w-full z-40">
                <div className="container mx-auto px-6 flex justify-between items-center">
                    <img src="https://w-techstore.com.br/wp-content/uploads/2025/11/logo-w-tech-branca.png" alt="W-Tech" className="h-8 md:h-12 object-contain" />
                    <img src="https://liquimoly.cloudimg.io/v7/https://www.liqui-moly.com/static/version1765819485/frontend/limo/base/default/images/logo.svg" alt="Liqui Moly" className="h-8 md:h-12 object-contain bg-white p-1 rounded shadow-lg" />
                </div>
            </nav>

            {/* HERO SECTION */}
            <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
                {/* Background Video/Image Overlay */}
                <div className="absolute inset-0 z-0 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/40 to-[#050505] z-10"></div>
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.05)_0%,transparent_80%)] z-10"></div>
                    <video
                        src="/videos/como_foi.mp4"
                        className="w-full h-full object-cover scale-[1.3] brightness-[0.35] pointer-events-none"
                        autoPlay
                        muted
                        loop
                        playsInline
                    />
                </div>

                <div className="container mx-auto px-6 relative z-20 text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="inline-flex items-center gap-2 border border-wtech-gold/30 bg-wtech-gold/10 backdrop-blur-xl px-5 py-2 rounded-full mb-8 shadow-xl"
                    >
                        <Zap size={14} className="text-wtech-gold animate-pulse" />
                        <span className="text-[10px] md:text-sm font-black uppercase tracking-[0.3em] text-white">Lisboa | 23, 24 e 25 de Outubro 2026</span>
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-5xl md:text-8xl lg:text-9xl font-black uppercase tracking-tighter leading-[0.8] mb-8 pr-4"
                    >
                        W-Tech<br />
                        <span className="inline-block text-transparent bg-clip-text bg-gradient-to-r from-wtech-red via-red-500 to-wtech-gold italic font-bold pr-6 pb-2">Lisboa II</span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="max-w-3xl mx-auto text-lg md:text-2xl text-gray-400 font-medium mb-12 leading-relaxed"
                    >
                        A segunda edição da imersão que eleva o ajuste de suspensão ao <span className="text-white font-black">Padrão Internacional</span>. <br className="hidden md:block" />
                        Faça sua inscrição e garanta sua vaga — as <span className="text-white font-black">vagas são limitadas</span>.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.6 }}
                    >
                        <button
                            onClick={scrollToForm}
                            className="bg-wtech-red hover:bg-white hover:text-black text-white px-12 py-6 rounded-sm font-black text-xl uppercase tracking-widest transition-all hover:scale-105 flex items-center gap-4 mx-auto group shadow-[0_0_50px_rgba(230,0,0,0.4)]"
                        >
                            Reservar Minha Vaga <ArrowRight className="group-hover:translate-x-2 transition-transform" strokeWidth={3} />
                        </button>
                    </motion.div>
                </div>

                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 opacity-50">
                    <span className="text-[10px] font-black uppercase tracking-[0.4em]">Descobrir</span>
                    <div className="w-1 h-12 bg-gradient-to-b from-wtech-red to-transparent"></div>
                </div>
            </section>

            {/* TRUST BAR */}
            <section className="bg-black border-y border-white/5 py-12">
                <div className="container mx-auto px-6">
                    <div className="grid md:grid-cols-3 gap-8 text-center items-center">
                        <div className="flex flex-col items-center gap-2">
                            <Calendar className="text-wtech-red mb-2" size={32} />
                            <span className="text-2xl font-black uppercase tracking-tighter">3 Dias de Imersão</span>
                            <span className="text-xs text-gray-500 uppercase font-bold tracking-widest text-center">Teoria e Prática Intensiva</span>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                            <MapPin className="text-wtech-red mb-2" size={32} />
                            <span className="text-2xl font-black uppercase tracking-tighter">Art on Wheels Garage</span>
                            <span className="text-xs text-gray-500 uppercase font-bold tracking-widest text-center">Sintra · Portugal</span>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                            <Award className="text-wtech-gold mb-2" size={32} />
                            <span className="text-2xl font-black uppercase tracking-tighter">Certificação W-Tech</span>
                            <span className="text-xs text-gray-500 uppercase font-bold tracking-widest text-center">Reconhecimento Internacional</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* MARCO HISTÓRICO SECTION */}
            <section className="py-24 bg-[#050505] relative overflow-hidden">
                <GridVignetteBackground className="opacity-40" />
                <div className="container mx-auto px-6 relative z-10">
                    <div className="grid lg:grid-cols-2 gap-20 items-center">
                        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
                            <motion.span variants={fadeUp} className="text-wtech-red font-black uppercase tracking-[0.4em] text-xs">Exclusividade W-Tech</motion.span>
                            <motion.h2 variants={fadeUp} className="text-4xl md:text-7xl font-black uppercase mt-6 mb-8 tracking-tighter leading-none">
                                Um Novo Padrão<br /> para a <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-red-900">Europa</span>
                            </motion.h2>
                            <div className="space-y-6 text-gray-400 text-lg md:text-xl leading-relaxed">
                                <motion.p variants={fadeUp}>
                                    Após o sucesso absoluto da primeira edição, a **metodologia W-Tech** retorna de forma oficial e presencial a Portugal para entregar uma nova formação técnica, profunda e sem rodeios.
                                </motion.p>
                                <motion.p variants={fadeUp}>
                                    Este não é apenas um curso. É uma transferência de tecnologia para quem quer dominar o que acontece <strong>dentro da suspensão</strong>, eliminando o achismo de uma vez por todas.
                                </motion.p>
                                <motion.div variants={fadeUp} className="border-l-4 border-wtech-red pl-8 py-2 italic text-gray-300 bg-white/5 rounded-r-xl">
                                    "Treinar dentro de uma oficina profissional de verdade é posicionamento. É entregar o que há de mais moderno no mundo das suspensões."
                                </motion.div>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, x: 50 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.8 }}
                            viewport={{ once: true }}
                            className="relative group"
                        >
                            <div className="absolute -inset-4 bg-gradient-to-r from-wtech-red/20 to-transparent blur-3xl group-hover:from-wtech-red/40 transition-all"></div>
                            <img
                                src="/images/Alex.webp"
                                alt="Alex Crepaldi W-Tech"
                                className="relative w-full rounded-2xl border border-white/10 shadow-2xl transition-all duration-700 hover:scale-[1.02]"
                            />
                            <div className="absolute -bottom-6 -right-6 bg-wtech-red text-white p-6 rounded-xl font-black uppercase text-sm tracking-[0.2em] shadow-2xl">
                                100% Técnico
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* PAST EDITION & TESTIMONIALS */}
            <section className="py-24 bg-[#080808] border-y border-white/5 relative overflow-hidden">
                <GridVignetteBackground className="opacity-30 pointer-events-none" />
                {/* Accent glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#E6241D]/5 blur-[120px] rounded-full pointer-events-none"></div>

                <div className="container mx-auto px-6 relative z-10">
                    {/* Part 1: How it went */}
                    <div className="text-center mb-16">
                        <span className="text-wtech-red font-black uppercase tracking-[0.3em] text-xs">Sucesso da 1ª Edição</span>
                        <h2 className="text-4xl md:text-6xl font-black uppercase mt-4">Como Foi a <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">1ª Edição em Lisboa</span></h2>
                        <p className="text-gray-500 mt-4 text-lg max-w-xl mx-auto">Confira um resumo da energia, da dedicação técnica e da prática real no nosso primeiro treinamento.</p>
                    </div>

                    <div className="mb-28">
                        <PremiumVideoPlayer src="/videos/finalwtech.mp4" aspect="video" />
                    </div>

                    {/* Part 2: What students said */}
                    <div className="text-center mb-16">
                        <span className="text-wtech-gold font-black uppercase tracking-[0.3em] text-xs">Depoimentos Reais</span>
                        <h2 className="text-4xl md:text-6xl font-black uppercase mt-4">O que dizem os <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">Nossos Alunos</span></h2>
                        <p className="text-gray-500 mt-4 text-lg max-w-xl mx-auto">Quem viveu a experiência na pele partilha o impacto técnico do método W-Tech.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-3xl mx-auto">
                        <PremiumVideoPlayer src="/videos/depoimentos_1.mp4" aspect="portrait" />
                        <PremiumVideoPlayer src="/videos/depoimentos_2.mp4" aspect="portrait" />
                    </div>
                </div>
            </section>

            {/* CURRICULUM BENTO GRID */}
            <section className="py-24 bg-black relative">
                <GridVignetteBackground className="opacity-30 pointer-events-none" />
                <div className="container mx-auto px-6">
                    <div className="text-center mb-20">
                        <span className="text-wtech-red font-black uppercase tracking-[0.4em] text-xs">O que você vai dominar</span>
                        <h2 className="text-4xl md:text-6xl font-black uppercase mt-4 tracking-tighter">Engenharia de <span className="text-gray-500">Performance</span></h2>
                    </div>

                    <div className="grid md:grid-cols-12 gap-6 auto-rows-[240px]">
                        {/* Box 1 */}
                        <div className="md:col-span-8 bg-zinc-900/50 border border-white/5 rounded-3xl p-10 flex flex-col justify-end group hover:border-wtech-gold/20 hover:shadow-[0_0_30px_rgba(212,175,55,0.05)] transition-all duration-500">
                            <Activity className="text-wtech-red mb-auto group-hover:text-wtech-gold transition-colors" size={40} />
                            <h3 className="text-2xl font-black uppercase text-white mb-2 tracking-widest">Hidráulica Avançada</h3>
                            <p className="text-gray-500 text-sm leading-relaxed max-w-md">Entenda a física real do fluxo de óleo, cavitação e como as válvulas controlam cada milímetro do curso.</p>
                        </div>
                        {/* Box 2 */}
                        <div className="md:col-span-4 bg-zinc-900/50 border border-white/5 rounded-3xl p-10 flex flex-col justify-end group hover:border-wtech-gold/20 hover:shadow-[0_0_30px_rgba(212,175,55,0.05)] transition-all duration-500">
                            <Target className="text-wtech-red mb-auto group-hover:text-wtech-gold transition-colors" size={40} />
                            <h3 className="text-2xl font-black uppercase text-white mb-2 tracking-widest">Diagnóstico</h3>
                            <p className="text-gray-500 text-sm leading-relaxed">Método lógico para identificar falhas antes mesmo de abrir a suspensão.</p>
                        </div>
                        {/* Box 3 */}
                        <div className="md:col-span-4 bg-zinc-900/50 border border-white/5 rounded-3xl p-10 flex flex-col justify-end group hover:border-wtech-gold/20 hover:shadow-[0_0_30px_rgba(212,175,55,0.05)] transition-all duration-500">
                            <Settings className="text-wtech-red mb-auto group-hover:text-wtech-gold transition-colors" size={40} />
                            <h3 className="text-2xl font-black uppercase text-white mb-2 tracking-widest">Setup Real</h3>
                            <p className="text-gray-500 text-sm leading-relaxed">Cargas de molas, SAG e geometria para cada tipo de piloto e terreno.</p>
                        </div>
                        {/* Box 4 */}
                        <div className="md:col-span-8 bg-gradient-to-br from-wtech-red/20 to-zinc-900/50 border border-wtech-red/20 rounded-3xl p-10 flex flex-col justify-end group hover:border-wtech-gold/30 hover:shadow-[0_0_30px_rgba(230,0,0,0.05)] transition-all duration-500">
                            <Zap className="text-wtech-red mb-auto group-hover:text-wtech-gold transition-colors" size={40} />
                            <h3 className="text-2xl font-black uppercase text-white mb-2 tracking-widest">Metodologia W-Tech</h3>
                            <p className="text-gray-300 text-sm leading-relaxed max-w-md italic">O processo padronizado que permitiu à W-Tech se tornar referência global em preparação de suspensões.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* LOCATION / ART ON WHEELS GARAGE */}
            <section className="py-24 relative bg-zinc-950 overflow-hidden">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent"></div>
                <div className="container mx-auto px-6 relative z-10">
                    <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
                        <div className="max-w-xl">
                            <span className="inline-block text-wtech-gold font-black uppercase tracking-[0.3em] text-xs mb-6">Art on Wheels Garage</span>
                            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter">Onde a Inovação<br /> Acontece</h2>
                        </div>
                        <div className="pb-2">
                            <p className="text-gray-500 text-sm font-bold uppercase tracking-widest bg-blue-500/10 border border-blue-500/20 px-4 py-2 rounded-full text-blue-400">
                                Centro Empresarial II · Sintra
                            </p>
                        </div>
                    </div>

                    <div className="grid lg:grid-cols-2 gap-12">
                        <div className="bg-zinc-900 border border-white/5 rounded-3xl overflow-hidden p-8 md:p-12 relative group hover:border-blue-500/30 transition-all">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 blur-[80px]"></div>
                            <div className="relative z-10">
                                <h3 className="text-2xl font-black uppercase text-white mb-6">Localização Premium</h3>
                                <p className="text-gray-400 mb-8 leading-relaxed">
                                    A Art on Wheels Garage oferece a infraestrutura perfeita para uma formação de alto nível: ambiente profissional, equipamento real de oficina e o clima certo para a prática.
                                </p>
                                <div className="space-y-4 mb-10">
                                    <div className="flex items-center gap-4 text-gray-300">
                                        <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500"><MapPin size={20} /></div>
                                        <span className="text-sm font-bold">Centro Empresarial II, Rua da Tapada Nova, Armazém · 2710-297 Sintra – Portugal</span>
                                    </div>
                                    <a
                                        id="lisboa-out2026-garage-phone"
                                        href="tel:+351917340016"
                                        className="flex items-center gap-4 text-gray-300 hover:text-white transition-colors"
                                    >
                                        <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500"><Phone size={20} /></div>
                                        <span className="text-sm font-bold">+351 917 340 016</span>
                                    </a>
                                    <a
                                        id="lisboa-out2026-garage-site"
                                        href="https://artonwheelsgarage.pt"
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex items-center gap-4 text-gray-300 hover:text-white transition-colors"
                                    >
                                        <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500"><Globe size={20} /></div>
                                        <span className="text-sm font-bold">artonwheelsgarage.pt</span>
                                    </a>
                                </div>
                                <a
                                    id="lisboa-nov2026-map-link"
                                    href="https://www.google.com/maps/search/?api=1&query=Art%20on%20Wheels%20Garage%2C%20Rua%20da%20Tapada%20Nova%2C%202710-297%20Sintra"
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-3 bg-blue-600 hover:bg-white hover:text-blue-600 text-white px-8 py-4 rounded-xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl"
                                >
                                    Ver no Google Maps <MapPin size={16} />
                                </a>
                            </div>
                        </div>

                        <div className="aspect-video rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-zinc-900 group">
                            <iframe
                                className="w-full h-full opacity-80 group-hover:opacity-100 transition-opacity"
                                src="https://www.youtube.com/embed/sSyVRdxprg0?rel=0"
                                allowFullScreen
                            ></iframe>
                        </div>
                    </div>
                </div>
            </section>

            {/* INSTRUCTOR: ALEX ONLY */}
            <section className="py-24 bg-black relative">
                <GridVignetteBackground className="opacity-25 pointer-events-none" />
                <div className="container mx-auto px-6">
                    <div className="max-w-6xl mx-auto bg-zinc-900/40 border border-white/5 rounded-[2rem] overflow-hidden">
                        <div className="grid lg:grid-cols-2">
                            <div className="relative h-[400px] lg:h-auto overflow-hidden">
                                <img
                                    src="/images/Alex.webp"
                                    alt="Alex Crepaldi"
                                    className="absolute inset-0 w-full h-full object-cover object-center grayscale hover:grayscale-0 transition-all duration-1000"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-transparent"></div>
                                <div className="absolute bottom-8 left-8">
                                    <div className="inline-block bg-wtech-red text-white text-[10px] font-black uppercase px-3 py-1 rounded-sm mb-2">Fundador</div>
                                    <h3 className="text-4xl font-black uppercase text-white tracking-tighter">Alex Crepaldi</h3>
                                </div>
                            </div>
                            <div className="p-10 lg:p-20 flex flex-col justify-center">
                                <span className="text-wtech-red font-black uppercase tracking-[0.4em] text-xs mb-6">Mestre de Formação</span>
                                <h3 className="text-3xl md:text-4xl font-black uppercase text-white mb-6 leading-tight">Autoridade em <span className="text-gray-500">Suspensão de Motas</span></h3>
                                <p className="text-gray-400 text-lg leading-relaxed mb-8">
                                    Com décadas de experiência no desenvolvimento de sistemas de suspensão e formação de milhares de profissionais, Alex Crepaldi traz para Lisboa o conhecimento que transformou a W-Tech em uma marca global.
                                </p>
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="flex items-center gap-3">
                                        <CheckCircle size={18} className="text-wtech-red" />
                                        <span className="text-[10px] font-black uppercase text-gray-500">Física do Fluido</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <CheckCircle size={18} className="text-wtech-red" />
                                        <span className="text-[10px] font-black uppercase text-gray-500">Geometria Dinâmica</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <CheckCircle size={18} className="text-wtech-red" />
                                        <span className="text-[10px] font-black uppercase text-gray-500">Padrão Elite</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <CheckCircle size={18} className="text-wtech-red" />
                                        <span className="text-[10px] font-black uppercase text-gray-500">Desenvolvimento Real</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ROUTINE / SCHEDULE */}
            <section className="py-24 bg-[#080808] relative overflow-hidden">
                <div className="container mx-auto px-6 relative z-10">
                    <div className="text-center mb-20">
                        <span className="text-wtech-red font-black uppercase tracking-[0.3em] text-xs">A Experiência</span>
                        <h2 className="text-4xl md:text-6xl font-black uppercase mt-4">Cronograma <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-500">Detalhado</span></h2>
                    </div>

                    <div className="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
                        <div className="space-y-8">
                            <div className="mb-2">
                                <span className="text-wtech-gold text-[11px] font-black uppercase tracking-[0.3em]">Dia 01 · Sexta-feira</span>
                                <h3 className="text-2xl font-black uppercase text-white tracking-tighter italic">Fundamentos</h3>
                            </div>
                            {[
                                {
                                    num: "01",
                                    title: "Fundamentos das Suspensões",
                                    subtitle: "Base Técnica Global",
                                    desc: "Entenda o papel da suspensão na segurança e performance. Diferenças entre sistemas convencionais, invertidos e eletrônicos e como cada um reage a impactos no asfalto e off-road."
                                },
                                {
                                    num: "02",
                                    title: "Molas, Cargas e Geometria",
                                    subtitle: "A Engenharia Mecânica",
                                    desc: "Função real da mola, taxa de mola, compressão e afundamento (SAG estático e dinâmico). Saiba quando ajustar, substituir ou customizar considerando carga e piloto."
                                },
                                {
                                    num: "03",
                                    title: "Mecânica dos Fluidos",
                                    subtitle: "A Ciência Hidráulica",
                                    desc: "Viscosidade, cavitação e espumação. Como o fluido se comporta sob pressão e altas temperaturas, e a relação direta com a estabilidade da mota."
                                }
                            ].map((module, i) => (
                                <div key={i} className="group relative pl-16 pb-10 border-b border-white/5 last:border-0 hover:border-wtech-red/30 transition-colors">
                                    <div className="absolute left-0 top-0 text-4xl font-black text-white/5 group-hover:text-wtech-red/40 transition-colors uppercase leading-none">M{module.num}</div>
                                    <h3 className="text-xl font-black text-white uppercase mb-1 group-hover:text-wtech-red transition-colors italic tracking-tighter">{module.title}</h3>
                                    <p className="text-wtech-gold text-[10px] font-black uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <span className="w-4 h-px bg-wtech-gold"></span> {module.subtitle}
                                    </p>
                                    <p className="text-gray-500 text-sm leading-relaxed">{module.desc}</p>
                                </div>
                            ))}
                        </div>

                        <div className="space-y-8">
                            <div className="mb-2">
                                <span className="text-wtech-gold text-[11px] font-black uppercase tracking-[0.3em]">Dia 02 · Sábado</span>
                                <h3 className="text-2xl font-black uppercase text-white tracking-tighter italic">Engenharia & Ajustes</h3>
                            </div>
                            {[
                                {
                                    num: "04",
                                    title: "Ajustes e Configuração",
                                    subtitle: "Fim definitivo do Achismo",
                                    desc: "Regulagem de Pré-carga, Rebound (Retorno) e Damping (Compressão). Aprenda a configurar para uso urbano, viagem, trilha ou pista com critério técnico absoluto."
                                },
                                {
                                    num: "05",
                                    title: "Seleção de Óleo e Viscosidade",
                                    subtitle: "Performance e Durabilidade",
                                    desc: "Diferença entre viscosidade nominal e real (cSt). Como escolher o óleo correto pelo projeto da suspensão e compatibilidade com retentores."
                                },
                                {
                                    num: "06",
                                    title: "Otimização Avançada",
                                    subtitle: "Expertise W-Tech",
                                    desc: "Funcionamento das válvulas de controle de fluxo (Valving) e como levar a resposta da suspensão ao limite da eficiência técnica profissional."
                                }
                            ].map((module, i) => (
                                <div key={i} className="group relative pl-16 pb-10 border-b border-white/5 last:border-0 hover:border-wtech-red/30 transition-colors">
                                    <div className="absolute left-0 top-0 text-4xl font-black text-white/5 group-hover:text-wtech-red/40 transition-colors uppercase leading-none">M{module.num}</div>
                                    <h3 className="text-xl font-black text-white uppercase mb-1 group-hover:text-wtech-red transition-colors italic tracking-tighter">{module.title}</h3>
                                    <p className="text-wtech-gold text-[10px] font-black uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <span className="w-4 h-px bg-wtech-gold"></span> {module.subtitle}
                                    </p>
                                    <p className="text-gray-500 text-sm leading-relaxed">{module.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* DIA 03 — PRÁTICA INTENSIVA */}
                    <div className="mt-16 max-w-6xl mx-auto">
                        <div className="mb-8 text-center">
                            <span className="text-wtech-gold text-[11px] font-black uppercase tracking-[0.3em]">Dia 03 · Domingo</span>
                            <h3 className="text-2xl md:text-3xl font-black uppercase text-white tracking-tighter italic">Prática Intensiva & Certificação</h3>
                            <p className="text-gray-500 text-sm mt-2 max-w-2xl mx-auto">O dia extra da 2ª edição: mão na massa na bancada, revisão completa guiada e casos reais até a certificação.</p>
                        </div>
                        <div className="grid md:grid-cols-3 gap-6">
                            {[
                                {
                                    num: "07",
                                    title: "Bancada & Desmontagem",
                                    subtitle: "Mão na Massa",
                                    desc: "Prática guiada de abertura, inspeção e leitura de componentes internos passo a passo, com acompanhamento direto do instrutor."
                                },
                                {
                                    num: "08",
                                    title: "Revisão Completa (Rebuild)",
                                    subtitle: "Do Zero ao Setup",
                                    desc: "Montagem, sangria, carga de óleo e regulagem final aplicando toda a teoria dos dias anteriores em uma suspensão real."
                                },
                                {
                                    num: "09",
                                    title: "Casos Reais & Certificação",
                                    subtitle: "Fechamento W-Tech",
                                    desc: "Diagnóstico de casos reais de piloto, tira-dúvidas técnico avançado e entrega da certificação internacional W-Tech."
                                }
                            ].map((module, i) => (
                                <div key={i} className="group relative bg-zinc-900/50 border border-white/5 rounded-3xl p-8 hover:border-wtech-red/30 transition-colors">
                                    <div className="text-4xl font-black text-white/5 group-hover:text-wtech-red/40 transition-colors uppercase leading-none mb-4">M{module.num}</div>
                                    <h4 className="text-xl font-black text-white uppercase mb-1 group-hover:text-wtech-red transition-colors italic tracking-tighter">{module.title}</h4>
                                    <p className="text-wtech-gold text-[10px] font-black uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <span className="w-4 h-px bg-wtech-gold"></span> {module.subtitle}
                                    </p>
                                    <p className="text-gray-500 text-sm leading-relaxed">{module.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Routine Bar */}
                    <div className="mt-20 bg-zinc-900/80 backdrop-blur-xl border border-white/5 p-8 md:p-12 rounded-[2rem] max-w-5xl mx-auto shadow-[0_30px_60px_rgba(0,0,0,0.5)] relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8">
                            <Zap className="text-wtech-gold opacity-10 group-hover:opacity-40 transition-all" size={80} />
                        </div>
                        <div className="flex flex-col md:flex-row items-center justify-between gap-12 relative z-10">
                            <div className="w-full md:w-1/3 text-center md:text-left">
                                <h4 className="text-3xl font-black text-white uppercase mb-4 tracking-tighter">Rotina de <span className="text-wtech-red italic">Imersão</span></h4>
                                <p className="text-gray-500 text-sm leading-relaxed mb-6 font-medium italic">Sexta, Sábado e Domingo · 23, 24 e 25 de Outubro.</p>
                                <div className="inline-flex items-center gap-2 bg-white/5 px-6 py-3 rounded-full border border-white/10 text-[10px] font-black uppercase tracking-widest text-gray-400">
                                    <Settings className="animate-spin-slow text-wtech-gold" size={14} /> Almoço livre (Sugerido na região de Sintra)
                                </div>
                            </div>

                            <div className="w-full md:w-2/3 grid grid-cols-2 sm:grid-cols-5 gap-6">
                                {[
                                    { t: "08:30", l: "Receção" },
                                    { t: "09:00", l: "Início" },
                                    { t: "12:00", l: "Almoço" },
                                    { t: "16:00", l: "Pausa" },
                                    { t: "18:00", l: "Fim" }
                                ].map((step, i) => (
                                    <div key={i} className="text-center md:text-left border-l border-white/5 pl-6 group/step">
                                        <div className="text-3xl font-black text-white mb-1 tracking-tighter group-hover/step:text-wtech-red transition-all italic">{step.t}</div>
                                        <div className="text-[10px] font-black uppercase text-gray-600 tracking-widest group-hover/step:text-white transition-all">{step.l}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* FORM SECTION */}
            <section id="registration-form" className="py-24 relative overflow-hidden">
                <div className="absolute inset-0 z-0">
                    <img src="https://w-techbrasil.com.br/wp-content/uploads/2023/12/EFP04493.jpg" className="w-full h-full object-cover brightness-[0.2]" alt="Form BG" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/80 to-transparent"></div>
                </div>

                <div className="container mx-auto px-6 relative z-10">
                    <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-20 items-center">
                        <div>
                            <h2 className="text-5xl md:text-7xl font-black uppercase mb-8 tracking-tighter leading-[0.9]">2ª Edição<br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-wtech-red to-wtech-gold text-6xl md:text-8xl font-black">Outubro</span></h2>
                            <p className="text-gray-400 text-lg mb-10 leading-relaxed max-w-md">
                                As vagas para a segunda edição oficial do curso W-Tech em Sintra são extremamente limitadas. Preencha seus dados para fazer sua inscrição — na próxima etapa você vê as condições e finaliza a reserva da sua vaga.
                            </p>
                            <div className="space-y-4 mb-10">
                                <div className="flex items-center gap-4 bg-white/5 border border-white/10 p-4 rounded-xl">
                                    <ShieldCheck className="text-wtech-red" strokeWidth={3} />
                                    <span className="text-sm font-bold uppercase tracking-tight">Vagas Estritamente Limitadas</span>
                                </div>
                                <div className="flex items-center gap-4 bg-white/5 border border-white/10 p-4 rounded-xl">
                                    <Award className="text-wtech-gold" strokeWidth={3} />
                                    <span className="text-sm font-bold uppercase tracking-tight">Certificação Internacional W-Tech</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-[#0c0c0c]/90 backdrop-blur-3xl border border-white/10 p-8 md:p-12 rounded-[2rem] shadow-2xl relative group overflow-hidden">
                            {submitted ? (
                                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-10 relative z-10">
                                    <div className="w-20 h-20 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-8 animate-bounce">
                                        <CheckCircle size={40} />
                                    </div>
                                    <h3 className="text-3xl font-black uppercase mb-4 tracking-tighter">Inscrição Recebida!</h3>
                                    <p className="text-gray-400 mb-8">Redirecionando para o pagamento...</p>
                                </motion.div>
                            ) : (
                                <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-2">Nome Completo</label>
                                        <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full bg-white/5 border border-white/10 p-4 rounded-xl focus:ring-2 focus:ring-wtech-red outline-none transition-all font-bold text-lg text-white" placeholder="Seu nome" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-2">Telemóvel / WhatsApp</label>
                                        <input required value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="w-full bg-white/5 border border-white/10 p-4 rounded-xl focus:ring-2 focus:ring-wtech-red outline-none transition-all font-bold text-lg text-white" placeholder="+351 ..." />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-2">E-mail Profissional</label>
                                        <input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full bg-white/5 border border-white/10 p-4 rounded-xl focus:ring-2 focus:ring-wtech-red outline-none transition-all font-bold text-lg text-white" placeholder="email@exemplo.com" />
                                    </div>
                                    <button
                                        disabled={loading}
                                        className="w-full bg-wtech-red hover:bg-white hover:text-wtech-red text-white py-6 rounded-xl font-black text-lg uppercase tracking-widest transition-all shadow-[0_20px_40px_rgba(230,0,0,0.3)] disabled:opacity-50"
                                    >
                                        {loading ? 'A Processar...' : 'Continuar para o Pagamento'}
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* FOOTER */}
            <footer className="py-20 bg-stone-950 border-t border-white/5 relative overflow-hidden">
                <div className="container mx-auto px-6 text-center">
                    <div className="flex flex-wrap justify-center items-center gap-16 mb-16 opacity-30 grayscale hover:grayscale-0 transition-all">
                        <img src="https://w-techstore.com.br/wp-content/uploads/2025/11/logo-w-tech-branca.png" alt="W-Tech" className="h-10" />
                        <img src="https://liquimoly.cloudimg.io/v7/https://www.liqui-moly.com/static/version1765819485/frontend/limo/base/default/images/logo.svg" alt="Liqui Moly" className="h-12 bg-white p-1 rounded" />
                    </div>
                    <p className="text-gray-600 text-[10px] font-black uppercase tracking-[0.5em] mb-4">W-Tech Europa | Lisboa 2ª Edição (Out 2026)</p>
                    <p className="text-gray-800 text-[10px] uppercase font-bold tracking-widest">
                        O futuro das suspensões começa aqui.<br />Todos os direitos reservados ®
                    </p>
                </div>
            </footer>
        </div>
    );
};

export default LPWTechLisboaNov2026;
