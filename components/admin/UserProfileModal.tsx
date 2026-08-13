import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Lock, Smartphone, Shield, Save, Loader2, CheckCircle, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import UserWhatsAppConnection from './WhatsApp/UserWhatsAppConnection';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { AvatarUploader } from '../ui/avatar-uploader';

interface UserProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose }) => {
    const { user, refreshUser } = useAuth();
    const [activeTab, setActiveTab] = useState<'profile' | 'whatsapp'>('profile');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        avatar_url: ''
    });

    const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [passwordLoading, setPasswordLoading] = useState(false);

    useEffect(() => {
        if (user) {
            setFormData({
                name: user.name || '',
                email: user.email || '',
                phone: user.phone || '',
                avatar_url: user.avatar_url || ''
            });
            setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        }
    }, [user, isOpen]);

    const handleAvatarUpload = async (file: File) => {
        if (!user) return { success: false };
        
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}-${Math.random().toString(36).substring(2)}.${fileExt}`;
            const filePath = `avatars/${fileName}`;

            // 1. Upload to Storage
            const { error: uploadError } = await supabase.storage
                .from('site-assets')
                .upload(filePath, file, { upsert: true });

            if (uploadError) throw uploadError;

            // 2. Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('site-assets')
                .getPublicUrl(filePath);

            // 3. Update User Record — via endpoint server-side (RPC
            // site_staff_perfil_definir), autoatendimento autorizado pela sessão.
            const profileRes = await fetch('/api/staff/profile', {
                method: 'POST',
                credentials: 'same-origin',
                cache: 'no-store',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ avatar_url: publicUrl }),
            });
            const profileData = await profileRes.json().catch(() => ({}));
            if (!profileRes.ok || profileData?.success === false) {
                throw new Error(profileData?.error || 'Falha ao salvar avatar.');
            }

            // Trigger global refresh
            await refreshUser();
            
            setFormData(prev => ({ ...prev, avatar_url: publicUrl }));
            alert('Foto de perfil atualizada!');
            return { success: true };
        } catch (error: any) {
            console.error('Error uploading avatar:', error);
            alert('Erro ao carregar imagem: ' + error.message);
            return { success: false };
        }
    };

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setLoading(true);
        setSuccess(false);

        try {
            // Update Public Profile — via endpoint server-side (RPC
            // site_staff_perfil_definir), autoatendimento autorizado pela sessão
            // httpOnly (nunca um update direto na tabela vindo do browser).
            const profileRes = await fetch('/api/staff/profile', {
                method: 'POST',
                credentials: 'same-origin',
                cache: 'no-store',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: formData.name, phone: formData.phone }),
            });
            const profileData = await profileRes.json().catch(() => ({}));
            if (!profileRes.ok || profileData?.success === false) {
                throw new Error(profileData?.error || 'Falha ao salvar perfil.');
            }

            // Trigger global refresh to update UI everywhere
            await refreshUser();

            setSuccess(true);
            setTimeout(() => {
                setSuccess(false);
            }, 3000);

        } catch (error: any) {
            console.error('Update Profile Error:', error);
            alert('Erro ao atualizar perfil: ' + (error.message || 'Erro desconhecido'));
        } finally {
            setLoading(false);
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        const { currentPassword, newPassword, confirmPassword } = passwordForm;
        if (!currentPassword || !newPassword) {
            alert('Preencha a senha atual e a nova senha.');
            return;
        }
        if (newPassword.length < 8) {
            alert('A nova senha deve ter pelo menos 8 caracteres.');
            return;
        }
        if (newPassword !== confirmPassword) {
            alert('A confirmação não bate com a nova senha.');
            return;
        }

        setPasswordLoading(true);
        try {
            const res = await fetch('/api/staff/password', {
                method: 'POST',
                credentials: 'same-origin',
                cache: 'no-store',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ currentPassword, newPassword }),
            });
            const data = await res.json().catch(() => ({}));

            if (!res.ok || data?.success !== true) {
                throw new Error(data?.error || 'Não foi possível trocar a senha.');
            }

            // Sucesso revoga TODAS as sessões (inclusive esta) — o servidor já
            // limpou o cookie. Precisa logar de novo.
            alert('Senha alterada com sucesso! Faça login novamente.');
            window.location.href = '/';
        } catch (error: any) {
            console.error('Change Password Error:', error);
            alert('Erro ao trocar senha: ' + (error.message || 'Erro desconhecido'));
        } finally {
            setPasswordLoading(false);
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
                    className="bg-[var(--admin-surface-1)] rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
                >
                    {/* Header */}
                    <div className="bg-wtech-black p-4 sm:p-8 text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-wtech-gold/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                        <div className="relative z-10 flex justify-between items-start">
                            <div className="flex items-center gap-3 sm:gap-6">
                                <AvatarUploader onUpload={handleAvatarUpload}>
                                    <div className="relative group cursor-pointer shadow-xl shadow-wtech-gold/10 rounded-2xl overflow-hidden ring-2 ring-wtech-gold/20 hover:ring-wtech-gold transition-all">
                                        <Avatar className="w-12 h-12 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl transition-transform group-hover:scale-110">
                                            <AvatarImage src={formData.avatar_url} />
                                            <AvatarFallback className="bg-gradient-to-br from-wtech-gold to-yellow-600 text-black font-black text-lg sm:text-3xl">
                                                {formData.name.charAt(0) || user?.email?.charAt(0)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                                            <RefreshCw size={24} className="animate-spin-slow" />
                                        </div>
                                    </div>
                                </AvatarUploader>
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
                            <div className="space-y-10 max-w-md mx-auto">
                            <form onSubmit={handleUpdateProfile} className="space-y-6">
                                <div className="grid grid-cols-1 gap-6">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-wider">Nome Completo</label>
                                        <div className="relative">
                                            <User size={18} className="absolute left-4 top-3.5 text-gray-400" />
                                            <input 
                                                className="w-full border border-[var(--admin-border)] bg-[var(--admin-surface-2)] rounded-xl pl-12 pr-4 py-3.5 text-sm font-bold focus:bg-[var(--admin-surface-1)] focus:border-wtech-gold transition-all outline-none"
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
                                                className="w-full border border-[var(--admin-border)] bg-[var(--admin-surface-2)] rounded-xl pl-12 pr-4 py-3.5 text-sm font-bold focus:bg-[var(--admin-surface-1)] focus:border-wtech-gold transition-all outline-none"
                                                value={formData.phone}
                                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                                placeholder="(00) 00000-0000"
                                            />
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

                            {/* Troca de senha — formulário separado (RPC self-service
                                site_staff_senha_trocar, exige senha atual + nova). */}
                            <form onSubmit={handleChangePassword} className="space-y-4 pt-6 border-t border-gray-100">
                                <label className="block text-xs font-bold text-gray-900 uppercase mb-2 tracking-tighter flex items-center gap-2">
                                    <Lock size={14} /> Trocar Senha
                                </label>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-wider">Senha Atual</label>
                                    <input
                                        type="password"
                                        className="w-full border border-[var(--admin-border)] bg-[var(--admin-surface-2)] rounded-xl px-4 py-3.5 text-sm font-bold focus:bg-[var(--admin-surface-1)] focus:border-wtech-gold transition-all outline-none"
                                        value={passwordForm.currentPassword}
                                        onChange={e => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                                        placeholder="••••••••"
                                        autoComplete="current-password"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-wider">Nova Senha</label>
                                    <input
                                        type="password"
                                        className="w-full border border-[var(--admin-border)] bg-[var(--admin-surface-2)] rounded-xl px-4 py-3.5 text-sm font-bold focus:bg-[var(--admin-surface-1)] focus:border-wtech-gold transition-all outline-none"
                                        value={passwordForm.newPassword}
                                        onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                                        placeholder="Mínimo 8 caracteres"
                                        autoComplete="new-password"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-wider">Confirmar Nova Senha</label>
                                    <input
                                        type="password"
                                        className="w-full border border-[var(--admin-border)] bg-[var(--admin-surface-2)] rounded-xl px-4 py-3.5 text-sm font-bold focus:bg-[var(--admin-surface-1)] focus:border-wtech-gold transition-all outline-none"
                                        value={passwordForm.confirmPassword}
                                        onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                                        placeholder="••••••••"
                                        autoComplete="new-password"
                                    />
                                    <p className="text-[10px] text-gray-400 mt-1.5 ml-1">Ao trocar, todas as suas sessões são encerradas — você vai precisar entrar de novo.</p>
                                </div>
                                <button
                                    type="submit"
                                    disabled={passwordLoading}
                                    className="w-full py-4 rounded-xl font-black uppercase tracking-widest text-sm shadow-xl transition-all flex items-center justify-center gap-3 bg-gray-900 text-white hover:brightness-110 hover:scale-[1.02] active:scale-95"
                                >
                                    {passwordLoading ? (
                                        <><Loader2 size={20} className="animate-spin" /> Trocando...</>
                                    ) : (
                                        <><Lock size={20} /> Trocar Senha</>
                                    )}
                                </button>
                            </form>
                            </div>
                        ) : (
                            <div className="animate-in fade-in slide-in-from-bottom-4">
                                <UserWhatsAppConnection />
                            </div>
                        )}
                    </div>

                    <div className="bg-gray-50 p-4 text-center border-t border-gray-100">
                        <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">
                            W-TECH PLATFORM v3.0.2 • Sistema de Gestão de Leads & Automação
                        </p>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default UserProfileModal;
