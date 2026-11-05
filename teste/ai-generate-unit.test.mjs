import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { iniciarHarness } from './_apiHarness.mjs';

// A IA do painel passa pelo servidor. O que estes testes seguram: a chave vai para o provedor e
// nunca volta na resposta nem no log, e só quem usa IA em alguma tela consegue gastar crédito.
//
// O fetch de mentira entra só no bundle (`define`), nunca em globalThis.fetch: o Playwright também
// carrega este arquivo. O banco é o PostgREST falso do harness, chamado de verdade.

const COOKIE = 'wtech_staff_session=sessao-de-teste';
const CHAVES = {
  openai_api_key: 'sk-openai-SEGREDO',
  gemini_api_key: 'gemini-SEGREDO',
  openrouter_api_key: 'sk-or-SEGREDO',
};
const fetchAntes = globalThis.fetch;
const ePedidoAoProvedor = (url) => /api\.openai\.com|openrouter\.ai|generativelanguage\.googleapis\.com/.test(url);

const provedor = { pedidos: [], responder: null };

globalThis.__fetchDoTesteIA = async (url, init = {}) => {
  const endereco = String(url);
  if (!ePedidoAoProvedor(endereco)) return fetchAntes(url, init);
  provedor.pedidos.push({ url: endereco, headers: init.headers, corpo: JSON.parse(init.body) });
  return new Response(JSON.stringify(provedor.responder(endereco)), { headers: { 'Content-Type': 'application/json' } });
};

const respostaOpenAI = (texto) => ({ choices: [{ message: { content: texto } }] });
const respostaGemini = (texto) => ({ candidates: [{ content: { parts: [{ text: texto }] } }] });

let h;
let aiGenerate;

before(async () => {
  h = await iniciarHarness("export { default as aiGenerate } from './api/_aiGenerate.ts';", {
    define: { fetch: 'globalThis.__fetchDoTesteIA' },
  });
  aiGenerate = h.modulo.aiGenerate;
});
after(async () => {
  await h.fechar();
  delete globalThis.__fetchDoTesteIA;
});

function novaBase({ provider = 'openrouter', chaves = CHAVES, permissions = { blog_ai: true } } = {}) {
  h.estado.tabelas = {
    SITE_SystemSettings: [
      { key: 'preferred_ai_provider', value: provider },
      { key: 'openrouter_model', value: 'modelo/escolhido' },
      ...Object.entries(chaves).map(([key, value]) => ({ key, value })),
    ],
  };
  h.estado.chamadas.length = 0;
  h.estado.rpcs = {
    site_staff_session_validar: () => [{ id: 'u1', name: 'Fulana', email: 'f@w-tech.com', permissions, status: 'Active' }],
  };
  provedor.pedidos.length = 0;
  provedor.responder = () => respostaOpenAI('resposta da IA');
}

const pedir = (corpo, opcoes = {}) => h.chamar(aiGenerate, { action: 'generate', prompt: 'Escreva algo', ...corpo }, { cookie: COOKIE, ...opcoes });

/** Roda `fn` guardando o que foi para o console.error, para conferir que a chave não foi junto. */
async function comLog(fn) {
  const original = console.error;
  const linhas = [];
  console.error = (...args) => linhas.push(args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' '));
  try {
    return { resultado: await fn(), log: linhas.join('\n') };
  } finally {
    console.error = original;
  }
}

test('OpenRouter: usa a chave e o modelo salvos, e devolve só o texto', async () => {
  novaBase();
  const { codigo, corpo } = await pedir({ systemPrompt: 'Seja breve' });
  assert.equal(codigo, 200);
  assert.deepEqual(corpo, { text: 'resposta da IA' });

  const [pedido] = provedor.pedidos;
  assert.match(pedido.url, /openrouter\.ai/);
  assert.equal(pedido.headers.Authorization, `Bearer ${CHAVES.openrouter_api_key}`);
  assert.equal(pedido.headers['X-Title'], 'W-Tech Admin');
  assert.equal(pedido.corpo.model, 'modelo/escolhido');
  assert.equal(pedido.corpo.temperature, 0.7);
  assert.deepEqual(pedido.corpo.messages, [
    { role: 'system', content: 'Seja breve' },
    { role: 'user', content: 'Escreva algo' },
  ]);
});

test('OpenAI: mesmo modelo que o painel usava', async () => {
  novaBase({ provider: 'openai' });
  const { codigo } = await pedir();
  assert.equal(codigo, 200);
  const [pedido] = provedor.pedidos;
  assert.match(pedido.url, /api\.openai\.com/);
  assert.equal(pedido.headers.Authorization, `Bearer ${CHAVES.openai_api_key}`);
  assert.equal(pedido.corpo.model, 'gpt-4o');
  // Sem instrução de sistema não manda mensagem de sistema vazia.
  assert.deepEqual(pedido.corpo.messages, [{ role: 'user', content: 'Escreva algo' }]);
});

test('Gemini: é o padrão sem provedor escolhido, e não manda instrução vazia', async () => {
  novaBase({ provider: '' });
  provedor.responder = () => respostaGemini('do gemini');
  const { codigo, corpo } = await pedir();
  assert.equal(codigo, 200);
  assert.deepEqual(corpo, { text: 'do gemini' });
  const [pedido] = provedor.pedidos;
  assert.match(pedido.url, /gemini-1\.5-pro/);
  assert.equal('system_instruction' in pedido.corpo, false);
  assert.equal(pedido.corpo.generationConfig.temperature, 0.7);
});

test('chave do provedor escolhido ausente: avisa e nem tenta chamar', async () => {
  novaBase({ provider: 'openai', chaves: { gemini_api_key: CHAVES.gemini_api_key } });
  const { codigo, corpo } = await pedir();
  assert.equal(codigo, 503);
  assert.match(corpo.error, /não está configurada/);
  assert.equal(provedor.pedidos.length, 0);
});

test('erro do provedor que repete a chave: não sai na resposta nem no log', async () => {
  novaBase();
  provedor.responder = () => ({ error: { message: `Incorrect API key provided: ${CHAVES.openrouter_api_key}` } });
  const { resultado, log } = await comLog(() => pedir());
  assert.equal(resultado.codigo, 502);
  assert.equal(JSON.stringify(resultado.corpo).includes('SEGREDO'), false);
  assert.equal(log.includes('SEGREDO'), false);
  assert.match(log, /\[chave\]/);
});

test('falta de saldo aparece como tal, sem repassar a mensagem do provedor', async () => {
  novaBase();
  provedor.responder = () => ({ error: { message: 'Insufficient credits on account abc' } });
  const { resultado } = await comLog(() => pedir());
  assert.equal(resultado.codigo, 402);
  assert.deepEqual(resultado.corpo, { error: 'A conta do provedor de IA está sem saldo.' });
});

test('sem sessão: 401, sem ler chave e sem gastar crédito', async () => {
  novaBase();
  h.estado.rpcs.site_staff_session_validar = () => [];
  const { codigo, corpo } = await h.chamar(aiGenerate, { action: 'generate', prompt: 'x' }, { cookie: COOKIE });
  assert.equal(codigo, 401);
  assert.equal(corpo.text, undefined);
  assert.equal(provedor.pedidos.length, 0);
  assert.equal(h.chamadasDe('SITE_SystemSettings').length, 0);

  assert.equal((await h.chamar(aiGenerate, { action: 'generate', prompt: 'x' })).codigo, 401);
});

test('sessão sem nenhuma permissão de tela com IA: 403', async () => {
  novaBase({ permissions: { financial_view: true } });
  const { codigo } = await pedir();
  assert.equal(codigo, 403);
  assert.equal(provedor.pedidos.length, 0);
});

for (const permissions of [
  { blog_ai: true },
  { manage_settings: true },
  { intelligence_view: true },
  { marketing_view: true },
  { manage_marketing: true },
  { whatsapp_inbox_view: true },
  { crm_view: true },
  { whatsapp_ai_train: true },
  { whatsapp_view_metrics: true },
  { admin_access: true },
]) {
  test(`permissão de tela que usa IA passa: ${Object.keys(permissions)[0]}`, async () => {
    novaBase({ permissions });
    assert.equal((await pedir()).codigo, 200);
  });
}

test('revogação explícita vence o interruptor geral de marketing', async () => {
  novaBase({ permissions: { manage_marketing: true, marketing_view: false } });
  assert.equal((await pedir()).codigo, 403);
});

test('só POST, só da mesma origem, com ação conhecida', async () => {
  novaBase();
  const get = await h.chamar(aiGenerate, null, { metodo: 'GET', cookie: COOKIE });
  assert.equal(get.codigo, 405);
  assert.equal(get.cabecalhos.allow, 'POST');
  assert.equal((await pedir({}, { origem: 'https://outro-site.com' })).codigo, 403);
  assert.equal((await h.chamar(aiGenerate, { action: 'constructor' }, { cookie: COOKIE })).codigo, 400);
  assert.equal(provedor.pedidos.length, 0);
});

for (const [caso, extra, esperado] of [
  ['sem texto', { prompt: '   ' }, 400],
  ['texto que não é string', { prompt: { a: 1 } }, 400],
  ['instrução que não é string', { systemPrompt: 42 }, 400],
  ['grande demais', { prompt: 'x'.repeat(1_000_001) }, 413],
]) {
  test(`pedido inválido: ${caso}`, async () => {
    novaBase();
    assert.equal((await pedir(extra)).codigo, esperado);
    assert.equal(provedor.pedidos.length, 0);
  });
}

test('limite por IP', async () => {
  novaBase();
  let ultimo;
  for (let i = 0; i < 61; i += 1) ultimo = await pedir({}, { ip: '10.8.8.8' });
  assert.equal(ultimo.codigo, 429);
});

test('embed: devolve o vetor, e a chave só vai para o Google', async () => {
  novaBase();
  provedor.responder = () => ({ embedding: { values: [0.1, 0.2] } });
  const { codigo, corpo } = await h.chamar(aiGenerate, { action: 'embed', text: 'pergunta' }, { cookie: COOKIE });
  assert.equal(codigo, 200);
  assert.deepEqual(corpo, { embedding: [0.1, 0.2] });
  assert.match(provedor.pedidos[0].url, /text-embedding-004/);
  assert.equal(provedor.pedidos[0].url.includes(CHAVES.gemini_api_key), true);
});

test('embed: sem chave do Gemini devolve null, e a memória segue sem vetor', async () => {
  novaBase({ chaves: { openrouter_api_key: CHAVES.openrouter_api_key } });
  const { codigo, corpo } = await h.chamar(aiGenerate, { action: 'embed', text: 'pergunta' }, { cookie: COOKIE });
  assert.equal(codigo, 200);
  assert.deepEqual(corpo, { embedding: null });
  assert.equal(provedor.pedidos.length, 0);
});

test('isolamento: o fetch do processo não foi trocado', () => {
  assert.equal(globalThis.fetch, fetchAntes);
});
