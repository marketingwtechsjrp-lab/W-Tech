import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { CHAVE_DE_SERVICO, iniciarHarness } from './_apiHarness.mjs';

// A chave anônima não lê mais SITE_CaptureLeads. O que estes testes seguram: a resposta nunca
// traz quem votou, e o navegador só escolhe os campos do formulário.

const CAMPANHA = '22222222-2222-4222-8222-222222222222';
const OPCOES = ['Interlagos', 'Goiania'];

let h;
let publicCapture;

before(async () => {
  h = await iniciarHarness("export { default as publicCapture } from './api/_publicCapture.ts';");
  publicCapture = h.modulo.publicCapture;
});
after(() => h.fechar());

function novaBase({ campanha = {}, leads = [] } = {}) {
  h.estado.tabelas = {
    SITE_CaptureCampaigns: [{ id: CAMPANHA, status: 'active', ends_at: null, config: { options: OPCOES }, ...campanha }],
    SITE_CaptureLeads: leads,
  };
  h.estado.chamadas.length = 0;
}

const envio = (extra = {}) => ({
  action: 'submit',
  campaignId: CAMPANHA,
  name: ' Fulano ',
  email: 'fulano@teste.com',
  phone: '11 99999-8888',
  vote: 'Interlagos',
  consent: true,
  ...extra,
});

test('submit: grava só os campos do formulário e não devolve nada do lead', async () => {
  novaBase();
  const { codigo, corpo } = await h.chamar(publicCapture, envio({
    tracking: { utm_source: 'meta', gclid: 'nao-tem-coluna', landing_page: '/captura/x' },
    sent_to_crm: true,
    crm_lead_id: 'hack',
    id: 'hack',
  }));
  assert.equal(codigo, 200);
  assert.deepEqual(corpo, { ok: true });

  const [chamada] = h.chamadasDe('SITE_CaptureLeads', 'POST');
  assert.equal(chamada.chave, CHAVE_DE_SERVICO);
  assert.equal(chamada.filtros.on_conflict, 'campaign_id,phone');
  assert.deepEqual(chamada.corpo, [{
    campaign_id: CAMPANHA,
    name: 'Fulano',
    email: 'fulano@teste.com',
    phone: '11 99999-8888',
    answer: { vote: 'Interlagos' },
    consent: true,
    utm_source: 'meta',
  }]);
});

test('submit: formulário sem voto continua valendo', async () => {
  novaBase({ campanha: { config: {} } });
  const { codigo } = await h.chamar(publicCapture, envio({ vote: undefined, email: '' }));
  assert.equal(codigo, 200);
  const [{ corpo: [gravado] }] = h.chamadasDe('SITE_CaptureLeads', 'POST');
  assert.deepEqual(gravado.answer, {});
  assert.equal(gravado.email, null);
});

for (const [caso, extra] of [
  ['sem autorização de contato', { consent: false }],
  ['autorização que não é booleano', { consent: 'true' }],
  ['sem nome', { name: '   ' }],
  ['sem telefone', { phone: '' }],
  ['voto fora das opções', { vote: 'Inventado' }],
]) {
  test(`submit: recusa ${caso}`, async () => {
    novaBase();
    const { codigo } = await h.chamar(publicCapture, envio(extra));
    assert.equal(codigo, 400);
    assert.equal(h.chamadasDe('SITE_CaptureLeads', 'POST').length, 0);
  });
}

for (const [caso, campanha] of [
  ['rascunho', { status: 'draft' }],
  ['encerrada', { status: 'ended' }],
  ['com prazo vencido', { ends_at: '2020-01-01T00:00:00Z' }],
]) {
  test(`submit: campanha ${caso} não recebe lead`, async () => {
    novaBase({ campanha });
    const { codigo } = await h.chamar(publicCapture, envio());
    assert.equal(codigo, 404);
    assert.equal(h.chamadasDe('SITE_CaptureLeads', 'POST').length, 0);
  });
}

test('submit: id que não é uuid nem chega ao banco', async () => {
  novaBase();
  const { codigo } = await h.chamar(publicCapture, envio({ campaignId: "1' or '1'='1" }));
  assert.equal(codigo, 404);
  assert.equal(h.estado.chamadas.length, 0);
});

test('results: só a contagem por opção, sem ninguém e sem texto digitado', async () => {
  novaBase({
    leads: [
      { campaign_id: CAMPANHA, name: 'A', phone: '1', answer: { vote: 'Interlagos' } },
      { campaign_id: CAMPANHA, name: 'B', phone: '2', answer: { vote: 'Interlagos' } },
      { campaign_id: CAMPANHA, name: 'C', phone: '3', answer: { vote: 'texto solto de um voto antigo' } },
      { campaign_id: CAMPANHA, name: 'D', phone: '4', answer: { vote: 'constructor' } },
      { campaign_id: CAMPANHA, name: 'E', phone: '5', answer: {} },
      { campaign_id: '33333333-3333-4333-8333-333333333333', name: 'F', phone: '6', answer: { vote: 'Goiania' } },
    ],
  });
  const { codigo, corpo } = await h.chamar(publicCapture, { action: 'results', campaignId: CAMPANHA });
  assert.equal(codigo, 200);
  assert.deepEqual(corpo, { votes: { Interlagos: 2, Goiania: 0 } });

  const [leitura] = h.chamadasDe('SITE_CaptureLeads');
  assert.equal(leitura.select, 'answer');
});

test('results: rascunho não é erro, mas não mostra nada', async () => {
  novaBase({ campanha: { status: 'draft' } });
  const { codigo, corpo } = await h.chamar(publicCapture, { action: 'results', campaignId: CAMPANHA });
  assert.equal(codigo, 200);
  assert.deepEqual(corpo, { votes: {} });
  assert.equal(h.chamadasDe('SITE_CaptureLeads').length, 0);
});

test('results: campanha que não existe', async () => {
  novaBase();
  const { codigo } = await h.chamar(publicCapture, { action: 'results', campaignId: '33333333-3333-4333-8333-333333333333' });
  assert.equal(codigo, 404);
});

test('só POST, só da mesma origem, com ação conhecida e limite por IP', async () => {
  novaBase();
  assert.equal((await h.chamar(publicCapture, envio(), { metodo: 'GET' })).codigo, 405);
  assert.equal((await h.chamar(publicCapture, envio(), { origem: 'https://outro-site.com' })).codigo, 403);
  assert.equal((await h.chamar(publicCapture, { action: 'constructor' })).codigo, 400);

  let ultimo;
  for (let i = 0; i < 31; i += 1) ultimo = await h.chamar(publicCapture, { action: 'results', campaignId: CAMPANHA }, { ip: '10.9.9.9' });
  assert.equal(ultimo.codigo, 429);
});

test('erro do banco não vaza detalhe para o visitante', async () => {
  novaBase();
  h.estado.recusar.add('SITE_CaptureLeads');
  const erroOriginal = console.error;
  console.error = () => {};
  try {
    const { codigo, corpo } = await h.chamar(publicCapture, envio());
    assert.equal(codigo, 500);
    assert.deepEqual(corpo, { error: 'Não foi possível registrar. Tente novamente.' });
  } finally {
    console.error = erroOriginal;
    h.estado.recusar.clear();
  }
});
