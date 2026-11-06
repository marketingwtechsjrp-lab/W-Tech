import test, { after, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { iniciarHarness } from './_apiHarness.mjs';

// Venda manual da promoção: o navegador não define total nem nome de item, venda do site
// não se altera por aqui e clique duplo não lança duas máquinas. O relatório precisa bater
// com o painel: só venda paga soma.

const COOKIE = 'wtech_staff_session=token-de-teste';
const GERENTE = { id: '44444444-4444-4444-8444-444444444444', name: 'Gerente', email: 'g@w-tech.com', role_id: null, status: 'Active' };
const MICHAEL = '95cfe965-58f8-4f11-9449-464fabac15d9';
const EMERSON = '1a370d9a-8bd1-447e-85c0-82694770b089';
const ID_1 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
const ID_2 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2';
const CAMPANHA = 'vacuum_pump_bf_2026';

let h;
let permissoes;

/** Só o WhatsApp oficial é falso: as consultas ao banco de mentira do harness seguem normais. */
const enviosWhatsApp = [];
globalThis.__vendasFetch = async (url, init = {}) => {
  if (!String(url).includes('graph.facebook.com')) return fetch(url, init);
  enviosWhatsApp.push(JSON.parse(init.body));
  return { ok: true, status: 200, json: async () => ({ contacts: [{ wa_id: '5517999991234' }], messages: [{ id: `wamid.${enviosWhatsApp.length}` }] }) };
};
const pausa = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
/** O envio não trava a venda: espera ele terminar sem depender da velocidade da máquina. */
const esperarEnvios = async () => {
  await pausa(150);
  for (let i = 0; i < 150 && (h.estado.tabelas.SITE_WhatsAppCloudMessages?.length ?? 0) < enviosWhatsApp.length; i += 1) await pausa(20);
};

before(async () => {
  h = await iniciarHarness(`
    export { handleVacuumSalesList, handleVacuumSaleCreate, handleVacuumSaleUpdate, handleVacuumSaleStatus } from './api/_vacuumSales.ts';
    export { handleVacuumDashboard } from './api/_vacuumDashboard.ts';
    export { getServiceClient } from './api/_auth.ts';
    export { buildVacuumReport, vacuumManualPaymentLabel, vacuumPaymentShort, vacuumItemsShort } from './lib/vacuumSales.ts';
  `, { define: { fetch: 'globalThis.__vendasFetch' } });
});
after(async () => { await h.fechar(); });

beforeEach(() => {
  permissoes = { campaign_sales_view: true, campaign_sales_manage: true };
  h.estado.tabelas = {
    SITE_Users: [
      { id: MICHAEL, name: 'Michael', status: 'Active' },
      { id: EMERSON, name: 'Emerson', status: 'Active' },
      { id: '55555555-5555-4555-8555-555555555555', name: 'Noemi', status: 'Active' },
    ],
  };
  h.estado.tabelas.SITE_Config = [
    { key: 'whatsapp_cloud_access_token', value: 'token-wa' },
    { key: 'whatsapp_cloud_phone_number_id', value: '555' },
  ];
  enviosWhatsApp.length = 0;
  h.estado.chamadas.length = 0;
  h.estado.rpcs = {
    site_staff_session_validar: () => [{ ...GERENTE, permissions: permissoes }],
  };
});

const chamar = (nome, corpo, opcoes = {}) => {
  const banco = h.modulo.getServiceClient();
  return h.chamar((req, res) => h.modulo[nome](banco, req, res), corpo, { cookie: COOKIE, ...opcoes });
};

const venda = (extra = {}) => ({
  id: ID_1,
  seller_id: MICHAEL,
  name: 'Cliente da Silva',
  phone: '(17) 99999-1234',
  email: 'CLIENTE@teste.com',
  document: '',
  machine_price: 7990,
  bumps: [{ id: 'borbulhador', price: 699 }],
  shipping_cost: 100,
  payment: 'credit',
  installments: 10,
  status: 'paid',
  sale_date: new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date()),
  note: 'Fechou no balcão',
  address: { cep: '15060-190', street: 'Rua A', number: '10', complement: '', neighborhood: 'Centro', city: 'Rio Preto', state: 'sp' },
  ...extra,
});

const vendasGravadas = () => h.estado.tabelas.SITE_Sales ?? [];

test('painel traz a saúde do checkout e continua no ar se ela falhar', async () => {
  permissoes = { campaign_live_view: true };
  h.estado.rpcs.site_vacuum_dashboard = () => ({ funnel: { visitors: 10 } });
  h.estado.rpcs.site_vacuum_checkout_health = () => ({ since: '2026-11-06T22:00:00Z', problems: [] });
  const banco = h.modulo.getServiceClient();
  const abrir = (range) => h.chamar((req, res) => h.modulo.handleVacuumDashboard(banco, { ...req, query: { range } }, res), undefined, { cookie: COOKIE, metodo: 'GET' });

  const comSaude = await abrir('campaign');
  assert.equal(comSaude.codigo, 200);
  assert.equal(comSaude.corpo.checkout.since, '2026-11-06T22:00:00Z');

  h.estado.falha = 'POST site_vacuum_checkout_health';
  const semSaude = await abrir('today');
  h.estado.falha = null;
  assert.equal(semSaude.codigo, 200, 'o painel de vendas não pode cair junto');
  assert.equal(semSaude.corpo.data.funnel.visitors, 10);
  assert.equal(semSaude.corpo.checkout, null);
});

test('sem sessão ou sem permissão não entra', async () => {
  h.estado.rpcs.site_staff_session_validar = () => [];
  assert.equal((await chamar('handleVacuumSalesList', null, { metodo: 'GET' })).codigo, 401);

  h.estado.rpcs.site_staff_session_validar = () => [{ ...GERENTE, permissions: { campaign_live_view: true } }];
  assert.equal((await chamar('handleVacuumSalesList', null, { metodo: 'GET' })).codigo, 403);
  assert.equal((await chamar('handleVacuumSaleCreate', venda())).codigo, 403);
  assert.equal(vendasGravadas().length, 0);
});

test('quem só vê a lista não lança venda', async () => {
  permissoes = { campaign_sales_view: true };
  const lista = await chamar('handleVacuumSalesList', null, { metodo: 'GET' });
  assert.equal(lista.codigo, 200);
  assert.equal(lista.corpo.can_manage, false);
  assert.equal(lista.corpo.can_launch, false);
  assert.equal((await chamar('handleVacuumSaleCreate', venda())).codigo, 403);
});

test('vendedor lança venda nova, mas só o gerente altera o que foi lançado', async () => {
  permissoes = { campaign_sales_view: true, campaign_sales_launch: true };
  const lista = await chamar('handleVacuumSalesList', null, { metodo: 'GET' });
  assert.equal(lista.corpo.can_launch, true);
  assert.equal(lista.corpo.can_manage, false);
  // Mesmo pedindo "pago", a venda do vendedor fica aguardando até o gerente confirmar.
  assert.equal((await chamar('handleVacuumSaleCreate', venda({ status: 'paid' }))).codigo, 201);
  assert.equal(vendasGravadas()[0].payment_status, 'pending');
  assert.deepEqual(h.estado.tabelas.SITE_Leads?.map((lead) => lead.status), ['New']);

  assert.equal((await chamar('handleVacuumSaleUpdate', venda({ machine_price: 1 }))).codigo, 403);
  assert.equal((await chamar('handleVacuumSaleStatus', { id: ID_1, status: 'paid' })).codigo, 403);
  assert.equal((await chamar('handleVacuumSaleStatus', { id: ID_1, status: 'cancelled' })).codigo, 403);
  assert.equal(vendasGravadas()[0].status, 'pending');
  assert.equal(vendasGravadas()[0].total_value, 7990 + 699 + 100);

  permissoes = { campaign_sales_view: true, campaign_sales_manage: true };
  assert.equal((await chamar('handleVacuumSalesList', null, { metodo: 'GET' })).corpo.can_launch, true);
  assert.equal((await chamar('handleVacuumSaleStatus', { id: ID_1, status: 'paid' })).codigo, 200);
  assert.equal(vendasGravadas()[0].status, 'paid');
});

test('pedido vindo de outro site é recusado', async () => {
  const res = await chamar('handleVacuumSaleCreate', venda(), { origem: 'https://golpe.example.com' });
  assert.equal(res.codigo, 403);
  assert.equal(vendasGravadas().length, 0);
});

test('o servidor soma o total e usa os nomes da oferta, não os do navegador', async () => {
  const res = await chamar('handleVacuumSaleCreate', venda({
    total_value: 1,
    bumps: [{ id: 'borbulhador', name: 'Brinde falso', price: 699 }, { id: 'inexistente', price: 5 }],
  }));
  assert.equal(res.codigo, 201);
  assert.match(res.corpo.order_number, /^WT-VM/);

  const [gravada] = vendasGravadas();
  assert.equal(gravada.id, ID_1);
  assert.equal(gravada.total_value, 8789);
  assert.deepEqual(gravada.items.map((item) => item.name), ['Vacuum Pump Standard W-Tech', 'Câmara Borbulhadora W-Tech']);
  assert.equal(gravada.campaign, CAMPANHA);
  assert.equal(gravada.channel, 'Admin');
  assert.equal(gravada.seller_id, MICHAEL);
  assert.equal(gravada.seller_name, 'Michael');
  assert.equal(gravada.status, 'paid');
  assert.equal(gravada.payment_method, 'Manual - Cartão 10x');
  assert.equal(gravada.delivery_state, 'SP');
  assert.equal(gravada.manual_sale.launched_by.name, 'Gerente');
  assert.equal(gravada.created_at, undefined, 'venda de hoje fica com a hora real do banco');
  assert.equal(h.estado.tabelas.SITE_AuditLogs.length, 1);
});

test('clique duplo não lança duas máquinas', async () => {
  const primeira = await chamar('handleVacuumSaleCreate', venda());
  const segunda = await chamar('handleVacuumSaleCreate', venda());
  assert.equal(segunda.codigo, 200);
  assert.equal(segunda.corpo.order_number, primeira.corpo.order_number);
  assert.equal(vendasGravadas().length, 1);
});

test('dados errados voltam com mensagem e não gravam nada', async () => {
  const amanha = new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10);
  const casos = [
    [{ seller_id: '55555555-5555-4555-8555-555555555555' }, /vendedor/],
    [{ name: 'A' }, /nome/],
    [{ phone: '123' }, /WhatsApp/],
    [{ email: 'sem-arroba' }, /e-mail/],
    [{ document: '111.111.111-11' }, /CPF/],
    [{ machine_price: 0 }, /valor da máquina/],
    [{ machine_price: -5 }, /valor da máquina/],
    [{ shipping_cost: -1 }, /frete/],
    [{ payment: 'cheque' }, /pagamento/],
    [{ installments: 13 }, /parcelas/],
    [{ status: 'qualquer' }, /paga/],
    [{ sale_date: amanha }, /futuro/],
    [{ sale_date: 'ontem' }, /data/],
  ];
  for (const [campo, mensagem] of casos) {
    const res = await chamar('handleVacuumSaleCreate', venda(campo));
    assert.equal(res.codigo, 400, JSON.stringify(campo));
    assert.match(res.corpo.error, mensagem);
  }
  assert.equal(vendasGravadas().length, 0);
});

test('venda de outro dia entra no dia certo do placar', async () => {
  await chamar('handleVacuumSaleCreate', venda({ sale_date: '2026-11-06' }));
  const [gravada] = vendasGravadas();
  assert.equal(gravada.sale_date, '2026-11-06');
  const hoje = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
  if (hoje !== '2026-11-06') assert.equal(gravada.created_at, '2026-11-06T12:00:00-03:00');
});

test('venda paga tira o cliente da recuperação de carrinho', async () => {
  h.estado.tabelas.SITE_CampaignCheckouts = [
    { id: 'c1', campaign: CAMPANHA, phone: '17999991234', stage: 'payment' },
    { id: 'c2', campaign: CAMPANHA, phone: '11888887777', stage: 'payment' },
  ];
  await chamar('handleVacuumSaleCreate', venda());
  const [dele, outro] = h.estado.tabelas.SITE_CampaignCheckouts;
  assert.equal(dele.stage, 'paid');
  assert.equal(dele.sale_id, ID_1);
  assert.equal(outro.stage, 'payment');

  const [ficha] = h.estado.tabelas.SITE_Leads;
  assert.equal(ficha.status, 'Converted');
  assert.equal(ficha.assigned_to, MICHAEL);
  assert.equal(h.chamadasDe('SITE_Tasks', 'PATCH').length, 1);
});

test('venda aguardando pagamento não fecha o carrinho nem converte a ficha', async () => {
  h.estado.tabelas.SITE_CampaignCheckouts = [{ id: 'c1', campaign: CAMPANHA, phone: '17999991234', stage: 'payment' }];
  await chamar('handleVacuumSaleCreate', venda({ status: 'pending' }));
  assert.equal(h.estado.tabelas.SITE_CampaignCheckouts[0].stage, 'payment');
  assert.equal(h.estado.tabelas.SITE_Leads[0].status, 'New');
  assert.equal(vendasGravadas()[0].status, 'pending');
});

test('marcar como pago depois fecha o carrinho e converte', async () => {
  h.estado.tabelas.SITE_CampaignCheckouts = [{ id: 'c1', campaign: CAMPANHA, phone: '17999991234', stage: 'pix_pending' }];
  await chamar('handleVacuumSaleCreate', venda({ status: 'pending' }));
  const res = await chamar('handleVacuumSaleStatus', { id: ID_1, status: 'paid' });
  assert.equal(res.codigo, 200);
  assert.equal(vendasGravadas()[0].status, 'paid');
  assert.equal(vendasGravadas()[0].payment_status, 'paid');
  assert.equal(h.estado.tabelas.SITE_CampaignCheckouts[0].stage, 'paid');
});

test('venda lançada já paga confirma ao cliente pelo WhatsApp', async () => {
  await chamar('handleVacuumSaleCreate', venda());
  await esperarEnvios();
  assert.equal(enviosWhatsApp.length, 1);
  assert.equal(enviosWhatsApp[0].to, '5517999991234');
  assert.equal(enviosWhatsApp[0].template.name, 'vp_pedido_confirmado');
  const params = enviosWhatsApp[0].template.components[0].parameters.map((p) => p.text);
  assert.equal(params[0], 'Cliente');
  assert.equal(params[1], vendasGravadas()[0].order_number);
  assert.match(params[3], /^\d{2}\/\d{2}\/\d{4}$/);
});

test('venda aguardando não avisa o cliente; o aviso sai quando o gerente confirma, uma vez só', async () => {
  await chamar('handleVacuumSaleCreate', venda({ status: 'pending' }));
  await esperarEnvios();
  assert.equal(enviosWhatsApp.length, 0, 'ainda não está paga');

  await chamar('handleVacuumSaleStatus', { id: ID_1, status: 'paid' });
  await esperarEnvios();
  assert.equal(enviosWhatsApp.length, 1);

  await chamar('handleVacuumSaleStatus', { id: ID_1, status: 'cancelled' });
  await chamar('handleVacuumSaleStatus', { id: ID_1, status: 'paid' });
  await esperarEnvios();
  assert.equal(enviosWhatsApp.length, 1, 'cancelar e confirmar de novo não repete a mensagem');
});

test('editar uma venda aguardando para paga confirma ao cliente', async () => {
  await chamar('handleVacuumSaleCreate', venda({ status: 'pending' }));
  await chamar('handleVacuumSaleUpdate', venda({ status: 'paid', name: 'Maria Souza' }));
  await esperarEnvios();
  assert.equal(enviosWhatsApp.length, 1);
  assert.equal(enviosWhatsApp[0].template.components[0].parameters[0].text, 'Maria');
});

test('cancelar muda a situação, sem apagar o pedido', async () => {
  await chamar('handleVacuumSaleCreate', venda());
  const res = await chamar('handleVacuumSaleStatus', { id: ID_1, status: 'cancelled' });
  assert.equal(res.codigo, 200);
  assert.equal(vendasGravadas().length, 1);
  assert.equal(vendasGravadas()[0].status, 'cancelled');
  assert.equal(h.chamadasDe('SITE_Sales', 'DELETE').length, 0);
});

test('editar recalcula o total e guarda quem editou, sem trocar quem lançou', async () => {
  await chamar('handleVacuumSaleCreate', venda());
  permissoes = { campaign_sales_manage: true };
  const res = await chamar('handleVacuumSaleUpdate', venda({ seller_id: EMERSON, machine_price: 7500, bumps: [], shipping_cost: 0, document: '529.982.247-25' }));
  assert.equal(res.codigo, 200);
  const [gravada] = vendasGravadas();
  assert.equal(gravada.total_value, 7500);
  assert.equal(gravada.seller_name, 'Emerson');
  assert.equal(gravada.manual_sale.document, '52998224725');
  assert.equal(gravada.manual_sale.launched_by.name, 'Gerente');
  assert.equal(gravada.manual_sale.updated_by.name, 'Gerente');
  assert.match(gravada.notes, /52998224725/);
});

test('editar pedido já enviado não volta a etapa dele', async () => {
  await chamar('handleVacuumSaleCreate', venda());
  vendasGravadas()[0].status = 'shipped';
  await chamar('handleVacuumSaleUpdate', venda({ status: 'pending' }));
  assert.equal(vendasGravadas()[0].status, 'shipped');
  assert.equal((await chamar('handleVacuumSaleStatus', { id: ID_1, status: 'cancelled' })).codigo, 409);
});

test('venda do site não se altera por aqui', async () => {
  h.estado.tabelas.SITE_Sales = [{ id: ID_2, campaign: CAMPANHA, status: 'paid', manual_sale: null, total_value: 7990, order_number: 'WT-VP1' }];
  assert.equal((await chamar('handleVacuumSaleUpdate', venda({ id: ID_2 }))).codigo, 409);
  assert.equal((await chamar('handleVacuumSaleStatus', { id: ID_2, status: 'cancelled' })).codigo, 409);
  assert.equal(vendasGravadas()[0].status, 'paid');
  assert.equal(vendasGravadas()[0].total_value, 7990);
});

test('venda de outra campanha não é encontrada', async () => {
  h.estado.tabelas.SITE_Sales = [{ id: ID_2, campaign: 'outra', status: 'paid', manual_sale: { launched_by: {} } }];
  assert.equal((await chamar('handleVacuumSaleStatus', { id: ID_2, status: 'cancelled' })).codigo, 404);
});

test('a lista traz a equipe da promoção e só as vendas da campanha', async () => {
  h.estado.tabelas.SITE_Sales = [
    { id: ID_1, campaign: CAMPANHA, status: 'paid', total_value: '7990.00', shipping_cost: null, items: null },
    { id: ID_2, campaign: 'outra', status: 'paid', total_value: 1 },
  ];
  const res = await chamar('handleVacuumSalesList', null, { metodo: 'GET' });
  assert.equal(res.codigo, 200);
  assert.deepEqual(res.corpo.sales.map((sale) => sale.id), [ID_1]);
  assert.equal(res.corpo.sales[0].total_value, 7990);
  assert.deepEqual(res.corpo.sales[0].items, []);
  assert.deepEqual(res.corpo.sellers.map((seller) => seller.name), ['Michael', 'Emerson']);
  assert.equal(res.corpo.offer.price, 7990);
  assert.ok(res.corpo.offer.bumps.length >= 2);
});

// ── Relatório ────────────────────────────────────────────────────────────────

const EQUIPE = [
  { id: MICHAEL, name: 'Michael', label: 'Michael' },
  { id: EMERSON, name: 'Emerson', label: 'Emerson' },
  { id: 'cris', name: 'Christopher', label: 'Cris (Christopher)' },
];
const MAQUINA = { id: 'vacuum_pump_standard', name: 'Vacuum Pump Standard W-Tech', price: 7990, quantity: 1 };
const BORBULHADOR = { id: 'borbulhador', name: 'Câmara Borbulhadora W-Tech', price: 699, quantity: 1 };

const linha = (extra = {}) => ({
  id: String(Math.random()),
  status: 'paid',
  total_value: 7990,
  shipping_cost: 0,
  seller_id: MICHAEL,
  seller_name: 'Michael',
  sale_date: '2026-11-07',
  created_at: '2026-11-07T15:00:00Z',
  items: [MAQUINA],
  manual_sale: { launched_by: {} },
  ...extra,
});

test('relatório soma só venda paga e mostra quem não vendeu', () => {
  const relatorio = h.modulo.buildVacuumReport([
    linha({ total_value: 8689, items: [MAQUINA, BORBULHADOR] }),
    linha({ seller_id: EMERSON, seller_name: 'Emerson' }),
    linha({ seller_id: null, seller_name: 'Compra direta online', manual_sale: null }),
    linha({ status: 'pending' }),
    linha({ status: 'cancelled' }),
    linha({ status: 'producing', sale_date: '2026-11-08' }),
  ], EQUIPE);

  assert.equal(relatorio.totals.machines, 4);
  assert.equal(relatorio.totals.manual, 3);
  assert.equal(relatorio.totals.site, 1);
  assert.equal(relatorio.totals.accessories, 1);
  assert.equal(relatorio.totals.revenue, 8689 + 7990 * 3);
  assert.equal(relatorio.pending.length, 1);
  assert.equal(relatorio.cancelled, 1);

  assert.deepEqual(relatorio.groups.map((grupo) => grupo.name), ['Michael', 'Emerson', 'Cris (Christopher)', 'Direto no site']);
  const michael = relatorio.groups[0];
  assert.equal(michael.machines, 2);
  assert.equal(michael.revenue, 8689 + 7990);
  assert.equal(michael.ticket, (8689 + 7990) / 2);
  assert.equal(relatorio.groups[2].machines, 0);
  const somaParticipacao = relatorio.groups.reduce((soma, grupo) => soma + grupo.share, 0);
  assert.ok(Math.abs(somaParticipacao - 100) < 0.001);
});

test('relatório filtra por período, inclusive nas pontas, e por vendedor', () => {
  const vendas = [
    linha({ sale_date: '2026-11-06' }),
    linha({ sale_date: '2026-11-07', seller_id: EMERSON, seller_name: 'Emerson' }),
    linha({ sale_date: '2026-11-08' }),
    linha({ sale_date: '2026-11-09' }),
  ];
  assert.equal(h.modulo.buildVacuumReport(vendas, EQUIPE, { from: '2026-11-07', to: '2026-11-08' }).totals.machines, 2);
  const soEmerson = h.modulo.buildVacuumReport(vendas, EQUIPE, { sellerKey: EMERSON });
  assert.equal(soEmerson.totals.machines, 1);
  assert.deepEqual(soEmerson.groups.map((grupo) => grupo.name), ['Emerson']);
  const direto = h.modulo.buildVacuumReport([linha({ seller_id: null, manual_sale: null })], EQUIPE, { sellerKey: 'direct' });
  assert.deepEqual(direto.groups.map((grupo) => grupo.name), ['Direto no site']);
});

test('sem data da venda, o dia sai do horário de Brasília e não do UTC', () => {
  const noite = linha({ sale_date: null, created_at: '2026-11-08T01:30:00Z' });
  assert.equal(h.modulo.buildVacuumReport([noite], EQUIPE, { to: '2026-11-07' }).totals.machines, 1);
  assert.equal(h.modulo.buildVacuumReport([noite], EQUIPE, { from: '2026-11-08' }).totals.machines, 0);
});

test('relatório vazio não divide por zero', () => {
  const relatorio = h.modulo.buildVacuumReport([], EQUIPE);
  assert.equal(relatorio.totals.ticket, 0);
  assert.ok(relatorio.groups.every((grupo) => grupo.share === 0 && grupo.ticket === 0));
});

test('textos de pagamento e de itens', () => {
  assert.equal(h.modulo.vacuumManualPaymentLabel('credit', 10), 'Manual - Cartão 10x');
  assert.equal(h.modulo.vacuumManualPaymentLabel('pix', 1), 'Manual - Pix');
  assert.equal(h.modulo.vacuumPaymentShort('Mercado Pago - Pix'), 'Pix');
  assert.equal(h.modulo.vacuumPaymentShort('Manual - Cartão 10x'), 'Cartão 10x');
  assert.equal(h.modulo.vacuumItemsShort([MAQUINA, BORBULHADOR]), 'Máquina + Câmara Borbulhadora');
});
