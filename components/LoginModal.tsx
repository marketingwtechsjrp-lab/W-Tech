import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lock, Mail, Loader2, ArrowRight, Database } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ASSETS } from '../constants';
import { seedDatabase } from '../lib/seedData';
import { useNavigate } from 'react-router-dom';

const LoginModal: React.FC = () => {
  const { showLoginModal, setShowLoginModal, login } = useAuth();
  const [email, setEmail] = useState('admin@w-tech.com');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    const result = await login(email, password);
    if (!result.success) {
      setError(result.error || 'Erro ao entrar.');
    } else {
        // Auto Redirect on Success
        navigate('/admin');
    }
    setIsSubmitting(false);
  };

  const handleSeed = async () => {
    setIsSeeding(true);
    setError('');
    try {
        const msg = await seedDatabase();
        alert(msg + '\n\nLogin: admin@w-tech.com\nSenha: 123');
    } catch (e: any) {
        console.error("Seed Error caught in UI:", e);
        setError(`Erro ao gerar dados: ${e}`);
    } finally {
        setIsSeeding(false);
    }
  };

  return (
    <AnimatePresence>
      {showLoginModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          {/* Backdrop with Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowLoginModal(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-md bg-white/10 border border-white/20 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden"
            style={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-wtech-gold to-transparent"></div>
            
            <button 
              onClick={() => setShowLoginModal(false)}
              className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>

            <div className="p-8 md:p-10">
              <div className="text-center mb-8">
                <img src={ASSETS.LOGO_URL} alt="W-TECH" className="h-12 mx-auto mb-6 brightness-0 invert opacity-90" />
                <h2 className="text-2xl font-bold text-white mb-2">Bem-vindo de volta</h2>
                <p className="text-white/60 text-sm">Acesse o painel administrativo para gerenciar o portal.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-wtech-gold uppercase tracking-wider ml-1">E-mail</label>
                  <div className="relative group">
                    <Mail className="absolute left-3 top-3 text-white/40 group-focus-within:text-wtech-gold transition-colors" size={20} />
                    <input 
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-black/20 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white placeholder-white/30 focus:outline-none focus:border-wtech-gold/50 transition-all"
                      placeholder="admin@w-tech.com"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-wtech-gold uppercase tracking-wider ml-1">Senha</label>
                  <div className="relative group">
                    <Lock className="absolute left-3 top-3 text-white/40 group-focus-within:text-wtech-gold transition-colors" size={20} />
                    <input 
                      type="password" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-black/20 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white placeholder-white/30 focus:outline-none focus:border-wtech-gold/50 transition-all"
                      placeholder="••••••"
                    />
                  </div>
                </div>

                {error && (
                  <div className="bg-red-500/20 border border-red-500/50 text-red-200 text-xs p-3 rounded-lg text-center break-words">
                    {error}
                  </div>
                )}

                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full bg-wtech-gold text-black font-bold py-3 rounded-lg hover:bg-white transition-all flex items-center justify-center gap-2 group"
                >
                  {isSubmitting ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : (
                    <>
                      ACESSAR SISTEMA <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-white/40 text-xs">
                  Ainda não tem acesso? <a href="#" className="text-wtech-gold hover:underline">Solicite ao administrador.</a>
                </p>
                <div className="mt-4 pt-4 border-t border-white/10">
                    <button 
                        onClick={handleSeed}
                        disabled={isSeeding}
                        className="text-[10px] text-white/40 hover:text-wtech-gold flex items-center justify-center gap-1 mx-auto transition-colors"
                    >
                        {isSeeding ? <Loader2 size={10} className="animate-spin"/> : <Database size={10} />}
                        Primeiro Acesso? Gerar Admin de Teste
                    </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default LoginModal;