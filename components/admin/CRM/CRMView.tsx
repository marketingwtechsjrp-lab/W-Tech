import React, { useState, useEffect, useMemo } from 'react';
import { Users, Settings, Plus, MoreVertical, X, Save, Clock, AlertTriangle, Thermometer, TrendingUp, Search, Filter, List, KanbanSquare, Globe, GraduationCap, Phone, MessageCircle, CheckCircle, ShoppingBag, Banknote, Calendar, ArrowRight, Copy, Trash2, Share2, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../context/AuthContext';
import type { Lead } from '../../../types';
import { createPaymentLink } from '../../../lib/asaas';
import { createStripePaymentLink } from '../../../lib/stripe';
import { SplashedPushNotifications, SplashedPushNotificationsHandle } from '@/components/ui/splashed-push-notifications';
import LeadTaskSidebar from './LeadTaskSidebar';
import { useRef } from 'react'; // Ensure useRef is imported
import { BauhausCard } from '@/components/ui/bauhaus-card';

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
        <div className="mb-6 w-full bg-white dark:bg-[#1A1A1A] p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-transparent relative overflow-hidden transition-colors">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h3 className="font-bold text-gray-900 dark:text-white">Visão do Funil</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Fluxo de conversão atual</p>
                </div>
                <div className="bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full text-xs font-bold text-gray-600 dark:text-gray-300">
                    Total: {leads.length}
                </div>
            </div>

            <div className="flex items-center justify-between h-32 relative px-4">
                {/* Connecting Line (Background Pipe) */}
                <div className="absolute top-1/2 left-0 w-full h-4 bg-gray-100 dark:bg-gray-800 -translate-y-1/2 rounded-full z-0"></div>

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
                                            <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor={stage.color} floodOpacity="0.3" />
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
                                <span className="block text-xs font-bold text-gray-800 dark:text-gray-300 group-hover:text-wtech-gold transition-colors uppercase tracking-wider">{stage.label}</span>
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
        'Cold': 'bg-gray-500 dark:bg-gray-700 text-white border-gray-500 dark:border-gray-700'
    };

    return (
        <div
            className={`flex-1 min-w-[200px] flex flex-col h-full rounded-2xl transition-colors ${draggedId ? 'bg-gray-100/50 dark:bg-[#111]/50 border-2 border-dashed border-gray-300 dark:border-gray-700' : 'bg-gray-50 dark:bg-[#1A1A1A] border border-gray-200 dark:border-transparent'}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
        >
            {/* Header */}
            <div className={`p-4 rounded-t-2xl flex flex-col gap-2 ${status === 'New' || status === 'Converted' ? 'shadow-md' : ''} ${statusColors[status] || 'bg-white dark:bg-[#111] text-gray-800 dark:text-gray-100'}`}>
                <div className="flex justify-between items-center">
                    <h3 className="font-bold text-sm uppercase tracking-wider">{title}</h3>
                    <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs font-bold">{leads.length}</span>
                </div>
                {/* Stats Summary */}
                <div className="flex items-center gap-2 text-[10px] font-medium opacity-80">
                    <Clock size={10} />
                    <span>Tempo Médio: {averageTime}</span>
                </div>
                {/* Total Value for Won Column */}
                {(status === 'Converted' || status === 'Matriculated' || status === 'Fechamento' || status === 'Ganho') && (
                    <div className="flex items-center gap-1 mt-1 bg-white/20 p-1.5 rounded text-xs font-bold border border-white/10">
                        <Banknote size={12} />
                        <span>
                            Total: {leads.reduce((acc: number, l: any) => acc + (Number(l.conversion_value) || 0), 0)
                                .toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                    </div>
                )}
            </div>

            {/* Cards Container */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                {leads.map((lead: any) => (
                    <LeadCard key={lead.id} lead={lead} onClick={() => onLeadClick(lead)} onMove={onDropLead} usersMap={usersMap} />
                ))}
                {leads.length === 0 && (
                    <div className="text-center py-8 text-gray-400 dark:text-gray-600 text-xs italic">
                        Sem leads nesta etapa
                    </div>
                )}
            </div>
        </div>
    );
};

// Import helper
import { calculateCommercialTime, formatCommercialTime } from '../../../lib/businessTime';

// Hook to calculate time spent
const useTimeInStatus = (dateString: string) => {
    const [timeDisplay, setTimeDisplay] = useState('');
    const [isLongWait, setIsLongWait] = useState(false);

    useEffect(() => {
        const calculate = () => {
            const minutes = calculateCommercialTime(dateString);
            setTimeDisplay(formatCommercialTime(minutes));

            // Logic for Long Wait: > 2 commercial days (approx 20h) or > 4h
            // User requirement: "timer so roda horario comercial". "Travar sabado e domingo".
            // Let's keep the red alerta simple: > 8h commercial time? 
            // Or stick to some logic.
            // Let's say > 20h commercial (2 days) is long.
            if (minutes > 1200) setIsLongWait(true); // 20 hours
        };
        calculate();
        const interval = setInterval(calculate, 60000); // Update every minute
        return () => clearInterval(interval);
    }, [dateString]);

    return { timeDisplay, isLongWait };
};



import { Badge } from '@/components/ui/badge';
import { Edit } from 'lucide-react';

const LeadCard: React.FC<{ lead: any, onClick: () => void, onMove?: any, usersMap: Record<string, string> }> = ({ lead, onClick, onMove, usersMap }) => {
    const { setDraggedId } = React.useContext(DragContext);
    const [isDragging, setIsDragging] = React.useState(false);

    // Timer Logic
    const statusDate = lead.updated_at || lead.createdAt;
    const { timeDisplay, isLongWait } = useTimeInStatus(statusDate);

    // Quiz Data Parsing
    const quizData = lead.quiz_data || (lead.internalNotes && lead.internalNotes.startsWith('{') ? JSON.parse(lead.internalNotes) : null);
    const quizTemp = quizData?.temperature; // 'Frio', 'Morno', 'Quente'

    // Color Mapping
    const getAccentColor = () => {
        if (quizTemp?.toLowerCase().includes('quen') || quizTemp?.toLowerCase().includes('alta')) return '#ef4444'; // Red
        if (quizTemp?.toLowerCase().includes('morn')) return '#f97316'; // Orange
        return '#3b82f6'; // Blue default
    };

    const accentColor = getAccentColor();

    // Quick Move Logic
    const nextStatusMap: Record<string, string> = {
        'New': 'Contacted',
        'Contacted': 'Qualified',
        'Qualified': 'Converted', 
        'Negotiating': 'Converted',
        'Cold': 'New'
    };

    const handleNext = (e: any) => {
        e.stopPropagation();
        const next = nextStatusMap[lead.status];
        if (next && onMove) {
            onMove(lead.id, next, lead);
        }
    };

    const attendantName = lead.assignedTo && usersMap[lead.assignedTo] ? usersMap[lead.assignedTo].split(' ')[0] : 'S/ Atendente';

    return (
        <div
            onClick={onClick}
            draggable
            onDragStart={() => { setDraggedId(lead.id); setIsDragging(true); }}
            onDragEnd={() => { setDraggedId(null); setIsDragging(false); }}
            className={`
                relative bg-white dark:bg-[#222]/80 p-3 rounded-xl border border-gray-100 dark:border-gray-800/50 
                hover:shadow-lg transition-all cursor-move group overflow-hidden
                ${isLongWait ? 'ring-1 ring-red-500/20' : ''}
                hover:border-wtech-gold/30
            `}
        >
            {/* Left Accent Border */}
            <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: accentColor }}></div>

            {/* Header / Name */}
            <div className="flex justify-between items-start pl-3 mb-2">
                <div>
                     <h4 className="font-bold text-gray-800 dark:text-gray-200 text-sm line-clamp-1 pr-2">{lead.name}</h4>
                     {/* Tags/badges if any */}
                </div>
                 {/* Quick Move Arrow */}
                 {nextStatusMap[lead.status] && (
                    <button 
                        onClick={handleNext}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-400 hover:text-green-500 transition-all transform hover:scale-110 active:scale-95 z-20"
                        title={`Mover para ${nextStatusMap[lead.status]}`}
                    >
                        <ArrowRight size={16} />
                    </button>
                )}
            </div>

            {/* Contact Info */}
            <div className="mb-2 pl-3">
                <div className="flex flex-col gap-0.5">
                    {lead.email && <span className="text-[10px] text-gray-500 dark:text-gray-400 truncate flex items-center gap-1"><MessageCircle size={9} /> {lead.email}</span>}
                    {lead.phone && <span className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center gap-1 font-mono tracking-tight"><Phone size={9} /> {lead.phone}</span>}
                </div>
            </div>

            {/* Attendant Info */}
            <div className="mb-2 pl-3">
                <span className="text-[9px] uppercase font-bold text-gray-400 tracking-wider truncate">
                    {lead.assignedTo ? `Atendente: ${attendantName.toUpperCase()}` : 'FILA DE ESPERA'}
                </span>
            </div>

            {/* Tags */}
            {lead.tags && lead.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                    {lead.tags.slice(0, 3).map((tag: string, i: number) => (
                        <div key={`${lead.id}-tag-${i}`}>
                            <Badge variant="secondary" size="xs" appearance="outline" className="text-[9px] h-4 px-1">
                                {tag}
                            </Badge>
                        </div>
                    ))}
                    {lead.tags.length > 3 && <span className="text-[9px] text-gray-400">+{lead.tags.length - 3}</span>}
                </div>
            )}

            {/* Progress Bar (Compact) */}
            <div className="mt-1">
                <div className="flex justify-between items-end mb-0.5">
                    <span className={`text-[8px] font-bold uppercase ${isLongWait ? 'text-red-500' : 'text-gray-300 dark:text-gray-600'}`}>
                        TEMPO NA ETAPA
                    </span>
                    <span className={`text-[8px] font-mono ${isLongWait ? 'text-red-500 font-bold' : 'text-gray-400'}`}>
                        {timeDisplay}
                    </span>
                </div>
                <div className="h-1 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div
                        className={`h-full rounded-full ${isLongWait ? 'bg-red-500' : 'bg-blue-500'}`}
                        style={{ width: isLongWait ? '100%' : '30%' }}
                    ></div>
                </div>
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
    const [usersList, setUsersList] = useState<{ id: string, name: string }[]>([]); // NEW

    // CRM Filter State
    const [filterPeriod, setFilterPeriod] = useState(30); // Days
    const [filterType, setFilterType] = useState<'Period' | 'Month' | 'Custom'>('Period');
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [customRange, setCustomRange] = useState({ start: '', end: '' });

    // New Advanced Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [contextFilter, setContextFilter] = useState('All');
    const [selectedUserFilter, setSelectedUserFilter] = useState('All'); // NEW
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

    const handleCreateLead = async (formData?: any) => {
        // Support both state-based (legacy) and argument-based (modal) calls
        const dataToSave = formData || newLeadForm;
        
        if (!dataToSave.name || !dataToSave.phone) return alert("Nome e Telefone são obrigatórios.");

        // 1. Check for duplicate phone
        const { data: existingLead } = await supabase
            .from('SITE_Leads')
            .select('*')
            .eq('phone', dataToSave.phone)
            .maybeSingle();

        if (existingLead) {
            alert("Este telefone já está cadastrado no CRM. Redirecionando para o lead existente.");
            setIsCreateModalOpen(false);
            setNewLeadForm({ name: '', email: '', phone: '' });
            handleLeadClick(existingLead); // Open the existing lead details
            if (notificationRef.current) {
                notificationRef.current.createNotification('info', 'Lead Duplicado', `O lead ${existingLead.name} já existe.`);
            }
            return;
        }

        const payload = {
            name: dataToSave.name,
            email: dataToSave.email,
            phone: dataToSave.phone,
            value: Number(dataToSave.value) || 0, // ADDED: Value support
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
                setUsersList(usersData);
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
            hasPermission('crm_view_all') ||
            hasPermission('crm_view_team'); // Added Team View

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
                quiz_data: l.quiz_data,
                conversion_value: l.conversion_value,
                conversion_summary: l.conversion_summary,
                conversion_type: l.conversion_type
            }));
            setLeads(mapped);
        }
    }



    // Refs for Realtime Cleanup (Avoid Stale Closures)
    const activeModalLeadId = useRef<string | null>(null);
    const activeSidebarLeadId = useRef<string | null>(null);

    useEffect(() => { activeModalLeadId.current = editingLead?.id || null; }, [editingLead]);
    useEffect(() => { activeSidebarLeadId.current = selectedLeadForTasks?.id || null; }, [selectedLeadForTasks]);

    // Realtime Subscription
    useEffect(() => {
        // Determine Access Level for Realtime Filtering
        const hasFullAccess =
            (typeof user?.role === 'string' && (user.role === 'ADMIN' || user.role === 'Admin' || user.role === 'Super Admin')) ||
            (typeof user?.role !== 'string' && user?.role?.level >= 10) ||
            (typeof user?.role !== 'string' && user?.role?.name === 'Super Admin') ||
            (typeof user?.role !== 'string' && user?.role?.permissions?.admin_access) ||
            hasPermission('crm_view_all') ||
            hasPermission('crm_view_team');

        const channel = supabase
            .channel('lead_updates_crm')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'SITE_Leads'
                },
                (payload) => {
                    const { eventType, new: newRecord, old: oldRecord } = payload;

                    // Helper to map record to frontend structure
                    const mapLead = (r: any) => ({
                        ...r,
                        contextId: r.context_id,
                        createdAt: r.created_at,
                        updated_at: r.updated_at || r.created_at,
                        assignedTo: r.assigned_to,
                        internalNotes: r.internal_notes,
                        quiz_data: r.quiz_data,
                        conversion_value: r.conversion_value,
                        conversion_summary: r.conversion_summary,
                        conversion_type: r.conversion_type
                    });

                    if (eventType === 'INSERT') {
                        // Only add if user has access
                        if (hasFullAccess || newRecord.assigned_to === user?.id || !newRecord.assigned_to) {
                            setLeads(prev => {
                                // Prevent duplicates just in case
                                if (prev.some(l => l.id === newRecord.id)) return prev;
                                return [mapLead(newRecord), ...prev];
                            });
                            if (!newRecord.assigned_to || newRecord.assigned_to === user?.id) {
                                notificationRef.current?.createNotification('info', 'Novo Lead', `${newRecord.name || 'Um novo lead'} chegou no CRM.`);
                            }
                        }
                    } else if (eventType === 'UPDATE') {
                        const mapped = mapLead(newRecord);

                        if (hasFullAccess || newRecord.assigned_to === user?.id) {
                            setLeads(prev => {
                                const exists = prev.find(l => l.id === newRecord.id);
                                if (exists) {
                                    return prev.map(l => l.id === newRecord.id ? mapped : l);
                                } else {
                                    // New lead for this user (e.g. just assigned)
                                    return [mapped, ...prev];
                                }
                            });
                        } else {
                            // User sent away or lost access
                            setLeads(prev => prev.filter(l => l.id !== newRecord.id));
                        }
                    } else if (eventType === 'DELETE') {
                        setLeads(prev => prev.filter(l => l.id !== oldRecord.id));

                        // Auto-close modals if open
                        if (activeModalLeadId.current === oldRecord.id) {
                            setEditingLead(null);
                            notificationRef.current?.createNotification('warning', 'Lead Removido', 'O lead que você estava visualizando foi excluído.');
                        }
                        if (activeSidebarLeadId.current === oldRecord.id) {
                            setSelectedLeadForTasks(null);
                        }
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, permissions]); // Dependencies for access logic re-eval

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
    // --- Conversion Modal State ---
    const [conversionModal, setConversionModal] = useState<{ isOpen: boolean, lead: Lead | null, targetStatus: string }>({ isOpen: false, lead: null, targetStatus: '' });
    const [conversionType, setConversionType] = useState<'Course' | 'Product'>('Course');

    // Course Conversion State
    const [activeCourses, setActiveCourses] = useState<any[]>([]);
    const [selectedCourseId, setSelectedCourseId] = useState('');

    // Product Conversion State
    const [productSummary, setProductSummary] = useState('');
    const [saleValue, setSaleValue] = useState('');
    const [generatePaymentLink, setGeneratePaymentLink] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<'Asaas' | 'Stripe' | 'Manual'>('Asaas');
    const [stripeCurrency, setStripeCurrency] = useState<'BRL' | 'USD' | 'EUR'>('BRL');
    const [manualDetails, setManualDetails] = useState('');
    const [createdPaymentLink, setCreatedPaymentLink] = useState('');
    const [isGeneratingLink, setIsGeneratingLink] = useState(false);

    // Catalog Products State
    const [catalogProducts, setCatalogProducts] = useState<any[]>([]);
    const [selectedProductId, setSelectedProductId] = useState('');
    const [orderQuantity, setOrderQuantity] = useState(1);

    // Lost Reason State
    const [lostReasonModal, setLostReasonModal] = useState<{ isOpen: boolean, lead: Lead | null, targetStatus: string }>({ isOpen: false, lead: null, targetStatus: '' });
    const [lostReason, setLostReason] = useState('');

    useEffect(() => {
        if (conversionModal.isOpen) {
            if (conversionType === 'Course') {
                const fetchActiveCourses = async () => {
                    const { data } = await supabase.from('SITE_Courses')
                        .select('id, title, date')
                        .eq('status', 'Published')
                        .gte('date', new Date().toISOString()) // Only future courses
                        .order('date', { ascending: true });
                    if (data) setActiveCourses(data);
                };
                fetchActiveCourses();
            } else if (conversionType === 'Product') {
                const fetchProducts = async () => {
                    const { data } = await supabase.from('SITE_Products')
                        .select('id, title, price, status')
                        .eq('status', 'Unrestricted') // Assuming this means active
                        .order('title', { ascending: true });
                    if (data) setCatalogProducts(data);
                };
                fetchProducts();
            }
        }
    }, [conversionModal.isOpen, conversionType]);

    // Drag & Drop Handler
    const onDropLead = async (leadId: string, newStatus: string) => {
        const currentLead = leads.find(l => l.id === leadId);
        if (!currentLead) return;

        const currentIndex = getStageIndex(currentLead.status);
        const newIndex = getStageIndex(newStatus);
        const isWonStage = ['Converted', 'Matriculated', 'Fechamento', 'Ganho'].includes(newStatus);

        const isAdm =
            (typeof user?.role === 'string' && (user.role === 'ADMIN' || user.role === 'Admin' || user.role === 'Super Admin')) ||
            (typeof user?.role !== 'string' && user?.role?.level >= 10) ||
            hasPermission('crm_manage_all') ||
            hasPermission('crm_move_back');

        if (!isAdm && newIndex < currentIndex) {
            alert('Apenas administradores podem mover leads para trás no funil.');
            return;
        }

        // Intercept Won Stage
        if (isWonStage) {
            setConversionModal({ isOpen: true, lead: currentLead, targetStatus: newStatus });
            return;
        }

        // Intercept Lost Stage
        const isLostStage = ['Cold', 'Rejected', 'Lost', 'Esfriou', 'Perdido'].includes(newStatus);
        if (isLostStage) {
            setLostReasonModal({ isOpen: true, lead: currentLead, targetStatus: newStatus });
            return;
        }

    // Standard Move
        await executeMove(leadId, newStatus, currentLead);
    };

    const handleMoveLead = onDropLead;

    const executeMove = async (leadId: string, newStatus: string, currentLead: Lead) => {
        const now = new Date().toISOString();

        // Optimistic Update
        setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus as any, updated_at: now } : l));

        // DB Update
        const { error } = await supabase.from('SITE_Leads').update({ status: newStatus, updated_at: now }).eq('id', leadId);

        if (error) {
            console.error("Move Lead Error:", error);
            alert(`Falha ao mover lead: ${error.message}`);
            fetchData(); // Revert
        }
    };

    const handleConfirmConversion = async () => {
        if (!conversionModal.lead) return;

        const { lead, targetStatus } = conversionModal;

        // 1. Update Lead Status
        await executeMove(lead.id, targetStatus, lead);

        // 2. Handle Logic
        if (conversionType === 'Course') {
            if (onConvertLead) {
                // Pass extra data: { type: 'course', courseId: ... }
                // We cast as any to bypass strict prop type check if it wasn't updated yet, 
                // but we will update Admin.tsx to handle this structure.
                (onConvertLead as any)(lead, { type: 'course', courseId: selectedCourseId });
            }
        } else {
            // Product Sale (Refactored to Orders)
            const value = parseFloat(saleValue.replace('R$', '').replace('.', '').replace(',', '.').trim()) || 0;
            const selectedProduct = catalogProducts.find(p => p.id === selectedProductId);

            // 1. Update Lead with conversion metadata
            const { error: leadError } = await supabase.from('SITE_Leads').update({
                internal_notes: `${lead.internalNotes || ''}\n[PEDIDO CRM]: R$${value} - ${productSummary || selectedProduct?.title || 'Venda de Produto'}`,
                conversion_value: value,
                conversion_summary: productSummary || selectedProduct?.title || 'Venda de Produto',
                conversion_type: 'Product'
            }).eq('id', lead.id);

            if (leadError) console.error("Error saving conversion details:", leadError);

            // --- Create Sale in SITE_Sales ---
            try {
                // Correct payload matching SITE_Sales schema from create_stock_logistics_tables.sql
                const saleData: any = {
                    client_id: lead.id,
                    client_name: lead.name,
                    client_email: lead.email,
                    client_phone: lead.phone,
                    total_value: value,
                    payment_method: paymentMethod === 'Manual' ? manualDetails : paymentMethod,
                    status: 'paid',
                    channel: 'CRM',
                    notes: `Venda via CRM: ${selectedProduct?.title || productSummary || 'Item CRM'}`,
                    seller_id: lead.assignedTo || user?.id,
                    seller_name: usersMap[lead.assignedTo || user?.id || ''] || 'Vendedor',
                    created_at: new Date().toISOString()
                };

                const { data: saleResponse, error: saleError } = await supabase
                    .from('SITE_Sales')
                    .insert(saleData)
                    .select()
                    .single();

                if (saleError) {
                    console.error("Error creating sale:", saleError);
                    notificationRef.current?.createNotification('error', 'Erro no Banco', `Não foi possível registrar a venda: ${saleError.message}`);
                } else {
                    console.log("✅ Sale created successfully:", saleResponse);

                    // --- Create Sale Item in SITE_SaleItems ---
                    if (selectedProductId || productSummary) {
                        const { error: itemError } = await supabase.from('SITE_SaleItems').insert({
                            sale_id: saleResponse.id,
                            product_id: selectedProductId || null,
                            quantity: orderQuantity || 1,
                            unit_price: value / (orderQuantity || 1)
                        });
                        if (itemError) {
                            console.error("Error creating sale item:", itemError);
                            alert(`Erro CRM (SITE_SaleItems): ${itemError.message}`);
                        }
                    }
                    
                    // --- Create Transaction in SITE_Transactions for Cash Flow ---
                    const { error: transError } = await supabase.from('SITE_Transactions').insert({
                        description: `Venda CRM #${saleResponse?.id?.slice(0, 5) || ''}: ${lead.name} - ${selectedProduct?.title || productSummary || 'Produto/Serviço'}`,
                        category: 'SALES',
                        type: 'Income', // Capitalized to match check constraint
                        amount: value,
                        payment_method: saleData.payment_method,
                        attendant_id: lead.assignedTo || user?.id,
                        attendant_name: usersMap[lead.assignedTo || user?.id || ''] || 'Vendedor',
                        created_at: new Date().toISOString()
                    });

                    if (transError) {
                        console.error("Error creating transaction record:", transError);
                        notificationRef.current?.createNotification('error', 'Erro Financeiro', `Venda registrada, mas falha no fluxo de caixa: ${transError.message}`);
                    }
                }
            } catch (e: any) {
                console.error("Failed to create sale record:", e);
                alert(`Exceção CRM: ${e.message}`);
            }

            notificationRef.current?.createNotification('success', 'Pedido Gerado!', `Venda de R$ ${value.toLocaleString('pt-BR')} registrada com sucesso.`);

            if (onConvertLead) {
                (onConvertLead as any)(lead, { type: 'product', summary: productSummary || selectedProduct?.title, value });
            }

            if (generatePaymentLink) {
                setIsGeneratingLink(true);
                try {
                    const { success, invoiceUrl, error: paymentError } = await createPaymentLink({
                        lead,
                        value,
                        description: `Venda: ${productSummary || 'Produto/Serviço'}`
                    });

                    if (success && invoiceUrl) {
                        setCreatedPaymentLink(invoiceUrl);
                        // Don't close modal yet, show the link
                        setIsGeneratingLink(false);
                        return;
                    } else {
                        alert(`Erro ao gerar link Asaas: ${paymentError}`);
                    }
                } catch (e: any) {
                    alert(`Erro ao conectar Asaas: ${e.message}`);
                }
                setIsGeneratingLink(false);
            }
        }
        if (!generatePaymentLink) {
            setConversionModal({ isOpen: false, lead: null, targetStatus: '' });
            setProductSummary('');
            setSaleValue('');
            setSelectedCourseId('');
            setGeneratePaymentLink(false);
        }
    };

    const handleConfirmLost = async () => {
        if (!lostReasonModal.lead) return;
        if (!lostReason.trim()) return alert("Por favor, informe o motivo.");

        const { lead, targetStatus } = lostReasonModal;

        // 1. Update Internal Notes with Reason
        const today = new Date();
        const dateStr = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;
        const newNotes = `${lead.internalNotes || ''}\n\n[MOTIVO PERDA - ${dateStr}]: ${lostReason}`;

        // 2. Execute Move with updated notes (Implicitly we want to save notes first or just update it all)
        // Since executeMove only updates status/updated_at, we need a separate update or modified executeMove.
        // We'll just update directly here to save the note + status.

        const now = new Date().toISOString();

        // Optimistic Update (including note locally? maybe overkill, just status)
        setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, status: targetStatus as any, updated_at: now, internalNotes: newNotes } : l));

        const { error } = await supabase.from('SITE_Leads').update({
            status: targetStatus,
            updated_at: now,
            internal_notes: newNotes
        }).eq('id', lead.id);

        if (error) {
            console.error("Move Lead Error:", error);
            alert(`Falha ao mover lead: ${error.message}`);
            fetchData(); // Revert
        } else {
            notificationRef.current?.createNotification('info', 'Lead Atualizado', 'Motivo da perda registrado.');
        }

        setLostReasonModal({ isOpen: false, lead: null, targetStatus: '' });
        setLostReason('');
    };

    const saveLeadUpdates = async (updatedForm?: any) => {
        if (!editingLead) return;

        // Use the data passed from the modal, or fallback to state
        const dataToSave = updatedForm || {
            name: editingLead.name,
            phone: editingLead.phone,
            email: editingLead.email,
            status: editingLead.status,
            assigned_to: editingLead.assignedTo,
            internal_notes: editingLead.internalNotes,
            tags: editingLead.tags,
            value: editingLead.value || 0
        };

        // Note: Field mapping for DB (assigned_to, internal_notes, etc)
        const dbPayload = {
            name: dataToSave.name,
            phone: dataToSave.phone,
            email: dataToSave.email,
            status: dataToSave.status,
            assigned_to: dataToSave.assigned_to || dataToSave.assignedTo,
            internal_notes: dataToSave.internal_notes || dataToSave.internalNotes,
            tags: dataToSave.tags,
            value: dataToSave.value || 0
        };

        const { error } = await supabase.from('SITE_Leads').update(dbPayload).eq('id', editingLead.id);

        if (error) {
            console.error("Error updating lead:", error);
            alert('Erro ao salvar alterações: ' + error.message);
            return;
        }

        // --- Create Sales Record if status is Converted/Won and has value ---
        const isConvertedStatus = ['Converted', 'Matriculated', 'CheckedIn', 'Won'].includes(dbPayload.status);
        const hasValue = dbPayload.value && dbPayload.value > 0;

        if (isConvertedStatus && hasValue) {
            try {
                // Check if sale already exists for this lead
                const { data: existingSale } = await supabase
                    .from('SITE_Sales')
                    .select('id')
                    .eq('client_id', editingLead.id)
                    .maybeSingle();

                if (!existingSale) {
                    // Create new sale record
                    const saleData = {
                        client_id: editingLead.id,
                        client_name: dbPayload.name,
                        client_email: dbPayload.email,
                        client_phone: dbPayload.phone,
                        total_value: dbPayload.value,
                        payment_method: 'Manual (Edit)',
                        status: 'paid',
                        channel: 'CRM',
                        notes: dbPayload.internal_notes?.match(/\[CONVERSÃO PRODUTO\]: R\$[\d,.]+ - (.+)/)?.[1] || 'Venda via CRM',
                        seller_id: dbPayload.assigned_to || user?.id,
                        seller_name: usersMap[dbPayload.assigned_to || user?.id || ''] || 'Vendedor',
                        created_at: new Date().toISOString()
                    };

                    const { data: saleResponse, error: saleError } = await supabase
                        .from('SITE_Sales')
                        .insert(saleData)
                        .select()
                        .single();

                    if (saleError) {
                        console.error("Error creating sale from edit modal:", saleError);
                        notificationRef.current?.createNotification('error', 'Erro na Venda', saleError.message);
                    } else {
                        console.log("✅ Sale created successfully from EditLeadModal");

                        // --- ALSO Create Transaction in SITE_Transactions for Cash Flow ---
                        const { error: transError } = await supabase.from('SITE_Transactions').insert({
                            description: `Venda CRM (Manual): ${dbPayload.name} - ${saleData.notes}`,
                            category: 'SALES',
                            type: 'Income',
                            amount: dbPayload.value,
                            payment_method: 'Manual',
                            attendant_id: dbPayload.assigned_to || user?.id,
                            attendant_name: usersMap[dbPayload.assigned_to || user?.id || ''] || 'Vendedor',
                            created_at: new Date().toISOString()
                        });

                        if (transError) console.error("Error creating transaction record:", transError);

                        notificationRef.current?.createNotification('success', 'Venda Registrada!', `Venda de R$ ${dbPayload.value.toLocaleString('pt-BR')} registrada no Financeiro.`);
                    }
                }
            } catch (e: any) {
                console.error("Failed to create sale record from edit:", e);
            }
        }

        notificationRef.current?.createNotification('success', 'Atualizado!', 'Lead atualizado com sucesso.');
        setEditingLead(null);
        setTagInput('');
        fetchData();
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
    const filteredLeads = useMemo(() => {
        return leads.filter(l => {
            const d = new Date(l.createdAt);

            // 1. Time Filters (Restrictive)
            if (filterType === 'Period') {
                if (filterPeriod !== 9999) { // 9999 is "Tudo"
                    const now = new Date();
                    const diffTime = Math.abs(now.getTime() - d.getTime());
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    if (diffDays > filterPeriod) return false;
                }
            } else if (filterType === 'Month') {
                if (!l.createdAt.startsWith(selectedMonth)) return false;
            } else if (filterType === 'Custom') {
                if (customRange.start && d < new Date(customRange.start)) return false;
                if (customRange.end && d > new Date(new Date(customRange.end).setHours(23, 59, 59, 999))) return false;
            }

            // 2. Source/Context Filter
            if (contextFilter && contextFilter !== 'All') {
                const ctx = String(l.contextId || '').toLowerCase();
                const filter = contextFilter.toLowerCase();
                if (!ctx.includes(filter)) return false;
            }

            // 3. User Filter
            if (selectedUserFilter && selectedUserFilter !== 'All') {
                if (String(l.assignedTo) !== String(selectedUserFilter)) return false;
            }

            // 4. Search Filter
            if (searchQuery) {
                const q = searchQuery.toLowerCase().trim();
                const name = String(l.name || '').toLowerCase();
                const email = String(l.email || '').toLowerCase();
                const phone = String(l.phone || '').toLowerCase();
                if (!name.includes(q) && !email.includes(q) && !phone.includes(q)) return false;
            }

            return true;
        });
    }, [leads, filterType, filterPeriod, selectedMonth, customRange, contextFilter, selectedUserFilter, searchQuery]);

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
                <div className="flex flex-col xl:flex-row justify-between xl:items-center gap-4 mb-4 bg-white dark:bg-[#1A1A1A] p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">

                    {/* Left: Search & Context */}
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-3 text-gray-400" />
                            <input
                                className="pl-9 pr-4 py-2 bg-gray-50 dark:bg-[#222] border border-gray-200 dark:border-gray-700 dark:text-white rounded-lg text-xs font-bold w-64 focus:bg-white dark:focus:bg-[#111] focus:border-wtech-gold outline-none transition-all"
                                placeholder="Buscar por nome, email, telefone..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <div className="relative group">
                            <div className="flex items-center gap-2 bg-gray-50 dark:bg-[#222] border border-gray-200 dark:border-gray-700 px-3 py-2 rounded-lg cursor-pointer hover:bg-white dark:hover:bg-[#111] transition-colors">
                                <Filter size={14} className="text-gray-400" />
                                <span className="text-xs font-bold text-gray-600 dark:text-gray-300 truncate max-w-[150px]">
                                    {contextFilter === 'All' ? 'Todas as Origens' : contextFilter}
                                </span>
                            </div>
                            {/* Dropdown */}
                            <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-[#1A1A1A] shadow-xl rounded-xl border border-gray-100 dark:border-gray-700 p-2 hidden group-hover:block z-50 max-h-64 overflow-y-auto custom-scrollbar">
                                <button onClick={() => setContextFilter('All')} className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg text-xs font-bold text-gray-700 dark:text-gray-200">Todas as Origens</button>
                                {uniqueContexts.map((ctx: any) => (
                                    <button key={ctx} onClick={() => setContextFilter(ctx)} className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg text-xs text-gray-600 dark:text-gray-400 truncate">{ctx}</button>
                                ))}
                            </div>
                        </div>


                        {/* User Filter (Admin/Manager Only) */}
                        {(hasPermission('crm_view_all') || hasPermission('crm_view_team') || user?.role === 'Super Admin') && (
                            <div className="relative group">
                                <div className="flex items-center gap-2 bg-gray-50 dark:bg-[#222] border border-gray-200 dark:border-gray-700 px-3 py-2 rounded-lg cursor-pointer hover:bg-white dark:hover:bg-[#111] transition-colors">
                                    <Users size={14} className="text-gray-400" />
                                    <span className="text-xs font-bold text-gray-600 dark:text-gray-300 truncate max-w-[150px]">
                                        {selectedUserFilter === 'All' ? 'Todos os Usuários' : (usersMap[selectedUserFilter] || 'Usuário')}
                                    </span>
                                </div>
                                <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-[#1A1A1A] shadow-xl rounded-xl border border-gray-100 dark:border-gray-700 p-2 hidden group-hover:block z-50 max-h-64 overflow-y-auto custom-scrollbar">
                                    <button onClick={() => setSelectedUserFilter('All')} className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg text-xs font-bold text-gray-700 dark:text-gray-200">Todos</button>
                                    {usersList.map((u) => (
                                        <button key={u.id} onClick={() => setSelectedUserFilter(u.id)} className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg text-xs text-gray-600 dark:text-gray-400 truncate">
                                            {u.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right: Date Filters & Actions */}
                    <div className="flex flex-wrap items-center gap-4">

                        {/* Date Filter Compact */}
                        <div className="flex bg-gray-100 dark:bg-[#111] p-1 rounded-lg border border-transparent dark:border-gray-800">
                            {[7, 30, 9999].map(days => (
                                <button
                                    key={days}
                                    onClick={() => { setFilterPeriod(days); setFilterType('Period'); }}
                                    className={`px-3 py-1.5 text-[10px] font-bold uppercase rounded-md transition-all ${filterType === 'Period' && filterPeriod === days ? 'bg-white dark:bg-[#222] shadow text-black dark:text-white' : 'text-gray-500 hover:text-black dark:hover:text-gray-200'}`}
                                >
                                    {days === 9999 ? 'Tudo' : `${days}d`}
                                </button>
                            ))}
                        </div>

                        {/* Distribution Switch - Permission Gated */}
                        {hasPermission('crm_config_dist') && (
                            <div className="flex items-center gap-3 pl-4 border-l border-gray-200 dark:border-gray-800">
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
                        <div className="flex bg-gray-100 dark:bg-[#111] p-1 rounded-lg border border-transparent dark:border-gray-800">
                            <button
                                onClick={() => setViewMode('kanban')}
                                className={`p-2 rounded-md transition-all ${viewMode === 'kanban' ? 'bg-white dark:bg-[#222] shadow text-black dark:text-white' : 'text-gray-400 hover:text-black dark:hover:text-gray-200'}`}
                                title="Visualização Kanban"
                            >
                                <KanbanSquare size={16} />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white dark:bg-[#222] shadow text-black dark:text-white' : 'text-gray-400 hover:text-black dark:hover:text-gray-200'}`}
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
                                                                {usersMap[lead.assignedTo] ? usersMap[lead.assignedTo].split(' ')[0] : 'Usuário ' + lead.assignedTo.substr(0, 4)}
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


            <AnimatePresence>
                {isCreateModalOpen && (
                    <NewLeadModal 
                        isOpen={isCreateModalOpen} 
                        onClose={() => setIsCreateModalOpen(false)} 
                        onSave={handleCreateLead} 
                    />
                )}
                {editingLead && (
                    <EditLeadModal
                        lead={editingLead}
                        isOpen={!!editingLead}
                        onClose={() => setEditingLead(null)}
                        onSave={saveLeadUpdates}
                        onDelete={deleteLead}
                        users={usersList}
                    />
                )}
                {/* Conversion Modal */}
                {conversionModal.isOpen && (
                     <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white dark:bg-[#1A1A1A] p-6 rounded-2xl w-full max-w-md shadow-2xl space-y-4">
                            <h3 className="text-xl font-bold dark:text-white">Confirmar Conversão</h3>
                            <p className="text-sm text-gray-500">O lead <b>{conversionModal.lead?.name}</b> será marcado como <b>{conversionModal.targetStatus}</b>.</p>
                            
                            <div className="bg-gray-50 dark:bg-[#222] p-4 rounded-xl space-y-3">
                                <label className="text-xs font-bold uppercase text-gray-500">Tipo de Venda</label>
                                <div className="flex gap-2">
                                    <button onClick={() => setConversionType('Course')} className={`flex-1 py-2 rounded-lg text-sm font-bold border ${conversionType === 'Course' ? 'bg-white border-wtech-gold shadow' : 'border-transparent hover:bg-white/50'}`}>Curso/Evento</button>
                                    <button onClick={() => setConversionType('Product')} className={`flex-1 py-2 rounded-lg text-sm font-bold border ${conversionType === 'Product' ? 'bg-white border-wtech-gold shadow' : 'border-transparent hover:bg-white/50'}`}>Produto/Serviço</button>
                                </div>

                                {conversionType === 'Course' ? (
                                    <select className="w-full p-2 rounded-lg border border-gray-200" value={selectedCourseId} onChange={e => setSelectedCourseId(e.target.value)}>
                                        <option value="">Selecione o Curso...</option>
                                        {activeCourses.map(c => <option key={c.id} value={c.id}>{c.title} ({new Date(c.date).toLocaleDateString()})</option>)}
                                    </select>
                                ) : (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Produto / Serviço</label>
                                            <select 
                                                className="w-full p-2.5 bg-gray-100 dark:bg-[#333] rounded-xl border-none text-sm font-bold dark:text-white mt-1"
                                                value={selectedProductId}
                                                onChange={e => {
                                                    const prod = catalogProducts.find(p => p.id === e.target.value);
                                                    setSelectedProductId(e.target.value);
                                                    if (prod) setSaleValue(prod.price.toString());
                                                }}
                                            >
                                                <option value="">Personalizado / Outros</option>
                                                {catalogProducts.map(p => (
                                                    <option key={p.id} value={p.id}>{p.title} - R$ {p.price}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="flex gap-2">
                                            <div className="flex-1">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Valor Total (R$)</label>
                                                <input 
                                                    placeholder="0.00" 
                                                    className="w-full p-2.5 bg-gray-100 dark:bg-[#333] rounded-xl border-none text-sm font-bold dark:text-white mt-1" 
                                                    value={saleValue} 
                                                    onChange={e => setSaleValue(e.target.value)} 
                                                />
                                            </div>
                                            <div className="w-24">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Qtd.</label>
                                                <input 
                                                    type="number" 
                                                    className="w-full p-2.5 bg-gray-100 dark:bg-[#333] rounded-xl border-none text-sm font-bold dark:text-white mt-1 text-center" 
                                                    value={orderQuantity} 
                                                    onChange={e => setOrderQuantity(Number(e.target.value))} 
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Forma de Pagamento</label>
                                            <div className="grid grid-cols-2 gap-2 mt-1">
                                                {['Manual', 'Pix', 'Crédito', 'Boleto', 'Asaas', 'Stripe'].map(method => (
                                                    <button 
                                                        key={method}
                                                        onClick={() => setPaymentMethod(method as any)}
                                                        className={`py-2 text-[10px] font-black rounded-lg border uppercase ${paymentMethod === method ? 'bg-wtech-gold text-black border-wtech-gold' : 'border-gray-200 dark:border-gray-700 text-gray-500'}`}
                                                    >
                                                        {method}
                                                    </button>
                                                ))}
                                            </div>
                                            {paymentMethod === 'Manual' && (
                                                <input 
                                                    placeholder="Detalhes (Ex: Dinheiro, Cheque...)" 
                                                    className="w-full p-2 rounded-lg border border-gray-200 text-xs mt-2" 
                                                    value={manualDetails} 
                                                    onChange={e => setManualDetails(e.target.value)} 
                                                />
                                            )}
                                        </div>

                                        {!selectedProductId && (
                                            <div>
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Obs/Resumo do Pedido</label>
                                                <input 
                                                    placeholder="Ex: Peças X, Y..." 
                                                    className="w-full p-2.5 bg-gray-100 dark:bg-[#333] rounded-xl border-none text-sm font-bold dark:text-white mt-1" 
                                                    value={productSummary} 
                                                    onChange={e => setProductSummary(e.target.value)} 
                                                />
                                            </div>
                                        )}

                                        <label className="flex items-center gap-2 text-[10px] font-bold text-gray-500 mt-2">
                                            <input type="checkbox" checked={generatePaymentLink} onChange={e => setGeneratePaymentLink(e.target.checked)} />
                                            Gerar Link de Pagamento no Sistema
                                        </label>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-2 pt-2">
                                <button onClick={() => setConversionModal({ ...conversionModal, isOpen: false })} className="flex-1 py-3 font-bold text-gray-500 hover:bg-gray-100 rounded-xl">Cancelar</button>
                                <button onClick={handleConfirmConversion} className="flex-1 py-3 font-bold bg-green-500 text-white rounded-xl hover:bg-green-600 shadow-lg shadow-green-500/20">Confirmar</button>
                            </div>
                        </motion.div>
                    </div>
                )}
                
                {/* Lost Reason Modal */}
                {lostReasonModal.isOpen && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white dark:bg-[#1A1A1A] p-6 rounded-2xl w-full max-w-sm shadow-2xl space-y-4">
                            <h3 className="text-lg font-bold text-red-600">Motivo da Perda</h3>
                            <textarea
                                autoFocus
                                className="w-full p-3 bg-gray-50 dark:bg-[#222] rounded-lg border border-gray-200 dark:border-gray-700 h-24 text-sm"
                                placeholder="Por que o lead foi perdido?"
                                value={lostReason}
                                onChange={e => setLostReason(e.target.value)}
                            />
                            <div className="flex gap-2">
                                <button onClick={() => setLostReasonModal({ ...lostReasonModal, isOpen: false })} className="flex-1 py-2 font-bold text-gray-500">Voltar</button>
                                <button onClick={handleConfirmLost} className="flex-1 py-2 font-bold bg-red-500 text-white rounded-lg">Confirmar</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            
            {/* Lead Task Sidebar */}
            {selectedLeadForTasks && (
                <LeadTaskSidebar
                    lead={selectedLeadForTasks}
                    isOpen={!!selectedLeadForTasks}
                    onClose={() => setSelectedLeadForTasks(null)}
                    onTaskCreated={(task: any) => {
                        notificationRef.current?.createNotification('success', 'Agendado!', `Tarefa "${task.title}" criada.`);
                    }}
                />
            )}
            <SplashedPushNotifications ref={notificationRef} />

        </DragContext.Provider>
    );
};

// Need to update EditLeadModal and NewLeadModal to include 'value' input field.

const NewLeadModal = ({ isOpen, onClose, onSave }: any) => {
    const [form, setForm] = useState({ name: '', phone: '', email: '', value: 0 }); // Added value

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white dark:bg-[#1A1A1A] p-6 rounded-2xl w-full max-w-md shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold dark:text-white">Novo Lead</h3>
                    <button onClick={onClose}><X className="dark:text-white" /></button>
                </div>
                <div className="space-y-4">
                    <input autoFocus placeholder="Nome Completo" className="w-full p-3 bg-gray-100 dark:bg-[#333] rounded-lg dark:text-white" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                    <input placeholder="Telefone" className="w-full p-3 bg-gray-100 dark:bg-[#333] rounded-lg dark:text-white" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
                    <input placeholder="Email (Opcional)" className="w-full p-3 bg-gray-100 dark:bg-[#333] rounded-lg dark:text-white" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
                    
                    {/* Value Input */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Valor Potencial (R$)</label>
                        <input 
                            type="number" 
                            placeholder="0,00" 
                            className="w-full p-3 bg-gray-100 dark:bg-[#333] rounded-lg dark:text-white font-mono" 
                            value={form.value} 
                            onChange={e => setForm({...form, value: Number(e.target.value)})} 
                        />
                    </div>
                </div>
                <button onClick={() => onSave(form)} className="w-full bg-wtech-gold text-black font-bold py-3 rounded-xl mt-6">
                    Criar Lead
                </button>
            </motion.div>
        </div>
    );
};

const EditLeadModal = ({ lead, isOpen, onClose, onSave, onDelete, users }: any) => {
    const [form, setForm] = useState({ ...lead });
    // Tags Local State for Modal
    const [tagInput, setTagInput] = useState('');

    const generateCode = (name: string) => {
        const first = name.substring(0, 3).toUpperCase();
        const nums = Math.floor(Math.random() * 90 + 10);
        const letters = Array(3).fill(0).map(() => String.fromCharCode(65 + Math.floor(Math.random() * 26))).join('');
        return `${first}-${nums}${letters}`;
    };

    const handleCopyLink = () => {
        const url = `${window.location.origin}/#/meus-pedidos?code=${form.client_code || lead.client_code}`;
        navigator.clipboard.writeText(url);
        alert('Link copiado! Envie para o cliente: ' + url);
    };

    const handleRegenerateCode = () => {
        const newCode = generateCode(form.name || 'CLIENTE');
        setForm(prev => ({ ...prev, client_code: newCode }));
    };


    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-white dark:bg-[#1A1A1A] rounded-2xl w-full max-w-2xl shadow-2xl h-[80vh] flex flex-col">
                <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-black dark:text-white">{form.name}</h3>
                        <p className="text-sm text-gray-500">Editando informações do lead.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => {
                                if (window.confirm('Tem certeza que deseja excluir este lead?')) {
                                    onDelete();
                                }
                            }}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors rounded-lg"
                            title="Excluir Lead"
                        >
                            <Trash2 size={20} />
                        </button>
                        <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"><X size={24} className="dark:text-white" /></button>
                    </div>
                </div>
                
                <div className="p-6 overflow-y-auto flex-1 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                             <label className="text-xs font-bold text-gray-500 uppercase">Status</label>
                             <select 
                                className="w-full p-3 bg-gray-50 dark:bg-[#333] rounded-lg mt-1 dark:text-white font-bold"
                                value={form.status}
                                onChange={e => setForm({...form, status: e.target.value})}
                             >
                                <option value="New">Novo</option>
                                <option value="Contacted">Contactado</option>
                                <option value="Qualified">Qualificado</option>
                                <option value="Negotiating">Em Negociação</option>
                                <option value="Converted">Ganhos / Pagar</option>
                                <option value="Matriculated">Matriculado</option>
                                <option value="Cold">Frio / Espera</option>
                                <option value="Rejected">Perdido</option>
                             </select>
                        </div>
                        
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase">Telefone</label>
                            <input className="w-full p-3 bg-gray-50 dark:bg-[#333] rounded-lg mt-1 dark:text-white" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase">Email</label>
                            <input className="w-full p-3 bg-gray-50 dark:bg-[#333] rounded-lg mt-1 dark:text-white" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
                        </div>

                        {/* Client Portal Access Link */}
                        <div className="col-span-2 bg-wtech-black/5 dark:bg-white/5 p-4 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h4 className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Código de Acesso</h4>
                                    <p className="text-[10px] text-gray-400 mt-1">Acesso ao portal (Meus Pedidos).</p>
                                </div>
                                <div className="text-right flex items-center gap-2">
                                    <p className={`text-lg font-black font-mono tracking-wider ${form.client_code ? 'text-wtech-gold' : 'text-gray-400 italic text-sm'}`}>
                                        {form.client_code || 'Não definido'}
                                    </p>
                                    <div className="flex gap-1">
                                        <button 
                                            onClick={handleRegenerateCode}
                                            className="bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400 px-2 py-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-white/20 transition-colors flex items-center gap-2"
                                            title="Gerar Novo Código"
                                        >
                                            <RefreshCw size={14} className={!form.client_code ? 'animate-pulse text-blue-500' : ''} />
                                            {!form.client_code && <span className="text-[10px] font-bold">GERAR</span>}
                                        </button>
                                        {form.client_code && (
                                            <button 
                                                onClick={handleCopyLink}
                                                className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors flex items-center gap-1"
                                                title="Copiar Link de Acesso"
                                            >
                                                <Share2 size={14} /> Link
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>


                        <div className="col-span-2 bg-green-50 dark:bg-green-900/20 p-4 rounded-xl border border-green-100 dark:border-green-900/50">
                             <label className="text-xs font-black text-green-700 dark:text-green-400 uppercase flex items-center gap-2">
                                <Banknote size={14}/> Valor da Venda (R$)
                             </label>
                             <input 
                                type="number"
                                className="w-full p-3 bg-white dark:bg-[#222] rounded-lg mt-1 dark:text-white font-mono text-lg font-bold" 
                                value={form.value} 
                                onChange={e => setForm({...form, value: Number(e.target.value)})} 
                             />
                             <p className="text-[10px] text-green-600 mt-1">
                                * Ao mover para "Ganho" ou "Matriculado", este valor será lançado automaticamente no Fluxo de Caixa.
                             </p>
                        </div>

                        <div className="col-span-2">
                            <label className="text-xs font-bold text-gray-500 uppercase">Responsável</label>
                            <select 
                                className="w-full p-3 bg-gray-50 dark:bg-[#333] rounded-lg mt-1 dark:text-white"
                                value={form.assigned_to || ''}
                                onChange={e => setForm({...form, assigned_to: e.target.value || null})}
                            >
                                <option value="">Sem dono</option>
                                {users.map((u: any) => (
                                    <option key={u.id} value={u.id}>{u.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Notas Internas</label>
                            <textarea
                                className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:border-wtech-gold focus:ring-1 focus:ring-wtech-gold outline-none min-h-[100px]"
                                placeholder="Observações sobre o lead..."
                                value={form.internalNotes || ''}
                                onChange={e => setForm({ ...form, internalNotes: e.target.value })}
                            />
                        </div>

                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tags</label>
                            <div className="flex flex-wrap gap-2 mb-2">
                                {form.tags?.map((tag: string, idx: number) => (
                                    <span key={idx} className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full flex items-center gap-1 border border-gray-200">
                                        {tag}
                                        <button onClick={() => setForm({...form, tags: form.tags.filter((_:any, i:any) => i !== idx)})} className="hover:text-red-500"><X size={12} /></button>
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
                                                setForm({...form, tags: [...(form.tags || []), tagInput.trim()]});
                                                setTagInput('');
                                            }
                                        }
                                    }}
                                />
                                <button
                                    onClick={() => {
                                        if (tagInput.trim()) {
                                            setForm({...form, tags: [...(form.tags || []), tagInput.trim()]});
                                            setTagInput('');
                                        }
                                    }}
                                    className="px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                                >
                                    <Plus size={16}/>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#111] flex justify-end gap-3 rounded-b-2xl">
                     <button onClick={onClose} className="px-6 py-3 font-bold text-gray-500 hover:text-gray-700 dark:text-gray-400">Cancelar</button>
                     <button onClick={() => onSave(form)} className="px-8 py-3 bg-wtech-black text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center gap-2">
                        <Save size={18} /> Salvar Alterações
                     </button>
                </div>
            </motion.div>
        </div>
    );
};


export default CRMView;
