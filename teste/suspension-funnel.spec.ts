import { expect, test } from '@playwright/test';

const angles = [
  {
    key: 'controle',
    title: 'Controle e confiança Off-Road — Apresentação W-Tech',
    heading: 'Faça a moto trabalhar com você.',
    continuity: 'Etapa 2 de 2 · Seu plano para uma moto previsível',
  },
  {
    key: 'ergonomia',
    title: 'Ergonomia e menos fadiga — Apresentação W-Tech',
    heading: 'Talvez o seu braço não seja o problema.',
    continuity: 'Etapa 2 de 2 · Seu plano para pilotar mais solto',
  },
  {
    key: 'tracao',
    title: 'SAG, cliques e tração — Apresentação W-Tech',
    heading: 'Potência sem regulagem não vira tração.',
    continuity: 'Etapa 2 de 2 · Seu plano para ganhar tração',
  },
] as const;

test.describe('Motor compartilhado do funil de suspensão', () => {
  for (const angle of angles) {
    test(`mantém a promessa de ${angle.key} entre VSL e landing clara`, async ({ page }) => {
      const query = `funnel=vsl_lp&angle=${angle.key}&theme=light&utm_source=teste`;
      await page.goto(`/curso-suspensao-piloto-vsl-clara?${query}`);

      await expect(page).toHaveTitle(angle.title);
      await expect(page.getByRole('heading', { level: 1, name: angle.heading })).toBeVisible();

      await page.evaluate(() => sessionStorage.setItem('wtech_suspensao_vsl_completed', 'true'));
      await page.reload();

      const nextStep = page.getByRole('link', { name: 'Continuar para a inscrição' }).first();
      await expect(nextStep).toHaveAttribute(
        'href',
        new RegExp(`/curso-suspensao-piloto-clara\\?.*angle=${angle.key}.*src=vsl_${angle.key}_light`),
      );

      await page.goto(`/curso-suspensao-piloto-clara?${query}`);
      await expect(page.getByRole('heading', { level: 1, name: angle.heading })).toBeVisible();
      await expect(page.getByText(angle.continuity, { exact: true })).toBeVisible();
    });
  }

  test('infere ergonomia do diagnóstico do quiz e mantém saída direta ao checkout', async ({ page }) => {
    await page.goto('/curso-suspensao-piloto-vsl?from=quiz&quiz_profile=ergonomia&quiz_theme=dark');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Talvez o seu braço não seja o problema.' }),
    ).toBeVisible();

    await page.evaluate(() => sessionStorage.setItem('wtech_suspensao_vsl_completed', 'true'));
    await page.reload();

    const checkout = page.getByRole('link', { name: 'Ir para a inscrição segura' }).first();
    await expect(checkout).toHaveAttribute('href', /^https:\/\/pay\.kiwify\.com\.br\/19v4nIa/);
  });
});
