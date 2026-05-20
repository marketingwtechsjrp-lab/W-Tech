import { test, expect } from '@playwright/test';

test.describe('W-TECH Landing Page', () => {
  test('deve carregar a página inicial com o título correto', async ({ page }) => {
    // Acessa a URL base configurada no playwright.config.ts
    await page.goto('/');

    // Verifica o título da página
    await expect(page).toHaveTitle(/W-TECH Brasil | Autoridade em Suspensões/);
  });

  test('deve exibir o elemento principal de conteúdo', async ({ page }) => {
    await page.goto('/');

    // Verifica se o container #root está visível
    const root = page.locator('#root');
    await expect(root).toBeVisible();
  });

  test('deve ter links de navegação funcionando', async ({ page }) => {
    await page.goto('/');

    // Verifica se existe algum link ou botão importante
    // Exemplo: link para "Cursos" ou "Contato" (ajuste conforme seu menu)
    // const cursosLink = page.getByRole('link', { name: /cursos/i });
    // await expect(cursosLink).toBeVisible();
  });
});
