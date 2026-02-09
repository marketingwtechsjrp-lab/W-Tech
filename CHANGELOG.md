# Histórico de Atualizações - W-Tech Platform


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
