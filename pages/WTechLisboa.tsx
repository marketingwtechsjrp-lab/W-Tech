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
  Users,
  Target,
  Smartphone,
  Mail,
  User,
  AlertOctagon,
  Instagram
} from 'lucide-react';

const WTechLisboa: React.FC = () => {
    const [form, setForm] = useState({ name: '', email: '', phone: '', reason: '' });
    const [loading, setLoading] = useState(false);

    // Course ID for Lisboa 2026
    const COURSE_ID = 'b4a2f0be-2c70-44ce-b2ba-06773e89a0b8';

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
                context_id: `WTECH EUROPA LISBOA 2026 (DIRECT PAY)`,
                tags: ['WTECH_EUROPA_2026', 'PAID_FLOW'],
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
                title: `Inscrição: W-Tech Lisboa 2026 - ${form.name}`,
                price: 380,
                currency: 'eur',
                email: form.email,
                enrollmentId: enrollmentData.id,
                successUrl: window.location.origin + `/#/obrigado-lisboa?eid=${enrollmentData.id}&session_id={CHECKOUT_SESSION_ID}`
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
            <div className="bg-wtech-red text-white text-[10px] md:text-xs font-black uppercase tracking-widest text-center py-2 px-4">
                🇵🇹 Lisboa 2026: MATRÍCULAS ABERTAS - INSCREVA-SE AGORA NA ÚNICA EDIÇÃO EUROPA
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
                        className="inline-flex items-center gap-2 border border-blue-500/30 bg-blue-500/10 backdrop-blur-md px-4 py-1.5 rounded-full mb-8"
                    >
                         <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Flag_of_Portugal.svg/255px-Flag_of_Portugal.svg.png" className="w-4 h-auto rounded-sm" alt="PT" />
                         <span className="text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] text-blue-400">Inscrição Direta | Lisboa 2026</span>
                    </motion.div>
                    
                    <motion.h1 
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-4xl md:text-7xl lg:text-8xl font-black uppercase tracking-tighter leading-[0.9] mb-8"
                    >
                        W-Tech Europa<br/>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-wtech-red to-red-800 whitespace-nowrap">Lisboa 2026</span>
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
                        <span className="flex items-center gap-2"><AlertOctagon size={14} className="text-wtech-red" /> 45 Vagas Limitadas</span>
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
                                    <MapPin size={18} className="group-hover/map:animate-bounce" /> Abrir no Google Maps
                                </a>
                                
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
            <section className="py-24 bg-black border-y border-white/5">
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

                     <div className="mt-12 text-center">
                        <p className="inline-block bg-white/5 border border-white/10 px-8 py-4 rounded-full text-xs font-black uppercase tracking-[0.3em] text-gray-400">
                             💡 Esqueça a teoria superficial. Aqui o conhecimento é aplicado na prática.
                        </p>
                     </div>
                </div>
            </section>

            {/* LEARNING SCHEDULE */}
            <section className="py-24 bg-zinc-950 relative overflow-hidden">
                <div className="container mx-auto px-6 relative z-10">
                    <div className="text-center mb-20">
                        <h2 className="text-4xl md:text-6xl font-black uppercase mb-4 tracking-tighter italic">⚙️ Cronograma de <span className="text-wtech-red underline decoration-wtech-red decoration-2 underline-offset-8">Aprendizagem</span></h2>
                        <p className="text-gray-500 uppercase tracking-[0.4em] text-[10px] font-black italic">Formação Técnica Avançada | Lisboa 2026</p>
                    </div>

                    <div className="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
                        <div className="space-y-8">
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
                                        <div className="w-4 h-px bg-wtech-gold"></div> {module.subtitle}
                                    </p>
                                    <p className="text-gray-500 text-sm leading-relaxed">{module.desc}</p>
                                </div>
                            ))}
                        </div>

                         <div className="space-y-8">
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
                                        <div className="w-4 h-px bg-wtech-gold"></div> {module.subtitle}
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
                                <p className="text-gray-500 text-sm leading-relaxed mb-6 font-medium font-italic italic">Sábado e Domingo, 25 e 26 de Abril.</p>
                                <div className="inline-flex items-center gap-2 bg-white/5 px-6 py-3 rounded-full border border-white/10 text-[10px] font-black uppercase tracking-widest text-gray-400">
                                    <Settings className="animate-spin-slow text-wtech-gold" size={14} /> Almoço livre (Sugerido no Sintra Park)
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

            {/* TESTIMONIALS */}
            <section className="py-24 bg-[#0a0a0a] border-y border-white/5">
                <div className="container mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter italic">O Que Dizem os <span className="text-wtech-red underline decoration-wtech-red/30">Profissionais</span></h2>
                        <p className="text-gray-500 mt-4 text-xs font-black uppercase tracking-[0.4em] italic">Veja a experiência de quem já passou pela formação oficial</p>
                    </div>
                    
                    <div className="grid md:grid-cols-3 gap-10">
                        {[
                            "0aX-BfEn8Rg",
                            "OtkjTdObk90",
                            "yl3AFrkV5pY"
                        ].map((videoId, index) => (
                            <div key={index} className="bg-zinc-900 border border-white/5 p-3 group hover:border-wtech-red/50 transition-all duration-700 rounded-lg shadow-2xl scale-100 hover:scale-[1.02]">
                                <div className="aspect-video relative overflow-hidden rounded-md">
                                    <iframe 
                                        className="w-full h-full grayscale-[0.5] group-hover:grayscale-0 transition-all" 
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
            <section className="py-24 bg-black overflow-hidden">
                 <div className="container mx-auto px-6">
                    <div className="text-center mb-20">
                        <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter italic">Liderado pelos <span className="text-wtech-red">Especialistas</span></h2>
                    </div>

                    <div className="flex flex-col md:flex-row gap-12 items-start max-w-5xl mx-auto bg-zinc-900/40 border border-white/10 p-8 md:p-16 rounded-[2.5rem] relative">
                         <div className="md:w-1/3 shrink-0 relative group">
                             <div className="absolute inset-0 bg-wtech-red/20 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                             <img src="https://w-techstore.com.br/wp-content/uploads/2025/12/1.png" alt="Alex Crepaldi" className="w-full rounded-2xl shadow-2xl relative z-10 grayscale group-hover:grayscale-0 transition-all duration-700" />
                         </div>
                         <div className="relative z-10">
                             <div className="inline-block bg-wtech-red text-white text-[10px] font-black uppercase px-4 py-1 mb-6 rounded-full tracking-widest italic shadow-lg shadow-wtech-red/20">Instrutor Principal</div>
                             <h3 className="text-4xl md:text-5xl font-black uppercase text-white mb-2 leading-none italic tracking-tighter">Alex Crepaldi</h3>
                             <p className="text-wtech-gold text-sm mb-8 font-black uppercase tracking-[0.2em] italic">Fundador W-Tech Suspensões</p>
                             
                             <p className="text-gray-400 italic font-medium text-lg leading-relaxed mb-8 border-l-2 border-white/10 pl-8">
                                Responsável direto pelo desenvolvimento de sistemas, metodologias e soluções técnicas W-Tech. Todo o conteúdo teórico e prático será ministrado pelo Alex.
                             </p>

                             <div className="grid grid-cols-2 gap-6 text-[10px] font-black text-gray-600 uppercase tracking-[0.2em]">
                                 <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-wtech-red"></div> Hidráulica de Competição</div>
                                 <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-wtech-red"></div> Diagnóstico Especializado</div>
                                 <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-wtech-red"></div> Valving Customizado</div>
                                 <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-wtech-red"></div> Engenharia W-Tech</div>
                             </div>
                         </div>
                    </div>

                    <div className="flex flex-col md:flex-row gap-12 items-center max-w-5xl mx-auto mt-12 p-8 md:p-16 border border-wtech-gold/10 bg-wtech-gold/5 rounded-[2.5rem] group">
                         <div className="md:w-1/4 shrink-0 order-1 md:order-2">
                             <img src="https://w-techstore.com.br/wp-content/uploads/2025/12/2.png" alt="Fernando Macedo" className="w-full rounded-2xl shadow-2xl grayscale group-hover:grayscale-0 transition-all duration-700" />
                         </div>
                         <div className="order-2 md:order-1 text-center md:text-right md:flex-1">
                             <div className="inline-block bg-zinc-800 text-white text-[10px] font-black uppercase px-4 py-1 mb-6 rounded-full tracking-widest italic">Participação Especial</div>
                             <h3 className="text-3xl md:text-4xl font-black uppercase text-white mb-2 italic tracking-tighter">Fernando Macedo</h3>
                             <p className="text-gray-500 text-xs font-black uppercase tracking-widest mb-6">Fundador ProRiders</p>
                             <p className="text-gray-400 text-base leading-relaxed italic font-medium">
                                 Estará presente para elevar a experiência, trazendo a visão prática da pilotagem profissional e a aplicação real dos ajustes de suspensão no comportamento dinâmico da mota.
                             </p>
                         </div>
                    </div>

                    <div className="max-w-3xl mx-auto text-center mt-20 p-12 border border-white/5 bg-zinc-950 rounded-2xl relative">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-black border border-white/10 rounded-full flex items-center justify-center">
                            <Clock size={24} className="text-wtech-gold" />
                        </div>
                        <p className="text-2xl md:text-3xl font-black italic tracking-tighter border-spacing-2 text-gray-200 leading-[1.1] uppercase">
                            “Este curso não é uma coletânea de opiniões. É a <span className="text-wtech-red">metodologia W-Tech</span> explicada por quem a desenvolveu, testou e aplica profissionalmente há décadas.”
                        </p>
                    </div>
                 </div>
            </section>

            {/* FORM / REGISTRATION */}
            <section id="registration-form" className="py-24 relative text-white bg-black overflow-hidden">
                <div className="absolute inset-0 z-0">
                    <div className="absolute inset-0 bg-black/85 z-10"></div>
                    <img src="https://w-techbrasil.com.br/wp-content/uploads/2023/12/EFP04493.jpg" className="w-full h-full object-cover scale-110 blur-[2px]" alt="Background" />
                </div>

                <div className="container mx-auto px-6 relative z-20">
                    <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-20 items-center">
                        <div className="lg:sticky lg:top-32">
                            <motion.div
                                initial={{ opacity: 0, x: -50 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.8 }}
                            >
                                <div className="inline-block bg-wtech-red text-white text-[10px] font-black uppercase px-5 py-1.5 mb-8 rounded-full tracking-[0.4em] italic animate-bounce shadow-[0_10px_30px_rgba(230,0,0,0.4)]">
                                    Matrícula Direta Aberta
                                </div>
                                <h2 className="text-6xl lg:text-9xl font-black uppercase mb-8 tracking-tighter leading-[0.75] italic">
                                    CONQUISTE O<br/> <span className="text-transparent bg-clip-text bg-gradient-to-r from-wtech-red to-red-600 block mt-2 whitespace-nowrap">SEU LUGAR</span>
                                </h2>
                                <p className="text-gray-400 text-xl mb-12 leading-relaxed font-bold italic max-w-md">
                                    Esta é a sua chance de abandonar o "achismo" e dominar o diagnóstico real. Ao preencher os dados ao lado, você garante o seu lugar neste <strong className="text-white underline decoration-wtech-red decoration-2">evento épico</strong>.
                                </p>
                            </motion.div>
                            
                            <div className="space-y-8 mb-12">
                                {[
                                    { text: "Reserva Imediata da Vaga", icon: CheckCircle },
                                    { text: "Pagamento 100% Seguro", icon: ShieldCheck },
                                    { text: "Acesso Vitalício ao Conteúdo", icon: Award }
                                ].map((item, i) => (
                                    <motion.div 
                                        key={i}
                                        initial={{ opacity: 0, x: -30 }}
                                        whileInView={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.1 }}
                                        className="flex items-center gap-5 group"
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-white/10 flex items-center justify-center shrink-0 group-hover:bg-wtech-red group-hover:border-wtech-red transition-all duration-500 shadow-xl">
                                            <item.icon size={20} className="text-wtech-red group-hover:text-white transition-colors" />
                                        </div>
                                        <span className="font-black italic uppercase tracking-[0.15em] text-sm group-hover:text-wtech-red transition-colors">{item.text}</span>
                                    </motion.div>
                                ))}
                            </div>

                            <div className="p-8 border-l-4 border-wtech-gold bg-wtech-gold/5 backdrop-blur-sm rounded-r-xl">
                                <p className="text-xs font-black text-wtech-gold uppercase tracking-widest italic mb-2">SUPORTE HUMANO IMEDIATO:</p>
                                <p className="text-gray-300 text-sm font-medium italic leading-relaxed">
                                    Assim que a sua matrícula for confirmada, um dos nossos especialistas entrará em contacto direto via WhatsApp em menos de 24h para oficializar a sua vaga e tirar todas as suas dúvidas.
                                </p>
                            </div>
                        </div>

                        <motion.div 
                            initial={{ y: 20, opacity: 0 }}
                            whileInView={{ y: 0, opacity: 1 }}
                            transition={{ duration: 0.8 }}
                            className="bg-[#0c0c0c]/90 backdrop-blur-3xl border border-white/10 p-10 md:p-16 rounded-[3rem] shadow-[0_0_100px_rgba(230,0,0,0.2)] relative group overflow-hidden"
                        >
                            {/* Animated Sweep Effect */}
                            <motion.div 
                                animate={{ x: ['-100%', '200%'] }}
                                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent -skew-x-12 pointer-events-none z-10"
                            />

                            {/* Animated Gradient Border Effect */}
                            <div className="absolute -inset-[1px] bg-gradient-to-r from-transparent via-wtech-red/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-sm"></div>
                            
                            {/* Top Accent Line */}
                            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-transparent via-wtech-red to-transparent opacity-100 z-20"></div>

                            {/* Internal Glows */}
                            <div className="absolute -top-32 -right-32 w-80 h-80 bg-wtech-red/20 blur-[130px] rounded-full pointer-events-none group-hover:bg-wtech-red/40 transition-all duration-1000"></div>
                            <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-blue-600/10 blur-[130px] rounded-full pointer-events-none group-hover:bg-blue-600/20 transition-all duration-1000"></div>
                            
                            <form onSubmit={handleSubmit} className="space-y-8 relative z-10">
                                <div className="space-y-6">
                                    <div className="group/field">
                                        <label className="block text-[10px] font-black uppercase text-gray-600 tracking-[0.3em] mb-3 group-focus-within/field:text-wtech-red transition-colors italic">Nome Completo</label>
                                        <input 
                                            required 
                                            value={form.name} 
                                            onChange={e => setForm({...form, name: e.target.value})} 
                                            className="w-full bg-black/60 border-b-2 border-white/5 p-5 font-black uppercase text-xl md:text-3xl italic tracking-tighter focus:border-wtech-red focus:shadow-[0_10px_30px_rgba(230,0,0,0.1)] outline-none text-white transition-all placeholder:text-gray-900" 
                                            placeholder="NOME COMPLETO" 
                                        />
                                    </div>
                                    <div className="group/field">
                                        <label className="block text-[10px] font-black uppercase text-gray-600 tracking-[0.3em] mb-3 group-focus-within/field:text-wtech-red transition-colors italic">E-mail Profissional</label>
                                        <input 
                                            required 
                                            type="email" 
                                            value={form.email} 
                                            onChange={e => setForm({...form, email: e.target.value})} 
                                            className="w-full bg-black/60 border-b-2 border-white/5 p-5 font-black uppercase text-xl md:text-3xl italic tracking-tighter focus:border-wtech-red focus:shadow-[0_10px_30px_rgba(230,0,0,0.1)] outline-none text-white transition-all placeholder:text-gray-900" 
                                            placeholder="EMAIL@EXEMPLO.COM" 
                                        />
                                    </div>
                                    <div className="group/field">
                                        <label className="block text-[10px] font-black uppercase text-gray-600 tracking-[0.3em] mb-3 group-focus-within/field:text-wtech-red transition-colors italic">WhatsApp / Telemóvel</label>
                                        <input 
                                            required 
                                            value={form.phone} 
                                            onChange={e => setForm({...form, phone: e.target.value})} 
                                            className="w-full bg-black/60 border-b-2 border-white/5 p-5 font-black uppercase text-xl md:text-3xl italic tracking-tighter focus:border-wtech-red focus:shadow-[0_10px_30px_rgba(230,0,0,0.1)] outline-none text-white transition-all placeholder:text-gray-900" 
                                            placeholder="+351 000 000 000" 
                                        />
                                    </div>
                                    <div className="group/field">
                                        <label className="block text-[10px] font-black uppercase text-gray-600 tracking-[0.3em] mb-3 group-focus-within/field:text-wtech-red transition-colors italic">A sua Mota / Especialidade (Opcional)</label>
                                        <input 
                                            value={form.reason} 
                                            onChange={e => setForm({...form, reason: e.target.value})} 
                                            className="w-full bg-black/40 border-b-2 border-white/5 p-5 font-black uppercase text-xl md:text-3xl italic tracking-tighter focus:border-wtech-red focus:shadow-[0_10px_30px_rgba(230,0,0,0.1)] outline-none text-white transition-all placeholder:text-gray-900" 
                                            placeholder="BMW GS, HONDA, SUSPENSÃO..." 
                                        />
                                    </div>
                                </div>

                                <div className="pt-8 relative group/btn-container">
                                    {/* Pulse effect behind button */}
                                    <div className="absolute inset-0 bg-wtech-red/20 blur-2xl rounded-full opacity-0 group-hover/btn-container:opacity-100 animate-pulse transition-opacity"></div>
                                    
                                    <button 
                                        disabled={loading} 
                                        className="w-full bg-white text-black hover:bg-wtech-red hover:text-white font-black text-2xl md:text-3xl py-7 uppercase tracking-tighter transition-all shadow-[0_20px_60px_rgba(255,255,255,0.2)] hover:shadow-[0_0_40px_rgba(230,0,0,0.5)] disabled:opacity-50 rounded-[1.5rem] flex items-center justify-center gap-4 italic relative z-10 overflow-hidden group/btn"
                                    >
                                        <span className="relative z-10 flex items-center gap-4">
                                            {loading ? (
                                                <> <div className="w-7 h-7 border-4 border-black border-t-transparent rounded-full animate-spin"></div> PROCESSANDO... </>
                                            ) : (
                                                <> EFETUAR MATRÍCULA (€380) <ArrowRight strokeWidth={5} className="group-hover/btn:translate-x-3 transition-transform duration-500" /> </>
                                            )}
                                        </span>
                                    </button>
                                    
                                    <div className="mt-8 flex items-center justify-center gap-6 grayscale opacity-40 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-1000">
                                        <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/b/ba/Stripe_Logo%2C_revised_2016.svg/512px-Stripe_Logo%2C_revised_2016.svg.png" alt="Stripe" className="h-6" />
                                        <div className="w-px h-5 bg-white/20"></div>
                                        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 italic">Ambiente de Pagamento Certificado</div>
                                    </div>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* FOOTER */}
            <footer className="py-20 bg-black text-white border-t border-white/5">
                <div className="container mx-auto px-6 text-center">
                    <img src="https://w-techstore.com.br/wp-content/uploads/2025/11/logo-w-tech-branca.png" alt="W-Tech" className="h-10 md:h-14 mx-auto mb-16 opacity-70" />
                    <div className="flex justify-center gap-12 mb-12">
                        <a href="https://instagram.com/wtechbrasil" target="_blank" rel="noreferrer" className="text-gray-600 hover:text-wtech-red transition-all flex flex-col items-center gap-2 group">
                             <Instagram size={32} className="group-hover:scale-110 transition-transform" />
                             <span className="text-[10px] font-black uppercase tracking-widest">Siga no Instagram</span>
                        </a>
                    </div>
                    <p className="text-gray-800 text-[10px] font-black uppercase tracking-[0.5em]">W-Tech Europa Experience | Lisboa 2026</p>
                </div>
            </footer>

        </div>
    );
};

export default WTechLisboa;
