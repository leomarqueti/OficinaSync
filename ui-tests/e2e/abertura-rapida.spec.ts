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

/**
 * Abre uma OS só com a placa e o defeito (cliente pendente), sem fotos — pela API.
 * A abertura pela tela é testada em abertura-guiada.spec.ts; aqui o foco é o que acontece DEPOIS
 * (pendência, completar dados, finalizar, card do dashboard).
 */
async function openQuickOrder(page: Page, plate: string, complaint: string) {
  await page.goto('/dashboard');
  const orderId = await page.evaluate(
    async ({ plate, complaint }) => {
      const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` };
      const car = await (await fetch('http://localhost:3100/cars', { method: 'POST', headers, body: JSON.stringify({ plate }) })).json();
      const order = await (
        await fetch('http://localhost:3100/service_orders', {
          method: 'POST',
          headers,
          body: JSON.stringify({ car_id: car.car_id, client_complaint: complaint }),
        })
      ).json();
      return order.service_order_id as number;
    },
    { plate, complaint },
  );
  await page.goto(`/os/${orderId}`);
  await expect(page).toHaveURL(/\/os\/\d+$/);
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

  await page.getByRole('button', { name: 'Mais ações' }).click();
  await page.getByRole('dialog', { name: 'Mais ações' }).getByRole('button', { name: 'Finalizar OS' }).click();
  await expect(page).toHaveURL(/\/finalizar$/);

  await page.getByRole('button', { name: 'Resolvido', exact: true }).click();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByRole('button', { name: 'Continuar' }).click();
  for (let i = 0; i < 4; i++) {
    await page.getByRole('button', { name: /^tirar foto d/i }).click();
    await page.getByRole('dialog', { name: /câmera/i }).getByRole('button', { name: 'Disparar' }).click();
    await expect(page.getByRole('dialog', { name: /câmera/i })).toHaveCount(0);
  }
  await page.getByRole('button', { name: 'Conferir', exact: true }).click();

  const uploads: string[] = [];
  page.on('request', (req) => {
    if (req.url().includes('/medias') && req.method() === 'POST') uploads.push(req.url());
  });

  await page.getByRole('button', { name: 'Finalizar OS' }).click();

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

// ---- regressões achadas na revisão final -------------------------------------------------

/** Cria, pela API e com o token da sessão de teste, um registro e devolve o corpo. */
async function apiPost(page: Page, path: string, body: object) {
  await page.goto('/dashboard');
  return page.evaluate(
    async ({ path, body }) => {
      const res = await fetch(`http://localhost:3100${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(body),
      });
      return { status: res.status, json: await res.json() };
    },
    { path, body },
  );
}

test('cliente só com o nome: /clientes abre e o Editar salva sem quebrar', async ({ page }) => {
  const name = `So Nome ${randomPlate()}`;
  const created = await apiPost(page, '/clients', { name });
  expect(created.status).toBe(201);

  await page.goto('/clientes');
  await page.getByPlaceholder(/Buscar por nome/).fill(name);
  await expect(page.getByText(name)).toBeVisible();

  await page.getByRole('button', { name: 'Editar' }).first().click();
  await page.locator('#edit-name').fill(`${name} Jr`);
  await page.getByRole('button', { name: /Salvar/ }).click();

  await expect(page.getByText(`${name} Jr`)).toBeVisible();
});

test('editar um carro só com a placa muda só o que foi preenchido (sem ano 0, KM 0 ou flex)', async ({ page }) => {
  const plate = randomPlate();
  const created = await apiPost(page, '/cars', { plate });
  expect(created.status).toBe(201);

  await page.goto('/veiculos');
  await page.getByPlaceholder(/Buscar por placa/).fill(plate);
  // exact: o card inteiro também é role=button e o nome dele contém "Editar"
  await page.getByRole('button', { name: 'Editar', exact: true }).first().click();
  await page.locator('#edit-color').fill('Verde');
  await page.getByRole('button', { name: /Salvar alterações/ }).click();
  await expect(page.getByText('Veículo atualizado!')).toBeVisible();

  const car = await page.evaluate(
    async ({ id }) => {
      const res = await fetch(`http://localhost:3100/cars/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      return res.json();
    },
    { id: created.json.car_id },
  );
  expect(car.color).toBe('Verde');
  expect(car.year).toBeNull();
  expect(car.mileage_in).toBeNull();
  expect(car.fuel_type).toBeNull();
});

test('a tela de finalizar abre na primeira pergunta, sem folha de pendência aberta', async ({ page }) => {
  const plate = randomPlate();
  await openQuickOrder(page, plate, `Teste de tema ${plate}`);
  await page.getByRole('button', { name: 'Mais ações' }).click();
  await page.getByRole('dialog', { name: 'Mais ações' }).getByRole('button', { name: 'Finalizar OS' }).click();
  await expect(page).toHaveURL(/\/finalizar$/);

  await expect(page.getByRole('heading', { name: /como terminou/i })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
