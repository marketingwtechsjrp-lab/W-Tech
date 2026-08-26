import React, { useRef, useState, useEffect } from 'react';
import { Send, Loader2 } from 'lucide-react';

interface ChatComposerProps {
  /** Chamado com o texto já aparado. O pai decide o que fazer (criar thread, enviar…). */
  onEnviar: (texto: string) => void;
  /** true enquanto a IA está respondendo — trava o campo e o botão. */
  desabilitado: boolean;
  placeholder?: string;
}

const ALTURA_MAXIMA = 168; // ~7 linhas antes de virar rolagem interna

/**
 * Campo de pergunta do gerente.
 * Enter envia, Shift+Enter quebra linha (mesmo comportamento do inbox do WhatsApp).
 * A textarea cresce sozinha até um teto e então rola por dentro.
 */
export const ChatComposer: React.FC<ChatComposerProps> = ({ onEnviar, desabilitado, placeholder }) => {
  const [texto, setTexto] = useState('');
  const areaRef = useRef<HTMLTextAreaElement>(null);

  // Recalcula a altura sempre que o texto muda (inclusive quando o pai limpa o campo).
  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, ALTURA_MAXIMA)}px`;
  }, [texto]);

  const enviar = () => {
    const valor = texto.trim();
    if (!valor || desabilitado) return;
    onEnviar(valor);
    setTexto('');
  };

  return (
    <div className="shrink-0 border-t border-[var(--admin-border)] bg-[var(--admin-surface-1)] px-3 md:px-4 py-3">
      <div className="flex items-end gap-2">
        <textarea
          ref={areaRef}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              enviar();
            }
          }}
          rows={1}
          disabled={desabilitado}
          placeholder={placeholder || 'Pergunte sobre o atendimento da equipe…'}
          aria-label="Sua pergunta para a IA da gerência"
          className="flex-1 resize-none overflow-y-auto px-4 py-3 text-sm rounded-2xl bg-[var(--admin-surface-2)] border border-[var(--admin-border)] text-[var(--admin-text-primary)] placeholder:text-[var(--admin-text-tertiary)] focus:outline-none focus:border-wtech-gold focus:ring-2 focus:ring-wtech-gold/20 transition-colors disabled:opacity-60"
          style={{ maxHeight: ALTURA_MAXIMA }}
        />
        <button
          type="button"
          onClick={enviar}
          disabled={desabilitado || !texto.trim()}
          title={desabilitado ? 'Aguarde a resposta atual' : 'Enviar (Enter)'}
          aria-label="Enviar pergunta"
          className="shrink-0 h-11 w-11 flex items-center justify-center rounded-2xl bg-wtech-gold text-black hover:brightness-105 active:scale-[0.97] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {desabilitado ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
        </button>
      </div>
      <p className="mt-2 px-1 text-[11px] text-[var(--admin-text-tertiary)]">
        <span className="font-semibold">Enter</span> envia · <span className="font-semibold">Shift + Enter</span> quebra
        linha · a IA só lê os dados, nunca envia mensagem nem altera nada.
      </p>
    </div>
  );
};

export default ChatComposer;
