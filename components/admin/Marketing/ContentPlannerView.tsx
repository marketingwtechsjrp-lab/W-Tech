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
    AlertTriangle, Sparkles, Check, Pencil, Copy, Clapperboard, Images,
    Camera, Timer, TrendingUp, Target as TargetIcon, RefreshCw, ListChecks,
} from 'lucide-react';
import {
    ContentPost, ContentPostInput, ContentPostStatus, PostAIDetail,
    STATUS_OPTIONS, FORMAT_OPTIONS, CATEGORY_OPTIONS, NETWORK_OPTIONS,
    EDITORIAL_QUADROS, WEEKDAY_HINTS,
    fetchContentPosts, saveContentPost, deleteContentPost,
} from '../../../lib/contentPlanner';
import { generateWeekSuggestions, generateDetailedPost } from '../../../lib/contentPlannerAI';
import {
    InstagramPostMetric, fetchInstagramMetrics, topByEngagement,
    summarizeByFormat, engagementRate,
} from '../../../lib/instagramMetrics';

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
    ai_detail: null,
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

// ─── Radar do Instagram (métricas reais → calibram a IA) ─────────────────────

const TYPE_LABEL: Record<string, string> = {
    REELS: '🎦 Reels',
    IMAGE: '📃 Foto',
    CAROUSEL_ALBUM: '📚 Carrossel',
    VIDEO: '🎦 Vídeo',
};

const InstagramRadar = () => {
    const [metrics, setMetrics] = useState<InstagramPostMetric[]>([]);
    const [open, setOpen] = useState(false);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        fetchInstagramMetrics(90)
            .then(setMetrics)
            .catch(() => setMetrics([]))
            .finally(() => setLoaded(true));
    }, []);

    if (!loaded || metrics.length === 0) return null;

    const formats = summarizeByFormat(metrics);
    const top = topByEngagement(metrics, 5);
    const best = formats[0];
    const worst = formats[formats.length - 1];

    return (
        <div className="mb-4 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-1)]">
            <button onClick={() => setOpen(!open)}
                className="flex w-full flex-wrap items-center justify-between gap-2 p-4 text-left">
                <span className="flex items-center gap-2 text-sm font-black text-[var(--admin-text-primary)]">
                    <TrendingUp size={16} className="text-wtech-gold" />
                    Radar do Instagram — últimos 90 dias ({metrics.length} posts)
                </span>
                <span className="text-xs font-bold text-[var(--admin-text-secondary)]">
                    {best && worst && best.media_type !== worst.media_type
                        ? `${TYPE_LABEL[best.media_type] || best.media_type} engaja ${worst.avg_engagement > 0 ? Math.round(best.avg_engagement / worst.avg_engagement) : '?' }x mais que ${TYPE_LABEL[worst.media_type] || worst.media_type} · `
                        : ''}
                    {open ? 'ocultar ▲' : 'ver detalhes ▼'}
                </span>
            </button>
            {open && (
                <div className="border-t border-[var(--admin-border)] p-4">
                    {/* Médias por formato */}
                    <div className="mb-4 flex flex-wrap gap-2">
                        {formats.map(f => (
                            <span key={f.media_type}
                                className="rounded-full border border-[var(--admin-border)] px-3 py-1 text-xs font-bold text-[var(--admin-text-primary)]">
                                {TYPE_LABEL[f.media_type] || f.media_type}: {f.avg_engagement} eng. médio · {f.avg_reach} alcance · ER {f.avg_er.toFixed(1)}% ({f.posts} posts)
                            </span>
                        ))}
                    </div>
                    {/* Top posts */}
                    <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-[var(--admin-text-secondary)]">Top 5 por engajamento — candidatos a reciclagem</p>
                    <div className="space-y-1.5">
                        {top.map(m => (
                            <a key={m.media_id} href={m.permalink || '#'} target="_blank" rel="noreferrer"
                                className="flex flex-wrap items-center gap-x-3 gap-y-0.5 rounded-lg border border-[var(--admin-border)] px-3 py-2 text-xs hover:border-wtech-gold">
                                <span className="font-bold text-[var(--admin-text-primary)]">
                                    {TYPE_LABEL[m.media_type]?.split(' ')[0]} {(m.caption || 'sem legenda').slice(0, 60)}{(m.caption || '').length > 60 ? '…' : ''}
                                </span>
                                <span className="text-[var(--admin-text-secondary)]">
                                    {m.posted_at.slice(0, 10).split('-').reverse().join('/')} · eng <b className="text-emerald-500">{m.engagement}</b> · alcance {m.reach} · ER {engagementRate(m).toFixed(1)}% · 💾{m.saved ?? 0} · ↗️{m.shares ?? 0}
                                </span>
                            </a>
                        ))}
                    </div>
                    <p className="mt-3 text-[11px] text-[var(--admin-text-secondary)]">
                        Estes dados são injetados automaticamente na geração por IA (semana e post detalhado) para priorizar temáticas comprovadas.
                    </p>
                </div>
            )}
        </div>
    );
};

// ─── Tela dedicada do post (detalhamento gerado por IA) ──────────────────────

/** Bloco de nota (engajamento/conversão) com justificativa. */
const ScoreCard = ({ icon: Icon, label, score, accent }: {
    icon: React.ComponentType<{ size?: number; className?: string }>;
    label: string;
    score?: { nota: number; justificativa: string; gatilhos?: string[]; funil?: string };
    accent: string;
}) => {
    if (!score) return null;
    return (
        <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-1)] p-4">
            <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-[var(--admin-text-secondary)]">
                    <Icon size={14} className={accent} /> {label}
                </span>
                <span className={`text-2xl font-black ${accent}`}>{score.nota}<span className="text-sm text-[var(--admin-text-secondary)]">/10</span></span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-500/20">
                <div className={`h-full rounded-full ${accent.replace('text-', 'bg-')}`} style={{ width: `${Math.min(10, Math.max(0, score.nota)) * 10}%` }} />
            </div>
            <p className="mt-2 text-xs leading-relaxed text-[var(--admin-text-secondary)]">{score.justificativa}</p>
            {(score.gatilhos?.length || score.funil) && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                    {score.gatilhos?.map(g => (
                        <span key={g} className="rounded-full border border-[var(--admin-border)] px-2 py-0.5 text-[10px] font-bold text-[var(--admin-text-secondary)]">{g}</span>
                    ))}
                    {score.funil && (
                        <span className="rounded-full border border-wtech-gold/50 bg-wtech-gold/10 px-2 py-0.5 text-[10px] font-bold text-[var(--admin-text-primary)]">funil: {score.funil}</span>
                    )}
                </div>
            )}
        </div>
    );
};

const SectionTitle = ({ icon: Icon, children }: {
    icon: React.ComponentType<{ size?: number; className?: string }>;
    children: React.ReactNode;
}) => (
    <h4 className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-wide text-[var(--admin-text-primary)]">
        <Icon size={16} className="text-wtech-gold" /> {children}
    </h4>
);

interface PostDetailViewProps {
    post: ContentPost;
    onClose: () => void;
    onEdit: (post: ContentPost) => void;
    onChanged: () => void;
}

const PostDetailView = ({ post, onClose, onEdit, onChanged }: PostDetailViewProps) => {
    const [detail, setDetail] = useState<PostAIDetail | null>(post.ai_detail);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);

    const dataBR = post.post_date.split('-').reverse().join('/');
    const formatMeta = FORMAT_OPTIONS.find(f => f.value === post.format);

    const handleGenerate = async () => {
        setGenerating(true);
        setError('');
        try {
            const d = await generateDetailedPost(post);
            setDetail(d);
            // Persiste no card — o detalhamento sobrevive a reload e aparece pra equipe toda
            const { id, created_at, updated_at, ...fields } = post;
            await saveContentPost({ ...fields, id, ai_detail: d });
            onChanged();
        } catch (e: any) {
            setError(e?.message || 'Erro ao gerar o post detalhado.');
        } finally {
            setGenerating(false);
        }
    };

    const copyCaption = async () => {
        const text = [detail?.legenda, detail?.hashtags].filter(Boolean).join('\n\n');
        if (!text) return;
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch { /* clipboard indisponível — sem fallback necessário */ }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-2 md:p-6" onClick={onClose}>
            <div
                className="flex h-full max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface-1)] shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                {/* Cabeçalho fixo */}
                <div className="flex items-start justify-between gap-3 border-b border-[var(--admin-border)] p-5">
                    <div className="min-w-0">
                        <h3 className="truncate text-2xl font-black text-[var(--admin-text-primary)]">
                            {formatMeta?.emoji} {post.title}
                        </h3>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2">
                            <span className="text-sm font-bold text-[var(--admin-text-secondary)]">{dataBR}</span>
                            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${STATUS_META[post.status]?.chip}`}>
                                {STATUS_META[post.status]?.label}
                            </span>
                            <span className="rounded-full border border-[var(--admin-border)] px-2 py-0.5 text-[10px] font-bold text-[var(--admin-text-secondary)]">{post.category}</span>
                            {post.editorial && (
                                <span className="rounded-full border border-[var(--admin-border)] px-2 py-0.5 text-[10px] font-bold text-[var(--admin-text-secondary)]">{post.editorial}</span>
                            )}
                            <span className="rounded-full border border-[var(--admin-border)] px-2 py-0.5 text-[10px] font-bold text-[var(--admin-text-secondary)]">{formatMeta?.label}</span>
                        </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                        <button onClick={() => onEdit(post)}
                            className="flex items-center gap-1.5 rounded-lg border border-[var(--admin-border)] px-3 py-2 text-xs font-bold text-[var(--admin-text-primary)] hover:bg-gray-500/10">
                            <Pencil size={14} /> Editar card
                        </button>
                        <button onClick={onClose} className="rounded-lg p-2 text-gray-500 hover:bg-gray-500/10" aria-label="Fechar">
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Corpo rolável */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-5">
                    {/* Pauta original */}
                    {(post.content || post.objective) && (
                        <div className="mb-5 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-2,transparent)] p-4">
                            {post.content && <p className="text-sm text-[var(--admin-text-primary)]">{post.content}</p>}
                            {post.objective && <p className="mt-1 text-xs italic text-[var(--admin-text-secondary)]">Objetivo: {post.objective}</p>}
                            {post.obs && (
                                <p className="mt-2 flex items-center gap-1 text-xs font-bold text-amber-500">
                                    <AlertTriangle size={12} /> {post.obs}
                                </p>
                            )}
                        </div>
                    )}

                    {!detail && !generating && (
                        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[var(--admin-border)] px-6 py-16 text-center">
                            <Sparkles size={40} className="mb-4 text-wtech-gold" />
                            <p className="max-w-md text-sm text-[var(--admin-text-secondary)]">
                                Gere o <b className="text-[var(--admin-text-primary)]">post detalhado</b> desta pauta:
                                {post.format === 'video' && ' roteiro do Reels cena a cena, com falas prontas e texto na tela,'}
                                {post.format === 'carrossel' && ' carrossel slide a slide, com textos e direção de arte,'}
                                {post.format === 'estatico' && ' direção completa da foto e texto na imagem,'}
                                {post.format === 'stories' && ' sequência de stories tela a tela,'}
                                {' '}+ notas de engajamento e conversão, legenda final, trilha e checklist de produção.
                            </p>
                            <button onClick={handleGenerate}
                                className="mt-6 flex items-center gap-2 rounded-lg bg-wtech-gold px-6 py-3 text-sm font-black text-black shadow-lg hover:opacity-90">
                                <Sparkles size={16} /> Gerar post detalhado com IA
                            </button>
                        </div>
                    )}

                    {generating && (
                        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-wtech-gold/40 px-6 py-16 text-center">
                            <Loader2 size={36} className="mb-4 animate-spin text-wtech-gold" />
                            <p className="text-sm font-bold text-[var(--admin-text-primary)]">Gerando post detalhado…</p>
                            <p className="mt-1 text-xs text-[var(--admin-text-secondary)]">Roteiro, notas de engajamento/conversão, legenda e checklist (leva ~20s)</p>
                        </div>
                    )}

                    {error && (
                        <p className="mt-4 flex items-center gap-2 text-sm font-bold text-red-500">
                            <AlertTriangle size={16} /> {error}
                        </p>
                    )}

                    {detail && !generating && (
                        <div className="space-y-6">
                            {/* Gancho */}
                            {detail.gancho && (
                                <div className="rounded-xl border border-wtech-gold/50 bg-wtech-gold/10 p-4">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-[var(--admin-text-secondary)]">Gancho — 3 primeiros segundos</span>
                                    <p className="mt-1 text-lg font-black leading-snug text-[var(--admin-text-primary)]">“{detail.gancho}”</p>
                                </div>
                            )}

                            {/* Notas */}
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <ScoreCard icon={TrendingUp} label="Potencial de engajamento" score={detail.engajamento} accent="text-emerald-500" />
                                <ScoreCard icon={TargetIcon} label="Potencial de conversão" score={detail.conversao} accent="text-wtech-gold" />
                            </div>

                            {/* Público + horário */}
                            {(detail.publico || detail.melhor_horario) && (
                                <div className="flex flex-col gap-2 rounded-xl border border-[var(--admin-border)] p-4 text-sm md:flex-row md:items-center md:gap-6">
                                    {detail.publico && (
                                        <span className="text-[var(--admin-text-primary)]"><b>Público:</b> {detail.publico}</span>
                                    )}
                                    {detail.melhor_horario && (
                                        <span className="flex items-center gap-1.5 text-[var(--admin-text-primary)]"><Timer size={14} className="text-wtech-gold" /> <b>Melhor horário:</b> {detail.melhor_horario}</span>
                                    )}
                                </div>
                            )}

                            {/* Roteiro do Reels */}
                            {detail.tipo === 'reels' && detail.cenas && detail.cenas.length > 0 && (
                                <div>
                                    <SectionTitle icon={Clapperboard}>Roteiro do Reels — cena a cena</SectionTitle>
                                    <div className="space-y-2">
                                        {detail.cenas.map((cena, i) => (
                                            <div key={i} className="rounded-xl border border-[var(--admin-border)] p-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="rounded-md bg-wtech-gold px-2 py-0.5 text-[11px] font-black text-black">{cena.tempo}</span>
                                                    <span className="text-xs font-bold text-[var(--admin-text-secondary)]">{cena.acao}</span>
                                                </div>
                                                {cena.fala && <p className="mt-2 text-sm leading-relaxed text-[var(--admin-text-primary)]">🗣 “{cena.fala}”</p>}
                                                {cena.texto_tela && <p className="mt-1 text-xs font-bold text-[var(--admin-text-secondary)]">Texto na tela: {cena.texto_tela}</p>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Carrossel */}
                            {detail.tipo === 'carrossel' && detail.slides && detail.slides.length > 0 && (
                                <div>
                                    <SectionTitle icon={Images}>Carrossel — slide a slide</SectionTitle>
                                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                        {detail.slides.map(slide => (
                                            <div key={slide.n} className="rounded-xl border border-[var(--admin-border)] p-4">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-wtech-gold">Slide {slide.n}</span>
                                                <p className="mt-1 font-black text-[var(--admin-text-primary)]">{slide.titulo}</p>
                                                <p className="mt-1 text-sm leading-relaxed text-[var(--admin-text-primary)]">{slide.texto}</p>
                                                {slide.arte && <p className="mt-2 text-xs italic text-[var(--admin-text-secondary)]">Arte: {slide.arte}</p>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Foto (post estático) */}
                            {detail.tipo === 'estatico' && detail.foto && (
                                <div>
                                    <SectionTitle icon={Camera}>Direção da foto</SectionTitle>
                                    <div className="rounded-xl border border-[var(--admin-border)] p-4">
                                        {detail.foto.direcao && <p className="text-sm leading-relaxed text-[var(--admin-text-primary)]">{detail.foto.direcao}</p>}
                                        {detail.foto.texto_imagem && <p className="mt-2 text-xs font-bold text-[var(--admin-text-secondary)]">Texto na imagem: {detail.foto.texto_imagem}</p>}
                                    </div>
                                </div>
                            )}

                            {/* Stories */}
                            {detail.tipo === 'stories' && detail.telas && detail.telas.length > 0 && (
                                <div>
                                    <SectionTitle icon={Timer}>Sequência de stories</SectionTitle>
                                    <div className="space-y-2">
                                        {detail.telas.map(tela => (
                                            <div key={tela.n} className="rounded-xl border border-[var(--admin-border)] p-4">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-wtech-gold">Story {tela.n}</span>
                                                <p className="mt-1 text-sm leading-relaxed text-[var(--admin-text-primary)]">{tela.conteudo}</p>
                                                {tela.sticker && <p className="mt-1 text-xs font-bold text-[var(--admin-text-secondary)]">Sticker: {tela.sticker}</p>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* CTA + legenda */}
                            {detail.cta && (
                                <div className="rounded-xl border border-[var(--admin-border)] p-4">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-[var(--admin-text-secondary)]">CTA</span>
                                    <p className="mt-1 font-bold text-[var(--admin-text-primary)]">{detail.cta}</p>
                                </div>
                            )}
                            {detail.legenda && (
                                <div className="rounded-xl border border-[var(--admin-border)] p-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-[var(--admin-text-secondary)]">Legenda pronta</span>
                                        <button onClick={copyCaption}
                                            className="flex items-center gap-1.5 rounded-lg border border-[var(--admin-border)] px-2.5 py-1.5 text-xs font-bold text-[var(--admin-text-primary)] hover:bg-gray-500/10">
                                            {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />} {copied ? 'Copiada!' : 'Copiar'}
                                        </button>
                                    </div>
                                    <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-[var(--admin-text-primary)]">{detail.legenda}</p>
                                    {detail.hashtags && <p className="mt-2 text-xs font-bold text-wtech-gold">{detail.hashtags}</p>}
                                </div>
                            )}

                            {/* Trilha + checklist */}
                            {detail.trilha && (
                                <p className="text-sm text-[var(--admin-text-secondary)]">🎵 <b>Trilha:</b> {detail.trilha}</p>
                            )}
                            {detail.checklist && detail.checklist.length > 0 && (
                                <div>
                                    <SectionTitle icon={ListChecks}>Checklist de produção</SectionTitle>
                                    <ul className="space-y-1.5">
                                        {detail.checklist.map((item, i) => (
                                            <li key={i} className="flex items-start gap-2 text-sm text-[var(--admin-text-primary)]">
                                                <span className="mt-0.5 inline-block h-4 w-4 shrink-0 rounded border border-[var(--admin-border)]" /> {item}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Rodapé fixo */}
                {detail && !generating && (
                    <div className="flex items-center justify-between border-t border-[var(--admin-border)] p-4">
                        <button onClick={handleGenerate}
                            className="flex items-center gap-2 rounded-lg border border-[var(--admin-border)] px-4 py-2 text-sm font-bold text-[var(--admin-text-secondary)] hover:bg-gray-500/10">
                            <RefreshCw size={14} /> Regenerar
                        </button>
                        <button onClick={onClose}
                            className="rounded-lg bg-black px-5 py-2 text-sm font-bold text-white shadow-lg hover:opacity-90 dark:bg-white dark:text-black">
                            Fechar
                        </button>
                    </div>
                )}
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
    const [viewing, setViewing] = useState<ContentPost | null>(null);
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

            {/* Radar de desempenho real do Instagram */}
            <InstagramRadar />

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
                                            <button key={p.id} onClick={() => setViewing(p)}
                                                title={`${p.title}${p.editorial ? ` — ${p.editorial}` : ''}`}
                                                className={`block w-full truncate rounded-md border px-1.5 py-1 text-left text-[11px] font-bold leading-tight ${STATUS_META[p.status]?.chip || STATUS_META.nao_iniciado.chip}`}>
                                                {formatEmoji(p.format)} {p.title}{p.ai_detail ? ' ✨' : ''}
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

            {viewing && (
                <PostDetailView
                    post={viewing}
                    onClose={() => setViewing(null)}
                    onEdit={p => { setViewing(null); setEditing({ ...p }); }}
                    onChanged={load}
                />
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
