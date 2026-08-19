import { expect, test } from '@playwright/test';

/**
 * Cobre as duas travas de receita do funil de suspensão:
 *  - o quiz só entrega a VSL depois de capturar nome e WhatsApp;
 *  - a VSL só libera a inscrição depois de 50s de conteúdo realmente assistido.
 */

/** Responde as 6 etapas escolhendo sempre a primeira opção disponível. */
const responderQuiz = async (page: import('@playwright/test').Page) => {
    await page.getByRole('button', { name: 'Iniciar meu diagnóstico' }).click();
    for (let etapa = 0; etapa < 6; etapa += 1) {
        const opcao = page.getByTestId('quiz-option').first();
        await opcao.waitFor({ state: 'visible' });
        await opcao.click();
        await expect(opcao).toBeHidden();
    }
};

test.describe('Quiz de suspensão — captura de lead antes da VSL', () => {
    test('não avança para a VSL sem nome e WhatsApp válidos', async ({ page }) => {
        await page.goto('/quiz-suspensao?lang=pt-BR');
        await responderQuiz(page);

        const enviar = page.getByRole('button', { name: 'Ver meu plano de regulagem' });
        await expect(enviar).toBeVisible();

        // WhatsApp incompleto derruba a validação e mantém o piloto na página.
        await page.getByPlaceholder('Seu nome').fill('Piloto Teste');
        await page.getByPlaceholder('WhatsApp com DDD').fill('119');
        await enviar.click();

        await expect(page.getByRole('alert')).toHaveText('Informe um WhatsApp válido com DDD.');
        await expect(page).toHaveURL(/\/quiz-suspensao/);
    });

    test('grava o lead com o diagnóstico e encaminha para a VSL do tema', async ({ page }) => {
        const gravados: Array<Record<string, unknown>> = [];
        await page.route('**/rest/v1/SITE_Leads**', async (route) => {
            if (route.request().method() === 'POST') {
                gravados.push(JSON.parse(route.request().postData() || '[]')[0]);
            }
            await route.fulfill({ status: 201, contentType: 'application/json', body: '[]' });
        });

        await page.goto('/quiz-suspensao?lang=pt-BR');
        await responderQuiz(page);

        await page.getByPlaceholder('Seu nome').fill('Piloto Teste');
        await page.getByPlaceholder('WhatsApp com DDD').fill('11987654321');
        await page.getByRole('button', { name: 'Ver meu plano de regulagem' }).click();

        await page.waitForURL(/\/curso-suspensao-piloto-vsl\?/);
        await expect(page).toHaveURL(/from=quiz/);
        await expect(page).toHaveURL(/quiz_profile=/);

        expect(gravados).toHaveLength(1);
        expect(gravados[0]).toMatchObject({ name: 'Piloto Teste', phone: '11987654321' });
        expect(gravados[0].quiz_data).toBeTruthy();
    });
});

test.describe('VSL de suspensão — liberação por tempo assistido', () => {
    // O vídeo é remoto e o teste precisa de reprodução real; sob concorrência o
    // download compete com as outras specs, então damos folga explícita.
    test('libera a inscrição aos 50s e ignora tentativa de adiantar o vídeo', async ({ page }) => {
        test.slow();
        await page.goto('/curso-suspensao-piloto-vsl?lang=pt-BR');
        await expect(
            page.getByText('O botão de inscrição libera após 50 segundos de apresentação'),
        ).toBeVisible();

        await page.getByRole('button', { name: 'Começar agora' }).click();

        // Pular para depois do limiar não pode liberar: o gate conta o avanço real.
        await page.evaluate(() => {
            const video = document.querySelector('video') as HTMLVideoElement;
            video.muted = true;
            video.currentTime = 120;
        });
        await page.waitForTimeout(1500);
        expect(await page.evaluate(() => sessionStorage.getItem('wtech_suspensao_vsl_completed'))).toBeNull();

        // Assistindo de verdade (acelerado), a inscrição abre ao cruzar os 50s.
        await page.evaluate(() => {
            const video = document.querySelector('video') as HTMLVideoElement;
            video.playbackRate = 16;
            void video.play();
        });
        await expect
            .poll(
                () => page.evaluate(() => sessionStorage.getItem('wtech_suspensao_vsl_completed')),
                { timeout: 60_000, intervals: [500] },
            )
            .toBe('true');
    });
});
