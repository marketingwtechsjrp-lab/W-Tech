import React from 'react';
import { Plus, MessageSquare, Archive, Loader2 } from 'lucide-react';
import type { ManagerChatThread } from '../../../lib/managerChat';

interface ThreadListProps {
  threads: ManagerChatThread[];
  /** id da conversa aberta (null quando nenhuma). */
  ativa: string | null;
  onSelecionar: (id: string) => void;
  onNova: () => void;
  onArquivar: (id: string) => void;
  carregando: boolean;
}

/** "há 5 min", "ontem", "12/03" — curto o bastante para caber na coluna. */
function quando(iso: string): string {
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return '';
  const diffMin = Math.floor((Date.now() - data.getTime()) / 60000);
  if (diffMin < 1) return 'agora';
  if (diffMin < 60) return `há ${diffMin} min`;
  const horas = Math.floor(diffMin / 60);
  if (horas < 24) return `há ${horas} h`;
  const dias = Math.floor(horas / 24);
  if (dias === 1) return 'ontem';
  if (dias < 7) return `há ${dias} dias`;
  return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

/**
 * Coluna de conversas do gerente.
 * Não decide nada sozinha: quem cria, seleciona e arquiva é o ManagerChatView.
 */
export const ThreadList: React.FC<ThreadListProps> = ({
  threads,
  ativa,
  onSelecionar,
  onNova,
  onArquivar,
  carregando,
}) => {
  const visiveis = threads.filter((t) => !t.archived);

  return (
    <div className="flex flex-col h-full bg-[var(--admin-surface-1)]">
      {/* Ação principal */}
      <div className="p-3 shrink-0 border-b border-[var(--admin-border)]">
        <button
          type="button"
          onClick={onNova}
          className="w-full flex items-center justify-center gap-2 h-10 rounded-xl bg-wtech-gold text-black font-bold text-sm hover:brightness-105 active:scale-[0.98] transition-all"
        >
          <Plus size={16} strokeWidth={2.5} />
          Nova conversa
        </button>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {carregando && visiveis.length === 0 && (
          <div className="flex items-center justify-center gap-2 py-8 text-xs text-[var(--admin-text-tertiary)]">
            <Loader2 size={14} className="animate-spin" />
            Carregando conversas…
          </div>
        )}

        {!carregando && visiveis.length === 0 && (
          <div className="px-3 py-8 text-center">
            <MessageSquare size={28} strokeWidth={1.4} className="mx-auto mb-2 text-[var(--admin-text-tertiary)] opacity-60" />
            <p className="text-xs text-[var(--admin-text-tertiary)] leading-relaxed">
              Nenhuma conversa ainda.
              <br />
              Comece perguntando algo sobre a equipe.
            </p>
          </div>
        )}

        {visiveis.map((t) => {
          const selecionada = t.id === ativa;
          return (
            <div
              key={t.id}
              className={`group relative rounded-xl border transition-colors ${
                selecionada
                  ? 'bg-[var(--admin-accent-gold-muted)] border-wtech-gold/40'
                  : 'bg-transparent border-transparent hover:bg-[var(--admin-surface-2)]'
              }`}
            >
              <button
                type="button"
                onClick={() => onSelecionar(t.id)}
                aria-current={selecionada ? 'true' : undefined}
                className="w-full text-left pl-3 pr-9 py-2.5"
              >
                <p
                  className={`text-sm font-semibold truncate ${
                    selecionada ? 'text-[var(--admin-text-primary)]' : 'text-[var(--admin-text-secondary)]'
                  }`}
                >
                  {t.title?.trim() || 'Nova conversa'}
                </p>
                <p className="text-[11px] text-[var(--admin-text-tertiary)] truncate">
                  {quando(t.updated_at || t.created_at)}
                  {t.user_name ? ` · ${t.user_name}` : ''}
                </p>
              </button>

              <button
                type="button"
                onClick={() => onArquivar(t.id)}
                title="Arquivar conversa"
                aria-label={`Arquivar ${t.title?.trim() || 'conversa'}`}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-[var(--admin-text-tertiary)] opacity-0 group-hover:opacity-100 focus:opacity-100 hover:text-[var(--admin-danger)] hover:bg-[var(--admin-danger-muted)] transition-all"
              >
                <Archive size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ThreadList;
