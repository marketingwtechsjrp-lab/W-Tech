import { expect, test, type Page } from '@playwright/test';

// "Mais Detalhes" da agenda da home: a função do link não estava importada (o clique só dava
// erro), e o custom_link do banco não chegava até ela. O banco é simulado.
//   VITE_SUPABASE_URL=http://127.0.0.1:54321 VITE_SUPABASE_ANON_KEY=teste npx playwright test teste/home-agenda.spec.ts
test.skip(!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_ANON_KEY, 'VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY ausentes no ambiente de teste.');

const curso = (title: string, extras: Record<string, unknown>) => ({
  id: '55555555-5555-4555-8555-555555555555',
  title,
  date: '2030-12-01T10:00:00+00:00',
  location: 'São Paulo',
  location_type: 'Presencial',
  status: 'Published',
  tags: null,
  ...extras,
});

/** Abre a home com este curso na agenda, e devolve o "Mais Detalhes" dele. */
async function abrirAgenda(page: Page, title: string, extras: Record<string, unknown>) {
  await page.route('**/rest/v1/**', (route) => route.fulfill({
    json: route.request().url().includes('rest/v1/SITE_Courses') ? [curso(title, extras)] : [],
  }));
  await page.goto('/');
  return page.locator('div.group', { has: page.getByRole('heading', { name: title }) }).getByText('Mais Detalhes');
}

test('sem endereço próprio, leva à página do curso', async ({ page }) => {
  const erros: string[] = [];
  page.on('pageerror', (erro) => erros.push(erro.message));

  const detalhes = await abrirAgenda(page, 'Curso Pelo Slug', { slug: 'curso-pelo-slug', custom_link: null });
  await detalhes.click();

  await expect(page).toHaveURL(/\/lp\/curso-pelo-slug$/);
  expect(erros).toEqual([]);
});

test('o endereço próprio do curso vale mais que o slug', async ({ page }) => {
  const detalhes = await abrirAgenda(page, 'Curso Com Endereco', { slug: 'nao-usar', custom_link: '/cursos' });
  await detalhes.click();

  await expect(page).toHaveURL(/\/cursos$/);
});

// O banco guarda alguns assim: https://w-techbrasil.com.br/... (navigate() não entende URL absoluta).
test('endereço absoluto do próprio site abre dentro do site', async ({ page, baseURL }) => {
  const detalhes = await abrirAgenda(page, 'Curso Absoluto', { slug: null, custom_link: `${baseURL}/cursos` });
  await detalhes.click();

  await expect(page).toHaveURL(`${baseURL}/cursos`);
});

test('endereço de outro site continua apontando para ele', async ({ page }) => {
  const detalhes = await abrirAgenda(page, 'Curso Externo', { slug: null, custom_link: 'https://exemplo.com/lp' });

  await expect(detalhes).toHaveAttribute('href', 'https://exemplo.com/lp');
});
