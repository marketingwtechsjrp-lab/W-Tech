import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
    ArrowRight, Calendar, MapPin, Award, Settings, Zap, Play, X,
    CheckCircle, ShieldCheck, Target, Activity, Gauge, Wrench,
    Navigation, ChevronDown, Users, Star
} from 'lucide-react';
import { useLandingPage } from '../hooks/useLandingPage';
import { resolveScheduleModules } from '../lib/schedule';
import { resolveSectionOrder } from '../lib/lpSections';
import { getYouTubeId } from '../lib/testimonials';
import LPEnrollForm from '../components/lp/LPEnrollForm';
import { FakeSignupAlert } from '../components/FakeSignupAlert';
import { GridVignetteBackground } from '../components/ui/vignette-grid-background';
import { useSettings } from '../context/SettingsContext';
import { formatDateLocal, sanitizeHtml } from '../lib/utils';

/**
 * V9 — "Premium Immersive" (DARK · vermelho + dourado)
 * Template padrão inspirado nas LPs de Lisboa (LPWTechLisboa / Nov2026) e na
 * LPErgonomia: hero cinematográfico, bento grid de benefícios, módulos
 * numerados M01+, instrutor em card gigante, form glassmorphism e CTAs com
 * glow. Preço só aparece com checkout automático (regra do LPEnrollForm).
 *
 * As seções entre o trust bar e o formulário são reordenáveis/ocultáveis pelo
 * editor (SITE_LandingPages.section_order — ver lib/lpSections.ts).
 */

/* ─── Animation Variants ─── */
const fadeUp = {
    hidden: { opacity: 0, y: 30 },
    visible: (i: number = 0) => ({
        opacity: 1,
        y: 0,
        transition: { duration: 0.5, delay: i * 0.1, ease: 'easeOut' },
    }),
};
const stagger = { visible: { transition: { staggerChildren: 0.1 } } };

/* Ícones ciclados nos cards do bento de benefícios */
const BENTO_ICONS = [Activity, Target, Settings, Zap, Award, Wrench, Gauge, ShieldCheck];

const LandingPageViewerV9: React.FC = () => {
    const { get } = useSettings();
    const systemLogo = get('logo_url');
    const whatsappGlobal = get('whatsapp_phone');
    const {
        lp, loading, spotsLeft, form, setForm, paymentType, setPaymentType,
        submitted, setSubmitted, showFloatingCTA, isFullOrDone, checkoutAtivo,
        handleSubmit, scrollToForm
    } = useLandingPage('v9');
    const [activeVideo, setActiveVideo] = useState<string | null>(null);
    const [openFaq, setOpenFaq] = useState<number | null>(null);

    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center bg-[#050505]">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-wtech-red" />
            </div>
        );
    }
    if (!lp) {
        return <div className="h-screen flex items-center justify-center bg-[#050505] text-white font-medium">Página não encontrada.</div>;
    }

    const course = lp.course;
    const heroVideoId = lp.videoUrl ? getYouTubeId(lp.videoUrl) : '';
    const dateLabel = course?.date
        ? (course.dateEnd ? `${formatDateLocal(course.date)} – ${formatDateLocal(course.dateEnd)}` : formatDateLocal(course.date))
        : 'Data a definir';
    const cityLabel = course?.city || 'Brasil';
    const isOnline = (course?.locationType || '').toLowerCase().includes('online');
    const mapQuery = course?.address ? `${course.address}, ${course.city}` : course?.location || course?.city || 'São Paulo';

    // Dias de imersão (inclusivo) a partir das datas do curso
    const immersionDays = (() => {
        if (!course?.date) return null;
        if (!course.dateEnd) return 1;
        const start = new Date(course.date).getTime();
        const end = new Date(course.dateEnd).getTime();
        if (isNaN(start) || isNaN(end) || end < start) return 1;
        return Math.round((end - start) / 86400000) + 1;
    })();

    const scheduleModules = resolveScheduleModules(lp.scheduleModules);

    const faqs = [
        { q: 'Quem pode participar deste curso?', a: 'Profissionais e entusiastas da área que desejam se aprofundar tecnicamente e obter a certificação oficial W-Tech.' },
        { q: 'O certificado é reconhecido pelo mercado?', a: 'Sim. A certificação W-Tech é reconhecida pelo setor e representa um diferencial competitivo real no seu currículo profissional.' },
        { q: 'O que devo levar no dia do curso?', a: (course as any)?.whatToBring || (course as any)?.what_to_bring || 'Documentos pessoais, caneta e vontade de aprender! Os materiais didáticos são fornecidos pelo instrutor.' },
        { q: 'Haverá material de apoio?', a: 'Sim! Todos os alunos recebem material completo de apoio e certificado de conclusão.' },
        { q: 'Como é feito o pagamento?', a: 'Aceitamos cartão de crédito e PIX. Para condições especiais, fale com nossa equipe no WhatsApp.' },
    ];

    const whatsappNumber = lp.whatsappNumber || whatsappGlobal;
    const waLink = whatsappNumber
        ? `https://wa.me/${whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá! Tenho interesse no curso ${lp.title}`)}`
        : '#';

    /* Kicker + título de seção padronizados */
    const SectionHead = ({ kicker, children, sub }: { kicker: string; children: React.ReactNode; sub?: string }) => (
        <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }} variants={stagger}
            className="text-center mb-16"
        >
            <motion.span variants={fadeUp} className="text-wtech-red font-black uppercase tracking-[0.3em] text-[10px] md:text-xs">{kicker}</motion.span>
            <motion.h2 variants={fadeUp} className="text-4xl md:text-6xl font-black uppercase mt-4 tracking-tighter">{children}</motion.h2>
            {sub && <motion.p variants={fadeUp} className="text-gray-500 mt-4 text-lg max-w-xl mx-auto">{sub}</motion.p>}
        </motion.div>
    );

    /* ─── Seções reordenáveis (ordem/visibilidade vem do editor) ─── */
    const sectionRenderers: Record<string, React.ReactNode> = {
        narrative: (
            <section className="py-24 bg-[#050505] relative overflow-hidden">
                <GridVignetteBackground className="opacity-40" />
                <div className="container mx-auto px-6 relative z-10">
                    <div className="grid lg:grid-cols-2 gap-20 items-center">
                        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
                            <motion.span variants={fadeUp} className="text-wtech-red font-black uppercase tracking-[0.4em] text-xs">Exclusividade W-Tech</motion.span>
                            <motion.h2 variants={fadeUp} className="text-4xl md:text-6xl font-black uppercase mt-6 mb-8 tracking-tighter leading-none">
                                Um Novo Padrão<br /> Técnico para <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-red-900">Você</span>
                            </motion.h2>
                            <div className="space-y-6 text-gray-400 text-lg md:text-xl leading-relaxed">
                                <motion.p variants={fadeUp}>
                                    A <strong className="text-white">metodologia W-Tech</strong> entrega uma formação técnica,
                                    profunda e sem rodeios: teoria mínima necessária, prática máxima possível.
                                </motion.p>
                                <motion.p variants={fadeUp}>
                                    Este não é apenas um curso. É uma transferência de tecnologia para quem quer dominar
                                    a técnica de verdade, <strong>eliminando o achismo</strong> de uma vez por todas.
                                </motion.p>
                                <motion.div variants={fadeUp} className="border-l-4 border-wtech-red pl-8 py-2 italic text-gray-300 bg-white/5 rounded-r-xl">
                                    "Você sai com o certificado oficial W-Tech e o caminho aberto para a rede credenciada —
                                    o selo técnico que faz o cliente escolher a sua oficina."
                                </motion.div>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, x: 50 }} whileInView={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.8 }} viewport={{ once: true }}
                            className="relative group"
                        >
                            <div className="absolute -inset-4 bg-gradient-to-r from-wtech-red/20 to-transparent blur-3xl group-hover:from-wtech-red/40 transition-all" />
                            <img
                                src={lp.heroSecondaryImage || lp.instructorImage || lp.heroImage}
                                alt={lp.title}
                                className="relative w-full rounded-2xl border border-white/10 shadow-2xl transition-all duration-700 hover:scale-[1.02] object-cover max-h-[560px]"
                            />
                            <div className="absolute -bottom-6 -right-6 bg-wtech-red text-white p-6 rounded-xl font-black uppercase text-sm tracking-[0.2em] shadow-2xl">
                                100% Técnico
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>
        ),

        benefits: lp.benefits && lp.benefits.length > 0 ? (
            <section className="py-24 bg-black relative">
                <GridVignetteBackground className="opacity-30 pointer-events-none" />
                <div className="container mx-auto px-6 relative z-10">
                    <SectionHead kicker="O que você vai dominar">
                        Engenharia de <span className="text-gray-500">Performance</span>
                    </SectionHead>

                    <motion.div
                        initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-40px' }} variants={stagger}
                        className="grid md:grid-cols-12 gap-6 auto-rows-[minmax(220px,auto)]"
                    >
                        {lp.benefits.map((b, i) => {
                            const Icon = BENTO_ICONS[i % BENTO_ICONS.length];
                            // Padrão 8/4 alternado: 8,4,4,8, 8,4,4,8...
                            const wide = i % 4 === 0 || i % 4 === 3;
                            const highlight = i % 4 === 3;
                            return (
                                <motion.div
                                    key={i} variants={fadeUp} custom={i}
                                    className={`${wide ? 'md:col-span-8' : 'md:col-span-4'} ${
                                        highlight
                                            ? 'bg-gradient-to-br from-wtech-red/20 to-zinc-900/50 border-wtech-red/20'
                                            : 'bg-zinc-900/50 border-white/5'
                                    } border rounded-3xl p-10 flex flex-col justify-end group hover:border-wtech-gold/25 hover:shadow-[0_0_30px_rgba(212,175,55,0.06)] transition-all duration-500`}
                                >
                                    <Icon className="text-wtech-red mb-auto group-hover:text-wtech-gold transition-colors" size={40} />
                                    <h3 className="text-2xl font-black uppercase text-white mb-2 tracking-widest mt-6">{b.title}</h3>
                                    <p className={`${highlight ? 'text-gray-300 italic' : 'text-gray-500'} text-sm leading-relaxed max-w-md`}>{b.description}</p>
                                </motion.div>
                            );
                        })}
                    </motion.div>
                </div>
            </section>
        ) : null,

        modules: lp.modules && lp.modules.length > 0 ? (
            <section id="conteudo" className="py-24 bg-[#080808] border-y border-white/5 relative overflow-hidden">
                <GridVignetteBackground className="opacity-25 pointer-events-none" />
                <div className="container mx-auto px-6 relative z-10">
                    <SectionHead kicker="Conteúdo Programático" sub="Módulo a módulo, do fundamento à maestria técnica.">
                        O que Você vai <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-500">Aprender</span>
                    </SectionHead>

                    <div className="grid lg:grid-cols-2 gap-x-16 gap-y-2 max-w-6xl mx-auto">
                        {lp.modules.map((mod, i) => (
                            <motion.div
                                key={i}
                                initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-40px' }} variants={fadeUp} custom={i % 2}
                                className="group relative pl-16 py-8 border-b border-white/5 hover:border-wtech-red/30 transition-colors"
                            >
                                <div className="absolute left-0 top-8 text-4xl font-black text-white/5 group-hover:text-wtech-red/40 transition-colors uppercase leading-none">
                                    M{String(i + 1).padStart(2, '0')}
                                </div>
                                <h3 className="text-xl font-black text-white uppercase mb-1 group-hover:text-wtech-red transition-colors italic tracking-tighter">{mod.title}</h3>
                                <p className="text-wtech-gold text-[10px] font-black uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <span className="w-4 h-px bg-wtech-gold" /> Módulo {String(i + 1).padStart(2, '0')}
                                </p>
                                <p className="text-gray-500 text-sm leading-relaxed">{mod.description}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>
        ) : null,

        schedule: scheduleModules && scheduleModules.length > 0 ? (
            <section className="py-24 bg-[#050505] relative overflow-hidden">
                <div className="container mx-auto px-6 relative z-10">
                    <SectionHead kicker="A Experiência">
                        Cronograma <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-500">Detalhado</span>
                    </SectionHead>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
                        {scheduleModules.map((mod, i) => (
                            <motion.div
                                key={i}
                                initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-40px' }} variants={fadeUp} custom={i % 3}
                                className="group relative bg-zinc-900/50 border border-white/5 rounded-3xl p-8 hover:border-wtech-red/30 transition-colors flex flex-col"
                            >
                                <div className="text-4xl font-black text-white/5 group-hover:text-wtech-red/40 transition-colors uppercase leading-none mb-4">
                                    {String(i + 1).padStart(2, '0')}
                                </div>
                                <h4 className="text-xl font-black text-white uppercase mb-1 group-hover:text-wtech-red transition-colors italic tracking-tighter">{mod.title}</h4>
                                {mod.objective && (
                                    <p className="text-wtech-gold text-[10px] font-black uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <span className="w-4 h-px bg-wtech-gold" /> {mod.objective}
                                    </p>
                                )}
                                {mod.topics && mod.topics.filter(Boolean).length > 0 && (
                                    <ul className="space-y-2 mb-4">
                                        {mod.topics.filter(Boolean).map((t, j) => (
                                            <li key={j} className="flex items-start gap-2 text-gray-500 text-sm leading-relaxed">
                                                <CheckCircle size={14} className="text-wtech-red shrink-0 mt-0.5" /> {t}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                                {mod.result && (
                                    <p className="text-gray-400 text-xs font-bold uppercase tracking-wide mt-auto pt-4 border-t border-white/5">
                                        <span className="text-wtech-gold">Resultado:</span> {mod.result}
                                    </p>
                                )}
                            </motion.div>
                        ))}
                    </div>

                    {/* Barra de rotina com horários do curso */}
                    {(course?.startTime || course?.endTime) && (
                        <div className="mt-16 bg-zinc-900/80 backdrop-blur-xl border border-white/5 p-8 md:p-12 rounded-[2rem] max-w-4xl mx-auto shadow-[0_30px_60px_rgba(0,0,0,0.5)] relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-8">
                                <Zap className="text-wtech-gold opacity-10 group-hover:opacity-40 transition-all" size={80} />
                            </div>
                            <div className="flex flex-col md:flex-row items-center justify-between gap-10 relative z-10">
                                <div className="text-center md:text-left">
                                    <h4 className="text-3xl font-black text-white uppercase mb-2 tracking-tighter">Rotina de <span className="text-wtech-red italic">Imersão</span></h4>
                                    <p className="text-gray-500 text-sm font-medium italic">{dateLabel}</p>
                                </div>
                                <div className="flex gap-10">
                                    {course?.startTime && (
                                        <div className="text-center md:text-left border-l border-white/5 pl-6">
                                            <div className="text-3xl font-black text-white mb-1 tracking-tighter italic">{course.startTime}</div>
                                            <div className="text-[10px] font-black uppercase text-gray-600 tracking-widest">Início</div>
                                        </div>
                                    )}
                                    {course?.endTime && (
                                        <div className="text-center md:text-left border-l border-white/5 pl-6">
                                            <div className="text-3xl font-black text-white mb-1 tracking-tighter italic">{course.endTime}</div>
                                            <div className="text-[10px] font-black uppercase text-gray-600 tracking-widest">Encerramento</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </section>
        ) : null,

        instructor: (
            <section className="py-24 bg-black relative">
                <GridVignetteBackground className="opacity-25 pointer-events-none" />
                <div className="container mx-auto px-6">
                    <div className="max-w-6xl mx-auto bg-zinc-900/40 border border-white/5 rounded-[2rem] overflow-hidden">
                        <div className="grid lg:grid-cols-2">
                            <div className="relative h-[400px] lg:h-auto overflow-hidden bg-zinc-900">
                                {lp.instructorImage ? (
                                    <img
                                        src={lp.instructorImage}
                                        alt={lp.instructorName}
                                        className="absolute inset-0 w-full h-full object-cover object-center grayscale hover:grayscale-0 transition-all duration-1000"
                                    />
                                ) : (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <span className="text-8xl font-black text-white/10">{(lp.instructorName || 'W')[0]}</span>
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-transparent" />
                                <div className="absolute bottom-8 left-8">
                                    <div className="inline-block bg-wtech-red text-white text-[10px] font-black uppercase px-3 py-1 rounded-sm mb-2">Instrutor</div>
                                    <h3 className="text-4xl font-black uppercase text-white tracking-tighter">{lp.instructorName}</h3>
                                </div>
                            </div>
                            <div className="p-10 lg:p-20 flex flex-col justify-center">
                                <span className="text-wtech-red font-black uppercase tracking-[0.4em] text-xs mb-6">Responsável Técnico</span>
                                <h3 className="text-3xl md:text-4xl font-black uppercase text-white mb-6 leading-tight">
                                    Aprenda com quem <span className="text-gray-500">Desenvolve a Tecnologia</span>
                                </h3>
                                <div
                                    className="text-gray-400 text-lg leading-relaxed mb-8"
                                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(lp.instructorBio?.replace(/\n/g, '<br/>') || '') }}
                                />
                                <div className="grid grid-cols-2 gap-6">
                                    {['Metodologia Própria', 'Prática Real', 'Padrão Elite', 'Suporte Contínuo'].map((tag, i) => (
                                        <div key={i} className="flex items-center gap-3">
                                            <CheckCircle size={18} className="text-wtech-red" />
                                            <span className="text-[10px] font-black uppercase text-gray-500">{tag}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        ),

        testimonials: lp.testimonials && lp.testimonials.length > 0 ? (
            <section className="py-24 bg-[#080808] border-y border-white/5 relative overflow-hidden">
                <GridVignetteBackground className="opacity-30 pointer-events-none" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-wtech-red/5 blur-[120px] rounded-full pointer-events-none" />
                <div className="container mx-auto px-6 relative z-10">
                    <SectionHead kicker="Depoimentos Reais" sub="Quem viveu a experiência na pele conta o impacto técnico do método W-Tech.">
                        O que Dizem os <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">Nossos Alunos</span>
                    </SectionHead>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
                        {lp.testimonials.map((t, i) => {
                            const ytId = (t as any).videoUrl ? getYouTubeId((t as any).videoUrl) : '';
                            return (
                                <motion.div
                                    key={i}
                                    initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-40px' }} variants={fadeUp} custom={i % 3}
                                    className="bg-zinc-900/50 border border-white/5 rounded-3xl p-7 flex flex-col hover:border-wtech-gold/25 transition-all duration-500"
                                >
                                    {ytId && (
                                        <div
                                            className="relative aspect-video mb-5 rounded-2xl overflow-hidden cursor-pointer group border border-white/10"
                                            onClick={() => setActiveVideo(ytId)}
                                        >
                                            <img src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`} className="w-full h-full object-cover" alt={t.name} />
                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/20 transition-colors">
                                                <div className="w-14 h-14 bg-wtech-red text-white rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(230,36,29,0.6)] group-hover:scale-110 transition-transform">
                                                    <Play size={20} className="fill-white ml-0.5" />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    {t.text && <p className="text-gray-400 text-sm leading-relaxed flex-1 italic">"{t.text}"</p>}
                                    <div className="flex items-center gap-3 mt-6 pt-5 border-t border-white/5">
                                        <div className="w-10 h-10 rounded-full overflow-hidden bg-zinc-800 flex items-center justify-center shrink-0 border border-white/10">
                                            {t.image
                                                ? <img src={t.image} className="w-full h-full object-cover" alt={t.name} />
                                                : <span className="font-black text-white">{t.name[0]}</span>}
                                        </div>
                                        <div>
                                            <div className="font-black text-sm text-white uppercase">{t.name}</div>
                                            <div className="flex gap-0.5">{[...Array(5)].map((_, j) => <Star key={j} size={10} className="fill-wtech-gold text-wtech-gold" />)}</div>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            </section>
        ) : null,

        location: !isOnline && course?.city ? (
            <section className="py-24 relative bg-zinc-950 overflow-hidden">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-wtech-gold/30 to-transparent" />
                <div className="container mx-auto px-6 relative z-10">
                    <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
                        <div className="max-w-xl">
                            <span className="inline-block text-wtech-gold font-black uppercase tracking-[0.3em] text-xs mb-6">Local do Treinamento</span>
                            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter">Onde a Prática<br /> Acontece</h2>
                        </div>
                        <div className="pb-2">
                            <p className="text-sm font-bold uppercase tracking-widest bg-wtech-gold/10 border border-wtech-gold/20 px-4 py-2 rounded-full text-wtech-gold">
                                {course.city}{course.state ? ` · ${course.state}` : ''}
                            </p>
                        </div>
                    </div>

                    <div className="grid lg:grid-cols-2 gap-12">
                        <div className="bg-zinc-900 border border-white/5 rounded-3xl overflow-hidden p-8 md:p-12 relative group hover:border-wtech-gold/30 transition-all">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-wtech-gold/5 blur-[80px]" />
                            <div className="relative z-10">
                                <h3 className="text-2xl font-black uppercase text-white mb-6">{course.location || 'Estrutura Profissional'}</h3>
                                <p className="text-gray-400 mb-8 leading-relaxed">
                                    Ambiente profissional com equipamento real de oficina e a estrutura certa para a prática intensiva.
                                    A capacidade da turma é fechada — a estrutura do local define o número exato de vagas.
                                </p>
                                <div className="space-y-4 mb-10">
                                    <div className="flex items-center gap-4 text-gray-300">
                                        <div className="w-10 h-10 rounded-lg bg-wtech-gold/10 flex items-center justify-center text-wtech-gold"><MapPin size={20} /></div>
                                        <span className="text-sm font-bold">
                                            {course.address || 'Endereço confirmado na inscrição'}
                                            {course.addressNeighborhood ? ` — ${course.addressNeighborhood}` : ''}, {course.city}{course.state ? ` - ${course.state}` : ''}
                                        </span>
                                    </div>
                                </div>
                                <a
                                    id="lp-v9-map-link"
                                    href={course.mapUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`}
                                    target="_blank" rel="noreferrer"
                                    className="inline-flex items-center gap-3 bg-wtech-red hover:bg-white hover:text-wtech-red text-white px-8 py-4 rounded-xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl"
                                >
                                    Ver no Google Maps <Navigation size={16} />
                                </a>
                            </div>
                        </div>

                        <div className="aspect-video lg:aspect-auto lg:min-h-[380px] rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-zinc-900 group">
                            <iframe
                                className="w-full h-full opacity-80 group-hover:opacity-100 transition-opacity min-h-[320px]"
                                src={`https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                                title="Mapa do local"
                            />
                        </div>
                    </div>
                </div>
            </section>
        ) : null,

        faq: (
            <section className="py-24 bg-black border-t border-white/5">
                <div className="max-w-3xl mx-auto px-6">
                    <SectionHead kicker="Perguntas Frequentes">
                        Ficou Alguma <span className="text-gray-500">Dúvida?</span>
                    </SectionHead>
                    <div className="space-y-3">
                        {faqs.map((f, i) => (
                            <div key={i} className="border border-white/10 bg-zinc-900/50 rounded-xl overflow-hidden hover:border-wtech-gold/40 transition-colors">
                                <button
                                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                                    className="w-full flex items-center justify-between gap-4 p-6 text-left group"
                                >
                                    <span className="font-bold text-gray-200 text-sm md:text-base group-hover:text-white transition-colors">{f.q}</span>
                                    <ChevronDown size={20} className={`shrink-0 transition-transform ${openFaq === i ? 'rotate-180 text-wtech-gold' : 'text-gray-500'}`} />
                                </button>
                                {openFaq === i && (
                                    <div className="px-6 pb-6 text-gray-400 text-sm leading-relaxed">{f.a}</div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        ),
    };

    const orderedSections = resolveSectionOrder(lp.sectionOrder).filter(s => s.enabled);

    return (
        <div className="min-h-screen bg-[#050505] text-white selection:bg-wtech-red selection:text-white font-sans overflow-x-hidden">
            {lp.fakeAlertsEnabled && <FakeSignupAlert courseName={lp.title} />}

            {/* TOP BAR / URGÊNCIA */}
            <div className="bg-gradient-to-r from-wtech-red to-red-900 text-white text-[10px] md:text-xs font-black uppercase tracking-[0.3em] text-center py-2.5 px-4 sticky top-0 z-50 shadow-2xl">
                {isFullOrDone
                    ? `🔒 Turma esgotada — entre na lista de espera · ${cityLabel}`
                    : `🔥 Vagas limitadas: ${cityLabel} · ${dateLabel}`}
            </div>

            {/* NAV / LOGO */}
            <nav className="absolute top-12 left-0 w-full z-40">
                <div className="container mx-auto px-6 flex justify-between items-center">
                    {systemLogo
                        ? <img src={systemLogo} alt="W-Tech" className="h-8 md:h-12 object-contain" />
                        : <span className="font-black text-xl tracking-tighter uppercase">W-Tech<span className="text-wtech-gold">®</span></span>}
                    <button
                        onClick={scrollToForm}
                        className="hidden md:inline-flex bg-wtech-red hover:bg-white hover:text-black text-white px-6 py-2.5 font-black text-xs uppercase tracking-[0.2em] rounded-sm transition-colors"
                    >
                        {isFullOrDone ? 'Lista de Espera' : 'Garantir Vaga'}
                    </button>
                </div>
            </nav>

            {/* HERO */}
            <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 z-0 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/40 to-[#050505] z-10" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.05)_0%,transparent_80%)] z-10" />
                    {heroVideoId ? (
                        <iframe
                            src={`https://www.youtube.com/embed/${heroVideoId}?autoplay=1&mute=1&loop=1&controls=0&showinfo=0&rel=0&playlist=${heroVideoId}`}
                            className="w-full h-full object-cover scale-[1.35] brightness-[0.35] pointer-events-none"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            title="Vídeo de fundo"
                        />
                    ) : (
                        lp.heroImage && <img src={lp.heroImage} alt={lp.title} className="w-full h-full object-cover brightness-[0.35]" />
                    )}
                </div>

                <div className="container mx-auto px-6 relative z-20 text-center pt-24 pb-20">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                        className="inline-flex items-center gap-2 border border-wtech-gold/30 bg-wtech-gold/10 backdrop-blur-xl px-5 py-2 rounded-full mb-8 shadow-xl"
                    >
                        <Zap size={14} className="text-wtech-gold animate-pulse" />
                        <span className="text-[10px] md:text-sm font-black uppercase tracking-[0.3em] text-white">{cityLabel} | {dateLabel}</span>
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                        className="text-4xl md:text-7xl lg:text-8xl font-black uppercase tracking-tighter leading-[0.9] mb-8 max-w-5xl mx-auto"
                    >
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-100 to-gray-400 pb-2 inline-block">{lp.title}</span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
                        className="max-w-3xl mx-auto text-lg md:text-2xl text-gray-400 font-medium mb-12 leading-relaxed"
                    >
                        {lp.subtitle}
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.6 }}
                        className="flex flex-col sm:flex-row items-center justify-center gap-4"
                    >
                        <button
                            onClick={scrollToForm}
                            className="bg-wtech-red hover:bg-white hover:text-black text-white px-12 py-6 rounded-sm font-black text-lg md:text-xl uppercase tracking-widest transition-all hover:scale-105 flex items-center gap-4 group shadow-[0_0_50px_rgba(230,0,0,0.4)]"
                        >
                            {isFullOrDone ? 'Entrar na Lista de Espera' : 'Garantir Minha Vaga'}
                            <ArrowRight className="group-hover:translate-x-2 transition-transform" strokeWidth={3} />
                        </button>
                        <a
                            href="#conteudo"
                            className="border border-white/20 text-white px-8 py-6 rounded-sm font-bold text-sm uppercase tracking-widest transition-all flex items-center gap-2 hover:border-wtech-gold/60 hover:text-wtech-gold"
                        >
                            Ver o Conteúdo <ChevronDown size={16} />
                        </a>
                    </motion.div>
                </div>

                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 opacity-50">
                    <span className="text-[10px] font-black uppercase tracking-[0.4em]">Descobrir</span>
                    <div className="w-1 h-12 bg-gradient-to-b from-wtech-red to-transparent" />
                </div>
            </section>

            {/* TRUST BAR */}
            <section className="bg-black border-y border-white/5 py-12">
                <div className="container mx-auto px-6">
                    <div className="grid md:grid-cols-3 gap-8 text-center items-center">
                        <div className="flex flex-col items-center gap-2">
                            <Calendar className="text-wtech-red mb-2" size={32} />
                            <span className="text-2xl font-black uppercase tracking-tighter">
                                {immersionDays ? `${immersionDays} ${immersionDays === 1 ? 'Dia' : 'Dias'} de Imersão` : 'Imersão Intensiva'}
                            </span>
                            <span className="text-xs text-gray-500 uppercase font-bold tracking-widest">Teoria e Prática Intensiva</span>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                            {isOnline ? <Users className="text-wtech-red mb-2" size={32} /> : <MapPin className="text-wtech-red mb-2" size={32} />}
                            <span className="text-2xl font-black uppercase tracking-tighter">{isOnline ? '100% Online' : cityLabel}</span>
                            <span className="text-xs text-gray-500 uppercase font-bold tracking-widest">
                                {isOnline ? 'Assista de onde estiver' : (course?.location || 'Local confirmado na inscrição')}
                            </span>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                            <Award className="text-wtech-gold mb-2" size={32} />
                            <span className="text-2xl font-black uppercase tracking-tighter">Certificação W-Tech</span>
                            <span className="text-xs text-gray-500 uppercase font-bold tracking-widest">Reconhecimento Oficial</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* SEÇÕES REORDENÁVEIS — ordem e visibilidade definidas no editor */}
            {orderedSections.map(({ id }) => (
                <React.Fragment key={id}>{sectionRenderers[id] || null}</React.Fragment>
            ))}

            {/* FORM FINAL */}
            <section id="enroll-form" className="py-24 relative overflow-hidden">
                <div className="absolute inset-0 z-0">
                    {lp.heroImage && <img src={lp.heroImage} className="w-full h-full object-cover brightness-[0.2]" alt="" />}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/80 to-transparent" />
                </div>

                <div className="container mx-auto px-6 relative z-10">
                    <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-20 items-center">
                        <div>
                            <h2 className="text-5xl md:text-7xl font-black uppercase mb-8 tracking-tighter leading-[0.9]">
                                {isFullOrDone ? (
                                    <>Lista de<br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-wtech-red to-wtech-gold text-6xl md:text-8xl">Espera</span></>
                                ) : (
                                    <>Garanta<br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-wtech-red to-wtech-gold text-6xl md:text-8xl">Sua Vaga</span></>
                                )}
                            </h2>
                            <p className="text-gray-400 text-lg mb-10 leading-relaxed max-w-md">
                                {isFullOrDone
                                    ? 'Turma esgotada — cadastre-se e seja avisado primeiro sobre a próxima turma.'
                                    : `As vagas são extremamente limitadas${spotsLeft > 0 ? ` — restam apenas ${spotsLeft}` : ''}. Preencha seus dados e nossa equipe confirma tudo em minutos pelo WhatsApp.`}
                            </p>
                            <div className="space-y-4 mb-10">
                                <div className="flex items-center gap-4 bg-white/5 border border-white/10 p-4 rounded-xl">
                                    <ShieldCheck className="text-wtech-red" strokeWidth={3} />
                                    <span className="text-sm font-bold uppercase tracking-tight">Vagas Estritamente Limitadas</span>
                                </div>
                                <div className="flex items-center gap-4 bg-white/5 border border-white/10 p-4 rounded-xl">
                                    <Award className="text-wtech-gold" strokeWidth={3} />
                                    <span className="text-sm font-bold uppercase tracking-tight">Certificação Oficial W-Tech</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-[#0c0c0c]/90 backdrop-blur-3xl border border-white/10 p-8 md:p-12 rounded-[2rem] shadow-2xl relative overflow-hidden">
                            <LPEnrollForm
                                lp={lp} theme="dark" checkoutAtivo={checkoutAtivo} isFullOrDone={isFullOrDone}
                                form={form} setForm={setForm} paymentType={paymentType} setPaymentType={setPaymentType}
                                submitted={submitted} setSubmitted={setSubmitted} handleSubmit={handleSubmit}
                                whatsappGlobal={whatsappGlobal}
                            />
                        </div>
                    </div>

                    <div className="text-center mt-10">
                        <a
                            id="lp-v9-whatsapp-footer-link"
                            href={waLink} target="_blank" rel="noopener noreferrer"
                            className="text-gray-500 text-sm font-bold hover:text-white transition-colors"
                        >
                            Dúvidas? Fale com a equipe no WhatsApp →
                        </a>
                    </div>
                </div>
            </section>

            {/* FOOTER */}
            <footer className="py-16 bg-stone-950 border-t border-white/5">
                <div className="container mx-auto px-6 text-center">
                    {systemLogo && (
                        <img src={systemLogo} alt="W-Tech" className="h-10 mx-auto mb-10 opacity-30 grayscale hover:grayscale-0 hover:opacity-100 transition-all" />
                    )}
                    <p className="text-gray-600 text-[10px] font-black uppercase tracking-[0.5em] mb-4">W-Tech Brasil — {lp.title}</p>
                    <div className="flex justify-center gap-6">
                        <a href="/termos" className="text-gray-700 text-[10px] uppercase font-bold tracking-widest hover:text-white transition-colors">Termos</a>
                        <a href="/privacidade" className="text-gray-700 text-[10px] uppercase font-bold tracking-widest hover:text-white transition-colors">Privacidade</a>
                    </div>
                    <p className="text-gray-800 text-[10px] uppercase font-bold tracking-widest mt-4">
                        © {new Date().getFullYear()} Todos os direitos reservados ®
                    </p>
                </div>
            </footer>

            {/* FLOATING CTA MOBILE */}
            {showFloatingCTA && (
                <div className="fixed bottom-0 left-0 w-full z-40 bg-[#0c0c0c]/95 backdrop-blur-xl border-t border-white/10 py-3.5 px-5 md:hidden flex items-center justify-between gap-3">
                    <div className="text-sm font-black uppercase truncate">{lp.title}</div>
                    <button
                        onClick={scrollToForm}
                        className="bg-wtech-red text-white px-5 py-2.5 rounded-sm font-black text-xs uppercase tracking-[0.18em] shrink-0 shadow-[0_0_20px_rgba(230,0,0,0.4)]"
                    >
                        {isFullOrDone ? 'Lista' : 'Inscrever'}
                    </button>
                </div>
            )}

            {/* MODAL DE VÍDEO */}
            {activeVideo && (
                <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
                    <div className="absolute inset-0" onClick={() => setActiveVideo(null)} />
                    <div className="bg-black w-full max-w-4xl aspect-video relative z-10 rounded-2xl overflow-hidden border border-white/10">
                        <button
                            onClick={() => setActiveVideo(null)}
                            className="absolute -top-12 right-0 text-white hover:text-wtech-gold w-10 h-10 flex items-center justify-center"
                        >
                            <X size={24} />
                        </button>
                        <iframe
                            src={`https://www.youtube.com/embed/${activeVideo}?autoplay=1`}
                            className="w-full h-full"
                            title="Depoimento em vídeo"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default LandingPageViewerV9;
