import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { MarketingList, MessageTemplate, Lead } from '../../../types';
import { X, ArrowRight, ArrowLeft, Send, Users, FileText, CheckCircle, Smartphone, Mail, AlertTriangle } from 'lucide-react';

interface CampaignBuilderProps {
    onClose: () => void;
    permissions?: any;
}

import { useAuth } from '../../../context/AuthContext';

const CampaignBuilder: React.FC<CampaignBuilderProps> = ({ onClose, permissions }) => {
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
        part_delay: 0,
        throttling: { delay_seconds: 120, batch_size: 1 } // Default 2 mins to be safe
    });
    
    // Preview
    const [audienceCount, setAudienceCount] = useState<number | null>(null);

    useEffect(() => {
        const loadData = async () => {
             const isAdmin = permissions?.admin_access || permissions?.manage_marketing;
             
             let listQuery = supabase.from('SITE_MarketingLists').select('*');
             // Filter lists to show ONLY the user's own lists, per request
             if (user?.id) {
                 listQuery = listQuery.eq('owner_id', user.id);
             }
             const { data: l } = await listQuery;
             if (l) setLists(l);
             
             let templateQuery = supabase.from('SITE_MessageTemplates').select('*');
             // Templates are usually shared, but user asked for campaigns/lists. 
             // I'll leave templates global unless asked otherwise.
             const { data: t } = await templateQuery;
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
                part_delay: formData.part_delay || 0,
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
            <div className="bg-white dark:bg-[#1A1A1A] rounded-2xl shadow-xl w-full max-w-5xl mx-auto border border-gray-100 dark:border-gray-800 flex flex-col h-[85vh] animate-in zoom-in-95">
                
                {/* Fixed Header */}
                <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-[#222]">
                    <div>
                        <h3 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                            Nova Campanha
                        </h3>
                        <div className="flex gap-2 mt-2">
                            {[1, 2, 3].map(i => (
                                <div key={i} className={`h-1.5 w-8 rounded-full transition-colors ${step >= i ? 'bg-purple-600 dark:bg-purple-500' : 'bg-gray-200 dark:bg-gray-700'}`} />
                            ))}
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-[#333] rounded-full text-gray-400 hover:text-red-500 transition-all">
                        <X size={24} />
                    </button>
                </div>

                {/* Content with scroll */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    
                    {/* Step 1: Config */}
                    {step === 1 && (
                        <div className="space-y-6 animate-in slide-in-from-right-4">
                            <div className="space-y-2">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Nome da Campanha</label>
                                <input 
                                    type="text" 
                                    className="w-full bg-gray-50 dark:bg-[#222] border-2 border-transparent focus:border-purple-500 focus:bg-white dark:focus:bg-[#1A1A1A] rounded-2xl px-6 py-4 text-lg font-bold outline-none transition-all dark:text-white"
                                    placeholder="Ex: Promoção de Natal 2024"
                                    value={formData.name}
                                    onChange={e => setFormData({...formData, name: e.target.value})}
                                    autoFocus
                                />
                            </div>
                            
                            <div className="space-y-2">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Canal de Envio</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <button 
                                        onClick={() => setFormData({...formData, channel: 'WhatsApp'})}
                                        className={`p-6 rounded-2xl border-2 flex flex-col items-center gap-3 transition-all ${formData.channel === 'WhatsApp' ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 shadow-xl shadow-green-100 dark:shadow-none' : 'border-gray-100 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-400 hover:bg-gray-50 dark:hover:bg-[#222]'}`}
                                    >
                                        <Smartphone size={32} />
                                        <span className="font-black uppercase tracking-tight">WhatsApp</span>
                                    </button>
                                    <button 
                                        onClick={() => setFormData({...formData, channel: 'Email'})} // Assuming Email logic exists or is planned
                                        disabled // Disabled based on previous code usually disable email
                                        className={`p-6 rounded-2xl border-2 border-gray-100 dark:border-gray-800 flex flex-col items-center gap-3 text-gray-300 dark:text-gray-600 cursor-not-allowed grayscale bg-gray-50 dark:bg-[#222]/50`}
                                    >
                                        <Mail size={32} />
                                        <span className="font-black uppercase tracking-tight">Email (Em breve)</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Audience & Content */}
                    {step === 2 && (
                        <div className="space-y-6 animate-in slide-in-from-right-4">
                             <div className="space-y-2">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Selecione a Lista de Destino</label>
                                <select 
                                    className="w-full bg-gray-50 dark:bg-[#222] border-2 border-transparent focus:border-purple-500 focus:bg-white dark:focus:bg-[#1A1A1A] rounded-2xl px-6 py-4 text-lg font-bold outline-none transition-all dark:text-white"
                                    value={formData.listId}
                                    onChange={e => setFormData({...formData, listId: e.target.value})}
                                >
                                    <option value="">Selecione...</option>
                                    {lists.map(l => <option key={l.id} value={l.id}>{l.name} ({l.type})</option>)}
                                </select>
                                {formData.listId && (
                                    <div className="mt-2 text-sm text-purple-600 dark:text-purple-400 font-bold bg-purple-50 dark:bg-purple-900/20 p-2 rounded-lg inline-block shadow-sm">
                                        {audienceCount === null ? 'Calculando...' : `${audienceCount} destinatários estimados`}
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Modelo de Mensagem</label>
                                <select 
                                    className="w-full bg-gray-50 dark:bg-[#222] border-2 border-transparent focus:border-purple-500 focus:bg-white dark:focus:bg-[#1A1A1A] rounded-2xl px-6 py-4 text-lg font-bold outline-none transition-all dark:text-white"
                                    value={formData.templateId}
                                    onChange={e => {
                                        const t = templates.find(t => t.id === e.target.value);
                                        setFormData({
                                            ...formData, 
                                            templateId: e.target.value, 
                                            content: t?.content || '',
                                            imageUrl: t?.imageUrl || '',
                                            content2: t?.content2 || '',
                                            part_delay: t?.part_delay || 0
                                        });
                                    }}
                                >
                                    <option value="">(Opcional) Selecione um modelo...</option>
                                    {templates.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                                </select>
                            </div>

                            <div className="space-y-4 bg-gray-50 dark:bg-[#222] p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-inner">
                                <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 pb-2 mb-2">
                                    <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest ">Conteúdo Sequencial</h4>
                                    <div className="flex items-center gap-2">
                                        <label className="text-[9px] font-black text-gray-400 uppercase">Intervalo entre partes (Seg)</label>
                                        <input 
                                            type="number" 
                                            min="0"
                                            max="60"
                                            className="w-16 border border-gray-200 dark:border-gray-700 rounded p-1 text-xs font-bold bg-white dark:bg-[#1A1A1A] text-gray-900 dark:text-white text-center"
                                            value={formData.part_delay || 0}
                                            onChange={e => setFormData({...formData, part_delay: parseInt(e.target.value) || 0})}
                                        />
                                    </div>
                                </div>
                                
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-blue-500 uppercase flex justify-between">
                                        <span>1. Texto Inicial</span>
                                        <span className="text-gray-400 font-medium normal-case">Variáveis: {'{{nome}}'}, {'{{telefone}}'}...</span>
                                    </label>
                                    <textarea 
                                        className="w-full bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-sm font-medium h-32 outline-none focus:ring-2 focus:ring-blue-500/20 dark:text-white transition-all shadow-sm"
                                        value={formData.content}
                                        onChange={e => setFormData({...formData, content: e.target.value})}
                                        placeholder="Olá {{nome}}..."
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-purple-500 uppercase">2. Imagem (URL)</label>
                                    <input 
                                        className="w-full bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-sm font-medium outline-none focus:ring-2 focus:ring-purple-500/20 dark:text-white transition-all shadow-sm"
                                        placeholder="https://..."
                                        value={formData.imageUrl}
                                        onChange={e => setFormData({...formData, imageUrl: e.target.value})}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-indigo-500 uppercase">3. Texto Final</label>
                                    <textarea 
                                        className="w-full bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-sm font-medium h-24 outline-none focus:ring-2 focus:ring-indigo-500/20 dark:text-white transition-all shadow-sm"
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
                        <div className="space-y-6 animate-in slide-in-from-right-4">
                            <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-4 rounded-r-xl flex gap-4 text-yellow-800 dark:text-yellow-300 shadow-sm">
                                <AlertTriangle className="shrink-0" />
                                <div className="text-sm">
                                    <p className="font-bold mb-1 text-base">Importante: Mantenha a aba aberta</p>
                                    <p className="opacity-90">O envio será feito pelo seu navegador em intervalos para evitar bloqueios do WhatsApp.</p>
                                </div>
                            </div>

                             <div className="space-y-2">
                                <label className="block text-xs font-black uppercase text-gray-500 dark:text-gray-400 mb-1 tracking-widest ml-1">Velocidade de Envio (Segurança)</label>
                                <select 
                                    className="w-full bg-gray-50 dark:bg-[#222] border-2 border-transparent focus:border-purple-500 focus:bg-white dark:focus:bg-[#1A1A1A] rounded-2xl p-4 text-lg font-bold outline-none transition-all dark:text-white"
                                    value={formData.throttling.delay_seconds}
                                    onChange={e => setFormData({...formData, throttling: {...formData.throttling, delay_seconds: Number(e.target.value)}})}
                                >
                                    <option value="60">Rápido (1 msg / min)</option>
                                    <option value="120">Normal (1 msg / 2 min)</option>
                                    <option value="180">Seguro (1 msg / 3 min)</option>
                                    <option value="300">Lento (1 msg / 5 min)</option>
                                </select>
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 ml-1 font-medium"> Recomendamos 3 minutos para listas frias.</p>
                            </div>

                            <div className="border-t border-gray-100 dark:border-gray-800 pt-6">
                                <h4 className="font-black text-gray-900 dark:text-white mb-4 text-lg">Resumo da Campanha</h4>
                                <ul className="space-y-3 text-sm">
                                    <li className="flex justify-between items-center p-3 bg-gray-50 dark:bg-[#222] rounded-xl">
                                        <span className="text-gray-500 dark:text-gray-400">Campanha</span>
                                        <strong className="text-gray-900 dark:text-white">{formData.name}</strong>
                                    </li>
                                    <li className="flex justify-between items-center p-3 bg-gray-50 dark:bg-[#222] rounded-xl">
                                        <span className="text-gray-500 dark:text-gray-400">Canal</span>
                                        <strong className="text-gray-900 dark:text-white">{formData.channel}</strong>
                                    </li>
                                    <li className="flex justify-between items-center p-3 bg-gray-50 dark:bg-[#222] rounded-xl">
                                        <span className="text-gray-500 dark:text-gray-400">Destinatários estimados</span>
                                        <strong className="text-purple-600 dark:text-purple-400">{audienceCount}</strong>
                                    </li>
                                    <li className="flex justify-between items-center p-3 bg-gray-50 dark:bg-[#222] rounded-xl">
                                        <span className="text-gray-500 dark:text-gray-400">Intervalo de envio</span>
                                        <strong className="text-gray-900 dark:text-white">{formData.throttling.delay_seconds} segundos</strong>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    )}

                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3 bg-gray-50 dark:bg-[#222] rounded-b-2xl">
                    {step > 1 && (
                        <button 
                            onClick={() => setStep(step - 1)}
                            className="px-6 py-3 rounded-xl font-bold text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#333] transition-all"
                        >
                            Voltar
                        </button>
                    )}
                    
                    {step < 3 ? (
                        <button 
                            onClick={() => setStep(step + 1)}
                            disabled={!formData.name}
                            className="bg-black text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200 transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:transform-none"
                        >
                            Próximo <ArrowRight size={18} />
                        </button>
                    ) : (
                        <button 
                            onClick={handleCreateCampaign}
                            disabled={isLoading}
                            className="bg-purple-600 text-white px-8 py-3 rounded-xl font-black uppercase tracking-wider flex items-center gap-2 hover:bg-purple-700 shadow-xl shadow-purple-200 dark:shadow-none transition-all active:scale-95 disabled:opacity-50"
                        >
                            {isLoading ? 'Criando...' : 'Lançar Campanha'} <Send size={18} />
                        </button>
                    )}
                </div>

            </div>
        </div>
    );
};

export default CampaignBuilder;
