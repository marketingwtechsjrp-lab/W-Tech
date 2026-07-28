import { expect, test } from '@playwright/test';

test.describe('Imagens editoriais do blog e sede', () => {
  test('usa somente a biblioteca local nas capas do blog', async ({ page }) => {
    await page.goto('/blog');

    await expect(page.locator('img[src*="/images/blog/"]').first()).toBeVisible();

    const sources = await page.locator('img[src*="/images/blog/"]').evaluateAll(images =>
      images.map(image => (image as HTMLImageElement).getAttribute('src'))
    );

    expect(sources.length).toBeGreaterThan(0);
    expect(sources.every(source => source?.startsWith('/images/blog/'))).toBeTruthy();
  });

  test('normaliza também a imagem interna de artigo importado', async ({ page }) => {
    await page.goto('/blog/como-ajustar-suspensao-motocross-3');

    await expect(page.locator('header img[src*="/images/blog/"]')).toBeVisible();
    const embedded = page.locator('article .prose img');
    await expect(embedded).toHaveCount(1);
    await expect(embedded).toHaveAttribute('src', /^\/images\/blog\//);
  });

  test('mantém a fachada oficial na área da sede', async ({ page }) => {
    await page.goto('/');

    const headquarters = page.getByAltText('Fachada da sede da W-Tech Brasil em São José do Rio Preto');
    await expect(headquarters).toBeVisible();
    await expect(headquarters).toHaveAttribute(
      'src',
      'https://w-techstore.com.br/wp-content/uploads/2024/02/WhatsApp-Image-2022-12-04-at-16.56.52-25-e1715343402705.jpeg'
    );
  });
});
