import { expect, test, type Page } from '@playwright/test';

// A tela de configurações no navegador: campo de chave de IA começa vazio e grava pelo servidor.
// O banco e a sessão são simulados, mas sem estas variáveis o app nem sobe (lib/supabaseClient.ts):
//   VITE_SUPABASE_URL=http://127.0.0.1:54321 VITE_SUPABASE_ANON_KEY=teste npx playwright test teste/painel-chaves-ia.spec.ts
test.skip(!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_ANON_KEY, 'VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY ausentes');

// Simula o bundle novo ainda antes da migração: a tabela ainda devolve a chave ao painel.
const LINHAS = [
  { key: 'site_title', value: 'W-Tech' },
  { key: 'preferred_ai_provider', value: 'openrouter' },
  { key: 'openrouter_model', value: 'modelo/x' },
  { key: 'openai_api_key', value: 'sk-VAZOU' },
];

async function abrirTela(page: Page) {
  const gravado: { chaves: any[]; configuracoes: any[]; provedor: string[]; avisos: string[] } = { chaves: [], configuracoes: [], provedor: [], avisos: [] };

  await page.route(/api\.openai\.com|openrouter\.ai|generativelanguage\.googleapis\.com/, (route) => {
    gravado.provedor.push(route.request().url());
    return route.abort();
  });
  await page.route('**/api/staff/me', (route) => route.fulfill({
    json: { success: true, user: { id: 'u1', name: 'Dono', email: 'dono@w-tech.com', role: 'Super Admin', permissions: { admin_access: true }, status: 'Active' } },
  }));
  await page.route('**/api/staff/db-token', (route) => route.fulfill({ json: { success: true, token: 'passe', expiresIn: 900 } }));
  await page.route('**/api/staff/roles*', (route) => route.fulfill({ json: { success: true, roles: [] } }));
  await page.route('**/api/staff/users*', (route) => route.fulfill({ json: { success: true, users: [] } }));
  await page.route('**/rest/v1/**', (route) => {
    const req = route.request();
    if (req.url().includes('SITE_SystemSettings')) {
      if (req.method() === 'POST') {
        gravado.configuracoes.push(...req.postDataJSON());
        return route.fulfill({ status: 201, json: [] });
      }
      return route.fulfill({ json: LINHAS });
    }
    return route.fulfill({ json: [] });
  });
  await page.route('**/api/staff/config/ai-keys', (route) => {
    if (route.request().method() === 'PUT') {
      gravado.chaves.push(...route.request().postDataJSON().entries);
      return route.fulfill({ json: { success: true } });
    }
    return route.fulfill({
      json: { success: true, configured: { openai_api_key: true, gemini_api_key: false, openrouter_api_key: gravado.chaves.length > 0 } },
    });
  });
  page.on('dialog', (dialog) => {
    gravado.avisos.push(dialog.message());
    return dialog.accept();
  });

  await page.goto('/admin?view=settings');
  await page.getByRole('button', { name: 'GPT & Gemini' }).click();
  return gravado;
}

const campoOpenAI = (page: Page) => page.getByPlaceholder('Chave salva. Em branco, mantém a atual.');

test('chave salva não vai para o campo: só o aviso de que existe', async ({ page }) => {
  await abrirTela(page);

  await expect(campoOpenAI(page)).toBeVisible();
  await expect(campoOpenAI(page)).toHaveValue('');
  await expect(page.getByPlaceholder('sk-or-v1-...')).toHaveValue('');
  const valores = await page.locator('input').evaluateAll((campos) => campos.map((c) => (c as HTMLInputElement).value));
  expect(valores.join(' ')).not.toContain('sk-VAZOU');
});

test('salvar manda a chave pelo servidor e tira as de IA da gravação direta', async ({ page }) => {
  const gravado = await abrirTela(page);

  await page.getByPlaceholder('sk-or-v1-...').fill(' sk-or-nova ');
  await page.getByRole('button', { name: /Salvar/ }).first().click();

  await expect.poll(() => gravado.chaves.length).toBeGreaterThan(0);
  expect(gravado.chaves).toEqual([{ key: 'openrouter_api_key', value: 'sk-or-nova' }]);

  await expect.poll(() => gravado.avisos).toContain('Configurações salvas com sucesso!');
  const chavesGravadas = gravado.configuracoes.map((linha) => linha.key);
  expect(chavesGravadas).toContain('preferred_ai_provider');
  for (const segredo of ['openai_api_key', 'gemini_api_key', 'openrouter_api_key']) {
    expect(chavesGravadas).not.toContain(segredo);
  }

  // O campo volta a ficar vazio, e a chave nova passa a aparecer como salva.
  await expect(page.locator('input[autocomplete="new-password"]').first()).toHaveValue('');
  await expect(campoOpenAI(page)).toHaveCount(2);
  expect(gravado.provedor).toEqual([]);
});

test('sem digitar chave, salvar não chama a rota de chaves', async ({ page }) => {
  const gravado = await abrirTela(page);

  await page.getByRole('button', { name: /Salvar/ }).first().click();

  await expect.poll(() => gravado.avisos).toContain('Configurações salvas com sucesso!');
  expect(gravado.chaves).toEqual([]);
});

test('erro ao salvar a chave para antes de gravar o resto', async ({ page }) => {
  const gravado = await abrirTela(page);
  await page.route('**/api/staff/config/ai-keys', (route) => route.fulfill({ status: 403, json: { success: false, error: 'Sem permissão' } }));

  await page.getByPlaceholder('sk-or-v1-...').fill('sk-or-nova');
  await page.getByRole('button', { name: /Salvar/ }).first().click();

  await expect.poll(() => gravado.avisos.join(' ')).toContain('Erro ao salvar as chaves de IA: Sem permissão');
  expect(gravado.configuracoes).toEqual([]);
  // O que a pessoa digitou continua no campo para tentar de novo.
  await expect(page.getByPlaceholder('sk-or-v1-...')).toHaveValue('sk-or-nova');
});
