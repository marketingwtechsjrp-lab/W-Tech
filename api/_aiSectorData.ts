import type { SupabaseClient } from '@supabase/supabase-js';
import { fmtMoney, startOfTodayBRT, symbolOf } from './_report.js';
import { gatherStaffActivity, startOfMonthBRT } from './_agentsReport.js';
import type { AIAgentId } from '../lib/aiAgentDefaults.js';

/**
 * Busca setorial de dados para os Assistentes de IA (Léo/Bia/Rita/Sofia).
 * Arquivo com prefixo "_" — helper compartilhado (não vira rota na Vercel).
 *
 * Cada agente é dono de um setor e o pack de dados que o LLM recebe é montado
 * SOB MEDIDA para a pergunta:
 *   rita  → FINANCEIRO   (SITE_Transactions, SITE_Enrollments — saldos/devedores)
 *   bia   → ATENDIMENTO/CRM (SITE_WhatsAppCloudMessages, SITE_Tasks, SITE_Leads)
 *   leo   → INSCRIÇÕES   (SITE_Courses, SITE_Enrollments)
 *   sofia → RH/GERÊNCIA  (SITE_Users, SITE_AuditLogs + consolidado)
 *
 * Além do recorte por setor, a pergunta é varrida em busca de ENTIDADES
 * citadas (aluno, lead, funcionário, curso) e o pack inclui os registros
 * exatos do banco — matching client-side com normalização de acentos, para
 * "joao" encontrar "João" (ilike do Postgres não ignora acento).
 *
 * REGRA DE OURO (pedido do Daniel): TODA informação vem do banco Supabase do
 * sistema. Este módulo não faz NENHUMA chamada externa — internet é proibida
 * para os agentes; o pack é a única fonte que o LLM recebe.
 */

// ─── Normalização e termos de busca ──────────────────────────────────────────

const normalize = (s: string) =>
    (s || '')
        .toLowerCase()
        .normalize('NFD')
        // remove diacríticos (combining marks U+0300–U+036F)
        .replace(/[\u0300-\u036f]/g, '');

/** Palavras da pergunta que NÃO são nomes de entidade (conectivos + jargão do domínio). */
const STOPWORDS = new Set([
    // conectivos/pronomes/verbos comuns
    'que', 'qual', 'quais', 'quem', 'quanto', 'quantos', 'quantas', 'como', 'onde', 'quando',
    'para', 'por', 'com', 'sem', 'dos', 'das', 'nos', 'nas', 'uma', 'um', 'este', 'esta',
    'esse', 'essa', 'isso', 'aquele', 'aquela', 'foi', 'sao', 'esta', 'estao', 'tem', 'temos',
    'ver', 'me', 'mais', 'menos', 'muito', 'pouco', 'todos', 'todas', 'tudo', 'nada', 'ainda',
    'hoje', 'ontem', 'amanha', 'mes', 'ano', 'dia', 'semana', 'agora', 'atual', 'ultimo', 'ultima',
    'ultimos', 'ultimas', 'desse', 'dessa', 'deste', 'desta', 'pelo', 'pela', 'nosso', 'nossa',
    // jargão do negócio (palavras de consulta, não nomes)
    'aluno', 'alunos', 'curso', 'cursos', 'lead', 'leads', 'cliente', 'clientes', 'saldo',
    'valor', 'valores', 'pagou', 'pagos', 'pagamento', 'pagamentos', 'pagar', 'devendo', 'deve',
    'devedor', 'devedores', 'falta', 'faltando', 'inscricao', 'inscricoes', 'matricula',
    'matriculas', 'inscrito', 'inscritos', 'funcionario', 'funcionarios', 'colaborador',
    'colaboradores', 'atendente', 'atendentes', 'equipe', 'tarefa', 'tarefas', 'whatsapp',
    'mensagem', 'mensagens', 'receita', 'receitas', 'despesa', 'despesas', 'custo', 'custos',
    'total', 'lista', 'listar', 'listas', 'mostra', 'mostrar', 'manda', 'mandar', 'envia',
    'enviar', 'quantidade', 'numero', 'numeros', 'status', 'situacao', 'relatorio', 'resumo',
    'vendas', 'venda', 'vendeu', 'turma', 'turmas', 'vaga', 'vagas', 'faturamento', 'lucro',
    'dinheiro', 'caixa', 'conta', 'contas', 'atendimento', 'financeiro', 'gerencia', 'geral',
    'pendente', 'pendentes', 'aberto', 'abertos', 'aberta', 'abertas', 'atrasada', 'atrasadas',
    'atrasado', 'atrasados', 'novo', 'novos', 'nova', 'novas', 'confirmado', 'confirmados',
    'confirmada', 'confirmadas', 'desconto', 'descontos', 'preco', 'precos', 'restante',
    // termos financeiros de consulta (conceitos, não nomes de pessoas)
    'defasagem', 'arrecadado', 'arrecadada', 'arrecadacao', 'arrecadar', 'arrecadaram',
    'quitacao', 'quitado', 'quitados', 'quitada', 'quitadas', 'quitar', 'parcela', 'parcelas',
    'parcelado', 'entrada', 'entradas', 'inadimplente', 'inadimplentes', 'inadimplencia',
    'tabela', 'negociado', 'negociada', 'localidade', 'recebido', 'recebida', 'recebidos',
    // termos de atendimento/métricas (conceitos, não nomes de pessoas)
    'tempo', 'tempos', 'demora', 'demorou', 'demorando', 'duvida', 'duvidas', 'sentimento',
    'sentimentos', 'topico', 'topicos', 'metrica', 'metricas', 'resposta', 'respostas',
    'analise', 'analises', 'oficial', 'conversa', 'conversas', 'resolucao', 'aguardando',
    'prioridade', 'prioridades', 'atencao',
]);

/** Extrai da pergunta os termos candidatos a nome de entidade (máx 6). */
export function extractSearchTerms(question: string): string[] {
    return Array.from(new Set(
        normalize(question)
            .split(/[^a-z0-9]+/)
            .filter((w) => w.length >= 3 && !STOPWORDS.has(w))
    )).slice(0, 6);
}

const matchesAnyTerm = (value: string | null | undefined, terms: string[]): boolean => {
    if (!value || terms.length === 0) return false;
    const v = normalize(String(value));
    return terms.some((t) => v.includes(t));
};

// ─── Matching de curso citado na pergunta ────────────────────────────────────

/**
 * Palavras que aparecem em quase TODOS os títulos de curso ("Curso de
 * Suspensão W-TECH em ...") — não servem para identificar UM curso. Sem esse
 * filtro, qualquer pergunta com "curso" casava com o catálogo inteiro e o
 * corte de 5 pegava cursos errados (bug real: Belo Horizonte ficava de fora).
 */
const GENERIC_COURSE_WORDS = new Set([
    'curso', 'cursos', 'suspensao', 'suspensoes', 'w-tech', 'wtech', 'tech', 'experience',
    'brasil', 'edicao', 'performance', 'alta', 'avancado', 'conference', 'sede',
]);

/**
 * Pontua o quanto um curso foi citado na pergunta: cidade/local valem mais que
 * palavras distintivas do título. 0 = não citado.
 */
export function courseMatchScore(
    course: { title?: string | null; city?: string | null; location?: string | null },
    qNorm: string
): number {
    if (!qNorm) return 0;
    let score = 0;
    const city = normalize(course.city || '');
    if (city.length >= 3 && qNorm.includes(city)) score += 10;
    const location = normalize(course.location || '');
    if (location.length >= 3 && qNorm.includes(location)) score += 6;
    normalize(course.title || '')
        .split(/[^a-z0-9-]+/)
        .filter((w) => w.length >= 4 && !STOPWORDS.has(w) && !GENERIC_COURSE_WORDS.has(w))
        .forEach((w) => { if (qNorm.includes(w)) score += 3; });
    return score;
}

// ─── Roteador de setores por palavra-chave ───────────────────────────────────

const SECTOR_KEYWORDS: Record<AIAgentId, string[]> = {
    rita: [
        'financeiro', 'receita', 'despesa', 'custo', 'fatur', 'saldo', 'desconto', 'valor',
        'preco', 'pagou', 'pagamento', 'pagar', 'pago', 'pix', 'cartao', 'boleto', 'transacao',
        'caixa', 'lucro', 'divida', 'devedor', 'devendo', 'cobranca', 'dinheiro', 'reais',
        'restante', 'receb', 'entrada', 'gasto', 'arrecad', 'defasagem', 'quitac', 'quitad',
        'parcela', 'inadimpl', 'negociado', 'tabela',
    ],
    bia: [
        'atendimento', 'whatsapp', 'mensagem', 'respond', 'tarefa', 'funil', 'follow', 'crm',
        'lead', 'conversa', 'contato', 'atendeu', 'atendido', 'negocia', 'tempo', 'demora',
        'demorou', 'duvida', 'sentimento', 'topico', 'metrica', 'resposta', 'sla', 'oficial',
        'aguardando', 'resolucao', 'atencao', 'cliente',
    ],
    leo: [
        'inscri', 'matricul', 'aluno', 'turma', 'vaga', 'credenciamento', 'presenca', 'checkin',
        'check-in', 'curso', 'aula', 'calendario', 'agenda',
    ],
    sofia: [
        'funcionario', 'equipe', 'atendente', 'usuario', 'colaborador', 'desempenho', 'ranking',
        'rh', 'acesso', 'produtividade', 'gerencia', 'geral', 'resumo', 'relatorio', 'panorama',
        'consolidado',
    ],
};

/** Detecta o(s) setor(es) da pergunta. Vazio = pergunta genérica (todos). */
export function detectSectors(question: string): AIAgentId[] {
    const q = normalize(question);
    const hit = (Object.keys(SECTOR_KEYWORDS) as AIAgentId[]).filter((id) =>
        SECTOR_KEYWORDS[id].some((k) => q.includes(k))
    );
    return hit;
}

// ─── Datas de referência ─────────────────────────────────────────────────────

const TZ_OFFSET_MS = 3 * 60 * 60 * 1000; // America/Sao_Paulo = UTC-3

/** Data de hoje em BRT no formato YYYY-MM-DD (colunas date de SITE_Courses). */
function todayYMD(): string {
    return new Date(Date.now() - TZ_OFFSET_MS).toISOString().slice(0, 10);
}

// ─── Setor RITA — Financeiro ─────────────────────────────────────────────────

async function gatherRitaPack(client: SupabaseClient): Promise<Record<string, any>> {
    const pack: Record<string, any> = {};
    const { iso: dayStart } = startOfTodayBRT();
    const monthStart = startOfMonthBRT();

    // Transações do mês: receita/despesa, vendas de hoje e últimas movimentações.
    try {
        const { data: txs } = await client
            .from('SITE_Transactions')
            .select('amount, type, currency, course_id, date, description, payment_method, status')
            .gte('date', monthStart)
            .order('date', { ascending: false })
            .limit(2000);

        let income = 0;
        let expense = 0;
        const todayByCur = new Map<string, { total: number; count: number }>();
        const byCourseId = new Map<string, number>();
        (txs || []).forEach((t: any) => {
            const cur = (t.currency || 'BRL').toUpperCase();
            const amt = Number(t.amount || 0);
            if (cur === 'BRL') {
                if (t.type === 'Income') {
                    income += amt;
                    if (t.course_id) byCourseId.set(t.course_id, (byCourseId.get(t.course_id) || 0) + amt);
                } else if (t.type === 'Expense') expense += amt;
            }
            if (t.type === 'Income' && String(t.date || '') >= dayStart) {
                const acc = todayByCur.get(cur) || { total: 0, count: 0 };
                acc.total += amt;
                acc.count += 1;
                todayByCur.set(cur, acc);
            }
        });

        pack.resumo_do_mes = {
            receita: `R$ ${fmtMoney(income)}`,
            despesa: `R$ ${fmtMoney(expense)}`,
            resultado: `R$ ${fmtMoney(income - expense)}`,
        };
        pack.vendas_de_hoje = Array.from(todayByCur.entries()).map(([cur, v]) => ({
            moeda: cur,
            total: `${symbolOf(cur)} ${fmtMoney(v.total)}`,
            pagamentos: v.count,
        }));
        pack.ultimas_transacoes = (txs || []).slice(0, 10).map((t: any) => ({
            data: String(t.date || '').slice(0, 10),
            descricao: t.description,
            tipo: t.type,
            valor: `${symbolOf(t.currency)} ${fmtMoney(Number(t.amount || 0))}`,
            forma: t.payment_method || null,
        }));

        if (byCourseId.size > 0) {
            const { data: courses } = await client
                .from('SITE_Courses')
                .select('id, title')
                .in('id', Array.from(byCourseId.keys()));
            const titleById = new Map((courses || []).map((c: any) => [c.id, c.title]));
            pack.faturamento_por_curso_no_mes = Array.from(byCourseId.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 8)
                .map(([id, total]) => ({ curso: titleById.get(id) || 'Curso sem título', total: `R$ ${fmtMoney(total)}` }));
        }
    } catch (e: any) {
        console.error('[aiSector] rita.transacoes:', e?.message);
    }

    // Consolidado financeiro dos alunos + quem falta pagar.
    // Considera inscrições Confirmed/CheckedIn/Pending com valor negociado > 0.
    // Fonte dos valores:
    //   - valor de tabela  = SITE_Courses.price (preço cheio do curso)
    //   - valor negociado  = SITE_Enrollments.total_amount (fechado com o aluno)
    //   - arrecadado       = SITE_Enrollments.amount_paid (já entrou)
    //   - defasagem/desconto = tabela − negociado (o que se deixou de cobrar)
    //   - saldo a receber  = negociado − arrecadado (o que ainda falta entrar)
    try {
        const { data: enrs } = await client
            .from('SITE_Enrollments')
            .select('student_name, total_amount, amount_paid, currency, course_id, status')
            .in('status', ['Confirmed', 'CheckedIn', 'Pending'])
            .limit(3000);

        const rows = (enrs || []).filter((e: any) => (e.currency || 'BRL').toUpperCase() === 'BRL');

        // Preço de tabela + título por curso citado nas inscrições.
        const courseIds = Array.from(new Set(rows.map((e: any) => e.course_id).filter(Boolean)));
        const priceById = new Map<string, number>();
        const titleById = new Map<string, string>();
        if (courseIds.length > 0) {
            const { data: courses } = await client
                .from('SITE_Courses')
                .select('id, title, price')
                .in('id', courseIds);
            (courses || []).forEach((c: any) => {
                priceById.set(c.id, Number(c.price || 0));
                titleById.set(c.id, c.title);
            });
        }

        let tabelaTotal = 0;
        let negociadoTotal = 0;
        let arrecadadoTotal = 0;
        let defasagemTotal = 0; // = desconto concedido (tabela − negociado)
        let saldoTotal = 0;
        const debtors: Array<{ aluno: string; curso: string | null; restante: number }> = [];

        rows.forEach((e: any) => {
            const negociado = Number(e.total_amount || 0);
            const pago = Number(e.amount_paid || 0);
            const tabela = priceById.get(e.course_id) || 0;
            // Dinheiro que entrou é real SEMPRE — mesmo sem valor negociado definido.
            arrecadadoTotal += pago;
            // Tabela/negociado/defasagem/saldo só fazem sentido com valor negociado.
            if (negociado <= 0) return;
            negociadoTotal += negociado;
            tabelaTotal += tabela > 0 ? tabela : negociado;
            if (tabela > negociado) defasagemTotal += tabela - negociado;
            const remaining = negociado - pago;
            if (remaining > 0.009) {
                saldoTotal += remaining;
                debtors.push({ aluno: e.student_name, curso: titleById.get(e.course_id) || null, restante: remaining });
            }
        });

        pack.consolidado_financeiro_alunos = {
            base: 'Inscrições confirmadas, com check-in e pendentes (moeda BRL).',
            valor_de_tabela_total: `R$ ${fmtMoney(tabelaTotal)}`,
            valor_negociado_total: `R$ ${fmtMoney(negociadoTotal)}`,
            arrecadado_total: `R$ ${fmtMoney(arrecadadoTotal)}`,
            defasagem_desconto_total: `R$ ${fmtMoney(defasagemTotal)}`,
            saldo_a_receber_total: `R$ ${fmtMoney(saldoTotal)}`,
            inscricoes_consideradas: rows.length,
        };
        pack.quem_falta_pagar = {
            total_de_alunos_com_saldo: debtors.length,
            saldo_a_receber_total: `R$ ${fmtMoney(saldoTotal)}`,
            devedores: debtors
                .sort((a, b) => b.restante - a.restante)
                .slice(0, 20)
                .map((d) => ({ aluno: d.aluno, curso: d.curso, restante: `R$ ${fmtMoney(d.restante)}` })),
        };
    } catch (e: any) {
        console.error('[aiSector] rita.consolidado:', e?.message);
    }

    return pack;
}

// ─── Setor BIA — Atendimento & CRM ───────────────────────────────────────────

async function gatherBiaPack(client: SupabaseClient): Promise<Record<string, any>> {
    const pack: Record<string, any> = {};
    const { iso: dayStart } = startOfTodayBRT();
    const nowISO = new Date().toISOString();

    // WhatsApp oficial: recebidas x respondidas hoje.
    try {
        const [{ count: inbound }, { count: outbound }] = await Promise.all([
            client.from('SITE_WhatsAppCloudMessages').select('id', { count: 'exact', head: true }).eq('direction', 'in').gte('timestamp', dayStart),
            client.from('SITE_WhatsAppCloudMessages').select('id', { count: 'exact', head: true }).eq('direction', 'out').gte('timestamp', dayStart),
        ]);
        pack.whatsapp_hoje = { recebidas: inbound ?? 0, enviadas: outbound ?? 0 };
    } catch (e: any) {
        console.error('[aiSector] bia.whatsapp:', e?.message);
    }

    // Tarefas: abertas, atrasadas e as 10 mais urgentes (com o lead vinculado).
    try {
        const [{ count: open }, { count: late }, { data: urgent }] = await Promise.all([
            client.from('SITE_Tasks').select('id', { count: 'exact', head: true }).neq('status', 'DONE'),
            client.from('SITE_Tasks').select('id', { count: 'exact', head: true }).neq('status', 'DONE').lt('due_date', nowISO),
            client.from('SITE_Tasks')
                .select('title, status, priority, due_date, SITE_Leads(name)')
                .neq('status', 'DONE')
                .order('due_date', { ascending: true, nullsFirst: false })
                .limit(10),
        ]);
        pack.tarefas = {
            em_aberto: open ?? 0,
            atrasadas: late ?? 0,
            mais_urgentes: (urgent || []).map((t: any) => ({
                titulo: t.title,
                prioridade: t.priority,
                vence_em: t.due_date ? String(t.due_date).slice(0, 10) : null,
                lead: t.SITE_Leads?.name || null,
            })),
        };
    } catch (e: any) {
        console.error('[aiSector] bia.tarefas:', e?.message);
    }

    // Funil de leads + novos de hoje.
    try {
        const { data: leads } = await client
            .from('SITE_Leads')
            .select('name, status, created_at')
            .order('created_at', { ascending: false })
            .limit(5000);
        const byStage: Record<string, number> = {};
        const newToday: Array<{ nome: string; status: string }> = [];
        (leads || []).forEach((l: any) => {
            const s = l.status || 'New';
            byStage[s] = (byStage[s] || 0) + 1;
            if (String(l.created_at || '') >= dayStart && newToday.length < 10) {
                newToday.push({ nome: l.name, status: s });
            }
        });
        pack.funil_de_leads = byStage;
        pack.leads_novos_hoje = {
            total: (leads || []).filter((l: any) => String(l.created_at || '') >= dayStart).length,
            primeiros: newToday,
        };
    } catch (e: any) {
        console.error('[aiSector] bia.funil:', e?.message);
    }

    // WhatsApp OFICIAL (Meta) — as mesmas métricas da tela "Métricas" do
    // painel: status, resolução pela IA, sentimento, prioridade, principais
    // tópicos/dúvidas, conversas que precisam de atenção e resumos por
    // conversa (análise por IA gravada em SITE_WhatsAppCloudConversations).
    try {
        const [{ data: convs }, { data: sentRows }] = await Promise.all([
            client
                .from('SITE_WhatsAppCloudConversations')
                .select('profile_name, wa_id, status, last_direction, last_message_at, ai_summary, ai_sentiment, ai_topics, ai_priority, ai_suggested_action')
                .order('last_message_at', { ascending: false })
                .limit(500),
            client.from('SITE_WhatsAppCloudMessages').select('sent_by').limit(10000),
        ]);

        const byStatus: Record<string, number> = {};
        const bySentiment: Record<string, number> = {};
        const byPriority: Record<string, number> = {};
        const topicMap: Record<string, number> = {};
        const attention: any[] = [];
        const waiting: Array<{ contato: string; minutos: number }> = [];
        const nowMs = Date.now();

        (convs || []).forEach((c: any) => {
            const st = c.status || 'bot';
            byStatus[st === 'bot' ? 'ia' : st] = (byStatus[st === 'bot' ? 'ia' : st] || 0) + 1;
            if (c.ai_sentiment) bySentiment[c.ai_sentiment] = (bySentiment[c.ai_sentiment] || 0) + 1;
            if (c.ai_priority) byPriority[c.ai_priority] = (byPriority[c.ai_priority] || 0) + 1;
            (c.ai_topics || []).forEach((t: string) => {
                const k = String(t || '').trim();
                if (k) topicMap[k] = (topicMap[k] || 0) + 1;
            });
            if ((c.ai_priority === 'alta' || c.status === 'pendente') && attention.length < 6) {
                attention.push({
                    contato: c.profile_name || c.wa_id,
                    prioridade: c.ai_priority || null,
                    status: c.status || null,
                    resumo: c.ai_summary || null,
                    acao_sugerida: c.ai_suggested_action || null,
                });
            }
            // Demora: última mensagem foi DO CLIENTE e ainda não respondemos.
            if (c.last_direction === 'in' && c.last_message_at) {
                const min = Math.round((nowMs - new Date(c.last_message_at).getTime()) / 60000);
                if (isFinite(min) && min >= 0) waiting.push({ contato: c.profile_name || c.wa_id, minutos: min });
            }
        });

        let aiSent = 0;
        let humanSent = 0;
        (sentRows || []).forEach((r: any) => {
            if (r.sent_by === 'ai') aiSent += 1;
            else if (r.sent_by === 'human') humanSent += 1;
        });
        const totalReplies = aiSent + humanSent;

        const fmtDur = (min: number) => (min >= 60 ? `${Math.floor(min / 60)}h ${min % 60}min` : `${min}min`);

        pack.whatsapp_oficial_metricas = {
            conversas_total: (convs || []).length,
            conversas_por_status: byStatus,
            respostas_enviadas: {
                pela_ia: aiSent,
                humanas: humanSent,
                resolucao_pela_ia_pct: totalReplies > 0 ? Math.round((aiSent / totalReplies) * 100) : 0,
            },
            sentimento_dos_clientes: bySentiment,
            prioridade_das_conversas: byPriority,
            principais_topicos_e_duvidas: Object.entries(topicMap)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 12)
                .map(([topico, conversas]) => ({ topico, conversas })),
            precisam_de_atencao: attention,
        };
        pack.atendimentos_aguardando_resposta_agora = {
            total: waiting.length,
            mais_antigos: waiting
                .sort((a, b) => b.minutos - a.minutos)
                .slice(0, 5)
                .map((w) => ({ contato: w.contato, aguardando_ha: fmtDur(w.minutos) })),
        };
        const resumos = (convs || [])
            .filter((c: any) => c.ai_summary)
            .slice(0, 8)
            .map((c: any) => ({ contato: c.profile_name || c.wa_id, resumo: c.ai_summary }));
        if (resumos.length > 0) pack.resumos_de_conversas_recentes = resumos;
    } catch (e: any) {
        console.error('[aiSector] bia.metricas oficial:', e?.message);
    }

    // Tempo de atendimento (últimos 7 dias): quanto demoramos para dar a
    // PRIMEIRA resposta depois de cada mensagem do cliente (WhatsApp oficial).
    try {
        const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
        const { data: msgs } = await client
            .from('SITE_WhatsAppCloudMessages')
            .select('conversation_id, direction, timestamp')
            .gte('timestamp', since)
            .order('timestamp', { ascending: true })
            .limit(8000);
        const pendingByConv = new Map<string, number>();
        const gapsMin: number[] = [];
        (msgs || []).forEach((m: any) => {
            const t = new Date(m.timestamp).getTime();
            if (!m.conversation_id || !isFinite(t)) return;
            if (m.direction === 'in') {
                if (!pendingByConv.has(m.conversation_id)) pendingByConv.set(m.conversation_id, t);
            } else if (m.direction === 'out') {
                const start = pendingByConv.get(m.conversation_id);
                if (start !== undefined) {
                    gapsMin.push((t - start) / 60000);
                    pendingByConv.delete(m.conversation_id);
                }
            }
        });
        if (gapsMin.length > 0) {
            const avg = gapsMin.reduce((a, b) => a + b, 0) / gapsMin.length;
            const max = Math.max(...gapsMin);
            const under5 = gapsMin.filter((g) => g <= 5).length;
            const fmtDur = (min: number) => (min >= 60 ? `${Math.floor(min / 60)}h ${Math.round(min % 60)}min` : `${Math.round(min)}min`);
            pack.tempo_de_resposta_whatsapp_7dias = {
                respostas_medidas: gapsMin.length,
                tempo_medio_de_resposta: fmtDur(avg),
                maior_demora: fmtDur(max),
                respondidas_em_ate_5min_pct: Math.round((under5 / gapsMin.length) * 100),
            };
        }
    } catch (e: any) {
        console.error('[aiSector] bia.tempos:', e?.message);
    }

    // CRM: leads novos aguardando o PRIMEIRO atendimento há mais tempo.
    try {
        const { data: newLeads } = await client
            .from('SITE_Leads')
            .select('name, created_at')
            .eq('status', 'New')
            .order('created_at', { ascending: true })
            .limit(5);
        const nowMs = Date.now();
        const rows = (newLeads || []).map((l: any) => {
            const h = Math.round((nowMs - new Date(l.created_at).getTime()) / 3600000);
            return { lead: l.name, aguardando_ha: h >= 48 ? `${Math.floor(h / 24)} dias` : `${h}h` };
        });
        if (rows.length > 0) pack.leads_aguardando_primeiro_atendimento_mais_antigos = rows;
    } catch (e: any) {
        console.error('[aiSector] bia.leads aguardando:', e?.message);
    }

    return pack;
}

// ─── Setor LÉO — Inscrições, turmas e cursos ─────────────────────────────────

async function gatherLeoPack(client: SupabaseClient): Promise<Record<string, any>> {
    const pack: Record<string, any> = {};

    // Catálogo compacto + próximos cursos.
    let courses: any[] = [];
    try {
        const full = await client
            .from('SITE_Courses')
            .select('id, title, location, city, state, date, price, status, registered_count')
            .limit(200);
        if (!full.error) courses = full.data || [];
        else {
            const minimal = await client
                .from('SITE_Courses')
                .select('id, title, location, date, price, status')
                .limit(200);
            courses = minimal.data || [];
        }

        const hoje = todayYMD();
        pack.catalogo_de_cursos = courses.map((c: any) => ({
            titulo: c.title,
            cidade: [c.city, c.state].filter(Boolean).join('/') || c.location || null,
            data: c.date,
            preco_tabela: c.price,
            status: c.status,
            inscritos: c.registered_count ?? null,
            // Turma cuja data já passou — NÃO listar como cronograma/agenda futura;
            // serve só para consultas históricas (faturamento, inscritos etc.).
            ja_ocorreu: String(c.date || '') < hoje,
        }));
        pack.proximos_cursos = courses
            .filter((c: any) => String(c.date || '') >= todayYMD())
            .sort((a: any, b: any) => String(a.date).localeCompare(String(b.date)))
            .slice(0, 12)
            .map((c: any) => ({
                titulo: c.title,
                cidade: [c.city, c.state].filter(Boolean).join('/') || c.location || null,
                data: c.date,
                inscritos: c.registered_count ?? null,
            }));
    } catch (e: any) {
        console.error('[aiSector] leo.catalogo:', e?.message);
    }

    // Inscrições por status + alunos pendentes.
    try {
        const { data: enrs } = await client
            .from('SITE_Enrollments')
            .select('student_name, status, created_at')
            .order('created_at', { ascending: false })
            .limit(5000);
        const byStatus: Record<string, number> = {};
        const pendings: string[] = [];
        (enrs || []).forEach((e: any) => {
            const s = e.status || 'Pending';
            byStatus[s] = (byStatus[s] || 0) + 1;
            if (s === 'Pending' && pendings.length < 10) pendings.push(e.student_name);
        });
        pack.inscricoes_por_status = byStatus;
        pack.alunos_pendentes_recentes = pendings;
    } catch (e: any) {
        console.error('[aiSector] leo.inscricoes:', e?.message);
    }

    return pack;
}

// ─── Cursos citados na pergunta: detalhe financeiro (COMPARTILHADO) ──────────

/**
 * Detalhe financeiro/matrículas dos cursos CITADOS na pergunta (máx 4).
 * Compartilhado entre Rita, Léo e Sofia: "quanto arrecadou em Belo Horizonte?"
 * é pergunta financeira e precisa do detalhe mesmo sem palavra do setor de
 * inscrições (antes o detalhe só existia no pack do Léo — bug real).
 * Matching por PONTUAÇÃO (cidade > local > palavras distintivas do título) —
 * palavras genéricas como "curso"/"suspensão" não casam mais com o catálogo
 * inteiro (bug real: BH ficava fora do corte e a IA respondia "não consta").
 */
async function gatherCitedCourseDetails(client: SupabaseClient, question: string): Promise<any[]> {
    const q = normalize(question);
    if (!q) return [];

    let courses: any[] = [];
    const full = await client
        .from('SITE_Courses')
        .select('id, title, location, city, state, date, price, status')
        .limit(300);
    if (!full.error) courses = full.data || [];
    else {
        const minimal = await client
            .from('SITE_Courses')
            .select('id, title, location, date, price, status')
            .limit(300);
        courses = minimal.data || [];
    }

    const matched = courses
        .map((c: any) => ({ c, score: courseMatchScore(c, q) }))
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 4)
        .map((x) => x.c);

    const details: any[] = [];
    {
        for (const course of matched) {
            const detail: Record<string, any> = {
                curso: course.title,
                cidade: [course.city, course.state].filter(Boolean).join('/') || course.location || null,
                preco_tabela: course.price,
                data: course.date,
                status: course.status,
            };
            try {
                const { data: enrs } = await client
                    .from('SITE_Enrollments')
                    .select('student_name, status, total_amount, amount_paid, currency')
                    .eq('course_id', course.id)
                    .limit(1000);
                const tabela = Number(course.price || 0);
                let count = 0;
                let confirmed = 0;
                let sumTabela = 0;
                let sumNegotiated = 0;
                let sumPaid = 0;
                let discount = 0; // defasagem = desconto concedido (tabela − negociado)
                let quitados = 0;
                const devedores: Array<{ aluno: string; restante: number }> = [];
                (enrs || []).forEach((e: any) => {
                    if ((e.currency || 'BRL').toUpperCase() !== 'BRL') return;
                    count += 1;
                    if (e.status === 'Confirmed' || e.status === 'CheckedIn') confirmed += 1;
                    const negotiated = Number(e.total_amount || 0);
                    const paid = Number(e.amount_paid || 0);
                    // Dinheiro que entrou é real SEMPRE — mesmo sem valor negociado.
                    sumPaid += paid;
                    if (negotiated > 0) {
                        sumTabela += tabela > 0 ? tabela : negotiated;
                        sumNegotiated += negotiated;
                        if (tabela > negotiated) discount += tabela - negotiated;
                        const remaining = negotiated - paid;
                        if (remaining > 0.009) devedores.push({ aluno: e.student_name, restante: remaining });
                        else quitados += 1;
                    }
                });
                const saldoAReceber = devedores.reduce((acc, d) => acc + d.restante, 0);
                detail.matriculas = {
                    total: count,
                    confirmadas_ou_checkin: confirmed,
                    valor_de_tabela_total: `R$ ${fmtMoney(sumTabela)}`,
                    valor_negociado_total: `R$ ${fmtMoney(sumNegotiated)}`,
                    arrecadado_total: `R$ ${fmtMoney(sumPaid)}`,
                    saldo_a_receber: `R$ ${fmtMoney(saldoAReceber)}`,
                    defasagem_desconto_total: `R$ ${fmtMoney(discount)}`,
                    quitados: quitados,
                    ainda_devendo: devedores.length,
                    quem_falta_pagar: devedores
                        .sort((a, b) => b.restante - a.restante)
                        .slice(0, 15)
                        .map((d) => ({ aluno: d.aluno, restante: `R$ ${fmtMoney(d.restante)}` })),
                };
            } catch (e: any) {
                console.error('[aiSector] leo.detalhe matrículas:', e?.message);
            }
            try {
                const { data: txs } = await client
                    .from('SITE_Transactions')
                    .select('amount, type, currency')
                    .eq('course_id', course.id)
                    .limit(1000);
                let income = 0;
                let expense = 0;
                (txs || []).forEach((t: any) => {
                    if ((t.currency || 'BRL').toUpperCase() !== 'BRL') return;
                    if (t.type === 'Income') income += Number(t.amount || 0);
                    else if (t.type === 'Expense') expense += Number(t.amount || 0);
                });
                detail.transacoes_registradas = {
                    receitas: `R$ ${fmtMoney(income)}`,
                    despesas: `R$ ${fmtMoney(expense)}`,
                };
            } catch (e: any) {
                console.error('[aiSector] leo.detalhe transações:', e?.message);
            }
            details.push(detail);
        }
    }
    return details;
}

// ─── Setor SOFIA — RH, equipe e visão gerencial ──────────────────────────────

async function gatherSofiaPack(client: SupabaseClient, terms: string[]): Promise<Record<string, any>> {
    const pack: Record<string, any> = {};
    const monthStart = startOfMonthBRT();

    // Equipe cadastrada no sistema (RH).
    try {
        const { data: users } = await client
            .from('SITE_Users')
            .select('name, role, status')
            .limit(50);
        pack.equipe = (users || []).map((u: any) => ({
            nome: u.name,
            cargo: typeof u.role === 'object' ? (u.role?.name || null) : (u.role || null),
            status: u.status || 'Active',
        }));
    } catch (e: any) {
        console.error('[aiSector] sofia.equipe:', e?.message);
    }

    // Atividade por funcionário no mês (auditoria + leads + matrículas + lançamentos).
    try {
        const activity = await gatherStaffActivity(client, monthStart);
        pack.atividade_por_funcionario_no_mes = activity.slice(0, 10).map((s) => ({
            funcionario: s.userName,
            acessos_e_acoes: s.auditActions,
            leads_atribuidos: s.leadsAssigned,
            matriculas_feitas: s.enrollmentsHandled,
            lancamentos_financeiros: s.transactionsHandled,
            ultima_atividade: s.lastSeen,
        }));

        // Funcionário citado na pergunta → destaque individual.
        const cited = activity.filter((s) => matchesAnyTerm(s.userName, terms));
        if (cited.length > 0) {
            pack.funcionarios_citados_na_pergunta = cited.slice(0, 5).map((s) => ({
                funcionario: s.userName,
                acessos_e_acoes: s.auditActions,
                leads_atribuidos: s.leadsAssigned,
                matriculas_feitas: s.enrollmentsHandled,
                lancamentos_financeiros: s.transactionsHandled,
                ultima_atividade: s.lastSeen,
            }));
        }
    } catch (e: any) {
        console.error('[aiSector] sofia.atividade:', e?.message);
    }

    return pack;
}

// ─── Entidades citadas: aluno e lead (compartilhado entre setores) ───────────

/**
 * Monta a linha do tempo de pagamentos de uma inscrição a partir das transações
 * vinculadas (SITE_Transactions.enrollment_id) — mesma lógica do painel
 * (PaymentHistoryModal): entrada → parciais → quitação. Pagamentos antigos sem
 * transação detalhada aparecem como "registrado na inscrição" com a diferença
 * exata. Nada é inventado.
 */
function buildPaymentTimeline(
    txs: Array<{ amount: number; date: string | null; method: string | null }>,
    total: number,
    paid: number,
    sym: string,
    enrollmentPaymentMethod: string | null,
    createdAt: string | null
): Array<Record<string, any>> {
    const items: Array<{ label: string; date: string | null; amount: number; method: string | null; isSettlement: boolean }> = [];
    const trackedSum = txs.reduce((acc, t) => acc + t.amount, 0);
    const untracked = paid - trackedSum;
    if (untracked > 0.009) {
        items.push({ label: '', date: createdAt, amount: untracked, method: enrollmentPaymentMethod || 'registrado na inscrição', isSettlement: false });
    }
    txs.forEach((t) => items.push({ label: '', date: t.date, amount: t.amount, method: t.method, isSettlement: false }));

    let cumulative = 0;
    items.forEach((p, idx) => {
        cumulative += p.amount;
        const settles = total > 0 && cumulative >= total - 0.009;
        p.isSettlement = settles;
        if (settles && idx === 0) p.label = 'Pagamento integral';
        else if (settles) p.label = 'Quitação (pagamento final)';
        else if (idx === 0) p.label = 'Entrada';
        else p.label = 'Pagamento parcial';
    });

    return items.map((p) => ({
        etapa: p.label,
        valor: `${sym} ${fmtMoney(p.amount)}`,
        data: p.date ? String(p.date).slice(0, 10) : null,
        forma: p.method,
    }));
}

async function findStudentsByTerms(client: SupabaseClient, terms: string[], question = ''): Promise<any[]> {
    if (terms.length === 0) return [];
    const { data: enrs } = await client
        .from('SITE_Enrollments')
        .select('id, student_name, status, total_amount, amount_paid, currency, created_at, course_id, payment_method')
        .order('created_at', { ascending: false })
        .limit(3000);
    let matched = (enrs || []).filter((e: any) => matchesAnyTerm(e.student_name, terms));
    if (matched.length === 0) return [];

    // Pergunta cita um curso? Prioriza as matrículas do aluno NAQUELE curso
    // (cidade/local/título batendo com a pergunta) — "quanto o João pagou no
    // curso de Fortaleza" traz a inscrição de Fortaleza primeiro.
    const q = normalize(question);
    if (q) {
        const allCourseIds = Array.from(new Set(matched.map((m: any) => m.course_id).filter(Boolean)));
        if (allCourseIds.length > 0) {
            const { data: cs } = await client
                .from('SITE_Courses')
                .select('id, title, city, state, location')
                .in('id', allCourseIds);
            const citedIds = new Set(
                (cs || []).filter((c: any) => courseMatchScore(c, q) > 0).map((c: any) => c.id)
            );
            if (citedIds.size > 0) {
                matched = matched.sort((a: any, b: any) =>
                    Number(citedIds.has(b.course_id)) - Number(citedIds.has(a.course_id))
                );
            }
        }
    }
    matched = matched.slice(0, 8);

    const courseIds = Array.from(new Set(matched.map((m: any) => m.course_id).filter(Boolean)));
    const titleById = new Map<string, string>();
    if (courseIds.length > 0) {
        const { data: courses } = await client.from('SITE_Courses').select('id, title, date').in('id', courseIds);
        (courses || []).forEach((c: any) => titleById.set(c.id, `${c.title} (${c.date || 'sem data'})`));
    }

    // Histórico de pagamentos (entrada/parcelas/quitação) por inscrição.
    // Best-effort: se a coluna enrollment_id ainda não existir, segue sem timeline.
    const enrollmentIds = matched.map((m: any) => m.id).filter(Boolean);
    const txByEnrollment = new Map<string, Array<{ amount: number; date: string | null; method: string | null }>>();
    if (enrollmentIds.length > 0) {
        const { data: txs, error } = await client
            .from('SITE_Transactions')
            .select('enrollment_id, amount, type, date, payment_method')
            .in('enrollment_id', enrollmentIds)
            .eq('type', 'Income')
            .order('date', { ascending: true });
        if (error) {
            console.error('[aiSector] histórico pagamentos indisponível:', error.message);
        } else {
            (txs || []).forEach((t: any) => {
                const list = txByEnrollment.get(t.enrollment_id) || [];
                list.push({ amount: Number(t.amount || 0), date: t.date || null, method: t.payment_method || null });
                txByEnrollment.set(t.enrollment_id, list);
            });
        }
    }

    return matched.map((e: any) => {
        const total = Number(e.total_amount || 0);
        const paid = Number(e.amount_paid || 0);
        const sym = symbolOf(e.currency);
        return {
            aluno: e.student_name,
            curso: titleById.get(e.course_id) || null,
            status_inscricao: e.status,
            valor_negociado: `${sym} ${fmtMoney(total)}`,
            valor_pago: `${sym} ${fmtMoney(paid)}`,
            saldo_restante: `${sym} ${fmtMoney(Math.max(0, total - paid))}`,
            inscrito_em: String(e.created_at || '').slice(0, 10),
            historico_pagamentos: buildPaymentTimeline(
                txByEnrollment.get(e.id) || [], total, paid, sym, e.payment_method || null, e.created_at || null
            ),
        };
    });
}

async function findLeadsByTerms(client: SupabaseClient, terms: string[]): Promise<any[]> {
    if (terms.length === 0) return [];
    const { data: leads } = await client
        .from('SITE_Leads')
        .select('name, phone, status, assigned_to, tags, created_at')
        .order('created_at', { ascending: false })
        .limit(3000);
    const matched = (leads || []).filter((l: any) => matchesAnyTerm(l.name, terms)).slice(0, 8);
    if (matched.length === 0) return [];

    const userIds = Array.from(new Set(matched.map((m: any) => m.assigned_to).filter(Boolean)));
    const nameById = new Map<string, string>();
    if (userIds.length > 0) {
        const { data: users } = await client.from('SITE_Users').select('id, name').in('id', userIds);
        (users || []).forEach((u: any) => nameById.set(u.id, u.name));
    }

    return matched.map((l: any) => ({
        lead: l.name,
        telefone: l.phone || null,
        status: l.status,
        atendente: l.assigned_to ? (nameById.get(l.assigned_to) || l.assigned_to) : null,
        tags: l.tags || [],
        criado_em: String(l.created_at || '').slice(0, 10),
    }));
}

// ─── Orquestrador: pergunta → pack setorial completo ─────────────────────────

export interface SectorDataPack {
    /** JSON compacto pronto para o prompt do LLM. */
    json: string;
    /** Setores detectados na pergunta (vazio = genérica, todos coletados). */
    sectors: AIAgentId[];
}

/**
 * Monta o pack de dados dirigido pela pergunta: só os setores detectados são
 * coletados (pergunta genérica coleta todos) + registros exatos das entidades
 * citadas. Best-effort: cada bloco falha isolado.
 */
export async function buildSectorDataPack(client: SupabaseClient, question: string): Promise<SectorDataPack> {
    const detected = detectSectors(question);
    const sectors: AIAgentId[] = detected.length > 0 ? detected : ['rita', 'bia', 'leo', 'sofia'];
    const terms = extractSearchTerms(question);

    const pack: Record<string, any> = {
        data_de_hoje: startOfTodayBRT().label,
        setores_consultados: sectors,
        origem_dos_dados: 'Banco de dados do sistema W-Tech (Supabase) — consulta em tempo real. Nenhuma fonte externa.',
    };

    const jobs: Array<Promise<void>> = [];

    if (sectors.includes('rita')) {
        jobs.push(gatherRitaPack(client).then((p) => { pack.financeiro_rita = p; }).catch((e) => console.error('[aiSector] rita:', e?.message)));
    }
    if (sectors.includes('bia')) {
        jobs.push(gatherBiaPack(client).then((p) => { pack.atendimento_crm_bia = p; }).catch((e) => console.error('[aiSector] bia:', e?.message)));
    }
    if (sectors.includes('leo')) {
        jobs.push(gatherLeoPack(client).then((p) => { pack.inscricoes_leo = p; }).catch((e) => console.error('[aiSector] leo:', e?.message)));
    }
    if (sectors.includes('sofia')) {
        jobs.push(gatherSofiaPack(client, terms).then((p) => { pack.rh_gerencia_sofia = p; }).catch((e) => console.error('[aiSector] sofia:', e?.message)));
    }

    // Cursos citados na pergunta → detalhe financeiro completo (Rita/Léo/Sofia).
    if (sectors.includes('rita') || sectors.includes('leo') || sectors.includes('sofia')) {
        jobs.push(
            gatherCitedCourseDetails(client, question)
                .then((d) => { if (d.length) pack.detalhe_dos_cursos_citados = d; })
                .catch((e) => console.error('[aiSector] cursos citados:', e?.message))
        );
    }

    // Entidades citadas: alunos (rita/leo) e leads (bia) — só quando há termos.
    if (terms.length > 0 && (sectors.includes('rita') || sectors.includes('leo'))) {
        jobs.push(findStudentsByTerms(client, terms, question).then((s) => { if (s.length) pack.alunos_citados_na_pergunta = s; }).catch((e) => console.error('[aiSector] alunos:', e?.message)));
    }
    if (terms.length > 0 && sectors.includes('bia')) {
        jobs.push(findLeadsByTerms(client, terms).then((l) => { if (l.length) pack.leads_citados_na_pergunta = l; }).catch((e) => console.error('[aiSector] leads:', e?.message)));
    }

    await Promise.all(jobs);
    return { json: JSON.stringify(pack), sectors };
}
