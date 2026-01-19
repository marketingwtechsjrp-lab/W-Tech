# Histórico de Atualizações - W-Tech Platform

<<<<<<< HEAD
## v2.3.0 (2026-01-19) - Sistema de Notificações de Conversão (Prova Social)
- FEAT: Sistema de popups aleatórios de inscrição para Landing Pages
- FEAT: Toggle de controle (ON/OFF) integrado no Editor de Landing Pages
- FEAT: Componente FakeSignupAlert com 30 nomes e cidades brasileiras
- FEAT: Configuração dinâmica por curso e cronômetro inteligente (10-15s)
- DB: Nova coluna fake_alerts_enabled na tabela SITE_LandingPages

=======

## v2.3.3 (2026-01-17) - Fix Partners Display
- Fixed partner brands parsing logic in Hero section

## v2.3.2 (2026-01-17) - Release v2.3.2
- General system updates
- Release automation

## v2.3.1 (2026-01-17) - Correções e Documentação Técnica
- FIX: Script SQL para correção de permissões em listas de marketing
- FEAT: Documentação técnica completa do sistema de automação WhatsApp
- FIX: Ajustes de permissões RLS no banco de dados
>>>>>>> 1c7594a07002a0dd6909840dcffb82e52986a3c9
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
