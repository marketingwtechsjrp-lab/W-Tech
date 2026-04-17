# CODEBASE.md — W-Tech Experience Portal

> **AI Context File** — Lido automaticamente pelo Antigravity/Gemini antes de qualquer edição.  
> Atualizar sempre que houver mudanças estruturais significativas.

---

## 🖥️ OS

**macOS** (Apple Silicon)  
Terminal: zsh  
Package manager: npm  

---

## 🏗️ Tech Stack

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| Framework | React | 19 |
| Build | Vite | latest |
| Linguagem | TypeScript | ESNext |
| Estilização | Tailwind CSS | v4 |
| Animações | Framer Motion | ^11 |
| Backend/BaaS | Supabase | 2.39.3 |
| Auth | Supabase Auth | — |
| Roteamento | React Router DOM | ^7 |
| Ícones | Lucide React | ^0.556 |
| Gráficos | Recharts + ApexCharts | — |
| Pagamentos | Stripe + Asaas + Mercado Pago | — |
| IA | Google Gemini (`@google/genai`) | ^1.31 |
| Mapas | Leaflet | 1.9.4 |
| UI Primitivos | Radix UI | — |
| Variantes CSS | class-variance-authority (CVA) | — |
| Deploy | Vercel | — |

---

## 📦 Comandos

```bash
npm run dev        # Vite dev server :3000
npm run build      # Build + sitemap
npm run preview    # Preview build
npm run release    # Bump version + changelog + git push
```

---

## 📂 Estrutura de Arquivos (Críticos)

```
/
├── App.tsx                    # Router raiz — lazy-loads todas as páginas
├── index.tsx                  # Entry point React
├── index.html                 # importmap para ESM browser (aistudiocdn.com)
├── index.css                  # Tokens CSS globais + Design System Admin
├── tailwind.config.js         # Tokens Tailwind + aliases wtech.*
├── types.ts                   # Todos os tipos globais (Lead, Course, Order…)
├── constants.ts               # Constantes globais
│
├── pages/
│   ├── Admin.tsx              # ⚠️ MONOLITO ~2500 linhas — painel admin completo
│   ├── Home.tsx               # Landing page principal
│   ├── Courses.tsx            # Página pública de cursos
│   ├── CourseDetail.tsx       # Detalhe de curso público
│   ├── Checkout.tsx           # Checkout de produtos
│   ├── CourseCheckout.tsx     # Checkout de cursos
│   ├── Blog.tsx / BlogPost.tsx
│   ├── LPErgonomia.tsx        # Landing page ergonomia
│   ├── LPEuropa.tsx           # LP Europa
│   ├── LPWTechLisboa.tsx      # LP Lisboa
│   └── auth/                  # Login, registro
│
├── components/
│   ├── admin/
│   │   ├── AdminSidebar.tsx   # Sidebar com grupos de navegação (Fase 1 redesign)
│   │   ├── Dashboard/
│   │   │   └── DashboardView.tsx  # KPI cards + gráficos Recharts
│   │   ├── CRM/
│   │   │   ├── CRMView.tsx        # Kanban + Stats Bar (Fase 3 redesign)
│   │   │   └── LeadTaskSidebar.tsx
│   │   ├── Courses/
│   │   │   └── CreativeHub.tsx    # Studio de criação de conteúdo IA
│   │   ├── Catalog/               # Pedidos, produtos, estoque
│   │   ├── Financial/             # Financeiro e transações
│   │   ├── Marketing/             # Campanhas e email marketing
│   │   ├── Analytics/             # Relatórios analíticos
│   │   ├── Tasks/                 # Gerenciamento de tarefas
│   │   ├── Clients/               # Gestão de clientes
│   │   ├── Settings/              # Configurações do sistema
│   │   ├── Intelligence/          # W-Intelligence (IA)
│   │   ├── Certificates/          # Geração de certificados
│   │   ├── WhatsApp/              # Integração WhatsApp
│   │   └── Blog/                  # Blog admin
│   └── ui/                        # Design System base (botões, inputs, modais)
│
├── context/
│   ├── AuthContext.tsx        # useAuth() — usuário logado e permissões
│   ├── CartContext.tsx        # useCart() — carrinho de compras
│   └── SettingsContext.tsx    # useSettings() — config global do site
│
├── lib/
│   ├── supabaseClient.ts      # Cliente Supabase configurado
│   ├── whatsapp.ts            # Evolution API v2
│   ├── stripe.ts              # Stripe payment links
│   ├── asaas.ts               # Asaas cobranças
│   ├── mercadopago.ts         # Mercado Pago
│   ├── currency.ts            # Conversão BRL/EUR/USD
│   ├── ai.ts                  # Gemini AI helpers
│   └── utils.ts               # Utilitários gerais
│
└── supabase/                  # Configurações backend
    └── functions/             # Edge functions (webhooks)
```

---

## 🗄️ Tabelas Supabase (Principais)

| Tabela | Propósito |
|--------|-----------|
| `SITE_Users` | Perfis, roles e permissões granulares |
| `SITE_Leads` | CRM — contatos e funil de vendas |
| `SITE_Tasks` | Tarefas + fila de agendamento WhatsApp |
| `SITE_Courses` | Cursos e eventos (data, local, vagas, preço) |
| `SITE_Enrollments` | Vínculo aluno↔curso + controle financeiro |
| `SITE_Transactions` | Fluxo de caixa (entradas e saídas) |
| `SITE_Config` | Variáveis globais (cotação EUR, taxas) |
| `SITE_Products` | Catálogo de produtos |
| `SITE_Orders` | Pedidos de produtos |
| `SITE_LandingPages` | LPs dinâmicas (editor visual) |
| `SITE_Mechanics` | Rede de mecânicos credenciados |
| `SITE_Blog` | Posts do blog |

---

## 🎨 Design System — Admin Tokens

### CSS Custom Properties (`index.css`)

```css
/* Surfaces — Light */
--admin-surface-1: #FFFFFF;      /* bg de cards e painéis */
--admin-surface-2: #F8F9FA;      /* bg de seções */
--admin-surface-3: #F0F2F5;      /* bg de inputs/tags */

/* Borders */
--admin-border: #E5E7EB;
--admin-border-subtle: rgba(0,0,0,0.04);

/* Text */
--admin-text-primary: #111827;
--admin-text-secondary: #6B7280;
--admin-text-tertiary: #9CA3AF;

/* Sidebar */
--admin-sidebar-bg: #0A0A0A;
--admin-sidebar-text: #9CA3AF;
--admin-sidebar-item-hover: rgba(255,255,255,0.05);
--admin-sidebar-divider: rgba(255,255,255,0.06);
--admin-sidebar-group-label: rgba(255,255,255,0.30);

/* Brand */
--admin-accent-gold: #D4AF37;
--admin-accent-gold-muted: rgba(212,175,55,0.12);

/* Semantic */
--admin-success: #10B981;   --admin-success-muted: rgba(16,185,129,0.10);
--admin-danger: #EF4444;    --admin-danger-muted: rgba(239,68,68,0.10);
--admin-warning: #F59E0B;   --admin-warning-muted: rgba(245,158,11,0.10);
--admin-info: #3B82F6;      --admin-info-muted: rgba(59,130,246,0.10);

/* Layout */
--admin-card-radius: 1rem;
--admin-sidebar-width: 256px;
--admin-sidebar-collapsed: 72px;

/* Dark Mode overrides (.dark) */
--admin-surface-1: #161616;
--admin-surface-2: #111111;
--admin-surface-3: #1A1A1A;
--admin-border: rgba(255,255,255,0.08);
--admin-text-primary: #F9FAFB;
```

### Padrões de Uso

```tsx
// Superfícies
className="bg-[var(--admin-surface-1)] border border-[var(--admin-border)]"
className="bg-[var(--admin-surface-2)]"
className="bg-[var(--admin-surface-3)]"

// Textos
className="text-[var(--admin-text-primary)]"
className="text-[var(--admin-text-secondary)]"
className="text-[var(--admin-text-tertiary)]"

// Botão primário (gold gradient)
className="bg-gradient-to-r from-wtech-gold to-yellow-600 text-black font-bold shadow-md shadow-yellow-500/20 hover:scale-[1.02] active:scale-95"

// Cards arredondados
className="rounded-2xl"   // 1rem — padrão admin

// PROIBIDO — não usar classes hardcoded de dark mode:
❌ dark:bg-[#1A1A1A]   →   ✅ bg-[var(--admin-surface-3)]
❌ dark:border-white/10  →  ✅ border-[var(--admin-border)]
```

---

## 🔐 Sistema de Permissões (Admin)

```tsx
// Cada usuário tem um array de permissões em SITE_Users.permissions
const hasPermission = (key: string) => user?.permissions?.includes(key);

// Permissões principais:
// 'dashboard_view', 'crm_view', 'tasks_view', 'clients_view'
// 'orders_view', 'courses_view', 'catalog_view', 'invoices_view'
// 'financial_view', 'marketing_view', 'intelligence_view'
// 'accredited_view', 'manage_users', 'manage_settings'
```

---

## 🧭 Navegação Admin (AdminSidebar.tsx)

Grupos de navegação com `NAV_GROUPS`:
- **Core**: Dashboard
- **Operacional**: CRM, Tarefas, Clientes, Rede Credenciada
- **Vendas**: Pedidos, Cursos & Alunos, Catálogo, Notas Fiscais, Financeiro
- **Marketing**: Campanhas, Marketing Hub, W-Intelligence
- **Sistema**: Equipe & Acesso, Configurações

---

## 📦 Dependências Críticas de Arquivo

| Arquivo | Depende de | Usado por |
|---------|-----------|-----------|
| `pages/Admin.tsx` | `components/admin/*`, `types.ts`, `lib/*`, `context/AuthContext` | App.tsx |
| `components/admin/AdminSidebar.tsx` | `types.ts`, lucide-react | Admin.tsx |
| `components/admin/Dashboard/DashboardView.tsx` | `lib/supabaseClient`, `context/AuthContext` | Admin.tsx |
| `components/admin/CRM/CRMView.tsx` | `lib/supabaseClient`, `types.ts` | Admin.tsx |
| `context/AuthContext.tsx` | `lib/supabaseClient` | App.tsx, todos os módulos admin |
| `lib/supabaseClient.ts` | `.env` (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) | tudo |
| `types.ts` | — | tudo |
| `index.css` | — | index.html |
| `tailwind.config.js` | `index.css` | build Vite |

---

## 🔑 Variáveis de Ambiente (`.env`)

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
GEMINI_API_KEY=...
VITE_STRIPE_PUBLISHABLE_KEY=...
VITE_ASAAS_API_KEY=...
```

---

## 📐 Padrões de Código

### Componentes React
```tsx
// Padrão de componente admin
const MeuModuloView = () => {
  const { user } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // fetch do supabase
  }, []);

  return (
    <div className="p-6 space-y-6">
      {/* header */}
      {/* stats bar */}
      {/* content */}
    </div>
  );
};
```

### Stats Bar (padrão CRM/Cursos)
```tsx
// Cards clicáveis de filtro — padrão adotado em CRM e Courses
const stats = [
  { key: 'status_value', label: 'Label', count: 0, icon: Icon,
    accent: 'text-blue-500', ring: 'ring-blue-500', bg: 'bg-blue-500/10' }
];
// grid grid-cols-N gap-3 mb-4
// botão com ring-2 ring-offset-1 quando ativo
```

### Supabase Query
```tsx
const { data, error } = await supabase
  .from('SITE_TableName')
  .select('*')
  .order('created_at', { ascending: false });
```

---

## 🚀 Módulos Admin — Estado de Redesign

| Módulo | Arquivo | Estado |
|--------|---------|--------|
| Sidebar | `AdminSidebar.tsx` | ✅ Redesenhado (Fase 1) |
| Dashboard | `DashboardView.tsx` | ✅ Tokens aplicados (Fase 2) |
| CRM | `CRMView.tsx` | ✅ Stats Bar + Tokens (Fase 3) |
| Cursos | em `Admin.tsx` | ✅ Stats Bar + Cards Grid (Fase 3) |
| Financeiro | em `Admin.tsx` | ⏳ Pendente tokenização |
| Catálogo | em `Admin.tsx` | ⏳ Pendente tokenização |
| Demais | em `Admin.tsx` | ⏳ Pendente |

---

## ⚠️ Armadilhas Conhecidas

1. **`Admin.tsx` é um monolito** (~2500 linhas). Ao editar, buscar pelo nome da função/componente antes de assumir a linha.
2. **Tailwind v4** — sintaxe ligeiramente diferente do v3. Usar `bg-[var(--token)]` para CSS vars.
3. **`importmap` em `index.html`** — usado pelo ambiente browser-native (Antigravity preview). Pacotes não listados no importmap não resolvem no preview.
4. **Dark mode** — usa classe `.dark` no `<html>`, não `prefers-color-scheme`. Toggle manual via `SettingsContext`.
5. **Permissões** — sempre checar `hasPermission()` antes de renderizar módulos admin sensíveis.
6. **Supabase RLS** — todas as tabelas têm Row Level Security. Erros de permissão são silenciosos no front (retornam array vazio).

---

*Última atualização: Abril/2026 — versão 3.0.2*
