import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, MapPin, Users, Settings, Wrench, ChevronRight, CheckCircle2, Play } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { sendWhatsAppMessage } from '../lib/whatsapp';
import { useSettings } from '../context/SettingsContext';

const RegistrationForm = () => {
    const { get } = useSettings();
    const defaultWhatsApp = get('whatsapp_phone', '5511999999999');
    
    const [formData, setFormData] = useState({ name: '', phone: '' });
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // Save Lead to W-Tech CRM using correct schema
            const { error: dbError } = await supabase.from('SITE_Leads').insert([{
                name: formData.name,
                phone: formData.phone,
                type: 'Pronello_Event',
                status: 'New',
                context_id: 'LP_Pronello_Immersion',
                tags: ['Pronello_Event', 'Gratuito'],
                assigned_to: '407d09b8-8205-4697-a726-1738cf7e20ef' // Noemi
            }]);

            if (dbError) throw dbError;

            // WhatsApp Dispatch - Direct Evolution API call using NoemiMarketing instance
            try {
                const instanceName = 'NoemiMarketing';
                const apiKey = 'F33D9C5524C6-4231-97A8-47CCFD2364A2';
                const evolutionUrl = 'https://api.2b.app.br';

                let formattedPhone = formData.phone.replace(/\D/g, '');
                if (!formattedPhone.startsWith('55')) {
                    formattedPhone = '55' + formattedPhone;
                }

                const response = await fetch(`${evolutionUrl}/message/sendText/${instanceName}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': apiKey
                    },
                    body: JSON.stringify({
                        number: formattedPhone,
                        text: `Olá ${formData.name}! Confirmamos sua inscrição para a Imersão Pronello na W-Tech no dia 10 de Abril. O evento é 100% gratuito e restam poucas vagas. Fique atento, nossa equipe confirmará os próximos passos.`
                    })
                });
                
                if (response.ok) {
                    console.log('WhatsApp message sent successfully via NoemiMarketing API.');
                } else {
                    console.error('Failed to send WhatsApp message via Evolution API', await response.text());
                }
            } catch (whatsappErr) {
                console.error('Erro ao disparar WhatsApp:', whatsappErr);
            }

            setSuccess(true);
            
            // Redirect to Marketing WhatsApp (+55 17 98111-6902)
            const marketingPhone = '5517981116902';
            const redirectUrl = `https://wa.me/${marketingPhone}?text=${encodeURIComponent('Olá, acabei de me inscrever para a Imersão Pronello Gratuita e gostaria de mais informações.')}`;
            setTimeout(() => {
                window.location.href = redirectUrl;
            }, 1000);

        } catch (err: any) {
            console.error('Submission error:', err);
            setError('Ocorreu um erro ao processar sua inscrição. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="text-center py-8">
                <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-20 h-20 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6"
                >
                    <CheckCircle2 size={40} />
                </motion.div>
                <h3 className="text-2xl font-bold text-white mb-2">Inscrição Confirmada!</h3>
                <p className="text-gray-400 mb-6">Redirecionando você para o nosso WhatsApp...</p>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Nome Completo</label>
                <input 
                    type="text" 
                    required
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-wtech-red/50 focus:border-wtech-red transition-all"
                    placeholder="Digite seu nome"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">WhatsApp</label>
                <input 
                    type="tel" 
                    required
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-wtech-red/50 focus:border-wtech-red transition-all"
                    placeholder="(11) 99999-9999"
                />
            </div>

            {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <p className="text-red-400 text-sm text-center">{error}</p>
                </div>
            )}

            <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-wtech-red hover:bg-red-700 text-white font-bold py-4 px-6 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed group relative overflow-hidden shadow-[0_0_20px_rgba(220,38,38,0.4)]"
            >
                <span className="relative z-10 flex items-center gap-2">
                    {loading ? 'Processando...' : 'GARANTIR MINHA VAGA GRATUITA'}
                    {!loading && <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />}
                </span>
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out"></div>
            </button>
            
            <p className="text-center text-sm font-bold text-gray-400 flex items-center justify-center gap-2">
                Restam apenas <span className="text-wtech-red px-2 py-1 bg-wtech-red/10 rounded-md border border-wtech-red/20">20 VAGAS</span>
            </p>
        </form>
    );
};

const PronelloImmersion = () => {
    const [isPlaying, setIsPlaying] = useState(false);
    const videoRef = React.useRef<HTMLVideoElement>(null);

    const handlePlay = () => {
        if (videoRef.current) {
            videoRef.current.play();
            setIsPlaying(true);
        }
    };

    return (
        <div className="min-h-screen bg-wtech-black text-white font-sans selection:bg-wtech-red selection:text-white pb-0">
            {/* Scarcity Banner (Fixed) */}
            <div className="bg-wtech-red text-white py-3 px-4 text-center text-sm md:text-base font-bold tracking-widest uppercase z-50 relative animate-pulse shadow-xl shadow-wtech-red/20">
                🚨 ATENÇÃO: EVENTO 100% GRATUITO — APENAS 20 VAGAS DISPONÍVEIS! 🚨
            </div>

            {/* Hero Section */}
            <div className="relative overflow-hidden pt-28 pb-24 lg:pt-32 lg:pb-32 px-6">
                {/* Background Image with Overlay */}
                <div className="absolute inset-0 z-0">
                    <img 
                        src="/images/pronello_hero_bg.jpg" 
                        alt="Pronello Dynamometer" 
                        className="w-full h-full object-cover opacity-80 brightness-[0.7] contrast-125"
                    />
                    <div className="absolute inset-0 bg-gradient-to-br from-wtech-black/60 via-wtech-black/40 to-transparent"></div>
                </div>
                
                {/* Branding Logos - Desktop & Mobile (absolute positioned) */}
                <div className="absolute top-6 md:top-8 left-0 w-full z-30 pointer-events-none">
                    <div className="container mx-auto px-4 md:px-6 flex justify-between items-center">
                        <img 
                            src="https://w-techstore.com.br/wp-content/uploads/2025/11/logo-w-tech-branca.png" 
                            alt="W-Tech" 
                            className="h-7 md:h-12 object-contain opacity-90" 
                        />
                        <div className="flex items-center gap-2 md:gap-4 bg-white/5 backdrop-blur-md px-3 md:px-4 py-1.5 md:py-2 rounded-xl border border-white/10">
                            <span className="text-[10px] items-center font-bold text-gray-500 uppercase tracking-widest hidden md:inline-block">Oferecimento:</span>
                            <img 
                                src="/logo-pronello.png" 
                                alt="Pronello" 
                                className="h-6 md:h-8 object-contain"
                            />
                        </div>
                    </div>
                </div>
                
                <div className="absolute top-0 right-0 w-1/2 h-full opacity-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-wtech-red/60 via-transparent to-transparent z-0"></div>
                
                <div className="container mx-auto max-w-6xl relative z-10">
                    {/* Mobile Inline Logos Removed -> Using absolute positioning with enough padding instead */}

                    <div className="flex flex-col lg:flex-row gap-16 items-center">
                        
                        {/* Content */}
                        <motion.div 
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6 }}
                            className="flex-1 space-y-8"
                        >
                            <div className="inline-flex flex-wrap gap-3">
                                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-wtech-red/10 border border-wtech-red/20 text-wtech-red text-sm font-bold uppercase tracking-wide shadow-[0_0_15px_rgba(220,38,38,0.2)]">
                                    <span className="w-2 h-2 rounded-full bg-wtech-red animate-ping absolute"></span>
                                    <span className="w-2 h-2 rounded-full bg-wtech-red relative"></span>
                                    IMERSÃO 100% GRATUITA
                                </div>
                                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-500 text-sm font-bold uppercase tracking-wide">
                                    20 VAGAS REAIS
                                </div>
                            </div>
                            
                            <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold leading-tight">
                                Imersão <br/> <span className="text-transparent bg-clip-text bg-gradient-to-r from-wtech-red to-orange-500">Pronello</span>
                                <span className="block text-2xl md:text-3xl text-gray-400 mt-4 font-normal tracking-tight">Domine o Dinamômetro na W-Tech</span>
                            </h1>
                            
                            <p className="text-lg md:text-xl text-gray-300 leading-relaxed max-w-2xl">
                                Uma oportunidade única de aprender com a equipe da Pronello da Argentina. Vagas extremamente limitadas.
                            </p>

                            <div className="grid grid-cols-2 gap-6 pt-4">
                                <div className="flex items-center gap-4 text-gray-300 p-4 rounded-xl bg-white/5 border border-white/5 backdrop-blur-sm">
                                    <div className="w-12 h-12 rounded-lg bg-wtech-red/10 flex items-center justify-center text-wtech-red">
                                        <Calendar size={24} />
                                    </div>
                                    <div>
                                        <p className="text-xs text-wtech-red font-bold uppercase tracking-wider mb-1">Data</p>
                                        <p className="font-bold text-lg text-white">10 de Abril</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 text-gray-300 p-4 rounded-xl bg-white/5 border border-white/5 backdrop-blur-sm">
                                    <div className="w-12 h-12 rounded-lg bg-wtech-red/10 flex items-center justify-center text-wtech-red">
                                        <Clock size={24} />
                                    </div>
                                    <div>
                                        <p className="text-xs text-wtech-red font-bold uppercase tracking-wider mb-1">Horário</p>
                                        <p className="font-bold text-lg text-white">08:00 às 17:00</p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        {/* Top Form */}
                        <motion.div 
                            initial={{ opacity: 0, x: 30 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.6, delay: 0.2 }}
                            className="w-full max-w-md"
                        >
                            <div className="p-8 rounded-2xl bg-zinc-900 border border-white/10 relative overflow-hidden shadow-2xl">
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-wtech-red to-orange-500"></div>
                                <div className="text-center mb-8">
                                    <h3 className="text-2xl font-black text-white mb-2 uppercase tracking-tight">Vaga Gratuita</h3>
                                    <p className="text-gray-400 text-sm">Reserva 100% gratuita. Preencha seus dados reais agora.</p>
                                </div>
                                <RegistrationForm />
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>

            {/* Importance of Dynamometer Section */}
            <div className="py-24 bg-zinc-950 px-6 border-y border-white/5 relative">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
                <div className="container mx-auto max-w-6xl relative z-10">
                    <div className="text-center mb-16">
                        <span className="text-wtech-red font-bold tracking-widest text-sm uppercase mb-4 block">A IMPORTÂNCIA DO EQUIPAMENTO</span>
                        <h2 className="text-3xl md:text-5xl font-black mb-6">Por que ter um Dinamômetro Pronello<br/>na sua Oficina?</h2>
                        <p className="text-gray-400 max-w-2xl mx-auto text-lg">
                            Descubra como a precisão e a tecnologia Argentina do Dinamômetro Pronello podem elevar drasticamente o nível dos seus serviços.
                        </p>
                    </div>

                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                        <motion.div 
                            initial={{ opacity: 0, x: -30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="space-y-8"
                        >
                            <div className="flex gap-4 items-start">
                                <div className="mt-1 w-14 h-14 rounded-2xl bg-wtech-red/10 text-wtech-red border border-wtech-red/20 flex flex-col items-center justify-center shrink-0">
                                    <h3 className="text-xl font-black">1</h3>
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold mb-2 text-white">Diagnósticos Perfeitos</h3>
                                    <p className="text-gray-400 leading-relaxed text-sm">Identifique falhas ocultas com dados em tempo real, eliminando o achismo e garantindo a resolução exata do problema na primeira tentativa.</p>
                                </div>
                            </div>
                            <div className="flex gap-4 items-start">
                                <div className="mt-1 w-14 h-14 rounded-2xl bg-wtech-red/10 text-wtech-red border border-wtech-red/20 flex flex-col items-center justify-center shrink-0">
                                    <h3 className="text-xl font-black">2</h3>
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold mb-2 text-white">Acerto Fino Profissional</h3>
                                    <p className="text-gray-400 leading-relaxed text-sm">Entregue performance e economia com um ajuste milimétrico de injeção. Potencialize motos com relatórios claros de antes e depois.</p>
                                </div>
                            </div>
                            <div className="flex gap-4 items-start">
                                <div className="mt-1 w-14 h-14 rounded-2xl bg-wtech-red/10 text-wtech-red border border-wtech-red/20 flex flex-col items-center justify-center shrink-0">
                                    <h3 className="text-xl font-black">3</h3>
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold mb-2 text-white">Autoridade e Lucro</h3>
                                    <p className="text-gray-400 leading-relaxed text-sm">Destacar-se na região com tecnologia de ponta atrai mecânicos parceiros e clientes premium dispostos a valorizar a sua mão de obra.</p>
                                </div>
                            </div>
                        </motion.div>

                        <motion.div 
                            initial={{ opacity: 0, x: 30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="rounded-3xl overflow-hidden border border-white/10 shadow-[0_0_50px_rgba(220,38,38,0.15)] bg-black aspect-[4/5] md:aspect-[3/4] lg:aspect-[9/16] w-full max-w-[360px] mx-auto relative group cursor-pointer"
                            onClick={handlePlay}
                        >
                            <video 
                                ref={videoRef}
                                src="/images/Pronello.mov" 
                                controls={isPlaying}
                                playsInline
                                loop
                                onPlay={() => setIsPlaying(true)}
                                onPause={() => setIsPlaying(false)}
                                className="w-full h-full object-cover opacity-90"
                            />
                            
                            {!isPlaying && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/20 transition-all duration-300">
                                    <div className="w-20 h-20 rounded-full bg-wtech-red flex items-center justify-center text-white shadow-[0_0_30px_rgba(220,38,38,0.5)] transform group-hover:scale-110 transition-transform duration-300">
                                        <Play size={40} fill="currentColor" />
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </div>
                </div>
            </div>

            {/* Location Section */}
            <div className="py-24 bg-black px-6">
                <div className="container mx-auto max-w-6xl">
                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                        <motion.div 
                             initial={{ opacity: 0, x: -30 }}
                             whileInView={{ opacity: 1, x: 0 }}
                             viewport={{ once: true }}
                        >
                            <span className="text-wtech-red font-bold tracking-widest text-sm uppercase mb-4 block">SEDE OFICIAL</span>
                            <h2 className="text-4xl md:text-5xl font-black mb-8 leading-tight">Onde a Inovação <br/> Acontece</h2>
                            
                            <div className="space-y-8">
                                <div className="flex gap-6">
                                    <div className="shrink-0 w-14 h-14 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-center text-wtech-red">
                                        <MapPin size={28} />
                                    </div>
                                    <div>
                                        <h4 className="text-xl font-bold mb-2 text-white">Endereço (Sede W-Tech)</h4>
                                        <p className="text-gray-400 leading-relaxed text-lg">
                                            Rua Projetada A, 215<br/>
                                            Distrito Industrial I<br/>
                                            São José do Rio Preto - SP - Brasil
                                        </p>
                                    </div>
                                </div>
                                
                                <div className="p-6 rounded-xl bg-wtech-red/5 border border-wtech-red/10 inline-block">
                                    <p className="text-wtech-red font-medium">
                                        Prepare-se para uma estrutura técnica de ponta, climatizada e pronta para imersões automotivas.
                                    </p>
                                </div>
                            </div>
                        </motion.div>

                        <motion.div 
                             initial={{ opacity: 0, x: 30 }}
                             whileInView={{ opacity: 1, x: 0 }}
                             viewport={{ once: true }}
                             className="h-[400px] rounded-3xl overflow-hidden shadow-2xl shadow-wtech-red/10 ring-1 ring-white/10"
                        >
                            <iframe
                                width="100%"
                                height="100%"
                                frameBorder="0"
                                scrolling="no"
                                src="https://maps.google.com/maps?q=R.%20Zumbi%20dos%20Palmares,%20410%20-%20Jd.%20Paulista,%20S%C3%A3o%20Jos%C3%A9%20do%20Rio%20Preto%20-%20SP&t=&z=16&ie=UTF8&iwloc=&output=embed"
                                className="filter brightness-75 contrast-125 hover:brightness-100 transition-all duration-500 grayscale opacity-80"
                            ></iframe>
                        </motion.div>
                    </div>
                </div>
            </div>

            {/* Bottom CTA & Second Form */}
            <div className="py-24 bg-zinc-900 border-t border-wtech-red/20 relative overflow-hidden px-6">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,_var(--tw-gradient-stops))] from-wtech-red/20 via-transparent to-transparent"></div>
                
                <div className="container mx-auto max-w-4xl relative z-10">
                    <div className="text-center mb-12">
                        <h2 className="text-4xl md:text-5xl font-black mb-6 text-white uppercase tracking-tight">Última Chance</h2>
                        <p className="text-xl text-gray-300">
                            A Imersão é <strong className="text-wtech-red">100% Gratuita</strong> e exclusiva para até 20 participantes. 
                            Preencha agora para garantir seu lugar no dia 10 de Abril, das 08h às 17h.
                        </p>
                    </div>

                    <div className="max-w-md mx-auto p-8 rounded-2xl bg-black border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                        <RegistrationForm />
                    </div>
                </div>
            </div>

            {/* Footer space */}
            <div className="border-t border-white/5 bg-black py-8 text-center text-gray-600 text-sm">
                <p>&copy; {new Date().getFullYear()} W-Tech Brasil. Todos os direitos reservados.</p>
            </div>
        </div>
    );
};

export default PronelloImmersion;
