import React, { useState, useEffect, useRef } from 'react';
import { Search, User, UserPlus, Phone, Mail, Filter, Shield, Users, Plus, X, Upload, FileSpreadsheet } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { MarketingList } from '../../../types';
import { useAuth } from '../../../context/AuthContext';
import ListsManager from '../Marketing/ListsManager';
import { ClientDetailModal } from './ClientDetailModal';
import * as XLSX from 'xlsx';

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

    // Modal & Users
    const [selectedClientForEdit, setSelectedClientForEdit] = useState<any>(null);
    const [attendants, setAttendants] = useState<any[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Pagination
    const [itemsPerPage, setItemsPerPage] = useState(50);
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        if (user?.id) {
            fetchClients();
            fetchAttendants();
        }
    }, [user?.id]);

    useEffect(() => {
        if (isGroupModalOpen && user?.id) {
            fetchStaticLists();
        }
    }, [isGroupModalOpen, user?.id, permissions]);

    const fetchAttendants = async () => {
        // Always fetch users to display their names/assignments
        const { data } = await supabase.from('SITE_Users').select('id, name, email, role');
        if (data) setAttendants(data);
    };

    const fetchClients = async () => {
        setLoading(true);
        // Fetch from Leads (RLS will filter what they can see)
        const { data: leads, error } = await supabase
            .from('SITE_Leads')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Error fetching leads:", error);
            // Handle RLS error or just show empty
        }

        // Fetch from Mechanics (Credenciados) - Assuming these are public/global for now
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
                address: l.address,
                birth_date: l.birth_date,
                t_shirt_size: l.t_shirt_size,
                workshop_details: l.workshop_details,
                assigned_to: l.assigned_to,
                lastPurchaseDate: l.last_purchase_date,
                classification: l.classification || 'Novato',
                isAccredited: l.is_accredited,
                cpf: l.cpf,
                rg: l.rg,
                client_code: l.client_code,
                delivery_address: l.delivery_address,
                completed_courses: l.completed_courses || [],
                createdAt: l.created_at,
                zip_code: l.zip_code,
                address_street: l.address_street,
                address_number: l.address_number,
                address_neighborhood: l.address_neighborhood,
                address_city: l.address_city,
                address_state: l.address_state
            })),
            ...(mechanics || []).map((m: any) => ({
                id: m.id,
                name: m.name,
                email: m.email,
                phone: m.phone,
                type: 'Credenciado',
                origin: m.workshop_name || 'Oficina',
                status: m.status,
                address: m.address,
                birth_date: m.birth_date,
                t_shirt_size: m.t_shirt_size,
                workshop_details: m.workshop_details,
                assigned_to: m.assigned_to,
                isAccredited: m.is_accredited ?? true,
                cpf: m.cpf,
                rg: m.rg,
                client_code: m.client_code,
                delivery_address: m.delivery_address,
                completed_courses: m.completed_courses || [],
                createdAt: m.joined_date,
                zip_code: m.zip_code,
                address_street: m.address_street,
                address_number: m.address_number,
                address_neighborhood: m.address_neighborhood,
                address_city: m.address_city,
                address_state: m.address_state
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

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws);

                if (data.length > 0) {
                   await importLeads(data);
                }
            } catch (error) {
                console.error("Import Error:", error);
                alert("Erro ao importar arquivo. Verifique o formato.");
            }
        };
        reader.readAsBinaryString(file);
    };

    const importLeads = async (data: any[]) => {
        setLoading(true);
        // Basic mapping - assumes columns like "Nome", "Email", "Telefone"
        // Also supports "name", "email", "phone"
        const leadsToInsert = data.map(row => ({
            name: row['Nome'] || row['name'] || row['Cliente'] || 'Importado',
            email: row['Email'] || row['email'] || null,
            phone: row['Telefone'] || row['phone'] || row['Celular'] || null,
            status: 'New',
            assigned_to: user?.id, // Assign to current user by default
            context_id: 'Import'
        }));

        const { error } = await supabase.from('SITE_Leads').insert(leadsToInsert);
        if (error) {
            alert("Erro ao salvar leads: " + error.message);
        } else {
            alert(`${leadsToInsert.length} clientes importados com sucesso!`);
            fetchClients();
        }
        setLoading(false);
    };

    const canSeeAll = permissions?.admin_access || permissions?.clients_view_all;

    const filteredClients = clients.filter(client => {
        // 1. Basic Type & Search Filters
        const matchesSearch = client.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              client.phone?.includes(searchTerm);
        const matchesType = filterType === 'all' || client.type === filterType;
        
        if (!matchesSearch || !matchesType) return false;

        // 2. Permission / Ownership Filters
        if (canSeeAll) return true;

        // Primarily see only assigned clients
        const isAssignedToMe = client.assigned_to === user?.id;
        
        // Universal view for UNASSIGNED clients (clients that have NO attendant)
        // NOT based on classification alone, but on assignment.
        // If a client is "Novato" but assigned to Emerson, Chris should NOT see it.
        const isUnassigned = !client.assigned_to;

        // Optionally, if you still want ALL "Novatos" to be visible regardless of assignment (which is risky if claimed), keep classification check.
        // But the user complaint is specifically about seeing other's clients.
        // So we strictly enforce: Mine OR Nobody's.
        return isAssignedToMe || isUnassigned;
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
            fetchClients(); 

        } catch (error: any) {
            console.error(error);
            alert("Erro ao adicionar ao grupo: " + error.message);
        } finally {
            setIsSavingGroup(false);
        }
    };

    // Stats based on visibility
    const visibleClients = canSeeAll ? clients : clients.filter(c => c.assigned_to === user?.id || !c.assigned_to);
    const totalClientsCount = visibleClients.length;
    const leadsCount = visibleClients.filter(c => c.type === 'Lead').length;
    const mechanicsCount = visibleClients.filter(c => c.type === 'Credenciado').length;

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Gestão de Clientes</h2>
                    <p className="text-gray-500 dark:text-gray-400 font-medium">Visualize Leads e Credenciados em um só lugar.</p>
                </div>
                <div className="flex gap-2">
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileUpload} 
                        accept=".xlsx,.xls,.csv" 
                        className="hidden" 
                    />
                    <button 
                        onClick={handleImportClick}
                        className="bg-white dark:bg-[#222] text-gray-700 dark:text-white border border-gray-200 dark:border-gray-700 px-6 py-3 rounded-2xl font-black flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-white/5 transition-all shadow-sm active:scale-95"
                    >
                        <Upload size={20} /> Importar Lista
                    </button>

                    {activeTab === 'clients' && selectedClients.length > 0 && (
                        <button 
                            onClick={() => setIsGroupModalOpen(true)}
                            className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black flex items-center gap-2 hover:bg-blue-700 transition-all shadow-xl active:scale-95 animate-in slide-in-from-right-4"
                        >
                            <Users size={20} /> 
                            Criar Grupo ({selectedClients.length})
                        </button>
                    )}
                    <button 
                        onClick={() => setSelectedClientForEdit({ type: 'Lead' })}
                        className="bg-wtech-black dark:bg-white dark:text-black text-white px-6 py-3 rounded-2xl font-black flex items-center gap-2 hover:bg-gray-800 dark:hover:bg-gray-200 transition-all shadow-xl active:scale-95"
                    >
                        <UserPlus size={20} /> Novo Cliente
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-[#1A1A1A] p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-all">
                    <div className="flex justify-between items-center mb-4">
                        <div className="p-3 rounded-2xl bg-wtech-gold/10 text-wtech-gold">
                            <Users size={24} />
                        </div>
                    </div>
                    <div>
                        <h3 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">{totalClientsCount}</h3>
                        <p className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider mt-1">Total de Clientes</p>
                    </div>
                </div>

                <div className="bg-white dark:bg-[#1A1A1A] p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-all">
                    <div className="flex justify-between items-center mb-4">
                        <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-500">
                            <Shield size={24} />
                        </div>
                    </div>
                    <div>
                        <h3 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">{mechanicsCount}</h3>
                        <p className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider mt-1">Credenciados (Oficinas)</p>
                    </div>
                </div>

                <div className="bg-white dark:bg-[#1A1A1A] p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-all">
                    <div className="flex justify-between items-center mb-4">
                        <div className="p-3 rounded-2xl bg-orange-500/10 text-orange-500">
                            <User size={24} />
                        </div>
                    </div>
                    <div>
                        <h3 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">{leadsCount}</h3>
                        <p className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider mt-1">Leads Interessados</p>
                    </div>
                </div>
            </div>

            {/* Sub-Tabs */}
            <div className="flex bg-white dark:bg-[#111] p-1.5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 w-fit">
                <button
                    onClick={() => setActiveTab('clients')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-black transition-all ${
                        activeTab === 'clients' 
                        ? 'bg-black dark:bg-white dark:text-black text-white shadow-lg' 
                        : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5'
                    }`}
                >
                    <User size={16} /> Todos os Clientes
                </button>
                <button
                    onClick={() => setActiveTab('groups')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-black transition-all ${
                        activeTab === 'groups' 
                        ? 'bg-black dark:bg-white dark:text-black text-white shadow-lg' 
                        : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5'
                    }`}
                >
                    <Users size={16} /> Grupos de Marketing
                </button>
            </div>

            {activeTab === 'groups' ? (
                <div className="bg-white dark:bg-[#1A1A1A] rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden p-6 animate-in fade-in zoom-in-95 duration-200">
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
                                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Classificação</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Atendente</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Última Compra</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Status / Data</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                            {loading ? (
                                <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400 font-bold italic">Carregando carteira de clientes...</td></tr>
                            ) : paginatedClients.length === 0 ? (
                                <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400 font-bold italic">Nenhum cliente encontrado.</td></tr>
                            ) : paginatedClients.map((client, idx) => (
                                <tr 
                                    key={`${client.type}-${client.id}-${idx}`} 
                                    className={`hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors cursor-pointer ${selectedClients.includes(client.id) ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}
                                    onClick={(e) => {
                                        // Don't trigger if clicking checkbox
                                        if ((e.target as any).type === 'checkbox') return;
                                        setSelectedClientForEdit(client);
                                    }}
                                >
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
                                                <p className="text-sm font-black text-gray-900 dark:text-white line-clamp-1">{client.name || 'Sem Nome'}</p>
                                                <p className="text-[10px] text-gray-400 uppercase font-bold">ID: {client.id.slice(0, 8)}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1">
                                            {client.phone && (
                                                <div className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-300">
                                                    <Phone size={12} className="text-gray-400" />
                                                    {client.phone}
                                                </div>
                                            )}
                                            {client.email && (
                                                <div className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-300">
                                                    <Mail size={12} className="text-gray-400" />
                                                    {client.email}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className={`text-[10px] font-black uppercase tracking-wider w-fit px-2 py-0.5 rounded ${client.type === 'Credenciado' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'}`}>
                                                {client.type}
                                            </span>
                                            <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 truncate max-w-[150px]">{client.origin}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md border ${
                                            client.classification === 'VIP' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                                            client.classification === 'Ouro' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                                            client.classification === 'Prata' ? 'bg-gray-100 text-gray-700 border-gray-200' :
                                            'bg-white text-gray-500 border-gray-100'
                                        }`}>
                                            {client.classification}
                                        </span>
                                        {client.isAccredited && (
                                            <span className="ml-2 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md bg-blue-100 text-blue-700 border border-blue-200">
                                                Credenciado
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center text-[10px] font-bold">
                                                <UserPlus size={12} />
                                            </div>
                                            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                                                {attendants.find(u => u.id === client.assigned_to)?.name || 'Sem Atendente'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                                            {client.lastPurchaseDate ? new Date(client.lastPurchaseDate).toLocaleDateString('pt-BR') : '-'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex flex-col items-end gap-1">
                                            <span className="text-xs font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-[#222] px-2 py-1 rounded-lg border border-transparent dark:border-gray-800">
                                                {client.status || 'Ativo'}
                                            </span>
                                            <span className="text-[10px] font-medium text-gray-400">{new Date(client.createdAt).toLocaleDateString('pt-BR')}</span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                
                {/* Pagination Controls */}
                 {!loading && filteredClients.length > 0 && (
                     <div className="border-t border-gray-100 dark:border-gray-800 p-4 bg-gray-50 dark:bg-[#111] flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="text-xs font-bold text-gray-500 dark:text-gray-400">
                            Exibindo {startIndex + 1} - {Math.min(startIndex + itemsPerPage, filteredClients.length)} de {filteredClients.length} clientes
                        </div>
                        
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mr-2">Itens por página:</span>
                            {[50, 100, 300].map(limit => (
                                <button
                                    key={limit}
                                    onClick={() => { setItemsPerPage(limit); setCurrentPage(1); }}
                                    className={`px-3 py-1 rounded text-xs font-bold ${itemsPerPage === limit ? 'bg-white dark:bg-[#222] shadow text-black dark:text-white border border-gray-200 dark:border-gray-700' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`}
                                >
                                    {limit}
                                </button>
                            ))}
                        </div>

                        <div className="flex items-center gap-2">
                             <button 
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1.5 rounded bg-white dark:bg-[#222] border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-600 dark:text-gray-400 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-white/5"
                             >
                                Anterior
                             </button>
                             <span className="text-xs font-bold text-gray-900 dark:text-white">
                                Página {currentPage} de {totalPages}
                             </span>
                             <button 
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1.5 rounded bg-white dark:bg-[#222] border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-600 dark:text-gray-400 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-white/5"
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
                    <div className="bg-white dark:bg-[#1A1A1A] rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 border border-gray-100 dark:border-gray-800">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-[#111]">
                            <div>
                                <h3 className="font-black text-xl text-gray-900 dark:text-white">Adicionar ao Grupo</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 font-bold">{selectedClients.length} contatos selecionados</p>
                            </div>
                            <button onClick={() => setIsGroupModalOpen(false)} className="text-gray-400 hover:text-red-500">
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="p-6 space-y-6">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Selecione o Grupo</label>
                                <select 
                                    className="w-full p-3 bg-gray-50 dark:bg-[#222] border border-gray-200 dark:border-gray-700 dark:text-white rounded-xl text-sm font-bold focus:ring-2 focus:ring-wtech-gold outline-none"
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
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Nome do Novo Grupo</label>
                                    <input 
                                        type="text" 
                                        placeholder="Ex: Alunos VIP 2024"
                                        className="w-full p-3 bg-gray-50 dark:bg-[#222] border border-gray-200 dark:border-gray-700 dark:text-white rounded-xl text-sm font-bold focus:ring-2 focus:ring-wtech-gold outline-none"
                                        value={newListName}
                                        onChange={(e) => setNewListName(e.target.value)}
                                        autoFocus
                                    />
                                </div>
                            )}

                            <div className="flex justify-end gap-3 pt-4">
                                <button 
                                    onClick={() => setIsGroupModalOpen(false)}
                                    className="px-4 py-3 text-sm font-bold text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    onClick={handleAddToGroup}
                                    disabled={!selectedListId || (selectedListId === 'new' && !newListName) || isSavingGroup}
                                    className="bg-wtech-black dark:bg-white dark:text-black text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-gray-800 dark:hover:bg-gray-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSavingGroup ? 'Salvando...' : 'Salvar Grupo'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {selectedClientForEdit && (
                <ClientDetailModal 
                    client={selectedClientForEdit} 
                    onClose={() => setSelectedClientForEdit(null)}
                    onUpdate={fetchClients}
                    permissions={permissions}
                    users={attendants}
                />
            )}
        </div>
    );
};

export default ClientsManagerView;
