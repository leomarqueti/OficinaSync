import { expect, test, type Page } from '@playwright/test';

const API = 'http://localhost:3100';

function randomPlate(): string {
  const letter = () => String.fromCharCode(65 + Math.floor(Math.random() * 26));
  const digit = () => String(Math.floor(Math.random() * 10));
  return `${letter()}${letter()}${letter()}${digit()}${letter()}${digit()}${digit()}`;
}

/** Chamada à API com o token da sessão do navegador. */
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

/** Abre uma OS (carro só com a placa) como o usuário logado. */
async function openOrder(page: Page): Promise<number> {
  await page.goto('/dashboard');
  const car = await api(page, 'POST', '/cars', { plate: randomPlate() });
  const order = await api(page, 'POST', '/service_orders', { car_id: car.json.car_id, client_complaint: 'Barulho na suspensão' });
  return order.json.service_order_id;
}

test('peças: registra retirada, acerta o que usou com preço, e serviço — tudo na área interna', async ({ page }) => {
  const orderId = await openOrder(page);
  await page.goto(`/os/${orderId}/escritorio`);
  await expect(page.getByRole('heading', { name: new RegExp(`OS #${orderId}`) })).toBeVisible();

  await page.getByRole('button', { name: 'Adicionar peça' }).click();
  const sheet = page.getByRole('dialog');
  await sheet.locator('#part-desc').fill('Vela NGK');
  await sheet.locator('#part-code').fill('BKR6E');
  await sheet.locator('#part-qty').fill('4');
  await sheet.getByRole('button', { name: 'Salvar peça' }).click();

  await expect(page.getByText('Vela NGK')).toBeVisible();
  await expect(page.getByText(/1 peça\(s\) retirada\(s\) sem acerto/)).toBeVisible();

  await page.getByLabel('Quantidade usada de Vela NGK').fill('3');
  await page.getByLabel('Preço unitário de Vela NGK').fill('25');
  await page.getByRole('button', { name: 'Confirmar uso' }).click();
  await expect(page.getByText('usada: 3')).toBeVisible();
  await expect(page.getByText(/sem acerto/)).toHaveCount(0);

  await page.locator('#service-desc').fill('Troca das velas');
  await page.locator('#service-price').fill('60');
  await page.getByRole('button', { name: 'Adicionar serviço' }).click();
  await expect(page.getByText('Troca das velas')).toBeVisible();

  await page.locator('#internal-notes').fill('Cliente paga no PIX');
  await page.getByRole('button', { name: 'Salvar anotações' }).click();
  await expect(page.getByText('Anotações salvas!')).toBeVisible();
});

test.describe('mecânico (não é o responsável)', () => {
  test.use({ storageState: 'e2e/.auth/mechanic.json' });

  test('vê peças e serviços, mas não vê anotações do escritório nem o botão da ficha', async ({ page, browser }) => {
    // o dono abre a OS (é o responsável)
    const ownerCtx = await browser.newContext({ storageState: 'e2e/.auth/state.json' });
    const ownerPage = await ownerCtx.newPage();
    const orderId = await openOrder(ownerPage);
    await api(ownerPage, 'PUT', `/service_orders/${orderId}/internal/notes`, { notes: 'segredo do escritório' });
    await ownerCtx.close();

    await page.goto(`/os/${orderId}/escritorio`);
    await expect(page.getByRole('heading', { name: new RegExp(`OS #${orderId}`) })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Adicionar peça' })).toBeVisible();
    await expect(page.getByText('Anotações do escritório')).toHaveCount(0);
    await expect(page.getByText('segredo do escritório')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /ficha do escritório/ })).toHaveCount(0);
  });
});

test('equipe: o responsável marca quem ajudou, com o quê e quanto; fica com o resto', async ({ page }) => {
  const orderId = await openOrder(page);
  await page.goto(`/os/${orderId}/escritorio`);

  // o mecânico de teste (mesma oficina) aparece na lista
  const helper = page.getByLabel(/^Ajudou: ui-mec/);
  await expect(helper).toBeVisible();
  await helper.check();

  await page.getByLabel(/^Tarefa de ui-mec/).fill('diagnóstico elétrico');
  await page.getByLabel(/^Porcentagem de ui-mec/).fill('30');
  await expect(page.getByText('Você fica com 70%')).toBeVisible();

  await page.getByRole('button', { name: 'Salvar equipe' }).click();
  await expect(page.getByText('Equipe salva!')).toBeVisible();

  await page.reload();
  await expect(page.getByLabel(/^Ajudou: ui-mec/)).toBeChecked();
  await expect(page.getByText('Você fica com 70%')).toBeVisible();
});

test('equipe: soma acima de 99% bloqueia o salvar e mostra aviso', async ({ page }) => {
  const orderId = await openOrder(page);
  await page.goto(`/os/${orderId}/escritorio`);
  await page.getByLabel(/^Ajudou: ui-mec/).check();
  await page.getByLabel(/^Tarefa de ui-mec/).fill('montagem');
  await page.getByLabel(/^Porcentagem de ui-mec/).fill('99');
  await expect(page.getByText('Você fica com 1%')).toBeVisible();
  await page.getByLabel(/^Porcentagem de ui-mec/).fill('100');
  await expect(page.getByText(/passa de 99%/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Salvar equipe' })).toBeDisabled();
});

test.describe('mecânico comum vê só a sua parte', () => {
  test.use({ storageState: 'e2e/.auth/mechanic.json' });

  test('mostra "Sua parte nesta OS" e nenhuma lista de colegas', async ({ page, browser }) => {
    const ownerCtx = await browser.newContext({ storageState: 'e2e/.auth/state.json' });
    const ownerPage = await ownerCtx.newPage();
    const orderId = await openOrder(ownerPage);
    const team = await api(ownerPage, 'GET', '/users/team');
    const mech = team.json.find((u: { name: string }) => u.name.startsWith('ui-mec'));
    await api(ownerPage, 'PUT', `/service_orders/${orderId}/participants`, {
      participants: [{ user_id: mech.user_id, share_percent: 25, task: 'diagnóstico' }],
    });
    await ownerCtx.close();

    await page.goto(`/os/${orderId}/escritorio`);
    await expect(page.getByText('Sua parte nesta OS: 25%')).toBeVisible();
    await expect(page.getByLabel(/^Ajudou:/)).toHaveCount(0);
  });
});
