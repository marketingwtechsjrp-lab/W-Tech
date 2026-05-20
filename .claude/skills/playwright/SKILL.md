---
name: playwright
description: Skill abrangente para automação de testes E2E com Playwright. Suporta criação, execução e depuração de testes, integração com CI/CD e visualização de relatórios.
license: MIT
---

# PLAYWRIGHT TESTING SKILL
> Skill definitiva para automação de testes, web scraping e garantia de qualidade (QA) utilizando Playwright.

---

## O QUE É ESTA SKILL

Playwright é a ferramenta moderna de testes de ponta a ponta (E2E) que permite testar aplicações em todos os navegadores modernos (Chromium, Firefox, WebKit). Esta skill orienta o agente na criação de testes robustos, performáticos e "self-healing".

**Quando usar esta skill:**
- Validar fluxos críticos do sistema (Login, Checkout, Cadastro).
- Testar responsividade e compatibilidade entre browsers.
- Realizar auditorias de performance e acessibilidade via automação.
- Depurar erros de interface que só ocorrem em produção.
- Garantir que novas funcionalidades não quebrem as antigas (Regressão).

---

## INSTALAÇÃO E SETUP

### 1. Instalação no Projeto
```bash
# Se o projeto já tem package.json
npm init playwright@latest
```
*Durante o setup, escolha as opções padrão (TypeScript, testes na pasta `tests`, GitHub Actions: Yes).*

### 2. Comandos Principais
```bash
npx playwright test          # Executa todos os testes
npx playwright test --ui     # Abre a interface visual (Modo Recomendado)
npx playwright test --debug  # Executa passo a passo (Inspector)
npx playwright test --project=chromium  # Executa apenas no Chrome
npx playwright show-report   # Abre o relatório do último teste
```

---

## PADRÕES DE ESCRITA DE TESTES (BEST PRACTICES)

### 1. Estrutura Básica de um Teste
```typescript
import { test, expect } from '@playwright/test';

test('deve realizar login com sucesso', async ({ page }) => {
  await page.goto('https://meu-sistema.com/login');
  
  // Use Locators amigáveis (Acessibilidade)
  await page.getByLabel('E-mail').fill('usuario@teste.com');
  await page.getByLabel('Senha').fill('senha123');
  await page.getByRole('button', { name: 'Entrar' }).click();

  // Asserções robustas
  await expect(page).toHaveURL(/.*dashboard/);
  await expect(page.getByText('Bem-vindo')).toBeVisible();
});
```

### 2. Page Object Model (POM) — Recomendado para Projetos Grandes
Sempre que o sistema for complexo, organize os seletores e ações em classes.

```typescript
// pages/LoginPage.ts
export class LoginPage {
  constructor(private page: Page) {}

  async navigate() {
    await this.page.goto('/login');
  }

  async login(user: string, pass: string) {
    await this.page.getByLabel('E-mail').fill(user);
    await this.page.getByLabel('Senha').fill(pass);
    await this.page.getByRole('button', { name: 'Entrar' }).click();
  }
}
```

---

## TRICKS E DICAS AVANÇADAS

### 1. Autenticação Reutilizável (Storage State)
Evite logar em cada teste. Salve o estado da sessão.
```typescript
// No playwright.config.ts
export default defineConfig({
  projects: [
    {
      name: 'setup',
      testMatch: /global\.setup\.ts/,
    },
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
    },
  ],
});
```

### 2. Interceptação de API (Mocking)
Teste a interface sem depender do backend real.
```typescript
await page.route('**/api/users', async route => {
  const json = [{ id: 1, name: 'Usuário Mock' }];
  await route.fulfill({ json });
});
```

### 3. Screenshots e Vídeos (Debugging)
Configure no `playwright.config.ts`:
```typescript
use: {
  screenshot: 'only-on-failure',
  video: 'retain-on-failure',
  trace: 'on-first-retry',
},
```

---

## COMO O AGENTE DEVE ATUAR

Quando o usuário pedir para "testar o sistema" ou "verificar se está funcionando":

1. **Reconhecimento**: Verifique se o Playwright está instalado (`ls tests` ou verifique `package.json`).
2. **Execução**: Rode `npx playwright test`.
3. **Análise**: Se falhar, use `npx playwright show-report` para entender o erro ou peça ao usuário para abrir o modo UI.
4. **Criação**: Se não houver testes, sugira criar um teste crítico (ex: login) seguindo o padrão POM.
5. **Correção**: Se um teste falhar por mudança de UI, atualize os seletores usando `getByRole` ou `getByText` (locators robustos).

---

## CHECKLIST DE QUALIDADE

```
□ Playwright instalado e atualizado
□ Testes críticos mapeados (Caminho Feliz)
□ Uso de Locators robustos (evite IDs dinâmicos e CSS complexo)
□ Relatórios (HTML Report) configurados
□ Integração com CI (GitHub Actions) ativa
□ Screenshots habilitados em falhas
```

---
*Skill criada para automação de alta performance. Playwright documentation: playwright.dev*
