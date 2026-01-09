import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { sendWhatsAppMessage, sendWhatsAppMedia } from '../../../lib/whatsapp';
import { X, Calendar, Plus, MessageCircle, Phone, Tag, CheckSquare, Clock, AlertCircle, Image as ImageIcon, Upload } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../context/AuthContext';
import { Lead, Task, TaskCategory } from '../../../types';

interface LeadTaskSidebarProps {
    lead: Lead;
    isOpen: boolean;
    onClose: () => void;
    onTaskCreated: (task: any) => void;
}

const LeadTaskSidebar = ({ lead, isOpen, onClose, onTaskCreated }: LeadTaskSidebarProps) => {
    const { user } = useAuth();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [categories, setCategories] = useState<TaskCategory[]>([]); // Categories State
    const [newTask, setNewTask] = useState<{
        title: string;
        description: string;
        dueDate: string;
        priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
        tags: string[];
        categoryId: string;
        isWhatsappSchedule: boolean;
        whatsappTemplateId: string;
        whatsappMessageBody: string;
        whatsappMediaUrl: string;
    }>({
        title: '',
        description: '',
        dueDate: '',
        priority: 'MEDIUM',
        tags: [],
        categoryId: '',
        isWhatsappSchedule: false,
        whatsappTemplateId: '',
        whatsappMessageBody: '',
        whatsappMediaUrl: ''
    });
    const [messageTemplates, setMessageTemplates] = useState<{id: string, title: string, content: string}[]>([]);
    const [newTag, setNewTag] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen && lead) {
            fetchTasks();
            fetchCategories();
            fetchTemplates();
        }
    }, [isOpen, lead]);

    const fetchTemplates = async () => {
        const { data } = await supabase.from('SITE_MessageTemplates').select('*').order('title');
        if (data) setMessageTemplates(data);
    };

    const fetchTasks = async () => {
        try {
            const { data, error } = await supabase
                .from('SITE_Tasks')
                .select('*, SITE_TaskCategories(name, color)')
                .eq('lead_id', lead.id)
                .order('due_date', { ascending: true });

            if (error) throw error;
            if (data) {
                // Map DB snake_case to CamelCase
                setTasks(data.map((t: any) => ({
                    ...t,
                    dueDate: t.due_date,
                    assignedTo: t.assigned_to,
                    createdBy: t.created_by,
                    createdAt: t.created_at,
                    leadId: t.lead_id,
                    category: t.SITE_TaskCategories
                })));
            }
        } catch (error) {
            console.error('Error fetching tasks', error);
        }
    };

    const fetchCategories = async () => {
        const { data } = await supabase.from('SITE_TaskCategories').select('*').order('name');
        if (data) setCategories(data);
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

            const { error: uploadError } = await supabase.storage.from('public').upload(filePath, file);

            if (uploadError) {
                alert('Erro no upload: ' + uploadError.message);
                return;
            }

            const { data } = supabase.storage.from('public').getPublicUrl(filePath);
            setNewTask(prev => ({ ...prev, whatsappMediaUrl: data.publicUrl }));
        } catch (err: any) {
            alert('Erro: ' + err.message);
        } finally {
            setIsUploading(false);
        }
    };

    const handleCreateTask = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            if (!newTask.title || !newTask.dueDate) {
                alert('Preencha título e data.');
                return;
            }

            const payload = {
                title: newTask.title,
                description: newTask.description,
                due_date: new Date(newTask.dueDate).toISOString(),
                priority: newTask.priority,
                status: 'TODO',
                assigned_to: user?.id, 
                created_by: user?.id,
                lead_id: lead.id,
                tags: newTask.tags,
                category_id: newTask.categoryId || null,
                is_whatsapp_schedule: newTask.isWhatsappSchedule,
                whatsapp_template_id: newTask.whatsappTemplateId || null,
                whatsapp_message_body: newTask.whatsappMessageBody || null,
                whatsapp_media_url: newTask.whatsappMediaUrl || null,
                whatsapp_status: newTask.isWhatsappSchedule ? 'PENDING' : 'PENDING'
            };

            const { data, error } = await supabase.from('SITE_Tasks').insert([payload]).select();

            if (error) throw error;

            if (data) {
                onTaskCreated(data[0]);
                fetchTasks(); // Refresh list
                setNewTask({
                    title: '',
                    description: '',
                    dueDate: '',
                    priority: 'MEDIUM',
                    tags: [],
                    categoryId: '',
                    isWhatsappSchedule: false,
                    whatsappTemplateId: '',
                    whatsappMessageBody: '',
                    whatsappMediaUrl: ''
                });
            }
        } catch (error: any) {
            console.error('Error creating task', error);
            alert('Erro ao criar tarefa: ' + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const [processingTaskIds, setProcessingTaskIds] = useState<Set<string>>(new Set());

    const toggleTaskStatus = async (task: Task) => {
        if (processingTaskIds.has(task.id)) return; // Prevent double click

        // Lock
        setProcessingTaskIds(prev => new Set(prev).add(task.id));

        const newStatus = task.status === 'DONE' ? 'TODO' : 'DONE';
        try {
            const { error } = await supabase.from('SITE_Tasks').update({ status: newStatus }).eq('id', task.id);
            if (error) throw error;

            // Automation: Send WhatsApp if completed
            if (newStatus === 'DONE' && lead.phone) {
                 const message = `Olá ${lead.name.split(' ')[0]}! Informamos que a atividade "${task.title}" foi concluída com sucesso! ✅`;
                 await sendWhatsAppMessage(lead.phone, message);
            }

            // Refresh local state
            setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
        } catch (e) {
            console.error(e);
        } finally {
            // Unlock
            setProcessingTaskIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(task.id);
                return newSet;
            });
        }
    };

    const addTag = () => {
        if (newTag && !newTask.tags.includes(newTag)) {
            setNewTask(prev => ({ ...prev, tags: [...prev.tags, newTag] }));
            setNewTag('');
        }
    };

    const removeTag = (tag: string) => {
        setNewTask(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }));
    };

    const openWhatsApp = () => {
        const phone = lead.phone.replace(/\D/g, '');
        window.open(`https://wa.me/${phone}`, '_blank');
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[60]"
                    />

                    {/* Sidebar */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-[70] flex flex-col border-l border-gray-100"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50">
                            <div>
                                <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                                    <Clock className="text-wtech-gold" />
                                    Tarefas & Lembretes
                                </h3>
                                <p className="text-xs text-gray-500 font-medium">{lead.name}</p>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={openWhatsApp}
                                    className="p-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-full transition-colors"
                                    title="WhatsApp Rápido"
                                >
                                    <MessageCircle size={18} />
                                </button>
                                <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full text-gray-500">
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-8">
                            
                            {/* Create New Task Form */}
                            <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-shadow">
                                <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                                    <Plus size={14} className="bg-wtech-black text-white rounded-full p-0.5" />
                                    Novo Lembrete
                                </h4>
                                <form onSubmit={handleCreateTask} className="space-y-3">
                                    <div>
                                        <input
                                            placeholder="O que precisa ser feito?"
                                            className="w-full text-sm border-b border-gray-200 py-2 focus:border-wtech-gold outline-none font-medium text-gray-800 placeholder:text-gray-400"
                                            value={newTask.title}
                                            onChange={e => setNewTask({ ...newTask, title: e.target.value })}
                                        />
                                    </div>
                                    <div className="flex gap-3">
                                        <div className="flex-1">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase">Data/Hora</label>
                                            <input
                                                type="datetime-local"
                                                className="w-full text-xs bg-gray-50 border border-gray-200 rounded p-2 focus:border-wtech-gold outline-none"
                                                value={newTask.dueDate}
                                                onChange={e => setNewTask({ ...newTask, dueDate: e.target.value })}
                                            />
                                        </div>
                                        <div className="w-1/3">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase">Prioridade</label>
                                            <select
                                                className="w-full text-xs bg-gray-50 border border-gray-200 rounded p-2 focus:border-wtech-gold outline-none"
                                                value={newTask.priority}
                                                onChange={e => setNewTask({ ...newTask, priority: e.target.value as any })}
                                            >
                                                <option value="LOW">Baixa</option>
                                                <option value="MEDIUM">Média</option>
                                                <option value="HIGH">Alta</option>
                                                <option value="URGENT">Urgente</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase">Categoria</label>
                                        <select
                                            className="w-full text-xs bg-gray-50 border border-gray-200 rounded p-2 focus:border-wtech-gold outline-none"
                                            value={newTask.categoryId}
                                            onChange={e => setNewTask({ ...newTask, categoryId: e.target.value })}
                                        >
                                            <option value="">-- Sem Categoria --</option>
                                            {categories.map(cat => (
                                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* WhatsApp Automation Section */}
                                    <div className="bg-green-50 p-4 rounded-xl border border-green-100/50 my-2">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                                <input 
                                                    type="checkbox" 
                                                    id="wa_schedule_sidebar"
                                                    className="w-4 h-4 text-green-600 rounded cursor-pointer"
                                                    checked={newTask.isWhatsappSchedule}
                                                    onChange={e => setNewTask({...newTask, isWhatsappSchedule: e.target.checked})} 
                                                />
                                                <label htmlFor="wa_schedule_sidebar" className="font-bold text-green-800 text-xs cursor-pointer">
                                                    Disparo WhatsApp
                                                </label>
                                            </div>
                                            {newTask.isWhatsappSchedule && (
                                                <div className="animate-pulse bg-green-500 w-1.5 h-1.5 rounded-full shadow-[0_0_8px_green]" />
                                            )}
                                        </div>

                                        {newTask.isWhatsappSchedule && (
                                            <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                                                <div className="flex gap-1.5 p-1 bg-white/50 rounded-lg border border-green-100">
                                                    <button 
                                                        type="button"
                                                        onClick={() => setNewTask({...newTask, whatsappTemplateId: '', whatsappMessageBody: ''})} 
                                                        className={`flex-1 py-1 rounded-[6px] text-[9px] font-black uppercase tracking-widest transition-all ${!newTask.whatsappTemplateId ? 'bg-green-600 text-white shadow-sm' : 'text-gray-400 hover:text-green-600'}`}
                                                    >
                                                        Manual
                                                    </button>
                                                    <div className="flex-1 relative">
                                                        <select 
                                                            className={`w-full py-1 pl-1.5 pr-4 rounded-[6px] text-[9px] font-black uppercase tracking-widest outline-none appearance-none transition-all ${newTask.whatsappTemplateId ? 'bg-green-600 text-white shadow-sm' : 'text-gray-400 hover:text-green-600'}`}
                                                            value={newTask.whatsappTemplateId}
                                                            onChange={e => {
                                                                const tmpl = messageTemplates.find(t => t.id === e.target.value);
                                                                setNewTask({
                                                                    ...newTask, 
                                                                    whatsappTemplateId: e.target.value,
                                                                    whatsappMessageBody: tmpl ? tmpl.content : ''
                                                                });
                                                            }}
                                                        >
                                                            <option value="" className="text-gray-800">Modelos</option>
                                                            {messageTemplates.map(t => (
                                                                <option key={t.id} value={t.id} className="text-gray-800">{t.title}</option>
                                                            ))}
                                                        </select>
                                                        <Plus size={8} className={`absolute right-1.5 top-1.5 pointer-events-none ${newTask.whatsappTemplateId ? 'text-white' : 'text-gray-400'}`} />
                                                    </div>
                                                </div>

                                                <textarea 
                                                    className="w-full bg-white border border-green-100 rounded-lg p-2 text-xs h-20 focus:border-green-400 outline-none transition-all placeholder:text-gray-300"
                                                    value={newTask.whatsappMessageBody}
                                                    onChange={e => setNewTask({...newTask, whatsappMessageBody: e.target.value})}
                                                    placeholder="Sua mensagem aqui..."
                                                />

                                                <div className="flex gap-2">
                                                    <div className="relative flex-1">
                                                        <ImageIcon size={10} className="absolute left-2 top-2.5 text-green-400" />
                                                        <input 
                                                            className="w-full bg-white border border-green-100 rounded-lg pl-6 pr-2 py-1.5 text-[10px] focus:border-green-400 outline-none transition-all" 
                                                            placeholder="URL da imagem (opcional)"
                                                            value={newTask.whatsappMediaUrl}
                                                            onChange={e => setNewTask({...newTask, whatsappMediaUrl: e.target.value})}
                                                        />
                                                    </div>
                                                    <label className="flex items-center justify-center bg-white border border-green-100 rounded-lg px-2 py-1.5 cursor-pointer hover:bg-green-50 transition-colors" title="Fazer Upload">
                                                        <Upload size={10} className="text-green-600" />
                                                        <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} disabled={isUploading} />
                                                    </label>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <textarea
                                        placeholder="Detalhes adicionais..."
                                        rows={2}
                                        className="w-full text-xs bg-gray-50 border border-gray-200 rounded p-2 focus:border-wtech-gold outline-none resize-none"
                                        value={newTask.description}
                                        onChange={e => setNewTask({ ...newTask, description: e.target.value })}
                                    />

                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="w-full py-2 bg-wtech-black text-white text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
                                    >
                                        {isLoading ? 'Agendando...' : 'Agendar Tarefa'}
                                    </button>
                                </form>
                            </div>

                            {/* Existing Tasks List */}
                            <div className="space-y-4">
                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Histórico de Tarefas</h4>
                                {tasks.length === 0 ? (
                                    <div className="text-center py-8 text-gray-400 text-sm italic">
                                        Nenhuma tarefa para este lead.
                                    </div>
                                ) : (
                                    tasks.map(task => (
                                        <div 
                                            key={task.id} 
                                            className={`p-4 rounded-lg border ${task.status === 'DONE' ? 'bg-gray-50 border-gray-100 opacity-60' : 'bg-white shadow-sm hover:shadow-md'} transition-all relative overflow-hidden`}
                                            style={task.category?.color ? { 
                                                borderColor: task.category.color,
                                                borderLeftWidth: '5px',
                                                boxShadow: `0 0 8px -2px ${task.category.color}40`
                                            } : { borderColor: '#e5e7eb', borderLeftWidth: '5px', borderLeftColor: 'transparent' }}
                                        >
                                            <div className="flex items-start gap-3">
                                                <button
                                                    onClick={() => toggleTaskStatus(task)}
                                                    className={`mt-1 flex-shrink-0 w-5 h-5 rounded border ${task.status === 'DONE' ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 hover:border-wtech-gold'} flex items-center justify-center transition-colors`}
                                                >
                                                    {task.status === 'DONE' && <CheckSquare size={14} />}
                                                </button>
                                                <div className="flex-1">
                                                    <p className={`text-sm font-bold text-gray-800 ${task.status === 'DONE' ? 'line-through text-gray-500' : ''}`}>
                                                        {task.title}
                                                    </p>
                                                    
                                                    {/* Overdue Indicator if needed */}
                                                    {new Date(task.dueDate!).getTime() < Date.now() && task.status !== 'DONE' && (
                                                         <div className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-bl-lg" title="Atrasado" />
                                                    )}

                                                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{task.description}</p>
                                                    
                                                    {task.category && (
                                                        <div className="mt-2">
                                                            <span 
                                                                className="text-[9px] px-1.5 py-0.5 rounded border font-bold uppercase"
                                                                style={{ backgroundColor: task.category.color + '20', borderColor: task.category.color, color: '#333' }}
                                                            >
                                                                {task.category.name}
                                                            </span>
                                                        </div>
                                                    )}

                                                    <div className="flex flex-wrap items-center gap-2 mt-3">
                                                        <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${task.priority === 'URGENT' ? 'bg-red-100 text-red-700' : task.priority === 'HIGH' ? 'bg-orange-100 text-orange-700' : 'bg-blue-50 text-blue-600'}`}>
                                                            {task.priority === 'URGENT' ? 'Urgente' : task.priority === 'HIGH' ? 'Alta' : task.priority === 'MEDIUM' ? 'Média' : 'Baixa'}
                                                        </span>
                                                        <div className="flex items-center gap-1 text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                                                            <Calendar size={10} />
                                                            {new Date(task.dueDate!).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                                                        </div>
                                                    </div>

                                                    {task.tags && task.tags.length > 0 && (
                                                        <div className="flex flex-wrap gap-1 mt-2">
                                                            {task.tags.map((tag, i) => (
                                                                <span key={i} className="text-[9px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded border border-gray-200">
                                                                    #{tag}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default LeadTaskSidebar;
