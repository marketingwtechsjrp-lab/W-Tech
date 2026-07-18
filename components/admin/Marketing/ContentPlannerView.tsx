/**
 * Planejador de Conteúdo — Marketing Hub → aba "Planejador".
 *
 * Calendário mensal de posts das redes sociais (SITE_ContentPosts na VPS).
 * Cada dia mostra os cards planejados; clicar em um card abre o editor com
 * CONTEÚDO, OBJETIVO, EDITORIAL/TEMA, roteiro, legenda, hashtags e status.
 *
 * Padrão semanal (reunião de 17/07/2026): dom/ter/qui = produto ·
 * seg/qua/sex = dicas/diversos · sáb = reciclagem/corrida. Dias vazios
 * exibem a dica do padrão como guia de preenchimento.
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    CalendarDays, ChevronLeft, ChevronRight, Plus, X, Trash2, Loader2,
    AlertTriangle, Sparkles, Check,
} from 'lucide-react';
import {
    ContentPost, ContentPostInput, ContentPostStatus,
    STATUS_OPTIONS, FORMAT_OPTIONS, CATEGORY_OPTIONS, NETWORK_OPTIONS,
    EDITORIAL_QUADROS, WEEKDAY_HINTS,
    fetchContentPosts, saveContentPost, deleteContentPost,
} from '../../../lib/contentPlanner';
import { generateWeekSuggestions } from '../../../lib/contentPlannerAI';

// ─── Metadados visuais ───────────────────────────────────────────────────────

const STATUS_META: Record<ContentPostStatus, { label: string; chip: string }> = {
    nao_iniciado: { label: 'Não iniciado', chip: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30' },
    gravado: { label: 'Gravado', chip: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30' },
    publicado: { label: 'Publicado', chip: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' },
    nao_realizado: { label: 'Não realizado', chip: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30' },
    excluido: { label: 'Excluído', chip: 'bg-gray-500/15 text-gray-500 border-gray-500/30 line-through' },
};

const WEEKDAY_LABELS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

const formatEmoji = (format: string) =>
    FORMAT_OPTIONS.find(f => f.value === format)?.emoji || '🎦';

// ─── Helpers de data (datas locais, sem timezone) ────────────────────────────

const toISO = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Células do grid: do domingo antes do dia 1 ao sábado após o último dia. */
const buildMonthCells = (anchor: Date): Date[] => {
    const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const start = new Date(first);
    start.setDate(first.getDate() - first.getDay());
    const last = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
    const end = new Date(last);
    end.setDate(last.getDate() + (6 - last.getDay()));
    const cells: Date[] = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        cells.push(new Date(d));
    }
    return cells;
};

const emptyPost = (date: string): ContentPostInput => ({
    title: '',
    post_date: date,
    status: 'nao_iniciado',
    category: 'PAUTA FRIA',
    format: 'video',
    networks: ['INSTA', 'FACE', 'TIKTOK'],
    content: '',
    objective: '',
    editorial: '',
    script: '',
    caption: '',
    hashtags: '',
    reference: '',
    obs: '',
    paid_traffic: false,
});

// ─── Editor (modal) ──────────────────────────────────────────────────────────

interface EditorProps {
    post: ContentPostInput;
    onClose: () => void;
    onSaved: () => void;
}

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <label className="block">
        <span className="text-xs font-bold uppercase tracking-wide text-[var(--admin-text-secondary)]">{label}</span>
        <div className="mt-1">{children}</div>
    </label>
);

const inputCls =
    'w-full rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-2,transparent)] px-3 py-2 text-sm text-[var(--admin-text-primary)] focus:outline-none focus:ring-2 focus:ring-wtech-gold/50';

const PostEditor = ({ post, onClose, onSaved }: EditorProps) => {
    const [form, setForm] = useState<ContentPostInput>({ ...post });
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState('');

    const set = <K extends keyof ContentPostInput>(key: K, value: ContentPostInput[K]) =>
        setForm(prev => ({ ...prev, [key]: value }));

    const toggleNetwork = (net: ContentPostInput['networks'][number]) =>
        set('networks', form.networks.includes(net)
            ? form.networks.filter(n => n !== net)
            : [...form.networks, net]);

    const handleSave = async () => {
        if (!form.title.trim()) { setError('Dê um nome curto ao card (ex.: "PEÇA DO DIA").'); return; }
        setSaving(true);
        setError('');
        try {
            await saveContentPost({ ...form, title: form.title.trim().toUpperCase() });
            onSaved();
        } catch (e: any) {
            setError(e?.message || 'Erro ao salvar o card.');
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!form.id) return;
        if (!window.confirm(`Excluir o card "${form.title}" de ${form.post_date.split('-').reverse().join('/')}?`)) return;
        setDeleting(true);
        try {
            await deleteContentPost(form.id);
            onSaved();
        } catch (e: any) {
            setError(e?.message || 'Erro ao excluir o card.');
            setDeleting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
            <div
                className="w-full max-w-3xl max-h-[90vh] overflow-y-auto custom-scrollbar rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface-1)] p-6 shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-xl font-black text-[var(--admin-text-primary)]">
                        {form.id ? 'Editar card' : 'Novo card'} — {form.post_date.split('-').reverse().join('/')}
                    </h3>
                    <button onClick={onClose} className="rounded-lg p-2 text-gray-500 hover:bg-gray-500/10" aria-label="Fechar">
                        <X size={18} />
                    </button>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Field label="Nome do card">
                        <input className={inputCls} value={form.title} placeholder='Ex.: "MITOS SOBRE SUSPENSÕES"'
                            onChange={e => set('title', e.target.value)} />
                    </Field>
                    <Field label="Data do post">
                        <input type="date" className={inputCls} value={form.post_date}
                            onChange={e => set('post_date', e.target.value)} />
                    </Field>
                    <Field label="Status">
                        <select className={inputCls} value={form.status}
                            onChange={e => set('status', e.target.value as ContentPostStatus)}>
                            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                    </Field>
                    <Field label="Categoria">
                        <select className={inputCls} value={form.category}
                            onChange={e => set('category', e.target.value as ContentPostInput['category'])}>
                            {CATEGORY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                    </Field>
                    <Field label="Formato">
                        <select className={inputCls} value={form.format}
                            onChange={e => set('format', e.target.value as ContentPostInput['format'])}>
                            {FORMAT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.emoji} {o.label}</option>)}
                        </select>
                    </Field>
                    <Field label="Editorial / Quadro">
                        <input className={inputCls} value={form.editorial || ''} list="quadros-editorial"
                            placeholder='Ex.: "Erros comuns, mas fatais — EP.: 003"'
                            onChange={e => set('editorial', e.target.value)} />
                        <datalist id="quadros-editorial">
                            {EDITORIAL_QUADROS.map(q => <option key={q} value={q} />)}
                        </datalist>
                    </Field>
                </div>

                <div className="mt-4">
                    <span className="text-xs font-bold uppercase tracking-wide text-[var(--admin-text-secondary)]">Redes</span>
                    <div className="mt-1 flex flex-wrap gap-2">
                        {NETWORK_OPTIONS.map(n => (
                            <button key={n.value} type="button" onClick={() => toggleNetwork(n.value)}
                                className={`rounded-full border px-3 py-1 text-xs font-bold transition-colors ${
                                    form.networks.includes(n.value)
                                        ? 'border-wtech-gold bg-wtech-gold/15 text-[var(--admin-text-primary)]'
                                        : 'border-[var(--admin-border)] text-gray-500 hover:border-gray-400'
                                }`}>
                                {n.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="mt-4 space-y-4">
                    <Field label="Conteúdo (a ideia, mastigada)">
                        <textarea className={inputCls} rows={3} value={form.content || ''}
                            onChange={e => set('content', e.target.value)} />
                    </Field>
                    <Field label="Objetivo do conteúdo">
                        <textarea className={inputCls} rows={2} value={form.objective || ''}
                            onChange={e => set('objective', e.target.value)} />
                    </Field>
                    <Field label="Roteiro (reels/carrossel)">
                        <textarea className={inputCls} rows={4} value={form.script || ''}
                            placeholder="Gancho → desenvolvimento → CTA. Para carrossel: 1 slide por linha."
                            onChange={e => set('script', e.target.value)} />
                    </Field>
                    <Field label="Legenda">
                        <textarea className={inputCls} rows={2} value={form.caption || ''}
                            onChange={e => set('caption', e.target.value)} />
                    </Field>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <Field label="Hashtags">
                            <input className={inputCls} value={form.hashtags || ''}
                                placeholder="#suspensão #wtech #motocross"
                                onChange={e => set('hashtags', e.target.value)} />
                        </Field>
                        <Field label="Referência">
                            <input className={inputCls} value={form.reference || ''}
                                placeholder="Post antigo, concorrente, marca…"
                                onChange={e => set('reference', e.target.value)} />
                        </Field>
                    </div>
                    <Field label="Observações / validações pendentes">
                        <input className={inputCls} value={form.obs || ''}
                            placeholder="Ex.: confirmar peça com o Serginho; corrida com Alex/Kaká"
                            onChange={e => set('obs', e.target.value)} />
                    </Field>
                    <label className="flex items-center gap-2 text-sm text-[var(--admin-text-primary)]">
                        <input type="checkbox" checked={form.paid_traffic}
                            onChange={e => set('paid_traffic', e.target.checked)} />
                        <span className="font-bold">Tráfego pago</span>
                    </label>
                </div>

                {error && (
                    <p className="mt-4 flex items-center gap-2 text-sm font-bold text-red-500">
                        <AlertTriangle size={16} /> {error}
                    </p>
                )}

                <div className="mt-6 flex items-center justify-between gap-3">
                    {form.id ? (
                        <button onClick={handleDelete} disabled={deleting}
                            className="flex items-center gap-2 rounded-lg border border-red-500/40 px-4 py-2 text-sm font-bold text-red-500 hover:bg-red-500/10 disabled:opacity-50">
                            {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />} Excluir
                        </button>
                    ) : <span />}
                    <div className="flex gap-3">
                        <button onClick={onClose}
                            className="rounded-lg border border-[var(--admin-border)] px-4 py-2 text-sm font-bold text-[var(--admin-text-secondary)] hover:bg-gray-500/10">
                            Cancelar
                        </button>
                        <button onClick={handleSave} disabled={saving}
                            className="flex items-center gap-2 rounded-lg bg-black px-5 py-2 text-sm font-bold text-white shadow-lg hover:opacity-90 disabled:opacity-50 dark:bg-white dark:text-black">
                            {saving && <Loader2 size={16} className="animate-spin" />} Salvar card
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ─── Modal de sugestões da IA (preview → aprovação) ──────────────────────────

interface SuggestionsModalProps {
    suggestions: ContentPostInput[];
    onClose: () => void;
    onApproved: () => void;
}

const AISuggestionsModal = ({ suggestions, onClose, onApproved }: SuggestionsModalProps) => {
    // Todas selecionadas por padrão — a equipe desmarca o que não quiser
    const [selected, setSelected] = useState<Set<number>>(new Set(suggestions.map((_, i) => i)));
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const toggle = (i: number) =>
        setSelected(prev => {
            const next = new Set(prev);
            next.has(i) ? next.delete(i) : next.add(i);
            return next;
        });

    const handleApprove = async () => {
        setSaving(true);
        setError('');
        try {
            for (const i of selected) {
                await saveContentPost(suggestions[i]);
            }
            onApproved();
        } catch (e: any) {
            setError(e?.message || 'Erro ao salvar as sugestões.');
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
            <div
                className="w-full max-w-3xl max-h-[90vh] overflow-y-auto custom-scrollbar rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface-1)] p-6 shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                <div className="mb-1 flex items-center justify-between">
                    <h3 className="flex items-center gap-2 text-xl font-black text-[var(--admin-text-primary)]">
                        <Sparkles size={20} className="text-wtech-gold" /> Sugestões da IA
                    </h3>
                    <button onClick={onClose} className="rounded-lg p-2 text-gray-500 hover:bg-gray-500/10" aria-label="Fechar">
                        <X size={18} />
                    </button>
                </div>
                <p className="mb-4 text-sm text-[var(--admin-text-secondary)]">
                    Revise, desmarque o que não quiser e aprove — nada é salvo sem a sua aprovação.
                    Depois de salvar, cada card pode ser refinado normalmente no calendário.
                </p>

                <div className="space-y-3">
                    {suggestions.map((s, i) => (
                        <label key={i}
                            className={`block cursor-pointer rounded-xl border p-4 transition-colors ${
                                selected.has(i)
                                    ? 'border-wtech-gold/60 bg-wtech-gold/5'
                                    : 'border-[var(--admin-border)] opacity-60'
                            }`}>
                            <div className="flex items-start gap-3">
                                <input type="checkbox" className="mt-1" checked={selected.has(i)} onChange={() => toggle(i)} />
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="font-black text-[var(--admin-text-primary)]">
                                            {formatEmoji(s.format)} {s.title}
                                        </span>
                                        <span className="text-xs font-bold text-[var(--admin-text-secondary)]">
                                            {s.post_date.split('-').reverse().join('/')}
                                        </span>
                                        <span className="rounded-full border border-[var(--admin-border)] px-2 py-0.5 text-[10px] font-bold text-[var(--admin-text-secondary)]">
                                            {s.category}
                                        </span>
                                        {s.editorial && (
                                            <span className="rounded-full border border-[var(--admin-border)] px-2 py-0.5 text-[10px] font-bold text-[var(--admin-text-secondary)]">
                                                {s.editorial}
                                            </span>
                                        )}
                                    </div>
                                    {s.content && (
                                        <p className="mt-2 text-sm text-[var(--admin-text-primary)]">{s.content}</p>
                                    )}
                                    {s.caption && (
                                        <p className="mt-1 text-xs italic text-[var(--admin-text-secondary)]">Legenda: {s.caption}</p>
                                    )}
                                    {s.obs && (
                                        <p className="mt-1 flex items-center gap-1 text-xs font-bold text-amber-500">
                                            <AlertTriangle size={12} /> {s.obs}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </label>
                    ))}
                </div>

                {error && (
                    <p className="mt-4 flex items-center gap-2 text-sm font-bold text-red-500">
                        <AlertTriangle size={16} /> {error}
                    </p>
                )}

                <div className="mt-6 flex items-center justify-end gap-3">
                    <button onClick={onClose}
                        className="rounded-lg border border-[var(--admin-border)] px-4 py-2 text-sm font-bold text-[var(--admin-text-secondary)] hover:bg-gray-500/10">
                        Descartar tudo
                    </button>
                    <button onClick={handleApprove} disabled={saving || selected.size === 0}
                        className="flex items-center gap-2 rounded-lg bg-black px-5 py-2 text-sm font-bold text-white shadow-lg hover:opacity-90 disabled:opacity-50 dark:bg-white dark:text-black">
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                        Aprovar e salvar ({selected.size})
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─── View principal ──────────────────────────────────────────────────────────

const ContentPlannerView = () => {
    const [anchor, setAnchor] = useState(() => new Date());
    const [posts, setPosts] = useState<ContentPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [editing, setEditing] = useState<ContentPostInput | null>(null);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiError, setAiError] = useState('');
    const [aiSuggestions, setAiSuggestions] = useState<ContentPostInput[] | null>(null);

    const cells = useMemo(() => buildMonthCells(anchor), [anchor]);

    const load = useCallback(async () => {
        setLoading(true);
        setLoadError('');
        try {
            const data = await fetchContentPosts(toISO(cells[0]), toISO(cells[cells.length - 1]));
            setPosts(data);
        } catch (e: any) {
            // Erro típico: tabela ainda não criada na VPS
            setLoadError(e?.message || 'Erro ao carregar o planejador.');
        } finally {
            setLoading(false);
        }
    }, [cells]);

    useEffect(() => { load(); }, [load]);

    const postsByDay = useMemo(() => {
        const map: Record<string, ContentPost[]> = {};
        for (const p of posts) (map[p.post_date] ||= []).push(p);
        return map;
    }, [posts]);

    const handleGenerateWeek = async () => {
        setAiLoading(true);
        setAiError('');
        try {
            const result = await generateWeekSuggestions();
            if (result.suggestions.length === 0) {
                setAiError('A próxima semana já está toda preenchida — nada a gerar. 🎉');
            } else {
                setAiSuggestions(result.suggestions);
            }
        } catch (e: any) {
            setAiError(e?.message || 'Erro ao gerar sugestões com IA.');
        } finally {
            setAiLoading(false);
        }
    };

    const todayISO = toISO(new Date());
    const monthLabel = anchor.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    const shiftMonth = (delta: number) =>
        setAnchor(prev => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));

    return (
        <div className="p-4 md:p-6">
            {/* Header */}
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                    <h3 className="flex items-center gap-2 text-2xl font-black text-[var(--admin-text-primary)]">
                        <CalendarDays className="text-wtech-gold" /> Planejador de Conteúdo
                    </h3>
                    <p className="mt-1 text-sm text-[var(--admin-text-secondary)]">
                        Padrão da semana: <b>dom/ter/qui</b> produto · <b>seg/qua/sex</b> dicas · <b>sáb</b> reciclagem/corrida · stories todo dia.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={handleGenerateWeek} disabled={aiLoading}
                        className="mr-1 flex items-center gap-2 rounded-lg bg-wtech-gold px-4 py-2 text-sm font-black text-black shadow-lg hover:opacity-90 disabled:opacity-60">
                        {aiLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                        {aiLoading ? 'Gerando…' : 'Gerar semana com IA'}
                    </button>
                    <button onClick={() => shiftMonth(-1)} aria-label="Mês anterior"
                        className="rounded-lg border border-[var(--admin-border)] p-2 text-[var(--admin-text-primary)] hover:bg-gray-500/10">
                        <ChevronLeft size={18} />
                    </button>
                    <span className="min-w-[170px] text-center text-sm font-black uppercase tracking-wide text-[var(--admin-text-primary)]">
                        {monthLabel}
                    </span>
                    <button onClick={() => shiftMonth(1)} aria-label="Próximo mês"
                        className="rounded-lg border border-[var(--admin-border)] p-2 text-[var(--admin-text-primary)] hover:bg-gray-500/10">
                        <ChevronRight size={18} />
                    </button>
                    <button onClick={() => setAnchor(new Date())}
                        className="ml-1 rounded-lg border border-[var(--admin-border)] px-3 py-2 text-xs font-bold text-[var(--admin-text-secondary)] hover:bg-gray-500/10">
                        Hoje
                    </button>
                </div>
            </div>

            {/* Legenda de status */}
            <div className="mb-4 flex flex-wrap gap-2">
                {STATUS_OPTIONS.map(s => (
                    <span key={s.value} className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${STATUS_META[s.value].chip}`}>
                        {s.label}
                    </span>
                ))}
            </div>

            {aiError && (
                <div className="mb-4 flex items-start gap-3 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-1)] p-4 text-sm text-[var(--admin-text-primary)]">
                    <Sparkles className="mt-0.5 shrink-0 text-wtech-gold" size={18} />
                    <div>
                        <p className="font-bold">{aiError}</p>
                        {aiError.toLowerCase().includes('key') || aiError.toLowerCase().includes('configurada') ? (
                            <p className="mt-1 text-[var(--admin-text-secondary)]">
                                Configure o provedor e a chave de IA em Configurações → Inteligência Artificial.
                            </p>
                        ) : null}
                    </div>
                </div>
            )}

            {loadError && (
                <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-[var(--admin-text-primary)]">
                    <AlertTriangle className="mt-0.5 shrink-0 text-amber-500" size={18} />
                    <div>
                        <p className="font-bold">Não consegui carregar o planejador.</p>
                        <p className="mt-1 text-[var(--admin-text-secondary)]">
                            Se a tabela ainda não existe, rode <code className="font-mono">create_content_planner.sql</code> no
                            SQL Editor do banco. Detalhe: {loadError}
                        </p>
                    </div>
                </div>
            )}

            {/* Grid do calendário */}
            <div className="overflow-x-auto custom-scrollbar">
                <div className="min-w-[840px]">
                    <div className="grid grid-cols-7 gap-px rounded-t-xl border border-b-0 border-[var(--admin-border)] bg-[var(--admin-border)] overflow-hidden">
                        {WEEKDAY_LABELS.map((w, i) => (
                            <div key={w} className="bg-[var(--admin-surface-1)] px-2 py-2 text-center">
                                <span className="text-xs font-black tracking-wider text-[var(--admin-text-primary)]">{w}</span>
                                <span className="block text-[10px] font-medium text-[var(--admin-text-secondary)]">{WEEKDAY_HINTS[i]}</span>
                            </div>
                        ))}
                    </div>
                    <div className="grid grid-cols-7 gap-px rounded-b-xl border border-[var(--admin-border)] bg-[var(--admin-border)] overflow-hidden">
                        {cells.map(day => {
                            const iso = toISO(day);
                            const inMonth = day.getMonth() === anchor.getMonth();
                            const dayPosts = postsByDay[iso] || [];
                            const isToday = iso === todayISO;
                            return (
                                <div key={iso}
                                    className={`group min-h-[112px] bg-[var(--admin-surface-1)] p-1.5 ${inMonth ? '' : 'opacity-40'}`}>
                                    <div className="flex items-center justify-between">
                                        <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-black ${
                                            isToday ? 'bg-wtech-gold text-black' : 'text-[var(--admin-text-secondary)]'
                                        }`}>
                                            {day.getDate()}
                                        </span>
                                        <button onClick={() => setEditing(emptyPost(iso))} aria-label={`Novo card em ${iso}`}
                                            className="rounded p-1 text-gray-400 opacity-0 transition-opacity hover:bg-gray-500/10 hover:text-wtech-gold group-hover:opacity-100">
                                            <Plus size={14} />
                                        </button>
                                    </div>
                                    <div className="mt-1 space-y-1">
                                        {dayPosts.map(p => (
                                            <button key={p.id} onClick={() => setEditing({ ...p })}
                                                title={`${p.title}${p.editorial ? ` — ${p.editorial}` : ''}`}
                                                className={`block w-full truncate rounded-md border px-1.5 py-1 text-left text-[11px] font-bold leading-tight ${STATUS_META[p.status]?.chip || STATUS_META.nao_iniciado.chip}`}>
                                                {formatEmoji(p.format)} {p.title}
                                            </button>
                                        ))}
                                        {dayPosts.length === 0 && inMonth && !loading && (
                                            <button onClick={() => setEditing(emptyPost(iso))}
                                                className="block w-full rounded-md border border-dashed border-[var(--admin-border)] px-1.5 py-1 text-left text-[10px] font-medium text-gray-400 hover:border-wtech-gold hover:text-wtech-gold">
                                                + {WEEKDAY_HINTS[day.getDay()]}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {loading && (
                <div className="mt-4 flex items-center justify-center gap-2 text-sm text-[var(--admin-text-secondary)]">
                    <Loader2 size={16} className="animate-spin" /> Carregando planejador…
                </div>
            )}

            {editing && (
                <PostEditor
                    post={editing}
                    onClose={() => setEditing(null)}
                    onSaved={() => { setEditing(null); load(); }}
                />
            )}

            {aiSuggestions && (
                <AISuggestionsModal
                    suggestions={aiSuggestions}
                    onClose={() => setAiSuggestions(null)}
                    onApproved={() => { setAiSuggestions(null); load(); }}
                />
            )}
        </div>
    );
};

export default ContentPlannerView;
