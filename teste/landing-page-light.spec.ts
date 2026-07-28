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

  test('exibe as artes oficiais nos fundamentos, o carrossel e os depoimentos da página principal', async ({ page }) => {
    await page.goto('/curso-suspensao-piloto-clara');

    const conceptImages = page.locator('#metodo article img');
    await expect(conceptImages).toHaveCount(4);
    expect(await conceptImages.evaluateAll((images) => images.map((image) => image.getAttribute('src')))).toEqual([
      '/images/modulos/CARDS-KWIFY-CURSO-AVANCADO-2.webp',
      '/images/modulos/CARDS-KWIFY-CURSO-AVANCADO-4.webp',
      '/images/modulos/CARDS-KWIFY-CURSO-AVANCADO-1.webp',
      '/images/modulos/CARDS-KWIFY-CURSO-AVANCADO-3.webp',
    ]);

    await expect(page.locator('#conteudo img[alt^="Capa oficial do módulo"]')).toHaveCount(16);
    await expect(
      page.getByText(
        'Comecei a oferecer regulagem e setup de suspensão na oficina. Ganhei novos clientes que antes iam buscar fora. O retorno foi imenso.',
        { exact: false },
      ),
    ).toHaveCount(2);
    await expect(
      page.getByText(
        'Eu achava minhas molas macias demais, mas na verdade a hidráulica estava zerada. Entender esse casamento através do curso virou a chave da minha tocada.',
        { exact: false },
      ),
    ).toHaveCount(2);
  });

  test('oferece uma VSL isolada clara e encaminha para a landing clara', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/curso-suspensao-piloto-vsl-clara?utm_source=teste');

    await expect(page).toHaveTitle('Aula Clara de Acerto de Suspensão Off-Road — W-Tech');
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: 'Descubra por que sua moto cansa você — e como acertar a suspensão',
      }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Iniciar aula' })).toBeVisible();
    await expect(page.getByText('O botão de inscrição será liberado ao final da aula')).toBeVisible();
    await expect(page.locator('img[src="/images/lp-curso/hero-light-vsl-rider.webp"]')).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(391);

    await page.evaluate(() => sessionStorage.setItem('wtech_suspensao_vsl_completed', 'true'));
    await page.reload();

    const nextStep = page.getByRole('link', { name: 'Continuar para a inscrição' });
    await expect(nextStep).toBeVisible();
    await expect(nextStep).toHaveAttribute(
      'href',
      /\/curso-suspensao-piloto-clara\?.*utm_source=teste.*src=vsl_clara_isolada/,
    );
  });

  test('não expõe mais as versões V3 e V4', async ({ page }) => {
    for (const route of ['/curso-suspensao-piloto-v3', '/curso-suspensao-piloto-v4']) {
      await page.goto(route);
      await expect(page.getByText('404', { exact: true })).toBeVisible();
      await expect(page.getByText('A página que você está procurando pode ter sido')).toBeVisible();
    }
  });
});
