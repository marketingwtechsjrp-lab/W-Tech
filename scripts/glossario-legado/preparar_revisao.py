#!/usr/bin/env python3
"""
Divide os verbetes baixados em lotes legíveis para a revisão.

    python3 preparar_revisao.py <pasta-de-trabalho> [lotes]

Lê <pasta>/verbetes.jsonl (raspar_wayback.py) e grava <pasta>/revisao/lote_XX.txt
(padrão: 10 lotes, por ordem de cliques) e <pasta>/revisao/INSTRUCOES.md, cópia das
regras de REVISAO.md. Cada lote vira um <pasta>/revisao/resultado_XX.json, conferido
com verificar_revisao.py antes do aplicar_revisao.py.
"""
import json
import shutil
import sys
import textwrap
from pathlib import Path


def main():
    pasta = Path(sys.argv[1]).resolve()
    lotes = int(sys.argv[2]) if len(sys.argv) > 2 else 10
    saida = pasta / "revisao"
    saida.mkdir(exist_ok=True)
    shutil.copyfile(Path(__file__).with_name("REVISAO.md"), saida / "INSTRUCOES.md")
    vs = [json.loads(l) for l in (pasta / "verbetes.jsonl").read_text(encoding="utf-8").splitlines() if l.strip()]
    vs.sort(key=lambda v: -v["cliques"])
    tam = -(-len(vs) // lotes)
    for n in range(lotes):
        parte = vs[n * tam:(n + 1) * tam]
        if not parte:
            break
        linhas = [f"# Lote {n + 1:02d} — {len(parte)} verbetes. Slugs, na ordem:"] + [f"- {v['slug']}" for v in parte] + [""]
        for i, v in enumerate(parte, 1):
            linhas += [
                f"=== VERBETE {i}/{len(parte)} | slug: {v['slug']} | cliques: {v['cliques']}",
                f"TITULO: {v['titulo']}",
                f"DESCRICAO: {v['descricao']}",
                "HTML:",
            ]
            for linha in v["html"].splitlines():
                # quebra só para leitura; a aplicação das correções ignora diferenças de espaço
                linhas += textwrap.wrap(linha, 700, break_long_words=False, break_on_hyphens=False) or [""]
            linhas.append("")
        (saida / f"lote_{n + 1:02d}.txt").write_text("\n".join(linhas) + "\n", encoding="utf-8")
        print(f"lote {n + 1:02d}: {len(parte)} verbetes")


if __name__ == "__main__":
    main()
