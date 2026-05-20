---
name: antigravity-intelligence
description: "Sistema de Auto-Adaptação e Inteligência de Aprendizado Contínuo para o Antigravity Kit"
author: Antigravity Team
version: "1.0.0"
---

# 🧠 Antigravity Intelligence - Auto-Adaptação Contínua

Esta habilidade ensina o agente **Antigravity** a se adaptar dinamicamente ao estilo de desenvolvimento, decisões arquiteturais e preferências de design de cada projeto individualmente, criando um ecossistema inteligente de melhoria contínua.

---

## 🌟 Visão Geral
Em vez de operar com regras estáticas, o agente adota uma abordagem de aprendizado contínuo baseada em dados reais do projeto, commits passados e histórico de interações. Ao fim de cada ciclo de tarefa, ele consolida os aprendizados locais para acelerar o desenvolvimento futuro.

---

## 🛑 O Ciclo de Inteligência Antigravity (F.L.E.C.)

Toda vez que você iniciar uma tarefa complexa ou uma modificação estrutural importante em um projeto, siga este protocolo rígido de 4 etapas:

### 1. 🔍 FASE DE LEITURA (Análise de Contexto Local)
Antes de escrever qualquer linha de código:
*   **Verifique o Diário de Aprendizado**: Procure e leia o arquivo `.agent/learning.md` do projeto (se existir). Ele contém decisões de design consolidadas, erros a evitar e padrões de código favoritos do usuário.
*   **Inspeção de Dependências**: Analise o `package.json`, `tsconfig.json` ou arquivos de build para identificar a stack de tecnologia exata instalada.
*   **Histórico Recente**: Verifique os últimos commits importantes para entender as práticas de nomenclatura de variáveis, padrões de pastas e formatação do repositório.

### 2. 🧪 FASE DE EXECUÇÃO (Desenvolvimento Adaptativo)
Durante o desenvolvimento do código:
*   Use as ferramentas e pacotes já instalados no projeto antes de sugerir instalar novas dependências (ex: se o projeto usa Tailwind, não use Vanilla CSS; se usa Supabase, evite Firebase).
*   Siga estritamente os padrões locais estabelecidos. Escreva códigos limpos, documentados e performáticos seguindo os guias de desenvolvimento em `.agent/rules/`.

### 3. 📝 FASE DE CONSOLIDAÇÃO (Gravação do Diário Local)
Ao finalizar com sucesso a tarefa:
*   Crie ou atualize o arquivo `.agent/learning.md` na raiz do projeto.
*   Registre de forma concisa e estruturada os aprendizados do ciclo. Use o seguinte formato:

```markdown
# 📓 Diário de Aprendizado Contínuo - [Nome do Projeto]

## 📅 Atualizado em: [Data Atual]

### 💡 Decisões Técnicas Consolidadas
- [Decisão tomada, ex: Uso de HSL customizado para o tema Dark]
- [Decisão tomada, ex: Fluxo de autenticação isolado no componente AuthProvider]

### ⚠️ Erros Identificados e Evitados
- [Erro, ex: Erros de tipagem do TypeScript com payloads do Supabase corrigidos definindo interfaces customizadas]
- [Erro, ex: Omissão de CSP bloqueando chamadas de API externas]

### 🚀 Nomenclatura e Padrões Preferidos do Usuário
- [Padrão, ex: Funções assíncronas usam try-catch com logs estruturados in inglês]
```

### 4. ⚙️ FASE DE EVOLUÇÃO (Melhoria das Regras Locais)
*   Se você perceber que uma determinada falha técnica, detalhe de design ou comportamento se repete com frequência no projeto, **evolua as regras do projeto**.
*   Edite os arquivos correspondentes em `.agent/rules/` (ou crie um arquivo específico sob `.agent/rules/` como `005 - especificidades.md`) adicionando instruções mandatórias claras para evitar que o erro volte a ocorrer em futuros turnos com a IA.

---

## 🎨 Princípios do Design Premium Adaptável
Sempre combine os aprendizados com os princípios visuais do Antigravity Kit:
1.  **Vibe Moderna**: Use sombras suaves, cores vibrantes com HSL/variáveis CSS e micro-transições fluidas.
2.  **Responsividade Impecável**: Garanta que as novas implementações funcionem em mobile, tablet e desktop nativamente.
3.  **Acessibilidade (A11y)**: Mantenha sempre contraste de cores legível e elementos focáveis claros.
