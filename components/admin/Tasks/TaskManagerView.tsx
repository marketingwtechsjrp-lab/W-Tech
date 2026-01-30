import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { sendWhatsAppMessage } from '../../../lib/whatsapp';
import { useAuth } from '../../../context/AuthContext';
import { Task, TaskCategory } from '../../../types';
import { Plus, Clock, CheckCircle, AlertTriangle, Trash2, User, Search, Filter, X, Calendar, Flag, LayoutGrid, List, Edit, Tag, Image as ImageIcon, Upload, Bot, Circle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { BauhausCard } from '@/components/ui/bauhaus-card';

interface TaskCardProps {
    task: Task;
    usersMap: any;
    onDelete: (id: string) => void;
    onEdit: (task: Task) => void;
    onWhatsapp: (task: Task) => void;
    isOverdueStyle?: boolean;
    isDoneStyle?: boolean;
}

// Task Card Component (Refined Visual Adaptation with Bauhaus Card)
const TaskCard: React.FC<TaskCardProps & { onStatusToggle: (task: Task) => void }> = ({
    task,
    usersMap,
    onDelete,
    onEdit,
    onWhatsapp,
    onStatusToggle,
    isDoneStyle
}) => {
    const priorityColors: Record<string, string> = {
        'URGENT': '#ef4444',
        'HIGH': '#f97316',
        'MEDIUM': '#3b82f6',
        'LOW': '#9ca3af'
    };

    const accentColor = task.priority ? priorityColors[task.priority] : '#3b82f6';

    const d = task.dueDate ? new Date(task.dueDate) : null;
    const isValidDate = d && !isNaN(d.getTime());
    const formattedDate = isValidDate ? d!.toLocaleDateString() + ' ' + d!.toLocaleTimeString().slice(0, 5) : (task.dueDate ? 'Data Inválida' : 'Sem prazo');
    const progress = task.status === 'DONE' ? 100 : task.status === 'IN_PROGRESS' ? 60 : 20;

    const topText = usersMap[task.assignedTo] ? `Para: ${usersMap[task.assignedTo]}` : 'Sem responsável';
    const subText = task.leadName ? `Lead: ${task.leadName}` : (task.description ? task.description.slice(0, 45) + (task.description.length > 45 ? '...' : '') : '');

    return (
        <div
            className={`w-full ${isDoneStyle ? 'opacity-70' : ''}`}
        >
            <BauhausCard
                id={task.id}
                accentColor={accentColor}
                backgroundColor={isDoneStyle ? "rgba(26, 26, 26, 0.5)" : "#151419"}
                separatorColor="var(--bauhaus-card-separator)"
                borderRadius="1rem"
                borderWidth="1px"
                topInscription={topText}
                mainText={task.title}
                subMainText={subText}
                progressBarInscription={task.status === 'DONE' ? 'Concluído' : task.status === 'IN_PROGRESS' ? 'Em Andamento' : 'Pendente'}
                progress={progress}
                progressValue={task.dueDate ? formattedDate : ''}

                // Tag Data
                tag={task.category?.name}
                tagColor={task.category?.color}

                // Automation Indicator
                isAutomated={(task as any).isWhatsappSchedule}

                // Header Action: Toggle Status via Icon
                headerIcon={task.status === 'DONE' ? CheckCircle : Circle}
                onMoreOptionsClick={() => onStatusToggle(task)}
                onDeleteClick={() => onDelete(task.id)}
                onWhatsappClick={task.leadPhone ? () => onWhatsapp(task) : undefined}

                // Card Click: Open Details
                onCardClick={() => onEdit(task)}

                // Colors - Always Light Text for Dark Card
                textColorTop={isDoneStyle ? "#888" : "#bfc7d5"}
                textColorMain={isDoneStyle ? "#aaa" : "#f0f0f1"}
                textColorSub={isDoneStyle ? "#666" : "#a0a1b3"}
                textColorProgressLabel="#b4c7e7"
                textColorProgressValue="#e7e7f7"
                progressBarBackground="var(--bauhaus-card-progress-bar-bg)"

                // Button Colors (Leftovers just in case, but unused now)
                chronicleButtonBg="var(--bauhaus-chronicle-bg)"
                chronicleButtonFg="#808080"
                chronicleButtonHoverFg="#ffffff"

                customButtonHeight="1.2rem"
                customButtonFontSize="0.6rem"
                customCardPadding="0.4rem 0.8rem"
            />
        </div>
    );
};

// Task List Row Component
const TaskRow: React.FC<{ task: Task, usersMap: any, onDelete: (id: string) => void, onEdit: (task: Task) => void, onStatusToggle: (task: Task) => void }> = ({ task, usersMap, onDelete, onEdit, onStatusToggle }) => {
    const isOverdue = !task.dueDate ? false : new Date(task.dueDate) < new Date() && task.status !== 'DONE';
    return (
        <tr className={`border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${task.status === 'DONE' ? 'opacity-60 bg-gray-50 dark:bg-gray-900/50' : ''} ${isOverdue ? 'bg-red-50/30 dark:bg-red-900/20' : ''}`}>
            <td className="p-3">
                <div className={`w-2 h-2 rounded-full ${task.status === 'DONE' ? 'bg-green-500' : isOverdue ? 'bg-red-500 animate-pulse' : 'bg-blue-500'}`}></div>
            </td>
            <td className="p-3 font-bold text-gray-800 text-sm">
                {task.title}
            </td>
            <td className="p-3">
                {task.leadName ? (
                    <span className="text-xs font-bold text-wtech-gold uppercase tracking-wide flex items-center gap-1">
                        <User size={10} /> {task.leadName}
                    </span>
                ) : <span className="text-gray-300 text-xs">-</span>}
            </td>
            <td className="p-3">
                <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${task.priority === 'URGENT' ? 'bg-red-100 text-red-700' :
                            task.priority === 'HIGH' ? 'bg-orange-100 text-orange-700' :
                                task.priority === 'MEDIUM' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                        }`}
                >
                    {task.priority === 'URGENT' && <AlertTriangle size={8} className="mr-1" />}
                    {task.priority}
                </span>
                {(task as any).isWhatsappSchedule && (
                    <span className="ml-2 bg-green-100 text-green-700 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider animate-pulse" title="Automação WhatsApp Ativa">
                        <Bot size={10} className="mr-1" />
                    </span>
                )}
            </td>
            <td className="p-3 text-xs text-gray-500 font-medium">
                {task.dueDate ? (
                    <div className={`flex items-center gap-1 ${isOverdue ? 'text-red-600 font-bold' : ''}`}>
                        {new Date(task.dueDate).toLocaleDateString()} {new Date(task.dueDate).toLocaleTimeString().slice(0, 5)}
                    </div>
                ) : '-'}
            </td>
            <td className="p-3 text-xs text-gray-600">
                {task.assignedTo ? (usersMap[task.assignedTo] || 'Removido') : 'N/A'}
            </td>
            <td className="p-3 flex items-center justify-end gap-2 print:hidden">
                {task.status !== 'DONE' && (
                    <button
                        onClick={() => onStatusToggle(task)}
                        className="p-1 hover:bg-green-100 text-gray-400 hover:text-green-600 rounded transition"
                        title="Concluir"
                    >
                        <CheckCircle size={14} />
                    </button>
                )}
                <button onClick={() => onEdit(task)} className="p-1 hover:bg-blue-50 text-blue-500 rounded transition"><Edit size={14} /></button>
                <button onClick={() => onDelete(task.id)} className="p-1 hover:bg-red-50 text-red-500 rounded transition"><Trash2 size={14} /></button>
            </td>
        </tr>
    );
};


const TaskManagerView: React.FC<{ permissions?: any }> = ({ permissions }) => {
    const { user } = useAuth();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [leads, setLeads] = useState<{ id: string, name: string }[]>([]);
    const [categories, setCategories] = useState<TaskCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [usersMap, setUsersMap] = useState<Record<string, string>>({});
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    // Modal & Form State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        assignedTo: '',
        priority: 'MEDIUM' as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT',
        dueDate: '',
        status: 'TODO' as 'TODO' | 'IN_PROGRESS' | 'DONE',
        leadId: '',
        categoryId: '',
        isWhatsappSchedule: false,
        whatsappTemplateId: '',
        whatsappMessageBody: '',
        whatsappMediaUrl: ''
    });

    const [messageTemplates, setMessageTemplates] = useState<{ id: string, title: string, content: string }[]>([]);

    const [filterStatus, setFilterStatus] = useState<string>('ALL');
    const [filterPriority, setFilterPriority] = useState<string>('ALL');
    const [filterCategory, setFilterCategory] = useState<string>('ALL');
    const [filterUser, setFilterUser] = useState<string>('ALL');
    const [showOverdue, setShowOverdue] = useState(false);
    const [dateRange, setDateRange] = useState({ start: '', end: '' });

    const handlePrint = () => {
        window.print();
    };

    const setDatePreset = (days: number) => {
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - days);
        setDateRange({
            start: start.toISOString().split('T')[0],
            end: end.toISOString().split('T')[0]
        });
    };

    const isOverdue = (task: Task) => {
        if (!task.dueDate) return false;
        return new Date(task.dueDate) < new Date() && task.status !== 'DONE';
    };

    const hasPermission = (key: string) => {
        if (!user) return false;
        if (permissions) {
            if (permissions.admin_access) return true;
            return !!permissions[key];
        }
        if (typeof user.role === 'string') {
            if (user.role === 'Super Admin' || user.role === 'ADMIN' || user.role === 'Admin') return true;
            return false;
        }
        if (user.role?.level >= 10) return true;
        if (user.role?.name === 'Super Admin') return true;
        const rolePermissions = user.role?.permissions || {};
        return !!rolePermissions[key];
    };

    const canAssignOthers = React.useMemo(() => {
        return hasPermission('tasks_view_team') || hasPermission('admin_access');
    }, [user, permissions]);

    const isAdmin = React.useMemo(() => {
        const r = user?.role?.name || (typeof user?.role === 'string' ? user.role : '');
        return r === 'ADMIN' || r === 'Super Admin';
    }, [user]);

    const canViewTeam = hasPermission('tasks_view_team') || isAdmin;

    useEffect(() => {
        fetchUsers();
        fetchTasks();
        fetchLeads();
        fetchCategories();
        fetchTemplates();
    }, [user]);

    const fetchTemplates = async () => {
        const { data } = await supabase.from('SITE_MessageTemplates').select('*').order('title');
        if (data) setMessageTemplates(data);
    };

    const fetchCategories = async () => {
        const { data } = await supabase.from('SITE_TaskCategories').select('*').order('name');
        if (data) setCategories(data);
    };

    const fetchLeads = async () => {
        const { data } = await supabase.from('SITE_Leads').select('id, name').order('name');
        if (data) setLeads(data);
    };

    const fetchUsers = async () => {
        const { data } = await supabase.from('SITE_Users').select('id, name');
        if (data) {
            const map: Record<string, string> = {};
            data.forEach((u: any) => map[u.id] = u.name);
            setUsersMap(map);
        }
    };

    const [isUploading, setIsUploading] = useState(false);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        setIsUploading(true);
        try {
            const file = e.target.files[0];
            const fileExt = file.name.split('.').pop();
            const fileName = `${user?.id || 'anon'}_${Date.now()}.${fileExt}`;
            const filePath = `whatsapp_tasks/${fileName}`;

            const { error: uploadError } = await supabase.storage.from('site-assets').upload(filePath, file);

            if (uploadError) {
                alert('Erro no upload: ' + uploadError.message);
                return;
            }

            const { data } = supabase.storage.from('site-assets').getPublicUrl(filePath);
            setFormData(prev => ({ ...prev, whatsappMediaUrl: data.publicUrl }));
        } catch (err: any) {
            alert('Erro: ' + err.message);
        } finally {
            setIsUploading(false);
        }
    };

    const fetchTasks = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('SITE_Tasks')
            .select('*, SITE_Leads(name, phone), SITE_TaskCategories(name, color)')
            .order('created_at', { ascending: false });

        if (error) {
            console.error(error);
        } else if (data) {
            setTasks(data.map((t: any) => ({
                id: t.id,
                title: t.title,
                description: t.description,
                assignedTo: t.assigned_to,
                createdBy: t.created_by,
                dueDate: t.due_date,
                status: t.status,
                priority: t.priority,
                createdAt: t.created_at,
                leadId: t.lead_id,
                leadName: t.SITE_Leads?.name,
                leadPhone: t.SITE_Leads?.phone,
                tags: t.tags,
                categoryId: t.category_id,
                category: t.SITE_TaskCategories,
                whatsappMediaUrl: t.whatsapp_media_url,
                isWhatsappSchedule: t.is_whatsapp_schedule
            })));
        }
        setLoading(false);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const payload = {
            title: formData.title,
            description: formData.description,
            assigned_to: canAssignOthers ? (formData.assignedTo || null) : user?.id,
            priority: formData.priority,
            due_date: formData.dueDate || null,
            status: formData.status,
            created_by: user?.id,
            lead_id: formData.leadId || null,
            category_id: formData.categoryId || null,
            is_whatsapp_schedule: formData.isWhatsappSchedule,
            whatsapp_template_id: formData.whatsappTemplateId || null,
            whatsapp_message_body: formData.whatsappMessageBody || null,
            whatsapp_media_url: formData.whatsappMediaUrl || null,
            whatsapp_status: formData.isWhatsappSchedule ? 'PENDING' : 'PENDING'
        };

        if (editingTask) {
            const { error } = await supabase.from('SITE_Tasks').update(payload).eq('id', editingTask.id);
            if (error) alert('Erro ao atualizar: ' + error.message);
        } else {
            const { error } = await supabase.from('SITE_Tasks').insert([payload]);
            if (error) alert('Erro ao criar: ' + error.message);
        }

        setIsModalOpen(false);
        setEditingTask(null);
        setFormData({
            title: '', description: '', assignedTo: '', priority: 'MEDIUM', dueDate: '', status: 'TODO', leadId: '', categoryId: '',
            isWhatsappSchedule: false, whatsappTemplateId: '', whatsappMessageBody: '', whatsappMediaUrl: ''
        });
        fetchTasks();
    };

    const handleToggleStatus = async (task: Task) => {
        const newStatus = task.status === 'DONE' ? 'TODO' : 'DONE';
        
        // Optimistic Update
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));

        const { error } = await supabase.from('SITE_Tasks').update({ status: newStatus }).eq('id', task.id);
        if (error) {
            alert('Erro ao atualizar status: ' + error.message);
            fetchTasks(); // Rollback
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Excluir tarefa?')) return;
        
        // Optimistic Update
        setTasks(prev => prev.filter(t => t.id !== id));

        const { error } = await supabase.from('SITE_Tasks').delete().eq('id', id);
        if (error) {
            alert('Erro ao excluir tarefa: ' + error.message);
            fetchTasks(); // Rollback
        }
    };

    const handleWhatsapp = (task: Task) => {
        if (!task.leadPhone) return alert('Lead sem telefone cadastrado.');
        const phone = task.leadPhone.replace(/\D/g, '');
        const message = encodeURIComponent(`Olá ${task.leadName}, referente à tarefa: ${task.title}`);
        window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
    };

    const openEdit = (task: Task) => {
        setEditingTask(task);
        setFormData({
            title: task.title,
            description: task.description || '',
            assignedTo: task.assignedTo || '',
            priority: task.priority,
            dueDate: task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 16) : '',
            status: task.status,
            leadId: task.leadId || '',
            categoryId: task.categoryId || '',
            isWhatsappSchedule: (task as any).isWhatsappSchedule || false,
            whatsappTemplateId: (task as any).whatsappTemplateId || '',
            whatsappMessageBody: (task as any).whatsappMessageBody || '',
            whatsappMediaUrl: (task as any).whatsappMediaUrl || ''
        });
        setIsModalOpen(true);
    };

    const filteredTasks = tasks.filter(t => {
        if (!canViewTeam && t.assignedTo !== user?.id) return false;
        if (filterStatus !== 'ALL' && t.status !== filterStatus) return false;
        if (filterPriority !== 'ALL' && t.priority !== filterPriority) return false;
        if (filterUser !== 'ALL' && t.assignedTo !== filterUser) return false;
        if (filterCategory !== 'ALL' && t.categoryId !== filterCategory) return false;
        if (showOverdue) {
            if (t.status === 'DONE') return false;
            if (!t.dueDate || new Date(t.dueDate) > new Date()) return false;
        }
        if (dateRange.start && new Date(t.createdAt) < new Date(dateRange.start)) return false;
        if (dateRange.end && new Date(t.createdAt) > new Date(dateRange.end)) return false;
        return true;
    });

    const todoTasks = filteredTasks.filter(t => t.status === 'TODO');
    const inProgressTasks = filteredTasks.filter(t => t.status === 'IN_PROGRESS');
    const doneTasks = filteredTasks.filter(t => t.status === 'DONE');

    const sortFn = (a: Task, b: Task) => {
        // Primary sort: Date (ascending - closest first)
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        
        const timeA = new Date(a.dueDate).getTime();
        const timeB = new Date(b.dueDate).getTime();
        
        if (isNaN(timeA)) return 1;
        if (isNaN(timeB)) return -1;
        
        if (timeA !== timeB) return timeA - timeB;

        // Secondary sort: Priority
        const pMap: any = { 'URGENT': 0, 'HIGH': 1, 'MEDIUM': 2, 'LOW': 3 };
        return (pMap[a.priority] || 2) - (pMap[b.priority] || 2);
    };

    todoTasks.sort(sortFn);
    inProgressTasks.sort(sortFn);
    doneTasks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return (
        <div className="bg-white dark:bg-[#1A1A1A] rounded-xl shadow-sm border border-gray-100 dark:border-transparent h-full flex flex-col transition-colors duration-300">
            {/* Header */}
            <div className="p-4 sm:p-6 border-b border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row gap-4 sm:gap-0 justify-between items-start sm:items-center">
                <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Gerenciador de Tarefas</h2>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Organize e delegue atividades para a equipe.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    <button onClick={handlePrint} className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 px-4 py-2 rounded-lg font-bold flex items-center gap-2 print:hidden text-sm flex-1 sm:flex-none justify-center">
                        <User size={18} /> <span className="hidden sm:inline">Relatório</span>
                    </button>
                    <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg print:hidden">
                        <button onClick={() => setViewMode('grid')} className={`p-2 rounded ${viewMode === 'grid' ? 'bg-white dark:bg-gray-600 shadow text-wtech-gold' : 'text-gray-400'}`}>
                            <LayoutGrid size={18} />
                        </button>
                        <button onClick={() => setViewMode('list')} className={`p-2 rounded ${viewMode === 'list' ? 'bg-white dark:bg-gray-600 shadow text-wtech-gold' : 'text-gray-400'}`}>
                            <List size={18} />
                        </button>
                    </div>
                    <button
                        onClick={() => { setEditingTask(null); setFormData({ title: '', description: '', assignedTo: '', priority: 'MEDIUM', dueDate: '', status: 'TODO', leadId: '', categoryId: '', isWhatsappSchedule: false, whatsappTemplateId: '', whatsappMessageBody: '' }); setIsModalOpen(true); }}
                        className="bg-wtech-black text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-gray-800 transition-colors shadow-lg print:hidden flex-1 sm:flex-none justify-center ml-auto"
                    >
                        <Plus size={18} /> <span className="hidden sm:inline">Nova Tarefa</span><span className="sm:hidden">Nova</span>
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="p-4 bg-gray-50 dark:bg-[#1A1A1A] border-b border-gray-100 dark:border-gray-800 flex flex-wrap gap-2 sm:gap-4 print:hidden">
                <div className="flex items-center gap-2 bg-white dark:bg-black/20 px-3 py-2 rounded border border-gray-200 dark:border-gray-700 w-full sm:w-auto">
                    <Filter size={16} className="text-gray-400 shrink-0" />
                    <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="bg-transparent text-sm font-bold text-gray-700 dark:text-gray-300 outline-none w-full cursor-pointer">
                        <option value="ALL">Todos os Status</option>
                        <option value="TODO">Pendente</option>
                        <option value="IN_PROGRESS">Em Andamento</option>
                        <option value="DONE">Concluído</option>
                    </select>
                </div>

                {(isAdmin || canViewTeam) && (
                    <div className="flex items-center gap-2 bg-white dark:bg-black/20 px-3 py-2 rounded border border-gray-200 dark:border-gray-700 w-full sm:w-auto">
                        <User size={16} className="text-gray-400 shrink-0" />
                        <select value={filterUser} onChange={e => setFilterUser(e.target.value)} className="bg-transparent text-sm font-bold text-gray-700 dark:text-gray-300 outline-none w-full sm:max-w-[150px]">
                            <option value="ALL">Todos Usuários</option>
                            {Object.entries(usersMap).map(([id, name]) => (
                                <option key={id} value={id}>{name}</option>
                            ))}
                        </select>
                    </div>
                )}

                <div className="flex items-center gap-2 bg-white dark:bg-black/20 px-3 py-2 rounded border border-gray-200 dark:border-gray-700 w-full sm:w-auto">
                    <Tag size={16} className="text-gray-400 shrink-0" />
                    <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="bg-transparent text-sm font-bold text-gray-700 dark:text-gray-300 outline-none w-full sm:max-w-[150px]">
                        <option value="ALL">Todas Categorias</option>
                        {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                    </select>
                </div>

                <div className="flex items-center gap-2 bg-white dark:bg-black/20 p-1 rounded border border-gray-200 dark:border-gray-700 w-full sm:w-auto overflow-x-auto">
                    <button onClick={() => setDatePreset(0)} className="px-3 py-1 text-xs font-bold hover:bg-gray-100 dark:hover:bg-white/10 rounded whitespace-nowrap text-gray-700 dark:text-gray-300">Hoje</button>
                    <button onClick={() => setDatePreset(7)} className="px-3 py-1 text-xs font-bold hover:bg-gray-100 dark:hover:bg-white/10 rounded whitespace-nowrap text-gray-700 dark:text-gray-300">7d</button>
                    <button onClick={() => setDatePreset(30)} className="px-3 py-1 text-xs font-bold hover:bg-gray-100 dark:hover:bg-white/10 rounded whitespace-nowrap text-gray-700 dark:text-gray-300">30d</button>
                    <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-1 shrink-0"></div>
                    <input
                        type="date"
                        className="text-xs outline-none font-bold text-gray-600 dark:text-gray-400 bg-transparent min-w-[100px]"
                        value={dateRange.start}
                        onChange={e => setDateRange({ ...dateRange, start: e.target.value })}
                    />
                    <span className="text-gray-300 dark:text-gray-600">-</span>
                    <input
                        type="date"
                        className="text-xs outline-none font-bold text-gray-600 dark:text-gray-400 bg-transparent min-w-[100px]"
                        value={dateRange.end}
                        onChange={e => setDateRange({ ...dateRange, end: e.target.value })}
                    />
                </div>
            </div>

            {/* Task Content */}
            <div className="flex-1 overflow-hidden bg-gray-50/50 dark:bg-[#111]/50 flex flex-col">
                {viewMode === 'grid' ? (
                    <div className="flex-1 overflow-y-auto md:overflow-x-auto h-full p-2 sm:p-4 bg-gray-50 dark:bg-[#111]">
                        <div className="flex flex-col md:flex-row gap-6 md:gap-4 h-auto md:h-full w-full md:min-w-[1000px]">

                            {/* TODO COL */}
                            <div className="flex-none md:flex-1 flex flex-col w-full md:min-w-[300px] bg-gray-100/50 dark:bg-[#1A1A1A] rounded-xl p-2 md:p-3 border border-transparent dark:border-gray-800">
                                <div className="mb-4 flex items-center justify-between px-1">
                                    <div className="flex items-center gap-2 text-blue-500">
                                        <Clock size={18} />
                                        <h3 className="font-bold text-gray-700 dark:text-gray-300 text-sm">Pendentes ({todoTasks.length})</h3>
                                    </div>
                                    <button onClick={() => { setFormData({ ...formData, status: 'TODO' }); setIsModalOpen(true); }} className="text-gray-300 hover:text-blue-500 transition-colors w-6 h-6 rounded-full border border-gray-200 dark:border-gray-700 flex items-center justify-center"><Plus size={14} /></button>
                                </div>
                                <div className="flex-1 md:overflow-y-auto space-y-2 custom-scrollbar pr-1 pb-4 md:pb-20">
                                    {todoTasks.map(task => (
                                        <TaskCard key={task.id} task={task} usersMap={usersMap} onDelete={handleDelete} onEdit={openEdit} onWhatsapp={handleWhatsapp} onStatusToggle={handleToggleStatus} />
                                    ))}
                                    {todoTasks.length === 0 && <div className="text-center text-xs text-gray-400 italic py-4">Nenhuma tarefa pendente</div>}
                                </div>
                            </div>

                            {/* IN PROGRESS COL */}
                            <div className="flex-none md:flex-1 flex flex-col w-full md:min-w-[300px] bg-gray-100/50 dark:bg-[#1A1A1A] rounded-xl p-2 md:p-3 border border-transparent dark:border-gray-800">
                                <div className="mb-4 flex items-center justify-between px-1">
                                    <div className="flex items-center gap-2 text-sky-500">
                                        <Clock size={18} />
                                        <h3 className="font-bold text-gray-700 dark:text-gray-300 text-sm">Em andamento ({inProgressTasks.length})</h3>
                                    </div>
                                    <button onClick={() => { setFormData({ ...formData, status: 'IN_PROGRESS' }); setIsModalOpen(true); }} className="text-gray-300 hover:text-sky-500 transition-colors w-6 h-6 rounded-full border border-gray-200 dark:border-gray-700 flex items-center justify-center"><Plus size={14} /></button>
                                </div>
                                <div className="flex-1 md:overflow-y-auto space-y-2 custom-scrollbar pr-1 pb-4 md:pb-20">
                                    {inProgressTasks.map(task => (
                                        <TaskCard key={task.id} task={task} usersMap={usersMap} onDelete={handleDelete} onEdit={openEdit} onWhatsapp={handleWhatsapp} onStatusToggle={handleToggleStatus} />
                                    ))}
                                    {inProgressTasks.length === 0 && <div className="text-center text-xs text-gray-400 italic py-4">Nenhuma tarefa em andamento</div>}
                                </div>
                            </div>

                            {/* DONE COL */}
                            <div className="flex-none md:flex-1 flex flex-col w-full md:min-w-[300px] bg-gray-100/50 dark:bg-[#1A1A1A] rounded-xl p-2 md:p-3 border border-transparent dark:border-gray-800">
                                <div className="mb-4 flex items-center justify-between px-1">
                                    <div className="flex items-center gap-2 text-green-500">
                                        <CheckCircle size={18} />
                                        <h3 className="font-bold text-gray-700 dark:text-gray-300 text-sm">Concluídas ({doneTasks.length})</h3>
                                    </div>
                                    <button className="text-gray-300 hover:text-green-500 transition-colors w-6 h-6 rounded-full border border-gray-200 dark:border-gray-700 flex items-center justify-center pointer-events-none opacity-50"><Plus size={14} /></button>
                                </div>
                                <div className="flex-1 md:overflow-y-auto space-y-2 custom-scrollbar pr-1 pb-4 md:pb-20">
                                    {doneTasks.map(task => (
                                        <TaskCard key={task.id} task={task} usersMap={usersMap} onDelete={handleDelete} onEdit={openEdit} onWhatsapp={handleWhatsapp} onStatusToggle={handleToggleStatus} isDoneStyle />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto p-2 sm:p-6 pb-20">
                        <div className="bg-white dark:bg-[#1A1A1A] rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 dark:bg-[#111] border-b border-gray-100 dark:border-gray-800">
                                    <tr>
                                        <th className="p-3 w-4"></th>
                                        <th className="p-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Tarefa</th>
                                        <th className="p-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Lead</th>
                                        <th className="p-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Prioridade</th>
                                        <th className="p-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Vencimento</th>
                                        <th className="p-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Responsável</th>
                                        <th className="p-3 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="dark:text-gray-200">
                                    {filteredTasks.length === 0 ? (
                                        <tr><td colSpan={7} className="p-10 text-center text-gray-400 italic">Nenhuma tarefa encontrada.</td></tr>
                                    ) : (
                                        filteredTasks.map(task => (
                                            <TaskRow key={task.id} task={task} usersMap={usersMap} onDelete={handleDelete} onEdit={openEdit} onStatusToggle={handleToggleStatus} />
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white dark:bg-[#1A1A1A] rounded-xl shadow-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto scrollbar-hide"
                        >
                            <div className="flex justify-between items-center mb-6 border-b border-gray-100 dark:border-gray-800 pb-2">
                                <h3 className="font-bold text-xl dark:text-white">{editingTask ? 'Editar Tarefa' : 'Nova Tarefa'}</h3>
                                <button onClick={() => setIsModalOpen(false)}><X size={20} className="text-gray-400 hover:text-black dark:hover:text-white" /></button>
                            </div>

                            <form onSubmit={handleSave} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Título</label>
                                    <input required className="w-full border border-gray-300 dark:border-gray-700 dark:bg-[#222] dark:text-white rounded p-2" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Prioridade</label>
                                        <select className="w-full border border-gray-300 dark:border-gray-700 dark:bg-[#222] dark:text-white rounded p-2" value={formData.priority} onChange={e => setFormData({ ...formData, priority: e.target.value as any })}>
                                            <option value="LOW">Baixa</option>
                                            <option value="MEDIUM">Média</option>
                                            <option value="HIGH">Alta</option>
                                            <option value="URGENT">Urgente</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Status</label>
                                        <select className="w-full border border-gray-300 dark:border-gray-700 dark:bg-[#222] dark:text-white rounded p-2" value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value as any })}>
                                            <option value="TODO">Pendente</option>
                                            <option value="IN_PROGRESS">Em Andamento</option>
                                            <option value="DONE">Concluído</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Atribuir Para</label>
                                    {canAssignOthers ? (
                                        <select className="w-full border border-gray-300 dark:border-gray-700 dark:bg-[#222] dark:text-white rounded p-2" value={formData.assignedTo} onChange={e => setFormData({ ...formData, assignedTo: e.target.value })}>
                                            <option value="">-- Selecione --</option>
                                            {Object.entries(usersMap).map(([id, name]) => (
                                                <option key={id} value={id}>{name}</option>
                                            ))}
                                        </select>
                                    ) : (
                                        <div className="w-full border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 rounded p-2 text-gray-500 dark:text-gray-400 text-sm italic">
                                            {user?.name || 'Você'} (Atribuição Automática)
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Vincular Lead (Opcional)</label>
                                    <select className="w-full border border-gray-300 dark:border-gray-700 dark:bg-[#222] dark:text-white rounded p-2" value={formData.leadId} onChange={e => setFormData({ ...formData, leadId: e.target.value })}>
                                        <option value="">-- Nenhum Lead --</option>
                                        {leads.map(lead => (
                                            <option key={lead.id} value={lead.id}>{lead.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Categoria</label>
                                    <select className="w-full border border-gray-300 dark:border-gray-700 dark:bg-[#222] dark:text-white rounded p-2" value={formData.categoryId} onChange={e => setFormData({ ...formData, categoryId: e.target.value })}>
                                        <option value="">-- Sem Categoria --</option>
                                        {categories.map(cat => (
                                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Vencimento (Data de Disparo)</label>
                                    <input
                                        type="datetime-local"
                                        className="w-full border border-gray-300 dark:border-gray-700 dark:bg-[#222] dark:text-white rounded p-2"
                                        value={formData.dueDate}
                                        onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                                    />
                                </div>

                                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-100 dark:border-green-800">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                id="wa_schedule"
                                                className="w-4 h-4 text-green-600 rounded"
                                                checked={formData.isWhatsappSchedule}
                                                onChange={e => setFormData({ ...formData, isWhatsappSchedule: e.target.checked })}
                                            />
                                            <label htmlFor="wa_schedule" className="font-bold text-green-800 dark:text-green-400 text-sm cursor-pointer flex items-center gap-1">
                                                Automação WhatsApp
                                            </label>
                                        </div>
                                    </div>

                                    {formData.isWhatsappSchedule && (
                                        <div className="space-y-4 mt-3 animate-in fade-in slide-in-from-top-2">
                                            <div className="bg-white/50 dark:bg-white/5 p-3 rounded-lg border border-green-100/50 dark:border-green-800/50">
                                                <label className="block text-[10px] font-black text-green-700 dark:text-green-400 uppercase mb-2">Conteúdo do Disparo</label>
                                                <textarea
                                                    className="w-full border border-green-200 dark:border-green-800 dark:bg-[#222] dark:text-white rounded-lg p-3 text-sm h-32 focus:border-green-500 outline-none transition-all"
                                                    value={formData.whatsappMessageBody}
                                                    onChange={e => setFormData({ ...formData, whatsappMessageBody: e.target.value })}
                                                    placeholder="Digite a mensagem personalizada..."
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold text-green-700 dark:text-green-400 uppercase mb-1">Imagem do Disparo</label>
                                                <div className="flex gap-2">
                                                    <input
                                                        className="flex-1 border border-green-200 dark:border-green-800 dark:bg-[#222] dark:text-white rounded-lg px-3 py-2 text-sm focus:border-green-500 outline-none"
                                                        placeholder="URL da imagem..."
                                                        value={formData.whatsappMediaUrl}
                                                        onChange={e => setFormData({ ...formData, whatsappMediaUrl: e.target.value })}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Descrição</label>
                                    <textarea className="w-full border border-gray-300 dark:border-gray-700 dark:bg-[#222] dark:text-white rounded p-2 h-24" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                                </div>

                                <div className="pt-4 flex justify-end gap-2">
                                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">Cancelar</button>
                                    <button type="submit" className="px-6 py-2 bg-wtech-black text-white font-bold rounded">Salvar Tarefa</button>
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
