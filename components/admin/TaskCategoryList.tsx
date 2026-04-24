import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Trash2 } from 'lucide-react';
import { TaskCategory } from '../../types';

export const TaskCategoryList = () => {
    const [categories, setCategories] = useState<TaskCategory[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchCategories = async () => {
        const { data, error } = await supabase.from('SITE_TaskCategories').select('*').order('name');
        if (!error && data) setCategories(data);
        setLoading(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza? Tarefas nessa categoria ficarão sem cor.')) return;
        const { error } = await supabase.from('SITE_TaskCategories').delete().eq('id', id);
        if (!error) setCategories(prev => prev.filter(c => c.id !== id));
        else alert('Erro ao excluir: ' + error.message);
    };

    useEffect(() => {
        fetchCategories();
        
        // Subscribe to changes for realtime updates
        const subscription = supabase
            .channel('public:SITE_TaskCategories')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'SITE_TaskCategories' }, fetchCategories)
            .subscribe();

        return () => { subscription.unsubscribe(); };
    }, []);

    if (loading) return <div className="p-4 text-center text-gray-400 text-xs">Carregando categorias...</div>;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.length === 0 && (
                <div className="col-span-3 text-center py-8 bg-gray-50 rounded-lg text-gray-400 text-xs">
                    Nenhuma categoria encontrada. Adicione uma acima.
                </div>
            )}
            {categories.map(cat => (
                <div key={cat.id} className="bg-white p-3 rounded-xl border border-gray-200 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="relative group">
                             <div 
                                className="w-8 h-8 rounded-full border border-black/5 shadow-inner cursor-pointer" 
                                style={{ backgroundColor: cat.color }} 
                            />
                            <input 
                                type="color" 
                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                value={cat.color}
                                onChange={async (e) => {
                                    const newColor = e.target.value;
                                    // Optimistic update
                                    setCategories(prev => prev.map(c => c.id === cat.id ? { ...c, color: newColor } : c));
                                    
                                    const { error } = await supabase.from('SITE_TaskCategories').update({ color: newColor }).eq('id', cat.id);
                                    if (error) {
                                        alert('Erro ao atualizar cor: ' + error.message);
                                        // Revert on error could be implemented here fetching again
                                    }
                                }}
                            />
                        </div>
                       
                        <span className="font-bold text-gray-700 text-sm">{cat.name}</span>
                    </div>
                    <button 
                        onClick={() => handleDelete(cat.id)}
                        className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            ))}
        </div>
    );
};
