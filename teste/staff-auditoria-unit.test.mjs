import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { CHAVE_DE_SERVICO, ORIGEM, iniciarHarness } from './_apiHarness.mjs';

// Login e logout entram em SITE_AuditLogs pelo servidor: fora de /admin o navegador só tem a
// chave anônima, que não grava mais lá. Quem define o nome é a sessão, não o navegador.

const USUARIO = '44444444-4444-4444-8444-444444444444';

let h;
let servidor;
let base;

before(async () => {
  h = await iniciarHarness("export { staffAuthRouter } from './server/staffAuth.ts'; export { default as express } from 'express';");
  const app = h.modulo.express();
  app.use(h.modulo.express.json());
  app.use('/api/staff', h.modulo.staffAuthRouter);
  await new Promise((resolve) => { servidor = app.listen(0, '127.0.0.1', resolve); });
  base = `http://127.0.0.1:${servidor.address().port}`;
});
after(async () => {
  await new Promise((resolve) => servidor.close(resolve));
  await h.fechar();
});

function novaBase() {
  const linha = { id: USUARIO, name: 'Fulana', email: 'fulana@w-tech.com', role_id: null, permissions: {}, status: 'Active' };
  h.estado.tabelas = {};
  h.estado.chamadas.length = 0;
  h.estado.recusar.clear();
  h.estado.rpcs = {
    site_staff_session_criar: () => [{ ...linha, token: 'token-de-teste' }],
    site_staff_session_validar: () => [linha],
    site_staff_session_revogar: () => null,
  };
}

const enviar = (rota, corpo, cabecalhos = {}) => fetch(`${base}/api/staff/${rota}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Origin: ORIGEM, ...cabecalhos },
  body: JSON.stringify(corpo),
});

const login = () => enviar('login', { email: 'fulana@w-tech.com', password: 'senha' });

test('login entra na auditoria, com a chave de serviço e o nome da sessão', async () => {
  novaBase();
  const res = await login();
  assert.equal(res.status, 200);

  const [chamada] = h.chamadasDe('SITE_AuditLogs', 'POST');
  assert.equal(chamada.chave, CHAVE_DE_SERVICO);
  assert.deepEqual(chamada.corpo, {
    user_id: USUARIO,
    user_name: 'Fulana',
    action_type: 'ACCESS',
    screen: 'login',
    details: 'Usuário efetuou login no sistema',
  });
});

test('login recusado não registra nada', async () => {
  novaBase();
  h.estado.rpcs.site_staff_session_criar = () => [];
  const res = await login();
  assert.equal(res.status, 401);
  assert.equal(h.chamadasDe('SITE_AuditLogs', 'POST').length, 0);
});

test('auditoria fora do ar não impede o login', async () => {
  novaBase();
  h.estado.recusar.add('SITE_AuditLogs');
  const erroOriginal = console.error;
  console.error = () => {};
  try {
    const res = await login();
    assert.equal(res.status, 200);
    assert.equal((await res.json()).success, true);
  } finally {
    console.error = erroOriginal;
  }
});

test('logout entra na auditoria com quem estava logado', async () => {
  novaBase();
  const entrada = await login();
  const cookie = entrada.headers.get('set-cookie').split(';')[0];
  h.estado.chamadas.length = 0;

  const res = await enviar('logout', {}, { Cookie: cookie });
  assert.equal(res.status, 200);

  const [chamada] = h.chamadasDe('SITE_AuditLogs', 'POST');
  assert.equal(chamada.corpo.user_id, USUARIO);
  assert.equal(chamada.corpo.user_name, 'Fulana');
  assert.equal(chamada.corpo.screen, 'logout');
});

test('logout sem sessão não registra ninguém', async () => {
  novaBase();
  const res = await enviar('logout', {});
  assert.equal(res.status, 200);
  assert.equal(h.chamadasDe('SITE_AuditLogs', 'POST').length, 0);
});
