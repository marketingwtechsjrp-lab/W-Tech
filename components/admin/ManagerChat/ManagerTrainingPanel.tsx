/**
 * Tela de Treinamento do Chat de IA da Gerência.
 *
 * Mesmo padrão de blocos da tela da "Bia" (components/admin/WhatsApp/AITrainingView.tsx):
 *   1. Personalidade  2. Motor  3. O que a IA pode dizer  4. O que a IA NÃO pode fazer
 *
 * Diferenças de propósito em relação à Bia:
 *   - Aqui a IA é SOMENTE LEITURA: ela analisa atendimento, nunca envia WhatsApp
 *     nem altera nada no sistema.
 *   - Todo o acesso passa pelo endpoint /api/manager-chat (lib/managerChat.ts).
 *     Esta tela NUNCA fala com o Supabase direto e NUNCA vê chave de IA.
 *
 * Sem alert(), sem confirm() nativo e sem dangerouslySetInnerHTML: o aviso de
 * "salvo" é um toast interno e a exclusão pede confirmação na própria linha.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  X, Sparkles, Cpu, BookOpen, ShieldAlert, Plus, Trash2, Power, Save,
  Loader2, Check, Eye, AlertTriangle, GraduationCap, RefreshCw,
} from 'lucide-react';
import { managerChatApi, MODELOS_DISPONIVEIS, NIVEIS_ESFORCO } from '../../../lib/managerChat';
import type {
  ManagerChatConfig, ManagerChatKnowledge, ManagerChatRule, NivelEsforco, TipoRegra,
} from '../../../lib/managerChat';

// ─── Rótulos em português ───────────────────────────────────────────────────

/** O que cada nível de esforço significa para quem não é técnico. */
const ROTULO_ESFORCO: Record<NivelEsforco, string> = {
  low: 'Baixo — resposta rápida e barata',
  medium: 'Médio — equilíbrio',
  high: 'Alto — recomendado para análise',
  xhigh: 'Muito alto — pensa bastante antes de responder',
  max: 'Máximo — mais lento e mais caro',
};

const TIPOS_REGRA: { id: TipoRegra; label: string; cls: string }[] = [
  { id: 'forbidden', label: 'Proibido', cls: 'text-red-500' },
  { id: 'required', label: 'Obrigatório', cls: 'text-emerald-500' },
  { id: 'escalate', label: 'Escalar para humano', cls: 'text-amber-500' },
];

/** Teto de segurança do max_tokens (requisição sem streaming). */
const MAX_TOKENS_TETO = 16000;
const MAX_TOKENS_PISO = 1000;

const CONFIG_PADRAO: ManagerChatConfig = {
  enabled: false,
  persona: '',
  business_info: '',
  guardrails_extra: '',
  model: MODELOS_DISPONIVEIS[0].id,
  effort: 'high',
  max_tokens: 8000,
};

// ─── Modelo de edição das listas ────────────────────────────────────────────
// Item novo ainda não tem id do banco, então cada linha carrega uma chave local
// só para o React e um marcador de "tem alteração não salva".

let contadorChave = 0;
const novaChave = () => `local-${++contadorChave}`;

interface Linha<T> {
  chave: string;
  item: T;
  sujo: boolean;
  salvando: boolean;
  confirmandoExclusao: boolean;
}

function paraLinhas<T>(itens: T[]): Linha<T>[] {
  return itens.map((item) => ({
    chave: novaChave(), item, sujo: false, salvando: false, confirmandoExclusao: false,
  }));
}

// ─── Componente ─────────────────────────────────────────────────────────────

export const ManagerTrainingPanel: React.FC<{ podeEditar: boolean; onFechar: () => void }> = ({
  podeEditar,
  onFechar,
}) => {
  const [carregando, setCarregando] = useState(true);
  const [erroCarga, setErroCarga] = useState<string | null>(null);

  const [config, setConfig] = useState<ManagerChatConfig>(CONFIG_PADRAO);
  const [configSuja, setConfigSuja] = useState(false);
  const [salvandoConfig, setSalvandoConfig] = useState(false);

  const [conhecimento, setConhecimento] = useState<Linha<ManagerChatKnowledge>[]>([]);
  const [regras, setRegras] = useState<Linha<ManagerChatRule>[]>([]);

  // Toast interno (substitui o alert()).
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);
  const timerAviso = useRef<number | null>(null);

  const mostrarAviso = useCallback((tipo: 'ok' | 'erro', texto: string) => {
    setAviso({ tipo, texto });
    if (timerAviso.current) window.clearTimeout(timerAviso.current);
    timerAviso.current = window.setTimeout(() => setAviso(null), tipo === 'ok' ? 2600 : 6000);
  }, []);

  useEffect(() => () => { if (timerAviso.current) window.clearTimeout(timerAviso.current); }, []);

  // ── Carga ──
  const carregar = useCallback(async () => {
    setCarregando(true);
    setErroCarga(null);
    try {
      const dados = await managerChatApi.obterTreinamento();
      setConfig({ ...CONFIG_PADRAO, ...(dados.config || {}) });
      setConfigSuja(false);
      setConhecimento(paraLinhas(dados.knowledge || []));
      setRegras(paraLinhas(dados.rules || []));
    } catch (e: any) {
      setErroCarga(e?.message || 'Não foi possível carregar o treinamento.');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  // ── Config ──
  const alterarConfig = (patch: Partial<ManagerChatConfig>) => {
    if (!podeEditar) return;
    setConfig((c) => ({ ...c, ...patch }));
    setConfigSuja(true);
  };

  const salvarConfig = async () => {
    if (!podeEditar) return;
    setSalvandoConfig(true);
    try {
      const { config: salva } = await managerChatApi.salvarConfig(config);
      setConfig({ ...CONFIG_PADRAO, ...(salva || config) });
      setConfigSuja(false);
      mostrarAviso('ok', 'Configuração salva.');
    } catch (e: any) {
      mostrarAviso('erro', e?.message || 'Falha ao salvar a configuração.');
    } finally {
      setSalvandoConfig(false);
    }
  };

  // ── Base de conhecimento ──
  const adicionarConhecimento = () => {
    if (!podeEditar) return;
    setConhecimento((p) => [
      { chave: novaChave(), sujo: true, salvando: false, confirmandoExclusao: false,
        item: { topic: 'geral', title: '', content: '', enabled: true } },
      ...p,
    ]);
  };

  const alterarConhecimento = (chave: string, patch: Partial<ManagerChatKnowledge>) => {
    if (!podeEditar) return;
    setConhecimento((p) => p.map((l) => (l.chave === chave ? { ...l, item: { ...l.item, ...patch }, sujo: true } : l)));
  };

  const salvarConhecimento = async (chave: string) => {
    const linha = conhecimento.find((l) => l.chave === chave);
    if (!linha || !podeEditar) return;
    if (!linha.item.title.trim()) { mostrarAviso('erro', 'Dê um título ao item antes de salvar.'); return; }
    setConhecimento((p) => p.map((l) => (l.chave === chave ? { ...l, salvando: true } : l)));
    try {
      const { item } = await managerChatApi.salvarConhecimento(linha.item);
      setConhecimento((p) => p.map((l) => (l.chave === chave ? { ...l, item: item || l.item, sujo: false, salvando: false } : l)));
      mostrarAviso('ok', 'Item salvo.');
    } catch (e: any) {
      setConhecimento((p) => p.map((l) => (l.chave === chave ? { ...l, salvando: false } : l)));
      mostrarAviso('erro', e?.message || 'Falha ao salvar o item.');
    }
  };

  const excluirConhecimento = async (chave: string) => {
    const linha = conhecimento.find((l) => l.chave === chave);
    if (!linha || !podeEditar) return;
    // Item que nunca foi salvo some só do estado local.
    if (!linha.item.id) { setConhecimento((p) => p.filter((l) => l.chave !== chave)); return; }
    setConhecimento((p) => p.map((l) => (l.chave === chave ? { ...l, salvando: true } : l)));
    try {
      await managerChatApi.excluirConhecimento(linha.item.id);
      setConhecimento((p) => p.filter((l) => l.chave !== chave));
      mostrarAviso('ok', 'Item excluído.');
    } catch (e: any) {
      setConhecimento((p) => p.map((l) => (l.chave === chave ? { ...l, salvando: false, confirmandoExclusao: false } : l)));
      mostrarAviso('erro', e?.message || 'Falha ao excluir o item.');
    }
  };

  // ── Regras ──
  const adicionarRegra = () => {
    if (!podeEditar) return;
    setRegras((p) => [
      { chave: novaChave(), sujo: true, salvando: false, confirmandoExclusao: false,
        item: { type: 'forbidden', value: '', enabled: true } },
      ...p,
    ]);
  };

  const alterarRegra = (chave: string, patch: Partial<ManagerChatRule>) => {
    if (!podeEditar) return;
    setRegras((p) => p.map((l) => (l.chave === chave ? { ...l, item: { ...l.item, ...patch }, sujo: true } : l)));
  };

  const salvarRegra = async (chave: string) => {
    const linha = regras.find((l) => l.chave === chave);
    if (!linha || !podeEditar) return;
    if (!linha.item.value.trim()) { mostrarAviso('erro', 'Descreva a regra antes de salvar.'); return; }
    setRegras((p) => p.map((l) => (l.chave === chave ? { ...l, salvando: true } : l)));
    try {
      const { item } = await managerChatApi.salvarRegra(linha.item);
      setRegras((p) => p.map((l) => (l.chave === chave ? { ...l, item: item || l.item, sujo: false, salvando: false } : l)));
      mostrarAviso('ok', 'Regra salva.');
    } catch (e: any) {
      setRegras((p) => p.map((l) => (l.chave === chave ? { ...l, salvando: false } : l)));
      mostrarAviso('erro', e?.message || 'Falha ao salvar a regra.');
    }
  };

  const excluirRegra = async (chave: string) => {
    const linha = regras.find((l) => l.chave === chave);
    if (!linha || !podeEditar) return;
    if (!linha.item.id) { setRegras((p) => p.filter((l) => l.chave !== chave)); return; }
    setRegras((p) => p.map((l) => (l.chave === chave ? { ...l, salvando: true } : l)));
    try {
      await managerChatApi.excluirRegra(linha.item.id);
      setRegras((p) => p.filter((l) => l.chave !== chave));
      mostrarAviso('ok', 'Regra excluída.');
    } catch (e: any) {
      setRegras((p) => p.map((l) => (l.chave === chave ? { ...l, salvando: false, confirmandoExclusao: false } : l)));
      mostrarAviso('erro', e?.message || 'Falha ao excluir a regra.');
    }
  };

  const pedirExclusaoConhecimento = (chave: string, valor: boolean) =>
    setConhecimento((p) => p.map((l) => (l.chave === chave ? { ...l, confirmandoExclusao: valor } : l)));
  const pedirExclusaoRegra = (chave: string, valor: boolean) =>
    setRegras((p) => p.map((l) => (l.chave === chave ? { ...l, confirmandoExclusao: valor } : l)));

  // ── Estilos base ──
  const campo =
    'w-full border border-[var(--admin-border)] rounded-lg p-2.5 text-sm bg-[var(--admin-surface-2)] ' +
    'text-[var(--admin-text-primary)] outline-none focus:border-wtech-gold transition-colors ' +
    'disabled:opacity-60 disabled:cursor-not-allowed';
  const rotulo = 'block text-xs font-bold text-[var(--admin-text-secondary)] uppercase mb-1';
  const cartao = 'bg-[var(--admin-surface-1)] border border-[var(--admin-border)] rounded-2xl p-5';
  const modeloAtual = MODELOS_DISPONIVEIS.find((m) => m.id === config.model);

  const botaoSalvarConfig = (
    <div className="flex items-center gap-3 flex-wrap">
      <button
        onClick={salvarConfig}
        disabled={!podeEditar || salvandoConfig}
        className="bg-wtech-black text-white dark:bg-white dark:text-black px-4 py-2 rounded-lg font-bold text-sm
                   flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {salvandoConfig ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Salvar
      </button>
      {configSuja && (
        <span className="text-[11px] font-bold text-amber-500 flex items-center gap-1">
          <AlertTriangle size={12} /> Há alterações não salvas
        </span>
      )}
    </div>
  );

  return (
    // O painel abre POR CIMA da tela do chat — o container pai precisa ser `relative`.
    <div className="absolute inset-0 z-20 flex flex-col bg-[var(--admin-surface-2)]">
      {/* Cabeçalho */}
      <header className="shrink-0 flex items-center justify-between gap-3 px-5 py-4 border-b border-[var(--admin-border)] bg-[var(--admin-surface-1)]">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-xl bg-wtech-gold/15 flex items-center justify-center text-wtech-gold shrink-0">
            <GraduationCap size={22} />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-[var(--admin-text-primary)] truncate">Treinamento da IA da Gerência</h3>
            <p className="text-xs text-[var(--admin-text-secondary)] truncate">
              Defina a personalidade, o motor e o que a IA pode ou não dizer.
            </p>
          </div>
        </div>
        <button
          onClick={onFechar}
          aria-label="Fechar treinamento"
          className="shrink-0 p-2 rounded-lg text-[var(--admin-text-secondary)] hover:bg-[var(--admin-surface-3)] transition-colors"
        >
          <X size={20} />
        </button>
      </header>

      {/* Toast de feedback (sem alert) */}
      <AnimatePresence>
        {aviso && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="absolute top-20 left-1/2 -translate-x-1/2 z-30 px-4 py-2.5 rounded-xl text-sm font-bold shadow-lg
                       flex items-center gap-2 max-w-[90%]"
            style={{
              background: aviso.tipo === 'ok' ? 'rgb(16 185 129)' : 'rgb(239 68 68)',
              color: '#fff',
            }}
          >
            {aviso.tipo === 'ok' ? <Check size={15} /> : <AlertTriangle size={15} />}
            <span className="whitespace-pre-wrap">{aviso.texto}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Corpo */}
      <div className="flex-1 overflow-y-auto p-5">
        {carregando ? (
          <div className="flex items-center justify-center py-20 text-[var(--admin-text-tertiary)]">
            <Loader2 className="animate-spin mr-2" /> Carregando treinamento...
          </div>
        ) : erroCarga ? (
          <div className="max-w-2xl mx-auto mt-6 bg-[var(--admin-surface-1)] border border-amber-500/40 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-500">
                <ShieldAlert size={20} />
              </div>
              <h3 className="font-bold text-[var(--admin-text-primary)]">Não deu para abrir o treinamento</h3>
            </div>
            <p className="text-sm text-[var(--admin-text-secondary)] whitespace-pre-wrap mb-4">{erroCarga}</p>
            <button
              onClick={carregar}
              className="bg-wtech-black text-white dark:bg-white dark:text-black px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2"
            >
              <RefreshCw size={15} /> Tentar novamente
            </button>
          </div>
        ) : (
          <div className="space-y-6 max-w-5xl mx-auto pb-10">
            {/* Aviso de somente leitura — o conteúdo continua visível */}
            {!podeEditar && (
              <div className="flex items-start gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4">
                <Eye size={18} className="text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-[var(--admin-text-primary)]">Modo somente leitura</p>
                  <p className="text-xs text-[var(--admin-text-secondary)]">
                    Você pode ver todo o treinamento, mas não pode alterar nada. Peça a um administrador
                    a permissão "Treinar a IA da Gerência" em Equipe &amp; Acesso.
                  </p>
                </div>
              </div>
            )}

            {/* ── 1. Personalidade ───────────────────────────────────────── */}
            <section className={`${cartao} space-y-4`}>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <h4 className="text-sm font-bold text-[var(--admin-text-primary)] flex items-center gap-2">
                  <Sparkles size={15} /> Personalidade
                </h4>
                <button
                  onClick={() => alterarConfig({ enabled: !config.enabled })}
                  disabled={!podeEditar}
                  title={!podeEditar ? 'Sem permissão para ligar/desligar o chat' : undefined}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-colors
                              disabled:opacity-50 disabled:cursor-not-allowed ${
                                config.enabled
                                  ? 'bg-emerald-500 text-white'
                                  : 'bg-gray-300 dark:bg-white/10 text-gray-600 dark:text-gray-300'
                              }`}
                >
                  <Power size={16} /> {config.enabled ? 'Chat ligado' : 'Chat desligado'}
                </button>
              </div>
              <p className="text-xs text-[var(--admin-text-secondary)] -mt-1">
                Desligar aqui trava o chat inteiro para todos os gerentes. O histórico continua guardado.
              </p>

              <div>
                <label className={rotulo}>Persona (tom de voz e postura)</label>
                <textarea
                  className={campo}
                  rows={5}
                  disabled={!podeEditar}
                  placeholder="Ex.: Você é a analista de atendimento da W-Tech. Fala direto, sem enrolação, sempre com números na mão..."
                  value={config.persona}
                  onChange={(e) => alterarConfig({ persona: e.target.value })}
                />
              </div>

              <div>
                <label className={rotulo}>O que a IA sabe da W-Tech</label>
                <textarea
                  className={campo}
                  rows={5}
                  disabled={!podeEditar}
                  placeholder="Ex.: A W-Tech vende cursos de suspensão e peças. Os leads chegam por anúncios e são distribuídos entre os atendentes..."
                  value={config.business_info}
                  onChange={(e) => alterarConfig({ business_info: e.target.value })}
                />
                <p className="text-[11px] text-[var(--admin-text-tertiary)] mt-1">
                  Contexto do negócio que entra em toda conversa.
                </p>
              </div>

              <div>
                <label className={rotulo}>Regras extras (guardrails)</label>
                <textarea
                  className={campo}
                  rows={4}
                  disabled={!podeEditar}
                  placeholder="Ex.: Nunca comente salário. Sempre cite o período analisado. Não faça acusação sem dado."
                  value={config.guardrails_extra}
                  onChange={(e) => alterarConfig({ guardrails_extra: e.target.value })}
                />
                <p className="text-[11px] text-[var(--admin-text-tertiary)] mt-1">
                  Somam-se às travas fixas do sistema. Lembre: a IA é somente leitura — ela nunca envia
                  WhatsApp, nunca altera lead e nunca grava nada além do próprio histórico do chat.
                </p>
              </div>

              {botaoSalvarConfig}
            </section>

            {/* ── 2. Motor ───────────────────────────────────────────────── */}
            <section className={`${cartao} space-y-4`}>
              <h4 className="text-sm font-bold text-[var(--admin-text-primary)] flex items-center gap-2">
                <Cpu size={15} /> Motor
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={rotulo}>Modelo</label>
                  <select
                    className={campo}
                    disabled={!podeEditar}
                    value={config.model}
                    onChange={(e) => alterarConfig({ model: e.target.value })}
                  >
                    {MODELOS_DISPONIVEIS.map((m) => (
                      <option key={m.id} value={m.id}>{m.nome}</option>
                    ))}
                  </select>
                  <p className="text-[11px] text-[var(--admin-text-tertiary)] mt-1">
                    {modeloAtual?.nota || 'Selecione um modelo.'}
                  </p>
                  <p className="text-[11px] text-amber-500 font-bold mt-1">
                    O Opus é o mais caro dos três: use-o quando a análise precisar ser profunda.
                  </p>
                </div>

                <div>
                  <label className={rotulo}>Esforço</label>
                  <select
                    className={campo}
                    disabled={!podeEditar}
                    value={config.effort}
                    onChange={(e) => alterarConfig({ effort: e.target.value as NivelEsforco })}
                  >
                    {NIVEIS_ESFORCO.map((n) => (
                      <option key={n} value={n}>{ROTULO_ESFORCO[n]}</option>
                    ))}
                  </select>
                  <p className="text-[11px] text-[var(--admin-text-tertiary)] mt-1">
                    Esforço é o quanto a IA pensa antes de responder: quanto maior, mais cuidadosa é a
                    análise — e mais lenta e mais cara fica a resposta.
                  </p>
                </div>
              </div>

              <div className="md:max-w-xs">
                <label className={rotulo}>Tamanho máximo da resposta (max_tokens)</label>
                <input
                  type="number"
                  min={MAX_TOKENS_PISO}
                  max={MAX_TOKENS_TETO}
                  step={500}
                  className={campo}
                  disabled={!podeEditar}
                  value={config.max_tokens}
                  onChange={(e) => {
                    const bruto = parseInt(e.target.value, 10);
                    const valor = Number.isFinite(bruto) ? bruto : CONFIG_PADRAO.max_tokens;
                    alterarConfig({ max_tokens: Math.min(MAX_TOKENS_TETO, Math.max(MAX_TOKENS_PISO, valor)) });
                  }}
                />
                <p className="text-[11px] text-[var(--admin-text-tertiary)] mt-1">
                  Entre {MAX_TOKENS_PISO.toLocaleString('pt-BR')} e {MAX_TOKENS_TETO.toLocaleString('pt-BR')}.
                  Respostas mais longas custam mais.
                </p>
              </div>

              {botaoSalvarConfig}
            </section>

            {/* ── 3. O que a IA pode dizer ───────────────────────────────── */}
            <section className={cartao}>
              <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
                <h4 className="text-sm font-bold text-[var(--admin-text-primary)] flex items-center gap-2">
                  <BookOpen size={15} /> O que a IA pode dizer ({conhecimento.length})
                </h4>
                <button
                  onClick={adicionarConhecimento}
                  disabled={!podeEditar}
                  className="text-xs font-bold flex items-center gap-1 text-wtech-gold disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Plus size={14} /> Adicionar
                </button>
              </div>

              <datalist id="mc-topicos">
                {Array.from(new Set(conhecimento.map((l) => l.item.topic).filter(Boolean))).map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>

              <div className="space-y-3">
                {conhecimento.map((linha) => (
                  <div key={linha.chave} className="border border-[var(--admin-border)] rounded-lg p-3 bg-[var(--admin-surface-2)]">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                      <input
                        className={`${campo} sm:max-w-[160px]`}
                        list="mc-topicos"
                        placeholder="Tópico"
                        disabled={!podeEditar}
                        value={linha.item.topic}
                        onChange={(e) => alterarConhecimento(linha.chave, { topic: e.target.value })}
                      />
                      <input
                        className={campo}
                        placeholder="Título"
                        disabled={!podeEditar}
                        value={linha.item.title}
                        onChange={(e) => alterarConhecimento(linha.chave, { title: e.target.value })}
                      />
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => alterarConhecimento(linha.chave, { enabled: !linha.item.enabled })}
                          disabled={!podeEditar}
                          title={linha.item.enabled ? 'Ativo' : 'Inativo'}
                          className={`p-2 rounded-lg disabled:opacity-40 ${
                            linha.item.enabled ? 'text-emerald-500 bg-emerald-500/10' : 'text-gray-400 bg-gray-500/10'
                          }`}
                        >
                          <Power size={15} />
                        </button>
                        <button
                          onClick={() => salvarConhecimento(linha.chave)}
                          disabled={!podeEditar || linha.salvando || !linha.sujo}
                          title="Salvar item"
                          className={`p-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed ${
                            linha.sujo ? 'text-wtech-gold bg-wtech-gold/10' : 'text-[var(--admin-text-tertiary)] bg-[var(--admin-surface-3)]'
                          }`}
                        >
                          {linha.salvando ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                        </button>
                        <button
                          onClick={() => pedirExclusaoConhecimento(linha.chave, true)}
                          disabled={!podeEditar || linha.salvando}
                          title="Excluir item"
                          className="p-2 rounded-lg text-red-500 bg-red-500/10 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>

                    <textarea
                      className={campo}
                      rows={3}
                      placeholder="Conteúdo que a IA pode usar ao responder o gerente..."
                      disabled={!podeEditar}
                      value={linha.item.content}
                      onChange={(e) => alterarConhecimento(linha.chave, { content: e.target.value })}
                    />

                    {/* Confirmação de exclusão na própria linha (sem confirm nativo) */}
                    <AnimatePresence>
                      {linha.confirmandoExclusao && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-2 flex items-center justify-between gap-3 flex-wrap rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2">
                            <span className="text-xs font-bold text-[var(--admin-text-primary)]">
                              Excluir "{linha.item.title || 'este item'}" de vez?
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => excluirConhecimento(linha.chave)}
                                className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-xs font-bold"
                              >
                                Excluir
                              </button>
                              <button
                                onClick={() => pedirExclusaoConhecimento(linha.chave, false)}
                                className="px-3 py-1.5 rounded-lg bg-[var(--admin-surface-3)] text-[var(--admin-text-secondary)] text-xs font-bold"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}

                {conhecimento.length === 0 && (
                  <p className="text-xs text-[var(--admin-text-tertiary)] py-4 text-center">
                    Nenhum item ainda. Adicione o que a IA pode falar sobre metas, rotina de atendimento e critérios de avaliação.
                  </p>
                )}
              </div>
            </section>

            {/* ── 4. O que a IA NÃO pode fazer ───────────────────────────── */}
            <section className={cartao}>
              <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
                <h4 className="text-sm font-bold text-[var(--admin-text-primary)] flex items-center gap-2">
                  <ShieldAlert size={15} /> O que a IA NÃO pode fazer ({regras.length})
                </h4>
                <button
                  onClick={adicionarRegra}
                  disabled={!podeEditar}
                  className="text-xs font-bold flex items-center gap-1 text-wtech-gold disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Plus size={14} /> Adicionar
                </button>
              </div>

              <div className="flex flex-wrap gap-3 mb-3">
                {TIPOS_REGRA.map((t) => (
                  <span key={t.id} className={`text-[11px] font-bold ${t.cls}`}>• {t.label}</span>
                ))}
              </div>

              <div className="space-y-2">
                {regras.map((linha) => (
                  <div key={linha.chave} className="border border-[var(--admin-border)] rounded-lg p-3 bg-[var(--admin-surface-2)]">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <select
                        className={`${campo} sm:max-w-[190px]`}
                        disabled={!podeEditar}
                        value={linha.item.type}
                        onChange={(e) => alterarRegra(linha.chave, { type: e.target.value as TipoRegra })}
                      >
                        {TIPOS_REGRA.map((t) => (
                          <option key={t.id} value={t.id}>{t.label}</option>
                        ))}
                      </select>
                      <input
                        className={campo}
                        placeholder="Descreva a regra..."
                        disabled={!podeEditar}
                        value={linha.item.value}
                        onChange={(e) => alterarRegra(linha.chave, { value: e.target.value })}
                      />
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => alterarRegra(linha.chave, { enabled: !linha.item.enabled })}
                          disabled={!podeEditar}
                          title={linha.item.enabled ? 'Ativa' : 'Inativa'}
                          className={`p-2 rounded-lg disabled:opacity-40 ${
                            linha.item.enabled ? 'text-emerald-500 bg-emerald-500/10' : 'text-gray-400 bg-gray-500/10'
                          }`}
                        >
                          <Power size={15} />
                        </button>
                        <button
                          onClick={() => salvarRegra(linha.chave)}
                          disabled={!podeEditar || linha.salvando || !linha.sujo}
                          title="Salvar regra"
                          className={`p-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed ${
                            linha.sujo ? 'text-wtech-gold bg-wtech-gold/10' : 'text-[var(--admin-text-tertiary)] bg-[var(--admin-surface-3)]'
                          }`}
                        >
                          {linha.salvando ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                        </button>
                        <button
                          onClick={() => pedirExclusaoRegra(linha.chave, true)}
                          disabled={!podeEditar || linha.salvando}
                          title="Excluir regra"
                          className="p-2 rounded-lg text-red-500 bg-red-500/10 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>

                    <AnimatePresence>
                      {linha.confirmandoExclusao && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-2 flex items-center justify-between gap-3 flex-wrap rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2">
                            <span className="text-xs font-bold text-[var(--admin-text-primary)]">Excluir esta regra de vez?</span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => excluirRegra(linha.chave)}
                                className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-xs font-bold"
                              >
                                Excluir
                              </button>
                              <button
                                onClick={() => pedirExclusaoRegra(linha.chave, false)}
                                className="px-3 py-1.5 rounded-lg bg-[var(--admin-surface-3)] text-[var(--admin-text-secondary)] text-xs font-bold"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}

                {regras.length === 0 && (
                  <p className="text-xs text-[var(--admin-text-tertiary)] py-4 text-center">
                    Nenhuma regra ainda.
                  </p>
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManagerTrainingPanel;
