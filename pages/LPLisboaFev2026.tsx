import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import { distributeLead } from '../lib/leadDistribution';
import { triggerWebhook } from '../lib/webhooks';
import { 
  CheckCircle, 
  ArrowRight, 
  MapPin, 
  Calendar, 
  Clock, 
  ShieldCheck, 
  Bike, 
  Zap, 
  AlertTriangle, 
  Settings, 
  Microscope,
  Instagram,
  Phone
} from 'lucide-react';

const LPLisboaFev2026: React.FC = () => {
    const [form, setForm] = useState({ name: '', email: '', phone: '', bike: '' });
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const assignedTo = await distributeLead();
            const payload = {
                name: form.name,
                email: form.email,
                phone: form.phone,
                type: 'Lecture_Registration',
                status: 'New',
                context_id: `LP LISBOA ABRIL 2026${form.bike ? ': ' + form.bike : ''}`,
                tags: ['LISBOA_ABRIL_2026', 'LECTURE_FREE'],
                assigned_to: assignedTo
            };

            const { error } = await supabase.from('SITE_Leads').insert([payload]);
            if (error) throw error;
            
            await triggerWebhook('webhook_lead', payload);

            // Specific Webhook for Lisbon Event
            await fetch('https://webhook.2b.app.br/webhook/lisboa', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    timestamp: new Date().toISOString(),
                    page: 'LP_LISBOA_FEV_2026',
                    data: payload
                })
            }).catch(err => console.error('Lisboa specific webhook failed:', err));
            
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
            
            {/* STICKY CTA MOBILE */}
            <div className="md:hidden fixed bottom-6 left-6 right-6 z-50">
                <button 
                    onClick={scrollToForm}
                    className="w-full bg-wtech-red hover:bg-red-700 text-white font-black py-4 rounded-xl shadow-[0_0_30px_rgba(230,0,0,0.3)] transition-all active:scale-95 uppercase tracking-widest text-sm flex items-center justify-center gap-2"
                >
                    Garantir a Minha Vaga <ArrowRight size={18} />
                </button>
            </div>

            {/* NAVIGATION / LOGOS */}
            <nav className="absolute top-0 left-0 w-full z-30 py-6">
                <div className="container mx-auto px-6 flex justify-between items-center">
                    <img src="https://w-techstore.com.br/wp-content/uploads/2025/11/logo-w-tech-branca.png" alt="W-Tech" className="h-8 md:h-12 object-contain" />
                    <div className="flex items-center gap-4 md:gap-8">
                        <img src="https://proriders.com.br/wp-content/webp-express/webp-images/uploads/2025/09/Logo-Pro-Riders.png.webp" alt="ProRiders" className="h-6 md:h-10 object-contain" />
                    </div>
                </div>
            </nav>

            {/* HERO SECTION */}
            <section className="relative min-h-[100vh] flex items-center justify-center overflow-hidden pt-20">
                {/* Background Video/Image Overlay */}
                <div className="absolute inset-0 z-0 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/50 to-zinc-950 z-10"></div>
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(230,0,0,0.1)_0%,transparent_70%)] z-10"></div>
                    <iframe 
                        src="https://www.youtube.com/embed/3LqrvfmuUME?autoplay=1&mute=1&loop=1&controls=0&showinfo=0&rel=0&playlist=3LqrvfmuUME&start=9" 
                        className="absolute top-1/2 left-1/2 w-[600%] h-[600%] md:w-full md:h-full md:scale-150 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                    ></iframe>
                </div>

                <div className="container mx-auto px-6 relative z-20 text-center">
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="inline-flex items-center gap-2 border border-white/10 bg-white/5 backdrop-blur-xl px-4 py-2 rounded-full mb-8"
                    >
                        <span className="w-2 h-2 rounded-full bg-wtech-red animate-pulse"></span>
                        <span className="text-[10px] md:text-xs font-black uppercase tracking-[0.3em] text-gray-300">Palestra Gratuita • Art On Wheels</span>
                    </motion.div>
                    
                    <motion.h1 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-4xl md:text-8xl font-black uppercase tracking-tighter leading-[0.9] mb-8"
                    >
                        A Manutenção <br/>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-wtech-red via-red-500 to-orange-500 italic">Invisível</span>
                    </motion.h1>

                    <motion.p 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="max-w-3xl mx-auto text-lg md:text-2xl text-gray-400 font-medium leading-relaxed mb-12"
                    >
                        Descubra o que decide a vida da sua <span className="text-white">mota</span> na icónica <span className="text-wtech-red font-bold">Art On Wheels Garage</span>. Uma masterclass técnica exclusiva e <span className="text-white font-bold underline decoration-wtech-red underline-offset-4">100% gratuita</span>.
                    </motion.p>

                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.6 }}
                        className="flex flex-col md:flex-row gap-6 justify-center items-center"
                    >
                        <button 
                            onClick={scrollToForm}
                            className="group relative bg-wtech-red hover:bg-red-700 text-white px-12 py-6 rounded-none font-black text-xl uppercase tracking-widest transition-all hover:scale-105 flex items-center gap-4 overflow-hidden"
                        >
                            <span className="relative z-10 italic">Inscrever-se Agora</span>
                            <ArrowRight className="relative z-10 group-hover:translate-x-2 transition-transform" strokeWidth={3} />
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                        </button>
                    </motion.div>

                    {/* Quick Info Grid */}
                    <motion.div 
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.8 }}
                        className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 mt-20 max-w-5xl mx-auto border-t border-white/10 pt-10"
                    >
                        <div className="text-left">
                            <MapPin className="text-wtech-red mb-2" size={20} />
                            <div className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Local</div>
                            <div className="text-sm md:text-base font-bold text-white">Art On Wheels Garage</div>
                        </div>
                        <div className="text-left">
                            <Calendar className="text-wtech-red mb-2" size={20} />
                            <div className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Data</div>
                            <div className="text-sm md:text-base font-bold text-white">02 de Abril, 2026</div>
                        </div>
                        <div className="text-left">
                            <Clock className="text-wtech-red mb-2" size={20} />
                            <div className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Horário</div>
                            <div className="text-sm md:text-base font-bold text-white">19h</div>
                        </div>
                        <div className="text-left">
                            <Zap className="text-wtech-red mb-2" size={20} />
                            <div className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Investimento</div>
                            <div className="text-sm md:text-base font-bold text-wtech-red">100% GRATUITO</div>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* PROBLEM SECTION */}
            <section className="py-32 bg-black relative">
                <div className="container mx-auto px-6">
                    <div className="grid lg:grid-cols-2 gap-20 items-center">
                        <div>
                            <span className="text-wtech-red font-black uppercase tracking-[0.3em] text-xs">O Alerta</span>
                            <h2 className="text-4xl md:text-6xl font-black uppercase mt-4 mb-8 leading-tight">
                                Porque é que esta palestra é <span className="italic text-gray-500">vital?</span>
                            </h2>
                            <p className="text-xl text-gray-400 leading-relaxed mb-8">
                                A maioria dos problemas graves em motas não começa com um barulho alto. 
                                <span className="text-white font-bold block mt-4 text-2xl uppercase">Começam em silêncio.</span>
                            </p>
                            
                            <div className="space-y-6">
                                {[
                                    { title: 'Óleos que perdem viscosidade', text: 'Comprometendo a lubrificação interna sem você notar.' },
                                    { title: 'Peças móveis com desgaste invisível', text: 'Fricção que destrói componentes caros precocemente.' },
                                    { title: 'Suspensões ineficientes', text: 'Perda de leitura do solo e instabilidade fatal.' },
                                    { title: 'Amortecedores de direção', text: 'Quando falham, deixam você vulnerável a tank-slappers.' }
                                ].map((item, i) => (
                                    <div key={i} className="flex gap-4 group">
                                        <div className="w-12 h-12 shrink-0 bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-wtech-red transition-colors">
                                            <AlertTriangle className="text-wtech-red" size={20} />
                                        </div>
                                        <div>
                                            <h4 className="font-black uppercase text-white tracking-widest">{item.title}</h4>
                                            <p className="text-gray-500 text-sm">{item.text}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-12 p-8 bg-zinc-900 border-l-4 border-wtech-red">
                                <p className="text-lg font-medium italic text-gray-300">
                                    "Muitos proprietários só descobrem quando o prejuízo — ou o acidente — já aconteceu. Esta palestra existe para mudar essa realidade em Portugal."
                                </p>
                            </div>
                        </div>
                        <div className="relative group">
                            <div className="absolute -inset-4 bg-wtech-red/20 blur-3xl rounded-full opacity-50 group-hover:opacity-100 transition-opacity"></div>
                            <div className="relative border border-white/10 p-2 overflow-hidden bg-zinc-900">
                                <img 
                                    src="https://w-techstore.com.br/wp-content/uploads/2025/12/curso.webp" 
                                    alt="Technical Detail" 
                                    className="w-full grayscale group-hover:grayscale-0 transition-all duration-700"
                                />
                                <div className="absolute bottom-6 left-6 right-6 p-6 bg-black/80 backdrop-blur-md border border-white/10">
                                    <div className="text-2xl font-black uppercase text-white mb-2 tracking-tighter">Segurança real</div>
                                    <div className="text-xs font-bold uppercase text-wtech-red tracking-[0.2em]">Não é estética, é controle.</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* WHAT YOU WILL LEARN */}
            <section className="py-32 bg-[#050505]">
                <div className="container mx-auto px-6">
                    <div className="text-center mb-20">
                        <span className="text-wtech-red font-black uppercase tracking-[0.3em] text-xs underline decoration-2 underline-offset-8">O Conteúdo</span>
                        <h2 className="text-4xl md:text-6xl font-black uppercase mt-8">O que vai <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-500">dominar</span></h2>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {[
                            { icon: <Settings />, title: 'Óleo de Suspensão', text: 'Por que ele NÃO é vitalício e o que acontece quando vence.' },
                            { icon: <Zap />, title: 'Estabilidade', text: 'Como o desgaste interno afeta diretamente sua segurança nas curvas.' },
                            { icon: <ShieldCheck />, title: 'Amortecedores', text: 'O papel real dos componentes no controle dinâmico da moto.' },
                            { icon: <Microscope />, title: 'Diagnóstico', text: 'Como identificar sinais invisíveis de falha antes do colapso.' },
                            { icon: <Bike />, title: 'Erros Comuns', text: 'Mitos na manutenção que destroem suspensões modernas.' },
                            { icon: <CheckCircle />, title: 'Vida Útil', text: 'Técnicas práticas para prolongar a vida da moto e componentes.' }
                        ].map((item, i) => (
                            <div key={i} className="group p-10 bg-zinc-900 border border-white/5 hover:border-wtech-red/50 transition-all duration-500 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-20 transition-opacity">
                                    {React.cloneElement(item.icon as React.ReactElement, { size: 120 })}
                                </div>
                                <div className="text-wtech-red mb-6 relative z-10">{item.icon}</div>
                                <h3 className="text-xl font-black uppercase text-white mb-4 tracking-widest relative z-10">{item.title}</h3>
                                <p className="text-gray-500 leading-relaxed relative z-10">{item.text}</p>
                            </div>
                        ))}
                    </div>

                    <div className="mt-16 flex justify-center">
                        <div className="inline-flex items-center gap-4 bg-zinc-900 px-8 py-4 border border-white/10 rounded-full">
                            <span className="text-wtech-red font-bold">💡</span>
                            <span className="text-sm font-bold uppercase tracking-widest text-gray-400">Conhecimento técnico direto e sem complicações.</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* VIDEO HIGHLIGHT SECTION */}
            <section className="py-24 bg-black relative overflow-hidden">
                <div className="absolute inset-0 bg-wtech-red/5"></div>
                <div className="container mx-auto px-6 relative z-10">
                    <div className="max-w-5xl mx-auto">
                        <div className="text-center mb-12">
                            <span className="text-wtech-red font-black uppercase tracking-[0.3em] text-xs">Spoiler Técnico</span>
                            <h2 className="text-3xl md:text-5xl font-black uppercase mt-4 mb-8">
                                O que te espera em <span className="text-wtech-red">Lisboa</span>
                            </h2>
                        </div>
                        <div className="relative aspect-video bg-zinc-900 border border-white/10 overflow-hidden group shadow-2xl">
                            <iframe 
                                src="https://www.youtube.com/embed/3LqrvfmuUME?autoplay=0&rel=0" 
                                title="W-Tech Experience"
                                className="w-full h-full"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                allowFullScreen
                            ></iframe>
                        </div>
                        <div className="mt-8 text-center">
                            <p className="text-gray-500 italic text-sm">
                                Assista ao vídeo e entenda por que a W-Tech é referência em suspensão de alta performance.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* SPEAKERS / TEAM */}
            <section className="py-32 bg-black border-y border-white/5">
                <div className="container mx-auto px-6">
                    <div className="text-center mb-24">
                        <h2 className="text-4xl md:text-6xl font-black uppercase">Quem vai te <span className="text-wtech-red">conduzir</span></h2>
                        <p className="text-gray-500 uppercase tracking-widest mt-4">Especialistas com décadas de experiência prática</p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-12 max-w-6xl mx-auto">
                        {/* Alex */}
                        <div className="relative group overflow-hidden bg-zinc-900 border border-white/5">
                             <div className="aspect-[4/5] overflow-hidden">
                                 <img 
                                    src="https://w-techstore.com.br/wp-content/uploads/2025/12/1.png" 
                                    alt="Alex Crepaldi" 
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                                 />
                             </div>
                             <div className="absolute bottom-0 left-0 w-full p-8 bg-gradient-to-t from-black via-black/90 to-transparent">
                                <div className="text-wtech-red font-black uppercase tracking-widest text-xs mb-2">Fundador W-Tech</div>
                                <h3 className="text-3xl font-black uppercase text-white mb-4">Alex Crepaldi</h3>
                                <div className="text-gray-400 text-xs leading-relaxed space-y-2 border-l border-wtech-red pl-4">
                                    <p>Referência nº1 no Brasil em suspensões de alta performance, com mais de <span className="text-white font-bold">3.000 profissionais formados</span>.</p>
                                    <p>Consultor técnico das principais equipas de competição e oficinas premium desde 2012.</p>
                                </div>
                             </div>
                        </div>

                        {/* Fernando */}
                        <div className="relative group overflow-hidden bg-zinc-900 border border-white/5">
                             <div className="aspect-[4/5] overflow-hidden">
                                 <img 
                                    src="https://w-techstore.com.br/wp-content/uploads/2025/12/2.png" 
                                    alt="Fernando Macedo" 
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                                 />
                             </div>
                             <div className="absolute bottom-0 left-0 w-full p-8 bg-gradient-to-t from-black via-black/90 to-transparent">
                                <div className="text-wtech-red font-black uppercase tracking-widest text-xs mb-2">Fundador ProRiders</div>
                                <h3 className="text-3xl font-black uppercase text-white mb-4">Fernando Macedo</h3>
                                <div className="text-gray-400 text-xs leading-relaxed space-y-2 border-l border-wtech-red pl-4">
                                    <p>Autoridade brasileira em motas BMW GS, com <span className="text-white font-bold">20 anos de experiência</span> em diagnóstico e manutenção avançada.</p>
                                    <p>Instrutor oficial de workshops que já formaram mais de 2.000 mecânicos em toda a América Latina.</p>
                                </div>
                             </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* PARTNERS / ENTITIES */}
            <section className="py-24 bg-[#050505]">
                <div className="container mx-auto px-6">
                    <div className="grid md:grid-cols-2 gap-12">
                        <div className="p-12 border border-white/5 bg-zinc-900/50">
                            <img src="https://w-techstore.com.br/wp-content/uploads/2025/11/logo-w-tech-branca.png" alt="W-Tech" className="h-10 mb-8 grayscale hover:grayscale-0 transition-all" />
                            <h4 className="text-xl font-black uppercase text-white mb-4">🔧 W-Tech Suspensões</h4>
                            <p className="text-gray-500 text-sm leading-relaxed">
                                Referência técnica em desenvolvimento e preparação de suspensões de alto nível. Criadora de sistemas usados por profissionais que exigem performance e controle absoluto.
                            </p>
                        </div>
                        <div className="p-12 border border-white/5 bg-zinc-900/50">
                            <img src="https://proriders.com.br/wp-content/webp-express/webp-images/uploads/2025/09/Logo-Pro-Riders.png.webp" alt="ProRiders" className="h-10 mb-8 transition-all" />
                            <h4 className="text-xl font-black uppercase text-white mb-4">🏁 ProRiders</h4>
                            <p className="text-gray-500 text-sm leading-relaxed">
                                Especialista em formação educacional para motociclistas. Ligando o conhecimento técnico da mecânica com a realidade da pilotagem consciente.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* TARGET AUDIENCE - WHO IS IT FOR? */}
            <section className="py-32 bg-black">
                <div className="container mx-auto px-6 text-center">
                    <h2 className="text-4xl font-black uppercase mb-16">Para quem é esta <span className="text-wtech-red underline decoration-wtech-red underline-offset-8">palestra?</span></h2>
                    
                    <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-4">
                        {[
                            'Motociclistas de Rua/Estrada',
                            'Donos de Motas Premium',
                            'Pilotos e Entusiastas',
                            'Mecânicos e Oficinas',
                            'Focados em Segurança'
                        ].map((text, i) => (
                            <div key={i} className="py-6 px-4 border border-white/10 hover:bg-zinc-900 hover:border-wtech-red transition-all group">
                                <div className="text-xs font-black uppercase tracking-widest text-gray-400 group-hover:text-white">{text}</div>
                            </div>
                        ))}
                    </div>
                    
                    <p className="mt-12 text-xl font-bold italic text-gray-500 uppercase">
                        👉 Se anda de mota, esta palestra é para si.
                    </p>
                </div>
            </section>

            {/* LOCATION SECTION */}
            <section className="py-32 bg-zinc-900 relative overflow-hidden">
                <div className="container mx-auto px-6">
                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                        <div>
                             <img src="https://artonwheelsgarage.pt/wp-content/uploads/2024/03/logo-art-on-wheels.png" alt="Art On Wheels" className="h-28 md:h-32 mb-10 object-contain" />
                             <h2 className="text-3xl font-black uppercase text-white mb-6">📍 Local do Evento</h2>
                             <div className="space-y-4 mb-6">
                                 <p className="text-2xl font-black text-wtech-red uppercase">Art On Wheels Garage</p>
                                 <p className="text-gray-400 text-sm uppercase tracking-widest font-bold leading-relaxed">
                                    Rua da Tapada Nova, Centro Empresarial II, Armz. B <br/>
                                    Linhó, 2710-297 Sintra
                                 </p>
                                 <p className="text-gray-500 text-sm leading-relaxed max-w-lg">
                                    Com entrada no mercado em 2014 a Art on Wheels Garage tem conquistado o seu espaço junto dos apaixonados pelas duas rodas. A nossa presença online já atinge mais de 25.000 seguidores ativos. Dispomos de conhecimento e soluções fruto da nossa experiência e mecânicos especializados sendo a BMW a nossa referência.
                                 </p>
                             </div>
                             <div className="flex flex-wrap gap-6 items-center">
                                 <a href="https://www.instagram.com/artonwheelsgarage" target="_blank" className="flex items-center gap-2 text-white font-bold hover:text-wtech-red transition-colors">
                                     <Instagram size={20} /> @artonwheelsgarage
                                 </a>
                                 <div className="flex items-center gap-2 text-white font-bold">
                                     <Phone size={20} /> (+351) 969 767 779
                                 </div>
                             </div>
                        </div>
                        <div className="h-[400px] bg-black border border-white/10 relative group">
                            <iframe 
                                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d777.6358368824147!2d-9.378984930378137!3d38.75629505707823!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xd1ed1006509e51b%3A0x7d65377045b64c1c!2sArt%20on%20Wheels%20Garage!5e0!3m2!1spt-PT!2spt!4v1709665432123!5m2!1spt-PT!2spt" 
                                className="w-full h-full grayscale group-hover:grayscale-0 transition-all duration-1000 border-none"
                                title="Map"
                                allowFullScreen={true}
                                loading="lazy"
                            ></iframe>
                        </div>
                    </div>
                </div>
            </section>

            {/* FINAL CTA / FORM */}
            <section id="registration-form" className="py-40 bg-black relative scroll-mt-20">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(230,0,0,0.1)_0%,transparent_50%)]"></div>
                
                <div className="container mx-auto px-6 relative z-10">
                    <div className="max-w-5xl mx-auto flex flex-col lg:flex-row items-stretch bg-zinc-900 border border-white/10 shadow-2xl overflow-hidden">
                        
                        <div className="lg:w-1/2 p-12 lg:p-20 flex flex-col justify-center relative overflow-hidden">
                            {/* Decorative element */}
                            <div className="absolute top-0 left-0 w-2 h-full bg-wtech-red"></div>
                            
                            <div className="inline-block bg-wtech-red text-white font-black uppercase text-[10px] px-4 py-1 mb-8 tracking-[0.3em] self-start">Vagas Extremamente Limitadas</div>
                            
                            <h2 className="text-4xl md:text-7xl font-black uppercase mb-8 leading-[0.8] tracking-tighter">
                                A Sua Mota<br/>
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-wtech-red to-red-500">Agradece.</span>
                            </h2>
                            
                            <div className="space-y-6 mb-12">
                                <div className="flex items-center gap-4 text-white">
                                    <div className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center shrink-0">
                                        <Calendar className="text-wtech-red" size={20} />
                                    </div>
                                    <div>
                                        <div className="text-[10px] uppercase tracking-widest text-gray-500">Data do Evento</div>
                                        <div className="font-black text-xl">02 DE ABRIL</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 text-white">
                                    <div className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center shrink-0">
                                        <Clock className="text-wtech-red" size={20} />
                                    </div>
                                    <div>
                                        <div className="text-[10px] uppercase tracking-widest text-gray-500">Horário Sugerido</div>
                                        <div className="font-black text-xl">ÀS 19H00</div>
                                    </div>
                                </div>
                            </div>

                            <p className="text-gray-400 text-lg mb-8 leading-relaxed font-medium italic">
                                "O conhecimento técnico é o que separa um passeio seguro de um prejuízo evitável. Esperamos por si no Art On Wheels."
                            </p>
                        </div>

                        <div className="lg:w-1/2 p-12 lg:p-20 bg-white text-black relative">
                            <div className="mb-10">
                                <h3 className="text-3xl font-black uppercase tracking-tighter leading-none mb-2">Lista de Presença</h3>
                                <p className="text-gray-500 text-sm font-bold uppercase tracking-widest">Inscrição Obrigatória para a entrada</p>
                            </div>

                            {submitted ? (
                                <motion.div 
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="h-full flex flex-col items-center justify-center text-center"
                                >
                                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
                                        <CheckCircle className="text-green-600" size={40} />
                                    </div>
                                    <h3 className="text-3xl font-black uppercase mb-4 tracking-tighter leading-none">Inscrição <br/>Confirmada!</h3>
                                    <p className="text-gray-600 font-medium">Parabéns. A sua vaga na lista de presença foi reservada. Fique atento ao seu WhatsApp.</p>
                                    <button onClick={() => setSubmitted(false)} className="mt-8 text-xs font-black uppercase tracking-widest text-gray-400 hover:text-black">Enviar outra resposta</button>
                                </motion.div>
                            ) : (
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2">Nome Completo</label>
                                        <input 
                                            required 
                                            value={form.name} 
                                            onChange={e => setForm({...form, name: e.target.value})}
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
                                            onChange={e => setForm({...form, email: e.target.value})}
                                            className="w-full bg-gray-50 border-transparent border-b-black p-4 text-lg font-bold focus:ring-0 focus:border-wtech-red transition-colors placeholder:text-gray-300" 
                                            placeholder="email@exemplo.com" 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2">WhatsApp</label>
                                        <input 
                                            required 
                                            value={form.phone} 
                                            onChange={e => setForm({...form, phone: e.target.value})}
                                            className="w-full bg-gray-50 border-transparent border-b-black p-4 text-lg font-bold focus:ring-0 focus:border-wtech-red transition-colors placeholder:text-gray-300" 
                                            placeholder="+351 9xx xxx xxx" 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2">Qual a sua Mota? (Opcional)</label>
                                        <input 
                                            value={form.bike} 
                                            onChange={e => setForm({...form, bike: e.target.value})}
                                            className="w-full bg-gray-50 border-transparent border-b-black p-4 text-lg font-bold focus:ring-0 focus:border-wtech-red transition-colors placeholder:text-gray-300" 
                                            placeholder="Ex: BMW R1250GS" 
                                        />
                                    </div>
                                    
                                    <button 
                                        disabled={loading}
                                        className="w-full bg-wtech-red hover:bg-black text-white px-8 py-6 font-black text-xl uppercase tracking-tighter italic transition-all flex items-center justify-center gap-4 disabled:opacity-50 shadow-[0_10px_30px_rgba(230,0,0,0.3)]"
                                    >
                                        {loading ? 'Processando...' : 'CONFIRMAR MINHA PRESENÇA'}
                                        <ArrowRight size={24} strokeWidth={3} />
                                    </button>

                                    <div className="pt-6 border-t border-gray-100">
                                        <p className="text-[10px] text-center font-bold uppercase tracking-widest text-gray-400 flex items-center justify-center gap-2">
                                            <ShieldCheck size={14} className="text-green-600" /> Confirmação imediata via WhatsApp
                                        </p>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* FOOTER */}
            <footer className="py-20 bg-stone-950 border-t border-white/5">
                <div className="container mx-auto px-6 text-center">
                    <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 mb-12">
                        <img src="https://w-techstore.com.br/wp-content/uploads/2025/11/logo-w-tech-branca.png" alt="W-Tech" className="h-8 md:h-10 opacity-70 hover:opacity-100 transition-opacity" />
                        <img src="https://proriders.com.br/wp-content/webp-express/webp-images/uploads/2025/09/Logo-Pro-Riders.png.webp" alt="ProRiders" className="h-8 md:h-10 opacity-70 hover:opacity-100 transition-opacity" />
                        <img src="https://artonwheelsgarage.pt/wp-content/uploads/2024/03/logo-art-on-wheels.png" alt="Art On Wheels" className="h-10 md:h-14 opacity-70 hover:opacity-100 transition-opacity" />
                    </div>
                    <p className="text-gray-600 text-xs font-bold uppercase tracking-[0.4em] mb-4">Parceria Técnica | Lisboa 2026</p>
                    <p className="text-gray-700 text-[10px] max-w-2xl mx-auto uppercase tracking-widest leading-loose text-center">
                        A sensibilização salva motas. O conhecimento salva vidas. <br/>
                        Todos os direitos reservados.
                    </p>
                </div>
            </footer>

        </div>
    );
};

export default LPLisboaFev2026;
