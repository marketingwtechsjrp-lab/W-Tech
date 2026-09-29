# Revisão dos verbetes do glossário antigo da W-Tech (antes de republicar)

## Contexto

Estes verbetes estavam no ar em `w-techbrasil.com.br/glossario/o-que-e-…` até abril de 2026,
quando o site foi migrado e eles sumiram. Foram gerados em 2024-2025 por um plugin de IA do
WordPress (Glossário Ninja), sem revisão humana. Juntos traziam ~76% dos cliques orgânicos
do site. A ideia é republicá-los **no mesmo endereço e com o mesmo texto**, porque é esse
texto que o Google já conhecia e ranqueava. Por isso a revisão é **cirúrgica**: só sai ou
muda o que está errado, é inventado ou é perigoso. Não é reescrita.

**Quem é a W-Tech Brasil:** centro técnico e escola de suspensão de motos (São Paulo).
Dá cursos de suspensão para mecânicos e pilotos (presenciais e o curso online de regulagem
de suspensão para pilotos), faz serviço de suspensão e tem loja de peças de suspensão.
A W-Tech **não fabrica motos**, não existe "moto WTech", e ela **não é marca** de cabos,
relés, carenagens, guias de corrente, sistemas de ignição, bujões, fluido de freio etc.

## O que corrigir (e só isso)

1. **Menções à W-Tech (marca_falsa)** — toda frase ou oração que cite W-Tech / WTech /
   W-TECH sai ou é neutralizada, inclusive as plausíveis: não temos como confirmar nenhuma,
   e a página nova já tem a chamada certa para o curso. Ex.:
   - "…em motocicletas off-road, como as da WTech." → "…em motocicletas off-road."
   - "Cabos de alta qualidade, como os oferecidos pela WTech, são projetados para…" →
     "Cabos de alta qualidade são projetados para…"
   - "Marcas como WTech, Renthal e TM Designworks…" → tirar só a W-Tech da lista
     (e tirar também a marca de terceiro que não fabrica aquilo, se for o caso).
   - Frase que só existe para promover a W-Tech ("A WTech, sempre atenta às inovações…") → apagar.
2. **Preços e valores de mercado (preco)** — qualquer valor em R$, faixa de preço ou custo
   estimado: apagar a frase (dado velho, sem fonte). Se a frase apagada deixar o parágrafo
   sem sentido, troque por uma frase neutra e sem número (ex.: "O preço varia conforme ano,
   estado de conservação e região; compare anúncios e revendas antes de fechar negócio.").
3. **Erro técnico (erro_tecnico)** — afirmação técnica claramente errada (ex.: dizer que
   DOT 5.1 é à base de silicone; confundir pré-carga com compressão; unidade errada; valor
   absurdo). Corrija com a menor mudança possível. Em dúvida razoável, deixe como está —
   não "melhore" o que é só impreciso ou genérico.
4. **Segurança (seguranca)** — orientação que pode causar acidente ou dano (ex.: misturar
   DOT 5 com DOT 4, rodar com vazamento de freio, apertar sem torque especificado quando o
   texto dá um valor errado). Corrija ou apague.
5. **Invenção (invencao)** — loja, empresa, evento, estatística, norma, estudo, lei, preço
   de serviço ou endereço inventado/impossível de verificar. Apague. Afirmação falsa sobre
   marca de terceiro (ex.: marca que não fabrica aquele produto) também entra aqui.
6. **Promessa (promessa)** — garantia de resultado, "o melhor do mercado", "entre em contato
   com nossa equipe", chamada para comprar. Apague ou neutralize.

Vale para o HTML, para o TITULO e para a DESCRICAO (meta description) de cada verbete.

## O que NÃO fazer

- Não reescrever por estilo, SEO, tamanho, repetição ou "texto genérico de IA".
- Não acrescentar conteúdo novo, exceto a cola mínima para a frase continuar correta.
- Não trocar termos (bengala/garfo, regulagem/acerto etc.). Português do Brasil sempre.
- Não editar os arquivos lote_XX.txt nem verbetes.jsonl. Não acessar a internet, a VPS
  nem o banco. Não publicar nada. Só ler o seu lote e gravar o seu resultado.
- Conferir o resultado com `python3 scripts/glossario-legado/verificar_revisao.py <pasta> XX`
  até sair "OK".

## Veredito por verbete

- `publicar` — nada a corrigir.
- `corrigir` — publicar depois de aplicar as `correcoes`.
- `nao_publicar` — o verbete não é sobre moto/mecânica/pilotagem (fora do tema), ou é
  essencialmente feito de fatos inventados (ex.: lista de lojas, "melhores oficinas de BH"),
  ou ficaria sem sentido depois das correções. Explique em `motivo`.

`tema`: `suspensao` (suspensão, amortecedor, mola, bengala, SAG, óleo de suspensão…),
`mecanica` (outras partes/manutenção da moto), `moto_geral` (modelos, pilotagem,
equipamento, off-road em geral) ou `fora_do_tema`.

## Formato do resultado

Grave **um** arquivo JSON (lista com **todos** os verbetes do lote, na ordem do lote):

```json
[
  {
    "slug": "o-que-e-diodo-retificador",
    "tema": "mecanica",
    "veredito": "corrigir",
    "motivo": "",
    "correcoes": [
      {
        "campo": "html",
        "tipo": "marca_falsa",
        "trecho": "…texto copiado exatamente do lote…",
        "novo": "…texto corrigido, ou \"\" para apagar…",
        "motivo": "curto"
      }
    ]
  }
]
```

Regras do `trecho` (as correções são aplicadas por programa, por busca exata):
- `campo` é `html`, `titulo` ou `descricao`.
- Copie o trecho **exatamente** como está no lote, caractere por caractere, inclusive
  entidades como `&#8220;` e acentos. Diferenças de espaço/quebra de linha são toleradas.
- O trecho deve aparecer **uma única vez** no campo. Prefira frases inteiras (do início
  da frase até o ponto final), sem tags HTML dentro dele.
- Para apagar uma seção inteira, faça uma correção para o `<h2>…</h2>` (trecho com o
  texto do título, sem as tags) e uma para cada parágrafo dela.
- `novo` nunca pode deixar frase quebrada, vírgula sobrando ou parágrafo vazio de sentido.

No fim, confira que o JSON é válido e que tem exatamente um item por slug do lote.
