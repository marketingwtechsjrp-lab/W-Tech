import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MessageCircle, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import {
  CloudConversation,
  CloudMessage,
  CloudStatus,
  fetchConversations,
  fetchMessages,
  fetchMessagesSignature,
  messagesSignature,
  markConversationRead,
  subscribeToChanges,
  getCloudStatus,
  assumeConversation,
  releaseToAI,
  closeConversation,
  transferConversation,
} from '../../../../lib/whatsappCloud';
import { supabase } from '../../../../lib/supabaseClient';
import { useAuth } from '../../../../context/AuthContext';
import { createHasPermission } from '../../../../lib/permissions';
import { analyzeAndLearn } from '../../../../lib/waAnalysis';
import ConversationList from './ConversationList';
import ChatThread from './ChatThread';
import MessageComposer from './MessageComposer';

type InboxFilter = 'todas' | 'minhas' | 'sem_dono' | 'ia';

const FILTER_TABS: { id: InboxFilter; label: string }[] = [
  { id: 'todas', label: 'Todas' },
  { id: 'minhas', label: 'Minhas' },
  { id: 'sem_dono', label: 'Sem dono' },
  { id: 'ia', label: 'IA' },
];

/**
 * De quanto em quanto tempo o inbox procura novidades. O Postgres da VPS não
 * roda o serviço de Realtime do Supabase (só o PostgREST), então o websocket de
 * `subscribeToChanges` nunca conecta e o polling é o que mantém o inbox vivo.
 */
const POLL_INTERVAL_MS = 10_000;

/**
 * Inbox estilo WhatsApp Web conectado à WhatsApp Cloud API (Meta).
 * Módulo separado da automação via Evolution API.
 */
interface InboxProps {
  /** Ver todas as conversas; senão, só as atribuídas ao próprio usuário. */
  canViewAll?: boolean;
}

const WhatsAppCloudInbox: React.FC<InboxProps> = ({ canViewAll = true }) => {
  const { user } = useAuth();
  const currentUserId = user?.id;
  const can = createHasPermission(user);
  const canAssume = can('whatsapp_assume') || can('crm_view');
  const [conversations, setConversations] = useState<CloudConversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<CloudMessage[]>([]);
  const [status, setStatus] = useState<CloudStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<InboxFilter>(canViewAll ? 'todas' : 'minhas');
  const [usersMap, setUsersMap] = useState<Record<string, string>>({});

  const selectedIdRef = useRef<string | null>(null);
  selectedIdRef.current = selectedId;

  /** Assinatura da thread aberta, para o polling saber se algo mudou. */
  const messagesSigRef = useRef<string>('');

  // Mapa de id→nome dos atendentes (para mostrar quem assumiu).
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('SITE_Users').select('id, name');
      if (data) {
        const map: Record<string, string> = {};
        data.forEach((u: any) => { map[u.id] = u.name; });
        setUsersMap(map);
      }
    })();
  }, []);

  const handleAssume = useCallback(async () => {
    if (!selectedIdRef.current || !currentUserId) return;
    const id = selectedIdRef.current;
    await assumeConversation(id, currentUserId);
    await loadConversationsRef.current?.();
    void analyzeAndLearn(id); // análise de bastidor (best-effort)
  }, [currentUserId]);

  const handleRelease = useCallback(async () => {
    if (!selectedIdRef.current) return;
    await releaseToAI(selectedIdRef.current);
    await loadConversationsRef.current?.();
  }, []);

  const handleClose = useCallback(async () => {
    if (!selectedIdRef.current) return;
    const id = selectedIdRef.current;
    await closeConversation(id);
    await loadConversationsRef.current?.();
    void analyzeAndLearn(id); // resumo + aprendizado RAG ao encerrar
  }, []);

  const handleTransfer = useCallback(async (toUserId: string) => {
    if (!selectedIdRef.current) return;
    const id = selectedIdRef.current;
    await transferConversation(id, toUserId, currentUserId);
    await loadConversationsRef.current?.();
    void analyzeAndLearn(id); // análise de bastidor ao transferir
  }, [currentUserId]);

  const loadConversationsRef = useRef<(() => Promise<CloudConversation[]>) | null>(null);

  const loadConversations = useCallback(async () => {
    // Privacidade aplicada na consulta: sem "ver todas", busca só as atribuídas a mim.
    const convs = await fetchConversations(
      canViewAll ? undefined : { onlyAssigned: true, assignedTo: currentUserId }
    );
    setConversations(convs);
    return convs;
  }, [canViewAll, currentUserId]);
  loadConversationsRef.current = loadConversations;

  const loadMessages = useCallback(async (conversationId: string) => {
    const msgs = await fetchMessages(conversationId);
    setMessages(msgs);
    messagesSigRef.current = messagesSignature(msgs);
  }, []);

  // Carga inicial + status da conexão.
  useEffect(() => {
    (async () => {
      setLoading(true);
      const [, st] = await Promise.all([loadConversations(), getCloudStatus()]);
      setStatus(st);
      setLoading(false);
    })();
  }, [loadConversations]);

  // Realtime: ao mudar conversas/mensagens, recarrega o necessário. Só funciona
  // onde o serviço de Realtime existe; fica aqui para voltar sozinho a valer
  // caso ele suba na VPS. Enquanto não sobe, quem atualiza é o polling abaixo.
  useEffect(() => {
    const unsub = subscribeToChanges(() => {
      loadConversations();
      if (selectedIdRef.current) loadMessages(selectedIdRef.current);
    });
    return unsub;
  }, [loadConversations, loadMessages]);

  // Polling: mantém a lista e a conversa aberta atualizadas sem depender do
  // websocket. A thread só é recarregada quando a assinatura muda — recarregar
  // à toa rolaria o ChatThread para o fim enquanto o atendente lê o histórico,
  // e rebaixaria o base64 de toda mídia da conversa a cada ciclo.
  useEffect(() => {
    let cancelled = false;
    let running = false;

    const tick = async () => {
      if (running || cancelled || document.hidden) return;
      running = true;
      try {
        await loadConversations();
        const id = selectedIdRef.current;
        if (!id || cancelled) return;
        const sig = await fetchMessagesSignature(id);
        // Descarta se a conversa mudou durante a consulta ou se ela falhou.
        if (cancelled || sig === null || id !== selectedIdRef.current) return;
        if (sig !== messagesSigRef.current) await loadMessages(id);
      } catch (e: any) {
        console.error('[Inbox] polling falhou:', e?.message || e);
      } finally {
        running = false;
      }
    };

    const timer = setInterval(tick, POLL_INTERVAL_MS);
    // Volta a sincronizar assim que a aba reaparece, sem esperar o próximo ciclo.
    document.addEventListener('visibilitychange', tick);
    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [loadConversations, loadMessages]);

  const handleSelect = useCallback(
    async (conv: CloudConversation) => {
      setSelectedId(conv.id);
      await loadMessages(conv.id);
      if (conv.unread_count > 0) {
        await markConversationRead(conv.id);
        setConversations((prev) =>
          prev.map((c) => (c.id === conv.id ? { ...c, unread_count: 0 } : c))
        );
      }
    },
    [loadMessages]
  );

  const handleManualRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadConversations();
    if (selectedIdRef.current) await loadMessages(selectedIdRef.current);
    setRefreshing(false);
  }, [loadConversations, loadMessages]);

  const handleSent = useCallback(async () => {
    if (selectedIdRef.current) await loadMessages(selectedIdRef.current);
    await loadConversations();
  }, [loadConversations, loadMessages]);

  const filteredConversations = conversations.filter((c) => {
    // Sem permissão de "ver todas", o usuário só enxerga as conversas atribuídas a ele.
    if (!canViewAll) return c.assigned_to === currentUserId;
    if (filter === 'minhas') return c.assigned_to === currentUserId;
    if (filter === 'sem_dono') return !c.assigned_to && c.status !== 'encerrado';
    if (filter === 'ia') return (c.status || 'bot') === 'bot';
    return true;
  });

  const selectedConv = conversations.find((c) => c.id === selectedId) || null;
  const assigneeName = selectedConv?.assigned_to ? (usersMap[selectedConv.assigned_to] || 'Atendente') : null;
  const lastInboundAt = [...messages].reverse().find((m) => m.direction === 'in')?.timestamp || null;

  return (
    <div className="flex flex-col h-[calc(100dvh-7rem)] bg-gray-50 dark:bg-[#0b141a] rounded-xl overflow-hidden border border-gray-200 dark:border-white/10">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-white dark:bg-[#202c33] border-b border-gray-200 dark:border-white/10 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-[#25D366]/15 flex items-center justify-center text-[#25D366]">
            <MessageCircle size={20} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">
              WhatsApp — Meta Cloud API
            </h2>
            <div className="flex items-center gap-1.5 text-xs">
              {status?.live ? (
                <span className="flex items-center gap-1 text-[#25D366]">
                  <Wifi size={12} /> Conectado
                  {status.displayNumber ? ` · ${status.displayNumber}` : ''}
                </span>
              ) : status?.configured ? (
                <span
                  className="flex items-center gap-1 text-amber-500"
                  title={status?.liveError || undefined}
                >
                  <WifiOff size={12} /> Token sem acesso ao número — verifique em Configurações → Integrações
                </span>
              ) : (
                <span className="flex items-center gap-1 text-amber-500">
                  <WifiOff size={12} /> Não configurado (preencha em Configurações → Integrações)
                </span>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={handleManualRefresh}
          className="p-2 rounded-lg text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
          title="Atualizar"
        >
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Corpo */}
      <div className="flex flex-1 min-h-0">
        {/* Lista de conversas */}
        <div
          className={`${
            selectedId ? 'hidden md:flex' : 'flex'
          } w-full md:w-80 lg:w-96 shrink-0 flex-col border-r border-gray-200 dark:border-white/10 bg-white dark:bg-[#111b21]`}
        >
          {/* Filtros de atendimento (só para quem pode ver todas as conversas) */}
          {canViewAll && <div className="flex items-center gap-1 px-2.5 pt-2.5 shrink-0">
            {FILTER_TABS.map((t) => {
              const count = t.id === 'todas' ? conversations.length
                : t.id === 'minhas' ? conversations.filter((c) => c.assigned_to === currentUserId).length
                : t.id === 'sem_dono' ? conversations.filter((c) => !c.assigned_to && c.status !== 'encerrado').length
                : conversations.filter((c) => (c.status || 'bot') === 'bot').length;
              return (
                <button
                  key={t.id}
                  onClick={() => setFilter(t.id)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors ${
                    filter === t.id
                      ? 'bg-[#25D366] text-white'
                      : 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10'
                  }`}
                >
                  {t.label} {count > 0 && <span className="opacity-70">({count})</span>}
                </button>
              );
            })}
          </div>}
          <ConversationList
            conversations={filteredConversations}
            selectedId={selectedId}
            loading={loading}
            onSelect={handleSelect}
          />
        </div>

        {/* Thread + composer */}
        <div className={`${selectedId ? 'flex' : 'hidden md:flex'} flex-col flex-1 min-w-0`}>
          {selectedConv ? (
            <>
              <ChatThread
                conversation={selectedConv}
                messages={messages}
                onBack={() => setSelectedId(null)}
                currentUserId={currentUserId}
                assigneeName={assigneeName}
                canAssume={canAssume}
                users={usersMap}
                onAssume={handleAssume}
                onRelease={handleRelease}
                onClose={handleClose}
                onTransfer={handleTransfer}
              />
              <MessageComposer
                conversation={selectedConv}
                disabled={!status?.live}
                lastInboundAt={lastInboundAt}
                onSent={handleSent}
              />
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center text-center p-8 text-gray-400 dark:text-gray-500">
              <MessageCircle size={56} strokeWidth={1.2} className="mb-3 opacity-40" />
              <p className="text-sm">Selecione uma conversa para começar</p>
              <p className="text-xs mt-1 opacity-70">
                As mensagens recebidas no número da Meta aparecem aqui em tempo real.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WhatsAppCloudInbox;
