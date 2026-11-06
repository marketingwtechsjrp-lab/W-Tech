/**
 * Vendas manuais e relatório da promoção da Vacuum Pump.
 *
 * Fica fora de vacuumOffer.ts porque aquele arquivo vai para a página pública. Aqui só
 * entram tipos e cálculos usados pelo servidor, pela tela de pedidos e pelo PDF, para os
 * três contarem as vendas do mesmo jeito.
 */

export const VACUUM_MACHINE_ITEM = 'vacuum_pump_standard';

/** Mesma lista que o painel e o lote usam: só isto conta como venda. */
export const VACUUM_PAID_STATUSES = ['paid', 'approved', 'producing', 'shipped', 'delivered'];

/** Equipe da promoção. `name` é o nome em SITE_Users; `label` é como o time chama. */
export const VACUUM_SELLERS = [
    { name: 'Michael', label: 'Michael' },
    { name: 'Emerson', label: 'Emerson' },
    { name: 'Christopher', label: 'Cris (Christopher)' },
    { name: 'Andre', label: 'André' },
] as const;

export const VACUUM_PAYMENTS = [
    { id: 'pix', label: 'Pix' },
    { id: 'credit', label: 'Cartão de crédito' },
    { id: 'debit', label: 'Cartão de débito' },
    { id: 'boleto', label: 'Boleto' },
    { id: 'transfer', label: 'Transferência' },
    { id: 'cash', label: 'Dinheiro' },
    { id: 'link', label: 'Link de pagamento' },
] as const;

export type VacuumPaymentId = (typeof VACUUM_PAYMENTS)[number]['id'];

export const VACUUM_MAX_INSTALLMENTS = 12;

/** Texto gravado em payment_method. O prefixo separa do "Pix" do site no painel da TV. */
export function vacuumManualPaymentLabel(payment: VacuumPaymentId, installments: number): string {
    if (payment === 'credit') return `Manual - Cartão ${installments}x`;
    const found = VACUUM_PAYMENTS.find((item) => item.id === payment);
    return `Manual - ${found?.label ?? 'Outro'}`;
}

/** "Mercado Pago - Pix" e "Manual - Pix" viram "Pix" nas telas em que a origem já aparece. */
export function vacuumPaymentShort(method: string | null | undefined): string {
    return String(method || '-').replace(/^(Mercado Pago|Manual) - /, '');
}

/** Itens em poucas palavras, para caber em uma linha de lista ou de relatório. */
export function vacuumItemsShort(items: { id: string; name: string }[]): string {
    return items.map((item) => (item.id === VACUUM_MACHINE_ITEM ? 'Máquina' : item.name.replace(/ W-Tech$/, ''))).join(' + ') || 'Máquina';
}

export interface VacuumSeller {
    id: string;
    name: string;
    label: string;
}

export interface VacuumSaleItem {
    id: string;
    name: string;
    price: number;
    quantity: number;
}

/** O que a venda manual precisa guardar e não tem coluna própria em SITE_Sales. */
export interface VacuumManualMeta {
    payment: VacuumPaymentId;
    installments: number;
    document: string | null;
    complement: string | null;
    note: string | null;
    launched_by: { id: string; name: string };
    launched_at: string;
    updated_by?: { id: string; name: string };
    updated_at?: string;
}

export interface VacuumSaleRow {
    id: string;
    order_number: string | null;
    status: string;
    payment_status: string | null;
    payment_method: string | null;
    channel: string | null;
    total_value: number;
    shipping_cost: number;
    customer_name: string;
    customer_phone: string | null;
    customer_email: string | null;
    seller_id: string | null;
    seller_name: string | null;
    sale_date: string | null;
    created_at: string;
    items: VacuumSaleItem[];
    delivery_cep: string | null;
    delivery_street: string | null;
    delivery_number: string | null;
    delivery_neighborhood: string | null;
    delivery_city: string | null;
    delivery_state: string | null;
    estimated_delivery_date: string | null;
    notes: string | null;
    /** Preenchido só em venda lançada à mão. É o que libera editar e cancelar por aqui. */
    manual_sale: VacuumManualMeta | null;
}

export interface VacuumSalesPayload {
    now: number;
    can_manage: boolean;
    can_launch: boolean;
    offer: {
        phase: string;
        price: number;
        remaining: number;
        machine_name: string;
        bumps: { id: string; name: string; price: number }[];
    };
    sellers: VacuumSeller[];
    sales: VacuumSaleRow[];
}

/** Dia da venda no horário de Brasília. Venda lançada depois guarda o dia real em sale_date. */
export function vacuumSaleDay(sale: Pick<VacuumSaleRow, 'sale_date' | 'created_at'>): string {
    if (sale.sale_date && /^\d{4}-\d{2}-\d{2}/.test(sale.sale_date)) return sale.sale_date.slice(0, 10);
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date(sale.created_at));
}

export function vacuumDayLabel(day: string): string {
    const [year, month, date] = day.split('-');
    return `${date}/${month}/${year}`;
}

export function isVacuumSalePaid(status: string): boolean {
    return VACUUM_PAID_STATUSES.includes(status);
}

export const VACUUM_DIRECT_KEY = 'direct';
export const VACUUM_DIRECT_LABEL = 'Direto no site';

export interface VacuumReportFilter {
    /** Primeiro e último dia, inclusive. Vazio não limita. */
    from?: string;
    to?: string;
    /** `VACUUM_DIRECT_KEY`, o id de um vendedor, ou vazio para todos. */
    sellerKey?: string;
}

export interface VacuumReportGroup {
    key: string;
    name: string;
    machines: number;
    manual: number;
    site: number;
    accessories: number;
    revenue: number;
    ticket: number;
    /** Parte do faturamento do período, de 0 a 100. */
    share: number;
    sales: VacuumSaleRow[];
}

export interface VacuumReport {
    groups: VacuumReportGroup[];
    totals: { machines: number; manual: number; site: number; accessories: number; revenue: number; ticket: number };
    /** Lançadas sem pagamento confirmado: aparecem à parte e não somam. */
    pending: VacuumSaleRow[];
    cancelled: number;
}

export function vacuumSellerKey(sale: Pick<VacuumSaleRow, 'seller_id'>): string {
    return sale.seller_id || VACUUM_DIRECT_KEY;
}

/**
 * Relatório por vendedor. Cada venda é uma máquina, como no painel da TV e no lote, para os
 * números baterem. Os vendedores da equipe aparecem mesmo zerados: quem não vendeu também
 * é informação para o gestor.
 */
export function buildVacuumReport(sales: VacuumSaleRow[], sellers: VacuumSeller[], filter: VacuumReportFilter = {}): VacuumReport {
    const inFilter = sales.filter((sale) => {
        const day = vacuumSaleDay(sale);
        if (filter.from && day < filter.from) return false;
        if (filter.to && day > filter.to) return false;
        return !filter.sellerKey || vacuumSellerKey(sale) === filter.sellerKey;
    });

    const labels = new Map(sellers.map((seller) => [seller.id, seller.label]));
    const groups = new Map<string, VacuumReportGroup>();
    const groupOf = (key: string, name: string) => {
        let group = groups.get(key);
        if (!group) {
            group = { key, name, machines: 0, manual: 0, site: 0, accessories: 0, revenue: 0, ticket: 0, share: 0, sales: [] };
            groups.set(key, group);
        }
        return group;
    };

    for (const seller of sellers) {
        if (!filter.sellerKey || filter.sellerKey === seller.id) groupOf(seller.id, seller.label);
    }

    const paid = inFilter.filter((sale) => isVacuumSalePaid(sale.status));
    for (const sale of paid) {
        const key = vacuumSellerKey(sale);
        const name = key === VACUUM_DIRECT_KEY ? VACUUM_DIRECT_LABEL : labels.get(key) ?? sale.seller_name ?? 'Sem nome';
        const group = groupOf(key, name);
        group.machines += 1;
        group[sale.manual_sale ? 'manual' : 'site'] += 1;
        group.accessories += sale.items.filter((item) => item.id !== VACUUM_MACHINE_ITEM).length;
        group.revenue += Number(sale.total_value) || 0;
        group.sales.push(sale);
    }

    const revenue = paid.reduce((sum, sale) => sum + (Number(sale.total_value) || 0), 0);
    const list = [...groups.values()];
    for (const group of list) {
        group.ticket = group.machines > 0 ? group.revenue / group.machines : 0;
        group.share = revenue > 0 ? (group.revenue / revenue) * 100 : 0;
        group.sales.sort((a, b) => (vacuumSaleDay(a) + a.created_at).localeCompare(vacuumSaleDay(b) + b.created_at));
    }
    // Quem vendeu mais vem primeiro; a venda direta do site fecha a lista, porque não é de ninguém.
    list.sort((a, b) => Number(a.key === VACUUM_DIRECT_KEY) - Number(b.key === VACUUM_DIRECT_KEY) || b.revenue - a.revenue || a.name.localeCompare(b.name));

    const sum = (pick: (group: VacuumReportGroup) => number) => list.reduce((total, group) => total + pick(group), 0);
    return {
        groups: list,
        totals: {
            machines: paid.length,
            manual: sum((group) => group.manual),
            site: sum((group) => group.site),
            accessories: sum((group) => group.accessories),
            revenue,
            ticket: paid.length > 0 ? revenue / paid.length : 0,
        },
        pending: inFilter.filter((sale) => ['pending', 'negotiation'].includes(sale.status)),
        cancelled: inFilter.filter((sale) => sale.status === 'cancelled').length,
    };
}
