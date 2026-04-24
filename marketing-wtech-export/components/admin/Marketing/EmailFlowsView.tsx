import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import {
    GitBranch, Plus, Play, Pause, Trash2, Edit3, Copy, ArrowDown,
    Mail, Clock, Split, LogOut, ChevronRight, ChevronDown, X, Save,
    Zap, Users, CheckCircle, TrendingUp, AlertCircle, Inbox, BarChart2
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';

// ─── Types ───────────────────────────────────────────────────────────────────
type FlowStatus = 'Active' | 'Paused' | 'Draft';
type TriggerType = 'NovoCadastro' | 'Inatividade' | 'CompraRecente' | 'CliqueLinkEspecifico' | 'Tag' | 'Segmento' | 'Manual';
type StepType = 'Email' | 'Delay' | 'Condition' | 'Exit';

interface FlowStep {
    id?: string;
    step_order: number;
    type: StepType;
    config: Record<string, any>;
}

interface EmailFlow {
    id: string;
    name: string;
    description?: string;
    trigger_type: TriggerType;
    trigger_config: Record<string, any>;
    exit_conditions: any[];
    status: FlowStatus;
    tags: string[];
    stats: {
        enrolled: number;
        active: number;
        completed: number;
        exited: number;
        open_rate: number;
        click_rate: number;
    };
    created_at: string;
    steps?: FlowStep[];
}

// ─── Constants ───────────────────────────────────────────────────────────────
const TRIGGER_LABELS: Record<TriggerType, string> = {
    NovoCadastro: 'Novo Cadastro',
    Inatividade: 'Inatividade',
    CompraRecente: 'Compra Recente',
    CliqueLinkEspecifico: 'Clique em Link',
    Tag: 'Tag Específica',
    Segmento: 'Segmento',
    Manual: 'Manual',
};

const TRIGGER_COLORS: Record<TriggerType, string> = {
    NovoCadastro: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    Inatividade: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    CompraRecente: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    CliqueLinkEspecifico: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    Tag: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    Segmento: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
    Manual: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
};

const FLOW_TEMPLATES = [
    {
        name: 'Welcome Series',
        description: 'Sequência de boas-vindas para novos cadastros',
        trigger_type: 'NovoCadastro' as TriggerType,
        steps: [
            { step_order: 1, type: 'Email' as StepType, config: { subject: 'Bem-vindo! 🎉', body: 'Olá {nome}, seja bem-vindo! Estamos felizes em tê-lo conosco.' } },
            { step_order: 2, type: 'Delay' as StepType, config: { value: 1, unit: 'days' } },
            { step_order: 3, type: 'Email' as StepType, config: { subject: 'Como aproveitar ao máximo', body: 'Aqui estão os próximos passos para você começar...' } },
            { step_order: 4, type: 'Delay' as StepType, config: { value: 2, unit: 'days' } },
            { step_order: 5, type: 'Email' as StepType, config: { subject: 'Oferta especial de boas-vindas 🎁', body: 'Como presente de boas-vindas, preparamos algo especial para você...' } },
        ]
    },
    {
        name: 'Nutrição Educativa',
        description: 'Drip de conteúdo educativo por 7 dias',
        trigger_type: 'NovoCadastro' as TriggerType,
        steps: [
            { step_order: 1, type: 'Email' as StepType, config: { subject: 'Dia 1: Introdução ao tema', body: 'Hoje vamos começar com os fundamentos...' } },
            { step_order: 2, type: 'Delay' as StepType, config: { value: 1, unit: 'days' } },
            { step_order: 3, type: 'Email' as StepType, config: { subject: 'Dia 2: Aprofundando o conhecimento', body: 'Agora que você já conhece o básico...' } },
            { step_order: 4, type: 'Delay' as StepType, config: { value: 1, unit: 'days' } },
            { step_order: 5, type: 'Email' as StepType, config: { subject: 'Dia 3: Casos práticos', body: 'Veja como nossos alunos aplicaram isso...' } },
        ]
    },
    {
        name: 'Re-engajamento',
        description: 'Reativa leads inativos há 30+ dias',
        trigger_type: 'Inatividade' as TriggerType,
        steps: [
            { step_order: 1, type: 'Email' as StepType, config: { subject: 'Sentimos sua falta, {nome}! 💙', body: 'Faz um tempo que não nos falamos. Que tal retomar?' } },
            { step_order: 2, type: 'Delay' as StepType, config: { value: 3, unit: 'days' } },
            { step_order: 3, type: 'Email' as StepType, config: { subject: 'Última chance: oferta especial para você voltar', body: 'Preparamos uma oferta exclusiva só para quem estava aqui antes...' } },
            { step_order: 4, type: 'Exit' as StepType, config: { reason: 'Sem resposta após re-engajamento' } },
        ]
    },
    {
        name: 'Pós-Compra',
        description: 'Fluxo de follow-up após compra',
        trigger_type: 'CompraRecente' as TriggerType,
        steps: [
            { step_order: 1, type: 'Email' as StepType, config: { subject: 'Compra confirmada! ✅', body: 'Seu pedido foi recebido e está sendo processado...' } },
            { step_order: 2, type: 'Delay' as StepType, config: { value: 7, unit: 'days' } },
            { step_order: 3, type: 'Email' as StepType, config: { subject: 'Como está sua experiência?', body: 'Gostaríamos de saber o que você achou...' } },
        ]
    },
];

// ─── Step Card Component ──────────────────────────────────────────────────────
const StepCard = ({ step, index, onEdit, onDelete, isLast }: {
    step: FlowStep;
    index: number;
    onEdit: (s: FlowStep) => void;
    onDelete: (i: number) => void;
    isLast: boolean;
    key?: React.Key;
}) => {
    const icons: Record<StepType, React.ReactNode> = {
        Email: <Mail size={16} />,
        Delay: <Clock size={16} />,
        Condition: <Split size={16} />,
        Exit: <LogOut size={16} />,
    };
    const colors: Record<StepType, string> = {
        Email: 'bg-blue-500',
        Delay: 'bg-amber-500',
        Condition: 'bg-purple-500',
        Exit: 'bg-red-500',
    };
    const labels: Record<StepType, string> = {
        Email: 'Enviar Email',
        Delay: 'Aguardar',
        Condition: 'Condição',
        Exit: 'Saída do Fluxo',
    };

    const getDescription = () => {
        if (step.type === 'Email') return step.config.subject || 'Sem assunto';
        if (step.type === 'Delay') return `${step.config.value} ${step.config.unit === 'days' ? 'dia(s)' : 'hora(s)'}`;
        if (step.type === 'Condition') return step.config.condition_type || 'Definir condição';
        if (step.type === 'Exit') return step.config.reason || 'Saída automática';
        return '';
    };

    return (
        <div className="flex flex-col items-center">
            <div className="group relative w-full max-w-md bg-white dark:bg-[#222] border border-gray-100 dark:border-gray-700 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white flex-shrink-0 ${colors[step.type]}`}>
                        {icons[step.type]}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-gray-900 dark:text-white">{labels[step.type]}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{getDescription()}</p>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => onEdit(step)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-[#333] rounded-lg text-gray-400 hover:text-blue-500 transition-colors">
                            <Edit3 size={14} />
                        </button>
                        <button onClick={() => onDelete(index)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-[#333] rounded-lg text-gray-400 hover:text-red-500 transition-colors">
                            <Trash2 size={14} />
                        </button>
                    </div>
                </div>
            </div>
            {!isLast && (
                <div className="flex flex-col items-center my-1">
                    <div className="w-0.5 h-4 bg-gray-200 dark:bg-gray-700" />
                    <ArrowDown size={14} className="text-gray-300 dark:text-gray-600" />
                </div>
            )}
        </div>
    );
};

// ─── Step Editor Modal ────────────────────────────────────────────────────────
const StepEditorModal = ({ step, onSave, onClose }: {
    step: FlowStep;
    onSave: (s: FlowStep) => void;
    onClose: () => void;
}) => {
    const [config, setConfig] = useState<Record<string, any>>(step.config);

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#1A1A1A] rounded-3xl shadow-2xl w-full max-w-lg border border-gray-100 dark:border-gray-800">
                <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800">
                    <h3 className="font-black text-lg text-gray-900 dark:text-white">
                        Editar {step.type === 'Email' ? 'Email' : step.type === 'Delay' ? 'Delay' : step.type === 'Condition' ? 'Condição' : 'Saída'}
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-[#333] rounded-xl transition-colors">
                        <X size={18} />
                    </button>
                </div>
                <div className="p-6 space-y-4">
                    {step.type === 'Email' && (
                        <>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Assunto</label>
                                <input
                                    type="text"
                                    value={config.subject || ''}
                                    onChange={e => setConfig({ ...config, subject: e.target.value })}
                                    placeholder="Ex: Bem-vindo, {nome}! 🎉"
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#111] text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Preview</label>
                                <input
                                    type="text"
                                    value={config.preview_text || ''}
                                    onChange={e => setConfig({ ...config, preview_text: e.target.value })}
                                    placeholder="Texto de preview (opcional)"
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#111] text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Conteúdo</label>
                                <textarea
                                    rows={6}
                                    value={config.body || ''}
                                    onChange={e => setConfig({ ...config, body: e.target.value })}
                                    placeholder="Conteúdo do email... Use {nome}, {produto}, {data} como variáveis dinâmicas."
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#111] text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white resize-none"
                                />
                            </div>
                            <p className="text-xs text-gray-400">💡 Variáveis: <span className="font-mono bg-gray-100 dark:bg-[#333] px-1 rounded">{'{nome}'}</span>, <span className="font-mono bg-gray-100 dark:bg-[#333] px-1 rounded">{'{email}'}</span>, <span className="font-mono bg-gray-100 dark:bg-[#333] px-1 rounded">{'{produto}'}</span></p>
                        </>
                    )}
                    {step.type === 'Delay' && (
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Quantidade</label>
                                <input
                                    type="number"
                                    min={1}
                                    value={config.value || 1}
                                    onChange={e => setConfig({ ...config, value: parseInt(e.target.value) })}
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#111] text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                                />
                            </div>
                            <div className="flex-1">
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Unidade</label>
                                <select
                                    value={config.unit || 'days'}
                                    onChange={e => setConfig({ ...config, unit: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#111] text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                                >
                                    <option value="hours">Horas</option>
                                    <option value="days">Dias</option>
                                </select>
                            </div>
                        </div>
                    )}
                    {step.type === 'Condition' && (
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Condição</label>
                            <select
                                value={config.condition_type || ''}
                                onChange={e => setConfig({ ...config, condition_type: e.target.value })}
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#111] text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                            >
                                <option value="">Selecionar...</option>
                                <option value="opened_email">Abriu o email anterior</option>
                                <option value="clicked_link">Clicou em link</option>
                                <option value="has_tag">Possui tag específica</option>
                                <option value="purchased">Realizou compra</option>
                            </select>
                        </div>
                    )}
                    {step.type === 'Exit' && (
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Motivo de Saída</label>
                            <input
                                type="text"
                                value={config.reason || ''}
                                onChange={e => setConfig({ ...config, reason: e.target.value })}
                                placeholder="Ex: Converteu em compra, Descadastrou..."
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#111] text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                            />
                        </div>
                    )}
                </div>
                <div className="flex gap-3 p-6 border-t border-gray-100 dark:border-gray-800">
                    <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#333] transition-colors">Cancelar</button>
                    <button onClick={() => { onSave({ ...step, config }); onClose(); }} className="flex-1 px-4 py-2.5 rounded-xl bg-black dark:bg-white text-white dark:text-black text-sm font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                        <Save size={14} /> Salvar
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─── Flow Editor ──────────────────────────────────────────────────────────────
const FlowEditor = ({ flow, onBack, onSaved }: { flow: Partial<EmailFlow> | null; onBack: () => void; onSaved: () => void }) => {
    const { user } = useAuth();
    const [name, setName] = useState(flow?.name || '');
    const [description, setDescription] = useState(flow?.description || '');
    const [triggerType, setTriggerType] = useState<TriggerType>(flow?.trigger_type || 'NovoCadastro');
    const [triggerConfig, setTriggerConfig] = useState(flow?.trigger_config || {});
    const [steps, setSteps] = useState<FlowStep[]>(flow?.steps || []);
    const [editingStep, setEditingStep] = useState<FlowStep | null>(null);
    const [saving, setSaving] = useState(false);

    const addStep = (type: StepType) => {
        const newOrder = steps.length + 1;
        const defaults: Record<StepType, Record<string, any>> = {
            Email: { subject: '', body: '' },
            Delay: { value: 1, unit: 'days' },
            Condition: { condition_type: '' },
            Exit: { reason: '' },
        };
        setSteps([...steps, { step_order: newOrder, type, config: defaults[type] }]);
    };

    const removeStep = (index: number) => {
        const updated = steps.filter((_, i) => i !== index).map((s, i) => ({ ...s, step_order: i + 1 }));
        setSteps(updated);
    };

    const updateStep = (updated: FlowStep) => {
        setSteps(steps.map(s => s.step_order === updated.step_order ? updated : s));
    };

    const handleSave = async (status: FlowStatus = 'Draft') => {
        if (!name.trim()) return alert('Dê um nome ao fluxo.');
        setSaving(true);
        try {
            let flowId = flow?.id;
            if (flowId) {
                await supabase.from('SITE_EmailFlows').update({ name, description, trigger_type: triggerType, trigger_config: triggerConfig, status, updated_at: new Date().toISOString() }).eq('id', flowId);
                await supabase.from('SITE_FlowSteps').delete().eq('flow_id', flowId);
            } else {
                const { data } = await supabase.from('SITE_EmailFlows').insert({ name, description, trigger_type: triggerType, trigger_config: triggerConfig, status, created_by: user?.id }).select().single();
                flowId = data?.id;
            }
            if (flowId && steps.length > 0) {
                await supabase.from('SITE_FlowSteps').insert(steps.map(s => ({ flow_id: flowId, ...s })));
            }
            onSaved();
        } catch (e) {
            alert('Erro ao salvar. Tente novamente.');
        } finally {
            setSaving(false);
        }
    };

    const STEP_TYPES: { type: StepType; icon: React.ReactNode; label: string; color: string }[] = [
        { type: 'Email', icon: <Mail size={14} />, label: 'Email', color: 'bg-blue-500' },
        { type: 'Delay', icon: <Clock size={14} />, label: 'Delay', color: 'bg-amber-500' },
        { type: 'Condition', icon: <Split size={14} />, label: 'Condição', color: 'bg-purple-500' },
        { type: 'Exit', icon: <LogOut size={14} />, label: 'Saída', color: 'bg-red-500' },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <button onClick={onBack} className="p-2 hover:bg-gray-100 dark:hover:bg-[#333] rounded-xl transition-colors">
                    <ChevronRight size={18} className="rotate-180 text-gray-500" />
                </button>
                <div className="flex-1">
                    <input
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="Nome do Fluxo..."
                        className="text-2xl font-black bg-transparent border-none outline-none text-gray-900 dark:text-white w-full placeholder-gray-300 dark:placeholder-gray-600"
                    />
                </div>
                <div className="flex gap-2">
                    <button onClick={() => handleSave('Draft')} disabled={saving} className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#333] transition-colors">
                        {saving ? 'Salvando...' : 'Salvar Rascunho'}
                    </button>
                    <button onClick={() => handleSave('Active')} disabled={saving} className="px-4 py-2 rounded-xl bg-black dark:bg-white text-white dark:text-black text-sm font-bold hover:opacity-90 transition-opacity flex items-center gap-2">
                        <Play size={14} /> Ativar Fluxo
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Config */}
                <div className="space-y-4">
                    <div className="bg-white dark:bg-[#1A1A1A] rounded-2xl border border-gray-100 dark:border-gray-800 p-5 space-y-4">
                        <h4 className="font-black text-sm text-gray-900 dark:text-white uppercase tracking-wider">Configurações</h4>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Descrição</label>
                            <textarea
                                rows={2}
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                placeholder="Descrição do fluxo..."
                                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#111] text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white resize-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">🎯 Gatilho (Trigger)</label>
                            <select
                                value={triggerType}
                                onChange={e => setTriggerType(e.target.value as TriggerType)}
                                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#111] text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                            >
                                {Object.entries(TRIGGER_LABELS).map(([k, v]) => (
                                    <option key={k} value={k}>{v}</option>
                                ))}
                            </select>
                        </div>
                        {triggerType === 'Inatividade' && (
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Dias de inatividade</label>
                                <input type="number" min={1} value={triggerConfig.inactivity_days || 30}
                                    onChange={e => setTriggerConfig({ ...triggerConfig, inactivity_days: parseInt(e.target.value) })}
                                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#111] text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                                />
                            </div>
                        )}
                        {triggerType === 'Tag' && (
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Tag</label>
                                <input type="text" value={triggerConfig.tag || ''}
                                    onChange={e => setTriggerConfig({ ...triggerConfig, tag: e.target.value })}
                                    placeholder="Ex: BMW, interessado-curso..."
                                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#111] text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                                />
                            </div>
                        )}
                        {triggerType === 'CliqueLinkEspecifico' && (
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">URL do Link</label>
                                <input type="text" value={triggerConfig.link_url || ''}
                                    onChange={e => setTriggerConfig({ ...triggerConfig, link_url: e.target.value })}
                                    placeholder="https://..."
                                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#111] text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                                />
                            </div>
                        )}
                    </div>

                    {/* Add Step Buttons */}
                    <div className="bg-white dark:bg-[#1A1A1A] rounded-2xl border border-gray-100 dark:border-gray-800 p-5 space-y-3">
                        <h4 className="font-black text-sm text-gray-900 dark:text-white uppercase tracking-wider">Adicionar Step</h4>
                        <div className="grid grid-cols-2 gap-2">
                            {STEP_TYPES.map(st => (
                                <button key={st.type} onClick={() => addStep(st.type)}
                                    className="flex items-center gap-2 p-3 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-500 transition-all text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#333]">
                                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-white ${st.color}`}>
                                        {st.icon}
                                    </div>
                                    {st.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right: Flow Canvas */}
                <div className="lg:col-span-2">
                    <div className="bg-white dark:bg-[#1A1A1A] rounded-2xl border border-gray-100 dark:border-gray-800 p-6 min-h-[500px]">
                        <h4 className="font-black text-sm text-gray-900 dark:text-white uppercase tracking-wider mb-6">Jornada do Fluxo</h4>

                        {/* Trigger Node */}
                        <div className="flex flex-col items-center">
                            <div className="w-full max-w-md bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-200 dark:border-green-800 rounded-2xl p-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-green-500 flex items-center justify-center text-white">
                                        <Zap size={16} />
                                    </div>
                                    <div>
                                        <p className="font-black text-sm text-green-800 dark:text-green-300">Trigger</p>
                                        <p className="text-xs text-green-600 dark:text-green-400">{TRIGGER_LABELS[triggerType]}</p>
                                    </div>
                                </div>
                            </div>

                            {steps.length > 0 && (
                                <div className="flex flex-col items-center my-1">
                                    <div className="w-0.5 h-4 bg-gray-200 dark:bg-gray-700" />
                                    <ArrowDown size={14} className="text-gray-300 dark:text-gray-600" />
                                </div>
                            )}
                        </div>

                        {/* Steps */}
                        {steps.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-48 text-gray-400 text-sm">
                                <GitBranch size={32} className="mb-3 opacity-30" />
                                <p>Adicione steps ao fluxo usando os botões à esquerda</p>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center">
                                {steps.map((step, i) => (
                                    <StepCard key={i} step={step} index={i} onEdit={setEditingStep} onDelete={removeStep} isLast={i === steps.length - 1} />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {editingStep && (
                <StepEditorModal
                    step={editingStep}
                    onSave={updateStep}
                    onClose={() => setEditingStep(null)}
                />
            )}
        </div>
    );
};

// ─── Flow Card ────────────────────────────────────────────────────────────────
const FlowCard = ({ flow, onEdit, onDelete, onToggleStatus }: {
    flow: EmailFlow;
    onEdit: (f: EmailFlow) => void | Promise<void>;
    onDelete: (id: string) => void | Promise<void>;
    onToggleStatus: (f: EmailFlow) => void | Promise<void>;
    key?: React.Key;
}) => {
    const isActive = flow.status === 'Active';
    const stats = flow.stats || { enrolled: 0, active: 0, completed: 0, open_rate: 0 };

    return (
        <div className="bg-white dark:bg-[#1A1A1A] border border-gray-100 dark:border-gray-800 rounded-2xl p-5 hover:shadow-md transition-all">
            <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${TRIGGER_COLORS[flow.trigger_type]}`}>
                            {TRIGGER_LABELS[flow.trigger_type]}
                        </span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isActive ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : flow.status === 'Paused' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
                            {isActive ? '● Ativo' : flow.status === 'Paused' ? '⏸ Pausado' : '○ Rascunho'}
                        </span>
                    </div>
                    <h3 className="font-black text-base text-gray-900 dark:text-white">{flow.name}</h3>
                    {flow.description && <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">{flow.description}</p>}
                </div>
                <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => onToggleStatus(flow)} title={isActive ? 'Pausar' : 'Ativar'} className="p-2 hover:bg-gray-100 dark:hover:bg-[#333] rounded-xl transition-colors text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
                        {isActive ? <Pause size={15} /> : <Play size={15} />}
                    </button>
                    <button onClick={() => onEdit(flow)} className="p-2 hover:bg-gray-100 dark:hover:bg-[#333] rounded-xl transition-colors text-gray-400 hover:text-blue-500">
                        <Edit3 size={15} />
                    </button>
                    <button onClick={() => onDelete(flow.id)} className="p-2 hover:bg-gray-100 dark:hover:bg-[#333] rounded-xl transition-colors text-gray-400 hover:text-red-500">
                        <Trash2 size={15} />
                    </button>
                </div>
            </div>

            {/* Mini stats */}
            <div className="grid grid-cols-3 gap-2">
                <div className="bg-gray-50 dark:bg-[#111] rounded-xl p-2.5 text-center">
                    <p className="text-lg font-black text-gray-900 dark:text-white">{stats.enrolled}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Enrolados</p>
                </div>
                <div className="bg-gray-50 dark:bg-[#111] rounded-xl p-2.5 text-center">
                    <p className="text-lg font-black text-gray-900 dark:text-white">{stats.active}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Ativos</p>
                </div>
                <div className="bg-gray-50 dark:bg-[#111] rounded-xl p-2.5 text-center">
                    <p className="text-lg font-black text-blue-600 dark:text-blue-400">{stats.open_rate || 0}%</p>
                    <p className="text-xs text-gray-500 mt-0.5">Abertura</p>
                </div>
            </div>
        </div>
    );
};

// ─── Template Card ────────────────────────────────────────────────────────────
const TemplateCard = ({ tpl, onUse }: { tpl: typeof FLOW_TEMPLATES[0]; onUse: (t: typeof FLOW_TEMPLATES[0]) => void | Promise<void>; key?: React.Key }) => (
    <button onClick={() => onUse(tpl)} className="group bg-white dark:bg-[#1A1A1A] border border-gray-100 dark:border-gray-800 rounded-2xl p-5 text-left hover:border-black dark:hover:border-white transition-all hover:shadow-lg">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${TRIGGER_COLORS[tpl.trigger_type]}`}>
            <GitBranch size={18} />
        </div>
        <h4 className="font-black text-sm text-gray-900 dark:text-white mb-1">{tpl.name}</h4>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{tpl.description}</p>
        <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400">{tpl.steps.length} steps</span>
            <span className="text-xs font-bold text-black dark:text-white group-hover:underline">Usar template →</span>
        </div>
    </button>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const EmailFlowsView = ({ permissions }: { permissions?: any }) => {
    const [flows, setFlows] = useState<EmailFlow[]>([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<'list' | 'editor' | 'templates'>('list');
    const [editingFlow, setEditingFlow] = useState<Partial<EmailFlow> | null>(null);

    useEffect(() => {
        fetchFlows();
    }, []);

    const fetchFlows = async () => {
        setLoading(true);
        try {
            const { data } = await supabase
                .from('SITE_EmailFlows')
                .select('*')
                .order('created_at', { ascending: false });
            setFlows(data || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Excluir este fluxo? Esta ação não pode ser desfeita.')) return;
        await supabase.from('SITE_EmailFlows').delete().eq('id', id);
        setFlows(prev => prev.filter(f => f.id !== id));
    };

    const handleToggleStatus = async (flow: EmailFlow) => {
        const newStatus = flow.status === 'Active' ? 'Paused' : 'Active';
        await supabase.from('SITE_EmailFlows').update({ status: newStatus }).eq('id', flow.id);
        setFlows(prev => prev.map(f => f.id === flow.id ? { ...f, status: newStatus } : f));
    };

    const handleEditFlow = async (flow: EmailFlow) => {
        const { data: steps } = await supabase.from('SITE_FlowSteps').select('*').eq('flow_id', flow.id).order('step_order');
        setEditingFlow({ ...flow, steps: steps || [] });
        setView('editor');
    };

    const handleNewFlow = () => {
        setEditingFlow(null);
        setView('editor');
    };

    const handleUseTemplate = (tpl: typeof FLOW_TEMPLATES[0]) => {
        setEditingFlow({ name: tpl.name, description: tpl.description, trigger_type: tpl.trigger_type, trigger_config: {}, steps: tpl.steps });
        setView('editor');
    };

    const handleSaved = () => {
        setView('list');
        fetchFlows();
    };

    if (view === 'editor') {
        return <FlowEditor flow={editingFlow} onBack={() => setView('list')} onSaved={handleSaved} />;
    }

    // ─── Stats Summary ─────────────────────────────────────────
    const totalActive = flows.filter(f => f.status === 'Active').length;
    const totalEnrolled = flows.reduce((a, f) => a + (f.stats?.enrolled || 0), 0);
    const totalCompleted = flows.reduce((a, f) => a + (f.stats?.completed || 0), 0);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h3 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                        <GitBranch className="text-purple-500" size={22} />
                        Fluxos Automatizados
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Crie jornadas automáticas de email com gatilhos, delays e condições.</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setView('templates')} className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#333] transition-colors flex items-center gap-2">
                        <Copy size={14} /> Templates
                    </button>
                    <button onClick={handleNewFlow} className="px-4 py-2 rounded-xl bg-black dark:bg-white text-white dark:text-black text-sm font-bold hover:opacity-90 transition-opacity flex items-center gap-2">
                        <Plus size={14} /> Novo Fluxo
                    </button>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                    { label: 'Fluxos Ativos', value: totalActive, icon: <Play size={20} />, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
                    { label: 'Total Enrolados', value: totalEnrolled, icon: <Users size={20} />, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
                    { label: 'Concluídos', value: totalCompleted, icon: <CheckCircle size={20} />, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' },
                ].map((kpi, i) => (
                    <div key={i} className="bg-white dark:bg-[#1A1A1A] border border-gray-100 dark:border-gray-800 rounded-2xl p-5 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{kpi.label}</p>
                            <p className="text-3xl font-black text-gray-900 dark:text-white">{kpi.value}</p>
                        </div>
                        <div className={`p-3 rounded-2xl ${kpi.bg} ${kpi.color}`}>
                            {kpi.icon}
                        </div>
                    </div>
                ))}
            </div>

            {/* Flow List or Templates */}
            {view === 'templates' ? (
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="font-black text-base text-gray-900 dark:text-white">Templates Prontos</h4>
                        <button onClick={() => setView('list')} className="text-sm font-bold text-gray-500 hover:text-black dark:hover:text-white flex items-center gap-1">
                            <X size={14} /> Fechar
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {FLOW_TEMPLATES.map((tpl, i) => (
                            <TemplateCard key={i} tpl={tpl} onUse={handleUseTemplate} />
                        ))}
                    </div>
                </div>
            ) : loading ? (
                <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Carregando fluxos...</div>
            ) : flows.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-gray-400 gap-4">
                    <GitBranch size={40} className="opacity-20" />
                    <div className="text-center">
                        <p className="font-bold text-gray-500 dark:text-gray-400">Nenhum fluxo criado ainda</p>
                        <p className="text-sm mt-1">Comece com um template ou crie do zero.</p>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => setView('templates')} className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-bold hover:bg-gray-50 dark:hover:bg-[#333] transition-colors">Ver Templates</button>
                        <button onClick={handleNewFlow} className="px-4 py-2 rounded-xl bg-black dark:bg-white text-white dark:text-black text-sm font-bold hover:opacity-90 transition-opacity">Criar do Zero</button>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {flows.map(flow => (
                        <FlowCard key={flow.id} flow={flow} onEdit={handleEditFlow} onDelete={handleDelete} onToggleStatus={handleToggleStatus} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default EmailFlowsView;
