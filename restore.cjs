const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, 'pages', 'LPErgonomia.tsx');
let originalLines = fs.readFileSync(targetFile, 'utf-8').split('\n');

// Keep everything up to the end of section "5 · INSTRUTORES"
let pivot = 0;
for (let i = 0; i < originalLines.length; i++) {
    if (originalLines[i].includes('6 · BENEFÍCIOS') || originalLines[i].includes('6 · O MENTOR')) {
        pivot = i;
        break;
    }
}

if (pivot === 0) {
    // maybe it got messed up and starts earlier, let's find the exact end of section 5:
    for (let i = originalLines.length - 1; i >= 0; i--) {
        if (originalLines[i].includes('A combinação perfeita para você')) {
            pivot = i + 5; // right after the end of the section 5 div
            break;
        }
    }
}

let topPart = originalLines.slice(0, pivot).join('\n');

// ADD CHEVRONRIGHT IMPORT IF NOT EXISTS
if (!topPart.includes('ChevronRight')) {
    topPart = topPart.replace('import {', 'import { ChevronRight,');
}

// ADD ANIMATEDSHADERBACKGROUND IMPORT IF NOT EXISTS
if (!topPart.includes('AnimatedShaderBackground')) {
    topPart = topPart.replace("import { GridVignetteBackground } from '../components/ui/vignette-grid-background';", "import { GridVignetteBackground } from '../components/ui/vignette-grid-background';\nimport AnimatedShaderBackground from '../components/ui/animated-shader-background';");
}


const blocks = `
            {/* ═══════════════════════════════════════════ */}
            {/* 6 · BENEFÍCIOS E RESULTADOS                */}
            {/* ═══════════════════════════════════════════ */}
            <section className="py-24 bg-[#050505] relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-wtech-gold/20 to-transparent" />
                <div className="absolute -left-[20%] top-[20%] w-[50%] h-[50%] bg-wtech-gold/5 blur-[120px] rounded-full z-0 pointer-events-none" />

                <div className="container mx-auto px-6 relative z-10">
                    <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }} variants={stagger} className="text-center mb-16">
                        <motion.span variants={v} className="text-wtech-gold font-black uppercase tracking-[0.3em] text-[10px] md:text-xs">Transformação Real</motion.span>
                        <motion.h2 variants={v} className="text-4xl md:text-6xl font-black uppercase mt-4 mb-6 tracking-tighter">
                            O Que Você Vai <span className="text-transparent bg-clip-text bg-gradient-to-r from-wtech-gold to-yellow-500">Conquistar</span>
                        </motion.h2>
                    </motion.div>

                    <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-40px' }} variants={stagger} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto mb-16">
                        {benefits.map((b, i) => (
                            <motion.div
                                key={i}
                                variants={v}
                                custom={i}
                                whileHover={shouldAnimate ? { y: -5, boxShadow: '0 15px 40px rgba(0,0,0,0.5)' } : undefined}
                                className="flex flex-col gap-4 p-6 bg-zinc-900/30 backdrop-blur-md border border-white/10 rounded-2xl transition-all cursor-default relative overflow-hidden group"
                            >
                                <div className="absolute right-0 top-0 w-24 h-24 bg-wtech-gold/5 rounded-full blur-[20px] group-hover:bg-wtech-gold/10 transition-colors" />
                                <div className="w-12 h-12 rounded-full bg-wtech-gold/10 flex items-center justify-center text-wtech-gold shrink-0 border border-wtech-gold/20">
                                    {b.icon}
                                </div>
                                <span className="font-bold text-sm md:text-base text-gray-200 leading-snug">{b.text}</span>
                            </motion.div>
                        ))}
                    </motion.div>

                    {/* Tags */}
                    <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="flex flex-wrap justify-center gap-3">
                        {['Motocross', 'Enduro', 'Street', 'Trail', 'Adventure'].map((tag, i) => (
                            <motion.span
                                key={i}
                                variants={v}
                                custom={i}
                                whileHover={shouldAnimate ? { scale: 1.08, backgroundColor: 'rgba(212,175,55,0.2)' } : undefined}
                                className="bg-zinc-900 border border-wtech-gold/20 text-gray-300 px-5 py-2 rounded-full text-xs font-black uppercase tracking-widest cursor-default transition-colors hover:text-white hover:border-wtech-gold"
                            >
                                {tag}
                            </motion.span>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════ */}
            {/* 7 · DEPOIMENTOS / PROVAS                   */}
            {/* ═══════════════════════════════════════════ */}
            <section className="py-24 bg-black">
                <div className="container mx-auto px-6">
                    <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }} variants={stagger} className="text-center mb-16">
                        <motion.span variants={v} className="text-wtech-gold font-black uppercase tracking-[0.3em] text-[10px] md:text-xs">Prova Social</motion.span>
                        <motion.h2 variants={v} className="text-4xl md:text-6xl font-black uppercase mt-4 tracking-tighter">
                            O Que Dizem <span className="text-wtech-gold">Nossos Alunos</span>
                        </motion.h2>
                    </motion.div>

                    {/* Stats */}
                    <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto mb-16">
                        {stats.map((s, i) => (
                            <motion.div
                                key={i}
                                variants={scaleIn}
                                whileHover={shouldAnimate ? { y: -4, boxShadow: '0 12px 32px rgba(0,0,0,0.3)' } : undefined}
                                className="text-center p-6 bg-zinc-900/50 border border-white/5 rounded-xl cursor-default"
                            >
                                <div className="text-3xl md:text-4xl font-black text-wtech-gold mb-1">{s.value}</div>
                                <div className="text-xs font-bold uppercase tracking-widest text-gray-500">{s.label}</div>
                            </motion.div>
                        ))}
                    </motion.div>

                    {/* Testimonials */}
                    <div className="w-full max-w-6xl mx-auto relative cursor-grab active:cursor-grabbing">
                        <Marquee speed={40} className="py-4">
                            {testimonials.map((t, i) => (
                                <div
                                    key={i}
                                    className="bg-zinc-900/40 backdrop-blur-sm border border-white/5 rounded-2xl p-8 relative w-[300px] md:w-[400px] shrink-0 hover:bg-zinc-800/50 transition-colors"
                                >
                                    <Quote size={32} className="text-wtech-gold/10 absolute top-6 right-6" />
                                    <div className="flex items-center gap-1 mb-4">
                                        {[...Array(5)].map((_, j) => (
                                            <Star key={j} size={14} className="text-wtech-gold fill-wtech-gold" />
                                        ))}
                                    </div>
                                    <p className="text-gray-300 text-sm leading-relaxed mb-6 italic whitespace-normal">"{t.text}"</p>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-wtech-gold/10 flex items-center justify-center text-wtech-gold font-black text-sm shrink-0">
                                            {t.name[0]}
                                        </div>
                                        <div className="whitespace-normal">
                                            <p className="font-bold text-white text-sm">{t.name}</p>
                                            <p className="text-gray-600 text-xs">{t.role}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </Marquee>
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════ */}
            {/* 8 · OFERTA IRRECUSÁVEL E CTA FINAL         */}
            {/* ═══════════════════════════════════════════ */}
            <section id="cta-final" className="py-24 md:py-32 relative overflow-hidden bg-black flex items-center justify-center min-h-[90vh]">
                <AnimatedShaderBackground />

                <div className="container mx-auto px-6 relative z-10 flex justify-center">
                    {/* Pricing Card - Reference Layout */}
                    <div className="w-full max-w-4xl bg-[#0a0a0a]/90 backdrop-blur-md border border-white/5 rounded-2xl relative shadow-2xl overflow-hidden p-8 md:p-14 text-center">
                        {/* Top Line */}
                        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-red-600 via-[#E6241D] to-orange-500" />

                        {/* Logo */}
                        <div className="flex justify-center mb-8">
                            <img src="http://w-techbrasil.com.br/wp-content/uploads/2026/02/logo-branca.png" alt="W-Tech Work Suspension" loading="lazy" className="h-10 md:h-12 object-contain" />
                        </div>

                        <span className="text-wtech-gold font-bold uppercase tracking-[0.2em] text-[10px] md:text-xs block mb-6">
                            Oferta Especial da Turma Atual
                        </span>

                        <h2 className="text-3xl md:text-5xl font-black text-white mb-10 tracking-tight">
                            Garanta Condições Especiais
                        </h2>

                        <div className="text-gray-500 font-bold uppercase text-[10px] md:text-xs tracking-[0.15em] mb-2 line-through decoration-red-500/50">
                            De R$ 697,00 por
                        </div>

                        <div className="mb-2">
                            <span className="text-5xl md:text-7xl font-black text-white tracking-tighter drop-shadow-lg">12x R$ 34,70</span>
                        </div>
                        <div className="text-wtech-red/90 font-bold text-sm md:text-base mb-12">
                            ou R$ 347,00 à vista no Pix/Cartão
                        </div>

                        {/* Timer Mockup */}
                        <div className="flex items-center justify-center gap-3 sm:gap-4 mb-10">
                            <div className="flex flex-col items-center">
                                <div className="bg-[#111] border border-white/10 rounded-xl w-14 h-14 sm:w-20 sm:h-20 flex items-center justify-center text-3xl font-black text-white shadow-inner">11</div>
                                <span className="text-[9px] sm:text-[10px] text-gray-500 uppercase tracking-widest mt-3">Horas</span>
                            </div>
                            <span className="text-2xl sm:text-3xl font-black text-gray-700 -mt-8">:</span>
                            <div className="flex flex-col items-center">
                                <div className="bg-[#111] border border-white/10 rounded-xl w-14 h-14 sm:w-20 sm:h-20 flex items-center justify-center text-3xl font-black text-white shadow-inner">58</div>
                                <span className="text-[9px] sm:text-[10px] text-gray-500 uppercase tracking-widest mt-3">Minutos</span>
                            </div>
                            <span className="text-2xl sm:text-3xl font-black text-gray-700 -mt-8">:</span>
                            <div className="flex flex-col items-center">
                                <div className="bg-[#111] border border-white/10 rounded-xl w-14 h-14 sm:w-20 sm:h-20 flex items-center justify-center text-3xl font-black text-white shadow-inner">55</div>
                                <span className="text-[9px] sm:text-[10px] text-gray-500 uppercase tracking-widest mt-3">Segundos</span>
                            </div>
                        </div>

                        <p className="text-gray-400 text-sm md:text-base mb-10 max-w-xl mx-auto leading-relaxed">
                            Enquanto esta página estiver no ar, você garante acesso imediato e vitalício com todos os bônus inclusos.
                        </p>

                        <div className="grid sm:grid-cols-2 gap-y-5 gap-x-2 max-w-2xl mx-auto mb-12 text-left">
                            <div className="flex items-center gap-3">
                                <CheckCircle size={16} className="text-[#E6241D] shrink-0" />
                                <span className="text-gray-300 text-xs sm:text-sm font-medium">Acesso Vitalício + Atualizações</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <CheckCircle size={16} className="text-[#E6241D] shrink-0" />
                                <span className="text-gray-300 text-xs sm:text-sm font-medium">Conteúdo 100% em Vídeo</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <CheckCircle size={16} className="text-[#E6241D] shrink-0" />
                                <span className="text-gray-300 text-xs sm:text-sm font-medium">Certificado de Conclusão W-Tech</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <CheckCircle size={16} className="text-[#E6241D] shrink-0" />
                                <span className="text-gray-300 text-xs sm:text-sm font-medium">Suporte Técnico Premium</span>
                            </div>
                        </div>

                        <motion.button
                            onClick={() => window.open('#', '_blank')}
                            whileHover={shouldAnimate ? { scale: 1.02, boxShadow: '0 0 40px rgba(230,36,29,0.3)' } : undefined}
                            whileTap={shouldAnimate ? { scale: 0.98 } : undefined}
                            className="w-full max-w-xl mx-auto bg-gradient-to-r from-[#ba1d18] to-[#E6241D] hover:from-[#d1221c] hover:to-[#ff2820] text-white px-8 py-5 sm:py-6 rounded-2xl font-black text-sm md:text-[15px] uppercase tracking-widest transition-all mb-8 shadow-xl"
                        >
                            Quero minha vaga com essas condições
                        </motion.button>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 mt-10 pt-8 border-t border-white/5">
                            <div className="flex items-center gap-2 text-gray-500 text-[11px] font-semibold uppercase tracking-wider">
                                <ShieldCheck size={16} className="text-gray-400" /> Garantia Incondicional de 7 Dias
                            </div>
                            <div className="flex items-center gap-3 text-gray-500 text-[11px] font-semibold uppercase tracking-wider">
                                <div className="flex -space-x-2">
                                    <div className="w-5 h-5 rounded-full bg-zinc-700 border border-[#0a0a0a]" />
                                    <div className="w-5 h-5 rounded-full bg-zinc-600 border border-[#0a0a0a]" />
                                    <div className="w-5 h-5 rounded-full bg-zinc-500 border border-[#0a0a0a]" />
                                </div>
                                Vagas sujeitas à disponibilidade
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════ */}
            {/* 9 · O MENTOR (ALEX CREPALDI)               */}
            {/* ═══════════════════════════════════════════ */}
            <section className="relative overflow-hidden bg-zinc-950 font-sans">
                {/* Background da Seção (Apenas Desktop) */}
                <div
                    className="hidden lg:block absolute inset-0 bg-cover bg-center bg-no-repeat z-0 scale-105"
                    style={{ backgroundImage: \`url('http://w-techbrasil.com.br/wp-content/uploads/2026/02/backgound-alex-crepaldi.png')\`, backgroundPosition: 'left center' }}
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-zinc-950/40 to-zinc-950 z-0" />
                </div>

                <div className="container mx-auto max-w-7xl pt-16 pb-0 lg:py-24 relative z-10 flex flex-col lg:flex-row lg:justify-end">

                    {/* Imagem Mobile (Escondida no Desktop) */}
                    <div className="lg:hidden w-full h-[400px] sm:h-[500px] relative -mx-0 mb-0 px-6">
                        <img src="http://w-techbrasil.com.br/wp-content/uploads/2026/02/backgound-alex-crepaldi.png" alt="Alex Crepaldi" loading="lazy" className="w-full h-full object-cover object-top rounded-t-3xl" />
                        <div className="absolute inset-x-6 bottom-0 top-1/2 bg-gradient-to-t from-zinc-950 to-transparent" />
                    </div>

                    {/* Content Card (Macedo Reference Layout) */}
                    <motion.div
                        initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
                        className="w-full lg:w-[50%] xl:w-[45%] bg-[#0B0B0C] lg:bg-zinc-950/80 backdrop-blur-sm lg:rounded-l-2xl border-t border-b lg:border-l border-white/5 px-8 pt-0 pb-16 lg:p-12 relative shadow-2xl overflow-hidden"
                    >
                        {/* Red Accent Line */}
                        <div className="absolute top-0 bottom-0 right-0 w-1.5 bg-[#E6241D] shadow-[-5px_0_20px_rgba(230,36,29,0.3)] z-20" />
                        
                        <motion.div variants={v} className="relative z-10">
                            <span className="text-gray-400 font-bold uppercase tracking-[0.2em] text-[10px] md:text-xs mb-2 block">
                                O Mentor
                            </span>
                            <h2 className="text-4xl sm:text-5xl md:text-6xl font-black uppercase mb-8 tracking-tighter leading-[0.9]">
                                <span className="text-white block">Alex</span>
                                <span className="text-[#E6241D] block">Crepaldi</span>
                            </h2>

                            <div className="space-y-6 text-gray-400 text-sm sm:text-base leading-relaxed mb-10">
                                <p>
                                    Reconhecido como uma das maiores autoridades brasileiras em mecânica e diagnóstico de <strong className="text-white">suspensões de alta performance</strong>, especialmente para a linha Off-Road e street.
                                </p>
                                <p>
                                    Mas sua maior conquista não foi apenas o conhecimento técnico, foi a criação da <strong className="text-white">W-Tech Brasil</strong>, onde aplica um método de imersão de excelência e formação presencial sem igual.
                                </p>
                                <p>
                                    Hoje, como instrutor e especialista, Alex usa o método que desenvolveu trabalhando nos bastidores das corridas para forjar mecânicos autônomos e pilotos que buscam a mais pura precisão.
                                </p>
                            </div>

                            <motion.div variants={stagger} className="space-y-4 mb-12">
                                {[
                                    { icon: <Wrench size={18} />, text: 'Especialista em Suspensões' },
                                    { icon: <Users size={18} />, text: 'Instrutor de +3.000 Alunos' },
                                    { icon: <ShieldCheck size={18} />, text: 'Consultor Técnico W-Tech' },
                                    { icon: <Star size={18} />, text: 'Referência Nacional em Customização' },
                                ].map((item, i) => (
                                    <motion.div variants={v} key={i} className="flex items-center gap-4">
                                        <div className="text-wtech-gold">{item.icon}</div>
                                        <span className="font-semibold text-gray-300 text-sm md:text-[15px]">{item.text}</span>
                                    </motion.div>
                                ))}
                            </motion.div>

                            <motion.a
                                variants={v}
                                href="#comprar"
                                className="inline-flex items-center gap-2 text-white font-black text-[11px] md:text-xs tracking-[0.15em] uppercase transition-colors group"
                            >
                                <span className="group-hover:text-wtech-red transition-colors duration-300">Conheça a história</span>
                                <ChevronRight size={14} className="group-hover:translate-x-1 group-hover:text-wtech-red transition-all duration-300" />
                            </motion.a>
                        </motion.div>
                    </motion.div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════ */}
            {/* 10 · FAQ                                     */}
            {/* ═══════════════════════════════════════════ */}
            <section className="py-24 bg-zinc-950 border-t border-white/5">
                <div className="container mx-auto px-6">
                    <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }} variants={stagger} className="text-center mb-16">
                        <motion.span variants={v} className="text-wtech-gold font-black uppercase tracking-[0.3em] text-[10px] md:text-xs">Dúvidas Frequentes</motion.span>
                        <motion.h2 variants={v} className="text-4xl md:text-6xl font-black uppercase mt-4 tracking-tighter">
                            Perguntas <span className="text-wtech-gold">Frequentes</span>
                        </motion.h2>
                    </motion.div>

                    <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-40px' }} variants={stagger} className="max-w-3xl mx-auto space-y-3">
                        {faqData.map((faq, i) => (
                            <motion.div key={i} variants={v} custom={i}>
                                <FAQItem q={faq.q} a={faq.a} />
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════ */}
            {/* FOOTER                                      */}
            {/* ═══════════════════════════════════════════ */}
            <footer className="py-12 bg-[#050505] text-white border-t border-white/5">
                <div className="container mx-auto px-6 text-center">
                    <motion.img
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 0.5 }}
                        viewport={{ once: true }}
                        whileHover={shouldAnimate ? { opacity: 1 } : undefined}
                        transition={{ duration: 0.2 }}
                        src="https://w-techstore.com.br/wp-content/uploads/2025/11/logo-w-tech-branca.png"
                        alt="W-Tech"
                        className="h-8 md:h-10 mx-auto mb-6"
                    />
                    <p className="text-gray-600 text-[10px] font-bold uppercase tracking-[0.4em] mb-2">W-Tech Brasil | Curso Online de Ergonomia</p>
                    <p className="text-gray-700 text-[10px] uppercase tracking-widest">
                        Todos os direitos reservados © {new Date().getFullYear()}
                    </p>
                </div>
            </footer>
        </div >
    );
};

export default LPErgonomia;
`;

fs.writeFileSync(targetFile, topPart + '\n' + blocks, 'utf-8');
console.log('Restored perfectly!');
