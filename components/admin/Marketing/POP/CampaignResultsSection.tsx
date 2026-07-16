import React, { useEffect, useState } from 'react';
import { BarChart3, Save, Loader2, CheckCircle2, Target } from 'lucide-react';
import { supabase } from '../../../../lib/supabaseClient';
import { useAuth } from '../../../../context/AuthContext';
import {
    marketingApi, PopApiError, formatDateTime,
    type CampaignRequest, type CampaignResult, type RequestStatus,
} from '../../../../lib/popMarketing';
import type { PopNotify } from './PopMarketingView';

/**
 * Pós-Campanha (POP 8.8) — seção do detalhe do pedido para registrar os
 * resultados (investido, leads, vendas, receita, alcance, comparação com a
 * meta e aprendizados). Upsert direto em SITE_CampaignResults (PK request_id).
 * Compartilhamento com o time ou com o solicitante via /api/marketing/share.
 */

interface CampaignResultsSectionProps {
    request: CampaignRequest;
    /** Status atual do pedido dentro do modal (pode ter mudado após abrir). */
    currentStatus: RequestStatus;
    notify: PopNotify;
    /** Marca o pedido como Concluído (reusa o fluxo de status do modal pai). */
    onMarkCompleted: () => void;
}

const inputCls = 'w-full bg-[var(--admin-surface-1)] border border-[var(--admin-border)] rounded-xl px-3 py-2 text-sm text-[var(--admin-text-primary)] outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 dark:focus:ring-teal-900/20 transition-all font-medium';
const labelCls = 'block text-[10px] font-black uppercase tracking-widest text-[var(--admin-text-tertiary)] mb-1.5';

/** Converte string do input → número ou null (campos opcionais). */
const toNumberOrNull = (v: string): number | null => {
    if (v.trim() === '') return null;
    const n = Number(v);
    return Number.isNaN(n) ? null : n;
};

const CampaignResultsSection = ({ request, currentStatus, notify, onMarkCompleted }: CampaignResultsSectionProps) => {
    const { user } = useAuth();

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [sharingTarget, setSharingTarget] = useState<'team' | 'requester' | null>(null);
    /** Já existe registro salvo no banco? (controla o convite de conclusão e o compartilhar) */
    const [hasSaved, setHasSaved] = useState(false);
    const [sharedAt, setSharedAt] = useState<string | null>(null);
    /** Convite pós-primeiro-salvamento para marcar o pedido como Concluído. */
    const [offerComplete, setOfferComplete] = useState(false);

    // ── Campos do form (string para digitação fluida) ──
    const [invested, setInvested] = useState('');
    const [leads, setLeads] = useState('');
    const [sales, setSales] = useState('');
    const [revenue, setRevenue] = useState('');
    const [reach, setReach] = useState('');
    const [comparedToGoal, setComparedToGoal] = useState('');
    const [learnings, setLearnings] = useState('');

    // Carrega o resultado existente (1:1 com o pedido)
    useEffect(() => {
        let cancelled = false;
        (async () => {
            setIsLoading(true);
            try {
                const { data, error } = await supabase
                    .from('SITE_CampaignResults')
                    .select('*')
                    .eq('request_id', request.id)
                    .maybeSingle();
                if (error) throw error;
                if (cancelled) return;
                const result = data as CampaignResult | null;
                if (result) {
                    setHasSaved(true);
                    setSharedAt(result.shared_at);
                    setInvested(result.invested != null ? String(result.invested) : '');
                    setLeads(result.leads != null ? String(result.leads) : '');
                    setSales(result.sales != null ? String(result.sales) : '');
                    setRevenue(result.revenue != null ? String(result.revenue) : '');
                    setReach(result.reach != null ? String(result.reach) : '');
                    setComparedToGoal(result.compared_to_goal || '');
                    setLearnings(result.learnings || '');
                }
            } catch (err) {
                // Backend/banco fora: mantém o form vazio, sem derrubar o modal
                console.error('Erro ao carregar resultados da campanha:', err);
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [request.id]);

    // ── Upsert dos resultados ──
    const handleSave = async () => {
        setIsSaving(true);
        try {
            const isFirstSave = !hasSaved;
            const payload: Record<string, any> = {
                request_id: request.id,
                invested: toNumberOrNull(invested),
                leads: toNumberOrNull(leads),
                sales: toNumberOrNull(sales),
                revenue: toNumberOrNull(revenue),
                reach: toNumberOrNull(reach),
                compared_to_goal: comparedToGoal.trim() || null,
                learnings: learnings.trim() || null,
                updated_at: new Date().toISOString(),
            };
            if (isFirstSave) payload.created_by = user?.name || null;

            const { error } = await supabase.from('SITE_CampaignResults').upsert(payload);
            if (error) throw error;

            setHasSaved(true);
            notify('success', 'Resultados da campanha salvos.');
            // No primeiro salvamento, oferece fechar o ciclo do pedido (POP 8.8)
            if (isFirstSave && currentStatus !== 'Concluido') setOfferComplete(true);
        } catch (err: any) {
            console.error('Erro ao salvar resultados:', err);
            notify('error', err?.message || 'Não foi possível salvar os resultados.');
        } finally {
            setIsSaving(false);
        }
    };

    // ── Compartilhar (grupo do time ou contato do solicitante) ──
    const handleShare = async (target: 'team' | 'requester') => {
        if (!hasSaved) {
            notify('info', 'Salve os resultados antes de compartilhar.');
            return;
        }
        setSharingTarget(target);
        try {
            await marketingApi.share({ type: 'campaign_result', id: request.id, target });
            setSharedAt(new Date().toISOString());
            notify('success', target === 'team'
                ? 'Resultados compartilhados no grupo do time.'
                : 'Resultados enviados ao solicitante.');
        } catch (err: any) {
            console.error('Erro ao compartilhar resultados:', err);
            // 409s conhecidos já chegam com mensagem amigável do client da API
            if (err instanceof PopApiError && (err.code === 'team_group_missing' || err.code === 'requester_contact_missing')) {
                notify('error', err.message);
            } else {
                notify('error', err?.message || 'Falha ao compartilhar os resultados.');
            }
        } finally {
            setSharingTarget(null);
        }
    };

    return (
        <div className="bg-[var(--admin-surface-2)] rounded-2xl border border-[var(--admin-border)] p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--admin-text-tertiary)] flex items-center gap-1.5">
                    <BarChart3 size={12} className="text-teal-600 dark:text-teal-400" /> Resultados da campanha (POP 8.8)
                </p>
                {sharedAt && (
                    <span className="text-[10px] font-bold text-green-600 dark:text-green-400 flex items-center gap-1">
                        <CheckCircle2 size={11} /> Compartilhado em {formatDateTime(sharedAt)}
                    </span>
                )}
            </div>

            {isLoading ? (
                <p className="text-xs text-[var(--admin-text-tertiary)] py-3 text-center">
                    <Loader2 size={16} className="inline animate-spin mr-1.5" /> Carregando resultados…
                </p>
            ) : (
                <>
                    {/* Números principais */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <div>
                            <label className={labelCls}>Investido (R$)</label>
                            <input type="number" min="0" step="0.01" className={inputCls} value={invested} onChange={e => setInvested(e.target.value)} placeholder="0,00" />
                        </div>
                        <div>
                            <label className={labelCls}>Leads</label>
                            <input type="number" min="0" step="1" className={inputCls} value={leads} onChange={e => setLeads(e.target.value)} placeholder="0" />
                        </div>
                        <div>
                            <label className={labelCls}>Vendas</label>
                            <input type="number" min="0" step="1" className={inputCls} value={sales} onChange={e => setSales(e.target.value)} placeholder="0" />
                        </div>
                        <div>
                            <label className={labelCls}>Receita (R$)</label>
                            <input type="number" min="0" step="0.01" className={inputCls} value={revenue} onChange={e => setRevenue(e.target.value)} placeholder="0,00" />
                        </div>
                        <div>
                            <label className={labelCls}>Alcance</label>
                            <input type="number" min="0" step="1" className={inputCls} value={reach} onChange={e => setReach(e.target.value)} placeholder="0" />
                        </div>
                    </div>

                    {/* Comparação com a meta do pedido */}
                    <div>
                        <label className={labelCls}>Resultado vs meta</label>
                        {request.expected_result && (
                            <p className="text-xs font-medium text-[var(--admin-text-secondary)] mb-1.5 flex items-start gap-1.5">
                                <Target size={12} className="text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
                                <span>Meta do pedido: <span className="font-bold text-[var(--admin-text-primary)]">{request.expected_result}</span></span>
                            </p>
                        )}
                        <textarea
                            className={`${inputCls} min-h-[56px] resize-y`}
                            value={comparedToGoal}
                            onChange={e => setComparedToGoal(e.target.value)}
                            placeholder={request.expected_result ? 'Como o resultado ficou frente à meta acima?' : 'Como o resultado ficou frente ao esperado?'}
                        />
                    </div>

                    <div>
                        <label className={labelCls}>Aprendizados</label>
                        <textarea
                            className={`${inputCls} min-h-[56px] resize-y`}
                            value={learnings}
                            onChange={e => setLearnings(e.target.value)}
                            placeholder="O que levar para a próxima campanha?"
                        />
                    </div>

                    {/* Convite pós-primeiro-salvamento: fechar o ciclo do pedido */}
                    {offerComplete && (
                        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-900/60 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                                Resultados registrados — marcar o pedido como Concluído?
                            </p>
                            <div className="flex items-center gap-2 shrink-0">
                                <button
                                    onClick={() => { setOfferComplete(false); onMarkCompleted(); }}
                                    className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-emerald-700 active:scale-95 transition-all flex items-center gap-1.5"
                                >
                                    <CheckCircle2 size={14} /> Sim, concluir
                                </button>
                                <button
                                    onClick={() => setOfferComplete(false)}
                                    className="px-4 py-2 rounded-xl text-xs font-bold text-[var(--admin-text-secondary)] hover:bg-[var(--admin-surface-1)] transition-all"
                                >
                                    Agora não
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Ações */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => handleShare('team')}
                                disabled={sharingTarget !== null || !hasSaved}
                                className="px-3.5 py-2 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-xl hover:bg-green-100 dark:hover:bg-green-900/40 transition-all active:scale-95 text-xs font-black uppercase tracking-wide flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                                title={hasSaved ? 'Compartilhar no grupo do time de Marketing' : 'Salve os resultados primeiro'}
                            >
                                {sharingTarget === 'team' ? <Loader2 size={14} className="animate-spin" /> : <span aria-hidden>📤</span>} Time
                            </button>
                            <button
                                onClick={() => handleShare('requester')}
                                disabled={sharingTarget !== null || !hasSaved}
                                className="px-3.5 py-2 bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 rounded-xl hover:bg-sky-100 dark:hover:bg-sky-900/40 transition-all active:scale-95 text-xs font-black uppercase tracking-wide flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                                title={hasSaved ? `Enviar ao solicitante (${request.requester_name})` : 'Salve os resultados primeiro'}
                            >
                                {sharingTarget === 'requester' ? <Loader2 size={14} className="animate-spin" /> : <span aria-hidden>📤</span>} Solicitante
                            </button>
                        </div>
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="bg-teal-600 text-white px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 hover:bg-teal-700 active:scale-95 transition-all disabled:opacity-60"
                        >
                            {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                            {isSaving ? 'Salvando…' : hasSaved ? 'Atualizar resultados' : 'Salvar resultados'}
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};

export default CampaignResultsSection;
