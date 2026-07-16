import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    TrendingUp, Plus, Trash2, Save, Loader2, Copy, CalendarRange, Wallet,
} from 'lucide-react';
import { supabase } from '../../../../lib/supabaseClient';
import { useAuth } from '../../../../context/AuthContext';
import {
    marketingApi, PopApiError, formatBRL,
    toMonthInputValue, monthInputToDbDate, prevMonthInput, formatMonthLong,
    TRAFFIC_CHANNELS, TRAFFIC_STATUS_CHIP,
    type TrafficPlan, type TrafficPlanItem, type TrafficChannel,
} from '../../../../lib/popMarketing';
import type { PopNotify } from './PopMarketingView';

/**
 * Planejamento de Tráfego (POP 8.6) — um plano por mês com a tabela de
 * anúncios (nome, campanha, canal, público, região, verba, resultado esperado
 * e resultado real preenchido no fechamento). CRUD direto via supabase
 * (SITE_TrafficPlans / SITE_TrafficPlanItems); compartilhamento com o time
 * via POST /api/marketing/share (contrato fixo).
 */

interface TrafficPlanViewProps {
    notify: PopNotify;
}

/** Linha em edição na tabela (valores como string para digitação fluida). */
interface RowDraft {
    /** Chave local do React (linhas novas ainda não têm id do banco). */
    _key: string;
    id?: number;
    ad_name: string;
    campaign_name: string;
    channel: TrafficChannel;
    audience: string;
    region: string;
    budget: string;
    expected_result: string;
    actual_result: string;
}

const inputCls = 'bg-[var(--admin-surface-2)] border border-[var(--admin-border)] rounded-xl px-4 py-2.5 text-sm text-[var(--admin-text-primary)] outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-900/20 transition-all font-medium';
const cellCls = 'w-full bg-[var(--admin-surface-2)] border border-[var(--admin-border)] rounded-lg px-2.5 py-1.5 text-sm text-[var(--admin-text-primary)] outline-none focus:border-sky-400 transition-all font-medium';
const thCls = 'px-3 py-3 text-[10px] font-black uppercase tracking-widest text-[var(--admin-text-tertiary)] text-left whitespace-nowrap';

let draftSeq = 0;
/** Gera chave local única para linhas novas. */
const nextKey = () => `draft_${Date.now()}_${draftSeq++}`;

const emptyRow = (): RowDraft => ({
    _key: nextKey(),
    ad_name: '',
    campaign_name: '',
    channel: 'Meta',
    audience: '',
    region: '',
    budget: '',
    expected_result: '',
    actual_result: '',
});

/** Item do banco → linha editável. */
const toDraft = (item: TrafficPlanItem): RowDraft => ({
    _key: `db_${item.id}`,
    id: item.id,
    ad_name: item.ad_name || '',
    campaign_name: item.campaign_name || '',
    channel: item.channel || 'Meta',
    audience: item.audience || '',
    region: item.region || '',
    budget: item.budget != null ? String(item.budget) : '',
    expected_result: item.expected_result || '',
    actual_result: item.actual_result || '',
});

/** Linha tem algum conteúdo digitado? (linhas totalmente vazias são ignoradas ao salvar) */
const rowHasContent = (r: RowDraft): boolean =>
    Boolean(r.ad_name.trim() || r.campaign_name.trim() || r.audience.trim() || r.region.trim()
        || r.budget.trim() || r.expected_result.trim() || r.actual_result.trim());

const TrafficPlanView = ({ notify }: TrafficPlanViewProps) => {
    const { user } = useAuth();

    const [month, setMonth] = useState<string>(() => toMonthInputValue());
    const [plan, setPlan] = useState<TrafficPlan | null>(null);
    const [rows, setRows] = useState<RowDraft[]>([]);
    const [notes, setNotes] = useState('');
    const [deletedIds, setDeletedIds] = useState<number[]>([]);
    const [prevPlanId, setPrevPlanId] = useState<string | null>(null);
    const [isDirty, setIsDirty] = useState(false);

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [isSharing, setIsSharing] = useState(false);
    const errorNotified = useRef(false);

    // ── Carga do plano do mês + verificação do mês anterior (p/ duplicar) ──
    const fetchPlan = async (monthValue: string) => {
        setIsLoading(true);
        try {
            const { data: planRow, error } = await supabase
                .from('SITE_TrafficPlans')
                .select('*')
                .eq('month', monthInputToDbDate(monthValue))
                .maybeSingle();
            if (error) throw error;

            if (planRow) {
                const { data: itemRows, error: itemsErr } = await supabase
                    .from('SITE_TrafficPlanItems')
                    .select('*')
                    .eq('plan_id', (planRow as TrafficPlan).id)
                    .order('sort', { ascending: true })
                    .order('id', { ascending: true });
                if (itemsErr) throw itemsErr;
                setPlan(planRow as TrafficPlan);
                setRows(((itemRows as TrafficPlanItem[]) || []).map(toDraft));
                setNotes((planRow as TrafficPlan).notes || '');
            } else {
                setPlan(null);
                setRows([]);
                setNotes('');
            }

            // Existe plano no mês anterior? Habilita o "Duplicar do mês anterior"
            const { data: prevRow } = await supabase
                .from('SITE_TrafficPlans')
                .select('id')
                .eq('month', monthInputToDbDate(prevMonthInput(monthValue)))
                .maybeSingle();
            setPrevPlanId((prevRow as { id: string } | null)?.id || null);

            setDeletedIds([]);
            setIsDirty(false);
            errorNotified.current = false;
        } catch (err) {
            console.error('Erro ao carregar o planejamento de tráfego:', err);
            setPlan(null);
            setRows([]);
            setPrevPlanId(null);
            if (!errorNotified.current) {
                errorNotified.current = true;
                notify('info', 'Não foi possível carregar o planejamento agora.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchPlan(month); }, [month]);

    // Troca de mês descarta edições locais — confirma antes de perder trabalho
    const handleMonthChange = (value: string) => {
        if (!value || value === month) return;
        if (isDirty && !window.confirm('Há alterações não salvas neste planejamento. Trocar de mês e descartá-las?')) return;
        setMonth(value);
    };

    // ── Criação do plano (vazio ou duplicando o mês anterior) ──
    const handleCreatePlan = async (duplicateFromPrev: boolean) => {
        setIsCreating(true);
        try {
            const { data: created, error } = await supabase
                .from('SITE_TrafficPlans')
                .insert({ month: monthInputToDbDate(month), status: 'Rascunho', created_by: user?.name || null })
                .select('*')
                .single();
            if (error) throw error;

            if (duplicateFromPrev && prevPlanId) {
                // Copia os anúncios do mês anterior (sem o resultado real — mês novo começa zerado)
                const { data: prevItems, error: prevErr } = await supabase
                    .from('SITE_TrafficPlanItems')
                    .select('*')
                    .eq('plan_id', prevPlanId)
                    .order('sort', { ascending: true });
                if (prevErr) throw prevErr;
                const copies = ((prevItems as TrafficPlanItem[]) || []).map((it, idx) => ({
                    plan_id: (created as TrafficPlan).id,
                    ad_name: it.ad_name,
                    campaign_name: it.campaign_name,
                    channel: it.channel,
                    audience: it.audience,
                    region: it.region,
                    budget: it.budget,
                    expected_result: it.expected_result,
                    actual_result: null,
                    sort: idx,
                }));
                if (copies.length > 0) {
                    const { error: copyErr } = await supabase.from('SITE_TrafficPlanItems').insert(copies);
                    if (copyErr) throw copyErr;
                }
                notify('success', `Planejamento criado com ${copies.length} anúncio(s) do mês anterior.`);
            } else {
                notify('success', 'Planejamento do mês criado como Rascunho.');
            }
            await fetchPlan(month);
        } catch (err: any) {
            console.error('Erro ao criar planejamento:', err);
            notify('error', err?.message || 'Não foi possível criar o planejamento.');
        } finally {
            setIsCreating(false);
        }
    };

    // ── Edição das linhas (sempre imutável) ──

    const updateRow = (key: string, patch: Partial<RowDraft>) => {
        setRows(prev => prev.map(r => (r._key === key ? { ...r, ...patch } : r)));
        setIsDirty(true);
    };

    const addRow = () => {
        setRows(prev => [...prev, emptyRow()]);
        setIsDirty(true);
    };

    const removeRow = (key: string) => {
        const row = rows.find(r => r._key === key);
        if (row?.id) setDeletedIds(prev => [...prev, row.id!]);
        setRows(prev => prev.filter(r => r._key !== key));
        setIsDirty(true);
    };

    const totalBudget = useMemo(
        () => rows.reduce((sum, r) => sum + (parseFloat(r.budget) || 0), 0),
        [rows],
    );

    // ── Salvar: update nas existentes + insert nas novas + delete nas removidas ──
    const handleSave = async () => {
        if (!plan) return;
        const meaningful = rows.filter(rowHasContent);
        if (meaningful.some(r => !r.ad_name.trim())) {
            notify('error', 'Toda linha preenchida precisa do nome do anúncio.');
            return;
        }
        setIsSaving(true);
        try {
            // sort segue a ordem visual da tabela
            const prepared = meaningful.map((r, idx) => ({
                id: r.id,
                payload: {
                    plan_id: plan.id,
                    ad_name: r.ad_name.trim(),
                    campaign_name: r.campaign_name.trim() || null,
                    channel: r.channel,
                    audience: r.audience.trim() || null,
                    region: r.region.trim() || null,
                    budget: parseFloat(r.budget) || 0,
                    expected_result: r.expected_result.trim() || null,
                    actual_result: r.actual_result.trim() || null,
                    sort: idx,
                },
            }));

            if (deletedIds.length > 0) {
                const { error } = await supabase.from('SITE_TrafficPlanItems').delete().in('id', deletedIds);
                if (error) throw error;
            }

            // id é "generated always" — updates individuais em paralelo (sem upsert com id)
            const updates = prepared.filter(p => p.id != null);
            if (updates.length > 0) {
                const results = await Promise.all(
                    updates.map(u => supabase.from('SITE_TrafficPlanItems').update(u.payload).eq('id', u.id!)),
                );
                const failed = results.find(r => r.error);
                if (failed?.error) throw failed.error;
            }

            const inserts = prepared.filter(p => p.id == null).map(p => p.payload);
            if (inserts.length > 0) {
                const { error } = await supabase.from('SITE_TrafficPlanItems').insert(inserts);
                if (error) throw error;
            }

            // Observações do mês ficam no próprio plano
            const { error: planErr } = await supabase
                .from('SITE_TrafficPlans')
                .update({ notes: notes.trim() || null, updated_at: new Date().toISOString() })
                .eq('id', plan.id);
            if (planErr) throw planErr;

            notify('success', 'Planejamento salvo.');
            await fetchPlan(month);
        } catch (err: any) {
            console.error('Erro ao salvar o planejamento:', err);
            notify('error', err?.message || 'Não foi possível salvar o planejamento.');
        } finally {
            setIsSaving(false);
        }
    };

    // ── Toggle Rascunho ⇄ Publicado (otimista, com rollback) ──
    const handleToggleStatus = async () => {
        if (!plan) return;
        const next = plan.status === 'Rascunho' ? 'Publicado' : 'Rascunho';
        const prev = plan.status;
        setPlan({ ...plan, status: next });
        const { error } = await supabase
            .from('SITE_TrafficPlans')
            .update({ status: next, updated_at: new Date().toISOString() })
            .eq('id', plan.id);
        if (error) {
            console.error('Erro ao mudar status do plano:', error);
            setPlan(p => (p ? { ...p, status: prev } : p));
            notify('error', 'Não foi possível alterar o status do plano.');
        } else {
            notify('success', next === 'Publicado' ? 'Planejamento publicado.' : 'Planejamento voltou para rascunho.');
        }
    };

    // ── Compartilhar no grupo do time (POST /api/marketing/share) ──
    const handleShare = async () => {
        if (!plan) return;
        if (isDirty) {
            notify('info', 'Salve as alterações antes de compartilhar.');
            return;
        }
        setIsSharing(true);
        try {
            await marketingApi.share({ type: 'traffic_plan', id: plan.id });
            notify('success', 'Planejamento compartilhado no grupo do time.');
        } catch (err: any) {
            console.error('Erro ao compartilhar planejamento:', err);
            if (err instanceof PopApiError && err.code === 'team_group_missing') {
                // 409: falta configurar o grupo do time nas configurações de Aprovações
                notify('error', err.message);
            } else {
                notify('error', err?.message || 'Falha ao compartilhar o planejamento.');
            }
        } finally {
            setIsSharing(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Barra superior: título, seletor de mês e ações do plano */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-[var(--admin-surface-1)] p-6 rounded-2xl shadow-sm border border-[var(--admin-border)]">
                <div>
                    <h3 className="font-black text-2xl text-[var(--admin-text-primary)] flex items-center gap-2">
                        <TrendingUp className="text-sky-600 dark:text-sky-400" /> Planejamento de Tráfego
                    </h3>
                    <p className="text-sm text-[var(--admin-text-secondary)] font-medium tracking-tight">
                        POP 8.6 — um plano por mês com anúncios, verba e resultados esperados vs reais.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <input
                        type="month"
                        className={inputCls}
                        value={month}
                        onChange={e => handleMonthChange(e.target.value)}
                        title="Mês do planejamento"
                    />
                    {plan && (
                        <>
                            {/* Badge de status com toggle */}
                            <button
                                onClick={handleToggleStatus}
                                className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${TRAFFIC_STATUS_CHIP[plan.status]}`}
                                title={plan.status === 'Rascunho' ? 'Clique para publicar' : 'Clique para voltar a rascunho'}
                            >
                                {plan.status}
                            </button>
                            <button
                                onClick={handleShare}
                                disabled={isSharing}
                                className="bg-green-600 text-white px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 hover:bg-green-700 active:scale-95 transition-all disabled:opacity-60"
                                title="Envia o resumo do plano para o grupo do time de Marketing"
                            >
                                {isSharing ? <Loader2 size={14} className="animate-spin" /> : <span aria-hidden>📤</span>}
                                Compartilhar no grupo do time
                            </button>
                        </>
                    )}
                </div>
            </div>

            {isLoading ? (
                <div className="bg-[var(--admin-surface-1)] rounded-2xl border border-[var(--admin-border)] py-20 text-center text-[var(--admin-text-tertiary)]">
                    <Loader2 size={30} className="mx-auto animate-spin mb-2" />
                    <p className="text-sm font-medium">Carregando o planejamento…</p>
                </div>
            ) : !plan ? (
                /* ── Mês sem plano: criar do zero ou duplicar o anterior ── */
                <div className="bg-[var(--admin-surface-1)] border-2 border-dashed border-[var(--admin-border)] rounded-3xl py-16 text-center">
                    <CalendarRange size={56} className="mx-auto mb-4 text-gray-400 opacity-20" />
                    <p className="text-lg font-bold text-[var(--admin-text-primary)]">
                        Nenhum planejamento para {formatMonthLong(month)}
                    </p>
                    <p className="text-sm text-[var(--admin-text-secondary)] mb-6">
                        Crie o plano do mês para montar a tabela de anúncios e verbas.
                    </p>
                    <div className="flex flex-wrap justify-center gap-3">
                        <button
                            onClick={() => handleCreatePlan(false)}
                            disabled={isCreating}
                            className="bg-sky-600 text-white px-6 py-2.5 rounded-xl text-sm font-black uppercase tracking-wider flex items-center gap-2 hover:bg-sky-700 shadow-xl shadow-sky-100 dark:shadow-none active:scale-95 transition-all disabled:opacity-60"
                        >
                            {isCreating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                            Criar planejamento
                        </button>
                        {prevPlanId && (
                            <button
                                onClick={() => handleCreatePlan(true)}
                                disabled={isCreating}
                                className="px-6 py-2.5 rounded-xl text-sm font-bold bg-[var(--admin-surface-2)] border border-[var(--admin-border)] text-[var(--admin-text-primary)] hover:border-sky-500 transition-all flex items-center gap-2 disabled:opacity-60"
                            >
                                <Copy size={16} /> Duplicar do mês anterior
                            </button>
                        )}
                    </div>
                </div>
            ) : (
                /* ── Tabela editável de anúncios ── */
                <div className="bg-[var(--admin-surface-1)] rounded-2xl border border-[var(--admin-border)] shadow-sm overflow-hidden">
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-sm min-w-[1080px]">
                            <thead>
                                <tr className="border-b border-[var(--admin-border)]">
                                    <th className={thCls}>Anúncio *</th>
                                    <th className={thCls}>Campanha</th>
                                    <th className={thCls}>Canal</th>
                                    <th className={thCls}>Público</th>
                                    <th className={thCls}>Região</th>
                                    <th className={thCls}>Verba (R$)</th>
                                    <th className={thCls}>Resultado esperado</th>
                                    <th className={thCls}>Resultado real</th>
                                    <th className="px-3 py-3 w-10" />
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map(row => (
                                    <tr key={row._key} className="border-b border-[var(--admin-border)] last:border-b-0 align-top">
                                        <td className="px-3 py-2 min-w-[180px]">
                                            <input className={cellCls} value={row.ad_name} onChange={e => updateRow(row._key, { ad_name: e.target.value })} placeholder="Nome do anúncio" />
                                        </td>
                                        <td className="px-3 py-2 min-w-[150px]">
                                            <input className={cellCls} value={row.campaign_name} onChange={e => updateRow(row._key, { campaign_name: e.target.value })} placeholder="Campanha" />
                                        </td>
                                        <td className="px-3 py-2">
                                            <select className={`${cellCls} cursor-pointer`} value={row.channel} onChange={e => updateRow(row._key, { channel: e.target.value as TrafficChannel })}>
                                                {TRAFFIC_CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                        </td>
                                        <td className="px-3 py-2 min-w-[150px]">
                                            <input className={cellCls} value={row.audience} onChange={e => updateRow(row._key, { audience: e.target.value })} placeholder="Ex.: mecânicos, leads frios" />
                                        </td>
                                        <td className="px-3 py-2 min-w-[120px]">
                                            <input className={cellCls} value={row.region} onChange={e => updateRow(row._key, { region: e.target.value })} placeholder="Ex.: Sudeste" />
                                        </td>
                                        <td className="px-3 py-2 w-32">
                                            <input type="number" min="0" step="0.01" className={`${cellCls} text-right`} value={row.budget} onChange={e => updateRow(row._key, { budget: e.target.value })} placeholder="0,00" />
                                        </td>
                                        <td className="px-3 py-2 min-w-[160px]">
                                            <input className={cellCls} value={row.expected_result} onChange={e => updateRow(row._key, { expected_result: e.target.value })} placeholder="Ex.: 200 leads" />
                                        </td>
                                        <td className="px-3 py-2 min-w-[160px]">
                                            {/* Coluna separada — preenchida depois, no fechamento do mês */}
                                            <input className={`${cellCls} focus:border-green-500`} value={row.actual_result} onChange={e => updateRow(row._key, { actual_result: e.target.value })} placeholder="Preencher no fechamento" />
                                        </td>
                                        <td className="px-3 py-2">
                                            <button
                                                onClick={() => removeRow(row._key)}
                                                className="p-2 rounded-lg text-[var(--admin-text-tertiary)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                                                title="Remover linha"
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {rows.length === 0 && (
                                    <tr>
                                        <td colSpan={9} className="px-5 py-10 text-center text-sm text-[var(--admin-text-tertiary)]">
                                            Nenhum anúncio ainda — clique em “Adicionar anúncio” para começar.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                            {/* Rodapé: total de verba do mês */}
                            <tfoot>
                                <tr className="border-t-2 border-[var(--admin-border)] bg-[var(--admin-surface-2)]">
                                    <td colSpan={5} className="px-3 py-3 text-right text-[10px] font-black uppercase tracking-widest text-[var(--admin-text-tertiary)]">
                                        Total de verba
                                    </td>
                                    <td className="px-3 py-3 text-right">
                                        <span className="font-black text-[var(--admin-text-primary)] whitespace-nowrap flex items-center justify-end gap-1.5">
                                            <Wallet size={14} className="text-sky-600 dark:text-sky-400" />
                                            {formatBRL(totalBudget)}
                                        </span>
                                    </td>
                                    <td colSpan={3} />
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    {/* Ações da tabela + observações do mês */}
                    <div className="p-5 border-t border-[var(--admin-border)] space-y-4">
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--admin-text-tertiary)] mb-1.5">
                                Observações do mês
                            </label>
                            <textarea
                                className={`${inputCls} w-full min-h-[56px] resize-y`}
                                value={notes}
                                onChange={e => { setNotes(e.target.value); setIsDirty(true); }}
                                placeholder="Contexto do plano, datas importantes, promoções…"
                            />
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <button
                                onClick={addRow}
                                className="px-4 py-2.5 rounded-xl text-sm font-bold bg-[var(--admin-surface-2)] border border-[var(--admin-border)] text-[var(--admin-text-primary)] hover:border-sky-500 transition-all flex items-center gap-2"
                            >
                                <Plus size={16} /> Adicionar anúncio
                            </button>
                            <div className="flex items-center gap-3">
                                {isDirty && (
                                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                                        Alterações não salvas
                                    </span>
                                )}
                                <button
                                    onClick={handleSave}
                                    disabled={isSaving || !isDirty}
                                    className="bg-sky-600 text-white px-6 py-2.5 rounded-xl text-sm font-black uppercase tracking-wider flex items-center gap-2 hover:bg-sky-700 shadow-xl shadow-sky-100 dark:shadow-none active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                    {isSaving ? 'Salvando…' : 'Salvar planejamento'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TrafficPlanView;
