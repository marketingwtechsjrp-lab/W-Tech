# Histórico de Atualizações - W-Tech Platform


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
