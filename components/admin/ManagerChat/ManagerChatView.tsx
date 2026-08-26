import React, { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  PanelLeft,
  GraduationCap,
  BarChart3,
  AlertTriangle,
  X,
  Loader2,
  ShieldCheck,
  Pencil,
  Check,
} from 'lucide-react';
import {
  managerChatApi,
  PERM_TREINAR,
  PERM_AUDITAR,
  type ManagerChatThread,
  type ManagerChatMessage,
  type ManagerChatStatus,
} from '../../../lib/managerChat';
import { createHasPermission } from '../../../lib/permissions';
import { PageHeader } from '../ui/PageHeader';
import { ThreadList } from './ThreadList';
import { ChatMessages } from './ChatMessages';
import { ChatComposer } from './ChatComposer';
import { ManagerTrainingPanel } from './ManagerTrainingPanel';
import { ManagerChatReport } from './ManagerChatReport';

interface ManagerChatViewProps {
  user: any;
  permissions: any;
}

/** Perguntas de partida, escritas para quem gerencia a equipe da W-Tech. */
const SUGESTOES = [
  'Como está o atendimento do Michael nos últimos 30 dias?',
  'Quais leads estão parados há mais de 7 dias e com quem?',
  'Quem tem o maior tempo de resposta no WhatsApp?',
  'Compare a conversão do Emerson com a do Christopher neste mês',
  'Onde a equipe está perdendo venda: no primeiro contato ou no fechamento?',
  'Resuma os pontos fracos de atendimento que apareceram esta semana',
];

/** Mensagem só do lado do cliente (otimista ou erro) — nunca vai para o banco. */
function mensagemLocal(
  threadId: string,
  parcial: Partial<ManagerChatMessage> & Pick<ManagerChatMessage, 'role'>
): ManagerChatMessage {
  return {
    id: `local-${Math.random().toString(36).slice(2)}`,
    thread_id: threadId,
    role: parcial.role,
    content: parcial.content ?? '',
    tool_calls: null,
    model: null,
    input_tokens: null,
    output_tokens: null,
    cache_read_tokens: null,
    latency_ms: null,
    error: parcial.error ?? null,
    created_at: new Date().toISOString(),
  };
}

function ordenarThreads(lista: ManagerChatThread[]): ManagerChatThread[] {
  return [...lista].sort(
    (a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime()
  );
}

export const ManagerChatView: React.FC<ManagerChatViewProps> = ({ user, permissions }) => {
  const has = createHasPermission(user, permissions);

  const [status, setStatus] = useState<ManagerChatStatus | null>(null);
  const [threads, setThreads] = useState<ManagerChatThread[]>([]);
  const [ativa, setAtiva] = useState<string | null>(null);
  const [mensagens, setMensagens] = useState<ManagerChatMessage[]>([]);
  // Conversa longa é cortada no servidor. Guardamos quantas mensagens sobraram
  // para DECLARAR o corte na tela — silêncio aqui vira "sumiu o começo da conversa".
  const [truncadoEm, setTruncadoEm] = useState<number | null>(null);
  const [carregandoThreads, setCarregandoThreads] = useState(true);
  const [carregandoMensagens, setCarregandoMensagens] = useState(false);
  const [pensando, setPensando] = useState(false);
  const [erroGlobal, setErroGlobal] = useState<string | null>(null);
  const [listaAberta, setListaAberta] = useState(false);
  const [painel, setPainel] = useState<'treinamento' | 'relatorio' | null>(null);
  // Renomear a conversa aberta (consumidor de managerChatApi.renomearThread).
  const [editandoTitulo, setEditandoTitulo] = useState(false);
  const [rascunhoTitulo, setRascunhoTitulo] = useState('');

  // O servidor é a autoridade sobre permissão; a checagem local evita piscar botão.
  const podeTreinar = has(PERM_TREINAR) || !!status?.pode_treinar;
  const podeAuditar = has(PERM_AUDITAR) || !!status?.pode_auditar;
  const iaDesligada = status !== null && status.ia_configurada === false;

  // ─── Carga inicial ───────────────────────────────────────────────────────
  useEffect(() => {
    let vivo = true;

    (async () => {
      // O status é informativo: se falhar, o chat continua utilizável.
      try {
        const s = await managerChatApi.status();
        if (vivo) setStatus(s);
      } catch {
        /* silencioso de propósito — o erro real aparece ao listar/enviar */
      }

      try {
        const { threads: lista } = await managerChatApi.listarThreads();
        if (!vivo) return;
        const ordenadas = ordenarThreads(lista);
        setThreads(ordenadas);
        if (ordenadas.length > 0) setAtiva(ordenadas[0].id);
      } catch (e: any) {
        if (vivo) setErroGlobal(e?.message || 'Não foi possível carregar suas conversas.');
      } finally {
        if (vivo) setCarregandoThreads(false);
      }
    })();

    return () => {
      vivo = false;
    };
  }, []);

  // ─── Mensagens da conversa ativa ─────────────────────────────────────────
  useEffect(() => {
    if (!ativa) {
      setMensagens([]);
      setTruncadoEm(null);
      return;
    }
    let vivo = true;
    setCarregandoMensagens(true);

    (async () => {
      try {
        const { messages, truncado, limite } = await managerChatApi.listarMensagens(ativa);
        if (vivo) {
          setMensagens(messages);
          // O servidor avisa quando cortou o começo da conversa. Jogar esse aviso
          // fora faz o gerente rolar para cima, não achar o início e concluir que
          // o histórico se perdeu. `limite` é o teto do servidor; sem ele, mostramos
          // o que de fato chegou.
          setTruncadoEm(truncado ? (limite ?? messages.length) : null);
        }
      } catch (e: any) {
        if (vivo) {
          setMensagens([]);
          setTruncadoEm(null);
          setErroGlobal(e?.message || 'Não foi possível abrir esta conversa.');
        }
      } finally {
        if (vivo) setCarregandoMensagens(false);
      }
    })();

    return () => {
      vivo = false;
    };
  }, [ativa]);

  // Trocar de conversa cancela uma renomeação em curso — senão o título digitado
  // para uma conversa acabaria salvo em outra.
  useEffect(() => {
    setEditandoTitulo(false);
  }, [ativa]);

  // Esc fecha o painel aberto (treinamento / relatório).
  useEffect(() => {
    if (!painel) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPainel(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [painel]);

  // ─── Ações ───────────────────────────────────────────────────────────────

  const selecionar = useCallback((id: string) => {
    setAtiva(id);
    setListaAberta(false);
    setErroGlobal(null);
  }, []);

  const novaConversa = useCallback(async () => {
    setErroGlobal(null);
    try {
      const { thread } = await managerChatApi.criarThread();
      setThreads((atual) => ordenarThreads([thread, ...atual]));
      setAtiva(thread.id);
      setMensagens([]);
      setTruncadoEm(null);
      setListaAberta(false);
    } catch (e: any) {
      setErroGlobal(e?.message || 'Não foi possível criar a conversa.');
    }
  }, []);

  const arquivar = useCallback(
    async (id: string) => {
      if (!window.confirm('Arquivar esta conversa? Ela sai da sua lista, mas continua guardada para auditoria.')) {
        return;
      }
      const anterior = threads;
      const restantes = threads.filter((t) => t.id !== id);
      setThreads(restantes); // otimista
      if (ativa === id) setAtiva(restantes[0]?.id ?? null);

      try {
        await managerChatApi.arquivarThread(id);
      } catch (e: any) {
        setThreads(anterior); // desfaz
        setErroGlobal(e?.message || 'Não foi possível arquivar a conversa.');
      }
    },
    [threads, ativa]
  );

  const abrirRenomear = useCallback(() => {
    if (!ativa) return;
    setRascunhoTitulo(threads.find((t) => t.id === ativa)?.title?.trim() || '');
    setEditandoTitulo(true);
  }, [ativa, threads]);

  const confirmarRenomear = useCallback(async () => {
    const alvo = ativa;
    const novo = rascunhoTitulo.trim();
    setEditandoTitulo(false);
    if (!alvo) return;

    const anterior = threads;
    const atualAtual = anterior.find((t) => t.id === alvo);
    // Título vazio ou inalterado não vira requisição — evita gravar lixo no banco.
    if (!novo || novo === (atualAtual?.title ?? '').trim()) return;

    // Otimista: o gerente vê o novo nome na hora; se o servidor recusar, volta.
    setThreads((atual) => ordenarThreads(atual.map((t) => (t.id === alvo ? { ...t, title: novo } : t))));

    try {
      const { thread } = await managerChatApi.renomearThread(alvo, novo);
      setThreads((atual) => ordenarThreads(atual.map((t) => (t.id === thread.id ? thread : t))));
    } catch (e: any) {
      setThreads(anterior);
      setErroGlobal(e?.message || 'Não foi possível renomear a conversa.');
    }
  }, [ativa, rascunhoTitulo, threads]);

  const enviar = useCallback(
    async (texto: string) => {
      if (pensando) return;
      setErroGlobal(null);

      // Sem conversa aberta? Cria uma antes de perguntar.
      let threadId = ativa;
      if (!threadId) {
        try {
          const { thread } = await managerChatApi.criarThread();
          threadId = thread.id;
          setThreads((atual) => ordenarThreads([thread, ...atual]));
          setAtiva(thread.id);
          setMensagens([]);
          setTruncadoEm(null);
        } catch (e: any) {
          setErroGlobal(e?.message || 'Não foi possível criar a conversa.');
          return;
        }
      }

      const idDaVez = threadId;
      setMensagens((atual) => [...atual, mensagemLocal(idDaVez, { role: 'user', content: texto })]);
      setPensando(true);

      try {
        const { message, thread } = await managerChatApi.perguntar(idDaVez, texto);
        setMensagens((atual) => [...atual, message]);
        setThreads((atual) => ordenarThreads(atual.map((t) => (t.id === thread.id ? thread : t))));
      } catch (e: any) {
        // Erro vira balão dentro da conversa — nada de alert().
        setMensagens((atual) => [
          ...atual,
          mensagemLocal(idDaVez, { role: 'assistant', error: e?.message || 'A IA não conseguiu responder.' }),
        ]);
      } finally {
        setPensando(false);
      }
    },
    [ativa, pensando]
  );

  // ─── Render ──────────────────────────────────────────────────────────────

  const conversaVazia = !carregandoMensagens && mensagens.length === 0 && !pensando;
  const threadAtiva = threads.find((t) => t.id === ativa) ?? null;

  return (
    <div className="flex flex-col h-[calc(100dvh-7rem)] min-h-[520px]">
      <PageHeader
        icon={Sparkles}
        title="Chat da Gerência"
        subtitle="Pergunte à IA como anda o atendimento da equipe"
      >
        <button
          type="button"
          onClick={() => setListaAberta(true)}
          className="md:hidden flex items-center justify-center gap-2 h-10 px-3 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-1)] text-[var(--admin-text-secondary)] text-sm font-semibold"
        >
          <PanelLeft size={16} />
          Conversas
        </button>

        {podeTreinar && (
          <button
            type="button"
            onClick={() => setPainel('treinamento')}
            className="flex items-center justify-center gap-2 h-10 px-3 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-1)] text-[var(--admin-text-secondary)] text-sm font-semibold hover:text-[var(--admin-text-primary)] transition-colors"
          >
            <GraduationCap size={16} />
            <span className="hidden sm:inline">Treinamento</span>
          </button>
        )}

        {podeAuditar && (
          <button
            type="button"
            onClick={() => setPainel('relatorio')}
            className="flex items-center justify-center gap-2 h-10 px-3 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-1)] text-[var(--admin-text-secondary)] text-sm font-semibold hover:text-[var(--admin-text-primary)] transition-colors"
          >
            <BarChart3 size={16} />
            <span className="hidden sm:inline">Relatório</span>
          </button>
        )}
      </PageHeader>

      {/* Aviso permanente: chave da Anthropic ausente no servidor. */}
      {iaDesligada && (
        <div className="mb-3 flex items-start gap-3 rounded-2xl border border-[var(--admin-warning)]/30 bg-[var(--admin-warning-muted)] p-4">
          <AlertTriangle size={18} className="text-[var(--admin-warning)] shrink-0 mt-0.5" />
          <div className="text-sm text-[var(--admin-text-primary)]">
            <p className="font-bold">A inteligência ainda não foi ligada.</p>
            <p className="text-[var(--admin-text-secondary)] mt-0.5 leading-relaxed">
              Falta cadastrar a <code className="font-mono text-xs">ANTHROPIC_API_KEY</code> no servidor. Até lá o chat
              abre normalmente e guarda todo o histórico, mas as perguntas ficam sem resposta.
            </p>
          </div>
        </div>
      )}

      {/* Falha de carregamento (lista, abertura de conversa, arquivamento). */}
      {erroGlobal && (
        <div className="mb-3 flex items-start gap-3 rounded-2xl border border-[var(--admin-danger)]/30 bg-[var(--admin-danger-muted)] p-4">
          <AlertTriangle size={18} className="text-[var(--admin-danger)] shrink-0 mt-0.5" />
          <p className="flex-1 text-sm text-[var(--admin-text-primary)] whitespace-pre-line">{erroGlobal}</p>
          <button
            type="button"
            onClick={() => setErroGlobal(null)}
            aria-label="Fechar aviso"
            className="p-1 text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)]"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Corpo: lista + conversa.
          É `relative` de propósito: os painéis de Treinamento e Relatório se
          posicionam com `absolute inset-0` e cobrem exatamente esta área. */}
      <div className="relative flex flex-1 min-h-0 rounded-2xl border border-[var(--admin-border)] overflow-hidden bg-[var(--admin-surface-1)]">
        {/* Coluna de conversas — desktop */}
        <aside className="hidden md:flex w-72 shrink-0 border-r border-[var(--admin-border)]">
          <ThreadList
            threads={threads}
            ativa={ativa}
            onSelecionar={selecionar}
            onNova={novaConversa}
            onArquivar={arquivar}
            carregando={carregandoThreads}
          />
        </aside>

        {/* Coluna de conversas — mobile (gaveta) */}
        <AnimatePresence>
          {listaAberta && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setListaAberta(false)}
                className="md:hidden fixed inset-0 z-40 bg-black/40"
              />
              <motion.aside
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'tween', duration: 0.22 }}
                className="md:hidden fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] border-r border-[var(--admin-border)] shadow-2xl"
              >
                <div className="flex items-center justify-between px-3 py-2.5 border-b border-[var(--admin-border)] bg-[var(--admin-surface-1)]">
                  <span className="text-sm font-bold text-[var(--admin-text-primary)]">Conversas</span>
                  <button
                    type="button"
                    onClick={() => setListaAberta(false)}
                    aria-label="Fechar lista de conversas"
                    className="p-1.5 text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)]"
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className="h-[calc(100%-45px)]">
                  <ThreadList
                    threads={threads}
                    ativa={ativa}
                    onSelecionar={selecionar}
                    onNova={novaConversa}
                    onArquivar={arquivar}
                    carregando={carregandoThreads}
                  />
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Conversa ativa */}
        <section className="flex-1 flex flex-col min-w-0">
          {/* Cabeçalho da conversa aberta: único lugar onde o gerente renomeia
              (a coluna da esquerda é um componente de apresentação e não decide nada). */}
          {threadAtiva && (
            <div className="shrink-0 flex items-center gap-2 px-4 py-2 border-b border-[var(--admin-border)] bg-[var(--admin-surface-1)]">
              {editandoTitulo ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void confirmarRenomear();
                  }}
                  className="flex-1 flex items-center gap-2 min-w-0"
                >
                  <input
                    autoFocus
                    value={rascunhoTitulo}
                    onChange={(e) => setRascunhoTitulo(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') setEditandoTitulo(false);
                    }}
                    maxLength={120}
                    placeholder="Nome da conversa"
                    aria-label="Nome da conversa"
                    className="flex-1 min-w-0 h-8 px-2.5 rounded-lg border border-wtech-gold/50 bg-[var(--admin-surface-2)] text-sm text-[var(--admin-text-primary)] outline-none"
                  />
                  <button
                    type="submit"
                    title="Salvar nome"
                    aria-label="Salvar nome da conversa"
                    className="p-1.5 rounded-lg text-wtech-gold hover:bg-[var(--admin-accent-gold-muted)] transition-colors"
                  >
                    <Check size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditandoTitulo(false)}
                    title="Cancelar"
                    aria-label="Cancelar renomeação"
                    className="p-1.5 rounded-lg text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)] transition-colors"
                  >
                    <X size={15} />
                  </button>
                </form>
              ) : (
                <>
                  <h2
                    onDoubleClick={abrirRenomear}
                    title="Dê dois cliques para renomear"
                    className="flex-1 min-w-0 truncate text-sm font-bold text-[var(--admin-text-primary)] cursor-text"
                  >
                    {threadAtiva.title?.trim() || 'Nova conversa'}
                  </h2>
                  <button
                    type="button"
                    onClick={abrirRenomear}
                    title="Renomear conversa"
                    aria-label="Renomear conversa"
                    className="shrink-0 p-1.5 rounded-lg text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)] hover:bg-[var(--admin-surface-2)] transition-colors"
                  >
                    <Pencil size={14} />
                  </button>
                </>
              )}
            </div>
          )}

          {carregandoMensagens ? (
            <div className="flex-1 flex items-center justify-center gap-2 text-sm text-[var(--admin-text-tertiary)] bg-[var(--admin-surface-2)]">
              <Loader2 size={16} className="animate-spin" />
              Abrindo conversa…
            </div>
          ) : conversaVazia ? (
            // Estado vazio com perguntas prontas.
            <div className="flex-1 overflow-y-auto bg-[var(--admin-surface-2)] px-4 py-8 md:px-8">
              <div className="max-w-2xl mx-auto text-center">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-[var(--admin-accent-gold-muted)] text-wtech-gold flex items-center justify-center">
                  <Sparkles size={26} />
                </div>
                <h2 className="mt-4 text-xl font-black tracking-tight text-[var(--admin-text-primary)]">
                  O que você quer saber sobre a equipe?
                </h2>
                <p className="mt-2 text-sm text-[var(--admin-text-secondary)] leading-relaxed">
                  Eu leio as métricas e o conteúdo das conversas de WhatsApp de cada colaborador. Pergunte em português
                  normal — respondo com números e exemplos reais.
                </p>

                <div className="mt-6 grid gap-2 sm:grid-cols-2 text-left">
                  {SUGESTOES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => enviar(s)}
                      disabled={pensando}
                      className="group rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface-1)] p-3.5 text-sm text-[var(--admin-text-secondary)] hover:border-wtech-gold/50 hover:text-[var(--admin-text-primary)] transition-colors disabled:opacity-50"
                    >
                      {s}
                    </button>
                  ))}
                </div>

                <p className="mt-6 inline-flex items-center gap-1.5 text-[11px] text-[var(--admin-text-tertiary)]">
                  <ShieldCheck size={13} />
                  Somente leitura: a IA não envia mensagens nem altera nada no sistema.
                </p>
              </div>
            </div>
          ) : (
            <ChatMessages
              mensagens={mensagens}
              pensando={pensando}
              podeAuditar={podeAuditar}
              truncadoEm={truncadoEm}
            />
          )}

          <ChatComposer
            onEnviar={enviar}
            desabilitado={pensando || carregandoMensagens}
            placeholder={
              iaDesligada
                ? 'A IA está desligada — sua pergunta fica salva no histórico'
                : 'Pergunte sobre o atendimento da equipe…'
            }
          />
        </section>

        {/* Painéis auxiliares: cobrem a área do chat (eles mesmos usam absolute inset-0). */}
        {painel === 'treinamento' && (
          <ManagerTrainingPanel podeEditar={podeTreinar} onFechar={() => setPainel(null)} />
        )}
        {painel === 'relatorio' && <ManagerChatReport onFechar={() => setPainel(null)} />}
      </div>
    </div>
  );
};

export default ManagerChatView;
