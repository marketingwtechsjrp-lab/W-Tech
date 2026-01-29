import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { Plus, Trash2, Edit, CreditCard, Check, X, Ban } from 'lucide-react';

interface PaymentMethod {
    id: string;
    name: string;
    type: 'cash' | 'credit_card' | 'debit_card' | 'boleto' | 'pix' | 'term' | 'other';
    installments_config: {
        max: number;
        interest?: number;
        days?: number[];
    };
    is_active: boolean;
}

export const PaymentMethodsManager = () => {
    const [methods, setMethods] = useState<PaymentMethod[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [currentMethod, setCurrentMethod] = useState<Partial<PaymentMethod>>({});

    useEffect(() => {
        fetchMethods();
    }, []);

    const fetchMethods = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('SITE_PaymentMethods')
            .select('*')
            .order('name');
        
        if (data) setMethods(data);
        setLoading(false);
    };

    const handleSave = async () => {
        if (!currentMethod.name || !currentMethod.type) return alert("Nome e Tipo são obrigatórios");

        const payload = {
            name: currentMethod.name,
            type: currentMethod.type,
            installments_config: currentMethod.installments_config || { max: 1 },
            is_active: currentMethod.is_active ?? true
        };

        let error;
        if (currentMethod.id) {
            const res = await supabase.from('SITE_PaymentMethods').update(payload).eq('id', currentMethod.id);
            error = res.error;
        } else {
            const res = await supabase.from('SITE_PaymentMethods').insert([payload]);
            error = res.error;
        }

        if (error) {
            alert('Erro ao salvar: ' + error.message);
        } else {
            fetchMethods();
            setIsEditing(false);
            setCurrentMethod({});
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Excluir este método de pagamento?')) return;
        await supabase.from('SITE_PaymentMethods').delete().eq('id', id);
        fetchMethods();
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-black text-gray-900 dark:text-white">Formas de Pagamento</h3>
                    <p className="text-sm text-gray-500">Configure as opções disponíveis no checkout.</p>
                </div>
                <button 
                    onClick={() => { setCurrentMethod({ type: 'cash', installments_config: { max: 1 }, is_active: true }); setIsEditing(true); }}
                    className="bg-black dark:bg-white text-white dark:text-black px-4 py-2 rounded-lg font-bold text-xs uppercase flex items-center gap-2"
                >
                    <Plus size={16} /> Novo Método
                </button>
            </div>

            {isEditing && (
                <div className="bg-gray-50 dark:bg-[#222] p-6 rounded-2xl border border-gray-100 dark:border-gray-800 animate-in fade-in slide-in-from-top-4">
                    <h4 className="font-bold mb-4 dark:text-white">{currentMethod.id ? 'Editar' : 'Novo'} Método</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome de Exibição</label>
                            <input 
                                className="w-full p-2 rounded border dark:bg-[#111] dark:border-gray-700 dark:text-white"
                                value={currentMethod.name || ''}
                                onChange={e => setCurrentMethod({...currentMethod, name: e.target.value})}
                                placeholder="Ex: Boleto 30 Dias"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tipo</label>
                            <select 
                                className="w-full p-2 rounded border dark:bg-[#111] dark:border-gray-700 dark:text-white"
                                value={currentMethod.type}
                                onChange={e => setCurrentMethod({...currentMethod, type: e.target.value as any})}
                            >
                                <option value="cash">Dinheiro / À Vista</option>
                                <option value="pix">PIX</option>
                                <option value="credit_card">Cartão de Crédito</option>
                                <option value="debit_card">Cartão de Débito</option>
                                <option value="boleto">Boleto</option>
                                <option value="term">Prazo / Crediário</option>
                                <option value="other">Outro</option>
                            </select>
                        </div>
                        
                        {(currentMethod.type === 'credit_card' || currentMethod.type === 'term') && (
                            <div className="md:col-span-2 grid grid-cols-2 gap-4 bg-white dark:bg-[#111] p-4 rounded-xl border dark:border-gray-700">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Máx. Parcelas</label>
                                    <input 
                                        type="number"
                                        className="w-full p-2 rounded border dark:bg-[#222] dark:border-gray-700 dark:text-white"
                                        value={currentMethod.installments_config?.max || 1}
                                        onChange={e => setCurrentMethod({
                                            ...currentMethod, 
                                            installments_config: { ...currentMethod.installments_config, max: parseInt(e.target.value) }
                                        })}
                                    />
                                </div>
                                {currentMethod.type === 'term' && (
                                     <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Dias (Separados por vírgula)</label>
                                        <input 
                                            className="w-full p-2 rounded border dark:bg-[#222] dark:border-gray-700 dark:text-white"
                                            placeholder="Ex: 30, 60, 90"
                                            // Handle parsing logic would be here, skipping for brevity of mockup
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex items-center gap-2">
                             <input 
                                type="checkbox"
                                checked={currentMethod.is_active}
                                onChange={e => setCurrentMethod({...currentMethod, is_active: e.target.checked})}
                             />
                             <label className="text-sm font-medium dark:text-gray-300">Ativo</label>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-4">
                        <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-200 rounded-lg">Cancelar</button>
                        <button onClick={handleSave} className="px-4 py-2 bg-green-600 text-white rounded-lg font-bold text-sm hover:bg-green-700">Salvar</button>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {methods.map(method => (
                    <div key={method.id} className={`p-4 rounded-xl border ${method.is_active ? 'bg-white border-gray-100 dark:bg-[#1A1A1A] dark:border-gray-800' : 'bg-gray-50 border-gray-200 opacity-75 dark:bg-[#111] dark:border-gray-800'}`}>
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-gray-100 dark:bg-[#222] rounded-lg">
                                    <CreditCard size={20} className="text-gray-600 dark:text-gray-400" />
                                </div>
                                <div>
                                    <h5 className="font-bold text-gray-900 dark:text-white">{method.name}</h5>
                                    <p className="text-xs text-gray-500 uppercase">{method.type === 'term' ? 'A Prazo' : method.type}</p>
                                </div>
                            </div>
                            <div className="flex gap-1">
                                <button onClick={() => { setCurrentMethod(method); setIsEditing(true); }} className="p-1.5 hover:bg-blue-50 text-blue-500 rounded"><Edit size={14} /></button>
                                <button onClick={() => handleDelete(method.id)} className="p-1.5 hover:bg-red-50 text-red-500 rounded"><Trash2 size={14} /></button>
                            </div>
                        </div>
                        {method.installments_config?.max > 1 && (
                            <div className="mt-3 text-xs bg-gray-50 dark:bg-[#222] p-2 rounded text-gray-600 dark:text-gray-400">
                                Até {method.installments_config.max}x parcelas
                            </div>
                        )}
                        {!method.is_active && (
                            <div className="mt-2 text-[10px] font-black uppercase text-red-500 flex items-center gap-1">
                                <Ban size={10} /> Desativado
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};
