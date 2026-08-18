import { expect, test } from '@playwright/test';

test.describe('Limpeza da decoração automática de UTMs', () => {
  test('remove parâmetros de sessão automática de uma visita direta e limpa os links internos', async ({ page }) => {
    await page.goto(
      '/quiz-suspensao?utm_source=direto&src=direto%7Cdiagnostico%7Cquiz_dark_dianteira&sck=1785203787733_17852041110588',
    );

    await expect(page).toHaveURL('http://127.0.0.1:5173/quiz-suspensao');
    await expect(page.getByRole('link', { name: 'Escuro' })).toHaveAttribute('href', '/quiz-suspensao');
    await expect(page.getByRole('link', { name: 'Claro' })).toHaveAttribute('href', '/quiz-suspensao-clara');
  });

  test('preserva UTMs reais de campanha', async ({ page }) => {
    const query = 'utm_source=meta&utm_medium=paid_social&utm_campaign=curso_ergonomia&utm_content=quiz_escuro';
    await page.goto(`/quiz-suspensao?${query}`);

    await expect(page).toHaveURL(new RegExp(`/quiz-suspensao\\?${query}$`));
    await expect(page.getByRole('link', { name: 'Claro' })).toHaveAttribute(
      'href',
      `/quiz-suspensao-clara?${query}`,
    );
  });

  test('mantém parâmetros funcionais que não são de atribuição', async ({ page }) => {
    await page.goto(
      '/quiz-suspensao?lang=pt-BR&utm_source=direto&src=direto%7Cdiagnostico%7Cquiz_dark_dianteira&sck=123_456',
    );

    await expect(page).toHaveURL('http://127.0.0.1:5173/quiz-suspensao?lang=pt-BR');
  });

  test('remove utm_source=direto quando o GTM a injeta isoladamente', async ({ page }) => {
    await page.goto('/curso-suspensao-piloto-vsl?utm_source=direto');

    await expect(page).toHaveURL('http://127.0.0.1:5173/curso-suspensao-piloto-vsl');
  });
});
