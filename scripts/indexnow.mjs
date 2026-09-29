#!/usr/bin/env node
/**
 * Avisa Bing, Yandex, Seznam, Naver e demais participantes do IndexNow que uma
 * lista de URLs mudou. O Bing alimenta o Copilot e parte das respostas do
 * ChatGPT com busca, então isso encurta o tempo até a página nova aparecer lá.
 * Aviso não é indexação: o buscador decide se e quando rastreia.
 *
 * A chave é pública por desenho: fica em public/<chave>.txt e o buscador confere
 * que o arquivo existe no domínio antes de aceitar o aviso.
 *
 * Uso (rodar depois do deploy, com o site novo já no ar):
 *   node scripts/indexnow.mjs /curso-suspensao-piloto /glossario   # caminhos avulsos
 *   node scripts/indexnow.mjs --sitemap                             # tudo do sitemap publicado
 *   node scripts/indexnow.mjs --dry-run /curso-suspensao-piloto     # só mostra o que enviaria
 *
 * Não usar --sitemap enquanto o blog antigo não for podado: reenviar 312 posts
 * gerados em lote pede ao Bing para rever justamente o conteúdo mais fraco.
 */
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HOST = 'w-techbrasil.com.br';
const BASE = `https://${HOST}`;
const ENDPOINT = 'https://api.indexnow.org/indexnow';
const LIMITE_POR_ENVIO = 10_000;

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function lerChave() {
  const arquivos = readdirSync(path.join(raiz, 'public')).filter((nome) => /^[0-9a-f]{32}\.txt$/.test(nome));
  if (arquivos.length !== 1) {
    throw new Error(`Esperava exatamente 1 arquivo de chave IndexNow em public/, achei ${arquivos.length}.`);
  }
  const chave = readFileSync(path.join(raiz, 'public', arquivos[0]), 'utf8').trim();
  if (`${chave}.txt` !== arquivos[0]) throw new Error('O conteúdo do arquivo de chave não bate com o nome dele.');
  return chave;
}

async function urlsDoSitemap() {
  const resposta = await fetch(`${BASE}/sitemap.xml`);
  if (!resposta.ok) throw new Error(`sitemap.xml respondeu ${resposta.status}`);
  const xml = await resposta.text();
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
}

function normalizar(entrada) {
  const url = entrada.startsWith('http') ? new URL(entrada) : new URL(entrada, BASE);
  if (url.host !== HOST) throw new Error(`URL de outro domínio: ${entrada}`);
  url.hash = '';
  return url.toString();
}

async function main() {
  const args = process.argv.slice(2);
  const simular = args.includes('--dry-run');
  const doSitemap = args.includes('--sitemap');
  const avulsas = args.filter((a) => !a.startsWith('--'));

  const lista = doSitemap ? await urlsDoSitemap() : avulsas;
  const urls = [...new Set(lista.map(normalizar))];
  if (!urls.length) {
    console.error('Nada para enviar. Passe caminhos (ex.: /curso-suspensao-piloto) ou --sitemap.');
    process.exit(1);
  }

  const chave = lerChave();
  // Confere antes que o arquivo de chave está no ar: sem ele o aviso é recusado.
  const arquivo = await fetch(`${BASE}/${chave}.txt`);
  const publicado = arquivo.ok ? (await arquivo.text()).trim() : '';
  if (publicado !== chave) {
    console.error(`O arquivo de chave ainda não está no ar (${BASE}/${chave}.txt respondeu ${arquivo.status}). Faça o deploy antes.`);
    process.exit(1);
  }

  for (let i = 0; i < urls.length; i += LIMITE_POR_ENVIO) {
    const lote = urls.slice(i, i + LIMITE_POR_ENVIO);
    const corpo = { host: HOST, key: chave, keyLocation: `${BASE}/${chave}.txt`, urlList: lote };
    if (simular) {
      console.log(`(simulação) enviaria ${lote.length} URLs:`);
      lote.slice(0, 20).forEach((u) => console.log(`  ${u}`));
      continue;
    }
    const resposta = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(corpo),
    });
    // 200 = recebido; 202 = recebido, chave ainda em validação. Os dois servem.
    console.log(`IndexNow: ${resposta.status} para ${lote.length} URLs`);
    if (resposta.status >= 400) {
      console.error(await resposta.text());
      process.exit(1);
    }
  }
}

main().catch((erro) => {
  console.error(erro.message || erro);
  process.exit(1);
});
