import React, { useEffect, useRef, useState } from 'react';
import {
  Sparkles,
  User,
  ChevronDown,
  ChevronRight,
  Database,
  AlertTriangle,
  CheckCircle2,
  History,
} from 'lucide-react';
import {
  descreverErroChat,
  type ManagerChatMessage,
  type ManagerChatToolCall,
} from '../../../lib/managerChat';
import { Markdown } from './Markdown';

interface ChatMessagesProps {
  mensagens: ManagerChatMessage[];
  /** true enquanto o turno está em andamento (pode passar de 30s). */
  pensando: boolean;
  /** Só quem tem manager_chat_audit vê tokens, custo e latência. */
  podeAuditar: boolean;
  /**
   * Quantas mensagens sobraram quando o servidor cortou o começo da conversa
   * (`truncado` da resposta de list-messages). `null` = nada foi cortado.
   * Ausência que não se declara é o pior modo de falha: sem esta faixa o gerente
   * rola até o topo, não acha o início e acha que o histórico se perdeu.
   */
  truncadoEm?: number | null;
}

// ─── Formatação ─────────────────────────────────────────────────────────────

function rotuloDia(iso: string): string {
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return '';
  const hoje = new Date();
  if (data.toDateString() === hoje.toDateString()) return 'Hoje';
  const ontem = new Date(hoje);
  ontem.setDate(hoje.getDate() - 1);
  if (data.toDateString() === ontem.toDateString()) return 'Ontem';
  return data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function rotuloHora(iso: string): string {
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return '';
  return data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function segundos(ms: number | null): string {
  if (!ms || ms <= 0) return '';
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

/**
 * O servidor grava `error` como CÓDIGO ('recusado', 'anthropic_rate_limit'…),
 * mas o balão criado ao vivo pelo ManagerChatView já chega com a frase humana
 * (o cliente HTTP traduz antes de lançar). Traduzimos só o que ainda tem cara
 * de código — assim o gerente nunca lê "anthropic_rate_limit" ao recarregar a
 * conversa, e a frase que já é humana não ganha prefixo redundante.
 */
function textoDoErro(error: string): string {
  const cru = error.trim();
  return /^[a-z0-9_]+$/.test(cru) ? descreverErroChat(cru) : cru;
}

// ─── Ferramentas consultadas (detalhe recolhível) ───────────────────────────

const FerramentasUsadas: React.FC<{ chamadas: ManagerChatToolCall[] }> = ({ chamadas }) => {
  const [aberto, setAberto] = useState(false);
  const nomes = Array.from(new Set(chamadas.map((c) => c.name)));
  const houveFalha = chamadas.some((c) => !c.ok);

  return (
    <div className="mt-3 pt-2.5 border-t border-[var(--admin-border)]">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        className="flex items-center gap-1.5 text-[11px] text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-secondary)] transition-colors"
      >
        {aberto ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        <Database size={12} />
        <span className="truncate">
          consultou: {nomes.join(', ')}
          {houveFalha && ' · com falha'}
        </span>
      </button>

      {aberto && (
        <ul className="mt-2 space-y-1.5">
          {chamadas.map((c, i) => (
            <li
              key={`${c.name}-${i}`}
              className="text-[11px] rounded-lg bg-[var(--admin-surface-2)] border border-[var(--admin-border)] px-2.5 py-1.5"
            >
              <div className="flex items-center gap-1.5">
                {c.ok ? (
                  <CheckCircle2 size={12} className="text-[var(--admin-success)] shrink-0" />
                ) : (
                  <AlertTriangle size={12} className="text-[var(--admin-danger)] shrink-0" />
                )}
                <span className="font-mono font-semibold text-[var(--admin-text-secondary)] truncate">{c.name}</span>
                <span className="ml-auto text-[var(--admin-text-tertiary)] shrink-0">{segundos(c.ms)}</span>
              </div>
              {c.input && Object.keys(c.input).length > 0 && (
                <div className="mt-1 text-[10px] font-mono text-[var(--admin-text-tertiary)] break-words">
                  {Object.entries(c.input)
                    .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`)
                    .join(' · ')}
                </div>
              )}
              {/* Ausência silenciosa é o pior modo de falha: quando a consulta não deu
                  certo o gerente precisa ver isso mesmo que o servidor não tenha
                  detalhado o motivo — senão ele lê o número como se fosse fato. */}
              {!c.ok && (
                <div className="mt-1 text-[10px] text-[var(--admin-danger)] break-words">
                  {c.erro?.trim()
                    ? textoDoErro(c.erro)
                    : 'A consulta falhou sem detalhar o motivo — os números desta resposta podem estar incompletos.'}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// ─── Indicador "analisando" ─────────────────────────────────────────────────

/**
 * O turno consulta o banco de verdade e costuma passar de 30 segundos.
 * Em vez de esconder isso, mostramos o cronômetro e uma frase tranquila.
 */
const Analisando: React.FC = () => {
  const [seg, setSeg] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setSeg((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const frase =
    seg < 8
      ? 'Analisando os dados da equipe…'
      : seg < 25
        ? 'Consultando leads, conversas e atendimentos…'
        : 'Ainda trabalhando. Consultas grandes levam um pouco mais.';

  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-xl bg-[var(--admin-accent-gold-muted)] text-wtech-gold flex items-center justify-center shrink-0">
        <Sparkles size={16} className="animate-pulse" />
      </div>
      <div className="flex items-center gap-2.5 px-4 py-3 rounded-2xl rounded-tl-md bg-[var(--admin-surface-1)] border border-[var(--admin-border)]">
        <span className="flex gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-wtech-gold animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-1.5 h-1.5 rounded-full bg-wtech-gold animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-1.5 h-1.5 rounded-full bg-wtech-gold animate-bounce" style={{ animationDelay: '300ms' }} />
        </span>
        <span className="text-xs text-[var(--admin-text-secondary)]">{frase}</span>
        <span className="text-[11px] text-[var(--admin-text-tertiary)] tabular-nums">{seg}s</span>
      </div>
    </div>
  );
};

// ─── Componente principal ───────────────────────────────────────────────────

export const ChatMessages: React.FC<ChatMessagesProps> = ({
  mensagens,
  pensando,
  podeAuditar,
  truncadoEm = null,
}) => {
  const fimRef = useRef<HTMLDivElement>(null);

  // Rola para o fim a cada mensagem nova e quando o indicador aparece/some.
  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [mensagens, pensando]);

  let ultimoDia = '';

  return (
    <div className="flex-1 overflow-y-auto px-3 md:px-6 py-5 space-y-5 bg-[var(--admin-surface-2)]">
      {/* Corte declarado pelo servidor: discreto, mas sempre visível no topo. */}
      {truncadoEm != null && truncadoEm > 0 && (
        <div className="flex justify-center">
          <p className="flex items-start gap-1.5 max-w-[90%] px-3 py-1.5 rounded-full border border-[var(--admin-border)] bg-[var(--admin-surface-3)] text-[11px] text-[var(--admin-text-tertiary)] text-center">
            <History size={12} className="shrink-0 mt-0.5" />
            <span>
              Mostrando as {truncadoEm.toLocaleString('pt-BR')} mensagens mais recentes desta conversa. O começo não
              está nesta tela.
            </span>
          </p>
        </div>
      )}

      {mensagens.map((msg) => {
        const dia = rotuloDia(msg.created_at);
        const mostraDia = !!dia && dia !== ultimoDia;
        ultimoDia = dia || ultimoDia;
        const ehGerente = msg.role === 'user';
        const temFerramentas = !!msg.tool_calls && msg.tool_calls.length > 0;

        return (
          <React.Fragment key={msg.id}>
            {mostraDia && (
              <div className="flex justify-center">
                <span className="text-[11px] px-3 py-1 rounded-full bg-[var(--admin-surface-3)] text-[var(--admin-text-tertiary)]">
                  {dia}
                </span>
              </div>
            )}

            {ehGerente ? (
              // Pergunta do gerente — à direita, compacta.
              <div className="flex justify-end gap-3">
                <div className="max-w-[85%] md:max-w-[70%] px-4 py-3 rounded-2xl rounded-tr-md bg-[var(--admin-surface-3)] border border-[var(--admin-border)]">
                  <p className="text-sm text-[var(--admin-text-primary)] whitespace-pre-wrap break-words">
                    {msg.content}
                  </p>
                  <div className="mt-1 text-[10px] text-[var(--admin-text-tertiary)] text-right">
                    {rotuloHora(msg.created_at)}
                  </div>
                </div>
                <div className="w-8 h-8 rounded-xl bg-[var(--admin-surface-3)] text-[var(--admin-text-secondary)] flex items-center justify-center shrink-0">
                  <User size={16} />
                </div>
              </div>
            ) : (
              // Resposta da IA — à esquerda, larga (cabe tabela).
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-xl bg-[var(--admin-accent-gold-muted)] text-wtech-gold flex items-center justify-center shrink-0">
                  <Sparkles size={16} />
                </div>
                <div className="min-w-0 flex-1 max-w-[92%]">
                  {msg.error ? (
                    // Erro vira balão dentro da conversa (nunca alert()).
                    <div className="px-4 py-3 rounded-2xl rounded-tl-md bg-[var(--admin-danger-muted)] border border-[var(--admin-danger)]/30">
                      <div className="flex items-start gap-2">
                        <AlertTriangle size={15} className="text-[var(--admin-danger)] shrink-0 mt-0.5" />
                        <p className="text-sm text-[var(--admin-text-primary)] whitespace-pre-wrap break-words">
                          {textoDoErro(msg.error)}
                        </p>
                      </div>
                      {msg.content && (
                        <div className="mt-2 pt-2 border-t border-[var(--admin-danger)]/20">
                          <Markdown>{msg.content}</Markdown>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="px-4 py-3 rounded-2xl rounded-tl-md bg-[var(--admin-surface-1)] border border-[var(--admin-border)]">
                      <Markdown>{msg.content}</Markdown>
                      {temFerramentas && <FerramentasUsadas chamadas={msg.tool_calls!} />}
                    </div>
                  )}

                  <div className="mt-1 px-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-[var(--admin-text-tertiary)]">
                    <span>{rotuloHora(msg.created_at)}</span>
                    {/* Rodapé técnico: só para auditoria. */}
                    {podeAuditar && (
                      <>
                        {msg.model && <span>· {msg.model}</span>}
                        {/* Comparação explícita com null: com `||`, dois zeros fazem a
                            expressão valer 0 e o React IMPRIME "0" solto no rodapé. */}
                        {(msg.input_tokens != null || msg.output_tokens != null) && (
                          <span>
                            · {msg.input_tokens ?? 0} entrada / {msg.output_tokens ?? 0} saída
                            {msg.cache_read_tokens ? ` (${msg.cache_read_tokens} do cache)` : ''}
                          </span>
                        )}
                        {msg.latency_ms ? <span>· {segundos(msg.latency_ms)}</span> : null}
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </React.Fragment>
        );
      })}

      {pensando && <Analisando />}

      <div ref={fimRef} />
    </div>
  );
};

export default ChatMessages;
