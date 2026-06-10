import React, { useState, useEffect, useMemo } from 'react';
import { useRegisterPage } from '../keyboard/AdminKeyboardProvider';
import { Users, Settings, Plus, MoreVertical, X, Save, Clock, AlertTriangle, Thermometer, TrendingUp, Search, Filter, List, KanbanSquare, Globe, GraduationCap, Phone, MessageCircle, CheckCircle, ShoppingBag, Banknote, Calendar, ArrowRight, Copy, Trash2, Share2, RefreshCw, CheckSquare, Mail, User, History } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../context/AuthContext';
import type { Lead } from '../../../types';
import { createPaymentLink } from '../../../lib/asaas';
import { createStripePaymentLink } from '../../../lib/stripe';
import { SplashedPushNotifications, SplashedPushNotificationsHandle } from '@/components/ui/splashed-push-notifications';
import LeadTaskSidebar from './LeadTaskSidebar';
import { useRef } from 'react'; // Ensure useRef is imported
import { BauhausCard } from '@/components/ui/bauhaus-card';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { FileDown, FileText, FileSpreadsheet, Download } from 'lucide-react';
import { logUserActivity } from '../../../lib/auditLogger';

// Helper for Drag & Drop
const DragContext = React.createContext<{
    draggedId: string | null;
    setDraggedId: (id: string | null) => void;
}>({ draggedId: null, setDraggedId: () => { } });

// --- Funnel Chart Component ---
// --- Funnel Chart Component (3D Horizontal) ---
const FunnelChart = ({ leads }: { leads: Lead[] }) => {
    // Calculate Counts
    const counts = {
        total: Math.max(leads.length, 1),
        new: leads.filter(l => l.status === 'New').length,
        contacted: leads.filter(l => l.status === 'Contacted').length,
        qualified: leads.filter(l => l.status === 'Qualified' || l.status === 'Negotiating').length,
        won: leads.filter(l => l.status === 'Converted' || l.status === 'Matriculated').length,
        lost: leads.filter(l => l.status === 'Cold' || l.status === 'Rejected').length
    };

    const stages = [
        { label: 'Entrada', count: counts.new, color: '#3b82f6', from: '#60a5fa', to: '#2563eb' },
        { label: 'Qualificação', count: counts.contacted, color: '#6366f1', from: '#818cf8', to: '#4f46e5' },
        { label: 'Negociação', count: counts.qualified, color: '#a855f7', from: '#c084fc', to: '#9333ea' },
        { label: 'Ganho', count: counts.won, color: '#22c55e', from: '#4ade80', to: '#16a34a' }
    ];

    return (
        <div className="mb-6 w-full bg-[var(--admin-surface-1)] p-4 rounded-2xl shadow-sm border border-[var(--admin-border)] relative overflow-hidden transition-colors">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h3 className="font-bold text-[var(--admin-text-primary)]">Visão do Funil</h3>
                    <p className="text-xs text-[var(--admin-text-secondary)]">Fluxo de conversão atual</p>
                </div>
                <div className="bg-[var(--admin-surface-3)] px-3 py-1 rounded-full text-xs font-bold text-[var(--admin-text-secondary)]">
                    Total: {leads.length}
                </div>
            </div>

            <div className="flex items-center justify-between h-32 relative px-4">
                {/* Connecting Line (Background Pipe) */}
                <div className="absolute top-1/2 left-0 w-full h-4 bg-[var(--admin-surface-3)] -translate-y-1/2 rounded-full z-0"></div>

                {stages.map((stage, i) => {
                    const isLast = i === stages.length - 1;
                    const percent = (stage.count / counts.total) * 100;

                    return (
                        <div key={i} className="relative z-10 flex flex-col items-center group cursor-pointer" style={{ flex: 1 }}>
                            {/* 3D Node */}
                            <div className="relative">
                                {/* Glow Effect */}
                                <div className="absolute inset-0 bg-white blur-xl opacity-0 group-hover:opacity-50 transition-opacity duration-500" style={{ backgroundColor: stage.color }}></div>

                                <svg width="100" height="80" viewBox="0 0 100 80" className="drop-shadow-xl transition-transform duration-300 group-hover:-translate-y-1">
                                    <defs>
                                        <linearGradient id={`grad-${i}`} x1="0%" y1="0%" x2="0%" y2="100%">
                                            <stop offset="0%" stopColor={stage.from} />
                                            <stop offset="100%" stopColor={stage.to} />
                                        </linearGradient>
                                        <filter id={`shadow-${i}`}>
                                            <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor={stage.color} floodOpacity="0.3" />
                                        </filter>
                                    </defs>

                                    {/* Hexagon or Circle Shape */}
                                    <path
                                        d="M50 0 L95 25 L95 55 L50 80 L5 55 L5 25 Z"
                                        fill={`url(#grad-${i})`}
                                        stroke="white"
                                        strokeWidth="2"
                                        filter={`url(#shadow-${i})`}
                                    />

                                    {/* Inner Shine */}
                                    <path d="M50 5 L85 25 L50 40 L15 25 Z" fill="white" fillOpacity="0.2" />
                                </svg>

                                {/* Centered Count & % */}
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-white pointer-events-none pt-1">
                                    <span className="text-2xl font-black leading-none drop-shadow-md">{stage.count}</span>
                                    <span className="text-[9px] font-bold opacity-80">{percent.toFixed(0)}%</span>
                                </div>
                            </div>

                            {/* Label */}
                            <div className="mt-3 text-center">
                                <span className="block text-xs font-bold text-[var(--admin-text-primary)] group-hover:text-wtech-gold transition-colors uppercase tracking-wider">{stage.label}</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Legend / Stats Footer */}
            <div className="flex gap-4 mt-2 justify-center border-t border-[var(--admin-border)] pt-2 opacity-60 hover:opacity-100 transition-opacity">
                <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                    <span className="text-[10px] font-bold text-[var(--admin-text-tertiary)]">{counts.lost} Perdidos</span>
                </div>
            </div>
        </div>
    );
};


const KanbanColumn = ({ title, status, leads, onMove, onDropLead, onLeadClick, onTasks, usersMap, selectedLeadIds, onToggleSelection }: any) => {
    const { draggedId } = React.useContext(DragContext);

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        if (draggedId) onDropLead(draggedId, status);
    };

    const handleDragOver = (e: React.DragEvent) => e.preventDefault();

    // Average Time Calculation
    const averageTime = useMemo(() => {
        if (leads.length === 0) return '-';
        const now = new Date().getTime();
        const totalMs = leads.reduce((acc: number, lead: any) => {
            const start = new Date(lead.updated_at || lead.createdAt).getTime();
            return acc + (now - start);
        }, 0);
        const avgMs = totalMs / leads.length;

        const days = Math.floor(avgMs / (1000 * 60 * 60 * 24));
        const hours = Math.floor((avgMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

        if (days > 0) return `${days}d ${hours}h`;
        return `${hours}h médios`;
    }, [leads]);

    const statusConfig: Record<string, { dot: string; label: string; bg: string; text: string; border: string }> = {
        'New':       { dot: '#0A0A0A', label: 'Novos',        bg: 'bg-[var(--admin-surface-1)]', text: 'text-[var(--admin-text-primary)]',   border: 'border-[var(--admin-border)]' },
        'Contacted': { dot: '#2563eb', label: 'Atendimento',  bg: 'bg-blue-50 dark:bg-blue-950/30',     text: 'text-blue-700 dark:text-blue-300',    border: 'border-blue-100 dark:border-blue-900/50' },
        'Qualified': { dot: '#7c3aed', label: 'Negociação',   bg: 'bg-purple-50 dark:bg-purple-950/30', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-100 dark:border-purple-900/50' },
        'Converted': { dot: '#16a34a', label: 'Fechado',      bg: 'bg-green-50 dark:bg-green-950/30',   text: 'text-green-700 dark:text-green-300',  border: 'border-green-100 dark:border-green-900/50' },
        'Cold':      { dot: '#6b7280', label: 'Perdido',      bg: 'bg-[var(--admin-surface-2)]',        text: 'text-[var(--admin-text-tertiary)]',   border: 'border-[var(--admin-border)]' },
    };
    const sc = statusConfig[status] ?? statusConfig['New'];
    const allSelected = leads.length > 0 && leads.every((l: any) => selectedLeadIds.has(l.id));

    return (
        <div
            className={`flex-1 min-w-[220px] flex flex-col h-full rounded-2xl border transition-all
                ${draggedId
                    ? 'bg-[var(--admin-surface-3)] border-2 border-dashed border-[var(--admin-border)] scale-[0.99]'
                    : `bg-[var(--admin-surface-2)] ${sc.border}`
                }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
        >
            {/* ── Cabeçalho da Coluna ── */}
            <div className={`px-4 pt-4 pb-3 rounded-t-2xl border-b ${sc.border}`}>
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: sc.dot }} />
                        <h3 className={`font-black text-xs uppercase tracking-widest ${sc.text}`}>{title}</h3>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-black ${sc.text} bg-black/5 dark:bg-white/10`}>
                            {leads.length}
                        </span>
                        {leads.length > 0 && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    leads.forEach((l: any) => {
                                        if (allSelected) { if (selectedLeadIds.has(l.id)) onToggleSelection(l.id); }
                                        else { if (!selectedLeadIds.has(l.id)) onToggleSelection(l.id); }
                                    });
                                }}
                                className={`p-0.5 rounded transition-all hover:scale-110 ${sc.text} opacity-50 hover:opacity-100`}
                                title={allSelected ? 'Desmarcar Todos' : 'Selecionar Todos'}
                            >
                                <CheckSquare size={13} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Stats: tempo médio + total (converted) */}
                <div className="flex items-center justify-between gap-2">
                    <span className={`text-[10px] font-medium flex items-center gap-1 opacity-60 ${sc.text}`}>
                        <Clock size={9} /> {averageTime}
                    </span>
                    {(status === 'Converted' || status === 'Matriculated') && (
                        <span className={`text-[10px] font-black flex items-center gap-1 ${sc.text}`}>
                            <Banknote size={9} />
                            {leads.reduce((acc: number, l: any) => acc + (Number(l.conversion_value) || 0), 0)
                                .toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                    )}
                </div>
            </div>

            {/* ── Lista de Cards ── */}
            <div className="flex-1 overflow-y-auto p-2.5 space-y-2 custom-scrollbar">
                {leads.map((lead: any) => (
                    <LeadCard
                        key={lead.id}
                        lead={lead}
                        onClick={() => onLeadClick(lead)}
                        onMove={onDropLead}
                        onTasks={onTasks}
                        usersMap={usersMap}
                        isSelected={selectedLeadIds.has(lead.id)}
                        onToggleSelection={() => onToggleSelection(lead.id)}
                    />
                ))}
                {leads.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-10 gap-2 text-[var(--admin-text-tertiary)]">
                        <div className="w-8 h-8 rounded-full bg-[var(--admin-surface-3)] flex items-center justify-center">
                            <Users size={14} />
                        </div>
                        <span className="text-[10px] font-medium">Nenhum lead aqui</span>
                    </div>
                )}
            </div>
        </div>
    );
};

// Import helper
import { calculateCommercialTime, formatCommercialTime } from '../../../lib/businessTime';

// Hook to calculate time spent
const useTimeInStatus = (dateString: string) => {
    const [timeDisplay, setTimeDisplay] = useState('');
    const [isLongWait, setIsLongWait] = useState(false);

    useEffect(() => {
        const calculate = () => {
            const minutes = calculateCommercialTime(dateString);
            setTimeDisplay(formatCommercialTime(minutes));

            // Logic for Long Wait: > 2 commercial days (approx 20h) or > 4h
            // User requirement: "timer so roda horario comercial". "Travar sabado e domingo".
            // Let's keep the red alerta simple: > 8h commercial time? 
            // Or stick to some logic.
            // Let's say > 20h commercial (2 days) is long.
            if (minutes > 1200) setIsLongWait(true); // 20 hours
        };
        calculate();
        const interval = setInterval(calculate, 60000); // Update every minute
        return () => clearInterval(interval);
    }, [dateString]);

    return { timeDisplay, isLongWait };
};



import { Badge } from '@/components/ui/badge';
import { Edit } from 'lucide-react';

const LeadCard: React.FC<{ 
    lead: any, 
    onClick: () => void, 
    onMove?: any, 
    onTasks: (lead: any) => void, 
    usersMap: Record<string, string>,
    isSelected: boolean,
    onToggleSelection: () => void
}> = ({ lead, onClick, onMove, onTasks, usersMap, isSelected, onToggleSelection }) => {
    const { setDraggedId } = React.useContext(DragContext);
    const [isDragging, setIsDragging] = React.useState(false);

    // Timer Logic
    const statusDate = lead.updated_at || lead.createdAt;
    const { timeDisplay, isLongWait } = useTimeInStatus(statusDate);

    // Quiz Data Parsing
    const quizData = lead.quiz_data || (lead.internalNotes && lead.internalNotes.startsWith('{') ? JSON.parse(lead.internalNotes) : null);
    const quizTemp = quizData?.temperature; // 'Frio', 'Morno', 'Quente'

    // Color Mapping
    const getAccentColor = () => {
        if (quizTemp?.toLowerCase().includes('quen') || quizTemp?.toLowerCase().includes('alta')) return '#ef4444'; // Red
        if (quizTemp?.toLowerCase().includes('morn')) return '#f97316'; // Orange
        return '#3b82f6'; // Blue default
    };

    const accentColor = getAccentColor();

    // Quick Move Logic
    const nextStatusMap: Record<string, string> = {
        'New': 'Contacted',
        'Contacted': 'Qualified',
        'Qualified': 'Converted', 
        'Negotiating': 'Converted',
        'Cold': 'New'
    };

    const handleNext = (e: any) => {
        e.stopPropagation();
        const next = nextStatusMap[lead.status];
        if (next && onMove) {
            onMove(lead.id, next, lead);
        }
    };

    const attendantName = lead.assignedTo && usersMap[lead.assignedTo] ? usersMap[lead.assignedTo].split(' ')[0] : 'S/ Atendente';

    // Helper to parse source and city
    const getLeadInfo = () => {
        const ctx = lead.contextId || '';
        let source = 'Site';
        let city = lead.address_city || '';

        if (ctx.startsWith('Quiz Completed')) {
            source = 'Quiz';
            if (!city) {
                // Extract from "Quiz Completed: CURSO SUSPENSÃO SJRP [QUENTE]" -> SJRP
                const match = ctx.match(/:\s*(.+?)\s*\[/);
                const titlePart = match ? match[1] : ctx.split(':').pop() || '';
                // Try to find known city patterns if address_city is missing
                const upperCtx = ctx.toUpperCase();
                if (upperCtx.includes('RIO PRETO') || upperCtx.includes('SJRP')) city = 'Rio Preto';
                else if (upperCtx.includes('LISBOA')) city = 'Lisboa';
                else city = titlePart.split(' ').pop() || '';
            }
        } else if (ctx.startsWith('LP:')) {
            source = 'LP';
            if (!city) {
                // Extract from "LP: Curso de Suspensão W-TECH (curso-suspensao-sjrp)" -> SJRP
                const match = ctx.match(/\((.+?)\)/);
                const slugPart = match ? match[1] : '';
                if (slugPart) {
                    city = slugPart.split('-').pop()?.toUpperCase() || '';
                }
            }
        } else if (ctx.includes('EUROPA') || ctx.includes('LISBOA')) {
            source = 'Evento';
            city = city || 'Lisboa';
        } else if (ctx === 'Manual') {
            source = 'Manual';
        }

        // Fix common incomplete city markers
        if (city.toUpperCase() === 'TECH') city = 'Rio Preto';
        if (city.toUpperCase() === 'PAULO') city = 'São Paulo';

        return { source, city };
    };

    const { source, city } = getLeadInfo();

    const initials = lead.name
        ? lead.name.trim().split(/\s+/).slice(0, 2).map((n: string) => n[0]?.toUpperCase() ?? '').join('')
        : '?';

    return (
        <div
            onClick={onClick}
            draggable
            onDragStart={() => { setDraggedId(lead.id); setIsDragging(true); }}
            onDragEnd={() => { setDraggedId(null); setIsDragging(false); }}
            className={`relative bg-[var(--admin-surface-1)] rounded-xl border transition-all cursor-move group overflow-hidden
                ${isLongWait ? 'ring-1 ring-red-500/30' : ''}
                ${isSelected
                    ? 'ring-2 ring-wtech-gold border-wtech-gold/50 bg-wtech-gold/5'
                    : 'border-[var(--admin-border)] hover:border-wtech-gold/40 hover:shadow-md hover:-translate-y-px'
                }`}
        >
            {/* Left temperature bar */}
            <div className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-xl" style={{ backgroundColor: accentColor }} />

            <div className="pl-4 pr-3 pt-3 pb-2.5 flex flex-col gap-2">

                {/* ── Row 1: Avatar + Name + Checkbox ── */}
                <div className="flex items-start gap-2">
                    {/* Avatar com iniciais */}
                    <div
                        className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-white font-black text-[11px] shadow-sm select-none"
                        style={{ backgroundColor: accentColor }}
                    >
                        {initials}
                    </div>

                    {/* Nome + badges */}
                    <div className="flex-1 min-w-0 pt-0.5">
                        <h4 className="font-black text-[var(--admin-text-primary)] text-sm leading-tight line-clamp-1">{lead.name}</h4>
                        <div className="flex flex-wrap items-center gap-1 mt-0.5">
                            <span className="text-[9px] font-bold bg-[var(--admin-surface-3)] px-1.5 py-0.5 rounded-md text-[var(--admin-text-tertiary)] uppercase tracking-wide">
                                {source}
                            </span>
                            {city && (
                                <span className="text-[9px] font-bold bg-wtech-gold/10 px-1.5 py-0.5 rounded-md text-wtech-gold uppercase tracking-wide border border-wtech-gold/20">
                                    {city}
                                </span>
                            )}
                            {quizTemp && (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wide"
                                    style={{ backgroundColor: `${accentColor}22`, color: accentColor }}>
                                    {quizTemp}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Checkbox */}
                    <div
                        onClick={(e) => { e.stopPropagation(); onToggleSelection(); }}
                        className={`flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-md border transition-all cursor-pointer mt-0.5
                            ${isSelected
                                ? 'bg-wtech-gold border-wtech-gold text-black'
                                : 'border-[var(--admin-border)] opacity-0 group-hover:opacity-100 bg-[var(--admin-surface-1)] hover:border-wtech-gold'
                            }`}
                    >
                        {isSelected && <CheckCircle size={12} strokeWidth={3} />}
                    </div>
                </div>

                {/* ── Row 2: Contato ── */}
                {(lead.phone || lead.email) && (
                    <div className="bg-[var(--admin-surface-2)] rounded-lg px-2.5 py-1.5 flex flex-col gap-0.5">
                        {lead.phone && (
                            <span className="text-[10px] text-[var(--admin-text-secondary)] flex items-center gap-1.5">
                                <Phone size={9} className="flex-shrink-0 text-[var(--admin-text-tertiary)]" />
                                <span className="font-mono tracking-tight">{lead.phone}</span>
                            </span>
                        )}
                        {lead.email && (
                            <span className="text-[10px] text-[var(--admin-text-secondary)] truncate flex items-center gap-1.5">
                                <Mail size={9} className="flex-shrink-0 text-[var(--admin-text-tertiary)]" />
                                {lead.email}
                            </span>
                        )}
                    </div>
                )}

                {/* ── Row 3: Tags ── */}
                {lead.tags && lead.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                        {lead.tags.slice(0, 3).map((tag: string, i: number) => (
                            <span key={`${lead.id}-tag-${i}`}
                                className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-[var(--admin-surface-3)] text-[var(--admin-text-tertiary)] border border-[var(--admin-border)]">
                                {tag}
                            </span>
                        ))}
                        {lead.tags.length > 3 && (
                            <span className="text-[9px] text-[var(--admin-text-tertiary)] px-1">+{lead.tags.length - 3}</span>
                        )}
                    </div>
                )}

                {/* ── Row 4: Footer — Atendente + Tempo + Ações ── */}
                <div className="flex items-center justify-between gap-1 pt-1.5 border-t border-[var(--admin-border-subtle)]">
                    {/* Atendente + Tempo */}
                    <div className="flex items-center gap-1 min-w-0 flex-wrap">
                        <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold truncate max-w-[90px]
                            ${lead.assignedTo
                                ? 'bg-[var(--admin-surface-2)] text-[var(--admin-text-secondary)]'
                                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                            }`}>
                            <User size={9} className="flex-shrink-0" />
                            <span className="truncate uppercase tracking-wide">{attendantName}</span>
                        </div>
                        <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold
                            ${isLongWait ? 'bg-red-500/10 text-red-500' : 'bg-[var(--admin-surface-2)] text-[var(--admin-text-tertiary)]'}`}>
                            <Clock size={9} />
                            <span className="font-mono">{timeDisplay}</span>
                        </div>
                    </div>

                    {/* Botões de ação */}
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                        {lead.phone && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const clean = String(lead.phone).replace(/\D/g, '');
                                    const val = clean.length <= 11 ? `55${clean}` : clean;
                                    window.open(`https://wa.me/${val}`, '_blank');
                                }}
                                className="p-1 hover:bg-green-500/10 rounded-md text-[var(--admin-text-tertiary)] hover:text-green-500 transition-all active:scale-95"
                                title="WhatsApp"
                            >
                                <MessageCircle size={13} />
                            </button>
                        )}
                        <button
                            onClick={(e) => { e.stopPropagation(); onTasks(lead); }}
                            className="p-1 hover:bg-[var(--admin-surface-3)] rounded-md text-[var(--admin-text-tertiary)] hover:text-blue-500 transition-all active:scale-95"
                            title="Tarefas"
                        >
                            <Clock size={13} />
                        </button>
                        {nextStatusMap[lead.status] && (
                            <button
                                onClick={handleNext}
                                className="p-1 hover:bg-green-500/10 rounded-md text-[var(--admin-text-tertiary)] hover:text-green-500 transition-all active:scale-95"
                                title={`→ ${nextStatusMap[lead.status]}`}
                            >
                                <ArrowRight size={13} />
                            </button>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};

interface CRMViewProps {
    onConvertLead?: (lead: Lead, conversionData?: any) => void;
}

const NewLeadModal = ({ isOpen, onClose, onSave }: any) => {
    const [form, setForm] = useState({ name: '', phone: '', email: '', cpf: '', t_shirt_size: '', value: 0 }); // Added value

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[var(--admin-surface-1)] p-6 rounded-2xl w-full max-w-md shadow-2xl border border-[var(--admin-border)]">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-[var(--admin-text-primary)]">Novo Lead</h3>
                    <button onClick={onClose} className="p-1.5 hover:bg-[var(--admin-surface-3)] rounded-lg transition-colors text-[var(--admin-text-secondary)]"><X size={18} /></button>
                </div>
                <div className="space-y-4">
                    <input autoFocus placeholder="Nome Completo" className="w-full px-3 py-2.5 bg-[var(--admin-surface-2)] border border-[var(--admin-border)] rounded-xl text-sm text-[var(--admin-text-primary)] placeholder:text-[var(--admin-text-tertiary)] outline-none focus:border-wtech-gold transition-all" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                    <input placeholder="Telefone" className="w-full px-3 py-2.5 bg-[var(--admin-surface-2)] border border-[var(--admin-border)] rounded-xl text-sm text-[var(--admin-text-primary)] placeholder:text-[var(--admin-text-tertiary)] outline-none focus:border-wtech-gold transition-all" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
                    <input placeholder="Email (Opcional)" className="w-full px-3 py-2.5 bg-[var(--admin-surface-2)] border border-[var(--admin-border)] rounded-xl text-sm text-[var(--admin-text-primary)] placeholder:text-[var(--admin-text-tertiary)] outline-none focus:border-wtech-gold transition-all" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />

                    <div className="grid grid-cols-2 gap-4">
                        <input placeholder="CPF" className="w-full px-3 py-2.5 bg-[var(--admin-surface-2)] border border-[var(--admin-border)] rounded-xl text-sm text-[var(--admin-text-primary)] placeholder:text-[var(--admin-text-tertiary)] outline-none focus:border-wtech-gold transition-all" value={form.cpf} onChange={e => setForm({...form, cpf: e.target.value})} />
                        <select className="w-full px-3 py-2.5 bg-[var(--admin-surface-2)] border border-[var(--admin-border)] rounded-xl text-sm text-[var(--admin-text-primary)] outline-none focus:border-wtech-gold transition-all" value={form.t_shirt_size} onChange={e => setForm({...form, t_shirt_size: e.target.value})}>
                            <option value="">Tamanho Camiseta</option>
                            <option value="P">P</option>
                            <option value="M">M</option>
                            <option value="G">G</option>
                            <option value="GG">GG</option>
                            <option value="EXG">EXG</option>
                        </select>
                    </div>

                    {/* Value Input */}
                    <div>
                        <label className="block text-[10px] font-black text-[var(--admin-text-tertiary)] uppercase tracking-widest mb-1.5">Valor Potencial (R$)</label>
                        <input
                            type="number"
                            placeholder="0,00"
                            className="w-full px-3 py-2.5 bg-[var(--admin-surface-2)] border border-[var(--admin-border)] rounded-xl text-sm text-[var(--admin-text-primary)] font-mono outline-none focus:border-wtech-gold transition-all"
                            value={form.value}
                            onChange={e => setForm({...form, value: Number(e.target.value)})}
                        />
                    </div>
                </div>
                <button onClick={() => onSave(form)} className="w-full py-3 bg-gradient-to-r from-wtech-gold to-yellow-600 text-black font-black rounded-xl mt-6 hover:scale-[1.02] active:scale-95 transition-all shadow-md shadow-yellow-500/20">
                    Criar Lead
                </button>
            </motion.div>
        </div>
    );
};

const STATUS_LABELS: Record<string, string> = {
    New: 'Novo', Contacted: 'Contactado', Qualified: 'Qualificado', Negotiating: 'Em Negociação',
    Converted: 'Ganho', Matriculated: 'Matriculado', Cold: 'Frio', Rejected: 'Perdido', Lost: 'Perdido'
};

const EditLeadModal = ({ lead, isOpen, onClose, onSave, onDelete, onTasks, users }: any) => {
    const [form, setForm] = useState({ ...lead });
    // Tags Local State for Modal
    const [tagInput, setTagInput] = useState('');

    // Histórico de movimentações (quem moveu o lead, de/para qual status, quando)
    const [history, setHistory] = useState<any[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    useEffect(() => {
        if (!isOpen || !lead?.id) return;
        let active = true;
        const loadHistory = async () => {
            setLoadingHistory(true);
            const { data } = await supabase
                .from('SITE_LeadHistory')
                .select('*')
                .eq('lead_id', lead.id)
                .order('created_at', { ascending: false });
            if (active) {
                setHistory(data || []);
                setLoadingHistory(false);
            }
        };
        loadHistory();
        return () => { active = false; };
    }, [isOpen, lead?.id]);

    const generateCode = (name: string) => {
        const first = name.substring(0, 3).toUpperCase();
        const nums = Math.floor(Math.random() * 90 + 10);
        const letters = Array(3).fill(0).map(() => String.fromCharCode(65 + Math.floor(Math.random() * 26))).join('');
        return `${first}-${nums}${letters}`;
    };

    const handleCopyLink = () => {
        const url = `${window.location.origin}/#/meus-pedidos?code=${form.client_code || lead.client_code}`;
        navigator.clipboard.writeText(url);
        alert('Link copiado! Envie para o cliente: ' + url);
    };

    const handleRegenerateCode = () => {
        const newCode = generateCode(form.name || 'CLIENTE');
        setForm(prev => ({ ...prev, client_code: newCode }));
    };


    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-[var(--admin-surface-1)] rounded-2xl w-full max-w-2xl shadow-2xl border border-[var(--admin-border)] h-[80vh] flex flex-col">
                <div className="p-6 border-b border-[var(--admin-border)] flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-black text-[var(--admin-text-primary)]">{form.name}</h3>
                        <p className="text-sm text-[var(--admin-text-secondary)]">Editando informações do lead.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => onTasks(form)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 text-blue-500 rounded-lg hover:bg-blue-500/20 transition-colors text-xs font-bold"
                        >
                            <Clock size={16} /> Tarefas
                        </button>
                        <button
                            onClick={() => {
                                if (window.confirm('Tem certeza que deseja excluir este lead?')) {
                                    onDelete();
                                }
                            }}
                            className="p-2 text-[var(--admin-text-tertiary)] hover:text-red-500 hover:bg-red-500/10 transition-colors rounded-lg"
                            title="Excluir Lead"
                        >
                            <Trash2 size={20} />
                        </button>
                        <button onClick={onClose} className="p-2 text-[var(--admin-text-tertiary)] hover:bg-[var(--admin-surface-3)] rounded-lg transition-colors"><X size={24} /></button>
                    </div>
                </div>
                
                <div className="p-6 overflow-y-auto flex-1 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                             <label className="block text-[10px] font-black text-[var(--admin-text-tertiary)] uppercase tracking-widest mb-1.5">Status</label>
                             <select
                                className="w-full px-3 py-2.5 bg-[var(--admin-surface-2)] border border-[var(--admin-border)] rounded-xl text-sm text-[var(--admin-text-primary)] font-bold outline-none focus:border-wtech-gold transition-all"
                                value={form.status}
                                onChange={e => setForm({...form, status: e.target.value})}
                             >
                                <option value="New">Novo</option>
                                <option value="Contacted">Contactado</option>
                                <option value="Qualified">Qualificado</option>
                                <option value="Negotiating">Em Negociação</option>
                                <option value="Converted">Ganhos / Pagar</option>
                                <option value="Matriculated">Matriculado</option>
                                <option value="Cold">Frio / Espera</option>
                                <option value="Rejected">Perdido</option>
                             </select>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-[var(--admin-text-tertiary)] uppercase tracking-widest mb-1.5">Telefone</label>
                            <input className="w-full px-3 py-2.5 bg-[var(--admin-surface-2)] border border-[var(--admin-border)] rounded-xl text-sm text-[var(--admin-text-primary)] outline-none focus:border-wtech-gold transition-all" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-[var(--admin-text-tertiary)] uppercase tracking-widest mb-1.5">Email</label>
                            <input className="w-full px-3 py-2.5 bg-[var(--admin-surface-2)] border border-[var(--admin-border)] rounded-xl text-sm text-[var(--admin-text-primary)] outline-none focus:border-wtech-gold transition-all" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-[var(--admin-text-tertiary)] uppercase tracking-widest mb-1.5">CPF</label>
                            <input className="w-full px-3 py-2.5 bg-[var(--admin-surface-2)] border border-[var(--admin-border)] rounded-xl text-sm text-[var(--admin-text-primary)] outline-none focus:border-wtech-gold transition-all" value={form.cpf || ''} onChange={e => setForm({...form, cpf: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-[var(--admin-text-tertiary)] uppercase tracking-widest mb-1.5">Tamanho Camiseta</label>
                            <select className="w-full px-3 py-2.5 bg-[var(--admin-surface-2)] border border-[var(--admin-border)] rounded-xl text-sm text-[var(--admin-text-primary)] outline-none focus:border-wtech-gold transition-all" value={form.t_shirt_size || ''} onChange={e => setForm({...form, t_shirt_size: e.target.value})}>
                                <option value="">Não informado</option>
                                <option value="P">P</option>
                                <option value="M">M</option>
                                <option value="G">G</option>
                                <option value="GG">GG</option>
                                <option value="EXG">EXG</option>
                            </select>
                        </div>

                        {/* Client Portal Access Link */}
                        <div className="col-span-2 bg-[var(--admin-surface-2)] p-4 rounded-xl border border-dashed border-[var(--admin-border)]">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h4 className="text-xs font-black text-[var(--admin-text-tertiary)] uppercase tracking-widest">Código de Acesso</h4>
                                    <p className="text-[10px] text-[var(--admin-text-tertiary)] mt-1">Acesso ao portal (Meus Pedidos).</p>
                                </div>
                                <div className="text-right flex items-center gap-2">
                                    <p className={`text-lg font-black font-mono tracking-wider ${form.client_code ? 'text-wtech-gold' : 'text-gray-400 italic text-sm'}`}>
                                        {form.client_code || 'Não definido'}
                                    </p>
                                    <div className="flex gap-1">
                                        <button
                                            onClick={handleRegenerateCode}
                                            className="bg-[var(--admin-surface-3)] text-[var(--admin-text-secondary)] px-2 py-1.5 rounded-lg hover:bg-[var(--admin-border)] transition-colors flex items-center gap-2"
                                            title="Gerar Novo Código"
                                        >
                                            <RefreshCw size={14} className={!form.client_code ? 'animate-pulse text-blue-500' : ''} />
                                            {!form.client_code && <span className="text-[10px] font-bold">GERAR</span>}
                                        </button>
                                        {form.client_code && (
                                            <button
                                                onClick={handleCopyLink}
                                                className="bg-blue-500/10 text-blue-500 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-500/20 transition-colors flex items-center gap-1"
                                                title="Copiar Link de Acesso"
                                            >
                                                <Share2 size={14} /> Link
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>


                        <div className="col-span-2 bg-emerald-500/5 p-4 rounded-xl border border-emerald-500/20">
                             <label className="text-xs font-black text-emerald-500 uppercase flex items-center gap-2 mb-1.5">
                                <Banknote size={14}/> Valor da Venda (R$)
                             </label>
                             <input
                                type="number"
                                className="w-full px-3 py-2.5 bg-[var(--admin-surface-2)] border border-[var(--admin-border)] rounded-xl text-sm text-[var(--admin-text-primary)] font-mono font-bold outline-none focus:border-wtech-gold transition-all"
                                value={form.value}
                                onChange={e => setForm({...form, value: Number(e.target.value)})}
                             />
                             <p className="text-[10px] text-green-600 mt-1">
                                * Ao mover para "Ganho" ou "Matriculado", este valor será lançado automaticamente no Fluxo de Caixa.
                             </p>
                        </div>

                        <div className="col-span-2">
                            <label className="block text-[10px] font-black text-[var(--admin-text-tertiary)] uppercase tracking-widest mb-1.5">Responsável</label>
                            <select
                                className="w-full px-3 py-2.5 bg-[var(--admin-surface-2)] border border-[var(--admin-border)] rounded-xl text-sm text-[var(--admin-text-primary)] outline-none focus:border-wtech-gold transition-all"
                                value={form.assignedTo || ''}
                                onChange={e => setForm({...form, assignedTo: e.target.value || null})}
                            >
                                <option value="">Sem dono</option>
                                {users.map((u: any) => (
                                    <option key={u.id} value={u.id}>{u.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="col-span-2">
                            <label className="block text-[10px] font-black text-[var(--admin-text-tertiary)] uppercase tracking-widest mb-1.5">Notas Internas</label>
                            <textarea
                                className="w-full px-3 py-2.5 bg-[var(--admin-surface-2)] border border-[var(--admin-border)] rounded-xl text-sm text-[var(--admin-text-primary)] placeholder:text-[var(--admin-text-tertiary)] focus:border-wtech-gold outline-none min-h-[100px] resize-none transition-all"
                                placeholder="Observações sobre o lead..."
                                value={form.internalNotes || ''}
                                onChange={e => setForm({ ...form, internalNotes: e.target.value })}
                            />
                        </div>

                        <div className="col-span-2">
                            <label className="block text-[10px] font-black text-[var(--admin-text-tertiary)] uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                <Clock size={12} /> Histórico de Movimentações
                            </label>
                            <div className="bg-[var(--admin-surface-2)] rounded-xl border border-[var(--admin-border)] max-h-48 overflow-y-auto custom-scrollbar">
                                {loadingHistory ? (
                                    <p className="text-xs text-[var(--admin-text-tertiary)] p-3 text-center">Carregando...</p>
                                ) : history.length === 0 ? (
                                    <p className="text-xs text-[var(--admin-text-tertiary)] p-3 text-center italic">
                                        Nenhuma movimentação registrada ainda.
                                    </p>
                                ) : (
                                    <ul className="divide-y divide-[var(--admin-border-subtle)]">
                                        {history.map((h: any) => (
                                            <li key={h.id} className="flex items-center justify-between gap-2 px-3 py-2">
                                                <div className="flex items-center gap-1.5 text-xs min-w-0">
                                                    {h.from_status && (
                                                        <>
                                                            <span className="text-[var(--admin-text-tertiary)] truncate">
                                                                {STATUS_LABELS[h.from_status] || h.from_status}
                                                            </span>
                                                            <ArrowRight size={11} className="text-[var(--admin-text-tertiary)] flex-shrink-0" />
                                                        </>
                                                    )}
                                                    <span className="font-bold text-[var(--admin-text-primary)] truncate">
                                                        {STATUS_LABELS[h.to_status] || h.to_status}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                    <span className="text-[10px] font-bold bg-wtech-gold/10 text-wtech-gold px-1.5 py-0.5 rounded-md flex items-center gap-1">
                                                        <User size={9} /> {h.moved_by_name || 'Sistema'}
                                                    </span>
                                                    <span className="text-[10px] text-[var(--admin-text-tertiary)] font-mono">
                                                        {new Date(h.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>

                        <div className="col-span-2">
                            <label className="block text-[10px] font-black text-[var(--admin-text-tertiary)] uppercase tracking-widest mb-1.5">Tags</label>
                            <div className="flex flex-wrap gap-2 mb-2">
                                {form.tags?.map((tag: string, idx: number) => (
                                    <span key={idx} className="bg-[var(--admin-surface-3)] text-[var(--admin-text-secondary)] text-xs px-2 py-1 rounded-full flex items-center gap-1 border border-[var(--admin-border)]">
                                        {tag}
                                        <button onClick={() => setForm({...form, tags: form.tags.filter((_:any, i:any) => i !== idx)})} className="hover:text-red-500"><X size={12} /></button>
                                    </span>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <input
                                    className="flex-1 px-3 py-2 bg-[var(--admin-surface-2)] border border-[var(--admin-border)] rounded-xl text-sm text-[var(--admin-text-primary)] placeholder:text-[var(--admin-text-tertiary)] outline-none focus:border-wtech-gold transition-all"
                                    placeholder="Adicionar tag... (Enter)"
                                    value={tagInput}
                                    onChange={e => setTagInput(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            if (tagInput.trim()) {
                                                setForm({...form, tags: [...(form.tags || []), tagInput.trim()]});
                                                setTagInput('');
                                            }
                                        }
                                    }}
                                />
                                <button
                                    onClick={() => {
                                        if (tagInput.trim()) {
                                            setForm({...form, tags: [...(form.tags || []), tagInput.trim()]});
                                            setTagInput('');
                                        }
                                    }}
                                    className="px-3 py-2 bg-[var(--admin-surface-3)] rounded-xl hover:bg-[var(--admin-border)] transition-colors text-[var(--admin-text-secondary)]"
                                >
                                    <Plus size={16}/>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-[var(--admin-border)] bg-[var(--admin-surface-2)] flex justify-end gap-3 rounded-b-2xl">
                     <button onClick={onClose} className="px-6 py-3 font-bold text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] transition-colors">Cancelar</button>
                     <button onClick={() => onSave(form)} className="px-8 py-3 bg-gradient-to-r from-wtech-gold to-yellow-600 text-black font-black rounded-xl shadow-md shadow-yellow-500/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2">
                        <Save size={18} /> Salvar Alterações
                     </button>
                </div>
            </motion.div>
        </div>
    );
};

const CRMView: React.FC<CRMViewProps & { permissions?: any }> = ({ onConvertLead, permissions }) => {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [draggedId, setDraggedId] = useState<string | null>(null);
    const [usersMap, setUsersMap] = useState<Record<string, string>>({});
    const [usersList, setUsersList] = useState<{ id: string, name: string }[]>([]); // NEW

    // CRM Filter State
    const [filterPeriod, setFilterPeriod] = useState(30); // Days
    const [filterType, setFilterType] = useState<'Period' | 'Month' | 'Custom'>('Period');
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [customRange, setCustomRange] = useState({ start: '', end: '' });

    // New Advanced Filters
    const [searchQuery, setSearchQuery] = useState('');
    const searchRef = useRef<HTMLInputElement>(null);
    const [contextFilter, setContextFilter] = useState('All');
    const [selectedUserFilter, setSelectedUserFilter] = useState('All'); // NEW
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [selectedLeadForTasks, setSelectedLeadForTasks] = useState<Lead | null>(null);
    const notificationRef = useRef<SplashedPushNotificationsHandle>(null);
    const { user } = useAuth();

    // View Mode: Kanban or List or Logs
    const [viewMode, setViewMode] = useState<'kanban' | 'list' | 'logs'>('kanban');
    const [leadHistory, setLeadHistory] = useState<any[]>([]);
    const [loadingHistoryList, setLoadingHistoryList] = useState(false);

    const [distMode, setDistMode] = useState<'Manual' | 'Random'>('Manual');
    const [showSettings, setShowSettings] = useState(false);

    // Create Lead State
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newLeadForm, setNewLeadForm] = useState({ name: '', email: '', phone: '' });

    const [editingLead, setEditingLead] = useState<any | null>(null);
    const [editForm, setEditForm] = useState({ assignedTo: '', internalNotes: '', tags: [] as string[] });
    const [tagInput, setTagInput] = useState('');

    // Bulk Selection State
    const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());

    // Stats Bar Filter State
    const [activeFilter, setActiveFilter] = useState<string | null>(null);

    const toggleLeadSelection = (leadId: string) => {
        setSelectedLeadIds(prev => {
            const next = new Set(prev);
            if (next.has(leadId)) next.delete(leadId);
            else next.add(leadId);
            return next;
        });
    };

    const clearSelection = () => setSelectedLeadIds(new Set());

    const handleBulkAssign = async (userId: string) => {
        if (selectedLeadIds.size === 0) return;
        
        const count = selectedLeadIds.size;
        const ids = Array.from(selectedLeadIds);
        const now = new Date().toISOString();

        // Optimistic Update
        setLeads(prev => prev.map(l => ids.includes(l.id) ? { ...l, assignedTo: userId, updated_at: now } : l));
        
        const { error } = await supabase
            .from('SITE_Leads')
            .update({ 
                assigned_to: userId, 
                updated_at: now 
            })
            .in('id', ids);

        if (!error) {
            logUserActivity({
                action_type: 'MODIFICATION',
                screen: 'crm',
                details: `Atribuiu em massa ${count} leads para o usuário ${usersMap[userId] || userId}`
            }, user ? { id: user.id, name: user.name } : null);
            notificationRef.current?.createNotification('help', 'Leads Atribuídos', `${count} leads foram atribuídos a ${usersMap[userId] || 'outro atendente'}.`);
            setSelectedLeadIds(new Set());
        } else {
            console.error("Bulk Assign Error:", error);
            alert('Erro ao atribuir leads em massa: ' + error.message);
            fetchData(); // Revert
        }
    };

    const handleBulkDelete = async () => {
        if (selectedLeadIds.size === 0) return;

        const count = selectedLeadIds.size;
        if (!window.confirm(`Tem certeza que deseja excluir permanentemente ${count} leads? Esta ação não pode ser desfeita.`)) return;

        const ids = Array.from(selectedLeadIds);

        // Optimistic Update
        setLeads(prev => prev.filter(l => !ids.includes(l.id)));

        const { error } = await supabase
            .from('SITE_Leads')
            .delete()
            .in('id', ids);

        if (!error) {
            logUserActivity({
                action_type: 'MODIFICATION',
                screen: 'crm',
                details: `Excluiu em massa ${count} leads`
            }, user ? { id: user.id, name: user.name } : null);
            notificationRef.current?.createNotification('success', 'Leads Excluídos', `${count} leads foram excluídos com sucesso.`);
            setSelectedLeadIds(new Set());
        } else {
            console.error("Bulk Delete Error:", error);
            alert('Erro ao excluir leads em massa: ' + error.message);
            fetchData(); // Revert
        }
    };

    const handleCreateLead = async (formData?: any) => {
        // Support both state-based (legacy) and argument-based (modal) calls
        const dataToSave = formData || newLeadForm;
        
        if (!dataToSave.name || !dataToSave.phone) return alert("Nome e Telefone são obrigatórios.");

        // 1. Check for duplicate phone
        const { data: existingLead } = await supabase
            .from('SITE_Leads')
            .select('*')
            .eq('phone', dataToSave.phone)
            .maybeSingle();

        if (existingLead) {
            alert("Este telefone já está cadastrado no CRM. Redirecionando para o lead existente.");
            setIsCreateModalOpen(false);
            setNewLeadForm({ name: '', email: '', phone: '' });
            handleLeadClick(existingLead); // Open the existing lead details
            if (notificationRef.current) {
                notificationRef.current.createNotification('help', 'Lead Duplicado', `O lead ${existingLead.name} já existe.`);
            }
            return;
        }

        const payload = {
            name: dataToSave.name,
            email: dataToSave.email,
            phone: dataToSave.phone,
            cpf: dataToSave.cpf,
            t_shirt_size: dataToSave.t_shirt_size,
            value: Number(dataToSave.value) || 0, // ADDED: Value support
            status: 'New',
            context_id: 'Manual',
            assigned_to: user?.id, // Auto-assign to creator
            created_at: new Date().toISOString()
        };

        const { data, error } = await supabase.from('SITE_Leads').insert([payload]).select().single();

        if (error) {
            alert("Erro ao criar lead: " + error.message);
        } else if (data) {
            logUserActivity({
                action_type: 'MODIFICATION',
                screen: 'crm',
                details: `Criou lead manualmente: ${payload.name} (Telefone: ${payload.phone})`
            }, user ? { id: user.id, name: user.name } : null);
            setLeads(prev => [data, ...prev]);
            setIsCreateModalOpen(false);
            setNewLeadForm({ name: '', email: '', phone: '' });
            notificationRef.current?.createNotification('success', 'Lead Criado!', `${data.name} foi adicionado com sucesso.`);
        }
    };

    // Permission Check Helper
    const hasPermission = (key: string) => {
        if (!user) return false;

        // 1. Priority: Live Permissions (Prop)
        if (permissions) {
            // Super Admins in DB Role
            if (permissions.admin_access) return true;
            return !!permissions[key];
        }

        // 2. Super Admin / Admin legacy string check
        if (typeof user.role === 'string') {
            if (user.role === 'Super Admin' || user.role === 'ADMIN' || user.role === 'Admin') return true;
            return false;
        }

        // 3. Fallback to Auth Context
        if (user.role?.level >= 10) return true;
        if (user.role?.name === 'Super Admin') return true;

        const rolePermissions = user.role?.permissions || {};
        return !!rolePermissions[key];
    };

    const handleLeadClick = (lead: any) => {
        setEditingLead(lead);
        setEditForm({
            assignedTo: lead.assignedTo || '',
            internalNotes: lead.internalNotes || '',
            tags: lead.tags || []
        });
    };

    // Chart Data
    const conversionRate = useMemo(() => {
        if (leads.length === 0) return 0;
        const converted = leads.filter(l => l.status === 'Converted').length;
        return Math.round((converted / leads.length) * 100);
    }, [leads]);

    const filteredHistory = useMemo(() => {
        if (!leadHistory) return [];
        return leadHistory.filter(h => {
            const leadName = h.lead?.name?.toLowerCase() || '';
            const leadEmail = h.lead?.email?.toLowerCase() || '';
            const leadPhone = h.lead?.phone?.toLowerCase() || '';
            const moverName = h.moved_by_name?.toLowerCase() || '';
            const search = searchQuery.toLowerCase();
            
            const matchesSearch = leadName.includes(search) || 
                                  leadEmail.includes(search) || 
                                  leadPhone.includes(search) || 
                                  moverName.includes(search);
                                  
            const matchesUser = selectedUserFilter === 'All' || h.moved_by === selectedUserFilter;
            
            return matchesSearch && matchesUser;
        });
    }, [leadHistory, searchQuery, selectedUserFilter]);

    // Fetch Settings & Leads & Users
    useEffect(() => {
        const fetchSettingsAndUsers = async () => {
            // 1. Settings
            const { data: settings } = await supabase.from('SITE_SystemSettings').select('value').eq('key', 'crm_distribution_mode').single();
            if (settings) setDistMode(settings.value);

            // 2. Users (Map ID -> Name)
            // Safer to select specific columns we know exist. 'full_name' might be missing from schema causing errors.
            const { data: usersData } = await supabase.from('SITE_Users').select('id, name');
            if (usersData) {
                setUsersList(usersData);
                const map: Record<string, string> = {};
                usersData.forEach((u: any) => { map[u.id] = u.name || 'Usuário'; });
                setUsersMap(map);
            }
        };
        fetchSettingsAndUsers();
    }, []);

    // Fetch Leads (Consolidated)
    useEffect(() => {
        if (permissions || (user && typeof user.role === 'string')) {
            fetchData();
        }
    }, [user, filterPeriod, permissions]);

    const fetchData = async () => {
        setLeads([]); // Clear before fetch to show loading state if desired
        let query = supabase.from('SITE_Leads').select('*').neq('context_id', 'Import').order('created_at', { ascending: false });

        // Privacy Logic
        const hasFullAccess =
            (typeof user?.role === 'string' && (user.role === 'ADMIN' || user.role === 'Admin' || user.role === 'Super Admin')) ||
            (typeof user?.role !== 'string' && user?.role?.level >= 10) ||
            (typeof user?.role !== 'string' && user?.role?.name === 'Super Admin') ||
            (typeof user?.role !== 'string' && user?.role?.permissions?.admin_access) ||
            hasPermission('crm_view_all') ||
            hasPermission('crm_view_team'); // Added Team View

        console.log("CRM Access Level:", { role: user?.role, hasFullAccess });

        if (!hasFullAccess && user?.id) {
            query = query.eq('assigned_to', user.id);
        }

        const { data, error } = await query;

        if (error) {
            console.error("Error fetching leads:", error);
        }

        if (data) {
            console.log("Leads fetched:", data.length);
            const mapped = data.map(({ context_id, created_at, assigned_to, internal_notes, ...l }: any) => ({
                ...l,
                contextId: context_id,
                createdAt: created_at,
                // Ensure updated_at exists or fallback to created_at
                updated_at: l.updated_at || created_at,
                assignedTo: assigned_to,
                internalNotes: internal_notes,
                quiz_data: l.quiz_data,
                conversion_value: l.conversion_value,
                conversion_summary: l.conversion_summary,
                conversion_type: l.conversion_type
            }));
            setLeads(mapped);
        }
    }

    const fetchLeadHistory = async () => {
        setLoadingHistoryList(true);
        try {
            let query = supabase
                .from('SITE_LeadHistory')
                .select('*, lead:SITE_Leads(name, email, phone)')
                .order('created_at', { ascending: false });

            // Apply date filters matching the current selections
            const now = new Date();
            if (filterType === 'Period') {
                if (filterPeriod !== 9999) {
                    const since = new Date(now.getTime() - filterPeriod * 24 * 60 * 60 * 1000).toISOString();
                    query = query.gte('created_at', since);
                }
            } else if (filterType === 'Month') {
                const year = selectedMonth.split('-')[0];
                const month = selectedMonth.split('-')[1];
                const start = new Date(parseInt(year), parseInt(month) - 1, 1).toISOString();
                const end = new Date(parseInt(year), parseInt(month), 1).toISOString();
                query = query.gte('created_at', start).lt('created_at', end);
            } else if (filterType === 'Custom') {
                if (customRange.start) {
                    query = query.gte('created_at', new Date(customRange.start).toISOString());
                }
                if (customRange.end) {
                    const endOfDay = new Date(customRange.end);
                    endOfDay.setHours(23, 59, 59, 999);
                    query = query.lte('created_at', endOfDay.toISOString());
                }
            }

            const { data, error } = await query;
            if (error) {
                console.error("Error fetching lead history:", error);
            } else {
                setLeadHistory(data || []);
            }
        } catch (e) {
            console.error("Error in fetchLeadHistory:", e);
        } finally {
            setLoadingHistoryList(false);
        }
    };

    useEffect(() => {
        if (viewMode === 'logs') {
            fetchLeadHistory();
        }
    }, [viewMode, filterPeriod, filterType, selectedMonth, customRange]);

    const handleHistoryLeadClick = async (leadId: string) => {
        const { data, error } = await supabase.from('SITE_Leads').select('*').eq('id', leadId).single();
        if (error || !data) {
            alert("Erro ao buscar dados do lead: " + (error?.message || "Lead não encontrado"));
            return;
        }
        const mappedLead = {
            ...data,
            contextId: data.context_id,
            createdAt: data.created_at,
            updated_at: data.updated_at || data.created_at,
            assignedTo: data.assigned_to,
            internalNotes: data.internal_notes,
            quiz_data: data.quiz_data,
            conversion_value: data.conversion_value,
            conversion_summary: data.conversion_summary,
            conversion_type: data.conversion_type
        };
        handleLeadClick(mappedLead);
    };



    // Refs for Realtime Cleanup (Avoid Stale Closures)
    const activeModalLeadId = useRef<string | null>(null);
    const activeSidebarLeadId = useRef<string | null>(null);

    useEffect(() => { activeModalLeadId.current = editingLead?.id || null; }, [editingLead]);
    useEffect(() => { activeSidebarLeadId.current = selectedLeadForTasks?.id || null; }, [selectedLeadForTasks]);

    // Realtime Subscription
    useEffect(() => {
        // Determine Access Level for Realtime Filtering
        const hasFullAccess =
            (typeof user?.role === 'string' && (user.role === 'ADMIN' || user.role === 'Admin' || user.role === 'Super Admin')) ||
            (typeof user?.role !== 'string' && user?.role?.level >= 10) ||
            (typeof user?.role !== 'string' && user?.role?.name === 'Super Admin') ||
            (typeof user?.role !== 'string' && user?.role?.permissions?.admin_access) ||
            hasPermission('crm_view_all') ||
            hasPermission('crm_view_team');

        const channel = supabase
            .channel('lead_updates_crm')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'SITE_Leads'
                },
                (payload) => {
                    const { eventType, new: newRecord, old: oldRecord } = payload;

                    // Helper to map record to frontend structure
                    const mapLead = ({ context_id, created_at, assigned_to, internal_notes, ...r }: any) => ({
                        ...r,
                        contextId: context_id,
                        createdAt: created_at,
                        updated_at: r.updated_at || created_at,
                        assignedTo: assigned_to,
                        internalNotes: internal_notes,
                        quiz_data: r.quiz_data,
                        conversion_value: r.conversion_value,
                        conversion_summary: r.conversion_summary,
                        conversion_type: r.conversion_type
                    });

                    if (eventType === 'INSERT') {
                        // Only add if user has access AND it's NOT an import
                        if ((hasFullAccess || newRecord.assigned_to === user?.id || !newRecord.assigned_to) && newRecord.context_id !== 'Import') {
                            setLeads(prev => {
                                // Prevent duplicates just in case
                                if (prev.some(l => l.id === newRecord.id)) return prev;
                                return [mapLead(newRecord), ...prev];
                            });
                            if (!newRecord.assigned_to || newRecord.assigned_to === user?.id) {
                                notificationRef.current?.createNotification('help', 'Novo Lead', `${newRecord.name || 'Um novo lead'} chegou no CRM.`);
                            }
                        }
                    } else if (eventType === 'UPDATE') {
                        const mapped = mapLead(newRecord);

                        if ((hasFullAccess || newRecord.assigned_to === user?.id) && newRecord.context_id !== 'Import') {
                            setLeads(prev => {
                                const exists = prev.find(l => l.id === newRecord.id);
                                if (exists) {
                                    return prev.map(l => l.id === newRecord.id ? mapped : l);
                                } else {
                                    // New lead for this user (e.g. just assigned)
                                    return [mapped, ...prev];
                                }
                            });
                        } else {
                            // User sent away or lost access
                            setLeads(prev => prev.filter(l => l.id !== newRecord.id));
                        }
                    } else if (eventType === 'DELETE') {
                        setLeads(prev => prev.filter(l => l.id !== oldRecord.id));

                        // Auto-close modals if open
                        if (activeModalLeadId.current === oldRecord.id) {
                            setEditingLead(null);
                            notificationRef.current?.createNotification('warning', 'Lead Removido', 'O lead que você estava visualizando foi excluído.');
                        }
                        if (activeSidebarLeadId.current === oldRecord.id) {
                            setSelectedLeadForTasks(null);
                        }
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, permissions]); // Dependencies for access logic re-eval

    // Update Distribution Mode
    const toggleDistMode = async (mode: 'Manual' | 'Random') => {
        setDistMode(mode);
        await supabase.from('SITE_SystemSettings').upsert({ key: 'crm_distribution_mode', value: mode }, { onConflict: 'key' });
    };

    // Helper to map status to stage index
    const getStageIndex = (status: string) => {
        if (status === 'New') return 0;
        if (status === 'Contacted') return 1;
        if (['Qualified', 'Negotiating'].includes(status)) return 2;
        if (['Converted', 'Matriculated', 'CheckedIn'].includes(status)) return 3;
        if (['Cold', 'Rejected', 'Lost'].includes(status)) return 4;
        return 0; // Default
    };

    // Drag & Drop Handler
    // --- Conversion Modal State ---
    const [conversionModal, setConversionModal] = useState<{ isOpen: boolean, lead: Lead | null, targetStatus: string }>({ isOpen: false, lead: null, targetStatus: '' });
    const [conversionType, setConversionType] = useState<'Course' | 'Product'>('Course');

    // Course Conversion State
    const [activeCourses, setActiveCourses] = useState<any[]>([]);
    const [selectedCourseId, setSelectedCourseId] = useState('');

    // Product Conversion State
    const [productSummary, setProductSummary] = useState('');
    const [saleValue, setSaleValue] = useState('');
    const [generatePaymentLink, setGeneratePaymentLink] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<'Asaas' | 'Stripe' | 'Manual'>('Asaas');
    const [stripeCurrency, setStripeCurrency] = useState<'BRL' | 'USD' | 'EUR'>('BRL');
    const [manualDetails, setManualDetails] = useState('');
    const [createdPaymentLink, setCreatedPaymentLink] = useState('');
    const [isGeneratingLink, setIsGeneratingLink] = useState(false);

    // Catalog Products State
    const [catalogProducts, setCatalogProducts] = useState<any[]>([]);
    const [selectedProductId, setSelectedProductId] = useState('');
    const [orderQuantity, setOrderQuantity] = useState(1);

    // Lost Reason State
    const [lostReasonModal, setLostReasonModal] = useState<{ isOpen: boolean, lead: Lead | null, targetStatus: string }>({ isOpen: false, lead: null, targetStatus: '' });
    const [lostReason, setLostReason] = useState('');

    useEffect(() => {
        if (conversionModal.isOpen) {
            if (conversionType === 'Course') {
                const fetchActiveCourses = async () => {
                    const { data } = await supabase.from('SITE_Courses')
                        .select('id, title, date')
                        .eq('status', 'Published')
                        .gte('date', new Date().toISOString()) // Only future courses
                        .order('date', { ascending: true });
                    if (data) setActiveCourses(data);
                };
                fetchActiveCourses();
            } else if (conversionType === 'Product') {
                const fetchProducts = async () => {
                    const { data } = await supabase.from('SITE_Products')
                        .select('id, title, price, status')
                        .eq('status', 'Unrestricted') // Assuming this means active
                        .order('title', { ascending: true });
                    if (data) setCatalogProducts(data);
                };
                fetchProducts();
            }
        }
    }, [conversionModal.isOpen, conversionType]);

    // Registra uma movimentação de status na trilha de auditoria (SITE_LeadHistory).
    // Falha de log nunca deve quebrar a movimentação do lead — apenas avisa no console.
    const logLeadHistory = async (
        leadId: string,
        fromStatus: string | null | undefined,
        toStatus: string,
        source: 'drag' | 'quick' | 'modal' | 'lost' | 'conversion' = 'drag'
    ) => {
        if (fromStatus === toStatus) return; // Sem mudança real, não registra
        try {
            await supabase.from('SITE_LeadHistory').insert({
                lead_id: leadId,
                from_status: fromStatus ?? null,
                to_status: toStatus,
                moved_by: user?.id ?? null,
                moved_by_name: (user?.id && usersMap[user.id]) || user?.name || 'Sistema',
                source
            });
        } catch (e) {
            console.error('Falha ao registrar histórico do lead:', e);
        }
    };

    // Drag & Drop Handler
    const onDropLead = async (leadId: string, newStatus: string) => {
        const currentLead = leads.find(l => l.id === leadId);
        if (!currentLead) return;

        const currentIndex = getStageIndex(currentLead.status);
        const newIndex = getStageIndex(newStatus);
        const isWonStage = ['Converted', 'Matriculated', 'Fechamento', 'Ganho'].includes(newStatus);

        const isAdm =
            (typeof user?.role === 'string' && (user.role === 'ADMIN' || user.role === 'Admin' || user.role === 'Super Admin')) ||
            (typeof user?.role !== 'string' && user?.role?.level >= 10) ||
            hasPermission('crm_manage_all') ||
            hasPermission('crm_move_back');

        if (!isAdm && newIndex < currentIndex) {
            alert('Apenas administradores podem mover leads para trás no funil.');
            return;
        }

        // Intercept Won Stage
        if (isWonStage) {
            setConversionModal({ isOpen: true, lead: currentLead, targetStatus: newStatus });
            return;
        }

        // Intercept Lost Stage
        const isLostStage = ['Cold', 'Rejected', 'Lost', 'Esfriou', 'Perdido'].includes(newStatus);
        if (isLostStage) {
            setLostReasonModal({ isOpen: true, lead: currentLead, targetStatus: newStatus });
            return;
        }

    // Standard Move
        await executeMove(leadId, newStatus, currentLead);
    };

    const handleMoveLead = onDropLead;

    const executeMove = async (leadId: string, newStatus: string, currentLead: Lead) => {
        const now = new Date().toISOString();

        // Optimistic Update
        setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus as any, updated_at: now } : l));

        // DB Update
        const { error } = await supabase.from('SITE_Leads').update({ status: newStatus, updated_at: now }).eq('id', leadId);

        if (error) {
            console.error("Move Lead Error:", error);
            alert(`Falha ao mover lead: ${error.message}`);
            fetchData(); // Revert
        } else {
            logUserActivity({
                action_type: 'MODIFICATION',
                screen: 'crm',
                details: `Moveu o lead ${currentLead.name} para o status: ${newStatus}`
            }, user ? { id: user.id, name: user.name } : null);
            logLeadHistory(leadId, currentLead.status, newStatus, 'drag');
        }
    };

    const handleConfirmConversion = async () => {
        if (!conversionModal.lead) return;

        const { lead, targetStatus } = conversionModal;

        // 1. Update Lead Status
        await executeMove(lead.id, targetStatus, lead);

        // 2. Handle Logic
        if (conversionType === 'Course') {
            if (onConvertLead) {
                // Pass extra data: { type: 'course', courseId: ... }
                // We cast as any to bypass strict prop type check if it wasn't updated yet, 
                // but we will update Admin.tsx to handle this structure.
                (onConvertLead as any)(lead, { type: 'course', courseId: selectedCourseId });
            }
        } else {

            // Product Sale (Delegated to Orders Module)
            if (onConvertLead) {
                (onConvertLead as any)(lead, { type: 'product' });
            }
            
            // Just move the lead status, don't create sale yet.
            // The user will create the order in the next screen.
        }

        setConversionModal({ isOpen: false, lead: null, targetStatus: '' });
        setProductSummary('');
        setSaleValue('');
        setSelectedCourseId('');
        setGeneratePaymentLink(false);
    };

    const handleConfirmLost = async () => {
        if (!lostReasonModal.lead) return;
        if (!lostReason.trim()) return alert("Por favor, informe o motivo.");

        const { lead, targetStatus } = lostReasonModal;

        // 1. Update Internal Notes with Reason
        const today = new Date();
        const dateStr = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;
        const newNotes = `${lead.internalNotes || ''}\n\n[MOTIVO PERDA - ${dateStr}]: ${lostReason}`;

        // 2. Execute Move with updated notes (Implicitly we want to save notes first or just update it all)
        // Since executeMove only updates status/updated_at, we need a separate update or modified executeMove.
        // We'll just update directly here to save the note + status.

        const now = new Date().toISOString();

        // Optimistic Update (including note locally? maybe overkill, just status)
        setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, status: targetStatus as any, updated_at: now, internalNotes: newNotes } : l));

        const { error } = await supabase.from('SITE_Leads').update({
            status: targetStatus,
            updated_at: now,
            internal_notes: newNotes
        }).eq('id', lead.id);

        if (error) {
            console.error("Move Lead Error:", error);
            alert(`Falha ao mover lead: ${error.message}`);
            fetchData(); // Revert
        } else {
            logUserActivity({
                action_type: 'MODIFICATION',
                screen: 'crm',
                details: `Moveu o lead ${lead.name} para status de perda: ${targetStatus} (Motivo: ${lostReason})`
            }, user ? { id: user.id, name: user.name } : null);
            logLeadHistory(lead.id, lead.status, targetStatus, 'lost');
            notificationRef.current?.createNotification('help', 'Lead Atualizado', 'Motivo da perda registrado.');
        }

        setLostReasonModal({ isOpen: false, lead: null, targetStatus: '' });
        setLostReason('');
    };

    const saveLeadUpdates = async (updatedForm?: any) => {
        if (!editingLead) return;

        // Use the data passed from the modal, or fallback to state
        const dataToSave = updatedForm || {
            name: editingLead.name,
            phone: editingLead.phone,
            email: editingLead.email,
            cpf: editingLead.cpf,
            t_shirt_size: editingLead.t_shirt_size,
            status: editingLead.status,
            assigned_to: editingLead.assignedTo,
            internal_notes: editingLead.internalNotes,
            tags: editingLead.tags,
            value: editingLead.value || 0
        };

        // Note: Field mapping for DB (assigned_to, internal_notes, etc)
        const dbPayload = {
            name: dataToSave.name,
            phone: dataToSave.phone,
            email: dataToSave.email,
            cpf: dataToSave.cpf,
            t_shirt_size: dataToSave.t_shirt_size,
            status: dataToSave.status,
            assigned_to: dataToSave.assignedTo,
            internal_notes: dataToSave.internalNotes,
            tags: dataToSave.tags,
            value: dataToSave.value || 0
        };

        const { error } = await supabase.from('SITE_Leads').update(dbPayload).eq('id', editingLead.id);

        if (error) {
            console.error("Error updating lead:", error);
            alert('Erro ao salvar alterações: ' + error.message);
            return;
        }

        logUserActivity({
            action_type: 'MODIFICATION',
            screen: 'crm',
            details: `Atualizou os dados do lead: ${dbPayload.name} (ID: ${editingLead.id})`
        }, user ? { id: user.id, name: user.name } : null);

        // Registra mudança de status feita pelo dropdown do modal de edição
        if (editingLead.status !== dbPayload.status) {
            logLeadHistory(editingLead.id, editingLead.status, dbPayload.status, 'modal');
        }

        // --- Create Sales Record if status is Converted/Won and has value ---
        const isConvertedStatus = ['Converted', 'Matriculated', 'CheckedIn', 'Won'].includes(dbPayload.status);
        const hasValue = dbPayload.value && dbPayload.value > 0;

        if (isConvertedStatus && hasValue) {
            try {
                // Check if sale already exists for this lead
                const { data: existingSale } = await supabase
                    .from('SITE_Sales')
                    .select('id')
                    .eq('client_id', editingLead.id)
                    .maybeSingle();

                if (!existingSale) {
                    // Create new sale record
                    const saleData = {
                        client_id: editingLead.id,
                        client_name: dbPayload.name,
                        client_email: dbPayload.email,
                        client_phone: dbPayload.phone,
                        total_value: dbPayload.value,
                        payment_method: 'Manual (Edit)',
                        status: 'paid',
                        channel: 'CRM',
                        notes: dbPayload.internal_notes?.match(/\[CONVERSÃO PRODUTO\]: R\$[\d,.]+ - (.+)/)?.[1] || 'Venda via CRM',
                        seller_id: dbPayload.assigned_to || user?.id,
                        seller_name: usersMap[dbPayload.assigned_to || user?.id || ''] || 'Vendedor',
                        created_at: new Date().toISOString()
                    };

                    const { data: saleResponse, error: saleError } = await supabase
                        .from('SITE_Sales')
                        .insert(saleData)
                        .select()
                        .single();

                    if (saleError) {
                        console.error("Error creating sale from edit modal:", saleError);
                        notificationRef.current?.createNotification('error', 'Erro na Venda', saleError.message);
                    } else {
                        console.log("✅ Sale created successfully from EditLeadModal");

                        // --- ALSO Create Transaction in SITE_Transactions for Cash Flow ---
                        const { error: transError } = await supabase.from('SITE_Transactions').insert({
                            description: `Venda CRM (Manual): ${dbPayload.name} - ${saleData.notes}`,
                            category: 'SALES',
                            type: 'Income',
                            amount: dbPayload.value,
                            payment_method: 'Manual',
                            attendant_id: dbPayload.assigned_to || user?.id,
                            attendant_name: usersMap[dbPayload.assigned_to || user?.id || ''] || 'Vendedor',
                            created_at: new Date().toISOString()
                        });

                        if (transError) console.error("Error creating transaction record:", transError);

                        notificationRef.current?.createNotification('success', 'Venda Registrada!', `Venda de R$ ${dbPayload.value.toLocaleString('pt-BR')} registrada no Financeiro.`);
                    }
                }
            } catch (e: any) {
                console.error("Failed to create sale record from edit:", e);
            }
        }

        notificationRef.current?.createNotification('success', 'Atualizado!', 'Lead atualizado com sucesso.');
        setEditingLead(null);
        setTagInput('');
        fetchData();
    };

    const deleteLead = async () => {
        if (!editingLead) return;
        if (!window.confirm('Tem certeza que deseja excluir este lead? Esta ação não pode ser desfeita.')) return;

        const { error } = await supabase.from('SITE_Leads').delete().eq('id', editingLead.id);

        if (!error) {
            logUserActivity({
                action_type: 'MODIFICATION',
                screen: 'crm',
                details: `Excluiu o lead: ${editingLead.name} (ID: ${editingLead.id})`
            }, user ? { id: user.id, name: user.name } : null);
            setLeads(prev => prev.filter(l => l.id !== editingLead.id));
            setEditingLead(null);
        } else {
            console.error("Error deleting lead:", error);
            alert('Erro ao excluir lead: ' + error.message);
        }
    };

    const exportHistoryToPDF = () => {
        if (filteredHistory.length === 0) {
            alert("Nenhum histórico encontrado para exportar.");
            return;
        }

        const doc = new jsPDF('l', 'mm', 'a4'); // Landscape A4
        const now = new Date();
        const dateStr = now.toLocaleDateString('pt-BR');
        const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

        // Header
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.text('Relatório de Movimentações do CRM - W-TECH', 14, 20);
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100);
        doc.text(`Gerado em: ${dateStr} às ${timeStr}`, 14, 27);
        doc.text(`Total de registros: ${filteredHistory.length}`, 14, 32);

        // Filter Info
        let filterText = "Filtro: ";
        filterText += filterType === 'Period' ? `${filterPeriod === 9999 ? 'Todo o Período' : `Últimos ${filterPeriod} dias`}` : 
                      filterType === 'Month' ? `Mês: ${selectedMonth}` : 'Período Customizado';
        if (selectedUserFilter !== 'All') filterText += ` | Movido por: ${usersMap[selectedUserFilter] || 'Sem Nome'}`;
        doc.text(filterText, 14, 37);

        // Table
        const tableHeaders = [['Lead', 'De Status', 'Para Status', 'Movido por', 'Origem', 'Data/Hora']];
        const tableData = filteredHistory.map(h => [
            h.lead?.name || 'Lead Removido',
            STATUS_LABELS[h.from_status as keyof typeof STATUS_LABELS] || h.from_status || 'Novo Lead',
            STATUS_LABELS[h.to_status as keyof typeof STATUS_LABELS] || h.to_status || 'N/A',
            h.moved_by_name || 'Sistema',
            h.source === 'drag' ? 'Arrastar' : h.source === 'quick' ? 'Rápido' : h.source === 'modal' ? 'Modal' : h.source === 'lost' ? 'Perda' : h.source === 'conversion' ? 'Conversão' : h.source || 'N/A',
            new Date(h.created_at).toLocaleString('pt-BR')
        ]);

        autoTable(doc, {
            startY: 45,
            head: tableHeaders,
            body: tableData,
            theme: 'striped',
            headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255], fontStyle: 'bold' },
            styles: { fontSize: 8, cellPadding: 2 },
            columnStyles: {
                0: { cellWidth: 50 }, // Lead Name
                1: { cellWidth: 35 }, // From
                2: { cellWidth: 35 }, // To
                3: { cellWidth: 40 }, // Mover
                4: { cellWidth: 35 }, // Source
                5: { cellWidth: 45 }  // Date
            }
        });

        doc.save(`historico_movimentacao_crm_${now.getTime()}.pdf`);
        
        if (notificationRef.current) {
            notificationRef.current.createNotification('success', 'PDF Gerado', 'O relatório de movimentações foi baixado com sucesso.');
        }
    };

    const exportHistoryToCSV = () => {
        if (filteredHistory.length === 0) {
            alert("Nenhum histórico encontrado para exportar.");
            return;
        }

        const now = new Date();
        
        const data = filteredHistory.map(h => ({
            'Lead': h.lead?.name || 'Lead Removido',
            'De Status': STATUS_LABELS[h.from_status as keyof typeof STATUS_LABELS] || h.from_status || 'Novo Lead',
            'Para Status': STATUS_LABELS[h.to_status as keyof typeof STATUS_LABELS] || h.to_status || 'N/A',
            'Movido por': h.moved_by_name || 'Sistema',
            'Origem da Mudança': h.source || 'N/A',
            'Data/Hora': new Date(h.created_at).toLocaleString('pt-BR')
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Movimentações");
        
        XLSX.writeFile(wb, `historico_movimentacao_crm_${now.getTime()}.csv`, { bookType: 'csv' });

        if (notificationRef.current) {
            notificationRef.current.createNotification('success', 'CSV Gerado', 'O arquivo CSV de movimentações foi baixado.');
        }
    };

    const exportLeadsToPDF = (selectedOnly: boolean) => {
        const leadsToExport = selectedOnly 
            ? leads.filter(l => selectedLeadIds.has(l.id))
            : filteredLeads;

        if (leadsToExport.length === 0) {
            alert("Nenhum lead encontrado para exportar.");
            return;
        }

        const doc = new jsPDF('l', 'mm', 'a4'); // Landscape A4
        const now = new Date();
        const dateStr = now.toLocaleDateString('pt-BR');
        const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

        // Header
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.text('Relatório de Leads CRM - W-TECH', 14, 20);
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100);
        doc.text(`Gerado em: ${dateStr} às ${timeStr}`, 14, 27);
        doc.text(`Total de registros: ${leadsToExport.length}`, 14, 32);

        // Filter Info
        let filterText = "Filtro: ";
        if (selectedOnly) filterText += "Selecionados Manualmente";
        else {
            filterText += filterType === 'Period' ? `${filterPeriod === 9999 ? 'Todo o Período' : `Últimos ${filterPeriod} dias`}` : 
                          filterType === 'Month' ? `Mês: ${selectedMonth}` : 'Período Customizado';
            if (contextFilter !== 'All') filterText += ` | Origem: ${contextFilter}`;
            if (selectedUserFilter !== 'All') filterText += ` | Atendente: ${usersMap[selectedUserFilter] || 'Sem Atendente'}`;
        }
        doc.text(filterText, 14, 37);

        // Table
        const tableHeaders = [['Nome', 'Telefone', 'E-mail', 'Origem', 'Data de Entrada', 'Status']];
        const tableData = leadsToExport.map(l => [
            l.name || 'N/A',
            l.phone || 'N/A',
            l.email || 'N/A',
            l.contextId || 'N/A',
            new Date(l.createdAt).toLocaleDateString('pt-BR'),
            l.status || 'N/A'
        ]);

        autoTable(doc, {
            startY: 45,
            head: tableHeaders,
            body: tableData,
            theme: 'striped',
            headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255], fontStyle: 'bold' },
            styles: { fontSize: 8, cellPadding: 2 },
            columnStyles: {
                0: { cellWidth: 50 }, // Name
                1: { cellWidth: 35 }, // Phone
                2: { cellWidth: 70 }, // Email
                3: { cellWidth: 50 }, // Origin
                4: { cellWidth: 35 }, // Date
                5: { cellWidth: 30 }  // Status
            }
        });

        doc.save(`leads_crm_wtech_${now.getTime()}.pdf`);
        
        if (notificationRef.current) {
            notificationRef.current.createNotification('success', 'PDF Gerado', 'O relatório foi baixado com sucesso.');
        }
    };

    const exportLeadsToCSV = (selectedOnly: boolean) => {
        const leadsToExport = selectedOnly 
            ? leads.filter(l => selectedLeadIds.has(l.id))
            : filteredLeads;

        if (leadsToExport.length === 0) {
            alert("Nenhum lead encontrado para exportar.");
            return;
        }

        const now = new Date();
        
        // Prepare data for XLSX
        const data = leadsToExport.map(l => ({
            'Nome': l.name || '',
            'E-mail': l.email || '',
            'Telefone': l.phone || '',
            'CPF': l.cpf || '',
            'Origem': l.contextId || '',
            'Data de Entrada': new Date(l.createdAt).toLocaleDateString('pt-BR'),
            'Status': l.status || '',
            'Atribuído a': usersMap[l.assignedTo || ''] || 'Nenhum',
            'Notas Internas': l.internalNotes || '',
            'Cidade': l.address_city || ''
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Leads");
        
        // Generate CSV instead of XLSX if requested specifically, but XLSX is better for this.
        // The user asked for CSV, so let's give them CSV.
        XLSX.writeFile(wb, `leads_crm_wtech_${now.getTime()}.csv`, { bookType: 'csv' });

        if (notificationRef.current) {
            notificationRef.current.createNotification('success', 'CSV Gerado', 'O arquivo CSV foi baixado com sucesso.');
        }
    };



    const parseLPSourceCRM = (contextId: string | undefined): string => {
        if (!contextId) return 'Sem origem';
        const ctx = contextId.trim();
        if (ctx.startsWith('LP:')) {
            const inner = ctx.slice(3).trim().replace(/\s*\([^)]+\)\s*$/, '').trim();
            return 'LP: ' + inner;
        }
        if (ctx.startsWith('LP ')) {
            const colonIdx = ctx.indexOf(':');
            return colonIdx > 0 ? ctx.slice(0, colonIdx).trim() : ctx;
        }
        if (ctx.startsWith('Quiz Completed:')) {
            const inner = ctx.slice('Quiz Completed:'.length).trim().replace(/\s*\[.*?\]\s*/g, '').trim();
            return 'Quiz: ' + inner;
        }
        if (['Manual', 'Import', 'Evento', 'Direto', 'Site'].includes(ctx)) return ctx;
        if (ctx.length > 40) return 'Formulário de Contato';
        return ctx;
    };

    // Filter Logic
    const filteredLeads = useMemo(() => {
        return leads.filter(l => {
            const d = new Date(l.createdAt);

            // 1. Time Filters (Restrictive)
            if (filterType === 'Period') {
                if (filterPeriod !== 9999) { // 9999 is "Tudo"
                    const now = new Date();
                    const diffTime = Math.abs(now.getTime() - d.getTime());
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    if (diffDays > filterPeriod) return false;
                }
            } else if (filterType === 'Month') {
                if (!l.createdAt.startsWith(selectedMonth)) return false;
            } else if (filterType === 'Custom') {
                if (customRange.start && d < new Date(customRange.start)) return false;
                if (customRange.end && d > new Date(new Date(customRange.end).setHours(23, 59, 59, 999))) return false;
            }

            // 2. Source/Context Filter (match against normalized LP name)
            if (contextFilter && contextFilter !== 'All') {
                if (parseLPSourceCRM(l.contextId) !== contextFilter) return false;
            }

            // 3. User Filter
            if (selectedUserFilter && selectedUserFilter !== 'All') {
                if (selectedUserFilter === 'None') {
                    if (l.assignedTo) return false;
                } else if (String(l.assignedTo) !== String(selectedUserFilter)) {
                    return false;
                }
            }

            // 4. Search Filter
            if (searchQuery) {
                const q = searchQuery.toLowerCase().trim();
                const name = String(l.name || '').toLowerCase();
                const email = String(l.email || '').toLowerCase();
                const phone = String(l.phone || '').toLowerCase();
                if (!name.includes(q) && !email.includes(q) && !phone.includes(q)) return false;
            }

            return true;
        });
    }, [leads, filterType, filterPeriod, selectedMonth, customRange, contextFilter, selectedUserFilter, searchQuery]);

    // Extract unique contexts for filter — normalize LP names so the dropdown groups by LP
    const uniqueContexts = useMemo(() => {
        const normalized = new Set(leads.map(l => parseLPSourceCRM(l.contextId)).filter(Boolean));
        return Array.from(normalized).sort();
    }, [leads]);

    const exportFilteredToXLS = () => {
        if (filteredLeads.length === 0) {
            alert('Nenhum lead encontrado para exportar.');
            return;
        }
        const lpLabel = contextFilter !== 'All' ? contextFilter : 'Todos';
        const data = filteredLeads.map((l, idx) => ({
            '#': idx + 1,
            'Nome': l.name || '',
            'E-mail': l.email || '',
            'Telefone': l.phone || '',
            'CPF': l.cpf || '',
            'RG': l.rg || '',
            'Origem / LP': parseLPSourceCRM(l.contextId),
            'Status': l.status || '',
            'Atribuído a': usersMap[l.assignedTo || ''] || '',
            'Cidade': l.address_city || '',
            'UF': l.address_state || '',
            'CEP': l.zip_code || '',
            'Endereço': [l.address_street, l.address_number].filter(Boolean).join(', ') || '',
            'Data de Entrada': new Date(l.createdAt).toLocaleDateString('pt-BR'),
            'Notas': l.internalNotes || '',
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Leads');
        const safeName = lpLabel.replace(/[^a-zA-Z0-9À-ÿ\s]/g, '').trim().slice(0, 40);
        XLSX.writeFile(wb, `Leads CRM - ${safeName}.xlsx`);
        if (notificationRef.current) {
            notificationRef.current.createNotification('success', 'XLS Gerado', `${filteredLeads.length} leads exportados com sucesso.`);
        }
    };

    // Board leads: filtered by activeFilter (stats bar click) on top of filteredLeads
    const boardLeads = useMemo(() => {
        if (!activeFilter) return filteredLeads;
        return filteredLeads.filter(l => {
            if (activeFilter === 'New') return l.status === 'New';
            if (activeFilter === 'Contacted') return l.status === 'Contacted';
            if (activeFilter === 'Qualified') return l.status === 'Qualified' || l.status === 'Negotiating';
            if (activeFilter === 'Converted') return l.status === 'Converted' || l.status === 'Matriculated';
            if (activeFilter === 'Cold') return l.status === 'Cold' || l.status === 'Rejected';
            return true;
        });
    }, [filteredLeads, activeFilter]);

    // Contexto de teclado: n = novo lead, / = focar busca, r = atualizar
    useRegisterPage({
        title: 'Leads & CRM',
        newLabel: 'Novo lead',
        onNew: () => setIsCreateModalOpen(true),
        onFocusSearch: () => searchRef.current?.focus(),
        actions: [{ id: 'crm-refresh', label: 'Atualizar leads', key: 'r', run: () => fetchData() }],
    }, []);

    return (
        <DragContext.Provider value={{ draggedId, setDraggedId }}>
            <div className="h-full flex flex-col w-full max-w-full overflow-hidden relative">
                
                {/* Floating Bulk Actions Bar */}
                <AnimatePresence>
                    {selectedLeadIds.size > 0 && (
                        <motion.div 
                            initial={{ y: 100, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 100, opacity: 0 }}
                            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] bg-[var(--admin-surface-1)] border border-wtech-gold/30 shadow-2xl rounded-2xl px-6 py-4 flex items-center gap-6 min-w-[500px]"
                        >
                            <div className="flex items-center gap-3 pr-6 border-r border-[var(--admin-border)]">
                                <div className="w-10 h-10 rounded-xl bg-wtech-gold/10 flex items-center justify-center text-wtech-gold font-black">
                                    {selectedLeadIds.size}
                                </div>
                                <div>
                                    <h4 className="text-sm font-black text-[var(--admin-text-primary)] uppercase leading-none">Selecionados</h4>
                                    <p className="text-[10px] font-bold text-[var(--admin-text-tertiary)] mt-1 uppercase tracking-tight">Cuidado ao realizar ações</p>
                                </div>
                            </div>

                            <div className="flex-1 flex gap-2">
                                <div className="relative group/bulk">
                                    <button className="flex items-center gap-2 bg-wtech-black hover:bg-black text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg active:scale-95">
                                        <Users size={14} />
                                        Atribuir a Atendente
                                    </button>
                                    
                                    {/* Attendant Dropdown */}
                                    <div className="absolute bottom-full left-0 mb-2 w-64 opacity-0 invisible group-hover/bulk:opacity-100 group-hover/bulk:visible transition-all duration-300 z-[101]">
                                        <div className="bg-[var(--admin-surface-1)] border border-[var(--admin-border)] shadow-2xl rounded-xl p-2 max-h-64 overflow-y-auto custom-scrollbar">
                                            <p className="text-[9px] font-black text-[var(--admin-text-tertiary)] uppercase tracking-widest p-2 mb-1 border-b border-[var(--admin-border)]">Selecionar Atendente</p>
                                            {usersList.map((u) => (
                                                <button
                                                    key={u.id}
                                                    onClick={() => handleBulkAssign(u.id)}
                                                    className="w-full text-left px-3 py-2.5 hover:bg-[var(--admin-surface-2)] rounded-lg text-xs font-bold text-[var(--admin-text-secondary)] transition-colors flex items-center gap-3"
                                                >
                                                    <div className="w-6 h-6 rounded-full bg-[var(--admin-surface-3)] flex items-center justify-center text-[10px] uppercase text-[var(--admin-text-secondary)]">
                                                        {u.name.charAt(0)}
                                                    </div>
                                                    {u.name}
                                                </button>
                                            ))}
                                            {usersList.length === 0 && <p className="p-4 text-center text-xs text-[var(--admin-text-tertiary)] italic">Nenhum usuário encontrado</p>}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex bg-[var(--admin-surface-3)] p-1 rounded-xl">
                                    <button
                                        onClick={() => exportLeadsToPDF(true)}
                                        className="flex items-center gap-2 hover:bg-[var(--admin-surface-1)] text-[var(--admin-text-secondary)] px-3 py-2 rounded-lg text-xs font-bold transition-all"
                                        title="Exportar Selecionados para PDF"
                                    >
                                        <FileText size={14} className="text-red-500" />
                                        PDF
                                    </button>
                                    <button
                                        onClick={() => exportLeadsToCSV(true)}
                                        className="flex items-center gap-2 hover:bg-[var(--admin-surface-1)] text-[var(--admin-text-secondary)] px-3 py-2 rounded-lg text-xs font-bold transition-all"
                                        title="Exportar Selecionados para CSV"
                                    >
                                        <FileSpreadsheet size={14} className="text-green-500" />
                                        CSV
                                    </button>
                                </div>

                                <button
                                    onClick={handleBulkDelete}
                                    className="p-2.5 text-red-400 hover:text-red-600 hover:bg-red-500/10 rounded-xl transition-all"
                                    title="Remover Selecionados"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>

                            <button
                                onClick={clearSelection}
                                className="text-[10px] font-black uppercase text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)] transition-colors"
                            >
                                Limpar
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Funnel Overview */}
                <FunnelChart leads={filteredLeads} />

                {/* Controls Bar */}
                <div className="flex flex-col xl:flex-row justify-between xl:items-center gap-4 mb-4 bg-[var(--admin-surface-1)] p-4 rounded-xl shadow-sm border border-[var(--admin-border)]">

                    {/* Left: Search & Context */}
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-3 text-gray-400" />
                            <input
                                ref={searchRef}
                                className="pl-9 pr-4 py-2 bg-[var(--admin-surface-2)] border border-[var(--admin-border)] text-[var(--admin-text-primary)] placeholder:text-[var(--admin-text-tertiary)] rounded-lg text-xs font-bold w-64 focus:border-wtech-gold outline-none transition-all"
                                placeholder="Buscar leads...   ( / )"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <div className="relative group">
                            <div className="flex items-center gap-2 bg-[var(--admin-surface-2)] border border-[var(--admin-border)] px-3 py-2 rounded-lg cursor-pointer hover:border-wtech-gold/50 transition-colors">
                                <Filter size={14} className="text-[var(--admin-text-tertiary)]" />
                                <span className="text-xs font-bold text-[var(--admin-text-secondary)] truncate max-w-[150px]">
                                    {contextFilter === 'All' ? 'Todas as Origens' : contextFilter}
                                </span>
                            </div>
                            {/* Dropdown */}
                            <div className="absolute top-full left-0 pt-2 w-64 hidden group-hover:block z-50">
                                <div className="bg-[var(--admin-surface-1)] shadow-xl rounded-xl border border-[var(--admin-border)] p-2 max-h-64 overflow-y-auto custom-scrollbar">
                                    <button onClick={() => setContextFilter('All')} className="w-full text-left px-3 py-2 hover:bg-[var(--admin-surface-2)] rounded-lg text-xs font-bold text-[var(--admin-text-primary)]">Todas as Origens</button>
                                    {uniqueContexts.map((ctx: any) => (
                                        <button key={ctx} onClick={() => setContextFilter(ctx)} className="w-full text-left px-3 py-2 hover:bg-[var(--admin-surface-2)] rounded-lg text-xs text-[var(--admin-text-secondary)] truncate">{ctx}</button>
                                    ))}
                                </div>
                            </div>
                        </div>


                        {/* User Filter (Admin/Manager Only) */}
                        {(hasPermission('crm_view_all') || hasPermission('crm_view_team') || user?.role === 'Super Admin') && (
                            <div className="relative group">
                                <div className="flex items-center gap-2 bg-[var(--admin-surface-2)] border border-[var(--admin-border)] px-3 py-2 rounded-lg cursor-pointer hover:border-wtech-gold/50 transition-colors">
                                    <Users size={14} className="text-[var(--admin-text-tertiary)]" />
                                    <span className="text-xs font-bold text-[var(--admin-text-secondary)] truncate max-w-[150px]">
                                        {selectedUserFilter === 'All' ? 'Todos os Usuários' : selectedUserFilter === 'None' ? 'Sem Atendente' : (usersMap[selectedUserFilter] || 'Usuário')}
                                    </span>
                                </div>
                                <div className="absolute top-full left-0 pt-2 w-64 hidden group-hover:block z-50">
                                    <div className="bg-[var(--admin-surface-1)] shadow-xl rounded-xl border border-[var(--admin-border)] p-2 max-h-64 overflow-y-auto custom-scrollbar">
                                        <button onClick={() => setSelectedUserFilter('All')} className="w-full text-left px-3 py-2 hover:bg-[var(--admin-surface-2)] rounded-lg text-xs font-bold text-[var(--admin-text-primary)] uppercase">Todos</button>
                                        <button onClick={() => setSelectedUserFilter('None')} className="w-full text-left px-3 py-2 hover:bg-[var(--admin-surface-2)] rounded-lg text-xs font-bold text-orange-500 uppercase">Fila (Sem Dono)</button>
                                        {usersList.map((u) => (
                                            <button key={u.id} onClick={() => setSelectedUserFilter(u.id)} className="w-full text-left px-3 py-2 hover:bg-[var(--admin-surface-2)] rounded-lg text-xs text-[var(--admin-text-secondary)] truncate">
                                                {u.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right: Date Filters & Actions */}
                    <div className="flex flex-wrap items-center gap-4">

                        {/* Export Buttons */}
                        <div className="flex items-center gap-2">
                            <div className="flex bg-[var(--admin-surface-2)] p-1 rounded-lg border border-[var(--admin-border)]">
                                <button
                                    onClick={() => viewMode === 'logs' ? exportHistoryToPDF() : exportLeadsToPDF(false)}
                                    className="p-2 text-[var(--admin-text-tertiary)] hover:text-red-500 hover:bg-[var(--admin-surface-1)] rounded-md transition-all"
                                    title="Exportar para PDF"
                                >
                                    <FileText size={16} />
                                </button>
                                <button
                                    onClick={() => viewMode === 'logs' ? exportHistoryToCSV() : exportLeadsToCSV(false)}
                                    className="p-2 text-[var(--admin-text-tertiary)] hover:text-green-500 hover:bg-[var(--admin-surface-1)] rounded-md transition-all"
                                    title="Exportar para CSV"
                                >
                                    <FileSpreadsheet size={16} />
                                </button>
                            </div>
                            {viewMode !== 'logs' && (
                                <button
                                    onClick={exportFilteredToXLS}
                                    className="flex items-center gap-1.5 px-3 py-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-300 dark:border-green-700 rounded-lg text-xs font-black hover:bg-green-100 dark:hover:bg-green-900/40 transition-all active:scale-95"
                                    title={`Exportar ${filteredLeads.length} leads filtrados em XLS`}
                                >
                                    <Download size={14} />
                                    XLS ({filteredLeads.length})
                                </button>
                            )}
                        </div>

                        {/* Date Filter Compact */}
                        <div className="flex bg-[var(--admin-surface-2)] p-1 rounded-lg border border-[var(--admin-border)]">
                            {[7, 30, 9999].map(days => (
                                <button
                                    key={days}
                                    onClick={() => { setFilterPeriod(days); setFilterType('Period'); }}
                                    className={`px-3 py-1.5 text-[10px] font-bold uppercase rounded-md transition-all ${filterType === 'Period' && filterPeriod === days ? 'bg-[var(--admin-surface-1)] shadow text-[var(--admin-text-primary)]' : 'text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)]'}`}
                                >
                                    {days === 9999 ? 'Tudo' : `${days}d`}
                                </button>
                            ))}
                        </div>

                        {/* Distribution Switch - Permission Gated */}
                        {hasPermission('crm_config_dist') && (
                            <div className="flex items-center gap-3 pl-4 border-l border-[var(--admin-border)]">
                                <div className="flex flex-col items-end">
                                    <span className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase">Distribuição</span>
                                    <span className={`text-xs font-black uppercase ${distMode === 'Random' ? 'text-green-600' : 'text-orange-600'}`}>
                                        {distMode === 'Random' ? 'Roleta (Auto)' : 'Manual'}
                                    </span>
                                </div>
                                <div
                                    onClick={() => toggleDistMode(distMode === 'Manual' ? 'Random' : 'Manual')}
                                    className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors ${distMode === 'Random' ? 'bg-green-500' : 'bg-gray-300'}`}
                                >
                                    <div className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform ${distMode === 'Random' ? 'translate-x-6' : 'translate-x-0'}`}></div>
                                </div>
                            </div>
                        )}

                        {/* View Mode Toggle */}
                        <div className="flex bg-[var(--admin-surface-2)] p-1 rounded-lg border border-[var(--admin-border)]">
                            <button
                                onClick={() => setViewMode('kanban')}
                                className={`p-2 rounded-md transition-all ${viewMode === 'kanban' ? 'bg-[var(--admin-surface-1)] shadow text-[var(--admin-text-primary)]' : 'text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)]'}`}
                                title="Visualização Kanban"
                            >
                                <KanbanSquare size={16} />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-[var(--admin-surface-1)] shadow text-[var(--admin-text-primary)]' : 'text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)]'}`}
                                title="Visualização em Lista"
                            >
                                <List size={16} />
                            </button>
                            <button
                                onClick={() => setViewMode('logs')}
                                className={`p-2 rounded-md transition-all ${viewMode === 'logs' ? 'bg-[var(--admin-surface-1)] shadow text-[var(--admin-text-primary)]' : 'text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)]'}`}
                                title="Histórico de Movimentações"
                            >
                                <History size={16} />
                            </button>
                        </div>

                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="bg-gradient-to-r from-wtech-gold to-yellow-600 text-black p-2.5 rounded-lg hover:scale-105 active:scale-95 transition-all shadow-md shadow-yellow-500/20"
                        >
                            <Plus size={18} />
                        </button>
                    </div>
                </div>


                {/* Stats Bar */}
                {viewMode === 'kanban' && (() => {
                    const stageStats = [
                        { label: 'Novos',        status: 'New',       count: filteredLeads.filter(l => l.status === 'New').length,        ring: 'ring-blue-500',    text: 'text-blue-500' },
                        { label: 'Atendimento',  status: 'Contacted',  count: filteredLeads.filter(l => l.status === 'Contacted').length,  ring: 'ring-indigo-500',  text: 'text-indigo-500' },
                        { label: 'Negociação',   status: 'Qualified',  count: filteredLeads.filter(l => l.status === 'Qualified' || l.status === 'Negotiating').length, ring: 'ring-purple-500', text: 'text-purple-500' },
                        { label: 'Convertidos',  status: 'Converted',  count: filteredLeads.filter(l => l.status === 'Converted' || l.status === 'Matriculated').length, ring: 'ring-emerald-500', text: 'text-emerald-500' },
                        { label: 'Frios',        status: 'Cold',       count: filteredLeads.filter(l => l.status === 'Cold' || l.status === 'Rejected').length, ring: 'ring-gray-500', text: 'text-gray-500' },
                    ];
                    return (
                        <div className="grid grid-cols-5 gap-3 mb-4">
                            {stageStats.map(s => (
                                <button
                                    key={s.status}
                                    onClick={() => setActiveFilter(activeFilter === s.status ? null : s.status)}
                                    className={`rounded-xl p-3 border border-[var(--admin-border)] bg-[var(--admin-surface-1)] text-center transition-all hover:shadow-sm ${activeFilter === s.status ? `ring-2 ring-offset-1 ${s.ring}` : ''}`}
                                >
                                    <p className={`text-2xl font-black ${s.text}`}>{s.count}</p>
                                    <p className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider mt-0.5">{s.label}</p>
                                </button>
                            ))}
                        </div>
                    );
                })()}

                {/* Board, List or Logs */}
                {viewMode === 'kanban' ? (
                    <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar flex-1 w-full min-h-0">
                        <KanbanColumn
                            title="Novos (Entrada)"
                            status="New"
                            leads={boardLeads.filter(l => l.status === 'New')}
                            onMove={onDropLead}
                            onDropLead={onDropLead}
                            onLeadClick={handleLeadClick}
                            onTasks={setSelectedLeadForTasks}
                            usersMap={usersMap}
                            selectedLeadIds={selectedLeadIds}
                            onToggleSelection={toggleLeadSelection}
                        />
                        <KanbanColumn
                            title="Em Atendimento"
                            status="Contacted"
                            leads={boardLeads.filter(l => l.status === 'Contacted')}
                            onMove={onDropLead}
                            onDropLead={onDropLead}
                            onLeadClick={handleLeadClick}
                            onTasks={setSelectedLeadForTasks}
                            usersMap={usersMap}
                            selectedLeadIds={selectedLeadIds}
                            onToggleSelection={toggleLeadSelection}
                        />
                        <KanbanColumn
                            title="Negociação"
                            status="Qualified"
                            leads={boardLeads.filter(l => l.status === 'Qualified' || l.status === 'Negotiating')}
                            onMove={onDropLead}
                            onDropLead={onDropLead}
                            onLeadClick={handleLeadClick}
                            onTasks={setSelectedLeadForTasks}
                            usersMap={usersMap}
                            selectedLeadIds={selectedLeadIds}
                            onToggleSelection={toggleLeadSelection}
                        />
                        <KanbanColumn
                            title="Fechado / Ganho"
                            status="Converted"
                            leads={boardLeads.filter(l => l.status === 'Converted' || l.status === 'Matriculated')}
                            onMove={onDropLead}
                            onDropLead={onDropLead}
                            onLeadClick={handleLeadClick}
                            onTasks={setSelectedLeadForTasks}
                            usersMap={usersMap}
                            selectedLeadIds={selectedLeadIds}
                            onToggleSelection={toggleLeadSelection}
                        />
                        <KanbanColumn
                            title="Esfriou / Perdido"
                            status="Cold"
                            leads={boardLeads.filter(l => l.status === 'Cold' || l.status === 'Rejected')}
                            onMove={onDropLead}
                            onDropLead={onDropLead}
                            onLeadClick={handleLeadClick}
                            onTasks={setSelectedLeadForTasks}
                            usersMap={usersMap}
                            selectedLeadIds={selectedLeadIds}
                            onToggleSelection={toggleLeadSelection}
                        />
                    </div>
                ) : viewMode === 'list' ? (
                    <div className="flex-1 bg-[var(--admin-surface-1)] rounded-xl shadow-sm border border-[var(--admin-border)] overflow-hidden flex flex-col">
                        <div className="overflow-y-auto flex-1 custom-scrollbar">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-[var(--admin-surface-2)] text-[var(--admin-text-tertiary)] text-[10px] uppercase font-bold tracking-wider sticky top-0 z-10">
                                    <tr>
                                        <th className="px-6 py-4">Lead</th>
                                        <th className="px-6 py-4">Contato</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4">Origem</th>
                                        <th className="px-6 py-4">Responsável</th>
                                        <th className="px-6 py-4">Tempo</th>
                                        <th className="px-6 py-4 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--admin-border)] text-sm">
                                    {filteredLeads.map(lead => {
                                        // Status Config
                                        let statusColor = 'bg-gray-100 text-[var(--admin-text-secondary)]';
                                        let statusLabel: string = lead.status;
                                        if (lead.status === 'New') { statusColor = 'bg-wtech-black text-white'; statusLabel = 'NOVO'; }
                                        else if (lead.status === 'Contacted') { statusColor = 'bg-blue-100 text-blue-700'; statusLabel = 'EM ATENDIMENTO'; }
                                        else if (lead.status === 'Qualified' || lead.status === 'Negotiating') { statusColor = 'bg-purple-100 text-purple-700 border border-purple-200'; statusLabel = 'NEGOCIAÇÃO'; }
                                        else if (lead.status === 'Converted' || lead.status === 'Matriculated') { statusColor = 'bg-green-100 text-green-700 border border-green-200'; statusLabel = 'GANHO'; }
                                        else if (lead.status === 'Cold' || lead.status === 'Rejected') { statusColor = 'bg-red-50 text-red-400 border border-red-100'; statusLabel = 'PERDIDO'; }

                                        // Time Calc Inline
                                        const start = new Date(lead.updated_at || lead.createdAt).getTime();
                                        const now = new Date().getTime();
                                        const diff = now - start;
                                        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                                        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

                                        return (
                                            <tr 
                                                key={lead.id} 
                                                className={`hover:bg-[var(--admin-surface-2)] transition-colors group cursor-pointer ${selectedLeadIds.has(lead.id) ? 'bg-wtech-gold/5 border-l-2 border-l-wtech-gold' : ''}`} 
                                                onClick={() => handleLeadClick(lead)}
                                            >
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div 
                                                            onClick={(e) => { e.stopPropagation(); toggleLeadSelection(lead.id); }}
                                                            className={`w-4 h-4 rounded border transition-all flex items-center justify-center ${selectedLeadIds.has(lead.id) ? 'bg-wtech-gold border-wtech-gold text-black' : 'bg-[var(--admin-surface-2)] border-[var(--admin-border)]'}`}
                                                        >
                                                            {selectedLeadIds.has(lead.id) && <CheckCircle size={10} strokeWidth={4} />}
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-[var(--admin-text-primary)] group-hover:text-wtech-gold transition-colors">{lead.name}</div>
                                                            <div className="text-xs text-[var(--admin-text-tertiary)]">{new Date(lead.createdAt).toLocaleDateString()}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-[var(--admin-text-secondary)]">{lead.email}</div>
                                                    <div className="text-xs text-[var(--admin-text-tertiary)]">{lead.phone}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${statusColor}`}>
                                                        {statusLabel}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-1.5">
                                                        {lead.contextId?.startsWith('LP') ? <Globe size={12} className="text-blue-400" /> : <GraduationCap size={12} className="text-orange-400" />}
                                                        <span className="text-xs font-medium text-[var(--admin-text-secondary)] truncate max-w-[150px]" title={lead.contextId}>{lead.contextId || 'N/A'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {/* Robust User Display */}
                                                    {lead.assignedTo ? (
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-6 h-6 rounded-full bg-[var(--admin-surface-3)] flex items-center justify-center text-[10px] font-bold overflow-hidden border border-[var(--admin-border)]">
                                                                {/* Try to show Avatar or Initial */}
                                                                {usersMap[lead.assignedTo] ? (
                                                                    usersMap[lead.assignedTo].charAt(0).toUpperCase()
                                                                ) : '?'}
                                                            </div>
                                                            <span className="text-xs text-[var(--admin-text-primary)] font-bold truncate max-w-[100px]" title={usersMap[lead.assignedTo] || lead.assignedTo}>
                                                                {usersMap[lead.assignedTo] ? usersMap[lead.assignedTo].split(' ')[0] : 'Usuário ' + lead.assignedTo.substr(0, 4)}
                                                            </span>
                                                        </div>
                                                    ) : <span className="text-xs text-[var(--admin-text-tertiary)] italic">Fila (Sem Dono)</span>}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-xs font-bold text-[var(--admin-text-secondary)]">{days}d {hours}h</span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button className="text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)] p-1"><MoreVertical size={16} /></button>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                            {filteredLeads.length === 0 && (
                                <div className="p-10 text-center text-[var(--admin-text-tertiary)] text-sm">Nenhum lead encontrado com os filtros atuais.</div>
                            )}
                        </div>
                    </div>
                ) : (
                    // Render Movement Logs Table
                    <div className="flex-1 bg-[var(--admin-surface-1)] rounded-xl shadow-sm border border-[var(--admin-border)] overflow-hidden flex flex-col">
                        <div className="overflow-y-auto flex-1 custom-scrollbar">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-[var(--admin-surface-2)] text-[var(--admin-text-tertiary)] text-[10px] uppercase font-bold tracking-wider sticky top-0 z-10">
                                    <tr>
                                        <th className="px-6 py-4">Data/Hora</th>
                                        <th className="px-6 py-4">Lead</th>
                                        <th className="px-6 py-4">De Status</th>
                                        <th className="px-6 py-4">Para Status</th>
                                        <th className="px-6 py-4">Movido Por</th>
                                        <th className="px-6 py-4">Origem</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--admin-border)] text-sm">
                                    {loadingHistoryList ? (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-10 text-center text-[var(--admin-text-secondary)]">
                                                <div className="flex items-center justify-center gap-2">
                                                    <RefreshCw size={16} className="animate-spin text-wtech-gold" />
                                                    Carregando histórico de movimentações...
                                                </div>
                                            </td>
                                        </tr>
                                    ) : filteredHistory.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-10 text-center text-[var(--admin-text-tertiary)]">
                                                Nenhuma movimentação registrada no CRM com os filtros atuais.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredHistory.map(h => {
                                            const getStatusBadge = (status: string | null) => {
                                                if (!status) return <span className="px-2 py-1 rounded text-[10px] font-bold uppercase bg-gray-100 text-gray-500">Novo Lead</span>;
                                                let statusColor = 'bg-gray-100 text-[var(--admin-text-secondary)]';
                                                let label = STATUS_LABELS[status as keyof typeof STATUS_LABELS] || status.toUpperCase();
                                                if (status === 'New') statusColor = 'bg-wtech-black text-white';
                                                else if (status === 'Contacted') statusColor = 'bg-blue-100 text-blue-700';
                                                else if (status === 'Qualified' || status === 'Negotiating') statusColor = 'bg-purple-100 text-purple-700 border border-purple-200';
                                                else if (status === 'Converted' || status === 'Matriculated') statusColor = 'bg-green-100 text-green-700 border border-green-200';
                                                else if (status === 'Cold' || status === 'Rejected' || status === 'Lost') statusColor = 'bg-red-50 text-red-400 border border-red-100';
                                                return (
                                                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${statusColor}`}>
                                                        {label}
                                                    </span>
                                                );
                                            };

                                            const sourceLabel = h.source === 'drag' ? 'Arrastar' : 
                                                                h.source === 'quick' ? 'Rápido' : 
                                                                h.source === 'modal' ? 'Modal' : 
                                                                h.source === 'lost' ? 'Perda' : 
                                                                h.source === 'conversion' ? 'Conversão' : h.source || 'N/A';

                                            return (
                                                <tr 
                                                    key={h.id} 
                                                    className="hover:bg-[var(--admin-surface-2)] transition-colors group cursor-pointer"
                                                    onClick={() => handleHistoryLeadClick(h.lead_id)}
                                                >
                                                    <td className="px-6 py-4 whitespace-nowrap text-xs text-[var(--admin-text-secondary)]">
                                                        <div className="flex items-center gap-1.5 font-bold">
                                                            <Clock size={12} className="text-gray-400" />
                                                            {new Date(h.created_at).toLocaleString('pt-BR')}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div>
                                                            <div className="font-bold text-[var(--admin-text-primary)] group-hover:text-wtech-gold transition-colors">{h.lead?.name || 'Lead Removido'}</div>
                                                            <div className="text-xs text-[var(--admin-text-tertiary)]">{h.lead?.email || h.lead?.phone || 'Sem contato'}</div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        {getStatusBadge(h.from_status)}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center gap-2">
                                                            <ArrowRight size={12} className="text-gray-400" />
                                                            {getStatusBadge(h.to_status)}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-6 h-6 rounded-full bg-[var(--admin-surface-3)] flex items-center justify-center text-[10px] font-bold overflow-hidden border border-[var(--admin-border)]">
                                                                {h.moved_by_name?.charAt(0).toUpperCase() || 'S'}
                                                            </div>
                                                            <span className="text-xs text-[var(--admin-text-primary)] font-bold">
                                                                {h.moved_by_name || 'Sistema'}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-xs text-[var(--admin-text-secondary)] font-bold">
                                                        <span className="px-2 py-0.5 rounded bg-[var(--admin-surface-3)] border border-[var(--admin-border)] text-gray-500">
                                                            {sourceLabel}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>


            <AnimatePresence>
                {isCreateModalOpen && (
                    <NewLeadModal 
                        isOpen={isCreateModalOpen} 
                        onClose={() => setIsCreateModalOpen(false)} 
                        onSave={handleCreateLead} 
                    />
                )}
                {editingLead && (
                    <EditLeadModal
                        lead={editingLead}
                        isOpen={!!editingLead}
                        onClose={() => setEditingLead(null)}
                        onSave={saveLeadUpdates}
                        onDelete={deleteLead}
                        onTasks={(lead: any) => {
                            setEditingLead(null);
                            setSelectedLeadForTasks(lead);
                        }}
                        users={usersList}
                    />
                )}
                {/* Conversion Modal */}
                {conversionModal.isOpen && (
                     <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-[var(--admin-surface-1)] p-6 rounded-2xl w-full max-w-md shadow-2xl border border-[var(--admin-border)] space-y-4">
                            <h3 className="text-xl font-bold text-[var(--admin-text-primary)]">Confirmar Conversão</h3>
                            <p className="text-sm text-[var(--admin-text-secondary)]">O lead <b>{conversionModal.lead?.name}</b> será marcado como <b>{conversionModal.targetStatus}</b>.</p>

                            <div className="bg-[var(--admin-surface-2)] p-4 rounded-xl space-y-3">
                                <label className="text-xs font-bold uppercase text-[var(--admin-text-tertiary)]">Tipo de Venda</label>
                                <div className="flex gap-2">
                                    <button onClick={() => setConversionType('Course')} className={`flex-1 py-2 rounded-lg text-sm font-bold border ${conversionType === 'Course' ? 'bg-[var(--admin-surface-1)] border-wtech-gold shadow text-[var(--admin-text-primary)]' : 'border-[var(--admin-border)] text-[var(--admin-text-secondary)] hover:bg-[var(--admin-surface-3)]'}`}>Curso/Evento</button>
                                    <button onClick={() => setConversionType('Product')} className={`flex-1 py-2 rounded-lg text-sm font-bold border ${conversionType === 'Product' ? 'bg-[var(--admin-surface-1)] border-wtech-gold shadow text-[var(--admin-text-primary)]' : 'border-[var(--admin-border)] text-[var(--admin-text-secondary)] hover:bg-[var(--admin-surface-3)]'}`}>Produto/Serviço</button>
                                </div>

                                {conversionType === 'Course' ? (
                                    <select className="w-full px-3 py-2.5 bg-[var(--admin-surface-1)] border border-[var(--admin-border)] rounded-xl text-sm text-[var(--admin-text-primary)] outline-none focus:border-wtech-gold transition-all" value={selectedCourseId} onChange={e => setSelectedCourseId(e.target.value)}>
                                        <option value="">Selecione o Curso...</option>
                                        {activeCourses.map(c => <option key={c.id} value={c.id}>{c.title} ({new Date(c.date).toLocaleDateString()})</option>)}
                                    </select>
                                ) : (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-[10px] font-black text-[var(--admin-text-tertiary)] uppercase tracking-widest mb-1.5">Produto / Serviço</label>
                                            <select
                                                className="w-full px-3 py-2.5 bg-[var(--admin-surface-1)] border border-[var(--admin-border)] rounded-xl text-sm text-[var(--admin-text-primary)] outline-none focus:border-wtech-gold transition-all"
                                                value={selectedProductId}
                                                onChange={e => {
                                                    const prod = catalogProducts.find(p => p.id === e.target.value);
                                                    setSelectedProductId(e.target.value);
                                                    if (prod) setSaleValue(prod.price.toString());
                                                }}
                                            >
                                                <option value="">Personalizado / Outros</option>
                                                {catalogProducts.map(p => (
                                                    <option key={p.id} value={p.id}>{p.title} - R$ {p.price}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="flex gap-2">
                                            <div className="flex-1">
                                                <label className="block text-[10px] font-black text-[var(--admin-text-tertiary)] uppercase tracking-widest mb-1.5">Valor Total (R$)</label>
                                                <input
                                                    placeholder="0.00"
                                                    className="w-full px-3 py-2.5 bg-[var(--admin-surface-1)] border border-[var(--admin-border)] rounded-xl text-sm text-[var(--admin-text-primary)] font-bold outline-none focus:border-wtech-gold transition-all"
                                                    value={saleValue}
                                                    onChange={e => setSaleValue(e.target.value)}
                                                />
                                            </div>
                                            <div className="w-24">
                                                <label className="block text-[10px] font-black text-[var(--admin-text-tertiary)] uppercase tracking-widest mb-1.5">Qtd.</label>
                                                <input
                                                    type="number"
                                                    className="w-full px-3 py-2.5 bg-[var(--admin-surface-1)] border border-[var(--admin-border)] rounded-xl text-sm text-[var(--admin-text-primary)] font-bold outline-none text-center focus:border-wtech-gold transition-all"
                                                    value={orderQuantity}
                                                    onChange={e => setOrderQuantity(Number(e.target.value))}
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-[10px] font-black text-[var(--admin-text-tertiary)] uppercase tracking-widest mb-1.5">Forma de Pagamento</label>
                                            <div className="grid grid-cols-2 gap-2">
                                                {['Manual', 'Pix', 'Crédito', 'Boleto', 'Asaas', 'Stripe'].map(method => (
                                                    <button
                                                        key={method}
                                                        onClick={() => setPaymentMethod(method as any)}
                                                        className={`py-2 text-[10px] font-black rounded-lg border uppercase ${paymentMethod === method ? 'bg-wtech-gold text-black border-wtech-gold' : 'border-[var(--admin-border)] text-[var(--admin-text-secondary)] hover:bg-[var(--admin-surface-3)]'}`}
                                                    >
                                                        {method}
                                                    </button>
                                                ))}
                                            </div>
                                            {paymentMethod === 'Manual' && (
                                                <input
                                                    placeholder="Detalhes (Ex: Dinheiro, Cheque...)"
                                                    className="w-full px-3 py-2 bg-[var(--admin-surface-1)] border border-[var(--admin-border)] rounded-lg text-xs text-[var(--admin-text-primary)] mt-2 outline-none focus:border-wtech-gold transition-all"
                                                    value={manualDetails}
                                                    onChange={e => setManualDetails(e.target.value)}
                                                />
                                            )}
                                        </div>

                                        {!selectedProductId && (
                                            <div>
                                                <label className="block text-[10px] font-black text-[var(--admin-text-tertiary)] uppercase tracking-widest mb-1.5">Obs/Resumo do Pedido</label>
                                                <input
                                                    placeholder="Ex: Peças X, Y..."
                                                    className="w-full px-3 py-2.5 bg-[var(--admin-surface-1)] border border-[var(--admin-border)] rounded-xl text-sm text-[var(--admin-text-primary)] outline-none focus:border-wtech-gold transition-all"
                                                    value={productSummary}
                                                    onChange={e => setProductSummary(e.target.value)}
                                                />
                                            </div>
                                        )}

                                        <label className="flex items-center gap-2 text-[10px] font-bold text-[var(--admin-text-secondary)] mt-2 cursor-pointer">
                                            <input type="checkbox" className="accent-wtech-gold" checked={generatePaymentLink} onChange={e => setGeneratePaymentLink(e.target.checked)} />
                                            Gerar Link de Pagamento no Sistema
                                        </label>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-2 pt-2">
                                <button onClick={() => setConversionModal({ ...conversionModal, isOpen: false })} className="flex-1 py-3 font-bold text-[var(--admin-text-secondary)] hover:bg-[var(--admin-surface-3)] rounded-xl transition-colors">Cancelar</button>
                                <button onClick={handleConfirmConversion} className="flex-1 py-3 font-black bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 transition-all active:scale-95">Confirmar</button>
                            </div>
                        </motion.div>
                    </div>
                )}
                
                {/* Lost Reason Modal */}
                {lostReasonModal.isOpen && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-[var(--admin-surface-1)] p-6 rounded-2xl w-full max-w-sm shadow-2xl border border-[var(--admin-border)] space-y-4">
                            <h3 className="text-lg font-bold text-red-500">Motivo da Perda</h3>
                            <textarea
                                autoFocus
                                className="w-full px-3 py-2.5 bg-[var(--admin-surface-2)] border border-[var(--admin-border)] rounded-xl text-sm text-[var(--admin-text-primary)] placeholder:text-[var(--admin-text-tertiary)] h-24 outline-none focus:border-wtech-gold resize-none transition-all"
                                placeholder="Por que o lead foi perdido?"
                                value={lostReason}
                                onChange={e => setLostReason(e.target.value)}
                            />
                            <div className="flex gap-2">
                                <button onClick={() => setLostReasonModal({ ...lostReasonModal, isOpen: false })} className="flex-1 py-2 font-bold text-[var(--admin-text-secondary)] hover:bg-[var(--admin-surface-3)] rounded-xl transition-colors">Voltar</button>
                                <button onClick={handleConfirmLost} className="flex-1 py-2 font-black bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all active:scale-95">Confirmar</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            
            {/* Lead Task Sidebar */}
            {selectedLeadForTasks && (
                <LeadTaskSidebar
                    lead={selectedLeadForTasks}
                    isOpen={!!selectedLeadForTasks}
                    onClose={() => setSelectedLeadForTasks(null)}
                    onTaskCreated={(task: any) => {
                        notificationRef.current?.createNotification('success', 'Agendado!', `Tarefa "${task.title}" criada.`);
                    }}
                />
            )}
            <SplashedPushNotifications ref={notificationRef} />

        </DragContext.Provider>
    );
};

// Need to update EditLeadModal and NewLeadModal to include 'value' input field.



export default CRMView;
