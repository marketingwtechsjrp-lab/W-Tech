/**
 * POP de Marketing — tipos, regras de negócio e client da API de Aprovações.
 *
 * Módulo compartilhado pelas telas do admin:
 *  - Pedidos de Campanha (POP 8.1) — CRUD direto via supabase (SITE_CampaignRequests)
 *  - Aprovações via WhatsApp — consome as rotas Express /api/approvals/* (contrato fixo)
 *  - Painel ao Vivo — leitura direta via supabase + helpers de SLA
 *
 * Fase 2:
 *  - Planejamento de Tráfego (POP 8.6) — SITE_TrafficPlans / SITE_TrafficPlanItems
 *  - Reuniões de alinhamento (POP 8.7) — SITE_MeetingNotes
 *  - Pós-Campanha (POP 8.8) — SITE_CampaignResults + expected_result no pedido
 *  - Compartilhamento no WhatsApp e ocupação de turmas — rotas /api/marketing/*
 */

// ─────────────────────────────────────────────────────────────────────────────
// Tipos (espelham migrations/2026-07-15_pop_marketing_aprovacoes.sql)
// ─────────────────────────────────────────────────────────────────────────────

export type RequestStatus =
    | 'Recebido' | 'Triagem' | 'Planejamento' | 'Producao' | 'Aprovacao'
    | 'Aprovado' | 'Publicado' | 'Concluido' | 'Reprovado' | 'Cancelado';

export type RequestPriority = 'Baixa' | 'Media' | 'Alta';

export interface CampaignRequest {
    id: string;
    title: string;
    objective: string | null;
    requester_name: string;
    requester_sector: string;
    requester_contact: string | null;
    target_audience: string | null;
    delivery_type: string | null;
    context_refs: string | null;
    desired_date: string | null;
    urgency_reason: string | null;
    /** Meta do pedido (POP 8.8) — o resultado esperado que o 8.8 compara com o real. */
    expected_result: string | null;
    budget: number | null;
    cost_center: string | null;
    approver_name: string | null;
    priority: RequestPriority;
    status: RequestStatus;
    sla_due_at: string | null;
    completed_at: string | null;
    created_by: string | null;
    created_at: string;
    updated_at?: string;
}

export type ApprovalStatus = 'Rascunho' | 'Enviado' | 'Aprovado' | 'Reprovado' | 'Ajustes';

export interface ApprovalMedia {
    url: string;
    type: string;
    name: string;
    size: number;
}

export interface ApprovalItem {
    id: number;
    request_id: string | null;
    title: string;
    description: string | null;
    media: ApprovalMedia[];
    status: ApprovalStatus;
    wa_instance: string | null;
    wa_group_jid: string | null;
    sent_at: string | null;
    decided_at: string | null;
    decided_by: string | null;
    decision_note: string | null;
    version: number;
    created_by: string | null;
    created_at: string;
}

export interface ApprovalEvent {
    id: number;
    item_id: number | null;
    request_id: string | null;
    event: string;
    actor: string | null;
    payload: Record<string, any> | null;
    created_at: string;
}

export interface ApprovalSettings {
    configured: boolean;
    instance?: string;
    group_jid?: string;
    group_name?: string;
    /** Fase 2 — grupo do time de Marketing (compartilhamentos internos). */
    team_group_jid?: string;
    team_group_name?: string;
    /** Fase 2 — alerta de ocupação de turmas (POP 8.4). */
    course_alert_days?: number;
    course_alert_min_pct?: number;
}

export interface WhatsAppGroup {
    jid: string;
    name: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tipos — Fase 2 (espelham migrations/2026-07-15_pop_marketing_fase2.sql)
// ─────────────────────────────────────────────────────────────────────────────

export type TrafficPlanStatus = 'Rascunho' | 'Publicado';

export type TrafficChannel = 'Meta' | 'Google' | 'TikTok' | 'Outro';

/** Planejamento mensal de tráfego pago (POP 8.6). */
export interface TrafficPlan {
    id: string;
    /** Primeiro dia do mês (YYYY-MM-01). */
    month: string;
    status: TrafficPlanStatus;
    notes: string | null;
    created_by: string | null;
    created_at: string;
    updated_at?: string;
}

/** Linha da tabela de anúncios do planejamento. */
export interface TrafficPlanItem {
    id: number;
    plan_id: string;
    ad_name: string;
    campaign_name: string | null;
    channel: TrafficChannel;
    audience: string | null;
    region: string | null;
    budget: number;
    expected_result: string | null;
    /** Preenchido no fechamento do mês. */
    actual_result: string | null;
    sort: number;
    created_at?: string;
}

export type MeetingWith = 'Diretoria' | 'Gerencia Comercial' | 'Outro';

/** Registro de reunião de alinhamento (POP 8.7). */
export interface MeetingNote {
    id: string;
    meeting_date: string;
    with_whom: MeetingWith;
    participants: string | null;
    summary: string;
    /** Decisões / novos prazos / responsáveis. */
    decisions: string | null;
    shared_at: string | null;
    created_by: string | null;
    created_at: string;
}

/** Resultados pós-campanha (POP 8.8) — 1:1 com o pedido (PK = request_id). */
export interface CampaignResult {
    request_id: string;
    invested: number | null;
    leads: number | null;
    sales: number | null;
    revenue: number | null;
    reach: number | null;
    metrics: Record<string, any>;
    /** Resultado vs meta (expected_result) do pedido. */
    compared_to_goal: string | null;
    learnings: string | null;
    shared_at: string | null;
    created_by?: string | null;
    created_at?: string;
    updated_at?: string;
}

/** Turma retornada por GET /api/marketing/course-occupancy. */
export interface CourseOccupancy {
    id: string | number;
    title: string;
    date: string;
    location: string;
    capacity: number;
    enrolled: number;
    pct: number;
    at_risk: boolean;
    /** true quando a capacidade foi assumida (curso sem vagas cadastradas). */
    assumed_capacity?: boolean;
}

export interface CourseOccupancyResponse {
    courses: CourseOccupancy[];
    settings: { days: number; min_pct: number };
}

export type ShareType = 'meeting_note' | 'campaign_result' | 'traffic_plan';
export type ShareTarget = 'team' | 'requester';

// ─────────────────────────────────────────────────────────────────────────────
// Constantes de domínio (POP 8.1)
// ─────────────────────────────────────────────────────────────────────────────

/** Fluxo principal do pedido, na ordem do board do Painel ao Vivo. */
export const REQUEST_FLOW: RequestStatus[] = [
    'Recebido', 'Triagem', 'Planejamento', 'Producao', 'Aprovacao', 'Aprovado', 'Publicado', 'Concluido',
];

/** Todos os status possíveis (fluxo + terminais negativos). */
export const REQUEST_STATUSES: RequestStatus[] = [...REQUEST_FLOW, 'Reprovado', 'Cancelado'];

/** Status considerados "abertos" para métricas (ainda em andamento). */
export const OPEN_STATUSES: RequestStatus[] = REQUEST_FLOW.filter(s => s !== 'Concluido');

export const STATUS_LABELS: Record<RequestStatus, string> = {
    Recebido: 'Recebido',
    Triagem: 'Triagem',
    Planejamento: 'Planejamento',
    Producao: 'Produção',
    Aprovacao: 'Em Aprovação',
    Aprovado: 'Aprovado',
    Publicado: 'Publicado',
    Concluido: 'Concluído',
    Reprovado: 'Reprovado',
    Cancelado: 'Cancelado',
};

/** Cores por status (dot do kanban + chips), seguindo o padrão do CRM. */
export const STATUS_DOT: Record<RequestStatus, string> = {
    Recebido: '#6b7280',
    Triagem: '#0ea5e9',
    Planejamento: '#2563eb',
    Producao: '#7c3aed',
    Aprovacao: '#f59e0b',
    Aprovado: '#16a34a',
    Publicado: '#0d9488',
    Concluido: '#059669',
    Reprovado: '#dc2626',
    Cancelado: '#9ca3af',
};

export const STATUS_CHIP: Record<RequestStatus, string> = {
    Recebido: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
    Triagem: 'bg-sky-50 text-sky-600 dark:bg-sky-900/30 dark:text-sky-300',
    Planejamento: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300',
    Producao: 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-300',
    Aprovacao: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300',
    Aprovado: 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-300',
    Publicado: 'bg-teal-50 text-teal-600 dark:bg-teal-900/30 dark:text-teal-300',
    Concluido: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    Reprovado: 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-300',
    Cancelado: 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500',
};

export const SECTORS = ['Marketing', 'Vendas', 'Diretoria', 'Suporte', 'Produção', 'Outro'] as const;

export const DELIVERY_TYPES = ['Post', 'E-mail', 'Peça impressa', 'Landing Page', 'Vídeo', 'Kit de evento', 'Outro'] as const;

export const PRIORITIES: RequestPriority[] = ['Baixa', 'Media', 'Alta'];

export const PRIORITY_LABELS: Record<RequestPriority, string> = {
    Baixa: 'Baixa', Media: 'Média', Alta: 'Alta',
};

export const PRIORITY_CHIP: Record<RequestPriority, string> = {
    Baixa: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
    Media: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300',
    Alta: 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-300',
};

export const APPROVAL_STATUS_CHIP: Record<ApprovalStatus, string> = {
    Rascunho: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
    Enviado: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300',
    Aprovado: 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-300',
    Reprovado: 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-300',
    Ajustes: 'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-300',
};

// ─────────────────────────────────────────────────────────────────────────────
// Constantes de domínio — Fase 2
// ─────────────────────────────────────────────────────────────────────────────

export const TRAFFIC_CHANNELS: TrafficChannel[] = ['Meta', 'Google', 'TikTok', 'Outro'];

/** Chip de canal na tabela de tráfego (cores da marca de cada plataforma). */
export const TRAFFIC_CHANNEL_CHIP: Record<TrafficChannel, string> = {
    Meta: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300',
    Google: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300',
    TikTok: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    Outro: 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-300',
};

export const TRAFFIC_STATUS_CHIP: Record<TrafficPlanStatus, string> = {
    Rascunho: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
    Publicado: 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-300',
};

export const MEETING_WITH_OPTIONS: MeetingWith[] = ['Diretoria', 'Gerencia Comercial', 'Outro'];

/** Valor no banco é sem acento; o rótulo exibido é o correto em PT-BR. */
export const MEETING_WITH_LABELS: Record<MeetingWith, string> = {
    Diretoria: 'Diretoria',
    'Gerencia Comercial': 'Gerência Comercial',
    Outro: 'Outro',
};

export const MEETING_WITH_CHIP: Record<MeetingWith, string> = {
    Diretoria: 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-300',
    'Gerencia Comercial': 'bg-sky-50 text-sky-600 dark:bg-sky-900/30 dark:text-sky-300',
    Outro: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
};

/** Defaults do alerta de turmas (POP 8.4) quando ainda não configurado. */
export const COURSE_ALERT_DEFAULTS = { days: 45, min_pct: 50 } as const;

// ─────────────────────────────────────────────────────────────────────────────
// SLA — POP 8.1
// Regra: +5 dias úteis por padrão; +30 dias corridos quando o tipo de entrega
// é "Kit de evento" OU o título/objetivo menciona "lançamento".
// ─────────────────────────────────────────────────────────────────────────────

const DAY_MS = 86_400_000;

/** Soma N dias úteis (pula sábados e domingos). */
export const addBusinessDays = (from: Date, days: number): Date => {
    const d = new Date(from);
    let remaining = days;
    while (remaining > 0) {
        d.setDate(d.getDate() + 1);
        const dow = d.getDay();
        if (dow !== 0 && dow !== 6) remaining--;
    }
    return d;
};

/** Normaliza acentos para comparação (lançamento → lancamento). */
const normalize = (s?: string | null): string =>
    (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

/** Detecta pedidos de lançamento pelo título/objetivo. */
export const isLaunchLike = (...texts: (string | null | undefined)[]): boolean =>
    texts.some(t => normalize(t).includes('lancamento'));

/**
 * Calcula o vencimento do SLA a partir de agora.
 * Kit de evento ou lançamento → +30 dias corridos; caso contrário → +5 dias úteis.
 * O horário é fixado às 18:00 (fim do expediente).
 */
export const calcSlaDueAt = (
    deliveryType?: string | null,
    title?: string | null,
    objective?: string | null,
    from: Date = new Date(),
): Date => {
    const isBig = deliveryType === 'Kit de evento' || isLaunchLike(title, objective);
    const due = isBig
        ? new Date(from.getTime() + 30 * DAY_MS)
        : addBusinessDays(from, 5);
    due.setHours(18, 0, 0, 0);
    return due;
};

export interface SlaBadge {
    tone: 'green' | 'yellow' | 'red' | 'none';
    label: string;
    /** Dias até o vencimento (negativo = estourado). */
    days: number | null;
}

/** Badge de SLA: verde >2 dias, amarelo <=2 dias, vermelho estourado. */
export const getSlaBadge = (slaDueAt?: string | null): SlaBadge => {
    if (!slaDueAt) return { tone: 'none', label: 'Sem SLA', days: null };
    const due = new Date(slaDueAt).getTime();
    if (Number.isNaN(due)) return { tone: 'none', label: 'Sem SLA', days: null };
    const now = Date.now();
    if (due < now) {
        const late = Math.max(1, Math.ceil((now - due) / DAY_MS));
        return { tone: 'red', label: `Estourado há ${late}d`, days: -late };
    }
    const left = Math.ceil((due - now) / DAY_MS);
    if (left <= 2) return { tone: 'yellow', label: `${left}d restante${left === 1 ? '' : 's'}`, days: left };
    return { tone: 'green', label: `${left}d restantes`, days: left };
};

export const SLA_CHIP: Record<SlaBadge['tone'], string> = {
    green: 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-300',
    yellow: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300',
    red: 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-300 animate-pulse',
    none: 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500',
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers de exibição
// ─────────────────────────────────────────────────────────────────────────────

export const formatDate = (iso?: string | null): string =>
    iso ? new Date(iso).toLocaleDateString('pt-BR') : '—';

export const formatDateTime = (iso?: string | null): string =>
    iso ? new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';

/** "há 5min", "há 2h", "há 3d" — usado no status "aguardando" das aprovações. */
export const timeSince = (iso?: string | null): string => {
    if (!iso) return '—';
    const diff = Date.now() - new Date(iso).getTime();
    if (diff < 0) return 'agora';
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return 'agora';
    if (mins < 60) return `há ${mins}min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `há ${hours}h`;
    const days = Math.floor(hours / 24);
    return `há ${days}d`;
};

/** Converte Date → valor de <input type="date"> (YYYY-MM-DD, fuso local). */
export const toDateInputValue = (d: Date): string => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/** Converte valor de <input type="date"> → ISO às 18:00 locais (fim do expediente). */
export const dateInputToIso = (value: string): string | null => {
    if (!value) return null;
    const d = new Date(`${value}T18:00:00`);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

/** Formata número como moeda BRL ("R$ 1.234,56"); null/inválido → "—". */
export const formatBRL = (value: number | string | null | undefined): string => {
    if (value === null || value === undefined || value === '') return '—';
    const n = Number(value);
    if (Number.isNaN(n)) return '—';
    return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

// ── Helpers de mês (planejamento de tráfego usa coluna `month` = YYYY-MM-01) ──

/** Date → valor de <input type="month"> (YYYY-MM, fuso local). */
export const toMonthInputValue = (d: Date = new Date()): string =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

/** Valor de <input type="month"> → data do banco (primeiro dia do mês). */
export const monthInputToDbDate = (value: string): string => `${value}-01`;

/** Mês anterior ao valor de <input type="month"> (YYYY-MM → YYYY-MM). */
export const prevMonthInput = (value: string): string => {
    const [y, m] = value.split('-').map(Number);
    const d = new Date(y, (m || 1) - 2, 1); // mês é 0-based; -2 volta um mês
    return toMonthInputValue(d);
};

/** "2026-07" ou "2026-07-01" → "julho de 2026" (rótulo humano do mês). */
export const formatMonthLong = (value?: string | null): string => {
    if (!value) return '—';
    const [y, m] = value.split('-').map(Number);
    if (!y || !m) return value;
    return new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
};

/** Nomes de eventos conhecidos da timeline → rótulo PT-BR. */
const EVENT_LABELS: Record<string, string> = {
    pedido_criado: 'Pedido criado',
    status_alterado: 'Status alterado',
    prioridade_alterada: 'Prioridade alterada',
    criado: 'Item criado',
    enviado: 'Enviado ao grupo do WhatsApp',
    reenviado: 'Reenviado ao grupo do WhatsApp',
    aprovado: 'Aprovado',
    reprovado: 'Reprovado',
    ajustes: 'Ajustes solicitados',
    decisao_manual: 'Decisão manual pelo sistema',
};

export const prettyEvent = (event: string): string => {
    if (EVENT_LABELS[event]) return EVENT_LABELS[event];
    const txt = event.replace(/_/g, ' ');
    return txt.charAt(0).toUpperCase() + txt.slice(1);
};

// ─────────────────────────────────────────────────────────────────────────────
// Client da API de Aprovações (rotas Express — contrato fixo com o backend)
// Mesmo padrão das demais telas admin: fetch relativo a /api, sem header extra.
// ─────────────────────────────────────────────────────────────────────────────

export class PopApiError extends Error {
    constructor(message: string, public code?: string, public status?: number) {
        super(message);
        this.name = 'PopApiError';
    }
}

async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
    let res: Response;
    try {
        res = await fetch(path, {
            headers: { 'Content-Type': 'application/json' },
            ...init,
        });
    } catch {
        // Falha de rede (backend fora do ar em dev, por exemplo)
        throw new PopApiError('Não foi possível falar com o servidor.', 'network_error');
    }
    let body: any = null;
    try { body = await res.json(); } catch { /* respostas sem corpo são toleradas */ }
    if (!res.ok) {
        // O backend responde { error: codigo, message?: texto humano }
        const code: string | undefined = body?.error;
        throw new PopApiError(
            (code && API_ERROR_MESSAGES[code]) || body?.message || code || `Erro ${res.status} no servidor.`,
            code,
            res.status,
        );
    }
    return (body ?? {}) as T;
}

/** Mensagens amigáveis para os códigos de erro conhecidos do backend. */
const API_ERROR_MESSAGES: Record<string, string> = {
    settings_missing: 'Configure o grupo do WhatsApp antes de enviar.',
    team_group_missing: 'Configure o grupo do time de Marketing em Aprovações → Configurar grupo.',
    requester_contact_missing: 'O pedido não tem contato do solicitante cadastrado.',
};

export const approvalsApi = {
    getSettings: (): Promise<ApprovalSettings> =>
        apiJson<ApprovalSettings>('/api/approvals/settings'),

    saveSettings: (settings: {
        instance: string;
        group_jid: string;
        group_name: string;
        // Fase 2 — grupo do time + alerta de turmas (opcionais, mesmo endpoint)
        team_group_jid?: string;
        team_group_name?: string;
        course_alert_days?: number;
        course_alert_min_pct?: number;
    }) =>
        apiJson<{ ok?: boolean }>('/api/approvals/settings', {
            method: 'POST',
            body: JSON.stringify(settings),
        }),

    listGroups: async (instance: string): Promise<WhatsAppGroup[]> => {
        const data = await apiJson<{ groups: WhatsAppGroup[] }>(
            `/api/approvals/groups?instance=${encodeURIComponent(instance)}`,
        );
        return data.groups || [];
    },

    /**
     * Upload multi-arquivo com barra de progresso.
     * Usa XMLHttpRequest porque fetch ainda não expõe progresso de upload.
     */
    upload: (files: File[], onProgress?: (pct: number) => void): Promise<ApprovalMedia[]> =>
        new Promise((resolve, reject) => {
            const fd = new FormData();
            files.forEach(f => fd.append('files', f));
            const xhr = new XMLHttpRequest();
            xhr.open('POST', '/api/approvals/upload');
            xhr.upload.onprogress = (e) => {
                if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
            };
            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        const body = JSON.parse(xhr.responseText || '{}');
                        resolve(body.files || []);
                    } catch {
                        reject(new PopApiError('Resposta inválida do upload.', 'bad_response', xhr.status));
                    }
                } else {
                    let code: string | undefined;
                    try { code = JSON.parse(xhr.responseText || '{}').error; } catch { /* corpo não-JSON */ }
                    reject(new PopApiError(code || `Falha no upload (${xhr.status}).`, code, xhr.status));
                }
            };
            xhr.onerror = () => reject(new PopApiError('Falha de rede no upload.', 'network_error'));
            xhr.send(fd);
        }),

    create: async (payload: {
        title: string;
        description?: string;
        media: ApprovalMedia[];
        request_id?: string | null;
        created_by?: string;
    }): Promise<ApprovalItem> => {
        const data = await apiJson<{ item: ApprovalItem }>('/api/approvals', {
            method: 'POST',
            body: JSON.stringify(payload),
        });
        return data.item;
    },

    list: async (status?: string, limit = 50): Promise<ApprovalItem[]> => {
        const params = new URLSearchParams();
        if (status) params.set('status', status);
        if (limit) params.set('limit', String(limit));
        const qs = params.toString();
        const data = await apiJson<{ items: ApprovalItem[] }>(`/api/approvals${qs ? `?${qs}` : ''}`);
        return data.items || [];
    },

    events: async (itemId: number): Promise<ApprovalEvent[]> => {
        const data = await apiJson<{ events: ApprovalEvent[] }>(`/api/approvals/${itemId}/events`);
        return data.events || [];
    },

    decide: (itemId: number, decision: 'Aprovado' | 'Reprovado', note: string, actor: string) =>
        apiJson<{ ok?: boolean }>(`/api/approvals/${itemId}/decide`, {
            method: 'POST',
            body: JSON.stringify({ decision, note: note || undefined, actor }),
        }),

    resend: (itemId: number) =>
        apiJson<{ ok?: boolean }>(`/api/approvals/${itemId}/resend`, { method: 'POST' }),
};

// ─────────────────────────────────────────────────────────────────────────────
// Client das rotas /api/marketing/* — Fase 2 (contrato fixo com o backend)
// ─────────────────────────────────────────────────────────────────────────────

export const marketingApi = {
    /**
     * Compartilha um registro no WhatsApp.
     *  - target 'team' (default): grupo do time de Marketing → 409 team_group_missing
     *  - target 'requester' (só campaign_result): contato do solicitante → 409 requester_contact_missing
     */
    share: (payload: { type: ShareType; id: string; target?: ShareTarget }) =>
        apiJson<{ ok?: boolean }>('/api/marketing/share', {
            method: 'POST',
            body: JSON.stringify(payload),
        }),

    /** Ocupação das próximas turmas (alerta POP 8.4) — usado no Painel ao Vivo. */
    courseOccupancy: () =>
        apiJson<CourseOccupancyResponse>('/api/marketing/course-occupancy'),
};
