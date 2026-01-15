import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../context/AuthContext';
import { MarketingList } from '../../../types';
import { Plus, Users, Search, Filter, Trash2, Edit, Save, X, Check, RefreshCw } from 'lucide-react';

const ListsManager = () => {
    const { user } = useAuth();
    const [lists, setLists] = useState<MarketingList[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    
    // Form State
    const [currentList, setCurrentList] = useState<Partial<MarketingList>>({
        name: '',
        description: '',
        type: 'Static',
        rules: {}
    });

    // Courses for Filters
    const [courses, setCourses] = useState<any[]>([]);

    useEffect(() => {
        fetchLists();
        fetchCourses();
    }, []);

    const fetchLists = async () => {
        setIsLoading(true);
        const { data, error } = await supabase
            .from('SITE_MarketingLists')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (data) setLists(data);
        setIsLoading(false);
    };

    const fetchCourses = async () => {
        const { data } = await supabase.from('SITE_Courses').select('id, title').eq('status', 'Published');
        if (data) setCourses(data);
    };

    const handleSave = async () => {
        if (!currentList.name) return alert('Nome da lista é obrigatório');
        
        setIsLoading(true);
        try {
            const payload = {
                name: currentList.name,
                description: currentList.description,
                type: currentList.type,
                rules: currentList.rules,
                // owner_id: user?.id 
                // Temporarily removed owner_id to bypass potential FK permission issues with 'users' table.
                // We will rely on RLS or backend triggers if needed later, or fix the FK constraint in DB.
            };

            let error;
            if (currentList.id) {
                const { error: err } = await supabase.from('SITE_MarketingLists').update(payload).eq('id', currentList.id);
                error = err;
            } else {
                const { error: err } = await supabase.from('SITE_MarketingLists').insert([payload]);
                error = err;
            }

            if (error) throw error;
            
            setIsEditing(false);
            setCurrentList({ name: '', description: '', type: 'Static', rules: {} });
            fetchLists();
        } catch (error: any) {
            alert('Erro ao salvar: ' + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Excluir esta lista?')) return;
        const { error } = await supabase.from('SITE_MarketingLists').delete().eq('id', id);
        if (!error) fetchLists();
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                     <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                        <Users className="text-blue-600" /> Listas de Contatos
                    </h3>
                    <p className="text-sm text-gray-500">Gerencie grupos de contatos para suas campanhas.</p>
                </div>
                {!isEditing && (
                    <button 
                        onClick={() => { setIsEditing(true); setCurrentList({ name: '', description: '', type: 'Static', rules: {} }); }}
                        className="bg-black text-white px-4 py-2 rounded text-sm font-bold flex items-center gap-2 hover:bg-gray-800"
                    >
                        <Plus size={16} /> Nova Lista
                    </button>
                )}
            </div>

            {isEditing && (
                <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 animate-in fade-in slide-in-from-top-4">
                     <div className="flex justify-between items-center mb-4">
                        <h4 className="font-bold text-gray-700">{currentList.id ? 'Editar Lista' : 'Nova Lista'}</h4>
                        <button onClick={() => setIsEditing(false)}><X size={20} className="text-gray-400 hover:text-red-500" /></button>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Nome da Lista</label>
                                <input 
                                    className="w-full border border-gray-300 rounded p-2 text-sm" 
                                    placeholder="Ex: Alunos de Offroad 2024"
                                    value={currentList.name}
                                    onChange={e => setCurrentList({...currentList, name: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Descrição</label>
                                <input 
                                    className="w-full border border-gray-300 rounded p-2 text-sm" 
                                    placeholder="Opcional"
                                    value={currentList.description || ''}
                                    onChange={e => setCurrentList({...currentList, description: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Tipo de Lista</label>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input 
                                            type="radio" 
                                            name="listType" 
                                            checked={currentList.type === 'Static'} 
                                            onChange={() => setCurrentList({...currentList, type: 'Static'})} 
                                        />
                                        <span className="text-sm text-gray-700 font-medium">Estática (Manual)</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input 
                                            type="radio" 
                                            name="listType" 
                                            checked={currentList.type === 'Dynamic'} 
                                            onChange={() => setCurrentList({...currentList, type: 'Dynamic'})} 
                                        />
                                        <span className="text-sm text-gray-700 font-medium">Dinâmica (Filtros)</span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        {currentList.type === 'Dynamic' && (
                            <div className="bg-white p-4 rounded border border-gray-200">
                                <h5 className="font-bold text-sm mb-3 flex items-center gap-2"><Filter size={14} /> Regras de Filtragem</h5>
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Filtrar por Curso</label>
                                        <select 
                                            className="w-full border border-gray-300 rounded p-2 text-sm"
                                            value={currentList.rules?.course_id || ''}
                                            onChange={e => setCurrentList({
                                                ...currentList, 
                                                rules: { ...currentList.rules, course_id: e.target.value } 
                                            })}
                                        >
                                            <option value="">Todos os Cursos</option>
                                            {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Status do Lead</label>
                                        <select 
                                            className="w-full border border-gray-300 rounded p-2 text-sm"
                                            value={currentList.rules?.status || ''}
                                            onChange={e => setCurrentList({
                                                ...currentList, 
                                                rules: { ...currentList.rules, status: e.target.value } 
                                            })}
                                        >
                                            <option value="">Qualquer Status</option>
                                            <option value="New">Novo</option>
                                            <option value="Converted">Convertido</option>
                                            <option value="Matriculated">Matriculado</option>
                                            <option value="Lost">Perdido</option>
                                        </select>
                                    </div>
                                     <div className="text-[10px] text-gray-400 mt-2">
                                        * Listas dinâmicas são atualizadas automaticamente no momento do envio.
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {currentList.type === 'Static' && (
                             <div className="bg-white p-4 rounded border border-gray-200 flex items-center justify-center text-gray-400 text-sm">
                                <p>Contatos são adicionados manualmente ou via importação após salvar a lista.</p>
                             </div>
                        )}
                     </div>

                     <div className="flex justify-end gap-2 mt-6">
                        <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-200 rounded">Cancelar</button>
                        <button onClick={handleSave} disabled={isLoading} className="bg-green-600 text-white px-6 py-2 rounded text-sm font-bold hover:bg-green-700 disabled:opacity-50 flex items-center gap-2">
                            <Save size={16} /> Salvar Lista
                        </button>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {lists.map(list => (
                    <div key={list.id} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all group relative">
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${list.type === 'Dynamic' ? 'bg-purple-500' : 'bg-blue-500'}`}></span>
                                <span className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">{list.type === 'Dynamic' ? 'Dinâmica' : 'Estática'}</span>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                    onClick={() => { setCurrentList(list); setIsEditing(true); }}
                                    className="p-1.5 hover:bg-blue-50 text-blue-500 rounded"
                                >
                                    <Edit size={14} />
                                </button>
                                <button 
                                    onClick={() => handleDelete(list.id)}
                                    className="p-1.5 hover:bg-red-50 text-red-500 rounded"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                        
                        <h4 className="font-bold text-gray-800 text-lg mb-1">{list.name}</h4>
                        <p className="text-sm text-gray-500 mb-4 line-clamp-2">{list.description || 'Sem descrição'}</p>

                        <div className="pt-3 border-t border-gray-50 flex justify-between items-center text-xs text-gray-400">
                            <span>Criada em: {new Date(list.createdAt).toLocaleDateString()}</span>
                            {/* Potential Count Badge could go here */}
                        </div>
                    </div>
                ))}
            </div>
            
            {lists.length === 0 && !isLoading && !isEditing && (
                <div className="text-center py-10 text-gray-400">
                    <Users size={48} className="mx-auto mb-2 opacity-20" />
                    <p>Nenhuma lista de contatos encontrada.</p>
                </div>
            )}
        </div>
    );
};

export default ListsManager;
