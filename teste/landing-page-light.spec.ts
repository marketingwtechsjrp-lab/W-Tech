import { expect, test } from '@playwright/test';

test.describe('Landing page clara VSL', () => {
  test('prioriza a VSL e carrega a jornada visual premium', async ({ page }) => {
    await page.goto('/curso-suspensao-piloto-clara?utm_source=teste');

    await expect(
      page.getByRole('heading', {
        level: 1,
        name: 'O Único Curso Que Você Precisa Para Acertar Sua Moto',
      }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Assistir à apresentação' })).toBeVisible();
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
    await expect(page.getByRole('button', { name: 'Assistir à apresentação' })).toBeVisible();

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
    await expect(page.getByRole('button', { name: 'Assistir depoimento: Pedro' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Assistir depoimento: Euler' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Assistir depoimento: Guilherme' })).toHaveCount(0);
  });

  test('mostra somente euros e pagamento único na oferta internacional', async ({ page }) => {
    await page.goto('/curso-suspensao-piloto-clara?regiao=intl&lang=pt-PT&utm_source=teste');

    const offer = page.locator('#oferta');
    await offer.scrollIntoViewIfNeeded();
    await expect(offer).toBeVisible();
    const offerText = await offer.innerText();

    expect(offerText).toContain('59 €');
    expect(offerText).toContain('Pagamento único de 59 € · sem renovação');
    expect(offerText).toContain('60 €');
    expect(offerText).toContain('39 €');
    expect(offerText).toContain('30 €');
    expect(offerText).toContain('21 €');
    expect(offerText).not.toContain('R$');
    expect(offerText).not.toMatch(/12x|parcela/i);

    await expect(offer.getByRole('link', { name: 'Quero a Minha Vaga Agora' })).toHaveAttribute(
      'href',
      /pay\.hotmart\.com\/Q107251292B\?off=l2pjqk7m&.*utm_source=teste/,
    );
  });

  test('oferece uma VSL isolada clara e encaminha direto para o checkout', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/curso-suspensao-piloto-vsl-clara?utm_source=teste');

    await expect(page).toHaveTitle('Apresentação Clara do Curso de Suspensão Off-Road — W-Tech');
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: 'O Único Curso Que Você Precisa Para Acertar Sua Moto',
      }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Começar agora' })).toBeVisible();
    await expect(page.getByText('O botão de inscrição aparece durante a apresentação')).toBeVisible();
    await expect(page.locator('img[src="/images/lp-curso/hero-light-vsl-rider.webp"]')).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(391);

    await page.evaluate(() => sessionStorage.setItem('wtech_suspensao_vsl_completed', 'true'));
    await page.reload();

    // A VSL entrega direto no checkout: nenhuma landing page entre o vídeo e o
    // pagamento.
    const nextStep = page.getByRole('link', { name: 'Ir para a inscrição segura' });
    await expect(nextStep).toBeVisible();
    await expect(nextStep).toHaveAttribute('href', /pay\.kiwify\.com\.br\/.*utm_source=teste/);
  });

  test('não expõe mais as versões V3 e V4', async ({ page }) => {
    for (const route of ['/curso-suspensao-piloto-v3', '/curso-suspensao-piloto-v4']) {
      await page.goto(route);
      await expect(page.getByText('404', { exact: true })).toBeVisible();
      await expect(page.getByText('A página que você está procurando pode ter sido')).toBeVisible();
    }
  });
});
