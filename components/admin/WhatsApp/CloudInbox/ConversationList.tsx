import React, { useState, useMemo } from 'react';
import { Search, Loader2, Bot, UserCheck, Clock } from 'lucide-react';
import { CloudConversation } from '../../../../lib/whatsappCloud';

interface Props {
  conversations: CloudConversation[];
  selectedId: string | null;
  loading: boolean;
  onSelect: (conv: CloudConversation) => void;
}

const STATUS_DOT: Record<string, { cls: string; Icon: React.ElementType; label: string }> = {
  bot: { cls: 'text-violet-500', Icon: Bot, label: 'IA' },
  pendente: { cls: 'text-amber-500', Icon: Clock, label: 'Aguardando' },
  humano: { cls: 'text-sky-500', Icon: UserCheck, label: 'Atendente' },
  encerrado: { cls: 'text-gray-400', Icon: UserCheck, label: 'Encerrada' },
};

function initials(name: string | null, waId: string): string {
  const base = (name || waId || '').trim();
  if (!base) return '?';
  const parts = base.split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatPhone(waId: string): string {
  // 5511999998888 → +55 11 99999-8888 (melhor esforço para BR)
  const d = waId.replace(/\D/g, '');
  if (d.length === 13) return `+${d.slice(0, 2)} ${d.slice(2, 4)} ${d.slice(4, 9)}-${d.slice(9)}`;
  if (d.length === 12) return `+${d.slice(0, 2)} ${d.slice(2, 4)} ${d.slice(4, 8)}-${d.slice(8)}`;
  return `+${d}`;
}

function formatTime(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return 'Ontem';
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

const ConversationList: React.FC<Props> = ({ conversations, selectedId, loading, onSelect }) => {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter(
      (c) =>
        (c.profile_name || '').toLowerCase().includes(q) ||
        c.wa_id.includes(q.replace(/\D/g, ''))
    );
  }, [conversations, query]);

  return (
    <>
      {/* Busca */}
      <div className="p-2.5 shrink-0">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar conversa..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-gray-100 dark:bg-[#202c33] text-gray-900 dark:text-white placeholder:text-gray-400 border-none focus:outline-none focus:ring-2 focus:ring-[#25D366]/40"
          />
        </div>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-10 text-gray-400">
            <Loader2 size={22} className="animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-sm text-gray-400 dark:text-gray-500 py-10 px-4">
            {query ? 'Nenhuma conversa encontrada.' : 'Nenhuma conversa ainda.'}
          </div>
        ) : (
          filtered.map((conv) => {
            const active = conv.id === selectedId;
            const name = conv.profile_name || formatPhone(conv.wa_id);
            return (
              <button
                key={conv.id}
                onClick={() => onSelect(conv)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors border-b border-gray-100 dark:border-white/5 ${
                  active
                    ? 'bg-[#25D366]/10 dark:bg-[#2a3942]'
                    : 'hover:bg-gray-50 dark:hover:bg-white/5'
                }`}
              >
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#25D366] to-[#128C7E] flex items-center justify-center text-white text-sm font-semibold shrink-0">
                  {initials(conv.profile_name, conv.wa_id)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 min-w-0">
                      {(() => {
                        const s = STATUS_DOT[conv.status || 'bot'];
                        return s ? <s.Icon size={12} className={`shrink-0 ${s.cls}`} aria-label={s.label} /> : null;
                      })()}
                      <span className="font-medium text-sm text-gray-900 dark:text-white truncate">
                        {name}
                      </span>
                    </span>
                    <span
                      className={`text-[11px] shrink-0 ${
                        conv.unread_count > 0
                          ? 'text-[#25D366] font-semibold'
                          : 'text-gray-400'
                      }`}
                    >
                      {formatTime(conv.last_message_at)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {conv.last_direction === 'out' ? 'Você: ' : ''}
                      {conv.last_message || ''}
                    </span>
                    {conv.unread_count > 0 && (
                      <span className="shrink-0 min-w-[18px] h-[18px] px-1 rounded-full bg-[#25D366] text-white text-[10px] font-bold flex items-center justify-center">
                        {conv.unread_count > 99 ? '99+' : conv.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </>
  );
};

export default ConversationList;
