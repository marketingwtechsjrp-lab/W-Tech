/**
 * Campanhas de Captura — Marketing Hub → aba "Captura".
 *
 * Gestão das campanhas de captação de leads (quiz gamificado, enquetes,
 * formulários e templates de LP). Cada campanha tem a própria lista interna
 * de leads (SITE_CaptureLeads); daqui o time seleciona os leads e envia em
 * lote para o CRM (SITE_Leads) ao término da campanha.
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Target, Plus, ExternalLink, Copy, Trash2, Pencil, Users, Send,
    Flag, CheckCircle2, Loader2, X, ChevronLeft, BarChart3, Search,
} from 'lucide-react';
import {
    CaptureCampaign, CaptureLead, PollResult,
    CAMPAIGN_TEMPLATES, CAMPAIGN_TYPES,
    fetchCaptureCampaigns, fetchCampaignLeads, fetchCampaignLeadCounts,
    fetchPollResults, saveCaptureCampaign, deleteCaptureCampaign,
    sendCaptureLeadsToCrm, slugify, campaignPublicPath,
} from '../../../lib/captureCampaigns';

const STATUS_META: Record<string, { label: string; className: string }> = {
    draft: { label: 'Rascunho', className: 'bg-gray-500/15 text-gray-400 border-gray-500/30' },
    active: { label: 'Ativa', className: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30' },
    ended: { label: 'Encerrada', className: 'bg-amber-500/15 text-amber-500 border-amber-500/30' },
};

const templateLabel = (value: string) =>
    CAMPAIGN_TEMPLATES.find(t => t.value === value)?.label || value;

// ─── Modal de criação/edição ─────────────────────────────────────────────────

interface EditorProps {
    campaign: CaptureCampaign | null;
    onClose: () => void;
    onSaved: () => void;
}

const CampaignEditor = ({ campaign, onClose, onSaved }: EditorProps) => {
    const [name, setName] = useState(campaign?.name || '');
    const [slug, setSlug] = useState(campaign?.slug || '');
    const [slugTouched, setSlugTouched] = useState(!!campaign);
    const [description, setDescription] = useState(campaign?.description || '');
    const [type, setType] = useState(campaign?.type || 'quiz');
    const [template, setTemplate] = useState(campaign?.template || 'ferramenta');
    const [status, setStatus] = useState(campaign?.status || 'draft');
    const [headline, setHeadline] = useState(campaign?.config?.headline || '');
    const [subheadline, setSubheadline] = useState(campaign?.config?.subheadline || '');
    const [question, setQuestion] = useState(campaign?.config?.question || '');
    const [optionsText, setOptionsText] = useState((campaign?.config?.options || []).join('\n'));
    const [cta, setCta] = useState(campaign?.config?.cta || '');
    const [successMessage, setSuccessMessage] = useState(campaign?.config?.success_message || '');
    const [endsAt, setEndsAt] = useState(campaign?.ends_at ? campaign.ends_at.slice(0, 10) : '');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const isPoll = type === 'quiz' || type === 'enquete';

    const handleSave = async () => {
        setError('');
        if (!name.trim()) { setError('Dê um nome à campanha.'); return; }
        const finalSlug = slugify(slug || name);
        if (!finalSlug) { setError('Slug inválido.'); return; }
        const options = optionsText.split('\n').map(o => o.trim()).filter(Boolean);
        if (isPoll && options.length < 2) { setError('Quiz/enquete precisa de pelo menos 2 opções.'); return; }
        setSaving(true);
        try {
            await saveCaptureCampaign({
                id: campaign?.id,
                name: name.trim(),
                slug: finalSlug,
                description: description.trim() || null,
                type: type as CaptureCampaign['type'],
                template: template as CaptureCampaign['template'],
                status: status as CaptureCampaign['status'],
                ends_at: endsAt ? new Date(`${endsAt}T23:59:59`).toISOString() : null,
                config: {
                    headline: headline.trim() || undefined,
                    subheadline: subheadline.trim() || undefined,
                    question: question.trim() || undefined,
                    options: isPoll ? options : undefined,
                    gamification: isPoll ? 'race' : 'none',
                    cta: cta.trim() || undefined,
                    success_message: successMessage.trim() || undefined,
                },
            });
            onSaved();
        } catch (err) {
            console.error('[Captura] Falha ao salvar campanha:', err);
            setError(err instanceof Error ? err.message : 'Erro ao salvar. Verifique se o slug já existe.');
        } finally {
            setSaving(false);
        }
    };

    const inputCls = 'w-full bg-[var(--admin-surface-2)] border border-[var(--admin-border)] rounded-lg px-3 py-2.5 text-sm text-[var(--admin-text-primary)] focus:border-wtech-gold focus:outline-none transition-colors';
    const labelCls = 'block text-xs font-bold uppercase tracking-wider text-[var(--admin-text-secondary)] mb-1.5';

    return (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
            <div
                className="bg-[var(--admin-surface-1)] border border-[var(--admin-border)] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                <div className="sticky top-0 bg-[var(--admin-surface-1)] border-b border-[var(--admin-border)] px-6 py-4 flex items-center justify-between z-10">
                    <h3 className="font-black text-lg text-[var(--admin-text-primary)] flex items-center gap-2">
                        <Target size={18} className="text-wtech-gold" />
                        {campaign ? 'Editar campanha' : 'Nova campanha de captura'}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition-colors"><X size={20} /></button>
                </div>

                <div className="p-6 space-y-5">
                    {/* Template */}
                    <div>
                        <label className={labelCls}>Modelo da campanha</label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {CAMPAIGN_TEMPLATES.map(t => (
                                <button
                                    key={t.value} type="button"
                                    onClick={() => setTemplate(t.value)}
                                    title={t.description}
                                    className={`text-left rounded-xl border px-3 py-2.5 text-xs font-bold transition-all ${
                                        template === t.value
                                            ? 'border-wtech-gold bg-wtech-gold/10 text-wtech-gold'
                                            : 'border-[var(--admin-border)] text-[var(--admin-text-secondary)] hover:border-wtech-gold/50'
                                    }`}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className={labelCls}>Nome</label>
                            <input
                                className={inputCls} value={name}
                                onChange={e => {
                                    setName(e.target.value);
                                    if (!slugTouched) setSlug(slugify(e.target.value));
                                }}
                                placeholder="Ex: Próxima Cidade — Setembro"
                            />
                        </div>
                        <div>
                            <label className={labelCls}>Slug (URL /captura/...)</label>
                            <input
                                className={inputCls} value={slug}
                                onChange={e => { setSlugTouched(true); setSlug(e.target.value); }}
                                placeholder="proxima-cidade-setembro"
                            />
                        </div>
                        <div>
                            <label className={labelCls}>Mecânica</label>
                            <select className={inputCls} value={type} onChange={e => setType(e.target.value as CaptureCampaign['type'])}>
                                {CAMPAIGN_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={labelCls}>Status</label>
                            <select className={inputCls} value={status} onChange={e => setStatus(e.target.value as CaptureCampaign['status'])}>
                                <option value="draft">Rascunho (link inativo)</option>
                                <option value="active">Ativa (capturando)</option>
                                <option value="ended">Encerrada (só resultados)</option>
                            </select>
                        </div>
                        <div className="md:col-span-2">
                            <label className={labelCls}>Descrição interna</label>
                            <input className={inputCls} value={description} onChange={e => setDescription(e.target.value)} placeholder="Anotação para o time (não aparece na página)" />
                        </div>
                        <div className="md:col-span-2">
                            <label className={labelCls}>Headline (título da página)</label>
                            <input className={inputCls} value={headline} onChange={e => setHeadline(e.target.value)} placeholder="Qual cidade recebe o curso W-Tech de setembro?" />
                        </div>
                        <div className="md:col-span-2">
                            <label className={labelCls}>Subheadline</label>
                            <input className={inputCls} value={subheadline} onChange={e => setSubheadline(e.target.value)} placeholder="Seu voto decide..." />
                        </div>
                        {isPoll && (
                            <>
                                <div className="md:col-span-2">
                                    <label className={labelCls}>Pergunta</label>
                                    <input className={inputCls} value={question} onChange={e => setQuestion(e.target.value)} placeholder="Vote na sua cidade" />
                                </div>
                                <div className="md:col-span-2">
                                    <label className={labelCls}>Opções (uma por linha)</label>
                                    <textarea
                                        className={`${inputCls} min-h-[110px] font-mono`} value={optionsText}
                                        onChange={e => setOptionsText(e.target.value)}
                                        placeholder={'Vitória\nCuritiba\nCuiabá\nCampo Grande'}
                                    />
                                </div>
                            </>
                        )}
                        <div>
                            <label className={labelCls}>Texto do botão (CTA)</label>
                            <input className={inputCls} value={cta} onChange={e => setCta(e.target.value)} placeholder="Quero o curso na minha cidade" />
                        </div>
                        <div>
                            <label className={labelCls}>Encerra em</label>
                            <input type="date" className={inputCls} value={endsAt} onChange={e => setEndsAt(e.target.value)} />
                        </div>
                        <div className="md:col-span-2">
                            <label className={labelCls}>Mensagem de sucesso</label>
                            <input className={inputCls} value={successMessage} onChange={e => setSuccessMessage(e.target.value)} placeholder="Voto confirmado! Acompanhe a corrida." />
                        </div>
                    </div>

                    {error && <p className="text-red-500 text-sm font-medium">{error}</p>}
                </div>

                <div className="sticky bottom-0 bg-[var(--admin-surface-1)] border-t border-[var(--admin-border)] px-6 py-4 flex justify-end gap-3">
                    <button onClick={onClose} className="px-5 py-2.5 rounded-lg text-sm font-bold text-[var(--admin-text-secondary)] hover:bg-[var(--admin-surface-2)] transition-colors">
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave} disabled={saving}
                        className="px-5 py-2.5 rounded-lg text-sm font-bold bg-black text-white dark:bg-white dark:text-black hover:opacity-85 transition-opacity disabled:opacity-50 flex items-center gap-2"
                    >
                        {saving && <Loader2 size={14} className="animate-spin" />}
                        {campaign ? 'Salvar alterações' : 'Criar campanha'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─── Detalhe da campanha: leads + resultados + envio ao CRM ──────────────────

interface DetailProps {
    campaign: CaptureCampaign;
    onBack: () => void;
    onEdit: () => void;
}

const CampaignDetail = ({ campaign, onBack, onEdit }: DetailProps) => {
    const [leads, setLeads] = useState<CaptureLead[]>([]);
    const [results, setResults] = useState<PollResult[]>([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [sending, setSending] = useState(false);
    const [feedback, setFeedback] = useState('');
    const [search, setSearch] = useState('');

    const isPoll = campaign.type === 'quiz' || campaign.type === 'enquete';

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [leadRows, pollRows] = await Promise.all([
                fetchCampaignLeads(campaign.id),
                isPoll ? fetchPollResults(campaign.id, campaign.config.options || []) : Promise.resolve([]),
            ]);
            setLeads(leadRows);
            setResults(pollRows);
        } catch (err) {
            console.error('[Captura] Falha ao carregar leads:', err);
        } finally {
            setLoading(false);
        }
    }, [campaign.id, campaign.config.options, isPoll]);

    useEffect(() => { load(); }, [load]);

    const filteredLeads = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return leads;
        return leads.filter(l =>
            l.name.toLowerCase().includes(term) ||
            (l.email || '').toLowerCase().includes(term) ||
            l.phone.includes(term)
        );
    }, [leads, search]);

    const pendingLeads = useMemo(() => filteredLeads.filter(l => !l.sent_to_crm), [filteredLeads]);
    const allPendingSelected = pendingLeads.length > 0 && pendingLeads.every(l => selected.has(l.id));

    const toggleAll = () => {
        setSelected(prev => {
            if (allPendingSelected) {
                const next = new Set(prev);
                pendingLeads.forEach(l => next.delete(l.id));
                return next;
            }
            return new Set([...prev, ...pendingLeads.map(l => l.id)]);
        });
    };

    const toggleOne = (id: string) => {
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const handleSendToCrm = async () => {
        const toSend = leads.filter(l => selected.has(l.id) && !l.sent_to_crm);
        if (toSend.length === 0) return;
        const ok = window.confirm(`Enviar ${toSend.length} lead(s) desta campanha para o CRM?\n\nEles entram no funil como "Campanha: ${campaign.name}" com dedupe por telefone/e-mail.`);
        if (!ok) return;
        setSending(true);
        setFeedback('');
        try {
            const result = await sendCaptureLeadsToCrm(campaign, toSend);
            setFeedback(
                result.failed.length === 0
                    ? `✅ ${result.sent} lead(s) enviados para o CRM.`
                    : `⚠️ ${result.sent} enviados, ${result.failed.length} falharam (${result.failed[0].error}).`
            );
            setSelected(new Set());
            await load();
        } catch (err) {
            console.error('[Captura] Falha no envio ao CRM:', err);
            setFeedback('❌ Erro ao enviar para o CRM. Tente novamente.');
        } finally {
            setSending(false);
        }
    };

    const publicUrl = `${window.location.origin}${campaignPublicPath(campaign)}`;
    const statusMeta = STATUS_META[campaign.status] || STATUS_META.draft;

    return (
        <div className="p-6 space-y-6">
            {/* Cabeçalho */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="p-2 rounded-lg hover:bg-[var(--admin-surface-2)] text-[var(--admin-text-secondary)] transition-colors">
                        <ChevronLeft size={20} />
                    </button>
                    <div>
                        <h3 className="font-black text-xl text-[var(--admin-text-primary)] flex items-center gap-2">
                            {campaign.name}
                            <span className={`text-[10px] font-bold uppercase border rounded-full px-2.5 py-0.5 ${statusMeta.className}`}>{statusMeta.label}</span>
                        </h3>
                        <p className="text-xs text-[var(--admin-text-secondary)] mt-0.5">
                            {templateLabel(campaign.template)} · {leads.length} lead(s) · {leads.filter(l => l.sent_to_crm).length} no CRM
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => { navigator.clipboard.writeText(publicUrl); setFeedback('🔗 Link copiado!'); }}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--admin-border)] text-xs font-bold text-[var(--admin-text-secondary)] hover:border-wtech-gold hover:text-wtech-gold transition-colors"
                    >
                        <Copy size={13} /> Copiar link
                    </button>
                    <a
                        href={campaignPublicPath(campaign)} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--admin-border)] text-xs font-bold text-[var(--admin-text-secondary)] hover:border-wtech-gold hover:text-wtech-gold transition-colors"
                    >
                        <ExternalLink size={13} /> Abrir página
                    </a>
                    <button
                        onClick={onEdit}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--admin-border)] text-xs font-bold text-[var(--admin-text-secondary)] hover:border-wtech-gold hover:text-wtech-gold transition-colors"
                    >
                        <Pencil size={13} /> Editar
                    </button>
                </div>
            </div>

            {/* Resultados da enquete */}
            {isPoll && results.length > 0 && (
                <div className="bg-[var(--admin-surface-2)] border border-[var(--admin-border)] rounded-2xl p-5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--admin-text-secondary)] mb-4 flex items-center gap-2">
                        <BarChart3 size={14} className="text-wtech-gold" /> Resultado da enquete
                    </h4>
                    <div className="space-y-3">
                        {[...results].sort((a, b) => b.votes - a.votes).map((r, idx) => (
                            <div key={r.option}>
                                <div className="flex justify-between text-xs mb-1">
                                    <span className={`font-bold ${idx === 0 && r.votes > 0 ? 'text-wtech-gold' : 'text-[var(--admin-text-primary)]'}`}>
                                        {idx === 0 && r.votes > 0 && '🏁 '}{r.option}
                                    </span>
                                    <span className="text-[var(--admin-text-secondary)] font-mono">{r.percentage}% · {r.votes} votos</span>
                                </div>
                                <div className="h-2.5 rounded-full bg-[var(--admin-surface-3)] overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-700 ${idx === 0 && r.votes > 0 ? 'bg-wtech-gold' : 'bg-gray-400/60'}`}
                                        style={{ width: `${r.percentage}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Barra de ações da lista */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-xs">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Buscar por nome, e-mail ou telefone..."
                        className="w-full bg-[var(--admin-surface-2)] border border-[var(--admin-border)] rounded-lg pl-9 pr-3 py-2 text-sm text-[var(--admin-text-primary)] focus:border-wtech-gold focus:outline-none"
                    />
                </div>
                <button
                    onClick={handleSendToCrm}
                    disabled={sending || [...selected].filter(id => leads.find(l => l.id === id && !l.sent_to_crm)).length === 0}
                    className="flex items-center justify-center gap-2 bg-wtech-gold text-black font-bold text-sm px-5 py-2.5 rounded-lg hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                    Enviar para o CRM ({[...selected].filter(id => leads.find(l => l.id === id && !l.sent_to_crm)).length})
                </button>
            </div>

            {feedback && <p className="text-sm font-medium text-[var(--admin-text-primary)]">{feedback}</p>}

            {/* Tabela de leads */}
            <div className="border border-[var(--admin-border)] rounded-2xl overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-[var(--admin-surface-2)] text-left text-[10px] uppercase tracking-wider text-[var(--admin-text-secondary)]">
                                <th className="px-4 py-3 w-10">
                                    <input type="checkbox" checked={allPendingSelected} onChange={toggleAll} className="accent-[#D4AF37]" title="Selecionar todos os pendentes" />
                                </th>
                                <th className="px-4 py-3">Nome</th>
                                <th className="px-4 py-3">E-mail</th>
                                <th className="px-4 py-3">Telefone</th>
                                {isPoll && <th className="px-4 py-3">Voto</th>}
                                <th className="px-4 py-3">Origem</th>
                                <th className="px-4 py-3">Data</th>
                                <th className="px-4 py-3">CRM</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--admin-border)]">
                            {loading && (
                                <tr><td colSpan={8} className="px-4 py-10 text-center text-[var(--admin-text-secondary)]">
                                    <Loader2 size={20} className="animate-spin inline" />
                                </td></tr>
                            )}
                            {!loading && filteredLeads.length === 0 && (
                                <tr><td colSpan={8} className="px-4 py-10 text-center text-[var(--admin-text-secondary)]">
                                    Nenhum lead capturado ainda. Divulgue o link da campanha. 🏍️
                                </td></tr>
                            )}
                            {!loading && filteredLeads.map(lead => (
                                <tr key={lead.id} className={`hover:bg-[var(--admin-surface-2)] transition-colors ${lead.sent_to_crm ? 'opacity-60' : ''}`}>
                                    <td className="px-4 py-3">
                                        <input
                                            type="checkbox" disabled={lead.sent_to_crm}
                                            checked={selected.has(lead.id)} onChange={() => toggleOne(lead.id)}
                                            className="accent-[#D4AF37]"
                                        />
                                    </td>
                                    <td className="px-4 py-3 font-bold text-[var(--admin-text-primary)]">{lead.name}</td>
                                    <td className="px-4 py-3 text-[var(--admin-text-secondary)]">{lead.email || '—'}</td>
                                    <td className="px-4 py-3 text-[var(--admin-text-secondary)] font-mono text-xs">{lead.phone}</td>
                                    {isPoll && (
                                        <td className="px-4 py-3">
                                            {lead.answer?.vote
                                                ? <span className="text-xs font-bold bg-wtech-gold/10 text-wtech-gold border border-wtech-gold/30 rounded-full px-2.5 py-0.5">🏍️ {lead.answer.vote}</span>
                                                : '—'}
                                        </td>
                                    )}
                                    <td className="px-4 py-3 text-xs text-[var(--admin-text-secondary)]">
                                        {lead.utm_source ? `${lead.utm_source}${lead.utm_medium ? ` / ${lead.utm_medium}` : ''}` : 'Direto'}
                                    </td>
                                    <td className="px-4 py-3 text-xs text-[var(--admin-text-secondary)] whitespace-nowrap">
                                        {new Date(lead.created_at).toLocaleDateString('pt-BR')} {new Date(lead.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                    </td>
                                    <td className="px-4 py-3">
                                        {lead.sent_to_crm
                                            ? <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-500"><CheckCircle2 size={12} /> Enviado</span>
                                            : <span className="text-[10px] text-[var(--admin-text-secondary)]">Pendente</span>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

// ─── Lista de campanhas ──────────────────────────────────────────────────────

const CaptureCampaignsView = () => {
    const [campaigns, setCampaigns] = useState<CaptureCampaign[]>([]);
    const [leadCounts, setLeadCounts] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);
    const [editorOpen, setEditorOpen] = useState(false);
    const [editing, setEditing] = useState<CaptureCampaign | null>(null);
    const [detail, setDetail] = useState<CaptureCampaign | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const rows = await fetchCaptureCampaigns();
            setCampaigns(rows);
            setLeadCounts(await fetchCampaignLeadCounts(rows.map(r => r.id)));
            // Mantém o detalhe aberto sincronizado após edição
            setDetail(prev => prev ? rows.find(r => r.id === prev.id) || null : null);
        } catch (err) {
            console.error('[Captura] Falha ao carregar campanhas:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleDelete = async (campaign: CaptureCampaign) => {
        const count = leadCounts[campaign.id] || 0;
        const ok = window.confirm(`Excluir a campanha "${campaign.name}"?\n\n${count} lead(s) capturados serão excluídos junto. Essa ação não pode ser desfeita.`);
        if (!ok) return;
        try {
            await deleteCaptureCampaign(campaign.id);
            await load();
        } catch (err) {
            console.error('[Captura] Falha ao excluir:', err);
        }
    };

    if (detail) {
        return (
            <>
                <CampaignDetail
                    campaign={detail}
                    onBack={() => setDetail(null)}
                    onEdit={() => { setEditing(detail); setEditorOpen(true); }}
                />
                {editorOpen && (
                    <CampaignEditor
                        campaign={editing}
                        onClose={() => { setEditorOpen(false); setEditing(null); }}
                        onSaved={async () => { setEditorOpen(false); setEditing(null); await load(); }}
                    />
                )}
            </>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h3 className="font-black text-xl text-[var(--admin-text-primary)] flex items-center gap-2">
                        <Target size={20} className="text-wtech-gold" /> Campanhas de Captura
                    </h3>
                    <p className="text-sm text-[var(--admin-text-secondary)] mt-1">
                        Quiz, enquetes e LPs de captação. Leads ficam na campanha até o envio manual para o CRM.
                    </p>
                </div>
                <button
                    onClick={() => { setEditing(null); setEditorOpen(true); }}
                    className="flex items-center gap-2 bg-black text-white dark:bg-white dark:text-black font-bold text-sm px-5 py-2.5 rounded-lg hover:opacity-85 transition-opacity"
                >
                    <Plus size={16} /> Nova campanha
                </button>
            </div>

            {loading && (
                <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-wtech-gold" /></div>
            )}

            {!loading && campaigns.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-[var(--admin-text-secondary)]">
                    <Flag size={44} className="mb-4 opacity-20" />
                    <p className="font-bold">Nenhuma campanha de captura ainda.</p>
                    <p className="text-sm mt-1">Crie a primeira — ex: enquete gamificada da próxima cidade do curso.</p>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {campaigns.map(campaign => {
                    const statusMeta = STATUS_META[campaign.status] || STATUS_META.draft;
                    const count = leadCounts[campaign.id] || 0;
                    return (
                        <div
                            key={campaign.id}
                            className="group bg-[var(--admin-surface-2)] border border-[var(--admin-border)] rounded-2xl p-5 hover:border-wtech-gold/60 transition-all cursor-pointer"
                            onClick={() => setDetail(campaign)}
                        >
                            <div className="flex items-start justify-between gap-2 mb-3">
                                <span className={`text-[10px] font-bold uppercase border rounded-full px-2.5 py-0.5 ${statusMeta.className}`}>{statusMeta.label}</span>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                                    <button
                                        onClick={() => { setEditing(campaign); setEditorOpen(true); }}
                                        className="p-1.5 rounded-lg text-[var(--admin-text-secondary)] hover:text-wtech-gold hover:bg-[var(--admin-surface-3)] transition-colors" title="Editar"
                                    >
                                        <Pencil size={14} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(campaign)}
                                        className="p-1.5 rounded-lg text-[var(--admin-text-secondary)] hover:text-red-500 hover:bg-[var(--admin-surface-3)] transition-colors" title="Excluir"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                            <h4 className="font-black text-[var(--admin-text-primary)] leading-snug">{campaign.name}</h4>
                            <p className="text-xs text-[var(--admin-text-secondary)] mt-1">
                                {templateLabel(campaign.template)} · /captura/{campaign.slug}
                            </p>
                            <div className="flex items-center justify-between mt-4 pt-4 border-t border-[var(--admin-border)]">
                                <span className="flex items-center gap-1.5 text-sm font-bold text-[var(--admin-text-primary)]">
                                    <Users size={15} className="text-wtech-gold" /> {count} lead{count === 1 ? '' : 's'}
                                </span>
                                <span className="text-xs text-wtech-gold font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                                    Abrir campanha →
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {editorOpen && (
                <CampaignEditor
                    campaign={editing}
                    onClose={() => { setEditorOpen(false); setEditing(null); }}
                    onSaved={async () => { setEditorOpen(false); setEditing(null); await load(); }}
                />
            )}
        </div>
    );
};

export default CaptureCampaignsView;
