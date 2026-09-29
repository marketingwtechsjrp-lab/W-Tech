#!/usr/bin/env python3
"""
Gera o SQL que devolve o glossário antigo (WordPress) ao SITE_GlossaryTerms.

Entrada: verbetes.jsonl gerado por raspar_wayback.py (mesma pasta de trabalho).
Saída:   glossario_legado.sql, com upsert por slug. Nada é aplicado aqui.

    python3 gerar_sql.py <pasta-de-trabalho> [--publicar]

Sem --publicar os verbetes entram como rascunho (published = false), para
revisão no painel. Com --publicar saem direto no ar: é o que se usa depois do
OK, porque são páginas que já existiam e o Google já mostrava.

Os slugs são os mesmos do WordPress (o-que-e-…), para cada verbete recuperar o
histórico da URL antiga. Verbetes manuais já existentes não são tocados: o
upsert só atualiza linhas cuja origem já é WORDPRESS_LEGADO.
"""
import html
import json
import re
import sys
import unicodedata
from pathlib import Path

CATEGORIAS = [
    # Exceções primeiro: "mola de embreagem" e "mola de válvula" não são suspensão.
    ("Transmissão", r"embreagem|embragagem"),
    ("Motor", r"mola-de-valvula|compressao-do-motor|nivel-de-compressao|pistao-de-alta-compressao|indice-de-compressao"),
    ("Suspensão", r"suspens|amortec|mola|sag|pre-carga|precarga|bengala|garfo|kyb|showa|\bwp\b|^wp-|w-p-|telescop|invertid|monochoque|monocross|balanca|nitrogenio|reservatorio|cartucho|rebote|link"),
    ("Freios", r"freio|fluido-de-freio|antitravamento|disco-flutuante"),
    ("Transmissão", r"embreagem|embragagem|corrente|pinhao|coroa|relacao|cambio|transmissao|engrenagem|correia|marchas|neutro"),
    ("Elétrica", r"rele|diodo|ignicao|bateria|luz|farol|lanterna|interruptor|fusivel|led|carregamento|sensor|painel|indicador|eletric|eletronic|lampada|velas|cabos-de-alta"),
    ("Motor", r"motor|carburador|valvula|pistao|cilindr|estator|marcha-lenta|escape|escapamento|filtro|oleo|radiador|alimentacao|admissao|biela|virabrequim|junta|carter|injecao|combustivel|acelerador|giro|vacuo|bujao|flange|dreno|arrefec|refrigerad"),
    ("Rodas e pneus", r"pneu|roda|aro|mousse|wheel|bico|garras|slick|tubliss"),
    ("Chassi e acessórios", r"quadro|guidao|banco|pedaleira|paralama|carenagem|chassi|tanque|estribo|protetor|manete|retrovisor|bolha|placa|lona|garupa|espuma|ganchos|capacete|tablet|ar-condicionado"),
    ("Motocross e off-road", r"motocross|off-road|enduro|trilha|rally|crf|yz|gasgas|gas-gas|husaberg|kasinski|shineray|bajaj|raid|mxf|quad"),
]


def categoria(slug):
    for nome, padrao in CATEGORIAS:
        if re.search(padrao, slug):
            return nome
    return "Mecânica geral"


def nicho(cat):
    return "suspensão de motocicletas" if cat == "Suspensão" else "mecânica de motocicletas"


def termo(titulo, slug):
    t = html.unescape(titulo or "").strip()
    t = re.sub(r"^\s*O que (é|são)\s+", "", t, flags=re.I)
    t = re.split(r"\s*[:|–—]\s*|\s+-\s+", t)[0].strip()
    t = re.sub(r"\?$", "", t).strip()
    if len(t) < 3:
        t = slug.replace("o-que-e-", "").replace("-", " ")
    return t[:1].upper() + t[1:]


def letra(t):
    base = unicodedata.normalize("NFD", t)[:1].upper()
    base = "".join(c for c in base if unicodedata.category(c) != "Mn")
    return base if "A" <= base <= "Z" else "#"


def dolar(texto):
    marca = "$wtg$"
    assert marca not in texto, "texto contém a marca de citação"
    return f"{marca}{texto}{marca}"


def main():
    pasta = Path(sys.argv[1])
    publicar = "--publicar" in sys.argv
    registros = [json.loads(l) for l in (pasta / "verbetes.jsonl").read_text(encoding="utf-8").splitlines() if l.strip()]
    vistos, linhas = set(), []
    for r in registros:
        if r["slug"] in vistos:
            continue
        vistos.add(r["slug"])
        nome = termo(r.get("titulo"), r["slug"])
        cat = categoria(r["slug"])
        resumo = (r.get("descricao") or "").strip()[:300] or f"Entenda {nome} no glossário técnico da W-Tech Brasil."
        seo = (r.get("titulo") or nome).strip()[:70]
        criado = r.get("publicado") or "2025-01-19T00:00:00-03:00"
        linhas.append(
            "(" + ", ".join([
                dolar(nome), dolar(r["slug"]), dolar(letra(nome)), dolar(nicho(cat)), dolar(cat),
                dolar(r["html"]), dolar(resumo), dolar(seo), dolar("Equipe W-Tech"),
                "'WORDPRESS_LEGADO'", "true" if publicar else "false", "false", dolar(criado) + "::timestamptz",
            ]) + ")"
        )
    sql = [
        "-- Gerado por scripts/glossario-legado/gerar_sql.py — glossário antigo do WordPress de volta.",
        "begin;",
        'insert into public."SITE_GlossaryTerms" (term, slug, letter, niche, category, content, summary, seo_title, author, origin, published, reviewed, created_at) values',
        ",\n".join(linhas),
        "on conflict (slug) do update set",
        "  term = excluded.term, letter = excluded.letter, niche = excluded.niche, category = excluded.category,",
        "  content = excluded.content, summary = excluded.summary, seo_title = excluded.seo_title,",
        "  published = excluded.published, updated_at = now()",
        '  where "SITE_GlossaryTerms".origin = \'WORDPRESS_LEGADO\';',
        "commit;",
    ]
    (pasta / "glossario_legado.sql").write_text("\n".join(sql) + "\n", encoding="utf-8")
    por_cat = {}
    for r in registros:
        c = categoria(r["slug"])
        por_cat[c] = por_cat.get(c, 0) + 1
    print(f"{len(linhas)} verbetes · publicados={publicar} · por categoria: {por_cat}")


if __name__ == "__main__":
    main()
