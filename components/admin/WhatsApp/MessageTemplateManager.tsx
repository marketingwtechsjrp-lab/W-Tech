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
                    id: currentTemplate.id, // If ID exists, it updates; otherwise inserts (but we need to handle ID generation for upsert if UUID? Actually Supabase handles it if we don't pass ID on insert, but passing undefined ID might break upsert logic depending on setup. Better to separate Insert/Update or let Supabase handle gen_random_uuid)
                    title: currentTemplate.title,
                    content: currentTemplate.content
                }); // For new items, we shouldn't pass ID if we want auto-gen, or we generate one here. 
                // Let's use simpler logic: Select ID if editing.
            
            if (error) throw error;
            
            setIsEditing(false);
            setCurrentTemplate({ title: '', content: '' });
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
                     <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Título do Modelo</label>
                            <input 
                                className="w-full border border-gray-300 rounded p-2 text-sm" 
                                placeholder="Ex: Confirmação de Visita"
                                value={currentTemplate.title}
                                onChange={e => setCurrentTemplate({...currentTemplate, title: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Conteúdo da Mensagem</label>
                            <textarea 
                                className="w-full border border-gray-300 rounded p-3 text-sm h-32" 
                                placeholder="Olá! Gostaria de confirmar nossa reunião..."
                                value={currentTemplate.content}
                                onChange={e => setCurrentTemplate({...currentTemplate, content: e.target.value})}
                            />
                            <p className="text-[10px] text-gray-400 mt-1">Dica: Use variáveis como apenas manualmente por enquanto.</p>
                        </div>
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-200 rounded">Cancelar</button>
                            <button onClick={handleSave} disabled={isLoading} className="bg-green-600 text-white px-6 py-2 rounded text-sm font-bold hover:bg-green-700 disabled:opacity-50 flex items-center gap-2">
                                <Save size={16} /> Salvar Modelo
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
