-- ============================================================================
-- Chat de IA da Gerência — histórico, treinamento e auditoria
-- ----------------------------------------------------------------------------
-- POR QUE ISTO EXISTE
-- O gerente de atendimento precisa perguntar em linguagem natural como anda o
-- trabalho de cada colaborador ("o Michael respondeu todo mundo hoje?", "quais
-- leads do André estão parados há mais de 3 dias?") e receber uma resposta
-- baseada nos dados reais do sistema — métricas E conteúdo das conversas de
-- WhatsApp.
--
-- DECISÕES QUE ESTE SCHEMA MATERIALIZA
--  1. A IA é SOMENTE LEITURA sobre a operação. Ela nunca envia WhatsApp, nunca
--     altera lead, nunca grava nada além do próprio histórico deste chat. Por
--     isso as únicas tabelas de escrita criadas aqui são as do próprio chat.
--  2. TODA conversa é gravada para auditoria do dono — inclusive as ferramentas
--     que o Claude chamou, os tokens gastos, a latência e o erro, quando houver.
--     Daí as colunas de telemetria em SITE_ManagerChatMessages.
--  3. O "Treinamento" (persona, base de conhecimento e regras) mora no banco,
--     no mesmo padrão da tela da Bia (SITE_WhatsAppAI*), para o gerente ajustar
--     o comportamento sem depender de deploy.
--  4. A chave da Anthropic NÃO entra aqui. Ela vem de process.env.ANTHROPIC_API_KEY,
--     só no servidor. A tabela SITE_SystemSettings deste projeto tem leitura
--     pública e já vaza as outras chaves de IA — repetir o erro seria expor a
--     chave inteira no navegador. Nenhuma coluna deste arquivo guarda segredo.
--
-- SEGURANÇA
-- As cinco tabelas ficam com RLS ligada e SEM nenhum grant para anon /
-- authenticated. O acesso é EXCLUSIVAMENTE pelo endpoint server-side
-- /api/manager-chat, que usa a service_role e valida o cookie de staff mais a
-- permissão (manager_chat_view / manager_chat_train / manager_chat_audit).
--
-- BÔNUS: SITE_WaAtendentes.user_id
-- Ver a seção 7 — é a correção da armadilha de identidade que faz o WhatsApp de
-- um colaborador sumir silenciosamente do relatório.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 0. Gatilho compartilhado de updated_at
--    (mesmo padrão de set_site_glossary_updated_at em
--     migrations/2026-07-28_add_glossary_generator.sql)
-- ============================================================================

CREATE OR REPLACE FUNCTION set_manager_chat_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- ============================================================================
-- 1. SITE_ManagerChatThreads — uma conversa (um "assunto") do gerente
-- ============================================================================

CREATE TABLE IF NOT EXISTS "SITE_ManagerChatThreads" (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Sem FK para SITE_Users de propósito: se um gerente for removido da equipe,
    -- o histórico dele PRECISA sobreviver para a auditoria do dono.
    user_id     uuid        NOT NULL,
    user_name   text        NOT NULL,          -- snapshot do nome no momento da criação
    title       text,                          -- resumo curto; a UI preenche a partir da 1ª pergunta
    archived    boolean     NOT NULL DEFAULT false,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Lista lateral do chat: as conversas do gerente, mais recentes primeiro.
CREATE INDEX IF NOT EXISTS idx_manager_chat_threads_user
    ON "SITE_ManagerChatThreads" (user_id, updated_at DESC);

DROP TRIGGER IF EXISTS manager_chat_threads_updated_at ON "SITE_ManagerChatThreads";
CREATE TRIGGER manager_chat_threads_updated_at
    BEFORE UPDATE ON "SITE_ManagerChatThreads"
    FOR EACH ROW EXECUTE FUNCTION set_manager_chat_updated_at();

-- ============================================================================
-- 2. SITE_ManagerChatMessages — cada turno da conversa + telemetria
-- ============================================================================

CREATE TABLE IF NOT EXISTS "SITE_ManagerChatMessages" (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id         uuid NOT NULL REFERENCES "SITE_ManagerChatThreads"(id) ON DELETE CASCADE,
    role              text NOT NULL CHECK (role IN ('user', 'assistant')),
    content           text NOT NULL,
    -- Ferramentas que o Claude pediu neste turno (nome, input, ms, ok, erro).
    -- É o que permite ao dono conferir DE ONDE veio cada número da resposta.
    -- Uma resposta pode conter vários tool_use em paralelo — por isso é array.
    tool_calls        jsonb,
    model             text,                    -- claude-opus-5 | claude-sonnet-5 | claude-haiku-4-5
    input_tokens      integer,
    output_tokens     integer,
    -- As DUAS pernas do cache precisam ser gravadas, porque têm preços diferentes:
    --   cache_read_tokens     — leitura do cache, custa ~0,1x o preço de entrada.
    --   cache_creation_tokens — ESCRITA do cache, custa 1,25x o preço de entrada.
    -- Guardar só a leitura faz o relatório de custo do dono ficar otimista
    -- exatamente no primeiro turno de cada conversa, que é quando o cache é
    -- escrito e o turno é o MAIS caro de todos.
    cache_read_tokens     integer,
    cache_creation_tokens integer,
    latency_ms        integer,
    error             text,                    -- preenchido quando o turno falhou ou foi recusado
    created_at        timestamptz NOT NULL DEFAULT now()
);

-- A migration pode já ter sido aplicada numa versão sem as colunas de cache, e
-- nesse caso o CREATE TABLE IF NOT EXISTS acima não faz nada. Estes ALTERs
-- garantem as colunas em banco já criado — e são idempotentes por si sós.
ALTER TABLE "SITE_ManagerChatMessages"
    ADD COLUMN IF NOT EXISTS cache_read_tokens integer;
ALTER TABLE "SITE_ManagerChatMessages"
    ADD COLUMN IF NOT EXISTS cache_creation_tokens integer;

-- Leitura da conversa, em ordem cronológica.
CREATE INDEX IF NOT EXISTS idx_manager_chat_messages_thread
    ON "SITE_ManagerChatMessages" (thread_id, created_at ASC);

-- Relatório de uso por período (auditoria do dono), sem varrer thread por thread.
CREATE INDEX IF NOT EXISTS idx_manager_chat_messages_created
    ON "SITE_ManagerChatMessages" (created_at DESC);

-- ============================================================================
-- 3. SITE_ManagerChatConfig — linha ÚNICA com o comportamento da IA
-- ============================================================================

CREATE TABLE IF NOT EXISTS "SITE_ManagerChatConfig" (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    enabled          boolean     NOT NULL DEFAULT true,
    persona          text,                     -- quem a IA é e como ela responde
    business_info    text,                     -- contexto da W-Tech (produtos, equipe, rotina)
    guardrails_extra text,                     -- travas adicionais escritas pelo gerente
    model            text        NOT NULL DEFAULT 'claude-opus-5',
    effort           text        NOT NULL DEFAULT 'high'
                     CHECK (effort IN ('low', 'medium', 'high', 'xhigh', 'max')),
    max_tokens       integer     NOT NULL DEFAULT 16000,
    created_at       timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now()
);

-- Garante no banco que existe no máximo UMA linha de configuração. Sem isso,
-- um POST duplicado cria uma segunda linha e o chat passa a responder com uma
-- persona diferente a cada requisição, dependendo de qual linha vier primeiro.
-- A expressão (id IS NOT NULL) vale true em toda linha, então o índice único
-- só admite uma.
CREATE UNIQUE INDEX IF NOT EXISTS manager_chat_config_singleton
    ON "SITE_ManagerChatConfig" ((id IS NOT NULL));

DROP TRIGGER IF EXISTS manager_chat_config_updated_at ON "SITE_ManagerChatConfig";
CREATE TRIGGER manager_chat_config_updated_at
    BEFORE UPDATE ON "SITE_ManagerChatConfig"
    FOR EACH ROW EXECUTE FUNCTION set_manager_chat_updated_at();

-- Semente: só entra se a tabela estiver vazia, para não sobrescrever o que o
-- gerente já ajustou na tela de Treinamento numa reexecução da migration.
INSERT INTO "SITE_ManagerChatConfig" (persona, business_info, guardrails_extra)
SELECT
$persona$Você é a analista de operação de atendimento da W-Tech Brasil. Você conversa com o gerente de atendimento e com o dono da empresa dentro do painel administrativo.

Seu trabalho é responder, com base nos dados reais do sistema, como está o atendimento de cada colaborador: quantos leads ele tem, quanto tempo demora para responder, o que ele escreve no WhatsApp, o que está parado e o que virou matrícula.

Como você responde:
- Direta e factual. Comece pela resposta, não pelo contexto. Nada de introdução do tipo "ótima pergunta".
- Português do Brasil, tom profissional e sem enfeite. Frases curtas.
- Todo número vem de uma consulta que você fez. Diga qual período e qual base o número cobre.
- Quando o dado não existir ou vier incompleto, diga isso com todas as letras. Nunca preencha buraco com estimativa.
- Compare sempre que fizer sentido: colaborador contra a média da equipe, semana contra semana anterior.
- Separe o que é fato (número, trecho de conversa) do que é a sua leitura do fato. Rotule sua opinião como opinião.
- Termine SEMPRE com o próximo passo prático: o que o gerente deve fazer hoje, com quem, sobre qual lead ou qual conversa.

O que você NÃO faz:
- Você é somente leitura. Você não envia mensagem de WhatsApp, não muda status de lead, não cria tarefa e não altera nada no sistema. Se pedirem isso, explique que a ação precisa ser feita na tela correspondente do painel.
- Você não julga a pessoa. Você avalia o atendimento. Fale de comportamento observável ("respondeu 6 horas depois", "não perguntou o modelo da moto"), nunca de caráter.
- Você não fala de demissão, advertência ou qualquer assunto trabalhista. Isso é decisão do dono.$persona$,
$negocio$A W-Tech Brasil vende cursos e serviços na área de suspensão de moto.

Frentes de receita:
- Cursos presenciais e online de manutenção e regulagem de suspensão (o carro-chefe é o curso de suspensão para pilotos e mecânicos).
- Serviços e revisão de suspensão, além de peças e componentes ligados a isso.
- Vendas internacionais de curso (checkout em euro), que seguem um rodízio próprio de responsáveis.

Como a operação funciona:
- Os leads chegam por anúncio, formulário do site, quiz e WhatsApp, e caem no CRM.
- Cada lead é distribuído a um colaborador do time comercial (o "atendido por" / assigned_to).
- O atendimento acontece quase todo por WhatsApp. Existem duas frentes: o inbox oficial da empresa (WhatsApp Cloud) e os números pessoais de cada atendente espelhados pela Evolution API.
- Quando o lead fecha, ele vira matrícula em um curso, com o nome de quem inscreveu registrado.
- Tarefas e follow-ups ficam no módulo de Tarefas, muitas vezes ligadas ao lead.

O time comercial trabalha com metas de resposta rápida, follow-up ativo e conversão de lead em matrícula. É esse trabalho que o gerente quer enxergar quando conversa com você.$negocio$,
$guard$$guard$
WHERE NOT EXISTS (SELECT 1 FROM "SITE_ManagerChatConfig");

-- ============================================================================
-- 4. SITE_ManagerChatKnowledge — base de conhecimento do negócio
--    (blocos curtos que entram no prompt e ensinam o vocabulário da casa)
-- ============================================================================

CREATE TABLE IF NOT EXISTS "SITE_ManagerChatKnowledge" (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    topic      text        NOT NULL,           -- agrupador curto (funil, sla, qualidade, dados)
    title      text        NOT NULL,
    content    text        NOT NULL,
    enabled    boolean     NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_manager_chat_knowledge_enabled
    ON "SITE_ManagerChatKnowledge" (enabled, topic);

DROP TRIGGER IF EXISTS manager_chat_knowledge_updated_at ON "SITE_ManagerChatKnowledge";
CREATE TRIGGER manager_chat_knowledge_updated_at
    BEFORE UPDATE ON "SITE_ManagerChatKnowledge"
    FOR EACH ROW EXECUTE FUNCTION set_manager_chat_updated_at();

-- Semente: idem, só se a tabela estiver vazia (se o gerente apagou um item, ele
-- não deve voltar sozinho na próxima execução).
INSERT INTO "SITE_ManagerChatKnowledge" (topic, title, content)
SELECT v.topic, v.title, v.content
FROM (VALUES
    (
        'funil',
        'Vocabulário do funil da W-Tech',
        $t$Lead: pessoa que demonstrou interesse e entrou no CRM (tabela SITE_Leads).
Dono do lead: o colaborador em assigned_to. É ele quem responde por aquele atendimento.
Lead trabalhado: teve pelo menos uma mensagem enviada pelo colaborador depois da entrada.
Lead parado: a FICHA dele no CRM está sem atualização (SITE_Leads.updated_at) há N dias e o status ainda não é final (ver o item "lead parado", que explica o limite dessa definição).
Conversão: o lead virou matrícula ou compra registrada. No campo SITE_Leads.status, as ferramentas contam como CONVERTIDO exatamente três valores: 'Converted', 'Matriculated' e 'CheckedIn'. Sim, 'CheckedIn' entra na conta — então "convertidos" e "taxa_conversao_pct" incluem lead que apenas fez check-in, e não só quem pagou ou matriculou. Sempre que apresentar esses números, diga quais status estão dentro deles.
Perdido: o lead foi marcado como perdido. No campo SITE_Leads.status são os valores 'Lost' e 'Rejected'.
Status FINAL (o lead tem desfecho e por isso some da lista de parados): 'Converted', 'Matriculated', 'CheckedIn', 'Lost', 'Rejected' e 'Cold'. 'Cold' é final por decisão de alguém que marcou o lead como frio — não é conversão nem perda, e mesmo assim não conta como parado.
A lista AUTORITATIVA de status é sempre a que a própria ferramenta declara no retorno (o campo que lista os status contados e a nota_metodologica). Se o retorno divergir do que está escrito aqui, vale o retorno da ferramenta — e avise o gerente da divergência.
Quando o gerente falar em "carteira" de alguém, ele quer o conjunto de leads abertos com aquele colaborador como dono.$t$
    ),
    (
        'sla',
        'O que conta como lead parado',
        $t$A ferramenta leads_parados considera um lead PARADO quando as DUAS coisas valem ao mesmo tempo:
1. SITE_Leads.updated_at (ou created_at, quando o lead nunca foi atualizado) é mais antigo que N dias. N é o parâmetro dias_sem_atualizacao, padrão 7.
2. SITE_Leads.status não é final — os finais são 'Converted', 'Matriculated', 'CheckedIn', 'Lost', 'Rejected' e 'Cold'.

É SÓ ISSO. Não existe terceira condição. Os limites abaixo são obrigatórios de declarar quando você apresentar essa lista:
- A ferramenta NÃO lê mensagem nenhuma. Ela não sabe qual foi a última mensagem da conversa, nem quem a enviou, nem quando. Nunca afirme, a partir dela, que "o cliente ficou sem resposta" ou que "a última mensagem foi do cliente": esse dado não vem em ferramenta alguma deste chat e não pode ser afirmado.
- A ferramenta NÃO lê SITE_Tasks. Um lead com follow-up agendado e tarefa aberta PODE aparecer na lista de parados. Antes de cobrar o colaborador, o gerente precisa conferir as tarefas dele — use tarefas_por_colaborador para isso, e diga que são consultas separadas.
- "Parado" aqui significa "ficha do CRM sem atualização", não "cliente abandonado". Use essas palavras ao relatar.
- Qualquer edição do lead atualiza updated_at, mesmo sem nenhum contato com o cliente. Isso tira o lead da lista sem que ninguém tenha atendido ninguém — a lista é um indício de esquecimento, não prova dele.
- Sempre informe há quantos dias o lead está sem atualização, quem é o dono dele e qual janela (N dias) foi usada.$t$
    ),
    (
        'qualidade',
        'Como a W-Tech mede um bom atendimento',
        $t$Cinco critérios, na ordem em que a W-Tech dá peso:
1. Velocidade da primeira resposta. Lead novo tem que ser respondido no mesmo dia, de preferência em minutos.
2. Follow-up ativo. Quem não responde tem que ser buscado de novo. Um único "oi, tudo bem?" e silêncio não é atendimento.
3. Qualificação. Perguntar o que a pessoa faz (piloto, mecânico, oficina), qual moto, qual objetivo e qual prazo, antes de empurrar preço.
4. Clareza comercial. Apresentar o curso ou serviço certo, explicar o valor, oferecer a forma de pagamento e PEDIR o fechamento. Atendimento que só informa e não convida não converte.
5. Cordialidade e português correto. Mensagem seca, com erro grosseiro ou áudio sem contexto queima a marca.

Um atendimento bom junta os cinco. Um atendimento rápido e grosseiro não é bom; um atendimento gentil que nunca fecha também não.$t$
    ),
    (
        'dados',
        'Como o mesmo colaborador aparece em cada tabela',
        $t$O sistema identifica a mesma pessoa de jeitos diferentes conforme a tabela:
- SITE_Leads.assigned_to: UUID de SITE_Users.id. Identificador CONFIÁVEL.
- SITE_Tasks.assigned_to: UUID de SITE_Users.id. Identificador CONFIÁVEL.
- SITE_WhatsAppCloudConversations.assigned_to: UUID de SITE_Users.id. Identificador CONFIÁVEL. NÃO é nome em texto — nunca compare esse campo com o nome do colaborador.
- SITE_WaAtendentes.user_id: UUID de SITE_Users.id, quando preenchido. Confiável. É por essa coluna que se liga um atendente do WhatsApp pessoal (Evolution) ao usuário do sistema.
- SITE_WaAtendentes.nome: texto digitado à mão, com grafia divergente do cadastro (já aconteceu: "Cristofer" no WhatsApp e "Christopher" em SITE_Users). NÃO é confiável para cruzamento — use sempre user_id.
- SITE_Enrollments.enrolled_by_name: NOME em texto. É o único cruzamento que só existe por nome.

Consequência prática: onde o vínculo é por UUID, o recorte é exato. Onde o vínculo é por nome (só SITE_Enrollments, ou SITE_WaAtendentes quando user_id ainda está NULL), o cruzamento pode falhar em silêncio se a grafia divergir — nesses casos avise no texto da resposta que aquele recorte pode estar incompleto.

Em SITE_Enrollments, enrolled_by_name = 'Automatico' significa inscrição feita pelo sistema, não por uma pessoa. Esse valor NUNCA entra na contagem de nenhum colaborador.$t$
    ),
    (
        'dados',
        'Valores reais dos campos de conversa de WhatsApp',
        $t$Estes são os valores que os campos assumem de verdade no banco. Não invente outros e não assuma sinônimos em inglês.

SITE_WhatsAppCloudConversations.status: 'bot' | 'pendente' | 'humano' | 'encerrado'.
- 'bot': a IA de atendimento (Bia) está conduzindo sozinha.
- 'pendente': está esperando um humano assumir.
- 'humano': um colaborador assumiu a conversa.
- 'encerrado': conversa fechada.

SITE_WhatsAppCloudMessages.direction: 'in' | 'out' (entrada e saída). NÃO existe 'inbound'/'outbound'.
- 'in': mensagem do cliente.
- 'out': mensagem enviada pela empresa (pode ter sido a IA ou uma pessoa — veja sent_by).

SITE_WhatsAppCloudMessages.sent_by: 'customer' | 'human' | 'ai' | 'ai_draft' | 'system' | NULL.
- 'human' é o ÚNICO valor que comprova atendimento feito por uma pessoa.
- 'ai' é resposta automática da Bia: NÃO conta como atendimento de colaborador.
- 'ai_draft' é rascunho sugerido, pode nem ter sido enviado.
- 'system' é mensagem de serviço.
- NULL é histórico antigo, sem essa marcação. Numa amostra real de 400 mensagens, 131 estavam NULL — ou seja, é comum. Mensagem com sent_by NULL não prova nem desmente autoria humana: ao contar "respostas do colaborador", diga quantas ficaram sem classificação em vez de somá-las ou descartá-las em silêncio.

SITE_Leads.status: New | Contacted | Negotiating | Converted | Qualified | Matriculated | CheckedIn | Cold | Rejected | Lost.
SITE_Tasks.status: TODO | IN_PROGRESS | DONE.$t$
    ),
    (
        'negocio',
        'Erros de leitura que já geraram conclusão errada',
        $t$- Volume de leads não é desempenho. Quem recebeu mais leads tende a ter mais leads parados. Compare sempre em proporção (taxa), não em número absoluto.
- Período curto engana. Um dia ruim não é tendência; olhe pelo menos 7 dias antes de afirmar que alguém piorou.
- Colaborador de férias, afastado ou recém-chegado aparece com números baixos por motivo óbvio. Se o padrão parecer estranho, diga que o número precisa de contexto humano antes de virar cobrança.
- Conversa longa não é conversa boa. Muitas mensagens podem significar dificuldade de explicar, não dedicação.$t$
    )
) AS v(topic, title, content)
WHERE NOT EXISTS (SELECT 1 FROM "SITE_ManagerChatKnowledge");

-- ----------------------------------------------------------------------------
-- 4.1 CORREÇÃO de conhecimento já semeado por uma versão anterior deste arquivo
--
-- O INSERT acima só roda com a tabela vazia. Num banco onde a migration JÁ foi
-- aplicada, ele não faz nada — e a versão antiga afirmava que
-- SITE_WhatsAppCloudConversations.assigned_to guardava NOME em texto. Isso é
-- FALSO: o campo guarda o UUID de SITE_Users.id (conferido em produção).
--
-- Esse texto não é um comentário inofensivo: ele vai inteiro para o system
-- prompt e ENSINA o modelo de dados errado. Com ele, a IA lê um UUID esperando
-- um nome, conclui que não casou com ninguém e reporta zero atendimento para um
-- colaborador que atendeu — o número errado vira avaliação injusta.
--
-- O UPDATE é seguro e idempotente: só toca na linha que AINDA contém a
-- afirmação errada. Se o gerente já reescreveu o item, o LIKE não casa e o
-- texto dele permanece intocado.
UPDATE "SITE_ManagerChatKnowledge"
SET content = $fix$O sistema identifica a mesma pessoa de jeitos diferentes conforme a tabela:
- SITE_Leads.assigned_to: UUID de SITE_Users.id. Identificador CONFIÁVEL.
- SITE_Tasks.assigned_to: UUID de SITE_Users.id. Identificador CONFIÁVEL.
- SITE_WhatsAppCloudConversations.assigned_to: UUID de SITE_Users.id. Identificador CONFIÁVEL. NÃO é nome em texto — nunca compare esse campo com o nome do colaborador.
- SITE_WaAtendentes.user_id: UUID de SITE_Users.id, quando preenchido. Confiável. É por essa coluna que se liga um atendente do WhatsApp pessoal (Evolution) ao usuário do sistema.
- SITE_WaAtendentes.nome: texto digitado à mão, com grafia divergente do cadastro (já aconteceu: "Cristofer" no WhatsApp e "Christopher" em SITE_Users). NÃO é confiável para cruzamento — use sempre user_id.
- SITE_Enrollments.enrolled_by_name: NOME em texto. É o único cruzamento que só existe por nome.

Consequência prática: onde o vínculo é por UUID, o recorte é exato. Onde o vínculo é por nome (só SITE_Enrollments, ou SITE_WaAtendentes quando user_id ainda está NULL), o cruzamento pode falhar em silêncio se a grafia divergir — nesses casos avise no texto da resposta que aquele recorte pode estar incompleto.

Em SITE_Enrollments, enrolled_by_name = 'Automatico' significa inscrição feita pelo sistema, não por uma pessoa. Esse valor NUNCA entra na contagem de nenhum colaborador.$fix$
WHERE content LIKE '%SITE_WhatsAppCloudConversations.assigned_to: NOME em texto%';

-- 4.2 O item com os valores REAIS de status/direction/sent_by também nasceu
--     depois da primeira aplicação. Sem ele a IA inventa 'inbound'/'outbound' e
--     credita ao colaborador mensagem que na verdade a Bia enviou. Entra só se
--     ainda não existir, então rodar de novo não duplica.
INSERT INTO "SITE_ManagerChatKnowledge" (topic, title, content)
SELECT 'dados',
       'Valores reais dos campos de conversa de WhatsApp',
       $fix$Estes são os valores que os campos assumem de verdade no banco. Não invente outros e não assuma sinônimos em inglês.

SITE_WhatsAppCloudConversations.status: 'bot' | 'pendente' | 'humano' | 'encerrado'.
- 'bot': a IA de atendimento (Bia) está conduzindo sozinha.
- 'pendente': está esperando um humano assumir.
- 'humano': um colaborador assumiu a conversa.
- 'encerrado': conversa fechada.

SITE_WhatsAppCloudMessages.direction: 'in' | 'out' (entrada e saída). NÃO existe 'inbound'/'outbound'.
- 'in': mensagem do cliente.
- 'out': mensagem enviada pela empresa (pode ter sido a IA ou uma pessoa — veja sent_by).

SITE_WhatsAppCloudMessages.sent_by: 'customer' | 'human' | 'ai' | 'ai_draft' | 'system' | NULL.
- 'human' é o ÚNICO valor que comprova atendimento feito por uma pessoa.
- 'ai' é resposta automática da Bia: NÃO conta como atendimento de colaborador.
- 'ai_draft' é rascunho sugerido, pode nem ter sido enviado.
- 'system' é mensagem de serviço.
- NULL é histórico antigo, sem essa marcação. Numa amostra real de 400 mensagens, 131 estavam NULL — ou seja, é comum. Mensagem com sent_by NULL não prova nem desmente autoria humana: ao contar "respostas do colaborador", diga quantas ficaram sem classificação em vez de somá-las ou descartá-las em silêncio.

SITE_Leads.status: New | Contacted | Negotiating | Converted | Qualified | Matriculated | CheckedIn | Cold | Rejected | Lost.
SITE_Tasks.status: TODO | IN_PROGRESS | DONE.$fix$
WHERE NOT EXISTS (
    SELECT 1 FROM "SITE_ManagerChatKnowledge"
    WHERE title = 'Valores reais dos campos de conversa de WhatsApp'
);

-- 4.3 CORREÇÃO: a versão anterior definia "lead parado" com TRÊS condições —
--     status não-final, última MENSAGEM da conversa com 3 dias ou mais, e
--     ausência de tarefa de follow-up aberta. A ferramenta leads_parados não
--     faz nada disso: ela olha SOMENTE SITE_Leads.updated_at e o status. Nunca
--     lê mensagem e nunca lê SITE_Tasks.
--
--     O estrago é duplo. Primeiro, a IA passa a apresentar a lista como se ela
--     já tivesse descontado quem tem follow-up agendado — e o gerente cobra um
--     colaborador que fez o certo. Segundo, o texto antigo mandava priorizar os
--     casos em que "a última mensagem foi do CLIENTE (direction = 'in')", um
--     dado que ferramenta nenhuma devolve e que NÃO existe join entre
--     SITE_Leads e SITE_WhatsAppCloudConversations em lugar algum do código: a
--     IA ou ignora a ordem, ou inventa o critério e ordena a lista por um fato
--     que ela não consultou.
--
--     Idempotente e conservador, no mesmo padrão da 4.1: casa por um trecho
--     estável do texto ERRADO, então só toca na linha ainda envenenada. Se o
--     gerente já reescreveu o item, o LIKE não casa e o texto dele fica.
UPDATE "SITE_ManagerChatKnowledge"
SET content = $sla$A ferramenta leads_parados considera um lead PARADO quando as DUAS coisas valem ao mesmo tempo:
1. SITE_Leads.updated_at (ou created_at, quando o lead nunca foi atualizado) é mais antigo que N dias. N é o parâmetro dias_sem_atualizacao, padrão 7.
2. SITE_Leads.status não é final — os finais são 'Converted', 'Matriculated', 'CheckedIn', 'Lost', 'Rejected' e 'Cold'.

É SÓ ISSO. Não existe terceira condição. Os limites abaixo são obrigatórios de declarar quando você apresentar essa lista:
- A ferramenta NÃO lê mensagem nenhuma. Ela não sabe qual foi a última mensagem da conversa, nem quem a enviou, nem quando. Nunca afirme, a partir dela, que "o cliente ficou sem resposta" ou que "a última mensagem foi do cliente": esse dado não vem em ferramenta alguma deste chat e não pode ser afirmado.
- A ferramenta NÃO lê SITE_Tasks. Um lead com follow-up agendado e tarefa aberta PODE aparecer na lista de parados. Antes de cobrar o colaborador, o gerente precisa conferir as tarefas dele — use tarefas_por_colaborador para isso, e diga que são consultas separadas.
- "Parado" aqui significa "ficha do CRM sem atualização", não "cliente abandonado". Use essas palavras ao relatar.
- Qualquer edição do lead atualiza updated_at, mesmo sem nenhum contato com o cliente. Isso tira o lead da lista sem que ninguém tenha atendido ninguém — a lista é um indício de esquecimento, não prova dele.
- Sempre informe há quantos dias o lead está sem atualização, quem é o dono dele e qual janela (N dias) foi usada.$sla$
WHERE content LIKE $velho$%A última mensagem trocada na conversa dele tem 3 dias ou mais.%$velho$;

-- 4.4 CORREÇÃO: a versão anterior ensinava que conversão é 'Converted' e
--     'Matriculated', e que perdido é 'Lost' e 'Rejected' — e parava aí.
--     As ferramentas contam 'CheckedIn' TAMBÉM como convertido, e tratam
--     'CheckedIn' e 'Cold' como status finais (que somem de leads_parados).
--
--     Com o texto antigo, um colaborador com 10 leads em 'CheckedIn' recebe
--     convertidos: 10 e taxa de conversão inflada, enquanto a IA explica ao
--     gerente que "converteu" quer dizer Converted/Matriculated. O número é
--     apresentado com uma definição que não é a dele — o pior tipo de erro
--     aqui, porque parece certo e vira avaliação de gente.
UPDATE "SITE_ManagerChatKnowledge"
SET content = $funil$Lead: pessoa que demonstrou interesse e entrou no CRM (tabela SITE_Leads).
Dono do lead: o colaborador em assigned_to. É ele quem responde por aquele atendimento.
Lead trabalhado: teve pelo menos uma mensagem enviada pelo colaborador depois da entrada.
Lead parado: a FICHA dele no CRM está sem atualização (SITE_Leads.updated_at) há N dias e o status ainda não é final (ver o item "lead parado", que explica o limite dessa definição).
Conversão: o lead virou matrícula ou compra registrada. No campo SITE_Leads.status, as ferramentas contam como CONVERTIDO exatamente três valores: 'Converted', 'Matriculated' e 'CheckedIn'. Sim, 'CheckedIn' entra na conta — então "convertidos" e "taxa_conversao_pct" incluem lead que apenas fez check-in, e não só quem pagou ou matriculou. Sempre que apresentar esses números, diga quais status estão dentro deles.
Perdido: o lead foi marcado como perdido. No campo SITE_Leads.status são os valores 'Lost' e 'Rejected'.
Status FINAL (o lead tem desfecho e por isso some da lista de parados): 'Converted', 'Matriculated', 'CheckedIn', 'Lost', 'Rejected' e 'Cold'. 'Cold' é final por decisão de alguém que marcou o lead como frio — não é conversão nem perda, e mesmo assim não conta como parado.
A lista AUTORITATIVA de status é sempre a que a própria ferramenta declara no retorno (o campo que lista os status contados e a nota_metodologica). Se o retorno divergir do que está escrito aqui, vale o retorno da ferramenta — e avise o gerente da divergência.
Quando o gerente falar em "carteira" de alguém, ele quer o conjunto de leads abertos com aquele colaborador como dono.$funil$
WHERE content LIKE $velho$%os valores que representam isso são 'Converted' e 'Matriculated'.%$velho$;
-- ----------------------------------------------------------------------------

-- ============================================================================
-- 5. SITE_ManagerChatRules — travas de comportamento
--    forbidden = nunca fazer | required = sempre fazer | escalate = mandar
--    para um humano em vez de responder
-- ============================================================================

CREATE TABLE IF NOT EXISTS "SITE_ManagerChatRules" (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    type       text        NOT NULL CHECK (type IN ('forbidden', 'required', 'escalate')),
    value      text        NOT NULL,
    enabled    boolean     NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_manager_chat_rules_enabled
    ON "SITE_ManagerChatRules" (enabled, type);

DROP TRIGGER IF EXISTS manager_chat_rules_updated_at ON "SITE_ManagerChatRules";
CREATE TRIGGER manager_chat_rules_updated_at
    BEFORE UPDATE ON "SITE_ManagerChatRules"
    FOR EACH ROW EXECUTE FUNCTION set_manager_chat_updated_at();

INSERT INTO "SITE_ManagerChatRules" (type, value)
SELECT v.type, v.value
FROM (VALUES
    ('forbidden', 'Nunca invente, estime ou arredonde número que você não consultou. Se a consulta não trouxe o dado, diga "não tenho esse dado" e explique o que faltou.'),
    ('forbidden', 'Nunca afirme que executou algo no sistema. Você é somente leitura: não envia WhatsApp, não altera lead, não cria tarefa e não muda configuração.'),
    ('required', 'Sempre diga de onde veio o número: qual recorte de dados e qual período (ex.: "leads dos últimos 7 dias, atribuídos por assigned_to").'),
    ('required', 'Sempre avise quando o cruzamento tiver sido feito por NOME em vez de UUID — acontece em SITE_Enrollments.enrolled_by_name e em atendente de WhatsApp ainda sem user_id. A grafia pode divergir e o recorte pode estar incompleto. Não emita esse aviso quando o vínculo foi por UUID (leads, tarefas e conversas do WhatsApp Cloud), porque aí o recorte é exato e o aviso só confunde o gerente.'),
    ('required', 'Sempre separe o que a PESSOA respondeu do que a IA respondeu antes de creditar atendimento a um colaborador: só sent_by = ''human'' comprova resposta humana, e mensagem com sent_by nulo é histórico sem classificação. Informe quantas mensagens ficaram sem classificação em vez de somá-las ou ignorá-las calado.'),
    ('required', 'Sempre termine a resposta com o próximo passo prático: o que fazer, com quem e sobre qual lead ou conversa.'),
    ('escalate', 'Se a pergunta envolver demissão, advertência, corte de comissão ou qualquer questão trabalhista, não opine: diga que a decisão é do dono e ofereça apenas os fatos observados.')
) AS v(type, value)
WHERE NOT EXISTS (SELECT 1 FROM "SITE_ManagerChatRules");

-- 5.1 Mesma situação do item 4.1: num banco já migrado o INSERT acima não roda.
--     Esta trava é a que impede a IA de somar mensagem da Bia como se fosse
--     resposta do colaborador — sem ela, quem foi bem atendido pelo robô faz o
--     humano parecer produtivo, e quem tem histórico antigo (sent_by nulo)
--     parece ausente. Entra só se ainda não existir.
INSERT INTO "SITE_ManagerChatRules" (type, value)
SELECT 'required',
       'Sempre separe o que a PESSOA respondeu do que a IA respondeu antes de creditar atendimento a um colaborador: só sent_by = ''human'' comprova resposta humana, e mensagem com sent_by nulo é histórico sem classificação. Informe quantas mensagens ficaram sem classificação em vez de somá-las ou ignorá-las calado.'
WHERE NOT EXISTS (
    SELECT 1 FROM "SITE_ManagerChatRules" WHERE value LIKE '%sent_by%'
);

-- ============================================================================
-- 6. RLS — nenhuma das cinco tabelas é acessível pela chave anon
--    O ÚNICO caminho de acesso é o endpoint server-side /api/manager-chat,
--    que usa a service_role e valida cookie de staff + permissão. Sem isso, o
--    histórico de auditoria (que contém trechos reais de conversa de cliente)
--    ficaria legível no navegador de qualquer visitante do site.
-- ============================================================================

ALTER TABLE "SITE_ManagerChatThreads"   ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SITE_ManagerChatMessages"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SITE_ManagerChatConfig"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SITE_ManagerChatKnowledge" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SITE_ManagerChatRules"     ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "SITE_ManagerChatThreads"   FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE "SITE_ManagerChatMessages"  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE "SITE_ManagerChatConfig"    FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE "SITE_ManagerChatKnowledge" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE "SITE_ManagerChatRules"     FROM PUBLIC, anon, authenticated;

GRANT ALL ON TABLE "SITE_ManagerChatThreads"   TO service_role;
GRANT ALL ON TABLE "SITE_ManagerChatMessages"  TO service_role;
GRANT ALL ON TABLE "SITE_ManagerChatConfig"    TO service_role;
GRANT ALL ON TABLE "SITE_ManagerChatKnowledge" TO service_role;
GRANT ALL ON TABLE "SITE_ManagerChatRules"     TO service_role;

DROP POLICY IF EXISTS manager_chat_threads_service_only   ON "SITE_ManagerChatThreads";
DROP POLICY IF EXISTS manager_chat_messages_service_only  ON "SITE_ManagerChatMessages";
DROP POLICY IF EXISTS manager_chat_config_service_only    ON "SITE_ManagerChatConfig";
DROP POLICY IF EXISTS manager_chat_knowledge_service_only ON "SITE_ManagerChatKnowledge";
DROP POLICY IF EXISTS manager_chat_rules_service_only     ON "SITE_ManagerChatRules";

CREATE POLICY manager_chat_threads_service_only ON "SITE_ManagerChatThreads"
    FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY manager_chat_messages_service_only ON "SITE_ManagerChatMessages"
    FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY manager_chat_config_service_only ON "SITE_ManagerChatConfig"
    FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY manager_chat_knowledge_service_only ON "SITE_ManagerChatKnowledge"
    FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY manager_chat_rules_service_only ON "SITE_ManagerChatRules"
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================================
-- 7. SITE_WaAtendentes.user_id — o fim do cruzamento por nome
-- ----------------------------------------------------------------------------
-- ARMADILHA REAL, JÁ CONFIRMADA EM PRODUÇÃO:
-- o mesmo colaborador aparece com identificadores diferentes em cada tabela.
-- SITE_Leads.assigned_to guarda o UUID de SITE_Users (confiável), mas
-- SITE_WaAtendentes.nome guarda texto digitado à mão — e o slot 4 está
-- cadastrado como "Cristofer", enquanto em SITE_Users a pessoa é
-- "Christopher" (com 669 leads). Cruzar essas duas tabelas por nome faz o
-- WhatsApp dele SUMIR do relatório sem erro nenhum: o JOIN simplesmente não
-- casa e o número sai menor, parecendo que ele não atendeu ninguém.
--
-- A coluna user_id resolve na raiz. A partir daqui, todo cruzamento deve
-- preferir user_id; casamento por nome só pode existir como fallback, e quando
-- for usado o resultado da ferramenta TEM que trazer aviso explícito.
-- ============================================================================

ALTER TABLE "SITE_WaAtendentes"
    ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES "SITE_Users"(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_wa_atendentes_user
    ON "SITE_WaAtendentes" (user_id);

-- 7.1 Vínculos EXPLÍCITOS conhecidos. Rodam ANTES do casamento automático de
--     propósito: assim um mapeamento que o time confirmou à mão nunca corre o
--     risco de ser preterido por uma heurística de nome. O passo 7.2 só toca em
--     linhas ainda NULL, então ele nunca sobrescreve o que foi decidido aqui.
--
--     Caso conhecido e IRRECUPERÁVEL por normalização: "Cristofer" (WhatsApp) é
--     a mesma pessoa que "Christopher" (cadastro). A grafia diverge no meio da
--     palavra ("Cri" x "Chri"), então nenhuma normalização automática resolve —
--     é exatamente por isso que o cruzamento por nome não é confiável e a
--     coluna user_id passa a ser a fonte de verdade.
UPDATE "SITE_WaAtendentes" a
SET user_id = u.id
FROM "SITE_Users" u
WHERE a.user_id IS NULL
  AND lower(btrim(a.nome)) = 'cristofer'
  AND lower(btrim(u.name))  = 'christopher';

-- 7.2 Preenchimento automático por nome normalizado (minúsculas, sem espaço
--     sobrando e sem acento — translate cobre os acentos sem depender da
--     extensão unaccent, que pode não estar instalada no projeto).
--     Só preenche quando o nome casa com EXATAMENTE UM usuário: dois
--     "Michael" no cadastro significam ambiguidade, e chutar aqui produziria
--     relatório errado silenciosamente. Esses casos ficam NULL de propósito,
--     para serem resolvidos à mão na tela de Atendentes.
WITH candidatos AS (
    SELECT a.id AS atendente_id,
           u.id AS usuario_id,
           -- quantos usuários casaram com ESTE atendente
           count(*) OVER (PARTITION BY a.id) AS quantos
    FROM "SITE_WaAtendentes" a
    JOIN "SITE_Users" u
      ON translate(lower(btrim(u.name)),
                   'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ',
                   'aaaaaeeeeiiiiooooouuuucaaaaaeeeeiiiiooooouuuuc')
       = translate(lower(btrim(a.nome)),
                   'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ',
                   'aaaaaeeeeiiiiooooouuuucaaaaaeeeeiiiiooooouuuuc')
    WHERE a.user_id IS NULL
      AND btrim(COALESCE(a.nome, '')) <> ''
      -- Mesmo critério que a aplicação usa (api/_aiReply.ts: loadActiveUsers):
      -- status ausente conta como ativo e a comparação é case-insensitive.
      -- Comparar com <> 'inactive' cru deixaria passar 'Inactive'/'INACTIVE' e
      -- vincularia o WhatsApp a alguém que já saiu da equipe.
      AND lower(COALESCE(u.status, 'Active')) = 'active'
)
UPDATE "SITE_WaAtendentes" a
SET user_id = candidatos.usuario_id
FROM candidatos
WHERE a.id = candidatos.atendente_id
  AND candidatos.quantos = 1;

-- ============================================================================
-- 8. Permissão de acesso ao chat para o cargo do gerente
--    (o nome real do cargo no banco é "Gerente Atendimento" — não "Gerente")
--    Super Admin não precisa de UPDATE: o cargo tem admin_access = true, que
--    já libera qualquer chave em isPermissionGranted (api/_auth.ts).
-- ============================================================================

UPDATE "SITE_Roles"
SET permissions = COALESCE(permissions, '{}'::jsonb) || '{"manager_chat_view": true}'::jsonb
WHERE name = 'Gerente Atendimento';

-- ----------------------------------------------------------------------------
-- DECISÃO EXPLÍCITA: só manager_chat_view é concedida aqui.
--
-- As outras duas chaves NÃO são dadas a nenhum cargo de propósito:
--   manager_chat_train — edita persona, base de conhecimento e regras. Quem
--       tem isso muda o que a IA acredita sobre o negócio, e portanto muda as
--       conclusões que ela entrega sobre o trabalho de pessoas reais.
--   manager_chat_audit — lê o histórico de TODOS os gerentes, com as
--       ferramentas chamadas, os tokens e o custo. É a trilha que serve para
--       auditar quem perguntou o quê sobre quem.
--
-- Hoje elas ficam disponíveis apenas para quem tem admin_access = true (Super
-- Admin), porque isPermissionGranted libera qualquer chave nesse caso. Isso é
-- o padrão desejado: quem audita não deve ser o mesmo que é auditado.
--
-- Se o dono decidir depois que o gerente também pode treinar a IA, basta
-- descomentar o UPDATE abaixo. Fica comentado, e não meramente ausente, para
-- que a próxima pessoa a ler este arquivo saiba que a omissão foi escolha e
-- não esquecimento.
--
-- UPDATE "SITE_Roles"
-- SET permissions = COALESCE(permissions, '{}'::jsonb) || '{"manager_chat_train": true}'::jsonb
-- WHERE name = 'Gerente Atendimento';
--
-- E, se um dia existir um cargo de auditoria separado do Super Admin:
-- UPDATE "SITE_Roles"
-- SET permissions = COALESCE(permissions, '{}'::jsonb) || '{"manager_chat_audit": true}'::jsonb
-- WHERE name = 'NOME_DO_CARGO_AQUI';
-- ----------------------------------------------------------------------------

-- ============================================================================
-- 9. Recarrega o cache de schema do PostgREST
--    Sem isso a API responde "Could not find the table ... in the schema
--    cache" mesmo com as tabelas já criadas.
-- ============================================================================

NOTIFY pgrst, 'reload schema';

COMMIT;

-- ============================================================================
-- CONFERÊNCIA (rodar depois do COMMIT, uma consulta por vez)
-- ----------------------------------------------------------------------------
-- -- 1) As cinco tabelas existem e estão com RLS ligada?
-- SELECT relname, relrowsecurity
-- FROM pg_class
-- WHERE relname IN ('SITE_ManagerChatThreads', 'SITE_ManagerChatMessages',
--                   'SITE_ManagerChatConfig', 'SITE_ManagerChatKnowledge',
--                   'SITE_ManagerChatRules')
-- ORDER BY relname;
--
-- -- 2) Ninguém além do service_role pode tocar nelas?
-- SELECT table_name, grantee, privilege_type
-- FROM information_schema.role_table_grants
-- WHERE table_name LIKE 'SITE_ManagerChat%'
-- ORDER BY table_name, grantee;
--
-- -- 3) A configuração inicial entrou (deve devolver exatamente 1 linha)?
-- SELECT id, enabled, model, effort, max_tokens, length(persona) AS tam_persona
-- FROM "SITE_ManagerChatConfig";
--
-- -- 4) Sementes de conhecimento (6) e regras (7)?
-- SELECT 'conhecimento' AS tabela, count(*) FROM "SITE_ManagerChatKnowledge"
-- UNION ALL
-- SELECT 'regras', count(*) FROM "SITE_ManagerChatRules";
--
-- -- 5) Panorama do vínculo dos atendentes de WhatsApp.
-- SELECT a.slot, a.nome AS nome_no_whatsapp, u.name AS nome_no_cadastro, a.user_id
-- FROM "SITE_WaAtendentes" a
-- LEFT JOIN "SITE_Users" u ON u.id = a.user_id
-- ORDER BY a.slot;
--
-- -- 5b) O QUE FALTA: atendentes que sobraram sem vínculo.
-- --     Esta é a consulta que importa. Enquanto ela devolver linhas, o WhatsApp
-- --     dessas pessoas fica FORA de qualquer relatório por user_id — e some do
-- --     número sem gerar erro nenhum. Vincule cada uma à mão na tela de
-- --     Atendentes antes de confiar em comparação entre colaboradores.
-- --     Deve devolver ZERO linhas.
-- SELECT a.slot, a.nome AS nome_no_whatsapp
-- FROM "SITE_WaAtendentes" a
-- WHERE a.user_id IS NULL
--   AND btrim(COALESCE(a.nome, '')) <> ''
-- ORDER BY a.slot;
--
-- -- 6) O cargo do gerente recebeu a permissão de VER — e continua SEM as de
-- --    treinar e auditar (ver a decisão explícita na seção 8)?
-- SELECT name,
--        admin_access,
--        permissions -> 'manager_chat_view'  AS pode_usar_chat,
--        permissions -> 'manager_chat_train' AS pode_treinar,
--        permissions -> 'manager_chat_audit' AS pode_auditar
-- FROM "SITE_Roles"
-- ORDER BY level DESC;
--
-- -- 7) As colunas de custo existem (inclusive a de ESCRITA de cache)?
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'SITE_ManagerChatMessages'
--   AND column_name IN ('input_tokens', 'output_tokens',
--                       'cache_read_tokens', 'cache_creation_tokens')
-- ORDER BY column_name;
-- ============================================================================
