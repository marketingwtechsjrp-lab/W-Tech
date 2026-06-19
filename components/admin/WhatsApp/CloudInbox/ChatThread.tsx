import React, { useRef, useEffect } from 'react';
import { ArrowLeft, Check, CheckCheck, AlertCircle, FileText, Download } from 'lucide-react';
import { CloudConversation, CloudMessage } from '../../../../lib/whatsappCloud';

interface Props {
  conversation: CloudConversation;
  messages: CloudMessage[];
  onBack: () => void;
}

function formatPhone(waId: string): string {
  const d = waId.replace(/\D/g, '');
  if (d.length === 13) return `+${d.slice(0, 2)} ${d.slice(2, 4)} ${d.slice(4, 9)}-${d.slice(9)}`;
  if (d.length === 12) return `+${d.slice(0, 2)} ${d.slice(2, 4)} ${d.slice(4, 8)}-${d.slice(8)}`;
  return `+${d}`;
}

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function dayLabel(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) return 'Hoje';
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return 'Ontem';
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

const StatusTicks: React.FC<{ status: string | null }> = ({ status }) => {
  if (status === 'failed') return <AlertCircle size={14} className="text-red-400" />;
  if (status === 'read') return <CheckCheck size={14} className="text-sky-400" />;
  if (status === 'delivered') return <CheckCheck size={14} className="text-gray-400" />;
  return <Check size={14} className="text-gray-400" />;
};

const MediaBlock: React.FC<{ msg: CloudMessage }> = ({ msg }) => {
  if (!msg.media_data) {
    return <div className="text-xs italic opacity-70 py-1">[mídia indisponível]</div>;
  }
  switch (msg.type) {
    case 'image':
    case 'sticker':
      return (
        <a href={msg.media_data} target="_blank" rel="noopener noreferrer">
          <img
            src={msg.media_data}
            alt="imagem"
            className="rounded-lg max-w-[260px] max-h-[320px] object-cover"
          />
        </a>
      );
    case 'audio':
      return <audio controls src={msg.media_data} className="max-w-[260px] mt-1" />;
    case 'video':
      return <video controls src={msg.media_data} className="rounded-lg max-w-[260px] max-h-[320px]" />;
    case 'document':
      return (
        <a
          href={msg.media_data}
          download={msg.media_filename || 'documento'}
          className="flex items-center gap-2 py-1.5 px-2 rounded-lg bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 transition-colors"
        >
          <FileText size={20} className="shrink-0" />
          <span className="text-xs truncate flex-1">{msg.media_filename || 'Documento'}</span>
          <Download size={15} className="shrink-0 opacity-70" />
        </a>
      );
    default:
      return null;
  }
};

const ChatThread: React.FC<Props> = ({ conversation, messages, onBack }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const name = conversation.profile_name || formatPhone(conversation.wa_id);

  let lastDay = '';

  return (
    <>
      {/* Cabeçalho da conversa */}
      <div className="flex items-center gap-3 px-3 py-2.5 bg-white dark:bg-[#202c33] border-b border-gray-200 dark:border-white/10 shrink-0">
        <button
          onClick={onBack}
          className="md:hidden p-1 text-gray-500 dark:text-gray-300"
          aria-label="Voltar"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#25D366] to-[#128C7E] flex items-center justify-center text-white text-xs font-semibold shrink-0">
          {(name[0] || '?').toUpperCase()}
        </div>
        <div className="min-w-0">
          <div className="font-medium text-sm text-gray-900 dark:text-white truncate">{name}</div>
          <div className="text-xs text-gray-400 truncate">{formatPhone(conversation.wa_id)}</div>
        </div>
      </div>

      {/* Mensagens */}
      <div className="flex-1 overflow-y-auto px-3 md:px-8 py-4 space-y-1 bg-[#efeae2] dark:bg-[#0b141a] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9InJnYmEoMCwwLDAsMC4wMykiLz48L3N2Zz4=')]">
        {messages.map((msg) => {
          const isOut = msg.direction === 'out';
          const day = dayLabel(msg.timestamp);
          const showDay = day !== lastDay;
          lastDay = day;
          return (
            <React.Fragment key={msg.id}>
              {showDay && (
                <div className="flex justify-center my-3">
                  <span className="text-[11px] px-3 py-1 rounded-md bg-white/80 dark:bg-[#182229] text-gray-500 dark:text-gray-300 shadow-sm">
                    {day}
                  </span>
                </div>
              )}
              <div className={`flex ${isOut ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[78%] md:max-w-[65%] rounded-lg px-2.5 py-1.5 shadow-sm ${
                    isOut
                      ? 'bg-[#d9fdd3] dark:bg-[#005c4b] text-gray-900 dark:text-white'
                      : 'bg-white dark:bg-[#202c33] text-gray-900 dark:text-white'
                  }`}
                >
                  {msg.type !== 'text' && (
                    <div className="mb-1">
                      <MediaBlock msg={msg} />
                    </div>
                  )}
                  {msg.body && (
                    <div className="text-sm whitespace-pre-wrap break-words">{msg.body}</div>
                  )}
                  <div className="flex items-center justify-end gap-1 mt-0.5">
                    <span className="text-[10px] text-gray-500 dark:text-gray-300/70">
                      {timeLabel(msg.timestamp)}
                    </span>
                    {isOut && <StatusTicks status={msg.status} />}
                  </div>
                  {msg.status === 'failed' && msg.error && (
                    <div className="text-[10px] text-red-400 mt-0.5">{msg.error}</div>
                  )}
                </div>
              </div>
            </React.Fragment>
          );
        })}
        <div ref={bottomRef} />
      </div>
    </>
  );
};

export default ChatThread;
