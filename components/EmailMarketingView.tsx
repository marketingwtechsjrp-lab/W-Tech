import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Plus, Search, Calendar, Users, Mail, Trash2, Edit, Send, Play, Pause, BarChart2, Eye, MousePointer, Clock, ArrowDown, ArrowUp, AlertCircle, Save, X } from 'lucide-react';
import { EmailCampaign, EmailSequence, SequenceStep, SystemConfig } from '../types';
import { useSettings } from '../context/SettingsContext';

const EmailMarketingView: React.FC = () => {
    const { settings: config } = useSettings();
    const [activeTab, setActiveTab] = useState<'Broadcast' | 'Automation'>('Broadcast');
    
    // Broadcast State
    const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
    const [loading, setLoading] = useState(true);
    const [showBroadcastModal, setShowBroadcastModal] = useState(false);
    const [editingCampaign, setEditingCampaign] = useState<Partial<EmailCampaign>>({});

    // Automation State
    const [sequences, setSequences] = useState<EmailSequence[]>([]);
    const [editingSequence, setEditingSequence] = useState<Partial<EmailSequence> | null>(null);
    const [sequenceSteps, setSequenceSteps] = useState<Partial<SequenceStep>[]>([]);
    const [showStepModal, setShowStepModal] = useState(false);
    const [editingStep, setEditingStep] = useState<Partial<SequenceStep>>({});

    useEffect(() => {
        if (activeTab === 'Broadcast') fetchCampaigns();
        if (activeTab === 'Automation') fetchSequences();
    }, [activeTab]);

    // --- Broadcast Logic ---
    const fetchCampaigns = async () => {
        setLoading(true);
        const { data } = await supabase.from('SITE_EmailCampaigns').select('*').order('created_at', { ascending: false });
        if (data) setCampaigns(data);
        setLoading(false);
    };

    const handleSaveCampaign = async () => {
        if (!editingCampaign.subject || !editingCampaign.name) return alert("Nome e Assunto são obrigatórios.");
        const payload = {
            name: editingCampaign.name,
            subject: editingCampaign.subject,
            content: editingCampaign.content || '',
            type: editingCampaign.type || 'Newsletter',
            target_audience: editingCampaign.targetAudience || 'All',
            status: editingCampaign.status || 'Draft',
        };
        if (editingCampaign.id) {
            await supabase.from('SITE_EmailCampaigns').update(payload).eq('id', editingCampaign.id);
        } else {
            await supabase.from('SITE_EmailCampaigns').insert([payload]);
        }
        setShowBroadcastModal(false);
        setEditingCampaign({});
        fetchCampaigns();
    };

    const handleDeleteCampaign = async (id: string) => {
        if (!confirm('Excluir campanha?')) return;
        await supabase.from('SITE_EmailCampaigns').delete().eq('id', id);
        fetchCampaigns();
    };

    const handleSendBroadcast = async (c: EmailCampaign) => {
        if (!confirm('Enviar agora?')) return;
        await supabase.from('SITE_EmailCampaigns').update({ status: 'Sending', sent_at: new Date().toISOString() }).eq('id', c.id);
        alert('Disparo iniciado!');
        fetchCampaigns();
    };

    // --- Automation Logic ---
    const fetchSequences = async () => {
        setLoading(true);
        const { data } = await supabase.from('SITE_EmailSequences').select('*').order('created_at', { ascending: false });
        if (data) setSequences(data);
        setLoading(false);
    };

    const handleEditSequence = async (seq: EmailSequence) => {
        setEditingSequence(seq);
        // Fetch Steps
        const { data } = await supabase.from('SITE_SequenceSteps').select('*').eq('sequence_id', seq.id).order('step_order', { ascending: true });
        
        // Map DB fields to Type
        const mappedSteps = (data || []).map((s: any) => ({
            id: s.id,
            sequenceId: s.sequence_id,
            stepOrder: s.step_order,
            type: s.type,
            delayValue: s.delay_value,
            delayUnit: s.delay_unit,
            emailSubject: s.email_subject,
            emailContent: s.email_content
        }));
        
        setSequenceSteps(mappedSteps);
    };

    const handleSaveSequenceHeader = async () => {
        if (!editingSequence?.name) return alert('Nome é obrigatório');
        
        let seqId = editingSequence.id;
        const payload = {
            name: editingSequence.name,
            trigger_type: editingSequence.triggerType || 'Manual', 
            status: editingSequence.status || 'Draft'
        };

        if (seqId) {
            await supabase.from('SITE_EmailSequences').update(payload).eq('id', seqId);
        } else {
            const { data, error } = await supabase.from('SITE_EmailSequences').insert([payload]).select().single();
            if (error) return alert(error.message);
            seqId = data.id;
            setEditingSequence({ ...payload, id: seqId });
        }
        
        // Save Steps
        // Delete all and re-insert is easiest for reordering, but optimized is upsert. 
        // For simplicity: delete all steps for this sequence and re-insert current state
        if (seqId && sequenceSteps.length > 0) {
            await supabase.from('SITE_SequenceSteps').delete().eq('sequence_id', seqId);
            
            const stepsPayload = sequenceSteps.map((s, idx) => ({
                sequence_id: seqId,
                step_order: idx + 1,
                type: s.type,
                delay_value: s.delayValue || 0,
                delay_unit: s.delayUnit || 'Days',
                email_subject: s.emailSubject || null,
                email_content: s.emailContent || null
            }));
            
            const { error: stepsError } = await supabase.from('SITE_SequenceSteps').insert(stepsPayload);
            if (stepsError) alert('Erro ao salvar passos: ' + stepsError.message);
        } else if (seqId) {
             await supabase.from('SITE_SequenceSteps').delete().eq('sequence_id', seqId);
        }

        alert('Sequência Salva com Sucesso!');
        setEditingSequence(null);
        fetchSequences();
    };

    const addStep = (type: 'Email' | 'Delay') => {
        setEditingStep({ type });
        setShowStepModal(true);
    };

    const confirmAddStep = () => {
        setSequenceSteps([...sequenceSteps, { ...editingStep, stepOrder: sequenceSteps.length + 1 }]);
        setShowStepModal(false);
        setEditingStep({});
    };

    const removeStep = (index: number) => {
        const newSteps = [...sequenceSteps];
        newSteps.splice(index, 1);
        setSequenceSteps(newSteps);
    };

    const moveStep = (index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === sequenceSteps.length - 1) return;
        
        const newSteps = [...sequenceSteps];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        const temp = newSteps[targetIndex];
        newSteps[targetIndex] = newSteps[index];
        newSteps[index] = temp;
        setSequenceSteps(newSteps);
    };

    const handleTestAutomation = async (seqId: string) => {
        const email = prompt("Digite o email para teste (simulação):", "teste@wtech.com");
        if (!email) return;

        // Create enrollment
        await supabase.from('SITE_SequenceEnrollments').insert({
            sequence_id: seqId,
            user_email: email,
            current_step_order: 0,
            status: 'Active'
        });

        alert(`Usuário ${email} inscrito na sequência! O sistema processará os passos automaticamente.`);
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            {/* Header / Tabs */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-200 pb-4">
                <div>
                    <h2 className="text-3xl font-black text-gray-900 tracking-tight">Email Marketing</h2>
                    <p className="text-gray-500 mt-1">Gerencie campanhas e automações.</p>
                </div>
                <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button 
                        onClick={() => setActiveTab('Broadcast')}
                        className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'Broadcast' ? 'bg-white shadow text-black' : 'text-gray-500 hover:text-black'}`}
                    >
                        Campanhas (Broadcast)
                    </button>
                    <button 
                        onClick={() => setActiveTab('Automation')}
                        className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'Automation' ? 'bg-white shadow text-black' : 'text-gray-500 hover:text-black'}`}
                    >
                        Automações (Workflow)
                    </button>
                </div>
            </div>

            {/* SMTP Alert */}
            {!config.email_smtp_host && (
                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg flex items-center gap-3 text-yellow-800 text-sm">
                    <AlertCircle size={16} />
                    <strong>SMTP não configurado!</strong> Configure o SMTP nas Configurações para envios reais.
                </div>
            )}

            {/* --- BROADCAST TAB --- */}
            {activeTab === 'Broadcast' && (
                <div className="space-y-4">
                    <div className="flex justify-end">
                        <button onClick={() => { setEditingCampaign({}); setShowBroadcastModal(true); }} className="bg-wtech-black text-white px-4 py-2 rounded-lg font-bold text-xs uppercase flex items-center gap-2 hover:bg-gray-800">
                            <Plus size={16} /> Nova Campanha
                        </button>
                    </div>

                    <div className="grid gap-4">
                        {campaigns.map(c => (
                            <div key={c.id} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex justify-between items-center group hover:shadow-md transition-all">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${c.status === 'Sent' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{c.status}</span>
                                        <h3 className="font-bold text-gray-900">{c.name}</h3>
                                    </div>
                                    <p className="text-sm text-gray-500">{c.subject}</p>
                                </div>
                                <div className="flex gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                    {c.status === 'Draft' && (
                                        <>
                                            <button onClick={() => { setEditingCampaign(c); setShowBroadcastModal(true); }} className="p-2 hover:bg-gray-100 rounded text-gray-600"><Edit size={16}/></button>
                                            <button onClick={() => handleSendBroadcast(c)} className="p-2 hover:bg-green-50 rounded text-green-600"><Play size={16}/></button>
                                        </>
                                    )}
                                    <button onClick={() => handleDeleteCampaign(c.id)} className="p-2 hover:bg-red-50 rounded text-red-500"><Trash2 size={16}/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* --- AUTOMATION TAB --- */}
            {activeTab === 'Automation' && !editingSequence && (
                <div className="space-y-4">
                    <div className="flex justify-end">
                        <button onClick={() => { setEditingSequence({}); setSequenceSteps([]); }} className="bg-wtech-black text-white px-4 py-2 rounded-lg font-bold text-xs uppercase flex items-center gap-2 hover:bg-gray-800">
                            <Plus size={16} /> Nova Automação
                        </button>
                    </div>
                    <div className="grid gap-4">
                        {sequences.map(s => (
                            <div key={s.id} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex justify-between items-center group hover:shadow-md transition-all">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                         <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${s.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{s.status}</span>
                                        <h3 className="font-bold text-gray-900">{s.name}</h3>
                                    </div>
                                    <p className="text-xs text-gray-500 font-mono">Gatilho: {s.triggerType}</p>
                                </div>
                                <div className="flex gap-2">
                                     <button onClick={() => handleTestAutomation(s.id)} className="px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-bold uppercase rounded border border-blue-200 hover:bg-blue-100">Testar</button>
                                    <button onClick={() => handleEditSequence(s)} className="p-2 hover:bg-gray-100 rounded text-gray-600"><Edit size={16}/></button>
                                    {/* Delete Implementation Skipped for Brevity on UI but similar to Broadcast */}
                                </div>
                            </div>
                        ))}
                         {sequences.length === 0 && !loading && <div className="text-center py-10 text-gray-400">Nenhuma automação criada.</div>}
                    </div>
                </div>
            )}

            {/* --- AUTOMATION BUILDER --- */}
            {activeTab === 'Automation' && editingSequence && (
                <div className="space-y-6">
                    {/* Toolbar */}
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-4 w-full md:w-auto">
                            <button onClick={() => setEditingSequence(null)} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
                            <input 
                                className="font-bold text-lg border-b border-transparent hover:border-gray-300 focus:border-wtech-gold outline-none bg-transparent" 
                                placeholder="Nome da Sequência"
                                value={editingSequence.name || ''}
                                onChange={e => setEditingSequence({...editingSequence, name: e.target.value})}
                            />
                        </div>
                        <div className="flex items-center gap-3">
                             <select 
                                className="bg-gray-50 border border-gray-200 text-sm rounded-lg p-2"
                                value={editingSequence.triggerType || 'Manual'}
                                onChange={e => setEditingSequence({...editingSequence, triggerType: e.target.value as any})}
                            >
                                <option value="Manual">Gatilho Manual</option>
                                <option value="OnSignup">Ao Cadastrar (Novo Aluno)</option>
                            </select>
                            <select 
                                className="bg-gray-50 border border-gray-200 text-sm rounded-lg p-2"
                                value={editingSequence.status || 'Draft'}
                                onChange={e => setEditingSequence({...editingSequence, status: e.target.value as any})}
                            >
                                <option value="Draft">Rascunho</option>
                                <option value="Active">Ativa</option>
                                <option value="Paused">Pausada</option>
                            </select>
                            <button onClick={handleSaveSequenceHeader} className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold text-xs uppercase flex items-center gap-2 hover:bg-green-700 shadow shadow-green-200">
                                <Save size={16} /> Salvar Sequência
                            </button>
                        </div>
                    </div>

                    {/* Timeline Builder */}
                    <div className="bg-gray-50 p-8 rounded-2xl border border-gray-200 border-dashed min-h-[400px] flex flex-col items-center">
                        <div className="bg-gray-800 text-white px-4 py-2 rounded-full text-xs font-bold uppercase mb-8 shadow-lg z-10">
                            Início (Gatilho: {editingSequence.triggerType || 'Manual'})
                        </div>

                        {/* Steps Loop */}
                        {sequenceSteps.map((step, idx) => (
                            <div key={idx} className="flex flex-col items-center w-full max-w-lg relative group">
                                {/* Vertical Line */}
                                <div className="w-0.5 h-8 bg-gray-300"></div>

                                {/* Step Card */}
                                <div className="bg-white w-full p-4 rounded-xl border border-gray-200 shadow-sm relative hover:shadow-md hover:border-wtech-gold transition-all">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${step.type === 'Email' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
                                                {step.type === 'Email' ? <Mail size={20} /> : <Clock size={20} />}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-gray-900">{step.type === 'Email' ? 'Enviar Email' : 'Aguardar'}</h4>
                                                <p className="text-xs text-gray-500">
                                                    {step.type === 'Email' ? (step.emailSubject || 'Sem Assunto') : `${step.delayValue} ${step.delayUnit}`}
                                                </p>
                                            </div>
                                        </div>
                                        
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => moveStep(idx, 'up')} className="p-1 hover:bg-gray-100 rounded"><ArrowUp size={14}/></button>
                                            <button onClick={() => moveStep(idx, 'down')} className="p-1 hover:bg-gray-100 rounded"><ArrowDown size={14}/></button>
                                            <button onClick={() => removeStep(idx)} className="p-1 hover:bg-red-50 text-red-500 rounded"><Trash2 size={14}/></button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}

                         {/* Add Step Button */}
                         <div className="w-0.5 h-8 bg-gray-300"></div>
                         <div className="flex gap-2">
                            <button onClick={() => addStep('Email')} className="bg-white border border-gray-300 text-gray-600 px-4 py-2 rounded-full text-xs font-bold uppercase hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all flex items-center gap-2 shadow-sm">
                                <Plus size={14} /> Email
                            </button>
                            <button onClick={() => addStep('Delay')} className="bg-white border border-gray-300 text-gray-600 px-4 py-2 rounded-full text-xs font-bold uppercase hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 transition-all flex items-center gap-2 shadow-sm">
                                <Clock size={14} /> Atraso (Delay)
                            </button>
                         </div>
                    </div>
                </div>
            )}

            {/* Modals for Adding/Editing Steps */}
            {showStepModal && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
                        <h3 className="text-lg font-bold mb-4">{editingStep.type === 'Email' ? 'Configurar Email' : 'Configurar Atraso'}</h3>
                        
                        {editingStep.type === 'Email' ? (
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Assunto</label>
                                    <input className="w-full border p-2 rounded" value={editingStep.emailSubject || ''} onChange={e => setEditingStep({...editingStep, emailSubject: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Conteúdo</label>
                                    <textarea className="w-full h-32 border p-2 rounded text-xs font-mono" value={editingStep.emailContent || ''} onChange={e => setEditingStep({...editingStep, emailContent: e.target.value})} />
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Valor</label>
                                    <input type="number" className="w-full border p-2 rounded" value={editingStep.delayValue || 1} onChange={e => setEditingStep({...editingStep, delayValue: parseInt(e.target.value)})} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Unidade</label>
                                    <select className="w-full border p-2 rounded bg-white" value={editingStep.delayUnit || 'Days'} onChange={e => setEditingStep({...editingStep, delayUnit: e.target.value as any})}>
                                        <option value="Hours">Horas</option>
                                        <option value="Days">Dias</option>
                                    </select>
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end gap-2 mt-6">
                            <button onClick={() => setShowStepModal(false)} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded font-bold">Cancelar</button>
                            <button onClick={confirmAddStep} className="px-4 py-2 bg-black text-white rounded font-bold">Adicionar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Broadcast Modal (Simplified Reuse) */}
            {showBroadcastModal && (
                 <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
                        <h3 className="text-xl font-bold mb-4">Nova Campanha (Broadcast)</h3>
                        <div className="space-y-4">
                            <input className="w-full border p-2 rounded" placeholder="Nome Interno" value={editingCampaign.name || ''} onChange={e => setEditingCampaign({...editingCampaign, name: e.target.value})} />
                            <input className="w-full border p-2 rounded" placeholder="Assunto do Email" value={editingCampaign.subject || ''} onChange={e => setEditingCampaign({...editingCampaign, subject: e.target.value})} />
                            <textarea className="w-full h-40 border p-2 rounded text-xs" placeholder="HTML Content" value={editingCampaign.content || ''} onChange={e => setEditingCampaign({...editingCampaign, content: e.target.value})} />
                            <div className="flex justify-end gap-2">
                                <button onClick={() => setShowBroadcastModal(false)} className="px-4 py-2 text-gray-600 font-bold">Cancelar</button>
                                <button onClick={handleSaveCampaign} className="px-4 py-2 bg-black text-white rounded font-bold">Salvar</button>
                            </div>
                        </div>
                    </div>
                 </div>
            )}
        </div>
    );
};

export default EmailMarketingView;
