import {
  createIpRateLimiter,
  denyForbidden,
  getServiceClient,
  isPermissionGranted,
  requireSameOrigin,
  requireStaffAnyPermission,
  setNoStoreHeaders,
  UUID_RE,
  type StaffSessionUser,
} from './_auth.js';
import {
  MODELOS_DISPONIVEIS,
  NIVEIS_ESFORCO,
  PERM_AUDITAR,
  PERM_CHAT,
  PERM_TREINAR,
  type ManagerChatConfig,
  type ManagerChatReportRow,
  type NivelEsforco,
} from '../lib/managerChat.js';
import { anthropicConfigurado, codigoDeErroAnthropic, rodarConversa, type ToolCallLog } from './_anthropic.js';
import { FERRAMENTAS_GERENCIA, executarFerramentaGerencia, montarCatalogoEstavel } from './_managerTools.js';

/**
 * Vercel Serverless Function — Chat de IA da Gerência (SERVER-SIDE)
 * URL: /api/manager-chat   (só POST; toda ação vai em `body.action`)
 *
 * Contrato único de tipos/actions: `lib/managerChat.ts`. Nome de action ou
 * formato de retorno que não esteja lá não existe.
 *
 * ── Caminhos de autorização ────────────────────────────────────────────────
 * Toda chamada é um POST de browser carregando o cookie httpOnly de staff, e
 * passa SEMPRE por esta ordem (a mesma de api/content-planner.ts):
 *   1. `setNoStoreHeaders` — a resposta carrega conteúdo de conversa e
 *      permissões; nunca pode ficar em cache de proxy/browser.
 *   2. Allowlist de método (405 + header `Allow`) — só POST.
 *   3. `requireSameOrigin` — gate CSRF fail-closed. O cookie viaja sozinho em
 *      qualquer POST, inclusive um forjado por outro site; sem o Origin
 *      validado contra `STAFF_TRUSTED_ORIGINS` a requisição morre aqui.
 *   4. `requireStaffAnyPermission` com a permissão exigida PELA ACTION
 *      (mapa `PERMISSAO_POR_ACTION`, fail-closed: action desconhecida = 400,
 *      nunca "passa direto"):
 *        · manager_chat_view  → conversar e ver as PRÓPRIAS conversas,
 *                               `status` e `training-get` (leitura).
 *        · manager_chat_train → mexer em persona, conhecimento e regras —
 *                               muda como a IA responde para TODO MUNDO.
 *        · manager_chat_audit → ler conversa de qualquer gerente
 *                               (`list-threads-all`) e o relatório de consumo.
 *   5. `getServiceClient()` (service_role, bypassa RLS) — 503
 *      `supabase_unavailable` se faltar env.
 *   6. Despacho por action.
 *
 * ── Isolamento de thread (a checagem que impede um gerente ler o outro) ────
 * Permissão só diz "pode usar o chat"; ela NÃO diz "pode ler esta conversa".
 * Toda action que recebe `thread_id` passa por `carregarThread`, que confere
 * `thread.user_id === staff.id`. Quem não é dono só passa em LEITURA e só se
 * tiver `manager_chat_audit`. ESCRITA (ask/rename/archive) exige ser dono,
 * sempre — auditor lê, não escreve na conversa alheia.
 *
 * ── A IA é SOMENTE LEITURA ────────────────────────────────────────────────
 * Nada aqui envia WhatsApp, altera lead, matrícula ou tarefa. As únicas
 * escritas deste endpoint são no próprio histórico do chat e nas tabelas de
 * treinamento. As ferramentas do Claude (api/_managerTools.ts) são todas de
 * consulta.
 *
 * ── Chave da Anthropic ────────────────────────────────────────────────────
 * `process.env.ANTHROPIC_API_KEY`, SÓ no servidor (lida dentro de
 * api/_anthropic.ts). Nunca de tabela do banco e nunca com prefixo VITE_:
 * `SITE_SystemSettings` tem leitura pública neste projeto e já vaza as outras
 * chaves de IA. Sem a chave o chat continua abrindo e GRAVANDO a pergunta
 * (auditoria do dono), e devolve `ia_nao_configurada`.
 */

// ─── Tabelas ────────────────────────────────────────────────────────────────
const T_THREADS = 'SITE_ManagerChatThreads';
const T_MENSAGENS = 'SITE_ManagerChatMessages';
const T_CONFIG = 'SITE_ManagerChatConfig';
const T_CONHECIMENTO = 'SITE_ManagerChatKnowledge';
const T_REGRAS = 'SITE_ManagerChatRules';

const SELECT_THREAD = 'id, user_id, user_name, title, archived, created_at, updated_at';
const SELECT_MENSAGEM =
  'id, thread_id, role, content, tool_calls, model, input_tokens, output_tokens, cache_read_tokens, latency_ms, error, created_at';
const SELECT_CONFIG = 'id, enabled, persona, business_info, guardrails_extra, model, effort, max_tokens, updated_at';
const SELECT_CONHECIMENTO = 'id, topic, title, content, enabled';
const SELECT_REGRA = 'id, type, value, enabled';

// ─── Limites ────────────────────────────────────────────────────────────────
const MAX_PERGUNTA = 8000;
/** Quantas mensagens (user + assistant) do histórico vão junto no contexto. */
const TURNOS_NO_CONTEXTO = 20;
/** Teto de max_tokens para requisição SEM streaming. */
const MAX_TOKENS_TETO = 16000;
const MAX_TOKENS_PISO = 1024;
const MAX_TITULO = 60;
const MAX_THREADS_LISTADAS = 100;
/**
 * Teto de mensagens devolvidas por `list-messages`. Sem teto, uma conversa
 * longa vira uma resposta JSON de dezenas de MB — o navegador do gerente
 * engasga antes de renderizar. Devolvemos as MAIS RECENTES (é o que ele quer
 * ver ao abrir a thread) e avisamos que cortou.
 */
const MAX_MENSAGENS_LISTADAS = 400;
/**
 * Teto de itens de conhecimento e de regras lidos por consulta. Sem `.limit()`
 * o PostgREST devolve tudo e o system prompt cresce sem limite.
 */
const MAX_ITENS_TREINAMENTO = 200;
/**
 * Orçamento de caracteres para conhecimento + regras dentro do bloco CACHEADO
 * do system. Estourar isso não deixa a resposta melhor — só multiplica o custo
 * de cache write em TODA primeira pergunta de cada conversa.
 */
const MAX_CHARS_TREINAMENTO = 120_000;
/** Janela máxima aceita pelo relatório: um ano (+1 dia de folga para bissexto). */
const MAX_DIAS_RELATORIO = 366;
/** Tetos de leitura do relatório — o banco cresce, a serverless tem memória fixa. */
const MAX_THREADS_RELATORIO = 20_000;
const MAX_MENSAGENS_RELATORIO = 50_000;

const MODELOS_VALIDOS = new Set<string>(MODELOS_DISPONIVEIS.map((m) => m.id));
const ESFORCOS_VALIDOS = new Set<string>(NIVEIS_ESFORCO);
const TIPOS_REGRA = new Set(['forbidden', 'required', 'escalate']);

/** Rate limit por IP — SÓ na action `ask` (as outras são leituras baratas). */
const limitadorPerguntas = createIpRateLimiter({ windowMs: 60_000, maxAttempts: 20 });

/**
 * Permissão exigida por action. Fail-closed: action fora deste mapa é 400,
 * nunca cai num caminho sem gate.
 *
 * Prototype NULO de propósito: num objeto literal comum, `action: "toString"`
 * herda `Function.prototype.toString`, passa pelo guard `if (!permissoes)`
 * (função é truthy) e explode lá dentro com TypeError → 500 sem envelope.
 * Sem prototype, só as chaves escritas abaixo existem.
 */
const PERMISSAO_POR_ACTION: Record<string, readonly string[]> = Object.assign(Object.create(null), {
  status: [PERM_CHAT],
  'list-threads': [PERM_CHAT],
  'create-thread': [PERM_CHAT],
  'rename-thread': [PERM_CHAT],
  'archive-thread': [PERM_CHAT],
  'list-messages': [PERM_CHAT],
  ask: [PERM_CHAT],
  'training-get': [PERM_CHAT],
  'config-save': [PERM_TREINAR],
  'knowledge-save': [PERM_TREINAR],
  'knowledge-delete': [PERM_TREINAR],
  'rules-save': [PERM_TREINAR],
  'rules-delete': [PERM_TREINAR],
  'list-threads-all': [PERM_AUDITAR],
  report: [PERM_AUDITAR],
});

// ─── Config padrão (usada enquanto a linha única não foi criada) ────────────
const CONFIG_PADRAO: ManagerChatConfig = {
  enabled: true,
  persona: '',
  business_info: '',
  guardrails_extra: '',
  model: 'claude-opus-5',
  effort: 'high',
  max_tokens: MAX_TOKENS_TETO,
};

/**
 * Guardrails FIXOS — entram no bloco cacheado do system. Não pode conter data,
 * hora, nome de usuário nem nada variável: cache de prompt é prefix match, um
 * único byte diferente invalida tudo que vem depois.
 */
const GUARDRAILS_FIXOS = `Você é a inteligência de apoio à GERÊNCIA da W-Tech Brasil. Um gestor conversa com você sobre como anda o atendimento de cada colaborador da equipe.

REGRAS INEGOCIÁVEIS:
1. Você é SOMENTE LEITURA. Você não envia mensagem de WhatsApp, não altera lead, não mexe em matrícula, tarefa ou qualquer registro do sistema. Se pedirem isso, explique que o chat só consulta e que a ação precisa ser feita na tela correspondente do painel.
2. NUNCA invente número. Todo dado quantitativo que você citar precisa ter vindo de uma ferramenta que você executou nesta conversa. Se você não chamou a ferramenta, você não sabe o número — e diz isso.
3. SEMPRE diga de onde veio o dado. Ao citar qualquer métrica ou trecho de conversa, aponte a ferramenta que devolveu aquilo (ex.: "segundo a ferramenta de métricas de leads..."). O gestor precisa poder conferir.
4. Quando os dados NÃO permitirem concluir, diga isso. É melhor responder "os dados disponíveis não mostram isso" do que estimar, arredondar por cima ou completar a lacuna com suposição. Não trate ausência de registro como prova de que algo não aconteceu — diga que não há registro.
5. Ao avaliar pessoas, seja FACTUAL e cite evidência. Fale de comportamento observável e mensurável: tempo de resposta, quantidade de mensagens, leads sem retorno, trechos reais de conversa. Nunca adjetive o caráter de ninguém — não diga que alguém é preguiçoso, desmotivado, incompetente ou desonesto. Descreva o que os dados mostram e deixe a conclusão sobre a pessoa para o gestor.
6. NÃO dê conselho jurídico nem trabalhista. Nada de opinar sobre justa causa, advertência formal, demissão, rescisão, processo, direito do trabalhador ou enquadramento legal. Se o assunto surgir, diga que isso precisa passar pelo RH ou pelo jurídico da empresa e volte para os fatos do atendimento.
7. Cuidado com identidade de colaborador. As tabelas identificam a mesma pessoa de formas diferentes (UUID em uns lugares, nome em texto em outros, às vezes com grafia divergente). Quando o resultado de uma ferramenta avisar que o cruzamento foi feito por NOME e não por identificador, repasse esse aviso ao gestor: o número pode estar incompleto.
8. Responda em PORTUGUÊS DO BRASIL, direto ao ponto, em markdown simples (títulos curtos, listas, negrito). Sem tabela gigante, sem enrolação, sem repetir a pergunta antes de responder.
9. Prefira chamar VÁRIAS ferramentas de uma vez quando as consultas são independentes — é mais rápido para o gestor. Se uma ferramenta falhar, diga qual falhou e responda com o que sobrou, sem fingir que o dado veio.
10. Esta conversa é gravada e auditada pelo dono da empresa. Escreva como quem sabe que será lido depois.`;

/**
 * Preço da API da Anthropic por MILHÃO de tokens (USD).
 *
 * ATENÇÃO: tabela ESTÁTICA, copiada da tabela pública da Anthropic. Se a
 * Anthropic mudar preço ou um modelo novo entrar em `MODELOS_DISPONIVEIS`,
 * este mapa precisa ser conferido À MÃO — o relatório de custo continua
 * somando com o número velho sem reclamar.
 *
 * Token LIDO de cache custa 10% do preço de entrada (`FATOR_CACHE_LEITURA`).
 * Token de ESCRITA de cache (cache_creation) custa 1,25x a entrada normal
 * (`FATOR_CACHE_ESCRITA`) e agora É gravado em `SITE_ManagerChatMessages` — sem
 * ele o custo do PRIMEIRO turno de cada conversa (justamente o que paga o bloco
 * cacheado inteiro) saía subestimado no relatório do dono.
 */
const PRECO_POR_MILHAO: Record<string, { entrada: number; saida: number }> = {
  'claude-opus-5': { entrada: 5, saida: 25 },
  'claude-sonnet-5': { entrada: 3, saida: 15 },
  'claude-haiku-4-5': { entrada: 1, saida: 5 },
};
const FATOR_CACHE_LEITURA = 0.1;
const FATOR_CACHE_ESCRITA = 1.25;
/** Modelo desconhecido (ex.: linha antiga) é cobrado pelo mais caro — nunca subestima. */
const PRECO_FALLBACK = PRECO_POR_MILHAO['claude-opus-5'];

// ─── Respostas padrão ───────────────────────────────────────────────────────
function ok(res: any, data: unknown) {
  return res.status(200).json({ success: true, data });
}
function falha(res: any, status: number, error: string) {
  return res.status(status).json({ success: false, error });
}
function erroBanco(res: any, contexto: string, error: { message: string } | null) {
  console.error(`[manager-chat] falha ao ${contexto}:`, error?.message);
  return falha(res, 500, 'db_error');
}

// ─── Validação de entrada ───────────────────────────────────────────────────
function texto(raw: unknown, max: number): string {
  return typeof raw === 'string' ? raw.trim().slice(0, max) : '';
}

function inteiroLimitado(raw: unknown, padrao: number, min: number, max: number): number {
  const n = Number.parseInt(String(raw ?? ''), 10);
  if (!Number.isFinite(n)) return padrao;
  return Math.min(max, Math.max(min, n));
}

function uuidValido(raw: unknown): string | null {
  const valor = String(raw ?? '');
  return UUID_RE.test(valor) ? valor : null;
}

/** Nome do cargo do staff logado (o DTO traz objeto ou string). */
function nomeDoCargo(staff: StaffSessionUser): string {
  const role: any = staff.role;
  if (!role) return 'sem cargo definido';
  if (typeof role === 'string') return role;
  return String(role.name || 'sem cargo definido');
}

/** Título automático da thread: ~60 caracteres, cortando em palavra inteira. */
function cortarTitulo(pergunta: string): string {
  const limpo = pergunta.replace(/\s+/g, ' ').trim();
  if (limpo.length <= MAX_TITULO) return limpo;
  const pedaco = limpo.slice(0, MAX_TITULO);
  const ultimoEspaco = pedaco.lastIndexOf(' ');
  const base = ultimoEspaco > 20 ? pedaco.slice(0, ultimoEspaco) : pedaco;
  return `${base.trim()}…`;
}

// ─── Acesso a thread (isolamento) ───────────────────────────────────────────
/**
 * Carrega a thread e aplica o isolamento. Devolve null quando JÁ respondeu.
 * `escrita: true` (ask/rename/archive) exige ser o dono — nem auditor escreve
 * na conversa alheia. Em leitura, quem tem `manager_chat_audit` passa.
 */
async function carregarThread(
  supabase: any,
  res: any,
  staff: StaffSessionUser,
  rawThreadId: unknown,
  opts: { escrita: boolean },
): Promise<any | null> {
  const threadId = uuidValido(rawThreadId);
  if (!threadId) {
    falha(res, 404, 'thread_not_found');
    return null;
  }
  const { data, error } = await supabase.from(T_THREADS).select(SELECT_THREAD).eq('id', threadId).maybeSingle();
  if (error) {
    erroBanco(res, 'carregar a conversa', error);
    return null;
  }
  if (!data) {
    falha(res, 404, 'thread_not_found');
    return null;
  }
  if (data.user_id !== staff.id) {
    const podeAuditar = isPermissionGranted(staff.permissions, PERM_AUDITAR);
    if (opts.escrita || !podeAuditar) {
      denyForbidden(res);
      return null;
    }
  }
  return data;
}

// ─── Treinamento (config + conhecimento + regras) ───────────────────────────
async function lerConfig(supabase: any): Promise<{ config: ManagerChatConfig; erro: any }> {
  const { data, error } = await supabase.from(T_CONFIG).select(SELECT_CONFIG).limit(1).maybeSingle();
  if (error || !data) return { config: { ...CONFIG_PADRAO }, erro: error };
  return {
    config: {
      id: data.id,
      enabled: data.enabled !== false,
      // `persona`, `business_info` e `guardrails_extra` são NULLABLE no banco,
      // mas `ManagerChatConfig` os declara como string não-nula: sem este
      // COALESCE a tela de treinamento abriria com <textarea value={null}> e o
      // React trocaria o campo controlado por não-controlado no meio da edição.
      persona: data.persona || '',
      business_info: data.business_info || '',
      guardrails_extra: data.guardrails_extra || '',
      model: MODELOS_VALIDOS.has(data.model) ? data.model : CONFIG_PADRAO.model,
      effort: (ESFORCOS_VALIDOS.has(data.effort) ? data.effort : CONFIG_PADRAO.effort) as NivelEsforco,
      max_tokens: inteiroLimitado(data.max_tokens, CONFIG_PADRAO.max_tokens, MAX_TOKENS_PISO, MAX_TOKENS_TETO),
      updated_at: data.updated_at,
    },
    erro: null,
  };
}

/**
 * BLOCO A do system — o pedaço CACHEADO. Só conteúdo estável: guardrails,
 * persona, informações do negócio, base de conhecimento, regras e o catálogo
 * de ferramentas. Nenhuma data, nenhum nome de quem perguntou, nenhum id
 * aleatório — qualquer variação aqui invalida o cache inteiro.
 */
function montarBlocoEstavel(
  config: ManagerChatConfig,
  conhecimento: any[],
  regras: any[],
  catalogo: string,
  corte: { regras: boolean; conhecimento: boolean } = { regras: false, conhecimento: false },
): string {
  const partes: string[] = [GUARDRAILS_FIXOS];

  if (config.persona.trim()) {
    partes.push(`## Como você deve se comportar\n\n${config.persona.trim()}`);
  }
  if (config.business_info.trim()) {
    partes.push(`## Sobre a W-Tech Brasil\n\n${config.business_info.trim()}`);
  }
  if (config.guardrails_extra.trim()) {
    partes.push(`## Restrições adicionais definidas pela empresa\n\n${config.guardrails_extra.trim()}`);
  }

  // Orçamento de caracteres compartilhado por regras + conhecimento. Cada item
  // pode ter 20.000 caracteres e não havia teto de QUANTIDADE: 200 itens viram
  // 4 MB reenviados em toda pergunta, cobrados como cache write na primeira.
  // As REGRAS entram primeiro de propósito — são guardrail, conhecimento é apoio.
  let orcamento = MAX_CHARS_TREINAMENTO;
  const omitidos: string[] = [];

  // Corte por QUANTIDADE (o `.limit()` da consulta) era tão mudo quanto o corte
  // por caracteres: com 201 regras cadastradas, a 201ª sumia do system prompt em
  // silêncio e o aviso de material incompleto NÃO era emitido. Agora a consulta
  // pede um item a mais que o teto só para poder declarar o corte aqui.
  if (corte.regras) omitidos.push(`as regras acima do teto de ${MAX_ITENS_TREINAMENTO} itens`);
  if (corte.conhecimento) {
    omitidos.push(`os itens de conhecimento acima do teto de ${MAX_ITENS_TREINAMENTO}`);
  }

  const regrasAtivas = regras.filter((r) => r.enabled !== false);
  if (regrasAtivas.length) {
    const grupos: Array<[string, string]> = [
      ['forbidden', 'NUNCA faça'],
      ['required', 'SEMPRE faça'],
      ['escalate', 'Avise que o assunto precisa subir para a diretoria'],
    ];
    let regrasCortadas = 0;
    const blocos = grupos
      .map(([tipo, titulo]) => {
        const linhas: string[] = [];
        for (const r of regrasAtivas.filter((x) => x.type === tipo)) {
          const linha = `- ${r.value}`;
          if (linha.length > orcamento) {
            regrasCortadas += 1;
            continue;
          }
          orcamento -= linha.length;
          linhas.push(linha);
        }
        return linhas.length ? `### ${titulo}\n${linhas.join('\n')}` : '';
      })
      .filter(Boolean);
    if (regrasCortadas) omitidos.push(`${regrasCortadas} regra(s)`);
    if (blocos.length) partes.push(`## Regras de operação\n\n${blocos.join('\n\n')}`);
  }

  const ativos = conhecimento.filter((k) => k.enabled !== false);
  if (ativos.length) {
    const itens: string[] = [];
    let conhecimentoCortado = 0;
    for (const k of ativos) {
      const item = `### ${k.title || 'Sem título'}${k.topic ? ` (${k.topic})` : ''}\n${k.content || ''}`;
      if (item.length > orcamento) {
        conhecimentoCortado += 1;
        continue;
      }
      orcamento -= item.length;
      itens.push(item);
    }
    if (conhecimentoCortado) omitidos.push(`${conhecimentoCortado} item(ns) da base de conhecimento`);
    if (itens.length) partes.push(`## Base de conhecimento interna\n\n${itens.join('\n\n')}`);
  }

  // O aviso vai DENTRO do prompt: a IA precisa saber que está trabalhando com
  // material incompleto para poder dizer isso ao gestor, em vez de responder
  // com confiança sobre uma base que não recebeu inteira.
  if (omitidos.length) {
    partes.push(
      `## Aviso de material incompleto\n\nOs limites de contexto cortaram ${omitidos.join(' e ')} do material de treinamento acima. Se a pergunta depender de conhecimento interno ou de regra que você não encontra aqui, diga ao gestor que a base de treinamento excedeu o limite e pode estar incompleta — não conclua nada por ausência.`,
    );
  }

  // Catálogo da equipe: muda só quando alguém entra/sai — por isso pode ficar
  // dentro do prefixo cacheado.
  partes.push(catalogo);
  return partes.join('\n\n---\n\n');
}

/**
 * BLOCO B — NÃO cacheado. Tudo que muda a cada pergunta: quem perguntou e a
 * data de hoje. Fica DEPOIS do bloco A justamente para não quebrar o prefixo.
 */
function montarBlocoVolatil(staff: StaffSessionUser): string {
  const hoje = new Date().toISOString().slice(0, 10);
  return [
    '## Contexto desta conversa',
    `Quem está perguntando agora: ${staff.name} — cargo: ${nomeDoCargo(staff)}.`,
    `Data de hoje: ${hoje}.`,
    'Use esta data como referência quando o gestor falar em "hoje", "esta semana" ou "este mês".',
  ].join('\n');
}

/** Histórico da thread → array de mensagens da API, já higienizado. */
function montarMensagens(historico: any[], pergunta: string): Array<{ role: 'user' | 'assistant'; content: string }> {
  const mensagens: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  for (const linha of historico) {
    const conteudo = String(linha.content || '').trim();
    // Linha sem texto (falha gravada só para auditoria) não pode ir para a API:
    // bloco de texto vazio devolve 400.
    if (!conteudo) continue;
    const role: 'user' | 'assistant' = linha.role === 'assistant' ? 'assistant' : 'user';
    const anterior = mensagens[mensagens.length - 1];
    // A API combina/rejeita mensagens seguidas do mesmo papel — junta aqui.
    if (anterior && anterior.role === role) {
      anterior.content = `${anterior.content}\n\n${conteudo}`;
      continue;
    }
    // A conversa precisa começar por 'user'.
    if (!mensagens.length && role === 'assistant') continue;
    mensagens.push({ role, content: conteudo });
  }

  const ultima = mensagens[mensagens.length - 1];
  if (ultima && ultima.role === 'user') ultima.content = `${ultima.content}\n\n${pergunta}`;
  else mensagens.push({ role: 'user', content: pergunta });
  return mensagens;
}

/** Coluna de tokens de ESCRITA de cache — pode ainda não existir no banco. */
const COL_CACHE_ESCRITA = 'cache_creation_tokens';

/**
 * O PostgREST reclama de coluna inexistente citando o NOME dela na mensagem
 * (PGRST204 no insert, 42703 no select). É o único sinal disponível pelo
 * cliente — não há introspecção de schema aqui.
 */
function erroDeColunaAusente(error: { message?: string } | null, coluna: string): boolean {
  return String(error?.message || '').includes(coluna);
}

/**
 * Grava a mensagem do assistente com `cache_creation_tokens`. Se a migration
 * que cria essa coluna ainda não rodou, o insert é REFEITO sem ela: perder a
 * contabilidade de um token não pode custar a linha de auditoria da resposta —
 * thread com pergunta e sem resposta é exatamente o buraco que evitamos.
 */
async function inserirMensagemComCacheEscrita(
  supabase: any,
  linha: Record<string, unknown>,
  select: string,
): Promise<{ data: any; error: { message: string } | null }> {
  const executar = (payload: Record<string, unknown>) =>
    supabase.from(T_MENSAGENS).insert(payload).select(select).maybeSingle();

  const primeira = await executar(linha);
  if (primeira.error && erroDeColunaAusente(primeira.error, COL_CACHE_ESCRITA)) {
    console.warn(
      `[manager-chat] coluna ${COL_CACHE_ESCRITA} ausente em ${T_MENSAGENS}; gravando sem ela (custo de cache write ficará subestimado até a migration rodar).`,
    );
    const { [COL_CACHE_ESCRITA]: _semColuna, ...resto } = linha;
    return executar(resto);
  }
  return primeira;
}

/**
 * Falha de BANCO dentro do turno da pergunta. Existe para que nenhum caminho de
 * erro saia por `return` de dentro do `try` de `acaoPerguntar`: retorno normal
 * pula o catch e, com ele, a gravação da linha de auditoria — deixando a thread
 * com a pergunta do gerente e NENHUMA linha de assistant. O código é estável e
 * já existe no mapa de mensagens de lib/managerChat.ts.
 */
class FalhaDeContexto extends Error {
  readonly codigo = 'contexto_indisponivel';
  constructor(contexto: string, causa?: { message?: string } | null) {
    super(`falha ao ${contexto}: ${causa?.message || 'sem detalhe do banco'}`);
    this.name = 'FalhaDeContexto';
  }
}

// ─── Action: ask ────────────────────────────────────────────────────────────
async function acaoPerguntar(req: any, res: any, supabase: any, staff: StaffSessionUser) {
  if (limitadorPerguntas.isLimited(req)) return falha(res, 429, 'rate_limited');

  // 1. Pergunta válida.
  const bruta = typeof req.body?.question === 'string' ? req.body.question.trim() : '';
  if (!bruta) return falha(res, 400, 'pergunta_vazia');
  if (bruta.length > MAX_PERGUNTA) return falha(res, 400, 'pergunta_longa');

  // Thread: escrita exige ser dono. Conversa NOVA só quando `thread_id` nem vem
  // no corpo. String vazia, null ou id malformado NÃO abre conversa nova: o
  // gerente ficava com uma thread fantasma na auditoria a cada envio, enquanto
  // rename/archive respondiam erro para exatamente o mesmo valor. Aqui vira 400
  // `id_invalido`, igual às demais actions.
  const idPedido = req.body?.thread_id;
  let thread: any;
  if (idPedido === undefined) {
    const { data, error } = await supabase
      .from(T_THREADS)
      .insert({ user_id: staff.id, user_name: staff.name, title: null, archived: false })
      .select(SELECT_THREAD)
      .maybeSingle();
    if (error || !data) return erroBanco(res, 'abrir a conversa', error);
    thread = data;
  } else {
    if (!uuidValido(idPedido)) return falha(res, 400, 'id_invalido');
    thread = await carregarThread(supabase, res, staff, idPedido, { escrita: true });
    if (!thread) return;
  }

  // 2. Configuração — chat pode estar desligado no treinamento.
  // FAIL-CLOSED: se a leitura falhar, `lerConfig` devolve o padrão (enabled:true,
  // persona vazia, guardrails vazios). Seguir com isso significaria religar um
  // chat que o dono desligou, e ainda por cima sem persona e sem regra nenhuma.
  // Falha de leitura de config = não pergunta.
  const { config, erro: erroConfig } = await lerConfig(supabase);
  if (erroConfig) return erroBanco(res, 'ler a configuração do chat', erroConfig);
  if (config.enabled === false) return falha(res, 400, 'chat_desativado');

  // 3. O `try` começa AQUI, ANTES de gravar a pergunta. Daqui para baixo TODA
  // falha sai por exceção e o catch é o PONTO ÚNICO de resposta e de gravação da
  // linha de auditoria: um `return erroBanco(...)` de dentro do try sai por
  // retorno normal, pula o catch e deixa a thread com a pergunta do gerente e
  // NENHUMA linha de assistant — exatamente o buraco que o catch existe para
  // fechar. `tocarThread` também entrou para cá: fora do try, uma rejeição dela
  // matava a função com 500 cru fora do envelope (hoje o postgrest-js nunca
  // rejeita, mas isso é invariante da versão da dependência, não deste código).
  const inicio = Date.now();
  let chamouIA = false;
  try {
    // 4. A pergunta é gravada ANTES de qualquer coisa dar errado: o dono quer
    // auditoria de tudo que o gerente escreve, inclusive quando a IA não responde.
    const { error: erroUser } = await supabase
      .from(T_MENSAGENS)
      .insert({ thread_id: thread.id, role: 'user', content: bruta });
    if (erroUser) throw new FalhaDeContexto('gravar a pergunta', erroUser);
    // Título e `updated_at` já sobem aqui: se a IA falhar depois, a conversa
    // continua aparecendo nomeada na lista do gestor.
    thread = await tocarThread(supabase, thread, bruta);

    // Sem chave, a pergunta já ficou gravada — mas thread com pergunta e NENHUMA
    // linha de assistant é buraco de auditoria, ainda que benigno. Grava a linha
    // de falha do mesmo jeito que o catch faz, ANTES de responder o erro.
    if (!anthropicConfigurado()) {
      try {
        // O postgrest-js NÃO lança em falha: devolve `{ error }`. Sem ler esse
        // campo, um insert de auditoria rejeitado sumiria sem log — e o try/catch
        // ao redor nunca dispararia.
        const { error: erroAuditoria } = await supabase.from(T_MENSAGENS).insert({
          thread_id: thread.id,
          role: 'assistant',
          content:
            'A inteligência artificial não está configurada neste servidor (falta a chave da Anthropic). ' +
            'A pergunta ficou registrada, mas não houve resposta.',
          model: config.model,
          latency_ms: Date.now() - inicio,
          error: 'ia_nao_configurada',
        });
        if (erroAuditoria) {
          console.error('[manager-chat] falha ao gravar auditoria de ia_nao_configurada:', erroAuditoria.message);
        }
      } catch (erroAuditoria) {
        console.error('[manager-chat] falha ao gravar a linha de IA não configurada:', erroAuditoria);
      }
      return falha(res, 503, 'ia_nao_configurada');
    }

    // 5.1 System em dois blocos: o estável (cacheado) e o volátil.
    // Os erros das duas consultas são CHECADOS: com o campo `error` ignorado,
    // um erro transitório do PostgREST devolvia data=null e a pergunta era
    // respondida sem NENHUMA regra 'forbidden' cadastrada — em silêncio.
    // Guardrail que some sozinho é pior do que pergunta que não responde.
    // O `.limit()` pede UM ITEM A MAIS que o teto: o item extra é descartado,
    // mas denuncia que o corte por QUANTIDADE aconteceu. Sem ele, a 201ª regra
    // 'forbidden' sumia do system prompt sem que o aviso de material incompleto
    // fosse emitido — guardrail que some calado é o pior modo de falha aqui.
    const [
      { data: conhecimento, error: erroConhecimento },
      { data: regras, error: erroRegras },
      catalogo,
    ] = await Promise.all([
      supabase
        .from(T_CONHECIMENTO)
        .select(SELECT_CONHECIMENTO)
        .order('topic', { ascending: true })
        .limit(MAX_ITENS_TREINAMENTO + 1),
      supabase
        .from(T_REGRAS)
        .select(SELECT_REGRA)
        .order('type', { ascending: true })
        .limit(MAX_ITENS_TREINAMENTO + 1),
      montarCatalogoEstavel(supabase),
    ]);
    if (erroConhecimento) throw new FalhaDeContexto('ler a base de conhecimento', erroConhecimento);
    if (erroRegras) throw new FalhaDeContexto('ler as regras de operação', erroRegras);

    const listaConhecimento = conhecimento || [];
    const listaRegras = regras || [];
    const corteDeTreinamento = {
      conhecimento: listaConhecimento.length > MAX_ITENS_TREINAMENTO,
      regras: listaRegras.length > MAX_ITENS_TREINAMENTO,
    };

    const systemBlocks = [
      {
        type: 'text' as const,
        text: montarBlocoEstavel(
          config,
          listaConhecimento.slice(0, MAX_ITENS_TREINAMENTO),
          listaRegras.slice(0, MAX_ITENS_TREINAMENTO),
          catalogo,
          corteDeTreinamento,
        ),
        cache_control: { type: 'ephemeral' as const },
      },
      { type: 'text' as const, text: montarBlocoVolatil(staff) },
    ];

    // 5.2 Últimos turnos da thread, em ordem cronológica (a pergunta recém-gravada
    // já entra aqui — por isso o histórico é lido DEPOIS do insert).
    const { data: recentes, error: erroHistorico } = await supabase
      .from(T_MENSAGENS)
      .select('role, content')
      .eq('thread_id', thread.id)
      .order('created_at', { ascending: false })
      .limit(TURNOS_NO_CONTEXTO + 1);
    if (erroHistorico) throw new FalhaDeContexto('ler o histórico da conversa', erroHistorico);
    const historico = (recentes || []).slice().reverse();
    // A última linha do histórico é a própria pergunta; ela entra pelo parâmetro.
    historico.pop();
    const messages = montarMensagens(historico, bruta);

    // Daqui para baixo, uma exceção veio da Anthropic. Antes disso ela veio do
    // banco (montar o catálogo, ler o histórico) — e a linha de auditoria não
    // pode culpar a Anthropic por uma falha que foi do banco.
    chamouIA = true;

    // Roda a conversa (o loop de tool use mora em api/_anthropic.ts).
    const resultado = await rodarConversa({
      model: config.model,
      effort: config.effort,
      maxTokens: config.max_tokens,
      systemBlocks,
      messages,
      tools: FERRAMENTAS_GERENCIA,
      executarTool: (nome: string, input: any) => executarFerramentaGerencia(supabase, nome, input),
    });
    const latencia = Date.now() - inicio;

    // 6. Grava a resposta. Recusa também é gravada — com o motivo no corpo.
    //
    // O `stop_reason` da API é LIDO aqui: 'max_tokens' quer dizer que a resposta
    // parou no meio (o aviso já vem anexado ao texto por api/_anthropic.ts), e
    // isso precisa virar `error` para entrar na contagem de erros do relatório
    // do dono. Gravar como turno normal seria truncamento mudo.
    const truncada = !resultado.recusado && resultado.stopReason === 'max_tokens';
    // Mesma família do truncamento por max_tokens: o aviso já vai anexado ao texto,
    // mas sem virar `error` a análise interrompida contaria como turno normal no
    // relatório de custo do dono — e ele não veria que a resposta ficou pela metade.
    const interrompida = !resultado.recusado && !truncada && resultado.interrompidoPorLimite === true;
    const textoDaIA = String(resultado.texto || '').trim();

    let conteudo: string;
    let codigoDeErro: string | null;
    if (resultado.recusado) {
      conteudo = resultado.recusaMotivo || 'A IA recusou responder a esta pergunta.';
      codigoDeErro = 'recusado';
    } else if (textoDaIA) {
      conteudo = resultado.texto;
      codigoDeErro = truncada ? 'resposta_truncada' : interrompida ? 'analise_interrompida' : null;
    } else {
      // NUNCA conteúdo vazio com error null: a tela renderizaria um balão vazio e
      // o relatório contaria o turno como normal, com zero erros. Texto vazio é
      // falha — costuma acontecer quando o raciocínio consome todo o max_tokens
      // antes de sair o primeiro bloco de texto.
      conteudo =
        'A IA terminou sem escrever resposta. Isso costuma acontecer quando o limite de tamanho ' +
        'é consumido antes de a resposta começar. Refaça a pergunta com um recorte menor — ' +
        'um colaborador por vez, ou um período mais curto.';
      codigoDeErro = truncada
        ? 'resposta_truncada'
        : interrompida
          ? 'analise_interrompida'
          : 'resposta_vazia';
    }

    const { data: mensagem, error: erroAssistente } = await inserirMensagemComCacheEscrita(
      supabase,
      {
        thread_id: thread.id,
        role: 'assistant',
        content: conteudo,
        tool_calls: (resultado.toolCalls as ToolCallLog[] | undefined) ?? null,
        model: resultado.model || config.model,
        input_tokens: resultado.usage?.input_tokens ?? null,
        output_tokens: resultado.usage?.output_tokens ?? null,
        cache_read_tokens: resultado.usage?.cache_read_tokens ?? null,
        [COL_CACHE_ESCRITA]: resultado.usage?.cache_creation_tokens ?? null,
        latency_ms: latencia,
        error: codigoDeErro,
      },
      SELECT_MENSAGEM,
    );
    if (erroAssistente || !mensagem) throw new FalhaDeContexto('gravar a resposta', erroAssistente);

    // 7. Thread sobe na lista e ganha título na primeira pergunta.
    const atualizada = await tocarThread(supabase, thread, bruta);

    return ok(res, { message: mensagem, thread: atualizada });
  } catch (err) {
    // 8. Falha também vira linha no histórico — auditoria não pode ter buraco.
    // Antes da chamada à IA o culpado é o banco (catálogo/histórico): rotular
    // isso de 'anthropic_error' mandaria o gestor conferir a chave errada.
    // `FalhaDeContexto` é sempre do banco, inclusive DEPOIS da IA responder
    // (falha ao gravar a resposta) — culpar a Anthropic ali seria mentira.
    const falhaDeBanco = err instanceof FalhaDeContexto;
    const codigo = falhaDeBanco
      ? err.codigo
      : chamouIA
        ? codigoDeErroAnthropic(err)
        : 'contexto_indisponivel';
    console.error('[manager-chat] pergunta falhou:', codigo, err);
    // O próprio insert de auditoria precisa de rede: se ELE estourar, o catch
    // morria aqui e a resposta de erro abaixo nunca saía — virava 500 cru do
    // runtime, fora do envelope {success,error}. Perder a linha de auditoria é
    // ruim; perder a linha E a resposta é pior.
    try {
      // Idem: postgrest-js devolve `{ error }` em vez de lançar.
      const { error: erroInsert } = await supabase.from(T_MENSAGENS).insert({
        thread_id: thread.id,
        role: 'assistant',
        content: '',
        model: config.model,
        latency_ms: Date.now() - inicio,
        error: codigo,
      });
      if (erroInsert) {
        console.error('[manager-chat] falha ao gravar a linha de auditoria da falha:', erroInsert.message);
      }
    } catch (erroAuditoria) {
      console.error('[manager-chat] falha ao gravar a linha de auditoria da falha:', erroAuditoria);
    }
    return falha(res, !falhaDeBanco && chamouIA ? 502 : 500, codigo);
  }
}

/** Atualiza `updated_at` e, se ainda não houver, o título da thread. */
async function tocarThread(supabase: any, thread: any, primeiraPergunta: string): Promise<any> {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (!thread.title) patch.title = cortarTitulo(primeiraPergunta);
  const { data, error } = await supabase
    .from(T_THREADS)
    .update(patch)
    .eq('id', thread.id)
    .select(SELECT_THREAD)
    .maybeSingle();
  if (error || !data) {
    console.error('[manager-chat] falha ao atualizar a conversa:', error?.message);
    return { ...thread, ...patch };
  }
  return data;
}

// ─── Action: report ─────────────────────────────────────────────────────────
function dataValida(raw: unknown): Date | null {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

function custoUsd(
  modelo: string | null,
  entrada: number,
  saida: number,
  cacheLido: number,
  cacheEscrito: number,
): number {
  const preco = PRECO_POR_MILHAO[String(modelo || '')] || PRECO_FALLBACK;
  const total =
    (entrada * preco.entrada +
      saida * preco.saida +
      cacheLido * preco.entrada * FATOR_CACHE_LEITURA +
      cacheEscrito * preco.entrada * FATOR_CACHE_ESCRITA) /
    1_000_000;
  return Math.round(total * 1e6) / 1e6;
}

const PAGINA_RELATORIO = 1000;

/**
 * Leitura paginada com TETO EXPLÍCITO. `fetchAllRows` pagina até acabar a
 * tabela — numa serverless de memória fixa isso é um OOM esperando o banco
 * crescer. Aqui a leitura para no teto e AVISA (`truncado`), para o relatório
 * poder se declarar parcial em vez de mostrar número menor com cara de fato.
 */
async function lerComTeto<T>(
  montarQuery: (ini: number, fim: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  teto: number,
): Promise<{ data: T[]; error: { message: string } | null; truncado: boolean }> {
  const linhas: T[] = [];
  while (linhas.length < teto) {
    const ini = linhas.length;
    const fim = Math.min(ini + PAGINA_RELATORIO, teto) - 1;
    const { data, error } = await montarQuery(ini, fim);
    if (error) return { data: linhas, error, truncado: false };
    const lote = data ?? [];
    linhas.push(...lote);
    if (lote.length < fim - ini + 1) return { data: linhas, error: null, truncado: false };
  }
  return { data: linhas, error: null, truncado: true };
}

const COLUNAS_MENSAGEM_RELATORIO =
  'id, thread_id, role, model, input_tokens, output_tokens, cache_read_tokens, error, tool_calls, created_at';

async function acaoRelatorio(req: any, res: any, supabase: any) {
  const ate = dataValida(req.body?.ate) || new Date();
  // A tela manda `ate` como data pura ("2026-08-25"), que vira T00:00:00.000Z:
  // com `.lte` nisso, o dia inteiro que o gerente pediu ficava de fora e o
  // relatório mostrava zero em cima do rótulo "até 25/08". Empurra para o
  // último instante do dia (UTC) — o mesmo fuso em que `created_at` é gravado.
  ate.setUTCHours(23, 59, 59, 999);
  const de = dataValida(req.body?.de) || new Date(ate.getTime() - 30 * 24 * 60 * 60 * 1000);
  // Simétrico ao `ate`: o dia inicial entra INTEIRO. Sem isto, o padrão de 30
  // dias começaria às 23:59 do primeiro dia e comeria o próprio dia inicial.
  de.setUTCHours(0, 0, 0, 0);
  if (de.getTime() > ate.getTime()) return falha(res, 400, 'periodo_invalido');
  // Janela sem teto = varredura da tabela inteira a cada clique.
  const dias = (ate.getTime() - de.getTime()) / 86_400_000;
  if (dias > MAX_DIAS_RELATORIO) return falha(res, 400, 'periodo_longo');
  const deIso = de.toISOString();
  const ateIso = ate.toISOString();

  // Threads: filtradas pela janela. `updated_at` sobe a cada pergunta, então
  // toda thread com mensagem dentro do período tem updated_at >= `de` — o
  // filtro só corta conversas que não podem ter linha no relatório. Sem ele
  // esta query lia a tabela inteira em toda chamada.
  const {
    data: threads,
    error: erroThreads,
    truncado: threadsTruncadas,
  } = await lerComTeto<any>(
    (ini, fim) =>
      supabase
        .from(T_THREADS)
        .select('id, user_id, user_name')
        .gte('updated_at', deIso)
        .order('id', { ascending: true })
        .range(ini, fim),
    MAX_THREADS_RELATORIO,
  );
  if (erroThreads) return erroBanco(res, 'listar conversas do relatório', erroThreads);

  // `cache_creation_tokens` pode não existir ainda (migration em andamento):
  // se o select falhar por causa dela, relê sem a coluna em vez de derrubar o
  // relatório inteiro.
  let comCacheEscrita = true;
  let { data: mensagens, error: erroMensagens, truncado: mensagensTruncadas } = await lerComTeto<any>(
    (ini, fim) =>
      supabase
        .from(T_MENSAGENS)
        .select(`${COLUNAS_MENSAGEM_RELATORIO}, ${COL_CACHE_ESCRITA}`)
        .gte('created_at', deIso)
        .lte('created_at', ateIso)
        .order('id', { ascending: true })
        .range(ini, fim),
    MAX_MENSAGENS_RELATORIO,
  );
  if (erroMensagens && erroDeColunaAusente(erroMensagens, COL_CACHE_ESCRITA)) {
    comCacheEscrita = false;
    ({ data: mensagens, error: erroMensagens, truncado: mensagensTruncadas } = await lerComTeto<any>(
      (ini, fim) =>
        supabase
          .from(T_MENSAGENS)
          .select(COLUNAS_MENSAGEM_RELATORIO)
          .gte('created_at', deIso)
          .lte('created_at', ateIso)
          .order('id', { ascending: true })
          .range(ini, fim),
      MAX_MENSAGENS_RELATORIO,
    ));
  }
  if (erroMensagens) return erroBanco(res, 'listar mensagens do relatório', erroMensagens);

  const donoDaThread = new Map<string, { user_id: string; user_name: string }>();
  for (const t of threads) donoDaThread.set(t.id, { user_id: t.user_id, user_name: t.user_name || 'Sem nome' });

  interface Acumulado extends ManagerChatReportRow {
    threadsVistas: Set<string>;
  }
  const porGerente = new Map<string, Acumulado>();
  const ferramentas = new Map<string, number>();
  // Total de tokens de escrita de cache. Fica fora de `ManagerChatReportRow`
  // (o contrato compartilhado não tem esse campo), mas entra no CUSTO de cada
  // gerente e é devolvido como total para o dono conferir.
  let cacheEscritoTotal = 0;

  for (const m of mensagens) {
    const dono = donoDaThread.get(m.thread_id);
    // Mensagem órfã (thread apagada) não pode ser atribuída a ninguém.
    if (!dono) continue;

    let linha = porGerente.get(dono.user_id);
    if (!linha) {
      linha = {
        user_id: dono.user_id,
        user_name: dono.user_name,
        threads: 0,
        perguntas: 0,
        input_tokens: 0,
        output_tokens: 0,
        cache_read_tokens: 0,
        custo_estimado_usd: 0,
        erros: 0,
        ultima_atividade: null,
        threadsVistas: new Set<string>(),
      };
      porGerente.set(dono.user_id, linha);
    }

    linha.threadsVistas.add(m.thread_id);
    if (m.role === 'user') linha.perguntas += 1;
    if (m.error) linha.erros += 1;

    const entrada = Number(m.input_tokens || 0);
    const saida = Number(m.output_tokens || 0);
    const cacheLido = Number(m.cache_read_tokens || 0);
    const cacheEscrito = Number(m[COL_CACHE_ESCRITA] || 0);
    linha.input_tokens += entrada;
    linha.output_tokens += saida;
    linha.cache_read_tokens += cacheLido;
    cacheEscritoTotal += cacheEscrito;
    linha.custo_estimado_usd += custoUsd(m.model, entrada, saida, cacheLido, cacheEscrito);

    if (!linha.ultima_atividade || m.created_at > linha.ultima_atividade) linha.ultima_atividade = m.created_at;

    for (const chamada of normalizarToolCalls(m.tool_calls)) {
      const nome = String(chamada?.name || '').trim();
      if (nome) ferramentas.set(nome, (ferramentas.get(nome) || 0) + 1);
    }
  }

  const linhas: ManagerChatReportRow[] = [...porGerente.values()]
    .map(({ threadsVistas, ...linha }) => ({
      ...linha,
      threads: threadsVistas.size,
      custo_estimado_usd: Math.round(linha.custo_estimado_usd * 1e6) / 1e6,
    }))
    .sort((a, b) => b.custo_estimado_usd - a.custo_estimado_usd);

  const totais = linhas.reduce(
    (acc, l) => ({
      threads: acc.threads + l.threads,
      perguntas: acc.perguntas + l.perguntas,
      input_tokens: acc.input_tokens + l.input_tokens,
      output_tokens: acc.output_tokens + l.output_tokens,
      cache_read_tokens: acc.cache_read_tokens + l.cache_read_tokens,
      custo_estimado_usd: acc.custo_estimado_usd + l.custo_estimado_usd,
      erros: acc.erros + l.erros,
    }),
    { threads: 0, perguntas: 0, input_tokens: 0, output_tokens: 0, cache_read_tokens: 0, custo_estimado_usd: 0, erros: 0 },
  );
  totais.custo_estimado_usd = Math.round(totais.custo_estimado_usd * 1e6) / 1e6;

  const ferramentasMaisUsadas = [...ferramentas.entries()]
    .map(([name, vezes]) => ({ name, vezes }))
    .sort((a, b) => b.vezes - a.vezes);

  // Relatório truncado é relatório PARCIAL — e precisa dizer isso, senão vira
  // um número menor com cara de fato na avaliação de um funcionário real.
  const parcial = threadsTruncadas || mensagensTruncadas || !comCacheEscrita;
  const avisos: string[] = [];
  if (mensagensTruncadas) {
    avisos.push(
      `A leitura parou no teto de ${MAX_MENSAGENS_RELATORIO.toLocaleString('pt-BR')} mensagens. Os números abaixo cobrem só parte do período — reduza o intervalo de datas.`,
    );
  }
  if (threadsTruncadas) {
    avisos.push(
      `A leitura parou no teto de ${MAX_THREADS_RELATORIO.toLocaleString('pt-BR')} conversas. Mensagens de conversas não lidas ficaram de fora.`,
    );
  }
  if (!comCacheEscrita) {
    avisos.push(
      'A coluna de tokens de escrita de cache ainda não existe no banco: o custo mostrado é um piso, subestimado no primeiro turno de cada conversa.',
    );
  }

  return ok(res, {
    de: deIso,
    ate: ateIso,
    porGerente: linhas,
    // `totais.truncado` é declarado no contrato e faltava: uma tela que lesse só
    // os totais mostrava número parcial com cara de total fechado.
    totais: { ...totais, truncado: threadsTruncadas || mensagensTruncadas },
    ferramentasMaisUsadas,
    cache_creation_tokens: cacheEscritoTotal,
    parcial,
    avisos,
  });
}

/** `tool_calls` pode voltar como array (jsonb) ou como string escapada. */
function normalizarToolCalls(raw: unknown): any[] {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

// ─── Handler ────────────────────────────────────────────────────────────────
export default async function handler(req: any, res: any) {
  setNoStoreHeaders(res);

  const method = String(req.method || '').toUpperCase();
  if (method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, error: 'Método não permitido.' });
  }

  // POST de browser com cookie de sessão: gate CSRF antes de olhar o cookie.
  if (!requireSameOrigin(req, res)) return;

  const action = String(req.body?.action || '').trim();
  const permissoes = PERMISSAO_POR_ACTION[action];
  if (!permissoes) return falha(res, 400, 'acao_invalida');

  const staff = await requireStaffAnyPermission(req, res, permissoes);
  if (!staff) return;

  const supabase = getServiceClient();
  if (!supabase) return falha(res, 503, 'supabase_unavailable');

  switch (action) {
    // ── Estado do servidor ────────────────────────────────────────────────
    case 'status': {
      // Mesmo fail-closed da action `ask`: com o erro descartado, `lerConfig`
      // devolve CONFIG_PADRAO e a tela anunciaria um `modelo_padrao` que não é o
      // configurado. Dano menor que o de `training-get`, mesma regra.
      const { config, erro: erroConfig } = await lerConfig(supabase);
      if (erroConfig) return erroBanco(res, 'ler a configuração do chat', erroConfig);
      return ok(res, {
        ia_configurada: anthropicConfigurado(),
        modelo_padrao: config.model,
        pode_treinar: isPermissionGranted(staff.permissions, PERM_TREINAR),
        pode_auditar: isPermissionGranted(staff.permissions, PERM_AUDITAR),
      });
    }

    // ── Conversas ─────────────────────────────────────────────────────────
    case 'list-threads': {
      const { data, error } = await supabase
        .from(T_THREADS)
        .select(SELECT_THREAD)
        .eq('user_id', staff.id)
        .eq('archived', false)
        .order('updated_at', { ascending: false })
        .limit(MAX_THREADS_LISTADAS);
      if (error) return erroBanco(res, 'listar conversas', error);
      return ok(res, { threads: data || [] });
    }

    case 'list-threads-all': {
      // Já protegido por manager_chat_audit no mapa de permissões.
      let query = supabase.from(T_THREADS).select(SELECT_THREAD).order('updated_at', { ascending: false }).limit(MAX_THREADS_LISTADAS);
      const filtro = uuidValido(req.body?.user_id);
      if (filtro) query = query.eq('user_id', filtro);
      const { data, error } = await query;
      if (error) return erroBanco(res, 'listar conversas de todos', error);
      return ok(res, { threads: data || [] });
    }

    case 'create-thread': {
      const { data, error } = await supabase
        .from(T_THREADS)
        .insert({ user_id: staff.id, user_name: staff.name, title: null, archived: false })
        .select(SELECT_THREAD)
        .maybeSingle();
      if (error || !data) return erroBanco(res, 'criar conversa', error);
      return ok(res, { thread: data });
    }

    case 'rename-thread': {
      const thread = await carregarThread(supabase, res, staff, req.body?.thread_id, { escrita: true });
      if (!thread) return;
      const title = texto(req.body?.title, 120);
      if (!title) return falha(res, 400, 'titulo_vazio');
      const { data, error } = await supabase
        .from(T_THREADS)
        .update({ title, updated_at: new Date().toISOString() })
        .eq('id', thread.id)
        .select(SELECT_THREAD)
        .maybeSingle();
      if (error || !data) return erroBanco(res, 'renomear conversa', error);
      return ok(res, { thread: data });
    }

    case 'archive-thread': {
      // Arquivar só ESCONDE da lista — o histórico continua inteiro para auditoria.
      const thread = await carregarThread(supabase, res, staff, req.body?.thread_id, { escrita: true });
      if (!thread) return;
      const { error } = await supabase
        .from(T_THREADS)
        .update({ archived: true, updated_at: new Date().toISOString() })
        .eq('id', thread.id);
      if (error) return erroBanco(res, 'arquivar conversa', error);
      return ok(res, { ok: true });
    }

    case 'list-messages': {
      const thread = await carregarThread(supabase, res, staff, req.body?.thread_id, { escrita: false });
      if (!thread) return;
      // Teto explícito: lê as MAIS RECENTES (uma a mais, só para saber se
      // sobrou coisa) e devolve em ordem cronológica. Sem isso, uma thread de
      // mil mensagens virava uma resposta de dezenas de MB.
      const { data, error } = await supabase
        .from(T_MENSAGENS)
        .select(SELECT_MENSAGEM)
        .eq('thread_id', thread.id)
        .order('created_at', { ascending: false })
        .limit(MAX_MENSAGENS_LISTADAS + 1);
      if (error) return erroBanco(res, 'listar mensagens', error);
      const recentes = data || [];
      const truncado = recentes.length > MAX_MENSAGENS_LISTADAS;
      const messages = recentes.slice(0, MAX_MENSAGENS_LISTADAS).reverse();
      return ok(res, { messages, truncado, limite: MAX_MENSAGENS_LISTADAS });
    }

    case 'ask':
      return acaoPerguntar(req, res, supabase, staff);

    // ── Treinamento ───────────────────────────────────────────────────────
    case 'training-get': {
      // FAIL-CLOSED, igual à action `ask`: com o erro de leitura DESCARTADO,
      // `lerConfig` devolve CONFIG_PADRAO (enabled:true, persona/business_info/
      // guardrails vazios) e a tela abre dizendo "Chat ligado" com os campos em
      // branco. Um clique em Salvar persistiria isso: religaria o chat que o
      // dono desligou e APAGARIA persona e guardrails. Falha de leitura aqui
      // aborta — melhor a tela não abrir do que abrir mentindo.
      const { config, erro: erroConfig } = await lerConfig(supabase);
      if (erroConfig) return erroBanco(res, 'ler a configuração do treinamento', erroConfig);
      // Mesmo teto do prompt: a tela de treinamento mostra exatamente o que a
      // IA recebe. Pede UM item a mais que o teto só para saber se sobrou coisa
      // — lista cortada com cara de completa é o que faz o dono achar que uma
      // regra foi salva quando ela nunca chegou ao prompt.
      const [{ data: knowledge, error: erroK }, { data: rules, error: erroR }] = await Promise.all([
        supabase
          .from(T_CONHECIMENTO)
          .select(SELECT_CONHECIMENTO)
          .order('topic', { ascending: true })
          .limit(MAX_ITENS_TREINAMENTO + 1),
        supabase
          .from(T_REGRAS)
          .select(SELECT_REGRA)
          .order('type', { ascending: true })
          .limit(MAX_ITENS_TREINAMENTO + 1),
      ]);
      if (erroK) return erroBanco(res, 'listar conhecimento', erroK);
      if (erroR) return erroBanco(res, 'listar regras', erroR);
      const listaConhecimento = knowledge || [];
      const listaRegras = rules || [];
      const truncado =
        listaConhecimento.length > MAX_ITENS_TREINAMENTO || listaRegras.length > MAX_ITENS_TREINAMENTO;
      if (truncado) {
        console.warn(
          `[manager-chat] treinamento acima do teto de ${MAX_ITENS_TREINAMENTO} itens; a tela e o prompt recebem só os primeiros.`,
        );
      }
      return ok(res, {
        config,
        knowledge: listaConhecimento.slice(0, MAX_ITENS_TREINAMENTO),
        rules: listaRegras.slice(0, MAX_ITENS_TREINAMENTO),
        // Campos extras (como `cache_creation_tokens` no relatório): a lista pode
        // estar cortada e quem consome precisa poder dizer isso em vez de fingir
        // que está vendo tudo.
        truncado,
        limite: MAX_ITENS_TREINAMENTO,
      });
    }

    case 'config-save': {
      const bruta = req.body?.config;
      if (!bruta || typeof bruta !== 'object') return falha(res, 400, 'config_invalida');
      const modelo = String(bruta.model || '');
      const esforco = String(bruta.effort || '');
      // Esforço e max_tokens são REJEITADOS quando inválidos, não corrigidos em
      // silêncio: quem salvou 'ultra' precisa saber que não existe, senão só
      // descobre depois — como 'anthropic_error' no meio de uma pergunta.
      if (!ESFORCOS_VALIDOS.has(esforco)) return falha(res, 400, 'effort_invalido');
      const maxTokens = Number.parseInt(String(bruta.max_tokens ?? ''), 10);
      if (!Number.isFinite(maxTokens) || maxTokens < MAX_TOKENS_PISO || maxTokens > MAX_TOKENS_TETO) {
        return falha(res, 400, 'max_tokens_invalido');
      }
      const patch = {
        enabled: bruta.enabled !== false,
        persona: texto(bruta.persona, 20000),
        business_info: texto(bruta.business_info, 20000),
        guardrails_extra: texto(bruta.guardrails_extra, 20000),
        model: MODELOS_VALIDOS.has(modelo) ? modelo : CONFIG_PADRAO.model,
        effort: esforco,
        max_tokens: maxTokens,
        updated_at: new Date().toISOString(),
      };
      // Linha única: atualiza a existente; só cria se a tabela estiver vazia.
      const { data: atual } = await supabase.from(T_CONFIG).select('id').limit(1).maybeSingle();
      const query = atual?.id
        ? supabase.from(T_CONFIG).update(patch).eq('id', atual.id)
        : supabase.from(T_CONFIG).insert(patch);
      const { data, error } = await query.select(SELECT_CONFIG).maybeSingle();
      if (error || !data) return erroBanco(res, 'salvar configuração', error);
      return ok(res, { config: data });
    }

    case 'knowledge-save': {
      const item = req.body?.item;
      if (!item || typeof item !== 'object') return falha(res, 400, 'item_invalido');
      const title = texto(item.title, 200);
      const content = texto(item.content, 20000);
      if (!title || !content) return falha(res, 400, 'item_incompleto');
      const patch = {
        topic: texto(item.topic, 120) || 'geral',
        title,
        content,
        enabled: item.enabled !== false,
        updated_at: new Date().toISOString(),
      };
      // Id presente mas malformado NÃO pode virar insert: a tela mandaria o
      // mesmo item de novo e criaria duplicata a cada salvamento.
      const temId = item.id !== undefined && item.id !== null && String(item.id).trim() !== '';
      const id = uuidValido(item.id);
      if (temId && !id) return falha(res, 400, 'id_invalido');
      const query = id
        ? supabase.from(T_CONHECIMENTO).update(patch).eq('id', id)
        : supabase.from(T_CONHECIMENTO).insert(patch);
      const { data, error } = await query.select(SELECT_CONHECIMENTO).maybeSingle();
      if (error) return erroBanco(res, 'salvar conhecimento', error);
      // Update que não achou linha volta sem erro e com data null — isso é
      // "item apagado por outra pessoa", não falha de banco.
      if (!data) return falha(res, id ? 404 : 500, id ? 'item_nao_encontrado' : 'db_error');
      return ok(res, { item: data });
    }

    case 'knowledge-delete': {
      const id = uuidValido(req.body?.id);
      if (!id) return falha(res, 400, 'id_invalido');
      const { error } = await supabase.from(T_CONHECIMENTO).delete().eq('id', id);
      if (error) return erroBanco(res, 'excluir conhecimento', error);
      return ok(res, { ok: true });
    }

    case 'rules-save': {
      const item = req.body?.item;
      if (!item || typeof item !== 'object') return falha(res, 400, 'item_invalido');
      const tipo = String(item.type || '');
      if (!TIPOS_REGRA.has(tipo)) return falha(res, 400, 'tipo_invalido');
      const value = texto(item.value, 2000);
      if (!value) return falha(res, 400, 'regra_vazia');
      const patch = { type: tipo, value, enabled: item.enabled !== false, updated_at: new Date().toISOString() };
      // Mesma regra do conhecimento: id malformado é erro, não convite a duplicar.
      const temId = item.id !== undefined && item.id !== null && String(item.id).trim() !== '';
      const id = uuidValido(item.id);
      if (temId && !id) return falha(res, 400, 'id_invalido');
      const query = id ? supabase.from(T_REGRAS).update(patch).eq('id', id) : supabase.from(T_REGRAS).insert(patch);
      const { data, error } = await query.select(SELECT_REGRA).maybeSingle();
      if (error) return erroBanco(res, 'salvar regra', error);
      if (!data) return falha(res, id ? 404 : 500, id ? 'item_nao_encontrado' : 'db_error');
      return ok(res, { item: data });
    }

    case 'rules-delete': {
      const id = uuidValido(req.body?.id);
      if (!id) return falha(res, 400, 'id_invalido');
      const { error } = await supabase.from(T_REGRAS).delete().eq('id', id);
      if (error) return erroBanco(res, 'excluir regra', error);
      return ok(res, { ok: true });
    }

    // ── Auditoria ─────────────────────────────────────────────────────────
    case 'report':
      return acaoRelatorio(req, res, supabase);

    default:
      return falha(res, 400, 'acao_invalida');
  }
}
