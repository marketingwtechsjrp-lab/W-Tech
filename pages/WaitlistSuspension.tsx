import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
    CheckCircle, 
    ArrowRight, 
    ShieldCheck, 
    Zap, 
    Bike, 
    Wrench, 
    ChevronRight, 
    CheckCircle2, 
    AlertTriangle,
    Clock
} from 'lucide-react';
import { handleLeadUpsert } from '../lib/leadDistribution';
import { sendWhatsAppMessage } from '../lib/whatsapp';
import { useSettings } from '../context/SettingsContext';
import { GridVignetteBackground } from '../components/ui/vignette-grid-background';
import { Marquee } from '../components/ui/marquee';
import SEO from '../components/SEO';

const RegistrationForm = () => {
    const [formData, setFormData] = useState({ name: '', phone: '' });
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const noemiId = '407d09b8-8205-4697-a726-1738cf7e20ef';
            
            // 1. Save/Update Lead using centralized logic
            await handleLeadUpsert({
                name: formData.name,
                phone: formData.phone,
                type: 'Suspension_Waitlist',
                status: 'New',
                context_id: 'LP_Waitlist_Suspension_Course',
                tags: ['Suspension_Waitlist', 'Scarcity', 'Instagram_Fomentation'],
                assigned_to: noemiId
            });

            // 2. WhatsApp Dispatch - Secured via custom instance wtech-suporte-curso
            const message = `Olá, ${formData.name}! Tudo bem?\n\nAqui é da equipe oficial da W-Tech. 🛠️🏁\n\nSua inscrição na FILA DE ESPERA para o *Curso de Regulagem de Suspensão Para Piloto* foi confirmada com sucesso!\n\nE trago uma excelente notícia: por ter entrado na fila, a sua *PROMOÇÃO EXCLUSIVA está 100% GARANTIDA*!\n\nVocê garantiu o preço especial de lançamento com desconto máximo: de R$ 997,00 por apenas *R$ 347,00* + bônus inéditos que não serão oferecidos para mais ninguém.\n\nAbrimos as vagas nesta quinta-feira (dia 28) às 20h. Fique atento ao seu WhatsApp, pois você receberá o link de inscrição com prioridade máxima de 24h antes do público geral.\n\nAcelere com a gente! 🚀`;
            
            await sendWhatsAppMessage(formData.phone, message, 'wtech-suporte-curso');

            setSuccess(true);
        } catch (err: any) {
            console.error('Waitlist submission error:', err);
            setError('Ocorreu um erro ao processar seu cadastro. Verifique os dados e tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-10"
            >
                <div className="w-20 h-20 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 size={40} />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">Você está na fila!</h3>
                <p className="text-gray-400 mb-6 leading-relaxed">
                    Recebemos seu contato com sucesso. <br/>
                    Fique atento ao seu WhatsApp, você será o primeiro a ser avisado sobre a nova turma!
                </p>
                <div className="p-4 bg-wtech-gold/10 border border-wtech-gold/20 rounded-xl">
                    <p className="text-wtech-gold text-xs font-bold uppercase tracking-widest">Inscrição Confirmada & Promoção Garantida</p>
                </div>
            </motion.div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Price Scarcity Widget */}
            <div className="p-4 rounded-2xl bg-wtech-gold/10 border border-wtech-gold/20 text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-wtech-red text-white text-[8px] font-black uppercase px-2 py-0.5 rounded-bl-lg tracking-widest animate-pulse">
                    65% OFF
                </div>
                <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-2">Desconto Exclusivo da Fila de Espera</p>
                <div className="flex items-center justify-center gap-3">
                    <span className="text-gray-600 line-through text-sm">R$ 997</span>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-300 font-extrabold text-2xl">R$ 347,00</span>
                    <span className="text-wtech-gold text-[9px] font-black uppercase bg-wtech-gold/10 px-2 py-1 rounded border border-wtech-gold/20">Preço Garantido</span>
                </div>
                <p className="text-[9px] text-gray-500 uppercase font-bold tracking-wider mt-2">
                    ⚠️ Somente quem se cadastrar nesta fila hoje terá acesso a este valor.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Seu Nome Completo</label>
                        <input 
                            type="text" 
                            required
                            value={formData.name}
                            onChange={e => setFormData({...formData, name: e.target.value})}
                            className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-4 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-wtech-red/50 focus:border-wtech-red transition-all"
                            placeholder="Ex: João da Silva"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">WhatsApp (com DDD)</label>
                        <input 
                            type="tel" 
                            required
                            value={formData.phone}
                            onChange={e => setFormData({...formData, phone: e.target.value})}
                            className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-4 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-wtech-red/50 focus:border-wtech-red transition-all"
                            placeholder="(00) 00000-0000"
                        />
                    </div>
                </div>

                {error && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                        <p className="text-red-400 text-xs text-center font-bold tracking-tight">{error}</p>
                    </div>
                )}

                <button 
                    type="submit" 
                    disabled={loading}
                    className="group relative w-full bg-gradient-to-r from-red-700 to-wtech-red text-white font-black py-5 px-6 rounded-2xl flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_30px_rgba(220,38,38,0.3)] disabled:opacity-50 overflow-hidden"
                >
                    <span className="relative z-10 flex items-center gap-2">
                        {loading ? 'PROCESSANDO...' : 'GARANTIR MINHA PROMOÇÃO E VAGA'}
                        {!loading && <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />}
                    </span>
                    <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                </button>
                <p className="text-center text-[10px] text-gray-500 uppercase font-black tracking-widest flex items-center justify-center gap-2">
                    <ShieldCheck size={12} /> Seus dados estão seguros e criptografados
                </p>
            </form>
        </div>
    );
};

const WaitlistSuspension: React.FC = () => {
    const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
    const [isExpired, setIsExpired] = useState(false);

    useEffect(() => {
        // Target is Thursday, May 28, 2026 at 20:00 (BRT Time)
        const target = new Date('2026-05-28T20:00:00-03:00').getTime();

        const updateTimer = () => {
            const now = new Date().getTime();
            const difference = target - now;

            if (difference <= 0) {
                setIsExpired(true);
                setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
                return;
            }

            const d = Math.floor(difference / (1000 * 60 * 60 * 24));
            const h = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const m = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
            const s = Math.floor((difference % (1000 * 60)) / 1000);

            setTimeLeft({ days: d, hours: h, minutes: m, seconds: s });
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="min-h-screen bg-[#050505] text-white selection:bg-wtech-red selection:text-white font-sans overflow-x-hidden">
            <SEO 
                title="Fila de Espera - Curso de Suspensão" 
                description="As vagas para o Curso de Suspensão Para Piloto Off Road estão esgotadas no momento. Entre na fila de espera."
            />

            {/* Scarcity Banner */}
            <div className="bg-wtech-red text-white py-2.5 px-4 text-center sticky top-0 z-50 shadow-md">
                <div className="container mx-auto flex items-center justify-center gap-4 text-xs font-black uppercase tracking-[.2em]">
                    <AlertTriangle size={14} className="animate-pulse text-yellow-300" />
                    Abertura Oficial em 3 Dias! Fila com Desconto Exclusivo Liberada!
                </div>
            </div>

            {/* Hero Section */}
            <section className="relative min-h-screen flex items-center justify-center py-20 overflow-hidden">
                {/* BG from V1 Header */}
                <div className="absolute inset-0 z-0">
                    <div className="absolute inset-0 bg-cover bg-top lg:bg-center bg-no-repeat bg-[url('/hero-mobile-alex.jpg')] md:bg-[url('/hero-desktop-alex.jpg')]" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-black/80 to-black/60 z-10" />
                    <div className="absolute inset-0 bg-black/40 z-10" />
                </div>
                
                <GridVignetteBackground className="opacity-40 z-10" />

                <div className="container mx-auto px-6 relative z-20">
                    <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-16 items-center">
                        
                        {/* Content */}
                        <div className="flex-1 space-y-10 text-center lg:text-left">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6 }}
                            >
                                <div className="inline-flex items-center gap-2 border border-red-500/30 bg-red-500/10 backdrop-blur-md px-4 py-1.5 rounded-full mb-8">
                                    <Clock size={14} className="text-red-500 animate-pulse" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-red-400">Turma Oficial Abre em Breve</span>
                                </div>
                                
                                <h1 className="text-5xl md:text-7xl lg:text-8xl font-black uppercase tracking-tighter leading-[0.85] mb-8">
                                    Abertura <br className="hidden md:block"/>
                                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 via-red-500 to-orange-600">Oficial</span>
                                </h1>
                                
                                <p className="text-lg md:text-xl text-gray-200 leading-relaxed max-w-2xl mx-auto lg:mx-0 font-medium">
                                    A estreia da abertura oficial do <strong className="text-white">Curso Online de Regulagem de Suspensão Para Piloto</strong> está confirmada em apenas 3 dias, com desconto especial garantido! 🛠️🏁
                                </p>
                            </motion.div>

                            {/* Premium Countdown Card */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6, delay: 0.1 }}
                                className="p-6 md:p-8 rounded-3xl bg-black/85 border border-wtech-gold/30 shadow-[0_0_50px_rgba(212,175,55,0.15)] backdrop-blur-md relative overflow-hidden"
                            >
                                <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-wtech-gold via-yellow-400 to-amber-600 animate-pulse" />
                                <div className="text-center mb-6">
                                    <span className="text-[10px] font-black uppercase tracking-[0.25em] text-wtech-gold animate-pulse">Lançamento oficial das vagas em:</span>
                                </div>
                                <div className="grid grid-cols-4 gap-4 text-center">
                                    {[
                                        { label: 'Dias', value: timeLeft.days },
                                        { label: 'Horas', value: timeLeft.hours },
                                        { label: 'Minutos', value: timeLeft.minutes },
                                        { label: 'Segundos', value: timeLeft.seconds }
                                    ].map((t, idx) => (
                                        <div key={idx} className="flex flex-col items-center">
                                            <div className="w-16 h-16 md:w-20 md:h-20 bg-zinc-900/80 rounded-2xl border border-white/10 flex items-center justify-center shadow-inner relative overflow-hidden group hover:border-wtech-gold/50 transition-all duration-300">
                                                <span className="text-2xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-gray-100 to-gray-400 font-mono tracking-tight select-none">
                                                    {String(t.value).padStart(2, '0')}
                                                </span>
                                            </div>
                                            <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-wider text-gray-500 mt-2">{t.label}</span>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>

                            <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6, delay: 0.2 }}
                                className="grid sm:grid-cols-2 gap-4"
                            >
                                <div className="p-6 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-sm group hover:border-wtech-gold/40 transition-all">
                                    <div className="w-12 h-12 bg-wtech-gold/10 text-wtech-gold rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                        <Zap size={24} />
                                    </div>
                                    <h3 className="font-black uppercase text-sm mb-2 text-white">Seja avisado antes</h3>
                                    <p className="text-xs text-gray-500 leading-relaxed">Quem está na fila de espera recebe o link de abertura com prioridade máxima de 24 horas.</p>
                                </div>
                                <div className="p-6 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-sm group hover:border-wtech-red/40 transition-all">
                                    <div className="w-12 h-12 bg-wtech-red/10 text-wtech-red rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                        <CheckCircle size={24} />
                                    </div>
                                    <h3 className="font-black uppercase text-sm mb-2 text-white">Bônus Inédito</h3>
                                    <p className="text-xs text-gray-500 leading-relaxed">Condição promocional e bônus ultra limitados aplicados apenas aos cadastrados nesta página.</p>
                                </div>
                            </motion.div>

                            {/* Trust Badge */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.8 }}
                                className="pt-4 flex flex-col items-center lg:items-start gap-4"
                            >
                                <div className="flex -space-x-3">
                                    {[1, 2, 3, 4, 5].map((i) => (
                                        <div key={i} className="w-10 h-10 rounded-full border-2 border-black bg-zinc-800 bg-cover bg-center" />
                                    ))}
                                    <div className="w-10 h-10 rounded-full border-2 border-black bg-wtech-gold text-black flex items-center justify-center text-[10px] font-black">+3K</div>
                                </div>
                                <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">+3.000 Alunos formados pela W-Tech</p>
                            </motion.div>
                        </div>

                        {/* Form Card */}
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.6, delay: 0.3 }}
                            className="w-full max-w-lg relative z-10"
                        >
                            <div className="relative p-8 md:p-12 rounded-[2rem] bg-zinc-950/90 border border-white/10 shadow-[0_0_80px_rgba(0,0,0,0.9)] overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-red-700 via-red-500 to-orange-500"></div>
                                <div className="text-center mb-8">
                                    <h2 className="text-3xl font-black text-white mb-3 uppercase tracking-tight italic">Garanta Seu Desconto</h2>
                                    <p className="text-gray-400 text-sm">Inscreva-se na fila de espera para receber a oferta no WhatsApp.</p>
                                </div>
                                <RegistrationForm />
                            </div>
                        </motion.div>
                    </div>
                </div>

                {/* Background Details */}
                <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-wtech-red/5 blur-[150px] rounded-full pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-wtech-gold/5 blur-[150px] rounded-full pointer-events-none" />
            </section>

            {/* What you'll access section */}
            <section className="py-24 bg-[#050505] relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-wtech-gold/40 to-transparent" />
                
                {/* Background Details */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-[400px] bg-wtech-gold/5 blur-[120px] rounded-full pointer-events-none" />

                <div className="container mx-auto px-6 relative z-10 mb-16">
                    <div className="text-center max-w-3xl mx-auto">
                        <span className="text-wtech-gold font-black uppercase tracking-[0.3em] text-[10px] md:text-xs">Grade Completa</span>
                        <h2 className="text-4xl md:text-6xl font-black uppercase mt-4 mb-6 tracking-tighter">
                            O Que Você Vai <br/>
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-wtech-gold to-yellow-500">Ter Acesso No Curso</span>
                        </h2>
                        <p className="text-gray-400 text-base leading-relaxed">
                            O treinamento é completo e aborda desde os fundamentos teóricos até a parte prática de cockpit e suspensões dianteira e traseira. Veja o que está incluso:
                        </p>
                    </div>
                </div>

                {/* Modules Carousel */}
                <div className="relative w-full overflow-hidden flex flex-col gap-6 mb-16">
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
                                className="h-[200px] md:h-[260px] w-auto rounded-2xl border border-white/10 shadow-2xl object-contain hover:scale-105 transition-transform duration-300 mx-2"
                            />
                        ))}
                    </Marquee>

                    <div className="pointer-events-none absolute inset-y-0 left-0 w-1/6 bg-gradient-to-r from-[#050505] to-transparent z-10"></div>
                    <div className="pointer-events-none absolute inset-y-0 right-0 w-1/6 bg-gradient-to-l from-[#050505] to-transparent z-10"></div>
                </div>

                {/* Additional access highlights */}
                <div className="container mx-auto px-6 relative z-10 max-w-5xl">
                    <div className="grid sm:grid-cols-3 gap-6 text-center">
                        {[
                            { title: "Metodologia Off-Road", desc: "Aprenda do SAG aos cliques de forma 100% prática e didática." },
                            { title: "Material de Apoio", desc: "Tabelas e guias de acerto rápidos para levar para a pista." },
                            { title: "Suporte Especializado", desc: "Canal direto com nossa equipe técnica para sanar suas dúvidas." }
                        ].map((item, idx) => (
                            <div key={idx} className="p-6 rounded-2xl bg-zinc-950/60 border border-white/5 backdrop-blur-sm group hover:border-wtech-gold/30 transition-all duration-300">
                                <h3 className="font-black text-white text-sm uppercase tracking-wider mb-2 group-hover:text-wtech-gold transition-colors">{item.title}</h3>
                                <p className="text-xs text-gray-500 leading-relaxed">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 bg-black border-t border-white/5">
                <div className="container mx-auto px-6 text-center">
                    <img 
                        src="https://w-techstore.com.br/wp-content/uploads/2025/11/logo-w-tech-branca.png" 
                        alt="W-Tech" 
                        className="h-8 mx-auto mb-6 opacity-30" 
                    />
                    <p className="text-gray-600 text-[10px] font-bold uppercase tracking-[0.4em] mb-2">W-Tech Brasil | Fila de Espera Suspensão</p>
                    <p className="text-gray-800 text-[10px] uppercase tracking-widest">
                        Todos os direitos reservados © {new Date().getFullYear()}
                    </p>
                </div>
            </footer>
        </div>
    );
};

export default WaitlistSuspension;
