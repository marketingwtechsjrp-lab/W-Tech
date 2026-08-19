import { expect, test } from '@playwright/test';

const PAGE_PATH =
    '/curso-suspensao-piloto-v2?utm_source=playwright&utm_campaign=lp_conversion';

test.describe('LP Curso de Suspensão para Pilotos V2', () => {
    test('apresenta uma oferta clara e preserva a atribuição no checkout', async ({
        page,
    }) => {
        await page.goto(PAGE_PATH);

        await expect(page).toHaveTitle('Curso de Suspensão para Pilotos | Método W-Tech');
        await expect(
            page.getByRole('heading', {
                level: 1,
                name: /Mais controle na moto\. Menos esforço no braço\./i,
            }),
        ).toBeVisible();

        const heroCta = page
            .getByRole('link', { name: 'Quero acertar minha moto' })
            .first();
        await expect(heroCta).toHaveAttribute('href', '#oferta');

        const offerCheckout = page
            .getByRole('link', { name: 'Quero começar agora' })
            .first();
        await expect(offerCheckout).toHaveAttribute(
            'href',
            /pay\.kiwify\.com\.br\/19v4nIa.*utm_source=playwright/,
        );
        await expect(offerCheckout).toHaveAttribute('href', /utm_campaign=lp_conversion/);

        await expect(page.getByText('Nova inscrição confirmada')).toHaveCount(0);
        await expect(page.getByText('Últimas vagas do lote atual')).toHaveCount(0);
        await expect(page.getByText(/ou 12x de R\$ 34,70 no cartão/i)).toBeVisible();
        await expect(page.getByText('Plano Premium · inscrição online')).toBeVisible();
        await expect(page.getByText('Garantia incondicional de 7 dias', { exact: true })).toBeVisible();
        await expect(page.getByText(/30 dias/i)).toHaveCount(0);
        await expect(page.locator('section iframe[src*="_K7qfx_hC-k"]')).toHaveCount(0);
    });

    test('carrega o vídeo somente depois da intenção do visitante', async ({ page }) => {
        await page.goto(PAGE_PATH);

        const video = page.locator('video').first();
        await expect(video.locator('source')).toHaveCount(0);

        await page.getByRole('button', { name: 'Assistir à apresentação do curso' }).click();
        await expect(video.locator('source')).toHaveCount(1);
        await expect(video.locator('source')).toHaveAttribute('src', /vsl-suspensao\.mp4/);
    });

    test('abre respostas do FAQ com semântica acessível', async ({ page }) => {
        await page.goto(PAGE_PATH);

        const question = page.getByRole('button', {
            name: 'Preciso ter experiência para fazer o curso?',
        });
        await expect(question).toHaveAttribute('aria-expanded', 'false');
        await question.click();
        await expect(question).toHaveAttribute('aria-expanded', 'true');
        await expect(
            page.getByText(/O conteúdo começa pelos fundamentos e avança até o acerto/i),
        ).toBeVisible();
    });

    test('mantém CTA acessível e não cria rolagem horizontal no mobile', async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto(PAGE_PATH);

        await expect(page.getByRole('link', { name: 'Quero começar' }).last()).toBeVisible();

        const hasHorizontalOverflow = await page.evaluate(
            () => document.documentElement.scrollWidth > window.innerWidth + 1,
        );
        expect(hasHorizontalOverflow).toBe(false);
    });

    test('capta o lead antes de abrir o WhatsApp', async ({ page }) => {
        await page.goto(PAGE_PATH);

        await page.getByRole('button', { name: 'Falar com a equipe no WhatsApp' }).last().click();
        await expect(page.getByRole('dialog', { name: 'Falar com a W-Tech' })).toBeVisible();
        await expect(page.getByPlaceholder('Seu nome')).toBeVisible();
        await expect(page.getByPlaceholder('(12) 99999-9999')).toBeVisible();
        await expect(page.getByPlaceholder('voce@email.com')).toBeVisible();
    });
});
