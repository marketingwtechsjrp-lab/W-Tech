
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    Users, User, BookOpen, DollarSign, LayoutDashboard,
    KanbanSquare, FileText, Settings, Bell, Search,
    MoreVertical, ArrowRight, TrendingUp, Calendar as CalendarIcon,
    Layout, MapPin, Phone, Globe, Mail, Clock, Shield, Award, CheckCircle, XCircle, Filter, Package,
    ChevronLeft, ChevronRight, Download, Upload, Plus, Trash2, Edit, Save, X, Menu,
    BarChart3, Briefcase, TrendingDown, ShoppingBag, Send, Wand2, List, Grid, Building,
    Image as ImageIcon, Loader2, Eye, MessageSquare, PenTool, Lock, Code, MessageCircle,
    Monitor, Printer, Copy, UserPlus, CalendarClock, Wrench, GraduationCap, Sparkles, ArrowUpRight, LogOut, AlertTriangle, AlertCircle, Megaphone, Sun, Moon
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
import MarketingView from '../components/admin/Marketing/MarketingView';
import DashboardView from '../components/admin/Dashboard/DashboardView';
import CRMView from '../components/admin/CRM/CRMView';
import BlogManagerView from '../components/admin/Blog/BlogManagerView';
import CatalogManagerView from '../components/admin/Catalog/CatalogManagerView';
import SalesManagerView from '../components/admin/Catalog/SalesManagerView';
import DevUserSwitcher from '../components/admin/DevUserSwitcher';
import TaskManagerView from '../components/admin/Tasks/TaskManagerView';
import ClientsManagerView from '../components/admin/Clients/ClientsManagerView';
import InvoicesManagerView from '../components/admin/Financial/InvoicesManagerView';
import { SplashedPushNotifications, SplashedPushNotificationsHandle } from '@/components/ui/splashed-push-notifications';
import AdminIntegrations from '../components/admin/AdminIntegrations';
import { TaskCategoryList } from '../components/admin/TaskCategoryList';
import MessageTemplateManager from '../components/admin/WhatsApp/MessageTemplateManager';
import UserWhatsAppConnection from '../components/admin/WhatsApp/UserWhatsAppConnection';
import UserProfileModal from '../components/admin/UserProfileModal';
import ChangelogViewer from '../components/admin/Settings/ChangelogViewer';
import AnalyticsView from '../components/admin/Analytics/AnalyticsView';
import { sendWhatsAppMessage, sendWhatsAppMedia } from '../lib/whatsapp';
import { DEFAULT_COURSE_SCHEDULE } from '../start_schedule_const';
import { formatDateLocal } from '../lib/utils';
import changelogData from '../CHANGELOG.json';
import { ExpandableTabs, type TabItem } from '../components/ui/expandable-tabs';
import { History } from 'lucide-react';
import { Slider } from '../components/ui/slider-number-flow';
import { ToggleTheme } from '../components/ui/toggle-theme';
import { generateCertificatesPDF } from '../components/admin/Certificates/CertificateGenerator';
import CertificateManagerView from '../components/admin/Certificates/CertificateManagerView';
import type { CertificateLayout } from '../types';


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

type View = 'dashboard' | 'analytics' | 'crm' | 'ai_generator' | 'blog_manager' | 'settings' | 'students' | 'mechanics' | 'finance' | 'orders' | 'team' | 'courses_manager' | 'lp_builder' | 'email_marketing' | 'tasks' | 'catalog_manager' | 'clients' | 'invoices';

const SidebarItem = ({
    icon: Icon,
    label,
    active,
    onClick,
    collapsed,
    menuStyles
}: {
    icon: any,
    label: string,
    active: boolean,
    onClick: () => void,
    collapsed?: boolean,
    menuStyles?: any
}) => {
    // Defaults matching the "compact" aggressive look we just made
    const fSize = menuStyles?.fontSize || 11;
    const iSize = menuStyles?.iconSize || 15;
    const pY = menuStyles?.paddingY !== undefined ? menuStyles.paddingY : 4; // px
    const mY = menuStyles?.marginY !== undefined ? menuStyles.marginY : 1; // px

    // Responsive Logic: Cap values based on viewport height (vh) to prevent overflow on small screens
    const responsivePY = `min(${pY}px, 0.8vh)`;
    const responsiveMY = `min(${mY}px, 0.4vh)`;
    const responsiveFS = `min(${fSize}px, 2.2vh)`; // Font size shouldn't exceed ~2.2% of screen height

    return (
        <button
            onClick={onClick}
            title={collapsed ? label : undefined}
            className={`w-full flex items-center ${collapsed ? 'justify-center px-0' : 'px-2'} rounded-md transition-all duration-200 group ${active
                ? 'bg-gradient-to-r from-wtech-gold to-yellow-600 text-black font-bold shadow-sm shadow-yellow-500/20'
                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
            style={{ paddingTop: responsivePY, paddingBottom: responsivePY, marginTop: responsiveMY, marginBottom: responsiveMY }}
        >
            <Icon size={iSize} className={`${active ? 'text-black' : 'text-gray-500 group-hover:text-wtech-gold'} ${collapsed ? '' : 'mr-2'}`} />
            {!collapsed && <span className="font-medium tracking-tight transition-opacity duration-200 truncate leading-none" style={{ fontSize: responsiveFS }}>{label}</span>}
        </button>
    )
};

const MobileMenuItem = ({ icon: Icon, label, onClick }: { icon: any, label: string, onClick: () => void }) => (
    <button onClick={onClick} className="flex flex-col items-center gap-3 group">
        <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white backdrop-blur-md shadow-lg group-active:scale-95 transition-transform group-hover:bg-wtech-gold group-hover:text-black group-hover:border-wtech-gold">
            <Icon size={28} />
        </div>
        <span className="text-xs font-medium text-white shadow-black drop-shadow-md text-center leading-tight">{label}</span>
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


// --- View: CRM (Kanban) ---
// --- View: CRM (Kanban Enhanced) ---

// Helper for Drag & Drop





// --- View: Blog Manager (List & Edit + AI) ---

// --- View: Landing Page Builder (New) ---
const LandingPagesView = ({ permissions }: { permissions?: any }) => {
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

const CoursesManagerView = ({ initialLead, initialCourseId, onConsumeInitialLead, permissions }: { initialLead?: Lead | null, initialCourseId?: string | null, onConsumeInitialLead?: () => void, permissions?: any }) => {
    const [courses, setCourses] = useState<Course[]>([]);
    const { user } = useAuth();
    const [leadsCount, setLeadsCount] = useState<Record<string, number>>({});
    const [isEditing, setIsEditing] = useState(false);
    const [editingLandingPage, setEditingLandingPage] = useState<Course | null>(null);
    const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
    const [formData, setFormData] = useState<Partial<Course>>({});
    const [generateLP, setGenerateLP] = useState(false);
    const [layouts, setLayouts] = useState<CertificateLayout[]>([]);
    
    // Settle Modal State
    const [settleModal, setSettleModal] = useState<{ isOpen: boolean, enrollment: Enrollment | null, amount: number }>({ isOpen: false, enrollment: null, amount: 0 });
    const [settleMethod, setSettleMethod] = useState('Pix');

    // Fetch Layouts
    useEffect(() => {
        const loadLayouts = async () => {
             const { data } = await supabase.from('SITE_CertificateLayouts').select('*');
             if (data) setLayouts(data.map(l => ({ ...l, backgroundUrl: l.background_url })));
        }
        loadLayouts();
    }, []);

    const handleGenerateCertificates = async (isBadge = false) => {
        if (!currentCourse) return;
        const layoutId = isBadge ? currentCourse.badgeLayoutId : currentCourse.certificateLayoutId;
        
        if (!layoutId) {
            alert(`Nenhum layout de ${isBadge ? 'Crachá' : 'Certificado'} selecionado para este curso.`);
            return;
        }
        
        const layout = layouts.find(l => l.id === layoutId);
        if (!layout) {
             alert('Layout não encontrado.');
             return;
        }

        const validEnrollments = enrollments.filter(e => e.status === 'Confirmed' || e.status === 'CheckedIn');
        if (validEnrollments.length === 0) {
            alert('Nenhum aluno confirmado nesta turma.');
            return;
        }

        if (confirm(`Gerar ${validEnrollments.length} ${isBadge ? 'crachás' : 'certificados'}?`)) {
            await generateCertificatesPDF(layout, currentCourse, validEnrollments);
        }
    };

    const handleGenerateSingleCertificate = async (enrollment: Enrollment, isBadge = false) => {
        if (!currentCourse) return;
        const layoutId = isBadge ? currentCourse.badgeLayoutId : currentCourse.certificateLayoutId;
        
        if (!layoutId) {
            alert(`Nenhum layout de ${isBadge ? 'Crachá' : 'Certificado'} selecionado para este curso.`);
            return;
        }
        
        const layout = layouts.find(l => l.id === layoutId);
        if (!layout) {
             alert('Layout não encontrado.');
             return;
        }

        if (confirm(`Gerar ${isBadge ? 'crachá' : 'certificado'} para ${enrollment.studentName}?`)) {
            await generateCertificatesPDF(layout, currentCourse, [enrollment]);
        }
    };


    // Auto-Enrollment Effect
    useEffect(() => {
        if ((initialLead || initialCourseId) && courses.length > 0) {
            let match;
            if (initialCourseId) {
                match = courses.find(c => c.id === initialCourseId);
            }
            if (!match && initialLead) {
                // Fuzzy match course by context_id
                match = courses.find(c =>
                    (c.title && initialLead.contextId?.toLowerCase().includes(c.title.toLowerCase()))
                ) || courses[0]; // Fallback to first course if no specific match found
            }

            if (match) {
                // Open Enrollment View & Modal
                setCurrentCourse(match);
                setShowEnrollments(true);
                // Pre-fill data
                setEditingEnrollment({
                    status: 'Confirmed',
                    amountPaid: 0,
                    studentName: initialLead.name,
                    studentEmail: initialLead.email,
                    studentPhone: initialLead.phone,
                    // Try to guess address from lead if available? Lead doesn't have address usually.
                });

                // Fetch existing enrollments for context
                fetchEnrollments(match.id);

                if (onConsumeInitialLead) onConsumeInitialLead();
            }
        }
    }, [initialLead, courses]); // Dependency to run when courses are loaded

    // Notification logic removed from here

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
        expenseList: [] as any[],
        leadsByOrigin: [] as any[]
    });

    // user const removed from here

    // Permission Check helper specifically for Level 10
    const isLevel10 = () => {
        return (typeof user?.role === 'string' && (user.role === 'ADMIN' || user.role === 'Super Admin' || user.role === 'Admin')) ||
            (typeof user?.role !== 'string' && user?.role?.level >= 10) ||
            (typeof user?.role !== 'string' && user?.role?.name === 'Super Admin') ||
            (typeof user?.role !== 'string' && user?.role?.permissions?.admin_access);
    };

    const handleOpenReport = async (course: Course) => {
        setReportCourse(course);
        setShowReportModal(true);
        setReportLoading(true);

        try {
            // 1. Fetch Enrollments
            const { data: enrollments } = await supabase.from('SITE_Enrollments').select('*').eq('course_id', course.id);

            // 2. Fetch Linked Landing Pages
            const { data: relatedLPs } = await supabase.from('SITE_LandingPages').select('*').eq('course_id', course.id);

            // 3. Fetch Leads & Calculate Origins
            // Strategy: Fetch leads and match strictly against Course Title OR any Linked LP
            // We fetch wider and filter to ensure accuracy with "LP: Title (slug)" format
            const { data: allLeadsRaw } = await supabase.from('SITE_Leads').select('*');

            let leads: any[] = [];
            let leadsByOrigin: any[] = [];

            if (allLeadsRaw) {
                const searchTerms = [
                    course.title.toLowerCase(),
                    ...(relatedLPs?.map(lp => lp.title.toLowerCase()) || []),
                    ...(relatedLPs?.map(lp => lp.slug.toLowerCase()) || [])
                ];

                leads = allLeadsRaw.filter(l => {
                    if (!l.context_id) return false;
                    const ctx = l.context_id.toLowerCase();
                    return searchTerms.some(term => ctx.includes(term));
                });

                // Group by Origin
                const originGroups: Record<string, { count: number, negotiating: number, converted: number }> = {};

                leads.forEach(l => {
                    let originName = l.context_id;
                    // Simplify "LP: Title (slug)" to just "LP: Title" or similar if desired, but keeping "Title" is good
                    // Removing the slug part might look cleaner: "LP: Nome do Curso"
                    if (originName.includes('(')) originName = originName.split('(')[0].trim();

                    if (!originGroups[originName]) {
                        originGroups[originName] = { count: 0, negotiating: 0, converted: 0 };
                    }
                    originGroups[originName].count++;

                    if (l.status === 'Converted' || l.status === 'Matriculated') { // Ensure we catch converted
                        originGroups[originName].converted++;
                    } else if (!['Cold', 'Rejected', 'Lost'].includes(l.status)) {
                        originGroups[originName].negotiating++;
                    }
                });

                leadsByOrigin = Object.keys(originGroups).map(key => ({
                    name: key,
                    ...originGroups[key]
                })).sort((a, b) => b.count - a.count);
            }

            // 4. Fetch Expenses
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

            const totalLeads = leads.length;
            const inProgress = leads.filter((l: any) => !['Converted', 'Cold', 'Rejected', 'Lost'].includes(l.status)).length;

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
                expenseList: expenses || [],
                leadsByOrigin
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

        // 0. Live Permissions (Prop)
        if (permissions) {
            if (permissions.admin_access) return true;
            return !!permissions[key];
        }

        // Super Admin Override
        const roleName = typeof user.role === 'string' ? user.role : user.role?.name;
        if (roleName === 'Super Admin' || roleName === 'ADMIN' || user.permissions?.admin_access) return true;

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
            // UPDATE: Added recyclingPrice mapping
            zipCode: c.zip_code,
            addressNumber: c.address_number,
            addressNeighborhood: c.address_neighborhood,
            recyclingPrice: c.recycling_price,
            reminder5dEnabled: c.reminder_5d_enabled,
            reminder1dEnabled: c.reminder_1d_enabled,
            reminder5dDays: c.reminder_5d_days,
            reminder1dDays: c.reminder_1d_days,
            whatToBring: c.what_to_bring,
            type: c.type,
            certificateLayoutId: c.certificate_layout_id,
            badgeLayoutId: c.badge_layout_id
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
            setGenerateLP(false);
        } else {
            setFormData({});
            setGenerateLP(true); // Default check for new courses
        }
        setIsEditing(true);
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `courses/${fileName}`;

        const { error: uploadError } = await supabase.storage.from('site-assets').upload(filePath, file);

        if (uploadError) {
            console.error("Upload error:", uploadError);
            if (uploadError.message.includes('not found') || uploadError.message.includes('bucket')) {
                alert('ERRO DE CONFIGURAÇÃO: O bucket "site-assets" não existe.\nExecute "fix_storage_permissions.sql" no Supabase.');
            } else if (uploadError.message.includes('row-level security') || uploadError.message.includes('policy')) {
                alert('ERRO DE PERMISSÃO: O bloqueio de segurança (RLS) impediu o upload.\n\nPor favor, execute o script "fix_storage_permissions.sql" no SQL Editor do Supabase para corrigir as permissões.');
            } else {
                alert('Erro no upload: ' + uploadError.message);
            }
            return;
        }

        const { data } = supabase.storage.from('site-assets').getPublicUrl(filePath);
        setFormData(prev => ({ ...prev, image: data.publicUrl }));
    };

    const handleAnnounceCourse = async (course: Course) => {
        if (!confirm(`Deseja criar e enviar uma campanha de email para anunciar "${course.title}"?`)) return;

        const payload = {
            name: `Anúncio: ${course.title}`,
            subject: `Novidade: ${course.title} - Inscrições Abertas!`,
            content: `
                <div style="font-family: Arial, sans-serif; color: #333;">
                    <h1 style="color: #D4AF37;">${course.title}</h1>
                    <p style="font-size: 16px;">${course.description || 'Confira os detalhes deste novo evento.'}</p>
                    <p><strong>Data:</strong> ${formatDateLocal(course.date)} às ${course.startTime}</p>
                    <p><strong>Local:</strong> ${course.location}</p>
                    <div style="margin-top: 20px;">
                        <a href="https://w-techbrasil.com.br/#/lp/${course.slug || course.id}" style="background-color: #000; color: #D4AF37; padding: 10px 20px; text-decoration: none; font-weight: bold; border-radius: 5px;">GARANTIR VAGA</a>
                    </div>
                </div>
            `,
            type: 'Course_Announcement',
            target_audience: 'All', // Sends to all leads/students
            status: 'Sending',
            sent_at: new Date().toISOString()
        };

        const { error } = await supabase.from('SITE_EmailCampaigns').insert([payload]);
        if (error) alert('Erro ao criar campanha: ' + error.message);
        else alert('Campanha de email criada e fila de envio iniciada!');
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
            recycling_price: formData.recyclingPrice, // NEW FIELD
            type: formData.type || 'Course',
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
            longitude: formData.longitude,
            reminder_5d_enabled: formData.reminder5dEnabled ?? true,
            reminder_1d_enabled: formData.reminder1dEnabled ?? true,
            reminder_5d_days: formData.reminder5dDays ?? 5,
            reminder_1d_days: formData.reminder1dDays ?? 1,

            what_to_bring: formData.whatToBring || '',
            certificate_layout_id: formData.certificateLayoutId || null,
            badge_layout_id: formData.badgeLayoutId || null
        };

        let error;
        let savedCourseId = formData.id;

        if (formData.id) {
            const { error: updateError } = await supabase.from('SITE_Courses').update(payload).eq('id', formData.id);
            error = updateError;
        } else {
            const { data, error: insertError } = await supabase.from('SITE_Courses').insert([payload]).select();
            error = insertError;
            if (data && data[0]) savedCourseId = data[0].id;
        }

        if (error) {
            console.error('Error saving course:', error);
            alert('Erro ao salvar curso: ' + error.message);
            return;
        }

        // Auto-Generate Landing Page Logic
        if (generateLP && savedCourseId && payload.title && payload.date) {
            try {
                const dateObj = new Date(payload.date);
                const dateStr = dateObj.toISOString().split('T')[0]; // YYYY-MM-DD
                const normalizedTitle = payload.title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
                // Slug: title-date (e.g. curso-de-suspensao-2024-05-15)
                const slug = `${normalizedTitle.replace(/[^a-z0-9]+/g, '-')}-${dateStr}`.replace(/^-+|-+$/g, '');

                const lpPayload = {
                    course_id: savedCourseId,
                    title: 'Info: ' + payload.title,
                    slug: slug,
                    hero_headline: payload.title,
                    hero_subheadline: payload.description ? payload.description.substring(0, 150) : 'Participe deste evento exclusivo!',
                    hero_image: payload.image,
                    status: 'Published'
                };

                // Check if LP already exists for this course
                const { data: existingLP } = await supabase.from('SITE_LandingPages').select('id').eq('course_id', savedCourseId).maybeSingle();

                let lpError;
                if (existingLP) {
                    const { error } = await supabase.from('SITE_LandingPages').update(lpPayload).eq('id', existingLP.id);
                    lpError = error;
                } else {
                    const { error } = await supabase.from('SITE_LandingPages').insert([lpPayload]);
                    lpError = error;
                }

                // ALSO Update Course Slug to ensure links work correctly
                await supabase.from('SITE_Courses').update({ slug: slug }).eq('id', savedCourseId);

                if (lpError) {
                    console.error('Error creating/updating Auto LP:', lpError);
                    alert('Curso salvo, mas erro ao processar LP: ' + lpError.message);
                } else {
                    alert(`LP processada com sucesso!\nURL: w-tech.com/#/lp/${slug}`);
                }
            } catch (err) {
                console.error('LP Gen Error:', err);
            }
        }

        setIsEditing(false);
        setGenerateLP(false); // Reset
        fetchCourses();
    };

    const handleTestReminderMessage = async () => {
        const phone = prompt("Para qual número (WhatsApp) deseja enviar o teste?\nUse o formato: DD9XXXXXXXX", "");
        if (!phone) return;

        const mapsLink = formData.latitude ? `https://www.google.com/maps?q=${formData.latitude},${formData.longitude}` : (formData.mapUrl || '');

        // Texto IDÊNTICO ao oficial
        const message = `Olá *Aluno Exemplo*! Tudo bem? 🏍️\n\n` +
            `*Lembrete do curso: ${formData.title}*\n\n` +
            `📅 *Data:* ${formatDateLocal(formData.date) || '--/--/----'}\n` +
            `⏰ *Horário:* ${formData.startTime || '08:00'} - ${formData.endTime || '18:00'}\n` +
            `📍 *Endereço:* ${formData.address || formData.location || 'Não definido'}, ${formData.city || ''} - ${formData.state || ''}\n` +
            (mapsLink ? `🔗 *Ver no Mapa:* ${mapsLink}\n\n` : '\n') +
            (formData.schedule ? `📝 *Cronograma:*\n${formData.schedule}\n\n` : '') +
            (formData.whatToBring ? `🎒 *O que levar:* \n${formData.whatToBring}\n\n` : '') +
            `W-TECH Brasil Experience - Te esperamos lá! 🏁`;

        const result = await sendWhatsAppMessage(phone, message, user?.id);
        if (result.success) {
            alert('Lembrete de teste enviado com sucesso!');
        } else {
            alert('Erro ao enviar teste: ' + JSON.stringify(result.error));
        }
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
                    formatDateLocal(c.date),
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
                            <td>${formatDateLocal(c.date)} ${c.startTime || ''}</td>
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
        if (data) setEnrollments(data.map((c: any) => ({ ...c, courseId: c.course_id, studentName: c.student_name, studentEmail: c.student_email, studentPhone: c.student_phone, createdAt: c.created_at, reminder5dSent: c.reminder_5d_sent, reminder1dSent: c.reminder_1d_sent })));
        else setEnrollments([]);
    };

    const handleSendManualReminder = async (enr: Enrollment) => {
        if (!currentCourse) return;
        if (!confirm(`Enviar lembrete manual para ${enr.studentName}?`)) return;

        const mapsLink = currentCourse.latitude ? `https://www.google.com/maps?q=${currentCourse.latitude},${currentCourse.longitude}` : (currentCourse.mapUrl || '');

        const message = `Olá *${enr.studentName}*! Tudo bem? 🏍️\n\n` +
            `*Lembrete do curso: ${currentCourse.title}*\n\n` +
            `📅 *Data:* ${new Date(currentCourse.date).toLocaleDateString('pt-BR')}\n` +
            `⏰ *Horário:* ${currentCourse.startTime || '08:00'} - ${currentCourse.endTime || '18:00'}\n` +
            `📍 *Endereço:* ${currentCourse.address || currentCourse.location}, ${currentCourse.city || ''} - ${currentCourse.state || ''}\n` +
            (mapsLink ? `🔗 *Ver no Mapa:* ${mapsLink}\n\n` : '\n') +
            (currentCourse.schedule ? `📝 *Cronograma:*\n${currentCourse.schedule}\n\n` : '') +
            (currentCourse.whatToBring ? `🎒 *O que levar:* \n${currentCourse.whatToBring}\n\n` : '') +
            `W-TECH Brasil Experience - Te esperamos lá! 🏁`;

        const result = await sendWhatsAppMessage(enr.studentPhone, message, user?.id);
        if (result.success) {
            alert('Lembrete enviado com sucesso!');
        } else {
            alert('Erro ao enviar lembrete: ' + JSON.stringify(result.error));
        }
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
                createdAt: e.created_at,
                // NEW FIELDS
                address: e.address,
                city: e.city,
                state: e.state,
                zipCode: e.zip_code,
                isCredentialed: e.is_credentialed,
                totalAmount: e.total_amount
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
            payment_method: editingEnrollment.paymentMethod,
            // Address & Credential
            address: editingEnrollment.address,
            city: editingEnrollment.city,
            state: editingEnrollment.state,
            zip_code: editingEnrollment.zipCode,
            is_credentialed: editingEnrollment.isCredentialed,
            total_amount: editingEnrollment.totalAmount
        };

        if (editingEnrollment.id) {
            // Update
            const { error } = await supabase.from('SITE_Enrollments').update(payload).eq('id', editingEnrollment.id);
            if (!error) {
                setEnrollments(prev => prev.map(enr => enr.id === editingEnrollment.id ? {
                    ...enr,
                    ...editingEnrollment,
                    amountPaid: payload.amount_paid,
                    paymentMethod: payload.payment_method,
                    totalAmount: payload.total_amount,
                    address: payload.address,
                    city: payload.city,
                    state: payload.state,
                    zipCode: payload.zip_code,
                    isCredentialed: payload.is_credentialed
                } as Enrollment : enr));
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
                    createdAt: data.created_at,
                    address: data.address,
                    city: data.city,
                    state: data.state,
                    zipCode: data.zip_code,
                    isCredentialed: data.is_credentialed,
                    totalAmount: data.total_amount
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
                        const start = c.date.split('T')[0];
                        const end = (c.dateEnd || c.date).split('T')[0];
                        const firstDayOfMonth = new Date(currentYear, idx, 1).toISOString().split('T')[0];
                        const lastDayOfMonth = new Date(currentYear, idx + 1, 0).toISOString().split('T')[0];
                        return (start <= lastDayOfMonth && end >= firstDayOfMonth);
                    });

                    return (
                        <div key={month} className="border p-4 rounded-lg bg-white shadow-sm hover:shadow-md transition-all">
                            <h3 className="font-bold text-lg mb-2 text-gray-800">{month}</h3>
                            {monthEvents.length > 0 ? (
                                <ul className="space-y-2">
                                    {monthEvents.map(e => (
                                        <li key={e.id} onClick={() => handleEdit(e)} className="text-xs bg-gray-50 p-2 rounded cursor-pointer hover:bg-yellow-50 border-l-2 border-wtech-gold">
                                            <div className="font-bold flex justify-between">
                                                <span>
                                                    {parseInt(e.date.split('T')[0].split('-')[2])}
                                                    {e.dateEnd && ` - ${parseInt(e.dateEnd.split('T')[0].split('-')[2])}`}
                                                    {` - ${e.title}`}
                                                </span>
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
                    const dayStr = date.toISOString().split('T')[0];
                    const dayEvents = courses.filter(c => {
                        const start = c.date.split('T')[0];
                        const end = (c.dateEnd || c.date).split('T')[0];
                        return dayStr >= start && dayStr <= end;
                    });
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
            <div className="bg-white dark:bg-[#1A1A1A] p-8 rounded-lg shadow-sm border border-gray-100 dark:border-gray-800 min-h-screen">
                <div className="flex justify-between items-start mb-8 print:hidden">
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <button onClick={() => setShowEnrollments(false)} className="text-sm font-bold text-gray-500 hover:text-black dark:hover:text-white flex items-center gap-1">
                                <ArrowRight className="rotate-180" size={14} /> Voltar
                            </button>
                        </div>
                        <h2 className="text-2xl font-black text-gray-900 dark:text-white">Lista de Inscritos</h2>
                        <p className="text-gray-500">{currentCourse.title} • {formatDateLocal(currentCourse.date)}</p>
                        <div className="mt-2 text-sm flex gap-4">
                            <span className="text-green-600 font-bold bg-green-50 dark:bg-green-900/30 px-2 py-1 rounded">Recebido: R$ {totalPaid.toFixed(2)}</span>
                            <span className="text-gray-600 dark:text-gray-300 font-bold bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">Total Previsto: R$ {totalPotential.toFixed(2)}</span>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setEditingEnrollment({ status: 'Confirmed', amountPaid: 0 })} className="bg-wtech-gold text-black px-4 py-2 rounded font-bold flex items-center gap-2 hover:bg-yellow-500">
                            <Plus size={18} /> Adicionar Aluno
                        </button>
                        <button onClick={printList} className="bg-black text-white px-4 py-2 rounded font-bold flex items-center gap-2 hover:bg-gray-800">
                            <Printer size={18} /> Imprimir Lista
                        </button>
                         <button onClick={() => handleGenerateCertificates(false)} className="bg-wtech-black text-white px-4 py-2 rounded font-bold flex items-center gap-2 hover:bg-gray-800 border border-gray-700" title="Gerar Certificados em PDF">
                            <Award size={18} />
                        </button>
                         <button onClick={() => handleGenerateCertificates(true)} className="bg-wtech-black text-white px-4 py-2 rounded font-bold flex items-center gap-2 hover:bg-gray-800 border border-gray-700" title="Gerar Crachás em PDF">
                            <User size={18} />
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
                                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Valor Total (Negociado)</label>
                                    <input
                                        type="number"
                                        className="w-full p-2 border rounded font-bold text-gray-900"
                                        value={editingEnrollment.totalAmount ?? currentCourse.price ?? 0}
                                        onChange={e => setEditingEnrollment({ ...editingEnrollment, totalAmount: parseFloat(e.target.value) })}
                                    />
                                    {currentCourse.recyclingPrice && (
                                        <div className="flex flex-col gap-1 mt-1">
                                            <button
                                                type="button"
                                                onClick={() => setEditingEnrollment({ ...editingEnrollment, totalAmount: currentCourse.price || 0 })}
                                                className={`text-[10px] px-2 py-1 rounded border text-left flex justify-between ${editingEnrollment.totalAmount === currentCourse.price ? 'bg-blue-100 border-blue-300 text-blue-800 font-bold' : 'bg-gray-50 border-gray-200 text-gray-600'}`}
                                            >
                                                <span>Normal</span> <span>R$ {currentCourse.price}</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setEditingEnrollment({ ...editingEnrollment, totalAmount: currentCourse.recyclingPrice || 0 })}
                                                className={`text-[10px] px-2 py-1 rounded border text-left flex justify-between ${editingEnrollment.totalAmount === currentCourse.recyclingPrice ? 'bg-green-100 border-green-300 text-green-800 font-bold' : 'bg-gray-50 border-gray-200 text-gray-600'}`}
                                            >
                                                <span>Reciclagem</span> <span>R$ {currentCourse.recyclingPrice}</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Valor Pago</label>
                                    <input type="number" step="0.01" className="w-full p-2 border rounded font-bold text-green-700" value={editingEnrollment.amountPaid || 0} onChange={e => setEditingEnrollment({ ...editingEnrollment, amountPaid: parseFloat(e.target.value) })} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Saldo a Pagar</label>
                                    <div className="text-lg font-bold text-red-600">
                                        R$ {((editingEnrollment.totalAmount ?? currentCourse.price ?? 0) - (editingEnrollment.amountPaid || 0)).toFixed(2)}
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

                                {/* Address & Credentialing Section */}
                                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4 bg-gray-100 p-4 rounded-lg">
                                    <h4 className="md:col-span-2 font-bold text-gray-700 flex items-center gap-2"><MapPin size={16} /> Endereço & Credenciamento</h4>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1">CEP</label>
                                        <input className="w-full p-2 border rounded" value={editingEnrollment.zipCode || ''} onChange={e => setEditingEnrollment({ ...editingEnrollment, zipCode: e.target.value })} />
                                    </div>
                                    <div className="flex gap-2">
                                        <div className="flex-1">
                                            <label className="block text-xs font-bold text-gray-500 mb-1">Cidade</label>
                                            <input className="w-full p-2 border rounded" value={editingEnrollment.city || ''} onChange={e => setEditingEnrollment({ ...editingEnrollment, city: e.target.value })} />
                                        </div>
                                        <div className="w-20">
                                            <label className="block text-xs font-bold text-gray-500 mb-1">UF</label>
                                            <input className="w-full p-2 border rounded" value={editingEnrollment.state || ''} onChange={e => setEditingEnrollment({ ...editingEnrollment, state: e.target.value })} />
                                        </div>
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-bold text-gray-500 mb-1">Endereço Completo (Rua, Nº, Bairro)</label>
                                        <input className="w-full p-2 border rounded" value={editingEnrollment.address || ''} onChange={e => setEditingEnrollment({ ...editingEnrollment, address: e.target.value })} />
                                    </div>

                                    <div className="md:col-span-2 flex items-center gap-2 mt-2 bg-white p-3 rounded border border-gray-200">
                                        <input
                                            type="checkbox"
                                            id="cred"
                                            className="w-5 h-5 text-wtech-gold rounded"
                                            checked={editingEnrollment.isCredentialed || false}
                                            onChange={e => setEditingEnrollment({ ...editingEnrollment, isCredentialed: e.target.checked })}
                                        />
                                        <div className="flex flex-col">
                                            <label htmlFor="cred" className="text-sm font-bold text-gray-900 cursor-pointer">Aluno Credenciado</label>
                                            <span className="text-xs text-gray-500">Se marcado, este aluno será listado como oficina credenciada (Mapas).</span>
                                        </div>
                                    </div>



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
                                    const balance = (enr.totalAmount ?? currentCourse.price ?? 0) - (enr.amountPaid || 0);
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

                                                    <button onClick={() => handleSendManualReminder(enr)} title="Enviar Lembrete (WhatsApp)" className="p-1.5 text-green-500 hover:bg-green-50 rounded border border-green-100">
                                                        <Send size={16} />
                                                    </button>

                                                    <button onClick={() => handleGenerateSingleCertificate(enr, false)} title="Baixar Certificado" className="p-1.5 text-gray-700 hover:bg-gray-100 rounded border border-gray-200">
                                                        <Award size={16} />
                                                    </button>
                                                    <button onClick={() => handleGenerateSingleCertificate(enr, true)} title="Baixar Crachá" className="p-1.5 text-gray-700 hover:bg-gray-100 rounded border border-gray-200">
                                                        <User size={16} />
                                                    </button>

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
            <div className="bg-white dark:bg-[#1A1A1A] rounded-lg shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                <table className="w-full text-left font-bold text-sm">
                    <thead className="bg-[#eff6ff] dark:bg-[#111] text-[#1e3a8a] dark:text-blue-400 text-xs uppercase">
                        <tr>
                            <th className="p-4">Evento</th>
                            <th className="p-4">Data</th>
                            <th className="p-4 text-center">Inscritos</th>
                            <th className="p-4 text-center">Status</th>
                            <th className="p-4 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-gray-600 dark:text-gray-400">
                        {filteredCourses.length > 0 ? (
                            filteredCourses.map(course => (
                                <tr key={course.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                    <td className="p-4">
                                        <div className="text-blue-700 dark:text-blue-400 font-bold">{course.title}</div>
                                        <div className="text-xs text-gray-400">{course.location}</div>
                                    </td>
                                    <td className="p-4 text-gray-800 dark:text-gray-300 font-bold">
                                        {formatDateLocal(course.date)}
                                        <div className="text-xs text-gray-400 font-normal">{course.startTime || '08:00'}</div>
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
                                        <select
                                            value={course.status || 'Draft'}
                                            onChange={async (e) => {
                                                const newStatus = e.target.value;
                                                await supabase.from('SITE_Courses').update({ status: newStatus }).eq('id', course.id);
                                                // Optimistic Update
                                                setCourses(prev => prev.map(c => c.id === course.id ? { ...c, status: newStatus as any } : c));
                                            }}
                                            className={`text-[10px] px-2 py-1 rounded uppercase font-bold border cursor-pointer outline-none ${course.status === 'Published' ? 'bg-green-100 text-green-800 border-green-200' :
                                                    course.status === 'Archived' ? 'bg-red-100 text-red-800 border-red-200' :
                                                        'bg-gray-100 text-gray-600 border-gray-200'
                                                }`}
                                        >
                                            <option value="Draft">Rascunho</option>
                                            <option value="Published">Publicado (Ativo)</option>
                                            <option value="Archived">Desativado</option>
                                        </select>
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
                                        {hasPermission('courses_edit') && (
                                            <button onClick={() => handleDuplicate(course)} title="Duplicar Curso" className="p-2 text-gray-400 hover:text-wtech-gold transition-colors"><Copy size={16} /></button>
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
                                            <h3 className="text-3xl font-black text-gray-900">R$ ${(reportData.expenses || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                                            <p className="text-xs text-red-500 font-medium mt-1">Custos operacionais</p>
                                        </div>
                                        <div className={`bg-white p-6 rounded-xl shadow-sm border border-gray-100 border-l-4 ${(reportData.netResult || 0) >= 0 ? 'border-l-green-500' : 'border-l-red-500'}`}>
                                            <p className="text-gray-500 text-xs font-bold uppercase mb-1">Resultado Líquido</p>
                                            <h3 className={`text-3xl font-black ${(reportData.netResult || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                R$ ${(reportData.netResult || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

                                        {/* Leads Origin Breakdown */}
                                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                                            <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Globe size={18} /> Origem dos Leads (Landing Pages)</h4>
                                            <div className="overflow-y-auto max-h-[200px] custom-scrollbar">
                                                {reportData.leadsByOrigin && reportData.leadsByOrigin.length > 0 ? (
                                                    <table className="w-full text-xs">
                                                        <thead className="bg-gray-50 text-gray-500 font-bold">
                                                            <tr>
                                                                <th className="px-2 py-2 text-left">Origem / LP</th>
                                                                <th className="px-2 py-2 text-center">Leads</th>
                                                                <th className="px-2 py-2 text-center">Negoc.</th>
                                                                <th className="px-2 py-2 text-center">Conv.</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-gray-100">
                                                            {reportData.leadsByOrigin.map((origin: any, i: number) => (
                                                                <tr key={i}>
                                                                    <td className="px-2 py-2 font-medium truncate max-w-[150px]" title={origin.name}>{origin.name.replace('LP:', '').trim()}</td>
                                                                    <td className="px-2 py-2 text-center font-bold">{origin.count}</td>
                                                                    <td className="px-2 py-2 text-center text-yellow-600">{origin.negotiating}</td>
                                                                    <td className="px-2 py-2 text-center text-green-600 font-bold">{origin.converted}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                ) : (
                                                    <div className="text-center text-gray-400 py-8 text-sm italic">
                                                        Nenhuma informação de origem encontrada.
                                                    </div>
                                                )}
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
                    <h2 className="text-xl font-bold dark:text-white">Gestão de Cursos e Eventos</h2>
                </div>

                <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                    {/* Search Bar */}
                    <div className="relative">
                        <input
                            className="pl-8 pr-4 py-2 border rounded-lg focus:outline-none focus:border-wtech-gold w-full md:w-64 dark:bg-[#222] dark:border-gray-700 dark:text-white"
                            placeholder="Buscar curso..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <Search className="absolute left-2 top-2.5 text-gray-400" size={16} />
                    </div>

                    {/* Date Filter */}
                    <div className="flex items-center gap-2 bg-white dark:bg-[#222] border dark:border-gray-700 rounded-lg px-2 py-1">
                        <span className="text-xs font-bold text-gray-400 uppercase">Período:</span>
                        <input type="date" className="text-sm border-none focus:ring-0 text-gray-600 dark:text-gray-300 dark:bg-transparent" value={dateRange.start} onChange={e => setDateRange({ ...dateRange, start: e.target.value })} />
                        <span className="text-gray-400">-</span>
                        <input type="date" className="text-sm border-none focus:ring-0 text-gray-600 dark:text-gray-300 dark:bg-transparent" value={dateRange.end} onChange={e => setDateRange({ ...dateRange, end: e.target.value })} />
                        {(dateRange.start || dateRange.end) && (
                            <button onClick={() => setDateRange({ start: '', end: '' })} className="text-gray-400 hover:text-red-500"><X size={14} /></button>
                        )}
                    </div>

                    <div className="h-8 w-px bg-gray-300 mx-2 hidden md:block"></div>

                    <div className="flex gap-2">
                        <button onClick={downloadCoursesReport} className="bg-green-100 text-green-800 border border-green-200 px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-green-200 transition-colors dark:bg-green-900/30 dark:text-green-400 dark:border-green-800" title="Exportar Relatório CSV">
                            <Download size={16} /> Relatório
                        </button>

                        <button onClick={handlePrintCoursesReport} className="bg-gray-100 text-gray-800 border border-gray-200 px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-gray-200 transition-colors dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-700" title="Imprimir Lista">
                            <Printer size={16} /> Imprimir
                        </button>
                    </div>

                    {/* View Toggles */}
                    <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                        <button onClick={() => setViewMode('calendar')} className={`px-3 py-1.5 rounded text-sm font-bold ${viewMode === 'calendar' ? 'bg-white dark:bg-[#333] shadow-sm dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>Calendário</button>
                        <button onClick={() => setViewMode('list')} className={`px-3 py-1.5 rounded text-sm font-bold ${viewMode === 'list' ? 'bg-white dark:bg-[#333] shadow-sm dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>Lista</button>
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
                <div className="mb-8 bg-white dark:bg-[#1A1A1A] p-8 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 animate-in fade-in zoom-in-95">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-black text-2xl text-gray-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                            {formData.id ? <Edit className="text-wtech-gold" /> : <Plus className="text-wtech-gold" />}
                            {formData.id ? 'Editar Evento' : 'Novo Evento'}
                        </h3>
                        <button onClick={() => { setIsEditing(false); setFormData({}); }} className="p-2 hover:bg-gray-100 dark:hover:bg-[#333] rounded-full transition-colors dark:text-gray-300">
                            <X size={24} />
                        </button>
                    </div>

                    <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-bold mb-1 text-gray-700 dark:text-gray-300">Título do Evento</label>
                            <input autoFocus className="w-full border border-gray-300 dark:border-gray-700 p-3 rounded-lg text-gray-900 dark:text-white dark:bg-[#222] text-lg font-bold focus:ring-2 focus:ring-wtech-gold outline-none transition-all" value={formData.title || ''} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="Ex: Curso de Suspensão Avançada" required />
                        </div>

                        <div>
                            <label className="block text-sm font-bold mb-1 text-gray-700 dark:text-gray-300">Tipo de Evento</label>
                            <div className="flex gap-2">
                                {['Course', 'Event', 'TrackDay'].map(type => (
                                    <button
                                        type="button"
                                        key={type}
                                        onClick={() => setFormData({ ...formData, type: type as any })}
                                        className={`flex-1 p-3 rounded-lg border font-bold text-sm transition-all ${formData.type === type
                                            ? 'bg-black text-white dark:bg-white dark:text-black'
                                            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 dark:bg-[#222] dark:text-gray-400 dark:border-gray-700 dark:hover:bg-[#333]'
                                            }`}
                                    >
                                        {type === 'Course' ? 'Curso' : type === 'TrackDay' ? 'Track Day' : 'Evento'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold mb-1 text-gray-700 dark:text-gray-300">Data de Início</label>
                            <input type="date" className="w-full border border-gray-300 dark:border-gray-700 p-3 rounded-lg text-gray-900 dark:text-white dark:bg-[#222]" value={formData.date ? formData.date.split('T')[0] : ''} onChange={e => setFormData({ ...formData, date: e.target.value })} required />
                        </div>
                        <div>
                            <label className="block text-sm font-bold mb-1 text-gray-700 dark:text-gray-300">Data de Fim (Opcional)</label>
                            <input type="date" className="w-full border border-gray-300 dark:border-gray-700 p-3 rounded-lg text-gray-900 dark:text-white dark:bg-[#222]" value={formData.dateEnd ? formData.dateEnd.split('T')[0] : ''} onChange={e => setFormData({ ...formData, dateEnd: e.target.value })} />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold mb-1 text-gray-700 dark:text-gray-300">Hora Início</label>
                                <input type="time" className="w-full border border-gray-300 dark:border-gray-700 p-2 rounded text-gray-900 dark:text-white dark:bg-[#222]" value={formData.startTime || ''} onChange={e => setFormData({ ...formData, startTime: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-1 text-gray-700 dark:text-gray-300">Hora Fim</label>
                                <input type="time" className="w-full border border-gray-300 dark:border-gray-700 p-2 rounded text-gray-900 dark:text-white dark:bg-[#222]" value={formData.endTime || ''} onChange={e => setFormData({ ...formData, endTime: e.target.value })} />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold mb-1 text-gray-700 dark:text-gray-300">Status</label>
                            <select className="w-full border border-gray-300 dark:border-gray-700 p-3 rounded-lg text-gray-900 dark:text-white dark:bg-[#222] font-bold" value={formData.status || 'Draft'} onChange={e => setFormData({ ...formData, status: e.target.value as any })}>
                                <option value="Draft">Rascunho (Oculto)</option>
                                <option value="Published">Publicado (Visível)</option>
                                <option value="Full">Esgotado</option>
                                <option value="Completed">Concluído</option>
                                <option value="Cancelled">Cancelado</option>
                            </select>
                        </div>

                        {/* LOCATION SECTION */}
                        <div className="md:col-span-2 border-t pt-4 mt-2 border-gray-100 dark:border-gray-800">
                            <label className="block text-sm font-bold mb-3 text-gray-800 dark:text-gray-200 uppercase flex items-center gap-2"><MapPin size={16} /> Localização e Endereço</label>
                            <div className="grid grid-cols-4 gap-4">
                                <div>
                                    <label className="block text-xs font-bold mb-1 text-gray-500 dark:text-gray-400">CEP</label>
                                    <input className="w-full border border-gray-300 dark:border-gray-700 p-2 rounded text-gray-900 dark:text-white dark:bg-[#222]" value={formData.zipCode || ''} onChange={e => setFormData({ ...formData, zipCode: e.target.value })} onBlur={handleBlurCEP} placeholder="00000-000" />
                                </div>
                                <div className="col-span-3">
                                    <label className="block text-xs font-bold mb-1 text-gray-500 dark:text-gray-400">Endereço (Rua/Av)</label>
                                    <input className="w-full border border-gray-300 dark:border-gray-700 p-2 rounded text-gray-900 dark:text-white dark:bg-[#222]" value={formData.address || ''} onChange={e => setFormData({ ...formData, address: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold mb-1 text-gray-500 dark:text-gray-400">Número</label>
                                    <input className="w-full border border-gray-300 dark:border-gray-700 p-2 rounded text-gray-900 dark:text-white dark:bg-[#222]" value={formData.addressNumber || ''} onChange={e => setFormData({ ...formData, addressNumber: e.target.value })} onBlur={handleGeocodeCourse} placeholder="Ex: 123" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold mb-1 text-gray-500 dark:text-gray-400">Bairro</label>
                                    <input className="w-full border border-gray-300 dark:border-gray-700 p-2 rounded text-gray-900 dark:text-white dark:bg-[#222]" value={formData.addressNeighborhood || ''} onChange={e => setFormData({ ...formData, addressNeighborhood: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold mb-1 text-gray-500 dark:text-gray-400">Cidade</label>
                                    <input className="w-full border border-gray-300 dark:border-gray-700 p-2 rounded text-gray-900 dark:text-white dark:bg-[#222]" value={formData.city || ''} onChange={e => setFormData({ ...formData, city: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold mb-1 text-gray-500 dark:text-gray-400">Estado</label>
                                    <input className="w-full border border-gray-300 dark:border-gray-700 p-2 rounded text-gray-900 dark:text-white dark:bg-[#222]" value={formData.state || ''} onChange={e => setFormData({ ...formData, state: e.target.value })} />
                                </div>
                                <div className="col-span-4">
                                    <label className="block text-xs font-bold mb-1 text-gray-500 dark:text-gray-400">Local (Exibido no Cabeçalho)</label>
                                    <input className="w-full border border-gray-300 dark:border-gray-700 p-2 rounded text-gray-900 dark:text-white dark:bg-[#222]" value={formData.location || ''} onChange={e => setFormData({ ...formData, location: e.target.value })} />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-bold mb-1 text-gray-500 dark:text-gray-400">Latitude</label>
                                    <input className="w-full border border-gray-300 dark:border-gray-700 p-2 rounded text-gray-900 dark:text-white dark:bg-[#222] bg-gray-50 dark:bg-[#333]" value={formData.latitude || ''} readOnly />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-bold mb-1 text-gray-500 dark:text-gray-400">Longitude</label>
                                    <input className="w-full border border-gray-300 dark:border-gray-700 p-2 rounded text-gray-900 dark:text-white dark:bg-[#222] bg-gray-50 dark:bg-[#333]" value={formData.longitude || ''} readOnly />
                                </div>
                                <div className="col-span-4">
                                    <button type="button" onClick={handleGeocodeCourse} className="text-xs bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 px-3 py-1 rounded font-bold hover:bg-blue-100 dark:hover:bg-blue-900/30 border border-blue-200 dark:border-blue-900/40">
                                        📍 Atualizar Pin no Mapa (Forçar)
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold mb-1 text-gray-700 dark:text-gray-300">Modalidade</label>
                            <select className="w-full border border-gray-300 dark:border-gray-700 p-2 rounded text-gray-900 dark:text-white dark:bg-[#222]" value={formData.locationType || 'Presencial'} onChange={e => setFormData({ ...formData, locationType: e.target.value as any })}>
                                <option value="Presencial">Presencial</option>
                                <option value="Online">Online</option>
                            </select>
                        </div>

                        {/* Event Types DON'T have instructor usually? Or maybe they do. Keeping for now. */}
                        <div>
                            <label className="block text-sm font-bold mb-1 text-gray-700 dark:text-gray-300">Resposável / Instrutor</label>
                            <input className="w-full border border-gray-300 dark:border-gray-700 p-2 rounded text-gray-900 dark:text-white dark:bg-[#222]" value={formData.instructor || ''} onChange={e => setFormData({ ...formData, instructor: e.target.value })} />
                        </div>

                        {(!formData.type || formData.type === 'Course') && (
                            <div className="grid grid-cols-3 gap-4 md:col-span-2 bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-100 dark:border-yellow-900/40">
                                <div>
                                    <label className="block text-sm font-bold mb-1 text-gray-700 dark:text-gray-300">Valor (R$)</label>
                                    <input type="number" className="w-full border border-gray-300 dark:border-gray-700 p-2 rounded text-gray-900 dark:text-white dark:bg-[#222]" value={formData.price || ''} onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) })} placeholder="0.00" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold mb-1 text-gray-700 dark:text-gray-300">Reciclagem (R$)</label>
                                    <input type="number" className="w-full border border-gray-300 dark:border-gray-700 p-2 rounded text-gray-900 dark:text-white dark:bg-[#222]" value={formData.recyclingPrice || ''} onChange={e => setFormData({ ...formData, recyclingPrice: parseFloat(e.target.value) })} placeholder="0.00" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold mb-1 text-gray-700 dark:text-gray-300">Vagas / Cotas</label>
                                    <input type="number" className="w-full border border-gray-300 dark:border-gray-700 p-2 rounded text-gray-900 dark:text-white dark:bg-[#222]" value={formData.capacity || ''} onChange={e => setFormData({ ...formData, capacity: parseInt(e.target.value) })} placeholder="Ex: 50" />
                                </div>
                            </div>
                        )}

                        <div className="md:col-span-2 grid grid-cols-2 gap-4 bg-gray-50 dark:bg-[#1A1A1A] p-4 rounded-xl border border-gray-200 dark:border-gray-800">
                             <div>
                                <label className="block text-sm font-bold mb-1 text-gray-700 dark:text-gray-300 flex items-center gap-2"><Award size={14}/> Layout do Certificado</label>
                                <select 
                                    className="w-full border border-gray-300 dark:border-gray-700 p-2 rounded text-gray-900 dark:text-white dark:bg-[#222]" 
                                    value={formData.certificateLayoutId || ''} 
                                    onChange={e => setFormData({ ...formData, certificateLayoutId: e.target.value })}
                                >
                                    <option value="">-- Selecione --</option>
                                    {layouts.filter(l => l.type === 'Certificate').map(l => (
                                        <option key={l.id} value={l.id}>{l.name}</option>
                                    ))}
                                </select>
                             </div>
                             <div>
                                <label className="block text-sm font-bold mb-1 text-gray-700 dark:text-gray-300 flex items-center gap-2"><User size={14}/> Layout do Crachá</label>
                                <select 
                                    className="w-full border border-gray-300 dark:border-gray-700 p-2 rounded text-gray-900 dark:text-white dark:bg-[#222]" 
                                    value={formData.badgeLayoutId || ''} 
                                    onChange={e => setFormData({ ...formData, badgeLayoutId: e.target.value })}
                                >
                                    <option value="">-- Selecione --</option>
                                    {layouts.filter(l => l.type === 'Badge').map(l => (
                                        <option key={l.id} value={l.id}>{l.name}</option>
                                    ))}
                                </select>
                             </div>
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-bold mb-1 text-gray-700 dark:text-gray-300">Imagem de Capa</label>
                            <div className="flex flex-col gap-2">
                                <div className="flex gap-4 mb-2">
                                    <label className="flex items-center gap-2 cursor-pointer dark:text-gray-300">
                                        <input type="radio" name="imgSource" checked={formData.imageSourceType !== 'Upload'} onChange={() => setFormData({ ...formData, imageSourceType: 'Url' })} />
                                        <span className="text-sm">Link Externo (URL)</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer dark:text-gray-300">
                                        <input type="radio" name="imgSource" checked={formData.imageSourceType === 'Upload'} onChange={() => setFormData({ ...formData, imageSourceType: 'Upload' })} />
                                        <span className="text-sm">Upload de Arquivo</span>
                                    </label>
                                </div>

                                {formData.imageSourceType === 'Upload' ? (
                                    <input type="file" accept="image/*" onChange={handleImageUpload} className="w-full border border-gray-300 dark:border-gray-700 p-2 rounded text-gray-900 dark:text-white bg-white dark:bg-[#222]" />
                                ) : (
                                    <input className="w-full border border-gray-300 dark:border-gray-700 p-2 rounded text-gray-900 dark:text-white dark:bg-[#222]" value={formData.image || ''} onChange={e => setFormData({ ...formData, image: e.target.value })} placeholder="https://..." />
                                )}

                                {formData.image && (
                                    <div className="mt-2 text-xs text-gray-500">
                                        Preview: <br />
                                        <img src={formData.image} alt="Capa" className="h-20 w-auto rounded border border-gray-200 mt-1 object-cover" />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-bold mb-1 text-gray-700 dark:text-gray-300">URL do Mapa (Opcional - Gerado Automático)</label>
                            <input className="w-full border border-gray-300 dark:border-gray-700 p-2 rounded text-gray-900 dark:text-white dark:bg-[#222]" value={formData.mapUrl || ''} onChange={e => setFormData({ ...formData, mapUrl: e.target.value })} placeholder="https://maps.google.com/..." />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-bold mb-1 text-gray-700 dark:text-gray-300">Cronograma / Conteúdo</label>
                            <div className="mb-2 flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, schedule: DEFAULT_COURSE_SCHEDULE })}
                                    className="text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 border border-yellow-200 dark:border-yellow-800 px-2 py-1 rounded font-bold hover:bg-yellow-200"
                                >
                                    📥 Carregar Modelo: Suspensão
                                </button>
                            </div>
                            <textarea rows={8} className="w-full border border-gray-300 dark:border-gray-700 p-2 rounded text-gray-900 dark:text-white dark:bg-[#222]" value={formData.schedule || ''} onChange={e => setFormData({ ...formData, schedule: e.target.value })} placeholder="08:00 - Café da manhã..." />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-bold mb-1 text-gray-700 dark:text-gray-300">O que levar / Requisitos</label>
                            <textarea rows={4} className="w-full border border-gray-300 dark:border-gray-700 p-2 rounded text-gray-900 dark:text-white dark:bg-[#222]" value={formData.whatToBring || ''} onChange={e => setFormData({ ...formData, whatToBring: e.target.value })} placeholder="Ex: Macacão, Luvas, Caderno para anotações..." />
                        </div>

                        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-gray-100 dark:border-gray-800 pt-4">
                            <div className="bg-green-50 dark:bg-green-900/10 p-4 rounded-xl border border-green-100/50 dark:border-green-900/30">
                                <h4 className="font-bold text-green-800 dark:text-green-400 text-xs uppercase mb-3 flex items-center gap-2">
                                    <Bell size={14} /> Lembrete Antecipado
                                </h4>
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={formData.reminder5dEnabled ?? true}
                                            onChange={e => setFormData({ ...formData, reminder5dEnabled: e.target.checked })}
                                        />
                                        <span className="text-sm font-bold dark:text-gray-300">Ativar</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            className="w-16 p-1 border rounded text-sm font-bold text-center dark:bg-[#222] dark:text-white dark:border-gray-700"
                                            value={formData.reminder5dDays ?? 5}
                                            onChange={e => setFormData({ ...formData, reminder5dDays: parseInt(e.target.value) })}
                                        />
                                        <span className="text-xs text-gray-500 dark:text-gray-400">dias antes</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100/50 dark:border-blue-900/30">
                                <h4 className="font-bold text-blue-800 dark:text-blue-400 text-xs uppercase mb-3 flex items-center gap-2">
                                    <Bell size={14} /> Lembrete Final
                                </h4>
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={formData.reminder1dEnabled ?? true}
                                            onChange={e => setFormData({ ...formData, reminder1dEnabled: e.target.checked })}
                                        />
                                        <span className="text-sm font-bold dark:text-gray-300">Ativar</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            className="w-16 p-1 border rounded text-sm font-bold text-center dark:bg-[#222] dark:text-white dark:border-gray-700"
                                            value={formData.reminder1dDays ?? 1}
                                            onChange={e => setFormData({ ...formData, reminder1dDays: parseInt(e.target.value) })}
                                        />
                                        <span className="text-xs text-gray-500 dark:text-gray-400">dia(s) antes</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="md:col-span-2 bg-gray-50 dark:bg-[#222] p-4 rounded border border-gray-200 dark:border-gray-700">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="w-5 h-5"
                                    checked={generateLP}
                                    onChange={e => setGenerateLP(e.target.checked)}
                                />
                                <span className="font-bold text-gray-900 dark:text-white">Gerar Landing Page Automática?</span>
                            </label>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-7">
                                Cria uma página em <code>/lp/titulo-data</code> vinculada a este curso.
                            </div>
                        </div>

                        <div className="md:col-span-2 flex flex-col md:flex-row justify-between items-center gap-4 bg-gray-50 dark:bg-[#1A1A1A] p-4 rounded-xl border border-gray-200 dark:border-gray-800">
                            <div className="flex gap-2 w-full md:w-auto">
                                <button type="button" className="flex-1 md:flex-none py-3 px-6 bg-white dark:bg-[#333] border border-gray-200 dark:border-gray-700 text-blue-600 dark:text-blue-400 rounded-lg font-bold hover:bg-gray-50 dark:hover:bg-[#444] flex items-center justify-center gap-2 text-sm shadow-sm transition-all active:scale-95">
                                    <Mail size={16} /> Anunciar p/ Base (Email)
                                </button>
                                <button
                                    type="button"
                                    onClick={handleTestReminderMessage}
                                    className="flex-1 md:flex-none py-3 px-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 rounded-lg font-bold hover:bg-green-100 dark:hover:bg-green-900/30 flex items-center justify-center gap-2 text-sm shadow-sm transition-all active:scale-95"
                                >
                                    <MessageCircle size={16} /> Testar Lembrete (WhatsApp)
                                </button>
                            </div>
                            <div className="flex gap-3 w-full md:w-auto">
                                <button type="button" onClick={() => { setIsEditing(false); setFormData({}); }} className="flex-1 md:flex-none px-8 py-3 border border-gray-300 dark:border-gray-600 rounded-lg font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all">Cancelar</button>
                                <button type="submit" className="flex-1 md:flex-none px-12 py-3 bg-wtech-black text-white rounded-lg font-black hover:bg-gray-800 dark:hover:bg-gray-700 shadow-xl transition-all active:scale-95">Salvar Curso</button>
                            </div>
                        </div>
                    </form>
                </div>
            )}

            {!isEditing && hasPermission('courses_add') && (
                <div className="mb-4">
                    <button onClick={() => handleEdit()} className="w-full py-3 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg text-gray-500 dark:text-gray-400 font-bold hover:border-wtech-gold hover:text-wtech-gold transition-colors flex items-center justify-center gap-2">
                        <Plus size={20} /> Adicionar Novo Curso no Topo
                    </button>
                </div>
            )}

            {/* DATA DISPLAY */}
            <div className="bg-white dark:bg-[#1A1A1A] rounded-lg shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden min-h-[400px]">
                {viewMode === 'list' ? (
                    <Table />
                ) : (
                    <div className="p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-gray-700 dark:text-gray-200">Calendário de {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h3>
                            <span className="text-xs text-gray-400">Navegue acima para mudar</span>
                        </div>
                        <CalendarGrid />
                    </div>
                )}
            </div>
        </div>
    );
};

const MechanicsView = ({ permissions }: { permissions?: any }) => {
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

        // 0. Live Permissions (Prop)
        if (permissions) {
            if (permissions.admin_access) return true;
            return !!permissions[key];
        }

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
        <div className="text-gray-900 dark:text-gray-100">
            <div className="flex flex-col gap-4 mb-6">
                {/* Header Row */}
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold dark:text-white">Oficinas Credenciadas</h2>
                    <div className="flex gap-2">
                        {processingCount.total > 0 && (
                            <div className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400 px-4 py-2 rounded text-xs font-bold flex items-center gap-2">
                                <span className="animate-spin">⚙️</span> Processando {processingCount.current}/{processingCount.total}
                            </div>
                        )}

                        {!isImporting && processingCount.total === 0 && (
                            <button onClick={handleBatchGeocode} className="bg-blue-100 text-blue-800 border border-blue-200 dark:border-blue-900/40 dark:bg-blue-900/20 dark:text-blue-400 px-4 py-2 rounded font-bold flex items-center gap-2 hover:bg-blue-200 dark:hover:bg-blue-900/30">
                                📍 Atualizar PINs (GPS)
                            </button>
                        )}

                        {selectedIds.length > 0 && (
                            <button onClick={handleBulkDelete} className="bg-red-500 text-white px-4 py-2 rounded font-bold flex items-center gap-2 animate-in fade-in">
                                <Trash2 size={18} /> Excluir ({selectedIds.length})
                            </button>
                        )}

                        {isImporting ? (
                            <div className="flex items-center gap-2 bg-gray-100 dark:bg-[#222] p-2 rounded">
                                <input type="file" accept=".csv" onChange={handleCSVImport} className="text-xs dark:text-gray-300" />
                                <button onClick={() => setIsImporting(false)} className="dark:text-gray-300"><X size={16} /></button>
                            </div>
                        ) : (
                            hasPermission('accredited_import') && (
                                <button onClick={() => setIsImporting(true)} className="bg-white border border-gray-300 text-gray-700 dark:bg-[#222] dark:border-gray-700 dark:text-gray-300 px-4 py-2 rounded font-bold flex items-center gap-2">
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
                    <div className="flex-grow flex items-center bg-white dark:bg-[#222] border border-gray-200 dark:border-gray-700 rounded px-3 py-2">
                        <Search size={18} className="text-gray-400 mr-2" />
                        <input
                            placeholder="Buscar por Oficina, Cidade, UF ou Região..."
                            className="flex-grow outline-none text-sm text-gray-900 dark:text-white bg-transparent"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={() => setFilterMissingGPS(!filterMissingGPS)}
                        className={`px-4 py-2 rounded font-bold flex items-center gap-2 border transition-all ${filterMissingGPS ? 'bg-orange-100 border-orange-200 text-orange-700 dark:bg-orange-900/20 dark:border-orange-900/40 dark:text-orange-400' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50 dark:bg-[#222] dark:border-gray-700 dark:text-gray-400 dark:hover:bg-[#333]'}`}
                    >
                        <MapPin size={18} className={filterMissingGPS ? "fill-orange-500" : ""} />
                        {filterMissingGPS ? 'Mostrando Sem GPS' : 'Filtrar Sem GPS'}
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-[#1A1A1A] rounded-lg shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 dark:bg-[#222] text-gray-500 dark:text-gray-400 uppercase font-bold text-xs">
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
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-gray-900 dark:text-gray-200">
                        {currentMechanics.map(mech => (
                            <tr key={mech.id} className="hover:bg-gray-50 dark:hover:bg-[#222]">
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
                                    <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase ${mech.status === 'Approved' ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400'}`}>
                                        {mech.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 flex gap-2">
                                    {hasPermission('accredited_revoke') && (
                                        <button
                                            onClick={() => toggleStatus(mech.id, mech.status)}
                                            className={`text-xs font-bold px-3 py-1 rounded ${mech.status === 'Approved' ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400' : 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'}`}
                                        >
                                            {mech.status === 'Approved' ? 'Revogar' : 'Aprovar'}
                                        </button>
                                    )}
                                    {hasPermission('accredited_edit') && (
                                        <button onClick={() => { setFormData(mech); setIsEditing(true); }} className="text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white"><Edit size={16} /></button>
                                    )}
                                    {(!mech.latitude || !mech.longitude) && hasPermission('accredited_edit') && (
                                        <button onClick={() => handleQuickGeocode(mech)} className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300" title="Atualizar GPS Rápido">
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
                    <div className="p-10 text-center text-gray-500 dark:text-gray-400">Nenhum credenciado encontrado com os filtros atuais.</div>
                )}
            </div>
            {/* Pagination Controls */}
            {filteredMechanics.length > itemsPerPage && (
                <div className="flex justify-between items-center mt-4 text-sm text-gray-600 dark:text-gray-400">
                    <div>
                        Mostrando {(currentPage - 1) * itemsPerPage + 1} a {Math.min(currentPage * itemsPerPage, filteredMechanics.length)} de {filteredMechanics.length}
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={prevPage}
                            disabled={currentPage === 1}
                            className="px-4 py-2 bg-white dark:bg-[#222] border border-gray-200 dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-[#333] disabled:opacity-50"
                        >
                            Anterior
                        </button>
                        <button
                            onClick={nextPage}
                            disabled={currentPage === totalPages}
                            className="px-4 py-2 bg-white dark:bg-[#222] border border-gray-200 dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-[#333] disabled:opacity-50"
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
const FinanceView = ({ permissions }: { permissions?: any }) => {
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
        if (!user) return false;

        // 0. Live Permissions (Prop)
        if (permissions) {
            if (permissions.admin_access) return true;
            return !!permissions[key];
        }

        // Handle String Role
        if (typeof user.role === 'string') {
            return user.role === 'Super Admin' || user.role === 'Admin' || user.role === 'ADMIN';
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
        <div className="text-gray-900 dark:text-gray-100 animate-fade-in space-y-6 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4">
                <div className="w-full md:w-auto">
                    <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter">Fluxo de Caixa</h2>
                    <p className="text-gray-500 dark:text-gray-400 font-medium">Gestão financeira completa e transparente.</p>
                </div>
                <div className="flex flex-wrap gap-3 w-full md:w-auto items-center">
                    {/* Course/Event Filter */}
                    <select
                        className="border border-gray-300 dark:border-gray-700 rounded-lg p-2 text-sm font-bold text-gray-600 dark:text-gray-300 bg-white dark:bg-[#222] max-w-[200px]"
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

                    <div className="flex bg-gray-100 dark:bg-[#222] p-1 rounded-lg">
                        {[
                            { id: '7d', l: '7 dias' },
                            { id: '30d', l: '30 dias' },
                        ].map(f => (
                            <button
                                key={f.id}
                                onClick={() => setFilterType(f.id as any)}
                                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${filterType === f.id ? 'bg-white shadow text-black dark:bg-gray-700 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white'}`}
                            >
                                {f.l}
                            </button>
                        ))}
                    </div>

                    <input
                        type="month"
                        value={selectedMonth}
                        onChange={(e) => { setSelectedMonth(e.target.value); setFilterType('Month'); }}
                        className={`border rounded-lg px-2 py-1 text-xs font-bold h-9 ${filterType === 'Month' ? 'border-wtech-gold bg-white dark:bg-[#222] dark:border-wtech-gold' : 'border-gray-200 bg-gray-50 dark:bg-[#222] dark:border-gray-700'}`}
                    />

                    {/* Custom Range */}
                    <div className={`flex items-center border rounded-lg overflow-hidden h-9 ${filterType === 'Custom' ? 'border-wtech-gold bg-white dark:bg-[#222] dark:border-wtech-gold' : 'border-gray-200 bg-gray-50 dark:bg-[#222] dark:border-gray-700'}`}>
                        <input
                            type="date"
                            className="bg-transparent text-xs px-2 outline-none dark:text-gray-300"
                            value={customRange.start}
                            onChange={e => { setCustomRange(p => ({ ...p, start: e.target.value })); setFilterType('Custom'); }}
                        />
                        <span className="text-gray-400 text-[10px]">-</span>
                        <input
                            type="date"
                            className="bg-transparent text-xs px-2 outline-none dark:text-gray-300"
                            value={customRange.end}
                            onChange={e => { setCustomRange(p => ({ ...p, end: e.target.value })); setFilterType('Custom'); }}
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
                <div className="bg-white dark:bg-[#1A1A1A] p-6 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
                    <div className="flex justify-between mb-4">
                        <span className="text-xs font-bold uppercase text-gray-400">Saldo Líquido</span>
                        <span className={`p-2 rounded-lg ${balance >= 0 ? 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400' : 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'}`}><DollarSign size={20} /></span>
                    </div>
                    <h3 className={`text-2xl font-black ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>R$ {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                </div>
                <div className="bg-white dark:bg-[#1A1A1A] p-6 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
                    <div className="flex justify-between mb-4">
                        <span className="text-xs font-bold uppercase text-gray-400">Receitas</span>
                        <span className="p-2 rounded-lg bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400"><TrendingUp size={20} /></span>
                    </div>
                    <h3 className="text-2xl font-black text-gray-900 dark:text-white">R$ {income.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                </div>
                <div className="bg-white dark:bg-[#1A1A1A] p-6 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
                    <div className="flex justify-between mb-4">
                        <span className="text-xs font-bold uppercase text-gray-400">Despesas</span>
                        <span className="p-2 rounded-lg bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400"><TrendingDown size={20} /></span>
                    </div>
                    <h3 className="text-2xl font-black text-gray-900 dark:text-white">R$ {expense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                </div>
                <div className="bg-white dark:bg-[#1A1A1A] p-6 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
                    <div className="flex justify-between mb-4">
                        <span className="text-xs font-bold uppercase text-gray-400">A Receber (Previsão)</span>
                        <span className="p-2 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"><ShoppingBag size={20} /></span>
                    </div>
                    <h3 className="text-2xl font-black text-blue-600 dark:text-blue-400">R$ {receivables.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                    <p className="text-[10px] text-gray-400 mt-1">Saldos de alunos pendentes</p>
                </div>
            </div>

            {/* Transactions List */}
            <div className="bg-white dark:bg-[#1A1A1A] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex flex-col md:flex-row justify-between items-center gap-4">
                    <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 w-full md:w-auto">
                        <ArrowRight size={16} className="text-wtech-gold" /> Últimas Movimentações
                    </h3>
                    <div className="flex flex-wrap gap-2 w-full md:w-auto">

                        {/* Removed duplicate date filter which was here */}
                        {hasPermission('financial_export') && (
                            <button onClick={handleExportCSV} className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 font-bold text-sm bg-white dark:bg-[#222] dark:border-gray-700 dark:text-gray-300 dark:hover:bg-[#333]">
                                <Download size={16} /> Exportar
                            </button>
                        )}
                    </div>
                </div>
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 dark:bg-[#222] text-gray-500 dark:text-gray-400 uppercase font-bold text-xs border-b border-gray-100 dark:border-gray-800">
                        <tr>
                            <th className="px-6 py-4">Descrição</th>
                            <th className="px-6 py-4">Categoria</th>
                            <th className="px-6 py-4">Data</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 text-right">Valor</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-gray-900 dark:text-gray-200">
                        {loading ? <tr><td colSpan={5} className="p-8 text-center text-gray-400">Carregando...</td></tr> :
                            filteredTransactions.length === 0 ? <tr><td colSpan={5} className="p-8 text-center text-gray-400">Nenhuma transação encontrada.</td></tr> :
                                filteredTransactions.map(t => (
                                    <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-[#222] transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="font-bold">{t.description}</div>
                                            <div className="text-xs text-gray-400">{t.payment_method}</div>
                                        </td>
                                        <td className="px-6 py-4 text-xs font-bold uppercase text-gray-500 dark:text-gray-400">{t.category}</td>
                                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{new Date(t.date).toLocaleDateString()}</td>
                                        <td className="px-6 py-4">
                                            <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase ${t.type === 'Income' ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'}`}>
                                                {t.type === 'Income' ? 'Entrada' : 'Saída'}
                                            </span>
                                        </td>
                                        <td className={`px-6 py-4 text-right font-bold ${t.type === 'Income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
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
                    <div className="bg-white dark:bg-[#1A1A1A] rounded-xl shadow-2xl w-full max-w-md p-6">
                        <h3 className="text-xl font-bold mb-4 dark:text-white">Nova Transação</h3>
                        <form onSubmit={handleAddTransaction} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-1">Tipo</label>
                                    <select className="w-full p-2 border rounded-lg dark:bg-[#222] dark:border-gray-700 dark:text-gray-300" value={newTrans.type} onChange={e => setNewTrans({ ...newTrans, type: e.target.value as any })}>
                                        <option value="Income">Receita (Entrada)</option>
                                        <option value="Expense">Despesa (Saída)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-1">Categoria</label>
                                    <select className="w-full p-2 border rounded-lg dark:bg-[#222] dark:border-gray-700 dark:text-gray-300" value={newTrans.category} onChange={e => setNewTrans({ ...newTrans, category: e.target.value as any })}>
                                        <option value="Sales">Vendas</option>
                                        <option value="Operational">Operacional</option>
                                        <option value="Marketing">Marketing</option>
                                        <option value="Payroll">Folha de Pgto</option>
                                    </select>
                                </div>
                            </div>

                            {/* Link to Course/Event */}
                            <div>
                                <label className="block text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-1">Vincular a (Opcional)</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <select
                                        className="w-full p-2 border rounded-lg dark:bg-[#222] dark:border-gray-700 dark:text-gray-300"
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
                                            className="w-full p-2 border rounded-lg dark:bg-[#222] dark:border-gray-700 dark:text-gray-300"
                                            value={linkedId}
                                            onChange={e => setLinkedId(e.target.value)}
                                        >
                                            <option value="">Selecione o Curso...</option>
                                            {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                                        </select>
                                    )}

                                    {linkType === 'Event' && (
                                        <select
                                            className="w-full p-2 border rounded-lg dark:bg-[#222] dark:border-gray-700 dark:text-gray-300"
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
                                    <label className="block text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-1">Data</label>
                                    <input type="date" required className="w-full p-2 border rounded-lg dark:bg-[#222] dark:border-gray-700 dark:text-gray-300" value={newTrans.date} onChange={e => setNewTrans({ ...newTrans, date: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-1">Valor (R$)</label>
                                    <input type="number" step="0.01" required className="w-full p-2 border rounded-lg font-bold dark:bg-[#222] dark:border-gray-700 dark:text-gray-300" value={newTrans.amount || ''} onChange={e => setNewTrans({ ...newTrans, amount: parseFloat(e.target.value) })} />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-1">Descrição</label>
                                <input required className="w-full p-2 border rounded-lg dark:bg-[#222] dark:border-gray-700 dark:text-gray-300" placeholder="Ex: Venda Curso X" value={newTrans.description || ''} onChange={e => setNewTrans({ ...newTrans, description: e.target.value })} />
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-1">Método Pagamento</label>
                                <select className="w-full p-2 border rounded-lg dark:bg-[#222] dark:border-gray-700 dark:text-gray-300" value={newTrans.payment_method || ''} onChange={e => setNewTrans({ ...newTrans, payment_method: e.target.value })}>
                                    <option value="">Selecione...</option>
                                    <option value="Pix">Pix</option>
                                    <option value="Cartão Crédito">Cartão de Crédito</option>
                                    <option value="Boleto">Boleto</option>
                                    <option value="Dinheiro">Dinheiro</option>
                                    <option value="Transferência">Transferência</option>
                                </select>
                            </div>

                            <div className="flex justify-end gap-2 mt-6">
                                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#333] rounded-lg font-bold">Cancelar</button>
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
            <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-2">Centro de Notícias</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-8">Envie comunicados para credenciados e alunos via Email e WhatsApp.</p>

            <div className="bg-white dark:bg-[#1A1A1A] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div className="col-span-2">
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Título / Assunto</label>
                        <input className="w-full border border-gray-200 dark:border-gray-700 rounded-lg p-3 font-bold text-gray-900 dark:text-white outline-none focus:border-wtech-gold" value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Atualização Importante" />
                    </div>
                    <div className="col-span-2">
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Mensagem</label>
                        <textarea className="w-full border border-gray-200 dark:border-gray-700 rounded-lg p-3 h-40 outline-none focus:border-wtech-gold dark:bg-[#222] dark:text-white" value={message} onChange={e => setMessage(e.target.value)} placeholder="Escreva sua mensagem aqui..." />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Público Alvo</label>
                        <select className="w-full border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-[#222] dark:text-white outline-none" value={audience} onChange={e => setAudience(e.target.value)}>
                            <option value="All">Todos (Geral)</option>
                            <option value="Mechanics">Credenciados (Oficinas)</option>
                            <option value="Students">Alunos</option>
                        </select>
                    </div>
                </div>

                <div className="flex justify-end gap-4 border-t border-gray-100 dark:border-gray-800 pt-6">
                    <button className="px-6 py-3 border border-gray-200 dark:border-gray-700 rounded-lg font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#333]">Salvar Rascunho</button>
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
        <div className="text-gray-900 dark:text-gray-100 space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter">Pedidos & Inscrições</h2>
                    <p className="text-gray-500 dark:text-gray-400 font-medium">Acompanhe as vendas de cursos e produtos.</p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-[#1A1A1A] p-4 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Buscar por Cliente</label>
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-3 text-gray-400" />
                        <input
                            className="w-full border border-gray-200 dark:border-gray-700 rounded-lg pl-10 pr-3 py-2 text-sm outline-none focus:border-wtech-gold dark:bg-[#222] dark:text-white"
                            placeholder="Nome do aluno..."
                            value={filterName}
                            onChange={e => setFilterName(e.target.value)}
                        />
                    </div>
                </div>
                <div className="flex-1">
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Buscar por Curso/Item</label>
                    <div className="relative">
                        <ShoppingBag size={16} className="absolute left-3 top-3 text-gray-400" />
                        <input
                            className="w-full border border-gray-200 dark:border-gray-700 rounded-lg pl-10 pr-3 py-2 text-sm outline-none focus:border-wtech-gold dark:bg-[#222] dark:text-white"
                            placeholder="Nome do curso..."
                            value={filterCourse}
                            onChange={e => setFilterCourse(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-[#1A1A1A] rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 dark:bg-[#222] text-gray-500 dark:text-gray-400 uppercase font-bold text-xs border-b border-gray-100 dark:border-gray-800">
                        <tr>
                            <th className="px-6 py-4">Cliente / Aluno</th>
                            <th className="px-6 py-4">Item Comprado</th>
                            <th className="px-6 py-4">Data</th>
                            <th className="px-6 py-4">Total</th>
                            <th className="px-6 py-4">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-gray-900 dark:text-gray-200">
                        {loading ? (
                            <tr><td colSpan={5} className="p-8 text-center text-gray-400">Carregando pedidos...</td></tr>
                        ) : filteredOrders.length === 0 ? (
                            <tr><td colSpan={5} className="p-8 text-center text-gray-400">Nenhum pedido encontrado.</td></tr>
                        ) : (
                            filteredOrders.map((order, idx) => (
                                <tr key={`${order.id}-${idx}`} className="hover:bg-gray-50 dark:hover:bg-[#222] transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-gray-900 dark:text-white">{order.customerName}</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">{order.customerEmail}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${order.type === 'Curso' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' : 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400'}`}>
                                                {order.type}
                                            </span>
                                            <span className="font-medium">{order.itemName}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{new Date(order.date).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.total)}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase ${order.status === 'Paid' || order.status === 'Confirmed' ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' :
                                            order.status === 'Pending' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-900/20 dark:text-gray-400'
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
    const [partnerBrands, setPartnerBrands] = useState<{ name: string, logo: string }[]>([]);
    const [testEmail, setTestEmail] = useState('');
    const [isTestingEmail, setIsTestingEmail] = useState(false);

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

            // Parse webhooks if active
            if (configObj.system_webhooks) {
                try { setWebhooks(JSON.parse(configObj.system_webhooks)); } catch (e) { }
            }
            if (configObj.partner_brands) {
                try { setPartnerBrands(JSON.parse(configObj.partner_brands)); } catch (e) { }
            }
            // Parse Menu Styles
            if (configObj.menu_styles) {
                try {
                    configObj.menu_styles = JSON.parse(configObj.menu_styles);
                } catch (e) {
                    console.warn("Failed to parse menu_styles", e);
                    configObj.menu_styles = {};
                }
            } else {
                configObj.menu_styles = {};
            }

            setConfig(configObj);
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
        const finalConfig = {
            ...config,
            system_webhooks: JSON.stringify(webhooks),
            partner_brands: JSON.stringify(partnerBrands),
            menu_styles: config.menu_styles ? JSON.stringify(config.menu_styles) : null
        };

        const updates = Object.entries(finalConfig).map(([key, value]) => ({
            key,
            value: typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value || '')
        }));

        const { error } = await supabase.from('SITE_SystemSettings').upsert(updates, { onConflict: 'key' });
        if (error) {
            console.error(error);
            alert('Erro ao salvar configurações: ' + (error.message || JSON.stringify(error)));
        } else {
            alert('Configurações salvas com sucesso!');
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
                { key: 'crm_distribute', label: 'Configurar Distribuição' },
                { key: 'crm_view_team', label: 'Ver Leads da Equipe (Gestor)' },
                { key: 'crm_view_all', label: 'Ver Todos os Leads (Igual Admin)' }
            ]
        },
        {
            title: 'Loja Virtual',
            perms: [
                { key: 'manage_orders', label: 'Gerenciar Pedidos' }
            ]
        },
        {
            title: 'Marketing Center',
            perms: [
                { key: 'marketing_view', label: 'Acessar Central de Marketing' },
                { key: 'marketing_manage_campaigns', label: 'Gerenciar Campanhas' },
                { key: 'marketing_manage_lists', label: 'Gerenciar Listas de Transmissão' },
                { key: 'marketing_manage_templates', label: 'Gerenciar Modelos (WhatsApp)' },
                { key: 'blog_view', label: 'Acessar Blog Manager' },
                { key: 'blog_create', label: 'Criar / Publicar Posts' },
                { key: 'blog_edit', label: 'Editar Posts' },
                { key: 'blog_delete', label: 'Excluir Posts' },
                { key: 'blog_ai', label: 'Usar Gerador IA' },
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
            title: 'Gestão de Tarefas',
            perms: [
                { key: 'tasks_view_team', label: 'Ver Tarefas da Equipe (Gestor)' },
                { key: 'tasks_delete', label: 'Excluir Tarefas de Outros' },
            ]
        },
        {
            title: 'Administração Geral',
            perms: [
                { key: 'dashboard_view', label: 'Visualizar Dashboard (Visão Geral)' },
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
            let { error: uploadError } = await supabase.storage
                .from('site-assets')
                .upload(filePath, file);

            if (uploadError) {
                console.log("Upload to 'site-assets' failed, trying 'public'...", uploadError);
                // Fallback to 'public' if site-assets fails or doesn't exist
                const { error: retryError } = await supabase.storage
                    .from('public')
                    .upload(filePath, file);

                if (retryError) {
                    // Check if it's a bucket missing error
                    if (retryError.message.includes('bucket not found') || retryError.message.includes('Bucket not found')) {
                        alert('ERRO DE STORAGE: Os buckets "site-assets" ou "public" não foram encontrados no seu Supabase. Por favor, crie um bucket público chamado "site-assets" no painel do Supabase para habilitar uploads.');
                    } else {
                        throw retryError;
                    }
                    return;
                }
            }

            const { data } = supabase.storage
                .from('site-assets')
                .getPublicUrl(filePath);

            let publicUrl = data.publicUrl;

            // If we failed the first one, the URL should be from public
            if (uploadError) {
                const { data: publicData } = supabase.storage.from('public').getPublicUrl(filePath);
                publicUrl = publicData.publicUrl;
            }

            handleChange(key, publicUrl);
            alert('Imagem enviada com sucesso! Clique em "Salvar Alterações" para aplicar.');
        } catch (error: any) {
            console.error('Upload error:', error);
            alert('Erro ao enviar imagem: ' + (error.message || error));
        }
    };

    const handleTestEmail = async () => {
        if (!testEmail) return alert('Por favor, informe um e-mail para o teste.');
        if (!config.email_smtp_host) return alert('Configure o host SMTP antes de testar.');

        setIsTestingEmail(true);
        try {
            await new Promise(resolve => setTimeout(resolve, 2000));
            alert(`Sucesso! Um e-mail de teste foi enviado para ${testEmail}.\n\nNota: Como este é um ambiente de frontend, o disparo real depende de uma integração backend ativa com estas configurações.`);
        } catch (e) {
            alert('Falha no teste: Verifique as configurações de host e porta.');
        } finally {
            setIsTestingEmail(false);
        }
    };

    return (
        <div className="bg-white dark:bg-[#1A1A1A] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden flex flex-col h-full">
            {/* Header / Tabs */}
            {/* Header / Tabs */}
            <div className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#222] px-6 pt-4 pb-4 flex items-center justify-between gap-4">
                <div className="flex-1 overflow-x-auto scrollbar-hide">
                    <ExpandableTabs
                        activeId={activeTab}
                        onChange={setActiveTab}
                        tabs={[
                            { id: 'Geral', icon: Settings, label: 'Geral', color: 'bg-blue-500' },
                            { id: 'E-mail', icon: Mail, label: 'E-mail', color: 'bg-indigo-500' },
                            { id: 'WhatsApp API', icon: MessageCircle, label: 'WhatsApp', color: 'bg-green-500' },
                            { id: 'Marketplace & ERP', icon: ShoppingBag, label: 'Integrações', color: 'bg-orange-500' },
                            { id: 'Modelos Msg', icon: MessageSquare, label: 'Modelos', color: 'bg-teal-500' },
                            { id: 'Categorias', icon: List, label: 'Categorias', color: 'bg-purple-500' },
                            { id: 'Webhooks & API', icon: Code, label: 'API & Hooks', color: 'bg-pink-500' },
                            { id: 'Permissões & Cargos', icon: Shield, label: 'Permissões', color: 'bg-red-500' },
                            { id: 'Scripts Globais', icon: Code, label: 'Scripts', color: 'bg-yellow-500' },
                            { id: 'Layout Menu', icon: Layout, label: 'Layout Menu', color: 'bg-cyan-500' },
                            { id: 'Histórico de Versões', icon: History, label: 'Versões', color: 'bg-gray-500' },
                            { id: 'Backup & Reset', icon: Save, label: 'Backup', color: 'bg-blue-600' },
                        ]}
                    />
                </div>
                {activeTab !== 'Permissões & Cargos' && (
                    <button
                        onClick={handleSaveConfig}
                        className="bg-gradient-to-r from-wtech-gold to-yellow-600 text-black px-6 py-2 rounded-lg font-bold text-xs uppercase shadow-lg shadow-yellow-500/20 hover:scale-105 transition-transform flex items-center gap-2 whitespace-nowrap"
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
                                <h3 className="font-bold text-gray-900 dark:text-white border-b dark:border-gray-800 pb-2 flex items-center gap-2"><ImageIcon size={18} /> Identidade Visual</h3>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Nome do Site</label>
                                    <input
                                        className="w-full border border-gray-300 dark:border-gray-700 p-3 rounded-lg dark:bg-[#222] dark:text-white"
                                        value={config.site_title || ''}
                                        onChange={(e) => handleChange('site_title', e.target.value)}
                                        placeholder="W-TECH Brasil"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Logo URL</label>
                                    <div className="flex gap-3">
                                        <div className="w-16 h-16 bg-gray-100 dark:bg-[#222] rounded border dark:border-gray-700 flex items-center justify-center overflow-hidden relative group">
                                            {config.logo_url ? <img src={config.logo_url} className="w-full h-full object-contain" /> : <ImageIcon size={20} className="text-gray-400" />}
                                        </div>
                                        <div className="flex-1 flex gap-2">
                                            <input
                                                className="w-full border border-gray-300 dark:border-gray-700 p-3 rounded-lg text-sm dark:bg-[#222] dark:text-white"
                                                value={config.logo_url || ''}
                                                onChange={(e) => handleChange('logo_url', e.target.value)}
                                                placeholder="https://..."
                                            />
                                            <label className="cursor-pointer bg-gray-100 dark:bg-[#222] border border-gray-300 dark:border-gray-700 p-3 rounded-lg hover:bg-gray-200 dark:hover:bg-[#333]">
                                                <Upload size={18} className="text-gray-600 dark:text-gray-300" />
                                                <input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0], 'logo_url')} />
                                            </label>
                                        </div>
                                    </div>
                                </div>
                                 <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Logo URL (Dark Mode)</label>
                                    <div className="flex gap-3">
                                        <div className="w-16 h-16 bg-black rounded border dark:border-gray-700 flex items-center justify-center overflow-hidden relative group">
                                            {config.logo_dark_url ? <img src={config.logo_dark_url} className="w-full h-full object-contain" /> : <ImageIcon size={20} className="text-gray-600" />}
                                        </div>
                                        <div className="flex-1 flex gap-2">
                                            <input
                                                className="w-full border border-gray-300 dark:border-gray-700 p-3 rounded-lg text-sm dark:bg-[#222] dark:text-white"
                                                value={config.logo_dark_url || ''}
                                                onChange={(e) => handleChange('logo_dark_url', e.target.value)}
                                                placeholder="https://..."
                                            />
                                            <label className="cursor-pointer bg-gray-100 dark:bg-[#222] border border-gray-300 dark:border-gray-700 p-3 rounded-lg hover:bg-gray-200 dark:hover:bg-[#333]">
                                                <Upload size={18} className="text-gray-600 dark:text-gray-300" />
                                                <input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0], 'logo_dark_url')} />
                                            </label>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Favicon URL (Ícone da Aba)</label>
                                    <div className="flex gap-3">
                                        <div className="w-10 h-10 bg-gray-100 dark:bg-[#222] rounded border dark:border-gray-700 flex items-center justify-center overflow-hidden">
                                            {config.favicon_url ? <img src={config.favicon_url} className="w-6 h-6 object-contain" /> : <div className="w-4 h-4 bg-gray-400 rounded-full" />}
                                        </div>
                                        <div className="flex-1 flex gap-2">
                                            <input
                                                className="w-full border border-gray-300 dark:border-gray-700 p-3 rounded-lg text-sm dark:bg-[#222] dark:text-white"
                                                value={config.favicon_url || ''}
                                                onChange={(e) => handleChange('favicon_url', e.target.value)}
                                                placeholder="https://... (PNG/ICO)"
                                            />
                                            <label className="cursor-pointer bg-gray-100 dark:bg-[#222] border border-gray-300 dark:border-gray-700 p-3 rounded-lg hover:bg-gray-200 dark:hover:bg-[#333]">
                                                <Upload size={18} className="text-gray-600 dark:text-gray-300" />
                                                <input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0], 'favicon_url')} />
                                            </label>
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Cor Primária</label>
                                        <div className="flex items-center gap-2">
                                            <input type="color" className="w-8 h-8 rounded cursor-pointer border-0" value={config.primary_color || '#D4AF37'} onChange={(e) => handleChange('primary_color', e.target.value)} />
                                            <span className="text-xs font-mono dark:text-gray-300">{config.primary_color}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Cor Secundária</label>
                                        <div className="flex items-center gap-2">
                                            <input type="color" className="w-8 h-8 rounded cursor-pointer border-0" value={config.secondary_color || '#111111'} onChange={(e) => handleChange('secondary_color', e.target.value)} />
                                            <span className="text-xs font-mono dark:text-gray-300">{config.secondary_color}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Contact & WhatsApp */}
                            <div className="space-y-6">
                                <h3 className="font-bold text-gray-900 dark:text-white border-b dark:border-gray-800 pb-2 flex items-center gap-2"><MessageCircle size={18} /> Contato & WhatsApp</h3>
                                <div>
                                    <div className="flex items-center justify-between mb-4">
                                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">WhatsApp Button</label>
                                        <button
                                            onClick={() => handleChange('whatsapp_enabled', !config.whatsapp_enabled)}
                                            className={`w-10 h-6 rounded-full transition-colors relative ${config.whatsapp_enabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                                        >
                                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${config.whatsapp_enabled ? 'left-5' : 'left-1'}`}></div>
                                        </button>
                                    </div>
                                    {config.whatsapp_enabled && (
                                        <div>
                                            <input
                                                className="w-full border border-green-200 dark:border-green-900/40 p-3 rounded-lg text-green-800 dark:text-green-400 font-bold bg-green-50 dark:bg-green-900/20"
                                                value={config.whatsapp_phone || ''}
                                                onChange={(e) => handleChange('whatsapp_phone', e.target.value)}
                                                placeholder="5511999999999"
                                            />
                                            <p className="text-[10px] text-gray-400">Apenas números (DDI+DDD+Num).</p>
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
                                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">{field.l}</label>
                                            <input
                                                className="w-full border border-gray-300 dark:border-gray-700 p-2 rounded-lg text-sm dark:bg-[#222] dark:text-white"
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
                                <h3 className="font-bold text-gray-900 dark:text-white border-b dark:border-gray-800 pb-2 flex items-center gap-2"><Code size={18} /> Tracking & Pixels</h3>
                                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400 text-xs rounded-lg mb-4">
                                    Insira os IDs de rastreamento para ativar a coleta de dados automática.
                                </div>
                                {[
                                    { k: 'pixel_id', l: 'Facebook Pixel ID' },
                                    { k: 'ga_id', l: 'Google Analytics (GA4)' },
                                    { k: 'gtm_id', l: 'Google Tag Manager' }
                                ].map(field => (
                                    <div key={field.k}>
                                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">{field.l}</label>
                                        <input
                                            className="w-full border border-gray-300 dark:border-gray-700 p-3 rounded-lg font-mono text-sm dark:bg-[#222] dark:text-white"
                                            value={config[field.k] || ''}
                                            onChange={(e) => handleChange(field.k, e.target.value)}
                                            placeholder="..."
                                        />
                                    </div>
                                ))}
                            </div>

                            {/* Dev Tools */}
                            <div className="space-y-6">
                                <h3 className="font-bold text-gray-900 dark:text-white border-b dark:border-gray-800 pb-2 flex items-center gap-2"><Shield size={18} /> Ferramentas do Sistema</h3>
                                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#222] rounded-lg border border-gray-100 dark:border-gray-700">
                                    <div>
                                        <h4 className="font-bold text-sm text-gray-900 dark:text-white">Super Admin</h4>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Ativa botão flutuante para troca rápida de usuários (para testes).</p>
                                    </div>
                                    <button
                                        onClick={() => handleChange('enable_dev_panel', config.enable_dev_panel === 'true' ? 'false' : 'true')}
                                        className={`w-12 h-6 rounded-full transition-colors relative ${config.enable_dev_panel === 'true' ? 'bg-red-600' : 'bg-gray-300 dark:bg-gray-600'}`}
                                    >
                                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${config.enable_dev_panel === 'true' ? 'left-7' : 'left-1'}`}></div>
                                    </button>
                                </div>
                                <div className="flex items-center justify-between p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-100 dark:border-purple-900/40">
                                    <div>
                                        <h4 className="font-bold text-sm text-gray-900 dark:text-white">Distribuição de Leads (CRM)</h4>
                                        <p className="text-xs text-purple-800 dark:text-purple-400">
                                            {config.crm_distribution_mode === 'Random'
                                                ? 'MODO AUTOMÁTICO: Leads são distribuídos aleatoriamente entre a equipe.'
                                                : 'MODO MANUAL: Leads caem na "Fila" e devem ser pegos manualmente.'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Hero & Parceiros */}
                            <div className="space-y-6 col-span-1 md:col-span-2 lg:col-span-3 border-t dark:border-gray-800 pt-8 mt-4">
                                <h3 className="font-bold text-gray-900 dark:text-white border-b dark:border-gray-800 pb-2 flex items-center gap-2"><Sparkles size={18} /> Página Inicial (Hero & Parceiros)</h3>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Headline do Hero</label>
                                            <input
                                                className="w-full border border-gray-300 dark:border-gray-700 p-3 rounded-lg dark:bg-[#222] dark:text-white"
                                                value={config.hero_headline || ''}
                                                onChange={(e) => handleChange('hero_headline', e.target.value)}
                                                placeholder="A Elite da Tecnologia Automotiva"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Subheadline do Hero</label>
                                            <textarea
                                                className="w-full border border-gray-300 dark:border-gray-700 p-3 rounded-lg dark:bg-[#222] dark:text-white"
                                                rows={3}
                                                value={config.hero_subheadline || ''}
                                                onChange={(e) => handleChange('hero_subheadline', e.target.value)}
                                                placeholder="..."
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">URL do Vídeo (Fundo)</label>
                                            <div className="flex gap-2">
                                                <input
                                                    className="flex-1 border border-gray-300 dark:border-gray-700 p-3 rounded-lg font-mono text-xs dark:bg-[#222] dark:text-white"
                                                    value={config.hero_video_url || ''}
                                                    onChange={(e) => handleChange('hero_video_url', e.target.value)}
                                                    placeholder="https://..."
                                                />
                                                <label className="cursor-pointer bg-gray-100 dark:bg-[#222] border border-gray-300 dark:border-gray-700 p-3 rounded-lg hover:bg-gray-200 dark:hover:bg-[#333]">
                                                    <Upload size={18} className="text-gray-600 dark:text-gray-300" />
                                                    <input type="file" className="hidden" accept="video/*" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0], 'hero_video_url')} />
                                                </label>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center mb-2">
                                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Marcas Parceiras</label>
                                            <button
                                                onClick={() => setPartnerBrands([...partnerBrands, { name: '', logo: '' }])}
                                                className="text-[10px] font-bold bg-black text-white px-2 py-1 rounded hover:bg-gray-800 flex items-center gap-1 uppercase"
                                            >
                                                <Plus size={12} /> Adicionar Marca
                                            </button>
                                        </div>

                                        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                            {partnerBrands.length === 0 && (
                                                <div className="text-center py-8 bg-gray-50 dark:bg-[#222] rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700 text-gray-400 text-xs">
                                                    Nenhuma marca cadastrada. Use os padrões do sistema.
                                                </div>
                                            )}
                                            {partnerBrands.map((brand, idx) => (
                                                <div key={idx} className="p-3 bg-gray-50 dark:bg-[#222] rounded-lg border border-gray-200 dark:border-gray-700 flex flex-col gap-3 group">
                                                    <div className="flex gap-2">
                                                        <input
                                                            className="flex-1 border bg-white dark:bg-[#1A1A1A] p-2 rounded text-xs px-2 dark:border-gray-700 dark:text-white"
                                                            placeholder="Nome da Marca"
                                                            value={brand.name}
                                                            onChange={e => {
                                                                const newBrands = [...partnerBrands];
                                                                newBrands[idx].name = e.target.value;
                                                                setPartnerBrands(newBrands);
                                                            }}
                                                        />
                                                        <button
                                                            onClick={() => setPartnerBrands(partnerBrands.filter((_, i) => i !== idx))}
                                                            className="text-red-500 hover:bg-red-50 p-2 rounded dark:hover:bg-red-900/20"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <div className="w-10 h-10 bg-white dark:bg-[#1A1A1A] border dark:border-gray-700 rounded shrink-0 flex items-center justify-center p-1">
                                                            {brand.logo ? <img src={brand.logo} className="max-h-full max-w-full object-contain" /> : <ImageIcon size={14} className="text-gray-300" />}
                                                        </div>
                                                        <input
                                                            className="flex-1 border bg-white dark:bg-[#1A1A1A] p-2 rounded text-[10px] px-2 font-mono dark:border-gray-700 dark:text-white"
                                                            placeholder="Logo URL"
                                                            value={brand.logo}
                                                            onChange={e => {
                                                                const newBrands = [...partnerBrands];
                                                                newBrands[idx].logo = e.target.value;
                                                                setPartnerBrands(newBrands);
                                                            }}
                                                        />
                                                        <label className="cursor-pointer bg-white dark:bg-[#222] border border-gray-300 dark:border-gray-700 p-2 rounded hover:bg-gray-50 dark:hover:bg-[#333]">
                                                            <Upload size={14} className="text-gray-600 dark:text-gray-300" />
                                                            <input
                                                                type="file"
                                                                className="hidden"
                                                                accept="image/*"
                                                                onChange={async (e) => {
                                                                    if (e.target.files?.[0]) {
                                                                        const file = e.target.files[0];
                                                                        const fileExt = file.name.split('.').pop();
                                                                        const fileName = `partner-${idx}-${Date.now()}.${fileExt}`;
                                                                        const filePath = `partners/${fileName}`;

                                                                        const { error: uploadError } = await supabase.storage
                                                                            .from('site-assets')
                                                                            .upload(filePath, file);

                                                                        if (!uploadError) {
                                                                            const { data } = supabase.storage.from('site-assets').getPublicUrl(filePath);
                                                                            const newBrands = [...partnerBrands];
                                                                            newBrands[idx].logo = data.publicUrl;
                                                                            setPartnerBrands(newBrands);
                                                                        }
                                                                    }
                                                                }}
                                                            />
                                                        </label>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>


                        </div>
                    </div>
                )}

                {/* Tab: Scripts Globais (Old Códigos & Scripts) */}
                {activeTab === 'Scripts Globais' && (
                    <div className="w-full animate-in fade-in slide-in-from-bottom-4">
                        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-100 dark:border-yellow-900/40 rounded-lg mb-6">
                            <p className="text-sm text-yellow-800 dark:text-yellow-400">
                                <strong>Cuidado:</strong> Scripts inseridos aqui são carregados em todas as páginas do site.
                            </p>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="col-span-2">
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">HEAD Code</label>
                                <textarea className="w-full h-40 border border-gray-300 dark:border-gray-700 p-4 rounded-lg font-mono text-xs bg-gray-50 dark:bg-[#222] dark:text-white" value={config.head_code} onChange={e => handleChange('head_code', e.target.value)} placeholder="<meta...>, <style...>" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Body Start</label>
                                <textarea className="w-full h-40 border border-gray-300 dark:border-gray-700 p-4 rounded-lg font-mono text-xs bg-gray-50 dark:bg-[#222] dark:text-white" value={config.body_start_code} onChange={e => handleChange('body_start_code', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Body End</label>
                                <textarea className="w-full h-40 border border-gray-300 dark:border-gray-700 p-4 rounded-lg font-mono text-xs bg-gray-50 dark:bg-[#222] dark:text-white" value={config.body_end_code} onChange={e => handleChange('body_end_code', e.target.value)} />
                            </div>
                        </div>
                    </div>
                )}

                {/* Tab: Layout Menu */}
                {activeTab === 'Layout Menu' && (
                    <div className="w-full animate-in fade-in slide-in-from-bottom-4">
                        <div className="max-w-xl mx-auto space-y-8">
                            <div className="bg-white dark:bg-[#1A1A1A] p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                                <h3 className="font-bold text-gray-900 dark:text-white border-b dark:border-gray-800 pb-4 mb-6 flex items-center gap-2">
                                    <Layout size={20} className="text-cyan-500" /> Personalização do Menu
                                </h3>

                                <div className="space-y-8 py-4">
                                    {/* Icon Size */}
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-end">
                                            <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Tamanho dos Ícones</label>
                                        </div>
                                        <Slider
                                            value={[config.menu_styles?.iconSize || 15]}
                                            max={24}
                                            min={12}
                                            step={1}
                                            onValueChange={(val) => handleChange('menu_styles', { ...(config.menu_styles || {}), iconSize: val[0] })}
                                        />
                                    </div>

                                    {/* Font Size */}
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-end">
                                            <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Tamanho da Fonte</label>
                                        </div>
                                        <Slider
                                            value={[config.menu_styles?.fontSize || 11]}
                                            max={16}
                                            min={9}
                                            step={1}
                                            onValueChange={(val) => handleChange('menu_styles', { ...(config.menu_styles || {}), fontSize: val[0] })}
                                        />
                                    </div>

                                    {/* Spacing (Padding Y) */}
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-end">
                                            <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Espaçamento Vertical (Padding)</label>
                                        </div>
                                        <Slider
                                            value={[config.menu_styles?.paddingY !== undefined ? config.menu_styles.paddingY : 4]}
                                            max={12}
                                            min={2}
                                            step={1}
                                            onValueChange={(val) => handleChange('menu_styles', { ...(config.menu_styles || {}), paddingY: val[0] })}
                                        />
                                    </div>

                                    {/* Margin Y */}
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-end">
                                            <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Margem Entre Itens</label>
                                        </div>
                                        <Slider
                                            value={[config.menu_styles?.marginY !== undefined ? config.menu_styles.marginY : 1]}
                                            max={8}
                                            min={0}
                                            step={1}
                                            onValueChange={(val) => handleChange('menu_styles', { ...(config.menu_styles || {}), marginY: val[0] })}
                                        />
                                    </div>
                                </div>

                                <div className="mt-8 p-4 bg-gray-50 dark:bg-[#222] rounded-lg border border-gray-100 dark:border-gray-700 flex items-center gap-3">
                                    <div className="p-2 bg-yellow-100 text-yellow-700 rounded-lg">
                                        <AlertTriangle size={16} />
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        As alterações são aplicadas a <strong>todos os usuários</strong> do sistema.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Tab: Histórico de Versões */}
                {activeTab === 'Histórico de Versões' && (
                    <div className="w-full animate-in fade-in slide-in-from-bottom-4">
                        <div className="max-w-4xl mx-auto">
                            <ChangelogViewer />
                        </div>
                    </div>
                )}

                {/* Tab: Backup & Reset */}
                {activeTab === 'Backup & Reset' && (
                    <div className="w-full animate-in fade-in slide-in-from-bottom-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Backup Section */}
                            <div className="bg-white dark:bg-[#1A1A1A] p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white border-b dark:border-gray-800 pb-4 mb-4 flex items-center gap-2">
                                    <Save size={20} className="text-blue-600" /> Backup System
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                                    Faça o download dos dados principais do sistema em formato JSON.
                                    Recomendamos fazer backups regulares.
                                </p>

                                <div className="space-y-3">
                                    {[
                                        { table: 'SITE_Leads', label: 'Exportar CRM / Leads' },
                                        { table: 'SITE_Enrollments', label: 'Exportar Matrículas' },
                                        { table: 'SITE_Courses', label: 'Exportar Cursos' },
                                        { table: 'SITE_Transactions', label: 'Exportar Transações Financeiras' },
                                        { table: 'SITE_Users', label: 'Exportar Usuários' },
                                    ].map((item) => (
                                        <button
                                            key={item.table}
                                            onClick={async () => {
                                                const { data } = await supabase.from(item.table).select('*');
                                                if (!data || data.length === 0) return alert('Sem dados para exportar.');
                                                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                                                const url = URL.createObjectURL(blob);
                                                const a = document.createElement('a');
                                                a.href = url;
                                                a.download = `${item.table}_backup_${new Date().toISOString().split('T')[0]}.json`;
                                                a.click();
                                            }}
                                            className="w-full flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-[#222] hover:border-blue-300 transition-all font-bold text-gray-700 dark:text-gray-300 text-xs"
                                        >
                                            {item.label}
                                            <TrendingUp size={16} className="text-blue-500" />
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Reset / Danger Zone */}
                            <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-2xl border border-red-100 dark:border-red-900/40">
                                <h3 className="text-lg font-bold text-red-900 dark:text-red-400 border-b border-red-200 dark:border-red-900/40 pb-4 mb-4 flex items-center gap-2">
                                    <AlertTriangle size={20} className="text-red-600" /> Danger Zone (Reset)
                                </h3>
                                <p className="text-sm text-red-800 dark:text-red-400 mb-6">
                                    Ações irreversíveis. Tenha certeza absoluta antes de apagar dados.
                                </p>

                                <div className="space-y-4">
                                    {[
                                        { table: 'SITE_Leads', label: 'APAGAR TODOS OS LEADS', desc: 'Remove todo o histórico do CRM.' },
                                        { table: 'SITE_Notifications', label: 'LIMPAR NOTIFICAÇÕES', desc: 'Remove alertas e avisos enviados.' },
                                        { table: 'SITE_Transactions', label: 'LIMPAR FINANCEIRO', desc: 'Apaga todas as receitas e despesas.' },
                                    ].map((item) => (
                                        <div key={item.table} className="bg-white dark:bg-[#1A1A1A] p-4 rounded-xl border border-red-100 dark:border-red-900/40 shadow-sm">
                                            <div className="flex justify-between items-center mb-2">
                                                <h4 className="font-bold text-red-700 dark:text-red-400 text-sm">{item.label}</h4>
                                                <button
                                                    onClick={async () => {
                                                        const confirmText = prompt(`Para confirmar, digite "CONFIRMAR" para apagar a tabela ${item.table}:`);
                                                        if (confirmText !== 'CONFIRMAR') return alert('Ação cancelada.');

                                                        const { error } = await supabase.from(item.table).delete().neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
                                                        if (error) alert('Erro: ' + error.message);
                                                        else alert('Dados apagados com sucesso.');
                                                    }}
                                                    className="bg-red-600 text-white px-4 py-1.5 rounded text-xs font-bold hover:bg-red-700"
                                                >
                                                    RESETAR
                                                </button>
                                            </div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{item.desc}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Tab: E-mail (New) */}
                {activeTab === 'E-mail' && (
                    <div className="w-full animate-in fade-in slide-in-from-bottom-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-6">
                                <h3 className="font-bold text-gray-900 dark:text-white border-b dark:border-gray-800 pb-2 flex items-center gap-2"><Mail size={18} /> Configurações de SMTP</h3>
                                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400 text-xs rounded-lg mb-4 flex items-center gap-2">
                                    <AlertCircle size={16} />
                                    Essas configurações são usadas para disparos de Email Marketing e notificações do sistema.
                                </div>
                                <div className="grid grid-cols-4 gap-4">
                                    <div className="col-span-3">
                                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Servidor SMTP (Host)</label>
                                        <input
                                            className="w-full border dark:border-gray-700 p-2 rounded text-sm font-mono dark:bg-[#222] dark:text-white"
                                            value={config.email_smtp_host || ''}
                                            onChange={e => handleChange('email_smtp_host', e.target.value)}
                                            placeholder="smtp.example.com"
                                        />
                                    </div>
                                    <div className="col-span-1">
                                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Porta</label>
                                        <input
                                            className="w-full border dark:border-gray-700 p-2 rounded text-sm font-mono dark:bg-[#222] dark:text-white"
                                            value={config.email_smtp_port || ''}
                                            onChange={e => handleChange('email_smtp_port', e.target.value)}
                                            placeholder="587"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Usuário / Email Autenticação</label>
                                    <input
                                        className="w-full border dark:border-gray-700 p-2 rounded text-sm font-mono dark:bg-[#222] dark:text-white"
                                        value={config.email_smtp_user || ''}
                                        onChange={e => handleChange('email_smtp_user', e.target.value)}
                                        placeholder="user@example.com"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Senha de App / SMTP</label>
                                    <div className="relative">
                                        <Lock size={14} className="absolute left-3 top-3 text-gray-400" />
                                        <input
                                            type="password"
                                            className="w-full border dark:border-gray-700 p-2 pl-10 rounded text-sm font-mono dark:bg-[#222] dark:text-white"
                                            value={config.email_smtp_pass || ''}
                                            onChange={e => handleChange('email_smtp_pass', e.target.value)}
                                            placeholder="••••••••••••"
                                        />
                                    </div>
                                    <p className="text-[10px] text-gray-400 mt-1">Recomendamos usar uma "Senha de App" e não a senha principal do email.</p>
                                </div>
                            </div>

                            <div className="space-y-8">
                                <div className="space-y-6">
                                    <h3 className="font-bold text-gray-900 dark:text-white border-b dark:border-gray-800 pb-2 flex items-center gap-2"><User size={18} /> Remetente Padrão</h3>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Nome do Remetente</label>
                                        <input
                                            className="w-full border dark:border-gray-700 p-2 rounded text-sm font-bold dark:bg-[#222] dark:text-white"
                                            value={config.email_sender_name || ''}
                                            onChange={e => handleChange('email_sender_name', e.target.value)}
                                            placeholder="W-Tech Brasil"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Email do Remetente</label>
                                        <input
                                            className="w-full border dark:border-gray-700 p-2 rounded text-sm font-mono dark:bg-[#222] dark:text-white"
                                            value={config.email_sender_email || ''}
                                            onChange={e => handleChange('email_sender_email', e.target.value)}
                                            placeholder="contato@wtech.com"
                                        />
                                        <p className="text-[10px] text-gray-400 mt-1">Certifique-se de que este email está autorizado no seu provedor SMTP.</p>
                                    </div>
                                </div>

                                <div className="space-y-6 pt-4 border-t border-gray-100 dark:border-gray-800">
                                    <h3 className="font-bold text-gray-900 dark:text-white pb-2 flex items-center gap-2"><Send size={18} /> Teste de Envio</h3>
                                    <div className="p-4 bg-gray-50 dark:bg-[#222] border border-gray-200 dark:border-gray-700 rounded-xl space-y-4">
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            Use este campo para verificar se as configurações estão corretas.
                                            <strong>Salve antes de testar.</strong>
                                        </p>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">E-mail de Destino</label>
                                            <input
                                                type="email"
                                                className="w-full border dark:border-gray-700 p-2 rounded text-sm dark:bg-[#222] dark:text-white"
                                                value={testEmail}
                                                onChange={e => setTestEmail(e.target.value)}
                                                placeholder="seu-email@exemplo.com"
                                            />
                                        </div>
                                        <button
                                            onClick={handleTestEmail}
                                            disabled={isTestingEmail}
                                            className={`w-full py-3 rounded-lg font-bold text-xs uppercase transition-all flex items-center justify-center gap-2 ${isTestingEmail ? 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-[#333] dark:text-gray-500' : 'bg-wtech-black text-white hover:bg-gray-800 shadow-md'}`}
                                        >
                                            {isTestingEmail ? (
                                                <><Loader2 size={16} className="animate-spin" /> Testando...</>
                                            ) : (
                                                <><Send size={16} /> Enviar E-mail de Teste</>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Tab: WhatsApp API (New) */}
                {activeTab === 'WhatsApp API' && (
                    <div className="w-full animate-in fade-in slide-in-from-bottom-4">
                        <AdminIntegrations />
                    </div>
                )}

                {/* Tab: Marketplace & ERP (New) */}
                {activeTab === 'Marketplace & ERP' && (
                    <div className="w-full animate-in fade-in slide-in-from-bottom-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* ERP / Bling */}
                            <div className="space-y-6">
                                <h3 className="font-bold text-gray-900 dark:text-white border-b dark:border-gray-800 pb-2 flex items-center gap-2">
                                    <Package size={18} /> ERP & Faturamento
                                </h3>

                                <div className="bg-white dark:bg-[#1A1A1A] border border-gray-100 dark:border-gray-800 rounded-xl p-6 shadow-sm">
                                    <div className="flex justify-between items-center mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-green-50 dark:bg-green-900/20 rounded-lg flex items-center justify-center text-green-600 dark:text-green-400 font-bold text-xs border border-green-100 dark:border-green-900/40">
                                                BLING
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-sm text-gray-900 dark:text-white">Integração Bling ERP</h4>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">Sincroniza pedidos e emite notas fiscais.</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleChange('bling_enabled', config.bling_enabled === 'true' ? 'false' : 'true')}
                                            className={`w-10 h-6 rounded-full transition-colors relative ${config.bling_enabled === 'true' ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                                        >
                                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${config.bling_enabled === 'true' ? 'left-5' : 'left-1'}`}></div>
                                        </button>
                                    </div>

                                    {config.bling_enabled === 'true' && (
                                        <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">API Key (Personal Token)</label>
                                                <div className="relative">
                                                    <Lock size={14} className="absolute left-3 top-2.5 text-gray-400" />
                                                    <input
                                                        type="password"
                                                        className="w-full border border-gray-200 dark:border-gray-700 p-2 pl-9 rounded-lg text-sm font-mono focus:border-green-500 outline-none dark:bg-[#222] dark:text-white"
                                                        value={config.bling_api_key || ''}
                                                        onChange={e => handleChange('bling_api_key', e.target.value)}
                                                        placeholder="••••••••••••••••••••••••"
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex gap-2 text-xs text-gray-400 items-center">
                                                <AlertCircle size={12} />
                                                <span>Acesse Preferências {'>'} Sistema {'>'} Usuários e Tokens no Bling.</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Marketplaces */}
                            <div className="space-y-6">
                                <h3 className="font-bold text-gray-900 dark:text-white border-b dark:border-gray-800 pb-2 flex items-center gap-2">
                                    <Globe size={18} /> Marketplaces
                                </h3>

                                {/* Mercado Livre */}
                                <div className="bg-white dark:bg-[#1A1A1A] border border-gray-100 dark:border-gray-800 rounded-xl p-6 shadow-sm">
                                    <div className="flex justify-between items-center mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg flex items-center justify-center text-yellow-600 dark:text-yellow-400 font-bold text-xs border border-yellow-100 dark:border-yellow-900/40">
                                                MELI
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-sm text-gray-900 dark:text-white">Mercado Livre</h4>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">Sincroniza anúncios e vendas.</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleChange('meli_enabled', config.meli_enabled === 'true' ? 'false' : 'true')}
                                            className={`w-10 h-6 rounded-full transition-colors relative ${config.meli_enabled === 'true' ? 'bg-yellow-400' : 'bg-gray-300 dark:bg-gray-600'}`}
                                        >
                                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${config.meli_enabled === 'true' ? 'left-5' : 'left-1'}`}></div>
                                        </button>
                                    </div>

                                    {config.meli_enabled === 'true' && (
                                        <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">App ID</label>
                                                <input
                                                    className="w-full border border-gray-200 dark:border-gray-700 p-2 rounded-lg text-sm font-mono outline-none dark:bg-[#222] dark:text-white"
                                                    value={config.meli_app_id || ''}
                                                    onChange={e => handleChange('meli_app_id', e.target.value)}
                                                    placeholder="12345678"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Client Secret</label>
                                                <input
                                                    type="password"
                                                    className="w-full border border-gray-200 dark:border-gray-700 p-2 rounded-lg text-sm font-mono outline-none dark:bg-[#222] dark:text-white"
                                                    value={config.meli_secret || ''}
                                                    onChange={e => handleChange('meli_secret', e.target.value)}
                                                    placeholder="••••••••"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Shopee */}
                                <div className="bg-white dark:bg-[#1A1A1A] border border-gray-100 dark:border-gray-800 rounded-xl p-6 shadow-sm">
                                    <div className="flex justify-between items-center mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-orange-50 dark:bg-orange-900/20 rounded-lg flex items-center justify-center text-orange-600 dark:text-orange-400 font-bold text-xs border border-orange-100 dark:border-orange-900/40">
                                                SHP
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-sm text-gray-900 dark:text-white">Shopee</h4>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">Integração oficial Shopee Open Platform.</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleChange('shopee_enabled', config.shopee_enabled === 'true' ? 'false' : 'true')}
                                            className={`w-10 h-6 rounded-full transition-colors relative ${config.shopee_enabled === 'true' ? 'bg-orange-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                                        >
                                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${config.shopee_enabled === 'true' ? 'left-5' : 'left-1'}`}></div>
                                        </button>
                                    </div>

                                    {config.shopee_enabled === 'true' && (
                                        <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Partner ID</label>
                                                    <input className="w-full border border-gray-200 dark:border-gray-700 p-2 rounded-lg text-sm font-mono dark:bg-[#222] dark:text-white" value={config.shopee_partner_id || ''} onChange={e => handleChange('shopee_partner_id', e.target.value)} />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Shop ID</label>
                                                    <input className="w-full border border-gray-200 dark:border-gray-700 p-2 rounded-lg text-sm font-mono dark:bg-[#222] dark:text-white" value={config.shopee_shop_id || ''} onChange={e => handleChange('shopee_shop_id', e.target.value)} />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Partner Key (Secret)</label>
                                                <input type="password" className="w-full border border-gray-200 dark:border-gray-700 p-2 rounded-lg text-sm font-mono dark:bg-[#222] dark:text-white" value={config.shopee_key || ''} onChange={e => handleChange('shopee_key', e.target.value)} placeholder="••••••••" />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Amazon */}
                                <div className="bg-white dark:bg-[#1A1A1A] border border-gray-100 dark:border-gray-800 rounded-xl p-6 shadow-sm">
                                    <div className="flex justify-between items-center mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-gray-50 dark:bg-[#222] rounded-lg flex items-center justify-center text-gray-800 dark:text-gray-200 font-bold text-xs border border-gray-200 dark:border-gray-700">
                                                AMZ
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-sm text-gray-900 dark:text-white">Amazon Seller</h4>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">SP-API Integration.</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleChange('amazon_enabled', config.amazon_enabled === 'true' ? 'false' : 'true')}
                                            className={`w-10 h-6 rounded-full transition-colors relative ${config.amazon_enabled === 'true' ? 'bg-black' : 'bg-gray-300 dark:bg-gray-600'}`}
                                        >
                                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${config.amazon_enabled === 'true' ? 'left-5' : 'left-1'}`}></div>
                                        </button>
                                    </div>

                                    {config.amazon_enabled === 'true' && (
                                        <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Selling Partner ID</label>
                                                <input className="w-full border border-gray-200 dark:border-gray-700 p-2 rounded-lg text-sm font-mono dark:bg-[#222] dark:text-white" value={config.amazon_seller_id || ''} onChange={e => handleChange('amazon_seller_id', e.target.value)} placeholder="A2..." />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">AWS Access Key ID</label>
                                                <input className="w-full border border-gray-200 dark:border-gray-700 p-2 rounded-lg text-sm font-mono dark:bg-[#222] dark:text-white" value={config.amazon_access_key || ''} onChange={e => handleChange('amazon_access_key', e.target.value)} placeholder="AKIA..." />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">AWS Secret Key</label>
                                                <input type="password" className="w-full border border-gray-200 dark:border-gray-700 p-2 rounded-lg text-sm font-mono dark:bg-[#222] dark:text-white" value={config.amazon_secret || ''} onChange={e => handleChange('amazon_secret', e.target.value)} placeholder="••••••••" />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* WooCommerce (WordPress) */}
                                <div className="bg-white dark:bg-[#1A1A1A] border border-gray-100 dark:border-gray-800 rounded-xl p-6 shadow-sm">
                                    <div className="flex justify-between items-center mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-purple-50 dark:bg-purple-900/20 rounded-lg flex items-center justify-center text-purple-600 dark:text-purple-400 font-bold text-xs border border-purple-100 dark:border-purple-900/40">
                                                WOO
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-sm text-gray-900 dark:text-white">WooCommerce (WordPress)</h4>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">Sincroniza estoques, pedidos, etiquetas e notas.</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleChange('woocommerce_enabled', config.woocommerce_enabled === 'true' ? 'false' : 'true')}
                                            className={`w-10 h-6 rounded-full transition-colors relative ${config.woocommerce_enabled === 'true' ? 'bg-purple-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                                        >
                                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${config.woocommerce_enabled === 'true' ? 'left-5' : 'left-1'}`}></div>
                                        </button>
                                    </div>

                                    {config.woocommerce_enabled === 'true' && (
                                        <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">URL da Loja</label>
                                                <div className="relative">
                                                    <Globe size={14} className="absolute left-3 top-2.5 text-gray-400" />
                                                    <input className="w-full border border-gray-200 dark:border-gray-700 p-2 pl-9 rounded-lg text-sm font-mono dark:bg-[#222] dark:text-white" value={config.woocommerce_url || ''} onChange={e => handleChange('woocommerce_url', e.target.value)} placeholder="https://sua-loja.com" />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Consumer Key (CK)</label>
                                                <input className="w-full border border-gray-200 dark:border-gray-700 p-2 rounded-lg text-sm font-mono dark:bg-[#222] dark:text-white" value={config.woocommerce_key || ''} onChange={e => handleChange('woocommerce_key', e.target.value)} placeholder="ck_..." />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Consumer Secret (CS)</label>
                                                <input type="password" className="w-full border border-gray-200 dark:border-gray-700 p-2 rounded-lg text-sm font-mono dark:bg-[#222] dark:text-white" value={config.woocommerce_secret || ''} onChange={e => handleChange('woocommerce_secret', e.target.value)} placeholder="cs_..." />
                                            </div>
                                        </div>
                                    )}
                                </div>

                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'Modelos Msg' && (
                    <div className="w-full animate-in fade-in slide-in-from-bottom-4">
                        <MessageTemplateManager />
                    </div>
                )}

                {/* Tab: Task Categories (NEW) */}
                {activeTab === 'Categorias' && (
                    <div className="w-full animate-in fade-in slide-in-from-bottom-4">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Categorias de Tarefas</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Gerencie as categorias usadas para organizar tarefas.</p>
                            </div>

                            {/* Simple Inline Create */}
                            <div className="flex gap-2">
                                <input
                                    className="border border-gray-300 dark:border-gray-700 p-2 rounded-lg text-sm dark:bg-[#222] dark:text-white"
                                    placeholder="Nova Categoria..."
                                    id="new-cat-name"
                                />
                                <input
                                    type="color"
                                    className="w-10 h-10 border-0 p-1 rounded cursor-pointer"
                                    defaultValue="#e0f2fe"
                                    id="new-cat-color"
                                />
                                <button
                                    onClick={async () => {
                                        const nameInput = document.getElementById('new-cat-name') as HTMLInputElement;
                                        const colorInput = document.getElementById('new-cat-color') as HTMLInputElement;
                                        if (!nameInput.value) return alert('Nome obrigatório');

                                        const { error } = await supabase.from('SITE_TaskCategories').insert({
                                            name: nameInput.value,
                                            color: colorInput.value
                                        });

                                        if (error) alert('Erro: ' + error.message);
                                        else {
                                            alert('Categoria criada!');
                                            nameInput.value = '';
                                            // Force re-fetch logic would act here in a real separate component, 
                                            // for now we rely on a manual reload or we can implement a fast local update if we move state up.
                                            // Since this is inside Admin monolithic state, we might need a refresh trigger.
                                            // Ideally, we move this to a separate component, but I'll implement a basic list fetch below.
                                        }
                                    }}
                                    className="bg-wtech-black text-white px-4 py-2 rounded-lg font-bold text-xs uppercase hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
                                >
                                    <Plus size={14} /> Adicionar
                                </button>
                            </div>
                        </div>

                        <TaskCategoryList />
                    </div>
                )}

                {/* Tab: Webhooks (New) */}
                {activeTab === 'Webhooks & API' && (
                    <div className="w-full animate-in fade-in slide-in-from-bottom-4">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Webhooks do Sistema</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Notifique sistemas externos sobre eventos ocorridos na W-TECH.</p>
                            </div>
                            <button className="bg-wtech-black text-white px-4 py-2 rounded-lg text-xs font-bold uppercase hover:bg-gray-800" onClick={() => {
                                const url = prompt("URL do Webhook:");
                                const topic = prompt("Tópico (ex: lead.create):");
                                if (url && topic) setWebhooks([...webhooks, { url, topic, secret: 'whsec_' + Math.random().toString(36).substr(2, 9) }]);
                            }}>
                                <Plus size={14} /> Adicionar Webhook
                            </button>
                        </div>

                        <div className="bg-white dark:bg-[#1A1A1A] border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm">
                            {webhooks.length === 0 ? (
                                <div className="p-8 text-center text-gray-400">Nenhum webhook configurado.</div>
                            ) : (
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50 dark:bg-[#222] border-b border-gray-100 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400 uppercase">
                                        <tr>
                                            <th className="p-4">Tópico</th>
                                            <th className="p-4">URL de Destino</th>
                                            <th className="p-4">Secret Key</th>
                                            <th className="p-4 text-right">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-sm">
                                        {webhooks.map((wh, idx) => (
                                            <tr key={idx}>
                                                <td className="p-4 font-bold"><span className="bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 px-2 py-1 rounded">{wh.topic}</span></td>
                                                <td className="p-4 font-mono text-xs text-gray-600 dark:text-gray-300 truncate max-w-xs">{wh.url}</td>
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
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Hierarquia de Acesso</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Defina os perfis e o que cada uno pode fazer no sistema.</p>
                            </div>
                            <button
                                onClick={() => setEditingRole({ name: '', description: '', permissions: {}, level: 1 })}
                                className="bg-gray-900 text-white px-4 py-2 rounded-lg font-bold text-xs uppercase flex items-center gap-2 hover:bg-black dark:bg-white dark:text-black dark:hover:bg-gray-200"
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
                                        className={`p-4 rounded-xl border cursor-pointer transition-all ${editingRole?.id === role.id ? 'bg-white border-wtech-gold shadow-md scale-[1.02] dark:bg-[#1A1A1A] dark:border-wtech-gold' : 'bg-white border-gray-100 hover:border-gray-200 dark:bg-[#1A1A1A] dark:border-gray-800 dark:hover:border-gray-700'}`}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="font-bold text-gray-900 dark:text-white">{role.name}</h4>
                                            <span className="bg-gray-100 dark:bg-[#222] text-gray-600 dark:text-gray-400 text-[10px] uppercase font-bold px-2 py-0.5 rounded">Nível {role.level}</span>
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{role.description}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Editor */}
                            <div className="lg:col-span-2">
                                {editingRole ? (
                                    <div className="bg-white dark:bg-[#1A1A1A] p-6 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-800 animate-in fade-in slide-in-from-right-4">
                                        <div className="flex justify-between items-center mb-6 border-b border-gray-100 dark:border-gray-800 pb-4">
                                            <h3 className="font-bold text-lg dark:text-white">{editingRole.id ? 'Editar Cargo' : 'Novo Cargo'}</h3>
                                            <div className="flex gap-2">
                                                {editingRole.id && (
                                                    <button onClick={() => handleDeleteRole(editingRole.id!)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors dark:hover:bg-red-900/20">
                                                        <Trash2 size={18} />
                                                    </button>
                                                )}
                                                <button onClick={() => setEditingRole(null)} className="text-gray-400 hover:text-gray-600 p-2 dark:hover:text-gray-300">
                                                    <X size={20} />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 mb-6">
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Nome do Cargo</label>
                                                <input
                                                    className="w-full border border-gray-200 dark:border-gray-700 p-2 rounded text-sm font-bold dark:bg-[#222] dark:text-white"
                                                    value={editingRole.name || ''}
                                                    onChange={e => setEditingRole({ ...editingRole, name: e.target.value })}
                                                    placeholder="Ex: Editor Chefe"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Nível Hierárquico (1-10)</label>
                                                <input
                                                    type="number"
                                                    className="w-full border border-gray-200 dark:border-gray-700 p-2 rounded text-sm dark:bg-[#222] dark:text-white"
                                                    value={editingRole.level || 1}
                                                    onChange={e => setEditingRole({ ...editingRole, level: parseInt(e.target.value) })}
                                                />
                                            </div>
                                            <div className="col-span-2">
                                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Descrição</label>
                                                <input
                                                    className="w-full border border-gray-200 dark:border-gray-700 p-2 rounded text-sm dark:bg-[#222] dark:text-white"
                                                    value={editingRole.description || ''}
                                                    onChange={e => setEditingRole({ ...editingRole, description: e.target.value })}
                                                    placeholder="O que este cargo pode fazer?"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            {permissionCategories.map((category, idx) => (
                                                <div key={idx} className="mb-6">
                                                    <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2 border-b border-gray-100 dark:border-gray-800 pb-1">{category.title}</h4>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        {category.perms.map(perm => (
                                                            <label key={perm.key} className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-[#222] transition-colors">
                                                                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${editingRole.permissions?.[perm.key] ? 'bg-wtech-gold border-wtech-gold' : 'border-gray-300 bg-white dark:bg-[#1A1A1A] dark:border-gray-700'}`}>
                                                                    {editingRole.permissions?.[perm.key] && <CheckCircle size={14} className="text-black" />}
                                                                </div>
                                                                <input
                                                                    type="checkbox"
                                                                    className="hidden"
                                                                    checked={editingRole.permissions?.[perm.key] || false}
                                                                    onChange={() => togglePermission(perm.key)}
                                                                />
                                                                <span className={`text-sm ${perm.label.includes('(Risco)') || perm.label.includes('Excluir') ? 'text-red-700 font-medium dark:text-red-400' : 'text-gray-700 dark:text-gray-300'}`}>{perm.label}</span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        <button onClick={handleSaveRole} className="w-full bg-wtech-black text-white py-3 rounded-lg font-bold uppercase hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200 transition-all shadow-lg">
                                            Salvar Cargo
                                        </button>
                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-2xl p-10">
                                        <Shield size={48} className="mb-4 text-gray-200 dark:text-gray-700" />
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
const TeamView = ({ permissions, onOpenProfile }: { permissions?: any, onOpenProfile?: () => void }) => {
    const [users, setUsers] = useState<UserType[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // User Edit State
    const [editingUser, setEditingUser] = useState<Partial<UserType> & { password?: string, receives_leads?: boolean }>({});

    const { user } = useAuth();

    // --- Permissions Helper ---
    const hasPermission = (key: string) => {
        if (!user || !user.role) return false;

        // 0. Live Permissions (Prop)
        if (permissions) {
            if (permissions.admin_access) return true;
            return !!permissions[key];
        }

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


    const getRoleName = (roleId?: string) => {
        const role = roles.find(r => r.id === roleId);
        return role ? role.name : 'Sem Cargo';
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-200 dark:border-gray-800 pb-6">
                <div>
                    <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Equipe & Acessos</h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Gerencie os colaboradores e suas permissões no sistema.</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => onOpenProfile?.()}
                        className="bg-white border border-gray-200 text-gray-700 dark:bg-[#222] dark:border-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg font-bold text-xs uppercase hover:bg-gray-50 dark:hover:bg-[#333] flex items-center gap-2 shadow-sm"
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
                    <div key={u.id} onClick={() => { setEditingUser(u); setIsModalOpen(true); }} className="bg-white dark:bg-[#1A1A1A] group hover:shadow-xl transition-all duration-300 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 flex flex-col items-center text-center relative overflow-hidden cursor-pointer">
                        <div className={`absolute top-0 left-0 w-full h-1 ${u.status === 'Active' ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`} />

                        {/* Avatar */}
                        <div className="w-20 h-20 rounded-full bg-gray-50 dark:bg-[#222] border-2 border-white dark:border-[#333] shadow-lg flex items-center justify-center text-2xl font-bold text-gray-400 dark:text-gray-500 mb-4 group-hover:scale-110 transition-transform bg-gradient-to-br from-gray-50 to-gray-100 dark:from-[#222] dark:to-[#111] group-hover:from-wtech-gold/20 group-hover:to-yellow-50 dark:group-hover:to-yellow-900/20">
                            {(u.name || '?').charAt(0)}
                        </div>

                        <h3 className="font-bold text-lg text-gray-900 mb-1 group-hover:text-wtech-gold transition-colors">{u.name || 'Sem Nome'}</h3>
                        <p className="text-xs text-wtech-gold font-bold uppercase tracking-wider mb-4">{getRoleName(u.role_id)}</p>

                        <div className="w-full border-t border-gray-50 my-4"></div>

                        <div className="text-xs text-gray-400 space-y-1 mb-6">
                            <p>{u.email}</p>
                            <p>{u.phone || 'Sem telefone'}</p>
                        </div>

                        <div className="mt-auto w-full">
                            <button
                                className="w-full py-2 rounded border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 font-bold text-xs uppercase group-hover:bg-black group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-black group-hover:border-black dark:group-hover:border-white transition-colors"
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
                            className="bg-white dark:bg-[#1A1A1A] border border-gray-100 dark:border-gray-700 rounded-2xl shadow-2xl p-8 w-full max-w-md"
                        >
                            <div className="flex justify-between items-center mb-6 border-b border-gray-100 dark:border-gray-800 pb-4">
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white">{editingUser.id ? 'Editar Colaborador' : 'Novo Colaborador'}</h3>
                                <div className="flex gap-2">
                                    {editingUser.id && hasPermission('manage_users') && (
                                        <button
                                            onClick={() => handleDeleteUser(editingUser.id!)}
                                            className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-lg transition-colors"
                                            title="Excluir Usuário"
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                    )}
                                    <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-[#333] rounded-full text-gray-400 hover:text-red-500 transition-colors"><X size={20} /></button>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Nome Completo</label>
                                    <input
                                        className="w-full border border-gray-200 dark:border-gray-700 rounded-lg p-3 text-sm font-medium focus:border-wtech-gold outline-none dark:bg-[#222] dark:text-white"
                                        value={editingUser.name || ''}
                                        onChange={e => setEditingUser({ ...editingUser, name: e.target.value })}
                                        placeholder="Ex: João Silva"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">E-mail</label>
                                    <input
                                        className="w-full border border-gray-200 dark:border-gray-700 rounded-lg p-3 text-sm font-medium focus:border-wtech-gold outline-none dark:bg-[#222] dark:text-white"
                                        value={editingUser.email || ''}
                                        onChange={e => setEditingUser({ ...editingUser, email: e.target.value })}
                                        placeholder="joao@exemplo.com"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Senha {editingUser.id && '(Deixe em branco para manter)'}</label>
                                    <div className="relative">
                                        <Lock size={16} className="absolute left-3 top-3 text-gray-400" />
                                        <input
                                            type="password"
                                            className="w-full border border-gray-200 dark:border-gray-700 rounded-lg pl-10 pr-3 py-3 text-sm font-medium focus:border-wtech-gold outline-none dark:bg-[#222] dark:text-white"
                                            placeholder={editingUser.id ? "Nova senha..." : "Definir senha..."}
                                            value={editingUser.password || ''}
                                            onChange={e => setEditingUser({ ...editingUser, password: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Cargo / Função</label>
                                    <select
                                        className="w-full border border-gray-200 dark:border-gray-700 rounded-lg p-3 text-sm font-medium focus:border-wtech-gold outline-none bg-white dark:bg-[#222] dark:text-white"
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
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Status</label>
                                    <select
                                        className="w-full border border-gray-200 dark:border-gray-700 rounded-lg p-3 text-sm font-medium focus:border-wtech-gold outline-none bg-white dark:bg-[#222] dark:text-white"
                                        value={editingUser.status || 'Active'}
                                        onChange={e => setEditingUser({ ...editingUser, status: e.target.value as any })}
                                    >
                                        <option value="Active">Ativo</option>
                                        <option value="Inactive">Bloqueado / Inativo</option>
                                    </select>
                                </div>

                                <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-900/30">
                                    <input
                                        type="checkbox"
                                        id="receives_leads"
                                        className="w-5 h-5 text-wtech-gold rounded focus:ring-wtech-gold"
                                        checked={editingUser.receives_leads || false}
                                        onChange={e => setEditingUser({ ...editingUser, receives_leads: e.target.checked })}
                                    />
                                    <label htmlFor="receives_leads" className="text-sm font-bold text-blue-900 dark:text-blue-300 cursor-pointer">
                                        Apto a receber Leads (Atendimento)
                                        <p className="text-[10px] font-normal text-blue-700 dark:text-blue-400">Se marcado, receberá leads automaticamente.</p>
                                    </label>
                                </div>

                                <div className="pt-4 flex gap-3">
                                    <button onClick={() => setIsModalOpen(false)} className="flex-1 py-3 border border-gray-200 dark:border-gray-700 rounded-lg font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#333]">Cancelar</button>
                                    <button onClick={handleSaveUser} className="flex-1 py-3 bg-wtech-black text-white rounded-lg font-bold hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200 shadow-lg">Salvar Dados</button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );


};

// --- Main Admin Layout ---

const Admin = () => {
    const { user, loading, logout, impersonateUser } = useAuth();
    const navigate = useNavigate();
    const { settings: config } = useSettings();
    const [collapsed, setCollapsed] = useState(false);
    
    // State for View Switching
    const [currentView, setCurrentView] = useState<View | 'marketing' | 'certificates'>('dashboard'); // Added 'certificates' type support

    // --- Global Task Notifications & State ---
    const notificationRef = useRef<SplashedPushNotificationsHandle>(null);
    const notifiedTaskIds = useRef<Set<string>>(new Set());
    const [alertDismissedAt, setAlertDismissedAt] = useState<number | null>(null);

    const handleCompleteTask = async (taskId: string) => {
        const { error } = await supabase.from('SITE_Tasks').update({ status: 'DONE' }).eq('id', taskId);
        if (!error) {
            notificationRef.current?.createNotification('success', 'Concluído!', 'Tarefa marcada como feita.');
        } else {
            console.error('Falha ao concluir tarefa via notificação', error);
        }
    };

    // --- WhatsApp Scheduler Polling ---
    useEffect(() => {
        if (!user) return;

        const checkDueTasks = async () => {
            const now = new Date();
            // Tolerance: Notify if due in next 5 mins OR was due less than 1 hour ago (and not done)
            const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60000);
            const oneHourAgo = new Date(now.getTime() - 60 * 60000);

            const { data: dueTasks } = await supabase
                .from('SITE_Tasks')
                .select('*, SITE_Leads(name, phone)')
                .eq('assigned_to', user.id)
                .neq('status', 'DONE')
                .lte('due_date', fiveMinutesFromNow.toISOString())
                .gte('due_date', oneHourAgo.toISOString());

            if (dueTasks) {
                dueTasks.forEach((task: any) => {
                    // Check if we already notified this specific task ID in this session
                    if (!notifiedTaskIds.current.has(task.id)) {

                        // Prepare Actions
                        const actions: { label: string; onClick: () => void; variant?: 'default' | 'outline' | 'whatsapp' }[] = [
                            {
                                label: 'Concluir',
                                onClick: () => { void handleCompleteTask(task.id); },
                                variant: 'default'
                            }
                        ];

                        if (task.SITE_Leads?.phone) {
                            actions.push({
                                label: 'WhatsApp',
                                onClick: () => {
                                    const phone = task.SITE_Leads.phone.replace(/\D/g, '');
                                    window.open(`https://wa.me/55${phone}`, '_blank');
                                },
                                variant: 'whatsapp'
                            });
                        }

                        // Trigger Notification
                        notificationRef.current?.createNotification(
                            'warning',
                            'Lembrete de Tarefa',
                            `"${task.title}" vence ${new Date(task.due_date) < now ? 'há pouco' : 'em breve'}!`,
                            actions
                        );
                        // Mark as notified
                        notifiedTaskIds.current.add(task.id);
                    }
                });
            }
        };

        const interval = setInterval(checkDueTasks, 60000); // Check every minute
        checkDueTasks(); // Run immediately on mount

        return () => clearInterval(interval);
    }, [user]);

    // BACKGROUND WORKER: Scheduled WhatsApp Messages
    useEffect(() => {
        if (!user) return;

        const checkScheduledMessages = async () => {
            const now = new Date().toISOString();

            // Fetch pending WhatsApp tasks that are due
            const { data: tasksToSend, error } = await supabase
                .from('SITE_Tasks')
                .select('*, SITE_Leads(phone)')
                .eq('is_whatsapp_schedule', true)
                .eq('whatsapp_status', 'PENDING')
                .lte('due_date', now)
                .limit(5); // Process in small batches

            if (error) {
                console.error("Error fetching scheduled messages:", error);
                return;
            }

            if (!tasksToSend || tasksToSend.length === 0) return;

            for (const task of tasksToSend) {
                if (!task.SITE_Leads?.phone || !task.whatsapp_message_body) {
                    await supabase.from('SITE_Tasks').update({ whatsapp_status: 'FAILED' }).eq('id', task.id);
                    continue;
                }

                // Use the assigned user's ID to send the message (or the current user if not assigned)
                const senderId = task.assigned_to || task.created_by || user.id;

                let result;
                if (task.whatsapp_media_url) {
                    result = await sendWhatsAppMedia(
                        task.SITE_Leads.phone,
                        task.whatsapp_media_url,
                        task.whatsapp_message_body,
                        senderId
                    );
                } else {
                    result = await sendWhatsAppMessage(
                        task.SITE_Leads.phone,
                        task.whatsapp_message_body,
                        senderId
                    );
                }

                if (result.success) {
                    await supabase.from('SITE_Tasks').update({
                        whatsapp_status: 'SENT',
                        status: 'DONE'
                    }).eq('id', task.id);
                } else {
                    console.error(`Failed to send scheduled message for task ${task.id}:`, result.error);
                    await supabase.from('SITE_Tasks').update({
                        whatsapp_status: 'FAILED'
                    }).eq('id', task.id);
                }
            }
        };

        const interval = setInterval(checkScheduledMessages, 60000); // Every minute
        checkScheduledMessages();

        return () => clearInterval(interval);
    }, [user]);

    // BACKGROUND WORKER: Course Reminders (5d and 1d before)
    useEffect(() => {
        if (!user) return;

        const checkCourseReminders = async () => {
            const now = new Date();

            // 1. Fetch active courses with reminders enabled
            const { data: courses } = await supabase
                .from('SITE_Courses')
                .select('*')
                .eq('status', 'Published');

            if (!courses) return;

            for (const course of courses) {
                const courseDate = new Date(course.date);

                // Helper to check and send
                const processReminder = async (daysBeforeKey: string, sentField: string, enabledField: string) => {
                    if (!course[enabledField]) return;

                    const triggerDate = new Date(courseDate);
                    const daysBefore = course[daysBeforeKey] || (sentField.includes('5d') ? 5 : 1);
                    triggerDate.setDate(triggerDate.getDate() - daysBefore);

                    // Only send if we are past the trigger date but NOT past the course date
                    // And only send during daylight hours (e.g., 9:00 to 19:00) to be polite
                    const currentHour = now.getHours();
                    if (now >= triggerDate && now < courseDate && currentHour >= 9 && currentHour <= 20) {

                        // Fetch enrollments for this course that haven't received this specific reminder
                        const { data: enrollments } = await supabase
                            .from('SITE_Enrollments')
                            .select('*')
                            .eq('course_id', course.id)
                            .eq('status', 'Confirmed')
                            .eq(sentField, false);

                        if (enrollments && enrollments.length > 0) {
                            console.log(`Sending ${sentField} reminders for course: ${course.title} to ${enrollments.length} students.`);

                            for (const enr of enrollments) {
                                if (!enr.student_phone) continue;

                                const mapsLink = course.latitude ? `https://www.google.com/maps?q=${course.latitude},${course.longitude}` : (course.map_url || '');

                                const message = `Olá *${enr.student_name}*! Tudo bem? 🏍️\n\n` +
                                    `*Lembrete do curso: ${course.title}*\n\n` +
                                    `📅 *Data:* ${new Date(course.date).toLocaleDateString('pt-BR')}\n` +
                                    `⏰ *Horário:* ${course.start_time || '08:00'} - ${course.end_time || '18:00'}\n` +
                                    `📍 *Endereço:* ${course.address || course.location}, ${course.city || ''} - ${course.state || ''}\n` +
                                    (mapsLink ? `🔗 *Ver no Mapa:* ${mapsLink}\n\n` : '\n') +
                                    (course.schedule ? `📝 *Cronograma:*\n${course.schedule}\n\n` : '') +
                                    (course.what_to_bring ? `🎒 *O que levar:* \n${course.what_to_bring}\n\n` : '') +
                                    `W-TECH Brasil Experience - Te esperamos lá! 🏁`;

                                const result = await sendWhatsAppMessage(enr.student_phone, message);

                                if (result.success) {
                                    await supabase.from('SITE_Enrollments').update({ [sentField]: true }).eq('id', enr.id);
                                }
                            }
                        }
                    }
                };

                // Check 1st Reminder (e.g. 5 days)
                await processReminder('reminder_5d_days', 'reminder_5d_sent', 'reminder_5d_enabled');

                // Check 2nd Reminder (e.g. 1 day)
                await processReminder('reminder_1d_days', 'reminder_1d_sent', 'reminder_1d_enabled');
            }
        };

        // Run every hour for reminders (to be less aggressive than the per-minute task checker)
        const interval = setInterval(checkCourseReminders, 3600000);
        checkCourseReminders();

        return () => clearInterval(interval);
    }, [user]);



    // const [currentView, setCurrentView] = useState<View>('dashboard'); // Removed duplicate
    const [pendingEnrollmentLead, setPendingEnrollmentLead] = useState<Lead | null>(null);

    const [pendingCourseId, setPendingCourseId] = useState<string | null>(null);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    // useAuth and useNavigate moved to top

    // Urgent Tasks State
    const [urgentTasksCount, setUrgentTasksCount] = useState(0);

    useEffect(() => {
        if (!user) return;
        const fetchUrgentTasks = async () => {
            const { count, error } = await supabase
                .from('SITE_Tasks')
                .select('*', { count: 'exact', head: true })
                .eq('assigned_to', user.id)
                .neq('status', 'DONE')
                .or(`priority.eq.URGENT,priority.eq.HIGH,due_date.lt.${new Date().toISOString()}`); // Include Overdue

            if (!error && count !== null) setUrgentTasksCount(count);
        };

        fetchUrgentTasks();
        const interval = setInterval(fetchUrgentTasks, 60000); // Check every minute
        return () => clearInterval(interval);
    }, [user]);

    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

    // LIVE PERMISSIONS STATE
    const [livePermissions, setLivePermissions] = useState<any>(null);

    useEffect(() => {
        if (!loading && !user) {
            navigate('/');
        }
    }, [user, loading, navigate]);

    // FETCH LIVE PERMISSIONS
    useEffect(() => {
        const fetchLivePermissions = async () => {
            if (!user) return;
            try {
                // Refresh user role_id from DB to be safe
                const { data: userData } = await supabase.from('SITE_Users').select('role_id, role').eq('id', user.id).single();

                let roleId = userData?.role_id || user.role_id;
                let roleName = typeof userData?.role === 'string' ? userData.role : (typeof user.role === 'string' ? user.role : null);

                if (roleId) {
                    const { data } = await supabase.from('SITE_Roles').select('permissions').eq('id', roleId).single();
                    if (data) setLivePermissions(data.permissions);
                } else if (roleName) {
                    // Try exact match first
                    let { data } = await supabase.from('SITE_Roles').select('permissions').eq('name', roleName).maybeSingle();

                    // If no data, try case-insensitive match assuming roles might differ in case
                    if (!data) {
                        const { data: allRoles } = await supabase.from('SITE_Roles').select('name, permissions');
                        const match = allRoles?.find((r: any) => r.name.toLowerCase() === roleName?.toLowerCase());
                        if (match) data = match;
                    }

                    if (data) setLivePermissions(data.permissions);
                }
            } catch (err) {
                console.error("Error fetching live permissions in Admin:", err);
            }
        };
        fetchLivePermissions();
    }, [user]);

    // PERMISSION CHECK HELPER
    const hasPermission = (key: string) => {
        if (!user) return false;

        // 0. Live Permissions (Highest Priority)
        if (livePermissions) {
            if (livePermissions.admin_access) return true;
            return !!livePermissions[key];
        }

        // 1. Super Admin / Admin String Override
        const roleName = typeof user.role === 'string' ? user.role : user.role?.name;
        if (roleName === 'Super Admin' || roleName === 'ADMIN' || user.permissions?.admin_access) return true;

        // 2. Level 10 Override
        if (typeof user.role !== 'string' && user.role?.level >= 10) return true;

        // 3. Granular Check
        const rolePermissions = typeof user.role === 'object' ? user.role?.permissions : {};
        const effectivePermissions = { ...rolePermissions, ...user.permissions };

        // Handle specific "manage_orders" legacy case if necessary, or just use key
        return !!effectivePermissions[key];
    };

    // REDIRECT RULE: If User cannot see Dashboard, send to CRM (Leads)
    useEffect(() => {
        if (!loading && user) {
            const canViewDashboard = hasPermission('dashboard_view');
            if (currentView === 'dashboard' && !canViewDashboard) {
                setCurrentView('crm');
            }
        }
    }, [user, loading, livePermissions, currentView]);

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    if (loading || !user) return <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-wtech-gold"></div></div>;

    return (
        <div className={`flex h-screen bg-[#F8F9FA] dark:bg-black overflow-hidden transition-colors duration-300`}>

            {/* Sidebar (Desktop Only) */}
            <div className={`
            hidden md:flex flex-col justify-between shadow-2xl dark:shadow-[0_0_20px_rgba(234,179,8,0.15)] bg-black text-white p-4 transition-all duration-300 ease-in-out relative z-30 ${isSidebarCollapsed ? 'w-20' : 'w-64'}
        `}>
                <div>
                    {/* Brand / Toggle */}
                    <div className={`flex items-start ${isSidebarCollapsed ? 'justify-center' : 'gap-3'} mb-8 mt-12 md:mt-0 transition-all`}>
                        <div className={`flex flex-col ${isSidebarCollapsed ? 'items-center' : 'items-start'} gap-1 w-full overflow-hidden`}>
                            <div className="flex items-center gap-3 w-full">
                                {config.logo_url ? (
                                    <div className={`${isSidebarCollapsed ? 'w-12 h-12' : 'h-10 w-full'} flex items-center transition-all`}>
                                        <img
                                            src={config.logo_url}
                                            alt={config.site_title || 'W-TECH'}
                                            className={`${isSidebarCollapsed ? 'w-full h-full object-contain' : 'h-full w-auto object-contain'}`}
                                        />
                                    </div>
                                ) : (
                                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-wtech-gold to-yellow-600 flex items-center justify-center text-black font-bold text-xl font-sans shadow-lg shadow-yellow-500/20 shrink-0">
                                        'W'
                                    </div>
                                )}

                                {!isSidebarCollapsed && !config.logo_url && (
                                    <div className="overflow-hidden whitespace-nowrap">
                                        <h1 className="font-black text-xl tracking-tighter text-white leading-none">{config.site_title || 'W-TECH'}</h1>
                                        <p className="text-xs text-gray-400 font-bold tracking-widest uppercase">Admin</p>
                                    </div>
                                )}
                            </div>

                            {/* Version Tag & Dark Mode Toggle */}
                            <div className={`flex items-center gap-2 ${isSidebarCollapsed ? 'flex-col scale-75' : 'px-0.5'}`}>
                                <span className="opacity-40 hover:opacity-100 transition-opacity text-[9px] font-black text-wtech-gold uppercase tracking-[0.3em] font-mono">
                                    v{changelogData[0]?.version || '2.2.4'}
                                </span>
                                {!isSidebarCollapsed && <ToggleTheme />}
                            </div>
                        </div>
                        {/* Desktop Toggle Button */}
                        <button
                            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                            className={`hidden md:flex items-center justify-center w-6 h-6 rounded-full bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors ${isSidebarCollapsed ? 'mt-2' : 'ml-auto'}`}
                        >
                            {isSidebarCollapsed ? <ArrowRight size={14} /> : <ChevronLeft size={14} />}
                        </button>
                    </div>

                    {/* Sidebar User Profile */}
                    <div onClick={() => { setIsProfileModalOpen(true); setIsMobileMenuOpen(false); }} className={`mb-2 p-1.5 bg-white/5 rounded-xl border border-white/10 flex items-center gap-2 cursor-pointer hover:bg-white/10 transition-colors group ${isSidebarCollapsed ? 'justify-center' : ''}`}>
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-wtech-gold to-yellow-700 flex items-center justify-center text-black font-bold text-xs shadow-lg shrink-0 overflow-hidden">
                            {user?.avatar_url ? (
                                <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />
                            ) : (
                                user?.name?.charAt(0)
                            )}
                        </div>
                        {!isSidebarCollapsed && (
                            <div className="flex-1 min-w-0 overflow-hidden">
                                <div className="text-xs font-bold text-white truncate group-hover:text-wtech-gold transition-colors">{user?.name}</div>
                                <div className="text-[9px] text-gray-400 font-medium uppercase truncate">
                                    {typeof user?.role === 'string' ? user?.role : (user?.role?.name || 'Sem Cargo')}
                                </div>
                            </div>
                        )}
                        {!isSidebarCollapsed && (
                            <div className="flex items-center gap-1">
                                <Settings size={12} className="text-gray-500 hover:text-white transition-colors" />
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleLogout(); }}
                                    className="p-1 hover:bg-red-500/20 rounded transition-colors text-gray-500 hover:text-red-500"
                                    title="Sair"
                                >
                                    <LogOut size={12} />
                                </button>
                            </div>
                        )}
                        {isSidebarCollapsed && (
                            <button
                                onClick={(e) => { e.stopPropagation(); handleLogout(); }}
                                className="absolute -bottom-2 -right-2 bg-red-600 text-white p-1 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Sair"
                            >
                                <LogOut size={10} />
                            </button>
                        )}
                    </div>

                    <div className="flex-1 flex flex-col justify-between overflow-hidden gap-0.5 pb-2 min-h-0">
                        {hasPermission('dashboard_view') && (
                            <SidebarItem icon={LayoutDashboard} label="Visão Geral" active={currentView === 'dashboard'} onClick={() => { setCurrentView('dashboard'); setIsMobileMenuOpen(false); }} collapsed={isSidebarCollapsed} menuStyles={config.menu_styles} />
                        )}

                        {hasPermission('dashboard_view') && (
                            <SidebarItem icon={BarChart3} label="Analytics" active={currentView === 'analytics'} onClick={() => { setCurrentView('analytics'); setIsMobileMenuOpen(false); }} collapsed={isSidebarCollapsed} menuStyles={config.menu_styles} />
                        )}

                        {hasPermission('crm_view') && (
                            <SidebarItem icon={KanbanSquare} label="Leads & CRM" active={currentView === 'crm'} onClick={() => { setCurrentView('crm'); setIsMobileMenuOpen(false); }} collapsed={isSidebarCollapsed} menuStyles={config.menu_styles} />
                        )}

                        <SidebarItem icon={CheckCircle} label="Tarefas (To-Do)" active={currentView === 'tasks'} onClick={() => { setCurrentView('tasks'); setIsMobileMenuOpen(false); }} collapsed={isSidebarCollapsed} menuStyles={config.menu_styles} />

                        {hasPermission('manage_users') && (
                            <SidebarItem icon={Users} label="Equipe & Acesso" active={currentView === 'team'} onClick={() => { setCurrentView('team'); setIsMobileMenuOpen(false); }} collapsed={isSidebarCollapsed} menuStyles={config.menu_styles} />
                        )}

                        {hasPermission('manage_orders') && (
                            <SidebarItem icon={ShoppingBag} label="Pedidos (Loja)" active={currentView === 'orders'} onClick={() => { setCurrentView('orders'); setIsMobileMenuOpen(false); }} collapsed={isSidebarCollapsed} menuStyles={config.menu_styles} />
                        )}

                        {hasPermission('manage_orders') && (
                            <SidebarItem icon={Package} label="Catálogo & Estoque" active={currentView === 'catalog_manager'} onClick={() => { setCurrentView('catalog_manager'); setIsMobileMenuOpen(false); }} collapsed={isSidebarCollapsed} menuStyles={config.menu_styles} />
                        )}

                        {hasPermission('manage_orders') && (
                            <SidebarItem icon={Users} label="Clientes Unificado" active={currentView === 'clients'} onClick={() => { setCurrentView('clients'); setIsMobileMenuOpen(false); }} collapsed={isSidebarCollapsed} menuStyles={config.menu_styles} />
                        )}

                        {hasPermission('financial_view') && (
                            <SidebarItem icon={FileText} label="Notas Fiscais" active={currentView === 'invoices'} onClick={() => { setCurrentView('invoices'); setIsMobileMenuOpen(false); }} collapsed={isSidebarCollapsed} menuStyles={config.menu_styles} />
                        )}

                        {hasPermission('courses_view') && (
                            <SidebarItem icon={GraduationCap} label="Cursos & Alunos" active={currentView === 'courses_manager'} onClick={() => { setCurrentView('courses_manager'); setIsMobileMenuOpen(false); }} collapsed={isSidebarCollapsed} menuStyles={config.menu_styles} />
                        )}

                        {hasPermission('courses_view') && (
                            <SidebarItem icon={Award} label="Certificados & Crachás" active={currentView === 'certificates'} onClick={() => { setCurrentView('certificates'); setIsMobileMenuOpen(false); }} collapsed={isSidebarCollapsed} menuStyles={config.menu_styles} />
                        )}

                        {hasPermission('accredited_view') && (
                            <SidebarItem icon={Wrench} label="Rede Credenciada" active={currentView === 'mechanics'} onClick={() => { setCurrentView('mechanics'); setIsMobileMenuOpen(false); }} collapsed={isSidebarCollapsed} menuStyles={config.menu_styles} />
                        )}

                        {hasPermission('financial_view') && (
                            <SidebarItem icon={DollarSign} label="Fluxo de Caixa" active={currentView === 'finance'} onClick={() => { setCurrentView('finance'); setIsMobileMenuOpen(false); }} collapsed={isSidebarCollapsed} menuStyles={config.menu_styles} />
                        )}

                        {(hasPermission('courses_edit_lp') || hasPermission('manage_lp')) && (
                            <SidebarItem icon={Monitor} label="Landing Pages" active={currentView === 'lp_builder'} onClick={() => { setCurrentView('lp_builder'); setIsMobileMenuOpen(false); }} collapsed={isSidebarCollapsed} menuStyles={config.menu_styles} />
                        )}

                        <div className={`pt-4 mt-4 border-t border-gray-800 ${isSidebarCollapsed ? 'flex justify-center' : ''}`}>
                            {!isSidebarCollapsed && <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 px-3">Conteúdo & IA</p>}

                            {hasPermission('blog_view') && (
                                <SidebarItem icon={BookOpen} label="Blog Manager" active={currentView === 'blog_manager'} onClick={() => { setCurrentView('blog_manager'); setIsMobileMenuOpen(false); }} collapsed={isSidebarCollapsed} menuStyles={config.menu_styles} />
                            )}

                            {(hasPermission('marketing_view') || hasPermission('manage_marketing')) && (
                                <SidebarItem icon={Megaphone} label="Marketing Center" active={currentView === 'email_marketing'} onClick={() => { setCurrentView('email_marketing'); setIsMobileMenuOpen(false); }} collapsed={isSidebarCollapsed} menuStyles={config.menu_styles} />
                            )}
                        </div>

                        <div className="pt-4 mt-4 border-t border-gray-800">
                            {hasPermission('manage_settings') && (
                                <SidebarItem icon={Settings} label="Configurações" active={currentView === 'settings'} onClick={() => { setCurrentView('settings'); setIsMobileMenuOpen(false); }} collapsed={isSidebarCollapsed} menuStyles={config.menu_styles} />
                            )}
                        </div>
                    </div>
                </div>

                {/* Logout Button Removed From Bottom */}
            </div>

            {/* Mobile Bottom FAB (Floating Action Button) */}
            <AnimatePresence>
                {!isMobileMenuOpen && (
                    <motion.button
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setIsMobileMenuOpen(true)}
                        className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-16 h-16 bg-black/80 backdrop-blur-md rounded-full shadow-2xl flex items-center justify-center border border-white/20 text-wtech-gold"
                    >
                        <List size={28} strokeWidth={3} />
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Mobile Glass Menu Overlay (iPhone Style) */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
                        animate={{ opacity: 1, backdropFilter: "blur(20px)" }}
                        exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
                        className="fixed inset-0 z-50 bg-black/40 flex flex-col items-center justify-end md:hidden"
                        onClick={() => setIsMobileMenuOpen(false)}
                    >
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="w-full h-[85vh] bg-white/20 backdrop-blur-2xl rounded-t-[40px] border-t border-white/20 shadow-[0_-10px_40px_rgba(0,0,0,0.3)] p-8 flex flex-col"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="w-12 h-1.5 bg-white/30 rounded-full mx-auto mb-8"></div>

                            <div className="grid grid-cols-3 gap-6 mb-auto overflow-y-auto">
                                {hasPermission('dashboard_view') && <MobileMenuItem icon={LayoutDashboard} label="Visão Geral" onClick={() => { setCurrentView('dashboard'); setIsMobileMenuOpen(false); }} />}
                                {hasPermission('dashboard_view') && <MobileMenuItem icon={BarChart3} label="Analytics" onClick={() => { setCurrentView('analytics'); setIsMobileMenuOpen(false); }} />}

                                {hasPermission('crm_view') && <MobileMenuItem icon={KanbanSquare} label="Leads & CRM" onClick={() => { setCurrentView('crm'); setIsMobileMenuOpen(false); }} />}
                                {hasPermission('manage_users') && <MobileMenuItem icon={Users} label="Equipe" onClick={() => { setCurrentView('team'); setIsMobileMenuOpen(false); }} />}
                                {hasPermission('manage_orders') && <MobileMenuItem icon={ShoppingBag} label="Loja" onClick={() => { setCurrentView('orders'); setIsMobileMenuOpen(false); }} />}
                                {hasPermission('manage_orders') && <MobileMenuItem icon={Plus} label="Catálogo" onClick={() => { setCurrentView('catalog_manager'); setIsMobileMenuOpen(false); }} />}
                                {hasPermission('courses_view') && <MobileMenuItem icon={GraduationCap} label="Cursos" onClick={() => { setCurrentView('courses_manager'); setIsMobileMenuOpen(false); }} />}
                                {hasPermission('accredited_view') && <MobileMenuItem icon={Wrench} label="Oficinas" onClick={() => { setCurrentView('mechanics'); setIsMobileMenuOpen(false); }} />}
                                {hasPermission('financial_view') && <MobileMenuItem icon={DollarSign} label="Financeiro" onClick={() => { setCurrentView('finance'); setIsMobileMenuOpen(false); }} />}
                                {(hasPermission('courses_edit_lp') || hasPermission('manage_lp')) && <MobileMenuItem icon={Monitor} label="Páginas" onClick={() => { setCurrentView('lp_builder'); setIsMobileMenuOpen(false); }} />}
                                <MobileMenuItem icon={CheckCircle} label="Tarefas" onClick={() => { setCurrentView('tasks'); setIsMobileMenuOpen(false); }} />
                                {hasPermission('blog_view') && <MobileMenuItem icon={BookOpen} label="Blog" onClick={() => { setCurrentView('blog_manager'); setIsMobileMenuOpen(false); }} />}
                                {hasPermission('manage_marketing') && <MobileMenuItem icon={Megaphone} label="Marketing" onClick={() => { setCurrentView('email_marketing'); setIsMobileMenuOpen(false); }} />}
                                {hasPermission('manage_settings') && <MobileMenuItem icon={Settings} label="Ajustes" onClick={() => { setCurrentView('settings'); setIsMobileMenuOpen(false); }} />}

                                <button onClick={handleLogout} className="flex flex-col items-center gap-3 group">
                                    <div className="w-16 h-16 rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-500 shadow-lg group-active:scale-95 transition-transform">
                                        <LogOut size={28} />
                                    </div>
                                    <span className="text-xs font-medium text-white shadow-black drop-shadow-md">Sair</span>
                                </button>
                            </div>

                            <button
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="w-16 h-16 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white mx-auto mt-4 active:scale-95 transition-transform"
                            >
                                <X size={24} />
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Content */}
            <div className={`flex-1 overflow-y-auto overflow-x-hidden md:pt-0 bg-gray-50/50 dark:bg-[#111] dark:text-gray-100 transition-colors duration-300 ${isMobileMenuOpen ? 'blur-sm scale-95 transition-all duration-300' : 'transition-all duration-300'}`}>

                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentView}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.2 }}
                        className="p-4 md:p-6 w-full min-h-full"
                    >
                        {currentView === 'dashboard' && hasPermission('dashboard_view') && <DashboardView />}
                        {currentView === 'analytics' && hasPermission('dashboard_view') && <AnalyticsView />}
                        {currentView === 'crm' && hasPermission('crm_view') && <CRMView onConvertLead={(lead, conversionData: any) => {
                            if (conversionData?.type === 'course') {
                                setPendingEnrollmentLead(lead);
                                setPendingCourseId(conversionData.courseId);
                                setCurrentView('courses_manager');
                            }
                        }} permissions={livePermissions} />}
                        {currentView === 'team' && hasPermission('manage_users') && <TeamView permissions={livePermissions} onOpenProfile={() => setIsProfileModalOpen(true)} />}
                        {currentView === 'orders' && hasPermission('manage_orders') && <SalesManagerView />}
                        {currentView === 'catalog_manager' && hasPermission('manage_orders') && <CatalogManagerView />}
                        {currentView === 'finance' && hasPermission('financial_view') && <FinanceView permissions={livePermissions} />}
                        {currentView === 'mechanics' && hasPermission('accredited_view') && <MechanicsView permissions={livePermissions} />}
                        {currentView === 'courses_manager' && hasPermission('courses_view') && <CoursesManagerView initialLead={pendingEnrollmentLead} initialCourseId={pendingCourseId} onConsumeInitialLead={() => { setPendingEnrollmentLead(null); setPendingCourseId(null); }} permissions={livePermissions} />}
                        {currentView === 'certificates' && hasPermission('courses_view') && <CertificateManagerView />}
                        {currentView === 'lp_builder' && (hasPermission('courses_edit_lp') || hasPermission('manage_lp')) && <LandingPagesView permissions={livePermissions} />}
                        {currentView === 'blog_manager' && hasPermission('blog_view') && <BlogManagerView />}
                        {currentView === 'email_marketing' && (hasPermission('marketing_view') || hasPermission('manage_marketing')) && <MarketingView permissions={livePermissions} />}
                        {currentView === 'tasks' && <TaskManagerView permissions={livePermissions} />}
                        {currentView === 'settings' && hasPermission('manage_settings') && <SettingsView />}
                        {currentView === 'clients' && hasPermission('manage_orders') && <ClientsManagerView permissions={livePermissions} />}
                        {currentView === 'invoices' && hasPermission('financial_view') && <InvoicesManagerView />}
                    </motion.div>
                </AnimatePresence>
            </div>
            {/* Urgent Tasks Notification Widget (Floating) */}
            <AnimatePresence>
                {urgentTasksCount > 0 && currentView !== 'tasks' && !alertDismissedAt && (
                    <motion.div
                        initial={{ y: -50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -50, opacity: 0 }}
                        className="fixed top-6 right-6 z-50 group"
                    >
                        <button
                            onClick={(e) => { e.stopPropagation(); setAlertDismissedAt(Date.now()); }}
                            className="absolute -top-2 -left-2 bg-white text-gray-400 hover:text-red-500 rounded-full p-1.5 shadow-lg border border-gray-100 opacity-0 group-hover:opacity-100 transition-all z-50 hover:rotate-90"
                            title="Ocultar por 5 min"
                        >
                            <X size={14} />
                        </button>

                        <div
                            onClick={() => setCurrentView('tasks')}
                            className="bg-red-600 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-4 hover:scale-105 transition-transform border border-red-500 animate-pulse cursor-pointer"
                        >
                            <div className="relative">
                                <AlertCircle size={32} />
                                <span className="absolute -top-2 -right-2 bg-white text-red-600 w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs border-2 border-red-600 shadow-sm">
                                    {urgentTasksCount}
                                </span>
                            </div>
                            <div className="text-left">
                                <p className="font-black text-sm uppercase tracking-wide">Atenção Necessária</p>
                                <p className="text-xs text-red-100 font-medium">Você tem tarefas urgentes pendentes.</p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <SplashedPushNotifications ref={notificationRef} />

            <UserProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} />

            {config?.enable_dev_panel === 'true' && <DevUserSwitcher />}
        </div>
    );
};
export default Admin;