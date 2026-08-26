import React from 'react';

/**
 * Renderizador de Markdown MÍNIMO, em componentes React puros.
 *
 * Por que existe: o projeto não tem (e não deve ganhar) react-markdown, e usar
 * dangerouslySetInnerHTML aqui está proibido — o conteúdo vem de um modelo de IA
 * que resume conversas reais de clientes, então nada de injetar HTML cru.
 *
 * O que suporta (só o que a IA da gerência realmente devolve):
 *   - parágrafos
 *   - **negrito**, *itálico*, `código`
 *   - listas com "-" / "*" / "+" e listas numeradas ("1." ou "1)")
 *   - títulos "#", "##", "###"
 *   - blocos de código com ``` ```
 *   - linha horizontal ("---")
 *   - TABELAS no estilo GitHub (essenciais: a IA compara colaboradores em tabela)
 *
 * Decisão consciente: o "_" NÃO vira itálico. Nomes de ferramentas e colunas do
 * banco são snake_case (ex.: desempenho_leads, ai_last_analyzed_at) e virariam
 * itálico bagunçado no meio da frase.
 */

// ─── Nível inline (negrito / itálico / código) ──────────────────────────────

/** Casa, nesta ordem: `código`, **negrito**, *itálico*. */
const RE_INLINE = /`([^`]+)`|\*\*([\s\S]+?)\*\*|\*([^*\n]+)\*/;

function parseInline(texto: string, chaveBase: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let resto = texto;
  let i = 0;

  while (resto.length > 0) {
    const m = RE_INLINE.exec(resto);
    if (!m) {
      nodes.push(resto);
      break;
    }
    if (m.index > 0) nodes.push(resto.slice(0, m.index));

    const chave = `${chaveBase}-i${i++}`;
    if (m[1] !== undefined) {
      nodes.push(
        <code
          key={chave}
          className="px-1 py-0.5 rounded bg-[var(--admin-surface-3)] text-[0.85em] font-mono text-[var(--admin-text-primary)] break-words"
        >
          {m[1]}
        </code>
      );
    } else if (m[2] !== undefined) {
      nodes.push(
        <strong key={chave} className="font-bold text-[var(--admin-text-primary)]">
          {parseInline(m[2], chave)}
        </strong>
      );
    } else {
      nodes.push(
        <em key={chave} className="italic">
          {parseInline(m[3] ?? '', chave)}
        </em>
      );
    }
    resto = resto.slice(m.index + m[0].length);
  }

  return nodes;
}

// ─── Nível de bloco ─────────────────────────────────────────────────────────

const RE_TITULO = /^(#{1,6})\s+(.*)$/;
const RE_ITEM = /^\s*[-*+]\s+(.*)$/;
const RE_ITEM_NUM = /^\s*\d+[.)]\s+(.*)$/;
const RE_HR = /^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/;
const RE_FENCE = /^\s*```/;
/** Linha separadora da tabela: | --- | :---: | */
const RE_SEP_TABELA = /^\s*\|?[\s:|-]*-[\s:|-]*\|?\s*$/;

function ehLinhaTabela(linha: string): boolean {
  return linha.trim().startsWith('|') && linha.includes('|', 1);
}

/** Quebra "| a | b |" em ["a", "b"]. */
function celulas(linha: string): string[] {
  let t = linha.trim();
  if (t.startsWith('|')) t = t.slice(1);
  if (t.endsWith('|')) t = t.slice(0, -1);
  return t.split('|').map((c) => c.trim());
}

function renderBlocos(fonte: string): React.ReactNode[] {
  const linhas = fonte.replace(/\r\n?/g, '\n').split('\n');
  const blocos: React.ReactNode[] = [];
  let i = 0;
  let n = 0;

  const proximaChave = () => `b${n++}`;

  while (i < linhas.length) {
    const linha = linhas[i];

    // Linha em branco: só separa blocos.
    if (!linha.trim()) {
      i++;
      continue;
    }

    // Bloco de código cercado por ```
    if (RE_FENCE.test(linha)) {
      const corpo: string[] = [];
      i++;
      while (i < linhas.length && !RE_FENCE.test(linhas[i])) {
        corpo.push(linhas[i]);
        i++;
      }
      i++; // consome a cerca final (se existir)
      blocos.push(
        <pre
          key={proximaChave()}
          className="my-3 p-3 rounded-xl bg-[var(--admin-surface-3)] border border-[var(--admin-border)] overflow-x-auto"
        >
          <code className="text-xs font-mono text-[var(--admin-text-primary)] whitespace-pre">
            {corpo.join('\n')}
          </code>
        </pre>
      );
      continue;
    }

    // Linha horizontal (checada antes das listas: "---" não tem espaço depois do "-")
    if (RE_HR.test(linha)) {
      blocos.push(
        <hr key={proximaChave()} className="my-4 border-0 border-t border-[var(--admin-border)]" />
      );
      i++;
      continue;
    }

    // Título
    const mTitulo = RE_TITULO.exec(linha);
    if (mTitulo) {
      const nivel = mTitulo[1].length;
      const chave = proximaChave();
      const conteudo = parseInline(mTitulo[2], chave);
      blocos.push(
        nivel <= 2 ? (
          <h3
            key={chave}
            className="mt-4 mb-2 first:mt-0 text-sm font-black uppercase tracking-wide text-[var(--admin-text-primary)]"
          >
            {conteudo}
          </h3>
        ) : (
          <h4
            key={chave}
            className="mt-3 mb-1.5 first:mt-0 text-[13px] font-bold text-[var(--admin-text-primary)]"
          >
            {conteudo}
          </h4>
        )
      );
      i++;
      continue;
    }

    // Tabela (cabeçalho + linha separadora + corpo)
    if (ehLinhaTabela(linha) && i + 1 < linhas.length && RE_SEP_TABELA.test(linhas[i + 1])) {
      const cabecalho = celulas(linha);
      i += 2;
      const corpo: string[][] = [];
      while (i < linhas.length && ehLinhaTabela(linhas[i])) {
        corpo.push(celulas(linhas[i]));
        i++;
      }
      const chave = proximaChave();
      blocos.push(
        // Tabela larga não pode empurrar o balão: rola dentro do próprio container.
        <div key={chave} className="my-3 overflow-x-auto rounded-xl border border-[var(--admin-border)]">
          <table className="w-full min-w-[420px] border-collapse text-xs">
            <thead>
              <tr className="bg-[var(--admin-surface-3)]">
                {cabecalho.map((c, ci) => (
                  <th
                    key={`${chave}-th${ci}`}
                    className="px-3 py-2 text-left font-bold text-[var(--admin-text-secondary)] whitespace-nowrap"
                  >
                    {parseInline(c, `${chave}-th${ci}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {corpo.map((linhaCorpo, ri) => (
                <tr key={`${chave}-tr${ri}`} className="border-t border-[var(--admin-border)]">
                  {linhaCorpo.map((c, ci) => (
                    <td
                      key={`${chave}-td${ri}-${ci}`}
                      className="px-3 py-2 align-top text-[var(--admin-text-primary)]"
                    >
                      {parseInline(c, `${chave}-td${ri}-${ci}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    // Lista numerada
    if (RE_ITEM_NUM.test(linha)) {
      const itens: string[] = [];
      while (i < linhas.length && RE_ITEM_NUM.test(linhas[i])) {
        itens.push(RE_ITEM_NUM.exec(linhas[i])![1]);
        i++;
      }
      const chave = proximaChave();
      blocos.push(
        <ol key={chave} className="my-2 pl-5 list-decimal space-y-1 marker:text-[var(--admin-text-tertiary)]">
          {itens.map((it, ii) => (
            <li key={`${chave}-li${ii}`} className="leading-relaxed">
              {parseInline(it, `${chave}-li${ii}`)}
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // Lista com marcadores
    if (RE_ITEM.test(linha)) {
      const itens: string[] = [];
      while (i < linhas.length && RE_ITEM.test(linhas[i])) {
        itens.push(RE_ITEM.exec(linhas[i])![1]);
        i++;
      }
      const chave = proximaChave();
      blocos.push(
        <ul key={chave} className="my-2 pl-5 list-disc space-y-1 marker:text-[var(--admin-text-tertiary)]">
          {itens.map((it, ii) => (
            <li key={`${chave}-li${ii}`} className="leading-relaxed">
              {parseInline(it, `${chave}-li${ii}`)}
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Parágrafo: junta as linhas seguidas até achar linha em branco ou outro bloco.
    const paragrafo: string[] = [];
    while (i < linhas.length) {
      const l = linhas[i];
      if (
        !l.trim() ||
        RE_FENCE.test(l) ||
        RE_HR.test(l) ||
        RE_TITULO.test(l) ||
        RE_ITEM.test(l) ||
        RE_ITEM_NUM.test(l) ||
        ehLinhaTabela(l)
      ) {
        break;
      }
      paragrafo.push(l);
      i++;
    }
    const chave = proximaChave();
    blocos.push(
      <p key={chave} className="my-2 first:mt-0 last:mb-0 leading-relaxed whitespace-pre-wrap break-words">
        {parseInline(paragrafo.join('\n'), chave)}
      </p>
    );
  }

  return blocos;
}

// ─── Componente ─────────────────────────────────────────────────────────────

/**
 * Uso: <Markdown>{mensagem.content}</Markdown>
 * Texto vazio devolve null — nunca quebra a renderização da conversa.
 */
export const Markdown: React.FC<{ children: string }> = ({ children }) => {
  const texto = typeof children === 'string' ? children : '';
  const blocos = React.useMemo(() => (texto.trim() ? renderBlocos(texto) : []), [texto]);
  if (blocos.length === 0) return null;
  return <div className="text-sm text-[var(--admin-text-primary)]">{blocos}</div>;
};

export default Markdown;
