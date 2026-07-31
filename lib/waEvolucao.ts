import { supabase } from './supabaseClient';
import { generateContent } from './ai';
import { AtendenteStats, WaAnalise, WaAtendente, listAtendentes } from './waAtendentes';

/**
 * Evolução do atendente — compara TODOS os relatórios de IA já gerados para um
 * atendente (SITE_WaAtendenteAnalises) e produz um relatório novo mostrando se
 * o atendimento melhorou ou piorou ao longo do tempo.
 *
 * Divisão de responsabilidades (proposital):
 *   • IA        → lê o texto dos relatórios antigos e EXTRAI a nota de cada
 *                 período (cordialidade, agilidade, clareza, comercial,
 *                 resolução) + leitura qualitativa da trajetória;
 *   • sistema   → calcula deltas, médias e o veredito final em código, para o
 *                 gráfico e o texto nunca se contradizerem;
 *   • métricas duras (tempo médio de resposta, volume) vêm do `stats` que já
 *     foi salvo em cada relatório — não passam pela IA.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────────────────────

export const CRITERIOS = [
    { key: 'cordialidade', label: 'Cordialidade', cor: '#25D366' },
    { key: 'agilidade', label: 'Agilidade', cor: '#3b82f6' },
    { key: 'clareza', label: 'Clareza técnica', cor: '#a855f7' },
    { key: 'comercial', label: 'Aproveitamento comercial', cor: '#f59e0b' },
    { key: 'resolucao', label: 'Resolução', cor: '#ef4444' },
] as const;

export type CriterioKey = (typeof CRITERIOS)[number]['key'];

export type Notas = Record<CriterioKey | 'geral', number>;

export type Confianca = 'alta' | 'media' | 'baixa';

export interface EvolucaoMetricas {
    conversas: number;
    mensagens: number;
    aguardandoResposta: number;
    tempoRespostaMin: number | null;
}

/** Um ponto da série temporal — corresponde a um relatório antigo. */
export interface EvolucaoPonto {
    analiseId: string;
    dataISO: string;              // periodo_fim do relatório analisado
    label: string;                // "01/07 → 07/07"
    notas: Notas;
    destaque: string;
    confianca: Confianca;
    metricas: EvolucaoMetricas | null;
}

export type Veredito = 'evoluiu' | 'piorou' | 'estavel';

export interface EvolucaoResumo {
    veredito: Veredito;
    notaInicial: number;
    notaFinal: number;
    deltaGeral: number;
    /** delta (final − inicial) de cada critério */
    deltas: Record<CriterioKey, number>;
    /** média da 1ª metade vs 2ª metade da série (suaviza oscilação de um período) */
    mediaInicial: number;
    mediaFinal: number;
    tempoRespostaInicial: number | null;
    tempoRespostaFinal: number | null;
    primeiroPeriodo: string;
    ultimoPeriodo: string;
}

export interface WaEvolucao {
    id: string;
    atendente_id: string | null;
    atendente_nome: string | null;
    relatorios_analisados: number;
    periodo_inicio: string | null;
    periodo_fim: string | null;
    pontuacoes: EvolucaoPonto[] | null;
    resumo: EvolucaoResumo | null;
    relatorio: string;
    created_at: string;
    /**
     * false quando a tabela SITE_WaAtendenteEvolucao ainda não existe no banco:
     * a análise é exibida, mas só vive nesta sessão. Ver migrations/create_wa_atendente_evolucao.sql.
     */
    persistido?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Banco
// ─────────────────────────────────────────────────────────────────────────────

export async function listEvolucoes(atendenteId?: string, limit = 20): Promise<WaEvolucao[]> {
    let query = supabase
        .from('SITE_WaAtendenteEvolucao')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
    if (atendenteId) query = query.eq('atendente_id', atendenteId);

    const { data, error } = await query;
    if (error) {
        console.error('[waEvolucao] listEvolucoes:', error.message);
        return [];
    }
    return (data || []) as WaEvolucao[];
}

/** Análises não persistidas (tabela ausente) recebem um id local — não vão ao banco. */
export const ehLocal = (id: string) => id.startsWith('local-');

export async function deleteEvolucao(id: string): Promise<boolean> {
    if (ehLocal(id)) return true;
    const { error } = await supabase.from('SITE_WaAtendenteEvolucao').delete().eq('id', id);
    if (error) console.error('[waEvolucao] deleteEvolucao:', error.message);
    return !error;
}

/**
 * Relatórios que dizem respeito ao atendente: os gerados só para ele + os de
 * "todos os atendentes" em que ele aparece nas métricas do período.
 */
export async function listAnalisesDoAtendente(atendente: WaAtendente, limit = 200): Promise<WaAnalise[]> {
    const { data, error } = await supabase
        .from('SITE_WaAtendenteAnalises')
        .select('*')
        .or(`atendente_id.eq.${atendente.id},atendente_id.is.null`)
        .order('periodo_fim', { ascending: true })
        .limit(limit);
    if (error) {
        console.error('[waEvolucao] listAnalisesDoAtendente:', error.message);
        return [];
    }

    return ((data || []) as WaAnalise[]).filter(
        a => a.atendente_id === atendente.id || !!statsDoAtendente(a, atendente),
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Métricas determinísticas (vêm do stats já salvo em cada relatório)
// ─────────────────────────────────────────────────────────────────────────────

const nomeDoAtendente = (a: WaAtendente) => a.nome || `Atendente ${a.slot}`;

function statsDoAtendente(analise: WaAnalise, atendente: WaAtendente): AtendenteStats | null {
    const lista = analise.stats?.porAtendente as AtendenteStats[] | undefined;
    if (!Array.isArray(lista) || !lista.length) return null;

    // Relatório individual: o único registro é dele (o nome pode ter mudado desde então).
    if (analise.atendente_id === atendente.id && lista.length === 1) return lista[0];

    const nome = nomeDoAtendente(atendente);
    return lista.find(s => s.atendente === nome) || null;
}

function metricasDoAtendente(analise: WaAnalise, atendente: WaAtendente): EvolucaoMetricas | null {
    const s = statsDoAtendente(analise, atendente);
    if (!s) return null;
    return {
        conversas: s.conversas,
        mensagens: s.total,
        aguardandoResposta: s.aguardandoResposta,
        tempoRespostaMin: s.tempoMedioRespostaMin,
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// Prompt — extração das notas de cada relatório antigo
// ─────────────────────────────────────────────────────────────────────────────

const MAX_RELATORIOS = 24;             // relatórios mais recentes comparados
const MAX_CHARS_POR_RELATORIO = 6_000;
const MAX_CHARS_TOTAL = 120_000;

const fmtData = (iso: string) => new Date(iso).toLocaleDateString('pt-BR');
const fmtCurto = (iso: string) =>
    new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

const SYSTEM_PROMPT_EVOLUCAO = `Você é um auditor sênior de qualidade de atendimento da W-Tech Brasil analisando a EVOLUÇÃO de um único atendente ao longo do tempo.

Você receberá, em ordem cronológica, os relatórios de auditoria já gerados sobre o atendimento dele (cada um cobre um período) e as métricas duras calculadas pelo sistema em cada período.

Sua tarefa: para CADA relatório, extrair as notas daquele atendente (0 a 10) e, no fim, ler a trajetória.

Responda APENAS com um objeto JSON válido, sem markdown, sem comentários, no formato exato:
{
  "periodos": [
    {
      "id": "<id do relatório, copiado exatamente>",
      "notas": { "geral": 7.5, "cordialidade": 8, "agilidade": 6, "clareza": 7, "comercial": 6.5, "resolucao": 7 },
      "destaque": "uma frase curta sobre o que marcou esse período",
      "confianca": "alta"
    }
  ],
  "resumo": "3 a 6 frases comparando o começo com o fim: o atendimento melhorou, piorou ou ficou estável, e por quê",
  "melhorias": ["o que claramente melhorou, com evidência do relatório"],
  "regressoes": ["o que piorou ou voltou a acontecer"],
  "constantes": ["problemas que aparecem em quase todos os períodos e nunca foram resolvidos"],
  "recomendacoes": ["ações concretas, da mais urgente para a menos urgente"]
}

Regras obrigatórias:
- Retorne UM item em "periodos" para CADA relatório recebido, na mesma ordem, com o "id" copiado exatamente.
- Se o relatório já traz notas explícitas para esse atendente, USE essas notas (não recalcule).
- Se o relatório é de "todos os atendentes", use somente a parte referente ao atendente analisado.
- Se não houver base suficiente para um critério, estime pelo texto e marque "confianca": "baixa".
- "agilidade" deve refletir o tempo de resposta relatado nas métricas do período (menos minutos = nota maior).
- Notas sempre entre 0 e 10, com no máximo uma casa decimal. Nunca invente fatos que não estejam nos relatórios.`;

function buildPrompt(atendenteNome: string, analises: WaAnalise[], atendente: WaAtendente): string {
    const blocos: string[] = [];
    let total = 0;

    for (const a of analises) {
        const m = metricasDoAtendente(a, atendente);
        const metricasTexto = m
            ? `MÉTRICAS DO SISTEMA: ${m.conversas} conversas, ${m.mensagens} mensagens, ` +
              `${m.aguardandoResposta} conversas aguardando resposta` +
              (m.tempoRespostaMin !== null ? `, tempo médio de resposta ${m.tempoRespostaMin} min` : ', tempo médio de resposta não calculado')
            : 'MÉTRICAS DO SISTEMA: não disponíveis para este período.';

        const texto = a.relatorio.length > MAX_CHARS_POR_RELATORIO
            ? a.relatorio.slice(0, MAX_CHARS_POR_RELATORIO) + '\n(… relatório truncado …)'
            : a.relatorio;

        const bloco =
            `\n=== RELATÓRIO ${blocos.length + 1} — id: ${a.id} — Período: ${fmtData(a.periodo_inicio)} a ${fmtData(a.periodo_fim)} ` +
            `— Escopo: ${a.atendente_id ? 'somente este atendente' : 'todos os atendentes'} ===\n` +
            `${metricasTexto}\nTEXTO DO RELATÓRIO:\n${texto}\n`;

        if (total + bloco.length > MAX_CHARS_TOTAL) break;
        blocos.push(bloco);
        total += bloco.length;
    }

    return `ATENDENTE ANALISADO: ${atendenteNome}
RELATÓRIOS ENVIADOS: ${blocos.length} (do mais antigo para o mais recente)
${blocos.join('')}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Parse + sanitização da resposta da IA
// ─────────────────────────────────────────────────────────────────────────────

interface RespostaIA {
    periodos?: { id?: string; notas?: Partial<Notas>; destaque?: string; confianca?: string }[];
    resumo?: string;
    melhorias?: string[];
    regressoes?: string[];
    constantes?: string[];
    recomendacoes?: string[];
}

/** Extrai o objeto JSON da resposta da IA (tolera cercas de markdown). */
function parseRespostaIA(raw: string): RespostaIA {
    const cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) {
        throw new Error('A IA não retornou um JSON válido. Tente gerar novamente.');
    }
    return JSON.parse(cleaned.slice(start, end + 1)) as RespostaIA;
}

const clampNota = (v: unknown): number => {
    const n = Number(v);
    if (!isFinite(n)) return 0;
    return Math.round(Math.min(10, Math.max(0, n)) * 10) / 10;
};

const CHAVES_NOTAS = ['geral', ...CRITERIOS.map(c => c.key)] as const;

function sanitizeNotas(raw: Partial<Notas> | undefined): Notas {
    const notas = {} as Notas;
    CHAVES_NOTAS.forEach(k => { notas[k] = clampNota(raw?.[k]); });

    // "geral" ausente ou zerado: usa a média dos critérios para não furar o gráfico.
    if (!notas.geral) {
        const criterios = CRITERIOS.map(c => notas[c.key]).filter(n => n > 0);
        notas.geral = criterios.length
            ? Math.round((criterios.reduce((a, b) => a + b, 0) / criterios.length) * 10) / 10
            : 0;
    }
    return notas;
}

const sanitizeLista = (raw: unknown, max = 8): string[] =>
    Array.isArray(raw)
        ? raw.map(x => String(x || '').trim()).filter(Boolean).slice(0, max)
        : [];

function montarPontos(resposta: RespostaIA, analises: WaAnalise[], atendente: WaAtendente): EvolucaoPonto[] {
    const porId = new Map((resposta.periodos || []).map(p => [String(p.id || ''), p]));

    return analises
        .map((a, i) => {
            // Casa por id; se a IA trocou os ids, cai para a ordem enviada.
            const raw = porId.get(a.id) || (resposta.periodos || [])[i];
            if (!raw) return null;

            const notas = sanitizeNotas(raw.notas);
            if (!notas.geral) return null; // período sem base nenhuma de avaliação

            const confianca = (['alta', 'media', 'baixa'] as const).includes(raw.confianca as Confianca)
                ? (raw.confianca as Confianca)
                : 'media';

            return {
                analiseId: a.id,
                dataISO: a.periodo_fim,
                label: `${fmtCurto(a.periodo_inicio)} → ${fmtCurto(a.periodo_fim)}`,
                notas,
                destaque: String(raw.destaque || '').trim(),
                confianca,
                metricas: metricasDoAtendente(a, atendente),
            } satisfies EvolucaoPonto;
        })
        .filter((p): p is EvolucaoPonto => p !== null);
}

// ─────────────────────────────────────────────────────────────────────────────
// Cálculo do veredito (feito em código — o gráfico e o texto batem sempre)
// ─────────────────────────────────────────────────────────────────────────────

const LIMIAR_VEREDITO = 0.5;   // variação abaixo disso é considerada estabilidade

const media = (ns: number[]) => (ns.length ? ns.reduce((a, b) => a + b, 0) / ns.length : 0);
const arred = (n: number) => Math.round(n * 10) / 10;

function calcularResumo(pontos: EvolucaoPonto[]): EvolucaoResumo {
    const primeiro = pontos[0];
    const ultimo = pontos[pontos.length - 1];

    const meio = Math.ceil(pontos.length / 2);
    const primeiraMetade = pontos.slice(0, meio);
    const segundaMetade = pontos.length > 1 ? pontos.slice(-meio) : pontos;

    const mediaInicial = arred(media(primeiraMetade.map(p => p.notas.geral)));
    const mediaFinal = arred(media(segundaMetade.map(p => p.notas.geral)));

    const deltas = {} as Record<CriterioKey, number>;
    CRITERIOS.forEach(c => {
        deltas[c.key] = arred(ultimo.notas[c.key] - primeiro.notas[c.key]);
    });

    const deltaGeral = arred(ultimo.notas.geral - primeiro.notas.geral);
    // Combina o salto ponta-a-ponta com a média das metades para não deixar um
    // período atípico decidir sozinho o veredito.
    const tendencia = (deltaGeral + (mediaFinal - mediaInicial)) / 2;

    const comTempo = pontos.filter(p => p.metricas?.tempoRespostaMin != null);

    return {
        veredito: tendencia > LIMIAR_VEREDITO ? 'evoluiu' : tendencia < -LIMIAR_VEREDITO ? 'piorou' : 'estavel',
        notaInicial: primeiro.notas.geral,
        notaFinal: ultimo.notas.geral,
        deltaGeral,
        deltas,
        mediaInicial,
        mediaFinal,
        tempoRespostaInicial: comTempo.length ? comTempo[0].metricas!.tempoRespostaMin : null,
        tempoRespostaFinal: comTempo.length ? comTempo[comTempo.length - 1].metricas!.tempoRespostaMin : null,
        primeiroPeriodo: primeiro.label,
        ultimoPeriodo: ultimo.label,
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// Relatório em texto — montado a partir dos números já calculados
// ─────────────────────────────────────────────────────────────────────────────

const VEREDITO_TEXTO: Record<Veredito, string> = {
    evoluiu: 'EVOLUIU',
    piorou: 'PIOROU',
    estavel: 'ESTÁVEL',
};

const sinal = (n: number) => (n > 0 ? `+${arred(n)}` : `${arred(n)}`);

function montarRelatorio(
    atendenteNome: string,
    pontos: EvolucaoPonto[],
    resumo: EvolucaoResumo,
    resposta: RespostaIA,
): string {
    const secao = (titulo: string, itens: string[]) =>
        itens.length ? `\n${titulo}\n${itens.map(i => `• ${i}`).join('\n')}\n` : '';

    const linhaCriterios = CRITERIOS.map(c => {
        const p = pontos[0].notas[c.key];
        const u = pontos[pontos.length - 1].notas[c.key];
        return `• ${c.label}: ${p} → ${u} (${sinal(resumo.deltas[c.key])})`;
    }).join('\n');

    const linhaPeriodos = pontos
        .map(p => `• ${p.label}: nota ${p.notas.geral}` +
            (p.metricas?.tempoRespostaMin != null ? ` · resposta média ${p.metricas.tempoRespostaMin} min` : '') +
            (p.confianca === 'baixa' ? ' · (avaliação com pouca base)' : '') +
            (p.destaque ? `\n   ${p.destaque}` : ''))
        .join('\n');

    const tempo = resumo.tempoRespostaInicial != null && resumo.tempoRespostaFinal != null
        ? `\nTEMPO DE RESPOSTA\n• ${resumo.tempoRespostaInicial} min → ${resumo.tempoRespostaFinal} min ` +
          `(${sinal(resumo.tempoRespostaFinal - resumo.tempoRespostaInicial)} min · ` +
          `${resumo.tempoRespostaFinal <= resumo.tempoRespostaInicial ? 'mais rápido' : 'mais lento'})\n`
        : '';

    return `EVOLUÇÃO DO ATENDIMENTO — ${atendenteNome}
Relatórios comparados: ${pontos.length} (${resumo.primeiroPeriodo} até ${resumo.ultimoPeriodo})
Veredito: ${VEREDITO_TEXTO[resumo.veredito]} · nota geral ${resumo.notaInicial} → ${resumo.notaFinal} (${sinal(resumo.deltaGeral)})
Média do início do período: ${resumo.mediaInicial} · média do fim: ${resumo.mediaFinal}

RESUMO
${String(resposta.resumo || '').trim() || 'Sem leitura qualitativa retornada pela IA.'}

NOTAS POR CRITÉRIO (primeiro relatório → último)
${linhaCriterios}
${tempo}${secao('O QUE MELHOROU', sanitizeLista(resposta.melhorias))}${secao('O QUE PIOROU', sanitizeLista(resposta.regressoes))}${secao('PROBLEMAS QUE SE REPETEM', sanitizeLista(resposta.constantes))}${secao('RECOMENDAÇÕES', sanitizeLista(resposta.recomendacoes, 10))}
HISTÓRICO PERÍODO A PERÍODO
${linhaPeriodos}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Geração
// ─────────────────────────────────────────────────────────────────────────────

export interface GerarEvolucaoParams {
    atendenteId: string;
}

export async function gerarEvolucaoIA({ atendenteId }: GerarEvolucaoParams): Promise<WaEvolucao> {
    const atendentes = await listAtendentes();
    const atendente = atendentes.find(a => a.id === atendenteId);
    if (!atendente) throw new Error('Atendente não encontrado.');

    const nome = nomeDoAtendente(atendente);
    const todas = await listAnalisesDoAtendente(atendente);
    if (todas.length < 2) {
        throw new Error(
            `São necessários pelo menos 2 relatórios de "${nome}" para comparar a evolução. ` +
            'Gere mais relatórios na aba "Relatórios IA" (um por período) e volte aqui.',
        );
    }

    // Compara os mais recentes, mas mantém a ordem cronológica no gráfico.
    const analises = todas.slice(-MAX_RELATORIOS);

    const bruto = await generateContent(buildPrompt(nome, analises, atendente), SYSTEM_PROMPT_EVOLUCAO);
    if (!bruto?.trim()) throw new Error('A IA não retornou a análise de evolução.');

    const resposta = parseRespostaIA(bruto);
    const pontos = montarPontos(resposta, analises, atendente);
    if (pontos.length < 2) {
        throw new Error('A IA não conseguiu extrair notas comparáveis dos relatórios. Tente gerar novamente.');
    }

    const resumo = calcularResumo(pontos);
    const relatorio = montarRelatorio(nome, pontos, resumo, resposta);

    const registro = {
        atendente_id: atendente.id,
        atendente_nome: nome,
        relatorios_analisados: pontos.length,
        periodo_inicio: analises[0].periodo_inicio,
        periodo_fim: analises[analises.length - 1].periodo_fim,
        pontuacoes: pontos,
        resumo,
        relatorio,
    };

    const { data, error } = await supabase
        .from('SITE_WaAtendenteEvolucao')
        .insert(registro)
        .select()
        .single();

    if (error) {
        // Migração ainda não rodou: em vez de descartar a análise (e a chamada de
        // IA que ela custou), devolve o resultado para a tela avisando que é temporário.
        if (tabelaAusente(error)) {
            console.warn('[waEvolucao] tabela ausente — análise não persistida:', error.message);
            return {
                id: `local-${crypto.randomUUID()}`,
                ...registro,
                created_at: new Date().toISOString(),
                persistido: false,
            };
        }
        throw new Error('Análise gerada, mas falhou ao salvar: ' + error.message);
    }

    return { ...(data as WaEvolucao), persistido: true };
}

/** A tabela ainda não existe no banco (migração pendente)? */
function tabelaAusente(error: { code?: string; message?: string }): boolean {
    if (error.code === 'PGRST205' || error.code === '42P01') return true;
    const msg = (error.message || '').toLowerCase();
    return msg.includes('could not find the table') || msg.includes('does not exist');
}
