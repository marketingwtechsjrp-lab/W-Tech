import React, { useEffect, useState } from 'react';
import {
    NotebookPen, Plus, X, Save, Loader2, CheckCircle2, ChevronDown, ChevronUp, Users,
} from 'lucide-react';
import { supabase } from '../../../../lib/supabaseClient';
import { useAuth } from '../../../../context/AuthContext';
import {
    marketingApi, PopApiError, formatDate, formatDateTime, toDateInputValue,
    MEETING_WITH_OPTIONS, MEETING_WITH_LABELS, MEETING_WITH_CHIP,
    type MeetingNote, type MeetingWith,
} from '../../../../lib/popMarketing';
import type { PopNotify } from './PopMarketingView';

/**
 * Reuniões de alinhamento (POP 8.7) — registro das reuniões com Diretoria /
 * Gerência Comercial, com resumo, decisões e compartilhamento do registro no
 * grupo do time via POST /api/marketing/share (shared_at otimista).
 * CRUD direto via supabase (SITE_MeetingNotes), padrão do projeto.
 */

interface MeetingNotesViewProps {
    notify: PopNotify;
}

const inputCls = 'w-full bg-[var(--admin-surface-2)] border border-[var(--admin-border)] rounded-xl px-4 py-2.5 text-sm text-[var(--admin-text-primary)] outline-none focus:border-purple-400 dark:focus:border-purple-500 focus:ring-2 focus:ring-purple-100 dark:focus:ring-purple-900/20 transition-all font-medium';
const labelCls = 'block text-[10px] font-black uppercase tracking-widest text-[var(--admin-text-tertiary)] mb-1.5';

const MeetingNotesView = ({ notify }: MeetingNotesViewProps) => {
    const { user } = useAuth();

    const [meetings, setMeetings] = useState<MeetingNote[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [sharingId, setSharingId] = useState<string | null>(null);

    // ── Form modal ──
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [meetingDate, setMeetingDate] = useState(() => toDateInputValue(new Date()));
    const [withWhom, setWithWhom] = useState<MeetingWith>('Diretoria');
    const [participants, setParticipants] = useState('');
    const [summary, setSummary] = useState('');
    const [decisions, setDecisions] = useState('');

    const fetchMeetings = async (showSpinner = true) => {
        if (showSpinner) setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('SITE_MeetingNotes')
                .select('*')
                .order('meeting_date', { ascending: false })
                .order('created_at', { ascending: false })
                .limit(100);
            if (error) throw error;
            setMeetings((data as MeetingNote[]) || []);
        } catch (err) {
            console.error('Erro ao carregar reuniões:', err);
            setMeetings([]);
            if (showSpinner) notify('info', 'Não foi possível carregar as reuniões agora.');
        } finally {
            if (showSpinner) setIsLoading(false);
        }
    };

    useEffect(() => { fetchMeetings(); }, []);

    const resetForm = () => {
        setMeetingDate(toDateInputValue(new Date()));
        setWithWhom('Diretoria');
        setParticipants('');
        setSummary('');
        setDecisions('');
    };

    // ── Registro de nova reunião ──
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!summary.trim()) {
            notify('error', 'Escreva ao menos o resumo da reunião.');
            return;
        }
        setIsSaving(true);
        try {
            const { error } = await supabase.from('SITE_MeetingNotes').insert({
                meeting_date: meetingDate || toDateInputValue(new Date()),
                with_whom: withWhom,
                participants: participants.trim() || null,
                summary: summary.trim(),
                decisions: decisions.trim() || null,
                created_by: user?.name || null,
            });
            if (error) throw error;
            notify('success', 'Reunião registrada.');
            setIsFormOpen(false);
            resetForm();
            fetchMeetings(false);
        } catch (err: any) {
            console.error('Erro ao registrar reunião:', err);
            notify('error', err?.message || 'Não foi possível registrar a reunião.');
        } finally {
            setIsSaving(false);
        }
    };

    // ── Compartilhar com o time (shared_at otimista, rollback em falha) ──
    const handleShare = async (meeting: MeetingNote) => {
        const previousSharedAt = meeting.shared_at;
        const optimistic = new Date().toISOString();
        setSharingId(meeting.id);
        setMeetings(prev => prev.map(m => (m.id === meeting.id ? { ...m, shared_at: optimistic } : m)));
        try {
            await marketingApi.share({ type: 'meeting_note', id: meeting.id });
            notify('success', 'Resumo da reunião compartilhado com o time.');
            fetchMeetings(false); // sincroniza o shared_at real gravado pelo backend
        } catch (err: any) {
            console.error('Erro ao compartilhar reunião:', err);
            // Rollback do otimismo
            setMeetings(prev => prev.map(m => (m.id === meeting.id ? { ...m, shared_at: previousSharedAt } : m)));
            if (err instanceof PopApiError && err.code === 'team_group_missing') {
                notify('error', err.message);
            } else {
                notify('error', err?.message || 'Falha ao compartilhar a reunião.');
            }
        } finally {
            setSharingId(null);
        }
    };

    return (
        <div className="space-y-6">
            {/* Barra superior */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[var(--admin-surface-1)] p-6 rounded-2xl shadow-sm border border-[var(--admin-border)]">
                <div>
                    <h3 className="font-black text-2xl text-[var(--admin-text-primary)] flex items-center gap-2">
                        <NotebookPen className="text-purple-600 dark:text-purple-400" /> Reuniões de Alinhamento
                    </h3>
                    <p className="text-sm text-[var(--admin-text-secondary)] font-medium tracking-tight">
                        POP 8.7 — registre o que foi decidido com a Diretoria/Comercial e repasse ao time.
                    </p>
                </div>
                <button
                    onClick={() => setIsFormOpen(true)}
                    className="bg-purple-600 text-white px-5 py-2.5 rounded-xl text-sm font-black uppercase tracking-wider flex items-center gap-2 hover:bg-purple-700 shadow-xl shadow-purple-100 dark:shadow-none active:scale-95 transition-all"
                >
                    <Plus size={18} /> Registrar Reunião
                </button>
            </div>

            {/* Lista */}
            {isLoading ? (
                <div className="bg-[var(--admin-surface-1)] rounded-2xl border border-[var(--admin-border)] py-16 text-center text-[var(--admin-text-tertiary)]">
                    <Loader2 size={28} className="mx-auto animate-spin mb-2" />
                    <p className="text-sm font-medium">Carregando reuniões…</p>
                </div>
            ) : meetings.length === 0 ? (
                <div className="bg-[var(--admin-surface-1)] border-2 border-dashed border-[var(--admin-border)] rounded-3xl py-16 text-center text-gray-400">
                    <NotebookPen size={56} className="mx-auto mb-4 opacity-10" />
                    <p className="text-lg font-bold">Nenhuma reunião registrada</p>
                    <p className="text-sm">Registre a primeira reunião de alinhamento para manter o histórico do POP.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {meetings.map(meeting => {
                        const isExpanded = expandedId === meeting.id;
                        return (
                            <div key={meeting.id} className="bg-[var(--admin-surface-1)] rounded-2xl border border-[var(--admin-border)] shadow-sm">
                                <div className="p-5">
                                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2 mb-1">
                                                <span className="text-sm font-black text-[var(--admin-text-primary)]">
                                                    {formatDate(meeting.meeting_date)}
                                                </span>
                                                <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${MEETING_WITH_CHIP[meeting.with_whom] || MEETING_WITH_CHIP.Outro}`}>
                                                    {MEETING_WITH_LABELS[meeting.with_whom] || meeting.with_whom}
                                                </span>
                                                {meeting.shared_at && (
                                                    <span
                                                        className="px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-300 flex items-center gap-1"
                                                        title={`Compartilhado em ${formatDateTime(meeting.shared_at)}`}
                                                    >
                                                        <CheckCircle2 size={10} /> Compartilhado
                                                    </span>
                                                )}
                                            </div>
                                            {/* Resumo truncado — expande para ler tudo */}
                                            <p className={`text-sm text-[var(--admin-text-secondary)] font-medium ${isExpanded ? '' : 'line-clamp-2'}`}>
                                                {meeting.summary}
                                            </p>
                                            {meeting.participants && (
                                                <p className="text-xs text-[var(--admin-text-tertiary)] mt-1 flex items-center gap-1">
                                                    <Users size={11} /> {meeting.participants}
                                                </p>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0">
                                            <button
                                                onClick={() => handleShare(meeting)}
                                                disabled={sharingId === meeting.id}
                                                className="px-3 py-2 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-xl hover:bg-green-100 dark:hover:bg-green-900/40 transition-all active:scale-95 text-xs font-black uppercase tracking-wide flex items-center gap-1.5 disabled:opacity-60"
                                                title={meeting.shared_at ? 'Compartilhar novamente com o time' : 'Compartilhar com o time no WhatsApp'}
                                            >
                                                {sharingId === meeting.id
                                                    ? <Loader2 size={14} className="animate-spin" />
                                                    : <span aria-hidden>📤</span>}
                                                Compartilhar com o time
                                            </button>
                                            <button
                                                onClick={() => setExpandedId(isExpanded ? null : meeting.id)}
                                                className="p-2.5 rounded-xl hover:bg-[var(--admin-surface-2)] text-[var(--admin-text-tertiary)] transition-all"
                                                title={isExpanded ? 'Recolher' : 'Ver detalhes'}
                                            >
                                                {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Detalhe expandido: decisões / prazos / responsáveis */}
                                    {isExpanded && (
                                        <div className="mt-4 border-t border-[var(--admin-border)] pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--admin-text-tertiary)] mb-1">Decisões / prazos / responsáveis</p>
                                                <p className="text-sm font-medium text-[var(--admin-text-primary)] whitespace-pre-wrap">
                                                    {meeting.decisions || '—'}
                                                </p>
                                            </div>
                                            <div className="text-xs text-[var(--admin-text-tertiary)] font-medium md:text-right space-y-1">
                                                <p>Registrado por {meeting.created_by || '—'} em {formatDateTime(meeting.created_at)}</p>
                                                {meeting.shared_at && <p>Compartilhado em {formatDateTime(meeting.shared_at)}</p>}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── Modal de registro ── */}
            {isFormOpen && (
                <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setIsFormOpen(false)}>
                    <div
                        className="bg-[var(--admin-surface-1)] rounded-2xl border border-[var(--admin-border)] shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto custom-scrollbar"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="sticky top-0 bg-[var(--admin-surface-1)] border-b border-[var(--admin-border)] px-6 py-4 flex items-center justify-between z-10">
                            <div>
                                <h3 className="font-black text-xl text-[var(--admin-text-primary)]">Registrar Reunião</h3>
                                <p className="text-xs text-[var(--admin-text-secondary)]">O registro fica no histórico e pode ser compartilhado com o time.</p>
                            </div>
                            <button onClick={() => setIsFormOpen(false)} className="p-2 rounded-xl hover:bg-[var(--admin-surface-2)] text-[var(--admin-text-tertiary)] transition-all" title="Fechar">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className={labelCls}>Data da reunião</label>
                                    <input type="date" className={inputCls} value={meetingDate} onChange={e => setMeetingDate(e.target.value)} />
                                </div>
                                <div>
                                    <label className={labelCls}>Com quem</label>
                                    <select className={inputCls} value={withWhom} onChange={e => setWithWhom(e.target.value as MeetingWith)}>
                                        {MEETING_WITH_OPTIONS.map(w => (
                                            <option key={w} value={w}>{MEETING_WITH_LABELS[w]}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className={labelCls}>Participantes</label>
                                    <input className={inputCls} value={participants} onChange={e => setParticipants(e.target.value)} placeholder="Ex.: Alex, Daniel, João" />
                                </div>
                            </div>
                            <div>
                                <label className={labelCls}>Resumo *</label>
                                <textarea className={`${inputCls} min-h-[90px] resize-y`} value={summary} onChange={e => setSummary(e.target.value)} placeholder="O que foi discutido na reunião?" required />
                            </div>
                            <div>
                                <label className={labelCls}>Decisões / prazos / responsáveis</label>
                                <textarea className={`${inputCls} min-h-[90px] resize-y`} value={decisions} onChange={e => setDecisions(e.target.value)} placeholder={'Ex.:\n- Subir campanha do curso até 20/07 — Daniel\n- Revisar verba de Meta — Alex'} />
                            </div>
                            <div className="flex justify-end gap-3 pt-2 border-t border-[var(--admin-border)]">
                                <button type="button" onClick={() => setIsFormOpen(false)} className="px-5 py-2.5 rounded-xl text-sm font-bold text-[var(--admin-text-secondary)] hover:bg-[var(--admin-surface-2)] transition-all">
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="bg-purple-600 text-white px-6 py-2.5 rounded-xl text-sm font-black uppercase tracking-wider flex items-center gap-2 hover:bg-purple-700 shadow-xl shadow-purple-100 dark:shadow-none active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                    {isSaving ? 'Salvando…' : 'Registrar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MeetingNotesView;
