import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MessageCircle, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import {
  CloudConversation,
  CloudMessage,
  CloudStatus,
  fetchConversations,
  fetchMessages,
  markConversationRead,
  subscribeToChanges,
  getCloudStatus,
} from '../../../../lib/whatsappCloud';
import ConversationList from './ConversationList';
import ChatThread from './ChatThread';
import MessageComposer from './MessageComposer';

/**
 * Inbox estilo WhatsApp Web conectado à WhatsApp Cloud API (Meta).
 * Módulo separado da automação via Evolution API.
 */
const WhatsAppCloudInbox: React.FC = () => {
  const [conversations, setConversations] = useState<CloudConversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<CloudMessage[]>([]);
  const [status, setStatus] = useState<CloudStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const selectedIdRef = useRef<string | null>(null);
  selectedIdRef.current = selectedId;

  const loadConversations = useCallback(async () => {
    const convs = await fetchConversations();
    setConversations(convs);
    return convs;
  }, []);

  const loadMessages = useCallback(async (conversationId: string) => {
    const msgs = await fetchMessages(conversationId);
    setMessages(msgs);
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

  // Realtime: ao mudar conversas/mensagens, recarrega o necessário.
  useEffect(() => {
    const unsub = subscribeToChanges(() => {
      loadConversations();
      if (selectedIdRef.current) loadMessages(selectedIdRef.current);
    });
    return unsub;
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

  const selectedConv = conversations.find((c) => c.id === selectedId) || null;
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
              {status?.configured ? (
                <span className="flex items-center gap-1 text-[#25D366]">
                  <Wifi size={12} /> Conectado
                  {status.displayNumber ? ` · ${status.displayNumber}` : ''}
                </span>
              ) : (
                <span className="flex items-center gap-1 text-amber-500">
                  <WifiOff size={12} /> Não configurado (defina as variáveis de ambiente)
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
          <ConversationList
            conversations={conversations}
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
              />
              <MessageComposer
                conversation={selectedConv}
                disabled={!status?.configured}
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
