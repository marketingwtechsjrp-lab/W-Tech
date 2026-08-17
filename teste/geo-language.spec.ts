import { expect, test } from '@playwright/test';

test.describe('Idioma automático por geolocalização', () => {
  test('seleciona português do Brasil para acesso do Brasil', async ({ page }) => {
    await page.route('**/api/geo-language', (route) => route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ country: 'BR', language: 'pt-BR', source: 'ip' }),
    }));

    await page.goto('/quiz-suspensao');
    await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Pare de adivinhar');
  });

  for (const scenario of [
    { country: 'PT', language: 'pt-PT' },
    { country: 'MX', language: 'es' },
    { country: 'US', language: 'en' },
  ] as const) {
    test(`seleciona ${scenario.language} para acesso de ${scenario.country}`, async ({ page }) => {
      await page.route('**/api/geo-language', (route) => route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ country: scenario.country, language: scenario.language, source: 'ip' }),
      }));

      await page.goto('/quiz-suspensao');
      await expect(page.locator('html')).toHaveAttribute('lang', scenario.language);
    });
  }

  test('mantém a escolha manual acima da geolocalização', async ({ page }) => {
    await page.route('**/api/geo-language', (route) => route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ country: 'US', language: 'en', source: 'ip' }),
    }));

    await page.goto('/quiz-suspensao?lang=pt-BR');
    await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Pare de adivinhar');
  });
});
