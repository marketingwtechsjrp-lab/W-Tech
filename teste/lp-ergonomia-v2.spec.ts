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

        const heroCheckout = page
            .getByRole('link', { name: 'Quero acertar minha moto' })
            .first();
        await expect(heroCheckout).toHaveAttribute(
            'href',
            /pay\.kiwify\.com\.br\/5zdsgcS.*utm_source=playwright/,
        );
        await expect(heroCheckout).toHaveAttribute('href', /utm_campaign=lp_conversion/);

        await expect(page.getByText('Nova inscrição confirmada')).toHaveCount(0);
        await expect(page.getByText('Últimas vagas do lote atual')).toHaveCount(0);
        await expect(page.getByText(/ou 10x de R\$ 32,09 no cartão/i)).toBeVisible();
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
});
