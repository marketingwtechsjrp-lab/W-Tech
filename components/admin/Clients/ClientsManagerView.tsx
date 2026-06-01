import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, User, UserPlus, Phone, Mail, Filter, Shield, Users, Plus, X, Upload, FileSpreadsheet, Trash2, Download, FileText } from 'lucide-react';
import { useRegisterPage } from '../keyboard/AdminKeyboardProvider';
import { supabase } from '../../../lib/supabaseClient';
import { MarketingList } from '../../../types';
import { useAuth } from '../../../context/AuthContext';
import ListsManager from '../Marketing/ListsManager';
import { ClientDetailModal } from './ClientDetailModal';
import { cn } from '../../../lib/utils';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const parseLPSource = (contextId: string | undefined): string => {
    if (!contextId) return 'Sem origem';
    const ctx = contextId.trim();

    // "LP: Ergonomia Corporal (lp-ergonomia)" → "LP: Ergonomia Corporal"
    if (ctx.startsWith('LP:')) {
        const inner = ctx.slice(3).trim().replace(/\s*\([^)]+\)\s*$/, '').trim();
        return 'LP: ' + inner;
    }

    // "LP LISBOA ABRIL 2026: Honda CBR600RR" → "LP LISBOA ABRIL 2026"
    if (ctx.startsWith('LP ')) {
        const colonIdx = ctx.indexOf(':');
        return colonIdx > 0 ? ctx.slice(0, colonIdx).trim() : ctx;
    }

    // "Quiz Completed: CURSO SUSPENSÃO SJRP [QUENTE]" → "Quiz: CURSO SUSPENSÃO SJRP"
    if (ctx.startsWith('Quiz Completed:')) {
        const inner = ctx.slice('Quiz Completed:'.length).trim().replace(/\s*\[.*?\]\s*/g, '').trim();
        return 'Quiz: ' + inner;
    }

    // Known short labels kept as-is
    if (['Manual', 'Import', 'Evento', 'Direto', 'Site'].includes(ctx)) return ctx;

    // Long strings (contact form messages)
    if (ctx.length > 40) return 'Formulário de Contato';

    return ctx;
};

const ClientsManagerView = ({ permissions }: { permissions?: any }) => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'clients' | 'groups'>('clients');
    const [clients, setClients] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [filterLP, setFilterLP] = useState('all');
    const searchRef = useRef<HTMLInputElement>(null);

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
                lpSource: parseLPSource(l.context_id),
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
                lpSource: 'Credenciado',
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
        try {
            // 1. Fetch existing leads for deduplication
            const { data: existingLeads } = await supabase
                .from('SITE_Leads')
                .select('id, name, phone');

            const existingLeadsMap = new Map();
            existingLeads?.forEach(l => {
                const normName = l.name?.toLowerCase().trim();
                const normPhone = l.phone?.replace(/\D/g, '');
                if (normName && normPhone) {
                    existingLeadsMap.set(`${normName}-${normPhone}`, l.id);
                }
            });

            const toInsert: any[] = [];
            const toUpdateMap = new Map<string, any>(); // Map to prevent duplicate updates for same ID
            const newLeadsProcessed = new Set<string>(); // Set to prevent duplicate inserts in same batch

            data.forEach(row => {
                const name = row['Nome'] || row['name'] || row['Cliente'] || 'Importado';
                const email = row['Email'] || row['email'] || null;
                const phone = row['Telefone'] || row['phone'] || row['Celular'] || null;
                const normalizedPhone = phone ? String(phone).replace(/\D/g, '') : '';
                const key = `${String(name).toLowerCase().trim()}-${normalizedPhone}`;

                const leadData: any = {
                    name,
                    email,
                    phone: String(phone || ''),
                    updated_at: new Date().toISOString()
                };

                if (existingLeadsMap.has(key)) {
                    const existingId = existingLeadsMap.get(key);
                    // Only keep the most recent occurrence from the file
                    toUpdateMap.set(existingId, { 
                        id: existingId, 
                        ...leadData 
                    });
                } else {
                    if (!newLeadsProcessed.has(key)) {
                        toInsert.push({
                            ...leadData,
                            status: 'New',
                            assigned_to: user?.id,
                            context_id: 'Import'
                        });
                        newLeadsProcessed.add(key);
                    }
                }
            });

            // 2. Execute Updates
            const toUpdate = Array.from(toUpdateMap.values());
            if (toUpdate.length > 0) {
                // Upsert with ID updates existing records
                const { error: updateError } = await supabase.from('SITE_Leads').upsert(toUpdate);
                if (updateError) throw updateError;
            }

            // 3. Execute Inserts
            if (toInsert.length > 0) {
                const { error: insertError } = await supabase.from('SITE_Leads').insert(toInsert);
                if (insertError) throw insertError;
            }

            alert(`${toInsert.length} novos leads inseridos e ${toUpdate.length} atualizados com sucesso!`);
            fetchClients();
        } catch (error: any) {
            console.error("Import Error:", error);
            alert("Erro na importação: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const canSeeAll = permissions?.admin_access || permissions?.clients_view_all;

    const filteredClients = clients.filter(client => {
        // 1. Basic Type & Search Filters
        const matchesSearch = client.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              client.phone?.includes(searchTerm);
        const matchesType = filterType === 'all' || client.type === filterType;
        const matchesLP = filterLP === 'all' || client.lpSource === filterLP;

        if (!matchesSearch || !matchesType || !matchesLP) return false;

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

    const handleBulkDelete = async () => {
        if (selectedClients.length === 0) return;
        
        const count = selectedClients.length;
        if (!confirm(`Deseja excluir permanentemente ${count} contatos selecionados? Esta ação irá remover também o histórico de tarefas e participações em grupos.`)) {
            return;
        }

        setLoading(true);
        try {
            const selectedLeads = clients
                .filter(c => selectedClients.includes(c.id) && c.type === 'Lead')
                .map(c => c.id);
            
            const selectedMechanics = clients
                .filter(c => selectedClients.includes(c.id) && c.type === 'Credenciado')
                .map(c => c.id);

            // Function to process in batches
            const batchProcess = async (ids: string[], table: string) => {
                const BATCH_SIZE = 100;
                for (let i = 0; i < ids.length; i += BATCH_SIZE) {
                    const batch = ids.slice(i, i + BATCH_SIZE);
                    
                    // 1. Clean dependencies for Leads
                    if (table === 'SITE_Leads') {
                        await supabase.from('SITE_Tasks').delete().in('lead_id', batch);
                        await supabase.from('SITE_MarketingListMembers').delete().in('lead_id', batch);
                    }

                    // 2. Delete the actual record
                    const { error } = await supabase.from(table).delete().in('id', batch);
                    if (error) throw error;
                }
            };

            if (selectedLeads.length > 0) {
                await batchProcess(selectedLeads, 'SITE_Leads');
            }

            if (selectedMechanics.length > 0) {
                await batchProcess(selectedMechanics, 'SITE_Mechanics');
            }

            alert(`${count} contatos e suas dependências excluídos com sucesso!`);
            setSelectedClients([]);
            fetchClients();
        } catch (error: any) {
            console.error("Bulk Delete Error:", error);
            alert("Erro ao excluir contatos: " + (error.message || "Erro desconhecido"));
        } finally {
            setLoading(false);
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
            // 2. Prepare Members Payload
            const clientsToAdd = clients.filter(c => selectedClients.includes(c.id));
            
            // Deduplicate by phone locally to prevent batch errors
            const uniquePhones = new Set<string>();
            const membersPayload: any[] = [];

            clientsToAdd.forEach(c => {
                const phone = c.phone ? String(c.phone).trim() : '';
                // Skip if no phone or if already processed in this batch
                if (!phone) return;
                
                if (!uniquePhones.has(phone)) {
                    uniquePhones.add(phone);
                    membersPayload.push({
                        list_id: targetListId,
                        name: c.name,
                        email: c.email?.trim() || null,
                        phone: phone,
                        lead_id: c.type === 'Lead' ? c.id : null,
                    });
                }
            });

            if (membersPayload.length === 0) {
                alert("Nenhum contato com telefone válido selecionado.");
                setIsSavingGroup(false);
                return;
            }

            // 3. Insert Members using Upsert to ignore existing
            const { error: membersError } = await supabase
                .from('SITE_MarketingListMembers')
                .upsert(membersPayload, { onConflict: 'list_id, phone', ignoreDuplicates: true });

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

    const handleSyncDeduplication = async () => {
        if (!confirm("Deseja sincronizar e unir cadastros com o mesmo telefone? Esta ação irá mesclar as informações e atualizar o histórico de tarefas.")) return;
        
        setLoading(true);
        try {
            // 1. Fetch all leads
            const { data: allLeads, error: fetchError } = await supabase
                .from('SITE_Leads')
                .select('*');
            
            if (fetchError) throw fetchError;
            if (!allLeads || allLeads.length === 0) return;

            // 2. Group by normalized phone
            const groups = new Map<string, any[]>();
            allLeads.forEach(lead => {
                const phone = lead.phone?.replace(/\D/g, '');
                if (phone && phone.length >= 8) {
                    if (!groups.has(phone)) groups.set(phone, []);
                    groups.get(phone)?.push(lead);
                }
            });

            let mergedCount = 0;
            let updatedTasksCount = 0;

            for (const [phone, records] of groups.entries()) {
                if (records.length <= 1) continue;

                // Sort by creation date (keep the oldest)
                records.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
                
                const survivor = records[0];
                const duplicates = records.slice(1);

                // Build merged data
                const updates: any = {};
                duplicates.forEach(dup => {
                    if (!survivor.email && dup.email) updates.email = dup.email;
                    if (!survivor.cpf && dup.cpf) updates.cpf = dup.cpf;
                    if (!survivor.rg && dup.rg) updates.rg = dup.rg;
                    if (!survivor.address && dup.address) updates.address = dup.address;
                });

                // Update survivor if needed
                if (Object.keys(updates).length > 0) {
                    await supabase.from('SITE_Leads').update(updates).eq('id', survivor.id);
                }

                // Relink Tasks
                const duplicateIds = duplicates.map(d => d.id);
                const { data: affectedTasks } = await supabase
                    .from('SITE_Tasks')
                    .update({ lead_id: survivor.id })
                    .in('lead_id', duplicateIds)
                    .select('id');
                
                updatedTasksCount += (affectedTasks?.length || 0);

                // Delete Duplicates
                const { error: delError } = await supabase
                    .from('SITE_Leads')
                    .delete()
                    .in('id', duplicateIds);
                
                if (delError) console.error("Error deleting dups for phone", phone, delError);
                else mergedCount += duplicateIds.length;
            }

            alert(`Sincronização concluída!\n- ${mergedCount} cadastros duplicados unidos.\n- ${updatedTasksCount} tarefas atualizadas.`);
            fetchClients();
        } catch (error: any) {
            console.error("Sync Error:", error);
            alert("Erro na sincronização: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const uniqueLPs = useMemo(() => {
        const sources = clients
            .filter(c => c.type === 'Lead')
            .map(c => c.lpSource as string)
            .filter(Boolean);
        return Array.from(new Set(sources)).sort();
    }, [clients]);

    const exportLeadsToXLS = () => {
        const data = filteredClients.map((c, idx) => ({
            '#': idx + 1,
            'Nome': c.name || '',
            'Email': c.email || '',
            'Telefone': c.phone || '',
            'CPF': c.cpf || '',
            'RG': c.rg || '',
            'Tipo': c.type || '',
            'Origem / LP': c.lpSource || c.origin || '',
            'Status': c.status || '',
            'Classificação': c.classification || '',
            'CEP': c.zip_code || '',
            'Rua': c.address_street || '',
            'Número': c.address_number || '',
            'Bairro': c.address_neighborhood || '',
            'Cidade': c.address_city || '',
            'UF': c.address_state || '',
            'Camiseta': c.t_shirt_size || '',
            'Credenciado': c.isAccredited ? 'Sim' : 'Não',
            'Cadastrado em': c.createdAt ? new Date(c.createdAt).toLocaleDateString('pt-BR') : '',
            'Última Compra': c.lastPurchaseDate ? new Date(c.lastPurchaseDate).toLocaleDateString('pt-BR') : '',
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Clientes');
        const suffix = filterLP !== 'all' ? ` - ${filterLP.slice(0, 30)}` : '';
        XLSX.writeFile(wb, `Clientes${suffix}.xlsx`);
    };

    const exportLeadsToPDF = () => {
        const doc = new jsPDF('l', 'mm', 'a4');
        doc.setFontSize(15);
        doc.setFont('helvetica', 'bold');
        const title = filterLP !== 'all' ? `Leads — ${filterLP}` : 'Lista de Clientes / Leads';
        doc.text(title, 14, 16);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(`Total: ${filteredClients.length} registro(s) | Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 23);
        autoTable(doc, {
            startY: 28,
            head: [['#', 'Nome', 'Email', 'Telefone', 'CPF', 'Tipo', 'Origem / LP', 'Status', 'Cidade/UF', 'Cadastrado em']],
            body: filteredClients.map((c, idx) => [
                idx + 1,
                c.name || '',
                c.email || '',
                c.phone || '',
                c.cpf || '',
                c.type || '',
                c.lpSource || c.origin || '',
                c.status || '',
                [c.address_city, c.address_state].filter(Boolean).join('/') || '',
                c.createdAt ? new Date(c.createdAt).toLocaleDateString('pt-BR') : '',
            ]),
            styles: { fontSize: 7, cellPadding: 2 },
            headStyles: { fillColor: [212, 175, 55], textColor: 0, fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [248, 248, 248] },
            columnStyles: { 0: { cellWidth: 7 }, 1: { cellWidth: 32 }, 2: { cellWidth: 42 }, 3: { cellWidth: 24 } },
        });
        const suffix = filterLP !== 'all' ? ` - ${filterLP.slice(0, 30)}` : '';
        doc.save(`Clientes${suffix}.pdf`);
    };

    // Stats based on visibility
    const visibleClients = canSeeAll ? clients : clients.filter(c => c.assigned_to === user?.id || !c.assigned_to);
    const totalClientsCount = visibleClients.length;
    const leadsCount = visibleClients.filter(c => c.type === 'Lead').length;
    const mechanicsCount = visibleClients.filter(c => c.type === 'Credenciado').length;

    // Contexto de teclado: n = novo cliente, / = focar busca
    useRegisterPage({
        title: 'Clientes',
        newLabel: 'Novo cliente',
        onNew: () => setSelectedClientForEdit({ type: 'Lead' }),
        onFocusSearch: () => searchRef.current?.focus(),
    }, []);

    return (
        <div className="p-6 space-y-5">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-black text-[var(--admin-text-primary)] tracking-tight flex items-center gap-2">
                        <Users size={22} className="text-wtech-gold" /> Gestão de Clientes
                    </h2>
                    <p className="text-[11px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-widest mt-0.5">Leads e Credenciados em um só lugar</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx,.xls,.csv" className="hidden" />
                    <button
                        onClick={handleSyncDeduplication}
                        className="bg-[var(--admin-surface-1)] text-wtech-gold border border-wtech-gold/30 px-4 py-2.5 rounded-xl font-black text-sm flex items-center gap-2 hover:bg-[var(--admin-accent-gold-muted)] transition-all active:scale-95"
                        title="Unir cadastros com o mesmo telefone"
                    >
                        <Users size={16} /> Sincronizar
                    </button>
                    <button
                        onClick={handleImportClick}
                        className="bg-[var(--admin-surface-1)] text-[var(--admin-text-primary)] border border-[var(--admin-border)] px-4 py-2.5 rounded-xl font-black text-sm flex items-center gap-2 hover:bg-[var(--admin-surface-3)] transition-all active:scale-95"
                    >
                        <Upload size={16} /> Importar
                    </button>
                    <button
                        onClick={exportLeadsToXLS}
                        className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-300 dark:border-green-800 px-4 py-2.5 rounded-xl font-black text-sm flex items-center gap-2 hover:bg-green-100 dark:hover:bg-green-900/40 transition-all active:scale-95"
                        title="Exportar clientes filtrados em Excel"
                    >
                        <Download size={16} /> XLS
                    </button>
                    <button
                        onClick={exportLeadsToPDF}
                        className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-800 px-4 py-2.5 rounded-xl font-black text-sm flex items-center gap-2 hover:bg-red-100 dark:hover:bg-red-900/40 transition-all active:scale-95"
                        title="Exportar clientes filtrados em PDF"
                    >
                        <FileText size={16} /> PDF
                    </button>
                    {activeTab === 'clients' && selectedClients.length > 0 && (
                        <div className="flex gap-2">
                            <button
                                onClick={() => setIsGroupModalOpen(true)}
                                className="bg-blue-600 text-white px-4 py-2.5 rounded-xl font-black text-sm flex items-center gap-2 hover:bg-blue-700 transition-all active:scale-95"
                            >
                                <Users size={16} /> Grupo ({selectedClients.length})
                            </button>
                            <button
                                onClick={handleBulkDelete}
                                className="bg-red-500 text-white px-4 py-2.5 rounded-xl font-black text-sm flex items-center gap-2 hover:bg-red-600 transition-all active:scale-95"
                            >
                                <Trash2 size={16} /> Excluir
                            </button>
                        </div>
                    )}
                    <button
                        onClick={() => setSelectedClientForEdit({ type: 'Lead' })}
                        className="bg-gradient-to-r from-wtech-gold to-yellow-600 text-black px-4 py-2.5 rounded-xl font-black text-sm flex items-center gap-2 shadow-md shadow-yellow-500/20 hover:scale-105 active:scale-95 transition-all"
                    >
                        <UserPlus size={16} /> Novo Cliente
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                    { label: 'Total de Clientes', value: totalClientsCount, icon: Users,  bg: 'bg-[var(--admin-accent-gold-muted)]',  text: 'text-wtech-gold' },
                    { label: 'Credenciados',       value: mechanicsCount,    icon: Shield, bg: 'bg-blue-500/10',                       text: 'text-blue-500' },
                    { label: 'Leads',              value: leadsCount,        icon: User,   bg: 'bg-orange-500/10',                     text: 'text-orange-500' },
                ].map(s => (
                    <div key={s.label} className="bg-[var(--admin-surface-1)] border border-[var(--admin-border)] rounded-2xl p-5 hover:shadow-md transition-all">
                        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-3', s.bg)}>
                            <s.icon size={20} className={s.text} />
                        </div>
                        <p className={cn('text-3xl font-black tracking-tight', s.text)}>{s.value}</p>
                        <p className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider mt-1">{s.label}</p>
                    </div>
                ))}
            </div>

            {/* Sub-Tabs */}
            <div className="flex bg-[var(--admin-surface-3)] p-1 rounded-xl border border-[var(--admin-border)] w-fit">
                {(['clients', 'groups'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={cn(
                            'flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-black transition-all',
                            activeTab === tab
                                ? 'bg-[var(--admin-surface-1)] text-[var(--admin-text-primary)] shadow-sm'
                                : 'text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)]'
                        )}
                    >
                        {tab === 'clients' ? <><User size={14} /> Todos os Clientes</> : <><Users size={14} /> Grupos de Marketing</>}
                    </button>
                ))}
            </div>

            {activeTab === 'groups' ? (
                <div className="bg-[var(--admin-surface-1)] rounded-2xl border border-[var(--admin-border)] overflow-hidden p-6">
                    <ListsManager permissions={permissions} />
                </div>
            ) : (
                <div className="bg-[var(--admin-surface-1)] rounded-2xl border border-[var(--admin-border)] overflow-hidden">
                    {/* Search + Filter */}
                    <div className="p-4 border-b border-[var(--admin-border)] flex flex-col md:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-2.5 text-[var(--admin-text-tertiary)]" size={16} />
                            <input
                                ref={searchRef}
                                type="text"
                                placeholder="Buscar por nome, email ou telefone...   ( / )"
                                className="w-full bg-[var(--admin-surface-2)] border border-[var(--admin-border)] rounded-xl py-2.5 pl-9 pr-4 text-sm text-[var(--admin-text-primary)] placeholder:text-[var(--admin-text-tertiary)] outline-none focus:border-wtech-gold transition-colors"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <select
                            className="px-4 py-2.5 bg-[var(--admin-surface-2)] border border-[var(--admin-border)] rounded-xl text-sm text-[var(--admin-text-primary)] outline-none focus:border-wtech-gold transition-colors"
                            value={filterType}
                            onChange={e => setFilterType(e.target.value)}
                        >
                            <option value="all">Todos os Tipos</option>
                            <option value="Lead">Leads</option>
                            <option value="Credenciado">Credenciados</option>
                        </select>
                        <select
                            className="px-4 py-2.5 bg-[var(--admin-surface-2)] border border-[var(--admin-border)] rounded-xl text-sm text-[var(--admin-text-primary)] outline-none focus:border-wtech-gold transition-colors max-w-[220px]"
                            value={filterLP}
                            onChange={e => setFilterLP(e.target.value)}
                            title="Filtrar por LP de origem"
                        >
                            <option value="all">Todas as LPs / Origens</option>
                            {uniqueLPs.map(lp => (
                                <option key={lp} value={lp}>{lp.length > 40 ? lp.slice(0, 40) + '…' : lp}</option>
                            ))}
                        </select>
                        {filterLP !== 'all' && (
                            <button
                                onClick={() => setFilterLP('all')}
                                className="flex items-center gap-1 px-3 py-2.5 bg-[var(--admin-surface-2)] border border-[var(--admin-border)] rounded-xl text-xs font-bold text-[var(--admin-text-secondary)] hover:bg-[var(--admin-surface-3)] transition-colors whitespace-nowrap"
                                title="Limpar filtro de LP"
                            >
                                <X size={13} /> Limpar LP
                            </button>
                        )}
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-[var(--admin-surface-2)]">
                                <tr>
                                    <th className="px-5 py-3 w-[44px]">
                                        <input
                                            type="checkbox"
                                            className="rounded w-4 h-4 accent-wtech-gold"
                                            checked={filteredClients.length > 0 && selectedClients.length === filteredClients.length}
                                            onChange={e => handleSelectAll(e.target.checked)}
                                        />
                                    </th>
                                    {['Cliente', 'Contato', 'Tipo / Origem', 'Classificação', 'Atendente', 'Última Compra', 'Status'].map(h => (
                                        <th key={h} className="px-5 py-3 text-left text-[10px] font-black text-[var(--admin-text-tertiary)] uppercase tracking-widest">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--admin-border)]">
                                {loading ? (
                                    <tr><td colSpan={8} className="px-5 py-12 text-center text-[var(--admin-text-tertiary)] font-bold">Carregando...</td></tr>
                                ) : paginatedClients.length === 0 ? (
                                    <tr><td colSpan={8} className="px-5 py-12 text-center text-[var(--admin-text-tertiary)] font-bold">Nenhum cliente encontrado.</td></tr>
                                ) : paginatedClients.map((client, idx) => (
                                    <tr
                                        key={`${client.type}-${client.id}-${idx}`}
                                        className={cn(
                                            'hover:bg-[var(--admin-surface-2)] transition-colors cursor-pointer',
                                            selectedClients.includes(client.id) && 'bg-blue-500/5'
                                        )}
                                        onClick={e => { if ((e.target as any).type === 'checkbox') return; setSelectedClientForEdit(client); }}
                                    >
                                        <td className="px-5 py-3">
                                            <input
                                                type="checkbox"
                                                className="rounded w-4 h-4 accent-wtech-gold"
                                                checked={selectedClients.includes(client.id)}
                                                onChange={e => handleSelectClient(client.id, e.target.checked)}
                                            />
                                        </td>
                                        <td className="px-5 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className={cn('w-9 h-9 rounded-full flex items-center justify-center shrink-0', client.type === 'Credenciado' ? 'bg-blue-500/10 text-blue-500' : 'bg-[var(--admin-surface-3)] text-[var(--admin-text-tertiary)]')}>
                                                    {client.type === 'Credenciado' ? <Shield size={16} /> : <User size={16} />}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-bold text-[var(--admin-text-primary)] truncate">{client.name || 'Sem Nome'}</p>
                                                    <p className="text-[10px] text-[var(--admin-text-tertiary)] font-mono">{client.id.slice(0, 8)}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3">
                                            <div className="flex flex-col gap-0.5">
                                                {client.phone && <span className="flex items-center gap-1 text-xs text-[var(--admin-text-secondary)]"><Phone size={11} className="text-[var(--admin-text-tertiary)]" />{client.phone}</span>}
                                                {client.email && <span className="flex items-center gap-1 text-xs text-[var(--admin-text-secondary)]"><Mail size={11} className="text-[var(--admin-text-tertiary)]" />{client.email}</span>}
                                            </div>
                                        </td>
                                        <td className="px-5 py-3">
                                            <span className={cn('text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md', client.type === 'Credenciado' ? 'bg-blue-500/10 text-blue-500' : 'bg-orange-500/10 text-orange-500')}>
                                                {client.type}
                                            </span>
                                            <p className="text-[10px] text-[var(--admin-text-tertiary)] mt-0.5 truncate max-w-[130px]">{client.origin}</p>
                                        </td>
                                        <td className="px-5 py-3">
                                            <span className={cn('text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md border', {
                                                'bg-purple-500/10 text-purple-500 border-purple-500/20': client.classification === 'VIP',
                                                'bg-yellow-500/10 text-yellow-600 border-yellow-500/20': client.classification === 'Ouro',
                                                'bg-[var(--admin-surface-3)] text-[var(--admin-text-secondary)] border-[var(--admin-border)]': !['VIP','Ouro'].includes(client.classification),
                                            })}>
                                                {client.classification || 'Novato'}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3">
                                            <span className="text-xs font-medium text-[var(--admin-text-secondary)]">
                                                {attendants.find(u => u.id === client.assigned_to)?.name || <span className="text-[var(--admin-text-tertiary)]">—</span>}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3">
                                            <span className="text-xs text-[var(--admin-text-secondary)]">
                                                {client.lastPurchaseDate ? new Date(client.lastPurchaseDate).toLocaleDateString('pt-BR') : '—'}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3">
                                            <div className="flex flex-col items-start gap-0.5">
                                                <span className="text-[10px] font-bold text-[var(--admin-text-primary)] bg-[var(--admin-surface-3)] border border-[var(--admin-border)] px-2 py-0.5 rounded-md">
                                                    {client.status || 'Ativo'}
                                                </span>
                                                <span className="text-[10px] text-[var(--admin-text-tertiary)]">{new Date(client.createdAt).toLocaleDateString('pt-BR')}</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {!loading && filteredClients.length > 0 && (
                        <div className="border-t border-[var(--admin-border)] px-5 py-3 bg-[var(--admin-surface-2)] flex flex-col md:flex-row justify-between items-center gap-3">
                            <span className="text-xs font-bold text-[var(--admin-text-tertiary)]">
                                {startIndex + 1}–{Math.min(startIndex + itemsPerPage, filteredClients.length)} de {filteredClients.length}
                            </span>
                            <div className="flex items-center gap-1">
                                <span className="text-xs font-bold text-[var(--admin-text-tertiary)] mr-2">Por página:</span>
                                {[50, 100, 300].map(limit => (
                                    <button
                                        key={limit}
                                        onClick={() => { setItemsPerPage(limit); setCurrentPage(1); }}
                                        className={cn('px-2.5 py-1 rounded text-xs font-bold transition-colors', itemsPerPage === limit ? 'bg-[var(--admin-surface-1)] border border-[var(--admin-border)] text-[var(--admin-text-primary)] shadow-sm' : 'text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)]')}
                                    >
                                        {limit}
                                    </button>
                                ))}
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1.5 rounded-lg bg-[var(--admin-surface-1)] border border-[var(--admin-border)] text-xs font-bold text-[var(--admin-text-secondary)] disabled:opacity-40 hover:bg-[var(--admin-surface-3)] transition-colors">Anterior</button>
                                <span className="text-xs font-bold text-[var(--admin-text-primary)]">Página {currentPage} / {totalPages}</span>
                                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1.5 rounded-lg bg-[var(--admin-surface-1)] border border-[var(--admin-border)] text-xs font-bold text-[var(--admin-text-secondary)] disabled:opacity-40 hover:bg-[var(--admin-surface-3)] transition-colors">Próxima</button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Add to Group Modal */}
            {isGroupModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-[var(--admin-surface-1)] border border-[var(--admin-border)] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-[var(--admin-border)] flex justify-between items-center bg-[var(--admin-surface-2)]">
                            <div>
                                <h3 className="font-black text-base text-[var(--admin-text-primary)]">Adicionar ao Grupo</h3>
                                <p className="text-xs text-[var(--admin-text-tertiary)] font-bold">{selectedClients.length} contatos selecionados</p>
                            </div>
                            <button onClick={() => setIsGroupModalOpen(false)} className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--admin-text-tertiary)] hover:bg-[var(--admin-surface-3)] transition-colors">
                                <X size={15} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-[var(--admin-text-tertiary)] uppercase tracking-wider mb-1.5">Selecione o Grupo</label>
                                <select
                                    className="w-full px-3 py-2.5 bg-[var(--admin-surface-2)] border border-[var(--admin-border)] text-[var(--admin-text-primary)] rounded-xl text-sm outline-none focus:border-wtech-gold transition-colors"
                                    value={selectedListId}
                                    onChange={e => setSelectedListId(e.target.value)}
                                >
                                    <option value="">Selecione...</option>
                                    <option value="new">+ Criar Novo Grupo</option>
                                    {staticLists.map(list => <option key={list.id} value={list.id}>{list.name}</option>)}
                                </select>
                            </div>
                            {selectedListId === 'new' && (
                                <div>
                                    <label className="block text-[10px] font-black text-[var(--admin-text-tertiary)] uppercase tracking-wider mb-1.5">Nome do Novo Grupo</label>
                                    <input
                                        type="text"
                                        placeholder="Ex: Alunos VIP 2024"
                                        className="w-full px-3 py-2.5 bg-[var(--admin-surface-2)] border border-[var(--admin-border)] text-[var(--admin-text-primary)] placeholder:text-[var(--admin-text-tertiary)] rounded-xl text-sm outline-none focus:border-wtech-gold transition-colors"
                                        value={newListName}
                                        onChange={e => setNewListName(e.target.value)}
                                        autoFocus
                                    />
                                </div>
                            )}
                            <div className="flex justify-end gap-2 pt-2">
                                <button onClick={() => setIsGroupModalOpen(false)} className="px-4 py-2 text-sm font-bold text-[var(--admin-text-secondary)] hover:bg-[var(--admin-surface-3)] rounded-xl transition-colors">Cancelar</button>
                                <button
                                    onClick={handleAddToGroup}
                                    disabled={!selectedListId || (selectedListId === 'new' && !newListName) || isSavingGroup}
                                    className="bg-gradient-to-r from-wtech-gold to-yellow-600 text-black px-5 py-2 rounded-xl font-black text-sm hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
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
