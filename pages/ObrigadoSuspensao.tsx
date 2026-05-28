import React from 'react';
import { motion } from 'framer-motion';
import { 
    CheckCircle2, 
    Mail, 
    ExternalLink, 
    MessageCircle, 
    ShieldCheck, 
    Sparkles, 
    ArrowRight,
    Play,
    Users
} from 'lucide-react';

const ObrigadoSuspensao: React.FC = () => {
    const whatsappGroupLink = 'https://chat.whatsapp.com/BBB7IXWMr2r8H6rQ7T5qNy';
    const kiwifyMembersLink = 'https://cursos.w-techbrasil.com.br/';

    return (
        <div className="min-h-screen bg-[#050505] text-white flex flex-col font-sans relative overflow-hidden">
            {/* Ambient Background Glows */}
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#E6241D]/10 rounded-full blur-[150px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#d4af37]/10 rounded-full blur-[150px] pointer-events-none" />
            
            {/* Header */}
            <header className="p-6 border-b border-white/5 bg-black/40 backdrop-blur-md relative z-10">
                <div className="container mx-auto flex justify-center">
                    <img 
                        src="https://w-techstore.com.br/wp-content/uploads/2025/11/logo-w-tech-branca.png" 
                        alt="W-Tech" 
                        className="h-10 md:h-12 object-contain"
                    />
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-grow flex items-center justify-center py-16 px-6 relative z-10">
                <div className="max-w-4xl w-full">
                    {/* Celebration Header */}
                    <div className="text-center mb-14">
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 200, damping: 20 }}
                            className="inline-flex items-center justify-center w-20 h-20 md:w-24 md:h-24 rounded-full bg-emerald-500/10 text-emerald-500 mb-6 border border-emerald-500/20 relative shadow-[0_0_30px_rgba(16,185,129,0.1)]"
                        >
                            <CheckCircle2 size={48} className="relative z-10" />
                            <motion.div 
                                animate={{ scale: [1, 1.2, 1] }}
                                transition={{ repeat: Infinity, duration: 2 }}
                                className="absolute inset-0 rounded-full bg-emerald-500/5"
                            />
                        </motion.div>
                        
                        <motion.span 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-amber-500 text-xs font-black tracking-[0.3em] uppercase block mb-3"
                        >
                            Inscrição Confirmada com Sucesso!
                        </motion.span>
                        
                        <motion.h1 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="text-4xl md:text-7xl font-black uppercase mb-6 leading-none tracking-tighter"
                        >
                            Parabéns! <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-wtech-gold via-yellow-400 to-amber-500 italic drop-shadow-[0_2px_10px_rgba(212,175,55,0.2)]">
                                Sua Vaga está Garantida.
                            </span>
                        </motion.h1>
                        
                        <motion.p 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="text-gray-400 text-base md:text-lg max-w-2xl mx-auto leading-relaxed"
                        >
                            Você acaba de dar o passo definitivo para dominar a regulagem de suspensão off-road com o método profissional de Alex Crepaldi.
                        </motion.p>
                    </div>

                    <div className="max-w-2xl mx-auto mb-12">
                        {/* Step By Step Instructions Card */}
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="bg-zinc-950/40 rounded-[2rem] border border-white/5 p-8 md:p-10 shadow-2xl relative overflow-hidden backdrop-blur-md"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
                            <h3 className="text-xs font-black uppercase tracking-[0.25em] text-amber-500 mb-8 border-b border-white/5 pb-4 flex items-center gap-2">
                                <Sparkles size={14} /> Próximos Passos
                            </h3>
                            
                            <div className="space-y-8">
                                <div className="flex gap-5">
                                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 border border-amber-500/20 shadow-[0_0_15px_rgba(212,175,55,0.1)]">
                                        <Mail size={20} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-white uppercase text-xs tracking-widest mb-1">1. Cheque seu E-mail</h4>
                                        <p className="text-gray-400 text-xs leading-relaxed">A Kiwify enviou os dados de acesso da nossa área de membros para o e-mail cadastrado na compra.</p>
                                    </div>
                                </div>

                                <div className="flex gap-5">
                                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 border border-amber-500/20 shadow-[0_0_15px_rgba(212,175,55,0.1)]">
                                        <Users size={20} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-white uppercase text-xs tracking-widest mb-1">2. Entre no Grupo VIP</h4>
                                        <p className="text-gray-400 text-xs leading-relaxed">Clique no botão abaixo para entrar no grupo de WhatsApp onde enviamos novidades, planilhas e suporte.</p>
                                    </div>
                                </div>

                                <div className="flex gap-5">
                                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 border border-amber-500/20 shadow-[0_0_15px_rgba(212,175,55,0.1)]">
                                        <ShieldCheck size={20} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-white uppercase text-xs tracking-widest mb-1">3. Conecte-se e Evolua</h4>
                                        <p className="text-gray-400 text-xs leading-relaxed">Aproveite as primeiras aulas teóricas e use as tabelas para iniciar a regulagem da sua suspensão.</p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    {/* Premium Call to Action Buttons */}
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="flex flex-col sm:flex-row gap-5 justify-center items-center"
                    >
                        {/* Primary Button - WhatsApp VIP Group */}
                        <a 
                            href={whatsappGroupLink} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="group relative w-full sm:w-auto px-10 py-5 rounded-2xl bg-gradient-to-r from-emerald-600 to-green-500 text-white font-black uppercase tracking-widest text-[13px] text-center hover:scale-[1.03] active:scale-95 transition-all shadow-[0_0_35px_rgba(16,185,129,0.25)] flex items-center justify-center gap-3 overflow-hidden"
                        >
                            <MessageCircle size={20} className="group-hover:animate-bounce" />
                            Entrar no Grupo de Alunos
                            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                            <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                        </a>

                        {/* Secondary Button - Kiwify Area Access */}
                        <a 
                            href={kiwifyMembersLink} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="group w-full sm:w-auto px-10 py-5 rounded-2xl bg-transparent border-2 border-amber-500/50 hover:border-amber-500 text-white font-black uppercase tracking-widest text-[13px] text-center hover:scale-[1.03] active:scale-95 transition-all flex items-center justify-center gap-3 backdrop-blur-sm shadow-[0_0_20px_rgba(212,175,55,0.05)]"
                        >
                            <ExternalLink size={20} className="group-hover:rotate-12 transition-transform" />
                            Acessar Área de Membros
                        </a>
                    </motion.div>

                    {/* Security Badge */}
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.7 }}
                        className="mt-14 flex items-center justify-center gap-3 text-gray-500 text-[10px] font-black uppercase tracking-[0.3em]"
                    >
                        <ShieldCheck size={16} className="text-emerald-500" />
                        Compra processada com segurança via Kiwify
                    </motion.div>
                </div>
            </main>

            {/* Footer */}
            <footer className="p-8 text-center text-gray-600 text-[10px] font-bold uppercase tracking-widest border-t border-white/5 relative z-10">
                <p>© {new Date().getFullYear()} W-Tech • Alex Crepaldi • Todos os direitos reservados</p>
            </footer>
        </div>
    );
};

export default ObrigadoSuspensao;
