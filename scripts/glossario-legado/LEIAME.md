# Glossário antigo do WordPress de volta

Até abril de 2026 o site tinha milhares de verbetes em `/glossario/o-que-e-…/`, gerados por
IA no WordPress (plugin Glossário Ninja). Eles traziam ~76% dos cliques orgânicos e sumiram na
migração (soft 404, depois 410). Estes scripts trazem de volta, no mesmo endereço, os verbetes
que ainda tinham tráfego no Search Console, a partir das cópias do Internet Archive.

Os dados ficam numa pasta de trabalho fora do repositório (`<pasta>`), com as listas do
Search Console (`gsc_glossario_*.txt`, uma linha `slug|cliques|impressões|posição`) e, se
houver, a lista de URLs guardadas pelo archive.org (`arquivados.txt`).

1. **Baixar** — `python3 raspar_wayback.py` (rodar de dentro da pasta de trabalho, com o
   script copiado para ela): grava `verbetes.jsonl`, `falhas.jsonl` e `nao_arquivados.jsonl`
   (o que nem o archive.org guardou e precisa ser reescrito do zero).
2. **Revisar** — `python3 preparar_revisao.py <pasta>` divide em lotes; cada lote é revisado
   seguindo `REVISAO.md` (revisão cirúrgica: sai menção à W-Tech, preço, erro técnico, risco
   de segurança e invenção; o resto fica como o Google conhecia) e conferido com
   `python3 verificar_revisao.py <pasta> XX`.
3. **Aplicar** — `python3 aplicar_revisao.py <pasta>` grava `verbetes_revisados.jsonl` e
   `revisao/relatorio.md`. Para tudo se um trecho não bater ou se sobrar W-Tech ou R$.
4. **SQL** — `python3 gerar_sql.py <pasta> --publicar` grava `glossario_legado.sql` (upsert
   por slug; só mexe em linhas de origem `WORDPRESS_LEGADO`). Sem `--publicar`, entra como
   rascunho. `--publicar` recusa texto sem revisão.
5. **Banco** (VPS) — primeiro `migrations/2026-09-29_glossario_legado_wordpress.sql`, depois o
   `glossario_legado.sql`, pelo `psql` do container `wtechdb_supadb` com `-U supabase_admin`:
   a tabela é dele, e com `-U postgres` o `alter table` falha ("must be owner").
6. **Deploy** — o build lê do banco os verbetes publicados para o sitemap e o prerender, por
   isso vem depois do passo 5. Em seguida, IndexNow com os caminhos recuperados
   (`node scripts/indexnow.mjs /glossario/<slug> …`).

O servidor já cuida do resto: verbete publicado responde 200 (`server/publicRoutes.ts`), o
endereço antigo com barra no fim leva 301 para o sem barra, e os verbetes que não voltaram
continuam com 410 (`server/legacyRedirects.ts`).
