import React, { useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
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
    Instagram,
    ShieldCheck,
    Cpu,
    Target,
    Activity,
    Wrench,
    Clock,
    Play
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

const LPWTechLisboa: React.FC = () => {
    const { shouldAnimate } = useMotionConfig();
    const [form, setForm] = useState({ name: '', email: '', phone: '', reason: '' });
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const assignedTo = '407d09b8-8205-4697-a726-1738cf7e20ef'; // Andre (Exclusivo para Lisboa)
            const payload = {
                name: form.name,
                email: form.email,
                phone: form.phone,
                type: 'Course_Waitlist',
                status: 'New',
                context_id: `WTECH EUROPA LISBOA 2026`,
                tags: ['WTECH_EUROPA_2026', 'COURSE_PAID'],
                assigned_to: assignedTo,
                notes: form.reason
            };

            const { error } = await supabase.from('SITE_Leads').insert([payload]);
            if (error) throw error;

            await triggerWebhook('webhook_lead', payload);
            setSubmitted(true);
        } catch (err) {
            console.error('Error submitting lead:', err);
            alert('Erro ao enviar. Tente novamente ou entre em contato via WhatsApp.');
        }
        setLoading(false);
    };

    const scrollToForm = () => {
        document.getElementById('registration-form')?.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <div className="min-h-screen bg-[#050505] text-white selection:bg-wtech-red selection:text-white font-sans overflow-x-hidden">
            
            {/* TOP BAR / URGENCY */}
            <div className="bg-wtech-red text-white text-[10px] md:text-xs font-black uppercase tracking-[0.3em] text-center py-2.5 px-4 sticky top-0 z-50 shadow-2xl">
                🔥 ÚLTIMAS VAGAS: CURSO LISBOA 25–26 DE ABRIL
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
                    <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/40 to-[#050505] z-10"></div>
                    <iframe
                        src="https://www.youtube.com/embed/yWofinvE0Xg?autoplay=1&mute=1&loop=1&controls=0&showinfo=0&rel=0&playlist=yWofinvE0Xg"
                        className="w-full h-full object-cover scale-[1.3] brightness-[0.3] pointer-events-none"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    ></iframe>
                </div>

                <div className="container mx-auto px-6 relative z-20 text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="inline-flex items-center gap-2 border border-wtech-red/30 bg-wtech-red/10 backdrop-blur-xl px-5 py-2 rounded-full mb-8 shadow-xl"
                    >
                        <Zap size={14} className="text-wtech-red animate-pulse" />
                        <span className="text-[10px] md:text-sm font-black uppercase tracking-[0.3em] text-white">Lisboa | 25–26 de Abril</span>
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-5xl md:text-8xl lg:text-9xl font-black uppercase tracking-tighter leading-[0.8] mb-8"
                    >
                        W-Tech<br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-300 to-gray-500">Europa</span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="max-w-3xl mx-auto text-lg md:text-2xl text-gray-400 font-medium mb-12 leading-relaxed"
                    >
                        O curso que eleva o ajuste de suspensão ao <span className="text-white font-black">Padrão Internacional</span>. <br className="hidden md:block" />
                        Aprenda com quem desenvolve a tecnologia.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.6 }}
                    >
                        <button
                            onClick={scrollToForm}
                            className="bg-wtech-red hover:bg-black text-white px-12 py-6 rounded-sm font-black text-xl uppercase tracking-widest transition-all hover:scale-105 flex items-center gap-4 mx-auto group shadow-[0_0_50px_rgba(230,0,0,0.4)]"
                        >
                            Garantir a Minha Vaga <ArrowRight className="group-hover:translate-x-2 transition-transform" strokeWidth={3} />
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
                            <span className="text-2xl font-black uppercase tracking-tighter">2 Dias de Imersão</span>
                            <span className="text-xs text-gray-500 uppercase font-bold tracking-widest text-center">Teoria e Prática Intensiva</span>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                            <MapPin className="text-wtech-red mb-2" size={32} />
                            <span className="text-2xl font-black uppercase tracking-tighter">Liqui Moly HQ</span>
                            <span className="text-xs text-gray-500 uppercase font-bold tracking-widest text-center">Sintra Business Park</span>
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
                                    Pela primeira vez, a <strong className="text-white">metodologia W-Tech</strong> chega de forma oficial e presencial em solo europeu para entregar uma formação técnica, profunda e sem rodeios.
                                </motion.p>
                                <motion.p variants={fadeUp}>
                                    Este não é apenas um curso. É uma transferência de tecnologia para quem quer dominar o que acontece <strong>dentro da suspensão</strong>, eliminando o achismo de uma vez por todas.
                                </motion.p>
                                <motion.div variants={fadeUp} className="border-l-4 border-wtech-red pl-8 py-2 italic text-gray-300 bg-white/5 rounded-r-xl">
                                    "Treinar dentro do Experience Center da Liqui Moly é posicionamento. É entregar o que há de mais moderno no mundo das suspensões."
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

            {/* CURRICULUM BENTO GRID */}
            <section className="py-24 bg-black">
                <div className="container mx-auto px-6">
                    <div className="text-center mb-20">
                        <span className="text-wtech-red font-black uppercase tracking-[0.4em] text-xs">O que você vai dominar</span>
                        <h2 className="text-4xl md:text-6xl font-black uppercase mt-4 tracking-tighter">Engenharia de <span className="text-gray-500">Performance</span></h2>
                    </div>

                    <div className="grid md:grid-cols-12 gap-6 auto-rows-[240px]">
                        {/* Box 1 */}
                        <div className="md:col-span-8 bg-zinc-900/50 border border-white/5 rounded-3xl p-10 flex flex-col justify-end group hover:border-wtech-red/30 transition-all">
                            <Activity className="text-wtech-red mb-auto" size={40} />
                            <h3 className="text-2xl font-black uppercase text-white mb-2">Hidráulica Avançada</h3>
                            <p className="text-gray-500 text-sm leading-relaxed max-w-md">Entenda a física real do fluxo de óleo, cavitação e como as válvulas controlam cada milímetro do curso.</p>
                        </div>
                        {/* Box 2 */}
                        <div className="md:col-span-4 bg-zinc-900/50 border border-white/5 rounded-3xl p-10 flex flex-col justify-end group hover:border-wtech-red/30 transition-all">
                            <Target className="text-wtech-red mb-auto" size={40} />
                            <h3 className="text-2xl font-black uppercase text-white mb-2">Diagnóstico</h3>
                            <p className="text-gray-500 text-sm leading-relaxed">Método lógico para identificar falhas antes mesmo de abrir a suspensão.</p>
                        </div>
                        {/* Box 3 */}
                        <div className="md:col-span-4 bg-zinc-900/50 border border-white/5 rounded-3xl p-10 flex flex-col justify-end group hover:border-wtech-red/30 transition-all">
                            <Settings className="text-wtech-red mb-auto" size={40} />
                            <h3 className="text-2xl font-black uppercase text-white mb-2">Setup Real</h3>
                            <p className="text-gray-500 text-sm leading-relaxed">Cargas de molas, SAG e geometria para cada tipo de piloto e terreno.</p>
                        </div>
                        {/* Box 4 */}
                        <div className="md:col-span-8 bg-gradient-to-br from-wtech-red/20 to-zinc-900/50 border border-wtech-red/20 rounded-3xl p-10 flex flex-col justify-end group hover:border-wtech-red/40 transition-all">
                            <Zap className="text-wtech-red mb-auto" size={40} />
                            <h3 className="text-2xl font-black uppercase text-white mb-2">Metodologia W-Tech</h3>
                            <p className="text-gray-300 text-sm leading-relaxed max-w-md italic">O processo padronizado que permitiu à W-Tech se tornar referência global em preparação de suspensões.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* LOCATION / LIQUI MOLY */}
            <section className="py-24 relative bg-zinc-950 overflow-hidden">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent"></div>
                <div className="container mx-auto px-6 relative z-10">
                    <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
                        <div className="max-w-xl">
                            <img src="https://liquimoly.cloudimg.io/v7/https://www.liqui-moly.com/static/version1765819485/frontend/limo/base/default/images/logo.svg" alt="Liqui Moly" className="h-16 mb-8 bg-white p-2 rounded shadow-xl" />
                            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter">Onde a Inovação<br /> Acontece</h2>
                        </div>
                        <div className="pb-2">
                            <p className="text-gray-500 text-sm font-bold uppercase tracking-widest bg-blue-500/10 border border-blue-500/20 px-4 py-2 rounded-full text-blue-400">
                                Sintra Business Park | Edifício 01
                            </p>
                        </div>
                    </div>

                    <div className="grid lg:grid-cols-2 gap-12">
                        <div className="bg-zinc-900 border border-white/5 rounded-3xl overflow-hidden p-8 md:p-12 relative group">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 blur-[80px]"></div>
                            <div className="relative z-10">
                                <h3 className="text-2xl font-black uppercase text-white mb-6">Localização Premium</h3>
                                <p className="text-gray-400 mb-8 leading-relaxed">
                                    O Experience Center da Liqui Moly Iberia oferece a infraestrutura perfeita para uma formação de alto nível, com tecnologia de ponta e ambiente profissional.
                                </p>
                                <div className="space-y-4 mb-10">
                                    <div className="flex items-center gap-4 text-gray-300">
                                        <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500"><MapPin size={20} /></div>
                                        <span className="text-sm font-bold">2710-089 Sintra – Portugal</span>
                                    </div>
                                    <div className="flex items-center gap-4 text-gray-300">
                                        <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500"><Instagram size={20} /></div>
                                        <span className="text-sm font-bold">@liquimolyiberia</span>
                                    </div>
                                </div>
                                <a
                                    href="https://maps.app.goo.gl/zYHt7GsrH78yfeKS9"
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
                                src="https://www.youtube.com/embed/JqDGXUdsSrQ?rel=0"
                                allowFullScreen
                            ></iframe>
                        </div>
                    </div>
                </div>
            </section>

            {/* INSTRUCTOR: ALEX ONLY */}
            <section className="py-24 bg-black">
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

            {/* FORM SECTION */}
            <section id="registration-form" className="py-24 relative overflow-hidden">
                <div className="absolute inset-0 z-0">
                    <img src="https://w-techbrasil.com.br/wp-content/uploads/2023/12/EFP04493.jpg" className="w-full h-full object-cover brightness-[0.2]" alt="Form BG" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/80 to-transparent"></div>
                </div>

                <div className="container mx-auto px-6 relative z-10">
                    <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-20 items-center">
                        <div>
                            <h2 className="text-5xl md:text-7xl font-black uppercase mb-8 tracking-tighter leading-[0.9]">Últimas Vagas<br /><span className="text-wtech-red text-6xl md:text-8xl">Disponíveis</span></h2>
                            <p className="text-gray-400 text-lg mb-10 leading-relaxed max-w-md">
                                As vagas são preenchidas por ordem de candidatura validada. A nossa equipa entrará em contacto para os próximos passos.
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

                        <div className="bg-white/5 backdrop-blur-3xl border border-white/10 p-8 md:p-12 rounded-[2rem] shadow-2xl">
                            {submitted ? (
                                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-10">
                                    <div className="w-20 h-20 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-8 animate-bounce">
                                        <CheckCircle size={40} />
                                    </div>
                                    <h3 className="text-3xl font-black uppercase mb-4">Candidatura Enviada!</h3>
                                    <p className="text-gray-400 mb-8">Fique atento ao seu Telemóvel/WhatsApp. Entraremos em contacto em breve.</p>
                                    <button onClick={() => setSubmitted(false)} className="text-xs font-black uppercase text-gray-500 hover:text-white transition-colors underline tracking-widest">Enviar Outra</button>
                                </motion.div>
                            ) : (
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-2">Nome Completo</label>
                                        <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full bg-white/5 border border-white/10 p-4 rounded-xl focus:ring-2 focus:ring-wtech-red outline-none transition-all font-bold text-lg" placeholder="Seu nome" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-2">Telemóvel / WhatsApp</label>
                                        <input required value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="w-full bg-white/5 border border-white/10 p-4 rounded-xl focus:ring-2 focus:ring-wtech-red outline-none transition-all font-bold text-lg" placeholder="+351 ..." />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-2">E-mail Profissional</label>
                                        <input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full bg-white/5 border border-white/10 p-4 rounded-xl focus:ring-2 focus:ring-wtech-red outline-none transition-all font-bold text-lg" placeholder="email@exemplo.com" />
                                    </div>
                                    <button
                                        disabled={loading}
                                        className="w-full bg-wtech-red hover:bg-white hover:text-wtech-red text-white py-6 rounded-xl font-black text-lg uppercase tracking-widest transition-all shadow-[0_20px_40px_rgba(230,0,0,0.3)] disabled:opacity-50"
                                    >
                                        {loading ? 'A Enviar...' : 'Candidatar-me ao Curso'}
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
                    <p className="text-gray-600 text-[10px] font-black uppercase tracking-[0.5em] mb-4">W-Tech Europa | Lisboa 2026</p>
                    <p className="text-gray-800 text-[10px] uppercase font-bold tracking-widest">
                        O futuro das suspensões começa aqui.<br />Todos os direitos reservados ®
                    </p>
                </div>
            </footer>
        </div>
    );
};

export default LPWTechLisboa;
