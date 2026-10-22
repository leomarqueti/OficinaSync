import { expect, test } from '@playwright/test';

// Estes testes usam a tela de login de verdade: começam SEM sessão.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('login', () => {
  test('senha errada mostra o erro na tela e não entra (antes falhava em silêncio)', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('tab', { name: 'Entrar com e-mail' }).click();
    await page.locator('#email').fill(process.env.UI_EMAIL!);
    await page.locator('#senha').fill('SenhaErrada@123');
    await page.getByRole('button', { name: 'Entrar no sistema' }).click();

    await expect(page.getByText(/inv[aá]lid/i)).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test('credenciais certas levam ao dashboard e mostram a oficina', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('tab', { name: 'Entrar com e-mail' }).click();
    await page.locator('#email').fill(process.env.UI_EMAIL!);
    await page.locator('#senha').fill(process.env.UI_PASSWORD!);
    await page.getByRole('button', { name: 'Entrar no sistema' }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByText(process.env.UI_TENANT_NAME!).first()).toBeVisible();
  });
});

// Regressão da "tela branca" do app Android: não existia rota "/", o app abria nela e o
// React Router não renderizava nada. Agora "/" decide pra onde ir.
test.describe('rota raiz', () => {
  test('sem sessão, "/" leva ao login (e não a uma tela em branco)', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('tab', { name: 'Entrar com celular' })).toBeVisible();
  });

  test('rota que não existe cai na raiz em vez de ficar em branco', async ({ page }) => {
    await page.goto('/isso-nao-existe');
    await expect(page).toHaveURL(/\/login$/);
  });
});

test.describe('rota raiz com sessão', () => {
  test.use({ storageState: 'e2e/.auth/state.json' });

  test('com sessão, "/" leva ao dashboard', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/dashboard$/);
  });
});
