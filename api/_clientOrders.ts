import type { SupabaseClient } from '@supabase/supabase-js';
import {
  createIpRateLimiter,
  getServiceClient,
  requireSameOrigin,
  setNoStoreHeaders,
  UUID_RE,
  type RateLimiter,
} from './_auth.js';
import {
  buildPortalSale,
  normalizeCode,
  parseCart,
  PORTAL_COLUMNS,
  toPortalEnrollment,
  toPortalOrder,
  toPortalProfile,
  toTrackedOrder,
  TRACKING_COLUMNS,
  type PortalClient,
  type PortalSaleItem,
} from '../lib/clientOrders.js';
import { findExistingLead, preserveWonStatus } from '../lib/leadMatch.js';

/**
 * Pedidos fora do painel — o navegador não lê nem grava SITE_Sales.
 *
 * POST /api/order-tracking { code }: /rastreio, por código de rastreio ou id do pedido.
 * POST /api/client-orders { code, action }: /meus-pedidos, com o código do cliente.
 *   action 'login'  → dados do dono do código, com CPF e RG mascarados
 *   action 'list'   → pedidos do dono do código
 *   action 'enrollments' → matrículas do dono do código
 *   action 'order'  → novo pedido pendente { items: [{ productId, quantity }] }
 *   action 'enroll' → pedido pendente de matrícula { courseId }, com aviso no CRM
 *
 * O dono, os preços e o que volta são decididos aqui (lib/clientOrders.ts): do
 * navegador só se aceita o código e o que ele quer comprar. O código tem pouca
 * entropia (3 letras do nome + 2 números + 3 letras), daí o limite de tentativas
 * erradas por IP, que vale por hora e não por minuto.
 */

const RATE_WINDOW_MS = 60_000;
const RATE_MAX_PER_WINDOW = 30;
const WRONG_CODE_WINDOW_MS = 60 * 60_000;
const WRONG_CODE_MAX_PER_WINDOW = 20;

const limitadorRastreio = createIpRateLimiter({ windowMs: RATE_WINDOW_MS, maxAttempts: RATE_MAX_PER_WINDOW });
const limitadorPortal = createIpRateLimiter({ windowMs: RATE_WINDOW_MS, maxAttempts: RATE_MAX_PER_WINDOW });
const limitadorCodigoErrado = createIpRateLimiter({ windowMs: WRONG_CODE_WINDOW_MS, maxAttempts: WRONG_CODE_MAX_PER_WINDOW });

const PEDIDO_NAO_ENCONTRADO = 'Pedido não encontrado. Verifique o código e tente novamente.';
const CODIGO_INVALIDO = 'Código de acesso inválido. Verifique e tente novamente.';
const MUITAS_TENTATIVAS = 'Muitas tentativas. Aguarde um minuto e tente novamente.';
const ERRO_GENERICO = 'Não foi possível concluir agora. Tente novamente.';
const MAX_PEDIDOS_POR_CONSULTA = 200;
const PREFIXO_INSCRICAO = 'Inscrição: ';

function abrirRota(req: any, res: any, limitador: RateLimiter): SupabaseClient | null {
  setNoStoreHeaders(res);
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'metodo_nao_permitido' });
    return null;
  }
  if (!requireSameOrigin(req, res)) return null;
  if (limitador.isLimited(req)) {
    res.status(429).json({ error: MUITAS_TENTATIVAS });
    return null;
  }
  const supabase = getServiceClient();
  if (!supabase) {
    res.status(503).json({ error: ERRO_GENERICO });
    return null;
  }
  return supabase;
}

/** Mesma regra da tela antiga (`.single()`): só vale se uma única linha casar. */
async function linhaUnica(
  supabase: SupabaseClient,
  coluna: 'tracking_code' | 'id',
  valor: string,
): Promise<Record<string, unknown> | null> {
  const { data, error } = await supabase.from('SITE_Sales').select(TRACKING_COLUMNS).eq(coluna, valor).limit(2);
  if (error) throw error;
  return data?.length === 1 ? (data[0] as Record<string, unknown>) : null;
}

export async function orderTracking(req: any, res: any) {
  const supabase = abrirRota(req, res, limitadorRastreio);
  if (!supabase) return;

  const code = normalizeCode(req.body?.code);
  if (!code) return res.status(404).json({ error: PEDIDO_NAO_ENCONTRADO });

  try {
    const pedido =
      (await linhaUnica(supabase, 'tracking_code', code)) ??
      (UUID_RE.test(code) ? await linhaUnica(supabase, 'id', code.toLowerCase()) : null);
    if (!pedido) return res.status(404).json({ error: PEDIDO_NAO_ENCONTRADO });
    return res.status(200).json({ order: toTrackedOrder(pedido) });
  } catch (erro) {
    console.error('[order-tracking] Falha ao buscar pedido:', (erro as Error).message);
    return res.status(500).json({ error: ERRO_GENERICO });
  }
}

type ClienteDoBanco = PortalClient & Record<string, unknown>;

async function buscarCliente(supabase: SupabaseClient, code: string): Promise<ClienteDoBanco | null> {
  for (const tabela of ['SITE_Leads', 'SITE_Mechanics']) {
    const { data, error } = await supabase
      .from(tabela)
      .select('*')
      .eq('client_code', code)
      .limit(2);
    if (error) throw error;
    if (data?.length === 1) return data[0] as ClienteDoBanco;
  }
  return null;
}

async function listarPedidos(supabase: SupabaseClient, cliente: PortalClient) {
  const consultar = () =>
    supabase
      .from('SITE_Sales')
      .select(PORTAL_COLUMNS)
      .order('created_at', { ascending: false })
      .limit(MAX_PEDIDOS_POR_CONSULTA);

  // Duas consultas em vez de `.or()`: o e-mail do cadastro não entra em filtro montado
  // por texto. E-mail vazio não identifica ninguém, então nem é consultado. E o e-mail do
  // lead não é verificado: por ele só entra pedido sem dono, nunca o de outro cliente.
  const resultados = await Promise.all([
    consultar().eq('client_id', cliente.id),
    ...(cliente.email ? [consultar().eq('client_email', cliente.email).is('client_id', null)] : []),
  ]);

  const porId = new Map<string, ReturnType<typeof toPortalOrder>>();
  for (const { data, error } of resultados) {
    if (error) throw error;
    for (const linha of data ?? []) {
      const pedido = toPortalOrder(linha as Record<string, unknown>);
      porId.set(pedido.id, pedido);
    }
  }
  return [...porId.values()].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
}

async function listarMatriculas(supabase: SupabaseClient, cliente: PortalClient) {
  const consultar = (coluna: 'student_email' | 'student_phone', valor: string) =>
    supabase
      .from('SITE_Enrollments')
      .select('id, status, created_at, SITE_Courses(title, date)')
      .eq(coluna, valor)
      .limit(MAX_PEDIDOS_POR_CONSULTA);

  const resultados = await Promise.all([
    ...(cliente.email ? [consultar('student_email', cliente.email)] : []),
    ...(cliente.phone ? [consultar('student_phone', cliente.phone)] : []),
  ]);

  const porId = new Map<string, Record<string, unknown>>();
  for (const { data, error } of resultados) {
    if (error) throw error;
    for (const linha of data ?? []) porId.set(linha.id as string, linha as Record<string, unknown>);
  }
  return [...porId.values()]
    .sort((a, b) => Date.parse(String(b.created_at)) - Date.parse(String(a.created_at)))
    .map(toPortalEnrollment);
}

async function itensDoCarrinho(supabase: SupabaseClient, bruto: unknown): Promise<PortalSaleItem[] | null> {
  const linhas = parseCart(bruto);
  if (!linhas) return null;

  const { data, error } = await supabase
    .from('SITE_Products')
    .select('id, name, sale_price')
    .eq('type', 'product')
    .in('id', linhas.map((linha) => linha.productId));
  if (error) throw error;

  const produtos = new Map((data ?? []).map((produto) => [produto.id as string, produto]));
  if (linhas.some((linha) => !produtos.has(linha.productId))) return null;

  return linhas.map(({ productId, quantity }) => {
    const produto = produtos.get(productId)!;
    return { productId, name: produto.name as string, quantity, price: Number(produto.sale_price) || 0 };
  });
}

async function itemDaMatricula(supabase: SupabaseClient, bruto: unknown): Promise<PortalSaleItem[] | null> {
  if (typeof bruto !== 'string' || !UUID_RE.test(bruto)) return null;

  const { data: curso, error } = await supabase
    .from('SITE_Courses')
    .select('id, title, price')
    .eq('id', bruto)
    .eq('status', 'Published')
    .maybeSingle();
  if (error) throw error;
  if (!curso) return null;

  return [{
    productId: curso.id as string,
    name: `${PREFIXO_INSCRICAO}${curso.title}`,
    quantity: 1,
    price: Number(curso.price) || 0,
    type: 'course_enrollment',
  }];
}

/**
 * Avisa o CRM na ficha que a pessoa já tem: ficha nova traria de volta a duplicata que
 * lib/leadMatch.ts evita. Só muda contexto, status (quem está ganho continua ganho) e notas,
 * somadas às da equipe. O pedido já foi gravado, então a falha aqui só fica no log: devolver
 * erro faria o cliente tentar de novo e duplicar o pedido.
 */
async function avisarCrmDaMatricula(supabase: SupabaseClient, cliente: PortalClient, curso: string) {
  const nota = `PEDIDO DE MATRÍCULA VIA PORTAL: O cliente solicitou participação no curso "${curso}". Um pedido pendente foi gerado automaticamente.`;
  try {
    const ficha = await findExistingLead<{ id: string; status: string | null; internal_notes: string | null }>(supabase, cliente);
    const aviso = {
      status: preserveWonStatus(ficha?.status, 'New'),
      context_id: `Matrícula: ${curso}`,
      internal_notes: ficha?.internal_notes ? `${ficha.internal_notes}\n${nota}` : nota,
      updated_at: new Date().toISOString(),
    };
    const { error } = ficha
      ? await supabase.from('SITE_Leads').update(aviso).eq('id', ficha.id)
      : await supabase.from('SITE_Leads').insert([{ ...aviso, name: cliente.name, email: cliente.email, phone: cliente.phone, assigned_to: cliente.assigned_to }]);
    if (error) throw error;
  } catch (erro) {
    console.error('[client-orders] Pedido de matrícula gravado, mas o aviso ao CRM falhou:', (erro as Error).message);
  }
}

export default async function clientOrders(req: any, res: any) {
  const supabase = abrirRota(req, res, limitadorPortal);
  if (!supabase) return;

  if (limitadorCodigoErrado.hasExceeded(req)) return res.status(429).json({ error: MUITAS_TENTATIVAS });

  const code = normalizeCode(req.body?.code);
  if (!code) return res.status(404).json({ error: CODIGO_INVALIDO });

  try {
    const cliente = await buscarCliente(supabase, code);
    if (!cliente) {
      limitadorCodigoErrado.isLimited(req);
      return res.status(404).json({ error: CODIGO_INVALIDO });
    }

    const acao = req.body?.action;
    if (acao === 'login') {
      return res.status(200).json({ client: toPortalProfile(cliente) });
    }
    if (acao === 'enrollments') {
      return res.status(200).json({ enrollments: await listarMatriculas(supabase, cliente) });
    }
    if (acao === 'list') {
      return res.status(200).json({ orders: await listarPedidos(supabase, cliente) });
    }
    if (acao !== 'order' && acao !== 'enroll') {
      return res.status(400).json({ error: 'acao_invalida' });
    }

    const itens = acao === 'order'
      ? await itensDoCarrinho(supabase, req.body?.items)
      : await itemDaMatricula(supabase, req.body?.courseId);
    if (!itens) return res.status(400).json({ error: 'Item indisponível. Atualize a página e tente novamente.' });

    const { error } = await supabase.from('SITE_Sales').insert([buildPortalSale(cliente, itens)]);
    if (error) throw error;
    if (acao === 'enroll') await avisarCrmDaMatricula(supabase, cliente, itens[0].name.slice(PREFIXO_INSCRICAO.length));
    return res.status(201).json({ ok: true });
  } catch (erro) {
    console.error('[client-orders] Falha no portal do cliente:', (erro as Error).message);
    return res.status(500).json({ error: ERRO_GENERICO });
  }
}
