/**
 * Contrato ÚNICO do Chat de IA da Gerência.
 *
 * Este arquivo é a fonte de verdade compartilhada entre o backend
 * (api/manager-chat.ts) e as telas do admin (components/admin/ManagerChat/*).
 * Tipo ou nome de action que não estiver aqui não existe.
 *
 * Toda chamada vai por POST para /api/manager-chat com `{ action, ...params }`
 * e volta no envelope padrão do projeto: `{ success, data }` ou
 * `{ success, error }`. O cookie httpOnly de staff (wtech_staff_session) viaja
 * sozinho — por isso `credentials: 'same-origin'`.
 */

// ─── Permissões (espelham lib/permissions.ts) ───────────────────────────────

/** Conversar com a IA e ver as próprias conversas. */
export const PERM_CHAT = 'manager_chat_view';
/**
 * Editar persona, base de conhecimento e regras. SUPER ADMIN APENAS —
 * fora de PERMISSION_CATALOG de propósito, então nenhum cargo consegue ligar
 * este toggle em "Equipe & Acesso". O servidor exige `admin_access === true`.
 */
export const PERM_TREINAR = 'manager_chat_train';
/**
 * Ver as conversas de TODOS os gerentes e o relatório de consumo.
 * SUPER ADMIN APENAS, pela mesma razão acima.
 */
export const PERM_AUDITAR = 'manager_chat_audit';

// ─── Modelos disponíveis ────────────────────────────────────────────────────

/**
 * Modelos oferecidos na tela de Treinamento. Os IDs e preços foram conferidos
 * ao vivo em https://openrouter.ai/api/v1/models (26/08/2026) filtrando por
 * suporte a `tools` — sem tool calling o chat não consegue consultar o banco.
 *
 * O campo aceita qualquer ID do OpenRouter, não só estes: a lista é atalho, não
 * limite. Modelo sem suporte a ferramentas responde sem consultar nada e passa a
 * inventar número — por isso a tela avisa.
 */
export const MODELOS_DISPONIVEIS = [
  {
    id: 'anthropic/claude-opus-5',
    nome: 'Claude Opus 5',
    nota: 'O mais capaz para analisar atendimento. US$ 5 / US$ 25 por milhão de tokens (entrada/saída).',
  },
  {
    id: 'anthropic/claude-sonnet-5',
    nome: 'Claude Sonnet 5',
    nota: 'Ótimo equilíbrio e o mais barato dos Claude aqui: US$ 2 / US$ 10 por milhão. Rende ~2,5x mais perguntas que o Opus.',
  },
  {
    id: 'anthropic/claude-sonnet-4.6',
    nome: 'Claude Sonnet 4.6',
    nota: 'Geração anterior do Sonnet. US$ 3 / US$ 15 por milhão.',
  },
  {
    id: 'anthropic/claude-opus-4.8',
    nome: 'Claude Opus 4.8',
    nota: 'Geração anterior do Opus. US$ 5 / US$ 25 por milhão.',
  },
] as const;

export const NIVEIS_ESFORCO = ['low', 'medium', 'high', 'xhigh', 'max'] as const;
export type NivelEsforco = (typeof NIVEIS_ESFORCO)[number];

// ─── Tipos ──────────────────────────────────────────────────────────────────

export interface ManagerChatThread {
  id: string;
  user_id: string;
  user_name: string;
  title: string | null;
  archived: boolean;
  created_at: string;
  updated_at: string;
}

/** Uma ferramenta que o Claude pediu durante o turno (para auditoria na UI). */
export interface ManagerChatToolCall {
  name: string;
  input: Record<string, unknown>;
  ms: number;
  ok: boolean;
  erro?: string;
}

export interface ManagerChatMessage {
  id: string;
  thread_id: string;
  role: 'user' | 'assistant';
  content: string;
  tool_calls: ManagerChatToolCall[] | null;
  model: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  cache_read_tokens: number | null;
  /** Token de ESCRITA de cache custa 1,25x o de entrada — sem isto o custo do
   *  relatório fica otimista justamente no 1º turno de cada conversa. */
  cache_creation_tokens?: number | null;
  /**
   * Custo REAL desta resposta em dólar, informado pelo próprio OpenRouter no
   * campo `usage.cost`. Preferir sempre este valor à estimativa por tabela de
   * preço — a tabela envelhece, este número vem da fatura.
   */
  cost_usd?: number | null;
  latency_ms: number | null;
  error: string | null;
  created_at: string;
}

export interface ManagerChatConfig {
  id?: string;
  enabled: boolean;
  persona: string;
  business_info: string;
  guardrails_extra: string;
  model: string;
  effort: NivelEsforco;
  max_tokens: number;
  updated_at?: string;
}

export interface ManagerChatKnowledge {
  id?: string;
  topic: string;
  title: string;
  content: string;
  enabled: boolean;
}

export type TipoRegra = 'forbidden' | 'required' | 'escalate';

export interface ManagerChatRule {
  id?: string;
  type: TipoRegra;
  value: string;
  enabled: boolean;
}

export interface ManagerChatReportRow {
  user_id: string;
  user_name: string;
  threads: number;
  perguntas: number;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_creation_tokens?: number;
  custo_estimado_usd: number;
  erros: number;
  ultima_atividade: string | null;
}

export interface ManagerChatReport {
  de: string;
  ate: string;
  /** true quando a leitura bateu no teto e os números são um piso, não o total. */
  parcial?: boolean;
  /** Ressalvas do servidor sobre este recorte — devem ser exibidas ao gerente. */
  avisos?: string[];
  porGerente: ManagerChatReportRow[];
  totais: {
    threads: number;
    perguntas: number;
    input_tokens: number;
    output_tokens: number;
    cache_read_tokens: number;
    cache_creation_tokens?: number;
    /** Soma de tudo — parte medida, parte estimada. Ver os dois campos abaixo. */
    custo_estimado_usd: number;
    /** A parcela que veio da FATURA do OpenRouter (usage.cost), não de tabela de preço. */
    custo_medido_usd?: number;
    /** Quantas respostas ainda foram calculadas por estimativa. Zero = tudo medido. */
    respostas_estimadas?: number;
    erros: number;
    /** true quando a janela pedida estourou o teto de leitura e os números são parciais. */
    truncado?: boolean;
  };
  ferramentasMaisUsadas: { name: string; vezes: number }[];
}

/** Estado de configuração do servidor — a UI usa para avisar em vez de falhar mudo. */
export interface ManagerChatStatus {
  /** true quando existe chave utilizável (OpenRouter no banco, ou Anthropic no ambiente). */
  ia_configurada: boolean;
  modelo_padrao: string;
  /** Qual caminho está ativo — a tela mostra isso para não haver dúvida de onde vem a conta. */
  provedor?: 'openrouter' | 'anthropic' | null;
  /** Decidido pelo SERVIDOR (admin_access). A tela obedece, não recalcula. */
  pode_treinar: boolean;
  pode_auditar: boolean;
}

// ─── Tradução de erro ───────────────────────────────────────────────────────

const MENSAGENS: Record<string, string> = {
  forbidden:
    'Seu perfil não tem acesso ao Chat de IA da Gerência.\n\n' +
    'Peça a um administrador para habilitar "Chat com a IA (Gerência)" no seu cargo, em Equipe & Acesso.',
  unauthorized: 'Sua sessão expirou. Entre no sistema novamente.',
  ia_nao_configurada:
    'A inteligência ainda não foi ligada.\n\n' +
    'Cadastre a chave do OpenRouter em Configurações → GPT & Gemini. Enquanto isso, o chat abre e guarda o histórico, mas não responde.',
  openrouter_auth:
    'A chave do OpenRouter foi recusada.\n\n' +
    'Confira a chave em Configurações → GPT & Gemini — ela pode ter sido revogada ou digitada errada.',
  openrouter_sem_credito:
    'O crédito do OpenRouter acabou.\n\n' +
    'Adicione saldo em openrouter.ai/credits. O histórico do chat continua guardado; assim que houver crédito, volta a responder.',
  openrouter_rate_limit:
    'O OpenRouter limitou o volume de chamadas. Espere alguns segundos e tente de novo.',
  openrouter_error:
    'O OpenRouter devolveu um erro (ou a conexão caiu no meio). Tente novamente; se persistir, avise um administrador.',
  modelo_invalido:
    'O modelo configurado não existe no OpenRouter.\n\n' +
    'Confira o campo Modelo na tela de Treinamento — o ID precisa do prefixo do provedor (ex.: anthropic/claude-opus-5).',
  rate_limited: 'Muitas perguntas em pouco tempo. Espere alguns segundos e tente de novo.',
  thread_not_found: 'Esta conversa não existe mais. Recarregue a página.',
  chat_desativado: 'O Chat de IA está desativado nas configurações de treinamento.',
  pergunta_vazia: 'Escreva uma pergunta antes de enviar.',
  pergunta_longa: 'Pergunta longa demais. Reduza o texto e tente de novo.',
  supabase_unavailable: 'O banco de dados não respondeu. Tente novamente em instantes.',
  anthropic_auth: 'A chave da Anthropic foi recusada. Confira a ANTHROPIC_API_KEY no servidor.',
  anthropic_rate_limit: 'A Anthropic limitou o volume de chamadas. Espere um pouco e tente de novo.',
  anthropic_error: 'A Anthropic devolveu um erro. Tente novamente; se persistir, avise um administrador.',
  recusado: 'A IA recusou responder a esta pergunta. Reformule ou trate o assunto fora do chat.',

  // Códigos de validação e de falha do endpoint. Sem estas linhas o gerente veria
  // o código cru ("item_incompleto") no lugar de uma instrução do que fazer.
  db_error: 'O banco de dados falhou nesta operação. Tente de novo; se repetir, avise um administrador.',
  acao_invalida: 'Ação desconhecida. Recarregue a página — o sistema pode ter sido atualizado.',
  periodo_invalido: 'Período inválido. Escolha uma data inicial anterior à final.',
  periodo_longo: 'Período longo demais. Escolha um intervalo de no máximo 12 meses.',
  titulo_vazio: 'Dê um nome à conversa antes de salvar.',
  config_invalida: 'Configuração inválida. Confira os campos destacados.',
  effort_invalido: 'Nível de esforço inválido. Use Baixo, Médio, Alto, Muito alto ou Máximo.',
  max_tokens_invalido: 'O limite de resposta precisa ficar entre 1.024 e 16.000 tokens.',
  item_invalido: 'Item inválido. Confira os campos preenchidos.',
  item_incompleto: 'Faltou preencher um campo obrigatório deste item.',
  item_nao_encontrado: 'Este item não existe mais — alguém pode tê-lo excluído. Recarregue a página.',
  tipo_invalido: 'Tipo de regra inválido. Use Proibido, Obrigatório ou Escalar para humano.',
  regra_vazia: 'Escreva o texto da regra antes de salvar.',
  id_invalido: 'Identificador inválido. Recarregue a página e tente de novo.',
  analise_interrompida:
    'A análise parou no meio: a IA atingiu o limite de consultas ao banco antes de concluir.\n\n' +
    'O texto acima pode estar incompleto. Refaça a pergunta com um recorte menor — ' +
    'um colaborador por vez, ou um período mais curto.',
  resposta_truncada:
    'A resposta foi cortada por limite de tamanho — o texto acima está incompleto.\n\n' +
    'Peça um recorte menor (um colaborador por vez, ou um período mais curto).',
  resposta_vazia:
    'A IA terminou sem escrever nada. Isso costuma ser limite de tamanho consumido pelo raciocínio — ' +
    'refaça a pergunta de forma mais direta ou reduza o escopo.',
  contexto_indisponivel:
    'Não consegui montar o contexto da pergunta — alguma consulta ao banco falhou.\n\n' +
    'A pergunta ficou registrada no histórico. Tente de novo em instantes.',
};

export function descreverErroChat(error?: unknown): string {
  const code = typeof error === 'string' ? error.trim() : '';
  if (code && MENSAGENS[code]) return MENSAGENS[code];
  if (code) return `Não foi possível concluir: ${code}`;
  return 'Não foi possível concluir a ação. Tente novamente.';
}

// ─── Cliente ────────────────────────────────────────────────────────────────

const ENDPOINT = '/api/manager-chat';

async function post<T>(action: string, params: Record<string, unknown> = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ action, ...params }),
    });
  } catch {
    throw new Error('Falha de conexão com o servidor.');
  }

  const texto = await res.text();
  let corpo: any = null;
  try {
    corpo = texto ? JSON.parse(texto) : null;
  } catch {
    throw new Error('Resposta inválida do servidor.');
  }

  if (!res.ok || !corpo?.success) {
    throw new Error(descreverErroChat(corpo?.error || `HTTP ${res.status}`));
  }
  return corpo.data as T;
}

export const managerChatApi = {
  status: () => post<ManagerChatStatus>('status'),

  listarThreads: () => post<{ threads: ManagerChatThread[] }>('list-threads'),
  /** `userId` só é aceito de quem tem PERM_AUDITAR. */
  listarThreadsDeTodos: (userId?: string) =>
    post<{ threads: ManagerChatThread[] }>('list-threads-all', userId ? { user_id: userId } : {}),
  criarThread: () => post<{ thread: ManagerChatThread }>('create-thread'),
  renomearThread: (threadId: string, title: string) =>
    post<{ thread: ManagerChatThread }>('rename-thread', { thread_id: threadId, title }),
  arquivarThread: (threadId: string) => post<{ ok: true }>('archive-thread', { thread_id: threadId }),

  /**
   * Conversas longas são cortadas no servidor. `truncado` precisa chegar à tela —
   * sem isso o gerente rola para cima, não encontra o começo e não sabe por quê.
   */
  listarMensagens: (threadId: string) =>
    post<{ messages: ManagerChatMessage[]; truncado?: boolean; limite?: number }>(
      'list-messages',
      { thread_id: threadId },
    ),

  perguntar: (threadId: string, question: string) =>
    post<{ message: ManagerChatMessage; thread: ManagerChatThread }>('ask', {
      thread_id: threadId,
      question,
    }),

  obterTreinamento: () =>
    post<{
      config: ManagerChatConfig;
      knowledge: ManagerChatKnowledge[];
      rules: ManagerChatRule[];
    }>('training-get'),
  salvarConfig: (config: ManagerChatConfig) =>
    post<{ config: ManagerChatConfig }>('config-save', { config }),
  salvarConhecimento: (item: ManagerChatKnowledge) =>
    post<{ item: ManagerChatKnowledge }>('knowledge-save', { item }),
  excluirConhecimento: (id: string) => post<{ ok: true }>('knowledge-delete', { id }),
  salvarRegra: (item: ManagerChatRule) => post<{ item: ManagerChatRule }>('rules-save', { item }),
  excluirRegra: (id: string) => post<{ ok: true }>('rules-delete', { id }),

  relatorio: (de?: string, ate?: string) => post<ManagerChatReport>('report', { de, ate }),
};
