import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

// Mesmo método dos outros *-unit.test.mjs: o esbuild compila o TypeScript em
// memória e o teste importa o resultado.
async function compilar(contents, platform) {
  const { outputFiles } = await build({
    stdin: { contents, resolveDir: fileURLToPath(new URL('..', import.meta.url)), loader: 'ts' },
    bundle: true,
    write: false,
    format: 'esm',
    platform,
    logLevel: 'silent',
  });
  return import(`data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString('base64')}`);
}

const servidor = await compilar("export * from './api/_dbToken.ts';", 'node');
const navegador = await compilar("export * from './lib/staffDbToken.ts';", 'neutral');

const SEGREDO = 'segredo-de-teste-com-mais-de-32-caracteres!';
const decodificar = (parte) => JSON.parse(Buffer.from(parte, 'base64url').toString('utf8'));

test('passe: JWT HS256 com role authenticated, sub da equipe e 15 minutos', () => {
  const agora = Date.UTC(2026, 9, 6, 19, 0, 0);
  const { token, expiresIn } = servidor.signStaffDbToken('9e731f04-8549-444a-a61f-363d77a66cf8', SEGREDO, agora);
  const [h, p, s] = token.split('.');
  assert.deepEqual(decodificar(h), { alg: 'HS256', typ: 'JWT' });
  const corpo = decodificar(p);
  assert.equal(corpo.role, 'authenticated');
  assert.equal(corpo.sub, '9e731f04-8549-444a-a61f-363d77a66cf8');
  assert.equal(corpo.iat, agora / 1000);
  assert.equal(corpo.exp - corpo.iat, 15 * 60);
  assert.equal(expiresIn, 15 * 60);
  // Assinatura conferida por fora, com HMAC direto (é o que o PostgREST faz).
  assert.equal(s, createHmac('sha256', SEGREDO).update(`${h}.${p}`).digest('base64url'));
});

test('passe: sem segredo (ou curto) não emite nada', () => {
  const antes = process.env.SUPABASE_JWT_SECRET;
  try {
    delete process.env.SUPABASE_JWT_SECRET;
    assert.equal(servidor.issueStaffDbToken('x'), null);
    process.env.SUPABASE_JWT_SECRET = 'curto';
    assert.equal(servidor.issueStaffDbToken('x'), null);
    process.env.SUPABASE_JWT_SECRET = SEGREDO;
    assert.ok(servidor.issueStaffDbToken('x')?.token);
  } finally {
    if (antes === undefined) delete process.env.SUPABASE_JWT_SECRET;
    else process.env.SUPABASE_JWT_SECRET = antes;
  }
});

function cenario({ noPainel = true, respostas = [] } = {}) {
  const estado = { agora: 1_000_000, chamadas: 0, noPainel };
  const fila = [...respostas];
  const fonte = navegador.createStaffDbTokenSource({
    fetch: async () => {
      estado.chamadas += 1;
      const r = fila.shift() ?? { status: 401 };
      if (r.atraso) await r.atraso;
      return { ok: r.status === 200, status: r.status, json: async () => r.corpo };
    },
    now: () => estado.agora,
    inAdminArea: () => estado.noPainel,
  });
  return { estado, fonte };
}
const ok = (token, expiresIn = 900) => ({ status: 200, corpo: { success: true, token, expiresIn } });

test('navegador: fora do painel não pede passe (visitante segue anônimo)', async () => {
  const { estado, fonte } = cenario({ noPainel: false, respostas: [ok('t1')] });
  assert.equal(await fonte.getToken(), null);
  assert.equal(estado.chamadas, 0);
});

test('navegador: no painel pede uma vez, guarda e reaproveita; pedidos simultâneos dividem a mesma chamada', async () => {
  const { estado, fonte } = cenario({ respostas: [ok('t1')] });
  const [a, b] = await Promise.all([fonte.getToken(), fonte.getToken()]);
  assert.equal(a, 't1');
  assert.equal(b, 't1');
  assert.equal(await fonte.getToken(), 't1');
  assert.equal(estado.chamadas, 1);
});

test('navegador: renova faltando menos de 1 minuto, contando pelo relógio local', async () => {
  const { estado, fonte } = cenario({ respostas: [ok('t1'), ok('t2')] });
  assert.equal(await fonte.getToken(), 't1');
  estado.agora += 13 * 60_000;
  assert.equal(await fonte.getToken(), 't1');
  estado.agora += 60_001;
  assert.equal(await fonte.getToken(), 't2');
  assert.equal(estado.chamadas, 2);
});

test('navegador: sem sessão fica anônimo e só pergunta de novo depois de 30 s', async () => {
  const { estado, fonte } = cenario({ respostas: [{ status: 401 }, ok('t1')] });
  assert.equal(await fonte.getToken(), null);
  assert.equal(await fonte.getToken(), null);
  assert.equal(estado.chamadas, 1);
  estado.agora += 30_001;
  assert.equal(await fonte.getToken(), 't1');
  assert.equal(estado.chamadas, 2);
});

test('navegador: login no meio de um pedido descarta a resposta velha (401 de antes do login)', async () => {
  let liberar;
  const atraso = new Promise((r) => { liberar = r; });
  const { estado, fonte } = cenario({ respostas: [{ status: 401, atraso }, ok('depois-do-login')] });
  const antigo = fonte.getToken();
  fonte.reset();
  liberar();
  assert.equal(await antigo, null);
  assert.equal(await fonte.getToken(), 'depois-do-login');
  assert.equal(estado.chamadas, 2);
});
