/**
 * Oferta da Vacuum Pump Standard na Black Friday W-Tech (pré-venda de 7 dias).
 *
 * Regra única de preço, prazo e lote: o servidor usa estas funções para decidir
 * quanto cobrar e a página usa as mesmas para exibir, então o valor anunciado e
 * o cobrado não têm como divergir. O navegador nunca informa preço.
 *
 * A escassez é real por decisão da reunião de lançamento:
 *  - o prazo é validado no servidor: passou de `ends_at`, o preço sobe sozinho;
 *  - o lote desconta venda paga de verdade (e `sold_offset`, para vendas feitas
 *    fora do site): zerou, a pré-venda encerra antes do prazo;
 *  - nenhum número desta oferta é inventado para pressionar o cliente.
 *
 * Datas, lote, preços e mídias podem ser trocados sem deploy, na linha
 * `vacuum_pump_offer` de SITE_Config (JSON). Valor inválido cai no padrão.
 */

export const VACUUM_CAMPAIGN = 'vacuum_pump_bf_2026';
export const isVacuumSale = (sale?: { campaign?: string | null } | null) => sale?.campaign === VACUUM_CAMPAIGN;
export const VACUUM_CONFIG_KEY = 'vacuum_pump_offer';
export const VACUUM_ITEM_NAME = 'Vacuum Pump Standard W-Tech';
/** Pixel da loja, usado nos anúncios da máquina. O do curso online é outro: não misturar. */
export const VACUUM_META_PIXEL_ID = '1109519607249858';
export const VACUUM_META_CONTENT_ID = 'vacuum_pump_standard';
/** Mesmo id no navegador e no servidor: é assim que o Meta conta a compra uma vez só. */
export const vacuumPurchaseEventId = (orderNumber: string) => `vp_purchase_${orderNumber}`;

export type VacuumPhase = 'soon' | 'presale' | 'regular';
export type VacuumEndReason = 'expired' | 'sold_out' | null;

export interface VacuumBumpConfig {
    id: string;
    name: string;
    tagline: string;
    /** Ficha do acessório na página. O checkout mostra só a chamada. */
    details: string[];
    price_presale: number;
    price_regular: number;
    /** Preço de referência riscado. `null` quando o item não tem desconto. */
    anchor: number | null;
    image: string | null;
    video_url: string | null;
    /** Soma no peso do pacote para a cotação de frete. */
    weight_kg: number;
}

export interface VacuumShippingService {
    code: string;
    name: string;
}

export interface VacuumShippingConfig {
    /** Desligado (ou sem peso): fora de SP o frete fica "a combinar". SP é grátis sempre. */
    enabled: boolean;
    origin_cep: string;
    services: VacuumShippingService[];
    weight_kg: number;
    length_cm: number;
    height_cm: number;
    width_cm: number;
    /** Valor declarado (seguro) em reais. 0 = sem seguro. */
    declared_value: number;
}

export interface VacuumOfferConfig {
    starts_at: string;
    ends_at: string;
    /** Libera a venda antes de starts_at, sem a tela de "Me avise". */
    soft_open: boolean;
    lot_size: number;
    sold_offset: number;
    presale_price: number;
    regular_price: number;
    installments: number;
    delivery_days: number;
    regular_delivery_days: number;
    warranty_months: number;
    whatsapp: string;
    video_url: string | null;
    shipping_note: string;
    /** Razão social, CNPJ e endereço no rodapé (exigência do Decreto 7.962/2013). */
    legal_line: string | null;
    shipping: VacuumShippingConfig;
    bumps: VacuumBumpConfig[];
}

export const VACUUM_DEFAULT_CONFIG: VacuumOfferConfig = {
    starts_at: '2026-11-06T00:00:00-03:00',
    ends_at: '2026-11-13T23:59:59-03:00',
    soft_open: false,
    lot_size: 50,
    sold_offset: 0,
    presale_price: 7990,
    regular_price: 9990,
    installments: 10,
    delivery_days: 40,
    regular_delivery_days: 45,
    warranty_months: 3,
    whatsapp: '551732312858',
    video_url: null,
    shipping_note: 'Frete grátis para o estado de São Paulo. Para os outros estados, o valor aparece no checkout.',
    legal_line: 'W-TECH BRASIL LTDA. · CNPJ 04.545.824/0001-06 · Rua Zumbi dos Palmares, 410, Jardim Paulista, São José do Rio Preto/SP · CEP 15060-190',
    shipping: {
        enabled: false,
        origin_cep: '15060-190',
        services: [
            { code: '03298', name: 'PAC' },
            { code: '03220', name: 'SEDEX' },
        ],
        weight_kg: 0,
        length_cm: 0,
        height_cm: 0,
        width_cm: 0,
        declared_value: 0,
    },
    bumps: [
        {
            id: 'borbulhador',
            name: 'Câmara Borbulhadora W-Tech',
            tagline: 'O cliente vê o ar saindo do óleo. Câmara em acrílico cristal e alumínio anodizado.',
            details: [
                'Câmara de desaceleração e desaeração ativa em acrílico cristal (PMMA), com 92% de transmissão de luz.',
                'Reduz a velocidade do fluxo e elimina o cisalhamento turbulento. As microbolhas se expandem, se juntam na calota superior e são purgadas.',
                'Construção em alumínio com superfície anodizada e tubo acrílico.',
            ],
            price_presale: 699,
            price_regular: 699,
            anchor: null,
            image: '/images/vacuum-pump/borbulhador.webp',
            video_url: null,
            weight_kg: 0,
        },
        {
            id: 'kit_adaptador',
            name: 'Kit Adaptador + Engate Rápido',
            tagline: 'Adaptadores para reservatório de nitro de 48, 52 e 54 mm e adaptadores em inox com seis roscas.',
            details: [
                'Para reservatório de nitro de 48, 52 e 54 mm, em alumínio com superfície anodizada.',
                'Adaptadores em aço inox 304 com rosca M4x0,7, M5x0,8, M6x1, M8x1,25, M10x0,9 e M10x1.',
            ],
            price_presale: 1040,
            price_regular: 1040,
            anchor: null,
            image: '/images/vacuum-pump/kit.webp',
            video_url: null,
            weight_kg: 0,
        },
    ],
};

function positive(value: unknown, fallback: number): number {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : fallback;
}

function notNegative(value: unknown, fallback: number): number {
    const n = Number(value);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
}

function notNegativeDecimal(value: unknown, fallback: number): number {
    const n = Number(value);
    return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function validDate(value: unknown, fallback: string): string {
    return typeof value === 'string' && !Number.isNaN(Date.parse(value)) ? value : fallback;
}

function optionalText(value: unknown, fallback: string | null): string | null {
    if (value === null) return null;
    return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

/** Mescla a linha de SITE_Config sobre o padrão. Nunca lança: a venda não pode cair por JSON errado. */
export function resolveVacuumConfig(raw: unknown): VacuumOfferConfig {
    let source: Record<string, any> = {};
    try {
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (parsed && typeof parsed === 'object') source = parsed as Record<string, any>;
    } catch {
        source = {};
    }

    const d = VACUUM_DEFAULT_CONFIG;
    const starts_at = validDate(source.starts_at, d.starts_at);
    let ends_at = validDate(source.ends_at, d.ends_at);
    if (Date.parse(ends_at) <= Date.parse(starts_at)) ends_at = d.ends_at;

    const overrides = Array.isArray(source.bumps) ? source.bumps : [];
    const bumps = d.bumps.map((bump) => {
        const o = overrides.find((item: any) => item?.id === bump.id) || {};
        return {
            ...bump,
            name: optionalText(o.name, bump.name) as string,
            tagline: optionalText(o.tagline, bump.tagline) as string,
            details: Array.isArray(o.details) ? o.details.filter((line: unknown) => typeof line === 'string' && line.trim()) : bump.details,
            price_presale: positive(o.price_presale, bump.price_presale),
            price_regular: positive(o.price_regular, bump.price_regular),
            anchor: o.anchor === null ? null : positive(o.anchor, bump.anchor ?? 0) || null,
            image: optionalText(o.image, bump.image),
            video_url: optionalText(o.video_url, bump.video_url),
            weight_kg: notNegativeDecimal(o.weight_kg, bump.weight_kg),
        };
    });

    const rawShipping = source.shipping && typeof source.shipping === 'object' ? source.shipping : {};
    const services = Array.isArray(rawShipping.services)
        ? rawShipping.services
              .filter((item: any) => item && item.code && item.name)
              .map((item: any) => ({ code: String(item.code), name: String(item.name) }))
        : [];
    const shipping: VacuumShippingConfig = {
        enabled: rawShipping.enabled === true,
        origin_cep: optionalText(rawShipping.origin_cep, d.shipping.origin_cep) as string,
        services: services.length ? services : d.shipping.services,
        weight_kg: notNegativeDecimal(rawShipping.weight_kg, d.shipping.weight_kg),
        length_cm: notNegativeDecimal(rawShipping.length_cm, d.shipping.length_cm),
        height_cm: notNegativeDecimal(rawShipping.height_cm, d.shipping.height_cm),
        width_cm: notNegativeDecimal(rawShipping.width_cm, d.shipping.width_cm),
        declared_value: notNegativeDecimal(rawShipping.declared_value, d.shipping.declared_value),
    };

    return {
        starts_at,
        ends_at,
        soft_open: source.soft_open === true,
        lot_size: positive(source.lot_size, d.lot_size),
        sold_offset: notNegative(source.sold_offset, d.sold_offset),
        presale_price: positive(source.presale_price, d.presale_price),
        regular_price: positive(source.regular_price, d.regular_price),
        installments: Math.floor(positive(source.installments, d.installments)),
        delivery_days: Math.floor(positive(source.delivery_days, d.delivery_days)),
        regular_delivery_days: Math.floor(positive(source.regular_delivery_days, d.regular_delivery_days)),
        warranty_months: Math.floor(positive(source.warranty_months, d.warranty_months)),
        whatsapp: String(source.whatsapp || d.whatsapp).replace(/\D/g, '') || d.whatsapp,
        video_url: optionalText(source.video_url, d.video_url),
        shipping_note: optionalText(source.shipping_note, d.shipping_note) as string,
        legal_line: optionalText(source.legal_line, d.legal_line),
        shipping,
        bumps,
    };
}

export interface VacuumBumpState {
    id: string;
    name: string;
    tagline: string;
    details: string[];
    price: number;
    /** Só vem preenchido quando há desconto real em relação ao preço de referência. */
    anchor: number | null;
    installment_value: number;
    image: string | null;
    video_url: string | null;
}

export interface VacuumOfferState {
    campaign: string;
    phase: VacuumPhase;
    end_reason: VacuumEndReason;
    price: number;
    /** Preço de referência riscado: só existe enquanto o preço de pré-venda vale. */
    compare_at: number | null;
    regular_price: number;
    installments: number;
    installment_value: number;
    regular_installment_value: number;
    lot_size: number;
    sold: number;
    remaining: number;
    starts_at: string;
    ends_at: string;
    delivery_days: number;
    delivery_text: string;
    warranty_months: number;
    whatsapp: string;
    video_url: string | null;
    shipping_note: string;
    legal_line: string | null;
    bumps: VacuumBumpState[];
}

export function roundCents(value: number): number {
    return Math.round(value * 100) / 100;
}

function addDays(iso: string, days: number): Date {
    return new Date(Date.parse(iso) + days * 86_400_000);
}

function dateBR(date: Date): string {
    return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Sao_Paulo' }).format(date);
}

/** Data limite de entrega de quem compra agora. A da pré-venda conta do fim da pré-venda. */
export function vacuumDeliveryDeadline(config: VacuumOfferConfig, phase: VacuumPhase, now: number): Date {
    return phase === 'regular'
        ? new Date(now + config.regular_delivery_days * 86_400_000)
        : addDays(config.ends_at, config.delivery_days);
}

/** Estado público da oferta em um dado instante. `paidCount` vem do banco. */
export function getVacuumOfferState(config: VacuumOfferConfig, paidCount: number, now: number): VacuumOfferState {
    const sold = Math.max(0, paidCount) + config.sold_offset;
    const remaining = Math.max(0, config.lot_size - sold);
    const starts = Date.parse(config.starts_at);
    const ends = Date.parse(config.ends_at);

    let phase: VacuumPhase = 'presale';
    let end_reason: VacuumEndReason = null;
    if (now < starts && !config.soft_open) {
        phase = 'soon';
    } else if (now > ends) {
        phase = 'regular';
        end_reason = 'expired';
    } else if (remaining <= 0) {
        phase = 'regular';
        end_reason = 'sold_out';
    }

    const discounted = phase !== 'regular';
    const price = discounted ? config.presale_price : config.regular_price;

    return {
        campaign: VACUUM_CAMPAIGN,
        phase,
        end_reason,
        price,
        compare_at: discounted && config.regular_price > config.presale_price ? config.regular_price : null,
        regular_price: config.regular_price,
        installments: config.installments,
        installment_value: roundCents(price / config.installments),
        regular_installment_value: roundCents(config.regular_price / config.installments),
        lot_size: config.lot_size,
        sold,
        remaining,
        starts_at: config.starts_at,
        ends_at: config.ends_at,
        delivery_days: discounted ? config.delivery_days : config.regular_delivery_days,
        delivery_text: discounted
            ? `Entrega até ${dateBR(addDays(config.ends_at, config.delivery_days))}`
            : `Sob encomenda: entrega em até ${config.regular_delivery_days} dias`,
        warranty_months: config.warranty_months,
        whatsapp: config.whatsapp,
        video_url: config.video_url,
        shipping_note: config.shipping_note,
        legal_line: config.legal_line,
        bumps: config.bumps.map((bump) => {
            const bumpPrice = discounted ? bump.price_presale : bump.price_regular;
            return {
                id: bump.id,
                name: bump.name,
                tagline: bump.tagline,
                details: bump.details,
                price: bumpPrice,
                anchor: bump.anchor && bump.anchor > bumpPrice ? bump.anchor : null,
                installment_value: roundCents(bumpPrice / config.installments),
                image: bump.image,
                video_url: bump.video_url,
            };
        }),
    };
}

export interface VacuumCartItem {
    id: string;
    name: string;
    price: number;
}

export interface VacuumCart {
    items: VacuumCartItem[];
    shipping_cost: number;
    total: number;
    installment_value: number;
    /** Ids realmente aplicados: id desconhecido ou repetido é descartado. */
    bump_ids: string[];
}

/** Monta o carrinho a partir do estado. É o único cálculo de total do sistema. */
export function computeVacuumCart(state: VacuumOfferState, bumpIds: unknown, shippingCost = 0): VacuumCart {
    const wanted = new Set(Array.isArray(bumpIds) ? bumpIds.map(String) : []);
    const bumps = state.bumps.filter((bump) => wanted.has(bump.id));
    const items: VacuumCartItem[] = [
        { id: 'vacuum_pump_standard', name: VACUUM_ITEM_NAME, price: state.price },
        ...bumps.map((bump) => ({ id: bump.id, name: bump.name, price: bump.price })),
    ];
    const shipping_cost = roundCents(Math.max(0, shippingCost));
    const total = roundCents(items.reduce((sum, item) => sum + item.price, 0) + shipping_cost);
    return {
        items,
        shipping_cost,
        total,
        installment_value: roundCents(total / state.installments),
        bump_ids: bumps.map((bump) => bump.id),
    };
}

export function formatBRL(value: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

/** Separa reais e centavos para a tipografia do preço. */
export function brlParts(value: number): { integer: string; cents: string } {
    const [integer, cents] = value.toFixed(2).split('.');
    return { integer: Number(integer).toLocaleString('pt-BR'), cents };
}

export function onlyDigits(value: unknown): string {
    return String(value ?? '').replace(/\D/g, '');
}

export function isValidEmail(value: unknown): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value ?? '').trim());
}

/** Celular ou fixo brasileiro com DDD (10 ou 11 dígitos), com ou sem o 55. */
export function normalizeBrPhone(value: unknown): string | null {
    let digits = onlyDigits(value);
    if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) digits = digits.slice(2);
    if (digits.length !== 10 && digits.length !== 11) return null;
    if (digits.startsWith('0')) return null;
    return digits;
}

/** Estado de São Paulo pelo CEP (01000-000 a 19999-999): o frete grátis não depende do que foi digitado na UF. */
export function isSaoPauloCep(value: unknown): boolean {
    const cep = onlyDigits(value);
    if (cep.length !== 8) return false;
    const prefix = Number(cep.slice(0, 5));
    return prefix >= 1000 && prefix <= 19999;
}

export function isValidCpf(value: unknown): boolean {
    const cpf = onlyDigits(value);
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
    const digit = (length: number) => {
        let sum = 0;
        for (let i = 0; i < length; i++) sum += Number(cpf[i]) * (length + 1 - i);
        const rest = (sum * 10) % 11;
        return rest === 10 ? 0 : rest;
    };
    return digit(9) === Number(cpf[9]) && digit(10) === Number(cpf[10]);
}

export function isValidCnpj(value: unknown): boolean {
    const cnpj = onlyDigits(value);
    if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;
    const digit = (length: number) => {
        const weights = length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
        const sum = weights.reduce((acc, weight, i) => acc + Number(cnpj[i]) * weight, 0);
        const rest = sum % 11;
        return rest < 2 ? 0 : 11 - rest;
    };
    return digit(12) === Number(cnpj[12]) && digit(13) === Number(cnpj[13]);
}

export function documentType(value: unknown): 'CPF' | 'CNPJ' | null {
    if (isValidCpf(value)) return 'CPF';
    if (isValidCnpj(value)) return 'CNPJ';
    return null;
}

/** Hora de término em texto, como "23h59". Sai da configuração, nunca fixa no texto. */
export function vacuumEndTimeLabel(endsAt: string): string {
    const parts = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Sao_Paulo' }).formatToParts(new Date(endsAt));
    const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '00';
    return `${get('hour')}h${get('minute')}`;
}

function calendarDay(ms: number): number {
    const [day, month, year] = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Sao_Paulo' })
        .format(new Date(ms))
        .split('/')
        .map(Number);
    return Date.UTC(year, month - 1, day) / 86_400_000;
}

/** Texto de urgência a partir do tempo real restante, em dias de calendário de Brasília. */
export function vacuumUrgencyLabel(endsAt: string, now: number): string {
    const ends = Date.parse(endsAt);
    if (ends <= now) return 'Pré-venda encerrada';
    const days = calendarDay(ends) - calendarDay(now);
    if (days <= 0) return `Último dia: termina hoje às ${vacuumEndTimeLabel(endsAt)}`;
    if (days === 1) return 'Termina amanhã';
    return `Faltam ${days} dias`;
}
