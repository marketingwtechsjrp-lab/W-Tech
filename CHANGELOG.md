# Histórico de Atualizações - W-Tech Platform


## v3.29.0 (2026-07-28) - VSL clara isolada e conteúdo oficial na landing clara
- Adiciona a rota dedicada `/curso-suspensao-piloto-vsl-clara`, com player protegido, avanço progressivo e encaminhamento para a landing clara
- Inclui as artes oficiais de SAG, molas, ergonomia e pneus nos quatro fundamentos
- Adiciona o carrossel infinito com as oito capas reais dos módulos do curso
- Substitui os depoimentos reescritos pelos quatro textos idênticos aos da página principal e os apresenta em loop contínuo
- Amplia a validação automatizada para a nova rota, destino da inscrição, imagens, carrosséis e layout móvel

## v3.28.0 (2026-07-28) - Landing clara VSL com imersão premium
- Reorganiza a versão clara do curso de suspensão para priorizar a VSL já na primeira dobra
- Adiciona três cenários premium de motocross, ajuste de clickers e pilotagem em terreno técnico
- Reforça a jornada visual do diagnóstico ao resultado, mantendo checkout, rastreamento e conteúdo comercial
- Remove integralmente as versões V3 e V4 e suas rotas públicas
- Adiciona validação automatizada para desktop, celular, carregamento das imagens e rotas removidas

## v3.27.0 (2026-07-28) - Glossário nativo e nova identidade visual do blog
- Adiciona gerador nativo de glossário ao painel administrativo, com criação manual, geração por IA, revisão e publicação
- Adiciona glossário público pesquisável com índice A-Z, páginas individuais, SEO e integração ao sitemap
- Substitui as 313 capas e 129 imagens internas legadas do blog por uma biblioteca editorial local de motocross, off-road e suspensão
- Padroniza novas capas geradas ou importadas pelo painel e elimina dependências visuais de WordPress, Unsplash e geradores externos

## v3.26.1 (2026-07-28) - Correção da imagem da sede na home
- Substitui a foto genérica com correia pela fachada oficial da sede W-Tech na página inicial
- Atualiza o texto alternativo da imagem para descrever corretamente a sede

## v3.26.0 (2026-07-27) - Refatoracao VSL Obrigatoria Curso Piloto
- Refatorada VSL com player central e alerta de audio
- Adicionado pitch reveal delay timer
- Adicionado Sticky CTA Bar e Exit Intent retention modal

## v3.25.1 (2026-07-22) - Inbox do WhatsApp atualiza sozinho e Integrações voltam a salvar
- Inbox do WhatsApp (Meta) passa a atualizar sozinho a cada 10s, sem depender do Realtime — o Postgres da VPS roda só o PostgREST e o websocket nunca conectava
- A conversa aberta só é recarregada quando muda de verdade, evitando rebaixar as mídias em base64 a cada ciclo e rolar a tela do atendente no meio da leitura
- Salvar em Configurações e Integrações não falha mais por inteiro quando o servidor recusa uma chave protegida — o restante das configurações persiste
- As chaves recusadas pelo servidor passam a ser informadas na tela, em vez de o salvamento falhar em silêncio

## v3.24.2 (2026-07-15) - Microfone e câmera liberados no site (áudio do inbox e login facial)
- Corrige 'Não foi possível acessar o microfone' no inbox do WhatsApp em produção — o header Permissions-Policy bloqueava microfone e câmera no site inteiro
- Permissions-Policy agora libera camera e microphone apenas para o próprio site (self)
- iframes de terceiros continuam bloqueados
- Login facial (câmera) volta a funcionar em produção
- Mensagem de erro do gravador de áudio agora diferencia permissão bloqueada de microfone ausente

## v3.24.1 (2026-07-15) - Correção do salvamento das Configurações do sistema
- Corrige o erro 'new row violates row-level security policy' ao salvar as Configurações (Integrações)
- Nova função RPC upsert_site_config (SECURITY DEFINER) para gravar a SITE_Config — leitura anônima dos segredos continua bloqueada
- Gravação da config em lote (uma chamada só) no admin e no painel do bot de grupos
- Blindagem anti-apagamento: segredo com campo vazio não sobrescreve o valor salvo no banco
- Migração documentada em migrations/2026-07-15_fix_site_config_write_policy.sql

## v3.24.0 (2026-07-12) - Atendentes WhatsApp — sincronização de conversas e análise por IA
- Nova aba Configurações → Atendentes WhatsApp: conecta o WhatsApp de até 5 atendentes por QR Code (Evolution API)
- Sincronização automática de todas as mensagens enviadas e recebidas de cada atendente
- Monitor de conversas em tempo real (somente leitura), com atualização ao vivo via Supabase Realtime
- Relatórios de qualidade de atendimento gerados por IA sob demanda — a IA analisa, nunca responde no WhatsApp
- Nova Edge Function wa-atendentes-webhook protegida por token (sem consumir funções serverless da Vercel)
- Novas tabelas SITE_WaAtendentes, SITE_WaAtendenteMensagens e SITE_WaAtendenteAnalises com RLS e Realtime

## v3.23.0 (2026-07-05) - Stripe: chaves de produção e teste com seletor de modo
- Painel admin passa a guardar as chaves Stripe de produção (sk_live) e de teste (sk_test) separadamente
- Novo seletor Produção/Teste define qual chave fica ativa nos checkouts, sem precisar trocar a chave a cada teste
- Chave legada migra automaticamente para Produção e é mantida sincronizada com o modo ativo (compatibilidade)

## v3.22.1 (2026-07-04) - WhatsApp do curso online isolado da instância mestre + ajustes no checkout Lisboa
- Pix do curso online (Kiwify) agora sai por instância WhatsApp dedicada (w-tech-curso-online), nunca mais pela instância mestre das configurações
- Nova rota wa_instance_curso_online no painel Admin > Integrações > Motor de Envio, cobrindo Pix gerado, carrinho abandonado e boas-vindas
- Follow-up de escassez (+15min) da fila SITE_Automacao_Fila corrigido no banco: lia URL/apikey/instância fixas no código, agora lê de SITE_Config na mesma ordem de prioridade do webhook
- CheckoutLisboa: dedup de lead por e-mail e telefone, enrollment só é criado após pagamento confirmado (não mais no início do checkout)
- ObrigadoLisboa: fluxo de confirmação migrado para usar lead id (lid) com fallback ao enrollment id (eid) legado

## v3.22.0 (2026-07-03) - Curso Lisboa Out/2026: 3 dias, checkout Stripe com escolha de valor e novo local Art on Wheels Garage

- **Datas do curso de Lisboa** alteradas de 14-15 Nov para **23, 24 e 25 de Outubro** (3 dias), com novo **Dia 03** de Prática Intensiva & Certificação (módulos M07-M09)
- **Novo checkout `/checkout-lisboa`** espelhando o do Brasil (Stripe/EUR): vídeo, seção de credibilidade e **escolha de valor** (€480 integral ou €150 de sinal/reserva de vaga)
- **Fluxo unificado:** a LP e a inscrição direta criam o lead no CRM (fica como pretendido mesmo sem pagar) e seguem ao checkout **preservando as UTMs** (LEI 10)
- **Novo local do curso:** de Liqui Moly HQ para **Art on Wheels Garage** (Centro Empresarial II, Rua da Tapada Nova, 2710-297 Sintra) — endereço, mapa, contatos e vídeo atualizados em todas as páginas do funil


## v3.21.0 (2026-07-03) - Campanhas de Captura: quiz gamificado, leads isolados e envio em lote ao CRM

- **Novo módulo "Captura" no Marketing Hub**: campanhas de captação com 6 modelos (LP de Captura, Simples, Venda de Produto, Lançamento de Curso, Lançamento de Produto e Ferramenta quiz/enquete)
- **Página pública /captura/:slug**: quiz gamificado "corrida das motinhas" — cada cidade avança na pista conforme a porcentagem de votos da enquete, com bandeirada e selo de líder
- **1ª campanha ativa**: "Próxima Cidade — Curso de Setembro" (Vitória, Curitiba, Cuiabá e Campo Grande)
- **Leads isolados por campanha**: capturas ficam em lista interna (SITE_CaptureLeads) com voto, consentimento LGPD e UTMs (LEI 10); 1 voto por telefone
- **Envio manual em lote ao CRM**: seleção de leads na campanha e envio via dedupe (telefone/e-mail), com tags de campanha e voto, origem e contexto preenchidos
- **Fix CRM**: leads com context_id nulo eram ocultados pelo filtro do funil (NULL não casa em .neq no Postgres) — 115 leads voltaram a aparecer na Central de Leads


## v3.20.1 (2026-07-03) - Cronograma no WhatsApp só com turmas futuras: fim do disparo de cursos já passados

- **BUG CORRIGIDO — cursos passados nos disparos:** a Bia listava para os leads no WhatsApp turmas cuja data já tinha passado (ex.: curso de março em São José do Rio Preto ainda marcado como `Published`), com data e horário vencidos. Agora `loadCourseContext` (`api/_aiReply.ts`) só monta a lista com turmas de **hoje pra frente** — mantém quem ainda não terminou (`date_end >= hoje`) ou, sem `date_end`, cuja data de início é hoje/futura
- **Grupo de gestão:** o catálogo que alimenta as respostas dos Assistentes de IA (`api/_aiSectorData.ts`) agora marca cada curso com `ja_ocorreu` — cursos passados não são apresentados como cronograma/agenda futura, mas continuam disponíveis para consulta histórica (faturamento, inscritos)
- **Regra dos Assistentes de IA:** nova regra obrigatória (`lib/aiAgentDefaults.ts`) — cronograma/agenda/próximos cursos lista **apenas** turmas de hoje em diante (usando `proximos_cursos`), nunca um curso já ocorrido


## v3.20.0 (2026-07-03) - Bia transfere para o CRM: roleta de atendentes, citação por nome e peças para humano

- **Transferência vira lead no CRM:** todo handoff da Bia cria/atualiza o lead em SITE_Leads (dedupe por telefone), com nota do motivo, última mensagem do cliente e tag `bia-handoff`
- **Roleta aleatória:** sem citação de nome, o dono do lead é sorteado entre a equipe ativa (Super Admin e Financeiro fora do sorteio); lead que já tem dono mantém o dono
- **Citação por nome:** "quero falar com o Emerson" transfere direto para o Emerson — força o dono do lead e a Bia confirma com o nome
- **Peças → humano:** nova intenção `parts` (compra/orçamento de peça, ferramenta, mola, óleo) SEMPRE transfere para atendente, com lead roteado no CRM
- **Reativação:** lead frio/perdido que chama de novo volta ao board como Novo
- **Sandbox alinhado:** o teste do painel simula a regra de peças


## v3.19.1 (2026-07-02) - Correção da IA do WhatsApp: fim do "vou te transferir" em loop + treinamento da Bia

- **BUG CORRIGIDO — handoff permanente:** o teto de mensagens antes de transferir contava a conversa INTEIRA desde sempre. Qualquer contato com 6+ mensagens no histórico caía direto no "Um momento, vou te transferir para um atendente" — até num simples "oi". Agora o teto vale **por sessão (últimas 24h)**
- **BUG CORRIGIDO — fallback em loop:** conversa já marcada como 'pendente' recebia o aviso de transferência de novo a cada mensagem. Agora sai **uma vez por handoff**
- **Prompt de conversa reescrito** (`api/_aiReply.ts`): saudações nunca viram transferência (Bia se apresenta e pergunta como ajudar), uma pergunta por vez, condução para a inscrição com preço/data/link reais, transferência só quando o cliente pede, é reclamação/cancelamento ou falta informação
- **Sandbox do painel alinhado:** o teste em Admin → IA usa as mesmas instruções do backend
- **Treinamento turbinado no banco:** persona vendedora completa da Bia, informações do negócio (sede 1.200 m² em Rio Preto, +5.000 alunos, suporte vitalício, turmas na Europa) e base de conhecimento com **10 itens factuais** (pagamento em 10x, certificado com validação online, reciclagem de ex-alunos, mapa de credenciados, calculadoras de molas/óleo) — antes estava **vazia**
- **Teto de handoff:** 6 → 12 mensagens por sessão (ajustável no painel)
- Obs: a IA continua **desligada** (como estava) — ligar em Admin → WhatsApp → IA quando quiser ativar


## v3.19.0 (2026-07-02) - Rebrand do CRM: Central de Leads, entradas de hoje e tagueamento curso/região

- **Header rebrandado "Central de Leads"** com identidade W-Tech (Rajdhani + dourado), indicador ao vivo (realtime) e contador total da base
- **Faixa "Entradas de Hoje"** no topo do CRM: todos os leads do dia em cards compactos (hora, nome, curso, região, etapa) atualizados em tempo real — botão **Focar em hoje** filtra o board inteiro para o dia
- **Tagueamento automático de CURSO e REGIÃO** (`lib/leadOrigin.ts`): interpreta context_id de LPs, Quiz, eventos Europa/Lisboa, WhatsApp e formulários; mesma classificação usada em cards do kanban, view de lista, filtros e exportação
- **Filtros novos:** dropdown de Curso e de Região na barra de controles + período **Hoje** (dia de calendário, diferente de "últimas 24h") junto de 7d/30d/Tudo
- **Chips de filtros ativos** removíveis com contador "X de Y leads" e ação Limpar tudo
- **Cards do kanban** com tag de curso (dourado), tag de região (azul) e selo ⚡HOJE nos leads que entraram no dia
- **Cards de etapa** ganharam percentual e barra de proporção; **funil detalhado** virou colapsável (toggle na barra de controles) liberando espaço vertical para o board
- **Export XLS** com colunas Curso e Região; view em lista mostra a origem taggeada em vez do context_id cru


## v3.18.0 (2026-07-02) - Liga/desliga da automação de mensagens (geral e por categoria)

- **Interruptor GERAL no Motor de Envio** (Admin → Integrações): desliga TODA a automação de mensagens transacionais de uma vez — boas-vindas, cobrança, cronograma e relatório param de sair até religar
- **Toggle por categoria:** cada card do Motor de Envio (Venda de Curso/Boas-vindas, Cobrança, Cronograma, Relatório do Dono) ganhou seu próprio liga/desliga — dá para pausar só a cobrança, por exemplo, mantendo o resto ativo. Card desativado fica esmaecido com aviso 🔕
- **Backend no ponto único de envio (`api/_waDispatch.ts`):** `sendTransactional` verifica interruptor geral + categoria ANTES de enviar; desligado = registrado como `skipped` (não é erro). Cobre todos os fluxos: webhook Mercado Pago (boas-vindas), lembretes de saldo, lembretes de cronograma e relatório diário
- **Seguro por padrão:** flag ausente = ligado (comportamento atual preservado); só o valor explícito `false` desliga; falha de leitura do config nunca bloqueia envio
- Campanhas/Remarketing e o Bot de IA do grupo NÃO são afetados — cada um mantém seu próprio controle

## v3.17.0 (2026-07-02) - IA acha qualquer curso citado + Bia lê as métricas do WhatsApp oficial

- **Bug do curso de Belo Horizonte corrigido (`api/_aiSectorData.ts`):** o matching de cursos citados casava por palavras genéricas do título ("curso", "suspensão", "W-TECH") — TODA pergunta com "curso" casava com o catálogo inteiro e o corte de 5 pegava os errados; além disso o detalhe financeiro só existia no pack do Léo, então "qual valor recebido em BH" (sem palavra de inscrições) nem o coletava. Agora: **matching por pontuação** (cidade > local > palavras distintivas, genéricas ignoradas) e o **detalhe do curso citado é compartilhado** entre Rita, Léo e Sofia — validado: "valor recebido do curso de belo horizonte" → R$ 53.629,32 (bate com o painel)
- **Bia agora lê as MÉTRICAS do WhatsApp oficial** (mesma fonte da tela Métricas): conversas por status, resolução pela IA vs humanas, sentimento dos clientes, prioridade, **principais tópicos e dúvidas**, conversas que **precisam de atenção** (com ação sugerida) e resumos por conversa (`SITE_WhatsAppCloudConversations.ai_*`)
- **Tempos de atendimento (7 dias):** tempo médio de primeira resposta, maior demora, % respondidas em até 5min — calculado das mensagens reais (`in` → próxima `out` por conversa)
- **Demora agora:** quem está aguardando resposta neste momento (última mensagem é do cliente) com há quanto tempo, e os leads novos esperando o primeiro atendimento há mais tempo (CRM)
- **Roteamento:** "tempo/demora/dúvidas/sentimento/tópicos/métricas/análise" → Bia; "recebido/recebeu" → Rita; termos de consulta não são mais confundidos com nomes de aluno

## v3.16.1 (2026-07-02) - Correção: perguntas do grupo ficavam sem resposta (timeout silencioso)

- **Diagnóstico:** o `fromMe` da v3.15.0 funcionou — as perguntas do Daniel no grupo chegavam e eram logadas, mas a resposta morria no meio do caminho (timeout do LLM em 20s ou a função serverless abortada no limite de 10s do plano Hobby), o erro não era registrado em lugar nenhum e o dedupe marcava a mensagem como "já processada" para sempre
- **`vercel.json`:** `maxDuration: 60` para `whatsapp-cloud-webhook` e `notify-students` — a função não é mais abortada no meio da resposta
- **Timeout do LLM:** 20s → 45s no bot do grupo (`api/_aiGroupBot.ts`)
- **Resposta registrada ANTES do envio:** se o envio ao WhatsApp falhar, a decisão fica no histórico do painel (nada se perde) e o envio ganhou try/catch próprio
- **Erros agora visíveis:** falha na resposta grava `[erro] …` no histórico do bot (painel → Últimas respostas do grupo) em vez de sumir em silêncio
- **Dedupe com segunda chance:** reentrega da Evolution reprocessa mensagens cuja tentativa anterior morreu sem resposta (antes: puladas para sempre)

## v3.16.0 (2026-07-02) - Painel dos Assistentes com dados reais + filtro por curso e busca de aluno

- **Números REAIS no painel (Sofia/Rita):** o dinheiro agora vem da fonte da verdade — as matrículas (`SITE_Enrollments.amount_paid`). Novos cards: **Arrecadado dos alunos (total)**, **Negociado (total)**, **Saldo a receber** e **Alunos inscritos** com breakdown real (confirmadas · check-in · pendentes). Antes o painel mostrava "Receita do mês R$ 0,00" porque somava apenas `SITE_Transactions` do mês corrente — ignorando os R$ 264 mil já arrecadados nas matrículas (`lib/aiAgentsData.ts`, `AgentWorkspace.tsx`)
- **Consulta por curso (novo `CourseInsightsPanel.tsx`):** dropdown com todos os cursos → inscritos por status, tabela vs negociado vs **arrecadado**, **defasagem (desconto)**, saldo a receber, quitados vs devendo — respeitando a moeda do curso (BRL/EUR)
- **Busca de aluno dentro do curso:** campo de busca por nome (ignora acento), filtro "só quem falta pagar" e botão **Histórico** por aluno reutilizando o modal de linha do tempo de pagamentos (entrada → parcelas → quitação) da v3.14.0
- **Fidelidade corrigida (painel E IA do grupo):** pagamento registrado sem valor negociado (`total_amount` vazio) agora CONTA no arrecadado — antes era ignorado nas somas (ex.: matrícula com R$ 500 pagos aparecia como R$ 0,00). Tabela/defasagem/saldo seguem exigindo valor negociado para não inventar desconto (`lib/aiAgentsData.ts`, `api/_aiSectorData.ts`)
- **IA prioriza o curso citado:** perguntar "quanto o João pagou no curso de São Paulo" traz primeiro a inscrição do João NAQUELE curso (matching por cidade/local/título em `findStudentsByTerms`)

## v3.15.0 (2026-07-01) - IA do grupo responde a própria instância + inteligência financeira reforçada

- **Bot de grupo responde `fromMe`:** removido o filtro que descartava toda mensagem vinda da instância conectada (`api/_aiGroupBot.ts`). Como o dono/instância conectada é quem mais pergunta no grupo, nenhuma pergunta real vinha sendo respondida (o único log existente era um teste de sandbox). O anti-loop continua garantido: respostas das personas (prefixo `emoji *Nome:*`) e o relatório diário (`🤖`) seguem ignorados, mais o dedupe por `message_id`
- **Financeiro por curso (Léo, `api/_aiSectorData.ts`):** o detalhe de cursos citados agora traz `valor_de_tabela_total`, `valor_negociado_total`, `arrecadado_total`, `saldo_a_receber`, `defasagem_desconto_total`, contagem de `quitados` vs `ainda_devendo` e a lista de **quem falta pagar** naquele curso
- **Consolidado financeiro global (Rita):** novo bloco `consolidado_financeiro_alunos` (tabela, negociado, arrecadado, defasagem/desconto e saldo a receber) considerando inscrições confirmadas, com check-in **e pendentes**; e `quem_falta_pagar` com os 20 maiores devedores e o curso de cada um
- **"Defasagem" = desconto concedido:** o termo do dia a dia (preço de tabela − valor negociado) agora roteia para a Rita, deixou de ser tratado como nome de aluno na busca, e o prompt da Rita ganhou o glossário (arrecadado / defasagem / saldo a receber) para não confundir os três
- **Histórico de pagamentos no grupo:** ao citar um aluno, a IA traz a linha do tempo entrada → parcelas → quitação (via `SITE_Transactions.enrollment_id`, mesma lógica do painel), com pagamentos antigos sem transação exibidos como "registrado na inscrição" — fidelidade total, nada estimado

## v3.14.0 (2026-07-01) - Histórico de Pagamentos por aluno no curso (entrada, parcelas e quitação)

- **Botão "Histórico" na lista de inscritos:** cada aluno do curso ganhou um modal com resumo financeiro (total negociado, pago, restante ou selo QUITADO), destaque de **entrada** e **pagamento final**, e linha do tempo completa — data e forma de pagamento de cada parcela (`components/admin/Courses/PaymentHistoryModal.tsx`)
- **Migração `add_enrollment_payment_history.sql`:** cria a coluna `enrollment_id` em `SITE_Transactions` (com índice) para vincular cada transação à inscrição do aluno
- **Bug silencioso corrigido:** as quitações manuais ("Quitar Saldo") e conciliações Stripe tentavam gravar `enrollment_id` (coluna que nunca existiu) e o lançamento **não entrava no financeiro** — agora há fallback sem a coluna, alerta visível se falhar de verdade, e o vínculo passa a ser gravado após a migração
- **Webhook Mercado Pago** grava `enrollment_id` nas transações (entrada e quitação de saldo), com fallback seguro enquanto a migração não roda
- **Fidelidade:** pagamentos antigos sem transação vinculada aparecem como "registrado na inscrição" com o valor exato da diferença — nada é estimado ou inventado

## v3.13.0 (2026-07-01) - Assistentes de IA: busca setorial fidedigna no banco e bloqueio total de internet

- **Busca setorial (`api/_aiSectorData.ts`):** cada agente agora consulta as tabelas do SEU setor no Supabase, sob medida para a pergunta — **Rita/Financeiro** (transações do mês, vendas de hoje, faturamento por curso, saldo a receber com maiores devedores), **Bia/Atendimento+CRM** (WhatsApp recebidas x enviadas hoje, tarefas abertas/atrasadas/mais urgentes, funil de leads e novos do dia), **Léo/Inscrições** (catálogo, próximos cursos, inscrições por status, alunos pendentes e detalhe financeiro dos cursos citados), **Sofia/RH+Gerência** (equipe cadastrada com cargo/status e atividade por funcionário no mês)
- **Roteador de setores:** palavras-chave da pergunta definem quais tabelas são consultadas; pergunta genérica coleta todos os setores
- **Entidades citadas:** perguntar por um aluno, lead ou funcionário traz o registro exato do banco (inscrição/valores do aluno, status/atendente/telefone do lead, atividade individual do funcionário) — matching ignora acentos ("joao" encontra "João")
- **Internet PROIBIDA para as IAs:** guardrails reforçados (fonte única = banco W-Tech; recusa pedidos de pesquisa externa mesmo sob insistência do grupo) + bloqueio técnico de modelos com navegação (sufixo `:online` do OpenRouter removido no bot de grupo, no relatório dos agentes e na IA de atendimento)
- **Roteamento de persona mais preciso:** o prompt recebe os setores detectados na pergunta como orientação principal
- Refactor: `gatherStaffActivity` extraído de `_agentsReport.ts` e reutilizado no pack da Sofia; domínio da Sofia agora inclui RH explicitamente

## v3.12.0 (2026-07-01) - Multi-instância Evolution (gerenciador + dropdowns) e módulo Assistentes de IA

- **Instâncias Adicionais (Evolution):** novo gerenciador em Admin → Integrações para cadastrar vários números do WhatsApp (ex.: um chip para marketing, outro para o dono). Cada instância tem criação/conexão via QR Code, status ao vivo (Conectado/Aguardando QR), botão de teste de envio e remoção (com opção de apagar ou manter no servidor). O registro fica em `SITE_Config` na chave `evolution_managed_instances`
- **Motor de Envio por dropdown:** os campos de texto livre de instância viraram seletores que listam a instância de automação, a padrão e todas as cadastradas — evita erro de digitação e deixa claro qual número responde por cada saída. Vale para as 4 categorias (venda/cobrança/cronograma/relatório) e para as rotas Campanhas, CRM e Recuperação
- **Nova rota "Grupo de IA (Dono)":** seleção de instância dedicada para o bot de IA do grupo (`ai_group_bot_instance`), lida com prioridade pelo `api/_aiGroupBot.ts`
- **Módulo Assistentes de IA (super admin):** novo item de menu "Assistentes de IA" (visível só para super admin) com as personas Léo (atendimento/CRM), Bia (WhatsApp/tarefas/funil), Rita (financeiro) e Sofia (consolidado + ranking de atividade por funcionário)
- **Bot de perguntas no grupo do WhatsApp:** `GroupBotPanel` + `api/_aiGroupBot.ts` — a Evolution encaminha as mensagens do grupo por webhook e a persona certa responde no próprio grupo, com anti-loop, dedupe por `message_id` e log em `SITE_AIGroupLog` (migração `create_ai_group_log.sql`)
- **Relatório diário com personas:** `api/_agentsReport.ts` reaproveita o relatório do sistema e gera recortes por setor para cada persona
- **Segurança:** a permissão `ai_assistants_super_admin` fica intencionalmente fora do catálogo de permissões — só super admin (que sempre faz bypass) enxerga o módulo, e nenhum outro cargo consegue habilitá-lo manualmente
- **Tooling:** `graphify-out/` adicionado ao `.gitignore` (output do gerador de grafo de conhecimento, não versionado)


## v3.11.0 (2026-07-01) - WhatsApp: roteamento completo de saídas por instância e relatório diário do dono

- **Relatório diário do dono (grupo WhatsApp):** resumo automático do dia — leads, inscrições, vendas, saldo a receber, campanhas e atendimento — enviado às 08:00 para o grupo escolhido, pela instância Evolution da categoria Relatório (padrão: automação). Novo módulo `api/_report.ts` portado do padrão MotoFix (skill whatsapp-evolution)
- **Painel Admin → Integrações:** novo card "Relatório Diário para o Dono" com toggle de ativação, seletor de grupo (busca os grupos direto na Evolution), prévia do texto e botão "Enviar teste agora"
- **Roteamento completo de saídas:** além das 4 categorias (venda/cobrança/cronograma/relatório), agora Campanhas/Remarketing, CRM e Recuperação de Vendas têm instância Evolution dedicada configurável (`wa_instance_campaign`, `wa_instance_crm`, `wa_instance_recovery`) na seção "Instância por rota"
- **Campanhas:** o processador do servidor (`api/_campaigns.ts`) e o do navegador (QueueProcessor) respeitam a instância dedicada de campanhas quando configurada
- **Grupos:** o envio Evolution aceita JID de grupo (`…@g.us`) sem passar pela normalização de telefone
- **Infra:** ação `system-report` embutida em `/api/notify-students` (sem função serverless nova — limite de 12 do plano Hobby) com auth por `CRON_SECRET` ou usuário do painel; disparo diário via GitHub Actions (`daily-system-report.yml`) por causa do limite de 2 crons da Vercel

## v3.10.0 (2026-06-29) - WhatsApp: humanização (balões + delay + digitando) e cursos ao vivo
- **Humanização de Envio:** divisão automática das respostas longas da IA em múltiplos balões curtos (quebras de linha/parágrafo) com delay proporcional configurável (slow, normal, fast) e indicação de "digitando..." (via Cloud API), simulando um comportamento mais humano.
- **Integração de Cursos ao Vivo:** injeção automática de dados reais de cursos (datas, local, preço e links de inscrição/checkout formatados) diretamente no prompt da IA, eliminando alucinações e permitindo responder perguntas sobre valores e turmas com dados oficiais.
- **Painel no Centro de Treino:** novas configurações na aba "IA de Atendimento" para ativar/desativar o fracionamento em balões, simulação de digitação, velocidade de digitação, limite máximo de balões e toggle para ativação de cursos ao vivo.
- **Handoff Inteligente:** contador de limite de mensagens ajustado para computar turnos de resposta do cliente (em vez de mensagens individuais enviadas pelo bot), evitando transições prematuras para atendimento humano decorrentes do fracionamento de mensagens.
- **Migration RAG & Humanização:** inclusão de nova migration `whatsapp_ai_humanize.sql` no Supabase para criação dos campos de controle de humanização na tabela `SITE_WhatsAppAIConfig`.

## v3.9.4 (2026-06-22) - WhatsApp: roteamento de saída por categoria (sem vazamento de cobrança)
- **Fim do fallback silencioso:** cada categoria (Venda/Boas-vindas, Cobrança, Cronograma, Relatório) sai SEMPRE pela saída escolhida. Se o envio oficial falhar (ex.: template não aprovado), fica marcado como falha — **não cai mais para outro número** (era o que fazia a cobrança "vazar" pela Evolution)
- **Instância Evolution por categoria:** ao escolher "Evolution (servidor)", dá para informar QUAL instância usar (em branco = padrão `suportewtech`), permitindo isolar o número do "curso online" das demais saídas
- **UI "Motor de Envio" mais clara:** mostra qual número é cada saída (API Oficial = número da Meta; Evolution = instância do servidor) e o aviso de "sem fallback"
- Servidor: `_waDispatch.ts` (remoção do fallback + `resolveInstance` por categoria) e `_whatsapp.ts` (`sendWhatsAppText` aceita instância específica)

> Após o deploy: em Configurações → Integrações → "Motor de Envio", defina Cobrança/Cronograma/Boas-vindas como **API Oficial** (precisa dos templates aprovados na Meta) OU **Evolution (servidor)** com a instância correta. O "curso online" continua isolado na instância dele.

## v3.9.3 (2026-06-22) - Fix: áudio do WhatsApp sempre em MP3 (corrige 131053 no Safari/iOS)
- A v3.9.2 ainda deixava passar `audio/mp4` direto (Safari/iOS grava MP4 com OPUS dentro → a Meta recusa com 131053). Agora **todo áudio gravado é sempre convertido para MP3** antes do envio (só passa direto se já for MP3). Garante compatibilidade em Chrome, Safari/iOS e Firefox

## v3.9.2 (2026-06-22) - WhatsApp: envio de áudio corrigido + permissões de Molas & Óleo
- **Áudio do WhatsApp corrigido:** o Chrome grava em `audio/webm`, formato recusado pela Meta (erro 131053 "Media upload error"). Agora o áudio passa por `prepareWhatsAppAudio()`: re-encoda para **MP3** no navegador (Web Audio → PCM → lamejs) quando o formato não é aceito; Firefox (ogg/opus) e Safari (mp4/aac) passam direto. Vale para gravação por microfone e anexo de arquivo
- **Permissões por módulo (Molas & Óleo):** novo grupo "Ferramentas Técnicas (Molas & Óleo)" na tela de Permissões com toggles próprios `springs_view` e `oleo_view` (antes os módulos herdavam de `catalog_view` e não dava para liberar separadamente). Gating com fallback "explícito vence" para `catalog_view`. Migration `grant_springs_oleo_permissions.sql` preserva o acesso de quem já tinha catálogo
- Dependência nova: `@breezystack/lamejs` (encoder MP3, carregado sob demanda)

## v3.9.1 (2026-06-22) - Fix: lembretes de curso com data e número corretos
- **Data corrigida:** os lembretes mostravam 1 dia a menos (bug de fuso do `new Date().toLocaleDateString`). Agora a data é montada no servidor com `fmtDate` (lê ano-mês-dia direto), exibindo a data real do curso
- **Número correto:** os lembretes (manual e automático) deixaram de sair pela **instância pessoal do atendente** (Evolution via `user?.id`) e passam a ser roteados por `/api/notify-students` → `sendTransactional` (categoria `schedule`): **template oficial da Meta `cronograma_lembrete_curso`** com fallback para a instância do **sistema** (automação). O teste também usa a instância do sistema
- Fluxo de tarefas agendadas do CRM (follow-up por atendente) mantido como está

## v3.9.0 (2026-06-20) - WhatsApp: IA de atendimento, RAG, relatórios e privacidade por atendente
### Atendimento WhatsApp (multiatendimento + IA)
- **Privacidade por atendente:** cada usuário só vê as conversas atribuídas a ele — o filtro é aplicado **na consulta** (`fetchConversations` por `assigned_to`), não só no render, então o navegador nem baixa as conversas dos outros. Admin e Gerente de Atendimento veem todas (permissão `whatsapp_view_all`)
- **Handoff humano:** Assumir / Transferir para outro atendente / Devolver à IA / Encerrar, com estado por conversa (`status`: bot/pendente/humano/encerrado, `bot_enabled`, `assigned_to`) e tag de quem enviou cada mensagem (`sent_by`)
- **Configuração por cargo:** toggle "Ver Todas as Conversas" e demais permissões do módulo em Equipe & Acesso → cargo → "Atendimento WhatsApp"
- **IA de atendimento:** resposta automática (Gemini por padrão) com **motor/modelo selecionável** (Gemini/OpenAI/OpenRouter) só para o robô do WhatsApp; ligar/desligar a IA por conversa
- **RAG (aprende sozinho):** pgvector + embeddings (Gemini text-embedding-004); ao encerrar/transferir, destila o par pergunta→resposta que resolveu e grava na memória; antes de responder, recupera atendimentos parecidos e injeta no prompt
- **Relatórios & análises:** aba Métricas com deflexão pela IA, sentimento, prioridades, top tópicos, fila de conversas que precisam de atenção, resumos por conversa e "Relatório executivo (IA)"
- Áudio por microfone e envio de mídia com checagem de permissão (`whatsapp_send`)

### Permissões & Cargos (centralização)
- **Fonte única de verdade** em `lib/permissions.ts` (`PERMISSION_CATALOG`, `createHasPermission`, `createPermissionResolver`, `ROLE_PRESETS`) — eliminadas 5 cópias divergentes de `hasPermission` no Admin e os "toggles fantasma"/"chaves órfãs". Resolver com semântica "explícito vence" (desligar um módulo agora ganha do fallback legado)
- Migrations: `whatsapp_handoff_columns`, `whatsapp_permissions_grant`, `realign_roles_permissions`, `whatsapp_ai_tables`, `whatsapp_ai_rag`

> Ativação: rodar as migrations acima no Supabase. A RAG depende de uma chave Gemini (embeddings) configurada — sem ela o robô segue funcionando, só não aprende/recupera memória.

## v3.8.1 (2026-06-19) - WhatsApp (Meta): enviar contato p/ CRM + gravação de áudio
- Botão **"Enviar p/ CRM"** no cabeçalho da conversa: cria/atualiza um lead em `SITE_Leads` com nome + telefone, escolha de **atendente** (assigned_to) e observação. Deduplica pelo telefone (últimos 8 dígitos) para não duplicar contatos
- Helpers `fetchAttendants()` e `createLeadFromContact()` em `lib/leads.ts`; novo componente `SendToCrmModal.tsx`
- **Gravação de áudio pelo microfone** no composer (gravar/enviar/cancelar com timer) — usa `MediaRecorder` do dispositivo
- Hotfixes pós-3.8.0: status agora valida o **acesso real do token** na Meta (campo `live`, evita falso "Conectado"); status + envio unificados em `/api/whatsapp-cloud-send` (GET=status, POST=envio) para respeitar o limite de 12 funções serverless da Vercel

## v3.8.0 (2026-06-19) - Inbox WhatsApp via Meta Cloud API (atendimento oficial)
- Novo módulo de atendimento estilo WhatsApp Web conectado à API oficial da Meta (número +55 17 3231-2858), **separado** e independente da automação via Evolution API
- Recebe e envia mensagens de **texto, imagem, áudio (incl. gravação por microfone) e documentos**, com atualização ao vivo via Supabase Realtime
- Backend serverless: `api/whatsapp-cloud-webhook.ts` (recebe mensagens + status entregue/lida e baixa mídia como base64), `api/whatsapp-cloud-send.ts` (envia, exige sessão autenticada) e `api/whatsapp-cloud-config.ts` (status da conexão sem expor segredos)
- Banco: tabelas `SITE_WhatsAppCloudConversations` e `SITE_WhatsAppCloudMessages` (migração `create_whatsapp_cloud_tables.sql`) com RLS e publicação Realtime
- Painel admin: inbox com lista de conversas (busca + não-lidas), thread com bolhas/ticks de status e composer com anexos — em Operacional > "WhatsApp (Meta)" (atalho g+z)
- Credenciais (Phone Number ID, WABA, App ID/Secret, Access Token, API version, verify token, número) configuráveis pelo painel em **Configurações → Integrações → "WhatsApp (Meta)"**, salvas em `SITE_Config`; o servidor lê de lá (service role) com fallback para `.env`. Inclui exibição da Callback URL/verify token e botão "Testar Conexão"
- Token/app secret são lidos só no servidor (nunca no bundle do cliente). Aviso da janela de 24h da Meta no composer

## v3.7.0 (2026-06-18) - Módulo de Óleo de Suspensão (níveis e viscosidade)
- Novo módulo "Óleo & Suspensão": consulta de nível de óleo, viscosidade e modelo de suspensão (dianteira/traseira) por categoria (On Road, Off Road, Speed, Motocross) e moto
- Banco: tabela `SITE_SuspensionOil` (migração `create_suspension_oil_tables.sql`) com RLS que só expõe ao site dados validados (`is_validated`) e coluna `source` (fonte de cada valor)
- Painel admin DM: CRUD completo com filtros (categoria/marca/posição/status), badge de validação clicável e nota de segurança — em Vendas > "Óleo & Suspensão" (atalho g+v)
- Front-end: nova página pública `/oleo` com seletor por categoria → marca → modelo → posição, link "Óleo" no header
- Seed de rascunho pesquisado com fonte citada (`scripts/seed_suspension_oil.js`), inserido como não validado para revisão técnica da W-Tech antes de publicar

## v3.6.4 (2026-06-18) - Correção de autorização 401 no WhatsApp (Evolution API v2)
- Instâncias criadas via painel agora utilizam a Global API Key como token padrão (token: globalConfig.apiKey), resolvendo o erro 401 (Unauthorized) no envio de mensagens de teste e automações.

## v3.6.3 (2026-06-18) - Vídeo do YouTube Shorts no checkout
- Substituição do vídeo de apresentação local no checkout pelo Short do YouTube com reprodução automática e loop

## v3.6.2 (2026-06-18) - Vídeo, parcelamento 10x e reciclagem no checkout + filtro CRM, llms.txt e crédito no footer
- Checkout de curso (`CourseCheckout`, exibido quando a automação está ligada): vídeo de apresentação `curso-wtech.mp4` (vertical) no topo do resumo
- Parcelamento em até 10x no cartão: mensagem dinâmica na UI (card Valor Integral, total e badge) e `payment_methods.installments: 10` na preferência do Mercado Pago
- CTA de reciclagem no checkout: alunos que já fizeram o curso falam direto pelo WhatsApp (mensagem pré-preenchida com o nome do curso), com rastreio de evento
- CRM: filtro de leads por origem de tráfego (utm_source), agrupamento correto de LP V1–V4 pela região e captura de UTM em todos os pontos de criação de lead (`lib/tracking.ts`, `lib/leadDistribution.ts`); migração `add_lead_utm_tracking.sql` (aplicar no Supabase)
- Página `/molas` responsiva em laptops (min-height + listas com `clamp()`) e correção de classe Tailwind inválida no `SpringSelector`
- `public/llms.txt` seguindo a spec llmstxt.org para indexação por LLMs
- Crédito no rodapé do site: "Site desenvolvido por Daniel Marques · 2timeweb.com.br"

## v3.6.1 (2026-06-18) - Busca paginada de marcas no catálogo de molas
- Correção no seletor do admin: busca paginada de marcas (SITE_SpringRecommendations) contornando o limite de 1000 registros do Supabase
- Sincronização do histórico de atualizações no CHANGELOG.json

## v3.6.0 (2026-06-17) - Banco de Dados de Molas W-Tech (catálogo /molas) com seletor otimizado para mobile
- Nova página pública `/molas` — "Banco de Dados de Molas W-Tech": consulta informativa das molas calibradas (dianteira/traseira) por marca, modelo e peso do piloto
- Seletor de molas (`SpringSelector`) com fluxo em 4 passos: marca (fabricante) → modelo → tipo de suspensão (Dianteira/Garfo ou Traseira/Shock) → faixa de peso, retornando o código recomendado e a mola de fábrica (standard)
- Pesos indisponíveis para o tipo de suspensão selecionado ficam desabilitados e esmaecidos; troca automática de tipo quando o selecionado não existe para o modelo
- Otimização mobile do `/molas`: grade de marcas compacta (5 colunas), espaçamentos reduzidos e **barra de resultado fixa no rodapé** sempre visível durante a seleção (altura da página caiu de ~3,5x para ~2x a viewport)
- Dropdown de molas no header (`SpringHeaderDropdown`) e gestão do catálogo no Painel Administrativo (`components/admin/Springs`)
- Dados de referência: tabela `SITE_SpringRecommendations` no Supabase (`create_springs_tables.sql`) e scripts de seed/verificação (`scripts/seed_springs.js`, `scripts/verify_springs_data.js`)
- Logos das marcas adicionados em `public/images/brands/` (KTM, Kawasaki, Husaberg, Suzuki, Honda, Fantic, Husqvarna, Triumph, Yamaha, GASGAS)

## v3.5.2 (2026-06-15) - Ajustes de layout na LP Ergonomia v2 e vídeo internacional da Europa
- Remoção da seção Bento Grid ("Você se identifica?") e das seções individuais Rafa/Alex
- Depoimentos de alunos ("O Que Dizem Nossos Alunos") movidos para o topo, abaixo do Hero VSL
- Inclusão de 4 novos depoimentos em vídeo via YouTube Shorts na LP (total de 8)
- Criação de nova seção com vídeo de treinamento internacional da W-Tech na Europa (Abril 2026) tocando inline
- Destaque no preço à vista com desconto de R$ 267,00 e remoção do timer de contagem regressiva da oferta

## v3.5.1 (2026-06-15) - Depoimentos em vídeo, cronograma por módulo e novo fluxo de pré-inscrição
- Depoimentos das landing pages agora exibem somente vídeos do YouTube (Shorts incluídos), com 4 depoimentos padrão da W-Tech em todas as páginas de cursos presenciais
- Cronograma do curso reformulado: estruturado por módulo (título, objetivo, tópicos e resultado), editado no Editor de Landing Page, com modelo padrão e renderização visual em todos os 8 templates; o texto é espelhado para o curso (WhatsApp/lembretes)
- Pagamento automatizado: a LP deixa de mostrar preço no primeiro impacto — capta nome, e-mail e telefone e redireciona para a página de pré-inscrição, onde o lead escolhe entre o sinal de reserva (R$ 400) ou o valor integral antes do Mercado Pago
- Página de pré-inscrição com topo e rodapé explicativos: vagas restantes, vaga 100% garantida, reembolso garantido e estrutura oficial W-Tech
- Quiz de qualificação passa a redirecionar para a pré-inscrição quando o pagamento automatizado está ativo
- Requer migração no Supabase: `ALTER TABLE "SITE_LandingPages" ADD COLUMN IF NOT EXISTS schedule_modules jsonb;`

## v3.5.0 (2026-06-14) - Rastreamento de campanha no checkout e loader Stape com suporte a Safari/ITP
- Propagação completa das UTMs, fbclid e gclid das campanhas para o checkout da Kiwify, com persistência durante a navegação
- Envio dos cookies _fbp/_fbc (Meta) e _ga (Google Analytics) para o checkout, melhorando o match quality da CAPI
- Botão de checkout passa a abrir na mesma janela
- Atualização do Stape Custom Loader (GTM server-side) com stapeUserId para contornar o ITP do Safari e preservar a identificação entre sessões

## v3.4.0 (2026-06-13) - Integração de Campanhas, Cobrança Manual, Link de Saldo MP e Webhook
- Campanhas de e-mail e automação de marketing no painel administrativo
- Sistema de cobrança manual de saldo pendente por e-mail e WhatsApp
- Geração de link de saldo Mercado Pago direto com login automático
- Validação e otimização do webhook do Mercado Pago

## v3.3.0 (2026-06-12) - Cobrança automática de saldo pendente por e-mail e WhatsApp
- Inscrições confirmadas com saldo em aberto (pagou só a reserva) recebem lembretes automáticos em 3 estágios: 2 dias após a inscrição, 9 dias após, e a 7 dias do curso
- Cada estágio dispara e-mail (template "saldo_pendente" na identidade W-Tech) e mensagem de WhatsApp via Evolution API, com valores, curso e CTA para quitar
- Canais independentes e idempotentes: cada lembrete sai uma única vez por inscrição/canal (registrado em SITE_EmailLogs); cursos já realizados nunca são cobrados
- Processamento no cron diário existente (/api/process-email-flows) + rota manual /api/balance-reminders com prévia (?dryRun=1)
- Kill switch: SITE_Config.saldo_reminders_enabled='false' desativa tudo; Brevo/Evolution desconfigurados são pulados com segurança

## v3.2.0 (2026-06-12) - Automações de Marketing: boas-vindas, pós-compra e lançamento por cidade
- Lead novo no CRM entra automaticamente no fluxo "Boas-vindas — Novo Lead" (3 e-mails)
- Comprador entra automaticamente no fluxo "Pós-compra — Onboarding do Aluno" (preparação, portal, indicação)
- Lançamento de curso por cidade: botão "📣 Lançar p/ Base da Região" no editor da LP segmenta a base (cidade/estado, inclui perdidos) e cria cadência de 3 e-mails
- Novo endpoint /api/launch-course-campaign com prévia de público (dry run) e trava de 500 contatos
- MARKETING_PLANO.md: planejamento de marketing estruturado (funil, cadências, métricas, roadmap)

## v3.1.5 (2026-06-12) - Encaminhamento Dinamico de UTMs para Checkouts
- Implementada captura dinamica de parametros de consulta (search/hashQuery) nas LPs de Ergonomia
- Atualizados os botoes de checkout Kiwify para concatenar parametros UTM e sck automaticamente
- Modificado o getAttributionParams do Quiz para retornar todos os parametros de query sem filtros
- Modificada a navegacao das Landing Pages dinamicas presenciais para repassar UTMs para a pagina de checkout

## v3.1.4 (2026-06-12) - Rastreamento Nativo GTM em Botoes de Redirecionamento
- Conversao de botoes e motion.buttons de redirecionamento para tags a e motion.a nativas
- Adicionado atributo id de rastreamento exclusivo em todas as LPs para compatibilidade com o listener gtm.linkClick
- Modificadas as Landing Pages de Ergonomia (1, 2, 3, 4), Quiz de Suspensao, Waitlist de Suspensao e LPs dinamicas (V1 a V8)
- Modificados os links de localizacao e redes sociais das Imersoes de Lisboa (WTechLisboa e LPWTechLisboaNov2026)

## v3.1.3 (2026-06-12) - Novos Templates de Landing Pages (V5 a V8) e melhorias no Editor
- Novos layouts de Landing Pages: V5 (Gold Brutal), V6 (Carbon Racing), V7 (Editorial Light) e V8 (Swiss Tech)
- Suporte para depoimentos com vídeo (videoUrl) nos templates
- Ajuste no campo de preço de reserva (deposit_price) do banco nos viewers de LP
- Novas rotas de navegação /lp5, /lp6, /lp7 e /lp8 com lazy loading

## v3.1.2 (2026-06-12) - Follow-up automático de leads perdidos no CRM
- Novo gatilho "Perda no CRM" nos fluxos de e-mail
- Lead marcado como perdido entra automaticamente no fluxo de recuperação
- Fluxo "Recuperação de Perda — CRM" criado e ativo: 3 e-mails em 10 dias (imediato, +3d, +10d)
- Processador de fluxos não avança passos com o Brevo desligado (sequência preservada)

## v3.1.1 (2026-06-12) - Correções de SEO/compartilhamento e deploy do cron de e-mails
- Imagem de preview nas redes sociais corrigida (og:image apontava para arquivo 404 — agora usa a imagem configurada no admin)
- og:url, twitter:url e canonical alinhados para site.w-techbrasil.com.br
- Cron de fluxos de e-mail ajustado para diário (frequência maior derrubava o deploy no plano Hobby)
- Documentação de memória do sistema de pagamentos (PAGAMENTOS_MEMORIA.md) com playbook de diagnóstico

## v3.1.0 (2026-06-11) - Integração de e-mail (Brevo): confirmação de inscrição + follow-up
- Card "E-mail (Brevo SMTP)" em Integrações com botão de teste de envio
- E-mail automático de confirmação de inscrição ao aluno após pagamento aprovado
- Motor de follow-up (flows) com cron a cada 4h e auto-inscrição em compra recente
- Templates HTML com identidade W-Tech e logs de envio em SITE_EmailLogs
- Requer rodar migrations/brevo_email_integration.sql e configurar o Brevo no admin

## v3.0.19 (2026-06-11) - Webhook MP validado em produção — remove modo debug
- Confirmação automática de pagamento validada ponta a ponta (status, valor e payment_id gravados pelo webhook)
- Remove o modo de diagnóstico temporário do webhook

## v3.0.18 (2026-06-11) - Webhook MP confirma pagamento de verdade (schema corrigido)
- Remove updated_at do UPDATE de SITE_Enrollments (coluna não existe — fazia a confirmação falhar)
- SITE_Transactions: usa course_id/lead_id no lugar de enrollment_id inexistente
- SITE_Leads: não grava string em assigned_to (coluna UUID)
- Timeout de 10s no fetch do Mercado Pago e etapas secundárias limitadas — webhook nunca mais pendura

## v3.0.17 (2026-06-11) - Correção crítica do webhook do Mercado Pago
- Corrige imports ESM (.js) que derrubavam o webhook com 500 em produção
- Pagamentos voltam a confirmar a inscrição automaticamente
- Endpoint de recuperação de checkout restaurado

## v3.0.16 (2026-06-11) - Adiciona coluna updated_at e correções de banco de dados
- Fallback resiliente de webhook
- Adicionado coluna updated_at nas tabelas de inscricao
- Ajustes de sincronizacao de banco

## v3.0.15 (2026-06-11) - Correções de webhook e atendente automático
- Definir atendente padrao como Automatico no checkout
- Validação de webhook resiliente com fallback para API MP
- Redirecionamento preservando parametros de consulta
- Verificação direta client-side e liberacao de questionario

## v3.0.14 (2026-06-11) - Correção do redirecionamento do checkout
- FIX: Redirecionamento dinâmico para sandbox_init_point se token começar com TEST-

## v3.0.13 (2026-06-11) - Opção de Pré-Inscrição nas Landing Pages
- FEAT: Seleção de pré-inscrição de R$ 400 selecionável nas Landing Pages (V1, V2, V3 e V4)
- FEAT: Integração do checkout respeitando a opção selecionada pelo aluno na LP
- FIX: Ajustada validação do card de oferta para mostrar a pré-inscrição independentemente do preço total

## v3.0.12 (2026-06-11) - Fluxo de Inscrição e Pagamento Mercado Pago (Brasil)
- Opção de pagamento de Sinal/Reserva de Vaga configurável por curso no checkout
- Campos administrativos para 'Valor da Reserva (Sinal)' e 'Link do Grupo VIP de WhatsApp'
- Questionário complementar de matrícula exibido na tela de confirmação de inscrição
- Exibição do saldo devedor e link direto com login automático para a área do cliente
- Renomeada a aba 'WhatsApp API' sob Comunicação para 'Integrações'

## v3.0.11 (2026-06-08) - Integração de Search Console & Analytics
- Adicionada meta tag estática do Google Search Console ao index.html
- Nova aba dedicada nas configurações do Admin para Google Analytics e Search Console
- Passo a passo interativo e detalhado no painel para facilitar a configuração

## v3.0.10 (2026-06-08) - Quiz de Suspensão (/quiz-suspensao)
- Novo quiz interativo de conversão em /quiz-suspensao com funil ramificado Piloto x Mecânico
- Tela de análise com barra de progresso em tempo real antes do diagnóstico personalizado
- Tracking de funil no GA4 e repasse de UTM/fbclid para o checkout Kiwify
- Captura de lead via instância de suporte no WhatsApp + atribuição no CRM
- Fix: corrige tela branca no resultado quando o WebGL falha (ErrorBoundary + blindagem do shader, protege tambem a LP)

## v3.0.9 (2026-06-01) - Atalhos de Teclado, Portal de Afiliados e Recuperação de Vendas
- 🚀 [Novidades] Novo portal de recursos e rota pública para Afiliados (/afiliados)
- 🚀 [Novidades] Painel de Recuperação de Carrinho Kiwify com automação de Pix, teste A/B e estatísticas (ROI)
- ⚡ [Melhorias] Atalhos de teclado para navegação no painel admin, suporte a fontes customizadas em certificados e otimizações de dashboard

## v3.0.8 (2026-06-01) - Correção de Upload e Customização do Fundo de Certificados
- 🐛 [Correções de Bugs] Corrigido erro 'Invalid key' ao carregar imagens com acentos ou espaços no Supabase Storage
- 🚀 [Novidades / Funcionalidades] Painel interativo de propriedades do fundo com controles de ajuste (cover, contain, stretch e custom) e sliders de largura, altura e posições X/Y
- ⚡ [Melhorias] Motor de mapeamento geométrico exato em jsPDF para exportação de PDFs com fidelidade absoluta de renderização do fundo

## v3.1.0 (2026-05-24) - Seletor de Template de LP com Galeria Visual no Admin

- FEAT: Galeria de Templates no admin de LPs — tab "Galeria de Templates" com mockups visuais interativos de V1 e V2
- FEAT: Tabela comparativa completa de recursos entre V1 Classic e V2 Premium com 15 itens
- FEAT: Seletor de template visual no formulário de edição de LP — dois cards clicáveis com preview miniaturo em tempo real
- FEAT: Campo `template` salvo por LP no banco — cada LP escolhe seu próprio layout (V1 ou V2)
- FEAT: Cards de LP no admin redesenhados — thumbnail do mockup do template escolhido, badge de template, status badge colorido
- FEAT: Auto-redirect inteligente em `/lp/:slug` — se o template salvo for V2, redireciona automaticamente para `/lp2/:slug` (sem trocar o slug)
- FEAT: Botão de copiar URL em cada LP e nos links internos do sistema
- FEAT: Link secundário `↗` em cada card para pré-visualizar no template alternativo (V1 ou V2)
- FEAT: Badge "Novo ✨" nos cards e seletores do template V2
- FEAT: SQL de migração `add_lp_template_column.sql` — adiciona coluna `template text DEFAULT 'v1'` na tabela `SITE_LandingPages`
- CHORE: `status` e `template` adicionados à interface `LandingPage` em `types.ts`

## v3.0.9 (2026-05-24) - Landing Page Premium V2 com Efeitos Cinematográficos

- FEAT: `LandingPageViewerV2` — nova versão premium das Landing Pages de cursos presenciais com design dark gold W-Tech
- FEAT: Hero com efeito parallax via Framer Motion (`useScroll` + `useTransform`) — imagem de fundo com scroll suave e escala
- FEAT: Barra de progresso de scroll dourada fixada no topo da página
- FEAT: Countdown timer em tempo real com animação de flip por dígito — dias, horas, minutos, segundos
- FEAT: Contador animado de estatísticas (10+ anos, 3.000+ alunos, etc.) com `animate()` do Framer Motion ao entrar em viewport
- FEAT: Cards de benefícios com entrada em stagger (cada card com 80ms de delay), hover com elevação e glow dourado
- FEAT: Módulos do curso como timeline expansível com animação de accordion suave
- FEAT: Seção do instrutor com foto, bio, credenciais em grade e badge "Especialista Certificado"
- FEAT: Seção de depoimentos em grid com suporte ao campo `testimonials` do LP
- FEAT: Informações de data/local em cards com ícones e link direto para mapa
- FEAT: Seção de inscrição com card de preço sticky (inclui scarcity bar), formulário completo e estado de sucesso animado
- FEAT: FAQ accordion com 5 perguntas padrão (última adaptada ao campo `whatToBring` do curso)
- FEAT: Banner CTA final cinematográfico com glow e parallax no fundo
- FEAT: Botão flutuante fixo no mobile com CTA "Garantir Vaga"
- FEAT: Menu mobile animado com `AnimatePresence`
- FEAT: Navbar animada com entrada suave e links de scroll suave para todas as seções
- FEAT: Rota `/lp2/:slug` — acessa o mesmo slug da LP existente mas com o template V2
- FEAT: Botão "V2 ✨" no admin de Landing Pages para abrir o link premium diretamente
- CHORE: Rota `/lp/:slug` mantida intacta — V1 e V2 coexistem sem conflito

## v3.0.8 (2026-05-21) - Checklist Final de Cursos + Correções de Integração MP
- FEAT: Sistema de Checklist Final para cursos presenciais — template configurável no admin com 27 itens padrão em 7 categorias (Material do Aluno, Documentos, Alimentação, Marketing & Sinalização, Equipamentos, Ferramentas, Logística)
- FEAT: Checklist por curso com quantidades calculadas automaticamente: itens "por aluno" multiplicam pelo nº de inscritos confirmados
- FEAT: Impressão profissional — layout com barra de progresso, grupos por categoria, quantidades, status de cada item e bloco de assinatura para 2 responsáveis
- FEAT: Autosave automático (1,5s após qualquer mudança) — estado da conferência salvo por curso no banco
- FEAT: Seção "Cursos Presenciais" no admin Settings com editor completo do template de checklist
- FEAT: Botão de Checklist Final (ícone 📋) em cada card de curso na gestão de cursos
- FEAT: Painel de teste de integração Mercado Pago no admin — simula venda de R$ 1,00, abre checkout real e monitora retorno do webhook em tempo real (polling 3s / 2min)
- FIX: Tela InscricaoConfirmada não exibe mais "R$ 0,00" enquanto aguarda confirmação do webhook — exibe spinner "Confirmando com o banco..."
- CHORE: Removida Edge Function duplicada do Supabase (mercadopago-webhook) — apenas a Vercel serverless é utilizada

## v3.0.7 (2026-05-20) - Suíte de testes do Mercado Pago e melhorias no checkout
- Adicionado painel de teste de sandbox para Mercado Pago
- Melhoria visual de carregamento na tela de Inscricao Confirmada para pagamentos pendentes
- Ajuste de host e porta do servidor de desenvolvimento Vite
- Adicionado Playwright para automacao de testes

## v3.0.6 (2026-04-29) - Fix: Mapeamento de Link Personalizado no Calendário
- Corrigido mapeamento custom_link -> customLink no fetch de cursos.

## v3.0.5 (2026-04-29) - Redirecionamento Manual de Landing Pages
- Adicionado campo 'customLink' no Admin para redirecionamento manual.

## v3.0.4 (2026-04-29) - Correção de Slugs e Link no Editor de LP
- Corrigido prefixo da URL no Editor de LP para o domínio correto.
## v3.0.3 (2026-04-16) - Courses Module UI/UX Overhaul & Critical Fixes
- FIX: Resolvido erro fatal de 'tela branca' no módulo de Cursos causado pela função `cn()` não definida.
- UX: Redesign completo da Lista de Inscritos com novos cards de estatísticas (Moeda, Recebido, Previsto).
- UX: Modernização dos formulários de alunos e cursos com bordas arredondadas, gradientes premium e melhorias de responsividade.
- UI: Aplicação de design tokens consistentes (rounded-2xl, sombras dinâmicas) em todo o sub-módulo de Cursos.
- VERSION: Atualização para v3.0.3.

## v3.0.2 (2026-04-13) - Stripe Fixes & Currency Intelligence
- FIX: Resolvido erro de 'tela branca' ao gerar links de pagamento (Importação faltante lucide-react).
- FIX: Inteligência Multi-Moeda na quitação de saldos (Conversão automática BRL/EUR/USD).
- FIX: Padronização de moedas no Checkout Stripe para evitar erros de API.
- VERSION: Atualização para v3.0.2.

## v3.0.1 (2026-04-09) - Course Status & Waitlist Intelligence
- FEAT: Gestão de Status de Cursos (Lotado, Realizado/Concluído) no Admin.
- FEAT: Sistema de Lista de Espera integrado nas Landing Pages para cursos cheios.
- FEAT: Tag automática 'lista_espera_curso' para leads nessas condições.
- UX: Sincronização em tempo real de vagas (Live Count via SITE_Enrollments).
- UX: Gatilhos de Urgência visual ("Últimas Vagas") com animações de pulsação.
- UX: Calendário Anual sincronizado com cores por status de curso.
- VERSION: Atualização para v3.0.1.

## v3.0.0a (2026-04-07) - Alpha v3 Release
- FEAT: Início da transição para a versão 3.0.
- VERSION: Atualização para v3.0.0a.

## v2.9.8 (2026-04-07) - Stripe Integration & SEO Dynamic Optimization
- FEAT: Integração do Stripe no Módulo de Pedidos (Geração de links de pagamento, cópia e abertura direta).
- FEAT: Automação de status: pedidos agora atualizam para 'Pago' automaticamente via Webhook Stripe.
- FEAT: Sincronização de pagamentos no Editor de Pedidos (OrderEditor) e Novo Pedido (NewOrderModal).
- SEO: Otimização dinâmica de títulos SEO controlados via Painel Administrativo.
- VERSION: Atualização interna do sistema para v2.9.8.

## v2.9.7 (2026-03-31) - Gestão de Matrículas & Migrações de Dados
- FEAT: Novo campo 'enrolled_by' para rastreamento de quem realizou a matrícula.
- FEAT: Melhorias nos componentes administrativos de Marketing e campanhas Meta.
- FIX: Scripts de migração SQL para correção de permissões e colunas faltantes.
- UX: Refatoração do Dashboard para exibição consolidada de métricas de vendas.

## v2.9.6 (2026-03-11) - Módulo FlowUp & Inteligência de Leads
- FEAT: Novo módulo "FlowUp" para reengajamento inteligente de leads perdidos/esfriados.
- FEAT: Integração automática com o CRM: Leads 'Cold' e 'Rejected' entram no funil do FlowUp.
- FEAT: Dashboard analítico para monitoramento de KPIs e atividades de reaquecimento.
- FEAT: Segmentação dinâmica e réguas de relacionamento baseadas no contexto do lead.
- FIX: Implementada constraint UNIQUE em lead_id para garantir integridade dos dados no FlowUp.
- FIX: Resolução de conflitos de tipos TypeScript nos componentes de Automação e Marketing.
- UX: Interface dedicada com timeline de atividades e ações rápidas via WhatsApp.

## v2.9.4 (2026-02-10) - Atualização de Endereço - W-Tech Lisboa
- Atualização do endereço para Sintra Business Park - Edifício 01
- Inclusão de botão para localização via Google Maps

## v2.9.3 (2026-02-09) - Refinamento UX: Remoção de CPF
- FEAT: Removido campo "CPF" da Landing Page W-Tech Lisboa para reduzir fricção no cadastro inicial.
- UX: Ajuste de layout no formulário para melhor adaptação mobile.

## v2.9.2 (2026-02-09) - Refinamento de Formulários & Correções CRM
- FEAT: Removido campo de "Tamanho de Camiseta" das Landing Pages públicas para simplificar o cadastro.
- MAINT: Campo de Camiseta mantido exclusivamente em painéis internos (Admin/CRM) para controle operacional.
- FIX: Resolvido bug no CRM que impedia salvar Notas Internas e trocar Responsável devido a conflitos de nomenclatura de campos.
- FIX: Padronização completa de mapeamento de Leads entre Frontend e Banco de Dados.

## v2.9.1 (2026-02-09) - Gestão de Alunos (CPF & Camisetas)
- FEAT: Captura automática de CPF e Tamanho de Camiseta em todas as LPs de Lisboa.
- FEAT: Coluna "Camiseta" adicionada à Lista de Presença para impressão PDF.
- FEAT: Relatório Gerencial de Cursos agora inclui o tamanho da camiseta do aluno.
- FEAT: Sincronização de dados CPF/Camiseta na conversão de Lead para Aluno.
- DB: Nova migração SQL para campos `student_cpf` e `t_shirt_size` em SITE_Enrollments.

## v2.9.0 (2026-02-05) - Creative Hub Studio v3.0 & Stripe Live
- FEAT: Creative Hub Studio v3.0 com estúdio de criação avançado
- FEAT: Edição dinâmica de escalas, cores e textos por template
- FEAT: Sistema de persistência inteligente de design (LocalStorage)
- FEAT: Migração para ambiente de produção (Stripe Live Key)
- FIX: Resolução crítica de CORS na exportação de imagens (Tainted Canvas fix)
- FIX: Ajuste de responsividade no menu administrativo do Creative Hub

## v2.7.3 (2026-02-02) - Preçário Mecânico e Gestão Unificada
- FEAT: Novo nível de preço "Mecânico sem curso" no Catálogo e Pedidos.
- FEAT: Gestão Unificada de Clientes com Deduplicação automática na importação.
- FEAT: Novo recurso "Sincronizar & Limpar" para unificar duplicatas via telefone (merge de dados + tarefas).
- FEAT: Exclusão em Massa de contatos com limpeza automática de dependências (tasks/grupos).
- FEAT: Automação de WhatsApp e Categorias restauradas no Gerenciador de Tarefas.
- UX: Atalho rápido para tarefas (ícone relógio) diretamente nos cards do Kanban (CRM).
- FIX: Correção crítica no carregamento de datas e categorias no modal de tarefas.
- FIX: Resolução de erro "ON CONFLICT" em importações com dados redundantes no Excel.

## v2.7.2 (2026-02-01) - Correções de Scroll, PDF e Data de LP
- FIX: Reset automático de scroll ao navegar entre módulos do Admin.
- FEAT: Melhoria no PDF de Pedidos (Inclusão de número de pedido/ID e ajuste de layout).
- UPDATE: Atualização da data do evento LP Lisboa Fev 2026 para 02 de Abril de 2026.
- UPDATE: Correção das datas dos eventos W-Tech Lisboa (04-05/04/26) e ProRiders Lisboa (10-12/04/26).

## v2.7.1 (2026-01-30) - Gestão de Pedidos e Permissões Avançadas
- FEAT: Dedução automática de estoque ao marcar pedido como "Pago".
- PERM: Nova permissão "Editar Pedidos Pagos (Restrito)" para segurança de dados.
- FIX: Visualização global do Dashboard corrigida para Super Admins.
- FIX: Layout do Módulo de Pedidos ajustado (scroll infinito corrigido).
- FIX: Correção de tela branca na navegação entre módulos.

## v2.7.0 (2026-01-30) - Marketing Hub, Bio Page & UX Improvements
- FEAT: Novo Módulo "Campanhas" (Automação, Listas, Modelos)
- FEAT: Novo Módulo "Marketing" (Blog, LPs, Analytics, Certificados)
- FEAT: Criador de Página Bio (/bio) com fundos dinâmicos (Vídeo/YouTube, Presets, Cor)
- FEAT: Suporte a Vídeos do YouTube como background na Bio Page
- UX: Refatoração completa da navegação Sidebar do Admin
- UX: Ícones e layout aprimorados para melhor usabilidade mobile
- FIX: Menu Financeiro restaurado na barra lateral

## v2.6.4 (2026-01-30) - Google OAuth Fix & Admin UX Improvements
- FIX: Resolução de erro 404 no Google OAuth para HashRouter
- FEAT: Integração nativa do GA4 via Google OAuth no Dashboard
- UX: Refatoração da interface de Tarefas com Ações Rápidas
- SKILLS: Novas habilidades de Afiliados e Integração Google adicionadas
## v2.6.3 (2026-01-29) - Estabilidade na Navegação e Otimização do Editor
- FIX: Resolução do deadlock de navegação entre módulos (transição popLayout)
- FIX: Eliminação de loop infinito de re-renderização no Editor de Pedidos
- FEAT: Otimização de hooks de estado e dependências no SalesManager
- FEAT: Melhoria na performance global do Admin Portal v2.0
- CLEANUP: Remoção de instrumentação diagnóstica e logs de debug

## v2.6.2 (2026-01-29) - Gestão Logística & Itens Manuais
- Adição de Itens Manuais no PDV
- Cálculo automático de Seguro (1%)
- Campo de Desconto Manual no fechamento
- Resumo detalhado (Frete/Seguro/Desconto) no Portal do Cliente
- Melhorias de Responsividade Mobile no PDV
- Correção de travamento após salvamento de pedidos

## v2.5.0 (2026-01-26) - Analytics 2.0 & Controle de Permissões
- FEAT: Analytics 2.0 com tracking automático de eventos e conversões.
- FEAT: Dashboard de Analytics com gráficos em tempo real e log de atividades.
- FEAT: Sistema de Permissões Granulares (controle individual por módulo no Admin).
- FIX: Lógica de Upsert de Leads (evita duplicidade mantendo histórico).
- FIX: Redirecionamento correto do Quiz para o WhatsApp global.
- FIX: Scroll suave no botão de módulos das Landing Pages.

## v2.4.9 (2026-01-25) - Redesign Hero, SEO e Navegação
- DESIGN: Novo Hero Section com estilo "Racing" (botões inclinados, texturas metálicas e efeitos de brilho)
- SEO: Otimização completa da Home com Meta Descriptions focadas em mecânicos e pilotos
- UX: Atalho de navegação direta "Falar com Consultor" para o formulário de contato (#formulario)
- NAV: Link direto para W-Tech Store no botão secundário do Hero
- FIX: Correção de links quebrados na Home Page

## v2.4.7 (2026-01-22) - W-Intelligence: Filtros, Equipe e Receita Unificada
- FEAT: Sistema de filtros de data (7d, 30d, Mês, Geral) no Painel de Inteligência
- FEAT: Nova aba 'Equipe' com diagnóstico estratégico gerado por IA
- FEAT: Listagem completa de todos os atendentes dos sitema no W-Intelligence
- FIX: Unificação do cálculo de faturamento total baseado nos leads do CRM
- FIX: Melhoria no tratamento de erros para chaves Pde AI da OpenAI/Gemini

## v2.4.6 (2026-01-22) - W-Intelligence: Filtros, Equipe e Receita Unificada
- FEAT: Sistema de filtros de data (7d, 30d, Mês, Geral) no Painel de Inteligência
- FEAT: Nova aba 'Equipe' com diagnóstico estratégico gerado por IA
- FEAT: Listagem completa de todos os atendentes do sistema no W-Intelligence
- FIX: Unificação do cálculo de faturamento total baseado nos leads do CRM
- FIX: Melhoria no tratamento de erros para chaves de API da OpenAI/Gemini
- FIX: Correção de bugs de sintaxe e fechamento de funções estruturais

## v2.4.5 (2026-01-22) - Integração de Analytics e Gestão de Certificados
- FEAT: Injeção dinâmica de Google Analytics (GA4) e Facebook Pixel
- FEAT: Rastreamento automático de Pageviews via AnalyticsTracker
- FEAT: Novo módulo de Gestão de Certificados e Crachás
- FEAT: Suporte a layouts customizados de certificados por curso
- FIX: Tratamento de erros de injeção de scripts duplicados
- FIX: Melhorias de performance no Painel Administrativo

## v2.4.4 (2026-01-22) - Gestão Avançada de Certificados e QR Code
- FEAT: Editor de Certificados com suporte a campos inteligentes (Data+Local)
- FEAT: Public Page de Validação de Certificados via QR Code (/validar/:id)
- FEAT: Geração individual de Certificados e Crachás na lista de alunos
- FEAT: Formatação automática centralizada de textos no Certificado
- FEAT: Rodapé do site exibindo versão atual do sistema

## v2.4.3 (2026-01-21) - Correção de Datas, Calendário Multi-dia e Leads Masculinos
- FIX: Correção de datas com fuso horário em todo o site
- FEAT: Suporte para marcação de intervalos de dias em cursos multi-dia
- FIX: Nomes de alertas de inscrição fakes alterados para público masculino
- VERSION: Atualização para v2.4.3

## v2.4.2 (2026-01-20) - LPs Lisboa, Fix RLS e Super Admin
- FEAT: Atualizadas as datas das Landing Pages de Lisboa para Abril de 2026
- FEAT: Renomeado Painel do Desenvolvedor para Super Admin
- FIX: Novo script de correção RLS para o sistema de tarefas (SITE_Tasks v5)
## v2.4.1 (2026-01-19) - Hotfix de Tarefas e Marketing
- FIX: Conclusão de tarefas na visualização em lista corrigida
- FIX: Botão de check nos cards de tarefa sincronizado em todas as views
- DB: Script de desbloqueio de permissões SITE_Users (Marketing)

## v2.4.0 (2026-01-19) - Sistema de Notificações de Conversão (Prova Social)
- FEAT: Sistema de popups aleatórios de inscrição para Landing Pages
- FEAT: Toggle de controle (ON/OFF) integrado no Editor de Landing Pages
- FEAT: Componente FakeSignupAlert com 30 nomes e cidades brasileiras
- FEAT: Configuração dinâmica por curso e cronômetro inteligente (10-15s)
- DB: Nova coluna fake_alerts_enabled na tabela SITE_LandingPages

## v2.3.3 (2026-01-17) - Fix Partners Display
- Fixed partner brands parsing logic in Hero section

## v2.3.2 (2026-01-17) - Release v2.3.2
- General system updates
- Release automation

## v2.3.1 (2026-01-17) - Correções e Documentação Técnica
- FIX: Script SQL para correção de permissões em listas de marketing
- FEAT: Documentação técnica completa do sistema de automação WhatsApp
- FIX: Ajustes de permissões RLS no banco de dados

## v2.3.0 (2026-01-17) - Módulo de Analytics e Integração GA4
- FEAT: Novo módulo de Analytics Interno (PageViews, Visitantes Únicos, Eventos)
- FEAT: Integração automática com Google Analytics 4 (GA4) via Configurações
- FEAT: Integração automática com Facebook Pixel (Meta) via Configurações
- FEAT: Dashboard de Analytics com gráficos de visitas diárias e fontes de tráfego
- FEAT: Configurações Globais de Tracking centralizadas no Admin

## v2.2.7 (2026-01-16) - UI Polishing & CRM Cleanup
- FIX: Removido widget de Taxa de Conversão flutuante no CRM
- FIX: Correções de Dark Mode no painel administrativo
- FIX: Melhorias na deleção de leads (Cascade & Permissions)
- FEAT: Novas melhorias no Task Manager UI

## v2.2.6 (2026-01-16) - Melhorias no Gerenciador de Tarefas e Dark Mode
- FEAT: Cards de tarefas redesenhados - sempre escuros com textos claros
- FEAT: Tags de categoria visíveis em cada card de tarefa
- FEAT: Indicador de automação WhatsApp (ícone de robô pulsante)
- FEAT: Cards totalmente clicáveis para abrir detalhes
- FEAT: Ícone de conclusão rápida no header do card
- FEAT: Removidos botões inferiores para design mais limpo
- FIX: Modal de edição de tarefas totalmente adaptado para dark mode
- FIX: Gestão de Cursos com suporte completo a dark mode
- FIX: Gestão de Clientes com suporte completo a dark mode
- FEAT: Toggle de tema integrado no sidebar do Admin

## v2.2.5 (2026-01-16) - Adiciona Customização de Menu
- Adicionado coluna menu_styles na tabela SITE_Config
- DONEy
- y
- y

## v2.2.4 (2026-01-15) - Fix WhatsApp Duplicates, Variables, Lead Deletion and UI Improvements
- - Corrigido duplicidade no envio de WhatsApp (Reserva Atômica)
- - Suporte a variáveis {{nome}}, {{telefone}}, {{email}}, {{status}} e {{origem}}
- - Implementado envio sequencial (Texto -> Imagem t-> Texo)
- - Corrigido erro de exclusão de Leads no CRM (RLS e Cascata)
- - Nova interface de Campanhas com Filtros, Busca e Barra de Progresso Real-time
- - Corrigido erro de data inválida na listagem de hcampanas
- - Adicionado vídeo padrão no Editor de Landing Pages

## v2.2.3 (2026-01-15) - Tab System in Clients & Marketing Permissions
- Added Sub-Tabs to Clients Manager (Clients/Groups)
- Integrated ListsManager into Clients View
- Improved DB instructions for marketing permissions

## v2.2.2 (2026-01-15) - Deploy Script Improvement
- Improved deploy script to enforce git operations
- Updated SYSTEM_MAP to reflect mandatory routine

## v2.2.0 (2026-01-15) - Módulos Marketing e Clientes
- FEAT: Paginação na listagem de clientes (50/100/300 itens).
- FEAT: Grupos de Marketing agora podem ter dono específico (owner_id).

## v2.1.0 (2026-01-15) - Correções Críticas e Otimização do Dash
- FIX: Corrigido bug no upload de imagens (Erro de RLS/Bucket inexistente).
- FIX: KPIs do Dashboard agora priorizam vendas CRM vs Matrículas.
- FIX: Ranking de Atendentes corrigido para usar 'assigned_to'.
- FEAT: Adicionada documentação SYSTEM_MAP.md.
- FEAT: Removido widget de debug visual do CRM.

## v2.0.5 (2026-01-14) - Integração Horos e Ajustes de CRM
- FEAT: Integração com visualizador DICOM (Horos).
- FIX: Ajustes na renderização do CRM e permissões de usuários.

## v2.0.0 (2026-01-01) - Lançamento da Versão 2.0
- Reescrita completa do frontend em React/Vite.
- Novo Dashboard Administrativo.
- Integração completa com Supabase.
