import { supabase } from './supabaseClient';
import { triggerWebhook } from './webhooks';
import { getLeadTrackingFields } from './tracking';
import { upsertLead } from './leadMatch';
import { rememberLeadContact, upsertPublicLead } from './publicLeads';
import { pushLead, type ConversionFunnel } from './dataLayer';

/**
 * Atendentes que recebem leads no rodizio automatico.
 *
 * Os IDs ficam fixos aqui porque as landing pages sao publicas (chave anon) e
 * SITE_Users nao e legivel pelo browser — a leitura da tabela exige sessao de
 * staff (ver lib/staffDirectory.ts). Espelha a flag receives_leads = true no
 * admin; ao ligar/desligar a flag de alguem, atualize esta lista tambem.
 */
export const LEAD_ATTENDANTS = [
    { id: '30c76614-3df4-47c5-89e7-6987b8328d8f', name: 'Christopher' },
    { id: '95cfe965-58f8-4f11-9449-464fabac15d9', name: 'Michael' },
    { id: '1a370d9a-8bd1-447e-85c0-82694770b089', name: 'Emerson' },
];

/**
 * Sorteia (aleatorio) um atendente para um lead novo.
 * Se a lista estiver vazia devolve null e o lead entra sem dono — nesse caso a
 * trigger auto_distribute_lead do banco assume a distribuicao.
 */
export const distributeLead = async (): Promise<string | null> => {
    if (LEAD_ATTENDANTS.length === 0) return null;
    const pick = LEAD_ATTENDANTS[Math.floor(Math.random() * LEAD_ATTENDANTS.length)];
    return pick.id;
};

interface LeadPayload {
    name: string;
    email?: string;
    phone: string;
    type?: string;
    status?: string;
    context_id?: string;
    tags?: string[];
    origin?: string;
    assigned_to?: string | null;
    [key: string]: any;
}

interface LeadUpsertOptions {
    /**
     * Conversão para GTM/Google Ads. Padrão: presencial Brasil (LPs dinâmicas
     * do painel). Quem chama de outro funil informa o próprio.
     */
    funnel?: ConversionFunnel;
    method?: 'form' | 'quiz' | 'whatsapp' | 'checkout';
    itemName?: string;
    /** `false` quando o chamador já publica o evento por conta própria. */
    trackConversion?: boolean;
}

/** Publica `generate_lead` para o GTM. Nunca lança — telemetria não trava o cadastro. */
const publicarLead = (payload: LeadPayload, leadId: string, options: LeadUpsertOptions) => {
    if (options.trackConversion === false) return;
    try {
        pushLead({
            funnel: options.funnel ?? 'presencial_brasil',
            method: options.method ?? 'form',
            item_name: options.itemName ?? payload.context_id ?? 'Lead',
            lead_id: leadId,
            user: { email: payload.email, phone: payload.phone, name: payload.name },
        });
    } catch (err) {
        console.error('[LeadUpsert] generate_lead não publicado (não-fatal):', err);
    }
};

/**
 * Handles Lead Creation or Update (Upsert Logic), regra em lib/leadMatch.ts.
 * - Se a pessoa ja existe: atualiza contexto/tags, MANTEM 'assigned_to' e
 *   MANTEM o status quando o lead ja esta ganho (Converted/Matriculated).
 * - If new: Inserts with provided or distributed 'assigned_to'.
 *
 * No painel fala direto com o banco (passe da equipe). Nas paginas publicas passa
 * pelo servidor, porque a chave anonima nao le SITE_Leads e o dedupe precisa ler.
 */
export const handleLeadUpsert = async (payload: LeadPayload, options: LeadUpsertOptions = {}) => {
    try {
        // Atribuição de tráfego (LEI 10): UTMs capturadas no navegador.
        const tracking = getLeadTrackingFields();

        // Se a pessoa ja tem ficha, o dono original prevalece sobre este sorteio.
        if (!payload.assigned_to) {
            payload.assigned_to = await distributeLead();
        }

        const naAreaDaEquipe = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');
        let action: 'created' | 'updated';
        let id: string;

        if (naAreaDaEquipe) {
            const result = await upsertLead(supabase, payload, tracking);
            action = result.action;
            id = result.id;
            await triggerWebhook('webhook_lead', result.written);
        } else {
            // O webhook de lead sai do servidor nesse caminho (api/_publicLeads.ts).
            ({ action, id } = await upsertPublicLead({ ...tracking, ...payload }));
            rememberLeadContact({ id, name: payload.name, email: payload.email, phone: payload.phone });
        }

        // Recadastro também é conversão de mídia: o clique pago que trouxe a
        // pessoa de volta precisa aparecer no Google Ads/GA4.
        publicarLead(payload, id, options);

        if (action === 'created') {
            // Automação: inscreve o lead NOVO nos fluxos de boas-vindas
            // (gatilho NovoCadastro). Não-fatal e fire-and-forget — nunca
            // atrapalha a criação do lead. Recadastros não entram de novo.
            import('./flows')
                .then(({ enrollContactInFlowsClient }) =>
                    enrollContactInFlowsClient({ email: payload.email, name: payload.name, triggerType: 'NovoCadastro' })
                )
                .catch(err => console.error('[LeadUpsert] Enroll NovoCadastro falhou (não-fatal):', err));
        }

        return { action, id };

    } catch (error) {
        console.error("[LeadUpsert] Error:", error);
        throw error;
    }
};

