import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import { triggerWebhook } from '../lib/webhooks';
import { createStripePaymentLink } from '../lib/stripe';
import {
    CheckCircle,
    ArrowRight,
    MapPin,
    Calendar,
    Clock,
    ShieldCheck,
    Settings,
    Zap,
    Award,
    AlertOctagon,
    Instagram
} from 'lucide-react';
import { GridVignetteBackground } from '../components/ui/vignette-grid-background';

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

const WTechLisboaNov2026: React.FC = () => {
    const [form, setForm] = useState({ name: '', email: '', phone: '', reason: '' });
    const [loading, setLoading] = useState(false);

    // Course ID for Lisboa November 2026
    const COURSE_ID = 'b88e8979-520a-4c37-8cb8-1128e7e5dffc';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            // 1. Create Lead in SITE_Leads (for CRM tracking)
            const assignedTo = '407d09b8-8205-4697-a726-1738cf7e20ef'; // Andre (Exclusivo para Lisboa)
            const leadPayload = {
                name: form.name,
                email: form.email,
                phone: form.phone,
                type: 'Course_Registration',
                status: 'New',
                context_id: `WTECH EUROPA LISBOA NOVEMBRO 2026 (DIRECT PAY)`,
                tags: ['WTECH_LISBOA_NOV_2026', 'PAID_FLOW'],
                assigned_to: assignedTo,
                notes: form.reason
            };

            const { data: leadData, error: leadError } = await supabase.from('SITE_Leads').insert([leadPayload]).select().single();
            if (leadError) throw leadError;

            // 2. Create Enrollment in SITE_Enrollments (Status Pending until payment)
            const enrollmentPayload = {
                course_id: COURSE_ID,
                student_name: form.name,
                student_email: form.email,
                student_phone: form.phone,
                status: 'Pending',
                amount_paid: 0,
                payment_method: 'Stripe'
            };

            const { data: enrollmentData, error: enrollmentError } = await supabase
                .from('SITE_Enrollments')
                .insert([enrollmentPayload])
                .select()
                .single();

            if (enrollmentError) throw enrollmentError;

            // 3. Trigger Webhook lead
            await triggerWebhook('webhook_lead', { ...enrollmentData, lead_id: leadData.id });

            // 4. Create Stripe Payment Link and Redirect
            const stripeResult = await createStripePaymentLink({
                title: `Inscrição: W-Tech Lisboa Novembro 2026 - ${form.name}`,
                price: 380,
                currency: 'eur',
                email: form.email,
                enrollmentId: enrollmentData.id,
                successUrl: window.location.origin + `/obrigado-lisboa?eid=${enrollmentData.id}&session_id={CHECKOUT_SESSION_ID}`
            });

            if (stripeResult.success && stripeResult.url) {
                window.location.href = stripeResult.url;
            } else {
                throw new Error(stripeResult.error || 'Erro ao gerar link de pagamento.');
            }

        } catch (err: any) {
            console.error('Error submitting registration:', err);
            alert('Erro ao processar sua inscrição: ' + err.message);
        }
        setLoading(false);
    };

    const scrollToForm = () => {
        document.getElementById('registration-form')?.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <div className="min-h-screen bg-[#050505] text-white selection:bg-wtech-red selection:text-white font-sans overflow-x-hidden">

            {/* TOP BAR */}
            <div className="bg-wtech-red text-white text-[10px] md:text-xs font-black uppercase tracking-widest text-center py-2 px-4 sticky top-0 z-50 shadow-2xl">
                🔥 SEGUNDA EDIÇÃO: INSCRIÇÕES ABERTAS COM DESCONTO DE LANÇAMENTO PARA 14–15 DE NOVEMBRO
            </div>

            {/* NAVIGATION / LOGOS */}
            <nav className="absolute top-8 left-0 w-full z-30 pointer-events-none">
                <div className="container mx-auto px-6 flex justify-between items-start">
                    <img src="https://w-techstore.com.br/wp-content/uploads/2025/11/logo-w-tech-branca.png" alt="W-Tech" className="h-8 md:h-12 object-contain opacity-90" />
                    <img src="https://liquimoly.cloudimg.io/v7/https://www.liqui-moly.com/static/version1765819485/frontend/limo/base/default/images/logo.svg" alt="Liqui Moly" className="h-8 md:h-12 object-contain bg-white/10 p-1 rounded backdrop-blur-sm" />
                </div>
            </nav>

            {/* HERO SECTION */}
            <section className="relative min-h-[95vh] flex items-center justify-center overflow-hidden pt-20">
                {/* Background */}
                <div className="absolute inset-0 z-0 overflow-hidden">
                    <div className="absolute inset-0 bg-black/55 z-10"></div>
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
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="inline-flex items-center gap-2 border border-blue-500/30 bg-blue-500/10 backdrop-blur-md px-4 py-1.5 rounded-full mb-8"
                    >
                        <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Flag_of_Portugal.svg/255px-Flag_of_Portugal.svg.png" className="w-4 h-auto rounded-sm" alt="PT" />
                        <span className="text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] text-blue-400">Inscrição Direta | Lisboa Nov 2026</span>
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-4xl md:text-7xl lg:text-8xl font-black uppercase tracking-tighter leading-[0.9] mb-8 pr-4"
                    >
                        W-Tech Europa<br />
                        <span className="inline-block text-transparent bg-clip-text bg-gradient-to-r from-wtech-red via-red-500 to-wtech-gold font-bold whitespace-nowrap pr-6 pb-2">Lisboa II</span>
                    </motion.h1>

                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="max-w-4xl mx-auto space-y-4 mb-12"
                    >
                        <p className="text-xl md:text-3xl text-gray-200 font-bold leading-tight uppercase italic tracking-tighter">
                            Domine a física das suspensões e transforme o comportamento de qualquer mota. A única oportunidade em solo europeu para alcançar o <span className="text-wtech-red">padrão W-Tech</span>.
                        </p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.6 }}
                        className="flex flex-col md:flex-row gap-4 justify-center items-center"
                    >
                        <button
                            onClick={scrollToForm}
                            className="bg-wtech-red hover:bg-white hover:text-black text-white px-10 py-6 rounded-sm font-black text-xl uppercase tracking-widest transition-all hover:scale-105 flex items-center gap-3 shadow-[0_0_50px_rgba(230,0,0,0.4)]"
                        >
                            Matricular-me Agora <ArrowRight strokeWidth={4} size={24} />
                        </button>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.8 }}
                        className="flex flex-wrap justify-center gap-6 mt-16 text-[10px] md:text-xs font-bold uppercase tracking-widest text-gray-500"
                    >
                        <span className="flex items-center gap-2 tracking-tighter"><MapPin size={14} className="text-wtech-red" /> Sintra Business Park - Edifício 01</span>
                        <span className="flex items-center gap-2"><Award size={14} className="text-wtech-gold" /> Certificação Internacional</span>
                        <span className="flex items-center gap-2"><AlertOctagon size={14} className="text-wtech-red" /> Vagas Estritamente Limitadas</span>
                    </motion.div>
                </div>
            </section>

            {/* INFO GRID */}
            <section className="bg-[#0a0a0a] border-y border-white/5">
                <div className="container mx-auto px-6">
                    <div className="grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-white/10">
                        <div className="py-12 md:px-8 text-center">
                            <Calendar className="mx-auto text-wtech-red mb-4" size={32} />
                            <h3 className="text-xl font-black uppercase mb-2">14–15 Novembro</h3>
                            <p className="text-gray-500 text-sm">Dois dias de imersão total</p>
                        </div>
                        <div className="py-12 md:px-8 text-center">
                            <MapPin className="mx-auto text-wtech-red mb-4" size={32} />
                            <h3 className="text-xl font-black uppercase mb-2">Lisboa - Sintra</h3>
                            <p className="text-gray-500 text-sm">Sede Oficinal Liqui Moly</p>
                        </div>
                        <div className="py-12 md:px-8 text-center">
                            <Award className="mx-auto text-wtech-gold mb-4" size={32} />
                            <h3 className="text-xl font-black uppercase mb-2">Certificação</h3>
                            <p className="text-gray-500 text-sm">W-Tech + ProRiders</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* PRICE BAR / INVESTIMENTO */}
            <section className="bg-zinc-900 border-b border-white/10 py-12 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full pointer-events-none flex items-center justify-center opacity-5 select-none animate-pulse">
                    <span className="text-[12rem] font-black uppercase tracking-tighter italic">INVESTIMENTO ÚNICO</span>
                </div>
                <div className="container mx-auto px-6 flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16 relative z-10 text-center md:text-left">
                    <div>
                        <p className="text-wtech-red text-xs font-black uppercase tracking-widest mb-1 underline decoration-2">Valor de Lançamento</p>
                        <div className="flex items-baseline gap-4 justify-center md:justify-start">
                            <span className="text-gray-600 text-3xl font-black line-through">€ 480</span>
                            <span className="text-6xl md:text-8xl font-black text-white italic tracking-tighter drop-shadow-[0_0_30px_rgba(255,255,255,0.1)]">€ 380<span className="text-xl text-wtech-red not-italic ml-2">.00</span></span>
                        </div>
                    </div>
                    <div className="h-24 w-px bg-white/10 hidden md:block"></div>
                    <div className="grid grid-cols-2 gap-12 text-center md:text-left">
                        <div>
                            <p className="text-wtech-red text-xs font-black uppercase tracking-widest mb-1">Inscrição</p>
                            <p className="text-2xl font-black uppercase text-white">Direta</p>
                        </div>
                        <div>
                            <p className="text-wtech-red text-xs font-black uppercase tracking-widest mb-1">Acesso</p>
                            <p className="text-2xl font-black uppercase text-white italic">Confirmado</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* HISTORIC MARK */}
            <section className="py-24 bg-black relative">
                <GridVignetteBackground className="opacity-35 pointer-events-none" />
                <div className="container mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
                    <div>
                        <span className="text-wtech-gold font-black uppercase tracking-[0.2em] text-xs">Exclusividade Europeia</span>
                        <h2 className="text-3xl md:text-5xl font-black uppercase mt-4 mb-8">
                            Um Marco Histórico<br /> para a Europa
                        </h2>
                        <div className="space-y-6 text-gray-400 text-lg leading-relaxed">
                            <p>
                                Pela primeira vez, a <strong className="text-white">W-Tech</strong> e a <strong className="text-white">ProRiders</strong> unem forças em solo europeu para entregar uma formação presencial, técnica e profunda.
                            </p>
                            <p>
                                Este não é um curso comum. É uma imersão real, onde aprende o que acontece <strong>dentro da suspensão</strong>, não apenas o que aparece por fora.
                            </p>
                            <p className="border-l-4 border-wtech-red pl-6 italic text-gray-300">
                                "Treinar dentro da Liqui Moly não é um detalhe. É posicionamento, padrão internacional e experiência profissional real."
                            </p>
                        </div>
                    </div>
                    <div className="relative">
                        <img
                            src="https://w-techstore.com.br/wp-content/uploads/2025/12/alex-fernando-web.webp"
                            alt="W-Tech Team in Europe"
                            className="relative w-full rounded-sm border border-white/10 shadow-2xl grayscale hover:grayscale-0 transition-all duration-700"
                        />
                        <div className="absolute bottom-6 right-6 bg-wtech-red text-white p-4 font-black uppercase text-xs tracking-widest shadow-lg">
                            Matrícula Direta Disponível
                        </div>
                    </div>
                </div>
            </section>

            {/* LOCATION DETAILS */}
            <section className="py-24 relative bg-zinc-900 overflow-hidden">
                <div className="absolute inset-0 z-0">
                    <img src="https://liquimoly.cloudimg.io/v7/https://w-techstore.com.br/wp-content/uploads/2025/12/3.png?func=vis&w=1920" className="w-full h-full object-cover opacity-10 blur-sm" alt="Liqui Moly Background" />
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/80 to-transparent"></div>
                </div>

                <div className="container mx-auto px-6 text-center relative z-10">
                    <img src="https://liquimoly.cloudimg.io/v7/https://www.liqui-moly.com/static/version1765819485/frontend/limo/base/default/images/logo.svg" alt="Liqui Moly" className="h-20 mx-auto mb-10 bg-white p-4 rounded shadow-[0_0_30px_rgba(255,255,255,0.2)]" />
                    <h2 className="text-3xl font-black uppercase mb-12 tracking-wide">Liqui Moly Iberia <span className="text-blue-500">Experience Center</span></h2>

                    <div className="grid md:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
                        <div className="bg-black/80 backdrop-blur-md p-10 border-l-4 border-blue-600 rounded-r-xl text-left shadow-2xl">
                            <div className="flex items-start gap-4 mb-6">
                                <MapPin className="text-blue-500 shrink-0 mt-1" size={32} />
                                <div>
                                    <h3 className="text-xl font-bold uppercase text-white mb-2">Localização Exclusiva</h3>
                                    <p className="text-gray-400 text-sm">O curso decorrerá nas instalações oficiais em Sintra.</p>
                                </div>
                            </div>

                            <address className="not-italic text-lg text-gray-300 space-y-2 border-t border-white/10 pt-6 mt-2">
                                <strong className="block text-white text-xl uppercase tracking-wider mb-2">Sintra Business Park</strong>
                                <span className="block border-l-2 border-blue-600 pl-4 py-1 mb-4 italic text-gray-400">Edifício 01 - 1º P</span>
                                <span className="block text-blue-400 font-bold mb-6 italic tracking-tight underline underline-offset-4 decoration-blue-600/30">2710-089 Sintra – Portugal</span>

                                <a
                                    href="https://maps.app.goo.gl/zYHt7GsrH78yfeKS9"
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-3 bg-blue-600 hover:bg-white hover:text-blue-600 text-white px-8 py-4 rounded-sm font-black text-xs uppercase tracking-[0.2em] transition-all mb-8 shadow-[0_15px_30px_rgba(37,99,235,0.3)] group/map"
                                >
                                    <MapPin size={18} /> Abrir no Google Maps
                                </a>

                                <a href="https://www.instagram.com/liquimolyiberia" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-blue-400 font-bold hover:text-white transition-colors text-sm">
                                    <Instagram size={16} /> @liquimolyiberia
                                </a>
                            </address>
                        </div>

                        <div className="relative group rounded-xl overflow-hidden border border-white/10 hover:border-blue-500 transition-colors shadow-2xl">
                            <div className="aspect-video relative">
                                <iframe
                                    className="w-full h-full"
                                    src="https://www.youtube.com/embed/JqDGXUdsSrQ?rel=0"
                                    title="Sede Liqui Moly"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                ></iframe>
                            </div>
                        </div>
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
                        <PremiumVideoPlayer src="/videos/finalwtech.mp4" aspect="video" rotate={true} />
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

            {/* CURRICULUM */}
            <section className="py-24 bg-black border-y border-white/5 relative">
                <GridVignetteBackground className="opacity-30 pointer-events-none" />
                <div className="container mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tight italic">Por que é que este <span className="text-wtech-red">curso é diferente?</span></h2>
                        <p className="text-gray-500 mt-4 text-lg">A maioria dos cursos fala sobre ajustes. <span className="text-white font-black italic underline decoration-wtech-red decoration-4">Nós ensinamos o porquê dos ajustes.</span></p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                            { title: 'Funcionamento Interno', desc: 'Entenda a física e hidráulica real da suspensão.' },
                            { title: 'Leitura de Desgaste', desc: 'Identifique falhas críticas em óleos e componentes.' },
                            { title: 'Diagnóstico Profissional', desc: 'Método lógico para encontrar a raiz do problema.' },
                            { title: 'Componentes Críticos', desc: 'Amortecedores de direção e sistemas de válvulas.' },
                            { title: 'Dinâmica', desc: 'Compressão, retorno e o equilíbrio da mota.' },
                            { title: 'Erros Invisíveis', desc: 'O que causa a instabilidade que ninguém vê.' },
                            { title: 'Processos W-Tech', desc: 'A metodologia usada por profissionais de elite.' },
                            { title: 'Segurança Real', desc: 'Como entregar performance com responsabilidade.' }
                        ].map((item, i) => (
                            <div key={i} className="p-8 border border-white/10 hover:border-wtech-red bg-zinc-900/30 transition-colors group relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rotate-45 translate-x-12 -translate-y-12 group-hover:bg-wtech-red/20 transition-all"></div>
                                <div className="w-2 h-2 bg-wtech-red mb-4 rounded-full group-hover:scale-150 transition-transform shadow-[0_0_10px_rgba(230,0,0,1)]"></div>
                                <h3 className="text-lg font-black uppercase text-white mb-2 leading-tight">{item.title}</h3>
                                <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* FINAL CTA / FORM */}
            <section id="registration-form" className="py-32 bg-black relative scroll-mt-20">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(230,0,0,0.1)_0%,transparent_50%)]"></div>

                <div className="container mx-auto px-6 relative z-10">
                    <div className="max-w-5xl mx-auto flex flex-col lg:flex-row items-stretch bg-zinc-900 border border-white/10 shadow-2xl overflow-hidden rounded-[2.5rem]">

                        <div className="lg:w-1/2 p-12 lg:p-20 flex flex-col justify-center relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-2 h-full bg-wtech-red"></div>
                            <div className="inline-block bg-wtech-red text-white font-black uppercase text-[10px] px-4 py-1 mb-8 tracking-[0.3em] self-start">Vagas Limitadas</div>

                            <h2 className="text-4xl md:text-7xl font-black uppercase mb-8 leading-[0.8] tracking-tighter">
                                A Sua Mota<br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-wtech-red to-wtech-gold font-bold">Agradece.</span>
                            </h2>

                            <div className="space-y-6 mb-12">
                                <div className="flex items-center gap-4 text-white">
                                    <div className="w-12 h-12 rounded-xl border border-white/20 flex items-center justify-center shrink-0">
                                        <Calendar className="text-wtech-red" size={20} />
                                    </div>
                                    <div>
                                        <div className="text-[10px] uppercase tracking-widest text-gray-500">Data do Evento</div>
                                        <div className="font-black text-xl">14 E 15 DE NOVEMBRO</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 text-white">
                                    <div className="w-12 h-12 rounded-xl border border-white/20 flex items-center justify-center shrink-0">
                                        <Clock className="text-wtech-red" size={20} />
                                    </div>
                                    <div>
                                        <div className="text-[10px] uppercase tracking-widest text-gray-500">Horário Sugerido</div>
                                        <div className="font-black text-xl">09H00 ÀS 18H00</div>
                                    </div>
                                </div>
                            </div>

                            <p className="text-gray-400 text-lg mb-8 leading-relaxed font-medium italic">
                                "O conhecimento técnico é o que separa um passeio seguro de um prejuízo evitável. Esperamos por si no Sintra Business Park."
                            </p>
                        </div>

                        <div className="lg:w-1/2 p-12 lg:p-20 bg-white text-black relative">
                            <div className="mb-10">
                                <h3 className="text-3xl font-black uppercase tracking-tighter leading-none mb-2">Lista de Presença</h3>
                                <p className="text-gray-500 text-sm font-bold uppercase tracking-widest">Inscrição Imediata via Stripe</p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2">Nome Completo</label>
                                    <input
                                        required
                                        value={form.name}
                                        onChange={e => setForm({ ...form, name: e.target.value })}
                                        className="w-full bg-gray-50 border-transparent border-b-black p-4 text-lg font-bold focus:ring-0 focus:border-wtech-red transition-colors placeholder:text-gray-300"
                                        placeholder="Seu nome"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2">Seu Melhor E-mail</label>
                                    <input
                                        required
                                        type="email"
                                        value={form.email}
                                        onChange={e => setForm({ ...form, email: e.target.value })}
                                        className="w-full bg-gray-50 border-transparent border-b-black p-4 text-lg font-bold focus:ring-0 focus:border-wtech-red transition-colors placeholder:text-gray-300"
                                        placeholder="email@exemplo.com"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2">WhatsApp</label>
                                    <input
                                        required
                                        value={form.phone}
                                        onChange={e => setForm({ ...form, phone: e.target.value })}
                                        className="w-full bg-gray-50 border-transparent border-b-black p-4 text-lg font-bold focus:ring-0 focus:border-wtech-red transition-colors placeholder:text-gray-300"
                                        placeholder="+351 9xx xxx xxx"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2">Mensagem Adicional / Mota (Opcional)</label>
                                    <input
                                        value={form.reason}
                                        onChange={e => setForm({ ...form, reason: e.target.value })}
                                        className="w-full bg-gray-50 border-transparent border-b-black p-4 text-lg font-bold focus:ring-0 focus:border-wtech-red transition-colors placeholder:text-gray-300"
                                        placeholder="Ex: BMW R1250GS"
                                    />
                                </div>

                                <button
                                    disabled={loading}
                                    className="w-full bg-wtech-red hover:bg-black text-white px-8 py-6 font-black text-xl uppercase tracking-tighter italic transition-all flex items-center justify-center gap-4 disabled:opacity-50 shadow-[0_10px_30px_rgba(230,0,0,0.3)] rounded-xl"
                                >
                                    {loading ? 'Processando...' : 'CONFIRMAR INSCRIÇÃO DIRETA'}
                                    <ArrowRight size={24} strokeWidth={3} />
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </section>

            {/* FOOTER */}
            <footer className="py-20 bg-stone-950 border-t border-white/5">
                <div className="container mx-auto px-6 text-center">
                    <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 mb-12">
                        <img src="https://w-techstore.com.br/wp-content/uploads/2025/11/logo-w-tech-branca.png" alt="W-Tech" className="h-8 md:h-10 opacity-70 hover:opacity-100 transition-opacity" />
                        <img src="https://liquimoly.cloudimg.io/v7/https://www.liqui-moly.com/static/version1765819485/frontend/limo/base/default/images/logo.svg" alt="Liqui Moly" className="h-10 md:h-12 opacity-70 hover:opacity-100 transition-opacity bg-white p-1 rounded" />
                    </div>
                    <p className="text-gray-600 text-xs font-bold uppercase tracking-[0.4em] mb-4">Parceria Técnica | Lisboa 2ª Edição (Nov 2026)</p>
                    <p className="text-gray-700 text-[10px] max-w-2xl mx-auto uppercase tracking-widest leading-loose text-center">
                        A sensibilização salva motas. O conhecimento salva vidas. <br />
                        Todos os direitos reservados.
                    </p>
                </div>
            </footer>

        </div>
    );
};

export default WTechLisboaNov2026;
