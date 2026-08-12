# W-Tech Graph Studio — Prompt de Arquitetura

> Prompt de especificação para construir o **Graph Studio**: ambiente visual de orquestração
> agêntica integrado ao admin da W-Tech Brasil (CRM → FlowUp → Cursos → Alunos).
>
> Versão adaptada do prompt genérico "Graph Studio" para o modelo de negócio real,
> ancorada nas tabelas, agentes e integrações que já existem em produção (v3.32.3).

---

## PROMPT

Você é um arquiteto de software especialista em orquestração agêntica e Graph Engineering.

Crie o **W-Tech Graph Studio**, um ambiente visual de criação, execução e depuração de grafos
de agentes, integrado como novo módulo do sistema de gestão da W-Tech Brasil
(`view: 'graph_studio'`, `permission: 'graph_studio_view'`, atalho `g + n`).

O Studio não é uma ferramenta genérica de automação. Ele é o **sistema nervoso do funil da
W-Tech**: o lugar onde as regras que hoje estão espalhadas em `api/_aiReply.ts`,
`api/_flows.ts`, `api/_balance.ts`, `api/_campaigns.ts`, `lib/leadDistribution.ts`,
`lib/suspensionFunnel.ts` e `components/admin/Marketing/FlowUpView.tsx` passam a ser
**declaradas como grafo, executadas com rastro e depuradas visualmente**.

---

## 1. CONTEXTO DE NEGÓCIO (obrigatório — todo nó deve falar esta língua)

A W-Tech Brasil vende **cursos técnicos presenciais e online de suspensão de motos**
(Brasil, Portugal/Lisboa e Europa), além de **peças, molas, óleo e ferramentas**, e mantém uma
**rede credenciada de oficinas**. O funil completo, ponta a ponta:

```
Tráfego (Meta Ads / Google / orgânico / evento)
   ↓  UTMs + _fbp/_fbc/_ga persistidos (LEI 10 — lib/tracking.ts)
Captura (Landing Page / Quiz de Suspensão / Formulário / WhatsApp / Evento presencial)
   ↓
SITE_Leads  ──────────────────────────────────────────── CRM Kanban
   status: New → Contacted → Negotiating → Qualified
              ├─→ Converted / Matriculated / CheckedIn   (ganho)
              └─→ Cold / Rejected / Lost                 (perda, com lost_reason)
   ↓ ganho                                    ↓ perda
SITE_Enrollments (matrícula)          SITE_FlowUpLeads (retrabalho)
   status: Pending → Confirmed → CheckedIn      phase: accommodation (D0)
   amount_paid  vs  total_amount                     → nurturing (D+7..D+30)
   → saldo a receber                                 → reactivation (evento-driven)
   ↓                                                 → reactivated | archived
Curso realizado
   ├─ Checklist de turma (SITE_CourseChecklists)
   ├─ Certificado + crachá (SITE_CertificateLayouts)
   └─ is_credentialed → entra na Rede Credenciada (SITE_Mechanics / mapa público)
   ↓
Pós-venda: recompra de peças, reciclagem (recycling_price), indicação, novo curso
```

**Entidades de domínio que os nós manipulam** (nomes exatos das tabelas Supabase):

| Domínio | Tabelas |
|---|---|
| CRM | `SITE_Leads`, `SITE_LeadHistory`, `SITE_Tasks`, `SITE_TaskCategories` |
| FlowUp | `SITE_FlowUpLeads`, `SITE_FlowUpActivities`, `SITE_FlowUpSegments` |
| Cursos & Alunos | `SITE_Courses`, `SITE_Enrollments`, `SITE_CourseChecklists`, `SITE_ChecklistTemplate`, `SITE_CertificateLayouts` |
| Financeiro | `SITE_Transactions`, `SITE_Sales`, `SITE_SaleItems`, `SITE_Orders`, `SITE_PaymentMethods`, `SITE_Pix_Recovery_Stats` |
| Catálogo / Estoque (ERP interno) | `SITE_Products`, `SITE_ProductBOM`, `SITE_StockMovements`, `SITE_SpringRecommendations`, `SITE_SuspensionOil` |
| WhatsApp (Meta Cloud) | `SITE_WhatsAppCloudConversations`, `SITE_WhatsAppCloudMessages`, `SITE_WhatsAppAIConfig`, `SITE_WhatsAppAIKnowledge`, `SITE_WhatsAppAIMemory`, `SITE_WhatsAppAIRules` |
| WhatsApp (Evolution / atendentes) | `SITE_WaAtendentes`, `SITE_WaAtendenteMensagens`, `SITE_WaAtendenteAnalises`, `SITE_WaAtendenteEvolucao` |
| Marketing | `SITE_EmailFlows`, `SITE_FlowSteps`, `SITE_FlowEnrollments`, `SITE_EmailCampaigns`, `SITE_MarketingLists`, `SITE_MarketingListMembers`, `SITE_CampaignQueue`, `SITE_CaptureCampaigns`, `SITE_LandingPages` |
| Conteúdo & Conhecimento | `SITE_GlossaryTerms`, `SITE_ContentInbox`, `SITE_ContentPosts`, `SITE_ContentRadar`, `SITE_BlogPosts` |
| Aprovações (POP) | `SITE_ApprovalItems`, `SITE_ApprovalEvents`, `SITE_CampaignRequests` |
| Rede & Pessoas | `SITE_Mechanics`, `SITE_Users`, `SITE_Roles`, `SITE_AuditLogs`, `SITE_Config` |

**Agentes de IA que já existem e devem ser cidadãos de primeira classe no grafo**
(`lib/aiAgentDefaults.ts`, `api/_aiSectorData.ts`):

- **Léo** 🎓 — Inscrições: `SITE_Courses`, `SITE_Enrollments` (vagas, turmas, matrículas)
- **Bia** 💬 — Atendimento/CRM: `SITE_WhatsAppCloudMessages`, `SITE_Tasks`, `SITE_Leads`
- **Rita** 💰 — Financeiro: `SITE_Transactions`, `SITE_Enrollments` (saldos, devedores)
- **Sofia** 👔 — RH/Gerência: `SITE_Users`, `SITE_AuditLogs` + visão consolidada
- **Supervisor** (novo) — roteia por setor, resolve conflitos entre agentes, decide handoff
  humano. Reaproveita `detectSectors()` de `api/_aiSectorData.ts` como classificador inicial.

---

## 2. REQUISITOS FUNCIONAIS

### 2.1 Editor visual de nós e conexões

Canvas estilo n8n / LangGraph Studio: arrastar nós, conectar portas tipadas, agrupar em
sub-grafos, minimapa, snap-to-grid, seleção múltipla, copiar/colar entre grafos.

- **Portas tipadas** — a conexão só é aceita se os tipos casarem. Tipos do domínio:
  `Lead`, `FlowUpLead`, `Enrollment`, `Course`, `Transaction`, `WaMessage`, `Segment`,
  `ApprovalItem`, `KnowledgeChunk`, `AgentAnswer`, `Any`.
  Os tipos vêm de `types.ts` — não invente um schema paralelo.
- **Validação em tempo real** — ciclo sem condição de parada, nó órfão, porta obrigatória
  sem ligação, credencial ausente, permissão que o cargo do autor não possui: tudo marcado
  no canvas antes de salvar.
- **Sub-grafos reutilizáveis** — "Cobrança de saldo", "Confirmação de matrícula",
  "Reengajamento FlowUp" viram blocos que outros grafos importam por referência versionada.

### 2.2 Catálogo de nós (específico do domínio — não genérico)

**Gatilhos (entrada)**
- `LeadCriado` — novo `SITE_Leads` (filtro por `type`, `utm_source`, `contextId`)
- `LeadMudouDeEtapa` — transição de `status` no Kanban (ex.: `Negotiating → Lost`)
- `LeadPerdido` — dispara com `lost_reason` (price/date/location/not_now/comparing/no_response/other)
- `MatriculaCriada` / `PagamentoRecebido` — webhook Stripe / Asaas / Mercado Pago / Kiwify
- `SaldoEmAberto` — `total_amount − amount_paid > 0` há N dias (hoje: `api/_balance.ts`)
- `MensagemWhatsAppRecebida` — Cloud API (Meta) ou Evolution
- `CursoProximo` — D-5 / D-1 do `SITE_Courses.date` (hoje: flags `reminder5d/1d`)
- `CheckInRealizado` — presença confirmada na turma
- `Agendado` — cron (compatível com `api/jobs.ts?task=…`)
- `Manual` — operador dispara pelo CRM com um lead selecionado

**Ações de negócio**
- `MoverLeadKanban`, `AtribuirVendedor` (usa `lib/leadDistribution.ts`), `CriarTarefa`,
  `RegistrarHistorico` (`SITE_LeadHistory`)
- `EntrarNoFlowUp` / `MudarFaseFlowUp` / `ReativarLead` / `ArquivarFlowUp`
- `CriarMatricula`, `AtualizarStatusMatricula`, `EmitirCertificado`, `GerarCracha`,
  `MarcarCredenciado` (entra na Rede Credenciada)
- `RegistrarTransacao`, `GerarLinkPagamento` (Stripe/Asaas/MP), `CobrarSaldo`
- `InscreverEmFluxoEmail` (`NovoCadastro | CompraRecente | Inatividade | Perda | Tag | Segmento`)
- `EnfileirarCampanha` (`SITE_CampaignQueue`), `AdicionarEmLista`

**Comunicação**
- `EnviarWhatsAppCloud` — API oficial Meta, com template aprovado
- `RascunhoWhatsApp` — grava a resposta **sem enviar**; atendente aprova no inbox
- `EnviarEmail` (Brevo/SMTP, `lib/emailTemplates.ts`)
- `NotificarEquipe` — grupo de WhatsApp / notificação interna (`SITE_Notifications`)

> **Regra imutável do canal Evolution:** as instâncias `w-tech-atendente-1..5` são **espelho
> passivo**. Nenhum nó pode enviar mensagem por elas. Elas só alimentam
> `SITE_WaAtendenteMensagens` para análise de qualidade. Um nó que tente enviar por Evolution
> deve falhar na **validação do editor**, não em runtime.

**Agentes & IA**
- `Agente` — invoca Léo/Bia/Rita/Sofia ou um agente customizado (prompt versionado no grafo)
- `Supervisor` — recebe a pergunta/evento, decide qual agente responde, pode fan-out e
  consolidar; herda os `AGENT_GUARDRAILS` de `lib/aiAgentDefaults.ts`
- `ClassificarIntencao` — `course | sales | parts | support | general` (paridade com `_aiReply.ts`)
- `BuscarConhecimento` (RAG) — embeddings sobre `SITE_WhatsAppAIKnowledge` + `SITE_GlossaryTerms`
- `AnalisarQualidadeAtendimento` — nota do atendente a partir de `SITE_WaAtendenteMensagens`

**Controle de fluxo**
- `Condicao` (if/else), `Switch`, `Aguardar` (tempo absoluto/relativo, respeitando
  `lib/businessTime.ts` — nada de cobrança às 3h da manhã), `Loop`, `Paralelo`, `Juntar`,
  `TentarNovamente` (backoff), `Erro` (rota de falha explícita)

**Humano no circuito**
- `AprovacaoHumana` — trava a execução, cria `SITE_ApprovalItems`, notifica no WhatsApp,
  respeita SLA do gestor (`pop_sla_gestor.sql`), retoma no callback com decisão + justificativa
- `RevisaoDeConteudo` — revisão editorial antes de publicar/indexar

**Deep Research (ver §2.7)**
- `DeepResearch`, `RevisaoHumanaPesquisa`, `PublicarNaBaseDeConhecimento`

### 2.3 Execução ao vivo

Ao rodar (real ou simulado), o grafo **ilumina o caminho percorrido**:

- Aresta ativa animada; nó em execução pulsa; concluído fica verde; erro vermelho;
  pulado cinza; aguardando aprovação âmbar com contador de SLA.
- **Painel lateral por nó**: entrada recebida (JSON), saída produzida, prompt e resposta
  crua do LLM, query SQL executada, payload HTTP enviado/recebido, duração (ms),
  tokens in/out e **custo estimado em BRL** (Gemini via `@google/genai` e OpenAI —
  tabela de preço editável em `SITE_Config`).
- **Estado atual** da execução: variáveis do escopo, contexto acumulado, lead/aluno alvo.
- **Histórico**: timeline de todas as execuções, filtrável por grafo, versão, status,
  lead, curso, atendente, período.
- Streaming ao vivo por SSE — sem polling.

### 2.4 Debugger

- **Breakpoints** por nó (e condicionais: "pare quando `lead.lost_reason === 'price'`").
- **Step into** (entra no sub-grafo), **step over**, **continue**.
- **Replay** — reexecuta uma execução passada com exatamente o mesmo input gravado.
- **Reexecução a partir de qualquer nó**, com opção de editar o estado antes de retomar.
- **Modo simulação (dry-run)** — obrigatório como padrão: todo efeito colateral externo
  (WhatsApp, e-mail, cobrança, escrita no banco) é interceptado e apenas registrado.
  Só sai de dry-run com confirmação explícita e permissão `graph_studio_execute`.
- **Time-travel** — inspecionar o estado do grafo em qualquer ponto da timeline.

### 2.5 Multi-agente com supervisor

- Grafos podem conter vários nós `Agente` executando em paralelo, coordenados por um
  `Supervisor` que roteia por setor, resolve respostas conflitantes e decide escalonamento.
- **Memória compartilhada** entre agentes da mesma execução (curto prazo) e memória
  persistente por contato (`SITE_WhatsAppAIMemory`).
- **Handoff humano** com as mesmas três regras que já valem em produção: palavra-chave,
  regra de escalonamento (`SITE_WhatsAppAIRules`) e teto de mensagens por conversa.
- **Política híbrida herdada de `api/_aiReply.ts`, agora explícita no grafo:**
  `support` / `general` → autopilot; `sales` / `billing` → rascunho para aprovação humana.
  Essa política deixa de ser `if` no código e vira aresta visível e auditável.

### 2.6 Integrações via MCP

Cada integração é um **servidor MCP** com credenciais em cofre (nunca no JSON do grafo),
escopo mínimo e log de toda chamada:

| MCP | Cobre |
|---|---|
| `mcp-supabase` | Leitura/escrita nas tabelas `SITE_*`, **respeitando RLS e o cargo do executor** |
| `mcp-whatsapp-cloud` | Meta Graph API: envio, templates, status de entrega |
| `mcp-evolution` | **Somente leitura** — status de instância, espelho de mensagens |
| `mcp-pagamentos` | Stripe, Asaas, Mercado Pago, Kiwify: links, cobranças, webhooks, conciliação |
| `mcp-erp` | Catálogo, estoque, BOM, pedidos, notas fiscais, financeiro |
| `mcp-email` | Brevo/SMTP: envio transacional e campanhas |
| `mcp-analytics` | GA4, Meta Ads, Instagram Metrics, `SITE_Analytics_Events` |
| `mcp-conhecimento` | Glossário, base de conhecimento da IA, radar de conteúdo |

Regra dura: **nenhum nó fala com serviço externo direto**. Tudo passa por MCP, para que
permissão, rate limit, retry, custo e auditoria fiquem em um só lugar.

### 2.7 Módulo de Grafo de Conhecimento

Um grafo de **entidades do negócio** (distinto do grafo de execução):

- **Nós**: Pessoa (lead/aluno/mecânico — unificados por telefone/e-mail/CPF), Curso, Turma,
  Cidade/Região, Oficina, Produto, Instrutor, Campanha, Termo do glossário.
- **Arestas**: `interessou_em`, `matriculou_em`, `perdeu_por`, `credenciado_em`,
  `comprou`, `indicou`, `atendido_por`, `veio_de_campanha`.
- **Resolução de identidade** — o mesmo telefone hoje aparece como `SITE_Leads` +
  `SITE_Enrollments` + `SITE_Mechanics` + `SITE_Orders` sem ligação formal. O grafo resolve
  isso e passa a responder: *"quantos alunos de Lisboa 2026 já eram credenciados?"*,
  *"quais leads perdidos por data moram a menos de 100 km da próxima turma?"*.
- Alimenta diretamente os segmentos do FlowUp (`SITE_FlowUpSegments.rules`) e a
  recomendação de próxima turma.
- Consultável por nó (`ConsultarGrafoConhecimento`) e pelos agentes via MCP.

### 2.8 Deep Research com revisão humana obrigatória

Nós dedicados de pesquisa profunda (novos modelos de moto, curvas de mola, óleos e
viscosidades, normas técnicas, concorrência, conteúdo para blog/glossário):

```
DeepResearch → RevisaoHumanaPesquisa → PublicarNaBaseDeConhecimento
   (rascunho)      (aprovar/editar/           (indexa em SITE_GlossaryTerms /
                    rejeitar, com fonte)       SITE_WhatsAppAIKnowledge / SITE_ContentInbox)
```

**Restrição de segurança inviolável:** a saída de um nó `DeepResearch` **nunca** pode
alcançar um nó de comunicação com o cliente final (`EnviarWhatsAppCloud`, `EnviarEmail`,
`RascunhoWhatsApp`, resposta de agente ao lead/aluno) sem passar por
`RevisaoHumanaPesquisa` aprovada. O validador do editor precisa provar isso por
**análise estática de alcançabilidade no grafo** e bloquear a publicação da versão — não
basta avisar em runtime. Todo item publicado guarda fonte, data, revisor e versão.

### 2.9 Observabilidade, versionamento e comparação

- **Métricas por grafo/versão/nó**: execuções, taxa de sucesso, p50/p95 de latência,
  custo total em BRL, tokens, taxa de handoff humano.
- **Métricas de negócio ligadas ao grafo** — é isso que justifica o módulo:
  leads reativados pelo FlowUp, matrículas geradas, saldo recuperado (R$),
  taxa de resposta no WhatsApp, no-show em turma, tempo médio até primeiro contato.
- **Versionamento** — todo grafo é imutável ao publicar; `draft → published → archived`.
  Rollback em um clique.
- **Diff visual entre versões** — nós adicionados/removidos/alterados, mudança de prompt
  destacada linha a linha.
- **Comparação A/B em produção** — dividir tráfego entre v3 e v4 do mesmo grafo e comparar
  conversão real. Ex.: duas abordagens de reengajamento para `lost_reason = 'price'`.
- Toda execução escreve em `SITE_AuditLogs` (quem publicou, quem executou fora de dry-run,
  quem aprovou o quê).

### 2.10 Copiloto de IA

- **Gerar grafo a partir de linguagem natural**, no vocabulário da casa:
  *"Quando um lead for perdido por preço, espera 7 dias, manda um WhatsApp com depoimento
  de aluno, e se ele responder devolve pro CRM como Negotiating atribuído ao vendedor original."*
  → grafo válido, tipado, em draft, com dry-run já executado sobre 10 leads reais.
- **Refatorar** — extrair sub-grafo, deduplicar ramos, sugerir paralelização, apontar
  caminho sem tratamento de erro.
- **Explicar** — narrar em português o que o grafo faz, para o gestor aprovar sem ler JSON.
- **Diagnosticar** — a partir de uma execução falha, apontar o nó culpado e propor a correção
  como diff aplicável.
- O copiloto **sempre entrega em draft**. Nunca publica nem executa fora de dry-run sozinho.

---

## 3. ARQUITETURA EXIGIDA

Modular, escalável, **orientada a eventos**, com separação dura entre as camadas:

```
┌──────────────────────────────────────────────────────────────────┐
│ DESIGNER (browser)                                               │
│ Canvas, catálogo de nós, validador, diff de versões, copiloto    │
│ React 19 + TS + Tailwind — módulo do admin, não app separado     │
└───────────────┬──────────────────────────────────────────────────┘
                │ GraphSpec (JSON versionado, schema validado)
┌───────────────▼──────────────────────────────────────────────────┐
│ CONTROL PLANE                                                    │
│ CRUD de grafos, versões, publicação, permissões, cofre de segredos│
└───────────────┬──────────────────────────────────────────────────┘
                │ publica evento
┌───────────────▼──────────────────────────────────────────────────┐
│ EVENT BUS  (outbox transacional no Postgres + LISTEN/NOTIFY)     │
│ Fonte única de gatilhos: webhooks, cron, mudanças de tabela, CRM │
└───────────────┬──────────────────────────────────────────────────┘
┌───────────────▼──────────────────────────────────────────────────┐
│ RUNTIME (worker)                                                 │
│ Máquina de estados durável, checkpoint por nó, retry com backoff,│
│ idempotência por chave de evento, sagas com compensação          │
└──────┬──────────────────────┬──────────────────────┬─────────────┘
       │                      │                      │
┌──────▼────────┐   ┌─────────▼─────────┐   ┌────────▼───────────┐
│ CAMADA AGENTES│   │ CAMADA INTEGRAÇÕES│   │ DEBUGGER / TRACING │
│ Supervisor,   │   │ Clientes MCP,     │   │ Breakpoints, step, │
│ Léo/Bia/Rita/ │   │ cofre, rate limit,│   │ replay, SSE ao vivo│
│ Sofia, RAG,   │   │ retry, quota      │   │ (nunca em processo │
│ memória       │   │                   │   │  com o runtime)    │
└───────────────┘   └───────────────────┘   └────────────────────┘
                            │
                  ┌─────────▼──────────┐
                  │ GRAFO DE CONHECIMENTO│
                  │ Entidades + arestas  │
                  └──────────────────────┘
```

**Invariantes de arquitetura:**

1. **Durabilidade** — o estado da execução vive no Postgres, não em memória. Restart de
   worker, deploy ou queda do container não perde execução em andamento (relevante: o
   sistema roda em Docker Swarm no VPS e já sofreu com deploy que derrubou estado).
2. **Idempotência** — todo efeito externo carrega chave de idempotência derivada de
   `(execução, nó, tentativa)`. Webhook de pagamento duplicado não gera cobrança dupla.
3. **Runtime ≠ Debugger** — o debugger observa por eventos; um breakpoint nunca pode
   travar a fila de produção de outra execução.
4. **Grafo é dado, não código** — `GraphSpec` é JSON versionado com schema. Nenhum nó
   executa código arbitrário do usuário; nós customizados são funções registradas no catálogo,
   revisadas em code review.
5. **Compatível com o que já existe** — os crons atuais (`api/jobs.ts`), os webhooks de
   pagamento e o webhook do WhatsApp continuam funcionando. Eles passam a **publicar eventos
   no bus** em vez de executar a regra inline. Migração incremental, um fluxo por vez.

---

## 4. GRAFOS DE REFERÊNCIA (entregar funcionando no dia 1)

1. **Resgate FlowUp por motivo de perda** — `LeadPerdido` → ramifica por `lost_reason` →
   acomodação (D0) → nutrição (D+7..D+30) → reativação quando abrir turma na região do lead
   (cruza `region_city/state` × `SITE_Courses.city`) → devolve ao CRM como `Negotiating`.
2. **Cobrança de saldo de matrícula** — `SaldoEmAberto` → Rita calcula o devido →
   `AprovacaoHumana` se > R$ X → link de pagamento → lembrete escalonado em horário
   comercial → baixa automática no webhook → registra em `SITE_Transactions`.
3. **Atendimento WhatsApp híbrido** — `MensagemWhatsAppRecebida` → `ClassificarIntencao` →
   RAG no conhecimento → `support/general` responde sozinho; `sales/billing` gera rascunho
   para o atendente → handoff por palavra-chave/regra/teto.
4. **Jornada da turma** — `MatriculaCriada` → boas-vindas → checklist → lembrete D-5 e D-1 →
   check-in → certificado + crachá → pesquisa de satisfação → oferta de reciclagem/credenciamento.
5. **Pesquisa → Glossário** — `DeepResearch` sobre um modelo/óleo novo → revisão humana →
   publica em `SITE_GlossaryTerms` + indexa na base da IA → vira insumo de conteúdo.
6. **Qualidade de atendimento** — cron diário → analisa `SITE_WaAtendenteMensagens` por
   atendente → grava `SITE_WaAtendenteAnalises` / `SITE_WaAtendenteEvolucao` → relatório
   comparativo no grupo da equipe.

---

## 5. RESTRIÇÕES TÉCNICAS

- **Stack obrigatória** — React 19 + Vite + TypeScript + Tailwind v4 no front; Supabase
  (PostgreSQL + Auth + Storage) como banco; servidor Express (`server/`) + funções em `api/`;
  deploy Docker Swarm no VPS via `npm run release`.
- **Reuso, não reescrita** — tipos de `types.ts`; permissões de `lib/permissions.ts`;
  agentes e guardrails de `lib/aiAgentDefaults.ts`; horário comercial de `lib/businessTime.ts`;
  distribuição de leads de `lib/leadDistribution.ts`; WhatsApp Cloud de `api/_whatsappCloud.ts`.
- **Arquivos < 800 linhas**, organizados por feature
  (`components/admin/GraphStudio/{Canvas,Nodes,Inspector,Debugger,Versions}/…`,
  `lib/graph/*`, `server/graph/*`, `api/_graphRuntime.ts`).
- **Sem mutação** — `GraphSpec` e estado de execução sempre por cópia nova.
- **Performance** — canvas fluido com 200+ nós: virtualização, `transform`/`opacity` apenas,
  sem re-render global a cada tick de execução.
- **Migrações SQL** no padrão do projeto (`create_graph_studio_tables.sql`), com RLS ligado
  e política por cargo desde a primeira versão.

---

## 6. SEGURANÇA E CONFORMIDADE

- **Permissões granulares** integradas ao `PERMISSION_CATALOG`:
  `graph_studio_view` (ver), `graph_studio_edit` (editar draft),
  `graph_studio_publish` (publicar versão), `graph_studio_execute` (rodar fora de dry-run),
  `graph_studio_secrets` (gerenciar credenciais MCP).
- **RLS** — o runtime executa com a identidade de um usuário de serviço com escopo mínimo;
  execução manual herda o cargo de quem disparou. Um vendedor não move leads que não são dele
  por meio de um grafo.
- **LGPD** — dados de aluno/lead trafegam por referência (id), não copiados para o JSON do
  grafo. Logs de execução mascaram CPF, telefone e e-mail por padrão; ver dado cru exige
  permissão e fica registrado em `SITE_AuditLogs`.
- **Segredos** — nunca no `GraphSpec`, nunca no front, nunca em log. Referência simbólica
  (`secret://stripe/api_key`) resolvida só dentro do cliente MCP no servidor.
- **Guardrails de IA** — nós de agente herdam `AGENT_GUARDRAILS` obrigatoriamente; não é
  possível desligar por prompt. Nenhum agente inventa dado: tudo vem do banco (regra de ouro
  já estabelecida em `api/_aiSectorData.ts`).
- **Freio de emergência** — botão global "parar todas as execuções", quota diária de custo
  em BRL por grafo, e limite de mensagens por contato por dia (anti-spam no WhatsApp).

---

## 7. ENTREGÁVEIS

1. **ADR** — decisões de arquitetura com alternativas descartadas e por quê.
2. **Diagrama** de componentes e de sequência de uma execução completa, do webhook ao envio.
3. **Schema** — `GraphSpec` (JSON Schema) + migrações SQL com RLS.
4. **Contratos** — interface do runtime, do cliente MCP e do protocolo do debugger.
5. **Catálogo de nós** — cada nó com entradas, saídas, erros, efeitos colaterais, custo típico
   e se exige aprovação humana.
6. **Plano de migração incremental** — quais regras saem do código para o grafo, em que ordem,
   com estratégia de convivência (código antigo e grafo rodando lado a lado) e critério de corte.
7. **Estratégia de testes** — unitário do runtime, contrato dos MCPs, E2E dos 6 grafos de
   referência em dry-run, cobertura ≥ 80%.
8. **Plano de rollout** — feature flag por grafo, começando por FlowUp (menor risco: lead já
   perdido) e terminando em cobrança (maior risco: dinheiro).

Comece pela arquitetura e pelos contratos. Só depois proponha implementação.

---

## Notas de adaptação (o que mudou em relação ao prompt genérico)

| Prompt original | Adaptação W-Tech |
|---|---|
| "sistema de gestão da Wise Wolf" | Módulo do admin existente (`pages/Admin.tsx`), com permissão e atalho próprios |
| Nós genéricos | Catálogo em cima de Lead / FlowUp / Matrícula / Turma / Saldo / WhatsApp |
| "múltiplos agentes com supervisor" | Léo, Bia, Rita, Sofia — que **já existem** — mais um supervisor novo |
| "MCP com banco, APIs, WhatsApp e ERP" | Supabase, Meta Cloud API, Evolution (read-only), 4 gateways de pagamento, ERP interno de catálogo/estoque/financeiro |
| "grafo de conhecimento" | Resolução de identidade Lead ↔ Aluno ↔ Mecânico ↔ Pedido + segmentos do FlowUp |
| "Deep Research com revisão humana" | Alimenta glossário e base da IA de atendimento; bloqueio provado por análise estática |
| "custo estimado" | Custo em **BRL** por nó + métricas de negócio (saldo recuperado, leads reativados) |
| — (novo) | Regra de que a Evolution API nunca envia; dry-run como padrão; LGPD; RLS por cargo |
| — (novo) | Migração incremental convivendo com `api/jobs.ts`, webhooks e `_aiReply.ts` atuais |
