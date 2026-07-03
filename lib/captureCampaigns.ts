/**
 * Campanhas de Captura — camada de dados compartilhada entre o painel
 * (Marketing Hub → Captura) e a página pública (/captura/:slug).
 *
 * Regra central: leads capturados ficam ISOLADOS em SITE_CaptureLeads,
 * vinculados à campanha. Só entram no CRM (SITE_Leads) quando enviados
 * manualmente pelo painel, em lote, via sendCaptureLeadsToCrm().
 */
import { supabase } from './supabaseClient';
import { handleLeadUpsert } from './leadDistribution';
import { getLeadTrackingFields } from './tracking';

// ─── Tipos ───────────────────────────────────────────────────────────────────

export type CaptureCampaignType = 'quiz' | 'enquete' | 'formulario';
export type CaptureCampaignStatus = 'draft' | 'active' | 'ended';
export type CaptureCampaignTemplate =
    | 'lp_captura'
    | 'simples'
    | 'venda_produto'
    | 'lancamento_curso'
    | 'lancamento_produto'
    | 'ferramenta';

export interface CaptureCampaignConfig {
    headline?: string;
    subheadline?: string;
    question?: string;
    options?: string[];
    gamification?: 'race' | 'none';
    cta?: string;
    success_message?: string;
}

export interface CaptureCampaign {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    type: CaptureCampaignType;
    template: CaptureCampaignTemplate;
    status: CaptureCampaignStatus;
    config: CaptureCampaignConfig;
    ends_at: string | null;
    sent_to_crm_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface CaptureLead {
    id: string;
    campaign_id: string;
    name: string;
    email: string | null;
    phone: string;
    answer: { vote?: string };
    consent: boolean;
    utm_source: string | null;
    utm_medium: string | null;
    utm_campaign: string | null;
    utm_content: string | null;
    utm_term: string | null;
    sent_to_crm: boolean;
    crm_lead_id: string | null;
    created_at: string;
}

export interface PollResult {
    option: string;
    votes: number;
    percentage: number;
}

// ─── Catálogo de templates (modelos de campanha) ─────────────────────────────

export const CAMPAIGN_TEMPLATES: { value: CaptureCampaignTemplate; label: string; description: string }[] = [
    { value: 'lp_captura', label: 'LP de Captura', description: 'Landing page focada em conversão de lead (nome, e-mail, telefone).' },
    { value: 'simples', label: 'Simples', description: 'Página enxuta: headline + formulário direto.' },
    { value: 'venda_produto', label: 'Página de Venda de Produto', description: 'Estrutura de vendas com captura antes do checkout.' },
    { value: 'lancamento_curso', label: 'Lançamento de Curso', description: 'Pré-lançamento de curso: lista de espera / interesse.' },
    { value: 'lancamento_produto', label: 'Lançamento de Produto', description: 'Aquecimento de lançamento de produto físico.' },
    { value: 'ferramenta', label: 'Ferramenta (Quiz / Enquete)', description: 'Quiz, enquete gamificada ou perguntas e respostas.' },
];

export const CAMPAIGN_TYPES: { value: CaptureCampaignType; label: string }[] = [
    { value: 'quiz', label: 'Quiz gamificado' },
    { value: 'enquete', label: 'Enquete' },
    { value: 'formulario', label: 'Formulário' },
];

// ─── Campanhas ───────────────────────────────────────────────────────────────

export async function fetchCaptureCampaigns(): Promise<CaptureCampaign[]> {
    const { data, error } = await supabase
        .from('SITE_CaptureCampaigns')
        .select('*')
        .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as CaptureCampaign[];
}

export async function fetchCampaignBySlug(slug: string): Promise<CaptureCampaign | null> {
    const { data, error } = await supabase
        .from('SITE_CaptureCampaigns')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();
    if (error) throw error;
    return (data as CaptureCampaign) || null;
}

export async function saveCaptureCampaign(payload: Partial<CaptureCampaign> & { name: string; slug: string }): Promise<CaptureCampaign> {
    const record = { ...payload, updated_at: new Date().toISOString() };
    if (payload.id) {
        const { data, error } = await supabase
            .from('SITE_CaptureCampaigns')
            .update(record)
            .eq('id', payload.id)
            .select()
            .single();
        if (error) throw error;
        return data as CaptureCampaign;
    }
    const { data, error } = await supabase
        .from('SITE_CaptureCampaigns')
        .insert([record])
        .select()
        .single();
    if (error) throw error;
    return data as CaptureCampaign;
}

export async function deleteCaptureCampaign(id: string): Promise<void> {
    const { error } = await supabase.from('SITE_CaptureCampaigns').delete().eq('id', id);
    if (error) throw error;
}

// ─── Leads da campanha ───────────────────────────────────────────────────────

export async function fetchCampaignLeads(campaignId: string): Promise<CaptureLead[]> {
    const { data, error } = await supabase
        .from('SITE_CaptureLeads')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as CaptureLead[];
}

export async function fetchCampaignLeadCounts(campaignIds: string[]): Promise<Record<string, number>> {
    if (campaignIds.length === 0) return {};
    const { data, error } = await supabase
        .from('SITE_CaptureLeads')
        .select('campaign_id')
        .in('campaign_id', campaignIds);
    if (error) throw error;
    const counts: Record<string, number> = {};
    for (const row of data || []) {
        counts[row.campaign_id] = (counts[row.campaign_id] || 0) + 1;
    }
    return counts;
}

/**
 * Captura pública: registra o lead + voto na campanha. Upsert por telefone —
 * revotar atualiza a resposta em vez de duplicar o lead na lista.
 * Inclui UTMs do navegador (LEI 10) via getLeadTrackingFields().
 */
export async function submitCaptureLead(params: {
    campaignId: string;
    name: string;
    email?: string;
    phone: string;
    vote?: string;
    consent: boolean;
}): Promise<CaptureLead> {
    const payload = {
        campaign_id: params.campaignId,
        name: params.name.trim(),
        email: params.email?.trim() || null,
        phone: params.phone.trim(),
        answer: params.vote ? { vote: params.vote } : {},
        consent: params.consent,
        ...getLeadTrackingFields(),
    };
    const { data, error } = await supabase
        .from('SITE_CaptureLeads')
        .upsert([payload], { onConflict: 'campaign_id,phone' })
        .select()
        .single();
    if (error) throw error;
    return data as CaptureLead;
}

/** Resultados da enquete: contagem e porcentagem por opção. */
export async function fetchPollResults(campaignId: string, options: string[]): Promise<PollResult[]> {
    const { data, error } = await supabase
        .from('SITE_CaptureLeads')
        .select('answer')
        .eq('campaign_id', campaignId);
    if (error) throw error;

    const counts: Record<string, number> = {};
    for (const option of options) counts[option] = 0;
    for (const row of data || []) {
        const vote = (row.answer as { vote?: string })?.vote;
        if (vote && vote in counts) counts[vote] += 1;
    }
    const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
    return options.map(option => ({
        option,
        votes: counts[option],
        percentage: total > 0 ? Math.round((counts[option] / total) * 100) : 0,
    }));
}

// ─── Envio manual em lote para o CRM ─────────────────────────────────────────

export interface SendToCrmResult {
    sent: number;
    failed: { lead: CaptureLead; error: string }[];
}

/**
 * Envia os leads selecionados para o CRM (SITE_Leads) via handleLeadUpsert
 * (dedupe por telefone/e-mail, preserva dono e first-touch de UTM).
 * Marca cada lead da campanha como sent_to_crm com o id gerado no CRM.
 */
export async function sendCaptureLeadsToCrm(campaign: CaptureCampaign, leads: CaptureLead[]): Promise<SendToCrmResult> {
    const result: SendToCrmResult = { sent: 0, failed: [] };

    for (const lead of leads) {
        try {
            const tags = ['captura', campaign.slug];
            if (lead.answer?.vote) tags.push(`voto:${lead.answer.vote}`);

            // UTMs do LEAD (capturadas na página pública) entram no payload e
            // prevalecem sobre a sessão do admin dentro do handleLeadUpsert.
            const crm = await handleLeadUpsert({
                name: lead.name,
                email: lead.email || undefined,
                phone: lead.phone,
                type: 'Campanha de Captura',
                status: 'New',
                origin: `Campanha: ${campaign.name}`,
                // CRM oculta leads com context_id NULL (o filtro .neq('context_id','Import')
                // não casa NULL no Postgres) — sempre preencher.
                context_id: `Campanha de Captura: ${campaign.name} (${campaign.slug})${lead.answer?.vote ? ` | Voto: ${lead.answer.vote}` : ''}`,
                tags,
                utm_source: lead.utm_source || undefined,
                utm_medium: lead.utm_medium || undefined,
                utm_campaign: lead.utm_campaign || undefined,
                utm_content: lead.utm_content || undefined,
                utm_term: lead.utm_term || undefined,
            });

            const { error: markError } = await supabase
                .from('SITE_CaptureLeads')
                .update({ sent_to_crm: true, crm_lead_id: crm?.id || null })
                .eq('id', lead.id);
            if (markError) throw markError;

            result.sent += 1;
        } catch (error) {
            result.failed.push({ lead, error: error instanceof Error ? error.message : String(error) });
        }
    }

    if (result.sent > 0) {
        await supabase
            .from('SITE_CaptureCampaigns')
            .update({ sent_to_crm_at: new Date().toISOString() })
            .eq('id', campaign.id);
    }

    return result;
}

// ─── Utilidades ──────────────────────────────────────────────────────────────

export function slugify(text: string): string {
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

export function campaignPublicPath(campaign: Pick<CaptureCampaign, 'slug'>): string {
    return `/captura/${campaign.slug}`;
}
