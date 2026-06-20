import React, { useRef, useEffect, useState } from 'react';
import { ArrowLeft, Check, CheckCheck, AlertCircle, FileText, Download, UserPlus, UserCheck, RotateCcw, CheckCircle2, Bot, Clock, ArrowRightLeft } from 'lucide-react';
import { CloudConversation, CloudMessage } from '../../../../lib/whatsappCloud';
import SendToCrmModal from './SendToCrmModal';

interface Props {
  conversation: CloudConversation;
  messages: CloudMessage[];
  onBack: () => void;
  currentUserId?: string;
  assigneeName?: string | null;
  canAssume?: boolean;
  users?: Record<string, string>;
  onAssume?: () => void;
  onRelease?: () => void;
  onClose?: () => void;
  onTransfer?: (userId: string) => void;
}

const STATUS_CHIP: Record<string, { label: string; cls: string; Icon: React.ElementType }> = {
  bot: { label: 'IA atendendo', cls: 'bg-violet-500/15 text-violet-600 dark:text-violet-300', Icon: Bot },
  pendente: { label: 'Aguardando humano', cls: 'bg-amber-500/15 text-amber-600 dark:text-amber-300', Icon: Clock },
  humano: { label: 'Em atendimento', cls: 'bg-sky-500/15 text-sky-600 dark:text-sky-300', Icon: UserCheck },
  encerrado: { label: 'Encerrada', cls: 'bg-gray-400/15 text-gray-500 dark:text-gray-300', Icon: CheckCircle2 },
};

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

const ChatThread: React.FC<Props> = ({
  conversation, messages, onBack,
  currentUserId, assigneeName, canAssume = true, users = {}, onAssume, onRelease, onClose, onTransfer,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [showCrm, setShowCrm] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const transferTargets = Object.entries(users).filter(([id]) => id !== currentUserId);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const name = conversation.profile_name || formatPhone(conversation.wa_id);
  const status = conversation.status || 'bot';
  const chip = STATUS_CHIP[status] || STATUS_CHIP.bot;
  const mineNow = !!currentUserId && conversation.assigned_to === currentUserId;

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
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm text-gray-900 dark:text-white truncate">{name}</span>
            <span className={`shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${chip.cls}`}>
              <chip.Icon size={11} />
              {status === 'humano' && assigneeName ? assigneeName : chip.label}
            </span>
          </div>
          <div className="text-xs text-gray-400 truncate">{formatPhone(conversation.wa_id)}</div>
        </div>

        <div className="shrink-0 flex items-center gap-1.5">
          {/* Assumir: disponível quando a IA está atendendo, aguardando, ou outro atendente cuida */}
          {canAssume && !mineNow && status !== 'encerrado' && onAssume && (
            <button
              onClick={onAssume}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 transition-colors"
              title="Assumir o atendimento (desliga a IA nesta conversa)"
            >
              <UserCheck size={15} />
              <span className="hidden sm:inline">Assumir</span>
            </button>
          )}
          {mineNow && onRelease && (
            <button
              onClick={onRelease}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-violet-700 dark:text-violet-300 bg-violet-500/10 hover:bg-violet-500/20 transition-colors"
              title="Devolver a conversa para a IA"
            >
              <RotateCcw size={15} />
              <span className="hidden sm:inline">Devolver à IA</span>
            </button>
          )}
          {canAssume && onTransfer && transferTargets.length > 0 && status !== 'encerrado' && (
            <div className="relative">
              <button
                onClick={() => setShowTransfer((v) => !v)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-indigo-600 dark:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 transition-colors"
                title="Transferir para outro atendente"
              >
                <ArrowRightLeft size={15} />
                <span className="hidden lg:inline">Transferir</span>
              </button>
              {showTransfer && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowTransfer(false)} />
                  <div className="absolute right-0 mt-1 z-20 w-52 max-h-64 overflow-y-auto bg-white dark:bg-[#202c33] border border-gray-200 dark:border-white/10 rounded-lg shadow-lg py-1">
                    <p className="px-3 py-1.5 text-[10px] font-bold uppercase text-gray-400">Transferir para</p>
                    {transferTargets.map(([id, name]) => (
                      <button
                        key={id}
                        onClick={() => { onTransfer(id); setShowTransfer(false); }}
                        className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 flex items-center gap-2"
                      >
                        <UserCheck size={14} className="text-indigo-500 shrink-0" /> {name}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
          {status !== 'encerrado' && onClose && (
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-gray-500 dark:text-gray-300 bg-gray-500/10 hover:bg-gray-500/20 transition-colors"
              title="Encerrar conversa"
            >
              <CheckCircle2 size={15} />
              <span className="hidden lg:inline">Encerrar</span>
            </button>
          )}
          <button
            onClick={() => setShowCrm(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#128C7E] dark:text-[#25D366] bg-[#25D366]/10 hover:bg-[#25D366]/20 transition-colors"
            title="Enviar este contato como lead para o CRM"
          >
            <UserPlus size={15} />
            <span className="hidden lg:inline">CRM</span>
          </button>
        </div>
      </div>

      <SendToCrmModal conversation={conversation} open={showCrm} onClose={() => setShowCrm(false)} />

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
                    {msg.sent_by === 'ai' && (
                      <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-violet-600 dark:text-violet-300 mr-0.5">
                        <Bot size={10} /> IA
                      </span>
                    )}
                    {msg.sent_by === 'ai_draft' && (
                      <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-amber-600 dark:text-amber-300 mr-0.5">
                        <Bot size={10} /> rascunho
                      </span>
                    )}
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
