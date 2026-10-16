import { expect, test } from '@playwright/test';

// PNG 1x1 válido (as 4 fotos de entrada são obrigatórias no wizard).
const PNG_1PX = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

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

test('abre uma OS completa pelo wizard (cliente, veículo, defeito, 4 fotos, revisão)', async ({ page }) => {
  const plate = randomPlate();
  const complaint = `Motor falhando em marcha lenta ${plate}`;

  await page.goto('/os-client-create');

  // passo 1 — cliente
  await page.locator('#name').fill('Cliente Playwright');
  await page.locator('#phone').fill('14997951011');
  await page.locator('#cpf').fill(generateCpf());
  await page.locator('#email').fill('cliente.pw@teste.local');
  await page.locator('#address').fill('Rua dos Testes, 10');
  await page.getByRole('button', { name: 'Continuar' }).click();

  // passo 2 — veículo
  await expect(page.getByText('Qual é o veículo?')).toBeVisible();
  await page.locator('#plate').fill(plate);
  await page.locator('select#brand').selectOption('Chevrolet');
  await page.locator('#model').fill('Celta');
  await page.locator('#year').fill('2010');
  await page.locator('#color').fill('Prata');
  await page.locator('#chassis').fill('9BGKS08Z0AG123456');
  await page.locator('#km').fill('100000');
  await page.getByRole('button', { name: 'Continuar' }).click();

  // passo 3 — defeito relatado
  await expect(page.getByText('Qual é o defeito relatado?')).toBeVisible();
  await page.getByPlaceholder(/veículo falha ao ligar/).fill(complaint);
  await page.getByRole('button', { name: 'Continuar' }).click();

  // passo 4 — as 4 fotos de entrada são obrigatórias
  await expect(page.getByText('Fotos de entrada')).toBeVisible();
  const continuar = page.getByRole('button', { name: 'Continuar' });
  await expect(continuar).toBeDisabled();

  const inputs = page.locator('input[type="file"]');
  await expect(inputs).toHaveCount(4);
  for (let i = 0; i < 4; i++) {
    await inputs.nth(i).setInputFiles({
      name: `foto-${i}.png`,
      mimeType: 'image/png',
      buffer: PNG_1PX,
    });
  }
  await expect(continuar).toBeEnabled();
  await continuar.click();

  // passo 5 — revisão e criação
  await expect(page.getByText('Confere e cria a OS')).toBeVisible();
  await expect(page.getByText(complaint)).toBeVisible();
  await page.getByRole('button', { name: 'Criar ordem de serviço' }).click();

  // cai direto na tela do mecânico da OS recém-criada, com os dados que digitamos
  await expect(page).toHaveURL(/\/os\/\d+$/, { timeout: 30_000 });
  await expect(page.getByText(complaint).first()).toBeVisible();
});

test('o botão Continuar fica travado enquanto o cliente é inválido', async ({ page }) => {
  await page.goto('/os-client-create');
  const continuar = page.getByRole('button', { name: 'Continuar' });

  await expect(continuar).toBeDisabled();

  await page.locator('#name').fill('Cliente Inválido');
  await page.locator('#phone').fill('14997951011');
  await page.locator('#cpf').fill('111.111.111-11'); // CPF inválido (sequência repetida)
  await page.locator('#email').fill('cliente@teste.local');
  await page.locator('#address').fill('Rua dos Testes, 10');
  await expect(continuar).toBeDisabled();

  await page.locator('#cpf').fill(generateCpf());
  await expect(continuar).toBeEnabled();
});

test('o e-mail do cliente é opcional: sem e-mail o Continuar libera', async ({ page }) => {
  await page.goto('/os-client-create');
  const continuar = page.getByRole('button', { name: 'Continuar' });

  await page.locator('#name').fill('Cliente Sem Email');
  await page.locator('#phone').fill('14997951011');
  await page.locator('#cpf').fill(generateCpf());
  await page.locator('#address').fill('Rua dos Testes, 10');

  await expect(continuar).toBeEnabled();
});
