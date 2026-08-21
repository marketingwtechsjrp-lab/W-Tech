import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Request, Response } from 'express';
import {
    registrarNaFila,
    resolveEvolutionConfig,
    sendWhatsAppText,
} from './_whatsappAutomacao.js';

/**
 * Webhook da Hotmart — /api/hotmart-webhook
 *
 * Atende o público internacional (a Kiwify segue com o Brasil). Espelha os três
 * momentos que a automação da Kiwify já cobre: compra aprovada, carrinho
 * abandonado e boleto/Pix gerado sem pagamento.
 *
 * AUTENTICAÇÃO: a Hotmart manda o `hottok` no header `X-HOTMART-HOTTOK` (v2) ou
 * no corpo (v1). Sem token configurado em SITE_Config.hotmart_webhook_token o
 * handler RECUSA tudo — um webhook aberto deixaria qualquer um forjar uma venda
 * e disparar mensagem em nome da W-Tech.
 *
 * ⚠️ O formato do payload da Hotmart foi implementado de forma defensiva, aceitando
 * as variações de v1/v2. Confira o primeiro evento real no log antes de confiar
 * cegamente: se algum campo vier em outro lugar, o evento é registrado como
 * ignorado em vez de quebrar.
 */

let cachedClient: SupabaseClient | null = null;
function getSupabase(): SupabaseClient | null {
    if (cachedClient) return cachedClient;
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    if (!url || !key) return null;
    cachedClient = createClient(url, key);
    return cachedClient;
}

const CHECKOUT_PADRAO = 'https://w-techbrasil.com.br/curso-suspensao-piloto-vsl';

/** Copy em português para PT/BR e inglês para o resto — o público é misto. */
const MENSAGENS = {
    pt: {
        aprovada: (nome: string) => `🏁 *${nome}, aqui é o Alex Crepaldi da W-Tech!*\n\nA tua inscrição no treinamento de *Regulagem de Suspensão* está confirmada. ✅\n\nOs dados de acesso foram enviados para o e-mail da compra — dá uma vista de olhos, incluindo o spam. 📧\n\nQualquer dúvida técnica, respondes aqui mesmo. Bons treinos! 🏍️`,
        carrinho: (nome: string, link: string) => `🏁 *${nome}, aqui é o Alex Crepaldi da W-Tech!*\n\nVi que chegaste a abrir a inscrição do treinamento de *Regulagem de Suspensão* mas não finalizaste. ⚠️\n\nFicou alguma dúvida técnica, ou foi o pagamento que travou? Diz-me que eu resolvo contigo.\n\nSe estiver tudo certo, o teu link continua aqui: 🔗 ${link}`,
        pendente: (nome: string, link: string) => `⏳ *${nome}, o teu pagamento ainda não foi confirmado.*\n\nA vaga fica reservada enquanto o pagamento estiver em aberto. Assim que entrar, o acesso é imediato. 🏍️\n\n🔗 ${link}`,
    },
    en: {
        aprovada: (nome: string) => `🏁 *${nome}, Alex Crepaldi here from W-Tech!*\n\nYour enrollment in the *Suspension Setup* training is confirmed. ✅\n\nAccess details were sent to the email used at checkout — check your inbox and spam. 📧\n\nAny technical questions, just reply here. Enjoy the ride! 🏍️`,
        carrinho: (nome: string, link: string) => `🏁 *${nome}, Alex Crepaldi here from W-Tech!*\n\nI saw you started the *Suspension Setup* enrollment but didn't finish. ⚠️\n\nWas it a technical question, or did the payment get stuck? Tell me and I'll sort it out with you.\n\nYour link is still here: 🔗 ${link}`,
        pendente: (nome: string, link: string) => `⏳ *${nome}, your payment hasn't cleared yet.*\n\nYour spot stays reserved while the payment is open. As soon as it clears, access is immediate. 🏍️\n\n🔗 ${link}`,
    },
};

const texto = (valor: unknown): string => (typeof valor === 'string' ? valor.trim() : '');

/** Aceita v1 (campos na raiz) e v2 (aninhado em `data`). */
function normalizar(payload: any) {
    const dados = payload?.data || payload || {};
    const comprador = dados.buyer || dados.subscriber || payload?.buyer || {};
    const compra = dados.purchase || payload?.purchase || {};

    const evento = texto(payload?.event) || texto(payload?.status) || texto(compra?.status);

    const telefone = texto(comprador?.checkout_phone)
        || texto(comprador?.phone)
        || texto(comprador?.phone_number)
        || texto([comprador?.phone_local_code, comprador?.phone_number].filter(Boolean).join(''));

    const pais = texto(comprador?.address?.country_iso)
        || texto(comprador?.address?.country)
        || texto(compra?.checkout_country?.iso)
        || '';

    return {
        evento: evento.toUpperCase(),
        nome: (texto(comprador?.name) || 'piloto').split(' ')[0],
        telefone,
        pais: pais.toUpperCase(),
        transacao: texto(compra?.transaction) || texto(payload?.id) || `hotmart_${Date.now()}`,
        link: texto(compra?.checkout_url) || texto(payload?.checkout_url) || CHECKOUT_PADRAO,
    };
}

/** Português para lusófonos, inglês para o resto. */
const idiomaDe = (pais: string) => (['PT', 'BR', 'AO', 'MZ', 'CV'].includes(pais) ? 'pt' : 'en');

export default async function hotmartWebhookHandler(req: Request, res: Response) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'metodo_nao_permitido' });
    }

    const supabase = getSupabase();
    if (!supabase) return res.status(503).json({ error: 'supabase_indisponivel' });

    const payload = (req.body as any) || {};
    console.log('[Hotmart Webhook] payload recebido:', JSON.stringify(payload).slice(0, 2000));

    // ── Autenticação ────────────────────────────────────────────────────────
    const { data: configs } = await supabase
        .from('SITE_Config')
        .select('key, value')
        .eq('key', 'hotmart_webhook_token')
        .maybeSingle();

    const tokenEsperado = texto(configs?.value);
    if (!tokenEsperado) {
        console.error('[Hotmart Webhook] hotmart_webhook_token não configurado — recusando.');
        return res.status(401).json({ error: 'webhook_nao_configurado' });
    }

    const tokenRecebido = texto(req.get('x-hotmart-hottok')) || texto(payload?.hottok);
    if (tokenRecebido !== tokenEsperado) {
        console.error('[Hotmart Webhook] hottok inválido — recusando.');
        return res.status(401).json({ error: 'hottok_invalido' });
    }

    // ── Roteamento do evento ────────────────────────────────────────────────
    const info = normalizar(payload);
    const copy = MENSAGENS[idiomaDe(info.pais)];

    let mensagem: string | null = null;
    if (['PURCHASE_APPROVED', 'PURCHASE_COMPLETE', 'APPROVED', 'COMPLETE'].includes(info.evento)) {
        mensagem = copy.aprovada(info.nome);
    } else if (['PURCHASE_OUT_OF_SHOPPING_CART', 'CART_ABANDONED'].includes(info.evento)) {
        mensagem = copy.carrinho(info.nome, info.link);
    } else if (['PURCHASE_BILLET_PRINTED', 'PURCHASE_DELAYED', 'WAITING_PAYMENT'].includes(info.evento)) {
        mensagem = copy.pendente(info.nome, info.link);
    }

    if (!mensagem) {
        // Cancelamento, reembolso, chargeback e afins não disparam WhatsApp, mas
        // respondem 200 para a Hotmart não ficar reenviando indefinidamente.
        console.log(`[Hotmart Webhook] evento sem automação: ${info.evento || '(vazio)'}`);
        return res.status(200).json({ ok: true, ignorado: info.evento || null });
    }

    if (!info.telefone) {
        console.warn(`[Hotmart Webhook] ${info.evento} sem telefone do comprador — nada a enviar.`);
        return res.status(200).json({ ok: true, sem_telefone: true });
    }

    const config = await resolveEvolutionConfig(supabase);
    const enviado = await sendWhatsAppText(info.telefone, mensagem, config);

    await registrarNaFila(supabase, {
        order_id: info.transacao,
        phone: info.telefone,
        caption: mensagem,
    });

    if (!enviado) {
        console.error(`[Hotmart Webhook] envio falhou (instância ${config.instance}) para ${info.evento}.`);
    }

    return res.status(200).json({ ok: true, evento: info.evento, enviado });
}
