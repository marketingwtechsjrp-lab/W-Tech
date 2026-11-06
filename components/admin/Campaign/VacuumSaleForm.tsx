import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, X } from 'lucide-react';
import {
    VACUUM_MACHINE_ITEM,
    VACUUM_MAX_INSTALLMENTS,
    VACUUM_PAYMENTS,
    type VacuumPaymentId,
    type VacuumSaleRow,
    type VacuumSalesPayload,
} from '../../../lib/vacuumSales';

/** Formulário de lançar e de editar venda manual. Quem soma e valida de verdade é o servidor. */

const API = '/api/vacuum-pump';

export const vacuumInputCls =
    'w-full bg-[var(--admin-surface-2)] border border-[var(--admin-border)] text-[var(--admin-text-primary)] placeholder:text-[var(--admin-text-tertiary)] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-wtech-gold transition-colors';

const brl = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
const todaySP = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());

interface FormState {
    id: string;
    seller_id: string;
    name: string;
    phone: string;
    email: string;
    document: string;
    machine_price: string;
    bumps: Record<string, { on: boolean; price: string }>;
    shipping_cost: string;
    payment: VacuumPaymentId;
    installments: number;
    status: 'paid' | 'pending';
    sale_date: string;
    note: string;
    address: { cep: string; street: string; number: string; complement: string; neighborhood: string; city: string; state: string };
}

function initialForm(offer: VacuumSalesPayload['offer'], sale: VacuumSaleRow | null): FormState {
    const itemOf = (id: string) => sale?.items.find((item) => item.id === id);
    const bumps = Object.fromEntries(
        offer.bumps.map((bump) => {
            const sold = itemOf(bump.id);
            return [bump.id, { on: !!sold, price: String(sold?.price ?? bump.price) }];
        })
    );
    return {
        // Id gerado aqui: reenviar o mesmo formulário não lança outra máquina.
        id: sale?.id ?? crypto.randomUUID(),
        seller_id: sale?.seller_id ?? '',
        name: sale?.customer_name ?? '',
        phone: sale?.customer_phone ?? '',
        email: sale?.customer_email ?? '',
        document: sale?.manual_sale?.document ?? '',
        machine_price: String(itemOf(VACUUM_MACHINE_ITEM)?.price ?? offer.price),
        bumps,
        shipping_cost: String(sale?.shipping_cost ?? 0),
        payment: sale?.manual_sale?.payment ?? 'pix',
        installments: sale?.manual_sale?.installments ?? 1,
        status: sale && sale.status === 'pending' ? 'pending' : 'paid',
        sale_date: sale?.sale_date?.slice(0, 10) ?? todaySP(),
        note: sale?.manual_sale?.note ?? '',
        address: {
            cep: sale?.delivery_cep ?? '',
            street: sale?.delivery_street ?? '',
            number: sale?.delivery_number ?? '',
            complement: sale?.manual_sale?.complement ?? '',
            neighborhood: sale?.delivery_neighborhood ?? '',
            city: sale?.delivery_city ?? '',
            state: sale?.delivery_state ?? '',
        },
    };
}

const Field: React.FC<{ label: string; hint?: string; className?: string; children: React.ReactNode }> = ({ label, hint, className, children }) => (
    <label className={`block ${className ?? ''}`}>
        <span className="mb-1 block text-xs font-bold text-[var(--admin-text-secondary)]">{label}</span>
        {children}
        {hint && <span className="mt-1 block text-[11px] text-[var(--admin-text-tertiary)]">{hint}</span>}
    </label>
);

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <fieldset className="border-t border-[var(--admin-border)] pt-4">
        <legend className="pr-2 text-[11px] font-black uppercase tracking-widest text-[var(--admin-text-tertiary)]">{title}</legend>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">{children}</div>
    </fieldset>
);

const VacuumSaleForm: React.FC<{
    payload: VacuumSalesPayload;
    sale: VacuumSaleRow | null;
    onClose: () => void;
    onSaved: (message: string) => void;
}> = ({ payload, sale, onClose, onSaved }) => {
    const { offer, sellers } = payload;
    const [form, setForm] = useState<FormState>(() => initialForm(offer, sale));
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((prev) => ({ ...prev, [key]: value }));
    const setAddress = (key: keyof FormState['address'], value: string) => setForm((prev) => ({ ...prev, address: { ...prev.address, [key]: value } }));

    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && !saving) onClose();
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onClose, saving]);

    // CEP completo preenche o endereço. Fora do ar, o vendedor digita à mão.
    const cepDigits = form.address.cep.replace(/\D/g, '');
    useEffect(() => {
        if (cepDigits.length !== 8 || cepDigits === (sale?.delivery_cep ?? '')) return;
        let cancelled = false;
        fetch(`https://viacep.com.br/ws/${cepDigits}/json/`)
            .then((res) => res.json())
            .then((data) => {
                if (cancelled || !data || data.erro) return;
                setForm((prev) => ({
                    ...prev,
                    address: {
                        ...prev.address,
                        street: data.logradouro || prev.address.street,
                        neighborhood: data.bairro || prev.address.neighborhood,
                        city: data.localidade || prev.address.city,
                        state: data.uf || prev.address.state,
                    },
                }));
            })
            .catch(() => undefined);
        return () => {
            cancelled = true;
        };
    }, [cepDigits, sale?.delivery_cep]);

    const total = useMemo(() => {
        const bumps = Object.values(form.bumps).reduce((sum, bump) => sum + (bump.on ? Number(bump.price) || 0 : 0), 0);
        return (Number(form.machine_price) || 0) + bumps + (Number(form.shipping_cost) || 0);
    }, [form.bumps, form.machine_price, form.shipping_cost]);

    const priceDiffers = Number(form.machine_price) !== offer.price;

    const submit = async (event: React.FormEvent) => {
        event.preventDefault();
        setSaving(true);
        setError('');
        try {
            const response = await fetch(`${API}?action=${sale ? 'sale_update' : 'sale_create'}`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...form,
                    machine_price: Number(form.machine_price),
                    shipping_cost: Number(form.shipping_cost) || 0,
                    bumps: Object.entries(form.bumps)
                        .filter(([, bump]) => bump.on)
                        .map(([id, bump]) => ({ id, price: Number(bump.price) })),
                }),
            });
            const result = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(result.error || 'Não foi possível salvar. Tente de novo.');
            onSaved(sale ? `Pedido ${result.order_number} atualizado.` : `Venda ${result.order_number} lançada. Ela já entra no painel ao vivo${form.status === 'paid' ? '' : ' assim que for paga'}.`);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Não foi possível salvar. Tente de novo.');
            setSaving(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 sm:p-6" role="dialog" aria-modal="true" aria-label={sale ? 'Editar venda manual' : 'Lançar venda manual'}>
            <form onSubmit={submit} className="flex h-full w-full max-w-3xl flex-col overflow-hidden bg-[var(--admin-surface-1)] text-[var(--admin-text-primary)] sm:h-auto sm:max-h-full sm:rounded-2xl">
                <header className="flex items-start justify-between gap-4 p-5 pb-3">
                    <div>
                        <h2 className="text-lg font-black">{sale ? `Editar venda ${sale.order_number}` : 'Lançar venda manual'}</h2>
                        <p className="text-sm text-[var(--admin-text-secondary)]">
                            {sale ? 'As mudanças valem no painel e no relatório.' : 'Cada lançamento é uma máquina. Vendeu duas? Lance duas vezes.'}
                        </p>
                    </div>
                    <button type="button" onClick={onClose} aria-label="Fechar" className="rounded-lg p-2 text-[var(--admin-text-secondary)] hover:bg-[var(--admin-surface-2)]">
                        <X size={20} aria-hidden />
                    </button>
                </header>

                <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 pb-5 pt-1 [scrollbar-color:var(--admin-border)_transparent] [scrollbar-width:thin]">
                    <fieldset>
                        <legend className="mb-2 text-xs font-bold text-[var(--admin-text-secondary)]">Quem vendeu?</legend>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                            {sellers.map((seller) => (
                                <label
                                    key={seller.id}
                                    className={`flex min-h-[46px] cursor-pointer items-center justify-center rounded-xl border px-2 py-2 text-center text-sm font-bold transition-colors focus-within:ring-2 focus-within:ring-wtech-gold ${
                                        form.seller_id === seller.id
                                            ? 'border-wtech-gold bg-wtech-gold/15 text-[var(--admin-text-primary)]'
                                            : 'border-[var(--admin-border)] text-[var(--admin-text-secondary)] hover:border-[var(--admin-text-tertiary)]'
                                    }`}
                                >
                                    <input type="radio" name="seller" className="sr-only" required checked={form.seller_id === seller.id} onChange={() => set('seller_id', seller.id)} />
                                    {seller.label}
                                </label>
                            ))}
                        </div>
                    </fieldset>

                    <Section title="Cliente">
                        <Field label="Nome completo">
                            <input className={vacuumInputCls} required minLength={2} autoComplete="off" value={form.name} onChange={(e) => set('name', e.target.value)} />
                        </Field>
                        <Field label="WhatsApp, com DDD">
                            <input className={vacuumInputCls} required inputMode="tel" autoComplete="off" placeholder="(17) 99999-0000" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
                        </Field>
                        <Field label="E-mail (opcional)">
                            <input className={vacuumInputCls} type="email" autoComplete="off" value={form.email} onChange={(e) => set('email', e.target.value)} />
                        </Field>
                        <Field label="CPF ou CNPJ (opcional)" hint="Precisa para a nota fiscal. Dá para completar depois.">
                            <input className={vacuumInputCls} inputMode="numeric" autoComplete="off" value={form.document} onChange={(e) => set('document', e.target.value)} />
                        </Field>
                    </Section>

                    <Section title="O que foi vendido">
                        <Field label={offer.machine_name} hint={priceDiffers ? `Preço da oferta agora: ${brl(offer.price)}. Este valor fica registrado no pedido.` : 'Preço da oferta agora.'}>
                            <input className={vacuumInputCls} type="number" min={0.01} step={0.01} required value={form.machine_price} onChange={(e) => set('machine_price', e.target.value)} />
                        </Field>
                        <Field label="Frete (R$)" hint="Deixe 0 se for grátis ou a combinar.">
                            <input className={vacuumInputCls} type="number" min={0} step={0.01} value={form.shipping_cost} onChange={(e) => set('shipping_cost', e.target.value)} />
                        </Field>
                        {offer.bumps.map((bump) => {
                            const state = form.bumps[bump.id];
                            return (
                                <div key={bump.id} className="flex items-center gap-3 rounded-xl border border-[var(--admin-border)] p-3 sm:col-span-2">
                                    <label className="flex flex-1 cursor-pointer items-center gap-3 text-sm font-semibold">
                                        <input
                                            type="checkbox"
                                            className="h-5 w-5 accent-[#D4AF37]"
                                            checked={state.on}
                                            onChange={(e) => set('bumps', { ...form.bumps, [bump.id]: { ...state, on: e.target.checked } })}
                                        />
                                        {bump.name}
                                    </label>
                                    <input
                                        aria-label={`Valor de ${bump.name}`}
                                        className={`${vacuumInputCls} !w-28 disabled:opacity-40`}
                                        type="number"
                                        min={0}
                                        step={0.01}
                                        disabled={!state.on}
                                        value={state.price}
                                        onChange={(e) => set('bumps', { ...form.bumps, [bump.id]: { ...state, price: e.target.value } })}
                                    />
                                </div>
                            );
                        })}
                    </Section>

                    <Section title="Pagamento">
                        <Field label="Forma de pagamento">
                            <select className={vacuumInputCls} value={form.payment} onChange={(e) => set('payment', e.target.value as VacuumPaymentId)}>
                                {VACUUM_PAYMENTS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
                            </select>
                        </Field>
                        {form.payment === 'credit' ? (
                            <Field label="Parcelas">
                                <select className={vacuumInputCls} value={form.installments} onChange={(e) => set('installments', Number(e.target.value))}>
                                    {Array.from({ length: VACUUM_MAX_INSTALLMENTS }, (_, index) => index + 1).map((count) => (
                                        <option key={count} value={count}>{count}x de {brl(total / count)}</option>
                                    ))}
                                </select>
                            </Field>
                        ) : <div className="hidden sm:block" />}
                        <Field label="Situação" hint={form.status === 'paid' ? 'Conta no placar, no lote e no relatório.' : 'Fica na lista, sem contar no placar, até marcar como paga.'}>
                            <select className={vacuumInputCls} value={form.status} onChange={(e) => set('status', e.target.value as FormState['status'])}>
                                <option value="paid">Pago</option>
                                <option value="pending">Aguardando pagamento</option>
                            </select>
                        </Field>
                        <Field label="Data da venda">
                            <input className={vacuumInputCls} type="date" required max={todaySP()} value={form.sale_date} onChange={(e) => set('sale_date', e.target.value)} />
                        </Field>
                    </Section>

                    <Section title="Entrega (dá para completar depois)">
                        <Field label="CEP">
                            <input className={vacuumInputCls} inputMode="numeric" autoComplete="off" value={form.address.cep} onChange={(e) => setAddress('cep', e.target.value)} />
                        </Field>
                        <Field label="Rua">
                            <input className={vacuumInputCls} autoComplete="off" value={form.address.street} onChange={(e) => setAddress('street', e.target.value)} />
                        </Field>
                        <Field label="Número">
                            <input className={vacuumInputCls} autoComplete="off" value={form.address.number} onChange={(e) => setAddress('number', e.target.value)} />
                        </Field>
                        <Field label="Complemento">
                            <input className={vacuumInputCls} autoComplete="off" value={form.address.complement} onChange={(e) => setAddress('complement', e.target.value)} />
                        </Field>
                        <Field label="Bairro">
                            <input className={vacuumInputCls} autoComplete="off" value={form.address.neighborhood} onChange={(e) => setAddress('neighborhood', e.target.value)} />
                        </Field>
                        <div className="grid grid-cols-[1fr_72px] gap-3">
                            <Field label="Cidade">
                                <input className={vacuumInputCls} autoComplete="off" value={form.address.city} onChange={(e) => setAddress('city', e.target.value)} />
                            </Field>
                            <Field label="UF">
                                <input className={vacuumInputCls} maxLength={2} autoComplete="off" value={form.address.state} onChange={(e) => setAddress('state', e.target.value.toUpperCase())} />
                            </Field>
                        </div>
                        <Field label="Observações" className="sm:col-span-2">
                            <textarea className={vacuumInputCls} rows={2} maxLength={1000} value={form.note} onChange={(e) => set('note', e.target.value)} />
                        </Field>
                    </Section>
                </div>

                <footer className="flex flex-wrap items-center gap-3 border-t border-[var(--admin-border)] p-4">
                    <div className="w-full sm:mr-auto sm:w-auto">
                        <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--admin-text-tertiary)]">Total do pedido</p>
                        <p className="text-xl font-black tabular-nums">{brl(total)}</p>
                    </div>
                    {error && <p role="alert" className="w-full rounded-lg bg-[var(--admin-danger-muted)] px-3 py-2 text-sm font-semibold text-[var(--admin-danger)] sm:order-first">{error}</p>}
                    <button type="button" onClick={onClose} disabled={saving} className="flex-1 rounded-xl border border-[var(--admin-border)] px-4 py-2.5 text-sm font-bold text-[var(--admin-text-secondary)] hover:bg-[var(--admin-surface-2)] sm:flex-none">
                        Cancelar
                    </button>
                    <button type="submit" disabled={saving} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-wtech-gold to-yellow-600 px-5 py-2.5 text-sm font-black text-black disabled:opacity-60 sm:flex-none">
                        {saving && <Loader2 size={16} className="animate-spin" aria-hidden />}
                        {saving ? 'Salvando...' : sale ? 'Salvar alterações' : 'Lançar venda'}
                    </button>
                </footer>
            </form>
        </div>,
        document.body
    );
};

export default VacuumSaleForm;
