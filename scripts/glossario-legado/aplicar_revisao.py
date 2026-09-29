#!/usr/bin/env python3
"""
Aplica a revisão dos verbetes antigos antes de eles voltarem ao ar.

Entrada: verbetes.jsonl (raspar_wayback.py) e revisao/resultado_*.json (um por lote,
no formato de revisao/INSTRUCOES.md). Saída, na mesma pasta:

- verbetes_revisados.jsonl — só o que pode ir ao ar, já corrigido e marcado
  `"revisado": true` (o gerar_sql.py só publica registros marcados assim);
- revisao/relatorio.md — o que mudou em cada verbete e o que ficou de fora.

    python3 aplicar_revisao.py <pasta-de-trabalho>

A correção é por busca exata do trecho (espaços e quebras de linha à parte). Trecho
que não aparece, ou aparece mais de uma vez, para o processo: nada sai pela metade.
No fim, uma trava confere que não sobrou menção à W-Tech nem preço em R$.
"""
import html as html_lib
import json
import re
import sys
from pathlib import Path

CAMPOS = ("html", "titulo", "descricao")
# O que a revisão tem de ter tirado de todo verbete que vai ao ar.
PROIBIDOS = {
    "menção à W-Tech": re.compile(r"w\s*-?\s*tech", re.I),
    "preço em R$": re.compile(r"R\$\s*\d"),
}


def padrao(trecho):
    """Regex do trecho tolerante a espaço/quebra de linha."""
    partes = trecho.split()
    return re.compile(r"\s+".join(re.escape(p) for p in partes))


def aplicar(texto, correcao):
    rx = padrao(correcao["trecho"])
    achados = rx.findall(texto)
    if len(achados) != 1:
        raise ValueError(f"trecho aparece {len(achados)}x: {correcao['trecho'][:80]!r}")
    return rx.sub(lambda _m: correcao.get("novo") or "", texto, count=1)


def arrumar_html(corpo):
    corpo = re.sub(r"[ \t]{2,}", " ", corpo)
    corpo = re.sub(r"\s+([.,;:!?])", r"\1", corpo)
    corpo = re.sub(r"<(p|h2|h3|li)>\s+", r"<\1>", corpo)
    corpo = re.sub(r"\s+</(p|h2|h3|li)>", r"</\1>", corpo)
    corpo = re.sub(r"<(p|h2|h3|li)>\s*</\1>", "", corpo)
    # seção que ficou sem nenhum parágrafo (h2 seguido de outro h2 ou do fim)
    while True:
        novo = re.sub(r"<h2>[^<]*</h2>\s*(?=<h2>|$)", "", corpo.strip())
        if novo == corpo.strip():
            break
        corpo = novo
    corpo = re.sub(r"\n\s*\n+", "\n", corpo)
    return corpo.strip()


def arrumar_linha(texto):
    texto = re.sub(r"\s{2,}", " ", texto or "")
    texto = re.sub(r"\s+([.,;:!?])", r"\1", texto)
    return texto.strip(" -–—|:")


def palavras(corpo):
    return len(re.sub(r"<[^>]+>", " ", html_lib.unescape(corpo)).split())


def main():
    pasta = Path(sys.argv[1]).resolve()
    verbetes = {}
    for linha in (pasta / "verbetes.jsonl").read_text(encoding="utf-8").splitlines():
        if linha.strip():
            v = json.loads(linha)
            verbetes[v["slug"]] = v

    revisoes = {}
    for arq in sorted((pasta / "revisao").glob("resultado_*.json")):
        for r in json.loads(arq.read_text(encoding="utf-8")):
            if r["slug"] in revisoes:
                sys.exit(f"{r['slug']} revisado duas vezes ({arq.name})")
            revisoes[r["slug"]] = r

    sem_revisao = sorted(set(verbetes) - set(revisoes))
    if sem_revisao:
        sys.exit(f"{len(sem_revisao)} verbete(s) sem revisão, ex.: {sem_revisao[:5]}")

    saida, fora, mudancas, erros = [], [], [], []
    for slug, v in sorted(verbetes.items(), key=lambda kv: -kv[1]["cliques"]):
        r = revisoes[slug]
        if r["veredito"] == "nao_publicar":
            fora.append((v, r.get("motivo", "")))
            continue
        novo = dict(v)
        try:
            for c in r.get("correcoes") or []:
                novo[c["campo"]] = aplicar(novo.get(c["campo"]) or "", c)
                mudancas.append((slug, c))
        except ValueError as e:
            erros.append(f"{slug}: {e}")
            continue
        novo["html"] = arrumar_html(novo["html"])
        # sufixo de nome do site ("- W-Tech Suspensões"): o SEO da página já põe a marca
        novo["titulo"] = arrumar_linha(re.sub(r"\s+[-|–—]\s*W\s*-?\s*Tech\b.*$", "", novo.get("titulo") or "", flags=re.I))
        novo["descricao"] = arrumar_linha(novo.get("descricao"))
        for nome, rx in PROIBIDOS.items():
            for campo in CAMPOS:
                m = rx.search(html_lib.unescape(novo.get(campo) or ""))
                if m:
                    erros.append(f"{slug}: ainda tem {nome} em {campo}: …{(novo.get(campo) or '')[max(0, m.start() - 60):m.end() + 60]}…")
        novo["palavras"] = palavras(novo["html"])
        if novo["palavras"] < 250:
            erros.append(f"{slug}: ficou com só {novo['palavras']} palavras depois das correções")
        novo["tema"] = r["tema"]
        novo["revisado"] = True
        saida.append(novo)

    if erros:
        print("\n".join(erros))
        sys.exit(f"{len(erros)} problema(s): nada foi gravado")

    (pasta / "verbetes_revisados.jsonl").write_text(
        "".join(json.dumps(x, ensure_ascii=False) + "\n" for x in saida), encoding="utf-8")

    por_tipo, por_tema = {}, {}
    for _slug, c in mudancas:
        por_tipo[c["tipo"]] = por_tipo.get(c["tipo"], 0) + 1
    for x in saida:
        por_tema[x["tema"]] = por_tema.get(x["tema"], 0) + 1
    rel = [
        "# Revisão do glossário antigo",
        "",
        f"- Verbetes baixados: {len(verbetes)}",
        f"- Vão ao ar: {len(saida)} ({sum(1 for x in saida if revisoes[x['slug']].get('correcoes'))} com correção)",
        f"- Ficam de fora: {len(fora)}",
        f"- Correções por tipo: {por_tipo}",
        f"- Temas dos que vão ao ar: {por_tema}",
        f"- Cliques (16 meses) dos que vão ao ar: {sum(x['cliques'] for x in saida)}; dos que ficam de fora: {sum(v['cliques'] for v, _ in fora)}",
        "",
        "## Ficam de fora",
        "",
    ]
    rel += [f"- `{v['slug']}` ({v['cliques']} cliques): {motivo}" for v, motivo in fora] or ["- nenhum"]
    rel += ["", "## Correções", ""]
    for slug, c in mudancas:
        rel.append(f"- `{slug}` · {c['tipo']} · {c['campo']}: “{c['trecho']}” → “{c.get('novo') or '(apagado)'}” — {c.get('motivo', '')}")
    (pasta / "revisao" / "relatorio.md").write_text("\n".join(rel) + "\n", encoding="utf-8")
    print(f"{len(saida)} vão ao ar, {len(fora)} de fora, {len(mudancas)} correções: {por_tipo}")


if __name__ == "__main__":
    main()
