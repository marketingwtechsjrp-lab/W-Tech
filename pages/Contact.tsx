import React, { useState } from 'react';
import { Mail, Phone, MapPin, Clock, Send, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { triggerWebhook } from '../lib/webhooks';
import { useSettings } from '../context/SettingsContext';
import SEO from '../components/SEO';

const Contact: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' });
    const { get } = useSettings();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const payload = {
                name: form.name,
                email: form.email,
                phone: form.phone,
                type: 'Contact_Form',
                status: 'New',
                context_id: form.message.slice(0, 50) + '...',
                tags: ['contact_page'],
                origin: window.location.href
            };

            // 1. Insert into CRM
            await supabase.from('SITE_Leads').insert([payload]);

            // 2. Trigger Webhook
            await triggerWebhook('webhook_lead', payload);

            setSubmitted(true);
            setForm({ name: '', email: '', phone: '', message: '' });
        } catch (error) {
            console.error(error);
            alert('Erro ao enviar. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    const address = get('address', 'Rua da Performance, 1234<br/>São Paulo, SP - Brasil');
    const phone = get('phone_main', '(11) 99999-9999');
    const email = get('email_contato', 'contato@w-techbrasil.com.br');
    const hours = get('working_hours', 'Seg a Sex: 08h às 18h');

    return (
        <div className="bg-white">
            <SEO
                title="Fale Conosco"
                description="Entre em contato com a W-Tech Brasil. Suporte técnico, dúvidas sobre cursos e parcerias comerciais."
                schema={{
                    "@context": "https://schema.org",
                    "@type": "ContactPage",
                    "mainEntity": {
                        "@type": "Organization",
                        "name": "W-TECH Brasil",
                        "contactPoint": {
                            "@type": "ContactPoint",
                            "telephone": "+55-11-99999-9999",
                            "contactType": "customer service",
                            "areaServed": "BR",
                            "availableLanguage": "Portuguese"
                        }
                    }
                }}
            />
            {/* Header */}
            <div className="bg-wtech-black text-white py-16 text-center">
                <h1 className="text-4xl font-bold mb-4">Entre em Contato</h1>
                <p className="text-gray-400">Estamos prontos para atender você e sua oficina.</p>
            </div>

            <div className="container mx-auto px-4 py-16 grid md:grid-cols-2 gap-16">
                {/* Info & Map */}
                <div className="space-y-8">
                    <div>
                        <h2 className="text-2xl font-bold text-wtech-black mb-6">Informações</h2>
                        <div className="space-y-4">
                            <div className="flex items-start gap-4">
                                <div className="bg-gray-100 p-3 rounded text-wtech-gold"><MapPin /></div>
                                <div>
                                    <p className="font-bold">Endereço</p>
                                    <p className="text-gray-600" dangerouslySetInnerHTML={{ __html: address.replace(/\n/g, '<br/>') }}></p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4">
                                <div className="bg-gray-100 p-3 rounded text-wtech-gold"><Phone /></div>
                                <div>
                                    <p className="font-bold">Telefone</p>
                                    <p className="text-gray-600">{phone}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4">
                                <div className="bg-gray-100 p-3 rounded text-wtech-gold"><Mail /></div>
                                <div>
                                    <p className="font-bold">E-mail</p>
                                    <p className="text-gray-600">{email}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4">
                                <div className="bg-gray-100 p-3 rounded text-wtech-gold"><Clock /></div>
                                <div>
                                    <p className="font-bold">Horário de Atendimento</p>
                                    <p className="text-gray-600">{hours}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="h-64 bg-gray-200 rounded-lg overflow-hidden border border-gray-300">
                        {/* Embedded Static Map or Frame */}
                        <iframe
                            width="100%"
                            height="100%"
                            frameBorder="0"
                            scrolling="no"
                            marginHeight={0}
                            marginWidth={0}
                            src="https://maps.google.com/maps?q=Autodromo+de+Interlagos&t=&z=13&ie=UTF8&iwloc=&output=embed"
                        ></iframe>
                    </div>
                </div>

                {/* Form */}
                <div className="bg-gray-50 p-8 rounded-xl shadow-sm border border-gray-100">
                    {submitted ? (
                        <div className="text-center py-12">
                            <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
                            <h3 className="text-2xl font-bold text-gray-800">Mensagem Enviada!</h3>
                            <p className="text-gray-500 mt-2">Nossa equipe entrará em contato em breve.</p>
                            <button
                                onClick={() => setSubmitted(false)}
                                className="mt-6 text-wtech-gold font-bold underline"
                            >
                                Enviar outra mensagem
                            </button>
                        </div>
                    ) : (
                        <>
                            <h2 className="text-2xl font-bold text-wtech-black mb-2">Envie uma mensagem</h2>
                            <p className="text-gray-500 mb-8">Preencha o formulário abaixo para dúvidas comerciais, suporte ou parcerias.</p>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Nome Completo</label>
                                    <input
                                        required
                                        type="text"
                                        className="w-full border border-gray-300 rounded p-3 focus:outline-none focus:border-wtech-gold"
                                        value={form.name}
                                        onChange={e => setForm({ ...form, name: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">E-mail</label>
                                        <input
                                            required
                                            type="email"
                                            className="w-full border border-gray-300 rounded p-3 focus:outline-none focus:border-wtech-gold"
                                            value={form.email}
                                            onChange={e => setForm({ ...form, email: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Telefone</label>
                                        <input
                                            required
                                            type="tel"
                                            className="w-full border border-gray-300 rounded p-3 focus:outline-none focus:border-wtech-gold"
                                            value={form.phone}
                                            onChange={e => setForm({ ...form, phone: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Assunto / Mensagem</label>
                                    <textarea
                                        required
                                        rows={4}
                                        className="w-full border border-gray-300 rounded p-3 focus:outline-none focus:border-wtech-gold"
                                        value={form.message}
                                        onChange={e => setForm({ ...form, message: e.target.value })}
                                    ></textarea>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-wtech-black text-white font-bold py-4 rounded hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
                                >
                                    {loading ? 'Enviando...' : <><Send size={18} /> ENVIAR MENSAGEM</>}
                                </button>
                            </form>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Contact;