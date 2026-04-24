
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { CheckCircle, XCircle, Award, Calendar, User, BookOpen } from 'lucide-react';
import { formatDateLocal } from '../lib/utils'; // Assuming this utility exists
import { useSettings } from '../context/SettingsContext';

const CertificateValidation = () => {
    const { id } = useParams();
    const { get } = useSettings();
    const logoUrl = get('logo_dark_url');
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState<'valid' | 'invalid' | 'loading'>('loading');
    const [data, setData] = useState<any>(null);

    useEffect(() => {
        const validate = async () => {
            if (!id) {
                setStatus('invalid');
                setLoading(false);
                return;
            }

            // Clean ID (sometimes QR scanners add stuff)
            const enrollmentId = id.trim();

            try {
                // Fetch enrollment with related course data
                // We assume enrollment ID is the UUID or a partial match if we implemented shorter IDs
                // Using exact UUID match for security first
                const { data: enrollment, error } = await supabase
                    .from('SITE_Enrollments')
                    .select('*, SITE_Courses(*)')
                    .eq('id', enrollmentId)
                    .maybeSingle();

                if (error || !enrollment) {
                    setStatus('invalid');
                } else {
                     // Check if status is confirmed/checked-in to be strictly valid
                    if (enrollment.status === 'Confirmed' || enrollment.status === 'CheckedIn') {
                        setStatus('valid');
                        setData(enrollment);
                    } else {
                        // Exists but not completed? Maybe 'Pending' shouldn't have a valid cert
                         setStatus('invalid'); 
                         // Or show "Pending Payment" status if you prefer
                    }
                }
            } catch (err) {
                console.error(err);
                setStatus('invalid');
            } finally {
                setLoading(false);
            }
        };

        validate();
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-wtech-gold"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
                {/* Header Status */}
                <div className={`p-8 flex flex-col items-center text-center ${status === 'valid' ? 'bg-green-50' : 'bg-red-50'}`}>
                    {status === 'valid' ? (
                        <>
                            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-4 shadow-sm">
                                <CheckCircle size={40} className="text-green-600" />
                            </div>
                            <h1 className="text-2xl font-black text-green-800 uppercase tracking-tight">Certificado Válido</h1>
                            <p className="text-green-600 text-sm font-medium mt-1">A autenticidade deste documento foi verificada.</p>
                        </>
                    ) : (
                        <>
                            <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mb-4 shadow-sm">
                                <XCircle size={40} className="text-red-600" />
                            </div>
                            <h1 className="text-2xl font-black text-red-800 uppercase tracking-tight">Documento Inválido</h1>
                            <p className="text-red-600 text-sm font-medium mt-1">Não foi possível verificar este código ou ele não existe.</p>
                        </>
                    )}
                </div>

                {/* Details */}
                {status === 'valid' && data && (
                    <div className="p-8 space-y-6">
                        <div className="flex items-start gap-4">
                            <div className="bg-gray-100 p-3 rounded-lg"><User size={20} className="text-gray-600"/></div>
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase">Aluno Certificado</p>
                                <p className="font-bold text-lg text-gray-900">{data.student_name}</p>
                                <p className="text-sm text-gray-500">{data.student_email}</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4">
                            <div className="bg-gray-100 p-3 rounded-lg"><BookOpen size={20} className="text-gray-600"/></div>
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase">Curso Concluído</p>
                                <p className="font-bold text-lg text-gray-900 leading-tight">{data.SITE_Courses?.title}</p>
                                <p className="text-sm text-gray-500 mt-1">{data.SITE_Courses?.location} - {data.SITE_Courses?.location_type}</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4">
                            <div className="bg-gray-100 p-3 rounded-lg"><Calendar size={20} className="text-gray-600"/></div>
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase">Data de Realização</p>
                                <p className="font-bold text-lg text-gray-900">{formatDateLocal(data.SITE_Courses?.date)}</p>
                                <p className="text-xs text-gray-400 uppercase font-bold mt-1">ID: {data.id.split('-')[0]}</p>
                            </div>
                        </div>
                        
                        <div className="pt-6 border-t border-gray-100 text-center">
                            <p className="text-xs text-gray-400">Verificado em {new Date().toLocaleString('pt-BR')}</p>
                            <div className="mt-4 flex justify-center">
                                {logoUrl ? (
                                    <img src={logoUrl} alt="W-TECH" className="h-8 opacity-50 grayscale" />
                                ) : (
                                    <span className="text-sm font-bold text-gray-300 uppercase">W-TECH BRASIL</span>
                                )} 
                            </div>
                        </div>
                    </div>
                )}
                
                {status === 'invalid' && (
                    <div className="p-8 text-center">
                        <p className="text-gray-600 mb-6">Se você acredita que isso é um erro, entre em contato com a equipe W-TECH.</p>
                        <a href="/" className="inline-block bg-gray-900 text-white px-6 py-3 rounded-lg font-bold">Voltar para Início</a>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CertificateValidation;
