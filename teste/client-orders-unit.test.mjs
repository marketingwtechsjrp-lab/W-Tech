import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

// Roda os handlers de verdade, com o supabase-js de verdade, contra um PostgREST
// falso. A pergunta central destes testes: o que o banco devolve de dado pessoal
// nunca pode chegar ao navegador, e o navegador não escolhe dono nem preço.

const ORIGEM = 'https://w-techbrasil.com.br';
const CPF_NAS_NOTAS = 'CPF 123.456.789-00';
const CLIENTE = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Cliente Teste',
  email: 'cliente@teste.com',
  phone: '11999990000',
  assigned_to: '99999999-9999-4999-8999-999999999999',
};
const PRODUTO = { id: '22222222-2222-4222-8222-222222222222', name: 'Vacuum Pump', sale_price: '1500.50' };
const CURSO = { id: '33333333-3333-4333-8333-333333333333', title: 'Curso de Suspensão', price: 800 };

/** Linha como o banco guarda: com os dados pessoais que não podem sair. */
function linhaPedido(extra = {}) {
  return {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    status: 'paid',
    created_at: '2026-11-01T10:00:00+00:00',
    tracking_code: 'AA123456789BR',
    shipping_method: 'PAC',
    total_value: 1500.5,
    shipping_cost: 30,
    insurance_cost: 0,
    discount_amount: 10,
    payment_method: 'Pix',
    items: JSON.stringify([{ productId: PRODUTO.id, sku: 'VP-1', name: 'Vacuum Pump', quantity: 1, price: 1500.5 }]),
    client_name: 'Cliente Teste',
    client_email: 'cliente@teste.com',
    client_phone: '11999990000',
    customer_name: 'Cliente Teste',
    customer_email: 'cliente@teste.com',
    customer_phone: '11999990000',
    notes: CPF_NAS_NOTAS,
    delivery_street: 'Rua Secreta',
    delivery_number: '42',
    delivery_cep: '01001000',
    delivery_city: 'São Paulo',
    stripe_payment_url: 'https://pagamento.exemplo/x',
    seller_id: CLIENTE.assigned_to,
    ...extra,
  };
}

let tabelas;
let chamadas;
let servidor;
let modulo;
let pastaTemporaria;
let ipSeguinte = 1;

function filtroDaUrl(url) {
  const filtros = {};
  for (const [chave, valor] of url.searchParams) {
    if (!['select', 'order', 'limit', 'offset'].includes(chave)) filtros[chave] = valor;
  }
  return filtros;
}

function casa(linha, filtros) {
  return Object.entries(filtros).every(([coluna, condicao]) => {
    if (condicao.startsWith('eq.')) return String(linha[coluna]) === condicao.slice(3);
    if (condicao.startsWith('in.(')) {
      const valores = condicao.slice(4, -1).split(',').map((v) => v.replaceAll('"', ''));
      return valores.includes(String(linha[coluna]));
    }
    return false;
  });
}

before(async () => {
  servidor = createServer((req, res) => {
    let corpo = '';
    req.on('data', (parte) => { corpo += parte; });
    req.on('end', () => {
      const url = new URL(req.url, 'http://local');
      const tabela = decodeURIComponent(url.pathname.split('/').pop());
      const filtros = filtroDaUrl(url);
      chamadas.push({
        metodo: req.method,
        tabela,
        filtros,
        select: url.searchParams.get('select'),
        corpo: corpo ? JSON.parse(corpo) : null,
        chave: req.headers.apikey,
      });
      res.setHeader('Content-Type', 'application/json');
      if (req.method === 'POST') {
        res.statusCode = 201;
        return res.end('[]');
      }
      const linhas = (tabelas[tabela] ?? []).filter((linha) => casa(linha, filtros));
      const umaSo = String(req.headers.accept || '').includes('vnd.pgrst.object');
      res.end(JSON.stringify(umaSo ? (linhas[0] ?? null) : linhas));
    });
  });
  await new Promise((resolve) => servidor.listen(0, '127.0.0.1', resolve));

  // Mesmo método dos outros *-unit.test.mjs (esbuild em memória), mas gravado em
  // arquivo: as dependências CJS do supabase-js pedem o shim de require do build-server.
  const { outputFiles } = await build({
    // O ambiente entra no bundle, sem tocar em process.env: o Playwright também carrega
    // este arquivo e divide o processo com outros specs, que olham essas variáveis.
    define: {
      'process.env.VITE_SUPABASE_URL': JSON.stringify(`http://127.0.0.1:${servidor.address().port}`),
      'process.env.SUPABASE_SERVICE_ROLE_KEY': JSON.stringify('chave-service-role-de-teste'),
      'process.env.STAFF_TRUSTED_ORIGINS': JSON.stringify(ORIGEM),
    },
    stdin: {
      contents: "export { default as clientOrders, orderTracking } from './api/_clientOrders.ts'; export * from './lib/clientOrders.ts';",
      resolveDir: fileURLToPath(new URL('..', import.meta.url)),
      loader: 'ts',
    },
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'node',
    logLevel: 'silent',
    external: ['bufferutil', 'utf-8-validate'],
    banner: { js: "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);" },
  });
  pastaTemporaria = await mkdtemp(join(tmpdir(), 'client-orders-'));
  const arquivo = join(pastaTemporaria, 'modulo.mjs');
  await writeFile(arquivo, outputFiles[0].text);
  modulo = await import(pathToFileURL(arquivo).href);
});

after(async () => {
  await new Promise((resolve) => servidor.close(resolve));
  await rm(pastaTemporaria, { recursive: true, force: true });
});

function novaBase() {
  tabelas = {
    SITE_Sales: [linhaPedido()],
    SITE_Leads: [{ ...CLIENTE, client_code: 'CLI-12ABC' }],
    SITE_Mechanics: [],
    SITE_Products: [{ ...PRODUTO, type: 'product' }, { id: '44444444-4444-4444-8444-444444444444', name: 'Curso', sale_price: 1, type: 'course' }],
    SITE_Courses: [{ ...CURSO, status: 'Published' }, { id: '55555555-5555-4555-8555-555555555555', title: 'Rascunho', price: 1, status: 'Draft' }],
  };
  chamadas = [];
}

/** Cada chamada tem IP próprio: o limite por IP só entra no teste dele. */
async function chamar(handler, corpo, { metodo = 'POST', origem = ORIGEM, ip } = {}) {
  const resposta = { codigo: 0, corpo: null, cabecalhos: {} };
  const res = {
    setHeader(nome, valor) { resposta.cabecalhos[nome.toLowerCase()] = valor; },
    status(codigo) { resposta.codigo = codigo; return this; },
    json(dados) { resposta.corpo = dados; return this; },
  };
  const req = {
    method: metodo,
    body: corpo,
    headers: { origin: origem, 'x-real-ip': ip ?? `10.0.${Math.floor(ipSeguinte / 250)}.${(ipSeguinte++ % 250) + 1}` },
  };
  await handler(req, res);
  return resposta;
}

const chamadasDe = (tabela, metodo = 'GET') => chamadas.filter((c) => c.tabela === tabela && c.metodo === metodo);

function semDadoPessoal(valor) {
  const texto = JSON.stringify(valor);
  for (const proibido of ['Cliente Teste', 'cliente@teste.com', '11999990000', CPF_NAS_NOTAS, 'Rua Secreta', '01001000', 'São Paulo', 'pagamento.exemplo', CLIENTE.assigned_to, 'VP-1']) {
    assert.equal(texto.includes(proibido), false, `vazou "${proibido}" em ${texto}`);
  }
}

test('rastreio: acha pelo código e devolve só status, envio e itens', async () => {
  novaBase();
  const { codigo, corpo, cabecalhos } = await chamar(modulo.orderTracking, { code: ' aa123456789br ' });
  assert.equal(codigo, 200);
  assert.deepEqual(corpo.order, {
    reference: 'AAAAAAAA',
    status: 'paid',
    created_at: '2026-11-01T10:00:00+00:00',
    shipping_method: 'PAC',
    total_value: 1500.5,
    items: [{ name: 'Vacuum Pump', quantity: 1, price: 1500.5 }],
  });
  semDadoPessoal(corpo);
  assert.equal(cabecalhos['cache-control'], 'private, no-store');

  const [consulta] = chamadasDe('SITE_Sales');
  assert.equal(consulta.filtros.tracking_code, 'eq.AA123456789BR');
  assert.equal(consulta.chave, 'chave-service-role-de-teste');
  // Nem pede ao banco as colunas de contato, endereço ou notas.
  assert.doesNotMatch(consulta.select, /client_|customer_|notes|delivery_|shipping_address/);
});

test('rastreio: id do pedido ainda funciona, e texto qualquer não vira consulta por uuid', async () => {
  novaBase();
  const porId = await chamar(modulo.orderTracking, { code: 'AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA' });
  assert.equal(porId.codigo, 200);
  assert.equal(chamadasDe('SITE_Sales').at(-1).filtros.id, 'eq.aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');

  novaBase();
  const inexistente = await chamar(modulo.orderTracking, { code: 'BB000000000BR' });
  assert.equal(inexistente.codigo, 404);
  assert.equal(chamadasDe('SITE_Sales').length, 1);
  assert.equal(chamadasDe('SITE_Sales')[0].filtros.id, undefined);
});

test('rastreio: código duplicado não mostra pedido de ninguém', async () => {
  novaBase();
  tabelas.SITE_Sales.push(linhaPedido({ id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' }));
  assert.equal((await chamar(modulo.orderTracking, { code: 'AA123456789BR' })).codigo, 404);
});

test('rotas públicas: só POST, só do próprio site, e entrada estranha não consulta nada', async () => {
  for (const handler of [modulo.orderTracking, modulo.clientOrders]) {
    novaBase();
    const get = await chamar(handler, null, { metodo: 'GET' });
    assert.equal(get.codigo, 405);
    assert.equal(get.cabecalhos.allow, 'POST');
    assert.equal((await chamar(handler, { code: 'CLI-12ABC', action: 'list' }, { origem: 'https://atacante.exemplo' })).codigo, 403);
    for (const code of [undefined, 123, '', '   ', 'X'.repeat(65), { $ne: null }]) {
      assert.equal((await chamar(handler, { code, action: 'list' })).codigo, 404);
    }
    assert.equal(chamadas.length, 0);
  }
});

test('rotas públicas: limite por IP segura tentativas de adivinhar código', async () => {
  novaBase();
  const ip = '10.9.9.9';
  for (let i = 0; i < 15; i += 1) {
    assert.equal((await chamar(modulo.clientOrders, { code: 'NAO-00AAA', action: 'list' }, { ip })).codigo, 404);
  }
  assert.equal((await chamar(modulo.clientOrders, { code: 'NAO-00AAA', action: 'list' }, { ip })).codigo, 429);
  // O outro endpoint e o outro IP têm contas próprias.
  assert.equal((await chamar(modulo.orderTracking, { code: 'NAO-00AAA' }, { ip })).codigo, 404);
  assert.equal((await chamar(modulo.clientOrders, { code: 'CLI-12ABC', action: 'list' })).codigo, 200);
});

test('portal: dono vem do código, não do que o navegador manda', async () => {
  novaBase();
  tabelas.SITE_Sales = [linhaPedido({ client_id: '00000000-0000-4000-8000-000000000000', client_email: 'vitima@teste.com' })];
  const { codigo, corpo } = await chamar(modulo.clientOrders, {
    code: 'cli-12abc',
    action: 'list',
    client_id: '00000000-0000-4000-8000-000000000000',
    client_email: 'vitima@teste.com',
  });
  assert.equal(codigo, 200);
  const filtros = chamadasDe('SITE_Sales').map((c) => c.filtros);
  assert.deepEqual(filtros, [{ client_id: `eq.${CLIENTE.id}` }, { client_email: `eq.${CLIENTE.email}` }]);
  assert.deepEqual(corpo.orders, []);
});

test('portal: junta por id e e-mail sem repetir, do mais novo ao mais antigo, sem dado pessoal', async () => {
  novaBase();
  tabelas.SITE_Sales = [
    linhaPedido({ client_id: CLIENTE.id, created_at: '2026-10-01T10:00:00+00:00' }),
    linhaPedido({ id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', client_email: CLIENTE.email, client_id: null, created_at: '2026-11-02T10:00:00+00:00' }),
    linhaPedido({ id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', client_id: 'outro', client_email: 'outro@teste.com', created_at: '2026-11-03T10:00:00+00:00' }),
  ];
  const { corpo } = await chamar(modulo.clientOrders, { code: 'CLI-12ABC', action: 'list' });
  assert.deepEqual(corpo.orders.map((o) => o.id), ['cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa']);
  assert.deepEqual(Object.keys(corpo.orders[0]).sort(), [
    'created_at', 'discount_amount', 'id', 'insurance_cost', 'items', 'payment_method',
    'shipping_cost', 'status', 'total_value', 'tracking_code',
  ]);
  assert.deepEqual(corpo.orders[0].items, [{ name: 'Vacuum Pump', quantity: 1, price: 1500.5 }]);
  semDadoPessoal(corpo);
  assert.doesNotMatch(chamadasDe('SITE_Sales')[0].select, /client_|customer_|notes|delivery_|stripe/);
});

test('portal: cadastro sem e-mail não casa com pedidos sem e-mail', async () => {
  novaBase();
  tabelas.SITE_Leads = [{ ...CLIENTE, email: null, client_code: 'CLI-12ABC' }];
  await chamar(modulo.clientOrders, { code: 'CLI-12ABC', action: 'list' });
  assert.deepEqual(chamadasDe('SITE_Sales').map((c) => c.filtros), [{ client_id: `eq.${CLIENTE.id}` }]);
});

test('portal: mecânico entra pelo código, e código repetido não entra', async () => {
  novaBase();
  tabelas.SITE_Leads = [];
  tabelas.SITE_Mechanics = [{ ...CLIENTE, client_code: 'MEC-12ABC' }];
  assert.equal((await chamar(modulo.clientOrders, { code: 'MEC-12ABC', action: 'list' })).codigo, 200);

  novaBase();
  tabelas.SITE_Leads.push({ ...CLIENTE, id: 'outro', client_code: 'CLI-12ABC' });
  assert.equal((await chamar(modulo.clientOrders, { code: 'CLI-12ABC', action: 'list' })).codigo, 404);
  assert.equal(chamadasDe('SITE_Sales').length, 0);
});

test('portal: novo pedido usa preço e cliente do banco, nunca do navegador', async () => {
  novaBase();
  const { codigo } = await chamar(modulo.clientOrders, {
    code: 'CLI-12ABC',
    action: 'order',
    status: 'paid',
    total_value: 1,
    client_email: 'vitima@teste.com',
    items: [{ productId: PRODUTO.id, quantity: 2, price: 0.01, sale_price: 0.01, name: 'Hackeado' }],
  });
  assert.equal(codigo, 201);
  const [{ corpo }] = chamadasDe('SITE_Sales', 'POST');
  const [pedido] = corpo;
  assert.deepEqual(JSON.parse(pedido.items), [{ productId: PRODUTO.id, name: 'Vacuum Pump', quantity: 2, price: 1500.5 }]);
  assert.equal(pedido.total_value, 3001);
  assert.equal(pedido.status, 'pending');
  assert.equal(pedido.channel, 'Admin');
  assert.equal(pedido.client_id, CLIENTE.id);
  assert.equal(pedido.client_name, CLIENTE.name);
  assert.equal(pedido.client_email, CLIENTE.email);
  assert.equal(pedido.client_phone, CLIENTE.phone);
  assert.equal(pedido.seller_id, CLIENTE.assigned_to);
});

test('portal: carrinho inválido ou produto fora de venda não gera pedido', async () => {
  const invalidos = [
    undefined,
    [],
    'x',
    [{ productId: 'nao-e-uuid', quantity: 1 }],
    [{ productId: PRODUTO.id, quantity: 0 }],
    [{ productId: PRODUTO.id, quantity: 1.5 }],
    [{ productId: PRODUTO.id, quantity: 10000 }],
    [{ productId: PRODUTO.id, quantity: '2' }],
    [null],
    [{ productId: '77777777-7777-4777-8777-777777777777', quantity: 1 }],
    // Curso é vendido pela matrícula: o id dele não passa como produto.
    [{ productId: '44444444-4444-4444-8444-444444444444', quantity: 1 }],
  ];
  for (const items of invalidos) {
    novaBase();
    const { codigo } = await chamar(modulo.clientOrders, { code: 'CLI-12ABC', action: 'order', items });
    assert.equal(codigo, 400, JSON.stringify(items));
    assert.equal(chamadasDe('SITE_Sales', 'POST').length, 0);
  }
});

test('portal: matrícula só em curso publicado, com o preço do curso', async () => {
  novaBase();
  assert.equal((await chamar(modulo.clientOrders, { code: 'CLI-12ABC', action: 'enroll', courseId: CURSO.id, price: 1 })).codigo, 201);
  const [pedido] = chamadasDe('SITE_Sales', 'POST')[0].corpo;
  assert.equal(pedido.total_value, 800);
  assert.deepEqual(JSON.parse(pedido.items), [{
    productId: CURSO.id,
    name: 'Inscrição: Curso de Suspensão',
    quantity: 1,
    price: 800,
    type: 'course_enrollment',
  }]);

  for (const courseId of ['55555555-5555-4555-8555-555555555555', 'nao-e-uuid', undefined]) {
    novaBase();
    assert.equal((await chamar(modulo.clientOrders, { code: 'CLI-12ABC', action: 'enroll', courseId })).codigo, 400);
    assert.equal(chamadasDe('SITE_Sales', 'POST').length, 0);
  }
});

test('portal: ação desconhecida não faz nada', async () => {
  novaBase();
  assert.equal((await chamar(modulo.clientOrders, { code: 'CLI-12ABC', action: 'delete' })).codigo, 400);
  assert.equal(chamadasDe('SITE_Sales').length + chamadasDe('SITE_Sales', 'POST').length, 0);
});

test('parseOrderItems: lê texto ou lista, e descarta o que não é item', () => {
  const lista = [{ name: 'A', quantity: '2', price: '10.5', sku: 'X', productId: 'Y' }, null, 'lixo', { quantity: 0 }];
  const esperado = [{ name: 'A', quantity: 2, price: 10.5 }, { name: 'Produto', quantity: 1, price: 0 }];
  assert.deepEqual(modulo.parseOrderItems(lista), esperado);
  assert.deepEqual(modulo.parseOrderItems(JSON.stringify(lista)), esperado);
  for (const bruto of [null, undefined, '', 'não é json', '{"a":1}', 42]) {
    assert.deepEqual(modulo.parseOrderItems(bruto), []);
  }
});
