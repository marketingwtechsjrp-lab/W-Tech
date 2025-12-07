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
        <div className="bg-gray-50 min-h-screen py-12">
            <SEO
                title="Seja um Credenciado"
                description="Formulário de solicitação para credenciamento de oficinas na rede W-Tech Brasil."
            />
            <div className="container mx-auto px-4 max-w-3xl">
                <div className="text-center mb-10">
                    <h1 className="text-3xl font-bold text-wtech-black">Seja um Credenciado W-TECH</h1>
                    <p className="text-gray-500 mt-2">Junte-se à maior rede de especialistas em suspensão do Brasil.</p>
                </div>

                <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                    {/* Progress Bar */}
                    <div className="bg-gray-100 h-2 w-full">
                        <div
                            className="bg-wtech-gold h-full transition-all duration-500"
                            style={{ width: `${(step / 3) * 100}%` }}
                        ></div>
                    </div>

                    <form onSubmit={handleSubmit} className="p-8 md:p-12">
                        {error && (
                            <div className="bg-red-50 text-red-600 p-4 rounded mb-6 flex items-center gap-2">
                                <AlertCircle size={20} /> {error}
                            </div>
                        )}

                        {step === 1 && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-10 duration-300">
                                <h2 className="text-xl font-bold text-gray-800 border-b pb-2">Dados Pessoais</h2>
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Nome Completo</label>
                                        <input required name="name" value={formData.name} onChange={handleChange} type="text" className="w-full border rounded p-3 focus:border-wtech-gold outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">E-mail</label>
                                        <input required name="email" value={formData.email} onChange={handleChange} type="email" className="w-full border rounded p-3 focus:border-wtech-gold outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Telefone / WhatsApp</label>
                                        <input required name="phone" value={formData.phone} onChange={handleChange} type="tel" className="w-full border rounded p-3 focus:border-wtech-gold outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Anos de Experiência</label>
                                        <input name="experienceYears" value={formData.experienceYears} onChange={handleChange} type="number" className="w-full border rounded p-3 focus:border-wtech-gold outline-none" />
                                    </div>
                                </div>
                                <div className="flex justify-end pt-4">
                                    <button type="button" onClick={() => setStep(2)} className="bg-wtech-black text-white px-8 py-3 rounded font-bold hover:bg-gray-800">Próximo</button>
                                </div>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-10 duration-300">
                                <h2 className="text-xl font-bold text-gray-800 border-b pb-2">Dados da Oficina</h2>
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Nome da Oficina</label>
                                        <input required name="workshopName" value={formData.workshopName} onChange={handleChange} type="text" className="w-full border rounded p-3 focus:border-wtech-gold outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">CNPJ (Opcional)</label>
                                        <input name="cnpj" value={formData.cnpj} onChange={handleChange} type="text" className="w-full border rounded p-3 focus:border-wtech-gold outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Cidade</label>
                                        <input required name="city" value={formData.city} onChange={handleChange} type="text" className="w-full border rounded p-3 focus:border-wtech-gold outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Estado (UF)</label>
                                        <input required name="state" value={formData.state} onChange={handleChange} type="text" maxLength={2} className="w-full border rounded p-3 focus:border-wtech-gold outline-none uppercase" />
                                    </div>
                                </div>
                                <div className="flex justify-between pt-4">
                                    <button type="button" onClick={() => setStep(1)} className="text-gray-500 font-bold hover:text-black">Voltar</button>
                                    <button type="button" onClick={() => setStep(3)} className="bg-wtech-black text-white px-8 py-3 rounded font-bold hover:bg-gray-800">Próximo</button>
                                </div>
                            </div>
                        )}

                        {step === 3 && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-10 duration-300">
                                <h2 className="text-xl font-bold text-gray-800 border-b pb-2">Especialidades</h2>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-3">Selecione suas áreas de atuação:</label>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                        {['Suspensão', 'Freios', 'Motor', 'Elétrica', 'Injeção', 'Câmbio', 'Pneus', 'Alinhamento 3D', 'Preparação'].map(spec => (
                                            <label key={spec} className={`flex items-center gap-2 p-3 rounded border cursor-pointer transition-colors ${formData.specialties.includes(spec) ? 'bg-yellow-50 border-wtech-gold' : 'hover:bg-gray-50'}`}>
                                                <input
                                                    type="checkbox"
                                                    checked={formData.specialties.includes(spec)}
                                                    onChange={() => handleSpecialtyChange(spec)}
                                                    className="accent-wtech-gold w-4 h-4"
                                                />
                                                <span className="text-sm font-medium">{spec}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Cursos e Certificações</label>
                                    <textarea
                                        name="certifications"
                                        value={formData.certifications}
                                        onChange={handleChange}
                                        placeholder="Liste seus principais cursos..."
                                        className="w-full border rounded p-3 focus:border-wtech-gold outline-none h-24"
                                    ></textarea>
                                </div>

                                <div className="flex justify-between pt-4">
                                    <button type="button" onClick={() => setStep(2)} className="text-gray-500 font-bold hover:text-black">Voltar</button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="bg-wtech-gold text-black px-8 py-3 rounded font-bold hover:bg-white border border-transparent hover:border-wtech-gold transition-all shadow-lg"
                                    >
                                        {loading ? 'Enviando...' : 'FINALIZAR CADASTRO'}
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