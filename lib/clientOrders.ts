/**
 * Pedidos vistos de fora do painel: /rastreio e /meus-pedidos.
 *
 * SITE_Sales guarda nome, telefone, e-mail, endereço e, nas notas, CPF. O navegador
 * não fala mais com a tabela (migrations/2026-11-04_fechar_vendas_anon.sql) e passa
 * por api/_clientOrders.ts. Aqui fica o que pode sair de lá: campo novo só aparece
 * para o cliente se entrar de propósito nestas listas.
 */

export const TRACKING_COLUMNS = 'id, status, created_at, shipping_method, total_value, items';
export const PORTAL_COLUMNS =
  'id, status, created_at, tracking_code, total_value, shipping_cost, insurance_cost, discount_amount, payment_method, items';

const MAX_CODE_LENGTH = 64;
const MAX_CART_LINES = 100;
const MAX_QUANTITY = 9999;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface PublicOrderItem {
  name: string;
  quantity: number;
  price: number;
}

export interface TrackedOrder {
  reference: string;
  status: string;
  created_at: string;
  shipping_method: string | null;
  total_value: number;
  items: PublicOrderItem[];
}

export interface PortalOrder {
  id: string;
  status: string;
  created_at: string;
  tracking_code: string | null;
  total_value: number;
  shipping_cost: number;
  insurance_cost: number;
  discount_amount: number;
  payment_method: string | null;
  items: PublicOrderItem[];
}

export interface PortalProfile {
  name: string;
  email: string | null;
  phone: string | null;
  type: string | null;
  client_code: string;
  address: string | null;
  delivery_address: unknown;
  completed_courses: unknown[];
  cpf: string | null;
  rg: string | null;
}

export interface PortalEnrollment {
  status: string;
  SITE_Courses: { title: string | null; date: string | null } | null;
}

export interface CartLine {
  productId: string;
  quantity: number;
}

export interface PortalClient {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  assigned_to: string | null;
}

export interface PortalSaleItem extends PublicOrderItem {
  productId: string;
  type?: 'course_enrollment';
}

type SaleRow = Record<string, unknown>;

const toNumber = (value: unknown) => Number(value) || 0;
const toText = (value: unknown) => (typeof value === 'string' ? value : '');
const toNullableText = (value: unknown) => (typeof value === 'string' ? value : null);

/** Só nome, quantidade e preço: `items` ainda carrega id e SKU internos. */
export function parseOrderItems(raw: unknown): PublicOrderItem[] {
  let value = raw;
  // A coluna é jsonb, mas o painel grava JSON.stringify: quase toda linha vem como texto.
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    .map((item) => ({
      name: toText(item.name) || 'Produto',
      quantity: toNumber(item.quantity) || 1,
      price: toNumber(item.price),
    }));
}

/** O código de rastreio não identifica ninguém: daqui não sai dado pessoal nenhum. */
export function toTrackedOrder(row: SaleRow): TrackedOrder {
  return {
    reference: toText(row.id).slice(0, 8).toUpperCase(),
    status: toText(row.status),
    created_at: toText(row.created_at),
    shipping_method: toNullableText(row.shipping_method),
    total_value: toNumber(row.total_value),
    items: parseOrderItems(row.items),
  };
}

export function toPortalOrder(row: SaleRow): PortalOrder {
  return {
    id: toText(row.id),
    status: toText(row.status),
    created_at: toText(row.created_at),
    tracking_code: toNullableText(row.tracking_code),
    total_value: toNumber(row.total_value),
    shipping_cost: toNumber(row.shipping_cost),
    insurance_cost: toNumber(row.insurance_cost),
    discount_amount: toNumber(row.discount_amount),
    payment_method: toNullableText(row.payment_method),
    items: parseOrderItems(row.items),
  };
}

/** Documento só com o final: o código do cliente é fraco demais para abrir CPF inteiro. */
export function maskDocument(raw: unknown): string | null {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  const value = raw.trim();
  return `${'*'.repeat(Math.max(value.length - 4, 0))}${value.slice(-4)}`;
}

/** O que a tela "Meus Dados" mostra. O e-mail e o telefone são da própria pessoa. */
export function toPortalProfile(row: SaleRow): PortalProfile {
  return {
    name: toText(row.name),
    email: toNullableText(row.email),
    phone: toNullableText(row.phone),
    type: toNullableText(row.type),
    client_code: toText(row.client_code),
    address: toNullableText(row.address),
    delivery_address: row.delivery_address ?? null,
    completed_courses: Array.isArray(row.completed_courses) ? row.completed_courses : [],
    cpf: maskDocument(row.cpf),
    rg: maskDocument(row.rg),
  };
}

/** Sem o id: ele abre as telas de matrícula, e a lista casa por contato não verificado. */
export function toPortalEnrollment(row: SaleRow): PortalEnrollment {
  const curso = (row.SITE_Courses ?? null) as SaleRow | null;
  return {
    status: toText(row.status),
    SITE_Courses: curso && { title: toNullableText(curso.title), date: toNullableText(curso.date) },
  };
}

export function normalizeCode(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const code = raw.trim().toUpperCase();
  return code && code.length <= MAX_CODE_LENGTH ? code : null;
}

export function parseCart(raw: unknown): CartLine[] | null {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_CART_LINES) return null;

  const lines: CartLine[] = [];
  for (const entry of raw) {
    const { productId, quantity } = (entry ?? {}) as { productId?: unknown; quantity?: unknown };
    if (typeof productId !== 'string' || !UUID_RE.test(productId)) return null;
    if (!Number.isInteger(quantity) || (quantity as number) < 1 || (quantity as number) > MAX_QUANTITY) return null;
    lines.push({ productId, quantity: quantity as number });
  }
  return lines;
}

/** Pedido pendente do portal. Cliente e preços vêm do banco, nunca do navegador. */
export function buildPortalSale(client: PortalClient, items: PortalSaleItem[]) {
  const total = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  return {
    client_id: client.id,
    client_name: client.name,
    client_email: client.email,
    client_phone: client.phone,
    channel: 'Admin', // Canal canônico dos pedidos do portal (SITE_Sales_channel_check)
    status: 'pending',
    total_value: Number(total.toFixed(2)),
    seller_id: client.assigned_to,
    items: JSON.stringify(items),
  };
}

async function postJson<T>(url: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || 'Não foi possível concluir. Tente novamente.');
  return data as T;
}

export async function trackOrder(code: string): Promise<TrackedOrder> {
  const { order } = await postJson<{ order: TrackedOrder }>('/api/order-tracking', { code });
  return order;
}

export async function loginPortal(code: string): Promise<PortalProfile> {
  const { client } = await postJson<{ client: PortalProfile }>('/api/client-orders', { code, action: 'login' });
  return client;
}

export async function fetchPortalEnrollments(code: string): Promise<PortalEnrollment[]> {
  const { enrollments } = await postJson<{ enrollments: PortalEnrollment[] }>('/api/client-orders', { code, action: 'enrollments' });
  return enrollments;
}

export async function fetchPortalOrders(code: string): Promise<PortalOrder[]> {
  const { orders } = await postJson<{ orders: PortalOrder[] }>('/api/client-orders', { code, action: 'list' });
  return orders;
}

export async function submitPortalOrder(code: string, items: CartLine[]): Promise<void> {
  await postJson('/api/client-orders', { code, action: 'order', items });
}

export async function submitPortalEnrollment(code: string, courseId: string): Promise<void> {
  await postJson('/api/client-orders', { code, action: 'enroll', courseId });
}
