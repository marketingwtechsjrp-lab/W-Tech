import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { CHAVE_DE_SERVICO, ORIGEM, iniciarHarness } from './_apiHarness.mjs';

// A tela de configurações só grava as chaves de IA e pergunta se existem. O que estes testes
// seguram: o valor salvo nunca volta, campo em branco não apaga, e a rota não grava outra coisa.

const COOKIE = 'wtech_staff_session=sessao-de-teste';

let h;
let servidor;
let base;

before(async () => {
  h = await iniciarHarness("export { staffConfigRouter } from './server/staffConfig.ts'; export { default as express } from 'express';");
  const app = h.modulo.express();
  app.use(h.modulo.express.json());
  app.use('/api/staff/config', h.modulo.staffConfigRouter);
  await new Promise((resolve) => { servidor = app.listen(0, '127.0.0.1', resolve); });
  base = `http://127.0.0.1:${servidor.address().port}/api/staff/config/ai-keys`;
});
after(async () => {
  await new Promise((resolve) => servidor.close(resolve));
  await h.fechar();
});

function novaBase({ permissions = { manage_settings: true }, linhas = [] } = {}) {
  h.estado.tabelas = { SITE_SystemSettings: linhas };
  h.estado.chamadas.length = 0;
  h.estado.rpcs = {
    site_staff_session_validar: () => [{ id: 'u1', name: 'Fulana', email: 'f@w-tech.com', permissions, status: 'Active' }],
  };
}

const salvar = (entries, cabecalhos = {}) => fetch(base, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json', Origin: ORIGEM, Cookie: COOKIE, ...cabecalhos },
  body: JSON.stringify({ entries }),
});
const consultar = (cabecalhos = {}) => fetch(base, { headers: { Origin: ORIGEM, Cookie: COOKIE, ...cabecalhos } });

test('status diz só se cada chave existe, nunca o valor', async () => {
  novaBase({
    linhas: [
      { key: 'openai_api_key', value: 'sk-SEGREDO' },
      { key: 'gemini_api_key', value: '   ' },
    ],
  });
  const res = await consultar();
  assert.equal(res.status, 200);
  const texto = await res.text();
  assert.equal(texto.includes('SEGREDO'), false);
  assert.deepEqual(JSON.parse(texto).configured, {
    openai_api_key: true,
    gemini_api_key: false,
    openrouter_api_key: false,
  });
  assert.equal(res.headers.get('cache-control')?.includes('no-store'), true);
});

test('salvar grava em SITE_SystemSettings com a chave de serviço e não ecoa o valor', async () => {
  novaBase();
  const res = await salvar([{ key: 'openrouter_api_key', value: 'sk-or-SEGREDO' }]);
  assert.equal(res.status, 200);
  assert.equal((await res.text()).includes('SEGREDO'), false);

  const [chamada] = h.chamadasDe('SITE_SystemSettings', 'POST');
  assert.equal(chamada.chave, CHAVE_DE_SERVICO);
  assert.equal(chamada.filtros.on_conflict, 'key');
  assert.deepEqual(chamada.corpo, [{ key: 'openrouter_api_key', value: 'sk-or-SEGREDO' }]);
  assert.equal(h.chamadasDe('SITE_Config', 'POST').length, 0);
});

test('campo em branco mantém a chave atual', async () => {
  novaBase();
  const res = await salvar([
    { key: 'openai_api_key', value: '' },
    { key: 'gemini_api_key', value: '   ' },
    { key: 'openrouter_api_key', value: 'sk-or-nova' },
  ]);
  assert.equal(res.status, 200);
  const [chamada] = h.chamadasDe('SITE_SystemSettings', 'POST');
  assert.deepEqual(chamada.corpo, [{ key: 'openrouter_api_key', value: 'sk-or-nova' }]);
});

test('tudo em branco não grava nada', async () => {
  novaBase();
  const res = await salvar([{ key: 'openai_api_key', value: '' }]);
  assert.equal(res.status, 200);
  assert.equal(h.chamadasDe('SITE_SystemSettings', 'POST').length, 0);
});

for (const chave of ['gtm_id', 'webhook_lead', 'email_smtp_pass', 'preferred_ai_provider']) {
  test(`a rota não vira gravador de configuração: recusa ${chave}`, async () => {
    novaBase();
    const res = await salvar([{ key: chave, value: 'x' }]);
    assert.equal(res.status, 400);
    assert.equal(h.chamadasDe('SITE_SystemSettings', 'POST').length, 0);
  });
}

test('sem manage_settings: 403 para ler e para gravar', async () => {
  novaBase({ permissions: { blog_ai: true } });
  assert.equal((await consultar()).status, 403);
  assert.equal((await salvar([{ key: 'openai_api_key', value: 'x' }])).status, 403);
  assert.equal(h.chamadasDe('SITE_SystemSettings', 'POST').length, 0);
});

test('sem sessão: 401', async () => {
  novaBase();
  h.estado.rpcs.site_staff_session_validar = () => [];
  assert.equal((await consultar()).status, 401);
  assert.equal((await salvar([{ key: 'openai_api_key', value: 'x' }])).status, 401);
});

test('gravação de outra origem é barrada antes de olhar a sessão', async () => {
  novaBase();
  const res = await salvar([{ key: 'openai_api_key', value: 'x' }], { Origin: 'https://outro-site.com' });
  assert.equal(res.status, 403);
  assert.equal(h.chamadasDe('SITE_SystemSettings', 'POST').length, 0);
});
