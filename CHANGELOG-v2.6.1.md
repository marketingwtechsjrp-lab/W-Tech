# Changelog - v2.6.1

## 🚀 Release v2.6.1 - Melhorias no Sistema de Pedidos e Portal do Cliente
**Data:** 28/01/2026

---

## ✨ Novos Recursos

### 📊 Dashboard Analítico de Vendas
- **Métricas por Status**: 7 cards detalhados mostrando quantidade e valor total para cada etapa do funil
  - Pendente, Negociação, Aprovado, Pago, Produção, Enviado, Entregue
- **Filtros Clicáveis**: Cards interativos que filtram automaticamente os pedidos ao clicar
- **Visualização Financeira**: Valores formatados em milhares (ex: R$ 31.5k)
- **Design Responsivo**: Adapta-se de 2 colunas (mobile) até 7 colunas (desktop)

### 📅 Filtros Temporais
- **Hoje**: Visualização de pedidos criados hoje
- **Últimos 7 dias**: Pedidos da última semana
- **Últimos 30 dias**: Pedidos do último mês
- **Período Customizado**: Seleção de data inicial e final com calendários
- **Todos os Períodos**: Visualização completa (padrão)

### 🗑️ Exclusão de Pedidos
- **Botão no Modal**: Ícone de lixeira no cabeçalho do modal de pedidos
- **Confirmação de Segurança**: Diálogo de confirmação antes da exclusão
- **Limpeza Completa**: Remove pedido, itens relacionados e movimentações de estoque

### 🔄 Atualização em Tempo Real
- **Botão de Refresh no Portal**: Ícone no header do portal do cliente
- **Animação de Loading**: Rotação do ícone durante carregamento
- **Sincronização Automática**: Atualiza pedidos e matrículas

### 🎯 Acesso Rápido ao Portal
- **Botão no Hero**: "Área do Cliente" substituindo "Ver Agenda"
- **Botão no Header**: Acesso direto ao portal de pedidos
- **Link Correto**: Redirecionamento para `/meus-pedidos`

---

## 🔧 Correções e Melhorias

### 🔗 Sincronização de Dados
- **Fallback Inteligente**: Admin agora lê itens da coluna JSON quando `SITE_SaleItems` está vazia
- **Pedidos de Cursos**: Matrículas agora aparecem corretamente no painel administrativo
- **Nome do Curso**: Exibição correta como "Inscrição: [Nome do Curso]"

### 🎨 Interface do Usuário
- **Cards de Status**: Design moderno com ícones coloridos e hover animado
- **Filtros Aprimorados**: Layout flex-wrap para melhor responsividade
- **Modo Escuro**: Suporte completo em todos os novos componentes

---

## 📝 Alterações Técnicas

### Arquivos Modificados
- `components/admin/Catalog/SalesManagerView.tsx`
  - Adicionados filtros temporais (dateFilter, customStartDate, customEndDate)
  - Implementado dashboard com métricas por status
  - Integrada função de exclusão de pedidos
  
- `components/admin/Catalog/NewOrderModal.tsx`
  - Adicionado prop `onDelete`
  - Implementado botão de exclusão no header
  - Função `handleDelete` com confirmação

- `pages/meus-pedidos.tsx`
  - Adicionado ícone `RefreshCcw` no header
  - Botão de atualização manual de pedidos e matrículas

- `components/HeroScrollAnimation.tsx`
  - Alterado botão de "Ver Agenda" para "Área do Cliente"
  - Link atualizado para `/meus-pedidos`

- `components/ui/header-2.tsx`
  - Botão do header atualizado para "Área do Cliente"
  - Link corrigido para `/meus-pedidos`

- `package.json`
  - Versão atualizada de 2.5.0 para 2.6.1

---

## 🎯 Impacto nos Usuários

### Para Administradores
- ✅ Visão financeira completa do funil de vendas
- ✅ Filtros temporais para análise de períodos específicos
- ✅ Exclusão rápida de pedidos diretamente do modal
- ✅ Visualização correta de pedidos de cursos

### Para Clientes
- ✅ Acesso direto ao portal pela homepage
- ✅ Botão de atualização para ver mudanças de status em tempo real
- ✅ Interface mais intuitiva e acessível

---

## 📊 Estatísticas do Release
- **Arquivos Modificados**: 6
- **Linhas Adicionadas**: ~250
- **Linhas Removidas**: ~50
- **Novos Componentes**: 1 (Dashboard de Métricas)
- **Novas Funcionalidades**: 5

---

## 🔜 Próximos Passos
- Implementar gráficos visuais (charts) para análise de tendências
- Adicionar exportação de relatórios em PDF
- Notificações push para mudanças de status
- Integração com WhatsApp para atualizações automáticas

---

**Desenvolvido por:** W-Tech Brasil  
**Versão Anterior:** v2.5.0  
**Versão Atual:** v2.6.1
