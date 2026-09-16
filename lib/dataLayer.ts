import { stripAutoDirectTracking } from './tracking';
import { PUBLIC_BASE_URL } from './publicUrl';

/**
 * Ponte única entre o app e o Google Tag Manager.
 *
 * O GA4 (G-T4WSVZ57J0) sobe DENTRO do sandbox do GTM, servido pelo domínio
 * first-party. Isso significa que `window.gtag` não existe na página — e o
 * código que dependia dele (`if (window.gtag) …`) nunca rodou:
 *
 *   - nenhum evento de clique `data-track` chegou ao GA4;
 *   - navegação entre rotas não gerava `page_view`, então o GA4 registrava
 *     UMA página por sessão, por mais que o visitante navegasse.
 *
 * O caminho que funciona é o dataLayer: o GTM escuta, e as tags do container
 * traduzem para GA4. Aqui só publicamos os eventos — a tradução é configuração
 * do container, não código do site.
 */

type Registro = Record<string, unknown>;

declare global {
  interface Window {
    dataLayer?: Registro[];
  }
}

/** Publica no dataLayer. Nunca lança: telemetria não pode derrubar a página. */
export function pushDataLayer(evento: Registro): void {
  if (typeof window === 'undefined') return;
  try {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(evento);
  } catch {
    /* modo privado / sandbox — segue o jogo */
  }
}

/**
 * URL da página sem a decoração automática de visita direta.
 *
 * O decorador do GTM carimba `utm_source=direto&src=direto|…&sck=<id da sessão>`
 * antes do React iniciar. O `sck` é único por sessão: deixá-lo no `page_location`
 * fragmenta qualquer relatório por URL, e o `utm_source=direto` faz o tráfego
 * direto aparecer como campanha. Os dois saem daqui; a atribuição real de
 * campanha (Meta, Google, WhatsApp) permanece intacta.
 */
export function paginaLimpa(pathname: string, search: string) {
  const query = stripAutoDirectTracking(search);
  return {
    page_path: `${pathname}${query}`,
    page_location: `${PUBLIC_BASE_URL}${pathname}${query}`,
    page_title: typeof document !== 'undefined' ? document.title : '',
  };
}

/**
 * Mudança de rota na SPA. O container precisa de um acionador de evento
 * personalizado `spa_page_view` disparando a tag de configuração do GA4 —
 * sem ele, o GA4 continua contando só a primeira tela da sessão.
 */
export function pushPageView(pathname: string, search: string): void {
  pushDataLayer({ event: 'spa_page_view', ...paginaLimpa(pathname, search) });
}

/** Evento de interação (`data-track`), traduzido para GA4 pelo container. */
export function pushEvent(category: string, action: string, label?: string): void {
  pushDataLayer({
    event: 'spa_event',
    event_category: category,
    event_action: action,
    event_label: label ?? '',
  });
}

/* ────────────────────────────────────────────────────────────────────────────
 * Conversões (Google Ads / GA4 / Meta via GTM)
 *
 * Três eventos padronizados, com o mesmo nome do GA4 e do Google Ads, cobrem
 * os três funis (curso online, presencial Brasil, presencial Lisboa):
 *
 *   generate_lead   → formulário/WhatsApp virou lead no CRM
 *   begin_checkout  → saiu para Kiwify/Hotmart/Stripe/Mercado Pago
 *   purchase        → página de obrigado com pagamento confirmado
 *
 * O container GTM transforma cada um em: evento GA4 + conversão do Google Ads
 * (com Enhanced Conversions a partir de `user_data`) + evento do Pixel/CAPI.
 * O site só publica; nenhuma tag é injetada aqui.
 * ──────────────────────────────────────────────────────────────────────────── */

/** Qual funil de venda originou a conversão — vira dimensão nos relatórios. */
export type ConversionFunnel = 'curso_online_piloto' | 'presencial_brasil' | 'presencial_lisboa';

export interface ConversionUser {
  email?: string | null;
  phone?: string | null;
  name?: string | null;
}

interface ConversionBase {
  funnel: ConversionFunnel;
  /** Nome legível do produto — ex.: 'Curso Online de Suspensão'. */
  item_name: string;
  value?: number;
  currency?: 'BRL' | 'EUR';
  lead_id?: string | null;
  user?: ConversionUser;
}

const PURCHASE_STORAGE_KEY = 'wtech_purchases_enviadas';

function gerarEventId(prefixo: string): string {
  const aleatorio = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefixo}_${aleatorio}`;
}

/**
 * Telefone em E.164 para o Enhanced Conversions do Google Ads (exige `+` e DDI).
 * Brasil é o padrão; números já com DDI (351, 34…) e 10–11 dígitos locais são
 * tratados. Qualquer coisa fora disso vai como veio — o GTM faz o hash e o
 * Google descarta o que não casar, sem quebrar a conversão.
 */
export function telefoneE164(bruto?: string | null): string | undefined {
  if (!bruto) return undefined;
  const digitos = bruto.replace(/\D/g, '');
  if (!digitos) return undefined;
  if (bruto.trim().startsWith('+') || bruto.trim().startsWith('00')) return `+${digitos.replace(/^00/, '')}`;
  if (digitos.length === 10 || digitos.length === 11) return `+55${digitos}`;
  if (digitos.length === 12 && digitos.startsWith('55')) return `+${digitos}`;
  if (digitos.length === 13 && digitos.startsWith('55')) return `+${digitos}`;
  if (digitos.length === 9 && /^9/.test(digitos)) return `+351${digitos}`;
  return `+${digitos}`;
}

/**
 * Formato de `user_data` que a variável "Dados fornecidos pelo usuário" do GTM
 * lê para o Enhanced Conversions (e-mail, telefone, nome). Só entra o que existe.
 */
function montarUserData(user?: ConversionUser): Record<string, unknown> | undefined {
  if (!user) return undefined;
  const dados: Record<string, unknown> = {};
  const email = user.email?.trim().toLowerCase();
  if (email && email.includes('@')) dados.email = email;
  const telefone = telefoneE164(user.phone);
  if (telefone) dados.phone_number = telefone;
  const nome = user.name?.trim();
  if (nome) {
    const [first, ...resto] = nome.split(/\s+/);
    dados.address = { first_name: first, ...(resto.length ? { last_name: resto.join(' ') } : {}) };
  }
  return Object.keys(dados).length ? dados : undefined;
}

function montarEcommerce(base: ConversionBase, extra: Record<string, unknown> = {}) {
  return {
    ...(base.currency ? { currency: base.currency } : {}),
    ...(typeof base.value === 'number' ? { value: base.value } : {}),
    ...extra,
    items: [{ item_name: base.item_name, item_category: base.funnel, quantity: 1, ...(typeof base.value === 'number' ? { price: base.value } : {}) }],
  };
}

function publicarConversao(evento: string, base: ConversionBase, extra: Record<string, unknown> = {}): string {
  const eventId = gerarEventId(evento);
  // GA4 recomenda limpar o objeto ecommerce anterior antes de publicar outro.
  pushDataLayer({ ecommerce: null });
  pushDataLayer({
    event: evento,
    event_id: eventId,
    funnel: base.funnel,
    lead_id: base.lead_id ?? undefined,
    ...(base.currency ? { currency: base.currency } : {}),
    ...(typeof base.value === 'number' ? { value: base.value } : {}),
    ...extra,
    ecommerce: montarEcommerce(base, extra.transaction_id ? { transaction_id: extra.transaction_id } : {}),
    user_data: montarUserData(base.user),
  });
  return eventId;
}

/** Lead criado/atualizado no CRM (formulário, quiz ou captura antes do WhatsApp). */
export function pushLead(dados: ConversionBase & { method: 'form' | 'quiz' | 'whatsapp' | 'checkout' }): string {
  return publicarConversao('generate_lead', dados, { method: dados.method });
}

/** Saída para o checkout (Kiwify, Hotmart, Stripe ou Mercado Pago). */
export function pushBeginCheckout(dados: ConversionBase & { provider: 'kiwify' | 'hotmart' | 'stripe' | 'mercadopago' }): string {
  return publicarConversao('begin_checkout', dados, { provider: dados.provider });
}

/**
 * Compra confirmada. Idempotente por `transaction_id`: recarregar a página de
 * obrigado não conta a venda de novo (Google Ads também deduplica pelo id,
 * mas GA4 e Meta não — então o filtro fica aqui).
 */
export function pushPurchase(dados: ConversionBase & { transaction_id: string; provider: string }): string | null {
  const chave = String(dados.transaction_id).trim();
  if (!chave) return null;
  let enviados: string[] = [];
  try {
    enviados = JSON.parse(localStorage.getItem(PURCHASE_STORAGE_KEY) || '[]');
  } catch {
    enviados = [];
  }
  if (enviados.includes(chave)) return null;
  try {
    localStorage.setItem(PURCHASE_STORAGE_KEY, JSON.stringify([...enviados.slice(-49), chave]));
  } catch {
    /* sem storage: envia mesmo assim — melhor uma duplicata rara do que perder a venda */
  }
  return publicarConversao('purchase', dados, { transaction_id: chave, provider: dados.provider });
}
