import { expect, test } from '@playwright/test';

test.describe('Glossário técnico', () => {
  test('lista os verbetes e permite abrir uma definição', async ({ page }) => {
    await page.goto('/glossario');

    await expect(page.getByRole('heading', { level: 1, name: 'Glossário Técnico' })).toBeVisible();
    await expect(page.getByRole('searchbox', { name: 'Pesquisar termo, categoria ou assunto…' })).toBeVisible();

    const rebound = page.getByRole('link', { name: /Rebound \(Retorno\)/ });
    await expect(rebound).toBeVisible();
    await rebound.click();

    await expect(page).toHaveURL(/\/glossario\/rebound-retorno/);
    await expect(page.getByRole('heading', { level: 1, name: 'Rebound (Retorno)' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Voltar ao glossário' })).toBeVisible();
  });
});
