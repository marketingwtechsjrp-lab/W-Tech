import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test.beforeEach(async ({ page }) => {
    // Exercita a página sem enviar eventos de QA aos serviços de produção.
    await page.route('**/*', (route) => {
        const url = new URL(route.request().url());
        return url.hostname === '127.0.0.1' || url.hostname === 'localhost'
            ? route.continue()
            : route.abort();
    });
});

for (const region of ['br', 'intl']) {
    test(`página inteira sem VSL e checkout somente na oferta (${region})`, async ({ page }) => {
        await page.goto(`/curso-suspensao-piloto?lang=pt-BR&regiao=${region}&utm_source=premium-qa`);
        await expect(page.locator('h1')).toBeVisible();
        await expect(page.locator('#conteudo')).toBeAttached();
        await expect(page.locator('#cta-final')).toBeAttached();
        await expect(page.locator('[data-course-presentation]')).toHaveCount(1);

        const monetaryTextOutsideOffer = await page.evaluate(() => {
            const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
            const matches: string[] = [];
            while (walker.nextNode()) {
                const node = walker.currentNode;
                if (!node.parentElement?.closest('#cta-final, #materiais-inclusos, script, style') && /R\$|€/.test(node.textContent || '')) matches.push(node.textContent!);
            }
            return matches;
        });
        expect(monetaryTextOutsideOffer).toEqual([]);
        const checkout = page.locator('a[href*="pay.kiwify.com.br"], a[href*="pay.hotmart.com"]');
        await expect(checkout).toHaveCount(1);
        await expect(page.locator('#cta-final').locator(checkout)).toHaveCount(1);
        await expect(checkout).toHaveAttribute('href', new RegExp(region === 'br' ? 'pay.kiwify.com.br' : 'pay.hotmart.com'));
        await expect(checkout).toHaveAttribute('href', /premium-qa/);

        for (const source of ['hero', 'sticky']) {
            await page.locator(`[data-offer-cta="${source}"]`).click();
            await expect.poll(() => page.locator('#cta-final').evaluate((element) => Math.abs(element.getBoundingClientRect().top - 80))).toBeLessThan(10);
        }
        await expect(page.getByText('Nova inscrição confirmada')).toHaveCount(0);
        await expect(page.getByText('Ricardo F.', { exact: true })).toHaveCount(0);
        await expect(page.locator('[data-whatsapp-testimonials]')).toHaveCount(0);
    });
}

test('depoimentos locais reproduzem, fecham por Escape e respeitam pausa', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/curso-suspensao-piloto?lang=pt-BR&regiao=br');
    await page.locator('#depoimentos').scrollIntoViewIfNeeded();
    const cards = page.locator('.course-story-group:not([aria-hidden]) .course-video-card');
    await expect(cards).toHaveCount(4);
    await page.getByRole('button', { name: 'Pausar carrosséis' }).click();
    await expect(page.locator('.course-story-rail')).toHaveAttribute('data-paused', 'true');
    await cards.first().click();
    const dialog = page.getByRole('dialog', { name: 'Depoimento em vídeo' });
    await expect(dialog).toBeVisible();
    await expect.poll(() => dialog.locator('video').evaluate((video: HTMLVideoElement) => video.currentTime)).toBeGreaterThan(0);
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(cards.first()).toBeFocused();
    expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
    await cards.nth(2).click();
    await expect(dialog.locator('iframe')).toHaveAttribute('src', /youtube-nocookie.com\/embed\/8TaJ_e8o14Q/);
    await page.getByRole('button', { name: 'Fechar depoimento' }).click();
    await expect(dialog).not.toBeVisible();
    expect(errors).toEqual([]);
});

test('celular sem overflow, com acesso à oferta e movimento reduzido', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/curso-suspensao-piloto?lang=pt-BR&regiao=br');
    await expect(page.locator('h1')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.locator('#depoimentos').scrollIntoViewIfNeeded();
    expect(await page.locator('.course-story-track').evaluate((el) => getComputedStyle(el).animationName)).toBe('none');
    await page.locator('[data-offer-cta="sticky"]').click();
    await expect(page.locator('#kiwify-checkout-btn-lp-ergonomia')).toBeVisible();
});

test('faixa de prints preparada em sentido contrário e imagem ampliável', async ({ page }) => {
    // Fixture visual exclusiva do teste; a lista publicada permanece vazia.
    await page.route('**/lib/courseSocialProof.ts', (route) => route.fulfill({
        contentType: 'application/javascript',
        body: 'export const COURSE_WHATSAPP_TESTIMONIALS = [{ id: "qa", src: "/images/testimonials/lisboa-1.webp", alt: "Imagem de teste", caption: "Fixture de teste" }];',
    }));
    await page.goto('/curso-suspensao-piloto?lang=pt-BR&regiao=br');
    const images = page.locator('[data-whatsapp-testimonials]');
    await expect(images).toBeAttached();
    await expect(images.locator('.course-story-rail')).toHaveAttribute('data-reverse', 'true');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await images.getByRole('button', { name: 'Ampliar relato: Fixture de teste' }).click();
    await expect(page.getByRole('dialog').getByAltText('Imagem de teste')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('Portugal por geolocalização: português europeu, euros e Hotmart', async ({ page }) => {
    await page.route('**/api/geo-language', (route) => route.fulfill({
        json: { country: 'PT', language: 'pt-PT' },
    }));
    await page.goto('/curso-suspensao-piloto?utm_source=anuncio-portugal');
    await expect(page.locator('html')).toHaveAttribute('lang', 'pt-PT');
    await expect(page.locator('[data-course-promise]')).toContainText('acertar a suspensão da tua mota');
    await expect(page).toHaveTitle(/Aprende a Afinar a Tua Mota/);
    await expect(page.locator('#cta-final')).toContainText('59 €');
    await expect(page.locator('#cta-final')).toContainText('Pagamento único de 59 € · sem renovação');
    await expect(page.locator('#kiwify-checkout-btn-lp-ergonomia')).toHaveAttribute('href', /pay.hotmart.com/);
    await expect(page.locator('#kiwify-checkout-btn-lp-ergonomia')).toHaveAttribute('href', /anuncio-portugal/);
    await expect(page.locator('body')).not.toContainText('R$');
    await expect(page.locator('body')).not.toContainText('MB WAY');
    await page.getByRole('button', { name: 'Posso fazer a formação a partir de Portugal?' }).click();
    await expect(page.getByText('Podes acompanhar no computador', { exact: false })).toBeVisible();
    await page.getByRole('button', { name: 'Em que português são dadas as aulas?' }).click();
    await expect(page.getByText('As aulas são apresentadas pelos formadores brasileiros', { exact: false })).toBeVisible();
});

test('Portugal no telemóvel: CTA, contacto internacional e mudança para Brasil', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/curso-suspensao-piloto?lang=pt-PT&regiao=intl');
    await expect(page.locator('[data-offer-cta="hero"]')).toHaveText(/afinação da minha mota/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await expect(page.locator('[data-offer-cta="sticky"]')).toHaveCount(0);
    await page.locator('[data-offer-cta="hero"]').click();
    await page.getByRole('button', { name: 'Falar com a equipa no WhatsApp' }).click();
    const dialog = page.getByRole('dialog', { name: 'Falar com a W-Tech' });
    await expect(dialog).toContainText('Preenche os teus dados');
    await expect(dialog.getByPlaceholder('+351 912 345 678')).toBeVisible();
    await expect(dialog.getByPlaceholder('O teu nome')).toBeVisible();
    await page.keyboard.press('Escape');
    await page.getByRole('combobox', { name: 'Idioma da página' }).selectOption('pt-BR');
    await expect(page.locator('[data-offer-cta="hero"]')).toHaveText(/acerto da minha moto/);
    // Idioma de leitura não altera a região de cobrança.
    await expect(page.locator('#cta-final')).toContainText('59 €');
});

test('abertura com movimento silencioso e CTA fixo somente depois do principal', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/curso-suspensao-piloto?lang=pt-BR&regiao=br');
    await expect(page.locator('h1')).toHaveText('Sua moto.Acertada.');
    await expect(page.locator('[data-course-promise]')).toContainText('O único curso');
    await expect(page.locator('[data-offer-cta="sticky"]')).toHaveCount(0);
    const loop = page.locator('[data-hero-loop]');
    await expect(loop).toHaveAttribute('src', /acerto-mobile.mp4/);
    await expect.poll(() => loop.evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThan(0);
    expect(await loop.evaluate((v: HTMLVideoElement) => v.muted)).toBe(true);
    await page.getByRole('button', { name: 'Pausar movimento' }).click();
    await expect.poll(() => loop.evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
    await page.locator('#metodo-piloto').scrollIntoViewIfNeeded();
    await expect(page.locator('[data-offer-cta="sticky"]')).toBeVisible();
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await expect(page.locator('[data-offer-cta="sticky"]')).toHaveCount(0);
});

test('VSL está visível na página e reproduz sem modal ou bloqueio', async ({ page }) => {
    await page.route('**/vsl/vsl-suspensao-2026.mp4', async route => route.fulfill({ contentType: 'video/mp4', body: await readFile('public/videos/hero-piloto/acerto-mobile.mp4') }));
    await page.goto('/curso-suspensao-piloto?lang=pt-BR&regiao=br');
    const video = page.locator('[data-course-presentation]');
    await expect(video).toBeAttached();
    await expect(video).toHaveAttribute('preload', 'none');
    await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
    await page.locator('#apresentacao-piloto').scrollIntoViewIfNeeded();
    await expect(video).toBeVisible();
    await page.locator('.pilot-inline-play').click();
    await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThan(0);
    await expect(video).toHaveAttribute('controls', '');
    await expect(page.locator('.pilot-inline-play')).toHaveCount(0);
    expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
    await page.locator('#metodo-piloto').scrollIntoViewIfNeeded();
    await expect(page.locator('#pilot-method-title')).toBeVisible();
});

test('economia de dados e movimento reduzido usam imagem sem baixar vídeo', async ({ page }) => {
    await page.addInitScript(() => Object.defineProperty(navigator, 'connection', { value: { saveData: true } }));
    await page.goto('/curso-suspensao-piloto?lang=pt-BR&regiao=br');
    await expect(page.locator('.pilot-hero-poster')).toBeVisible();
    await expect(page.locator('[data-hero-loop]')).toHaveCount(0);
    await expect(page.locator('[data-open-presentation]')).toBeEnabled();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(page.locator('[data-hero-loop]')).toHaveCount(0);
    await page.locator('[data-offer-cta="hero"]').click();
    await expect(page.locator('#kiwify-checkout-btn-lp-ergonomia')).toBeVisible();
});

for (const market of [{lang:'pt-BR',region:'br',total:'R$ 997,00',zero:'R$ 0'}, {lang:'pt-PT',region:'intl',total:'150 €',zero:'0 €'}]) {
    test(`bônus ilustrados com valor e custo adicional zero (${market.lang})`, async ({ page }) => {
        await page.setViewportSize({width:390,height:844});
        await page.goto(`/curso-suspensao-piloto?lang=${market.lang}&regiao=${market.region}`);
        const bonuses=page.locator('#materiais-inclusos');
        await bonuses.scrollIntoViewIfNeeded();
        await expect(bonuses.locator('article')).toHaveCount(4);
        await expect(bonuses.locator('.course-bonus-total s')).toHaveText(market.total);
        await expect(bonuses.locator('.course-bonus-total-zero strong')).toHaveText(market.zero);
        await expect(bonuses.locator('.course-bonus-disclosure')).toContainText('ilustrativos');
        expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
        await bonuses.getByRole('button').click();
        await expect(page.locator('#kiwify-checkout-btn-lp-ergonomia')).toBeVisible();
    });
}
