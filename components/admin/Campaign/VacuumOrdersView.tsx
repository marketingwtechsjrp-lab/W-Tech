import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, Download, Loader2, Plus, Printer, RefreshCcw, Search, Trophy } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import {
    VACUUM_DIRECT_KEY,
    VACUUM_DIRECT_LABEL,
    buildVacuumReport,
    isVacuumSalePaid,
    vacuumDayLabel,
    vacuumItemsShort,
    vacuumPaymentShort,
    vacuumSaleDay,
    vacuumSellerKey,
    type VacuumSaleRow,
    type VacuumSalesPayload,
} from '../../../lib/vacuumSales';
import VacuumSaleForm, { vacuumInputCls } from './VacuumSaleForm';

/** Pedidos da promoção: lista, lançamento manual e relatório por vendedor com PDF. */

const API = '/api/vacuum-pump';

const brl = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
const todaySP = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());

const STATUS: Record<string, { label: string; className: string }> = {
    paid: { label: 'Pago', className: 'bg-[var(--admin-success-muted)] text-[var(--admin-success)]' },
    approved: { label: 'Pago', className: 'bg-[var(--admin-success-muted)] text-[var(--admin-success)]' },
    producing: { label: 'Em produção', className: 'bg-[var(--admin-info-muted)] text-[var(--admin-info)]' },
    shipped: { label: 'Enviado', className: 'bg-[var(--admin-info-muted)] text-[var(--admin-info)]' },
    delivered: { label: 'Entregue', className: 'bg-[var(--admin-info-muted)] text-[var(--admin-info)]' },
    pending: { label: 'Aguardando', className: 'bg-[var(--admin-warning-muted)] text-[var(--admin-warning)]' },
    negotiation: { label: 'Aguardando', className: 'bg-[var(--admin-warning-muted)] text-[var(--admin-warning)]' },
    cancelled: { label: 'Cancelado', className: 'bg-[var(--admin-danger-muted)] text-[var(--admin-danger)]' },
};

const originNote = (manual: number, site: number) => `${manual} ${manual === 1 ? 'manual' : 'manuais'} · ${site} no site`;
const statusGroup = (status: string) => (isVacuumSalePaid(status) ? 'paid' : status === 'cancelled' ? 'cancelled' : 'pending');

const Stat: React.FC<{ label: string; value: string; note?: string }> = ({ label, value, note }) => (
    <div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface-1)] p-4">
        <p className="text-[10px] font-black uppercase tracking-widest text-[var(--admin-text-tertiary)]">{label}</p>
        <p className="mt-1 text-2xl font-black tabular-nums text-[var(--admin-text-primary)]">{value}</p>
        {note && <p className="mt-0.5 text-xs text-[var(--admin-text-secondary)]">{note}</p>}
    </div>
);

const Detail: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
    <div>
        <dt className="text-[10px] font-black uppercase tracking-widest text-[var(--admin-text-tertiary)]">{label}</dt>
        <dd className="mt-0.5 break-words text-sm text-[var(--admin-text-primary)]">{value || '-'}</dd>
    </div>
);

const SaleRow: React.FC<{
    sale: VacuumSaleRow;
    sellerLabel: string;
    canManage: boolean;
    busy: boolean;
    onEdit: (sale: VacuumSaleRow) => void;
    onStatus: (sale: VacuumSaleRow, status: 'paid' | 'pending' | 'cancelled') => void;
}> = ({ sale, sellerLabel, canManage, busy, onEdit, onStatus }) => {
    const [open, setOpen] = useState(false);
    const status = STATUS[sale.status] ?? { label: sale.status, className: 'bg-[var(--admin-surface-3)] text-[var(--admin-text-secondary)]' };
    const place = [sale.delivery_city, sale.delivery_state].filter(Boolean).join('/');
    const manual = sale.manual_sale;
    const address = [sale.delivery_street, sale.delivery_number, manual?.complement, sale.delivery_neighborhood, place, sale.delivery_cep].filter(Boolean).join(', ');
    return (
        <li className={`border-b border-[var(--admin-border)] last:border-0 ${sale.status === 'cancelled' ? 'opacity-60' : ''}`}>
            <button
                type="button"
                onClick={() => setOpen(!open)}
                aria-expanded={open}
                className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 px-4 py-3 text-left transition-colors hover:bg-[var(--admin-surface-2)] lg:grid-cols-[150px_minmax(0,1.3fr)_minmax(0,1.1fr)_120px_110px_100px_96px_18px]"
            >
                <span className="text-sm">
                    <b className="block font-mono text-xs text-[var(--admin-text-primary)]">{sale.order_number || '-'}</b>
                    <span className="text-xs text-[var(--admin-text-secondary)]">{vacuumDayLabel(vacuumSaleDay(sale))}</span>
                </span>
                <span className="order-3 col-span-2 min-w-0 lg:order-none lg:col-span-1">
                    <b className="block truncate text-sm text-[var(--admin-text-primary)]">{sale.customer_name}</b>
                    <span className="block truncate text-xs text-[var(--admin-text-secondary)]">{place || 'Cidade não informada'}</span>
                </span>
                <span className="order-4 col-span-2 truncate text-xs text-[var(--admin-text-secondary)] lg:order-none lg:col-span-1">{vacuumItemsShort(sale.items)}</span>
                <span className="order-5 truncate text-sm font-semibold text-[var(--admin-text-primary)] lg:order-none">{sellerLabel}</span>
                <span className="order-7 col-span-2 text-xs text-[var(--admin-text-secondary)] lg:order-none lg:col-span-1">
                    {vacuumPaymentShort(sale.payment_method)}
                    <span className={`ml-1 rounded px-1 py-0.5 text-[10px] font-black uppercase ${manual ? 'bg-wtech-gold/15 text-yellow-700 dark:text-wtech-gold' : 'bg-[var(--admin-surface-3)] text-[var(--admin-text-secondary)]'}`}>
                        {manual ? 'Manual' : 'Site'}
                    </span>
                </span>
                <b className="order-2 text-right text-sm tabular-nums text-[var(--admin-text-primary)] lg:order-none">{brl(sale.total_value)}</b>
                <span className={`order-6 w-fit justify-self-end rounded-full px-2.5 py-1 text-[11px] font-black lg:order-none lg:justify-self-start ${status.className}`}>{status.label}</span>
                <ChevronDown size={16} aria-hidden className={`order-8 hidden text-[var(--admin-text-tertiary)] transition-transform lg:block ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
                <div className="space-y-3 bg-[var(--admin-surface-2)] px-4 py-4">
                    <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <Detail label="WhatsApp" value={sale.customer_phone} />
                        <Detail label="E-mail" value={sale.customer_email} />
                        <Detail label="CPF ou CNPJ" value={manual ? manual.document : 'Ver nas observações'} />
                        <Detail label="Entrega até" value={sale.estimated_delivery_date ? vacuumDayLabel(sale.estimated_delivery_date.slice(0, 10)) : null} />
                        <Detail label="Itens" value={sale.items.map((item) => `${item.name}: ${brl(item.price)}`).join(' · ')} />
                        <Detail label="Frete" value={sale.shipping_cost > 0 ? brl(sale.shipping_cost) : 'Grátis ou a combinar'} />
                        <Detail label="Endereço" value={address} />
                        <Detail
                            label={manual ? 'Lançada por' : 'Observações'}
                            value={manual ? `${manual.launched_by.name}${manual.updated_by ? `, editada por ${manual.updated_by.name}` : ''}` : sale.notes}
                        />
                        {manual?.note && <Detail label="Observações" value={manual.note} />}
                    </dl>
                    {canManage && manual && (
                        <div className="flex flex-wrap gap-2">
                            {sale.status !== 'cancelled' && (
                                <button type="button" onClick={() => onEdit(sale)} className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-1)] px-3 py-2 text-xs font-bold text-[var(--admin-text-primary)]">
                                    Editar
                                </button>
                            )}
                            {sale.status === 'pending' && (
                                <button type="button" disabled={busy} onClick={() => onStatus(sale, 'paid')} className="rounded-lg bg-[var(--admin-success)] px-3 py-2 text-xs font-bold text-white disabled:opacity-60">
                                    Marcar como pago
                                </button>
                            )}
                            {sale.status === 'cancelled' ? (
                                <button type="button" disabled={busy} onClick={() => onStatus(sale, 'pending')} className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-1)] px-3 py-2 text-xs font-bold text-[var(--admin-text-primary)] disabled:opacity-60">
                                    Reativar como aguardando
                                </button>
                            ) : !['shipped', 'delivered'].includes(sale.status) && (
                                <button type="button" disabled={busy} onClick={() => onStatus(sale, 'cancelled')} className="rounded-lg border border-[var(--admin-danger)] px-3 py-2 text-xs font-bold text-[var(--admin-danger)] disabled:opacity-60">
                                    Cancelar venda
                                </button>
                            )}
                        </div>
                    )}
                    {!manual && <p className="text-xs text-[var(--admin-text-secondary)]">Venda feita pelo site: o pagamento está no Mercado Pago, e o estorno de lá é que a cancela.</p>}
                </div>
            )}
        </li>
    );
};

const VacuumOrdersView: React.FC<{ onOpenPanel?: () => void }> = ({ onOpenPanel }) => {
    const { user } = useAuth();
    const [payload, setPayload] = useState<VacuumSalesPayload | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [notice, setNotice] = useState('');
    const [tab, setTab] = useState<'orders' | 'report'>('orders');
    const [form, setForm] = useState<{ sale: VacuumSaleRow | null } | null>(null);
    const [busyId, setBusyId] = useState<string | null>(null);

    const [search, setSearch] = useState('');
    const [sellerFilter, setSellerFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [originFilter, setOriginFilter] = useState('');

    const [period, setPeriod] = useState<'campaign' | 'today' | 'custom'>('campaign');
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [reportSeller, setReportSeller] = useState('');
    const [pdfBusy, setPdfBusy] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API}?action=sales`, { credentials: 'include', cache: 'no-store' });
            if (response.status === 401 || response.status === 403) throw new Error('Sua sessão expirou ou este usuário não tem acesso aos pedidos da promoção.');
            if (!response.ok) throw new Error('Não foi possível carregar os pedidos agora.');
            setPayload((await response.json()) as VacuumSalesPayload);
            setLoadError('');
        } catch (err) {
            setLoadError(err instanceof Error ? err.message : 'Não foi possível carregar os pedidos agora.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    const sellers = useMemo(() => payload?.sellers ?? [], [payload]);
    const sales = useMemo(() => payload?.sales ?? [], [payload]);
    const labelOf = useCallback(
        (sale: VacuumSaleRow) => (sale.seller_id ? sellers.find((seller) => seller.id === sale.seller_id)?.label ?? sale.seller_name ?? 'Sem nome' : VACUUM_DIRECT_LABEL),
        [sellers]
    );

    /** Quem vendeu sem estar na equipe da promoção também entra nos filtros. */
    const sellerOptions = useMemo(() => {
        const options = new Map(sellers.map((seller) => [seller.id, seller.label]));
        for (const sale of sales) {
            if (sale.seller_id && !options.has(sale.seller_id)) options.set(sale.seller_id, labelOf(sale));
        }
        return [...options.entries()];
    }, [sellers, sales, labelOf]);

    const visible = useMemo(() => {
        const term = search.trim().toLowerCase();
        const digits = term.replace(/\D/g, '');
        return sales.filter((sale) => {
            if (sellerFilter && vacuumSellerKey(sale) !== sellerFilter) return false;
            if (statusFilter && statusGroup(sale.status) !== statusFilter) return false;
            if (originFilter && (sale.manual_sale ? 'manual' : 'site') !== originFilter) return false;
            if (!term) return true;
            return (
                [sale.customer_name, sale.order_number, sale.customer_email, sale.delivery_city].some((value) => String(value ?? '').toLowerCase().includes(term)) ||
                (digits.length >= 4 && String(sale.customer_phone ?? '').includes(digits))
            );
        });
    }, [sales, search, sellerFilter, statusFilter, originFilter]);

    const overall = useMemo(() => buildVacuumReport(sales, sellers), [sales, sellers]);

    const reportRange = useMemo(() => {
        if (period === 'today') return { from: todaySP(), to: todaySP() };
        if (period === 'custom') return { from: from || undefined, to: to || undefined };
        return {};
    }, [period, from, to]);
    const report = useMemo(() => buildVacuumReport(sales, sellers, { ...reportRange, sellerKey: reportSeller || undefined }), [sales, sellers, reportRange, reportSeller]);

    const periodLabel = useMemo(() => {
        if (period === 'today') return `Hoje, ${vacuumDayLabel(todaySP())}`;
        if (period === 'custom' && (from || to)) {
            if (from && to) return `${vacuumDayLabel(from)} a ${vacuumDayLabel(to)}`;
            return from ? `A partir de ${vacuumDayLabel(from)}` : `Até ${vacuumDayLabel(to)}`;
        }
        return 'Campanha inteira';
    }, [period, from, to]);

    const reportSellerLabel = reportSeller === VACUUM_DIRECT_KEY ? VACUUM_DIRECT_LABEL : sellerOptions.find(([id]) => id === reportSeller)?.[1] ?? 'Todos';

    const exportPdf = async (mode: 'download' | 'print') => {
        setPdfBusy(true);
        try {
            const pdf = await import('../../../lib/vacuumSalesPdf');
            const meta = { periodLabel, sellerLabel: reportSellerLabel, generatedBy: user?.name || 'Equipe W-Tech', generatedAt: new Date() };
            if (mode === 'download') pdf.downloadVacuumReportPdf(report, meta);
            else pdf.printVacuumReportPdf(report, meta);
        } catch (err) {
            console.error('[Vacuum] Falha ao gerar o PDF:', err);
            setNotice('Não foi possível gerar o PDF. Tente de novo.');
        } finally {
            setPdfBusy(false);
        }
    };

    const changeStatus = async (sale: VacuumSaleRow, status: 'paid' | 'pending' | 'cancelled') => {
        const question = status === 'cancelled'
            ? `Cancelar a venda ${sale.order_number} de ${sale.customer_name}? Ela sai do placar e do relatório e a máquina volta para o lote.`
            : status === 'paid'
                ? `Confirmar o pagamento da venda ${sale.order_number}? Ela entra no placar e no relatório.`
                : `Reativar a venda ${sale.order_number} como aguardando pagamento?`;
        if (!window.confirm(question)) return;
        setBusyId(sale.id);
        try {
            const response = await fetch(`${API}?action=sale_status`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: sale.id, status }),
            });
            const result = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(result.error || 'Não foi possível mudar a situação.');
            setNotice(`Pedido ${sale.order_number} atualizado.`);
            await load();
        } catch (err) {
            setNotice(err instanceof Error ? err.message : 'Não foi possível mudar a situação.');
        } finally {
            setBusyId(null);
        }
    };

    if (!payload && loading) {
        return <p className="flex items-center gap-2 p-6 text-sm text-[var(--admin-text-secondary)]"><Loader2 size={16} className="animate-spin" aria-hidden /> Carregando os pedidos...</p>;
    }
    if (!payload) {
        return (
            <div className="p-6">
                <p role="alert" className="mb-3 text-sm font-semibold text-[var(--admin-danger)]">{loadError}</p>
                <button type="button" onClick={() => void load()} className="rounded-xl border border-[var(--admin-border)] px-4 py-2 text-sm font-bold text-[var(--admin-text-primary)]">Tentar de novo</button>
            </div>
        );
    }

    const tabCls = (active: boolean) =>
        `rounded-lg px-4 py-2 text-sm font-bold transition-colors ${active ? 'bg-[var(--admin-surface-1)] text-[var(--admin-text-primary)] shadow-sm' : 'text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)]'}`;

    return (
        <div className="space-y-4">
            <header className="flex flex-wrap items-center gap-3">
                <div className="mr-auto">
                    <h1 className="text-2xl font-black text-[var(--admin-text-primary)]">Pedidos da promoção</h1>
                    <p className="text-sm text-[var(--admin-text-secondary)]">Vacuum Pump Standard · Black Friday</p>
                </div>
                {onOpenPanel && (
                    <button type="button" onClick={onOpenPanel} className="flex items-center gap-2 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-1)] px-3 py-2.5 text-sm font-bold text-[var(--admin-text-primary)]">
                        <Trophy size={16} aria-hidden /> Painel ao vivo
                    </button>
                )}
                <button type="button" onClick={() => void load()} disabled={loading} aria-label="Atualizar" className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-1)] p-2.5 text-[var(--admin-text-secondary)] disabled:opacity-60">
                    <RefreshCcw size={18} aria-hidden className={loading ? 'animate-spin' : ''} />
                </button>
                {payload.can_manage && (
                    <button type="button" onClick={() => setForm({ sale: null })} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-wtech-gold to-yellow-600 px-4 py-2.5 text-sm font-black text-black shadow-md shadow-yellow-500/20">
                        <Plus size={16} strokeWidth={3} aria-hidden /> Lançar venda
                    </button>
                )}
            </header>

            {notice && (
                <p role="status" className="flex items-center justify-between gap-3 rounded-xl bg-[var(--admin-info-muted)] px-4 py-2.5 text-sm font-semibold text-[var(--admin-text-primary)]">
                    {notice}
                    <button type="button" onClick={() => setNotice('')} className="text-xs font-bold text-[var(--admin-text-secondary)]">Fechar</button>
                </p>
            )}
            {loadError && <p role="alert" className="text-sm font-semibold text-[var(--admin-danger)]">{loadError}</p>}

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Stat label="Máquinas vendidas" value={String(overall.totals.machines)} note={originNote(overall.totals.manual, overall.totals.site)} />
                <Stat label="Faturamento" value={brl(overall.totals.revenue)} note={`Ticket médio ${brl(overall.totals.ticket)}`} />
                <Stat label="Aguardando pagamento" value={String(overall.pending.length)} note={brl(overall.pending.reduce((sum, sale) => sum + sale.total_value, 0))} />
                <Stat label="Disponíveis na pré-venda" value={String(payload.offer.remaining)} note={`Preço atual ${brl(payload.offer.price)}`} />
            </div>

            <div role="tablist" className="inline-flex rounded-xl bg-[var(--admin-surface-3)] p-1">
                <button type="button" role="tab" aria-selected={tab === 'orders'} onClick={() => setTab('orders')} className={tabCls(tab === 'orders')}>Pedidos ({sales.length})</button>
                <button type="button" role="tab" aria-selected={tab === 'report'} onClick={() => setTab('report')} className={tabCls(tab === 'report')}>Relatório por vendedor</button>
            </div>

            {tab === 'orders' ? (
                <>
                    <div className="grid gap-2 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface-1)] p-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_190px_170px_140px]">
                        <label className="relative block">
                            <span className="sr-only">Buscar pedido</span>
                            <Search size={16} aria-hidden className="absolute left-3 top-3 text-[var(--admin-text-tertiary)]" />
                            <input type="search" className={`${vacuumInputCls} pl-9`} placeholder="Cliente, pedido, WhatsApp ou cidade" value={search} onChange={(e) => setSearch(e.target.value)} />
                        </label>
                        <select aria-label="Filtrar por vendedor" className={vacuumInputCls} value={sellerFilter} onChange={(e) => setSellerFilter(e.target.value)}>
                            <option value="">Todos os vendedores</option>
                            {sellerOptions.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
                            <option value={VACUUM_DIRECT_KEY}>{VACUUM_DIRECT_LABEL}</option>
                        </select>
                        <select aria-label="Filtrar por situação" className={vacuumInputCls} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                            <option value="">Todas as situações</option>
                            <option value="paid">Pagos</option>
                            <option value="pending">Aguardando</option>
                            <option value="cancelled">Cancelados</option>
                        </select>
                        <select aria-label="Filtrar por origem" className={vacuumInputCls} value={originFilter} onChange={(e) => setOriginFilter(e.target.value)}>
                            <option value="">Toda origem</option>
                            <option value="manual">Manual</option>
                            <option value="site">Site</option>
                        </select>
                    </div>

                    <div className="overflow-hidden rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface-1)]">
                        <div aria-hidden className="hidden grid-cols-[150px_minmax(0,1.3fr)_minmax(0,1.1fr)_120px_110px_100px_96px_18px] gap-x-4 border-b border-[var(--admin-border)] px-4 py-2 text-[10px] font-black uppercase tracking-widest text-[var(--admin-text-tertiary)] lg:grid">
                            <span>Pedido</span><span>Cliente</span><span>Itens</span><span>Vendedor</span><span>Pagamento</span><span className="text-right">Total</span><span>Situação</span><span />
                        </div>
                        {visible.length ? (
                            <ul>
                                {visible.map((sale) => (
                                    <SaleRow
                                        key={sale.id}
                                        sale={sale}
                                        sellerLabel={labelOf(sale)}
                                        canManage={payload.can_manage}
                                        busy={busyId === sale.id}
                                        onEdit={(row) => setForm({ sale: row })}
                                        onStatus={changeStatus}
                                    />
                                ))}
                            </ul>
                        ) : (
                            <p className="p-8 text-center text-sm text-[var(--admin-text-secondary)]">
                                {sales.length ? 'Nenhum pedido com estes filtros.' : 'Nenhum pedido ainda. A primeira venda aparece aqui.'}
                            </p>
                        )}
                    </div>
                </>
            ) : (
                <>
                    <div className="flex flex-wrap items-end gap-2 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface-1)] p-3">
                        <label className="block w-full sm:w-44">
                            <span className="mb-1 block text-xs font-bold text-[var(--admin-text-secondary)]">Período</span>
                            <select className={vacuumInputCls} value={period} onChange={(e) => setPeriod(e.target.value as typeof period)}>
                                <option value="campaign">Campanha inteira</option>
                                <option value="today">Hoje</option>
                                <option value="custom">Escolher datas</option>
                            </select>
                        </label>
                        {period === 'custom' && (
                            <>
                                <label className="block w-[calc(50%-4px)] sm:w-40">
                                    <span className="mb-1 block text-xs font-bold text-[var(--admin-text-secondary)]">De</span>
                                    <input type="date" className={vacuumInputCls} value={from} onChange={(e) => setFrom(e.target.value)} />
                                </label>
                                <label className="block w-[calc(50%-4px)] sm:w-40">
                                    <span className="mb-1 block text-xs font-bold text-[var(--admin-text-secondary)]">Até</span>
                                    <input type="date" className={vacuumInputCls} value={to} onChange={(e) => setTo(e.target.value)} />
                                </label>
                            </>
                        )}
                        <label className="block w-full sm:w-52">
                            <span className="mb-1 block text-xs font-bold text-[var(--admin-text-secondary)]">Vendedor</span>
                            <select className={vacuumInputCls} value={reportSeller} onChange={(e) => setReportSeller(e.target.value)}>
                                <option value="">Todos</option>
                                {sellerOptions.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
                                <option value={VACUUM_DIRECT_KEY}>{VACUUM_DIRECT_LABEL}</option>
                            </select>
                        </label>
                        <div className="flex w-full gap-2 sm:ml-auto sm:w-auto">
                            <button type="button" disabled={pdfBusy} onClick={() => void exportPdf('download')} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-4 py-2.5 text-sm font-bold text-[var(--admin-text-primary)] disabled:opacity-60 sm:flex-none">
                                <Download size={16} aria-hidden /> Baixar PDF
                            </button>
                            <button type="button" disabled={pdfBusy} onClick={() => void exportPdf('print')} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-wtech-gold to-yellow-600 px-4 py-2.5 text-sm font-black text-black disabled:opacity-60 sm:flex-none">
                                <Printer size={16} aria-hidden /> Imprimir
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                        <Stat label="Máquinas no período" value={String(report.totals.machines)} note={originNote(report.totals.manual, report.totals.site)} />
                        <Stat label="Faturamento" value={brl(report.totals.revenue)} />
                        <Stat label="Ticket médio" value={brl(report.totals.ticket)} />
                        <Stat label="Acessórios" value={String(report.totals.accessories)} />
                    </div>

                    <div className="overflow-x-auto rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface-1)]">
                        <table className="w-full min-w-[640px] text-sm text-[var(--admin-text-primary)]">
                            <caption className="sr-only">Resumo de vendas por vendedor em {periodLabel}</caption>
                            <thead>
                                <tr className="border-b border-[var(--admin-border)] text-left text-[10px] font-black uppercase tracking-widest text-[var(--admin-text-tertiary)]">
                                    <th scope="col" className="px-4 py-2.5">Vendedor</th>
                                    <th scope="col" className="px-3 py-2.5 text-center">Máquinas</th>
                                    <th scope="col" className="px-3 py-2.5 text-center">Manuais</th>
                                    <th scope="col" className="px-3 py-2.5 text-center">Site</th>
                                    <th scope="col" className="px-3 py-2.5 text-center">Acessórios</th>
                                    <th scope="col" className="px-3 py-2.5 text-right">Faturamento</th>
                                    <th scope="col" className="px-3 py-2.5 text-right">Ticket médio</th>
                                    <th scope="col" className="px-4 py-2.5 text-right">% do total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {report.groups.map((group) => (
                                    <tr key={group.key} className="border-b border-[var(--admin-border)] last:border-0">
                                        <th scope="row" className="px-4 py-2.5 text-left font-bold">{group.name}</th>
                                        <td className="px-3 py-2.5 text-center font-black tabular-nums">{group.machines}</td>
                                        <td className="px-3 py-2.5 text-center tabular-nums">{group.manual}</td>
                                        <td className="px-3 py-2.5 text-center tabular-nums">{group.site}</td>
                                        <td className="px-3 py-2.5 text-center tabular-nums">{group.accessories}</td>
                                        <td className="px-3 py-2.5 text-right font-bold tabular-nums">{brl(group.revenue)}</td>
                                        <td className="px-3 py-2.5 text-right tabular-nums">{group.machines ? brl(group.ticket) : '-'}</td>
                                        <td className="px-4 py-2.5 text-right tabular-nums">{group.share.toFixed(1).replace('.', ',')}%</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="border-t-2 border-[var(--admin-border)] bg-[var(--admin-surface-2)] font-black">
                                    <th scope="row" className="px-4 py-2.5 text-left">Total</th>
                                    <td className="px-3 py-2.5 text-center tabular-nums">{report.totals.machines}</td>
                                    <td className="px-3 py-2.5 text-center tabular-nums">{report.totals.manual}</td>
                                    <td className="px-3 py-2.5 text-center tabular-nums">{report.totals.site}</td>
                                    <td className="px-3 py-2.5 text-center tabular-nums">{report.totals.accessories}</td>
                                    <td className="px-3 py-2.5 text-right tabular-nums">{brl(report.totals.revenue)}</td>
                                    <td className="px-3 py-2.5 text-right tabular-nums">{report.totals.machines ? brl(report.totals.ticket) : '-'}</td>
                                    <td className="px-4 py-2.5 text-right tabular-nums">{report.totals.revenue > 0 ? '100,0%' : '0,0%'}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    {report.groups.filter((group) => group.sales.length).map((group) => (
                        <details key={group.key} open className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface-1)]">
                            <summary className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-sm font-bold text-[var(--admin-text-primary)]">
                                <span className="mr-auto">{group.name}</span>
                                <span className="font-normal text-[var(--admin-text-secondary)]">{group.machines} {group.machines === 1 ? 'máquina' : 'máquinas'}</span>
                                <span className="tabular-nums">{brl(group.revenue)}</span>
                            </summary>
                            <ul className="border-t border-[var(--admin-border)]">
                                {group.sales.map((sale) => (
                                    <li key={sale.id} className="flex flex-wrap items-center gap-x-4 gap-y-0.5 border-b border-[var(--admin-border)] px-4 py-2 text-sm text-[var(--admin-text-primary)] last:border-0">
                                        <span className="w-24 text-xs text-[var(--admin-text-secondary)]">{vacuumDayLabel(vacuumSaleDay(sale))}</span>
                                        <span className="font-mono text-xs">{sale.order_number}</span>
                                        <b className="min-w-[8rem] flex-1">{sale.customer_name}</b>
                                        <span className="text-xs text-[var(--admin-text-secondary)]">{vacuumItemsShort(sale.items)} · {vacuumPaymentShort(sale.payment_method)}</span>
                                        <b className="tabular-nums">{brl(sale.total_value)}</b>
                                    </li>
                                ))}
                            </ul>
                        </details>
                    ))}

                    {report.pending.length > 0 && (
                        <p className="rounded-xl bg-[var(--admin-warning-muted)] px-4 py-2.5 text-sm text-[var(--admin-text-primary)]">
                            {report.pending.length} {report.pending.length === 1 ? 'venda aguarda' : 'vendas aguardam'} pagamento ({brl(report.pending.reduce((sum, sale) => sum + sale.total_value, 0))}) e não {report.pending.length === 1 ? 'soma' : 'somam'} nos totais. No PDF elas saem em uma lista à parte.
                        </p>
                    )}
                </>
            )}

            {form && (
                <VacuumSaleForm
                    payload={payload}
                    sale={form.sale}
                    onClose={() => setForm(null)}
                    onSaved={(message) => {
                        setForm(null);
                        setNotice(message);
                        void load();
                    }}
                />
            )}
        </div>
    );
};

export default VacuumOrdersView;
