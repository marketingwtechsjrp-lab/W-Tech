import React, { useState, useEffect } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { triggerWebhook } from '../lib/webhooks';
import { distributeLead } from '../lib/leadDistribution';
import { useLocation } from 'react-router-dom';

export const WhatsAppInterceptor = () => {
    const [config, setConfig] = useState<any>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [form, setForm] = useState({ name: '', email: '', phone: '' });
    const [loading, setLoading] = useState(false);
    const location = useLocation();

    useEffect(() => {
        const fetchConfig = async () => {
            const { data } = await supabase.from('SITE_SystemSettings').select('*');
            if(data) {
                const map: any = {};
                data.forEach((item: any) => map[item.key] = item.value);
                setConfig(map);
            }
        };
        fetchConfig();
    }, []);

    // Only show on Home Page
    if (location.pathname !== '/') return null;

    if (!config || !config.whatsapp_enabled || !config.whatsapp_phone) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        
        try {
            const assignedTo = await distributeLead();
            const payload = {
                name: form.name,
                email: form.email || null, // Allow optional email
                phone: form.phone,
                type: 'WhatsApp_Contact',
                status: 'New',
                context_id: 'WhatsApp Home Button',
                tags: ['home_whatsapp', 'whatsapp_click'],
                assigned_to: assignedTo,
                origin: window.location.href
            };

            await supabase.from('SITE_Leads').insert([payload]);
            await triggerWebhook('webhook_lead', payload);

            // Redirect
            const cleanPhone = config.whatsapp_phone.replace(/\D/g, '');
            const msg = `Olá, me chamo ${form.name}. Gostaria de mais informações.`;
            window.location.href = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
        } catch (err) {
            alert('Erro ao redirecionar. Tente novamente.');
            setLoading(false);
        }
    };

    return (
        <>
            {/* Floating Button (Left-Aligned) */}
            {!isOpen && (
                <button 
                    onClick={() => setIsOpen(true)}
                    className="fixed bottom-6 left-6 z-50 bg-green-500 hover:bg-green-600 text-white p-4 rounded-full shadow-2xl animate-bounce-custom flex items-center justify-center transition-all hover:scale-110"
                >
                    <MessageCircle size={32} fill="white" />
                </button>
            )}

            {/* Modal Form */}
            {isOpen && (
                <div className="fixed inset-0 bg-black/60 z-[100] flex items-end md:items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden relative">
                        <button onClick={() => setIsOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-black">
                            <X size={20}/>
                        </button>
                        
                        <div className="bg-[#075e54] p-6 text-white text-center">
                            <MessageCircle size={48} className="mx-auto mb-2" strokeWidth={1.5} />
                            <h3 className="font-bold text-xl">Falar no WhatsApp</h3>
                            <p className="text-white/80 text-sm">Preencha para iniciar o atendimento.</p>
                        </div>
                        
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome</label>
                                <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full bg-gray-50 border border-gray-200 p-3 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-gray-900" placeholder="Seu nome" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Telefone / Whats</label>
                                <input required value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full bg-gray-50 border border-gray-200 p-3 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-gray-900" placeholder="(xx) xxxxx-xxxx" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email (Opcional)</label>
                                <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full bg-gray-50 border border-gray-200 p-3 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-gray-900" placeholder="seu@email.com" />
                            </div>

                            <button disabled={loading} className="w-full bg-[#25d366] text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-[#128c7e] transition-colors shadow-lg mt-2">
                                {loading ? 'Carregando...' : 'Iniciar Conversa'} <Send size={18} />
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
};
