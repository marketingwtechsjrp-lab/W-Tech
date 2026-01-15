import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { MessageTemplate } from '../../../types';
import { Plus, Trash2, Save, FileText, X, Edit, MessageSquare } from 'lucide-react';

const MessageTemplateManager = () => {
    const [templates, setTemplates] = useState<MessageTemplate[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    
    // Form State
    const [currentTemplate, setCurrentTemplate] = useState<Partial<MessageTemplate>>({
        title: '',
        content: ''
    });

    useEffect(() => {
        fetchTemplates();
    }, []);

    const fetchTemplates = async () => {
        setIsLoading(true);
        const { data, error } = await supabase
            .from('SITE_MessageTemplates')
            .select('*')
            .order('title');
        
        if (data) {
            setTemplates(data);
        }
        setIsLoading(false);
    };

    const handleSave = async () => {
        if (!currentTemplate.title || !currentTemplate.content) return alert('Preencha título e conteúdo');
        
        setIsLoading(true);
        try {
            const { error } = await supabase
                .from('SITE_MessageTemplates')
                .upsert({
                    id: currentTemplate.id,
                    title: currentTemplate.title,
                    content: currentTemplate.content,
                    imageUrl: currentTemplate.imageUrl || null,
                    content2: currentTemplate.content2 || null
                });
            
            if (error) throw error;
            
            setIsEditing(false);
            setCurrentTemplate({ title: '', content: '', imageUrl: '', content2: '' });
            fetchTemplates();
        } catch (error: any) {
            alert('Erro ao salvar: ' + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Excluir este modelo?')) return;
        const { error } = await supabase.from('SITE_MessageTemplates').delete().eq('id', id);
        if (!error) fetchTemplates();
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                     <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                        <FileText className="text-orange-500" /> Modelos de Mensagem
                    </h3>
                    <p className="text-sm text-gray-500">Crie modelos para usar em agendamentos automáticos.</p>
                </div>
                {!isEditing && (
                    <button 
                        onClick={() => { setIsEditing(true); setCurrentTemplate({ title: '', content: '' }); }}
                        className="bg-wtech-black text-white px-4 py-2 rounded text-sm font-bold flex items-center gap-2 hover:bg-gray-800"
                    >
                        <Plus size={16} /> Novo Modelo
                    </button>
                )}
            </div>

            {isEditing && (
                <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 animate-in fade-in slide-in-from-top-4">
                     <div className="flex justify-between items-center mb-4">
                        <h4 className="font-bold text-gray-700">{currentTemplate.id ? 'Editar Modelo' : 'Novo Modelo'}</h4>
                        <button onClick={() => setIsEditing(false)}><X size={20} className="text-gray-400 hover:text-red-500" /></button>
                     </div>
                     <div className="space-y-6">
                        <div className="grid grid-cols-1 gap-4">
                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Título do Modelo</label>
                                <input 
                                    className="w-full border-2 border-gray-100 rounded-xl p-3 text-sm font-bold outline-none focus:border-blue-500 transition-all" 
                                    placeholder="Ex: Confirmação de Visita"
                                    value={currentTemplate.title}
                                    onChange={e => setCurrentTemplate({...currentTemplate, title: e.target.value})}
                                />
                            </div>

                            <div className="bg-white p-4 rounded-2xl border border-gray-100 space-y-4">
                                <div>
                                    <label className="flex items-center gap-2 text-[10px] font-black text-blue-500 uppercase tracking-widest mb-2">
                                        <span className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-[10px]">1</span> 
                                        Mensagem Inicial (Texto)
                                    </label>
                                    <textarea 
                                        className="w-full border border-gray-200 rounded-xl p-3 text-sm h-24 font-medium outline-none focus:ring-2 focus:ring-blue-500/20" 
                                        placeholder="Olá! Gostaria de confirmar nossa reunião..."
                                        value={currentTemplate.content}
                                        onChange={e => setCurrentTemplate({...currentTemplate, content: e.target.value})}
                                    />
                                </div>

                                <div>
                                    <label className="flex items-center gap-2 text-[10px] font-black text-purple-500 uppercase tracking-widest mb-2">
                                        <span className="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center text-[10px]">2</span> 
                                        Imagem (URL Directa)
                                    </label>
                                    <input 
                                        className="w-full border border-gray-200 rounded-xl p-3 text-sm font-medium outline-none focus:ring-2 focus:ring-purple-500/20" 
                                        placeholder="https://exemplo.com/foto.jpg"
                                        value={currentTemplate.imageUrl || ''}
                                        onChange={e => setCurrentTemplate({...currentTemplate, imageUrl: e.target.value})}
                                    />
                                </div>

                                <div>
                                    <label className="flex items-center gap-2 text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-2">
                                        <span className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center text-[10px]">3</span> 
                                        Mensagem Final (Texto)
                                    </label>
                                    <textarea 
                                        className="w-full border border-gray-200 rounded-xl p-3 text-sm h-24 font-medium outline-none focus:ring-2 focus:ring-indigo-500/20" 
                                        placeholder="Caso precise alterar, nos avise."
                                        value={currentTemplate.content2 || ''}
                                        onChange={e => setCurrentTemplate({...currentTemplate, content2: e.target.value})}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 p-2 pt-4 border-t border-gray-100">
                             <button onClick={() => setIsEditing(false)} className="px-6 py-2 text-sm font-bold text-gray-400 hover:text-gray-600">Cancelar</button>
                             <button onClick={handleSave} disabled={isLoading} className="bg-green-600 text-white px-8 py-3 rounded-xl text-sm font-black hover:bg-green-700 disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-green-100 transition-all active:scale-95">
                                 <Save size={18} /> Salvar Modelo
                             </button>
                        </div>
                     </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map(template => (
                    <div key={template.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow group relative">
                        <div className="flex justify-between items-start mb-2">
                            <h4 className="font-bold text-gray-800">{template.title}</h4>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                    onClick={() => { setCurrentTemplate(template); setIsEditing(true); }}
                                    className="p-1.5 hover:bg-blue-50 text-blue-500 rounded"
                                >
                                    <Edit size={14} />
                                </button>
                                <button 
                                    onClick={() => handleDelete(template.id)}
                                    className="p-1.5 hover:bg-red-50 text-red-500 rounded"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                        <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg border border-gray-100 h-24 overflow-y-auto whitespace-pre-wrap">
                            {template.content}
                        </div>
                    </div>
                ))}
            </div>
            {templates.length === 0 && !isLoading && !isEditing && (
                <div className="text-center py-10 text-gray-400">
                    <MessageSquare size={48} className="mx-auto mb-2 opacity-20" />
                    <p>Nenhum modelo de mensagem criado.</p>
                </div>
            )}
        </div>
    );
};

export default MessageTemplateManager;
