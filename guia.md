# 📘 Guia Completo do Sistema W-Tech Platform

**Última Atualização:** 16/04/2026
**Versão:** 3.0.2 (Baseada no `package.json`)

Este documento serve como a "Fonte de Verdade" para o funcionamento, arquitetura e manutenção de toda a plataforma W-Tech.

---

## 🏗️ 1. Arquitetura e Stack Tecnológica

A plataforma é construída sobre uma arquitetura moderna e escalável:

- **Frontend**: React 19 (Vite)
- **Linguagem**: TypeScript
- **Estilização**: Tailwind CSS v4 + Framer Motion (animações)
- **Backend / BaaS**: Supabase
  - **Database**: PostgreSQL
  - **Auth**: Supabase Auth (com suporte a papéis granulares)
  - **Storage**: Armazenamento de mídias e documentos
  - **Edge Functions**: Lógica serverless (Stripe Webhooks, etc.)
- **Integrações de Terceiros**:
  - **WhatsApp**: Evolution API v2 (Instâncias individuais por usuário)
  - **Pagamentos**: Stripe e Asaas
  - **Inteligência Artificial**: Google Gemini (Geração de conteúdo para Blog)
  - **Mapas**: Leaflet (Mapa de Mecânicos Especializados)

---

## 📂 2. Estrutura de Pastas

```text
/
├── .agent/               # Configurações e workflows do Assistente AI (Antigravity)
├── components/           # Componentes React Reutilizáveis
│   ├── admin/            # [MÓDULO ADMIN] Todo o painel de controle
│   │   ├── CRM/          # Kanban, Leads, Sidebar de tarefas
│   │   ├── Tasks/        # Gerenciador de tarefas e automação WhatsApp
│   │   ├── Catalog/      # Pedidos, Vendas, Estoque e Produtos
│   │   └── Analytics/    # Dashboards e métricas
│   └── ui/               # Componentes de Design System (Botões, Inputs, Modais)
├── pages/                # Roteamento e Páginas Principais
│   ├── Admin.tsx         # Layout mestre do Painel Administrativo
│   ├── Home.tsx          # Landing Page principal
│   └── ...               # LPs específicas (Lisboa, Ergonomia, etc.)
├── lib/                  # Núcleo de Lógica e Clientes de API
│   ├── supabaseClient.ts # Cliente Supabase configurado
│   ├── whatsapp.ts       # Funções de integração com Evolution API
│   ├── currency.ts       # Utilitários de conversão monetária
│   └── ...
├── context/              # Fluxo de dados global (Auth, Cart, Settings)
├── supabase/             # Configurações do backend (Migrations, Functions)
├── scripts/              # Scripts de automação (Deploy, Sitemap)
└── guia.md               # Este documento (Mapa do Sistema)
```

---

## 🛠️ 3. Módulos e Funcionamento

### A. CRM & Gestão de Leads (`components/admin/CRM`)
- **Fluxo**: Entrada automática via site -> Funil Kanban -> Qualificação -> Venda.
- **Diferencial**: Ao converter um lead, o sistema permite matricular o aluno instantaneamente em um curso, integrando o CRM com o módulo de Vendas/Cursos.

### B. Automação WhatsApp (`lib/whatsapp.ts` & `Admin.tsx`)
- **Funcionamento**: O sistema verifica tarefas agendadas (`is_whatsapp_schedule`) a cada minuto.
- **Mídia**: Suporta envio de imagens/PDFs via URL ou Base64.
- **Multitenancy**: Cada administrador/vendedor pode ter sua própria instância do WhatsApp conectada, e o sistema utiliza a instância do "Dono da Tarefa" para o disparo.

### C. Catálogo & Vendas (`components/admin/Catalog`)
- **Gestão de Pedidos**: Criação de pedidos com suporte a múltiplas moedas (BRL, EUR, USD).
- **Stripe Integration**: Geração de links de pagamento dinâmicos diretamente da tela de pedidos.

### D. Blog com IA (`pages/Blog.tsx`)
- **Prompting**: Utiliza o Google Gemini para auxiliar na escrita de artigos focados em mecânica e performance de suspensões.

---

## 🗄️ 4. Modelagem de Dados (Tabelas-Chave)

| Tabela | Responsabilidade |
| :--- | :--- |
| `SITE_Users` | Perfis e permissões granulares de acesso. |
| `SITE_Leads` | Armazena todos os contatos e status no funil de vendas. |
| `SITE_Tasks` | Tarefas e fila de agendamento de mensagens. |
| `SITE_Courses` | Cadastro de cursos, datas e localizações. |
| `SITE_Enrollments`| Vínculo Aluno-Curso com controle financeiro (saldo). |
| `SITE_Transactions`| Registro de fluxo de caixa (entradas e saídas). |
| `SITE_Config` | Variáveis globais (ex: valor da Euro, Taxas Asaas). |

---

## 📜 5. Regras de Manutenção e Atualização

### 🔄 Regra de Sincronização GitHub (Automática)
Para garantir que este guia nunca fique desatualizado, o sistema possui uma **GitHub Action** que:
1. Em cada `push` para o repositório, analisa o resumo das alterações.
2. Atualiza a seção "Histórico de Manutenção" abaixo.
3. Garante que qualquer nova pasta ou módulo importante seja documentado.

### 🚀 Processo de Deploy
Sempre prefira o comando:
```bash
npm run release
```
Este comando executa o script `scripts/deploy-update.js`, que:
- Incrementa a versão no `package.json`.
- Atualiza o `CHANGELOG.json` e `CHANGELOG.md`.
- Realiza o `git commit` e `git push` com as tags corretas.
- Aciona a atualização automática deste `guia.md`.

---

## 📝 6. Histórico de Manutenção (Últimas 5 Modificações)

- **13/04/2026**: Criação do `guia.md` e implementação da Regra de Atualização Automática via GitHub Actions.
- **10/04/2026**: Unificação das tabelas de alunos e clientes para evitar duplicidade de dados.
- **08/04/2026**: Implementação de suporte a múltiplas moedas no checkout e links de pagamento Stripe.
- **05/04/2026**: Atualização da Evolution API para v2, suportando instâncias individuais por perfil.
- **01/04/2026**: Lançamento do Dashboard Financeiro em tempo real com KPIs de conversão.

---

*W-Tech Experience - Transformando a gestão em performance.*
