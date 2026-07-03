import React, { useState, useEffect, useCallback } from 'react';
import {
  Bot, Save, Plus, Trash2, Power, Sparkles, Send, Loader2, MessageSquare, ShieldAlert, BookOpen,
  Zap, Database, GraduationCap,
} from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { generateContent } from '../../../lib/ai';
import { useAuth } from '../../../context/AuthContext';
import { createHasPermission } from '../../../lib/permissions';

type Intent = 'course' | 'sales' | 'parts' | 'support' | 'general';
const INTENTS: { id: Intent; label: string }[] = [
  { id: 'course', label: 'Curso' },
  { id: 'sales', label: 'Venda' },
  { id: 'support', label: 'Suporte' },
  { id: 'general', label: 'Geral' },
];
const RULE_TYPES: { id: string; label: string; cls: string }[] = [
  { id: 'forbidden', label: 'Proibido', cls: 'text-red-500' },
  { id: 'required', label: 'Obrigatório', cls: 'text-emerald-500' },
  { id: 'escalate', label: 'Escalar p/ humano', cls: 'text-amber-500' },
];

interface AIConfigRow {
  id?: string;
  enabled: boolean;
  persona: string;
  business_info: string;
  fallback_message: string;
  handoff_keywords: string[];
  max_msgs_before_handoff: number;
  autopilot_intents: string[];
  provider: string | null;
  model: string | null;
  humanize_enabled: boolean;
  humanize_typing: boolean;
  humanize_max_bubbles: number;
  humanize_speed: 'slow' | 'normal' | 'fast';
  use_live_courses: boolean;
}
interface KnowledgeRow { id: string; intent: Intent; title: string; content: string; enabled: boolean; }
interface RuleRow { id: string; type: string; value: string; enabled: boolean; }

const AITrainingView: React.FC = () => {
  const { user } = useAuth();
  const canManage = createHasPermission(user)('whatsapp_ai_manage') || createHasPermission(user)('manage_settings');
  const [config, setConfig] = useState<AIConfigRow | null>(null);
  const [knowledge, setKnowledge] = useState<KnowledgeRow[]>([]);
  const [rules, setRules] = useState<RuleRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // sandbox
  const [sandboxInput, setSandboxInput] = useState('');
  const [sandboxLog, setSandboxLog] = useState<{ role: 'user' | 'ai'; text: string; meta?: string }[]>([]);
  const [sandboxLoading, setSandboxLoading] = useState(false);

  const load = useCallback(async () => {
    const [cfg, kn, rl] = await Promise.all([
      supabase.from('SITE_WhatsAppAIConfig').select('*').limit(1).maybeSingle(),
      supabase.from('SITE_WhatsAppAIKnowledge').select('*').order('created_at', { ascending: false }),
      supabase.from('SITE_WhatsAppAIRules').select('*').order('created_at', { ascending: false }),
    ]);
    // Tabelas ausentes (migration não rodada) → mostra aviso em vez de travar carregando.
    if (cfg.error) { setLoadError(cfg.error.message); return; }
    setLoadError(null);
    if (!cfg.data) {
      // Tabela existe mas sem linha de config — cria a config padrão na hora.
      const seed = { enabled: false, persona: '', business_info: '', autopilot_intents: ['support', 'general'] };
      const ins = await supabase.from('SITE_WhatsAppAIConfig').insert(seed).select('*').single();
      if (ins.data) cfg.data = ins.data;
    }
    if (cfg.data) setConfig({
      id: cfg.data.id,
      enabled: !!cfg.data.enabled,
      persona: cfg.data.persona || '',
      business_info: cfg.data.business_info || '',
      fallback_message: cfg.data.fallback_message || '',
      handoff_keywords: cfg.data.handoff_keywords || [],
      max_msgs_before_handoff: Number(cfg.data.max_msgs_before_handoff ?? 6),
      autopilot_intents: cfg.data.autopilot_intents || ['support', 'general'],
      provider: cfg.data.provider, model: cfg.data.model,
      humanize_enabled: cfg.data.humanize_enabled ?? true,
      humanize_typing: cfg.data.humanize_typing ?? true,
      humanize_max_bubbles: Number(cfg.data.humanize_max_bubbles ?? 4),
      humanize_speed: (cfg.data.humanize_speed || 'normal') as AIConfigRow['humanize_speed'],
      use_live_courses: cfg.data.use_live_courses ?? true,
    });
    setKnowledge((kn.data || []) as KnowledgeRow[]);
    setRules((rl.data || []) as RuleRow[]);
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveConfig = async () => {
    if (!config) return;
    setSaving(true);
    const payload = {
      enabled: config.enabled,
      persona: config.persona,
      business_info: config.business_info,
      fallback_message: config.fallback_message,
      handoff_keywords: config.handoff_keywords,
      max_msgs_before_handoff: config.max_msgs_before_handoff,
      autopilot_intents: config.autopilot_intents,
      provider: config.provider || null,
      model: config.model || null,
      humanize_enabled: config.humanize_enabled,
      humanize_typing: config.humanize_typing,
      humanize_max_bubbles: config.humanize_max_bubbles,
      humanize_speed: config.humanize_speed,
      use_live_courses: config.use_live_courses,
      updated_at: new Date().toISOString(),
    };
    const res = config.id
      ? await supabase.from('SITE_WhatsAppAIConfig').update(payload).eq('id', config.id)
      : await supabase.from('SITE_WhatsAppAIConfig').insert(payload);
    setSaving(false);
    if (res.error) alert('Erro ao salvar: ' + res.error.message);
    else { alert('Configuração da IA salva!'); load(); }
  };

  const toggleEnabled = async () => {
    if (!config) return;
    const next = !config.enabled;
    setConfig({ ...config, enabled: next });
    if (config.id) await supabase.from('SITE_WhatsAppAIConfig').update({ enabled: next }).eq('id', config.id);
  };

  const toggleAutopilot = (intent: Intent) => {
    if (!config) return;
    const has = config.autopilot_intents.includes(intent);
    setConfig({
      ...config,
      autopilot_intents: has ? config.autopilot_intents.filter((i) => i !== intent) : [...config.autopilot_intents, intent],
    });
  };

  // ── Knowledge CRUD ──
  const addKnowledge = async () => {
    const { data } = await supabase.from('SITE_WhatsAppAIKnowledge')
      .insert({ intent: 'general', title: 'Novo item', content: '', enabled: true }).select('*').single();
    if (data) setKnowledge((p) => [data as KnowledgeRow, ...p]);
  };
  const updateKnowledge = async (id: string, patch: Partial<KnowledgeRow>) => {
    setKnowledge((p) => p.map((k) => (k.id === id ? { ...k, ...patch } : k)));
    await supabase.from('SITE_WhatsAppAIKnowledge').update(patch).eq('id', id);
  };
  const deleteKnowledge = async (id: string) => {
    if (!confirm('Excluir este item de conhecimento?')) return;
    setKnowledge((p) => p.filter((k) => k.id !== id));
    await supabase.from('SITE_WhatsAppAIKnowledge').delete().eq('id', id);
  };

  // ── Rules CRUD ──
  const addRule = async () => {
    const { data } = await supabase.from('SITE_WhatsAppAIRules')
      .insert({ type: 'forbidden', value: '', enabled: true }).select('*').single();
    if (data) setRules((p) => [data as RuleRow, ...p]);
  };
  const updateRule = async (id: string, patch: Partial<RuleRow>) => {
    setRules((p) => p.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    await supabase.from('SITE_WhatsAppAIRules').update(patch).eq('id', id);
  };
  const deleteRule = async (id: string) => {
    if (!confirm('Excluir esta regra?')) return;
    setRules((p) => p.filter((r) => r.id !== id));
    await supabase.from('SITE_WhatsAppAIRules').delete().eq('id', id);
  };

  // ── Sandbox (usa a IA no navegador, sem enviar nada real) ──
  const runSandbox = async () => {
    if (!sandboxInput.trim() || !config) return;
    const userMsg = sandboxInput.trim();
    setSandboxInput('');
    setSandboxLog((p) => [...p, { role: 'user', text: userMsg }]);
    setSandboxLoading(true);
    try {
      const intentRaw = await generateContent(userMsg, 'Classifique em UMA palavra: course, sales, parts, support, general. parts = compra/orçamento de peça, ferramenta, mola, óleo ou produto físico (NÃO curso). Só a palavra.');
      const intent = (['parts', 'course', 'sales', 'support', 'general'].find((i) => intentRaw.toLowerCase().includes(i)) || 'general') as Intent;
      // Regra de negócio: compra de peça vai para atendente humano (lead no CRM).
      if (intent === 'parts') {
        setSandboxLog((p) => [...p, {
          role: 'ai', text: config.fallback_message || 'Um momento, vou te transferir para um atendente.',
          meta: 'intenção: parts · transferiria para atendente + lead roteado no CRM (roleta ou nome citado)',
        }]);
        setSandboxLoading(false);
        return;
      }
      const kn = knowledge.filter((k) => k.enabled && (k.intent === intent || k.intent === 'general'))
        .map((k) => `• ${k.title}: ${k.content}`).join('\n');
      const rl = rules.filter((r) => r.enabled).map((r) => `[${r.type}] ${r.value}`).join('\n');
      // Mesmas instruções de conversa do backend (api/_aiReply.ts) para o
      // sandbox refletir o comportamento real do WhatsApp.
      const system =
        `${config.persona}\n\nINFORMAÇÕES DO NEGÓCIO:\n${config.business_info}\n\n` +
        (kn ? `O QUE VOCÊ PODE DIZER:\n${kn}\n\n` : '') +
        (rl ? `REGRAS OBRIGATÓRIAS:\n${rl}\n\n` : '') +
        `COMO CONVERSAR:\n` +
        `- Responda em português do Brasil com tom natural e conversacional, como uma pessoa de verdade digitando no WhatsApp.\n` +
        `- Se o cliente só cumprimentou ("oi", "bom dia", "boa noite"), responda o cumprimento com simpatia, se apresente em uma frase e pergunte como pode ajudar. NUNCA transfira nem fique em silêncio diante de um cumprimento.\n` +
        `- Faça UMA pergunta por vez. Descubra primeiro o que o cliente precisa (qual curso, qual cidade, se já é mecânico).\n` +
        `- Use mensagens curtas, sem markdown, asteriscos ou listas numeradas.\n` +
        `- Só fale em transferir para um atendente se o cliente pedir, for reclamação/cancelamento/reembolso, ou você realmente não tiver a informação.\n` +
        `- Nunca invente preço, data, vaga ou condição de pagamento.`;
      const reply = await generateContent(userMsg, system);
      const autopilot = config.autopilot_intents.includes(intent);
      setSandboxLog((p) => [...p, {
        role: 'ai', text: reply,
        meta: `intenção: ${intent} · ${autopilot ? 'enviaria automaticamente' : 'viraria rascunho p/ aprovação'}`,
      }]);
    } catch (e: any) {
      setSandboxLog((p) => [...p, { role: 'ai', text: 'Erro: ' + (e?.message || 'falha na IA. Verifique as chaves em Configurações.') }]);
    } finally {
      setSandboxLoading(false);
    }
  };

  if (loadError) {
    return (
      <div className="max-w-2xl mx-auto mt-8 bg-[var(--admin-surface-1)] border border-amber-500/40 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-500"><ShieldAlert size={20} /></div>
          <h3 className="font-bold text-[var(--admin-text-primary)]">Tabelas da IA não encontradas</h3>
        </div>
        <p className="text-sm text-[var(--admin-text-secondary)] mb-3">
          A configuração da IA precisa de tabelas que ainda não existem no banco. Rode a migration
          <code className="px-1.5 py-0.5 mx-1 rounded bg-[var(--admin-surface-3)] text-xs">migrations/whatsapp_ai_tables.sql</code>
          no Supabase (SQL Editor → New query → colar → Run) e recarregue esta página.
        </p>
        <p className="text-[11px] text-[var(--admin-text-tertiary)] mb-4">Detalhe técnico: {loadError}</p>
        <button onClick={() => { setLoadError(null); load(); }} className="bg-wtech-black text-white dark:bg-white dark:text-black px-4 py-2 rounded-lg font-bold text-sm">
          Tentar novamente
        </button>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="flex items-center justify-center py-20 text-[var(--admin-text-tertiary)]">
        <Loader2 className="animate-spin mr-2" /> Carregando configuração da IA...
      </div>
    );
  }

  const input = 'w-full border border-[var(--admin-border)] rounded-lg p-2.5 text-sm bg-[var(--admin-surface-2)] outline-none focus:border-wtech-gold transition-colors';

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Cabeçalho + liga/desliga */}
      <div className="flex items-center justify-between bg-[var(--admin-surface-1)] border border-[var(--admin-border)] rounded-2xl p-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-violet-500/15 flex items-center justify-center text-violet-500"><Bot size={22} /></div>
          <div>
            <h3 className="font-bold text-[var(--admin-text-primary)]">IA de Atendimento</h3>
            <p className="text-xs text-[var(--admin-text-secondary)]">Treine o robô e defina o que ele pode ou não dizer.</p>
          </div>
        </div>
        <button onClick={toggleEnabled} disabled={!canManage}
          title={!canManage ? 'Sem permissão para ligar/desligar a IA' : undefined}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${config.enabled ? 'bg-emerald-500 text-white' : 'bg-gray-300 dark:bg-white/10 text-gray-600 dark:text-gray-300'}`}>
          <Power size={16} /> {config.enabled ? 'Ligada' : 'Desligada'}
        </button>
      </div>

      {/* Persona + negócio */}
      <div className="bg-[var(--admin-surface-1)] border border-[var(--admin-border)] rounded-2xl p-5 space-y-4">
        <h4 className="text-sm font-bold text-[var(--admin-text-primary)] flex items-center gap-2"><Sparkles size={15} /> Personalidade & Negócio</h4>
        <div>
          <label className="block text-xs font-bold text-[var(--admin-text-secondary)] uppercase mb-1">Persona (tom de voz)</label>
          <textarea className={input} rows={3} value={config.persona} onChange={(e) => setConfig({ ...config, persona: e.target.value })} />
        </div>
        <div>
          <label className="block text-xs font-bold text-[var(--admin-text-secondary)] uppercase mb-1">Informações do negócio</label>
          <textarea className={input} rows={3} value={config.business_info} onChange={(e) => setConfig({ ...config, business_info: e.target.value })} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-[var(--admin-text-secondary)] uppercase mb-1">Mensagem ao transferir p/ humano</label>
            <input className={input} value={config.fallback_message} onChange={(e) => setConfig({ ...config, fallback_message: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-bold text-[var(--admin-text-secondary)] uppercase mb-1">Palavras que transferem p/ humano (vírgula)</label>
            <input className={input} value={config.handoff_keywords.join(', ')}
              onChange={(e) => setConfig({ ...config, handoff_keywords: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
          <div>
            <label className="block text-xs font-bold text-[var(--admin-text-secondary)] uppercase mb-1">Máx. respostas da IA antes de passar p/ humano</label>
            <input type="number" min={1} className={input} value={config.max_msgs_before_handoff}
              onChange={(e) => setConfig({ ...config, max_msgs_before_handoff: parseInt(e.target.value) || 6 })} />
          </div>
          <div>
            <label className="block text-xs font-bold text-[var(--admin-text-secondary)] uppercase mb-2">Responde sozinha (autopilot) em:</label>
            <div className="flex flex-wrap gap-2">
              {INTENTS.map((it) => {
                const on = config.autopilot_intents.includes(it.id);
                return (
                  <button key={it.id} onClick={() => toggleAutopilot(it.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${on ? 'bg-violet-500 text-white' : 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-300'}`}>
                    {it.label}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-[var(--admin-text-tertiary)] mt-1">As demais intenções viram rascunho para o atendente aprovar.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-[var(--admin-border)]">
          <div>
            <label className="block text-xs font-bold text-[var(--admin-text-secondary)] uppercase mb-1">Motor da IA</label>
            <select className={input} value={config.provider || ''} onChange={(e) => setConfig({ ...config, provider: e.target.value || null })}>
              <option value="">Padrão do sistema (Configurações → GPT &amp; Gemini)</option>
              <option value="gemini">Gemini</option>
              <option value="openai">OpenAI</option>
              <option value="openrouter">OpenRouter</option>
            </select>
            <p className="text-[11px] text-[var(--admin-text-tertiary)] mt-1">Sobrescreve o provedor só para o robô do WhatsApp.</p>
          </div>
          <div>
            <label className="block text-xs font-bold text-[var(--admin-text-secondary)] uppercase mb-1">Modelo (opcional)</label>
            <input className={input} value={config.model || ''} onChange={(e) => setConfig({ ...config, model: e.target.value || null })}
              placeholder="ex.: gemini-1.5-flash, gpt-4o-mini" />
            <p className="text-[11px] text-[var(--admin-text-tertiary)] mt-1">Vazio = modelo padrão do provedor.</p>
          </div>
        </div>
        <button onClick={saveConfig} disabled={saving}
          className="bg-wtech-black text-white dark:bg-white dark:text-black px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:opacity-90 transition-opacity">
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Salvar configuração
        </button>
      </div>

      {/* Humanização & Dados ao vivo */}
      <div className="bg-[var(--admin-surface-1)] border border-[var(--admin-border)] rounded-2xl p-5 space-y-4">
        <h4 className="text-sm font-bold text-[var(--admin-text-primary)] flex items-center gap-2"><Zap size={15} /> Humanização & Dados ao vivo</h4>

        {/* Toggles de humanização */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button onClick={() => setConfig({ ...config, humanize_enabled: !config.humanize_enabled })}
            className={`flex items-center justify-between gap-3 p-3 rounded-xl border transition-colors text-left ${config.humanize_enabled ? 'border-violet-500/50 bg-violet-500/10' : 'border-[var(--admin-border)] bg-[var(--admin-surface-2)]'}`}>
            <div className="flex items-center gap-2">
              <MessageSquare size={16} className={config.humanize_enabled ? 'text-violet-500' : 'text-gray-400'} />
              <div>
                <p className="text-sm font-bold text-[var(--admin-text-primary)]">Dividir em vários balões</p>
                <p className="text-[11px] text-[var(--admin-text-tertiary)]">Quebra respostas longas em mensagens curtas.</p>
              </div>
            </div>
            <Power size={15} className={config.humanize_enabled ? 'text-violet-500' : 'text-gray-400'} />
          </button>

          <button onClick={() => setConfig({ ...config, humanize_typing: !config.humanize_typing })}
            disabled={!config.humanize_enabled}
            className={`flex items-center justify-between gap-3 p-3 rounded-xl border transition-colors text-left disabled:opacity-40 ${config.humanize_typing ? 'border-violet-500/50 bg-violet-500/10' : 'border-[var(--admin-border)] bg-[var(--admin-surface-2)]'}`}>
            <div className="flex items-center gap-2">
              <Sparkles size={16} className={config.humanize_typing ? 'text-violet-500' : 'text-gray-400'} />
              <div>
                <p className="text-sm font-bold text-[var(--admin-text-primary)]">Mostrar "digitando…"</p>
                <p className="text-[11px] text-[var(--admin-text-tertiary)]">Marca como lida e simula digitação antes de responder.</p>
              </div>
            </div>
            <Power size={15} className={config.humanize_typing ? 'text-violet-500' : 'text-gray-400'} />
          </button>
        </div>

        {/* Velocidade + teto de balões */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-[var(--admin-text-secondary)] uppercase mb-1">Velocidade de digitação</label>
            <select className={input} value={config.humanize_speed} disabled={!config.humanize_enabled}
              onChange={(e) => setConfig({ ...config, humanize_speed: e.target.value as AIConfigRow['humanize_speed'] })}>
              <option value="slow">Devagar (mais humano)</option>
              <option value="normal">Normal</option>
              <option value="fast">Rápido</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-[var(--admin-text-secondary)] uppercase mb-1">Máximo de balões por resposta</label>
            <input type="number" min={1} max={6} className={input} value={config.humanize_max_bubbles} disabled={!config.humanize_enabled}
              onChange={(e) => setConfig({ ...config, humanize_max_bubbles: Math.min(6, Math.max(1, parseInt(e.target.value) || 4)) })} />
          </div>
        </div>

        {/* Dados ao vivo: cursos */}
        <button onClick={() => setConfig({ ...config, use_live_courses: !config.use_live_courses })}
          className={`w-full flex items-center justify-between gap-3 p-3 rounded-xl border transition-colors text-left ${config.use_live_courses ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-[var(--admin-border)] bg-[var(--admin-surface-2)]'}`}>
          <div className="flex items-center gap-2">
            <GraduationCap size={16} className={config.use_live_courses ? 'text-emerald-500' : 'text-gray-400'} />
            <div>
              <p className="text-sm font-bold text-[var(--admin-text-primary)]">Consultar cursos do sistema</p>
              <p className="text-[11px] text-[var(--admin-text-tertiary)]">A IA puxa preço, datas, local e link reais dos cursos publicados — nunca inventa.</p>
            </div>
          </div>
          <Database size={15} className={config.use_live_courses ? 'text-emerald-500' : 'text-gray-400'} />
        </button>

        <button onClick={saveConfig} disabled={saving}
          className="bg-wtech-black text-white dark:bg-white dark:text-black px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:opacity-90 transition-opacity">
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Salvar
        </button>
      </div>

      {/* Conhecimento */}
      <div className="bg-[var(--admin-surface-1)] border border-[var(--admin-border)] rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-bold text-[var(--admin-text-primary)] flex items-center gap-2"><BookOpen size={15} /> O que a IA PODE dizer ({knowledge.length})</h4>
          <button onClick={addKnowledge} className="text-xs font-bold flex items-center gap-1 text-wtech-gold"><Plus size={14} /> Adicionar</button>
        </div>
        <div className="space-y-3">
          {knowledge.map((k) => (
            <div key={k.id} className="border border-[var(--admin-border)] rounded-lg p-3 bg-[var(--admin-surface-2)]">
              <div className="flex items-center gap-2 mb-2">
                <select className={`${input} max-w-[140px]`} value={k.intent} onChange={(e) => updateKnowledge(k.id, { intent: e.target.value as Intent })}>
                  {INTENTS.map((i) => <option key={i.id} value={i.id}>{i.label}</option>)}
                </select>
                <input className={input} placeholder="Título" value={k.title} onChange={(e) => updateKnowledge(k.id, { title: e.target.value })} />
                <button onClick={() => updateKnowledge(k.id, { enabled: !k.enabled })} title={k.enabled ? 'Ativo' : 'Inativo'}
                  className={`shrink-0 p-2 rounded-lg ${k.enabled ? 'text-emerald-500 bg-emerald-500/10' : 'text-gray-400 bg-gray-500/10'}`}><Power size={15} /></button>
                <button onClick={() => deleteKnowledge(k.id)} className="shrink-0 p-2 rounded-lg text-red-500 bg-red-500/10"><Trash2 size={15} /></button>
              </div>
              <textarea className={input} rows={2} placeholder="Conteúdo que a IA pode usar para responder..." value={k.content} onChange={(e) => updateKnowledge(k.id, { content: e.target.value })} />
            </div>
          ))}
          {knowledge.length === 0 && <p className="text-xs text-[var(--admin-text-tertiary)] py-3 text-center">Nenhum item ainda. Adicione o que a IA pode falar sobre cursos, vendas e suporte.</p>}
        </div>
      </div>

      {/* Regras */}
      <div className="bg-[var(--admin-surface-1)] border border-[var(--admin-border)] rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-bold text-[var(--admin-text-primary)] flex items-center gap-2"><ShieldAlert size={15} /> O que a IA NÃO pode / deve escalar ({rules.length})</h4>
          <button onClick={addRule} className="text-xs font-bold flex items-center gap-1 text-wtech-gold"><Plus size={14} /> Adicionar</button>
        </div>
        <div className="space-y-2">
          {rules.map((r) => (
            <div key={r.id} className="flex items-center gap-2">
              <select className={`${input} max-w-[180px]`} value={r.type} onChange={(e) => updateRule(r.id, { type: e.target.value })}>
                {RULE_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
              <input className={input} placeholder="Descreva a regra..." value={r.value} onChange={(e) => updateRule(r.id, { value: e.target.value })} />
              <button onClick={() => updateRule(r.id, { enabled: !r.enabled })}
                className={`shrink-0 p-2 rounded-lg ${r.enabled ? 'text-emerald-500 bg-emerald-500/10' : 'text-gray-400 bg-gray-500/10'}`}><Power size={15} /></button>
              <button onClick={() => deleteRule(r.id)} className="shrink-0 p-2 rounded-lg text-red-500 bg-red-500/10"><Trash2 size={15} /></button>
            </div>
          ))}
          {rules.length === 0 && <p className="text-xs text-[var(--admin-text-tertiary)] py-3 text-center">Nenhuma regra ainda.</p>}
        </div>
      </div>

      {/* Sandbox */}
      <div className="bg-[var(--admin-surface-1)] border border-[var(--admin-border)] rounded-2xl p-5">
        <h4 className="text-sm font-bold text-[var(--admin-text-primary)] flex items-center gap-2 mb-1"><MessageSquare size={15} /> Simular conversa</h4>
        <p className="text-xs text-[var(--admin-text-secondary)] mb-3">Teste como a IA responderia. Nada é enviado ao cliente.</p>
        <div className="border border-[var(--admin-border)] rounded-lg bg-[var(--admin-surface-2)] h-64 overflow-y-auto p-3 space-y-2 mb-3">
          {sandboxLog.length === 0 && <p className="text-xs text-[var(--admin-text-tertiary)] text-center py-10">Envie uma mensagem de teste abaixo.</p>}
          {sandboxLog.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${m.role === 'user' ? 'bg-[#d9fdd3] dark:bg-[#005c4b] text-gray-900 dark:text-white' : 'bg-white dark:bg-[#202c33] text-gray-900 dark:text-white border border-[var(--admin-border)]'}`}>
                <div className="whitespace-pre-wrap break-words">{m.text}</div>
                {m.meta && <div className="text-[10px] text-violet-500 mt-1 font-bold">{m.meta}</div>}
              </div>
            </div>
          ))}
          {sandboxLoading && <div className="flex justify-start"><div className="bg-white dark:bg-[#202c33] border border-[var(--admin-border)] rounded-lg px-3 py-2"><Loader2 size={15} className="animate-spin text-violet-500" /></div></div>}
        </div>
        <div className="flex gap-2">
          <input className={input} placeholder="Mensagem do cliente..." value={sandboxInput}
            onChange={(e) => setSandboxInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && runSandbox()} />
          <button onClick={runSandbox} disabled={sandboxLoading || !sandboxInput.trim()}
            className="bg-violet-500 text-white px-4 rounded-lg font-bold flex items-center gap-2 disabled:opacity-40"><Send size={15} /></button>
        </div>
      </div>
    </div>
  );
};

export default AITrainingView;
