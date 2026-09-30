#!/usr/bin/env python3
"""
Gera o SQL que publica os guias de suspensão no blog (SITE_BlogPosts).

    python3 gerar_sql.py <pasta-de-trabalho>

Entrada: <pasta>/verbetes_revisados.jsonl, saída de scripts/glossario-legado/
aplicar_revisao.py sobre os guias (o `resumo` do guia faz o papel de `descricao`
na revisão). Cada registro precisa estar marcado `"revisado": true`: guia sem
revisão não vai ao ar. Saída: <pasta>/guias.sql. Nada é aplicado aqui.

A capa fica vazia de propósito: o blog escolhe a foto pelo assunto
(lib/blogImages.ts). Slug que já existe no blog não é tocado.
"""
import json
import sys
from pathlib import Path

CATEGORIA = "Guias de suspensão"
AUTOR = "Equipe W-Tech"


def dolar(texto):
    marca = "$wtg$"
    assert marca not in texto, "texto contém a marca de citação"
    return f"{marca}{texto}{marca}"


def main():
    pasta = Path(sys.argv[1])
    registros = [json.loads(l) for l in (pasta / "verbetes_revisados.jsonl").read_text(encoding="utf-8").splitlines() if l.strip()]
    if not registros or not all(r.get("revisado") for r in registros):
        sys.exit("verbetes_revisados.jsonl vazio ou com guia sem revisão")
    linhas = []
    for r in registros:
        palavras = "array[" + ", ".join(dolar(p) for p in r.get("palavras_chave") or []) + "]::text[]"
        linhas.append(
            "(" + ", ".join([
                dolar(r["titulo"]), dolar(r["descricao"]), dolar(r["html"]), dolar(AUTOR), "now()",
                dolar(CATEGORIA), "'Published'", dolar(r["slug"]), dolar(r["seo_title"]), dolar(r["seo_description"]), palavras,
            ]) + ")"
        )
    sql = [
        "-- Gerado por scripts/guias/gerar_sql.py — guias de suspensão no blog.",
        "begin;",
        'insert into public."SITE_BlogPosts" (title, excerpt, content, author, date, category, status, slug, seo_title, seo_description, keywords)',
        "select * from (values",
        ",\n".join(linhas),
        ") as novo(title, excerpt, content, author, date, category, status, slug, seo_title, seo_description, keywords)",
        'where not exists (select 1 from public."SITE_BlogPosts" b where b.slug = novo.slug);',
        "commit;",
    ]
    (pasta / "guias.sql").write_text("\n".join(sql) + "\n", encoding="utf-8")
    print(f"{len(linhas)} guias em {pasta / 'guias.sql'}")


if __name__ == "__main__":
    main()
