import React from 'react';
import {
    LayoutDashboard, KanbanSquare, CheckCircle, UserCheck, Wrench,
    ShoppingBag, GraduationCap, Package, FileText, DollarSign,
    Megaphone, Rocket, Sparkles, Users, Settings,
    ChevronLeft, ArrowRight, LogOut, MessageSquare, Share2, type LucideIcon
} from 'lucide-react';
import { motion } from 'framer-motion';
import { ToggleTheme } from '../ui/toggle-theme';
import changelogData from '../../CHANGELOG.json';
import { cn } from '../../lib/utils';

// ── Props ──────────────────────────────────────────────────────────────────

interface AdminSidebarProps {
    currentView: string;
    onNavigate: (view: string) => void;
    isCollapsed: boolean;
    onToggleCollapsed: () => void;
    hasPermission: (key: string) => boolean;
    user: any;
    config: any;
    onLogout: () => void;
    onOpenProfile: () => void;
    urgentTasksCount?: number;
}

// ── Navigation Groups ──────────────────────────────────────────────────────

type NavItem = {
    icon: LucideIcon;
    label: string;
    view: string;
    permission: string;
    badge?: 'urgent_tasks';
};

type NavGroup = {
    label: string;
    items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
    {
        label: 'Core',
        items: [
            { icon: LayoutDashboard, label: 'Visão Geral', view: 'dashboard', permission: 'dashboard_view' },
        ]
    },
    {
        label: 'Operacional',
        items: [
            { icon: KanbanSquare, label: 'Leads & CRM',     view: 'crm',             permission: 'crm_view' },
            { icon: CheckCircle,  label: 'Tarefas',          view: 'tasks',           permission: 'tasks_view', badge: 'urgent_tasks' },
            { icon: UserCheck,    label: 'Clientes',         view: 'clients',         permission: 'clients_view' },
            { icon: Wrench,       label: 'Rede Credenciada', view: 'mechanics',       permission: 'accredited_view' },
        ]
    },
    {
        label: 'Vendas',
        items: [
            { icon: ShoppingBag,   label: 'Pedidos',              view: 'orders',           permission: 'orders_view' },
            { icon: GraduationCap, label: 'Cursos & Alunos',      view: 'courses_manager',  permission: 'courses_view' },
            { icon: MessageSquare, label: 'Recuperação WhatsApp', view: 'sales_recovery',   permission: 'orders_view' },
            { icon: Package,       label: 'Catálogo',             view: 'catalog_manager',  permission: 'catalog_view' },
            { icon: FileText,      label: 'Notas Fiscais',        view: 'invoices',         permission: 'invoices_view' },
            { icon: DollarSign,    label: 'Financeiro',           view: 'finance',          permission: 'financial_view' },
        ]
    },
    {
        label: 'Marketing',
        items: [
            { icon: Megaphone, label: 'Campanhas',            view: 'email_marketing',     permission: 'marketing_view' },
            { icon: Rocket,    label: 'Marketing Hub',        view: 'marketing_hub',       permission: 'marketing_view' },
            { icon: Sparkles,  label: 'W-Intelligence',       view: 'intelligence',        permission: 'intelligence_view' },
            { icon: Share2,    label: 'Central de Afiliados', view: 'affiliates_manager',  permission: 'marketing_view' },
        ]
    },
    {
        label: 'Sistema',
        items: [
            { icon: Users,    label: 'Equipe & Acesso', view: 'team',     permission: 'manage_users' },
            { icon: Settings, label: 'Configurações',   view: 'settings', permission: 'manage_settings' },
        ]
    },
];

// ── SidebarItem ────────────────────────────────────────────────────────────

const SidebarItem = ({
    icon: Icon,
    label,
    active,
    onClick,
    collapsed,
    badge,
}: {
    icon: LucideIcon;
    label: string;
    active: boolean;
    onClick: () => void;
    collapsed?: boolean;
    badge?: number;
}) => (
    <button
        onClick={onClick}
        title={collapsed ? label : undefined}
        className={cn(
            'w-full flex items-center gap-2.5 min-h-[44px] rounded-lg transition-all duration-150 group',
            collapsed ? 'justify-center px-0' : 'px-3',
            active
                ? 'bg-gradient-to-r from-wtech-gold to-yellow-600 text-black font-bold shadow-sm shadow-yellow-500/20'
                : 'text-[var(--admin-sidebar-text)] hover:bg-[var(--admin-sidebar-item-hover)] hover:text-white'
        )}
    >
        <Icon
            size={16}
            className={cn(
                'shrink-0 transition-colors',
                active ? 'text-black' : 'text-gray-500 group-hover:text-wtech-gold'
            )}
        />
        {!collapsed && (
            <span className="text-[13px] font-medium tracking-tight truncate leading-none">
                {label}
            </span>
        )}
        {badge !== undefined && badge > 0 && !collapsed && (
            <span className="ml-auto bg-red-500 text-white text-[10px] font-black min-w-[18px] h-[18px] flex items-center justify-center rounded-full px-1">
                {badge > 99 ? '99+' : badge}
            </span>
        )}
        {badge !== undefined && badge > 0 && collapsed && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        )}
    </button>
);

// ── AdminSidebar ───────────────────────────────────────────────────────────

const AdminSidebar: React.FC<AdminSidebarProps> = ({
    currentView,
    onNavigate,
    isCollapsed,
    onToggleCollapsed,
    hasPermission,
    user,
    config,
    onLogout,
    onOpenProfile,
    urgentTasksCount = 0,
}) => {
    const version = (changelogData as any[])[0]?.version || '2.2.4';

    return (
        <div
            className={cn(
                'hidden md:flex flex-col h-screen overflow-hidden shadow-2xl dark:shadow-[0_0_20px_rgba(234,179,8,0.15)]',
                'bg-black text-white p-4 transition-all duration-300 ease-in-out relative z-30',
                isCollapsed ? 'w-20' : 'w-64'
            )}
        >
            {/* ── Top: Brand + Toggle ── */}
            <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
                <div className={cn(
                    'flex items-start mb-6 transition-all shrink-0',
                    isCollapsed ? 'justify-center' : 'gap-3'
                )}>
                    <div className={cn(
                        'flex flex-col gap-1 w-full overflow-hidden',
                        isCollapsed ? 'items-center' : 'items-start'
                    )}>
                        <div className="flex items-center gap-3 w-full">
                            {config?.logo_url ? (
                                <div className={cn(
                                    'flex items-center transition-all',
                                    isCollapsed ? 'w-12 h-12' : 'h-10 w-full'
                                )}>
                                    <img
                                        src={config.logo_url}
                                        alt={config.site_title || 'W-TECH'}
                                        className={isCollapsed ? 'w-full h-full object-contain' : 'h-full w-auto object-contain'}
                                    />
                                </div>
                            ) : (
                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-wtech-gold to-yellow-600 flex items-center justify-center text-black font-bold text-xl font-sans shadow-lg shadow-yellow-500/20 shrink-0">
                                    W
                                </div>
                            )}

                            {!isCollapsed && !config?.logo_url && (
                                <div className="overflow-hidden whitespace-nowrap">
                                    <h1 className="font-black text-xl tracking-tighter text-white leading-none">
                                        {config?.site_title || 'W-TECH'}
                                    </h1>
                                    <p className="text-xs text-gray-400 font-bold tracking-widest uppercase">Admin</p>
                                </div>
                            )}
                        </div>

                        {/* Version + Theme Toggle */}
                        <div className={cn('flex items-center gap-2', isCollapsed ? 'flex-col scale-75' : 'px-0.5')}>
                            <span className="opacity-40 hover:opacity-100 transition-opacity text-[9px] font-black text-wtech-gold uppercase tracking-[0.3em] font-mono">
                                v{version}
                            </span>
                            {!isCollapsed && <ToggleTheme />}
                        </div>
                    </div>

                    {/* Collapse Toggle */}
                    <button
                        onClick={onToggleCollapsed}
                        className={cn(
                            'hidden md:flex items-center justify-center w-6 h-6 rounded-full',
                            'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors',
                            isCollapsed ? 'mt-2' : 'ml-auto'
                        )}
                    >
                        {isCollapsed ? <ArrowRight size={14} /> : <ChevronLeft size={14} />}
                    </button>
                </div>

                {/* ── User Profile Card ── */}
                <div
                    onClick={onOpenProfile}
                    className={cn(
                        'mb-3 p-1.5 bg-white/5 rounded-xl border border-white/10 shrink-0',
                        'flex items-center gap-2 cursor-pointer hover:bg-white/10 transition-colors group relative',
                        isCollapsed ? 'justify-center' : ''
                    )}
                >
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-wtech-gold to-yellow-700 flex items-center justify-center text-black font-bold text-xs shadow-lg shrink-0 overflow-hidden">
                        {user?.avatar_url ? (
                            <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />
                        ) : (
                            user?.name?.charAt(0)
                        )}
                    </div>
                    {!isCollapsed && (
                        <div className="flex-1 min-w-0 overflow-hidden">
                            <div className="text-xs font-bold text-white truncate group-hover:text-wtech-gold transition-colors">
                                {user?.name}
                            </div>
                            <div className="text-[9px] text-gray-400 font-medium uppercase truncate">
                                {typeof user?.role === 'string' ? user?.role : (user?.role?.name || 'Sem Cargo')}
                            </div>
                        </div>
                    )}
                    {!isCollapsed && (
                        <div className="flex items-center gap-1">
                            <Settings size={12} className="text-gray-500 hover:text-white transition-colors" />
                            <button
                                onClick={(e) => { e.stopPropagation(); onLogout(); }}
                                className="p-1 hover:bg-red-500/20 rounded transition-colors text-gray-500 hover:text-red-500"
                                title="Sair"
                            >
                                <LogOut size={12} />
                            </button>
                        </div>
                    )}
                    {isCollapsed && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onLogout(); }}
                            className="absolute -bottom-2 -right-2 bg-red-600 text-white p-1 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Sair"
                        >
                            <LogOut size={10} />
                        </button>
                    )}
                </div>

                {/* ── Navigation Groups ── */}
                <nav className="flex-1 overflow-y-auto min-h-0 py-1 custom-scrollbar">
                    {NAV_GROUPS.map((group, gi) => {
                        const visibleItems = group.items.filter(item => hasPermission(item.permission));
                        if (visibleItems.length === 0) return null;
                        return (
                            <div
                                key={gi}
                                className={gi > 0 ? 'mt-1 pt-1 border-t border-[var(--admin-sidebar-divider)]' : ''}
                            >
                                {!isCollapsed && (
                                    <span className="block px-3 pt-3 pb-1 text-[10px] font-black uppercase tracking-[0.15em] text-[var(--admin-sidebar-group-label)]">
                                        {group.label}
                                    </span>
                                )}
                                <div className="space-y-0.5 px-1">
                                    {visibleItems.map(item => (
                                        <SidebarItem
                                            key={item.view}
                                            icon={item.icon}
                                            label={item.label}
                                            active={currentView === item.view}
                                            collapsed={isCollapsed}
                                            onClick={() => onNavigate(item.view)}
                                            badge={item.badge === 'urgent_tasks' ? urgentTasksCount : undefined}
                                        />
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </nav>
            </div>
        </div>
    );
};

export default AdminSidebar;
