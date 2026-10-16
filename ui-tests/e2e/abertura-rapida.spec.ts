import { expect, test, type Page } from '@playwright/test';

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

/** Abre uma OS no modo rápido: pula o cliente, só placa + defeito, sem fotos. */
async function openQuickOrder(page: Page, plate: string, complaint: string) {
  await page.goto('/os-client-create');
  await page.getByLabel(/Abertura rápida/).check();

  // passo 1 — pular cliente
  await page.getByRole('button', { name: 'Pular cliente' }).click();

  // passo 2 — só a placa
  await expect(page.getByText('Qual é o veículo?')).toBeVisible();
  await page.locator('#plate').fill(plate);
  await page.getByRole('button', { name: 'Continuar' }).click();

  // passo 3 — defeito relatado
  await page.getByPlaceholder(/veículo falha ao ligar/).fill(complaint);
  await page.getByRole('button', { name: 'Continuar' }).click();

  // passo 4 — fotos opcionais no modo rápido
  await expect(page.getByText('Fotos de entrada')).toBeVisible();
  await page.getByRole('button', { name: 'Continuar' }).click();

  // passo 5 — revisão mostra o que vai ficar pendente
  await expect(page.getByText('Confere e cria a OS')).toBeVisible();
  await expect(page.getByText(/Vai ficar pendente/)).toBeVisible();
  await page.getByRole('button', { name: 'Criar ordem de serviço' }).click();

  await expect(page).toHaveURL(/\/os\/\d+$/, { timeout: 30_000 });
}

test('abre a OS só com a placa e o defeito; a pendência aparece e some ao completar', async ({ page }) => {
  const plate = randomPlate();
  await openQuickOrder(page, plate, `Não pega de manhã ${plate}`);

  // tela do mecânico: banner de pendência e texto reserva do cliente
  await expect(page.getByText('Dados pendentes')).toBeVisible();
  await expect(page.getByText('Cliente não identificado')).toBeVisible();

  // completar os dados pela folha
  await page.getByRole('button', { name: 'Completar dados' }).first().click();
  const sheet = page.getByRole('dialog');
  await expect(sheet.getByText('Completar dados')).toBeVisible();

  await sheet.locator('#cd-client-name').fill('Sr. Antônio');
  await sheet.locator('#phone').fill('14997951011');
  await sheet.locator('#cpf').fill(generateCpf());
  await sheet.locator('#cd-client-address').fill('Rua das Flores, 10');
  await sheet.locator('#cd-brand').fill('Fiat');
  await sheet.locator('#cd-model').fill('Uno');
  await sheet.locator('#year').fill('2008');
  await sheet.locator('#cd-fuel').selectOption('flex');
  await sheet.locator('#cd-color').fill('Branco');
  await sheet.locator('#cd-chassis').fill('9BD15822A8Y123456');
  await sheet.locator('#km').fill('120000');
  await sheet.getByRole('button', { name: 'Salvar dados' }).click();

  await expect(page.getByText('Dados pendentes')).toHaveCount(0);
  await expect(page.getByText('Sr. Antônio')).toBeVisible();
});

test('finalizar com dados pendentes abre a folha antes de subir qualquer foto', async ({ page }) => {
  const plate = randomPlate();
  await openQuickOrder(page, plate, `Barulho na suspensão ${plate}`);

  await page.getByRole('button', { name: /Finalizar/ }).first().click();
  await expect(page).toHaveURL(/\/finalizar$/);

  const uploads: string[] = [];
  page.on('request', (req) => {
    if (req.url().includes('/medias') && req.method() === 'POST') uploads.push(req.url());
  });

  await page.getByRole('button', { name: 'Finalizar ordem de serviço' }).click();

  await expect(page.getByRole('dialog').getByText('Completar dados')).toBeVisible();
  expect(uploads).toHaveLength(0);
});

test('o card do dashboard mostra "dados pendentes" e "Cliente não identificado"', async ({ page }) => {
  const plate = randomPlate();
  await openQuickOrder(page, plate, `Luz da injeção acesa ${plate}`);

  await page.goto('/dashboard');
  await page.getByPlaceholder(/Buscar/i).fill(plate);

  const card = page.getByRole('button').filter({ hasText: plate });
  await expect(card.getByText('Cliente não identificado')).toBeVisible();
  await expect(card.getByText('Dados pendentes')).toBeVisible();
});

test('CPF que já é de outro cliente oferece usar o cadastro existente (sem duplicar)', async ({ page }) => {
  const cpf = generateCpf();

  // cliente já cadastrado com esse CPF (via API, com o token da sessão de teste)
  const token = await page.goto('/dashboard').then(() => page.evaluate(() => localStorage.getItem('token')));
  const created = await page.evaluate(
    async ({ token, cpf }) => {
      const res = await fetch('http://localhost:3100/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: 'Dona do CPF',
          phone: '+5514997951011',
          cpf,
          address: 'Rua Existente, 1',
        }),
      });
      return res.status;
    },
    { token, cpf },
  );
  expect(created).toBe(201);

  const plate = randomPlate();
  await openQuickOrder(page, plate, `Falha intermitente ${plate}`);

  await page.getByRole('button', { name: 'Completar dados' }).first().click();
  const sheet = page.getByRole('dialog');
  await sheet.locator('#cd-client-name').fill('Outro Nome');
  await sheet.locator('#cpf').fill(cpf);
  await sheet.getByRole('button', { name: 'Salvar dados' }).click();

  await expect(sheet.getByText(/Já existe um cliente com esse CPF/)).toBeVisible();
  await sheet.getByRole('button', { name: /Usar o cadastro de Dona do CPF/ }).click();

  await expect(page.getByText('Dona do CPF')).toBeVisible();
});
