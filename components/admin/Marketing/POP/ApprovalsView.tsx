import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    MessageCircle, Settings2, Send, Loader2, Upload, X, FileText, Film,
    CheckCircle2, XCircle, RefreshCw, ChevronDown, ChevronUp, Clock, Users,
    Image as ImageIcon, Circle, ArrowRight,
} from 'lucide-react';
import { supabase } from '../../../../lib/supabaseClient';
import { useAuth } from '../../../../context/AuthContext';
import {
    approvalsApi, PopApiError, timeSince, formatDateTime, prettyEvent,
    APPROVAL_STATUS_CHIP, COURSE_ALERT_DEFAULTS,
    type ApprovalItem, type ApprovalEvent, type ApprovalSettings,
    type WhatsAppGroup, type CampaignRequest,
} from '../../../../lib/popMarketing';
import type { PopNotify } from './PopMarketingView';

/**
 * Aprovações via WhatsApp — envia materiais (imagem/vídeo/PDF) para o grupo
 * configurado na Evolution API e acompanha as decisões em tempo quase real
 * (polling de 10s). Consome exclusivamente as rotas /api/approvals/* do
 * backend Express (contrato fixo).
 * Fase 2: as configurações incluem o grupo do time de Marketing (destino dos
 * compartilhamentos internos) e os parâmetros do alerta de turmas (POP 8.4).
 */

interface ApprovalsViewProps {
    notify: PopNotify;
    /** Pedido pré-vinculado quando o usuário veio do detalhe do pedido. */
    pendingRequestId: string | null;
    onConsumePendingRequest: () => void;
}

const POLL_INTERVAL_MS = 10_000;

const inputCls = 'w-full bg-[var(--admin-surface-2)] border border-[var(--admin-border)] rounded-xl px-4 py-2.5 text-sm text-[var(--admin-text-primary)] outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 dark:focus:ring-green-900/20 transition-all font-medium';
const labelCls = 'block text-[10px] font-black uppercase tracking-widest text-[var(--admin-text-tertiary)] mb-1.5';

/** Ícone conforme o tipo de mídia anexada. */
const mediaIcon = (type: string) => {
    if (type.startsWith('image')) return <ImageIcon size={14} />;
    if (type.startsWith('video')) return <Film size={14} />;
    return <FileText size={14} />;
};

const eventIcon = (event: string) => {
    if (event.includes('aprovado')) return <CheckCircle2 size={13} className="text-green-500" />;
    if (event.includes('reprovado')) return <XCircle size={13} className="text-red-500" />;
    if (event.includes('enviado')) return <Send size={13} className="text-blue-500" />;
    if (event.includes('status')) return <ArrowRight size={13} className="text-purple-500" />;
    return <Circle size={9} className="text-gray-400" />;
};

const ApprovalsView = ({ notify, pendingRequestId, onConsumePendingRequest }: ApprovalsViewProps) => {
    const { user } = useAuth();

    // ── Configuração (instância + grupo) ──
    const [settings, setSettings] = useState<ApprovalSettings | null>(null);
    const [isSettingsLoading, setIsSettingsLoading] = useState(true);
    const [showConfig, setShowConfig] = useState(false);
    const [cfgInstance, setCfgInstance] = useState('');
    const [cfgGroups, setCfgGroups] = useState<WhatsAppGroup[]>([]);
    const [cfgGroupJid, setCfgGroupJid] = useState('');
    const [isGroupsLoading, setIsGroupsLoading] = useState(false);
    const [isSavingCfg, setIsSavingCfg] = useState(false);
    // Fase 2 — grupo do time de Marketing + alerta de ocupação de turmas
    const [cfgTeamGroupJid, setCfgTeamGroupJid] = useState('');
    const [cfgAlertDays, setCfgAlertDays] = useState(String(COURSE_ALERT_DEFAULTS.days));
    const [cfgAlertMinPct, setCfgAlertMinPct] = useState(String(COURSE_ALERT_DEFAULTS.min_pct));

    // ── Formulário de envio ──
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [files, setFiles] = useState<File[]>([]);
    const [previews, setPreviews] = useState<Record<string, string>>({});
    const [uploadProgress, setUploadProgress] = useState<number | null>(null);
    const [isSending, setIsSending] = useState(false);
    const [requestId, setRequestId] = useState('');
    const [linkableRequests, setLinkableRequests] = useState<CampaignRequest[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // ── Lista de itens ──
    const [items, setItems] = useState<ApprovalItem[]>([]);
    const [isListLoading, setIsListLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [eventsByItem, setEventsByItem] = useState<Record<number, ApprovalEvent[]>>({});
    const [decideTarget, setDecideTarget] = useState<{ item: ApprovalItem; decision: 'Aprovado' | 'Reprovado' } | null>(null);
    const [decideNote, setDecideNote] = useState('');
    const [isDeciding, setIsDeciding] = useState(false);
    const pollErrorNotified = useRef(false);

    // ── Carga inicial de configurações ──
    const fetchSettings = async () => {
        setIsSettingsLoading(true);
        try {
            const s = await approvalsApi.getSettings();
            setSettings(s);
            setCfgInstance(s.instance || '');
            setCfgGroupJid(s.group_jid || '');
            setCfgTeamGroupJid(s.team_group_jid || '');
            setCfgAlertDays(String(s.course_alert_days ?? COURSE_ALERT_DEFAULTS.days));
            setCfgAlertMinPct(String(s.course_alert_min_pct ?? COURSE_ALERT_DEFAULTS.min_pct));
            setShowConfig(!s.configured);
        } catch (err) {
            console.error('Erro ao carregar configurações de aprovação:', err);
            setSettings(null);
            setShowConfig(true);
            notify('info', 'Backend de aprovações indisponível — configure quando o servidor estiver no ar.');
        } finally {
            setIsSettingsLoading(false);
        }
    };

    // ── Lista com polling de 10s (status "ao vivo") ──
    const fetchItems = async (showSpinner: boolean) => {
        if (showSpinner) setIsListLoading(true);
        try {
            const list = await approvalsApi.list(undefined, 60);
            setItems(list);
            pollErrorNotified.current = false;
        } catch (err) {
            console.error('Erro ao listar aprovações:', err);
            if (showSpinner) setItems([]);
            // Evita spam de toast a cada ciclo de polling com o backend fora
            if (!pollErrorNotified.current) {
                pollErrorNotified.current = true;
                if (showSpinner) notify('info', 'Não foi possível carregar as aprovações agora.');
            }
        } finally {
            if (showSpinner) setIsListLoading(false);
        }
    };

    // Pedidos vinculáveis: em Produção ou Em Aprovação (+ o pré-selecionado, se houver)
    const fetchLinkableRequests = async () => {
        try {
            const { data, error } = await supabase
                .from('SITE_CampaignRequests')
                .select('*')
                .in('status', ['Producao', 'Aprovacao'])
                .order('created_at', { ascending: false });
            if (error) throw error;
            let list = (data as CampaignRequest[]) || [];
            // Garante que o pedido vindo do detalhe apareça mesmo fora dos status padrão
            if (pendingRequestId && !list.some(r => r.id === pendingRequestId)) {
                const { data: one } = await supabase
                    .from('SITE_CampaignRequests').select('*').eq('id', pendingRequestId).maybeSingle();
                if (one) list = [one as CampaignRequest, ...list];
            }
            setLinkableRequests(list);
        } catch (err) {
            console.error('Erro ao carregar pedidos vinculáveis:', err);
            setLinkableRequests([]);
        }
    };

    useEffect(() => {
        fetchSettings();
        fetchItems(true);
        fetchLinkableRequests();
        const id = setInterval(() => fetchItems(false), POLL_INTERVAL_MS);
        return () => clearInterval(id); // cleanup obrigatório do polling
    }, []);

    // Consome o pedido pré-vinculado vindo da tela de Pedidos
    useEffect(() => {
        if (pendingRequestId) {
            setRequestId(pendingRequestId);
            onConsumePendingRequest();
        }
    }, [pendingRequestId]);

    // Revoga os object URLs dos previews ao desmontar (evita vazamento)
    useEffect(() => () => {
        Object.values(previews).forEach(url => URL.revokeObjectURL(url));
    }, []);

    const requestTitleById = useMemo(() => {
        const map = new Map<string, string>();
        linkableRequests.forEach(r => map.set(r.id, r.title));
        return map;
    }, [linkableRequests]);

    // ── Configuração guiada ──

    const handleListGroups = async () => {
        if (!cfgInstance.trim()) {
            notify('error', 'Informe o nome da instância da Evolution API.');
            return;
        }
        setIsGroupsLoading(true);
        try {
            const groups = await approvalsApi.listGroups(cfgInstance.trim());
            setCfgGroups(groups);
            if (groups.length === 0) notify('info', 'Nenhum grupo encontrado nesta instância.');
        } catch (err: any) {
            console.error('Erro ao listar grupos:', err);
            notify('error', err?.message || 'Falha ao listar grupos do WhatsApp.');
            setCfgGroups([]);
        } finally {
            setIsGroupsLoading(false);
        }
    };

    const handleSaveConfig = async () => {
        const group = cfgGroups.find(g => g.jid === cfgGroupJid);
        if (!cfgInstance.trim() || !cfgGroupJid) {
            notify('error', 'Selecione a instância e o grupo de aprovação.');
            return;
        }
        setIsSavingCfg(true);
        try {
            const payload: Parameters<typeof approvalsApi.saveSettings>[0] = {
                instance: cfgInstance.trim(),
                group_jid: cfgGroupJid,
                group_name: group?.name || settings?.group_name || '',
                // Alerta de turmas (POP 8.4) — sempre com defaults saneados
                course_alert_days: Math.max(1, parseInt(cfgAlertDays, 10) || COURSE_ALERT_DEFAULTS.days),
                course_alert_min_pct: Math.min(100, Math.max(1, parseInt(cfgAlertMinPct, 10) || COURSE_ALERT_DEFAULTS.min_pct)),
            };
            // Grupo do time só entra quando selecionado (não sobrescreve com vazio)
            if (cfgTeamGroupJid) {
                const teamGroup = cfgGroups.find(g => g.jid === cfgTeamGroupJid);
                payload.team_group_jid = cfgTeamGroupJid;
                payload.team_group_name = teamGroup?.name || settings?.team_group_name || '';
            }
            await approvalsApi.saveSettings(payload);
            notify('success', 'Configurações salvas.');
            await fetchSettings();
        } catch (err: any) {
            console.error('Erro ao salvar configuração:', err);
            notify('error', err?.message || 'Não foi possível salvar a configuração.');
        } finally {
            setIsSavingCfg(false);
        }
    };

    // ── Envio de material ──

    const addFiles = (incoming: FileList | null) => {
        if (!incoming) return;
        const accepted = Array.from(incoming).filter(f =>
            f.type.startsWith('image/') || f.type.startsWith('video/') || f.type === 'application/pdf'
        );
        if (accepted.length < (incoming?.length || 0)) {
            notify('info', 'Apenas imagens, vídeos e PDFs são aceitos.');
        }
        setFiles(prev => [...prev, ...accepted]);
        // Previews só para imagens
        setPreviews(prev => {
            const next = { ...prev };
            accepted.forEach(f => {
                if (f.type.startsWith('image/')) next[`${f.name}_${f.size}`] = URL.createObjectURL(f);
            });
            return next;
        });
    };

    const removeFile = (idx: number) => {
        const file = files[idx];
        const key = `${file.name}_${file.size}`;
        setFiles(prev => prev.filter((_, i) => i !== idx));
        setPreviews(prev => {
            if (!prev[key]) return prev;
            URL.revokeObjectURL(prev[key]);
            const { [key]: _removed, ...rest } = prev;
            return rest;
        });
    };

    const resetForm = () => {
        setTitle('');
        setDescription('');
        setFiles([]);
        Object.values(previews).forEach(url => URL.revokeObjectURL(url));
        setPreviews({});
        setRequestId('');
        setUploadProgress(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) {
            notify('error', 'Informe o título do material.');
            return;
        }
        if (files.length === 0) {
            notify('error', 'Anexe ao menos um arquivo (imagem, vídeo ou PDF).');
            return;
        }
        setIsSending(true);
        try {
            // 1) Upload dos arquivos com barra de progresso
            setUploadProgress(0);
            const media = await approvalsApi.upload(files, setUploadProgress);
            setUploadProgress(100);

            // 2) Criação do item → o backend dispara para o grupo do WhatsApp
            await approvalsApi.create({
                title: title.trim(),
                description: description.trim() || undefined,
                media,
                request_id: requestId || null,
                created_by: user?.name || undefined,
            });

            notify('success', 'Material enviado para aprovação no grupo do WhatsApp.');
            resetForm();
            fetchItems(false);
        } catch (err: any) {
            console.error('Erro ao enviar material:', err);
            if (err instanceof PopApiError && err.code === 'settings_missing') {
                setShowConfig(true);
                notify('error', 'Configure a instância e o grupo do WhatsApp antes de enviar.');
            } else {
                notify('error', err?.message || 'Falha ao enviar o material.');
            }
        } finally {
            setIsSending(false);
            setUploadProgress(null);
        }
    };

    // ── Decisão manual / reenvio ──

    const handleDecide = async () => {
        if (!decideTarget) return;
        setIsDeciding(true);
        try {
            await approvalsApi.decide(
                decideTarget.item.id,
                decideTarget.decision,
                decideNote.trim(),
                user?.name || 'Admin',
            );
            notify('success', `Item #${decideTarget.item.id} marcado como ${decideTarget.decision}.`);
            setDecideTarget(null);
            setDecideNote('');
            fetchItems(false);
        } catch (err: any) {
            console.error('Erro ao registrar decisão:', err);
            notify('error', err?.message || 'Não foi possível registrar a decisão.');
        } finally {
            setIsDeciding(false);
        }
    };

    const handleResend = async (item: ApprovalItem) => {
        try {
            await approvalsApi.resend(item.id);
            notify('success', `Item #${item.id} reenviado ao grupo.`);
            fetchItems(false);
        } catch (err: any) {
            console.error('Erro ao reenviar:', err);
            notify('error', err?.message || 'Falha ao reenviar o material.');
        }
    };

    const toggleExpand = async (item: ApprovalItem) => {
        const next = expandedId === item.id ? null : item.id;
        setExpandedId(next);
        if (next !== null) {
            try {
                const events = await approvalsApi.events(item.id);
                setEventsByItem(prev => ({ ...prev, [item.id]: events }));
            } catch (err) {
                console.error('Erro ao carregar timeline do item:', err);
            }
        }
    };

    return (
        <div className="space-y-6">
            {/* Cabeçalho da tela */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[var(--admin-surface-1)] p-6 rounded-2xl shadow-sm border border-[var(--admin-border)]">
                <div>
                    <h3 className="font-black text-2xl text-[var(--admin-text-primary)] flex items-center gap-2">
                        <MessageCircle className="text-green-600 dark:text-green-400" /> Aprovações via WhatsApp
                    </h3>
                    <p className="text-sm text-[var(--admin-text-secondary)] font-medium tracking-tight">
                        {settings?.configured
                            ? <>Grupo conectado: <span className="font-bold">{settings.group_name || settings.group_jid}</span> · instância <span className="font-bold">{settings.instance}</span></>
                            : 'Envie criativos para o grupo e receba as decisões aqui, ao vivo.'}
                    </p>
                </div>
                <button
                    onClick={() => setShowConfig(v => !v)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-[var(--admin-surface-2)] border border-[var(--admin-border)] text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] hover:border-gray-400 transition-all"
                >
                    <Settings2 size={16} /> Configurar grupo
                </button>
            </div>

            {/* ── Card de configuração guiada ── */}
            {(showConfig || (!isSettingsLoading && !settings?.configured)) && (
                <div className="bg-[var(--admin-surface-1)] rounded-2xl border-2 border-dashed border-green-300 dark:border-green-900/60 p-6 space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 flex items-center justify-center">
                            <Users size={20} />
                        </div>
                        <div>
                            <h4 className="font-black text-[var(--admin-text-primary)]">Conectar grupo de aprovação</h4>
                            <p className="text-xs text-[var(--admin-text-secondary)]">
                                1. Informe a instância da Evolution API · 2. Liste os grupos · 3. Escolha o grupo e salve.
                            </p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                        <div>
                            <label className={labelCls}>Instância</label>
                            <input
                                className={inputCls}
                                value={cfgInstance}
                                onChange={e => setCfgInstance(e.target.value)}
                                placeholder="Ex.: wtech-principal"
                            />
                        </div>
                        <div>
                            <button
                                onClick={handleListGroups}
                                disabled={isGroupsLoading}
                                className="w-full px-4 py-2.5 rounded-xl text-sm font-bold bg-[var(--admin-surface-2)] border border-[var(--admin-border)] text-[var(--admin-text-primary)] hover:border-green-500 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                            >
                                {isGroupsLoading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                                Listar grupos
                            </button>
                        </div>
                        <div>
                            <label className={labelCls}>Grupo de aprovação</label>
                            <select
                                className={inputCls}
                                value={cfgGroupJid}
                                onChange={e => setCfgGroupJid(e.target.value)}
                                disabled={cfgGroups.length === 0 && !cfgGroupJid}
                            >
                                <option value="">{cfgGroups.length === 0 ? 'Liste os grupos primeiro…' : 'Selecione…'}</option>
                                {/* Mantém o grupo salvo visível mesmo antes de listar novamente */}
                                {cfgGroupJid && !cfgGroups.some(g => g.jid === cfgGroupJid) && (
                                    <option value={cfgGroupJid}>{settings?.group_name || cfgGroupJid}</option>
                                )}
                                {cfgGroups.map(g => <option key={g.jid} value={g.jid}>{g.name}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* ── Fase 2: grupo do time de Marketing + alerta de turmas ── */}
                    <div className="border-t border-dashed border-[var(--admin-border)] pt-4 space-y-4">
                        <div>
                            <h5 className="font-black text-sm text-[var(--admin-text-primary)]">Grupo do time de Marketing</h5>
                            <p className="text-xs text-[var(--admin-text-secondary)]">
                                Destino dos compartilhamentos internos (planejamento de tráfego, reuniões e resultados).
                                Use o mesmo “Listar grupos” acima para carregar as opções.
                            </p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className={labelCls}>Grupo do time</label>
                                <select
                                    className={inputCls}
                                    value={cfgTeamGroupJid}
                                    onChange={e => setCfgTeamGroupJid(e.target.value)}
                                    disabled={cfgGroups.length === 0 && !cfgTeamGroupJid}
                                >
                                    <option value="">{cfgGroups.length === 0 ? 'Liste os grupos primeiro…' : 'Selecione…'}</option>
                                    {/* Mantém o grupo salvo visível mesmo antes de listar novamente */}
                                    {cfgTeamGroupJid && !cfgGroups.some(g => g.jid === cfgTeamGroupJid) && (
                                        <option value={cfgTeamGroupJid}>{settings?.team_group_name || cfgTeamGroupJid}</option>
                                    )}
                                    {cfgGroups.map(g => <option key={g.jid} value={g.jid}>{g.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className={labelCls}>Antecedência do alerta de turmas (dias)</label>
                                <input
                                    type="number" min="1" step="1"
                                    className={inputCls}
                                    value={cfgAlertDays}
                                    onChange={e => setCfgAlertDays(e.target.value)}
                                    placeholder={String(COURSE_ALERT_DEFAULTS.days)}
                                />
                            </div>
                            <div>
                                <label className={labelCls}>% mínima de ocupação</label>
                                <input
                                    type="number" min="1" max="100" step="1"
                                    className={inputCls}
                                    value={cfgAlertMinPct}
                                    onChange={e => setCfgAlertMinPct(e.target.value)}
                                    placeholder={String(COURSE_ALERT_DEFAULTS.min_pct)}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <button
                            onClick={handleSaveConfig}
                            disabled={isSavingCfg}
                            className="bg-green-600 text-white px-6 py-2.5 rounded-xl text-sm font-black uppercase tracking-wider flex items-center gap-2 hover:bg-green-700 active:scale-95 transition-all disabled:opacity-60"
                        >
                            {isSavingCfg ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                            Salvar configuração
                        </button>
                    </div>
                </div>
            )}

            {/* ── Formulário de envio ── */}
            <form onSubmit={handleSubmit} className="bg-[var(--admin-surface-1)] rounded-2xl border border-[var(--admin-border)] shadow-sm p-6 space-y-4">
                <h4 className="font-black text-[var(--admin-text-primary)] flex items-center gap-2">
                    <Send size={16} className="text-green-600 dark:text-green-400" /> Enviar material para aprovação
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className={labelCls}>Título *</label>
                        <input className={inputCls} value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex.: Post feed — Curso Lisboa v2" />
                    </div>
                    <div>
                        <label className={labelCls}>Pedido vinculado (opcional)</label>
                        <select className={inputCls} value={requestId} onChange={e => setRequestId(e.target.value)}>
                            <option value="">Sem vínculo</option>
                            {linkableRequests.map(r => (
                                <option key={r.id} value={r.id}>{r.title} · {r.requester_sector}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div>
                    <label className={labelCls}>Descrição</label>
                    <textarea className={`${inputCls} min-h-[64px] resize-y`} value={description} onChange={e => setDescription(e.target.value)} placeholder="Contexto que vai junto na mensagem do grupo…" />
                </div>

                {/* Upload multi-arquivo */}
                <div>
                    <label className={labelCls}>Arquivos (imagem, vídeo ou PDF) *</label>
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept="image/*,video/*,application/pdf"
                        className="hidden"
                        onChange={e => addFiles(e.target.files)}
                    />
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full border-2 border-dashed border-[var(--admin-border)] rounded-xl py-6 flex flex-col items-center gap-2 text-[var(--admin-text-tertiary)] hover:border-green-500 hover:text-green-600 transition-all"
                    >
                        <Upload size={22} />
                        <span className="text-sm font-bold">Clique para escolher os arquivos</span>
                    </button>

                    {files.length > 0 && (
                        <div className="flex flex-wrap gap-3 mt-3">
                            {files.map((f, idx) => {
                                const key = `${f.name}_${f.size}`;
                                return (
                                    <div key={`${key}_${idx}`} className="relative group border border-[var(--admin-border)] rounded-xl overflow-hidden bg-[var(--admin-surface-2)] w-24">
                                        {previews[key] ? (
                                            <img src={previews[key]} alt={f.name} className="w-24 h-20 object-cover" />
                                        ) : (
                                            <div className="w-24 h-20 flex items-center justify-center text-[var(--admin-text-tertiary)]">
                                                {mediaIcon(f.type)}
                                            </div>
                                        )}
                                        <p className="text-[9px] font-medium text-[var(--admin-text-tertiary)] truncate px-1.5 py-1">{f.name}</p>
                                        <button
                                            type="button"
                                            onClick={() => removeFile(idx)}
                                            className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                            title="Remover"
                                        >
                                            <X size={12} />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Barra de progresso do upload */}
                {uploadProgress !== null && (
                    <div>
                        <div className="flex justify-between items-end mb-1">
                            <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Enviando arquivos</span>
                            <span className="text-xs font-black text-[var(--admin-text-primary)]">{uploadProgress}%</span>
                        </div>
                        <div className="w-full bg-[var(--admin-surface-3)] rounded-full h-2.5 overflow-hidden">
                            <div
                                className="h-full rounded-full bg-gradient-to-r from-green-400 to-green-600 transition-all duration-300"
                                style={{ width: `${uploadProgress}%` }}
                            />
                        </div>
                    </div>
                )}

                <div className="flex justify-end">
                    <button
                        type="submit"
                        disabled={isSending}
                        className="bg-green-600 text-white px-6 py-2.5 rounded-xl text-sm font-black uppercase tracking-wider flex items-center gap-2 hover:bg-green-700 shadow-xl shadow-green-100 dark:shadow-none active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {isSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                        {isSending ? 'Enviando…' : 'Enviar para o grupo'}
                    </button>
                </div>
            </form>

            {/* ── Lista de itens com status ao vivo ── */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h4 className="font-black text-[var(--admin-text-primary)]">Materiais enviados</h4>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--admin-text-tertiary)] flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> atualiza a cada 10s
                    </span>
                </div>

                {isListLoading && (
                    <div className="bg-[var(--admin-surface-1)] rounded-2xl border border-[var(--admin-border)] py-14 text-center text-[var(--admin-text-tertiary)]">
                        <Loader2 size={26} className="mx-auto animate-spin mb-2" />
                        <p className="text-sm font-medium">Carregando aprovações…</p>
                    </div>
                )}

                {!isListLoading && items.length === 0 && (
                    <div className="bg-[var(--admin-surface-1)] border-2 border-dashed border-[var(--admin-border)] rounded-3xl py-16 text-center text-gray-400">
                        <MessageCircle size={56} className="mx-auto mb-4 opacity-10" />
                        <p className="text-lg font-bold">Nenhum material enviado ainda</p>
                        <p className="text-sm">Use o formulário acima para mandar o primeiro criativo ao grupo.</p>
                    </div>
                )}

                {items.map(item => {
                    const accent = item.status === 'Aprovado' ? 'bg-green-500'
                        : item.status === 'Reprovado' ? 'bg-red-500'
                        : item.status === 'Enviado' ? 'bg-amber-500' : 'bg-gray-400';
                    const isExpanded = expandedId === item.id;
                    return (
                        <div key={item.id} className="bg-[var(--admin-surface-1)] rounded-2xl border border-[var(--admin-border)] shadow-sm relative overflow-hidden">
                            <div className={`absolute top-0 left-0 w-1 h-full ${accent}`} />
                            <div className="p-5">
                                <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2 mb-1">
                                            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${APPROVAL_STATUS_CHIP[item.status] || ''}`}>
                                                {item.status}
                                            </span>
                                            {item.version > 1 && (
                                                <span className="px-2 py-0.5 rounded-lg text-[10px] font-black uppercase bg-[var(--admin-surface-2)] text-[var(--admin-text-tertiary)]">v{item.version}</span>
                                            )}
                                            {item.request_id && (
                                                <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-300 truncate max-w-[220px]">
                                                    Pedido: {requestTitleById.get(item.request_id) || item.request_id.slice(0, 8)}
                                                </span>
                                            )}
                                        </div>
                                        <h5 className="font-black text-[var(--admin-text-primary)] leading-tight">#{item.id} · {item.title}</h5>
                                        {item.description && <p className="text-xs text-[var(--admin-text-secondary)] mt-0.5 line-clamp-2">{item.description}</p>}

                                        {/* Estado detalhado por status */}
                                        <div className="mt-2 text-xs font-medium">
                                            {item.status === 'Enviado' && (
                                                <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                                                    <Clock size={12} /> Aguardando decisão no grupo {timeSince(item.sent_at)}
                                                </span>
                                            )}
                                            {item.status === 'Aprovado' && (
                                                <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                                                    <CheckCircle2 size={12} /> Aprovado por {item.decided_by || '—'} em {formatDateTime(item.decided_at)}
                                                </span>
                                            )}
                                            {(item.status === 'Reprovado' || item.status === 'Ajustes') && (
                                                <span className="flex items-center gap-1.5 text-red-500">
                                                    <XCircle size={12} /> {item.status === 'Ajustes' ? 'Ajustes solicitados' : 'Reprovado'} por {item.decided_by || '—'}
                                                    {item.decision_note ? ` — “${item.decision_note}”` : ''}
                                                </span>
                                            )}
                                        </div>

                                        {/* Miniaturas das mídias */}
                                        {Array.isArray(item.media) && item.media.length > 0 && (
                                            <div className="flex flex-wrap gap-2 mt-3">
                                                {item.media.map((m, i) => (
                                                    m.type?.startsWith('image')
                                                        ? <img key={i} src={m.url} alt={m.name} className="w-14 h-14 object-cover rounded-lg border border-[var(--admin-border)]" />
                                                        : (
                                                            <a key={i} href={m.url} target="_blank" rel="noopener noreferrer" className="w-14 h-14 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-2)] flex flex-col items-center justify-center text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)] transition-colors" title={m.name}>
                                                                {mediaIcon(m.type || '')}
                                                                <span className="text-[8px] font-bold mt-1 px-1 truncate max-w-full">{(m.name || '').split('.').pop()?.toUpperCase()}</span>
                                                            </a>
                                                        )
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Ações */}
                                    <div className="flex items-center gap-2 shrink-0">
                                        {(item.status === 'Enviado' || item.status === 'Ajustes') && (
                                            <>
                                                <button
                                                    onClick={() => { setDecideTarget({ item, decision: 'Aprovado' }); setDecideNote(''); }}
                                                    className="p-2.5 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-xl hover:bg-green-100 dark:hover:bg-green-900/40 transition-all active:scale-90"
                                                    title="Aprovar pelo sistema (decisão verbal)"
                                                >
                                                    <CheckCircle2 size={18} />
                                                </button>
                                                <button
                                                    onClick={() => { setDecideTarget({ item, decision: 'Reprovado' }); setDecideNote(''); }}
                                                    className="p-2.5 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/40 transition-all active:scale-90"
                                                    title="Reprovar pelo sistema (decisão verbal)"
                                                >
                                                    <XCircle size={18} />
                                                </button>
                                            </>
                                        )}
                                        {item.status === 'Reprovado' && (
                                            <button
                                                onClick={() => handleResend(item)}
                                                className="px-3 py-2 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-xl hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-all active:scale-95 text-xs font-black uppercase tracking-wide flex items-center gap-1.5"
                                                title="Reenviar nova versão ao grupo"
                                            >
                                                <RefreshCw size={14} /> Reenviar
                                            </button>
                                        )}
                                        <button
                                            onClick={() => toggleExpand(item)}
                                            className="p-2.5 rounded-xl hover:bg-[var(--admin-surface-2)] text-[var(--admin-text-tertiary)] transition-all"
                                            title="Timeline do item"
                                        >
                                            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                        </button>
                                    </div>
                                </div>

                                {/* Timeline expandível */}
                                {isExpanded && (
                                    <div className="mt-4 border-t border-[var(--admin-border)] pt-4 space-y-3">
                                        {(eventsByItem[item.id] || []).length === 0 ? (
                                            <p className="text-xs text-[var(--admin-text-tertiary)]">Nenhum evento registrado para este item.</p>
                                        ) : (
                                            eventsByItem[item.id].map(ev => (
                                                <div key={ev.id} className="flex gap-3">
                                                    <div className="pt-0.5 shrink-0">{eventIcon(ev.event)}</div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-bold text-[var(--admin-text-primary)] leading-tight">{prettyEvent(ev.event)}</p>
                                                        {ev.payload?.note && <p className="text-xs text-[var(--admin-text-secondary)] italic">“{ev.payload.note}”</p>}
                                                        <p className="text-[10px] text-[var(--admin-text-tertiary)] font-medium">
                                                            {ev.actor ? `${ev.actor} · ` : ''}{formatDateTime(ev.created_at)}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ── Modal de decisão manual ── */}
            {decideTarget && (
                <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setDecideTarget(null)}>
                    <div className="bg-[var(--admin-surface-1)] rounded-2xl border border-[var(--admin-border)] shadow-2xl w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
                        <h4 className="font-black text-lg text-[var(--admin-text-primary)] flex items-center gap-2">
                            {decideTarget.decision === 'Aprovado'
                                ? <CheckCircle2 size={20} className="text-green-500" />
                                : <XCircle size={20} className="text-red-500" />}
                            {decideTarget.decision === 'Aprovado' ? 'Aprovar' : 'Reprovar'} item #{decideTarget.item.id}
                        </h4>
                        <p className="text-xs text-[var(--admin-text-secondary)]">
                            Use quando a decisão foi tomada verbalmente — fica registrada na timeline como decisão manual.
                        </p>
                        <div>
                            <label className={labelCls}>Nota {decideTarget.decision === 'Reprovado' ? '(motivo)' : '(opcional)'}</label>
                            <textarea
                                className={`${inputCls} min-h-[80px] resize-y`}
                                value={decideNote}
                                onChange={e => setDecideNote(e.target.value)}
                                placeholder={decideTarget.decision === 'Reprovado' ? 'O que precisa mudar?' : 'Observações…'}
                                autoFocus
                            />
                        </div>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setDecideTarget(null)} className="px-4 py-2 rounded-xl text-sm font-bold text-[var(--admin-text-secondary)] hover:bg-[var(--admin-surface-2)] transition-all">
                                Cancelar
                            </button>
                            <button
                                onClick={handleDecide}
                                disabled={isDeciding}
                                className={`px-5 py-2 rounded-xl text-sm font-black uppercase tracking-wider text-white flex items-center gap-2 active:scale-95 transition-all disabled:opacity-60 ${
                                    decideTarget.decision === 'Aprovado' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                                }`}
                            >
                                {isDeciding && <Loader2 size={14} className="animate-spin" />}
                                Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ApprovalsView;
