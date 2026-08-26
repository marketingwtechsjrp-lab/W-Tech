/**
 * Cliente da Anthropic com laço de tool use — usado pelo Chat de IA da Gerência.
 *
 * Este arquivo tem prefixo `_`, então NÃO vira rota HTTP: é helper de servidor.
 *
 * Regra inegociável de segurança: a chave sai SEMPRE de process.env.ANTHROPIC_API_KEY.
 * Nunca de tabela do banco (a SITE_SystemSettings deste projeto tem leitura pública)
 * e nunca com prefixo VITE_ (isso a embutiria no bundle do navegador).
 */

import Anthropic from '@anthropic-ai/sdk';

// ─── Constantes ─────────────────────────────────────────────────────────────

const MODELO_PADRAO = 'claude-opus-5';
const ESFORCO_PADRAO = 'high';

/** Teto da Messages API para requisição SEM streaming. Acima disso a API devolve 400. */
const MAX_TOKENS_PADRAO = 16000;
const MAX_TOKENS_TETO = 16000;
const MAX_TOKENS_PISO = 1024;

/** Trava anti-loop: o modelo pode encadear ferramentas indefinidamente. */
const MAX_ITERACOES_PADRAO = 8;

/**
 * Teto de caracteres por resultado de ferramenta.
 * ~180 mil caracteres ≈ 45 mil tokens — passar disso estoura a janela de contexto
 * depois de duas ou três chamadas. Cortamos AVISANDO dentro do próprio tool_result,
 * porque truncar em silêncio faz o modelo concluir em cima de dado incompleto
 * achando que viu tudo.
 */
const LIMITE_TOOL_RESULT = 180_000;

/**
 * Teto de ferramentas executadas por iteração.
 * O laço dispara TODOS os tool_use de uma resposta em paralelo. Como o conteúdo
 * das conversas do WhatsApp entra no contexto, um texto escrito por um cliente
 * pode induzir o modelo a emitir dezenas de blocos tool_use numa única volta —
 * nada é gravado no banco, mas a latência, a memória e o token pago explodem por
 * ordem de um terceiro. 12 cobre com folga qualquer pergunta real do gerente.
 */
const MAX_TOOLS_POR_ITERACAO = 12;

/**
 * Orçamento CUMULATIVO de caracteres somando todos os tool_result de uma mesma
 * iteração. LIMITE_TOOL_RESULT é por resultado — sozinho ele permite 12 × 180 mil
 * caracteres numa volta só. Este teto fecha essa brecha; ao estourar, os
 * resultados seguintes voltam truncados COM aviso, nunca em silêncio.
 */
const ORCAMENTO_TOOL_RESULT_POR_ITERACAO = 400_000;

/**
 * Rótulo genérico devolvido ao modelo e gravado no log de auditoria quando uma
 * ferramenta falha. O detalhe do erro (que no PostgREST carrega nome de tabela,
 * nome de coluna e formato interno do Postgres) fica só no console do servidor:
 * o ToolCallLog é persistido cru em tool_calls e devolvido ao navegador.
 */
const ERRO_GENERICO_TOOL = 'falha_na_consulta';

/**
 * Tempo máximo de uma chamada e política de retry.
 * Retry agressivo do SDK come o orçamento de tempo da função serverless e o
 * usuário só vê o timeout no fim — 1 tentativa extra é o equilíbrio.
 */
const TIMEOUT_MS = 180_000;
const MAX_RETRIES = 1;

// ─── Tipos exportados (consumidos por api/manager-chat.ts) ──────────────────

export interface ToolDef {
  name: string;
  description: string;
  input_schema: Record<string, any>;
}

export interface ToolCallLog {
  name: string;
  input: Record<string, unknown>;
  ms: number;
  ok: boolean;
  erro?: string;
}

export interface RunResult {
  texto: string;
  toolCalls: ToolCallLog[];
  usage: {
    input_tokens: number;
    output_tokens: number;
    cache_read_tokens: number;
    cache_creation_tokens: number;
  };
  model: string;
  stopReason: string;
  recusado: boolean;
  recusaMotivo?: string;
  /**
   * true quando o laço parou por bater `maxIteracoes` antes de a IA concluir.
   * O aviso já vai anexado ao texto, mas o endpoint precisa DESTE sinal para
   * gravar um `error` na linha de auditoria — senão a análise interrompida conta
   * como turno normal no relatório de custo do dono.
   */
  interrompidoPorLimite?: boolean;
}

// ─── Cliente preguiçoso ─────────────────────────────────────────────────────

let clienteCache: Anthropic | null = null;

/** true quando process.env.ANTHROPIC_API_KEY existe e não está vazia. */
export function anthropicConfigurado(): boolean {
  return typeof process.env.ANTHROPIC_API_KEY === 'string' && process.env.ANTHROPIC_API_KEY.trim().length > 0;
}

/**
 * Instancia o SDK só na primeira chamada e guarda em memória.
 * Criar o cliente no topo do módulo quebraria qualquer import deste arquivo
 * quando a env não estiver setada (ex.: rota de `status`, que só quer saber
 * se a IA está ligada).
 */
function obterCliente(): Anthropic {
  if (clienteCache) return clienteCache;
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  // Mensagem é um CÓDIGO, não texto para humano: lib/managerChat.ts traduz.
  if (!apiKey) throw new Error('ia_nao_configurada');
  clienteCache = new Anthropic({ apiKey, timeout: TIMEOUT_MS, maxRetries: MAX_RETRIES });
  return clienteCache;
}

/**
 * Traduz erro do SDK para um dos códigos que lib/managerChat.ts sabe explicar.
 * Comparar `String(erro).includes('rate limit')` quebra quando a Anthropic muda
 * o texto — por isso usamos só as classes tipadas e o status HTTP.
 */
export function codigoDeErroAnthropic(e: unknown): string {
  // Repassa o código de "chave ausente" que obterCliente() lança, porque
  // lib/managerChat.ts já tem mensagem específica para ele.
  if (e instanceof Error && e.message === 'ia_nao_configurada') return 'ia_nao_configurada';

  if (e instanceof Anthropic.AuthenticationError) return 'anthropic_auth';
  if (e instanceof Anthropic.PermissionDeniedError) return 'anthropic_auth';
  if (e instanceof Anthropic.RateLimitError) return 'anthropic_rate_limit';

  if (e instanceof Anthropic.APIError) {
    const status = (e as { status?: number }).status;
    if (status === 401 || status === 403) return 'anthropic_auth';
    if (status === 429) return 'anthropic_rate_limit';
    return 'anthropic_error';
  }

  return 'anthropic_error';
}

// ─── Utilitários internos ───────────────────────────────────────────────────

function paraInteiro(valor: unknown): number {
  const n = Number(valor);
  return Number.isFinite(n) ? n : 0;
}

function limitar(valor: number, piso: number, teto: number): number {
  if (!Number.isFinite(valor)) return teto;
  return Math.min(teto, Math.max(piso, Math.trunc(valor)));
}

/**
 * O Opus 5 pode devolver `input` de ferramenta já como objeto OU como string JSON
 * (o escape muda conforme o modelo). Normalizamos aqui para o executor nunca
 * precisar adivinhar.
 */
function normalizarInput(bruto: unknown): Record<string, unknown> {
  if (typeof bruto === 'string') {
    const texto = bruto.trim();
    if (!texto) return {};
    try {
      const parseado = JSON.parse(texto);
      return parseado && typeof parseado === 'object' ? (parseado as Record<string, unknown>) : { valor: parseado };
    } catch {
      // Não dá para parsear: entrega cru em vez de perder a informação.
      return { _texto_bruto: bruto };
    }
  }
  if (bruto && typeof bruto === 'object') return bruto as Record<string, unknown>;
  return {};
}

/** Serializa o retorno da ferramenta, truncando com aviso explícito quando gigante. */
function serializarResultado(valor: unknown): string {
  let texto: string;
  try {
    texto = typeof valor === 'string' ? valor : JSON.stringify(valor ?? null);
  } catch {
    // JSON.stringify explode em referência circular; melhor um texto pobre que um erro.
    texto = String(valor);
  }
  if (typeof texto !== 'string') texto = String(texto);
  if (texto.length <= LIMITE_TOOL_RESULT) return texto;
  return (
    texto.slice(0, LIMITE_TOOL_RESULT) +
    `\n\n[AVISO: resultado cortado. Vieram ${texto.length} caracteres e só os primeiros ` +
    `${LIMITE_TOOL_RESULT} foram entregues. NÃO conclua que este é o conjunto completo — ` +
    `refaça a consulta com um filtro mais estreito (período menor, um colaborador por vez).]`
  );
}

function mensagemDeErro(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}

/**
 * Corta um tool_result para caber no que sobrou do orçamento da iteração.
 * Devolver string vazia ou omitir o bloco seria pior que truncar: o modelo
 * concluiria em cima de dado incompleto achando que viu tudo — por isso o corte
 * sempre vem acompanhado da instrução de refazer a consulta mais estreita.
 */
function cortarPorOrcamento(texto: string, restante: number): string {
  if (restante <= 0) {
    return (
      '[AVISO: resultado NÃO entregue. O orçamento de dados desta rodada ' +
      `(${ORCAMENTO_TOOL_RESULT_POR_ITERACAO} caracteres somando todas as ferramentas) ` +
      'acabou antes desta consulta. NÃO trate como "sem dados" nem como zero: ' +
      'peça menos ferramentas por vez ou filtre mais (um colaborador, um período).]'
    );
  }
  return (
    texto.slice(0, restante) +
    `\n\n[AVISO: resultado cortado pelo orçamento da rodada. Vieram ${texto.length} caracteres ` +
    `e só os primeiros ${restante} couberam. NÃO conclua que este é o conjunto completo — ` +
    'refaça a consulta com um filtro mais estreito.]'
  );
}

/** Junta só os blocos de texto da resposta, na ordem em que vieram. */
function extrairTexto(content: any[]): string {
  return (Array.isArray(content) ? content : [])
    .filter((bloco) => bloco?.type === 'text' && typeof bloco.text === 'string')
    .map((bloco) => bloco.text as string)
    .join('\n\n')
    .trim();
}

// ─── Laço principal ─────────────────────────────────────────────────────────

export async function rodarConversa(opts: {
  systemBlocks: Array<{ type: 'text'; text: string; cache_control?: { type: 'ephemeral' } }>;
  messages: any[];
  tools: ToolDef[];
  executarTool: (name: string, input: any) => Promise<unknown>;
  model?: string;
  effort?: string;
  maxTokens?: number;
  maxIteracoes?: number;
}): Promise<RunResult> {
  const cliente = obterCliente();

  const model = opts.model?.trim() || MODELO_PADRAO;
  const effort = opts.effort?.trim() || ESFORCO_PADRAO;
  const maxTokens = limitar(opts.maxTokens ?? MAX_TOKENS_PADRAO, MAX_TOKENS_PISO, MAX_TOKENS_TETO);
  const maxIteracoes = Math.max(1, opts.maxIteracoes ?? MAX_ITERACOES_PADRAO);

  // Cópia local: nunca mutamos o array que o chamador passou.
  const historico: any[] = [...opts.messages];
  const toolCalls: ToolCallLog[] = [];

  const usage = {
    input_tokens: 0,
    output_tokens: 0,
    cache_read_tokens: 0,
    cache_creation_tokens: 0,
  };

  let stopReason = '';
  let textoFinal = '';
  let interrompidoPorLimite = false;
  let cortadoPorMaxTokens = false;

  for (let iteracao = 1; ; iteracao++) {
    const resposta: any = await cliente.messages.create({
      model,
      max_tokens: maxTokens,
      // Esforço vai DENTRO de output_config. No topo, a API devolve 400.
      output_config: { effort: effort as any },
      // NÃO enviamos `thinking` (no Opus 5 é adaptativo por padrão e `budget_tokens`
      // foi removido), nem temperature/top_p/top_k (removidos, devolvem 400).
      system: opts.systemBlocks as any,
      tools: opts.tools as any,
      messages: historico,
    });

    // Usage é somado de TODAS as iterações: cada volta do laço é uma cobrança
    // separada, então contar só a última subfaturaria o relatório do dono.
    usage.input_tokens += paraInteiro(resposta?.usage?.input_tokens);
    usage.output_tokens += paraInteiro(resposta?.usage?.output_tokens);
    usage.cache_read_tokens += paraInteiro(resposta?.usage?.cache_read_input_tokens);
    usage.cache_creation_tokens += paraInteiro(resposta?.usage?.cache_creation_input_tokens);

    stopReason = String(resposta?.stop_reason ?? '');

    // Recusa é checada ANTES de ler o content: numa recusa o content pode vir
    // vazio ou com texto que não é a resposta, e tratar como sucesso enganaria o gerente.
    if (stopReason === 'refusal') {
      const detalhes = resposta?.stop_details;
      const categoria = detalhes?.category ? String(detalhes.category) : '';
      const explicacao = detalhes?.explanation ? String(detalhes.explanation) : '';
      const motivo = [categoria, explicacao].filter(Boolean).join(': ') || 'Sem detalhe informado pela API.';
      return {
        texto: '',
        toolCalls,
        usage,
        model,
        stopReason,
        recusado: true,
        recusaMotivo: motivo,
      };
    }

    const content: any[] = Array.isArray(resposta?.content) ? resposta.content : [];
    const pedidosDeTool = content.filter((bloco) => bloco?.type === 'tool_use');

    if (stopReason !== 'tool_use' || pedidosDeTool.length === 0) {
      textoFinal = extrairTexto(content);
      // `max_tokens` significa que a API parou de escrever NO MEIO da frase —
      // possivelmente no meio de um número. Todo outro corte deste arquivo se
      // declara; este precisa se declarar também, senão o gerente lê uma
      // conclusão truncada como se fosse a conclusão.
      if (stopReason === 'max_tokens') cortadoPorMaxTokens = true;
      break;
    }

    if (iteracao >= maxIteracoes) {
      // Devolve o que já existe de texto em vez de estourar erro: meia resposta
      // com aviso é mais útil ao gerente do que tela de falha.
      textoFinal = extrairTexto(content);
      interrompidoPorLimite = true;
      break;
    }

    // Devolvemos o content INTEIRO do assistant (não só o texto): os blocos
    // tool_use precisam chegar de volta com o mesmo id, senão a API rejeita os
    // tool_result órfãos da próxima mensagem.
    historico.push({ role: 'assistant', content: resposta.content });

    // Só os N primeiros pedidos rodam de fato. Os excedentes NÃO são omitidos:
    // todo tool_use precisa de um tool_result com o mesmo id, senão a API rejeita
    // a próxima mensagem inteira e a conversa morre.
    const executaveis = pedidosDeTool.slice(0, MAX_TOOLS_POR_ITERACAO);
    const excedentes = pedidosDeTool.slice(MAX_TOOLS_POR_ITERACAO);

    // Execução EM PARALELO: uma resposta pode trazer vários tool_use de uma vez
    // e rodar em série multiplicaria a latência sem necessidade (são leituras).
    const execucoes = await Promise.all(
      executaveis.map(async (bloco: any) => {
        const nome = String(bloco?.name ?? '');
        const entrada = normalizarInput(bloco?.input);
        const inicio = Date.now();
        try {
          const saida = await opts.executarTool(nome, entrada);
          return {
            log: { name: nome, input: entrada, ms: Date.now() - inicio, ok: true } as ToolCallLog,
            resultado: {
              type: 'tool_result' as const,
              tool_use_id: bloco?.id,
              content: serializarResultado(saida),
            },
          };
        } catch (e) {
          // O detalhe do erro fica NO SERVIDOR. Propagar error.message do PostgREST
          // entregaria nome de tabela e de coluna ao navegador do gerente — é o
          // mesmo motivo pelo qual o endpoint tem erroBanco().
          console.error(`[manager-chat] ferramenta "${nome}" falhou:`, mensagemDeErro(e));
          return {
            log: {
              name: nome,
              input: entrada,
              ms: Date.now() - inicio,
              ok: false,
              erro: ERRO_GENERICO_TOOL,
            } as ToolCallLog,
            // Ferramenta que falhou VOLTA como is_error, nunca omitida: sem o
            // tool_result correspondente a API recusa a próxima mensagem, e o
            // modelo precisa saber da falha para tentar outro caminho — saber QUE
            // falhou basta, o porquê interno não lhe serve.
            resultado: {
              type: 'tool_result' as const,
              tool_use_id: bloco?.id,
              is_error: true,
              content: `A ferramenta "${nome}" falhou (${ERRO_GENERICO_TOOL}). Não trate isso como ausência de dados: informe ao gerente que a consulta não pôde ser feita.`,
            },
          };
        }
      }),
    );

    // O log de auditoria segue a ordem em que o modelo PEDIU as ferramentas,
    // não a ordem em que elas terminaram — senão a tela de auditoria do dono
    // mostraria uma sequência diferente a cada execução.
    for (const item of execucoes) toolCalls.push(item.log);

    // Orçamento cumulativo aplicado DEPOIS do Promise.all, na ordem do pedido:
    // aplicar durante a execução paralela daria um corte diferente a cada rodada,
    // dependendo de qual consulta respondesse primeiro.
    let gastoDaIteracao = 0;
    const blocosDeResultado: any[] = execucoes.map((item) => {
      const conteudo = String(item.resultado.content ?? '');
      if (gastoDaIteracao + conteudo.length <= ORCAMENTO_TOOL_RESULT_POR_ITERACAO) {
        gastoDaIteracao += conteudo.length;
        return item.resultado;
      }
      const restante = ORCAMENTO_TOOL_RESULT_POR_ITERACAO - gastoDaIteracao;
      gastoDaIteracao = ORCAMENTO_TOOL_RESULT_POR_ITERACAO;
      return { ...item.resultado, content: cortarPorOrcamento(conteudo, restante) };
    });

    for (const bloco of excedentes as any[]) {
      const nome = String(bloco?.name ?? '');
      const entrada = normalizarInput(bloco?.input);
      toolCalls.push({
        name: nome,
        input: entrada,
        ms: 0,
        ok: false,
        erro: 'limite_de_ferramentas_por_iteracao',
      });
      blocosDeResultado.push({
        type: 'tool_result' as const,
        tool_use_id: bloco?.id,
        is_error: true,
        content:
          `Não executada: o limite de ${MAX_TOOLS_POR_ITERACAO} ferramentas por rodada foi atingido ` +
          `(você pediu ${pedidosDeTool.length}). Peça de novo, poucas por vez e nesta ordem de prioridade.`,
      });
    }

    // TODOS os tool_result vão numa ÚNICA mensagem de role 'user'.
    // Quebrar em várias mensagens ensina o modelo a parar de pedir ferramentas
    // em paralelo nas próximas voltas — e ainda arrisca 400 por tool_use sem par.
    historico.push({ role: 'user', content: blocosDeResultado });
  }

  if (interrompidoPorLimite) {
    const aviso =
      `[Análise interrompida: o limite de ${maxIteracoes} passos de consulta foi atingido ` +
      `antes de a IA concluir. O que está acima pode estar incompleto. Refaça a pergunta ` +
      `de forma mais específica — um colaborador ou um período por vez.]`;
    textoFinal = textoFinal ? `${textoFinal}\n\n${aviso}` : aviso;
  }

  if (cortadoPorMaxTokens) {
    // O raciocínio adaptativo do Opus 5 consome o MESMO orçamento de max_tokens,
    // então uma pergunta ampla estoura o limite antes de a resposta terminar —
    // às vezes antes de existir qualquer bloco de texto. O aviso vai ANEXADO ao
    // texto (e não só no stopReason) porque é o texto que o gerente lê.
    const aviso =
      `[Resposta cortada pelo limite de tamanho (${maxTokens} tokens) antes de a IA terminar. ` +
      `O texto acima está INCOMPLETO e pode parar no meio de uma frase ou de um número — ` +
      `não conclua nada a partir dele. Peça um recorte menor: um colaborador por vez, ` +
      `ou um período mais curto.]`;
    textoFinal = textoFinal ? `${textoFinal}\n\n${aviso}` : aviso;
  }

  return {
    texto: textoFinal,
    toolCalls,
    usage,
    model,
    stopReason,
    recusado: false,
    interrompidoPorLimite,
  };
}
