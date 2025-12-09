
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    Users, User, BookOpen, DollarSign, LayoutDashboard,
    KanbanSquare, FileText, Settings, Bell, Search,
    MoreVertical, ArrowRight, TrendingUp, Calendar as CalendarIcon,
    Layout, MapPin, Phone, Globe, Mail, Clock, Shield, Award, CheckCircle, XCircle, Filter,
    ChevronLeft, ChevronRight, Download, Upload, Plus, Trash2, Edit, Save, X, Menu,
    BarChart3, Briefcase, TrendingDown, ShoppingBag, Send, Wand2, List, Grid, Building,
    Image as ImageIcon, Loader2, Eye, MessageSquare, PenTool, Lock, Code, MessageCircle,
    Monitor, Printer, Copy, UserPlus, CalendarClock, Wrench, GraduationCap, Sparkles, ArrowUpRight, LogOut
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserRole } from '../types';
import type { Lead, Mechanic, Order, User as UserType, Transaction, Course, BlogPost, PostComment, LandingPage, Enrollment, Role, SystemConfig, Event } from '../types';
import { supabase } from '../lib/supabaseClient';
import { seedDatabase } from '../lib/seedData';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { generateBlogPost } from '../lib/gemini';
import { LandingPageEditor } from './LandingPageEditor';
import { useSettings } from '../context/SettingsContext';
import EmailMarketingView from '../components/EmailMarketingView';

// --- Types for Local State ---
declare const L: any;

const MapPreview = ({ lat, lng }: { lat: number, lng: number }) => {
    const mapRef = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (containerRef.current && !mapRef.current) {
            mapRef.current = L.map(containerRef.current).setView([lat, lng], 15);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapRef.current);
            L.marker([lat, lng]).addTo(mapRef.current);
        } else if (mapRef.current) {
            mapRef.current.setView([lat, lng], 15);
            // Clear existing markers
            mapRef.current.eachLayer((layer: any) => {
                if (layer instanceof L.Marker) {
                    mapRef.current.removeLayer(layer);
                }
            });
            L.marker([lat, lng]).addTo(mapRef.current);
        }
    }, [lat, lng]);

    return <div ref={containerRef} className="w-full h-48 rounded-lg border border-gray-300 mt-2" />;
};

type View = 'dashboard' | 'crm' | 'ai_generator' | 'blog_manager' | 'settings' | 'students' | 'mechanics' | 'finance' | 'orders' | 'team' | 'courses_manager' | 'lp_builder' | 'email_marketing';

const SidebarItem = ({
    icon: Icon,
    label,
    active,
    onClick
}: {
    icon: any,
    label: string,
    active: boolean,
    onClick: () => void
}) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center p-3 my-1 rounded-lg transition-all duration-200 group ${active
            ? 'bg-gradient-to-r from-wtech-gold to-yellow-600 text-black font-bold shadow-lg shadow-yellow-500/20'
            : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }`}
    >
        <Icon size={20} className={`${active ? 'text-black' : 'text-gray-500 group-hover:text-wtech-gold'} mr-3`} />
        <span className="text-sm tracking-wide">{label}</span>
    </button>
);

const RevenueChart = () => {
    const data = [10, 25, 18, 40, 35, 60, 55, 80, 75, 100];
    const max = 100;
    const points = data.map((d, i) => `${i * 100},${100 - (d / max) * 100}`).join(' ');

    return (
        <div className="w-full h-full relative overflow-hidden">
            <svg viewBox="0 0 900 100" className="w-full h-full preserve-3d">
                <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.5" />
                        <stop offset="100%" stopColor="#D4AF37" stopOpacity="0" />
                    </linearGradient>
                </defs>
                <path d={`M0,100 ${points} L900,100 Z`} fill="url(#gradient)" />
                <polyline points={points} fill="none" stroke="#D4AF37" strokeWidth="3" />
                {data.map((d, i) => (
                    <circle key={i} cx={i * 100} cy={100 - (d / max) * 100} r="4" fill="#111" stroke="#D4AF37" strokeWidth="2" />
                ))}
            </svg>
        </div>
    );
};

// --- View: Dashboard (Command Center) ---
const DashboardView = () => {
    const [stats, setStats] = useState({
        revenue: 0,
        futureRevenue: 0,
        leads: 0,
        students: 0,
        activeCourses: 0
    });
    const [revenueHistory, setRevenueHistory] = useState<{ date: string, value: number }[]>([]);
    const [leadsHistory, setLeadsHistory] = useState<{ date: string, value: number }[]>([]);
    const [mechanicsByState, setMechanicsByState] = useState<{ state: string, count: number }[]>([]);
    const [filterPeriod, setFilterPeriod] = useState('YYYY');

    useEffect(() => {
        async function fetchData() {
            // Date Filter Logic
            const now = new Date();
            let startDate = new Date(0).toISOString(); // Default All Time

            if (filterPeriod === '30d') {
                const d = new Date();
                d.setDate(d.getDate() - 30);
                startDate = d.toISOString();
            } else if (filterPeriod === '90d') {
                const d = new Date();
                d.setDate(d.getDate() - 90);
                startDate = d.toISOString();
            } else if (filterPeriod === 'YYYY') {
                startDate = new Date(now.getFullYear(), 0, 1).toISOString();
            }

            // 1. Leads
            const { count: leadsCount } = await supabase
                .from('SITE_Leads')
                .select('*', { count: 'exact', head: true })
                .gte('created_at', startDate);

            // 2. Enrollments & Revenue
            const { data: enrollments } = await supabase
                .from('SITE_Enrollments')
                .select('*, course:SITE_Courses(price)')
                .gte('created_at', startDate);

            let realized = 0;
            let future = 0;
            let studentsCount = 0;

            if (enrollments) {
                studentsCount = enrollments.length;
                enrollments.forEach((e: any) => {
                    const paid = e.amount_paid || 0;
                    const price = e.course?.price || 0;
                    realized += paid;
                    future += (price - paid);
                });
            }

            // 3. Active Courses (Not filtered by date usually, but could be)
            const { count: coursesCount } = await supabase.from('SITE_Courses').select('*', { count: 'exact', head: true });

            // 4. Mechanics by State (Mock or Real)
            // For now, let's assume we have state data or fetch it.
            const { data: mechanics } = await supabase.from('SITE_Mechanics').select('state');
            const stateMap: Record<string, number> = {};
            mechanics?.forEach((m: any) => {
                const s = m.state || 'SP'; // Default to SP if missing
                stateMap[s] = (stateMap[s] || 0) + 1;
            });
            const stateData = Object.entries(stateMap).map(([k, v]) => ({ state: k, count: v })).sort((a, b) => b.count - a.count).slice(0, 5);

            setStats({
                revenue: realized,
                futureRevenue: future,
                leads: leadsCount || 0,
                students: studentsCount,
                activeCourses: coursesCount || 0
            });
            setMechanicsByState(stateData);

            // Mock Revenue History for Chart (since we don't have historical sequence easy yet)
            // In real prod, group transactions by date.
            setMechanicsByState(stateData);

            // Mock Revenue History for Chart
            setRevenueHistory([
                { date: 'Jan', value: realized * 0.1 },
                { date: 'Fev', value: realized * 0.15 },
                { date: 'Mar', value: realized * 0.2 },
                { date: 'Abr', value: realized * 0.3 },
                { date: 'Mai', value: realized * 0.6 },
                { date: 'Jun', value: realized } // Current
            ]);

            // Leads History (Mock for now, normally grouped by created_at)
            setLeadsHistory([
                { date: 'Jan', value: Math.floor(leadsCount * 0.1) },
                { date: 'Fev', value: Math.floor(leadsCount * 0.15) },
                { date: 'Mar', value: Math.floor(leadsCount * 0.2) },
                { date: 'Abr', value: Math.floor(leadsCount * 0.25) },
                { date: 'Mai', value: Math.floor(leadsCount * 0.4) },
                { date: 'Jun', value: leadsCount || 0 }
            ]);
        }
        fetchData();
    }, [filterPeriod]); // Re-fetch when filter changes (logic to filter leads/revenue would go inside fetch)

    // Calculate Conversion Rate
    const conversionRate = stats.leads > 0 ? ((stats.students / stats.leads) * 100).toFixed(1) : '0.0';

    // Custom SVG Area Chart
    const AreaChart = ({ data, color = "#d4af37" }: any) => {
        if (!data.length) return null;
        const height = 200;
        const width = 600;
        const max = Math.max(...data.map((d: any) => d.value));
        const points = data.map((d: any, i: number) => {
            const x = (i / (data.length - 1)) * width;
            const y = height - ((d.value / max) * height);
            return `${x},${y}`;
        }).join(' ');

        return (
            <div className="w-full h-full overflow-hidden relative">
                <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="w-full h-full overflow-hidden">
                    <defs>
                        <linearGradient id={`${color}-gradient`} x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor={color} stopOpacity="0.2" />
                            <stop offset="100%" stopColor={color} stopOpacity="0" />
                        </linearGradient>
                    </defs>
                    <path d={`M0,${height} ${points} ${width},${height}`} fill={`url(#${color}-gradient)`} />
                    <polyline fill="none" stroke={color} strokeWidth="3" points={points} />
                    {data.map((d: any, i: number) => (
                        <circle key={i} cx={(i / (data.length - 1)) * width} cy={height - ((d.value / max) * height)} r="4" fill="white" stroke={color} strokeWidth="2" />
                    ))}
                </svg>
                <div className="flex justify-between mt-2 text-xs text-gray-400 font-bold uppercase">
                    {data.map((d: any) => <span key={d.date}>{d.date}</span>)}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6 animate-fade-in text-gray-900 pb-10">
            {/* Filter Header */}
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-800">Visão Geral</h2>
                <select
                    value={filterPeriod}
                    onChange={(e) => setFilterPeriod(e.target.value)}
                    className="border border-gray-300 rounded-lg p-2 text-sm font-bold text-gray-600 bg-white"
                >
                    <option value="YYYY">Ano Atual</option>
                    <option value="30d">Últimos 30 dias</option>
                    <option value="90d">Últimos 3 Meses</option>
                </select>
            </div>
            {/* KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'Receita Realizada', value: `R$ ${stats.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, sub: 'Total recebido', icon: DollarSign, color: 'text-green-600 bg-green-50' },
                    { label: 'Receita Futura', value: `R$ ${stats.futureRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, sub: 'A receber de alunos', icon: TrendingUp, color: 'text-blue-600 bg-blue-50' },
                    { label: 'Total de Leads', value: stats.leads, sub: 'Potenciais clientes', icon: Users, color: 'text-wtech-gold bg-yellow-50' },
                    { label: 'Alunos Matriculados', value: stats.students, sub: `${stats.activeCourses} Cursos ativos`, icon: ShoppingBag, color: 'text-purple-600 bg-purple-50' },
                ].map((kpi, idx) => (
                    <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-start justify-between hover:shadow-md transition-all">
                        <div>
                            <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">{kpi.label}</p>
                            <h3 className="text-2xl font-black text-gray-900">{kpi.value}</h3>
                            <span className="text-xs text-gray-400 mt-1 block">{kpi.sub}</span>
                        </div>
                        <div className={`p-3 rounded-xl ${kpi.color}`}>
                            <kpi.icon size={24} />
                        </div>
                    </div>
                ))}
            </div>

            {/* Charts Section */}
            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Main Revenue Chart (Small) */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">Receita Recente</h3>
                            <p className="text-gray-500 text-xs">Tendência de faturamento.</p>
                        </div>
                        <div className="flex items-center gap-2 text-green-600 font-bold bg-green-50 px-3 py-1 rounded-full text-xs">
                            <TrendingUp size={14} /> +32%
                        </div>
                    </div>
                    <div className="h-48 flex items-end">
                        <AreaChart data={revenueHistory} color="#d4af37" />
                    </div>
                </div>

                {/* Leads & Conversion Chart */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">Leads e Conversão</h3>
                            <p className="text-gray-500 text-xs">Desempenho de captação de alunos.</p>
                        </div>
                        <div className="flex items-center gap-2 text-purple-600 font-bold bg-purple-50 px-3 py-1 rounded-full text-xs">
                            Taxa: {conversionRate}%
                        </div>
                    </div>
                    <div className="h-48 flex items-end">
                        <AreaChart data={leadsHistory} color="#9333ea" />
                    </div>
                </div>
            </div>

            {/* Network Growth / Large Chart */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h2 className="text-2xl font-black text-gray-900 tracking-tight">Rede Credenciada</h2>
                        <p className="text-sm text-gray-500">Gerencie oficinas e parceiros credenciados.</p>
                    </div>
                    <div className="flex flex-wrap gap-2 w-full md:w-auto">
                        <span className="flex items-center gap-1 text-xs font-bold text-gray-500"><div className="w-2 h-2 rounded-full bg-wtech-gold"></div>Receita Global</span>
                    </div>
                </div>
                <div className="h-64 flex items-end">
                    {/* Using revenue history here again as placeholder for mechanics growth or total revenue */}
                    <AreaChart data={revenueHistory} color="#d4af37" />
                </div>
            </div>

            {/* Mechanics Distribution */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                <h2 className="text-lg font-bold text-gray-900 mb-2">Credenciados por Região</h2>
                <p className="text-sm text-gray-500 mb-6">Top 5 Estados com mais oficinas</p>

                <div className="space-y-4">
                    {mechanicsByState.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-3">
                            <span className="w-8 text-xs font-bold text-gray-400">#{idx + 1}</span>
                            <div className="flex-grow">
                                <div className="flex justify-between text-sm font-bold mb-1">
                                    <span>{item.state}</span>
                                    <span className="text-gray-500">{item.count}</span>
                                </div>
                                <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-wtech-black" style={{ width: `${(item.count / (mechanicsByState[0]?.count || 1)) * 100}%` }}></div>
                                </div>
                            </div>
                        </div>
                    ))}
                    {mechanicsByState.length === 0 && <p className="text-sm text-gray-400 italic">Sem dados de localização.</p>}
                </div>

                <button className="w-full mt-8 py-3 bg-gray-50 text-xs font-bold uppercase tracking-wider text-gray-500 hover:bg-gray-100 rounded-lg">Ver Relatório Completo</button>
            </div>
        </div>
    );
}

// --- View: CRM (Kanban) ---
// --- View: CRM (Kanban Enhanced) ---

// Helper for Drag & Drop
const DragContext = React.createContext<{
    draggedId: string | null;
    setDraggedId: (id: string | null) => void;
}>({ draggedId: null, setDraggedId: () => { } });

const KanbanColumn = ({ title, status, leads, onMove, onDropLead, onLeadClick }: any) => {
    const { draggedId } = React.useContext(DragContext);

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        if (draggedId) onDropLead(draggedId, status);
    };

    const handleDragOver = (e: React.DragEvent) => e.preventDefault();

    return (
        <div
            className={`flex-shrink-0 w-80 flex flex-col h-full rounded-2xl transition-colors ${draggedId ? 'bg-gray-100/50 border-2 border-dashed border-gray-300' : 'bg-gray-100 border border-gray-200'}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
        >
            {/* Header */}
            <div className={`p-4 rounded-t-2xl border-b border-gray-200 flex justify-between items-center ${status === 'New' ? 'bg-wtech-black text-white' : 'bg-white text-gray-800'}`}>
                <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${status === 'Converted' ? 'bg-green-500' : status === 'New' ? 'bg-wtech-gold' : 'bg-gray-400'}`}></div>
                    <h3 className="font-bold text-sm uppercase tracking-wider">{title}</h3>
                </div>
                <span className="bg-white/20 text-xs px-2 py-1 rounded-full font-bold min-w-[24px] text-center">
                    {leads.length}
                </span>
            </div>

            {/* Cards Container */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                {leads.map((lead: any) => (
                    <LeadCard key={lead.id} lead={lead} onClick={() => onLeadClick(lead)} />
                ))}
                {leads.length === 0 && (
                    <div className="text-center py-8 text-gray-400 text-sm italic">
                        Arraste leads para cá
                    </div>
                )}
            </div>
        </div>
    );
};

const LeadCard: React.FC<{ lead: any, onClick: () => void }> = ({ lead, onClick }) => {
    const { setDraggedId } = React.useContext(DragContext);
    const [isDragging, setIsDragging] = React.useState(false);

    return (
        <div
            draggable
            onDragStart={() => { setDraggedId(lead.id); setIsDragging(true); }}
            onDragEnd={() => { setDraggedId(null); setIsDragging(false); }}
            onClick={onClick}
            className={`bg-white p-4 rounded-xl shadow-sm border border-gray-100 cursor-pointer active:cursor-grabbing hover:shadow-md transition-all group relative ${isDragging ? 'opacity-50 scale-95' : ''}`}
        >
            <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{new Date(lead.createdAt).toLocaleDateString()}</span>
                {lead.contextId && (
                    <span className="bg-blue-50 text-blue-700 text-[10px] px-1.5 py-0.5 rounded font-bold max-w-[80px] truncate" title={lead.contextId}>
                        {lead.contextId.replace('LP EUROPA:', 'Europa').replace('landing_page_', 'LP ')}
                    </span>
                )}
            </div>

            {/* Tags Display */}
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
                    {lead.assignedTo ? <span className="flex items-center gap-1 bg-yellow-50 text-yellow-800 px-2 py-0.5 rounded-full"><Users size={10} /> Atribuído</span> : <span className="flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded-full"><Users size={10} /> Sem Dono</span>}
                </div>
                <button className="text-gray-400 hover:text-black transition-colors"><MoreVertical size={14} /></button>
            </div>
        </div>
    );
};

const CRMView = () => {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [draggedId, setDraggedId] = useState<string | null>(null);
    
    // CRM Filter State
    const [filterPeriod, setFilterPeriod] = useState(30); // Days
    const [filterType, setFilterType] = useState<'Period' | 'Month' | 'Custom'>('Period');
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [customRange, setCustomRange] = useState({ start: '', end: '' });

    const [distMode, setDistMode] = useState<'Manual' | 'Random'>('Manual');
    const [showSettings, setShowSettings] = useState(false);
    const [editingLead, setEditingLead] = useState<any | null>(null);
    const [editForm, setEditForm] = useState({ assignedTo: '', internalNotes: '', tags: [] as string[] });
    const [tagInput, setTagInput] = useState('');
    const { user } = useAuth();

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

    useEffect(() => {
        fetchData();
    }, [user]); // Re-fetch if user changes to apply privacy

    const fetchData = async () => {
        // Fetch Leads with Privacy Filter
        let query = supabase.from('SITE_Leads').select('*').order('created_at', { ascending: false });

        // Privacy Logic: If not Admin (Level > 8 or Super Admin), only see assigned leads
        // Checking explicitly for Level 10 as requested
        const hasFullAccess =
            (typeof user?.role !== 'string' && user?.role?.level >= 10) ||
            (typeof user?.role !== 'string' && user?.role?.name === 'Super Admin') ||
            (typeof user?.role !== 'string' && user?.role?.permissions?.admin_access);

        if (!hasFullAccess && user?.id) {
            query = query.eq('assigned_to', user.id);
        }

        const { data } = await query;

        if (data) {
            const mapped = data.map((l: any) => ({
                ...l,
                contextId: l.context_id,
                createdAt: l.created_at,
                assignedTo: l.assigned_to,
                internalNotes: l.internal_notes
            }));
            setLeads(mapped);
        }
    }

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

    // Fetch Settings & Leads
    useEffect(() => {
        const fetchData = async () => {
            // Fetch Settings
            const { data: settings } = await supabase.from('SITE_SystemSettings').select('value').eq('key', 'crm_distribution_mode').single();
            if (settings) setDistMode(settings.value);

            // Fetch Leads with Filters (Client-side filter for simplicity for now)
            const { data } = await supabase.from('SITE_Leads').select('*').order('created_at', { ascending: false });
            if (data) {
                const mapped = data.map((l: any) => ({
                    ...l,
                    contextId: l.context_id,
                    createdAt: l.created_at,
                    assignedTo: l.assigned_to,
                    internalNotes: l.internal_notes
                }));
                setLeads(mapped);
            }
        }
        fetchData();
    }, [filterPeriod]);

    // Update Distribution Mode
    const toggleDistMode = async (mode: 'Manual' | 'Random') => {
        setDistMode(mode);
        await supabase.from('SITE_SystemSettings').upsert({ key: 'crm_distribution_mode', value: mode }, { onConflict: 'key' });
    };

    // Drag & Drop Handler
    const onDropLead = async (leadId: string, newStatus: string) => {
        // Optimistic Update
        setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus as any } : l));

        // DB Update
        const { error } = await supabase.from('SITE_Leads').update({ status: newStatus }).eq('id', leadId);
        if (error) alert('Falha ao mover lead');
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
        return true;
    });

    return (
        <DragContext.Provider value={{ draggedId, setDraggedId }}>
            <div className="h-[calc(100vh-180px)] flex flex-col">
                {/* CRM Toolbar */}
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-4">
                        <div className="flex bg-gray-100 p-1 rounded-lg">
                            {[7, 30, 9999].map(days => (
                                <button
                                    key={days}
                                    onClick={() => { setFilterPeriod(days); setFilterType('Period'); }}
                                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${filterType === 'Period' && filterPeriod === days ? 'bg-white shadow text-black' : 'text-gray-500 hover:text-black'}`}
                                >
                                    {days === 9999 ? 'Todos' : `${days} dias`}
                                </button>
                            ))}
                        </div>
                        
                        {/* Month & Custom Selectors */}
                        <div className="flex items-center gap-2">
                            <input 
                                type="month" 
                                value={selectedMonth}
                                onChange={(e) => { setSelectedMonth(e.target.value); setFilterType('Month'); }}
                                className={`border rounded-lg px-2 py-1 text-xs font-bold ${filterType === 'Month' ? 'border-wtech-gold bg-white' : 'border-gray-200 bg-gray-50'}`}
                            />
                            
                            <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
                                <input 
                                    type="date" 
                                    className={`px-2 py-1 text-xs bg-transparent outline-none ${filterType === 'Custom' ? 'font-bold text-black' : 'text-gray-500'}`}
                                    value={customRange.start}
                                    onChange={(e) => { setCustomRange(p => ({...p, start: e.target.value})); setFilterType('Custom'); }}
                                />
                                <span className="text-gray-300 text-[10px] uppercase font-bold px-1">Até</span>
                                <input 
                                    type="date" 
                                    className={`px-2 py-1 text-xs bg-transparent outline-none ${filterType === 'Custom' ? 'font-bold text-black' : 'text-gray-500'}`}
                                    value={customRange.end}
                                    onChange={(e) => { setCustomRange(p => ({...p, end: e.target.value})); setFilterType('Custom'); }}
                                />
                            </div>
                        </div>
                            </div>
                        </div>

                        <div className="relative group">
                            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-xs font-bold uppercase hover:bg-gray-50">
                                <Settings size={14} /> Distribuição: <span className={distMode === 'Random' ? 'text-green-600' : 'text-orange-600'}>{distMode === 'Random' ? 'Aleatória' : 'Manual'}</span>
                            </button>
                            {/* Dropdown for Settings */}
                            <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-2xl border border-gray-100 p-4 hidden group-hover:block z-50">
                                <h5 className="font-bold text-sm mb-2">Modo de Distribuição</h5>
                                <p className="text-xs text-gray-400 mb-3 leading-tight">Como os novos leads devem ser atribuídos aos colaboradores?</p>
                                <div className="flex flex-col gap-2">
                                    <button onClick={() => toggleDistMode('Manual')} className={`flex items-center gap-3 p-3 rounded-lg border text-left ${distMode === 'Manual' ? 'border-wtech-gold bg-yellow-50' : 'border-gray-100 hover:bg-gray-50'}`}>
                                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${distMode === 'Manual' ? 'border-wtech-gold' : 'border-gray-300'}`}>
                                            {distMode === 'Manual' && <div className="w-2 h-2 rounded-full bg-wtech-gold"></div>}
                                        </div>
                                        <div>
                                            <span className="text-xs font-bold block">Manual</span>
                                            <span className="text-[10px] text-gray-500">Gestor define dono</span>
                                        </div>
                                    </button>
                                    <button onClick={() => toggleDistMode('Random')} className={`flex items-center gap-3 p-3 rounded-lg border text-left ${distMode === 'Random' ? 'border-wtech-gold bg-yellow-50' : 'border-gray-100 hover:bg-gray-50'}`}>
                                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${distMode === 'Random' ? 'border-wtech-gold' : 'border-gray-300'}`}>
                                            {distMode === 'Random' && <div className="w-2 h-2 rounded-full bg-wtech-gold"></div>}
                                        </div>
                                        <div className="flex-1">
                                            <span className="text-xs font-bold block">Aleatória (Roleta)</span>
                                            <span className="text-[10px] text-gray-500">Distribui entre time</span>
                                        </div>
                                    </button>
                                </div>
                            </div>
                        </div>
                        <button className="px-4 py-2 bg-wtech-black text-white rounded-lg font-bold text-xs uppercase flex items-center gap-2 hover:bg-gray-800">
                            <Plus size={14} /> Novo Lead
                        </button>
                    </div>
                </div>

                {/* Board */}
                <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar h-[calc(100vh-280px)]">
                    <KanbanColumn
                        title="Novos (Entrada)"
                        status="New"
                        leads={filteredLeads.filter(l => l.status === 'New')}
                        onMove={onDropLead}
                        onDropLead={onDropLead}
                        onLeadClick={handleLeadClick}
                    />
                    <KanbanColumn
                        title="Em Atendimento"
                        status="Contacted"
                        leads={filteredLeads.filter(l => l.status === 'Contacted')}
                        onMove={onDropLead}
                        onDropLead={onDropLead}
                        onLeadClick={handleLeadClick}
                    />
                    <KanbanColumn
                        title="Negociação"
                        status="Qualified"
                        leads={filteredLeads.filter(l => l.status === 'Qualified')}
                        onMove={onDropLead}
                        onDropLead={onDropLead}
                        onLeadClick={handleLeadClick}
                    />
                    <KanbanColumn
                        title="Fechado / Ganho"
                        status="Converted"
                        leads={filteredLeads.filter(l => l.status === 'Converted')}
                        onMove={onDropLead}
                        onDropLead={onDropLead}
                        onLeadClick={handleLeadClick}
                    />
                    <KanbanColumn
                        title="Esfriou / Perdido"
                        status="Cold"
                        leads={leads.filter(l => l.status === 'Cold')}
                        onMove={onDropLead}
                        onDropLead={onDropLead}
                        onLeadClick={handleLeadClick}
                    />
                </div>
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
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900">{editingLead.name}</h3>
                                    <p className="text-sm text-gray-500">{editingLead.email}</p>
                                </div>
                                <button onClick={() => setEditingLead(null)} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Colaborador Responsável</label>
                                    <div className="relative">
                                        <Users size={16} className="absolute left-3 top-3 text-gray-400" />
                                        <input
                                            className="w-full border border-gray-200 rounded-lg pl-10 pr-4 py-2.5 text-sm font-medium focus:border-wtech-gold focus:ring-1 focus:ring-wtech-gold outline-none"
                                            placeholder="Nome do colaborador..."
                                            value={editForm.assignedTo}
                                            onChange={e => setEditForm({ ...editForm, assignedTo: e.target.value })}
                                        />
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

        </DragContext.Provider >
    );
};




// --- View: Blog Manager (List & Edit + AI) ---
const BlogManagerView = () => {
    const [viewMode, setViewMode] = useState<'list' | 'edit' | 'ai_batch'>('list');
    const [posts, setPosts] = useState<BlogPost[]>([]);
    const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
    const [comments, setComments] = useState<PostComment[]>([]);
    const [newComment, setNewComment] = useState('');
    const { user } = useAuth();
    const [formData, setFormData] = useState<Partial<BlogPost>>({});

    // AI State
    const [showAI, setShowAI] = useState(false);
    const [aiTopic, setAiTopic] = useState('');
    const [aiGenerating, setAiGenerating] = useState(false);

    // AI Batch State
    const [batchTopic, setBatchTopic] = useState('');
    const [batchKeywords, setBatchKeywords] = useState('');
    const [batchPostsPerDay, setBatchPostsPerDay] = useState<number>(3);
    const [batchGenerating, setBatchGenerating] = useState(false);
    const [batchSuccess, setBatchSuccess] = useState(false); // Can be boolean or a summary string
    const [generatedCount, setGeneratedCount] = useState(0);

    useEffect(() => {
        fetchPosts();
    }, []);

    const fetchPosts = async () => {
        const { data } = await supabase.from('SITE_BlogPosts').select('*').order('date', { ascending: false });
        if (data) setPosts(data.map((p: any) => ({
            ...p,
            seoScore: p.seo_score,
            seoDescription: p.seo_description,
            seoTitle: p.seo_title
        })));
    };

    const handleDeletePost = async (id: string) => {
        if (!confirm("Tem certeza que deseja excluir este post permanentemente?")) return;

        const { error } = await supabase.from('SITE_BlogPosts').delete().eq('id', id);

        if (error) {
            alert("Erro ao excluir: " + error.message);
        } else {
            setPosts(prev => prev.filter(p => p.id !== id));
        }
    };

    const handleEdit = async (post?: BlogPost) => {
        if (post) {
            setSelectedPost(post);
            setFormData(post);
            const { data } = await supabase.from('SITE_PostComments').select('*').eq('post_id', post.id).order('created_at', { ascending: true });
            if (data) setComments(data.map((c: any) => ({ ...c, postId: c.post_id, userName: c.user_name, createdAt: c.created_at })));
        } else {
            setSelectedPost(null);
            setFormData({ status: 'Draft', content: '', title: '' });
            setComments([]);
        }
        setViewMode('edit');
    };

    const handleSave = async () => {
        const score = calculateSeoScore(formData);

        const payload = {
            title: formData.title,
            content: formData.content,
            slug: formData.slug,
            excerpt: formData.excerpt,
            seo_title: formData.seoTitle,
            seo_description: formData.seoDescription,
            status: formData.status,
            seo_score: score,
            image: formData.image,
            author: formData.author || user?.name || 'Admin',
            category: formData.category || 'Blog',
            date: formData.date || new Date().toISOString()
        };

        if (selectedPost && selectedPost.id) {
            await supabase.from('SITE_BlogPosts').update(payload).eq('id', selectedPost.id);
        } else {
            await supabase.from('SITE_BlogPosts').insert([payload]);
        }

        alert('Post salvo com sucesso!');
        setViewMode('list');
        fetchPosts();
    };

    const handleGenerateAI = async () => {
        if (!aiTopic) return alert("Digite um tópico.");
        setAiGenerating(true);
        try {
            const aiPost = await generateBlogPost(aiTopic, []);
            const generatedSlug = aiPost.slug || aiPost.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

            setFormData({
                ...formData,
                title: aiPost.title,
                slug: generatedSlug,
                excerpt: aiPost.excerpt,
                content: aiPost.content,
                seoTitle: aiPost.title,
                seoDescription: aiPost.seo_description,
                image: `https://image.pollinations.ai/prompt/${encodeURIComponent(aiTopic)}?width=800&height=400&nologo=true`
            });
            setShowAI(false);
        } catch (error: any) {
            alert("Erro IA: " + error.message);
        } finally {
            setAiGenerating(false);
        }
    };

    const handleComment = async () => {
        if (!newComment || !selectedPost || !user) return;
        await supabase.from('SITE_PostComments').insert({
            post_id: selectedPost.id,
            user_name: user.name,
            content: newComment
        });
        setNewComment('');
        // Refresh comments logic here if needed
    };

    const calculateSeoScore = (data: Partial<BlogPost>) => {
        let score = 50;
        if (data.title && data.title.length > 30 && data.title.length < 60) score += 10;
        if (data.seoDescription && data.seoDescription.length > 120 && data.seoDescription.length < 160) score += 10;
        if (data.content && data.content.length > 500) score += 20;
        if (data.slug && !data.slug.includes(' ')) score += 10;
        return Math.min(100, score);
    };

    const handleGenerateBatch = async () => {
        if (!batchTopic && !batchKeywords) return alert("Preencha os tópicos e palavras-chave");

        // Split topics (priority) or generate from keywords
        let topicsList = batchTopic ? batchTopic.split(',').map(t => t.trim()).filter(t => t) : [];
        if (topicsList.length === 0 && batchKeywords) {
            // If only keywords are provided, use them as topics
            topicsList = batchKeywords.split(',').map(k => k.trim()).filter(k => k);
        }

        if (topicsList.length === 0) return alert("Nenhum tópico identificado.");

        setBatchGenerating(true);
        setBatchSuccess(false);
        setGeneratedCount(0);

        try {
            const keywordList = batchKeywords.split(',').map(k => k.trim());
            const postsPerDay = batchPostsPerDay || 3;

            let completed = 0;

            for (let i = 0; i < topicsList.length; i++) {
                const topic = topicsList[i];

                // Schedule Date Logic
                const daysToAdd = Math.floor(i / postsPerDay);
                const scheduleDate = new Date();
                scheduleDate.setDate(scheduleDate.getDate() + daysToAdd);
                // Set to a reasonable time (e.g., 09:00 AM) or keep current time

                const aiPost = await generateBlogPost(topic, keywordList);
                let coverImage = aiPost.image_prompt
                    ? `https://image.pollinations.ai/prompt/${encodeURIComponent(aiPost.image_prompt)}?width=800&height=400&nologo=true`
                    : `https://image.pollinations.ai/prompt/${encodeURIComponent(topic)}?width=800&height=400&nologo=true`;

                const generatedSlug = aiPost.slug || aiPost.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Math.random().toString(36).substr(2, 5);

                await supabase.from('SITE_BlogPosts').insert([{
                    title: aiPost.title,
                    slug: generatedSlug,
                    excerpt: aiPost.excerpt,
                    content: aiPost.content,
                    seo_description: aiPost.seo_description,
                    seo_title: aiPost.title,
                    keywords: aiPost.tags || keywordList,
                    status: 'Published', // Auto-publish with future date? Or 'Draft'. User asked to "create content", assuming intent to publish.
                    author: 'W-TECH AI',
                    category: 'Blog',
                    image: coverImage,
                    seo_score: Math.floor(Math.random() * (95 - 75) + 75),
                    views: 0,
                    clicks: 0,
                    date: scheduleDate.toISOString() // Future date
                }]);

                completed++;
                setGeneratedCount(completed);
            }
            setBatchSuccess(true);
            setBatchTopic('');
            // Don't switch view immediately
        } catch (error: any) {
            alert("Erro Parcial: " + error.message);
        } finally {
            setBatchGenerating(false);
        }
    };

    const currentScore = calculateSeoScore(formData);

    if (viewMode === 'edit') {
        return (
            <div className="flex h-full gap-6 text-gray-900">
                <div className="flex-grow bg-white rounded-lg shadow-sm border border-gray-100 flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                        <div className="flex items-center gap-4">
                            <button onClick={() => setViewMode('list')} className="text-gray-500 hover:text-black"><ArrowRight className="rotate-180" /></button>
                            <h2 className="font-bold text-lg text-gray-900">Editor de Postagem</h2>
                            <button onClick={() => setShowAI(!showAI)} className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-3 py-1 rounded text-xs font-bold flex items-center gap-2 shadow-sm hover:shadow-md transition-all">
                                <Sparkles size={12} /> {showAI ? 'Fechar IA' : 'Gerar com IA'}
                            </button>
                        </div>
                        <div className="flex gap-2">
                            <select
                                className="border border-gray-300 p-2 rounded text-sm text-gray-900 bg-white"
                                value={formData.status}
                                onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                            >
                                <option value="Draft">Rascunho</option>
                                <option value="Published">Publicado</option>
                            </select>
                            <button onClick={handleSave} className="bg-wtech-gold text-black px-4 py-2 rounded font-bold text-sm flex items-center gap-2">
                                <Save size={16} /> Salvar
                            </button>
                        </div>
                    </div>

                    {showAI && (
                        <div className="bg-purple-50 p-4 border-b border-purple-100 animate-in slide-in-from-top-2">
                            <div className="flex gap-2">
                                <input
                                    className="flex-grow border border-purple-200 rounded p-2 text-sm"
                                    placeholder="Sobre o que você quer escrever?"
                                    value={aiTopic}
                                    onChange={e => setAiTopic(e.target.value)}
                                />
                                <button
                                    onClick={handleGenerateAI}
                                    disabled={aiGenerating}
                                    className="bg-purple-600 text-white px-4 py-2 rounded font-bold text-sm hover:bg-purple-700 disabled:opacity-50"
                                >
                                    {aiGenerating ? <Loader2 className="animate-spin" /> : 'Gerar'}
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Título</label>
                            <input className="w-full text-2xl font-bold border-b border-gray-200 text-gray-900 bg-transparent py-2" value={formData.title || ''} onChange={e => setFormData({ ...formData, title: e.target.value })} />
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Slug</label>
                                <input className="w-full border border-gray-300 p-2 rounded text-sm text-gray-900" value={formData.slug || ''} onChange={e => setFormData({ ...formData, slug: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Date</label>
                                <input type="datetime-local" className="w-full border border-gray-300 p-2 rounded text-sm text-gray-900"
                                    value={formData.date ? new Date(formData.date).toISOString().slice(0, 16) : ''}
                                    onChange={e => setFormData({ ...formData, date: new Date(e.target.value).toISOString() })} />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Resumo</label>
                            <textarea rows={2} className="w-full border border-gray-300 p-2 rounded text-sm text-gray-900" value={formData.excerpt || ''} onChange={e => setFormData({ ...formData, excerpt: e.target.value })} />
                        </div>

                        <div className="flex-grow">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Conteúdo (HTML)</label>
                            <textarea
                                className="w-full h-96 border border-gray-300 p-4 rounded font-mono text-sm"
                                value={formData.content || ''}
                                onChange={e => setFormData({ ...formData, content: e.target.value })}
                            />
                        </div>
                    </div>
                </div>

                <div className="w-72 flex-shrink-0 flex flex-col gap-6">
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 text-center">
                        <h3 className="font-bold text-gray-800 mb-2">SEO Score</h3>
                        <span className="text-4xl font-bold text-wtech-gold">{currentScore}</span>
                    </div>
                </div>
            </div>
        );
    }

    if (viewMode === 'ai_batch') {
        return (
            <div className="flex h-full gap-6 text-gray-900 justify-center items-start pt-10">
                <div className="max-w-4xl w-full bg-white p-8 rounded-xl shadow-sm border border-gray-100 relative">
                    <button onClick={() => setViewMode('list')} className="absolute top-4 left-4 p-2 hover:bg-gray-100 rounded-full text-gray-500">
                        <ArrowRight className="rotate-180" size={24} />
                    </button>

                    <div className="flex items-center gap-3 mb-6 ml-10">
                        <div className="bg-wtech-black p-2 rounded text-wtech-gold"><Sparkles size={24} /></div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Agendador de Conteúdo IA</h2>
                            <p className="text-xs text-gray-500">Crie um cronograma de postagens otimizadas automaticamente.</p>
                        </div>
                    </div>

                    {batchSuccess && (
                        <div className="mb-6 bg-green-50 border border-green-200 text-green-800 p-4 rounded-lg flex justify-between items-center animate-in fade-in">
                            <div>
                                <strong>Sucesso!</strong> {generatedCount} artigos agendados.
                            </div>
                            <button onClick={() => { setViewMode('list'); fetchPosts(); }} className="text-sm font-bold underline hover:text-green-900">
                                Ver Calendário
                            </button>
                        </div>
                    )}

                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Lista de Tópicos (Um por linha ou vírgula)</label>
                            <textarea
                                rows={6}
                                className="w-full border border-gray-300 p-3 rounded text-gray-900 focus:border-wtech-gold focus:ring-1 focus:ring-wtech-gold outline-none font-mono text-sm"
                                value={batchTopic}
                                onChange={e => setBatchTopic(e.target.value)}
                                placeholder={"Manutenção de Freios\nTroca de Óleo\nSuspensão Esportiva\n..."}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Publicações por Dia</label>
                            <input
                                type="number"
                                min="1" max="10"
                                className="w-full border border-gray-300 p-3 rounded text-gray-900 font-bold"
                                value={batchPostsPerDay}
                                onChange={e => setBatchPostsPerDay(parseInt(e.target.value))}
                            />
                            <p className="text-[10px] text-gray-400 mt-1">Ex: 3 posts = 1 manhã, 1 tarde, 1 noite (distribuídos nas datas).</p>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Palavras-chave Globais</label>
                            <input
                                className="w-full border border-gray-300 p-3 rounded text-gray-900"
                                value={batchKeywords}
                                onChange={e => setBatchKeywords(e.target.value)}
                                placeholder="motos, oficina, performance"
                            />
                        </div>
                    </div>

                    <div className="mt-8 p-4 bg-gray-50 rounded-lg border border-gray-100">
                        <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-600">Total de Artigos:</span>
                            <span className="font-bold">{batchTopic ? batchTopic.split(/,|\n/).filter(t => t.trim()).length : 0}</span>
                        </div>
                        <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-600">Duração do Cronograma:</span>
                            <span className="font-bold">~{Math.ceil((batchTopic ? batchTopic.split(/,|\n/).filter(t => t.trim()).length : 0) / batchPostsPerDay)} dias</span>
                        </div>
                    </div>

                    <button
                        onClick={handleGenerateBatch}
                        disabled={batchGenerating}
                        className="mt-6 w-full bg-gradient-to-r from-wtech-gold to-yellow-600 text-black font-bold py-4 rounded-lg flex items-center justify-center gap-2 hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {batchGenerating ? (
                            <>
                                <Loader2 className="animate-spin" />
                                Gerando {generatedCount + 1}...
                            </>
                        ) : (
                            <><CalendarClock /> INICIAR AGENDAMENTO</>
                        )}
                    </button>

                    {batchGenerating && (
                        <div className="mt-4 w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                            <div
                                className="bg-wtech-gold h-full transition-all duration-500 linear"
                                style={{ width: `${(generatedCount / Math.max(1, batchTopic.split(/,|\n/).length)) * 100}%` }}
                            />
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden text-gray-900">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-gray-800">Gerenciador de Blog</h2>
                    <p className="text-xs text-gray-500">Edite, aprove e analise a performance dos posts.</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => handleEdit()} className="bg-wtech-black text-white px-4 py-2 rounded font-bold text-sm hover:opacity-80">
                        + Novo Post
                    </button>
                    <button onClick={() => setViewMode('ai_batch')} className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2 rounded font-bold text-sm hover:opacity-80 flex items-center gap-2">
                        <Sparkles size={16} /> Agendador IA
                    </button>
                </div>
            </div>

                                </td>
                                <td className="px-6 py-4">
                                    <button
                                        onClick={() => handleEdit(post)}
                                        className="text-wtech-gold font-bold hover:underline flex items-center gap-1"
                                    >
                                        <Edit size={14} /> Editar
                                    </button>
                                    <button
                                        onClick={() => handleDeletePost(post.id)}
                                        className="text-red-600 font-bold hover:underline flex items-center gap-1 ml-4"
                                    >
                                        <Trash2 size={14} /> Excluir
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// --- View: Landing Page Builder (New) ---
const LandingPagesView = () => {
    const [pages, setPages] = useState<LandingPage[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState<Partial<LandingPage>>({});

    // Hardcoded System Links for easier access
    const systemLinks = [
        { label: 'Home (Início)', url: 'https://w-techbrasil.com.br/#/' },
        { label: 'Cursos & Agenda', url: 'https://w-techbrasil.com.br/#/courses' },
        { label: 'Mapa da Rede', url: 'https://w-techbrasil.com.br/#/mechanics-map' },
        { label: 'Blog', url: 'https://w-techbrasil.com.br/#/blog' },
        { label: 'Glossário Técnico', url: 'https://w-techbrasil.com.br/#/glossary' },
        { label: 'Página de Contato', url: 'https://w-techbrasil.com.br/#/contact' },
        { label: 'Cadastro de Mecânico', url: 'https://w-techbrasil.com.br/#/register-mechanic' },
        { label: 'Painel Admin', url: 'https://w-techbrasil.com.br/#/admin' },
    ];

    useEffect(() => {
        fetchPages();
    }, []);

    const fetchPages = async () => {
        const { data } = await supabase.from('SITE_LandingPages').select('*').order('created_at', { ascending: false });
        if (data) setPages(data.map((p: any) => ({
            ...p,
            heroHeadline: p.hero_headline,
            heroSubheadline: p.hero_subheadline,
            heroImage: p.hero_image,
            viewCount: p.view_count,
            conversionCount: p.conversion_count
        })));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const payload = {
            title: formData.title,
            slug: formData.slug,
            hero_headline: formData.heroHeadline,
            hero_subheadline: formData.heroSubheadline,
            hero_image: formData.heroImage,
            features: formData.features,
            status: formData.status || 'Draft'
        };

        if (formData.id) {
            await supabase.from('SITE_LandingPages').update(payload).eq('id', formData.id);
        } else {
            await supabase.from('SITE_LandingPages').insert([payload]);
        }
        setIsEditing(false);
        fetchPages();
    };

    if (isEditing) {
        return (
            <div className="bg-white p-6 rounded-lg shadow-sm text-gray-900">
                <h2 className="text-xl font-bold mb-6 text-gray-900">{formData.id ? 'Editar LP' : 'Nova Landing Page'}</h2>
                <form onSubmit={handleSave} className="grid grid-cols-2 gap-6 text-gray-900">
                    <div>
                        <label className="block text-sm font-bold mb-1 text-gray-700">Título Interno</label>
                        <input className="w-full border border-gray-300 p-2 rounded text-gray-900" value={formData.title || ''} onChange={e => setFormData({ ...formData, title: e.target.value })} required />
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-1 text-gray-700">Slug (URL)</label>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400">w-tech.com/#/lp/</span>
                            <input className="flex-grow border border-gray-300 p-2 rounded text-gray-900" value={formData.slug || ''} onChange={e => setFormData({ ...formData, slug: e.target.value })} required />
                        </div>
                    </div>
                    <div className="col-span-2">
                        <label className="block text-sm font-bold mb-1 text-gray-700">Headline (Título Principal)</label>
                        <input className="w-full border border-gray-300 p-2 rounded text-gray-900 font-bold text-lg" value={formData.heroHeadline || ''} onChange={e => setFormData({ ...formData, heroHeadline: e.target.value })} />
                    </div>
                    <div className="col-span-2">
                        <label className="block text-sm font-bold mb-1 text-gray-700">Subheadline</label>
                        <textarea className="w-full border border-gray-300 p-2 rounded text-gray-900" rows={2} value={formData.heroSubheadline || ''} onChange={e => setFormData({ ...formData, heroSubheadline: e.target.value })} />
                    </div>
                    <div className="col-span-2">
                        <label className="block text-sm font-bold mb-1 text-gray-700">Imagem de Capa (URL)</label>
                        <input className="w-full border border-gray-300 p-2 rounded text-gray-900" value={formData.heroImage || ''} onChange={e => setFormData({ ...formData, heroImage: e.target.value })} />
                    </div>
                    <div className="col-span-2">
                        <label className="block text-sm font-bold mb-1 text-gray-700">Lista de Benefícios (Features)</label>
                        <p className="text-xs text-gray-500 mb-2">Separe itens por vírgula</p>
                        <textarea
                            className="w-full border border-gray-300 p-2 rounded text-gray-900"
                            rows={4}
                            value={Array.isArray(formData.features) ? formData.features.join(', ') : formData.features || ''}
                            onChange={e => setFormData({ ...formData, features: e.target.value.split(',').map(s => s.trim()) })}
                        />
                    </div>
                    <div className="col-span-2 flex justify-end gap-2">
                        <button type="button" onClick={() => setIsEditing(false)} className="px-4 py-2 border rounded text-gray-700">Cancelar</button>
                        <button type="submit" className="px-4 py-2 bg-wtech-gold font-bold rounded">Salvar LP</button>
                    </div>
                </form>
            </div>
        );
    }

    return (
        <div className="text-gray-900">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-bold">Construtor de Landing Pages</h2>
                    <p className="text-xs text-gray-500">Crie páginas de alta conversão para campanhas específicas.</p>
                </div>
                <button onClick={() => { setFormData({}); setIsEditing(true); }} className="bg-wtech-gold text-black px-4 py-2 rounded font-bold flex items-center gap-2">
                    <Plus size={18} /> Nova LP
                </button>
            </div>



            <div className="mb-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="font-bold text-gray-700 mb-2 text-sm uppercase">Links Internos do Sistema</h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {systemLinks.map((link, idx) => (
                        <div key={idx} className="flex flex-col text-xs">
                            <span className="font-bold text-gray-900">{link.label}</span>
                            <code className="bg-gray-200 p-1 rounded mt-1 truncate hover:text-clip select-all cursor-pointer" title="Clique para selecionar">{link.url}</code>
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pages.map(page => (
                    <div key={page.id} className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                        <div className="h-32 bg-gray-200 relative">
                            {page.heroImage && <img src={page.heroImage} className="w-full h-full object-cover" />}
                            <div className="absolute top-2 right-2 bg-white/90 backdrop-blur px-2 py-1 rounded text-[10px] font-bold uppercase">
                                {page.status}
                            </div>
                        </div>
                        <div className="p-4 flex-grow">
                            <h3 className="font-bold text-gray-900 mb-1">{page.title}</h3>
                            <p className="text-xs text-gray-500 mb-4 truncate">/lp/{page.slug}</p>

                            <div className="flex gap-4 text-xs text-gray-600 mb-4">
                                <span className="flex items-center gap-1"><Eye size={12} /> {page.viewCount} views</span>
                                <span className="flex items-center gap-1 text-green-600 font-bold"><TrendingUp size={12} /> {page.conversionCount} leads</span>
                            </div>
                        </div>
                        <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-2">
                            <button onClick={() => { setFormData(page); setIsEditing(true); }} className="flex-1 py-2 text-xs font-bold bg-white border border-gray-200 rounded hover:bg-gray-100 text-gray-700">Editar</button>
                            <a href={`/#/lp/${page.slug}`} target="_blank" className="flex-1 py-2 text-xs font-bold bg-wtech-black text-white rounded hover:bg-gray-800 text-center flex items-center justify-center gap-1">
                                Visualizar <ArrowUpRight size={10} />
                            </a>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};


// --- View: Courses Manager (List/Calendar) ---
const CoursesManagerView = () => {
    const [courses, setCourses] = useState<Course[]>([]);
    const [leadsCount, setLeadsCount] = useState<Record<string, number>>({});
    const [isEditing, setIsEditing] = useState(false);
    const [editingLandingPage, setEditingLandingPage] = useState<Course | null>(null);
    const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
    const [formData, setFormData] = useState<Partial<Course>>({});

    // Settle Modal State
    const [settleModal, setSettleModal] = useState<{ isOpen: boolean, enrollment: Enrollment | null, amount: number }>({ isOpen: false, enrollment: null, amount: 0 });
    const [settleMethod, setSettleMethod] = useState('Pix');

    // --- Report State ---
    const [showReportModal, setShowReportModal] = useState(false);
    const [reportCourse, setReportCourse] = useState<Course | null>(null);
    const [reportLoading, setReportLoading] = useState(true);
    const [reportData, setReportData] = useState({
        leadsCount: 0,
        enrollmentsCount: 0,
        inProgressCount: 0,
        revenue: 0,
        expenses: 0,
        netResult: 0,
        studentsList: [] as any[],
        expenseList: [] as any[]
    });

    const { user } = useAuth();

    // Permission Check helper specifically for Level 10
    const isLevel10 = () => {
        return (typeof user?.role !== 'string' && user?.role?.level >= 10) || (typeof user?.role !== 'string' && user?.role?.name === 'Super Admin');
    };

    const handleOpenReport = async (course: Course) => {
        setReportCourse(course);
        setShowReportModal(true);
        setReportLoading(true);

        try {
            // 1. Fetch Enrollments
            const { data: enrollments } = await supabase.from('SITE_Enrollments').select('*').eq('course_id', course.id);

            // 2. Fetch Leads (Heuristic: Match context_id containing title)
            const { data: leads } = await supabase.from('SITE_Leads').select('*').ilike('context_id', `%${course.title}%`);

            // 3. Fetch Expenses
            const { data: expenses } = await supabase
                .from('SITE_Transactions')
                .select('*')
                .eq('course_id', course.id)
                .eq('type', 'Expense');

            const totalEnrollments = enrollments?.length || 0;
            const confirmedEnrollments = enrollments?.filter((e: any) => e.status === 'Confirmed' || e.status === 'CheckedIn') || [];
            const revenue = confirmedEnrollments.reduce((acc: number, curr: any) => acc + (curr.amount_paid || 0), 0);

            const totalExpenses = expenses?.reduce((acc: number, curr: any) => acc + Number(curr.amount), 0) || 0;
            const netResult = revenue - totalExpenses;

            // Updated Lead Count Logic (Consistent with main list)
            const totalLeads = leads?.length || leadsCount[course.id] || 0;
            const inProgress = leads?.filter((l: any) => ['New', 'Contacted', 'Negotiating'].includes(l.status)).length || 0;

            const students = enrollments?.map((e: any) => ({
                name: e.student_name,
                email: e.student_email,
                phone: e.student_phone,
                status: e.status,
                paid: e.amount_paid || 0
            })) || [];

            setReportData({
                leadsCount: totalLeads,
                enrollmentsCount: confirmedEnrollments.length,
                inProgressCount: inProgress,
                revenue,
                expenses: totalExpenses,
                netResult,
                studentsList: students,
                expenseList: expenses || []
            });

        } catch (e) {
            console.error("Error generating report", e);
            alert("Erro ao gerar relatório.");
        } finally {
            setReportLoading(false);
        }
    };

    const hasPermission = (key: string) => {
        if (!user) return false;

        // Super Admin Override
        const roleName = typeof user.role === 'string' ? user.role : user.role?.name;
        if (roleName === 'Super Admin' || user.permissions?.admin_access) return true;

        // Granular Check
        const rolePermissions = typeof user.role === 'object' ? user.role?.permissions : {};
        const effectivePermissions = { ...rolePermissions, ...user.permissions };

        return !!effectivePermissions[key];
    };




    const handleBlurCEP = async (e: React.FocusEvent<HTMLInputElement>) => {
        const cep = e.target.value.replace(/\D/g, '');
        if (cep.length === 8) {
            try {
                const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
                const data = await response.json();
                if (!data.erro) {
                    setFormData(prev => ({
                        ...prev,
                        address: data.logradouro,
                        addressNumber: '', // Clear number as it's not in CEP data
                        addressNeighborhood: data.bairro,
                        city: data.localidade,
                        state: data.uf,
                        location: `${data.localidade} - ${data.uf}` // Sync with main location field
                    }));
                    // Optional: Trigger geocode immediately if number is already present (unlikely on fresh paste)
                } else {
                    alert('CEP não encontrado.');
                }
            } catch (error) {
                console.error('Erro ao buscar CEP:', error);
            }
        }
    };

    const handleGeocodeCourse = async () => {
        if (!formData.address || !formData.city) {
            alert('Preencha o endereço e cidade para buscar o PIN.');
            return;
        }
        const query = `${formData.address}, ${formData.addressNumber || ''}, ${formData.city}, ${formData.state || ''}`;
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
            const data = await response.json();
            if (data && data.length > 0) {
                const { lat, lon } = data[0];
                setFormData(prev => ({
                    ...prev,
                    latitude: parseFloat(lat),
                    longitude: parseFloat(lon),
                    mapUrl: `https://www.google.com/maps?q=${lat},${lon}` // Auto-generate Map URL
                }));
                alert(`PIN encontrado: ${lat}, ${lon}`);
            } else {
                alert('Endereço não encontrado no mapa.');
            }
        } catch (e) {
            console.error(e);
            alert('Erro na geolocalização.');
        }
    };

    // Enrollment State
    const [showEnrollments, setShowEnrollments] = useState(false);
    const [currentCourse, setCurrentCourse] = useState<Course | null>(null);
    const [enrollments, setEnrollments] = useState<Enrollment[]>([]);

    // Calendar Navigation State
    const [currentDate, setCurrentDate] = useState(new Date());

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [showPastCourses, setShowPastCourses] = useState(true);
    const [calendarViewMode, setCalendarViewMode] = useState<'Month' | 'Week' | 'Year'>('Month');

    // Filtered Data
    const filteredCourses = courses.filter(c => {
        const matchesSearch = c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.location?.toLowerCase().includes(searchTerm.toLowerCase());

        const courseDate = new Date(c.date);
        const isPast = courseDate < new Date(new Date().setHours(0, 0, 0, 0));
        const matchesPast = showPastCourses ? true : !isPast;

        const matchesDateRange = (!dateRange.start || courseDate >= new Date(dateRange.start)) &&
            (!dateRange.end || courseDate <= new Date(dateRange.end));

        return matchesSearch && matchesPast && matchesDateRange;
    });

    useEffect(() => {
        fetchCourses();
    }, []);

    const fetchCourses = async () => {
        const { data } = await supabase.from('SITE_Courses').select('*, SITE_Enrollments(count)').order('date', { ascending: true });
        if (data) setCourses(data.map((c: any) => ({
            ...c,
            locationType: c.location_type,
            registeredCount: c.SITE_Enrollments?.[0]?.count || 0,
            hotelsInfo: c.hotels_info,
            startTime: c.start_time,
            endTime: c.end_time,
            dateEnd: c.date_end,
            mapUrl: c.map_url,
            zipCode: c.zip_code,
            addressNumber: c.address_number,
            addressNeighborhood: c.address_neighborhood
        })));

        // Fetch Leads for Courses (Client-side estimation based on context_id)
        const { data: leads } = await supabase.from('SITE_Leads').select('id, context_id');
        if (leads && data) {
            const counts: Record<string, number> = {};
            data.forEach((c: any) => {
                // Count leads where context_id contains course title (Legacy/Simple) or matches specific tags if we had them
                // Improved logic: match checks
                const count = leads.filter((l: any) => l.context_id && l.context_id.toLowerCase().includes(c.title.toLowerCase())).length;
                counts[c.id] = count;
            });
            setLeadsCount(counts);
        }
    };

    const handleEdit = (course?: Course) => {
        if (course) {
            setFormData(course);
        } else {
            setFormData({});
        }
        setIsEditing(true);
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const payload = {
            title: formData.title,
            description: formData.description,
            instructor: formData.instructor,
            date: formData.date,
            date_end: formData.dateEnd,
            start_time: formData.startTime,
            end_time: formData.endTime,
            location: formData.location, // Defines the "Display Location" (Header)
            location_type: formData.locationType,
            map_url: formData.mapUrl,
            schedule: formData.schedule,
            price: formData.price,
            capacity: formData.capacity,
            image: formData.image,
            hotels_info: formData.hotelsInfo,
            status: formData.status || 'Draft',
            // Address Fields
            zip_code: formData.zipCode,
            address: formData.address,
            address_number: formData.addressNumber,
            address_neighborhood: formData.addressNeighborhood,
            city: formData.city,
            state: formData.state,
            latitude: formData.latitude,
            longitude: formData.longitude
        };

        if (formData.id) {
            await supabase.from('SITE_Courses').update(payload).eq('id', formData.id);
        } else {
            await supabase.from('SITE_Courses').insert([payload]);
        }
        setIsEditing(false);
        fetchCourses();
    };

    const handleDuplicate = (course: Course) => {
        const { id, registeredCount, ...rest } = course;
        const newCourse = {
            ...rest,
            title: `Cópia de ${course.title}`,
            status: 'Draft' as const,
            date: '', // Reset date to avoid confusion
            dateEnd: '',
            startTime: '',
            endTime: '',
            registeredCount: 0
        };
        setFormData(newCourse);
        setIsEditing(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza?')) return;
        await supabase.from('SITE_Courses').delete().eq('id', id);
        fetchCourses();
    };

    const downloadCoursesReport = () => {
        const headers = ['Título', 'Data', 'Horário', 'Local', 'Alunos Inscritos', 'Capacidade', 'Status', 'Valor Total Previsto'];
        const csvContent = [
            headers.join(','),
            ...courses.map(c => {
                const totalValue = (c.price || 0) * (c.registeredCount || 0);
                return [
                    `"${c.title}"`,
                    new Date(c.date).toLocaleDateString(),
                    `"${c.startTime} - ${c.endTime}"`,
                    `"${c.location} - ${c.city}/${c.state}"`,
                    c.registeredCount || 0,
                    c.capacity || 0,
                    c.status,
                    totalValue.toFixed(2)
                ].join(',');
            })
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `relatorio_cursos_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    };

    const handlePrintCoursesReport = () => {
        const printWindow = window.open('', '', 'width=900,height=650');
        if (!printWindow) return;

        const html = `
        <html>
        <head>
            <title>Relatório de Cursos - W-TECH</title>
            <style>
                body { font-family: 'Helvetica', sans-serif; padding: 20px; }
                h1 { text-align: center; color: #333; }
                .meta { margin-bottom: 20px; font-size: 12px; color: #666; text-align: center; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 10px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f2f2f2; font-weight: bold; }
                .status-draft { color: orange; }
                .status-published { color: green; }
                tr:nth-child(even) { background-color: #f9f9f9; }
                .total { font-weight: bold; text-align: right; margin-top: 10px; }
            </style>
        </head>
        <body>
            <h1>Relatório de Cursos e Eventos</h1>
            <div class="meta">Gerado em: ${new Date().toLocaleString('pt-BR')}</div>
            
            <table>
                <thead>
                    <tr>
                        <th>Título</th>
                        <th>Data/Hora</th>
                        <th>Local</th>
                        <th>Inscritos</th>
                        <th>Capacidade</th>
                        <th>Status</th>
                        <th>Receita Prevista</th>
                        <th>Receita Realizada</th>
                    </tr>
                </thead>
                <tbody>
                    ${courses.map(c => {
            const potential = (c.price || 0) * (c.capacity || 0);
            const expected = (c.price || 0) * (c.registeredCount || 0);
            return `
                        <tr>
                            <td>${c.title}</td>
                            <td>${new Date(c.date).toLocaleDateString()} ${c.startTime || ''}</td>
                            <td>${c.location}</td>
                            <td>${c.registeredCount || 0}</td>
                            <td>${c.capacity || 0}</td>
                            <td className="status-${c.status?.toLowerCase()}">${c.status}</td>
                            <td>R$ ${expected.toFixed(2)}</td>
                            <td>-</td> 
                        </tr>
                        `;
        }).join('')}
                </tbody>
            </table>
            <div class="total">
                <p>Total de Registros: ${courses.length}</p>
            </div>
            <script>
                window.onload = function() { window.print(); window.close(); }
            </script>
        </body>
        </html>
      `;
        printWindow.document.write(html);
        printWindow.document.close();
    };



    const printSingleCourseReport = () => {
        if (!reportCourse) return;
        const printWindow = window.open('', '', 'width=900,height=650');
        if (!printWindow) return;

        const html = `
        <html>
        <head>
            <title>Relatório Gerencial - ${reportCourse.title}</title>
            <style>
                body { font-family: 'Helvetica', sans-serif; padding: 40px; color: #333; }
                .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #D4AF37; padding-bottom: 20px; }
                .header h1 { margin: 0; font-size: 24px; text-transform: uppercase; }
                .header p { color: #666; font-size: 14px; margin-top: 5px; }
                
                .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 40px; }
                .kpi-card { border: 1px solid #eee; padding: 15px; border-radius: 8px; background: #f9f9f9; }
                .kpi-label { font-size: 12px; font-weight: bold; color: #666; text-transform: uppercase; }
                .kpi-value { font-size: 24px; font-weight: bold; margin: 5px 0; }
                .kpi-sub { font-size: 11px; color: #888; }
                .text-green { color: #166534; }
                .text-red { color: #991b1b; }
                .text-blue { color: #1e40af; }
                
                .section-title { font-size: 16px; font-weight: bold; margin-bottom: 15px; border-left: 4px solid #D4AF37; padding-left: 10px; margin-top: 30px; }
                
                table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 30px; }
                th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
                th { background-color: #f2f2f2; font-weight: bold; text-transform: uppercase; font-size: 10px; }
                
                .footer { margin-top: 50px; text-align: center; font-size: 10px; color: #999; border-top: 1px solid #eee; padding-top: 20px; }
                
                @media print {
                    button { display: none; }
                    body { padding: 0; }
                    .no-print { display: none; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>${reportCourse.title}</h1>
                <p>Relatório de Fechamento e Resultados - Gerado em ${new Date().toLocaleString('pt-BR')}</p>
            </div>

            <div class="kpi-grid">
                <div class="kpi-card">
                    <div class="kpi-label">Receita Bruta</div>
                    <div class="kpi-value text-blue">R$ ${reportData.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                    <div class="kpi-sub">${reportData.enrollmentsCount} vendas confirmadas</div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-label">Despesas Totais</div>
                    <div class="kpi-value text-red">R$ ${(reportData.expenses || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                    <div class="kpi-sub">${reportData.expenseList?.length || 0} lançamentos</div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-label">Resultado Líquido</div>
                    <div class="kpi-value ${(reportData.netResult || 0) >= 0 ? 'text-green' : 'text-red'}">
                        R$ ${(reportData.netResult || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                    <div class="kpi-sub">Lucro final da operação</div>
                </div>
                
                 <div class="kpi-card">
                    <div class="kpi-label">Leads Captados</div>
                    <div class="kpi-value">${reportData.leadsCount}</div>
                    <div class="kpi-sub">Interessados no período</div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-label">Taxa de Conversão</div>
                    <div class="kpi-value">${reportData.leadsCount > 0 ? ((reportData.enrollmentsCount / reportData.leadsCount) * 100).toFixed(1) : 0}%</div>
                    <div class="kpi-sub">Eficiência de Vendas</div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-label">Status</div>
                    <div class="kpi-value" style="font-size: 18px;">${reportCourse.status}</div>
                    <div class="kpi-sub">Situação atual</div>
                </div>
            </div>

            <div class="section-title">Detalhamento Financeiro (Despesas)</div>
            ${reportData.expenseList && reportData.expenseList.length > 0 ? `
            <table>
                <thead>
                    <tr>
                        <th>Data</th>
                        <th>Descrição</th>
                        <th>Categoria</th>
                        <th>Valor</th>
                    </tr>
                </thead>
                <tbody>
                    ${reportData.expenseList.map((e: any) => `
                    <tr>
                        <td>${new Date(e.date).toLocaleDateString()}</td>
                        <td>${e.description}</td>
                        <td>${e.category}</td>
                        <td style="color: #991b1b; font-weight: bold;">- R$ ${Number(e.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    </tr>
                    `).join('')}
                    <tr style="background-color: #fcebeb;">
                        <td colspan="3" style="text-align: right; font-weight: bold;">TOTAL DESPESAS:</td>
                        <td style="color: #991b1b; font-weight: bold;">R$ ${(reportData.expenses || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    </tr>
                </tbody>
            </table>
            ` : '<p style="color: #999; font-style: italic;">Nenhuma despesa lançada para este curso.</p>'}

            <div class="section-title">Lista de Inscritos</div>
            <table>
                <thead>
                    <tr>
                        <th>Aluno</th>
                        <th>Email</th>
                        <th>Telefone</th>
                        <th>Status</th>
                        <th>Valor Pago</th>
                    </tr>
                </thead>
                <tbody>
                    ${reportData.studentsList?.map((s: any) => `
                    <tr>
                        <td><strong>${s.name}</strong></td>
                        <td>${s.email}</td>
                        <td>${s.phone}</td>
                        <td>${s.status}</td>
                        <td>R$ ${s.paid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    </tr>
                    `).join('')}
                    <tr style="background-color: #f0fdf4;">
                        <td colspan="4" style="text-align: right; font-weight: bold;">TOTAL RECEITA:</td>
                        <td style="color: #166534; font-weight: bold;">R$ ${reportData.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    </tr>
                </tbody>
            </table>

            <div class="footer">
                W-TECH Brasil Experience - Sistema de Gestão Integrada
            </div>

            <script>
                window.onload = function() { window.print(); window.close(); }
            </script>
        </body>
        </html>
      `;
        printWindow.document.write(html);
        printWindow.document.close();
    };

    const handleViewEnrollments = async (course: Course) => {
        setCurrentCourse(course);
        setShowEnrollments(true);
        const { data } = await supabase.from('SITE_Enrollments').select('*').eq('course_id', course.id);
        if (data) setEnrollments(data.map((c: any) => ({ ...c, courseId: c.course_id, studentName: c.student_name, studentEmail: c.student_email, studentPhone: c.student_phone, createdAt: c.created_at })));
        else setEnrollments([]);
    };

    const toggleCheckIn = async (enrollmentId: string, currentStatus: string) => {
        const newStatus = currentStatus === 'CheckedIn' ? 'Confirmed' : 'CheckedIn';
        await supabase.from('SITE_Enrollments').update({ status: newStatus }).eq('id', enrollmentId);
        setEnrollments(prev => prev.map(e => e.id === enrollmentId ? { ...e, status: newStatus as any } : e));
    };

    const handleSettleBalance = (enrollment: Enrollment, amount: number) => {
        setSettleModal({ isOpen: true, enrollment, amount });
        setSettleMethod('Pix');
    };

    const confirmSettle = async () => {
        const { enrollment, amount } = settleModal;
        if (!enrollment || !amount) return;

        // 1. Update Enrollment (Total Paid) & Status
        const newTotal = (enrollment.amountPaid || 0) + amount;
        const { error: err1 } = await supabase.from('SITE_Enrollments').update({
            amount_paid: newTotal,
            status: 'Confirmed'
        }).eq('id', enrollment.id);

        if (err1) {
            alert('Erro ao atualizar aluno: ' + err1.message);
            return;
        }

        // 2. Insert NEW Transaction (Split Payment)
        // This ensures the financial record shows the settlement as a distinct entry
        const { error: err2 } = await supabase.from('SITE_Transactions').insert([{
            description: `Quitação: ${currentCourse?.title || 'Curso'} - ${enrollment.studentName}`,
            category: 'Sales',
            type: 'Income',
            amount: amount,
            date: new Date().toISOString(), // Payment Date = Now
            payment_method: settleMethod,
            enrollment_id: enrollment.id
        }]);

        if (err2) {
            console.error(err2);
        }

        // Update Local State
        setEnrollments(prev => prev.map(e => e.id === enrollment.id ? { ...e, amountPaid: newTotal, status: 'Confirmed' } : e));
        setSettleModal({ ...settleModal, isOpen: false });
        alert('Pagamento registrado com sucesso!');
    };

    const printList = () => {
        const printWindow = window.open('', '', 'width=900,height=650');
        if (!printWindow) return;

        const html = `
        <html>
        <head>
            <title>Lista de Presença - ${currentCourse?.title}</title>
            <style>
                body { font-family: 'Helvetica', sans-serif; padding: 20px; }
                h1 { font-size: 20px; margin-bottom: 5px; }
                .subtitle { font-size: 14px; color: #666; margin-bottom: 20px; }
                table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
                th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
                th { background-color: #f2f2f2; font-weight: bold; text-transform: uppercase; font-size: 10px; }
                .check-col { width: 50px; text-align: center; }
                .check-box { width: 15px; height: 15px; border: 1px solid #333; display: inline-block; }
            </style>
        </head>
        <body>
            <h1>${currentCourse?.title}</h1>
            <div class="subtitle">
                Data: ${new Date(currentCourse?.date || '').toLocaleDateString()} • 
                Local: ${currentCourse?.location} • 
                Instrutor: ${currentCourse?.instructor}
            </div>
            
            <table>
                <thead>
                    <tr>
                        <th class="check-col">Presença</th>
                        <th>Nome do Aluno</th>
                        <th>Contato</th>
                        <th>Status Pagamento</th>
                        <th>Assinatura</th>
                    </tr>
                </thead>
                <tbody>
                    ${enrollments.map((enr, i) => {
            const balance = (currentCourse?.price || 0) - (enr.amountPaid || 0);
            const paymentStatus = balance > 0 ? `Restam R$ ${balance.toFixed(2)}` : 'QUITADO';
            return `
                        <tr>
                            <td class="check-col"><div class="check-box"></div></td>
                            <td><b>${i + 1}.</b> ${enr.studentName}</td>
                            <td>${enr.studentPhone || '-'}</td>
                            <td>${paymentStatus}</td>
                            <td></td> 
                        </tr>
                        `;
        }).join('')}
                </tbody>
            </table>
            <script>
                window.onload = function() { window.print(); window.close(); }
            </script>
        </body>
        </html>
      `;
        printWindow.document.write(html);
        printWindow.document.close();
    };



    /* ENROLLMENT MANAGEMENT */
    const [editingEnrollment, setEditingEnrollment] = useState<Partial<Enrollment> | null>(null);

    const handleQuickAddStudent = (course: Course) => {
        setCurrentCourse(course);
        setShowEnrollments(true); // Open enrollment view
        setEditingEnrollment({ status: 'Confirmed', amountPaid: 0 }); // Open add modal immediately
    };

    const fetchEnrollments = async (courseId: string) => {
        const { data, error } = await supabase.from('SITE_Enrollments').select('*').eq('course_id', courseId).order('created_at', { ascending: true });
        if (data) {
            setEnrollments(data.map((e: any) => ({
                id: e.id,
                courseId: e.course_id,
                studentName: e.student_name,
                studentEmail: e.student_email,
                studentPhone: e.student_phone,
                status: e.status,
                amountPaid: e.amount_paid,
                paymentMethod: e.payment_method,
                createdAt: e.created_at
            })));
        }
    };

    const handleDeleteEnrollment = async (enrollmentId: string) => {
        if (!confirm('Tem certeza que deseja remover este aluno?')) return;

        const { error } = await supabase.from('SITE_Enrollments').delete().eq('id', enrollmentId);
        if (error) {
            alert('Erro ao excluir: ' + error.message);
        } else {
            setEnrollments(prev => prev.filter(e => e.id !== enrollmentId));
        }
    };

    // ... (handleSaveEnrollment remains the same) ...
    const handleSaveEnrollment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingEnrollment || !currentCourse) return;

        const payload = {
            course_id: currentCourse.id,
            student_name: editingEnrollment.studentName,
            student_email: editingEnrollment.studentEmail,
            student_phone: editingEnrollment.studentPhone,
            status: editingEnrollment.status || 'Confirmed',
            amount_paid: Number(editingEnrollment.amountPaid) || 0,
            payment_method: editingEnrollment.paymentMethod
        };

        if (editingEnrollment.id) {
            // Update
            const { error } = await supabase.from('SITE_Enrollments').update(payload).eq('id', editingEnrollment.id);
            if (!error) {
                setEnrollments(prev => prev.map(enr => enr.id === editingEnrollment.id ? { ...enr, ...editingEnrollment, amountPaid: payload.amount_paid, paymentMethod: payload.payment_method } as Enrollment : enr));
                setEditingEnrollment(null);
            } else {
                alert('Erro ao atualizar: ' + error.message);
            }
        } else {
            // Insert
            const { data, error } = await supabase.from('SITE_Enrollments').insert([payload]).select().single();
            if (!error && data) {
                const newEnrollment: Enrollment = {
                    id: data.id,
                    courseId: data.course_id,
                    studentName: data.student_name,
                    studentEmail: data.student_email,
                    studentPhone: data.student_phone,
                    status: data.status,
                    amountPaid: data.amount_paid,
                    paymentMethod: data.payment_method,
                    createdAt: data.created_at
                };
                setEnrollments(prev => [...prev, newEnrollment]);
                setEditingEnrollment(null);
            } else {
                alert('Erro ao cadastrar: ' + (error?.message || 'Erro desconhecido'));
            }
        }
    };

    // Calendar Components
    const CalendarYearView = () => {
        const currentYear = currentDate.getFullYear();
        const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

        return (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {months.map((month, idx) => {
                    const monthEvents = courses.filter(c => {
                        const d = new Date(c.date);
                        return d.getMonth() === idx && d.getFullYear() === currentYear;
                    });

                    return (
                        <div key={month} className="border p-4 rounded-lg bg-white shadow-sm hover:shadow-md transition-all">
                            <h3 className="font-bold text-lg mb-2 text-gray-800">{month}</h3>
                            {monthEvents.length > 0 ? (
                                <ul className="space-y-2">
                                    {monthEvents.map(e => (
                                        <li key={e.id} onClick={() => handleEdit(e)} className="text-xs bg-gray-50 p-2 rounded cursor-pointer hover:bg-yellow-50 border-l-2 border-wtech-gold">
                                            <div className="font-bold flex justify-between">
                                                <span>{new Date(e.date).getDate()} - {e.title}</span>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div className="text-xs text-gray-400 italic">Sem eventos</div>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    };

    const CalendarWeekView = () => {
        // Simply show the next 7 days from today? Or structured Mon-Sun of current week?
        // Let's do current week Mon-Sun
        const curr = new Date();
        const first = curr.getDate() - curr.getDay(); // First day is the day of the month - the day of the week
        const firstDay = new Date(curr.setDate(first)); // This is Sunday. Let's make it Monday? 
        // Simplified: Show next 7 upcoming days regardless of week start
        const upcomingDays = Array.from({ length: 7 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() + i);
            return d;
        });

        return (
            <div className="grid grid-cols-7 gap-2 h-[600px]">
                {upcomingDays.map(date => {
                    const dayEvents = courses.filter(c => new Date(c.date).toDateString() === date.toDateString());
                    const isToday = date.toDateString() === new Date().toDateString();
                    return (
                        <div key={date.toString()} className={`border rounded-lg p-2 flex flex-col ${isToday ? 'bg-yellow-50 border-yellow-200' : 'bg-white'}`}>
                            <div className="text-center border-b pb-2 mb-2">
                                <div className="text-xs font-bold uppercase text-gray-500">{date.toLocaleDateString('pt-BR', { weekday: 'short' })}</div>
                                <div className={`text-xl font-black ${isToday ? 'text-wtech-gold' : 'text-gray-800'}`}>{date.getDate()}</div>
                            </div>
                            <div className="flex-1 space-y-2 overflow-y-auto">
                                {dayEvents.map(e => (
                                    <div key={e.id} onClick={() => handleEdit(e)} className="bg-wtech-black text-white text-[10px] p-2 rounded cursor-pointer hover:bg-gray-800">
                                        <div className="font-bold">{new Date(e.date).getHours()}h</div>
                                        <div className="line-clamp-3">{e.title}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    const CalendarGrid = () => {
        if (calendarViewMode === 'Year') return <CalendarYearView />;
        if (calendarViewMode === 'Week') return <CalendarWeekView />;

        // Default Month View
        const today = currentDate;
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

        const eventsByDay: { [key: number]: Course[] } = {};
        courses.forEach(c => {
            const d = new Date(c.date);
            if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
                const day = d.getDate();
                if (!eventsByDay[day]) eventsByDay[day] = [];
                eventsByDay[day].push(c);
            }
        });

        return (
            <div className="grid grid-cols-7 gap-2">
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
                    <div key={d} className="font-bold text-center text-xs text-gray-500 py-2 uppercase">{d}</div>
                ))}
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => (
                    <div key={day} className="border border-gray-100 min-h-[100px] p-2 rounded relative hover:bg-gray-50 transition-colors">
                        <span className="text-xs font-bold text-gray-400 absolute top-2 left-2">{day}</span>
                        <div className="mt-6 space-y-1">
                            {eventsByDay[day]?.map(ev => (
                                <div key={ev.id} onClick={() => handleEdit(ev)} className="bg-wtech-gold/20 text-yellow-900 text-[10px] p-1 rounded font-bold cursor-pointer hover:bg-wtech-gold truncate">
                                    {new Date(ev.date).getHours()}h: {ev.title}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    if (showEnrollments && currentCourse) {
        const totalPaid = enrollments.reduce((acc, curr) => acc + (curr.amountPaid || 0), 0);
        const totalPotential = enrollments.length * (currentCourse.price || 0);

        return (
            <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-100 min-h-screen">
                <div className="flex justify-between items-start mb-8 print:hidden">
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <button onClick={() => setShowEnrollments(false)} className="text-sm font-bold text-gray-500 hover:text-black flex items-center gap-1">
                                <ArrowRight className="rotate-180" size={14} /> Voltar
                            </button>
                        </div>
                        <h2 className="text-2xl font-black text-gray-900">Lista de Inscritos</h2>
                        <p className="text-gray-500">{currentCourse.title} • {new Date(currentCourse.date).toLocaleDateString()}</p>
                        <div className="mt-2 text-sm flex gap-4">
                            <span className="text-green-600 font-bold bg-green-50 px-2 py-1 rounded">Recebido: R$ {totalPaid.toFixed(2)}</span>
                            <span className="text-gray-600 font-bold bg-gray-100 px-2 py-1 rounded">Total Previsto: R$ {totalPotential.toFixed(2)}</span>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setEditingEnrollment({ status: 'Confirmed', amountPaid: 0 })} className="bg-wtech-gold text-black px-4 py-2 rounded font-bold flex items-center gap-2 hover:bg-yellow-500">
                            <Plus size={18} /> Adicionar Aluno
                        </button>
                        <button onClick={printList} className="bg-black text-white px-4 py-2 rounded font-bold flex items-center gap-2 hover:bg-gray-800">
                            <Printer size={18} /> Imprimir Lista
                        </button>
                    </div>
                </div>

                {/* Enrollment Edit Form */}
                {editingEnrollment && (
                    <div className="mb-6 bg-gray-50 p-6 rounded-lg border border-gray-200 animate-in fade-in slide-in-from-top-2 print:hidden">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-lg">{editingEnrollment.id ? 'Editar Aluno' : 'Novo Aluno'}</h3>
                            <button onClick={() => setEditingEnrollment(null)}><X size={18} /></button>
                        </div>
                        <form onSubmit={handleSaveEnrollment} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* ... Fields ... reuse previous fields ... */}
                            <div>
                                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Nome Completo</label>
                                <input required className="w-full p-2 border rounded" value={editingEnrollment.studentName || ''} onChange={e => setEditingEnrollment({ ...editingEnrollment, studentName: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Email</label>
                                <input type="email" className="w-full p-2 border rounded" value={editingEnrollment.studentEmail || ''} onChange={e => setEditingEnrollment({ ...editingEnrollment, studentEmail: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Telefone/WhatsApp</label>
                                <input className="w-full p-2 border rounded" value={editingEnrollment.studentPhone || ''} onChange={e => setEditingEnrollment({ ...editingEnrollment, studentPhone: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Status</label>
                                <select className="w-full p-2 border rounded" value={editingEnrollment.status || 'Confirmed'} onChange={e => setEditingEnrollment({ ...editingEnrollment, status: e.target.value as any })}>
                                    <option value="Pending">Pendente</option>
                                    <option value="Confirmed">Confirmado</option>
                                    <option value="CheckedIn">Presente (Check-in)</option>
                                </select>
                            </div>

                            {/* Financial Fields */}
                            <div className="md:col-span-2 grid grid-cols-3 gap-4 border-t border-gray-200 pt-4 mt-2">
                                <div>
                                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Valor do Curso</label>
                                    <div className="text-lg font-bold text-gray-900">R$ {currentCourse.price?.toFixed(2)}</div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Valor Pago (Sinal/Total)</label>
                                    <input type="number" step="0.01" className="w-full p-2 border rounded font-bold text-green-700" value={editingEnrollment.amountPaid || 0} onChange={e => setEditingEnrollment({ ...editingEnrollment, amountPaid: parseFloat(e.target.value) })} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Saldo a Pagar</label>
                                    <div className="text-lg font-bold text-red-600">
                                        R$ {((currentCourse.price || 0) - (editingEnrollment.amountPaid || 0)).toFixed(2)}
                                    </div>
                                </div>
                                <div className="col-span-3">
                                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Método de Pagamento</label>
                                    <div className="flex gap-2">
                                        {['Pix', 'Cartão Crédito', 'Cartão Débito', 'Dinheiro', 'Boleto'].map(method => (
                                            <button
                                                key={method}
                                                type="button"
                                                onClick={() => setEditingEnrollment({ ...editingEnrollment, paymentMethod: method })}
                                                className={`px-3 py-1 rounded border text-xs font-bold ${editingEnrollment.paymentMethod === method ? 'bg-wtech-black text-white border-black' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                                            >
                                                {method}
                                            </button>
                                        ))}
                                    </div>
                                    <input placeholder="Outro método..." className="w-full p-2 border rounded mt-2 text-sm" value={editingEnrollment.paymentMethod || ''} onChange={e => setEditingEnrollment({ ...editingEnrollment, paymentMethod: e.target.value })} />
                                </div>
                            </div>

                            <div className="md:col-span-2 flex justify-end gap-2 mt-4">
                                <button type="button" onClick={() => setEditingEnrollment(null)} className="px-4 py-2 text-gray-500 font-bold">Cancelar</button>
                                <button type="submit" className="px-6 py-2 bg-wtech-black text-white rounded font-bold hover:bg-gray-800">Salvar Aluno</button>
                            </div>
                        </form>
                    </div>
                )}

                {/* ... Table ... */}
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-800 uppercase font-bold text-xs border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3">Nome do Aluno</th>
                                <th className="px-6 py-3">Contato</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3">Financeiro</th>
                                <th className="px-6 py-3 print:hidden">Ações</th>
                                <th className="px-6 py-3 hidden print:table-cell">Assinatura</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-gray-900">
                            {enrollments.length > 0 ? (
                                enrollments.map((enr, idx) => {
                                    const balance = (currentCourse.price || 0) - (enr.amountPaid || 0);
                                    return (
                                        <tr key={enr.id} className="group hover:bg-gray-50">
                                            <td className="px-6 py-4 font-bold">
                                                {idx + 1}. {enr.studentName}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div>{enr.studentEmail}</div>
                                                <div className="text-xs text-gray-500">{enr.studentPhone}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${enr.status === 'CheckedIn' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                    {enr.status === 'CheckedIn' ? 'Presente' : 'Confirmado'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-green-700">Pago: R$ {enr.amountPaid?.toFixed(2)}</div>
                                                {balance > 0 ? (
                                                    <div className="text-xs text-red-600 font-bold">Resta: R$ {balance.toFixed(2)}</div>
                                                ) : (
                                                    <div className="text-xs text-blue-600 font-bold bg-blue-50 inline-block px-1 rounded">Quitado</div>
                                                )}
                                                <div className="text-[10px] text-gray-400 mt-1">{enr.paymentMethod || '-'}</div>
                                            </td>
                                            <td className="px-6 py-4 print:hidden">
                                                <div className="flex items-center gap-2">
                                                    <button onClick={() => toggleCheckIn(enr.id, enr.status)} title="Check-in Rápido" className={`p-1.5 rounded border ${enr.status === 'CheckedIn' ? 'text-green-600 border-green-200 bg-green-50' : 'text-gray-400 border-gray-200 hover:bg-gray-100'}`}>
                                                        <CheckCircle size={16} />
                                                    </button>

                                                    {balance > 0 && (
                                                        <button onClick={() => handleSettleBalance(enr, balance)} title={`Quitar Saldo (R$ ${balance.toFixed(2)})`} className="p-1.5 text-green-600 hover:bg-green-50 rounded bg-green-50/50 border border-green-200">
                                                            <DollarSign size={16} />
                                                        </button>
                                                    )}

                                                    <button onClick={() => setEditingEnrollment(enr)} title="Editar" className="p-1.5 text-blue-600 hover:bg-blue-50 rounded">
                                                        <Edit size={16} />
                                                    </button>
                                                    <button onClick={() => handleDeleteEnrollment(enr.id)} title="Excluir" className="p-1.5 text-red-600 hover:bg-red-50 rounded">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 hidden print:table-cell border-b border-gray-100 h-16 w-64"></td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">Nenhum aluno inscrito ainda.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Settle Modal */}
                {
                    settleModal.isOpen && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
                            <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md border border-gray-100">
                                <h3 className="text-xl font-black text-gray-900 mb-2">Quitar Saldo Restante</h3>
                                <p className="text-gray-500 mb-6">Confirmar recebimento do valor pendente.</p>

                                <div className="bg-gray-50 p-4 rounded-lg mb-6 border border-gray-100">
                                    <div className="flex justify-between mb-2">
                                        <span className="text-sm font-bold text-gray-500">Aluno</span>
                                        <span className="font-bold">{settleModal.enrollment?.studentName}</span>
                                    </div>
                                    <div className="flex justify-between mb-2">
                                        <span className="text-sm font-bold text-gray-500">Valor a Pagar</span>
                                        <span className="font-bold text-green-600 text-lg">R$ {settleModal.amount.toFixed(2)}</span>
                                    </div>
                                </div>

                                <div className="mb-6">
                                    <label className="block text-sm font-bold mb-2 text-gray-700">Forma de Pagamento</label>
                                    <select
                                        className="w-full p-3 border border-gray-300 rounded-lg font-bold text-gray-800 focus:ring-2 focus:ring-wtech-gold focus:border-transparent outline-none"
                                        value={settleMethod}
                                        onChange={e => setSettleMethod(e.target.value)}
                                    >
                                        <option value="Pix">Pix</option>
                                        <option value="Cartão Crédito">Cartão de Crédito</option>
                                        <option value="Cartão Débito">Cartão de Débito</option>
                                        <option value="Dinheiro">Dinheiro</option>
                                        <option value="Boleto">Boleto</option>
                                    </select>
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setSettleModal({ ...settleModal, isOpen: false })}
                                        className="flex-1 py-3 border border-gray-200 rounded-lg font-bold text-gray-600 hover:bg-gray-50"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={confirmSettle}
                                        className="flex-1 py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 shadow-lg shadow-green-200"
                                    >
                                        Confirmar Pagamento
                                    </button>
                                </div>
                            </div>
                        </div>
                    )
                }
            </div>
        );
    }

    const Table = () => (
        <>
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left font-bold text-sm">
                    <thead className="bg-[#eff6ff] text-[#1e3a8a] text-xs uppercase">
                        <tr>
                            <th className="p-4">Evento</th>
                            <th className="p-4">Data</th>
                            <th className="p-4 text-center">Inscritos</th>
                            <th className="p-4 text-center">Status</th>
                            <th className="p-4 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-gray-600">
                        {filteredCourses.length > 0 ? (
                            filteredCourses.map(course => (
                                <tr key={course.id} className="hover:bg-gray-50">
                                    <td className="p-4">
                                        <div className="text-blue-700 font-bold">{course.title}</div>
                                        <div className="text-xs text-gray-400">{course.location}</div>
                                    </td>
                                    <td className="p-4 text-gray-800 font-bold">
                                        {new Date(course.date).toLocaleDateString()}
                                        <div className="text-xs text-gray-400 font-normal">{new Date(course.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                    </td>
                                    <td className="p-4 text-center">
                                        <button
                                            onClick={() => {
                                                setCurrentCourse(course);
                                                fetchEnrollments(course.id);
                                                setShowEnrollments(true);
                                            }}
                                            className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-xs font-bold hover:bg-blue-100 transition-colors"
                                        >
                                            {course.registeredCount} / {course.capacity} (Ver Lista)
                                        </button>
                                    </td>
                                    <td className="p-4 text-center">
                                        <span className="bg-gray-100 text-gray-600 text-[10px] px-2 py-1 rounded uppercase font-bold border border-gray-200">
                                            {course.status}
                                        </span>
                                    </td>
                                    <td className="p-4 flex gap-2 justify-end">
                                        {isLevel10() && (
                                            <button onClick={() => handleOpenReport(course)} title="Relatório Gerencial (Nível 10)" className="p-2 text-black bg-wtech-gold hover:bg-yellow-500 rounded transition-colors shadow-sm"><BarChart3 size={16} /></button>
                                        )}
                                        {hasPermission('courses_edit_lp') && (
                                            <button onClick={() => setEditingLandingPage(course)} title="Gerenciar Landing Page" className="p-2 text-purple-600 hover:bg-purple-50 rounded transition-colors"><Globe size={16} /></button>
                                        )}
                                        {hasPermission('courses_add_student') && (
                                            <button onClick={() => handleQuickAddStudent(course)} title="Adicionar Aluno Rápido" className="p-2 text-green-600 hover:bg-green-50 rounded transition-colors"><UserPlus size={16} /></button>
                                        )}
                                        {hasPermission('courses_edit') && (
                                            <button onClick={() => handleEdit(course)} title="Editar Curso" className="p-2 text-gray-400 hover:text-blue-600 transition-colors"><Edit size={16} /></button>
                                        )}
                                        {hasPermission('courses_delete') && (
                                            <button onClick={() => handleDelete(course.id)} title="Excluir Curso" className="p-2 text-gray-400 hover:text-red-600 transition-colors"><Trash2 size={16} /></button>
                                        )}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={5} className="p-8 text-center text-gray-400 italic">
                                    {searchTerm ? 'Nenhum curso encontrado.' : 'Nenhum curso cadastrado.'}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {editingLandingPage && (
                <LandingPageEditor
                    course={editingLandingPage}
                    onClose={() => setEditingLandingPage(null)}
                />
            )}

            {/* RELATÓRIO DE CURSO (NÍVEL 10) */}
            {showReportModal && reportCourse && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="bg-wtech-black text-white p-6 flex justify-between items-center">
                            <div>
                                <div className="text-wtech-gold text-xs font-bold uppercase tracking-widest mb-1">Relatório Gerencial (Nível 10)</div>
                                <h2 className="text-2xl font-black uppercase">{reportCourse.title}</h2>
                                <p className="text-gray-400 text-sm">Análise completa de performance e financeiro.</p>
                            </div>
                            <button onClick={() => setShowReportModal(false)} className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 overflow-y-auto flex-1 bg-gray-50">
                            {reportLoading ? (
                                <div className="flex flex-col items-center justify-center h-64">
                                    <Loader2 size={48} className="text-wtech-gold animate-spin mb-4" />
                                    <p className="text-gray-500 font-bold animate-pulse">Gerando Relatório...</p>
                                </div>
                            ) : (
                                <div className="space-y-8">
                                    {/* KPI Grid */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-blue-500">
                                            <p className="text-gray-500 text-xs font-bold uppercase mb-1">Receita Bruta</p>
                                            <h3 className="text-3xl font-black text-gray-900">R$ {reportData.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                                            <p className="text-xs text-blue-500 font-medium mt-1">Total de Vendas ({reportData.enrollmentsCount})</p>
                                        </div>
                                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-red-500">
                                            <p className="text-gray-500 text-xs font-bold uppercase mb-1">Despesas Totais</p>
                                            <h3 className="text-3xl font-black text-gray-900">R$ {(reportData.expenses || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                                            <p className="text-xs text-red-500 font-medium mt-1">Custos operacionais</p>
                                        </div>
                                        <div className={`bg-white p-6 rounded-xl shadow-sm border border-gray-100 border-l-4 ${(reportData.netResult || 0) >= 0 ? 'border-l-green-500' : 'border-l-red-500'}`}>
                                            <p className="text-gray-500 text-xs font-bold uppercase mb-1">Resultado Líquido</p>
                                            <h3 className={`text-3xl font-black ${(reportData.netResult || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                R$ {(reportData.netResult || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </h3>
                                            <p className="text-xs text-gray-400 font-medium mt-1">Lucro da operação</p>
                                        </div>

                                        {/* Row 2 */}
                                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-wtech-gold">
                                            <p className="text-gray-500 text-xs font-bold uppercase mb-1">Total de Leads</p>
                                            <h3 className="text-3xl font-black text-gray-900">{reportData.leadsCount}</h3>
                                            <p className="text-xs text-yellow-600 font-medium mt-1">
                                                Conversão: {reportData.leadsCount > 0 ? ((reportData.enrollmentsCount / reportData.leadsCount) * 100).toFixed(1) : 0}%
                                            </p>
                                        </div>
                                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-purple-500">
                                            <p className="text-gray-500 text-xs font-bold uppercase mb-1">Em Atendimento</p>
                                            <h3 className="text-3xl font-black text-gray-900">{reportData.inProgressCount}</h3>
                                            <p className="text-xs text-purple-600 font-medium mt-1">Funil de Vendas</p>
                                        </div>
                                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-gray-500">
                                            <p className="text-gray-500 text-xs font-bold uppercase mb-1">Custo por Lead</p>
                                            <h3 className="text-3xl font-black text-gray-900">
                                                R$ {reportData.leadsCount > 0 ? ((reportData.expenses || 0) / reportData.leadsCount).toFixed(2) : '0,00'}
                                            </h3>
                                            <p className="text-xs text-gray-400 font-medium mt-1">Eficiência de Mkt</p>
                                        </div>
                                    </div>

                                    {/* Charts / Funnel (Simplified Visual) */}
                                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                                        <h4 className="font-bold text-gray-800 mb-6 flex items-center gap-2"><Filter size={18} /> Funil de Vendas do Curso</h4>
                                        <div className="flex flex-col gap-2">
                                            {/* Top Funnel */}
                                            <div className="w-full bg-blue-50 rounded-lg p-3 relative overflow-hidden group">
                                                <div className="flex justify-between relative z-10 text-blue-900 font-bold text-sm">
                                                    <span>Visitas / Leads</span>
                                                    <span>{reportData.leadsCount}</span>
                                                </div>
                                                <div className="absolute top-0 left-0 h-full bg-blue-200 w-full opacity-30"></div>
                                            </div>
                                            {/* Mid Funnel */}
                                            <div className="w-[80%] mx-auto bg-yellow-50 rounded-lg p-3 relative overflow-hidden group">
                                                <div className="flex justify-between relative z-10 text-yellow-900 font-bold text-sm">
                                                    <span>Em Negociação</span>
                                                    <span>{reportData.inProgressCount}</span>
                                                </div>
                                                <div className="absolute top-0 left-0 h-full bg-yellow-200 w-full opacity-30"></div>
                                            </div>
                                            {/* Bottom Funnel */}
                                            <div className="w-[60%] mx-auto bg-green-50 rounded-lg p-3 relative overflow-hidden group">
                                                <div className="flex justify-between relative z-10 text-green-900 font-bold text-sm">
                                                    <span>Matriculados</span>
                                                    <span>{reportData.enrollmentsCount}</span>
                                                </div>
                                                <div className="absolute top-0 left-0 h-full bg-green-200 w-full opacity-30"></div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Student List Table */}
                                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                        <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                                            <h4 className="font-bold text-gray-800 flex items-center gap-2"><Users size={18} /> Lista de Inscritos ({reportData.studentsList?.length || 0})</h4>
                                            <button
                                                onClick={() => {
                                                    const csv = [
                                                        ['Nome', 'Email', 'Telefone', 'Status', 'Valor Pago', 'Total Curso'],
                                                        ...reportData.studentsList.map((s: any) => [
                                                            s.name,
                                                            s.email,
                                                            s.phone,
                                                            s.status,
                                                            s.paid,
                                                            reportCourse.price
                                                        ])
                                                    ].map(e => e.join(',')).join('\n');
                                                    const blob = new Blob([csv], { type: 'text/csv' });
                                                    const url = window.URL.createObjectURL(blob);
                                                    const a = document.createElement('a');
                                                    a.href = url;
                                                    a.download = `Relatorio_${reportCourse.title}.csv`;
                                                    a.click();
                                                }}
                                                className="text-xs bg-white border border-gray-300 px-3 py-1 rounded font-bold hover:bg-gray-50 flex items-center gap-1"
                                            >
                                                <Download size={12} /> CSV
                                            </button>
                                        </div>
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-gray-100 text-gray-500 font-bold text-xs uppercase">
                                                <tr>
                                                    <th className="px-4 py-3">Aluno</th>
                                                    <th className="px-4 py-3">Contato</th>
                                                    <th className="px-4 py-3 text-center">Status</th>
                                                    <th className="px-4 py-3 text-right">Pago</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {reportData.studentsList?.map((student: any, idx: number) => (
                                                    <tr key={idx} className="hover:bg-gray-50">
                                                        <td className="px-4 py-3 font-bold text-gray-800">{student.name}</td>
                                                        <td className="px-4 py-3 text-gray-500">
                                                            <div className="text-xs">{student.email}</div>
                                                            <div className="text-xs">{student.phone}</div>
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${student.status === 'Confirmed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                                {student.status}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-right font-bold text-gray-700">
                                                            R$ {student.paid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                        </td>
                                                    </tr>
                                                ))}
                                                {(!reportData.studentsList || reportData.studentsList.length === 0) && (
                                                    <tr>
                                                        <td colSpan={4} className="p-8 text-center text-gray-400 italic">Nenhum aluno matriculado ainda.</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="p-4 border-t border-gray-100 flex justify-end bg-gray-50">
                            <button onClick={printSingleCourseReport} className="bg-wtech-black text-white px-6 py-2 rounded-lg font-bold hover:bg-gray-800 flex items-center gap-2">
                                <Printer size={16} /> Imprimir Relatório
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );





    return (
        <div className="text-gray-900 pb-20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h2 className="text-xl font-bold">Gestão de Cursos e Eventos</h2>
                </div>

                <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                    {/* Search Bar */}
                    <div className="relative">
                        <input
                            className="pl-8 pr-4 py-2 border rounded-lg focus:outline-none focus:border-wtech-gold w-full md:w-64"
                            placeholder="Buscar curso..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <Search className="absolute left-2 top-2.5 text-gray-400" size={16} />
                    </div>

                    {/* Date Filter */}
                    <div className="flex items-center gap-2 bg-white border rounded-lg px-2 py-1">
                        <span className="text-xs font-bold text-gray-400 uppercase">Período:</span>
                        <input type="date" className="text-sm border-none focus:ring-0 text-gray-600" value={dateRange.start} onChange={e => setDateRange({ ...dateRange, start: e.target.value })} />
                        <span className="text-gray-400">-</span>
                        <input type="date" className="text-sm border-none focus:ring-0 text-gray-600" value={dateRange.end} onChange={e => setDateRange({ ...dateRange, end: e.target.value })} />
                        {(dateRange.start || dateRange.end) && (
                            <button onClick={() => setDateRange({ start: '', end: '' })} className="text-gray-400 hover:text-red-500"><X size={14} /></button>
                        )}
                    </div>

                    <div className="h-8 w-px bg-gray-300 mx-2"></div>

                    <button onClick={downloadCoursesReport} className="bg-green-100 text-green-800 border border-green-200 px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-green-200 transition-colors" title="Exportar Relatório CSV">
                        <Download size={16} /> Relatório
                    </button>

                    <button onClick={handlePrintCoursesReport} className="bg-gray-100 text-gray-800 border border-gray-200 px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-gray-200 transition-colors" title="Imprimir Lista">
                        <Printer size={16} /> Imprimir
                    </button>

                    {/* View Toggles */}
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        <button onClick={() => setViewMode('calendar')} className={`px-3 py-1.5 rounded text-sm font-bold ${viewMode === 'calendar' ? 'bg-white shadow-sm' : 'text-gray-500'}`}>Calendário</button>
                        <button onClick={() => setViewMode('list')} className={`px-3 py-1.5 rounded text-sm font-bold ${viewMode === 'list' ? 'bg-white shadow-sm' : 'text-gray-500'}`}>Lista</button>
                    </div>
                </div>
            </div>

            {viewMode === 'list' && (
                <div className="mb-4 flex items-center gap-2">
                    <button
                        onClick={() => setShowPastCourses(!showPastCourses)}
                        className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors ${showPastCourses ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-500 border-gray-200'}`}
                    >
                        {showPastCourses ? 'Mostrando Histórico Completo' : 'Ocultar Cursos Passados'}
                    </button>
                </div>
            )}

            {viewMode === 'calendar' && (
                <div className="mb-4 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        <button onClick={() => setCalendarViewMode('Month')} className={`px-3 py-1 rounded text-xs font-bold ${calendarViewMode === 'Month' ? 'bg-white shadow-sm' : 'text-gray-500'}`}>Mês</button>
                        <button onClick={() => setCalendarViewMode('Week')} className={`px-3 py-1 rounded text-xs font-bold ${calendarViewMode === 'Week' ? 'bg-white shadow-sm' : 'text-gray-500'}`}>Início (7 Dias)</button>
                        <button onClick={() => setCalendarViewMode('Year')} className={`px-3 py-1 rounded text-xs font-bold ${calendarViewMode === 'Year' ? 'bg-white shadow-sm' : 'text-gray-500'}`}>Ano</button>
                    </div>

                    <div className="flex items-center gap-4 bg-white border border-gray-200 p-2 rounded-lg shadow-sm">
                        <button onClick={() => setCurrentDate(new Date(currentDate.setFullYear(currentDate.getFullYear() - 1)))} className="p-1 hover:bg-gray-100 rounded" title="Ano Anterior">
                            <ChevronLeft size={16} />
                        </button>
                        <span className="font-bold text-lg min-w-[60px] text-center">{currentDate.getFullYear()}</span>
                        <button onClick={() => setCurrentDate(new Date(currentDate.setFullYear(currentDate.getFullYear() + 1)))} className="p-1 hover:bg-gray-100 rounded" title="Próximo Ano">
                            <ChevronRight size={16} />
                        </button>

                        {calendarViewMode === 'Month' && (
                            <>
                                <div className="h-4 w-px bg-gray-300 mx-2"></div>
                                <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))} className="p-1 hover:bg-gray-100 rounded" title="Mês Anterior">
                                    <ChevronLeft size={16} />
                                </button>
                                <span className="font-bold w-[100px] text-center capitalize">{currentDate.toLocaleString('default', { month: 'long' })}</span>
                                <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))} className="p-1 hover:bg-gray-100 rounded" title="Próximo Mês">
                                    <ChevronRight size={16} />
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}


            {/* INLINE FORM / TOP INSERTION */}
            {isEditing && (
                <div className="mb-8 bg-white p-8 rounded-xl shadow-lg border-2 border-wtech-gold/20 animate-in slide-in-from-top-4 relative">
                    {/* ... Form ... */}
                    <button onClick={() => setIsEditing(false)} className="absolute top-4 right-4 text-gray-400 hover:text-black"><X size={20} /></button>
                    <h2 className="text-xl font-bold mb-6 text-gray-900 flex items-center gap-2">
                        <GraduationCap className="text-wtech-gold" /> {formData.id ? 'Editar Curso' : 'Novo Curso'}
                    </h2>
                    <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-6 text-gray-900">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-bold mb-1 text-gray-700">Título do Evento</label>
                            <input className="w-full border border-gray-300 p-2 rounded text-gray-900" value={formData.title || ''} onChange={e => setFormData({ ...formData, title: e.target.value })} required />
                        </div>

                        {/* Date & Time */}
                        <div className="grid grid-cols-4 gap-4 md:col-span-2">
                            <div>
                                <label className="block text-sm font-bold mb-1 text-gray-700">Data Início</label>
                                <input type="date" className="w-full border border-gray-300 p-2 rounded text-gray-900" value={formData.date ? formData.date.split('T')[0] : ''} onChange={e => setFormData({ ...formData, date: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-1 text-gray-700">Data Término</label>
                                <input type="date" className="w-full border border-gray-300 p-2 rounded text-gray-900" value={formData.dateEnd ? formData.dateEnd.split('T')[0] : ''} onChange={e => setFormData({ ...formData, dateEnd: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-1 text-gray-700">Hora Início</label>
                                <input type="time" className="w-full border border-gray-300 p-2 rounded text-gray-900" value={formData.startTime || ''} onChange={e => setFormData({ ...formData, startTime: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-1 text-gray-700">Hora Fim</label>
                                <input type="time" className="w-full border border-gray-300 p-2 rounded text-gray-900" value={formData.endTime || ''} onChange={e => setFormData({ ...formData, endTime: e.target.value })} />
                            </div>
                        </div>

                        {/* LOCATION SECTION */}
                        <div className="md:col-span-2 border-t pt-4 mt-2">
                            <label className="block text-sm font-bold mb-3 text-gray-800 uppercase flex items-center gap-2"><MapPin size={16} /> Localização e Endereço</label>
                            <div className="grid grid-cols-4 gap-4">
                                <div>
                                    <label className="block text-xs font-bold mb-1 text-gray-500">CEP</label>
                                    <input className="w-full border border-gray-300 p-2 rounded text-gray-900" value={formData.zipCode || ''} onChange={e => setFormData({ ...formData, zipCode: e.target.value })} onBlur={handleBlurCEP} placeholder="00000-000" />
                                </div>
                                <div className="col-span-3">
                                    <label className="block text-xs font-bold mb-1 text-gray-500">Endereço (Rua/Av)</label>
                                    <input className="w-full border border-gray-300 p-2 rounded text-gray-900" value={formData.address || ''} onChange={e => setFormData({ ...formData, address: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold mb-1 text-gray-500">Número</label>
                                    <input className="w-full border border-gray-300 p-2 rounded text-gray-900" value={formData.addressNumber || ''} onChange={e => setFormData({ ...formData, addressNumber: e.target.value })} onBlur={handleGeocodeCourse} placeholder="Ex: 123" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold mb-1 text-gray-500">Bairro</label>
                                    <input className="w-full border border-gray-300 p-2 rounded text-gray-900" value={formData.addressNeighborhood || ''} onChange={e => setFormData({ ...formData, addressNeighborhood: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold mb-1 text-gray-500">Cidade</label>
                                    <input className="w-full border border-gray-300 p-2 rounded text-gray-900" value={formData.city || ''} onChange={e => setFormData({ ...formData, city: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold mb-1 text-gray-500">Estado</label>
                                    <input className="w-full border border-gray-300 p-2 rounded text-gray-900" value={formData.state || ''} onChange={e => setFormData({ ...formData, state: e.target.value })} />
                                </div>
                                <div className="col-span-4">
                                    <label className="block text-xs font-bold mb-1 text-gray-500">Local (Exibido no Cabeçalho)</label>
                                    <input className="w-full border border-gray-300 p-2 rounded text-gray-900" value={formData.location || ''} onChange={e => setFormData({ ...formData, location: e.target.value })} />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-bold mb-1 text-gray-500">Latitude</label>
                                    <input className="w-full border border-gray-300 p-2 rounded text-gray-900 bg-gray-50" value={formData.latitude || ''} readOnly />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-bold mb-1 text-gray-500">Longitude</label>
                                    <input className="w-full border border-gray-300 p-2 rounded text-gray-900 bg-gray-50" value={formData.longitude || ''} readOnly />
                                </div>
                                <div className="col-span-4">
                                    <button type="button" onClick={handleGeocodeCourse} className="text-xs bg-blue-50 text-blue-700 px-3 py-1 rounded font-bold hover:bg-blue-100 border border-blue-200">
                                        📍 Atualizar Pin no Mapa (Forçar)
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold mb-1 text-gray-700">Tipo</label>
                            <select className="w-full border border-gray-300 p-2 rounded text-gray-900" value={formData.locationType || 'Presencial'} onChange={e => setFormData({ ...formData, locationType: e.target.value as any })}>
                                <option value="Presencial">Presencial</option>
                                <option value="Online">Online</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-bold mb-1 text-gray-700">Instrutor</label>
                            <input className="w-full border border-gray-300 p-2 rounded text-gray-900" value={formData.instructor || ''} onChange={e => setFormData({ ...formData, instructor: e.target.value })} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold mb-1 text-gray-700">Valor (R$)</label>
                                <input type="number" className="w-full border border-gray-300 p-2 rounded text-gray-900" value={formData.price || ''} onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) })} placeholder="0.00" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-1 text-gray-700">Vagas / Cotas</label>
                                <input type="number" className="w-full border border-gray-300 p-2 rounded text-gray-900" value={formData.capacity || ''} onChange={e => setFormData({ ...formData, capacity: parseInt(e.target.value) })} placeholder="Ex: 50" />
                            </div>
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-bold mb-1 text-gray-700">Imagem de Capa (URL)</label>
                            <input className="w-full border border-gray-300 p-2 rounded text-gray-900" value={formData.image || ''} onChange={e => setFormData({ ...formData, image: e.target.value })} placeholder="https://..." />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-bold mb-1 text-gray-700">URL do Mapa (Opcional - Gerado Automático)</label>
                            <input className="w-full border border-gray-300 p-2 rounded text-gray-900" value={formData.mapUrl || ''} onChange={e => setFormData({ ...formData, mapUrl: e.target.value })} placeholder="https://maps.google.com/..." />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-bold mb-1 text-gray-700">Cronograma / Conteúdo</label>
                            <textarea rows={5} className="w-full border border-gray-300 p-2 rounded text-gray-900" value={formData.schedule || ''} onChange={e => setFormData({ ...formData, schedule: e.target.value })} placeholder="08:00 - Café da manhã..." />
                        </div>

                        <div className="md:col-span-2 flex justify-end gap-2">
                            <button type="button" onClick={() => setIsEditing(false)} className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-100">Cancelar</button>
                            <button type="submit" className="px-6 py-2 bg-wtech-black text-white rounded hover:bg-black font-bold">Salvar Curso</button>
                        </div>
                    </form>
                </div>
            )}

            {!isEditing && hasPermission('courses_add') && (
                <div className="mb-4">
                    <button onClick={() => handleEdit()} className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 font-bold hover:border-wtech-gold hover:text-wtech-gold transition-colors flex items-center justify-center gap-2">
                        <Plus size={20} /> Adicionar Novo Curso no Topo
                    </button>
                </div>
            )}

            {/* DATA DISPLAY */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden min-h-[400px]">
                {viewMode === 'list' ? (
                    <Table />
                ) : (
                    <div className="p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-gray-700">Calendário de {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h3>
                            <span className="text-xs text-gray-400">Navegue acima para mudar</span>
                        </div>
                        <CalendarGrid />
                    </div>
                )}
            </div>
        </div>
    );
};

const MechanicsView = () => {
    const [mechanics, setMechanics] = useState<Mechanic[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [formData, setFormData] = useState<Partial<Mechanic>>({});

    // Search & Selection State
    const [searchTerm, setSearchTerm] = useState('');
    const [filterMissingGPS, setFilterMissingGPS] = useState(false);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 15;

    const { user } = useAuth(); // Assuming useAuth provides user and role info

    // --- Permissions Helper ---
    // --- Permissions Helper ---
    const hasPermission = (key: string) => {
        if (!user || !user.role) return false;

        // Handle String Role (Legacy/Simple Auth)
        if (typeof user.role === 'string') {
            return user.role === 'Super Admin' || user.role === 'Admin';
        }

        // Handle Object Role
        // Super Admin Level 10 Override
        if (user.role.level >= 10 || user.role.name === 'Super Admin') return true;

        if (user.role.permissions && user.role.permissions.admin_access) return true;
        return !!(user.role.permissions && user.role.permissions[key]);
    };

    useEffect(() => {
        fetchMechanics();
    }, []);

    const fetchMechanics = async () => {
        const { data, error } = await supabase.from('SITE_Mechanics').select('*').order('created_at', { ascending: false });
        if (error) console.error('Error fetching mechanics:', error);
        if (data) setMechanics(data.map((m: any) => ({ ...m, workshopName: m.workshop_name, cpfCnpj: m.cpf_cnpj })));
    };

    const toggleStatus = async (id: string, current: string) => {
        const newStatus = current === 'Approved' ? 'Pending' : 'Approved';
        await supabase.from('SITE_Mechanics').update({ status: newStatus }).eq('id', id);
        setMechanics(prev => prev.map(m => m.id === id ? { ...m, status: newStatus as any } : m));
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este credenciado?')) return;
        await supabase.from('SITE_Mechanics').delete().eq('id', id);
        setMechanics(prev => prev.filter(m => m.id !== id));
        setSelectedIds(prev => prev.filter(sid => sid !== id));
    };

    const handleBulkDelete = async () => {
        if (!confirm(`Tem certeza que deseja excluir ${selectedIds.length} credenciados?`)) return;
        await supabase.from('SITE_Mechanics').delete().in('id', selectedIds);
        setMechanics(prev => prev.filter(m => !selectedIds.includes(m.id)));
        setSelectedIds([]);
    };



    const toggleSelect = (id: string) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const payload = {
            name: formData.name,
            workshop_name: formData.workshopName,
            city: formData.city,
            state: formData.state,
            email: formData.email,
            phone: formData.phone,
            status: formData.status || 'Pending',
            specialty: formData.specialty || [],
            street: formData.street,
            number: formData.number,
            zip_code: formData.zipCode,
            district: formData.district,
            latitude: formData.latitude,
            longitude: formData.longitude,
            cpf_cnpj: formData.cpfCnpj,
            group: formData.group
        };

        if (formData.id) {
            await supabase.from('SITE_Mechanics').update(payload).eq('id', formData.id);
        } else {
            await supabase.from('SITE_Mechanics').insert([payload]);
        }
        setIsEditing(false);
        fetchMechanics();
    };

    const handleGeocode = async () => {
        if (!formData.city || !formData.state) {
            alert('Preencha Cidade e Estado para buscar coordenadas.');
            return;
        }

        try {
            // Priority 1: Full Address
            let addressQuery = `${formData.street || ''}, ${formData.number || ''}, ${formData.city}, ${formData.state}, Brazil`;
            let response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressQuery)}`);
            let data = await response.json();

            // Priority 2: Fallback to City Center
            if (!data || data.length === 0) {
                addressQuery = `${formData.city}, ${formData.state}, Brazil`;
                response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressQuery)}`);
                data = await response.json();
                if (data && data.length > 0) alert('Endereço exato não encontrado. Usando centro da cidade.');
            }

            if (data && data.length > 0) {
                const lat = parseFloat(data[0].lat);
                const lng = parseFloat(data[0].lon);
                setFormData({ ...formData, latitude: lat, longitude: lng });
                alert(`Coordenadas Encontradas!\nLat: ${lat}\nLng: ${lng}`);
            } else {
                alert('Endereço não encontrado no mapa.');
            }
        } catch (error) {
            console.error("Geocoding error:", error);
            alert('Erro ao buscar coordenadas.');
        }
    };

    const [processingCount, setProcessingCount] = useState({ current: 0, total: 0 });

    const handleBatchGeocode = async () => {
        // Fetch mechanics where latitude is NULL OR latitude is 0
        const { data: allMechanics } = await supabase.from('SITE_Mechanics').select('*');
        const missingCoords = allMechanics?.filter((m: any) => !m.latitude || m.latitude === 0 || !m.longitude || m.longitude === 0) || [];

        if (!missingCoords || missingCoords.length === 0) {
            alert('Todos os credenciados já possuem coordenadas!');
            return;
        }

        if (!confirm(`Desja buscar coordenadas para ${missingCoords.length} credenciados? Isso pode demorar alguns minutos.`)) return;

        setProcessingCount({ current: 0, total: missingCoords.length });
        let updated = 0;

        for (let i = 0; i < missingCoords.length; i++) {
            const mech = missingCoords[i];
            setProcessingCount({ current: i + 1, total: missingCoords.length });

            try {
                // Nominatim Rate Limit: Max 1 request per second
                await new Promise(resolve => setTimeout(resolve, 1200));

                // 1. Try Specific Address
                const addressQuery = `${mech.street || ''}, ${mech.number || ''}, ${mech.district || ''}, ${mech.city}, ${mech.state}, Brazil`;
                let response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressQuery)}`);
                let data = await response.json();

                // 2. Fallback to City Center
                if (!data || data.length === 0) {
                    await new Promise(resolve => setTimeout(resolve, 1200)); // Rate limit for 2nd try
                    const cityQuery = `${mech.city}, ${mech.state}, Brazil`;
                    response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cityQuery)}`);
                    data = await response.json();
                }

                if (data && data.length > 0) {
                    const lat = parseFloat(data[0].lat);
                    const lng = parseFloat(data[0].lon);

                    await supabase.from('SITE_Mechanics').update({
                        latitude: lat,
                        longitude: lng
                    }).eq('id', mech.id);
                    updated++;
                }
            } catch (err) {
                console.error(`Erro ao geocodificar ${mech.name}:`, err);
            }
        }

        alert(`Processo finalizado! ${updated} credenciados atualizados.`);
        setProcessingCount({ current: 0, total: 0 });
        fetchMechanics();
    };

    const handleQuickGeocode = async (mech: Mechanic) => {
        if (!mech.city || !mech.state) return alert('Cidade/Estado incompletos.');

        try {
            // 1. Try Exact Address
            const addressQuery = `${mech.street || ''}, ${mech.number || ''}, ${mech.city}, ${mech.state}, Brazil`;
            let response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressQuery)}`);
            let data = await response.json();

            // 2. Fallback to City Center
            if (!data || data.length === 0) {
                const cityQuery = `${mech.city}, ${mech.state}, Brazil`;
                response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cityQuery)}`);
                data = await response.json();
                if (data && data.length > 0) alert('Endereço exato não encontrado. PIN posicionado no centro da cidade.');
            }

            if (data && data.length > 0) {
                const lat = parseFloat(data[0].lat);
                const lng = parseFloat(data[0].lon);
                await supabase.from('SITE_Mechanics').update({ latitude: lat, longitude: lng }).eq('id', mech.id);
                setMechanics(prev => prev.map(m => m.id === mech.id ? { ...m, latitude: lat, longitude: lng } : m));
                alert('GPS Atualizado!');
            } else {
                alert('Endereço não encontrado.');
            }
        } catch (e) {
            alert('Erro ao buscar.');
        }
    };

    const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const text = await file.text();
        const rows = text.split('\n');

        let successCount = 0;
        let updateCount = 0;

        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (!row.trim()) continue;

            const cols = row.split(',').map(c => c.replace(/"/g, '').trim());
            const values = cols.length < 5 ? row.split(';').map(c => c.replace(/"/g, '').trim()) : cols;

            if (values.length >= 8) { // Strictness
                // Normalize
                const cpfRaw = values[10] || '';
                const emailRaw = values[9] || '';

                const payload = {
                    name: values[0],
                    workshop_name: values[1],
                    phone: values[2],
                    street: values[3],
                    number: values[4],
                    district: values[5],
                    zip_code: values[6]?.replace(/\D/g, ''),
                    city: values[7],
                    state: values[8],
                    email: emailRaw.toLowerCase(), // Normalize Email
                    cpf_cnpj: cpfRaw.replace(/\D/g, ''), // Normalize CPF (numbers only)
                    group: values[11],
                    status: 'Approved',
                    photo: `https://ui-avatars.com/api/?name=${values[0]}&background=random`
                };

                let existingId = null;

                // 1. Try by Normalized CPF/CNPJ
                if (payload.cpf_cnpj && payload.cpf_cnpj.length > 5) {
                    // Note: We need to search effectively. If DB has punctuation, this might fail unless we assume DB also normalized.
                    // Ideally we verify strictly. For this iteration, assuming standardized input.
                    const { data: existingCpf } = await supabase.from('SITE_Mechanics').select('id').eq('cpf_cnpj', payload.cpf_cnpj).maybeSingle();
                    if (existingCpf) existingId = existingCpf.id;
                }

                // 2. Try by Email
                if (!existingId && payload.email) {
                    const { data: existingEmail } = await supabase.from('SITE_Mechanics').select('id').ilike('email', payload.email).maybeSingle();
                    if (existingEmail) existingId = existingEmail.id;
                }

                // 3. Fallback: Workshop Name AND City match (for messy data)
                if (!existingId && payload.workshop_name && payload.city) {
                    const { data: existingName } = await supabase.from('SITE_Mechanics')
                        .select('id')
                        .ilike('workshop_name', payload.workshop_name)
                        .ilike('city', payload.city)
                        .maybeSingle();
                    if (existingName) existingId = existingName.id;
                }

                if (existingId) {
                    await supabase.from('SITE_Mechanics').update(payload).eq('id', existingId);
                    updateCount++;
                } else {
                    await supabase.from('SITE_Mechanics').insert([payload]);
                    successCount++;
                }
            }
        }
        alert(`Importação Concluída!\nNovos: ${successCount}\nAtualizados: ${updateCount}`);
        setIsImporting(false);
        fetchMechanics();
    };

    const filteredMechanics = mechanics.filter(m => {
        const matchesSearch = (m.workshopName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (m.city || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (m.state || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (String(m.group || '').toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesGPS = !filterMissingGPS || (!m.latitude || !m.longitude || m.latitude === 0);

        return matchesSearch && matchesGPS;
    });

    const toggleSelectAll = () => {
        if (selectedIds.length === filteredMechanics.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredMechanics.map(m => m.id));
        }
    };

    const totalPages = Math.ceil(filteredMechanics.length / itemsPerPage);
    const currentMechanics = filteredMechanics.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const nextPage = () => setCurrentPage((prev) => Math.min(prev + 1, totalPages));
    const prevPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));

    if (isEditing) {
        return (
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 text-gray-900">
                <h2 className="text-2xl font-bold mb-8 text-gray-900 flex items-center gap-2">
                    <Wrench className="text-wtech-gold" /> {formData.id ? 'Editar Credenciado' : 'Novo Credenciado'}
                </h2>
                <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-bold mb-1 text-gray-700">Nome Responsável</label>
                        <input className="w-full border border-gray-300 p-3 rounded-lg text-gray-900 focus:border-wtech-gold outline-none" value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-1 text-gray-700">Nome Oficina</label>
                        <input className="w-full border border-gray-300 p-3 rounded-lg text-gray-900 focus:border-wtech-gold outline-none" value={formData.workshopName || ''} onChange={e => setFormData({ ...formData, workshopName: e.target.value })} required />
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-1 text-gray-700">Email</label>
                        <input className="w-full border border-gray-300 p-3 rounded-lg text-gray-900 focus:border-wtech-gold outline-none" value={formData.email || ''} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-1 text-gray-700">Telefone</label>
                        <input className="w-full border border-gray-300 p-3 rounded-lg text-gray-900 focus:border-wtech-gold outline-none" value={formData.phone || ''} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-1 text-gray-700">CPF/CNPJ</label>
                        <input className="w-full border border-gray-300 p-3 rounded-lg text-gray-900 focus:border-wtech-gold outline-none" value={formData.cpfCnpj || ''} onChange={e => setFormData({ ...formData, cpfCnpj: e.target.value })} />
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-1 text-gray-700">Grupo</label>
                        <input className="w-full border border-gray-300 p-3 rounded-lg text-gray-900 focus:border-wtech-gold outline-none" value={formData.group || ''} onChange={e => setFormData({ ...formData, group: e.target.value })} />
                    </div>

                    {/* Address Section */}
                    <div className="col-span-1 md:col-span-2 mt-4 pt-4 border-t border-gray-100">
                        <h3 className="text-sm font-bold text-gray-400 uppercase mb-4">Endereço & Localização</h3>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">CEP</label>
                                <input className="w-full border border-gray-300 p-2 rounded text-gray-900" value={formData.zipCode || ''} onChange={e => setFormData({ ...formData, zipCode: e.target.value })} />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-gray-500 mb-1">Rua / Logradouro</label>
                                <input className="w-full border border-gray-300 p-2 rounded text-gray-900" value={formData.street || ''} onChange={e => setFormData({ ...formData, street: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Número</label>
                                <input className="w-full border border-gray-300 p-2 rounded text-gray-900" value={formData.number || ''} onChange={e => setFormData({ ...formData, number: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Bairro</label>
                                <input className="w-full border border-gray-300 p-2 rounded text-gray-900" value={formData.district || ''} onChange={e => setFormData({ ...formData, district: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Cidade</label>
                                <input className="w-full border border-gray-300 p-2 rounded text-gray-900" value={formData.city || ''} onChange={e => setFormData({ ...formData, city: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Estado</label>
                                <input className="w-full border border-gray-300 p-2 rounded text-gray-900" value={formData.state || ''} onChange={e => setFormData({ ...formData, state: e.target.value })} />
                            </div>
                            <div className="flex items-end">
                                <button type="button" onClick={handleGeocode} className="w-full bg-gray-100 border border-gray-300 text-gray-700 text-xs font-bold py-2.5 rounded hover:bg-gray-200">
                                    Buscar Coordenadas Real
                                </button>
                            </div>
                        </div>
                        {formData.latitude && formData.longitude && (
                            <div className="mt-4">
                                <label className="block text-xs font-bold text-gray-500 mb-1">Pré-visualização do Mapa</label>
                                <MapPreview lat={formData.latitude} lng={formData.longitude} />
                            </div>
                        )}
                    </div>

                    <div className="col-span-1 md:col-span-2 flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <button type="button" onClick={() => setIsEditing(false)} className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-bold hover:bg-gray-50">Cancelar</button>
                        <button type="submit" className="px-8 py-3 bg-wtech-gold text-black font-bold rounded-lg hover:bg-yellow-500 shadow-lg">Salvar</button>
                    </div>
                </form>
            </div>
        );
    }

    return (
        <div className="text-gray-900">
            <div className="flex flex-col gap-4 mb-6">
                {/* Header Row */}
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold">Oficinas Credenciadas</h2>
                    <div className="flex gap-2">
                        {processingCount.total > 0 && (
                            <div className="bg-yellow-100 text-yellow-800 px-4 py-2 rounded text-xs font-bold flex items-center gap-2">
                                <span className="animate-spin">⚙️</span> Processando {processingCount.current}/{processingCount.total}
                            </div>
                        )}

                        {!isImporting && processingCount.total === 0 && (
                            <button onClick={handleBatchGeocode} className="bg-blue-100 text-blue-800 border border-blue-200 px-4 py-2 rounded font-bold flex items-center gap-2 hover:bg-blue-200">
                                📍 Atualizar PINs (GPS)
                            </button>
                        )}

                        {selectedIds.length > 0 && (
                            <button onClick={handleBulkDelete} className="bg-red-500 text-white px-4 py-2 rounded font-bold flex items-center gap-2 animate-in fade-in">
                                <Trash2 size={18} /> Excluir ({selectedIds.length})
                            </button>
                        )}

                        {isImporting ? (
                            <div className="flex items-center gap-2 bg-gray-100 p-2 rounded">
                                <input type="file" accept=".csv" onChange={handleCSVImport} className="text-xs" />
                                <button onClick={() => setIsImporting(false)}><X size={16} /></button>
                            </div>
                        ) : (
                            hasPermission('accredited_import') && (
                                <button onClick={() => setIsImporting(true)} className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded font-bold flex items-center gap-2">
                                    <Upload size={18} /> Importar CSV
                                </button>
                            )
                        )}
                        {hasPermission('accredited_add') && (
                            <button onClick={() => { setFormData({}); setIsEditing(true); }} className="bg-wtech-gold text-black px-4 py-2 rounded font-bold flex items-center gap-2">
                                <Plus size={18} /> Novo Credenciado
                            </button>
                        )}
                    </div>
                </div>

                {/* Filter Row */}
                <div className="flex gap-4">
                    <div className="flex-grow flex items-center bg-white border border-gray-200 rounded px-3 py-2">
                        <Search size={18} className="text-gray-400 mr-2" />
                        <input
                            placeholder="Buscar por Oficina, Cidade, UF ou Região..."
                            className="flex-grow outline-none text-sm text-gray-900"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={() => setFilterMissingGPS(!filterMissingGPS)}
                        className={`px-4 py-2 rounded font-bold flex items-center gap-2 border transition-all ${filterMissingGPS ? 'bg-orange-100 border-orange-200 text-orange-700' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                    >
                        <MapPin size={18} className={filterMissingGPS ? "fill-orange-500" : ""} />
                        {filterMissingGPS ? 'Mostrando Sem GPS' : 'Filtrar Sem GPS'}
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-500 uppercase font-bold text-xs">
                        <tr>
                            <th className="px-4 py-3 w-10">
                                <input type="checkbox" onChange={toggleSelectAll} checked={selectedIds.length > 0 && selectedIds.length === filteredMechanics.length} />
                            </th>
                            <th className="px-6 py-3">Oficina</th>
                            <th className="px-6 py-3">Responsável</th>
                            <th className="px-6 py-3">Local</th>
                            <th className="px-6 py-3">Status</th>
                            <th className="px-6 py-3">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-gray-900">
                        {currentMechanics.map(mech => (
                            <tr key={mech.id} className="hover:bg-gray-50">
                                <td className="px-4 py-4 w-10">
                                    <input type="checkbox" checked={selectedIds.includes(mech.id)} onChange={() => toggleSelect(mech.id)} />
                                </td>
                                <td className="px-6 py-4">
                                    <div className="font-bold">{mech.workshopName}</div>
                                    <div className="text-xs text-gray-400">{mech.cpfCnpj}</div>
                                </td>
                                <td className="px-6 py-4">{mech.name}</td>
                                <td className="px-6 py-4">{mech.city}/{mech.state}</td>
                                <td className="px-6 py-4">
                                    <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase ${mech.status === 'Approved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                        {mech.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 flex gap-2">
                                    {hasPermission('accredited_revoke') && (
                                        <button
                                            onClick={() => toggleStatus(mech.id, mech.status)}
                                            className={`text-xs font-bold px-3 py-1 rounded ${mech.status === 'Approved' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}
                                        >
                                            {mech.status === 'Approved' ? 'Revogar' : 'Aprovar'}
                                        </button>
                                    )}
                                    {hasPermission('accredited_edit') && (
                                        <button onClick={() => { setFormData(mech); setIsEditing(true); }} className="text-gray-500 hover:text-black"><Edit size={16} /></button>
                                    )}
                                    {(!mech.latitude || !mech.longitude) && hasPermission('accredited_edit') && (
                                        <button onClick={() => handleQuickGeocode(mech)} className="text-blue-500 hover:text-blue-700" title="Atualizar GPS Rápido">
                                            <Sparkles size={16} />
                                        </button>
                                    )}
                                    {hasPermission('accredited_delete') && (
                                        <button onClick={() => handleDelete(mech.id)} className="text-red-400 hover:text-red-700"><Trash2 size={16} /></button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredMechanics.length === 0 && (
                    <div className="p-10 text-center text-gray-500">Nenhum credenciado encontrado com os filtros atuais.</div>
                )}
            </div>
            {/* Pagination Controls */}
            {filteredMechanics.length > itemsPerPage && (
                <div className="flex justify-between items-center mt-4 text-sm text-gray-600">
                    <div>
                        Mostrando {(currentPage - 1) * itemsPerPage + 1} a {Math.min(currentPage * itemsPerPage, filteredMechanics.length)} de {filteredMechanics.length}
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={prevPage}
                            disabled={currentPage === 1}
                            className="px-4 py-2 bg-white border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50"
                        >
                            Anterior
                        </button>
                        <button
                            onClick={nextPage}
                            disabled={currentPage === totalPages}
                            className="px-4 py-2 bg-white border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50"
                        >
                            Próxima
                        </button>
                    </div>
                </div>
            )}

        </div>
    );
};

// --- View: Finance System ---
const FinanceView = () => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [receivables, setReceivables] = useState(0);
    const [loading, setLoading] = useState(true);

    
    // Finance Filters
    const [filterType, setFilterType] = useState<'All' | '7d' | '30d' | 'Month' | 'Custom'>('30d');
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
    const [customRange, setCustomRange] = useState({ start: '', end: '' });

    const [showAddModal, setShowAddModal] = useState(false);
    const [newTrans, setNewTrans] = useState<Partial<Transaction>>({ type: 'Income', date: new Date().toISOString().split('T')[0] });

    const { user } = useAuth(); // Assuming useAuth provides user and role info

    // --- Permissions Helper ---
    const hasPermission = (key: string) => {
        if (!user || !user.role) return false;

        // Handle String Role
        if (typeof user.role === 'string') {
            return user.role === 'Super Admin' || user.role === 'Admin';
        }

        // Handle Object Role
        // Super Admin Level 10 Override
        if (user.role.level >= 10 || user.role.name === 'Super Admin') return true;

        if (user.role.permissions && user.role.permissions.admin_access) return true;
        return !!(user.role.permissions && user.role.permissions[key]);
    };

    const [courses, setCourses] = useState<Course[]>([]);
    const [events, setEvents] = useState<Event[]>([]);
    const [filterReference, setFilterReference] = useState<{ type: 'Course' | 'Event' | 'All', id: string }>({ type: 'All', id: '' });

    // Form State for Link
    const [linkType, setLinkType] = useState<'None' | 'Course' | 'Event'>('None');
    const [linkedId, setLinkedId] = useState('');

    useEffect(() => {
        const fetchFinance = async () => {
            setLoading(true);

            // Fetch Reference Data
            const { data: coursesData } = await supabase.from('SITE_Courses').select('id, title');
            const { data: eventsData } = await supabase.from('SITE_Events').select('id, title');
            setCourses(coursesData || []);
            setEvents(eventsData || []);

            // 1. Transactions (Real)
            const { data: trans } = await supabase.from('SITE_Transactions').select('*');
            const realTransactions = trans || [];

            // 2. Enrollments (Course Payments)
            const { data: enrollments } = await supabase.from('SITE_Enrollments').select('*, course:SITE_Courses(title, price)');

            const virtualTransactions: Transaction[] = [];
            let pending = 0;

            enrollments?.forEach((e: any) => {
                const paidTotal = e.amount_paid || 0;
                const price = e.course?.price || 0;

                // Calculate Pending
                if (price > paidTotal) pending += (price - paidTotal);

                // Check for Real Transactions linked to this enrollment
                const linkedTransAmount = realTransactions
                    .filter(t => t.enrollment_id === e.id && t.type === 'Income')
                    .reduce((acc, curr) => acc + curr.amount, 0);

                const unrecordedAmount = paidTotal - linkedTransAmount;

                if (unrecordedAmount > 0) {
                    virtualTransactions.push({
                        id: `virt_${e.id}`, // Virtual ID
                        description: `Sinal/Inscrição: ${e.course?.title || 'Curso'} - ${e.student_name}`,
                        category: 'Sales',
                        type: 'Income',
                        amount: unrecordedAmount,
                        date: e.created_at,
                        payment_method: e.payment_method || 'Indefinido',
                        enrollment_id: e.id,
                        course_id: e.course_id, // Link virtual transaction to course automatically
                        status: 'Completed'
                    });
                }
            });

            // Merge Real + Virtual
            const allTrans = [...realTransactions, ...virtualTransactions].sort((a, b) =>
                new Date(b.date).getTime() - new Date(a.date).getTime()
            );

            setTransactions(allTrans);
            setReceivables(pending);
            setLoading(false);
        }
        fetchFinance();
    }, []);

    const handleAddTransaction = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTrans.amount || !newTrans.description) return;

        const transactionToSave = {
            ...newTrans,
            course_id: (linkType === 'Course' && linkedId) ? linkedId : null,
            event_id: (linkType === 'Event' && linkedId) ? linkedId : null
        };

        const { data, error } = await supabase.from('SITE_Transactions').insert([transactionToSave]).select();
        if (error) {
            alert('Erro ao salvar: ' + error.message);
        } else if (data) {
            setTransactions([data[0], ...transactions]);
            setShowAddModal(false);
            setNewTrans({ type: 'Income', date: new Date().toISOString().split('T')[0] });
            setLinkType('None');
            setLinkedId('');
        }
    };

    const handleExportCSV = () => {
        const headers = ["Data", "Descrição", "Categoria", "Tipo", "Valor", "Método"];
        const rows = transactions.map(t => [
            new Date(t.date).toLocaleDateString(),
            t.description,
            t.category,
            t.type,
            t.amount.toString(),
            t.payment_method
        ]);
        const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].map(e => e.join(",")).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `financeiro_wtech_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
    };

    const filteredTransactions = transactions.filter(t => {
        const tDate = new Date(t.date);
        const now = new Date();
        
        let matchesDate = true;

        if (filterType === '7d') {
            const diffTime = Math.abs(now.getTime() - tDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            matchesDate = diffDays <= 7;
        } else if (filterType === '30d') {
            const diffTime = Math.abs(now.getTime() - tDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            matchesDate = diffDays <= 30;
        } else if (filterType === 'Month') {
            matchesDate = t.date.startsWith(selectedMonth);
        } else if (filterType === 'Custom') {
             if (customRange.start && tDate < new Date(customRange.start)) matchesDate = false;
             if (customRange.end && tDate > new Date(customRange.end)) matchesDate = false;
        }

        let matchesRef = true;

        if (filterReference.type === 'Course') {
            matchesRef = t.course_id === filterReference.id;
        } else if (filterReference.type === 'Event') {
            matchesRef = t.event_id === filterReference.id;
        }

        return matchesDate && matchesRef;
    });

    // Summary Calcs
    const income = filteredTransactions.filter(t => t.type === 'Income').reduce((acc, curr) => acc + curr.amount, 0);
    const expense = filteredTransactions.filter(t => t.type === 'Expense').reduce((acc, curr) => acc + curr.amount, 0);
    const balance = income - expense;

    return (
        <div className="text-gray-900 animate-fade-in space-y-6 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4">
                <div className="w-full md:w-auto">
                    <h2 className="text-3xl font-black text-gray-900 tracking-tighter">Fluxo de Caixa</h2>
                    <p className="text-gray-500 font-medium">Gestão financeira completa e transparente.</p>
                </div>
                <div className="flex flex-wrap gap-3 w-full md:w-auto items-center">
                    {/* Course/Event Filter */}
                    <select
                        className="border border-gray-300 rounded-lg p-2 text-sm font-bold text-gray-600 bg-white max-w-[200px]"
                        value={filterReference.type === 'All' ? 'All' : `${filterReference.type}:${filterReference.id}`}
                        onChange={(e) => {
                            const val = e.target.value;
                            if (val === 'All') setFilterReference({ type: 'All', id: '' });
                            else {
                                const [type, id] = val.split(':');
                                setFilterReference({ type: type as 'Course' | 'Event', id });
                            }
                        }}
                    >
                        <option value="All">Todos os Lançamentos</option>
                        <optgroup label="Cursos">
                            {courses.map(c => <option key={c.id} value={`Course:${c.id}`}>{c.title}</option>)}
                        </optgroup>
                        <optgroup label="Eventos">
                            {events.map(ev => <option key={ev.id} value={`Event:${ev.id}`}>{ev.title}</option>)}
                        </optgroup>
                    </select>

                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        {[
                            { id: '7d', l: '7 dias' }, 
                            { id: '30d', l: '30 dias' }, 
                        ].map(f => (
                            <button
                                key={f.id}
                                onClick={() => setFilterType(f.id as any)}
                                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${filterType === f.id ? 'bg-white shadow text-black' : 'text-gray-500 hover:text-black'}`}
                            >
                                {f.l}
                            </button>
                        ))}
                    </div>

                    <input 
                        type="month" 
                        value={selectedMonth}
                        onChange={(e) => { setSelectedMonth(e.target.value); setFilterType('Month'); }}
                        className={`border rounded-lg px-2 py-1 text-xs font-bold h-9 ${filterType === 'Month' ? 'border-wtech-gold bg-white' : 'border-gray-200 bg-gray-50'}`}
                    />

                    {/* Custom Range */}
                    <div className={`flex items-center border rounded-lg overflow-hidden h-9 ${filterType === 'Custom' ? 'border-wtech-gold bg-white' : 'border-gray-200 bg-gray-50'}`}>
                        <input 
                            type="date"
                            className="bg-transparent text-xs px-2 outline-none"
                            value={customRange.start}
                            onChange={e => { setCustomRange(p => ({...p, start: e.target.value})); setFilterType('Custom'); }}
                        />
                        <span className="text-gray-400 text-[10px]">-</span>
                        <input 
                            type="date"
                            className="bg-transparent text-xs px-2 outline-none"
                            value={customRange.end}
                            onChange={e => { setCustomRange(p => ({...p, end: e.target.value})); setFilterType('Custom'); }}
                        />
                    </div>

                    {hasPermission('financial_add_transaction') && (
                        <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 px-4 py-2 bg-wtech-black text-white rounded-lg hover:bg-gray-800 font-bold text-sm shadow-lg h-9">
                            <Plus size={16} /> Nova Transação
                        </button>
                    )}
                </div>
            </div>

            {/* Monthly Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                    <div className="flex justify-between mb-4">
                        <span className="text-xs font-bold uppercase text-gray-400">Saldo Líquido</span>
                        <span className={`p-2 rounded-lg ${balance >= 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}><DollarSign size={20} /></span>
                    </div>
                    <h3 className={`text-2xl font-black ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>R$ {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                    <div className="flex justify-between mb-4">
                        <span className="text-xs font-bold uppercase text-gray-400">Receitas</span>
                        <span className="p-2 rounded-lg bg-green-50 text-green-600"><TrendingUp size={20} /></span>
                    </div>
                    <h3 className="text-2xl font-black text-gray-900">R$ {income.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                    <div className="flex justify-between mb-4">
                        <span className="text-xs font-bold uppercase text-gray-400">Despesas</span>
                        <span className="p-2 rounded-lg bg-red-50 text-red-600"><TrendingDown size={20} /></span>
                    </div>
                    <h3 className="text-2xl font-black text-gray-900">R$ {expense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                    <div className="flex justify-between mb-4">
                        <span className="text-xs font-bold uppercase text-gray-400">A Receber (Previsão)</span>
                        <span className="p-2 rounded-lg bg-blue-50 text-blue-600"><ShoppingBag size={20} /></span>
                    </div>
                    <h3 className="text-2xl font-black text-blue-600">R$ {receivables.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                    <p className="text-[10px] text-gray-400 mt-1">Saldos de alunos pendentes</p>
                </div>
            </div>

            {/* Transactions List */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2 w-full md:w-auto">
                        <ArrowRight size={16} className="text-wtech-gold" /> Últimas Movimentações
                    </h3>
                    <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    <div className="flex flex-wrap gap-2 w-full md:w-auto">
                        {/* Removed duplicate date filter which was here */}
                        {hasPermission('financial_export') && (
                            <button onClick={handleExportCSV} className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 font-bold text-sm bg-white">
                                <Download size={16} /> Exportar
                            </button>
                        )}
                    </div>
                </div>
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-500 uppercase font-bold text-xs border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-4">Descrição</th>
                            <th className="px-6 py-4">Categoria</th>
                            <th className="px-6 py-4">Data</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 text-right">Valor</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-gray-900">
                        {loading ? <tr><td colSpan={5} className="p-8 text-center text-gray-400">Carregando...</td></tr> :
                            filteredTransactions.length === 0 ? <tr><td colSpan={5} className="p-8 text-center text-gray-400">Nenhuma transação encontrada.</td></tr> :
                                filteredTransactions.map(t => (
                                    <tr key={t.id} className="hover:bg-gray-50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="font-bold">{t.description}</div>
                                            <div className="text-xs text-gray-400">{t.payment_method}</div>
                                        </td>
                                        <td className="px-6 py-4 text-xs font-bold uppercase text-gray-500">{t.category}</td>
                                        <td className="px-6 py-4 text-gray-600">{new Date(t.date).toLocaleDateString()}</td>
                                        <td className="px-6 py-4">
                                            <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase ${t.type === 'Income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {t.type === 'Income' ? 'Entrada' : 'Saída'}
                                            </span>
                                        </td>
                                        <td className={`px-6 py-4 text-right font-bold ${t.type === 'Income' ? 'text-green-600' : 'text-red-600'}`}>
                                            {t.type === 'Expense' ? '-' : '+'} R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                ))}
                    </tbody>
                </table>
            </div>

            {/* Add Transaction Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
                        <h3 className="text-xl font-bold mb-4">Nova Transação</h3>
                        <form onSubmit={handleAddTransaction} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Tipo</label>
                                    <select className="w-full p-2 border rounded-lg" value={newTrans.type} onChange={e => setNewTrans({ ...newTrans, type: e.target.value as any })}>
                                        <option value="Income">Receita (Entrada)</option>
                                        <option value="Expense">Despesa (Saída)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Categoria</label>
                                    <select className="w-full p-2 border rounded-lg" value={newTrans.category} onChange={e => setNewTrans({ ...newTrans, category: e.target.value as any })}>
                                        <option value="Sales">Vendas</option>
                                        <option value="Operational">Operacional</option>
                                        <option value="Marketing">Marketing</option>
                                        <option value="Payroll">Folha de Pgto</option>
                                    </select>
                                </div>
                            </div>

                            {/* Link to Course/Event */}
                            <div>
                                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Vincular a (Opcional)</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <select
                                        className="w-full p-2 border rounded-lg"
                                        value={linkType}
                                        onChange={e => {
                                            setLinkType(e.target.value as any);
                                            setLinkedId('');
                                        }}
                                    >
                                        <option value="None">Sem Vínculo</option>
                                        <option value="Course">Curso</option>
                                        <option value="Event">Evento</option>
                                    </select>

                                    {linkType === 'Course' && (
                                        <select
                                            className="w-full p-2 border rounded-lg"
                                            value={linkedId}
                                            onChange={e => setLinkedId(e.target.value)}
                                        >
                                            <option value="">Selecione o Curso...</option>
                                            {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                                        </select>
                                    )}

                                    {linkType === 'Event' && (
                                        <select
                                            className="w-full p-2 border rounded-lg"
                                            value={linkedId}
                                            onChange={e => setLinkedId(e.target.value)}
                                        >
                                            <option value="">Selecione o Evento...</option>
                                            {events.map(ev => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
                                        </select>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Data</label>
                                    <input type="date" required className="w-full p-2 border rounded-lg" value={newTrans.date} onChange={e => setNewTrans({ ...newTrans, date: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Valor (R$)</label>
                                    <input type="number" step="0.01" required className="w-full p-2 border rounded-lg font-bold" value={newTrans.amount || ''} onChange={e => setNewTrans({ ...newTrans, amount: parseFloat(e.target.value) })} />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Descrição</label>
                                <input required className="w-full p-2 border rounded-lg" placeholder="Ex: Venda Curso X" value={newTrans.description || ''} onChange={e => setNewTrans({ ...newTrans, description: e.target.value })} />
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Método Pagamento</label>
                                <select className="w-full p-2 border rounded-lg" value={newTrans.payment_method || ''} onChange={e => setNewTrans({ ...newTrans, payment_method: e.target.value })}>
                                    <option value="">Selecione...</option>
                                    <option value="Pix">Pix</option>
                                    <option value="Cartão Crédito">Cartão de Crédito</option>
                                    <option value="Boleto">Boleto</option>
                                    <option value="Dinheiro">Dinheiro</option>
                                    <option value="Transferência">Transferência</option>
                                </select>
                            </div>

                            <div className="flex justify-end gap-2 mt-6">
                                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg font-bold">Cancelar</button>
                                <button type="submit" className="px-6 py-2 bg-wtech-black text-white rounded-lg font-bold shadow hover:bg-gray-800">Salvar Transação</button>
                            </div>
                        </form>
                    </div>
                </div>
            )
            }
        </div >
    );
};

// --- View: Orders ---
// --- View: News Center (Notifications) ---
const NewsCenterView = () => {
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [audience, setAudience] = useState('All');
    const [sending, setSending] = useState(false);

    const handleSend = async () => {
        if (!title || !message) return alert('Preencha título e mensagem.');
        setSending(true);

        // 1. Save to DB
        const { error } = await supabase.from('SITE_Notifications').insert({
            title,
            message,
            target_audience: audience,
            sent_via_email: true, // Mock
            sent_via_whatsapp: true // Mock for n8n
        });

        if (error) {
            alert('Erro ao criar notificação: ' + error.message);
        } else {
            alert('Notificação enviada com sucesso! (Integração n8n pronta)');
            setTitle('');
            setMessage('');
        }
        setSending(false);
    };

    return (
        <div className="max-w-4xl mx-auto animate-fade-in">
            <h2 className="text-3xl font-black text-gray-900 mb-2">Centro de Notícias</h2>
            <p className="text-gray-500 mb-8">Envie comunicados para credenciados e alunos via Email e WhatsApp.</p>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div className="col-span-2">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Título / Assunto</label>
                        <input className="w-full border border-gray-200 rounded-lg p-3 font-bold text-gray-900 outline-none focus:border-wtech-gold" value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Atualização Importante" />
                    </div>
                    <div className="col-span-2">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Mensagem</label>
                        <textarea className="w-full border border-gray-200 rounded-lg p-3 h-40 outline-none focus:border-wtech-gold" value={message} onChange={e => setMessage(e.target.value)} placeholder="Escreva sua mensagem aqui..." />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Público Alvo</label>
                        <select className="w-full border border-gray-200 rounded-lg p-3 bg-white outline-none" value={audience} onChange={e => setAudience(e.target.value)}>
                            <option value="All">Todos (Geral)</option>
                            <option value="Mechanics">Credenciados (Oficinas)</option>
                            <option value="Students">Alunos</option>
                        </select>
                    </div>
                </div>

                <div className="flex justify-end gap-4 border-t border-gray-100 pt-6">
                    <button className="px-6 py-3 border border-gray-200 rounded-lg font-bold text-gray-600 hover:bg-gray-50">Salvar Rascunho</button>
                    <button onClick={handleSend} disabled={sending} className="px-8 py-3 bg-wtech-black text-white rounded-lg font-bold hover:bg-gray-800 shadow-lg flex items-center gap-2">
                        {sending ? 'Enviando...' : <><Send size={18} /> Enviar Comunicado</>}
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- View: Orders (Course Enrollments & Shop) ---
const OrdersView = () => {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [filterName, setFilterName] = useState('');
    const [filterCourse, setFilterCourse] = useState('');

    useEffect(() => {
        const fetch = async () => {
            setLoading(true);
            // Fetch Enrollments (Course Purchases)
            const { data: enrollments } = await supabase
                .from('SITE_Enrollments')
                .select('*, course:SITE_Courses(title, price)')
                .order('created_at', { ascending: false });

            // Fetch Shop Orders (if any)
            const { data: shopOrders } = await supabase
                .from('SITE_Orders')
                .select('*')
                .order('date', { ascending: false });

            // Normalize and Merge
            const normalizedEnrollments = enrollments?.map((e: any) => ({
                id: e.id,
                type: 'Curso',
                customerName: e.student_name,
                customerEmail: e.student_email,
                itemName: e.course?.title || 'Curso Removido',
                date: e.created_at,
                total: e.amount_paid || e.course?.price || 0,
                status: e.status === 'Confirmed' ? 'Paid' : 'Pending',
                paymentMethod: e.payment_method || '-'
            })) || [];

            const normalizedShop = shopOrders?.map((o: any) => ({
                id: o.id,
                type: 'Loja',
                customerName: o.customer_name,
                customerEmail: o.customer_email,
                itemName: 'Pedido Loja', // You might want to fetch items if available
                date: o.date,
                total: o.total,
                status: o.status,
                paymentMethod: '-'
            })) || [];

            setOrders([...normalizedEnrollments, ...normalizedShop].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
            setLoading(false);
        }
        fetch();
    }, []);

    const filteredOrders = orders.filter(o => {
        const matchName = o.customerName?.toLowerCase().includes(filterName.toLowerCase());
        const matchCourse = o.itemName?.toLowerCase().includes(filterCourse.toLowerCase());
        return matchName && matchCourse;
    });

    return (
        <div className="text-gray-900 space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-black text-gray-900 tracking-tighter">Pedidos & Inscrições</h2>
                    <p className="text-gray-500 font-medium">Acompanhe as vendas de cursos e produtos.</p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Buscar por Cliente</label>
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-3 text-gray-400" />
                        <input
                            className="w-full border border-gray-200 rounded-lg pl-10 pr-3 py-2 text-sm outline-none focus:border-wtech-gold"
                            placeholder="Nome do aluno..."
                            value={filterName}
                            onChange={e => setFilterName(e.target.value)}
                        />
                    </div>
                </div>
                <div className="flex-1">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Buscar por Curso/Item</label>
                    <div className="relative">
                        <ShoppingBag size={16} className="absolute left-3 top-3 text-gray-400" />
                        <input
                            className="w-full border border-gray-200 rounded-lg pl-10 pr-3 py-2 text-sm outline-none focus:border-wtech-gold"
                            placeholder="Nome do curso..."
                            value={filterCourse}
                            onChange={e => setFilterCourse(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-500 uppercase font-bold text-xs border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-4">Cliente / Aluno</th>
                            <th className="px-6 py-4">Item Comprado</th>
                            <th className="px-6 py-4">Data</th>
                            <th className="px-6 py-4">Total</th>
                            <th className="px-6 py-4">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-gray-900">
                        {loading ? (
                            <tr><td colSpan={5} className="p-8 text-center text-gray-400">Carregando pedidos...</td></tr>
                        ) : filteredOrders.length === 0 ? (
                            <tr><td colSpan={5} className="p-8 text-center text-gray-400">Nenhum pedido encontrado.</td></tr>
                        ) : (
                            filteredOrders.map((order, idx) => (
                                <tr key={`${order.id}-${idx}`} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-gray-900">{order.customerName}</div>
                                        <div className="text-xs text-gray-500">{order.customerEmail}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${order.type === 'Curso' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>
                                                {order.type}
                                            </span>
                                            <span className="font-medium">{order.itemName}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-gray-600">{new Date(order.date).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 font-bold text-gray-900">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.total)}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase ${order.status === 'Paid' || order.status === 'Confirmed' ? 'bg-green-100 text-green-700' :
                                            order.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'
                                            }`}>
                                            {order.status === 'Paid' || order.status === 'Confirmed' ? 'Pago / Confirmado' : 'Pendente'}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// --- View: Settings (System Config & Roles) ---
// --- View: Settings (System Config & Roles) ---
const SettingsView = () => {
    const [config, setConfig] = useState<SystemConfig | any>({});
    const [activeTab, setActiveTab] = useState('Geral');
    const [roles, setRoles] = useState<Role[]>([]);
    const [editingRole, setEditingRole] = useState<Partial<Role> | null>(null);

    // Webhooks State
    const [webhooks, setWebhooks] = useState<{ url: string, topic: string, secret: string }[]>([]);

    useEffect(() => {
        fetchConfig();
        fetchRoles();
    }, []);

    const fetchConfig = async () => {
        const { data } = await supabase.from('SITE_SystemSettings').select('*');
        if (data) {
            const configObj: any = {};
            data.forEach((item: any) => {
                configObj[item.key] = item.value;
            });
            setConfig(configObj);
            // Parse webhooks if active
            if (configObj.system_webhooks) {
                try { setWebhooks(JSON.parse(configObj.system_webhooks)); } catch (e) { }
            }
        }
    };

    const fetchRoles = async () => {
        const { data } = await supabase.from('SITE_Roles').select('*').order('level', { ascending: false });
        if (data) setRoles(data);
    };

    const handleChange = (key: string, value: any) => {
        setConfig((prev: any) => ({ ...prev, [key]: value }));
    };

    const handleSaveConfig = async () => {
        // Save webhooks to config
        const finalConfig = { ...config, system_webhooks: JSON.stringify(webhooks) };
        const updates = Object.entries(finalConfig).map(([key, value]) => ({
            key,
            value: typeof value === 'string' ? value : String(value || '')
        }));

        const { error } = await supabase.from('SITE_SystemSettings').upsert(updates, { onConflict: 'key' });
        if (error) {
            console.error(error);
            alert('Erro ao salvar configurações: ' + (error.message || JSON.stringify(error)));
        } else {
        }
    };

    // Role Management Handlers
    const handleSaveRole = async () => {
        if (!editingRole || !editingRole.name) return;

        const payload = {
            name: editingRole.name,
            description: editingRole.description,
            permissions: editingRole.permissions,
            level: editingRole.level || 1
        };

        let error = null;

        if (editingRole.id) {
            const res = await supabase.from('SITE_Roles').update(payload).eq('id', editingRole.id);
            error = res.error;
        } else {
            const res = await supabase.from('SITE_Roles').insert([payload]);
            error = res.error;
        }

        if (error) {
            console.error("Error saving role:", error);
            alert("Erro ao salvar cargo: " + error.message);
        } else {
            setEditingRole(null);
            fetchRoles();
            alert("Cargo salvo com sucesso!");
        }
    };

    const handleDeleteRole = async (id: string) => {
        if (confirm('Tem certeza? Isso pode afetar usuários com este cargo.')) {
            await supabase.from('SITE_Roles').delete().eq('id', id);
            fetchRoles();
        }
    };

    const togglePermission = (key: string) => {
        if (!editingRole) return;
        const currentPerms = editingRole.permissions || {};
        const isChecked = !currentPerms[key];

        setEditingRole({
            ...editingRole,
            permissions: {
                ...currentPerms,
                [key]: isChecked
            }
        });
    };

    const permissionCategories = [
        {
            title: 'Cursos & Treinamentos',
            perms: [
                { key: 'courses_view', label: 'Visualizar Módulo' },
                { key: 'courses_edit', label: 'Editar Cursos' },
                { key: 'courses_delete', label: 'Excluir Cursos' },
                { key: 'courses_add_student', label: 'Adicionar Aluno/Matrícula' },
                { key: 'courses_print_list', label: 'Imprimir Listas' },
                { key: 'courses_view_reports', label: 'Ver Relatórios Gerenciais' },
                { key: 'courses_edit_lp', label: 'Editar Landing Pages' },
            ]
        },
        {
            title: 'CRM & Leads',
            perms: [
                { key: 'crm_view', label: 'Acessar CRM' },
                { key: 'crm_manage_leads', label: 'Gerenciar Leads (Criar/Editar/Mover)' },
                { key: 'crm_delete_leads', label: 'Excluir Leads' },
                { key: 'crm_export', label: 'Exportar Dados' },
                { key: 'crm_distribute', label: 'Configurar Distribuição' }
            ]
        },
        {
            title: 'Blog & Conteúdo (IA)',
            perms: [
                { key: 'blog_view', label: 'Acessar Blog' },
                { key: 'blog_create', label: 'Criar / Publicar Posts' },
                { key: 'blog_edit', label: 'Editar Posts' },
                { key: 'blog_delete', label: 'Excluir Posts' },
                { key: 'blog_ai', label: 'Usar Gerador IA' }
            ]
        },
        {
            title: 'Rede Credenciada',
            perms: [
                { key: 'accredited_view', label: 'Visualizar Módulo' },
                { key: 'accredited_add', label: 'Adicionar Credenciado' },
                { key: 'accredited_edit', label: 'Editar Dados' },
                { key: 'accredited_import', label: 'Importar CSV/XLS' },
                { key: 'accredited_revoke', label: 'Revogar/Bloquear' },
                { key: 'accredited_delete', label: 'Excluir Permanentemente' },
            ]
        },
        {
            title: 'Financeiro (Fluxo de Caixa)',
            perms: [
                { key: 'financial_view', label: 'Visualizar Módulo' },
                { key: 'financial_add_transaction', label: 'Lançar Transação' },
                { key: 'financial_export', label: 'Exportar Relatórios' },
                { key: 'financial_edit_transaction', label: 'Editar Transações (Risco)' },
                { key: 'financial_delete_transaction', label: 'Excluir Transações (Risco)' },
            ]
        },
        {
            title: 'Administração Geral',
            perms: [
                { key: 'admin_access', label: 'Acesso Admin (Global)' },
                { key: 'manage_users', label: 'Gerenciar Equipe' },
                { key: 'manage_settings', label: 'Acesso Configurações' },
            ]
        }
    ];

    const handleUpload = async (file: File, key: string) => {
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${key}-${Date.now()}.${fileExt}`;
            const filePath = `settings/${fileName}`;

            // Try uploading to 'site-assets'
            const { error: uploadError } = await supabase.storage
                .from('site-assets')
                .upload(filePath, file);

            if (uploadError) {
                // Fallback to 'public' if site-assets fails or doesn't exist
                const { error: retryError } = await supabase.storage
                    .from('public')
                    .upload(filePath, file);

                if (retryError) throw retryError;
            }

            const { data } = supabase.storage
                .from('site-assets')
                .getPublicUrl(filePath);

            let publicUrl = data.publicUrl;

            // Check if URL is valid/accessible, if not try public bucket URL
            if (uploadError) {
                const { data: publicData } = supabase.storage.from('public').getPublicUrl(filePath);
                publicUrl = publicData.publicUrl;
            }

            handleChange(key, publicUrl);
            alert('Imagem enviada com sucesso!');
        } catch (error: any) {
            console.error('Upload error:', error);
            alert('Erro ao enviar imagem: ' + (error.message || error));
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full">
            {/* Header / Tabs */}
            <div className="border-b border-gray-200 bg-gray-50 flex items-center justify-between px-6 pt-4">
                <div className="flex gap-6 overflow-x-auto scrollbar-hide">
                    {['Geral', 'Webhooks & API', 'Permissões & Cargos', 'Scripts Globais'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`pb-4 text-sm font-bold uppercase tracking-wider relative whitespace-nowrap ${activeTab === tab ? 'text-wtech-gold' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            {tab}
                            {activeTab === tab && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-wtech-gold" />}
                        </button>
                    ))}
                </div>
                {activeTab !== 'Permissões & Cargos' && (
                    <button
                        onClick={handleSaveConfig}
                        className="mb-2 bg-gradient-to-r from-wtech-gold to-yellow-600 text-black px-6 py-2 rounded-lg font-bold text-xs uppercase shadow-lg shadow-yellow-500/20 hover:scale-105 transition-transform flex items-center gap-2 whitespace-nowrap"
                    >
                        <Save size={16} /> Salvar Alterações
                    </button>
                )}
            </div>

            {/* Content Area */}
            <div className="p-8 overflow-y-auto custom-scrollbar flex-1">

                {/* Tab: Geral (Consolidated) */}
                {activeTab === 'Geral' && (
                    <div className="w-full animate-in fade-in slide-in-from-bottom-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">

                            {/* Visual Identity */}
                            <div className="space-y-6">
                                <h3 className="font-bold text-gray-900 border-b pb-2 flex items-center gap-2"><ImageIcon size={18} /> Identidade Visual</h3>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Nome do Site</label>
                                    <input
                                        className="w-full border border-gray-300 p-3 rounded-lg"
                                        value={config.site_title || ''}
                                        onChange={(e) => handleChange('site_title', e.target.value)}
                                        placeholder="W-TECH Brasil"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Logo URL</label>
                                    <div className="flex gap-3">
                                        <div className="w-16 h-16 bg-gray-100 rounded border flex items-center justify-center overflow-hidden relative group">
                                            {config.logo_url ? <img src={config.logo_url} className="w-full h-full object-contain" /> : <ImageIcon size={20} className="text-gray-400" />}
                                        </div>
                                        <div className="flex-1 flex gap-2">
                                            <input
                                                className="w-full border border-gray-300 p-3 rounded-lg text-sm"
                                                value={config.logo_url || ''}
                                                onChange={(e) => handleChange('logo_url', e.target.value)}
                                                placeholder="https://..."
                                            />
                                            <label className="cursor-pointer bg-gray-100 border border-gray-300 p-3 rounded-lg hover:bg-gray-200">
                                                <Upload size={18} className="text-gray-600" />
                                                <input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0], 'logo_url')} />
                                            </label>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Favicon URL (Ícone da Aba)</label>
                                    <div className="flex gap-3">
                                        <div className="w-10 h-10 bg-gray-100 rounded border flex items-center justify-center overflow-hidden">
                                            {config.favicon_url ? <img src={config.favicon_url} className="w-6 h-6 object-contain" /> : <div className="w-4 h-4 bg-gray-400 rounded-full" />}
                                        </div>
                                        <div className="flex-1 flex gap-2">
                                            <input
                                                className="w-full border border-gray-300 p-3 rounded-lg text-sm"
                                                value={config.favicon_url || ''}
                                                onChange={(e) => handleChange('favicon_url', e.target.value)}
                                                placeholder="https://... (PNG/ICO)"
                                            />
                                            <label className="cursor-pointer bg-gray-100 border border-gray-300 p-3 rounded-lg hover:bg-gray-200">
                                                <Upload size={18} className="text-gray-600" />
                                                <input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0], 'favicon_url')} />
                                            </label>
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Cor Primária</label>
                                        <div className="flex items-center gap-2">
                                            <input type="color" className="w-8 h-8 rounded cursor-pointer border-0" value={config.primary_color || '#D4AF37'} onChange={(e) => handleChange('primary_color', e.target.value)} />
                                            <span className="text-xs font-mono">{config.primary_color}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Cor Secundária</label>
                                        <div className="flex items-center gap-2">
                                            <input type="color" className="w-8 h-8 rounded cursor-pointer border-0" value={config.secondary_color || '#111111'} onChange={(e) => handleChange('secondary_color', e.target.value)} />
                                            <span className="text-xs font-mono">{config.secondary_color}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Contact & WhatsApp */}
                            <div className="space-y-6">
                                <h3 className="font-bold text-gray-900 border-b pb-2 flex items-center gap-2"><MessageCircle size={18} /> Contato & WhatsApp</h3>
                                <div>
                                    <div className="flex items-center justify-between mb-4">
                                        <label className="text-xs font-bold text-gray-500 uppercase">WhatsApp Button</label>
                                        <button
                                            onClick={() => handleChange('whatsapp_enabled', !config.whatsapp_enabled)}
                                            className={`w-10 h-6 rounded-full transition-colors relative ${config.whatsapp_enabled ? 'bg-green-500' : 'bg-gray-300'}`}
                                        >
                                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${config.whatsapp_enabled ? 'left-5' : 'left-1'}`}></div>
                                        </button>
                                    </div>
                                    {config.whatsapp_enabled && (
                                        <div>
                                            <input
                                                className="w-full border border-green-200 p-3 rounded-lg text-green-800 font-bold bg-green-50"
                                                value={config.whatsapp_phone || ''}
                                                onChange={(e) => handleChange('whatsapp_phone', e.target.value)}
                                                placeholder="5511999999999"
                                            />
                                            <p className="text-[10px] text-gray-400 mt-1">Apenas números (DDI+DDD+Num).</p>
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-3">
                                    {[
                                        { k: 'cnpj', l: 'CNPJ da Empresa' },
                                        { k: 'address', l: 'Endereço Completo' },
                                        { k: 'phone_main', l: 'Telefone Principal' },
                                        { k: 'email_contato', l: 'Email de Contato' },
                                        { k: 'instagram', l: 'Instagram URL' },
                                        { k: 'facebook', l: 'Facebook URL' },
                                        { k: 'linkedin', l: 'LinkedIn URL' }
                                    ].map(field => (
                                        <div key={field.k}>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{field.l}</label>
                                            <input
                                                className="w-full border border-gray-300 p-2 rounded-lg text-sm"
                                                value={config[field.k] || ''}
                                                onChange={(e) => handleChange(field.k, e.target.value)}
                                                placeholder="..."
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Tracking & Integrations */}
                            <div className="space-y-6">
                                <h3 className="font-bold text-gray-900 border-b pb-2 flex items-center gap-2"><Code size={18} /> Tracking & Pixels</h3>
                                <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg mb-4">
                                    Insira os IDs de rastreamento para ativar a coleta de dados automática.
                                </div>
                                {[
                                    { k: 'pixel_id', l: 'Facebook Pixel ID' },
                                    { k: 'ga_id', l: 'Google Analytics (GA4)' },
                                    { k: 'gtm_id', l: 'Google Tag Manager' }
                                ].map(field => (
                                    <div key={field.k}>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">{field.l}</label>
                                        <input
                                            className="w-full border border-gray-300 p-3 rounded-lg font-mono text-sm"
                                            value={config[field.k] || ''}
                                            onChange={(e) => handleChange(field.k, e.target.value)}
                                            placeholder="..."
                                        />
                                    </div>
                                ))}
                            </div>

                        </div>
                    </div>
                )}

                {/* Tab: Scripts Globais (Old Códigos & Scripts) */}
                {activeTab === 'Scripts Globais' && (
                    <div className="w-full animate-in fade-in slide-in-from-bottom-4">
                        <div className="p-4 bg-yellow-50 border border-yellow-100 rounded-lg mb-6">
                            <p className="text-sm text-yellow-800">
                                <strong>Cuidado:</strong> Scripts inseridos aqui são carregados em todas as páginas do site.
                            </p>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="col-span-2">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">HEAD Code</label>
                                <textarea className="w-full h-40 border border-gray-300 p-4 rounded-lg font-mono text-xs bg-gray-50" value={config.head_code} onChange={e => handleChange('head_code', e.target.value)} placeholder="<meta...>, <style...>" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Body Start</label>
                                <textarea className="w-full h-40 border border-gray-300 p-4 rounded-lg font-mono text-xs bg-gray-50" value={config.body_start_code} onChange={e => handleChange('body_start_code', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Body End</label>
                                <textarea className="w-full h-40 border border-gray-300 p-4 rounded-lg font-mono text-xs bg-gray-50" value={config.body_end_code} onChange={e => handleChange('body_end_code', e.target.value)} />
                            </div>
                        </div>
                    </div>
                )}

                {/* Tab: Webhooks (New) */}
                {activeTab === 'Webhooks & API' && (
                    <div className="w-full animate-in fade-in slide-in-from-bottom-4">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">Webhooks do Sistema</h3>
                                <p className="text-sm text-gray-500">Notifique sistemas externos sobre eventos ocorridos na W-TECH.</p>
                            </div>
                            <button className="bg-wtech-black text-white px-4 py-2 rounded-lg text-xs font-bold uppercase hover:bg-gray-800" onClick={() => {
                                const url = prompt("URL do Webhook:");
                                const topic = prompt("Tópico (ex: lead.create):");
                                if (url && topic) setWebhooks([...webhooks, { url, topic, secret: 'whsec_' + Math.random().toString(36).substr(2, 9) }]);
                            }}>
                                <Plus size={14} /> Adicionar Webhook
                            </button>
                        </div>

                        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
                            {webhooks.length === 0 ? (
                                <div className="p-8 text-center text-gray-400">Nenhum webhook configurado.</div>
                            ) : (
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 uppercase">
                                        <tr>
                                            <th className="p-4">Tópico</th>
                                            <th className="p-4">URL de Destino</th>
                                            <th className="p-4">Secret Key</th>
                                            <th className="p-4 text-right">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 text-sm">
                                        {webhooks.map((wh, idx) => (
                                            <tr key={idx}>
                                                <td className="p-4 font-bold"><span className="bg-blue-50 text-blue-700 px-2 py-1 rounded">{wh.topic}</span></td>
                                                <td className="p-4 font-mono text-xs text-gray-600 truncate max-w-xs">{wh.url}</td>
                                                <td className="p-4 font-mono text-xs text-gray-400">{wh.secret}</td>
                                                <td className="p-4 text-right">
                                                    <button onClick={() => setWebhooks(webhooks.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600"><Trash2 size={16} /></button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                )}

                {/* Permissions Tab (Preserved Logic, just re-rendered if active) */}
                {activeTab === 'Permissões & Cargos' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">Hierarquia de Acesso</h3>
                                <p className="text-sm text-gray-500">Defina os perfis e o que cada uno pode fazer no sistema.</p>
                            </div>
                            <button
                                onClick={() => setEditingRole({ name: '', description: '', permissions: {}, level: 1 })}
                                className="bg-gray-900 text-white px-4 py-2 rounded-lg font-bold text-xs uppercase flex items-center gap-2 hover:bg-black"
                            >
                                <Plus size={14} /> Criar Novo Cargo
                            </button>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Roles List */}
                            <div className="lg:col-span-1 space-y-3">
                                {roles.map(role => (
                                    <div
                                        key={role.id}
                                        onClick={() => setEditingRole(role)}
                                        className={`p-4 rounded-xl border cursor-pointer transition-all ${editingRole?.id === role.id ? 'bg-white border-wtech-gold shadow-md scale-[1.02]' : 'bg-white border-gray-100 hover:border-gray-200'}`}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="font-bold text-gray-900">{role.name}</h4>
                                            <span className="bg-gray-100 text-gray-600 text-[10px] uppercase font-bold px-2 py-0.5 rounded">Nível {role.level}</span>
                                        </div>
                                        <p className="text-xs text-gray-500 line-clamp-2">{role.description}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Editor */}
                            <div className="lg:col-span-2">
                                {editingRole ? (
                                    <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 animate-in fade-in slide-in-from-right-4">
                                        <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
                                            <h3 className="font-bold text-lg">{editingRole.id ? 'Editar Cargo' : 'Novo Cargo'}</h3>
                                            <div className="flex gap-2">
                                                {editingRole.id && (
                                                    <button onClick={() => handleDeleteRole(editingRole.id!)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors">
                                                        <Trash2 size={18} />
                                                    </button>
                                                )}
                                                <button onClick={() => setEditingRole(null)} className="text-gray-400 hover:text-gray-600 p-2">
                                                    <X size={20} />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 mb-6">
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome do Cargo</label>
                                                <input
                                                    className="w-full border border-gray-200 p-2 rounded text-sm font-bold"
                                                    value={editingRole.name || ''}
                                                    onChange={e => setEditingRole({ ...editingRole, name: e.target.value })}
                                                    placeholder="Ex: Editor Chefe"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nível Hierárquico (1-10)</label>
                                                <input
                                                    type="number"
                                                    className="w-full border border-gray-200 p-2 rounded text-sm"
                                                    value={editingRole.level || 1}
                                                    onChange={e => setEditingRole({ ...editingRole, level: parseInt(e.target.value) })}
                                                />
                                            </div>
                                            <div className="col-span-2">
                                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Descrição</label>
                                                <input
                                                    className="w-full border border-gray-200 p-2 rounded text-sm"
                                                    value={editingRole.description || ''}
                                                    onChange={e => setEditingRole({ ...editingRole, description: e.target.value })}
                                                    placeholder="O que este cargo pode fazer?"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            {permissionCategories.map((category, idx) => (
                                                <div key={idx} className="mb-6">
                                                    <h4 className="text-xs font-bold text-gray-500 uppercase mb-2 border-b border-gray-100 pb-1">{category.title}</h4>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        {category.perms.map(perm => (
                                                            <label key={perm.key} className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                                                                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${editingRole.permissions?.[perm.key] ? 'bg-wtech-gold border-wtech-gold' : 'border-gray-300 bg-white'}`}>
                                                                    {editingRole.permissions?.[perm.key] && <CheckCircle size={14} className="text-black" />}
                                                                </div>
                                                                <input
                                                                    type="checkbox"
                                                                    className="hidden"
                                                                    checked={editingRole.permissions?.[perm.key] || false}
                                                                    onChange={() => togglePermission(perm.key)}
                                                                />
                                                                <span className={`text-sm ${perm.label.includes('(Risco)') || perm.label.includes('Excluir') ? 'text-red-700 font-medium' : 'text-gray-700'}`}>{perm.label}</span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        <button onClick={handleSaveRole} className="w-full bg-wtech-black text-white py-3 rounded-lg font-bold uppercase hover:bg-gray-800 transition-all shadow-lg">
                                            Salvar Cargo
                                        </button>
                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-100 rounded-2xl p-10">
                                        <Shield size={48} className="mb-4 text-gray-200" />
                                        <p className="text-sm font-medium">Selecione um cargo para editar ou crie um novo.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- View: Team (Collaborators Only) ---
const TeamView = () => {
    const [users, setUsers] = useState<UserType[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // User Edit State
    const [editingUser, setEditingUser] = useState<Partial<UserType> & { password?: string, receives_leads?: boolean }>({});
    const [showProfileModal, setShowProfileModal] = useState(false); // For "Meu Perfil"

    const { user } = useAuth();

    // --- Permissions Helper ---
    const hasPermission = (key: string) => {
        if (!user || !user.role) return false;

        // Handle String Role
        if (typeof user.role === 'string') {
            return user.role === 'Super Admin' || user.role === 'Admin';
        }

        // Handle Object Role
        // Super Admin Level 10 Override
        if (user.role.level >= 10 || user.role.name === 'Super Admin') return true;

        if (user.role.permissions && user.role.permissions.admin_access) return true;
        return !!(user.role.permissions && user.role.permissions[key]);
    };

    useEffect(() => {
        fetchUsers();
        fetchRoles();
    }, []);

    const fetchUsers = async () => {
        const { data } = await supabase.from('SITE_Users').select('*');
        if (data) setUsers(data);
    };

    const fetchRoles = async () => {
        const { data } = await supabase.from('SITE_Roles').select('*');
        if (data) setRoles(data);
    };

    const handleSaveUser = async () => {
        if (!editingUser.name || !editingUser.email) return;

        const payload = {
            name: editingUser.name,
            email: editingUser.email,
            role_id: editingUser.role_id || null,
            status: editingUser.status || 'Active',
            receives_leads: editingUser.receives_leads || false
        };

        // Logic: Use RPC only if Password needs update (requires Admin privileges on Auth)
        // Otherwise, use standard Table Update for speed and reliability without RPC
        if (editingUser.id) {
            let rpcError = null;

            // 1. If Password is being changed, TRY RPC
            if (editingUser.password) {
                const { error } = await supabase.rpc('admin_update_user', {
                    target_user_id: editingUser.id,
                    new_email: editingUser.email,
                    new_password: editingUser.password,
                    new_name: payload.name,
                    new_role_id: payload.role_id || null,
                    new_status: payload.status || 'Active'
                });
                rpcError = error;
            }

            // 2. Always update public profile (SITE_Users) to ensure data consistency
            // This handles cases where RPC is missing OR we just want to update non-sensitive data
            const { error: stdError } = await supabase.from('SITE_Users').update({
                name: payload.name,
                role_id: payload.role_id,
                status: payload.status,
                receives_leads: payload.receives_leads
            }).eq('id', editingUser.id);

            if (stdError) {
                alert('Erro ao atualizar perfil: ' + stdError.message);
            } else if (rpcError) {
                // Profile updated, but Password failed
                alert('Perfil atualizado, MAS a SENHA não foi alterada.\n\nMotivo: O script de administração (RPC) não foi encontrado no banco de dados.\n\nPara corrigir: Execute o arquivo "admin_user_management.sql" no Supabase.');
            } else {
                // Success
                setIsModalOpen(false);
                setEditingUser({});
                fetchUsers();
                return;
            }
        } else {
            // Create New User (Requires Auth API or different flow, but for now insert into public)
            // Ideally, we should use supabase.auth.signUp() but that logs the user in.
            // For this simplified admin, we'll stick to inserting into SITE_Users and assume Auth is handled separately or via Invite.
            // OR we can use the same RPC if we adjust it to INSERT if not exists, but auth.users insert is tricky without admin API.
            // Let's keep the existing logic for INSERT but warn about password.

            // Create New User Logic
            if (!editingUser.password) {
                alert('Senha é obrigatória para novos usuários.');
                return;
            }

            const { data, error } = await supabase.rpc('admin_create_user', {
                new_email: editingUser.email,
                new_password: editingUser.password,
                new_name: payload.name,
                new_role_id: payload.role_id,
                new_status: payload.status || 'Active',
                new_receives_leads: payload.receives_leads
            });

            if (error) {
                console.error("Create User Error:", error);
                if (error.message?.includes('function') || error.code === '42883') {
                    alert('Erro: O script de criação de usuários (RPC) não foi encontrado no banco de dados.\n\nExecute o arquivo "admin_user_management.sql" no Supabase.');
                } else {
                    alert('Erro ao criar usuário: ' + error.message);
                }
                return;
            }

            // Success
            setIsModalOpen(false);
            setEditingUser({});
            fetchUsers();
        }
    };

    const handleDeleteUser = async (id: string) => {
        if (!confirm('Tem certeza? Esta ação removerá o acesso do usuário permanentemente.')) return;

        const { error } = await supabase.rpc('admin_delete_user', { target_user_id: id });
        if (error) {
            alert('Erro ao excluir: ' + error.message);
        } else {
            setUsers(prev => prev.filter(u => u.id !== id));
            setIsModalOpen(false);
        }
    };

    const handleUpdateProfile = async (data: any) => {
        // Logic to update own profile (password would require Auth API)
        if (data.password) {
            await supabase.auth.updateUser({ password: data.password });
        }
        await supabase.from('SITE_Users').update({
            name: data.name,
            email: data.email,
            phone: data.phone
        }).eq('id', user?.id);

        setShowProfileModal(false);
        alert('Perfil atualizado com sucesso!');
        window.location.reload();
    };

    const getRoleName = (roleId?: string) => {
        const role = roles.find(r => r.id === roleId);
        return role ? role.name : 'Sem Cargo';
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-200 pb-6">
                <div>
                    <h2 className="text-3xl font-black text-gray-900 tracking-tight">Equipe & Acessos</h2>
                    <p className="text-gray-500 mt-1">Gerencie os colaboradores e suas permissões no sistema.</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => setShowProfileModal(true)}
                        className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg font-bold text-xs uppercase hover:bg-gray-50 flex items-center gap-2 shadow-sm"
                    >
                        <User size={16} /> Meu Perfil
                    </button>
                    {hasPermission('manage_users') && (
                        <button onClick={() => { setEditingUser({}); setIsModalOpen(true); }} className="bg-wtech-black text-white px-6 py-2 rounded-lg font-bold uppercase shadow-lg hover:bg-gray-800 transition-all flex items-center gap-2 text-xs">
                            <Plus size={16} /> Novo Membro
                        </button>
                    )}
                </div>
            </div>

            {/* User Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {users.map(u => (
                    <div key={u.id} onClick={() => { setEditingUser(u); setIsModalOpen(true); }} className="bg-white group hover:shadow-xl transition-all duration-300 rounded-2xl border border-gray-100 p-6 flex flex-col items-center text-center relative overflow-hidden cursor-pointer">
                        <div className={`absolute top-0 left-0 w-full h-1 ${u.status === 'Active' ? 'bg-green-500' : 'bg-gray-300'}`} />

                        {/* Avatar */}
                        <div className="w-20 h-20 rounded-full bg-gray-50 border-2 border-white shadow-lg flex items-center justify-center text-2xl font-bold text-gray-400 mb-4 group-hover:scale-110 transition-transform bg-gradient-to-br from-gray-50 to-gray-100 group-hover:from-wtech-gold/20 group-hover:to-yellow-50">
                            {u.name.charAt(0)}
                        </div>

                        <h3 className="font-bold text-lg text-gray-900 mb-1 group-hover:text-wtech-gold transition-colors">{u.name}</h3>
                        <p className="text-xs text-wtech-gold font-bold uppercase tracking-wider mb-4">{getRoleName(u.role_id)}</p>

                        <div className="w-full border-t border-gray-50 my-4"></div>

                        <div className="text-xs text-gray-400 space-y-1 mb-6">
                            <p>{u.email}</p>
                            <p>{u.phone || 'Sem telefone'}</p>
                        </div>

                        <div className="mt-auto w-full">
                            <button
                                className="w-full py-2 rounded border border-gray-200 text-gray-500 font-bold text-xs uppercase group-hover:bg-black group-hover:text-white group-hover:border-black transition-colors"
                            >
                                Editar Perfil
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal for User Editing (Admin) */}
            <AnimatePresence>
                {isModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
                        onClick={() => setIsModalOpen(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
                            onClick={e => e.stopPropagation()}
                            className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md"
                        >
                            <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
                                <h3 className="text-xl font-bold text-gray-900">{editingUser.id ? 'Editar Colaborador' : 'Novo Colaborador'}</h3>
                                <div className="flex gap-2">
                                    {editingUser.id && hasPermission('manage_users') && (
                                        <button
                                            onClick={() => handleDeleteUser(editingUser.id!)}
                                            className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
                                            title="Excluir Usuário"
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                    )}
                                    <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome Completo</label>
                                    <input
                                        className="w-full border border-gray-200 rounded-lg p-3 text-sm font-medium focus:border-wtech-gold outline-none"
                                        value={editingUser.name || ''}
                                        onChange={e => setEditingUser({ ...editingUser, name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">E-mail</label>
                                    <input
                                        className="w-full border border-gray-200 rounded-lg p-3 text-sm font-medium focus:border-wtech-gold outline-none"
                                        value={editingUser.email || ''}
                                        onChange={e => setEditingUser({ ...editingUser, email: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Senha {editingUser.id && '(Deixe em branco para manter)'}</label>
                                    <div className="relative">
                                        <Lock size={16} className="absolute left-3 top-3 text-gray-400" />
                                        <input
                                            type="password"
                                            className="w-full border border-gray-200 rounded-lg pl-10 pr-3 py-3 text-sm font-medium focus:border-wtech-gold outline-none"
                                            placeholder={editingUser.id ? "Nova senha..." : "Definir senha..."}
                                            value={editingUser.password || ''}
                                            onChange={e => setEditingUser({ ...editingUser, password: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cargo / Função</label>
                                    <select
                                        className="w-full border border-gray-200 rounded-lg p-3 text-sm font-medium focus:border-wtech-gold outline-none bg-white"
                                        value={editingUser.role_id || ''}
                                        onChange={e => setEditingUser({ ...editingUser, role_id: e.target.value })}
                                    >
                                        <option value="">Sem Cargo</option>
                                        {roles.map(r => (
                                            <option key={r.id} value={r.id}>{r.name} (Nível {r.level})</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Status</label>
                                    <select
                                        className="w-full border border-gray-200 rounded-lg p-3 text-sm font-medium focus:border-wtech-gold outline-none bg-white"
                                        value={editingUser.status || 'Active'}
                                        onChange={e => setEditingUser({ ...editingUser, status: e.target.value as any })}
                                    >
                                        <option value="Active">Ativo</option>
                                        <option value="Inactive">Bloqueado / Inativo</option>
                                    </select>
                                </div>

                                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                                    <input
                                        type="checkbox"
                                        id="receives_leads"
                                        className="w-5 h-5 text-wtech-gold rounded focus:ring-wtech-gold"
                                        checked={editingUser.receives_leads || false}
                                        onChange={e => setEditingUser({ ...editingUser, receives_leads: e.target.checked })}
                                    />
                                    <label htmlFor="receives_leads" className="text-sm font-bold text-blue-900 cursor-pointer">
                                        Apto a receber Leads (Atendimento)
                                        <p className="text-[10px] font-normal text-blue-700">Se marcado, receberá leads automaticamente.</p>
                                    </label>
                                </div>

                                <div className="pt-4 flex gap-3">
                                    <button onClick={() => setIsModalOpen(false)} className="flex-1 py-3 border border-gray-200 rounded-lg font-bold text-gray-600 hover:bg-gray-50">Cancelar</button>
                                    <button onClick={handleSaveUser} className="flex-1 py-3 bg-wtech-black text-white rounded-lg font-bold hover:bg-gray-800 shadow-lg">Salvar Dados</button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Modal for "Meu Perfil" (Self Edit) */}
            <AnimatePresence>
                {showProfileModal && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
                        onClick={() => setShowProfileModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
                            onClick={e => e.stopPropagation()}
                            className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold">Meu Perfil</h3>
                                <button onClick={() => setShowProfileModal(false)}><X size={20} className="text-gray-400 hover:text-black" /></button>
                            </div>

                            <form onSubmit={(e) => {
                                e.preventDefault();
                                const formData = new FormData(e.currentTarget);
                                handleUpdateProfile(Object.fromEntries(formData));
                            }} className="space-y-4">

                                <div className="flex justify-center mb-6">
                                    <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center text-4xl font-bold text-gray-400 border-4 border-white shadow-lg">
                                        {user?.name?.charAt(0)}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome Completo</label>
                                    <input name="name" defaultValue={user?.name} className="w-full border border-gray-300 p-3 rounded-lg" required />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">E-mail</label>
                                    <input name="email" defaultValue={user?.email} className="w-full border border-gray-300 p-3 rounded-lg text-gray-500 bg-gray-100 cursor-not-allowed" readOnly />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Telefone</label>
                                    <input name="phone" defaultValue={user?.phone} className="w-full border border-gray-300 p-3 rounded-lg" placeholder="(00) 00000-0000" />
                                </div>

                                <div className="pt-4 border-t border-gray-100 mt-4">
                                    <h4 className="text-xs font-bold text-gray-900 uppercase mb-3">Segurança</h4>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Alterar Senha</label>
                                        <input name="password" type="password" className="w-full border border-gray-300 p-3 rounded-lg" placeholder="Nova senha (deixe em branco para manter)" />
                                    </div>
                                </div>

                                <button type="submit" className="w-full py-4 bg-wtech-gold text-black font-bold rounded-lg shadow-lg hover:brightness-110 mt-6 uppercase tracking-wide">
                                    Atualizar Meu Perfil
                                </button>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// --- Main Admin Layout ---

const Admin: React.FC = () => {
    const { settings: config } = useSettings();
    const [currentView, setCurrentView] = useState<View>('dashboard');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const { user, loading, logout } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!loading && !user) {
            navigate('/');
        }
    }, [user, loading, navigate]);

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    if (loading || !user) return <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-wtech-gold"></div></div>;

    return (
        <div className="flex h-screen bg-[#F8F9FA] overflow-hidden">

            {/* Mobile Header / Hamburger */}
            <div className="md:hidden fixed top-0 w-full z-20 bg-black text-white p-4 flex justify-between items-center shadow-lg">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded bg-gradient-to-br from-wtech-gold to-yellow-600 flex items-center justify-center font-bold text-black font-sans">W</div>
                    <span className="font-bold tracking-tight">ADMIN</span>
                </div>
                <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                    {isMobileMenuOpen ? <X size={24} /> : <List size={24} />}
                </button>
            </div>

            {/* Sidebar (Desktop + Mobile Overlay) */}
            <div className={`
            fixed inset-y-0 left-0 z-30 w-64 bg-black text-white p-6 transform transition-transform duration-300 ease-in-out md:static md:translate-x-0 flex flex-col justify-between shadow-2xl
            ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
                <div>
                    <div className="flex items-center gap-3 mb-10 mt-12 md:mt-0">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-wtech-gold to-yellow-600 flex items-center justify-center text-black font-bold text-xl font-sans shadow-lg shadow-yellow-500/20">
                            {config.logo_url ? <img src={config.logo_url} className="w-full h-full object-cover rounded-lg" /> : 'W'}
                        </div>
                        <div>
                            <h1 className="font-black text-xl tracking-tighter text-white leading-none">{config.site_title || 'W-TECH'}</h1>
                            <p className="text-[10px] text-gray-400 font-bold tracking-widest uppercase">Admin</p>
                        </div>
                    </div>

                    {/* Sidebar User Profile */}
                    <div onClick={() => { setCurrentView('team'); setIsMobileMenuOpen(false); }} className="mb-6 mx-2 p-3 bg-white/5 rounded-xl border border-white/10 flex items-center gap-3 cursor-pointer hover:bg-white/10 transition-colors group">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-wtech-gold to-yellow-700 flex items-center justify-center text-black font-bold text-lg shadow-lg">
                            {user?.name?.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-bold text-white truncate group-hover:text-wtech-gold transition-colors">{user?.name}</div>
                            <div className="text-[10px] text-gray-400 font-medium uppercase truncate">
                                {typeof user?.role === 'string' ? user?.role : (user?.role?.name || 'Sem Cargo')}
                            </div>
                        </div>
                        <Settings size={14} className="text-gray-500 group-hover:text-white transition-colors" />
                    </div>

                    <div className="space-y-1 overflow-y-auto max-h-[calc(100vh-180px)] custom-scrollbar">
                        <SidebarItem icon={LayoutDashboard} label="Visão Geral" active={currentView === 'dashboard'} onClick={() => { setCurrentView('dashboard'); setIsMobileMenuOpen(false); }} />
                        <SidebarItem icon={KanbanSquare} label="Leads & CRM" active={currentView === 'crm'} onClick={() => { setCurrentView('crm'); setIsMobileMenuOpen(false); }} />
                        <SidebarItem icon={Users} label="Equipe & Acesso" active={currentView === 'team'} onClick={() => { setCurrentView('team'); setIsMobileMenuOpen(false); }} />
                        <SidebarItem icon={ShoppingBag} label="Pedidos (Loja)" active={currentView === 'orders'} onClick={() => { setCurrentView('orders'); setIsMobileMenuOpen(false); }} />
                        <SidebarItem icon={GraduationCap} label="Cursos & Alunos" active={currentView === 'courses_manager'} onClick={() => { setCurrentView('courses_manager'); setIsMobileMenuOpen(false); }} />
                        <SidebarItem icon={Wrench} label="Rede Credenciada" active={currentView === 'mechanics'} onClick={() => { setCurrentView('mechanics'); setIsMobileMenuOpen(false); }} />
                        <SidebarItem icon={DollarSign} label="Fluxo de Caixa" active={currentView === 'finance'} onClick={() => { setCurrentView('finance'); setIsMobileMenuOpen(false); }} />
                        <SidebarItem icon={Monitor} label="Landing Pages" active={currentView === 'lp_builder'} onClick={() => { setCurrentView('lp_builder'); setIsMobileMenuOpen(false); }} />

                        <div className="pt-4 mt-4 border-t border-gray-800">
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 px-3">Conteúdo & IA</p>

                            <SidebarItem icon={BookOpen} label="Blog Manager" active={currentView === 'blog_manager'} onClick={() => { setCurrentView('blog_manager'); setIsMobileMenuOpen(false); }} />
                            <SidebarItem icon={Mail} label="Email Marketing" active={currentView === 'email_marketing'} onClick={() => { setCurrentView('email_marketing'); setIsMobileMenuOpen(false); }} />
                        </div>

                        <div className="pt-4 mt-4 border-t border-gray-800">
                            <SidebarItem icon={Settings} label="Configurações" active={currentView === 'settings'} onClick={() => { setCurrentView('settings'); setIsMobileMenuOpen(false); }} />
                        </div>
                    </div>
                </div>

                <button onClick={handleLogout} className="w-full mb-4 md:mb-0 flex items-center justify-center gap-2 p-3 rounded-lg border border-red-900/30 text-red-500 hover:bg-red-900/10 font-bold transition-all text-xs uppercase tracking-wide">
                    <LogOut size={16} /> Sair do Sistema
                </button>
            </div>

            {/* Mobile Overlay Backdrop */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-20 md:hidden backdrop-blur-sm"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden pt-16 md:pt-0 bg-gray-50/50">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentView}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.2 }}
                        className="p-4 md:p-6 w-full min-h-full"
                    >
                        {currentView === 'dashboard' && <DashboardView />}
                        {currentView === 'crm' && <CRMView />}
                        {currentView === 'team' && <TeamView />}
                        {currentView === 'orders' && <OrdersView />}
                        {currentView === 'finance' && <FinanceView />}
                        {currentView === 'mechanics' && <MechanicsView />}
                        {currentView === 'courses_manager' && <CoursesManagerView />}
                        {currentView === 'lp_builder' && <LandingPagesView />}
                        {currentView === 'blog_manager' && <BlogManagerView />}
                        {currentView === 'email_marketing' && <EmailMarketingView />}
                        {currentView === 'settings' && <SettingsView />}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
};
export default Admin;
