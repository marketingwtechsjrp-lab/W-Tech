#!/usr/bin/env python3
"""
Baixa do Internet Archive os verbetes do glossário antigo (WordPress) que ainda
tinham tráfego no Search Console. Grava só em arquivo local (verbetes.jsonl):
nada é publicado aqui.

- Fila: gsc_glossario_*.txt (slug|cliques|impressões|posição), por cliques.
- Cópia: a mais próxima de 20/04/2026 (a migração foi em 21/04/2026).
- Educado com o archive.org: uma requisição por vez, pausa entre elas, leitura
  interrompida em </article> e novas tentativas com espera crescente.
- Retomável: quem já está em verbetes.jsonl ou em falhas.jsonl não é baixado de novo.
"""
import html
import json
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
PAUSA = 2.0
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
    return itens


def ja_feitos():
    feitos = set()
    for arq in (OUT, FALHAS):
        if arq.exists():
            for linha in arq.read_text(encoding="utf-8").splitlines():
                if linha.strip():
                    feitos.add(json.loads(linha)["slug"])
    return feitos


def baixar(url, parar_em=None, timeout=90, tentativas=4):
    espera = 5
    for n in range(tentativas):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=timeout) as r:
                if not parar_em:
                    return r.read()
                partes, total = [], b""
                while True:
                    bloco = r.read(65536)
                    if not bloco:
                        break
                    partes.append(bloco)
                    # só junta o fim para procurar a marca, sem refazer o arquivo inteiro
                    if parar_em in b"".join(partes[-3:]):
                        break
                return b"".join(partes)
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return None
            if n == tentativas - 1:
                raise
        except Exception:
            if n == tentativas - 1:
                raise
        time.sleep(espera)
        espera *= 2
    return None


def copia_mais_proxima(slug):
    alvo = f"w-techbrasil.com.br/glossario/{slug}/"
    url = "https://archive.org/wayback/available?" + urllib.parse.urlencode({"url": alvo, "timestamp": "20260420"})
    dados = json.loads(baixar(url) or b"{}")
    s = (dados.get("archived_snapshots") or {}).get("closest") or {}
    if s.get("status") == "200" and s.get("timestamp"):
        return s["timestamp"]
    url = "https://web.archive.org/cdx/search/cdx?" + urllib.parse.urlencode(
        {"url": alvo, "output": "json", "filter": "statuscode:200", "fl": "timestamp", "limit": "-1"})
    linhas = json.loads(baixar(url) or b"[]")
    return linhas[-1][0] if len(linhas) > 1 else None


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


def main():
    feitos = ja_feitos()
    pendentes = [x for x in fila() if x["slug"] not in feitos][:LIMITE]
    print(f"{len(pendentes)} verbetes a baixar ({len(feitos)} já feitos)", flush=True)
    for i, item in enumerate(pendentes, 1):
        slug = item["slug"]
        try:
            ts = copia_mais_proxima(slug)
            time.sleep(PAUSA)
            if not ts:
                raise RuntimeError("sem cópia 200 no Internet Archive")
            bruto = baixar(f"https://web.archive.org/web/{ts}id_/https://w-techbrasil.com.br/glossario/{slug}/",
                           parar_em=b"</article>")
            if not bruto:
                raise RuntimeError("cópia não abriu")
            fonte = bruto.decode("utf-8", errors="replace")
            p = Conteudo()
            p.feed(fonte)
            corpo = limpar("".join(p.buf))
            palavras = len(re.sub(r"<[^>]+>", " ", corpo).split())
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
            with OUT.open("a", encoding="utf-8") as f:
                f.write(json.dumps(registro, ensure_ascii=False) + "\n")
            print(f"[{i}/{len(pendentes)}] ok {slug} ({palavras} palavras, cópia {ts[:8]})", flush=True)
        except Exception as e:
            with FALHAS.open("a", encoding="utf-8") as f:
                f.write(json.dumps({**item, "erro": str(e)[:200]}, ensure_ascii=False) + "\n")
            print(f"[{i}/{len(pendentes)}] FALHA {slug}: {e}", flush=True)
        time.sleep(PAUSA)


if __name__ == "__main__":
    main()
