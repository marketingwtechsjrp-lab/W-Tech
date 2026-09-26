# Landing Studio W-Tech

## Fluxo

Marketing → Landing pages → curso → Editar conteúdo.
O mesmo editor é utilizado no cadastro de cursos e no painel de marketing.
O fluxo foi reorganizado a partir do painel real do Pecon: lista por produto (aqui, curso), modelo em uso explícito, prévia e edição por blocos. Não copiamos a identidade visual agropecuária.
O editor tem quatro etapas: Modelo, Conteúdo, Prévia e Revisão. Conteúdo abre uma lista de blocos com edição individual, visibilidade e ordem nos modelos compatíveis (V9–V12).
Os 12 modelos aparecem por padrão; o filtro dos três novos é opcional. O seletor de cada curso também oferece todos os 12.
Escolher outro modelo na lista é apenas uma seleção pendente: “Revisar e aplicar” abre o editor e a alteração só é persistida em “Salvar página”. “Copiar link” continua copiando o modelo salvo.
Trocar de modelo não duplica o curso nem apaga o conteúdo. O modelo salvo aparece na linha da turma.
O cronograma do curso só é espelhado quando seus módulos são editados; trocar o visual não sobrescreve o cronograma. Restaurar a ordem preserva a visibilidade dos blocos.
Em localhost, um aviso diferencia a versão local da produção e informa que salvar utiliza o banco conectado ao ambiente. A fixture de QA abaixo é a exceção isolada em memória.

O catálogo único está em `lib/landingTemplates.ts`. Os nove modelos anteriores continuam disponíveis.

| Modelo novo | Rota | Direção |
| --- | --- | --- |
| W-Tech Cinema | `/lp10/:slug` | Preto, dourado, CTA vermelho e vídeo na abertura |
| W-Tech Signature | `/lp11/:slug` | Branco, preto e vermelho; formação premium |
| W-Tech Performance | `/lp12/:slug` | Preto e vermelho; composição técnica |

Vídeos YouTube são carregados ao clicar. MP4/WebM também são aceitos pelos três modelos.
No Cinema, MP4/WebM podem compor o fundo em movimento, com pausa e respeito a movimento reduzido.
Usar arquivos de vídeo otimizados para web: o vídeo original completo não deve ser enviado como um fundo pesado sem revisão.

## Marca e acervo

### Revisão de confiança e profundidade

Os três modelos premium agora compartilham retrato de estúdio, apresentação em vídeo ampliado, narrativa visual com registros reais, programa expansível, relatos sem vídeos duplicados e informações de logística/investimento.
Na seleção de um novo design, a sequência recomendada começa pelo instrutor; seções ocultas permanecem ocultas. A ordem de um design já salvo continua editável e é respeitada.
Para Alex Crepaldi, a arte legada de boas-vindas é substituída visualmente pelo retrato de estúdio `/images/alex-webp.webp`. Novos uploads autorais continuam sendo respeitados.
O vídeo da hero abre em diálogo acessível, com fechamento por Escape; o player é desmontado ao fechar. Animações de entrada são discretas e respeitam movimento reduzido.

Usar somente registros originais da W-Tech. Nada de imagens geradas ou bancos de imagens.
O acervo inicial e sua procedência estão em `lib/landingMedia.ts`.
Os arquivos `turma-lisboa-original.webp` e `estrutura-lisboa-original.webp` são frames sem retoque do vídeo já existente `public/videos/como_foi.mp4`, em 00:38 e 00:24.
As outras fotos/artes já eram utilizadas nas páginas de Lisboa e Ergonomia.
Imagens cadastradas pelo administrador são preservadas; sua autoria deve ser conferida por quem as envia.
O filtro de imagens ilustrativas conhecidas é uma proteção de fallback, não uma verificação automática de autenticidade.

Os novos modelos não inserem depoimentos fictícios, números inventados, alertas de inscrições ou escassez artificial.
Listas explicitamente vazias de depoimentos e cronograma permanecem vazias.

## Prévia e compatibilidade

- V10–V12: prévia do rascunho em iframe, via mensagens de mesma origem; sem salvar o rascunho e com formulário desativado.
- V1–V9: prévia do conteúdo salvo, identificada como tal no editor.
- URLs antigas continuam aceitas; o viewer encaminha para o modelo salvo, preservando query e hash.
- `?preview=1` permite experimentar outro modelo sem mudar a seleção persistida.
- Turmas internacionais mantêm contato consultivo, sem ativar o checkout brasileiro.
- A indicação de link externo no cartão informa quando a agenda não usa a LP do curso.
- Nenhuma migração de banco faz parte desta entrega; são usados os campos existentes.

## Validação local

`node --experimental-strip-types --test teste/landing-studio.test.ts`

`npx vite build`

Com o servidor de desenvolvimento ativo, `/teste/fixtures/landing-studio.html` é um cenário isolado de QA.
Suas requisições de escrita são interceptadas e mantidas em memória. Não usar esse cenário como conteúdo real de campanha.
`window.landingQA` permite inspecionar `writes`, simular `failSave` / `failLoad` e consultar `pages()`.

Conferidos no navegador: seleção de modelo, rascunho sem gravação, formulário desativado, salvamento isolado por turma, erro de salvamento com rascunho preservado, layout desktop/celular e contexto internacional.
A checagem TypeScript global do projeto contém erros preexistentes fora desta implementação; o build Vite é uma verificação separada.

## Publicação

A revisão corresponde à versão 3.43.0, desenvolvida na branch `codex/landing-studio-premium`.
Publicar o código disponibiliza o novo editor e os 12 modelos, sem trocar automaticamente o modelo salvo de nenhuma turma.
O deploy utiliza o Dockerfile existente e as variáveis do serviço `wtechprod_psite`, preservando uma imagem de rollback antes da atualização. Não exige migração nem alteração dos dados de produção.
Antes de publicar uma campanha, revisar mídia original, programa, datas, endereço, contatos e condições reais da turma.
