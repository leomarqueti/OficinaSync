import { expect, test, type Page } from '@playwright/test';

// Regressões da rodada de usabilidade simulada (Seu Zé / Dona Cida, 2026-10-17).
const API = 'http://localhost:3100';

function generateCpf(): string {
  const base = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
  if (new Set(base).size === 1) return generateCpf();
  const digit = (nums: number[]) => {
    const factor = nums.length + 1;
    const sum = nums.reduce((acc, n, i) => acc + n * (factor - i), 0);
    const mod = (sum * 10) % 11;
    return mod === 10 ? 0 : mod;
  };
  const d1 = digit(base);
  const d2 = digit([...base, d1]);
  return [...base, d1, d2].join('');
}

function randomPlate(): string {
  const letter = () => String.fromCharCode(65 + Math.floor(Math.random() * 26));
  const digit = () => String(Math.floor(Math.random() * 10));
  return `${letter()}${letter()}${letter()}${digit()}${letter()}${digit()}${digit()}`;
}

async function api(page: Page, method: string, path: string, body?: object) {
  return page.evaluate(
    async ({ method, path, body, API }) => {
      const res = await fetch(`${API}${path}`, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: body ? JSON.stringify(body) : undefined,
      });
      return { status: res.status, json: await res.json().catch(() => null) };
    },
    { method, path, body, API },
  );
}

test('CPF que já é de outro cliente: avisa na hora e oferece usar o cadastro (antes travava no fim com "Usuario ja cadastrado!")', async ({ page }) => {
  await page.goto('/dashboard');
  const cpf = generateCpf();
  const name = `Cliente CPF ${cpf.slice(0, 4)}`;
  const created = await api(page, 'POST', '/clients', { name, phone: '+5514997001122', cpf, address: 'Rua A, 1' });
  expect(created.status).toBe(201);

  await page.goto('/os-client-create');
  await page.locator('#cpf').fill(cpf);
  await expect(page.getByText(`Este CPF já é do cliente ${name}`)).toBeVisible();
  await page.getByRole('button', { name: 'Usar esse cadastro' }).click();
  await expect(page.getByText('Cliente já cadastrado')).toBeVisible();
});

test('interrupção no balcão: sair no meio do cadastro e voltar recupera o que foi digitado', async ({ page }) => {
  await page.goto('/os-client-create');
  await page.evaluate(() => localStorage.removeItem('oficinasync_os_draft'));
  await page.reload();
  await page.locator('#name').fill('Dona Interrompida');
  await page.locator('#address').fill('Rua do Balcão, 5');

  await page.goto('/dashboard'); // telefone tocou, foi atender
  await page.goto('/os-client-create');

  await expect(page.locator('#name')).toHaveValue('Dona Interrompida');
  await expect(page.locator('#address')).toHaveValue('Rua do Balcão, 5');
  await expect(page.getByText('Rascunho recuperado')).toBeVisible();

  await page.getByRole('button', { name: 'Começar do zero' }).click();
  await expect(page.locator('#name')).toHaveValue('');
});

export { api, generateCpf, randomPlate };
