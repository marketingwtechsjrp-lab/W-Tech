import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Search, Package, CheckCircle, Truck, MapPin, Clock } from 'lucide-react';

export default function OrderTracking() {
    const [code, setCode] = useState('');
    const [order, setOrder] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleTrack = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!code) return;
        
        setLoading(true);
        setError('');
        setOrder(null);
        
        // Ensure you have a 'tracking_code' column in SITE_Sales, or use ID for now.
        // Assuming migration added tracking_code.
        // Also fallback to ID search if tracking_code fails for legacy
        let query = supabase.from('SITE_Sales').select('*').eq('tracking_code', code).single();
        let { data, error } = await query;
        
        if (error || !data) {
             // Try ID text search if UUID format matches? Or just by ID if code is UUID
             if (code.length > 20) {
                 const { data: dataId, error: errorId } = await supabase.from('SITE_Sales').select('*').eq('id', code).single();
                 if (dataId) {
                     data = dataId;
                     error = null;
                 }
             }
        }

        if (error || !data) {
             setError('Pedido não encontrado. Verifique o código e tente novamente.');
        } else {
             setOrder(data);
        }
        
        setLoading(false);
    };

    // Helper to parse items if JSON string
    const getItems = (items: any) => {
        if (typeof items === 'string') {
            try { return JSON.parse(items); } catch(e) { return []; }
        }
        return items || [];
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            
            <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden mb-8">
                <div className="bg-gradient-to-r from-[#C29D52] to-[#A37B2E] p-8 text-center text-white">
                    <Package size={48} className="mx-auto mb-4 opacity-90" />
                    <h1 className="text-2xl font-black tracking-tight">Rastreie seu Pedido</h1>
                    <p className="opacity-80 text-sm mt-2 font-medium">Digite o código de rastreamento enviado para seu e-mail ou WhatsApp.</p>
                </div>
                
                <div className="p-8">
                    <form onSubmit={handleTrack} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-4">Código de Rastreio</label>
                            <div className="relative">
                                <Search className="absolute left-4 top-3.5 text-gray-400" size={20} />
                                <input 
                                    className="w-full bg-gray-100 border-none rounded-2xl py-3 pl-12 pr-4 font-bold text-gray-900 outline-none focus:ring-2 focus:ring-[#C29D52]"
                                    placeholder="Ex: TRK-123456"
                                    value={code}
                                    onChange={e => setCode(e.target.value.toUpperCase())}
                                />
                            </div>
                        </div>
                        <button 
                            disabled={loading}
                            className="w-full bg-black text-white py-4 rounded-2xl font-bold hover:bg-gray-900 transition-all flex items-center justify-center gap-2"
                        >
                            {loading ? 'Buscando...' : 'Rastrear Agora'}
                        </button>
                    </form>
                    
                    {error && (
                        <div className="mt-4 p-4 bg-red-50 text-red-600 rounded-xl text-sm font-bold text-center">
                            {error}
                        </div>
                    )}
                </div>
            </div>

            {order && (
                <div className="w-full max-w-2xl bg-white rounded-3xl shadow-xl overflow-hidden animate-in slide-in-from-bottom-4">
                    <div className="border-b border-gray-100 p-6 flex justify-between items-center bg-gray-50">
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase">Pedido</p>
                            <p className="font-black text-xl text-gray-900">#{order.id.slice(0,8).toUpperCase()}</p>
                        </div>
                        <div className={`px-4 py-2 rounded-full text-xs font-bold uppercase ${
                            order.status === 'completed' ? 'bg-green-100 text-green-700' :
                            order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-700'
                        }`}>
                            {order.status === 'completed' ? 'Entregue' :
                             order.status === 'pending' ? 'Em Processamento' :
                             order.status === 'shipped' ? 'Enviado' : order.status}
                        </div>
                    </div>
                    
                    <div className="p-8 space-y-8">
                        {/* Timeline Mockup */}
                        <div className="relative pl-4 border-l-2 border-gray-100 space-y-8">
                             <div className="relative">
                                <div className="absolute -left-[21px] top-1 w-4 h-4 rounded-full bg-green-500 border-4 border-white shadow-lg"></div>
                                <h4 className="font-bold text-gray-900">Pedido Recebido</h4>
                                <p className="text-xs text-gray-500 mt-1">{new Date(order.created_at).toLocaleDateString()} às {new Date(order.created_at).toLocaleTimeString()}</p>
                             </div>
                             {['processing', 'shipped', 'completed'].includes(order.status) && (
                                <div className="relative">
                                    <div className="absolute -left-[21px] top-1 w-4 h-4 rounded-full bg-blue-500 border-4 border-white shadow-lg"></div>
                                    <h4 className="font-bold text-gray-900">Em Separação</h4>
                                    <p className="text-xs text-gray-500 mt-1">Seu pedido está sendo preparado.</p>
                                </div>
                             )}
                             {(order.status === 'shipped' || order.status === 'completed') && (
                                <div className="relative">
                                    <div className="absolute -left-[21px] top-1 w-4 h-4 rounded-full bg-purple-500 border-4 border-white shadow-lg"></div>
                                    <h4 className="font-bold text-gray-900">Em Trânsito</h4>
                                    <p className="text-xs text-gray-500 mt-1">{order.shipping_method ? `Via ${order.shipping_method}` : 'Transportadora'}</p>
                                </div>
                             )}
                             {order.status === 'completed' && (
                                 <div className="relative">
                                    <div className="absolute -left-[21px] top-1 w-4 h-4 rounded-full bg-green-600 border-4 border-white shadow-lg"></div>
                                    <h4 className="font-bold text-gray-900">Entregue</h4>
                                    <p className="text-xs text-gray-500 mt-1">Pedido entregue com sucesso!</p>
                                </div>
                             )}
                        </div>

                        <hr className="border-gray-100" />
                        
                        <div>
                             <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <Package size={18} className="text-gray-400" /> Itens do Pedido
                             </h4>
                             <ul className="space-y-3">
                                {getItems(order.items).map((item: any, i:number) => (
                                    <li key={i} className="flex justify-between items-center text-sm">
                                        <span className="text-gray-600 font-medium">{item.quantity}x {item.name || 'Produto'}</span>
                                        <span className="font-bold text-gray-900">R$ {((item.price || 0) * (item.quantity || 1)).toLocaleString('pt-BR')}</span>
                                    </li>
                                ))}
                             </ul>
                             <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
                                 <span className="font-bold text-gray-900">Total</span>
                                 <span className="font-black text-xl text-gray-900">R$ {order.total_value?.toLocaleString('pt-BR')}</span>
                             </div>
                        </div>

                         {order.shipping_address && (
                            <div className="bg-gray-50 p-4 rounded-xl">
                                <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                                    <MapPin size={16} className="text-gray-400" /> Endereço de Entrega
                                </h4>
                                <p className="text-sm text-gray-600">
                                    {/* Mock Parse - assumes JSON structure */}
                                    {typeof order.shipping_address === 'string' 
                                        ? order.shipping_address 
                                        : `${order.shipping_address.street}, ${order.shipping_address.number} - ${order.shipping_address.city}/${order.shipping_address.state}`
                                    }
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="mt-8 text-center opacity-50">
                <p className="text-xs font-bold text-gray-400">W-TECH CLOUD &copy; 2024</p>
            </div>
        </div>
    );
}
