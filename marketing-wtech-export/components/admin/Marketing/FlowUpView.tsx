import React, { useState, useEffect, useMemo } from 'react';
import {
    RefreshCw, Users, TrendingUp, Target, MapPin, BookOpen,
    MessageCircle, Mail, Clock, Filter, Search, ChevronDown,
    X, Plus, ArrowRight, CheckCircle, AlertCircle, Archive,
    BarChart2, Activity, Layers, Phone, Tag, Calendar, Eye,
    Send, StickyNote, Zap, PieChart
} from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../context/AuthContext';
import type {
    FlowUpLead, FlowUpActivity, FlowUpSegment,
    FlowUpPhase, FlowUpLostReason
} from '../../../types';

// ─── Constants ────────────────────────────────────────────────────────────────

const PHASE_CONFIG: Record<FlowUpPhase, { label: string; color: string; bg: string; description: string; icon: React.ReactNode }> = {
    accommodation: {
        label: 'Acomodação',
        color: 'text-blue-600 dark:text-blue-400',
        bg: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
        description: 'D0 — Canal aberto, sem pressão comercial',
        icon: <Clock size={14} />,
    },
    nurturing: {
        label: 'Nutrição',
        color: 'text-amber-600 dark:text-amber-400',
        bg: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
        description: 'D+7 a D+30 — Conteúdo educacional e autoridade',
        icon: <BookOpen size={14} />,
    },
    reactivation: {
        label: 'Reativação',
        color: 'text-purple-600 dark:text-purple-400',
        bg: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800',
        description: 'Evento-driven — Nova turma / Cidade próxima',
        icon: <Zap size={14} />,
    },
    reactivated: {
        label: 'Reativado',
        color: 'text-green-600 dark:text-green-400',
        bg: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
        description: 'Voltou ao CRM com sucesso',
        icon: <CheckCircle size={14} />,
    },
    archived: {
        label: 'Arquivado',
        color: 'text-gray-500 dark:text-gray-400',
        bg: 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-700',
        description: 'Sem perspectiva no momento',
        icon: <Archive size={14} />,
    },
};

const LOST_REASON_LABELS: Record<FlowUpLostReason, string> = {
    price: '💰 Preço',
    date: '📅 Data incompatível',
    location: '📍 Local distante',
    not_now: '⏳ Ainda não é o momento',
    comparing: '🔍 Comparando opções',
    no_response: '📵 Não respondeu',
    other: '❓ Outro',
};

const ACTIVITY_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    whatsapp_sent:  { label: 'WhatsApp enviado',  color: 'text-green-600',  icon: <MessageCircle size={14} /> },
    email_sent:     { label: 'Email enviado',      color: 'text-blue-600',   icon: <Mail size={14} /> },
    email_opened:   { label: 'Email aberto',       color: 'text-indigo-600', icon: <Eye size={14} /> },
    link_clicked:   { label: 'Link clicado',       color: 'text-purple-600', icon: <Target size={14} /> },
    phase_changed:  { label: 'Fase alterada',      color: 'text-amber-600',  icon: <ArrowRight size={14} /> },
    manual_note:    { label: 'Nota manual',        color: 'text-gray-500',   icon: <StickyNote size={14} /> },
    reactivated:    { label: 'Reativado',          color: 'text-green-700',  icon: <CheckCircle size={14} /> },
    responded:      { label: 'Lead respondeu',     color: 'text-teal-600',   icon: <Send size={14} /> },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const daysSince = (date: string) => {
    const ms = Date.now() - new Date(date).getTime();
    return Math.floor(ms / (1000 * 60 * 60 * 24));
};

const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });

// ─── Lead Modal ───────────────────────────────────────────────────────────────

const FlowUpLeadModal = ({
    lead, activities, onClose, onUpdate, onAddActivity
}: {
    lead: FlowUpLead;
    activities: FlowUpActivity[];
    onClose: () => void;
    onUpdate: (id: string, data: Partial<FlowUpLead>) => Promise<void>;
    onAddActivity: (leadId: string, type: string, channel: string, subject: string, body?: string) => Promise<void>;
}) => {
    const [newNote, setNewNote] = useState('');
    const [newMsg, setNewMsg] = useState('');
    const [msgChannel, setMsgChannel] = useState<'whatsapp' | 'email'>('whatsapp');
    const [saving, setSaving] = useState(false);
    const phase = PHASE_CONFIG[lead.phase];

    const handleSendMessage = async () => {
        if (!newMsg.trim()) return;
        setSaving(true);
        await onAddActivity(lead.id, `${msgChannel}_sent`, msgChannel, `Mensagem ${msgChannel}`, newMsg.trim());
        if (msgChannel === 'whatsapp' && lead.phone) {
            const clean = String(lead.phone).replace(/\D/g, '');
            const val = clean.length <= 11 ? `55${clean}` : clean;
            window.open(`https://wa.me/${val}?text=${encodeURIComponent(newMsg)}`, '_blank');
        }
        setNewMsg('');
        setSaving(false);
    };

    const handleReactivate = async () => {
        await onUpdate(lead.id, { phase: 'reactivated', flowup_status: 'converted', reactivated_at: new Date().toISOString() });
        await onAddActivity(lead.id, 'reactivated', 'system', 'Lead reativado manualmente');
        onClose();
    };

    const handlePhaseChange = async (p: FlowUpPhase) => {
        await onUpdate(lead.id, { phase: p, phase_started_at: new Date().toISOString() });
        await onAddActivity(lead.id, 'phase_changed', 'system', `Fase alterada para: ${PHASE_CONFIG[p].label}`);
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-[#1A1A1A] rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-start">
                    <div>
                        <h3 className="text-xl font-black dark:text-white">{lead.name}</h3>
                        <div className="flex flex-wrap gap-2 mt-2">
                            {lead.region_city && (
                                <span className="flex items-center gap-1 text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full text-gray-600 dark:text-gray-400">
                                    <MapPin size={10} /> {lead.region_city}{lead.region_state ? `, ${lead.region_state}` : ''}
                                </span>
                            )}
                            {lead.course_interest && (
                                <span className="flex items-center gap-1 text-xs bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-full text-blue-600 dark:text-blue-400">
                                    <BookOpen size={10} /> {lead.course_interest}
                                </span>
                            )}
                            {lead.lost_reason && (
                                <span className="text-xs bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded-full text-red-600 dark:text-red-400">
                                    {LOST_REASON_LABELS[lead.lost_reason]}
                                </span>
                            )}
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1 space-y-5">
                    {/* Fase atual + alterar */}
                    <div>
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">Fase Atual</label>
                        <div className="flex flex-wrap gap-2">
                            {(Object.keys(PHASE_CONFIG) as FlowUpPhase[]).filter(p => p !== 'archived').map(p => (
                                <button
                                    key={p}
                                    onClick={() => handlePhaseChange(p)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                                        lead.phase === p
                                            ? PHASE_CONFIG[p].bg + ' ' + PHASE_CONFIG[p].color + ' shadow-sm'
                                            : 'bg-gray-50 dark:bg-gray-800 text-gray-500 border-gray-200 dark:border-gray-700 hover:border-gray-400'
                                    }`}
                                >
                                    {PHASE_CONFIG[p].icon} {PHASE_CONFIG[p].label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Contato */}
                    <div className="grid grid-cols-2 gap-3">
                        {lead.phone && (
                            <a href={`https://wa.me/55${lead.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer"
                               className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-xl text-green-700 dark:text-green-400 text-sm font-bold hover:bg-green-100 transition-colors">
                                <MessageCircle size={16} /> {lead.phone}
                            </a>
                        )}
                        {lead.email && (
                            <a href={`mailto:${lead.email}`}
                               className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-blue-700 dark:text-blue-400 text-sm font-bold hover:bg-blue-100 transition-colors truncate">
                                <Mail size={16} /> {lead.email}
                            </a>
                        )}
                    </div>

                    {/* Enviar mensagem rápida */}
                    <div>
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">Ação Manual</label>
                        <div className="flex gap-2 mb-2">
                            <button onClick={() => setMsgChannel('whatsapp')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${msgChannel === 'whatsapp' ? 'bg-green-600 text-white border-green-600' : 'bg-gray-50 dark:bg-gray-800 text-gray-500 border-gray-200 dark:border-gray-700'}`}>
                                <MessageCircle size={12} /> WhatsApp
                            </button>
                            <button onClick={() => setMsgChannel('email')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${msgChannel === 'email' ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 dark:bg-gray-800 text-gray-500 border-gray-200 dark:border-gray-700'}`}>
                                <Mail size={12} /> Email
                            </button>
                        </div>
                        <textarea
                            className="w-full p-3 bg-gray-50 dark:bg-gray-800 rounded-xl text-sm dark:text-white border border-gray-200 dark:border-gray-700 focus:border-black dark:focus:border-white outline-none min-h-[80px] resize-none"
                            placeholder={msgChannel === 'whatsapp' ? 'Oi, [Nome]. Abrimos uma nova turma...' : 'Assunto e corpo do email...'}
                            value={newMsg}
                            onChange={e => setNewMsg(e.target.value)}
                        />
                        <button onClick={handleSendMessage} disabled={saving || !newMsg.trim()}
                            className="mt-2 w-full bg-black dark:bg-white text-white dark:text-black font-bold py-2 rounded-xl text-sm hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center justify-center gap-2">
                            <Send size={14} /> Registrar {msgChannel === 'whatsapp' ? 'e Abrir WhatsApp' : 'Envio'}
                        </button>
                    </div>

                    {/* Reativar */}
                    {lead.phase !== 'reactivated' && (
                        <button onClick={handleReactivate}
                            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors">
                            <CheckCircle size={16} /> Marcar como Reativado — Devolver ao CRM
                        </button>
                    )}

                    {/* Histórico de atividades */}
                    <div>
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 block">Histórico</label>
                        {activities.length === 0 ? (
                            <p className="text-xs text-gray-400 text-center py-4">Nenhuma atividade registrada ainda.</p>
                        ) : (
                            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                {activities.map(act => {
                                    const cfg = ACTIVITY_CONFIG[act.type] || { label: act.type, color: 'text-gray-500', icon: <Activity size={14} /> };
                                    return (
                                        <div key={act.id} className="flex items-start gap-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-800">
                                            <span className={`mt-0.5 ${cfg.color}`}>{cfg.icon}</span>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-bold text-gray-700 dark:text-gray-300">{cfg.label}</p>
                                                {act.subject && <p className="text-xs text-gray-500 truncate">{act.subject}</p>}
                                                {act.body && <p className="text-xs text-gray-400 line-clamp-2">{act.body}</p>}
                                            </div>
                                            <span className="text-[10px] text-gray-400 whitespace-nowrap">
                                                {formatDate(act.created_at)}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// ─── Lead Card ────────────────────────────────────────────────────────────────

const FlowUpLeadCard = ({ lead, onClick }: { lead: FlowUpLead; onClick: () => void; key?: React.Key }) => {
    const phase = PHASE_CONFIG[lead.phase];
    const days = daysSince(lead.entered_at);

    return (
        <div onClick={onClick}
            className="bg-white dark:bg-[#1E1E1E] border border-gray-100 dark:border-gray-800 rounded-2xl p-4 cursor-pointer hover:shadow-lg hover:border-black/20 dark:hover:border-white/20 transition-all group">
            <div className="flex justify-between items-start mb-3">
                <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-gray-900 dark:text-white text-sm truncate group-hover:text-black dark:group-hover:text-white">{lead.name}</h4>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        {lead.region_city && (
                            <span className="flex items-center gap-0.5 text-[10px] font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded uppercase tracking-tight">
                                <MapPin size={8} /> {lead.region_city}
                            </span>
                        )}
                        {lead.lead_source_type && (
                            <span className="text-[10px] font-bold text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded uppercase tracking-tight">
                                {lead.lead_source_type}
                            </span>
                        )}
                    </div>
                </div>
                <span className={`flex items-center gap-1 px-2 py-1 rounded-xl text-[10px] font-bold border ${phase.bg} ${phase.color}`}>
                    {phase.icon} {phase.label}
                </span>
            </div>

            {lead.course_interest && (
                <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-2 flex items-center gap-1">
                    <BookOpen size={11} /> {lead.course_interest}
                </p>
            )}

            {lead.lost_reason && (
                <p className="text-xs text-red-500 dark:text-red-400 mb-2">
                    {LOST_REASON_LABELS[lead.lost_reason]}
                </p>
            )}

            <div className="flex justify-between items-center border-t border-gray-50 dark:border-gray-800 pt-2 mt-2">
                <div className="flex items-center gap-3 text-[10px] text-gray-400">
                    <span className="flex items-center gap-1"><MessageCircle size={10} /> {lead.contact_count}</span>
                    <span className="flex items-center gap-1"><Mail size={10} /> {lead.email_open_count}</span>
                </div>
                <span className="text-[10px] text-gray-400 flex items-center gap-1">
                    <Calendar size={10} /> {days}d no FlowUp
                </span>
            </div>
        </div>
    );
};

// ─── Segment Card ─────────────────────────────────────────────────────────────

const SegmentCard = ({ seg, leads }: { seg: FlowUpSegment; leads: FlowUpLead[]; key?: React.Key }) => {
    // Calcular contagem dinâmica local
    const count = leads.filter(l => {
        if (seg.rules.region_state && l.region_state !== seg.rules.region_state) return false;
        if (seg.rules.region_city && !l.region_city?.toLowerCase().includes(seg.rules.region_city.toLowerCase())) return false;
        if (seg.rules.course_interest && !l.course_interest?.toLowerCase().includes(seg.rules.course_interest.toLowerCase())) return false;
        if (seg.rules.lost_reason && l.lost_reason !== seg.rules.lost_reason) return false;
        if (seg.rules.lead_source_type && l.lead_source_type !== seg.rules.lead_source_type) return false;
        return true;
    }).length;

    return (
        <div className="bg-white dark:bg-[#1E1E1E] border border-gray-100 dark:border-gray-800 rounded-2xl p-5 hover:border-black/20 dark:hover:border-white/20 transition-all">
            <div className="flex justify-between items-start mb-3">
                <h4 className="font-bold text-gray-900 dark:text-white text-sm">{seg.name}</h4>
                <span className="text-2xl font-black text-black dark:text-white">{count}</span>
            </div>
            {seg.description && <p className="text-xs text-gray-500 mb-3">{seg.description}</p>}
            <div className="flex flex-wrap gap-1 mb-3">
                {Object.entries(seg.rules).filter(([, v]) => v).map(([k, v]) => (
                    <span key={k} className="text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full font-mono">
                        {k}: {v}
                    </span>
                ))}
            </div>
            <button className="w-full text-xs font-bold py-2 rounded-xl bg-black dark:bg-white text-white dark:text-black hover:opacity-80 transition-opacity flex items-center justify-center gap-2">
                <Send size={12} /> Disparar Campanha ({count} leads)
            </button>
        </div>
    );
};

// ─── Dashboard Tab ────────────────────────────────────────────────────────────

const DashboardTab = ({ leads }: { leads: FlowUpLead[] }) => {
    const total = leads.length;
    const reactivated = leads.filter(l => l.phase === 'reactivated').length;
    const active = leads.filter(l => l.flowup_status === 'active').length;
    const pct = total > 0 ? ((reactivated / total) * 100).toFixed(1) : '0';

    const byPhase = (Object.keys(PHASE_CONFIG) as FlowUpPhase[]).map(p => ({
        phase: p,
        count: leads.filter(l => l.phase === p).length,
        ...PHASE_CONFIG[p],
    }));

    const byReason = Object.entries(LOST_REASON_LABELS).map(([k, v]) => ({
        reason: k as FlowUpLostReason,
        label: v,
        count: leads.filter(l => l.lost_reason === k).length,
    })).filter(r => r.count > 0).sort((a, b) => b.count - a.count);

    const topCourses = leads.reduce<Record<string, number>>((acc, l) => {
        if (l.course_interest) acc[l.course_interest] = (acc[l.course_interest] || 0) + 1;
        return acc;
    }, {});

    const topRegions = leads.reduce<Record<string, number>>((acc, l) => {
        if (l.region_city) acc[l.region_city] = (acc[l.region_city] || 0) + 1;
        return acc;
    }, {});

    const kpis = [
        { label: 'Total FlowUp', value: total, icon: <Users size={18} />, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
        { label: 'Ativos', value: active, icon: <Activity size={18} />, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
        { label: 'Reativados', value: reactivated, icon: <TrendingUp size={18} />, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
        { label: '% Reativação', value: `${pct}%`, icon: <PieChart size={18} />, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' },
    ];

    return (
        <div className="space-y-6">
            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {kpis.map(k => (
                    <div key={k.label} className={`${k.bg} rounded-2xl p-4 border border-transparent`}>
                        <div className={`${k.color} mb-2`}>{k.icon}</div>
                        <p className="text-2xl font-black text-gray-900 dark:text-white">{k.value}</p>
                        <p className="text-xs text-gray-500 font-medium">{k.label}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Por Fase */}
                <div className="bg-white dark:bg-[#1E1E1E] rounded-2xl p-5 border border-gray-100 dark:border-gray-800">
                    <h4 className="font-bold text-gray-900 dark:text-white text-sm mb-4 flex items-center gap-2">
                        <Layers size={14} /> Distribuição por Fase
                    </h4>
                    <div className="space-y-2">
                        {byPhase.filter(p => p.count > 0).map(p => (
                            <div key={p.phase} className="flex items-center gap-2">
                                <span className={`flex items-center gap-1 text-xs ${p.color} w-28 shrink-0`}>
                                    {p.icon} {p.label}
                                </span>
                                <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all ${
                                            p.phase === 'accommodation' ? 'bg-blue-500' :
                                            p.phase === 'nurturing' ? 'bg-amber-500' :
                                            p.phase === 'reactivation' ? 'bg-purple-500' :
                                            p.phase === 'reactivated' ? 'bg-green-500' : 'bg-gray-400'
                                        }`}
                                        style={{ width: total > 0 ? `${(p.count / total) * 100}%` : '0%' }}
                                    />
                                </div>
                                <span className="text-xs font-bold text-gray-700 dark:text-gray-300 w-6 text-right">{p.count}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Motivos de Perda */}
                <div className="bg-white dark:bg-[#1E1E1E] rounded-2xl p-5 border border-gray-100 dark:border-gray-800">
                    <h4 className="font-bold text-gray-900 dark:text-white text-sm mb-4 flex items-center gap-2">
                        <AlertCircle size={14} /> Motivos de Perda
                    </h4>
                    {byReason.length === 0 ? (
                        <p className="text-xs text-gray-400 text-center py-4">Sem dados ainda</p>
                    ) : (
                        <div className="space-y-2">
                            {byReason.map(r => (
                                <div key={r.reason} className="flex items-center justify-between">
                                    <span className="text-xs text-gray-600 dark:text-gray-400 truncate w-40">{r.label}</span>
                                    <span className="text-xs font-black text-gray-900 dark:text-white">{r.count}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Top Cursos + Regiões */}
                <div className="space-y-4">
                    <div className="bg-white dark:bg-[#1E1E1E] rounded-2xl p-4 border border-gray-100 dark:border-gray-800">
                        <h4 className="font-bold text-gray-900 dark:text-white text-xs mb-3 uppercase tracking-wider">Top Cursos</h4>
                        {Object.entries(topCourses).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([name, count]) => (
                            <div key={name} className="flex justify-between text-xs mb-1">
                                <span className="text-gray-600 dark:text-gray-400 truncate w-32">{name}</span>
                                <span className="font-bold text-gray-900 dark:text-white">{count}</span>
                            </div>
                        ))}
                        {Object.keys(topCourses).length === 0 && <p className="text-xs text-gray-400">Sem dados</p>}
                    </div>
                    <div className="bg-white dark:bg-[#1E1E1E] rounded-2xl p-4 border border-gray-100 dark:border-gray-800">
                        <h4 className="font-bold text-gray-900 dark:text-white text-xs mb-3 uppercase tracking-wider">Top Regiões</h4>
                        {Object.entries(topRegions).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([city, count]) => (
                            <div key={city} className="flex justify-between text-xs mb-1">
                                <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1"><MapPin size={9}/>{city}</span>
                                <span className="font-bold text-gray-900 dark:text-white">{count}</span>
                            </div>
                        ))}
                        {Object.keys(topRegions).length === 0 && <p className="text-xs text-gray-400">Sem dados</p>}
                    </div>
                </div>
            </div>

            {/* Timeline das fases */}
            <div className="bg-white dark:bg-[#1E1E1E] rounded-2xl p-5 border border-gray-100 dark:border-gray-800">
                <h4 className="font-bold text-gray-900 dark:text-white text-sm mb-4">Jornada de Reengajamento</h4>
                <div className="flex items-center gap-0 overflow-x-auto">
                    {[
                        { phase: 'accommodation', title: 'Acomodação', time: 'D0', desc: 'Canal aberto\nSem pressão' },
                        { phase: 'nurturing', title: 'Nutrição', time: 'D+7 → D+30', desc: 'Conteúdo\nAutoridade' },
                        { phase: 'reactivation', title: 'Reativação', time: 'Evento-driven', desc: 'Nova turma\nNova cidade' },
                        { phase: 'reactivated', title: 'Reativado!', time: 'CRM', desc: 'Pipeline\nativo' },
                    ].map((item, i, arr) => {
                        const cfg = PHASE_CONFIG[item.phase as FlowUpPhase];
                        const cnt = leads.filter(l => l.phase === item.phase).length;
                        return (
                            <React.Fragment key={item.phase}>
                                <div className="flex flex-col items-center text-center min-w-[100px]">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${cfg.bg} ${cfg.color} mb-2 border font-black text-lg`}>
                                        {cnt}
                                    </div>
                                    <p className="text-xs font-black text-gray-900 dark:text-white">{item.title}</p>
                                    <p className="text-[10px] text-gray-400 font-mono">{item.time}</p>
                                    <p className="text-[10px] text-gray-500 whitespace-pre-line mt-1 leading-tight">{item.desc}</p>
                                </div>
                                {i < arr.length - 1 && (
                                    <div className="flex-1 h-0.5 bg-gray-200 dark:bg-gray-700 mx-1 mt-[-20px]" />
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

const FlowUpView: React.FC = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'dashboard' | 'leads' | 'segments' | 'activities'>('dashboard');

    // Data
    const [leads, setLeads] = useState<FlowUpLead[]>([]);
    const [segments, setSegments] = useState<FlowUpSegment[]>([]);
    const [activities, setActivities] = useState<FlowUpActivity[]>([]);
    const [loading, setLoading] = useState(true);

    // Filtros
    const [search, setSearch] = useState('');
    const [filterPhase, setFilterPhase] = useState<FlowUpPhase | 'all'>('all');
    const [filterReason, setFilterReason] = useState<FlowUpLostReason | 'all'>('all');
    const [filterRegion, setFilterRegion] = useState('all');
    const [filterCourse, setFilterCourse] = useState('all');

    // Modal
    const [selectedLead, setSelectedLead] = useState<FlowUpLead | null>(null);
    const [leadActivities, setLeadActivities] = useState<FlowUpActivity[]>([]);

    // Add lead modal
    const [showAddModal, setShowAddModal] = useState(false);
    const [addForm, setAddForm] = useState({
        name: '', phone: '', email: '',
        course_interest: '', region_city: '', region_state: '',
        lead_source_type: 'Manual', lost_reason: '' as FlowUpLostReason | '',
        lost_reason_notes: '' as string,
    });

    // ── Fetch ──────────────────────────────────────────────────────────────────

    const fetchLeads = async () => {
        // 1. Busca todos os leads do CRM com status Cold ou Rejected
        const { data: crmLeads } = await supabase
            .from('SITE_Leads')
            .select('id, name, email, phone, status, context_id, address_city, address_state, tags, created_at, updated_at, internal_notes')
            .in('status', ['Cold', 'Rejected'])
            .order('updated_at', { ascending: false });

        // 2. Busca dados enriquecidos do FlowUp (por lead_id)
        const { data: flowupData } = await supabase
            .from('SITE_FlowUpLeads')
            .select('*');

        const enrichMap: Record<string, any> = {};
        (flowupData || []).forEach((f: any) => {
            if (f.lead_id) enrichMap[f.lead_id] = f;
        });

        // 3. Merge: usa dados do CRM como base, enriquece com FlowUp se existir
        const merged: FlowUpLead[] = (crmLeads || []).map((l: any) => {
            const enrich = enrichMap[l.id];

            // Parse source/region do context_id (igual ao CRMView)
            const ctx = l.context_id || '';
            let lead_source_type = 'LP';
            if (ctx.startsWith('Quiz Completed')) lead_source_type = 'Quiz';
            else if (ctx.startsWith('LP:')) lead_source_type = 'LP';
            else if (ctx.includes('EUROPA') || ctx.includes('LISBOA')) lead_source_type = 'Evento';
            else if (ctx === 'Manual') lead_source_type = 'Manual';

            let region_city = l.address_city || '';
            if (!region_city) {
                if (ctx.includes('RIO PRETO') || ctx.toUpperCase().includes('SJRP')) region_city = 'Rio Preto';
                else if (ctx.toUpperCase().includes('LISBOA')) region_city = 'Lisboa';
                else if (ctx.toUpperCase().includes('SAO PAULO') || ctx.toUpperCase().includes('SP)')) region_city = 'São Paulo';
            }

            return {
                // Dados base do CRM
                id:              enrich?.id || l.id,     // usa id do FlowUp se existir (para activities)
                lead_id:         l.id,
                name:            l.name,
                email:           l.email || '',
                phone:           l.phone || '',
                region_city:     enrich?.region_city || region_city,
                region_state:    enrich?.region_state || l.address_state || '',
                lead_source_type: enrich?.lead_source_type || lead_source_type,
                tags:            l.tags || [],
                // Dados FlowUp enriquecidos (se existirem)
                course_interest: enrich?.course_interest || '',
                lost_reason:     enrich?.lost_reason || undefined,
                lost_reason_notes: enrich?.lost_reason_notes || '',
                phase:           enrich?.phase || (l.status === 'Rejected' ? 'accommodation' : 'accommodation') as FlowUpPhase,
                flowup_status:   enrich?.flowup_status || 'active' as const,
                entered_at:      enrich?.entered_at || l.updated_at || l.created_at,
                phase_started_at: enrich?.phase_started_at || l.updated_at || l.created_at,
                last_contacted_at: enrich?.last_contacted_at,
                reactivated_at:  enrich?.reactivated_at,
                contact_count:   enrich?.contact_count || 0,
                email_open_count: enrich?.email_open_count || 0,
                link_click_count: enrich?.link_click_count || 0,
                notes:           enrich?.notes || l.internal_notes || '',
                created_by:      enrich?.created_by,
                updated_at:      enrich?.updated_at || l.updated_at,
            };
        });

        setLeads(merged);
    };

    const fetchSegments = async () => {
        const { data } = await supabase
            .from('SITE_FlowUpSegments')
            .select('*')
            .eq('is_active', true)
            .order('name');
        if (data) setSegments(data as FlowUpSegment[]);
    };

    const fetchActivities = async (leadId?: string) => {
        let q = supabase.from('SITE_FlowUpActivities').select('*').order('created_at', { ascending: false });
        if (leadId) q = q.eq('flowup_lead_id', leadId);
        else q = q.limit(50);
        const { data } = await q;
        if (data) {
            if (leadId) setLeadActivities(data as FlowUpActivity[]);
            else setActivities(data as FlowUpActivity[]);
        }
    };

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            await Promise.all([fetchLeads(), fetchSegments(), fetchActivities()]);
            setLoading(false);
        };
        init();
    }, []);

    // ── Derived ────────────────────────────────────────────────────────────────

    const allRegions = useMemo(() => ['all', ...Array.from(new Set(leads.map(l => l.region_city).filter(Boolean))) as string[]], [leads]);
    const allCourses = useMemo(() => ['all', ...Array.from(new Set(leads.map(l => l.course_interest).filter(Boolean))) as string[]], [leads]);

    const filteredLeads = useMemo(() => leads.filter(l => {
        if (search && !l.name.toLowerCase().includes(search.toLowerCase()) &&
            !l.phone?.includes(search) && !l.email?.toLowerCase().includes(search.toLowerCase())) return false;
        if (filterPhase !== 'all' && l.phase !== filterPhase) return false;
        if (filterReason !== 'all' && l.lost_reason !== filterReason) return false;
        if (filterRegion !== 'all' && l.region_city !== filterRegion) return false;
        if (filterCourse !== 'all' && l.course_interest !== filterCourse) return false;
        return true;
    }), [leads, search, filterPhase, filterReason, filterRegion, filterCourse]);

    // ── Actions ────────────────────────────────────────────────────────────────

    const handleLeadClick = async (lead: FlowUpLead) => {
        setSelectedLead(lead);
        // Se o lead ainda não tem registro no FlowUp, carrega atividades via lead_id original
        const flowupId = lead.id !== lead.lead_id ? lead.id : null;
        if (flowupId) {
            await fetchActivities(flowupId);
        } else {
            setLeadActivities([]);
        }
    };

    /** Garante que o registro existe em SITE_FlowUpLeads e atualiza */
    const handleUpdateLead = async (id: string, data: Partial<FlowUpLead>) => {
        const lead = leads.find(l => l.id === id);
        if (!lead) return;

        // Se o id do lead ainda é o mesmo que o lead_id (sem registro FlowUp), criar primeiro
        if (id === lead.lead_id) {
            const { data: upserted } = await supabase.from('SITE_FlowUpLeads').upsert({
                lead_id:          lead.lead_id,
                name:             lead.name,
                email:            lead.email,
                phone:            lead.phone,
                region_city:      lead.region_city,
                region_state:     lead.region_state,
                lead_source_type: lead.lead_source_type,
                course_interest:  lead.course_interest,
                lost_reason:      lead.lost_reason,
                phase:            lead.phase,
                flowup_status:    lead.flowup_status,
                entered_at:       lead.entered_at,
                ...data,
            }, { onConflict: 'lead_id' }).select('id').single();
            if (upserted) {
                setLeads(prev => prev.map(l => l.id === id ? { ...l, ...data, id: upserted.id } : l));
                if (selectedLead?.id === id) setSelectedLead(prev => prev ? { ...prev, ...data, id: upserted.id } : null);
            }
        } else {
            await supabase.from('SITE_FlowUpLeads').update(data).eq('id', id);
            setLeads(prev => prev.map(l => l.id === id ? { ...l, ...data } : l));
            if (selectedLead?.id === id) setSelectedLead(prev => prev ? { ...prev, ...data } : null);
        }
    };

    const handleAddActivity = async (leadId: string, type: string, channel: string, subject: string, body?: string) => {
        const lead = leads.find(l => l.id === leadId);
        if (!lead) return;

        // Garante que o registro FlowUp existe
        let flowupId = leadId !== lead.lead_id ? leadId : null;
        if (!flowupId) {
            const { data: upserted } = await supabase.from('SITE_FlowUpLeads').upsert({
                lead_id:          lead.lead_id,
                name:             lead.name,
                email:            lead.email,
                phone:            lead.phone,
                region_city:      lead.region_city,
                region_state:     lead.region_state,
                lead_source_type: lead.lead_source_type,
                course_interest:  lead.course_interest,
                lost_reason:      lead.lost_reason,
                phase:            lead.phase,
                flowup_status:    'active',
                entered_at:       lead.entered_at,
            }, { onConflict: 'lead_id' }).select('id').single();
            if (upserted) {
                flowupId = upserted.id;
                setLeads(prev => prev.map(l => l.id === leadId ? { ...l, id: upserted.id } : l));
            }
        }

        if (!flowupId) return;
        const payload = { flowup_lead_id: flowupId, type, channel, subject, body: body || null, performed_by: user?.id || null };
        await supabase.from('SITE_FlowUpActivities').insert(payload);
        await supabase.from('SITE_FlowUpLeads').update({
            contact_count: (lead.contact_count || 0) + 1,
            last_contacted_at: new Date().toISOString()
        }).eq('id', flowupId);
        await fetchActivities(flowupId);
        await fetchLeads();
    };

    const handleAddLead = async () => {
        if (!addForm.name.trim()) return;
        const payload: any = {
            name: addForm.name.trim(),
            phone: addForm.phone || null,
            email: addForm.email || null,
            course_interest: addForm.course_interest || null,
            region_city: addForm.region_city || null,
            region_state: addForm.region_state || null,
            lead_source_type: addForm.lead_source_type || 'Manual',
            lost_reason: addForm.lost_reason || null,
            lost_reason_notes: addForm.lost_reason_notes || null,
            phase: 'accommodation',
            flowup_status: 'active',
            created_by: user?.id || null,
        };
        await supabase.from('SITE_FlowUpLeads').insert(payload);
        await fetchLeads();
        setShowAddModal(false);
        setAddForm({ name: '', phone: '', email: '', course_interest: '', region_city: '', region_state: '', lead_source_type: 'Manual', lost_reason: '', lost_reason_notes: '' });
    };

    // ── Tabs Config ────────────────────────────────────────────────────────────

    const tabs = [
        { id: 'dashboard' as const, label: 'Dashboard', icon: <BarChart2 size={15} /> },
        { id: 'leads' as const, label: `Base de Leads (${leads.filter(l => l.flowup_status === 'active').length})`, icon: <Users size={15} /> },
        { id: 'segments' as const, label: 'Segmentos', icon: <Layers size={15} /> },
        { id: 'activities' as const, label: 'Atividades', icon: <Activity size={15} /> },
    ];

    const selectorClass = "p-2 bg-gray-50 dark:bg-gray-800 rounded-lg text-xs border border-gray-200 dark:border-gray-700 dark:text-white outline-none focus:border-black dark:focus:border-white";

    // ── Render ─────────────────────────────────────────────────────────────────

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                            <RefreshCw size={16} className="text-white" />
                        </div>
                        <h2 className="text-xl font-black text-gray-900 dark:text-white">FlowUp</h2>
                        <span className="px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-[10px] font-black rounded-full uppercase tracking-widest">
                            Retrabalho de Leads
                        </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 ml-10">Pipeline de reengajamento inteligente para leads perdidos e esfriados</p>
                </div>
                <button onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-xl font-bold text-sm hover:opacity-80 transition-opacity">
                    <Plus size={16} /> Adicionar Lead
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-gray-100 dark:bg-gray-800/50 p-1 rounded-xl mb-6 overflow-x-auto">
                {tabs.map(t => (
                    <button key={t.id} onClick={() => setActiveTab(t.id)}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
                            activeTab === t.id
                                ? 'bg-white dark:bg-[#1A1A1A] text-gray-900 dark:text-white shadow-sm'
                                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                        }`}>
                        {t.icon} {t.label}
                    </button>
                ))}
            </div>

            {/* Loading */}
            {loading ? (
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <RefreshCw className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-3" />
                        <p className="text-sm text-gray-500">Carregando FlowUp...</p>
                    </div>
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto">
                    {/* ── DASHBOARD ── */}
                    {activeTab === 'dashboard' && <DashboardTab leads={leads} />}

                    {/* ── LEADS ── */}
                    {activeTab === 'leads' && (
                        <div className="space-y-4">
                            {/* Filtros */}
                            <div className="flex flex-wrap gap-2 items-center">
                                <div className="flex items-center gap-2 flex-1 min-w-[200px] bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2 border border-gray-200 dark:border-gray-700">
                                    <Search size={14} className="text-gray-400" />
                                    <input
                                        className="flex-1 bg-transparent text-sm outline-none dark:text-white placeholder-gray-400"
                                        placeholder="Buscar por nome, email, telefone..."
                                        value={search} onChange={e => setSearch(e.target.value)}
                                    />
                                    {search && <button onClick={() => setSearch('')}><X size={14} className="text-gray-400" /></button>}
                                </div>
                                <select className={selectorClass} value={filterPhase} onChange={e => setFilterPhase(e.target.value as FlowUpPhase | 'all')}>
                                    <option value="all">Todas as Fases</option>
                                    {(Object.keys(PHASE_CONFIG) as FlowUpPhase[]).map(p => (
                                        <option key={p} value={p}>{PHASE_CONFIG[p].label}</option>
                                    ))}
                                </select>
                                <select className={selectorClass} value={filterReason} onChange={e => setFilterReason(e.target.value as FlowUpLostReason | 'all')}>
                                    <option value="all">Todos os Motivos</option>
                                    {Object.entries(LOST_REASON_LABELS).map(([k, v]) => (
                                        <option key={k} value={k}>{v}</option>
                                    ))}
                                </select>
                                <select className={selectorClass} value={filterRegion} onChange={e => setFilterRegion(e.target.value)}>
                                    {allRegions.map(r => <option key={r} value={r}>{r === 'all' ? 'Todas as Regiões' : r}</option>)}
                                </select>
                                <select className={selectorClass} value={filterCourse} onChange={e => setFilterCourse(e.target.value)}>
                                    {allCourses.map(c => <option key={c} value={c}>{c === 'all' ? 'Todos os Cursos' : c}</option>)}
                                </select>
                            </div>

                            {/* Counter */}
                            <p className="text-xs text-gray-500">
                                Mostrando <strong className="text-gray-900 dark:text-white">{filteredLeads.length}</strong> de {leads.length} leads
                            </p>

                            {filteredLeads.length === 0 ? (
                                <div className="text-center py-16">
                                    <Users className="w-12 h-12 text-gray-200 dark:text-gray-700 mx-auto mb-3" />
                                    <p className="text-gray-400 font-medium">Nenhum lead encontrado</p>
                                    <p className="text-xs text-gray-300 mt-1">Leads com status "Esfriou" ou "Perdido" no CRM entram automaticamente aqui.</p>
                                    <button onClick={() => setShowAddModal(true)} className="mt-4 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-xl text-sm font-bold">
                                        + Adicionar Manualmente
                                    </button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {filteredLeads.map(lead => (
                                        <FlowUpLeadCard key={lead.id} lead={lead} onClick={() => handleLeadClick(lead)} />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── SEGMENTS ── */}
                    {activeTab === 'segments' && (
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <p className="text-xs text-gray-500">
                                    {segments.length} segmentos ativos — Contagens calculadas em tempo real com base nos leads atuais
                                </p>
                            </div>
                            {segments.length === 0 ? (
                                <div className="text-center py-16 text-gray-400">
                                    <Layers className="w-10 h-10 mx-auto mb-3 opacity-30" />
                                    <p>Nenhum segmento encontrado. Execute o SQL de migração no Supabase.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {segments.map(seg => (
                                        <SegmentCard key={seg.id} seg={seg} leads={leads} />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── ACTIVITIES ── */}
                    {activeTab === 'activities' && (
                        <div>
                            <p className="text-xs text-gray-500 mb-4">Últimas 50 atividades registradas no FlowUp</p>
                            {activities.length === 0 ? (
                                <div className="text-center py-16 text-gray-400">
                                    <Activity className="w-10 h-10 mx-auto mb-3 opacity-30" />
                                    <p>Nenhuma atividade ainda. As ações nos leads aparecerão aqui.</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {activities.map(act => {
                                        const cfg = ACTIVITY_CONFIG[act.type] || { label: act.type, color: 'text-gray-500', icon: <Activity size={14} /> };
                                        const lead = leads.find(l => l.id === act.flowup_lead_id);
                                        return (
                                            <div key={act.id} className="flex items-start gap-3 p-3 bg-white dark:bg-[#1E1E1E] rounded-xl border border-gray-100 dark:border-gray-800">
                                                <span className={`mt-0.5 ${cfg.color}`}>{cfg.icon}</span>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{cfg.label}</span>
                                                        {lead && (
                                                            <span className="text-xs text-gray-400">— {lead.name}</span>
                                                        )}
                                                    </div>
                                                    {act.subject && <p className="text-xs text-gray-500 truncate">{act.subject}</p>}
                                                    {act.body && <p className="text-xs text-gray-400 line-clamp-1 mt-0.5">{act.body}</p>}
                                                </div>
                                                <span className="text-[10px] text-gray-400 whitespace-nowrap">{formatDate(act.created_at)}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Lead Modal */}
            {selectedLead && (
                <FlowUpLeadModal
                    lead={selectedLead}
                    activities={leadActivities}
                    onClose={() => { setSelectedLead(null); setLeadActivities([]); }}
                    onUpdate={handleUpdateLead}
                    onAddActivity={handleAddActivity}
                />
            )}

            {/* Add Lead Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-[#1A1A1A] rounded-2xl w-full max-w-md shadow-2xl p-6">
                        <div className="flex justify-between items-center mb-5">
                            <h3 className="font-black text-gray-900 dark:text-white text-lg">Adicionar Lead ao FlowUp</h3>
                            <button onClick={() => setShowAddModal(false)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                                <X size={18} className="text-gray-500" />
                            </button>
                        </div>
                        <div className="space-y-3">
                            <input className="w-full p-3 bg-gray-50 dark:bg-gray-800 rounded-xl text-sm dark:text-white border border-transparent focus:border-black dark:focus:border-white outline-none" placeholder="Nome *" value={addForm.name} onChange={e => setAddForm(p => ({...p, name: e.target.value}))} />
                            <div className="grid grid-cols-2 gap-3">
                                <input className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl text-sm dark:text-white border border-transparent focus:border-black dark:focus:border-white outline-none" placeholder="Telefone" value={addForm.phone} onChange={e => setAddForm(p => ({...p, phone: e.target.value}))} />
                                <input className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl text-sm dark:text-white border border-transparent focus:border-black dark:focus:border-white outline-none" placeholder="Email" value={addForm.email} onChange={e => setAddForm(p => ({...p, email: e.target.value}))} />
                            </div>
                            <input className="w-full p-3 bg-gray-50 dark:bg-gray-800 rounded-xl text-sm dark:text-white border border-transparent focus:border-black dark:focus:border-white outline-none" placeholder="Curso de interesse (ex: Suspensão W-Tech)" value={addForm.course_interest} onChange={e => setAddForm(p => ({...p, course_interest: e.target.value}))} />
                            <div className="grid grid-cols-2 gap-3">
                                <input className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl text-sm dark:text-white border border-transparent focus:border-black dark:focus:border-white outline-none" placeholder="Cidade" value={addForm.region_city} onChange={e => setAddForm(p => ({...p, region_city: e.target.value}))} />
                                <input className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl text-sm dark:text-white border border-transparent focus:border-black dark:focus:border-white outline-none" placeholder="Estado (ex: SP)" value={addForm.region_state} onChange={e => setAddForm(p => ({...p, region_state: e.target.value}))} />
                            </div>
                            <select className="w-full p-3 bg-gray-50 dark:bg-gray-800 rounded-xl text-sm dark:text-white border border-transparent focus:border-black dark:focus:border-white outline-none" value={addForm.lead_source_type} onChange={e => setAddForm(p => ({...p, lead_source_type: e.target.value}))}>
                                <option value="Manual">Manual</option>
                                <option value="Quiz">Quiz</option>
                                <option value="LP">LP</option>
                                <option value="Evento">Evento</option>
                                <option value="WhatsApp">WhatsApp</option>
                            </select>
                            <select className="w-full p-3 bg-gray-50 dark:bg-gray-800 rounded-xl text-sm dark:text-white border border-transparent focus:border-black dark:focus:border-white outline-none" value={addForm.lost_reason} onChange={e => setAddForm(p => ({...p, lost_reason: e.target.value as FlowUpLostReason}))}>
                                <option value="">Motivo da Perda (opcional)</option>
                                {Object.entries(LOST_REASON_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                            </select>
                            {addForm.lost_reason && (
                                <textarea className="w-full p-3 bg-gray-50 dark:bg-gray-800 rounded-xl text-sm dark:text-white border border-transparent focus:border-black dark:focus:border-white outline-none resize-none h-16" placeholder="Observações sobre o motivo..." value={addForm.lost_reason_notes} onChange={e => setAddForm(p => ({...p, lost_reason_notes: e.target.value}))} />
                            )}
                        </div>
                        <button onClick={handleAddLead} className="w-full mt-5 bg-black dark:bg-white text-white dark:text-black font-bold py-3 rounded-xl hover:opacity-80 transition-opacity">
                            Adicionar ao FlowUp
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FlowUpView;
