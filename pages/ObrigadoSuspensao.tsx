import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Mail, ExternalLink, MessageCircle, Play, ShieldCheck } from 'lucide-react';

const ObrigadoSuspensao = () => {
  return (
    <div className="min-h-screen bg-[var(--admin-surface-2)] text-[var(--admin-text-primary)] flex flex-col font-sans">
      {/* Header */}
      <header className="p-6 border-b border-[var(--admin-border)] bg-[var(--admin-surface-1)]">
        <div className="container mx-auto flex justify-center">
          <img 
            src="https://w-techstore.com.br/wp-content/uploads/2025/11/logo-w-tech-branca.png" 
            alt="W-Tech" 
            className="h-10 md:h-12 object-contain"
          />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex items-center justify-center py-12 px-6">
        <div className="max-w-4xl w-full">
          <div className="text-center mb-12">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              className="inline-flex items-center justify-center w-20 h-20 md:w-24 md:h-24 rounded-full bg-emerald-500/10 text-emerald-500 mb-6"
            >
              <CheckCircle2 size={48} />
            </motion.div>
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-3xl md:text-6xl font-black uppercase mb-4 leading-tight"
            >
              Parabéns! <br />
              <span className="text-amber-500 italic">Sua vaga está garantida.</span>
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto"
            >
              Você acaba de dar o passo mais importante para dominar a regulagem de suspensão com o método do Alex Crepaldi.
            </motion.p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            {/* Video Box */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-[var(--admin-surface-1)] rounded-[2rem] border border-[var(--admin-border)] overflow-hidden relative aspect-video flex items-center justify-center group shadow-2xl"
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-10" />
              <div className="z-20 text-center">
                <div className="w-16 h-16 rounded-full bg-amber-500 text-black flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform cursor-pointer shadow-lg shadow-amber-500/40">
                  <Play fill="currentColor" size={32} className="ml-1" />
                </div>
                <p className="text-xs font-bold uppercase tracking-[0.3em] text-white">Assista ao recado do Alex</p>
              </div>
              <img 
                src="https://images.unsplash.com/photo-1558981403-c5f91cbba527?auto=format&fit=crop&q=80" 
                alt="Workshop Background" 
                className="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-30 transition-opacity"
              />
            </motion.div>

            {/* Steps Box */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-[var(--admin-surface-1)] rounded-[2rem] border border-[var(--admin-border)] p-8 md:p-10 shadow-2xl"
            >
              <h3 className="text-sm font-black uppercase tracking-[0.3em] text-amber-500 mb-8 border-b border-[var(--admin-border)] pb-4">Instruções de Acesso</h3>
              
              <div className="space-y-8">
                <div className="flex gap-5">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 border border-amber-500/20">
                    <Mail size={22} />
                  </div>
                  <div>
                    <h4 className="font-bold text-white uppercase text-xs tracking-widest mb-1">1. Cheque seu e-mail</h4>
                    <p className="text-gray-400 text-sm leading-relaxed">O Kiwify enviou os dados de acesso agora mesmo. Verifique também sua caixa de spam.</p>
                  </div>
                </div>

                <div className="flex gap-5">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 border border-amber-500/20">
                    <ExternalLink size={22} />
                  </div>
                  <div>
                    <h4 className="font-bold text-white uppercase text-xs tracking-widest mb-1">2. Área de Alunos</h4>
                    <p className="text-gray-400 text-sm leading-relaxed">Já pode começar a assistir aos primeiros módulos teóricos hoje mesmo.</p>
                  </div>
                </div>

                <div className="flex gap-5">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 border border-amber-500/20">
                    <MessageCircle size={22} />
                  </div>
                  <div>
                    <h4 className="font-bold text-white uppercase text-xs tracking-widest mb-1">3. Suporte VIP</h4>
                    <p className="text-gray-400 text-sm leading-relaxed">Qualquer dúvida técnica ou de acesso, nosso time está de prontidão no WhatsApp.</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex flex-col md:flex-row gap-4 justify-center items-center"
          >
            <a 
              href="https://dashboard.kiwify.com.br" 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-full md:w-auto px-10 py-6 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-600 text-black font-black uppercase tracking-widest text-center hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-amber-500/20 flex items-center justify-center gap-3"
            >
              Acessar Conteúdo
              <ExternalLink size={20} />
            </a>
            <a 
              href="https://wa.me/5517992451000" 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-full md:w-auto px-10 py-6 rounded-2xl bg-[var(--admin-surface-3)] border border-[var(--admin-border)] text-white font-black uppercase tracking-widest text-center hover:bg-white/10 transition-all flex items-center justify-center gap-3"
            >
              Falar com Suporte
              <MessageCircle size={20} />
            </a>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="mt-12 flex items-center justify-center gap-3 text-gray-500 text-[10px] font-black uppercase tracking-[0.3em]"
          >
            <ShieldCheck size={16} className="text-emerald-500" />
            Compra 100% segura e acesso imediato
          </motion.div>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-8 text-center text-gray-600 text-[10px] font-bold uppercase tracking-widest border-t border-[var(--admin-border)]">
        <p>© {new Date().getFullYear()} W-Tech • Alex Crepaldi • Todos os direitos reservados</p>
      </footer>
    </div>
  );
};

export default ObrigadoSuspensao;
