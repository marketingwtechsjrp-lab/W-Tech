import React, { useState, useEffect } from 'react';
import { Search, User, UserPlus, Phone, Mail, MapPin, Filter, MoreVertical, Shield } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';

const ClientsManagerView = () => {
    const [clients, setClients] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all');

    useEffect(() => {
        fetchClients();
    }, []);

    const fetchClients = async () => {
        setLoading(true);
        // Fetch from Leads
        const { data: leads } = await supabase.from('SITE_Leads').select('*').order('created_at', { ascending: false });
        // Fetch from Mechanics (Credenciados)
        const { data: mechanics } = await supabase.from('SITE_Mechanics').select('*');

        const normalizedClients = [
            ...(leads || []).map((l: any) => ({
                id: l.id,
                name: l.name,
                email: l.email,
                phone: l.phone,
                type: 'Lead',
                origin: l.context_id || 'Lead',
                status: l.status,
                createdAt: l.created_at
            })),
            ...(mechanics || []).map((m: any) => ({
                id: m.id,
                name: m.name,
                email: m.email,
                phone: m.phone,
                type: 'Credenciado',
                origin: m.workshop_name || 'Oficina',
                status: m.status,
                createdAt: m.joined_date
            }))
        ];

        setClients(normalizedClients);
        setLoading(false);
    };

    const filteredClients = clients.filter(client => {
        const matchesSearch = client.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              client.phone?.includes(searchTerm);
        const matchesType = filterType === 'all' || client.type === filterType;
        return matchesSearch && matchesType;
    });

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-black text-gray-900 tracking-tight">Gestão de Clientes</h2>
                    <p className="text-gray-500 font-medium">Visualize Leads e Credenciados em um só lugar.</p>
                </div>
                <button className="bg-wtech-black text-white px-6 py-3 rounded-2xl font-black flex items-center gap-2 hover:bg-gray-800 transition-all shadow-xl active:scale-95">
                    <UserPlus size={20} /> Novo Cliente
                </button>
            </div>

            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-50 flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-3 text-gray-400" size={20} />
                        <input 
                            type="text"
                            placeholder="Buscar por nome, email ou telefone..."
                            className="w-full bg-gray-50 border-none rounded-2xl py-3 pl-12 pr-4 text-sm font-bold focus:ring-2 focus:ring-wtech-gold transition-all outline-none"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <select 
                        className="px-6 py-3 bg-gray-50 border-none rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-wtech-gold"
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                    >
                        <option value="all">Todos os Tipos</option>
                        <option value="Lead">Leads</option>
                        <option value="Credenciado">Credenciados</option>
                    </select>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50/50">
                            <tr>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Cliente</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Contato</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Tipo / Origem</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                                <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Data</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-400 font-bold italic">Carregando carteira de clientes...</td></tr>
                            ) : filteredClients.length === 0 ? (
                                <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-400 font-bold italic">Nenhum cliente encontrado.</td></tr>
                            ) : filteredClients.map((client, idx) => (
                                <tr key={`${client.type}-${client.id}-${idx}`} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${client.type === 'Credenciado' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                                                {client.type === 'Credenciado' ? <Shield size={18} /> : <User size={18} />}
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-gray-900">{client.name || 'Sem Nome'}</p>
                                                <p className="text-[10px] text-gray-400 uppercase font-bold">ID: {client.id.slice(0, 8)}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1">
                                            {client.phone && (
                                                <div className="flex items-center gap-1.5 text-xs font-medium text-gray-600">
                                                    <Phone size={12} className="text-gray-400" />
                                                    {client.phone}
                                                </div>
                                            )}
                                            {client.email && (
                                                <div className="flex items-center gap-1.5 text-xs font-medium text-gray-600">
                                                    <Mail size={12} className="text-gray-400" />
                                                    {client.email}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className={`text-[10px] font-black uppercase tracking-wider w-fit px-2 py-0.5 rounded ${client.type === 'Credenciado' ? 'bg-blue-50 text-blue-700' : 'bg-orange-50 text-orange-700'}`}>
                                                {client.type}
                                            </span>
                                            <span className="text-[10px] text-gray-400 mt-1 truncate max-w-[150px]">{client.origin}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-xs font-bold text-gray-700 bg-gray-100 px-2 py-1 rounded-lg">
                                            {client.status || 'Ativo'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className="text-xs font-medium text-gray-500">{new Date(client.createdAt).toLocaleDateString('pt-BR')}</span>
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

export default ClientsManagerView;
