import {
    LayoutDashboard, KanbanSquare, CheckCircle, UserCheck, Wrench,
    ShoppingBag, GraduationCap, Package, FileText, DollarSign,
    Megaphone, Rocket, Sparkles, Users, Settings, BarChart3, ClipboardList,
    ClipboardCheck, Droplets, MessageCircle, Bot,
    type LucideIcon,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Mapa de navegação central do Admin.
// Fonte única usada por: AdminSidebar, CommandPalette (Cmd/Ctrl+K) e atalhos "g + tecla".
// ─────────────────────────────────────────────────────────────────────────────

export type AdminNavItem = {
    icon: LucideIcon;
    label: string;
    view: string;
    permission: string;
    /** Permissão legada de fallback: usada só quando `permission` está AUSENTE no cargo. */
    legacyPermission?: string;
    /** Tecla do atalho de navegação rápida: "g" e depois esta tecla. */
    goKey?: string;
    /** Palavras extras para busca fuzzy no command palette. */
    keywords?: string;
    badge?: 'urgent_tasks';
};

export type AdminNavGroup = {
    label: string;
    items: AdminNavItem[];
};

export const NAV_GROUPS: AdminNavGroup[] = [
    {
        label: 'Core',
        items: [
            { icon: LayoutDashboard, label: 'Visão Geral', view: 'dashboard', permission: 'dashboard_view', goKey: 'd', keywords: 'dashboard home inicio painel' },
            { icon: BarChart3, label: 'Analytics', view: 'analytics', permission: 'analytics_view', goKey: 'y', keywords: 'metricas relatorios trafego' },
        ],
    },
    {
        label: 'Operacional',
        items: [
            { icon: KanbanSquare, label: 'Leads & CRM', view: 'crm', permission: 'crm_view', goKey: 'l', keywords: 'leads funil pipeline negociacao' },
            { icon: CheckCircle, label: 'Tarefas', view: 'tasks', permission: 'tasks_view', goKey: 't', keywords: 'todo afazeres pendencias', badge: 'urgent_tasks' },
            { icon: UserCheck, label: 'Clientes', view: 'clients', permission: 'clients_view', goKey: 'c', keywords: 'contatos compradores base' },
            { icon: MessageCircle, label: 'WhatsApp (Meta)', view: 'whatsapp_inbox', permission: 'whatsapp_inbox_view', legacyPermission: 'crm_view', goKey: 'z', keywords: 'whatsapp chat atendimento inbox conversas mensagens cloud api meta' },
            { icon: Wrench, label: 'Rede Credenciada', view: 'mechanics', permission: 'accredited_view', goKey: 'r', keywords: 'oficinas mecanicos parceiros' },
        ],
    },
    {
        label: 'Vendas',
        items: [
            { icon: ShoppingBag, label: 'Pedidos', view: 'orders', permission: 'orders_view', goKey: 'p', keywords: 'vendas loja compras' },
            { icon: GraduationCap, label: 'Cursos & Alunos', view: 'courses_manager', permission: 'courses_view', goKey: 'a', keywords: 'turmas matriculas alunos academia' },
            { icon: Package, label: 'Catálogo', view: 'catalog_manager', permission: 'catalog_view', goKey: 'k', keywords: 'produtos estoque' },
            { icon: Wrench, label: 'Molas & Motos', view: 'springs_manager', permission: 'springs_view', legacyPermission: 'catalog_view', goKey: 'o', keywords: 'molas motos suspensao recomendacao' },
            { icon: Droplets, label: 'Óleo & Suspensão', view: 'suspension_oil_manager', permission: 'oleo_view', legacyPermission: 'catalog_view', goKey: 'v', keywords: 'oleo nivel viscosidade suspensao garfo amortecedor wp showa kyb' },
            { icon: FileText, label: 'Notas Fiscais', view: 'invoices', permission: 'invoices_view', goKey: 'i', keywords: 'nf nfe faturas' },
            { icon: DollarSign, label: 'Financeiro', view: 'finance', permission: 'financial_view', goKey: 'f', keywords: 'caixa fluxo receita despesa' },
        ],
    },
    {
        label: 'Marketing',
        items: [
            { icon: Megaphone, label: 'Campanhas', view: 'email_marketing', permission: 'marketing_view', goKey: 'm', keywords: 'email disparos newsletter' },
            { icon: Rocket, label: 'Marketing Hub', view: 'marketing_hub', permission: 'marketing_view', goKey: 'h', keywords: 'landing pages blog bio campanhas' },
            { icon: ClipboardCheck, label: 'POP Marketing', view: 'pop_marketing', permission: 'marketing_view', goKey: 'b', keywords: 'pop pedidos campanha aprovacao aprovacoes whatsapp painel ao vivo sla briefing' },
            { icon: Sparkles, label: 'W-Intelligence', view: 'intelligence', permission: 'intelligence_view', goKey: 'w', keywords: 'ia inteligencia insights' },
        ],
    },
    {
        label: 'Sistema',
        items: [
            { icon: Users, label: 'Equipe & Acesso', view: 'team', permission: 'manage_users', goKey: 'e', keywords: 'usuarios cargos permissoes equipe' },
            { icon: Settings, label: 'Configurações', view: 'settings', permission: 'manage_settings', goKey: 's', keywords: 'ajustes preferencias config' },
            { icon: ClipboardList, label: 'Logs do Sistema', view: 'system_logs', permission: 'manage_settings', goKey: 'g', keywords: 'logs auditoria acessos operacoes' },
        ],
    },
    {
        label: 'IA',
        items: [
            // permission propositalmente FORA de PERMISSION_CATALOG (lib/permissions.ts):
            // nunca aparece como toggle em "Equipe & Acesso", então só super admin
            // (que sempre bypassa hasPermission) enxerga este módulo.
            { icon: Bot, label: 'Assistentes de IA', view: 'ai_assistants', permission: 'ai_assistants_super_admin', goKey: 'u', keywords: 'ia agentes leo bia rita sofia inteligencia assistentes' },
        ],
    },
];

/** Lista achatada de todos os itens de navegação. */
export const NAV_ITEMS: AdminNavItem[] = NAV_GROUPS.flatMap(g => g.items);

/** Procura um item de navegação pela tecla de atalho (g + tecla). */
export const findNavByGoKey = (key: string): AdminNavItem | undefined =>
    NAV_ITEMS.find(i => i.goKey === key.toLowerCase());
