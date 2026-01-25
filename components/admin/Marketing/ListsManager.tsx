import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../context/AuthContext';
import { MarketingList } from '../../../types';
import { Plus, Users, Search, Filter, Trash2, Edit, Save, X, Check, RefreshCw, Eye, Mail, Phone, Upload, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';

const ListsManager = ({ permissions }: { permissions?: any }) => {
    const hasPerm = (key: string) => {
        if (!permissions) return true;
        if (permissions.admin_access) return true;
        return !!permissions[key] || !!permissions['manage_marketing'];
    };

    const { user } = useAuth();
    const [lists, setLists] = useState<MarketingList[]>([]);
    const [users, setUsers] = useState<any[]>([]); // User mapping
    const [isLoading, setIsLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    
    // Member Management
    const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
    const [selectedList, setSelectedList] = useState<MarketingList | null>(null);
    const [members, setMembers] = useState<any[]>([]);
    const [isFetchingMembers, setIsFetchingMembers] = useState(false);
    const [isAddingMember, setIsAddingMember] = useState(false);
    const [newMember, setNewMember] = useState({ name: '', email: '', phone: '' });
    
    // Existing Clients Search
    const [allSelectableClients, setAllSelectableClients] = useState<any[]>([]);
    const [clientSearchTerm, setClientSearchTerm] = useState('');
    const [showClientResults, setShowClientResults] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importData, setImportData] = useState<any[]>([]);
    const [isImporting, setIsImporting] = useState(false);
    const [importFile, setImportFile] = useState<File | null>(null);

    // Form State
    const [currentList, setCurrentList] = useState<Partial<MarketingList>>({
        name: '',
        description: '',
        type: 'Static',
        rules: {},
        ownerId: '' 
    });

    // Courses for Filters
    const [courses, setCourses] = useState<any[]>([]);

    useEffect(() => {
        if (user?.id) {
            fetchLists();
            fetchCourses();
            fetchUsers();
            fetchPotentialClients();
        }
    }, [user?.id, permissions]);

    useEffect(() => {
        if (selectedList && isMembersModalOpen) {
            fetchMembers(selectedList.id);
        }
    }, [selectedList, isMembersModalOpen]);

    const fetchUsers = async () => {
        const { data } = await supabase.from('SITE_Users').select('id, name, email');
        if (data) setUsers(data);
    };

    const fetchLists = async () => {
        setIsLoading(true);
        let query = supabase
            .from('SITE_MarketingLists')
            .select('*')
            .order('created_at', { ascending: false });
        
        // Filter by owner if NOT admin
        const isAdmin = permissions?.admin_access; 
        if (!isAdmin) {
            if (user?.id) {
                query = query.eq('owner_id', user.id);
            } else {
                setIsLoading(false);
                return;
            }
        }

        const { data, error } = await query;
        
        if (data) {
             setLists(data.map((l: any) => ({ 
                 ...l, 
                 ownerId: l.owner_id,
                 createdAt: l.created_at // Ensure mapping
             })));
        }
        setIsLoading(false);
    };

    const fetchMembers = async (listId: string) => {
        setIsFetchingMembers(true);
        const { data } = await supabase
            .from('SITE_MarketingListMembers')
            .select('*')
            .eq('list_id', listId)
            .order('name', { ascending: true });
        
        if (data) setMembers(data);
        setIsFetchingMembers(false);
    };

    const handleDeleteMember = async (memberId: string) => {
        if (!confirm('Remover este contato do grupo?')) return;
        const { error } = await supabase.from('SITE_MarketingListMembers').delete().eq('id', memberId);
        if (!error && selectedList) fetchMembers(selectedList.id);
    };

    const fetchPotentialClients = async () => {
        const { data: leads } = await supabase.from('SITE_Leads').select('id, name, email, phone').order('name');
        const { data: mechanics } = await supabase.from('SITE_Mechanics').select('id, name, email, phone').order('name');
        
        const combined = [
            ...(leads || []).map(l => ({ ...l, type: 'Lead' })),
            ...(mechanics || []).map(m => ({ ...m, type: 'Credenciado' }))
        ].sort((a, b) => a.name.localeCompare(b.name));
        
        setAllSelectableClients(combined);
    };

    const handleAddExistingClient = async (client: any) => {
        if (!selectedList) return;
        setIsFetchingMembers(true);
        const { error } = await supabase.from('SITE_MarketingListMembers').insert([{
            list_id: selectedList.id,
            name: client.name,
            email: client.email || null,
            phone: client.phone || '',
            lead_id: client.type === 'Lead' ? client.id : null
        }]);

        if (!error) {
            fetchMembers(selectedList.id);
            setClientSearchTerm('');
            setShowClientResults(false);
        } else {
            alert('Erro ao vincular: ' + error.message);
        }
        setIsFetchingMembers(false);
    };

    const handleAddManualMember = async () => {
        if (!selectedList || !newMember.name) return alert('Nome é obrigatório');
        
        setIsAddingMember(true);
        const { error } = await supabase.from('SITE_MarketingListMembers').insert([{
            list_id: selectedList.id,
            name: newMember.name,
            email: newMember.email || null,
            phone: newMember.phone || ''
        }]);

        if (!error) {
            setNewMember({ name: '', email: '', phone: '' });
            fetchMembers(selectedList.id);
        } else {
            alert('Erro ao adicionar: ' + error.message);
        }
        setIsAddingMember(false);
    };

    const fetchCourses = async () => {
        const { data } = await supabase.from('SITE_Courses').select('id, title').eq('status', 'Published');
        if (data) setCourses(data);
    };

    const handleSave = async () => {
        if (!currentList.name) return alert('Nome da lista é obrigatório');
        
        setIsLoading(true);
        try {
            const ownerToSave = currentList.ownerId || user?.id;

            const payload = {
                name: currentList.name,
                description: currentList.description,
                type: currentList.type,
                rules: currentList.rules,
                owner_id: ownerToSave
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
            setCurrentList({ name: '', description: '', type: 'Static', rules: {}, ownerId: '' });
            fetchLists();
        } catch (error: any) {
            alert('Erro ao salvar: ' + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setImportFile(file);

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws);
                setImportData(data);
                
                // Set a default name for the group if not set
                if (!currentList.name) {
                    const fileName = file.name.split('.')[0];
                    setCurrentList(prev => ({ ...prev, name: `Importação: ${fileName}` }));
                }
            } catch (err) {
                alert("Erro ao ler o arquivo XLS. Certifique-se de que é um formato válido.");
                console.error(err);
            }
        };
        reader.readAsBinaryString(file);
    };

    const handleConfirmImport = async () => {
        if (!currentList.name) return alert('Dê um nome ao novo grupo.');
        if (importData.length === 0) return alert('Nenhum dado para importar.');

        setIsImporting(true);
        try {
            // 1. Create the list first
            const ownerToSave = user?.id;
            const { data: listData, error: listError } = await supabase.from('SITE_MarketingLists').insert([{
                name: currentList.name,
                description: currentList.description || 'Importado via XLS',
                type: 'Static',
                owner_id: ownerToSave
            }]).select().single();

            if (listError) throw listError;

            // 2. Prepare members
            // Cleaning logic for phone: remove non-numeric chars
            const membersPayload = importData.map(row => {
                const rawPhone = String(row['Telefone'] || row['Phone'] || row['telefone'] || row['phone'] || '');
                const cleanPhone = rawPhone.replace(/\D/g, '');
                
                return {
                    list_id: listData.id,
                    name: String(row['Cliente'] || row['Name'] || row['cliente'] || row['nome'] || 'Sem Nome').trim(),
                    email: String(row['E-mail'] || row['Email'] || row['email'] || row['e-mail'] || '').trim() || null,
                    phone: cleanPhone
                };
            }).filter(m => m.name && m.phone);

            if (membersPayload.length === 0) {
                throw new Error("Nenhum contato válido encontrado. Verifique as colunas 'Cliente' e 'Telefone'.");
            }

            // 3. Batch insert members in chunks of 100 to avoid limits
            const CHUNK_SIZE = 100;
            for (let i = 0; i < membersPayload.length; i += CHUNK_SIZE) {
                const chunk = membersPayload.slice(i, i + CHUNK_SIZE);
                const { error: membersError } = await supabase.from('SITE_MarketingListMembers').insert(chunk);
                if (membersError) throw membersError;
            }

            alert(`${membersPayload.length} contatos importados com sucesso para o grupo "${currentList.name}"!`);
            setIsImportModalOpen(false);
            setImportData([]);
            setImportFile(null);
            setCurrentList({ name: '', description: '', type: 'Static', rules: {}, ownerId: '' });
            fetchLists();
        } catch (err: any) {
            alert("Erro na importação: " + err.message);
        } finally {
            setIsImporting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Excluir esta lista? (Os membros vinculados serão mantidos se pertencerem a outras listas)')) return;
        const { error } = await supabase.from('SITE_MarketingLists').delete().eq('id', id);
        if (!error) fetchLists();
    };

    const getUserName = (uid?: string) => {
        if (!uid) return 'Sistema';
        const found = users.find(u => u.id === uid);
        return found ? found.name : 'Desconhecido';
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                     <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                        <Users className="text-blue-600 dark:text-blue-400" /> Listas de Contatos
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Gerencie grupos de contatos por usuário.</p>
                </div>
                {!isEditing && hasPerm('marketing_manage_lists') && (
                    <div className="flex gap-2">
                        <button 
                            onClick={() => { 
                                setIsImportModalOpen(true); 
                                setImportFile(null);
                                setImportData([]);
                                setCurrentList({ name: '', description: '', type: 'Static', rules: {}, ownerId: user?.id }); 
                            }}
                            className="bg-green-600 text-white px-4 py-2 rounded text-sm font-bold flex items-center gap-2 hover:bg-green-700 shadow-lg transition-all"
                        >
                            <FileSpreadsheet size={16} /> Importar XLS
                        </button>
                        <button 
                            onClick={() => { setIsEditing(true); setCurrentList({ name: '', description: '', type: 'Static', rules: {}, ownerId: user?.id }); }}
                            className="bg-black text-white px-4 py-2 rounded text-sm font-bold flex items-center gap-2 hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200 shadow-lg"
                        >
                            <Plus size={16} /> Nova Lista
                        </button>
                    </div>
                )}
            </div>

            {isEditing && (
                <div className="bg-gray-50 dark:bg-[#222] p-6 rounded-xl border border-gray-200 dark:border-gray-700 animate-in fade-in slide-in-from-top-4">
                     <div className="flex justify-between items-center mb-4">
                        <h4 className="font-bold text-gray-700 dark:text-white">{currentList.id ? 'Editar Lista' : 'Nova Lista'}</h4>
                        <button onClick={() => setIsEditing(false)}><X size={20} className="text-gray-400 hover:text-red-500" /></button>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">Nome da Lista</label>
                                <input 
                                    className="w-full border border-gray-300 dark:border-gray-600 rounded p-2 text-sm dark:bg-[#1A1A1A] dark:text-white" 
                                    placeholder="Ex: Alunos de Offroad 2024"
                                    value={currentList.name}
                                    onChange={e => setCurrentList({...currentList, name: e.target.value})}
                                />
                            </div>
                           
                            <div>
                                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">Dono da Lista (Vinculado)</label>
                                <select 
                                    className="w-full border border-gray-300 dark:border-gray-600 rounded p-2 text-sm bg-white dark:bg-[#1A1A1A] dark:text-white"
                                    value={currentList.ownerId || ''}
                                    onChange={e => setCurrentList({...currentList, ownerId: e.target.value})}
                                >
                                    <option value="">-- Atribuir a Mim --</option>
                                    {users.map(u => (
                                        <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">Descrição</label>
                                <input 
                                    className="w-full border border-gray-300 dark:border-gray-600 rounded p-2 text-sm dark:bg-[#1A1A1A] dark:text-white" 
                                    placeholder="Opcional"
                                    value={currentList.description || ''}
                                    onChange={e => setCurrentList({...currentList, description: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">Tipo de Lista</label>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input 
                                            type="radio" 
                                            name="listType" 
                                            checked={currentList.type === 'Static'} 
                                            onChange={() => setCurrentList({...currentList, type: 'Static'})} 
                                        />
                                        <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">Estática (Manual)</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input 
                                            type="radio" 
                                            name="listType" 
                                            checked={currentList.type === 'Dynamic'} 
                                            onChange={() => setCurrentList({...currentList, type: 'Dynamic'})} 
                                        />
                                        <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">Dinâmica (Filtros)</span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        {currentList.type === 'Dynamic' && (
                            <div className="bg-white dark:bg-[#1A1A1A] p-4 rounded border border-gray-200 dark:border-gray-700">
                                <h5 className="font-bold text-sm mb-3 flex items-center gap-2 dark:text-white"><Filter size={14} /> Regras de Filtragem</h5>
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Filtrar por Curso</label>
                                        <select 
                                            className="w-full border border-gray-300 dark:border-gray-600 rounded p-2 text-sm dark:bg-[#222] dark:text-white"
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
                                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Status do Lead</label>
                                        <select 
                                            className="w-full border border-gray-300 dark:border-gray-600 rounded p-2 text-sm dark:bg-[#222] dark:text-white"
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
                             <div className="bg-white dark:bg-[#1A1A1A] p-4 rounded border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-400 text-sm">
                                <p>Contatos são adicionados manualmente ou via importação após salvar a lista.</p>
                             </div>
                        )}
                     </div>

                     <div className="flex justify-end gap-2 mt-6">
                        <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors">Cancelar</button>
                        <button onClick={handleSave} disabled={isLoading} className="bg-green-600 text-white px-6 py-2 rounded text-sm font-bold hover:bg-green-700 disabled:opacity-50 flex items-center gap-2">
                            <Save size={16} /> Salvar Lista
                        </button>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {lists.map(list => (
                    <div key={list.id} className="bg-white dark:bg-[#1A1A1A] p-5 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-all group relative">
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${list.type === 'Dynamic' ? 'bg-purple-500' : 'bg-blue-500'}`}></span>
                                <span className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">{list.type === 'Dynamic' ? 'Dinâmica' : 'Estática'}</span>
                            </div>
                            {hasPerm('marketing_manage_lists') && (
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                        onClick={() => { setCurrentList(list); setIsEditing(true); }}
                                        className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500 rounded"
                                    >
                                        <Edit size={14} />
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(list.id)}
                                        className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 rounded"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            )}
                        </div>
                        
                        <h4 className="font-bold text-gray-800 dark:text-gray-100 text-lg mb-1">{list.name}</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2 line-clamp-2">{list.description || 'Sem descrição'}</p>

                         {/* Owner Badge */}
                         {list.ownerId && (
                             <div className="flex items-center gap-1.5 mb-3 bg-gray-50 dark:bg-[#222] px-2 py-1 rounded w-fit">
                                <Users size={10} className="text-gray-400" />
                                <span className="text-[10px] uppercase font-bold text-gray-600 dark:text-gray-300">
                                    {getUserName(list.ownerId)}
                                </span>
                             </div>
                         )}

                         <div className="pt-3 border-t border-gray-50 dark:border-gray-800 flex justify-between items-center text-xs text-gray-400">
                            <span>Criada em: {list.createdAt ? new Date(list.createdAt).toLocaleDateString() : 'N/A'}</span>
                            <button 
                                onClick={() => { setSelectedList(list); setIsMembersModalOpen(true); }}
                                className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-bold hover:underline"
                            >
                                <Eye size={12} /> Ver Membros
                            </button>
                        </div>
                    </div>
                ))}
            </div>
            
            {/* Members Modal */}
            {isMembersModalOpen && selectedList && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white dark:bg-[#1A1A1A] rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[80vh] border dark:border-gray-800">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-[#222]">
                            <div>
                                <h3 className="font-black text-xl text-gray-900 dark:text-white">{selectedList.name}</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">{members.length} Membros Vinculados</p>
                            </div>
                            <button onClick={() => setIsMembersModalOpen(false)} className="text-gray-400 hover:text-red-500">
                                <X size={24} />
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                            {/* NEW: Pull Existing Client Section */}
                            <div className="space-y-3">
                                <h4 className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest flex items-center gap-2 px-1">
                                    <Search size={14} /> Puxar Cliente Existente
                                </h4>
                                <div className="relative">
                                    <div className="relative">
                                        <input 
                                            type="text" 
                                            placeholder="Buscar por nome, e-mail ou telefone..."
                                            className="w-full bg-white dark:bg-[#222] border-2 border-gray-100 dark:border-gray-700 rounded-2xl px-12 py-4 text-sm font-bold outline-none focus:border-blue-500 dark:focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all dark:text-white"
                                            value={clientSearchTerm}
                                            onChange={e => {
                                                setClientSearchTerm(e.target.value);
                                                setShowClientResults(true);
                                            }}
                                            onFocus={() => setShowClientResults(true)}
                                        />
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                        {clientSearchTerm && (
                                            <button 
                                                onClick={() => { setClientSearchTerm(''); setShowClientResults(false); }}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500"
                                            >
                                                <X size={18} />
                                            </button>
                                        )}
                                    </div>

                                    {/* Search Results Dropdown */}
                                    {showClientResults && clientSearchTerm && (
                                        <div className="absolute z-50 left-0 right-0 mt-2 bg-white dark:bg-[#1A1A1A] rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 max-h-60 overflow-y-auto animate-in slide-in-from-top-2">
                                            {allSelectableClients
                                                .filter(c => 
                                                    c.name.toLowerCase().includes(clientSearchTerm.toLowerCase()) ||
                                                    (c.email && c.email.toLowerCase().includes(clientSearchTerm.toLowerCase())) ||
                                                    (c.phone && c.phone.includes(clientSearchTerm))
                                                )
                                                .slice(0, 10)
                                                .map(client => (
                                                    <button
                                                        key={`${client.type}-${client.id}`}
                                                        onClick={() => handleAddExistingClient(client)}
                                                        className="w-full flex items-center justify-between p-4 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-left transition-colors border-b last:border-0 border-gray-50 dark:border-gray-800"
                                                    >
                                                        <div>
                                                            <p className="font-bold text-sm text-gray-900 dark:text-white">{client.name}</p>
                                                            <p className="text-[10px] text-gray-400 font-medium">
                                                                {client.type} • {client.email || 'Sem e-mail'}
                                                            </p>
                                                        </div>
                                                        <Plus size={16} className="text-blue-500" />
                                                    </button>
                                                ))}
                                            {allSelectableClients.filter(c => c.name.toLowerCase().includes(clientSearchTerm.toLowerCase())).length === 0 && (
                                                <div className="p-4 text-center text-sm text-gray-400 font-bold">
                                                    Nenhum cliente encontrado.
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Manual Member Form - Fixed for Overflow */}
                            <div className="bg-gray-50 dark:bg-[#222] p-5 rounded-3xl border border-gray-100 dark:border-gray-700 space-y-4">
                                <h4 className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                    <Plus size={14} className="text-blue-600 dark:text-blue-400" /> Ou Cadastrar Novo Contato
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Nome</label>
                                        <input 
                                            type="text" 
                                            placeholder="Nome completo"
                                            className="w-full bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500/20 dark:text-white"
                                            value={newMember.name}
                                            onChange={e => setNewMember({...newMember, name: e.target.value})}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase ml-1">E-mail</label>
                                        <input 
                                            type="email" 
                                            placeholder="exemplo@v.com"
                                            className="w-full bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500/20 dark:text-white"
                                            value={newMember.email}
                                            onChange={e => setNewMember({...newMember, email: e.target.value})}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase ml-1">WhatsApp</label>
                                        <div className="flex gap-2">
                                            <input 
                                                type="text" 
                                                placeholder="(00) 00000-0000"
                                                className="w-full bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500/20 dark:text-white"
                                                value={newMember.phone}
                                                onChange={e => setNewMember({...newMember, phone: e.target.value})}
                                            />
                                            <button 
                                                onClick={handleAddManualMember}
                                                disabled={isAddingMember || !newMember.name}
                                                className="bg-blue-600 text-white p-3 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-all active:scale-95 shadow-lg flex-shrink-0"
                                            >
                                                {isAddingMember ? <RefreshCw className="animate-spin" size={20} /> : <Check size={20} />}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-2">
                                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 px-1 underline decoration-gray-200 dark:decoration-gray-700 underline-offset-4">Contatos no Grupo</h4>
                                {isFetchingMembers ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                                        <RefreshCw className="animate-spin mb-2" size={32} />
                                        <p className="font-bold">Carregando membros...</p>
                                    </div>
                                ) : members.length === 0 ? (
                                    <div className="text-center py-12 text-gray-400">
                                        <Users size={48} className="mx-auto mb-2 opacity-20" />
                                        <p>Nenhum membro encontrado nesta lista.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {members.map(member => (
                                            <div key={member.id} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-[#1A1A1A] hover:bg-gray-50 dark:hover:bg-[#222] transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                                                        {member.name?.charAt(0) || '?'}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-sm text-gray-900 dark:text-gray-100">{member.name}</p>
                                                        <div className="flex items-center gap-3 text-[10px] text-gray-500 dark:text-gray-400 font-medium">
                                                            <span className="flex items-center gap-1"><Mail size={10} /> {member.email || 'N/A'}</span>
                                                            <span className="flex items-center gap-1"><Phone size={10} /> {member.phone || 'N/A'}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={() => handleDeleteMember(member.id)}
                                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                                                    title="Remover do grupo"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#222] flex justify-end">
                            <button 
                                onClick={() => setIsMembersModalOpen(false)}
                                className="bg-black text-white px-8 py-3 rounded-xl font-bold hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200 transition-all active:scale-95 shadow-lg"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* NEW: Import XLS Modal */}
            {isImportModalOpen && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white dark:bg-[#1A1A1A] rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col border border-gray-100 dark:border-gray-800">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-[#111]">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-2xl flex items-center justify-center">
                                    <FileSpreadsheet size={24} />
                                </div>
                                <div>
                                    <h3 className="font-black text-xl text-gray-900 dark:text-white uppercase tracking-tight">Importar Contatos</h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 font-bold">Crie um novo grupo via Excel (.xls, .xlsx)</p>
                                </div>
                            </div>
                            <button onClick={() => setIsImportModalOpen(false)} className="text-gray-400 hover:text-red-500">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-8 space-y-6">
                            {/* Step 1: File Selection */}
                            <div className="space-y-4">
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest">1. Selecione o Arquivo</label>
                                <div className={`relative border-2 border-dashed rounded-3xl p-8 transition-all flex flex-col items-center justify-center gap-4 ${importFile ? 'border-green-500 bg-green-50/10' : 'border-gray-200 dark:border-gray-800 hover:border-blue-500 hover:bg-blue-50/5'}`}>
                                    <input 
                                        type="file" 
                                        accept=".xlsx, .xls"
                                        onChange={handleFileUpload}
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                    />
                                    {importFile ? (
                                        <>
                                            <div className="w-16 h-16 bg-green-500 text-white rounded-full flex items-center justify-center shadow-lg">
                                                <Check size={32} />
                                            </div>
                                            <div className="text-center">
                                                <p className="font-bold text-gray-900 dark:text-white">{importFile.name}</p>
                                                <p className="text-xs text-green-600 font-bold uppercase">{importData.length} Contatos identificados</p>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <Upload size={40} className="text-gray-300" />
                                            <div className="text-center">
                                                <p className="font-bold text-gray-700 dark:text-gray-200">Clique ou arraste seu arquivo XLS aqui</p>
                                                <p className="text-xs text-gray-400 mt-1">Colunas esperadas: Cliente, Telefone, E-mail</p>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Step 2: Group Settings */}
                            {importData.length > 0 && (
                                <div className="space-y-4 animate-in slide-in-from-top-4">
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest">2. Configuração do Grupo</label>
                                    <div className="grid gap-4">
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase ml-1 mb-1">Nome do Grupo</label>
                                            <input 
                                                className="w-full bg-gray-50 dark:bg-[#222] border border-gray-100 dark:border-gray-700 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-green-500 dark:text-white"
                                                placeholder="Nome do grupo..."
                                                value={currentList.name}
                                                onChange={e => setCurrentList({...currentList, name: e.target.value})}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase ml-1 mb-1">Descrição (Opcional)</label>
                                            <input 
                                                className="w-full bg-gray-50 dark:bg-[#222] border border-gray-100 dark:border-gray-700 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-green-500 dark:text-white"
                                                placeholder="Ex: Importação lista de janeiro"
                                                value={currentList.description || ''}
                                                onChange={e => setCurrentList({...currentList, description: e.target.value})}
                                            />
                                        </div>
                                    </div>

                                    {/* Preview Table */}
                                    <div className="mt-4 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden max-h-40 overflow-y-auto bg-gray-50/50">
                                        <table className="w-full text-[10px]">
                                            <thead className="bg-gray-100 dark:bg-[#222] text-gray-500 uppercase font-black">
                                                <tr>
                                                    <th className="px-4 py-2 text-left">Cliente</th>
                                                    <th className="px-4 py-2 text-left">Telefone (Limpo)</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                                {importData.slice(0, 5).map((row: any, i) => (
                                                    <tr key={i} className="text-gray-600 dark:text-gray-400">
                                                        <td className="px-4 py-2">{row['Cliente'] || row['Name'] || '-'}</td>
                                                        <td className="px-4 py-2">{String(row['Telefone'] || row['Phone'] || '').replace(/\D/g, '')}</td>
                                                    </tr>
                                                ))}
                                                {importData.length > 5 && (
                                                    <tr>
                                                        <td colSpan={2} className="px-4 py-2 text-center bg-gray-50 italic">e mais {importData.length - 5} contatos...</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#111] flex justify-end gap-3">
                            <button 
                                onClick={() => setIsImportModalOpen(false)}
                                className="px-6 py-3 text-sm font-bold text-gray-500 hover:text-gray-700 font-bold"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={handleConfirmImport}
                                disabled={!importFile || !currentList.name || isImporting}
                                className="bg-green-600 text-white px-10 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-green-700 transition-all active:scale-95 shadow-xl disabled:opacity-50"
                            >
                                {isImporting ? <RefreshCw size={20} className="animate-spin" /> : <Check size={20} />}
                                {isImporting ? 'Importando...' : 'Confirmar Importação'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
