import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { Plus, Trash2, Edit, CreditCard, Ban, X } from 'lucide-react';

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

const inputCls = 'w-full px-3 py-2.5 bg-[var(--admin-surface-2)] border border-[var(--admin-border)] text-[var(--admin-text-primary)] rounded-xl text-sm outline-none focus:border-wtech-gold transition-all placeholder:text-[var(--admin-text-tertiary)]';
const labelCls = 'block text-[10px] font-black text-[var(--admin-text-tertiary)] uppercase tracking-widest mb-1.5';

export const PaymentMethodsManager = () => {
    const [methods, setMethods] = useState<PaymentMethod[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [currentMethod, setCurrentMethod] = useState<Partial<PaymentMethod>>({});

    useEffect(() => { fetchMethods(); }, []);

    const fetchMethods = async () => {
        setLoading(true);
        const { data } = await supabase.from('SITE_PaymentMethods').select('*').order('name');
        if (data) setMethods(data);
        setLoading(false);
    };

    const handleSave = async () => {
        if (!currentMethod.name || !currentMethod.type) return alert('Nome e Tipo são obrigatórios');

        const payload = {
            name: currentMethod.name,
            type: currentMethod.type,
            installments_config: currentMethod.installments_config || { max: 1 },
            is_active: currentMethod.is_active ?? true,
        };

        let error;
        if (currentMethod.id) {
            ({ error } = await supabase.from('SITE_PaymentMethods').update(payload).eq('id', currentMethod.id));
        } else {
            ({ error } = await supabase.from('SITE_PaymentMethods').insert([payload]));
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
        <div className="space-y-5">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-black text-[var(--admin-text-primary)]">Formas de Pagamento</h3>
                    <p className="text-sm text-[var(--admin-text-secondary)]">Configure as opções disponíveis no checkout.</p>
                </div>
                <button
                    onClick={() => { setCurrentMethod({ type: 'cash', installments_config: { max: 1 }, is_active: true }); setIsEditing(true); }}
                    className="px-4 py-2.5 bg-gradient-to-r from-wtech-gold to-yellow-600 text-black rounded-xl font-black text-xs uppercase flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-md shadow-yellow-500/20"
                >
                    <Plus size={14} /> Novo Método
                </button>
            </div>

            {isEditing && (
                <div className="bg-[var(--admin-surface-2)] p-6 rounded-2xl border border-[var(--admin-border)]">
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="font-black text-[var(--admin-text-primary)] text-sm">{currentMethod.id ? 'Editar' : 'Novo'} Método</h4>
                        <button onClick={() => setIsEditing(false)} className="p-1.5 text-[var(--admin-text-tertiary)] hover:text-red-500 transition-colors">
                            <X size={16} />
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className={labelCls}>Nome de Exibição</label>
                            <input
                                className={inputCls}
                                value={currentMethod.name || ''}
                                onChange={e => setCurrentMethod({ ...currentMethod, name: e.target.value })}
                                placeholder="Ex: Boleto 30 Dias"
                            />
                        </div>
                        <div>
                            <label className={labelCls}>Tipo</label>
                            <select
                                className={inputCls}
                                value={currentMethod.type}
                                onChange={e => setCurrentMethod({ ...currentMethod, type: e.target.value as any })}
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
                            <div className="md:col-span-2 grid grid-cols-2 gap-4 bg-[var(--admin-surface-1)] p-4 rounded-xl border border-[var(--admin-border)]">
                                <div>
                                    <label className={labelCls}>Máx. Parcelas</label>
                                    <input
                                        type="number"
                                        className={inputCls}
                                        value={currentMethod.installments_config?.max || 1}
                                        onChange={e => setCurrentMethod({
                                            ...currentMethod,
                                            installments_config: { ...currentMethod.installments_config, max: parseInt(e.target.value) }
                                        })}
                                    />
                                </div>
                                {currentMethod.type === 'term' && (
                                    <div>
                                        <label className={labelCls}>Dias (separados por vírgula)</label>
                                        <input
                                            className={inputCls}
                                            placeholder="Ex: 30, 60, 90"
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={currentMethod.is_active}
                                onChange={e => setCurrentMethod({ ...currentMethod, is_active: e.target.checked })}
                                className="w-4 h-4 accent-wtech-gold"
                            />
                            <label className="text-sm font-medium text-[var(--admin-text-secondary)]">Ativo</label>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-5">
                        <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-sm font-bold text-[var(--admin-text-secondary)] hover:bg-[var(--admin-surface-3)] rounded-xl transition-colors">Cancelar</button>
                        <button onClick={handleSave} className="px-5 py-2 bg-emerald-600 text-white rounded-xl font-black text-sm hover:bg-emerald-700 transition-all active:scale-95">Salvar</button>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="flex items-center justify-center py-10">
                    <div className="w-8 h-8 border-4 border-wtech-gold border-t-transparent rounded-full animate-spin" />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {methods.map(method => (
                        <div key={method.id} className={`p-4 rounded-xl border transition-all ${method.is_active ? 'bg-[var(--admin-surface-1)] border-[var(--admin-border)]' : 'bg-[var(--admin-surface-2)] border-[var(--admin-border)] opacity-60'}`}>
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-[var(--admin-surface-3)] rounded-xl">
                                        <CreditCard size={18} className="text-[var(--admin-text-secondary)]" />
                                    </div>
                                    <div>
                                        <h5 className="font-bold text-[var(--admin-text-primary)] text-sm">{method.name}</h5>
                                        <p className="text-[10px] text-[var(--admin-text-tertiary)] uppercase font-bold">{method.type === 'term' ? 'A Prazo' : method.type}</p>
                                    </div>
                                </div>
                                <div className="flex gap-1">
                                    <button onClick={() => { setCurrentMethod(method); setIsEditing(true); }} className="p-1.5 hover:bg-blue-500/10 text-blue-500 rounded-lg transition-colors"><Edit size={13} /></button>
                                    <button onClick={() => handleDelete(method.id)} className="p-1.5 hover:bg-red-500/10 text-red-500 rounded-lg transition-colors"><Trash2 size={13} /></button>
                                </div>
                            </div>
                            {method.installments_config?.max > 1 && (
                                <div className="mt-3 text-[11px] bg-[var(--admin-surface-3)] px-3 py-1.5 rounded-lg text-[var(--admin-text-secondary)] border border-[var(--admin-border)] font-medium">
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
            )}
        </div>
    );
};
