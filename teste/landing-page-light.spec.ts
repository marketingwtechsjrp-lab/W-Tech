import { expect, test } from '@playwright/test';

test.describe('Landing page clara VSL', () => {
  test('prioriza a VSL e carrega a jornada visual premium', async ({ page }) => {
    await page.goto('/curso-suspensao-piloto-clara?utm_source=teste');

    await expect(
      page.getByRole('heading', {
        level: 1,
        name: 'Regule sua suspensão. Pilote no próximo nível.',
      }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Assistir à aula gratuita' })).toBeVisible();
    await expect(page.locator('video[poster="/images/vsl-thumbnail.webp"]')).toBeVisible();

    const premiumImages = [
      '/images/lp-curso/hero-light-vsl-rider.webp',
      '/images/lp-curso/light-vsl-clicker-adjustment.webp',
      '/images/lp-curso/light-vsl-rider-outcome.webp',
    ];

    for (const source of premiumImages) {
      const image = page.locator(`img[src="${source}"]`);
      await expect(image).toHaveCount(1);
      await image.scrollIntoViewIfNeeded();
      await expect(image).toBeVisible();
      await expect
        .poll(() => image.evaluate((element: HTMLImageElement) => element.naturalWidth))
        .toBeGreaterThan(0);
    }
  });

  test('mantém a Hero e a VSL legíveis no celular sem rolagem horizontal', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/curso-suspensao-piloto-clara');

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Assistir à aula gratuita' })).toBeVisible();

    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);
  });

  test('não expõe mais as versões V3 e V4', async ({ page }) => {
    for (const route of ['/curso-suspensao-piloto-v3', '/curso-suspensao-piloto-v4']) {
      await page.goto(route);
      await expect(page.getByText('404', { exact: true })).toBeVisible();
      await expect(page.getByText('A página que você está procurando pode ter sido')).toBeVisible();
    }
  });
});
