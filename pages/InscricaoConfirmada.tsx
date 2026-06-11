import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, Calendar, MapPin, Download, ArrowRight, Loader2, Clock, Mail, User, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import { formatDateLocal } from '../lib/utils';

interface EnrollmentData {
    id: string;
    student_name: string;
    student_email: string;
    student_phone: string;
    student_cpf?: string;
    status: string;
    amount_paid: number;
    total_amount: number;
    payment_method: string;
    currency: string;
    zip_code?: string;
    address?: string;
    address_number?: string;
    address_neighborhood?: string;
    city?: string;
    state?: string;
    t_shirt_size?: string;
    SITE_Courses: {
        title: string;
        date: string;
        date_end?: string;
        city?: string;
        state?: string;
        start_time?: string;
        what_to_bring?: string;
        currency?: string;
        whatsapp_group_link?: string;
    } | null;
}

const InscricaoConfirmada: React.FC = () => {
    const [searchParams] = useSearchParams();
    const enrollmentId = searchParams.get('eid');
    const urlStatus = searchParams.get('status') || 'approved';
    const paymentId = searchParams.get('payment_id') || searchParams.get('collection_id');

    const [loading, setLoading] = useState(true);
    const [enrollment, setEnrollment] = useState<EnrollmentData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [dots, setDots] = useState('');
    const [pollCount, setPollCount] = useState(0);
    const [clientCode, setClientCode] = useState<string | null>(null);

    // Formulário do Questionário
    const [qForm, setQForm] = useState({
        fullName: '',
        email: '',
        phone: '',
        tShirtSize: 'M',
        cpf: '',
        zipCode: '',
        address: '',
        addressNumber: '',
        addressNeighborhood: '',
        city: '',
        state: '',
        isMechanic: 'no',
        hasWorkshop: 'no',
        workshopName: '',
        workshopAddress: '',
        worksWithSuspensions: 'no',
        tookWtechCourse: 'no',
        tookSuspensionCourse: 'no',
        experienceYears: ''
    });
    const [savingQ, setSavingQ] = useState(false);
    const [qSubmitted, setQSubmitted] = useState(false);

    // Animação de ellipsis
    useEffect(() => {
        const interval = setInterval(() => {
            setDots(prev => prev.length >= 3 ? '' : prev + '.');
        }, 500);
        return () => clearInterval(interval);
    }, []);

    const fetchEnrollment = async (showLoading = true) => {
        if (!enrollmentId) {
            setError('Identificador de inscrição não encontrado.');
            setLoading(false);
            return;
        }

        if (showLoading) setLoading(true);

        try {
            const { data, error: fetchError } = await supabase
                .from('SITE_Enrollments')
                .select('id, student_name, student_email, student_phone, student_cpf, status, amount_paid, total_amount, payment_method, currency, zip_code, address, address_number, address_neighborhood, city, state, t_shirt_size, SITE_Courses(title, date, date_end, city, state, start_time, what_to_bring, currency, whatsapp_group_link)')
                .eq('id', enrollmentId)
                .single();

            if (fetchError) throw fetchError;
            const enrData = data as unknown as EnrollmentData;
            setEnrollment(enrData);

            // Prefill do questionário
            setQForm(prev => ({
                ...prev,
                fullName: enrData.student_name || '',
                email: enrData.student_email || '',
                phone: enrData.student_phone || '',
                cpf: enrData.student_cpf || '',
                tShirtSize: enrData.t_shirt_size || 'M',
                zipCode: enrData.zip_code || '',
                address: enrData.address || '',
                addressNumber: enrData.address_number || '',
                addressNeighborhood: enrData.address_neighborhood || '',
                city: enrData.city || '',
                state: enrData.state || ''
            }));

            if (enrData.t_shirt_size && enrData.student_cpf) {
                setQSubmitted(true);
            }
        } catch (err: any) {
            console.error('Error fetching enrollment:', err);
            setError('Não foi possível carregar os dados da inscrição. Verifique seu e-mail para confirmação.');
        } finally {
            setLoading(false);
        }
    };

    // Busca inicial
    useEffect(() => {
        fetchEnrollment();
    }, [enrollmentId]);

    // Polling enquanto Pending (máx 60s / 20 tentativas)
    useEffect(() => {
        if (!enrollment || enrollment.status === 'Confirmed' || pollCount >= 20) return;

        const interval = setInterval(() => {
            setPollCount(prev => prev + 1);
            fetchEnrollment(false);
        }, 3000);

        return () => clearInterval(interval);
    }, [enrollment?.status, pollCount]);

    // Sincronização direta no carregamento (se houver paymentId do checkout)
    useEffect(() => {
        if (enrollment && enrollment.status === 'Pending' && paymentId) {
            console.log('[Direct Verification] Triggering webhook sync for payment:', paymentId);
            fetch(`/api/mercadopago-webhook?id=${paymentId}&topic=payment`, {
                method: 'POST'
            })
            .then(res => res.json())
            .then(data => {
                console.log('[Direct Verification] Webhook call returned:', data);
                // Força recarregar dados do enrollment imediatamente
                fetchEnrollment(false);
            })
            .catch(err => {
                console.error('[Direct Verification] Webhook call failed:', err);
            });
        }
    }, [enrollment?.status, paymentId]);

    // Busca client_code na SITE_Leads quando o e-mail estiver disponível
    useEffect(() => {
        if (!enrollment?.student_email) return;

        const fetchClientCode = async () => {
            try {
                const { data, error } = await supabase
                    .from('SITE_Leads')
                    .select('client_code')
                    .eq('email', enrollment.student_email)
                    .maybeSingle();

                if (data?.client_code) {
                    setClientCode(data.client_code);
                }
            } catch (err) {
                console.error('Error fetching client code:', err);
            }
        };

        fetchClientCode();
    }, [enrollment?.student_email]);

    // Autocomplete do CEP via ViaCEP
    const handleCepBlur = async (cep: string) => {
        const cleanCep = cep.replace(/\D/g, '');
        if (cleanCep.length !== 8) return;

        try {
            const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
            const data = await res.json();
            if (data.erro) return;

            setQForm(prev => ({
                ...prev,
                address: data.logradouro || prev.address,
                addressNeighborhood: data.bairro || prev.addressNeighborhood,
                city: data.localidade || prev.city,
                state: data.uf || prev.state
            }));
        } catch (err) {
            console.error('Error fetching CEP:', err);
        }
    };

    const handleQSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSavingQ(true);
        try {
            const payload = {
                student_name: qForm.fullName,
                student_email: qForm.email.trim().toLowerCase(),
                student_phone: qForm.phone.replace(/\D/g, ''),
                t_shirt_size: qForm.tShirtSize,
                student_cpf: qForm.cpf.replace(/\D/g, ''),
                zip_code: qForm.zipCode,
                address: qForm.address,
                address_number: qForm.addressNumber,
                address_neighborhood: qForm.addressNeighborhood,
                city: qForm.city,
                state: qForm.state,
                is_mechanic: qForm.isMechanic === 'yes',
                has_workshop: qForm.hasWorkshop === 'yes',
                workshop_name: qForm.hasWorkshop === 'yes' ? qForm.workshopName : '',
                workshop_address: qForm.hasWorkshop === 'yes' ? qForm.workshopAddress : '',
                works_with_suspensions: qForm.worksWithSuspensions === 'yes',
                took_wtech_course: qForm.tookWtechCourse === 'yes',
                took_suspension_course: qForm.tookSuspensionCourse === 'yes',
                experience_years: qForm.experienceYears
            };

            // 1. Atualiza SITE_Enrollments
            const { error: updateError } = await supabase
                .from('SITE_Enrollments')
                .update(payload)
                .eq('id', enrollmentId);

            if (updateError) throw updateError;

            // 2. Sincroniza com a tabela de Leads no CRM
            const { syncStudentToLeads } = await import('../lib/leads');
            const updatedEnrollment = {
                ...enrollment,
                studentName: qForm.fullName,
                studentEmail: qForm.email.trim().toLowerCase(),
                studentPhone: qForm.phone.replace(/\D/g, ''),
                tShirtSize: qForm.tShirtSize,
                studentCpf: qForm.cpf,
                zipCode: qForm.zipCode,
                address: qForm.address,
                addressNumber: qForm.addressNumber,
                addressNeighborhood: qForm.addressNeighborhood,
                city: qForm.city,
                state: qForm.state,
                isMechanic: qForm.isMechanic === 'yes',
                hasWorkshop: qForm.hasWorkshop === 'yes',
                workshopName: qForm.hasWorkshop === 'yes' ? qForm.workshopName : '',
                workshopAddress: qForm.hasWorkshop === 'yes' ? qForm.workshopAddress : '',
                worksWithSuspensions: qForm.worksWithSuspensions === 'yes',
                tookWtechCourse: qForm.tookWtechCourse === 'yes',
                tookSuspensionCourse: qForm.tookSuspensionCourse === 'yes',
                experienceYears: qForm.experienceYears
            };

            await syncStudentToLeads(updatedEnrollment);

            setQSubmitted(true);
            alert('Cadastro complementar concluído com sucesso!');
        } catch (err: any) {
            console.error('Error saving questionnaire:', err);
            alert('Erro ao salvar as informações: ' + err.message);
        } finally {
            setSavingQ(false);
        }
    };

    const currencySymbol = (enrollment?.SITE_Courses?.currency || enrollment?.currency || 'BRL') === 'EUR' ? '€'
        : (enrollment?.SITE_Courses?.currency || enrollment?.currency) === 'USD' ? '$'
        : 'R$';

    const course = enrollment?.SITE_Courses;
    const isConfirmed = enrollment?.status === 'Confirmed' || urlStatus === 'approved';
    const remainingBalance = Math.max(0, (enrollment?.total_amount || 0) - (enrollment?.amount_paid || 0));

    // Estado: carregando
    if (loading && !enrollment) {
        return (
            <div className="min-h-screen bg-[#FDFCFB] flex flex-col items-center justify-center p-4">
                <Loader2 className="animate-spin text-wtech-gold mb-4" size={48} />
                <p className="text-gray-500 font-bold animate-pulse uppercase tracking-widest text-xs text-center">
                    Confirmando inscrição{dots}
                </p>
            </div>
        );
    }

    // Estado: sem ID de inscrição ou erro
    if (!enrollmentId || error) {
        return (
            <div className="min-h-screen bg-[#FDFCFB] flex flex-col items-center justify-center p-6 text-center">
                <AlertCircle size={48} className="text-yellow-400 mb-4" />
                <h1 className="text-xl font-black mb-2 text-gray-800">
                    {error || 'Dados não encontrados'}
                </h1>
                <p className="text-gray-500 text-sm mb-6 max-w-sm">
                    Verifique seu e-mail para a confirmação de inscrição ou entre em contato com o suporte.
                </p>
                <a
                    href="mailto:suporte@w-tech.com"
                    className="bg-wtech-gold text-black font-black px-6 py-3 rounded-xl text-sm"
                >
                    Falar com suporte
                </a>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#FDFCFB]">
            {/* Barra dourada topo */}
            <div className="h-1.5 bg-gradient-to-r from-wtech-gold via-yellow-400 to-wtech-gold" />

            <div className="flex items-center justify-center p-4 py-12">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-lg w-full bg-white rounded-3xl shadow-2xl shadow-gray-200/50 overflow-hidden border border-gray-100"
                >
                    <div className="p-6 md:p-8">
                        <AnimatePresence mode="wait">
                            {/* Estado: Aguardando confirmação de pagamento */}
                            {!isConfirmed && enrollment?.status === 'Pending' ? (
                                <motion.div
                                    key="pending"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="text-center"
                                >
                                    <div className="w-24 h-24 bg-yellow-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <Clock size={48} className="text-wtech-gold animate-pulse" />
                                    </div>
                                    <h1 className="text-2xl font-black text-gray-900 mb-2">
                                        Aguardando confirmação{dots}
                                    </h1>
                                    <p className="text-gray-500 text-sm mb-6 leading-relaxed">
                                        Seu pagamento está sendo processado. Para Pix e boleto isso pode levar alguns minutos.
                                    </p>

                                    {course && (
                                        <div className="bg-gray-50 rounded-2xl p-5 text-left border border-gray-100">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Sua inscrição</p>
                                            <p className="font-black text-gray-900 mb-2">{course.title}</p>
                                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                                <Calendar size={14} className="text-wtech-gold" />
                                                <span className="font-bold">{formatDateLocal(course.date)}</span>
                                            </div>
                                            {course.city && (
                                                <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                                                    <MapPin size={14} className="text-wtech-gold" />
                                                    <span className="font-bold">{course.city}{course.state ? `, ${course.state}` : ''}</span>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <p className="text-xs text-gray-400 mt-6 font-bold">
                                        Você receberá uma confirmação no e-mail <strong>{enrollment?.student_email}</strong>
                                    </p>
                                </motion.div>
                            ) : (
                                /* Estado: Inscrição Confirmada */
                                <motion.div
                                    key="confirmed"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="text-center animate-in fade-in"
                                >
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ type: 'spring', stiffness: 200, damping: 10, delay: 0.1 }}
                                        className="w-20 h-20 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4"
                                    >
                                        <CheckCircle size={48} />
                                    </motion.div>

                                    <h1 className="text-2xl font-black text-gray-900 mb-1 uppercase tracking-tight">
                                        Inscrição Confirmada!
                                    </h1>
                                    <p className="text-wtech-gold font-black mb-6 uppercase tracking-widest text-[10px]">
                                        Parabéns, {enrollment?.student_name?.split(' ')[0]}!
                                    </p>

                                    {/* Detalhes do curso */}
                                    <div className="bg-gray-50 rounded-2xl p-5 mb-6 text-left border border-gray-100 space-y-3">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Detalhes da inscrição</p>

                                        <div>
                                            <p className="text-[10px] font-black text-gray-400 uppercase">Curso</p>
                                            <p className="font-black text-gray-900">{course?.title || 'Curso W-Tech'}</p>
                                        </div>

                                        {course?.date && (
                                            <div className="flex items-center gap-3">
                                                <Calendar size={14} className="text-wtech-gold shrink-0" />
                                                <div>
                                                    <p className="text-[10px] font-black text-gray-400 uppercase">Data</p>
                                                    <p className="font-bold text-gray-700 text-xs">
                                                        {formatDateLocal(course.date)}
                                                        {course.date_end && course.date_end !== course.date ? ` a ${formatDateLocal(course.date_end)}` : ''}
                                                        {course.start_time ? ` · ${course.start_time}` : ''}
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {course?.city && (
                                            <div className="flex items-center gap-3">
                                                <MapPin size={14} className="text-wtech-gold shrink-0" />
                                                <div>
                                                    <p className="text-[10px] font-black text-gray-400 uppercase">Local</p>
                                                    <p className="font-bold text-gray-700 text-xs">
                                                        {[course.city, course.state].filter(Boolean).join(', ')}
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Detalhes Financeiros */}
                                        <div className="flex flex-col gap-2.5 border-t border-gray-200 pt-3.5 text-left">
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <p className="text-[10px] font-black text-gray-400 uppercase">Valor do Curso</p>
                                                    <p className="text-sm font-bold text-gray-700">
                                                        {currencySymbol} {(enrollment?.total_amount || 0).toFixed(2).replace('.', ',')}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[10px] font-black text-gray-400 uppercase">Valor Pago</p>
                                                    {enrollment?.status === 'Confirmed' ? (
                                                        <p className="text-base font-black text-green-600">
                                                            {currencySymbol} {(enrollment.amount_paid || 0).toFixed(2).replace('.', ',')}
                                                        </p>
                                                    ) : (
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <Loader2 size={12} className="animate-spin text-wtech-gold" />
                                                            <span className="text-xs font-bold text-gray-400">Confirmando...</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            {remainingBalance > 0 && enrollment?.status === 'Confirmed' && (
                                                <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-3 flex justify-between items-center mt-1 animate-in fade-in">
                                                    <div>
                                                        <p className="text-[10px] font-black text-amber-600 uppercase">Saldo Restante</p>
                                                        <p className="text-[10px] font-bold text-amber-700">A pagar posteriormente</p>
                                                    </div>
                                                    <span className="text-base font-black text-amber-600">
                                                        {currencySymbol} {remainingBalance.toFixed(2).replace('.', ',')}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Código de Acesso / Portal do Aluno */}
                                    {clientCode && (
                                        <div className="bg-yellow-50/20 border border-wtech-gold/20 rounded-2xl p-4 mb-6 text-left animate-in fade-in">
                                            <p className="text-[10px] font-black text-wtech-gold uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                                🔑 Código de Acesso do Aluno
                                            </p>
                                            <div className="flex items-center justify-between gap-3 mt-1 bg-white p-2.5 rounded-xl border border-gray-100">
                                                <span className="font-mono font-black text-gray-800 text-base uppercase tracking-wider">{clientCode}</span>
                                                <Link
                                                    to={`/meus-pedidos?code=${clientCode}`}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-black text-white rounded-lg font-black text-[10px] uppercase hover:bg-gray-800 transition-colors shrink-0"
                                                >
                                                    Entrar no Portal <ArrowRight size={10} />
                                                </Link>
                                            </div>
                                            <p className="text-[9px] text-gray-500 mt-2 font-bold leading-normal">
                                                Use para acessar seus certificados, apostilas e compras no Portal do Aluno.
                                            </p>
                                        </div>
                                    )}

                                    {/* Botão Grupo VIP WhatsApp */}
                                    {course?.whatsapp_group_link && (
                                        <div className="mb-6 animate-in fade-in">
                                            <a
                                                href={course.whatsapp_group_link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="w-full bg-[#25D366] text-white font-black py-3 px-5 rounded-xl text-xs uppercase tracking-wide hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-md shadow-green-100"
                                            >
                                                <span>💬</span>
                                                Entrar no Grupo VIP do WhatsApp
                                            </a>
                                            <p className="text-[9px] text-gray-400 mt-1.5 text-center font-bold">
                                                Grupo da turma para avisos, networking e materiais extras
                                            </p>
                                        </div>
                                    )}

                                    {/* Próximos passos */}
                                    <div className="bg-blue-50 rounded-2xl p-4 mb-6 text-left border border-blue-100">
                                        <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-2">Próximos Passos</p>
                                        <ul className="space-y-2">
                                            <li className="flex items-start gap-2 text-xs text-gray-700">
                                                <Mail size={12} className="text-blue-500 shrink-0 mt-0.5" />
                                                <span className="font-bold">Verifique seu e-mail para a confirmação da inscrição</span>
                                            </li>
                                            <li className="flex items-start gap-2 text-xs text-gray-700">
                                                <User size={12} className="text-blue-500 shrink-0 mt-0.5" />
                                                <span className="font-bold">Nossa equipe entrará em contato com mais instruções</span>
                                            </li>
                                            {course?.what_to_bring && (
                                                <li className="flex items-start gap-2 text-xs text-gray-700">
                                                    <CheckCircle size={12} className="text-green-500 shrink-0 mt-0.5" />
                                                    <span className="font-bold">O que trazer: {course.what_to_bring}</span>
                                                </li>
                                            )}
                                        </ul>
                                    </div>

                                    {/* QUESTIONNAIRE FORM */}
                                    {!qSubmitted && isConfirmed && (
                                        <div className="mt-8 border-t border-gray-200 pt-8 text-left animate-in fade-in duration-300">
                                            <h3 className="text-base font-black uppercase text-gray-900 mb-1.5 tracking-tight flex items-center gap-2">
                                                <span className="w-1 h-5 bg-wtech-gold rounded-sm inline-block shrink-0"></span>
                                                Cadastro Complementar
                                            </h3>
                                            <p className="text-gray-500 text-[10px] mb-6 leading-relaxed">
                                                Preencha as informações abaixo para confecção de credencial, certificado e tamanho da camiseta oficial:
                                            </p>

                                            <form onSubmit={handleQSubmit} className="space-y-4">
                                                {/* Nome para o certificado */}
                                                <div>
                                                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Nome Completo (Para o Certificado) *</label>
                                                    <input
                                                        type="text"
                                                        required
                                                        value={qForm.fullName}
                                                        onChange={e => setQForm({ ...qForm, fullName: e.target.value })}
                                                        className="w-full border border-gray-200 rounded-xl py-2.5 px-3 text-xs font-bold text-gray-800 focus:outline-none focus:border-wtech-gold transition-colors bg-gray-50/50"
                                                        placeholder="Nome completo para o certificado"
                                                    />
                                                </div>

                                                <div className="grid grid-cols-2 gap-3">
                                                    {/* E-mail */}
                                                    <div>
                                                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">E-mail *</label>
                                                        <input
                                                            type="email"
                                                            required
                                                            value={qForm.email}
                                                            onChange={e => setQForm({ ...qForm, email: e.target.value })}
                                                            className="w-full border border-gray-200 rounded-xl py-2.5 px-3 text-xs font-bold text-gray-800 focus:outline-none focus:border-wtech-gold transition-colors bg-gray-50/50"
                                                            placeholder="seu@email.com"
                                                        />
                                                    </div>

                                                    {/* Telefone */}
                                                    <div>
                                                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Telefone / WhatsApp *</label>
                                                        <input
                                                            type="tel"
                                                            required
                                                            value={qForm.phone}
                                                            onChange={e => setQForm({ ...qForm, phone: e.target.value })}
                                                            className="w-full border border-gray-200 rounded-xl py-2.5 px-3 text-xs font-bold text-gray-800 focus:outline-none focus:border-wtech-gold transition-colors bg-gray-50/50"
                                                            placeholder="(00) 00000-0000"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-3">
                                                    {/* CPF */}
                                                    <div>
                                                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">CPF *</label>
                                                        <input
                                                            type="text"
                                                            required
                                                            value={qForm.cpf}
                                                            onChange={e => setQForm({ ...qForm, cpf: e.target.value })}
                                                            className="w-full border border-gray-200 rounded-xl py-2.5 px-3 text-xs font-bold text-gray-800 focus:outline-none focus:border-wtech-gold transition-colors bg-gray-50/50"
                                                            placeholder="000.000.000-00"
                                                        />
                                                    </div>

                                                    {/* Camiseta */}
                                                    <div>
                                                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Tamanho da Camiseta *</label>
                                                        <select
                                                            value={qForm.tShirtSize}
                                                            onChange={e => setQForm({ ...qForm, tShirtSize: e.target.value })}
                                                            className="w-full border border-gray-200 rounded-xl py-2.5 px-3 text-xs font-bold text-gray-800 focus:outline-none focus:border-wtech-gold transition-colors bg-gray-50/50"
                                                        >
                                                            <option value="P">P (Pequeno)</option>
                                                            <option value="M">M (Médio)</option>
                                                            <option value="G">G (Grande)</option>
                                                            <option value="GG">GG (Duplo Grande)</option>
                                                            <option value="XG">XG (Extra Grande)</option>
                                                        </select>
                                                    </div>
                                                </div>

                                                {/* Endereço Title */}
                                                <div className="pt-2 border-t border-gray-100 mt-3">
                                                    <p className="text-[10px] font-black text-wtech-gold uppercase tracking-wider mb-2 flex items-center gap-1">
                                                        📍 Endereço para Envio de Materiais
                                                    </p>
                                                </div>

                                                <div className="grid grid-cols-3 gap-3">
                                                    {/* CEP */}
                                                    <div>
                                                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">CEP *</label>
                                                        <input
                                                            type="text"
                                                            required
                                                            value={qForm.zipCode}
                                                            onChange={e => setQForm({ ...qForm, zipCode: e.target.value })}
                                                            onBlur={(e) => handleCepBlur(e.target.value)}
                                                            className="w-full border border-gray-200 rounded-xl py-2.5 px-3 text-xs font-bold text-gray-800 focus:outline-none focus:border-wtech-gold transition-colors bg-gray-50/50 font-mono"
                                                            placeholder="00000-000"
                                                        />
                                                    </div>

                                                    {/* Cidade */}
                                                    <div>
                                                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Cidade *</label>
                                                        <input
                                                            type="text"
                                                            required
                                                            value={qForm.city}
                                                            onChange={e => setQForm({ ...qForm, city: e.target.value })}
                                                            className="w-full border border-gray-200 rounded-xl py-2.5 px-3 text-xs font-bold text-gray-800 focus:outline-none focus:border-wtech-gold transition-colors bg-gray-50/50"
                                                            placeholder="Ex: São Paulo"
                                                        />
                                                    </div>

                                                    {/* Estado */}
                                                    <div>
                                                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Estado *</label>
                                                        <input
                                                            type="text"
                                                            required
                                                            value={qForm.state}
                                                            onChange={e => setQForm({ ...qForm, state: e.target.value })}
                                                            className="w-full border border-gray-200 rounded-xl py-2.5 px-3 text-xs font-bold text-gray-800 focus:outline-none focus:border-wtech-gold transition-colors bg-gray-50/50"
                                                            placeholder="Ex: SP"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-4 gap-3">
                                                    {/* Rua */}
                                                    <div className="col-span-3">
                                                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Logradouro / Rua *</label>
                                                        <input
                                                            type="text"
                                                            required
                                                            value={qForm.address}
                                                            onChange={e => setQForm({ ...qForm, address: e.target.value })}
                                                            className="w-full border border-gray-200 rounded-xl py-2.5 px-3 text-xs font-bold text-gray-800 focus:outline-none focus:border-wtech-gold transition-colors bg-gray-50/50"
                                                            placeholder="Rua, Avenida, etc."
                                                        />
                                                    </div>

                                                    {/* Número */}
                                                    <div>
                                                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Número *</label>
                                                        <input
                                                            type="text"
                                                            required
                                                            value={qForm.addressNumber}
                                                            onChange={e => setQForm({ ...qForm, addressNumber: e.target.value })}
                                                            className="w-full border border-gray-200 rounded-xl py-2.5 px-3 text-xs font-bold text-gray-800 focus:outline-none focus:border-wtech-gold transition-colors bg-gray-50/50"
                                                            placeholder="123"
                                                        />
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Bairro / Complemento *</label>
                                                    <input
                                                        type="text"
                                                        required
                                                        value={qForm.addressNeighborhood}
                                                        onChange={e => setQForm({ ...qForm, addressNeighborhood: e.target.value })}
                                                        className="w-full border border-gray-200 rounded-xl py-2.5 px-3 text-xs font-bold text-gray-800 focus:outline-none focus:border-wtech-gold transition-colors bg-gray-50/50"
                                                        placeholder="Ex: Centro / Bloco B"
                                                    />
                                                </div>

                                                {/* Questionário Técnico Title */}
                                                <div className="pt-2 border-t border-gray-100 mt-3">
                                                    <p className="text-[10px] font-black text-wtech-gold uppercase tracking-wider mb-2 flex items-center gap-1">
                                                        🔧 Perfil Profissional
                                                    </p>
                                                </div>

                                                <div className="grid grid-cols-2 gap-3">
                                                    {/* Já é mecânico */}
                                                    <div>
                                                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Já é Mecânico?</label>
                                                        <select
                                                            value={qForm.isMechanic}
                                                            onChange={e => setQForm({ ...qForm, isMechanic: e.target.value })}
                                                            className="w-full border border-gray-200 rounded-xl py-2.5 px-3 text-xs font-bold text-gray-800 focus:outline-none focus:border-wtech-gold transition-colors bg-gray-50/50"
                                                        >
                                                            <option value="no">Não</option>
                                                            <option value="yes">Sim</option>
                                                        </select>
                                                    </div>

                                                    {/* Trabalha em mecânica/oficina */}
                                                    <div>
                                                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Trabalha em Mecânica / Oficina?</label>
                                                        <select
                                                            value={qForm.hasWorkshop}
                                                            onChange={e => setQForm({ ...qForm, hasWorkshop: e.target.value })}
                                                            className="w-full border border-gray-200 rounded-xl py-2.5 px-3 text-xs font-bold text-gray-800 focus:outline-none focus:border-wtech-gold transition-colors bg-gray-50/50"
                                                        >
                                                            <option value="no">Não</option>
                                                            <option value="yes">Sim</option>
                                                        </select>
                                                    </div>
                                                </div>

                                                {qForm.hasWorkshop === 'yes' && (
                                                    <div className="grid grid-cols-2 gap-3 animate-in slide-in-from-left-2 duration-150">
                                                        {/* Nome da Mecânica */}
                                                        <div>
                                                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Qual Mecânica Trabalha? *</label>
                                                            <input
                                                                type="text"
                                                                required
                                                                value={qForm.workshopName}
                                                                onChange={e => setQForm({ ...qForm, workshopName: e.target.value })}
                                                                className="w-full border border-gray-200 rounded-xl py-2.5 px-3 text-xs font-bold text-gray-800 focus:outline-none focus:border-wtech-gold transition-colors bg-gray-50/50"
                                                                placeholder="Nome da mecânica/oficina"
                                                            />
                                                        </div>

                                                        {/* Endereço da Mecânica */}
                                                        <div>
                                                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Endereço da Mecânica *</label>
                                                            <input
                                                                type="text"
                                                                required
                                                                value={qForm.workshopAddress}
                                                                onChange={e => setQForm({ ...qForm, workshopAddress: e.target.value })}
                                                                className="w-full border border-gray-200 rounded-xl py-2.5 px-3 text-xs font-bold text-gray-800 focus:outline-none focus:border-wtech-gold transition-colors bg-gray-50/50"
                                                                placeholder="Rua, número, cidade"
                                                            />
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="grid grid-cols-2 gap-3">
                                                    {/* Já trabalha com suspensão */}
                                                    <div>
                                                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Trabalha com Suspensão?</label>
                                                        <select
                                                            value={qForm.worksWithSuspensions}
                                                            onChange={e => setQForm({ ...qForm, worksWithSuspensions: e.target.value })}
                                                            className="w-full border border-gray-200 rounded-xl py-2.5 px-3 text-xs font-bold text-gray-800 focus:outline-none focus:border-wtech-gold transition-colors bg-gray-50/50"
                                                        >
                                                            <option value="no">Não</option>
                                                            <option value="yes">Sim</option>
                                                        </select>
                                                    </div>

                                                    {/* Tempo de experiência */}
                                                    {qForm.worksWithSuspensions === 'yes' && (
                                                        <div className="animate-in slide-in-from-left-2 duration-150">
                                                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Tempo de Experiência *</label>
                                                            <input
                                                                type="text"
                                                                required
                                                                value={qForm.experienceYears}
                                                                onChange={e => setQForm({ ...qForm, experienceYears: e.target.value })}
                                                                className="w-full border border-gray-200 rounded-xl py-2.5 px-3 text-xs font-bold text-gray-800 focus:outline-none focus:border-wtech-gold transition-colors bg-gray-50/50"
                                                                placeholder="Ex: 2 anos"
                                                            />
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="grid grid-cols-2 gap-3">
                                                    {/* Já fez curso W-Tech */}
                                                    <div>
                                                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Já Fez Curso da W-Tech?</label>
                                                        <select
                                                            value={qForm.tookWtechCourse}
                                                            onChange={e => setQForm({ ...qForm, tookWtechCourse: e.target.value })}
                                                            className="w-full border border-gray-200 rounded-xl py-2.5 px-3 text-xs font-bold text-gray-800 focus:outline-none focus:border-wtech-gold transition-colors bg-gray-50/50"
                                                        >
                                                            <option value="no">Não</option>
                                                            <option value="yes">Sim</option>
                                                        </select>
                                                    </div>

                                                    {/* Curso de suspensão fora da W-Tech */}
                                                    <div>
                                                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Curso de Suspensão Fora da W-Tech?</label>
                                                        <select
                                                            value={qForm.tookSuspensionCourse}
                                                            onChange={e => setQForm({ ...qForm, tookSuspensionCourse: e.target.value })}
                                                            className="w-full border border-gray-200 rounded-xl py-2.5 px-3 text-xs font-bold text-gray-800 focus:outline-none focus:border-wtech-gold transition-colors bg-gray-50/50"
                                                        >
                                                            <option value="no">Não</option>
                                                            <option value="yes">Sim</option>
                                                        </select>
                                                    </div>
                                                </div>

                                                {/* Enviar */}
                                                <button
                                                    type="submit"
                                                    disabled={savingQ}
                                                    className="w-full bg-black text-white font-black py-3.5 rounded-xl text-xs uppercase tracking-wider hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 mt-6 active:scale-95 shadow-md shadow-gray-200"
                                                >
                                                    {savingQ ? (
                                                        <>
                                                            <Loader2 size={14} className="animate-spin text-wtech-gold" />
                                                            Salvando...
                                                        </>
                                                    ) : (
                                                        'Salvar Informações'
                                                    )}
                                                </button>
                                            </form>
                                        </div>
                                    )}

                                    {qSubmitted && (
                                        <div className="mt-8 border-t border-gray-200 pt-6 text-center animate-in fade-in">
                                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 text-green-700 rounded-full text-xs font-black uppercase tracking-wider">
                                                ✓ Questionário Concluído
                                            </div>
                                        </div>
                                    )}

                                    {/* Ações */}
                                    <div className="grid grid-cols-2 gap-3 mt-8">
                                        <Link
                                            to="/"
                                            className="flex items-center justify-center gap-2 py-3 bg-wtech-black text-white rounded-2xl font-black text-sm hover:bg-gray-800 transition-all active:scale-95 shadow-lg shadow-gray-200"
                                        >
                                            Início <ArrowRight size={16} />
                                        </Link>
                                        <button
                                            onClick={() => window.print()}
                                            className="flex items-center justify-center gap-2 py-3 border-2 border-gray-100 text-gray-700 rounded-2xl font-black text-sm hover:bg-gray-50 transition-all active:scale-95"
                                        >
                                            Imprimir <Download size={16} />
                                        </button>
                                    </div>

                                    <p className="mt-8 text-xs text-gray-400 font-bold uppercase tracking-widest">
                                        Dúvidas? suporte@w-tech.com
                                    </p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default InscricaoConfirmada;
