import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../context/AuthContext';
import { Task, TaskCategory } from '../../../types';
import { 
    Plus, Clock, CheckCircle2, AlertTriangle, Trash2, User, Search, 
    Filter, X, Calendar, Flag, LayoutGrid, List, Edit2, Tag, 
    Image as ImageIcon, Upload, Bot, MoreVertical, GripVertical
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Types & Interfaces ---

interface TaskCardProps {
    task: Task;
    usersMap: any;
    onDelete: (id: string) => void;
    onEdit: (task: Task) => void;
    onStatusToggle: (task: Task) => void;
    onWhatsapp: (task: Task) => void;
}

// --- Components ---

const PriorityBadge = ({ priority }: { priority: string }) => {
    const config = {
        'URGENT': { color: 'bg-red-500', text: 'URGENTE', icon: AlertTriangle },
        'HIGH': { color: 'bg-orange-500', text: 'ALTA', icon: Flag },
        'MEDIUM': { color: 'bg-blue-500', text: 'MÉDIA', icon: Clock },
        'LOW': { color: 'bg-gray-400', text: 'BAIXA', icon: CheckCircle2 }
    }[priority] || { color: 'bg-gray-400', text: 'BAIXA', icon: CheckCircle2 };

    const Icon = config.icon;

    return (
        <span className={`${config.color}/10 text-${config.color.replace('bg-', '')} border border-${config.color.replace('bg-', '')}/20 px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider flex items-center gap-1`}>
            <Icon size={10} strokeWidth={3} /> {config.text}
        </span>
    );
};

const TaskCard: React.FC<TaskCardProps> = ({ task, usersMap, onDelete, onEdit, onStatusToggle, onWhatsapp }) => {
    const isDone = task.status === 'DONE';
    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !isDone;

    return (
        <motion.div
            layout
            onClick={() => onEdit(task)}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={`
                group relative bg-white dark:bg-black/40 backdrop-blur-xl
                border ${isDone ? 'border-green-500/20' : 'border-gray-200 dark:border-white/10'}
                rounded-2xl p-4 shadow-sm hover:shadow-xl hover:shadow-blue-500/5 
                transition-all duration-300 w-full mb-3 cursor-pointer
            `}
        >
            {/* Status Indicator Line */}
            <div className={`
                absolute left-0 top-4 bottom-4 w-1 rounded-r-full
                ${isDone ? 'bg-green-500' : isOverdue ? 'bg-red-500' : 'bg-blue-500'}
            `}></div>

            <div className="pl-3 flex flex-col gap-3">
                {/* Header */}
                <div className="flex justify-between items-start">
                    <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                            {task.category?.name || 'Geral'}
                            {task.dueDate && (
                                <span className={`flex items-center gap-1 ml-2 ${isOverdue ? 'text-red-500' : 'text-gray-400'}`}>
                                    <Calendar size={10} />
                                    {new Date(task.dueDate).toLocaleDateString().slice(0, 5)}
                                </span>
                            )}
                        </span>
                        <h4 className={`text-sm font-bold text-gray-800 dark:text-gray-100 ${isDone ? 'line-through text-gray-400' : ''}`}>
                            {task.title}
                        </h4>
                    </div>
                </div>

                {/* Body/Description Preview */}
                {task.leadName && (
                    <div className="bg-gray-50 dark:bg-white/5 p-2 rounded-lg border border-gray-100 dark:border-white/5 flex items-center gap-2">
                         <User size={12} className="text-gray-400" />
                         <span className="text-xs font-medium text-gray-600 dark:text-gray-300 truncate">{task.leadName}</span>
                    </div>
                )}

                {/* Footer Controls */}
                <div className="flex items-center justify-between mt-1 pt-2 border-t border-gray-100 dark:border-white/5">
                    <div className="flex items-center gap-2">
                        {task.assignedTo && (
                             <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-[9px] font-bold text-white shadow-sm" title={usersMap[task.assignedTo]}>
                                 {usersMap[task.assignedTo]?.slice(0, 2).toUpperCase()}
                             </div>
                        )}
                        <PriorityBadge priority={task.priority} />
                        {(task as any).isWhatsappSchedule && <Bot size={14} className="text-green-500 animate-pulse" />}
                    </div>

                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button onClick={(e) => { e.stopPropagation(); onStatusToggle(task); }} className={`p-1.5 rounded-lg ${isDone ? 'text-yellow-500 bg-yellow-500/10' : 'text-green-500 bg-green-500/10'} hover:scale-110 transition-transform`}>
                            <CheckCircle2 size={14} />
                         </button>
                         {task.leadPhone && (
                            <button onClick={(e) => { e.stopPropagation(); onWhatsapp(task); }} className="p-1.5 rounded-lg text-green-600 bg-green-100 hover:bg-green-200 transition-colors">
                                <Bot size={14} />
                            </button>
                         )}
                         <button onClick={(e) => { e.stopPropagation(); onDelete(task.id); }} className="p-1.5 rounded-lg text-red-500 bg-red-500/10 hover:bg-red-500/20 transition-colors">
                            <Trash2 size={14} />
                         </button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

// --- Main View ---

const TaskManagerView: React.FC<{ permissions?: any }> = ({ permissions }) => {
    const { user } = useAuth();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [leads, setLeads] = useState<any[]>([]);
    const [usersMap, setUsersMap] = useState<Record<string, string>>({});
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [filterStatus, setFilterStatus] = useState('ALL');
    
    // Simplifed State for Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [formData, setFormData] = useState({
        title: '', description: '', assignedTo: '', priority: 'MEDIUM', 
        dueDate: '', status: 'TODO', leadId: '', 
        isWhatsappSchedule: false, whatsappMessageBody: ''
    });

    useEffect(() => {
        if(user) {
            Promise.all([
                fetchUsers(),
                fetchTasks(),
                fetchLeads()
            ]);
        }
    }, [user]);

    const fetchUsers = async () => {
        const { data } = await supabase.from('SITE_Users').select('id, name');
        if(data) {
            const map: any = {};
            data.forEach((u: any) => map[u.id] = u.name);
            setUsersMap(map);
        }
    };

    const fetchLeads = async () => {
        const { data } = await supabase.from('SITE_Leads').select('id, name').order('name');
        if(data) setLeads(data);
    };

    const fetchTasks = async () => {
        const { data } = await supabase.from('SITE_Tasks').select('*, SITE_Leads(name, phone)').order('created_at', { ascending: false });
        if(data) {
            setTasks(data.map((t: any) => ({
                ...t,
                leadName: t.SITE_Leads?.name,
                leadPhone: t.SITE_Leads?.phone
            })));
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const payload = {
            title: formData.title,
            description: formData.description,
            assigned_to: formData.assignedTo || user?.id,
            priority: formData.priority,
            due_date: formData.dueDate || null,
            status: formData.status,
            lead_id: formData.leadId || null,
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
        if(confirm('Excluir?')) {
            setTasks(prev => prev.filter(t => t.id !== id));
            await supabase.from('SITE_Tasks').delete().eq('id', id);
        }
    };

    const handleToggleStatus = async (task: Task) => {
        const newStatus = task.status === 'DONE' ? 'TODO' : 'DONE';
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
        await supabase.from('SITE_Tasks').update({ status: newStatus }).eq('id', task.id);
    };

    const filteredTasks = tasks.filter(t => {
         if (filterStatus !== 'ALL' && t.status !== filterStatus) return false;
         return true;
    });

    const todoTasks = filteredTasks.filter(t => t.status !== 'DONE'); // Show pending and in-progress here
    const doneTasks = filteredTasks.filter(t => t.status === 'DONE');

    return (
        <div className="h-full flex flex-col bg-gray-50 dark:bg-[#0A0A0A] rounded-3xl overflow-hidden shadow-2xl border border-gray-100 dark:border-white/5 font-sans">
             {/* Header */}
             <div className="p-6 bg-white dark:bg-black/40 backdrop-blur-md border-b border-gray-100 dark:border-white/5 flex justify-between items-center z-10 relative">
                <div>
                     <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                        <LayoutGrid className="text-blue-500" /> Gerenciador de Tarefas
                     </h2>
                     <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Produtividade & Foco</p>
                </div>
                <div className="flex gap-3">
                     <button 
                        onClick={() => { setEditingTask(null); setFormData({ title: '', description: '', assignedTo: '', priority: 'MEDIUM', dueDate: '', status: 'TODO', leadId: '', isWhatsappSchedule: false, whatsappMessageBody: '' }); setIsModalOpen(true); }}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-blue-500/30 transition-all flex items-center gap-2 transform hover:scale-105 active:scale-95"
                     >
                        <Plus size={18} strokeWidth={3} /> Nova Tarefa
                     </button>
                </div>
             </div>

             {/* Kanban Board */}
             <div className="flex-1 overflow-x-auto overflow-y-hidden p-6">
                <div className="flex h-full gap-6 min-w-full">
                    
                    {/* TODO Column */}
                    <div className="flex-1 flex flex-col bg-gray-100/50 dark:bg-white/5 rounded-2xl border border-dashed border-gray-200 dark:border-white/10 p-3">
                        <div className="flex items-center justify-between mb-4 p-2">
                             <h3 className="text-sm font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-blue-500"></span> Pendente <span className="bg-gray-200 dark:bg-white/10 px-2 rounded text-xs py-0.5">{todoTasks.length}</span>
                             </h3>
                        </div>
                        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
                             {todoTasks.map(task => (
                                 <TaskCard 
                                    key={task.id} 
                                    task={task} 
                                    usersMap={usersMap} 
                                    onDelete={handleDelete} 
                                    onEdit={(t) => { 
                                        setEditingTask(t); 
                                        setFormData({ 
                                            ...t, 
                                            leadId: (t as any).lead_id || (t as any).leadId || '' 
                                        } as any); 
                                        setIsModalOpen(true); 
                                    }} 
                                    onStatusToggle={handleToggleStatus} 
                                    onWhatsapp={() => {}} 
                                />
                             ))}
                        </div>
                    </div>

                    {/* Done Column */}
                     <div className="flex-1 flex flex-col bg-gray-100/50 dark:bg-white/5 rounded-2xl border border-dashed border-gray-200 dark:border-white/10 p-3">
                         <div className="flex items-center justify-between mb-4 p-2">
                             <h3 className="text-sm font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-green-500"></span> Concluído <span className="bg-gray-200 dark:bg-white/10 px-2 rounded text-xs py-0.5">{doneTasks.length}</span>
                             </h3>
                        </div>
                        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
                             {doneTasks.map(task => (
                                 <TaskCard 
                                    key={task.id} 
                                    task={task} 
                                    usersMap={usersMap} 
                                    onDelete={handleDelete} 
                                    onEdit={(t) => { 
                                        setEditingTask(t); 
                                        setFormData({ 
                                            ...t, 
                                            leadId: (t as any).lead_id || (t as any).leadId || '' 
                                        } as any); 
                                        setIsModalOpen(true); 
                                    }} 
                                    onStatusToggle={handleToggleStatus} 
                                    onWhatsapp={() => {}} 
                                />
                             ))}
                        </div>
                    </div>

                </div>
             </div>

             {/* Simple Modal */}
             <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="bg-white dark:bg-[#151515] w-full max-w-lg rounded-2xl shadow-2xl p-6 border border-white/10">
                            <h3 className="text-xl font-bold dark:text-white mb-4">{editingTask ? 'Editar Tarefa' : 'Nova Tarefa'}</h3>
                            <form onSubmit={handleSave} className="space-y-4">
                                <input required placeholder="Título da Tarefa" className="w-full bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-xl p-3 text-sm focus:border-blue-500 outline-none" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
                                <div className="grid grid-cols-2 gap-3">
                                     <select className="w-full bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-xl p-3 text-sm outline-none" value={formData.priority} onChange={e => setFormData({ ...formData, priority: e.target.value as any })}>
                                        <option value="LOW">Baixa</option>
                                        <option value="MEDIUM">Média</option>
                                        <option value="HIGH">Alta</option>
                                        <option value="URGENT">Urgente</option>
                                     </select>
                                     <select className="w-full bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-xl p-3 text-sm outline-none" value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value as any })}>
                                        <option value="TODO">Pendente</option>
                                        <option value="DONE">Concluído</option>
                                     </select>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <input type="datetime-local" className="w-full bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-xl p-3 text-sm outline-none" value={formData.dueDate} onChange={e => setFormData({ ...formData, dueDate: e.target.value })} />
                                    <select className="w-full bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-xl p-3 text-sm outline-none" value={formData.leadId} onChange={e => setFormData({ ...formData, leadId: e.target.value })}>
                                        <option value="">Sem Lead</option>
                                        {leads.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                    </select>
                                </div>
                                <textarea placeholder="Descrição (opcional)" className="w-full bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-xl p-3 text-sm h-24 outline-none" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                                
                                <div className="flex justify-end gap-3 pt-2">
                                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 font-bold text-sm">Cancelar</button>
                                    <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-500/20">Salvar</button>
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
