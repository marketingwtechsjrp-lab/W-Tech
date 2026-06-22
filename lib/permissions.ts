// lib/permissions.ts
// -----------------------------------------------------------------------------
// FONTE ÚNICA DE VERDADE para permissões e cargos do Admin.
//
// Por que este arquivo existe:
//   Antes, o catálogo de permissões (toggles da tela "Permissões & Cargos") e a
//   função `hasPermission` estavam DUPLICADOS em 5 lugares dentro de Admin.tsx,
//   com lógicas levemente diferentes. Além disso, vários toggles da tela nunca
//   eram verificados no código ("toggles fantasma") e algumas ações reais não
//   tinham toggle nenhum ("chaves órfãs"). Centralizar resolve os dois problemas:
//   o que aparece na tela é exatamente o que o código verifica.
//
// Regra de ouro: para CADA chave listada em PERMISSION_CATALOG deve existir um
// `hasPermission('<chave>')` correspondente em algum componente. E vice-versa.
// -----------------------------------------------------------------------------

import { User } from '../types';

export type PermFlags = Record<string, boolean | undefined>;

export interface PermissionDef {
  key: string;
  label: string;
  /** Marca ações destrutivas/sensíveis (renderizadas em vermelho). */
  danger?: boolean;
  /** Dica curta exibida no toggle. */
  note?: string;
}

export interface PermissionModule {
  id: string;
  title: string;
  perms: PermissionDef[];
}

// -----------------------------------------------------------------------------
// CATÁLOGO — cada módulo e suas opções internas reais.
// Toda chave aqui é (ou passa a ser, após o wiring) verificada no código.
// -----------------------------------------------------------------------------
export const PERMISSION_CATALOG: PermissionModule[] = [
  {
    id: 'courses',
    title: 'Cursos & Treinamentos',
    perms: [
      { key: 'courses_view', label: 'Visualizar Módulo' },
      { key: 'courses_add', label: 'Criar Curso' },
      { key: 'courses_edit', label: 'Editar Cursos' },
      { key: 'courses_edit_lp', label: 'Editar Landing Page do Curso' },
      { key: 'courses_add_student', label: 'Adicionar Aluno/Matrícula' },
      { key: 'courses_edit_attendant', label: 'Editar Atendente da Inscrição' },
      { key: 'courses_print_list', label: 'Imprimir Listas' },
      { key: 'certificates_view', label: 'Gerar Certificados & Crachás' },
      { key: 'courses_view_reports', label: 'Ver Relatórios Gerenciais' },
      { key: 'courses_delete', label: 'Excluir Cursos', danger: true },
    ],
  },
  {
    id: 'crm',
    title: 'CRM & Leads',
    perms: [
      { key: 'crm_view', label: 'Acessar CRM' },
      { key: 'crm_manage_all', label: 'Gerenciar Leads (Criar/Editar/Mover)' },
      { key: 'crm_move_back', label: 'Retornar Lead (Mover para trás)' },
      { key: 'crm_view_team', label: 'Ver Leads da Equipe (Gestor)' },
      { key: 'crm_view_all', label: 'Ver Todos os Leads (Igual Admin)' },
      { key: 'crm_config_dist', label: 'Configurar Distribuição' },
      { key: 'crm_export', label: 'Exportar Dados' },
      { key: 'crm_delete_leads', label: 'Excluir Leads', danger: true },
    ],
  },
  {
    id: 'store',
    title: 'Loja Virtual',
    perms: [
      { key: 'orders_view', label: 'Visualizar Pedidos (Meus)' },
      { key: 'orders_view_all', label: 'Visualizar Todos os Pedidos (Gestor)' },
      { key: 'manage_orders', label: 'Gerenciar Pedidos (Criar/Editar/Status)' },
      { key: 'orders_edit_paid', label: 'Editar Pedidos Pagos/Bloqueados (Restrito)', danger: true },
      { key: 'orders_delete', label: 'Excluir Pedido', danger: true },
    ],
  },
  {
    id: 'catalog',
    title: 'Catálogo & Estoque',
    perms: [
      { key: 'catalog_view', label: 'Visualizar Catálogo' },
      { key: 'catalog_manage', label: 'Gerenciar Produtos (Criar/Editar/Excluir)' },
    ],
  },
  {
    id: 'tech_tools',
    title: 'Ferramentas Técnicas (Molas & Óleo)',
    perms: [
      { key: 'springs_view', label: 'Molas & Motos — Acessar Módulo', note: 'Recomendação de molas por moto/piloto' },
      { key: 'oleo_view', label: 'Óleo & Suspensão — Acessar Módulo', note: 'Níveis e viscosidade por modelo' },
    ],
  },
  {
    id: 'clients',
    title: 'Clientes',
    perms: [
      { key: 'clients_view', label: 'Visualizar Carteira de Clientes' },
      { key: 'clients_view_all', label: 'Ver Todos os Clientes (Gestor/Admin)' },
      { key: 'clients_manage', label: 'Editar Clientes' },
    ],
  },
  {
    id: 'landing',
    title: 'Landing Pages',
    perms: [
      { key: 'landing_pages_view', label: 'Acessar Construtor de LPs' },
      { key: 'landing_pages_manage', label: 'Criar/Editar/Excluir Páginas' },
    ],
  },
  {
    id: 'marketing',
    title: 'Marketing & Conteúdo',
    perms: [
      { key: 'marketing_view', label: 'Acessar Central de Marketing' },
      { key: 'manage_marketing', label: 'Administrar Marketing (Acesso Total ao Módulo)' },
      { key: 'campaigns_view', label: 'Acessar Módulo de Campanhas' },
      { key: 'marketing_manage_campaigns', label: 'Gerenciar Campanhas' },
      { key: 'marketing_manage_lists', label: 'Gerenciar Listas de Transmissão' },
      { key: 'marketing_manage_templates', label: 'Gerenciar Modelos (WhatsApp)' },
      { key: 'blog_view', label: 'Acessar Blog Manager' },
      { key: 'blog_create', label: 'Criar / Publicar Posts' },
      { key: 'blog_edit', label: 'Editar Posts' },
      { key: 'blog_ai', label: 'Usar Gerador IA' },
      { key: 'blog_delete', label: 'Excluir Posts', danger: true },
    ],
  },
  {
    id: 'accredited',
    title: 'Rede Credenciada',
    perms: [
      { key: 'accredited_view', label: 'Visualizar Módulo' },
      { key: 'accredited_add', label: 'Adicionar Credenciado' },
      { key: 'accredited_edit', label: 'Editar Dados' },
      { key: 'accredited_import', label: 'Importar CSV/XLS' },
      { key: 'accredited_revoke', label: 'Revogar/Bloquear' },
      { key: 'accredited_delete', label: 'Excluir Permanentemente', danger: true },
    ],
  },
  {
    id: 'financial',
    title: 'Financeiro (Fluxo de Caixa)',
    perms: [
      { key: 'financial_view', label: 'Visualizar Fluxo de Caixa (Meus Lançamentos)' },
      { key: 'financial_view_all', label: 'Visualizar Todo o Fluxo de Caixa (Gestor)' },
      { key: 'invoices_view', label: 'Acessar Notas Fiscais' },
      { key: 'financial_add_transaction', label: 'Lançar Transação' },
      { key: 'financial_export', label: 'Exportar Relatórios' },
      { key: 'financial_delete_transaction', label: 'Excluir Transações (Risco)', danger: true },
    ],
  },
  {
    id: 'tasks',
    title: 'Gestão de Tarefas',
    perms: [
      { key: 'tasks_view', label: 'Acessar Módulo de Tarefas' },
      { key: 'tasks_view_team', label: 'Ver Tarefas da Equipe (Gestor)' },
      { key: 'tasks_delete', label: 'Excluir Tarefas de Outros', danger: true },
    ],
  },
  {
    id: 'whatsapp',
    title: 'Atendimento WhatsApp',
    perms: [
      { key: 'whatsapp_inbox_view', label: 'Acessar Módulo / Conversas' },
      { key: 'whatsapp_view_all', label: 'Ver Todas as Conversas (senão, só as minhas)' },
      { key: 'whatsapp_send', label: 'Enviar Mensagens' },
      { key: 'whatsapp_assume', label: 'Assumir / Transferir Atendimento' },
      { key: 'whatsapp_view_metrics', label: 'Ver Métricas' },
      { key: 'whatsapp_ai_train', label: 'Ver/Treinar a IA (conhecimento/regras)' },
      { key: 'whatsapp_ai_manage', label: 'Ligar/Desligar a IA' },
      { key: 'whatsapp_engine_config', label: 'Configurar Motor de Envio' },
    ],
  },
  {
    id: 'admin',
    title: 'Administração & Sistema',
    perms: [
      { key: 'dashboard_view', label: 'Visualizar Dashboard (Visão Geral)' },
      { key: 'dashboard_view_all', label: 'Visualizar Dados Globais (Dashboard/KPIs)' },
      { key: 'analytics_view', label: 'Visualizar Analytics' },
      { key: 'intelligence_view', label: 'Visualizar Relatórios IA (W-Intelligence)' },
      { key: 'manage_users', label: 'Gerenciar Equipe' },
      { key: 'manage_settings', label: 'Acesso Configurações' },
      { key: 'admin_access', label: 'Acesso Total / Super Admin', danger: true },
    ],
  },
];

/** Conjunto de todas as chaves válidas (para validação/migração). */
export const ALL_PERMISSION_KEYS: string[] = PERMISSION_CATALOG.flatMap((m) =>
  m.perms.map((p) => p.key)
);

// -----------------------------------------------------------------------------
// RESOLUÇÃO DE PERMISSÕES — única implementação para todo o app.
// -----------------------------------------------------------------------------

/**
 * Aliases legados: chaves antigas que ainda podem existir em cargos no banco e
 * devem continuar funcionando até a migração. `manage_marketing` segue como
 * "master switch" do módulo de marketing.
 */
function isGranted(perms: PermFlags, key: string): boolean {
  if (perms.admin_access) return true;
  if (perms[key]) return true;
  // master switch do módulo de marketing
  if (key.startsWith('marketing_') && perms.manage_marketing) return true;
  return false;
}

/**
 * Calcula as permissões efetivas de um usuário.
 * - `live` (opcional): objeto de permissões já resolvido e passado via prop para
 *   subcomponentes (livePermissions). Quando presente, tem prioridade.
 * - Retorna `{ all: true }` quando o usuário é Super Admin / admin_access /
 *   nível >= 10 (bypass total).
 */
export function getEffectivePermissions(
  user: User | null,
  live?: PermFlags | null
): { all: boolean; perms: PermFlags } {
  if (!user) return { all: false, perms: {} };

  if (live) {
    return { all: !!live.admin_access, perms: live };
  }

  const roleName = typeof user.role === 'string' ? user.role : user.role?.name;
  const rName = (roleName || '').toLowerCase();
  const level = typeof user.role === 'object' ? user.role?.level ?? 0 : 0;

  if (
    rName === 'super admin' ||
    rName === 'super_admin' ||
    rName === 'admin' ||
    level >= 10
  ) {
    return { all: true, perms: {} };
  }

  const rolePermissions =
    typeof user.role === 'object' ? user.role?.permissions || {} : {};
  const userPermissions = (user as unknown as { permissions?: PermFlags }).permissions || {};
  return { all: false, perms: { ...rolePermissions, ...userPermissions } };
}

/**
 * Cria a função `hasPermission(key)` para um usuário (e, opcionalmente, um
 * conjunto de permissões "live" passado via prop). Substitui as 5 cópias
 * divergentes que existiam em Admin.tsx.
 */
export function createHasPermission(
  user: User | null,
  live?: PermFlags | null
): (key: string) => boolean {
  const { all, perms } = getEffectivePermissions(user, live);
  if (all) return () => true;
  return (key: string) => isGranted(perms, key);
}

/**
 * Resolver com semântica "explícito vence": se a chave estiver definida no cargo
 * (true OU false), respeita o valor; só usa a chave legada de fallback quando a
 * principal está AUSENTE. Resolve o bug de "desabilitei o módulo e continua
 * aparecendo" — um desligamento explícito ganha do fallback de compatibilidade.
 */
export function createPermissionResolver(
  user: User | null,
  live?: PermFlags | null
): (key: string, legacyKey?: string) => boolean {
  const { all, perms } = getEffectivePermissions(user, live);
  if (all) return () => true;
  return (key: string, legacyKey?: string) => {
    if (Object.prototype.hasOwnProperty.call(perms, key)) return !!perms[key];
    if (legacyKey && isGranted(perms, legacyKey)) return true;
    return isGranted(perms, key);
  };
}

// -----------------------------------------------------------------------------
// PRESETS — modelos de cargo prontos, alinhados ao vocabulário REAL de chaves.
// Usados para semear cargos padrão coerentes (substituem o vocabulário obsoleto
// de config_hierarchy.sql: view_crm/edit_crm/manage_content/...).
// -----------------------------------------------------------------------------
export interface RolePreset {
  name: string;
  description: string;
  level: number;
  permissions: PermFlags;
}

const on = (...keys: string[]): PermFlags =>
  keys.reduce((acc, k) => ({ ...acc, [k]: true }), {} as PermFlags);

export const ROLE_PRESETS: RolePreset[] = [
  {
    name: 'Super Admin',
    description: 'Acesso total ao sistema',
    level: 10,
    permissions: { admin_access: true },
  },
  {
    name: 'Gerente Atendimento',
    description: 'Gestão de cursos, CRM, pedidos e clientes',
    level: 9,
    permissions: on(
      'dashboard_view', 'courses_view', 'courses_add', 'courses_edit', 'courses_edit_lp',
      'courses_add_student', 'courses_edit_attendant', 'courses_print_list', 'certificates_view',
      'courses_view_reports', 'crm_view', 'crm_manage_all', 'crm_move_back', 'crm_view_team',
      'crm_view_all', 'crm_config_dist', 'crm_export', 'orders_view', 'orders_view_all',
      'manage_orders', 'clients_view', 'clients_view_all', 'clients_manage', 'tasks_view',
      'tasks_view_team', 'whatsapp_inbox_view', 'whatsapp_view_all', 'whatsapp_send',
      'whatsapp_assume', 'whatsapp_view_metrics', 'whatsapp_ai_manage', 'whatsapp_ai_train',
      'whatsapp_engine_config'
    ),
  },
  {
    name: 'Financeiro',
    description: 'Fluxo de caixa, notas fiscais e pedidos',
    level: 8,
    permissions: on(
      'dashboard_view', 'financial_view', 'financial_view_all', 'invoices_view',
      'financial_add_transaction', 'financial_export', 'orders_view', 'orders_view_all',
      'clients_view', 'clients_view_all'
    ),
  },
  {
    name: 'Marketing',
    description: 'Marketing, campanhas, blog e landing pages',
    level: 7,
    permissions: on(
      'dashboard_view', 'marketing_view', 'manage_marketing', 'campaigns_view',
      'marketing_manage_campaigns', 'marketing_manage_lists', 'marketing_manage_templates',
      'blog_view', 'blog_create', 'blog_edit', 'blog_ai', 'landing_pages_view',
      'landing_pages_manage', 'analytics_view'
    ),
  },
  {
    name: 'Atendente',
    description: 'Pode editar conteúdo mas não configurações',
    level: 2,
    permissions: on(
      'crm_view', 'crm_manage_all', 'courses_view', 'courses_add_student', 'orders_view',
      'clients_view', 'tasks_view', 'whatsapp_inbox_view', 'whatsapp_send', 'whatsapp_assume'
    ),
  },
];
