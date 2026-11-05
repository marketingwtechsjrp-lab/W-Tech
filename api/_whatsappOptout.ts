import type { SupabaseClient } from '@supabase/supabase-js';
import { GRAPH, upsertConversation, type CloudConfig } from './_whatsappCloud.js';
import { findExistingLead } from '../lib/leadMatch.js';

/**
 * Pedido de saída das mensagens de marketing no número oficial.
 * Prefixo "_" → NÃO vira rota na Vercel; usado pelo webhook.
 *
 * A marca fica na conversa (marketing_optout_at) porque nem todo destinatário tem
 * ficha em SITE_Leads: credenciado, aluno e cliente podem estar só nas tabelas deles.
 * A tag whatsapp_optout na ficha é para os filtros do CRM enxergarem o pedido.
 */

const OPTOUT_TAG = 'whatsapp_optout';
const MAX_LENGTH = 60;
const CONFIRMATION = 'Pronto, você não vai mais receber nossas ofertas por aqui. Se precisar de alguma coisa, é só mandar mensagem.';

const POLITE = '( por favor| pfv| pf)?';
const MESSAGES = '( mais)?( mensagem| mensagens| ofertas?| promocoes?| propagandas?| isso| nada)*';
const REMOVE = '(tire|tira|retire|remova|remove|exclua|exclui)';

// Só frase inteira: "vou sair agora, te chamo depois" e "não quero receber na sexta"
// são conversa com o vendedor, não pedido de saída.
const OPTOUT_PATTERNS = [
  new RegExp(`^(por favor |pfv |pf )?(quero |gostaria de |pode )?(sair|parar|pare|stop|remover|descadastrar|descadastre)( da lista| dessa lista| desta lista| de receber| me| meu numero| meu contato)*${POLITE}$`),
  new RegExp(`^nao quero( mais)? receber${MESSAGES}( por aqui| daqui)?${POLITE}$`),
  new RegExp(`^nao (me )?(mande|mandem|envie|enviem|chame|chamem)${MESSAGES}${POLITE}$`),
  new RegExp(`^(pare|parem|para|parar) de (me )?(enviar|mandar)${MESSAGES}${POLITE}$`),
  new RegExp(`^(me ${REMOVE}|${REMOVE} me|${REMOVE} meu (numero|contato))( da| dessa| desta)?( lista| base)?${POLITE}$`),
];

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Vale tanto para o botão "Não quero receber" do template quanto para quem digita. */
export function isOptOutRequest(text: string | null | undefined): boolean {
  if (!text || text.length > MAX_LENGTH) return false;
  const normalized = normalize(text);
  return OPTOUT_PATTERNS.some((pattern) => pattern.test(normalized));
}

async function tagLead(supabase: SupabaseClient, waId: string): Promise<void> {
  const lead = await findExistingLead<any>(supabase, { phone: waId });
  if (!lead) return;
  const { error } = await supabase
    .from('SITE_Leads')
    .update({ tags: Array.from(new Set([...(lead.tags || []), OPTOUT_TAG])) })
    .eq('id', lead.id);
  if (error) console.error('[WA Optout] Falha ao marcar a ficha:', error.message);
}

async function sendConfirmation(supabase: SupabaseClient, cfg: CloudConfig, conversationId: string, waId: string): Promise<void> {
  const res = await fetch(`${GRAPH}/${cfg.apiVersion}/${cfg.phoneNumberId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.accessToken}` },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: waId,
      type: 'text',
      text: { body: CONFIRMATION },
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    console.error('[WA Optout] Confirmação recusada pela Meta:', data?.error?.message);
    return;
  }

  const whenISO = new Date().toISOString();
  await upsertConversation(supabase, { waId, preview: CONFIRMATION, whenISO, direction: 'out' });
  await supabase.from('SITE_WhatsAppCloudMessages').insert({
    conversation_id: conversationId,
    wa_id: waId,
    wa_message_id: data.messages?.[0]?.id ?? null,
    direction: 'out',
    type: 'text',
    body: CONFIRMATION,
    status: 'sent',
    sent_by: 'system',
    timestamp: whenISO,
  });
}

/** Grava o pedido e confirma uma vez só: a pessoa pode apertar o botão de novo em outro envio. */
export async function registerOptOut(
  supabase: SupabaseClient,
  cfg: CloudConfig,
  args: { conversationId: string; waId: string }
): Promise<void> {
  const { conversationId, waId } = args;
  const { data: marked, error } = await supabase
    .from('SITE_WhatsAppCloudConversations')
    .update({ marketing_optout_at: new Date().toISOString() })
    .eq('id', conversationId)
    .is('marketing_optout_at', null)
    .select('id');
  if (error) throw new Error(`Falha ao gravar o pedido de saída: ${error.message}`);
  if (!marked?.length) return;

  await tagLead(supabase, waId);
  // O pedido já está gravado: sem confirmação, a pessoa só deixa de receber o aviso.
  await sendConfirmation(supabase, cfg, conversationId, waId);
}
