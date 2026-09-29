#!/usr/bin/env python3
"""
Baixa do Internet Archive os verbetes do glossário antigo (WordPress) que ainda
tinham tráfego no Search Console. Grava só em arquivo local (verbetes.jsonl):
nada é publicado aqui.

- Fila: gsc_glossario_*.txt (slug|cliques|impressões|posição), por cliques.
- Cópia: a mais próxima de 20/04/2026 (a migração foi em 21/04/2026). O pedido vai
  direto em /web/20260420000000id_/<url>, que o archive.org redireciona para a
  cópia mais próxima; só se ela não tiver o verbete (cópia já do site novo) é que
  a lista de cópias (CDX) é consultada.
- Educado com o archive.org: 2 downloads por vez (com 3 ele passa a recusar
  conexões), pausa entre eles, leitura interrompida em </article> e novas
  tentativas com espera crescente.
- Retomável: quem já está em verbetes.jsonl não é baixado de novo; as falhas
  voltam na passada seguinte.
"""
import html
import json
import threading
from concurrent.futures import ThreadPoolExecutor
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from html.parser import HTMLParser
from pathlib import Path

BASE = Path(__file__).resolve().parent
OUT = BASE / "verbetes.jsonl"
FALHAS = BASE / "falhas.jsonl"
UA = "W-Tech restauracao do proprio glossario (contato@w-techbrasil.com.br)"
PAUSA = 3.0
PARALELO = 2
TRAVA = threading.Lock()
LIMITE = int(sys.argv[1]) if len(sys.argv) > 1 else 10_000


def fila():
    vistos, itens = set(), []
    for arq in sorted(BASE.glob("gsc_glossario_*.txt")):
        for linha in arq.read_text(encoding="utf-8").splitlines():
            if not linha.strip():
                continue
            slug, cliques, impressoes, posicao = linha.split("|")
            if slug not in vistos:
                vistos.add(slug)
                itens.append({"slug": slug, "cliques": int(cliques), "impressoes": int(impressoes), "posicao": float(posicao)})
    itens.sort(key=lambda x: -x["cliques"])
    # arquivados.txt (lista do CDX, opcional): pula o que o archive.org nunca guardou
    lista = BASE / "arquivados.txt"
    if lista.exists():
        guardados = set(re.findall(r"/glossario/([^/?#\s]+)", lista.read_text(encoding="utf-8", errors="replace").lower()))
        fora = [x for x in itens if x["slug"] not in guardados]
        (BASE / "nao_arquivados.jsonl").write_text("".join(json.dumps(x, ensure_ascii=False) + "\n" for x in fora), encoding="utf-8")
        itens = [x for x in itens if x["slug"] in guardados]
    return itens


def ja_feitos():
    feitos = set()
    if OUT.exists():
        for linha in OUT.read_text(encoding="utf-8").splitlines():
            if linha.strip():
                feitos.add(json.loads(linha)["slug"])
    return feitos


def baixar(url, parar_em=None, timeout=90, tentativas=4, com_url=False):
    espera = 5
    for n in range(tentativas):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=timeout) as r:
                final = r.geturl()
                if not parar_em:
                    corpo = r.read()
                    return (corpo, final) if com_url else corpo
                partes, total = [], b""
                while True:
                    bloco = r.read(65536)
                    if not bloco:
                        break
                    partes.append(bloco)
                    # só junta o fim para procurar a marca, sem refazer o arquivo inteiro
                    if parar_em in b"".join(partes[-3:]):
                        break
                corpo = b"".join(partes)
                return (corpo, final) if com_url else corpo
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return (None, None) if com_url else None
            if n == tentativas - 1:
                raise
        except Exception:
            if n == tentativas - 1:
                raise
        time.sleep(espera)
        espera *= 2
    return (None, None) if com_url else None


def copia_anterior_pela_lista(slug):
    """Última cópia 200 até 20/04/2026, pela lista do archive.org (CDX)."""
    alvo = f"w-techbrasil.com.br/glossario/{slug}/"
    url = "https://web.archive.org/cdx/search/cdx?" + urllib.parse.urlencode(
        {"url": alvo, "output": "json", "filter": "statuscode:200", "fl": "timestamp", "to": "20260420", "limit": "-1"})
    linhas = json.loads(baixar(url) or b"[]")
    return linhas[-1][0] if len(linhas) > 1 else None


def extrair(fonte):
    p = Conteudo()
    p.feed(fonte)
    corpo = limpar("".join(p.buf))
    return corpo, len(re.sub(r"<[^>]+>", " ", corpo).split())


class Conteudo(HTMLParser):
    """HTML interno do primeiro elemento com a classe post-content."""

    VAZIAS = {"br", "img", "hr", "meta", "link", "input", "source", "wbr"}

    def __init__(self):
        super().__init__(convert_charrefs=False)
        self.nivel, self.dentro, self.feito, self.buf = 0, False, False, []

    def handle_starttag(self, tag, attrs):
        if self.feito:
            return
        if not self.dentro and "post-content" in (dict(attrs).get("class") or "").split():
            self.dentro, self.nivel = True, 1
            return
        if self.dentro:
            if tag not in self.VAZIAS:
                self.nivel += 1
            self.buf.append(self.get_starttag_text())

    def handle_endtag(self, tag):
        if self.dentro and not self.feito:
            if tag not in self.VAZIAS:
                self.nivel -= 1
            if self.nivel <= 0:
                self.feito, self.dentro = True, False
                return
            self.buf.append(f"</{tag}>")

    def handle_data(self, d):
        if self.dentro and not self.feito:
            self.buf.append(d)

    def handle_entityref(self, n):
        if self.dentro and not self.feito:
            self.buf.append(f"&{n};")

    def handle_charref(self, n):
        if self.dentro and not self.feito:
            self.buf.append(f"&#{n};")


PERMITIDAS = {"h2", "h3", "h4", "p", "ul", "ol", "li", "strong", "b", "em", "i", "a", "table",
              "thead", "tbody", "tr", "th", "td", "blockquote", "br"}


def limpar(corpo):
    # chamada de anúncio do plugin (Ads Ninja) que ficava no meio do texto
    corpo = re.sub(r'<div class="anuncio-adsninja">.*?</a>\s*</div>', "", corpo, flags=re.S)
    corpo = re.sub(r"<(script|style|noscript|iframe|figure|svg)\b.*?</\1>", "", corpo, flags=re.S | re.I)

    def tag(m):
        fecha, nome, attrs = m.group(1), m.group(2).lower(), m.group(3) or ""
        if nome not in PERMITIDAS:
            return ""
        if fecha:
            return f"</{nome}>"
        if nome == "a":
            href = re.search(r'href="([^"]+)"', attrs)
            if not href:
                return ""
            url = href.group(1).replace("https://w-techbrasil.com.br", "").replace("http://w-techbrasil.com.br", "")
            return f'<a href="{html.escape(url, quote=True)}">'
        return f"<{nome}>"

    corpo = re.sub(r"<(/?)([a-zA-Z0-9]+)([^>]*)>", tag, corpo)
    corpo = re.sub(r"<p>\s*</p>", "", corpo)
    corpo = re.sub(r"\n\s*\n+", "\n", corpo).strip()
    return corpo


def meta(fonte, padrao):
    m = re.search(padrao, fonte)
    return html.unescape(m.group(1)).strip() if m else ""


def processar(item, i, total):
    slug = item["slug"]
    try:
        url = f"https://web.archive.org/web/20260420000000id_/https://w-techbrasil.com.br/glossario/{slug}/"
        bruto, final = baixar(url, parar_em=b"</article>", com_url=True)
        ts = (re.search(r"/web/(\d{14})", final or "") or [None, None])[1]
        fonte = (bruto or b"").decode("utf-8", errors="replace")
        corpo, palavras = extrair(fonte)
        if palavras < 80:
            # a cópia mais próxima já era do site novo (sem verbete): vale a anterior
            ts = copia_anterior_pela_lista(slug)
            if not ts:
                raise RuntimeError("sem cópia com o verbete no Internet Archive")
            time.sleep(PAUSA)
            bruto = baixar(f"https://web.archive.org/web/{ts}id_/https://w-techbrasil.com.br/glossario/{slug}/",
                           parar_em=b"</article>")
            fonte = (bruto or b"").decode("utf-8", errors="replace")
            corpo, palavras = extrair(fonte)
            if palavras < 80:
                raise RuntimeError(f"conteúdo curto demais ({palavras} palavras)")
        registro = {
            **item,
            "snapshot": ts,
            "titulo": meta(fonte, r'<meta property="og:title" content="([^"]*)"') or meta(fonte, r"<title>(.*?)</title>"),
            "descricao": meta(fonte, r'<meta name="description" content="([^"]*)"'),
            "publicado": meta(fonte, r'article:published_time" content="([^"]*)"'),
            "palavras": palavras,
            "html": corpo,
        }
        with TRAVA:
            with OUT.open("a", encoding="utf-8") as f:
                f.write(json.dumps(registro, ensure_ascii=False) + "\n")
            print(f"[{i}/{total}] ok {slug} ({palavras} palavras, cópia {(ts or '?')[:8]})", flush=True)
        ok = True
    except Exception as e:
        with TRAVA:
            print(f"[{i}/{total}] FALHA {slug}: {e}", flush=True)
        ok = False
    time.sleep(PAUSA)
    return item, ok


def main():
    # duas passadas: a segunda refaz só o que falhou (504 e timeouts do archive.org)
    falhas = []
    for passada in (1, 2):
        feitos = ja_feitos()
        pendentes = [x for x in fila() if x["slug"] not in feitos][:LIMITE]
        print(f"passada {passada}: {len(pendentes)} verbetes a baixar ({len(feitos)} já feitos)", flush=True)
        if not pendentes:
            break
        with ThreadPoolExecutor(max_workers=PARALELO) as pool:
            resultados = list(pool.map(lambda par: processar(par[1], par[0], len(pendentes)), enumerate(pendentes, 1)))
        falhas = [item for item, ok in resultados if not ok]
    FALHAS.write_text("".join(json.dumps(f, ensure_ascii=False) + "\n" for f in falhas), encoding="utf-8")
    print(f"fim: {len(ja_feitos())} verbetes em verbetes.jsonl, {len(falhas)} falhas", flush=True)


if __name__ == "__main__":
    main()
