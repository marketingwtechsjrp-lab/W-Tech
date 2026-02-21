import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { MessageTemplate } from '../../../types';
import { Plus, Trash2, Save, FileText, X, Edit, MessageSquare } from 'lucide-react';

const MessageTemplateManager = ({ permissions }: { permissions?: any }) => {
    const hasPerm = (key: string) => {
        if (!permissions) return true;
        if (permissions.admin_access) return true;
        return !!permissions[key] || !!permissions['manage_marketing'];
    };

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
                    content2: currentTemplate.content2 || null,
                    part_delay: currentTemplate.part_delay || 0
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
                     <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                        <FileText className="text-orange-500" /> Modelos de Mensagem
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Crie modelos para usar em agendamentos automáticos.</p>
                </div>
                {!isEditing && hasPerm('marketing_manage_templates') && (
                    <button 
                        onClick={() => { setIsEditing(true); setCurrentTemplate({ title: '', content: '' }); }}
                        className="bg-black text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200 transition-all shadow-lg active:scale-95"
                    >
                        <Plus size={16} /> Novo Modelo
                    </button>
                )}
            </div>

            {/* Editor (Modal or Inline) */}
            {isEditing && (
                <div className="bg-white dark:bg-[#1A1A1A] rounded-2xl border-2 border-wtech-gold/20 dark:border-wtech-gold/10 p-8 mb-8 shadow-2xl animate-in zoom-in-95">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                            <Edit className="text-wtech-gold" /> {currentTemplate.id ? 'Editar Modelo' : 'Novo Modelo'}
                        </h3>
                        <button onClick={() => setIsEditing(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-[#333] rounded-full transition-colors text-gray-500 dark:text-gray-400">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Título do Modelo</label>
                                <input 
                                    className="w-full border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-sm font-bold outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all bg-white dark:bg-[#222] dark:text-white" 
                                    placeholder="Ex: Boas-vindas Pós Curso"
                                    value={currentTemplate.title || ''}
                                    onChange={e => setCurrentTemplate({...currentTemplate, title: e.target.value})}
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Texto 1 (Introdução)</label>
                                <textarea 
                                    className="w-full border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-sm font-medium h-32 focus:ring-2 focus:ring-black dark:focus:ring-white outline-none bg-white dark:bg-[#222] dark:text-white" 
                                    placeholder="Olá {{name}}, tudo bem?"
                                    value={currentTemplate.content || ''}
                                    onChange={e => setCurrentTemplate({...currentTemplate, content: e.target.value})}
                                />
                                <p className="text-[10px] text-gray-400 mt-1 italic font-medium">Use {"{{name}}"} para personalizar com o nome do lead.</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">URL da Imagem (Parte 2)</label>
                                <input 
                                    className="w-full border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-sm font-bold outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all bg-white dark:bg-[#222] dark:text-white" 
                                    placeholder="https://sua-imagem.com/foto.jpg (Opcional)"
                                    value={currentTemplate.imageUrl || ''}
                                    onChange={e => setCurrentTemplate({...currentTemplate, imageUrl: e.target.value})}
                                />
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Texto 2 (Fechamento)</label>
                                    <textarea 
                                        className="w-full border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-sm font-medium h-32 focus:ring-2 focus:ring-black dark:focus:ring-white outline-none bg-white dark:bg-[#222] dark:text-white" 
                                        placeholder="Caso precise alterar, nos avise."
                                        value={currentTemplate.content2 || ''}
                                        onChange={e => setCurrentTemplate({...currentTemplate, content2: e.target.value})}
                                    />
                                </div>

                                <div className="pt-2">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Intervalo entre partes (Segundos)</label>
                                    <div className="flex items-center gap-3">
                                        <input 
                                            type="number"
                                            className="w-24 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-sm font-bold outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-600 bg-white dark:bg-[#222] dark:text-white" 
                                            min="0"
                                            max="60"
                                            value={currentTemplate.part_delay || 0}
                                            onChange={e => setCurrentTemplate({...currentTemplate, part_delay: parseInt(e.target.value) || 0})}
                                        />
                                        <span className="text-xs text-gray-500 dark:text-gray-400">Tempo de espera entre a Texto 1, Imagem e Texto 2.</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3">
                         <button onClick={() => setIsEditing(false)} className="px-6 py-3 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-bold text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#333] transition-all">Cancelar</button>
                         <button onClick={handleSave} disabled={isLoading} className="bg-green-600 text-white px-8 py-3 rounded-xl text-sm font-black hover:bg-green-700 disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-green-100 dark:shadow-none transition-all active:scale-95">
                             <Save size={18} /> Salvar Modelo
                         </button>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map(template => (
                    <div key={template.id} className="bg-white dark:bg-[#1A1A1A] p-4 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow group relative">
                        <div className="flex justify-between items-start mb-2">
                            <h4 className="font-bold text-gray-800 dark:text-gray-200">{template.title}</h4>
                            {hasPerm('marketing_manage_templates') && (
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                        onClick={() => { setCurrentTemplate(template); setIsEditing(true); }}
                                        className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500 rounded"
                                    >
                                        <Edit size={14} />
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(template.id)}
                                        className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 rounded"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            )}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-[#222] p-3 rounded-lg border border-gray-100 dark:border-gray-700 h-24 overflow-y-auto whitespace-pre-wrap custom-scrollbar">
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
