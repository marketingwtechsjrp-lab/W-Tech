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

// ─── Roteador de setores por palavra-chave ───────────────────────────────────

const SECTOR_KEYWORDS: Record<AIAgentId, string[]> = {
    rita: [
        'financeiro', 'receita', 'despesa', 'custo', 'fatur', 'saldo', 'desconto', 'valor',
        'preco', 'pagou', 'pagamento', 'pagar', 'pago', 'pix', 'cartao', 'boleto', 'transacao',
        'caixa', 'lucro', 'divida', 'devedor', 'devendo', 'cobranca', 'dinheiro', 'reais',
        'restante', 'receber', 'entrada', 'gasto',
    ],
    bia: [
        'atendimento', 'whatsapp', 'mensagem', 'respond', 'tarefa', 'funil', 'follow', 'crm',
        'lead', 'conversa', 'contato', 'atendeu', 'atendido', 'negocia',
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

    // Saldo a receber + maiores devedores (fonte: inscrições confirmadas com pagamento parcial).
    try {
        const { data: enrs } = await client
            .from('SITE_Enrollments')
            .select('student_name, total_amount, amount_paid, currency')
            .eq('status', 'Confirmed')
            .gt('total_amount', 0)
            .limit(2000);
        let total = 0;
        const debtors: Array<{ aluno: string; restante: number }> = [];
        (enrs || []).forEach((e: any) => {
            if ((e.currency || 'BRL').toUpperCase() !== 'BRL') return;
            const remaining = Number(e.total_amount || 0) - Number(e.amount_paid || 0);
            if (remaining > 0.009) {
                total += remaining;
                debtors.push({ aluno: e.student_name, restante: remaining });
            }
        });
        pack.saldo_a_receber = {
            total: `R$ ${fmtMoney(total)}`,
            inscricoes_com_saldo: debtors.length,
            maiores_devedores: debtors
                .sort((a, b) => b.restante - a.restante)
                .slice(0, 10)
                .map((d) => ({ aluno: d.aluno, restante: `R$ ${fmtMoney(d.restante)}` })),
        };
    } catch (e: any) {
        console.error('[aiSector] rita.saldo:', e?.message);
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

    return pack;
}

// ─── Setor LÉO — Inscrições, turmas e cursos ─────────────────────────────────

async function gatherLeoPack(client: SupabaseClient, question: string): Promise<Record<string, any>> {
    const pack: Record<string, any> = {};
    const q = normalize(question);

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

        pack.catalogo_de_cursos = courses.map((c: any) => ({
            titulo: c.title,
            cidade: [c.city, c.state].filter(Boolean).join('/') || c.location || null,
            data: c.date,
            preco_tabela: c.price,
            status: c.status,
            inscritos: c.registered_count ?? null,
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

    // Detalhe financeiro/matrículas dos cursos citados na pergunta (máx 5).
    try {
        const matched = courses.filter((c: any) => {
            const titleWords = normalize(c.title).split(/\s+/).filter((w: string) => w.length >= 4);
            return (
                (c.city && q.includes(normalize(c.city))) ||
                (c.location && q.includes(normalize(c.location))) ||
                titleWords.some((w: string) => q.includes(w))
            );
        });
        const details: any[] = [];
        for (const course of matched.slice(0, 5)) {
            const detail: Record<string, any> = { curso: course.title, preco_tabela: course.price, data: course.date };
            try {
                const { data: enrs } = await client
                    .from('SITE_Enrollments')
                    .select('status, total_amount, amount_paid, currency')
                    .eq('course_id', course.id)
                    .limit(1000);
                let count = 0;
                let confirmed = 0;
                let sumNegotiated = 0;
                let sumPaid = 0;
                let discount = 0;
                (enrs || []).forEach((e: any) => {
                    if ((e.currency || 'BRL').toUpperCase() !== 'BRL') return;
                    count += 1;
                    if (e.status === 'Confirmed' || e.status === 'CheckedIn') confirmed += 1;
                    const negotiated = Number(e.total_amount || 0);
                    sumNegotiated += negotiated;
                    sumPaid += Number(e.amount_paid || 0);
                    if (negotiated > 0 && Number(course.price || 0) > negotiated) {
                        discount += Number(course.price) - negotiated;
                    }
                });
                detail.matriculas = {
                    total: count,
                    confirmadas_ou_checkin: confirmed,
                    valor_negociado_total: `R$ ${fmtMoney(sumNegotiated)}`,
                    valor_pago_total: `R$ ${fmtMoney(sumPaid)}`,
                    saldo_restante: `R$ ${fmtMoney(Math.max(0, sumNegotiated - sumPaid))}`,
                    desconto_total_vs_preco_tabela: `R$ ${fmtMoney(discount)}`,
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
        if (details.length > 0) pack.detalhe_dos_cursos_citados = details;
    } catch (e: any) {
        console.error('[aiSector] leo.cursos citados:', e?.message);
    }

    return pack;
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

async function findStudentsByTerms(client: SupabaseClient, terms: string[]): Promise<any[]> {
    if (terms.length === 0) return [];
    const { data: enrs } = await client
        .from('SITE_Enrollments')
        .select('student_name, status, total_amount, amount_paid, currency, created_at, course_id')
        .order('created_at', { ascending: false })
        .limit(3000);
    const matched = (enrs || []).filter((e: any) => matchesAnyTerm(e.student_name, terms)).slice(0, 8);
    if (matched.length === 0) return [];

    const courseIds = Array.from(new Set(matched.map((m: any) => m.course_id).filter(Boolean)));
    const titleById = new Map<string, string>();
    if (courseIds.length > 0) {
        const { data: courses } = await client.from('SITE_Courses').select('id, title, date').in('id', courseIds);
        (courses || []).forEach((c: any) => titleById.set(c.id, `${c.title} (${c.date || 'sem data'})`));
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
        jobs.push(gatherLeoPack(client, question).then((p) => { pack.inscricoes_leo = p; }).catch((e) => console.error('[aiSector] leo:', e?.message)));
    }
    if (sectors.includes('sofia')) {
        jobs.push(gatherSofiaPack(client, terms).then((p) => { pack.rh_gerencia_sofia = p; }).catch((e) => console.error('[aiSector] sofia:', e?.message)));
    }

    // Entidades citadas: alunos (rita/leo) e leads (bia) — só quando há termos.
    if (terms.length > 0 && (sectors.includes('rita') || sectors.includes('leo'))) {
        jobs.push(findStudentsByTerms(client, terms).then((s) => { if (s.length) pack.alunos_citados_na_pergunta = s; }).catch((e) => console.error('[aiSector] alunos:', e?.message)));
    }
    if (terms.length > 0 && sectors.includes('bia')) {
        jobs.push(findLeadsByTerms(client, terms).then((l) => { if (l.length) pack.leads_citados_na_pergunta = l; }).catch((e) => console.error('[aiSector] leads:', e?.message)));
    }

    await Promise.all(jobs);
    return { json: JSON.stringify(pack), sectors };
}
