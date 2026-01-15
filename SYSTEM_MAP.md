# Mapa do Sistema W-Tech Platform

**Última Atualização:** 15/01/2026
**Versão Atual:** 2.1.0

Este documento serve como um guia técnico e estrutural para a equipe de desenvolvimento e gestão.

---

## 1. Visão Geral

O sistema é uma plataforma web completa para gestão de cursos, leads (CRM), tarefas e automação de marketing.
**Stack Tecnológica:**
- **Frontend:** React (Vite), TypeScript, Tailwind CSS
- **Backend/Database:** Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **Integrações:** WhatsApp API (Evolution API/Z-API), Pagar.me (pagamentos)

---

## 2. Estrutura de Diretórios

Isso explica onde encontrar cada parte do código.

```
/
├── components/           # Componentes React Reutilizáveis
│   ├── admin/            # [MÓDULO] Painel Administrativo Completo
│   │   ├── CRM/          # Gestão de Leads, Kanban, Funil
│   │   ├── Dashboard/    # KPIs, Gráficos Financeiros
│   │   ├── Tasks/        # Gerenciador de Tarefas e Automação
│   │   ├── Marketing/    # Disparos de Email/WhatsApp
│   │   └── ...           # Outros módulos (Loja, Financeiro, etc)
│   ├── ui/               # Componentes visuais básicos (Botões, Inputs)
│   └── ...
├── pages/                # Páginas principais (Roteamento)
│   ├── Admin.tsx         # [CORE] Layout principal do Admin e Roteador de Módulos
│   ├── Login.tsx         # Tela de Acesso
│   └── ...
├── lib/                  # Utilitários e Configurações
│   ├── supabaseClient.ts # Conexão com Banco de Dados
│   └── ...
└── ...
```

---

## 3. Módulos Principais

### A. Dashboard (`DashboardView.tsx`)
- **Função:** Visão macro do negócio.
- **Dados:** Cruza dados de vendas (Leads convertidos), matrículas reais e despesas.
- **Lógica Financeira:** A Receita é calculada pelo maior valor entre "Matrículas Pagas" e "Vendas no CRM".

### B. CRM & Leads (`CRMView.tsx`)
- **Função:** Pipeline de vendas estilo Kanban.
- **Features:**
  - Arrastar e soltar leads entre colunas.
  - Conversão de leads em Alunos (Matrícula) ou Venda de Produtos.
  - Integração com WhatsApp.
  - Permissões: Gestores veem tudo; Vendedores veem apenas seus leads (ou leads da fila).

### C. Tarefas (`TaskManagerView.tsx`)
- **Função:** Gestão de atividades da equipe.
- **Destaque:** Permite agendar disparos automáticos de WhatsApp vinculados a uma data de vencimento.

### D. Administração (`Admin.tsx`)
- **Função:** "Cérebro" do sistema. Gerencia o menu lateral, autenticação do usuário e carrega as permissões.
- **Permissões:** Sistema baseado em permissões granulares (`hasPermission`), permitindo criar cargos personalizados (Ex: "Editor de Blog" vê apenas Blog, "Financeiro" vê apenas Notas).

---

## 4. Banco de Dados (Supabase)

Tabelas principais:
- `SITE_Users`: Usuários e perfis.
- `SITE_Leads`: Clientes potenciais (CRM).
- `SITE_Tasks`: Tarefas e agendamentos.
- `SITE_Enrollments`: Matrículas em cursos.
- `SITE_Courses`: Catálogo de cursos.
- `SITE_Transactions`: Receitas e Despesas.

---

## 5. Procedimentos Comuns

**Deploy / Atualização (REGRA):**
Sempre utilize o script automatizado para lançar novas versões e manter o histórico atualizado.
1. No terminal, execute: `npm run release`
2. Responda o número da versão (ex: 2.2.0).
3. Descreva as mudanças.
4. O script atualizará automaticamente `package.json`, `CHANGELOG.json`, `CHANGELOG.md` e fará o push para o GitHub com tags.

**Correção de Permissões (RLS):**
- Se houver erro de "Row Level Security" ou upload falhar:
- Executar script `fix_storage_permissions.sql` no SQL Editor do Supabase.
- Se houver erro "permission denied for table users" ao criar listas:
- Executar script `fix_marketing_list_fk.sql`.

