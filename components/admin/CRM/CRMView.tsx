import React, { useState, useEffect, useMemo } from 'react';
import { Users, Settings, Plus, MoreVertical, X, Save, Clock, AlertTriangle, Thermometer, TrendingUp, Search, Filter, List, KanbanSquare, Globe, GraduationCap, Phone, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../context/AuthContext';
import type { Lead } from '../../../types';
import { SplashedPushNotifications, SplashedPushNotificationsHandle } from '@/components/ui/splashed-push-notifications';
import LeadTaskSidebar from './LeadTaskSidebar';
import { useRef } from 'react'; // Ensure useRef is imported

// Helper for Drag & Drop
const DragContext = React.createContext<{
    draggedId: string | null;
    setDraggedId: (id: string | null) => void;
}>({ draggedId: null, setDraggedId: () => { } });

// --- Funnel Chart Component ---
// --- Funnel Chart Component (3D Horizontal) ---
const FunnelChart = ({ leads }: { leads: Lead[] }) => {
    // Calculate Counts
    const counts = {
        total: Math.max(leads.length, 1),
        new: leads.filter(l => l.status === 'New').length,
        contacted: leads.filter(l => l.status === 'Contacted').length,
        qualified: leads.filter(l => l.status === 'Qualified' || l.status === 'Negotiating').length,
        won: leads.filter(l => l.status === 'Converted' || l.status === 'Matriculated').length,
        lost: leads.filter(l => l.status === 'Cold' || l.status === 'Rejected').length
    };

    const stages = [
        { label: 'Entrada', count: counts.new, color: '#3b82f6', from: '#60a5fa', to: '#2563eb' },
        { label: 'Qualificação', count: counts.contacted, color: '#6366f1', from: '#818cf8', to: '#4f46e5' },
        { label: 'Negociação', count: counts.qualified, color: '#a855f7', from: '#c084fc', to: '#9333ea' },
        { label: 'Ganho', count: counts.won, color: '#22c55e', from: '#4ade80', to: '#16a34a' }
    ];

    return (
        <div className="mb-6 w-full bg-white p-4 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden">
            <div className="flex justify-between items-center mb-4">
               <div>
                 <h3 className="font-bold text-gray-900">Visão do Funil</h3>
                 <p className="text-xs text-gray-500">Fluxo de conversão atual</p>
               </div>
               <div className="bg-gray-100 px-3 py-1 rounded-full text-xs font-bold text-gray-600">
                    Total: {leads.length}
               </div>
            </div>

            <div className="flex items-center justify-between h-32 relative px-4">
                {/* Connecting Line (Background Pipe) */}
                <div className="absolute top-1/2 left-0 w-full h-4 bg-gray-100 -translate-y-1/2 rounded-full z-0"></div>

                {stages.map((stage, i) => {
                    const isLast = i === stages.length - 1;
                    const percent = (stage.count / counts.total) * 100;
                    
                    return (
                        <div key={i} className="relative z-10 flex flex-col items-center group cursor-pointer" style={{ flex: 1 }}>
                            {/* 3D Node */}
                            <div className="relative">
                                {/* Glow Effect */}
                                <div className="absolute inset-0 bg-white blur-xl opacity-0 group-hover:opacity-50 transition-opacity duration-500" style={{ backgroundColor: stage.color }}></div>
                                
                                <svg width="100" height="80" viewBox="0 0 100 80" className="drop-shadow-xl transition-transform duration-300 group-hover:-translate-y-1">
                                    <defs>
                                        <linearGradient id={`grad-${i}`} x1="0%" y1="0%" x2="0%" y2="100%">
                                            <stop offset="0%" stopColor={stage.from} />
                                            <stop offset="100%" stopColor={stage.to} />
                                        </linearGradient>
                                        <filter id={`shadow-${i}`}>
                                            <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor={stage.color} floodOpacity="0.3"/>
                                        </filter>
                                    </defs>
                                    
                                    {/* Hexagon or Circle Shape */}
                                    <path 
                                        d="M50 0 L95 25 L95 55 L50 80 L5 55 L5 25 Z" 
                                        fill={`url(#grad-${i})`} 
                                        stroke="white" 
                                        strokeWidth="2"
                                        filter={`url(#shadow-${i})`}
                                    />
                                    
                                    {/* Inner Shine */}
                                    <path d="M50 5 L85 25 L50 40 L15 25 Z" fill="white" fillOpacity="0.2" />
                                </svg>
                                
                                {/* Centered Count & % */}
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-white pointer-events-none pt-1">
                                    <span className="text-2xl font-black leading-none drop-shadow-md">{stage.count}</span>
                                    <span className="text-[9px] font-bold opacity-80">{percent.toFixed(0)}%</span>
                                </div>
                            </div>

                            {/* Label */}
                            <div className="mt-3 text-center">
                                <span className="block text-xs font-bold text-gray-800 group-hover:text-wtech-gold transition-colors uppercase tracking-wider">{stage.label}</span>
                            </div>
                        </div>
                    );
                })}
            </div>
            
            {/* Legend / Stats Footer */}
            <div className="flex gap-4 mt-2 justify-center border-t border-gray-50 pt-2 opacity-60 hover:opacity-100 transition-opacity">
                 <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                    <span className="text-[10px] font-bold text-gray-500">{counts.lost} Perdidos</span>
                 </div>
            </div>
        </div>
    );
};


const KanbanColumn = ({ title, status, leads, onMove, onDropLead, onLeadClick, usersMap }: any) => {
    const { draggedId } = React.useContext(DragContext);

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        if (draggedId) onDropLead(draggedId, status);
    };

    const handleDragOver = (e: React.DragEvent) => e.preventDefault();

    // Average Time Calculation
    const averageTime = useMemo(() => {
        if (leads.length === 0) return '-';
        const now = new Date().getTime();
        const totalMs = leads.reduce((acc: number, lead: any) => {
            const start = new Date(lead.updated_at || lead.createdAt).getTime();
            return acc + (now - start);
        }, 0);
        const avgMs = totalMs / leads.length;
        
        const days = Math.floor(avgMs / (1000 * 60 * 60 * 24));
        const hours = Math.floor((avgMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        
        if (days > 0) return `${days}d ${hours}h`;
        return `${hours}h médios`;
    }, [leads]);

    const statusColors: any = {
        'New': 'bg-wtech-black text-white border-wtech-black',
        'Contacted': 'bg-blue-600 text-white border-blue-600',
        'Qualified': 'bg-purple-600 text-white border-purple-600',
        'Converted': 'bg-green-600 text-white border-green-600',
        'Cold': 'bg-gray-500 text-white border-gray-500'
    };

    return (
        <div
            className={`flex-1 min-w-[200px] flex flex-col h-full rounded-2xl transition-colors ${draggedId ? 'bg-gray-100/50 border-2 border-dashed border-gray-300' : 'bg-gray-50 border border-gray-200'}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
        >
            {/* Header */}
            <div className={`p-4 rounded-t-2xl flex flex-col gap-2 ${status === 'New' || status === 'Converted' ? 'shadow-md' : ''} ${statusColors[status] || 'bg-white text-gray-800'}`}>
                <div className="flex justify-between items-center">
                    <h3 className="font-bold text-sm uppercase tracking-wider">{title}</h3>
                    <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs font-bold">{leads.length}</span>
                </div>
                {/* Stats Summary */}
                <div className="flex items-center gap-2 text-[10px] font-medium opacity-80">
                    <Clock size={10} />
                    <span>Tempo Médio: {averageTime}</span>
                </div>
            </div>

            {/* Cards Container */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                {leads.map((lead: any) => (
                    <LeadCard key={lead.id} lead={lead} onClick={() => onLeadClick(lead)} usersMap={usersMap} />
                ))}
                {leads.length === 0 && (
                    <div className="text-center py-8 text-gray-400 text-xs italic">
                        Sem leads nesta etapa
                    </div>
                )}
            </div>
        </div>
    );
};

// Hook to calculate time spent
const useTimeInStatus = (dateString: string) => {
    const [timeDisplay, setTimeDisplay] = useState('');
    const [isLongWait, setIsLongWait] = useState(false);

    useEffect(() => {
        const calculate = () => {
            const start = new Date(dateString).getTime();
            const now = new Date().getTime();
            const diff = now - start;

            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            
            if (days > 0) setTimeDisplay(`${days}d ${hours}h`);
            else if (hours > 0) setTimeDisplay(`${hours}h ${minutes}m`);
            else setTimeDisplay(`${minutes}m`);

            if (days > 2 || (days === 0 && hours > 4)) setIsLongWait(true);
        };
        calculate();
        const interval = setInterval(calculate, 60000); // Update every minute
        return () => clearInterval(interval);
    }, [dateString]);

    return { timeDisplay, isLongWait };
};

const LeadCard: React.FC<{ lead: any, onClick: () => void, usersMap: Record<string, string> }> = ({ lead, onClick, usersMap }) => {
    const { setDraggedId } = React.useContext(DragContext);
    const [isDragging, setIsDragging] = React.useState(false);

    // Timer Logic
    // Prefer updated_at (which we will update on column move), fallback to created_at
    const statusDate = lead.updated_at || lead.createdAt; 
    const { timeDisplay, isLongWait } = useTimeInStatus(statusDate);

    // Quiz Data Parsing
    const quizData = lead.quiz_data || (lead.internalNotes && lead.internalNotes.startsWith('{') ? JSON.parse(lead.internalNotes) : null);
    const quizScore = quizData?.score;
    const quizTemp = quizData?.temperature; // 'Frio', 'Morno', 'Quente'

    return (
        <div
            draggable
            onDragStart={() => { setDraggedId(lead.id); setIsDragging(true); }}
            onDragEnd={() => { setDraggedId(null); setIsDragging(false); }}
            onClick={onClick}
            className={`bg-white p-4 rounded-xl shadow-sm border ${isLongWait ? 'border-red-300 ring-2 ring-red-100' : 'border-gray-100'} cursor-pointer active:cursor-grabbing hover:shadow-md transition-all group relative ${isDragging ? 'opacity-50 scale-95' : ''}`}
        >
            <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{new Date(lead.createdAt).toLocaleDateString()}</span>
                <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${isLongWait ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-gray-100 text-gray-500'}`}>
                    <Clock size={10} />
                    {timeDisplay}
                </div>
            </div>

            {/* Quiz Results Badge */}
            {(quizScore !== undefined || quizTemp) && (
                 <div className="mb-2 flex gap-1">
                    {quizTemp && (
                        <span className={`px-2 py-0.5 text-[10px] uppercase font-bold rounded flex items-center gap-1 
                            ${quizTemp.toLowerCase().includes('quen') || quizTemp.toLowerCase().includes('alta') ? 'bg-red-50 text-red-600' : 
                              quizTemp.toLowerCase().includes('morn') ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'}`}>
                            <Thermometer size={10} /> {quizTemp}
                        </span>
                    )}
                    {quizScore !== undefined && (
                        <span className="px-2 py-0.5 bg-gray-50 text-gray-600 text-[10px] font-bold uppercase rounded border border-gray-200">
                           {quizScore}/100 pts
                        </span>
                    )}
                 </div>
            )}

            {lead.tags && lead.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                    {lead.tags.map((tag: string, i: number) => (
                        <span key={i} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-[9px] font-bold uppercase rounded border border-gray-200">
                            {tag}
                        </span>
                    ))}
                </div>
            )}

            <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-800 to-black flex items-center justify-center text-white font-bold text-lg shadow-sm">
                    {lead.name.charAt(0)}
                </div>
                <div className="leading-tight">
                    <h4 className="font-bold text-gray-900 group-hover:text-wtech-gold transition-colors">{lead.name}</h4>
                    <p className="text-xs text-gray-500 max-w-[150px] truncate">{lead.email}</p>
                </div>
            </div>

            <div className="flex items-center justify-between mt-3 text-xs text-gray-500 border-t border-gray-50 pt-3">
                <div className="flex items-center gap-1">
                    {/* Consistent User Display Logic */}
                    {lead.assignedTo ? (
                        <span className="flex items-center gap-1 bg-yellow-50 text-yellow-800 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider text-[9px]" title={usersMap[lead.assignedTo] || lead.assignedTo}>
                            <Users size={10} /> 
                            {usersMap[lead.assignedTo] ? usersMap[lead.assignedTo].split(' ')[0] : 'Usuário...'}
                        </span>
                    ) : (
                        <span className="flex items-center gap-1 bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider text-[9px]">
                            <Users size={10} /> Fila
                        </span>
                    )}
                </div>
                <button className="text-gray-400 hover:text-black transition-colors"><MoreVertical size={14} /></button>
            </div>
        </div>
    );
};

interface CRMViewProps {
    onConvertLead?: (lead: Lead) => void;
}

const CRMView: React.FC<CRMViewProps & { permissions?: any }> = ({ onConvertLead, permissions }) => {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [draggedId, setDraggedId] = useState<string | null>(null);
    const [usersMap, setUsersMap] = useState<Record<string, string>>({});
    
    // CRM Filter State
    const [filterPeriod, setFilterPeriod] = useState(30); // Days
    const [filterType, setFilterType] = useState<'Period' | 'Month' | 'Custom'>('Period');
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [customRange, setCustomRange] = useState({ start: '', end: '' });
    
    // New Advanced Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [contextFilter, setContextFilter] = useState('All');
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [selectedLeadForTasks, setSelectedLeadForTasks] = useState<Lead | null>(null);
    const notificationRef = useRef<SplashedPushNotificationsHandle>(null);
    const { user } = useAuth();
    
    // View Mode: Kanban or List
    const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');

    const [distMode, setDistMode] = useState<'Manual' | 'Random'>('Manual');
    const [showSettings, setShowSettings] = useState(false);
    
    // Create Lead State
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newLeadForm, setNewLeadForm] = useState({ name: '', email: '', phone: '' });

    const [editingLead, setEditingLead] = useState<any | null>(null);
    const [editForm, setEditForm] = useState({ assignedTo: '', internalNotes: '', tags: [] as string[] });
    const [tagInput, setTagInput] = useState('');

    const handleCreateLead = async () => {
        if (!newLeadForm.name || !newLeadForm.phone) return alert("Nome e Telefone são obrigatórios.");
        
        const payload = {
            name: newLeadForm.name,
            email: newLeadForm.email,
            phone: newLeadForm.phone,
            status: 'New',
            context_id: 'Manual',
            assigned_to: user?.id, // Auto-assign to creator
            created_at: new Date().toISOString()
        };

        const { data, error } = await supabase.from('SITE_Leads').insert([payload]).select().single();
        
        if (error) {
            alert("Erro ao criar lead: " + error.message);
        } else if (data) {
             setLeads(prev => [data, ...prev]);
             setIsCreateModalOpen(false);
             setNewLeadForm({ name: '', email: '', phone: '' });
             notificationRef.current?.createNotification('success', 'Lead Criado!', `${data.name} foi adicionado com sucesso.`);
        }
    };
    
    // Permission Check Helper
    const hasPermission = (key: string) => {
        if (!user) return false;

        // 1. Priority: Live Permissions (Prop)
        if (permissions) {
             // Super Admins in DB Role
             if (permissions.admin_access) return true;
             return !!permissions[key];
        }
        
        // 2. Super Admin / Admin legacy string check
        if (typeof user.role === 'string') {
                if (user.role === 'Super Admin' || user.role === 'ADMIN' || user.role === 'Admin') return true;
                return false;
        }
        
        // 3. Fallback to Auth Context
        if (user.role?.level >= 10) return true;
        if (user.role?.name === 'Super Admin') return true;
        
        const rolePermissions = user.role?.permissions || {};
        return !!rolePermissions[key];
    };

    const handleLeadClick = (lead: any) => {
        setEditingLead(lead);
        setEditForm({
            assignedTo: lead.assignedTo || '',
            internalNotes: lead.internalNotes || '',
            tags: lead.tags || []
        });
    };

    // Chart Data
    const conversionRate = useMemo(() => {
        if (leads.length === 0) return 0;
        const converted = leads.filter(l => l.status === 'Converted').length;
        return Math.round((converted / leads.length) * 100);
    }, [leads]);

    // Fetch Settings & Leads & Users
    useEffect(() => {
        const fetchSettingsAndUsers = async () => {
             // 1. Settings
            const { data: settings } = await supabase.from('SITE_SystemSettings').select('value').eq('key', 'crm_distribution_mode').single();
            if (settings) setDistMode(settings.value);

            // 2. Users (Map ID -> Name)
            // Safer to select specific columns we know exist. 'full_name' might be missing from schema causing errors.
            const { data: usersData } = await supabase.from('SITE_Users').select('id, name');
            if (usersData) {
                const map: Record<string, string> = {};
                usersData.forEach((u: any) => { map[u.id] = u.name || 'Usuário'; });
                setUsersMap(map);
            }
        };
        fetchSettingsAndUsers();
    }, []);

    // Fetch Leads (Consolidated)
    useEffect(() => {
        if (permissions || (user && typeof user.role === 'string')) {
            fetchData();
        }
    }, [user, filterPeriod, permissions]); 

    const fetchData = async () => {
        setLeads([]); // Clear before fetch to show loading state if desired
        let query = supabase.from('SITE_Leads').select('*').order('created_at', { ascending: false });

        // Privacy Logic
        const hasFullAccess =
            (typeof user?.role === 'string' && (user.role === 'ADMIN' || user.role === 'Admin' || user.role === 'Super Admin')) ||
            (typeof user?.role !== 'string' && user?.role?.level >= 10) ||
            (typeof user?.role !== 'string' && user?.role?.name === 'Super Admin') ||
            (typeof user?.role !== 'string' && user?.role?.permissions?.admin_access) ||
            hasPermission('crm_view_all'); // NEW PERMISSION CHECK

        console.log("CRM Access Level:", { role: user?.role, hasFullAccess });

        if (!hasFullAccess && user?.id) {
            query = query.eq('assigned_to', user.id);
        }

        const { data, error } = await query;
        
        if (error) {
            console.error("Error fetching leads:", error);
        }

        if (data) {
            console.log("Leads fetched:", data.length);
            const mapped = data.map((l: any) => ({
                ...l,
                contextId: l.context_id,
                createdAt: l.created_at,
                // Ensure updated_at exists or fallback to created_at
                updated_at: l.updated_at || l.created_at,
                assignedTo: l.assigned_to,
                internalNotes: l.internal_notes,
                quiz_data: l.quiz_data
            }));
            setLeads(mapped);
        }
    }

    // Update Distribution Mode
    const toggleDistMode = async (mode: 'Manual' | 'Random') => {
        setDistMode(mode);
        await supabase.from('SITE_SystemSettings').upsert({ key: 'crm_distribution_mode', value: mode }, { onConflict: 'key' });
    };

    // Helper to map status to stage index
    const getStageIndex = (status: string) => {
        if (status === 'New') return 0;
        if (status === 'Contacted') return 1;
        if (['Qualified', 'Negotiating'].includes(status)) return 2;
        if (['Converted', 'Matriculated', 'CheckedIn'].includes(status)) return 3;
        if (['Cold', 'Rejected', 'Lost'].includes(status)) return 4; 
        return 0; // Default
    };

    // Drag & Drop Handler
    const onDropLead = async (leadId: string, newStatus: string) => {
        const currentLead = leads.find(l => l.id === leadId);
        if (!currentLead) return;

        const currentIndex = getStageIndex(currentLead.status);
        const newIndex = getStageIndex(newStatus);

        // Permission Check
        const isAdm = 
            (typeof user?.role === 'string' && (user.role === 'ADMIN' || user.role === 'Admin' || user.role === 'Super Admin')) ||
            (typeof user?.role !== 'string' && user?.role?.level >= 10);

        if (!isAdm && newIndex < currentIndex) {
            alert('Apenas administradores podem mover leads para trás no funil.');
            return;
        }

        const now = new Date().toISOString();
        
        // Optimistic Update: Also update the 'updated_at' to reset component timer logic
        setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus as any, updated_at: now } : l));

        // DB Update
        const { error } = await supabase.from('SITE_Leads').update({ status: newStatus, updated_at: now }).eq('id', leadId);
        if (error) {
            console.error("Move Lead Error:", error);
            alert(`Falha ao mover lead: ${error.message || JSON.stringify(error)}`);
            // Revert optimistic update
            fetchData();
        } else {
             if (['Converted', 'Matriculated', 'Fechamento', 'Ganho'].includes(newStatus) && onConvertLead) {
                 onConvertLead({ ...currentLead, status: newStatus as any });
             }
        }
    };
    
    const saveLeadUpdates = async () => {
        if (!editingLead) return;

        const { error } = await supabase.from('SITE_Leads').update({
            assigned_to: editForm.assignedTo,
            internal_notes: editForm.internalNotes,
            tags: editForm.tags
        }).eq('id', editingLead.id);

        if (!error) {
            setLeads(prev => prev.map(l => l.id === editingLead.id ? { ...l, assignedTo: editForm.assignedTo, internalNotes: editForm.internalNotes, tags: editForm.tags } : l));
            setEditingLead(null);
            setTagInput('');
        } else {
            alert('Erro ao salvar alterações.');
        }
    };

    const deleteLead = async () => {
        if (!editingLead) return;
        if (!window.confirm('Tem certeza que deseja excluir este lead? Esta ação não pode ser desfeita.')) return;

        const { error } = await supabase.from('SITE_Leads').delete().eq('id', editingLead.id);

        if (!error) {
            setLeads(prev => prev.filter(l => l.id !== editingLead.id));
            setEditingLead(null);
        } else {
            console.error("Error deleting lead:", error);
            alert('Erro ao excluir lead: ' + error.message);
        }
    };



    // Filter Logic
    const filteredLeads = leads.filter(l => {
        const d = new Date(l.createdAt);
        
        if (filterType === 'Period') {
            const now = new Date();
            const diffTime = Math.abs(now.getTime() - d.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return diffDays <= filterPeriod;
        } else if (filterType === 'Month') {
            return l.createdAt.startsWith(selectedMonth);
        } else if (filterType === 'Custom') {
            if (customRange.start && d < new Date(customRange.start)) return false;
            // Add 1 day to end date to handle "until end of day" implicitly or just compare strict
             if (customRange.end && d > new Date(new Date(customRange.end).setHours(23,59,59,999))) return false;
            return true;
        }
        // Check Source/Context
        if (contextFilter !== 'All') {
            const ctx = (l.contextId || '').toLowerCase();
            if (!ctx.includes(contextFilter.toLowerCase())) return false;
        }

        // Check Search Query
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            const matchName = l.name.toLowerCase().includes(q);
            const matchEmail = l.email.toLowerCase().includes(q);
            const matchPhone = l.phone.includes(q);
            if (!matchName && !matchEmail && !matchPhone) return false;
        }

        return true;
    });

    // Extract unique contexts for filter
    const uniqueContexts = useMemo(() => {
        const contexts = new Set(leads.map(l => l.contextId).filter(Boolean));
        return Array.from(contexts);
    }, [leads]);

    return (
        <DragContext.Provider value={{ draggedId, setDraggedId }}>
            <div className="h-full flex flex-col w-full max-w-full overflow-hidden">
                {/* Funnel Overview */}
                <FunnelChart leads={filteredLeads} />

                {/* Controls Bar */}
                <div className="flex flex-col xl:flex-row justify-between xl:items-center gap-4 mb-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    
                    {/* Left: Search & Context */}
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-3 text-gray-400" />
                            <input 
                                className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold w-64 focus:bg-white focus:border-wtech-gold outline-none transition-all"
                                placeholder="Buscar por nome, email, telefone..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <div className="relative group">
                            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 px-3 py-2 rounded-lg cursor-pointer hover:bg-white transition-colors">
                                <Filter size={14} className="text-gray-400" />
                                <span className="text-xs font-bold text-gray-600 truncate max-w-[150px]">
                                    {contextFilter === 'All' ? 'Todas as Origens' : contextFilter}
                                </span>
                            </div>
                            {/* Dropdown */}
                            <div className="absolute top-full left-0 mt-2 w-64 bg-white shadow-xl rounded-xl border border-gray-100 p-2 hidden group-hover:block z-50 max-h-64 overflow-y-auto custom-scrollbar">
                                <button onClick={() => setContextFilter('All')} className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded-lg text-xs font-bold text-gray-700">Todas as Origens</button>
                                {uniqueContexts.map((ctx: any) => (
                                    <button key={ctx} onClick={() => setContextFilter(ctx)} className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded-lg text-xs text-gray-600 truncate">{ctx}</button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right: Date Filters & Actions */}
                    <div className="flex flex-wrap items-center gap-4">
                         
                         {/* Date Filter Compact */}
                         <div className="flex bg-gray-100 p-1 rounded-lg">
                            {[7, 30, 9999].map(days => (
                                <button
                                    key={days}
                                    onClick={() => { setFilterPeriod(days); setFilterType('Period'); }}
                                    className={`px-3 py-1.5 text-[10px] font-bold uppercase rounded-md transition-all ${filterType === 'Period' && filterPeriod === days ? 'bg-white shadow text-black' : 'text-gray-500 hover:text-black'}`}
                                >
                                    {days === 9999 ? 'Tudo' : `${days}d`}
                                </button>
                            ))}
                        </div>

                        {/* Distribution Switch - Permission Gated */}
                        {hasPermission('crm_config_dist') && (
                            <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
                                <div className="flex flex-col items-end">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase">Distribuição</span>
                                    <span className={`text-xs font-black uppercase ${distMode === 'Random' ? 'text-green-600' : 'text-orange-600'}`}>
                                        {distMode === 'Random' ? 'Roleta (Auto)' : 'Manual'}
                                    </span>
                                </div>
                                <div 
                                    onClick={() => toggleDistMode(distMode === 'Manual' ? 'Random' : 'Manual')} 
                                    className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors ${distMode === 'Random' ? 'bg-green-500' : 'bg-gray-300'}`}
                                >
                                    <div className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform ${distMode === 'Random' ? 'translate-x-6' : 'translate-x-0'}`}></div>
                                </div>
                            </div>
                        )}

                        {/* View Mode Toggle */}
                         <div className="flex bg-gray-100 p-1 rounded-lg">
                            <button 
                                onClick={() => setViewMode('kanban')}
                                className={`p-2 rounded-md transition-all ${viewMode === 'kanban' ? 'bg-white shadow text-black' : 'text-gray-400 hover:text-black'}`}
                                title="Visualização Kanban"
                            >
                                <KanbanSquare size={16} />
                            </button>
                            <button 
                                onClick={() => setViewMode('list')}
                                className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow text-black' : 'text-gray-400 hover:text-black'}`}
                                title="Visualização em Lista"
                            >
                                <List size={16} />
                            </button>
                        </div>

                        <button 
                            onClick={() => setIsCreateModalOpen(true)}
                            className="bg-wtech-black text-white p-2.5 rounded-lg hover:bg-gray-800 transition-all shadow-lg hover:shadow-xl active:scale-95"
                        >
                            <Plus size={18} />
                        </button>
                    </div>
                </div>


                {/* Board or List */}
                {viewMode === 'kanban' ? (
                <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar flex-1 w-full min-h-0"> 
                    <KanbanColumn
                        title="Novos (Entrada)"
                        status="New"
                        leads={filteredLeads.filter(l => l.status === 'New')}
                        onMove={onDropLead}
                        onDropLead={onDropLead}
                        onLeadClick={handleLeadClick}
                        usersMap={usersMap}
                    />
                    <KanbanColumn
                        title="Em Atendimento"
                        status="Contacted"
                        leads={filteredLeads.filter(l => l.status === 'Contacted')}
                        onMove={onDropLead}
                        onDropLead={onDropLead}
                        onLeadClick={handleLeadClick}
                        usersMap={usersMap}
                    />
                    <KanbanColumn
                        title="Negociação"
                        status="Qualified"
                        leads={filteredLeads.filter(l => l.status === 'Qualified' || l.status === 'Negotiating')}
                        onMove={onDropLead}
                        onDropLead={onDropLead}
                        onLeadClick={handleLeadClick}
                        usersMap={usersMap}
                    />
                    <KanbanColumn
                        title="Fechado / Ganho"
                        status="Converted"
                        leads={filteredLeads.filter(l => l.status === 'Converted' || l.status === 'Matriculated')}
                        onMove={onDropLead}
                        onDropLead={onDropLead}
                        onLeadClick={handleLeadClick}
                        usersMap={usersMap}
                    />
                    <KanbanColumn
                        title="Esfriou / Perdido"
                        status="Cold"
                        leads={filteredLeads.filter(l => l.status === 'Cold' || l.status === 'Rejected')}
                        onMove={onDropLead}
                        onDropLead={onDropLead}
                        onLeadClick={handleLeadClick}
                        usersMap={usersMap}
                    />
                </div>
                ) : (
                    <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                        <div className="overflow-y-auto flex-1 custom-scrollbar">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-gray-50 text-gray-400 text-[10px] uppercase font-bold tracking-wider sticky top-0 z-10">
                                    <tr>
                                        <th className="px-6 py-4">Lead</th>
                                        <th className="px-6 py-4">Contato</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4">Origem</th>
                                        <th className="px-6 py-4">Responsável</th>
                                        <th className="px-6 py-4">Tempo</th>
                                        <th className="px-6 py-4 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 text-sm">
                                    {filteredLeads.map(lead => {
                                        // Status Config
                                        let statusColor = 'bg-gray-100 text-gray-600';
                                        let statusLabel = lead.status;
                                        if (lead.status === 'New') { statusColor = 'bg-wtech-black text-white'; statusLabel = 'NOVO'; }
                                        else if (lead.status === 'Contacted') { statusColor = 'bg-blue-100 text-blue-700'; statusLabel = 'EM ATENDIMENTO'; }
                                        else if (lead.status === 'Qualified' || lead.status === 'Negotiating') { statusColor = 'bg-purple-100 text-purple-700 border border-purple-200'; statusLabel = 'NEGOCIAÇÃO'; }
                                        else if (lead.status === 'Converted' || lead.status === 'Matriculated') { statusColor = 'bg-green-100 text-green-700 border border-green-200'; statusLabel = 'GANHO'; }
                                        else if (lead.status === 'Cold' || lead.status === 'Rejected') { statusColor = 'bg-red-50 text-red-400 border border-red-100'; statusLabel = 'PERDIDO'; }

                                        // Time Calc Inline
                                         const start = new Date(lead.updated_at || lead.createdAt).getTime();
                                         const now = new Date().getTime();
                                         const diff = now - start;
                                         const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                                         const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

                                        return (
                                            <tr key={lead.id} className="hover:bg-gray-50 transition-colors group cursor-pointer" onClick={() => handleLeadClick(lead)}>
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-gray-900 group-hover:text-wtech-gold transition-colors">{lead.name}</div>
                                                    <div className="text-xs text-gray-400">{new Date(lead.createdAt).toLocaleDateString()}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-gray-600">{lead.email}</div>
                                                    <div className="text-xs text-gray-400">{lead.phone}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${statusColor}`}>
                                                        {statusLabel}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-1.5">
                                                        {lead.contextId?.startsWith('LP') ? <Globe size={12} className="text-blue-400" /> : <GraduationCap size={12} className="text-orange-400" />}
                                                        <span className="text-xs font-medium text-gray-500 truncate max-w-[150px]" title={lead.contextId}>{lead.contextId || 'N/A'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                     {/* Robust User Display */}
                                                     {lead.assignedTo ? (
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold overflow-hidden border border-gray-300">
                                                                {/* Try to show Avatar or Initial */}
                                                                {usersMap[lead.assignedTo] ? (
                                                                     usersMap[lead.assignedTo].charAt(0).toUpperCase() 
                                                                ) : '?'}
                                                            </div>
                                                            <span className="text-xs text-gray-700 font-bold truncate max-w-[100px]" title={usersMap[lead.assignedTo] || lead.assignedTo}>
                                                                {usersMap[lead.assignedTo] ? usersMap[lead.assignedTo].split(' ')[0] : 'Usuário ' + lead.assignedTo.substr(0,4)}
                                                            </span>
                                                        </div>
                                                     ) : <span className="text-xs text-gray-400 italic">Fila (Sem Dono)</span>}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-xs font-bold text-gray-500">{days}d {hours}h</span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button className="text-gray-400 hover:text-black p-1"><MoreVertical size={16} /></button>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                            {filteredLeads.length === 0 && (
                                <div className="p-10 text-center text-gray-400 text-sm">Nenhum lead encontrado com os filtros atuais.</div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Conversion Chart Overlay (Mini) */}
            <div className="fixed bottom-8 right-8 bg-white p-4 rounded-xl shadow-2xl border border-gray-100 z-40 animate-in slide-in-from-right">
                <div className="flex items-center gap-4">
                    <div className="relative w-16 h-16">
                        <svg className="w-full h-full transform -rotate-90">
                            <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-gray-100" />
                            <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="transparent" strokeDasharray={175.9} strokeDashoffset={175.9 - (175.9 * conversionRate) / 100} className="text-green-500" />
                        </svg>
                        <span className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-xs font-bold">{conversionRate}%</span>
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-500 uppercase">Taxa de Conversão</p>
                        <p className="text-sm font-bold text-gray-900">{leads.filter(l => l.status === 'Converted').length} Vendas / {leads.length} Leads</p>
                    </div>
                </div>
            </div>     {/* Lead Edit Modal */}
            <AnimatePresence>
                {editingLead && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md"
                        >
                            <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
                                <div className="flex-1">
                                    <h3 className="text-xl font-bold text-gray-900">{editingLead.name}</h3>
                                    <p className="text-sm text-gray-500">{editingLead.email}</p>
                                </div>
                                <div className="flex gap-2 items-center">
                                    <button
                                        onClick={() => setSelectedLeadForTasks(editingLead)}
                                        className="p-2 bg-yellow-50 text-yellow-600 rounded-lg hover:bg-yellow-100 transition-colors flex items-center gap-2 text-xs font-bold uppercase"
                                        title="Tarefas e Lembretes"
                                    >
                                       <Clock size={16} /> Tarefas
                                    </button>
                                    <button 
                                        onClick={() => setEditingLead(null)} 
                                        className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>
                            <div className="flex flex-col gap-2 mb-4 bg-gray-50 p-3 rounded-lg border border-gray-100">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Contato</span>
                                <div className="flex items-center gap-2">
                                     <Phone size={16} className="text-wtech-gold" />
                                     <span className="font-bold text-lg text-gray-900 selection:bg-wtech-gold selection:text-black">
                                        {editingLead.phone || 'Sem Telefone'}
                                     </span>
                                </div>
                                <div className="text-xs text-blue-600 font-medium hover:underline cursor-pointer flex items-center gap-1" onClick={() => window.open(`https://wa.me/55${editingLead.phone?.replace(/\D/g, '')}`, '_blank')}>
                                    <MessageCircle size={12} /> Abrir no WhatsApp
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Colaborador Responsável</label>
                                    <div className="relative">
                                        <Users size={16} className="absolute left-3 top-3 text-gray-400" />
                                        <select
                                            className="w-full border border-gray-200 rounded-lg pl-10 pr-4 py-2.5 text-sm font-medium focus:border-wtech-gold focus:ring-1 focus:ring-wtech-gold outline-none appearance-none bg-white"
                                            value={editForm.assignedTo || ''}
                                            onChange={e => setEditForm({ ...editForm, assignedTo: e.target.value })}
                                        >
                                            <option value="">Sem Dono (Fila)</option>
                                            {/* We need to reverse map usersMap or have a list of users. 
                                                Since we only have usersMap (uuid -> Name), we might need to fetch full users list or reconstruct. 
                                                Actually, let's use the usersMap to build options assuming we can iterate it.
                                            */}
                                            {Object.entries(usersMap).map(([id, name]) => (
                                                <option key={id} value={id}>
                                                    {name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Notas Internas</label>
                                    <textarea
                                        className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:border-wtech-gold focus:ring-1 focus:ring-wtech-gold outline-none min-h-[100px]"
                                        placeholder="Observações sobre o lead..."
                                        value={editForm.internalNotes}
                                        onChange={e => setEditForm({ ...editForm, internalNotes: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tags / Identificação</label>
                                    <div className="flex flex-wrap gap-2 mb-2">
                                        {editForm.tags?.map((tag, idx) => (
                                            <span key={idx} className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full flex items-center gap-1 border border-gray-200">
                                                {tag}
                                                <button onClick={() => setEditForm(prev => ({ ...prev, tags: prev.tags.filter((_, i) => i !== idx) }))} className="hover:text-red-500"><X size={12} /></button>
                                            </span>
                                        ))}
                                    </div>
                                    <div className="flex gap-2">
                                        <input
                                            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-wtech-gold"
                                            placeholder="Adicionar tag... (Enter)"
                                            value={tagInput}
                                            onChange={e => setTagInput(e.target.value)}
                                            onKeyDown={e => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    if (tagInput.trim()) {
                                                        setEditForm(prev => ({ ...prev, tags: [...(prev.tags || []), tagInput.trim()] }));
                                                        setTagInput('');
                                                    }
                                                }
                                            }}
                                        />
                                        <button 
                                            onClick={() => {
                                                if (tagInput.trim()) {
                                                    setEditForm(prev => ({ ...prev, tags: [...(prev.tags || []), tagInput.trim()] }));
                                                    setTagInput('');
                                                }
                                            }}
                                            className="px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                                        >
                                            <Plus size={16} />
                                        </button>
                                    </div>
                                </div>

                                <div className="pt-4 flex gap-3">
                                    <button
                                        onClick={deleteLead}
                                        className="bg-red-50 text-red-600 font-bold py-3 px-4 rounded-lg hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                                        title="Excluir Lead"
                                    >
                                        <X size={16} />
                                    </button>
                                    <button
                                        onClick={saveLeadUpdates}
                                        className="flex-1 bg-wtech-black text-white font-bold py-3 rounded-lg hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Save size={16} /> Salvar Alterações
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Debug Info (Only for diagnosing) */}
            { import.meta.env.DEV && (
                 <div className="fixed bottom-4 left-4 p-4 bg-gray-900 text-white rounded-lg shadow-xl text-xs font-mono z-50 opacity-80 hover:opacity-100 transition-opacity">
                    <p className="font-bold border-b border-gray-700 pb-1 mb-1 text-green-400">DEBUG PERMISSÕES</p>
                    <p>User ID: {user?.id?.substring(0,8)}...</p>
                    <p>Role (Ctx): {typeof user?.role === 'string' ? user.role : user?.role?.name}</p>
                    <p>Perms Loaded: {permissions ? 'YES' : 'NO'}</p>
                    <p>View All Key: {hasPermission('crm_view_all') ? 'YES' : 'NO'}</p>
                    <p>Is Admin: {hasPermission('admin_access') ? 'YES' : 'NO'}</p>
                 </div>
            )}
            {/* Lead Task Sidebar */}
            {selectedLeadForTasks && (
                <LeadTaskSidebar
                    lead={selectedLeadForTasks}
                    isOpen={!!selectedLeadForTasks}
                    onClose={() => setSelectedLeadForTasks(null)}
                    onTaskCreated={(task) => {
                         notificationRef.current?.createNotification('success', 'Agendado!', `Tarefa "${task.title}" criada.`);
                    }}
                />
            )}
            {/* NEW LEAD MODAL */}
            <AnimatePresence>
                {/* Reusing similar modal style */}
                {showSettings /* reusing showSettings as createModal trigger for now or creating new state? lets create new state below */ }
            </AnimatePresence>
            
             <AnimatePresence>
                {isCreateModalOpen && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md"
                        >
                            <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
                                <h3 className="text-xl font-bold text-gray-900">Novo Lead</h3>
                                <button 
                                    onClick={() => setIsCreateModalOpen(false)} 
                                    className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome Completo *</label>
                                    <input
                                        className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:border-wtech-gold focus:ring-1 focus:ring-wtech-gold outline-none"
                                        placeholder="Ex: João Silva"
                                        value={newLeadForm.name}
                                        onChange={e => setNewLeadForm({ ...newLeadForm, name: e.target.value })}
                                        autoFocus
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email</label>
                                    <input
                                        className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:border-wtech-gold focus:ring-1 focus:ring-wtech-gold outline-none"
                                        placeholder="email@exemplo.com"
                                        value={newLeadForm.email}
                                        onChange={e => setNewLeadForm({ ...newLeadForm, email: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Telefone / WhatsApp *</label>
                                    <input
                                        className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:border-wtech-gold focus:ring-1 focus:ring-wtech-gold outline-none"
                                        placeholder="11999999999"
                                        value={newLeadForm.phone}
                                        onChange={e => setNewLeadForm({ ...newLeadForm, phone: e.target.value })}
                                    />
                                </div>
                                
                                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 flex items-center gap-2 text-xs text-gray-600">
                                    <Users size={14} className="text-wtech-gold" />
                                    <span>Cadastrado por: <strong>{user?.name || 'Você'}</strong> (Auto-atribuído)</span>
                                </div>

                                <button
                                    onClick={handleCreateLead}
                                    disabled={!newLeadForm.name || !newLeadForm.phone}
                                    className="w-full bg-wtech-black text-white font-bold py-3 rounded-lg hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Plus size={16} /> Cadastrar Lead
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <SplashedPushNotifications ref={notificationRef} />

        </DragContext.Provider >
    );
};

export default CRMView;
