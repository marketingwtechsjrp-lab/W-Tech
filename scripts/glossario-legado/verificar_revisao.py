#!/usr/bin/env python3
"""
Confere um resultado de revisão contra o lote original.

    python3 verificar_revisao.py <pasta-de-trabalho> 03   # confere revisao/resultado_03.json

Aponta: JSON inválido, slug faltando/sobrando/fora de ordem, campo/tema/veredito
inválido, trecho que não aparece (ou aparece mais de uma vez) no campo indicado.
Espaços e quebras de linha são ignorados na comparação.
"""
import json
import re
import sys
from pathlib import Path

TEMAS = {"suspensao", "mecanica", "moto_geral", "fora_do_tema"}
VEREDITOS = {"publicar", "corrigir", "nao_publicar"}
CAMPOS = {"html": "html", "titulo": "titulo", "descricao": "descricao"}
TIPOS = {"marca_falsa", "preco", "erro_tecnico", "seguranca", "invencao", "promessa"}


def norm(t):
    return re.sub(r"\s+", " ", t or "").strip()


def main():
    pasta = Path(sys.argv[1]).resolve()
    n = sys.argv[2].zfill(2)
    lote = (pasta / "revisao" / f"lote_{n}.txt").read_text(encoding="utf-8")
    ordem = re.findall(r"^=== VERBETE \d+/\d+ \| slug: (\S+)", lote, flags=re.M)
    verbetes = {}
    for linha in (pasta / "verbetes.jsonl").read_text(encoding="utf-8").splitlines():
        if linha.strip():
            v = json.loads(linha)
            verbetes[v["slug"]] = v
    try:
        res = json.loads((pasta / "revisao" / f"resultado_{n}.json").read_text(encoding="utf-8"))
    except Exception as e:  # noqa: BLE001
        print(f"ERRO: JSON inválido: {e}")
        return 1
    erros = []
    slugs = [r.get("slug") for r in res]
    if slugs != ordem:
        faltam = [s for s in ordem if s not in slugs]
        sobram = [s for s in slugs if s not in ordem]
        erros.append(f"slugs não batem com o lote (faltam {faltam}, sobram {sobram}, ou ordem diferente)")
    for r in res:
        s = r.get("slug")
        v = verbetes.get(s)
        if not v:
            continue
        if r.get("tema") not in TEMAS:
            erros.append(f"{s}: tema inválido {r.get('tema')!r}")
        if r.get("veredito") not in VEREDITOS:
            erros.append(f"{s}: veredito inválido {r.get('veredito')!r}")
        if r.get("veredito") == "corrigir" and not r.get("correcoes"):
            erros.append(f"{s}: veredito corrigir sem correções")
        if r.get("veredito") == "nao_publicar" and not norm(r.get("motivo")):
            erros.append(f"{s}: nao_publicar sem motivo")
        for i, c in enumerate(r.get("correcoes") or [], 1):
            campo = CAMPOS.get(c.get("campo"))
            if not campo:
                erros.append(f"{s} #{i}: campo inválido {c.get('campo')!r}")
                continue
            if c.get("tipo") not in TIPOS:
                erros.append(f"{s} #{i}: tipo inválido {c.get('tipo')!r}")
            if "novo" not in c:
                erros.append(f"{s} #{i}: falta 'novo'")
            trecho = norm(c.get("trecho"))
            if not trecho:
                erros.append(f"{s} #{i}: trecho vazio")
                continue
            vezes = norm(v.get(campo)).count(trecho)
            if vezes != 1:
                erros.append(f"{s} #{i}: trecho aparece {vezes}x em {campo}: {trecho[:90]!r}")
    if erros:
        print("\n".join(erros))
        print(f"{len(erros)} problema(s)")
        return 1
    cont = {}
    for r in res:
        cont[r["veredito"]] = cont.get(r["veredito"], 0) + 1
    print(f"OK: {len(res)} verbetes, {sum(len(r.get('correcoes') or []) for r in res)} correções, {cont}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
