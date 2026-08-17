import { expect, test } from '@playwright/test';

for (const route of ['/quiz-suspensao', '/quiz-suspensao-clara']) {
  test(`usa a marca W-Tech no carregamento de ${route}`, async ({ page }) => {
    await page.goto(`${route}?lang=pt-BR`);
    await page.getByRole('button', { name: 'Iniciar meu diagnóstico' }).click();
    await page.getByRole('button', { name: /Motocross/ }).click();

    await expect(page.getByRole('img', { name: 'Logo W-Tech em 3D' })).toBeVisible();
    await expect(page.getByText('W-Tech preparando seu resultado')).toBeVisible();
    await expect(page.getByText(/Telemetria W-Tech/i)).toHaveCount(0);
  });
}
