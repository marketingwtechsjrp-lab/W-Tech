# System Mapping - W-Tech Platform v2.0

Este documento serve como mapeamento técnico e funcional de toda a plataforma W-Tech, detalhando a arquitetura, módulos e fluxos de automação.

## 🏗️ Arquitetura Geral

- **Frontend**: React (Vite) + Tailwind CSS 4.
- **Backend/DB**: Supabase (PostgreSQL + Auth + Storage).
- **Integrações**: Evolution API v2 (WhatsApp), Google Gemini (AI para Blog).
- **Icons**: Lucide React.
- **Animations**: Framer Motion.

---

## 🛠️ Módulos Principais (Painel Admin)

### 1. CRM & Gestão de Leads
- **Arquivo**: `components/admin/CRM/CRMView.tsx`.
- **Funcionalidades**:
    - Funil de Vendas (Kanban) com Drag & Drop.
    - Edição detalhada de leads (Notas, Tags, Atribuição).
    - **Automação de Conversão**: Ao mover um lead para status de 'Ganho' ou 'Matriculado', o sistema abre automaticamente o módulo de Cursos pré-selecionando o aluno.
- **Tabela**: `SITE_Leads`.

### 2. Gestão de Tarefas & Automação WhatsApp
- **Arquivos**: 
    - `components/admin/Tasks/TaskManagerView.tsx` (Gerador de tarefas).
    - `components/admin/CRM/LeadTaskSidebar.tsx` (Sidebar no CRM).
- **Funcionalidades**:
    - Agendamento de tarefas com lembrete.
    - **Disparo Automático de WhatsApp**: Integração com Evolution API v2.
    - Suporte a **Templates**, **Mensagens Manuais** e **Mídia (Upload ou URL)**.
- **Tabela**: `SITE_Tasks`, `SITE_MessageTemplates`.

### 3. Cursos & Eventos
- **Arquivo**: `CoursesManagerView` (dentro de `pages/Admin.tsx`).
- **Funcionalidades**:
    - Criação de cursos presenciais/online.
    - Gestão de matrículas com controle financeiro (Saldo a pagar, Quitação).
    - Impressão de listas de presença e relatórios de alunos.
    - Geocodificação de endereços para o mapa de mecânicos.
- **Tabela**: `SITE_Courses`, `SITE_Enrollments`.
- **Sistema de Lembretes Automatizados**:
    - Disparo automático de WhatsApp para alunos inscritos.
    - Configurável por curso: X dias antes (padrão 5) e Y dias antes (padrão 1).
    - Conteúdo dinâmico: Nome do aluno, cronograma, endereço com link do mapa e "o que levar".

### 4. Blog & Marketing
- **Funcionalidades**:
    - Editor de Blog com geração de conteúdo via Gemini AI.
    - Disparo de Email Marketing para anunciar novos cursos.
- **Tabela**: `SITE_Posts`.

### 5. Configurações & Perfil
- **Arquivo**: `AdminIntegrations.tsx` (Global) e `UserProfileModal.tsx` (Pessoal).
- **Funcionalidades**:
    - Configuração da API Global da Evolution.
    - **Auto-Gerenciamento de Instância**: Cada usuário pode conectar seu próprio WhatsApp no perfil (`UserWhatsAppConnection.tsx`).
    - Gestão de Permissões por cargo (Admin, Gestor, Secretaria, etc).

---

## 📱 Fluxo de Automação WhatsApp (V2)

Atualmente, o sistema utiliza a Evolution API v2 com o seguinte fluxo técnico:

1.  **Agendamento**: A tarefa é salva com `is_whatsapp_schedule: true`.
2.  **Worker**: Um `useEffect` em `Admin.tsx` (`checkScheduledMessages`) verifica a cada 60 segundos por tarefas pendentes para o momento atual.
3.  **Execução**: 
    - O sistema identifica se a mensagem é apenas texto ou possui mídia (`whatsapp_media_url`).
    - Caso possua mídia, envia via JSON incluindo `mediatype: 'image'` e `fileName`.
    - O disparo utiliza a instância pessoal do usuário atribuído à tarefa.
4.  **Status**: A tarefa é marcada como `SENT` ou `FAILED` e movida para `DONE`.

---

## 🗄️ Mapeamento de Banco de Dados

| Tabela | Função |
| :--- | :--- |
| `SITE_Config` | Configurações globais (API Keys, URLs, Logos). |
| `SITE_Leads` | Leads capturados no site ou inseridos manualmente. |
| `SITE_Tasks` | Calendário de tarefas e fila de disparos WhatsApp. |
| `SITE_Courses` | Catálogo de cursos e eventos. |
| `SITE_Enrollments` | Alunos matriculados e status financeiro. |
| `SITE_Transactions` | Registro de entradas financeiras (pagamentos). |
| `SITE_UserIntegrations` | Conexões de WhatsApp individuais por usuário. |
| `SITE_MessageTemplates` | Modelos de mensagens para disparos rápidos. |

---

## 🚀 Últimas Atualizações Implementadas

- **Correção no CRM**: Removido bug que impedia a criação de lead manual (coluna `source` inexistente).
- **Upload de Mídia**: Adicionada funcionalidade de upload direto de imagens para disparos de WhatsApp em todos os módulos (CRM, Gerenciador de Tarefas e Perfil).
- **Evolution API v2 Support**: Implementada conformidade com os novos requisitos da API (mediatype/fileName).
- **Gestão de Perfil**: Usuários agora podem auto-gerenciar suas instâncias de WhatsApp no perfil pessoal.
- **Lembretes de Cursos**: Sistema automático de notificação para alunos via WhatsApp (5 dias e 1 dia antes).

📅 *Última análise realizada em: 08/01/2026*
