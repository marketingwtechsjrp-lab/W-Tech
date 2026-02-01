import React, { useState, useEffect } from 'react';
import { X, User, MapPin, Calendar, Shirt, Wrench, Save, ShoppingBag, History, UserCheck, Shield, Share2, RefreshCw, GraduationCap, Plus, Trash2, Truck, CreditCard } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';

interface ClientDetailModalProps {
    client: any;
    onClose: () => void;
    onUpdate: () => void;
    permissions: any;
    users: any[]; // List of potential attendants
}

export const ClientDetailModal: React.FC<ClientDetailModalProps> = ({ client, onClose, onUpdate, permissions, users }) => {
    const [activeTab, setActiveTab] = useState<'details' | 'history' | 'courses'>('details');
    const [loading, setLoading] = useState(false);
    const [sales, setSales] = useState<any[]>([]);
    const [loadingSales, setLoadingSales] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        name: client?.name || '',
        email: client?.email || '',
        phone: client?.phone || '',
        address: client?.address || '',
        birth_date: client?.birth_date || '',
        t_shirt_size: client?.t_shirt_size || '',
        workshop_details: client?.workshop_details || {},
        assigned_to: client?.assigned_to || '',
        status: client?.status || '',
        is_accredited: client?.isAccredited || false,
        cpf: client?.cpf || '',
        rg: client?.rg || '',
        delivery_address: client?.delivery_address || {},
        client_code: client?.client_code || '',
        completed_courses: client?.completed_courses || [],
        zip_code: client?.zip_code || '',
        address_street: client?.address_street || '',
        address_number: client?.address_number || '',
        address_neighborhood: client?.address_neighborhood || '',
        address_city: client?.address_city || '',
        address_state: client?.address_state || '',
        pricing_level: client?.pricing_level || (client?.type === 'Credenciado' ? 'partner' : 'retail')
    });

    const [newCourse, setNewCourse] = useState({ type: 'suspension', date: '' });

    useEffect(() => {
        if (activeTab === 'history') {
            fetchSalesHistory();
        }
    }, [activeTab]);

    const handleChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleWorkshopChange = (key: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            workshop_details: {
                ...(prev.workshop_details as object),
                [key]: value
            }
        }));
    };

    const fetchSalesHistory = async () => {
        setLoadingSales(true);
        // Use the actual columns: client_email, client_id, and created_at
        let query = supabase.from('SITE_Sales').select('*').order('created_at', { ascending: false });
        
        if (client.id) {
            // Find by client_id OR email to be sure
            if (client.email) {
                query = query.or(`client_id.eq.${client.id},client_email.eq.${client.email}`);
            } else {
                query = query.eq('client_id', client.id);
            }
        } else if (client.email) {
            query = query.eq('client_email', client.email);
        } else {
            setSales([]);
            setLoadingSales(false);
            return;
        }

        const { data, error } = await query;
        if (error) {
            console.error("Error fetching sales history:", error);
        }
        if (data) setSales(data);
        setLoadingSales(false);
    };

    const handleCEPLookup = async (cep: string, target: 'main' | 'delivery') => {
        const cleanCEP = cep.replace(/\D/g, '');
        if (cleanCEP.length !== 8) return;

        try {
            const response = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);
            const data = await response.json();

            if (data.erro) {
                alert('CEP não encontrado.');
                return;
            }

            if (target === 'main') {
                setFormData(prev => ({
                    ...prev,
                    zip_code: cleanCEP,
                    address_street: data.logradouro,
                    address_neighborhood: data.bairro,
                    address_city: data.localidade,
                    address_state: data.uf,
                    // Auto-format full address for legacy/display column
                    address: `${data.logradouro}, ${data.bairro} - ${data.localidade}/${data.uf}`
                }));
            } else {
                setFormData(prev => ({
                    ...prev,
                    delivery_address: {
                        ...(prev.delivery_address as any),
                        cep: cleanCEP,
                        street: data.logradouro,
                        neighborhood: data.bairro,
                        city: data.localidade,
                        state: data.uf,
                        full_address: `${data.logradouro}, ${data.bairro} - ${data.localidade}/${data.uf}`
                    }
                }));
            }
        } catch (error) {
            console.error('CEP Lookup error:', error);
            alert('Erro ao buscar CEP. Verifique sua conexão.');
        }
    };

    // Generate code logic moved to button only or explicit creation

    const generateCode = (name: string) => {
        const first = name.substring(0, 3).toUpperCase();
        const nums = Math.floor(Math.random() * 90 + 10); // 10-99
        const letters = Array(3).fill(0).map(() => String.fromCharCode(65 + Math.floor(Math.random() * 26))).join('');
        return `${first}-${nums}${letters}`;
    };

    const handleCopyLink = () => {
        const url = `${window.location.origin}/#/meus-pedidos?code=${formData.client_code || client.client_code}`;
        navigator.clipboard.writeText(url);
        alert('Link copiado! Envie para o cliente: ' + url);
    };

    const handleRegenerateCode = () => {
        const newCode = generateCode(formData.name || 'CLIENTE');
        setFormData(prev => ({ ...prev, client_code: newCode }));
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            const updates: any = {
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                address: formData.address,
                birth_date: formData.birth_date || null,
                t_shirt_size: formData.t_shirt_size,
                workshop_details: formData.workshop_details,
                assigned_to: formData.assigned_to || null,
                is_accredited: formData.is_accredited,
                cpf: formData.cpf,
                rg: formData.rg,
                delivery_address: formData.delivery_address,
                client_code: formData.client_code,
                completed_courses: formData.completed_courses,
                zip_code: formData.zip_code,
                address_street: formData.address_street,
                address_number: formData.address_number,
                address_neighborhood: formData.address_neighborhood,
                address_city: formData.address_city,
                address_state: formData.address_state,
                pricing_level: formData.pricing_level
            };

            const isNew = !client?.id;
            const table = (client?.type === 'Credenciado' || client?.type === 'Mechanic') ? 'SITE_Mechanics' : 'SITE_Leads';

            let result;
            if (isNew) {
                // If new Lead, set default status
                if (table === 'SITE_Leads') {
                    updates.status = 'New';
                }
                result = await supabase.from(table).insert([updates]);
            } else {
                result = await supabase.from(table).update(updates).eq('id', client.id);
            }

            if (result.error) throw result.error;
            
            onUpdate();
            onClose();
            alert(isNew ? 'Cliente criado com sucesso!' : 'Cliente atualizado com sucesso!');
        } catch (error: any) {
            console.error(error);
            alert('Erro ao salvar: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const canAssign = permissions?.admin_access || permissions?.clients_view_all || permissions?.role === 'manager';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white dark:bg-[#1A1A1A] rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden animate-in zoom-in-95 border border-gray-100 dark:border-gray-800 flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-[#111]">
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${client.type === 'Credenciado' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                            <User size={24} />
                        </div>
                        <div>
                            <h3 className="font-black text-xl text-gray-900 dark:text-white uppercase tracking-tight">
                                {client?.id ? client.name : 'Novo Cliente'}
                            </h3>
                            <p className="text-xs text-gray-400 font-bold uppercase">
                                {client?.type || 'Lead'} {client?.id ? `• ID: ${client.id.slice(0, 8)}` : '• Novo Cadastro'}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-red-500">
                        <X size={24} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-100 dark:border-gray-800">
                    <button 
                        onClick={() => setActiveTab('details')}
                        className={`flex-1 py-4 text-sm font-black uppercase tracking-wider transition-all border-b-2 ${activeTab === 'details' ? 'border-wtech-gold text-wtech-black dark:text-white' : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`}
                    >
                        Dados do Cliente
                    </button>
                    <button 
                        onClick={() => setActiveTab('history')}
                        className={`flex-1 py-4 text-sm font-black uppercase tracking-wider transition-all border-b-2 ${activeTab === 'history' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`}
                    >
                        Histórico de Compras
                    </button>
                    <button 
                        onClick={() => setActiveTab('courses')}
                        className={`flex-1 py-4 text-sm font-black uppercase tracking-wider transition-all border-b-2 ${activeTab === 'courses' ? 'border-red-500 text-red-600 dark:text-red-400' : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`}
                    >
                        Cursos Realizados
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50 dark:bg-[#111]">
                    {activeTab === 'details' ? (
                        <div className="space-y-8">
                            
                            {/* Personal Info */}
                            <section>
                                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <User size={14} /> Informações Pessoais
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-gray-500">Nome Completo</label>
                                        <input type="text" value={formData.name} onChange={(e) => handleChange('name', e.target.value)} className="w-full p-3 bg-white dark:bg-[#222] border border-gray-200 dark:border-gray-800 rounded-xl text-sm font-medium focus:ring-2 focus:ring-wtech-gold outline-none transition-all" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-gray-500">Email</label>
                                        <input type="email" value={formData.email} onChange={(e) => handleChange('email', e.target.value)} className="w-full p-3 bg-white dark:bg-[#222] border border-gray-200 dark:border-gray-800 rounded-xl text-sm font-medium focus:ring-2 focus:ring-wtech-gold outline-none transition-all" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-gray-500">Telefone / WhatsApp</label>
                                        <input type="text" value={formData.phone} onChange={(e) => handleChange('phone', e.target.value)} className="w-full p-3 bg-white dark:bg-[#222] border border-gray-200 dark:border-gray-800 rounded-xl text-sm font-medium focus:ring-2 focus:ring-wtech-gold outline-none transition-all" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-gray-500">CPF</label>
                                        <input type="text" value={formData.cpf || ''} onChange={(e) => handleChange('cpf', e.target.value)} placeholder="000.000.000-00" className="w-full p-3 bg-white dark:bg-[#222] border border-gray-200 dark:border-gray-800 rounded-xl text-sm font-medium focus:ring-2 focus:ring-wtech-gold outline-none transition-all" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-gray-500">RG</label>
                                        <input type="text" value={formData.rg || ''} onChange={(e) => handleChange('rg', e.target.value)} placeholder="00.000.000-0" className="w-full p-3 bg-white dark:bg-[#222] border border-gray-200 dark:border-gray-800 rounded-xl text-sm font-medium focus:ring-2 focus:ring-wtech-gold outline-none transition-all" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-gray-500">Data de Nascimento</label>
                                        <div className="relative">
                                            <Calendar className="absolute left-3 top-3 text-gray-400" size={16} />
                                            <input type="date" value={formData.birth_date} onChange={(e) => handleChange('birth_date', e.target.value)} className="w-full p-3 pl-10 bg-white dark:bg-[#222] border border-gray-200 dark:border-gray-800 rounded-xl text-sm font-medium focus:ring-2 focus:ring-wtech-gold outline-none transition-all" />
                                        </div>
                                    </div>
                                    <div className="md:col-span-2 space-y-4 bg-gray-100/50 dark:bg-white/5 p-4 rounded-2xl border border-gray-200 dark:border-gray-800">
                                        <div className="flex items-center gap-2 mb-2">
                                            <MapPin size={16} className="text-wtech-gold" />
                                            <h5 className="text-xs font-black uppercase tracking-widest text-gray-700 dark:text-gray-300">Endereço Principal</h5>
                                        </div>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                                            <div className="md:col-span-2 space-y-1">
                                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">CEP</label>
                                                <div className="relative">
                                                    <input 
                                                        type="text" 
                                                        value={formData.zip_code} 
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            handleChange('zip_code', val);
                                                            if (val.replace(/\D/g, '').length === 8) handleCEPLookup(val, 'main');
                                                        }} 
                                                        placeholder="00000-000"
                                                        className="w-full p-3 bg-white dark:bg-[#222] border border-gray-200 dark:border-gray-800 rounded-xl text-sm font-bold focus:ring-2 focus:ring-wtech-gold outline-none transition-all" 
                                                    />
                                                    {formData.zip_code?.replace(/\D/g, '').length === 8 && (
                                                        <button 
                                                            onClick={() => handleCEPLookup(formData.zip_code, 'main')}
                                                            className="absolute right-2 top-2 p-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg"
                                                            title="Recarregar CEP"
                                                        >
                                                            <RefreshCw size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="md:col-span-3 space-y-1">
                                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">Rua / Logradouro</label>
                                                <input type="text" value={formData.address_street} onChange={(e) => handleChange('address_street', e.target.value)} className="w-full p-3 bg-white dark:bg-[#222] border border-gray-200 dark:border-gray-800 rounded-xl text-sm font-medium focus:ring-2 focus:ring-wtech-gold outline-none transition-all" />
                                            </div>
                                            <div className="md:col-span-1 space-y-1">
                                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">Nº</label>
                                                <input type="text" value={formData.address_number} onChange={(e) => handleChange('address_number', e.target.value)} className="w-full p-3 bg-white dark:bg-[#222] border border-gray-200 dark:border-gray-800 rounded-xl text-sm font-bold focus:ring-2 focus:ring-wtech-gold outline-none transition-all text-center" />
                                            </div>
                                            <div className="md:col-span-2 space-y-1">
                                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">Bairro</label>
                                                <input type="text" value={formData.address_neighborhood} onChange={(e) => handleChange('address_neighborhood', e.target.value)} className="w-full p-3 bg-white dark:bg-[#222] border border-gray-200 dark:border-gray-800 rounded-xl text-sm font-medium focus:ring-2 focus:ring-wtech-gold outline-none transition-all" />
                                            </div>
                                            <div className="md:col-span-3 space-y-1">
                                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">Cidade</label>
                                                <input type="text" value={formData.address_city} onChange={(e) => handleChange('address_city', e.target.value)} className="w-full p-3 bg-white dark:bg-[#222] border border-gray-200 dark:border-gray-800 rounded-xl text-sm font-medium focus:ring-2 focus:ring-wtech-gold outline-none transition-all" />
                                            </div>
                                            <div className="md:col-span-1 space-y-1">
                                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">UF</label>
                                                <input type="text" value={formData.address_state} onChange={(e) => handleChange('address_state', e.target.value)} className="w-full p-3 bg-white dark:bg-[#222] border border-gray-200 dark:border-gray-800 rounded-xl text-sm font-bold focus:ring-2 focus:ring-wtech-gold outline-none transition-all text-center uppercase" maxLength={2} />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="md:col-span-2 space-y-4 bg-blue-50/30 dark:bg-blue-900/5 p-4 rounded-2xl border border-blue-100 dark:border-blue-900/20">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Truck size={16} className="text-blue-500" />
                                            <h5 className="text-xs font-black uppercase tracking-widest text-gray-700 dark:text-gray-300">Endereço de Entrega (Opcional)</h5>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                                            <div className="md:col-span-2 space-y-1">
                                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">CEP Entrega</label>
                                                <div className="relative">
                                                    <input 
                                                        type="text" 
                                                        value={(formData.delivery_address as any)?.cep || ''} 
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            handleCEPLookup(val, 'delivery');
                                                        }} 
                                                        placeholder="00000-000"
                                                        className="w-full p-3 bg-white dark:bg-[#222] border border-gray-200 dark:border-gray-800 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                                                    />
                                                </div>
                                            </div>
                                            <div className="md:col-span-4 space-y-1">
                                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">Endereço de Entrega Completo</label>
                                                <input 
                                                    type="text" 
                                                    value={(formData.delivery_address as any)?.full_address || ''} 
                                                    onChange={(e) => handleChange('delivery_address', { ...formData.delivery_address as any, full_address: e.target.value })} 
                                                    placeholder="Rua, Número, Bairro, Cidade - UF"
                                                    className="w-full p-3 bg-white dark:bg-[#222] border border-gray-200 dark:border-gray-800 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Client Portal Code */}
                            <section className="bg-wtech-black/5 dark:bg-white/5 p-4 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h4 className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Código de Acesso do Cliente</h4>
                                        <p className="text-[10px] text-gray-400 mt-1">Utilizado para acesso ao portal do cliente (Meus Pedidos).</p>
                                    </div>
                                    <div className="text-right flex items-center gap-2">
                                        <p className={`text-lg font-black font-mono tracking-wider ${formData.client_code ? 'text-wtech-gold' : 'text-gray-400 italic text-sm'}`}>
                                            {formData.client_code || 'Não definido'}
                                        </p>
                                        <div className="flex gap-1">
                                            <button 
                                                onClick={handleRegenerateCode}
                                                className="bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400 px-2 py-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-white/20 transition-colors flex items-center gap-2"
                                                title="Gerar Novo Código"
                                            >
                                                <RefreshCw size={14} className={!formData.client_code ? 'animate-pulse text-blue-500' : ''} />
                                                {!formData.client_code && <span className="text-[10px] font-bold">GERAR</span>}
                                            </button>
                                            {formData.client_code && (
                                                <button 
                                                    onClick={handleCopyLink}
                                                    className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors flex items-center gap-1"
                                                    title="Copiar Link de Acesso"
                                                >
                                                    <Share2 size={14} /> Link
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Pricing Level Selection */}
                            <section className="bg-white dark:bg-[#1A1A1A] p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                                <h4 className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <CreditCard size={14} /> Nível de Preço no Catálogo
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    {[
                                        { id: 'retail', label: 'Final', desc: 'Preço Balcão / E-commerce', color: 'blue' },
                                        { id: 'partner', label: 'Credenciados', desc: 'Tabela para Parceiros', color: 'orange' },
                                        { id: 'distributor', label: 'Distribuidor', desc: 'Preço Atacado / Distribuidor', color: 'purple' }
                                    ].map(level => (
                                        <button
                                            key={level.id}
                                            onClick={() => handleChange('pricing_level', level.id)}
                                            className={`p-4 rounded-xl border-2 text-left transition-all ${formData.pricing_level === level.id ? `border-${level.color}-500 bg-${level.color}-50/50 dark:bg-${level.color}-900/10` : 'border-gray-100 dark:border-gray-800 bg-white dark:bg-transparent hover:border-gray-200'}`}
                                        >
                                            <div className="flex items-center justify-between mb-1">
                                                <span className={`text-[10px] font-black uppercase tracking-widest ${formData.pricing_level === level.id ? `text-${level.color}-600` : 'text-gray-400'}`}>{level.label}</span>
                                                {formData.pricing_level === level.id && <div className={`w-2 h-2 rounded-full bg-${level.color}-500 shadow-lg shadow-${level.color}-500/50`} />}
                                            </div>
                                            <p className="text-[10px] text-gray-400 font-medium leading-tight">{level.desc}</p>
                                        </button>
                                    ))}
                                </div>
                                <p className="text-[10px] text-gray-400 mt-3 italic font-medium">
                                    * Este nível define qual preço será sugerido automaticamente ao criar um novo pedido para este cliente.
                                </p>
                            </section>

                            {/* Attendant Assignment */}
                            <section className="bg-blue-50 dark:bg-blue-900/10 p-6 rounded-2xl border border-blue-100 dark:border-blue-900/30">
                                <h4 className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <UserCheck size={14} /> Atendente Responsável
                                </h4>
                                <div className="flex flex-col md:flex-row gap-4 items-center">
                                    {canAssign ? (
                                        <select 
                                            value={formData.assigned_to} 
                                            onChange={(e) => handleChange('assigned_to', e.target.value)} 
                                            className="w-full md:w-1/2 p-3 bg-white dark:bg-[#222] border border-blue-200 dark:border-blue-800 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        >
                                            <option value="">Sem Atendente Definido</option>
                                            {users.map(u => (
                                                <option key={u.id} value={u.id}>{u.name || u.full_name || u.email} ({u.role || 'User'})</option>
                                            ))}
                                        </select>
                                    ) : (
                                        <div className="w-full md:w-1/2 p-3 bg-white dark:bg-[#222] border border-blue-200 dark:border-blue-800 rounded-xl text-sm font-bold text-gray-500">
                                            {users.find(u => u.id === formData.assigned_to)?.name || users.find(u => u.id === formData.assigned_to)?.full_name || users.find(u => u.id === formData.assigned_to)?.email || 'Sem Atendente / Não Visível'}
                                        </div>
                                    )}
                                    <p className="text-xs text-blue-500 dark:text-blue-300 font-medium">
                                        {canAssign 
                                            ? 'O cliente ficará visível apenas para este atendente (e admins).' 
                                            : 'Este é o atendente responsável por este cliente.'}
                                    </p>
                                </div>
                            </section>

                            {/* Credential Status (Admin/Manager) */}
                            {canAssign && (
                                <section className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-[#222] dark:to-[#111] p-6 rounded-2xl border border-gray-100 dark:border-gray-800">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <h4 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                                                <Shield size={14} className={formData.is_accredited ? "text-blue-600" : "text-gray-400"} /> 
                                                Status de Credenciamento
                                            </h4>
                                            <p className="text-xs text-gray-500 mt-1">
                                                {formData.is_accredited 
                                                    ? 'Este cliente é um parceiro credenciado (Oficina).' 
                                                    : 'Cliente padrão ou Lead.'}
                                            </p>
                                        </div>
                                        <button 
                                            onClick={() => handleChange('is_accredited', !formData.is_accredited)}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                                                formData.is_accredited ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                                            }`}
                                        >
                                            <span
                                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                                    formData.is_accredited ? 'translate-x-6' : 'translate-x-1'
                                                }`}
                                            />
                                        </button>
                                    </div>
                                </section>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Event Info */}
                                <section>
                                    <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <Shirt size={14} /> Dados para Eventos
                                    </h4>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-gray-500">Tamanho da Camiseta</label>
                                        <select value={formData.t_shirt_size} onChange={(e) => handleChange('t_shirt_size', e.target.value)} className="w-full p-3 bg-white dark:bg-[#222] border border-gray-200 dark:border-gray-800 rounded-xl text-sm font-medium focus:ring-2 focus:ring-wtech-gold outline-none transition-all">
                                            <option value="">Selecione...</option>
                                            <option value="PP">PP</option>
                                            <option value="P">P</option>
                                            <option value="M">M</option>
                                            <option value="G">G</option>
                                            <option value="GG">GG</option>
                                            <option value="XG">XG</option>
                                        </select>
                                    </div>
                                </section>

                                {/* Workshop Info */}
                                <section>
                                    <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <Wrench size={14} /> Dados da Oficina
                                    </h4>
                                    <div className="space-y-4">
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-gray-500">Nome da Oficina</label>
                                            <input 
                                                type="text" 
                                                value={(formData.workshop_details as any)?.name || ''} 
                                                onChange={(e) => handleWorkshopChange('name', e.target.value)} 
                                                className="w-full p-3 bg-white dark:bg-[#222] border border-gray-200 dark:border-gray-800 rounded-xl text-sm font-medium focus:ring-2 focus:ring-wtech-gold outline-none transition-all" 
                                                placeholder="Nome Fantasia"
                                            />
                                        </div>
                                         <div className="space-y-1">
                                            <label className="text-xs font-bold text-gray-500">CNPJ (Opcional)</label>
                                            <input 
                                                type="text" 
                                                value={(formData.workshop_details as any)?.cnpj || ''} 
                                                onChange={(e) => handleWorkshopChange('cnpj', e.target.value)} 
                                                className="w-full p-3 bg-white dark:bg-[#222] border border-gray-200 dark:border-gray-800 rounded-xl text-sm font-medium focus:ring-2 focus:ring-wtech-gold outline-none transition-all" 
                                                placeholder="00.000.000/0000-00"
                                            />
                                        </div>
                                    </div>
                                </section>
                            </div>

                        </div>
                    ) : activeTab === 'history' ? (
                        <div className="space-y-4">
                            {loadingSales ? (
                                <p className="text-center text-gray-400 py-10 font-bold animate-pulse">Carregando histórico...</p>
                            ) : sales.length === 0 ? (
                                <div className="text-center py-10">
                                    <div className="w-16 h-16 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                                        <History size={32} />
                                    </div>
                                    <p className="text-gray-500 font-bold">Nenhuma compra registrada.</p>
                                </div>
                            ) : (
                                sales.map((sale, i) => (
                                    <div key={i} className="bg-white dark:bg-[#222] p-4 rounded-2xl border border-gray-100 dark:border-gray-800 flex justify-between items-center shadow-sm">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 flex items-center justify-center">
                                                <ShoppingBag size={20} />
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-900 dark:text-white">{sale.sale_summary || 'Venda'}</p>
                                                <p className="text-xs text-gray-400">{new Date(sale.created_at || sale.sale_date).toLocaleDateString('pt-BR')} • {sale.payment_method || 'PIX'}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-black text-lg text-green-600 dark:text-green-400">
                                                R$ {Number(sale.total_value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </p>
                                            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                                                sale.status === 'paid' ? 'bg-green-100 text-green-700' : 
                                                sale.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                                'bg-gray-100 text-gray-600'
                                            }`}>
                                                {sale.status || 'Pendente'}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Course Registration Form */}
                            <section className="bg-white dark:bg-[#222] p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <Plus size={14} /> Registrar Novo Curso Realizado
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-gray-500">Tipo de Curso</label>
                                        <select 
                                            value={newCourse.type} 
                                            onChange={(e) => setNewCourse({ ...newCourse, type: e.target.value })}
                                            className="w-full p-3 bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-gray-800 rounded-xl text-sm font-bold outline-none"
                                        >
                                            <option value="suspension">Curso de Suspensão</option>
                                            <option value="experience">W-Tech Experience</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-gray-500">Data de Realização</label>
                                        <input 
                                            type="date" 
                                            value={newCourse.date}
                                            onChange={(e) => setNewCourse({ ...newCourse, date: e.target.value })}
                                            className="w-full p-3 bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-gray-800 rounded-xl text-sm font-bold outline-none"
                                        />
                                    </div>
                                    <div className="flex items-end">
                                        <button 
                                            onClick={() => {
                                                if (!newCourse.date) return alert("Selecione a data.");
                                                handleChange('completed_courses', [...formData.completed_courses, { ...newCourse, id: Date.now() }]);
                                                setNewCourse({ type: 'suspension', date: '' });
                                            }}
                                            className="w-full bg-wtech-black dark:bg-white text-white dark:text-black py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-gray-800 transition-all shadow-md active:scale-95"
                                        >
                                            Adicionar Curso
                                        </button>
                                    </div>
                                </div>
                            </section>

                            {/* Completed Courses List */}
                            <section>
                                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <History size={14} /> Cursos Registrados
                                </h4>
                                {formData.completed_courses.length === 0 ? (
                                    <div className="bg-white/5 p-10 rounded-2xl border border-dashed border-gray-300 dark:border-gray-800 text-center">
                                        <p className="text-gray-400 font-bold text-sm">Nenhum curso registrado para este cliente.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {formData.completed_courses.map((course: any, idx: number) => (
                                            <div key={course.id || idx} className="bg-white dark:bg-[#222] p-4 rounded-2xl border border-gray-100 dark:border-gray-800 flex justify-between items-center shadow-sm">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 flex items-center justify-center">
                                                        <GraduationCap size={20} />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-gray-900 dark:text-white uppercase text-xs tracking-tight">
                                                            {course.type === 'experience' ? 'W-Tech Experience' : 'Curso de Suspensão'}
                                                        </p>
                                                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider">{new Date(course.date).toLocaleDateString('pt-BR')}</p>
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={() => handleChange('completed_courses', formData.completed_courses.filter((c: any, i: number) => (c.id ? c.id !== course.id : i !== idx)))}
                                                    className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-all"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <p className="text-[10px] text-gray-400 mt-4 italic font-medium">
                                    * Estes cursos aparecerão como certificados disponíveis no Portal do Cliente.
                                </p>
                            </section>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#111] flex justify-end gap-3">
                    <button 
                        onClick={onClose}
                        className="px-6 py-3 text-sm font-bold text-gray-500 hover:bg-gray-200 dark:hover:bg-white/5 rounded-xl transition-colors"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={handleSave}
                        disabled={loading}
                        className="bg-wtech-gold text-white px-8 py-3 rounded-xl font-black flex items-center gap-2 hover:bg-yellow-600 transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Salvando...' : 'Salvar Alterações'} <Save size={18} />
                    </button>
                </div>

            </div>
        </div>
    );
};
