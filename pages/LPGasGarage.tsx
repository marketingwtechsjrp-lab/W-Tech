import React, { useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
    CheckCircle, ArrowRight, ChevronDown, 
    Cpu, Wrench, Gauge, Monitor, Zap,
    Users, Award, BookOpen, Quote,
    ShieldCheck, Flame, Star, Settings, Terminal,
    MessageCircle, HelpCircle
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { sendWhatsAppMessage } from '../lib/whatsapp';

/* ─── Google Fonts Injection ─── */
if (typeof document !== 'undefined') {
    const existing = document.querySelector('#gas-garage-fonts');
    if (!existing) {
        const link = document.createElement('link');
        link.id = 'gas-garage-fonts';
        link.rel = 'stylesheet';
        link.href = 'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Inter:wght@300;400;500;600;700&display=swap';
        document.head.appendChild(link);
    }
}

/* ─── Inline styles ─── */
const styles = `
    .gas-garage { font-family: 'Inter', sans-serif; }
    .gas-garage h1, .gas-garage h2, .gas-garage h3, .gas-garage .display { font-family: 'Outfit', sans-serif; letter-spacing: -0.02em; }
    
    .gg-dark { background-color: #0a0a0a; color: #ffffff; }
    .gg-card-dark {
        background: #121212;
        border: 1px solid #262626;
        box-shadow: 0 4px 20px rgba(0,0,0,0.2);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .gg-card-dark:hover {
        transform: translateY(-4px);
        box-shadow: 0 12px 40px rgba(0,0,0,0.4);
        border-color: #f59e0b;
    }

    .gg-btn-primary {
        background: linear-gradient(135deg, #f59e0b, #ea580c);
        box-shadow: 0 8px 25px rgba(245,158,11,0.25), inset 0 1px 0 rgba(255,255,255,0.2);
        color: #ffffff !important;
        text-shadow: 0 1px 2px rgba(0,0,0,0.2);
    }
    .gg-btn-primary:hover {
        box-shadow: 0 12px 30px rgba(245,158,11,0.35), inset 0 1px 0 rgba(255,255,255,0.25);
    }

    .gg-text-gradient {
        background: linear-gradient(to right, #f59e0b, #ea580c);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
    }

    .gg-floating-whatsapp {
        background: #25d366;
        box-shadow: 0 10px 30px rgba(37, 211, 102, 0.3);
    }

    .gg-hero-glow {
        background: radial-gradient(ellipse 60% 50% at 50% -20%, rgba(245,158,11,0.1) 0%, transparent 70%);
    }

    .gg-divider { border-top: 1px solid #262626; }
`;

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="inline-flex items-center gap-2 mb-4">
        <div className="w-8 h-px bg-amber-500/50" />
        <span className="font-bold uppercase tracking-[0.25em] text-[10px] sm:text-xs text-amber-400">
            {children}
        </span>
        <div className="w-8 h-px bg-amber-500/50" />
    </div>
);


const LeadForm: React.FC = () => {
    const [formData, setFormData] = useState({ name: '', phone: '' });
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // 1. Save Lead to Supabase
            const { error: dbError } = await supabase.from('SITE_Leads').insert([{
                name: formData.name,
                phone: formData.phone,
                type: 'Gas_Garage_LP',
                status: 'New',
                context_id: 'LP_Chao_de_Oficina',
                tags: ['Gas_Garage', 'RJ', 'André_W-Tech'],
            }]);

            if (dbError) throw dbError;

            // 2. Automated Welcome Message via Evolution API (André's Instance)
            try {
                const andreUserId = '407d09b8-8205-4697-9816-39b20f7e20ef';
                const welcomeMessage = `Olá ${formData.name}! Tudo bem? Aqui é o André da W-Tech. Vi que você se inscreveu na nossa landing page do treinamento Chão de Oficina com o Emanuel do Rio de Janeiro. Seja muito bem-vindo! Como posso te ajudar hoje?`;
                
                await sendWhatsAppMessage(formData.phone, welcomeMessage, andreUserId);
            } catch (whatsappErr) {
                console.error('Erro ao disparar WhatsApp automático:', whatsappErr);
            }

            setSuccess(true);
            
            // 3. Redirect to André's WhatsApp (+55 17 98132-7309)
            const andrePhone = '5517981327309';
            const redirectUrl = `https://wa.me/${andrePhone}?text=${encodeURIComponent(`Olá André! Acabei de me inscrever na LP Chão de Oficina. Meu nome é ${formData.name}.`)}`;
            
            setTimeout(() => {
                window.location.href = redirectUrl;
            }, 1500);

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
                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                    className="w-20 h-20 bg-amber-500/20 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6"
                >
                    <CheckCircle size={40} />
                </motion.div>
                <h3 className="text-2xl font-bold text-white mb-2">Inscrição Realizada!</h3>
                <p className="text-gray-400 mb-6">Redirecionando para o WhatsApp do André...</p>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Nome Completo</label>
                <input 
                    type="text" required
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-5 py-4 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all"
                    placeholder="Seu nome"
                />
            </div>
            <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">WhatsApp</label>
                <input 
                    type="tel" required
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-5 py-4 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all"
                    placeholder="(00) 00000-0000"
                />
            </div>
            {error && <p className="text-red-500 text-xs font-bold text-center">{error}</p>}
            <button 
                type="submit" disabled={loading}
                className="gg-btn-primary w-full py-5 rounded-xl font-black text-sm uppercase tracking-[0.2em] flex items-center justify-center gap-2 mt-4"
            >
                {loading ? 'Processando...' : 'Quero me Inscrever'} <ArrowRight size={18} />
            </button>
        </form>
    );
};

const LPGasGarage: React.FC = () => {
    const prefersReduced = useReducedMotion();

    useEffect(() => {
        document.title = "Treinamento Chão de Oficina | Gas Garage Motorcycle";
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) {
            metaDesc.setAttribute("content", "Capacitação prática para mecânicos que querem dominar diagnóstico eletrônico e soluções reais de oficina em motocicletas multimarcas.");
        }
    }, []);
    
    const methodology = [
        { icon: <Settings size={24} />, title: 'Ambiente Real', desc: 'Aprendizado diretamente no ambiente real de oficina.' },
        { icon: <Zap size={24} />, title: 'Prática Intensa', desc: 'Foco total em motocicletas e sistemas eletrônicos.' },
        { icon: <Cpu size={24} />, title: 'Raciocínio Técnico', desc: 'Diagnóstico baseado em lógica, não apenas em troca de peças.' },
        { icon: <Monitor size={24} />, title: 'Equipamentos Profissionais', desc: 'Uso de scanners TEXA e Centurion de última geração.' },
        { icon: <Wrench size={24} />, title: 'Aplicação Imediata', desc: 'Conhecimento pronto para ser usado no seu dia a dia.' },
    ];

    const content = [
        'Estrutura dos sistemas eletrônicos',
        'Sensores e Atuadores: Diagnóstico Real',
        'Leitura e Interpretação de Códigos de Falha',
        'Uso Profissional de Scanners (TEXA e Centurion)',
        'Sistema de Carga: Estator, Retificador e Magneto',
        'Comunicação entre Módulos Eletrônicos',
        'Técnicas Práticas de Diagnóstico de Oficina',
        'Estratégias "Off-Manual": O que os manuais não ensinam',
    ];

    const differentiators = [
        { icon: <Star size={20} />, title: 'Experiência de Campo', desc: 'Baseado em anos de oficina especializada.' },
        { icon: <Award size={20} />, title: 'Foco Multimarcas', desc: 'Soluções para os principais modelos do mercado.' },
        { icon: <Users size={20} />, title: 'Turmas Reduzidas', desc: 'Atenção máxima para cada aluno.' },
        { icon: <Flame size={20} />, title: 'Carga Prática', desc: 'A mão na graxa é o que ensina.' },
    ];

    const faq = [
        { q: 'O treinamento é apenas para mecânicos experientes?', a: 'Não. O conteúdo é estruturado para elevar o nível tanto de quem está começando quanto de quem já tem anos de oficina e quer dominar a eletrônica.' },
        { q: 'Quais ferramentas preciso levar?', a: 'Nenhuma. Todo o equipamento técnico, scanners (TEXA e Centurion) e motocicletas são fornecidos para a prática durante o treinamento.' },
        { q: 'Tem certificado?', a: 'Sim. Ao final do treinamento, você recebe um certificado de capacitação técnica profissional em diagnóstico eletrônico.' },
        { q: 'Quais marcas de motos serão abordadas?', a: 'O foco é multimarcas, abrangendo os principais sistemas eletrônicos encontrados nas oficinas brasileiras.' },
    ];

    const scrollToForm = () => {
        document.getElementById('cadastro')?.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <>
            <style dangerouslySetInnerHTML={{ __html: styles }} />

            <div className="gas-garage gg-dark min-h-screen selection:bg-amber-500 selection:text-black overflow-x-hidden">
                
                {/* ── Sticky CTA ── */}
                <div className="fixed bottom-0 left-0 right-0 z-[100] md:hidden p-4 bg-zinc-950/80 backdrop-blur-md border-t border-white/10">
                    <button 
                        onClick={scrollToForm}
                        className="gg-btn-primary w-full py-4 rounded-xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2"
                    >
                        Quero Minha Vaga <ArrowRight size={18} />
                    </button>
                </div>

                {/* ── Floating WhatsApp (Desktop) ── */}
                <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ scale: 1.1 }}
                    onClick={scrollToForm}
                    className="fixed bottom-8 right-8 z-[100] hidden md:flex gg-floating-whatsapp w-16 h-16 rounded-full items-center justify-center text-white"
                >
                    <MessageCircle size={32} />
                </motion.button>

                {/* ── Top Bar ── */}
                <div className="relative z-[100] bg-black/50 backdrop-blur-sm py-4 border-b border-white/5">
                    <div className="container mx-auto px-6 flex justify-between items-center">
                        <div className="flex items-center gap-6">
                            <img 
                                src="https://w-techstore.com.br/wp-content/uploads/2025/11/logo-w-tech-branca.png" 
                                alt="W-Tech" 
                                className="h-6 md:h-8 opacity-80" 
                            />
                            <div className="h-6 w-px bg-white/10 hidden sm:block" />
                            <div className="hidden sm:flex">
                                <img src="/logo-gas-garage.png" alt="Gas Garage" className="h-8 md:h-10 drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]" />
                            </div>
                        </div>
                        <div className="flex items-center gap-4 text-[10px] md:text-xs font-bold uppercase tracking-widest text-amber-500">
                            <span className="hidden sm:inline">Gas Garage Motorcycle + W-Tech</span>
                            <span className="sm:hidden">GG + W-Tech</span>
                        </div>
                    </div>
                </div>

                {/* ── Hero Section ── */}
                <section className="relative min-h-[90vh] flex items-center pt-20 pb-32 overflow-hidden">
                    <div className="absolute inset-0 z-0">
                        <img 
                            src="/gas-garage-hero.png" 
                            alt="Workshop Hero" 
                            className="w-full h-full object-cover opacity-40 mix-blend-luminosity"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/60 to-transparent" />
                        <div className="absolute inset-0 gg-hero-glow" />
                    </div>

                    <div className="container mx-auto px-6 relative z-10">
                        <div className="grid lg:grid-cols-2 gap-16 items-center">
                            <div className="max-w-4xl">
                                <motion.div 
                                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
                                    className="mb-6"
                                >
                                    <span className="inline-block border border-amber-500/30 bg-amber-500/10 text-amber-400 text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] px-4 py-2 rounded-full">
                                        Treinamento Técnico Profissional
                                    </span>
                                </motion.div>

                                <motion.h1 
                                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
                                    className="text-4xl md:text-7xl lg:text-8xl font-black uppercase leading-[0.9] tracking-tighter mb-8"
                                >
                                    <div className="mb-4">
                                        <img src="/logo-chao-de-oficina.jpg" alt="Chão de Oficina" className="h-20 md:h-32 lg:h-40 filter invert brightness-200" />
                                    </div>
                                </motion.h1>

                                <motion.p 
                                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
                                    className="text-gray-300 text-lg md:text-2xl leading-relaxed mb-10 max-w-2xl font-light"
                                >
                                    Capacitação prática para mecânicos que querem dominar <strong>diagnóstico eletrônico</strong> e soluções reais de oficina em motocicletas multimarcas.
                                </motion.p>

                                <motion.div 
                                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }}
                                    className="flex flex-col sm:flex-row gap-4"
                                >
                                    <button 
                                        onClick={scrollToForm}
                                        className="gg-btn-primary px-10 py-5 rounded-2xl font-black text-base uppercase tracking-widest flex items-center justify-center gap-3 hover:scale-105 transition-transform"
                                    >
                                        Garantir Minha Vaga <ArrowRight size={20} />
                                    </button>
                                    <div className="flex flex-col justify-center px-4">
                                        <div className="flex gap-1 text-amber-500 mb-1">
                                            {[1, 2, 3, 4, 5].map(i => <Star key={i} size={14} fill="currentColor" />)}
                                        </div>
                                        <p className="text-[10px] uppercase font-bold tracking-widest text-gray-500">Workshop de Elite</p>
                                    </div>
                                </motion.div>
                            </div>

                            {/* Hero Form */}
                            <motion.div 
                                initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.4 }}
                                className="hidden lg:block w-full max-w-md ml-auto"
                            >
                                <div className="gg-card-dark p-10 rounded-[2.5rem] border-amber-500/20 relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-orange-600"></div>
                                    <h3 className="text-2xl font-black uppercase mb-6 tracking-tight">Pré-Inscrição</h3>
                                    <LeadForm />
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </section>

                {/* ── Methodology Section ── */}
                <section className="py-24 relative z-10 bg-[#0a0a0a]">
                    <div className="container mx-auto px-6">
                        <div className="text-center mb-20">
                            <SectionLabel>Metodologia</SectionLabel>
                            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tight">
                                Diagnóstico baseado em <span className="text-amber-500 italic">Raciocínio Técnico</span>
                            </h2>
                        </div>

                        <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-6">
                            {methodology.map((item, i) => (
                                <motion.div 
                                    key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                                    className="gg-card-dark p-8 rounded-3xl flex flex-col items-center text-center group"
                                >
                                    <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-white/5 flex items-center justify-center text-amber-500 mb-6 group-hover:bg-amber-500 group-hover:text-black transition-all duration-300">
                                        {item.icon}
                                    </div>
                                    <h3 className="text-lg font-bold mb-3">{item.title}</h3>
                                    <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── About Section ── */}
                <section className="py-32 bg-zinc-950 relative overflow-hidden">
                    <div className="container mx-auto px-6">
                        <div className="grid lg:grid-cols-2 gap-20 items-center">
                            <motion.div 
                                initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
                                className="relative rounded-[3rem] overflow-hidden aspect-[3/4]"
                            >
                                <img 
                                    src="/gas-garage/emanuel.jpg" 
                                    alt="Emanuel Ricciardi" 
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
                                <div className="absolute bottom-10 left-10 right-10 p-8 bg-zinc-900/90 backdrop-blur-md rounded-3xl border border-white/5">
                                    <p className="text-amber-500 font-black text-2xl uppercase mb-2">Emanuel Ricciardi</p>
                                    <p className="text-gray-400 text-sm italic">“O conhecimento traz simplicidade.”</p>
                                </div>
                            </motion.div>

                            <motion.div 
                                initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
                            >
                                <SectionLabel>Sobre o Treinamento</SectionLabel>
                                <h2 className="text-3xl md:text-5xl font-black uppercase mb-8 leading-tight">
                                    Direto para a realidade do <span className="gg-text-gradient">Dia a Dia</span>
                                </h2>
                                <div className="space-y-6 text-gray-400 text-lg leading-relaxed">
                                    <p>
                                        Diferente de cursos tradicionais baseados apenas em teoria, este treinamento prioriza a <strong>prática intensiva</strong>.
                                    </p>
                                    <p>
                                        Os participantes aprendem trabalhando com motocicletas reais, analisando defeitos crônicos, utilizando scanners profissionais e aplicando técnicas modernas de diagnóstico que não estão nos manuais.
                                    </p>
                                    <div className="pt-6 grid grid-cols-2 gap-6">
                                        {differentiators.map((d, i) => (
                                            <div key={i} className="flex gap-4 items-start">
                                                <div className="shrink-0 text-amber-500">{d.icon}</div>
                                                <div>
                                                    <p className="text-white font-bold text-sm uppercase mb-1">{d.title}</p>
                                                    <p className="text-xs text-gray-500">{d.desc}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </section>

                {/* ── W-Tech Headquarters Section ── */}
                <section className="py-24 bg-[#0a0a0a] border-t border-white/5">
                    <div className="container mx-auto px-6">
                        <div className="grid lg:grid-cols-2 gap-16 items-center">
                            <motion.div 
                                initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                            >
                                <SectionLabel>Nossa Estrutura</SectionLabel>
                                <h2 className="text-3xl md:text-5xl font-black uppercase mb-8 leading-tight">
                                    ESTRUTURA <span className="text-amber-500 italic">INDEPENDENTE</span> DO BRASIL.
                                </h2>
                                <div className="space-y-6 text-gray-400 text-lg leading-relaxed">
                                    <p>
                                        Localizada estrategicamente em São José do Rio Preto, a sede da <strong>W-Tech Brasil</strong> é o epicentro da alta performance em duas rodas na América Latina.
                                    </p>
                                    <p>
                                        Nossa metodologia exclusiva une a teoria da engenharia com a prática extrema do <strong>Motocross, Enduro e Rally</strong>. Não apenas ensinamos suspensão; entregamos a autoridade técnica que transforma oficinas comuns em centros de referência em preparação.
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
                                        <div className="flex items-center gap-3 p-4 bg-zinc-900/50 rounded-2xl border border-white/5">
                                            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                                                <Settings size={20} />
                                            </div>
                                            <span className="text-xs font-bold uppercase tracking-widest">Laboratório de Eletrônica</span>
                                        </div>
                                        <div className="flex items-center gap-3 p-4 bg-zinc-900/50 rounded-2xl border border-white/5">
                                            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                                                <Zap size={20} />
                                            </div>
                                            <span className="text-xs font-bold uppercase tracking-widest">Dinamômetro de Suspensão</span>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>

                            <motion.div 
                                initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
                                className="relative"
                            >
                                <div className="relative rounded-[2.5rem] overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.5)] border border-white/10">
                                    <img 
                                        src="https://w-techbrasil.com.br/wp-content/uploads/2025/01/w-tech-sobre-nos-1-768x495.jpg" 
                                        alt="W-Tech Brasil Sede" 
                                        className="w-full h-full object-cover"
                                    />
                                    <div className="absolute bottom-6 left-6">
                                        <div className="bg-black/80 backdrop-blur-md p-6 rounded-2xl border border-amber-500/30">
                                            <p className="text-3xl font-black text-amber-500 mb-1">1.200m²</p>
                                            <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-white">De Estrutura Técnica</p>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </section>

                {/* ── Content List ── */}
                <section className="py-24 bg-[#0a0a0a]">
                    <div className="container mx-auto px-6 max-w-6xl">
                        <div className="gg-card-dark p-12 md:p-20 rounded-[3rem] relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-10 opacity-5">
                                <Terminal size={200} />
                            </div>
                            
                            <div className="relative z-10">
                                <SectionLabel>O que você vai dominar</SectionLabel>
                                <h2 className="text-3xl md:text-6xl font-black uppercase mb-12">Conteúdo <span className="text-amber-500 italic">Abordado</span></h2>
                                
                                <div className="grid md:grid-cols-2 gap-x-12 gap-y-6">
                                    {content.map((item, i) => (
                                        <motion.div 
                                            key={i} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}
                                            className="flex items-center gap-4 group"
                                        >
                                            <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-white/10 flex items-center justify-center text-amber-500 shrink-0 group-hover:bg-amber-500 group-hover:text-black transition-colors">
                                                <CheckCircle size={16} />
                                            </div>
                                            <span className="text-gray-300 font-medium md:text-lg">{item}</span>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── FAQ Section ── */}
                <section className="py-24 bg-zinc-950">
                    <div className="container mx-auto px-6 max-w-4xl">
                        <div className="text-center mb-16">
                            <SectionLabel>Dúvidas</SectionLabel>
                            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tight">Perguntas <span className="text-amber-500 italic">Frequentes</span></h2>
                        </div>
                        <div className="space-y-4">
                            {faq.map((item, i) => (
                                <motion.div 
                                    key={i} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                                    className="gg-card-dark p-6 rounded-2xl border-white/5"
                                >
                                    <h3 className="text-lg font-bold mb-2 flex items-center gap-3">
                                        <HelpCircle size={18} className="text-amber-500" />
                                        {item.q}
                                    </h3>
                                    <p className="text-gray-400 text-sm leading-relaxed">{item.a}</p>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── Partnership ── */}
                <section className="py-24 border-t border-white/5">
                    <div className="container mx-auto px-6 text-center">
                        <SectionLabel>Parceria de Elite</SectionLabel>
                        <div className="flex flex-col md:flex-row items-center justify-center gap-12 md:gap-24 grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all duration-500">
                            <div className="text-center">
                                <p className="text-[10px] uppercase tracking-[0.3em] font-black text-gray-500 mb-4">Realização</p>
                                <div className="p-2">
                                    <img src="/logo-gas-garage.png" alt="Gas Garage" className="h-20 md:h-28 drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]" />
                                </div>
                                <p className="text-[10px] uppercase tracking-widest text-amber-500 mt-2">Motorcycle - RJ</p>
                            </div>
                            <div className="h-12 w-px bg-white/10 hidden md:block" />
                            <div className="text-center">
                                <p className="text-[10px] uppercase tracking-[0.3em] font-black text-gray-500 mb-4">Hospedagem & Apoio</p>
                                <img 
                                    src="https://w-techstore.com.br/wp-content/uploads/2025/11/logo-w-tech-branca.png" 
                                    alt="W-Tech" 
                                    className="h-10" 
                                />
                                <p className="text-[10px] uppercase tracking-widest text-amber-500 mt-2">Expertise em Suspensão</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── Final CTA ── */}
                <section id="cadastro" className="py-32 bg-black relative overflow-hidden">
                    <div className="absolute inset-0 z-0">
                        <div className="absolute inset-0 bg-amber-500/5 mix-blend-overlay" />
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] gg-hero-glow" />
                    </div>

                    <div className="container mx-auto px-6 relative z-10 text-center max-w-4xl">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
                            className="gg-card-dark p-12 md:p-20 rounded-[4rem] border-amber-500/20"
                        >
                            <h2 className="text-4xl md:text-7xl font-black uppercase mb-8 leading-none">
                                Pronto para <br />
                                <span className="gg-text-gradient">Elevar seu Nível?</span>
                            </h2>
                            <p className="text-gray-400 text-lg md:text-xl mb-12 max-w-2xl mx-auto">
                                Vagas limitadas para garantir o aproveitamento prático de cada aluno. Não perca a oportunidade de aprender com quem vive o chão de oficina.
                            </p>
                            
                            <div className="max-w-md mx-auto text-left">
                                <LeadForm />
                                <div className="mt-8 flex items-center justify-center gap-4 text-gray-500 text-sm font-bold uppercase tracking-widest">
                                    <ShieldCheck size={20} className="text-amber-500" />
                                    <span>Certificado de Conclusão Incluso</span>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </section>

                {/* ── Footer ── */}
                <footer className="py-12 border-t border-white/5 text-center">
                    <div className="container mx-auto px-6">
                        <p className="text-gray-600 text-[10px] font-bold uppercase tracking-[0.3em] mb-4">
                            Gas Garage Motorcycle & W-Tech Brasil © {new Date().getFullYear()}
                        </p>
                        <div className="flex justify-center gap-6 text-[10px] text-gray-500 uppercase tracking-widest font-bold">
                            <a href="#" className="hover:text-amber-500 transition-colors">Termos</a>
                            <a href="#" className="hover:text-amber-500 transition-colors">Privacidade</a>
                            <a href="#" className="hover:text-amber-500 transition-colors">Suporte</a>
                        </div>
                    </div>
                </footer>

            </div>
        </>
    );
};

export default LPGasGarage;
