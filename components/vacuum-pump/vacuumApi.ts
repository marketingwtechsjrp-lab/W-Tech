import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { VACUUM_DIRECT_REF, getVacuumOfferState, resolveVacuumConfig, type VacuumCartItem, type VacuumOfferState } from '../../lib/vacuumOffer';
import { VP_FONTS_HREF, VP_PAGE_BG } from './vacuumStyles';

/** Estado da oferta + o que só existe na resposta da API. */
export interface VacuumOffer extends VacuumOfferState {
    mp_public_key: string | null;
    server_now?: number;
}

export interface VacuumPix {
    qr_code: string | null;
    qr_code_base64: string | null;
    expires_at: string | null;
}

export interface VacuumShippingOption {
    code: string;
    name: string;
    price: number;
    days: number;
}

export interface VacuumShippingQuote {
    mode: 'free' | 'quoted' | 'combine';
    options: VacuumShippingOption[];
}

export interface VacuumPaymentResult {
    stage: string;
    shipping?: { method: string; name: string; cost: number; days?: number } | null;
    payment_status?: string | null;
    amount?: number | null;
    installments?: number | null;
    items?: VacuumCartItem[];
    first_name?: string;
    order_number?: string | null;
    pix?: VacuumPix;
    message?: string;
    delivery_text?: string;
    shipping_note?: string;
    whatsapp?: string;
    code?: string;
    error?: string;
    total?: number;
}

const API = '/api/vacuum-pump';

/** Fonte da campanha e o fundo da página no body (no iPhone, a rolagem elástica mostra o body). */
export function useVacuumPageChrome(): void {
    useEffect(() => {
        if (!document.querySelector(`link[href="${VP_FONTS_HREF}"]`)) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = VP_FONTS_HREF;
            document.head.appendChild(link);
        }
        const previous = document.body.style.backgroundColor;
        document.body.style.backgroundColor = VP_PAGE_BG;
        return () => {
            document.body.style.backgroundColor = previous;
        };
    }, []);
}

/** Resposta do servidor sem lançar: as telas mostram `error` para o cliente. */
async function request<T>(url: string, init?: RequestInit): Promise<T & { error?: string; httpStatus: number }> {
    const res = await fetch(url, init);
    const text = await res.text();
    let data: Record<string, unknown> = {};
    try {
        data = text ? JSON.parse(text) : {};
    } catch {
        data = { error: 'Resposta inválida do servidor.' };
    }
    return { ...(data as T), httpStatus: res.status };
}

function post<T>(action: string, body: unknown) {
    return request<T>(`${API}?action=${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
}

const SELLER_REF_KEY = 'vp_seller_ref';

/** Guarda de quem é o link (vendedor ou disparo): a pessoa pode voltar depois, sem o endereço completo, e comprar. */
function captureSellerRef() {
    try {
        const ref = new URLSearchParams(window.location.search).get('ref');
        if (ref && (ref === VACUUM_DIRECT_REF || /^[a-f0-9]{8}$/.test(ref))) window.localStorage.setItem(SELLER_REF_KEY, ref);
    } catch {
        /* navegador sem armazenamento: o crédito depende do endereço aberto agora */
    }
}

function sellerRef(): string | null {
    try {
        return window.localStorage.getItem(SELLER_REF_KEY);
    } catch {
        return null;
    }
}

if (typeof window !== 'undefined') captureSellerRef();

export const vacuumApi = {
    offer: () => request<VacuumOffer>(`${API}?action=offer`),
    lead: (body: { name: string; phone: string; email?: string; source: 'checkout' | 'contact' | 'waitlist'; tracking?: Record<string, string> }) =>
        post<{ ok: boolean; checkout_id: string; lead_id: string | null }>('lead', { ...body, seller_ref: sellerRef() }),
    save: (body: { checkout_id: string; stage?: string; bumps?: string[]; document?: string; address?: Record<string, string> }) =>
        post<{ ok: boolean }>('save', body),
    shipping: (body: { cep: string; bumps: string[] }) => post<VacuumShippingQuote>('shipping', body),
    pay: (body: { checkout_id: string; bumps: string[]; shipping_service: string | null; expected_total: number; attempt_key: string; form_data: unknown }) =>
        post<VacuumPaymentResult>('pay', body),
    status: (id: string) => request<VacuumPaymentResult>(`${API}?action=status&id=${encodeURIComponent(id)}`),
};

/**
 * Oferta ao vivo. Antes da resposta (e se a API cair) a página mostra o padrão do
 * código, com a compra desligada até o servidor confirmar (`ready`).
 * O relógio é o do servidor: acertar a hora do celular não muda o cronômetro.
 */
export function useVacuumOffer() {
    const [offer, setOffer] = useState<VacuumOffer>(() => ({
        ...getVacuumOfferState(resolveVacuumConfig(null), 0, Date.now()),
        mp_public_key: null,
    }));
    const [ready, setReady] = useState(false);
    const [now, setNow] = useState(() => Date.now());
    const offset = useRef(0);

    const refresh = useCallback(async () => {
        try {
            const data = await vacuumApi.offer();
            if (data.httpStatus === 200 && data.phase) {
                if (data.server_now) offset.current = data.server_now - Date.now();
                setOffer(data);
                setReady(true);
            }
        } catch {
            /* sem rede: mantém o último estado e tenta de novo no próximo ciclo */
        }
    }, []);

    useEffect(() => {
        refresh();
        const poll = window.setInterval(refresh, 45_000);
        const tick = window.setInterval(() => setNow(Date.now() + offset.current), 1000);
        return () => {
            window.clearInterval(poll);
            window.clearInterval(tick);
        };
    }, [refresh]);

    // Zerou o cronômetro: pede o novo estado, e o preço sobe na tela sem recarregar.
    const target = offer.phase === 'soon' ? offer.starts_at : offer.ends_at;
    const crossed = offer.phase !== 'regular' && now >= Date.parse(target);
    useEffect(() => {
        if (crossed) refresh();
    }, [crossed, refresh]);

    return useMemo(() => ({ offer, ready, now, refresh }), [offer, ready, now, refresh]);
}

/** Tempo restante em partes, para o cronômetro. */
export function timeParts(targetIso: string, now: number) {
    const total = Math.max(0, Date.parse(targetIso) - now);
    return {
        total,
        days: Math.floor(total / 86_400_000),
        hours: Math.floor(total / 3_600_000) % 24,
        minutes: Math.floor(total / 60_000) % 60,
        seconds: Math.floor(total / 1000) % 60,
    };
}

export function dateLabel(iso: string): string {
    return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' }).format(new Date(iso));
}

/** "sexta", "sábado"…: sai das datas configuradas para o texto nunca contradizer o prazo. */
export function weekdayLabel(iso: string): string {
    return new Intl.DateTimeFormat('pt-BR', { weekday: 'long', timeZone: 'America/Sao_Paulo' }).format(new Date(iso)).replace('-feira', '');
}

export function maskPhone(value: string): string {
    const d = value.replace(/\D/g, '').slice(0, 11);
    if (d.length <= 2) return d;
    if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function maskDocument(value: string): string {
    const d = value.replace(/\D/g, '').slice(0, 14);
    if (d.length <= 11) {
        return d
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
            .replace(/\.(\d{3})(\d)/, '.$1-$2');
    }
    return d
        .replace(/(\d{2})(\d)/, '$1.$2')
        .replace(/(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d)/, '.$1/$2')
        .replace(/(\d{4})(\d)/, '$1-$2');
}

export function maskCep(value: string): string {
    const d = value.replace(/\D/g, '').slice(0, 8);
    return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

export function whatsappLink(number: string, text: string): string {
    return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}
