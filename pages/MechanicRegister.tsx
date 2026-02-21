import React, { useState } from 'react';
import { Check, Upload, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';

const MechanicRegister: React.FC = () => {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        workshopName: '',
        cnpj: '',
        address: '',
        city: '',
        state: '',
        specialties: [] as string[],
        experienceYears: '',
        certifications: ''
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSpecialtyChange = (spec: string) => {
        if (formData.specialties.includes(spec)) {
            setFormData({ ...formData, specialties: formData.specialties.filter(s => s !== spec) });
        } else {
            setFormData({ ...formData, specialties: [...formData.specialties, spec] });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // 1. Create User Auth (Optional - usually they register first, but let's assume this is a lead form)
            // For this flow, we will just insert into Mechanics table as "Pending"

            const { error: insertError } = await supabase.from('SITE_Mechanics').insert([{
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                workshop_name: formData.workshopName,
                city: formData.city,
                state: formData.state,
                specialty: formData.specialties,
                status: 'Pending',
                // Add other fields as JSON or separate columns if schema allows
            }]);

            if (insertError) throw insertError;

            setSubmitted(true);
        } catch (err: any) {
            console.error(err);
            setError('Erro ao enviar cadastro. Verifique os dados e tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    if (submitted) {
        return (
            <div className="container mx-auto px-4 py-20 text-center max-w-lg">
                <SEO title="Cadastro Enviado" noindex={true} />
                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Check size={40} />
                </div>
                <h1 className="text-3xl font-bold text-wtech-black mb-4">Cadastro Enviado!</h1>
                <p className="text-gray-600 mb-8">
                    Recebemos sua solicitação para ser um parceiro Credenciado W-TECH. Nossa equipe analisará seus dados e entrará em contato em breve.
                </p>
                <Link to="/" className="bg-wtech-gold text-black font-bold py-3 px-8 rounded hover:bg-yellow-500 transition-colors">
                    Voltar para Home
                </Link>
            </div>
        );
    }

    return (
        <div className="bg-wtech-dark min-h-screen py-12 selection:bg-wtech-red selection:text-white">
            <SEO
                title="Seja um Credenciado | W-TECH Network"
                description="Junte-se à elite da reparação automotiva. Seja um centro de serviço credenciado W-Tech Brasil."
            />
            <div className="container mx-auto px-4 max-w-4xl relative">
                {/* Decorative background accent */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-wtech-red/5 blur-3xl rounded-full pointer-events-none"></div>

                <div className="text-center mb-12 relative z-10">
                    <span className="text-wtech-red font-black uppercase tracking-[0.3em] text-[10px] mb-4 block">Parceria Estratégica</span>
                    <h1 className="text-5xl md:text-7xl font-display font-black text-white uppercase tracking-tighter mb-4">SEJA UM <span className="text-wtech-red">CREDENCIADO</span></h1>
                    <p className="text-gray-400 font-medium text-lg max-w-2xl mx-auto">
                        Eleve o padrão da sua oficina. Tenha acesso a suporte técnico vitalício, ferramentas exclusivas e a bandeira da maior autoridade em suspensões do Brasil.
                    </p>
                </div>

                <div className="bg-[#0a0a0a] rounded-3xl shadow-2xl overflow-hidden border border-white/5 relative z-10">
                    {/* Progress Bar */}
                    <div className="bg-white/5 h-1 w-full">
                        <div
                            className="bg-wtech-red h-full transition-all duration-700 ease-out shadow-[0_0_15px_rgba(230,0,0,0.5)]"
                            style={{ width: `${(step / 3) * 100}%` }}
                        ></div>
                    </div>

                    <form onSubmit={handleSubmit} className="p-8 md:p-16">
                        {error && (
                            <div className="bg-red-50 text-red-600 p-4 rounded mb-6 flex items-center gap-2">
                                <AlertCircle size={20} /> {error}
                            </div>
                        )}

                        {step === 1 && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-10 duration-500">
                                <h2 className="text-2xl font-display font-black text-white uppercase tracking-wider border-b border-white/10 pb-4 mb-8">1. Dados Pessoais</h2>
                                <div className="grid md:grid-cols-2 gap-8">
                                    <div>
                                        <label className="block text-[10px] font-black text-wtech-red uppercase tracking-[0.2em] mb-3">Nome Completo</label>
                                        <input required name="name" value={formData.name} onChange={handleChange} type="text" className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:border-wtech-red focus:bg-white/10 outline-none transition-all" placeholder="Seu nome" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-wtech-red uppercase tracking-[0.2em] mb-3">E-mail Profissional</label>
                                        <input required name="email" value={formData.email} onChange={handleChange} type="email" className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:border-wtech-red focus:bg-white/10 outline-none transition-all" placeholder="email@exemplo.com" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px) font-black text-wtech-red uppercase tracking-[0.2em] mb-3">WhatsApp / Celular</label>
                                        <input required name="phone" value={formData.phone} onChange={handleChange} type="tel" className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:border-wtech-red focus:bg-white/10 outline-none transition-all" placeholder="(00) 00000-0000" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-wtech-red uppercase tracking-[0.2em] mb-3">Anos de Atuação</label>
                                        <input name="experienceYears" value={formData.experienceYears} onChange={handleChange} type="number" className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:border-wtech-red focus:bg-white/10 outline-none transition-all" placeholder="Ex: 5" />
                                    </div>
                                </div>
                                <div className="flex justify-end pt-8">
                                    <button type="button" onClick={() => setStep(2)} className="bg-wtech-red text-white px-10 py-4 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-white hover:text-black transition-all transform hover:scale-[1.02]">Próximo Passo</button>
                                </div>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-10 duration-500">
                                <h2 className="text-2xl font-display font-black text-white uppercase tracking-wider border-b border-white/10 pb-4 mb-8">2. Dados da Oficina</h2>
                                <div className="grid md:grid-cols-2 gap-8">
                                    <div className="md:col-span-2">
                                        <label className="block text-[10px] font-black text-wtech-red uppercase tracking-[0.2em] mb-3">Nome da Oficina / Centro de Estética</label>
                                        <input required name="workshopName" value={formData.workshopName} onChange={handleChange} type="text" className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:border-wtech-red focus:bg-white/10 outline-none transition-all" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-wtech-red uppercase tracking-[0.2em] mb-3">CNPJ / CPF</label>
                                        <input name="cnpj" value={formData.cnpj} onChange={handleChange} type="text" className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:border-wtech-red focus:bg-white/10 outline-none transition-all" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-wtech-red uppercase tracking-[0.2em] mb-3">Cidade</label>
                                        <input required name="city" value={formData.city} onChange={handleChange} type="text" className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:border-wtech-red focus:bg-white/10 outline-none transition-all" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-wtech-red uppercase tracking-[0.2em] mb-3">Estado (UF)</label>
                                        <input required name="state" value={formData.state} onChange={handleChange} type="text" maxLength={2} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:border-wtech-red focus:bg-white/10 outline-none transition-all uppercase" />
                                    </div>
                                </div>
                                <div className="flex justify-between pt-8">
                                    <button type="button" onClick={() => setStep(1)} className="text-gray-500 font-black uppercase tracking-widest text-[10px] hover:text-white transition-colors">← Voltar</button>
                                    <button type="button" onClick={() => setStep(3)} className="bg-wtech-red text-white px-10 py-4 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-white hover:text-black transition-all transform hover:scale-[1.02]">Próximo Passo</button>
                                </div>
                            </div>
                        )}

                        {step === 3 && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-10 duration-500">
                                <h2 className="text-2xl font-display font-black text-white uppercase tracking-wider border-b border-white/10 pb-4 mb-8">3. Especialidades</h2>

                                <div>
                                    <label className="block text-[10px] font-black text-wtech-red uppercase tracking-[0.2em] mb-4">Selecione suas áreas de atuação:</label>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                        {['Suspensão Off-Road', 'Suspensão Street', 'Preparação Racing', 'Injeção Eletrônica', 'Motor de Alta Performance', 'Câmbio', 'Freios', 'Elétrica', 'Usinagem'].map(spec => (
                                            <label key={spec} className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${formData.specialties.includes(spec) ? 'bg-wtech-red/20 border-wtech-red text-white' : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/30'}`}>
                                                <input
                                                    type="checkbox"
                                                    checked={formData.specialties.includes(spec)}
                                                    onChange={() => handleSpecialtyChange(spec)}
                                                    className="accent-wtech-red w-4 h-4"
                                                />
                                                <span className="text-xs font-bold uppercase tracking-tight">{spec}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-wtech-red uppercase tracking-[0.2em] mb-3">Principais Cursos e Certificações</label>
                                    <textarea
                                        name="certifications"
                                        value={formData.certifications}
                                        onChange={handleChange}
                                        placeholder="Liste seus principais cursos..."
                                        className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:border-wtech-red focus:bg-white/10 outline-none transition-all h-32 resize-none"
                                    ></textarea>
                                </div>

                                <div className="flex justify-between pt-8">
                                    <button type="button" onClick={() => setStep(2)} className="text-gray-500 font-black uppercase tracking-widest text-[10px] hover:text-white transition-colors">← Voltar</button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="bg-wtech-red text-white px-12 py-5 rounded-xl font-black uppercase tracking-[0.2em] text-xs hover:bg-white hover:text-black transition-all transform hover:scale-[1.02] shadow-[0_0_20px_rgba(230,0,0,0.3)] disabled:opacity-50"
                                    >
                                        {loading ? 'Processando...' : 'FINALIZAR CREDENCIAMENTO'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </form>
                </div>
            </div>
        </div>
    );
};

export default MechanicRegister;