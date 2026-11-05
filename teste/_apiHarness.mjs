import { createServer } from 'node:http';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

/**
 * Roda handlers de api/ de verdade, com o supabase-js de verdade, contra um PostgREST falso.
 * O nome começa com "_" e não termina em .test: o Playwright não carrega isto como teste.
 */

export const ORIGEM = 'https://w-techbrasil.com.br';
export const CHAVE_DE_SERVICO = 'chave-service-role-de-teste';

function filtrosDaUrl(url) {
  const filtros = {};
  for (const [chave, valor] of url.searchParams) {
    if (!['select', 'order', 'limit', 'offset', 'columns'].includes(chave)) filtros[chave] = valor;
  }
  return filtros;
}

function casaIlike(valor, padrao) {
  let regex = '';
  for (let i = 0; i < padrao.length; i += 1) {
    const c = padrao[i];
    if (c === '\\') regex += padrao[++i].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    else if (c === '%') regex += '.*';
    else if (c === '_') regex += '.';
    else regex += c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${regex}$`, 'i').test(String(valor ?? ''));
}

function casa(linha, filtros) {
  return Object.entries(filtros).every(([coluna, condicao]) => {
    if (condicao.startsWith('eq.')) return String(linha[coluna]) === condicao.slice(3);
    if (condicao === 'is.null') return linha[coluna] === null || linha[coluna] === undefined;
    if (condicao.startsWith('ilike.')) return casaIlike(linha[coluna], condicao.slice(6));
    if (condicao.startsWith('in.(')) {
      const valores = condicao.slice(4, -1).split(',').map((v) => v.replaceAll('"', ''));
      return valores.includes(String(linha[coluna]));
    }
    return false;
  });
}

export async function iniciarHarness(exportacoes) {
  // rpcs: resposta das funções ({ nome: (corpo) => linhas }). recusar: tabelas que respondem erro.
  const estado = { tabelas: {}, chamadas: [], webhooks: [], rpcs: {}, recusar: new Set() };
  let proximoId = 1;

  const servidor = createServer((req, res) => {
    let corpoBruto = '';
    req.on('data', (parte) => { corpoBruto += parte; });
    req.on('end', () => {
      const url = new URL(req.url, 'http://local');
      res.setHeader('Content-Type', 'application/json');

      if (url.pathname === '/webhook') {
        estado.webhooks.push(JSON.parse(corpoBruto));
        return res.end('{}');
      }

      const tabela = decodeURIComponent(url.pathname.split('/').pop());
      const filtros = filtrosDaUrl(url);
      const corpo = corpoBruto ? JSON.parse(corpoBruto) : null;
      estado.chamadas.push({ metodo: req.method, tabela, filtros, select: url.searchParams.get('select'), corpo, chave: req.headers.apikey });

      if (estado.recusar.has(tabela)) {
        res.statusCode = 500;
        return res.end(JSON.stringify({ code: 'XX000', message: 'falha simulada' }));
      }
      if (url.pathname.includes('/rpc/')) {
        return res.end(JSON.stringify(estado.rpcs[tabela]?.(corpo) ?? null));
      }

      const linhasDaTabela = (estado.tabelas[tabela] ??= []);
      const querRetorno = String(req.headers.prefer || '').includes('return=representation');
      const umaSo = String(req.headers.accept || '').includes('vnd.pgrst.object');

      const responder = (status, linhas) => {
        if (umaSo && linhas.length !== 1) {
          res.statusCode = 406;
          return res.end(JSON.stringify({ code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned', details: `The result contains ${linhas.length} rows` }));
        }
        res.statusCode = status;
        return res.end(JSON.stringify(umaSo ? linhas[0] : linhas));
      };

      if (req.method === 'POST') {
        const novas = (Array.isArray(corpo) ? corpo : [corpo]).map((linha) => ({
          id: `00000000-0000-4000-8000-${String(proximoId++).padStart(12, '0')}`,
          ...linha,
        }));
        linhasDaTabela.push(...novas);
        if (!querRetorno) { res.statusCode = 201; return res.end(''); }
        return responder(201, novas);
      }

      const alvo = linhasDaTabela.filter((linha) => casa(linha, filtros));

      if (req.method === 'PATCH') {
        alvo.forEach((linha) => Object.assign(linha, corpo));
        if (!querRetorno) { res.statusCode = 204; return res.end(); }
        return responder(200, alvo);
      }

      const limite = Number(url.searchParams.get('limit')) || alvo.length;
      return responder(200, alvo.slice(0, limite));
    });
  });
  await new Promise((resolve) => servidor.listen(0, '127.0.0.1', resolve));
  const urlBanco = `http://127.0.0.1:${servidor.address().port}`;

  // Mesmo método dos outros *-unit.test.mjs (esbuild em memória), mas gravado em
  // arquivo: as dependências CJS do supabase-js pedem o shim de require do build-server.
  const { outputFiles } = await build({
    // O ambiente entra no bundle, sem tocar em process.env: o Playwright também carrega
    // estes arquivos e divide o processo com outros specs, que olham essas variáveis.
    define: {
      'process.env.VITE_SUPABASE_URL': JSON.stringify(urlBanco),
      'process.env.SUPABASE_SERVICE_ROLE_KEY': JSON.stringify(CHAVE_DE_SERVICO),
      'process.env.STAFF_TRUSTED_ORIGINS': JSON.stringify(ORIGEM),
    },
    stdin: {
      contents: exportacoes,
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
  const pasta = await mkdtemp(join(tmpdir(), 'api-harness-'));
  const arquivo = join(pasta, 'modulo.mjs');
  await writeFile(arquivo, outputFiles[0].text);
  const modulo = await import(pathToFileURL(arquivo).href);

  let ipSeguinte = 1;

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

  return {
    modulo,
    estado,
    urlBanco,
    chamar,
    chamadasDe: (tabela, metodo = 'GET') => estado.chamadas.filter((c) => c.tabela === tabela && c.metodo === metodo),
    fechar: async () => {
      await new Promise((resolve) => servidor.close(resolve));
      await rm(pasta, { recursive: true, force: true });
    },
  };
}
