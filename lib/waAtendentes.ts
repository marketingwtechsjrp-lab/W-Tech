import { supabase } from './supabaseClient';
import { generateContent } from './ai';
import {
    EvolutionStaffError,
    evolutionCheckAttendantWebhook,
    evolutionConnect,
    evolutionCreate,
    evolutionDelete,
    evolutionInstanceInfo,
    evolutionLogout,
    evolutionRegisterAttendantWebhook,
    evolutionStatus,
} from './evolutionStaff';

/**
 * Atendentes WhatsApp — espelho de conversas + análise por IA.
 *
 * Cada atendente tem uma instância própria na Evolution API (w-tech-atendente-N).
 * O webhook (rota Express `/api/wa-atendentes-webhook`) grava TODAS as
 * mensagens enviadas/recebidas em SITE_WaAtendenteMensagens. Este módulo:
 *   1. gerencia o ciclo de vida das instâncias (criar / QR / status / desconectar);
 *   2. registra o webhook de sincronização (idempotente — re-registra ao conectar);
 *   3. lê conversas/mensagens para o monitor do admin;
 *   4. gera o relatório de qualidade de atendimento com a IA (lib/ai.ts).
 *
 * A IA NUNCA envia nada no WhatsApp — é análise passiva, sob demanda.
 * A gestão das instâncias passa pelo boundary staff do servidor; URL e chave
 * da Evolution nunca chegam ao navegador.
 */

export const ATENDENTE_SLOTS = [1, 2, 3, 4, 5] as const;
export const defaultInstanceName = (slot: number) => `w-tech-atendente-${slot}`;

export interface WaAtendente {
    id: string;
    slot: number;
    nome: string;
    instance_name: string | null;
    phone: string | null;
    status: string;
    last_event_at: string | null;
}

export interface WaChatResumo {
    chat_jid: string;
    chat_name: string | null;
    last_body: string | null;
    last_tipo: string;
    last_from_me: boolean;
    last_ts: string;
    msg_count: number;
}

export interface WaMensagem {
    id: string;
    atendente_id: string;
    chat_jid: string;
    chat_name: string | null;
    from_me: boolean;
    participant: string | null;
    tipo: string;
    body: string | null;
    timestamp: string;
}

export interface WaAnalise {
    id: string;
    atendente_id: string | null;
    atendente_nome: string | null;
    periodo_inicio: string;
    periodo_fim: string;
    stats: Record<string, any> | null;
    relatorio: string;
    created_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Evolution API — ciclo de vida via boundary staff autenticado
// ─────────────────────────────────────────────────────────────────────────────

function evolutionError(error: unknown, fallback: string): string {
    if (!(error instanceof EvolutionStaffError)) return fallback;
    if (error.code === 'evolution_not_configured') {
        return 'Servidor Evolution não configurado (Configurações → Integrações).';
    }
    if (error.code === 'network_error') return 'Não foi possível acessar o servidor do sistema.';
    if (error.code === 'evolution_timeout') return 'O servidor Evolution demorou demais para responder.';
    if (error.code === 'invalid_instance') return 'O nome da instância é inválido.';
    if (error.status === 401 || error.status === 403) return 'Você não tem permissão para gerenciar esta instância.';
    return fallback;
}

/**
 * Registra webhook + settings na instância (idempotente — chamar sempre que conectar).
 * Flags críticas validadas em produção: `webhookByEvents:false` (nome EXATO da
 * chave) e `groupsIgnore:false` (senão mensagens de grupo somem).
 */
export async function registerAtendenteWebhook(instanceName: string): Promise<{ ok: boolean; error?: string }> {
    try {
        const result = await evolutionRegisterAttendantWebhook(instanceName);
        return result.pointsHere
            ? { ok: true }
            : { ok: false, error: 'O webhook não pôde ser confirmado nesta instância.' };
    } catch (error) {
        return { ok: false, error: evolutionError(error, 'Falha ao registrar webhook.') };
    }
}

/** Cria a instância na Evolution (ou reaproveita se já existir) e registra o webhook. */
export async function createAtendenteInstance(instanceName: string): Promise<{ ok: boolean; qr?: string | null; error?: string }> {
    try {
        const created = await evolutionCreate('attendant', instanceName);

        const webhook = await registerAtendenteWebhook(instanceName);
        if (!webhook.ok) return { ok: false, error: webhook.error };

        return { ok: true, qr: created.qr || null };
    } catch (error) {
        return { ok: false, error: evolutionError(error, 'Erro ao criar instância.') };
    }
}

/** Busca o QR Code de conexão (re-registrando o webhook — auto-heal). */
export async function connectAtendenteInstance(instanceName: string): Promise<{ ok: boolean; qr?: string | null; state?: string; error?: string }> {
    // Auto-heal best-effort, como antes: uma falha de webhook não impede que o
    // operador recupere o QR e reconecte a instância.
    await registerAtendenteWebhook(instanceName);

    try {
        const connected = await evolutionConnect('attendant', instanceName);
        if (connected.qr) return { ok: true, qr: connected.qr };
        if (connected.state === 'open') return { ok: true, qr: null, state: 'open' };
        return { ok: false, error: 'Não foi possível obter o QR Code. Crie a instância primeiro.' };
    } catch (error) {
        return { ok: false, error: evolutionError(error, 'Não foi possível obter o QR Code.') };
    }
}

/** Estado real da instância na Evolution (normalizado). */
export async function getAtendenteConnectionState(instanceName: string): Promise<string> {
    try {
        const result = await evolutionStatus('attendant', instanceName);
        return result.state;
    } catch {
        return 'error';
    }
}

/**
 * Confere para ONDE a instância está mandando os eventos.
 * Uma instância pode estar "Conectada" e mesmo assim não sincronizar nada, se o
 * webhook aponta para outro domínio — foi o que aconteceu entre 15/07 e 31/07 de
 * 2026, quando as 4 instâncias continuaram entregando no Supabase antigo.
 * Retorna null quando não dá para checar (sem config / falha de rede).
 */
export async function checkAtendenteWebhook(instanceName: string): Promise<{ url: string | null; aponta_para_ca: boolean } | null> {
    try {
        const result = await evolutionCheckAttendantWebhook(instanceName);
        // A URL contém o token do webhook e, por isso, não volta ao navegador.
        return { url: null, aponta_para_ca: result.pointsHere };
    } catch {
        return null;
    }
}

/** Número (ownerJid) da instância conectada — para exibir qual WhatsApp está pareado. */
export async function fetchAtendentePhone(instanceName: string): Promise<string | null> {
    try {
        const result = await evolutionInstanceInfo('attendant', instanceName);
        return result.phone;
    } catch {
        return null;
    }
}

/** Desconecta o WhatsApp (mantém a instância — dá para reconectar com novo QR). */
export async function logoutAtendenteInstance(instanceName: string): Promise<{ ok: boolean; error?: string }> {
    try {
        await evolutionLogout('attendant', instanceName);
        return { ok: true };
    } catch (error) {
        return { ok: false, error: evolutionError(error, 'Não foi possível desconectar a instância.') };
    }
}

/** Apaga a instância do servidor Evolution (as mensagens já espelhadas ficam no banco). */
export async function deleteAtendenteInstance(instanceName: string): Promise<{ ok: boolean; error?: string }> {
    try {
        await evolutionDelete('attendant', instanceName);
        return { ok: true };
    } catch (error) {
        return { ok: false, error: evolutionError(error, 'Não foi possível apagar a instância.') };
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Banco — atendentes, conversas, mensagens, análises
// ─────────────────────────────────────────────────────────────────────────────

export async function listAtendentes(): Promise<WaAtendente[]> {
    const { data, error } = await supabase
        .from('SITE_WaAtendentes')
        .select('*')
        .order('slot', { ascending: true });
    if (error) {
        console.error('[waAtendentes] listAtendentes:', error.message);
        return [];
    }
    return (data || []) as WaAtendente[];
}

export async function updateAtendente(id: string, patch: Partial<Pick<WaAtendente, 'nome' | 'instance_name' | 'phone' | 'status'>>): Promise<boolean> {
    const { error } = await supabase
        .from('SITE_WaAtendentes')
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq('id', id);
    if (error) console.error('[waAtendentes] updateAtendente:', error.message);
    return !error;
}

export async function listChats(atendenteId: string): Promise<WaChatResumo[]> {
    const { data, error } = await supabase.rpc('wa_atendente_chats', { p_atendente: atendenteId });
    if (error) {
        console.error('[waAtendentes] listChats:', error.message);
        return [];
    }
    return (data || []) as WaChatResumo[];
}

export async function listMessages(atendenteId: string, chatJid: string, limit = 500): Promise<WaMensagem[]> {
    const { data, error } = await supabase
        .from('SITE_WaAtendenteMensagens')
        .select('id, atendente_id, chat_jid, chat_name, from_me, participant, tipo, body, timestamp')
        .eq('atendente_id', atendenteId)
        .eq('chat_jid', chatJid)
        .order('timestamp', { ascending: false })
        .limit(limit);
    if (error) {
        console.error('[waAtendentes] listMessages:', error.message);
        return [];
    }
    return ((data || []) as WaMensagem[]).reverse();
}

export async function listAnalises(limit = 30): Promise<WaAnalise[]> {
    const { data, error } = await supabase
        .from('SITE_WaAtendenteAnalises')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
    if (error) {
        console.error('[waAtendentes] listAnalises:', error.message);
        return [];
    }
    return (data || []) as WaAnalise[];
}

export async function deleteAnalise(id: string): Promise<boolean> {
    const { error } = await supabase.from('SITE_WaAtendenteAnalises').delete().eq('id', id);
    return !error;
}

// ─────────────────────────────────────────────────────────────────────────────
// Relatório de IA — métricas determinísticas + análise qualitativa
// ─────────────────────────────────────────────────────────────────────────────

const MAX_MSGS_QUERY = 8000;      // teto de mensagens puxadas do banco por relatório
const MAX_MSGS_POR_CHAT = 60;     // últimas N mensagens de cada conversa no transcript
const MAX_TRANSCRIPT_CHARS = 150_000;
const MAX_RESPOSTA_VALIDA_MS = 12 * 60 * 60 * 1000; // deltas acima disso não contam no tempo médio

export interface AtendenteStats {
    atendente: string;
    total: number;
    enviadas: number;
    recebidas: number;
    conversas: number;
    aguardandoResposta: number;   // conversas cuja última mensagem é do cliente
    tempoMedioRespostaMin: number | null;
}

interface PeriodoMsg extends WaMensagem { }

async function fetchMessagesForPeriod(atendenteIds: string[], fromISO: string, toISO: string): Promise<PeriodoMsg[]> {
    const { data, error } = await supabase
        .from('SITE_WaAtendenteMensagens')
        .select('id, atendente_id, chat_jid, chat_name, from_me, participant, tipo, body, timestamp')
        .in('atendente_id', atendenteIds)
        .gte('timestamp', fromISO)
        .lte('timestamp', toISO)
        .order('timestamp', { ascending: true })
        .limit(MAX_MSGS_QUERY);
    if (error) throw new Error('Falha ao buscar mensagens: ' + error.message);
    return (data || []) as PeriodoMsg[];
}

function computeStats(msgs: PeriodoMsg[], nomePorAtendente: Record<string, string>): AtendenteStats[] {
    const porAtendente = new Map<string, PeriodoMsg[]>();
    msgs.forEach(m => {
        const list = porAtendente.get(m.atendente_id) || [];
        list.push(m);
        porAtendente.set(m.atendente_id, list);
    });

    const stats: AtendenteStats[] = [];
    porAtendente.forEach((list, atendenteId) => {
        const chats = new Map<string, PeriodoMsg[]>();
        list.forEach(m => {
            const c = chats.get(m.chat_jid) || [];
            c.push(m);
            chats.set(m.chat_jid, c);
        });

        let aguardando = 0;
        const deltas: number[] = [];
        chats.forEach(chatMsgs => {
            const last = chatMsgs[chatMsgs.length - 1];
            if (last && !last.from_me) aguardando++;

            // tempo entre mensagem do cliente e a resposta seguinte do atendente
            let pendenteDesde: number | null = null;
            chatMsgs.forEach(m => {
                const ts = new Date(m.timestamp).getTime();
                if (!m.from_me) {
                    if (pendenteDesde === null) pendenteDesde = ts;
                } else if (pendenteDesde !== null) {
                    const delta = ts - pendenteDesde;
                    if (delta > 0 && delta <= MAX_RESPOSTA_VALIDA_MS) deltas.push(delta);
                    pendenteDesde = null;
                }
            });
        });

        const enviadas = list.filter(m => m.from_me).length;
        stats.push({
            atendente: nomePorAtendente[atendenteId] || 'Atendente',
            total: list.length,
            enviadas,
            recebidas: list.length - enviadas,
            conversas: chats.size,
            aguardandoResposta: aguardando,
            tempoMedioRespostaMin: deltas.length
                ? Math.round(deltas.reduce((a, b) => a + b, 0) / deltas.length / 60000)
                : null,
        });
    });

    return stats.sort((a, b) => a.atendente.localeCompare(b.atendente));
}

const fmtHora = (iso: string) =>
    new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

function linhaMsg(m: PeriodoMsg): string {
    const autor = m.from_me ? 'ATENDENTE' : 'Cliente';
    const conteudo = m.tipo === 'text' ? (m.body || '') : `[${m.tipo}]${m.body ? ' ' + m.body : ''}`;
    return `[${fmtHora(m.timestamp)}] ${autor}: ${conteudo}`;
}

function buildTranscript(msgs: PeriodoMsg[], nomePorAtendente: Record<string, string>): { texto: string; conversasIncluidas: number; conversasOmitidas: number } {
    // agrupa por atendente + conversa, mais recentes primeiro
    const grupos = new Map<string, PeriodoMsg[]>();
    msgs.forEach(m => {
        const key = `${m.atendente_id}::${m.chat_jid}`;
        const list = grupos.get(key) || [];
        list.push(m);
        grupos.set(key, list);
    });

    const ordenados = Array.from(grupos.entries()).sort((a, b) => {
        const lastA = new Date(a[1][a[1].length - 1].timestamp).getTime();
        const lastB = new Date(b[1][b[1].length - 1].timestamp).getTime();
        return lastB - lastA;
    });

    let texto = '';
    let incluidas = 0;
    for (const [key, chatMsgs] of ordenados) {
        const atendenteId = key.split('::')[0];
        const recorte = chatMsgs.slice(-MAX_MSGS_POR_CHAT);
        const contato = recorte.find(m => m.chat_name)?.chat_name
            || (recorte[0].chat_jid.endsWith('@g.us') ? 'Grupo' : recorte[0].chat_jid.split('@')[0]);

        let bloco = `\n=== CONVERSA ${incluidas + 1} — Contato: ${contato} — Atendente: ${nomePorAtendente[atendenteId] || '?'} ===\n`;
        if (chatMsgs.length > recorte.length) bloco += `(… ${chatMsgs.length - recorte.length} mensagens anteriores omitidas …)\n`;
        bloco += recorte.map(linhaMsg).join('\n') + '\n';

        if (texto.length + bloco.length > MAX_TRANSCRIPT_CHARS) break;
        texto += bloco;
        incluidas++;
    }

    return { texto, conversasIncluidas: incluidas, conversasOmitidas: ordenados.length - incluidas };
}

const SYSTEM_PROMPT_AUDITORIA = `Você é um auditor sênior de qualidade de atendimento ao cliente via WhatsApp da W-Tech Brasil (empresa de suspensões de motos, cursos técnicos e produtos para motociclistas).

Você receberá métricas e as transcrições reais das conversas dos atendentes com clientes. Sua função é APENAS analisar — você não interage com ninguém.

Produza um RELATÓRIO GERENCIAL em português do Brasil, direto e honesto, no seguinte formato de TEXTO SIMPLES (sem markdown, sem asteriscos):

RESUMO EXECUTIVO
(3-6 frases: visão geral do período, qualidade geral do atendimento, principais alertas)

AVALIAÇÃO POR ATENDENTE
(para cada atendente presente nos dados: nota geral de 0 a 10 e notas de 0 a 10 para: Cordialidade, Agilidade, Clareza técnica, Aproveitamento comercial, Resolução — cada uma com justificativa de 1 linha)

PONTOS FORTES
(lista com •)

PROBLEMAS E RISCOS
(lista com • — cite trechos reais entre aspas com o nome do contato quando apontar um problema: demora, grosseria, informação errada, cliente ignorado, promessa não cumprida)

OPORTUNIDADES PERDIDAS
(lista com • — vendas não aproveitadas, falta de follow-up, clientes quentes abandonados)

RECOMENDAÇÕES PRÁTICAS
(lista numerada com ações concretas para melhorar o atendimento, da mais urgente para a menos urgente)

Regras:
- Baseie-se SOMENTE no que está nas transcrições e métricas; não invente.
- Mensagens marcadas como [image], [audio], [video] etc. são mídias cujo conteúdo você não vê — considere apenas o contexto.
- Se houver poucos dados para avaliar algum critério, diga isso explicitamente.`;

export interface GerarRelatorioParams {
    /** null = todos os atendentes conectados */
    atendenteId: string | null;
    fromISO: string;
    toISO: string;
}

export async function gerarRelatorioIA(params: GerarRelatorioParams): Promise<WaAnalise> {
    const atendentes = await listAtendentes();
    const alvo = params.atendenteId
        ? atendentes.filter(a => a.id === params.atendenteId)
        : atendentes.filter(a => a.instance_name);
    if (!alvo.length) throw new Error('Nenhum atendente selecionado.');

    const nomePorAtendente: Record<string, string> = {};
    alvo.forEach(a => { nomePorAtendente[a.id] = a.nome || `Atendente ${a.slot}`; });

    const msgs = await fetchMessagesForPeriod(alvo.map(a => a.id), params.fromISO, params.toISO);
    if (!msgs.length) throw new Error('Nenhuma mensagem sincronizada no período selecionado.');

    const stats = computeStats(msgs, nomePorAtendente);
    const { texto: transcript, conversasIncluidas, conversasOmitidas } = buildTranscript(msgs, nomePorAtendente);

    const statsTexto = stats.map(s =>
        `- ${s.atendente}: ${s.conversas} conversas, ${s.total} mensagens (${s.enviadas} enviadas / ${s.recebidas} recebidas), ` +
        `${s.aguardandoResposta} conversas aguardando resposta` +
        (s.tempoMedioRespostaMin !== null ? `, tempo médio de resposta ${s.tempoMedioRespostaMin} min` : '')
    ).join('\n');

    const periodoLabel = `${new Date(params.fromISO).toLocaleDateString('pt-BR')} a ${new Date(params.toISO).toLocaleDateString('pt-BR')}`;
    const prompt = `PERÍODO ANALISADO: ${periodoLabel}

MÉTRICAS DO PERÍODO (calculadas pelo sistema):
${statsTexto}

CONVERSAS INCLUÍDAS NA ANÁLISE: ${conversasIncluidas}${conversasOmitidas > 0 ? ` (${conversasOmitidas} conversas mais antigas omitidas por limite de tamanho)` : ''}

TRANSCRIÇÕES:
${transcript}`;

    const relatorio = await generateContent(prompt, SYSTEM_PROMPT_AUDITORIA);
    if (!relatorio?.trim()) throw new Error('A IA não retornou o relatório.');

    const atendenteNome = params.atendenteId
        ? nomePorAtendente[params.atendenteId]
        : 'Todos os atendentes';

    const registro = {
        atendente_id: params.atendenteId,
        atendente_nome: atendenteNome,
        periodo_inicio: params.fromISO,
        periodo_fim: params.toISO,
        stats: { porAtendente: stats, conversasIncluidas, conversasOmitidas, totalMensagens: msgs.length },
        relatorio: relatorio.trim(),
    };

    const { data, error } = await supabase
        .from('SITE_WaAtendenteAnalises')
        .insert(registro)
        .select()
        .single();
    if (error) throw new Error('Relatório gerado, mas falhou ao salvar: ' + error.message);

    return data as WaAnalise;
}
