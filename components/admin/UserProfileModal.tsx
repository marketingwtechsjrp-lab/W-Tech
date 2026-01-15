import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Lock, Smartphone, Shield, Save, Loader2, CheckCircle, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import UserWhatsAppConnection from './WhatsApp/UserWhatsAppConnection';

interface UserProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose }) => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'profile' | 'whatsapp'>('profile');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        password: ''
    });

    useEffect(() => {
        if (user) {
            setFormData({
                name: user.name || '',
                email: user.email || '',
                phone: (user as any).phone || '',
                password: ''
            });
        }
    }, [user, isOpen]);

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        
        setLoading(true);
        setSuccess(false);

        try {
            // 1. Update Password if provided
            if (formData.password) {
                const { error: authError } = await supabase.auth.updateUser({ 
                    password: formData.password 
                });
                if (authError) throw authError;
            }

            // 2. Update Public Profile
            const { error: dbError } = await supabase
                .from('SITE_Users')
                .update({
                    name: formData.name,
                    phone: formData.phone
                })
                .eq('id', user.id);

            if (dbError) throw dbError;

            setSuccess(true);
            setTimeout(() => {
                setSuccess(false);
                // We don't necessarily want to close the modal or reload the whole page
                // But we should refresh user state if possible. 
                // Since useAuth might not auto-refresh SITE_Users data, a reload is safest for now
                // but let's try to just show success first.
            }, 3000);

        } catch (error: any) {
            alert('Erro ao atualizar perfil: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const getRoleName = () => {
        if (!user || !user.role) return 'Sem Cargo';
        if (typeof user.role === 'string') return user.role;
        return user.role.name;
    };

    const getRoleLevel = () => {
        if (!user || !user.role || typeof user.role === 'string') return null;
        return user.role.level;
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-2 sm:p-4 backdrop-blur-sm"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.95, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.95, y: 20 }}
                    onClick={e => e.stopPropagation()}
                    className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
                >
                    {/* Header */}
                    <div className="bg-wtech-black p-4 sm:p-8 text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-wtech-gold/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                        <div className="relative z-10 flex justify-between items-start">
                            <div className="flex items-center gap-3 sm:gap-6">
                                <div className="w-12 h-12 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl bg-gradient-to-br from-wtech-gold to-yellow-600 flex items-center justify-center text-black font-black text-lg sm:text-3xl shadow-xl shadow-wtech-gold/20 shrink-0">
                                    {formData.name.charAt(0) || user?.email?.charAt(0)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-lg sm:text-2xl font-black tracking-tight truncate">{formData.name || 'Meu Perfil'}</h3>
                                    <div className="flex flex-wrap items-center gap-2 mt-1">
                                        <span className="bg-wtech-gold text-black text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider whitespace-nowrap">
                                            {getRoleName()}
                                        </span>
                                        {getRoleLevel() && (
                                            <span className="text-gray-400 text-[10px] font-bold uppercase tracking-widest border border-white/20 px-2 py-0.5 rounded whitespace-nowrap">
                                                Nível {getRoleLevel()}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <button 
                                onClick={onClose}
                                className="p-1.5 sm:p-2 hover:bg-white/10 rounded-full transition-colors text-white/50 hover:text-white shrink-0"
                            >
                                <X size={20} className="sm:w-6 sm:h-6" />
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="flex gap-4 sm:gap-8 mt-4 sm:mt-8 border-b border-white/10 overflow-x-auto scrollbar-hide">
                            <button 
                                onClick={() => setActiveTab('profile')}
                                className={`pb-3 sm:pb-4 text-xs sm:text-sm font-bold uppercase tracking-widest transition-all relative whitespace-nowrap ${activeTab === 'profile' ? 'text-wtech-gold' : 'text-gray-400 hover:text-white'}`}
                            >
                                Dados Pessoais
                                {activeTab === 'profile' && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 w-full h-1 bg-wtech-gold" />}
                            </button>
                            <button 
                                onClick={() => setActiveTab('whatsapp')}
                                className={`pb-3 sm:pb-4 text-xs sm:text-sm font-bold uppercase tracking-widest transition-all relative whitespace-nowrap ${activeTab === 'whatsapp' ? 'text-wtech-gold' : 'text-gray-400 hover:text-white'}`}
                            >
                                Conexão WhatsApp
                                {activeTab === 'whatsapp' && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 w-full h-1 bg-wtech-gold" />}
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar">
                        {activeTab === 'profile' ? (
                            <form onSubmit={handleUpdateProfile} className="space-y-6 max-w-md mx-auto">
                                <div className="grid grid-cols-1 gap-6">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-wider">Nome Completo</label>
                                        <div className="relative">
                                            <User size={18} className="absolute left-4 top-3.5 text-gray-400" />
                                            <input 
                                                className="w-full border border-gray-200 bg-gray-50 rounded-xl pl-12 pr-4 py-3.5 text-sm font-bold focus:bg-white focus:border-wtech-gold transition-all outline-none"
                                                value={formData.name}
                                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                                placeholder="Seu nome..."
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-wider">E-mail de Acesso</label>
                                        <input 
                                            className="w-full border border-gray-100 bg-gray-50/50 rounded-xl px-4 py-3.5 text-sm font-medium text-gray-400 cursor-not-allowed"
                                            value={formData.email}
                                            readOnly
                                        />
                                        <p className="text-[10px] text-gray-400 mt-1.5 ml-1">O e-mail não pode ser alterado por motivos de segurança.</p>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-wider">Telefone / WhatsApp</label>
                                        <div className="relative">
                                            <Smartphone size={18} className="absolute left-4 top-3.5 text-gray-400" />
                                            <input 
                                                className="w-full border border-gray-200 bg-gray-50 rounded-xl pl-12 pr-4 py-3.5 text-sm font-bold focus:bg-white focus:border-wtech-gold transition-all outline-none"
                                                value={formData.phone}
                                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                                placeholder="(00) 00000-0000"
                                            />
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-gray-100 mt-2">
                                        <label className="block text-xs font-bold text-gray-900 uppercase mb-4 tracking-tighter flex items-center gap-2">
                                            <Lock size={14} /> Segurança
                                        </label>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-wider">Nova Senha</label>
                                            <input 
                                                type="password"
                                                className="w-full border border-gray-200 bg-gray-50 rounded-xl px-4 py-3.5 text-sm font-bold focus:bg-white focus:border-wtech-gold transition-all outline-none"
                                                value={formData.password}
                                                onChange={e => setFormData({ ...formData, password: e.target.value })}
                                                placeholder="••••••••"
                                            />
                                            <p className="text-[10px] text-gray-400 mt-1.5 ml-1">Deixe em branco para manter a senha atual.</p>
                                        </div>
                                    </div>
                                </div>

                                <button 
                                    type="submit"
                                    disabled={loading}
                                    className={`w-full py-4 rounded-xl font-black uppercase tracking-widest text-sm shadow-xl transition-all flex items-center justify-center gap-3 mt-8 ${
                                        success 
                                        ? 'bg-green-500 text-white' 
                                        : 'bg-wtech-gold text-black hover:brightness-110 hover:scale-[1.02] active:scale-95'
                                    }`}
                                >
                                    {loading ? (
                                        <><Loader2 size={20} className="animate-spin" /> Atualizando...</>
                                    ) : success ? (
                                        <><CheckCircle size={20} /> Perfil Atualizado!</>
                                    ) : (
                                        <><Save size={20} /> Salvar Alterações</>
                                    )}
                                </button>
                            </form>
                        ) : (
                            <div className="animate-in fade-in slide-in-from-bottom-4">
                                <UserWhatsAppConnection />
                            </div>
                        )}
                    </div>

                    <div className="bg-gray-50 p-4 text-center border-t border-gray-100">
                        <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">
                            W-TECH PLATFORM v2.0 • Sistema de Gestão de Leads & Automação
                        </p>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default UserProfileModal;
