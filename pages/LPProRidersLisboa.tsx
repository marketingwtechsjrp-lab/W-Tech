import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import { triggerWebhook } from '../lib/webhooks';
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
  Users,
  Target,
  Smartphone,
  Mail,
  User,
  AlertOctagon,
  Instagram
} from 'lucide-react';

const LPProRidersLisboa: React.FC = () => {
    const [form, setForm] = useState({ name: '', email: '', phone: '', reason: '', cpf: '' });
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
                cpf: form.cpf,
                type: 'Course_Waitlist',
                status: 'New',
                context_id: `PRORIDERS EUROPA LISBOA 2026`,
                tags: ['PRORIDERS_EUROPA_2026', 'COURSE_PAID'],
                assigned_to: assignedTo,
                notes: form.reason
            };

            const { error } = await supabase.from('SITE_Leads').insert([payload]);
            if (error) throw error;
            
            await triggerWebhook('webhook_lead', payload);
            
             // Specific Webhook for Lisbon Course (Reusing endpoint but with distinct page ID)
             await fetch('https://webhook.2b.app.br/webhook/lisboa-curso', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    timestamp: new Date().toISOString(),
                    page: 'LP_PRORIDERS_LISBOA_2026',
                    data: payload
                })
            }).catch(err => console.error('Lisboa Course webhook failed:', err));

            // ALSO Send to the same webhook as the main Lisbon LP for redundancy/integration
            await fetch('https://webhook.2b.app.br/webhook/lisboa', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            }).catch(err => console.error('Lisboa Main webhook failed:', err));

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
            
            {/* TOP BAR */}
            <div className="bg-wtech-red text-white text-[10px] md:text-xs font-black uppercase tracking-widest text-center py-2 px-4">
                🇵🇹 Lisboa 2026: Formação Presencial Definitiva em Manutenção BMW GS
            </div>

            {/* NAVIGATION / LOGOS */}
            <nav className="absolute top-8 left-0 w-full z-30 pointer-events-none">
                <div className="container mx-auto px-6 flex justify-between items-start">
                    <img src="https://proriders.com.br/wp-content/webp-express/webp-images/uploads/2025/09/Logo-Pro-Riders.png.webp" alt="ProRiders" className="h-8 md:h-12 object-contain opacity-90" />
                    <img src="https://liquimoly.cloudimg.io/v7/https://www.liqui-moly.com/static/version1765819485/frontend/limo/base/default/images/logo.svg" alt="Liqui Moly" className="h-8 md:h-12 object-contain bg-white/10 p-1 rounded backdrop-blur-sm" />
                </div>
            </nav>

            {/* HERO SECTION */}
            <section className="relative min-h-[95vh] flex items-center justify-center overflow-hidden pt-20">
                {/* Background */}
                    <div className="absolute inset-0 z-0 overflow-hidden">
                        <div className="absolute inset-0 bg-black/60 z-10"></div>
                        <iframe 
                            src="https://www.youtube.com/embed/yWofinvE0Xg?autoplay=1&mute=1&loop=1&controls=0&showinfo=0&rel=0&playlist=yWofinvE0Xg" 
                            className="absolute top-1/2 left-1/2 w-[350%] h-[350%] md:w-full md:h-full md:scale-150 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                        ></iframe>
                    </div>

                <div className="container mx-auto px-6 relative z-20 text-center">
                    <motion.div 
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="inline-flex items-center gap-2 border border-wtech-gold/30 bg-wtech-gold/10 backdrop-blur-md px-4 py-1.5 rounded-full mb-8"
                    >
                         <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Flag_of_Portugal.svg/255px-Flag_of_Portugal.svg.png" className="w-4 h-auto rounded-sm" alt="PT" />
                         <span className="text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] text-wtech-gold">Lisboa | 1, 2 e 3 de Maio 2026</span>
                    </motion.div>
                    
                    <motion.h1 
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-4xl md:text-6xl lg:text-7xl font-black uppercase tracking-tighter leading-[0.9] mb-8"
                    >
                        Curso Avançado<br/>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-wtech-red to-red-800">BMW GS & Suspensões Premium</span>
                    </motion.h1>

                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="max-w-4xl mx-auto space-y-4 mb-12"
                    >
                        <p className="text-xl md:text-3xl text-gray-200 font-bold leading-tight">
                            Domine Motores, Eletrônica e Suspensões Premium da sua BMW GS.
                        </p>
                        <p className="text-gray-400 font-medium tracking-wide uppercase text-sm md:text-base">
                            Certificação Oficial ProRiders + W-Tech
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
                            className="bg-wtech-red hover:bg-black text-white px-10 py-5 rounded-sm font-black text-lg uppercase tracking-widest transition-all hover:scale-105 flex items-center gap-3 shadow-[0_0_40px_rgba(230,0,0,0.3)]"
                        >
                            Garantir Minha Vaga <ArrowRight strokeWidth={3} size={20} />
                        </button>
                    </motion.div>

                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.8 }}
                        className="flex flex-wrap justify-center gap-6 mt-16 text-[10px] md:text-xs font-bold uppercase tracking-widest text-gray-500"
                    >
                        <span className="flex items-center gap-2"><Clock size={14} className="text-wtech-red" /> 3 Dias de Imersão Total</span>
                        <span className="flex items-center gap-2"><MapPin size={14} className="text-wtech-gold" /> Sede Oficial LIQUI MOLY</span>
                        <span className="flex items-center gap-2"><Award size={14} className="text-wtech-red" /> Vagas Limitadas</span>
                    </motion.div>
                </div>
            </section>

            {/* INFO GRID */}
            <section className="bg-[#0a0a0a] border-y border-white/5">
                <div className="container mx-auto px-6">
                    <div className="grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-white/10">
                        <div className="py-12 md:px-8 text-center">
                            <Calendar className="mx-auto text-wtech-red mb-4" size={32} />
                            <h3 className="text-xl font-black uppercase mb-2">1, 2 e 3 Maio</h3>
                            <p className="text-gray-500 text-sm">3 dias de imersão total</p>
                        </div>
                        <div className="py-12 md:px-8 text-center">
                            <MapPin className="mx-auto text-wtech-red mb-4" size={32} />
                            <h3 className="text-xl font-black uppercase mb-2">Lisboa - Portugal</h3>
                            <p className="text-gray-500 text-sm">Sede Oficial Liqui Moly</p>
                        </div>
                        <div className="py-12 md:px-8 text-center">
                            <Award className="mx-auto text-wtech-gold mb-4" size={32} />
                            <h3 className="text-xl font-black uppercase mb-2">Certificação</h3>
                            <p className="text-gray-500 text-sm">Oficial ProRiders + W-Tech</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* WARNING - NOT FOR BEGINNERS */}
            <section className="py-24 bg-black relative">
                 <div className="container mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
                    <div>
                        <span className="text-wtech-red font-black uppercase tracking-[0.2em] text-xs">Para Exigentes</span>
                        <h2 className="text-3xl md:text-5xl font-black uppercase mt-4 mb-8">
                            Este curso <span className="text-wtech-red">não exige experiência prévia</span>
                        </h2>
                        <div className="space-y-6 text-gray-400 text-lg leading-relaxed">
                            <p>
                                A linha <strong className="text-white">BMW GS</strong> é complexa, mas o nosso método torna o aprendizado acessível. Seja você um mecânico buscando especialização ou um proprietário que deseja cuidar da própria moto.
                            </p>
                            <p>
                                Este curso foi desenhado para quem não aceita o básico. Você vai aprender a diagnosticar, manter e entender sua máquina em nível de engenharia, mas com linguagem prática.
                            </p>
                        </div>
                         
                         <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                             {[
                                 "Economize em Manutenções",
                                 "Evite Diagnósticos Errados",
                                 "Viaje com Autonomia",
                                 "Domine sua Máquina"
                             ].map((item, i) => (
                                 <div key={i} className="flex items-center gap-3 text-wtech-red font-bold uppercase text-xs tracking-wide">
                                     <CheckCircle size={16} /> {item}
                                 </div>
                             ))}
                         </div>
                    </div>
                    <div className="relative">
                        <img 
                            src="https://w-techstore.com.br/wp-content/uploads/2025/12/fernando-alex.png" 
                            alt="ProRiders & W-Tech Team" 
                            className="relative w-full rounded-sm border border-white/10 shadow-2xl grayscale hover:grayscale-0 transition-all duration-700" 
                        />
                         <div className="absolute bottom-6 right-6 bg-wtech-red text-white p-4 font-black uppercase text-xs tracking-widest shadow-lg">
                            Mecânicos & Entusiastas
                        </div>
                    </div>
                 </div>
            </section>

            {/* TARGET AUDIENCE */}
            <section className="py-24 bg-zinc-950 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-wtech-red/50 to-transparent"></div>
                
                <div className="container mx-auto px-6 relative z-10">
                    <div className="text-center mb-20">
                         <h2 className="text-3xl md:text-5xl font-black uppercase mb-4">Para quem é esta <span className="text-wtech-red">Formação</span></h2>
                         <p className="text-gray-500 uppercase tracking-widest text-sm">Profissionais, Entusiastas e Proprietários</p>
                    </div>

                    <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            {[
                                "Mecânicos que buscam especialização",
                                "Proprietários que querem cuidar da sua moto",
                                "Viajantes que precisam de autonomia mecânica"
                            ].map((item, i) => (
                                <div key={i} className="flex items-center gap-4 bg-zinc-900 p-6 rounded-lg border-l-4 border-wtech-red hover:bg-zinc-800 transition-colors">
                                    <CheckCircle className="text-wtech-red shrink-0" size={24} />
                                    <span className="font-bold text-gray-200">{item}</span>
                                </div>
                            ))}
                        </div>
                        <div className="space-y-4">
                             {[
                                "Entusiastas apaixonados por mecânica",
                                "Quem busca conhecimento técnico real e validado",
                                "Quem não aceita manutenção superficial"
                            ].map((item, i) => (
                                <div key={i} className="flex items-center gap-4 bg-zinc-900 p-6 rounded-lg border-l-4 border-wtech-gold hover:bg-zinc-800 transition-colors">
                                    <CheckCircle className="text-wtech-gold shrink-0" size={24} />
                                    <span className="font-bold text-gray-200">{item}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* WHY IT WORKS */}
            <section className="py-24 bg-black">
                <div className="container mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-5xl font-black uppercase mb-4">Por que este Curso <span className="text-wtech-red">Funciona</span></h2>
                        <p className="text-gray-500 uppercase tracking-widest text-sm">Metodologia validada no Brasil, agora na Europa</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            {
                                icon: <Award size={32} className="text-wtech-gold" />,
                                title: "Domínio Técnico Real",
                                desc: "Você passa a entender profundamente o funcionamento da sua moto, seja para consertar ou pilotar melhor."
                            },
                             {
                                icon: <Settings size={32} className="text-blue-500" />,
                                title: "Acesso a Condições Exclusivas",
                                desc: "Acesso a ferramentas e conhecimentos que antes eram restritos a concessionárias e equipes de corrida."
                            },
                             {
                                icon: <Users size={32} className="text-green-500" />,
                                title: "Suporte Técnico Pós-Curso",
                                desc: "Suporte técnico especializado por mensagem. Chega de depender apenas de fóruns e vídeos soltos."
                            },
                             {
                                icon: <Zap size={32} className="text-yellow-500" />,
                                title: "Metodologia Validada",
                                desc: "Método testado em oficinas reais, com base na experiência da W-Tech Suspensões e da ProRiders."
                            },
                             {
                                icon: <Smartphone size={32} className="text-purple-500" />,
                                title: "Aprendizado Prático",
                                desc: "Nada de teoria desnecessária. Você aprende, coloca a mão na graxa e entende como tudo funciona."
                            },
                             {
                                icon: <ShieldCheck size={32} className="text-wtech-red" />,
                                title: "Certificação Oficial",
                                desc: "Certificado W-Tech + ProRiders, agregando valor imediato ao seu currículo e parede da oficina."
                            }
                        ].map((item, index) => (
                            <div key={index} className="bg-zinc-900/50 p-8 border border-white/5 hover:border-white/20 transition-all group">
                                <div className="mb-6 bg-black w-16 h-16 flex items-center justify-center rounded-full group-hover:scale-110 transition-transform shadow-lg">
                                    {item.icon}
                                </div>
                                <h3 className="text-xl font-bold uppercase text-white mb-4">{item.title}</h3>
                                <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
                            </div>
                        ))}
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
                    <motion.div 
                        initial={{ scale: 0.9, opacity: 0 }}
                        whileInView={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.8 }}
                        viewport={{ once: true }}
                    >
                        <img src="https://liquimoly.cloudimg.io/v7/https://www.liqui-moly.com/static/version1765819485/frontend/limo/base/default/images/logo.svg" alt="Liqui Moly" className="h-20 mx-auto mb-10 bg-white p-4 rounded shadow-[0_0_30px_rgba(255,255,255,0.2)]" />
                        <h2 className="text-3xl font-black uppercase mb-12 tracking-wide">Liqui Moly Iberia <span className="text-blue-500">Experience Center</span></h2>
                    </motion.div>
                    
                    <div className="grid md:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
                        <motion.div 
                            initial={{ x: -50, opacity: 0 }}
                            whileInView={{ x: 0, opacity: 1 }}
                            transition={{ duration: 0.8 }}
                            className="bg-black/80 backdrop-blur-md p-10 border-l-4 border-blue-600 rounded-r-xl text-left shadow-2xl"
                        >
                             <div className="flex items-start gap-4 mb-6">
                                <MapPin className="text-blue-500 shrink-0 mt-1" size={32} />
                                <div>
                                    <h3 className="text-xl font-bold uppercase text-white mb-2">Endereço Exclusivo</h3>
                                    <p className="text-gray-400 text-sm mb-2">Sintra Business Park, Zona Industrial da Abrunheira, Edifício 5, Armazém D, 2710-089 Sintra – Portugal</p>
                                    <a href="https://www.instagram.com/liquimolyiberia" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-blue-400 font-bold hover:text-white transition-colors text-sm">
                                        <Instagram size={16} /> @liquimolyiberia
                                    </a>
                                </div>
                             </div>
                             
                            {/* MAP */}
                             <div className="w-full h-64 rounded-md overflow-hidden border border-white/10 filter grayscale hover:grayscale-0 transition-all">
                                <iframe 
                                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3111.455242767936!2d-9.352458023472064!3d38.75323215516017!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xd1ecf04506821e9%3A0x6e8a4a58b293157!2sLiqui%20Moly%20Portugal!5e0!3m2!1sen!2spt!4v1703865432123!5m2!1sen!2spt" 
                                    width="100%" 
                                    height="100%" 
                                    style={{ border: 0 }} 
                                    allowFullScreen={true} 
                                    loading="lazy" 
                                    referrerPolicy="no-referrer-when-downgrade"
                                ></iframe>
                             </div>
                        </motion.div>

                        <motion.div 
                            initial={{ x: 50, opacity: 0 }}
                            whileInView={{ x: 0, opacity: 1 }}
                            transition={{ duration: 0.8 }}
                            className="relative group rounded-xl overflow-hidden border border-white/10 hover:border-blue-500 transition-colors shadow-2xl"
                        >
                            <div className="aspect-video relative">
                                <iframe 
                                    className="w-full h-full" 
                                    src="https://www.youtube.com/embed/JqDGXUdsSrQ?rel=0" 
                                    title="Sede Liqui Moly" 
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                    allowFullScreen
                                ></iframe>
                            </div>
                            <div className="absolute inset-0 pointer-events-none ring-1 ring-inset ring-white/10 group-hover:ring-blue-500/50 transition-all rounded-xl"></div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* EXPERIENCE PREVIEW */}
            <section className="py-24 bg-zinc-950 border-y border-white/5">
                <div className="container mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-5xl font-black uppercase">Veja a <span className="text-wtech-red">Experiência</span></h2>
                        <p className="text-gray-500 mt-4 text-lg">Um vislumbre do que espera por você na sede da Liqui Moly</p>
                    </div>

                    <div className="max-w-5xl mx-auto">
                         <div className="aspect-video relative rounded-xl overflow-hidden shadow-[0_0_50px_rgba(230,0,0,0.1)] border border-white/10 group">
                             <iframe 
                                className="w-full h-full" 
                                src="https://www.youtube.com/embed/3LqrvfmuUME?rel=0" 
                                title="Preview Curso Lisboa"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                allowFullScreen
                            ></iframe>
                        </div>
                    </div>
                </div>
            </section>

            {/* CURRICULUM */}
            <section className="py-24 bg-black">
                <div className="container mx-auto px-6">
                     <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-5xl font-black uppercase">O Que Você Vai <span className="text-wtech-red">Aprender</span> (Na Prática)</h2>
                        <p className="text-gray-500 mt-4 text-lg">Conteúdo Focado em Resultado e Faturamento</p>
                     </div>

                     <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-6 max-w-5xl mx-auto">
                        {[
                            "Revisão e diagnóstico avançado de motores BMW GS",
                            "Diagnóstico profissional de eletrônica embarcada",
                            "Manutenção e customização de suspensões premium",
                            "Ajustes para estrada, off-road e uso misto",
                            "Uso correto de ferramentas e scanners profissionais",
                            "Correção de problemas crônicos da linha BMW GS",
                            "Processos de manutenção de alto nível",
                            "Domínio total da tecnologia BMW"
                        ].map((item, i) => (
                            <div key={i} className="flex items-center gap-4 p-6 border border-white/10 bg-zinc-900/30 hover:border-wtech-red transition-all group">
                                <div className="w-8 h-8 flex items-center justify-center bg-wtech-red text-white font-bold rounded shadow-lg group-hover:scale-110 transition-transform">
                                    {i + 1}
                                </div>
                                <h3 className="text-lg font-bold text-gray-200">{item}</h3>
                            </div>
                        ))}
                     </div>
                </div>
            </section>

            {/* SCHEDULE SECTION */}
            <section className="py-24 bg-[#080808] relative overflow-hidden">
                <div className="container mx-auto px-6 relative z-10">
                    <div className="text-center mb-20">
                        <span className="text-wtech-red font-black uppercase tracking-[0.3em] text-xs">A Experiência</span>
                        <h2 className="text-4xl md:text-6xl font-black uppercase mt-4">Cronograma <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-500">Detalhado</span></h2>
                    </div>

                    <div className="grid lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
                        {/* Day 1 */}
                        <div className="bg-zinc-900/50 border border-white/5 p-8 rounded-2xl hover:border-wtech-red transition-all">
                            <div className="flex items-center justify-between mb-8">
                                <span className="text-4xl font-black text-white/10">01</span>
                                <div className="bg-wtech-red px-4 py-1 text-[10px] font-black uppercase tracking-widest italic">Sexta-feira</div>
                            </div>
                            <h3 className="text-2xl font-black uppercase text-white mb-6">Diagnóstico e Desmontagem</h3>
                            <ul className="space-y-4">
                                {[
                                    "Introdução ao recebimento da moto",
                                    "Aplicação do Checklist de Recebimento",
                                    "Lista da Manutenção Programada",
                                    "TEXA - Diagnóstico Global",
                                    "Aferição e Diagnóstico para orçamento corretivo",
                                    "DESMONTAGEM DA MOTO: Injeção, Admissão, Cardan, Embreagem, Válvulas e Rodas"
                                ].map((item, i) => (
                                    <li key={i} className="flex items-start gap-3 group">
                                        <div className="w-1.5 h-1.5 rounded-full bg-wtech-red mt-2 shrink-0 group-hover:scale-150 transition-transform"></div>
                                        <span className="text-gray-400 text-sm font-medium leading-tight">{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Day 2 */}
                        <div className="bg-zinc-900/50 border border-white/5 p-8 rounded-2xl hover:border-wtech-red transition-all">
                            <div className="flex items-center justify-between mb-8">
                                <span className="text-4xl font-black text-white/10">02</span>
                                <div className="bg-zinc-800 px-4 py-1 text-[10px] font-black uppercase tracking-widest italic">Sábado</div>
                            </div>
                            <h3 className="text-2xl font-black uppercase text-white mb-6">Processo de Revisão (Parte I)</h3>
                            <ul className="space-y-4">
                                {[
                                    "Montagem do Sistema de Embreagem",
                                    "Troca do Fluído Acionador de Embreagem",
                                    "Montagem do Sistema de Transmissão (Cardan, Balança e Diferencial)",
                                    "Revisão e Montagem das Rodas",
                                    "Enquadramento de Comando e Folgas no Sistema",
                                    "Sistema de Arrefecimento"
                                ].map((item, i) => (
                                    <li key={i} className="flex items-start gap-3 group">
                                        <div className="w-1.5 h-1.5 rounded-full bg-wtech-red mt-2 shrink-0 group-hover:scale-150 transition-transform"></div>
                                        <span className="text-gray-400 text-sm font-medium leading-tight">{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Day 3 */}
                        <div className="bg-zinc-900/50 border border-white/5 p-8 rounded-2xl hover:border-wtech-red transition-all">
                            <div className="flex items-center justify-between mb-8">
                                <span className="text-4xl font-black text-white/10">03</span>
                                <div className="bg-zinc-800 px-4 py-1 text-[10px] font-black uppercase tracking-widest italic text-wtech-gold border border-wtech-gold/30">Domingo</div>
                            </div>
                            <h3 className="text-2xl font-black uppercase text-white mb-6">Processo de Revisão (Parte II)</h3>
                            <ul className="space-y-4">
                                {[
                                    "Montagem do Sistema de Injeção",
                                    "Revisão do Sistema de Freios e ABS",
                                    "TEXA - Atualização de Tempo de Serviço e Reset",
                                    "Montagem das Carenagens e Protetores",
                                    "Passagem no Dinamômetro",
                                    "Ajustes Ergonômicos Personalizados"
                                ].map((item, i) => (
                                    <li key={i} className="flex items-start gap-3 group">
                                        <div className="w-1.5 h-1.5 rounded-full bg-wtech-gold mt-2 shrink-0 group-hover:scale-150 transition-transform"></div>
                                        <span className="text-gray-400 text-sm font-medium leading-tight">{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    {/* Routine Bar */}
                    <div className="mt-16 bg-zinc-900 border border-white/5 p-8 rounded-2xl max-w-5xl mx-auto shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-24 h-full bg-wtech-red/5 -skew-x-12 translate-x-12"></div>
                        
                        <div className="grid md:grid-cols-4 gap-8 relative z-10">
                            <div>
                                <h4 className="text-xs font-black uppercase tracking-widest text-wtech-red mb-4">Início (Sex/Sáb/Dom)</h4>
                                <div className="flex items-center gap-2">
                                    <Clock className="text-gray-500" size={16} />
                                    <span className="text-xl font-black text-white">08:30 <span className="text-[10px] uppercase text-gray-500 font-bold ml-1">Coffee Break</span></span>
                                </div>
                            </div>
                            <div>
                                <h4 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-4">Aula</h4>
                                <div className="flex items-center gap-2">
                                    <Clock className="text-gray-500" size={16} />
                                    <span className="text-xl font-black text-white">09:00 <span className="text-[10px] uppercase text-gray-500 font-bold ml-1">Start</span></span>
                                </div>
                            </div>
                            <div>
                                <h4 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-4">Intervalo</h4>
                                <div className="flex items-center gap-2">
                                    <Clock className="text-gray-500" size={16} />
                                    <span className="text-xl font-black text-white">12:00 <span className="text-[10px] uppercase text-gray-500 font-bold ml-1">às 13:00</span></span>
                                </div>
                            </div>
                            <div>
                                <h4 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-4">Encerramento</h4>
                                <div className="flex items-center gap-2">
                                    <Clock className="text-gray-500" size={16} />
                                    <span className="text-xl font-black text-white">18:00 <span className="text-[10px] uppercase text-wtech-gold font-bold ml-1">*(Dom: 15h)</span></span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-10 pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-wtech-gold/10 flex items-center justify-center text-wtech-gold">
                                    <Settings className="animate-spin-slow" size={20} />
                                </div>
                                <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
                                    Almoço por conta do participante
                                </p>
                            </div>
                            <div className="bg-wtech-red/10 border border-wtech-red/20 px-6 py-2 rounded-full">
                                <span className="text-[10px] font-black text-wtech-red uppercase tracking-widest">Coffee Break às 16:00 (Sexta e Sábado)</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* INSTRUCTORS */}
            <section className="py-24 bg-zinc-950 border-t border-white/5">
                 <div className="container mx-auto px-6">
                     <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-5xl font-black uppercase">Quem Vai Te <span className="text-wtech-red">Ensinar</span></h2>
                        <p className="text-gray-500 mt-4 text-lg tracking-widest">As maiores autoridades do setor</p>
                     </div>

                    <div className="flex flex-col md:flex-row gap-8 items-start max-w-5xl mx-auto mt-12 bg-zinc-900/50 border border-white/5 p-8 md:p-12">
                         <div className="md:w-1/3 shrink-0">
                             <img src="https://w-techstore.com.br/wp-content/uploads/2025/12/2.png" alt="Fernando Macedo" className="w-full rounded shadow-xl" />
                         </div>
                         <div>
                             <div className="inline-block bg-wtech-red text-white text-[10px] font-black uppercase px-2 py-0.5 mb-4">Instrutor Principal</div>
                             <h3 className="text-3xl font-black uppercase text-white mb-2">Fernando Macedo</h3>
                             <p className="text-gray-400 text-sm mb-6 font-medium">Fundador ProRiders</p>
                             
                             <p className="text-gray-300 leading-relaxed mb-6">
                                Uma das maiores autoridades em manutenção e diagnóstico BMW GS. Mais de 20 anos de experiência prática, especialista em motores boxer e eletrônica embarcada. Consultor técnico de oficinas premium e expedições internacionais.
                             </p>

                             <div className="p-4 bg-black/50 border-l-4 border-wtech-red text-sm text-gray-400">
                                👉 Responsável pela revisão avançada de motores, diagnóstico e processos BMW GS.
                             </div>
                         </div>
                    </div>

                    <div className="flex flex-col md:flex-row gap-8 items-center max-w-5xl mx-auto mt-8 p-8 md:p-12 border border-wtech-gold/20 bg-wtech-gold/5">
                         <div className="md:w-1/4 shrink-0 order-1 md:order-2">
                             <img src="https://w-techstore.com.br/wp-content/uploads/2025/12/1.png" alt="Alex Crepaldi" className="w-full rounded shadow-xl grayscale hover:grayscale-0 transition-all" />
                         </div>
                         <div className="order-2 md:order-1 text-right md:flex-1">
                             <div className="inline-block bg-zinc-800 text-white text-[10px] font-black uppercase px-2 py-0.5 mb-4">Especialista em Suspensões</div>
                             <h3 className="text-2xl font-black uppercase text-white mb-2">Alex Crepaldi</h3>
                             <p className="text-gray-400 text-sm mb-4 font-medium">Fundador W-Tech Suspensões</p>
                             <p className="text-gray-400 text-sm leading-relaxed mb-6">
                                 Referência internacional em suspensões on-road e off-road. Responsável por mais de 3.000 profissionais capacitados e consultor de equipes e oficinas.
                             </p>
                             <div className="p-4 bg-black/50 border-r-4 border-wtech-gold text-sm text-gray-400 inline-block">
                                👉 Responsável por toda a parte de suspensões premium do curso.
                             </div>
                         </div>
                    </div>
                 </div>
            </section>

             {/* WHAT YOU GET */}
             <section className="py-24 bg-zinc-900 border-t border-white/5">
                <div className="container mx-auto px-6 max-w-4xl text-center">
                    <h2 className="text-3xl font-black uppercase mb-12">O que você leva após a experiência</h2>
                     <div className="grid md:grid-cols-3 gap-6">
                        {["Pilotagem mais segura", "Confiança real", "Leitura clara da moto", "Consciência corporal", "Evolução técnica", "Networking"].map((item, i) => (
                            <div key={i} className="flex items-center gap-3 justify-center p-4 bg-black border border-white/10 rounded">
                                <CheckCircle size={20} className="text-green-500 shrink-0" />
                                <span className="font-bold text-sm uppercase">{item}</span>
                            </div>
                        ))}
                    </div>
                </div>
             </section>

            {/* FORM */}
            <section id="registration-form" className="py-24 relative text-white">
                <div className="absolute inset-0 z-0">
                    <div className="absolute inset-0 bg-black/80 z-10"></div>
                    <img src="https://proriders.com.br/wp-content/uploads/2025/09/O-PLANO-DEFINITIVO-1920-x-900-px-1920-x-500-px-1920-x-900-px.png" className="w-full h-full object-cover" alt="Background" />
                </div>

                <div className="container mx-auto px-6 relative z-10">
                    <div className="max-w-4xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
                        <div>
                            <h2 className="text-4xl lg:text-5xl font-black uppercase mb-6 tracking-tighter">Garanta a Sua Vaga</h2>
                            <p className="text-gray-400 text-lg mb-8 leading-relaxed">
                                As vagas são limitadas pela segurança e personalização do acompanhamento.
                            </p>
                            
                            <ul className="space-y-4 mb-8">
                                <li className="flex items-center gap-3 font-bold"><CheckCircle size={20} className="text-wtech-red" /> 3 Dias de Imersão</li>
                                <li className="flex items-center gap-3 font-bold"><CheckCircle size={20} className="text-wtech-red" /> Turma Reduzida</li>
                                <li className="flex items-center gap-3 font-bold"><CheckCircle size={20} className="text-wtech-red" /> Acompanhamento Próximo</li>
                                <li className="flex items-center gap-3 font-bold"><CheckCircle size={20} className="text-wtech-red" /> Exercícios Progressivos</li>
                            </ul>

                            <div className="bg-white/5 backdrop-blur-sm p-6 rounded-lg border-l-4 border-wtech-red">
                                <p className="text-sm font-bold text-gray-300 uppercase tracking-wide">
                                    ⚠️ AVISO IMPORTANTE:<br/>
                                    Sem lista extra e sem nova data confirmada.
                                </p>
                            </div>
                        </div>

                        <div className="bg-white text-black p-8 lg:p-10 rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/10">
                            {submitted ? (
                                <div className="text-center py-10">
                                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <CheckCircle size={32} />
                                    </div>
                                    <h3 className="text-2xl font-black uppercase mb-2">Pré-Inscrição Recebida!</h3>
                                    <p className="text-gray-600 mb-6">A nossa equipa entrará em contacto para finalizar a sua matrícula.</p>
                                    <button onClick={() => setSubmitted(false)} className="text-sm font-bold uppercase text-gray-400 hover:text-black">Voltar</button>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-black uppercase text-gray-500 mb-1">Nome Completo</label>
                                        <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full bg-gray-100 border border-gray-300 p-3 font-bold focus:ring-2 focus:ring-wtech-red outline-none text-black" placeholder="O seu nome" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black uppercase text-gray-500 mb-1">E-mail Profissional</label>
                                        <input required type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full bg-gray-100 border border-gray-300 p-3 font-bold focus:ring-2 focus:ring-wtech-red outline-none text-black" placeholder="email@exemplo.com" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-black uppercase text-gray-500 mb-1">Telemóvel / WhatsApp</label>
                                            <input required value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full bg-gray-100 border border-gray-300 p-3 font-bold focus:ring-2 focus:ring-wtech-red outline-none text-black" placeholder="+351 ..." />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-black uppercase text-gray-500 mb-1">CPF (Obrigatório)</label>
                                            <input required value={form.cpf} onChange={e => setForm({...form, cpf: e.target.value})} className="w-full bg-gray-100 border border-gray-300 p-3 font-bold focus:ring-2 focus:ring-wtech-red outline-none text-black" placeholder="CPF..." />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black uppercase text-gray-500 mb-1">Motivo da Inscrição (Opcional)</label>
                                        <textarea value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} className="w-full bg-gray-100 border border-gray-300 p-3 font-medium focus:ring-2 focus:ring-wtech-red outline-none h-24 resize-none text-black" placeholder="Sou mecânico, piloto, entusiasta..." />
                                    </div>

                                    <button disabled={loading} className="w-full bg-wtech-red hover:bg-black text-white font-black text-lg py-4 uppercase tracking-wide transition-all shadow-lg mt-4 disabled:opacity-50">
                                        {loading ? 'A Enviar...' : 'QUERO PARTICIPAR DO PRO-RIDERS EUROPA'}
                                    </button>
                                    
                                    <p className="text-center text-[10px] text-gray-400 mt-4 uppercase font-bold">
                                        <ShieldCheck size={12} className="inline mr-1" /> Dados seguros. Entraremos em contacto.
                                    </p>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* FOOTER */}
            <footer className="py-20 bg-stone-950 text-white border-t border-white/10">
                <div className="container mx-auto px-6 text-center">
                    <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 mb-12 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
                        <img src="https://proriders.com.br/wp-content/webp-express/webp-images/uploads/2025/09/Logo-Pro-Riders.png.webp" alt="ProRiders" className="h-8 md:h-10" />
                        <img src="https://w-techstore.com.br/wp-content/uploads/2025/11/logo-w-tech-branca.png" alt="W-Tech" className="h-8 md:h-10" />
                        <img src="https://liquimoly.cloudimg.io/v7/https://www.liqui-moly.com/static/version1765819485/frontend/limo/base/default/images/logo.svg" alt="Liqui Moly" className="h-8 md:h-12 bg-white p-1 rounded" />
                    </div>
                    <p className="text-gray-600 text-[10px] font-bold uppercase tracking-[0.4em] mb-4">ProRiders Europa | Lisboa 2026</p>
                    <p className="text-gray-700 text-[10px] uppercase tracking-widest">
                        Lisboa será o palco da evolução da pilotagem europeia.
                    </p>
                </div>
            </footer>

        </div>
    );
};

export default LPProRidersLisboa;
