import type { SupabaseClient } from '@supabase/supabase-js';
import { getServiceClient } from './_report.js';
import { buildSectorDataPack, type SectorDataPack } from './_aiSectorData.js';
import { loadAIKeys, loadAIConfig, callLLM } from './_aiReply.js';
import { sendWhatsAppText } from './_whatsapp.js';
import {
    AI_AGENTS,
    AI_AGENT_BY_ID,
    DEFAULT_AGENT_PROMPTS,
    AGENT_GUARDRAILS,
    AGENT_REPLY_PREFIXES,
    CFG_GROUP_BOT_ENABLED,
    CFG_GROUP_BOT_GROUP_JID,
    CFG_GROUP_BOT_INSTANCE,
    CFG_GROUP_WEBHOOK_TOKEN,
    offlineModel,
    type AIAgentId,
} from '../lib/aiAgentDefaults.js';

/**
 * Bot de perguntas do grupo do WhatsApp — Assistentes de IA (Léo/Bia/Rita/Sofia).
 * Arquivo com prefixo "_" — helper compartilhado (não vira rota na Vercel).
 *
 * Fluxo: Evolution API → webhook (multiplexado em /api/whatsapp-cloud-webhook
 * ?source=evolution&token=…) → handleEvolutionWebhook → answerGroupQuestion →
 * resposta no próprio grupo com a persona certa.
 *
 * Padrões herdados do MotoFix (skill whatsapp-evolution): detecção de grupo por
 * remoteJid @g.us, anti-loop por fromMe + prefixo de persona, dedupe por
 * message_id, e SEMPRE responder 200 ao webhook (evita loop de reentrega).
 */

interface GroupBotConfig {
    enabled: boolean;
    groupJid: string;
    instance?: string;
    webhookToken: string;
    prompts: Record<AIAgentId, string>;
}

export interface GroupAnswer {
    agent: AIAgentId | 'silencio';
    answer: string | null;
    sent: boolean;
    error?: string;
}

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
    return Promise.race([
        p,
        new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`${label} excedeu ${ms}ms`)), ms)),
    ]);
}

async function loadGroupBotConfig(supabase: SupabaseClient): Promise<GroupBotConfig> {
    const keys = [
        CFG_GROUP_BOT_ENABLED, CFG_GROUP_BOT_GROUP_JID, CFG_GROUP_BOT_INSTANCE, CFG_GROUP_WEBHOOK_TOKEN,
        'wa_report_group_jid', 'wa_instance_report', 'automation_whatsapp_instance',
        ...AI_AGENTS.map((a) => a.promptKey),
    ];
    const { data } = await supabase.from('SITE_Config').select('key, value').in('key', keys);
    const map: Record<string, string> = {};
    (data || []).forEach((c: any) => (map[c.key] = c.value));

    const prompts = {} as Record<AIAgentId, string>;
    AI_AGENTS.forEach((a) => {
        prompts[a.id] = (map[a.promptKey] || '').trim() || DEFAULT_AGENT_PROMPTS[a.id];
    });

    return {
        enabled: map[CFG_GROUP_BOT_ENABLED] === 'true',
        groupJid: (map[CFG_GROUP_BOT_GROUP_JID] || map['wa_report_group_jid'] || '').trim(),
        instance:
            (map[CFG_GROUP_BOT_INSTANCE] || '').trim() ||
            (map['wa_instance_report'] || '').trim() ||
            (map['automation_whatsapp_instance'] || '').trim() ||
            undefined,
        webhookToken: (map[CFG_GROUP_WEBHOOK_TOKEN] || '').trim(),
        prompts,
    };
}

// ─── Data pack: contexto de dados vivos dirigido pela pergunta ───────────────

/**
 * Monta o contexto que o LLM usa para responder — delegado ao módulo setorial
 * (_aiSectorData.ts): detecta o(s) setor(es) da pergunta, coleta as tabelas
 * daquele setor e os registros exatos das entidades citadas (aluno, lead,
 * funcionário, curso). Fonte ÚNICA: banco Supabase — sem internet.
 */
export async function buildDataPack(supabase: SupabaseClient, question: string): Promise<SectorDataPack> {
    return buildSectorDataPack(supabase, question);
}

// ─── Pergunta → persona certa → resposta ─────────────────────────────────────

function buildSystemPrompt(prompts: Record<AIAgentId, string>): string {
    const sections = AI_AGENTS.map((a) => {
        return `### ${a.emoji} ${a.name} (id: ${a.id}) — ${a.role}\nResponde sobre: ${a.domain}.\n${prompts[a.id]}`;
    }).join('\n\n');

    return `Você é a equipe de Assistentes de IA da W-Tech Brasil dentro de um grupo de WhatsApp da gestão. A equipe tem 4 integrantes:

${sections}

${AGENT_GUARDRAILS}

COMO RESPONDER (formato obrigatório):
- Escolha UM integrante conforme o domínio da pergunta (financeiro → rita; atendimento/CRM/WhatsApp/tarefas/leads → bia; inscrições/matrículas/alunos/turmas/credenciamento → leo; visão geral/RH/equipe/funcionários/misto/gerencial → sofia). Use o(s) SETOR(ES) DETECTADO(S) informados junto com a pergunta como orientação principal.
- Primeira linha: "AGENTE: <id>" (leo, bia, rita ou sofia).
- Da segunda linha em diante: a resposta daquele integrante, na persona dele.
- Se a mensagem NÃO for uma pergunta ou solicitação sobre o negócio (ex.: conversa casual entre humanos, cumprimentos, piadas internas), responda apenas: SILENCIO`;
}

function parseLLMReply(raw: string): { agent: AIAgentId | 'silencio'; answer: string | null } {
    const text = (raw || '').trim();
    if (!text || /^silencio\.?$/i.test(text)) return { agent: 'silencio', answer: null };

    const match = text.match(/^\s*AGENTE\s*:\s*(leo|bia|rita|sofia)\s*\n?/i);
    if (match) {
        const agent = match[1].toLowerCase() as AIAgentId;
        const answer = text.slice(match[0].length).trim();
        if (!answer || /^silencio\.?$/i.test(answer)) return { agent: 'silencio', answer: null };
        return { agent, answer };
    }
    // LLM fugiu do formato — Sofia (gerente geral) assume a resposta.
    return { agent: 'sofia', answer: text };
}

/**
 * Responde uma pergunta do grupo. dryRun = não envia no WhatsApp (sandbox).
 * Sempre best-effort: devolve { error } em vez de lançar.
 */
export async function answerGroupQuestion(
    question: string,
    senderName: string,
    opts: { dryRun?: boolean; messageId?: string; groupJid?: string; instance?: string } = {}
): Promise<GroupAnswer> {
    const supabase = getServiceClient();
    try {
        const cfg = await loadGroupBotConfig(supabase);
        const groupJid = (opts.groupJid || cfg.groupJid).trim();

        const dataPack = await buildDataPack(supabase, question);
        const system = buildSystemPrompt(cfg.prompts);
        const user =
            `CONTEXTO DE DADOS (JSON extraído AGORA do banco de dados do sistema W-Tech — fonte ÚNICA e obrigatória; fora dele, nada existe):\n${dataPack.json}\n\n` +
            `SETOR(ES) DETECTADO(S) NA PERGUNTA: ${dataPack.sectors.join(', ')}\n\n` +
            `Mensagem de ${senderName || 'membro do grupo'} no grupo:\n"${question}"`;

        // Provider/model: respeita o override configurado no treinamento da IA,
        // mas SEM acesso à web (remove variantes ':online' do OpenRouter).
        const aiCfg = await loadAIConfig(supabase).catch(() => null);
        const keys = await loadAIKeys(supabase, aiCfg?.provider || null);
        const raw = await withTimeout(callLLM(keys, system, user, offlineModel(aiCfg?.model)), 45000, 'LLM grupo');

        const { agent, answer } = parseLLMReply(raw);

        // Log/histórico ANTES do envio (best-effort): se o envio falhar ou a
        // função for abortada no meio, a decisão fica registrada e visível no
        // painel — e a reentrega da Evolution não reprocessa (anti-duplicata).
        try {
            if (opts.messageId) {
                await supabase
                    .from('SITE_AIGroupLog')
                    .update({ agent, answer })
                    .eq('message_id', opts.messageId);
            } else {
                await supabase.from('SITE_AIGroupLog').insert({
                    message_id: null,
                    group_jid: groupJid || null,
                    sender_name: senderName || 'Sandbox',
                    question,
                    agent,
                    answer,
                });
            }
        } catch (e: any) {
            console.error('[aiGroupBot] log:', e?.message);
        }

        let sent = false;
        if (!opts.dryRun && answer && agent !== 'silencio' && groupJid) {
            try {
                const meta = AI_AGENT_BY_ID[agent];
                const result = await sendWhatsAppText(groupJid, `${meta.emoji} *${meta.name}:* ${answer}`, cfg.instance || opts.instance);
                sent = result.sent;
                if (!sent) console.error('[aiGroupBot] envio falhou:', result.error || result.skipped);
            } catch (e: any) {
                console.error('[aiGroupBot] envio:', e?.message);
            }
        }

        return { agent, answer, sent };
    } catch (e: any) {
        console.error('[aiGroupBot] answerGroupQuestion:', e?.message);
        // Registra o erro no histórico (só se ainda não há resposta) para o
        // painel mostrar POR QUE a pergunta ficou sem resposta no grupo.
        if (opts.messageId) {
            try {
                await supabase
                    .from('SITE_AIGroupLog')
                    .update({ agent: 'silencio', answer: `[erro] ${e?.message || 'falha desconhecida'}` })
                    .eq('message_id', opts.messageId)
                    .is('answer', null);
            } catch { /* best-effort */ }
        }
        return { agent: 'silencio', answer: null, sent: false, error: e?.message };
    }
}

// ─── Webhook Evolution (multiplexado em /api/whatsapp-cloud-webhook) ─────────

/** Extrai o texto de um message da Evolution/Baileys (formatos mais comuns). */
function extractText(message: any): string {
    if (!message) return '';
    return (
        message.conversation ||
        message.extendedTextMessage?.text ||
        message.ephemeralMessage?.message?.conversation ||
        message.ephemeralMessage?.message?.extendedTextMessage?.text ||
        ''
    );
}

/**
 * Processa o POST vindo da Evolution API. Sempre responde 200 (mesmo em erro/
 * descarte) para a Evolution não reentregar em loop.
 */
export async function handleEvolutionWebhook(req: any, res: any): Promise<any> {
    const ok = (extra: Record<string, any> = {}) => res.status(200).json({ received: true, ...extra });

    try {
        const supabase = getServiceClient();
        const cfg = await loadGroupBotConfig(supabase);

        // Segurança: o token gerado no painel precisa bater com o da URL.
        const token = String(req.query?.token || '').trim();
        if (!cfg.webhookToken || token !== cfg.webhookToken) {
            console.warn('[aiGroupBot] webhook com token inválido — descartado.');
            return ok({ skipped: 'invalid token' });
        }

        if (!cfg.enabled) return ok({ skipped: 'bot desativado' });
        if (!cfg.groupJid) return ok({ skipped: 'grupo não configurado' });

        const body = req.body || {};
        const event = String(body.event || '').toLowerCase().replace(/_/g, '.');
        if (event !== 'messages.upsert') return ok({ skipped: `evento ${event || 'desconhecido'}` });

        // Evolution v1 pode mandar data como array; v2 manda objeto único.
        const items: any[] = Array.isArray(body.data) ? body.data : [body.data].filter(Boolean);

        for (const item of items) {
            const key = item?.key || {};
            const remoteJid = String(key.remoteJid || '');
            const messageId = String(key.id || '');
            const senderName = String(item?.pushName || '').trim();
            const text = extractText(item?.message).trim();

            if (remoteJid !== cfg.groupJid) continue;          // só o grupo configurado
            if (!text) continue;                               // só texto
            // Anti-loop (SEM filtrar fromMe): a instância conectada também é
            // dono do sistema e frequentemente é QUEM pergunta no grupo — então
            // fromMe precisa ser respondido. O que NUNCA pode ser respondido são
            // as mensagens automáticas que a própria instância dispara no grupo:
            // as respostas das personas (emoji *Nome:*) e o relatório diário (🤖).
            // Esses prefixos + o dedupe por message_id abaixo garantem o anti-loop.
            if (AGENT_REPLY_PREFIXES.some((p) => text.startsWith(p)) || text.startsWith('🤖')) continue;

            // Dedupe de reentrega: insere o message_id; conflito = já visto.
            if (messageId) {
                const { error } = await supabase.from('SITE_AIGroupLog').insert({
                    message_id: messageId,
                    group_jid: remoteJid,
                    sender_name: senderName,
                    question: text,
                });
                if (error) {
                    if (error.code === '23505') {
                        // Já vimos essa mensagem. Se a tentativa anterior morreu no
                        // meio (função abortada/timeout → agent e answer nulos),
                        // a reentrega ganha uma segunda chance; senão, ignora.
                        const { data: prev } = await supabase
                            .from('SITE_AIGroupLog')
                            .select('agent, answer')
                            .eq('message_id', messageId)
                            .maybeSingle();
                        if (prev && (prev.agent || prev.answer)) continue; // já respondido
                    } else {
                        // Tabela ausente ou outro erro: segue sem dedupe (prefixos de persona protegem do loop).
                        console.error('[aiGroupBot] dedupe indisponível:', error.message);
                    }
                }
            }

            await answerGroupQuestion(text, senderName, { messageId: messageId || undefined, groupJid: remoteJid });
        }

        return ok();
    } catch (e: any) {
        console.error('[aiGroupBot] webhook:', e?.message);
        return ok({ error: e?.message });
    }
}
