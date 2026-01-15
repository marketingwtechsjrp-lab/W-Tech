import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { MarketingList, MessageTemplate, Lead } from '../../../types';
import { X, ArrowRight, ArrowLeft, Send, Users, FileText, CheckCircle, Smartphone, Mail, AlertTriangle } from 'lucide-react';

interface CampaignBuilderProps {
    onClose: () => void;
}

import { useAuth } from '../../../context/AuthContext';

const CampaignBuilder: React.FC<CampaignBuilderProps> = ({ onClose }) => {
    const { user } = useAuth();
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    
    // Data Sources
    const [lists, setLists] = useState<MarketingList[]>([]);
    const [templates, setTemplates] = useState<MessageTemplate[]>([]);
    
    // Form State
    const [formData, setFormData] = useState({
        name: '',
        channel: 'WhatsApp',
        listId: '',
        templateId: '',
        content: '',
        imageUrl: '',
        content2: '',
        throttling: { delay_seconds: 120, batch_size: 1 } // Default 2 mins to be safe
    });
    
    // Preview
    const [audienceCount, setAudienceCount] = useState<number | null>(null);

    useEffect(() => {
        const loadData = async () => {
             const { data: l } = await supabase.from('SITE_MarketingLists').select('*');
             if (l) setLists(l);
             
             const { data: t } = await supabase.from('SITE_MessageTemplates').select('*');
             if (t) setTemplates(t);
        };
        loadData();
    }, []);

    useEffect(() => {
        // Calculate Audience Size when list changes
        if (formData.listId) {
             calculateAudience(formData.listId);
        }
    }, [formData.listId]);

    const calculateAudience = async (listId: string) => {
        setAudienceCount(null);
        const list = lists.find(l => l.id === listId);
        if (!list) return;

        if (list.type === 'Static') {
            const { count } = await supabase.from('SITE_MarketingListMembers').select('*', { count: 'exact', head: true }).eq('list_id', listId);
            setAudienceCount(count || 0);
        } else {
            // Dynamic: need to simulate the query
            let query = supabase.from('SITE_Leads').select('*', { count: 'exact', head: true });
            
            if (list.rules?.status) query = query.eq('status', list.rules.status);
            if (list.rules?.course_id) {
                // Fetch course title for accurate simulation
                const { data: course } = await supabase.from('SITE_Courses').select('title').eq('id', list.rules.course_id).single();
                if (course?.title) {
                    query = query.ilike('context_id', `%${course.title}%`);
                } else {
                    query = query.eq('context_id', list.rules.course_id);
                }
            }
            
            const { count } = await query;
            setAudienceCount(count || 0);
        }
    };

    const handleCreateCampaign = async () => {
        if (!formData.name || !formData.listId) return alert('Preencha os campos obrigatórios');
        
        setIsLoading(true);
        try {
            // 1. Create Campaign
            const { data: campaign, error } = await supabase.from('SITE_MarketingCampaigns').insert([{
                name: formData.name,
                channel: formData.channel,
                status: 'Processing', // Start immediately for now (or 'Scheduled')
                list_id: formData.listId,
                template_id: formData.templateId || null,
                content: formData.content,
                imageUrl: formData.imageUrl || null,
                content2: formData.content2 || null,
                throttling_settings: formData.throttling,
                created_by: user?.id
            }]).select().single();

            if (error) throw error;
            if (!campaign) throw new Error('Falha ao criar campanha');

            // 2. Fetch Audience & Populate Queue
            const list = lists.find(l => l.id === formData.listId);
            let recipients: any[] = [];

            if (list?.type === 'Static') {
                const { data } = await supabase.from('SITE_MarketingListMembers').select('*').eq('list_id', list.id);
                recipients = data || [];
            } else {
                // Dynamic Fetch
                let query = supabase.from('SITE_Leads').select('*');
                
                if (list?.rules?.status) {
                     query = query.eq('status', list.rules.status);
                }

                if (list?.rules?.course_id) {
                    // Match Course Title because SITE_Leads.context_id is usually a string title, not UUID
                    const { data: course } = await supabase.from('SITE_Courses').select('title').eq('id', list.rules.course_id).single();
                    if (course?.title) {
                        // Use ilike for broader matching (e.g. "Curso suspensão" inside "Lead from Curso suspensão")
                        query = query.ilike('context_id', `%${course.title}%`);
                    } else {
                        // Fallback if course not found or title issues: try direct ID match just in case
                        query = query.eq('context_id', list.rules.course_id);
                    }
                }
                
                const { data, error: fetchError } = await query;
                if (fetchError) console.error("Error fetching leads for campaign:", fetchError);
                
                recipients = (data || []).map(lead => ({
                    recipient_name: lead.name,
                    recipient_phone: lead.phone,
                    recipient_email: lead.email,
                    lead_id: lead.id,
                    recipient_data: { 
                        status: lead.status,
                        tipo: lead.type,
                        origem: lead.context_id || 'Indefinida',
                        id: lead.id
                    } 
                }));
            }

            if (recipients.length === 0) {
                await supabase.from('SITE_MarketingCampaigns').delete().eq('id', campaign.id);
                throw new Error('Nenhum destinatário encontrado com os filtros selecionados.');
            }

            // 3. Batch Insert into Queue
            const queueItems = recipients.map(r => ({
                campaign_id: campaign.id,
                recipient_name: r.name || r.recipient_name,
                recipient_phone: r.phone || r.recipient_phone,
                recipient_email: r.email || r.recipient_email,
                recipient_data: {
                    ...(r.custom_data || r.customData || r.recipient_data || {}),
                    // Ensure core fields are also available as variables if needed
                    nome: r.name || r.recipient_name,
                    email: r.email || r.recipient_email,
                    telefone: r.phone || r.recipient_phone
                },
                status: 'Pending'
            }));

            // Insert in chunks of 100
            const chunkSize = 100;
            for (let i = 0; i < queueItems.length; i += chunkSize) {
                const chunk = queueItems.slice(i, i + chunkSize);
                const { error: qError } = await supabase.from('SITE_CampaignQueue').insert(chunk);
                if (qError) {
                    console.error('Queue error:', qError);
                    throw new Error('Falha ao inserir na fila: ' + qError.message);
                }
            }

            // Update stats total
            await supabase.from('SITE_MarketingCampaigns').update({ 
                total_recipients: queueItems.length,
                stats: { sent: 0, failed: 0, total: queueItems.length }
            }).eq('id', campaign.id);

            onClose(); // Will refresh parent

        } catch (error: any) {
            alert('Erro: ' + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <div>
                        <h3 className="font-bold text-xl text-gray-900">Nova Campanha</h3>
                        <div className="flex gap-2 mt-2">
                            {[1, 2, 3].map(i => (
                                <div key={i} className={`h-1.5 w-8 rounded-full ${step >= i ? 'bg-purple-600' : 'bg-gray-200'}`} />
                            ))}
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full"><X size={20} /></button>
                </div>

                {/* Content */}
                <div className="p-8 flex-1 overflow-y-auto">
                    
                    {/* Step 1: Config */}
                    {step === 1 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-8">
                            <div>
                                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Nome da Campanha</label>
                                <input 
                                    className="w-full border border-gray-300 rounded-lg p-3"
                                    placeholder="Ex: Lembrete Curso Offroad"
                                    value={formData.name}
                                    onChange={e => setFormData({...formData, name: e.target.value})}
                                />
                            </div>
                            
                            <div>
                                <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Canal de Envio</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <button 
                                        onClick={() => setFormData({...formData, channel: 'WhatsApp'})}
                                        className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${formData.channel === 'WhatsApp' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-100 hover:border-gray-200'}`}
                                    >
                                        <Smartphone size={24} />
                                        <span className="font-bold">WhatsApp</span>
                                    </button>
                                    <button 
                                        onClick={() => setFormData({...formData, channel: 'Email'})}
                                        className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${formData.channel === 'Email' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-100 hover:border-gray-200'}`}
                                    >
                                        <Mail size={24} />
                                        <span className="font-bold">Email</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Audience & Content */}
                    {step === 2 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-8">
                             <div>
                                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Selecione a Lista de Destino</label>
                                <select 
                                    className="w-full border border-gray-300 rounded-lg p-3"
                                    value={formData.listId}
                                    onChange={e => setFormData({...formData, listId: e.target.value})}
                                >
                                    <option value="">Selecione...</option>
                                    {lists.map(l => <option key={l.id} value={l.id}>{l.name} ({l.type})</option>)}
                                </select>
                                {formData.listId && (
                                    <div className="mt-2 text-sm text-purple-600 font-bold bg-purple-50 p-2 rounded inline-block">
                                        {audienceCount === null ? 'Calculando...' : `${audienceCount} destinatários estimados`}
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Modelo de Mensagem</label>
                                <select 
                                    className="w-full border border-gray-300 rounded-lg p-3"
                                    value={formData.templateId}
                                    onChange={e => {
                                        const t = templates.find(t => t.id === e.target.value);
                                        setFormData({
                                            ...formData, 
                                            templateId: e.target.value, 
                                            content: t?.content || '',
                                            imageUrl: t?.imageUrl || '',
                                            content2: t?.content2 || ''
                                        });
                                    }}
                                >
                                    <option value="">(Opcional) Selecione um modelo...</option>
                                    {templates.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                                </select>
                            </div>

                            <div className="space-y-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest border-b border-gray-200 pb-2">Conteúdo Sequencial</h4>
                                
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-blue-500 uppercase">1. Texto Inicial</label>
                                    <div className="text-[10px] text-gray-400 mb-1">Variáveis: {'{{nome}}'}, {'{{telefone}}'}, {'{{email}}'}, {'{{status}}'}, {'{{origem}}'}</div>
                                    <textarea 
                                        className="w-full border border-gray-200 rounded-lg p-3 text-sm h-24"
                                        value={formData.content}
                                        onChange={e => setFormData({...formData, content: e.target.value})}
                                        placeholder="Olá {{nome}}..."
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-purple-500 uppercase">2. Imagem (URL)</label>
                                    <input 
                                        className="w-full border border-gray-200 rounded-lg p-3 text-sm"
                                        placeholder="https://..."
                                        value={formData.imageUrl}
                                        onChange={e => setFormData({...formData, imageUrl: e.target.value})}
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-indigo-500 uppercase">3. Texto Final</label>
                                    <textarea 
                                        className="w-full border border-gray-200 rounded-lg p-3 text-sm h-24"
                                        value={formData.content2}
                                        onChange={e => setFormData({...formData, content2: e.target.value})}
                                        placeholder="Aguardo seu retorno!"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                     {/* Step 3: Throttling & Confirm */}
                     {step === 3 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-8">
                            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-xl flex gap-3 text-yellow-800">
                                <AlertTriangle className="shrink-0" />
                                <div className="text-sm">
                                    <p className="font-bold mb-1">Importante: Mantenha a aba aberta</p>
                                    <p>O envio será feito pelo seu navegador em intervalos para evitar bloqueios do WhatsApp.</p>
                                </div>
                            </div>

                             <div>
                                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Velocidade de Envio (Segurança)</label>
                                <select 
                                    className="w-full border border-gray-300 rounded-lg p-3"
                                    value={formData.throttling.delay_seconds}
                                    onChange={e => setFormData({...formData, throttling: {...formData.throttling, delay_seconds: Number(e.target.value)}})}
                                >
                                    <option value="60">Rápido (1 msg / min)</option>
                                    <option value="120">Normal (1 msg / 2 min)</option>
                                    <option value="180">Seguro (1 msg / 3 min)</option>
                                    <option value="300">Lento (1 msg / 5 min)</option>
                                </select>
                                <p className="text-xs text-gray-400 mt-1">Recomendamos 3 minutos para listas frias.</p>
                            </div>

                            <div className="border-t pt-4">
                                <h4 className="font-bold text-gray-700 mb-2">Resumo</h4>
                                <ul className="text-sm space-y-1 text-gray-600">
                                    <li>• <strong>Campanha:</strong> {formData.name}</li>
                                    <li>• <strong>Canal:</strong> {formData.channel}</li>
                                    <li>• <strong>Destinatários:</strong> ~{audienceCount}</li>
                                    <li>• <strong>Intervalo:</strong> {formData.throttling.delay_seconds} segundos</li>
                                </ul>
                            </div>
                        </div>
                    )}

                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
                    {step > 1 && (
                        <button 
                            onClick={() => setStep(step - 1)}
                            className="px-6 py-2 rounded-lg font-bold text-gray-500 hover:bg-gray-200"
                        >
                            Voltar
                        </button>
                    )}
                    
                    {step < 3 ? (
                        <button 
                            onClick={() => setStep(step + 1)}
                            disabled={!formData.name}
                            className="bg-black text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-gray-800 disabled:opacity-50"
                        >
                            Próximo <ArrowRight size={16} />
                        </button>
                    ) : (
                        <button 
                            onClick={handleCreateCampaign}
                            disabled={isLoading}
                            className="bg-purple-600 text-white px-8 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-purple-700 shadow-lg shadow-purple-200 disabled:opacity-50"
                        >
                            {isLoading ? 'Criando...' : 'Lançar Campanha'} <Send size={16} />
                        </button>
                    )}
                </div>

            </div>
        </div>
    );
};

export default CampaignBuilder;
