/**
 * Cliente do OpenRouter com laço de tool calling — usado pelo Chat de IA da Gerência.
 *
 * Este arquivo tem prefixo `_`, então NÃO vira rota HTTP: é helper de servidor.
 *
 * Espelha a MESMA interface de api/_anthropic.ts (mesmos tipos, mesmos tetos,
 * mesmos avisos), acrescentando só o custo real em dólar que o OpenRouter informa.
 * Assim api/manager-chat.ts troca de provedor sem mexer no resto do código.
 *
 * Diferenças de protocolo em relação à Anthropic (medidas ao vivo, 26/08/2026):
 *   - as ferramentas vão no formato da OpenAI: { type:'function', function:{...} };
 *   - `arguments` da ferramenta chega como STRING JSON, não como objeto;
 *   - o resultado volta em UMA mensagem { role:'tool', tool_call_id } POR ferramenta,
 *     e não num único `user` com todos os tool_result juntos;
 *   - o corte por limite de tamanho aparece como finish_reason 'length'.
 *
 * Regra inegociável de segurança: a chave é lida SOMENTE no servidor (tabela
 * SITE_SystemSettings via service_role) e NUNCA pode aparecer em log, mensagem de
 * erro ou valor de retorno. Essa tabela tem leitura pública neste projeto
 * (ver SEGURANCA_RLS_PENDENTE.md), o que reforça — e não afrouxa — a regra.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { ToolDef, ToolCallLog, RunResult } from './_anthropic.js';

// Reexporta os tipos para quem importar só este módulo. NÃO redefinimos nada:
// a fonte de verdade continua sendo api/_anthropic.ts.
export type { ToolDef, ToolCallLog, RunResult };

// ─── Constantes ─────────────────────────────────────────────────────────────

const ENDPOINT_OPENROUTER = 'https://openrouter.ai/api/v1/chat/completions';

/** Identifica o app no painel do OpenRouter — ajuda o dono a auditar o gasto. */
const TITULO_APP = 'W-Tech Chat da Gerência';

/**
 * Modelo padrão. O prefixo `anthropic/` é OBRIGATÓRIO no OpenRouter: sem ele a
 * API devolve 404 de modelo inexistente.
 */
const MODELO_PADRAO = 'anthropic/claude-opus-5';

const MAX_TOKENS_PADRAO = 16000;
const MAX_TOKENS_TETO = 16000;
const MAX_TOKENS_PISO = 1024;

/** Trava anti-loop: o modelo pode encadear ferramentas indefinidamente. */
const MAX_ITERACOES_PADRAO = 8;

/**
 * Teto de caracteres por resultado de ferramenta.
 * ~180 mil caracteres ≈ 45 mil tokens — passar disso estoura a janela de contexto
 * depois de duas ou três chamadas. Cortamos AVISANDO dentro do próprio resultado,
 * porque truncar em silêncio faz o modelo concluir em cima de dado incompleto
 * achando que viu tudo.
 */
const LIMITE_TOOL_RESULT = 180_000;

/**
 * Teto de ferramentas executadas por iteração.
 * O laço dispara TODOS os tool_calls de uma resposta em paralelo. Como o conteúdo
 * das conversas do WhatsApp entra no contexto, um texto escrito por um cliente
 * pode induzir o modelo a pedir dezenas de ferramentas numa única volta — nada é
 * gravado no banco, mas a latência, a memória e o token pago explodem por ordem
 * de um terceiro. 12 cobre com folga qualquer pergunta real do gerente.
 */
const MAX_TOOLS_POR_ITERACAO = 12;

/**
 * Orçamento CUMULATIVO de caracteres somando todos os resultados de uma mesma
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
 * Tempo máximo de UMA chamada. Sem retry automático de propósito: quem decide
 * repetir é o endpoint, que conhece o orçamento de tempo da função serverless.
 */
const TIMEOUT_MS = 180_000;

/** Teto do corpo de erro guardado para diagnóstico — resposta de erro pode vir enorme. */
const LIMITE_CORPO_ERRO = 2_000;

// ─── Erro tipado ────────────────────────────────────────────────────────────

/**
 * Erro de chamada ao OpenRouter carregando status HTTP e um trecho do corpo.
 * O corpo é usado só para CLASSIFICAR o erro (crédito, modelo inválido) e para o
 * console do servidor — nunca é devolvido ao navegador. A chave jamais entra aqui:
 * ela só existe no header Authorization, que não é lido de volta.
 */
class ErroOpenRouter extends Error {
  status: number;
  corpo: string;

  constructor(status: number, corpo: string) {
    super('openrouter_http_' + String(status));
    this.name = 'ErroOpenRouter';
    this.status = status;
    this.corpo = corpo;
  }
}

// ─── Leitura da chave ───────────────────────────────────────────────────────

/**
 * Lê SITE_SystemSettings.openrouter_api_key com o cliente service_role.
 * Devolve null quando a chave não existe, está vazia ou o banco não respondeu —
 * em qualquer um dos casos o chat NÃO pode responder, e o endpoint bloqueia.
 * O valor lido nunca é logado.
 */
export async function lerChaveOpenRouter(supabase: SupabaseClient): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('SITE_SystemSettings')
      .select('value')
      .eq('key', 'openrouter_api_key')
      .maybeSingle();

    if (error) {
      // Só o texto do erro do banco — a chave não foi lida neste caminho.
      console.error('[manager-chat] falha ao ler a chave do OpenRouter:', error.message);
      return null;
    }

    const bruto = typeof data?.value === 'string' ? data.value.trim() : '';
    return bruto.length > 0 ? bruto : null;
  } catch (e) {
    console.error('[manager-chat] falha ao ler a chave do OpenRouter:', mensagemDeErro(e));
    return null;
  }
}

// ─── Classificação de erro ──────────────────────────────────────────────────

/** true quando o corpo do erro fala de crédito/saldo insuficiente. */
function pareceFaltaDeCredito(corpo: string): boolean {
  return /credit|crédito|insufficient|saldo|balance|quota|afford/i.test(corpo);
}

/** true quando o corpo do erro fala de modelo inexistente ou não permitido. */
function pareceModeloInvalido(corpo: string): boolean {
  return /model/i.test(corpo);
}

/**
 * Traduz o erro para um código que lib/managerChat.ts sabe explicar.
 * Classificamos pelo status HTTP primeiro (estável) e só usamos o texto do corpo
 * para desempatar os casos que o status sozinho não distingue.
 */
export function codigoDeErroOpenRouter(e: unknown): string {
  // Repassa o código de "chave ausente" que rodarConversaOpenRouter lança, porque
  // lib/managerChat.ts já tem mensagem específica para ele.
  if (e instanceof Error && e.message === 'ia_nao_configurada') return 'ia_nao_configurada';

  if (e instanceof ErroOpenRouter) {
    const { status, corpo } = e;
    if (status === 401 || status === 403) return 'openrouter_auth';
    if (status === 402 || pareceFaltaDeCredito(corpo)) return 'openrouter_sem_credito';
    if (status === 429) return 'openrouter_rate_limit';
    if (status === 404 || (status === 400 && pareceModeloInvalido(corpo))) return 'modelo_invalido';
    return 'openrouter_error';
  }

  return 'openrouter_error';
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

function mensagemDeErro(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}

function recortarCorpo(texto: string): string {
  return texto.length <= LIMITE_CORPO_ERRO ? texto : texto.slice(0, LIMITE_CORPO_ERRO);
}

/**
 * `arguments` do OpenRouter é uma STRING JSON, não um objeto.
 * Quando não dá para interpretar, devolvemos a marca `_erro_parse` para o laço
 * avisar o modelo em vez de derrubar o turno inteiro.
 */
function interpretarArgumentos(bruto: unknown): { ok: boolean; input: Record<string, unknown> } {
  if (bruto == null) return { ok: true, input: {} };

  if (typeof bruto === 'object') return { ok: true, input: bruto as Record<string, unknown> };

  if (typeof bruto === 'string') {
    const texto = bruto.trim();
    if (!texto) return { ok: true, input: {} };
    try {
      const parseado = JSON.parse(texto);
      if (parseado && typeof parseado === 'object') return { ok: true, input: parseado as Record<string, unknown> };
      return { ok: true, input: { valor: parseado } };
    } catch {
      // Guarda o texto cru para a auditoria conseguir ver o que o modelo mandou.
      // Teto: este texto vem do MODELO, que por sua vez pode ter sido induzido por
    // mensagem de cliente no WhatsApp. Sem corte, uma string enorme seria
    // persistida em tool_calls (jsonb) e devolvida ao navegador.
    return { ok: false, input: { _texto_bruto: String(texto).slice(0, 2000) } };
    }
  }

  return { ok: true, input: {} };
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

/**
 * Corta um resultado para caber no que sobrou do orçamento da iteração.
 * Devolver string vazia ou omitir a mensagem seria pior que truncar: o modelo
 * concluiria em cima de dado incompleto achando que viu tudo — e, no formato do
 * OpenRouter, tool_call sem resposta faz a requisição seguinte ser recusada.
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

/**
 * Extrai o texto da mensagem do assistant.
 * `content` normalmente é string, mas alguns provedores devolvem array de partes —
 * tratamos os dois para não perder a resposta do gerente por detalhe de formato.
 */
function extrairTexto(content: unknown): string {
  if (typeof content === 'string') return content.trim();
  if (Array.isArray(content)) {
    return content
      .filter((parte: any) => parte?.type === 'text' && typeof parte.text === 'string')
      .map((parte: any) => parte.text as string)
      .join('\n\n')
      .trim();
  }
  return '';
}

/** Traduz as ferramentas do formato Anthropic para o formato OpenAI/OpenRouter. */
function traduzirFerramentas(tools: ToolDef[]): any[] {
  return (Array.isArray(tools) ? tools : []).map((t) => ({
    type: 'function',
    function: {
      name: t.name,
      description: t.description,
      // `parameters` é exatamente o input_schema (JSON Schema) que já existe em
      // FERRAMENTAS_GERENCIA — nenhuma conversão é necessária.
      parameters: t.input_schema,
    },
  }));
}

/**
 * Uma chamada ao OpenRouter, com timeout e SEM retry.
 * Erros de HTTP e erros embutidos no corpo (o OpenRouter às vezes responde 200
 * com `{ error: {...} }`) viram ErroOpenRouter para a classificação funcionar igual.
 */
async function chamarOpenRouter(chave: string, corpoRequisicao: Record<string, unknown>): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let resposta: Response;
  try {
    resposta = await fetch(ENDPOINT_OPENROUTER, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${chave}`,
        'X-Title': TITULO_APP,
      },
      body: JSON.stringify(corpoRequisicao),
      signal: controller.signal,
    });
  } catch (e) {
    // Rede caiu ou o timeout abortou. Status 0 = "nem chegou a responder".
    throw new ErroOpenRouter(0, recortarCorpo(mensagemDeErro(e)));
  } finally {
    clearTimeout(timer);
  }

  const texto = await resposta.text().catch(() => '');

  if (!resposta.ok) {
    console.error(`[manager-chat] OpenRouter respondeu ${resposta.status}:`, recortarCorpo(texto));
    throw new ErroOpenRouter(resposta.status, recortarCorpo(texto));
  }

  let dados: any = null;
  try {
    dados = texto ? JSON.parse(texto) : null;
  } catch {
    throw new ErroOpenRouter(resposta.status, recortarCorpo(texto));
  }

  if (dados?.error) {
    const detalhe = typeof dados.error === 'string' ? dados.error : JSON.stringify(dados.error);
    const status = paraInteiro(dados.error?.code) || resposta.status;
    console.error(`[manager-chat] OpenRouter devolveu erro no corpo:`, recortarCorpo(detalhe));
    throw new ErroOpenRouter(status, recortarCorpo(detalhe));
  }

  if (!Array.isArray(dados?.choices) || dados.choices.length === 0) {
    throw new ErroOpenRouter(resposta.status, 'resposta sem choices');
  }

  return dados;
}

// ─── Laço principal ─────────────────────────────────────────────────────────

export async function rodarConversaOpenRouter(opts: {
  chave: string;
  systemBlocks: Array<{ type: 'text'; text: string; cache_control?: { type: 'ephemeral' } }>;
  messages: any[];
  tools: ToolDef[];
  executarTool: (name: string, input: any) => Promise<unknown>;
  model?: string;
  /**
   * Nivel de esforco de raciocinio. O OpenRouter aceita `reasoning.effort` com
   * low | medium | high — medido em 26/08/2026 no anthropic/claude-sonnet-5:
   * low custou US$ 0,000076 e high US$ 0,000256 na mesma pergunta. Os niveis
   * xhigh e max do contrato nao existem aqui e sao rebaixados para high.
   */
  effort?: string;
  maxTokens?: number;
  maxIteracoes?: number;
}): Promise<RunResult & { custoUsd: number | null }> {
  const chave = typeof opts.chave === 'string' ? opts.chave.trim() : '';
  // Mensagem é um CÓDIGO, não texto para humano: lib/managerChat.ts traduz.
  if (!chave) throw new Error('ia_nao_configurada');

  const model = opts.model?.trim() || MODELO_PADRAO;
  const maxTokens = limitar(opts.maxTokens ?? MAX_TOKENS_PADRAO, MAX_TOKENS_PISO, MAX_TOKENS_TETO);
  const maxIteracoes = Math.max(1, opts.maxIteracoes ?? MAX_ITERACOES_PADRAO);
  const ferramentas = traduzirFerramentas(opts.tools);

  /**
   * O system vira UMA mensagem com content em ARRAY de partes, preservando a ordem
   * e o cache_control de cada bloco. É assim que o cache de prompt funciona (medido:
   * 92% de economia da 2ª chamada em diante). A parte volátil (data de hoje, nome do
   * gerente) chega aqui SEM cache_control e depois da parte estável — qualquer byte
   * que mude dentro da parte marcada invalida o cache inteiro.
   */
  const mensagemSystem = {
    role: 'system' as const,
    content: (Array.isArray(opts.systemBlocks) ? opts.systemBlocks : []).map((bloco) => {
      const parte: Record<string, unknown> = { type: 'text', text: String(bloco?.text ?? '') };
      if (bloco?.cache_control) parte.cache_control = bloco.cache_control;
      return parte;
    }),
  };

  // Cópia local: nunca mutamos o array que o chamador passou.
  const historico: any[] = [mensagemSystem, ...opts.messages];
  const toolCalls: ToolCallLog[] = [];

  const usage = {
    input_tokens: 0,
    output_tokens: 0,
    cache_read_tokens: 0,
    cache_creation_tokens: 0,
  };

  // Custo real em dólar somado de TODAS as voltas. Se QUALQUER volta vier sem o
  // campo `cost`, o total viraria uma soma parcial se passando por total — e um
  // número incompleto que não se declara é pior que número nenhum. Nesse caso
  // devolvemos null (zero mentiria: houve gasto, só não sabemos quanto).
  let custoAcumulado = 0;
  let custoCompleto = true;

  let stopReason = '';
  // O contrato oferece 5 niveis; o OpenRouter reconhece 3. Rebaixar xhigh/max
  // para high é melhor que mandar um valor que a API recusa com 400 — o gerente
  // veria um erro técnico por causa de um seletor de configuração.
  const esforcoBruto = String(opts.effort || '').toLowerCase();
  const esforcoOpenRouter =
    esforcoBruto === 'low' || esforcoBruto === 'medium'
      ? esforcoBruto
      : esforcoBruto === 'high' || esforcoBruto === 'xhigh' || esforcoBruto === 'max'
        ? 'high'
        : null;
  const reasoning = esforcoOpenRouter ? { effort: esforcoOpenRouter } : null;

  let textoFinal = '';
  let interrompidoPorLimite = false;
  let cortadoPorMaxTokens = false;

  for (let iteracao = 1; ; iteracao++) {
    const resposta = await chamarOpenRouter(chave, {
      model,
      max_tokens: maxTokens,
      messages: historico,
      tools: ferramentas,
      // Liga a contabilidade de uso do OpenRouter: sem isto o `cost` real não vem.
      usage: { include: true },
      ...(reasoning ? { reasoning } : {}),
    });

    // Usage é somado de TODAS as iterações: cada volta do laço é uma cobrança
    // separada, então contar só a última subfaturaria o relatório do dono.
    const uso = resposta?.usage;
    usage.input_tokens += paraInteiro(uso?.prompt_tokens);
    usage.output_tokens += paraInteiro(uso?.completion_tokens);
    usage.cache_read_tokens += paraInteiro(uso?.prompt_tokens_details?.cached_tokens);
    usage.cache_creation_tokens += paraInteiro(uso?.prompt_tokens_details?.cache_write_tokens);

    const custoDaVolta = Number(uso?.cost);
    if (Number.isFinite(custoDaVolta)) custoAcumulado += custoDaVolta;
    else custoCompleto = false;

    const escolha = resposta.choices[0];
    const mensagem = escolha?.message ?? {};
    const finishReason = String(escolha?.finish_reason ?? '');

    // Recusa é checada ANTES de ler o texto: numa recusa o content pode vir vazio
    // ou com texto que não é a resposta, e tratar como sucesso enganaria o gerente.
    const recusa = typeof mensagem?.refusal === 'string' ? mensagem.refusal.trim() : '';
    if (recusa || finishReason === 'content_filter') {
      return {
        texto: '',
        toolCalls,
        usage,
        model,
        stopReason: 'refusal',
        recusado: true,
        recusaMotivo: recusa || 'Conteúdo bloqueado pelo filtro do provedor.',
        custoUsd: custoCompleto ? custoAcumulado : null,
      };
    }

    const pedidosDeTool: any[] = Array.isArray(mensagem?.tool_calls) ? mensagem.tool_calls : [];

    // A saida do laco olha SO se ha ferramenta pedida. Alguns modelos devolvem
    // finish_reason 'stop' (ou vazio) JUNTO com tool_calls preenchido; checar o
    // finish_reason descartaria as consultas e o turno terminaria sem texto —
    // o gerente veria "a IA terminou sem escrever resposta".
    if (pedidosDeTool.length === 0) {
      textoFinal = extrairTexto(mensagem?.content);
      stopReason = finishReason;
      // 'length' significa que a API parou de escrever NO MEIO da frase —
      // possivelmente no meio de um número. Traduzimos para 'max_tokens' porque é
      // esse o código que o endpoint grava como 'resposta_truncada'.
      if (finishReason === 'length') {
        stopReason = 'max_tokens';
        cortadoPorMaxTokens = true;
      }
      break;
    }

    stopReason = finishReason;

    if (iteracao >= maxIteracoes) {
      // Devolve o que já existe de texto em vez de estourar erro: meia resposta
      // com aviso é mais útil ao gerente do que tela de falha.
      textoFinal = extrairTexto(mensagem?.content);
      interrompidoPorLimite = true;
      break;
    }

    // A mensagem do assistant volta INTEIRA, sem editar: os tool_calls precisam
    // chegar de volta com o mesmo id, senão a requisição seguinte é recusada.
    historico.push(mensagem);

    // Só os N primeiros pedidos rodam de fato. Os excedentes NÃO são omitidos:
    // todo tool_call precisa da sua mensagem `tool` com o mesmo id, senão o
    // OpenRouter recusa a requisição inteira e a conversa morre.
    const executaveis = pedidosDeTool.slice(0, MAX_TOOLS_POR_ITERACAO);
    const excedentes = pedidosDeTool.slice(MAX_TOOLS_POR_ITERACAO);

    // Execução EM PARALELO: uma resposta pode trazer vários tool_calls de uma vez
    // e rodar em série multiplicaria a latência sem necessidade (são leituras).
    const execucoes = await Promise.all(
      executaveis.map(async (pedido: any) => {
        const id = String(pedido?.id ?? '');
        const nome = String(pedido?.function?.name ?? '');
        const { ok: argsOk, input: entrada } = interpretarArgumentos(pedido?.function?.arguments);
        const inicio = Date.now();

        // `arguments` ilegível não derruba o turno: o modelo recebe a explicação e
        // pode reemitir a chamada corrigida na volta seguinte.
        if (!argsOk) {
          console.error(`[manager-chat] argumentos ilegíveis na ferramenta "${nome}"`);
          return {
            log: { name: nome, input: entrada, ms: 0, ok: false, erro: 'argumentos_invalidos' } as ToolCallLog,
            id,
            isErro: true,
            conteudo:
              `A ferramenta "${nome}" NÃO foi executada: os argumentos não são um JSON válido. ` +
              'Reenvie a chamada com um JSON bem formado. Não trate isso como ausência de dados.',
          };
        }

        try {
          const saida = await opts.executarTool(nome, entrada);
          return {
            log: { name: nome, input: entrada, ms: Date.now() - inicio, ok: true } as ToolCallLog,
            id,
            isErro: false,
            conteudo: serializarResultado(saida),
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
            id,
            isErro: true,
            // Ferramenta que falhou VOLTA mesmo assim: sem a mensagem `tool`
            // correspondente a API recusa a próxima requisição, e o modelo precisa
            // saber da falha para tentar outro caminho — saber QUE falhou basta,
            // o porquê interno não lhe serve.
            conteudo: `A ferramenta "${nome}" falhou (${ERRO_GENERICO_TOOL}). Não trate isso como ausência de dados: informe ao gerente que a consulta não pôde ser feita.`,
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
    const mensagensDeResultado: any[] = execucoes.map((item) => {
      let conteudo = item.conteudo;
      if (gastoDaIteracao + conteudo.length <= ORCAMENTO_TOOL_RESULT_POR_ITERACAO) {
        gastoDaIteracao += conteudo.length;
      } else {
        const restante = ORCAMENTO_TOOL_RESULT_POR_ITERACAO - gastoDaIteracao;
        gastoDaIteracao = ORCAMENTO_TOOL_RESULT_POR_ITERACAO;
        conteudo = cortarPorOrcamento(conteudo, restante);
      }
      return { role: 'tool', tool_call_id: item.id, content: conteudo };
    });

    for (const pedido of excedentes) {
      const id = String(pedido?.id ?? '');
      const nome = String(pedido?.function?.name ?? '');
      const { input: entrada } = interpretarArgumentos(pedido?.function?.arguments);
      toolCalls.push({
        name: nome,
        input: entrada,
        ms: 0,
        ok: false,
        erro: 'limite_de_ferramentas_por_iteracao',
      });
      mensagensDeResultado.push({
        role: 'tool',
        tool_call_id: id,
        content:
          `Não executada: o limite de ${MAX_TOOLS_POR_ITERACAO} ferramentas por rodada foi atingido ` +
          `(você pediu ${pedidosDeTool.length}). Peça de novo, poucas por vez e nesta ordem de prioridade.`,
      });
    }

    // UMA mensagem `tool` POR ferramenta — ao contrário da Anthropic, onde todos os
    // tool_result vão juntos num único `user`.
    for (const msg of mensagensDeResultado) historico.push(msg);
  }

  if (interrompidoPorLimite) {
    const aviso =
      `[Análise interrompida: o limite de ${maxIteracoes} passos de consulta foi atingido ` +
      `antes de a IA concluir. O que está acima pode estar incompleto. Refaça a pergunta ` +
      `de forma mais específica — um colaborador ou um período por vez.]`;
    textoFinal = textoFinal ? `${textoFinal}\n\n${aviso}` : aviso;
  }

  if (cortadoPorMaxTokens) {
    // O raciocínio do modelo consome o MESMO orçamento de max_tokens, então uma
    // pergunta ampla estoura o limite antes de a resposta terminar — às vezes antes
    // de existir qualquer texto. O aviso vai ANEXADO ao texto (e não só no
    // stopReason) porque é o texto que o gerente lê.
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
    custoUsd: custoCompleto ? custoAcumulado : null,
  };
}
