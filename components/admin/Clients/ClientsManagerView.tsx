import React, { useState, useEffect } from 'react';
import { Search, User, UserPlus, Phone, Mail, MapPin, Filter, MoreVertical, Shield, Users, Plus, X, Save, CheckCircle, PanelsTopLeft } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { MarketingList } from '../../../types';
import { useAuth } from '../../../context/AuthContext';
import ListsManager from '../Marketing/ListsManager';

const ClientsManagerView = ({ permissions }: { permissions?: any }) => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'clients' | 'groups'>('clients');
    const [clients, setClients] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all');

    // Selection & Groups State
    const [selectedClients, setSelectedClients] = useState<string[]>([]);
    const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
    const [staticLists, setStaticLists] = useState<MarketingList[]>([]);
    const [selectedListId, setSelectedListId] = useState<string>('');
    const [newListName, setNewListName] = useState('');
    const [isSavingGroup, setIsSavingGroup] = useState(false);

    // Pagination
    const [itemsPerPage, setItemsPerPage] = useState(50);
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        if (user?.id) {
            fetchClients();
        }
    }, [user?.id]);

    useEffect(() => {
        if (isGroupModalOpen && user?.id) {
            fetchStaticLists();
        }
    }, [isGroupModalOpen, user?.id, permissions]);

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

    const fetchStaticLists = async () => {
        let query = supabase
            .from('SITE_MarketingLists')
            .select('*')
            .eq('type', 'Static')
            .order('created_at', { ascending: false });
        
        // Filter by owner if NOT admin
        const isAdmin = permissions?.admin_access;
        if (!isAdmin) {
            if (user?.id) {
                query = query.eq('owner_id', user.id);
            } else {
                return;
            }
        }

        const { data } = await query;
        if (data) setStaticLists(data);
    };

    const filteredClients = clients.filter(client => {
        const matchesSearch = client.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              client.phone?.includes(searchTerm);
        const matchesType = filterType === 'all' || client.type === filterType;
        return matchesSearch && matchesType;
    });

    // Pagination Logic
    const totalPages = Math.ceil(filteredClients.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedClients = filteredClients.slice(startIndex, startIndex + itemsPerPage);

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedClients(filteredClients.map(c => c.id));
        } else {
            setSelectedClients([]);
        }
    };

    const handleSelectClient = (id: string, checked: boolean) => {
        if (checked) {
            setSelectedClients(prev => [...prev, id]);
        } else {
            setSelectedClients(prev => prev.filter(cid => cid !== id));
        }
    };

    const handleAddToGroup = async () => {
        if (selectedClients.length === 0) return;
        
        let targetListId = selectedListId;
        setIsSavingGroup(true);

        try {
            // 1. Create new list if requested
            if (targetListId === 'new') {
                if (!newListName) return alert("Digite o nome do novo grupo.");
                
                const { data, error } = await supabase.from('SITE_MarketingLists').insert([{
                    name: newListName,
                    type: 'Static',
                    description: 'Grupo criado via Gestão de Clientes',
                    owner_id: user?.id
                }]).select().single();

                if (error) throw error;
                // Map snake_case to camelCase for the state if needed, or just use DB fields
                targetListId = data.id;
            }

            if (!targetListId) return alert("Selecione um grupo.");

            // 2. Prepare Members Payload
            const clientsToAdd = clients.filter(c => selectedClients.includes(c.id));
            
            const membersPayload = clientsToAdd.map(c => ({
                list_id: targetListId,
                name: c.name,
                email: c.email?.trim() || null,
                phone: c.phone || '',
                lead_id: c.type === 'Lead' ? c.id : null,
            }));

            // 3. Insert Members
            const { error: membersError } = await supabase
                .from('SITE_MarketingListMembers')
                .insert(membersPayload);

            if (membersError) throw membersError;

            alert(`${membersPayload.length} contatos adicionados ao grupo com sucesso!`);
            setIsGroupModalOpen(false);
            setSelectedClients([]);
            setNewListName('');
            setSelectedListId('');
            fetchClients(); // Refresh to clear selection state if needed

        } catch (error: any) {
            console.error(error);
            alert("Erro ao adicionar ao grupo: " + error.message);
        } finally {
            setIsSavingGroup(false);
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-black text-gray-900 tracking-tight">Gestão de Clientes</h2>
                    <p className="text-gray-500 font-medium">Visualize Leads e Credenciados em um só lugar.</p>
                </div>
                <div className="flex gap-2">
                    {activeTab === 'clients' && selectedClients.length > 0 && (
                        <button 
                            onClick={() => setIsGroupModalOpen(true)}
                            className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black flex items-center gap-2 hover:bg-blue-700 transition-all shadow-xl active:scale-95 animate-in slide-in-from-right-4"
                        >
                            <Users size={20} /> 
                            Criar Grupo / Adicionar ({selectedClients.length})
                        </button>
                    )}
                    <button className="bg-wtech-black text-white px-6 py-3 rounded-2xl font-black flex items-center gap-2 hover:bg-gray-800 transition-all shadow-xl active:scale-95">
                        <UserPlus size={20} /> Novo Cliente
                    </button>
                </div>
            </div>

            {/* Sub-Tabs */}
            <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100 w-fit">
                <button
                    onClick={() => setActiveTab('clients')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-black transition-all ${
                        activeTab === 'clients' 
                        ? 'bg-black text-white shadow-lg' 
                        : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                    }`}
                >
                    <User size={16} /> Todos os Clientes
                </button>
                <button
                    onClick={() => setActiveTab('groups')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-black transition-all ${
                        activeTab === 'groups' 
                        ? 'bg-black text-white shadow-lg' 
                        : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                    }`}
                >
                    <Users size={16} /> Grupos de Marketing
                </button>
            </div>

            {activeTab === 'groups' ? (
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden p-6 animate-in fade-in zoom-in-95 duration-200">
                    <ListsManager permissions={permissions} />
                </div>
            ) : (
                <div className="bg-white dark:bg-[#1A1A1A] rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden animate-in fade-in slide-in-from-left-4 duration-200">
                    <div className="p-6 border-b border-gray-50 dark:border-gray-800 flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-3 text-gray-400" size={20} />
                            <input 
                                type="text"
                                placeholder="Buscar por nome, email ou telefone..."
                                className="w-full bg-gray-50 dark:bg-[#222] dark:text-white border-none rounded-2xl py-3 pl-12 pr-4 text-sm font-bold focus:ring-2 focus:ring-wtech-gold transition-all outline-none"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <select 
                            className="px-6 py-3 bg-gray-50 dark:bg-[#222] dark:text-white border-none rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-wtech-gold"
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
                        <thead className="bg-gray-50/50 dark:bg-[#111]">
                            <tr>
                                <th className="px-6 py-4 w-[50px]">
                                    <input 
                                        type="checkbox" 
                                        className="rounded border-gray-300 w-4 h-4 text-wtech-gold focus:ring-wtech-gold"
                                        checked={filteredClients.length > 0 && selectedClients.length === filteredClients.length}
                                        onChange={(e) => handleSelectAll(e.target.checked)}
                                    />
                                </th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Cliente</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Contato</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Tipo / Origem</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                                <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Data</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                            {loading ? (
                                <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400 font-bold italic">Carregando carteira de clientes...</td></tr>
                            ) : paginatedClients.length === 0 ? (
                                <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400 font-bold italic">Nenhum cliente encontrado.</td></tr>
                            ) : paginatedClients.map((client, idx) => (
                                <tr key={`${client.type}-${client.id}-${idx}`} className={`hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors ${selectedClients.includes(client.id) ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}>
                                     <td className="px-6 py-4">
                                        <input 
                                            type="checkbox" 
                                            className="rounded border-gray-300 w-4 h-4 text-wtech-gold focus:ring-wtech-gold"
                                            checked={selectedClients.includes(client.id)}
                                            onChange={(e) => handleSelectClient(client.id, e.target.checked)}
                                        />
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${client.type === 'Credenciado' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                                                {client.type === 'Credenciado' ? <Shield size={18} /> : <User size={18} />}
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-gray-900 line-clamp-1">{client.name || 'Sem Nome'}</p>
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
                
                {/* Pagination Controls */}
                {!loading && filteredClients.length > 0 && (
                     <div className="border-t border-gray-100 p-4 bg-gray-50 flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="text-xs font-bold text-gray-500">
                            Exibindo {startIndex + 1} - {Math.min(startIndex + itemsPerPage, filteredClients.length)} de {filteredClients.length} clientes
                        </div>
                        
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-500 uppercase mr-2">Itens por página:</span>
                            {[50, 100, 300].map(limit => (
                                <button
                                    key={limit}
                                    onClick={() => { setItemsPerPage(limit); setCurrentPage(1); }}
                                    className={`px-3 py-1 rounded text-xs font-bold ${itemsPerPage === limit ? 'bg-white shadow text-black border' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                    {limit}
                                </button>
                            ))}
                        </div>

                        <div className="flex items-center gap-2">
                             <button 
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1.5 rounded bg-white border border-gray-200 text-xs font-bold text-gray-600 disabled:opacity-50 hover:bg-gray-50"
                             >
                                Anterior
                             </button>
                             <span className="text-xs font-bold text-gray-900">
                                Página {currentPage} de {totalPages}
                             </span>
                             <button 
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1.5 rounded bg-white border border-gray-200 text-xs font-bold text-gray-600 disabled:opacity-50 hover:bg-gray-50"
                             >
                                Próxima
                             </button>
                        </div>
                    </div>
                )}
            </div>
            )}

            {/* Add to Group Modal */}
            {isGroupModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <div>
                                <h3 className="font-black text-xl text-gray-900">Adicionar ao Grupo</h3>
                                <p className="text-xs text-gray-500 font-bold">{selectedClients.length} contatos selecionados</p>
                            </div>
                            <button onClick={() => setIsGroupModalOpen(false)} className="text-gray-400 hover:text-red-500">
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="p-6 space-y-6">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Selecione o Grupo</label>
                                <select 
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-wtech-gold outline-none"
                                    value={selectedListId}
                                    onChange={(e) => setSelectedListId(e.target.value)}
                                >
                                    <option value="">Selecione...</option>
                                    <option value="new">+ Criar Novo Grupo</option>
                                    {staticLists.map(list => (
                                        <option key={list.id} value={list.id}>{list.name} ({list.type})</option>
                                    ))}
                                </select>
                            </div>

                            {selectedListId === 'new' && (
                                <div className="space-y-2 animate-in slide-in-from-top-2">
                                    <label className="block text-xs font-bold text-gray-500 uppercase">Nome do Novo Grupo</label>
                                    <input 
                                        type="text" 
                                        placeholder="Ex: Alunos VIP 2024"
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-wtech-gold outline-none"
                                        value={newListName}
                                        onChange={(e) => setNewListName(e.target.value)}
                                        autoFocus
                                    />
                                </div>
                            )}

                            <div className="flex justify-end gap-3 pt-4">
                                <button 
                                    onClick={() => setIsGroupModalOpen(false)}
                                    className="px-4 py-3 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-xl transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    onClick={handleAddToGroup}
                                    disabled={!selectedListId || (selectedListId === 'new' && !newListName) || isSavingGroup}
                                    className="bg-wtech-black text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-gray-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSavingGroup ? 'Salvando...' : 'Salvar Grupo'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClientsManagerView;
