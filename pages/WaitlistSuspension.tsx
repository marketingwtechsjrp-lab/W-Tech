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
import AnimatedShaderBackground from '../components/ui/animated-shader-background';
import SEO from '../components/SEO';

const RegistrationForm = () => {
    const { get } = useSettings();
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

            // 2. WhatsApp Dispatch - Secure via Centralized Library
            const message = `Olá ${formData.name}! Tudo bem?\n\nAqui é da equipe técnica da W-Tech. Vi que você entrou na nossa FILA DE ESPERA para o Curso de Suspensão Para Piloto.\n\nAs vagas para a turma atual esgotaram muito rápido, mas não se preocupe: você acaba de garantir PRIORIDADE na próxima abertura. Faremos um contato em breve para te passar os detalhes e um bônus exclusivo por ter aguardado. 🛠️🏁`;
            
            await sendWhatsAppMessage(formData.phone, message, noemiId);

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
                    <p className="text-wtech-gold text-xs font-bold uppercase tracking-widest">Aguarde nosso contato</p>
                </div>
            </motion.div>
        );
    }

    return (
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
                    {loading ? 'PROCESSANDO...' : 'QUERO ENTRAR NA FILA DE ESPERA'}
                    {!loading && <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />}
                </span>
                <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
            </button>
            <p className="text-center text-[10px] text-gray-500 uppercase font-black tracking-widest flex items-center justify-center gap-2">
                <ShieldCheck size={12} /> Seus dados estão seguros
            </p>
        </form>
    );
};

const WaitlistSuspension: React.FC = () => {
    return (
        <div className="min-h-screen bg-[#050505] text-white selection:bg-wtech-red selection:text-white font-sans overflow-x-hidden">
            <SEO 
                title="Fila de Espera - Curso de Suspensão" 
                description="As vagas para o Curso de Suspensão Para Piloto Off Road estão esgotadas no momento. Entre na fila de espera."
            />

            {/* Scarcity Banner */}
            <div className="bg-wtech-red text-white py-2.5 px-4 text-center sticky top-0 z-50 shadow-md">
                <div className="container mx-auto flex items-center justify-center gap-4 text-xs font-black uppercase tracking-[.2em]">
                    <AlertTriangle size={14} className="animate-pulse" />
                    As Inscrições para a última turma ESGOTARAM!
                </div>
            </div>

            {/* Hero Section */}
            <section className="relative min-h-screen flex items-center justify-center py-20">
                <AnimatedShaderBackground />
                <GridVignetteBackground className="opacity-40" />

                <div className="container mx-auto px-6 relative z-10">
                    <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-16 items-center">
                        
                        {/* Content */}
                        <div className="flex-1 space-y-10 text-center lg:text-left">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6 }}
                            >
                                <div className="inline-flex items-center gap-2 border border-red-500/30 bg-red-500/10 backdrop-blur-md px-4 py-1.5 rounded-full mb-8">
                                    <Clock size={14} className="text-red-500" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-red-400">Vagas Temporariamente Indisponíveis</span>
                                </div>
                                
                                <h1 className="text-5xl md:text-7xl lg:text-8xl font-black uppercase tracking-tighter leading-[0.85] mb-8">
                                    Vagas <br className="hidden md:block"/>
                                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 via-red-500 to-orange-600">Esgotadas</span>
                                </h1>
                                
                                <p className="text-lg md:text-xl text-gray-300 leading-relaxed max-w-2xl mx-auto lg:mx-0 font-medium">
                                    Infelizmente as vagas para o <strong className="text-white">Curso Online de Suspensão Para Piloto</strong> foram preenchidas em tempo recorde. 🛠️🏁
                                </p>
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
                                    <p className="text-xs text-gray-500 leading-relaxed">Quem está na fila de espera recebe o link de abertura 24h antes do lançamento geral.</p>
                                </div>
                                <div className="p-6 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-sm group hover:border-wtech-red/40 transition-all">
                                    <div className="w-12 h-12 bg-wtech-red/10 text-wtech-red rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                        <CheckCircle size={24} />
                                    </div>
                                    <h3 className="font-black uppercase text-sm mb-2 text-white">Bônus Exclusivo</h3>
                                    <p className="text-xs text-gray-500 leading-relaxed">Teremos uma condição diferenciada (Desconto + Bônus) apenas para quem aguardou na fila.</p>
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
                                        <div key={i} className={`w-10 h-10 rounded-full border-2 border-black bg-zinc-800 bg-cover bg-center`} />
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
                            className="w-full max-w-lg"
                        >
                            <div className="relative p-8 md:p-12 rounded-[2rem] bg-zinc-950/80 border border-white/10 shadow-[0_0_80px_rgba(0,0,0,0.8)] overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-red-700 via-red-500 to-orange-500"></div>
                                <div className="text-center mb-10">
                                    <h2 className="text-3xl font-black text-white mb-3 uppercase tracking-tight italic">Entre na Fila</h2>
                                    <p className="text-gray-400 text-sm">Não perca o aviso da próxima turma. Digite seus dados agora.</p>
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
