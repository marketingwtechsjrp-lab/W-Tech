import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../context/AuthContext';
import { Task, TaskCategory } from '../../../types';
import {
    Plus, Clock, CheckCircle2, AlertTriangle, Trash2, User,
    Calendar, Flag, Bot, X, Tag, ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../../lib/utils';

// ── Priority config ────────────────────────────────────────────────────────

const PRIORITY = {
    URGENT: { label: 'Urgente', accent: 'bg-red-500',    muted: 'bg-red-500/10',    text: 'text-red-500',    border: 'border-red-500/30',    dot: 'bg-red-500' },
    HIGH:   { label: 'Alta',    accent: 'bg-orange-500', muted: 'bg-orange-500/10', text: 'text-orange-500', border: 'border-orange-500/30', dot: 'bg-orange-500' },
    MEDIUM: { label: 'Média',   accent: 'bg-blue-500',   muted: 'bg-blue-500/10',   text: 'text-blue-500',   border: 'border-blue-500/30',   dot: 'bg-blue-500' },
    LOW:    { label: 'Baixa',   accent: 'bg-gray-400',   muted: 'bg-gray-400/10',   text: 'text-gray-400',   border: 'border-gray-400/30',   dot: 'bg-gray-400' },
} as const;

type PriorityKey = keyof typeof PRIORITY;

// ── Helpers ────────────────────────────────────────────────────────────────

const formatDateForInput = (dateStr: string | null | undefined) => {
    if (!dateStr) return '';
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return '';
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch { return ''; }
};

const dueDateLabel = (dueDate: string | null | undefined, isDone: boolean) => {
    if (!dueDate) return null;
    const now = new Date();
    const due = new Date(dueDate);
    const diffMs = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (isDone) return { label: due.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }), overdue: false };
    if (diffDays < 0) return { label: `Venceu há ${Math.abs(diffDays)}d`, overdue: true };
    if (diffDays === 0) return { label: 'Vence hoje', overdue: true };
    if (diffDays === 1) return { label: 'Vence amanhã', overdue: false };
    return { label: `${due.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`, overdue: false };
};

// ── TaskCard ───────────────────────────────────────────────────────────────

interface TaskCardProps {
    task: Task;
    usersMap: Record<string, string>;
    onDelete: (id: string) => void;
    onEdit: (task: Task) => void;
    onStatusToggle: (task: Task) => void;
    onWhatsapp: (task: Task) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, usersMap, onDelete, onEdit, onStatusToggle, onWhatsapp }) => {
    const isDone = task.status === 'DONE';
    const pKey = (task.priority as PriorityKey) || 'MEDIUM';
    const p = PRIORITY[pKey] ?? PRIORITY.MEDIUM;
    const dateInfo = dueDateLabel(task.dueDate, isDone);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            onClick={() => onEdit(task)}
            className={cn(
                'relative bg-[var(--admin-surface-1)] border border-[var(--admin-border)]',
                'rounded-xl p-4 cursor-pointer transition-all duration-200',
                'hover:shadow-md hover:-translate-y-0.5',
                isDone && 'opacity-60'
            )}
        >
            {/* Priority accent bar */}
            <div className={cn('absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full', p.accent)} />

            <div className="pl-3">
                {/* Top row: category + date */}
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        {task.category && (
                            <span
                                className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border"
                                style={{
                                    color: task.category.color || 'var(--admin-text-tertiary)',
                                    borderColor: (task.category.color || 'var(--admin-border)') + '40',
                                    backgroundColor: (task.category.color || 'transparent') + '15',
                                }}
                            >
                                <Tag size={8} /> {task.category.name}
                            </span>
                        )}
                        {!task.category && (
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--admin-text-tertiary)]">Geral</span>
                        )}
                    </div>

                    {dateInfo && (
                        <span className={cn(
                            'flex items-center gap-1 text-[10px] font-bold',
                            dateInfo.overdue ? 'text-red-500' : 'text-[var(--admin-text-tertiary)]'
                        )}>
                            <Clock size={9} />
                            {dateInfo.label}
                        </span>
                    )}
                </div>

                {/* Title */}
                <h4 className={cn(
                    'text-sm font-bold text-[var(--admin-text-primary)] leading-snug mb-2',
                    isDone && 'line-through text-[var(--admin-text-tertiary)]'
                )}>
                    {task.title}
                </h4>

                {/* Description preview */}
                {task.description && !isDone && (
                    <p className="text-xs text-[var(--admin-text-secondary)] line-clamp-2 mb-2 leading-relaxed">
                        {task.description}
                    </p>
                )}

                {/* Lead chip */}
                {task.leadName && (
                    <div className="flex items-center gap-1.5 mb-2 bg-[var(--admin-surface-3)] border border-[var(--admin-border)] rounded-lg px-2 py-1 w-fit">
                        <User size={10} className="text-[var(--admin-text-tertiary)]" />
                        <span className="text-[11px] font-medium text-[var(--admin-text-secondary)] truncate max-w-[140px]">
                            {task.leadName}
                        </span>
                    </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-2 border-t border-[var(--admin-border)]">
                    <div className="flex items-center gap-2">
                        {task.assignedTo && (
                            <div
                                className="w-6 h-6 rounded-full bg-gradient-to-br from-wtech-gold to-yellow-600 flex items-center justify-center text-[9px] font-black text-black shadow-sm shrink-0"
                                title={usersMap[task.assignedTo]}
                            >
                                {usersMap[task.assignedTo]?.slice(0, 2).toUpperCase() || '?'}
                            </div>
                        )}
                        <span className={cn(
                            'flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md',
                            p.muted, p.text
                        )}>
                            {pKey === 'URGENT' && <AlertTriangle size={9} strokeWidth={3} />}
                            {pKey === 'HIGH'   && <Flag size={9} strokeWidth={3} />}
                            {p.label}
                        </span>
                        {(task as any).isWhatsappSchedule && (
                            <Bot size={13} className="text-green-500" title="WhatsApp agendado" />
                        )}
                    </div>

                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                        <button
                            onClick={() => onStatusToggle(task)}
                            title={isDone ? 'Reabrir' : 'Concluir'}
                            className={cn(
                                'p-1.5 rounded-lg transition-colors',
                                isDone
                                    ? 'text-amber-500 bg-amber-500/10 hover:bg-amber-500/20'
                                    : 'text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20'
                            )}
                        >
                            <CheckCircle2 size={13} />
                        </button>
                        {task.leadPhone && (
                            <button
                                onClick={() => onWhatsapp(task)}
                                title="WhatsApp"
                                className="p-1.5 rounded-lg text-green-600 bg-green-500/10 hover:bg-green-500/20 transition-colors"
                            >
                                <Bot size={13} />
                            </button>
                        )}
                        <button
                            onClick={() => onDelete(task.id)}
                            title="Excluir"
                            className="p-1.5 rounded-lg text-red-500 bg-red-500/10 hover:bg-red-500/20 transition-colors"
                        >
                            <Trash2 size={13} />
                        </button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

// ── Empty state ────────────────────────────────────────────────────────────

const EmptyColumn = ({ label, isDone }: { label: string; isDone: boolean }) => (
    <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
        <div className="w-12 h-12 rounded-2xl bg-[var(--admin-surface-3)] border border-[var(--admin-border)] flex items-center justify-center">
            {isDone ? <CheckCircle2 size={20} className="text-emerald-500" /> : <Clock size={20} className="text-[var(--admin-text-tertiary)]" />}
        </div>
        <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--admin-text-tertiary)]">{label}</p>
    </div>
);

// ── Modal input style ──────────────────────────────────────────────────────

const inputCls = 'w-full bg-[var(--admin-surface-2)] border border-[var(--admin-border)] rounded-xl px-3 py-2.5 text-sm text-[var(--admin-text-primary)] outline-none focus:border-wtech-gold transition-colors placeholder:text-[var(--admin-text-tertiary)]';

// ── Main View ──────────────────────────────────────────────────────────────

const EMPTY_FORM = {
    title: '', description: '', assignedTo: '', priority: 'MEDIUM',
    dueDate: '', status: 'TODO', leadId: '', categoryId: '',
    isWhatsappSchedule: false, whatsappMessageBody: ''
};

const TaskManagerView: React.FC<{ permissions?: any }> = ({ permissions }) => {
    const { user } = useAuth();

    const hasPermission = (key: string) => {
        if (!user) return false;
        if (permissions) return !!permissions[key];
        return user.role === 'Super Admin' || user.role === 'ADMIN';
    };

    // ── State ──
    const [tasks, setTasks]           = useState<Task[]>([]);
    const [leads, setLeads]           = useState<any[]>([]);
    const [categories, setCategories] = useState<TaskCategory[]>([]);
    const [usersMap, setUsersMap]     = useState<Record<string, string>>({});
    const [filterPriority, setFilterPriority] = useState<string>('ALL');
    const [isModalOpen, setIsModalOpen]       = useState(false);
    const [editingTask, setEditingTask]       = useState<Task | null>(null);
    const [formData, setFormData]             = useState({ ...EMPTY_FORM });

    useEffect(() => {
        if (user) Promise.all([fetchUsers(), fetchTasks(), fetchLeads(), fetchCategories()]);
    }, [user]);

    const fetchUsers = async () => {
        const { data } = await supabase.from('SITE_Users').select('id, name');
        if (data) {
            const map: Record<string, string> = {};
            data.forEach((u: any) => { map[u.id] = u.name; });
            setUsersMap(map);
        }
    };
    const fetchLeads = async () => {
        const { data } = await supabase.from('SITE_Leads').select('id, name').order('name');
        if (data) setLeads(data);
    };
    const fetchCategories = async () => {
        const { data } = await supabase.from('SITE_TaskCategories').select('*').order('name');
        if (data) setCategories(data);
    };
    const fetchTasks = async () => {
        const { data } = await supabase
            .from('SITE_Tasks')
            .select('*, SITE_Leads(name, phone), SITE_TaskCategories(name, color)')
            .order('created_at', { ascending: false });
        if (data) {
            setTasks(data.map((t: any) => ({
                id: t.id, title: t.title, description: t.description,
                status: t.status, priority: t.priority, created_at: t.created_at,
                dueDate: t.due_date, assignedTo: t.assigned_to,
                leadId: t.lead_id, leadName: t.SITE_Leads?.name, leadPhone: t.SITE_Leads?.phone,
                isWhatsappSchedule: t.is_whatsapp_schedule, whatsappMessageBody: t.whatsapp_message_body,
                categoryId: t.category_id,
                category: Array.isArray(t.SITE_TaskCategories) ? t.SITE_TaskCategories[0] : t.SITE_TaskCategories
            })));
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const payload = {
            title: formData.title, description: formData.description,
            assigned_to: formData.assignedTo || user?.id,
            priority: formData.priority,
            due_date: formData.dueDate ? new Date(formData.dueDate).toISOString() : null,
            status: formData.status,
            lead_id: formData.leadId || null,
            category_id: formData.categoryId || null,
            is_whatsapp_schedule: formData.isWhatsappSchedule,
            whatsapp_message_body: formData.whatsappMessageBody
        };
        if (editingTask) {
            await supabase.from('SITE_Tasks').update(payload).eq('id', editingTask.id);
        } else {
            await supabase.from('SITE_Tasks').insert([{ ...payload, created_by: user?.id }]);
        }
        setIsModalOpen(false);
        fetchTasks();
    };

    const handleDelete = async (id: string) => {
        if (confirm('Excluir esta tarefa?')) {
            setTasks(prev => prev.filter(t => t.id !== id));
            await supabase.from('SITE_Tasks').delete().eq('id', id);
        }
    };

    const handleToggleStatus = async (task: Task) => {
        const newStatus = task.status === 'DONE' ? 'TODO' : 'DONE';
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
        await supabase.from('SITE_Tasks').update({ status: newStatus }).eq('id', task.id);
    };

    const openNew = () => {
        setEditingTask(null);
        setFormData({ ...EMPTY_FORM });
        setIsModalOpen(true);
    };

    const openEdit = (t: Task, whatsapp = false) => {
        setEditingTask(t);
        setFormData({
            title: t.title || '', description: t.description || '',
            assignedTo: t.assignedTo || '', priority: t.priority || 'MEDIUM',
            dueDate: formatDateForInput(t.dueDate), status: t.status || 'TODO',
            leadId: t.leadId || '', categoryId: t.categoryId || '',
            isWhatsappSchedule: whatsapp ? true : !!(t as any).isWhatsappSchedule,
            whatsappMessageBody: (t as any).whatsappMessageBody || ''
        });
        setIsModalOpen(true);
    };

    // ── Derived ──
    const filtered = useMemo(() => {
        return tasks.filter(t => filterPriority === 'ALL' || t.priority === filterPriority);
    }, [tasks, filterPriority]);

    const todoTasks = filtered.filter(t => t.status !== 'DONE');
    const doneTasks = filtered.filter(t => t.status === 'DONE');

    const urgentCount  = tasks.filter(t => t.priority === 'URGENT' && t.status !== 'DONE').length;
    const overdueCount = tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'DONE').length;

    // ── Render ──
    return (
        <div className="h-full flex flex-col bg-[var(--admin-surface-2)] rounded-3xl overflow-hidden border border-[var(--admin-border)] font-sans">

            {/* ── Header ── */}
            <div className="bg-[var(--admin-surface-1)] border-b border-[var(--admin-border)] px-6 py-4 flex items-center justify-between shrink-0">
                <div>
                    <h2 className="text-xl font-black text-[var(--admin-text-primary)] tracking-tight flex items-center gap-2">
                        <CheckCircle2 size={20} className="text-wtech-gold" />
                        Tarefas
                    </h2>
                    <p className="text-[11px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-widest mt-0.5">
                        Produtividade & Foco
                    </p>
                </div>
                <button
                    onClick={openNew}
                    className="bg-gradient-to-r from-wtech-gold to-yellow-600 text-black px-4 py-2 rounded-xl font-bold text-sm shadow-md shadow-yellow-500/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
                >
                    <Plus size={16} strokeWidth={3} /> Nova Tarefa
                </button>
            </div>

            {/* ── Stats Bar ── */}
            <div className="grid grid-cols-4 gap-3 px-6 py-4 shrink-0 bg-[var(--admin-surface-1)] border-b border-[var(--admin-border)]">
                {[
                    { label: 'Total', value: tasks.length, color: 'text-[var(--admin-text-primary)]', bg: 'bg-[var(--admin-surface-3)]' },
                    { label: 'Pendentes', value: tasks.filter(t => t.status !== 'DONE').length, color: 'text-blue-500', bg: 'bg-blue-500/10' },
                    { label: 'Urgentes', value: urgentCount, color: 'text-red-500', bg: 'bg-red-500/10' },
                    { label: 'Vencidas', value: overdueCount, color: 'text-orange-500', bg: 'bg-orange-500/10' },
                ].map(s => (
                    <div key={s.label} className={cn('rounded-xl p-3 border border-[var(--admin-border)] text-center', s.bg)}>
                        <p className={cn('text-2xl font-black leading-none', s.color)}>{s.value}</p>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--admin-text-tertiary)] mt-1">{s.label}</p>
                    </div>
                ))}
            </div>

            {/* ── Priority Filter ── */}
            <div className="flex items-center gap-2 px-6 py-3 bg-[var(--admin-surface-1)] border-b border-[var(--admin-border)] shrink-0 overflow-x-auto">
                {(['ALL', 'URGENT', 'HIGH', 'MEDIUM', 'LOW'] as const).map(p => {
                    const isAll = p === 'ALL';
                    const cfg = isAll ? null : PRIORITY[p];
                    const active = filterPriority === p;
                    return (
                        <button
                            key={p}
                            onClick={() => setFilterPriority(p)}
                            className={cn(
                                'px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all whitespace-nowrap border',
                                active
                                    ? isAll
                                        ? 'bg-[var(--admin-text-primary)] text-[var(--admin-surface-1)] border-transparent'
                                        : cn(cfg!.accent, 'text-white border-transparent')
                                    : 'bg-transparent text-[var(--admin-text-tertiary)] border-[var(--admin-border)] hover:border-[var(--admin-text-tertiary)]'
                            )}
                        >
                            {isAll ? 'Todas' : cfg!.label}
                        </button>
                    );
                })}
            </div>

            {/* ── Kanban ── */}
            <div className="flex-1 overflow-hidden p-5">
                <div className="flex h-full gap-4">

                    {/* Pendente */}
                    <div className="flex-1 flex flex-col min-h-0 bg-[var(--admin-surface-1)] rounded-2xl border border-[var(--admin-border)] overflow-hidden">
                        <div className="px-4 py-3 border-b border-[var(--admin-border)] flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-blue-500" />
                                <span className="text-xs font-black text-[var(--admin-text-secondary)] uppercase tracking-widest">Pendente</span>
                            </div>
                            <span className="bg-[var(--admin-surface-3)] border border-[var(--admin-border)] text-[var(--admin-text-tertiary)] text-[10px] font-black px-2 py-0.5 rounded-full">
                                {todoTasks.length}
                            </span>
                        </div>
                        <div className="flex-1 overflow-y-auto p-3 custom-scrollbar space-y-2">
                            <AnimatePresence>
                                {todoTasks.length === 0
                                    ? <EmptyColumn label="Nenhuma tarefa pendente" isDone={false} />
                                    : todoTasks.map(t => (
                                        <TaskCard
                                            key={t.id} task={t} usersMap={usersMap}
                                            onDelete={handleDelete}
                                            onEdit={openEdit}
                                            onStatusToggle={handleToggleStatus}
                                            onWhatsapp={t2 => openEdit(t2, true)}
                                        />
                                    ))
                                }
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* Concluído */}
                    <div className="flex-1 flex flex-col min-h-0 bg-[var(--admin-surface-1)] rounded-2xl border border-[var(--admin-border)] overflow-hidden">
                        <div className="px-4 py-3 border-b border-[var(--admin-border)] flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                <span className="text-xs font-black text-[var(--admin-text-secondary)] uppercase tracking-widest">Concluído</span>
                            </div>
                            <span className="bg-emerald-500/10 text-emerald-500 text-[10px] font-black px-2 py-0.5 rounded-full border border-emerald-500/20">
                                {doneTasks.length}
                            </span>
                        </div>
                        <div className="flex-1 overflow-y-auto p-3 custom-scrollbar space-y-2">
                            <AnimatePresence>
                                {doneTasks.length === 0
                                    ? <EmptyColumn label="Nenhuma tarefa concluída" isDone={true} />
                                    : doneTasks.map(t => (
                                        <TaskCard
                                            key={t.id} task={t} usersMap={usersMap}
                                            onDelete={handleDelete}
                                            onEdit={openEdit}
                                            onStatusToggle={handleToggleStatus}
                                            onWhatsapp={t2 => openEdit(t2, true)}
                                        />
                                    ))
                                }
                            </AnimatePresence>
                        </div>
                    </div>

                </div>
            </div>

            {/* ── Modal ── */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 16 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 16 }}
                            transition={{ duration: 0.2 }}
                            className="bg-[var(--admin-surface-1)] border border-[var(--admin-border)] w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden"
                        >
                            {/* Modal header */}
                            <div className="px-6 py-4 border-b border-[var(--admin-border)] flex items-center justify-between">
                                <h3 className="text-base font-black text-[var(--admin-text-primary)]">
                                    {editingTask ? 'Editar Tarefa' : 'Nova Tarefa'}
                                </h3>
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--admin-text-tertiary)] hover:bg-[var(--admin-surface-3)] transition-colors"
                                >
                                    <X size={15} />
                                </button>
                            </div>

                            <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto max-h-[70vh] custom-scrollbar">

                                {/* Title */}
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-[var(--admin-text-tertiary)] mb-1.5">Título *</label>
                                    <input
                                        required
                                        placeholder="O que precisa ser feito?"
                                        className={inputCls}
                                        value={formData.title}
                                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    />
                                </div>

                                {/* Priority + Status */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-wider text-[var(--admin-text-tertiary)] mb-1.5">Prioridade</label>
                                        <select className={inputCls} value={formData.priority} onChange={e => setFormData({ ...formData, priority: e.target.value })}>
                                            <option value="LOW">Baixa</option>
                                            <option value="MEDIUM">Média</option>
                                            <option value="HIGH">Alta</option>
                                            <option value="URGENT">Urgente</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-wider text-[var(--admin-text-tertiary)] mb-1.5">Status</label>
                                        <select className={inputCls} value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                                            <option value="TODO">Pendente</option>
                                            <option value="DONE">Concluído</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Due date + Category */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-wider text-[var(--admin-text-tertiary)] mb-1.5">Prazo</label>
                                        <input type="datetime-local" className={inputCls} value={formData.dueDate} onChange={e => setFormData({ ...formData, dueDate: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-wider text-[var(--admin-text-tertiary)] mb-1.5">Categoria</label>
                                        <select className={inputCls} value={formData.categoryId} onChange={e => setFormData({ ...formData, categoryId: e.target.value })}>
                                            <option value="">Sem Categoria</option>
                                            {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                                        </select>
                                    </div>
                                </div>

                                {/* Assignee + Lead */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-wider text-[var(--admin-text-tertiary)] mb-1.5">Responsável</label>
                                        <select className={inputCls} value={formData.assignedTo} onChange={e => setFormData({ ...formData, assignedTo: e.target.value })}>
                                            <option value="">Eu mesmo</option>
                                            {Object.entries(usersMap).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-wider text-[var(--admin-text-tertiary)] mb-1.5">Lead vinculado</label>
                                        <select className={inputCls} value={formData.leadId} onChange={e => setFormData({ ...formData, leadId: e.target.value })}>
                                            <option value="">Nenhum</option>
                                            {leads.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                        </select>
                                    </div>
                                </div>

                                {/* WhatsApp */}
                                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 space-y-3">
                                    <label className="flex items-center gap-2.5 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 rounded border-gray-300 accent-emerald-500"
                                            checked={formData.isWhatsappSchedule}
                                            onChange={e => setFormData({ ...formData, isWhatsappSchedule: e.target.checked })}
                                        />
                                        <span className="text-[11px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1.5">
                                            <Bot size={13} /> Automatizar Disparo WhatsApp
                                        </span>
                                    </label>
                                    {formData.isWhatsappSchedule && (
                                        <textarea
                                            placeholder="Mensagem automática..."
                                            className={cn(inputCls, 'h-20 resize-none')}
                                            value={formData.whatsappMessageBody}
                                            onChange={e => setFormData({ ...formData, whatsappMessageBody: e.target.value })}
                                        />
                                    )}
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-[var(--admin-text-tertiary)] mb-1.5">Notas / Descrição</label>
                                    <textarea
                                        placeholder="Detalhes adicionais..."
                                        className={cn(inputCls, 'h-20 resize-none')}
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    />
                                </div>

                                {/* Actions */}
                                <div className="flex justify-end gap-2 pt-1">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="px-4 py-2 rounded-xl text-[var(--admin-text-secondary)] hover:bg-[var(--admin-surface-3)] font-bold text-sm transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-5 py-2 bg-gradient-to-r from-wtech-gold to-yellow-600 text-black rounded-xl font-black text-sm shadow-md shadow-yellow-500/20 hover:scale-105 active:scale-95 transition-all"
                                    >
                                        {editingTask ? 'Salvar Alterações' : 'Criar Tarefa'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

        </div>
    );
};

export default TaskManagerView;
