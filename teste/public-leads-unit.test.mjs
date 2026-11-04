import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { iniciarHarness } from './_apiHarness.mjs';

// A chave anônima não lê mais SITE_Leads. O que estes testes seguram: mandar o e-mail de
// outra pessoa não devolve nada da ficha dela, e campo que só a equipe define não passa.

const LEAD_ID = '11111111-1111-4111-8111-111111111111';
const ATENDENTE = '30c76614-3df4-47c5-89e7-6987b8328d8f';
const OUTRO_ATENDENTE = '95cfe965-58f8-4f11-9449-464fabac15d9';

let h;
let publicLeads;

before(async () => {
  h = await iniciarHarness("export { default as publicLeads } from './api/_publicLeads.ts'; export * from './lib/publicLeads.ts';");
  publicLeads = h.modulo.publicLeads;
});
after(() => h.fechar());

function fichaExistente(extra = {}) {
  return {
    id: LEAD_ID,
    name: 'Fulano Antigo',
    email: 'fulano@teste.com',
    phone: '(11) 99999-8888',
    status: 'Contacted',
    assigned_to: ATENDENTE,
    tags: ['tag_antiga'],
    cpf: '123.456.789-00',
    internal_notes: 'nota interna',
    utm_source: 'google',
    created_at: '2026-01-01T00:00:00+00:00',
    ...extra,
  };
}

function novaBase(leads = []) {
  h.estado.tabelas = { SITE_Leads: leads, SITE_SystemSettings: [] };
  h.estado.chamadas.length = 0;
  h.estado.webhooks.length = 0;
}

const formulario = (extra = {}) => ({ name: 'Fulano Novo', email: 'FULANO@teste.com', phone: '11 99999-8888', type: 'Contact_Form', context_id: 'LP: teste', tags: ['nova'], ...extra });

test('upsert: pessoa nova entra só com campos de formulário e status New', async () => {
  novaBase();
  const { codigo, corpo } = await h.chamar(publicLeads, {
    action: 'upsert',
    lead: formulario({
      email: 'novo@teste.com',
      phone: '11 90000-0000',
      status: 'Converted',
      assigned_to: ATENDENTE,
      utm_source: 'meta',
      // Nada disto pode vir do navegador:
      client_code: 'HACK-00AAA',
      cpf: '999',
      is_accredited: true,
      pricing_level: 'distribuidor',
      conversion_value: 99999,
      internal_notes: 'x',
      id: LEAD_ID,
    }),
  });
  assert.equal(codigo, 200);
  assert.equal(corpo.action, 'created');
  assert.deepEqual(Object.keys(corpo).sort(), ['action', 'id']);

  const [{ corpo: [gravado] }] = h.chamadasDe('SITE_Leads', 'POST');
  assert.equal(gravado.status, 'New');
  assert.equal(gravado.assigned_to, ATENDENTE);
  assert.equal(gravado.utm_source, 'meta');
  for (const proibido of ['client_code', 'cpf', 'is_accredited', 'pricing_level', 'conversion_value', 'internal_notes', 'id']) {
    assert.equal(proibido in gravado, false, `${proibido} chegou ao banco`);
  }
});

test('upsert: e-mail de outra pessoa não devolve nada da ficha dela', async () => {
  novaBase([fichaExistente()]);
  const { codigo, corpo } = await h.chamar(publicLeads, { action: 'upsert', lead: formulario() });
  assert.equal(codigo, 200);
  assert.deepEqual(corpo, { action: 'updated', id: LEAD_ID });
});

test('upsert: recadastro mantém o dono, junta tags e não desfaz venda nem o primeiro toque', async () => {
  novaBase([fichaExistente({ status: 'Converted' })]);
  await h.chamar(publicLeads, {
    action: 'upsert',
    lead: formulario({ assigned_to: OUTRO_ATENDENTE, utm_source: 'meta', utm_medium: 'cpc' }),
  });
  const [ficha] = h.estado.tabelas.SITE_Leads;
  assert.equal(ficha.assigned_to, ATENDENTE);
  assert.equal(ficha.status, 'Converted');
  assert.deepEqual(ficha.tags, ['tag_antiga', 'nova']);
  assert.equal(ficha.utm_source, 'google');
  assert.equal(ficha.utm_medium, 'cpc');
  assert.equal(ficha.cpf, '123.456.789-00');
  assert.equal(ficha.internal_notes, 'nota interna');
});

test('upsert: webhook de lead sai do servidor, no formato de sempre', async () => {
  novaBase([fichaExistente()]);
  h.estado.tabelas.SITE_SystemSettings = [{ key: 'webhook_lead', value: `${h.urlBanco}/webhook` }];
  await h.chamar(publicLeads, { action: 'upsert', lead: formulario() });
  for (let i = 0; i < 50 && h.estado.webhooks.length === 0; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  const [webhook] = h.estado.webhooks;
  assert.equal(webhook.event, 'webhook_lead');
  assert.equal(webhook.data.id, LEAD_ID);
  assert.equal(webhook.data.assigned_to, ATENDENTE);
  assert.ok(webhook.timestamp);
});

test('create: insert simples, sem procurar ficha, devolve só o id', async () => {
  novaBase([fichaExistente()]);
  const { codigo, corpo } = await h.chamar(publicLeads, { action: 'create', lead: formulario({ quiz_data: { theme: 'x' }, notes: 'motivo' }) });
  assert.equal(codigo, 201);
  assert.deepEqual(Object.keys(corpo), ['id']);
  assert.equal(h.estado.tabelas.SITE_Leads.length, 2);
  assert.equal(h.chamadasDe('SITE_Leads').length, 0);
  const novo = h.estado.tabelas.SITE_Leads[1];
  assert.deepEqual(novo.quiz_data, { theme: 'x' });
  assert.equal(novo.notes, 'motivo');
});

test('quiz: grava só o resultado, na ficha certa', async () => {
  novaBase([fichaExistente()]);
  const { codigo } = await h.chamar(publicLeads, {
    action: 'quiz',
    id: LEAD_ID,
    result: { type: 'Quiz_Completed', context_id: 'Quiz', tags: ['quente'], quiz_data: { score: 90 }, status: 'Converted', cpf: '000', assigned_to: OUTRO_ATENDENTE },
  });
  assert.equal(codigo, 200);
  const [ficha] = h.estado.tabelas.SITE_Leads;
  assert.equal(ficha.type, 'Quiz_Completed');
  assert.deepEqual(ficha.quiz_data, { score: 90 });
  assert.equal(ficha.status, 'Contacted');
  assert.equal(ficha.cpf, '123.456.789-00');
  assert.equal(ficha.assigned_to, ATENDENTE);

  assert.equal((await h.chamar(publicLeads, { action: 'quiz', id: '77777777-7777-4777-8777-777777777777', result: { type: 'x' } })).codigo, 404);
  assert.equal((await h.chamar(publicLeads, { action: 'quiz', id: 'nao-e-uuid', result: { type: 'x' } })).codigo, 400);
  assert.equal((await h.chamar(publicLeads, { action: 'quiz', id: LEAD_ID, result: { status: 'x' } })).codigo, 400);
});

test('checkout: atualiza a ficha do id, de quem já existe, ou cria', async () => {
  novaBase([fichaExistente()]);
  const lead = { name: 'Fulano', email: 'fulano@teste.com', phone: '11999998888', type: 'Course_Registration', context_id: 'CHECKOUT', tags: ['SINAL'], assigned_to: OUTRO_ATENDENTE };

  const peloId = await h.chamar(publicLeads, { action: 'checkout', id: LEAD_ID, lead, cpf: '11122233344' });
  assert.deepEqual(peloId.corpo, { id: LEAD_ID, created: false });
  assert.equal(h.estado.tabelas.SITE_Leads[0].cpf, '11122233344');
  assert.equal(h.estado.tabelas.SITE_Leads[0].assigned_to, ATENDENTE);

  const semCpf = await h.chamar(publicLeads, { action: 'checkout', lead, cpf: null });
  assert.deepEqual(semCpf.corpo, { id: LEAD_ID, created: false });
  assert.equal(h.estado.tabelas.SITE_Leads[0].cpf, '11122233344');

  novaBase();
  const novo = await h.chamar(publicLeads, { action: 'checkout', id: null, lead, cpf: '11122233344' });
  assert.equal(novo.codigo, 201);
  assert.equal(novo.corpo.created, true);
  const [criado] = h.estado.tabelas.SITE_Leads;
  assert.equal(criado.status, 'New');
  assert.equal(criado.cpf, '11122233344');
  assert.equal(criado.assigned_to, OUTRO_ATENDENTE);
});

test('entradas inválidas: sem nome ou contato, ação estranha, origem de fora, método errado', async () => {
  novaBase();
  for (const lead of [undefined, null, 'x', {}, { name: 'Só nome' }, { email: 'a@b.c' }, { name: '   ', phone: '1' }]) {
    assert.equal((await h.chamar(publicLeads, { action: 'upsert', lead })).codigo, 400);
    assert.equal((await h.chamar(publicLeads, { action: 'create', lead })).codigo, 400);
  }
  assert.equal((await h.chamar(publicLeads, { action: 'apagar' })).codigo, 400);
  assert.equal((await h.chamar(publicLeads, { action: 'constructor' })).codigo, 400);
  assert.equal((await h.chamar(publicLeads, { action: 'upsert', lead: formulario() }, { origem: 'https://atacante.exemplo' })).codigo, 403);
  const get = await h.chamar(publicLeads, null, { metodo: 'GET' });
  assert.equal(get.codigo, 405);
  assert.equal(get.cabecalhos.allow, 'POST');
  assert.equal(h.estado.chamadas.length, 0);
});

test('limite por IP', async () => {
  novaBase();
  const ip = '10.8.8.8';
  for (let i = 0; i < 30; i += 1) {
    assert.equal((await h.chamar(publicLeads, { action: 'upsert' }, { ip })).codigo, 400);
  }
  assert.equal((await h.chamar(publicLeads, { action: 'upsert' }, { ip })).codigo, 429);
});

test('sanitizeLeadFields: corta excesso e ignora o que não conhece', () => {
  const { sanitizeLeadFields } = h.modulo;
  const limpo = sanitizeLeadFields({
    name: `  ${'x'.repeat(500)}  `,
    phone: '11999998888',
    tags: ['a', 7, '', 'b'.repeat(200), ...Array(50).fill('c')],
    quiz_data: { grande: 'y'.repeat(30_000) },
    assigned_to: 'nao-e-uuid',
    inventado: 'z',
  });
  assert.equal(limpo.name.length, 200);
  assert.equal(limpo.tags.length, 30);
  assert.equal(limpo.tags[1].length, 100);
  assert.equal('quiz_data' in limpo, false);
  assert.equal('assigned_to' in limpo, false);
  assert.equal('inventado' in limpo, false);
});
