import React, { useState, useEffect } from 'react';
import { FileText, Download, Search, Printer, AlertCircle } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';

const InvoicesManagerView = () => {
    const [sales, setSales] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSalesForInvoicing();
    }, []);

    const fetchSalesForInvoicing = async () => {
        setLoading(true);
        const { data } = await supabase
            .from('SITE_Sales')
            .select('*')
            .neq('status', 'cancelled')
            .order('created_at', { ascending: false });
        
        if (data) {
            setSales(data);
        }
        setLoading(false);
    };

    const handleGenerateInvoice = (sale: any) => {
        alert(`Simulação: Gerando Nota Fiscal para Pedido #${sale.id.slice(0,8)}... \nIntegração com API Fiscal pendente.`);
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-black text-gray-900 tracking-tight">Notas Fiscais</h2>
                    <p className="text-gray-500 font-medium">Emissão e gerenciamento de documentos fiscais.</p>
                </div>
            </div>

            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-50">
                    <div className="flex items-center gap-2 bg-yellow-50 text-yellow-800 p-4 rounded-xl border border-yellow-100">
                        <AlertCircle size={20} />
                        <p className="text-sm font-bold">Módulo em Desenvolvimento: A integração com SEFAZ/Prefeitura requer certificado digital A1 configurado.</p>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50/50">
                            <tr>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Pedido / Ref</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Cliente</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Valor</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Status NF</th>
                                <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-400 font-bold italic">Carregando pedidos...</td></tr>
                            ) : sales.map((sale) => (
                                <tr key={sale.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-black text-gray-900">#{sale.id.slice(0, 8)}</span>
                                            <span className="text-[10px] text-gray-400">{new Date(sale.created_at).toLocaleDateString('pt-BR')}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-sm font-bold text-gray-900">{sale.client_name || 'Consumidor Final'}</p>
                                        <p className="text-[10px] text-gray-400">{sale.client_phone}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-sm font-black text-gray-900">R$ {sale.total_value?.toLocaleString('pt-BR')}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="px-2 py-1 bg-gray-100 text-gray-500 text-[10px] font-black uppercase rounded-md">
                                            Não Emitida
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button 
                                            onClick={() => handleGenerateInvoice(sale)}
                                            className="px-3 py-1.5 bg-wtech-black text-white text-xs font-bold rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-1 ml-auto"
                                        >
                                            <FileText size={14} /> Emitir NF-e
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default InvoicesManagerView;
