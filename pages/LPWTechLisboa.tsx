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

const LPWTechLisboa: React.FC = () => {
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
                context_id: `WTECH EUROPA LISBOA 2026`,
                tags: ['WTECH_EUROPA_2026', 'COURSE_PAID'],
                assigned_to: assignedTo,
                notes: form.reason
            };

            const { error } = await supabase.from('SITE_Leads').insert([payload]);
            if (error) throw error;
            
            await triggerWebhook('webhook_lead', payload);
            
             // Specific Webhook for Lisbon Course
             await fetch('https://webhook.2b.app.br/webhook/lisboa-curso', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    timestamp: new Date().toISOString(),
                    page: 'LP_WTECH_LISBOA_2026',
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
                🇵🇹 Lisboa 2026: A Formação Definitiva em Suspensão de Motas
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
                        <div className="absolute inset-0 bg-black/60 z-10"></div>
                        <iframe 
                            src="https://www.youtube.com/embed/yWofinvE0Xg?autoplay=1&mute=1&loop=1&controls=0&showinfo=0&rel=0&playlist=yWofinvE0Xg" 
                            className="w-full h-full object-cover scale-150 pointer-events-none"
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
                         <span className="text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] text-wtech-gold">Lisboa | 25 e 26 de Abril 2026</span>
                    </motion.div>
                    
                    <motion.h1 
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-4xl md:text-7xl lg:text-8xl font-black uppercase tracking-tighter leading-[0.9] mb-8"
                    >
                        W-Tech Europa<br/>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-wtech-red to-red-800">Lisboa 2026</span>
                    </motion.h1>

                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="max-w-4xl mx-auto space-y-4 mb-12"
                    >
                        <p className="text-xl md:text-3xl text-gray-200 font-bold leading-tight">
                            O Curso que Eleva a Suspensão ao Padrão Internacional.
                        </p>
                        <p className="text-gray-400 font-medium tracking-wide uppercase text-sm md:text-base">
                            Formação Técnica Avançada em Suspensão de Motas
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
                            Garantir a Minha Vaga <ArrowRight strokeWidth={3} size={20} />
                        </button>
                    </motion.div>

                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.8 }}
                        className="flex flex-wrap justify-center gap-6 mt-16 text-[10px] md:text-xs font-bold uppercase tracking-widest text-gray-500"
                    >
                        <span className="flex items-center gap-2"><MapPin size={14} className="text-wtech-red" /> Sede Oficial LIQUI MOLY</span>
                        <span className="flex items-center gap-2"><Award size={14} className="text-wtech-gold" /> Certificação Internacional</span>
                        <span className="flex items-center gap-2"><AlertOctagon size={14} className="text-wtech-red" /> Vagas Limitadas</span>
                    </motion.div>
                </div>
            </section>

            {/* INFO GRID */}
            <section className="bg-[#0a0a0a] border-y border-white/5">
                <div className="container mx-auto px-6">
                    <div className="grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-white/10">
                        <div className="py-12 md:px-8 text-center">
                            <Calendar className="mx-auto text-wtech-red mb-4" size={32} />
                            <h3 className="text-xl font-black uppercase mb-2">25 e 26 Abril</h3>
                            <p className="text-gray-500 text-sm">Dois dias de imersão total</p>
                        </div>
                        <div className="py-12 md:px-8 text-center">
                            <MapPin className="mx-auto text-wtech-red mb-4" size={32} />
                            <h3 className="text-xl font-black uppercase mb-2">Lisboa - Sintra</h3>
                            <p className="text-gray-500 text-sm">Sede Oficial Liqui Moly</p>
                        </div>
                        <div className="py-12 md:px-8 text-center">
                            <Award className="mx-auto text-wtech-gold mb-4" size={32} />
                            <h3 className="text-xl font-black uppercase mb-2">Certificação</h3>
                            <p className="text-gray-500 text-sm">W-Tech + ProRiders</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* HISTORIC MARK */}
            <section className="py-24 bg-black relative">
                 <div className="container mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
                    <div>
                        <span className="text-wtech-gold font-black uppercase tracking-[0.2em] text-xs">Exclusividade Europeia</span>
                        <h2 className="text-3xl md:text-5xl font-black uppercase mt-4 mb-8">
                            Um Marco Histórico<br/> para a Europa
                        </h2>
                        <div className="space-y-6 text-gray-400 text-lg leading-relaxed">
                            <p>
                                Pela primeira vez, a <strong className="text-white">W-Tech</strong> e a <strong className="text-white">ProRiders</strong> unem forças em solo europeu para entregar uma formação presencial, técnica e profunda.
                            </p>
                            <p>
                                Este não é um curso comum. É uma imersão real, onde aprende o que acontece <strong>dentro da suspensão</strong>, não apenas o que aparece por fora.
                            </p>
                            <p className="border-l-4 border-wtech-red pl-6 italic text-gray-300">
                                "Treinar dentro da Liqui Moly não é detalhe. É posicionamento, padrão internacional e experiência profissional real."
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
                            Localização Premium
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
                                    <p className="text-gray-400 text-sm">O curso acontecerá dentro das instalações oficiais, garantindo imersão total.</p>
                                </div>
                             </div>
                             
                             <address className="not-italic text-lg text-gray-300 space-y-2 border-t border-white/10 pt-6 mt-2">
                                <strong className="block text-white text-xl uppercase tracking-wider mb-2">Sintra Business Park</strong>
                                <span className="block">Zona Industrial da Abrunheira</span>
                                <span className="block">Edifício 5, Armazém D</span>
                                <span className="block text-blue-400 font-bold mb-4">2710-089 Sintra – Portugal</span>
                                
                                <a href="https://www.instagram.com/liquimolyiberia" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-blue-400 font-bold hover:text-white transition-colors text-sm">
                                    <Instagram size={16} /> @liquimolyiberia
                                </a>
                             </address>
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

            {/* CURRICULUM */}
            <section className="py-24 bg-black">
                <div className="container mx-auto px-6">
                     <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-5xl font-black uppercase">Por que é que este curso é diferente?</h2>
                        <p className="text-gray-500 mt-4 text-lg">A maioria dos cursos fala sobre ajustes. <span className="text-white font-bold">Nós ensinamos o porquê dos ajustes.</span></p>
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
                            <div key={i} className="p-8 border border-white/10 hover:border-wtech-red bg-zinc-900/30 transition-colors group">
                                <div className="w-2 h-2 bg-wtech-red mb-4 rounded-full group-hover:scale-150 transition-transform"></div>
                                <h3 className="text-lg font-black uppercase text-white mb-2">{item.title}</h3>
                                <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
                            </div>
                        ))}
                     </div>

                     <div className="mt-12 text-center">
                        <p className="inline-block bg-white/10 px-6 py-3 rounded-full text-sm font-bold uppercase tracking-widest text-gray-300">
                             💡 Nada de teoria rasa. Aqui o conhecimento é aplicado.
                        </p>
                     </div>
                </div>
            </section>

            {/* LEARNING SCHEDULE */}
            <section className="py-24 bg-zinc-950 border-y border-white/5 relative overflow-hidden">
                <div className="container mx-auto px-6 relative z-10">
                    <div className="text-center mb-20">
                        <h2 className="text-4xl md:text-6xl font-black uppercase mb-4 tracking-tighter italic">🛠️ Cronograma de <span className="text-wtech-red">Aprendizado</span></h2>
                        <p className="text-gray-500 uppercase tracking-[0.3em] text-xs">Curso de Suspensão On-Road e Off-Road</p>
                    </div>

                    <div className="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
                        {/* Modules column 1 */}
                        <div className="space-y-8">
                            {[
                                {
                                    num: "01",
                                    title: "Fundamentos das Suspensões",
                                    subtitle: "Base Técnica",
                                    desc: "Entenda o papel da suspensão na segurança e performance. Diferenças entre sistemas convencionais, invertidos e eletrônicos e como cada um reage a impactos no asfalto e off-road."
                                },
                                {
                                    num: "02",
                                    title: "Molas, Cargas e Geometria",
                                    subtitle: "A Base Mecânica",
                                    desc: "Função real da mola, taxa de mola, compressão e afundamento (SAG estático e dinâmico). Saiba quando ajustar, substituir ou customizar considerando carga e piloto."
                                },
                                {
                                    num: "03",
                                    title: "Mecânica dos Fluidos",
                                    subtitle: "Coração Hidráulico",
                                    desc: "Viscosidade, cavitação e espumação. Como o fluido se comporta sob pressão e altas temperaturas, e a relação direta com a estabilidade da mota."
                                }
                            ].map((module, i) => (
                                <div key={i} className="group relative pl-16 pb-8 border-b border-white/5 last:border-0">
                                    <div className="absolute left-0 top-0 text-3xl font-black text-white/10 group-hover:text-wtech-red/40 transition-colors uppercase">M{module.num}</div>
                                    <h3 className="text-xl font-black text-white uppercase mb-2 group-hover:text-wtech-red transition-colors">{module.title}</h3>
                                    <p className="text-wtech-gold text-[10px] font-black uppercase tracking-widest mb-3 mb-4">{module.subtitle}</p>
                                    <p className="text-gray-400 text-sm leading-relaxed">{module.desc}</p>
                                </div>
                            ))}
                        </div>

                         {/* Modules column 2 */}
                         <div className="space-y-8">
                            {[
                                {
                                    num: "04",
                                    title: "Ajustes e Configuração",
                                    subtitle: "Fim do Achismo",
                                    desc: "Regulagem de Pré-carga, Rebound (Retorno) e Damping (Compressão). Aprenda a configurar para uso urbano, viagem, trilha ou pista com critério técnico."
                                },
                                {
                                    num: "05",
                                    title: "Seleção de Óleo e Viscosidade",
                                    subtitle: "Performance Máxima",
                                    desc: "Diferença entre viscosidade nominal e real (cSt). Como escolher o óleo correto pelo projeto da suspensão e compatibilidade com retentores."
                                },
                                {
                                    num: "06",
                                    title: "Otimização Avançada",
                                    subtitle: "Nível Profissional",
                                    desc: "Funcionamento das válvulas de controle de fluxo e como levar a resposta da suspensão ao limite da eficiência técnica."
                                }
                            ].map((module, i) => (
                                <div key={i} className="group relative pl-16 pb-8 border-b border-white/5 last:border-0">
                                    <div className="absolute left-0 top-0 text-3xl font-black text-white/10 group-hover:text-wtech-red/40 transition-colors uppercase">M{module.num}</div>
                                    <h3 className="text-xl font-black text-white uppercase mb-2 group-hover:text-wtech-red transition-colors">{module.title}</h3>
                                    <p className="text-wtech-gold text-[10px] font-black uppercase tracking-widest mb-3 mb-4">{module.subtitle}</p>
                                    <p className="text-gray-400 text-sm leading-relaxed">{module.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Routine Bar */}
                    <div className="mt-20 bg-zinc-900 border border-white/5 p-8 rounded-3xl max-w-5xl mx-auto shadow-2xl relative overflow-hidden group">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-12 relative z-10">
                            <div className="w-full md:w-1/3">
                                <h4 className="text-2xl font-black text-white uppercase mb-4">Rotina de <span className="text-wtech-red">Imersão</span></h4>
                                <p className="text-gray-500 text-sm leading-relaxed mb-6">Processo padronizado para sábado e domingo.</p>
                                <div className="inline-flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full border border-white/10 text-xs font-bold text-gray-400">
                                    <Settings className="animate-spin-slow" size={14} /> Almoço livre (por conta do participante)
                                </div>
                            </div>

                            <div className="w-full md:w-2/3 grid grid-cols-2 sm:grid-cols-4 gap-6">
                                {[
                                    { t: "08:30", l: "Coffee Break" },
                                    { t: "09:00", l: "Início Aula" },
                                    { t: "12:00", l: "Almoço (1h)" },
                                    { t: "16:00", l: "Coffee Break" },
                                    { t: "18:00", l: "Encerramento" }
                                ].map((step, i) => (
                                    <div key={i} className="text-center md:text-left border-l border-white/10 pl-6">
                                        <div className="text-2xl font-black text-white mb-1 tracking-tighter">{step.t}</div>
                                        <div className="text-[10px] font-black uppercase text-wtech-red tracking-widest">{step.l}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* TESTIMONIALS */}
            <section className="py-24 bg-[#0a0a0a] border-y border-white/5">
                <div className="container mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-5xl font-black uppercase">O Que Dizem os <span className="text-wtech-red">Profissionais</span></h2>
                        <p className="text-gray-500 mt-4 text-base uppercase tracking-widest">Veja a experiência de quem já passou pela formação</p>
                    </div>
                    
                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            "0aX-BfEn8Rg",
                            "OtkjTdObk90",
                            "yl3AFrkV5pY"
                        ].map((videoId, index) => (
                            <div key={index} className="bg-black border border-white/10 p-2 group hover:border-wtech-red transition-all duration-500">
                                <div className="aspect-video relative overflow-hidden">
                                    <iframe 
                                        className="w-full h-full" 
                                        src={`https://www.youtube.com/embed/${videoId}?rel=0`} 
                                        title={`Depoimento ${index + 1}`}
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                        allowFullScreen
                                    ></iframe>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>



            {/* INSTRUCTORS */}
            <section className="py-24 bg-black">
                 <div className="container mx-auto px-6">
                    <div className="flex flex-col md:flex-row gap-8 items-start max-w-5xl mx-auto mt-12 bg-zinc-900/50 border border-white/5 p-8 md:p-12">
                         <div className="md:w-1/3 shrink-0">
                             <img src="https://w-techstore.com.br/wp-content/uploads/2025/12/1.png" alt="Alex Crepaldi" className="w-full rounded shadow-xl" />
                         </div>
                         <div>
                             <div className="inline-block bg-wtech-red text-white text-[10px] font-black uppercase px-2 py-0.5 mb-4">Instrutor Principal</div>
                             <h3 className="text-3xl font-black uppercase text-white mb-2">Alex Crepaldi</h3>
                             <p className="text-gray-400 text-sm mb-6 font-medium">Fundador W-Tech Suspensões</p>
                             
                             <p className="text-gray-300 leading-relaxed mb-6">
                                Responsável direto pelo desenvolvimento de sistemas, metodologias e soluções técnicas W-Tech. Todo o conteúdo do curso será ministrado pelo Alex.
                             </p>

                             <div className="grid grid-cols-2 gap-4 text-xs font-bold text-gray-500 uppercase tracking-wide">
                                 <div>Hidráulica Avançada</div>
                                 <div>Diagnóstico Profissional</div>
                                 <div>Sistemas W-Tech</div>
                                 <div>Performance</div>
                             </div>
                         </div>
                    </div>

                    <div className="flex flex-col md:flex-row gap-8 items-center max-w-5xl mx-auto mt-8 p-8 md:p-12 border border-wtech-gold/20 bg-wtech-gold/5">
                         <div className="md:w-1/4 shrink-0 order-1 md:order-2">
                             <img src="https://w-techstore.com.br/wp-content/uploads/2025/12/2.png" alt="Fernando Macedo" className="w-full rounded shadow-xl grayscale hover:grayscale-0 transition-all" />
                         </div>
                         <div className="order-2 md:order-1 text-right md:flex-1">
                             <div className="inline-block bg-zinc-800 text-white text-[10px] font-black uppercase px-2 py-0.5 mb-4">Participação Especial</div>
                             <h3 className="text-2xl font-black uppercase text-white mb-2">Fernando Macedo</h3>
                             <p className="text-gray-400 text-sm mb-4 font-medium">Instrutor ProRiders</p>
                             <p className="text-gray-400 text-sm leading-relaxed">
                                 Estará presente para enriquecer a experiência, trazendo a visão prática da pilotagem e a aplicação real dos ajustes no comportamento da mota.
                             </p>
                         </div>
                    </div>

                    <div className="max-w-3xl mx-auto text-center mt-16 p-8 border border-white/10 bg-zinc-900">
                        <p className="text-xl font-medium italic text-gray-300">
                            “Este curso não é uma coletânea de opiniões. É a metodologia W-Tech explicada por quem a desenvolveu, testou e aplica profissionalmente.”
                        </p>
                    </div>
                 </div>
            </section>

            {/* FORM */}
            <section id="registration-form" className="py-24 relative text-white">
                <div className="absolute inset-0 z-0">
                    <div className="absolute inset-0 bg-black/70 z-10"></div>
                    <img src="https://w-techbrasil.com.br/wp-content/uploads/2023/12/EFP04493.jpg" className="w-full h-full object-cover" alt="Background" />
                </div>

                <div className="container mx-auto px-6 relative z-10">
                    <div className="max-w-4xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
                        <div>
                            <h2 className="text-4xl lg:text-5xl font-black uppercase mb-6 tracking-tighter">Garanta a Sua Vaga</h2>
                            <p className="text-gray-400 text-lg mb-8 leading-relaxed">
                                As vagas são limitadas pela estrutura técnica e acompanhamento individual. Quando as inscrições fecharem, não haverá lista extra.
                            </p>
                            
                            <ul className="space-y-4 mb-8">
                                <li className="flex items-center gap-3 font-bold"><CheckCircle size={20} className="text-wtech-red" /> Domínio técnico real</li>
                                <li className="flex items-center gap-3 font-bold"><CheckCircle size={20} className="text-wtech-red" /> Visão profissional de diagnóstico</li>
                                <li className="flex items-center gap-3 font-bold"><CheckCircle size={20} className="text-wtech-red" /> Certificação W-Tech + ProRiders</li>
                                <li className="flex items-center gap-3 font-bold"><CheckCircle size={20} className="text-wtech-red" /> Networking internacional</li>
                            </ul>

                            <div className="bg-white/5 backdrop-blur-sm p-6 rounded-lg border-l-4 border-wtech-red">
                                <p className="text-sm font-bold text-gray-300 uppercase tracking-wide">
                                    ⚠️ AVISO IMPORTANTE:<br/>
                                    As vagas são preenchidas por ordem de inscrição validada.
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
                                        {loading ? 'A Enviar...' : 'QUERO PARTICIPAR DO W-TECH EUROPA'}
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
                        <img src="https://w-techstore.com.br/wp-content/uploads/2025/11/logo-w-tech-branca.png" alt="W-Tech" className="h-8 md:h-10" />
                        <img src="https://proriders.com.br/wp-content/webp-express/webp-images/uploads/2025/09/Logo-Pro-Riders.png.webp" alt="ProRiders" className="h-8 md:h-10" />
                        <img src="https://liquimoly.cloudimg.io/v7/https://www.liqui-moly.com/static/version1765819485/frontend/limo/base/default/images/logo.svg" alt="Liqui Moly" className="h-8 md:h-12 bg-white p-1 rounded" />
                    </div>
                    <p className="text-gray-600 text-[10px] font-bold uppercase tracking-[0.4em] mb-4">W-Tech Europa | Lisboa 2026</p>
                    <p className="text-gray-700 text-[10px] uppercase tracking-widest">
                        Lisboa não será apenas o local.<br/>Será o início de um novo padrão técnico.
                    </p>
                </div>
            </footer>

        </div>
    );
};

export default LPWTechLisboa;
